#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const MARKER = 'VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_TERMINAL_ROLLUP_CLOSEOUT_FINAL_SEAL_INDEX_HOLD_V1';
const SOURCE_MARKER = 'VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_TERMINAL_ROLLUP_CLOSEOUT_HOLD_V1';

function usage(exitCode = 0) {
  const text = [
    'Usage:',
    '  node tools/datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-handoff-terminal-rollup-closeout-final-seal-index.mjs --source <closeout.json> --out <final-seal-index.json> [--sealed-at <iso>] [--index-id <id>]',
    '',
    'Creates a deterministic, read-only final seal index for the operator handoff terminal rollup closeout.',
    'It does not append a canonical ledger, issue WC, create a claim, transfer funds, or grant mutation authority.'
  ].join('\n');
  console.log(text);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') usage(0);
    if (arg === '--source') args.source = argv[++i];
    else if (arg === '--out') args.out = argv[++i];
    else if (arg === '--sealed-at') args.sealedAt = argv[++i];
    else if (arg === '--index-id') args.indexId = argv[++i];
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!args.source) throw new Error('missing required --source');
  if (!args.out) throw new Error('missing required --out');
  if (path.resolve(args.source) === path.resolve(args.out)) {
    throw new Error('refusing to write final seal index over source file');
  }
  return args;
}

function stableJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath);
  try {
    return { raw, value: JSON.parse(raw.toString('utf8')) };
  } catch (error) {
    throw new Error(`invalid JSON at ${filePath}: ${error.message}`);
  }
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(tmp, filePath);
}

function withoutIndexHash(value) {
  const clone = JSON.parse(JSON.stringify(value));
  delete clone.final_seal_index_hash;
  return clone;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourcePath = path.resolve(args.source);
  const outPath = path.resolve(args.out);
  const { raw, value: source } = readJson(sourcePath);

  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error('source closeout must be a JSON object');
  }
  if (source.marker !== SOURCE_MARKER) {
    throw new Error(`source marker mismatch: expected ${SOURCE_MARKER}`);
  }

  const sourceSha256 = sha256(raw);
  const sourceCanonicalSha256 = sha256(stableJson(source));

  const index = {
    marker: MARKER,
    status: 'indexed',
    final_seal_index_id: args.indexId || 'datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-handoff-terminal-rollup-closeout-final-seal-index-v1',
    sealed_at: args.sealedAt || '1970-01-01T00:00:00.000Z',
    source: {
      marker: source.marker,
      path_basename: path.basename(sourcePath),
      sha256: sourceSha256,
      canonical_sha256: sourceCanonicalSha256,
      closeout_id: source.closeout_id || null,
      closeout_hash: source.closeout_hash || null,
      status: source.status || null
    },
    entries: [
      {
        kind: 'operator_handoff_terminal_rollup_closeout',
        marker: source.marker,
        sha256: sourceSha256,
        canonical_sha256: sourceCanonicalSha256,
        closeout_hash: source.closeout_hash || null,
        status: source.status || null
      }
    ],
    checks: {
      source_marker_green: true,
      source_hash_bound_green: true,
      closeout_hash_bound_green: Boolean(source.closeout_hash),
      final_seal_index_deterministic_green: true,
      public_safe_review_artifact_green: true,
      no_canonical_ledger_append: true,
      no_wc_issuance: true,
      no_wc_claim: true,
      no_wallet_transfer: true,
      no_live_mutation_power: true
    },
    boundary: {
      public_safe: true,
      read_only: true,
      review_artifact_only: true,
      final_seal_index_only: true,
      canonical_ledger_append_authorized: false,
      wc_issuance_authorized: false,
      wc_claim_authorized: false,
      wallet_transfer_authorized: false,
      mutation_authority: false
    }
  };

  index.final_seal_index_hash = sha256(stableJson(withoutIndexHash(index)));
  writeJsonAtomic(outPath, index);
  console.log(JSON.stringify({ marker: MARKER, status: 'indexed', out: outPath, source_sha256: sourceSha256, final_seal_index_hash: index.final_seal_index_hash }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exit(1);
}
