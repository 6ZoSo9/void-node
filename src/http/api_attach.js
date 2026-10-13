"use strict";
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ATTACH_BLOCK_RANGE_MAX_SPAN = void 0;
exports.parseAttachBlockRange = parseAttachBlockRange;
exports.startAttachServer = startAttachServer;
// src/http/api_attach.ts
/**
 * Helper attach API: expose your local store over a tiny HTTP server.
 * Defaults: HTTP :4310, DATA_DIR from env.
 * Endpoints:
 *   GET  /api/health        -> { ok, head, dataDir }
 *   GET  /head              -> { ok, head }
 *   GET  /blocks/range?from=&to=   -> [blocks...]
 */
var express_1 = require("express");
var path = require("node:path");
var seg_store_js_1 = require("../chain/seg_store.js");
var PORT = Number(process.env.ATTACH_PORT || 4310);
var DATA_DIR = process.env.DATA_DIR || "data";
exports.ATTACH_BLOCK_RANGE_MAX_SPAN = 250;
function parseAttachBlockRange(fromRaw, toRaw, head) {
    var from = Number(fromRaw !== null && fromRaw !== void 0 ? fromRaw : 0);
    var to = Number(toRaw !== null && toRaw !== void 0 ? toRaw : head);
    if (!Number.isSafeInteger(head) ||
        head < -1 ||
        !Number.isSafeInteger(from) ||
        !Number.isSafeInteger(to) ||
        from < 0 ||
        to < from) {
        return null;
    }
    return {
        from: from,
        to: Math.min(to, head, from + exports.ATTACH_BLOCK_RANGE_MAX_SPAN - 1),
    };
}
function startAttachServer(opts) {
    var _a, _b;
    var port = Number((_a = opts === null || opts === void 0 ? void 0 : opts.port) !== null && _a !== void 0 ? _a : PORT);
    var data = String((_b = opts === null || opts === void 0 ? void 0 : opts.dataDir) !== null && _b !== void 0 ? _b : DATA_DIR);
    var store = new seg_store_js_1.SegStore(data, { sparseEvery: 256 });
    var app = (0, express_1.default)();
    app.use(express_1.default.json({ limit: "64mb" }));
    app.get(["/api/health", "/health"], function (_req, res) {
        res.json({ ok: true, head: store.loadHeadNumber(), dataDir: path.resolve(data) });
    });
    app.get(["/head", "/api/head"], function (_req, res) {
        res.json({ ok: true, head: store.loadHeadNumber() });
    });
    app.get("/blocks/range", function (req, res) {
        var range = parseAttachBlockRange(req.query.from, req.query.to, store.loadHeadNumber());
        if (!range) {
            return res.status(400).json({ ok: false, error: "bad range" });
        }
        var out = [];
        for (var n = range.from; n <= range.to; n++) {
            var b = store.loadBlock(n);
            if (b)
                out.push(b);
        }
        res.json(out);
    });
    app.listen(port, function () {
        console.log("[attach] http :".concat(port, " (DATA_DIR=").concat(path.resolve(data), ")"));
    });
    return { ok: true, port: port, dataDir: data };
}
// Allow: `npx tsx src/http/api_attach.ts`
if ((_a = process.argv[1]) === null || _a === void 0 ? void 0 : _a.endsWith("api_attach.ts"))
    startAttachServer();
