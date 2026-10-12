"use strict";
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerP2PRoutes = registerP2PRoutes;
function registerP2PRoutes(app, node) {
    // Dial another node's P2P address, e.g. 127.0.0.1:4700
    var doDial = function (addr) {
        if (!addr || !/^[^:]+:\d+$/.test(addr))
            return { ok: false, error: "bad addr" };
        try {
            if (typeof node.connect === "function") {
                node.connect(addr);
                return { ok: true, dialing: addr };
            }
            return { ok: false, error: "node.connect() not available" };
        }
        catch (e) {
            return { ok: false, error: String((e === null || e === void 0 ? void 0 : e.message) || e) };
        }
    };
    app.get("/p2p/dial", function (req, res) {
        var addr = String(req.query.addr || "");
        res.json(doDial(addr));
    });
    app.post("/p2p/dial", function (req, res) {
        var _a;
        var addr = String((req.body && ((_a = req.body.addr) !== null && _a !== void 0 ? _a : req.query.addr)) || "");
        res.json(doDial(addr));
    });
    // Quick hello/snapshot; returns JSON always
    app.get("/p2p/hello-now", function (_req, res) {
        var _a, _b;
        try {
            var listen = Array.isArray(node.listenAddrs) ? node.listenAddrs : [];
            var peers = Array.isArray(node.peers) ? node.peers.length : ((_b = (_a = node.peers) === null || _a === void 0 ? void 0 : _a.size) !== null && _b !== void 0 ? _b : 0);
            var snap = typeof node.peersSnapshot === "function" ? node.peersSnapshot() : { connected: [], knownAddrs: [] };
            res.json(__assign({ ok: true, id: node.id, listen: listen, peers: peers }, snap));
        }
        catch (e) {
            res.status(500).json({ ok: false, error: String((e === null || e === void 0 ? void 0 : e.message) || e) });
        }
    });
    // Extra helpers (always JSON)
    app.get("/p2p/peers", function (_req, res) {
        try {
            var snap = typeof node.peersSnapshot === "function" ? node.peersSnapshot() : { connected: [], knownAddrs: [] };
            res.json(__assign({ ok: true }, snap));
        }
        catch (e) {
            res.status(500).json({ ok: false, error: String((e === null || e === void 0 ? void 0 : e.message) || e) });
        }
    });
    app.get("/p2p/listen", function (_req, res) {
        var listen = Array.isArray(node.listenAddrs) ? node.listenAddrs : [];
        res.json({ ok: true, listen: listen });
    });
    app.get("/p2p/known", function (_req, res) {
        var _a;
        var known = Array.isArray(node.knownAddrs) ? node.knownAddrs : __spreadArray([], ((_a = node.knownAddrs) !== null && _a !== void 0 ? _a : []), true);
        res.json({ ok: true, known: known });
    });
}
