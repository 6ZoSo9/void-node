"use strict";
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mempool = exports.VOID_DUPLICATE_TRANSACTION_CODE = void 0;
exports.VOID_DUPLICATE_TRANSACTION_CODE = "VOID_DUPLICATE_TRANSACTION";
function comparableCanonicalHashOf(tx) {
    const h = String((tx === null || tx === void 0 ? void 0 : tx.hash) || "").trim().toLowerCase().replace(/^0x/, "");
    return /^[0-9a-f]{64}$/.test(h) ? h : "";
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
/**
 * Producer-visible transaction queue. Canonical 64-hex identities are unique
 * while pending. Legacy noncanonical entries remain representable because old
 * runtime compatibility surfaces already use node.mempool.txs directly.
 */
class CanonicalCompatTxArray extends Array {
    push(...items) {
        const seen = new Set();
        for (const current of this) {
            const h = comparableCanonicalHashOf(current);
            if (h)
                seen.add(h);
        }
        for (const item of items) {
            const h = comparableCanonicalHashOf(item);
            if (!h)
                continue;
            if (seen.has(h))
                throw duplicateTransactionError();
            seen.add(h);
        }
        return super.push(...items);
    }
    unshift(...items) {
        const seen = new Set();
        for (const current of this) {
            const h = comparableCanonicalHashOf(current);
            if (h)
                seen.add(h);
        }
        for (const item of items) {
            const h = comparableCanonicalHashOf(item);
            if (!h)
                continue;
            if (seen.has(h))
                throw duplicateTransactionError();
            seen.add(h);
        }
        return super.unshift(...items);
    }
}
function guardCompatTxArrayInPlace(value) {
    const seen = new Set();
    for (const item of value) {
        const h = comparableCanonicalHashOf(item);
        if (!h)
            continue;
        if (seen.has(h))
            throw duplicateTransactionError();
        seen.add(h);
    }
    if (!(value instanceof CanonicalCompatTxArray)) {
        Object.setPrototypeOf(value, CanonicalCompatTxArray.prototype);
    }
    return value;
}
class Mempool {
    constructor() {
        this.queue = guardCompatTxArrayInPlace([]);
    }
    /** One producer-visible pending transaction authority. */
    get txs() { return this.queue; }
    set txs(value) {
        if (value === this.queue)
            return;
        if (!Array.isArray(value))
            throw new TypeError("mempool_txs_must_be_array");
        // Validate before changing the caller-owned Array prototype or authority.
        this.queue = guardCompatTxArrayInPlace(value);
    }
    push(tx) {
        var _a;
        if (!tx || typeof tx !== "object")
            return;
        // Preserve the historical strict hash-admission contract: no 0x prefix.
        const hash = strictCanonicalHashOf(tx);
        if (!hash)
            return;
        this.queue.push({ hash, body: (_a = tx.body) !== null && _a !== void 0 ? _a : {} });
    }
    peekAll() {
        return Array.from(this.queue);
    }
    clear() {
        this.queue.length = 0;
    }
    drain(max) {
        const take = !max || max >= this.queue.length
            ? this.queue.length
            : Math.max(0, Math.floor(max));
        return Array.from(this.queue.splice(0, take));
    }
    popMany(max = 1000) { return this.drain(max); }
    take(max = 1000) { return this.drain(max); }
}
exports.Mempool = Mempool;
