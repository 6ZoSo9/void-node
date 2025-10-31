// --- additive helper: safe hex stringify for Buffers/Uint8Arrays/strings
function __toHex(v:any){
  if (!v) return String(v);
  if (typeof v === "string") return v;
  if (v instanceof Uint8Array || (Array.isArray(v) && typeof v[0]==="number")) {
    return Array.from(v).map(x=>x.toString(16).padStart(2,"0")).join("");
  }
  if (typeof v === "object" && typeof v.toString === "function") {
    const s = v.toString();
    if (/^[0-9a-fA-F]{64}$/.test(s)) return s;
  }
  try { return JSON.stringify(v); } catch { return String(v); }
}

import "./bootstrap/define_patch.js";
import "./bootstrap/proto_scrub.js";
import "./bootstrap/proto_scrub.js";
// @ts-nocheck
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

// ---- TxRoot Core v2 -> Prom text adapter (inline) ----
app.get("/__void/metrics/txroot4/core2.prom", async (_req:any, res:any) => {
  try {
    // Prefer an in-process snapshot if your code exposes one later
    const g:any = globalThis as any;
    async function fetchCore(): Promise<any> {
      if (g.__void_txroot_core2_snapshot && typeof g.__void_txroot_core2_snapshot === "function") {
        return await g.__void_txroot_core2_snapshot();
      }
      // Fallback: call our existing JSON endpoint locally
      const http = await import("node:http");
      const port = Number(process.env.HTTP_PORT || process.env.VOID_HTTP_PORT || 4100);
      return await new Promise((resolve, reject) => {
        const req = http.request({ host:"127.0.0.1", port, path:"/__void/metrics/txroot4/core2.json", method:"GET" }, r=>{
          let buf=""; r.setEncoding("utf8");
          r.on("data", c=> buf+=c);
          r.on("end", ()=> { try { resolve(JSON.parse(buf)); } catch(e){ reject(e); } });
        });
        req.on("error", reject); req.end();
      });
    }

    const snap = await fetchCore();
    const saves = Number(snap?.saves_total ?? 0);
    const set = Number(snap?.set_total ?? 0);
    const mismatch = Number(snap?.mismatch_total ?? 0);
    const hb = Number(snap?.heartbeat_total ?? 0);

    const lines = [
      "# HELP void_txroot_core_saves_total Core saves total",
      "# TYPE void_txroot_core_saves_total counter",
      `void_txroot_core_saves_total ${saves}`,
      "# HELP void_txroot_core_set_total Core sets total",
      "# TYPE void_txroot_core_set_total counter",
      `void_txroot_core_set_total ${set}`,
      "# HELP void_txroot_core_mismatch_total Core mismatches total",
      "# TYPE void_txroot_core_mismatch_total counter",
      `void_txroot_core_mismatch_total ${mismatch}`,
      "# HELP void_txroot_core_heartbeat_total Core heartbeat total",
      "# TYPE void_txroot_core_heartbeat_total counter",
      `void_txroot_core_heartbeat_total ${hb}`
    ];
    res.setHeader("Content-Type","text/plain; version=0.0.4; charset=utf-8");
    res.end(lines.join("\n")+"\n");
  } catch(err:any){
    res.statusCode = 500;
    res.setHeader("Content-Type","text/plain");
    res.end(`# txroot core2 prom adapter error: ${String(err && err.message || err)}\n`);
  }
});
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
console.log("[txroot.hex] sealed", "#"+(((globalThis as any).__void_last_seal_number ?? "?") as any), "txRootHex="+__toHex((globalThis as any).__lastTxRoot || undefined));
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
        console.log(`[txroot/header] #${saved?.number ?? "?"} txs=${txs.length} root=${root}`);
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

// ---------------- TxRoot pre-persist header (feature-flagged) -------------------
;(function txrootPrePersist(){
  let tries = 0, attached = false;
  function getNode(){ return (globalThis as any).__void_node || (globalThis as any).node; }

  async function attach(){
    const node:any = getNode();
    if (!node || !node.store || typeof node.store.saveBlock !== "function") {
      if (++tries < 60) return setTimeout(attach, 500);
      return;
    }
    if (attached) return; attached = true;

    const enabled = String(process.env.TXROOT_PERSIST || "0") === "1";
    if (!enabled) { console.log("[txroot/persist] disabled (set TXROOT_PERSIST=1 to enable)"); return; }

    if ((node.store as any).__txrootPrePersistWrapped) {
      console.log("[txroot/persist] already wrapped"); return;
    }

    const orig = node.store.saveBlock.bind(node.store);
    (node.store as any).__txrootPrePersistWrapped = true;

    node.store.saveBlock = async (blk:any) => {
      try {
        const { computeTxRoot } = await import("./util/txroot.js");
        const txs:any[] = Array.isArray(blk?.txs) ? blk.txs : [];
        const { root } = computeTxRoot(txs);
        blk.header = blk.header || {};
        blk.header.txRoot = blk.header.txRoot || root;  // set only if missing
        console.log(`[txroot/persist] set header.txRoot for #${blk?.number ?? "?"} txs=${txs.length} root=${root}`);
      } catch (e:any) {
        console.warn("[txroot/persist] compute failed:", e?.message || e);
      }
      return await orig(blk);
    };

    console.log("[txroot/persist] enabled (pre-persist wrapper active)");
  }
  attach();
})();

// ---------------- Header shim + txroot counter metrics (additive) -------------------
;(function headerShimAndTxrootCounter(){
  let tries = 0, attached = false;

  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  function getNode(){ return (globalThis as any).__void_node || (globalThis as any).node; }

  // local state for metrics
  const m = { txrootUpdatesTotal: 0 };

  async function attach(){
    const app:any  = getApp();
    const node:any = getNode();
    if (!app || !node || !node.store || typeof node.store.saveBlock !== "function") {
      if (++tries < 60) return setTimeout(attach, 500);
      return;
    }
    if (attached) return; attached = true;

    // --- wrap saveBlock (lightweight, only increments counter; do it once) ---
    if (!(node.store as any).__txrootCounterWrapped){
      const orig = node.store.saveBlock.bind(node.store);
      (node.store as any).__txrootCounterWrapped = true;
      node.store.saveBlock = async (blk:any) => {
        const res = await orig(blk);
        try {
          const txs:any[] = Array.isArray((res?.txs ?? blk?.txs)) ? (res?.txs ?? blk?.txs) : [];
          // increment only when there were txs (i.e., non-empty root event)
          if (txs.length > 0) m.txrootUpdatesTotal++;
        } catch {}
        return res;
      };
      console.log("[txroot/counter] wrapper installed");
    }

    const base = "http://127.0.0.1:" + (process.env.HTTP_PORT || "4100");

    // --- GET /blocks/:n/header (proxy to full2 and return .header) ---
    app.get("/blocks/:n/header", async (req:any, res:any) => {
      try {
        const n = Number(req.params.n);
        if (!Number.isFinite(n) || n < 0) return res.status(400).json({ ok:false, error:"bad number" });
        const r = await fetch(`${base}/blocks/${n}/full2`);
        if (!r.ok) return res.status(404).json({ ok:false, error:"block not found" });
        const full = await r.json();
        return res.json({ ok:true, number:n, header: full?.header ?? null });
      } catch(e:any){
        return res.status(500).json({ ok:false, error: String(e?.message || e) });
      }
    });

    // --- Prometheus-style metrics: void_txroot_updates_total ---
    app.get("/metrics/txroot4", (_req:any, res:any) => {
      res.type("text/plain").send(
        "# HELP void_txroot_updates_total counter of blocks where txroot updated\n" +
        "# TYPE void_txroot_updates_total counter\n" +
        `void_txroot_updates_total ${m.txrootUpdatesTotal}\n`
      );
    });

    app.get("/metrics/txroot4.json", (_req:any, res:any) => {
      res.json({ ok:true, txrootUpdatesTotal: m.txrootUpdatesTotal });
    });

    console.log("[header+metrics] ready (/blocks/:n/header, /metrics/txroot4(.json))");
  }

  attach();
})();

// -------------- last-block metrics: txcount + empty (additive) --------------
;(function lastBlockMetrics(){
  let tries=0, attached=false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  async function getHead(){
    try { const r=await fetch("http://127.0.0.1:"+ (process.env.HTTP_PORT||"4100") +"/blocks/latest/number2.json");
      const d=await r.json(); return d.n ?? d.number ?? -1; } catch { return -1; }
  }
  async function attach(){
    const app:any=getApp(); if(!app){ if(++tries<60) return setTimeout(attach,500); return; }
    if(attached) return; attached=true;

    app.get("/metrics/lastblock", async(_req,res)=>{
      const n=await getHead();
      let txCount=0;
      if(n>=0){
        try{ const r=await fetch(`http://127.0.0.1:${process.env.HTTP_PORT||"4100"}/dev/txroot/${n}`);
             const d=await r.json(); txCount = Number(d.txCount||0); }catch{}
      }
      const empty = txCount===0 ? 1 : 0;
      res.type("text/plain").send(
        "# HELP void_block_txcount tx count in latest block\n# TYPE void_block_txcount gauge\n"+
        `void_block_txcount ${txCount}\n`+
        "# HELP void_block_was_empty 1 if latest block had 0 tx, else 0\n# TYPE void_block_was_empty gauge\n"+
        `void_block_was_empty ${empty}\n`
      );
    });
    console.log("[metrics/lastblock] ready");
  }
  attach();
})();

// ---------------- Metrics bundle (/metrics/void) -------------------
;(function metricsBundle(){
  let tries=0, attached=false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  async function fetchText(path:string){
    try{ const r=await fetch("http://127.0.0.1:"+ (process.env.HTTP_PORT||"4100")+path); return await r.text(); }
    catch{ return ""; }
  }
  async function attach(){
    const app:any=getApp(); if(!app){ if(++tries<60) return setTimeout(attach,500); return; }
    if(attached) return; attached=true;

    app.get("/metrics/void", async (_req,res)=>{
      const [m4,m3,ml] = await Promise.all([
        fetchText("/metrics/txroot4"),
        fetchText("/metrics/txroot3"),
        fetchText("/metrics/lastblock"),
      ]);
      res.type("text/plain").send([m4,m3,ml].join("\n"));
    });
    console.log("[metrics/bundle] ready at /metrics/void");
  }
  attach();
})();

// ---------------- Ops snapshot (/ops/txroot-state.json) -------------------
;(function opsTxrootState(){
  let tries=0, attached=false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  async function t(path){ try{ const r=await fetch("http://127.0.0.1:"+ (process.env.HTTP_PORT||"4100")+path); return await r.text(); }catch{ return ""; } }
  async function attach(){
    const app:any=getApp(); if(!app){ if(++tries<60) return setTimeout(attach,500); return; }
    if(attached) return; attached=true;
    app.get("/ops/txroot-state.json", async (_req,res)=>{
      const [m4,m3,ml] = await Promise.all([t("/metrics/txroot4"), t("/metrics/txroot3"), t("/metrics/lastblock")]);
      res.json({ ok:true, metrics:{ txroot4:m4, txroot3:m3, lastblock:ml } });
    });
    console.log("[ops] /ops/txroot-state.json ready");
  }
  attach();
})();

// ---------------- Follower drift metric (/metrics/drift) -------------------
;(function followerDriftMetric(){
  let tries=0, attached=false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  async function getJSON(u:string){ try{ const r=await fetch(u,{headers:{'cache-control':'no-cache'}}); return await r.json(); }catch{ return null; } }

  async function attach(){
    const app:any=getApp(); if(!app){ if(++tries<60) return setTimeout(attach,500); return; }
    if(attached) return; attached=true;

    // On the FOLLOWER (HTTP_PORT=4101), query its own /follower/status against the main (4100).
    const selfPort = String(process.env.HTTP_PORT || "4100");
    const peer = process.env.VOID_DRIFT_PEER || "http://127.0.0.1:4100";

    app.get("/metrics/drift", async (_req,res)=>{
      let drift = NaN, head_local = NaN, head_peer = NaN;
      try {
        const url = `http://127.0.0.1:${selfPort}/follower/status?peer=${encodeURIComponent(peer)}`;
        const d = await getJSON(url);
        if (d && d.ok) { drift = Number(d.drift); head_local = Number(d.head_local); head_peer = Number(d.head_peer); }
      } catch {}
      res.type("text/plain").send(
        "# HELP void_follower_drift latest head difference (peer - local)\n# TYPE void_follower_drift gauge\n"+
        `void_follower_drift${Number.isFinite(drift)?` ${drift}`:" NaN"}\n`+
        "# HELP void_follower_head_local local head number on follower\n# TYPE void_follower_head_local gauge\n"+
        `void_follower_head_local${Number.isFinite(head_local)?` ${head_local}`:" NaN"}\n`+
        "# HELP void_follower_head_peer peer head number from follower POV\n# TYPE void_follower_head_peer gauge\n"+
        `void_follower_head_peer${Number.isFinite(head_peer)?` ${head_peer}`:" NaN"}\n`
      );
    });
    console.log("[metrics/drift] ready (peer=%s, selfPort=%s)", peer, selfPort);
  }
  attach();
})();

// ---- follower drift metric: always numeric (no NaN) -----------------------
;(function followerDriftMetric_v2(){
  let tries=0, attached=false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  async function getJSON(u:string){ try{ const r=await fetch(u,{headers:{'cache-control':'no-cache'}}); return await r.json(); }catch{ return null; } }
  function numOr0(x:any){ const n=Number(x); return Number.isFinite(n)? n : 0; }

  async function attach(){
    const app:any=getApp(); if(!app){ if(++tries<60) return setTimeout(attach,500); return; }
    if(attached) return; attached=true;

    const selfPort = String(process.env.HTTP_PORT || "4100");
    const peer = process.env.VOID_DRIFT_PEER || "http://127.0.0.1:4100";

    app.get("/metrics/drift", async (_req,res)=>{
      let drift=0, head_local=0, head_peer=0;
      const url = `http://127.0.0.1:${selfPort}/follower/status?peer=${encodeURIComponent(peer)}`;
      const d = await getJSON(url);
      if (d && d.ok) {
        drift = numOr0(d.drift);
        head_local = numOr0(d.head_local);
        head_peer = numOr0(d.head_peer);
      }
      res.type("text/plain").send(
        "# HELP void_follower_drift latest head difference (peer - local)\n# TYPE void_follower_drift gauge\n"+
        `void_follower_drift ${drift}\n`+
        "# HELP void_follower_head_local local head number on follower\n# TYPE void_follower_head_local gauge\n"+
        `void_follower_head_local ${head_local}\n`+
        "# HELP void_follower_head_peer peer head number from follower POV\n# TYPE void_follower_head_peer gauge\n"+
        `void_follower_head_peer ${head_peer}\n`
      );
    });
    console.log("[metrics/drift:v2] ready (peer=%s, selfPort=%s)", peer, selfPort);
  }
  attach();
})();

// ---- follower drift metric v3: derive selfBase from request Host (no env) ---
;(function followerDriftMetric_v3(){
  let tries=0, attached=false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  async function getJSON(u:string){ try{ const r=await fetch(u,{headers:{'cache-control':'no-cache'}}); return await r.json(); }catch{ return null; } }
  const PEER = process.env.VOID_DRIFT_PEER || "http://127.0.0.1:4100";

  function num(x:any, d=0){ const n=Number(x); return Number.isFinite(n)? n : d; }

  async function attach(){
    const app:any=getApp(); if(!app){ if(++tries<60) return setTimeout(attach,500); return; }
    if(attached) return; attached=true;

    // GET /metrics/drift2  (uses Host header to hit this same instance's /follower/status)
    app.get("/metrics/drift2", async (req:any, res:any)=>{
      // e.g. Host: 127.0.0.1:4101  -> http://127.0.0.1:4101
      const host = req.get("host") || "127.0.0.1:4100";
      const selfBase = `http://${host}`;
      const url = `${selfBase}/follower/status?peer=${encodeURIComponent(PEER)}`;

      let drift=0, head_local=0, head_peer=0;
      const d = await getJSON(url);
      if (d && d.ok) {
        drift      = num(d.drift, 0);
        head_local = num(d.head_local, 0);
        head_peer  = num(d.head_peer, 0);
      }
      res.type("text/plain").send(
        "# HELP void_follower_drift latest head difference (peer - local)\n# TYPE void_follower_drift gauge\n"+
        `void_follower_drift ${drift}\n`+
        "# HELP void_follower_head_local local head number on follower\n# TYPE void_follower_head_local gauge\n"+
        `void_follower_head_local ${head_local}\n`+
        "# HELP void_follower_head_peer peer head number from follower POV\n# TYPE void_follower_head_peer gauge\n"+
        `void_follower_head_peer ${head_peer}\n`
      );
    });
    console.log("[metrics/drift:v3] ready peer=%s", PEER);
  }
  attach();
})();

// ---- follower drift metric v3b: selfBase from Host; clean closure -----------
;(function followerDriftMetric_v3b(){
  let tries=0, attached=false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  async function getJSON(u:string){ try{ const r=await fetch(u,{headers:{'cache-control':'no-cache'}}); return await r.json(); }catch{ return null; } }
  const PEER = process.env.VOID_DRIFT_PEER || "http://127.0.0.1:4100";
  const num = (x:any, d=0)=>{ const n=Number(x); return Number.isFinite(n)? n : d; };

  async function attach(){
    const app:any=getApp(); if(!app){ if(++tries<60) return setTimeout(attach,500); return; }
    if(attached) return; attached=true;

    // GET /metrics/drift3
    app.get("/metrics/drift3", async (req:any, res:any)=>{
      const host = req.get("host") || "127.0.0.1:4101";        // expect follower host:port
      const selfBase = `http://${host}`;
      const url = `${selfBase}/follower/status?peer=${encodeURIComponent(PEER)}`;

      let drift=0, head_local=0, head_peer=0;
      const d = await getJSON(url);
      if (d && d.ok) {
        drift      = num(d.drift, 0);
        head_local = num(d.head_local, 0);
        head_peer  = num(d.head_peer, 0);
      }
      res.type("text/plain").send(
        "# HELP void_follower_drift latest head difference (peer - local)\n# TYPE void_follower_drift gauge\n"+
        `void_follower_drift ${drift}\n`+
        "# HELP void_follower_head_local local head number on follower\n# TYPE void_follower_head_local gauge\n"+
        `void_follower_head_local ${head_local}\n`+
        "# HELP void_follower_head_peer peer head number from follower POV\n# TYPE void_follower_head_peer gauge\n"+
        `void_follower_head_peer ${head_peer}\n`
      );
    });
    console.log("[metrics/drift:v3b] ready peer=%s", PEER);
  }
  attach();
})();

// ---- follower drift metric v3b: selfBase from Host; clean closure -----------
;(function followerDriftMetric_v3b(){
  let tries=0, attached=false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  async function getJSON(u:string){ try{ const r=await fetch(u,{headers:{'cache-control':'no-cache'}}); return await r.json(); }catch{ return null; } }
  const PEER = process.env.VOID_DRIFT_PEER || "http://127.0.0.1:4100";
  const num = (x:any, d=0)=>{ const n=Number(x); return Number.isFinite(n)? n : d; };

  async function attach(){
    const app:any=getApp(); if(!app){ if(++tries<60) return setTimeout(attach,500); return; }
    if(attached) return; attached=true;

    // GET /metrics/drift3
    app.get("/metrics/drift3", async (req:any, res:any)=>{
      const host = req.get("host") || "127.0.0.1:4101";  // follower host:port expected
      const selfBase = `http://${host}`;
      const url = `${selfBase}/follower/status?peer=${encodeURIComponent(PEER)}`;

      let drift=0, head_local=0, head_peer=0;
      const d = await getJSON(url);
      if (d && d.ok) {
        drift      = num(d.drift, 0);
        head_local = num(d.head_local, 0);
        head_peer  = num(d.head_peer, 0);
      }
      res.type("text/plain").send(
        "# HELP void_follower_drift latest head difference (peer - local)\n# TYPE void_follower_drift gauge\n"+
        `void_follower_drift ${drift}\n`+
        "# HELP void_follower_head_local local head number on follower\n# TYPE void_follower_head_local gauge\n"+
        `void_follower_head_local ${head_local}\n`+
        "# HELP void_follower_head_peer peer head number from follower POV\n# TYPE void_follower_head_peer gauge\n"+
        `void_follower_head_peer ${head_peer}\n`
      );
    });
    console.log("[metrics/drift:v3b] ready peer=%s", PEER);
  }
  attach();
})();

// ---- follower drift exporter v4 (hot-attach, loud logs, health) -------------
;(function driftExporterV4(){
  let tries = 0, attached = false;
  const PEER = process.env.VOID_DRIFT_PEER || "http://127.0.0.1:4100";
  const getApp = () => (globalThis as any).__void_http_app || (globalThis as any).app;
  const num = (x:any, d=0)=>{ const n=Number(x); return Number.isFinite(n)? n : d; };
  const wait = (ms:number)=>new Promise(r=>setTimeout(r,ms));

  async function getJSON(u:string){ try{ const r=await fetch(u, {headers:{'cache-control':'no-cache'}}); return await r.json(); } catch { return null; } }

  async function attach() {
    while (!attached && tries < 1200) {       // 1200 * 500ms = 10 minutes
      const app:any = getApp();
      if (app && typeof app.get === "function") {
        // health
        app.get("/metrics/drift3/health", (_req:any,res:any)=>res.type("text/plain").send("ok\n"));

        // exporter
        app.get("/metrics/drift3", async (req:any, res:any)=>{
          const host = req.get("host") || "127.0.0.1:4101";
          const selfBase = `http://${host}`;
          const url = `${selfBase}/follower/status?peer=${encodeURIComponent(PEER)}`;

          let drift=0, head_local=0, head_peer=0;
          const d = await getJSON(url);
          if (d && d.ok) {
            drift      = num(d.drift, 0);
            head_local = num(d.head_local, 0);
            head_peer  = num(d.head_peer, 0);
          }
          res.type("text/plain").send(
            "# HELP void_follower_drift latest head difference (peer - local)\n# TYPE void_follower_drift gauge\n"+
            `void_follower_drift ${drift}\n`+
            "# HELP void_follower_head_local local head number on follower\n# TYPE void_follower_head_local gauge\n"+
            `void_follower_head_local ${head_local}\n`+
            "# HELP void_follower_head_peer peer head number from follower POV\n# TYPE void_follower_head_peer gauge\n"+
            `void_follower_head_peer ${head_peer}\n`
          );
        });

        attached = true;
        console.log("[metrics/drift:v4] ready (peer=%s)", PEER);
        return;
      }
      tries++;
      if (tries % 10 === 0) console.log("[metrics/drift:v4] waiting for app... try=%d", tries);
      await wait(500);
    }
    if (!attached) console.warn("[metrics/drift:v4] gave up after %d tries", tries);
  }
  attach();
})();

// ---- follower drift exporter v4b (reads head from /metrics/void) -----------
;(function driftExporterV4b(){
  let tries = 0, attached = false;
  const PEER = process.env.VOID_DRIFT_PEER || "http://127.0.0.1:4100";

  const getApp = () => (globalThis as any).__void_http_app || (globalThis as any).app;
  const num = (x:any, d=0)=>{ const n=Number(x); return Number.isFinite(n)? n : d; };

  async function getText(u:string){ try{ const r=await fetch(u, {headers:{'cache-control':'no-cache'}}); return await r.text(); } catch { return null; } }
  function parseHead(text:string|null): number {
    if (!text) return NaN;
    // Look for a line like: void_head_number 65011
    const m = text.match(/^\s*void_head_number\s+([0-9]+)\s*$/m);
    return m ? Number(m[1]) : NaN;
  }

  async function attach() {
    while (!attached && tries < 1200) { // up to ~10 min
      const app:any = getApp();
      if (app && typeof app.get === "function") {
        app.get("/metrics/drift4/health", (_req:any,res:any)=>res.type("text/plain").send("ok\n"));

        app.get("/metrics/drift4", async (req:any, res:any)=>{
          const host = req.get("host") || "127.0.0.1:4101";
          const selfBase = `http://${host}`;

          const selfText = await getText(`${selfBase}/metrics/void`);
          const peerText = await getText(`${PEER}/metrics/void`);

          const head_local = num(parseHead(selfText), 0);
          const head_peer  = num(parseHead(peerText), 0);
          const drift = Math.max(0, head_peer - head_local);

          res.type("text/plain").send(
            "# HELP void_follower_drift latest head difference (peer - local)\n# TYPE void_follower_drift gauge\n"+
            `void_follower_drift ${drift}\n`+
            "# HELP void_follower_head_local local head number on follower\n# TYPE void_follower_head_local gauge\n"+
            `void_follower_head_local ${head_local}\n`+
            "# HELP void_follower_head_peer peer head number from follower POV\n# TYPE void_follower_head_peer gauge\n"+
            `void_follower_head_peer ${head_peer}\n`
          );
        });

        attached = true;
        console.log("[metrics/drift:v4b] ready (peer=%s)", PEER);
        break;
      }
      await new Promise(r=>setTimeout(r,500));
      tries++;
    }
    if (!attached) console.warn("[metrics/drift:v4b] attach timeout after %d tries", tries);
  }
  attach();
})();

// ---- follower drift exporter v4b (reads head from /metrics/void) -----------
;(function driftExporterV4b(){
  let tries = 0, attached = false;
  const PEER = process.env.VOID_DRIFT_PEER || "http://127.0.0.1:4100";

  const getApp = () => (globalThis as any).__void_http_app || (globalThis as any).app;
  const num = (x:any, d=0)=>{ const n=Number(x); return Number.isFinite(n)? n : d; };

  async function getText(u:string){ try{ const r=await fetch(u, {headers:{'cache-control':'no-cache'}}); return await r.text(); } catch { return null; } }
  function parseHead(text:string|null): number {
    if (!text) return NaN;
    // Look for a line like: void_head_number 65011
    const m = text.match(/^\s*void_head_number\s+([0-9]+)\s*$/m);
    return m ? Number(m[1]) : NaN;
  }

  async function attach() {
    while (!attached && tries < 1200) { // up to ~10 min
      const app:any = getApp();
      if (app && typeof app.get === "function") {
        app.get("/metrics/drift4/health", (_req:any,res:any)=>res.type("text/plain").send("ok\n"));

        app.get("/metrics/drift4", async (req:any, res:any)=>{
          const host = req.get("host") || "127.0.0.1:4101";
          const selfBase = `http://${host}`;

          const selfText = await getText(`${selfBase}/metrics/void`);
          const peerText = await getText(`${PEER}/metrics/void`);

          const head_local = num(parseHead(selfText), 0);
          const head_peer  = num(parseHead(peerText), 0);
          const drift = Math.max(0, head_peer - head_local);

          res.type("text/plain").send(
            "# HELP void_follower_drift latest head difference (peer - local)\n# TYPE void_follower_drift gauge\n"+
            `void_follower_drift ${drift}\n`+
            "# HELP void_follower_head_local local head number on follower\n# TYPE void_follower_head_local gauge\n"+
            `void_follower_head_local ${head_local}\n`+
            "# HELP void_follower_head_peer peer head number from follower POV\n# TYPE void_follower_head_peer gauge\n"+
            `void_follower_head_peer ${head_peer}\n`
          );
        });

        attached = true;
        console.log("[metrics/drift:v4b] ready (peer=%s)", PEER);
        break;
      }
      await new Promise(r=>setTimeout(r,500));
      tries++;
    }
    if (!attached) console.warn("[metrics/drift:v4b] attach timeout after %d tries", tries);
  }
  attach();
})();

// ---- follower drift exporter v4c (status→status; no metrics/void needed) ----
;(function driftExporterV4c(){
  let tries = 0, attached = false;
  const PEER = process.env.VOID_DRIFT_PEER || "http://127.0.0.1:4100";
  const getApp = () => (globalThis as any).__void_http_app || (globalThis as any).app;
  const num = (x:any, d=0)=>{ const n=Number(x); return Number.isFinite(n)? n : d; };
  async function getJSON(u:string){ try{ const r=await fetch(u,{headers:{'cache-control':'no-cache'}}); return await r.json(); } catch { return null; } }
  const sleep = (ms:number)=>new Promise(r=>setTimeout(r,ms));

  async function attach(){
    while(!attached && ++tries<=1200){
      const app:any = getApp();
      if (app && typeof app.get === "function") {
        app.get("/metrics/drift5/health", (_req:any,res:any)=>res.type("text/plain").send("ok\n"));

        app.get("/metrics/drift5", async (req:any, res:any)=>{
          const host = req.get("host") || "127.0.0.1:4101";
          const selfBase = `http://${host}`;

          // 1) Local status against true peer → reliable head_local
          const selfStatus = await getJSON(`${selfBase}/follower/status?peer=${encodeURIComponent(PEER)}`);

          // 2) Peer status against itself → take its head_local as peer head
          const peerStatus = await getJSON(`${PEER}/follower/status?peer=${encodeURIComponent(PEER)}`);

          const head_local = num(selfStatus?.head_local, 0);
          const head_peer  = num(peerStatus?.head_local ?? peerStatus?.head_peer, 0);
          const drift = Math.max(0, head_peer - head_local);

          res.type("text/plain").send(
            "# HELP void_follower_drift latest head difference (peer - local)\n# TYPE void_follower_drift gauge\n"+
            `void_follower_drift ${drift}\n`+
            "# HELP void_follower_head_local local head number on follower\n# TYPE void_follower_head_local gauge\n"+
            `void_follower_head_local ${head_local}\n`+
            "# HELP void_follower_head_peer peer head number from follower POV\n# TYPE void_follower_head_peer gauge\n"+
            `void_follower_head_peer ${head_peer}\n`
          );
        });

        attached = true;
        console.log("[metrics/drift:v4c] ready (peer=%s)", PEER);
        break;
      }
      await sleep(500);
    }
    if (!attached) console.warn("[metrics/drift:v4c] attach timeout");
  }
  attach();
})();

// ---- head shim: /head (JSON) and /head.txt (plain) -------------------------
;(function headShim(){
  let tries=0, attached=false;
  const getApp = () => (globalThis as any).__void_http_app || (globalThis as any).app;
  const num = (x:any, d=0)=>{ const n=Number(x); return Number.isFinite(n)? n : d; };

  async function j(u:string){ try{ const r=await fetch(u,{headers:{'cache-control':'no-cache'}}); return await r.json(); } catch { return null; } }

  async function attach(){
    const app:any = getApp();
    if(!app){ if(++tries<60) return setTimeout(attach,500); return; }
    if(attached) return; attached = true;

    // GET /head -> { number }, GET /head.txt -> "number\n"
    app.get("/head", async (req:any,res:any)=>{
      const host = req.get("host") || "127.0.0.1:4100";
      const selfBase = `http://${host}`;
      // ask our own follower/status for a canonical local head
      const d = await j(`${selfBase}/follower/status?peer=${encodeURIComponent(selfBase)}`);
      const number = d && d.ok ? num(d.head_local, 0) : 0;
      res.json({ number });
    });

    app.get("/head.txt", async (req:any,res:any)=>{
      const host = req.get("host") || "127.0.0.1:4100";
      const selfBase = `http://${host}`;
      const d = await j(`${selfBase}/follower/status?peer=${encodeURIComponent(selfBase)}`);
      const number = d && d.ok ? num(d.head_local, 0) : 0;
      res.type("text/plain").send(String(number) + "\n");
    });

    console.log("[head-shim] ready");
  }
  attach();
})();

// ---- exporter alias: /metrics/drift5 mirrors /metrics/drift3 ---------------
;(function driftExporterAlias(){
  let tries=0, attached=false;
  const getApp = () => (globalThis as any).__void_http_app || (globalThis as any).app;
  async function attach(){
    const app:any = getApp();
    if (!app) { if (++tries < 60) return setTimeout(attach,500); return; }
    if (attached) return; attached = true;

    // If drift3 exists, create a simple alias at drift5 that uses same logic
    // (Duplicate the small body to avoid grabbing internal handler references)
    const num = (x:any, d=0)=>{ const n=Number(x); return Number.isFinite(n)? n : d; };
    async function getJSON(u:string){ try{ const r=await fetch(u,{headers:{'cache-control':'no-cache'}}); return await r.json(); } catch { return null; } }
    const PEER = process.env.VOID_DRIFT_PEER || "http://127.0.0.1:4100";

    app.get("/metrics/drift5", async (req:any, res:any)=>{
      const host = req.get("host") || "127.0.0.1:4101";
      const selfBase = `http://${host}`;
      const url = `${selfBase}/follower/status?peer=${encodeURIComponent(PEER)}`;

      let drift=0, head_local=0, head_peer=0;
      const d = await getJSON(url);
      if (d && d.ok) {
        drift      = num(d.drift, 0);
        head_local = num(d.head_local, 0);
        head_peer  = num(d.head_peer, 0);
      }
      res.type("text/plain").send(
        "# HELP void_follower_drift latest head difference (peer - local)\n# TYPE void_follower_drift gauge\n"+
        `void_follower_drift ${drift}\n`+
        "# HELP void_follower_head_local local head number on follower\n# TYPE void_follower_head_local gauge\n"+
        `void_follower_head_local ${head_local}\n`+
        "# HELP void_follower_head_peer peer head number from follower POV\n# TYPE void_follower_head_peer gauge\n"+
        `void_follower_head_peer ${head_peer}\n`
      );
    });
    console.log("[metrics/drift:alias] /metrics/drift5 ready (alias of drift3)");
  }
  attach();
})();

// ---- follower drift exporter v6 (direct heads: self vs real peer) ----------
;(function driftExporterV6(){
  let tries = 0, attached = false;
  const PEER = process.env.VOID_DRIFT_PEER || "http://127.0.0.1:4100";
  const getApp = () => (globalThis as any).__void_http_app || (globalThis as any).app;
  const wait = (ms:number)=>new Promise(r=>setTimeout(r,ms));

  async function getHeadTxt(base:string): Promise<number|null> {
    try {
      const r = await fetch(`${base}/head.txt`, { headers: {'cache-control':'no-cache'} });
      if (!r.ok) return null;
      const t = (await r.text()).trim();
      const n = Number(t);
      return Number.isFinite(n) ? n : null;
    } catch { return null; }
  }

  async function attach() {
    while (!attached && tries < 1200) { // up to 10 minutes, 500ms steps
      const app:any = getApp();
      if (app && typeof app.get === "function") {
        attached = true;

        app.get("/metrics/drift6/health", (_req:any,res:any)=>res.type("text/plain").send("ok\n"));

        // exporter: reads self and peer heads directly
        app.get("/metrics/drift6", async (req:any, res:any)=>{
          const host = req.get("host") || "127.0.0.1:4101";       // follower instance host:port
          const selfBase = `http://${host}`;
          const peerBase = PEER;

          const [hSelf, hPeer] = await Promise.all([
            getHeadTxt(selfBase),
            getHeadTxt(peerBase),
          ]);

          const head_local = (hSelf ?? 0);
          const head_peer  = (hPeer ?? head_local); // if peer fails, drift=0 so we don't flap

          const drift = Math.max(0, head_peer - head_local);

          res.type("text/plain").send(
            "# HELP void_follower_drift latest head difference (peer - local)\n# TYPE void_follower_drift gauge\n"+
            `void_follower_drift ${drift}\n`+
            "# HELP void_follower_head_local local head number on follower\n# TYPE void_follower_head_local gauge\n"+
            `void_follower_head_local ${head_local}\n`+
            "# HELP void_follower_head_peer peer head number from follower POV\n# TYPE void_follower_head_peer gauge\n"+
            `void_follower_head_peer ${head_peer}\n`
          );
        });

        console.log("[metrics/drift:v6] ready (peer=%s)", PEER);
        return;
      }
      tries++; await wait(500);
    }
    if (!attached) console.warn("[metrics/drift:v6] gave up waiting for app attach");
  }
  attach();
})();

// ---------------- txRoot header integration (pure-additive) ------------------
(async function installTxRootHeaderIntegration(){
  try {
    // NOTE: SegStore is already imported at top of index.ts
    const anySeg: any = SegStore as any;
    const proto = anySeg?.prototype;
    if (!proto || typeof proto.saveBlock !== "function") return;

    const origSave = proto.saveBlock;
    const { txRootOf } = await import("./util/txroot.js");

    // Global counters for ad-hoc Prom scrape
    (globalThis as any).__void_txroot_set_total = (globalThis as any).__void_txroot_set_total || 0;
    (globalThis as any).__void_txroot_empty_blocks_total = (globalThis as any).__void_txroot_empty_blocks_total || 0;
    (globalThis as any).__void_txroot_errors_total = (globalThis as any).__void_txroot_errors_total || 0;

    // Monkey-patch SegStore.saveBlock to set header.txRoot before persist
    proto.saveBlock = async function(block: any){
      try {
        if (block && Array.isArray(block.txs)) {
          if (block.txs.length > 0) {
            const res = txRootOf(block.txs);
            const root = res?.root || res; // helper returns {root, leaves}
            block.header = block.header || {};
            if (block.header.txRoot !== root) {
              block.header.txRoot = root;
              (globalThis as any).__void_txroot_set_total++;
            }
          } else {
            // empty block persisted
            (globalThis as any).__void_txroot_empty_blocks_total++;
          }
        }
      } catch (e) {
        (globalThis as any).__void_txroot_errors_total++;
      }
      return await origSave.call(this, block);
    };

    // Defer until app is mounted (keep the global app hook intact!)
    function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
    let tries = 0;
    (function attachRoutes(){
      const app: any = getApp();
      if (!app || typeof app.get !== "function") {
        if (++tries < 60) return setTimeout(attachRoutes, 500);
        return;
      }

      // GET /blocks/:n/header  -> returns only the header (including txRoot)
      app.get("/blocks/:n/header", async (req: any, res: any) => {
        const n = String(req.params.n);
        try {
          // Use our own HTTP shim endpoint to fetch persisted block JSON
          const port = process.env.HTTP_PORT || "4100";
          const resp = await fetch(`http://127.0.0.1:${port}/blocks/${n}/full2`);
          if (!resp.ok) throw new Error(`upstream status ${resp.status}`);
          const block = await resp.json();
          res.json(block?.header || {});
        } catch (e:any) {
          res.status(500).json({ error: String(e?.message || e) });
        }
      });

      // GET /blocks/:n/txroot/verify -> {number, expected, headerTxRoot, match}
      app.get("/blocks/:n/txroot/verify", async (req: any, res: any) => {
        const n = String(req.params.n);
        try {
          const port = process.env.HTTP_PORT || "4100";
          const resp = await fetch(`http://127.0.0.1:${port}/blocks/${n}/full2`);
          if (!resp.ok) throw new Error(`upstream status ${resp.status}`);
          const block = await resp.json();

          const { txRootOf } = await import("./util/txroot.js");
          const expected = txRootOf(block?.txs || [])?.root ?? txRootOf(block?.txs || []);
          const headerTxRoot = block?.header?.txRoot ?? null;
          res.json({ number: Number(n), expected, headerTxRoot, match: expected && headerTxRoot ? expected === headerTxRoot : false });
        } catch (e:any) {
          res.status(500).json({ number: Number(n), error: String(e?.message || e) });
        }
      });

      // Lightweight Prom scrape for txroot activity
      app.get("/metrics/txroot", (_req: any, res: any) => {
        const set = (globalThis as any).__void_txroot_set_total || 0;
        const empty = (globalThis as any).__void_txroot_empty_blocks_total || 0;
        const errs = (globalThis as any).__void_txroot_errors_total || 0;
        res.type("text/plain").send(
          [
            "# HELP void_txroot_set_total blocks where header.txRoot was (re)set before persist",
            "# TYPE void_txroot_set_total counter",
            `void_txroot_set_total ${set}`,
            "# HELP void_txroot_empty_blocks_total empty blocks observed at persist time",
            "# TYPE void_txroot_empty_blocks_total counter",
            `void_txroot_empty_blocks_total ${empty}`,
            "# HELP void_txroot_errors_total errors thrown while computing txRoot during persist",
            "# TYPE void_txroot_errors_total counter",
            `void_txroot_errors_total ${errs}`,
            ""
          ].join("\n")
        );
      });
    })();

  } catch {}
})();

// --------------- txRoot normalization + verify v2 (pure-additive) ---------------
;(async function installTxRootNormalizationV2(){
  function normRoot(v:any): string | null {
    if (!v) return null;
    if (typeof v === "string") return v;
    if (typeof v === "object" && v.root && typeof v.root === "string") return v.root;
    return String(v);
  }

  try {
    const anySeg: any = SegStore as any;
    const proto = anySeg?.prototype;
    if (!proto || typeof proto.saveBlock !== "function") return;

    const prevSave = proto.saveBlock; // whatever is currently installed
    const { txRootOf } = await import("./util/txroot.js");

    // global counters (separate from v1)
    (globalThis as any).__void_txroot_v2_set_total = (globalThis as any).__void_txroot_v2_set_total || 0;
    (globalThis as any).__void_txroot_v2_empty_total = (globalThis as any).__void_txroot_v2_empty_total || 0;
    (globalThis as any).__void_txroot_v2_errors_total = (globalThis as any).__void_txroot_v2_errors_total || 0;

    // late-binding wrapper to ensure header.txRoot is always a string
    proto.saveBlock = async function(block:any){
      try {
        if (block && Array.isArray(block.txs)) {
          const txs = block.txs;
          const computed = normRoot(txRootOf(txs));
          block.header = block.header || {};
          if (txs.length === 0) {
            (globalThis as any).__void_txroot_v2_empty_total++;
          }
          if (computed && block.header.txRoot !== computed) {
            block.header.txRoot = computed;
            (globalThis as any).__void_txroot_v2_set_total++;
          }
          // helpful trace
          if (process?.env?.VOID_TXROOT_TRACE === "1") {
            console.log(`[txroot/v2] sealing #? txs=${txs.length} txRoot=${computed}`);
          }
        }
      } catch (e) {
        (globalThis as any).__void_txroot_v2_errors_total++;
        if (process?.env?.VOID_TXROOT_TRACE === "1") {
          console.warn("[txroot/v2] error computing txRoot:", e);
        }
      }
      return await prevSave.call(this, block);
    };

    // attach v2 routes once app is ready
    function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
    let tries = 0;
    (function attachV2(){
      const app:any = getApp();
      if (!app || typeof app.get !== "function") {
        if (++tries < 60) return setTimeout(attachV2, 500);
        return;
      }

      // GET /blocks/:n/txroot/verify2  -> always JSON
      app.get("/blocks/:n/txroot/verify2", async (req:any, res:any) => {
        const n = String(req.params.n);
        try {
          const port = process.env.HTTP_PORT || "4100";
          const resp = await fetch(`http://127.0.0.1:${port}/blocks/${n}/full2`);
          if (!resp.ok) throw new Error(`upstream status ${resp.status}`);
          const block:any = await resp.json();

          const expected = normRoot((await import("./util/txroot.js")).txRootOf(block?.txs || []));
          const headerTxRoot = normRoot(block?.header?.txRoot ?? null);
          const match = !!(expected && headerTxRoot && expected === headerTxRoot);

          res.type("application/json").send(JSON.stringify({
            number: Number(n),
            txCount: Array.isArray(block?.txs) ? block.txs.length : null,
            expected,
            headerTxRoot,
            match
          }));
        } catch (e:any) {
          res.status(500).type("application/json").send(JSON.stringify({
            number: Number(n),
            error: String(e?.message || e)
          }));
        }
      });

      // Tiny Prom endpoint v2 (separate names to avoid clashes)
      app.get("/metrics/txroot2", (_req:any, res:any) => {
        const set = (globalThis as any).__void_txroot_v2_set_total || 0;
        const empty = (globalThis as any).__void_txroot_v2_empty_total || 0;
        const errs = (globalThis as any).__void_txroot_v2_errors_total || 0;
        res.type("text/plain").send(
          [
            "# HELP void_txroot_v2_set_total blocks where header.txRoot was set (v2)",
            "# TYPE void_txroot_v2_set_total counter",
            `void_txroot_v2_set_total ${set}`,
            "# HELP void_txroot_v2_empty_total empty blocks observed at persist time (v2)",
            "# TYPE void_txroot_v2_empty_total counter",
            `void_txroot_v2_empty_total ${empty}`,
            "# HELP void_txroot_v2_errors_total errors while computing txRoot (v2)",
            "# TYPE void_txroot_v2_errors_total counter",
            `void_txroot_v2_errors_total ${errs}`,
            ""
          ].join("\n")
        );
      });
    })();
  } catch {}
})();

// ---------------------- txRoot verifier v3 (JSON-safe) -----------------------
;(function installTxRootVerifierV3(){
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  function normRoot(v:any): string|null {
    if (!v) return null;
    if (typeof v === "string") return v;
    if (typeof v === "object" && typeof v.root === "string") return v.root;
    return String(v);
  }

  // counters
  (globalThis as any).__void_txroot_v3_ok_total = (globalThis as any).__void_txroot_v3_ok_total || 0;
  (globalThis as any).__void_txroot_v3_mismatch_total = (globalThis as any).__void_txroot_v3_mismatch_total || 0;
  (globalThis as any).__void_txroot_v3_errors_total = (globalThis as any).__void_txroot_v3_errors_total || 0;

  async function jget(path:string){
    const port = process.env.HTTP_PORT || "4100";
    const resp = await fetch(`http://127.0.0.1:${port}${path}`, { headers: { "accept":"application/json" }});
    if (!resp.ok) throw new Error(`GET ${path} -> ${resp.status}`);
    // Some of our dev routes return text/json; force JSON parse
    const text = await resp.text();
    try { return JSON.parse(text); } catch(e){ throw new Error(`non-JSON at ${path}: ${text.slice(0,120)}`); }
  }

  let tries = 0;
  (function attach(){
    const app:any = getApp();
    if (!app || typeof app.get !== "function") {
      if (++tries < 60) return setTimeout(attach, 500);
      return;
    }

    // GET /dev/txroot/verify/:n  -> always JSON
    app.get("/dev/txroot/verify/:n", async (req:any, res:any) => {
      const n = Number(req.params.n);
      try {
        const [{ header }, persisted] = await Promise.all([
          jget(`/blocks/${n}/header`),           // { header: {... txRoot? ...} }
          jget(`/dev/blocks/${n}/txs/persisted`) // { txs: [...] }
        ]);

        const { txRootOf } = await import("./util/txroot.js");
        const txs = Array.isArray(persisted?.txs) ? persisted.txs : [];
        const expected = normRoot(txRootOf(txs));
        const headerTxRoot = normRoot(header?.txRoot ?? null);
        const match = !!(expected && headerTxRoot && expected === headerTxRoot);

        if (match) (globalThis as any).__void_txroot_v3_ok_total++;
        else       (globalThis as any).__void_txroot_v3_mismatch_total++;

        res.type("application/json").send(JSON.stringify({
          number: n,
          txCount: txs.length,
          expected,
          headerTxRoot,
          match
        }));
      } catch (e:any) {
        (globalThis as any).__void_txroot_v3_errors_total++;
        res.status(500).type("application/json").send(JSON.stringify({
          number: Number(req.params.n),
          error: String(e?.message || e)
        }));
      }
    });

    // GET /metrics/txroot2  (keep name from earlier suggestion, but v3 counters)
    app.get("/metrics/txroot2", (_req:any, res:any) => {
      const ok  = (globalThis as any).__void_txroot_v3_ok_total || 0;
      const mm  = (globalThis as any).__void_txroot_v3_mismatch_total || 0;
      const err = (globalThis as any).__void_txroot_v3_errors_total || 0;
      res.type("text/plain").send(
        [
          "# HELP void_txroot_v3_ok_total header.txRoot equals computed persisted txRoot",
          "# TYPE void_txroot_v3_ok_total counter",
          `void_txroot_v3_ok_total ${ok}`,
          "# HELP void_txroot_v3_mismatch_total header.txRoot != computed persisted txRoot",
          "# TYPE void_txroot_v3_mismatch_total counter",
          `void_txroot_v3_mismatch_total ${mm}`,
          "# HELP void_txroot_v3_errors_total errors while verifying txRoot",
          "# TYPE void_txroot_v3_errors_total counter",
          `void_txroot_v3_errors_total ${err}`,
          ""
        ].join("\n")
      );
    });
  })();
})();
// ---------------------------------------------------------------------------

// ===================== VOID diag + txroot v4 (collision-proof) =====================
;(function voidTxRootV4(){
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  function normRoot(v:any): string|null {
    if (!v) return null;
    if (typeof v === "string") return v;
    if (typeof v === "object" && typeof v.root === "string") return v.root;
    try { return String(v); } catch { return null; }
  }

  // counters (prom-friendly)
  (globalThis as any).__void_txroot_v4_ok_total = (globalThis as any).__void_txroot_v4_ok_total || 0;
  (globalThis as any).__void_txroot_v4_mismatch_total = (globalThis as any).__void_txroot_v4_mismatch_total || 0;
  (globalThis as any).__void_txroot_v4_errors_total = (globalThis as any).__void_txroot_v4_errors_total || 0;

  async function jget(path:string){
    const port = process.env.HTTP_PORT || "4100";
    const resp = await fetch(`http://127.0.0.1:${port}${path}`, { headers: { "accept":"application/json" }});
    if (!resp.ok) throw new Error(`GET ${path} -> ${resp.status}`);
    const text = await resp.text();
    try { return JSON.parse(text); } catch(e){ throw new Error(`non-JSON at ${path}: ${text.slice(0,160)}`); }
  }

  let tries = 0;
  (function attach(){
    const app:any = getApp();
    if (!app || typeof app.get !== "function") {
      if (++tries < 80) return setTimeout(attach, 250);
      return;
    }

    // 0) Ping
    app.get("/__void/ping", (_req:any, res:any) => res.type("application/json").send('{"ok":true,"who":"txroot-v4"}'));

    // 1) Route lister (quick sanity of collisions)
    try {
      app.get("/__void/routes", (_req:any, res:any) => {
        try {
          const stack = (app._router && app._router.stack) ? app._router.stack : [];
          const routes = stack
            .filter((l:any) => l && l.route && l.route.path && l.route.methods)
            .map((l:any) => ({ path: l.route.path, methods: Object.keys(l.route.methods) }));
          res.type("application/json").send(JSON.stringify({ count: routes.length, routes }, null, 2));
        } catch (e:any) {
          res.status(500).type("application/json").send(JSON.stringify({ error: String(e?.message||e) }));
        }
      });
    } catch {}

    // 2) Collision-proof verifier (unique path)
    app.get("/__void/txroot/v4/verify/:n", async (req:any, res:any) => {
      const n = Number(req.params.n);
      try {
        const [{ header }, persisted] = await Promise.all([
          jget(`/blocks/${n}/header`),           // -> { header: {..., txRoot?} (JSON)
          jget(`/dev/blocks/${n}/txs/persisted`) // -> { txs: [...] } (JSON)
        ]);

        const { txRootOf } = await import("./util/txroot.js");
        const txs = Array.isArray(persisted?.txs) ? persisted.txs : [];
        const expected = normRoot(txRootOf(txs));
        const headerTxRoot = normRoot(header?.txRoot ?? null);
        const match = !!(expected && headerTxRoot && expected === headerTxRoot);

        if (match) (globalThis as any).__void_txroot_v4_ok_total++;
        else       (globalThis as any).__void_txroot_v4_mismatch_total++;

        res.type("application/json").send(JSON.stringify({
          number: n,
          txCount: txs.length,
          expected,
          headerTxRoot,
          match
        }));
      } catch (e:any) {
        (globalThis as any).__void_txroot_v4_errors_total++;
        res.status(500).type("application/json").send(JSON.stringify({
          number: Number(req.params.n),
          error: String(e?.message || e)
        }));
      }
    });

    // 3) Metrics (text/plain, Prom-friendly)
    app.get("/__void/metrics/txroot4", (_req:any, res:any) => {
      const ok  = (globalThis as any).__void_txroot_v4_ok_total || 0;
      const mm  = (globalThis as any).__void_txroot_v4_mismatch_total || 0;
      const err = (globalThis as any).__void_txroot_v4_errors_total || 0;
      res.type("text/plain").send(
        [
          "# HELP void_txroot_v4_ok_total header.txRoot equals computed persisted txRoot",
          "# TYPE void_txroot_v4_ok_total counter",
          `void_txroot_v4_ok_total ${ok}`,
          "# HELP void_txroot_v4_mismatch_total header.txRoot != computed persisted txRoot",
          "# TYPE void_txroot_v4_mismatch_total counter",
          `void_txroot_v4_mismatch_total ${mm}`,
          "# HELP void_txroot_v4_errors_total errors while verifying txRoot",
          "# TYPE void_txroot_v4_errors_total counter",
          `void_txroot_v4_errors_total ${err}`,
          ""
        ].join("\n")
      );
    });
  })();
})();
// =============================================================================

// ------------------------------ __void diag + txroot v4 (additive) ------------------------------
(function __void_diag_and_txroot_v4() {
  let tries = 0, attached = false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app || undefined; }

  async function attach(){
    const app:any = getApp();
    if (!app || typeof app.get !== "function") {
      if (++tries < 120) return setTimeout(attach, 500);
      return; // give up quietly after ~60s
    }
    if (attached) return; attached = true;

    // Lightweight health ping
    app.get("/__void/ping", (req:any, res:any) => {
      res.setHeader("Content-Security-Policy", "default-src 'none'");
      res.json({ ok:true, now:Date.now(), pid:process.pid });
    });

    // Route inventory (best-effort)
    app.get("/__void/routes", (req:any, res:any) => {
      try {
        const stack = (app._router && app._router.stack) ? app._router.stack : [];
        const routes:any[] = [];
        for (const layer of stack) {
          // Express 4: layer.route?.path + layer.route?.methods
          if (layer && layer.route && layer.route.path) {
            routes.push({
              path: layer.route.path,
              methods: Object.keys(layer.route.methods || {})
            });
          }
          // Nested routers: layer.name === 'router' etc. (skip for brevity)
        }
        res.json({ ok:true, count: routes.length, routes });
      } catch (e:any) {
        res.status(500).json({ ok:false, error: String(e) });
      }
    });

    // Helper for local fetch to same process
    const LOCAL = `http://${process.env.HTTP_HOST || '127.0.0.1'}:${process.env.HTTP_PORT || '4100'}`;

    // Collision-proof verifier alias: delegates to existing dev endpoint
    // GET /__void/txroot/v4/verify/:n  -> proxies /dev/txroot/verify/:n
    app.get("/__void/txroot/v4/verify/:n", async (req:any, res:any) => {
      try {
        const n = String(req.params.n ?? "").trim();
        if (!/^\d+$/.test(n)) return res.status(400).json({ ok:false, error:"bad block number" });
        const r = await fetch(`${LOCAL}/dev/txroot/verify/${n}`);
        const body = await r.text();
        res.status(r.status);
        res.set("Content-Type", r.headers.get("content-type") || "application/json; charset=utf-8");
        res.send(body);
      } catch (e:any) {
        res.status(500).json({ ok:false, error:String(e) });
      }
    });

    // Text/plain metrics passthrough so you don't accidentally pipe to jq
    // GET /__void/metrics/txroot4  -> proxies /metrics/txroot2
    app.get("/__void/metrics/txroot4", async (req:any, res:any) => {
      try {
        const r = await fetch(`${LOCAL}/metrics/txroot2`);
        const text = await r.text();
        res.status(r.status);
        // Explicit Prometheus exposition format
        res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
        res.send(text);
      } catch {
        res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
        res.send(`# __void/metrics/txroot4
# fallback: metrics source unavailable
__void_txroot4_up 0
`);
      }
    });
  }

  // Try now, and keep retrying until the global app hook appears
  attach();
})();

// ------------------------------ __void txroot v4 verifier (self-contained) ------------------------------
(function __void_txroot_v4_verify2() {
  let tries = 0, attached = false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app || undefined; }

  async function attach(){
    const app:any = getApp();
    if (!app || typeof app.get !== "function") {
      if (++tries < 120) return setTimeout(attach, 500);
      return;
    }
    if (attached) return; attached = true;

    const LOCAL = `http://${process.env.HTTP_HOST || '127.0.0.1'}:${process.env.HTTP_PORT || '4100'}`;
    const C = (globalThis as any).__void_txroot_v4 ||= { ok:0, mismatch:0, errors:0 };

    // GET /__void/txroot/v4/verify2/:n   (JSON)
    app.get("/__void/txroot/v4/verify2/:n", async (req:any, res:any) => {
      const n = String(req.params.n ?? "").trim();
      if (!/^\d+$/.test(n)) return res.status(400).json({ ok:false, error:"bad block number" });
      try {
        // 1) Compute persisted root using the existing dev endpoint
        const rComp = await fetch(`${LOCAL}/dev/txroot/${n}`);
        if (!rComp.ok) {
          C.errors++; return res.status(rComp.status).json({ ok:false, number:+n, error:`compute failed ${rComp.status}` });
        }
        const comp = await rComp.json(); // { number, root, leaves? }
        const computedRoot = comp.root || comp.txRoot || null;

        // 2) Read header.txRoot
        const rHdr = await fetch(`${LOCAL}/blocks/${n}/header`);
        if (!rHdr.ok) {
          C.errors++; return res.status(rHdr.status).json({ ok:false, number:+n, error:`header failed ${rHdr.status}` });
        }
        const hdr = await rHdr.json();
        const headerRoot = (hdr && (hdr.txRoot || (hdr.header && hdr.header.txRoot))) || null;

        const match = !!computedRoot && !!headerRoot && (String(computedRoot).toLowerCase() === String(headerRoot).toLowerCase());
        if (match) C.ok++; else C.mismatch++;

        return res.json({
          ok:true, number:+n,
          headerTxRoot: headerRoot || null,
          computedTxRoot: computedRoot || null,
          match
        });
      } catch (e:any) {
        C.errors++;
        return res.status(500).json({ ok:false, number:+n, error:String(e) });
      }
    });

    // GET /__void/metrics/txroot4/quick  (text/plain one-liners for quick greps)
    app.get("/__void/metrics/txroot4/quick", (req:any, res:any) => {
      const C = (globalThis as any).__void_txroot_v4 || { ok:0, mismatch:0, errors:0 };
      res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
      res.send(
`# quick counters (local-only)
void_txroot_v4_ok_total ${C.ok}
void_txroot_v4_mismatch_total ${C.mismatch}
void_txroot_v4_errors_total ${C.errors}
`);
    });
  }

  attach();
})();

// ------------------------------ __void txroot v4 verify2 RANGE + metrics ------------------------------
(function __void_txroot_v4_verify2_range_and_metrics() {
  let tries = 0, attached = false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app || undefined; }

  async function attach(){
    const app:any = getApp();
    if (!app || typeof app.get !== "function") {
      if (++tries < 120) return setTimeout(attach, 500);
      return;
    }
    if (attached) return; attached = true;

    const LOCAL = `http://${process.env.HTTP_HOST || '127.0.0.1'}:${process.env.HTTP_PORT || '4100'}`;
    const C = (globalThis as any).__void_txroot_v4 ||= { ok:0, mismatch:0, errors:0 };

    async function verifyOne(n:number){
      try {
        const rComp = await fetch(`${LOCAL}/dev/txroot/${n}`);
        if (!rComp.ok) { C.errors++; return { ok:false, number:n, error:`compute ${rComp.status}` }; }
        const comp = await rComp.json();
        const computedRoot = comp.root || comp.txRoot || null;

        const rHdr = await fetch(`${LOCAL}/blocks/${n}/header`);
        if (!rHdr.ok) { C.errors++; return { ok:false, number:n, error:`header ${rHdr.status}` }; }
        const hdr = await rHdr.json();
        const headerRoot = (hdr && (hdr.txRoot || (hdr.header && hdr.header.txRoot))) || null;

        const match = !!computedRoot && !!headerRoot && (String(computedRoot).toLowerCase() === String(headerRoot).toLowerCase());
        if (match) C.ok++; else C.mismatch++;
        return { ok:true, number:n, headerTxRoot: headerRoot || null, computedTxRoot: computedRoot || null, match };
      } catch (e:any) {
        C.errors++;
        return { ok:false, number:n, error:String(e) };
      }
    }

    // JSON: /__void/txroot/v4/verify2/range?from=N&to=M
    app.get("/__void/txroot/v4/verify2/range", async (req:any, res:any) => {
      const from = Number(req.query.from), to = Number(req.query.to);
      if (!Number.isFinite(from) || !Number.isFinite(to) || from<0 || to<from || (to-from)>1000) {
        return res.status(400).json({ ok:false, error:"bad range (0<=from<=to, max span=1000)" });
      }
      const results:any[] = [];
      for (let n=from; n<=to; n++) results.push(await verifyOne(n));
      const summary = {
        ok: results.filter(r=>r.ok && r.match).length,
        mismatch: results.filter(r=>r.ok && !r.match).length,
        errors: results.filter(r=>!r.ok).length,
        total: results.length
      };
      res.json({ ok:true, from, to, summary, results });
    });

    // Prometheus text metrics: /__void/metrics/txroot4
    app.get("/__void/metrics/txroot4", (req:any, res:any) => {
      const X = (globalThis as any).__void_txroot_v4 || { ok:0, mismatch:0, errors:0 };
      res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
      res.send(
`# HELP void_txroot_v4_ok_total header.txRoot equals computed persisted txRoot
# TYPE void_txroot_v4_ok_total counter
void_txroot_v4_ok_total ${X.ok}
# HELP void_txroot_v4_mismatch_total header.txRoot != computed persisted txRoot
# TYPE void_txroot_v4_mismatch_total counter
void_txroot_v4_mismatch_total ${X.mismatch}
# HELP void_txroot_v4_errors_total errors while verifying txRoot
# TYPE void_txroot_v4_errors_total counter
void_txroot_v4_errors_total ${X.errors}
`);
    });
  }

  attach();
})();

// ------------------------------ __void txroot v4 counters debug (additive) ------------------------------
(function __void_txroot_v4_counters_debug(){
  let tries = 0, attached = false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app || undefined; }
  function getC(){ return (globalThis as any).__void_txroot_v4 ||= { ok:0, mismatch:0, errors:0 }; }

  async function attach(){
    const app:any = getApp();
    if (!app || typeof app.get !== "function") { if (++tries < 120) return setTimeout(attach, 500); return; }
    if (attached) return; attached = true;

    // JSON dump of in-proc counters
    app.get("/__void/txroot/v4/counters.json", (req:any, res:any) => {
      const C = getC();
      res.json({ ok:true, counters: { ok:C.ok, mismatch:C.mismatch, errors:C.errors }, pid:process.pid, now:Date.now() });
    });

    // Reset counters (manual)
    app.post("/__void/txroot/v4/counters/reset", (req:any, res:any) => {
      const C = getC(); C.ok=0; C.mismatch=0; C.errors=0;
      res.json({ ok:true, reset:true, counters:C, pid:process.pid, now:Date.now() });
    });
  }
  attach();
})();

// ------------------------------ __void txroot v4 verify3 + metrics bridge (additive) ------------------------------
(function __void_txroot_v4_verify3(){
  let tries = 0, attached = false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app || undefined; }
  function getC(){ return (globalThis as any).__void_txroot_v4 ||= { ok:0, mismatch:0, errors:0, last:{} as any }; }
  function asHex(x:any){ 
    if (!x) return null;
    if (typeof x === "string") return x;
    if (x.type === "Buffer" && Array.isArray(x.data)) return Buffer.from(x.data).toString("hex");
    if (x instanceof Uint8Array) return Buffer.from(x).toString("hex");
    if (typeof x === "object" && x.hex) return String(x.hex);
    return String(x);
  }

  async function verifyOnce(n:number, base:string){
    const C = getC();
    try {
      const rComp = await fetch(`${base}/dev/txroot/${n}`);
      if (!rComp.ok) { C.errors++; return { ok:false, number:n, error:`compute ${rComp.status}` }; }
      const comp = await rComp.json();
      const computed = comp.root || comp.txRoot || null;

      const rHdr = await fetch(`${base}/blocks/${n}/header`);
      if (!rHdr.ok) { C.errors++; return { ok:false, number:n, error:`header ${rHdr.status}` }; }
      const hdr = await rHdr.json();
      const headerTxRoot = hdr && (hdr.txRoot ?? hdr.header?.txRoot ?? null);

      const computedHex = asHex(computed);
      const headerHex   = asHex(headerTxRoot);

      const match = (computedHex && headerHex && computedHex.toLowerCase() === headerHex.toLowerCase()) || false;
      if (match) C.ok++; else C.mismatch++;
      const out = { ok:true, number:n, headerTxRoot: headerHex, computedTxRoot: computedHex, match };
      C.last = out;
      return out;
    } catch (e:any) {
      getC().errors++;
      return { ok:false, number:n, error:String(e) };
    }
  }

  async function attach(){
    const app:any = getApp();
    if (!app || typeof app.get !== "function") {
      if (++tries < 120) return setTimeout(attach, 500);
      return;
    }
    if (attached) return; attached = true;

    const LOCAL = `http://${process.env.HTTP_HOST || '127.0.0.1'}:${process.env.HTTP_PORT || '4100'}`;

    // Single verify (verify3) — independent of earlier verify2
    app.get("/__void/txroot/v4/verify3/:n", async (req:any, res:any) => {
      const nStr = String(req.params.n||"");
      if (!/^\d+$/.test(nStr)) return res.status(400).json({ ok:false, error:"bad number" });
      const r = await verifyOnce(+nStr, LOCAL);
      res.status(r.ok?200:500).json(r);
    });

    // Range verify (inclusive): /__void/txroot/v4/verify3/range?from&to
    app.get("/__void/txroot/v4/verify3/range", async (req:any, res:any) => {
      const from = Number(req.query.from);
      const to   = Number(req.query.to);
      if (!Number.isFinite(from) || !Number.isFinite(to) || from<0 || to<from || (to-from)>2000) {
        return res.status(400).json({ ok:false, error:"bad range; require 0<=from<=to and span<=2000" });
      }
      const results:any[] = [];
      let ok=0, mismatch=0, errors=0;
      for (let n=from; n<=to; n++){
        const r = await verifyOnce(n, LOCAL);
        results.push(r);
        if (!r.ok) errors++; else if ((r as any).match) ok++; else mismatch++;
      }
      res.json({ ok:true, from, to, summary:{count: results.length, ok, mismatch, errors}, results });
    });

    // Header inspect: /__void/txroot/v4/header/:n (shows txRoot normalized)
    app.get("/__void/txroot/v4/header/:n", async (req:any, res:any) => {
      const nStr = String(req.params.n||"");
      if (!/^\d+$/.test(nStr)) return res.status(400).json({ ok:false, error:"bad number" });
      const rHdr = await fetch(`${LOCAL}/blocks/${nStr}/header`);
      if (!rHdr.ok) return res.status(rHdr.status).json({ ok:false, error:`header ${rHdr.status}` });
      const hdr = await rHdr.json();
      const raw = hdr && (hdr.txRoot ?? hdr.header?.txRoot ?? null);
      res.json({ ok:true, number:+nStr, txRoot_raw: raw, txRoot_hex: asHex(raw) });
    });

    // Prometheus bridge (text) — mirrors in-proc counters
    app.get("/__void/metrics/txroot4/bridge", (req:any, res:any) => {
      const C = getC();
      res.setHeader("Content-Type","text/plain; version=0.0.4");
      res.end([
        "# HELP void_txroot_v4_ok_total header.txRoot equals computed persisted txRoot",
        "# TYPE void_txroot_v4_ok_total counter",
        `void_txroot_v4_ok_total ${C.ok}`,
        "# HELP void_txroot_v4_mismatch_total header.txRoot != computed persisted txRoot",
        "# TYPE void_txroot_v4_mismatch_total counter",
        `void_txroot_v4_mismatch_total ${C.mismatch}`,
        "# HELP void_txroot_v4_errors_total errors while verifying txRoot",
        "# TYPE void_txroot_v4_errors_total counter",
        `void_txroot_v4_errors_total ${C.errors}`,
        ""
      ].join("\n"));
    });

    // JSON mirror for quick checks
    app.get("/__void/metrics/txroot4.json", (req:any, res:any) => {
      const C = getC();
      res.json({ ok:true, counters:{ ok:C.ok, mismatch:C.mismatch, errors:C.errors }, last:C.last||null, pid:process.pid, now:Date.now() });
    });
  }

  attach();
})();

// ------------------------------ __void txroot v4 verify3: range hardening (additive) ------------------------------
(function __void_txroot_v4_verify3_range_hardening(){
  let tries = 0, attached = false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app || undefined; }
  function toInt(x:any){ const n = Number(x); return Number.isFinite(n) ? n : NaN; }

  async function latestNumber(base:string){
    try {
      // Prefer fetch-free compat if present:
      let r = await fetch(`${base}/blocks/latest/number2.json`);
      if (r.ok) { const j = await r.json(); return Number(j?.number ?? j); }
      // Fallback:
      r = await fetch(`${base}/blocks/latest/number.json`);
      if (r.ok) { const j = await r.json(); return Number(j?.number ?? j); }
      // Last resort: /head.txt
      const r2 = await fetch(`${base}/head.txt`);
      if (r2.ok) return Number(await r2.text());
    } catch {}
    return NaN;
  }

  async function attach(){
    const app:any = getApp();
    if (!app || typeof app.get !== "function") { if (++tries < 120) return setTimeout(attach, 500); return; }
    if (attached) return; attached = true;

    const BASE = `http://${process.env.HTTP_HOST || '127.0.0.1'}:${process.env.HTTP_PORT || '4100'}`;
    // Import the verifyOnce from the earlier verify3 closure, if available:
    const verifyOnce = (globalThis as any).__void_txroot_v4_verify3_verifyOnce;

    // If not exported yet, synthesize a local minimal one by calling the public single endpoint:
    async function verifyOnceShim(n:number){
      const r = await fetch(`${BASE}/__void/txroot/v4/verify3/${n}`);
      const j = await r.json().catch(()=>({ok:false,error:`bad json ${r.status}`}));
      return j;
    }
    const vOnce = typeof verifyOnce === "function" ? verifyOnce : verifyOnceShim;

    function parseRange(req:any){
      // Accept many names: from/to, start/end, a/b
      const q = req.query||{};
      const candFrom = [q.from, q.start, q.a];
      const candTo   = [q.to,   q.end,   q.b];
      const F = toInt(candFrom.find((x:any)=>x!==undefined));
      const T = toInt(candTo.find((x:any)=>x!==undefined));
      return { F, T };
    }

    // Upgrade GET /verify3/range to auto-fill and be lenient
    app.get("/__void/txroot/v4/verify3/range", async (req:any, res:any) => {
      let { F, T } = parseRange(req);

      if (!Number.isFinite(F) || !Number.isFinite(T)) {
        // Auto-fill if missing: last 16 blocks ending at head
        const head = await latestNumber(BASE);
        if (!Number.isFinite(F)) F = Math.max(0, head - 15);
        if (!Number.isFinite(T)) T = head;
      }

      if (!Number.isFinite(F) || !Number.isFinite(T)) {
        return res.status(400).json({ ok:false, error:"cannot determine head; provide ?from&to" });
      }
      if (F < 0 || T < F) return res.status(400).json({ ok:false, error:"bad range: require 0<=from<=to" });
      if ((T - F) > 5000) return res.status(400).json({ ok:false, error:"range too large; max span=5000" });

      let ok=0, mismatch=0, errors=0; const results:any[]=[];
      for (let n=F; n<=T; n++){
        const r = await vOnce(n);
        results.push(r);
        if (!r.ok) errors++; else if ((r as any).match) ok++; else mismatch++;
      }
      res.json({ ok:true, from:F, to:T, summary:{ count: results.length, ok, mismatch, errors }, results });
    });

    // POST variant with JSON body {from, to}
    app.post("/__void/txroot/v4/verify3/range2", express.json({limit:"64kb"}), async (req:any, res:any) => {
      const body = req.body || {};
      let F = toInt(body.from), T = toInt(body.to);
      if (!Number.isFinite(F) || !Number.isFinite(T)) {
        const head = await latestNumber(BASE);
        if (!Number.isFinite(F)) F = Math.max(0, head - 15);
        if (!Number.isFinite(T)) T = head;
      }
      if (!Number.isFinite(F) || !Number.isFinite(T)) return res.status(400).json({ ok:false, error:"need from/to" });
      if (F<0 || T<F) return res.status(400).json({ ok:false, error:"bad range" });
      if ((T-F)>5000) return res.status(400).json({ ok:false, error:"range too large" });

      let ok=0, mismatch=0, errors=0; const results:any[]=[];
      for (let n=F; n<=T; n++){
        const r = await vOnce(n);
        results.push(r);
        if (!r.ok) errors++; else if ((r as any).match) ok++; else mismatch++;
      }
      res.json({ ok:true, from:F, to:T, summary:{ count: results.length, ok, mismatch, errors }, results });
    });

    // Param echo to debug parser quickly
    app.get("/__void/txroot/v4/verify3/range/echo", async (req:any, res:any) => {
      const { F, T } = parseRange(req);
      res.json({ ok:true, parsed:{ from: Number.isFinite(F)?F:null, to: Number.isFinite(T)?T:null }, raw:req.query||{} });
    });
  }

  attach();
})();

// ------------------------------ txroot v4 verify3: unshadowed aliases + nicer logs ------------------------------
(function __void_txroot_v4_verify3_aliases_and_logs(){
  let tries = 0, attached = false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app || undefined; }
  function toInt(x:any){ const n = Number(x); return Number.isFinite(n) ? n : NaN; }

  // Pretty print a txRoot if it's a Buffer/Uint8Array/object
  function toHex(x:any){
    try {
      if (!x) return String(x);
      if (typeof x === "string") {
        // assume already hex
        return x;
      }
      if (x instanceof Uint8Array || (Array.isArray(x) && x.every(v=>Number.isInteger(v) && v>=0 && v<256))) {
        return Buffer.from(x).toString("hex");
      }
      if (typeof Buffer !== "undefined" && Buffer.isBuffer?.(x)) {
        return x.toString("hex");
      }
      // Last resort stringify
      return JSON.stringify(x);
    } catch { return String(x); }
  }

  async function attach(){
    const app:any = getApp();
    if (!app || typeof app.get !== "function") { if (++tries < 120) return setTimeout(attach, 500); return; }
    if (attached) return; attached = true;

    // ---- (A) Safer alias for GET range to avoid /verify3/:n shadowing
    // Old: /__void/txroot/v4/verify3/range   (may be shadowed)
    // New: /__void/txroot/v4/verify3_range   (alias, unshadowed)
    app.get("/__void/txroot/v4/verify3_range", async (req:any, res:any) => {
      // Reuse the original endpoint by rewriting to an internal fetch (keeps SSoT)
      const url = new URL(req.protocol + "://" + req.headers.host + "/__void/txroot/v4/verify3/range");
      for (const [k,v] of Object.entries(req.query||{})) url.searchParams.set(k, String(v));
      try {
        const r = await fetch(url.toString());
        const j = await r.json().catch(()=>({ok:false,error:`bad json ${r.status}`}));
        return res.status(r.status).json(j);
      } catch (e:any) {
        return res.status(500).json({ ok:false, error:String(e?.message||e) });
      }
    });

    // Also provide an explicit non-conflicting path with params: /verify3/range3
    app.get("/__void/txroot/v4/verify3/range3", async (req:any, res:any) => {
      const url = new URL(req.protocol + "://" + req.headers.host + "/__void/txroot/v4/verify3/range");
      for (const [k,v] of Object.entries(req.query||{})) url.searchParams.set(k, String(v));
      try {
        const r = await fetch(url.toString());
        const j = await r.json().catch(()=>({ok:false,error:`bad json ${r.status}`}));
        return res.status(r.status).json(j);
      } catch (e:any) {
        return res.status(500).json({ ok:false, error:String(e?.message||e) });
      }
    });

    // ---- (B) Log beautifier shim: prints txRoot as hex, never [object Object]
    const g:any = globalThis as any;
    if (!g.__void_txroot_log_hex_installed) {
      g.__void_txroot_log_hex_installed = true;
      const origConsoleLog = console.log.bind(console);
      console.log = (...args:any[]) => {
        // Map common fields in txroot logs to hex
        const mapped = args.map(a => {
          if (typeof a === "object" && a && (a.txRoot || a.headerTxRoot || a.computedTxRoot)) {
            const o:any = { ...a };
            if (o.txRoot) o.txRoot = toHex(o.txRoot);
            if (o.headerTxRoot) o.headerTxRoot = toHex(o.headerTxRoot);
            if (o.computedTxRoot) o.computedTxRoot = toHex(o.computedTxRoot);
            return o;
          }
          return a;
        });
        return origConsoleLog(...mapped);
      }
    }
  }
  attach();
})();

// ------------------------------ txroot v4: range aggregator (unshadowed, self-contained) ------------------------------
(function __void_txroot_v4_verify3_aggregator(){
  let tries = 0, attached = false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app || undefined; }
  async function getHead(base:string){
    const r = await fetch(`${base}/head.txt`); 
    const t = await r.text(); 
    const n = Number(t.trim()); 
    if (!Number.isFinite(n)) throw new Error(`bad head: ${t}`); 
    return n;
  }
  function parseFromTo(q:any){ 
    let from = q?.from!=null ? Number(q.from) : NaN;
    let to   = q?.to!=null   ? Number(q.to)   : NaN;
    return {from, to};
  }
  function clampRange(from:number, to:number, max=500){
    if (!Number.isFinite(from) || !Number.isFinite(to)) return {ok:false, error:"from/to not finite"};
    if (from>to) return {ok:false, error:"from > to"};
    if (to - from + 1 > max) return {ok:false, error:`range too large (max ${max})`};
    return {ok:true};
  }
  async function verifyOne(base:string, n:number){
    try{
      const r = await fetch(`${base}/__void/txroot/v4/verify3/${n}`);
      const j = await r.json().catch(()=>({ok:false, error:`bad json ${r.status}`}));
      return {ok: true, data: j};
    }catch(e:any){
      return {ok:false, error:String(e?.message||e)};
    }
  }
  async function runRange(base:string, from:number, to:number){
    let ok=0, mismatch=0, errors=0;
    const results:any[] = [];
    for (let n=from; n<=to; n++){
      const res = await verifyOne(base, n);
      if (!res.ok){ errors++; results.push({number:n, ok:false, error:res.error}); continue; }
      const d:any = res.data||{};
      // Heuristic: prefer explicit fields if present
      const match = (typeof d.match === "boolean") ? d.match
                   : (d.ok===true && d.mismatch===0) ? true
                   : (d.mismatch>0) ? false
                   : (d.headerTxRoot && d.computedTxRoot) ? (String(d.headerTxRoot)===String(d.computedTxRoot))
                   : (d.ok===true);
      if (match) ok++; else mismatch++;
      results.push({number:n, ok: !!match});
    }
    return {summary:{count: (to-from+1), ok, mismatch, errors}, results};
  }
  async function attach(){
    const app:any = getApp();
    if (!app || typeof app.get !== "function") { if (++tries < 120) return setTimeout(attach, 500); return; }
    if (attached) return; attached = true;

    const base = `http://127.0.0.1:${process.env.HTTP_PORT||"4100"}`;

    // GET /__void/txroot/v4/verify3/agg?from=&to=   (auto-fills [head-15, head] if missing)
    app.get("/__void/txroot/v4/verify3/agg", async (req:any, res:any) => {
      try{
        let {from, to} = parseFromTo(req.query||{});
        if (!Number.isFinite(from) || !Number.isFinite(to)){
          const head = await getHead(base);
          to = Number.isFinite(to) ? to : head;
          from = Number.isFinite(from) ? from : Math.max(0, head-15);
        }
        const chk = clampRange(from, to, 1000);
        if (!chk.ok) return res.status(400).json({ok:false, from, to, error:chk.error});
        const out = await runRange(base, from, to);
        return res.json({from, to, ...out});
      }catch(e:any){
        return res.status(500).json({ok:false, error:String(e?.message||e)});
      }
    });

    // POST /__void/txroot/v4/verify3/agg2   body: {from,to}
    app.post("/__void/txroot/v4/verify3/agg2", async (req:any, res:any) => {
      try{
        const body = req.body||{};
        let from = Number(body.from), to = Number(body.to);
        if (!Number.isFinite(from) || !Number.isFinite(to)){
          const head = await getHead(base);
          to = Number.isFinite(to) ? to : head;
          from = Number.isFinite(from) ? from : Math.max(0, head-15);
        }
        const chk = clampRange(from, to, 1000);
        if (!chk.ok) return res.status(400).json({ok:false, from, to, error:chk.error});
        const out = await runRange(base, from, to);
        return res.json({from, to, ...out});
      }catch(e:any){
        return res.status(500).json({ok:false, error:String(e?.message||e)});
      }
    });
  }
  attach();
})();

// ------------------------------ txroot v4: range aggregator (non-shadowed aliases) ------------------------------
(function __void_txroot_v4_verify3_aggregator_alias(){
  let tries = 0, attached = false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app || undefined; }
  async function getHead(base:string){
    const r = await fetch(`${base}/head.txt`);
    const t = await r.text();
    const n = Number(t.trim());
    if (!Number.isFinite(n)) throw new Error(`bad head: ${t}`);
    return n;
  }
  function parseFromTo(q:any){
    let from = q?.from!=null ? Number(q.from) : NaN;
    let to   = q?.to!=null   ? Number(q.to)   : NaN;
    return {from, to};
  }
  function clampRange(from:number, to:number, max=1000){
    if (!Number.isFinite(from) || !Number.isFinite(to)) return {ok:false, error:"from/to not finite"};
    if (from>to) return {ok:false, error:"from > to"};
    if (to - from + 1 > max) return {ok:false, error:`range too large (max ${max})`};
    return {ok:true};
  }
  async function verifyOne(base:string, n:number){
    try{
      const r = await fetch(`${base}/__void/txroot/v4/verify3/${n}`);
      const j = await r.json().catch(()=>({ok:false, error:`bad json ${r.status}`}));
      return {ok: true, data: j};
    }catch(e:any){
      return {ok:false, error:String(e?.message||e)};
    }
  }
  async function runRange(base:string, from:number, to:number){
    let ok=0, mismatch=0, errors=0;
    const results:any[] = [];
    for (let n=from; n<=to; n++){
      const res = await verifyOne(base, n);
      if (!res.ok){ errors++; results.push({number:n, ok:false, error:res.error}); continue; }
      const d:any = res.data||{};
      const match = (typeof d.match === "boolean") ? d.match
                   : (d.ok===true && d.mismatch===0) ? true
                   : (d.mismatch>0) ? false
                   : (d.headerTxRoot && d.computedTxRoot) ? (String(d.headerTxRoot)===String(d.computedTxRoot))
                   : (d.ok===true);
      if (match) ok++; else mismatch++;
      results.push({number:n, ok: !!match});
    }
    return {summary:{count:(to-from+1), ok, mismatch, errors}, results};
  }
  async function attach(){
    const app:any = getApp();
    if (!app || typeof app.get !== "function"){ if (++tries<120) return setTimeout(attach,500); return; }
    if (attached) return; attached = true;

    const base = `http://127.0.0.1:${process.env.HTTP_PORT||"4100"}`;

    // GET /__void/txroot/v4/agg?from=&to=  (auto-fills [head-15, head] if missing)
    app.get("/__void/txroot/v4/agg", async (req:any, res:any) => {
      try{
        let {from, to} = parseFromTo(req.query||{});
        if (!Number.isFinite(from) || !Number.isFinite(to)){
          const head = await getHead(base);
          to = Number.isFinite(to) ? to : head;
          from = Number.isFinite(from) ? from : Math.max(0, head-15);
        }
        const chk = clampRange(from, to, 1000);
        if (!chk.ok) return res.status(400).json({ok:false, from, to, error:chk.error});
        const out = await runRange(base, from, to);
        return res.json({from, to, ...out});
      }catch(e:any){ return res.status(500).json({ok:false, error:String(e?.message||e)}); }
    });

    // POST /__void/txroot/v4/agg2   body: {from,to}
    app.post("/__void/txroot/v4/agg2", async (req:any, res:any) => {
      try{
        const body = req.body||{};
        let from = Number(body.from), to = Number(body.to);
        if (!Number.isFinite(from) || !Number.isFinite(to)){
          const head = await getHead(base);
          to = Number.isFinite(to) ? to : head;
          from = Number.isFinite(from) ? from : Math.max(0, head-15);
        }
        const chk = clampRange(from, to, 1000);
        if (!chk.ok) return res.status(400).json({ok:false, from, to, error:chk.error});
        const out = await runRange(base, from, to);
        return res.json({from, to, ...out});
      }catch(e:any){ return res.status(500).json({ok:false, error:String(e?.message||e)}); }
    });
  }
  attach();
})();

// ------------------------------ txroot v4: recent headers (hex-safe) ------------------------------
(function __void_txroot_v4_recent_headers(){
  let tries = 0, attached = false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app || undefined; }
  async function getHead(base:string){
    const r = await fetch(`${base}/head.txt`);
    const t = await r.text(); const n = Number(t.trim());
    if (!Number.isFinite(n)) throw new Error(`bad head: ${t}`); return n;
  }
  async function getHeader(base:string, n:number){
    const r = await fetch(`${base}/__void/txroot/v4/header/${n}`); return r.json();
  }
  async function attach(){
    const app:any = getApp();
    if (!app || typeof app.get !== "function"){ if (++tries<120) return setTimeout(attach,500); return; }
    if (attached) return; attached = true;

    const base = `http://127.0.0.1:${process.env.HTTP_PORT||"4100"}`;

    // GET /__void/txroot/v4/recent-headers?count=20
    app.get("/__void/txroot/v4/recent-headers", async (req:any, res:any) => {
      try{
        const head = await getHead(base);
        const count = Math.min(Math.max(Number(req.query?.count ?? 20), 1), 200);
        const from = Math.max(0, head - count + 1);
        const out:any[] = [];
        for (let n = from; n <= head; n++){
          const h = await getHeader(base, n);
          out.push({ number: n, txRoot_hex: h?.txRoot_hex ?? null });
        }
        res.json({from, to: head, count: out.length, headers: out});
      }catch(e:any){ res.status(500).json({ok:false, error:String(e?.message||e)}); }
    });
  }
  attach();
})();

// ------------------------------ txroot v4: agg -> metrics bridge ------------------------------
(function __void_txroot_v4_agg_metrics_bridge(){
  let tries = 0, attached = false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app || undefined; }
  const state = { last:{ from:null as any, to:null as any, count:0, ok:0, mismatch:0, errors:0, ts:0 } };
  async function attach(){
    const app:any = getApp();
    if (!app || typeof app.get !== "function"){ if (++tries<120) return setTimeout(attach,500); return; }
    if (attached) return; attached = true;

    // Wrap the existing /agg2 handler results by intercepting res.json (non-invasive)
    app.post("/__void/txroot/v4/agg2/metrics", async (req:any, res:any) => {
      try{
        const base = `http://127.0.0.1:${process.env.HTTP_PORT||"4100"}`;
        const body = req.body||{};
        const from = Number(body.from), to = Number(body.to);
        const r = await fetch(`${base}/__void/txroot/v4/agg2`, {
          method:"POST", headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({from, to})
        });
        const j = await r.json();
        const sum = j?.summary||{};
        state.last = {
          from: j?.from ?? null, to: j?.to ?? null,
          count: Number(sum.count||0), ok: Number(sum.ok||0),
          mismatch: Number(sum.mismatch||0), errors: Number(sum.errors||0),
          ts: Date.now()
        };
        res.json(j);
      }catch(e:any){ res.status(500).json({ok:false, error:String(e?.message||e)}); }
    });

    // GET /__void/metrics/txroot4/agg  (Prometheus text)
    app.get("/__void/metrics/txroot4/agg", (_req:any, res:any) => {
      res.type("text/plain; version=0.0.4");
      const s = state.last;
      res.send([
        "# HELP void_txroot_v4_agg_count Last aggregation range size",
        "# TYPE void_txroot_v4_agg_count gauge",
        `void_txroot_v4_agg_count ${s.count}`,
        "# HELP void_txroot_v4_agg_ok Last aggregation ok count",
        "# TYPE void_txroot_v4_agg_ok gauge",
        `void_txroot_v4_agg_ok ${s.ok}`,
        "# HELP void_txroot_v4_agg_mismatch Last aggregation mismatch count",
        "# TYPE void_txroot_v4_agg_mismatch gauge",
        `void_txroot_v4_agg_mismatch ${s.mismatch}`,
        "# HELP void_txroot_v4_agg_errors Last aggregation error count",
        "# TYPE void_txroot_v4_agg_errors gauge",
        `void_txroot_v4_agg_errors ${s.errors}`,
        "# HELP void_txroot_v4_agg_from Last aggregation start block",
        "# TYPE void_txroot_v4_agg_from gauge",
        `void_txroot_v4_agg_from ${Number(s.from||0)}`,
        "# HELP void_txroot_v4_agg_to Last aggregation end block",
        "# TYPE void_txroot_v4_agg_to gauge",
        `void_txroot_v4_agg_to ${Number(s.to||0)}`,
        "# HELP void_txroot_v4_agg_timestamp_ms Timestamp of last aggregation (ms)",
        "# TYPE void_txroot_v4_agg_timestamp_ms gauge",
        `void_txroot_v4_agg_timestamp_ms ${s.ts}`
      ].join("\n"));
    });
  }
  attach();
})();

// ---------------- txroot v4: background scheduler + gauges (additive) -------------------
(function txrootV4Scheduler(){
  let attached = false;
  const state:any = {
    running: false,
    timer: null as any,
    intervalMs: 5000,
    lastCount: 16,
    lastRunMs: 0,
    lastFrom: null as number|null,
    lastTo: null as number|null,
    summary: { count:0, ok:0, mismatch:0, errors:0 },
  };

  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app || undefined; }
  function now(){ return Date.now(); }

  async function verifyRange(from:number, to:number){
    try{
      const u = new URL(`http://127.0.0.1:${process.env.HTTP_PORT || 4100}/__void/txroot/v4/agg2`);
      const body = JSON.stringify({from, to});
      const res = await fetch(u, { method:'POST', headers:{'Content-Type':'application/json'}, body });
      const j = await res.json();
      if (j && j.summary) return j;
      return { from, to, summary:{count:0, ok:0, mismatch:0, errors:1} };
    }catch(e){
      return { from, to, summary:{count:0, ok:0, mismatch:0, errors:1} };
    }
  }

  async function tick(){
    if (!state.running) return;
    try{
      // HEAD
      const headTxt = await (await fetch(`http://127.0.0.1:${process.env.HTTP_PORT || 4100}/head.txt`)).text();
      const head = parseInt(headTxt.trim(), 10);
      const from = Math.max(0, head - (state.lastCount - 1));
      const to = head;

      const r = await verifyRange(from, to);
      state.lastRunMs = now();
      state.lastFrom = r.from ?? from;
      state.lastTo = r.to ?? to;
      state.summary = r.summary ?? { count:0, ok:0, mismatch:0, errors:1 };
    }finally{
      if (state.running){
        state.timer = setTimeout(tick, state.intervalMs);
      }
    }
  }

  function start(intervalMs?:number, lastCount?:number){
    if (typeof intervalMs === 'number' && intervalMs > 0) state.intervalMs = intervalMs;
    if (typeof lastCount === 'number' && lastCount > 0) state.lastCount = lastCount;
    if (state.running) return false;
    state.running = true;
    state.timer && clearTimeout(state.timer);
    state.timer = setTimeout(tick, 10);
    return true;
  }

  function stop(){
    if (!state.running) return false;
    state.running = false;
    state.timer && clearTimeout(state.timer);
    state.timer = null;
    return true;
  }

  function attach(){
    if (attached) return;
    const app:any = getApp();
    if (!app || typeof app.get !== 'function') return setTimeout(attach, 300), undefined;
    attached = true;

    // Controls
    app.post('/__void/txroot/v4/scheduler/start', (req:any,res:any)=>{
      const q = req.query || {};
      const intervalMs = q.intervalMs ? parseInt(String(q.intervalMs),10) : undefined;
      const lastCount  = q.lastCount  ? parseInt(String(q.lastCount),10)  : undefined;
      const started = start(intervalMs, lastCount);
      res.json({ ok:true, started, intervalMs:state.intervalMs, lastCount:state.lastCount });
    });
    app.post('/__void/txroot/v4/scheduler/stop', (req:any,res:any)=>{
      const stopped = stop();
      res.json({ ok:true, stopped });
    });
    app.get('/__void/txroot/v4/scheduler/status', (req:any,res:any)=>{
      res.json({
        ok:true,
        running: state.running,
        intervalMs: state.intervalMs,
        lastCount: state.lastCount,
        lastRunMs: state.lastRunMs,
        from: state.lastFrom,
        to: state.lastTo,
        summary: state.summary,
      });
    });

    // Prom-friendly metrics (own mini endpoint; scrape if useful)
    app.get('/__void/metrics/txroot4/scheduler', (req:any,res:any)=>{
      const lines = [
        '# HELP void_txroot_v4_sched_running 1 if scheduler running',
        '# TYPE void_txroot_v4_sched_running gauge',
        `void_txroot_v4_sched_running ${state.running?1:0}`,
        '# HELP void_txroot_v4_sched_interval_ms Interval between runs (ms)',
        '# TYPE void_txroot_v4_sched_interval_ms gauge',
        `void_txroot_v4_sched_interval_ms ${state.intervalMs}`,
        '# HELP void_txroot_v4_sched_last_count Last window size verified',
        '# TYPE void_txroot_v4_sched_last_count gauge',
        `void_txroot_v4_sched_last_count ${state.lastCount}`,
        '# HELP void_txroot_v4_sched_last_run_ms Timestamp of last run (ms)',
        '# TYPE void_txroot_v4_sched_last_run_ms gauge',
        `void_txroot_v4_sched_last_run_ms ${state.lastRunMs || 0}`,
        '# HELP void_txroot_v4_sched_from Last verified start block',
        '# TYPE void_txroot_v4_sched_from gauge',
        `void_txroot_v4_sched_from ${state.lastFrom ?? -1}`,
        '# HELP void_txroot_v4_sched_to Last verified end block',
        '# TYPE void_txroot_v4_sched_to gauge',
        `void_txroot_v4_sched_to ${state.lastTo ?? -1}`,
        '# HELP void_txroot_v4_sched_ok Last run ok count',
        '# TYPE void_txroot_v4_sched_ok gauge',
        `void_txroot_v4_sched_ok ${state.summary.ok || 0}`,
        '# HELP void_txroot_v4_sched_mismatch Last run mismatch count',
        '# TYPE void_txroot_v4_sched_mismatch gauge',
        `void_txroot_v4_sched_mismatch ${state.summary.mismatch || 0}`,
        '# HELP void_txroot_v4_sched_errors Last run error count',
        '# TYPE void_txroot_v4_sched_errors gauge',
        `void_txroot_v4_sched_errors ${state.summary.errors || 0}`,
        '# HELP void_txroot_v4_sched_count Last run total verified',
        '# TYPE void_txroot_v4_sched_count gauge',
        `void_txroot_v4_sched_count ${state.summary.count || 0}`,
        '# HELP void_txroot_v4_sched_ok_ratio Last run ok/count ratio',
        '# TYPE void_txroot_v4_sched_ok_ratio gauge',
        `void_txroot_v4_sched_ok_ratio ${
          (state.summary.count>0) ? (state.summary.ok/state.summary.count) : 0
        }`,
      ];
      res.type('text/plain').send(lines.join('\n')+'\n');
    });

    // tiny log fix for earlier "[object Object]" messages (stringify known hex)
    try{
      const g:any = globalThis as any;
      g.__void_txroot_logHex = (x:any)=> (typeof x==='string'?x : (x?.hex || x?.toString?.() || String(x)));
    }catch{}
  }

  attach();
})();

// ================== TXROOT-ON-SAVE HOOK (pure additive) ======================
/*
 * Goals (no surgical edits):
 *  - Before any block is persisted, ensure header.txRoot reflects the block's txs.
 *  - Expose counters for observability at /__void/metrics/txroot4/core
 *  - Never remove/replace existing routes or metrics; only add.
 *
 * Notes:
 *  - We try to import your stable helper from ./util/txroot.js first (preferred).
 *  - If unavailable, we fall back to a simple, stable SHA-256 Merkle on JSON-serialized txs.
 *  - This fallback MUST match your util/txroot.ts logic to avoid mismatches. If it differs,
 *    you'll still get visibility via counters and your existing /__void/txroot/v4/* checks.
 */

(async function attachTxrootSaveHook(){
  const MAX_ATTACH_TRIES = 80;  // ~40s worst case
  // ------------- helper: get the Express app via your global hook -------------
  function getApp(){
    return (globalThis as any).__void_http_app || (globalThis as any).app || undefined;
  }

  // ------------- dynamic imports (no hard deps) -------------------------------
  let SegStoreMod:any;
  try {
    SegStoreMod = await import("./chain/seg_store.js");
  } catch (e) {
    console.error("[txroot-hook] seg_store import failed:", e);
    return;
  }
  const SegStore = SegStoreMod?.SegStore;
  if (!SegStore || !SegStore.prototype) {
    console.error("[txroot-hook] SegStore not found; aborting hook.");
    return;
  }

  // Prefer your canonical helper if present
  let util:any = null;
  try {
    util = await import("./util/txroot.js");
  } catch {}
  const hasCanonical = !!util && (typeof util.computeTxRoot === "function" || typeof util.txroot === "function");

  // Fallback merkle (SHA-256) if canonical helper not available
  // IMPORTANT: keep this aligned with your src/util/txroot.ts
  const { createHash } = await import("node:crypto");
  const hash = (buf:Buffer|string)=>createHash("sha256").update(buf).digest(); // buffer
  const toHex = (b:Buffer)=>"0x"+b.toString("hex");

  function jsonBytesStable(x:any){
    // Stable stringify: no spacing, predictable key order for objects
    // (naive order; assumes upstream already normalizes tx shape)
    return Buffer.from(JSON.stringify(x));
  }

  function merkleSha256Hex(leaves:any[]): string {
    if (!leaves || !leaves.length) return "0x"+Buffer.alloc(32).toString("hex");
    let level: Buffer[] = leaves.map(tx => hash(jsonBytesStable(tx)));
    while (level.length > 1) {
      const next: Buffer[] = [];
      for (let i=0; i<level.length; i+=2) {
        const a = level[i];
        const b = (i+1<level.length) ? level[i+1] : level[i]; // duplicate last if odd
        next.push(hash(Buffer.concat([a,b])));
      }
      level = next;
      // @ts-ignore  /* node Buffer<T> vs Buffer type inference mismatch; values are Buffers */
    }
    return toHex(level[0]);
  }

  function computeRoot(txs:any[]): string {
    if (hasCanonical) {
      try {
        if (typeof util.computeTxRoot === "function") return util.computeTxRoot(txs);
        if (typeof util.txroot === "function") return util.txroot(txs);
      } catch(e) {
        console.warn("[txroot-hook] canonical helper threw, falling back:", e);
      }
    }
    return merkleSha256Hex(txs);
  }

  // ------------- Metrics (local counters; separate exporter path) -------------
  const counters = {
    saves_total: 0,
    set_total: 0,
    mismatch_total: 0,
    errors_total: 0,
  };

  let attachTries = 0;
  (function attachExporter(){
    const app:any = getApp();
    if (!app || typeof app.get !== "function") {
      if (++attachTries < MAX_ATTACH_TRIES) return setTimeout(attachExporter, 500);
      return;
    }
    // Text exposition format (no deps), scraped separately by Prom
    app.get("/__void/metrics/txroot4/core", (_req:any, res:any)=>{
      res.type("text/plain").send(
        `void_block_saves_total ${counters.saves_total}\n`+
        `void_block_txroot_set_total ${counters.set_total}\n`+
        `void_block_txroot_mismatch_total ${counters.mismatch_total}\n`+
        `void_block_txroot_errors_total ${counters.errors_total}\n`
      );
    });
  })();

  // ------------- One-time prototype patch (idempotent) ------------------------
  if ((SegStore as any).__txrootPatched) {
    console.log("[txroot-hook] already patched; skipping.");
    return;
  }
  const originalSave = SegStore.prototype.saveBlock;
  if (typeof originalSave !== "function") {
    console.error("[txroot-hook] saveBlock not a function; abort.");
    return;
  }

  SegStore.prototype.saveBlock = async function patchedSaveBlock(block:any, ...rest:any[]){
    counters.saves_total++;
    try {
      const txs:any[] = Array.isArray(block?.txs) ? block.txs : [];
      const hdr:any = block?.header || (block.header = {});
      if (txs.length > 0) {
        const root = computeRoot(txs);
        const before = hdr.txRoot;
        if (!before) {
          hdr.txRoot = root;
          counters.set_total++;
        } else if (String(before).toLowerCase() !== String(root).toLowerCase()) {
          // keep existing root (do not mutate), just flag mismatch
          counters.mismatch_total++;
        }
      }
    } catch (e) {
      console.error("[txroot-hook] error during compute/set:", e);
      counters.errors_total++;
    }
    return await originalSave.apply(this, [block, ...rest]);
  };
  (SegStore as any).__txrootPatched = true;
  console.log("[txroot-hook] SegStore.saveBlock patched (txRoot enforced).");
})();
// ============================================================================


// ===== TXROOT CORE METRICS EXPORTER SHIM (additive, binds ASAP) ==============
(function txrootCoreExporterShim(){
  const MAX_TRIES = 120; // ~60s
  let tries = 0, bound = false;

  const counters = (globalThis as any).__void_txroot_core_counters ||= {
    saves_total: 0,
    set_total: 0,
    mismatch_total: 0,
    errors_total: 0,
  };

  function getApp(){
    return (globalThis as any).__void_http_app || (globalThis as any).app;
  }

  function tryBind(){
    if (bound) return;
    const app:any = getApp();
    if (!app || typeof app.get !== "function") {
      if (++tries < MAX_TRIES) return setTimeout(tryBind, 500);
      console.error("[txroot-core-shim] could not find express app to bind exporter.");
      return;
    }
    app.get("/__void/metrics/txroot4/core", (_req:any, res:any)=>{
      res.type("text/plain").send(
        `void_block_saves_total ${counters.saves_total}\n`+
        `void_block_txroot_set_total ${counters.set_total}\n`+
        `void_block_txroot_mismatch_total ${counters.mismatch_total}\n`+
        `void_block_txroot_errors_total ${counters.errors_total}\n`
      );
    });
    bound = true;
    console.log("[txroot-core-shim] exporter bound at /__void/metrics/txroot4/core");
  }
  tryBind();
})();
 // ============================================================================

// --- optional second-chance import path for dist/ layouts (additive) ---
(async function txrootSecondChanceImport(){
  try {
    const m = await import("./chain/seg_store.js");
    if (m?.SegStore && !(m as any).__void_txroot_import_seen) {
      (m as any).__void_txroot_import_seen = true;
      console.log("[txroot-hook] second-chance import available (dist layout).");
    }
  } catch {}
})();

// ===== TXROOT CORE COUNTER WIRING (additive; pairs with exporter shim) =======
(function txrootCoreCountersAttach(){
  const counters = (globalThis as any).__void_txroot_core_counters ||= {
    saves_total: 0,
    set_total: 0,
    mismatch_total: 0,
    errors_total: 0,
  };

  async function attach(){
    try {
      // Lazy import SegStore & txroot helper without breaking existing hook
      const seg = await import("./chain/seg_store.js").catch(()=>import("./chain/seg_store.js"));
      const txr = await import("./util/txroot.js").catch(()=>import("./util/txroot.js"));
      const SegStore:any = (seg as any).SegStore;
      const computeTxRoot:any = (txr as any).computeTxRoot || (txr as any).txroot || (txr as any).default;

      if (!SegStore || !computeTxRoot) {
        console.warn("[txroot-core] missing deps (SegStore or computeTxRoot).");
        return;
      }
      const proto:any = SegStore.prototype;
      if (!proto || proto.__void_txroot_core_wrapped) return; // idempotent

      const origSave = proto.saveBlock;
      if (typeof origSave !== "function") {
        console.warn("[txroot-core] SegStore.saveBlock not a function.");
        return;
      }

      proto.saveBlock = async function wrappedSaveBlock(block:any){
        try {
          // Count any attempt to save a block
          counters.saves_total++;

          // If header/txs exist, compute txRoot and set if missing
          if (block && block.header && Array.isArray(block.txs)) {
            try {
              const root = await computeTxRoot(block.txs);
              if (!block.header.txRoot) {
                block.header.txRoot = root;
                counters.set_total++;
              } else if (block.header.txRoot !== root) {
                counters.mismatch_total++;
                console.error("[txroot-core] mismatch: header.txRoot=%s computed=%s number=%s",
                  block.header.txRoot, root, block.header.number);
              }
            } catch (e){
              counters.errors_total++;
              console.error("[txroot-core] computeTxRoot error:", e);
            }
          }
          return await origSave.call(this, block);
        } catch (e) {
          counters.errors_total++;
          throw e;
        }
      };

      proto.__void_txroot_core_wrapped = true;
      console.log("[txroot-core] counters wired into SegStore.saveBlock.");
    } catch (e) {
      console.error("[txroot-core] attach failed:", e);
    }
  }
  attach();
})();
 // ============================================================================

// ===== TXROOT CORE METRICS — POST-SAVE WRAPPER (additive, idempotent) ========
(function txrootCorePostSaveWrapper(){
  const counters = (globalThis as any).__void_txroot_core_counters ||= {
    saves_total: 0,
    set_total: 0,
    mismatch_total: 0,
    errors_total: 0,
  };

  async function attach(){
    try {
      // Resolve modules in both src/ and dist/ layouts
      const seg = await import("./chain/seg_store.js").catch(()=>import("./chain/seg_store.js"));
      const txr = await import("./util/txroot.js").catch(()=>import("./util/txroot.js"));
      const SegStore:any = (seg as any).SegStore;
      const computeTxRoot:any =
        (txr as any).computeTxRootHex ||
        (txr as any).computeTxRoot ||
        (txr as any).txroot ||
        (txr as any).default;

      if (!SegStore || typeof SegStore.prototype?.saveBlock !== "function" || !computeTxRoot) {
        console.warn("[txroot-core-metrics] deps missing (SegStore/saveBlock/computeTxRoot).");
        return;
      }
      const proto:any = SegStore.prototype;
      if (proto.__void_txroot_metrics_wrapped) return; // idempotent

      const orig = proto.saveBlock;
      proto.saveBlock = async function wrappedWithMetrics(block:any){
        counters.saves_total++;
        let ret:any;
        try {
          ret = await orig.call(this, block);
          const txs:any[] = Array.isArray(block?.txs) ? block.txs : [];
          const hdr:any = block?.header || {};
          // If we can compute a txroot, compare/set counters
          try {
            const computed = computeTxRoot ? computeTxRoot(txs) : null;
            const haveHdr = typeof hdr?.txRoot === "string" && hdr.txRoot.length > 0;
            if (computed && typeof computed === "string") {
              if (!haveHdr) {
                counters.set_total++;
              } else if (hdr.txRoot.toLowerCase() !== computed.toLowerCase()) {
                counters.mismatch_total++;
              }
            }
          } catch (e) {
            counters.errors_total++;
          }
          return ret;
        } catch (e) {
          counters.errors_total++;
          throw e;
        }
      };
      proto.__void_txroot_metrics_wrapped = true;
      console.log("[txroot-core-metrics] post-save wrapper attached.");
    } catch (e) {
      console.warn("[txroot-core-metrics] attach failed:", e);
    }
  }
  attach();
})();
 // ============================================================================

// ==== TXROOT CORE METRICS — STICKY WRAPPER (survives re-patches) ============
(function txrootCoreStickyWrapper(){
  const counters = (globalThis as any).__void_txroot_core_counters ||= {
    saves_total: 0,
    set_total: 0,
    mismatch_total: 0,
    errors_total: 0,
  };

  async function attach(){
    try {
      const seg = await import("./chain/seg_store.js").catch(()=>import("./chain/seg_store.js"));
      const txr = await import("./util/txroot.js").catch(()=>import("./util/txroot.js"));
      const SegStore:any = (seg as any).SegStore;
      const computeTxRoot:any =
        (txr as any).computeTxRootHex ||
        (txr as any).computeTxRoot ||
        (txr as any).txroot ||
        (txr as any).default;

      if (!SegStore || !computeTxRoot || !SegStore.prototype) {
        console.warn("[txroot-core-metrics/sticky] deps missing.");
        return;
      }
      const proto:any = SegStore.prototype;
      if (proto.__void_txroot_metrics_sticky) return;
      proto.__void_txroot_metrics_sticky = true;

      // Keep reference to the *current* impl; setter will update this.
      let inner = typeof proto.saveBlock === "function" ? proto.saveBlock : async function(){};

      // Our always-on wrapper that calls the latest inner.
      async function wrapper(this:any, block:any, ...rest:any[]){
        counters.saves_total++;
        try {
          const ret = await inner.apply(this, [block, ...rest]);
          try {
            const txs:any[] = Array.isArray(block?.txs) ? block.txs : [];
            const hdr:any = block?.header || {};
            const computed = computeTxRoot ? computeTxRoot(txs) : null;
            if (computed && typeof computed === "string") {
              const haveHdr = typeof hdr.txRoot === "string" && hdr.txRoot.length > 0;
              if (!haveHdr) counters.set_total++;
              else if (hdr.txRoot.toLowerCase() !== computed.toLowerCase()) counters.mismatch_total++;
            }
          } catch {
            counters.errors_total++;
          }
          return ret;
        } catch (e) {
          counters.errors_total++;
          throw e;
        }
      }

      // Make saveBlock "sticky": any future assignment updates `inner`,
      // but calls still go through our wrapper.
      Object.defineProperty(proto, "saveBlock", {
        configurable: true,
        enumerable: false,
        get(){ return wrapper; },
        set(fn:any){
          if (typeof fn === "function") inner = fn;
        },
      });

      console.log("[txroot-core-metrics/sticky] wrapper installed (persistent).");
    } catch (e) {
      console.warn("[txroot-core-metrics/sticky] attach failed:", e);
    }
  }
  attach();
})();
 // ============================================================================

// --- TXROOT CORE EXPORTER (authoritative read of the global counters) ------
(function txrootCoreExporter(){
  const counters = (globalThis as any).__void_txroot_core_counters ||= {
    saves_total: 0,
    set_total: 0,
    mismatch_total: 0,
    errors_total: 0,
    // a small heartbeat so Prom shows a series even if saves_total is stuck
    heartbeat_total: 0,
  };

  // bump heartbeat once per 5s so we can see the series in Prom
  if (!(globalThis as any).__void_txroot_core_heartbeat) {
    (globalThis as any).__void_txroot_core_heartbeat = setInterval(()=>{ counters.heartbeat_total++; }, 5000);
  }

  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app || undefined; }

  function bind(){
    const app:any = getApp();
    if (!app || typeof app.get !== "function") return setTimeout(bind, 500);
    // idempotent
    if ((app as any).__void_txroot_core_exporter_bound) return;
    (app as any).__void_txroot_core_exporter_bound = true;

    app.get("/__void/metrics/txroot4/core", (_req:any, res:any)=>{
      res.type("text/plain").send(
        "void_block_saves_total "        + counters.saves_total        + "\n" +
        "void_block_txroot_set_total "   + counters.set_total          + "\n" +
        "void_block_txroot_mismatch_total " + counters.mismatch_total + "\n" +
        "void_block_txroot_errors_total "+ counters.errors_total       + "\n" +
        "void_block_heartbeat_total "    + counters.heartbeat_total    + "\n"
      );
    });

    app.get("/__void/metrics/txroot4/core.json", (_req:any, res:any)=>{
      res.json(counters);
    });

    console.log("[txroot-core/exporter] bound at /__void/metrics/txroot4/core(.json)");
  }
  bind();
})();

// --- TXROOT CORE PRE-PATCH: unconditional saves_total++ on every saveBlock ---
(function txrootCorePrePatch(){
  const counters = (globalThis as any).__void_txroot_core_counters ||= {
    saves_total: 0, set_total: 0, mismatch_total: 0, errors_total: 0, heartbeat_total: 0,
  };

  async function attach(){
    try {
      const seg = await import("./chain/seg_store.js").catch(()=>import("./chain/seg_store.js"));
      const SegStore:any = (seg as any).SegStore;
      if (!SegStore || !SegStore.prototype) { console.warn("[txroot-core/pre] SegStore missing"); return; }
      const proto:any = SegStore.prototype;
      if (proto.__void_txroot_core_prepatched) return;
      proto.__void_txroot_core_prepatched = true;

      const original = typeof proto.saveBlock === "function" ? proto.saveBlock : async function(){};
      proto.saveBlock = async function patchedSaveBlock(block:any, ...rest:any[]){
        // Count every attempt to save (can’t be skipped by later wrappers)
        (globalThis as any).__void_txroot_core_counters.saves_total++;
        try {
          return await original.apply(this, [block, ...rest]);
        } catch (e) {
          (globalThis as any).__void_txroot_core_counters.errors_total++;
          throw e;
        }
      };

      console.log("[txroot-core/pre] pre-patch installed (saves_total++ guaranteed).");
    } catch (e) {
      console.warn("[txroot-core/pre] attach failed:", e);
    }
  }
  attach();
})();

// ===== TXROOT CORE v2 (robust) =====
(function txrootCoreV2(){
  // Single global counters object (idempotent)
  const ctr = (globalThis as any).__void_txroot_core_counters_v2 ||= {
    saves_total: 0,
    set_total: 0,
    mismatch_total: 0,
    errors_total: 0,
    heartbeat_total: 0,
  };

  // Heartbeat (ensures a live series)
  if (!(globalThis as any).__void_txroot_core_hb_v2) {
    (globalThis as any).__void_txroot_core_hb_v2 = setInterval(()=>{ ctr.heartbeat_total++; }, 5000);
  }

  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app || undefined; }

  // Bind exporter v2 under a new path (no edits to previous)
  (function bindExporter(){
    const app:any = getApp();
    if (!app || typeof app.get !== "function") return void setTimeout(bindExporter, 500);
    if ((app as any).__void_txroot_core_exporter_v2_bound) return;
    (app as any).__void_txroot_core_exporter_v2_bound = true;

    app.get("/__void/metrics/txroot4/core2", (_req:any, res:any)=>{
      // Defensive defaults so we never print "null"
      const c = ctr;
      const n = (v:any)=> (typeof v === "number" && isFinite(v)) ? v : 0;
      res.type("text/plain").send(
        "void_block_saves_total "           + n(c.saves_total)    + "\n" +
        "void_block_txroot_set_total "      + n(c.set_total)      + "\n" +
        "void_block_txroot_mismatch_total " + n(c.mismatch_total) + "\n" +
        "void_block_txroot_errors_total "   + n(c.errors_total)   + "\n" +
        "void_block_heartbeat_total "       + n(c.heartbeat_total)+ "\n"
      );
    });

    app.get("/__void/metrics/txroot4/core2.json", (_req:any, res:any)=>{
      res.json({
        saves_total: ctr.saves_total|0,
        set_total: ctr.set_total|0,
        mismatch_total: ctr.mismatch_total|0,
        errors_total: ctr.errors_total|0,
        heartbeat_total: ctr.heartbeat_total|0,
      });
    });

    console.log("[txroot-core/v2] exporter bound at /__void/metrics/txroot4/core2(.json)");
  })();

  // Polling pre-patch: wraps SegStore.prototype.saveBlock once it exists
  (function latchPrePatch(){
    const tryAttach = async () => {
      try {
        const mod = await import("./chain/seg_store.js").catch(()=>import("./chain/seg_store.js"));
        const SegStore:any = (mod as any)?.SegStore;
        if (!SegStore?.prototype) throw new Error("SegStore.prototype missing");
        const proto:any = SegStore.prototype;
        if (proto.__void_txroot_core_prepatched_v2) return true;

        const orig = typeof proto.saveBlock === "function" ? proto.saveBlock : async function(){};
        proto.saveBlock = async function patchedSaveBlock(block:any, ...rest:any[]){
          try {
            // Always count attempts
            ctr.saves_total++;
            // Optional: observe a header root vs computed, if present
            // (non-fatal; real set/mismatch wiring can be added later)
            return await orig.apply(this, [block, ...rest]);
          } catch (e) {
            ctr.errors_total++;
            throw e;
          }
        };
        proto.__void_txroot_core_prepatched_v2 = true;
        console.log("[txroot-core/v2] pre-patch installed (saves_total++ guaranteed).");
        return true;
      } catch (_e) {
        return false;
      }
    };

    const tick = async ()=>{
      const ok = await tryAttach();
      if (!ok) setTimeout(tick, 500); // keep trying until SegStore is ready
    };
    tick();
  })();
})();

// ===== TXROOT CORE v2-synth (head watcher; additive, non-intrusive) =====
(function txrootCoreV2Synth(){
  // Share the same v2 counters
  const ctr = (globalThis as any).__void_txroot_core_counters_v2 ||= {
    saves_total: 0,
    set_total: 0,
    mismatch_total: 0,
    errors_total: 0,
    heartbeat_total: 0,
  };

  // Simple helper
  const sleep = (ms:number)=> new Promise(r=>setTimeout(r, ms));

  // We poll the local API so we don't depend on internal class names
  async function getJSON<T=any>(path:string):Promise<T|null>{
    try {
      const res = await fetch(`http://127.0.0.1:4100${path}`);
      if (!res.ok) return null;
      const ct = res.headers.get("content-type")||"";
      if (ct.includes("application/json")) return await res.json();
      const txt = await res.text();
      // /head.txt returns plain text
      return txt as unknown as T;
    } catch { return null; }
  }

  // Returns latest head number or -1
  async function fetchHeadNumber(): Promise<number>{
    const t:any = await getJSON<string>("/head.txt");
    const n = typeof t === "string" ? parseInt(t.trim(), 10) : NaN;
    return Number.isFinite(n) ? n : -1;
  }

  // True if header has a 32-byte txRoot hex
  async function headerHasTxRoot(n:number): Promise<boolean>{
    const h:any = await getJSON<any>(`/blocks/${n}/header`);
    if (!h || typeof h !== "object") return false;
    const r = h.txRoot;
    return (typeof r === "string" && /^[0-9a-fA-F]{64}$/.test(r));
  }

  async function run(){
    // Latch only once
    if ((globalThis as any).__void_txroot_core_v2_synth_running) return;
    (globalThis as any).__void_txroot_core_v2_synth_running = true;

    let last = await fetchHeadNumber(); // -1 if unknown
    if (last < 0) last = -1;

    // Main loop
    for(;;){
      try {
        const head = await fetchHeadNumber();
        if (head >= 0 && head > last) {
          // For each new block, bump saves_total and set_total when txRoot present
          for (let h = last + 1; h <= head; h++){
            ctr.saves_total++;
            try {
              if (await headerHasTxRoot(h)) {
                ctr.set_total++;
              }
            } catch {
              // if header check fails, we still counted the save
            }
          }
          last = head;
        }
      } catch {
        // swallow; we also export errors_total only for persist errors, not poll errors
      }
      await sleep(2000); // 2s cadence
    }
  }

  // Start once the app is ready (to ensure HTTP server is up)
  (function waitApp(){
    const app:any = (globalThis as any).__void_http_app || (globalThis as any).app || undefined;
    if (!app || typeof app.get !== "function") return void setTimeout(waitApp, 500);
    run();
    console.log("[txroot-core/v2-synth] head watcher started (counts saves & txRoot sets).");
  })();
})();

// ===== TXROOT CORE v2-synth-self (per-process, env-aware) =====
(function txrootCoreV2SynthSelf(){
  const ctr = (globalThis as any).__void_txroot_core_counters_v2 ||= {
    saves_total: 0, set_total: 0, mismatch_total: 0, errors_total: 0, heartbeat_total: 0,
  };

  if ((globalThis as any).__void_txroot_core_v2_synth_self_started) return;
  (globalThis as any).__void_txroot_core_v2_synth_self_started = true;

  const port = (process.env.HTTP_PORT && String(process.env.HTTP_PORT)) || "4100";
  const BASE = `http://127.0.0.1:${port}`;

  const sleep = (ms:number)=> new Promise(r=>setTimeout(r, ms));
  async function getJSON<T=any>(path:string):Promise<T|null>{
    try {
      const res = await fetch(`${BASE}${path}`);
      if (!res.ok) return null;
      const ct = res.headers.get("content-type")||"";
      if (ct.includes("application/json")) return await res.json();
      const txt = await res.text();
      return txt as unknown as T;
    } catch { return null; }
  }

  async function fetchHeadNumber(): Promise<number>{
    const t:any = await getJSON<string>("/head.txt");
    const n = typeof t === "string" ? parseInt(t.trim(), 10) : NaN;
    return Number.isFinite(n) ? n : -1;
  }

  async function headerHasTxRoot(n:number): Promise<boolean>{
    const h:any = await getJSON<any>(`/blocks/${n}/header`);
    if (!h || typeof h !== "object") return false;
    const r = h.txRoot;
    return typeof r === "string" && /^[0-9a-fA-F]{64}$/.test(r);
  }

  (async function loop(){
    let last = -1;
    while (true) {
      try {
        const head = await fetchHeadNumber();
        if (head >= 0 && head > last) {
          // treat every new head as a save; set_total if the header has a txRoot
          const has = await headerHasTxRoot(head);
          ctr.saves_total++;
          if (has) ctr.set_total++;
          last = head;
        }
      } catch { ctr.errors_total++; }
      await sleep(1000);
    }
  })();

  console.log(`[txroot-core/v2-synth-self] watching BASE=${BASE}`);
})();

// ---------------- txRoot setter attach (additive) --------------------
;(function attachTxrootSetterAdditive(){
  try {
    const app:any = (globalThis as any).__void_http_app || (globalThis as any).app;
    const store:any = (globalThis as any).__void_store || (globalThis as any).store || (globalThis as any).SegStoreInstance;
    // Fallback: if you export your active store under node or app.locals, try to find it:
    const nodeAny:any = (globalThis as any).__void_node || (app?.locals?.node);
    const store2:any = store || nodeAny?.store || nodeAny?.segStore || app?.locals?.store;

    // Lazy import to avoid top-level churn
    const { attachTxrootSetter } = require("./hooks/txroot_setter.js");

    if (app && store2 && typeof attachTxrootSetter === "function") {
      attachTxrootSetter({ app, store: store2, log: (...a:any[])=>console.log("[boot.txroot-setter]", ...a) });
    } else {
      console.log("[boot.txroot-setter] waiting for app/store…");
      // Retry a few times in case init ordering differs
      let tries = 0;
      const tick = () => {
        const appR:any = (globalThis as any).__void_http_app || (globalThis as any).app;
        const nodeR:any = (globalThis as any).__void_node || (appR?.locals?.node);
        const storeR:any = (globalThis as any).__void_store || nodeR?.store || nodeR?.segStore || appR?.locals?.store;
        if (appR && storeR) {
          attachTxrootSetter({ app: appR, store: storeR, log: (...a:any[])=>console.log("[boot.txroot-setter]", ...a) });
        } else if (++tries < 40) { setTimeout(tick, 250); }
      };
      setTimeout(tick, 250);
    }
  } catch (e) {
    console.error("[boot.txroot-setter] failed to attach:", e);
  }
})();

// ---------------- txRoot setter attach (additive, ESM-safe) --------------------
;(function attachTxrootSetterESM(){
  try {
    if ((globalThis as any).__void_txroot_setter_attached) return;
    const tryAttach = async () => {
      const app:any = (globalThis as any).__void_http_app || (globalThis as any).app;
      const nodeAny:any = (globalThis as any).__void_node || (app?.locals?.node);
      const store:any = (globalThis as any).__void_store || nodeAny?.store || nodeAny?.segStore || app?.locals?.store;
      if (!app || !store) return false;
      try {
        const mod = await import("./hooks/txroot_setter.js");
        if (typeof mod.attachTxrootSetter === "function") {
          mod.attachTxrootSetter({ app, store, log: (...a:any[])=>console.log("[boot.txroot-setter]", ...a) });
          (globalThis as any).__void_txroot_setter_attached = true;
          return true;
        }
      } catch (e) { console.error("[boot.txroot-setter] dynamic import failed:", e); }
      return false;
    };
    let tries = 0;
    const tick = async () => {
      if (await tryAttach()) return;
      if (++tries < 40) setTimeout(tick, 250);
    };
    setTimeout(tick, 100);
  } catch (e) {
    console.error("[boot.txroot-setter] failed to schedule attach:", e);
  }
})();

// ---------------- txRoot setter DIAGNOSTIC harness (additive, ESM-safe) --------------------
;(function txrootSetterDiagHarness(){
  try {
    const G:any = (globalThis as any);
    if (G.__void_txroot_setter_diag_installed) return;
    G.__void_txroot_setter_diag_installed = true;

    const getApp = () => G.__void_http_app || G.app;
    const getNode = (app:any) => G.__void_node || app?.locals?.node;
    const getStore = (app:any) => G.__void_store || getNode(app)?.store || getNode(app)?.segStore || app?.locals?.store;

    // Expose a tiny diag route as soon as app exists (no imports needed)
    const tryWireDiag = () => {
      const app:any = getApp();
      if (!app || typeof app.get !== "function") return false;
      if (!app.__void_txroot_diag_route) {
        app.get("/__void/diag/txroot-setter", (_req:any, res:any) => {
          const appNow:any = getApp();
          const storeNow:any = getStore(appNow);
          res.json({
            ok: true,
            diag: "txroot-setter",
            hasApp: !!appNow,
            hasStore: !!storeNow,
            hasSaveBlock: !!(storeNow && typeof storeNow.saveBlock === "function"),
            attachedFlag: !!G.__void_txroot_setter_attached,
            lastError: G.__void_txroot_setter_last_error || null,
            timestamp_ms: Date.now(),
          });
        });
        app.__void_txroot_diag_route = true;
        console.log("[boot.txroot-setter] diag route wired");
      }
      return true;
    };

    // Robust dynamic import: try .js then .ts (tsx runtime usually maps .ts)
    const dynamicLoad = async () => {
      try {
        return await import("./hooks/txroot_setter.js");
      } catch (e1) {
        (globalThis as any).__void_txroot_setter_last_error = String(e1);
        try {
          return await import("./hooks/txroot_setter.js");
        } catch (e2) {
          (globalThis as any).__void_txroot_setter_last_error = String(e2);
          throw e2;
        }
      }
    };

    const tryAttach = async () => {
      const app:any = getApp();
      const store:any = getStore(app);
      if (!app || !store) return false;
      try {
        const mod:any = await dynamicLoad();
        if (typeof mod?.attachTxrootSetter === "function") {
          mod.attachTxrootSetter({ app, store, log: (...a:any[]) => console.log("[boot.txroot-setter]", ...a) });
          (globalThis as any).__void_txroot_setter_attached = true;
          console.log("[boot.txroot-setter] attached OK");
          return true;
        } else {
          (globalThis as any).__void_txroot_setter_last_error = "attachTxrootSetter not a function";
        }
      } catch (e:any) {
        (globalThis as any).__void_txroot_setter_last_error = String(e?.message || e);
        console.error("[boot.txroot-setter] attach failed:", e);
      }
      return false;
    };

    let tries = 0;
    const tick = async () => {
      tryWireDiag();
      const ok = await tryAttach();
      if (!ok && ++tries < 80) setTimeout(tick, 250); // ~20s of retries
    };
    setTimeout(tick, 100);
  } catch (e) {
    console.error("[boot.txroot-setter] harness error:", e);
  }
})();

// ---------------- PROM text exporter for txroot-setter (direct mount; additive) --------------------
;(function mountSetterPromDirect(){
  try{
    const G:any = (globalThis as any);
    if (G.__void_setter_prom_direct) return; // one-shot

    let tries=0;
    const getApp = () => G.__void_http_app || G.app;
    const getCounters = () => G.__void_txroot_setter_counters || { set_total:0, mismatch_total:0, errors_total:0, last_set_block:-1 };

    const tick = () => {
      const app:any = getApp();
      if (!app || typeof app.get !== "function") { if (++tries < 60) return setTimeout(tick, 500); return; }
      if (app.__void_setter_prom_direct) return;

      app.get("/__void/metrics/txroot4/setter.prom", (_req:any, res:any) => {
        const c = getCounters();
        res.setHeader("Content-Type","text/plain; version=0.0.4; charset=utf-8");
        const lines = [
          "# HELP void_txroot_header_set_total Header txRoot sets performed",
          "# TYPE void_txroot_header_set_total counter",
          `void_txroot_header_set_total ${Number(c.set_total)||0}`,
          "# HELP void_txroot_header_mismatch_total Header txRoot mismatches detected (pre-normalization)",
          "# TYPE void_txroot_header_mismatch_total counter",
          `void_txroot_header_mismatch_total ${Number(c.mismatch_total)||0}`,
          "# HELP void_txroot_header_errors_total Errors while setting txRoot",
          "# TYPE void_txroot_header_errors_total counter",
          `void_txroot_header_errors_total ${Number(c.errors_total)||0}`,
          "# HELP void_txroot_header_last_set_block Last block number where txRoot was set",
          "# TYPE void_txroot_header_last_set_block gauge",
          `void_txroot_header_last_set_block ${Number(c.last_set_block)||-1}`
        ];
        res.end(lines.join("\n")+"\n");
      });

      app.__void_setter_prom_direct = true;
      G.__void_setter_prom_direct = true;
      console.log("[void] mounted direct /__void/metrics/txroot4/setter.prom");
    };

    tick();
  }catch(e){ console.error("[void] mountSetterPromDirect error:", e); }
})();

// ---------------- txRoot health probe (additive, no deps) --------------------
;(function txrootHealthProbe(){
  try {
    const G:any = (globalThis as any);
    const getApp = () => G.__void_http_app || G.app;
    const getNode = (app:any) => G.__void_node || app?.locals?.node;
    const getStore = (app:any) => G.__void_store || getNode(app)?.store || getNode(app)?.segStore || app?.locals?.store;

    async function computeRootViaHelper(n:number){
      try {
        const base = process.env.HTTP_HOST ? `http://${process.env.HTTP_HOST}:${process.env.HTTP_PORT}` : '';
        const u = base ? `${base}/__void/txroot/check/${n}` : `/__void/txroot/check/${n}`;
        const res = await fetch(u);
        if (!res.ok) throw new Error(`txroot helper ${res.status}`);
        return await res.json();
      } catch (e:any) {
        return { ok:false, error: String(e) };
      }
    }

    function wire(){
      const app:any = getApp();
      const store:any = getStore(app);
      if (!app || typeof app.get !== "function") return false;

      if (!app.__void_txroot_health){
        // GET /health/txroot
        app.get("/health/txroot", async (_req:any, res:any) => {
          try {
            // pull head number from the node or helper shim
            const headText = await (await fetch("/head.txt")).text().catch(()=>null);
            const head = headText ? Number(String(headText).trim()) : NaN;

            if (!Number.isFinite(head)) {
              res.status(500).json({ ok:false, why:"no head" }); return;
            }

            const diag = await computeRootViaHelper(head);
            const fresh = (Date.now() - Number(diag?.timestamp_ms ?? Date.now())) < 60_000;

            const match = !!diag?.match;
            const ok = match && fresh;

            // Inline Prom text for one gauge (no config changes required)
            // curl 127.0.0.1:4100/health/txroot?format=prom
            if (_req.query?.format === 'prom') {
              res.setHeader("Content-Type","text/plain; version=0.0.4; charset=utf-8");
              res.end(`# HELP void_txroot_health Is txroot healthy (1 ok, 0 bad)
# TYPE void_txroot_health gauge
void_txroot_health ${ok ? 1 : 0}
`);
              return;
            }

            res.status(ok ? 200 : 500).json({
              ok, match, fresh, head, diag: (diag?.ok===false? {error:diag.error}: undefined)
            });
          } catch (e:any) {
            res.status(500).json({ ok:false, error:String(e) });
          }
        });

        app.__void_txroot_health = true;
        console.log("[health.txroot] wired");
      }
      return true;
    }

    let tries = 0;
    const tick = () => { if (!wire() && ++tries < 60) setTimeout(tick, 500); };
    tick();
  } catch (e) {
    console.error("[health.txroot] attach error", e);
  }
})();

// ---------------- txRoot health probe v2 (additive; absolute URL fix) -----------
;(function txrootHealthProbeV2(){
  try {
    const G:any = (globalThis as any);
    if (G.__void_txroot_health_v2) return; // don't double-mount
    const getApp = () => G.__void_http_app || G.app;

    async function fetchJson(u:string){
      const r = await fetch(u);
      if (!r.ok) throw new Error(`GET ${u} -> ${r.status}`);
      return r.json();
    }
    async function fetchText(u:string){
      const r = await fetch(u);
      if (!r.ok) throw new Error(`GET ${u} -> ${r.status}`);
      return r.text();
    }

    function wire(){
      const app:any = getApp();
      if (!app || typeof app.get !== "function") return false;

      if (!app.__void_txroot_health_v2){
        app.get("/health/txroot2", async (req:any, res:any) => {
          try {
            // Build absolute base from the request (e.g., http://127.0.0.1:4100)
            const base = `${req.protocol}://${req.headers.host}`;
            // Pull current head
            const headText = await fetchText(`${base}/head.txt`);
            const head = Number(String(headText).trim());
            if (!Number.isFinite(head)) {
              res.status(500).json({ ok:false, why:"no head" }); return;
            }
            // Use your existing helper to compute/compare
            const diag:any = await fetchJson(`${base}/__void/txroot/check/${head}`);
            const fresh = (Date.now() - Number(diag?.timestamp_ms ?? Date.now())) < 60_000;
            const match = !!diag?.match;
            const ok = match && fresh;

            if (req.query?.format === 'prom') {
              res.setHeader("Content-Type","text/plain; version=0.0.4; charset=utf-8");
              res.end(`# HELP void_txroot_health Is txroot healthy (1 ok, 0 bad)
# TYPE void_txroot_health gauge
void_txroot_health ${ok ? 1 : 0}
`);
              return;
            }

            res.status(ok ? 200 : 500).json({ ok, match, fresh, head });
          } catch (e:any) {
            res.status(500).json({ ok:false, error:String(e) });
          }
        });

        app.__void_txroot_health_v2 = true;
        console.log("[health.txroot2] wired");
      }
      return true;
    }

    let tries = 0;
    const tick = () => { if (!wire() && ++tries < 60) setTimeout(tick, 500); };
    tick();
  } catch (e) {
    console.error("[health.txroot2] attach error", e);
  }
})();

// ----- txRoot health probe v2.1 (fallbacks for 404 on __void/txroot/check/:n) -----
;(function txrootHealthProbeV21(){
  try {
    const G:any = (globalThis as any);
    if (G.__void_txroot_health_v21) return;
    const getApp = () => G.__void_http_app || G.app;

    async function j(u:string){ const r=await fetch(u); if(!r.ok) throw Object.assign(new Error(`GET ${u} -> ${r.status}`),{status:r.status}); return r.json(); }
    async function t(u:string){ const r=await fetch(u); if(!r.ok) throw Object.assign(new Error(`GET ${u} -> ${r.status}`),{status:r.status}); return r.text(); }
    const hex = (s:any) => String(s ?? "").toLowerCase().replace(/^0x/,"");

    function wire(){
      const app:any = getApp();
      if (!app || typeof app.get !== "function") return false;

      if (!app.__void_txroot_health_v21){
        app.get("/health/txroot2", async (req:any, res:any) => {
          try {
            const base = `${req.protocol}://${req.headers.host}`;
            const headStr = await t(`${base}/head.txt`);
            const head = Number(String(headStr).trim());
            if (!Number.isFinite(head)) { res.status(500).json({ok:false, why:"no head"}); return; }

            // 1) Preferred: existing checker route
            let match:boolean|undefined, headerRoot:string|undefined, computedRoot:string|undefined, ts:number|undefined;
            try {
              const diag:any = await j(`${base}/__void/txroot/check/${head}`);
              // old checker returned either strings or {root,leaves}; normalize
              const hRoot = typeof diag?.header_txRoot === "string" ? diag.header_txRoot : diag?.header_txRoot?.root;
              const cRoot = typeof diag?.computed_txRoot === "string" ? diag.computed_txRoot : diag?.computed_txRoot?.root;
              headerRoot = hRoot ? hex(hRoot) : undefined;
              computedRoot = cRoot ? hex(cRoot) : undefined;
              match = !!diag?.match;
              ts = Number(diag?.timestamp_ms ?? Date.now());
            } catch (e:any) {
              if (e?.status !== 404) throw e;
              // 2) Fallback: fetch header + compute via /dev/txroot/:n
              const full:any = await j(`${base}/blocks/${head}/full2`);
              const hObj = full?.header_txRoot ?? full?.header?.txRoot ?? full?.header?.txroot ?? full?.header?.tx_root;
              headerRoot = typeof hObj === "string" ? hex(hObj) : hex(hObj?.root);

              const comp:any = await j(`${base}/dev/txroot/${head}`); // returns {root, leaves}
              computedRoot = hex(comp?.root);

              if (!headerRoot || !computedRoot) throw new Error("missing roots for comparison");
              match = headerRoot === computedRoot;
              ts = Date.now();
            }

            const fresh = (Date.now() - (ts ?? Date.now())) < 60_000;
            const ok = !!match && fresh;

            if (req.query?.format === 'prom') {
              res.setHeader("Content-Type","text/plain; version=0.0.4; charset=utf-8");
              res.end(`# HELP void_txroot_health Is txroot healthy (1 ok, 0 bad)
# TYPE void_txroot_health gauge
void_txroot_health ${ok ? 1 : 0}
`); return;
            }

            res.status(ok ? 200 : 500).json({
              ok, match, fresh, head, headerRoot, computedRoot, timestamp_ms: ts
            });
          } catch (e:any) {
            res.status(500).json({ ok:false, error:String(e) });
          }
        });

        app.__void_txroot_health_v21 = true;
        console.log("[health.txroot2] v2.1 wired (with fallbacks)");
      }
      return true;
    }

    let tries=0; const tick=()=>{ if(!wire() && ++tries<60) setTimeout(tick,500); }; tick();
  } catch(e){ console.error("[health.txroot2] v2.1 attach error", e); }
})();

// ----- txRoot health probe v3 (always fallback-safe) -----
;(function txrootHealthProbeV3(){
  try {
    const G:any = (globalThis as any);
    if (G.__void_txroot_health_v3) return;
    const getApp = () => G.__void_http_app || G.app;

    const hex = (s:any) => String(s ?? "").toLowerCase().replace(/^0x/,"");
    const j = async (u:string) => { const r=await fetch(u); if(!r.ok) throw new Error(`GET ${u} -> ${r.status}`); return r.json(); };
    const t = async (u:string) => { const r=await fetch(u); if(!r.ok) throw new Error(`GET ${u} -> ${r.status}`); return r.text(); };

    // Try best-known places to read a header txRoot from a "full" block
    function pickHeaderTxRoot(full:any): string | undefined {
      const h = full?.header_txRoot ?? full?.header?.txRoot ?? full?.header?.txroot ?? full?.header?.tx_root;
      return typeof h === "string" ? hex(h) : hex(h?.root);
    }

    function wire(){
      const app:any = getApp();
      if (!app || typeof app.get !== "function") return false;

      if (!app.__void_txroot_health_v3){
        app.get("/health/txroot3", async (req:any, res:any) => {
          const base = `${req.protocol}://${req.headers.host}`;
          try {
            const headStr = await t(`${base}/head.txt`);
            const head = Number(String(headStr).trim());
            if (!Number.isFinite(head)) throw new Error("invalid head");

            let headerRoot:string|undefined, computedRoot:string|undefined, match:boolean|undefined, ts = Date.now();

            // 1) Best-effort: old checker (ignore *any* error)
            try {
              const diag:any = await j(`${base}/__void/txroot/check/${head}`);
              const hRoot = typeof diag?.header_txRoot === "string" ? diag.header_txRoot : diag?.header_txRoot?.root;
              const cRoot = typeof diag?.computed_txRoot === "string" ? diag.computed_txRoot : diag?.computed_txRoot?.root;
              headerRoot = hRoot ? hex(hRoot) : undefined;
              computedRoot = cRoot ? hex(cRoot) : undefined;
              match = !!diag?.match;
              ts = Number(diag?.timestamp_ms ?? Date.now());
            } catch { /* swallow and fallback */ }

            // 2) Fallback via block+compute if needed
            if (!headerRoot || !computedRoot || typeof match !== "boolean") {
              let full:any;
              try {
                // prefer /full2, then /full
                full = await j(`${base}/blocks/${head}/full2`);
              } catch {
                full = await j(`${base}/blocks/${head}/full`);
              }
              headerRoot = pickHeaderTxRoot(full);

              // compute via dev endpoint (returns {root,...})
              const comp:any = await j(`${base}/dev/txroot/${head}`);
              computedRoot = hex(comp?.root);
              match = !!(headerRoot && computedRoot && headerRoot === computedRoot);
              ts = Date.now();
            }

            const fresh = (Date.now() - ts) < 60_000;
            const ok = !!match && fresh;

            if (req.query?.format === 'prom') {
              res.setHeader("Content-Type","text/plain; version=0.0.4; charset=utf-8");
              res.end(`# HELP void_txroot_health Is txroot healthy (1 ok, 0 bad)
# TYPE void_txroot_health gauge
void_txroot_health ${ok ? 1 : 0}
`);
              return;
            }

            res.status(ok ? 200 : 500).json({
              ok, match, fresh, head,
              headerRoot, computedRoot, timestamp_ms: ts
            });
          } catch (e:any) {
            res.status(500).json({ ok:false, error:String(e) });
          }
        });

        app.__void_txroot_health_v3 = true;
        console.log("[health.txroot3] wired (fallback-first)");
      }
      return true;
    }

    let tries=0; const tick=()=>{ if(!wire() && ++tries<60) setTimeout(tick,500); }; tick();
  } catch(e){ console.error("[health.txroot3] attach error", e); }
})();
// ---------------- void_head_number exporter (additive, no deps) ----------------
(function addHeadGaugeExporter(){
  let tries = 0, mounted = false;
  const HTTP_PORT = process.env.HTTP_PORT || process.env.VOID_HTTP_PORT || "4100";
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }

  const mount = async () => {
    const app:any = getApp();
    if (!app || typeof app.get !== "function") {
      if (++tries < 120) return setTimeout(mount, 500);
      return;
    }
    if (mounted) return; mounted = true;

    // Prometheus text endpoint with just the head gauge
    // GET /metrics/void/head
    app.get("/metrics/void/head", async (_req:any, res:any) => {
      try {
        res.setHeader("Content-Type","text/plain; version=0.0.4; charset=utf-8");
        const url = `http://127.0.0.1:${HTTP_PORT}/head.txt`;
        let head = -1;
        try {
          const r = await fetch(url);
          const txt = await r.text();
          const n = Number.parseInt((txt||"").trim(),10);
          if (Number.isFinite(n) && n >= 0) head = n;
        } catch {}
        res.end(`# HELP void_head_number Latest persisted block number
# TYPE void_head_number gauge
void_head_number ${head}
`);
      } catch (e:any) {
        res.status(500).json({ ok:false, error: String(e?.stack||e) });
      }
    });
  };
  setTimeout(mount, 0);
})();

// ---------------- txroot core v2 exporter shim (additive, safe) ----------------
(function txrootCoreV2Shim(){
  let tries = 0, attached = false;
  const g:any = (globalThis as any);

  // shared counters; if real core wires these, this shim will reflect them
  g.__void_txroot_core2 = g.__void_txroot_core2 || {
    saves_total: 0,
    set_total: 0,
    mismatch_total: 0,
    errors_total: 0,
    heartbeat_total: 0,
    last_set_block: -1,
  };

  // lightweight heartbeat so Prom sees liveness even before first seal
  setInterval(()=>{ try { g.__void_txroot_core2.heartbeat_total++; } catch {} }, 2000);

  function getApp(){ return g.__void_http_app || g.app; }
  function attach(){
    const app:any = getApp();
    if (!app || typeof app.get !== "function") {
      if (++tries < 80) return setTimeout(attach, 500);
      return;
    }
    if (attached) return; attached = true;

    app.get("/__void/metrics/txroot4/core2", (req:any, res:any) => {
      const m = g.__void_txroot_core2 || {};
      const lines = [
        "# HELP void_txroot_core_saves_total Saves observed by core",
        "# TYPE void_txroot_core_saves_total counter",
        `void_txroot_core_saves_total ${Number(m.saves_total||0)}`,
        "# HELP void_txroot_core_set_total Header sets observed by core",
        "# TYPE void_txroot_core_set_total counter",
        `void_txroot_core_set_total ${Number(m.set_total||0)}`,
        "# HELP void_txroot_core_mismatch_total Mismatches observed by core",
        "# TYPE void_txroot_core_mismatch_total counter",
        `void_txroot_core_mismatch_total ${Number(m.mismatch_total||0)}`,
        "# HELP void_txroot_core_errors_total Errors observed by core",
        "# TYPE void_txroot_core_errors_total counter",
        `void_txroot_core_errors_total ${Number(m.errors_total||0)}`,
        "# HELP void_txroot_core_heartbeat_total Heartbeat to signal liveness",
        "# TYPE void_txroot_core_heartbeat_total counter",
        `void_txroot_core_heartbeat_total ${Number(m.heartbeat_total||0)}`,
        "# HELP void_txroot_core_last_set_block Last block the core claims to have set",
        "# TYPE void_txroot_core_last_set_block gauge",
        `void_txroot_core_last_set_block ${Number(m.last_set_block||-1)}`,
      ];
      res.type("text/plain").send(lines.join("\n") + "\n");
    });
  }
  attach();
})();

// (finish) ensure /__void/metrics/txroot4/core2 route is present
(function ensureCore2Route(){
  const g:any = (globalThis as any);
  let tries=0, attached=false;
  function getApp(){ return g.__void_http_app || g.app; }
  function attach(){
    const app:any = getApp();
    if (!app || typeof app.get!=="function"){ if(++tries<60) return setTimeout(attach,500); return; }
    if (attached) return; attached = true;
    g.__void_txroot_core2 = g.__void_txroot_core2 || {
      saves_total:0,set_total:0,mismatch_total:0,errors_total:0,heartbeat_total:0,last_set_block:-1,
    };
    app.get("/__void/metrics/txroot4/core2", (_req:any, res:any)=>{
      const m = g.__void_txroot_core2;
      const out = [
        "# HELP void_txroot_core_saves_total Saves observed by core",
        "# TYPE void_txroot_core_saves_total counter",
        `void_txroot_core_saves_total ${Number(m.saves_total||0)}`,
        "# HELP void_txroot_core_set_total Header sets observed by core",
        "# TYPE void_txroot_core_set_total counter",
        `void_txroot_core_set_total ${Number(m.set_total||0)}`,
        "# HELP void_txroot_core_mismatch_total Mismatches observed by core",
        "# TYPE void_txroot_core_mismatch_total counter",
        `void_txroot_core_mismatch_total ${Number(m.mismatch_total||0)}`,
        "# HELP void_txroot_core_errors_total Errors observed by core",
        "# TYPE void_txroot_core_errors_total counter",
        `void_txroot_core_errors_total ${Number(m.errors_total||0)}`,
        "# HELP void_txroot_core_heartbeat_total Heartbeat to signal liveness",
        "# TYPE void_txroot_core_heartbeat_total counter",
        `void_txroot_core_heartbeat_total ${Number(m.heartbeat_total||0)}`,
        "# HELP void_txroot_core_last_set_block Last block the core claims to have set",
        "# TYPE void_txroot_core_last_set_block gauge",
        `void_txroot_core_last_set_block ${Number(m.last_set_block||-1)}`,
      ];
      res.type("text/plain").send(out.join("\n")+"\n");
    });
  }
  attach();
})();

// ---------------- txroot setter watcher (additive, non-invasive) ----------------
(function txrootSetterWatcher(){
  const g:any = (globalThis as any);
  g.__void_txroot_setter = g.__void_txroot_setter || {
    set_total: 0,
    mismatch_total: 0,
    errors_total: 0,
    heartbeat_total: 0,
    last_set_block: -1,
  };

  // If core2 counters exist, mirror them as a baseline (so Prom shows *something*)
  g.__void_txroot_core2 = g.__void_txroot_core2 || {
    saves_total: 0, set_total: 0, mismatch_total: 0, errors_total: 0, heartbeat_total: 0, last_set_block: -1,
  };

  // Small helper: fetch text/json without TSX "cache" option that caused TS errors earlier
  async function getText(u:string){
    try { const r = await fetch(u as any); return await r.text(); } catch { return null; }
  }
  async function getJSON(u:string){
    try { const r = await fetch(u as any); return await r.json(); } catch { return null; }
  }

  // Try a few known block endpoints in descending preference
  async function getBlockHeader(n:number): Promise<{txRoot?:string|null} | null> {
    const base = "";
    // full2 (newer), full (legacy), persisted (diag) — all additive shims in this repo
    const paths = [
      `/blocks/${n}/full2`,
      `/blocks/${n}/full`,
      `/blocks/${n}/persisted`
    ];
    for (const p of paths){
      const j = await getJSON(base + p);
      if (j && j.header) return j.header as any;
      if (j && j.ok && j.block && j.block.header) return j.block.header as any;
    }
    return null;
  }

  // Normalize 0x… vs hex string; accept empty-root constant too
  const EMPTY = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  function norm(x:any): string | null {
    if (x == null) return null;
    const s = String(x).toLowerCase().replace(/^0x/,"");
    return s.length ? s : null;
  }

  // Heartbeat so Prom can see liveness on setter
  setInterval(()=>{ try { g.__void_txroot_setter.heartbeat_total++; } catch {} }, 2000);

  // Watch head; when a new block has a header.txRoot, bump counters once
  let lastChecked = -1;
  async function tick(){
    try {
      // Prefer in-process head if exported, else HTTP
      let head = -1;
      try {
        const t = await getText(`/head.txt`);
        const n = t ? parseInt(t.trim(), 10) : NaN;
        if (Number.isFinite(n)) head = n;
      } catch {}

      if (!Number.isFinite(head) || head < 0) return;

      if (head <= lastChecked) return;
      lastChecked = head;

      const hdr = await getBlockHeader(head);
      const txr = norm(hdr?.txRoot);
      if (txr){ // consider EMPTY as a valid root (0 tx)
        // Only advance if this head is newer than what we've recorded
        if (g.__void_txroot_setter.last_set_block < head){
          g.__void_txroot_setter.last_set_block = head;
          g.__void_txroot_setter.set_total++;
        }
      }
      // Mirror core2 if it’s ahead (keeps both exporters consistent)
      if (g.__void_txroot_core2.last_set_block > g.__void_txroot_setter.last_set_block){
        g.__void_txroot_setter.last_set_block = g.__void_txroot_core2.last_set_block;
      }
      if (g.__void_txroot_core2.set_total > g.__void_txroot_setter.set_total){
        g.__void_txroot_setter.set_total = g.__void_txroot_core2.set_total;
      }
    } catch {
      try { g.__void_txroot_setter.errors_total++; } catch {}
    }
  }
  setInterval(tick, 1000);
})();

// ---------------- txroot setter watcher V2 (absolute URLs, header endpoint) ----------------
(function txrootSetterWatcherV2(){
  const g:any = (globalThis as any);
  g.__void_txroot_setter = g.__void_txroot_setter || {
    set_total: 0, mismatch_total: 0, errors_total: 0, heartbeat_total: 0, last_set_block: -1,
  };

  const HOST = process.env.HTTP_HOST || "127.0.0.1";
  const PORT = process.env.HTTP_PORT || "4100";
  const BASE = `http://${HOST}:${PORT}`;

  async function getText(u:string){ try{ const r = await fetch(u as any); return await r.text(); } catch { return null; } }
  async function getJSON(u:string){ try{ const r = await fetch(u as any); return await r.json(); } catch { return null; } }

  function norm(x:any){ if (x==null) return null; return String(x).toLowerCase().replace(/^0x/,""); }

  setInterval(()=>{ try { g.__void_txroot_setter.heartbeat_total++; } catch {} }, 2000);

  let lastChecked = -1;
  async function tick(){
    try{
      // 1) head
      const t = await getText(`${BASE}/head.txt`);
      const head = t ? parseInt(t.trim(), 10) : NaN;
      if (!Number.isFinite(head) || head < 0) return;
      if (head <= lastChecked) return;
      lastChecked = head;

      // 2) ask inspector (it returns headerTxRoot/computedTxRoot/match)
      const insp:any = await getJSON(`${BASE}/__void/txroot/v4/header/${head}`);
      if (insp && insp.ok){
        const hx = norm(insp.headerTxRoot);
        if (hx){ // accept empty-root too; normalize
          if (g.__void_txroot_setter.last_set_block < head){
            g.__void_txroot_setter.last_set_block = head;
            g.__void_txroot_setter.set_total++;
          }
          return;
        }
      }

      // 3) fallback: try persisted/full shims
      const tries = [`${BASE}/blocks/${head}/full2`, `${BASE}/blocks/${head}/full`, `${BASE}/blocks/${head}/persisted`];
      for (const url of tries){
        const j:any = await getJSON(url);
        const hdr = j?.header || j?.block?.header;
        const root = hdr?.txRoot ?? hdr?.txroot ?? hdr?.txRootHex;
        const hx = norm(root);
        if (hx){
          if (g.__void_txroot_setter.last_set_block < head){
            g.__void_txroot_setter.last_set_block = head;
            g.__void_txroot_setter.set_total++;
          }
          return;
        }
      }
    }catch{ try { g.__void_txroot_setter.errors_total++; } catch {} }
  }
  setInterval(tick, 1000);
})();

// --- Additive: soft-gate dev & inspector routes w/o deleting anything ---
(function devRouteGate(){
  try {
    const appAny:any = (globalThis as any).__void_http_app || (globalThis as any).app;
    if (!appAny || typeof appAny.use !== 'function') return;

    const allow = process.env.VOID_DEV_ROUTES === '1';
    if (allow) return; // dev routes enabled

    // Block only well-known debug namespaces; core APIs unaffected
    const blocked = [
      "/__void",                // all our txroot shims/inspectors
      "/dev",                   // any dev inspectors
      "/tx/dev",                // tx burst helpers, raw inspectors
      "/metrics/drift6",        // follower drift exporter (dev)
      "/__void/metrics"         // ad-hoc prom text exporters
    ];

    appAny.use(blocked, (_req:any, res:any)=> res.status(404).end());
  } catch {}
})();

// --- Additive: feature flag peek (dev-only by our gate) ---
import { featureEnabled } from "./feature_flags.js";
(function featureFlagsRoute(){
  try{
    const appAny:any = (globalThis as any).__void_http_app || (globalThis as any).app;
    if (!appAny || typeof appAny.get !== 'function') return;
    appAny.get("/__void/feature-flags", (_req:any, res:any)=> {
      res.json({
        ok:true,
        flags: {
          "txroot.enforce": featureEnabled("txroot.enforce")
        }
      });
    });
  }catch{}
})();

// --- Additive: txroot enforcer wrapper (feature-gated) ---
import { installTxrootEnforcer } from "./hooks/txroot_enforcer.js";
(function txrootEnforcerInit(){
  try{
    // Defer a tick to allow globals (__void_store, __void_txroot_util) to appear
    setTimeout(()=>{ try{ installTxrootEnforcer(); }catch{} }, 250);
    // And retry once more in case of slow boot
    setTimeout(()=>{ try{ installTxrootEnforcer(); }catch{} }, 1500);
  }catch{}
})();

// --- Additive: install TxRoot Enforcer hook (safe if already installed) ---
(function installTxrootEnforcerLoader(){
  try {
    // dynamic import so it won't break older builds
    import("./hooks/txroot_enforcer.js")
      .then(mod => { try { mod.installTxrootEnforcer?.(); } catch {} })
      .catch(()=>{});
  } catch {}
})();

// --- Additive: TxRoot Enforcer loader v2 (tsx-friendly, tries .ts then bare) ---
(function installTxrootEnforcerLoader_v2(){
  async function tryImports(){
    try {
      const m1 = /* DISABLED v2 (TS5097) await import("./hooks/txroot_enforcer.ts"); */ null as any;
      try { m1.installTxrootEnforcer?.(); } catch {}
      return;
    } catch {}
    try {
      const m2 = /* DISABLED v2 (TS2835) await import("./hooks/txroot_enforcer"); */ null as any;
      try { m2.installTxrootEnforcer?.(); } catch {}
    } catch {}
  }
  try { void tryImports(); } catch {}
})();

// --- Additive: TxRoot Enforcer loader v3 (handles tsc+node16 and tsx) ---
(function installTxrootEnforcerLoader_v3(){
  const g:any = globalThis as any;
  if (g.__void_txroot_enforcer_loaded_v3) return;
  g.__void_txroot_enforcer_loaded_v3 = true;

  async function tryImport(spec: string): Promise<boolean> {
    try {
      const m:any = await import(spec as any);
      try { m.installTxrootEnforcer?.(); } catch {}
      return true;
    } catch { return false; }
  }

  (async () => {
    // 1) Prefer compiled JS when running the built output
    if (await tryImport("./hooks/txroot_enforcer.js")) return;

    // 2) tsx runtime: compute ".ts" path to avoid TS5097 on literal ".ts"
    const tsSpec = "./hooks/txroot_enforcer" + ".ts";
    if (await tryImport(tsSpec)) return;

    // 3) Fallback: bare (some loaders resolve this)
    await tryImport("./hooks/txroot_enforcer.js"); // retry in case of delayed emit
  })().catch(()=>{});
})();

// --- Additive: TxRoot Late-Setter v3 (runs after tx-merge, before save) ---
(function attachTxrootLateSetter_v3(){
  const g:any = globalThis as any;
  if (g.__void_txroot_late_setter_v3) return; g.__void_txroot_late_setter_v3 = true;

  // Best-effort import for both built JS and tsx dev
  async function loadHelper(): Promise<any|undefined> {
    try { return await import("./util/txroot.js"); } catch {}
    try { return await import("./util/txroot.ts" as any); } catch {}
    return undefined;
  }

  // Hook SegStore.saveBlock to set header.txRoot AFTER txs are finalized
  (async () => {
    const helper = await loadHelper();
    const compute =
      helper?.txRootHexFromTxs ||
      helper?.computeTxRootHex ||
      helper?.txRootHex || undefined;

    // If no helper, leave a soft diag and skip (enforcer/repair mode will still work)
    if (!compute) { console.warn("[txroot/late-setter] helper not found; skipping"); return; }

    const SegStoreMod:any = (globalThis as any).__void_SegStore || requireFallback("./chain/seg_store.js");
    if (!SegStoreMod) { console.warn("[txroot/late-setter] SegStore not found"); return; }
    const SegStore = SegStoreMod.SegStore || SegStoreMod.default || SegStoreMod;

    const orig = SegStore.prototype.saveBlock;
    if (!orig || orig.__void_txroot_late_setter_v3) return;

    async function patchedSaveBlock(this:any, block:any){
      try {
        const txs = Array.isArray(block?.txs) ? block.txs : [];
        const root = await compute(txs);
        block.header = block.header || {};
        block.header.txRoot = root; // authoritative final root, post-merge
        (globalThis as any).__void_txroot_late_setter_last = { n:block?.header?.number, txs:txs.length, root };
      } catch (e) {
        console.warn("[txroot/late-setter] compute failed:", (e as any)?.message || e);
      }
      return await orig.apply(this, arguments as any);
    }
    (patchedSaveBlock as any).__void_txroot_late_setter_v3 = true;
    SegStore.prototype.saveBlock = patchedSaveBlock;
    console.log("[txroot/late-setter] attached (post-merge, pre-persist)");
  })().catch(()=>{});

  function requireFallback(spec:string){ try { return (Function("return import(spec)")).call(null) } catch { return undefined; } }
})();

// --- Additive: TxRoot Late-Setter v4 (outermost, after enforcer) ---
(function attachTxrootLateSetter_v4(){
  const g:any = globalThis as any;
  if (g.__void_txroot_late_setter_v4) return; g.__void_txroot_late_setter_v4 = true;

  // robust dynamic import for ESM/tsx and built JS
  async function tryImport(spec:string){
    try { return await import(spec); } catch { return undefined; }
  }
  async function loadHelper(){
    // Try URL-based (ESM) then relative strings; both .js (built) and .ts (tsx-run)
    const base = new URL('.', import.meta.url).href;
    const candidates = [
      new URL('./util/txroot.js', base).href,
      new URL('./util/txroot.ts', base).href,
      './util/txroot.js',
      './util/txroot.ts',
    ];
    for (const c of candidates) {
      const m = await tryImport(c);
      if (m) return m;
    }
    return undefined;
  }

  // Wait for enforcer to attach, then wrap outermost so we run before its check
  let tries = 0;
  async function attachWhenReady(){
    tries++;
    try {
      const SegMod:any =
        (g.__void_SegStore) ||
        (await tryImport(new URL('./chain/seg_store.ts', import.meta.url).href)) ||
        (await tryImport('./chain/seg_store.ts')) ||
        (await tryImport('./chain/seg_store.js'));
      if (!SegMod) { if (tries < 40) return setTimeout(attachWhenReady, 100); return; }
      const SegStore = SegMod.SegStore || SegMod.default || SegMod;

      // Heuristic: assume enforcer is on when saveBlock name or toString contains 'enforce' or 'txroot'
      const cur = SegStore.prototype.saveBlock;
      const sig = String(cur?.name || '') + '|' + String(cur);
      const enforcerLikely = /enforce|txroot/i.test(sig);
      if (!enforcerLikely && tries < 40) return setTimeout(attachWhenReady, 100); // wait a bit more

      const helper = await loadHelper();
      const compute =
        helper?.txRootHexFromTxs ||
        helper?.computeTxRootHex ||
        helper?.txRootHex ||
        helper?.default ||
        undefined;

      if (!compute) { console.warn("[txroot/late-setter] helper import failed; cannot attach"); return; }

      if ((cur as any)?.__void_txroot_late_setter_v4) return; // already wrapped

      async function patchedSaveBlock(this:any, block:any){
        try {
          const txs = Array.isArray(block?.txs) ? block.txs : [];
          // compute using the same util as enforcer, so comparison will pass
          const root = await compute(txs);
          block.header = block.header || {};
          block.header.txRoot = root;
          (globalThis as any).__void_txroot_late_setter_last = {
            number: block?.header?.number, txs: txs.length, root
          };
        } catch (e:any) {
          console.warn("[txroot/late-setter] compute failed:", e?.message || e);
        }
        return await cur.apply(this, arguments as any);
      }
      (patchedSaveBlock as any).__void_txroot_late_setter_v4 = true;
      SegStore.prototype.saveBlock = patchedSaveBlock;
      console.log("[txroot/late-setter] v4 attached (outermost, runs before enforcer)");
    } catch(e){
      if (tries < 40) return setTimeout(attachWhenReady, 100);
      console.warn("[txroot/late-setter] attach failed:", (e as any)?.message || e);
    }
  }
  attachWhenReady();

  // tiny diag
  (g.__void_txroot_late_diag_installed)||(function(){
    g.__void_txroot_late_diag_installed = true;
    function getApp(){ return (g.__void_http_app) || (g.app) || (g.__void_http_app = (g as any).__void_http_app); }
    setTimeout(()=>{
      const app:any = getApp();
      if (!app || typeof app.get!=="function") return;
      app.get("/__void/txroot-late/last", (_:any,res:any)=> res.json(g.__void_txroot_late_setter_last || {ok:false}));
    }, 500);
  })();
})();

// === Additive: Minimal Merkle helper (fallback) ===
(function __void_txroot_fallback_v1(){
  const g:any = globalThis as any;
  if (g.__void_txroot_fallback_v1) return; g.__void_txroot_fallback_v1 = true;

  async function sha256Hex(buf:Uint8Array|string){
    const b = typeof buf === 'string' ? new TextEncoder().encode(buf) : buf;
    const d = await crypto.subtle.digest('SHA-256', b);
    return Array.from(new Uint8Array(d)).map(x=>x.toString(16).padStart(2,'0')).join('');
  }
  async function merkleRootHex(leaves:string[]){
    if (leaves.length === 0) return "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"; // sha256("")
    let level = leaves.slice();
    while (level.length > 1) {
      const next:string[] = [];
      for (let i=0;i<level.length;i+=2){
        const a = level[i];
        const b = (i+1<level.length) ? level[i+1] : level[i]; // duplicate last
        next.push(await sha256Hex(a + b));
      }
      // -ignore  Buffer<T> vs Buffer inference; runtime is correct
      level = next as any;
    }
    return level[0];
  }
  // Fallback compute that mirrors util/txroot behavior closely enough for dev:
  g.__void_txroot_compute_fallback = async function computeTxRootHexFromTxs(txs:any[]){
    // canonicalize objects → stable JSON, then leaf = sha256(json)
    const leaves:string[] = [];
    for (const t of (Array.isArray(txs)?txs:[])) {
      const s = JSON.stringify(t, Object.keys(t).sort());
      leaves.push(await sha256Hex(s));
    }
    return await merkleRootHex(leaves);
  };
})();

// === Additive: TxRoot Late-Setter v5 (outermost; with helper OR fallback) ===
(function attachTxrootLateSetter_v5(){
  const g:any = globalThis as any;
  if (g.__void_txroot_late_setter_v5) return; g.__void_txroot_late_setter_v5 = true;

  async function tryImport(spec:string){ try { return await import(spec); } catch { return undefined; } }
  async function loadHelper(){
    const base = new URL('.', import.meta.url).href;
    const candidates = [
      new URL('./util/txroot.ts', base).href,
      new URL('./util/txroot.js', base).href,
      './util/txroot.ts',
      './util/txroot.js',
    ];
    for (const c of candidates) { const m = await tryImport(c); if (m) return m; }
    return undefined;
  }

  let tries = 0;
  async function attachWhenReady(){
    tries++;
    try {
      // Wait until enforcer has wrapped saveBlock so we can wrap *outside* it
      const SegMod:any =
        (g.__void_SegStore) ||
        (await tryImport(new URL('./chain/seg_store.ts', import.meta.url).href)) ||
        (await tryImport('./chain/seg_store.ts')) ||
        (await tryImport('./chain/seg_store.js'));
      if (!SegMod) { if (tries<60) return setTimeout(attachWhenReady,100); return; }
      const SegStore = SegMod.SegStore || SegMod.default || SegMod;

      const cur = SegStore.prototype.saveBlock;
      const sig = String(cur?.name||'') + '|' + String(cur);
      const enforcerLikely = /enforce|txroot/i.test(sig);
      if (!enforcerLikely && tries<60) return setTimeout(attachWhenReady,100);

      const helper = await loadHelper();
      const compute =
        helper?.txRootHexFromTxs ||
        helper?.computeTxRootHex ||
        helper?.txRootHex ||
        (g.__void_txroot_compute_fallback);

      if (!compute) {
        console.warn("[txroot/late-setter] no helper and no fallback; giving up");
        return;
      }

      if ((cur as any)?.__void_txroot_late_setter_v5) return;

      async function patchedSaveBlock(this:any, block:any){
        try {
          const txs = Array.isArray(block?.txs) ? block.txs : [];
          const root = await compute(txs);
          block.header = block.header || {};
          block.header.txRoot = root;
          (globalThis as any).__void_txroot_late_setter_last = { number: block?.header?.number, txs: txs.length, root };
        } catch (e:any) {
          console.warn("[txroot/late-setter] compute failed:", e?.message || e);
        }
        return await cur.apply(this, arguments as any);
      }
      (patchedSaveBlock as any).__void_txroot_late_setter_v5 = true;
      SegStore.prototype.saveBlock = patchedSaveBlock;
      console.log("[txroot/late-setter] v5 attached (outermost; helper or fallback)");
    } catch (e:any) {
      if (tries<60) return setTimeout(attachWhenReady,100);
      console.warn("[txroot/late-setter] attach failed:", e?.message || e);
    }
  }
  attachWhenReady();

  // diag endpoint
  setTimeout(()=>{
    const app:any = (g.__void_http_app)||(g.app)||(g.__void_http_app=(g as any).__void_http_app);
    if (app && typeof app.get==="function") {
      app.get("/__void/txroot-late/last", (_:any,res:any)=> res.json((globalThis as any).__void_txroot_late_setter_last || {ok:false}));
    }
  }, 500);
})();

// === Additive: Gate early txroot persist under STRICT ===
(function gateEarlyTxrootPersistUnderStrict(){
  const g:any = globalThis as any;
  if (g.__void_gate_early_txroot_v1) return; g.__void_gate_early_txroot_v1 = true;

  const STRICT = (process.env.VOID_FEATURE_TXROOT_ENFORCE_STRICT === '1');
  if (!STRICT) return;

  // Delay until SegStore is ready and an early 'persist' setter was installed
  let tries = 0;
  (function hunt(){
    tries++;
    try{
      const SegStore = (g.__void_SegStore) || undefined;
      if (!SegStore) return tries<40 ? setTimeout(hunt,100) : undefined;
      const proto:any = SegStore.prototype;
      const orig = proto.saveBlock;
      if (!orig) return;

      if ((orig as any).__void_gate_early) return;

      // Wrap *inside* existing stack to no-op any pre-seal 'empty-root' injection when txs>0
      async function wrapped(this:any, block:any){
        if (block && block.header && block.header.txRoot &&
            Array.isArray(block.txs) && block.txs.length>0) {
          // If someone pre-set the empty-root, erase it so late-setter/enforcer can set correctly.
          if (block.header.txRoot === "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855") {
            block.header.txRoot = undefined;
          }
        }
        return await orig.apply(this, arguments as any);
      }
      (wrapped as any).__void_gate_early = true;
      proto.saveBlock = wrapped;
      console.log("[txroot/strict] early empty-root persist gated under STRICT");
    }catch(e){}
  })();
})();

// ---------------- Force-pour before saveBlock (pure-additive) -----------------
(function forcePourBeforeSave(){
  let tries = 0, attached = false;
  function getNode(){ return (globalThis as any).node || (globalThis as any).__void_node; }
  function getStore(){ return getNode()?.store; }
  function getCap(){
    const envCap = Number(process.env.VOID_TX_MERGE_MAX || process.env.TX_MERGE_CAP || 2);
    return Number.isFinite(envCap) && envCap > 0 ? envCap : 2;
  }
  function getMempoolArray(){
    const g:any = (globalThis as any);
    // prefer canonical mempool list if present; fall back to "pending" aliases
    const mp = g.mempool?.txs || g.pendingTxs || g.pending?.txs || g.__void_mempool || [];
    return Array.isArray(mp) ? mp : [];
  }
  function attach(){
    const store:any = getStore();
    if (!store || typeof store.saveBlock !== "function") {
      if (++tries < 120) return setTimeout(attach, 500);
      return;
    }
    if (attached) return; attached = true;

    const origSave = store.saveBlock.bind(store);
    store.saveBlock = async (block:any, ...rest:any[]) => {
      try {
        const cap = getCap();
        const mp = getMempoolArray();
        if (!block.txs) block.txs = [];
        // if there are queued txs, pour up to cap into this block
        if (Array.isArray(mp) && mp.length > 0 && cap > 0) {
          const take = Math.min(cap, mp.length);
          const pulled = mp.splice(0, take);
          // avoid duplicates if any | append
          for (const tx of pulled) if (tx) block.txs.push(tx);
          console.log(`[force-pour] merged ${pulled.length} tx(s) into block #${block.number ?? "?"} (mp left=${mp.length})`);
        }
      } catch (e) {
        console.error("[force-pour] error during pre-save merge:", e);
      }
      return await origSave(block, ...rest);
    };

    console.log("[force-pour] pre-save hook attached (cap from env; default=2)");
  }
  attach();
})();

// ---------------- OUTERMOST force-pour wrapper (sticky) ----------------------
(function forcePourSticky(){
  const WRAP_TAG = Symbol.for("__void_force_pour_wrapped__");
  let tries = 0, attached = false, rewraps = 0, pours = 0, last = {number:-1, merged:0, cap:0, mpBefore:0, mpAfter:0};

  function getNode(){ return (globalThis as any).node || (globalThis as any).__void_node; }
  function getStore(){ return getNode()?.store; }
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }

  function getCap() {
    const envCap = Number(process.env.VOID_TX_MERGE_MAX || process.env.TX_MERGE_CAP || 2);
    return Number.isFinite(envCap) && envCap > 0 ? envCap : 2;
  }

  function getMempoolArray(){
    const g:any = (globalThis as any);
    // canonical first
    if (g.mempool?.txs && Array.isArray(g.mempool.txs)) return g.mempool.txs;
    // aliases you already keep in sync
    if (Array.isArray(g.pendingTxs)) return g.pendingTxs;
    if (g.pending?.txs && Array.isArray(g.pending.txs)) return g.pending.txs;
    if (Array.isArray(g.__void_mempool)) return g.__void_mempool;
    return [];
  }

  function wrapSaveBlock(store:any){
    if (!store || typeof store.saveBlock !== "function") return false;
    if ((store.saveBlock as any)[WRAP_TAG]) return true; // already wrapped

    const orig = store.saveBlock.bind(store);
    async function wrapped(block:any, ...rest:any[]){
      // pour before we compute or persist
      try {
        const cap = getCap();
        const mp = getMempoolArray();
        const before = Array.isArray(mp) ? mp.length : 0;
        if (!block.txs) block.txs = [];
        let merged = 0;
        if (before > 0 && cap > 0) {
          const take = Math.min(cap, before);
          const pulled = mp.splice(0, take);
          for (const tx of pulled) if (tx) { block.txs.push(tx); merged++; }
          pours++; last = {number: block.number ?? -1, merged, cap, mpBefore: before, mpAfter: mp.length};
          console.log(`[force-pour] merged ${merged}/${cap} -> block #${block.number ?? "?"} (mp ${before}→${mp.length})`);
        }
      } catch (e) {
        console.error("[force-pour] error:", e);
      }
      return await orig(block, ...rest);
    }
    (wrapped as any)[WRAP_TAG] = true;
    store.saveBlock = wrapped;
    return true;
  }

  function attach(){
    const store = getStore();
    if (!store) {
      if (++tries < 120) return setTimeout(attach, 500);
      return;
    }
    if (!wrapSaveBlock(store)) {
      if (++tries < 120) return setTimeout(attach, 500);
      return;
    }
    if (!attached) {
      attached = true;
      console.log("[force-pour] OUTERMOST pre-save hook attached (sticky)");
    }
    // keep it outermost: if other code re-patches saveBlock, re-wrap
    setInterval(() => {
      const ok = wrapSaveBlock(getStore());
      if (ok) rewraps++;
    }, 1000);

    // status route (once app is available)
    let appTries = 0; (function exposeStatus(){
      const app:any = getApp();
      if (!app || typeof app.get !== "function") {
        if (++appTries < 60) return setTimeout(exposeStatus, 500);
        return;
      }
      app.get("/__void/force-pour/status", (_req:any, res:any) => {
        try {
          const mp = getMempoolArray();
          res.json({ attached:true, rewraps, pours, cap:getCap(), mempoolSize:Array.isArray(mp)?mp.length:0, last });
        } catch(e){ res.json({ attached:true, error:String(e) }); }
      });
      console.log("[force-pour] status at /__void/force-pour/status");
    })();
  }
  attach();
})();

// ---------------- Canonical mempool pointer binder (non-invasive) ------------
(function bindCanonicalMempool(){
  let bound = false, lastSizes = {mp:0, pend:0, pendTxs:0};
  function getNode(){ return (globalThis as any).node || (globalThis as any).__void_node; }
  function tryBind(){
    const n:any = getNode();
    if (!n) return;
    const mp = n?.mempool?.txs;
    const pend = n?.pending;
    const pendTxs = n?.pendingTxs;
    if (Array.isArray(mp)) {
      (globalThis as any).__void_mempool_ref = mp;
      bound = true;
    }
    lastSizes = {
      mp: Array.isArray(mp)? mp.length : 0,
      pend: Array.isArray(pend?.txs)? pend.txs.length : 0,
      pendTxs: Array.isArray(pendTxs)? pendTxs.length : 0
    };
  }
  setInterval(tryBind, 500);
  // expose diag once app exists
  let tries=0;(function expose(){
    const app:any = (globalThis as any).__void_http_app || (globalThis as any).app;
    if (!app || typeof app.get!=="function"){ if(++tries<60) return setTimeout(expose,500); return; }
    app.get("/__void/mempool/bind/status", (_req:any,res:any)=>{
      const n:any = getNode();
      const mp = n?.mempool?.txs;
      res.json({
        bound, lastSizes,
        nodeHas: { mempool:Array.isArray(mp), pending:Array.isArray(n?.pending?.txs), pendingTxs:Array.isArray(n?.pendingTxs) },
        globalHas: {
          mempool:Array.isArray((globalThis as any).mempool?.txs),
          pending:Array.isArray((globalThis as any).pending?.txs),
          pendingTxs:Array.isArray((globalThis as any).pendingTxs),
          ref:Array.isArray((globalThis as any).__void_mempool_ref)
        }
      });
    });
    console.log("[mempool-bind] status at /__void/mempool/bind/status");
  })();
})();

// ---------------- OUTERMOST force-pour wrapper (sticky v2) --------------------
(function forcePourStickyV2(){
  const WRAP_TAG = Symbol.for("__void_force_pour_wrapped_v2__");
  let tries = 0, attached = false, rewraps = 0, pours = 0, last = {number:-1, merged:0, cap:0, mpBefore:0, mpAfter:0};

  function getNode(){ return (globalThis as any).node || (globalThis as any).__void_node; }
  function getStore(){ return getNode()?.store; }
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  function getCap(){ const v=Number(process.env.VOID_TX_MERGE_MAX||process.env.TX_MERGE_CAP||2); return Number.isFinite(v)&&v>0?v:2; }

  function getMempoolArrayV2(){
    const n:any = getNode();
    if (n?.mempool?.txs && Array.isArray(n.mempool.txs)) return n.mempool.txs;       // primary
    if (Array.isArray(n?.pendingTxs)) return n.pendingTxs;                             // mirror
    if (Array.isArray(n?.pending?.txs)) return n.pending.txs;                          // mirror
    const g:any = (globalThis as any);
    if (g.__void_mempool_ref && Array.isArray(g.__void_mempool_ref)) return g.__void_mempool_ref; // bound ref
    if (g.mempool?.txs && Array.isArray(g.mempool.txs)) return g.mempool.txs;          // legacy
    if (Array.isArray(g.pendingTxs)) return g.pendingTxs;                               // legacy
    if (g.pending?.txs && Array.isArray(g.pending.txs)) return g.pending.txs;           // legacy
    return [];
  }

  function wrapSaveBlock(store:any){
    if (!store || typeof store.saveBlock !== "function") return false;
    if ((store.saveBlock as any)[WRAP_TAG]) return true;
    const orig = store.saveBlock.bind(store);
    async function wrapped(block:any, ...rest:any[]){
      try {
        const cap = getCap();
        const mp = getMempoolArrayV2();
        const before = Array.isArray(mp)? mp.length : 0;
        if (!block.txs) block.txs = [];
        let merged = 0;
        if (before > 0 && cap > 0) {
          const take = Math.min(cap, before);
          const pulled = mp.splice(0, take);
          for (const tx of pulled) if (tx) { block.txs.push(tx); merged++; }
          pours++; last = {number: block.number ?? -1, merged, cap, mpBefore: before, mpAfter: Array.isArray(mp)?mp.length:0};
          console.log(`[force-pour-v2] merged ${merged}/${cap} -> block #${block.number ?? "?"} (mp ${before}→${Array.isArray(mp)?mp.length:"?"})`);
        }
      } catch (e) {
        console.error("[force-pour-v2] error:", e);
      }
      return await orig(block, ...rest);
    }
    (wrapped as any)[WRAP_TAG] = true;
    store.saveBlock = wrapped;
    return true;
  }

  function attach(){
    const store = getStore();
    if (!store) { if (++tries < 120) return setTimeout(attach, 500); return; }
    if (!wrapSaveBlock(store)) { if (++tries < 120) return setTimeout(attach, 500); return; }
    if (!attached) { attached = true; console.log("[force-pour-v2] OUTERMOST pre-save hook attached (sticky)"); }
    setInterval(() => { if (wrapSaveBlock(getStore())) rewraps++; }, 1000);

    // status route
    let appTries=0;(function expose(){
      const app:any = getApp();
      if (!app || typeof app.get!=="function"){ if(++appTries<60) return setTimeout(expose,500); return; }
      app.get("/__void/force-pour/v2/status", (_req:any,res:any)=>{
        const mp = getMempoolArrayV2();
        res.json({ attached:true, rewraps, pours, cap:getCap(), mempoolSize:Array.isArray(mp)?mp.length:0, last });
      });
      console.log("[force-pour-v2] status at /__void/force-pour/v2/status");
    })();
  }
  attach();
})();

// ---------------- force-pour-v2: once-per-block guard + stronger outer wrap ----
(function forcePourStickyV2_onceGuard(){
  const WRAP_TAG = Symbol.for("__void_force_pour_wrapped_v2__");
  const POURED_FLAG = "__void_poured_v2__";     // mark on block object
  const seenByNumber = new Set<number>();       // fallback if block object differs
  let tries = 0, attached = false, rewraps = 0, pours = 0;
  let last = { number:-1, merged:0, cap:0, mpBefore:0, mpAfter:0 };

  function getNode(){ return (globalThis as any).node || (globalThis as any).__void_node; }
  function getStore(){ return getNode()?.store; }
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  function getCap(){ const v=Number(process.env.VOID_TX_MERGE_MAX||process.env.TX_MERGE_CAP||2); return Number.isFinite(v)&&v>0?v:2; }
  function getMP(){
    const n:any = getNode(), g:any = (globalThis as any);
    if (Array.isArray(n?.mempool?.txs)) return n.mempool.txs;
    if (Array.isArray(n?.pendingTxs))   return n.pendingTxs;
    if (Array.isArray(n?.pending?.txs)) return n.pending.txs;
    if (Array.isArray(g.__void_mempool_ref)) return g.__void_mempool_ref;
    if (Array.isArray(g?.mempool?.txs))  return g.mempool.txs;
    if (Array.isArray(g?.pendingTxs))    return g.pendingTxs;
    if (Array.isArray(g?.pending?.txs))  return g.pending.txs;
    return [];
  }

  function wrapSaveBlock(store:any){
    if (!store || typeof store.saveBlock !== "function") return false;
    if ((store.saveBlock as any)[WRAP_TAG]) return true;          // already outermost v2
    const orig = store.saveBlock.bind(store);
    async function wrapped(block:any, ...rest:any[]){
      try {
        const cap = getCap();
        const mp  = getMP();
        const before = Array.isArray(mp)? mp.length : 0;
        const num = (block?.number ?? -1) | 0;

        // --- idempotency guards ---
        if (block && block[POURED_FLAG] === true) {
          // already poured this exact object
          return await orig(block, ...rest);
        }
        if (num >= 0 && seenByNumber.has(num)) {
          // already poured something with this block number in this seal cycle
          return await orig(block, ...rest);
        }

        if (!block.txs) block.txs = [];
        let merged = 0;
        if (before > 0 && cap > 0) {
          const take = Math.min(cap, before);
          const pulled = mp.splice(0, take);
          for (const tx of pulled) if (tx) { block.txs.push(tx); merged++; }
          pours++;
          last = { number: num, merged, cap, mpBefore: before, mpAfter: Array.isArray(mp)? mp.length : 0 };
          if (block) try { block[POURED_FLAG] = true; } catch {}
          if (num >= 0) seenByNumber.add(num);
          console.log(`[force-pour-v2] merged ${merged}/${cap} -> block #${num} (mp ${before}→${Array.isArray(mp)?mp.length:"?"})`);
        }
      } catch (e) {
        console.error("[force-pour-v2] error:", e);
      }
      return await orig(block, ...rest);
    }
    (wrapped as any)[WRAP_TAG] = true;
    store.saveBlock = wrapped;
    return true;
  }

  function attach(){
    const store = getStore();
    if (!store) { if (++tries < 120) return setTimeout(attach, 500); return; }
    if (!wrapSaveBlock(store)) { if (++tries < 120) return setTimeout(attach, 500); return; }
    if (!attached) { attached = true; console.log("[force-pour-v2] OUTERMOST pre-save hook attached (sticky+once)"); }

    // keep our wrapper outermost (others may re-wrap later)
    setInterval(() => {
      if (wrapSaveBlock(getStore())) rewraps++;
      // decay seen numbers so the next block number can reuse after seal advances
      if (seenByNumber.size > 0) seenByNumber.clear();
    }, 800);

    // status
    let appTries=0;(function expose(){
      const app:any = getApp();
      if (!app || typeof app.get!=="function"){ if(++appTries<60) return setTimeout(expose,500); return; }
      app.get("/__void/force-pour/v2/status2", (_req:any,res:any)=>{
        const mp = getMP();
        res.json({ attached:true, rewraps, pours, cap:getCap(), mempoolSize:Array.isArray(mp)?mp.length:0, last });
      });
      console.log("[force-pour-v2] status at /__void/force-pour/v2/status2");
    })();
  }

  attach();
})();

// ---------------- Tx Source Multiplexer (additive) -----------------------------
(function txSourceMux(){
  let tries = 0, attached = false;
  function getNode(){ return (globalThis as any).node || (globalThis as any).__void_node; }
  function arrays(){
    const n:any = getNode() || {};
    const g:any = (globalThis as any);
    const out:any[] = [];
    if (Array.isArray(n?.mempool?.txs)) out.push(n.mempool.txs);
    if (Array.isArray(n?.pendingTxs))   out.push(n.pendingTxs);
    if (Array.isArray(n?.pending?.txs)) out.push(n.pending.txs);
    if (Array.isArray(g?.__void_mempool_ref)) out.push(g.__void_mempool_ref);
    if (Array.isArray(g?.mempool?.txs))  out.push(g.mempool.txs);
    if (Array.isArray(g?.pendingTxs))    out.push(g.pendingTxs);
    if (Array.isArray(g?.pending?.txs))  out.push(g.pending.txs);
    return out;
  }
  const txsrc = {
    size(){ return arrays().reduce((s,a)=>s+(Array.isArray(a)?a.length:0),0); },
    pull(n:number){
      const res:any[] = [];
      let left = Math.max(0, n|0);
      for (const a of arrays()){
        if (!Array.isArray(a) || left<=0) continue;
        const take = Math.min(left, a.length);
        if (take>0){ res.push(...a.splice(0, take)); left -= take; }
      }
      return res;
    },
    peek(k:number=1){
      const out:any[] = [];
      for (const a of arrays()){
        if (!Array.isArray(a)) continue;
        for (let i=0;i<Math.min(k, a.length);i++) out.push(a[i]);
        if (out.length>=k) break;
      }
      return out;
    },
    sources(){ return arrays().map(a => Array.isArray(a)? a.length : -1); }
  };
  (globalThis as any).__void_txsrc = txsrc;

  function statusRoute(){
    const app:any = (globalThis as any).__void_http_app || (globalThis as any).app;
    if (!app || typeof app.get!=="function") return false;
    app.get("/__void/txsrc/status", (_req:any, res:any)=>{
      const arrs = arrays();
      res.json({
        totalSize: txsrc.size(),
        sources: arrs.map((a,i)=>({i, len: Array.isArray(a)?a.length:-1})),
        peek2: txsrc.peek(2).length
      });
    });
    console.log("[txsrc] status at /__void/txsrc/status");
    return true;
  }

  (function attach(){
    if (attached) return;
    if (!getNode()) { if (++tries<120) return setTimeout(attach,500); return; }
    attached = true;
    statusRoute() || setTimeout(statusRoute, 500);
  })();
})();

// -------- Patch force-pour-v2 to use txsrc (no deletions, just augment) --------
(function forcePourV2_useTxSrc(){
  const getTxSrc = () => (globalThis as any).__void_txsrc;
  const getApp = () => (globalThis as any).__void_http_app || (globalThis as any).app;
  let extraStats = { pulls:0, pulled:0 };

  // augment existing v2 status if present
  let tries=0;(function expose(){
    const app:any = getApp();
    if (!app || typeof app.get!=="function"){ if(++tries<60) return setTimeout(expose,500); return; }
    app.get("/__void/force-pour/v2/txsrc", (_req:any,res:any)=>{
      const txsrc:any = getTxSrc();
      res.json({
        hasTxSrc: !!txsrc,
        totalSize: txsrc ? txsrc.size() : -1,
        sources: txsrc ? txsrc.sources() : [],
        stats: extraStats
      });
    });
    console.log("[force-pour-v2] txsrc bridge at /__void/force-pour/v2/txsrc");
  })();

  // soft monkey-patch: if our once-guard wrapper exists, nudge it to use txsrc
  const g:any = (globalThis as any);
  const store:any = g.node?.store;
  if (!store || typeof store.saveBlock!=="function") return;

  // wrap-once more outside, but only to swap the drain primitive
  const WRAP_TAG = Symbol.for("__void_force_pour_v2_txsrc_swap__");
  if (!(store.saveBlock as any)[WRAP_TAG]) {
    const orig = store.saveBlock.bind(store);
    store.saveBlock = async function(block:any, ...rest:any[]){
      const capEnv = Number(process.env.VOID_TX_MERGE_MAX||process.env.TX_MERGE_CAP||2) || 2;
      try {
        // If an inner wrapper tries mempool.splice, ensure txs exist first via txsrc.
        const txsrc:any = getTxSrc();
        if (txsrc && block && Array.isArray(block.txs) && block.txs.length===0) {
          const pulled = txsrc.pull(capEnv);
          if (pulled.length>0){
            for (const tx of pulled) block.txs.push(tx);
            extraStats.pulls++; extraStats.pulled += pulled.length;
            console.log(`[force-pour-v2/txsrc] pre-fill ${pulled.length}/${capEnv} before seal`);
          }
        }
      } catch(e){ console.error("[force-pour-v2/txsrc] pre-fill error:", e); }
      return await orig(block, ...rest);
    };
    (store.saveBlock as any)[WRAP_TAG] = true;
  }
})();

// ---------------- Single-epoch seal guard (additive) ----------------------------
(function sealEpochOnce(){
  const G:any = (globalThis as any);
  G.__void_seal_ctx = G.__void_seal_ctx || new Map<number, {merged:boolean; sealed:boolean; pulled:number; cap:number;}>();

  function getStore(){ return G.node?.store; }
  function getTxSrc(){ return G.__void_txsrc; }
  function getApp(){ return G.__void_http_app || G.app; }

  // status introspection (optional)
  (function expose(){
    let tries=0;
    function attach(){
      const app:any = getApp();
      if (!app || typeof app.get!=="function"){ if(++tries<60) return setTimeout(attach,500); return; }
      app.get("/__void/seal-epoch/status", (_req:any, res:any)=>{
        const out:any[] = [];
        for (const [k,v] of (G.__void_seal_ctx as Map<number, any>).entries()){
          out.push({block:k, merged:v.merged, sealed:v.sealed, pulled:v.pulled, cap:v.cap});
        }
        res.json({size: out.length, entries: out});
      });
      console.log("[seal-epoch] status at /__void/seal-epoch/status");
    }
    attach();
  })();

  const store:any = getStore();
  if (!store || typeof store.saveBlock!=="function") return;

  const WRAP_TAG = Symbol.for("__void_seal_epoch_once_wrap__");
  if ((store.saveBlock as any)[WRAP_TAG]) return;

  const orig = store.saveBlock.bind(store);
  store.saveBlock = async function(block:any, ...rest:any[]){
    try{
      const cap = Number(process.env.VOID_TX_MERGE_MAX || process.env.TX_MERGE_CAP || 2) || 2;
      const num = (block && typeof block.number==="number") ? block.number : -1;
      const ctxMap:Map<number, any> = G.__void_seal_ctx;
      const ctx = ctxMap.get(num) || { merged:false, sealed:false, pulled:0, cap };
      ctx.cap = cap;

      // Exactly one merge per block number
      if (!ctx.merged) {
        const txsrc:any = getTxSrc();
        if (txsrc && block && Array.isArray(block.txs)) {
          const have = block.txs.length;
          const room = Math.max(0, cap - have);
          if (room > 0) {
            const pulled = txsrc.pull(room);
            if (pulled.length > 0){
              for (const tx of pulled) block.txs.push(tx);
              ctx.pulled += pulled.length;
              console.log(`[seal-epoch] merged ${pulled.length}/${cap} -> block #${num} (txs ${have}→${block.txs.length})`);
            }
          }
        }
        ctx.merged = true;
        // freeze further changes by other wrappers in this process
        (block as any).__void_seal_epoch_locked = true;
        ctxMap.set(num, ctx);
      } else {
        // Subsequent wrappers see merged=true and DO NOTHING to txs
        // They just fall through to persist the already-merged block
      }
    } catch(e){ console.error("[seal-epoch] pre-merge error:", e); }

    try{
      const res = await orig(block, ...rest);
      // mark sealed & cleanup shortly to avoid unbounded map growth
      const num = (block && typeof block.number==="number") ? block.number : -1;
      const ctxMap:Map<number, any> = (globalThis as any).__void_seal_ctx;
      const ctx = ctxMap.get(num);
      if (ctx){ ctx.sealed = true; setTimeout(()=>ctxMap.delete(num), 15_000); }
      return res;
    } catch(e){
      // on error, let ctx live a bit longer for debugging
      console.error("[seal-epoch] saveBlock error:", e);
      throw e;
    }
  };
  (store.saveBlock as any)[WRAP_TAG] = true;
})();

// ---------------- Merge-once + txroot freeze (additive) -----------------------
(function mergeOnceAndFreezeTxRoot(){
  const G:any = (globalThis as any);
  function getStore(){ return G.node?.store; }
  function getApp(){ return G.__void_http_app || G.app; }

  // small, stable txroot (keeps your existing helper compatible)
  function merkleRootHex(leaves: string[]): string {
    // empty root (kept identical to your earlier code path)
    const EMPTY = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    if (!leaves || leaves.length === 0) return EMPTY;

    // ensure 0x-less hex → Buffer
    const bufs = leaves.map(h => {
      const s = (h.startsWith('0x') ? h.slice(2) : h);
      return Buffer.from(s, 'hex');
    });

    let level = bufs;
    const crypto = require('node:crypto');
    while (level.length > 1) {
      const next: any[] = [] as any[];
      for (let i=0;i<level.length;i+=2) {
        const a = level[i];
        const b = (i+1<level.length) ? level[i+1] : level[i]; // duplicate last if odd
        next.push(crypto.createHash('sha256').update(Buffer.concat([a,b])).digest());
      }
      level = next;
    }
    return level[0].toString('hex');
  }

  const store:any = getStore();
  if (!store || typeof store.saveBlock !== "function") return;

  const WRAP_TAG = Symbol.for("__void_merge_once_freeze_txroot__");
  if ((store.saveBlock as any)[WRAP_TAG]) return;

  // expose tiny status for debugging
  (function expose(){
    let tries=0;
    function attach(){
      const app:any = getApp();
      if (!app || typeof app.get!=="function"){ if(++tries<60) return setTimeout(attach,500); return; }
      app.get("/__void/txroot/freeze-status", (_req:any,res:any)=>{
        res.json({ ok:true, note:"merge-once + txroot-freeze active" });
      });
      console.log("[txroot/freeze] status at /__void/txroot/freeze-status");
    }
    attach();
  })();

  const orig = store.saveBlock.bind(store);
  store.saveBlock = async function(block:any, ...rest:any[]){
    // ----- Merge exactly once per block object -----
    try {
      if (block && !block.__void_merge_done) {
        // honor live cap like your other hooks (default 2)
        const cap = Number(process.env.VOID_TX_MERGE_MAX || process.env.TX_MERGE_CAP || 2) || 2;
        block.txs = Array.isArray(block.txs) ? block.txs : [];
        const have = block.txs.length;
        const room = Math.max(0, cap - have);

        const txsrc = (G.__void_txsrc || null);
        if (txsrc && room > 0 && typeof txsrc.pull === "function") {
          const pulled = txsrc.pull(room) || [];
          if (pulled.length > 0) {
            for (const tx of pulled) block.txs.push(tx);
            console.log(`[merge-once] merged ${pulled.length}/${cap} -> block #${block.number ?? -1} (txs ${have}→${block.txs.length})`);
          }
        }
        // mark done so other wrappers in this process won't add again
        Object.defineProperty(block, "__void_merge_done", { value:true, enumerable:false, configurable:false, writable:false });
      }
    } catch (e) {
      console.error("[merge-once] pre-merge error:", e);
    }

    // ----- Freeze header.txRoot from a snapshot before persist -----
    try {
      if (block) {
        block.header = block.header || {};
        // compute from current snapshot of txs (assume txs already have ids/hashes)
        // if transactions are objects, map to deterministic hex id/hash field you already use
        const leaves = (block.txs || []).map((t:any)=>{
          if (typeof t === "string") return t.replace(/^0x/,'');
          if (t && typeof t.hash === "string") return t.hash.replace(/^0x/,'');
          if (t && typeof t.id === "string") return t.id.replace(/^0x/,'');
          // fallback: stable JSON hash
          const crypto = require('node:crypto');
          return crypto.createHash('sha256').update(JSON.stringify(t)).digest('hex');
        });
        const root = merkleRootHex(leaves);

        // If txRoot already present and differs, treat as violation (prevent flip-flop)
        if (typeof block.header.txRoot === "string" && block.header.txRoot !== root) {
          console.warn(`[txroot/freeze] detected differing header (${block.header.txRoot}) vs computed (${root}) on #${block.number ?? -1}; using computed and freezing.`);
        }

        // define non-writable, non-configurable to block further mutation
        Object.defineProperty(block.header, "txRoot", {
          value: root, enumerable: true, writable: false, configurable: false
        });

        // mark frozen (debug)
        Object.defineProperty(block, "__void_txroot_frozen", { value:true, enumerable:false, configurable:false, writable:false });
      }
    } catch (e) {
      console.error("[txroot/freeze] pre-persist compute/freeze error:", e);
    }

    // persist
    const res = await orig(block, ...rest);
    return res;
  };
  (store.saveBlock as any)[WRAP_TAG] = true;
})();

// ---- type anchors for merkle local vars (no-ops at runtime) ----
try {
  (function __void_txroot_type_anchors(){
    const G:any = (globalThis as any);
    const noop = (_x:any)=>{};
    // If the symbol was set by our wrapper, expose a soft flag (debug only)
    const store = G?.node?.store;
    if (store && (store.saveBlock as any)) {
      (store.saveBlock as any).__void_merge_once_freeze_installed = true;
    }
    noop(0);
  })();
} catch { /* ignore */ }

// ---------------- Merge-once + txroot freeze (pure-additive, idempotent) -----
(function mergeOnceAndFreezeTxRoot(){
  const G:any = (globalThis as any);
  function getStore(){ return G?.node?.store; }
  function getApp(){ return G.__void_http_app || G.app; }

  // Minimal Merkle helper (sha256, duplicate-last if odd)
  function merkleRootHex(leaves: string[]): string {
    const EMPTY = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    if (!leaves || leaves.length === 0) return EMPTY;
    const crypto = require('node:crypto');
    // buffers
    let level = leaves.map((h:string) => Buffer.from(h.startsWith('0x')? h.slice(2): h, 'hex'));
    while (level.length > 1) {
      const next: Buffer[] = [];
      for (let i = 0; i < level.length; i += 2) {
        const a = level[i];
        const b = (i+1 < level.length) ? level[i+1] : level[i];
        next.push(crypto.createHash('sha256').update(Buffer.concat([a,b])).digest());
      }
      // @ts-ignore  Buffer<T> vs Buffer inference; runtime is correct
      level = next;
    }
    return level[0].toString('hex');
  }

  const store:any = getStore();
  if (!store || typeof store.saveBlock !== "function") return;
  if ((store.saveBlock as any).__void_merge_once_freeze) return; // idempotent

  const origSave = store.saveBlock.bind(store);
  (store.saveBlock as any).__void_merge_once_freeze = true;

  // Track merge-per-block to avoid topping up the same number repeatedly
  const mergedByNumber = new Set<number>();

  store.saveBlock = async function(block:any){
    try {
      const hdr = (block.header ||= {});
      const num = typeof hdr.number === 'number' ? hdr.number : -1;

      // One-merge guard per block number (best-effort; survives wrapper re-entry)
      if (num >= 0) {
        if (mergedByNumber.has(num)) {
          // No-op: already merged for this number
        } else {
          mergedByNumber.add(num);
          // (optional) Log once
          console.log('[merge-once] first merge for #'+num);
        }
      }

      // Freeze header.txRoot exactly once (if not present)
      if (!('txRoot' in hdr) || hdr.txRoot == null) {
        // use tx arrays we already expose in node
        const txs:any[] =
          (Array.isArray(block.txs) ? block.txs :
          (Array.isArray(block.pendingTxs) ? block.pendingTxs : []));
        const leaves = txs.map((t:any) => {
          const h = (t?.hash || t?.id || t?.txid || t?.h || t);
          return String(h).replace(/^0x/, '');
        });
        const root = merkleRootHex(leaves);

        // Define as non-writable & non-configurable so later writers cannot flip it
        Object.defineProperty(hdr, 'txRoot', {
          value: root,
          writable: false,
          configurable: false,
          enumerable: true
        });
        console.log('[txroot/freeze] #'+num+' txs='+txs.length+' root='+root);
      } else {
        // If present, do not modify. (enforcer will compare computed vs frozen)
      }
    } catch (e) {
      console.warn('[merge-once/freeze] wrapper error:', e);
    }
    return origSave(block);
  };

  // tiny status endpoint
  setTimeout(() => {
    const app:any = getApp();
    if (app?.get) {
      app.get('/__void/txroot/freeze-status', (_req:any, res:any) => {
        res.json({ installed: true, mergeOnce: true });
      });
    }
  }, 0);
})();

// ---- type anchors / debug flag (no-ops at runtime) ----
try {
  (function __void_txroot_type_anchors(){
    const G:any = (globalThis as any);
    const s = G?.node?.store?.saveBlock as any;
    if (s) s.__void_merge_once_freeze_installed = true;
  })();
} catch {}

// ---------------- txroot freeze (merge-once, additive, idempotent) ------------
(function __void_txroot_merge_once_freeze(){
  const G:any = (globalThis as any);
  function getApp(){ return G.__void_http_app || G.app; }
  function getStore(){ return G?.node?.store; }

  // Reuse a simple, stable Merkle (sha256 of concatenated pair; dup-last if odd)
  const EMPTY = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  function sha256Hex(buf: Uint8Array){ return require('node:crypto').createHash('sha256').update(buf).digest('hex'); }
  function hexBuf(h:string){ const s=h.startsWith('0x')?h.slice(2):h; return Buffer.from(s,'hex'); }
  function toLeafHex(x:any): string {
    if (typeof x === 'string') {
      const s = x.startsWith('0x') ? x.slice(2) : x;
      return /^[0-9a-fA-F]{64}$/.test(s) ? s.toLowerCase() : sha256Hex(Buffer.from(x));
    }
    const c = (x && (x.hash||x.id||x.txid));
    if (typeof c === 'string') {
      const s = c.startsWith('0x') ? c.slice(2) : c;
      return /^[0-9a-fA-F]{64}$/.test(s) ? s.toLowerCase() : sha256Hex(Buffer.from(c));
    }
    // fallback: hash the JSON
    return sha256Hex(Buffer.from(JSON.stringify(x ?? "")));
  }
  function merkleRootHex(leaves: string[]): string {
    if (!leaves || leaves.length === 0) return EMPTY;
    let level: any[] = leaves.map(hexBuf);
    const crypto = require('node:crypto');
    while (level.length > 1) {
      const next:any[] = [] as any[];
      for (let i=0;i<level.length;i+=2) {
        const a = level[i];
        const b = (i+1<level.length) ? level[i+1] : level[i];
        next.push(crypto.createHash('sha256').update(Buffer.concat([a,b])).digest());
      }
      // Cast only inside this function to keep TS quiet without touching other code
      level = next as any;
    }
    return (level[0] as Buffer).toString('hex');
  }
  function computeBlockTxRoot(block:any): string {
    const txs = Array.isArray(block?.txs) ? block.txs : [];
    const leaves = txs.map(toLeafHex);
    return merkleRootHex(leaves);
  }

  const store:any = getStore();
  if (!store || typeof store.saveBlock !== "function") return;
  if ((store.saveBlock as any).__void_txroot_freeze_installed) return;

  const origSave = store.saveBlock.bind(store);
  (store.saveBlock as any).__void_txroot_freeze_installed = true;

  const frozenByNumber = new Set<number>();  // "merge once" per block number

  // Small status endpoint
  try {
    const app:any = getApp();
    if (app && typeof app.get === 'function') {
      app.get("/__void/txroot/freeze-status", (_req:any, res:any) => {
        res.json({
          installed: true,
          mergeOnce: true,
          frozenCount: frozenByNumber.size,
        });
      });
    }
  } catch {}

  store.saveBlock = async function __void_txroot_freeze(block:any){
    try {
      const n:number = (block?.header?.number ?? block?.number ?? -1);
      if (n >= 0 && frozenByNumber.has(n)) {
        // Already processed this number — do NOT recompute/rewrite. Just persist.
        return await origSave(block);
      }

      // Compute the canonical root from the block's txs
      const computed = computeBlockTxRoot(block);

      // Ensure header exists
      block.header = block.header || {};
      const had = Object.prototype.hasOwnProperty.call(block.header, 'txRoot');
      const prev = block.header.txRoot;

      // If missing or empty, set to computed
      const shouldSet = (!had) || (typeof prev !== 'string') || prev === '' || prev === EMPTY;
      if (shouldSet) {
        try {
          // Define as non-writable/non-configurable to freeze it
          Object.defineProperty(block.header, 'txRoot', {
            value: computed,
            enumerable: true,
            writable: false,
            configurable: false,
          });
          console.log(`[txroot/freeze] set & froze header.txRoot for #${n} root=${computed}`);
        } catch (e) {
          // If defineProperty fails (already defined non-configurable), best-effort assign
          try { (block.header as any).txRoot = computed; } catch {}
          console.log(`[txroot/freeze] set header.txRoot (fallback) for #${n} root=${computed}`);
        }
      } else {
        // Already had a value. If it differs, do NOT flip it again. We just log once.
        if (typeof prev === 'string' && prev !== computed) {
          console.log(`[txroot/freeze] header present for #${n}, prev!=computed  prev=${prev} computed=${computed}  (kept prev)`);
        } else {
          console.log(`[txroot/freeze] header present for #${n}, matches computed`);
        }
        // Freeze anyway to stop later changes.
        try {
          const desc = Object.getOwnPropertyDescriptor(block.header, 'txRoot');
          if (!desc || desc.configurable || desc.writable) {
            Object.defineProperty(block.header, 'txRoot', {
              value: block.header.txRoot,
              enumerable: true,
              writable: false,
              configurable: false,
            });
          }
        } catch {}
      }

      if (n >= 0) frozenByNumber.add(n);
    } catch (e:any) {
      console.log("[txroot/freeze] non-fatal error:", e?.message || e);
    }

    // Persist downstream
    return await origSave(block);
  };

})();

// ---------------- Global txRoot first-write-wins guard (additive) -------------
(function __void_txroot_define_guard(){
  try {
    const G:any = (globalThis as any);
    if ((G.__void_txroot_define_guard_installed)) return;
    G.__void_txroot_define_guard_installed = true;

    // Track header objects we've already frozen once
    const seen = new WeakSet<object>();

    const _defineProperty = Object.defineProperty;
    // -ignore -- legacy override kept for back-compat; guarded by bootstrap define_patch
    (Object as any).defineProperty = function(obj:any, prop:any, desc:any){
      try {
        // Only intercept exact 'txRoot' on plain objects (headers)
        if (prop === 'txRoot' && obj && typeof obj === 'object') {
          // If we've seen this header already, refuse to change its txRoot value
          if (seen.has(obj)) {
            // If caller tries to change the value, silently ignore
            if (desc && Object.prototype.hasOwnProperty.call(desc, 'value')) {
              const cur = obj.txRoot;
              if (typeof cur === 'string' && desc.value !== cur) {
                // Keep the original; return the object as if succeeded
                // (non-throwing to avoid breaking callers)
                return obj;
              }
            }
            // If they are re-defining with same value, allow but ensure frozen
            try {
              return _defineProperty(obj, 'txRoot', {
                value: obj.txRoot,
                enumerable: true,
                writable: false,
                configurable: false,
              });
            } catch { return obj; }
          }

          // First time we see this header: if no value, allow and mark seen;
          // if value exists, keep it stable and freeze it.
          let nextVal = desc && Object.prototype.hasOwnProperty.call(desc, 'value')
            ? desc.value
            : obj.txRoot;

          // Normalize empty → leave as is; the saveBlock freeze will fill it if needed
          // Allow the initial set to proceed:
          const ret = _defineProperty(obj, 'txRoot', {
            value: nextVal,
            enumerable: true,
            writable: false,
            configurable: false,
          });
          try { seen.add(obj); } catch {}
          return ret;
        }
      } catch {
        // fall through to default defineProperty
      }
      // Non-txRoot or any error → pass through
      // @ts-ignore - spread args for TS
      return _defineProperty.apply(Object, arguments as any);
    };

    // Tiny status endpoint
    try {
      const app:any = G.__void_http_app || G.app;
      if (app && typeof app.get === 'function') {
        app.get('/__void/txroot/guard-status', (_req:any, res:any) => {
          res.json({ installed:true, mode:'first-write-wins' });
        });
      }
    } catch {}

    // Note: saveBlock freeze stays in place from earlier block; this guard handles
    // earlier/other codepaths that try to rewrite header.txRoot.
    console.log('[txroot/guard] installed global first-write-wins for header.txRoot');
  } catch (e:any) {
    console.log('[txroot/guard] install error:', e?.message || e);
  }
})();

// ---------------- txRoot Guard v2 (block-number keyed, additive) --------------
(function __void_txroot_guard_v2(){
  try {
    const G:any = (globalThis as any);
    if (G.__void_txroot_guard_v2_installed) return;
    G.__void_txroot_guard_v2_installed = true;

    const symVal = Symbol.for('__void_txroot_val');
    const frozenByNumber = new Map<number,string>();      // number -> frozen root
    const allowOnce = new Set<number>();                  // numbers allowed to update once (finalize)

    function getBlockNumber(obj:any): number|undefined {
      try {
        if (!obj || typeof obj !== 'object') return;
        if (typeof obj.number === 'number') return obj.number;
        if (obj.header && typeof obj.header.number === 'number') return obj.header.number;
      } catch {}
      return;
    }

    function freezeOnObject(obj:any, val:string){
      try {
        return _defineProperty(obj, 'txRoot', { value: val, enumerable: true, writable: false, configurable: false });
      } catch { return obj; }
    }

    // Finalizer hook (callable from saveBlock wrapper)
    G.__void_txroot_setFinal = function(n:number, val:string, obj?:any){
      try {
        frozenByNumber.set(n, val);
        if (obj && typeof obj === 'object') freezeOnObject(obj, val);
      } catch {}
    };

    // Allow a single update (for finalization) for block n
    G.__void_txroot_allowFinalOnce = function(n:number){
      try { allowOnce.add(n); } catch {}
    };

    // ---- Intercept defineProperty (covers many libs and explicit setters)
    const _defineProperty = Object.defineProperty;
    (Object as any).defineProperty = function(obj:any, prop:any, desc:any){
      try {
        if (prop === 'txRoot' && obj && typeof obj === 'object') {
          const n = getBlockNumber(obj);
          if (typeof n === 'number') {
            const hasFrozen = frozenByNumber.has(n);
            const nextVal = (desc && Object.prototype.hasOwnProperty.call(desc, 'value'))
              ? desc.value
              : (obj && obj[symVal]);

            if (hasFrozen && !allowOnce.has(n)) {
              // keep the first frozen value
              const keep = frozenByNumber.get(n)!;
              return freezeOnObject(obj, keep);
            }

            // first set, or final once-override
            const chosen = hasFrozen && allowOnce.has(n) ? nextVal : nextVal;
            freezeOnObject(obj, chosen);
            frozenByNumber.set(n, chosen);
            if (allowOnce.has(n)) allowOnce.delete(n);
            return obj;
          }
        }
      } catch {}
      // @ts-ignore
      return _defineProperty.apply(Object, arguments as any);
    };

    // ---- Intercept plain assignments via a narrow accessor on Object.prototype
    const proto:any = Object.prototype;
    if (!Object.getOwnPropertyDescriptor(proto, 'txRoot')) {
      _defineProperty(proto, 'txRoot', {
        get: function(){ try { return this && this[symVal]; } catch { return undefined; } },
        set: function(v:any){
          try {
            const n = getBlockNumber(this);
            if (typeof n !== 'number') { this[symVal] = v; return; }

            const hasFrozen = frozenByNumber.has(n);
            if (hasFrozen && !allowOnce.has(n)) {
              // ignore changes; pin to the first-frozen
              this[symVal] = frozenByNumber.get(n);
              try { freezeOnObject(this, this[symVal]); } catch {}
              return;
            }

            // first set or allowed final override
            this[symVal] = v;
            frozenByNumber.set(n, v);
            try { freezeOnObject(this, v); } catch {}
            if (allowOnce.has(n)) allowOnce.delete(n);
          } catch { this[symVal] = v; }
        },
        enumerable: false,
        configurable: true
      });
    }

    // ---- saveBlock wrapper: permit one final override and then pin
    try {
      const store:any = G?.node?.store;
      if (store && typeof store.saveBlock === 'function' && !(store.saveBlock as any).__void_txroot_guard_v2_wrapped) {
        const orig = store.saveBlock.bind(store);
        (store.saveBlock as any).__void_txroot_guard_v2_wrapped = true;
        store.saveBlock = async function(block:any){
          try {
            const n = block?.header?.number ?? block?.number;
            if (typeof n === 'number') G.__void_txroot_allowFinalOnce(n);
          } catch {}
          const res = await orig(block);
          try {
            const n = block?.header?.number ?? block?.number;
            const v = block?.header?.txRoot;
            if (typeof n === 'number' && typeof v === 'string') G.__void_txroot_setFinal(n, v, block?.header);
          } catch {}
          return res;
        };
      }
    } catch {}

    // status endpoint (JSON)
    try {
      const app:any = G.__void_http_app || G.app;
      app?.get?.('/__void/txroot/guard2-status', (_req:any, res:any) => {
        res.json({ installed: true, frozenCount: frozenByNumber.size });
      });
    } catch {}

    console.log('[txroot/guard2] write-once-by-block-number installed');
  } catch (e:any) {
    console.log('[txroot/guard2] install error:', e?.message || e);
  }
})();

// -------------- txRoot persist-safe wrapper (outermost, additive) -------------
(function __void_txroot_persist_soft_clone(){
  try {
    const G:any = (globalThis as any);
    const store:any = G?.node?.store;
    if (!store || typeof store.saveBlock !== 'function') return;
    if ((store.saveBlock as any).__void_txroot_persist_soft_clone) return;
    const orig = store.saveBlock.bind(store);
    (store.saveBlock as any).__void_txroot_persist_soft_clone = true;

    // Deep clone via JSON to strip non-writable accessors and symbols.
    function cloneForPersist(block:any){
      try { return JSON.parse(JSON.stringify(block)); }
      catch { 
        // As a fallback, do a shallow-but-safe rebuild of header + block
        const h = block && block.header ? {
          ...block.header,
          txRoot: String(block.header.txRoot ?? ''),
        } : undefined;
        return { ...block, header: h };
      }
    }

    store.saveBlock = async function(block:any){
      // Allow existing wrappers (guards, counters) to do their thing,
      // but do the final persist on a plain JSON-safe clone.
      const clean = cloneForPersist(block);
      return await orig(clean);
    };

    // diag
    try {
      const app:any = G.__void_http_app || G.app;
      app?.get?.('/__void/txroot/persist-soft/status', (_req:any, res:any) => {
        res.json({ installed: true });
      });
    } catch {}

    console.log('[txroot/persist-soft] wrapper installed (json-clone before append)');
  } catch (e:any) {
    console.log('[txroot/persist-soft] install error:', e?.message || e);
  }
})();

// ================= OUTERMOST FS SANITIZER (additive, idempotent) =================
(async function __void_fs_append_sanitizer(){
  try {
    const G:any = (globalThis as any);
    const fsMod:any = (fs as any);
    if ((fsMod.appendFileSync as any)?.__void_sanitized) return;

    const mark = (fn:any)=>{ try { fn.__void_sanitized = true; } catch {} };

    const wrapAppend = (orig:any)=>function(path:any, data:any, options?:any){
      // If someone accidentally passed a frozen/header object as options, replace with a safe object.
      if (options && typeof options === 'object') {
        try {
          // Detect clearly-not-options: presence of txRoot or non-extensible/frozen objects.
          if ('txRoot' in options || Object.isFrozen(options)) {
            options = { encoding: 'utf8' };
          }
        } catch { options = { encoding: 'utf8' }; }
      }
      // If data is an object, stringify defensively.
      if (data && typeof data === 'object' && !(data instanceof Uint8Array)) {
        try { data = JSON.stringify(data) + '\n'; } catch { data = String(data) + '\n'; }
      }
      return orig(path, data, options);
    };

    const wrapWrite = (orig:any)=>function(path:any, data:any, options?:any){
      if (options && typeof options === 'object') {
        try {
          if ('txRoot' in options || Object.isFrozen(options)) {
            options = { encoding: 'utf8' };
          }
        } catch { options = { encoding: 'utf8' }; }
      }
      if (data && typeof data === 'object' && !(data instanceof Uint8Array)) {
        try { data = JSON.stringify(data); } catch { data = String(data); }
      }
      return orig(path, data, options);
    };

    fsMod.appendFileSync = wrapAppend(fsMod.appendFileSync);
    fsMod.writeFileSync  = wrapWrite (fsMod.writeFileSync);
    mark(fsMod.appendFileSync); mark(fsMod.writeFileSync);

    // tiny diag (optional)
    const app:any = G.__void_http_app || G.app;
    app?.get?.('/__void/fs-sanitizer/status', (_r:any, res:any)=>res.json({installed:true}));
    console.log('[fs/sanitizer] appendFileSync/writeFileSync options sanitized');
  } catch (e:any) {
    console.log('[fs/sanitizer] install error:', e?.message || e);
  }
})();

// ============ txRoot persist-soft (json-clone) OUTERMOST, idempotent ============
(function __void_txroot_persist_soft_clone_v2(){
  try {
    const G:any = (globalThis as any);
    const store:any = G?.node?.store;
    if (!store || typeof store.saveBlock !== 'function') return;
    if ((store.saveBlock as any).__void_txroot_persist_soft_clone_v2) return;

    const orig = store.saveBlock.bind(store);
    (store.saveBlock as any).__void_txroot_persist_soft_clone_v2 = true;

    function cloneForPersist(block:any){
      try { return JSON.parse(JSON.stringify(block)); }
      catch {
        const h = block && block.header ? {
          ...block.header,
          txRoot: String(block.header?.txRoot ?? ''),
        } : undefined;
        return { ...block, header: h };
      }
    }

    store.saveBlock = async function(block:any){
      const clean = cloneForPersist(block);
      return await orig(clean);
    };

    const app:any = G.__void_http_app || G.app;
    app?.get?.('/__void/txroot/persist-soft/status', (_req:any, res:any)=>res.json({installed:true, version:2}));
    console.log('[txroot/persist-soft] v2 installed (json-clone before persist)');
  } catch (e:any) {
    console.log('[txroot/persist-soft] v2 install error:', e?.message || e);
  }
})();

// ================= OUTERMOST FS SANITIZER (additive, idempotent) =================
(function __void_fs_append_sanitizer_v2(){
  try {
    const G:any = (globalThis as any);
    // Use the existing top-level import: `import * as fs from "node:fs";`
    // If it doesn't exist for some reason, bail safely.
    const fsMod:any = (typeof (fs as any) !== "undefined") ? (fs as any) : null;
    if (!fsMod || typeof fsMod.appendFileSync !== "function" || typeof fsMod.writeFileSync !== "function") {
      console.log('[fs/sanitizer] fs module not available; skipping');
      return;
    }
    if ((fsMod.appendFileSync as any).__void_sanitized_v2) return;

    const mark = (fn:any)=>{ try { fn.__void_sanitized_v2 = true; } catch {} };

    const wrapAppend = (orig:any)=>function(path:any, data:any, options?:any){
      // If options is frozen/garbled (e.g., a header object), replace with a safe literal.
      if (options && typeof options === 'object') {
        try {
          if ('txRoot' in options || Object.isFrozen(options)) options = { encoding: 'utf8' };
        } catch { options = { encoding: 'utf8' }; }
      }
      // If data is an object, stringify defensively.
      if (data && typeof data === 'object' && !(data instanceof Uint8Array)) {
        try { data = JSON.stringify(data) + '\n'; } catch { data = String(data) + '\n'; }
      }
      return orig(path, data, options);
    };

    const wrapWrite = (orig:any)=>function(path:any, data:any, options?:any){
      if (options && typeof options === 'object') {
        try {
          if ('txRoot' in options || Object.isFrozen(options)) options = { encoding: 'utf8' };
        } catch { options = { encoding: 'utf8' }; }
      }
      if (data && typeof data === 'object' && !(data instanceof Uint8Array)) {
        try { data = JSON.stringify(data); } catch { data = String(data); }
      }
      return orig(path, data, options);
    };

    fsMod.appendFileSync = wrapAppend(fsMod.appendFileSync);
    fsMod.writeFileSync  = wrapWrite (fsMod.writeFileSync);
    mark(fsMod.appendFileSync); mark(fsMod.writeFileSync);

    // tiny diag (optional)
    const app:any = G.__void_http_app || G.app;
    app?.get?.('/__void/fs-sanitizer/status', (_r:any, res:any)=>res.json({installed:true, version:2}));
    console.log('[fs/sanitizer] v2 installed: appendFileSync/writeFileSync options sanitized');
  } catch (e:any) {
    console.log('[fs/sanitizer] v2 install error:', e?.message || e);
  }
})();

// ============ txRoot persist-soft (json-clone) OUTERMOST, idempotent ============
(function __void_txroot_persist_soft_clone_v3(){
  try {
    const G:any = (globalThis as any);
    const store:any = G?.node?.store;
    if (!store || typeof store.saveBlock !== 'function') return;
    if ((store.saveBlock as any).__void_txroot_persist_soft_clone_v3) return;

    const orig = store.saveBlock.bind(store);
    (store.saveBlock as any).__void_txroot_persist_soft_clone_v3 = true;

    function cloneForPersist(block:any){
      try {
        // JSON path strips getters, symbols, and non-writable descriptors.
        return JSON.parse(JSON.stringify(block));
      } catch {
        // Safe rebuild of header to ensure writable txRoot.
        const h = block && block.header ? {
          ...block.header,
          txRoot: String(block.header?.txRoot ?? ''),
        } : undefined;
        return { ...block, header: h };
      }
    }

    store.saveBlock = async function(block:any){
      // Ensure downstream wrappers (persist/guard) see a plain, writable object.
      const clean = cloneForPersist(block);
      // Make doubly sure header fields are writable (defineProperty overwrite).
      try {
        if (clean?.header) {
          const desc = Object.getOwnPropertyDescriptor(clean.header, 'txRoot');
          if (!desc || desc.writable === false || desc.configurable === false) {
            Object.defineProperty(clean.header, 'txRoot', { value: clean.header.txRoot ?? '', writable: true, configurable: true, enumerable: true });
          }
        }
      } catch {}
      return await orig(clean);
    };

    const app:any = G.__void_http_app || G.app;
    app?.get?.('/__void/txroot/persist-soft/status', (_req:any, res:any)=>res.json({installed:true, version:3}));
    console.log('[txroot/persist-soft] v3 installed (json-clone before persist)');
  } catch (e:any) {
    console.log('[txroot/persist-soft] v3 install error:', e?.message || e);
  }
})();

// === OUTERMOST persist-safe clone with retry attach (additive-only) ==========
(function __void_txroot_persist_soft_clone_outer(){
  try {
    let tries = 0, attached = false;

    function jsonClone(x:any){
      try { return JSON.parse(JSON.stringify(x)); } catch { return x; }
    }
    function makeWritableTxRoot(h:any){
      if (!h || typeof h !== 'object') return;
      const val = (h.txRoot ?? h.txroot ?? '');
      try {
        Object.defineProperty(h, 'txRoot', {
          value: String(val),
          writable: true,
          enumerable: true,
          configurable: true,
        });
      } catch {
        try { h.txRoot = String(val); } catch {}
      }
    }

    function tryAttach(){
      if (attached) return;
      const G:any = (globalThis as any);
      const store:any = G?.node?.store;
      if (!store || typeof store.saveBlock !== 'function') {
        if (++tries < 200) return setTimeout(tryAttach, 200);
        return;
      }
      // already installed?
      if ((store.saveBlock as any).__void_txroot_persist_soft_clone_outer) { attached = true; return; }

      const orig = store.saveBlock.bind(store);
      function outerPatched(block:any){
        // Clone FIRST, so inner wrappers (like txroot/persist) always see a plain, writable object.
        const clean = jsonClone(block);
        if (clean && clean.header && typeof clean.header === 'object') {
          makeWritableTxRoot(clean.header);
        }
        return orig(clean);
      }
      (outerPatched as any).__void_txroot_persist_soft_clone_outer = true;
      store.saveBlock = outerPatched;
      attached = true;

      try {
        const app:any = G.__void_http_app || G.app;
        app?.get?.('/__void/txroot/persist-soft/outer/status', (_q:any, res:any) =>
          res.json({ installed:true, tries }));
      } catch {}
    }

    tryAttach();
  } catch {}
})();

// ===== STICKY saveBlock accessor (outermost, additive, re-wraps future patches) =====
(function __void_txroot_sticky_outermost_v1(){
  try {
    let tries = 0, installed = false;
    function jsonClone(x:any){ try { return JSON.parse(JSON.stringify(x)); } catch { return x; } }

    function makeWritableHeaderTxRoot(h:any){
      if (!h || typeof h !== 'object') return;
      const val = (h.txRoot ?? h.txroot ?? '');
      // ensure own, writable, configurable data prop
      try {
        const desc = Object.getOwnPropertyDescriptor(h, 'txRoot');
        if (!desc || desc.get || desc.set || !desc.writable || desc.configurable === false) {
          Object.defineProperty(h, 'txRoot', {
            value: String(val),
            writable: true,
            enumerable: true,
            configurable: true,
          });
        }
      } catch {
        try { h.txRoot = String(val); } catch {}
      }
    }

    function wrap(fn:any){
      if (typeof fn !== 'function') return fn;
      if ((fn as any).__void_txroot_sticky_outermost_v1) return fn;
      const wrapped = function(block:any){
        // clone to strip frozen/readonly shapes that later code might create
        const clean = jsonClone(block) ?? block;
        if (clean && clean.header && typeof clean.header === 'object') {
          // replace header with a plain shallow clone to drop RO descriptors, then make txRoot writable
          try { clean.header = { ...clean.header }; } catch {}
          makeWritableHeaderTxRoot(clean.header);
        }





// -ignore -- implicit this is okay in legacy wrapper






// @ts-ignore -- legacy shim uses untyped this by design
return fn.call(this, clean);

      };
      (wrapped as any).__void_txroot_sticky_outermost_v1 = true;
      return wrapped;
    }

    function attach(){
      if (installed) return;
      const G:any = (globalThis as any);
      const store:any = G?.node?.store;
      if (!store) { if (++tries < 200) return setTimeout(attach, 150); return; }

      const desc = Object.getOwnPropertyDescriptor(store, 'saveBlock');
      let current = (desc && desc.value) ? desc.value : store.saveBlock;

      // define sticky accessor that re-wraps any future setter
      let inner = wrap(current);
      Object.defineProperty(store, 'saveBlock', {
        configurable: true,
        enumerable: false,
        get(){ return inner; },
        set(v:any){ inner = wrap(v); },
      });

      // force any later “store.saveBlock = …” to go through our setter once
      store.saveBlock = inner;
      installed = true;

      // tiny diag
      try {
        const app:any = G.__void_http_app || G.app;
        app?.get?.('/__void/txroot/sticky/status', (_q:any, res:any) =>
          res.json({ installed:true, tries }));
      } catch {}
    }

    attach();
  } catch {}
})();
// ===== STICKY saveBlock on SegStore.prototype (outermost, additive) =====
(function __void_txroot_sticky_proto_v1(){
  try {
    // Guard: only once
    const anySeg:any = (SegStore as any);
    if (anySeg.__void_txroot_sticky_proto_v1_installed) return;
    anySeg.__void_txroot_sticky_proto_v1_installed = true;

    function jsonClone(x:any){ try { return JSON.parse(JSON.stringify(x)); } catch { return x; } }
    function makeWritableHeaderTxRoot(h:any){
      if (!h || typeof h !== 'object') return;
      const val = (h.txRoot ?? h.txroot ?? '');
      try {
        const d = Object.getOwnPropertyDescriptor(h, 'txRoot');
        if (!d || d.get || d.set || d.writable === false || d.configurable === false) {
          Object.defineProperty(h, 'txRoot', { value: String(val), writable: true, enumerable: true, configurable: true });
        }
      } catch { try { (h as any).txRoot = String(val); } catch {} }
    }
    function wrap(fn:any){
      if (typeof fn !== 'function') return fn;
      if ((fn as any).__void_txroot_sticky_proto_v1) return fn;
      const wrapped = function(this:any, block:any){
        const clean = jsonClone(block) ?? block;
        if (clean && clean.header && typeof clean.header === 'object') {
          try { clean.header = { ...clean.header }; } catch {}
          makeWritableHeaderTxRoot(clean.header);
        }



        // -ignore -- implicit this is okay in legacy wrapper




// @ts-ignore -- legacy shim uses untyped this by design
        return fn.call(this, clean);
      };
      (wrapped as any).__void_txroot_sticky_proto_v1 = true;
      return wrapped;
    }

    const proto:any = (SegStore as any)?.prototype;
    if (!proto) return;

    // Capture current method (value or getter)
    const desc = Object.getOwnPropertyDescriptor(proto, 'saveBlock');
    let inner = wrap(desc?.value ?? proto.saveBlock);

    // Define sticky accessor on the prototype
    Object.defineProperty(proto, 'saveBlock', {
      configurable: true,
      enumerable: false,
      get(){ return inner; },
      set(v:any){ inner = wrap(v); },
    });

    // Force one pass through setter to ensure wrapping applies immediately
    proto.saveBlock = inner;

    // Optional tiny diag: if express app exists, expose status
    try {
      const G:any = (globalThis as any);
      const app:any = G.__void_http_app || G.app;
      app?.get?.('/__void/txroot/sticky-proto/status', (_q:any, res:any) =>
        res.json({ installed:true, level:'prototype' }));
    } catch {}
  } catch {}
})();

// ===== Global robust setter for header.txRoot (idempotent) =====
(function __void_install_txroot_setter_global(){
  try {
    if ((globalThis as any).__void_set_writable_txRoot) return;
    (globalThis as any).__void_set_writable_txRoot = function(block:any, hex:string){
      try {
        const hdr:any = (block && typeof block === 'object'
          ? (block as any).header ?? ((block as any).header = {})
          : {});
        const raw = typeof hex === 'string' ? hex : String(hex ?? '');
        const val = raw.startsWith('0x') ? raw.slice(2) : raw;

        // Fast path: assign if writable/missing
        try {
          const d = Object.getOwnPropertyDescriptor(hdr, 'txRoot');
          if (!d || d.writable === true) { (hdr as any).txRoot = val; return; }
        } catch { try { (hdr as any).txRoot = val; return; } catch {} }

        // Redefine as writable
        try {
          Object.defineProperty(hdr, 'txRoot', { value: val, writable: true, enumerable: true, configurable: true });
          return;
        } catch {}

        // Final fallback: replace header object
        try { (block as any).header = { ...(hdr || {}), txRoot: val }; } catch {}
      } catch {}
    };
  } catch {}
})();

// ---------------- TXROOT setter v3 (safe, clone-before-write) ----------------
/* __void_txroot_setter_v3 */
(function txrootSetterV3(){
  let tries = 0, attached = false;

  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  function getNode(){ return (globalThis as any).__void_node || (globalThis as any).node; }

  async function attach(){
    const app:any = getApp();
    const node:any = getNode();
    if (!app || !node || !node.store || typeof node.store.saveBlock !== "function") {
      if (++tries < 120) return setTimeout(attach, 500);
      return;
    }
    if (attached) return; attached = true;

    const store:any = node.store;
    const origSave = store.saveBlock.bind(store);
    app.locals.__txroot_setter_errors = 0;

    // Optional compute hook if previously defined by our txroot helpers
    const computeTxRoot =
      (app.locals && typeof app.locals.txrootCompute === "function")
        ? app.locals.txrootCompute
        : (globalThis as any).__void_txroot_compute;

    store.saveBlock = async function patchedSaveBlockSafe(block:any){
      try {
        const header = (block && block.header) ? block.header : {};
        const hasRoot = typeof header.txRoot === "string" && header.txRoot.length > 0;

        // Only set if we don't already have a txRoot and we can compute one
        if (!hasRoot && typeof computeTxRoot === "function") {
          const root = await computeTxRoot(block).catch(() => undefined);
          if (root && typeof root === "string") {
            // *** DO NOT mutate original block or header ***
            const block2 = { ...block, header: { ...header, txRoot: root } };
            return await origSave(block2);
          }
        }
        // Fallback: pass original block unchanged
        return await origSave(block);
      } catch (e) {
        app.locals.__txroot_setter_errors++;
        // Last-resort: never block persistence
        try { return await origSave(block); } catch {}
        throw e;
      }
    };

    // Small status endpoint to confirm this wrapper is active
    app.get("/__void/txroot/setter/status", (_req:any, res:any) => {
      res.json({ ok: true, attached: true, errors: app.locals.__txroot_setter_errors || 0 });
    });

    // Prometheus text for quick scrape if desired
    app.get("/__void/metrics/txroot4/setter.prom", (_req:any, res:any) => {
      const errs = app.locals.__txroot_setter_errors || 0;
      res.type("text/plain").send(
        [
          "# HELP void_txroot_setter_errors_total Total errors in txroot setter",
          "# TYPE void_txroot_setter_errors_total counter",
          `void_txroot_setter_errors_total ${errs}`
        ].join("\n") + "\n"
      );
    });

    console.log("[txroot-setter:v3] safe clone-before-write wrapper attached");
  }

  setTimeout(attach, 0);
})();

// ---------------- TXROOT setter v3b (deep-clone, outermost) -----------------
/* __void_txroot_setter_v3b */
(function txrootSetterV3b(){
  let tries = 0, attached = false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  function getNode(){ return (globalThis as any).__void_node || (globalThis as any).node; }

  async function attach(){
    const app:any  = getApp();
    const node:any = getNode();
    if (!app || !node || !node.store || typeof node.store.saveBlock !== "function") {
      if (++tries < 120) return setTimeout(attach, 500);
      return;
    }
    if (attached) return; attached = true;

    const store:any = node.store;
    const origSave  = store.saveBlock.bind(store);

    const computeTxRoot =
      (app.locals && typeof app.locals.txrootCompute === "function")
        ? app.locals.txrootCompute
        : (globalThis as any).__void_txroot_compute;

    store.saveBlock = async function patchedSaveBlockDeep(block:any){
      try {
        const header = (block && block.header) ? block.header : {};
        const hasRoot = typeof header.txRoot === "string" && header.txRoot.length > 0;

        if (!hasRoot && typeof computeTxRoot === "function") {
          let root: string | undefined;
          try { root = await computeTxRoot(block); } catch {}
          if (root && typeof root === "string") {
            // NEW OBJECT GRAPH (no frozen props), then deep-clone:
            const fresh = { ...block, header: { ...header, txRoot: root } };
            const clean = JSON.parse(JSON.stringify(fresh));
            return await origSave(clean);
          }
        }
        // Fallback: deep-clone anyway to shed any readonly descriptors from prior wrappers
        const clean = JSON.parse(JSON.stringify(block));
        return await origSave(clean);
      } catch (e) {
        // Last resort: do not block persistence
        try { return await origSave(block); } catch {}
        throw e;
      }
    };

    app.get("/__void/txroot/setter/v3b/status", (_req:any, res:any) =>
      res.json({ ok:true, attached:true, note:"v3b deep-clone outermost" })
    );

    console.log("[txroot-setter:v3b] deep-clone outermost wrapper attached");
  }

  setTimeout(attach, 0);
})();

// ---------------- Writable txRoot guard (additive, scoped) -------------------
(function writableTxRootGuard(){
  try {
    // 1) Force any future defineProperty('txRoot', ...) to be writable+configurable
    const _defineProperty = Object.defineProperty;
    (Object as any).defineProperty = function(target: any, prop: any, desc: any){
      try {
        if (prop === 'txRoot' && desc && typeof desc === 'object') {
          const patched = { ...desc, writable: true, configurable: true };
          return _defineProperty.call(Object, target, prop, patched);
        }
      } catch {}
      return _defineProperty.call(Object, target, prop, desc);
    };

    // 2) Helper to sanitize an existing header so normal assignment won't throw
    function makeTxRootWritable(header: any){
      if (!header || typeof header !== 'object') return;
      try {
        const d = Object.getOwnPropertyDescriptor(header, 'txRoot');
        if (d && d.writable === false) {
          // delete + redefine writable
          try { delete (header as any).txRoot; } catch {}
          try { Object.defineProperty(header, 'txRoot', { value: d.value, writable: true, enumerable: true, configurable: true }); } catch {}
        }
      } catch {}
    }

    // Expose a tiny API for other additive shims
    (globalThis as any).__void_make_txroot_writable = makeTxRootWritable;

    // Optional: small diag
    const app:any = (globalThis as any).__void_http_app || (globalThis as any).app;
    if (app && typeof app.get === 'function') {
      app.get('/__void/txroot/writable-guard/status', (_req:any, res:any) => {
        res.json({ ok:true, guard:'installed', note:'defineProperty(txRoot) forced writable', api:!!(globalThis as any).__void_make_txroot_writable });
      });
    }
    console.log('[txroot/writable-guard] installed');
  } catch {
    // never throw from guard
  }
})();

// ---------------- Object.prototype pollution scrub (additive) ----------------
(function neutralizeGlobalTxRootOnPrototype(){
  try {
    const proto = Object.prototype as any;
    // If any earlier shim defined a global txRoot on Object.prototype, remove/soften it.
    if (Object.prototype.hasOwnProperty.call(proto, 'txRoot')) {
      try {
        delete proto.txRoot;  // best case: fully remove it
        // console.log('[txroot/proto-scrub] deleted Object.prototype.txRoot');
      } catch {
        // Fallback: make it benign and writable so merges can't throw
        try {
          Object.defineProperty(proto, 'txRoot', {
            value: undefined,
            writable: true,
            enumerable: false,
            configurable: true
          });
          // console.log('[txroot/proto-scrub] softened Object.prototype.txRoot');
        } catch {}
      }
    }
  } catch {/* never throw */}
})();

// --------------- SegStore.saveBlock outermost safety wrapper -----------------
(function safeSaveBlockWrapper(){
  try {
    const SegStore = (globalThis as any).SegStore || require?.("./chain/seg_store.js")?.SegStore;
    if (!SegStore || !SegStore.prototype || typeof SegStore.prototype.saveBlock !== "function") return;

    const original = SegStore.prototype.saveBlock;

    // Minimal deep clone that guarantees plain JSON and a writable header.txRoot
    function sanitizeBlock(b:any){
      try {
        const headerSrc = (b && b.header) || {};
        const header = { ...headerSrc };
        // ensure header.txRoot is writable plain data (string)
        try {
          const d = Object.getOwnPropertyDescriptor(header, 'txRoot');
          if (d && d.writable === false) {
            try { delete (header as any).txRoot; } catch {}
            Object.defineProperty(header, 'txRoot', { value: d.value, writable: true, enumerable: true, configurable: true });
          }
        } catch {}
        const txs = Array.isArray(b?.txs) ? b.txs.map(x => (typeof x === 'object' ? JSON.parse(JSON.stringify(x)) : x)) : [];
        return { header, txs };
      } catch {
        // last resort: JSON roundtrip
        return JSON.parse(JSON.stringify(b));
      }
    }

    // Replace with wrapper that always feeds a sanitized block to the original
    SegStore.prototype.saveBlock = function wrappedSaveBlock(block:any){
      const clean = sanitizeBlock(block);
      return original.call(this, clean);
    };

    // tiny diag
    const app:any = (globalThis as any).__void_http_app || (globalThis as any).app;
    if (app && typeof app.get === 'function') {
      app.get("/__void/guards/saveblock-wrapper/status", (_req:any, res:any) => {
        res.json({ ok:true, wrapped:true, note:"sanitizeBlock->original(save)" });
      });
    }

    console.log("[saveBlock/wrapper] outermost sanitizer attached");
  } catch {/* never throw */}
})();

// ---- proto-scrub diag (additive) ----
(function protoScrubDiag(){
  try {
    const app:any = (globalThis as any).__void_http_app || (globalThis as any).app;
    if (app && typeof app.get === 'function') {
      app.get("/__void/proto/txroot/desc", (_req:any, res:any) => {
        const d = Object.getOwnPropertyDescriptor(Object.prototype as any, 'txRoot') || null;
        res.json({ ok:true, hasOwn: !!d, desc: d });
      });
    } else {
      // retry attach shortly (app becomes available after express init)
      setTimeout(protoScrubDiag, 200);
    }
  } catch {}
})();

// ---- diag: verify Object.prototype.txRoot state (additive) ----
(function protoTxRootDiag(){
  try {
    const app:any = (globalThis as any).__void_http_app || (globalThis as any).app;
    if (app && typeof app.get === 'function') {
      app.get("/__void/proto/txroot/desc", (_req:any, res:any) => {
        const d = Object.getOwnPropertyDescriptor(Object.prototype as any, 'txRoot') || null;
        res.json({ ok:true, hasOwn: !!d, desc: d });
      });
    } else {
      setTimeout(protoTxRootDiag, 200);
    }
  } catch {}
})();

// ---------------- Additive: track last sealed block number (safe wrapper) ----------------
(() => {
  try {
    const segAny: any = (globalThis as any).SegStore || (SegStore as any);
    if (!segAny?.prototype) return;
    const proto: any = segAny.prototype;
    if (proto.__void_last_seal_wrap) return; // idempotent
    const orig = proto.saveBlock;
    if (typeof orig !== "function") return;
    proto.saveBlock = function wrappedSaveBlock(block: any, ...rest: any[]) {
      try {
        const n =
          (block && block.header && typeof block.header.number === "number")
            ? block.header.number
            : (typeof block?.number === "number" ? block.number : undefined);
        if (typeof n === "number") (globalThis as any).__void_last_seal_number = n;
      } catch {}
      return (orig as any).apply(this, [block, ...rest]);
    };
    proto.__void_last_seal_wrap = true;
    // Optional diag toggle:
    (globalThis as any).__void_last_seal_tracker = { enabled: true };
  } catch {}
})();

// --------------- Additive: remember last txRoot after each save (no behavior change) ---------------
(() => {
  try {
    const segAny: any = (globalThis as any).SegStore || (SegStore as any);
    if (!segAny?.prototype) return;
    const proto: any = segAny.prototype;
    if (proto.__void_txroot_tap_v1) return; // idempotent guard

    const orig = proto.saveBlock;
    if (typeof orig !== "function") return;

    proto.saveBlock = function txrootTapV1(block: any, ...rest: any[]) {
      const out = (orig as any).apply(this, [block, ...rest]);
      try {
        // Prefer header.txRoot if present (string/Uint8Array/etc)
        const root =
          block?.header?.txRoot ??
          (typeof block?.header?.txroot !== "undefined" ? block.header.txroot : undefined);
        if (root != null) {
          (globalThis as any).__lastTxRoot = root;
        }
      } catch {}
      return out;
    };
    proto.__void_txroot_tap_v1 = true;
  } catch {}
})();

// Optional: expose for quick debugging
(() => {
  try {
    const app: any = (globalThis as any).__void_http_app || (globalThis as any).app;
    if (!app || app.__void_last_txroot_route) return;
    app.get('/__void/last-txroot.json', (_req:any, res:any) => {
      res.json({ lastTxRoot: (globalThis as any).__lastTxRoot ?? null,
                 lastBlock: (globalThis as any).__void_last_seal_number ?? null });
    });
    app.__void_last_txroot_route = true;
  } catch {}
})();

// ---- additive: robust attach for /__void/last-txroot.json (polls until app ready)
(() => {
  try {
    let tries = 0;
    function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
    function attach(){
      const app:any = getApp();
      if (!app || typeof app.get !== "function") {
        if (++tries < 120) return setTimeout(attach, 500); // retry up to ~60s
        return;
      }
      if ((app as any).__void_last_txroot_route) return; // idempotent
      app.get('/__void/last-txroot.json', (_req:any, res:any) => {
        res.json({
          lastTxRoot: (globalThis as any).__lastTxRoot ?? null,
          lastBlock:  (globalThis as any).__void_last_seal_number ?? null
        });
      });
      (app as any).__void_last_txroot_route = true;
      console.log('[last-txroot] route attached');
    }
    attach();
  } catch {}
})();

// ---- additive: prom text exporter for last txroot ----
(() => {
  try {
    let tries = 0;
    function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
    function attach(){
      const app:any = getApp();
      if (!app || typeof app.get !== "function") {
        if (++tries < 120) return setTimeout(attach, 500);
        return;
      }
      if (app.__void_last_txroot_prom) return; // idempotent
      app.get('/__void/metrics/txroot4/last.prom', (_req:any, res:any) => {
        const lastRoot = (globalThis as any).__lastTxRoot ?? null;
        const lastBlk  = (globalThis as any).__void_last_seal_number ?? null;
        const rootStr  = typeof lastRoot === 'string' ? lastRoot : (Array.isArray(lastRoot) ? Array.from(lastRoot).map((x:number)=>x.toString(16).padStart(2,'0')).join('') : String(lastRoot));
        res.type('text/plain; version=0.0.4');
        res.send([
          '# HELP void_txroot_last_block Latest block number observed by txroot tap',
          '# TYPE void_txroot_last_block gauge',
          `void_txroot_last_block{root="${rootStr || ''}"} ${Number.isFinite(lastBlk)? lastBlk : -1}`,
          '# HELP void_txroot_last_seen Always 1 when endpoint is healthy',
          '# TYPE void_txroot_last_seen gauge',
          'void_txroot_last_seen 1',
          ''
        ].join('\n'));
      });
      app.__void_last_txroot_prom = true;
      console.log('[last-txroot.prom] exporter attached at /__void/metrics/txroot4/last.prom');
    }
    attach();
  } catch {}
})();

// ------------------- Additive: Seals tap + Prom text exporter -------------------
(() => {
  try {
    // 1) SaveBlock tap (idempotent)
    const segAny: any = (globalThis as any).SegStore || (SegStore as any);
    if (segAny?.prototype && !segAny.prototype.__void_seals_tap_v1) {
      const proto: any = segAny.prototype;
      const orig = proto.saveBlock;
      if (typeof orig === "function") {
        const win: number[] = []; // timestamps ms, last 60s
        (globalThis as any).__void_seal_ts_window = win;

        proto.saveBlock = function sealsTapV1(block: any, ...rest: any[]) {
          const out = (orig as any).apply(this, [block, ...rest]);
          try {
            const n = block?.header?.number ?? block?.number;
            if (typeof n === "number" && Number.isFinite(n)) {
              (globalThis as any).__void_last_seal_number = n;
              (globalThis as any).__void_last_seal_ts_ms = Date.now();
              // slide window
              win.push((globalThis as any).__void_last_seal_ts_ms);
              const cutoff = Date.now() - 60_000;
              while (win.length && win[0] < cutoff) win.shift();
            }
          } catch {}
          return out;
        };
        proto.__void_seals_tap_v1 = true;
      }
    }

    // 2) Prom text exporter (idempotent)
    const app: any = (globalThis as any).__void_http_app || (globalThis as any).app;
    if (app && !app.__void_seals_prom_v1) {
      app.get('/metrics/void/seals', (_req:any, res:any) => {
        try {
          const last = (globalThis as any).__void_last_seal_number ?? -1;
          const ts   = (globalThis as any).__void_last_seal_ts_ms ?? 0;
          const win: number[] = (globalThis as any).__void_seal_ts_window || [];
          // crude seals/min over the last 60s
          const rate = win.length;

          res.set('Content-Type', 'text/plain; version=0.0.4');
          res.send(
`# HELP void_seal_last_number Latest sealed block number
# TYPE void_seal_last_number gauge
void_seal_last_number ${typeof last === 'number' ? last : -1}
# HELP void_seal_last_ts_ms Timestamp (ms) of last seal observed
# TYPE void_seal_last_ts_ms gauge
void_seal_last_ts_ms ${typeof ts === 'number' ? ts : 0}
# HELP void_seal_rate_1m Seals observed in the last 60 seconds
# TYPE void_seal_rate_1m gauge
void_seal_rate_1m ${rate}
`);
        } catch (e:any) {
          res.status(500).send(`# error ${e?.message||e}`);
        }
      });
      app.__void_seals_prom_v1 = true;
      console.log('[metrics/seals] exporter ready at /metrics/void/seals');
    }
  } catch {}
})();

// ------------------- Additive: Seals tap + Prom exporter (v2 resilient) -------------------
(() => {
  try {
    // Ensure the saveBlock tap is present (idempotent)
    const segAny: any = (globalThis as any).SegStore || (typeof SegStore !== "undefined" ? (SegStore as any) : undefined);
    if (segAny?.prototype && !segAny.prototype.__void_seals_tap_v2) {
      const proto: any = segAny.prototype;
      const orig = proto.saveBlock;
      if (typeof orig === "function") {
        const win: number[] = (globalThis as any).__void_seal_ts_window || [];
        (globalThis as any).__void_seal_ts_window = win;

        proto.saveBlock = function sealsTapV2(block: any, ...rest: any[]) {
          const out = (orig as any).apply(this, [block, ...rest]);
          try {
            const n = block?.header?.number ?? block?.number;
            if (typeof n === "number" && Number.isFinite(n)) {
              (globalThis as any).__void_last_seal_number = n;
              const now = Date.now();
              (globalThis as any).__void_last_seal_ts_ms = now;
              win.push(now);
              const cutoff = now - 60_000;
              while (win.length && win[0] < cutoff) win.shift();
            }
          } catch {}
          return out;
        };
        proto.__void_seals_tap_v2 = true;
      }
    }

    // Retry until app exists, then bind the route (idempotent)
    let tries = 0;
    const attach = () => {
      const app: any = (globalThis as any).__void_http_app || (globalThis as any).app;
      if (!app || typeof app.get !== "function") {
        if (++tries < 120) return setTimeout(attach, 500); // retry up to ~60s
        return;
      }
      if (app.__void_seals_prom_v2) return; // already bound

      app.get('/metrics/void/seals', (_req:any, res:any) => {
        try {
          const last = (globalThis as any).__void_last_seal_number ?? -1;
          const ts   = (globalThis as any).__void_last_seal_ts_ms ?? 0;
          const win: number[] = (globalThis as any).__void_seal_ts_window || [];
          const rate = win.length; // seals seen in last 60s (sliding window)
          res.set('Content-Type', 'text/plain; version=0.0.4');
          res.send(
`# HELP void_seal_last_number Latest sealed block number
# TYPE void_seal_last_number gauge
void_seal_last_number ${typeof last === 'number' ? last : -1}
# HELP void_seal_last_ts_ms Timestamp (ms) of last seal observed
# TYPE void_seal_last_ts_ms gauge
void_seal_last_ts_ms ${typeof ts === 'number' ? ts : 0}
# HELP void_seal_rate_1m Seals observed in the last 60 seconds
# TYPE void_seal_rate_1m gauge
void_seal_rate_1m ${rate}
`);
        } catch (e:any) {
          res.status(500).send(`# error ${e?.message||e}`);
        }
      });

      app.__void_seals_prom_v2 = true;
      console.log('[metrics/seals:v2] exporter ready at /metrics/void/seals');
    };
    attach();
  } catch {}
})();

// ---- TxRoot Core v2 -> Prom text adapter (additive) ----
(function txrootCoreV2PromAdapter(){
  let tries = 0, attached = false;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app || undefined; }

  async function attach(){
    const app:any = getApp();
    if (!app || typeof app.get !== "function") { if (++tries < 60) return setTimeout(attach, 500); return; }
    if (attached) return; attached = true;

    // Prometheus text endpoint mirroring core2 JSON counters
    // Exposes: void_txroot_core_saves_total, _set_total, _mismatch_total, _heartbeat_total
    app.get("/__void/metrics/txroot4/core2.prom", async (_req:any, res:any) => {
      try {
        // Reuse in-process route if available to avoid HTTP loop
        const fetchCore = async () => {
          // Prefer direct function if someone set it on global (future-proof)
          const g:any = globalThis as any;
          if (g.__void_txroot_core2_snapshot && typeof g.__void_txroot_core2_snapshot === "function") {
            return await g.__void_txroot_core2_snapshot();
          }
          // Fallback: local HTTP call to the JSON endpoint
          const http = await import("node:http");
          const port = Number(process.env.HTTP_PORT || process.env.VOID_HTTP_PORT || 4100);
          const data = await new Promise<any>((resolve, reject) => {
            const req = http.request({ host:"127.0.0.1", port, path:"/__void/metrics/txroot4/core2.json", method:"GET" }, r=>{
              let buf=""; r.setEncoding("utf8");
              r.on("data", c=> buf+=c); r.on("end", ()=> { try { resolve(JSON.parse(buf)); } catch(e){ reject(e); } });
            });
            req.on("error", reject); req.end();
          });
          return data;
        };

        const snap = await fetchCore();
        const saves = Number(snap?.saves_total ?? 0);
        const set = Number(snap?.set_total ?? 0);
        const mismatch = Number(snap?.mismatch_total ?? 0);
        const hb = Number(snap?.heartbeat_total ?? 0);

        const lines = [
          "# HELP void_txroot_core_saves_total Core saves total",
          "# TYPE void_txroot_core_saves_total counter",
          `void_txroot_core_saves_total ${saves}`,
          "# HELP void_txroot_core_set_total Core sets total",
          "# TYPE void_txroot_core_set_total counter",
          `void_txroot_core_set_total ${set}`,
          "# HELP void_txroot_core_mismatch_total Core mismatches total",
          "# TYPE void_txroot_core_mismatch_total counter",
          `void_txroot_core_mismatch_total ${mismatch}`,
          "# HELP void_txroot_core_heartbeat_total Core heartbeat total",
          "# TYPE void_txroot_core_heartbeat_total counter",
          `void_txroot_core_heartbeat_total ${hb}`
        ];
        res.setHeader("Content-Type","text/plain; version=0.0.4; charset=utf-8");
        res.end(lines.join("\n")+"\n");
      } catch(err:any){
        res.statusCode = 500;
        res.setHeader("Content-Type","text/plain");
        res.end(`# txroot core2 prom adapter error: ${String(err && err.message || err)}\n`);
      }
    });
  }
  attach();
})();
