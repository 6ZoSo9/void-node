// src/receipts.ts
export type Receipt = { h: string; n: number; o: number; ts: number };

export class Receipts {
  private byHash = new Map<string, Receipt>();

  async appendMany(recs: Receipt[]) {
    for (const r of recs) this.byHash.set(String(r.h).toLowerCase(), r);
  }
  async append(r: Receipt) { this.byHash.set(String(r.h).toLowerCase(), r); }

  get(hash: string): { found: boolean; n?: number; o?: number; ts?: number } {
    const h = String(hash).toLowerCase();
    const r = this.byHash.get(h);
    if (!r) return { found: false };
    const { n, o, ts } = r;
    return { found: true, n, o, ts };
  }

  // optional diagnostics
  stats() {
    return { shards: [], totalBytes: 0, totalLines: this.byHash.size };
  }
  gc(_keepLast: number) { return { ok: true, removed: 0, kept: this.byHash.size }; }
}
