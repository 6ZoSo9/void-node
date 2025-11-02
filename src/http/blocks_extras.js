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
exports.registerBlockExtras = registerBlockExtras;
/**
 * Convenience helpers that proxy to existing HTTP endpoints.
 * No changes to block schema or SegStore wiring. Pure add-on.
 */
function registerBlockExtras(app) {
    var _this = this;
    // GET /blocks/latest — fetch last block by querying range and taking the tail.
    // NOTE: Uses local HTTP to avoid touching internal store APIs.
    app.get("/blocks/latest", function (_req, res) { return __awaiter(_this, void 0, void 0, function () {
        var port, r, arr, last, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    port = Number(process.env.HTTP_PORT || "4100");
                    return [4 /*yield*/, fetch("http://127.0.0.1:".concat(port, "/blocks/range?from=0&to=999999"))];
                case 1:
                    r = _a.sent();
                    if (!r.ok)
                        return [2 /*return*/, res.status(502).json({ ok: false, error: "range fetch ".concat(r.status) })];
                    return [4 /*yield*/, r.json()];
                case 2:
                    arr = _a.sent();
                    if (!Array.isArray(arr) || arr.length === 0) {
                        return [2 /*return*/, res.status(404).json({ ok: false, error: "no blocks yet" })];
                    }
                    last = arr[arr.length - 1];
                    return [2 /*return*/, res.json({ ok: true, latest: last, number: last === null || last === void 0 ? void 0 : last.number, hash: last === null || last === void 0 ? void 0 : last.hash })];
                case 3:
                    err_1 = _a.sent();
                    return [2 /*return*/, res.status(500).json({ ok: false, error: String((err_1 === null || err_1 === void 0 ? void 0 : err_1.message) || err_1) })];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    // GET /blocks/head — return just the latest number (fast for scripts)
    app.get("/blocks/head", function (_req, res) { return __awaiter(_this, void 0, void 0, function () {
        var port, r, arr, n, _a;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 3, , 4]);
                    port = Number(process.env.HTTP_PORT || "4100");
                    return [4 /*yield*/, fetch("http://127.0.0.1:".concat(port, "/blocks/range?from=0&to=999999"))];
                case 1:
                    r = _d.sent();
                    if (!r.ok)
                        return [2 /*return*/, res.type("text/plain").send("-1\n")];
                    return [4 /*yield*/, r.json()];
                case 2:
                    arr = _d.sent();
                    n = Array.isArray(arr) && arr.length ? ((_c = (_b = arr[arr.length - 1]) === null || _b === void 0 ? void 0 : _b.number) !== null && _c !== void 0 ? _c : -1) : -1;
                    return [2 /*return*/, res.type("text/plain").send(String(n) + "\n")];
                case 3:
                    _a = _d.sent();
                    return [2 /*return*/, res.type("text/plain").send("-1\n")];
                case 4: return [2 /*return*/];
            }
        });
    }); });
}
