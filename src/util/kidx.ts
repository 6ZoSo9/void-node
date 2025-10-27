// src/util/kidx.ts
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';

/** Serialize all .kidx builds so concurrent callers never trample each other (single-process lock). */
let kidxLock: Promise<unknown> = Promise.resolve();
function withKidxLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = kidxLock.then(fn, fn); // run regardless of prior error
  // future callers queue behind this one
  kidxLock = run.then(() => undefined, () => undefined);
  return run;
}

/** Ensure parent dir exists (best-effort, no throw). */
function ensureParentDir(p: string) {
  try { fs.mkdirSync(path.dirname(p), { recursive: true }); } catch {}
}

/** Build a .kidx file next to a JSONL shard. Safe + atomic. */
export async function buildKidxForJsonl(jsonlPath: string): Promise<{ ok: true; kidxPath: string }> {
  return withKidxLock(async () => {
    const kidxPath = jsonlPath.replace(/\.jsonl$/i, '.kidx');
    const tmpPath  = kidxPath + '.tmp';

    // If shard is missing, still ensure an empty .kidx exists for introspection UIs.
    if (!fs.existsSync(jsonlPath)) {
      ensureParentDir(kidxPath);
      try { fs.writeFileSync(kidxPath, ''); } catch {}
      return { ok: true, kidxPath };
    }

    // Clean any stale tmp
    try { fs.unlinkSync(tmpPath); } catch {}

    const inStream  = fs.createReadStream(jsonlPath, { encoding: 'utf8' });
    ensureParentDir(kidxPath);
    const outStream = fs.createWriteStream(tmpPath,  { encoding: 'utf8' });
    const rl = readline.createInterface({ input: inStream, crlfDelay: Infinity });

    try {
      for await (const line of rl) {
        const s = line.trim();
        if (!s) continue;
        try {
          // JSONL schema: {"h":"<64-hex>","n":<block>,"o":<offset>}
          const rec = JSON.parse(s) as { h: string; n: number; o: number };
          const h = String(rec?.h || '').toLowerCase();
          const n = rec?.n | 0;
          const o = rec?.o | 0;
          if (!/^[0-9a-f]{64}$/.test(h)) continue;
          if (!Number.isFinite(n) || !Number.isFinite(o)) continue;
          // Compact CSV for fast scanning
          outStream.write(`${h},${n},${o}\n`);
        } catch {
          // ignore malformed lines
        }
      }
    } finally {
      await new Promise<void>((resolve) => outStream.end(resolve));
      try { inStream.close(); } catch {}
    }

    // Atomic replace
    try {
      fs.renameSync(tmpPath, kidxPath);
    } catch {
      // Best effort cleanup and fallback
      try { fs.unlinkSync(tmpPath); } catch {}
      // If rename failed and no kidx exists, at least create an empty one
      try { if (!fs.existsSync(kidxPath)) fs.writeFileSync(kidxPath, ''); } catch {}
    }

    return { ok: true, kidxPath };
  });
}

/**
 * Scan all tx-*.jsonl shards under <baseDir>/index and build missing (or forced) .kidx files.
 * Default behavior: only build if missing. Pass { force:true } to rebuild all.
 */
export async function buildAllKidx(
  baseDir = 'data',
  opts?: { force?: boolean }
): Promise<{ ok: true; built: number }> {
  return withKidxLock(async () => {
    const dir = path.join(baseDir, 'index');
    if (!fs.existsSync(dir)) return { ok: true, built: 0 };

    const files = fs
      .readdirSync(dir)
      .filter((f) => /^tx-\d+-\d+\.jsonl$/i.test(f))
      .map((f) => path.join(dir, f));

    let built = 0;
    for (const jsonl of files) {
      const kidx = jsonl.replace(/\.jsonl$/i, '.kidx');
      if (opts?.force || !fs.existsSync(kidx)) {
        await buildKidxForJsonl(jsonl);
        built++;
      }
    }
    return { ok: true, built };
  });
}

/** Fast point-lookup in a .kidx file (CSV). */
export function queryKidx(
  kidxPath: string,
  hash: string
): { found: true; n: number; o: number } | { found: false } {
  if (!fs.existsSync(kidxPath)) return { found: false };
  const needle = String(hash || '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(needle)) return { found: false };

  try {
    const buf = fs.readFileSync(kidxPath, 'utf8');
    // Scan lines without split to keep memory down and avoid extra arrays.
    let start = 0;
    for (let i = 0; i <= buf.length; i++) {
      const isNL = i === buf.length || buf.charCodeAt(i) === 10 /* \n */;
      if (!isNL) continue;

      const line = buf.slice(start, i).trim();
      start = i + 1;
      if (!line) continue;

      // Expect "hash,n,o"
      const c1 = line.indexOf(',');
      if (c1 <= 0) continue;
      const c2 = line.indexOf(',', c1 + 1);
      if (c2 <= c1 + 1) continue;

      const h = line.slice(0, c1);
      if (h !== needle) continue;

      const nStr = line.slice(c1 + 1, c2);
      const oStr = line.slice(c2 + 1);

      const n = Number(nStr);
      const o = Number(oStr);
      if (Number.isFinite(n) && Number.isFinite(o)) return { found: true, n, o };
    }
  } catch {
    // fall through to "not found"
  }
  return { found: false };
}

/* Optional helper (kept internal): ensure a shard’s kidx exists, unless force. */
export async function ensureKidxForShard(jsonlPath: string, force = false) {
  const kidxPath = jsonlPath.replace(/\.jsonl$/i, '.kidx');
  if (force || !fs.existsSync(kidxPath)) {
    await buildKidxForJsonl(jsonlPath);
  }
  return kidxPath;
}

