// src/chain/mempool.ts
export class Mempool<T = any> {
  private q: T[] = []

  push(tx: T) {
    this.q.push(tx)
  }

  size(): number {
    return this.q.length
  }

  /** Return a shallow copy of all txs (without removing). */
  peekAll(): T[] {
    return this.q.slice()
  }

  /**
   * Remove up to `n` txs (FIFO) and return them.
   * If n is omitted or <= 0, drain everything.
   */
  drain(n?: number): T[] {
    if (n == null || n <= 0 || n >= this.q.length) {
      const all = this.q
      this.q = []
      return all
    }
    const out = this.q.slice(0, n)
    this.q = this.q.slice(n)
    return out
  }

  clear() {
    this.q = []
  }
}

