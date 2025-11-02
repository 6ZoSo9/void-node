"use strict";
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpBaseFromP2P = httpBaseFromP2P;
exports.parseBootstrap = parseBootstrap;
exports.nextBackoff = nextBackoff;
// src/p2p/p2p.ts
/**
 * Small helpers shared by our P2P surfaces (heuristics, http inference, etc.)
 */
/** Infer http base from a p2p address like 127.0.0.1:4701 -> http://127.0.0.1:4101 */
function httpBaseFromP2P(addr) {
    if (!addr)
        return;
    var m = addr.match(/^([^:]+):(\d+)$/);
    if (!m)
        return;
    var host = m[1], port = Number(m[2]);
    if (port >= 4700 && port <= 4799)
        return "http://".concat(host, ":").concat(4100 + (port - 4700));
    return;
}
/** Normalize bootstrap list from env string "a,b,c" */
function parseBootstrap(s) {
    if (!s)
        return [];
    return String(s)
        .split(",")
        .map(function (x) { return x.trim(); })
        .filter(Boolean);
}
/** Quick backoff curve (ms) with caps */
function nextBackoff(prev, min, max) {
    if (min === void 0) { min = 500; }
    if (max === void 0) { max = 15000; }
    var p = Math.max(min, prev || min);
    return Math.min(p * 2, max);
}
