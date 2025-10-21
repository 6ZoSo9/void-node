// src/index.ts
import express from 'express'
import fs from 'node:fs'
import path from 'node:path'

import { Node, loadOrCreateKeypair } from './node_core.js'
import { blockHash } from './chain/block.js'
import { buildAllKidx, buildKidxForJsonl, queryKidx } from './util/kidx.js'

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
    const L: string[] = []

    // counters
    L.push('# HELP void_tx_submitted Total tx submitted via HTTP')
    L.push('# TYPE void_tx_submitted counter')
    L.push(`void_tx_submitted ${this.counters.tx_submitted}`)

    L.push('# HELP void_blocks_sealed Total blocks sealed by this node')
    L.push('# TYPE void_blocks_sealed counter')
    L.push(`void_blocks_sealed ${this.counters.blocks_sealed}`)

    L.push('# HELP void_blocks_imported Total blocks imported by follower')
    L.push('# TYPE void_blocks_imported counter')
    L.push(`void_blocks_imported ${this.counters.blocks_imported}`)

    L.push('# HELP void_tx_indexed Total transactions indexed')
    L.push('# TYPE void_tx_indexed counter')
    L.push(`void_tx_indexed ${this.counters.tx_indexed}`)

    L.push('# HELP void_receipts_appended Total receipts appended')
    L.push('# TYPE void_receipts_appended counter')
    L.push(`void_receipts_appended ${this.counters.receipts_appended}`)

    // gauges
    L.push('# HELP void_peers_connected Current connected peers')
    L.push('# TYPE void_peers_connected gauge')
    L.push(`void_peers_connected ${extra.peers}`)

    L.push('# HELP void_mempool_size Current mempool size')
    L.push('# TYPE void_mempool_size gauge')
    L.push(`void_mempool_size ${extra.mempool}`)

    L.push('# HELP void_head_number Current head block number')
    L.push('# TYPE void_head_number gauge')
    L.push(`void_head_number ${extra.head}`)

    L.push('# HELP void_last_seal_ms Duration of last sealBlock in ms')
    L.push('# TYPE void_last_seal_ms gauge')
    L.push(`void_last_seal_ms ${this.gauges.last_seal_ms}`)

    return L.join('\n') + '\n'
  }
}
const metrics = new Metrics()
/* =================================================== */

// ---------- config ----------
const HTTP_PORT = Number(process.env.HTTP_PORT || 4100)
const P2P_PORT  = Number(process.env.P2P_PORT  || 4700)
const BOOTSTRAP = (process.env.BOOTSTRAP || '').split(',').map(s => s.trim()).filter(Boolean)
const KEY_FILE  = process.env.KEY_FILE || '.nodekey'
const PROTO_VER = 1

// ---------- boot ----------
const kp = loadOrCreateKeypair(path.resolve(KEY_FILE))
const node = new Node(P2P_PORT, kp)
await node.start()

// topics we actually use
node.subscribe('void/hello')
node.subscribe('void/tx')
node.subscribe('void/blob.announce')
node.subscribe('void/block')

// optional: extra best-effort dialing
for (const a of BOOTSTRAP) { try { node.connect(a) } catch {} }

const app = express()
app.use(express.json({ limit: '128mb' }))

/* -------- Index maintenance -------- */
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
    if (blockParam !== undefined) {
      const bn = Number(blockParam)
      if (!Number.isFinite(bn) || bn < 0) return res.json({ ok:false, error:'bad block' })
      const shard = node.txIndex.shardForBlock(bn)
      await buildKidxForJsonl(shard.path)
      return res.json({ ok:true, shard: { from: shard.from, to: shard.to }, kidx: shard.path.replace(/\.jsonl$/, '.kidx') })
    } else if (typeof hashParam === 'string') {
      const hash = String(hashParam).toLowerCase()
      if (!/^[0-9a-f]{64}$/.test(hash)) return res.json({ ok:false, error:'bad hash' })
      const shards = node.txIndex.listShards().sort((a,b)=>b.from-a.from)
      for (const s of shards) {
        const kidxPath = s.path.replace(/\.jsonl$/, '.kidx')
        if (fs.existsSync(kidxPath)) {
          const hit = queryKidx(kidxPath, hash)
          if (hit.found) {
            await buildKidxForJsonl(s.path)
            return res.json({ ok:true, shard:{from:s.from,to:s.to}, kidx:kidxPath })
          }
          continue
        }
        const r = node.txIndex.lookupInShard(s.path, hash)
        if (r.found) { await buildKidxForJsonl(s.path); return res.json({ ok:true, shard:{from:s.from,to:s.to}, kidx:s.path.replace(/\.jsonl$/,'.kidx') }) }
      }
      return res.json({ ok:false, error:'hash not found' })
    }
    return res.json({ ok:false, error:'provide block or hash' })
  } catch (e:any) {
    res.status(500).json({ ok:false, error:String(e?.message||e) })
  }
})

/* -------- Health/peers -------- */
app.get('/health', (_req, res) => {
  res.json({ ok: true, proto: PROTO_VER, nodeId: node.id, http: HTTP_PORT, p2p: P2P_PORT,
    peers: [...node.peers.keys()].filter(k => !k.startsWith('?-')), listen: node.listenAddrs })
})
app.get('/peers', (_req, res) => res.json({ ok: true, ...node.peersSnapshot() }))

/* -------- Head -------- */
app.get('/blocks/head', (_req, res) => {
  const n = node.store.loadHeadNumber()
  const b = node.store.loadBlock(n)
  if (!b) return res.json({ ok: true, head: -1 })
  res.json({ ok: true, head: n, hash: blockHash(b) })
})

/* -------- Blocks (single) -------- */
app.get('/blocks/get/:number', (req, res) => {
  const n = Number(req.params.number)
  if (!Number.isFinite(n) || n < 0) return res.status(400).json({ ok:false, error:'bad number' })
  const b = node.store.loadBlock(n)
  if (!b) return res.status(404).json({ ok:false, error:'not found' })
  res.json(b)
})

/* -------- Blocks (range) -------- */

app.get('/blocks/range', (req, res) => {
  const from = Number(req.query.from ?? 0)
  const to   = Number(req.query.to   ?? node.store.loadHeadNumber())
  if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to < from) {
    return res.status(400).json({ ok: false, error: 'bad range' })
  }

  try {
    const blocks: any[] = []
    for (let i = from; i <= to; i++) {
      const b = node.store.loadBlock(i)
      if (b) blocks.push(b)
    }
    res.setHeader('content-type', 'application/json')
    res.json(blocks)
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.message || e) })
  }
})

/* ---------------- Bulk block import (follower) ---------------- */
app.post('/blocks/import', async (req, res) => {
  try {
    const arr = Array.isArray(req.body) ? req.body : []
    if (!arr.length) return res.json({ ok: true, imported: 0, alreadyHad: 0, filled: 0, kidxRebuilt: 0 })

    const touchedShardPaths = new Set<string>()
    let imported = 0
    let alreadyHad = 0
    let filled = 0

    for (const b of arr) {
      const n = Number(b?.number)
      if (!Number.isFinite(n)) continue

      const existing = node.store.loadBlock(n)
      const incomingHasTxs = Array.isArray(b?.txs) && b.txs.length > 0
      const existingHasTxs = Array.isArray(existing?.txs) && existing.txs.length > 0

      if (!existing) {
        node.store.saveBlock(b)
        imported++

        if (incomingHasTxs) {
          const refs = b.txs.map((tx: any, i: number) => ({ h: tx.hash.toLowerCase(), n: b.number, o: i }))
          node.txIndex.putMany(refs)
          metrics.inc('tx_indexed', b.txs.length)

          const anyReceipts: any = node.receipts as any
          const recs = b.txs.map((tx: any, i: number) => ({ h: tx.hash.toLowerCase(), n: b.number, o: i, ts: b.timestamp ?? Date.now() }))
          if (typeof anyReceipts.appendMany === 'function') await anyReceipts.appendMany(recs)
          else if (typeof anyReceipts.append === 'function') for (const r of recs) await anyReceipts.append(r)
          metrics.inc('receipts_appended', recs.length)

          const shard = node.txIndex.shardForBlock(b.number)
          touchedShardPaths.add(shard.path)
        }
        continue
      }

      if (!existingHasTxs && incomingHasTxs) {
        // Fill header-only block in place
        const merged = { ...existing, ...b, txs: b.txs }
        node.store.saveBlock(merged)
        filled++

        const refs = b.txs.map((tx: any, i: number) => ({ h: tx.hash.toLowerCase(), n: b.number, o: i }))
        node.txIndex.putMany(refs)
        metrics.inc('tx_indexed', b.txs.length)

        const anyReceipts: any = node.receipts as any
        const recs = b.txs.map((tx: any, i: number) => ({ h: tx.hash.toLowerCase(), n: b.number, o: i, ts: b.timestamp ?? Date.now() }))
        if (typeof anyReceipts.appendMany === 'function') await anyReceipts.appendMany(recs)
        else if (typeof anyReceipts.append === 'function') for (const r of recs) await anyReceipts.append(r)
        metrics.inc('receipts_appended', recs.length)

        const shard = node.txIndex.shardForBlock(b.number)
        touchedShardPaths.add(shard.path)
        continue
      }

      alreadyHad++
    }

    let kidxRebuilt = 0
    for (const p of touchedShardPaths) {
      try { await buildKidxForJsonl(p); kidxRebuilt++ } catch {}
    }

    return res.json({ ok: true, imported, alreadyHad, filled, kidxRebuilt })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) })
  }
})


/* -------- Tx lookup -------- */
app.get('/tx/lookup', (req, res) => {
  const hash = String(req.query.hash || '').toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(hash)) return res.json({ ok:false, error:'bad hash' })

  const shards = node.txIndex.listShards().sort((a,b) => b.from - a.from)
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

/* -------- Receipts & status -------- */
app.get('/tx/receipt', (req, res) => {
  const hash = String(req.query.hash || '').toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(hash)) return res.json({ ok:false, error:'bad hash' })
  const r = node.receipts.get(hash)
  if (!r) return res.json({ ok:true, found:false })
  res.json({ ok:true, found:true, ...r })
})
app.get('/tx/status', (req, res) => {
  const hash = String(req.query.hash || '').toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(hash)) return res.json({ ok:false, error:'bad hash' })

  // pending?
  try {
    const txs = node.mempool.peekAll()
    if (txs.some((t:any) => String(t?.hash || '').toLowerCase() === hash)) {
      return res.json({ ok:true, status:'pending' })
    }
  } catch {}

  // confirmed?
  const r = node.receipts.get(hash)
  if (r && (r as any).found) {
    const { n, o, ts } = r as any
    return res.json({ ok:true, status:'confirmed', n, o, ts })
  }
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

 /* -------- Mempool quick count -------- */
app.get('/mempool/count', (_req, res) => {
  try {
    const txs = node.mempool.peekAll();
    res.json({ ok: true, count: Array.isArray(txs) ? txs.length : 0 });
  } catch (e:any) {
    res.status(500).json({ ok:false, error: String(e?.message || e) });
  }
});

/* -------- TX endpoint -------- */
app.post('/tx', (req, res) => {
  const tx = req.body;
  if (!tx || typeof tx !== 'object') {
    return res.status(400).json({ ok: false, error: 'validation failed: not an object' });
  }
  const hash = String(tx.hash || '').toLowerCase();
  const bodyOk = typeof tx.body === 'object' && tx.body !== null;
  const hashOk = /^[0-9a-f]{64}$/.test(hash);

  if (!bodyOk || !hashOk) {
    return res.status(400).json({ ok: false, error: 'bad tx: require {hash: 64-hex, body: object}' });
  }

  // 1) Push to *local* mempool immediately (authoritative for sealing)
  try { node.mempool.push({ ...tx, hash }); } catch {}

  // 2) Publish to peers (self will not re-enqueue due to publishString guard)
  metrics.inc('tx_submitted', 1);
  node.publishJson('void/tx', { ...tx, hash });

  res.json({ ok: true });
});



/* -------- Mempool -------- */
app.get('/mempool', (_req, res) => {
  const txs = node.mempool.peekAll()
  res.json({ ok:true, size: txs.length, txs })
})

/* -------- Blobs -------- */
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

/* -------- Proposer controls -------- */
app.post('/blocks/start', (req, res) => {
  const intervalMs = Number(req.query.intervalMs || 5000)
  const r = node.startProposer(intervalMs)
  res.json(r)
})
app.post('/blocks/once', async (_req, res) => {
  const t0 = Date.now()
  const r = await node.sealBlock()   // node_core seals + persists + indexes + receipts
  metrics.gauges.last_seal_ms = Date.now() - t0
  metrics.inc('blocks_sealed', 1)
  if (r?.txs > 0) {
    metrics.inc('tx_indexed', r.txs)
    metrics.inc('receipts_appended', r.txs)
  }
  res.json({ ok: true, number: r?.number, txs: r?.txs ?? 0 })
})

/* -------- Sync helpers -------- */
app.get('/head', (_req, res) => { res.json({ ok:true, head: node.store.loadHeadNumber() }) })
app.post('/follower/start', (req, res) => {
  const peer = String(req.query.peer || 'http://127.0.0.1:4101')
  const ms = Number(req.query.intervalMs || 2000)
  const r = node.startFollower(peer, ms, {
    onImportBlock: (b:any) => {
      metrics.inc('blocks_imported', 1)
      if (b?.txs?.length) {
        metrics.inc('tx_indexed', b.txs.length)
        metrics.inc('receipts_appended', b.txs.length)
      }
    }
  })
  res.json(r)
})
app.post('/follower/once', async (req, res) => {
  const peer = String(req.query.peer || 'http://127.0.0.1:4101')
  const r = await node.pullOnce(peer, {
    onImportBlock: (b) => {
      metrics.inc('blocks_imported', 1)
      if (b?.txs?.length) {
        metrics.inc('tx_indexed', b.txs.length)
        metrics.inc('receipts_appended', b.txs.length)
      }
    }
  })
  res.json(r)
})


/* -------- Metrics -------- */
app.get('/metrics', (_req, res) => {
  const head = node.store.loadHeadNumber()
  const peers = [...node.peers.keys()].filter(k => !k.startsWith('?-')).length
  const mempool = node.mempool.peekAll().length
  res.setHeader('content-type', 'text/plain; version=0.0.4; charset=utf-8')
  res.send(metrics.renderText({ peers, mempool, head }))
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

