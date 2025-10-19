// src/index.ts
import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import crypto from 'node:crypto'
import { Mempool } from './chain/mempool.js'
import { Block, computeRoots, blockHash } from './chain/block.js'
import { cidForBytes } from './util/cid.js'
import { ensureDir } from './util/files.js'
import { SegStore } from './chain/seg_store.js'
import { TxIndex } from './chain/txindex.js'
import { buildAllKidx, buildKidxForJsonl, queryKidx } from './util/kidx.js'
import { ReceiptsStore } from './chain/receipts.js'

/* ===================== METRICS ===================== */
class Metrics {
  counters = {
    tx_submitted: 0,
    blocks_sealed: 0,
    blocks_imported: 0,
    tx_indexed: 0,
    receipts_appended: 0,
  }
  gauges = { last_seal_ms: 0 }

  inc<K extends keyof Metrics['counters']>(k: K, v = 1) { this.counters[k] += v }
  renderText(extra: { peers: number; mempool: number; head: number }) {
    const { peers, mempool, head } = extra
    const c = this.counters
    return [
      '# HELP void_tx_submitted Total tx submitted via HTTP',
      '# TYPE void_tx_submitted counter',
      `void_tx_submitted ${c.tx_submitted}`,
      '# HELP void_blocks_sealed Total blocks sealed by this node',
      '# TYPE void_blocks_sealed counter',
      `void_blocks_sealed ${c.blocks_sealed}`,
      '# HELP void_blocks_imported Total blocks imported by follower',
      '# TYPE void_blocks_imported counter',
      `void_blocks_imported ${c.blocks_imported}`,
      '# HELP void_tx_indexed Total transactions indexed',
      '# TYPE void_tx_indexed counter',
      `void_tx_indexed ${c.tx_indexed}`,
      '# HELP void_receipts_appended Total receipts appended',
      '# TYPE void_receipts_appended counter',
      `void_receipts_appended ${c.receipts_appended}`,
      '# HELP void_peers_connected Current connected peers',
      '# TYPE void_peers_connected gauge',
      `void_peers_connected ${peers}`,
      '# HELP void_mempool_size Current mempool size',
      '# TYPE void_mempool_size gauge',
      `void_mempool_size ${mempool}`,
      '# HELP void_head_number Current head block number',
      '# TYPE void_head_number gauge',
      `void_head_number ${head}`,
      '# HELP void_last_seal_ms Duration of last sealBlock in ms',
      '# TYPE void_last_seal_ms gauge',
      `void_last_seal_ms ${this.gauges.last_seal_ms}`,
      '',
    ].join('\n')
  }
}
const metrics = new Metrics()

/* ===================== CONFIG ===================== */
const HTTP_PORT = Number(process.env.HTTP_PORT || 4100)
const P2P_PORT = Number(process.env.P2P_PORT || 4700)
const BOOTSTRAP = (process.env.BOOTSTRAP || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const KEY_FILE = process.env.KEY_FILE || '.nodekey'
const TOPIC = 'void/hello'
const PROTO_VER = 1

/* ===================== CRYPTO ===================== */
type Keypair = {
  privateKey: crypto.KeyObject
  publicKey: crypto.KeyObject
  nodeId: string
  pubPEM: string
}
function nodeIdFromPub(pub: crypto.KeyObject): string {
  const der = pub.export({ type: 'spki', format: 'der' }) as Buffer
  return crypto.createHash('sha256').update(der).digest('hex').slice(0, 16)
}
function loadOrCreateKeypair(file: string): Keypair {
  if (fs.existsSync(file)) {
    const raw = fs.readFileSync(file, 'utf8').trim()
    if (raw.startsWith('{')) {
      const j = JSON.parse(raw)
      const priv = crypto.createPrivateKey(j.privateKeyPEM)
      const pub = crypto.createPublicKey(j.publicKeyPEM)
      return { privateKey: priv, publicKey: pub, nodeId: nodeIdFromPub(pub), pubPEM: j.publicKeyPEM }
    } else {
      const priv = crypto.createPrivateKey(raw)
      const pub = crypto.createPublicKey(priv)
      const pubPEM = pub.export({ type: 'spki', format: 'pem' }).toString()
      fs.writeFileSync(file, JSON.stringify({ privateKeyPEM: raw, publicKeyPEM: pubPEM }, null, 2))
      return { privateKey: priv, publicKey: pub, nodeId: nodeIdFromPub(pub), pubPEM }
    }
  }
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519')
  const privPEM = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
  const pubPEM = publicKey.export({ type: 'spki', format: 'pem' }).toString()
  fs.writeFileSync(file, JSON.stringify({ privateKeyPEM: privPEM, publicKeyPEM: pubPEM }, null, 2))
  return { privateKey, publicKey, nodeId: nodeIdFromPub(publicKey), pubPEM }
}
function signBytes(priv: crypto.KeyObject, bytes: Uint8Array): string {
  return crypto.sign(null, Buffer.from(bytes), priv).toString('hex')
}
function verifyBytes(pub: crypto.KeyObject, bytes: Uint8Array, sigHex: string): boolean {
  try { return crypto.verify(null, Buffer.from(bytes), pub, Buffer.from(sigHex, 'hex')) } catch { return false }
}
function safeImportPublicKey(pem: string): crypto.KeyObject | null {
  try { return crypto.createPublicKey(pem) } catch { return null }
}
function bytesToSign(topic: string, data: string, nonce: string): Uint8Array {
  return Buffer.from(JSON.stringify({ topic, data, nonce }))
}

/* ===================== NODE CORE ===================== */
import { Node } from './node_core.js' // ← inlined version below in next refactor

/* ===================== BOOT ===================== */
const kp = loadOrCreateKeypair(path.resolve(KEY_FILE))
const node = new Node(P2P_PORT, kp)
await node.start()
node.subscribe(TOPIC)
node.subscribe('void/tx')
node.subscribe('void/blob.announce')
node.subscribe('void/block')

/* ===================== HTTP API ===================== */
const app = express()
app.use(express.json({ limit: '128mb' }))

/* ----- Metrics endpoint ----- */
app.get('/metrics', (_req, res) => {
  const head = node.store.loadHeadNumber()
  const peers = [...node.peers.keys()].filter((k) => !k.startsWith('?-')).length
  const mempool = node.mempool.peekAll().length
  res.setHeader('content-type', 'text/plain; version=0.0.4; charset=utf-8')
  res.send(metrics.renderText({ peers, mempool, head }))
})

/* ----- Follower start ----- */
app.post('/follower/start', (req, res) => {
  const peer = String(req.query.peer || 'http://127.0.0.1:4101')
  const ms = Number(req.query.intervalMs || 2000)
  const r = node.startFollower(peer, ms)
  res.json(r)
})

/* ----- Start HTTP ----- */
app.listen(HTTP_PORT, () => {
  console.log(`[void-node] http :${HTTP_PORT}`)
  console.log(`[void-node] bootstrap: ${BOOTSTRAP.join(', ') || '(none)'}`)
  if (!fs.existsSync(KEY_FILE)) console.log(`[void-node] wrote new key: ${KEY_FILE}`)
})

