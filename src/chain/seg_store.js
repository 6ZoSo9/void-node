"use strict";
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9
Object.defineProperty(exports, "__esModule", { value: true });
exports.SegStore = void 0;
// src/chain/seg_store.ts
var fs = require("node:fs");
var path = require("node:path");
var SEG_SPAN = 10000;
var SegStore = /** @class */ (function () {
    function SegStore(root, opts) {
        if (opts === void 0) { opts = {}; }
        var _a;
        this.metaCache = new Map();
        this.root = root;
        this.segDir = path.join(root, "segments");
        this.headsFile = path.join(root, "heads.json");
        this.sparseEvery = Math.max(1, Number((_a = opts.sparseEvery) !== null && _a !== void 0 ? _a : 256));
        if (!fs.existsSync(this.segDir))
            fs.mkdirSync(this.segDir, { recursive: true });
        if (!fs.existsSync(this.headsFile)) {
            fs.writeFileSync(this.headsFile, JSON.stringify({ head: -1, hash: "0x0" }, null, 2));
        }
    }
    // [ADD] Compatibility alias: saveBlock -> writeBlock (non-breaking)
    // @ts-ignore - back-compat: legacy signature kept; real impl below
    SegStore.prototype.saveBlock = function (b) {
        // If writeBlock exists, use it; otherwise surface a clear error
        // (keeps Node.sealBlock() happy while we stabilize APIs)
        // @ts-ignore
        var fn = this.writeBlock || this.persistBlock || this.appendBlock;
        if (typeof fn !== "function")
            throw new Error("SegStore.saveBlock not implemented");
        return fn.call(this, b);
    };
    SegStore.prototype.loadHeadNumber = function () {
        try {
            var j = JSON.parse(fs.readFileSync(this.headsFile, "utf8"));
            return Number.isFinite(j.head) ? j.head : -1;
        }
        catch (_a) {
            return -1;
        }
    };
    SegStore.prototype.persistHead = function (n) {
        try {
            var j = JSON.parse(fs.readFileSync(this.headsFile, "utf8"));
            j.head = n;
            fs.writeFileSync(this.headsFile, JSON.stringify(j, null, 2));
        }
        catch (_a) {
            fs.writeFileSync(this.headsFile, JSON.stringify({ head: n, hash: "0x0" }, null, 2));
        }
    };
    SegStore.prototype.segBase = function (n) { return Math.floor(n / SEG_SPAN) * SEG_SPAN; };
    SegStore.prototype.segName = function (n) { return String(this.segBase(n)).padStart(8, "0"); };
    SegStore.prototype.segPaths = function (seg) {
        var dir = path.join(this.segDir, seg);
        return {
            dir: dir,
            bin: path.join(dir, "blocks.bin"),
            idx: path.join(dir, "index.sparse"),
            meta: path.join(dir, "meta.json"),
        };
    };
    SegStore.prototype.ensureSeg = function (seg) {
        var _a = this.segPaths(seg), dir = _a.dir, bin = _a.bin, idx = _a.idx, meta = _a.meta;
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        if (!fs.existsSync(bin))
            fs.writeFileSync(bin, Buffer.alloc(0));
        if (!fs.existsSync(idx))
            fs.writeFileSync(idx, "");
        if (!fs.existsSync(meta)) {
            var from = Number(seg);
            var m = { from: from, to: from - 1, bytes: 0, createdAt: Date.now(), updatedAt: Date.now() };
            fs.writeFileSync(meta, JSON.stringify(m, null, 2));
            this.metaCache.set(seg, m);
        }
    };
    SegStore.prototype.meta = function (seg) {
        if (this.metaCache.has(seg))
            return this.metaCache.get(seg);
        var meta = this.segPaths(seg).meta;
        try {
            var m = JSON.parse(fs.readFileSync(meta, "utf8"));
            this.metaCache.set(seg, m);
            return m;
        }
        catch (_a) {
            var from = Number(seg);
            var m = { from: from, to: from - 1, bytes: 0, createdAt: Date.now(), updatedAt: Date.now() };
            this.metaCache.set(seg, m);
            return m;
        }
    };
    SegStore.prototype.putMeta = function (seg, m) {
        var meta = this.segPaths(seg).meta;
        m.updatedAt = Date.now();
        fs.writeFileSync(meta, JSON.stringify(m, null, 2));
        this.metaCache.set(seg, m);
    };
    // @ts-ignore - back-compat: second impl retained for runtime; TS ignore
    SegStore.prototype.saveBlock = function (b) {
        var seg = this.segName(b.number);
        this.ensureSeg(seg);
        var _a = this.segPaths(seg), bin = _a.bin, idx = _a.idx;
        var m = this.meta(seg);
        var body = Buffer.from(JSON.stringify(b));
        var len = Buffer.alloc(4);
        len.writeUInt32BE(body.length, 0);
        var off = fs.statSync(bin).size;
        fs.appendFileSync(bin, Buffer.concat([len, body]));
        if (b.number % this.sparseEvery === 0) {
            fs.appendFileSync(idx, JSON.stringify({ n: b.number, off: off }) + "\n");
        }
        m.to = Math.max(m.to, b.number);
        m.bytes += 4 + body.length;
        this.putMeta(seg, m);
        this.persistHead(b.number);
    };
    SegStore.prototype.loadBlock = function (n) {
        var seg = this.segName(n);
        var _a = this.segPaths(seg), bin = _a.bin, idx = _a.idx;
        if (!fs.existsSync(bin))
            return null;
        // Find nearest index offset <= n
        var nearestOff = 0;
        try {
            var lines = fs.readFileSync(idx, "utf8").split("\n");
            for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
                var line = lines_1[_i];
                if (!line)
                    continue;
                var ent = JSON.parse(line);
                if (Number.isFinite(ent.n) && ent.n <= n && ent.off >= 0)
                    nearestOff = Math.max(nearestOff, ent.off);
            }
        }
        catch (_b) { if(!globalThis.__void_chain_seg_store_index_parse_seen){globalThis.__void_chain_seg_store_index_parse_seen=true;console.warn("VOID_CHAIN_SEG_STORE_INDEX_PARSE_VISIBLE",_b&&_b.message?_b.message:_b);} }
        var fd = fs.openSync(bin, "r");
        try {
            var st = fs.fstatSync(fd);
            var off = nearestOff;
            var lenBuf = Buffer.alloc(4);
            while (off + 4 <= st.size) {
                fs.readSync(fd, lenBuf, 0, 4, off);
                var len = lenBuf.readUInt32BE(0);
                var start = off + 4;
                if (start + len > st.size)
                    break;
                var buf = Buffer.alloc(len);
                fs.readSync(fd, buf, 0, len, start);
                var blk = JSON.parse(buf.toString("utf8"));
                if (blk.number === n)
                    return blk;
                off = start + len;
            }
        }
        catch (_c) {
            /* ignore */
        }
        finally {
            try {
                fs.closeSync(fd);
            }
            catch (_d) { if(!globalThis.__void_chain_seg_store_close_seen){globalThis.__void_chain_seg_store_close_seen=true;console.warn("VOID_CHAIN_SEG_STORE_CLOSE_VISIBLE",_d&&_d.message?_d.message:_d);} }
        }
        return null;
    };
    return SegStore;
}());
exports.SegStore = SegStore;
