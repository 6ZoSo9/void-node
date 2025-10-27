// src/mempool.ts
export type Tx = { hash: string; body: Record<string, any> };

export class Mempool {
  private order: Tx[] = [];
  private seen = new Set<string>();

  push(tx: Tx) {
    const h = String(tx?.hash || "").toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(h)) throw new Error("bad tx hash");
    if (this.seen.has(h)) return; // dedupe
    this.seen.add(h);
    this.order.push({ ...tx, hash: h });
  }

  size() { return this.order.length; }

  peekAll(): Tx[] { return this.order.slice(); }

  // drain the queue (used by proposer)
  flushAll(): Tx[] {
    const out = this.order;
    this.order = [];
    // keep seen set for spam resistance (avoids re-accepting same hash)
    return out;
  }
}
