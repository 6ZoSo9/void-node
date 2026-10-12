// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

// src/http/dev_routes.ts
import type { Express } from "express";

export function registerDevRoutes(app: Express, node: any) {
  // Echo for quick sanity
  app.post("/dev/echo", (req, res) => res.json({ ok: true, body: req.body ?? null }));

  // Env preview (safe subset)
  app.get("/dev/env", (_req, res) => {
    const pick = (k: string) => process.env[k];
    res.json({
      ok: true,
      DATA_DIR: pick("DATA_DIR"),
      HTTP_PORT: pick("HTTP_PORT"),
      P2P_PORT: pick("P2P_PORT"),
      PUBLIC_HTTP_BASE: pick("PUBLIC_HTTP_BASE"),
    });
  });

  // Start/stop proposer quickly
  app.post("/dev/proposer/start", (req, res) => {
    const intervalMs = Number(req.query.intervalMs ?? 5000);
    try { return res.json(node.startProposer?.(intervalMs) ?? { ok: false, error: "no startProposer()" }); }
    catch (e: any) { return res.status(500).json({ ok: false, error: String(e?.message || e) }); }
  });
  app.post("/dev/proposer/stop", (_req, res) => {
    try { return res.json(node.stopProposer?.() ?? { ok: false, error: "no stopProposer()" }); }
    catch (e: any) { return res.status(500).json({ ok: false, error: String(e?.message || e) }); }
  });
}

