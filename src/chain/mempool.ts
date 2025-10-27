// src/chain/mempool.ts
export type Tx = { hash: string; body: Record<string, any> };

/**
 * FIFO mempool with global hash de-duplication.
 * - `seen` set is NOT cleared by drains to resist replay/spam.
 * - Compatible with all access patterns used by Node:
 *   - drain/popMany/take(max?), peekAll(), clear(), push()
 */
export class Mempool {
  private order: Tx[] = [];         // FIFO queue
  private seen = new Set<string>(); // global hash de-duplication

  /** Add a tx if new (by 64-hex hash); normalizes hash to lowercase. */
  push(tx: Tx): void {
    if (!tx || typeof tx !== "object") throw new Error("tx must be an object");
    const h = String((tx as any).hash || "").toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(h)) throw new Error("bad tx hash");
    const body = (tx as any).body;
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new Error("tx.body must be an object");
    }
    if (this.seen.has(h)) return; // de-dupe across lifetime
    this.seen.add(h);
    this.order.push({ hash: h, body });
  }

  /** Number of queued txs. */
  size(): number {
    return this.order.length;
  }

  /** True if we’ve ever seen this tx hash (even if drained). */
  has(hash: string): boolean {
    return this.seen.has(String(hash || "").toLowerCase());
  }

  /** Shallow copy of current queue (no removal). */
  peekAll(): Tx[] {
    return this.order.slice();
  }

  /** Remove and return up to `max` oldest txs (default: all). */
  drain(max?: number): Tx[] {
    if (!this.order.length) return [];
    const limit = Number.isFinite(max as number) ? Math.max(0, Number(max)) : this.order.length;
    if (limit <= 0) return [];
    const n = Math.min(limit, this.order.length);
    const out = this.order.slice(0, n);
    this.order = this.order.slice(n);
    return out;
  }

  /** Alias of drain(max) for compatibility. */
  popMany(max?: number): Tx[] {
    return this.drain(max);
  }

  /** Another alias used by some callers. */
  take(max?: number): Tx[] {
    return this.drain(max);
  }

  /** Clear only the queue (keep `seen` for spam resistance). */
  clear(): void {
    this.order = [];
  }

  /** Testing helper: forget dedupe history. Not used in production paths. */
  _resetSeen(): void {
    this.seen.clear();
  }
}

