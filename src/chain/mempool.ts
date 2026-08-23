// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

// src/chain/mempool.ts
export type MemTx = { hash: string; body?: any };

export const VOID_DUPLICATE_TRANSACTION_CODE = "VOID_DUPLICATE_TRANSACTION";
export const VOID_MEMPOOL_SELECTION_IN_PROGRESS = "mempool_selection_in_progress";
export const VOID_MEMPOOL_SELECTED_MUTATION_FORBIDDEN = "mempool_selected_mutation_forbidden";
export const VOID_MEMPOOL_RAW_INDEX_MUTATION_FORBIDDEN = "mempool_raw_index_mutation_forbidden";
export const VOID_MEMPOOL_RAW_HASH_MUTATION_FORBIDDEN = "mempool_raw_hash_mutation_forbidden";
export const VOID_MEMPOOL_REENTRANT_MUTATION_FORBIDDEN = "mempool_reentrant_mutation_forbidden";

function canonicalIdentitySnapshotOf(tx: any): { id: string; hash: any } | null {
  const raw = tx?.hash;
  const hash = raw === undefined || raw === null ? raw : String(raw);
  const h = String(hash || "").trim().toLowerCase().replace(/^0x/, "");
  return /^[0-9a-f]{64}$/.test(h) ? { id: h, hash } : null;
}

function comparableCanonicalHashOf(tx: any): string {
  return canonicalIdentitySnapshotOf(tx)?.id || "";
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

function mutationError(message: string): Error {
  const err = new Error(message);
  err.name = "MempoolMutationError";
  return err;
}

function ownCanonicalCompatItem(tx: any): any {
  if (tx === null || (typeof tx !== "object" && typeof tx !== "function")) return tx;
  const rawHash = tx?.hash;
  const hashSnapshot = rawHash === undefined || rawHash === null ? rawHash : String(rawHash);
  const owned: any = Array.isArray(tx) ? [] : Object.create(Object.getPrototypeOf(tx));
  const descriptors: any = Object.getOwnPropertyDescriptors(tx);
  const hashDescriptor = descriptors.hash;
  delete descriptors.hash;
  Object.defineProperties(owned, descriptors);
  if (hashDescriptor) {
    Object.defineProperty(owned, "hash", {
      value: hashSnapshot,
      enumerable: !!hashDescriptor.enumerable,
      writable: true,
      configurable: true,
    });
  }
  return new Proxy(owned, {
    get(target, prop, receiver) {
      if (prop === "hash") return hashSnapshot;
      return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value, receiver) {
      if (prop === "hash") throw mutationError(VOID_MEMPOOL_RAW_HASH_MUTATION_FORBIDDEN);
      return Reflect.set(target, prop, value, receiver);
    },
    deleteProperty(target, prop) {
      if (prop === "hash") throw mutationError(VOID_MEMPOOL_RAW_HASH_MUTATION_FORBIDDEN);
      return Reflect.deleteProperty(target, prop);
    },
    defineProperty(target, prop, descriptor) {
      if (prop === "hash") throw mutationError(VOID_MEMPOOL_RAW_HASH_MUTATION_FORBIDDEN);
      return Reflect.defineProperty(target, prop, descriptor);
    },
  });
}

function numericArrayIndex(prop: PropertyKey): number | null {
  if (typeof prop !== "string" || !/^(0|[1-9][0-9]*)$/.test(prop)) return null;
  const n = Number(prop);
  if (!Number.isSafeInteger(n) || n < 0 || n >= 0xffffffff) return null;
  return n;
}

/**
 * One producer-visible pending queue with one canonical identity index.
 * Admission is O(1) with respect to existing queue size. The public
 * Array-compatible surface is a Proxy so direct legacy push/unshift/splice
 * operations cannot bypass identity bookkeeping, while index/define/delete
 * mutation is rejected rather than silently desynchronizing the index.
 *
 * V2FS selection is deliberately non-destructive: selected transactions
 * remain pending/reserved until commitSelection() is called after durable
 * block/head commit. rollbackSelection() therefore needs only to clear the
 * selection marker; the original pending entries never disappeared.
 */
export class Mempool {
  private readonly queueTarget: any[] = [];
  private readonly queue: any[];
  private readonly canonicalIdentities = new Set<string>();
  private selected: any[] = [];
  private mutationLocked = false;

  private assertMutationUnlocked(): void {
    if (this.mutationLocked) throw mutationError(VOID_MEMPOOL_REENTRANT_MUTATION_FORBIDDEN);
  }

  constructor() {
    const self = this;
    const handler: ProxyHandler<any[]> = {
      get(target, prop, receiver) {
        if (prop === "push") return (...items: any[]) => self.compatPush(items);
        if (prop === "unshift") return (...items: any[]) => self.compatUnshift(items);
        if (prop === "splice") return (...args: any[]) => self.compatSplice(args);
        if (prop === "pop") return () => self.compatPop();
        if (prop === "shift") return () => self.compatShift();
        if (prop === "sort") return (compareFn?: (a: any, b: any) => number) => self.compatSort(compareFn);
        if (prop === "reverse") return () => self.compatReverse();
        if (prop === "fill" || prop === "copyWithin") {
return () => { throw mutationError(VOID_MEMPOOL_RAW_INDEX_MUTATION_FORBIDDEN); };
        }
        return Reflect.get(target, prop, receiver);
      },
      set(target, prop, value) {
        if (prop === "length") {
self.setCompatLength(value);
return true;
        }
        if (numericArrayIndex(prop) !== null) {
throw mutationError(VOID_MEMPOOL_RAW_INDEX_MUTATION_FORBIDDEN);
        }
        return Reflect.set(target, prop, value);
      },
      deleteProperty(_target, prop) {
        if (numericArrayIndex(prop) !== null) {
throw mutationError(VOID_MEMPOOL_RAW_INDEX_MUTATION_FORBIDDEN);
        }
        return Reflect.deleteProperty(self.queueTarget, prop);
      },
      defineProperty(target, prop, descriptor) {
        if (prop === "length" || numericArrayIndex(prop) !== null) {
throw mutationError(VOID_MEMPOOL_RAW_INDEX_MUTATION_FORBIDDEN);
        }
        return Reflect.defineProperty(target, prop, descriptor);
      },
      setPrototypeOf() {
        return false;
      },
      preventExtensions() {
        return false;
      },
    };
    this.queue = new Proxy(this.queueTarget, handler);
  }

  get txs(): any[] { return this.queue; }
  set txs(value: any[]) {
    if (value === this.queue) return;
    this.assertMutationUnlocked();
    if (!Array.isArray(value)) throw new TypeError("mempool_txs_must_be_array");
    if (this.selected.length > 0) throw mutationError(VOID_MEMPOOL_SELECTED_MUTATION_FORBIDDEN);

    const candidate = Array.from(value, ownCanonicalCompatItem);
    const seen = new Set<string>();
    for (const item of candidate) {
      const id = comparableCanonicalHashOf(item);
      if (!id) continue;
      if (seen.has(id)) throw duplicateTransactionError();
      seen.add(id);
    }

    Array.prototype.splice.call(this.queueTarget, 0, this.queueTarget.length, ...candidate);
    this.canonicalIdentities.clear();
    for (const id of seen) this.canonicalIdentities.add(id);
  }

  private assertAddable(items: any[], removedIds: Set<string> = new Set()): void {
    const batch = new Set<string>();
    for (const item of items) {
      const id = comparableCanonicalHashOf(item);
      if (!id) continue;
      if ((this.canonicalIdentities.has(id) && !removedIds.has(id)) || batch.has(id)) {
        throw duplicateTransactionError();
      }
      batch.add(id);
    }
  }

  private addIdentities(items: any[]): void {
    for (const item of items) {
      const id = comparableCanonicalHashOf(item);
      if (id) this.canonicalIdentities.add(id);
    }
  }

  private removeIdentities(items: any[]): void {
    for (const item of items) {
      const id = comparableCanonicalHashOf(item);
      if (id) this.canonicalIdentities.delete(id);
    }
  }

  private selectedContainsAny(items: any[]): boolean {
    if (this.selected.length === 0 || items.length === 0) return false;
    const selected = new Set(this.selected);
    return items.some((item) => selected.has(item));
  }

  private compatPush(items: any[]): number {
    this.assertMutationUnlocked();
    const ownedItems = items.map(ownCanonicalCompatItem);
    this.assertAddable(ownedItems);
    Array.prototype.push.apply(this.queueTarget, ownedItems);
    this.addIdentities(ownedItems);
    return this.queueTarget.length;
  }

  private compatUnshift(items: any[]): number {
    this.assertMutationUnlocked();
    const ownedItems = items.map(ownCanonicalCompatItem);
    this.assertAddable(ownedItems);
    Array.prototype.unshift.apply(this.queueTarget, ownedItems);
    this.addIdentities(ownedItems);
    return this.queueTarget.length;
  }

  private compatSplice(args: any[]): any[] {
    this.assertMutationUnlocked();
    const len = this.queueTarget.length;
    const rawStart = Number(args[0] ?? 0);
    const start0 = Number.isFinite(rawStart) ? Math.trunc(rawStart) : 0;
    const start = start0 < 0 ? Math.max(len + start0, 0) : Math.min(start0, len);
    const rawDelete = args.length < 2 ? (len - start) : Number(args[1]);
    const deleteCount = args.length < 2
      ? (len - start)
      : Math.min(Math.max(Number.isFinite(rawDelete) ? Math.trunc(rawDelete) : 0, 0), len - start);
    const items = args.slice(2).map(ownCanonicalCompatItem);
    const removed = this.queueTarget.slice(start, start + deleteCount);

    if (this.selectedContainsAny(removed)) {
      throw mutationError(VOID_MEMPOOL_SELECTED_MUTATION_FORBIDDEN);
    }

    const removedIds = new Set<string>();
    for (const item of removed) {
      const id = comparableCanonicalHashOf(item);
      if (id) removedIds.add(id);
    }
    this.assertAddable(items, removedIds);

    const out = Array.prototype.splice.call(this.queueTarget, start, deleteCount, ...items);
    this.removeIdentities(removed);
    this.addIdentities(items);
    return Array.from(out);
  }

  private compatPop(): any {
    if (this.queueTarget.length === 0) return undefined;
    return this.compatSplice([this.queueTarget.length - 1, 1])[0];
  }

  private compatShift(): any {
    if (this.queueTarget.length === 0) return undefined;
    return this.compatSplice([0, 1])[0];
  }

  private compatSort(compareFn?: (a: any, b: any) => number): any[] {
    this.assertMutationUnlocked();
    this.mutationLocked = true;
    try {
      Array.prototype.sort.call(this.queueTarget, compareFn);
      return this.queue;
    } finally {
      this.mutationLocked = false;
    }
  }

  private compatReverse(): any[] {
    this.assertMutationUnlocked();
    Array.prototype.reverse.call(this.queueTarget);
    return this.queue;
  }

  private setCompatLength(value: any): void {
    this.assertMutationUnlocked();
    const next = Number(value);
    if (!Number.isInteger(next) || next < 0 || next > 0xffffffff) {
      throw new RangeError("Invalid array length");
    }
    if (next < this.queueTarget.length) {
      this.compatSplice([next, this.queueTarget.length - next]);
    } else {
      this.queueTarget.length = next;
    }
  }

  push(tx: MemTx) {
    if (!tx || typeof tx !== "object") return;
    const hash = strictCanonicalHashOf(tx);
    if (!hash) return;
    this.compatPush([{ hash, body: tx.body ?? {} }]);
  }

  peekAll(): MemTx[] {
    return Array.from(this.queueTarget) as MemTx[];
  }

  clear() {
    if (this.queueTarget.length === 0) return;
    this.compatSplice([0, this.queueTarget.length]);
  }

  drain(max?: number): MemTx[] {
    const take = !max || max >= this.queueTarget.length
      ? this.queueTarget.length
      : Math.max(0, Math.floor(max));
    return Array.from(this.compatSplice([0, take])) as MemTx[];
  }

  popMany(max = 1000): MemTx[] { return this.drain(max); }
  take(max = 1000): MemTx[] { return this.drain(max); }

  beginSelection(max = 1000): MemTx[] {
    this.assertMutationUnlocked();
    if (this.selected.length > 0) throw mutationError(VOID_MEMPOOL_SELECTION_IN_PROGRESS);
    const raw = Number(max);
    const take = Math.max(0, Math.min(this.queueTarget.length, Number.isFinite(raw) ? Math.floor(raw) : 0));
    this.selected = this.queueTarget.slice(0, take);
    return Array.from(this.selected) as MemTx[];
  }

  commitSelection(): MemTx[] {
    this.assertMutationUnlocked();
    if (this.selected.length === 0) return [];
    const selected = Array.from(this.selected);
    const used = new Set<number>();
    const indexes: number[] = [];

    for (const tx of selected) {
      let found = -1;
      for (let i = 0; i < this.queueTarget.length; i++) {
        if (!used.has(i) && this.queueTarget[i] === tx) {
found = i;
break;
        }
      }
      if (found < 0) throw mutationError("mempool_selected_entry_missing");
      used.add(found);
      indexes.push(found);
    }

    this.selected = [];
    indexes.sort((a, b) => b - a);
    const removed: any[] = [];
    for (const index of indexes) {
      removed.push(...Array.prototype.splice.call(this.queueTarget, index, 1));
    }
    this.removeIdentities(removed);
    return selected as MemTx[];
  }

  rollbackSelection(): MemTx[] {
    this.assertMutationUnlocked();
    const selected = Array.from(this.selected) as MemTx[];
    this.selected = [];
    return selected;
  }

  selectionSize(): number {
    return this.selected.length;
  }
}
