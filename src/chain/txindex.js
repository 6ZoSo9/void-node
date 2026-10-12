"use strict";
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9
Object.defineProperty(exports, "__esModule", { value: true });
exports.TxIndex = void 0;
// src/chain/txindex.ts
var fs = require("node:fs");
var path = require("node:path");
/**
 * Simple append-only tx index:
 *   index/tx-00000000.jsonl with refs {"h":hash,"n":block,"o":offset}
 */
var TxIndex = /** @class */ (function () {
    function TxIndex(dir) {
        this.span = 10000;
        this.dir = dir;
        if (!fs.existsSync(this.dir))
            fs.mkdirSync(this.dir, { recursive: true });
    }
    TxIndex.prototype.baseFor = function (n) { return Math.floor(n / this.span) * this.span; };
    TxIndex.prototype.fileForBase = function (base) { return path.join(this.dir, "tx-".concat(String(base).padStart(8, "0"), ".jsonl")); };
    TxIndex.prototype.shardForBlock = function (n) {
        var base = this.baseFor(n);
        return { from: base, to: base + this.span - 1, path: this.fileForBase(base) };
    };
    TxIndex.prototype.listShards = function () {
        var out = [];
        try {
            for (var _i = 0, _a = fs.readdirSync(this.dir); _i < _a.length; _i++) {
                var f = _a[_i];
                var m = f.match(/^tx-(\d{8})\.jsonl$/);
                if (!m)
                    continue;
                var base = Number(m[1]);
                out.push({ from: base, to: base + this.span - 1, path: path.join(this.dir, f) });
            }
        }
        catch (_b) { if(!(_b&&_b.code==="ENOENT")&&!globalThis.__void_chain_txindex_list_shards_seen){globalThis.__void_chain_txindex_list_shards_seen=true;console.warn("VOID_CHAIN_TXINDEX_LIST_SHARDS_VISIBLE",_b&&_b.message?_b.message:_b);} }
        out.sort(function (a, b) { return a.from - b.from; });
        return out;
    };
    TxIndex.prototype.putMany = function (refs) {
        if (!Array.isArray(refs) || refs.length === 0)
            return;
        var groups = new Map();
        for (var _i = 0, refs_1 = refs; _i < refs_1.length; _i++) {
            var r = refs_1[_i];
            var h = String(r.h || "").toLowerCase();
            if (!/^[0-9a-f]{64}$/.test(h))
                continue;
            if (!Number.isFinite(r.n) || !Number.isFinite(r.o))
                continue;
            var base = this.baseFor(r.n);
            if (!groups.has(base))
                groups.set(base, []);
            groups.get(base).push({ h: h, n: r.n, o: r.o });
        }
        fs.mkdirSync(this.dir, { recursive: true });
        for (var _a = 0, groups_1 = groups; _a < groups_1.length; _a++) {
            var _b = groups_1[_a], base = _b[0], items = _b[1];
            var file = this.fileForBase(base);
            var lines = items.map(function (i) { return JSON.stringify(i); }).join("\n") + "\n";
            fs.appendFileSync(file, lines);
        }
    };
    TxIndex.prototype.lookupInShard = function (file, hashHex) {
        var needle = String(hashHex || "").toLowerCase();
        if (!/^[0-9a-f]{64}$/.test(needle))
            return { found: false, n: -1, o: -1 };
        try {
            var lines = fs.readFileSync(file, "utf8").split("\n");
            for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
                var line = lines_1[_i];
                if (!line)
                    continue;
                var r = JSON.parse(line);
                if (r.h === needle)
                    return { found: true, n: r.n, o: r.o };
            }
        }
        catch (_a) { if(!(_a&&_a.code==="ENOENT")&&!globalThis.__void_chain_txindex_lookup_shard_seen){globalThis.__void_chain_txindex_lookup_shard_seen=true;console.warn("VOID_CHAIN_TXINDEX_LOOKUP_SHARD_VISIBLE",_a&&_a.message?_a.message:_a);} }
        return { found: false, n: -1, o: -1 };
    };
    return TxIndex;
}());
exports.TxIndex = TxIndex;
