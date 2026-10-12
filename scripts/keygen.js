"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("node:fs");
var crypto = require("node:crypto");
var out = process.argv[2] || '.nodekey';
var privateKey = crypto.generateKeyPairSync('ed25519').privateKey;
fs.writeFileSync(out, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 384 });
console.log('wrote', out);
