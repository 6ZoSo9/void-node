"use strict";
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mempool = void 0;
var Mempool = /** @class */ (function () {
    function Mempool() {
        this.q = [];
    }
    Mempool.prototype.push = function (tx) {
        var _a;
        if (!tx || typeof tx !== "object")
            return;
        if (!/^[0-9a-f]{64}$/i.test(String(tx.hash || "")))
            return;
        this.q.push({ hash: String(tx.hash).toLowerCase(), body: (_a = tx.body) !== null && _a !== void 0 ? _a : {} });
    };
    Mempool.prototype.peekAll = function () { return this.q.slice(); };
    Mempool.prototype.clear = function () { this.q.length = 0; };
    Mempool.prototype.drain = function (max) {
        if (!max || max >= this.q.length) {
            var a = this.q;
            this.q = [];
            return a;
        }
        return this.q.splice(0, max);
    };
    Mempool.prototype.popMany = function (max) {
        if (max === void 0) { max = 1000; }
        return this.drain(max);
    };
    Mempool.prototype.take = function (max) {
        if (max === void 0) { max = 1000; }
        return this.drain(max);
    };
    return Mempool;
}());
exports.Mempool = Mempool;
