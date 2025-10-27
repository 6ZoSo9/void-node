// src/util/kidx.ts
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as readline from 'node:readline'

/**
 * Very small in-process mutex so kidx builds never race each other.
 */
let kidxLock = Promise.resolve()
function withKidxLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = kidxLock.then(fn, fn) // chain either way
  // ensure future callers serialize after this one
  kidxLock = next.then(() => undefined, () => undefined)
  return next
}

/**
 * Build a .kidx file next to a JSONL shard.
 * JSONL lines: {"h": "<hash>", "n": <block>, "o": <offset>}
 * KIDX lines:  <hash>,<block>,<offset>\n
 */
export async function buildKidxForJsonl(jsonlPath: string): Promise<{ ok: true, kidxPath: string }> {
  return withKidxLock(async () => {
    const kidxPath = jsonlPath.replace(/\.jsonl$/, '.kidx')
    const tmpPath  = kidxPath + '.tmp'

    // Ensure JSONL exists (quietly succeed if not present)
    if (!fs.existsSync(jsonlPath)) return { ok: true, kidxPath }

    // Clean any stale tmp
    try { fs.unlinkSync(tmpPath) } catch {}

    const inStream  = fs.createReadStream(jsonlPath, { encoding: 'utf8' })
    const outStream = fs.createWriteStream(tmpPath,  { encoding: 'utf8' })

    const rl = readline.createInterface({ input: inStream, crlfDelay: Infinity })

    try {
      for await (const line of rl) {
        const s = line.trim()
        if (!s) continue
        try {
          const rec = JSON.parse(s) as { h: string, n: number, o: number }
          // write a compact CSV line
          outStream.write(`${(rec.h || '').toLowerCase()},${rec.n|0},${rec.o|0}\n`)
        } catch { /* ignore malformed lines */ }
      }
    } finally {
      // Close writer (and wait for 'close') before rename
      await new Promise<void>(resolve => outStream.end(resolve))
      // Also ensure read stream is shut down before rename
      try { inStream.close() } catch {}
    }

    // Atomic replace
    fs.renameSync(tmpPath, kidxPath)
    return { ok: true, kidxPath }
  })
}

/**
 * Scan all tx-*.jsonl shards under data/index and build missing/outdated .kidx files.
 * We currently treat “outdated” as “missing” to keep it simple and small.
 */
export async function buildAllKidx(): Promise<{ ok: true, built: number }> {
  return withKidxLock(async () => {
    const dir = path.join('data', 'index')
    if (!fs.existsSync(dir)) return { ok: true, built: 0 }

    const files = fs.readdirSync(dir)
      .filter(f => /^tx-\d+-\d+\.jsonl$/.test(f))
      .map(f => path.join(dir, f))

    let built = 0
    for (const jsonl of files) {
      const kidx = jsonl.replace(/\.jsonl$/, '.kidx')
      if (!fs.existsSync(kidx)) {
        await buildKidxForJsonl(jsonl)
        built++
      }
    }
    return { ok: true, built }
  })
}

/**
 * Fast point lookup in a .kidx file (CSV lines).
 * Returns {found,n,o} or {found:false}.
 */
export function queryKidx(kidxPath: string, hash: string): { found: true, n: number, o: number } | { found: false } {
  if (!fs.existsSync(kidxPath)) return { found: false }
  const needle = (hash || '').toLowerCase()

  const buf = fs.readFileSync(kidxPath, 'utf8')
  // very simple scan (files are small). Each line: "<hash>,<n>,<o>\n"
  let start = 0
  for (let i = 0; i <= buf.length; i++) {
    if (i === buf.length || buf.charCodeAt(i) === 10 /* \n */) {
      const line = buf.slice(start, i).trim()
      start = i + 1
      if (!line) continue
      const [h, nStr, oStr] = line.split(',', 3)
      if (h === needle) {
        const n = Number(nStr), o = Number(oStr)
        if (Number.isFinite(n) && Number.isFinite(o)) return { found: true, n, o }
      }
    }
  }
  return { found: false }
}

