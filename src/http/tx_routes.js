"use strict";

// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTxRoutes = registerTxRoutes;
var tx_buffer_js_1 = require("../tx_buffer.js");

function registerTxRoutes(app) {
    // Transaction admission is intentionally not mounted by this legacy router.
    // The canonical transaction owner is installed by the canonical runtime.
    // Generic legacy mempool metrics are also retired because they observed a
    // different singleton than the canonical producer mempool.

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
