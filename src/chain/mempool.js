"use strict";
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mempool = exports.VOID_DUPLICATE_TRANSACTION_CODE = void 0;
exports.VOID_DUPLICATE_TRANSACTION_CODE = "VOID_DUPLICATE_TRANSACTION";
function canonicalHashOf(tx) {
    const h = String((tx === null || tx === void 0 ? void 0 : tx.hash) || "").trim().toLowerCase().replace(/^0x/, "");
    return /^[0-9a-f]{64}$/.test(h) ? h : "";
}
function duplicateTransactionError() {
    const err = new Error("duplicate_transaction");
    err.name = "DuplicateTransactionError";
    err.code = exports.VOID_DUPLICATE_TRANSACTION_CODE;
    return err;
}
/**
 * Compatibility array used by legacy runtime observers/producers that access
 * node.mempool.txs directly. Canonical 64-hex transaction identities are
 * unique at push time; noncanonical legacy entries retain their old behavior.
 */
class CanonicalCompatTxArray extends Array {
    push(...items) {
        const seen = new Set();
        for (const current of this) {
            const h = canonicalHashOf(current);
            if (h)
                seen.add(h);
        }
        for (const item of items) {
            const h = canonicalHashOf(item);
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
            const h = canonicalHashOf(current);
            if (h)
                seen.add(h);
        }
        for (const item of items) {
            const h = canonicalHashOf(item);
            if (!h)
                continue;
            if (seen.has(h))
                throw duplicateTransactionError();
            seen.add(h);
        }
        return super.unshift(...items);
    }
}
class Mempool {
    constructor() {
        this.q = [];
        this.compatTxs = new CanonicalCompatTxArray();
    }
    /**
     * Compatibility surface consumed by the canonical HTTP hotpath and V2FS
     * runtime shims. Keep Array.isArray(...) true while guarding canonical ids.
     */
    get txs() { return this.compatTxs; }
    set txs(value) {
        if (value === this.compatTxs)
            return;
        if (!Array.isArray(value))
            throw new TypeError("mempool_txs_must_be_array");
        // Build first so a duplicate replacement fails without changing authority.
        const next = new CanonicalCompatTxArray();
        next.push(...value);
        this.compatTxs = next;
    }
    push(tx) {
        var _a;
        if (!tx || typeof tx !== "object")
            return;
        const hash = canonicalHashOf(tx);
        if (!hash)
            return;
        if (this.q.some((current) => current.hash === hash))
            throw duplicateTransactionError();
        this.q.push({ hash, body: (_a = tx.body) !== null && _a !== void 0 ? _a : {} });
    }
    peekAll() { return this.q.slice(); }
    clear() { this.q.length = 0; }
    drain(max) {
        if (!max || max >= this.q.length) {
            const a = this.q;
            this.q = [];
            return a;
        }
        return this.q.splice(0, max);
    }
    popMany(max = 1000) { return this.drain(max); }
    take(max = 1000) { return this.drain(max); }
}
exports.Mempool = Mempool;
