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

  // ---- autoboot shim v1: health + blocks/range proxy ----
  app.get("/api/health", (req, res) => {
    res.json({ ok: true, port, dataDir: process.env.DATA_DIR || null, ts_ms: Date.now() });
  });

  app.get("/blocks/range", async (req, res) => {
    try {
      const from = Number(req.query.from ?? 0);
      const to   = Number(req.query.to   ?? (from + 1));
      const upstream = process.env.HELPER_UPSTREAM || "http://127.0.0.1:4100";
      const url = `${upstream}/blocks/range?from=${from}&to=${to}`;
      const r = await fetch(url);
      const text = await r.text();
      res.status(r.status).type(r.headers.get("content-type") || "application/json").send(text);
    } catch (e) {
      res.status(500).json({ ok:false, error: String(e) });
    }
  });
  // ---- /autoboot shim v1 ----

  // ---- autoboot shim v2: head + latest helpers ----
  app.get("/head", async (req, res) => {
    try {
      const upstream = process.env.HELPER_UPSTREAM || "http://127.0.0.1:4100";
      const r = await fetch(`${upstream}/head.txt`);
      const txt = await r.text();
      res.status(200).type("text/plain").send(txt);
    } catch (e) { res.status(500).json({ok:false,error:String(e)}); }
  });

  app.get("/blocks/latest/number", async (req, res) => {
    try {
      const upstream = process.env.HELPER_UPSTREAM || "http://127.0.0.1:4100";
      const r = await fetch(`${upstream}/blocks/latest/number`);
      res.status(r.status).type(r.headers.get("content-type")||"application/json").send(await r.text());
    } catch (e) { res.status(500).json({ok:false,error:String(e)}); }
  });

  app.get("/blocks/:n/full", async (req, res) => {
    try {
      const n = Number(req.params.n);
      const upstream = process.env.HELPER_UPSTREAM || "http://127.0.0.1:4100";
      const r = await fetch(`${upstream}/blocks/${n}/full`);
      res.status(r.status).type(r.headers.get("content-type")||"application/json").send(await r.text());
    } catch (e) { res.status(500).json({ok:false,error:String(e)}); }
  });
  // ---- /autoboot shim v2 ----
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

