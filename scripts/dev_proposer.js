"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var seg_store_1 = require("../src/chain/seg_store");
var DATA_DIR = process.env.DATA_DIR || "data";
var INTERVAL_MS = Number(process.env.INTERVAL_MS || 500);
var store = new seg_store_1.SegStore(DATA_DIR, { segmentMaxBytes: 8 * 1024 * 1024, sparseEvery: 16 });
var n = store.loadHeadNumber() + 1;
var parent = n > 0 ? "0x".concat(n - 1) : "0x00";
console.log("[dev_proposer] starting at head+1=".concat(n, " (DATA_DIR=").concat(DATA_DIR, ") interval=").concat(INTERVAL_MS, "ms"));
setInterval(function () {
    var b = {
        number: n,
        parentHash: parent,
        hash: "0x".concat(n),
        ts: Date.now(),
        payload: { note: "dev proposer" },
    };
    store.saveBlock(b);
    process.stdout.write("appended #".concat(n, "\r"));
    parent = "0x".concat(n);
    n++;
}, INTERVAL_MS);
