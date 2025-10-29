// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

// src/http/routes/index_build.ts
/**
 * Optional route group to (re)build compact tx index from blocks on disk.
 * If your Node already exposes rebuildTxIndex(), this is redundant but harmless.
 */
import type { Express } from "express";

export function registerIndexBuild(app: Express, node: any) {
  app.post("/index/rebuild-all", async (_req, res) => {
    try { res.json(await node.rebuildTxIndex?.()); }
    catch (e: any) { res.status(500).json({ ok: false, error: String(e?.message || e) }); }
  });
}

