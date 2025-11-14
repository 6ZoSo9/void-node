#!/usr/bin/env node
// DEV-ONLY: uses sha3-256 (not Ethereum keccak-256). Mainnet tool will be swapped.
// Canonicalizes JSON (sorted keys) and prints hash + canonical JSON.

import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

function usage() {
  console.error('Usage: node ops/update-manifest-hash.mjs <manifest.json> [--print-json]');
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length < 1) usage();

const file = args[0];
const printJson = args.includes('--print-json');

let raw;
try {
  raw = fs.readFileSync(file, 'utf8');
} catch (e) {
  console.error(`[ERR] cannot read file: ${file}`);
  process.exit(1);
}

let obj;
try {
  obj = JSON.parse(raw);
} catch (e) {
  console.error('[ERR] invalid JSON:', e.message);
  process.exit(1);
}

function canonicalize(v) {
  if (v === null) return null;
  const t = typeof v;
  if (t !== 'object') return v;
  if (Array.isArray(v)) return v.map(canonicalize);
  const keys = Object.keys(v).sort();
  const out = {};
  for (const k of keys) {
    out[k] = canonicalize(v[k]);
  }
  return out;
}

const canon = canonicalize(obj);
const canonStr = JSON.stringify(canon);

const hashHex = crypto.createHash('sha3-256').update(Buffer.from(canonStr, 'utf8')).digest('hex');
const hashBytes32 = '0x' + hashHex;

console.log('file        :', path.resolve(file));
console.log('schemaVersion:', canon.schemaVersion ?? '(none)');
console.log('app         :', canon.app ?? '(none)');
console.log('protocol    :', canon.protocol ?? '(none)');
console.log('manifestHash:', hashBytes32);

if (printJson) {
  console.log('--- canonical JSON ---');
  process.stdout.write(canonStr + '\n');
}
