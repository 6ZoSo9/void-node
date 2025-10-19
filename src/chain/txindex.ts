import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'

type Ref = { h: string; n: number; o: number }

function ensureDir (dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

/**
 * Compact, append-only JSONL shards:
 *   data/index/tx-0-9999.jsonl
 *   data/index/tx-10000-19999.jsonl
 *   ...
 * Each line: {"h":"<64-hex>","n":<block>,"o":<offset>}
 *
 * We keep it tiny (no duplication, no per-tx JSON) to avoid index bloat.
 */
export class TxIndex {
  readonly indexDir: string
  // 10k-block shards; easy to change later without touching readers
  readonly shardSpan = 10_000

  constructor (indexDir: string) {
    this.indexDir = indexDir
    ensureDir(this.indexDir)
  }

  /** Return shard file path that should contain refs for block n */
  private shardPathForBlock (n: number): string {
    const base = Math.floor(n / this.shardSpan) * this.shardSpan
    const to = base + this.shardSpan - 1
    return path.join(this.indexDir, `tx-${base}-${to}.jsonl`)
  }

  /** Append many refs, grouped by shard to minimize fs churn */
  putMany (refs: Ref[]) {
    if (!refs.length) return
    // normalize hashes once
    for (const r of refs) r.h = String(r.h || '').toLowerCase()

    // group by shard path
    const grouped = new Map<string, Ref[]>()
    for (const r of refs) {
      const p = this.shardPathForBlock(r.n)
      if (!grouped.has(p)) grouped.set(p, [])
      grouped.get(p)!.push(r)
    }

    for (const [file, list] of grouped) {
      const lines = list.map(r => JSON.stringify({ h: r.h, n: r.n, o: r.o })).join('\n') + '\n'
      fs.appendFileSync(file, lines)
    }
  }

  /**
   * List all known shards on disk.
   * Example return:
   *   [{ path:".../tx-0-9999.jsonl", from:0, to:9999 }, ...]
   */
  listShards (): { path: string, from: number, to: number }[] {
    if (!fs.existsSync(this.indexDir)) return []
    const out: { path: string, from: number, to: number }[] = []
    for (const f of fs.readdirSync(this.indexDir)) {
      const m = /^tx-(\d+)-(\d+)\.jsonl$/.exec(f)
      if (!m) continue
      const from = Number(m[1]); const to = Number(m[2])
      if (!Number.isFinite(from) || !Number.isFinite(to)) continue
      out.push({ path: path.join(this.indexDir, f), from, to })
    }
    // sort by "from" ascending
    out.sort((a, b) => a.from - b.from)
    return out
  }

  /**
   * Fallback scan of a single shard (used when .kidx isn’t present).
   * Returns {found, n, o}.
   */
  lookupInShard (jsonlPath: string, hashHex: string): { found: boolean, n: number, o: number } {
    if (!fs.existsSync(jsonlPath)) return { found: false, n: 0, o: 0 }
    const target = String(hashHex || '').toLowerCase()

    // Fast path: small files — read whole and scan.
    // Still bounded because shards are compact.
    const buf = fs.readFileSync(jsonlPath, 'utf8')
    const lines = buf.split('\n')
    for (const line of lines) {
      if (!line) continue
      try {
        const rec = JSON.parse(line) as any
        if (rec?.h === target) return { found: true, n: rec.n >>> 0, o: rec.o >>> 0 }
      } catch { /* ignore bad lines */ }
    }
    return { found: false, n: 0, o: 0 }
  }

  /**
   * Streaming scan helper (not used right now — kept for very large shards).
   * Slightly slower per line but constant memory.
   */
  async lookupInShardStream (jsonlPath: string, hashHex: string): Promise<{ found: boolean, n: number, o: number }> {
    if (!fs.existsSync(jsonlPath)) return { found: false, n: 0, o: 0 }
    const target = String(hashHex || '').toLowerCase()
    const rl = readline.createInterface({ input: fs.createReadStream(jsonlPath), crlfDelay: Infinity })
    for await (const line of rl) {
      if (!line) continue
      try {
        const rec = JSON.parse(line) as any
        if (rec?.h === target) return { found: true, n: rec.n >>> 0, o: rec.o >>> 0 }
      } catch {}
    }
    return { found: false, n: 0, o: 0 }
  }
}

