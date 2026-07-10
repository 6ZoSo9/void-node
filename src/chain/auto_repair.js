"use strict";
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoRepairDataDir = autoRepairDataDir;
// src/chain/auto_repair.ts
/**
 * Best-effort store repair for SegStore layout.
 * - Verifies/creates segment dirs, meta.json, index.sparse
 * - Rebuilds sparse index by scanning blocks.bin length-prefixed frames
 * - Fixes heads.json "head" to highest discovered block
 *
 * Idempotent and safe to run at startup.
 */
var fs = require("node:fs");
var path = require("node:path");
var node_url_1 = require("node:url");
var SEG_SPAN = 10000;
function ensureDir(p) {
    if (!fs.existsSync(p))
        fs.mkdirSync(p, { recursive: true });
}
function segNameFor(n) {
    return String(Math.floor(n / SEG_SPAN) * SEG_SPAN).padStart(8, "0");
}
function segPaths(root, seg) {
    var dir = path.join(root, "segments", seg);
    return {
        dir: dir,
        bin: path.join(dir, "blocks.bin"),
        idx: path.join(dir, "index.sparse"),
        meta: path.join(dir, "meta.json"),
    };
}
function readFrames(binPath) {
    var offs = [];
    var lastOff = 0;
    var totalBytes = 0;
    var lastN = -1;
    if (!fs.existsSync(binPath))
        return { offs: offs, lastOff: lastOff, totalBytes: totalBytes, lastN: lastN };
    var fd = fs.openSync(binPath, "r");
    try {
        var st = fs.fstatSync(fd);
        var lenBuf = Buffer.alloc(4);
        var off = 0;
        while (off + 4 <= st.size) {
            fs.readSync(fd, lenBuf, 0, 4, off);
            var len = lenBuf.readUInt32BE(0);
            var start = off + 4;
            if (start + len > st.size)
                break;
            offs.push(off);
            var buf = Buffer.alloc(len);
            fs.readSync(fd, buf, 0, len, start);
            var n = -1;
            try {
                var j = JSON.parse(buf.toString("utf8"));
                if (Number.isFinite(j === null || j === void 0 ? void 0 : j.number))
                    n = Number(j.number);
            }
            catch (_a) { if(!globalThis.__void_chain_auto_repair_scan_parse_seen){globalThis.__void_chain_auto_repair_scan_parse_seen=true;console.warn("VOID_CHAIN_AUTO_REPAIR_SCAN_PARSE_VISIBLE",_a&&_a.message?_a.message:_a);} }
            if (n > lastN)
                lastN = n;
            off = start + len;
            totalBytes = off;
            lastOff = off;
        }
    }
    finally {
        try {
            fs.closeSync(fd);
        }
        catch (_b) { if(!globalThis.__void_chain_auto_repair_close_seen){globalThis.__void_chain_auto_repair_close_seen=true;console.warn("VOID_CHAIN_AUTO_REPAIR_CLOSE_VISIBLE",_b&&_b.message?_b.message:_b);} }
    }
    return { offs: offs, lastOff: lastOff, totalBytes: totalBytes, lastN: lastN };
}
function writeMeta(metaPath, m) {
    m.updatedAt = Date.now();
    fs.writeFileSync(metaPath, JSON.stringify(m, null, 2));
}
function autoRepairDataDir(root_1) {
    return __awaiter(this, arguments, void 0, function (root, opts) {
        var sparseEvery, segRoot, headsPath, segs, globalHead, _i, segs_1, seg, _a, dir, bin, idx, meta, scan, base, m, needRebuildIdx, lines, st, _b, _c, off, lenBuf, fd, len, start, buf, j, n, j;
        var _d;
        if (opts === void 0) { opts = {}; }
        return __generator(this, function (_e) {
            sparseEvery = Math.max(1, Number((_d = opts.sparseEvery) !== null && _d !== void 0 ? _d : 256));
            ensureDir(root);
            segRoot = path.join(root, "segments");
            ensureDir(segRoot);
            headsPath = path.join(root, "heads.json");
            if (!fs.existsSync(headsPath)) {
                fs.writeFileSync(headsPath, JSON.stringify({ head: -1, hash: "0x0" }, null, 2));
            }
            segs = fs
                .readdirSync(segRoot)
                .filter(function (d) { return /^\d{8}$/.test(d); })
                .sort(function (a, b) { return Number(a) - Number(b); });
            globalHead = -1;
            for (_i = 0, segs_1 = segs; _i < segs_1.length; _i++) {
                seg = segs_1[_i];
                _a = segPaths(root, seg), dir = _a.dir, bin = _a.bin, idx = _a.idx, meta = _a.meta;
                ensureDir(dir);
                if (!fs.existsSync(bin))
                    fs.writeFileSync(bin, Buffer.alloc(0));
                if (!fs.existsSync(idx))
                    fs.writeFileSync(idx, "");
                scan = readFrames(bin);
                base = Number(seg);
                m = fs.existsSync(meta)
                    ? JSON.parse(fs.readFileSync(meta, "utf8"))
                    : { from: base, to: base - 1, bytes: 0, createdAt: Date.now(), updatedAt: Date.now() };
                needRebuildIdx = !fs.existsSync(idx) || fs.statSync(idx).size === 0;
                if (needRebuildIdx && scan.offs.length) {
                    lines = [];
                    st = fs.statSync(bin);
                    for (_b = 0, _c = scan.offs; _b < _c.length; _b++) {
                        off = _c[_b];
                        lenBuf = Buffer.alloc(4);
                        fd = fs.openSync(bin, "r");
                        try {
                            fs.readSync(fd, lenBuf, 0, 4, off);
                            len = lenBuf.readUInt32BE(0);
                            start = off + 4;
                            if (start + len > st.size)
                                break;
                            buf = Buffer.alloc(len);
                            fs.readSync(fd, buf, 0, len, start);
                            j = JSON.parse(buf.toString("utf8"));
                            n = Number(j === null || j === void 0 ? void 0 : j.number);
                            if (Number.isFinite(n) && n % sparseEvery === 0) {
                                lines.push(JSON.stringify({ n: n, off: off }));
                            }
                        }
                        catch (_f) {
                            /* ignore */
                        }
                        finally {
                            try {
                                fs.closeSync(fd);
                            }
                            catch (_g) { if(!globalThis.__void_chain_auto_repair_index_close_seen){globalThis.__void_chain_auto_repair_index_close_seen=true;console.warn("VOID_CHAIN_AUTO_REPAIR_INDEX_CLOSE_VISIBLE",_g&&_g.message?_g.message:_g);} }
                        }
                    }
                    if (lines.length)
                        fs.writeFileSync(idx, lines.join("\n") + "\n");
                }
                // Update meta
                m.to = Math.max(m.to, scan.lastN);
                m.bytes = Math.max(m.bytes, scan.totalBytes);
                writeMeta(meta, m);
                if (scan.lastN > globalHead)
                    globalHead = scan.lastN;
            }
            // Fix heads.json
            try {
                j = JSON.parse(fs.readFileSync(headsPath, "utf8"));
                if (!Number.isFinite(j.head) || j.head < globalHead) {
                    j.head = globalHead;
                    fs.writeFileSync(headsPath, JSON.stringify(j, null, 2));
                }
            }
            catch (_h) {
                fs.writeFileSync(headsPath, JSON.stringify({ head: globalHead, hash: "0x0" }, null, 2));
            }
            return [2 /*return*/, {
                    ok: true,
                    root: root,
                    sparseEvery: sparseEvery,
                    segs: segs.length,
                    head: globalHead,
                }];
        });
    });
}
// Optional CLI usage: `tsx src/chain/auto_repair.ts <DATA_DIR>`
if (process.argv[1] && (0, node_url_1.fileURLToPath)(import.meta.url) === process.argv[1]) {
    var dir = process.argv[2] || process.env.DATA_DIR || "data";
    autoRepairDataDir(dir).then(function (r) {
        console.log(JSON.stringify(r, null, 2));
    });
}
