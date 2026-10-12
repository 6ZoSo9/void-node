#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const MARKER = 'VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_DRAFT_PACKET_HOLD_V1';
const SOURCE_MARKER = 'VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_READINESS_PACKET_HOLD_V1';
const ALLOWED_RECOMMENDATIONS = [
  'no_recommendation',
  'request_changes',
  'reject_chain',
  'prepare_separate_operator_decision_record'
];

function usage(exitCode = 0) {
  const text = [
    'Usage:',
    '  node tools/datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-decision-draft-packet.mjs --source <readiness-packet.json> --out <draft-packet.json> [--drafted-at <iso>] [--draft-id <id>] [--recommendation <name>]',
    '',
    'Creates a deterministic, read-only operator decision draft packet from an operator decision readiness packet.',
    'It does not create, authorize, sign, approve, or execute an operator decision. It does not append a canonical ledger, issue WC, create a claim, transfer funds, or grant mutation authority.',
    '',
    `Allowed recommendations: ${ALLOWED_RECOMMENDATIONS.join(', ')}`
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
    else if (arg === '--drafted-at') args.draftedAt = argv[++i];
    else if (arg === '--draft-id') args.draftId = argv[++i];
    else if (arg === '--recommendation') args.recommendation = argv[++i];
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!args.source) throw new Error('missing required --source');
  if (!args.out) throw new Error('missing required --out');
  if (path.resolve(args.source) === path.resolve(args.out)) {
    throw new Error('refusing to write draft packet over source file');
  }
  args.recommendation ||= 'no_recommendation';
  if (!ALLOWED_RECOMMENDATIONS.includes(args.recommendation)) {
    throw new Error(`invalid recommendation: ${args.recommendation}`);
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

function withoutDraftHash(value) {
  const clone = JSON.parse(JSON.stringify(value));
  delete clone.draft_packet_hash;
  return clone;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourcePath = path.resolve(args.source);
  const outPath = path.resolve(args.out);
  const { raw, value: source } = readJson(sourcePath);

  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error('source readiness packet must be a JSON object');
  }
  if (source.marker !== SOURCE_MARKER) {
    throw new Error(`source marker mismatch: expected ${SOURCE_MARKER}`);
  }
  if (source.status !== 'ready_for_operator_review') {
    throw new Error('source readiness packet status must be ready_for_operator_review');
  }
  if (source.readiness?.manual_operator_decision_review_ready !== true) {
    throw new Error('source is not ready for manual operator decision review');
  }
  if (source.readiness?.operator_decision_created !== false) {
    throw new Error('source must not already contain an operator decision');
  }
  if (source.boundary?.operator_decision_authorized !== false) {
    throw new Error('source boundary must not authorize an operator decision');
  }
  if (source.boundary?.canonical_ledger_append_authorized !== false) {
    throw new Error('source boundary must not authorize a canonical ledger append');
  }

  const sourceSha256 = sha256(raw);
  const sourceCanonicalSha256 = sha256(stableJson(source));
  const sourceReadinessHash = source.readiness_packet_hash || null;
  const sourceRollupHash = source.source?.rollup_hash || source.source_rollup_hash || null;
  const recommendation = args.recommendation;

  const draftPacket = {
    marker: MARKER,
    status: 'draft_only',
    draft_id: args.draftId || 'datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-decision-draft-packet-v1',
    drafted_at: args.draftedAt || '1970-01-01T00:00:00.000Z',
    source: {
      marker: source.marker,
      path_basename: path.basename(sourcePath),
      sha256: sourceSha256,
      canonical_sha256: sourceCanonicalSha256,
      readiness_packet_hash: sourceReadinessHash,
      source_rollup_hash: sourceRollupHash,
      status: source.status || null
    },
    draft: {
      recommendation,
      allowed_recommendations: ALLOWED_RECOMMENDATIONS,
      manual_operator_review_required: true,
      separate_operator_decision_record_required: recommendation === 'prepare_separate_operator_decision_record',
      draft_only: true,
      operator_decision_created: false,
      operator_decision_signed: false,
      operator_decision_final: false,
      canonical_ledger_append_ready_for_execution: false
    },
    draft_guardrails: {
      no_confirm_phrase_accepted_in_this_lane: true,
      no_automatic_promotion_to_decision: true,
      no_execution_authority: true,
      operator_must_create_a_separate_decision_record: true,
      future_decision_record_must_bind_this_draft_hash: true
    },
    checks: {
      source_marker_green: true,
      source_hash_bound_green: true,
      source_readiness_packet_hash_bound_green: Boolean(sourceReadinessHash),
      source_rollup_hash_bound_green: Boolean(sourceRollupHash),
      valid_recommendation_green: true,
      deterministic_draft_packet_green: true,
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
      operator_decision_draft_packet_only: true,
      operator_decision_authorized: false,
      canonical_ledger_append_authorized: false,
      wc_issuance_authorized: false,
      wc_claim_authorized: false,
      wallet_transfer_authorized: false,
      mutation_authority: false
    }
  };

  draftPacket.draft_packet_hash = sha256(stableJson(withoutDraftHash(draftPacket)));
  writeJsonAtomic(outPath, draftPacket);
  console.log(JSON.stringify({ marker: MARKER, status: 'draft_only', out: outPath, source_sha256: sourceSha256, source_readiness_packet_hash: sourceReadinessHash, draft_packet_hash: draftPacket.draft_packet_hash }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exit(1);
}
