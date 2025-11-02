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
exports.registerIndexExtras = registerIndexExtras;
var fs = require("node:fs");
var path = require("node:path");
var kidx_js_1 = require("../../util/kidx.js");
function registerIndexExtras(app, node, metrics) {
    var _this = this;
    // Rebuild all .kidx files under the index directory base
    app.post("/index/kidx/rebuild-all", function (_req, res) { return __awaiter(_this, void 0, void 0, function () {
        var shards, baseDir, r, e_1;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 2, , 3]);
                    shards = (_c = (_b = (_a = node.txIndex) === null || _a === void 0 ? void 0 : _a.listShards) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : [];
                    baseDir = (process.env.DATA_DIR || "data");
                    if (shards.length)
                        baseDir = path.dirname(path.dirname(shards[0].path)); // <base>/index
                    return [4 /*yield*/, (0, kidx_js_1.buildAllKidx)(baseDir)];
                case 1:
                    r = _d.sent();
                    res.json(r);
                    return [3 /*break*/, 3];
                case 2:
                    e_1 = _d.sent();
                    res.status(500).json({ ok: false, error: String((e_1 === null || e_1 === void 0 ? void 0 : e_1.message) || e_1) });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // Lookup via .kidx first, fallback to JSONL scan; rebuild stale/missing on hit.
    app.get("/index/kidx/lookup", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var hash, shards, _i, shards_1, s, kidxPath, hit, blk, tx, _a, r, blk, tx, _b, e_2;
        var _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
        return __generator(this, function (_r) {
            switch (_r.label) {
                case 0:
                    hash = String(req.query.hash || "").toLowerCase();
                    if (!/^[0-9a-f]{64}$/.test(hash))
                        return [2 /*return*/, res.json({ ok: false, error: "bad hash" })];
                    _r.label = 1;
                case 1:
                    _r.trys.push([1, 14, , 15]);
                    shards = (_e = (_d = (_c = node.txIndex) === null || _c === void 0 ? void 0 : _c.listShards) === null || _d === void 0 ? void 0 : _d.call(_c).sort(function (a, b) { return b.from - a.from; })) !== null && _e !== void 0 ? _e : [];
                    _i = 0, shards_1 = shards;
                    _r.label = 2;
                case 2:
                    if (!(_i < shards_1.length)) return [3 /*break*/, 13];
                    s = shards_1[_i];
                    kidxPath = s.path.replace(/\.jsonl$/, ".kidx");
                    if (!fs.existsSync(kidxPath)) return [3 /*break*/, 7];
                    hit = (0, kidx_js_1.queryKidx)(kidxPath, hash);
                    if (hit.found) {
                        blk = (_g = (_f = node.store) === null || _f === void 0 ? void 0 : _f.loadBlock) === null || _g === void 0 ? void 0 : _g.call(_f, hit.n);
                        tx = (_h = blk === null || blk === void 0 ? void 0 : blk.txs) === null || _h === void 0 ? void 0 : _h[hit.o];
                        return [2 /*return*/, res.json({ ok: true, found: true, block: hit.n, offset: hit.o, tx: tx })];
                    }
                    _r.label = 3;
                case 3:
                    _r.trys.push([3, 5, , 6]);
                    (_j = metrics === null || metrics === void 0 ? void 0 : metrics.inc) === null || _j === void 0 ? void 0 : _j.call(metrics, "kidx_stale_rebuilds", 1);
                    return [4 /*yield*/, (0, kidx_js_1.buildKidxForJsonl)(s.path)];
                case 4:
                    _r.sent();
                    return [3 /*break*/, 6];
                case 5:
                    _a = _r.sent();
                    return [3 /*break*/, 6];
                case 6: return [3 /*break*/, 12];
                case 7:
                    r = (_l = (_k = node.txIndex) === null || _k === void 0 ? void 0 : _k.lookupInShard) === null || _l === void 0 ? void 0 : _l.call(_k, s.path, hash);
                    if (!(r === null || r === void 0 ? void 0 : r.found)) return [3 /*break*/, 12];
                    blk = (_o = (_m = node.store) === null || _m === void 0 ? void 0 : _m.loadBlock) === null || _o === void 0 ? void 0 : _o.call(_m, r.n);
                    tx = (_p = blk === null || blk === void 0 ? void 0 : blk.txs) === null || _p === void 0 ? void 0 : _p[r.o];
                    _r.label = 8;
                case 8:
                    _r.trys.push([8, 10, , 11]);
                    (_q = metrics === null || metrics === void 0 ? void 0 : metrics.inc) === null || _q === void 0 ? void 0 : _q.call(metrics, "kidx_missing_rebuilds", 1);
                    return [4 /*yield*/, (0, kidx_js_1.buildKidxForJsonl)(s.path)];
                case 9:
                    _r.sent();
                    return [3 /*break*/, 11];
                case 10:
                    _b = _r.sent();
                    return [3 /*break*/, 11];
                case 11: return [2 /*return*/, res.json({ ok: true, found: true, block: r.n, offset: r.o, tx: tx })];
                case 12:
                    _i++;
                    return [3 /*break*/, 2];
                case 13: return [2 /*return*/, res.json({ ok: true, found: false })];
                case 14:
                    e_2 = _r.sent();
                    res.status(500).json({ ok: false, error: String((e_2 === null || e_2 === void 0 ? void 0 : e_2.message) || e_2) });
                    return [3 /*break*/, 15];
                case 15: return [2 /*return*/];
            }
        });
    }); });
}
