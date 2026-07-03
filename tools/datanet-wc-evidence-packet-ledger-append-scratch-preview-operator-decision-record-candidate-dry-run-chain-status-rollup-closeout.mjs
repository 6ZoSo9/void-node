#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const MARKER = 'VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_RECORD_CANDIDATE_DRY_RUN_CHAIN_STATUS_ROLLUP_CLOSEOUT_HOLD_V1';
const SOURCE_MARKER = 'VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_RECORD_CANDIDATE_DRY_RUN_CHAIN_STATUS_ROLLUP_HOLD_V1';

function usage(exitCode = 0) {
  const text = [
    'Usage:',
    '  node tools/datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-decision-record-candidate-dry-run-chain-status-rollup-closeout.mjs --source <chain-status-rollup.json> --out <closeout.json> [--closed-at <iso>] [--closeout-id <id>]',
    '',
    'Creates a deterministic, read-only closeout for the operator decision record candidate dry-run chain status rollup.',
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
    else if (arg === '--closed-at') args.closedAt = argv[++i];
    else if (arg === '--closeout-id') args.closeoutId = argv[++i];
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!args.source) throw new Error('missing required --source');
  if (!args.out) throw new Error('missing required --out');
  if (path.resolve(args.source) === path.resolve(args.out)) {
    throw new Error('refusing to write closeout over source file');
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

function withoutCloseoutHash(value) {
  const clone = JSON.parse(JSON.stringify(value));
  delete clone.closeout_hash;
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
    throw new Error('source chain status rollup must be a JSON object');
  }
  if (source.marker !== SOURCE_MARKER) {
    throw new Error(`source marker mismatch: expected ${SOURCE_MARKER}`);
  }
  if (source.status !== 'rolled_up') {
    throw new Error('source chain status rollup status must be rolled_up');
  }
  if (!source.rollup_hash) {
    throw new Error('source rollup hash is required');
  }
  if (!source.source?.final_seal_index_closeout_hash) {
    throw new Error('source final seal index closeout hash is required');
  }
  if (!source.source?.final_seal_index_hash) {
    throw new Error('source final seal index hash is required');
  }
  if (!source.source?.candidate_closeout_hash) {
    throw new Error('source candidate closeout hash is required');
  }
  if (!source.source?.candidate_dry_run_hash) {
    throw new Error('source candidate dry-run hash is required');
  }
  if (!source.source?.draft_packet_hash) {
    throw new Error('source draft packet hash is required');
  }
  if (!source.source?.readiness_packet_hash) {
    throw new Error('source readiness packet hash is required');
  }
  if (!source.source?.operator_handoff_chain_status_rollup_hash) {
    throw new Error('source operator handoff chain status rollup hash is required');
  }

  assertTrue(source.chain?.operator_decision_record_candidate_dry_run_created, 'source must record candidate dry-run created');
  assertTrue(source.chain?.operator_decision_record_candidate_dry_run_closed, 'source must record candidate dry-run closed');
  assertTrue(source.chain?.operator_decision_record_candidate_dry_run_closeout_final_seal_indexed, 'source must record final seal indexed');
  assertTrue(source.chain?.operator_decision_record_candidate_dry_run_closeout_final_seal_index_closed, 'source must record final seal index closed');
  assertTrue(source.chain?.dry_run_candidate_chain_status_consolidated, 'source must consolidate dry-run candidate chain status');
  assertTrue(source.chain?.ready_for_manual_operator_decision_review, 'source must be ready for manual operator review');
  assertTrue(source.chain?.still_requires_separate_live_operator_decision_record, 'source must require separate live operator decision record');
  assertFalse(source.chain?.operator_decision_record_created, 'source must not create operator decision record');
  assertFalse(source.chain?.operator_decision_signed, 'source must not sign operator decision');
  assertFalse(source.chain?.approval_execution_authorized, 'source must not authorize approval execution');
  assertFalse(source.chain?.canonical_ledger_append_ready_for_execution, 'source must not make canonical ledger append execution-ready');

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

  const closeout = {
    marker: MARKER,
    status: 'closed',
    closeout_id: args.closeoutId || 'datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-decision-record-candidate-dry-run-chain-status-rollup-closeout-v1',
    closed_at: args.closedAt || '1970-01-01T00:00:00.000Z',
    source: {
      marker: source.marker,
      path_basename: path.basename(sourcePath),
      sha256: sourceSha256,
      canonical_sha256: sourceCanonicalSha256,
      rollup_hash: source.rollup_hash,
      final_seal_index_closeout_hash: source.source.final_seal_index_closeout_hash,
      final_seal_index_hash: source.source.final_seal_index_hash,
      candidate_closeout_hash: source.source.candidate_closeout_hash,
      candidate_dry_run_hash: source.source.candidate_dry_run_hash,
      draft_packet_hash: source.source.draft_packet_hash,
      readiness_packet_hash: source.source.readiness_packet_hash,
      operator_handoff_chain_status_rollup_hash: source.source.operator_handoff_chain_status_rollup_hash,
      status: source.status || null
    },
    closeout: {
      source_status: source.status,
      chain_status_rollup_review_closed: true,
      chain_status_rollup_closeout_only: true,
      dry_run_artifact_chain_remains_dry_run_only: true,
      manual_operator_review_required: true,
      ready_for_future_live_operator_decision_record_lane: true,
      operator_decision_record_created: false,
      operator_decision_signed: false,
      operator_decision_final: false,
      operator_decision_authorized: false,
      approval_execution_authorized: false,
      canonical_ledger_append_ready_for_execution: false,
      future_live_decision_requires_separate_authorized_record: true
    },
    closeout_guardrails: {
      no_confirm_phrase_accepted_in_this_lane: true,
      no_signature_material_requested: true,
      no_automatic_promotion_to_operator_decision: true,
      no_execution_authority: true,
      no_canonical_ledger_target_path_written: true,
      future_operator_decision_record_must_bind_this_chain_status_rollup_closeout_hash: true
    },
    checks: {
      source_marker_green: true,
      source_hash_bound_green: true,
      source_rollup_hash_bound_green: Boolean(source.rollup_hash),
      source_final_seal_index_closeout_hash_bound_green: Boolean(source.source.final_seal_index_closeout_hash),
      source_final_seal_index_hash_bound_green: Boolean(source.source.final_seal_index_hash),
      source_candidate_closeout_hash_bound_green: Boolean(source.source.candidate_closeout_hash),
      source_candidate_dry_run_hash_bound_green: Boolean(source.source.candidate_dry_run_hash),
      source_draft_packet_hash_bound_green: Boolean(source.source.draft_packet_hash),
      source_readiness_packet_hash_bound_green: Boolean(source.source.readiness_packet_hash),
      source_operator_handoff_chain_status_rollup_hash_bound_green: Boolean(source.source.operator_handoff_chain_status_rollup_hash),
      operator_decision_record_candidate_dry_run_chain_status_rollup_closeout_green: true,
      deterministic_closeout_green: true,
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
      chain_status_rollup_closeout_only: true,
      operator_decision_record_candidate_dry_run_chain_status_rollup_closeout_only: true,
      operator_decision_authorized: false,
      approval_execution_authorized: false,
      canonical_ledger_append_authorized: false,
      wc_issuance_authorized: false,
      wc_claim_authorized: false,
      wallet_transfer_authorized: false,
      mutation_authority: false
    }
  };

  closeout.closeout_hash = sha256(stableJson(withoutCloseoutHash(closeout)));
  writeJsonAtomic(outPath, closeout);
  console.log(JSON.stringify({ marker: MARKER, status: 'closed', out: outPath, source_sha256: sourceSha256, source_rollup_hash: source.rollup_hash, closeout_hash: closeout.closeout_hash }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exit(1);
}
