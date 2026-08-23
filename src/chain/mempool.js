"use strict";
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mempool = exports.VOID_MEMPOOL_RAW_HASH_MUTATION_FORBIDDEN = exports.VOID_MEMPOOL_RAW_INDEX_MUTATION_FORBIDDEN = exports.VOID_MEMPOOL_SELECTED_MUTATION_FORBIDDEN = exports.VOID_MEMPOOL_SELECTION_IN_PROGRESS = exports.VOID_DUPLICATE_TRANSACTION_CODE = void 0;
exports.VOID_DUPLICATE_TRANSACTION_CODE = "VOID_DUPLICATE_TRANSACTION";
exports.VOID_MEMPOOL_SELECTION_IN_PROGRESS = "mempool_selection_in_progress";
exports.VOID_MEMPOOL_SELECTED_MUTATION_FORBIDDEN = "mempool_selected_mutation_forbidden";
exports.VOID_MEMPOOL_RAW_INDEX_MUTATION_FORBIDDEN = "mempool_raw_index_mutation_forbidden";
exports.VOID_MEMPOOL_RAW_HASH_MUTATION_FORBIDDEN = "mempool_raw_hash_mutation_forbidden";
function canonicalIdentitySnapshotOf(tx) {
    const raw = tx === null || tx === void 0 ? void 0 : tx.hash;
    const hash = raw === undefined || raw === null ? raw : String(raw);
    const h = String(hash || "").trim().toLowerCase().replace(/^0x/, "");
    return /^[0-9a-f]{64}$/.test(h) ? { id: h, hash } : null;
}
function comparableCanonicalHashOf(tx) {
    const snapshot = canonicalIdentitySnapshotOf(tx);
    return (snapshot === null || snapshot === void 0 ? void 0 : snapshot.id) || "";
}
function strictCanonicalHashOf(tx) {
    const h = String((tx === null || tx === void 0 ? void 0 : tx.hash) || "").trim().toLowerCase();
    return /^[0-9a-f]{64}$/.test(h) ? h : "";
}
function duplicateTransactionError() {
    const err = new Error("duplicate_transaction");
    err.name = "DuplicateTransactionError";
    err.code = exports.VOID_DUPLICATE_TRANSACTION_CODE;
    return err;
}
function mutationError(message) {
    const err = new Error(message);
    err.name = "MempoolMutationError";
    return err;
}
function ownCanonicalCompatItem(tx) {
    if (tx === null || (typeof tx !== "object" && typeof tx !== "function"))
        return tx;
    const rawHash = tx === null || tx === void 0 ? void 0 : tx.hash;
    const hashSnapshot = rawHash === undefined || rawHash === null ? rawHash : String(rawHash);
    const owned = Array.isArray(tx) ? [] : Object.create(Object.getPrototypeOf(tx));
    const descriptors = Object.getOwnPropertyDescriptors(tx);
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
            if (prop === "hash")
                return hashSnapshot;
            return Reflect.get(target, prop, receiver);
        },
        set(target, prop, value, receiver) {
            if (prop === "hash")
                throw mutationError(exports.VOID_MEMPOOL_RAW_HASH_MUTATION_FORBIDDEN);
            return Reflect.set(target, prop, value, receiver);
        },
        deleteProperty(target, prop) {
            if (prop === "hash")
                throw mutationError(exports.VOID_MEMPOOL_RAW_HASH_MUTATION_FORBIDDEN);
            return Reflect.deleteProperty(target, prop);
        },
        defineProperty(target, prop, descriptor) {
            if (prop === "hash")
                throw mutationError(exports.VOID_MEMPOOL_RAW_HASH_MUTATION_FORBIDDEN);
            return Reflect.defineProperty(target, prop, descriptor);
        },
    });
}
function numericArrayIndex(prop) {
    if (typeof prop !== "string" || !/^(0|[1-9][0-9]*)$/.test(prop))
        return null;
    const n = Number(prop);
    if (!Number.isSafeInteger(n) || n < 0 || n >= 0xffffffff)
        return null;
    return n;
}
class Mempool {
    constructor() {
        this.queueTarget = [];
        this.canonicalIdentities = new Set();
        this.selected = [];
        const self = this;
        const handler = {
  get(target, prop, receiver) {
      if (prop === "push")
          return (...items) => self.compatPush(items);
      if (prop === "unshift")
          return (...items) => self.compatUnshift(items);
      if (prop === "splice")
          return (...args) => self.compatSplice(args);
      if (prop === "pop")
          return () => self.compatPop();
      if (prop === "shift")
          return () => self.compatShift();
      if (prop === "sort")
          return (compareFn) => self.compatSort(compareFn);
      if (prop === "reverse")
          return () => self.compatReverse();
      if (prop === "fill" || prop === "copyWithin")
          return () => { throw mutationError(exports.VOID_MEMPOOL_RAW_INDEX_MUTATION_FORBIDDEN); };
      return Reflect.get(target, prop, receiver);
  },
  set(target, prop, value) {
      if (prop === "length") {
          self.setCompatLength(value);
          return true;
      }
      if (numericArrayIndex(prop) !== null)
          throw mutationError(exports.VOID_MEMPOOL_RAW_INDEX_MUTATION_FORBIDDEN);
      return Reflect.set(target, prop, value);
  },
  deleteProperty(_target, prop) {
      if (numericArrayIndex(prop) !== null)
          throw mutationError(exports.VOID_MEMPOOL_RAW_INDEX_MUTATION_FORBIDDEN);
      return Reflect.deleteProperty(self.queueTarget, prop);
  },
  defineProperty(target, prop, descriptor) {
      if (prop === "length" || numericArrayIndex(prop) !== null)
          throw mutationError(exports.VOID_MEMPOOL_RAW_INDEX_MUTATION_FORBIDDEN);
      return Reflect.defineProperty(target, prop, descriptor);
  },
  setPrototypeOf() { return false; },
  preventExtensions() { return false; },
        };
        this.queue = new Proxy(this.queueTarget, handler);
    }
    get txs() { return this.queue; }
    set txs(value) {
        if (value === this.queue)
  return;
        if (!Array.isArray(value))
  throw new TypeError("mempool_txs_must_be_array");
        if (this.selected.length > 0)
  throw mutationError(exports.VOID_MEMPOOL_SELECTED_MUTATION_FORBIDDEN);
        const candidate = Array.from(value, ownCanonicalCompatItem);
        const seen = new Set();
        for (const item of candidate) {
  const id = comparableCanonicalHashOf(item);
  if (!id)
      continue;
  if (seen.has(id))
      throw duplicateTransactionError();
  seen.add(id);
        }
        Array.prototype.splice.call(this.queueTarget, 0, this.queueTarget.length, ...candidate);
        this.canonicalIdentities.clear();
        for (const id of seen)
  this.canonicalIdentities.add(id);
    }
    assertAddable(items, removedIds = new Set()) {
        const batch = new Set();
        for (const item of items) {
  const id = comparableCanonicalHashOf(item);
  if (!id)
      continue;
  if ((this.canonicalIdentities.has(id) && !removedIds.has(id)) || batch.has(id))
      throw duplicateTransactionError();
  batch.add(id);
        }
    }
    addIdentities(items) {
        for (const item of items) {
  const id = comparableCanonicalHashOf(item);
  if (id)
      this.canonicalIdentities.add(id);
        }
    }
    removeIdentities(items) {
        for (const item of items) {
  const id = comparableCanonicalHashOf(item);
  if (id)
      this.canonicalIdentities.delete(id);
        }
    }
    selectedContainsAny(items) {
        if (this.selected.length === 0 || items.length === 0)
  return false;
        const selected = new Set(this.selected);
        return items.some((item) => selected.has(item));
    }
    compatPush(items) {
        const ownedItems = items.map(ownCanonicalCompatItem);
        this.assertAddable(ownedItems);
        Array.prototype.push.apply(this.queueTarget, ownedItems);
        this.addIdentities(ownedItems);
        return this.queueTarget.length;
    }
    compatUnshift(items) {
        const ownedItems = items.map(ownCanonicalCompatItem);
        this.assertAddable(ownedItems);
        Array.prototype.unshift.apply(this.queueTarget, ownedItems);
        this.addIdentities(ownedItems);
        return this.queueTarget.length;
    }
    compatSplice(args) {
        const len = this.queueTarget.length;
        const rawStart = Number(args[0] !== undefined ? args[0] : 0);
        const start0 = Number.isFinite(rawStart) ? Math.trunc(rawStart) : 0;
        const start = start0 < 0 ? Math.max(len + start0, 0) : Math.min(start0, len);
        const rawDelete = args.length < 2 ? (len - start) : Number(args[1]);
        const deleteCount = args.length < 2 ? (len - start) : Math.min(Math.max(Number.isFinite(rawDelete) ? Math.trunc(rawDelete) : 0, 0), len - start);
        const items = args.slice(2).map(ownCanonicalCompatItem);
        const removed = this.queueTarget.slice(start, start + deleteCount);
        if (this.selectedContainsAny(removed))
  throw mutationError(exports.VOID_MEMPOOL_SELECTED_MUTATION_FORBIDDEN);
        const removedIds = new Set();
        for (const item of removed) {
  const id = comparableCanonicalHashOf(item);
  if (id)
      removedIds.add(id);
        }
        this.assertAddable(items, removedIds);
        const out = Array.prototype.splice.call(this.queueTarget, start, deleteCount, ...items);
        this.removeIdentities(removed);
        this.addIdentities(items);
        return Array.from(out);
    }
    compatPop() {
        if (this.queueTarget.length === 0)
  return undefined;
        return this.compatSplice([this.queueTarget.length - 1, 1])[0];
    }
    compatShift() {
        if (this.queueTarget.length === 0)
  return undefined;
        return this.compatSplice([0, 1])[0];
    }
    compatSort(compareFn) {
        Array.prototype.sort.call(this.queueTarget, compareFn);
        return this.queue;
    }
    compatReverse() {
        Array.prototype.reverse.call(this.queueTarget);
        return this.queue;
    }
    setCompatLength(value) {
        const next = Number(value);
        if (!Number.isInteger(next) || next < 0 || next > 0xffffffff)
  throw new RangeError("Invalid array length");
        if (next < this.queueTarget.length)
  this.compatSplice([next, this.queueTarget.length - next]);
        else
  this.queueTarget.length = next;
    }
    push(tx) {
        if (!tx || typeof tx !== "object")
  return;
        const hash = strictCanonicalHashOf(tx);
        if (!hash)
  return;
        this.compatPush([{ hash, body: tx.body !== undefined && tx.body !== null ? tx.body : {} }]);
    }
    peekAll() { return Array.from(this.queueTarget); }
    clear() {
        if (this.queueTarget.length === 0)
  return;
        this.compatSplice([0, this.queueTarget.length]);
    }
    drain(max) {
        const take = !max || max >= this.queueTarget.length ? this.queueTarget.length : Math.max(0, Math.floor(max));
        return Array.from(this.compatSplice([0, take]));
    }
    popMany(max = 1000) { return this.drain(max); }
    take(max = 1000) { return this.drain(max); }
    beginSelection(max = 1000) {
        if (this.selected.length > 0)
  throw mutationError(exports.VOID_MEMPOOL_SELECTION_IN_PROGRESS);
        const raw = Number(max);
        const take = Math.max(0, Math.min(this.queueTarget.length, Number.isFinite(raw) ? Math.floor(raw) : 0));
        this.selected = this.queueTarget.slice(0, take);
        return Array.from(this.selected);
    }
    commitSelection() {
        if (this.selected.length === 0)
  return [];
        const selected = Array.from(this.selected);
        const used = new Set();
        const indexes = [];
        for (const tx of selected) {
  let found = -1;
  for (let i = 0; i < this.queueTarget.length; i++) {
      if (!used.has(i) && this.queueTarget[i] === tx) {
          found = i;
          break;
      }
  }
  if (found < 0)
      throw mutationError("mempool_selected_entry_missing");
  used.add(found);
  indexes.push(found);
        }
        this.selected = [];
        indexes.sort((a, b) => b - a);
        const removed = [];
        for (const index of indexes)
  removed.push(...Array.prototype.splice.call(this.queueTarget, index, 1));
        this.removeIdentities(removed);
        return selected;
    }
    rollbackSelection() {
        const selected = Array.from(this.selected);
        this.selected = [];
        return selected;
    }
    selectionSize() { return this.selected.length; }
}
exports.Mempool = Mempool;
