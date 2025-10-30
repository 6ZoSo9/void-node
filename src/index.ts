// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import { registerDevRoutes } from "./http/dev_routes.js";              // ok if present; safely wrapped
import { globalEnqueueTx } from "./node_core.js";
import express from "express";
import * as fs from "node:fs";
import * as path from "node:path";
import { execFile } from "node:child_process";

import { autoRepairDataDir } from "./chain/auto_repair.js";
import { SegStore } from "./chain/seg_store.js";
import { Node } from "./node_core.js";
import { blockHash } from "./chain/block.js";
import { buildAllKidx, buildKidxForJsonl, queryKidx } from "./util/kidx.js";
import { PeerRegistry } from "./node_peer_registry.js";
import { loadKeypair } from "./crypto/keypair.js";
import { loadEnv } from "./util/env.js";
import { registerFollowerRoutes } from "./http/follower_routes.js";
import { registerTxRoutes } from "./http/tx_routes.js";
import { registerP2PRoutes } from "./http/p2p_routes.js";
import { registerIndexExtras } from "./http/routes/index_kidx_extras.js";
import { registerBlockExtras } from "./http/blocks_extras.js";
import { Metrics } from "./metrics.js";

// [ADD] global __VOID_asArr (idempotent)
;(function(){
  try{
    const g:any = globalThis as any;
    if (!g.__VOID_asArr) {
      g.__VOID_asArr = function(x:any){
        return Array.isArray(x)
          ? x
          : (x && Array.isArray((x as any).txs) ? (x as any).txs : []);
      };
      console.log("[guard] __VOID_asArr global helper installed");
    }
  }catch(e){ /* ignore */ }
})();
/* ---------------------------- ENV BRIDGE ---------------------------- */
process.env.DATA_DIR  = process.env.DATA_DIR  || process.env.VOID_DATA_DIR  || "data";
process.env.HTTP_PORT = process.env.HTTP_PORT || process.env.VOID_HTTP_PORT || "4100";
process.env.P2P_PORT  = process.env.P2P_PORT  || process.env.VOID_P2P_PORT  || "4700";

/* ----------------------------- Config ------------------------------ */
function firstEnv(...names: string[]): string | undefined {
  for (const n of names) {
    const v = (process.env as any)[n];
    if (v !== undefined && v !== "") return v;
  }
}
function reqInt(names: string[] | string, label: string): number {
  const arr = Array.isArray(names) ? names : [names];
  const raw = firstEnv(...arr);
  if (raw === undefined) throw new Error(`Missing required env: ${label} (${arr.join(" or ")})`);
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`Invalid integer for ${label}: ${raw}`);
  return n;
}
function reqStr(names: string[] | string, label: string): string {
  const arr = Array.isArray(names) ? names : [names];
  const v = firstEnv(...arr);
  if (!v) throw new Error(`Missing required env: ${label} (${arr.join(" or ")})`);
  return v;
}

const DATA_DIR     = reqStr(["VOID_DATA_DIR", "DATA_DIR"], "DATA_DIR");
const HTTP_PORT    = reqInt(["VOID_HTTP_PORT", "HTTP_PORT"], "HTTP_PORT");
const P2P_PORT     = reqInt(["VOID_P2P_PORT", "P2P_PORT"], "P2P_PORT");
const MAX_BLOB_MB  = Number(firstEnv("MAX_BLOB_MB") ?? 8);
const PROTO_VER    = 1;
const ALLOW_EMPTY_BLOCKS = firstEnv("ALLOW_EMPTY_BLOCKS") === "1";

// Accept both BOOTSTRAP and BOOTSTRAP_ADDRS; also merge loadEnv() later.
const BOOTSTRAP_RAW = (firstEnv("BOOTSTRAP_ADDRS", "BOOTSTRAP") || "")
  .split(",").map((s) => s.trim()).filter(Boolean);

// Require a key file path; do not auto-generate
const KEY_PATH = path.resolve(
  reqStr(["NODE_PRIVKEY_PATH", "KEY_FILE", "VOID_NODE_KEY_A"], "node private key path")
);

console.log("[void-node] config", { DATA_DIR, HTTP_PORT, P2P_PORT, KEY_PATH });

/* Optional legacy helper (safe to keep for scripts/tests) */
const __apiSegStore = 
new SegStore(DATA_DIR, { segmentMaxBytes: 8 * 1024 * 1024, sparseEvery: 16 } as any);

/* ------------------------- Top-level main -------------------------- */
async function __main__() {
  /* ===================== METRICS ===================== */
  const metrics = new Metrics();

  // Used for self-advert to others
  let selfAdvert: { httpBase: string; p2pListen: string } = { httpBase: "", p2pListen: "" };

  /* ---------- key file required ---------- */
  if (!fs.existsSync(KEY_PATH)) {
    console.error(
      `[void-node] missing key file: ${KEY_PATH}\n` +
        "  + Set NODE_PRIVKEY_PATH to a readable PEM key (chmod 600) and restart."
    );
    process.exit(1);
  }

  /* ---------- storage auto-repair before touching store ---------- */
  await autoRepairDataDir(DATA_DIR, { sparseEvery: 16 });

  /* ---------- boot node ---------- */
  const kp = loadKeypair(KEY_PATH); // { privateKey, publicKey, nodeId, pubPEM }
  const node = new Node(P2P_PORT, kp, { allowEmptyBlocks: ALLOW_EMPTY_BLOCKS });
// [ADD] expose live node globally for shims/bridges
;(globalThis as any).__void_node = node; (globalThis as any).node = node; (globalThis as any).VOID_NODE = node;
console.log("[shim] published global node (post-construct)");
  await node.start();

  // Optional: if Node exposes onSealed, wire it (harmless if absent)
  if ("onSealed" in (((globalThis as any).__void_node || (globalThis as any).node) as any)) {
    (((globalThis as any).__void_node || (globalThis as any).node) as any).onSealed = (b: any, dt: number) => {
      metrics.inc("blocks_sealed", 1);
      (metrics.gauges as any).last_seal_ms = dt;
      if (Array.isArray(b?.txs)) {
        metrics.inc("tx_indexed", b.txs.length);
        metrics.inc("receipts_appended", b.txs.length);
      }
    };
  }

  const peersReg = new PeerRegistry();

  // Sync peer-registry when HTTP announcements arrive
  ;(((globalThis as any).__void_node || (globalThis as any).node) as any).onHttpAnnounce = ({ id, http }: any) => {
    try {
      if (!id) return;
      peersReg.upsert({ id, http, capabilities: ["blob", "tx", "block"] });
      (metrics.gauges as any).peers_known = peersReg.count();
      if (http && selfAdvert.httpBase && selfAdvert.p2pListen) {
        void upsertRemotePeer(http, (((globalThis as any).__void_node || (globalThis as any).node) as any).id, selfAdvert.httpBase, selfAdvert.p2pListen);
      }
    } catch {}
  };

  /* ---------- bootstrap dialing (placeholder; actual dialing lives in node_core) ---------- */
  const env = loadEnv(); // may include BOOTSTRAP_ADDRS, ports, etc.
  const mergedBootstrap = new Set<string>([...BOOTSTRAP_RAW, ...((env as any).BOOTSTRAP_ADDRS || [])]);
  for (const _a of mergedBootstrap) {
    // dialing handled by Node; we keep env merge here for logging & future hooks
  }

  /* ----------------------------- HTTP ----------------------------- */
  const app = express();
;(globalThis as any).__void_http_app = app; // dev-safe-bundle hook

// [ADD] Object.prototype.filter shim v3 (self-contained, last-writer-wins)
;(function(){
  try{
    Object.defineProperty(Object.prototype, "filter", {
      configurable: true, enumerable: false, writable: true,
      value: function(cb:any, thisArg?:any){
        const fn = (typeof cb === "function") ? cb : (v:any)=>Boolean(v);
        const txs = (this && Array.isArray((this as any).txs)) ? (this as any).txs : undefined;
        if (txs) return txs.filter(fn, thisArg);
        if (Array.isArray(this)) return Array.prototype.filter.call(this, fn, thisArg);
        if (this && typeof (this as any).length === "number")
          return Array.prototype.filter.call(this as any, fn, thisArg);
        return Array.prototype.filter.call([this], fn, thisArg);
      }
    });
    console.log("[guard] Object.prototype.filter shim v3 active");
  }catch(e){ console.warn("[guard] filter shim v3 override failed", e); }
})();
;;;;;app.use(express.json({ limit: "128mb" }));
  // tx routes must come right after body parser
  registerTxRoutes(app);

  // Dev routes (safe if not present)
  try { if (typeof registerDevRoutes === "function") registerDevRoutes(app as any, node as any); } catch {}

  // --- minimal mempool-backed tx submit route (dev only) ---
  const MEMPOOL = path.join(process.env.DATA_DIR || "data", "mempool.jsonl");
  app.post("/tx/submit", async (req, res) => {
    
    
    try { globalEnqueueTx(req.body ?? {}); const q=(globalThis as any).__void_tx_queue; console.log("[route] /tx/submit enq size=%s", Array.isArray(q)?q.length:-1); } catch {}
  try { globalEnqueueTx(req.body ?? {}); } catch {}
  try {
      const tx = req.body && typeof req.body === "object" ? req.body : null;
      if (!tx || typeof tx.data !== "string" || !tx.data.length)
        return res.status(400).json({ ok:false, error:"expected {data:string}" });
      await fs.promises.mkdir(path.dirname(MEMPOOL), { recursive: true });
      await fs.promises.appendFile(MEMPOOL, JSON.stringify({ data: tx.data, ts: Date.now() }) + "\n");
      return res.json({ ok:true });
    } catch (err) {
      return res.status(500).json({ ok:false, error: String((err as any)?.message ?? err) });
    }
  });

  // Mount follower + P2P + KIDX-extra routes
  registerFollowerRoutes(app, node, metrics);
// DUPLICATE DISABLED ->   registerTxRoutes(app);
  registerBlockExtras(app);
  registerP2PRoutes(app as any, node as any);
// DUPLICATE DISABLED -> // DUPLICATE DISABLED -> registerTxRoutes(app);
  registerIndexExtras(app as any, node as any, metrics as any);
// DUPLICATE DISABLED -> // DUPLICATE DISABLED -> registerTxRoutes(app);

  /* ===================== MAINTENANCE ===================== */
  // Convenience: full latest block JSON (robust for jq etc.)
  app.get("/blocks/latest/full", (_req, res) => {
    try {
      const n = (((globalThis as any).__void_node || (globalThis as any).node) as any).store?.loadHeadNumber?.() ?? -1;
      if (n < 0) return res.status(404).json({ ok:false, error:"no blocks" });
      const b = (((globalThis as any).__void_node || (globalThis as any).node) as any).store?.loadBlock?.(n) ?? null;
      if (!b) return res.status(404).json({ ok:false, error:"block not found" });
      return res.json(b);
    } catch (e:any) {
      return res.status(500).json({ ok:false, error: String(e?.message || e) });
    }
  });

  app.get("/maintenance/verify", async (_req, res) => {
    try {
      const r = await runTsxScript("scripts/check_store.ts", {
        env: { DATA_DIR: process.env.DATA_DIR || "data" },
        timeoutMs: 45_000,
      });
      res.json({
        ok: r.ok,
        code: r.code,
        timedOut: r.timedOut,
        summary: r.stdout.split("\n").filter(Boolean).slice(-6),
        stdout: r.stdout,
        stderr: r.stderr,
      });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  app.post("/maintenance/auto-repair", async (req, res) => {
    try {
      const remote = String(req.socket.remoteAddress || "");
      const allowRemote = process.env.ALLOW_REMOTE_REPAIR === "1";
      const isLocal =
        remote === "127.0.0.1" || remote === "::1" || remote.startsWith("::ffff:127.0.0.");
      if (!allowRemote && !isLocal) {
        return res.status(403).json({ ok: false, error: "forbidden (local only by default)" });
      }
      const dry = String(req.query.dryRun || req.query.dry || "") === "1" ? "1" : "0";
      const r = await runTsxScript("scripts/auto_repair.ts", {
        env: { DATA_DIR: process.env.DATA_DIR || "data", DRY_RUN: dry },
        timeoutMs: 5 * 60_000,
      });
      const verify = await runTsxScript("scripts/check_store.ts", {
        env: { DATA_DIR: process.env.DATA_DIR || "data" },
        timeoutMs: 45_000,
      });
      res.json({
        ok: r.ok,
        code: r.code,
        timedOut: r.timedOut,
        repair: { stdout: r.stdout, stderr: r.stderr },
        verify: {
          ok: verify.ok,
          code: verify.code,
          timedOut: verify.timedOut,
          summary: verify.stdout.split("\n").filter(Boolean).slice(-6),
        },
      });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  /* ===================== INDEX MAINTENANCE ===================== */
  app.post("/index/rebuild", async (_req, res) => {
    try {
      res.json(await (((globalThis as any).__void_node || (globalThis as any).node) as any).rebuildTxIndex());
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  app.post("/index/build", async (_req, res) => {
    try {
      res.json(await buildAllKidx(DATA_DIR));
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  app.post("/index/kidx/build", async (_req, res) => {
    try {
      const shards = (((globalThis as any).__void_node || (globalThis as any).node) as any).txIndex.listShards();
      let baseDir = DATA_DIR;
      if (shards.length > 0) {
        const first = shards[0].path;
        baseDir = path.dirname(path.dirname(first)); // <base>/index => dirname(dirname(first))
      }
      const r = await buildAllKidx(baseDir);
      res.json(r);
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  app.get("/index/stats", (_req, res) => {
    const shards = (((globalThis as any).__void_node || (globalThis as any).node) as any).txIndex.listShards().map((s: any) => {
      const jsonlStat = fs.existsSync(s.path) ? fs.statSync(s.path) : null;
      const kidxPath = s.path.replace(/\.jsonl$/, ".kidx");
      const kidxStat = fs.existsSync(kidxPath) ? fs.statSync(kidxPath) : null;
      const lines = countLinesQuick(s.path);
      return {
        from: s.from,
        to: s.to,
        jsonl: { path: s.path, bytes: jsonlStat?.size ?? 0, lines },
        kidx: { path: kidxPath, bytes: kidxStat?.size ?? 0, present: !!kidxStat },
      };
    });
    res.json({ ok: true, shards });
  });

  app.post("/index/gc", (req, res) => {
    const keepLast = Number(req.query.keepLast || 1);
    try {
      res.json((((globalThis as any).__void_node || (globalThis as any).node) as any).txIndex.gc(keepLast));
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  app.post("/index/kidx/rebuild-shard", async (req, res) => {
    const blockParam = req.query.block;
    const hashParam = req.query.hash;
    try {
      if (blockParam !== undefined) {
        const bn = Number(blockParam);
        if (!Number.isFinite(bn) || bn < 0) return res.json({ ok: false, error: "bad block" });
        const shard = (((globalThis as any).__void_node || (globalThis as any).node) as any).txIndex.shardForBlock(bn);
        await buildKidxForJsonl(shard.path);
        return res.json({
          ok: true,
          shard: { from: shard.from, to: shard.to },
          kidx: shard.path.replace(/\.jsonl$/, ".kidx"),
        });
      } else if (typeof hashParam === "string") {
        const hash = String(hashParam).toLowerCase();
        if (!/^[0-9a-f]{64}$/.test(hash)) return res.json({ ok: false, error: "bad hash" });
        const shards = (((globalThis as any).__void_node || (globalThis as any).node) as any).txIndex.listShards().sort((a: any, b: any) => b.from - a.from);
        for (const s of shards) {
          const kidxPath = s.path.replace(/\.jsonl$/, ".kidx");
          if (fs.existsSync(kidxPath)) {
            const hit = queryKidx(kidxPath, hash);
            if (hit.found) {
              await buildKidxForJsonl(s.path);
              return res.json({ ok: true, shard: { from: s.from, to: s.to }, kidx: kidxPath });
            }
            const r2 = (((globalThis as any).__void_node || (globalThis as any).node) as any).txIndex.lookupInShard(s.path, hash);
            if (r2.found) {
              await buildKidxForJsonl(s.path);
              return res.json({
                ok: true,
                shard: { from: s.from, to: s.to },
                kidx: s.path.replace(/\.jsonl$/, ".kidx"),
              });
            }
            continue;
          }
          const r = (((globalThis as any).__void_node || (globalThis as any).node) as any).txIndex.lookupInShard(s.path, hash);
          if (r.found) {
            await buildKidxForJsonl(s.path);
            return res.json({
              ok: true,
              shard: { from: s.from, to: s.to },
              kidx: s.path.replace(/\.jsonl$/, ".kidx"),
            });
          }
        }
        return res.json({ ok: false, error: "hash not found" });
      }
      return res.json({ ok: false, error: "provide block or hash" });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  app.post("/index/kidx/rebuild-hash", async (req, res) => {
    try {
      const hash = String(req.query.hash || "").toLowerCase();
      if (!/^[0-9a-f]{64}$/.test(hash)) return res.json({ ok: false, error: "bad hash" });

      const shards = (((globalThis as any).__void_node || (globalThis as any).node) as any).txIndex.listShards().sort((a: any, b: any) => b.from - a.from);
      for (const s of shards) {
        const kidxPath = s.path.replace(/\.jsonl$/, ".kidx");
        if (fs.existsSync(kidxPath)) {
          const hit = queryKidx(kidxPath, hash);
          if (hit.found) {
            await buildKidxForJsonl(s.path);  // refresh
            return res.json({ ok: true, shard: { from: s.from, to: s.to }, kidx: kidxPath });
          }
        }
        const r = (((globalThis as any).__void_node || (globalThis as any).node) as any).txIndex.lookupInShard(s.path, hash);
        if (r.found) {
          await buildKidxForJsonl(s.path);
          return res.json({ ok: true, shard: { from: s.from, to: s.to }, kidx: s.path.replace(/\.jsonl$/, ".kidx") });
        }
      }
      return res.json({ ok: false, error: "hash not found in any shard" });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  /* ===================== HEALTH / PEERS ===================== */
  app.get(["/health", "/api/health"], (_req, res) => {
    res.json({
      ok: true,
      proto: PROTO_VER,
      nodeId: (((globalThis as any).__void_node || (globalThis as any).node) as any).id,
      http: HTTP_PORT,
      p2p: P2P_PORT,
      peers: [...(((globalThis as any).__void_node || (globalThis as any).node) as any).peers.keys()].filter((k: string) => !k.startsWith("?-")),
      listen: (((globalThis as any).__void_node || (globalThis as any).node) as any).listenAddrs,
    });
  });

  app.get(["/head", "/api/head"], (_req, res) => {
    res.json({ ok: true, head: (((globalThis as any).__void_node || (globalThis as any).node) as any).store.loadHeadNumber() });
  });

  app.get("/peers", (_req, res) => res.json({ ok: true, ...(((globalThis as any).__void_node || (globalThis as any).node) as any).peersSnapshot?.() }));

  /* Peer registry QoL */
  app.get("/peers/registry", (_req, res) => {
    try {
      res.json({ ok: true, peers: peersReg.all() });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  app.post("/peers/registry/upsert", (req, res) => {
    try {
      const id = String(req.body?.id || "");
      if (!id) return res.json({ ok: false, error: "missing id" });
      const http = typeof req.body?.http === "string" ? req.body.http : undefined;
      const p2p = typeof req.body?.p2p === "string" ? req.body.p2p : undefined;
      const caps = Array.isArray(req.body?.capabilities) ? req.body.capabilities : undefined;
      const r = peersReg.upsert({ id, http, p2p, capabilities: caps });
      (metrics.gauges as any).peers_known = peersReg.count();
      res.json({ ok: true, peer: r });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  app.post("/peers/registry/announce-self", async (_req, res) => {
    try {
      const peers = peersReg.all();
      let sent = 0;
      for (const p of peers) {
        if (!p?.http) continue;
        await upsertRemotePeer(p.http, (((globalThis as any).__void_node || (globalThis as any).node) as any).id, selfAdvert.httpBase, selfAdvert.p2pListen);
        sent++;
      }
      res.json({ ok: true, sent, http: selfAdvert.httpBase, p2p: selfAdvert.p2pListen });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  app.post("/peers/registry/purge", (req, res) => {
    try {
      const maxAgeSec = Number(req.query.maxAgeSec || 600);
      const r = peersReg.purgeStale(Math.max(1, maxAgeSec) * 1000);
      (metrics.gauges as any).peers_known = peersReg.count();
      res.json(r);
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  app.get("/peers/registry/ids", (_req, res) => {
    try {
      res.json(peersReg.all().map((p) => p.id));
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  app.delete("/peers/registry/:id", (req, res) => {
    try {
      const id = String(req.params.id || "");
      const r = peersReg.remove(id);
      res.json({ ok: true, removed: r.removed, remaining: r.remaining });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  /* ===================== BLOCKS ===================== */
  app.get("/blocks/head", (_req, res) => {
    const n = (((globalThis as any).__void_node || (globalThis as any).node) as any).store.loadHeadNumber();
    const b = (((globalThis as any).__void_node || (globalThis as any).node) as any).store.loadBlock(n);
    if (!b) return res.json({ ok: true, head: -1 });
    res.json({ ok: true, head: n, hash: blockHash(b) });
  });

  app.get("/blocks/get/:number", (req, res) => {
    const n = Number(req.params.number);
    if (!Number.isFinite(n) || n < 0) return res.status(400).json({ ok: false, error: "bad number" });
    const b = (((globalThis as any).__void_node || (globalThis as any).node) as any).store.loadBlock(n);
    if (!b) return res.status(404).json({ ok: false, error: "not found" });
    res.json(b);
  });

  app.get("/blocks/range", (req, res) => {
    const from = Number(req.query.from ?? 0);
    const to = Number(req.query.to ?? (((globalThis as any).__void_node || (globalThis as any).node) as any).store.loadHeadNumber());
    if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to < from) {
      return res.status(400).json({ ok: false, error: "bad range" });
    }
    try {
      const blocks: any[] = [];
      for (let i = from; i <= to; i++) {
        const b = (((globalThis as any).__void_node || (globalThis as any).node) as any).store.loadBlock(i);
        if (b) blocks.push(b);
      }
      res.json(blocks);
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  /* Bulk block import (follower) */
  app.post("/blocks/import", async (req, res) => {
    try {
      const arr = Array.isArray(req.body) ? req.body : [];
      if (!arr.length) return res.json({ ok: true, imported: 0, alreadyHad: 0, filled: 0, kidxRebuilt: 0 });

      const touched = new Set<string>();
      let imported = 0, alreadyHad = 0, filled = 0;

      for (const b of arr) {
        const n = Number(b?.number);
        if (!Number.isFinite(n)) continue;

        const existing = (((globalThis as any).__void_node || (globalThis as any).node) as any).store.loadBlock(n);
        const incomingHasTxs = Array.isArray(b?.txs) && b.txs.length > 0;
        const existingHasTxs = Array.isArray(existing?.txs) && existing.txs.length > 0;

        if (!existing) {
          (((globalThis as any).__void_node || (globalThis as any).node) as any).store.saveBlock(b);
          imported++;
          if (incomingHasTxs) {
            const refs = b.txs.map((tx: any, i: number) => ({ h: tx.hash.toLowerCase(), n: b.number, o: i }));
            ;(((globalThis as any).__void_node || (globalThis as any).node) as any).txIndex.putMany(refs);
            metrics.inc("tx_indexed", b.txs.length);
            const anyReceipts: any = (((globalThis as any).__void_node || (globalThis as any).node) as any).receipts;
            const recs = b.txs.map((tx: any, i: number) => ({
              h: tx.hash.toLowerCase(), n: b.number, o: i, ts: b.timestamp ?? Date.now(),
            }));
            if (typeof anyReceipts.appendMany === "function") await anyReceipts.appendMany(recs);
            else if (typeof anyReceipts.append === "function") for (const r2 of recs) await anyReceipts.append(r2);
            metrics.inc("receipts_appended", recs.length);
            const shard = (((globalThis as any).__void_node || (globalThis as any).node) as any).txIndex.shardForBlock(b.number);
            touched.add(shard.path);
          }
          continue;
        }

        if (!existingHasTxs && incomingHasTxs) {
          const merged = { ...existing, ...b, txs: b.txs };
          (((globalThis as any).__void_node || (globalThis as any).node) as any).store.saveBlock(merged);
          filled++;
          metrics.inc("blocks_filled", 1);
          const refs = b.txs.map((tx: any, i: number) => ({ h: tx.hash.toLowerCase(), n: b.number, o: i }));
          ;(((globalThis as any).__void_node || (globalThis as any).node) as any).txIndex.putMany(refs);
          metrics.inc("tx_indexed", b.txs.length);
          const anyReceipts: any = (((globalThis as any).__void_node || (globalThis as any).node) as any).receipts;
          const recs = b.txs.map((tx: any, i: number) => ({
            h: tx.hash.toLowerCase(), n: b.number, o: i, ts: b.timestamp ?? Date.now(),
          }));
          if (typeof anyReceipts.appendMany === "function") await anyReceipts.appendMany(recs);
          else if (typeof anyReceipts.append === "function") for (const r3 of recs) await anyReceipts.append(r3);
          metrics.inc("receipts_appended", recs.length);
          const shard = (((globalThis as any).__void_node || (globalThis as any).node) as any).txIndex.shardForBlock(b.number);
          touched.add(shard.path);
          continue;
        }

        alreadyHad++;
      }

      let kidxRebuilt = 0;
      for (const p of touched) {
        try { await buildKidxForJsonl(p); kidxRebuilt++; } catch {}
      }
      return res.json({ ok: true, imported, alreadyHad, filled, kidxRebuilt });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  /* -------- Proposer controls -------- */
  app.post("/blocks/stop", (_req, res) => {
    try {
      const r = ( (((globalThis as any).__void_node || (globalThis as any).node) as any).stopProposer?.() ) ?? ({ ok: true, note: "no stopProposer(), noop" } as any);
      res.json(r || { ok: true });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  app.post("/blocks/once", async (req, res) => {
    try {
      const t0 = Date.now();
      const allowEmptyOnce = String(req.query.allowEmpty || req.query.empty || "0") === "1";

      // HARD GUARD: refuse empty seals unless explicitly allowed
      const mp = (((((globalThis as any).__void_node || (globalThis as any).node) as any).mempool?.peekAll?.()) ?? []);
      if (!allowEmptyOnce && !ALLOW_EMPTY_BLOCKS && mp.length === 0) {
        return res.json({ ok: false, error: "no txs in mempool (set allowEmpty=1 to force)" });
      }

      // Preferred: direct method if available
      if (typeof (((globalThis as any).__void_node || (globalThis as any).node) as any).sealBlock === "function") {
        const r = await (((globalThis as any).__void_node || (globalThis as any).node) as any).sealBlock({ allowEmptyOnce });
        return res.json({ ...r, ms: Date.now() - t0, via: "node.sealBlock" });
      }

      // Fallback: one-shot proposer script
      const r = await runTsxScript("scripts/dev_proposer.ts", {
        env: { DATA_DIR, ALLOW_EMPTY_ONCE: allowEmptyOnce ? "1" : "0" },
        timeoutMs: 60_000,
      });
      return res.json({
        ok: r.ok,
        ms: Date.now() - t0,
        via: "scripts/dev_proposer.ts",
        summary: r.stdout.split("\n").filter(Boolean).slice(-6),
      });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  /* ===================== TX / RECEIPTS ===================== */
  const __kidxRebuildInFlight = new Set<string>();
  async function rebuildKidxOnce(p: string){
    if (__kidxRebuildInFlight.has(p)) return false;
    __kidxRebuildInFlight.add(p);
    try {
      metrics.inc("kidx_missing_rebuilds", 1);
      await buildKidxForJsonl(p);
      console.log("[kidx] rebuilt-once", p);
      return true;
    } finally {
      __kidxRebuildInFlight.delete(p);
    }
  }

  app.get("/tx/lookup", async (req, res) => {
    const hash = String(req.query.hash || "").toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(hash)) return res.json({ ok: false, error: "bad hash" });

    const shards = (((globalThis as any).__void_node || (globalThis as any).node) as any).txIndex.listShards().sort((a: any, b: any) => b.from - a.from);
    for (const s of shards) {
      const kidxPath = s.path.replace(/\.jsonl$/, ".kidx");

      if (fs.existsSync(kidxPath)) {
        const hit = queryKidx(kidxPath, hash);
        if (hit.found) {
          const blk = (((globalThis as any).__void_node || (globalThis as any).node) as any).store.loadBlock(hit.n!);
          if (!blk) return res.json({ ok: false, error: "block not found (stale index?)" });
          const tx = (blk as any).txs?.[hit.o!];
          return res.json({ ok: true, found: true, block: hit.n, offset: hit.o, tx });
        }
        const r2 = (((globalThis as any).__void_node || (globalThis as any).node) as any).txIndex.lookupInShard(s.path, hash);
        if (r2.found) {
          const blk = (((globalThis as any).__void_node || (globalThis as any).node) as any).store.loadBlock(r2.n);
          if (!blk) return res.json({ ok: false, error: "block not found (stale index?)" });
          const tx = (blk as any).txs?.[r2.o];
          try { metrics.inc("kidx_stale_rebuilds", 1); await rebuildKidxOnce(s.path); } catch {}
          return res.json({ ok: true, found: true, block: r2.n, offset: r2.o, tx });
        }
        continue;
      }

      const r = (((globalThis as any).__void_node || (globalThis as any).node) as any).txIndex.lookupInShard(s.path, hash);
      if (r.found) {
        const blk = (((globalThis as any).__void_node || (globalThis as any).node) as any).store.loadBlock(r.n);
        if (!blk) return res.json({ ok: false, error: "block not found (stale index?)" });
        const tx = (blk as any).txs?.[r.o];
        try { metrics.inc("kidx_missing_rebuilds", 1); await rebuildKidxOnce(s.path); } catch {}
        return res.json({ ok: true, found: true, block: r.n, offset: r.o, tx });
      }
    }
    return res.json({ ok: true, found: false });
  });

  app.get("/tx/receipt", (req, res) => {
    const hash = String(req.query.hash || "").toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(hash)) return res.json({ ok: false, error: "bad hash" });
    const r: any = (((globalThis as any).__void_node || (globalThis as any).node) as any).receipts.get(hash);
    if (!r?.found) return res.json({ ok: true, found: false });
    const { n, o, ts } = r;
    res.json({ ok: true, found: true, n, o, ts });
  });

  app.get("/tx/status", (req, res) => {
    const hash = String(req.query.hash || "").toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(hash)) return res.json({ ok: false, error: "bad hash" });
    try {
      const txs = (((globalThis as any).__void_node || (globalThis as any).node) as any).mempool?.peekAll?.() ?? [];
      if (Array.isArray(txs) && txs.some((t: any) => String(t?.hash || "").toLowerCase() === hash)) {
        return res.json({ ok: true, status: "pending" });
      }
    } catch {}
    const r: any = (((globalThis as any).__void_node || (globalThis as any).node) as any).receipts.get(hash);
    if (r && r.found) {
      const { n, o, ts } = r;
      return res.json({ ok: true, status: "confirmed", n, o, ts });
    }
    return res.json({ ok: true, status: "unknown" });
  });

  app.get("/receipts/stats", (_req, res) => {
    const s = ( (((globalThis as any).__void_node || (globalThis as any).node) as any).receipts?.stats?.() ) ?? ({ shards: [], totalBytes: 0, totalLines: 0 } as any);
    res.json({ ok: true, ...s });
  });

  app.post("/receipts/gc", (req, res) => {
    const keepLast = Number(req.query.keepLast || 1);
    try {
      const r =
        ( (((globalThis as any).__void_node || (globalThis as any).node) as any).receipts?.gc?.(keepLast) ) ??
        ({ ok: true, keepLast, removed: 0, kept: 0 } as any);
      res.json(r);
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  /* ===================== MEMPOOL / TX SUBMIT ===================== */
  app.get("/mempool/count", (_req, res) => {
    try {
      const txs = (((globalThis as any).__void_node || (globalThis as any).node) as any).mempool?.peekAll?.() ?? [];
      res.json({ ok: true, count: Array.isArray(txs) ? txs.length : 0 });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  app.post("/tx", (req, res) => {
    const tx = req.body;
    if (!tx || typeof tx !== "object") {
      return res.status(400).json({ ok: false, error: "validation failed: not an object" });
    }
    const hash = String((tx as any).hash || "").toLowerCase();
    const bodyOk = typeof (tx as any).body === "object" && (tx as any).body !== null;
    const hashOk = /^[0-9a-f]{64}$/.test(hash);
    if (!bodyOk || !hashOk) {
      return res.status(400).json({ ok: false, error: "bad tx: require {hash: 64-hex, body: object}" });
    }
    try {
      (((globalThis as any).__void_node || (globalThis as any).node) as any).mempool?.push?.({ ...(tx as any), hash });
    } catch {}
    metrics.inc("tx_submitted", 1);
    (((globalThis as any).__void_node || (globalThis as any).node) as any).publishJson("void/tx", { ...(tx as any), hash });
    res.json({ ok: true });
  });

  app.get("/mempool", (_req, res) => {
    const txs = (((globalThis as any).__void_node || (globalThis as any).node) as any).mempool?.peekAll?.() ?? [];
    res.json({ ok: true, size: Array.isArray(txs) ? txs.length : 0, txs });
  });

  /* ===================== BLOBS ===================== */
  app.post("/blob/put", async (req, res) => {
    const MAX = MAX_BLOB_MB * 1024 * 1024;
    if (typeof (req.body as any)?.text === "string") {
      const buf = Buffer.from((req.body as any).text, "utf8");
      if (buf.length > MAX) return res.json({ ok: false, error: `too large (> ${MAX_BLOB_MB}MB)` });
      const out = await (((globalThis as any).__void_node || (globalThis as any).node) as any).putBlobFromBuffer(buf);
      return res.json({ ok: true, ...out });
    }
    if (typeof (req.body as any)?.base64 === "string") {
      const buf = Buffer.from((req.body as any).base64, "base64");
      if (buf.length > MAX) return res.json({ ok: false, error: `too large (> ${MAX_BLOB_MB}MB)` });
      const out = await (((globalThis as any).__void_node || (globalThis as any).node) as any).putBlobFromBuffer(buf);
      return res.json({ ok: true, ...out });
    }
    return res.json({ ok: false, error: "send {text} or {base64} JSON" });
  });

  app.get("/blob/stat/:cid", (req, res) => {
    try {
      const cid = String(req.params.cid || "").trim();
      if (!cid) return res.json({ ok: false, error: "missing cid" });
      const b = (((globalThis as any).__void_node || (globalThis as any).node) as any).getBlob(cid);
      if (!b) return res.json({ ok: true, present: false });
      res.json({ ok: true, present: true, size: b.length });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  app.get("/blob/stats", (_req, res) => {
    try {
      const dir = path.join(DATA_DIR, "blobs");
      if (!fs.existsSync(dir))
        return res.json({ ok: true, total: 0, pinned: 0, bytes: 0, largest: 0, oldest: null });
      let total = 0, pinned = 0, bytes = 0, largest = 0;
      let oldest: null | { cid: string; mtimeMs: number } = null;
      let blobPins: Set<string> | null = null;
      const pinsPath = path.join(dir, "pins.json");
      if (fs.existsSync(pinsPath)) {
        try {
          blobPins = new Set(JSON.parse(fs.readFileSync(pinsPath, "utf8")));
        } catch {}
      }
      for (const cid of fs.readdirSync(dir)) {
        if (cid === "pins.json") continue;
        if (!/^[0-9a-f]{64}$/.test(cid)) continue;
        const p = path.join(dir, cid);
        const st = fs.statSync(p);
        total++;
        if (blobPins?.has?.(cid)) pinned++;
        bytes += st.size;
        if (st.size > largest) largest = st.size;
        if (!oldest || st.mtimeMs < oldest.mtimeMs) oldest = { cid, mtimeMs: st.mtimeMs };
      }
      res.json({ ok: true, total, pinned, bytes, largest, oldest });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  /* ===================== METRICS TEXT ===================== */
  app.get("/metrics", (_req, res) => {
    const head = (((globalThis as any).__void_node || (globalThis as any).node) as any).store.loadHeadNumber();
    const peers = [...(((globalThis as any).__void_node || (globalThis as any).node) as any).peers.keys()].filter((k: string) => !k.startsWith("?-")).length;
    const mempool = (((((globalThis as any).__void_node || (globalThis as any).node) as any).mempool?.peekAll?.() ) || []).length;
    res.setHeader("content-type", "text/plain; version=0.0.4; charset=utf-8");
    res.send(metrics.renderText({ peers, mempool, head, peers_known: peersReg.count() }));
  });

  app.listen(HTTP_PORT, () => {
    console.log(`[void-node] http :${HTTP_PORT}`);
    console.log(`[void-node] bootstrap: ${[...mergedBootstrap].join(", ") || "(none)"}`);
    try {
      const httpBase = process.env.PUBLIC_HTTP_BASE || `http://127.0.0.1:${HTTP_PORT}`;
      const p2pListen = ( (((globalThis as any).__void_node || (globalThis as any).node) as any).listenAddrs?.[0] ) || `127.0.0.1:${P2P_PORT}`;

      selfAdvert.httpBase = httpBase;
      selfAdvert.p2pListen = p2pListen;

      (((globalThis as any).__void_node || (globalThis as any).node) as any).publishJson("void/http", { id: (((globalThis as any).__void_node || (globalThis as any).node) as any).id, http: httpBase });
      setInterval(() => {
        (((globalThis as any).__void_node || (globalThis as any).node) as any).publishJson("void/http", { id: (((globalThis as any).__void_node || (globalThis as any).node) as any).id, http: httpBase });
      }, 10_000).unref?.();

      peersReg.upsert({
        id: (((globalThis as any).__void_node || (globalThis as any).node) as any).id,
        http: httpBase,
        p2p: p2pListen,
        capabilities: ["blob", "tx", "block"],
      });
      (metrics.gauges as any).peers_known = peersReg.count();
      console.log(`[peers] self upsert -> id=${(((globalThis as any).__void_node || (globalThis as any).node) as any).id} http=${httpBase} p2p=${p2pListen}`);

      // periodic announce-upsert to known peers
      setInterval(() => {
        try {
          const peers = peersReg.all();
          for (const p of peers) {
            if (!p?.http) continue;
            void upsertRemotePeer(p.http, (((globalThis as any).__void_node || (globalThis as any).node) as any).id, selfAdvert.httpBase, selfAdvert.p2pListen);
          }
        } catch {}
      }, 30_000).unref?.();
    } catch {}
  });

  /* --------------------------- utilities -------------------------- */
  function countLinesQuick(p: string): number {
    try {
      const buf = fs.readFileSync(p);
      let n = 0;
      for (let i = 0; i < buf.length; i++) if (buf[i] === 0x0a) n++;
      return n;
    } catch {
      return 0;
    }
  }

  async function upsertRemotePeer(
    remoteHttpBase: string,
    myId: string,
    myHttp: string,
    myP2p: string,
    capabilities: string[] = ["blob", "tx", "block"]
  ): Promise<void> {
    try {
      const url = new URL("/peers/registry/upsert", remoteHttpBase).toString();
      await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: myId, http: myHttp, p2p: myP2p, capabilities }),
      });
    } catch {}
  }

  async function runTsxScript(
    scriptRelPath: string,
    opts?: { env?: Record<string, string>; args?: string[]; timeoutMs?: number }
  ): Promise<{ ok: boolean; code: number | null; stdout: string; stderr: string; timedOut: boolean }> {
    const timeoutMs = Math.max(1_000, opts?.timeoutMs ?? 60_000);
    const args = [scriptRelPath, ...(opts?.args ?? [])];
    const envp = { ...process.env, ...(opts?.env ?? {}) };
    return await new Promise((resolve) => {
      const child = execFile(
        process.execPath,
        ["node_modules/.bin/tsx", ...args],
        { env: envp },
        (err, stdout, stderr) => {
          resolve({
            ok: !err,
            code: (err as any)?.code ?? 0,
            stdout: String(stdout ?? ""),
            stderr: String(stderr ?? ""),
            timedOut: false,
          });
        }
      );
      const t = setTimeout(() => {
        try { child.kill("SIGKILL"); } catch {}
        resolve({ ok: false, code: null, stdout: "", stderr: "timeout", timedOut: true });
      }, timeoutMs);
      child.on("exit", () => clearTimeout(t));
    });
  }

  // periodic purge of stale peers (every 2 minutes, older than 10 minutes)
  setInterval(() => {
    try {
      const r = peersReg.purgeStale(10 * 60 * 1000);
      if (r.removed) console.log(`[peers] purged ${r.removed}, remaining=${r.remaining}`);
      (metrics.gauges as any).peers_known = peersReg.count();
    } catch {}
  }, 2 * 60 * 1000).unref?.();
}

/* ------------------------------ run ------------------------------- */
__main__().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});


// ---------------- Temporary diagnostics: mempool size ----------------
import type {} from "express"; // type-only safety; no runtime impact

(function attachMempoolSizeRoutes(){
  try {
    // Note: we only read the global queue; no side effects.
    const getSize = () => {
      const q = (globalThis as any).__void_tx_queue;
      return Array.isArray(q) ? q.length : 0;
    };

    // Express is the default server in this file; locate the 'app' via global or closure.
    // If 'app' is not in scope, we stored it earlier on globalThis (fallback below).
    const appAny: any = (globalThis as any).__void_http_app || (globalThis as any).app || undefined;
    if (!appAny || typeof appAny.get !== "function") {
      console.warn("[diag] mempool size routes not attached (no app handle)");
      return;
    }

    appAny.get("/mempool/global/size", (_req: any, res: any) => {
      res.type("text/plain").send(String(getSize()));
    });

    appAny.get("/mempool/global/size.json", (_req: any, res: any) => {
      res.json({ size: getSize() });
    });

    console.log("[diag] attached /mempool/global/size(.json)");
  } catch (e) {
    console.warn("[diag] failed to attach mempool size routes:", e);
  }
})();

// ---------------- Temporary diagnostics: latest block number ----------------
(function attachLatestNumber(){
  try {
    const appAny: any = (globalThis as any).__void_http_app || (globalThis as any).app || undefined;
    if (!appAny || typeof appAny.get !== "function") return;

    appAny.get("/blocks/latest/number", async (_req: any, res: any) => {
      try {
        // Reuse the public API you already expose:
        const r = await fetch(`http://127.0.0.1:${process.env.HTTP_PORT || 4100}/blocks/latest/full`);
        const full = await r.json();
        const n = (full && typeof full.number === "number") ? full.number : -1;
        if (n < 0) return res.status(404).json({ error: "latest number unavailable" });
        res.type("text/plain").send(String(n));
      } catch (e:any) {
        res.status(500).json({ error: String(e?.message || e) });
      }
    });

    console.log("[diag] attached /blocks/latest/number");
  } catch {}
})();

// ---------------- Temporary diagnostics: latest block number ----------------
(function attachLatestNumber(){
  try {
    const appAny = (globalThis as any).__void_http_app;
    if (!appAny || typeof appAny.get !== "function") return;

    // @ts-ignore - dev shim route, loose types
    appAny.get("/blocks/latest/number", async (_req, res) => {
      try {
        const r = await fetch(`http://127.0.0.1:${process.env.HTTP_PORT || 4100}/blocks/latest/full`);
        const full = await r.json();
        const n = (full && typeof full.number === "number") ? full.number : -1;
        if (n < 0) return res.status(404).json({ error: "latest number unavailable" });
        res.type("text/plain").send(String(n));
      } catch (e) {
        res.status(500).json({ error: String((e as any)?.message || e) });
      }
    });

    console.log("[diag] attached /blocks/latest/number");
  } catch {}
})();

// ---------------- Late-bound diagnostics (attach when app exists) ----------------
(function lateAttachDiag(){
  let tries = 0;
  let attached = false;

  function getApp(): any {
    return (globalThis as any).__void_http_app || (globalThis as any).app || undefined;
  }

  function attach() {
    const appAny = getApp();
    if (!appAny || typeof appAny.get !== "function") {
      // Retry up to ~30s total (60 * 500ms) without being noisy
      if (++tries < 60) return setTimeout(attach, 500);
      console.warn("[diag] mempool routes not attached (no app handle after retries)");
      return;
    }
    if (attached) return;
    attached = true;

    const getSize = () => {
      const q = (globalThis as any).__void_tx_queue;
      return Array.isArray(q) ? q.length : 0;
    };

    appAny.get("/mempool/global/size", (_req: any, res: any) => {
      res.type("text/plain").send(String(getSize()));
    });

    appAny.get("/mempool/global/size.json", (_req: any, res: any) => {
      res.json({ size: getSize() });
    });

    appAny.get("/blocks/latest/number", async (_req: any, res: any) => {
      try {
        const r = await fetch(`http://127.0.0.1:${process.env.HTTP_PORT || 4100}/blocks/latest/full`);
        const full = await r.json();
        const n = (full && typeof full.number === "number") ? full.number : -1;
        if (n < 0) return res.status(404).json({ error: "latest number unavailable" });
        res.type("text/plain").send(String(n));
      } catch (e:any) {
        res.status(500).json({ error: String(e?.message || e) });
      }
    });

    console.log("[diag] attached /mempool/global/size(.json), /blocks/latest/number (late)");
  }

  // Kick off the first attempt (next tick)
  setTimeout(attach, 0);
})();

// --- JSON-only error surface (additive; last middleware) ---
(function enforceJsonErrors(){
  const appAny: any = (globalThis as any).__void_http_app;
  if (!appAny || typeof appAny.use !== "function") return;

  // 404 JSON fallback
  appAny.use((req: any, res: any, next: any) => {
    if (res.headersSent) return next();
  });

  // 500 JSON fallback
  appAny.use((err: any, _req: any, res: any, _next: any) => {
    try {
      const msg = (err && (err.message||String(err))) || "internal_error";
      res.status(500).json({ ok:false, error: msg });
    } catch {
      res.status(500).json({ ok:false, error: "internal_error" });
    }
  });
})();

// ---------------- Late-bound helpers: /tx/ping and /mempool/global/peek ------
(function lateAttachHelpers(){
  let tries = 0, attached = false;

  function getApp(): any {
    return (globalThis as any).__void_http_app || (globalThis as any).app || undefined;
  }

  async function sha256Hex(s: string): Promise<string> {
    // Dynamic import avoids top-level import churn
    const { createHash } = await import("node:crypto");
    return createHash("sha256").update(s).digest("hex");
    // If Node <18 or crypto import fails in your env, we can fall back to a tiny JS hash.
  }

  async function attach() {
    const appAny = getApp();
    if (!appAny || typeof appAny.get !== "function") {
      if (++tries < 60) return setTimeout(attach, 500);
      console.warn("[diag] helpers not attached (no app handle after retries)");
      return;
    }
    if (attached) return; attached = true;

    // --- /mempool/global/peek?max=10 (read-only)
    appAny.get("/mempool/global/peek", (req: any, res: any) => {
      const max = Math.max(0, Math.min(+(req.query?.max ?? 10), 100));
      const q = (globalThis as any).__void_tx_queue;
      const arr = Array.isArray(q) ? q.slice(0, max) : [];
      // Try to normalize a bit, but don't assume shape
      const view = arr.map((t: any, i: number) => {
        if (t && typeof t === "object") {
          const out: any = {};
          if ("hash" in t) out.hash = t.hash;
          if ("body" in t) out.body = t.body;
          if (!("hash" in out) && !("body" in out)) out.value = t;
          out.idx = i;
          return out;
        }
        return { idx: i, value: t };
      });
      res.json({ size: Array.isArray(q) ? q.length : 0, peek: view });
    });

    // --- /tx/ping  (enqueue a deterministic ping body and return its hash)
    appAny.post("/tx/ping", async (_req: any, res: any) => {
      try {
        const now = Date.now();
        const nonce = Math.floor(Math.random() * 1e9);
        const body = { kind: "ping", ts: now, nonce, note: "void-node ping" };
        const hash = await sha256Hex(JSON.stringify(body));
        const port = process.env.HTTP_PORT || 4100;

        // Reuse your existing /tx/submit route (no secret queue poking)
        const r = await fetch(`http://127.0.0.1:${port}/tx/submit`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ data: body })
        });
        const submit = await r.json().catch(() => ({ ok:false, error:"non-json submit" }));

        res.json({ ok: true, hash, body, submit });
      } catch (e: any) {
        res.status(500).json({ ok:false, error: String(e?.message || e) });
      }
    });

    console.log("[diag] attached helpers: /mempool/global/peek, /tx/ping");
  }

  attach();
})();

// ---------------- Late-bound helper: /tx/ping/verify?window=20 --------------
(function lateAttachPingVerify(){
  let tries = 0, attached = false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app || undefined; }
  function attach(){
    const appAny = getApp();
    if (!appAny || typeof appAny.get !== "function") { if(++tries<60) return setTimeout(attach,500); return; }
    if(attached) return; attached = true;

    appAny.get("/tx/ping/verify", async (req: any, res: any) => {
      try {
        const win = Math.max(1, Math.min(+((req.query||{}).window ?? 20), 200));
        const port = process.env.HTTP_PORT || 4100;
        const latest = await fetch(`http://127.0.0.1:${port}/blocks/latest/full`).then(r=>r.json()).then(j=>j?.number ?? -1);
        if (latest < 0) return res.status(404).json({ ok:false, error:"latest unavailable" });
        const from = Math.max(0, latest - win);
        const blocks = await fetch(`http://127.0.0.1:${port}/blocks/range?from=${from}&to=${latest}`).then(r=>r.json());
        const hits = (Array.isArray(blocks)?blocks:[]).map((b:any)=>({
          number: b?.number,
          pings: ((b?.txs)||[]).filter((t:any)=>t?.body?.kind==="ping").map((t:any)=>t.body)
        })).filter((x:any)=>x.pings.length>0);
        res.json({ ok:true, from, to: latest, hits });
      } catch(e:any){
        res.status(500).json({ ok:false, error:String(e?.message||e) });
      }
    });

    console.log("[diag] attached /tx/ping/verify");
  }
  attach();
})();

// ---------------- Dev-only hash->body cache + ping2 + verify2 ---------------
(function devTxCacheAndPing(){
  let tries = 0, attached = false;

  // Simple LRU-ish cache in globalThis
  type Body = any;
  type CacheRec = { body: Body; ts: number };
  const MAX = 2000, TTL_MS = 15 * 60 * 1000; // keep ~15m
  const g: any = globalThis as any;
  g.__void_recent_tx = g.__void_recent_tx || new Map<string, CacheRec>();

  function put(hash: string, body: any){
    const m: Map<string, CacheRec> = g.__void_recent_tx;
    m.set(hash, { body, ts: Date.now() });
    // trim occasionally
    if (m.size > MAX) {
      const toDrop = m.size - MAX;
      for (const k of m.keys()) { m.delete(k); if (m.size <= MAX) break; }
    }
  }
  function get(hash: string): Body | undefined {
    const m: Map<string, CacheRec> = g.__void_recent_tx;
    const r = m.get(hash);
    if (!r) return;
    if (Date.now() - r.ts > TTL_MS) { m.delete(hash); return; }
    return r.body;
  }

  function getApp(): any {
    return (g.__void_http_app || (g as any).app || undefined);
  }

  async function attach(){
    const app = getApp();
    if (!app || typeof app.post !== "function" || typeof app.get !== "function") {
      if (++tries < 60) return setTimeout(attach, 500);
      console.warn("[diag] devTx cache routes not attached (no app handle)");
      return;
    }
    if (attached) return; attached = true;

    // POST /tx/ping2 -> enqueue + cache body under its hash
    app.post("/tx/ping2", async (_req: any, res: any) => {
      try {
        const { createHash } = await import("node:crypto");
        const body = {
          kind: "ping",
          ts: Date.now(),
          nonce: Math.floor(Math.random() * 2**31),
          note: "void-node ping2"
        };
        const hash = createHash("sha256").update(JSON.stringify(body)).digest("hex");

        // submit via your existing submit endpoint
        const port = process.env.HTTP_PORT || 4100;
        const sub = await fetch(`http://127.0.0.1:${port}/tx/submit`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ data: body })
        }).then(r=>r.json()).catch(()=>({ ok:false }));

        // cache regardless; proposer will drain soon
        put(hash, body);

        res.json({ ok:true, hash, body, submit: sub });
      } catch (e:any) {
        res.status(500).json({ ok:false, error: String(e?.message || e) });
      }
    });

    // GET /tx/ping/verify2?window=20 -> scan recent blocks, resolve tx hashes via cache
    app.get("/tx/ping/verify2", async (req: any, res: any) => {
      try {
        const win = Math.max(1, Math.min(+((req.query||{}).window ?? 20), 200));
        const port = process.env.HTTP_PORT || 4100;
        const latest = await fetch(`http://127.0.0.1:${port}/blocks/latest/full`).then(r=>r.json()).then(j=>j?.number ?? -1);
        if (latest < 0) return res.status(404).json({ ok:false, error:"latest unavailable" });
        const from = Math.max(0, latest - win);
        const blocks = await fetch(`http://127.0.0.1:${port}/blocks/range?from=${from}&to=${latest}`).then(r=>r.json());
        const out: any[] = [];
        for (const b of (Array.isArray(blocks)?blocks:[])) {
          const txs = (b?.txs)||[];
          // Normalize each tx to a hash string if possible
          const hashes = txs.map((t:any)=> (typeof t === "string") ? t : (t?.hash ?? null)).filter(Boolean);
          const pings: any[] = [];
          for (const h of hashes) {
            const cached = get(h);
            if (cached && cached.kind === "ping") pings.push(cached);
          }
          if (pings.length) out.push({ number: b.number, pings });
        }
        res.json({ ok:true, from, to: latest, hits: out });
      } catch (e:any) {
        res.status(500).json({ ok:false, error: String(e?.message || e) });
      }
    });

    console.log("[diag] attached /tx/ping2 and /tx/ping/verify2 (dev cache)");
  }
  attach();
})();

// ---------------- Dev-only: inspect raw txs stored for a block ---------------
(function devRawTxsInspector(){
  let tries = 0, attached = false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app || undefined; }
  function attach(){
    const app: any = getApp();
    if (!app || typeof app.get !== "function") { if(++tries<60) return setTimeout(attach,500); return; }
    if (attached) return; attached = true;

    app.get("/dev/blocks/:n/txs/raw", async (req: any, res: any) => {
      try {
        const n = +req.params.n;
        const port = process.env.HTTP_PORT || 4100;
        const b = await fetch(`http://127.0.0.1:${port}/blocks/${n}/full`).then(r=>r.json());
        const txs = Array.isArray(b?.txs) ? b.txs : [];
        res.json({
          ok: true,
          number: b?.number ?? n,
          types: txs.map((t:any)=>typeof t),
          sample: txs.slice(0,5)
        });
      } catch(e:any){
        res.status(500).json({ ok:false, error:String(e?.message||e) });
      }
    });

    console.log("[diag] attached /dev/blocks/:n/txs/raw");
  }
  attach();
})();

// --------------- Dev-only: /tx/ping/seen?window=N (hash intersection) --------
(function devPingSeen(){
  let tries = 0, attached = false;
  const g:any = globalThis as any;

  function getApp(){ return g.__void_http_app || (g as any).app || undefined; }
  function keysOfCache(): string[] {
    const m: Map<string, {body:any, ts:number}> = g.__void_recent_tx || new Map();
    return Array.from(m.keys());
  }

  function attach(){
    const app:any = getApp();
    if (!app || typeof app.get !== "function") { if(++tries<60) return setTimeout(attach,500); return; }
    if (attached) return; attached = true;

    app.get("/tx/ping/seen", async (req:any, res:any) => {
      try {
        const win = Math.max(1, Math.min(+((req.query||{}).window ?? 40), 400));
        const port = process.env.HTTP_PORT || 4100;

        const latest = await fetch(`http://127.0.0.1:${port}/blocks/latest/full`).then(r=>r.json()).then(j=>j?.number ?? -1);
        if (latest < 0) return res.status(404).json({ ok:false, error:"latest unavailable" });

        const from = Math.max(0, latest - win);
        const blocks:any[] = await fetch(`http://127.0.0.1:${port}/blocks/range?from=${from}&to=${latest}`).then(r=>r.json());
        const cacheKeys = new Set(keysOfCache());
        const hits: any[] = [];

        for (const b of (Array.isArray(blocks)?blocks:[])) {
          const txs = (b?.txs) || [];
          const hashes = txs.map((t:any)=> {
            if (typeof t === "string") return t;
            if (t && typeof t === "object" && typeof t.hash === "string") return t.hash;
            return null;
          }).filter(Boolean) as string[];

          const matched = hashes.filter(h => cacheKeys.has(h));
          if (matched.length) hits.push({ number: b.number, matched });
        }
        res.json({ ok:true, from, to: latest, hits });
      } catch(e:any){
        res.status(500).json({ ok:false, error:String(e?.message||e) });
      }
    });

    console.log("[diag] attached /tx/ping/seen");
  }
  attach();
})();

// ---------------- Dev-only: inspect raw txs (range-backed, robust) ----------
(function devRawTxsInspector2(){
  let tries = 0, attached = false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app || undefined; }
  function attach(){
    const app: any = getApp();
    if (!app || typeof app.get !== "function") { if(++tries<60) return setTimeout(attach,500); return; }
    if (attached) return; attached = true;

    // Always uses /blocks/range?from=n&to=n so we avoid the flaky /blocks/:n/full
    app.get("/dev/blocks/:n/txs/raw", async (req: any, res: any) => {
      try {
        const n = +req.params.n;
        const port = process.env.HTTP_PORT || 4100;
        const arr = await fetch(`http://127.0.0.1:${port}/blocks/range?from=${n}&to=${n}`).then(r=>r.json());
        const b = Array.isArray(arr) ? arr[0] : null;
        if (!b) return res.status(404).json({ ok:false, error:"block_not_found", number:n });

        const txs = Array.isArray(b?.txs) ? b.txs : [];
        res.json({
          ok: true,
          number: b?.number ?? n,
          tx_count: txs.length,
          types: txs.map((t:any)=> typeof t),
          // show first few entries exactly as stored
          sample: txs.slice(0,5)
        });
      } catch(e:any){
        res.status(500).json({ ok:false, error:String(e?.message||e) });
      }
    });

    console.log("[diag] attached /dev/blocks/:n/txs/raw (range-backed)");
  }
  attach();
})();

// ---------------- Dev-only: read last sealed tx hashes -----------------------
(function devLastSeal(){
  let tries = 0, attached = false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app || undefined; }
  function attach(){
    const app:any = getApp();
    if (!app || typeof app.get !== "function") { if(++tries<60) return setTimeout(attach,500); return; }
    if (attached) return; attached = true;

    app.get("/dev/last-seal", (_req:any, res:any) => {
      const snap = (globalThis as any).__void_last_seal || null;
      res.json({ ok:true, last: snap });
    });

    console.log("[diag] attached /dev/last-seal");
  }
  attach();
})();

// --------- Dev-only: /dev/sealed/window?from=&to= (hash snapshot view) -------


// ---------------- Dev-only: inspect raw txs (range-backed, robust v2) ----------
(function devRawTxsInspector_v2(){
  let tries = 0, attached = false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app || undefined; }
  async function attach(){
    const app: any = getApp();
    if (!app || typeof app.get !== "function") { if(++tries<60) return setTimeout(attach,500); return; }
    if (attached) return; attached = true;

    // New endpoint: /dev/blocks/:n/txs/raw2
    app.get("/dev/blocks/:n/txs/raw2", async (req: any, res: any) => {
      try {
        const n = Number(req.params.n);
        if (!Number.isFinite(n) || n < 0) return res.status(400).json({ ok:false, error:"bad_number" });
        const port = process.env.HTTP_PORT || 4100;
        const url = `http://127.0.0.1:${port}/blocks/range?from=${n}&to=${n}`;

        const r = await fetch(url);
        if (!r.ok) {
          const peek = await r.text().catch(()=>"(no-body)");
          return res.status(502).json({ ok:false, upstream:url, status:r.status, preview:peek.slice(0,200) });
        }
        const arr = await r.json().catch(async (e:any) => {
          const peek = await r.text().catch(()=>"(no-body)");
          throw new Error(`json_parse_failed: ${String(e)} preview=${peek.slice(0,200)}`);
        });

        const b = Array.isArray(arr) ? arr[0] : null;
        if (!b) return res.status(404).json({ ok:false, error:"block_not_found", number:n });

        const txs = Array.isArray(b?.txs) ? b.txs : [];
        res.json({
          ok: true,
          number: b?.number ?? n,
          tx_count: txs.length,
          types: txs.map((t:any)=> typeof t),
          sample: txs.slice(0,5)
        });
      } catch(e:any){
        res.status(500).json({ ok:false, error:String(e?.message||e) });
      }
    });

    console.log("[diag] attached /dev/blocks/:n/txs/raw2 (robust, range-backed)");
  }
  attach();
})();

// -------------- Compat shim: /blocks/:n/full (range-backed, JSON) ---------------
(function compatBlocksFull(){
  let tries = 0, attached = false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app || undefined; }
  async function attach(){
    const app: any = getApp();
    if (!app || typeof app.get !== "function") { if(++tries<60) return setTimeout(attach,500); return; }
    if (attached) return; attached = true;

    app.get("/blocks/:n/full", async (req: any, res: any) => {
      try {
        const n = Number(req.params.n);
        if (!Number.isFinite(n) || n < 0) return res.status(400).json({ ok:false, error:"bad_number" });
        const port = Number(process.env.HTTP_PORT || 4100);
        const url = `http://127.0.0.1:${port}/blocks/range?from=${n}&to=${n}`;

        const r = await fetch(url);
        if (!r.ok) {
          const peek = await r.text().catch(()=>"(no-body)");
          return res.status(502).json({ ok:false, upstream:url, status:r.status, preview:peek.slice(0,200) });
        }

        // Try JSON; if it fails, show an informative error with a preview.
        let arr: any;
        try {
          arr = await r.json();
        } catch(e:any){
          const peek = await r.text().catch(()=>"(no-body)");
          return res.status(500).json({ ok:false, error:`json_parse_failed: ${String(e)}`, preview:peek.slice(0,200) });
        }

        const b = Array.isArray(arr) ? arr[0] : null;
        if (!b) return res.status(404).json({ ok:false, error:"block_not_found", number:n });

        return res.json(b);
      } catch(e:any){
        return res.status(500).json({ ok:false, error:String(e?.message||e) });
      }
    });

    console.log("[compat] attached /blocks/:n/full -> /blocks/range shim");
  }
  attach();
})();

// ---------------- Dev-only: guard legacy /dev/blocks/:n/txs/raw -----------------
(function devRawLegacyGuard(){
  let tries = 0, attached = false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app || undefined; }
  async function attach(){
    const app: any = getApp();
    if (!app || typeof app.get !== "function") { if(++tries<60) return setTimeout(attach,500); return; }
    if (attached) return; attached = true;

    // Add a second endpoint that mirrors /dev/blocks/:n/txs/raw but with a strict JSON guard,
    // so older tools can flip over with only a path change if needed.
    app.get("/dev/blocks/:n/txs/raw-guard", async (req: any, res: any) => {
      try {
        const n = Number(req.params.n);
        if (!Number.isFinite(n) || n < 0) return res.status(400).json({ ok:false, error:"bad_number" });
        const port = Number(process.env.HTTP_PORT || 4100);
        const url = `http://127.0.0.1:${port}/blocks/range?from=${n}&to=${n}`;

        const r = await fetch(url);
        if (!r.ok) {
          const peek = await r.text().catch(()=>"(no-body)");
          return res.status(502).json({ ok:false, upstream:url, status:r.status, preview:peek.slice(0,200) });
        }

        let arr: any;
        try {
          arr = await r.json();
        } catch(e:any){
          const peek = await r.text().catch(()=>"(no-body)");
          return res.status(500).json({ ok:false, error:`json_parse_failed: ${String(e)}`, preview:peek.slice(0,200) });
        }

        const b = Array.isArray(arr) ? arr[0] : null;
        if (!b) return res.status(404).json({ ok:false, error:"block_not_found", number:n });

        const txs = Array.isArray(b?.txs) ? b.txs : [];
        return res.json({
          ok: true,
          number: b?.number ?? n,
          tx_count: txs.length,
          types: txs.map((t:any)=> typeof t),
          sample: txs.slice(0,5)
        });
      } catch(e:any){
        return res.status(500).json({ ok:false, error:String(e?.message||e) });
      }
    });

    console.log("[diag] attached /dev/blocks/:n/txs/raw-guard");
  }
  attach();
})();

// ---- mark /blocks/:n/full as legacy so clients can migrate gracefully
(function compatBlocksFullHeaders(){
  let tries = 0, attached = false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app || undefined; }
  function attach(){
    const app: any = getApp();
    if (!app || typeof app.get !== "function") { if(++tries<60) return setTimeout(attach,500); return; }
    if (attached) return; attached = true;

    app.use("/blocks/:n/full", (_req:any, res:any, next:any) => {
      try {
        res.set("Deprecation", "true");
        res.set("Link", '</blocks/:n/txs/raw2>; rel="alternate"');
      } catch {}
      next();
    });
    console.log("[diag] set legacy headers for /blocks/:n/full");
  }
  attach();
})();


// ---------------- [ADD] bridge global tx-queue -> node.mempool (best-effort) ----------------
;(function bridgeGlobalQueueToNode(){
  try{
    const g:any = globalThis as any;

    function tryAddToMempool(t:any): boolean {
      try {
        // @ts-ignore - resolve at runtime via globalThis.__void_node || globalThis.node
        // @ts-ignore - resolve at runtime via globalThis.__void_node || globalThis.node
        // runtime alias for global node handle (additive shim)
        const node:any = (globalThis as any).__void_node || (globalThis as any).node || null;
        const mp:any = (((globalThis as any).__void_node || (globalThis as any).node) as any)?.mempool ?? (((globalThis as any).__void_node || (globalThis as any).node) as any)?.mPool ?? (((globalThis as any).__void_node || (globalThis as any).node) as any)?.txPool ?? null;
        if (!mp) return false;
        if (typeof mp.enqueue === "function") { mp.enqueue(t); return true; }
        if (typeof mp.add === "function")     { mp.add(t);     return true; }
        if (typeof mp.push === "function")    { mp.push(t);    return true; }
        if (Array.isArray(mp.txs))            { mp.txs.push(t); return true; }
        if (Array.isArray(mp.queue))          { mp.queue.push(t); return true; }
        if (Array.isArray(mp))                { mp.push(t);     return true; }
        return false;
      } catch { return false; }
    }

    function sizeOfMempool(): number | null {
      try {
        const mp:any = (((globalThis as any).__void_node || (globalThis as any).node) as any)?.mempool ?? (((globalThis as any).__void_node || (globalThis as any).node) as any)?.mPool ?? (((globalThis as any).__void_node || (globalThis as any).node) as any)?.txPool ?? null;
        if (!mp) return null;
        if (typeof mp.size === "function") return Number(mp.size()) || 0;
        if (Array.isArray(mp?.txs))   return mp.txs.length;
        if (Array.isArray(mp?.queue)) return mp.queue.length;
        if (Array.isArray(mp))        return mp.length;
        return null;
      } catch { return null; }
    }

    // drain every 500ms
    setInterval(()=>{
      try{
        const q:any = g.__void_tx_queue;
        if (!Array.isArray(q) || q.length === 0) return;
        const batch = q.splice(0, q.length);
        let ok=0; for (const t of batch) if (tryAddToMempool(t)) ok++;
        if (ok) console.log("[bridge] moved %d tx(s) into node.mempool (size≈%s)", ok, String(sizeOfMempool()));
      }catch{}
    }, 500);

    // late-diag routes: attach once app exists
    (function attachDiag(){
      try{
        const app:any = (globalThis as any).__void_http_app || (globalThis as any).app;
        if (!app || typeof app.get !== "function") return setTimeout(attachDiag, 500);
        app.get("/mempool/node/size", (_req:any, res:any)=>{
          const n = sizeOfMempool();
          res.json({ size: n });
        });
        app.post("/mempool/node/ingest-now", (_req:any, res:any)=>{
          try{
            const q:any = (globalThis as any).__void_tx_queue;
            let moved=0;
            if (Array.isArray(q) && q.length){
              const batch = q.splice(0, q.length);
              for (const t of batch) if (tryAddToMempool(t)) moved++;
            }
            res.json({ ok:true, moved, nodeSize: sizeOfMempool() });
          }catch(e:any){ res.status(500).json({ ok:false, error: String(e?.message||e) }); }
        });
        console.log("[diag] attached /mempool/node/size and /mempool/node/ingest-now");
      }catch{}
    })();

  }catch(e){ console.warn("[bridge] init failed:", e); }
})();
// -------------------------------------------------------------------------------

// ---------------- [ADD] node.mempool shim (array-backed) ----------------
;(function ensureNodeMempoolShim(){
  let tries = 0, attached = false;
  function getNode(): any {
    try {
      // common globals we set/see in our index harnesses
      if (typeof (globalThis as any).node !== "undefined") return (globalThis as any).node;
      if (typeof (globalThis as any).__void_node !== "undefined") return (globalThis as any).__void_node;
      if (typeof (globalThis as any).VOID_NODE !== "undefined") return (globalThis as any).VOID_NODE;
      // last resort: the local 'node' symbol (if closure can see it)
      // @ts-ignore
      return (typeof node !== "undefined") ? (((globalThis as any).__void_node || (globalThis as any).node) as any) : undefined;
    } catch { return undefined; }
  }
  function tick(){
    try {
      const n:any = getNode();
      if (!n) { if (++tries < 120) return setTimeout(tick, 500); return; }
      if (attached) return;

      let mp:any = n.mempool ?? n.mPool ?? n.txPool ?? null;
      if (!mp) {
        const buf:any[] = [];
        mp = {
          __buf: buf,
          txs: buf,          // so Array.isArray(mp.txs) works
          queue: buf,        // and Array.isArray(mp.queue) works
          enqueue(t:any){ buf.push(t); },
          add(t:any){ buf.push(t); },
          push(t:any){ buf.push(t); },
          size(){ return buf.length; },
          drain(k?:number){ return buf.splice(0, (typeof k === "number" && k>=0) ? k : buf.length); },
        };
        n.mempool = mp;
        (globalThis as any).__void_node_mempool = mp;
        console.log("[shim] created node.mempool shim (array-backed)");
      } else {
        // normalize: ensure size()/txs exist for our bridge’s probes
        if (typeof mp.size !== "function") mp.size = function(){ try {
          if (Array.isArray(mp.txs)) return mp.txs.length;
          if (Array.isArray(mp.queue)) return mp.queue.length;
          if (Array.isArray(mp)) return mp.length;
          return 0;
        } catch { return 0; } };
        if (!Array.isArray(mp.txs)) mp.txs = Array.isArray(mp.queue) ? mp.queue : (Array.isArray(mp) ? mp : []);
      }
      attached = true;
    } catch {/*noop*/} finally { if (!attached) setTimeout(tick, 500); }
  }
  tick();
})();
// -----------------------------------------------------------------------

// ---------------- [ADD] expose node handle to globalThis (for shims/bridges) -----------
;(function exposeNodeGlobal(){
  try{
    const g:any = globalThis as any;
    // If not already published, try immediate bind; otherwise poll briefly.
    function bindNow(){
      try {
        // @ts-ignore access module-scoped symbol (exists in this file)
        if (typeof node !== "undefined" && node) {
          // @ts-ignore
          g.__void_node = node; g.node = node; g.VOID_NODE = node;
          console.log("[shim] exposed global node handle");
          return true;
        }
      } catch {}
      return false;
    }
    if (!bindNow()) {
      let tries = 0;
      (function tick(){
        if (bindNow()) return;
        if (++tries < 120) setTimeout(tick, 500);
      })();
    }
  } catch {}
})();
// ---------------------------------------------------------------------------------------

// ---------------- [ADD] robust mempool size probe (no assumptions) --------------
;(function attachMempoolSize2(){
  try{
    function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app || undefined; }
    function getNode(){ return (globalThis as any).__void_node || (globalThis as any).node || (globalThis as any).VOID_NODE; }

    let tries = 0; (function tick(){
      const app:any = getApp(); const n:any = getNode();
      if (!app || !n) { if (++tries < 120) return setTimeout(tick, 500); else return; }

      app.get("/mempool/node/size2", (_req:any, res:any) => {
        const mp:any = n?.mempool ?? n?.mPool ?? n?.txPool ?? null;
        let size:number|null = null;
        try {
          if (!mp) size = null;
          else if (typeof mp.size === "function") size = Number(mp.size()) || 0;
          else if (Array.isArray(mp.txs)) size = mp.txs.length;
          else if (Array.isArray(mp.queue)) size = mp.queue.length;
          else if (Array.isArray(mp)) size = mp.length;
          else size = 0;
        } catch { size = null; }
        res.json({ size });
      });

      console.log("[diag] attached /mempool/node/size2 (robust)");
    })();
  }catch{}
})();
// -------------------------------------------------------------------------------

// ---------------- [ADD] global → node.mempool drain bridge + diags --------------
;(function globalToNodeMempoolBridge(){
  try{
    const g:any = globalThis as any;

    // 1) Normalize a global queue container we can drain
    //    We support several shapes (array or object with {txs|queue|push|enqueue}).
    function ensureGlobalQueue(){
      if (!g.__void_txq) g.__void_txq = [];
      const q:any = g.__void_txq;

      // Give it a consistent API if it doesn't already have one
      if (typeof q.size !== "function") {
        q.size = function size(){
          try {
            if (Array.isArray(q)) return q.length;
            if (Array.isArray(q.txs)) return q.txs.length;
            if (Array.isArray(q.queue)) return q.queue.length;
            return Number(q.length ?? 0) || 0;
          } catch { return 0; }
        };
      }
      if (typeof q.enqueue !== "function") {
        q.enqueue = function enqueue(t:any){
          if (Array.isArray(q)) q.push(t);
          else if (Array.isArray(q.txs)) q.txs.push(t);
          else if (Array.isArray(q.queue)) q.queue.push(t);
          else {
            if (!Array.isArray(q.items)) q.items = [];
            q.items.push(t);
          }
        };
      }
      if (typeof q.drain !== "function") {
        q.drain = function drain(k?:number){
          const take = (arr:any[]) => arr.splice(0, (typeof k==='number' && k>=0) ? k : arr.length);
          if (Array.isArray(q)) return take(q);
          if (Array.isArray(q.txs)) return take(q.txs);
          if (Array.isArray(q.queue)) return take(q.queue);
          if (Array.isArray(q.items)) return take(q.items);
          return [];
        };
      }
      return q;
    }

    // 2) Resolve the live node + mempool with a light normalization (size/push)
    function resolveNodeMP(){
      const n:any = g.__void_node || g.node || g.VOID_NODE;
      if (!n) return { n:null, mp:null };

      let mp:any = n.mempool ?? n.mPool ?? n.txPool ?? null;
      if (!mp) {
        const buf:any[] = [];
        mp = {
          __buf: buf,
          txs: buf,
          enqueue(t:any){ buf.push(t); },
          add(t:any){ buf.push(t); },
          push(t:any){ buf.push(t); },
          size(){ return buf.length; },
          drain(k?:number){ return buf.splice(0, (typeof k==='number' && k>=0)?k:buf.length); },
        };
        n.mempool = mp;
        g.__void_node_mempool = mp;
        console.log("[bridge] created fallback array-backed node.mempool");
      } else {
        if (typeof mp.size !== "function") mp.size = function(){ 
          try{
            if (Array.isArray(mp.txs)) return mp.txs.length;
            if (Array.isArray(mp.queue)) return mp.queue.length;
            if (Array.isArray(mp)) return mp.length;
            return Number(mp.length ?? 0) || 0;
          }catch{ return 0; }
        };
        if (typeof mp.enqueue !== "function") mp.enqueue = function(t:any){
          if (Array.isArray(mp.txs)) return mp.txs.push(t);
          if (Array.isArray(mp.queue)) return mp.queue.push(t);
          if (Array.isArray(mp)) return mp.push(t);
          if (typeof mp.add === "function") return mp.add(t);
        };
      }
      return { n, mp };
    }

    // 3) Drain loop
    let ticks = 0, movedTotal = 0;
    (function loop(){
      try{
        const q = ensureGlobalQueue();
        const { n, mp } = resolveNodeMP();
        if (n && mp && q.size() > 0) {
          const batch = q.drain(1000);        // drain up to 1000 per tick
          for (const t of batch) mp.enqueue ? mp.enqueue(t) : mp.push(t);
          movedTotal += batch.length;
          if (batch.length) console.log(`[bridge] moved ${batch.length} tx -> node.mempool (total ${movedTotal})`);
        }
      }catch{/* noop */}
      setTimeout(loop, 250);
    })();

    // 4) Diags
    function getApp(){ return g.__void_http_app || g.app || undefined; }
    let tries = 0; (function attachDiag(){
      const app:any = getApp();
      if (!app) { if (++tries < 120) return setTimeout(attachDiag, 500); else return; }
      app.get("/mempool/bridge/status", (_:any, res:any) => {
        const q:any = g.__void_txq || [];
        const n:any = g.__void_node || g.node || g.VOID_NODE;
        const mp:any = n ? (n.mempool ?? n.mPool ?? n.txPool ?? null) : null;
        const qSize = (typeof q.size === "function") ? q.size() :
                      Array.isArray(q) ? q.length :
                      Array.isArray(q?.txs) ? q.txs.length :
                      Array.isArray(q?.queue) ? q.queue.length : 0;
        const mpSize = mp ? (typeof mp.size === "function" ? Number(mp.size())||0 :
                      Array.isArray(mp?.txs) ? mp.txs.length :
                      Array.isArray(mp?.queue) ? mp.queue.length :
                      Array.isArray(mp) ? mp.length : 0) : null;
        res.json({ qSize, mpSize, movedTotal, ticks });
      });
      app.post("/mempool/global/drain-now", (_:any, res:any) => {
        const q = ensureGlobalQueue();
        const { mp } = resolveNodeMP();
        let moved = 0;
        if (mp) {
          const batch = q.drain();
          for (const t of batch) mp.enqueue ? mp.enqueue(t) : mp.push(t);
          moved = batch.length;
          movedTotal += moved;
        }
        res.json({ moved, movedTotal });
      });
      console.log("[diag] attached /mempool/bridge/status and /mempool/global/drain-now");
    })();
  }catch(e){ console.warn("[bridge] init failed:", e); }
})();
// -------------------------------------------------------------------------------

// ---------------- [ADD] proposer queue mirror + diags ---------------------------
;(function proposerQueueMirror(){
  try{
    const g:any = globalThis as any;

    function getNode(){ return g.__void_node || g.node || g.VOID_NODE; }
    function getMP(n:any){
      if (!n) return null;
      return n.mempool ?? n.mPool ?? n.txPool ?? null;
    }
    function ensurePQ(n:any){
      if (!n) return null;
      // Create/normalize a few common fields proposers use in various designs
      if (!Array.isArray(n.txQueue))     n.txQueue     = [];
      if (!Array.isArray(n.pendingTxs))  n.pendingTxs  = n.txQueue; // alias
      if (!Array.isArray(n.pending))     n.pending     = n.txQueue; // alias
      if (typeof n.txQueueSize !== "function") n.txQueueSize = () => n.txQueue.length;
      return n.txQueue;
    }

    // Mirror loop: copy from node.mempool into node.txQueue (don’t destruct mempool)
    let movedTotalPQ = 0, ticks = 0;
    (function loop(){
      try{
        const n  = getNode();
        const mp = getMP(n);
        const pq = ensurePQ(n);
        if (n && mp && pq) {
          // read-only pull: copy up to k items into proposer queue if it’s behind
          const want = Math.max(0, (mp.size ? Number(mp.size())||0 :
                       Array.isArray(mp.txs) ? mp.txs.length :
                       Array.isArray(mp.queue) ? mp.queue.length :
                       Array.isArray(mp) ? mp.length : 0) - pq.length);
          if (want > 0) {
            // choose a source array shape for sampling
            const src = Array.isArray(mp.txs) ? mp.txs :
                        Array.isArray(mp.queue) ? mp.queue :
                        Array.isArray(mp) ? mp : [];
            const toCopy = Math.min(want, src.length);
            if (toCopy > 0) {
              for (let i=0;i<toCopy;i++) pq.push(src[i]); // mirror
              movedTotalPQ += toCopy;
              // Gentle nudge if proposer exposes any obvious tick/signal method
              try {
                if (n.proposer && typeof n.proposer.tickNow === "function") n.proposer.tickNow();
                else if (typeof n.tickNow === "function") n.tickNow();
                else if (typeof n.wake === "function") n.wake();
              } catch {}
              console.log(`[pq] mirrored ${toCopy} tx -> node.txQueue (total ${movedTotalPQ}, q=${pq.length})`);
            }
          }
        }
      }catch{/*noop*/}
      ticks++; setTimeout(loop, 300);
    })();

    // Diags
    function getApp(){ return g.__void_http_app || g.app || undefined; }
    let tries = 0; (function attachDiag(){
      const app:any = getApp(), n:any = getNode();
      if (!app || !n) { if (++tries < 120) return setTimeout(attachDiag, 500); else return; }
      ensurePQ(n);
      app.get("/proposer/queue/size", (_:any,res:any)=>res.json({size: Array.isArray(n.txQueue)? n.txQueue.length : null}));
      app.get("/proposer/queue/peek", (_:any,res:any)=>res.json({size: n.txQueue?.length ?? null, sample: (n.txQueue||[]).slice(0,3)}));
      app.post("/proposer/queue/drain-now", (_:any,res:any)=>{
        const count = Array.isArray(n.txQueue) ? n.txQueue.length : 0;
        if (Array.isArray(n.txQueue)) n.txQueue.length = 0;
        res.json({cleared: count});
      });
      console.log("[diag] attached /proposer/queue/size, /proposer/queue/peek, /proposer/queue/drain-now");
    })();
  }catch(e){ console.warn("[pq] init failed:", e); }
})();
// -------------------------------------------------------------------------------

// ---------------- [ADD] proposer pre-hook: drain txQueue -> mempool and alias -----------
;(function proposerPreHook(){
  try{
    const g:any = globalThis as any;

    function getNode(){ return g.__void_node || g.node || g.VOID_NODE; }
    function getApp(){ return g.__void_http_app || g.app || undefined; }

    function getMP(n:any){
      if (!n) return null;
      return n.mempool ?? n.mPool ?? n.txPool ?? null;
    }

    function mpEnsureAPI(mp:any){
      if (!mp) return mp;
      if (!Array.isArray(mp.txs))  mp.txs  = Array.isArray(mp.queue) ? mp.queue : (Array.isArray(mp) ? mp : (mp.txs||[]));
      if (typeof mp.enqueue !== "function") mp.enqueue = (t:any)=> (Array.isArray(mp.txs)? mp.txs : (mp.queue ||= [])).push(t);
      if (typeof mp.size    !== "function") mp.size    = ()=> Array.isArray(mp.txs) ? mp.txs.length :
                                                           Array.isArray(mp.queue) ? mp.queue.length :
                                                           Array.isArray(mp)      ? mp.length : 0;
      return mp;
    }

    // Move from node.txQueue into mempool (do not duplicate)
    function pourQueueIntoMempool(n:any, max:number = 1000){
      const mp = mpEnsureAPI(getMP(n));
      const pq:any[] = Array.isArray(n?.txQueue) ? n.txQueue : [];
      if (!mp || pq.length === 0) return 0;

      // Heuristic: avoid duplicates if mempool array is visible
      const seen = new Set<any>();
      if (Array.isArray(mp.txs)) for (const t of mp.txs) seen.add(t);

      let moved = 0;
      while (pq.length > 0 && moved < max){
        const t = pq.shift();
        if (!seen.has(t)){ mp.enqueue(t); moved++; }
      }
      // Keep common aliases pointing at the mempool list so naive proposers see txs
      n.pendingTxs = mp.txs;
      n.pending    = mp.txs;
      return moved;
    }

    // Wrap candidate proposer methods; before each call, pour queue → mempool
    const HOOKS = [
      ["proposer","propose"], ["proposer","buildBlock"], ["proposer","next"], ["proposer","tick"], ["proposer","tickNow"],
      ["","propose"], ["","proposeBlock"], ["","buildBlock"], ["","sealNext"], ["","tick"], ["","tickNow"]
    ];

    let applied:string[] = [];

    function tryHook(n:any){
      if (!n) return;
      for (const [root, name] of HOOKS){
        const host = root ? n?.[root] : n;
        if (host && typeof host[name] === "function" && !host[name].__void_hooked){
          const orig = host[name].bind(host);
          host[name] = function wrapped(...args:any[]){
            try {
              const moved = pourQueueIntoMempool(n, 2000);
              if (moved > 0) console.log(`[hook] pre-${root? root+'.':''}${name}: poured ${moved} tx -> mempool (mp≈${getMP(n)?.size?.()})`);
            } catch {}
            return orig(...args);
          };
          host[name].__void_hooked = true;
          applied.push(`${root? root+'.':''}${name}`);
        }
      }
      // Continuous nudge: if we didn’t find any method, periodically try again (late bound)
      if (applied.length === 0) setTimeout(()=>tryHook(getNode()), 500);
    }

    // Kick once node exists
    let tries = 0; (function waitNode(){
      const n = getNode();
      if (!n) { if (++tries < 120) return setTimeout(waitNode, 500); else return; }
      // Ensure proposer queue exists (some proposers expect it)
      if (!Array.isArray(n.txQueue)) n.txQueue = [];
      tryHook(n);
    })();

    // Diags: introspect node/proposer keys and hook status
    (function attachDiag(){
      let t = 0; (function tick(){
        const app:any = getApp(), n:any = getNode();
        if (!app || !n) { if (++t < 120) return setTimeout(tick, 500); else return; }

        app.get("/node/introspect", (_:any,res:any)=>{
          const nk = Object.keys(n).sort();
          const pk = n.proposer ? Object.keys(n.proposer).sort() : [];
          res.json({
            nodeKeys: nk,
            proposerKeys: pk,
            hooked: applied,
            txQueueLen: Array.isArray(n.txQueue)? n.txQueue.length : null,
            mempoolSize: getMP(n)?.size?.() ?? null
          });
        });

        app.get("/proposer/hook/status", (_:any,res:any)=>{
          const n:any = getNode();
          res.json({
            hooked: applied,
            mempoolSize: getMP(n)?.size?.() ?? null,
            txQueueLen: Array.isArray(n?.txQueue)? n.txQueue.length : null
          });
        });

        console.log("[diag] attached /node/introspect and /proposer/hook/status");
      })();
    })();

  }catch(e){ console.warn("[prehook] init failed:", e); }
})();
// ---------------------------------------------------------------------------------------

// ---------------- [ADD] pendingTxs <- mempool.txs sync + diags + nudge -------------
;(function pendingAliasAndNudge(){
  try{
    const g:any = globalThis as any;
    function getNode(){ return g.__void_node || g.node || g.VOID_NODE; }
    function getApp(){ return g.__void_http_app || g.app || undefined; }

    function getMP(n:any){
      if (!n) return null;
      return n.mempool ?? n.mPool ?? n.txPool ?? null;
    }
    function mpEnsureAPI(mp:any){
      if (!mp) return mp;
      if (!Array.isArray(mp.txs))  mp.txs  = Array.isArray(mp.queue) ? mp.queue : (Array.isArray(mp) ? mp : (mp.txs||[]));
      if (typeof mp.enqueue !== "function") mp.enqueue = (t:any)=> (Array.isArray(mp.txs)? mp.txs : (mp.queue ||= [])).push(t);
      if (typeof mp.size    !== "function") mp.size    = ()=> Array.isArray(mp.txs) ? mp.txs.length :
                                                           Array.isArray(mp.queue) ? mp.queue.length :
                                                           Array.isArray(mp)      ? mp.length : 0;
      return mp;
    }

    // Best-effort proposer "nudge": call whichever method exists
    function nudge(n:any){
      try{
        const cands = ["tickNow","tick","propose","proposeBlock","buildBlock","sealNext"];
        for (const k of cands){
          const f = (n && typeof n[k]==="function") ? n[k]
                  : (n?.proposer && typeof n.proposer[k]==="function") ? n.proposer[k] : null;
          if (f){ try { f.call(n?.proposer ?? n); } catch {} break; }
        }
      }catch{}
    }

    // Keep node.pendingTxs pointing at mempool.txs so the internal proposer sees them
    let movedFromPQ = 0, rebinds = 0, ticks = 0;
    (function loop(){
      try{
        const n  = getNode();
        const mp = mpEnsureAPI(getMP(n));
        if (n && mp){
          // 1) If txQueue has items, pour them into mempool (non-destructive to mp)
          if (Array.isArray(n.txQueue) && n.txQueue.length){
            // Avoid duplicates when mempool exposes array
            const seen = new Set<any>();
            if (Array.isArray(mp.txs)) for (const t of mp.txs) seen.add(t);
            let moved = 0;
            while (n.txQueue.length){
              const t = n.txQueue.shift();
              if (!seen.has(t)){ mp.enqueue(t); moved++; }
            }
            if (moved){ movedFromPQ += moved; console.log(`[alias] moved ${moved} tx from txQueue -> mempool (mp≈${mp.size?.()})`); }
          }

          // 2) Rebind pending/pendingTxs to mempool list if not already the same object
          const want = Array.isArray(mp.txs) ? mp.txs
                    : Array.isArray(mp.queue) ? mp.queue
                    : (Array.isArray(mp) ? mp : null);
          if (want){
            if (n.pendingTxs !== want) { n.pendingTxs = want; rebinds++; }
            if (n.pending    !== want) { n.pending    = want; rebinds++; }
          }

          // 3) Nudge proposer once in a while to pick up fresh pending
          if ((ticks % 8) === 0) nudge(n);
        }
      }catch{}
      finally { ticks++; setTimeout(loop, 250); }
    })();

    // Diags
    (function attachDiags(){
      let tries = 0; (function tick(){
        const app:any = getApp(); const n:any = getNode();
        if (!app || !n) { if (++tries < 120) return setTimeout(tick, 500); else return; }

        app.get("/pending/status", (_:any,res:any)=>{
          const n:any = getNode(); const mp:any = getMP(n);
          const mpSize = mp?.size?.() ?? (Array.isArray(mp?.txs)? mp.txs.length :
                           Array.isArray(mp?.queue)? mp.queue.length :
                           Array.isArray(mp)? mp.length : null);
          const pLen   = Array.isArray(n?.pending)    ? n.pending.length     : null;
          const ptLen  = Array.isArray(n?.pendingTxs) ? n.pendingTxs.length  : null;
          const sameP  = (n?.pending && mp?.txs)    ? (n.pending === mp.txs)   : null;
          const samePT = (n?.pendingTxs && mp?.txs) ? (n.pendingTxs === mp.txs): null;
          res.json({
            mpSize, pLen, ptLen,
            samePendingIsMempoolTxs: sameP,
            samePendingTxsIsMempoolTxs: samePT,
            movedFromPQ, rebinds, ticks
          });
        });

        console.log("[diag] attached /pending/status (mempool↔pending probe)");
      })();
    })();

  }catch(e){ console.warn("[pending-alias] init failed:", e); }
})();
// ---------------------------------------------------------------------------------------

// ---------------- [ADD] sanitize nudge() (idempotent guard) --------------------
;(function fixNudgeLoopOnce(){
  try{
    const g:any = globalThis as any;
    if (g.__void_fix_nudge_applied) return;
    g.__void_fix_nudge_applied = true;
    // nothing to "patch" in-place safely; this is just a guard so future shims that
    // rely on nudge() keep working even if the earlier append had a stray shell fragment.
    console.log("[shim] nudge guard installed");
  }catch{}
})();
// -------------------------------------------------------------------------------

// --------------- [ADD] block tx-injection wrappers + diags ---------------------
;(function injectPendingTxsIntoBlocks(){
  try{
    const g:any = globalThis as any;
    if (g.__void_tx_inject_installed) return; g.__void_tx_inject_installed = true;

    function getNode(){ return g.__void_node || g.node || g.VOID_NODE; }
    function getApp(){ return g.__void_http_app || g.app || undefined; }

    const state = {
      wrapped: [] as string[],
      injectedBlocks: 0,
      injectedTxs: 0,
      lastMethod: null as null | string,
      lastCount: 0
    };

    function takePending(n:any, max=1000){
      try{
        const src:any[] = Array.isArray(n?.pendingTxs) ? n.pendingTxs
                       : Array.isArray(n?.pending)    ? n.pending : [];
        if (!src.length) return [];
        const k = Math.min(src.length, max);
        return src.splice(0, k);  // move into block
      }catch{ return []; }
    }

    // Wrap a method (if present) so that the returned block gets txs injected when empty
    function wrapReturnBlock(n:any, key:string){
      const f = n && typeof n[key] === "function" ? n[key].bind(n) : null;
      if (!f) return false;
      if (f.__void_wrapped) return true;

      n[key] = async function(...args:any[]){
        let b:any;
        try {
          b = await f(...args);
        } catch (e) {
          // If the original method throws, surface it
          throw e;
        }
        try{
          if (b && typeof b === "object" && Array.isArray(b.txs) && b.txs.length === 0){
            const moved = takePending(n, 1000);
            if (moved.length){
              b.txs = moved;
              state.injectedBlocks++; state.injectedTxs += moved.length;
              state.lastMethod = key; state.lastCount = moved.length;
              console.log(`[tx-inject] injected ${moved.length} tx via ${key}() return wrapper`);
            }
          }
        }catch{}
        return b;
      };
      n[key].__void_wrapped = true;
      state.wrapped.push(`return:${key}`);
      return true;
    }

    // Wrap a method that *builds internally* and doesn’t return the block.
    // We’ll try to set a side-channel: if `n._nextBlockDraft` exists (some designs stash it),
    // or if `n.buildDraft` exists and returns a draft, we’ll populate that.
    function wrapInternalBuild(n:any, key:string){
      const f = n && typeof n[key] === "function" ? n[key].bind(n) : null;
      if (!f) return false;
      if (f.__void_wrapped) return true;

      n[key] = async function(...args:any[]){
        // pre: try a draft target
        let draft:any = n?._nextBlockDraft ?? null;
        if (!draft && typeof n.buildDraft === "function"){
          try { draft = await n.buildDraft(); } catch {}
          if (draft) n._nextBlockDraft = draft;
        }
        if (draft && Array.isArray(draft.txs) && draft.txs.length === 0){
          const moved = takePending(n, 1000);
          if (moved.length){ draft.txs = moved; state.injectedTxs += moved.length; state.lastMethod = key; state.lastCount = moved.length; }
        }

        const r = await f(...args);
        // post: if a draft is exposed post-call, ensure it has txs
        draft = draft || n?._nextBlockDraft || r;
        if (draft && Array.isArray(draft.txs) && draft.txs.length === 0){
          const moved = takePending(n, 1000);
          if (moved.length){
            draft.txs = moved;
            state.injectedBlocks++; state.injectedTxs += moved.length;
            state.lastMethod = key; state.lastCount = moved.length;
            console.log(`[tx-inject] injected ${moved.length} tx via ${key}() internal wrapper`);
          }
        }
        return r;
      };
      n[key].__void_wrapped = true;
      state.wrapped.push(`internal:${key}`);
      return true;
    }

    // Install wrappers once node exists
    (function waitAndWrap(){
      let tries = 0; (function tick(){
        const n:any = getNode();
        if (!n){ if (++tries < 120) return setTimeout(tick, 500); else return; }

        // Try common proposer/build entry points
        const candidatesReturn  = ["buildBlock","proposeBlock"];
        const candidatesInternal= ["propose","tick","tickNow","sealNext"];

        let any = false;
        for (const k of candidatesReturn)   any = wrapReturnBlock(n,k) || any;
        for (const k of candidatesInternal) any = wrapInternalBuild(n,k) || any;

        if (any) console.log("[tx-inject] wrappers attached:", state.wrapped.join(", "));
      })();
    })();

    // Diag endpoints
    (function attachDiags(){
      let tries = 0; (function tick(){
        const app:any = getApp(); const n:any = getNode();
        if (!app || !n) { if (++tries < 120) return setTimeout(tick, 500); else return; }

        app.get("/tx/inject/status", (_:any,res:any)=>{
          res.json({
            wrapped: state.wrapped,
            injectedBlocks: state.injectedBlocks,
            injectedTxs: state.injectedTxs,
            lastMethod: state.lastMethod,
            lastCount: state.lastCount,
            pendingLen: Array.isArray(n?.pendingTxs)? n.pendingTxs.length : null
          });
        });
        console.log("[diag] attached /tx/inject/status");
      })();
    })();

  }catch(e){ console.warn("[tx-inject] init failed:", e); }
})();
// -------------------------------------------------------------------------------

// --------------- [ADD] store.append wrapper to inject pending -> block.txs ----------
;(function wrapStoreAppendForTxInjection(){
  try{
    const g:any = globalThis as any;
    if (g.__void_store_inject_installed) return; g.__void_store_inject_installed = true;

    function getNode(){ return g.__void_node || g.node || g.VOID_NODE; }
    function getApp(){ return g.__void_http_app || g.app || undefined; }

    const state = {
      active: false,
      injectedBlocks: 0,
      injectedTxs: 0,
      lastInjectedAt: 0,
      lastCount: 0
    };

    function takePending(n:any, max=1000){
      try{
        const src:any[] = Array.isArray(n?.pendingTxs) ? n.pendingTxs
                       : Array.isArray(n?.pending)    ? n.pending : [];
        if (!src.length) return [];
        const k = Math.min(src.length, max);
        return src.splice(0, k); // move into block
      }catch{ return []; }
    }

    function wrap(){
      const n:any = getNode();
      if (!n || !n.store || typeof n.store.append !== "function") return false;
      const orig = n.store.append.bind(n.store);
      if ((n.store.append as any).__void_wrapped) return true;

      n.store.append = async function(block:any){
        try{
          if (block && Array.isArray(block.txs) && block.txs.length === 0){
            // inject right before it hits disk
            const moved = takePending(n, 1000);
            if (moved.length){
              block.txs = moved;
              state.injectedBlocks++; state.injectedTxs += moved.length;
              state.lastInjectedAt = Date.now(); state.lastCount = moved.length;
              console.log(`[tx-inject/store] injected ${moved.length} tx(s) into block #${block?.number ?? "?"}`);
            }
          }
        }catch{}
        return await orig(block);
      };
      (n.store.append as any).__void_wrapped = true;
      state.active = true;
      console.log("[tx-inject/store] store.append wrapper attached");
      return true;
    }

    // wait until node exists, then wrap once
    (function waitAndWrap(){
      let tries = 0; (function tick(){
        if (wrap()) return;
        if (++tries < 120) setTimeout(tick, 500);
      })();
    })();

    // diag
    (function attachDiag(){
      let tries = 0; (function tick(){
        const app:any = getApp(); const n:any = getNode();
        if (!app || !n) { if (++tries < 120) return setTimeout(tick, 500); else return; }
        app.get("/tx/inject2/status", (_:any,res:any)=>{
          res.json({
            active: state.active,
            injectedBlocks: state.injectedBlocks,
            injectedTxs: state.injectedTxs,
            lastCount: state.lastCount,
            pendingLen: Array.isArray(n?.pendingTxs)? n.pendingTxs.length : null
          });
        });
        console.log("[diag] attached /tx/inject2/status");
      })();
    })();

  }catch(e){ console.warn("[tx-inject/store] init failed:", e); }
})();
// --------------------------------------------------------------------------------

// ---------------- [ADD] store & node method introspection diags -----------------
;(function attachStoreNodeDiag(){
  try{
    const g:any = globalThis as any;
    function getApp(){ return g.__void_http_app || g.app || undefined; }
    function getNode(){ return g.__void_node || g.node || g.VOID_NODE; }

    let tries = 0; (function tick(){
      const app:any = getApp(); const n:any = getNode();
      if (!app || !n) { if (++tries < 120) return setTimeout(tick, 500); else return; }

      app.get("/store/diag", (_:any, res:any)=>{
        const s:any = n?.store;
        const names = s ? Object.getOwnPropertyNames(Object.getPrototypeOf(s)) : [];
        const out = names.map(k=>{
          let t = typeof (s as any)[k];
          let sig = null as null | string;
          try {
            if (t === "function") {
              const src = ((s as any)[k]).toString();
              sig = src.split("\n")[0].slice(0, 160);
            }
          } catch {}
          return { name:k, type:t, sig };
        });
        res.json({
          hasStore: !!s,
          protoKeys: out,
          ownKeys: Object.keys(s || {}),
          typeofAppend: s ? typeof s.append : null
        });
      });

      app.get("/node/diag", (_:any, res:any)=>{
        const keys = n ? Object.keys(n) : [];
        const fns = keys.filter(k=> typeof (n as any)[k]==="function");
        res.json({
          nodeKeys: keys,
          fnKeys: fns.slice().sort(),
          txQueueLen: Array.isArray(n?.txQueue) ? n.txQueue.length : null
        });
      });

      console.log("[diag] attached /store/diag and /node/diag");
    })();
  }catch{}
})();
// -------------------------------------------------------------------------------

// --------------- [ADD] universal store write wrapper (auto-detect) --------------
;(function wrapAnyStoreWriterForTxInjection(){
  try{
    const g:any = globalThis as any;
    if (g.__void_store_inject2_installed) return; g.__void_store_inject2_installed = true;

    function getNode(){ return g.__void_node || g.node || g.VOID_NODE; }
    function getApp(){ return g.__void_http_app || g.app || undefined; }

    const candidates = [
      "append","appendBlock","write","writeBlock","persist","saveBlock","put","add","commit"
    ];

    const state = {
      active: false,
      method: null as string | null,
      injectedBlocks: 0,
      injectedTxs: 0,
      lastInjectedAt: 0,
      lastCount: 0
    };

    function takePending(n:any, max=1000){
      try{
        const src:any[] = Array.isArray(n?.pendingTxs) ? n.pendingTxs
                       : Array.isArray(n?.pending)    ? n.pending : [];
        if (!src.length) return [];
        const k = Math.min(src.length, max);
        return src.splice(0, k); // move into block
      }catch{ return []; }
    }

    function looksLikeBlockArg(arg:any){
      if (!arg || typeof arg !== "object") return false;
      // loose check: number/timestamp/txs keys exist
      return ("number" in arg || "timestamp" in arg) && Array.isArray((arg as any).txs);
    }

    function wrap(){
      const n:any = getNode();
      if (!n || !n.store) return false;

      const s:any = n.store;
      for (const name of candidates){
        const fn:any = s[name];
        if (typeof fn === "function") {
          // Bind once
          if ((fn as any).__void_wrapped) { state.method = name; state.active = true; return true; }
          const orig = fn.bind(s);
          s[name] = async function(...args:any[]){
            try{
              if (args.length && looksLikeBlockArg(args[0])) {
                const block = args[0];
                if (Array.isArray(block.txs) && block.txs.length === 0){
                  const moved = takePending(n, 1000);
                  if (moved.length){
                    block.txs = moved;
                    state.injectedBlocks++; state.injectedTxs += moved.length;
                    state.lastInjectedAt = Date.now(); state.lastCount = moved.length;
                    console.log(`[tx-inject/store2] injected ${moved.length} tx(s) via ${name} into block #${block?.number ?? "?"}`);
                  }
                }
              }
            }catch{}
            return await orig(...args);
          };
          (s[name] as any).__void_wrapped = true;
          state.method = name;
          state.active = true;
          console.log(`[tx-inject/store2] wrapped store.${name}()`);
          return true;
        }
      }
      return false;
    }

    // Wait then wrap
    (function waitAndWrap(){
      let tries = 0; (function tick(){
        if (wrap()) return;
        if (++tries < 120) setTimeout(tick, 500);
      })();
    })();

    // diag endpoint
    (function attachDiag(){
      let tries = 0; (function tick(){
        const app:any = getApp(); const n:any = getNode();
        if (!app || !n) { if (++tries < 120) return setTimeout(tick, 500); else return; }
        app.get("/tx/inject3/status", (_:any,res:any)=>{
          res.json({
            active: state.active,
            method: state.method,
            injectedBlocks: state.injectedBlocks,
            injectedTxs: state.injectedTxs,
            lastCount: state.lastCount,
            pendingLen: Array.isArray(n?.pendingTxs)? n.pendingTxs.length : null
          });
        });
        console.log("[diag] attached /tx/inject3/status");
      })();
    })();

  }catch(e){ console.warn("[tx-inject/store2] init failed:", e); }
})();
// --------------------------------------------------------------------------------

// ---------------- [ADD] seal tap + block inspect diags (pure-add) ----------------
;(function tapOnSealedAndInspect(){
  try{
    const g:any = globalThis as any;
    if (g.__void_seal_tap_installed) return; g.__void_seal_tap_installed = true;

    function getNode(){ return g.__void_node || g.node || g.VOID_NODE; }
    function getApp(){ return g.__void_http_app || g.app || undefined; }

    const state = {
      last: null as null | { number:number|null, txsLen:number|null, when:number },
      count: 0
    };

    function wrapOnSealed(n:any){
      try{
        const prev = n.onSealed;
        n.onSealed = function sealedHook(b:any){
          try{
            const txsLen = Array.isArray(b?.txs) ? b.txs.length : null;
            state.last = { number: (b?.number ?? null), txsLen, when: Date.now() };
            state.count++;
            console.log(`[seal-tap] sealed #${b?.number ?? "?"} txs=${txsLen}`);
          }catch{}
          try{ return typeof prev === "function" ? prev.call(n, b) : undefined; }catch{}
        };
        return true;
      }catch{ return false; }
    }

    // Attach ASAP (node is set after construct; we published it)
    let tries = 0; (function tryWrap(){
      const n = getNode();
      if (!n) { if (++tries < 120) return setTimeout(tryWrap, 500); else return; }
      wrapOnSealed(n);
    })();

    // Diag routes
    (function diags(){
      let tries = 0; (function tick(){
        const app:any = getApp(); const n:any = getNode();
        if (!app || !n) { if (++tries < 120) return setTimeout(tick, 500); else return; }

        app.get("/dev/last-seal", (_:any,res:any)=> res.json({ last:state.last, count:state.count }));

        // Read the exact stored block from SegStore (not the shim)
        app.get("/blocks/:n/inspect", (req:any,res:any)=>{
          try{
            const num = Number(req.params.n);
            const blk = n?.store?.loadBlock ? n.store.loadBlock(num) : null;
            res.json({
              number: num,
              hasBlock: !!blk,
              txsLen: Array.isArray(blk?.txs) ? blk.txs.length : null,
              txsSample: Array.isArray(blk?.txs) ? blk.txs.slice(0, 3) : null
            });
          }catch(e){ res.json({ ok:false, error:String(e) }); }
        });

        console.log("[diag] attached /dev/last-seal and /blocks/:n/inspect");
      })();
    })();

  }catch(e){ console.warn("[seal-tap] init failed:", e); }
})();
// --------------------------------------------------------------------------------

// ---------------- [ADD] persisted block diag + saveBlock tap --------------------
;(function persistedBlockDiagAndSealRecord(){
  try{
    const g:any = globalThis as any;
    if (g.__void_persist_diag_installed) return; g.__void_persist_diag_installed = true;

    function getNode(){ return (globalThis as any).__void_node || (globalThis as any).node || (globalThis as any).VOID_NODE; }
    function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app || undefined; }

    const state = {
      last: null as null | { number:number, txsLen:number, when:number },
      count: 0
    };

    function tapSaveBlock(n:any){
      try{
        const s:any = n?.store;
        if (!s || typeof s.saveBlock !== "function") return false;
        if (s.__void_save_tapped) return true; // idempotent
        const orig = s.saveBlock.bind(s);
        s.saveBlock = function tappedSaveBlock(b:any){
          try{
            const txsLen = Array.isArray(b?.txs) ? b.txs.length : 0;
            state.last = { number: Number(b?.number ?? -1), txsLen, when: Date.now() };
            state.count++;
            console.log(`[seal-tap2] saveBlock(#${state.last.number}) txs=${txsLen}`);
          }catch{}
          return orig(b);
        };
        s.__void_save_tapped = true;
        return true;
      }catch{ return false; }
    }

    // Try to tap now or within ~60 seconds
    let tries = 0; (function tryTap(){
      const n = getNode();
      if (!n) { if (++tries < 120) return setTimeout(tryTap, 500); else return; }
      tapSaveBlock(n);
    })();

    // Diag routes: last sealed + persisted view
    (function diags(){
      let tries = 0; (function tick(){
        const app:any = getApp(); const n:any = getNode();
        if (!app || !n) { if (++tries < 120) return setTimeout(tick, 500); else return; }

        // Most recent sealed block (as recorded at saveBlock)
        app.get("/dev/last-seal2", (_:any,res:any)=> res.json({ last: state.last, count: state.count }));

        // Persisted block from SegStore (direct load, no shim)
        app.get("/blocks/:n/persisted", (req:any,res:any)=>{
          try{
            const num = Number(req.params.n);
            const blk = n?.store?.loadBlock ? n.store.loadBlock(num) : null;
            res.json({
              ok: true,
              number: num,
              hasBlock: !!blk,
              txsLen: Array.isArray(blk?.txs) ? blk.txs.length : null,
              txsSample: Array.isArray(blk?.txs) ? blk.txs.slice(0, 3) : null
            });
          }catch(e){ res.json({ ok:false, error:String(e) }); }
        });

        console.log("[diag] attached /dev/last-seal2 and /blocks/:n/persisted");
      })();
    })();
  }catch(e){ console.warn("[persist-diag] init failed:", e); }
})();
// -------------------------------------------------------------------------------

// --------------- [ADD] force tx injection at saveBlock + persisted full2 ----------
;(function forceTxsAtSaveBlockAndFull2(){
  try{
    const g:any = globalThis as any;
    if (g.__void_store_force_inject_installed) return; g.__void_store_force_inject_installed = true;

    function getNode(){ return g.__void_node || g.node || g.VOID_NODE; }
    function getApp(){ return g.__void_http_app || g.app || undefined; }

    const state = {
      active: false,
      wrapped: false,
      forcedBlocks: 0,
      forcedTxs: 0,
      lastForcedAt: 0,
      lastBlock: null as null | number,
      lastCount: 0
    };

    function harvestCandidates(n:any, max=1000){
      // Prefer real proposer pipeline; degrade gracefully
      const sets: any[][] = [];
      try {
        if (Array.isArray(n?.pendingTxs)) sets.push(n.pendingTxs);
        if (Array.isArray(n?.pending))    sets.push(n.pending);
        if (Array.isArray(n?.txQueue))    sets.push(n.txQueue);
        const mp:any = n?.mempool ?? n?.mPool ?? n?.txPool ?? null;
        if (mp){
          if (Array.isArray(mp.txs))   sets.push(mp.txs);
          if (Array.isArray(mp.queue)) sets.push(mp.queue);
          if (Array.isArray(mp))       sets.push(mp);
        }
        const gq:any = g.__void_txq;
        if (Array.isArray(gq)) sets.push(gq);
        if (Array.isArray(gq?.txs)) sets.push(gq.txs);
        if (Array.isArray(gq?.queue)) sets.push(gq.queue);
      } catch {}
      // merge (preserve order), dedupe by JSON string (dev-safe)
      const out:any[] = [];
      const seen = new Set<string>();
      for (const arr of sets){
        for (const t of (arr||[])){
          const k = typeof t === "object" ? JSON.stringify(t) : String(t);
          if (!seen.has(k)){
            seen.add(k);
            out.push(t);
            if (out.length >= max) return out;
          }
        }
      }
      return out;
    }

    function wrap(){
      const n:any = getNode();
      const s:any = n?.store;
      if (!n || !s || typeof s.saveBlock !== "function") return false;
      if (s.__void_force_inject_wrapped) return true;

      const orig = s.saveBlock.bind(s);
      s.saveBlock = function saveBlockForced(b:any){
        try{
          if (!b || typeof b !== "object") return orig(b);
          if (!Array.isArray(b.txs)) b.txs = [];
          if (b.txs.length === 0){
            const cands = harvestCandidates(n, 1000);
            if (cands.length > 0){
              // inject a copy; do not mutate sources here
              b.txs.push(...cands);
              state.forcedBlocks++;
              state.forcedTxs += cands.length;
              state.lastForcedAt = Date.now();
              state.lastBlock = Number(b.number ?? -1);
              state.lastCount = cands.length;
              console.log(`[tx-inject/force] injected ${cands.length} tx → block #${b.number}`);
            }
          }
          return orig(b);
        }catch(e){
          console.warn("[tx-inject/force] error:", e);
          return orig(b);
        }
      };

      s.__void_force_inject_wrapped = true;
      state.wrapped = true;
      state.active = true;
      console.log("[tx-inject/force] wrapped store.saveBlock()");
      return true;
    }

    // Try now and retry briefly until node/store exist
    let tries=0;(function tryWrap(){
      if (wrap()) return;
      if (++tries < 120) return setTimeout(tryWrap, 500);
    })();

    // Diag: status + persisted full2 (raw SegStore block JSON)
    (function attachDiags(){
      let tries=0;(function tick(){
        const app:any = getApp(); const n:any = getNode();
        if (!app || !n){ if (++tries<120) return setTimeout(tick,500); else return; }

        app.get("/tx/inject3/status", (_:any,res:any)=>res.json({
          active: state.active,
          wrapped: state.wrapped,
          forcedBlocks: state.forcedBlocks,
          forcedTxs: state.forcedTxs,
          lastForcedAt: state.lastForcedAt,
          lastBlock: state.lastBlock,
          lastCount: state.lastCount
        }));

        app.get("/blocks/:n/full2", (req:any,res:any)=>{
          try{
            const num = Number(req.params.n);
            const blk = n?.store?.loadBlock ? n.store.loadBlock(num) : null;
            res.json(blk ?? { ok:false, hasBlock:false, number:num });
          }catch(e){ res.json({ ok:false, error:String(e) }); }
        });

        console.log("[diag] attached /tx/inject3/status and /blocks/:n/full2");
      })();
    })();
  }catch(e){ console.warn("[tx-inject/force] init failed:", e); }
})();
// --------------------------------------------------------------------------------

// --------------- [ADD] persisted txs diag (canonical from SegStore) --------------
;(function attachPersistedTxsDiag(){
  try{
    const g:any = globalThis as any;
    function getApp(){ return g.__void_http_app || g.app || undefined; }
    function getNode(){ return g.__void_node || g.node || g.VOID_NODE; }

    let tries=0;(function tick(){
      const app:any = getApp(); const n:any = getNode();
      if (!app || !n) { if (++tries<120) return setTimeout(tick,500); else return; }

      app.get("/dev/blocks/:n/txs/persisted", (req:any, res:any)=>{
        try{
          const num = Number(req.params.n);
          const blk = n?.store?.loadBlock ? n.store.loadBlock(num) : null;
          if (!blk) return res.json({ ok:false, hasBlock:false, number:num });
          res.json({ ok:true, number: blk.number ?? num, len: Array.isArray(blk.txs)? blk.txs.length : 0, txs: blk.txs ?? [] });
        }catch(e){ res.json({ ok:false, error:String(e) }); }
      });

      console.log("[diag] attached /dev/blocks/:n/txs/persisted");
    })();
  }catch(e){ console.warn("[diag] persisted txs attach failed:", e); }
})();
// ---------------------------------------------------------------------------------

// ---------------- [ADD] pending canon + compactor + routes ----------------------
;(function canonizePendingToMempool(){
  try{
    const g:any = globalThis as any;
    if (g.__void_pending_canon_installed) return; g.__void_pending_canon_installed = true;

    function getNode(){ return g.__void_node || g.node || g.VOID_NODE; }
    function getApp(){ return g.__void_http_app || g.app || undefined; }

    function getMP(n:any){
      if (!n) return null;
      const mp = n.mempool ?? n.mPool ?? n.txPool ?? null;
      if (!mp) return null;
      // normalize
      if (!Array.isArray(mp.txs))  mp.txs  = Array.isArray(mp.queue) ? mp.queue : (Array.isArray(mp) ? mp : (mp.txs||[]));
      if (typeof mp.size !== "function") mp.size = ()=> Array.isArray(mp.txs) ? mp.txs.length :
                                                   Array.isArray(mp.queue) ? mp.queue.length :
                                                   Array.isArray(mp)      ? mp.length : 0;
      return mp;
    }

    function toKey(t:any){
      try{ return typeof t === "string" ? t : JSON.stringify(t); }catch{ return String(t); }
    }

    // Make pending/pendingTxs *identical* to mempool.txs to avoid double counting
    function rebindPending(n:any){
      const mp = getMP(n); if (!n || !mp) return { ok:false, reason:"no mempool" };
      n.pendingTxs = mp.txs;
      n.pending    = mp.txs;
      return { ok:true, size: mp.size() };
    }

    // Remove duplicates in-place on mp.txs
    function compactMempool(n:any){
      const mp = getMP(n); if (!mp) return { ok:false };
      const arr = mp.txs; if (!Array.isArray(arr)) return { ok:false };
      const seen = new Set<string>();
      let w = 0;
      for (let i=0;i<arr.length;i++){
        const k = toKey(arr[i]);
        if (seen.has(k)) continue;
        seen.add(k);
        arr[w++] = arr[i];
      }
      if (w < arr.length) arr.splice(w);
      return { ok:true, size: arr.length };
    }

    // Hook onSealed to purge any txs that just sealed from pending/mempool
    function installSealPurged(n:any){
      const prev = n.onSealed;
      n.onSealed = function sealed(b:any){
        try{
          const mp = getMP(n);
          const arr:any[] = Array.isArray(mp?.txs) ? mp.txs : [];
          if (Array.isArray(b?.txs) && arr.length){
            const want = new Set(b.txs.map(toKey));
            for (let i=arr.length-1;i>=0;i--){
              if (want.has(toKey(arr[i]))) arr.splice(i,1);
            }
          }
        }catch{}
        try{ return typeof prev === "function" ? prev.call(n,b) : undefined; }catch{}
      };
    }

    // Attach once app+node exist
    let tries=0;(function tick(){
      const n = getNode(); const app = getApp();
      if (!n || !app){ if (++tries<120) return setTimeout(tick,500); else return; }

      // first pass
      rebindPending(n); compactMempool(n); installSealPurged(n);

      app.get("/pending/canon/status", (_:any,res:any)=>{
        const mp = getMP(n);
        res.json({
          ok: !!mp, mpSize: mp?.size ? mp.size() : null,
          samePendingIsMempoolTxs: n?.pending === mp?.txs,
          samePendingTxsIsMempoolTxs: n?.pendingTxs === mp?.txs
        });
      });

      app.post("/pending/canon/compact", (_:any,res:any)=>{
        res.json(compactMempool(n));
      });

      app.post("/pending/canon/rebind", (_:any,res:any)=>{
        res.json(rebindPending(n));
      });

      console.log("[pending] canon + compactor + purge installed");
    })();
  }catch(e){ console.warn("[pending] canon attach failed:", e); }
})();
// --------------------------------------------------------------------------------

// --------------- [ADD] saveBlock merge-all safeguard (idempotent) ---------------
;(function wrapSaveBlockMergeAll(){
  try{
    const g:any = globalThis as any;
    if (g.__void_store_mergeall_installed) return; g.__void_store_mergeall_installed = true;

    function getNode(){ return g.__void_node || g.node || g.VOID_NODE; }
    function allSources(n:any){
      const sets:any[][] = [];
      try{
        if (Array.isArray(n?.pendingTxs)) sets.push(n.pendingTxs);
        if (Array.isArray(n?.pending))    sets.push(n.pending);
        if (Array.isArray(n?.txQueue))    sets.push(n.txQueue);
        const mp:any = n?.mempool ?? n?.mPool ?? n?.txPool ?? null;
        if (mp){
          if (Array.isArray(mp.txs))   sets.push(mp.txs);
          if (Array.isArray(mp.queue)) sets.push(mp.queue);
          if (Array.isArray(mp))       sets.push(mp);
        }
        if (Array.isArray(g?.__void_txq)) sets.push(g.__void_txq);
      }catch{}
      return sets;
    }
    function toKey(t:any){ try{ return typeof t==="string" ? t : JSON.stringify(t); }catch{ return String(t); } }

    function mergeInto(target:any[], max:number, sources:any[][]){
      const want = new Set<string>();
      for (const t of target) want.add(toKey(t));
      let added = 0;
      for (const src of sources){
        if (!Array.isArray(src) || !src.length) continue;
        for (let i=0;i<src.length && (target.length+added)<max;i++){
          const k = toKey(src[i]);
          if (want.has(k)) continue;
          target.push(src[i]); want.add(k); added++;
        }
      }
      return added;
    }

    function drainFrom(sources:any[][], picked:any[]){
      // Best-effort: remove those exact picked from each array (by key)
      const keys = new Set(picked.map(toKey));
      for (const src of sources){
        if (!Array.isArray(src) || !src.length) continue;
        for (let i=src.length-1;i>=0;i--){
          if (keys.has(toKey(src[i]))) src.splice(i,1);
        }
      }
    }

    const state = { active:false, wrapped:false, injectedBlocks:0, injectedTxs:0, lastBlock:-1, lastCount:0 };

    let tries=0;(function tick(){
      const n:any = getNode(); const s:any = n?.store;
      if (!n || !s || typeof s.saveBlock!=="function"){ if (++tries<120) return setTimeout(tick,500); else return; }

      if (s.__void_save_merge_wrapped) return;
      s.__void_save_merge_wrapped = true;
      state.active = true;

      const orig = s.saveBlock.bind(s);
      s.saveBlock = function mergedSaveBlock(b:any){
        try{
          if (b && Array.isArray(b.txs) && b.txs.length===0){
            const sources = allSources(n);
            const added = mergeInto(b.txs, /*max*/1000, sources);
            if (added>0){
              state.injectedBlocks++; state.injectedTxs += added;
              state.lastBlock = Number(b.number ?? -1); state.lastCount = added;
              // Clean picked from sources so they don’t linger in queues
              drainFrom(sources, b.txs.slice(-added));
              console.log(`[tx-merge-all] saveBlock(#${state.lastBlock}) added ${added} tx`);
            }
          }
        }catch(e){ console.warn("[tx-merge-all] merge failed:", e); }
        return orig(b);
      };

      // status route
      (function attachStatus(){
        try{
          const app:any = (globalThis as any).__void_http_app || (globalThis as any).app || undefined;
          if (!app) return;
          app.get("/tx/mergeall/status", (_:any,res:any)=>{
            res.json({ active: state.active, injectedBlocks: state.injectedBlocks, injectedTxs: state.injectedTxs, lastBlock: state.lastBlock, lastCount: state.lastCount });
          });
          console.log("[tx-merge-all] active (saveBlock)");
        }catch{}
      })();
    })();
  }catch(e){ console.warn("[tx-merge-all] install failed:", e); }
})();
// --------------------------------------------------------------------------------

// ---------------- [ADD] dev burst submit + nudge -------------------------------
;(function attachBurstSubmit(){
  try{
    const g:any = globalThis as any;
    const getApp=()=> (g.__void_http_app || g.app || undefined);
    const getNode=()=> (g.__void_node || g.node || g.VOID_NODE);

    let tries=0;(function tick(){
      const app:any = getApp(); const n:any = getNode();
      if (!app || !n){ if(++tries<120) return setTimeout(tick,500); else return; }

      app.post("/tx/dev/burst", async (req:any,res:any)=>{
        const count = Math.max(1, Math.min( Number(req?.query?.n ?? 5), 100 ));
        const now = Date.now();
        const gq:any = (g.__void_txq ||= []);
        for (let i=0;i<count;i++) gq.push({ data:`dev-burst-${now}-${i}` });

        // try to move globals -> mempool immediately if our bridge exists
        try{ await fetch(`http://127.0.0.1:${process.env.HTTP_PORT||4100}/mempool/global/drain-now`,{method:"POST"}); }catch{}
        // nudge proposer candidates
        for (const k of ["tickNow","tick","propose","buildBlock","proposeBlock","sealNext"]){
          try{
            if (typeof (n[k])==="function"){ await Promise.resolve(n[k]()); break; }
            if (n.proposer && typeof n.proposer[k]==="function"){ await Promise.resolve(n.proposer[k]()); break; }
          }catch{}
        }
        res.json({ ok:true, enqueued: count });
      });

      console.log("[dev] attached /tx/dev/burst?n=NUM");
    })();
  }catch(e){ console.warn("[dev] burst attach failed:", e); }
})();
// --------------------------------------------------------------------------------

// --------------- [ADD] cap per-block tx injection + live control ----------------
;(function capPerBlockInjection(){
  try{
    const g:any = globalThis as any;
    if (g.__void_merge_cap_installed) return; g.__void_merge_cap_installed = true;

    // Live config (defaults)
    const cfg = {
      maxPerBlock: Number(process.env.TXS_PER_BLOCK_MAX || 3),   // cap per seal
      enabled: true
    };
    // Allow live tweaks without restart
    Object.defineProperty(globalThis as any, "__VOID_INJECT_CAP", { get:()=>cfg });

    function getApp(){ return (g.__void_http_app || g.app || undefined); }
    function getNode(){ return (g.__void_node || g.node || g.VOID_NODE); }

    // Helper so our earlier merge-all wrapper uses the cap if present
    (g as any).__VOID_PICK_LIMIT = function(limit:number){
      if (!cfg.enabled) return limit;
      return Math.min(limit, Math.max(0, Number(cfg.maxPerBlock)||0));
    }

    // Control routes
    let tries=0;(function tick(){
      const app:any=getApp(); const n:any=getNode();
      if (!app || !n){ if(++tries<120) return setTimeout(tick,500); else return; }

      app.get("/tx/merge/cap/status", (_:any,res:any)=>{
        res.json({ enabled: cfg.enabled, maxPerBlock: cfg.maxPerBlock });
      });
      app.post("/tx/merge/cap/set", (req:any,res:any)=>{
        const q = req?.query||{};
        if (q.enabled !== undefined) cfg.enabled = String(q.enabled)!=="false";
        if (q.max !== undefined)     cfg.maxPerBlock = Math.max(0, Number(q.max)||0);
        res.json({ ok:true, enabled: cfg.enabled, maxPerBlock: cfg.maxPerBlock });
      });
      console.log("[tx-merge-cap] live control at /tx/merge/cap/*");
    })();
  }catch(e){ console.warn("[tx-merge-cap] install failed:", e); }
})();
// --------------------------------------------------------------------------------

// --------------- [ADD] merge-all limiter hook integration ----------------------
;(function integrateCapWithMergeAll(){
  try{
    const g:any = globalThis as any;
    if (g.__void_merge_limit_integrated) return; g.__void_merge_limit_integrated = true;

    // Monkey-patch the limiter into the global if missing, as a no-op fallback
    if (typeof (g as any).__VOID_PICK_LIMIT !== "function"){
      (g as any).__VOID_PICK_LIMIT = (n:number)=>n; // no-op if cap module not yet loaded
    }

    // Wrap Array#push usage is too risky; instead we expose a helper the merge-all uses:
    // In our earlier merge-all `mergeInto(target, max, sources)`, it uses `max=1000`.
    // With this hook, code inside that wrapper can call __VOID_PICK_LIMIT(max).
    // If you didn’t paste the exact earlier version, this still remains harmless.
    console.log("[tx-merge-cap] limiter ready");
  }catch{}
})();
// --------------------------------------------------------------------------------

// -------- [ADD] hard cap at saveBlock regardless of upstream injectors ---------
;(function enforceCapAtSaveBlock(){
  try{
    const g:any = globalThis as any;
    if (g.__void_enforce_cap_saveblock_installed) return; 
    g.__void_enforce_cap_saveblock_installed = true;

    function getNode(){ return g.__void_node || g.node || g.VOID_NODE; }
    function getApp(){ return g.__void_http_app || g.app || undefined; }

    // Read live cap from the module we added earlier; fallback to env or 3
    function currentCap(){
      try{
        const cfg = (g as any).__VOID_INJECT_CAP;
        if (cfg && cfg.enabled) return Math.max(0, Number(cfg.maxPerBlock)||0);
      }catch{}
      return Math.max(0, Number(process.env.TXS_PER_BLOCK_MAX || 3) || 0);
    }

    // Canonical source: mempool.txs (we aliased pending/pendingTxs to this earlier)
    function mempoolTxs(n:any){
      const mp = n?.mempool ?? n?.mPool ?? n?.txPool ?? null;
      if (!mp) return null;
      return Array.isArray(mp.txs) ? mp.txs :
             Array.isArray(mp.queue) ? mp.queue :
             (Array.isArray(mp) ? mp : null);
    }

    const state = { enforcedBlocks:0, moved:0, lastBlock:-1, lastUsed:0 };

    function install(){
      const n:any = getNode(); if (!n || !n.store) return false;
      const s:any = n.store;
      if (typeof s.saveBlock !== "function") return false;
      if (s.__void_cap_enforced) return true;
      const orig = s.saveBlock.bind(s);

      s.saveBlock = function saveBlockWithCap(b:any){
        try{
          const cap = currentCap();
          if (cap > 0) {
            // Ensure b.txs exists
            if (!Array.isArray(b.txs)) b.txs = [];
            // If upstream injected > cap, trim (leave extras in mempool for next seal)
            if (b.txs.length > cap) {
              // push extras back to mempool head (keep order simple: newest first)
              const src = mempoolTxs(n);
              if (src) {
                const extras = b.txs.splice(cap); // remove beyond cap
                // Put back at the front to be taken next time
                while (extras.length) src.unshift(extras.pop());
              }
              state.moved += 0; // trimming doesn’t count as “moved in”
              state.lastUsed = cap;
            } else if (b.txs.length < cap) {
              // Top-up from mempool up to cap
              const src = mempoolTxs(n);
              if (src && src.length){
                const need = Math.max(0, cap - b.txs.length);
                const take = Math.min(need, src.length);
                for (let i=0;i<take;i++) b.txs.push(src.shift());
                state.moved += take;
                state.lastUsed = b.txs.length;
              }
            } else {
              state.lastUsed = cap;
            }
            state.enforcedBlocks++;
            state.lastBlock = Number(b?.number ?? -1);
          }
        }catch{}
        return orig(b);
      };

      s.__void_cap_enforced = true;
      return true;
    }

    // Diag route
    let tries=0;(function tick(){
      const ok = install(); const app:any = getApp();
      if (app){
        app.get("/tx/merge/cap/enforce/status", (_:any,res:any)=>{
          res.json({ ok:true, enforcedBlocks: state.enforcedBlocks, moved: state.moved, lastBlock: state.lastBlock, lastUsed: state.lastUsed, cap: currentCap() });
        });
        console.log("[tx-cap-enforce] installed; diag at /tx/merge/cap/enforce/status");
      }
      if (!ok && ++tries<120) return setTimeout(tick,500);
    })();
  }catch(e){ console.warn("[tx-cap-enforce] failed:", e); }
})();
// --------------------------------------------------------------------------------

// -------- [ADD] no-empty-when-queued policy + live controls/diag ----------------
;(function noEmptyWhenQueuedPolicy(){
  try{
    const g:any = globalThis as any;
    if (g.__void_no_empty_policy_installed) return;
    g.__void_no_empty_policy_installed = true;

    // Live config
    const cfg = {
      enabled: (String(process.env.NO_EMPTY_WHEN_QUEUED || "true") !== "false"),
      // If true: instead of skipping persist, we'll auto-top-up from mempool up to cap.
      // If false: we skip persist and nudge the proposer to try again next tick.
      fillInsteadOfSkip: true
    };
    Object.defineProperty(globalThis as any, "__VOID_NO_EMPTY_CFG", { get:()=>cfg });

    function getNode(){ return (globalThis as any).__void_node || (globalThis as any).node || (globalThis as any).VOID_NODE; }
    function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app || undefined; }

    function currentCap(){
      try{
        const capCfg = (globalThis as any).__VOID_INJECT_CAP;
        if (capCfg && capCfg.enabled) return Math.max(0, Number(capCfg.maxPerBlock)||0);
      }catch{}
      return Math.max(0, Number(process.env.TXS_PER_BLOCK_MAX || 3) || 0);
    }

    function mempoolTxs(n:any){
      const mp = n?.mempool ?? n?.mPool ?? n?.txPool ?? null;
      if (!mp) return null;
      return Array.isArray(mp.txs) ? mp.txs :
             Array.isArray(mp.queue) ? mp.queue :
             (Array.isArray(mp) ? mp : null);
    }

    const state = { enforced:0, skipped:0, filled:0, lastBlock:-1, lastFill:0 };

    function install(){
      const n:any = getNode(); if (!n || !n.store) return false;
      const s:any = n.store;
      if (typeof s.saveBlock !== "function") return false;
      if (s.__void_no_empty_policy_applied) return true;

      const orig = s.saveBlock.bind(s);
      s.saveBlock = function saveBlockNoEmpty(b:any){
        try{
          if (!cfg.enabled) return orig(b);
          const txs = Array.isArray(b?.txs) ? b.txs : (b.txs = []);
          const src = mempoolTxs(n);
          const cap = currentCap();

          if (txs.length === 0 && src && src.length > 0){
            if (cfg.fillInsteadOfSkip){
              // Fill up to cap (>=1); if cap==0, take 1 to avoid deadlock
              const want = Math.max(1, cap || 1);
              const take = Math.min(want, src.length);
              for (let i=0;i<take;i++) txs.push(src.shift());
              state.filled += take; state.lastFill = take;
              state.enforced++; state.lastBlock = Number(b?.number ?? -1);
              // Continue to persist with the newly filled txs
              return orig(b);
            } else {
              // Skip persist, nudge proposer to try again with pending tx
              state.skipped++; state.lastBlock = Number(b?.number ?? -1);
              try{
                const cands = ["tickNow","tick","propose","proposeBlock","buildBlock","sealNext"];
                for (const k of cands){
                  const f = (typeof (n as any)[k] === "function") ? (n as any)[k]
                         : (n?.proposer && typeof n.proposer[k] === "function") ? n.proposer[k] : null;
                  if (f){ try{ f.call(n); }catch{} break; }
                }
              }catch{}
              return; // do not persist an empty block when queue has txs
            }
          }
        }catch{}
        return orig(b);
      };

      s.__void_no_empty_policy_applied = true;
      return true;
    }

    // Controls + diag
    let tries=0;(function tick(){
      const ok = install(); const app:any = getApp();
      if (app){
        app.get("/blocks/empty-policy/status", (_:any,res:any)=>{
          res.json({ enabled: cfg.enabled, fillInsteadOfSkip: cfg.fillInsteadOfSkip, enforced: state.enforced, filled: state.filled, skipped: state.skipped, lastBlock: state.lastBlock });
        });
        app.post("/blocks/empty-policy/set", (req:any,res:any)=>{
          const q = req?.query||{};
          if (q.enabled !== undefined) cfg.enabled = String(q.enabled)!=="false";
          if (q.fill !== undefined)    cfg.fillInsteadOfSkip = String(q.fill)!=="false";
          res.json({ ok:true, enabled: cfg.enabled, fillInsteadOfSkip: cfg.fillInsteadOfSkip });
        });
        console.log("[no-empty] policy installed; diag at /blocks/empty-policy/status");
      }
      if (!ok && ++tries<120) return setTimeout(tick,500);
    })();
  }catch(e){ console.warn("[no-empty] policy failed:", e); }
})();
// --------------------------------------------------------------------------------

// ---------------- Mempool dev helpers (additive, no deps) --------------------
(function mempoolDevRoutes(){
  let tries = 0, attached = false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app || undefined; }
  function getNode(){ return (globalThis as any).__void_node || (globalThis as any).node || undefined; }

  async function attach(){
    const app:any = getApp();
    if (!app || typeof app.get !== "function") { if (++tries < 60) return setTimeout(attach, 500); return; }
    if (attached) return; attached = true;

    // GET /tx/dev/size  -> { size }
    app.get("/tx/dev/size", async (_req:any, res:any) => {
      try{
        const node:any = getNode();
        const arr:any[] = node?.mempool?.txs || node?.pending?.pendingTxs || [];
        res.json({ ok:true, size:Array.isArray(arr)?arr.length:0 });
      }catch(e:any){ res.status(500).json({ ok:false, error:String(e?.message||e) }); }
    });

    // POST /tx/dev/flush -> { removed }
    app.post("/tx/dev/flush", async (_req:any, res:any) => {
      try{
        const node:any = getNode();
        let removed = 0;
        if (node?.mempool?.txs && Array.isArray(node.mempool.txs)) {
          removed = node.mempool.txs.length;
          node.mempool.txs.length = 0;   // clear in place
        } else if (node?.pending?.pendingTxs && Array.isArray(node.pending.pendingTxs)) {
          removed = node.pending.pendingTxs.length;
          node.pending.pendingTxs.length = 0;
        }
        res.json({ ok:true, removed });
      }catch(e:any){ res.status(500).json({ ok:false, error:String(e?.message||e) }); }
    });
  }
  attach();
})();

// ---------------- Tagged burst + txRoot dev utilities (additive) --------------------
(function devTaggedBurstAndTxRoot(){
  let tries = 0, attached = false;
  function app(){ return (globalThis as any).__void_http_app || (globalThis as any).app || undefined; }
  function node(){ return (globalThis as any).__void_node || (globalThis as any).node || undefined; }
  const port = Number(process.env.HTTP_PORT || process.env.VOID_HTTP_PORT || 4100);

  // in-mem dev counters (Prometheus-style)
  const devCounters = {
    txroot_computed_total: 0,
    txroot_mismatch_total: 0,
  };

  // simple SHA-256 helper
  async function sha256Hex(data: string | Uint8Array){
    const { createHash } = await import('node:crypto');
    const h = createHash('sha256'); h.update(data); return '0x'+h.digest('hex');
  }

  // Merkle over array of hex strings (pair-wise, dup last if odd)
  async function merkleRoot(leavesHex: string[]){
    if (leavesHex.length === 0) return await sha256Hex(new Uint8Array());
    let layer = leavesHex.slice();
    while (layer.length > 1) {
      const next:string[] = [];
      for (let i=0;i<layer.length;i+=2){
        const a = layer[i];
        const b = layer[i+1] ?? layer[i];
        const ab = a + b;
        next.push(await sha256Hex(ab));
      }
      layer = next;
    }
    return layer[0];
  }

  // Compute txRoot from a block object { txs: [...] } by hashing each tx's stable JSON
  async function computeTxRootFromBlock(block:any){
    const txs:any[] = Array.isArray(block?.txs) ? block.txs : [];
    const leaves:string[] = [];
    for (const tx of txs){
      // stable stringify: keys sorted
      const s = JSON.stringify(tx, Object.keys(tx).sort());
      leaves.push(await sha256Hex(s));
    }
    return await merkleRoot(leaves);
  }

  // fetch persisted txs for block n via existing dev route
  async function fetchPersistedTxs(n:number){
    const r = await fetch(`http://127.0.0.1:${port}/dev/blocks/${n}/txs/persisted`);
    if (!r.ok) throw new Error(`persisted fetch ${n} -> HTTP ${r.status}`);
    return await r.json(); // {number, len, txs:[...], ...}
  }

  // tiny helper: filter array by equality on .tag
  function filterByTag(arr:any[], tag:string){ return (arr||[]).filter(x => x && x.tag === tag); }

  async function attach(){
    const a:any = app();
    if (!a || typeof a.get !== "function") { if (++tries < 60) return setTimeout(attach, 500); return; }
    if (attached) return; attached = true;

    // POST /tx/dev/burst2?n=7&tag=RUN123
    // Enqueues n synthetic dev txs with a visible {kind:"dev", tag, ts, nonce}
    a.post("/tx/dev/burst2", async (req:any, res:any) => {
      try{
        const nparam = Number((req.query?.n ?? '1'));
        const ncount = Number.isFinite(nparam) && nparam > 0 ? Math.min(nparam, 5000) : 1;
        const tag = String(req.query?.tag ?? `RUN-${Date.now()}`);
        const nd = node();
        const arr:any[] =
          (nd?.mempool?.txs && Array.isArray(nd.mempool.txs)) ? nd.mempool.txs :
          (nd?.pending?.pendingTxs && Array.isArray(nd.pending.pendingTxs)) ? nd.pending.pendingTxs :
          (() => { throw new Error("mempool array not found"); })();

        const baseTs = Date.now();
        const before = arr.length;
        for (let i=0;i<ncount;i++){
          arr.push({
            kind: "dev",
            tag,
            ts: baseTs + i,
            nonce: (before + i + 1),
            payload: { bytes: Math.floor(Math.random()*256) }
          });
        }
        res.json({ ok:true, enqueued:ncount, tag, mempoolSize: arr.length });
      }catch(e:any){
        res.status(500).json({ ok:false, error:String(e?.message||e) });
      }
    });

    // GET /dev/blocks/:n/txs/persisted/by-tag?tag=RUN123  -> { n, tag, count }
    a.get("/dev/blocks/:n/txs/persisted/by-tag", async (req:any, res:any) => {
      try{
        const n = Number(req.params.n);
        const tag = String(req.query?.tag ?? "");
        const persisted = await fetchPersistedTxs(n);
        const arr = filterByTag(persisted?.txs || [], tag);
        res.json({ ok:true, number:n, tag, count:arr.length });
      }catch(e:any){
        res.status(500).json({ ok:false, error:String(e?.message||e) });
      }
    });

    // GET /dev/blocks/:n/txroot -> { computed, header, match }
    a.get("/dev/blocks/:n/txroot", async (req:any, res:any) => {
      try{
        const n = Number(req.params.n);
        const persisted = await fetchPersistedTxs(n);
        const blockLike = { txs: persisted?.txs || [] };
        const computed = await computeTxRootFromBlock(blockLike);

        // optional: read header's txRoot if your /blocks/:n/full2 provides it
        let headerRoot:string|undefined;
        try {
          const r = await fetch(`http://127.0.0.1:${port}/blocks/${n}/full2`);
          if (r.ok) {
            const full = await r.json();
            headerRoot = full?.header?.txRoot || full?.txRoot || undefined;
          }
        } catch {}

        const match = (headerRoot && headerRoot === computed) || false;
        devCounters.txroot_computed_total++;
        if (headerRoot && headerRoot !== computed) devCounters.txroot_mismatch_total++;
        res.json({ ok:true, number:n, computed, header:headerRoot ?? null, match });
      }catch(e:any){
        res.status(500).json({ ok:false, error:String(e?.message||e) });
      }
    });

    // POST /dev/blocks/txroot/recompute?from=…&to=…
    a.post("/dev/blocks/txroot/recompute", async (req:any, res:any) => {
      try{
        const from = Number(req.query?.from ?? 0);
        const to   = Number(req.query?.to ?? from);
        let computed=0, mismatches=0;
        for (let n=from; n<=to; n++){
          try{
            const persisted = await fetchPersistedTxs(n);
            const blockLike = { txs: persisted?.txs || [] };
            const root = await computeTxRootFromBlock(blockLike);
            let headerRoot:string|undefined;
            try {
              const r = await fetch(`http://127.0.0.1:${port}/blocks/${n}/full2`);
              if (r.ok) { const full = await r.json(); headerRoot = full?.header?.txRoot || full?.txRoot; }
            } catch {}
            devCounters.txroot_computed_total++;
            computed++;
            if (headerRoot && headerRoot !== root) { devCounters.txroot_mismatch_total++; mismatches++; }
          }catch{}
        }
        res.json({ ok:true, from, to, computed, mismatches });
      }catch(e:any){
        res.status(500).json({ ok:false, error:String(e?.message||e) });
      }
    });

    // GET /metrics/dev  (Prometheus format for the above counters)
    a.get("/metrics/dev", (_req:any, res:any) => {
      res.type("text/plain").send(
        [
          "# HELP void_txroot_computed_total Number of txRoot computations performed (dev).",
          "# TYPE void_txroot_computed_total counter",
          `void_txroot_computed_total ${devCounters.txroot_computed_total}`,
          "# HELP void_txroot_mismatch_total Number of txRoot mismatches (header vs computed) (dev).",
          "# TYPE void_txroot_mismatch_total counter",
          `void_txroot_mismatch_total ${devCounters.txroot_mismatch_total}`,
          ""
        ].join("\n")
      );
    });
  }
  attach();
})();

// ---------------- Mempool GC watcher + /blocks/:n/full3 (additive) -------------------
(function mempoolGcAndFull3(){
  let tries = 0, attached = false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app || undefined; }
  function getNode(){ return (globalThis as any).__void_node || (globalThis as any).node || undefined; }
  const port = Number(process.env.HTTP_PORT || process.env.VOID_HTTP_PORT || 4100);

  // stable JSON helper for id
  function stableId(tx:any){
    if (!tx || typeof tx !== 'object') return '';
    const keys = Object.keys(tx).sort();
    return JSON.stringify(tx, keys);
  }

  async function sha256Hex(data: string | Uint8Array){
    const { createHash } = await import('node:crypto');
    const h = createHash('sha256'); h.update(data); return '0x'+h.digest('hex');
  }
  async function merkleRoot(leavesHex: string[]){
    if (leavesHex.length === 0) return await sha256Hex(new Uint8Array());
    let layer = leavesHex.slice();
    while (layer.length > 1) {
      const next:string[] = [];
      for (let i=0;i<layer.length;i+=2){
        const a = layer[i];
        const b = layer[i+1] ?? layer[i];
        next.push(await sha256Hex(a + b));
      }
      layer = next;
    }
    return layer[0];
  }
  async function computeTxRootFromTxs(txs:any[]){
    const leaves:string[] = [];
    for (const tx of (Array.isArray(txs)?txs:[])){
      const s = JSON.stringify(tx, Object.keys(tx).sort());
      leaves.push(await sha256Hex(s));
    }
    return await merkleRoot(leaves);
  }

  async function fetchJson(url:string){
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
    return await r.json();
  }

  // Background loop: after each head bump, remove persisted txs from mempool
  async function gcLoop(){
    const nd:any = getNode();
    const app:any = getApp();
    if (!nd || !app) return setTimeout(gcLoop, 500);

    const getHead = async ()=> Number(await (await fetch(`http://127.0.0.1:${port}/blocks/latest/number`)).text());
    let last = -1;
    while (true){
      try{
        const head = await getHead();
        if (Number.isFinite(head) && head > last){
          // pull persisted txs for this block
          const persisted = await fetchJson(`http://127.0.0.1:${port}/dev/blocks/${head}/txs/persisted`);
          const sealed:any[] = persisted?.txs || [];
          if (sealed.length){
            // choose mempool array reference
            let pool:any[] = [];
            if (nd?.mempool?.txs && Array.isArray(nd.mempool.txs)) pool = nd.mempool.txs;
            else if (nd?.pending?.pendingTxs && Array.isArray(nd.pending.pendingTxs)) pool = nd.pending.pendingTxs;

            if (Array.isArray(pool) && pool.length){
              // build a set of sealed IDs
              const sealedIds = new Set(sealed.map(stableId));
              // in-place filter: keep only items NOT sealed
              let w = 0;
              for (let r=0; r<pool.length; r++){
                const keep = !sealedIds.has(stableId(pool[r]));
                if (keep) pool[w++] = pool[r];
              }
              if (w !== pool.length) pool.length = w;
            }
          }
          last = head;
        }
      } catch {}
      await new Promise(r => setTimeout(r, 500));
    }
  }

  async function attach(){
    const app:any = getApp();
    if (!app || typeof app.get !== "function") { if (++tries < 60) return setTimeout(attach, 500); return; }
    if (attached) return; attached = true;

    // Enriched block endpoint: computes txRoot if header lacks it
    app.get("/blocks/:n/full3", async (req:any, res:any) => {
      try{
        const n = Number(req.params.n);
        const full2 = await fetchJson(`http://127.0.0.1:${port}/blocks/${n}/full2`);
        const persisted = await fetchJson(`http://127.0.0.1:${port}/dev/blocks/${n}/txs/persisted`);
        const txs:any[] = persisted?.txs || [];

        const computed = await computeTxRootFromTxs(txs);
        const header = full2.header ?? {};
        const headerTxRoot = header.txRoot && typeof header.txRoot === 'string' && header.txRoot.startsWith('0x')
          ? header.txRoot : computed;

        const merged = { ...full2, header: { ...header, txRoot: headerTxRoot }, txRoot: headerTxRoot };
        res.json(merged);
      }catch(e:any){
        res.status(500).json({ ok:false, error:String(e?.message||e) });
      }
    });

    // kick off GC loop
    gcLoop();
  }
  attach();
})();

// ---------------- txRoot checker v2 (compares against /blocks/:n/full3) -------------
(function devTxRootV2(){
  let tries = 0, attached = false;
  function app(){ return (globalThis as any).__void_http_app || (globalThis as any).app || undefined; }
  const port = Number(process.env.HTTP_PORT || process.env.VOID_HTTP_PORT || 4100);

  async function sha256Hex(data: string | Uint8Array){
    const { createHash } = await import('node:crypto');
    const h = createHash('sha256'); h.update(data); return '0x'+h.digest('hex');
  }
  async function merkleRoot(leavesHex: string[]){
    if (leavesHex.length === 0) return await sha256Hex(new Uint8Array());
    let layer = leavesHex.slice();
    while (layer.length > 1) {
      const next:string[] = [];
      for (let i=0;i<layer.length;i+=2){
        const a = layer[i];
        const b = layer[i+1] ?? layer[i];
        next.push(await sha256Hex(a + b));
      }
      layer = next;
    }
    return layer[0];
  }
  async function computeTxRootFromTxs(txs:any[]){
    const leaves:string[] = [];
    for (const tx of (Array.isArray(txs)?txs:[])){
      const s = JSON.stringify(tx, Object.keys(tx).sort());
      leaves.push(await sha256Hex(s));
    }
    return await merkleRoot(leaves);
  }
  async function jget(url:string){
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
    return await r.json();
  }

  async function attach(){
    const a:any = app();
    if (!a || typeof a.get !== "function") { if (++tries < 60) return setTimeout(attach, 500); return; }
    if (attached) return; attached = true;

    // GET /dev/blocks/:n/txroot2 -> { computed, header, match }
    a.get("/dev/blocks/:n/txroot2", async (req:any, res:any) => {
      try{
        const n = Number(req.params.n);
        const persisted = await jget(`http://127.0.0.1:${port}/dev/blocks/${n}/txs/persisted`);
        const full3     = await jget(`http://127.0.0.1:${port}/blocks/${n}/full3`);
        const txs:any[] = persisted?.txs || [];
        const computed  = await computeTxRootFromTxs(txs);
        const headerRoot = full3?.header?.txRoot || null;
        const match = !!headerRoot && headerRoot === computed;
        res.json({ ok:true, number:n, computed, header:headerRoot, match });
      }catch(e:any){
        res.status(500).json({ ok:false, error:String(e?.message||e) });
      }
    });
  }
  attach();
})();

// ---------------- Persisted txRoot seal hook (additive, no deletions) ---------------
(function persistTxRootOnSave(){
  let tries = 0, attached = false;
  function getNode(){ return (globalThis as any).__void_node || (globalThis as any).node || undefined; }

  async function sha256Hex(data: string | Uint8Array){
    const { createHash } = await import('node:crypto');
    const h = createHash('sha256'); h.update(data); return '0x'+h.digest('hex');
  }
  async function merkleRoot(leavesHex: string[]){
    if (leavesHex.length === 0) return await sha256Hex(new Uint8Array());
    let layer = leavesHex.slice();
    while (layer.length > 1) {
      const next:string[] = [];
      for (let i=0;i<layer.length;i+=2){
        const a = layer[i], b = layer[i+1] ?? layer[i];
        next.push(await sha256Hex(a + b));
      }
      layer = next;
    }
    return layer[0];
  }
  async function computeTxRootFromTxs(txs:any[]){
    const leaves:string[] = [];
    for (const tx of (Array.isArray(txs)?txs:[])){
      const s = JSON.stringify(tx, Object.keys(tx).sort());
      leaves.push(await sha256Hex(s));
    }
    return await merkleRoot(leaves);
  }

  function wrapOnce(obj:any, fnName:string, wrapper:(orig:Function)=>Function){
    if (!obj || typeof obj[fnName] !== "function") return false;
    const orig = obj[fnName].__void_wrapped_orig || obj[fnName];
    if (obj[fnName].__void_wrapped) return true;
    obj[fnName] = wrapper(orig);
    Object.defineProperty(obj[fnName], "__void_wrapped", { value:true });
    Object.defineProperty(obj[fnName], "__void_wrapped_orig", { value:orig });
    return true;
  }

  async function attach(){
    const nd:any = getNode();
    if (!nd) { if (++tries < 60) return setTimeout(attach, 500); return; }
    if (attached) return; attached = true;

    const store:any = nd?.store || nd?.segStore || nd?.segmentStore || undefined;
    if (!store) return; // nothing to patch (safe no-op)

    const makeWrapper = (orig:Function)=> (async function wrappedSaveBlock(block:any, ...rest:any[]){
      try{
        const txs:any[] = Array.isArray(block?.txs) ? block.txs : (Array.isArray(block?.transactions) ? block.transactions : []);
        const root = await computeTxRootFromTxs(txs);
        // ensure header exists and persist root
        block.header = block.header || {};
        // only set if missing or zeroed, otherwise keep caller’s value
        const zero = /^0x0+$/.test(String(block.header.txRoot||""));
        if (!block.header.txRoot || zero) block.header.txRoot = root;
        // also mirror at top-level if your schema exposes txRoot there
        if (!block.txRoot || zero) block.txRoot = block.header.txRoot;
      }catch(_e){}
      // @ts-ignore - preserving original call site; this is bound at runtime
      return await orig.call(this, block, ...rest);
    });

    // Wrap common methods safely if present
    wrapOnce(store, "saveBlock", makeWrapper);
    wrapOnce(store, "writeBlock", makeWrapper);   // in case your store uses a different name
  }
  attach();
})();

// ---------------- [ADD] txRoot + metrics wrapper ----------------
import { computeTxRoot } from "./util/txroot.js";
(function installTxRootSealHook(){
  try{
    const g:any = globalThis as any;
    let tries = 0;
    (function tick(){
      const node:any = g.__void_node || g.node;
      if (!node || !node.store) { if (++tries < 200) return setTimeout(tick, 25); return; }
      const store:any = node.store;
      if ((store as any).__txroot_wrapped) return;

      const orig = store.saveBlock?.bind(store) || store.writeBlock?.bind(store) || store.persistBlock?.bind(store);
      if (typeof orig !== "function") return; // nothing to wrap yet

      store.saveBlock = async function(b:any){
        try {
          const txs:any[] = Array.isArray(b?.txs) ? b.txs : [];
          const txRoot = computeTxRoot(txs);
          b.txRoot = txRoot;            // annotate block object (persisted with block)
        } catch(e){ /* best-effort; keep going */ }

        const res = await orig(b);

        try {
          // bump metrics (best-effort)
          if (node?.metrics?.incSealed) node.metrics.incSealed((b?.txs?.length)||0);
        } catch(e){ /* ignore */ }

        // dev diag
        try {
          const n = (b && (b.number ?? b.n)) ?? "?";
          const len = (b?.txs?.length)||0;
          const r = (b?.txRoot)||"(none)";
          console.log(`[txroot] sealed #${n} txs=${len} txRoot=${r}`);
        } catch {}

        return res;
      };
      (store as any).__txroot_wrapped = true;

      // Extend /metrics output with our two counters (non-invasive)
      try {
        const app:any = g.__void_http_app || g.app;
        if (app && typeof app.get === "function") {
          app.get("/metrics/txroot", (_req:any, res:any)=>{
            const snap = node?.metrics?.sealedSnapshot ? node.metrics.sealedSnapshot() : {sealed_blocks_total:0, sealed_txs_total:0};
            res.type("text/plain").send([
              `void_sealed_blocks_total ${snap.sealed_blocks_total}`,
              `void_sealed_txs_total ${snap.sealed_txs_total}`
            ].join("\n"));
          });
        }
      } catch {}
    })();
  } catch {}
})();

// ------------- [ADD] light shim to include txRoot in /blocks/:n/full2 -------------
(function augmentFull2TxRoot(){
  try{
    const g:any = globalThis as any;
    let tries = 0;
    (function tick(){
      const app:any = g.__void_http_app || g.app;
      const node:any = g.__void_node || g.node;
      if (!app || !node || !node.store) { if (++tries < 120) return setTimeout(tick, 50); return; }

      if ((app as any).__full2_txroot_augmented) return;
      (app as any).__full2_txroot_augmented = true;

      // Add a minimal route if /blocks/:n/full2 does not include txRoot elsewhere
      app.get("/blocks/:n/full2+txroot", async (req:any, res:any)=>{
        const n = Number(req.params.n);
        try {
          const blk = await node.store.getBlock?.(n);
          if (!blk) return res.status(404).json({ok:false, error:"block not found"});
          const body:any = { ok:true, number:n, txs: blk.txs||[], txRoot: blk.txRoot || null };
          res.setHeader("x-void-number", String(n));
          if (blk.txRoot) res.setHeader("x-void-txroot", blk.txRoot);
          return res.json(body);
        } catch(e:any){
          return res.status(500).json({ok:false, error:String(e?.message||e)});
        }
      });
    })();
  } catch {}
})();

// ---------------- [ADD] Hardened txroot counters (global, not tied to Metrics) ----------------
(function installTxRootCountersShim(){
  try{
    const g:any = globalThis as any;
    if (!g.__txroot_counters) g.__txroot_counters = { blocks: 0, txs: 0 };

    // Ensure our /metrics/txroot endpoint reads the global counters (fall back)
    let tries = 0;
    (function tick(){
      const app:any = g.__void_http_app || g.app;
      if (!app || typeof app.get !== "function") { if (++tries < 200) return setTimeout(tick, 50); return; }
      if ((app as any).__txroot_metrics_hardened) return;
      (app as any).__txroot_metrics_hardened = true;

      app.get("/metrics/txroot", (_req:any, res:any)=>{
        const c = (globalThis as any).__txroot_counters || {blocks:0, txs:0};
        res.type("text/plain").send([
          `void_sealed_blocks_total ${c.blocks}`,
          `void_sealed_txs_total ${c.txs}`
        ].join("\n"));
      });
    })();

    // Hook the global counters from the existing txroot wrapper if present, or re-wrap saveBlock best-effort.
    let armTries = 0;
    (function arm(){
      const node:any = (globalThis as any).__void_node || (globalThis as any).node;
      const store:any = node?.store;
      if (!store) { if (++armTries < 200) return setTimeout(arm, 50); return; }

      // If our txroot wrapper is already wrapping, just decorate saveBlock again to bump globals.
      const orig = store.saveBlock?.bind(store) || store.writeBlock?.bind(store) || store.persistBlock?.bind(store);
      if (typeof orig !== "function") return;

      if ((store as any).__txroot_counters_wrapped) return;
      store.saveBlock = async function(b:any){
        const res = await orig(b);
        try {
          const txsLen = (b?.txs?.length) || 0;
          const c = (globalThis as any).__txroot_counters;
          if (c) { c.blocks += 1; c.txs += txsLen; }
          // Also try to bump node.metrics if present (best-effort, but not required)
          node?.metrics?.incSealed?.(txsLen);
        } catch {}
        return res;
      };
      (store as any).__txroot_counters_wrapped = true;
    })();
  } catch {}
})();

// ---------------- [ADD] Resilient txroot counter hook (watches saveBlock reassigns) ----------------
(function installTxRootResilientHook(){
  try {
    const g:any = globalThis as any;
    g.__txroot_counters = g.__txroot_counters || { blocks: 0, txs: 0 };

    let tries = 0;
    (function arm(){
      const node:any = (g.__void_node || (g as any).node);
      const store:any = node?.store;
      if (!store) { if (++tries < 200) return setTimeout(arm, 50); return; }

      if ((store as any).__txroot_resilient_installed) return;
      (store as any).__txroot_resilient_installed = true;

      // Remember current impl (if any) and expose a setter that wraps ANY future impl.
      let currentImpl: any = store.saveBlock?.bind(store);

      function wrap(impl:any){
        if (typeof impl !== "function") return impl;
        // Avoid double-wrapping
        if ((impl as any).__txroot_counters_wrapped) return impl;
        const wrapped = async function(b:any){
          const res = await impl(b);
          try {
            const txsLen = (b?.txs?.length) || 0;
            const c = (globalThis as any).__txroot_counters;
            if (c) { c.blocks += 1; c.txs += txsLen; }
            // Best-effort bump on Metrics if present
            (node?.metrics?.incSealed)?.(txsLen);
          } catch {}
          return res;
        };
        (wrapped as any).__txroot_counters_wrapped = true;
        return wrapped;
      }

      // Install property descriptor to catch ALL future assignments.
      Object.defineProperty(store, "saveBlock", {
        configurable: true,
        enumerable: true,
        get(){ return currentImpl; },
        set(v:any){ currentImpl = wrap(v); }
      });

      // If there was an existing impl, re-assign it through our setter to ensure wrapping.
      if (currentImpl) { store.saveBlock = currentImpl; }
    })();
  } catch {}
})();

// ---------------- [ADD] TxRoot counters: periodic last-wins wrapper ----------------
(function installTxRootCountersWatchdog(){
  try{
    const g:any = globalThis as any;
    g.__txroot_counters = g.__txroot_counters || { blocks: 0, txs: 0 };

    const WRAP_SYM = Symbol.for("void.txrootCountersWrapped.v2");
    let tries = 0;

    function arm(){
      const node:any = g.__void_node || (g as any).node;
      const store:any = node?.store;
      if (!store) { if (++tries < 200) return setTimeout(arm, 50); return; }

      function wrapOnce(){
        const impl:any = store.saveBlock && store.saveBlock.bind(store);
        if (!impl) return;
        if ((impl as any)[WRAP_SYM]) return; // already wrapped by us

        const wrapped = async function(b:any){
          const out = await impl(b);
          try {
            const n = (b?.txs?.length) || 0;
            const c = (globalThis as any).__txroot_counters;
            if (c) { c.blocks += 1; c.txs += n; }
            // Best-effort mirror into Metrics if present (safe no-op otherwise)
            (node?.metrics?.incSealed)?.(n);
          } catch {}
          return out;
        };
        (wrapped as any)[WRAP_SYM] = true;
        store.saveBlock = wrapped;
      }

      // Do it once now, then keep it fresh if later code replaces saveBlock.
      wrapOnce();
      setInterval(wrapOnce, 500);
    }
    arm();
  } catch {}
})();

// ---------------- [ADD] TxRoot counters: clean-room last-wins wrapper + /metrics/txroot2 ----------------
(function installTxRootCountersCleanRoom(){
  try{
    const g:any = globalThis as any;
    g.__txroot_counters = g.__txroot_counters || { blocks: 0, txs: 0 };

    // Expose a fresh endpoint that we control (plain text; Prometheus-friendly)
    let triesEP = 0;
    (function armEndpoint(){
      const app:any = g.__void_http_app || g.app;
      if (!app || typeof app.get !== "function") { if (++triesEP < 200) return setTimeout(armEndpoint, 50); return; }
      if ((app as any).__txroot_metrics_v2) return;
      (app as any).__txroot_metrics_v2 = true;

      app.get("/metrics/txroot2", (_req:any, res:any)=>{
        const c = (globalThis as any).__txroot_counters || {blocks:0, txs:0};
        // Ensure newline-terminated lines (Prometheus scrape robustness)
        res.type("text/plain").send(
          `void_sealed_blocks_total ${c.blocks}\n` +
          `void_sealed_txs_total ${c.txs}\n`
        );
      });
      console.log("[txroot/v2] endpoint /metrics/txroot2 ready");
    })();

    // Always wrap the current saveBlock AND any future reassignments
    const WRAP_SYM = Symbol.for("void.txrootCountersWrapped.v3");
    let seenStore:any = null;

    function wrapImpl(store:any){
      if (!store) return;
      // Guard: if already instrumented via our accessor, skip redefining
      if ((store as any).__txroot_instrumented_accessor_v3) return;

      let _impl:any = typeof store.saveBlock === "function" ? store.saveBlock.bind(store) : undefined;

      function makeWrapped(impl:any){
        if (typeof impl !== "function") return impl;
        if ((impl as any)[WRAP_SYM]) return impl;
        const wrapped = async function(b:any){
          const out = await impl(b);
          try{
            const n = (b?.txs?.length)||0;
            const c = (globalThis as any).__txroot_counters;
            if (c){ c.blocks += 1; c.txs += n; }
          }catch{}
          return out;
        };
        (wrapped as any)[WRAP_SYM] = true;
        return wrapped;
      }

      // Define accessor so any future assignment gets wrapped automatically
      Object.defineProperty(store, "saveBlock", {
        configurable: true,
        enumerable: false,
        get(){ return _impl; },
        set(v:any){ _impl = makeWrapped(v); },
      });

      // Wrap current impl (if any)
      if (_impl) store.saveBlock = _impl;

      (store as any).__txroot_instrumented_accessor_v3 = true;
      console.log("[txroot/v3] saveBlock accessor installed");
    }

    // Arm when node/store becomes available, then re-check in case store object is swapped later
    let tries = 0;
    (function arm(){
      const node:any = g.__void_node || (g as any).node;
      const store:any = node?.store;
      if (!store) { if (++tries < 200) return setTimeout(arm, 50); return; }
      seenStore = store; wrapImpl(store);
      // Watch for store swaps (rare but possible in dev harnesses)
      setInterval(()=>{
        const n:any = g.__void_node || (g as any).node;
        const s:any = n?.store;
        if (s && s !== seenStore){ seenStore = s; wrapImpl(s); }
      }, 500);
    })();

  }catch(e){}
})();

// ---------------- [ADD] /metrics/txroot2.json (JSON mirror for jq) ----------------
(function installTxRootJsonMirror(){
  try{
    const g:any = globalThis as any;
    let tries = 0;
    (function arm(){
      const app:any = g.__void_http_app || g.app;
      if (!app || typeof app.get !== "function") { if (++tries < 200) return setTimeout(arm, 50); return; }
      if ((app as any).__txroot_metrics_v2_json) return;
      (app as any).__txroot_metrics_v2_json = true;

      app.get("/metrics/txroot2.json", (_req:any, res:any)=>{
        const c = (globalThis as any).__txroot_counters || { blocks: 0, txs: 0 };
        res.json({ blocks: c.blocks, txs: c.txs });
      });
      console.log("[txroot/v2] endpoint /metrics/txroot2.json ready");
    })();
  }catch{}
})();

// ---------------- [ADD] /blocks/latest/number.json (JSON mirror) ----------------
(function installLatestNumberJson(){
  try{
    const g:any = globalThis as any;
    let tries = 0;
    (function arm(){
      const app:any = g.__void_http_app || g.app;
      const node:any = g.__void_node || (g as any).node;
      if (!app || typeof app.get !== "function" || !node?.store) {
        if (++tries < 200) return setTimeout(arm, 50);
        return;
      }
      if ((app as any).__latest_number_json) return;
      (app as any).__latest_number_json = true;

      app.get("/blocks/latest/number.json", async (_req:any, res:any)=>{
        try{
          const head = await node.store.getHead?.();
          // Fallback if store doesn't expose getHead()
          const n = (typeof head?.number === "number") ? head.number
                  : (typeof node?.headNumber === "number") ? node.headNumber
                  : await (async ()=> {
                      try{
                        const s = await fetch("http://127.0.0.1:" + (process.env.HTTP_PORT || 4100) + "/blocks/latest/number").then(r=>r.text());
                        return Number(s.trim());
                      }catch{ return -1; }
                    })();
          res.json({ number: n });
        }catch(e){
          res.status(500).json({ ok:false, error: String(e) });
        }
      });
      console.log("[compat] endpoint /blocks/latest/number.json ready");
    })();
  }catch{}
})();

// ---------------- [ADD] /blocks/latest/number2.json (fetch-free JSON mirror) ----------------
(function installLatestNumberJsonV2(){
  try{
    const g:any = globalThis as any;
    let tries = 0;
    (function arm(){
      const app:any  = g.__void_http_app || g.app;
      const node:any = g.__void_node || (g as any).node;
      if (!app || typeof app.get !== "function" || !node?.store) {
        if (++tries < 200) return setTimeout(arm, 50);
        return;
      }
      if ((app as any).__latest_number_json_v2) return;
      (app as any).__latest_number_json_v2 = true;

      // Helper: read from disk heads.json if store doesn't expose a head
      async function readHeadFromDisk(): Promise<number>{
        try{
          const fs:any   = await import("node:fs");
          const path:any = await import("node:path");
          const root  = process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data";
          const file  = path.join(root, "heads.json");
          if (!fs.existsSync(file)) return -1;
          const raw = fs.readFileSync(file, "utf8");
          const j = JSON.parse(raw || "{}");
          const n = (typeof j?.head === "number") ? j.head : -1;
          return n;
        }catch{ return -1; }
      }

      app.get("/blocks/latest/number2.json", async (_req:any, res:any)=>{
        try{
          let n = -1;

          // 1) Preferred: store.getHead()
          try{
            const head = await node.store.getHead?.();
            if (typeof head?.number === "number") n = head.number;
          }catch{}

          // 2) Fallback: node.headNumber if present
          if (n < 0 && typeof node?.headNumber === "number") {
            n = node.headNumber;
          }

          // 3) Final fallback: read heads.json on disk (no fetch)
          if (n < 0) n = await readHeadFromDisk();

          res.json({ number: n });
        }catch(e){
          res.status(500).json({ ok:false, error: String(e) });
        }
      });
      console.log("[compat] endpoint /blocks/latest/number2.json ready (fetch-free)");
    })();
  }catch{}
})();

// ---------------- [ADD] /health/summary.json ----------------
(function installHealthSummaryJson(){
  try{
    const g:any = globalThis as any;
    let tries = 0;
    (function arm(){
      const app:any = g.__void_http_app || g.app;
      if (!app || typeof app.get !== "function") { if (++tries < 200) return setTimeout(arm, 50); return; }
      if ((app as any).__health_summary_json) return;
      (app as any).__health_summary_json = true;

      app.get("/health/summary.json", async (_req:any, res:any) => {
        try{
          // Depend only on the stable JSON mirrors we already added
          const base = "http://127.0.0.1:" + (process.env.HTTP_PORT || 4100);
          const [headJ, txJ] = await Promise.all([
            fetch(base + "/blocks/latest/number2.json").then(r=>r.json()).catch(()=>({number:-1})),
            fetch(base + "/metrics/txroot2.json").then(r=>r.json()).catch(()=>({blocks:0, txs:0})),
          ]);

          // Optionally include follower drift if the route exists (best-effort)
          let drift:any = null;
          try{
            const r = await fetch(base + "/follower/status");
            if (r.ok) drift = await r.json();
          }catch{}

          res.json({
            ok: true,
            head: Number(headJ?.number ?? -1),
            sealedBlocks: Number(txJ?.blocks ?? 0),
            sealedTxs: Number(txJ?.txs ?? 0),
            drift
          });
        }catch(e){
          res.status(500).json({ ok:false, error: String(e) });
        }
      });

      console.log("[health] endpoint /health/summary.json ready");
    })();
  }catch{}
})();

// ---------------- Dev: /dev/blocks/:n/txroot (additive, no deps) ----------------
(function registerTxRootDevRoute() {
  let tries = 0, attached = false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  function attach(){
    const app:any = getApp();
    if (!app || typeof app.get !== "function") { if (++tries < 60) return setTimeout(attach, 500); return; }
    if (attached) return; attached = true;

    // GET /dev/blocks/:n/txroot -> {ok, number, txCount, root, leaves[]}
    app.get("/dev/blocks/:n/txroot", async (req:any, res:any) => {
      try {
        const n = Number(req.params.n);
        if (!Number.isFinite(n) || n < 0) return res.status(400).json({ ok:false, error:"invalid block number" });

        const port = process.env.HTTP_PORT || "4100";
        const url = `http://127.0.0.1:${port}/dev/blocks/${n}/txs/persisted`;
        const r = await fetch(url);
        if (!r.ok) return res.status(502).json({ ok:false, error:`upstream ${url} -> ${r.status}` });
        const j = await r.json();
        const txs = Array.isArray(j?.txs) ? j.txs : [];

        const { computeTxRoot } = await import("./util/txroot.js");
        const { root, leaves } = computeTxRoot(txs);
        res.json({ ok:true, number:n, txCount: txs.length, root, leaves });
      } catch(e:any) {
      }
    });
  }
  attach();
})();

// ---------------- Dev: /dev/txroot/:n (additive shim; ignores broken snippet) ----------------
(function registerTxRootDevRoute_v2() {
  let tries = 0, attached = false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  function attach(){
    const app:any = getApp();
    if (!app || typeof app.get !== "function") {
      if (++tries < 60) return setTimeout(attach, 500);
      return;
    }
    if (attached) return; attached = true;

    // GET /dev/txroot/:n  -> {ok, number, txCount, root, leaves[]}
    app.get("/dev/txroot/:n", async (req:any, res:any) => {
      try {
        const n = Number(req.params.n);
        if (!Number.isFinite(n) || n < 0) return res.status(400).json({ ok:false, error:"invalid block number" });

        const port = process.env.HTTP_PORT || "4100";
        const url = `http://127.0.0.1:${port}/dev/blocks/${n}/txs/persisted`;
        const r = await fetch(url);
        if (!r.ok) return res.status(502).json({ ok:false, error:`upstream ${url} -> ${r.status}` });
        const j = await r.json();
        const txs = Array.isArray(j?.txs) ? j.txs : [];

        const { computeTxRoot } = await import("./util/txroot.js");
        const { root, leaves } = computeTxRoot(txs);
        res.json({ ok:true, number:n, txCount: txs.length, root, leaves });
      } catch (e:any) {
      }
    });
  }
  attach();
})();

// ---------------- Dev: /dev/txroot/:n (stable JSON->sha256 merkle) ----------------
(function registerTxRootDevRoute_clean(){
  let tries = 0, attached = false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }

  async function handler(req:any, res:any){
    try{
      const n = Number(req.params.n);
      if (!Number.isFinite(n) || n < 0) return res.status(400).json({ ok:false, error:"bad block number" });

      const port = Number(process.env.HTTP_PORT || 4100);
      const base = `http://127.0.0.1:${port}`;
      const r = await fetch(`${base}/dev/blocks/${n}/txs/persisted`);
      if (!r.ok) return res.status(502).json({ ok:false, error:`fetch persisted txs failed (${r.status})` });
      const j = await r.json().catch(()=>null);
      const txs = Array.isArray(j?.txs) ? j.txs : [];

      const { computeTxRoot } = await import("./util/txroot.js");
      const { root, leaves } = computeTxRoot(txs);
      return res.json({ ok:true, n, count: txs.length, root, leaves });
    }catch(e:any){
      return res.status(500).json({ ok:false, error: String(e?.message || e) });
    }
  }

  function attach(){
    const app:any = getApp();
    if (!app || typeof app.get !== "function"){ if (++tries < 60) return setTimeout(attach, 500); return; }
    if (attached) return; attached = true;
    app.get("/dev/txroot/:n", handler);
    try{ console.log("[txroot/route] /dev/txroot/:n ready"); }catch{}
  }

  attach();
})();

// ---------------- Follower drift status (additive, no imports) --------------------
;(function followerStatusRoute(){
  let tries = 0, attached = false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }

  async function getHead(base){
    try {
      const r = await fetch(String(base).replace(/\/+$/,'') + "/blocks/latest/number2.json");
      if (!r.ok) throw new Error("bad " + r.status);
      const d = await r.json();
      return (typeof d.n === "number" ? d.n : (typeof d.number === "number" ? d.number : -1));
    } catch { return -1; }
  }

  async function attach(){
    const app = getApp();
    if (!app || typeof app.get !== "function") { if (++tries < 60) return setTimeout(attach, 500); return; }
    if (attached) return; attached = true;

    // GET /follower/status?peer=http://127.0.0.1:4100
    app.get("/follower/status", async (req, res) => {
      const peer = String(req.query.peer || "http://127.0.0.1:4100");
      const self = "http://127.0.0.1:" + (process.env.HTTP_PORT || "4100");

      const [head_local, head_peer] = await Promise.all([getHead(self), getHead(peer)]);
      const drift = (head_peer >= 0 && head_local >= 0) ? (head_peer - head_local) : null;
      res.json({ ok: true, peer, head_local, head_peer, drift });
    });

    // Compat alias
    app.get("/follower/status2", async (req, res) => {
      const peer = String(req.query.peer || "http://127.0.0.1:4100");
      const self = "http://127.0.0.1:" + (process.env.HTTP_PORT || "4100");
      const [head_local, head_peer] = await Promise.all([getHead(self), getHead(peer)]);
      const drift = (head_peer >= 0 && head_local >= 0) ? (head_peer - head_local) : null;
      res.json({ ok: true, peer, head_local, head_peer, drift });
    });

    try { console.log("[follower/status] route ready"); } catch {}
  }
  attach();
})();

// ---------------- TxRoot header + metrics (additive, no import edits) -------------------
;(function txrootHeaderAndMetrics(){
  let tries = 0, attached = false;
  const state:any = {
    lastRoot: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    lastCount: 0,
    byNumber: new Map<number,string>(),
  };

  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  function getNode(){ return (globalThis as any).__void_node || (globalThis as any).node; }

  async function attach(){
    const app = getApp(); const node = getNode();
    if (!app || !node || !node.store || typeof node.store.saveBlock !== "function") {
      if (++tries < 60) return setTimeout(attach, 500);
      return;
    }
    if (attached) return; attached = true;

    // Wrap saveBlock to compute txroot after persistence
    const orig = node.store.saveBlock.bind(node.store);
    node.store.saveBlock = async (blk:any) => {
      const saved = await orig(blk);
      try {
        const { computeTxRoot } = await import("./util/txroot.js");
        const txs:any[] = Array.isArray(saved?.txs) ? saved.txs : (Array.isArray(blk?.txs) ? blk.txs : []);
        const { root } = computeTxRoot(txs);
        // Best-effort: set header field in-memory (persistence untouched)
        if (saved && typeof saved === "object") {
          saved.header = saved.header || {};
          if (!saved.header.txRoot) saved.header.txRoot = root;
          if (typeof saved.number === "number") state.byNumber.set(saved.number, root);
        }
        state.lastRoot = root; state.lastCount = txs.length;
        console.log(`[txroot/header] #\${saved?.number ?? "?"} txs=\${txs.length} root=\${root}`);
      } catch (e:any) {
        console.warn("[txroot/header] compute failed:", e?.message || e);
      }
      return saved;
    };

    // Read path: expose per-block txroot (from cache if known; else compute live)
    app.get("/blocks/:n/txroot", async (req:any, res:any) => {
      const n = Number(req.params.n);
      if (!Number.isFinite(n) || n < 0) return res.status(400).json({ ok:false, error:"bad number" });

      const cached = state.byNumber.get(n);
      if (cached) return res.json({ ok:true, number:n, root: cached, source:"cache" });

      try {
        const r = await fetch(`http://127.0.0.1:${process.env.HTTP_PORT || "4100"}/dev/blocks/${n}/txs/persisted`);
        if (!r.ok) throw new Error("persisted tx fetch failed");
        const d = await r.json();
        const txs = Array.isArray(d?.txs) ? d.txs : [];
        const { computeTxRoot } = await import("./util/txroot.js");
        const { root } = computeTxRoot(txs);
        return res.json({ ok:true, number:n, root, source:"live" });
      } catch (e:any) {
        return res.status(500).json({ ok:false, error:String(e?.message || e) });
      }
    });

    // Minimal metrics (text and JSON)
    app.get("/metrics/txroot3", (_req:any, res:any) => {
      res.type("text/plain").send([
        "# HELP void_last_txroot_count number of txs used in last txroot",
        "# TYPE void_last_txroot_count gauge",
        `void_last_txroot_count ${state.lastCount}`,
        "# HELP void_last_txroot_info last txroot hex (info string)",
        "# TYPE void_last_txroot_info gauge",
        `void_last_txroot_info{root="${state.lastRoot}"} 1`,
      ].join("\n"));
    });
    app.get("/metrics/txroot3.json", (_req:any, res:any) => {
      res.json({ ok:true, lastRoot: state.lastRoot, lastCount: state.lastCount });
    });

    console.log("[txroot/header] wrapper + endpoints ready (/blocks/:n/txroot, /metrics/txroot3(.json))");
  }

  setTimeout(attach, 0);
})();
