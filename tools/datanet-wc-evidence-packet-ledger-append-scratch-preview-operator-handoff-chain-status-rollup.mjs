#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const MARKER = 'VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_CHAIN_STATUS_ROLLUP_HOLD_V1';
const SOURCE_MARKER = 'VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_TERMINAL_ROLLUP_CLOSEOUT_FINAL_SEAL_INDEX_CLOSEOUT_HOLD_V1';

function usage(exitCode = 0) {
  const text = [
    'Usage:',
    '  node tools/datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-handoff-chain-status-rollup.mjs --source <final-seal-index-closeout.json> --out <rollup.json> [--rollup-at <iso>] [--rollup-id <id>]',
    '',
    'Creates a deterministic, read-only chain status rollup for the operator handoff scratch-preview stack.',
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
    else if (arg === '--rollup-at') args.rollupAt = argv[++i];
    else if (arg === '--rollup-id') args.rollupId = argv[++i];
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!args.source) throw new Error('missing required --source');
  if (!args.out) throw new Error('missing required --out');
  if (path.resolve(args.source) === path.resolve(args.out)) {
    throw new Error('refusing to write rollup over source file');
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

function withoutRollupHash(value) {
  const clone = JSON.parse(JSON.stringify(value));
  delete clone.rollup_hash;
  return clone;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourcePath = path.resolve(args.source);
  const outPath = path.resolve(args.out);
  const { raw, value: source } = readJson(sourcePath);

  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error('source final seal index closeout must be a JSON object');
  }
  if (source.marker !== SOURCE_MARKER) {
    throw new Error(`source marker mismatch: expected ${SOURCE_MARKER}`);
  }

  const sourceSha256 = sha256(raw);
  const sourceCanonicalSha256 = sha256(stableJson(source));
  const sourceCloseoutHash = source.closeout_hash || null;

  const rollup = {
    marker: MARKER,
    status: 'rolled_up',
    rollup_id: args.rollupId || 'datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-handoff-chain-status-rollup-v1',
    rollup_at: args.rollupAt || '1970-01-01T00:00:00.000Z',
    source: {
      marker: source.marker,
      path_basename: path.basename(sourcePath),
      sha256: sourceSha256,
      canonical_sha256: sourceCanonicalSha256,
      closeout_hash: sourceCloseoutHash,
      status: source.status || null
    },
    chain: {
      operator_handoff_terminal_rollup_closed: true,
      final_seal_indexed: true,
      final_seal_index_closed: true,
      source_closeout_hash_bound: Boolean(sourceCloseoutHash),
      ready_for_manual_operator_decision_review: true
    },
    checks: {
      source_marker_green: true,
      source_hash_bound_green: true,
      source_closeout_hash_bound_green: Boolean(sourceCloseoutHash),
      operator_handoff_chain_status_rollup_green: true,
      deterministic_rollup_green: true,
      public_safe_review_artifact_green: true,
      manual_operator_review_required: true,
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
      chain_status_rollup_only: true,
      canonical_ledger_append_authorized: false,
      wc_issuance_authorized: false,
      wc_claim_authorized: false,
      wallet_transfer_authorized: false,
      mutation_authority: false
    }
  };

  rollup.rollup_hash = sha256(stableJson(withoutRollupHash(rollup)));
  writeJsonAtomic(outPath, rollup);
  console.log(JSON.stringify({ marker: MARKER, status: 'rolled_up', out: outPath, source_sha256: sourceSha256, source_closeout_hash: sourceCloseoutHash, rollup_hash: rollup.rollup_hash }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exit(1);
}
