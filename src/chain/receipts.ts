// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

// src/chain/receipts.ts
import * as fs from "node:fs";
import * as path from "node:path";

function recordSmallEmptyCatchVisibilityFailure_src_chain_receipts_ts(scope: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn("VOID_SMALL_EMPTY_CATCH_VISIBILITY_PACK_V1_FAILURE_VISIBLE", {
    file: "src/chain/receipts.ts",
    scope,
    message,
  });
}


type Receipt = { h: string; n: number; o: number; ts: number };

export class ReceiptsStore {
  private dir: string;
  private shardSpan: number;
  private mem = new Map<string, { n: number; o: number; ts: number; found: true }>();

  constructor(dir: string, opts: { shardSpan?: number } = {}) {
    this.dir = dir;
    this.shardSpan = Math.max(10_000, Number(opts.shardSpan ?? 100_000));
    if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
  }

  private shardPathFromHead(): string {
    const base = Math.floor(this.mem.size / this.shardSpan) * this.shardSpan;
    return path.join(this.dir, `receipts-${String(base).padStart(8, "0")}.jsonl`);
  }

  async appendMany(arr: Receipt[]) {
    if (!Array.isArray(arr) || arr.length === 0) return;
    await fs.promises.mkdir(this.dir, { recursive: true });
    const p = this.shardPathFromHead();
    const lines = arr
      .map((r) => ({
        h: String(r.h || "").toLowerCase(),
        n: Number(r.n),
        o: Number(r.o),
        ts: Number(r.ts) || Date.now(),
      }))
      .filter((r) => /^[0-9a-f]{64}$/.test(r.h) && Number.isFinite(r.n) && Number.isFinite(r.o))
      .map((r) => {
        this.mem.set(r.h, { n: r.n, o: r.o, ts: r.ts, found: true });
        return JSON.stringify(r);
      })
      .join("\n");
    if (lines) await fs.promises.appendFile(p, lines + "\n");
  }

  get(hashHex: string) {
    const h = String(hashHex || "").toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(h)) return { found: false };
    const val = this.mem.get(h);
    if (val) return val;

    try {
      const files = fs
        .readdirSync(this.dir)
        .filter((f) => /^receipts-\d{8}\.jsonl$/.test(f))
        .sort((a, b) => b.localeCompare(a));
      for (const f of files) {
        const p = path.join(this.dir, f);
        const data = fs.readFileSync(p, "utf8").split("\n");
        for (const line of data) {
          if (!line) continue;
          try {
            const r = JSON.parse(line) as Receipt;
            if (r.h === h) {
              const out = { n: r.n, o: r.o, ts: r.ts, found: true } as const;
              this.mem.set(h, out);
              return out;
            }
          } catch (err) { recordSmallEmptyCatchVisibilityFailure_src_chain_receipts_ts("empty-catch-1", err); }
        }
      }
    } catch (err) { recordSmallEmptyCatchVisibilityFailure_src_chain_receipts_ts("empty-catch-2", err); }
    return { found: false };
  }

  stats() {
    let totalBytes = 0;
    let totalLines = 0;
    const shards: { file: string; bytes: number; lines: number }[] = [];
    try {
      const files = fs
        .readdirSync(this.dir)
        .filter((f) => /^receipts-\d{8}\.jsonl$/.test(f))
        .sort();
      for (const f of files) {
        const p = path.join(this.dir, f);
        const st = fs.statSync(p);
        const lines = Math.max(0, fs.readFileSync(p, "utf8").split("\n").filter(Boolean).length);
        shards.push({ file: f, bytes: st.size, lines });
        totalBytes += st.size;
        totalLines += lines;
      }
    } catch (err) { recordSmallEmptyCatchVisibilityFailure_src_chain_receipts_ts("empty-catch-3", err); }
    return { shards, totalBytes, totalLines };
  }

  gc(keepLast = 1) {
    let removed = 0;
    let kept = 0;
    try {
      const files = fs
        .readdirSync(this.dir)
        .filter((f) => /^receipts-\d{8}\.jsonl$/.test(f))
        .sort((a, b) => b.localeCompare(a));
      const toDelete = files.slice(Math.max(1, Number(keepLast) || 1));
      for (const f of toDelete) {
        fs.rmSync(path.join(this.dir, f), { force: true });
        removed++;
      }
      kept = files.length - removed;
    } catch (err) { recordSmallEmptyCatchVisibilityFailure_src_chain_receipts_ts("empty-catch-4", err); }
    return { ok: true, keepLast: Math.max(1, Number(keepLast) || 1), removed, kept };
  }
}

