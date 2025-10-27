// src/http/routes/index_build.ts
import type { Express, Request, Response } from "express";
import * as path from "node:path";
import * as fs from "node:fs";
import { buildAllKidx } from "../../util/kidx.js";

/**
 * Safely resolve a requested base path.
 * - Defaults to the provided dataDir
 * - If override is provided, it must resolve inside dataDir (prevents traversal)
 * - Must exist on disk
 */
function resolveSafeBase(dataDir: string, override?: string): string {
  const root = path.resolve(dataDir);
  if (!override) return root;

  const cand = path.resolve(override);
  // Guard: the candidate must be inside the root
  if (!cand.startsWith(root + path.sep) && cand !== root) {
    return root;
  }
  if (!fs.existsSync(cand)) return root;
  return cand;
}

async function handleBuild(req: Request, res: Response, dataDir: string) {
  try {
    // Optional override via ?base= or body.base, but constrained to dataDir subtree
    const override = (req.query.base as string) || (req.body && (req.body.base as string));
    const base = resolveSafeBase(dataDir, override);

    const r = await buildAllKidx(base);
    res.json({ ok: true, base, ...r });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}

export function registerIndexBuildRoutes(app: Express, dataDir: string) {
  // Primary endpoint
  app.post("/index/build", (req, res) => void handleBuild(req, res, dataDir));

  // Convenience alias (read-only trigger via GET)
  app.get("/index/build", (req, res) => void handleBuild(req, res, dataDir));

  // Back-compat alias used elsewhere in the codebase
  app.post("/index/kidx/build", (req, res) => void handleBuild(req, res, dataDir));
}

