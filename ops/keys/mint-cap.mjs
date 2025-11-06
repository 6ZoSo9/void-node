#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const b64u = b => Buffer.from(b).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const now = Math.floor(Date.now()/1000);
const payload = {
  iss: "void-operator",
  iat: now,
  exp: now + (parseInt(process.env.CAP_TTL_S||'900',10)),
  scope: (process.env.CAP_SCOPE||'admin:*'),
  nonce: crypto.randomBytes(16).toString('hex'),
};
const header = { alg:"EdDSA", typ:"JWT" };
const msg = b64u(JSON.stringify(header)) + "." + b64u(JSON.stringify(payload));
const prvPath = process.env.OP_KEY || (process.env.HOME + "/.void/operator/void_operator");
const prv = crypto.createPrivateKey(fs.readFileSync(prvPath));
const sig = crypto.sign(null, Buffer.from(msg), prv);
process.stdout.write(`${msg}.${b64u(sig)}`);
