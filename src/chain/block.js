"use strict";
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeRoots = computeRoots;
exports.blockHash = blockHash;
var crypto = require("node:crypto");
var merkle_js_1 = require("../util/merkle.js");
function computeRoots(txs, blobs) {
    var txLeaves = (txs || []).map(function (t) { return ((t === null || t === void 0 ? void 0 : t.hash) || "").toLowerCase(); }).filter(function (h) { return /^[0-9a-f]{64}$/.test(h); });
    var blobLeaves = (blobs || []).map(function (b) { return ((b === null || b === void 0 ? void 0 : b.cid) || "").toLowerCase(); }).filter(function (h) { return /^[0-9a-f]{64}$/.test(h); });
    var txRoot = txLeaves.length ? (0, merkle_js_1.merkleRootHex)(txLeaves.map(merkle_js_1.hashToLeafHex)) : "".padStart(64, "0");
    var blobRoot = blobLeaves.length ? (0, merkle_js_1.merkleRootHex)(blobLeaves.map(merkle_js_1.hashToLeafHex)) : "".padStart(64, "0");
    return { txRoot: txRoot, blobRoot: blobRoot };
}
function blockHash(b) {
    // Hash a minimal header (stable key order)
    var header = {
        number: b.number,
        parentHash: b.parentHash,
        timestamp: b.timestamp,
        txRoot: b.txRoot,
        blobRoot: b.blobRoot,
        proposer: b.proposer,
    };
    var json = JSON.stringify(header);
    return crypto.createHash("sha256").update(Buffer.from(json)).digest("hex");
}
