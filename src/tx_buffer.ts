export type Tx = { id: string; data: string };

class TxBuffer {
  private q: Tx[] = [];
  public pushed_total = 0;
  public popped_total = 0;

  push(tx: Tx) {
    // trivial de-dupe on id (keep last)
    const i = this.q.findIndex(t => t.id === tx.id);
    if (i >= 0) this.q.splice(i, 1);
    this.q.push(tx);
    this.pushed_total++;
  }

  size() { return this.q.length; }

  // pop up to N, FIFO
  popN(n: number): Tx[] {
    const out: Tx[] = [];
    const take = Math.max(0, Math.min(n|0, this.q.length));
    for (let i = 0; i < take; i++) out.push(this.q.shift()!);
    this.popped_total += out.length;
    return out;
  }

  sample(max = 10): Tx[] {
    if (this.q.length <= max) return this.q.slice();
    // take tail-ish sample to bias toward newer
    return this.q.slice(-max);
  }

  clear() { this.q.length = 0; }
}

export const txBuffer = new TxBuffer();
