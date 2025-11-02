"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
var seg_store_1 = require("../src/chain/seg_store");
var DATA_DIR = process.env.DATA_DIR || "data_a";
var EVERY = Number(process.env.SPARSE_EVERY || 16);
function writeU64BE(buf, offset, value) {
    var hi = Math.floor(value / 0x100000000);
    var lo = value >>> 0;
    buf.writeUInt32BE(hi, offset);
    buf.writeUInt32BE(lo, offset + 4);
}
var store = new seg_store_1.SegStore(DATA_DIR, { segmentMaxBytes: 8 * 1024 * 1024, sparseEvery: EVERY });
var segDir = node_path_1.default.join(DATA_DIR, "segments");
var segs = node_fs_1.default.existsSync(segDir) ? node_fs_1.default.readdirSync(segDir).filter(function (d) { return /^\d{8}$/.test(d); }).sort() : [];
for (var _i = 0, segs_1 = segs; _i < segs_1.length; _i++) {
    var seg = segs_1[_i];
    var dir = node_path_1.default.join(segDir, seg);
    var bin = node_path_1.default.join(dir, "blocks.bin");
    var sparse = node_path_1.default.join(dir, "index.sparse");
    if (!node_fs_1.default.existsSync(bin))
        continue;
    var fd = node_fs_1.default.openSync(bin, "r");
    var stat = node_fs_1.default.fstatSync(fd);
    var pos = 0, count = 0;
    var out = [];
    var lenBuf = Buffer.alloc(4);
    while (pos + 4 <= stat.size) {
        node_fs_1.default.readSync(fd, lenBuf, 0, 4, pos);
        var len = lenBuf.readUInt32BE(0);
        if (len < 0 || pos + 4 + len > stat.size)
            break;
        var body = Buffer.alloc(len);
        node_fs_1.default.readSync(fd, body, 0, len, pos + 4);
        var b = JSON.parse(body.toString("utf8"));
        if (b.number % EVERY === 0) {
            var rec = Buffer.alloc(12);
            rec.writeUInt32BE(b.number, 0);
            writeU64BE(rec, 4, pos);
            out.push(rec);
        }
        pos += 4 + len;
        count++;
    }
    node_fs_1.default.closeSync(fd);
    node_fs_1.default.writeFileSync(sparse, Buffer.concat(out));
    console.log("[reindex] ".concat(seg, ": wrote ").concat(out.length, " sparse entries (").concat(count, " blocks)"));
}
console.log("[reindex] done.");
