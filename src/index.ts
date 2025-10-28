import { registerDevRoutes } from "./http/dev_routes.js";
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
import { registerP2PRoutes } from "./http/p2p_routes.js";
import { registerIndexExtras } from "./http/routes/index_kidx_extras.js";
import { Metrics } from "./metrics.js";

/* ---------------------------- ENV BRIDGE ---------------------------- */
process.env.DATA_DIR = process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data";
process.env.HTTP_PORT = process.env.HTTP_PORT || process.env.VOID_HTTP_PORT || "4100";
process.env.P2P_PORT = process.env.P2P_PORT || process.env.VOID_P2P_PORT || "4700";

/* ------------------------------------------------------------------- */

/* ----------------------------- Config ------------------------------ */
function firstEnv(...names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (v !== undefined && v !== "") return v;
  }
}
function reqInt(names: string[], label: string): number {
  const raw = firstEnv(...names);
  if (raw === undefined) throw new Error(`Missing required env: ${label} (${names.join(" or ")})`);
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`Invalid integer for ${label}: ${raw}`);
  return n;
}
function reqStr(names: string[], label: string): string {
  const v = firstEnv(...names);
  if (!v) throw new Error(`Missing required env: ${label} (${names.join(" or ")})`);
  return v;
}

const DATA_DIR = reqStr(["VOID_DATA_DIR", "DATA_DIR"], "DATA_DIR");
const HTTP_PORT = reqInt(["VOID_HTTP_PORT", "HTTP_PORT"], "HTTP_PORT");
const P2P_PORT = reqInt(["VOID_P2P_PORT", "P2P_PORT"], "P2P_PORT");
const MAX_BLOB_MB = Number(firstEnv("MAX_BLOB_MB") ?? 8);
const PROTO_VER = 1;
const ALLOW_EMPTY_BLOCKS = firstEnv("ALLOW_EMPTY_BLOCKS") === "1";

// Accept both BOOTSTRAP and BOOTSTRAP_ADDRS; also merge loadEnv() later.
const BOOTSTRAP_RAW = (firstEnv("BOOTSTRAP_ADDRS", "BOOTSTRAP") || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Require a key file path; do not auto-generate
const KEY_PATH = path.resolve(reqStr(["NODE_PRIVKEY_PATH","KEY_FILE","VOID_NODE_KEY_A"], "node private key path"));

console.log("[void-node] config", { DATA_DIR, HTTP_PORT, P2P_PORT, KEY_PATH });

/* Optional legacy helper (safe to keep) */
const __apiSegStore = new SegStore(DATA_DIR, { segmentMaxBytes: 8 * 1024 * 1024, sparseEvery: 16 });

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
  await node.start();

  // If your Node still exposes an onSealed callback, wire it; otherwise we track via endpoints.
  if ("onSealed" in (node as any)) {
    (node as any).onSealed = (b: any, dt: number) => {
      metrics.inc("blocks_sealed", 1);
      (metrics.gauges as any).last_seal_ms = dt;
      if (Array.isArray(b?.txs)) {
        metrics.inc("tx_indexed", b.txs.length);
        metrics.inc("receipts_appended", b.txs.length);
      }
    };
  }

  const peersReg = new PeerRegistry();

  // Keep peer-registry in sync with HTTP announcements
  ;(node as any).onHttpAnnounce = ({ id, http }: any) => {
    try {
      if (!id) return;
      peersReg.upsert({ id, http, capabilities: ["blob", "tx", "block"] });
      (metrics.gauges as any).peers_known = peersReg.count();
      if (http && selfAdvert.httpBase && selfAdvert.p2pListen) {
        void upsertRemotePeer(http, node.id, selfAdvert.httpBase, selfAdvert.p2pListen);
      }
    } catch {}
  };

  // Subscribe to topics we actually use
  node.subscribe("void/hello");
  node.subscribe("void/tx");
  node.subscribe("void/blob.announce");
  node.subscribe("void/block");
  node.subscribe("void/http");

  /* ---------- bootstrap dialing ---------- */
  const env = loadEnv(); // may include BOOTSTRAP_ADDRS, ports, etc.
  const mergedBootstrap = new Set<string>([
    ...BOOTSTRAP_RAW,
    ...((env as any).BOOTSTRAP_ADDRS || []),
  ]);
  for (const a of mergedBootstrap) {
    try {
      node.connect(a);
    } catch {}
  }

  /* ----------------------------- HTTP ----------------------------- */
  const app = express();
app.get("/api/health", (_req:any,res:any)=>res.json({ok:true, ts:Date.now()}));
app.use(express.json()); // dev: body parser for /dev/emit-tx

  // --- minimal mempool-backed tx submit route (dev only) ---
  const MEMPOOL = path.join(process.env.DATA_DIR || "data", "mempool.jsonl");
  app.post("/tx/submit", async (req, res) => {
    try {
      const tx = req.body && typeof req.body === "object" ? req.body : null;
      if (!tx || typeof tx.data !== "string" || !tx.data.length)
        return res.status(400).json({ ok:false, error:"expected {data:string}" });
      await fs.promises.mkdir(path.dirname(MEMPOOL), { recursive: true });
      await fs.promises.appendFile(MEMPOOL, JSON.stringify({ data: tx.data, ts: Date.now() }) + "\n");
      return res.json({ ok:true });
    } catch (err: any) { return res.status(500).json({ ok:false, error: String(err?.message ?? err) }); }
  });

  app.use(express.json({ limit: "128mb" }));

  // Mount follower routes (needs metrics)
  registerFollowerRoutes(app, node, metrics);
  registerP2PRoutes(app as any, node as any);
  registerIndexExtras(app as any, node as any, metrics as any);


  const __kidxRebuildInFlight = new Set<string>();
  async function rebuildKidxOnce(p: string){
    if (__kidxRebuildInFlight.has(p)) return false;
    __kidxRebuildInFlight.add(p);
    try {
      metrics.inc("kidx_missing_rebuilds" as any, 1);
      await buildKidxForJsonl(p);
      console.log("[kidx] rebuilt-once", p);
      return true;
    } finally {
      __kidxRebuildInFlight.delete(p);
    }
  }

  /* ===================== MAINTENANCE ===================== */
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
      res.json(await (node as any).rebuildTxIndex());
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
      const shards = (node as any).txIndex.listShards();
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
    const shards = (node as any).txIndex.listShards().map((s: any) => {
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
      res.json((node as any).txIndex.gc(keepLast));
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
        const shard = (node as any).txIndex.shardForBlock(bn);
        await buildKidxForJsonl(shard.path);
        return res.json({
          ok: true,
          shard: { from: shard.from, to: shard.to },
          kidx: shard.path.replace(/\.jsonl$/, ".kidx"),
        });
      } else if (typeof hashParam === "string") {
        const hash = String(hashParam).toLowerCase();
        if (!/^[0-9a-f]{64}$/.test(hash)) return res.json({ ok: false, error: "bad hash" });
        const shards = (node as any).txIndex.listShards().sort((a: any, b: any) => b.from - a.from);
        for (const s of shards) {
          const kidxPath = s.path.replace(/\.jsonl$/, ".kidx");
          if (fs.existsSync(kidxPath)) {
            const hit = queryKidx(kidxPath, hash);
            if (hit.found) {
              await buildKidxForJsonl(s.path);
              return res.json({ ok: true, shard: { from: s.from, to: s.to }, kidx: kidxPath });
            }
            continue;
          }
          const r = (node as any).txIndex.lookupInShard(s.path, hash);
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

    // Walk shards newest→oldest, try kidx first, then JSONL
    const shards = node.txIndex.listShards().sort((a, b) => b.from - a.from);
    for (const s of shards) {
      const kidxPath = s.path.replace(/\.jsonl$/, ".kidx");
      if (fs.existsSync(kidxPath)) {
        const hit = queryKidx(kidxPath, hash);
        if (hit.found) {
          await buildKidxForJsonl(s.path);  // refresh
          return res.json({ ok: true, shard: { from: s.from, to: s.to }, kidx: kidxPath });
        }
      }
      const r = node.txIndex.lookupInShard(s.path, hash);
      if (r.found) {
        const kidx = s.path.replace(/\.jsonl$/, ".kidx");
        await buildKidxForJsonl(s.path);
        return res.json({ ok: true, shard: { from: s.from, to: s.to }, kidx });
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
      nodeId: (node as any).id,
      http: HTTP_PORT,
      p2p: P2P_PORT,
      peers: [...(node as any).peers.keys()].filter((k: string) => !k.startsWith("?-")),
      listen: (node as any).listenAddrs,
    });
  });

  app.get(["/head", "/api/head"], (_req, res) => {
    res.json({ ok: true, head: (node as any).store.loadHeadNumber() });
  });

  app.get("/peers", (_req, res) => res.json({ ok: true, ...(node as any).peersSnapshot() }));

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
        await upsertRemotePeer(p.http, (node as any).id, selfAdvert.httpBase, selfAdvert.p2pListen);
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
    const n = (node as any).store.loadHeadNumber();
    const b = (node as any).store.loadBlock(n);
    if (!b) return res.json({ ok: true, head: -1 });
    res.json({ ok: true, head: n, hash: blockHash(b) });
  });

  app.get("/blocks/get/:number", (req, res) => {
    const n = Number(req.params.number);
    if (!Number.isFinite(n) || n < 0) return res.status(400).json({ ok: false, error: "bad number" });
    const b = (node as any).store.loadBlock(n);
    if (!b) return res.status(404).json({ ok: false, error: "not found" });
    res.json(b);
  });

  app.get("/blocks/range", (req, res) => {
    const from = Number(req.query.from ?? 0);
    const to = Number(req.query.to ?? (node as any).store.loadHeadNumber());
    if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to < from) {
      return res.status(400).json({ ok: false, error: "bad range" });
    }
    try {
      const blocks: any[] = [];
      for (let i = from; i <= to; i++) {
        const b = (node as any).store.loadBlock(i);
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

        const existing = (node as any).store.loadBlock(n);
        const incomingHasTxs = Array.isArray(b?.txs) && b.txs.length > 0;
        const existingHasTxs = Array.isArray(existing?.txs) && existing.txs.length > 0;

        if (!existing) {
          (node as any).store.saveBlock(b);
          imported++;
          if (incomingHasTxs) {
            const refs = b.txs.map((tx: any, i: number) => ({ h: tx.hash.toLowerCase(), n: b.number, o: i }));
            ;(node as any).txIndex.putMany(refs);
            metrics.inc("tx_indexed", b.txs.length);
            const anyReceipts: any = (node as any).receipts;
            const recs = b.txs.map((tx: any, i: number) => ({
              h: tx.hash.toLowerCase(), n: b.number, o: i, ts: b.timestamp ?? Date.now(),
            }));
            if (typeof anyReceipts.appendMany === "function") await anyReceipts.appendMany(recs);
            else if (typeof anyReceipts.append === "function") for (const r2 of recs) await anyReceipts.append(r2);
            metrics.inc("receipts_appended", recs.length);
            const shard = (node as any).txIndex.shardForBlock(b.number);
            touched.add(shard.path);
          }
          continue;
        }

        if (!existingHasTxs && incomingHasTxs) {
          const merged = { ...existing, ...b, txs: b.txs };
          (node as any).store.saveBlock(merged);
          filled++;
          metrics.inc("blocks_filled", 1);
          const refs = b.txs.map((tx: any, i: number) => ({ h: tx.hash.toLowerCase(), n: b.number, o: i }));
          ;(node as any).txIndex.putMany(refs);
          metrics.inc("tx_indexed", b.txs.length);
          const anyReceipts: any = (node as any).receipts;
          const recs = b.txs.map((tx: any, i: number) => ({
            h: tx.hash.toLowerCase(), n: b.number, o: i, ts: b.timestamp ?? Date.now(),
          }));
          if (typeof anyReceipts.appendMany === "function") await anyReceipts.appendMany(recs);
          else if (typeof anyReceipts.append === "function") for (const r3 of recs) await anyReceipts.append(r3);
          metrics.inc("receipts_appended", recs.length);
          const shard = (node as any).txIndex.shardForBlock(b.number);
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
      const r = ( (node as any).stopProposer?.() ) ?? ({ ok: true, note: "no stopProposer(), noop" } as any);
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
      const mp = (((node as any).mempool?.peekAll?.()) ?? []);
      if (!allowEmptyOnce && !ALLOW_EMPTY_BLOCKS && mp.length === 0) {
        return res.json({ ok: false, error: "no txs in mempool (set allowEmpty=1 to force)" });
      }

      // Preferred: direct method if available
      if (typeof (node as any).sealBlock === "function") {
        const r = await (node as any).sealBlock({ allowEmptyOnce });
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
app.get("/tx/lookup", async (req, res) => {
  const hash = String(req.query.hash || "").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(hash)) return res.json({ ok: false, error: "bad hash" });

  const shards = node.txIndex.listShards().sort((a, b) => b.from - a.from);
  for (const s of shards) {
    const kidxPath = s.path.replace(/\.jsonl$/, ".kidx");

    // If we have a KIDX, try it first…
    if (fs.existsSync(kidxPath)) {
      const hit = queryKidx(kidxPath, hash);
      if (hit.found) {
        const blk = node.store.loadBlock(hit.n!);
        if (!blk) return res.json({ ok: false, error: "block not found (stale index?)" });
        const tx = (blk as any).txs?.[hit.o!];
        return res.json({ ok: true, found: true, block: hit.n, offset: hit.o, tx });
      }
      // …then fall back to scanning JSONL if KIDX misses (stale kidx case).
      const r2 = node.txIndex.lookupInShard(s.path, hash);
      if (r2.found) {
        const blk = node.store.loadBlock(r2.n);
        if (!blk) return res.json({ ok: false, error: "block not found (stale index?)" });
        const tx = (blk as any).txs?.[r2.o];
        // Opportunistic rebuild to refresh kidx for this shard.
        try { metrics.inc("kidx_stale_rebuilds" as any, 1);
        await rebuildKidxOnce(s.path); } catch {}
        return res.json({ ok: true, found: true, block: r2.n, offset: r2.o, tx });
      }
      continue;
    }

    // No KIDX present: scan JSONL
    const r = node.txIndex.lookupInShard(s.path, hash);
    if (r.found) {
      const blk = node.store.loadBlock(r.n);
      if (!blk) return res.json({ ok: false, error: "block not found (stale index?)" });
      const tx = (blk as any).txs?.[r.o];
      try { metrics.inc("kidx_missing_rebuilds" as any, 1); await rebuildKidxOnce(s.path); } catch {}
      return res.json({ ok: true, found: true, block: r.n, offset: r.o, tx });
    }
  }
  return res.json({ ok: true, found: false });
});


  app.get("/tx/receipt", (req, res) => {
    const hash = String(req.query.hash || "").toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(hash)) return res.json({ ok: false, error: "bad hash" });
    const r: any = (node as any).receipts.get(hash);
    if (!r?.found) return res.json({ ok: true, found: false });
    const { n, o, ts } = r;
    res.json({ ok: true, found: true, n, o, ts });
  });

  app.get("/tx/status", (req, res) => {
    const hash = String(req.query.hash || "").toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(hash)) return res.json({ ok: false, error: "bad hash" });
    try {
      const txs = (node as any).mempool?.peekAll?.() ?? [];
      if (Array.isArray(txs) && txs.some((t: any) => String(t?.hash || "").toLowerCase() === hash)) {
        return res.json({ ok: true, status: "pending" });
      }
    } catch {}
    const r: any = (node as any).receipts.get(hash);
    if (r && r.found) {
      const { n, o, ts } = r;
      return res.json({ ok: true, status: "confirmed", n, o, ts });
    }
    return res.json({ ok: true, status: "unknown" });
  });

  app.get("/receipts/stats", (_req, res) => {
    const s = ( (node as any).receipts?.stats?.() ) ?? ({ shards: [], totalBytes: 0, totalLines: 0 } as any);
    res.json({ ok: true, ...s });
  });

  app.post("/receipts/gc", (req, res) => {
    const keepLast = Number(req.query.keepLast || 1);
    try {
      const r =
        ( (node as any).receipts?.gc?.(keepLast) ) ??
        ({ ok: true, keepLast, removed: 0, kept: 0 } as any);
      res.json(r);
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  /* ===================== MEMPOOL / TX SUBMIT ===================== */
  app.get("/mempool/count", (_req, res) => {
    try {
      const txs = (node as any).mempool?.peekAll?.() ?? [];
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
      (node as any).mempool?.push?.({ ...(tx as any), hash });
    } catch {}
    metrics.inc("tx_submitted", 1);
    (node as any).publishJson("void/tx", { ...(tx as any), hash });
    res.json({ ok: true });
  });

  app.get("/mempool", (_req, res) => {
    const txs = (node as any).mempool?.peekAll?.() ?? [];
    res.json({ ok: true, size: Array.isArray(txs) ? txs.length : 0, txs });
  });

  /* ===================== BLOBS ===================== */
  app.post("/blob/put", async (req, res) => {
    const MAX = MAX_BLOB_MB * 1024 * 1024;
    if (typeof (req.body as any)?.text === "string") {
      const buf = Buffer.from((req.body as any).text, "utf8");
      if (buf.length > MAX) return res.json({ ok: false, error: `too large (> ${MAX_BLOB_MB}MB)` });
      const out = await (node as any).putBlobFromBuffer(buf);
      return res.json({ ok: true, ...out });
    }
    if (typeof (req.body as any)?.base64 === "string") {
      const buf = Buffer.from((req.body as any).base64, "base64");
      if (buf.length > MAX) return res.json({ ok: false, error: `too large (> ${MAX_BLOB_MB}MB)` });
      const out = await (node as any).putBlobFromBuffer(buf);
      return res.json({ ok: true, ...out });
    }
    return res.json({ ok: false, error: "send {text} or {base64} JSON" });
  });

  app.get("/blob/stat/:cid", (req, res) => {
    try {
      const cid = String(req.params.cid || "").trim();
      if (!cid) return res.json({ ok: false, error: "missing cid" });
      const b = (node as any).getBlob(cid);
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
    const head = (node as any).store.loadHeadNumber();
    const peers = [...(node as any).peers.keys()].filter((k: string) => !k.startsWith("?-")).length;
    const mempool = (((node as any).mempool?.peekAll?.() ) || []).length;
    res.setHeader("content-type", "text/plain; version=0.0.4; charset=utf-8");
    res.send(metrics.renderText({ peers, mempool, head, peers_known: peersReg.count() }));
  });

  app.listen(HTTP_PORT, () => {
    console.log(`[void-node] http :${HTTP_PORT}`);
    console.log(`[void-node] bootstrap: ${[...mergedBootstrap].join(", ") || "(none)"}`);
    try {
      const httpBase = process.env.PUBLIC_HTTP_BASE || `http://127.0.0.1:${HTTP_PORT}`;
      const p2pListen = ( (node as any).listenAddrs?.[0] ) || `127.0.0.1:${P2P_PORT}`;

      selfAdvert.httpBase = httpBase;
      selfAdvert.p2pListen = p2pListen;

      (node as any).publishJson("void/http", { id: (node as any).id, http: httpBase });
      setInterval(() => {
        (node as any).publishJson("void/http", { id: (node as any).id, http: httpBase });
      }, 10_000).unref?.();

      peersReg.upsert({
        id: (node as any).id,
        http: httpBase,
        p2p: p2pListen,
        capabilities: ["blob", "tx", "block"],
      });
      (metrics.gauges as any).peers_known = peersReg.count();
      console.log(`[peers] self upsert -> id=${(node as any).id} http=${httpBase} p2p=${p2pListen}`);

      // periodic announce-upsert to known peers
      setInterval(() => {
        try {
          const peers = peersReg.all();
          for (const p of peers) {
            if (!p?.http) continue;
            void upsertRemotePeer(p.http, (node as any).id, selfAdvert.httpBase, selfAdvert.p2pListen);
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
