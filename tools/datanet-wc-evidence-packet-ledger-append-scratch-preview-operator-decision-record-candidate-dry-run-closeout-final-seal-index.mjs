#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const MARKER = 'VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_RECORD_CANDIDATE_DRY_RUN_CLOSEOUT_FINAL_SEAL_INDEX_HOLD_V1';
const SOURCE_MARKER = 'VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_RECORD_CANDIDATE_DRY_RUN_CLOSEOUT_HOLD_V1';

function usage(exitCode = 0) {
  const text = [
    'Usage:',
    '  node tools/datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-decision-record-candidate-dry-run-closeout-final-seal-index.mjs --source <closeout.json> --out <final-seal-index.json> [--sealed-at <iso>] [--index-id <id>]',
    '',
    'Creates a deterministic, read-only final seal index for the operator decision record candidate dry-run closeout.',
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
  if (source.status !== 'closed') {
    throw new Error('source closeout status must be closed');
  }
  if (source.closeout?.candidate_dry_run_review_closed !== true) {
    throw new Error('source closeout must close candidate dry-run review');
  }
  if (source.closeout?.dry_run_closeout_only !== true) {
    throw new Error('source closeout must be dry-run closeout only');
  }
  if (source.closeout?.manual_operator_review_required !== true) {
    throw new Error('source closeout must require manual operator review');
  }
  if (source.closeout?.operator_decision_record_created !== false) {
    throw new Error('source closeout must not create an operator decision record');
  }
  if (source.closeout?.operator_decision_signed !== false) {
    throw new Error('source closeout must not be signed');
  }
  if (source.closeout?.operator_decision_final !== false) {
    throw new Error('source closeout must not be final');
  }
  if (source.closeout?.operator_decision_authorized !== false) {
    throw new Error('source closeout must not authorize an operator decision');
  }
  if (source.closeout?.approval_execution_authorized !== false) {
    throw new Error('source closeout must not authorize approval execution');
  }
  if (source.closeout?.canonical_ledger_append_ready_for_execution !== false) {
    throw new Error('source closeout must not mark canonical ledger append as ready for execution');
  }
  if (source.closeout_guardrails?.no_signature_material_requested !== true) {
    throw new Error('source closeout must not request signature material');
  }
  if (source.closeout_guardrails?.no_automatic_promotion_to_operator_decision !== true) {
    throw new Error('source closeout must block automatic promotion to operator decision');
  }
  if (source.closeout_guardrails?.no_execution_authority !== true) {
    throw new Error('source closeout must not carry execution authority');
  }
  if (source.closeout_guardrails?.no_canonical_ledger_target_path_written !== true) {
    throw new Error('source closeout must not write canonical ledger target path');
  }
  assertFalseBoundary(source, 'operator_decision_authorized');
  assertFalseBoundary(source, 'approval_execution_authorized');
  assertFalseBoundary(source, 'canonical_ledger_append_authorized');
  assertFalseBoundary(source, 'wc_issuance_authorized');
  assertFalseBoundary(source, 'wc_claim_authorized');
  assertFalseBoundary(source, 'wallet_transfer_authorized');
  assertFalseBoundary(source, 'mutation_authority');

  const sourceSha256 = sha256(raw);
  const sourceCanonicalSha256 = sha256(stableJson(source));
  const sourceCloseoutHash = source.closeout_hash || null;
  const sourceCandidateDryRunHash = source.source?.candidate_dry_run_hash || source.source_candidate_dry_run_hash || null;
  const sourceDraftPacketHash = source.source?.draft_packet_hash || null;
  const sourceReadinessPacketHash = source.source?.readiness_packet_hash || null;
  const sourceRollupHash = source.source?.source_rollup_hash || null;
  const candidateOutcome = source.source?.candidate_outcome || source.closeout?.source_candidate_outcome || null;

  const index = {
    marker: MARKER,
    status: 'indexed',
    final_seal_index_id: args.indexId || 'datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-decision-record-candidate-dry-run-closeout-final-seal-index-v1',
    sealed_at: args.sealedAt || '1970-01-01T00:00:00.000Z',
    source: {
      marker: source.marker,
      path_basename: path.basename(sourcePath),
      sha256: sourceSha256,
      canonical_sha256: sourceCanonicalSha256,
      closeout_id: source.closeout_id || null,
      closeout_hash: sourceCloseoutHash,
      candidate_dry_run_hash: sourceCandidateDryRunHash,
      draft_packet_hash: sourceDraftPacketHash,
      readiness_packet_hash: sourceReadinessPacketHash,
      source_rollup_hash: sourceRollupHash,
      candidate_outcome: candidateOutcome,
      status: source.status || null
    },
    entries: [
      {
        kind: 'operator_decision_record_candidate_dry_run_closeout',
        marker: source.marker,
        sha256: sourceSha256,
        canonical_sha256: sourceCanonicalSha256,
        closeout_hash: sourceCloseoutHash,
        candidate_dry_run_hash: sourceCandidateDryRunHash,
        draft_packet_hash: sourceDraftPacketHash,
        readiness_packet_hash: sourceReadinessPacketHash,
        source_rollup_hash: sourceRollupHash,
        candidate_outcome: candidateOutcome,
        status: source.status || null
      }
    ],
    index_guardrails: {
      source_closeout_only: true,
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
      source_closeout_hash_bound_green: Boolean(sourceCloseoutHash),
      source_candidate_dry_run_hash_bound_green: Boolean(sourceCandidateDryRunHash),
      source_draft_packet_hash_bound_green: Boolean(sourceDraftPacketHash),
      source_readiness_packet_hash_bound_green: Boolean(sourceReadinessPacketHash),
      source_rollup_hash_bound_green: Boolean(sourceRollupHash),
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
      operator_decision_record_candidate_closeout_final_seal_index_only: true,
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
  console.log(JSON.stringify({ marker: MARKER, status: 'indexed', out: outPath, source_sha256: sourceSha256, source_closeout_hash: sourceCloseoutHash, final_seal_index_hash: index.final_seal_index_hash }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exit(1);
}
