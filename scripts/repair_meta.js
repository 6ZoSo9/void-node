"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
var DATA_DIR = process.env.DATA_DIR || "data_a";
var seg = process.env.SEG || "00000000";
var dir = node_path_1.default.join(DATA_DIR, "segments", seg);
var bin = node_path_1.default.join(dir, "blocks.bin");
var metaFile = node_path_1.default.join(dir, "meta.json");
if (!node_fs_1.default.existsSync(bin)) {
    console.error("[repair_meta] no blocks.bin");
    process.exit(1);
}
var fd = node_fs_1.default.openSync(bin, "r");
var stat = node_fs_1.default.fstatSync(fd);
var pos = 0;
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
        }
    }
    catch (_a) {
        if (!globalThis.__void_scripts_repair_meta_parse_seen) {
            globalThis.__void_scripts_repair_meta_parse_seen = true;
            console.warn("[repair_meta] VOID_SCRIPTS_REPAIR_META_PARSE_VISIBLE", _a && _a.message ? _a.message : _a);
        }
    }
    pos += 4 + len;
}
node_fs_1.default.closeSync(fd);
if (!isFinite(minNum) || maxNum < 0) {
    console.error("[repair_meta] no blocks parsed; aborting.");
    process.exit(1);
}
var now = Date.now();
var meta = { from: minNum, to: maxNum, bytes: stat.size, createdAt: now, updatedAt: now };
node_fs_1.default.writeFileSync(metaFile, JSON.stringify(meta, null, 2));
console.log("[repair_meta] wrote meta:", meta);
