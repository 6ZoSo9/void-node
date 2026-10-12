"use strict";
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var _a, e_1, _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
var seg_store_1 = require("../src/chain/seg_store");
var DATA_DIR = process.env.DATA_DIR || "data_a";
var store = new seg_store_1.SegStore(DATA_DIR, { segmentMaxBytes: 8 * 1024 * 1024, sparseEvery: 16 });
var segDir = node_path_1.default.join(DATA_DIR, "segments");
var segs = node_fs_1.default.existsSync(segDir) ? node_fs_1.default.readdirSync(segDir).filter(function (d) { return /^\d{8}$/.test(d); }).sort() : [];
var problems = 0;
var say = function (s) { return console.log(s); };
say("[check] data_dir=".concat(DATA_DIR, " head=").concat(store.loadHeadNumber(), " segments=").concat(segs.join(",") || "(none)"));
for (var _i = 0, segs_1 = segs; _i < segs_1.length; _i++) {
    var seg = segs_1[_i];
    var dir = node_path_1.default.join(segDir, seg);
    var bin = node_path_1.default.join(dir, "blocks.bin");
    var metaFile = node_path_1.default.join(dir, "meta.json");
    var sparse = node_path_1.default.join(dir, "index.sparse");
    if (!node_fs_1.default.existsSync(bin)) {
        console.log("[X] ".concat(seg, " missing blocks.bin"));
        problems++;
    }
    if (!node_fs_1.default.existsSync(metaFile)) {
        console.log("[X] ".concat(seg, " missing meta.json"));
        problems++;
    }
    if (!node_fs_1.default.existsSync(sparse)) {
        console.log("[!] ".concat(seg, " missing index.sparse (repairable)"));
    }
    if (node_fs_1.default.existsSync(metaFile)) {
        try {
            var m = JSON.parse(node_fs_1.default.readFileSync(metaFile, "utf8"));
            if (!(Number.isFinite(m.from) && Number.isFinite(m.to) && m.to >= m.from)) {
                console.log("[X] ".concat(seg, " bad meta range:"), m);
                problems++;
            }
        }
        catch (e) {
            console.log("[X] ".concat(seg, " corrupt meta.json:"), e);
            problems++;
        }
    }
}
// sample random reads across the chain
var head = store.loadHeadNumber();
if (head >= 0) {
    var samples = [0, Math.floor(head / 2), head];
    for (var _e = 0, samples_1 = samples; _e < samples_1.length; _e++) {
        var n = samples_1[_e];
        var b = store.loadBlock(n);
        if (!b || b.number !== n) {
            console.log("[X] random read failed for #".concat(n));
            problems++;
        }
    }
    // verify full range via streaming
    var count = 0;
    try {
        for (var _f = true, _g = __asyncValues(store.findRange(0, head)), _h; _h = await _g.next(), _a = _h.done, !_a; _f = true) {
            _d = _h.value;
            _f = false;
            var _b = _d;
            count++;
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (!_f && !_a && (_c = _g.return)) await _c.call(_g);
        }
        finally { if (e_1) throw e_1.error; }
    }
    if (count !== head + 1) {
        console.log("[X] range count mismatch expected=".concat(head + 1, " got=").concat(count));
        problems++;
    }
}
console.log(problems ? "[check] FAIL: ".concat(problems, " problems") : "[check] OK");
process.exit(problems ? 1 : 0);
