// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

// src/chain/txindex.ts
import * as fs from "node:fs";
import * as path from "node:path";

type Ref = { h: string; n: number; o: number };

function recordTxIndexBestEffortFailure(scope: string, err: unknown, meta: Record<string, unknown> = {}): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn("VOID_CHAIN_TXINDEX_EMPTY_CATCH_VISIBILITY_FAILURE_VISIBLE", {
    scope,
    message,
    ...meta,
  });
}

/**
 * Simple append-only tx index:
 *   index/tx-00000000.jsonl with refs {"h":hash,"n":block,"o":offset}
 */
export class TxIndex {
  private dir: string;
  private span = 10_000;

  constructor(dir: string) {
    this.dir = dir;
    if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
  }

  private baseFor(n: number) { return Math.floor(n / this.span) * this.span; }
  private fileForBase(base: number) { return path.join(this.dir, `tx-${String(base).padStart(8, "0")}.jsonl`); }

  shardForBlock(n: number) {
    const base = this.baseFor(n);
    return { from: base, to: base + this.span - 1, path: this.fileForBase(base) };
  }

  listShards(): Array<{ from: number; to: number; path: string }> {
    const out: Array<{ from: number; to: number; path: string }> = [];
    try {
      for (const f of fs.readdirSync(this.dir)) {
        const m = f.match(/^tx-(\d{8})\.jsonl$/);
        if (!m) continue;
        const base = Number(m[1]);
        out.push({ from: base, to: base + this.span - 1, path: path.join(this.dir, f) });
      }
    } catch (err) {
      recordTxIndexBestEffortFailure("list-shards-directory-scan", err, { dir: this.dir });
    }
    out.sort((a, b) => a.from - b.from);
    return out;
  }

  putMany(refs: Ref[]) {
    if (!Array.isArray(refs) || refs.length === 0) return;
    const groups = new Map<number, Ref[]>();
    for (const r of refs) {
      const h = String(r.h || "").toLowerCase();
      if (!/^[0-9a-f]{64}$/.test(h)) continue;
      if (!Number.isFinite(r.n) || !Number.isFinite(r.o)) continue;
      const base = this.baseFor(r.n);
      if (!groups.has(base)) groups.set(base, []);
      groups.get(base)!.push({ h, n: r.n, o: r.o });
    }
    fs.mkdirSync(this.dir, { recursive: true });
    for (const [base, items] of groups) {
      const file = this.fileForBase(base);
      const lines = items.map((i) => JSON.stringify(i)).join("\n") + "\n";
      fs.appendFileSync(file, lines);
    }
  }

  lookupInShard(file: string, hashHex: string): { found: boolean; n: number; o: number } {
    const needle = String(hashHex || "").toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(needle)) return { found: false, n: -1, o: -1 };
    try {
      const lines = fs.readFileSync(file, "utf8").split("\n");
      for (const line of lines) {
        if (!line) continue;
        const r = JSON.parse(line) as Ref;
        if (r.h === needle) return { found: true, n: r.n, o: r.o };
      }
    } catch (err) {
      recordTxIndexBestEffortFailure("lookup-in-shard-read-parse", err, { file, hashHex: needle });
    }
    return { found: false, n: -1, o: -1 };
  }
}

