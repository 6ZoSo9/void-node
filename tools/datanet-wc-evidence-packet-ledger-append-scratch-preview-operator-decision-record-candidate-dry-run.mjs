#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const MARKER = 'VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_RECORD_CANDIDATE_DRY_RUN_HOLD_V1';
const SOURCE_MARKER = 'VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_DRAFT_PACKET_HOLD_V1';
const ALLOWED_CANDIDATE_OUTCOMES = [
  'request_changes',
  'reject_chain',
  'prepare_manual_operator_decision_record'
];

function usage(exitCode = 0) {
  const text = [
    'Usage:',
    '  node tools/datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-decision-record-candidate-dry-run.mjs --source <draft-packet.json> --out <candidate-dry-run.json> [--candidate-at <iso>] [--candidate-id <id>] [--outcome <name>]',
    '',
    'Creates a deterministic, read-only operator decision record candidate dry-run from an operator decision draft packet.',
    'This does not create, sign, approve, finalize, or execute an operator decision. It does not append a canonical ledger, issue WC, create a claim, transfer funds, or grant mutation authority.',
    '',
    `Allowed candidate outcomes: ${ALLOWED_CANDIDATE_OUTCOMES.join(', ')}`
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
    else if (arg === '--candidate-at') args.candidateAt = argv[++i];
    else if (arg === '--candidate-id') args.candidateId = argv[++i];
    else if (arg === '--outcome') args.outcome = argv[++i];
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!args.source) throw new Error('missing required --source');
  if (!args.out) throw new Error('missing required --out');
  if (path.resolve(args.source) === path.resolve(args.out)) {
    throw new Error('refusing to write candidate dry-run over source file');
  }
  args.outcome ||= 'prepare_manual_operator_decision_record';
  if (!ALLOWED_CANDIDATE_OUTCOMES.includes(args.outcome)) {
    throw new Error(`invalid candidate outcome: ${args.outcome}`);
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

function withoutCandidateHash(value) {
  const clone = JSON.parse(JSON.stringify(value));
  delete clone.candidate_dry_run_hash;
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
    throw new Error('source draft packet must be a JSON object');
  }
  if (source.marker !== SOURCE_MARKER) {
    throw new Error(`source marker mismatch: expected ${SOURCE_MARKER}`);
  }
  if (source.status !== 'draft_only') {
    throw new Error('source draft packet status must be draft_only');
  }
  if (source.draft?.draft_only !== true) {
    throw new Error('source draft must be explicitly draft_only');
  }
  if (source.draft?.manual_operator_review_required !== true) {
    throw new Error('source draft must require manual operator review');
  }
  if (source.draft?.operator_decision_created !== false) {
    throw new Error('source draft must not have created an operator decision');
  }
  if (source.draft?.operator_decision_signed !== false) {
    throw new Error('source draft must not have signed an operator decision');
  }
  if (source.draft?.operator_decision_final !== false) {
    throw new Error('source draft must not be final');
  }
  if (source.draft?.canonical_ledger_append_ready_for_execution !== false) {
    throw new Error('source draft must not mark canonical ledger append as ready for execution');
  }
  if (source.draft_guardrails?.no_automatic_promotion_to_decision !== true) {
    throw new Error('source draft must block automatic promotion to decision');
  }
  if (source.draft_guardrails?.no_execution_authority !== true) {
    throw new Error('source draft must not carry execution authority');
  }
  assertFalseBoundary(source, 'operator_decision_authorized');
  assertFalseBoundary(source, 'canonical_ledger_append_authorized');
  assertFalseBoundary(source, 'wc_issuance_authorized');
  assertFalseBoundary(source, 'wc_claim_authorized');
  assertFalseBoundary(source, 'wallet_transfer_authorized');
  assertFalseBoundary(source, 'mutation_authority');

  const sourceSha256 = sha256(raw);
  const sourceCanonicalSha256 = sha256(stableJson(source));
  const sourceDraftPacketHash = source.draft_packet_hash || null;
  const sourceReadinessPacketHash = source.source?.readiness_packet_hash || source.source_readiness_packet_hash || null;
  const sourceRollupHash = source.source?.source_rollup_hash || source.source_rollup_hash || null;
  const outcome = args.outcome;

  const candidate = {
    marker: MARKER,
    status: 'candidate_dry_run_only',
    candidate_id: args.candidateId || 'datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-decision-record-candidate-dry-run-v1',
    candidate_at: args.candidateAt || '1970-01-01T00:00:00.000Z',
    source: {
      marker: source.marker,
      path_basename: path.basename(sourcePath),
      sha256: sourceSha256,
      canonical_sha256: sourceCanonicalSha256,
      draft_packet_hash: sourceDraftPacketHash,
      readiness_packet_hash: sourceReadinessPacketHash,
      source_rollup_hash: sourceRollupHash,
      status: source.status || null
    },
    candidate_decision_record: {
      outcome,
      allowed_outcomes: ALLOWED_CANDIDATE_OUTCOMES,
      dry_run_only: true,
      manual_operator_review_required: true,
      operator_decision_record_created: false,
      operator_decision_signed: false,
      operator_decision_final: false,
      operator_decision_authorized: false,
      approval_execution_authorized: false,
      canonical_ledger_append_ready_for_execution: false,
      separate_live_decision_step_required: true
    },
    dry_run_guardrails: {
      no_confirm_phrase_accepted_in_this_lane: true,
      no_signature_material_requested: true,
      no_automatic_promotion_to_operator_decision: true,
      no_execution_authority: true,
      no_canonical_ledger_target_path_written: true,
      future_operator_decision_record_must_bind_this_candidate_hash: true
    },
    checks: {
      source_marker_green: true,
      source_hash_bound_green: true,
      source_draft_packet_hash_bound_green: Boolean(sourceDraftPacketHash),
      source_readiness_packet_hash_bound_green: Boolean(sourceReadinessPacketHash),
      source_rollup_hash_bound_green: Boolean(sourceRollupHash),
      valid_candidate_outcome_green: true,
      deterministic_candidate_dry_run_green: true,
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
      operator_decision_record_candidate_only: true,
      operator_decision_authorized: false,
      approval_execution_authorized: false,
      canonical_ledger_append_authorized: false,
      wc_issuance_authorized: false,
      wc_claim_authorized: false,
      wallet_transfer_authorized: false,
      mutation_authority: false
    }
  };

  candidate.candidate_dry_run_hash = sha256(stableJson(withoutCandidateHash(candidate)));
  writeJsonAtomic(outPath, candidate);
  console.log(JSON.stringify({ marker: MARKER, status: 'candidate_dry_run_only', out: outPath, source_sha256: sourceSha256, source_draft_packet_hash: sourceDraftPacketHash, candidate_dry_run_hash: candidate.candidate_dry_run_hash }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exit(1);
}
