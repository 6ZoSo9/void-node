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
exports.PeerStore = void 0;
var PeerStore = /** @class */ (function () {
    function PeerStore() {
        this.m = new Map();
    }
    PeerStore.prototype.upsert = function (p) {
        var now = Date.now();
        var prev = this.m.get(p.id);
        var next = __assign(__assign({ lastSeen: now }, prev), p);
        this.m.set(p.id, next);
        return next;
    };
    PeerStore.prototype.get = function (id) { return this.m.get(id) || null; };
    PeerStore.prototype.all = function () { return __spreadArray([], this.m.values(), true).sort(function (a, b) { return b.lastSeen - a.lastSeen; }); };
    PeerStore.prototype.remove = function (id) { return this.m.delete(id); };
    PeerStore.prototype.clear = function () { this.m.clear(); };
    return PeerStore;
}());
exports.PeerStore = PeerStore;
