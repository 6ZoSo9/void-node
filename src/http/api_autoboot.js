"use strict";
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.startAutobootServer = startAutobootServer;
// src/http/api_autoboot.ts
/**
 * Minimal “autoboot” helper for dev: if the store is empty, write a genesis block 0.
 * Endpoints:
 *   POST /api/autoboot -> { ok, wrote }
 */
var express_1 = require("express");
var seg_store_js_1 = require("../chain/seg_store.js");
function startAutobootServer(port) {
    if (port === void 0) { port = Number(process.env.AUTOBOOT_PORT || 4311); }
    var store = new seg_store_js_1.SegStore(process.env.DATA_DIR || "data", { sparseEvery: 256 });
    var app = (0, express_1.default)();
    app.use(express_1.default.json({ limit: "8mb" }));
    app.post("/api/autoboot", function (_req, res) {
        var head = store.loadHeadNumber();
        if (head >= 0)
            return res.json({ ok: true, wrote: false, head: head });
        var now = Date.now();
        store.saveBlock({
            number: 0,
            parentHash: "".padStart(64, "0"),
            timestamp: now,
            txRoot: "".padStart(64, "0"),
            blobRoot: "".padStart(64, "0"),
            txs: [],
            blobs: [],
            proposer: "genesis",
            sig: "".padStart(64, "0"),
        });
        res.json({ ok: true, wrote: true, head: store.loadHeadNumber() });
    });
    app.listen(port, function () { return console.log("[autoboot] http :".concat(port)); });
    return { ok: true, port: port };
}
if ((_a = process.argv[1]) === null || _a === void 0 ? void 0 : _a.endsWith("api_autoboot.ts"))
    startAutobootServer();
