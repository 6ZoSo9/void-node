// src/index.ts
import { SegStore } from "./chain/seg_store.js"
import { autoRepairDataDir } from "./chain/auto_repair.js"
import express from "express"
import * as fs from 'node:fs'
import * as path from 'node:path'
import { execFile } from "node:child_process"
import { Node } from "./node_core.js"
import { blockHash } from "./chain/block.js"
import { buildAllKidx, buildKidxForJsonl, queryKidx } from "./util/kidx.js"
import { PeerRegistry } from "./node_peer_registry.js"
import { loadKeypair } from "./crypto/keypair.js"   // <-- ADDED

// ---- ENV BRIDGE (place at top of src/index.ts, before config constants) ----
process.env.DATA_DIR = process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data";
process.env.HTTP_PORT = process.env.HTTP_PORT || process.env.VOID_HTTP_PORT || "4100";
process.env.P2P_PORT = process.env.P2P_PORT || process.env.VOID_P2P_PORT || "4700";
process.env.NODE_PRIVKEY_PATH = process.env.NODE_PRIVKEY_PATH || process.env.VOID_NODE_KEY_A || process.env.KEY_FILE || ".nodekey";
// ---------------------------------------------------------------------------

// ---------- config (robust) ----------
function firstEnv(...names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (v !== undefined && v !== "") return v;
  }
}
function reqInt(varNames: string[], label: string): number {
  const raw = firstEnv(...varNames);
  if (raw === undefined) throw new Error(`Missing required env: ${label} (${varNames.join(" or ")})`);
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`Invalid integer for ${label}: ${raw}`);
  return n;
}
function reqStr(varNames: string[], label: string): string {
  const v = firstEnv(...varNames);
  if (!v) throw new Error(`Missing required env: ${label} (${varNames.join(" or ")})`);
  return v;
}

const DATA_DIR = reqStr(["VOID_DATA_DIR","DATA_DIR"], "DATA_DIR");
const HTTP_PORT = reqInt(["VOID_HTTP_PORT","HTTP_PORT"], "HTTP_PORT");
const P2P_PORT = reqInt(["VOID_P2P_PORT","P2P_PORT"], "P2P_PORT");
const MAX_BLOB_MB = Number(firstEnv("MAX_BLOB_MB") ?? 8);
const BOOTSTRAP = (firstEnv("BOOTSTRAP") || "").split(",").map(s => s.trim()).filter(Boolean);
const PROTO_VER = 1;
const ALLOW_EMPTY_BLOCKS = firstEnv("ALLOW_EMPTY_BLOCKS") === "1";

// IMPORTANT: don't auto-persist keys. Require a file path via env, or bail.
const KEY_PATH = path.resolve(
  reqStr(["VOID_NODE_KEY_A","NODE_PRIVKEY_PATH","KEY_FILE"], "node private key path")
);

// quick one-shot config log (helps verify which ports/dirs were chosen)
console.log("[void-node] config", { DATA_DIR, HTTP_PORT, P2P_PORT, KEY_PATH });

// legacy helper var (harmless if kept)
const __apiSegStore = new SegStore(DATA_DIR, { segmentMaxBytes: 8 * 1024 * 1024, sparseEvery: 16 })

// ---------- wrap top-level await ----------
async function __main__() {
  /* ===================== METRICS ===================== */
  class Metrics {
    counters = {
      tx_submitted: 0,
      blocks_sealed: 0,
      blocks_imported: 0,
      tx_indexed: 0,
      receipts_appended: 0,
    }
    gauges = { last_seal_ms: 0, peers_known: 0 }
    inc<K extends keyof Metrics["counters"]>(k: K, v = 1) { this.counters[k] += v }
    renderText(extra: { peers: number; mempool: number; head: number; peers_known: number }) {
      const L: string[] = []
      L.push("# HELP void_tx_submitted Total tx submitted via HTTP")
      L.push("# TYPE void_tx_submitted counter")
      L.push(`void_tx_submitted ${this.counters.tx_submitted}`)
      L.push("# HELP void_blocks_sealed Total blocks sealed by this node")
      L.push("# TYPE void_blocks_sealed counter")
      L.push(`void_blocks_sealed ${this.counters.blocks_sealed}`)
      L.push("# HELP void_blocks_imported Total blocks imported by follower")
      L.push("# TYPE void_blocks_imported counter")
      L.push(`void_blocks_imported ${this.counters.blocks_imported}`)
      L.push("# HELP void_tx_indexed Total transactions indexed")
      L.push("# TYPE void_tx_indexed counter")
      L.push(`void_tx_indexed ${this.counters.tx_indexed}`)
      L.push("# HELP void_receipts_appended Total receipts appended")
      L.push("# TYPE void_receipts_appended counter")
      L.push(`void_receipts_appended ${this.counters.receipts_appended}`)
      L.push("# HELP void_peers_connected Current connected peers")
      L.push("# TYPE void_peers_connected gauge")
      L.push(`void_peers_connected ${extra.peers}`)
      L.push("# HELP void_mempool_size Current mempool size")
      L.push("# TYPE void_mempool_size gauge")
      L.push(`void_mempool_size ${extra.mempool}`)
      L.push("# HELP void_head_number Current head block number")
      L.push("# TYPE void_head_number gauge")
      L.push(`void_head_number ${extra.head}`)
      L.push("# HELP void_peers_known Known peers in registry")
      L.push("# TYPE void_peers_known gauge")
      L.push(`void_peers_known ${extra.peers_known}`)
      L.push("# HELP void_last_seal_ms Duration of last sealBlock in ms")
      L.push("# TYPE void_last_seal_ms gauge")
      L.push(`void_last_seal_ms ${this.gauges.last_seal_ms}`)
      return L.join("\n") + "\n"
    }
  }
  const metrics = new Metrics()
  /* =================================================== */

  // ---------- safety: require key file; do not create ----------
  if (!fs.existsSync(KEY_PATH)) {
    console.error(
      `[void-node] missing key file: ${KEY_PATH}\n` +
      "  + Set NODE_PRIVKEY_PATH to a readable PEM key (chmod 600) and restart."
    )
    process.exit(1)
  }

  // ---------- auto-repair (BEFORE node touches storage) ----------
  await autoRepairDataDir(DATA_DIR, { sparseEvery: 16 })

  // ---------- boot ----------
  const kp = loadKeypair(KEY_PATH)   // returns {privateKey, publicKey, nodeId, pubPEM}
  const node = new Node(P2P_PORT, kp, { allowEmptyBlocks: ALLOW_EMPTY_BLOCKS });
  await node.start()

node.onSealed = (b, dt) => {
  metrics.inc("blocks_sealed", 1);
  metrics.gauges.last_seal_ms = dt;
  if (Array.isArray(b.txs)) {
    metrics.inc("tx_indexed", b.txs.length);
    metrics.inc("receipts_appended", b.txs.length);
  }
};

  const peersReg = new PeerRegistry()

  // pubsub learning for "void/http"
  node.onHttpAnnounce = ({ id, http }) => {
    try {
      if (!id) return
      peersReg.upsert({ id, http, capabilities: ["blob", "tx", "block"] })
      metrics.gauges.peers_known = peersReg.count()
    } catch {}
  }

  // topics we actually use
  node.subscribe("void/hello")
  node.subscribe("void/tx")
  node.subscribe("void/blob.announce")
  node.subscribe("void/block")
  node.subscribe("void/http")

  // optional best-effort dialing
  for (const a of BOOTSTRAP) { try { node.connect(a) } catch {} }

  const app = express()
  app.use(express.json({ limit: "128mb" }))

  /* ===================== FOLLOWER TELEMETRY ===================== */
  type SyncState = {
    enabled: boolean
    peer?: string
    intervalMs?: number
    lastOk?: number
    lastErr?: string | null
    lastImported?: number
    theirHead?: number
  }
  const syncState: SyncState = { enabled: false, lastErr: null }
  app.get("/sync/status", (_req, res) => {
    const myHead = node.store.loadHeadNumber()
    res.json({ ok: true, myHead, ...syncState })
  })
  /* ============================================================= */

  /* ===================== MAINTENANCE ===================== */
  app.get("/maintenance/verify", async (_req, res) => {
    try {
      const r = await runTsxScript("scripts/check_store.ts", {
        env: { DATA_DIR: process.env.DATA_DIR || "data" },
        timeoutMs: 45_000,
      })
      res.json({
        ok: r.ok, code: r.code, timedOut: r.timedOut,
        summary: r.stdout.split("\n").filter(Boolean).slice(-6),
        stdout: r.stdout, stderr: r.stderr,
      })
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) })
    }
  })

  app.post("/maintenance/auto-repair", async (req, res) => {
    try {
      const remote = String(req.socket.remoteAddress || '')
      const allowRemote = process.env.ALLOW_REMOTE_REPAIR === '1'
      const isLocal = remote === '127.0.0.1' || remote === '::1' || remote.startsWith('::ffff:127.0.0.')
      if (!allowRemote && !isLocal) {
        return res.status(403).json({ ok:false, error:'forbidden (local only by default)' })
      }
      const dry = String(req.query.dryRun || req.query.dry || "") === "1" ? "1" : "0"
      const r = await runTsxScript("scripts/auto_repair.ts", {
        env: { DATA_DIR: process.env.DATA_DIR || "data", DRY_RUN: dry },
        timeoutMs: 5 * 60_000,
      })
      const verify = await runTsxScript("scripts/check_store.ts", {
        env: { DATA_DIR: process.env.DATA_DIR || "data" },
        timeoutMs: 45_000,
      })
      res.json({
        ok: r.ok, code: r.code, timedOut: r.timedOut,
        repair: { stdout: r.stdout, stderr: r.stderr },
        verify: {
          ok: verify.ok, code: verify.code, timedOut: verify.timedOut,
          summary: verify.stdout.split("\n").filter(Boolean).slice(-6),
        },
      })
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) })
    }
  })
  /* ===================== INDEX MAINTENANCE ===================== */

  app.post("/index/rebuild", async (_req, res) => {
    try { res.json(await node.rebuildTxIndex()) }
    catch (e: any) { res.status(500).json({ ok: false, error: String(e?.message || e) }) }
  })

  app.post("/index/kidx/build", async (_req, res) => {
    try { res.json(await buildAllKidx()) }
    catch (e: any) { res.status(500).json({ ok: false, error: String(e?.message || e) }) }
  })

  app.get("/index/stats", (_req, res) => {
    const shards = node.txIndex.listShards().map(s => {
      const jsonlStat = fs.existsSync(s.path) ? fs.statSync(s.path) : null
      const kidxPath = s.path.replace(/\.jsonl$/, ".kidx")
      const kidxStat = fs.existsSync(kidxPath) ? fs.statSync(kidxPath) : null
      const lines = jsonlStat ? countLinesQuick(s.path) : 0
      return {
        from: s.from, to: s.to,
        jsonl: { path: s.path, bytes: jsonlStat?.size ?? 0, lines },
        kidx:  { path: kidxPath, bytes: kidxStat?.size ?? 0, present: !!kidxStat }
      }
    })
    res.json({ ok: true, shards })
  })

  app.post("/index/gc", (req, res) => {
    const keepLast = Number(req.query.keepLast || 1)
    try { res.json(node.txIndex.gc(keepLast)) }
    catch (e: any) { res.status(500).json({ ok: false, error: String(e?.message || e) }) }
  })

  app.post("/index/kidx/rebuild-shard", async (req, res) => {
    const blockParam = req.query.block
    const hashParam = req.query.hash
    try {
      if (blockParam !== undefined) {
        const bn = Number(blockParam)
        if (!Number.isFinite(bn) || bn < 0) return res.json({ ok: false, error: "bad block" })
        const shard = node.txIndex.shardForBlock(bn)
        await buildKidxForJsonl(shard.path)
        return res.json({ ok: true, shard: { from: shard.from, to: shard.to }, kidx: shard.path.replace(/\.jsonl$/, ".kidx") })
      } else if (typeof hashParam === "string") {
        const hash = String(hashParam).toLowerCase()
        if (!/^[0-9a-f]{64}$/.test(hash)) return res.json({ ok: false, error: "bad hash" })
        const shards = node.txIndex.listShards().sort((a, b) => b.from - a.from)
        for (const s of shards) {
          const kidxPath = s.path.replace(/\.jsonl$/, ".kidx")
          if (fs.existsSync(kidxPath)) {
            const hit = queryKidx(kidxPath, hash)
            if (hit.found) {
              await buildKidxForJsonl(s.path);
              return res.json({ ok: true, shard: { from: s.from, to: s.to }, kidx: kidxPath })
            }
            continue
          }
          const r = node.txIndex.lookupInShard(s.path, hash)
          if (r.found) {
            await buildKidxForJsonl(s.path);
            return res.json({ ok: true, shard: { from: s.from, to: s.to }, kidx: s.path.replace(/\.jsonl$/, ".kidx") })
          }
        }
        return res.json({ ok: false, error: "hash not found" })
      }
      return res.json({ ok: false, error: "provide block or hash" })
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) })
    }
  })

  /* ===================== HEALTH / PEERS ===================== */
  app.get(["/health", "/api/health"], (_req, res) => {
    res.json({
      ok: true, proto: PROTO_VER, nodeId: node.id,
      http: HTTP_PORT, p2p: P2P_PORT,
      peers: [...node.peers.keys()].filter(k => !k.startsWith("?-")),
      listen: node.listenAddrs
    })
  })

  app.get(["/head", "/api/head"], (_req, res) => {
    res.json({ ok: true, head: node.store.loadHeadNumber() })
  })

  app.get("/peers", (_req, res) => res.json({ ok: true, ...node.peersSnapshot() }))

  /* Peer registry QoL */
  app.get("/peers/registry", (_req, res) => {
    try { res.json({ ok: true, peers: peersReg.all() }) }
    catch (e: any) { res.status(500).json({ ok: false, error: String(e?.message || e) }) }
  })

  app.post("/peers/registry/upsert", (req, res) => {
    try {
      const id = String(req.body?.id || "")
      if (!id) return res.json({ ok: false, error: "missing id" })
      const http = typeof req.body?.http === "string" ? req.body.http : undefined
      const p2p  = typeof req.body?.p2p  === "string" ? req.body.p2p  : undefined
      const caps = Array.isArray(req.body?.capabilities) ? req.body.capabilities : undefined
      const r = peersReg.upsert({ id, http, p2p, capabilities: caps })
      metrics.gauges.peers_known = peersReg.count()
      res.json({ ok: true, peer: r })
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) })
    }
  })

  app.post("/peers/registry/purge", (req, res) => {
    try {
      const maxAgeSec = Number(req.query.maxAgeSec || 600)
      const r = peersReg.purgeStale(Math.max(1, maxAgeSec) * 1000)
      metrics.gauges.peers_known = peersReg.count()
      res.json(r)
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) })
    }
  })

  app.get("/peers/registry/ids", (_req, res) => {
    try { res.json(peersReg.all().map(p => p.id)) }
    catch (e: any) { res.status(500).json({ ok: false, error: String(e?.message || e) }) }
  })

  app.delete("/peers/registry/:id", (req, res) => {
    try {
      const id = String(req.params.id || "");
      const r = peersReg.remove(id);
      res.json({ ok: true, removed: r.removed, remaining: r.remaining })
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) })
    }
  })

  /* ===================== BLOCKS ===================== */
  app.get("/blocks/head", (_req, res) => {
    const n = node.store.loadHeadNumber()
    const b = node.store.loadBlock(n)
    if (!b) return res.json({ ok: true, head: -1 })
    res.json({ ok: true, head: n, hash: blockHash(b) })
  })

  app.get("/blocks/get/:number", (req, res) => {
    const n = Number(req.params.number)
    if (!Number.isFinite(n) || n < 0) return res.status(400).json({ ok: false, error: "bad number" })
    const b = node.store.loadBlock(n)
    if (!b) return res.status(404).json({ ok: false, error: "not found" })
    res.json(b)
  })

  app.get("/blocks/range", (req, res) => {
    const from = Number(req.query.from ?? 0)
    const to = Number(req.query.to ?? node.store.loadHeadNumber())
    if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to < from) {
      return res.status(400).json({ ok: false, error: "bad range" })
    }
    try {
      const blocks: any[] = []
      for (let i = from; i <= to; i++) {
        const b = node.store.loadBlock(i)
        if (b) blocks.push(b)
      }
      res.json(blocks)
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) })
    }
  })

  /* Bulk block import (follower) */
  app.post("/blocks/import", async (req, res) => {
    try {
      const arr = Array.isArray(req.body) ? req.body : []
      if (!arr.length) return res.json({ ok: true, imported: 0, alreadyHad: 0, filled: 0, kidxRebuilt: 0 })

      const touchedShardPaths = new Set<string>()
      let imported = 0, alreadyHad = 0, filled = 0

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
            metrics.inc("tx_indexed", b.txs.length)
            const anyReceipts: any = node.receipts as any
            const recs = b.txs.map((tx: any, i: number) => ({ h: tx.hash.toLowerCase(), n: b.number, o: i, ts: b.timestamp ?? Date.now() }))
            if (typeof anyReceipts.appendMany === "function") await anyReceipts.appendMany(recs)
            else if (typeof anyReceipts.append === "function") for (const r of recs) await anyReceipts.append(r)
            metrics.inc("receipts_appended", recs.length)
            const shard = node.txIndex.shardForBlock(b.number)
            touchedShardPaths.add(shard.path)
          }
          continue
        }

        if (!existingHasTxs && incomingHasTxs) {
          const merged = { ...existing, ...b, txs: b.txs }
          node.store.saveBlock(merged)
          filled++
          const refs = b.txs.map((tx: any, i: number) => ({ h: tx.hash.toLowerCase(), n: b.number, o: i }))
          node.txIndex.putMany(refs)
          metrics.inc("tx_indexed", b.txs.length)
          const anyReceipts: any = node.receipts as any
          const recs = b.txs.map((tx: any, i: number) => ({ h: tx.hash.toLowerCase(), n: b.number, o: i, ts: b.timestamp ?? Date.now() }))
          if (typeof anyReceipts.appendMany === "function") await anyReceipts.appendMany(recs)
          else if (typeof anyReceipts.append === "function") for (const r of recs) await anyReceipts.append(r)
          metrics.inc("receipts_appended", recs.length)
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

  /* -------- Proposer controls (stop) -------- */
  app.post("/blocks/stop", (_req, res) => {
    try {
      const r = (node as any).stopProposer ? (node as any).stopProposer() : { ok:true, note:"no stopProposer(), noop" }
      res.json(r || { ok:true })
    } catch (e:any) {
      res.status(500).json({ ok:false, error:String(e?.message||e) })
    }
  })
/* -------- Force one block (debug) -------- */
app.post("/blocks/once", async (req, res) => {
  try {
    const t0 = Date.now();
    const allowEmptyOnce = String(req.query.allowEmpty || req.query.empty || "0") === "1";
    const r = await node.sealBlock({ allowEmptyOnce });
    const dt = Date.now() - t0;
    res.json({ ...r, ms: dt });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

  /* ===================== TX / RECEIPTS ===================== */
  app.get("/tx/lookup", (req, res) => {
    const hash = String(req.query.hash || "").toLowerCase()
    if (!/^[0-9a-f]{64}$/.test(hash)) return res.json({ ok: false, error: "bad hash" })
    const shards = node.txIndex.listShards().sort((a, b) => b.from - a.from)
    for (const s of shards) {
      const kidxPath = s.path.replace(/\.jsonl$/, ".kidx")
      if (fs.existsSync(kidxPath)) {
        const hit = queryKidx(kidxPath, hash)
        if (hit.found) {
          const blk = node.store.loadBlock(hit.n!)
          if (!blk) return res.json({ ok: false, error: "block not found (stale index?)" })
          const tx = (blk as any).txs?.[hit.o!]
          return res.json({ ok: true, found: true, block: hit.n, offset: hit.o, tx })
        }
        continue
      }
      const r = node.txIndex.lookupInShard(s.path, hash)
      if (r.found) {
        const blk = node.store.loadBlock(r.n)
        if (!blk) return res.json({ ok: false, error: "block not found (stale index?)" })
        const tx = (blk as any).txs?.[r.o]
        return res.json({ ok: true, found: true, block: r.n, offset: r.o, tx })
      }
    }
    return res.json({ ok: true, found: false })
  })

  app.get("/tx/receipt", (req, res) => {
    const hash = String(req.query.hash || "").toLowerCase()
    if (!/^[0-9a-f]{64}$/.test(hash)) return res.json({ ok: false, error: "bad hash" })
    const r = node.receipts.get(hash)
    if (!r) return res.json({ ok: true, found: false })
    const { found: _ignoredFound, ...rest } = r as any
    res.json({ ok: true, found: true, ...rest })
  })

  app.get("/tx/status", (req, res) => {
    const hash = String(req.query.hash || "").toLowerCase()
    if (!/^[0-9a-f]{64}$/.test(hash)) return res.json({ ok: false, error: "bad hash" })
    try {
      const txs = (node.mempool as any).peekAll?.() ?? []
      if (Array.isArray(txs) && txs.some((t: any) => String(t?.hash || "").toLowerCase() === hash)) {
        return res.json({ ok: true, status: "pending" })
      }
    } catch {}
    const r = node.receipts.get(hash)
    if (r && (r as any).found) {
      const { n, o, ts } = r as any
      return res.json({ ok: true, status: "confirmed", n, o, ts })
    }
    return res.json({ ok: true, status: "unknown" })
  })

  app.get("/receipts/stats", (_req, res) => {
    const s = (node.receipts as any).stats ? (node.receipts as any).stats() : { shards: [], totalBytes: 0, totalLines: 0 }
    res.json({ ok: true, ...s })
  })

  app.post("/receipts/gc", (req, res) => {
    const keepLast = Number(req.query.keepLast || 1)
    try {
      const r = (node.receipts as any).gc ? (node.receipts as any).gc(keepLast) : { ok: true, keepLast, removed: 0, kept: 0 }
      res.json(r)
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) })
    }
  })

  /* ===================== MEMPOOL / TX SUBMIT ===================== */
  app.get("/mempool/count", (_req, res) => {
    try {
      const txs = (node.mempool as any).peekAll?.() ?? []
      res.json({ ok: true, count: Array.isArray(txs) ? txs.length : 0 })
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) })
    }
  })

  app.post("/tx", (req, res) => {
    const tx = req.body
    if (!tx || typeof tx !== "object") {
      return res.status(400).json({ ok: false, error: "validation failed: not an object" })
    }
    const hash = String((tx as any).hash || "").toLowerCase()
    const bodyOk = typeof (tx as any).body === "object" && (tx as any).body !== null
    const hashOk = /^[0-9a-f]{64}$/.test(hash)
    if (!bodyOk || !hashOk) {
      return res.status(400).json({ ok: false, error: "bad tx: require {hash: 64-hex, body: object}" })
    }
    try { (node.mempool as any).push?.({ ...(tx as any), hash }) } catch {}
    metrics.inc("tx_submitted", 1)
    node.publishJson("void/tx", { ...(tx as any), hash })
    res.json({ ok: true })
  })

  app.get("/mempool", (_req, res) => {
    const txs = (node.mempool as any).peekAll?.() ?? []
    res.json({ ok: true, size: Array.isArray(txs) ? txs.length : 0, txs })
  })

  /* ===================== BLOBS ===================== */
  app.post("/blob/put", async (req, res) => {
    const MAX = MAX_BLOB_MB * 1024 * 1024
    if (typeof (req.body as any)?.text === "string") {
      const buf = Buffer.from((req.body as any).text, "utf8")
      if (buf.length > MAX) return res.json({ ok: false, error: `too large (> ${MAX_BLOB_MB}MB)` })
      const out = await node.putBlobFromBuffer(buf)
      return res.json({ ok: true, ...out })
    }
    if (typeof (req.body as any)?.base64 === "string") {
      const buf = Buffer.from((req.body as any).base64, "base64")
      if (buf.length > MAX) return res.json({ ok: false, error: `too large (> ${MAX_BLOB_MB}MB)` })
      const out = await node.putBlobFromBuffer(buf)
      return res.json({ ok: true, ...out })
    }
    return res.json({ ok: false, error: "send {text} or {base64} JSON" })
  })

  app.get("/blob/stat/:cid", (req, res) => {
    try {
      const cid = String(req.params.cid || "").trim()
      if (!cid) return res.json({ ok: false, error: "missing cid" })
      const b = node.getBlob(cid)
      if (!b) return res.json({ ok: true, present: false })
      res.json({ ok: true, present: true, size: b.length })
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) })
    }
  })

  app.get("/blob/stats", (_req, res) => {
    try {
      const dir = path.join(DATA_DIR, "blobs")
      if (!fs.existsSync(dir)) return res.json({ ok: true, total: 0, pinned: 0, bytes: 0, largest: 0, oldest: null })
      let total = 0, pinned = 0, bytes = 0, largest = 0
      let oldest: null | { cid: string, mtimeMs: number } = null
      let blobPins: Set<string> | null = null
      const pinsPath = path.join(dir, "pins.json")
      if (fs.existsSync(pinsPath)) {
        try { blobPins = new Set(JSON.parse(fs.readFileSync(pinsPath, "utf8"))) } catch {}
      }
      for (const cid of fs.readdirSync(dir)) {
        if (cid === "pins.json") continue
        if (!/^[0-9a-f]{64}$/.test(cid)) continue
        const p = path.join(dir, cid)
        const st = fs.statSync(p)
        total++
        if (blobPins?.has?.(cid)) pinned++
        bytes += st.size
        if (st.size > largest) largest = st.size
        if (!oldest || st.mtimeMs < oldest.mtimeMs) oldest = { cid, mtimeMs: st.mtimeMs }
      }
      res.json({ ok: true, total, pinned, bytes, largest, oldest })
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) })
    }
  })

  /* ===================== PROPOSER / FOLLOWER ===================== */
  app.post("/blocks/start", (req, res) => {
    const intervalMs = Number(req.query.intervalMs || 5000)
    const r = (node as any).startProposer?.(intervalMs) ?? { ok:true, note:"no startProposer(), noop" }
    res.json(r)
  })

  app.post("/follower/start", (req, res) => {
    const peer = String(req.query.peer || "http://127.0.0.1:4100")
    const ms = Number(req.query.intervalMs || 2000)
    syncState.enabled = true
    syncState.peer = peer
    syncState.intervalMs = ms
    syncState.lastErr = null
    const r = node.startFollower(peer, ms, {
      onImportBlock: (b: any) => {
        metrics.inc("blocks_imported", 1)
        if (b?.txs?.length) {
          metrics.inc("tx_indexed", b.txs.length)
          metrics.inc("receipts_appended", b.txs.length)
        }
      }
    })
    res.json(r)
  })

  app.post("/follower/once", async (req, res) => {
    const peer = String(req.query.peer || "http://127.0.0.1:4100")
    try {
      const r = await node.pullOnce(peer, {
        onImportBlock: (b) => {
          metrics.inc("blocks_imported", 1)
          if (b?.txs?.length) {
            metrics.inc("tx_indexed", b.txs.length)
            metrics.inc("receipts_appended", b.txs.length)
          }
        }
      })
      syncState.lastOk = Date.now()
      syncState.lastErr = null
      syncState.lastImported = (r as any)?.imported ?? 0
      syncState.theirHead = (r as any)?.theirHead
      res.json(r)
    } catch (e: any) {
      syncState.lastErr = String(e?.message || e)
      res.status(500).json({ ok: false, error: String(e?.message || e) })
    }
  })

  /* ===================== METRICS ===================== */
  app.get("/metrics", (_req, res) => {
    const head = node.store.loadHeadNumber()
    const peers = [...node.peers.keys()].filter(k => !k.startsWith("?-")).length
    const mempool = (node.mempool as any).peekAll?.().length ?? 0
    res.setHeader("content-type", "text/plain; version=0.0.4; charset=utf-8")
    res.send(metrics.renderText({ peers, mempool, head, peers_known: peersReg.count() }))
  })

  app.listen(HTTP_PORT, () => {
    console.log(`[void-node] http :${HTTP_PORT}`)
    console.log(`[void-node] bootstrap: ${BOOTSTRAP.join(", ") || "(none)"}`)
    try {
      const httpBase = process.env.PUBLIC_HTTP_BASE || `http://127.0.0.1:${HTTP_PORT}`
      const p2pListen = (node.listenAddrs?.[0] || `127.0.0.1:${P2P_PORT}`)
      node.publishJson("void/http", { id: node.id, http: httpBase })
      setInterval(() => {
        node.publishJson("void/http", { id: node.id, http: httpBase })
      }, 10_000).unref?.()
      peersReg.upsert({ id: node.id, http: httpBase, p2p: p2pListen, capabilities: ["blob", "tx", "block"] })
      metrics.gauges.peers_known = peersReg.count()
      console.log(`[peers] self upsert -> id=${node.id} http=${httpBase} p2p=${p2pListen}`)
    } catch {}
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

  // ---- helper to run tsx scripts with timeout ----
  async function runTsxScript(
    scriptRelPath: string,
    opts?: { env?: Record<string, string>, args?: string[], timeoutMs?: number }
  ): Promise<{ ok: boolean; code: number | null; stdout: string; stderr: string; timedOut: boolean }> {
    const timeoutMs = Math.max(1_000, opts?.timeoutMs ?? 60_000)
    const args = [scriptRelPath, ...(opts?.args ?? [])]
    const env = { ...process.env, ...(opts?.env ?? {}) }
    return await new Promise((resolve) => {
      const child = execFile(process.execPath, ["node_modules/.bin/tsx", ...args], { env }, (err, stdout, stderr) => {
        resolve({
          ok: !err,
          code: (err as any)?.code ?? 0,
          stdout: String(stdout ?? ""),
          stderr: String(stderr ?? ""),
          timedOut: false,
        })
      })
      const t = setTimeout(() => {
        try { child.kill("SIGKILL") } catch {}
        resolve({ ok: false, code: null, stdout: "", stderr: "timeout", timedOut: true })
      }, timeoutMs)
      child.on("exit", () => clearTimeout(t))
    })
  }

  // periodic purge of stale peers (every 2 minutes, older than 10 minutes)
  setInterval(() => {
    try {
      const r = peersReg.purgeStale(10 * 60 * 1000)
      if (r.removed) console.log(`[peers] purged ${r.removed}, remaining=${r.remaining}`)
      metrics.gauges.peers_known = peersReg.count()
    } catch {}
  }, 2 * 60 * 1000).unref?.()
}

// __main__
__main__().catch(e => { console.error(e); process.exitCode = 1 })

