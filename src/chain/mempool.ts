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
 * Producer-visible transaction queue. Canonical 64-hex identities are unique
 * while pending. Legacy noncanonical entries remain representable because old
 * runtime compatibility surfaces already use node.mempool.txs directly.
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
  /**
   * One pending transaction authority:
   * - canonical HTTP /tx/submit writes `txs` directly;
   * - V2FS consumes `txs` directly;
   * - Node/P2P intake uses push();
   * - peekAll/clear/drain/take/popMany all operate on the same Array object.
   */
  private queue: any[];

  constructor() {
    this.queue = guardCompatTxArrayInPlace([]);
  }

  get txs(): any[] { return this.queue; }
  set txs(value: any[]) {
    if (value === this.queue) return;
    if (!Array.isArray(value)) throw new TypeError("mempool_txs_must_be_array");

    // Validate before changing the caller-owned Array prototype or authority.
    this.queue = guardCompatTxArrayInPlace(value);
  }

  push(tx: MemTx) {
    if (!tx || typeof tx !== "object") return;
    // Preserve the historical strict hash-admission contract: no 0x prefix.
    const hash = strictCanonicalHashOf(tx);
    if (!hash) return;
    this.queue.push({ hash, body: tx.body ?? {} });
  }

  peekAll(): MemTx[] {
    return Array.from(this.queue) as MemTx[];
  }

  clear() {
    this.queue.length = 0;
  }

  drain(max?: number): MemTx[] {
    const take = !max || max >= this.queue.length
      ? this.queue.length
      : Math.max(0, Math.floor(max));
    return Array.from(this.queue.splice(0, take)) as MemTx[];
  }

  popMany(max = 1000): MemTx[] { return this.drain(max); }
  take(max = 1000): MemTx[] { return this.drain(max); }
}
