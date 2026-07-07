// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import type { Express, Request, Response } from "express";
import { globalEnqueueTx } from "../node_core.js";
import { mempool } from "../mempool.js";
import { txBuffer } from "../tx_buffer.js";

function recordSmallEmptyCatchVisibilityFailure_src_http_tx_routes_ts(scope: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn("VOID_SMALL_EMPTY_CATCH_VISIBILITY_PACK_V1_FAILURE_VISIBLE", {
    file: "src/http/tx_routes.ts",
    scope,
    message,
  });
}


/**
 * NOTE:
 * - We rely on app-level express.json() already configured in index.ts.
 * - Mempool expects { data: string }. If caller sends an object, we stringify it.
 * - We mirror accepted txs into txBuffer (safe, additive).
 */
export function registerTxRoutes(app: Express) {
  // Alias preferred by tools: POST /tx/submit
  app.post("/tx/submit", (req: Request, res: Response) => {
    
    
    try { globalEnqueueTx(req.body ?? {}); const q=(globalThis as any).__void_tx_queue; console.log("[route] /tx/submit enq size=%s", Array.isArray(q)?q.length:-1); } catch (err) { recordSmallEmptyCatchVisibilityFailure_src_http_tx_routes_ts("empty-catch-1", err); } 
  try { globalEnqueueTx(req.body ?? {}); } catch (err) { recordSmallEmptyCatchVisibilityFailure_src_http_tx_routes_ts("empty-catch-2", err); }
  const b = (req as any).body ?? {};
    const id: string = (typeof b.id === "string" && b.id.length)
      ? b.id
      : `tx-${Date.now()}-${Math.random().toString(16).slice(2,8)}`;
    let data: any = (typeof b.data !== "undefined") ? b.data : b;
    if (typeof data !== "string") data = JSON.stringify(data);

    if (process.env.DEBUG_TX) console.log("[tx_routes] submit", {id, typeofData: typeof data, sample: (typeof data=="string"?data.slice(0,64):"[obj]")});
    const result = mempool.submit({ id, data });
    if (!result?.ok) return res.status(400).json({ ...(result || {}), ok:false });

    // mirror into our lightweight buffer (string guaranteed)
    txBuffer.push({ id, data });
    return res.json({ ok:true });
  });

  // Neutral path kept: POST /mempool/submit  (same behavior)
  app.post("/mempool/submit", (req: Request, res: Response) => {
    
    try { globalEnqueueTx(req.body ?? {}); } catch (err) { recordSmallEmptyCatchVisibilityFailure_src_http_tx_routes_ts("empty-catch-3", err); }
  const b = (req as any).body ?? {};
    const id: string = (typeof b.id === "string" && b.id.length)
      ? b.id
      : `tx-${Date.now()}-${Math.random().toString(16).slice(2,8)}`;
    let data: any = (typeof b.data !== "undefined") ? b.data : b;
    if (typeof data !== "string") data = JSON.stringify(data);

    const result = mempool.submit({ id, data });
    if (!result?.ok) return res.status(400).json({ ...(result || {}), ok:false });

    txBuffer.push({ id, data });
    return res.json({ ok:true, id, size: (mempool as any).size?.() ?? 0 });
  });

  // Prometheus-ish overview for mempool (counters live on mempool instance)
  app.get("/metrics/mempool", (_req: Request, res: Response) => {
    const size = (mempool as any).size?.() ?? 0;
    const submitted = (mempool as any).submitted ?? 0;
    const accepted = (mempool as any).accepted ?? 0;
    const rejected = (mempool as any).rejected ?? 0;
    res.type("text/plain").send([
      `void_mempool_size ${size}`,
      `void_mempool_submitted_total ${submitted}`,
      `void_mempool_accepted_total ${accepted}`,
      `void_mempool_rejected_total ${rejected}`,
    ].join("\n") + "\n");
  });

  // --- TX BUFFER UTILITIES (safe, additive) ---
  app.get("/mempool/buffer/size", (_req: Request, res: Response) => {
    res.json({ ok:true, size: txBuffer.size(), pushed: txBuffer.pushed_total, popped: txBuffer.popped_total });
  });

  app.get("/mempool/buffer/sample", (req: Request, res: Response) => {
    const max = Math.min(1000, Math.max(1, Number(req.query.max ?? 10) | 0));
    res.json({ ok:true, sample: txBuffer.sample(max) });
  });

  // Drain up to N for proposer; returns array and removes them from buffer
  app.get("/mempool/buffer/pop", (req: Request, res: Response) => {
    const max = Math.min(1000, Math.max(1, Number(req.query.max ?? 100) | 0));
    const out = txBuffer.popN(max);
    res.json({ ok:true, count: out.length, txs: out });
  });

  // Maintenance helper
  app.post("/mempool/buffer/clear", (_req: Request, res: Response) => {
    txBuffer.clear();
    res.json({ ok:true });
  });
}
