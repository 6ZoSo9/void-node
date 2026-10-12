// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

// src/http/api_autoboot.ts
/**
 * Minimal “autoboot” helper for dev: if the store is empty, write a genesis block 0.
 * Endpoints:
 *   POST /api/autoboot -> { ok, wrote }
 */
import express from "express";
import { SegStore } from "../chain/seg_store.js";

export function startAutobootServer(port = Number(process.env.AUTOBOOT_PORT || 4311)) {
  const store = new SegStore(process.env.DATA_DIR || "data", { sparseEvery: 256 });
  const app = express();
  app.use(express.json({ limit: "8mb" }));

  app.post("/api/autoboot", (_req, res) => {
    const head = store.loadHeadNumber();
    if (head >= 0) return res.json({ ok: true, wrote: false, head });
    const now = Date.now();
    store.saveBlock({
      number: 0,
      parentHash: "".padStart(64, "0"),
      timestamp: now,
      txRoot: "".padStart(64, "0"),
      blobRoot: "".padStart(64, "0"),
      txs: [],
      blobs: [],
      proposer: "genesis",
      sig: "".padStart(64, "0"),
    } as any);
    res.json({ ok: true, wrote: true, head: store.loadHeadNumber() });
  });

  app.listen(port, () => console.log(`[autoboot] http :${port}`));
  return { ok: true, port };
}

if (process.argv[1]?.endsWith("api_autoboot.ts")) startAutobootServer();

