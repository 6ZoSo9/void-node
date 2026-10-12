"use strict";
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9
Object.defineProperty(exports, "__esModule", { value: true });
exports.txBuffer = void 0;
var TxBuffer = /** @class */ (function () {
    function TxBuffer() {
        this.q = [];
        this.pushed_total = 0;
        this.popped_total = 0;
    }
    TxBuffer.prototype.push = function (tx) {
        // trivial de-dupe on id (keep last)
        var i = this.q.findIndex(function (t) { return t.id === tx.id; });
        if (i >= 0)
            this.q.splice(i, 1);
        this.q.push(tx);
        this.pushed_total++;
    };
    TxBuffer.prototype.size = function () { return this.q.length; };
    // pop up to N, FIFO
    TxBuffer.prototype.popN = function (n) {
        var out = [];
        var take = Math.max(0, Math.min(n | 0, this.q.length));
        for (var i = 0; i < take; i++)
            out.push(this.q.shift());
        this.popped_total += out.length;
        return out;
    };
    TxBuffer.prototype.sample = function (max) {
        if (max === void 0) { max = 10; }
        if (this.q.length <= max)
            return this.q.slice();
        // take tail-ish sample to bias toward newer
        return this.q.slice(-max);
    };
    TxBuffer.prototype.clear = function () { this.q.length = 0; };
    return TxBuffer;
}());
exports.txBuffer = new TxBuffer();
