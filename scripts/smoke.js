"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var seg_store_1 = require("../src/chain/seg_store");
var store = new seg_store_1.SegStore(process.env.DATA_DIR || "data", {
    segmentMaxBytes: 1024 * 1024,
    sparseEvery: 5,
});
// append 25 simple blocks
for (var i = 0; i < 25; i++) {
    var b = {
        number: i,
        parentHash: i === 0 ? "0x00" : "0x".concat(i - 1),
        hash: "0x".concat(i),
        ts: Date.now(),
        data: "smoke-".concat(i),
    };
    store.saveBlock(b);
}
console.log("head =", store.loadHeadNumber());
