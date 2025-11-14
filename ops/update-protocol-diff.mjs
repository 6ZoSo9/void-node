#!/usr/bin/env node
// Compute protocol diff between local config and a manifest.
// Optional: write Prometheus textfile metrics.

import fs from 'node:fs';
import path from 'node:path';

function usage() {
  console.error('Usage: node ops/update-protocol-diff.mjs <localProtocol> <manifest.json> [--write-prom] [--prom-file <path>]');
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length < 2) usage();

const localProtocol = Number(args[0]);
if (!Number.isInteger(localProtocol)) {
  console.error('[ERR] localProtocol must be an integer');
  process.exit(1);
}

const manifestPath = args[1];
const writeProm = args.includes('--write-prom');
let promFile = null;

const idx = args.indexOf('--prom-file');
if (idx !== -1) {
  if (idx + 1 >= args.length) {
    console.error('[ERR] --prom-file requires a path');
    process.exit(1);
  }
  promFile = args[idx + 1];
}

let raw;
try {
  raw = fs.readFileSync(manifestPath, 'utf8');
} catch (e) {
  console.error('[ERR] cannot read manifest:', manifestPath);
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(raw);
} catch (e) {
  console.error('[ERR] invalid JSON in manifest:', e.message);
  process.exit(1);
}

const protocol = manifest.protocol || {};
const targetProtocol = Number(protocol.version ?? 0);
const minCompat = Number(protocol.minCompat ?? 0);

if (!Number.isInteger(targetProtocol)) {
  console.error('[ERR] manifest.protocol.version must be an integer');
  process.exit(1);
}
if (!Number.isInteger(minCompat)) {
  console.error('[WARN] manifest.protocol.minCompat not an integer; using 0');
}

const diff = localProtocol - targetProtocol;

console.log('manifest     :', path.resolve(manifestPath));
console.log('localProtocol:', localProtocol);
console.log('targetProtocol:', targetProtocol);
console.log('minCompat    :', minCompat);
console.log('diff(local-target):', diff);

if (writeProm) {
  if (!promFile) {
    const tfd = process.env.TEXTFILE_DIR || '/var/lib/node_exporter/textfile_collector';
    promFile = path.join(tfd, 'void_update_protocol.prom');
  }

  const buf = [
    '# HELP void_update_protocol_local local configured protocol version',
    '# TYPE void_update_protocol_local gauge',
    `void_update_protocol_local ${localProtocol}`,
    '# HELP void_update_protocol_target target protocol version from manifest',
    '# TYPE void_update_protocol_target gauge',
    `void_update_protocol_target ${targetProtocol}`,
    '# HELP void_update_protocol_diff local - target (>0 = ahead, <0 = behind)',
    '# TYPE void_update_protocol_diff gauge',
    `void_update_protocol_diff ${diff}`,
    ''
  ].join('\n');

  try {
    fs.writeFileSync(promFile, buf, 'utf8');
    console.log('[OK] wrote Prom metrics to', promFile);
  } catch (e) {
    console.error('[ERR] failed to write Prom file:', e.message);
    process.exit(1);
  }
}
