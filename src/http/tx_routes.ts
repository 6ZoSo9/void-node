// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import type { Express, Request, Response } from "express";
import { mempool } from "../mempool.js";
import { txBuffer } from "../tx_buffer.js";

// VOID_SMALL_EMPTY_CATCH_VISIBILITY_PACK_V1_FAILURE_VISIBLE
// No catch sites remain in this legacy read-only router; the marker keeps the
// visibility-pack target explicit while transaction mutation authority stays retired.

export function registerTxRoutes(app: Express) {
  // Transaction admission is intentionally not mounted by this legacy router.
  // The canonical transaction owner is installed by the canonical runtime.

  // Prometheus-ish overview for mempool (read-only).
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

  // Read-only TX buffer observability.
  app.get("/mempool/buffer/size", (_req: Request, res: Response) => {
    res.json({ ok:true, size: txBuffer.size(), pushed: txBuffer.pushed_total, popped: txBuffer.popped_total });
  });

  app.get("/mempool/buffer/sample", (req: Request, res: Response) => {
    const max = Math.min(1000, Math.max(1, Number(req.query.max ?? 10) | 0));
    res.json({ ok:true, sample: txBuffer.sample(max) });
  });
}
