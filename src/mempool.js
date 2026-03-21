"use strict";
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mempool = void 0;
var Mempool = /** @class */ (function () {
    function Mempool() {
        this.q = [];
        // instrumentation
        this.submitted = 0;
        this.accepted = 0;
        this.rejected = 0;
    }
    Mempool.prototype.size = function () { return this.q.length; };
    Mempool.prototype.snapshot = function (max) {
        if (max === void 0) { max = 100; }
        return this.q.slice(0, max);
    };
    Mempool.prototype.submit = function (tx) {
        // Minimal sanity: id must exist and be unique in current queue
        if (!(tx === null || tx === void 0 ? void 0 : tx.id)) {
            this.rejected++;
            return { ok: false, reason: "missing id" };
        }
        if (this.q.find(function (t) { return t.id === tx.id; })) {
            this.rejected++;
            return { ok: false, reason: "duplicate id" };
        }
        this.submitted++;
        this.q.push(__assign(__assign({}, tx), { ts: Date.now() }));
        this.accepted++;
        return { ok: true };
    };
    // Drain up to N txs (for proposer hook later)
    Mempool.prototype.drain = function (max) {
        if (max === void 0) { max = 100; }
        if (this.q.length === 0)
            return [];
        return this.q.splice(0, Math.min(max, this.q.length));
    };
    return Mempool;
}());
exports.mempool = new Mempool();
