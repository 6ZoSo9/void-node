"use strict";

// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTxRoutes = registerTxRoutes;
var mempool_js_1 = require("../mempool.js");
var tx_buffer_js_1 = require("../tx_buffer.js");

function registerTxRoutes(app) {
    // Transaction admission is intentionally not mounted by this legacy router.
    // The canonical transaction owner is installed by the canonical runtime.

    // Prometheus-ish overview for mempool (read-only).
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

    // Read-only TX buffer observability.
    app.get("/mempool/buffer/size", function (_req, res) {
        res.json({ ok: true, size: tx_buffer_js_1.txBuffer.size(), pushed: tx_buffer_js_1.txBuffer.pushed_total, popped: tx_buffer_js_1.txBuffer.popped_total });
    });

    app.get("/mempool/buffer/sample", function (req, res) {
        var _a;
        var max = Math.min(1000, Math.max(1, Number((_a = req.query.max) !== null && _a !== void 0 ? _a : 10) | 0));
        res.json({ ok: true, sample: tx_buffer_js_1.txBuffer.sample(max) });
    });
}
