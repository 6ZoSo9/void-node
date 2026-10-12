"use strict";
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9
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
exports.PeerRegistry = void 0;
var PeerRegistry = /** @class */ (function () {
    function PeerRegistry() {
        this.map = new Map();
    }
    PeerRegistry.prototype.upsert = function (p) {
        var _a, _b, _c;
        var now = Date.now();
        var prev = this.map.get(p.id);
        var merged = {
            id: p.id,
            http: (_a = p.http) !== null && _a !== void 0 ? _a : prev === null || prev === void 0 ? void 0 : prev.http,
            p2p: (_b = p.p2p) !== null && _b !== void 0 ? _b : prev === null || prev === void 0 ? void 0 : prev.p2p,
            capabilities: Array.isArray(p.capabilities) ? p.capabilities : ((_c = prev === null || prev === void 0 ? void 0 : prev.capabilities) !== null && _c !== void 0 ? _c : []),
            lastSeen: now,
        };
        this.map.set(p.id, merged);
        return merged;
    };
    PeerRegistry.prototype.all = function () {
        return __spreadArray([], this.map.values(), true).sort(function (a, b) { return (b.lastSeen - a.lastSeen); });
    };
    PeerRegistry.prototype.purgeStale = function (maxAgeMs) {
        if (maxAgeMs === void 0) { maxAgeMs = 10 * 60000; }
        var now = Date.now();
        var removed = 0;
        for (var _i = 0, _a = this.map; _i < _a.length; _i++) {
            var _b = _a[_i], id = _b[0], p = _b[1];
            if (now - p.lastSeen > maxAgeMs) {
                this.map.delete(id);
                removed++;
            }
        }
        return { ok: true, removed: removed, remaining: this.map.size };
    };
    PeerRegistry.prototype.remove = function (id) { var had = this.map.delete(id); return { removed: had ? 1 : 0, remaining: this.map.size }; };
    PeerRegistry.prototype.count = function () { return this.map.size; };
    PeerRegistry.prototype.size = function () { return this.map.size; };
    return PeerRegistry;
}());
exports.PeerRegistry = PeerRegistry;
