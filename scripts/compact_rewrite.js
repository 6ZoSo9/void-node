"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
var seg_store_1 = require("../src/chain/seg_store");
var DATA_DIR = process.env.DATA_DIR || "data_a";
var TMP_DIR = "".concat(DATA_DIR, "_rewrite_tmp");
// read all blocks by scanning the raw file (not using SegStore) to recover as much as possible
function scanAll(dir) {
    var bin = node_path_1.default.join(dir, "segments", "00000000", "blocks.bin");
    if (!node_fs_1.default.existsSync(bin))
        return [];
    var fd = node_fs_1.default.openSync(bin, "r");
    var stat = node_fs_1.default.fstatSync(fd);
    var pos = 0;
    var lenBuf = Buffer.alloc(4);
    var out = [];
    while (pos + 4 <= stat.size) {
        node_fs_1.default.readSync(fd, lenBuf, 0, 4, pos);
        var len = lenBuf.readUInt32BE(0);
        if (len < 0 || pos + 4 + len > stat.size)
            break;
        var body = Buffer.alloc(len);
        node_fs_1.default.readSync(fd, body, 0, len, pos + 4);
        try {
            out.push(JSON.parse(body.toString("utf8")));
        }
        catch (_a) {
            if (!globalThis.__void_scripts_compact_rewrite_parse_seen) {
                globalThis.__void_scripts_compact_rewrite_parse_seen = true;
                console.warn("[compact_rewrite] VOID_SCRIPTS_COMPACT_REWRITE_PARSE_VISIBLE", _a && _a.message ? _a.message : _a);
            }
        }
        pos += 4 + len;
    }
    node_fs_1.default.closeSync(fd);
    return out;
}
function uniqueIncreasing(blocks) {
    var map = new Map();
    for (var _i = 0, blocks_1 = blocks; _i < blocks_1.length; _i++) {
        var b = blocks_1[_i];
        if (typeof (b === null || b === void 0 ? void 0 : b.number) === "number") {
            // keep the FIRST seen version of each height (or choose latest; pick one policy)
            if (!map.has(b.number))
                map.set(b.number, b);
        }
    }
    return Array.from(map.keys()).sort(function (a, b) { return a - b; }).map(function (k) { return map.get(k); });
}
function main() {
    var srcDir = DATA_DIR;
    var tmp = TMP_DIR;
    node_fs_1.default.rmSync(tmp, { recursive: true, force: true });
    node_fs_1.default.mkdirSync(node_path_1.default.join(tmp, "segments", "00000000"), { recursive: true });
    var all = scanAll(srcDir);
    var uniq = uniqueIncreasing(all);
    if (uniq.length === 0) {
        console.error("[compact] no blocks found");
        process.exit(1);
    }
    // write into tmp via a fresh SegStore (forces new meta/sparse)
    var store = new seg_store_1.SegStore(tmp, { segmentMaxBytes: 8 * 1024 * 1024, sparseEvery: 16 });
    for (var _i = 0, uniq_1 = uniq; _i < uniq_1.length; _i++) {
        var b = uniq_1[_i];
        store.saveBlock(b);
    }
    // atomically swap: move old to backup, tmp to live
    var bak = "".concat(DATA_DIR, ".bak_").concat(Date.now());
    node_fs_1.default.renameSync(srcDir, bak);
    node_fs_1.default.renameSync(tmp, srcDir);
    console.log("[compact] wrote ".concat(uniq.length, " unique blocks. backup saved at ").concat(bak));
}
main();
