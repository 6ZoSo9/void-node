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
Object.defineProperty(exports, "__esModule", { value: true });
var seg_store_1 = require("../src/chain/seg_store");
var SRC = process.env.SRC || "http://127.0.0.1:4300";
var DATA_DIR = process.env.DATA_DIR || "data_b";
var CHUNK = Number(process.env.CHUNK || 200);
var RETRIES = Number(process.env.RETRIES || 5);
var BACKOFF = Number(process.env.BACKOFF || 300); // ms
function getJSON(url_1) {
    return __awaiter(this, arguments, void 0, function (url, tries) {
        var _loop_1, i, state_1;
        if (tries === void 0) { tries = RETRIES; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _loop_1 = function (i) {
                        var res, e_1;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _b.trys.push([0, 2, , 4]);
                                    return [4 /*yield*/, fetch(url)];
                                case 1:
                                    res = _b.sent();
                                    if (res.ok)
                                        return [2 /*return*/, { value: res.json() }];
                                    throw new Error("".concat(res.status, " ").concat(res.statusText));
                                case 2:
                                    e_1 = _b.sent();
                                    if (i === tries - 1)
                                        throw e_1;
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, BACKOFF * (i + 1)); })];
                                case 3:
                                    _b.sent();
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    };
                    i = 0;
                    _a.label = 1;
                case 1:
                    if (!(i < tries)) return [3 /*break*/, 4];
                    return [5 /*yield**/, _loop_1(i)];
                case 2:
                    state_1 = _a.sent();
                    if (typeof state_1 === "object")
                        return [2 /*return*/, state_1.value];
                    _a.label = 3;
                case 3:
                    i++;
                    return [3 /*break*/, 1];
                case 4: throw new Error("unreachable");
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var store, health, myHead, theirHead, start, from, to, blocks, _i, blocks_1, b;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    store = new seg_store_1.SegStore(DATA_DIR, { segmentMaxBytes: 8 * 1024 * 1024, sparseEvery: 16 });
                    return [4 /*yield*/, getJSON("".concat(SRC, "/api/health"))];
                case 1:
                    health = _a.sent();
                    if (!health.ok) {
                        console.log("[follower_once] source not ok");
                        return [2 /*return*/];
                    }
                    myHead = store.loadHeadNumber();
                    theirHead = health.head;
                    start = myHead + 1;
                    if (theirHead < start) {
                        console.log("[follower_once] up to date (mine=".concat(myHead, ", theirs=").concat(theirHead, ")"));
                        return [2 /*return*/];
                    }
                    console.log("[follower_once] syncing ".concat(start, "..").concat(theirHead, " from ").concat(SRC, " -> ").concat(DATA_DIR, " (chunk=").concat(CHUNK, ")"));
                    from = start;
                    _a.label = 2;
                case 2:
                    if (!(from <= theirHead)) return [3 /*break*/, 5];
                    to = Math.min(from + CHUNK - 1, theirHead);
                    return [4 /*yield*/, getJSON("".concat(SRC, "/blocks/range?from=").concat(from, "&to=").concat(to))];
                case 3:
                    blocks = _a.sent();
                    for (_i = 0, blocks_1 = blocks; _i < blocks_1.length; _i++) {
                        b = blocks_1[_i];
                        store.saveBlock(b);
                    }
                    process.stdout.write(" imported ".concat(from, "..").concat(to, "\r"));
                    _a.label = 4;
                case 4:
                    from += CHUNK;
                    return [3 /*break*/, 2];
                case 5:
                    console.log("\n[follower_once] done. head=".concat(store.loadHeadNumber()));
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (e) { console.error("[follower_once] error:", e); });
