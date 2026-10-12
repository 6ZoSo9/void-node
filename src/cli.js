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
// src/cli.ts
/* Minimal CLI for local ops. Designed to be resilient even if some HTTP routes
 * are not present. BASE defaults to http://localhost:4100
 *
 * Examples:
 *   tsx src/cli.ts health
 *   tsx src/cli.ts head
 *   BASE=http://127.0.0.1:4101 tsx src/cli.ts peers
 *   tsx src/cli.ts once --empty
 *   tsx src/cli.ts start-proposer 5000
 *   tsx src/cli.ts follow-start http://localhost:4100 1000
 */
var BASE = process.env.BASE || "http://localhost:4100";
function jget(path) {
    return __awaiter(this, void 0, void 0, function () {
        var r, t;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetch(new URL(path, BASE))];
                case 1:
                    r = _a.sent();
                    return [4 /*yield*/, r.text()];
                case 2:
                    t = _a.sent();
                    try {
                        return [2 /*return*/, JSON.parse(t)];
                    }
                    catch (_b) {
                        return [2 /*return*/, t];
                    }
                    return [2 /*return*/];
            }
        });
    });
}
function jpost(path, body) {
    return __awaiter(this, void 0, void 0, function () {
        var r, t;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetch(new URL(path, BASE), {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: body === undefined ? undefined : JSON.stringify(body),
                    })];
                case 1:
                    r = _a.sent();
                    return [4 /*yield*/, r.text()];
                case 2:
                    t = _a.sent();
                    try {
                        return [2 /*return*/, JSON.parse(t)];
                    }
                    catch (_b) {
                        return [2 /*return*/, t];
                    }
                    return [2 /*return*/];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, cmd, args, _b, out, out, try1, try2, try3, out, allowEmpty_1, out, ms, out, peer, intervalMs, out, out, out, keepLast, out, out, keepLast, out, head, peers, txt;
        var _this = this;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _a = process.argv, cmd = _a[2], args = _a.slice(3);
                    _b = cmd;
                    switch (_b) {
                        case "health": return [3 /*break*/, 1];
                        case "head": return [3 /*break*/, 3];
                        case "peers": return [3 /*break*/, 5];
                        case "mempool": return [3 /*break*/, 10];
                        case "once": return [3 /*break*/, 12];
                        case "start-proposer": return [3 /*break*/, 14];
                        case "follow-start": return [3 /*break*/, 16];
                        case "index-rebuild": return [3 /*break*/, 18];
                        case "index-build": return [3 /*break*/, 20];
                        case "index-gc": return [3 /*break*/, 22];
                        case "receipts-stats": return [3 /*break*/, 24];
                        case "receipts-gc": return [3 /*break*/, 26];
                        case "sync-status": return [3 /*break*/, 28];
                        case "metrics": return [3 /*break*/, 31];
                    }
                    return [3 /*break*/, 34];
                case 1: return [4 /*yield*/, jget("/health").catch(function () { return jget("/api/health"); })];
                case 2:
                    out = _c.sent();
                    console.log(JSON.stringify(out, null, 2));
                    return [2 /*return*/];
                case 3: return [4 /*yield*/, jget("/head").catch(function () { return jget("/api/head"); })];
                case 4:
                    out = _c.sent();
                    console.log(JSON.stringify(out, null, 2));
                    return [2 /*return*/];
                case 5: return [4 /*yield*/, jget("/peers").catch(function () { return null; })];
                case 6:
                    try1 = _c.sent();
                    if (try1)
                        return [2 /*return*/, void console.log(JSON.stringify(try1, null, 2))];
                    return [4 /*yield*/, jget("/peers/registry/ids").catch(function () { return null; })];
                case 7:
                    try2 = _c.sent();
                    if (try2)
                        return [2 /*return*/, void console.log(JSON.stringify(try2, null, 2))];
                    return [4 /*yield*/, fetch(new URL("/metrics", BASE))];
                case 8: return [4 /*yield*/, (_c.sent()).text().catch(function () { return ""; })];
                case 9:
                    try3 = _c.sent();
                    console.log(try3 || JSON.stringify({ ok: false, error: "no peers endpoints available" }, null, 2));
                    return [2 /*return*/];
                case 10: return [4 /*yield*/, jget("/mempool").catch(function () { return jget("/mempool/count"); })];
                case 11:
                    out = _c.sent();
                    console.log(JSON.stringify(out, null, 2));
                    return [2 /*return*/];
                case 12:
                    allowEmpty_1 = args.includes("--empty");
                    return [4 /*yield*/, jpost("/blocks/once?allowEmpty=".concat(allowEmpty_1 ? 1 : 0)).catch(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, jpost("/dev/propose", { body: { cli: true, allowEmpty: allowEmpty_1 } })];
                        }); }); })];
                case 13:
                    out = _c.sent();
                    console.log(JSON.stringify(out, null, 2));
                    return [2 /*return*/];
                case 14:
                    ms = Number(args[0] || "5000");
                    return [4 /*yield*/, jpost("/proposer/start?intervalMs=".concat(ms)).catch(function () { return ({ ok: false, error: "endpoint missing" }); })];
                case 15:
                    out = _c.sent();
                    console.log(JSON.stringify(out, null, 2));
                    return [2 /*return*/];
                case 16:
                    peer = String(args[0] || "");
                    intervalMs = Number(args[1] || "1000");
                    return [4 /*yield*/, jpost("/follower/start?peer=".concat(encodeURIComponent(peer), "&intervalMs=").concat(intervalMs)).catch(function () { return ({ ok: false, error: "endpoint missing" }); })];
                case 17:
                    out = _c.sent();
                    console.log(JSON.stringify(out, null, 2));
                    return [2 /*return*/];
                case 18: return [4 /*yield*/, jpost("/index/rebuild").catch(function () { return ({ ok: false, error: "endpoint missing" }); })];
                case 19:
                    out = _c.sent();
                    console.log(JSON.stringify(out, null, 2));
                    return [2 /*return*/];
                case 20: return [4 /*yield*/, jpost("/index/build").catch(function () { return ({ ok: false, error: "endpoint missing" }); })];
                case 21:
                    out = _c.sent();
                    console.log(JSON.stringify(out, null, 2));
                    return [2 /*return*/];
                case 22:
                    keepLast = Number(args[0] || "1");
                    return [4 /*yield*/, jpost("/index/gc?keepLast=".concat(keepLast)).catch(function () { return ({ ok: false, error: "endpoint missing" }); })];
                case 23:
                    out = _c.sent();
                    console.log(JSON.stringify(out, null, 2));
                    return [2 /*return*/];
                case 24: return [4 /*yield*/, jget("/receipts/stats").catch(function () { return ({ ok: false, error: "endpoint missing" }); })];
                case 25:
                    out = _c.sent();
                    console.log(JSON.stringify(out, null, 2));
                    return [2 /*return*/];
                case 26:
                    keepLast = Number(args[0] || "1");
                    return [4 /*yield*/, jpost("/receipts/gc?keepLast=".concat(keepLast)).catch(function () { return ({ ok: false, error: "endpoint missing" }); })];
                case 27:
                    out = _c.sent();
                    console.log(JSON.stringify(out, null, 2));
                    return [2 /*return*/];
                case 28: return [4 /*yield*/, jget("/head").catch(function () { return ({ ok: false }); })];
                case 29:
                    head = _c.sent();
                    return [4 /*yield*/, jget("/peers").catch(function () { return null; })];
                case 30:
                    peers = _c.sent();
                    console.log(JSON.stringify({ head: head, peers: peers }, null, 2));
                    return [2 /*return*/];
                case 31: return [4 /*yield*/, fetch(new URL("/metrics", BASE))];
                case 32: return [4 /*yield*/, (_c.sent()).text().catch(function () { return ""; })];
                case 33:
                    txt = _c.sent();
                    process.stdout.write(txt || "# no metrics\n");
                    return [2 /*return*/];
                case 34:
                    {
                        console.error("Usage: cli <health|head|peers|mempool|once|start-proposer <ms>|follow-start <peer> <ms>|index-rebuild|index-build|index-gc <keep>|receipts-stats|receipts-gc <keep>|sync-status|metrics>");
                        process.exit(2);
                    }
                    _c.label = 35;
                case 35: return [2 /*return*/];
            }
        });
    });
}
main().catch(function (e) {
    console.error(e);
    process.exit(1);
});
