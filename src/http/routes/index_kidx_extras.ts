// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

// src/http/routes/index_kidx_extras.ts
/**
 * Extra helpers around the compact JSONL index and .kidx accelerators.
 * NOTE: index.ts already mounts several /index/* endpoints.
 * These are purely additive and safe to co-exist.
 */
import type { Express } from "express";
import * as fs from "node:fs";
import * as path from "node:path";
import { buildAllKidx, buildKidxForJsonl, queryKidx } from "../../util/kidx.js";

function recordSmallEmptyCatchVisibilityFailure_src_http_routes_index_kidx_extras_ts(scope: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn("VOID_SMALL_EMPTY_CATCH_VISIBILITY_PACK_V1_FAILURE_VISIBLE", {
    file: "src/http/routes/index_kidx_extras.ts",
    scope,
    message,
  });
}


export function registerIndexExtras(app: Express, node: any, metrics?: any) {
  // Rebuild all .kidx files under the index directory base
  app.post("/index/kidx/rebuild-all", async (_req, res) => {
    try {
      const shards = node.txIndex?.listShards?.() ?? [];
      let baseDir = (process.env.DATA_DIR || "data");
      if (shards.length) baseDir = path.dirname(path.dirname(shards[0].path)); // <base>/index
      const r = await buildAllKidx(baseDir);
      res.json(r);
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  // Lookup via .kidx first, fallback to JSONL scan; rebuild stale/missing on hit.
  app.get("/index/kidx/lookup", async (req, res) => {
    const hash = String(req.query.hash || "").toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(hash)) return res.json({ ok: false, error: "bad hash" });
    try {
      const shards = node.txIndex?.listShards?.().sort((a: any, b: any) => b.from - a.from) ?? [];
      for (const s of shards) {
        const kidxPath = s.path.replace(/\.jsonl$/, ".kidx");
        if (fs.existsSync(kidxPath)) {
          const hit = queryKidx(kidxPath, hash);
          if (hit.found) {
            const blk = node.store?.loadBlock?.(hit.n);
            const tx = blk?.txs?.[hit.o];
            return res.json({ ok: true, found: true, block: hit.n, offset: hit.o, tx });
          }
          // stale? rebuild
          try { metrics?.inc?.("kidx_stale_rebuilds", 1); await buildKidxForJsonl(s.path); } catch (err) { recordSmallEmptyCatchVisibilityFailure_src_http_routes_index_kidx_extras_ts("empty-catch-1", err); }
        } else {
          const r = node.txIndex?.lookupInShard?.(s.path, hash);
          if (r?.found) {
            const blk = node.store?.loadBlock?.(r.n);
            const tx = blk?.txs?.[r.o];
            try { metrics?.inc?.("kidx_missing_rebuilds", 1); await buildKidxForJsonl(s.path); } catch (err) { recordSmallEmptyCatchVisibilityFailure_src_http_routes_index_kidx_extras_ts("empty-catch-2", err); }
            return res.json({ ok: true, found: true, block: r.n, offset: r.o, tx });
          }
        }
      }
      return res.json({ ok: true, found: false });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });
}

