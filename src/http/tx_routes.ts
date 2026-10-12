// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import type { Express, Request, Response } from "express";
import { txBuffer } from "../tx_buffer.js";

// VOID_SMALL_EMPTY_CATCH_VISIBILITY_PACK_V1_FAILURE_VISIBLE
// No catch sites remain in this legacy read-only router; the marker keeps the
// visibility-pack target explicit while transaction mutation authority stays retired.

export function registerTxRoutes(app: Express) {
  // Transaction admission is intentionally not mounted by this legacy router.
  // The canonical transaction owner is installed by the canonical runtime.
  // Generic legacy mempool metrics are also retired because they observed a
  // different singleton than the canonical producer mempool.

  // Read-only TX buffer observability.
  app.get("/mempool/buffer/size", (_req: Request, res: Response) => {
    res.json({ ok:true, size: txBuffer.size(), pushed: txBuffer.pushed_total, popped: txBuffer.popped_total });
  });

  app.get("/mempool/buffer/sample", (req: Request, res: Response) => {
    const max = Math.min(1000, Math.max(1, Number(req.query.max ?? 10) | 0));
    res.json({ ok:true, sample: txBuffer.sample(max) });
  });
}
