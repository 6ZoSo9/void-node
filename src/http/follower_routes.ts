// src/http/follower_routes.ts
import type { Express } from "express";

export function registerFollowerRoutes(app: Express, node: any, metrics?: any) {
  // One-shot pull
  app.post("/follower/once", async (req, res) => {
    const peer = String(req.query.peer || req.body?.peer || "http://127.0.0.1:4100");
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
    const peer = String(req.query.peer || req.body?.peer || "http://127.0.0.1:4100");
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

