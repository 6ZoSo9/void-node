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

// ---------- config ----------
const HTTP_PORT = Number(process.env.HTTP_PORT || 4100)
const P2P_PORT  = Number(process.env.P2P_PORT  || 4700)
const BOOTSTRAP = (process.env.BOOTSTRAP || '').split(',').map(s => s.trim()).filter(Boolean)
const KEY_FILE  = process.env.KEY_FILE || '.nodekey'
const TOPIC     = 'void/hello'
const PROTO_VER = 1

// ---------- crypto (Ed25519) ----------
type Keypair = { privateKey: crypto.KeyObject, publicKey: crypto.KeyObject, nodeId: string, pubPEM: string }
function loadOrCreateKeypair(file: string): Keypair {
  if (fs.existsSync(file)) {
    const raw = fs.readFileSync(file, 'utf8').trim()
    if (raw.startsWith('{')) {
      const j = JSON.parse(raw)
      const priv = crypto.createPrivateKey(j.privateKeyPEM)
      const pub  = crypto.createPublicKey(j.publicKeyPEM)
      return { privateKey: priv, publicKey: pub, nodeId: nodeIdFromPub(pub), pubPEM: j.publicKeyPEM }
    } else {
      const priv = crypto.createPrivateKey(raw)
      const pub  = crypto.createPublicKey(priv)
      const pubPEM = pub.export({ type: 'spki', format: 'pem' }).toString()
      fs.writeFileSync(file, JSON.stringify({ privateKeyPEM: raw, publicKeyPEM: pubPEM }, null, 2))
      return { privateKey: priv, publicKey: pub, nodeId: nodeIdFromPub(pub), pubPEM }
    }
  } else {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519')
    const privPEM = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
    const pubPEM  = publicKey.export({ type: 'spki', format: 'pem' }).toString()
    fs.writeFileSync(file, JSON.stringify({ privateKeyPEM: privPEM, publicKeyPEM: pubPEM }, null, 2))
    return { privateKey, publicKey, nodeId: nodeIdFromPub(publicKey), pubPEM }
  }
}
function nodeIdFromPub(pub: crypto.KeyObject): string {
  const der = pub.export({ type: 'spki', format: 'der' }) as Buffer
  return crypto.createHash('sha256').update(der).digest('hex').slice(0, 16)
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

// ---------- wire codec ----------
const MAX_MSG_BYTES = 64 * 1024
type Msg =
  | { type: 'HELLO', id: string, listen: string[], proto: number, pubkey: string }
  | { type: 'SUB', topic: string }
  | { type: 'PUB', topic: string, data: string, from: string, nonce: string, sig: string, pubkey: string }
  | { type: 'PEERS', addrs: string[] }

function encode (m: Msg): Buffer {
  const body = Buffer.from(JSON.stringify(m))
  const len = Buffer.alloc(4); len.writeUInt32BE(body.length, 0)
  return Buffer.concat([len, body])
}
class Framer {
  private buf = Buffer.alloc(0)
  constructor (private onMsg: (m: Msg) => void, private onBad?: (e: Error)=>void) {}
  feed (chunk: Buffer) {
    this.buf = Buffer.concat([this.buf, chunk])
    while (this.buf.length >= 4) {
      const len = this.buf.readUInt32BE(0)
      if (len > MAX_MSG_BYTES) { this.onBad?.(new Error(`frame too large: ${len}`)); this.buf = Buffer.alloc(0); return }
      if (this.buf.length < 4 + len) break
      const body = this.buf.subarray(4, 4 + len)
      this.buf = this.buf.subarray(4 + len)
      try { this.onMsg(JSON.parse(body.toString('utf8'))) } catch (e:any) { this.onBad?.(e) }
    }
  }
}

// ---------- pubsub ----------
class PubSub {
  subs: Map<string, Set<string>> = new Map()
  subscribe (peerId: string, topic: string) {
    if (!this.subs.has(topic)) this.subs.set(topic, new Set())
    this.subs.get(topic)!.add(peerId)
  }
  subscribers (topic: string): Set<string> {
    return this.subs.get(topic) ?? new Set()
  }
}
type Peer = {
  id: string; socket: net.Socket; framer: Framer; addr: string;
  listens: string[]; outbound: boolean; handshakeDone: boolean;
}

// ---------- validators ----------
function isPlainObject(x: any): x is Record<string, unknown> {
  return x && typeof x === 'object' && !Array.isArray(x)
}
function validateTxPayload(x: unknown): {ok: true} | {ok:false, error:string} {
  if (!isPlainObject(x)) return { ok:false, error:'not an object' }
  return { ok:true }
}

// ---------- node core ----------

class Node {
  readonly id: string
  readonly pubPEM: string
  private priv: crypto.KeyObject
  private pub: crypto.KeyObject

  readonly listenAddrs: string[] = []
  readonly peers: Map<string, Peer> = new Map()
  readonly pubsub = new PubSub()

  readonly txIndex = new TxIndex(path.join('data','index'))
  readonly receipts = new ReceiptsStore(path.join('data','receipts'), { shardSpan: 10_000 })

  private seen = new Set<string>()
  private seenTimestamps = new Map<string, number>()
  private readonly SEEN_TTL_MS = 5 * 60_000

  private dialing = new Set<string>()
  private knownAddrs = new Set<string>()
  private backoff = new Map<string, number>()
  private readonly MIN_BACKOFF = 500
  private readonly MAX_BACKOFF = 15_000

  private myTopics = new Set<string>()

  // segmented block store
  readonly store = new SegStore('data', { segmentMaxBytes: 128 * 1024 * 1024, sparseEvery: 512 })
  readonly mempool = new Mempool()
  private proposerTimer: NodeJS.Timeout | null = null
  private blobsDir = path.join('data', 'blobs')

  server = net.createServer((sock) => this.onIncoming(sock))

  constructor(public tcpPort: number, kp: Keypair) {
    this.id = kp.nodeId
    this.priv = kp.privateKey
    this.pub  = kp.publicKey
    this.pubPEM = kp.pubPEM
    ensureDir(this.blobsDir)
  }

  /** Rebuild compact tx index from blocks (idempotent, memory-light). */
  async rebuildTxIndex(): Promise<{ ok: true, blocks: number, indexed: number }> {
    const idxDir = path.join('data', 'index')
    if (fs.existsSync(idxDir)) fs.rmSync(idxDir, { recursive: true, force: true })
    fs.mkdirSync(idxDir, { recursive: true })

    const head = this.store.loadHeadNumber()
    let indexed = 0
    const BATCH = 2000
    let batch: { h: string; n: number; o: number }[] = []

    for (let n = 0; n <= head; n++) {
      const b = this.store.loadBlock(n)
      if (!b?.txs?.length) continue
      for (let i = 0; i < b.txs.length; i++) {
        const tx = b.txs[i]
        if (tx?.hash) {
          batch.push({ h: tx.hash.toLowerCase(), n, o: i })
          indexed++
          if (batch.length >= BATCH) {
            this.txIndex.putMany(batch)
            batch = []
          }
        }
      }
    }
    if (batch.length) this.txIndex.putMany(batch)
    return { ok: true, blocks: head + 1, indexed }
  }

  async start () {
    await new Promise<void>(resolve => this.server.listen(this.tcpPort, '0.0.0.0', resolve))
    const addr = `127.0.0.1:${(this.server.address() as net.AddressInfo).port}`
    this.listenAddrs.push(addr)
    this.knownAddrs.add(addr)
    for (const a of BOOTSTRAP) this.knownAddrs.add(a)
    console.log(`[void-node] started TCP on ${addr}, id=${this.id}`)

    // GC dedup table
    setInterval(() => {
      const now = Date.now()
      for (const [k, ts] of this.seenTimestamps) {
        if (now - ts > this.SEEN_TTL_MS) { this.seenTimestamps.delete(k); this.seen.delete(k) }
      }
    }, 30_000)

    for (const a of BOOTSTRAP) this.connect(a)
  }

  stop () { for (const p of this.peers.values()) p.socket.destroy(); this.server.close() }

  // sockets
  private onIncoming (socket: net.Socket) {
    const peerAddr = `${socket.remoteAddress}:${socket.remotePort}`
    this.attachSocket(socket, peerAddr, false)
  }
  private attachSocket (socket: net.Socket, peerAddr: string, outgoing: boolean) {
    let peerId = `?-${crypto.randomBytes(4).toString('hex')}`
    const framer = new Framer((msg) => this.onMsg(peerId, msg), (e) => {
      console.warn(`[wire] bad message from ${peerId} (${peerAddr}):`, e.message)
    })
    socket.on('data', (chunk) => framer.feed(chunk))
    socket.on('close', () => { this.peers.delete(peerId) })
    socket.on('error', (e) => { console.warn(`[peer] error ${peerId} (${peerAddr}):`, e.message) })
    const peer: Peer = { id: peerId, socket, framer, addr: peerAddr, listens: [], outbound: outgoing, handshakeDone: false }
    this.peers.set(peerId, peer)
    this.sendRaw(peer, { type: 'HELLO', id: this.id, listen: this.listenAddrs, proto: PROTO_VER, pubkey: this.pubPEM })
  }

  private onMsg (tempOrRealId: string, msg: Msg) {
    if (msg.type === 'HELLO') {
      const ent = [...this.peers.entries()].find(([k]) => k === tempOrRealId || k.startsWith('?-'))
      if (!ent) return
      const [tmpKey, p] = ent
      const existing = this.peers.get(msg.id)
      if (existing) {
        if (existing.outbound && !p.outbound) { p.socket.destroy(); this.peers.delete(tmpKey); return }
        else { existing.socket.destroy(); this.peers.delete(msg.id) }
      }
      this.peers.delete(tmpKey)
      p.id = msg.id; p.handshakeDone = true; p.listens = Array.isArray(msg.listen) ? msg.listen : []
      this.peers.set(p.id, p)
      console.log(`[peer] HELLO -> ${p.id} @ ${p.addr} (they listen: ${p.listens.join(',') || 'n/a'})`)
      for (const a of p.listens) this.knownAddrs.add(a)
      const addrs = new Set<string>()
      for (const pp of this.peers.values()) for (const a of pp.listens) addrs.add(a)
      for (const a of this.listenAddrs) addrs.add(a)
      this.sendRaw(p, { type: 'PEERS', addrs: [...addrs] })
      for (const t of this.myTopics) this.sendRaw(p, { type: 'SUB', topic: t })
      return
    }
    if (msg.type === 'PEERS') {
      for (const a of msg.addrs) if (!this.isSelfAddress(a)) this.knownAddrs.add(a)
      for (const a of msg.addrs) if (this.shouldDial(a)) this.connect(a)
      return
    }
    if (msg.type === 'SUB') {
      if (!this.isKnownPeer(tempOrRealId)) return
      this.pubsub.subscribe(tempOrRealId, msg.topic)
      return
    }
    if (msg.type === 'PUB') {
      const key = `${msg.topic}:${msg.nonce}`
      if (this.seen.has(key)) return
      const pub = safeImportPublicKey(msg.pubkey); if (!pub) return
      const bytes = bytesToSign(msg.topic, msg.data, msg.nonce)
      if (!verifyBytes(pub, bytes, msg.sig)) return

      this.seen.add(key); this.seenTimestamps.set(key, Date.now())
      if (this.pubsub.subscribers(msg.topic).has(this.id)) {
        if (msg.topic === 'void/tx') {
          try { const tx = JSON.parse(msg.data); this.mempool.push(tx) } catch {}
        } else if (msg.topic === 'void/blob.announce') {
          // future: on-demand fetch
        } else if (msg.topic === 'void/block') {
          // future: follower fast-fetch by /blocks/range
        } else {
          console.log(`[pubsub] ${msg.topic} <- ${msg.from}: ${msg.data}`)
        }
      }
      for (const p of this.peers.values()) {
        if (p.id === tempOrRealId) continue
        if (this.pubsub.subscribers(msg.topic).has(p.id)) this.sendRaw(p, msg)
      }
      return
    }
  }

  private sendRaw (peer: Peer, msg: Msg) { try { peer.socket.write(encode(msg)) } catch {} }
  private isKnownPeer(id: string): boolean { return this.peers.has(id) && !id.startsWith('?-') }
  private isSelfAddress (addr: string): boolean { return this.listenAddrs.includes(addr) }
  private shouldDial (addr: string): boolean {
    if (this.isSelfAddress(addr)) return false
    if (this.dialing.has(addr)) return false
    for (const p of this.peers.values()) if (p.listens.includes(addr)) return false
    return true
  }
  connect (addr: string) {
    if (!this.shouldDial(addr)) return
    this.dialing.add(addr)
    const [host, portStr] = addr.split(':'); const port = Number(portStr)
    if (!host || !port) { this.dialing.delete(addr); return }
    const socket = net.createConnection({ host, port }, () => {
      console.log(`[dial] connected ${addr}`)
      this.backoff.delete(addr)
      this.attachSocket(socket, addr, true)
      this.dialing.delete(addr)
    })
    socket.on('error', (e) => {
      console.warn(`[dial] failed ${addr}:`, e.message)
      this.dialing.delete(addr); socket.destroy()
      const cur = this.backoff.get(addr) ?? this.MIN_BACKOFF
      const nxt = Math.min(cur * 2, this.MAX_BACKOFF)
      this.backoff.set(addr, nxt)
      setTimeout(() => this.connect(addr), cur)
    })
  }

  // subs/pubs
  subscribe (topic: string) {
    this.myTopics.add(topic)
    this.pubsub.subscribe(this.id, topic)
    for (const p of this.peers.values()) this.sendRaw(p, { type: 'SUB', topic })
  }
  publishString (topic: string, data: string) {
    const nonce = crypto.randomBytes(8).toString('hex')
    const bytes = bytesToSign(topic, data, nonce)
    const sig = signBytes(this.priv, bytes)
    const msg: Msg = { type: 'PUB', topic, data, from: this.id, nonce, sig, pubkey: this.pubPEM }
    for (const p of this.peers.values()) if (this.pubsub.subscribers(topic).has(p.id)) this.sendRaw(p, msg)
    if (this.pubsub.subscribers(topic).has(this.id)) {
      const key = `${topic}:${nonce}`; this.seen.add(key); this.seenTimestamps.set(key, Date.now())
      if (topic === 'void/tx') { try { this.mempool.push(JSON.parse(data)) } catch {} }
      else console.log(`[pubsub] ${topic} <- ${this.id}: ${data}`)
    }
  }
  publishJson (topic: string, obj: any) { this.publishString(topic, JSON.stringify(obj)) }

  // blocks
  startProposer(intervalMs = 5000) {
    if (this.proposerTimer) return { ok:false, error:'already running' }
    this.proposerTimer = setInterval(() => { void this.sealBlock() }, intervalMs)
    return { ok:true, intervalMs }
  }

async sealBlock() {
  const parent = this.store.loadHeadNumber()
  const number = parent + 1
  const txs = this.mempool.drain(1000)
  const blobs = discoverLocalBlobs()
  const roots = computeRoots(txs, blobs)

  const headerBytes = Buffer.from(JSON.stringify({
    number,
    parentHash: number > 0 ? blockHash(this.store.loadBlock(parent)!) : ''.padStart(64,'0'),
    timestamp: Date.now(),
    txRoot: roots.txRoot,
    blobRoot: roots.blobRoot,
    proposer: this.id
  }))

  const sig = signBytes(this.priv, headerBytes)
  const b: Block = {
    number,
    parentHash: number > 0 ? blockHash(this.store.loadBlock(parent)!) : ''.padStart(64,'0'),
    timestamp: Date.now(),
    txRoot: roots.txRoot,
    blobRoot: roots.blobRoot,
    txs,
    blobs,
    proposer: this.id,
    sig
  }

  // 1) persist the block
  this.store.saveBlock(b)

  // 2) if there are txs: index -> kidx -> receipts (single conditional to avoid duplicates)
  if (b.txs?.length) {
    // 2a) append compact tx refs
    const refs = b.txs.map((tx, i) => ({ h: tx.hash.toLowerCase(), n: b.number, o: i }))
    this.txIndex.putMany(refs)

    // 2b) refresh this shard’s .kidx (best-effort)
    try {
      const shard = this.txIndex.shardForBlock(b.number)
      await buildKidxForJsonl(shard.path)
    } catch (e) {
      console.warn('[kidx] single-shard rebuild failed:', (e as Error).message)
    }

    // 2c) append receipts (compat: appendMany or append fallback)
    const recs = b.txs.map((tx, i) => ({
      h: tx.hash.toLowerCase(),
      n: b.number,
      o: i,
      ts: b.timestamp ?? Date.now()
    }))
    const anyReceipts: any = this.receipts as any
    if (typeof anyReceipts.appendMany === 'function') {
      await anyReceipts.appendMany(recs)
    } else if (typeof anyReceipts.append === 'function') {
      for (const r of recs) await anyReceipts.append(r)
    }
  }

  // 3) announce the new block
  this.publishJson('void/block', {
    number: b.number,
    hash: blockHash(b),
    txRoot: b.txRoot,
    blobRoot: b.blobRoot
  })
}

  // follower: fetch recent blocks from peer’s HTTP, update index & receipts
  startFollower(peerHttp = 'http://127.0.0.1:4101', intervalMs = 2000) {
    let running = false
    const tick = async () => {
      if (running) return
      running = true
      try {
        const myHead = this.store.loadHeadNumber()
        const headRes = await fetch(`${peerHttp}/head`).then(r=>r.json()).catch(()=>null)
        const theirHead = Number(headRes?.head ?? -1)
        if (Number.isFinite(theirHead) && theirHead > myHead) {
          const from = Math.max(0, theirHead - 500)
          const to = theirHead
          const arr = await fetch(`${peerHttp}/blocks/range?from=${from}&to=${to}`).then(r=>r.json()).catch(()=>[])
          for (const b of arr) {
            this.store.saveBlock(b)
            if (b.txs?.length) {
              const refs = b.txs.map((tx:any, i:number) => ({ h: tx.hash.toLowerCase(), n: b.number, o: i }))
              this.txIndex.putMany(refs)
              const anyReceipts: any = this.receipts as any
              const recs = b.txs.map((tx:any, i:number) => ({ h: tx.hash.toLowerCase(), n: b.number, o: i, ts: b.timestamp ?? Date.now() }))
              if (typeof anyReceipts.appendMany === 'function') await anyReceipts.appendMany(recs)
              else if (typeof anyReceipts.append === 'function') for (const r of recs) await anyReceipts.append(r)
            }
          }
        }
      } catch {}
      running = false
    }
    setInterval(tick, intervalMs)
    return { ok:true, peerHttp, intervalMs }
  }

  peersSnapshot () {
    const connected = [...this.peers.values()]
      .filter(p => !p.id.startsWith('?-'))
      .map(p => ({ id: p.id, addr: p.addr, listens: p.listens, outbound: p.outbound }))
    return { connected, knownAddrs: [...this.knownAddrs] }
  }

  // blob storage
  async putBlobFromBuffer(buf: Buffer) {
    const cid = await cidForBytes(buf)
    const file = path.join(this.blobsDir, cid)
    if (!fs.existsSync(file)) fs.writeFileSync(file, buf)
    this.publishJson('void/blob.announce', { cid, size: buf.length })
    return { cid, size: buf.length }
  }
  getBlob(cid: string): Buffer | null {
    const file = path.join(this.blobsDir, cid)
    if (!fs.existsSync(file)) return null
    return fs.readFileSync(file)
  }
}

function discoverLocalBlobs(): { cid: string, size: number }[] {
  const dir = path.join('data', 'blobs')
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).map(f => {
    const p = path.join(dir, f)
    const st = fs.statSync(p)
    return { cid: f, size: st.size }
  })
}

// ---------- boot + HTTP ----------
const kp = loadOrCreateKeypair(path.resolve(KEY_FILE))
const node = new Node(P2P_PORT, kp)
await node.start()
node.subscribe(TOPIC)
node.subscribe('void/tx')
node.subscribe('void/blob.announce')
node.subscribe('void/block')

const app = express()
app.use(express.json({ limit: '128mb' }))

// INDEX maintenance
app.post('/index/rebuild', async (_req, res) => {
  try { res.json(await node.rebuildTxIndex()) }
  catch (e:any) { res.status(500).json({ ok:false, error: String(e?.message || e) }) }
})
app.post('/index/kidx/build', async (_req, res) => {
  try { res.json(await buildAllKidx()) }
  catch (e:any) { res.status(500).json({ ok:false, error: String(e?.message || e) }) }
})
app.get('/index/stats', (_req, res) => {
  const shards = node.txIndex.listShards().map(s => {
    const jsonlStat = fs.existsSync(s.path) ? fs.statSync(s.path) : null
    const kidxPath = s.path.replace(/\.jsonl$/, '.kidx')
    const kidxStat = fs.existsSync(kidxPath) ? fs.statSync(kidxPath) : null
    const lines = jsonlStat ? countLinesQuick(s.path) : 0
    return {
      from: s.from, to: s.to,
      jsonl: { path: s.path, bytes: jsonlStat?.size ?? 0, lines },
      kidx: { path: kidxPath, bytes: kidxStat?.size ?? 0, present: !!kidxStat }
    }
  })
  res.json({ ok:true, shards })
})
app.post('/index/gc', (req, res) => {
  const keepLast = Number(req.query.keepLast || 1)
  try { res.json(node.txIndex.gc(keepLast)) }
  catch (e:any) { res.status(500).json({ ok:false, error:String(e?.message||e) }) }
})
app.post('/index/kidx/rebuild-shard', async (req, res) => {
  const blockParam = req.query.block
  const hashParam = req.query.hash
  try {
    let fromTo: {from:number,to:number}|null = null
    if (blockParam !== undefined) {
      const bn = Number(blockParam)
      if (!Number.isFinite(bn) || bn < 0) return res.json({ ok:false, error:'bad block' })
      const shard = node.txIndex.shardForBlock(bn)
      await buildKidxForJsonl(shard.path)
      return res.json({ ok:true, shard: { from: shard.from, to: shard.to }, kidx: shard.path.replace(/\.jsonl$/, '.kidx') })
    } else if (typeof hashParam === 'string') {
      const hash = String(hashParam).toLowerCase()
      if (!/^[0-9a-f]{64}$/.test(hash)) return res.json({ ok:false, error:'bad hash' })
      // try to locate first to know shard
      const shards = node.txIndex.listShards().sort((a,b)=>b.from-a.from)
      for (const s of shards) {
        const hit = fs.existsSync(s.path.replace(/\.jsonl$/,'.kidx')) ? queryKidx(s.path.replace(/\.jsonl$/,'.kidx'), hash)
                                                                      : node.txIndex.lookupInShard(s.path, hash)
        if (hit.found) { await buildKidxForJsonl(s.path); return res.json({ ok:true, shard:{from:s.from,to:s.to}, kidx:s.path.replace(/\.jsonl$/,'.kidx') }) }
      }
      return res.json({ ok:false, error:'hash not found' })
    }
    return res.json({ ok:false, error:'provide block or hash' })
  } catch (e:any) {
    res.status(500).json({ ok:false, error:String(e?.message||e) })
  }
})

// Health/peers
app.get('/health', (_req, res) => {
  res.json({ ok: true, proto: PROTO_VER, nodeId: node.id, http: HTTP_PORT, p2p: P2P_PORT,
    peers: [...node.peers.keys()].filter(k => !k.startsWith('?-')), listen: node.listenAddrs })
})
app.get('/peers', (_req, res) => res.json({ ok: true, ...node.peersSnapshot() }))

// Sub/Pub
app.post('/sub', (req, res) => {
  const topic = typeof req.body?.topic === 'string' ? req.body.topic : TOPIC
  node.subscribe(topic)
  res.json({ ok: true, subscribed: topic })
})
app.post('/pub', (req, res) => {
  const msg = typeof req.body?.msg === 'string' ? req.body.msg : 'ping'
  const topic = typeof req.body?.topic === 'string' ? req.body.topic : TOPIC
  node.publishString(topic, msg)
  res.json({ ok: true, published: { topic, msg } })
})

// Fast head probe
app.get('/blocks/head', (_req, res) => {
  const n = node.store.loadHeadNumber()
  const b = node.store.loadBlock(n)
  if (!b) return res.json({ ok: true, head: -1 })
  res.json({ ok: true, head: n, hash: blockHash(b) })
})

// Import blocks (bulk), update index+receipts per shard
app.post('/blocks/import', async (req, res) => {
  try {
    const arr = Array.isArray(req.body) ? req.body : []
    if (!arr.length) return res.json({ ok: true, imported: 0 })

    const touchedShardPaths = new Set<string>()
    let imported = 0

    for (const b of arr) {
      node.store.saveBlock(b)
      imported++

      if (b?.txs?.length) {
        // compact refs
        const refs = b.txs.map((tx: any, i: number) => ({ h: tx.hash.toLowerCase(), n: b.number, o: i }))
        node.txIndex.putMany(refs)

        // receipts (appendMany if available)
        const anyReceipts: any = node.receipts as any
        const recs = b.txs.map((tx: any, i: number) => ({
          h: tx.hash.toLowerCase(),
          n: b.number,
          o: i,
          ts: b.timestamp ?? Date.now()
        }))
        if (typeof anyReceipts.appendMany === 'function') {
          await anyReceipts.appendMany(recs)
        } else if (typeof anyReceipts.append === 'function') {
          for (const r of recs) await anyReceipts.append(r)
        }

        // note touched shard for kidx refresh
        const shard = node.txIndex.shardForBlock(b.number)
        touchedShardPaths.add(shard.path)
      }
    }

    // refresh .kidx only for shards we touched
    let kidxRebuilt = 0
    for (const p of touchedShardPaths) {
      try { await buildKidxForJsonl(p); kidxRebuilt++ } catch {}
    }

    return res.json({ ok: true, imported, kidxRebuilt })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) })
  }
})

// Tx lookup via compact index (+ .kidx if present)
app.get('/tx/lookup', (req, res) => {
  const hash = String(req.query.hash || '').toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(hash)) return res.json({ ok:false, error:'bad hash' })

  const shards = node.txIndex.listShards().sort((a,b) => b.from - a.from) // newest first
  for (const s of shards) {
    const kidxPath = s.path.replace(/\.jsonl$/, '.kidx')
    if (fs.existsSync(kidxPath)) {
      const hit = queryKidx(kidxPath, hash)
      if (hit.found) {
        const blk = node.store.loadBlock(hit.n!)
        if (!blk) return res.json({ ok:false, error:'block not found (stale index?)' })
        const tx = blk.txs?.[hit.o!]
        return res.json({ ok:true, found:true, block: hit.n, offset: hit.o, tx })
      }
      continue
    }
    const r = node.txIndex.lookupInShard(s.path, hash)
    if (r.found) {
      const blk = node.store.loadBlock(r.n)
      if (!blk) return res.json({ ok:false, error:'block not found (stale index?)' })
      const tx = blk.txs?.[r.o]
      return res.json({ ok:true, found:true, block: r.n, offset: r.o, tx })
    }
  }
  return res.json({ ok:true, found:false })
})

// Receipts: lookup, stats, GC
app.get('/tx/receipt', (req, res) => {
  const hash = String(req.query.hash || '').toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(hash)) return res.json({ ok:false, error:'bad hash' })
  const r = node.receipts.get(hash)
  if (!r) return res.json({ ok:true, found:false })
  res.json({ ok:true, found:true, ...r })
})

// Tx status: pending (mempool) OR confirmed (receipt), cheap checks only
app.get('/tx/status', (req, res) => {
  const hash = String(req.query.hash || '').toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(hash)) return res.json({ ok:false, error:'bad hash' })

  // 1) check mempool (pending)
  try {
    const txs = node.mempool.peekAll()
    // mempool items already have .hash from make_tx.ts
    if (txs.some((t:any) => String(t?.hash || '').toLowerCase() === hash)) {
      return res.json({ ok:true, status:'pending' })
    }
  } catch {}

  // 2) check receipts (confirmed)
  const r = node.receipts.get(hash)
  if (r && (r as any).found) {
    // normalize shape to a stable API
    const { n, o, ts } = r as any
    return res.json({ ok:true, status:'confirmed', n, o, ts })
  }

  // 3) unknown
  return res.json({ ok:true, status:'unknown' })
})

app.get('/receipts/stats', (_req, res) => {
  const s = node.receipts.stats ? node.receipts.stats() : { shards: [], totalBytes: 0, totalLines: 0 }
  res.json({ ok:true, ...s })
})
app.post('/receipts/gc', (req, res) => {
  const keepLast = Number(req.query.keepLast || 1)
  try {
    const r = node.receipts.gc ? node.receipts.gc(keepLast) : { ok:true, keepLast, removed: 0, kept: 0 }
    res.json(r)
  } catch (e:any) {
    res.status(500).json({ ok:false, error:String(e?.message||e) })
  }
})

// TX endpoint
app.post('/tx', (req, res) => {
  const v = validateTxPayload(req.body)
  if (!v.ok) return res.json({ ok:false, error:`validation failed: ${v.error}` })
  node.publishJson('void/tx', req.body)
  res.json({ ok:true })
})

// Mempool
app.get('/mempool', (_req, res) => {
  const txs = node.mempool.peekAll()
  res.json({ ok:true, size: txs.length, txs })
})

// Blobs
app.post('/blob/put', async (req, res) => {
  if (typeof req.body?.text === 'string') {
    const buf = Buffer.from(req.body.text, 'utf8')
    const out = await node.putBlobFromBuffer(buf)
    res.json({ ok:true, ...out }); return
  }
  if (typeof req.body?.base64 === 'string') {
    const buf = Buffer.from(req.body.base64, 'base64')
    const out = await node.putBlobFromBuffer(buf)
    res.json({ ok:true, ...out }); return
  }
  res.json({ ok:false, error:'send {text} or {base64} JSON' })
})
app.get('/blob/:cid', (req, res) => {
  const b = node.getBlob(req.params.cid)
  if (!b) return res.status(404).send('not found')
  res.setHeader('content-type', 'application/octet-stream')
  res.send(b)
})

// Blocks (single)
app.get('/blocks/get/:number', (req, res) => {
  const n = Number(req.params.number)
  if (!Number.isFinite(n) || n < 0) return res.status(400).json({ ok:false, error:'bad number' })
  const b = node.store.loadBlock(n)
  if (!b) return res.status(404).json({ ok:false, error:'not found' })
  res.json(b)
})

// Blocks (range stream using sparse index)
app.get('/blocks/range', async (req, res) => {
  const from = Number(req.query.from ?? 0)
  const to   = Number(req.query.to   ?? node.store.loadHeadNumber())
  if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to < from) {
    return res.status(400).json({ ok:false, error:'bad range' })
  }
  res.setHeader('content-type', 'application/json')
  res.write('[')
  let first = true
  for await (const b of node.store.findRange(from, to)) {
    if (!first) res.write(',')
    first = false
    res.write(JSON.stringify(b))
  }
  res.write(']')
  res.end()
})

// Proposer controls
app.post('/blocks/start', (req, res) => {
  const intervalMs = Number(req.query.intervalMs || 5000)
  const r = node.startProposer(intervalMs)
  res.json(r)
})
app.post('/blocks/once', async (_req, res) => {
  await node.sealBlock()
  res.json({ ok: true })
})

// Sync helpers
app.get('/head', (_req, res) => { res.json({ ok:true, head: node.store.loadHeadNumber() }) })
app.post('/follower/start', (req, res) => {
  const peer = String(req.query.peer || 'http://127.0.0.1:4101')
  const ms = Number(req.query.intervalMs || 2000)
  const r = node.startFollower(peer, ms)
  res.json(r)
})

app.listen(HTTP_PORT, () => {
  console.log(`[void-node] http :${HTTP_PORT}`)
  console.log(`[void-node] bootstrap: ${BOOTSTRAP.join(', ') || '(none)'}`)
  if (!fs.existsSync(KEY_FILE)) console.log(`[void-node] wrote new key: ${KEY_FILE}`)
})

// ---------- small util ----------
function countLinesQuick(p: string): number {
  try {
    const buf = fs.readFileSync(p)
    let n = 0
    for (let i = 0; i < buf.length; i++) if (buf[i] === 0x0a) n++
    return n
  } catch { return 0 }
}

