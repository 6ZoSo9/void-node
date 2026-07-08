"use strict";

const VOID_HTTP_TX_ROUTES_EMPTY_CATCH_VISIBILITY_V1_MARKER = "VOID_HTTP_TX_ROUTES_EMPTY_CATCH_VISIBILITY_V1";

function recordVoidHttpTxRoutesEmptyCatchVisibilityV1(site, err) {
    try {
        const g = globalThis;
        const key = "__void_http_tx_routes_empty_catch_visibility_v1";
        const bucket = Array.isArray(g[key]) ? g[key] : [];
        bucket.push({
            marker: VOID_HTTP_TX_ROUTES_EMPTY_CATCH_VISIBILITY_V1_MARKER,
            site: String(site || "unknown"),
            message: err && err.message ? String(err.message) : String(err || ""),
        });
        while (bucket.length > 50) bucket.shift();
        g[key] = bucket;
    }
    catch (_visibilityRecordErr) {
        /* VOID_HTTP_TX_ROUTES_EMPTY_CATCH_VISIBILITY_V1_RECORD_FAILURE_SUPPRESSED */
    }
}
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTxRoutes = registerTxRoutes;
var node_core_js_1 = require("../node_core.js");
var mempool_js_1 = require("../mempool.js");
var tx_buffer_js_1 = require("../tx_buffer.js");
/**
 * NOTE:
 * - We rely on app-level express.json() already configured in index.ts.
 * - Mempool expects { data: string }. If caller sends an object, we stringify it.
 * - We mirror accepted txs into txBuffer (safe, additive).
 */
function registerTxRoutes(app) {
    // Alias preferred by tools: POST /tx/submit
    app.post("/tx/submit", function (req, res) {
        var _a, _b, _c;
        try {
            (0, node_core_js_1.globalEnqueueTx)((_a = req.body) !== null && _a !== void 0 ? _a : {});
            var q = globalThis.__void_tx_queue;
            console.log("[route] /tx/submit enq size=%s", Array.isArray(q) ? q.length : -1);
        }
        catch (_d) { recordVoidHttpTxRoutesEmptyCatchVisibilityV1('VOID_HTTP_TX_ROUTES_EMPTY_CATCH_VISIBILITY_V1_SITE_35', _d); }
        try {
            (0, node_core_js_1.globalEnqueueTx)((_b = req.body) !== null && _b !== void 0 ? _b : {});
        }
        catch (_e) { recordVoidHttpTxRoutesEmptyCatchVisibilityV1('VOID_HTTP_TX_ROUTES_EMPTY_CATCH_VISIBILITY_V1_SITE_39', _e); }
        var b = (_c = req.body) !== null && _c !== void 0 ? _c : {};
        var id = (typeof b.id === "string" && b.id.length)
            ? b.id
            : "tx-".concat(Date.now(), "-").concat(Math.random().toString(16).slice(2, 8));
        var data = (typeof b.data !== "undefined") ? b.data : b;
        if (typeof data !== "string")
            data = JSON.stringify(data);
        if (process.env.DEBUG_TX)
            console.log("[tx_routes] submit", { id: id, typeofData: typeof data, sample: (typeof data == "string" ? data.slice(0, 64) : "[obj]") });
        var result = mempool_js_1.mempool.submit({ id: id, data: data });
        if (!(result === null || result === void 0 ? void 0 : result.ok))
            return res.status(400).json(__assign(__assign({}, (result || {})), { ok: false }));
        // mirror into our lightweight buffer (string guaranteed)
        tx_buffer_js_1.txBuffer.push({ id: id, data: data });
        return res.json({ ok: true });
    });
    // Neutral path kept: POST /mempool/submit  (same behavior)
    app.post("/mempool/submit", function (req, res) {
        var _a, _b, _c, _d, _e;
        try {
            (0, node_core_js_1.globalEnqueueTx)((_a = req.body) !== null && _a !== void 0 ? _a : {});
        }
        catch (_f) { recordVoidHttpTxRoutesEmptyCatchVisibilityV1('VOID_HTTP_TX_ROUTES_EMPTY_CATCH_VISIBILITY_V1_SITE_62', _f); }
        var b = (_b = req.body) !== null && _b !== void 0 ? _b : {};
        var id = (typeof b.id === "string" && b.id.length)
            ? b.id
            : "tx-".concat(Date.now(), "-").concat(Math.random().toString(16).slice(2, 8));
        var data = (typeof b.data !== "undefined") ? b.data : b;
        if (typeof data !== "string")
            data = JSON.stringify(data);
        var result = mempool_js_1.mempool.submit({ id: id, data: data });
        if (!(result === null || result === void 0 ? void 0 : result.ok))
            return res.status(400).json(__assign(__assign({}, (result || {})), { ok: false }));
        tx_buffer_js_1.txBuffer.push({ id: id, data: data });
        return res.json({ ok: true, id: id, size: (_e = (_d = (_c = mempool_js_1.mempool).size) === null || _d === void 0 ? void 0 : _d.call(_c)) !== null && _e !== void 0 ? _e : 0 });
    });
    // Prometheus-ish overview for mempool (counters live on mempool instance)
    app.get("/metrics/mempool", function (_req, res) {
        var _a, _b, _c, _d, _e, _f;
        var size = (_c = (_b = (_a = mempool_js_1.mempool).size) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : 0;
        var submitted = (_d = mempool_js_1.mempool.submitted) !== null && _d !== void 0 ? _d : 0;
        var accepted = (_e = mempool_js_1.mempool.accepted) !== null && _e !== void 0 ? _e : 0;
        var rejected = (_f = mempool_js_1.mempool.rejected) !== null && _f !== void 0 ? _f : 0;
        res.type("text/plain").send([
            "void_mempool_size ".concat(size),
            "void_mempool_submitted_total ".concat(submitted),
            "void_mempool_accepted_total ".concat(accepted),
            "void_mempool_rejected_total ".concat(rejected),
        ].join("\n") + "\n");
    });
    // --- TX BUFFER UTILITIES (safe, additive) ---
    app.get("/mempool/buffer/size", function (_req, res) {
        res.json({ ok: true, size: tx_buffer_js_1.txBuffer.size(), pushed: tx_buffer_js_1.txBuffer.pushed_total, popped: tx_buffer_js_1.txBuffer.popped_total });
    });
    app.get("/mempool/buffer/sample", function (req, res) {
        var _a;
        var max = Math.min(1000, Math.max(1, Number((_a = req.query.max) !== null && _a !== void 0 ? _a : 10) | 0));
        res.json({ ok: true, sample: tx_buffer_js_1.txBuffer.sample(max) });
    });
    // Drain up to N for proposer; returns array and removes them from buffer
    app.get("/mempool/buffer/pop", function (req, res) {
        var _a;
        var max = Math.min(1000, Math.max(1, Number((_a = req.query.max) !== null && _a !== void 0 ? _a : 100) | 0));
        var out = tx_buffer_js_1.txBuffer.popN(max);
        res.json({ ok: true, count: out.length, txs: out });
    });
    // Maintenance helper
    app.post("/mempool/buffer/clear", function (_req, res) {
        tx_buffer_js_1.txBuffer.clear();
        res.json({ ok: true });
    });
}
