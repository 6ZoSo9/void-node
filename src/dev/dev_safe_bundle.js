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
/**
 * Dev Safe Bundle — idempotent, additive observer:
 * - Patches SegStore.append to snapshot sealed tx hashes (non-invasive)
 * - Adds routes: /dev/diag/routes, /dev/hook/status, /dev/last-seal,
 *                /dev/sealed/window, /dev/blocks/:n/txs/raw
 * - Adds JSON-only 404/500 tail so curl|jq never sees HTML
 */
var seg_store_js_1 = require("../chain/seg_store.js");
(function devSafeBundle() {
    var g = globalThis;
    if (g.__void_dev_safe_bundle_installed)
        return;
    g.__void_dev_safe_bundle_installed = true;
    console.log("[diag] devSafeBundle: init");
    function getApp() { return g.__void_http_app || g.app || undefined; }
    // 1) Patch SegStore.append to snapshot sealed tx hashes
    function tryPatchAppend() {
        try {
            var S = seg_store_js_1.SegStore;
            if (!S || !S.prototype || typeof S.prototype.append !== "function")
                return false;
            if (S.__void_append_patched_dev_safe_bundle)
                return true;
            var orig_1 = S.prototype.append;
            S.prototype.append = function () {
                var _a, _b, _c;
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                try {
                    var blk = (_a = args.find(function (x) { return x && typeof x === "object" && typeof x.number === "number"; })) !== null && _a !== void 0 ? _a : args[0];
                    var number = (_b = (blk && blk.number)) !== null && _b !== void 0 ? _b : args[0];
                    var txs = Array.isArray(blk === null || blk === void 0 ? void 0 : blk.txs) ? blk.txs : ((_c = args.find(function (x) { return Array.isArray(x); })) !== null && _c !== void 0 ? _c : []);
                    var hashes = (Array.isArray(txs) ? txs : [])
                        .map(function (t) { var _a; return (typeof t === "string") ? t : ((_a = t === null || t === void 0 ? void 0 : t.hash) !== null && _a !== void 0 ? _a : null); })
                        .filter(Boolean);
                    g.__void_last_seal = { number: number, count: hashes.length, hashes: hashes, at: Date.now() };
                }
                catch (_d) { if(!g.__void_dev_safe_bundle_append_observe_error_seen){g.__void_dev_safe_bundle_append_observe_error_seen=true;console.warn("VOID_DEV_SAFE_BUNDLE_APPEND_OBSERVE_VISIBLE",_d&&_d.message?_d.message:_d);} }
                return orig_1.apply(this, args);
            };
            S.__void_append_patched_dev_safe_bundle = true;
            console.log("[diag] SegStore.append patched (dev-safe-bundle)");
            return true;
        }
        catch (_a) {
            return false;
        }
    }
    // 2) JSON-only error tail
    function attachJsonTail(app) {
        if (!app || app.__void_json_tail_attached)
            return;
        app.__void_json_tail_attached = true;
        app.use(function (req, res, next) {
            if (res.headersSent)
                return next();
            res.status(404).json({ ok: false, error: "not_found", path: req.url });
        });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        app.use(function (err, _req, res, _next) {
            try {
                var msg = (err && (err.message || String(err))) || "internal_error";
                res.status(500).json({ ok: false, error: msg });
            }
            catch (_a) {
                res.status(500).json({ ok: false, error: "internal_error" });
            }
        });
        console.log("[diag] devSafeBundle JSON error tail attached");
    }
    // 3) Dev routes
    function attachRoutes(app) {
        var _this = this;
        if (!app || app.__void_dev_safe_routes_attached)
            return;
        app.__void_dev_safe_routes_attached = true;
        app.get("/dev/diag/routes", function (_req, res) {
            var _a;
            try {
                var stack = (((_a = app._router) === null || _a === void 0 ? void 0 : _a.stack) || [])
                    .map(function (l) { var _a; return ((_a = l === null || l === void 0 ? void 0 : l.route) === null || _a === void 0 ? void 0 : _a.path) ? { path: l.route.path, methods: Object.keys(l.route.methods || {}) } : null; })
                    .filter(Boolean);
                res.json({ ok: true, routes: stack });
            }
            catch (e) {
                res.status(500).json({ ok: false, error: String((e === null || e === void 0 ? void 0 : e.message) || e) });
            }
        });
        app.get("/dev/hook/status", function (_req, res) {
            var S = seg_store_js_1.SegStore;
            res.json({
                ok: true,
                segstore_visible: !!S,
                segstore_has_prototype: !!(S && S.prototype),
                segstore_has_append: !!(S && S.prototype && typeof S.prototype.append === "function"),
                patched: !!(S && S.__void_append_patched_dev_safe_bundle),
                last: g.__void_last_seal || null
            });
        });
        app.get("/dev/last-seal", function (_req, res) {
            res.json({ ok: true, last: g.__void_last_seal || null });
        });
        app.get("/dev/sealed/window", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var port, latest, qf, qt, from, to, blocks, view, e_1;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 3, , 4]);
                        port = +(process.env.HTTP_PORT || 4100);
                        return [4 /*yield*/, fetch("http://127.0.0.1:".concat(port, "/blocks/latest/full")).then(function (r) { return r.json(); }).then(function (j) { var _a; return (_a = j === null || j === void 0 ? void 0 : j.number) !== null && _a !== void 0 ? _a : -1; })];
                    case 1:
                        latest = _c.sent();
                        if (latest < 0)
                            return [2 /*return*/, res.status(404).json({ ok: false, error: "latest unavailable" })];
                        qf = (_a = req.query) === null || _a === void 0 ? void 0 : _a.from, qt = (_b = req.query) === null || _b === void 0 ? void 0 : _b.to;
                        from = Math.max(0, qf ? +qf : latest - 40);
                        to = Math.max(from, qt ? +qt : latest);
                        return [4 /*yield*/, fetch("http://127.0.0.1:".concat(port, "/blocks/range?from=").concat(from, "&to=").concat(to)).then(function (r) { return r.json(); })];
                    case 2:
                        blocks = _c.sent();
                        view = (Array.isArray(blocks) ? blocks : []).map(function (b) {
                            var txs = Array.isArray(b === null || b === void 0 ? void 0 : b.txs) ? b.txs : [];
                            var hashes = txs.map(function (t) { var _a; return (typeof t === "string") ? t : ((_a = t === null || t === void 0 ? void 0 : t.hash) !== null && _a !== void 0 ? _a : null); }).filter(Boolean);
                            return { number: b === null || b === void 0 ? void 0 : b.number, count: hashes.length, hashes: hashes };
                        });
                        res.json({ ok: true, from: from, to: to, blocks: view });
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _c.sent();
                        res.status(500).json({ ok: false, error: String((e_1 === null || e_1 === void 0 ? void 0 : e_1.message) || e_1) });
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); });
        app.get("/dev/blocks/:n/txs/raw", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var n, port, arr, b, txs, e_2;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        n = +req.params.n;
                        port = +(process.env.HTTP_PORT || 4100);
                        return [4 /*yield*/, fetch("http://127.0.0.1:".concat(port, "/blocks/range?from=").concat(n, "&to=").concat(n)).then(function (r) { return r.json(); })];
                    case 1:
                        arr = _b.sent();
                        b = Array.isArray(arr) ? arr[0] : null;
                        if (!b)
                            return [2 /*return*/, res.status(404).json({ ok: false, error: "block_not_found", number: n })];
                        txs = Array.isArray(b === null || b === void 0 ? void 0 : b.txs) ? b.txs : [];
                        res.json({ ok: true, number: (_a = b === null || b === void 0 ? void 0 : b.number) !== null && _a !== void 0 ? _a : n, tx_count: txs.length, types: txs.map(function (t) { return typeof t; }), sample: txs.slice(0, 5) });
                        return [3 /*break*/, 3];
                    case 2:
                        e_2 = _b.sent();
                        res.status(500).json({ ok: false, error: String((e_2 === null || e_2 === void 0 ? void 0 : e_2.message) || e_2) });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); });
        console.log("[diag] devSafeBundle routes attached");
    }
    // 4) Retry loops (bounded)
    var triesPatch = 0;
    (function loopPatch() {
        if (tryPatchAppend())
            return;
        if (++triesPatch < 120)
            setTimeout(loopPatch, 500);
        else
            console.warn("[diag] devSafeBundle: append patch did not land");
    })();
    var triesRoutes = 0;
    (function loopRoutes() {
        var app = getApp();
        if (app && typeof app.get === "function") {
            attachRoutes(app);
            attachJsonTail(app);
            return;
        }
        if (++triesRoutes < 120)
            setTimeout(loopRoutes, 500);
        else
            console.warn("[diag] devSafeBundle: no app handle after retries");
    })();
})();
