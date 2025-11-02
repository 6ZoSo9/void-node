"use strict";
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadKeypair = loadKeypair;
// src/crypto/keypair.ts
var fs = require("node:fs");
var crypto = require("node:crypto");
/** Load an Ed25519 private key (PEM) and derive node identity. */
function loadKeypair(pemPath) {
    var pem = fs.readFileSync(pemPath, "utf8");
    var privateKey = crypto.createPrivateKey(pem);
    var publicKey = crypto.createPublicKey(privateKey);
    var pubPEM = publicKey.export({ type: "spki", format: "pem" }).toString();
    var nodeId = crypto.createHash("sha256").update(pubPEM).digest("hex").slice(0, 32);
    return { privateKey: privateKey, publicKey: publicKey, nodeId: nodeId, pubPEM: pubPEM };
}
