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
exports.ReceiptsStore = void 0;
// src/chain/receipts.ts
var fs = require("node:fs");
var path = require("node:path");

var VOID_RECEIPTS_EMPTY_CATCH_VISIBILITY_V1_MARKER = "VOID_RECEIPTS_EMPTY_CATCH_VISIBILITY_V1";
function recordVoidReceiptsEmptyCatchVisibilityV1(site, err) {
    try {
        var g = globalThis;
        var key = "__void_receipts_empty_catch_visibility_v1";
        var bucket = Array.isArray(g[key]) ? g[key] : [];
        bucket.push({
            marker: VOID_RECEIPTS_EMPTY_CATCH_VISIBILITY_V1_MARKER,
            site: String(site || "unknown"),
            message: err && err.message ? String(err.message) : String(err || ""),
        });
        while (bucket.length > 50)
            bucket.shift();
        g[key] = bucket;
    }
    catch (_visibilityRecordErr) {
        /* VOID_RECEIPTS_EMPTY_CATCH_VISIBILITY_V1_RECORD_FAILURE_SUPPRESSED */
    }
}
var ReceiptsStore = /** @class */ (function () {
    function ReceiptsStore(dir, opts) {
        if (opts === void 0) { opts = {}; }
        var _a;
        this.mem = new Map();
        this.dir = dir;
        this.shardSpan = Math.max(10000, Number((_a = opts.shardSpan) !== null && _a !== void 0 ? _a : 100000));
        if (!fs.existsSync(this.dir))
            fs.mkdirSync(this.dir, { recursive: true });
    }
    /** Pick shard filename based on current mem size (cheap rolling). */
    ReceiptsStore.prototype.shardPathFromHead = function () {
        var base = Math.floor(this.mem.size / this.shardSpan) * this.shardSpan;
        return path.join(this.dir, "receipts-".concat(String(base).padStart(8, "0"), ".jsonl"));
    };
    /** Append many receipts and update the in-memory map. */
    ReceiptsStore.prototype.appendMany = function (arr) {
        return __awaiter(this, void 0, void 0, function () {
            var p, lines;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!Array.isArray(arr) || arr.length === 0)
                            return [2 /*return*/];
                        return [4 /*yield*/, fs.promises.mkdir(this.dir, { recursive: true })];
                    case 1:
                        _a.sent();
                        p = this.shardPathFromHead();
                        lines = arr
                            .map(function (r) { return ({
                            h: String(r.h || "").toLowerCase(),
                            n: Number(r.n),
                            o: Number(r.o),
                            ts: Number(r.ts) || Date.now(),
                        }); })
                            .filter(function (r) { return /^[0-9a-f]{64}$/.test(r.h) && Number.isFinite(r.n) && Number.isFinite(r.o); })
                            .map(function (r) {
                            _this.mem.set(r.h, { n: r.n, o: r.o, ts: r.ts, found: true });
                            return JSON.stringify(r);
                        })
                            .join("\n");
                        if (!lines) return [3 /*break*/, 3];
                        return [4 /*yield*/, fs.promises.appendFile(p, lines + "\n")];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /** Get a receipt by tx hash; lazily scans newest shards first if missing from memory. */
    ReceiptsStore.prototype.get = function (hashHex) {
        var h = String(hashHex || "").toLowerCase();
        if (!/^[0-9a-f]{64}$/.test(h))
            return { found: false };
        var val = this.mem.get(h);
        if (val)
            return val;
        // Lazy scan newest -> oldest
        try {
            var files = fs
                .readdirSync(this.dir)
                .filter(function (f) { return /^receipts-\d{8}\.jsonl$/.test(f); })
                .sort(function (a, b) { return b.localeCompare(a); });
            for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
                var f = files_1[_i];
                var p = path.join(this.dir, f);
                var data = fs.readFileSync(p, "utf8").split("\n");
                for (var _a = 0, data_1 = data; _a < data_1.length; _a++) {
                    var line = data_1[_a];
                    if (!line)
                        continue;
                    try {
                        var r = JSON.parse(line);
                        if (r.h === h) {
                            var out = { n: r.n, o: r.o, ts: r.ts, found: true };
                            this.mem.set(h, out);
                            return out;
                        }
                    }
                    catch (_b) { recordVoidReceiptsEmptyCatchVisibilityV1('VOID_RECEIPTS_EMPTY_CATCH_VISIBILITY_V1_SITE_GET_JSON_PARSE_LINE', _b); }
                }
            }
        }
        catch (_c) { recordVoidReceiptsEmptyCatchVisibilityV1('VOID_RECEIPTS_EMPTY_CATCH_VISIBILITY_V1_SITE_GET_SCAN_OUTER', _c); }
        return { found: false };
    };
    /** Lightweight stats for observability endpoints. */
    ReceiptsStore.prototype.stats = function () {
        var totalBytes = 0;
        var totalLines = 0;
        var shards = [];
        try {
            var files = fs
                .readdirSync(this.dir)
                .filter(function (f) { return /^receipts-\d{8}\.jsonl$/.test(f); })
                .sort();
            for (var _i = 0, files_2 = files; _i < files_2.length; _i++) {
                var f = files_2[_i];
                var p = path.join(this.dir, f);
                var st = fs.statSync(p);
                var lines = Math.max(0, fs.readFileSync(p, "utf8").split("\n").filter(Boolean).length);
                shards.push({ file: f, bytes: st.size, lines: lines });
                totalBytes += st.size;
                totalLines += lines;
            }
        }
        catch (_a) { recordVoidReceiptsEmptyCatchVisibilityV1('VOID_RECEIPTS_EMPTY_CATCH_VISIBILITY_V1_SITE_STATS_SCAN', _a); }
        return { shards: shards, totalBytes: totalBytes, totalLines: totalLines };
    };
    /** Garbage collect older shards; keep the most recent N. */
    ReceiptsStore.prototype.gc = function (keepLast) {
        if (keepLast === void 0) { keepLast = 1; }
        var removed = 0;
        var kept = 0;
        try {
            var files = fs
                .readdirSync(this.dir)
                .filter(function (f) { return /^receipts-\d{8}\.jsonl$/.test(f); })
                .sort(function (a, b) { return b.localeCompare(a); });
            var toDelete = files.slice(Number(keepLast) || 1);
            for (var _i = 0, toDelete_1 = toDelete; _i < toDelete_1.length; _i++) {
                var f = toDelete_1[_i];
                fs.rmSync(path.join(this.dir, f), { force: true });
                removed++;
            }
            kept = files.length - removed;
        }
        catch (_a) { recordVoidReceiptsEmptyCatchVisibilityV1('VOID_RECEIPTS_EMPTY_CATCH_VISIBILITY_V1_SITE_GC_SCAN', _a); }
        // Note: we do not prune the in-memory map; that’s fine for long-running nodes.
        return { ok: true, keepLast: Math.max(1, Number(keepLast) || 1), removed: removed, kept: kept };
    };
    return ReceiptsStore;
}());
exports.ReceiptsStore = ReceiptsStore;
