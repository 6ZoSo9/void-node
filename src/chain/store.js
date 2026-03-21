"use strict";
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9
Object.defineProperty(exports, "__esModule", { value: true });
exports.Store = void 0;
// src/chain/store.ts
var seg_store_js_1 = require("./seg_store.js");
/** Thin compatibility wrapper retained for legacy imports. */
var Store = /** @class */ (function () {
    function Store(root) {
        this.seg = new seg_store_js_1.SegStore(root, { sparseEvery: 256 });
    }
    Store.prototype.loadHeadNumber = function () { return this.seg.loadHeadNumber(); };
    Store.prototype.loadBlock = function (n) { return this.seg.loadBlock(n); };
    Store.prototype.saveBlock = function (b) { this.seg.saveBlock(b); };
    return Store;
}());
exports.Store = Store;
