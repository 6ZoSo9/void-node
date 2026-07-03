#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const MARKER = 'VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_READINESS_PACKET_HOLD_V1';
const SOURCE_MARKER = 'VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_CHAIN_STATUS_ROLLUP_HOLD_V1';

function usage(exitCode = 0) {
  const text = [
    'Usage:',
    '  node tools/datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-decision-readiness-packet.mjs --source <chain-status-rollup.json> --out <readiness-packet.json> [--ready-at <iso>] [--packet-id <id>]',
    '',
    'Creates a deterministic, read-only operator decision readiness packet from the operator handoff chain status rollup.',
    'It does not create an operator decision, append a canonical ledger, issue WC, create a claim, transfer funds, or grant mutation authority.'
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
    else if (arg === '--ready-at') args.readyAt = argv[++i];
    else if (arg === '--packet-id') args.packetId = argv[++i];
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!args.source) throw new Error('missing required --source');
  if (!args.out) throw new Error('missing required --out');
  if (path.resolve(args.source) === path.resolve(args.out)) {
    throw new Error('refusing to write readiness packet over source file');
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

function withoutPacketHash(value) {
  const clone = JSON.parse(JSON.stringify(value));
  delete clone.readiness_packet_hash;
  return clone;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourcePath = path.resolve(args.source);
  const outPath = path.resolve(args.out);
  const { raw, value: source } = readJson(sourcePath);

  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error('source chain status rollup must be a JSON object');
  }
  if (source.marker !== SOURCE_MARKER) {
    throw new Error(`source marker mismatch: expected ${SOURCE_MARKER}`);
  }
  if (source.status !== 'rolled_up') {
    throw new Error('source chain status rollup status must be rolled_up');
  }
  if (source.chain?.ready_for_manual_operator_decision_review !== true) {
    throw new Error('source is not ready for manual operator decision review');
  }

  const sourceSha256 = sha256(raw);
  const sourceCanonicalSha256 = sha256(stableJson(source));
  const sourceRollupHash = source.rollup_hash || null;
  const sourceCloseoutHash = source.source?.closeout_hash || source.source_closeout_hash || null;

  const readinessPacket = {
    marker: MARKER,
    status: 'ready_for_operator_review',
    packet_id: args.packetId || 'datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-decision-readiness-packet-v1',
    ready_at: args.readyAt || '1970-01-01T00:00:00.000Z',
    source: {
      marker: source.marker,
      path_basename: path.basename(sourcePath),
      sha256: sourceSha256,
      canonical_sha256: sourceCanonicalSha256,
      rollup_hash: sourceRollupHash,
      source_closeout_hash: sourceCloseoutHash,
      status: source.status || null
    },
    readiness: {
      scratch_preview_chain_present: true,
      operator_handoff_chain_status_bound: true,
      operator_handoff_terminal_rollup_closed: Boolean(source.chain?.operator_handoff_terminal_rollup_closed),
      final_seal_indexed: Boolean(source.chain?.final_seal_indexed),
      final_seal_index_closed: Boolean(source.chain?.final_seal_index_closed),
      manual_operator_decision_review_ready: true,
      operator_decision_created: false,
      canonical_ledger_append_ready_for_execution: false
    },
    permitted_next_review_actions: [
      'manual_operator_review',
      'request_changes',
      'reject_chain',
      'prepare_separate_operator_decision_record'
    ],
    checks: {
      source_marker_green: true,
      source_hash_bound_green: true,
      source_rollup_hash_bound_green: Boolean(sourceRollupHash),
      source_closeout_hash_bound_green: Boolean(sourceCloseoutHash),
      deterministic_readiness_packet_green: true,
      public_safe_review_artifact_green: true,
      manual_operator_review_required: true,
      no_operator_decision_created: true,
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
      operator_decision_readiness_packet_only: true,
      operator_decision_authorized: false,
      canonical_ledger_append_authorized: false,
      wc_issuance_authorized: false,
      wc_claim_authorized: false,
      wallet_transfer_authorized: false,
      mutation_authority: false
    }
  };

  readinessPacket.readiness_packet_hash = sha256(stableJson(withoutPacketHash(readinessPacket)));
  writeJsonAtomic(outPath, readinessPacket);
  console.log(JSON.stringify({ marker: MARKER, status: 'ready_for_operator_review', out: outPath, source_sha256: sourceSha256, source_rollup_hash: sourceRollupHash, readiness_packet_hash: readinessPacket.readiness_packet_hash }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exit(1);
}
