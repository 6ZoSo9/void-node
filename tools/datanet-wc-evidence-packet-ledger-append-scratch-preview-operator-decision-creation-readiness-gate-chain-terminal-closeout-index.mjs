#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';

const LANE = 'datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-decision-creation-readiness-gate-chain-terminal-closeout-index';
const MARKER = 'VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_CREATION_READINESS_GATE_CHAIN_TERMINAL_CLOSEOUT_INDEX_HOLD_V1';

const SOURCE_LANE = 'datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-decision-creation-readiness-gate-chain-status-rollup-closeout-final-seal-index-closeout';
const SOURCE_MARKER = 'VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_CREATION_READINESS_GATE_CHAIN_STATUS_ROLLUP_CLOSEOUT_FINAL_SEAL_INDEX_CLOSEOUT_HOLD_V1';
const SOURCE_HEAD = '6b1fe5ee';
const SOURCE_TAG = 'ckpt-datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-decision-creation-readiness-gate-chain-status-rollup-closeout-final-seal-index-closeout-hold-v1-post-merge-exact-green-20260703-130627';

const SOURCES = [
  {
    role: 'source_readiness_gate_chain_terminal_closeout_doc',
    path: `docs/datanet/${SOURCE_LANE}-hold-v1.md`,
    required_marker: SOURCE_MARKER
  },
  {
    role: 'source_readiness_gate_chain_terminal_closeout_proof',
    path: `ops/mainnet0/${SOURCE_LANE}-hold-v1-proof.sh`,
    required_marker: SOURCE_MARKER
  },
  {
    role: 'source_readiness_gate_chain_terminal_closeout_tool',
    path: `tools/${SOURCE_LANE}.mjs`,
    required_marker: SOURCE_MARKER
  }
];

function sha256Buffer(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function canonical(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function hashCanonical(value) {
  return sha256Buffer(Buffer.from(canonical(value), 'utf8'));
}

function loadSource(source) {
  if (!existsSync(source.path)) {
    throw new Error(`Missing source file: ${source.path}`);
  }

  const bytes = readFileSync(source.path);
  const text = bytes.toString('utf8');

  return {
    ...source,
    bytes: statSync(source.path).size,
    sha256: sha256Buffer(bytes),
    source_marker_present: text.includes(source.required_marker),
    source_green_marker_present: text.includes(`${source.required_marker}_GREEN`)
  };
}

const inputs = SOURCES.map(loadSource);

if (!inputs.every((input) => input.source_marker_present)) {
  throw new Error('One or more source files are missing the required source marker');
}

const artifact = {
  lane: LANE,
  version: 'hold-v1',
  marker: MARKER,
  status: 'read_only_operator_decision_creation_readiness_gate_chain_terminal_closeout_index_ready',
  source_chain: {
    source_lane: SOURCE_LANE,
    source_marker: SOURCE_MARKER,
    source_main_head: SOURCE_HEAD,
    source_post_merge_exact_tag: SOURCE_TAG
  },
  terminal_closeout_index_scope: {
    indexes: 'operator decision creation readiness gate terminally closed chain',
    purpose: 'terminal closeout index for the completed read-only readiness gate chain before any future operator decision candidate creation packet lane',
    authority: 'read_only_terminal_closeout_index_only'
  },
  readiness_gate_terminal_closeout_index: {
    readiness_gate_created: true,
    readiness_gate_closed: true,
    final_seal_index_created: true,
    final_seal_index_closed: true,
    chain_status_rollup_created: true,
    chain_status_rollup_closed: true,
    chain_terminal_closeout_index_created: true,
    manual_operator_review_required: true,
    operator_decision_creation_authorized: false,
    operator_signature_authorized: false,
    approval_execution_authorized: false,
    canonical_ledger_append_authorized: false,
    wallet_or_wc_mutation_authorized: false
  },
  boundary: {
    operator_decision_created: false,
    operator_signature_created: false,
    approval_execution_created: false,
    canonical_ledger_append_created: false,
    wc_issuance_created: false,
    wc_claim_created: false,
    wallet_transfer_created: false,
    mutation_authority_created: false
  },
  inputs
};

const payload = {
  marker: MARKER,
  green_marker: `${MARKER}_GREEN`,
  artifact,
  terminal_closeout_index_hash: hashCanonical(artifact)
};

if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
} else {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.stdout.write(`${MARKER}_GREEN\n`);
}
