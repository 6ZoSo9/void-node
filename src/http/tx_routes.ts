// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import type { Express, Request, Response } from "express";
import { globalEnqueueTx } from "../node_core.js";
import { mempool } from "../mempool.js";
import { txBuffer } from "../tx_buffer.js";

const DEBUG = process.env.DEBUG_TX === "1";

function logDebug(...args: any[]) {
  if (!DEBUG) return;
  // eslint-disable-next-line no-console
  console.log(...args);
}

/**
 * Best-effort shove into the live node's intake structures.
 * This is a rescue shim: used only when node.acceptTx is falsy.
 */
function rescueInjectIntoNode(id: string, data: string): boolean {
  try {
    const g: any = globalThis as any;
    const node: any = g.__void_node || g.node || null;
    if (!node) {
      logDebug("[tx_routes] rescueInjectIntoNode: no global node");
      return false;
    }

    const tx = { id, data };
    let injected = false;

    const q: any = node.txQueue ?? node.queue ?? null;
    if (Array.isArray(q)) {
      q.push(tx);
      injected = true;
      logDebug("[tx_routes] rescueInjectIntoNode: pushed into node.txQueue", {
        len: q.length,
      });
    }

    const pending: any = node.pending ?? node.pendingTxs ?? null;
    if (Array.isArray(pending)) {
      pending.push(tx);
      injected = true;
      logDebug("[tx_routes] rescueInjectIntoNode: pushed into node.pending", {
        len: pending.length,
      });
    }

    if (!injected) {
      logDebug(
        "[tx_routes] rescueInjectIntoNode: no usable txQueue/pending on node",
        Object.keys(node || {}),
      );
    }

    return injected;
  } catch (e: any) {
    logDebug("[tx_routes] rescueInjectIntoNode error", e?.message || e);
    return false;
  }
}

/**
 * TX intake + mempool bridge + last-mile rescue
 *
 * - Primary public route: POST /tx/submit
 *   - Normalizes { id, data }.
 *   - Tries node.acceptTx({ id, data }).
 *   - If that is falsy, best-effort injects into node.txQueue/pending.
 *   - Also calls globalEnqueueTx({ id, data }) as a legacy shim.
 *   - Submits to mempool and mirrors into txBuffer.
 *
 * - Secondary neutral route: POST /mempool/submit
 *   - Same normalization + mempool/txBuffer behavior.
 *
 * - Metrics + buffer utilities are unchanged.
 */
export function registerTxRoutes(app: Express) {
  // Alias preferred by tools: POST /tx/submit
  app.post("/tx/submit", async (req: Request, res: Response) => {
    const b: any = (req as any).body ?? {};

    const id: string =
      typeof b.id === "string" && b.id.length
        ? b.id
        : `tx-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

    let data: any = typeof b.data !== "undefined" ? b.data : b;
    if (typeof data !== "string") data = JSON.stringify(data);

    logDebug("[tx_routes] /tx/submit", {
      id,
      typeofData: typeof data,
      sample: typeof data === "string" ? data.slice(0, 64) : "[obj]",
    });

    // 1) Try node.acceptTx on the live node, if present.
    let nodeRes: any = null;
    try {
      const g: any = globalThis as any;
      const node: any = g.__void_node || g.node || null;

      if (node && typeof node.acceptTx === "function") {
        logDebug("[tx_routes] calling node.acceptTx");
        nodeRes = await node.acceptTx({ id, data });
        logDebug("[tx_routes] node.acceptTx result", nodeRes);
      } else {
        logDebug("[tx_routes] no node.acceptTx present on global node");
      }
    } catch (e: any) {
      logDebug("[tx_routes] node.acceptTx error", e?.message || e);
      nodeRes = null;
    }

    // 1b) Rescue path: if acceptTx was falsy, try direct injection into node queues.
    let rescueUsed = false;
    if (!nodeRes) {
      rescueUsed = rescueInjectIntoNode(id, data);
      logDebug("[tx_routes] rescueInjectIntoNode used", { rescueUsed, nodeRes });
    }

    // 2) Legacy shim: global tx-queue enqueue (no-op if shim missing).
    try {
      globalEnqueueTx({ id, data });
      logDebug("[tx_routes] globalEnqueueTx ok");
    } catch (e: any) {
      logDebug("[tx_routes] globalEnqueueTx error", e?.message || e);
    }

    // 3) Canonical mempool submit.
    const result = mempool.submit({ id, data });
    if (!result?.ok) {
      logDebug("[tx_routes] mempool.submit rejected", result);
      return res.status(400).json({ ...(result || {}), ok: false });
    }

    // 4) Mirror into lightweight buffer.
    txBuffer.push({ id, data });

    return res.json({ ok: true, id, nodeRes, rescueUsed });
  });

  // Neutral path kept: POST /mempool/submit  (same behavior, but doesn't expose nodeRes).
  app.post("/mempool/submit", (req: Request, res: Response) => {
    const b: any = (req as any).body ?? {};

    const id: string =
      typeof b.id === "string" && b.id.length
        ? b.id
        : `tx-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

    let data: any = typeof b.data !== "undefined" ? b.data : b;
    if (typeof data !== "string") data = JSON.stringify(data);

    const result = mempool.submit({ id, data });
    if (!result?.ok) {
      return res.status(400).json({ ...(result || {}), ok: false });
    }

    txBuffer.push({ id, data });
    return res.json({
      ok: true,
      id,
      size: (mempool as any).size?.() ?? 0,
    });
  });

  // Prometheus-ish overview for mempool (counters live on mempool instance)
  app.get("/metrics/mempool", (_req: Request, res: Response) => {
    const size = (mempool as any).size?.() ?? 0;
    const submitted = (mempool as any).submitted ?? 0;
    const accepted = (mempool as any).accepted ?? 0;
    const rejected = (mempool as any).rejected ?? 0;
    res
      .type("text/plain")
      .send(
        [
          `void_mempool_size ${size}`,
          `void_mempool_submitted_total ${submitted}`,
          `void_mempool_accepted_total ${accepted}`,
          `void_mempool_rejected_total ${rejected}`,
        ].join("\n") + "\n",
      );
  });

  // --- TX BUFFER UTILITIES (safe, additive) ---
  app.get("/mempool/buffer/size", (_req: Request, res: Response) => {
    res.json({
      ok: true,
      size: txBuffer.size(),
      pushed: txBuffer.pushed_total,
      popped: txBuffer.popped_total,
    });
  });

  app.get("/mempool/buffer/sample", (req: Request, res: Response) => {
    const max = Math.min(
      1000,
      Math.max(1, Number(req.query.max ?? 10) | 0),
    );
    res.json({ ok: true, sample: txBuffer.sample(max) });
  });

  // Drain up to N for proposer; returns array and removes them from buffer
  app.get("/mempool/buffer/pop", (req: Request, res: Response) => {
    const max = Math.min(
      1000,
      Math.max(1, Number(req.query.max ?? 100) | 0),
    );
    const out = txBuffer.popN(max);
    res.json({ ok: true, count: out.length, txs: out });
  });

  // Maintenance helper
  app.post("/mempool/buffer/clear", (_req: Request, res: Response) => {
    txBuffer.clear();
    res.json({ ok: true });
  });
}
