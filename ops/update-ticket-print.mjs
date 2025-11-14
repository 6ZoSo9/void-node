#!/usr/bin/env node
// DEV-ONLY: build a human-readable update ticket from a manifest.
// Uses sha3-256 for now (same as update-manifest-hash.mjs).

import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

function usage() {
  console.error('Usage: node ops/update-ticket-print.mjs <manifest.json> [--emergency]');
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length < 1) usage();

const file = args[0];
const emergency = args.includes('--emergency');

let raw;
try {
  raw = fs.readFileSync(file, 'utf8');
} catch (e) {
  console.error('[ERR] cannot read file:', file);
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
const manifestHash = '0x' + hashHex;

const app = canon.app ?? 'void-node';
const protocol = canon.protocol ?? {};
const protocolVersion = Number(protocol.version ?? 0);
const minProtocolCompat = Number(protocol.minCompat ?? 0);

console.log('file:', path.resolve(file));
console.log();

console.log('DOMAIN:');
console.log('  name:    "VOID UpdateGate"');
console.log('  version: "1"');
console.log('  chainId: 2050');
console.log('  salt:    "void-updategate-v1"');
console.log();

console.log('MESSAGE:');
console.log('  app:               "%s"', app);
console.log('  protocolVersion:   %d', protocolVersion);
console.log('  minProtocolCompat: %d', minProtocolCompat);
console.log('  manifestHash:      %s', manifestHash);
console.log('  emergency:         %s', emergency ? 'true' : 'false');
