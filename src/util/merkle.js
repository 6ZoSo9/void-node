"use strict";
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9
Object.defineProperty(exports, "__esModule", { value: true });
exports.merkleRootHex = merkleRootHex;
exports.hashToLeafHex = hashToLeafHex;
// src/util/merkle.ts
var crypto = require("node:crypto");
function h(b) {
    var buf = Buffer.isBuffer(b) ? b : Buffer.from(b, "hex");
    return crypto.createHash("sha256").update(buf).digest();
}
/** Given an array of 32-byte hex strings, compute SHA-256 pairwise Merkle root (hex). */
function merkleRootHex(leavesHex) {
    if (leavesHex.length === 0)
        return "".padStart(64, "0");
    var level = leavesHex.map(function (x) { return Buffer.from(x, "hex"); });
    while (level.length > 1) {
        var next = [];
        for (var i = 0; i < level.length; i += 2) {
            var a = level[i];
            var b = i + 1 < level.length ? level[i + 1] : level[i]; // duplicate last
            next.push(h(Buffer.concat([a, b])));
        }
        level = next;
    }
    return level[0].toString("hex");
}
/** Convenience: hash arbitrary strings (e.g., tx hashes or blob cids) to 32-byte leaves. */
function hashToLeafHex(s) {
    return crypto.createHash("sha256").update(Buffer.from(s, "hex")).digest("hex");
}
