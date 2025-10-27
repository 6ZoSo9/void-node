// src/chain/receipts.ts
import * as fs from 'node:fs'
import * as path from 'node:path'

export type Receipt = {
  h: string   // tx hash (lowercase 64-hex)
  n: number   // block number
  o: number   // tx offset within block
  ts: number  // block timestamp (or now)
}

type Opts = {
  shardSpan?: number // how many blocks per shard file (default 10_000)
}

export class ReceiptsStore {
  private dir: string
  private shardSpan: number

  constructor (dir: string, opts: Opts = {}) {
    this.dir = path.resolve(dir)
    this.shardSpan = Math.max(1, Math.floor(opts.shardSpan ?? 10_000))
    try { fs.mkdirSync(this.dir, { recursive: true }) } catch {}
  }

  // ---------- public API ----------

  /** Append a single receipt. */
  async append (r: Receipt): Promise<void> {
    const rec = normalize(r)
    const p = this.pathForBlock(rec.n)
    await appendJsonlMany(p, [rec])
  }

  /** Append many receipts, grouped into correct shard files. */
  async appendMany (rs: Receipt[]): Promise<void> {
    if (!Array.isArray(rs) || rs.length === 0) return
    const groups = new Map<string, Receipt[]>()
    for (const rr of rs) {
      const rec = normalize(rr)
      const p = this.pathForBlock(rec.n)
      if (!groups.has(p)) groups.set(p, [])
      groups.get(p)!.push(rec)
    }
    for (const [p, arr] of groups) {
      await appendJsonlMany(p, arr)
    }
  }

  /**
   * Receipt lookup by tx hash.
   * Scans shard files from newest to oldest; stops at first match.
   * Returns {ok:true, found:false} if not present.
   */
  get (hash: string):
    | { ok: true, found: false }
    | { ok: true, found: true, n: number, o: number, ts: number, shard: string } {
    const h = String(hash || '').toLowerCase()
    if (!/^[0-9a-f]{64}$/.test(h)) return { ok: true, found: false }

    const shards = this.listReceiptShards().sort((a, b) => b.from - a.from) // newest first
    for (const s of shards) {
      const rec = findInJsonlSync(s.path, h)
      if (rec) return { ok: true, found: true, n: rec.n, o: rec.o, ts: rec.ts, shard: s.path }
    }
    return { ok: true, found: false }
  }

  /** Stats for UI/debug (sizes and fast line counts). */
  stats (): {
    ok: true,
    shards: { from: number, to: number, path: string, bytes: number, lines: number }[],
    totalBytes: number, totalLines: number
  } {
    const shards = this.listReceiptShards()
    let totalBytes = 0, totalLines = 0
    const out = shards.map(s => {
      const st = fs.existsSync(s.path) ? fs.statSync(s.path) : ({ size: 0 } as fs.Stats)
      const lines = countLinesQuick(s.path)
      totalBytes += st.size
      totalLines += lines
      return { from: s.from, to: s.to, path: s.path, bytes: st.size, lines }
    })
    return { ok: true, shards: out, totalBytes, totalLines }
  }

  /**
   * GC: keep only the last `keepLast` shards (by block-span), delete older ones.
   * Returns lists of removed/kept for observability.
   */
  gc (keepLast: number): {
    ok: true, keepLast: number, removed: number, kept: number,
    details: { removed: string[], kept: string[] }
  } {
    const shards = this.listReceiptShards().sort((a, b) => a.from - b.from) // oldest first
    const keep = Math.max(0, keepLast | 0)
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

// ---------- helpers ----------

function normalize (r: Receipt): Receipt {
  return {
    h: String(r.h || '').toLowerCase(),
    n: Number(r.n || 0),
    o: Number(r.o || 0),
    ts: Number.isFinite(r.ts) ? Number(r.ts) : Date.now(),
  }
}

async function appendJsonlMany (p: string, arr: any[]): Promise<void> {
  await fs.promises.mkdir(path.dirname(p), { recursive: true })
  const lines = arr.map(o => JSON.stringify(o)).join('\n') + '\n'
  await fs.promises.appendFile(p, lines, 'utf8')
}

/** Fast, synchronous scan of a JSONL file for a receipt with hash `h`. */
function findInJsonlSync (p: string, h: string): Receipt | null {
  try {
    if (!fs.existsSync(p)) return null
    const text = fs.readFileSync(p, 'utf8')
    const lines = text.split('\n')
    for (const line of lines) {
      const t = line.trim()
      if (!t) continue
      try {
        const rec = JSON.parse(t) as Receipt
        if (String(rec.h).toLowerCase() === h) return rec
      } catch { /* ignore bad lines */ }
    }
  } catch { /* ignore I/O issues */ }
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

