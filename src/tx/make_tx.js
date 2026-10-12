"use strict";
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeTx = makeTx;
// src/util/make_tx.ts
/**
 * Canonical tx creator:
 *   - Canonicalize body JSON
 *   - hash = sha256(body_bytes)
 *   - returns {hash, body}
 */
var crypto = require("node:crypto");
function stableStringify(obj) {
    if (obj === null || typeof obj !== "object")
        return JSON.stringify(obj);
    if (Array.isArray(obj))
        return "[" + obj.map(stableStringify).join(",") + "]";
    var keys = Object.keys(obj).sort();
    return "{" + keys.map(function (k) { return JSON.stringify(k) + ":" + stableStringify(obj[k]); }).join(",") + "}";
}
function makeTx(body) {
    var canon = stableStringify(body !== null && body !== void 0 ? body : {});
    var hash = crypto.createHash("sha256").update(Buffer.from(canon)).digest("hex");
    return { hash: hash, body: body };
}
