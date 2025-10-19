// src/chain/txindex.ts
import fs from 'node:fs'
import path from 'node:path'

export type TxRef = { h: string; n: number; o: number }
export type ShardInfo = { from: number; to: number; path: string }

export class TxIndex {
  private span: number

  constructor(private dir: string, opts?: { shardSpan?: number }) {
    this.span = Math.max(1_000, Number(opts?.shardSpan ?? 10_000)) // 10k-block shards
    fs.mkdirSync(this.dir, { recursive: true })
  }

  private fileForRange(from: number, to: number) {
    return path.join(this.dir, `tx-${from}-${to}.jsonl`)
  }

  shardBoundsForBlock(n: number) {
    const from = Math.floor(n / this.span) * this.span
    const to = from + this.span - 1
    return { from, to }
  }

  shardForBlock(n: number): ShardInfo {
    const { from, to } = this.shardBoundsForBlock(n)
    const p = this.fileForRange(from, to)
    return { from, to, path: p }
  }

  listShards(): ShardInfo[] {
    if (!fs.existsSync(this.dir)) return []
    const out: ShardInfo[] = []
    for (const f of fs.readdirSync(this.dir)) {
      const m = f.match(/^tx-(\d+)-(\d+)\.jsonl$/)
      if (!m) continue
      const from = Number(m[1]), to = Number(m[2])
      out.push({ from, to, path: path.join(this.dir, f) })
    }
    out.sort((a, b) => a.from - b.from)
    return out
  }

  /** Append many tx refs; groups by shard and does one append per shard. */
  putMany(refs: TxRef[]) {
    if (!refs?.length) return
    const groups = new Map<string, { path: string; lines: string[] }>()
    for (const r of refs) {
      const s = this.shardForBlock(r.n)
      const key = `${s.from}-${s.to}`
      if (!groups.has(key)) groups.set(key, { path: s.path, lines: [] })
      groups.get(key)!.lines.push(JSON.stringify({
        h: String(r.h).toLowerCase(), n: r.n, o: r.o
      }))
    }
    fs.mkdirSync(this.dir, { recursive: true })
    for (const g of groups.values()) {
      fs.appendFileSync(g.path, g.lines.join('\n') + '\n', 'utf8')
    }
  }

  /** Fallback scan when .kidx is missing. */
  lookupInShard(jsonlPath: string, hashLower: string):
    | { found: true, n: number, o: number }
    | { found: false } {
    if (!fs.existsSync(jsonlPath)) return { found: false }
    const data = fs.readFileSync(jsonlPath, 'utf8')
    let i = 0, start = 0
    while (i <= data.length) {
      if (i === data.length || data.charCodeAt(i) === 10 /*\n*/) {
        const line = data.slice(start, i).trim()
        if (line) {
          try {
            const rec = JSON.parse(line) as TxRef
            if (rec.h === hashLower) return { found: true, n: rec.n, o: rec.o }
          } catch {}
        }
        start = i + 1
      }
      i++
    }
    return { found: false }
  }

  /** Delete older shards, keeping only the newest N shards (JSONL + .kidx). */
  gc(keepLast: number): { removed: number; kept: number; details: { removed: string[]; kept: string[] } } {
    const shards = this.listShards()
    if (keepLast <= 0) keepLast = 1
    if (shards.length <= keepLast) {
      return { removed: 0, kept: shards.length, details: { removed: [], kept: shards.map(s => s.path) } }
    }
    const toRemove = shards.slice(0, Math.max(0, shards.length - keepLast))
    const removedPaths: string[] = []
    for (const s of toRemove) {
      const jsonl = s.path
      const kidx = s.path.replace(/\.jsonl$/, '.kidx')
      try { if (fs.existsSync(jsonl)) { fs.rmSync(jsonl); removedPaths.push(jsonl) } } catch {}
      try { if (fs.existsSync(kidx))  { fs.rmSync(kidx);  removedPaths.push(kidx) } } catch {}
    }
    const kept = this.listShards().length
    return { removed: removedPaths.length, kept, details: { removed: removedPaths, kept: this.listShards().map(s => s.path) } }
  }
}

