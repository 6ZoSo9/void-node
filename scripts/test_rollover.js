"use strict";
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var _a, e_1, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
var seg_store_1 = require("../src/chain/seg_store");
var DATA_DIR = process.env.DATA_DIR || "rollover_test";
// start clean
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
node_fs_1.default.rmSync(DATA_DIR, { recursive: true, force: true });
var opts = { segmentMaxBytes: 24 * 1024, sparseEvery: 10 }; // tiny to force rollover
var store = new seg_store_1.SegStore(DATA_DIR, opts);
// write blocks until at least two segments exist
var i = 0;
while (true) {
    var b = { number: i, data: "x".repeat(200), ts: Date.now(), hash: "0x".concat(i), parentHash: i ? "0x".concat(i - 1) : "0x00" };
    store.saveBlock(b);
    i++;
    // detect new segment by listing dirs
    var segs = node_fs_1.default.readdirSync(node_path_1.default.join(DATA_DIR, "segments")).filter(function (d) { return /^\d{8}$/.test(d); }).sort();
    if (segs.length >= 2) {
        console.log("[rollover] created second segment:", segs.join(", "));
        break;
    }
}
var head = store.loadHeadNumber();
console.log("[rollover] head:", head);
// verify reads across boundary
var mid = Math.floor(head / 2);
var samples = [0, mid, head];
for (var _i = 0, samples_1 = samples; _i < samples_1.length; _i++) {
    var n = samples_1[_i];
    var b = store.loadBlock(n);
    if (!b || b.number !== n)
        throw new Error("failed to read block " + n);
}
console.log("[rollover] random reads ok:", samples.join(", "));
// verify range stream
var count = 0;
try {
    for (var _d = true, _e = __asyncValues(store.findRange(0, head)), _f; _f = await _e.next(), _a = _f.done, !_a; _d = true) {
        _c = _f.value;
        _d = false;
        var b = _c;
        count++;
    }
}
catch (e_1_1) { e_1 = { error: e_1_1 }; }
finally {
    try {
        if (!_d && !_a && (_b = _e.return)) await _b.call(_e);
    }
    finally { if (e_1) throw e_1.error; }
}
if (count !== head + 1)
    throw new Error("range expected ".concat(head + 1, " got ").concat(count));
console.log("[rollover] range 0..head ok, count=", count);
// simulate restart and re-verify
var store2 = new seg_store_1.SegStore(DATA_DIR, opts);
if (store2.loadHeadNumber() !== head)
    throw new Error("head mismatch after restart");
var b0 = store2.loadBlock(0), bh = store2.loadBlock(head);
if (!b0 || !bh)
    throw new Error("post-restart read failed");
console.log("[rollover] restart read ok");
console.log("[OK] rollover test passed.");
