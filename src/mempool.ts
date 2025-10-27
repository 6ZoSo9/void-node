// src/mempool.ts
export type Tx = { hash: string; body: Record<string, any> };

type MempoolOpts = {
  /** Hard cap on in-queue txs; newest txs are dropped when full (default: unlimited). */
  maxSize?: number;
  /** Optional cap for the seen set to prevent unbounded growth. Oldest entries are pruned. */
  maxSeen?: number;
};

export class Mempool {
  private order: Tx[] = [];
  private seen = new Set<string>();
  private seenQueue: string[] = []; // to prune seen in FIFO order
  private maxSize: number | null;
  private maxSeen: number | null;

  constructor(opts?: MempoolOpts) {
    this.maxSize = Number.isFinite(opts?.maxSize as number) ? Number(opts!.maxSize) : null;
    this.maxSeen = Number.isFinite(opts?.maxSeen as number) ? Number(opts!.maxSeen) : null;
  }

  /** Insert a tx if not seen before. Hash is normalized to lowercase. */
  push(tx: Tx) {
    const h = this.normalizeHash((tx as any)?.hash);
    if (!h) throw new Error("bad tx hash");
    if (this.seen.has(h)) return; // de-dupe

    // optional queue cap
    if (this.maxSize !== null && this.order.length >= this.maxSize) {
      // Drop newest (incoming) to avoid surprising eviction of older pending txs
      return;
    }

    this.seen.add(h);
    this.seenQueue.push(h);
    this.pruneSeenIfNeeded();

    const body = this.ensureObject((tx as any)?.body) ? (tx as any).body : {};
    this.order.push({ hash: h, body });
  }

  /** Queue length. */
  size() { return this.order.length; }

  /** Returns a shallow copy of current queue (no removal). */
  peekAll(): Tx[] { return this.order.slice(); }

  /**
   * Remove up to `n` txs (or all if `n` not provided) and return them.
   * This is the canonical "drain" used by the proposer.
   */
  drain(n?: number): Tx[] {
    if (n === undefined) {
      const out = this.order;
      this.order = [];
      // Keep `seen` for spam resistance
      return out;
    }
    const k = Math.max(0, Math.min(this.order.length, Math.floor(n)));
    if (k === 0) return [];
    const out = this.order.slice(0, k);
    this.order = this.order.slice(k);
    return out;
  }

  /** Alias accepted by Node: remove up to `n` (or all). */
  popMany(n?: number): Tx[] { return this.drain(n); }

  /** Alias accepted by Node: remove up to `n` (or all). */
  take(n?: number): Tx[] { return this.drain(n); }

  /**
   * Clear the mempool queue. Keeps the `seen` set (by design), so resubmitted
   * duplicates are still ignored. Returns number of removed txs.
   */
  clear(): number {
    const n = this.order.length;
    this.order = [];
    return n;
  }

  /** True if the tx hash (normalized) has been seen before. */
  has(hash: string): boolean {
    const h = this.normalizeHash(hash);
    return !!h && this.seen.has(h);
  }

  /** Remove a specific tx from queue (if present). Does not affect `seen`. */
  remove(hash: string): boolean {
    const h = this.normalizeHash(hash);
    if (!h) return false;
    const idx = this.order.findIndex((t) => t.hash === h);
    if (idx >= 0) {
      this.order.splice(idx, 1);
      return true;
    }
    return false;
  }

  /** Optional: reset dedupe memory (e.g., for tests). */
  resetSeen(): void {
    this.seen.clear();
    this.seenQueue.length = 0;
  }

  /** Internal helpers */
  private normalizeHash(x: any): string | null {
    if (typeof x !== "string") return null;
    const h = x.toLowerCase();
    return /^[0-9a-f]{64}$/.test(h) ? h : null;
  }

  private ensureObject(x: unknown): x is Record<string, any> {
    return !!x && typeof x === "object" && !Array.isArray(x);
  }

  private pruneSeenIfNeeded() {
    if (this.maxSeen === null) return;
    while (this.seenQueue.length > this.maxSeen) {
      const old = this.seenQueue.shift();
      if (old) this.seen.delete(old);
    }
  }
}

