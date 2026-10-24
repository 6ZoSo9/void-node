"use strict";
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ATTACH_BLOCK_RANGE_ERROR_CODE_V1 = exports.ATTACH_BLOCK_RANGE_MAX_SPAN = void 0;
exports.resolveAttachBlockRangeAliasV1 = resolveAttachBlockRangeAliasV1;
exports.attachBlockRangeErrorV1 = attachBlockRangeErrorV1;
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
exports.ATTACH_BLOCK_RANGE_ERROR_CODE_V1 = "VOID_BLOCK_RANGE_INVALID_V1";
function normalizeAttachBlockRangeBoundV1(raw, fallback) {
    if (raw === undefined)
        return fallback;
    if (typeof raw === "number") {
        return Number.isSafeInteger(raw) && raw >= 0 ? raw : null;
    }
    if (typeof raw !== "string" ||
        !/^(?:0|[1-9][0-9]*)$/u.test(raw)) {
        return null;
    }
    var value = Number(raw);
    return Number.isSafeInteger(value) ? value : null;
}
function resolveAttachBlockRangeAliasV1(primary, alias) {
    var primaryPresent = primary !== undefined;
    var aliasPresent = alias !== undefined;
    if (primaryPresent && aliasPresent)
        return { ok: false, value: null };
    return {
        ok: true,
        value: primaryPresent ? primary : alias,
    };
}
function attachBlockRangeErrorV1(fromRaw, toRaw, head) {
    var from = normalizeAttachBlockRangeBoundV1(fromRaw, 0);
    var to = normalizeAttachBlockRangeBoundV1(toRaw, head);
    var validHead = Number.isSafeInteger(head) && head >= -1;
    if (!validHead) {
        return {
            ok: false,
            error: "bad range",
            code: exports.ATTACH_BLOCK_RANGE_ERROR_CODE_V1,
            reason: "invalid_head",
            max_heights: exports.ATTACH_BLOCK_RANGE_MAX_SPAN,
            recovery: null,
            aliases: { from: ["from", "start"], to: ["to", "end"] },
        };
    }
    var validFrom = from !== null;
    var boundedTo = to !== null ? Math.min(to, head) : Number.NaN;
    var reason = from !== null &&
        to !== null &&
        to >= from &&
        boundedTo >= from &&
        boundedTo - from >= exports.ATTACH_BLOCK_RANGE_MAX_SPAN
        ? "range_span_exceeds_limit"
        : "invalid_bounds";
    var recoveryFrom = head < 0 ? 0 : validFrom ? from : 0;
    var recoveryCeiling = recoveryFrom <=
        Number.MAX_SAFE_INTEGER - (exports.ATTACH_BLOCK_RANGE_MAX_SPAN - 1)
        ? recoveryFrom + exports.ATTACH_BLOCK_RANGE_MAX_SPAN - 1
        : recoveryFrom;
    var recoveryTo = head < 0
        ? 0
        : recoveryFrom > head
            ? recoveryFrom
            : Math.min(head, recoveryCeiling);
    return {
        ok: false,
        error: "bad range",
        code: exports.ATTACH_BLOCK_RANGE_ERROR_CODE_V1,
        reason: reason,
        max_heights: exports.ATTACH_BLOCK_RANGE_MAX_SPAN,
        recovery: { from: recoveryFrom, to: recoveryTo },
        aliases: { from: ["from", "start"], to: ["to", "end"] },
    };
}
function parseAttachBlockRange(fromRaw, toRaw, head) {
    var from = normalizeAttachBlockRangeBoundV1(fromRaw, 0);
    var to = normalizeAttachBlockRangeBoundV1(toRaw, head);
    if (!Number.isSafeInteger(head) ||
        head < -1 ||
        from === null ||
        to === null ||
        to < from) {
        return null;
    }
    var boundedTo = Math.min(to, head);
    if (boundedTo >= from &&
        boundedTo - from >= exports.ATTACH_BLOCK_RANGE_MAX_SPAN) {
        return null;
    }
    return { from: from, to: boundedTo };
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
        var _a, _b;
        var head = store.loadHeadNumber();
        var fromAlias = resolveAttachBlockRangeAliasV1(req.query.from, req.query.start);
        var toAlias = resolveAttachBlockRangeAliasV1(req.query.to, req.query.end);
        var fromRaw = fromAlias.ok ? fromAlias.value : null;
        var toRaw = toAlias.ok ? toAlias.value : null;
        var range = fromAlias.ok && toAlias.ok
            ? parseAttachBlockRange(fromRaw, toRaw, head)
            : null;
        if (!range) {
            return res.status(400).json(attachBlockRangeErrorV1(fromRaw, toRaw, head));
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
