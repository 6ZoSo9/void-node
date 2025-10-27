// src/http/follower_routes.ts
import type { Express, Request, Response } from "express";
import type { Metrics } from "../metrics.js";

type MetricsLike = Partial<Metrics> & Record<string, any>;

function makeSafeMetrics(m: MetricsLike | undefined) {
  const has = (k: string) => m && typeof (m as any)[k] === "function";
  const call = (k: string, ...args: any[]) => {
    try { if (has(k)) (m as any)[k](...args); } catch { /* no-op */ }
  };
  return {
    inc: (k: keyof Metrics["counters"] | string, v = 1) => call("inc", k, v),
    ok: (v = 1) => {
      if (has("incFollowOk")) call("incFollowOk", v);
      else call("inc", "follow_ok", v);
    },
    err: (v = 1) => {
      if (has("incFollowErrors")) call("incFollowErrors", v);
      else call("inc", "follow_err", v);
    },
  };
}

export function registerFollowerRoutes(app: Express, node: any, metrics: MetricsLike) {
  const mx = makeSafeMetrics(metrics);

  // In-memory status snapshot for quick reads
  const syncState: {
    enabled: boolean;
    peer?: string;
    intervalMs?: number;
    lastOk?: number;
    lastErr?: string | null;
    lastImported?: number;
    theirHead?: number;
  } = { enabled: false, lastErr: null };

  app.get("/sync/status", (_req: Request, res: Response) => {
    const myHead = Number(node?.store?.loadHeadNumber?.() ?? -1);
    res.json({ ok: true, myHead, ...syncState });
  });

  app.post("/follower/start", (req: Request, res: Response) => {
    try {
      const peer = String(req.query.peer || "http://127.0.0.1:4100");
      const ms = Number(req.query.intervalMs || 2000) | 0;

      syncState.enabled = true;
      syncState.peer = peer;
      syncState.intervalMs = ms;
      syncState.lastErr = null;

      const r = node.startFollower(peer, ms, {
        onImportBlock: (b: any) => {
          mx.inc("blocks_imported", 1);
          if (b?.txs?.length) {
            mx.inc("tx_indexed", b.txs.length);
            mx.inc("receipts_appended", b.txs.length);
          }
        },
      });

      res.json(r || { ok: true, peer, intervalMs: ms });
    } catch (e: any) {
      mx.err(1);
      syncState.lastErr = String(e?.message || e);
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  app.post("/follower/stop", (_req: Request, res: Response) => {
    // Node core runs follower on a timer it owns; we expose a soft stop by
    // flipping the flag. (If your Node exposes a real stop, call it here.)
    const was = !!syncState.enabled;
    syncState.enabled = false;
    res.json({ ok: true, wasRunning: was, now: syncState.enabled });
  });

  app.post("/follower/once", async (req: Request, res: Response) => {
    const peer = String(req.query.peer || syncState.peer || "http://127.0.0.1:4100");
    try {
      const r = await node.pullOnce(peer, {
        onImportBlock: (b: any) => {
          mx.inc("blocks_imported", 1);
          if (b?.txs?.length) {
            mx.inc("tx_indexed", b.txs.length);
            mx.inc("receipts_appended", b.txs.length);
          }
        },
      });

      mx.ok(1);
      syncState.lastOk = Date.now();
      syncState.lastErr = null;
      syncState.lastImported = (r as any)?.imported ?? 0;
      syncState.theirHead = (r as any)?.theirHead;

      res.json(r);
    } catch (e: any) {
      mx.err(1);
      syncState.lastErr = String(e?.message || e);
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });
}

