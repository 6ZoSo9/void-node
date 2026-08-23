// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

// src/chain/mempool.ts
export type MemTx = { hash: string; body?: any };

export const VOID_DUPLICATE_TRANSACTION_CODE = "VOID_DUPLICATE_TRANSACTION";

function comparableCanonicalHashOf(tx: any): string {
  const h = String(tx?.hash || "").trim().toLowerCase().replace(/^0x/, "");
  return /^[0-9a-f]{64}$/.test(h) ? h : "";
}

function strictCanonicalHashOf(tx: any): string {
  const h = String(tx?.hash || "").trim().toLowerCase();
  return /^[0-9a-f]{64}$/.test(h) ? h : "";
}

function duplicateTransactionError(): Error & { code: string } {
  const err = new Error("duplicate_transaction") as Error & { code: string };
  err.name = "DuplicateTransactionError";
  err.code = VOID_DUPLICATE_TRANSACTION_CODE;
  return err;
}

/**
 * Compatibility array used by legacy runtime observers/producers that access
 * node.mempool.txs directly. Canonical 64-hex transaction identities are
 * unique at push time; noncanonical legacy entries retain their old behavior.
 */
class CanonicalCompatTxArray extends Array<any> {
  override push(...items: any[]): number {
    const seen = new Set<string>();

    for (const current of this) {
      const h = comparableCanonicalHashOf(current);
      if (h) seen.add(h);
    }

    for (const item of items) {
      const h = comparableCanonicalHashOf(item);
      if (!h) continue;
      if (seen.has(h)) throw duplicateTransactionError();
      seen.add(h);
    }

    return super.push(...items);
  }

  override unshift(...items: any[]): number {
    const seen = new Set<string>();

    for (const current of this) {
      const h = comparableCanonicalHashOf(current);
      if (h) seen.add(h);
    }

    for (const item of items) {
      const h = comparableCanonicalHashOf(item);
      if (!h) continue;
      if (seen.has(h)) throw duplicateTransactionError();
      seen.add(h);
    }

    return super.unshift(...items);
  }
}

function guardCompatTxArrayInPlace(value: any[]): any[] {
  const seen = new Set<string>();
  for (const item of value) {
    const h = comparableCanonicalHashOf(item);
    if (!h) continue;
    if (seen.has(h)) throw duplicateTransactionError();
    seen.add(h);
  }

  if (!(value instanceof CanonicalCompatTxArray)) {
    Object.setPrototypeOf(value, CanonicalCompatTxArray.prototype);
  }
  return value;
}

export class Mempool {
  private q: MemTx[] = [];
  private compatTxs: any[] | undefined;

  /**
   * Compatibility surface consumed by the canonical HTTP hotpath and V2FS
   * runtime shims. It stays absent until existing legacy initialization, then
   * guards the exact assigned Array object so assignment-expression identity
   * and Array.isArray(...) behavior remain unchanged.
   */
  get txs(): any[] | undefined { return this.compatTxs; }
  set txs(value: any[]) {
    if (value === this.compatTxs) return;
    if (!Array.isArray(value)) throw new TypeError("mempool_txs_must_be_array");

    // Validate before changing the caller-owned Array prototype or authority.
    const guarded = guardCompatTxArrayInPlace(value);
    this.compatTxs = guarded;
  }

  push(tx: MemTx) {
    if (!tx || typeof tx !== "object") return;
    // Preserve the historical strict hash-admission contract: no 0x prefix.
    const hash = strictCanonicalHashOf(tx);
    if (!hash) return;
    if (this.q.some((current) => current.hash === hash)) throw duplicateTransactionError();
    this.q.push({ hash, body: tx.body ?? {} });
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
