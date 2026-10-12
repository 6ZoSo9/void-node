#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const MARKER = 'VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_RECORD_CANDIDATE_DRY_RUN_CHAIN_STATUS_ROLLUP_CLOSEOUT_FINAL_SEAL_INDEX_HOLD_V1';
const SOURCE_MARKER = 'VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_RECORD_CANDIDATE_DRY_RUN_CHAIN_STATUS_ROLLUP_CLOSEOUT_HOLD_V1';

function usage(exitCode = 0) {
  const text = [
    'Usage:',
    '  node tools/datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-decision-record-candidate-dry-run-chain-status-rollup-closeout-final-seal-index.mjs --source <chain-status-rollup-closeout.json> --out <final-seal-index.json> [--sealed-at <iso>] [--index-id <id>]',
    '',
    'Creates a deterministic, read-only final seal index for the operator decision record candidate dry-run chain status rollup closeout.',
    'This does not create, sign, approve, finalize, or execute an operator decision. It does not append a canonical ledger, issue WC, create a claim, transfer funds, or grant mutation authority.'
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

function assertFalseBoundary(source, key) {
  if (source.boundary?.[key] !== false) {
    throw new Error(`source boundary must keep ${key} false`);
  }
}

function assertTrue(value, message) {
  if (value !== true) throw new Error(message);
}

function assertFalse(value, message) {
  if (value !== false) throw new Error(message);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourcePath = path.resolve(args.source);
  const outPath = path.resolve(args.out);
  const { raw, value: source } = readJson(sourcePath);

  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error('source chain status rollup closeout must be a JSON object');
  }
  if (source.marker !== SOURCE_MARKER) {
    throw new Error(`source marker mismatch: expected ${SOURCE_MARKER}`);
  }
  if (source.status !== 'closed') {
    throw new Error('source chain status rollup closeout status must be closed');
  }
  if (!source.closeout_hash) throw new Error('source closeout hash is required');
  if (!source.source?.rollup_hash) throw new Error('source rollup hash is required');
  if (!source.source?.final_seal_index_closeout_hash) throw new Error('source final seal index closeout hash is required');
  if (!source.source?.final_seal_index_hash) throw new Error('source final seal index hash is required');
  if (!source.source?.candidate_closeout_hash) throw new Error('source candidate closeout hash is required');
  if (!source.source?.candidate_dry_run_hash) throw new Error('source candidate dry-run hash is required');
  if (!source.source?.draft_packet_hash) throw new Error('source draft packet hash is required');
  if (!source.source?.readiness_packet_hash) throw new Error('source readiness packet hash is required');
  if (!source.source?.operator_handoff_chain_status_rollup_hash) throw new Error('source operator handoff chain status rollup hash is required');

  assertTrue(source.closeout?.chain_status_rollup_review_closed, 'source closeout must close chain status rollup review');
  assertTrue(source.closeout?.chain_status_rollup_closeout_only, 'source closeout must be chain status rollup closeout only');
  assertTrue(source.closeout?.dry_run_artifact_chain_remains_dry_run_only, 'source closeout must preserve dry-run-only chain');
  assertTrue(source.closeout?.manual_operator_review_required, 'source closeout must require manual operator review');
  assertTrue(source.closeout?.ready_for_future_live_operator_decision_record_lane, 'source closeout must be ready for future live decision lane');
  assertFalse(source.closeout?.operator_decision_record_created, 'source closeout must not create an operator decision record');
  assertFalse(source.closeout?.operator_decision_signed, 'source closeout must not be signed');
  assertFalse(source.closeout?.operator_decision_final, 'source closeout must not be final');
  assertFalse(source.closeout?.operator_decision_authorized, 'source closeout must not authorize an operator decision');
  assertFalse(source.closeout?.approval_execution_authorized, 'source closeout must not authorize approval execution');
  assertFalse(source.closeout?.canonical_ledger_append_ready_for_execution, 'source closeout must not mark canonical ledger append as ready for execution');

  assertTrue(source.closeout_guardrails?.no_confirm_phrase_accepted_in_this_lane, 'source closeout must not accept confirm phrase');
  assertTrue(source.closeout_guardrails?.no_signature_material_requested, 'source closeout must not request signature material');
  assertTrue(source.closeout_guardrails?.no_automatic_promotion_to_operator_decision, 'source closeout must block automatic promotion to operator decision');
  assertTrue(source.closeout_guardrails?.no_execution_authority, 'source closeout must not carry execution authority');
  assertTrue(source.closeout_guardrails?.no_canonical_ledger_target_path_written, 'source closeout must not write canonical ledger target path');

  assertTrue(source.checks?.no_operator_decision_record_created, 'source must prove no operator decision record created');
  assertTrue(source.checks?.no_operator_signature, 'source must prove no operator signature');
  assertTrue(source.checks?.no_approval_execution, 'source must prove no approval execution');
  assertTrue(source.checks?.no_canonical_ledger_append, 'source must prove no canonical ledger append');
  assertTrue(source.checks?.no_wc_issuance, 'source must prove no WC issuance');
  assertTrue(source.checks?.no_wc_claim, 'source must prove no WC claim');
  assertTrue(source.checks?.no_wallet_transfer, 'source must prove no wallet transfer');
  assertTrue(source.checks?.no_live_mutation_power, 'source must prove no live mutation power');

  assertFalseBoundary(source, 'operator_decision_authorized');
  assertFalseBoundary(source, 'approval_execution_authorized');
  assertFalseBoundary(source, 'canonical_ledger_append_authorized');
  assertFalseBoundary(source, 'wc_issuance_authorized');
  assertFalseBoundary(source, 'wc_claim_authorized');
  assertFalseBoundary(source, 'wallet_transfer_authorized');
  assertFalseBoundary(source, 'mutation_authority');

  const sourceSha256 = sha256(raw);
  const sourceCanonicalSha256 = sha256(stableJson(source));

  const index = {
    marker: MARKER,
    status: 'indexed',
    final_seal_index_id: args.indexId || 'datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-decision-record-candidate-dry-run-chain-status-rollup-closeout-final-seal-index-v1',
    sealed_at: args.sealedAt || '1970-01-01T00:00:00.000Z',
    source: {
      marker: source.marker,
      path_basename: path.basename(sourcePath),
      sha256: sourceSha256,
      canonical_sha256: sourceCanonicalSha256,
      closeout_id: source.closeout_id || null,
      closeout_hash: source.closeout_hash,
      rollup_hash: source.source.rollup_hash,
      final_seal_index_closeout_hash: source.source.final_seal_index_closeout_hash,
      final_seal_index_hash: source.source.final_seal_index_hash,
      candidate_closeout_hash: source.source.candidate_closeout_hash,
      candidate_dry_run_hash: source.source.candidate_dry_run_hash,
      draft_packet_hash: source.source.draft_packet_hash,
      readiness_packet_hash: source.source.readiness_packet_hash,
      operator_handoff_chain_status_rollup_hash: source.source.operator_handoff_chain_status_rollup_hash,
      status: source.status || null
    },
    entries: [
      {
        kind: 'operator_decision_record_candidate_dry_run_chain_status_rollup_closeout',
        marker: source.marker,
        sha256: sourceSha256,
        canonical_sha256: sourceCanonicalSha256,
        closeout_hash: source.closeout_hash,
        rollup_hash: source.source.rollup_hash,
        final_seal_index_closeout_hash: source.source.final_seal_index_closeout_hash,
        final_seal_index_hash: source.source.final_seal_index_hash,
        candidate_closeout_hash: source.source.candidate_closeout_hash,
        candidate_dry_run_hash: source.source.candidate_dry_run_hash,
        draft_packet_hash: source.source.draft_packet_hash,
        readiness_packet_hash: source.source.readiness_packet_hash,
        operator_handoff_chain_status_rollup_hash: source.source.operator_handoff_chain_status_rollup_hash,
        status: source.status || null
      }
    ],
    index_guardrails: {
      source_chain_status_rollup_closeout_only: true,
      no_confirm_phrase_accepted_in_this_lane: true,
      no_signature_material_requested: true,
      no_automatic_promotion_to_operator_decision: true,
      no_execution_authority: true,
      no_canonical_ledger_target_path_written: true,
      future_operator_decision_record_must_bind_this_final_seal_index_hash: true
    },
    checks: {
      source_marker_green: true,
      source_hash_bound_green: true,
      source_closeout_hash_bound_green: Boolean(source.closeout_hash),
      source_rollup_hash_bound_green: Boolean(source.source.rollup_hash),
      source_final_seal_index_closeout_hash_bound_green: Boolean(source.source.final_seal_index_closeout_hash),
      source_final_seal_index_hash_bound_green: Boolean(source.source.final_seal_index_hash),
      source_candidate_closeout_hash_bound_green: Boolean(source.source.candidate_closeout_hash),
      source_candidate_dry_run_hash_bound_green: Boolean(source.source.candidate_dry_run_hash),
      source_draft_packet_hash_bound_green: Boolean(source.source.draft_packet_hash),
      source_readiness_packet_hash_bound_green: Boolean(source.source.readiness_packet_hash),
      source_operator_handoff_chain_status_rollup_hash_bound_green: Boolean(source.source.operator_handoff_chain_status_rollup_hash),
      final_seal_index_deterministic_green: true,
      public_safe_review_artifact_green: true,
      manual_operator_review_required: true,
      no_operator_decision_record_created: true,
      no_operator_signature: true,
      no_approval_execution: true,
      no_canonical_ledger_append: true,
      no_wc_issuance: true,
      no_wc_claim: true,
      no_wallet_transfer: true,
      no_live_mutation_power: true
    },
    boundary: {
      public_safe: true,
      read_only: true,
      dry_run_only: true,
      review_artifact_only: true,
      final_seal_index_only: true,
      operator_decision_record_candidate_dry_run_chain_status_rollup_closeout_final_seal_index_only: true,
      operator_decision_authorized: false,
      approval_execution_authorized: false,
      canonical_ledger_append_authorized: false,
      wc_issuance_authorized: false,
      wc_claim_authorized: false,
      wallet_transfer_authorized: false,
      mutation_authority: false
    }
  };

  index.final_seal_index_hash = sha256(stableJson(withoutIndexHash(index)));
  writeJsonAtomic(outPath, index);
  console.log(JSON.stringify({ marker: MARKER, status: 'indexed', out: outPath, source_sha256: sourceSha256, source_closeout_hash: source.closeout_hash, final_seal_index_hash: index.final_seal_index_hash }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exit(1);
}
