// src/chain/txindex.ts
import * as fs from 'node:fs';
import * as path from 'node:path';

export type TxRef = { h: string; n: number; o: number };
export type ShardInfo = { from: number; to: number; path: string };

export class TxIndex {
  private span: number;

  constructor(private dir: string, opts?: { shardSpan?: number }) {
    this.span = Math.max(1_000, Number(opts?.shardSpan ?? 10_000)); // default 10k-block shards
    try { fs.mkdirSync(this.dir, { recursive: true }); } catch {}
  }

  /* ---------- shard math / paths ---------- */

  private fileForRange(from: number, to: number) {
    return path.join(this.dir, `tx-${from}-${to}.jsonl`);
  }

  shardBoundsForBlock(n: number) {
    const from = Math.floor(n / this.span) * this.span;
    const to = from + this.span - 1;
    return { from, to };
  }

  shardForBlock(n: number): ShardInfo {
    const { from, to } = this.shardBoundsForBlock(n);
    return { from, to, path: this.fileForRange(from, to) };
  }

  listShards(): ShardInfo[] {
    if (!fs.existsSync(this.dir)) return [];
    const out: ShardInfo[] = [];
    for (const f of safeReaddir(this.dir)) {
      const m = /^tx-(\d+)-(\d+)\.jsonl$/.exec(f);
      if (!m) continue;
      const from = Number(m[1]);
      const to = Number(m[2]);
      if (!Number.isFinite(from) || !Number.isFinite(to)) continue;
      out.push({ from, to, path: path.join(this.dir, f) });
    }
    out.sort((a, b) => a.from - b.from);
    return out;
  }

  /* ---------- writes ---------- */

  /** Append many tx refs; groups by shard and does one append per shard. */
  putMany(refs: TxRef[]) {
    if (!Array.isArray(refs) || refs.length === 0) return;

    const groups = new Map<string, { path: string; lines: string[] }>();
    for (const r of refs) {
      if (!r || !Number.isFinite(r.n) || !Number.isFinite(r.o) || typeof r.h !== 'string') continue;
      const s = this.shardForBlock(r.n);
      const key = `${s.from}-${s.to}`;
      const entry = groups.get(key) ?? { path: s.path, lines: [] };
      // normalize hash to lowercase once
      entry.lines.push(JSON.stringify({ h: r.h.toLowerCase(), n: r.n, o: r.o }));
      groups.set(key, entry);
    }
    if (groups.size === 0) return;

    try { fs.mkdirSync(this.dir, { recursive: true }); } catch {}
    for (const g of groups.values()) {
      try {
        fs.appendFileSync(g.path, g.lines.join('\n') + '\n', 'utf8');
      } catch {
        /* best effort */
      }
    }
  }

  /* ---------- reads ---------- */

  /**
   * Fallback scan when .kidx is missing.
   * Scans a single JSONL shard for the exact lowercase hash.
   */
  lookupInShard(
    jsonlPath: string,
    hashLower: string
  ): { found: true; n: number; o: number } | { found: false } {
    try {
      if (!fs.existsSync(jsonlPath)) return { found: false };
      const data = fs.readFileSync(jsonlPath, 'utf8');
      let i = 0, start = 0;
      while (i <= data.length) {
        if (i === data.length || data.charCodeAt(i) === 10 /* \n */) {
          const line = data.slice(start, i).trim();
          if (line) {
            try {
              const rec = JSON.parse(line) as TxRef;
              if (typeof rec?.h === 'string' && rec.h === hashLower) {
                return { found: true, n: rec.n, o: rec.o };
              }
            } catch { /* ignore bad line */ }
          }
          start = i + 1;
        }
        i++;
      }
    } catch { /* ignore IO errors */ }
    return { found: false };
  }

  /* ---------- maintenance ---------- */

  /** Delete older shards, keeping only the newest N shards (JSONL + .kidx). */
  gc(keepLast: number): {
    removed: number; kept: number;
    details: { removed: string[]; kept: string[] }
  } {
    const shards = this.listShards();
    const keep = Math.max(1, keepLast | 0);
    if (shards.length <= keep) {
      return { removed: 0, kept: shards.length, details: { removed: [], kept: shards.map(s => s.path) } };
    }

    const toRemove = shards.slice(0, Math.max(0, shards.length - keep));
    const removedPaths: string[] = [];

    for (const s of toRemove) {
      const jsonl = s.path;
      const kidx = s.path.replace(/\.jsonl$/, '.kidx');
      try { if (fs.existsSync(jsonl)) { fs.rmSync(jsonl); removedPaths.push(jsonl); } } catch {}
      try { if (fs.existsSync(kidx))  { fs.rmSync(kidx);  removedPaths.push(kidx); } } catch {}
    }

    const remaining = this.listShards();
    return {
      removed: removedPaths.length,
      kept: remaining.length,
      details: { removed: removedPaths, kept: remaining.map(s => s.path) }
    };
  }

  /** Lightweight stats for observability / debugging. */
  stats(): {
    ok: true;
    shards: { from: number; to: number; path: string; bytes: number; lines: number; hasKidx: boolean }[];
    totalBytes: number;
    totalLines: number;
  } {
    const shards = this.listShards();
    let totalBytes = 0, totalLines = 0;
    const out = shards.map(s => {
      const st = safeStat(s.path);
      const bytes = st?.size ?? 0;
      const lines = countLinesQuick(s.path);
      const hasKidx = fs.existsSync(s.path.replace(/\.jsonl$/, '.kidx'));
      totalBytes += bytes;
      totalLines += lines;
      return { from: s.from, to: s.to, path: s.path, bytes, lines, hasKidx };
    });
    return { ok: true, shards: out, totalBytes, totalLines };
  }
}

/* ---------- small fs helpers ---------- */

function safeReaddir(dir: string): string[] {
  try { return fs.existsSync(dir) ? fs.readdirSync(dir) : []; } catch { return []; }
}
function safeStat(p: string): fs.Stats | null {
  try { return fs.existsSync(p) ? fs.statSync(p) : null; } catch { return null; }
}
function countLinesQuick(p: string): number {
  try {
    const buf = fs.readFileSync(p);
    let n = 0;
    for (let i = 0; i < buf.length; i++) if (buf[i] === 0x0a) n++;
    return n;
  } catch { return 0; }
}

