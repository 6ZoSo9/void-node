// src/util/kidx.ts
/**
 * KIDX helpers: accelerate shard JSONL lookups by tx hash.
 * Dev-friendly format: write a compact JSON map alongside each shard:
 *   <shard>.jsonl  ->  <shard>.kidx  ({"hash":{"n":<block>,"o":<offset>}, ...})
 *
 * This is simple and perfectly fine for local development. We can evolve to a
 * binary format later without changing the public functions below.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { ensureDir, readJsonIfExists, writeJsonAtomic } from "./files.js";

type Hit = { found: true; n: number; o: number } | { found: false };

export function queryKidx(kidxPath: string, hash: string): Hit {
  const m = readJsonIfExists<Record<string, { n: number; o: number }>>(kidxPath);
  if (!m) return { found: false };
  const e = m[hash];
  return e ? { found: true, n: e.n, o: e.o } : { found: false };
}

export async function buildKidxForJsonl(jsonlPath: string): Promise<{ ok: true; entries: number; kidxPath: string }> {
  const dir = path.dirname(jsonlPath);
  const kidxPath = jsonlPath.replace(/\.jsonl$/, ".kidx");
  ensureDir(dir);

  let entries = 0;
  const map: Record<string, { n: number; o: number }> = Object.create(null);

  if (!fs.existsSync(jsonlPath)) {
    writeJsonAtomic(kidxPath, map);
    return { ok: true, entries, kidxPath };
  }

  const data = fs.readFileSync(jsonlPath, "utf8");
  const lines = data.split(/\r?\n/);
  for (const line of lines) {
    if (!line) continue;
    try {
      const r = JSON.parse(line);
      const h = String(r?.h || r?.hash || "").toLowerCase();
      const n = Number(r?.n);
      const o = Number(r?.o ?? r?.offset ?? 0);
      if (/^[0-9a-f]{64}$/.test(h) && Number.isFinite(n) && Number.isFinite(o)) {
        // last write wins
        map[h] = { n, o };
        entries++;
      }
    } catch {
      /* ignore bad lines */
    }
  }

  writeJsonAtomic(kidxPath, map);
  return { ok: true, entries, kidxPath };
}

/** Build all .kidx files under an index base directory (<base>/index/*.jsonl). */
export async function buildAllKidx(baseDir: string): Promise<{
  ok: true; scanned: number; built: number; updated: string[];
}> {
  const out: string[] = [];
  const indexDir = path.join(baseDir, "index");
  if (!fs.existsSync(indexDir)) return { ok: true, scanned: 0, built: 0, updated: out };

  const files = fs.readdirSync(indexDir).filter((f) => f.endsWith(".jsonl"));
  let scanned = 0, built = 0;
  for (const f of files) {
    scanned++;
    const jsonl = path.join(indexDir, f);
    const r = await buildKidxForJsonl(jsonl);
    if (r.entries >= 0) {
      built++;
      out.push(r.kidxPath);
    }
  }
  return { ok: true, scanned, built, updated: out };
}

