// src/chain/mempool.ts
export type MemTx = { hash: string; body?: any };

export class Mempool {
  private q: MemTx[] = [];

  push(tx: MemTx) {
    if (!tx || typeof tx !== "object") return;
    if (!/^[0-9a-f]{64}$/i.test(String(tx.hash || ""))) return;
    this.q.push({ hash: String(tx.hash).toLowerCase(), body: tx.body ?? {} });
  }

  peekAll(): MemTx[] { return this.q.slice(); }
  clear() { this.q.length = 0; }

  drain(max?: number): MemTx[] {
    if (!max || max >= this.q.length) { const a = this.q; this.q = []; return a; }
    return this.q.splice(0, max);
  }
  popMany(max = 1000): MemTx[] { return this.drain(max); }
  take(max = 1000): MemTx[] { return this.drain(max); }
}

