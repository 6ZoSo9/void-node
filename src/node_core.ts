import fs from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import crypto from 'node:crypto'
import { Mempool } from './chain/mempool.js'
import { SegStore } from './chain/seg_store.js'
import { TxIndex } from './chain/txindex.js'
import { ReceiptsStore } from './chain/receipts.js'
import { Block, computeRoots, blockHash } from './chain/block.js'
import { cidForBytes } from './util/cid.js'
import { ensureDir } from './util/files.js'
import { buildKidxForJsonl } from './util/kidx.js'

/* ---------- Types ---------- */
type Keypair = {
  privateKey: crypto.KeyObject
  publicKey: crypto.KeyObject
  nodeId: string
  pubPEM: string
}

type Peer = {
  id: string
  socket: net.Socket
  framer: Framer
  addr: string
  listens: string[]
  outbound: boolean
  handshakeDone: boolean
}

type Msg =
  | { type: 'HELLO'; id: string; listen: string[]; proto: number; pubkey: string }
  | { type: 'SUB'; topic: string }
  | { type: 'PUB'; topic: string; data: string; from: string; nonce: string; sig: string; pubkey: string }
  | { type: 'PEERS'; addrs: string[] }

/* ---------- Helpers ---------- */
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
function bytesToSign(topic: string, data: string, nonce: string): Uint8Array {
  return Buffer.from(JSON.stringify({ topic, data, nonce }))
}
function safeImportPublicKey(pem: string): crypto.KeyObject | null {
  try { return crypto.createPublicKey(pem) } catch { return null }
}

/* ---------- Wire codec ---------- */
const MAX_MSG_BYTES = 64 * 1024
function encode(m: Msg): Buffer {
  const body = Buffer.from(JSON.stringify(m))
  const len = Buffer.alloc(4)
  len.writeUInt32BE(body.length, 0)
  return Buffer.concat([len, body])
}

class Framer {
  private buf = Buffer.alloc(0)
  constructor(private onMsg: (m: Msg) => void, private onBad?: (e: Error) => void) {}
  feed(chunk: Buffer) {
    this.buf = Buffer.concat([this.buf, chunk])
    while (this.buf.length >= 4) {
      const len = this.buf.readUInt32BE(0)
      if (len > MAX_MSG_BYTES) { this.onBad?.(new Error(`frame too large: ${len}`)); this.buf = Buffer.alloc(0); return }
      if (this.buf.length < 4 + len) break
      const body = this.buf.subarray(4, 4 + len)
      this.buf = this.buf.subarray(4 + len)
      try { this.onMsg(JSON.parse(body.toString('utf8'))) } catch (e: any) { this.onBad?.(e) }
    }
  }
}

/* ---------- PubSub ---------- */
class PubSub {
  subs: Map<string, Set<string>> = new Map()
  subscribe(peerId: string, topic: string) {
    if (!this.subs.has(topic)) this.subs.set(topic, new Set())
    this.subs.get(topic)!.add(peerId)
  }
  subscribers(topic: string): Set<string> {
    return this.subs.get(topic) ?? new Set()
  }
}

/* ---------- Core Node ---------- */
export class Node {
  readonly id: string
  readonly pubPEM: string
  private priv: crypto.KeyObject
  private pub: crypto.KeyObject
  readonly listenAddrs: string[] = []
  readonly peers: Map<string, Peer> = new Map()
  readonly pubsub = new PubSub()
  readonly txIndex = new TxIndex(path.join('data', 'index'))
  readonly receipts = new ReceiptsStore(path.join('data', 'receipts'), { shardSpan: 10_000 })
  readonly store = new SegStore('data', { segmentMaxBytes: 128 * 1024 * 1024, sparseEvery: 512 })
  readonly mempool = new Mempool()
  private seen = new Set<string>()
  private seenTimestamps = new Map<string, number>()
  private dialing = new Set<string>()
  private knownAddrs = new Set<string>()
  private proposerTimer: NodeJS.Timeout | null = null
  private blobsDir = path.join('data', 'blobs')
  server = net.createServer((sock) => this.onIncoming(sock))
  private static readonly SEEN_TTL_MS = 5 * 60_000
  private static readonly MIN_BACKOFF = 500
  private static readonly MAX_BACKOFF = 15_000

  constructor(public tcpPort: number, kp: Keypair) {
    this.id = kp.nodeId
    this.priv = kp.privateKey
    this.pub = kp.publicKey
    this.pubPEM = kp.pubPEM
    ensureDir(this.blobsDir)
  }

  /* ---------- Lifecycle ---------- */
  async start() {
    await new Promise<void>((r) => this.server.listen(this.tcpPort, '0.0.0.0', r))
    const addr = `127.0.0.1:${(this.server.address() as net.AddressInfo).port}`
    this.listenAddrs.push(addr)
    this.knownAddrs.add(addr)
    console.log(`[void-node] started TCP on ${addr}, id=${this.id}`)
    setInterval(() => this.gcSeen(), 30_000)
  }
  stop() { for (const p of this.peers.values()) p.socket.destroy(); this.server.close() }
  private gcSeen() {
    const now = Date.now()
    for (const [k, ts] of this.seenTimestamps)
      if (now - ts > Node.SEEN_TTL_MS) { this.seenTimestamps.delete(k); this.seen.delete(k) }
  }

  /* ---------- Network ---------- */
  private onIncoming(socket: net.Socket) {
    const peerAddr = `${socket.remoteAddress}:${socket.remotePort}`
    this.attachSocket(socket, peerAddr, false)
  }
  private attachSocket(socket: net.Socket, peerAddr: string, outgoing: boolean) {
    let peerId = `?-${crypto.randomBytes(4).toString('hex')}`
    const framer = new Framer((msg) => this.onMsg(peerId, msg))
    socket.on('data', (chunk) => framer.feed(chunk))
    socket.on('close', () => this.peers.delete(peerId))
    const peer: Peer = { id: peerId, socket, framer, addr: peerAddr, listens: [], outbound: outgoing, handshakeDone: false }
    this.peers.set(peerId, peer)
    this.sendRaw(peer, { type: 'HELLO', id: this.id, listen: this.listenAddrs, proto: 1, pubkey: this.pubPEM })
  }
  private onMsg(tempId: string, msg: Msg) {
    if (msg.type === 'HELLO') {
      const ent = [...this.peers.entries()].find(([k]) => k === tempId || k.startsWith('?-'))
      if (!ent) return
      const [tmpKey, p] = ent
      this.peers.delete(tmpKey)
      p.id = msg.id; p.handshakeDone = true; p.listens = msg.listen
      this.peers.set(p.id, p)
      console.log(`[peer] HELLO -> ${p.id} @ ${p.addr}`)
      return
    }
    if (msg.type === 'PUB') {
      const key = `${msg.topic}:${msg.nonce}`
      if (this.seen.has(key)) return
      const pub = safeImportPublicKey(msg.pubkey)
      if (!pub) return
      const bytes = bytesToSign(msg.topic, msg.data, msg.nonce)
      if (!verifyBytes(pub, bytes, msg.sig)) return
      this.seen.add(key)
      this.seenTimestamps.set(key, Date.now())
      if (msg.topic === 'void/tx') try { this.mempool.push(JSON.parse(msg.data)) } catch {}
    }
  }
  private sendRaw(peer: Peer, msg: Msg) { try { peer.socket.write(encode(msg)) } catch {} }

  /* ---------- Blocks ---------- */
  async sealBlock() {
    const t0 = Date.now()
    const parent = this.store.loadHeadNumber()
    const number = parent + 1
    const txs = this.mempool.drain(1000)
    const blobs = this.discoverLocalBlobs()
    const roots = computeRoots(txs, blobs)
    const headerBytes = Buffer.from(JSON.stringify({
      number,
      parentHash: number > 0 ? blockHash(this.store.loadBlock(parent)!) : ''.padStart(64, '0'),
      timestamp: Date.now(),
      txRoot: roots.txRoot,
      blobRoot: roots.blobRoot,
      proposer: this.id,
    }))
    const sig = signBytes(this.priv, headerBytes)
    const b: Block = {
      number,
      parentHash: number > 0 ? blockHash(this.store.loadBlock(parent)!) : ''.padStart(64, '0'),
      timestamp: Date.now(),
      txRoot: roots.txRoot,
      blobRoot: roots.blobRoot,
      txs,
      blobs,
      proposer: this.id,
      sig,
    }
    this.store.saveBlock(b)
    if (b.txs?.length) {
      const refs = b.txs.map((tx, i) => ({ h: tx.hash.toLowerCase(), n: b.number, o: i }))
      this.txIndex.putMany(refs)
      try { const shard = this.txIndex.shardForBlock(b.number); await buildKidxForJsonl(shard.path) } catch {}
      const recs = b.txs.map((tx, i) => ({ h: tx.hash.toLowerCase(), n: b.number, o: i, ts: b.timestamp ?? Date.now() }))
      const anyReceipts: any = this.receipts
      if (typeof anyReceipts.appendMany === 'function') await anyReceipts.appendMany(recs)
    }
    metrics.inc('blocks_sealed', 1)
    metrics.gauges.last_seal_ms = Date.now() - t0
  }

  startFollower(peerHttp = 'http://127.0.0.1:4101', intervalMs = 2000) {
    let running = false
    const tick = async () => {
      if (running) return
      running = true
      try {
        const myHead = this.store.loadHeadNumber()
        const headRes = await fetch(`${peerHttp}/head`).then(r => r.json()).catch(() => null)
        const theirHead = Number(headRes?.head ?? -1)
        if (Number.isFinite(theirHead) && theirHead >= myHead) { // >= for testing
          const from = Math.max(0, theirHead - 500)
          const to = theirHead
          const arr = await fetch(`${peerHttp}/blocks/range?from=${from}&to=${to}`).then(r => r.json()).catch(() => [])
          for (const b of arr) {
            this.store.saveBlock(b)
            metrics.inc('blocks_imported', 1)
          }
        }
      } catch {}
      running = false
    }
    setInterval(tick, intervalMs)
    return { ok: true, peerHttp, intervalMs }
  }

  /* ---------- Helpers ---------- */
  private discoverLocalBlobs() {
    const dir = path.join('data', 'blobs')
    if (!fs.existsSync(dir)) return []
    return fs.readdirSync(dir).map(f => {
      const p = path.join(dir, f)
      const st = fs.statSync(p)
      return { cid: f, size: st.size }
    })
  }
}
