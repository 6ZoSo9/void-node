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
exports.bytesToSign = bytesToSign;
exports.signHello = signHello;
exports.verifyHello = verifyHello;
// src/p2p/handshake.ts
/**
 * Minimal signed-hello helpers used by our PubSub wire protocol.
 * We use Node's built-in Ed25519 (no deps).
 */
var crypto = require("node:crypto");
function bytesToSign(topic, data, nonce) {
    return Buffer.from(JSON.stringify({ topic: topic, data: data, nonce: nonce }));
}
function signHello(priv, self) {
    var nonce = crypto.randomBytes(8).toString("hex");
    var payload = { id: self.id, listen: self.listen, proto: self.proto, pubkey: self.pubPEM };
    var bytes = bytesToSign("HELLO", JSON.stringify(payload), nonce);
    var sig = crypto.sign(null, Buffer.from(bytes), priv).toString("hex");
    return __assign(__assign({ type: "HELLO" }, payload), { nonce: nonce, sig: sig });
}
function verifyHello(h) {
    if (h.type !== "HELLO")
        return false;
    try {
        var pub = crypto.createPublicKey(h.pubkey);
        var payload = { id: h.id, listen: h.listen, proto: h.proto, pubkey: h.pubkey };
        var bytes = bytesToSign("HELLO", JSON.stringify(payload), h.nonce);
        return crypto.verify(null, Buffer.from(bytes), pub, Buffer.from(h.sig, "hex"));
    }
    catch (_a) {
        return false;
    }
}
