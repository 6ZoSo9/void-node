// src/chain/receipts.ts
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as readline from 'node:readline'

export type Receipt = {
  h: string   // tx hash (lowercase 64-hex)
  n: number   // block number
  o: number   // tx offset within block
  ts: number  // block timestamp (or now)
}

type Opts = {
  shardSpan?: number // how many blocks per shard file
}

export class ReceiptsStore {
  private dir: string
  private shardSpan: number

  constructor (dir: string, opts: Opts = {}) {
    this.dir = dir
    this.shardSpan = Math.max(1, opts.shardSpan ?? 10_000)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  }

  // ---------- public API ----------

  /** Append a single receipt. */
  async append (r: Receipt): Promise<void> {
    const p = this.pathForBlock(r.n)
    await appendJsonlLine(p, r)
  }

  /** Append many receipts, grouped into correct shard files. */
  async appendMany (rs: Receipt[]): Promise<void> {
    if (!rs.length) return
    const groups = new Map<string, Receipt[]>()
    for (const r of rs) {
      const p = this.pathForBlock(r.n)
      if (!groups.has(p)) groups.set(p, [])
      groups.get(p)!.push(r)
    }
    for (const [p, arr] of groups) {
      await appendJsonlMany(p, arr)
    }
  }

  /**
   * Receipt lookup by tx hash.
   * Scans shard files from newest to oldest; stops at first match.
   * Returns {found:false} if not present.
   */
  get (hash: string): { ok: true, found: false } |
                       { ok: true, found: true, n: number, o: number, ts: number, shard: string } {
    const h = String(hash).toLowerCase()
    if (!/^[0-9a-f]{64}$/.test(h)) return { ok: true, found: false }

    const shards = this.listReceiptShards().sort((a, b) => b.from - a.from) // newest first
    for (const s of shards) {
      const p = s.path
      if (!fs.existsSync(p)) continue
      // Quick negative filter: if file is small, just read it; else stream it.
      const found = findInJsonl(p, h)
      if (found) {
        return { ok: true, found: true, n: found.n, o: found.o, ts: found.ts, shard: p }
      }
    }
    return { ok: true, found: false }
  }

  /**
   * Stats for UI/debug.
   * Lists shards with byte+line counts, and totals.
   */
  stats (): { ok: true, shards: { from: number, to: number, path: string, bytes: number, lines: number }[], totalBytes: number, totalLines: number } {
    const shards = this.listReceiptShards()
    let totalBytes = 0, totalLines = 0
    const out = shards.map(s => {
      const st = fs.existsSync(s.path) ? fs.statSync(s.path) : { size: 0 } as fs.Stats
      const lines = countLinesQuick(s.path)
      totalBytes += st.size
      totalLines += lines
      return { from: s.from, to: s.to, path: s.path, bytes: st.size, lines }
    })
    return { ok: true, shards: out, totalBytes, totalLines }
  }

  /**
   * GC: keep only the last `keepLast` shards (by block-span), delete older ones.
   */
  gc (keepLast: number): { ok: true, keepLast: number, removed: number, kept: number, details: { removed: string[], kept: string[] } } {
    const shards = this.listReceiptShards().sort((a, b) => a.from - b.from) // oldest first
    const keep = Math.max(0, keepLast|0)
    const toRemove = keep > 0 ? Math.max(0, shards.length - keep) : shards.length

    const removed: string[] = []
    const kept: string[] = []
    for (let i = 0; i < shards.length; i++) {
      const p = shards[i].path
      if (i < toRemove) {
        try { fs.unlinkSync(p); removed.push(p) } catch {}
      } else {
        kept.push(p)
      }
    }
    return { ok: true, keepLast: keep, removed: removed.length, kept: kept.length, details: { removed, kept } }
  }

  // ---------- internals ----------

  private pathForBlock (n: number): string {
    const from = Math.floor(n / this.shardSpan) * this.shardSpan
    const to = from + this.shardSpan - 1
    return path.join(this.dir, `rcpt-${from}-${to}.jsonl`)
  }

  private listReceiptShards (): { from: number, to: number, path: string }[] {
    if (!fs.existsSync(this.dir)) return []
    const files = fs.readdirSync(this.dir)
    const out: { from: number, to: number, path: string }[] = []
    for (const f of files) {
      const m = /^rcpt-(\d+)-(\d+)\.jsonl$/.exec(f)
      if (!m) continue
      const from = Number(m[1]), to = Number(m[2])
      if (!Number.isFinite(from) || !Number.isFinite(to)) continue
      out.push({ from, to, path: path.join(this.dir, f) })
    }
    return out
  }
}

// ---------- tiny IO helpers ----------

async function appendJsonlLine (p: string, obj: any): Promise<void> {
  await fs.promises.mkdir(path.dirname(p), { recursive: true })
  await fs.promises.appendFile(p, JSON.stringify(obj) + '\n', 'utf8')
}

async function appendJsonlMany (p: string, arr: any[]): Promise<void> {
  await fs.promises.mkdir(path.dirname(p), { recursive: true })
  const lines = arr.map(o => JSON.stringify(o)).join('\n') + '\n'
  await fs.promises.appendFile(p, lines, 'utf8')
}

/** Stream a JSONL file and return the first record whose "h" matches the hash. */
function findInJsonl (p: string, hash: string): Receipt | null {
  try {
    const fd = fs.openSync(p, 'r')
    const stream = fs.createReadStream('', { fd, encoding: 'utf8', autoClose: true })
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })
    return syncIterate(rl, hash)
  } catch { return null }
}

function syncIterate (rl: readline.Interface, hash: string): Receipt | null {
  // NOTE: readline is async by nature; we gather matches synchronously by
  // buffering lines quickly (these shards are modest). For simplicity in this
  // implementation, we read the whole file at once instead.
  // If files get large, switch to a fully async get() and await readline.
  (rl as any).close?.() // ensure it's closed—using the simple fallback version below
  try {
    const text = fs.readFileSync((rl as any).input.path ?? (rl as any).input.fd ?? '', 'utf8')
    const lines = text.split('\n')
    for (const s of lines) {
      const t = s.trim(); if (!t) continue
      try {
        const rec = JSON.parse(t) as Receipt
        if (rec.h === hash) return rec
      } catch {}
    }
  } catch {}
  return null
}

function countLinesQuick (p: string): number {
  try {
    const buf = fs.readFileSync(p)
    let n = 0
    for (let i = 0; i < buf.length; i++) if (buf[i] === 0x0a) n++
    return n
  } catch { return 0 }
}

