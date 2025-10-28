// src/http/api_attach.ts
/**
 * Helper attach API: expose your local store over a tiny HTTP server.
 * Defaults: HTTP :4310, DATA_DIR from env.
 * Endpoints:
 *   GET  /api/health        -> { ok, head, dataDir }
 *   GET  /head              -> { ok, head }
 *   GET  /blocks/range?from=&to=   -> [blocks...]
 */
import express from "express";
import * as path from "node:path";
import { SegStore } from "../chain/seg_store.js";

const PORT = Number(process.env.ATTACH_PORT || 4310);
const DATA_DIR = process.env.DATA_DIR || "data";

export function startAttachServer(opts?: { port?: number; dataDir?: string }) {
  const port = Number(opts?.port ?? PORT);
  const data = String(opts?.dataDir ?? DATA_DIR);
  const store = new SegStore(data, { sparseEvery: 256 });

  const app = express();
  app.use(express.json({ limit: "64mb" }));

  app.get(["/api/health", "/health"], (_req, res) => {
    res.json({ ok: true, head: store.loadHeadNumber(), dataDir: path.resolve(data) });
  });

  app.get(["/head", "/api/head"], (_req, res) => {
    res.json({ ok: true, head: store.loadHeadNumber() });
  });

  app.get("/blocks/range", (req, res) => {
    const from = Number(req.query.from ?? 0);
    const to = Number(req.query.to ?? store.loadHeadNumber());
    if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to < from) {
      return res.status(400).json({ ok: false, error: "bad range" });
    }
    const out: any[] = [];
    for (let n = from; n <= to; n++) {
      const b = store.loadBlock(n);
      if (b) out.push(b);
    }
    res.json(out);
  });

  app.listen(port, () => {
    console.log(`[attach] http :${port} (DATA_DIR=${path.resolve(data)})`);
  });

  return { ok: true, port, dataDir: data };
}

// Allow: `npx tsx src/http/api_attach.ts`
if (process.argv[1]?.endsWith("api_attach.ts")) startAttachServer();

