// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

// src/http/follower_routes.ts
import type { Express } from "express";

export function registerFollowerRoutes(app: Express, node: any, metrics?: any) {
  const autoPeer = String(process.env.VOID_FOLLOWER_AUTOSTART_PEER || "").trim();
  const autoIntervalMs = Math.max(
    500,
    Number(process.env.VOID_FOLLOWER_AUTOSTART_INTERVAL_MS || 1000) || 1000,
  );

  if (autoPeer) {
    let parsed: URL | null = null;
    try {
      parsed = new URL(autoPeer);
    } catch {
      console.error("VOID_PUBLIC_BOOTSTRAP_AUTOSTART_REJECTED", {
        reason: "invalid_peer_url",
      });
    }

    if (parsed && ["http:", "https:"].includes(parsed.protocol)) {
      setTimeout(() => {
        try {
          const result = node.startFollower?.(parsed!.origin, autoIntervalMs);
          console.log("VOID_PUBLIC_BOOTSTRAP_AUTOSTART_ACTIVE", {
            peer: parsed!.origin,
            intervalMs: autoIntervalMs,
            ok: result?.ok !== false,
          });
        } catch (error: any) {
          console.error("VOID_PUBLIC_BOOTSTRAP_AUTOSTART_FAILURE", {
            peer: parsed!.origin,
            message: String(error?.message || error),
          });
        }
      }, 750).unref?.();
    }
  }

  // One-shot pull
  app.post("/follower/once", async (req, res) => {
    const peer = String(req.query.peer || req.body?.peer || "http://localhost:4100");
    try {
      const r = await node.pullOnce?.(peer);
      if (metrics && r?.imported) metrics.inc?.("follower_imported", r.imported);
      if (metrics && r?.filled) metrics.inc?.("follower_filled", r.filled);
      res.json(r ?? { ok: false, error: "no pullOnce()" });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  // Continuous follow loop
  app.post("/follower/start", (req, res) => {
    const peer = String(req.query.peer || req.body?.peer || "http://localhost:4100");
    const intervalMs = Number(req.query.intervalMs || req.body?.intervalMs || 2000);
    try {
      const r = node.startFollower?.(peer, intervalMs);
      return res.json(r ?? { ok: false, error: "no startFollower()" });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  // Info
  app.get("/follower/peers", (_req, res) => {
    try { res.json({ ok: true, ...(node.peersSnapshot?.() ?? {}) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: String(e?.message || e) }); }
  });
}

