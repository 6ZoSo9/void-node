"use strict";
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9
Object.defineProperty(exports, "__esModule", { value: true });
exports.drainTxs = drainTxs;
var tx_buffer_js_1 = require("../tx_buffer.js");
function drainTxs(opts) {
    var _a;
    if (opts === void 0) { opts = {}; }
    var max = Math.min(1000, Math.max(0, (_a = opts.max) !== null && _a !== void 0 ? _a : 100));
    if (max === 0)
        return [];
    var raw = tx_buffer_js_1.txBuffer.popN(max);
    if (!opts.stringify)
        return raw.map(function (t) { return t.data; }); // in case we ever switch to objects
    // default: strings already (tx_routes stringifies), just map
    return raw.map(function (t) { return t.data; });
}
