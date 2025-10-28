export type Tx = { id: string; data: any; ts: number };

class Mempool {
  private q: Tx[] = [];
  // instrumentation
  public submitted = 0;
  public accepted = 0;
  public rejected = 0;

  size() { return this.q.length; }
  snapshot(max = 100) { return this.q.slice(0, max); }

  submit(tx: Omit<Tx,"ts">): { ok: boolean; reason?: string } {
    // Minimal sanity: id must exist and be unique in current queue
    if (!tx?.id) { this.rejected++; return { ok:false, reason:"missing id" }; }
    if (this.q.find(t => t.id === tx.id)) { this.rejected++; return { ok:false, reason:"duplicate id" }; }
    this.submitted++;
    this.q.push({ ...tx, ts: Date.now() });
    this.accepted++;
    return { ok:true };
  }

  // Drain up to N txs (for proposer hook later)
  drain(max = 100): Tx[] {
    if (this.q.length === 0) return [];
    return this.q.splice(0, Math.min(max, this.q.length));
  }
}

export const mempool = new Mempool();
