"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
var DATA_DIR = process.env.DATA_DIR || "data_a";
var seg = process.env.SEG || "00000000";
var dir = node_path_1.default.join(DATA_DIR, "segments", seg);
var bin = node_path_1.default.join(dir, "blocks.bin");
if (!node_fs_1.default.existsSync(bin)) {
    console.error("[audit] no blocks.bin");
    process.exit(1);
}
var fd = node_fs_1.default.openSync(bin, "r");
var stat = node_fs_1.default.fstatSync(fd);
var pos = 0;
var lenBuf = Buffer.alloc(4);
var nums = [];
while (pos + 4 <= stat.size) {
    node_fs_1.default.readSync(fd, lenBuf, 0, 4, pos);
    var len = lenBuf.readUInt32BE(0);
    if (len < 0 || pos + 4 + len > stat.size)
        break;
    var body = Buffer.alloc(len);
    node_fs_1.default.readSync(fd, body, 0, len, pos + 4);
    try {
        var b = JSON.parse(body.toString("utf8"));
        if (typeof (b === null || b === void 0 ? void 0 : b.number) === "number")
            nums.push(b.number);
    }
    catch (_a) {
        if (!globalThis.__void_scripts_audit_numbers_parse_seen) {
            globalThis.__void_scripts_audit_numbers_parse_seen = true;
            console.warn("[audit_numbers] VOID_SCRIPTS_AUDIT_NUMBERS_PARSE_VISIBLE", _a && _a.message ? _a.message : _a);
        }
    }
    pos += 4 + len;
}
node_fs_1.default.closeSync(fd);
nums.sort(function (a, b) { return a - b; });
var uniq = [];
var dupes = [];
for (var i = 0; i < nums.length; i++) {
    if (i === 0 || nums[i] !== nums[i - 1])
        uniq.push(nums[i]);
    else
        dupes.push(nums[i]);
}
var min = uniq.length ? uniq[0] : null;
var max = uniq.length ? uniq[uniq.length - 1] : null;
var missing = [];
if (min !== null && max !== null) {
    var p = min;
    for (var _i = 0, uniq_1 = uniq; _i < uniq_1.length; _i++) {
        var n = uniq_1[_i];
        while (p < n) {
            missing.push(p);
            p++;
        }
        p = n + 1;
    }
}
console.log(JSON.stringify({
    dataDir: DATA_DIR,
    segment: seg,
    blocksParsed: nums.length,
    uniqueHeights: uniq.length,
    min: min,
    max: max,
    duplicatesSample: dupes.slice(0, 20),
    missingCount: missing.length,
    missingSample: missing.slice(0, 50)
}, null, 2));
