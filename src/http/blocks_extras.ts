// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import type { Express, Request, Response } from "express";

/**
 * Convenience helpers that proxy to existing HTTP endpoints.
 * No changes to block schema or SegStore wiring. Pure add-on.
 */
export function registerBlockExtras(app: Express) {

  // GET /blocks/latest — fetch last block by querying range and taking the tail.
  // NOTE: Uses local HTTP to avoid touching internal store APIs.
  app.get("/blocks/latest", async (_req: Request, res: Response) => {
    try {
      const port = Number(process.env.HTTP_PORT || "4100");
      // Pull a big range and take the last element (local-only call).
      // This is cheap enough for dev; we can replace with a proper head getter later.
      const r = await fetch(`http://127.0.0.1:${port}/blocks/range?from=0&to=999999`);
      if (!r.ok) return res.status(502).json({ ok:false, error:`range fetch ${r.status}` });

      const arr = await r.json();
      if (!Array.isArray(arr) || arr.length === 0) {
        return res.status(404).json({ ok:false, error:"no blocks yet" });
      }
      const last = arr[arr.length - 1];
      return res.json({ ok:true, latest:last, number:last?.number, hash:last?.hash });
    } catch (err: any) {
      return res.status(500).json({ ok:false, error:String(err?.message || err) });
    }
  });

  // GET /blocks/head — return just the latest number (fast for scripts)
  app.get("/blocks/head", async (_req: Request, res: Response) => {
    try {
      const port = Number(process.env.HTTP_PORT || "4100");
      const r = await fetch(`http://127.0.0.1:${port}/blocks/range?from=0&to=999999`);
      if (!r.ok) return res.type("text/plain").send("-1\n");
      const arr = await r.json();
      const n = Array.isArray(arr) && arr.length ? (arr[arr.length - 1]?.number ?? -1) : -1;
      return res.type("text/plain").send(String(n) + "\n");
    } catch {
      return res.type("text/plain").send("-1\n");
    }
  });
}

