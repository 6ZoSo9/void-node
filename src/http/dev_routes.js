"use strict";
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDevRoutes = registerDevRoutes;
function registerDevRoutes(app, node) {
    // Echo for quick sanity
    app.post("/dev/echo", function (req, res) { var _a; return res.json({ ok: true, body: (_a = req.body) !== null && _a !== void 0 ? _a : null }); });
    // Env preview (safe subset)
    app.get("/dev/env", function (_req, res) {
        var pick = function (k) { return process.env[k]; };
        res.json({
            ok: true,
            DATA_DIR: pick("DATA_DIR"),
            HTTP_PORT: pick("HTTP_PORT"),
            P2P_PORT: pick("P2P_PORT"),
            PUBLIC_HTTP_BASE: pick("PUBLIC_HTTP_BASE"),
        });
    });
    // Start/stop proposer quickly
    app.post("/dev/proposer/start", function (req, res) {
        var _a, _b, _c;
        var intervalMs = Number((_a = req.query.intervalMs) !== null && _a !== void 0 ? _a : 5000);
        try {
            return res.json((_c = (_b = node.startProposer) === null || _b === void 0 ? void 0 : _b.call(node, intervalMs)) !== null && _c !== void 0 ? _c : { ok: false, error: "no startProposer()" });
        }
        catch (e) {
            return res.status(500).json({ ok: false, error: String((e === null || e === void 0 ? void 0 : e.message) || e) });
        }
    });
    app.post("/dev/proposer/stop", function (_req, res) {
        var _a, _b;
        try {
            return res.json((_b = (_a = node.stopProposer) === null || _a === void 0 ? void 0 : _a.call(node)) !== null && _b !== void 0 ? _b : { ok: false, error: "no stopProposer()" });
        }
        catch (e) {
            return res.status(500).json({ ok: false, error: String((e === null || e === void 0 ? void 0 : e.message) || e) });
        }
    });
}
