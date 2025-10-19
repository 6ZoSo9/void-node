// src/chain/receipts.ts
import fs from 'node:fs'
import path from 'node:path'

export type Receipt = {
  h: string  // tx hash (lowercase hex)
  n: number  // block number
  o: number  // offset within block
  ts: number // sealed-at timestamp (ms)
}

type ShardInfo = { from: number; to: number; path: string }

export class ReceiptsStore {
  private span: number
  constructor(private dir: string, opts?: { shardSpan?: number }) {
    this.span = Math.max(1_000, Number(opts?.shardSpan ?? 10_000))
    fs.mkdirSync(this.dir, { recursive: true })
  }

  private shardBoundsForBlock(n: number) {
    const from = Math.floor(n / this.span) * this.span
    const to = from + this.span - 1
    return { from, to }
  }
  shardForBlock(n: number): ShardInfo {
    const { from, to } = this.shardBoundsForBlock(n)
    const pathFile = path.join(this.dir, `rcp-${from}-${to}.jsonl`)
    return { from, to, path: pathFile }
  }

  /** Append receipts for a single block (one fs append per shard). */
  putMany(rs: Receipt[]) {
    if (!rs?.length) return
    const byShard = new Map<string, { path: string; lines: string[] }>()
    for (const r of rs) {
      const s = this.shardForBlock(r.n)
      const key = `${s.from}-${s.to}`
      if (!byShard.has(key)) byShard.set(key, { path: s.path, lines: [] })
      byShard.get(key)!.lines.push(JSON.stringify(r))
    }
    fs.mkdirSync(this.dir, { recursive: true })
    for (const g of byShard.values()) {
      fs.appendFileSync(g.path, g.lines.join('\n') + '\n', 'utf8')
    }
  }

  /** Lookup by hash across shards (newest-first optional). */
  get(hashLower: string): { found: true, n: number, o: number, ts: number } | { found: false } {
    if (!fs.existsSync(this.dir)) return { found: false }
    const shards = fs.readdirSync(this.dir)
      .map(f => ({ f, m: f.match(/^rcp-(\d+)-(\d+)\.jsonl$/) }))
      .filter(x => x.m)
      .map(x => ({ from: Number(x.m![1]), to: Number(x.m![2]), path: path.join(this.dir, x.f) }))
      .sort((a,b) => b.from - a.from) // newest first

    for (const s of shards) {
      try {
        const data = fs.readFileSync(s.path, 'utf8')
        let i = 0, start = 0
        while (i <= data.length) {
          if (i === data.length || data.charCodeAt(i) === 10) {
            const line = data.slice(start, i).trim()
            if (line) {
              try {
                const r = JSON.parse(line) as Receipt
                if (r.h === hashLower) return { found: true, n: r.n, o: r.o, ts: r.ts }
              } catch {}
            }
            start = i + 1
          }
          i++
        }
      } catch {}
    }
    return { found: false }
  }

  stats() {
    if (!fs.existsSync(this.dir)) {
      return { shards: [], totalBytes: 0, totalLines: 0 }
    }
    const out: any[] = []
    let totalBytes = 0, totalLines = 0
    for (const f of fs.readdirSync(this.dir)) {
      const m = f.match(/^rcp-(\d+)-(\d+)\.jsonl$/); if (!m) continue
      const p = path.join(this.dir, f)
      const bytes = fs.statSync(p).size
      const lines = fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).length
      out.push({ from: Number(m[1]), to: Number(m[2]), path: p, bytes, lines })
      totalBytes += bytes; totalLines += lines
    }
    out.sort((a,b) => a.from - b.from)
    return { shards: out, totalBytes, totalLines }
  }

  /** Optional: GC receipts in lockstep with tx-index shard GC. */
  gcKeepLast(keepLast: number): { removed: number, kept: number } {
    if (!fs.existsSync(this.dir)) return { removed: 0, kept: 0 }
    const shards = fs.readdirSync(this.dir)
      .filter(f => /^rcp-\d+-\d+\.jsonl$/.test(f))
      .sort((a,b) => {
        const A = Number(a.match(/^rcp-(\d+)-/i)![1])
        const B = Number(b.match(/^rcp-(\d+)-/i)![1])
        return A - B
      })
    if (shards.length <= keepLast) return { removed: 0, kept: shards.length }
    const toRemove = shards.slice(0, shards.length - keepLast)
    let removed = 0
    for (const f of toRemove) { try { fs.rmSync(path.join(this.dir, f)); removed++ } catch {} }
    return { removed, kept: shards.length - removed }
  }
}
