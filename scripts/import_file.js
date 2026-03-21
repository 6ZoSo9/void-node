"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var node_fs_1 = require("node:fs");
var node_readline_1 = require("node:readline");
var seg_store_1 = require("../src/chain/seg_store");
var DATA_DIR = process.env.DATA_DIR || "data_b";
var IN = process.env.IN;
if (!IN || !node_fs_1.default.existsSync(IN)) {
    console.error("[import] set IN=<file.ndjson>");
    process.exit(1);
}
var store = new seg_store_1.SegStore(DATA_DIR, { segmentMaxBytes: 8 * 1024 * 1024, sparseEvery: 16 });
var currentHead = store.loadHeadNumber();
var imported = 0;
var rl = node_readline_1.default.createInterface({ input: node_fs_1.default.createReadStream(IN), crlfDelay: Infinity });
rl.on("line", function (line) {
    if (!line.trim())
        return;
    try {
        var b = JSON.parse(line);
        // only append if beyond our head
        if (typeof b.number === "number" && b.number > currentHead) {
            store.saveBlock(b);
            imported++;
        }
    }
    catch (_) { }
});
rl.once("close", function () {
    console.log("[import] done: ".concat(imported, " blocks -> ").concat(DATA_DIR, ", head=").concat(store.loadHeadNumber()));
});
