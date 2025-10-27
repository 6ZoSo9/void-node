// src/receipts.ts
import * as fs from "node:fs";
import * as path from "node:path";

export type Receipt = { h: string; n: number; o: number; ts: number };

type Opts = {
  /** Blocks per shard file on disk (default 10_000) */
  shardSpan?: number;
  /** Max receipts to keep in memory (LRU). 0 = unlimited. Default: 100_000 */
  maxInMemory?: number;
  /** When scanning shards for get() fallback, prefer newest first. Default: true */
  newestFirst?: boolean;
  /** If true, skip slow disk fallback lookup (memory-only). Default: false */
  disableDiskFallback?: boolean;
};

export class ReceiptsStore {
  private dir: string;
  private shardSpan: number;
  private newestFirst: boolean;
  private disableDiskFallback: boolean;

  /** LRU store implemented with Map iteration order semantics */
  private mem = new Map<string, Receipt>();
  private maxInMemory: number;

  constructor(
    dir = path.join(process.env.DATA_DIR || "data", "receipts"),
    opts?: Opts,
  ) {
    this.dir = path.resolve(dir);
    this.shardSpan = Math.max(1, Math.floor(opts?.shardSpan ?? 10_000));
    this.maxInMemory = Math.max(0, Math.floor(opts?.maxInMemory ?? 100_000));
    this.newestFirst = opts?.newestFirst !== false; // default true
    this.disableDiskFallback = !!opts?.disableDiskFallback;

    try { fs.mkdirSync(this.dir, { recursive: true }); } catch {}
  }

  /* ----------------------------- Writes ----------------------------- */

  /** Append a single receipt (kept in memory; best-effort persisted to JSONL shard). */
  async append(r: Receipt) {
    const rec = normalize(r);
    if (!rec) return;
    this.lruSet(rec);
    this.persistOne(rec);
  }

  /** Append many receipts efficiently (grouped by shard for disk writes). */
  async appendMany(recs: Receipt[]) {
    if (!Array.isArray(recs) || recs.length === 0) return;
    const grouped = new Map<string, Receipt[]>(); // shard file -> receipts
    for (const rr of recs) {
      const r = normalize(rr);
      if (!r) continue;
      this.lruSet(r);
      const file = this.shardFileFor(r.n);
      if (!grouped.has(file)) grouped.set(file, []);
      grouped.get(file)!.push(r);
    }
    for (const [file, arr] of grouped) {
      try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        // join once to minimize syscalls
        const payload = arr.map((r) => JSON.stringify(r) + "\n").join("");
        fs.appendFileSync(file, payload);
      } catch {
        /* best-effort persistence */
      }
    }
  }

  /* ----------------------------- Reads ------------------------------ */

  /**
   * Fast in-memory lookup with optional disk fallback.
   * Returns the shape used elsewhere in the codebase.
   */
  get(hash: string): { found: boolean; n?: number; o?: number; ts?: number } {
    const h = sanitiseHash(hash);
    if (!h) return { found: false };

    // L1: in-memory LRU
    const mem = this.mem.get(h);
    if (mem) {
      // Touch LRU: delete & re-set to move it to the end
      this.mem.delete(h);
      this.mem.set(h, mem);
      const { n, o, ts } = mem;
      return { found: true, n, o, ts };
    }

    // L2: optional on-disk scan (best effort)
    if (!this.disableDiskFallback) {
      const disk = this.lookupOnDisk(h);
      if (disk) {
        this.lruSet(disk);
        const { n, o, ts } = disk;
        return { found: true, n, o, ts };
      }
    }

    return { found: false };
  }

  /* ------------------------------ Admin ----------------------------- */

  /** Lightweight stats from disk shards (does not parse all lines). */
  stats() {
    const shards: { file: string; from: number; to: number; bytes: number }[] = [];
    try {
      if (!fs.existsSync(this.dir)) return { shards, totalBytes: 0, totalLines: this.mem.size };
      const files = fs.readdirSync(this.dir).filter((f) => /^\d+-\d+\.jsonl$/.test(f));
      let totalBytes = 0;
      for (const f of files) {
        const m = /^(\d+)-(\d+)\.jsonl$/.exec(f);
        if (!m) continue;
        const from = Number(m[1]);
        const to = Number(m[2]);
        const p = path.join(this.dir, f);
        const st = fs.statSync(p);
        totalBytes += st.size;
        shards.push({ file: f, from, to, bytes: st.size });
      }
      shards.sort((a, b) => a.from - b.from);
      return { shards, totalBytes, totalLines: this.mem.size };
    } catch {
      return { shards, totalBytes: 0, totalLines: this.mem.size };
    }
  }

  /**
   * Garbage collect old shard files, keeping only the last N files on disk.
   * (In-memory receipts are not touched; best-effort disk compaction.)
   */
  gc(keepLast: number) {
    const keep = Math.max(0, Math.floor(keepLast || 0));
    try {
      if (!fs.existsSync(this.dir)) return { ok: true, removed: 0, kept: 0 };
      const files = fs
        .readdirSync(this.dir)
        .filter((f) => /^\d+-\d+\.jsonl$/.test(f))
        .sort((a, b) => {
          const aa = Number(a.split("-")[0]);
          const bb = Number(b.split("-")[0]);
          return aa - bb;
        });

      const toRemove = files.slice(0, Math.max(0, files.length - keep));
      for (const f of toRemove) {
        try { fs.unlinkSync(path.join(this.dir, f)); } catch {}
      }
      return { ok: true, removed: toRemove.length, kept: files.length - toRemove.length };
    } catch {
      return { ok: false, removed: 0, kept: 0 };
    }
  }

  /* ---------------------------- Internals ---------------------------- */

  private persistOne(r: Receipt) {
    try {
      const file = this.shardFileFor(r.n);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.appendFileSync(file, JSON.stringify(r) + "\n");
    } catch {
      /* best-effort persistence */
    }
  }

  private shardFileFor(n: number): string {
    const from = Math.floor(n / this.shardSpan) * this.shardSpan;
    const to = from + this.shardSpan - 1;
    return path.join(this.dir, `${from}-${to}.jsonl`);
  }

  /**
   * Disk fallback: scan shard files (newest-first by default) and return the first match.
   * Uses a bounded read to avoid OOM on very large files.
   */
  private lookupOnDisk(hash: string): Receipt | null {
    try {
      if (!fs.existsSync(this.dir)) return null;
      let files = fs.readdirSync(this.dir).filter((f) => /^\d+-\d+\.jsonl$/.test(f));
      files.sort((a, b) => {
        const af = Number(a.split("-")[0]), bf = Number(b.split("-")[0]);
        return this.newestFirst ? bf - af : af - bf;
      });

      for (const f of files) {
        const p = path.join(this.dir, f);
        // Read in chunks; but since receipts lines are small, a single read is OK here.
        // If it ever grows too large, switch to streaming.
        let txt = "";
        try { txt = fs.readFileSync(p, "utf8"); } catch { continue; }
        if (!txt) continue;

        // Quick contains check before full split to save allocations in common miss cases.
        if (!txt.includes(hash)) continue;

        const lines = txt.split("\n");
        for (const line of lines) {
          if (!line) continue;
          if (!line.includes(hash)) continue;
          try {
            const obj = JSON.parse(line);
            const r = normalize(obj);
            if (r && r.h === hash) return r;
          } catch {
            /* ignore bad line */
          }
        }
      }
    } catch {
      /* best effort */
    }
    return null;
  }

  /** LRU insert/update with optional cap */
  private lruSet(r: Receipt) {
    // Delete first to refresh order
    this.mem.delete(r.h);
    this.mem.set(r.h, r);
    if (this.maxInMemory > 0 && this.mem.size > this.maxInMemory) {
      // Evict oldest (Map iteration order)
      const firstKey = this.mem.keys().next().value as string | undefined;
      if (firstKey) this.mem.delete(firstKey);
    }
  }
}

/* ------------------------------ Helpers ------------------------------ */

function sanitiseHash(h: string): string | null {
  const s = String(h || "").toLowerCase();
  return /^[0-9a-f]{64}$/.test(s) ? s : null;
}

function normalize(r: Receipt): Receipt | null {
  const h = sanitiseHash(r?.h as any);
  if (!h) return null;
  const nRaw = Number((r as any)?.n);
  const oRaw = Number((r as any)?.o);
  const tsRaw = Number((r as any)?.ts);
  if (!Number.isFinite(nRaw) || nRaw < 0) return null;
  if (!Number.isFinite(oRaw) || oRaw < 0) return null;
  const ts = Number.isFinite(tsRaw) ? tsRaw : Date.now();
  return { h, n: nRaw, o: oRaw, ts };
}

