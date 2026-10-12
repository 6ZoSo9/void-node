"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
var DATA_DIR = process.env.DATA_DIR || "data_a";
var seg = "00000000";
var dir = node_path_1.default.join(DATA_DIR, "segments", seg);
var bin = node_path_1.default.join(dir, "blocks.bin");
var metaFile = node_path_1.default.join(dir, "meta.json");
if (!node_fs_1.default.existsSync(bin)) {
    console.error("[scan] no blocks.bin");
    process.exit(1);
}
var fd = node_fs_1.default.openSync(bin, "r");
var stat = node_fs_1.default.fstatSync(fd);
var pos = 0, count = 0;
var minNum = Infinity, maxNum = -1;
var lenBuf = Buffer.alloc(4);
while (pos + 4 <= stat.size) {
    node_fs_1.default.readSync(fd, lenBuf, 0, 4, pos);
    var len = lenBuf.readUInt32BE(0);
    if (len < 0 || pos + 4 + len > stat.size)
        break;
    var body = Buffer.alloc(len);
    node_fs_1.default.readSync(fd, body, 0, len, pos + 4);
    try {
        var b = JSON.parse(body.toString("utf8"));
        if (typeof b.number === "number") {
            if (b.number < minNum)
                minNum = b.number;
            if (b.number > maxNum)
                maxNum = b.number;
            count++;
        }
    }
    catch (_a) {
        if (!globalThis.__void_scripts_scan_bin_parse_seen) {
            globalThis.__void_scripts_scan_bin_parse_seen = true;
            console.warn("[scan_bin] VOID_SCRIPTS_SCAN_BIN_PARSE_VISIBLE", _a && _a.message ? _a.message : _a);
        }
    }
    pos += 4 + len;
}
node_fs_1.default.closeSync(fd);
var meta = node_fs_1.default.existsSync(metaFile) ? JSON.parse(node_fs_1.default.readFileSync(metaFile, "utf8")) : null;
console.log(JSON.stringify({
    dataDir: DATA_DIR,
    segment: seg,
    fileBytes: stat.size,
    blocksParsed: count,
    minNumber: isFinite(minNum) ? minNum : null,
    maxNumber: maxNum,
    meta: meta
}, null, 2));
