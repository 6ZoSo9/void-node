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
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadEnv = loadEnv;
exports.firstEnv = firstEnv;
exports.reqInt = reqInt;
exports.reqStr = reqStr;
// src/util/env.ts
var path = require("node:path");
var fs = require("node:fs");
var dotenv = require("dotenv");
var loaded = false;
/** Load `.env` if present, return merged snapshot of process.env. */
function loadEnv() {
    if (!loaded) {
        var dot = path.resolve(process.cwd(), ".env");
        if (fs.existsSync(dot))
            dotenv.config({ path: dot });
        loaded = true;
    }
    // return a shallow copy so callers don't mutate process.env
    return __assign({}, process.env);
}
/** Helpers consistent with index.ts style */
function firstEnv() {
    var names = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        names[_i] = arguments[_i];
    }
    for (var _a = 0, names_1 = names; _a < names_1.length; _a++) {
        var n = names_1[_a];
        var v = process.env[n];
        if (v !== undefined && v !== "")
            return String(v);
    }
}
function reqInt(names, label) {
    var arr = Array.isArray(names) ? names : [names];
    var raw = firstEnv.apply(void 0, arr);
    if (raw === undefined)
        throw new Error("Missing required env: ".concat(label, " (").concat(arr.join(" or "), ")"));
    var n = Number(raw);
    if (!Number.isInteger(n) || n <= 0)
        throw new Error("Invalid integer for ".concat(label, ": ").concat(raw));
    return n;
}
function reqStr(names, label) {
    var arr = Array.isArray(names) ? names : [names];
    var v = firstEnv.apply(void 0, arr);
    if (!v)
        throw new Error("Missing required env: ".concat(label, " (").concat(arr.join(" or "), ")"));
    return v;
}
