// src/http/api_attach.ts
import { IncomingMessage, ServerResponse } from "node:http";
import * as url from "node:url";
import * as fs from "node:fs";
import * as path from "node:path";
import { SegStore } from "../chain/seg_store.js";
import type { Node } from "../node_core.js";
import { buildKidxForJsonl, queryKidx } from "../util/kidx.js"; // per-file builder + reader

/** Best-effort dynamic mount: only if ./routes/follow.js exists and exports registerFollowRoutes */
async function maybeRegisterFollowRoutes(server: any, node: Node) {
  try {
    const mod = await import("./routes/follow.js");
    const fn = (mod as any)?.registerFollowRoutes;
    if (typeof fn === "function") fn(server, node);
  } catch {
    /* ignore if route file isn’t present */
  }
}

// Build all missing .kidx files under <dataDir>/index
async function buildAllKidxUnder(dataDir: string): Promise<{ ok: true; built: number; files: string[] }> {
  const idxDir = path.join(dataDir, "index");
  if (!fs.existsSync(idxDir)) return { ok: true, built: 0, files: [] };

  const jsonls = fs
    .readdirSync(idxDir)
    .filter((f) => /^tx-\d+-\d+\.jsonl$/.test(f))
    .map((f) => path.join(idxDir, f));

  let built = 0;
  const files: string[] = [];
  for (const jsonl of jsonls) {
    const kidx = jsonl.replace(/\.jsonl$/, ".kidx");
    if (!fs.existsSync(kidx)) {
      await buildKidxForJsonl(jsonl);
      built++;
      files.push(kidx);
    }
  }
  return { ok: true, built, files };
}

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

type Shard = { from: number; to: number; path: string };

function listIndexShards(idxDir: string): Shard[] {
  if (!fs.existsSync(idxDir)) return [];
  const out: Shard[] = [];
  for (const f of fs.readdirSync(idxDir)) {
    const m = /^tx-(\d+)-(\d+)\.jsonl$/.exec(f);
    if (!m) continue;
    const from = Number(m[1]);
    const to = Number(m[2]);
    if (!Number.isFinite(from) || !Number.isFinite(to)) continue;
    out.push({ from, to, path: path.join(idxDir, f) });
  }
  out.sort((a, b) => a.from - b.from);
  return out;
}

function shardForBlock(idxDir: string, n: number): Shard | null {
  const shards = listIndexShards(idxDir);
  for (const s of shards) if (s.from <= n && n <= s.to) return s;
  return null;
}

function json(res: ServerResponse, code: number, payload: any) {
  try {
    res.writeHead(code, {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "GET,POST,OPTIONS",
    });
  } catch {}
  res.end(JSON.stringify(payload));
}

function text(res: ServerResponse, code: number, body: string) {
  try {
    res.writeHead(code, {
      "content-type": "text/plain; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "GET,POST,OPTIONS",
    });
  } catch {}
  res.end(body);
}

export function attachApi(
  server: any,
  store: SegStore,
  dataDir: string,
  opts?: { node?: Node }
) {
  if (!server || typeof server.on !== "function") return;

  if (opts?.node) void maybeRegisterFollowRoutes(server, opts.node);

  server.on("request", async (req: IncomingMessage, res: ServerResponse) => {
    // CORS preflight
    if (req.method === "OPTIONS") {
      try {
        res.writeHead(204, {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "content-type",
          "access-control-allow-methods": "GET,POST,OPTIONS",
        });
      } catch {}
      return res.end();
    }

    try {
      const u = url.parse(req.url || "", true);
      const p = (u.pathname || "/").replace(/\/+$/, "") || "/";

      // --- basics ---
      if (req.method === "GET" && (p === "/health" || p === "/api/health")) {
        return json(res, 200, { ok: true, dataDir, head: store.loadHeadNumber() });
      }
      if (req.method === "GET" && (p === "/head" || p === "/api/head")) {
        return json(res, 200, { ok: true, head: store.loadHeadNumber() });
      }

      // --- blocks range ---
      if (req.method === "GET" && p === "/blocks/range") {
        const from = Number(u.query?.from ?? 0);
        const to = Number(u.query?.to ?? store.loadHeadNumber());
        if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to < from) {
          return json(res, 400, { ok: false, error: "bad range" });
        }
        const out: any[] = [];
        for (let i = from; i <= to; i++) {
          const b = store.loadBlock(i);
          if (b) out.push(b);
        }
        return json(res, 200, out);
      }

      // --- tx lookup (kidx first, jsonl fallback) ---
      if (req.method === "GET" && p === "/tx/lookup") {
        const hash = String(u.query?.hash || "").toLowerCase();
        if (!/^[0-9a-f]{64}$/.test(hash)) return json(res, 200, { ok: false, error: "bad hash" });

        const idxDir = path.join(dataDir, "index");
        const shards = listIndexShards(idxDir).sort((a, b) => b.from - a.from);

        for (const s of shards) {
          const kidxPath = s.path.replace(/\.jsonl$/, ".kidx");
          // Prefer kidx if present
          if (fs.existsSync(kidxPath)) {
            const hit = queryKidx(kidxPath, hash);
            if (hit.found) {
              const blk = store.loadBlock(hit.n!);
              if (!blk) return json(res, 200, { ok: false, error: "block not found (stale index?)" });
              const tx = (blk as any).txs?.[hit.o!];
              return json(res, 200, { ok: true, found: true, block: hit.n, offset: hit.o, tx });
            }
            continue;
          }
          // Fallback JSONL scan
          const result = lookupInJsonl(s.path, hash);
          if (result.found) {
            const blk = store.loadBlock(result.n);
            if (!blk) return json(res, 200, { ok: false, error: "block not found (stale index?)" });
            const tx = (blk as any).txs?.[result.o];
            return json(res, 200, { ok: true, found: true, block: result.n, offset: result.o, tx });
          }
        }
        return json(res, 200, { ok: true, found: false });
      }

      // --- index: build any missing .kidx (POST or GET) ---
      if ((req.method === "POST" || req.method === "GET") && p === "/index/build") {
        const r = await buildAllKidxUnder(dataDir);
        return json(res, 200, r);
      }

      // --- index: stats (JSON) ---
      if (req.method === "GET" && p === "/index/stats") {
        const idxDir = path.join(dataDir, "index");
        const shards: any[] = [];
        if (fs.existsSync(idxDir)) {
          const files = fs.readdirSync(idxDir).filter((f) => /^tx-\d+-\d+\.jsonl$/.test(f));
          for (const f of files) {
            const jsonlPath = path.join(idxDir, f);
            const kidxPath = jsonlPath.replace(/\.jsonl$/, ".kidx");
            const m = /^tx-(\d+)-(\d+)\.jsonl$/.exec(f)!;
            const from = Number(m[1]),
              to = Number(m[2]);
            const jsonlBytes = fs.existsSync(jsonlPath) ? fs.statSync(jsonlPath).size : 0;
            const kidxBytes = fs.existsSync(kidxPath) ? fs.statSync(kidxPath).size : 0;
            const lines = jsonlBytes ? countLinesQuick(jsonlPath) : 0;
            shards.push({
              from,
              to,
              jsonl: { path: jsonlPath, bytes: jsonlBytes, lines },
              kidx: { path: kidxPath, bytes: kidxBytes, present: fs.existsSync(kidxPath) },
            });
          }
          shards.sort((a, b) => a.from - b.from);
        }
        return json(res, 200, { ok: true, shards });
      }

      // --- index: kidx rebuild for a specific shard (by block or by tx hash) ---
      if (req.method === "POST" && p === "/index/kidx/rebuild-shard") {
        const idxDir = path.join(dataDir, "index");
        const blockParam = u.query?.block;
        const hashParam = u.query?.hash;

        try {
          if (blockParam !== undefined) {
            const bn = Number(blockParam);
            if (!Number.isFinite(bn) || bn < 0) return json(res, 200, { ok: false, error: "bad block" });
            const shard = shardForBlock(idxDir, bn);
            if (!shard) return json(res, 200, { ok: false, error: "no shard for block" });
            await buildKidxForJsonl(shard.path);
            return json(res, 200, {
              ok: true,
              shard: { from: shard.from, to: shard.to },
              kidx: shard.path.replace(/\.jsonl$/, ".kidx"),
            });
          } else if (typeof hashParam === "string") {
            const hash = String(hashParam).toLowerCase();
            if (!/^[0-9a-f]{64}$/.test(hash)) return json(res, 200, { ok: false, error: "bad hash" });
            const shards = listIndexShards(idxDir).sort((a, b) => b.from - a.from);
            for (const s of shards) {
              const kidxPath = s.path.replace(/\.jsonl$/, ".kidx");
              if (fs.existsSync(kidxPath)) {
                const hit = queryKidx(kidxPath, hash);
                if (hit.found) {
                  await buildKidxForJsonl(s.path);
                  return json(res, 200, { ok: true, shard: { from: s.from, to: s.to }, kidx: kidxPath });
                }
                continue;
              }
              const r = lookupInJsonl(s.path, hash);
              if (r.found) {
                await buildKidxForJsonl(s.path);
                return json(res, 200, {
                  ok: true,
                  shard: { from: s.from, to: s.to },
                  kidx: s.path.replace(/\.jsonl$/, ".kidx"),
                });
              }
            }
            return json(res, 200, { ok: false, error: "hash not found" });
          }
          return json(res, 200, { ok: false, error: "provide block or hash" });
        } catch (e: any) {
          return json(res, 500, { ok: false, error: String(e?.message || e) });
        }
      }

      // --- metrics (Prometheus) ---
      if (req.method === "GET" && p === "/metrics") {
        let blocks = 0,
          bytes = 0;
        try {
          const segDir = path.join(dataDir, "segments");
          if (fs.existsSync(segDir)) {
            const segs = fs.readdirSync(segDir).filter((d) => /^\d{8}$/.test(d)).sort();
            for (const s of segs) {
              const mPath = path.join(segDir, s, "meta.json");
              if (fs.existsSync(mPath)) {
                const m = JSON.parse(fs.readFileSync(mPath, "utf8"));
                const from = Number(m?.from ?? -1);
                const toNum = Number(m?.to ?? -1);
                if (Number.isFinite(from) && Number.isFinite(toNum) && toNum >= from) {
                  blocks += toNum - from + 1;
                }
                bytes += Number(m?.bytes ?? 0) || 0;
              }
            }
          }
        } catch {}
        const body =
`# HELP void_helper_head Current head number (helper store)
# TYPE void_helper_head gauge
void_helper_head ${store.loadHeadNumber()}
# HELP void_helper_blocks Total blocks across segments
# TYPE void_helper_blocks gauge
void_helper_blocks ${blocks}
# HELP void_helper_bytes Total segment bytes
# TYPE void_helper_bytes gauge
void_helper_bytes ${bytes}
`;
        return text(res, 200, body);
      }

      return json(res, 404, { ok: false, error: "not found" });
    } catch (e: any) {
      return json(res, 500, { ok: false, error: String(e?.message || e) });
    }
  });
}

/** Lightweight JSONL scan if .kidx is missing */
function lookupInJsonl(
  jsonlPath: string,
  hashLower: string
): { found: true; n: number; o: number } | { found: false } {
  try {
    if (!fs.existsSync(jsonlPath)) return { found: false };
    const txt = fs.readFileSync(jsonlPath, "utf8");
    const lines = txt.split("\n");
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      try {
        const rec = JSON.parse(t) as { h?: string; n?: number; o?: number };
        if (typeof rec?.h === "string" && rec.h.toLowerCase() === hashLower) {
          return { found: true, n: Number(rec.n), o: Number(rec.o) };
        }
      } catch {
        /* ignore bad line */
      }
    }
  } catch {}
  return { found: false };
}

