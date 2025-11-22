// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

// src/http/dev_routes.ts
import type { Express } from "express";
import * as crypto from "node:crypto";

function devHash(body: any): string {
  try {
    const json = JSON.stringify(body);
    return crypto.createHash("sha256").update(json).digest("hex");
  } catch {
    const ts = Date.now().toString(16);
    return ts.padStart(64, "0").slice(-64);
  }
}

export function registerDevRoutes(app: Express, node: any) {
  // Echo for quick sanity
  app.post("/dev/echo", (req, res) =>
    res.json({ ok: true, body: req.body ?? null })
  );

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
    try {
      return res.json(
        node.startProposer?.(intervalMs) ?? {
          ok: false,
          error: "no startProposer()",
        },
      );
    } catch (e: any) {
      return res
        .status(500)
        .json({ ok: false, error: String(e?.message || e) });
    }
  });

  app.post("/dev/proposer/stop", (_req, res) => {
    try {
      return res.json(
        node.stopProposer?.() ?? { ok: false, error: "no stopProposer()" },
      );
    } catch (e: any) {
      return res
        .status(500)
        .json({ ok: false, error: String(e?.message || e) });
    }
  });

  // Canonical dev tx endpoint -> real mempool (bypasses last-mile injections)
  app.post("/__void/dev/tx/mempool", (req, res) => {
    try {
      const now = Date.now();
      const payload = {
        kind: "dev-burst-v3",
        ts: now,
        body: req.body ?? null,
      };

      const hash = devHash(payload);
      const tx = { hash, body: payload };

      let ok = false;
      let acceptType = typeof (node as any)?.acceptTx;
      try {
        const fn = (node as any)?.acceptTx;
        if (typeof fn === "function") {
          ok = !!fn.call(node, tx);
        }
      } catch {
        ok = false;
      }

      return res.json({ ok, hash, body: payload, acceptType });
    } catch (e: any) {
      return res
        .status(500)
        .json({ ok: false, error: String(e?.message || e) });
    }
  });

  // Introspect mempool shape non-destructively
  app.get("/__void/dev/mempool/inspect", (_req, res) => {
    try {
      const anyNode: any = node;
      const mem = anyNode?.mempool;
      const acc = anyNode?.acceptTx;

      const result: any = {
        ok: true,
        hasNode: !!anyNode,
        hasMempool: !!mem,
        acceptTxType: typeof acc,
        mempoolType: mem ? typeof mem : "undefined",
        mempoolKeys: mem ? Object.keys(mem) : [],
        mempoolProtoKeys: mem
          ? Object.getOwnPropertyNames(
              Object.getPrototypeOf(mem) || Object.prototype,
            )
          : [],
        peekLen: -1,
      };

      try {
        if (mem && typeof (mem as any).peekAll === "function") {
          const arr = (mem as any).peekAll();
          if (Array.isArray(arr)) result.peekLen = arr.length;
        }
      } catch {
        // ignore
      }

      res.json(result);
    } catch (e: any) {
      res
        .status(500)
        .json({ ok: false, error: String(e?.message || e) });
    }
  });
}
