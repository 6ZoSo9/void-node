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
exports.queryKidx = queryKidx;
exports.buildKidxForJsonl = buildKidxForJsonl;
exports.buildAllKidx = buildAllKidx;
// src/util/kidx.ts
/**
 * KIDX helpers: accelerate shard JSONL lookups by tx hash.
 * Dev-friendly format: write a compact JSON map alongside each shard:
 *   <shard>.jsonl  ->  <shard>.kidx  ({"hash":{"n":<block>,"o":<offset>}, ...})
 *
 * This is simple and perfectly fine for local development. We can evolve to a
 * binary format later without changing the public functions below.
 */
var fs = require("node:fs");
var path = require("node:path");
var files_js_1 = require("./files.js");
function queryKidx(kidxPath, hash) {
    var m = (0, files_js_1.readJsonIfExists)(kidxPath);
    if (!m)
        return { found: false };
    var e = m[hash];
    return e ? { found: true, n: e.n, o: e.o } : { found: false };
}
function buildKidxForJsonl(jsonlPath) {
    return __awaiter(this, void 0, void 0, function () {
        var dir, kidxPath, entries, map, data, lines, _i, lines_1, line, r, h, n, o;
        var _a, _b;
        return __generator(this, function (_c) {
            dir = path.dirname(jsonlPath);
            kidxPath = jsonlPath.replace(/\.jsonl$/, ".kidx");
            (0, files_js_1.ensureDir)(dir);
            entries = 0;
            map = Object.create(null);
            if (!fs.existsSync(jsonlPath)) {
                (0, files_js_1.writeJsonAtomic)(kidxPath, map);
                return [2 /*return*/, { ok: true, entries: entries, kidxPath: kidxPath }];
            }
            data = fs.readFileSync(jsonlPath, "utf8");
            lines = data.split(/\r?\n/);
            for (_i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
                line = lines_1[_i];
                if (!line)
                    continue;
                try {
                    r = JSON.parse(line);
                    h = String((r === null || r === void 0 ? void 0 : r.h) || (r === null || r === void 0 ? void 0 : r.hash) || "").toLowerCase();
                    n = Number(r === null || r === void 0 ? void 0 : r.n);
                    o = Number((_b = (_a = r === null || r === void 0 ? void 0 : r.o) !== null && _a !== void 0 ? _a : r === null || r === void 0 ? void 0 : r.offset) !== null && _b !== void 0 ? _b : 0);
                    if (/^[0-9a-f]{64}$/.test(h) && Number.isFinite(n) && Number.isFinite(o)) {
                        // last write wins
                        map[h] = { n: n, o: o };
                        entries++;
                    }
                }
                catch (_d) {
                    /* ignore bad lines */
                }
            }
            (0, files_js_1.writeJsonAtomic)(kidxPath, map);
            return [2 /*return*/, { ok: true, entries: entries, kidxPath: kidxPath }];
        });
    });
}
/** Build all .kidx files under an index base directory (<base>/index/*.jsonl). */
function buildAllKidx(baseDir) {
    return __awaiter(this, void 0, void 0, function () {
        var out, indexDir, files, scanned, built, _i, files_1, f, jsonl, r;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    out = [];
                    indexDir = path.join(baseDir, "index");
                    if (!fs.existsSync(indexDir))
                        return [2 /*return*/, { ok: true, scanned: 0, built: 0, updated: out }];
                    files = fs.readdirSync(indexDir).filter(function (f) { return f.endsWith(".jsonl"); });
                    scanned = 0, built = 0;
                    _i = 0, files_1 = files;
                    _a.label = 1;
                case 1:
                    if (!(_i < files_1.length)) return [3 /*break*/, 4];
                    f = files_1[_i];
                    scanned++;
                    jsonl = path.join(indexDir, f);
                    return [4 /*yield*/, buildKidxForJsonl(jsonl)];
                case 2:
                    r = _a.sent();
                    if (r.entries >= 0) {
                        built++;
                        out.push(r.kidxPath);
                    }
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, { ok: true, scanned: scanned, built: built, updated: out }];
            }
        });
    });
}
