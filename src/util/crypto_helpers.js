"use strict";
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256Hex = sha256Hex;
exports.signBytes = signBytes;
exports.verifyBytes = verifyBytes;
exports.stableStringify = stableStringify;
exports.bytesToSign = bytesToSign;
// src/util/crypto_helpers.ts
var crypto = require("node:crypto");
function sha256Hex(data) {
    var buf = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
    return crypto.createHash("sha256").update(buf).digest("hex");
}
/** Node built-in Ed25519 sign/verify helpers. */
function signBytes(priv, bytes) {
    return crypto.sign(null, Buffer.from(bytes), priv).toString("hex");
}
function verifyBytes(pub, bytes, sigHex) {
    try {
        return crypto.verify(null, Buffer.from(bytes), pub, Buffer.from(sigHex, "hex"));
    }
    catch (_a) {
        return false;
    }
}
function stableStringify(obj) {
    if (obj === null || typeof obj !== "object")
        return JSON.stringify(obj);
    if (Array.isArray(obj))
        return "[" + obj.map(stableStringify).join(",") + "]";
    var keys = Object.keys(obj).sort();
    return "{" + keys.map(function (k) { return JSON.stringify(k) + ":" + stableStringify(obj[k]); }).join(",") + "}";
}
function bytesToSign(topic, data, nonce) {
    return Buffer.from(JSON.stringify({ topic: topic, data: data, nonce: nonce }));
}
