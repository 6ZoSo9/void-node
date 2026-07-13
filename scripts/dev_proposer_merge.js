"use strict";
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
/* dev_proposer_merge.ts — v2.6
 * Priority: __void/dev/pick (confirmed POST) -> /tx/dev/pick (GET,POST)
 * Logs statuses; merges picked txs into block.payload.txs and block.txs
 */
var node_http_1 = require("node:http");
var HTTP_HOST = process.env.HTTP_HOST || "127.0.0.1";
var HTTP_PORT = +(process.env.HTTP_PORT || "4100");
var CAP = Number.isFinite(+process.env.VOID_TX_MERGE_CAP) ? +process.env.VOID_TX_MERGE_CAP : 3;
function httpDo(method, path, body) {
    return new Promise(function (resolve) {
        var opts = { host: HTTP_HOST, port: HTTP_PORT, path: path, method: method, headers: {} };
        var payload = "";
        if (method === "POST") {
            opts.headers["Content-Type"] = "application/json";
            payload = body ? JSON.stringify(body) : "";
        }
        var req = node_http_1.default.request(opts, function (res) {
            var buf = "";
            res.setEncoding("utf8");
            res.on("data", function (c) { return buf += c; });
            res.on("end", function () { var json; try {
                json = JSON.parse(buf || "{}");
            }
            catch (_a) {
                if (!globalThis.__void_scripts_dev_proposer_merge_json_seen) {
                    globalThis.__void_scripts_dev_proposer_merge_json_seen = true;
                    console.warn("[dev_proposer_merge] VOID_SCRIPTS_DEV_PROPOSER_MERGE_JSON_VISIBLE", _a && _a.message ? _a.message : _a);
                }
            } ; resolve({ status: res.statusCode || 0, body: buf, json: json }); });
        });
        req.on("error", function () { return resolve({ status: -1, body: "" }); });
        if (method === "POST")
            req.end(payload);
        else
            req.end();
    });
}
var lastProbe = 0;
function tryPickOnce(max) {
    return __awaiter(this, void 0, void 0, function () {
        var probes, picked, from, statuses, _i, probes_1, p, g, q, now;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    probes = [
                        { name: "void-pick", path: "/__void/dev/pick?max=".concat(max, "&confirm=voidDevPick") },
                        { name: "dev-pick", path: "/tx/dev/pick?max=".concat(max) },
                    ];
                    picked = [];
                    from = "none";
                    statuses = {};
                    _i = 0, probes_1 = probes;
                    _c.label = 1;
                case 1:
                    if (!(_i < probes_1.length)) return [3 /*break*/, 5];
                    p = probes_1[_i];
                    return [4 /*yield*/, httpDo("GET", p.path)];
                case 2:
                    g = _c.sent();
                    statuses[p.name + "_GET"] = g.status;
                    if (Array.isArray((_a = g.json) === null || _a === void 0 ? void 0 : _a.picked) && g.json.picked.length) {
                        picked = g.json.picked;
                        from = p.name + "[GET]";
                        return [3 /*break*/, 5];
                    }
                    return [4 /*yield*/, httpDo("POST", p.path, { max: max })];
                case 3:
                    q = _c.sent();
                    statuses[p.name + "_POST"] = q.status;
                    if (Array.isArray((_b = q.json) === null || _b === void 0 ? void 0 : _b.picked) && q.json.picked.length) {
                        picked = q.json.picked;
                        from = p.name + "[POST]";
                        return [3 /*break*/, 5];
                    }
                    _c.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 1];
                case 5:
                    now = Date.now();
                    if (now - lastProbe > 60000) {
                        lastProbe = now;
                        console.log("[txmerge:v2.6:probe]", statuses);
                    }
                    return [2 /*return*/, { from: from, picked: picked, statuses: statuses }];
            }
        });
    });
}
function ensure(block) { block = block || {}; block.payload = block.payload || {}; block.payload.txs = block.payload.txs || []; block.txs = block.txs || []; return block; }
function merge(block) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, from, picked, statuses, _i, picked_1, tx, n;
        var _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, tryPickOnce(CAP)];
                case 1:
                    _a = _e.sent(), from = _a.from, picked = _a.picked, statuses = _a.statuses;
                    block = ensure(block);
                    for (_i = 0, picked_1 = picked; _i < picked_1.length; _i++) {
                        tx = picked_1[_i];
                        block.payload.txs.push(tx);
                        block.txs.push(tx);
                    }
                    n = (_d = (block && ((_c = (_b = block.number) !== null && _b !== void 0 ? _b : block.num) !== null && _c !== void 0 ? _c : block.n))) !== null && _d !== void 0 ? _d : -1;
                    console.log("[txmerge:v2.6]", "block=".concat(n, " picked=").concat(picked.length, " from=").concat(from), picked.length ? "" : JSON.stringify(statuses));
                    return [2 /*return*/, block];
            }
        });
    });
}
function hook(proto, key) {
    return __awaiter(this, void 0, void 0, function () {
        var tag, orig;
        return __generator(this, function (_a) {
            if (!proto || typeof proto[key] !== "function")
                return [2 /*return*/, false];
            tag = "__void_txmerge_v26_" + key;
            if (proto[tag])
                return [2 /*return*/, true];
            orig = proto[key];
            proto[key] = function wrapped(block) {
                var rest = [];
                for (var _i = 1; _i < arguments.length; _i++) {
                    rest[_i - 1] = arguments[_i];
                }
                return __awaiter(this, void 0, void 0, function () { return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, merge(block)];
                        case 1:
                            block = _a.sent();
                            return [4 /*yield*/, orig.apply(this, __spreadArray([block], rest, true))];
                        case 2: return [2 /*return*/, _a.sent()];
                    }
                }); });
            };
            proto[tag] = true;
            console.log("[txmerge:v2.6] patch applied on method", key);
            return [2 /*return*/, true];
        });
    });
}
function install() {
    return __awaiter(this, void 0, void 0, function () {
        var ok, _i, _a, _b, spec, method, mod, Seg, _c, _d, getApp, attachDiag;
        var _this = this;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    ok = false;
                    _i = 0, _a = [
                        ["../src/chain/seg_store.ts", "saveBlock"], ["../src/chain/seg_store.ts", "appendBlock"],
                        ["../src/chain/seg_store.js", "saveBlock"], ["../src/chain/seg_store.js", "appendBlock"],
                    ];
                    _e.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 8];
                    _b = _a[_i], spec = _b[0], method = _b[1];
                    _e.label = 2;
                case 2:
                    _e.trys.push([2, 6, , 7]);
                    return [4 /*yield*/, Promise.resolve("".concat(spec)).then(function (s) { return require(s); })];
                case 3:
                    mod = _e.sent();
                    Seg = mod === null || mod === void 0 ? void 0 : mod.SegStore;
                    _c = Seg;
                    if (!_c) return [3 /*break*/, 5];
                    return [4 /*yield*/, hook(Seg.prototype, method)];
                case 4:
                    _c = (_e.sent());
                    _e.label = 5;
                case 5:
                    if (_c)
                        ok = true;
                    return [3 /*break*/, 7];
                case 6:
                    _d = _e.sent();
                    return [3 /*break*/, 7];
                case 7:
                    _i++;
                    return [3 /*break*/, 1];
                case 8:
                    if (!ok)
                        console.warn("[txmerge:v2.6] WARNING: no save path hooked");
                    getApp = function () { return globalThis.__void_http_app || globalThis.app; };
                    attachDiag = function () {
                        var _a, _b;
                        var app = getApp();
                        if (!app || typeof app.get !== "function")
                            return void ((_b = (_a = setTimeout(attachDiag, 500)).unref) === null || _b === void 0 ? void 0 : _b.call(_a));
                        app.get("/__void/dev/txmerge/v26/diag", function (_req, res) { return __awaiter(_this, void 0, void 0, function () {
                            var m, p, e_1;
                            var _a, _b;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        _c.trys.push([0, 3, , 4]);
                                        return [4 /*yield*/, httpDo("GET", "/__void/dev/picker/diag")];
                                    case 1:
                                        m = _c.sent();
                                        return [4 /*yield*/, tryPickOnce(0)];
                                    case 2:
                                        p = _c.sent();
                                        res.json({ ok: true, cap: CAP, mempool_len: (_b = (_a = m.json) === null || _a === void 0 ? void 0 : _a.len) !== null && _b !== void 0 ? _b : null, probe: p.statuses });
                                        return [3 /*break*/, 4];
                                    case 3:
                                        e_1 = _c.sent();
                                        res.status(500).json({ ok: false, error: String((e_1 === null || e_1 === void 0 ? void 0 : e_1.message) || e_1) });
                                        return [3 /*break*/, 4];
                                    case 4: return [2 /*return*/];
                                }
                            });
                        }); });
                        console.log("[txmerge:v2.6] diag at /__void/dev/txmerge/v26/diag");
                    };
                    attachDiag();
                    return [2 /*return*/];
            }
        });
    });
}
await install();
await Promise.resolve().then(function () { return require("./dev_proposer.ts"); });
