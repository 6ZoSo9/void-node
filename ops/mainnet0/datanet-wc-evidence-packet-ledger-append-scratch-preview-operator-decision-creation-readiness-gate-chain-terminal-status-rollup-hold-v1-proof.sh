#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

LANE="datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-decision-creation-readiness-gate-chain-terminal-status-rollup"
MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_CREATION_READINESS_GATE_CHAIN_TERMINAL_STATUS_ROLLUP_HOLD_V1"

SRC_LANE="datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-decision-creation-readiness-gate-chain-terminal-closeout-index-closeout-final-seal-index-closeout"
SRC_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_CREATION_READINESS_GATE_CHAIN_TERMINAL_CLOSEOUT_INDEX_CLOSEOUT_FINAL_SEAL_INDEX_CLOSEOUT_HOLD_V1"

DOC="docs/datanet/${LANE}-hold-v1.md"
TOOL="tools/${LANE}.mjs"

SRC_DOC="docs/datanet/${SRC_LANE}-hold-v1.md"
SRC_PROOF="ops/mainnet0/${SRC_LANE}-hold-v1-proof.sh"
SRC_TOOL="tools/${SRC_LANE}.mjs"

for file in "$DOC" "$TOOL" "$SRC_DOC" "$SRC_PROOF" "$SRC_TOOL"; do
  test -f "$file" || {
    echo "missing_file=$file"
    exit 1
  }
done

echo "== syntax =="
node --check "$TOOL"
bash -n "$0"

OUT1="$(mktemp)"
OUT2="$(mktemp)"
DISPLAY_OUT="$(mktemp)"
VALIDATOR="$(mktemp --suffix=.mjs)"
BAD_MARKER="$(mktemp)"
BAD_HASH="$(mktemp)"
BAD_BOUNDARY="$(mktemp)"
BAD_AUTH="$(mktemp)"
BAD_ROLLUP="$(mktemp)"
trap 'rm -f "$OUT1" "$OUT2" "$DISPLAY_OUT" "$VALIDATOR" "$BAD_MARKER" "$BAD_HASH" "$BAD_BOUNDARY" "$BAD_AUTH" "$BAD_ROLLUP"' EXIT

node "$TOOL" --json > "$OUT1"
node "$TOOL" --json > "$OUT2"
node "$TOOL" > "$DISPLAY_OUT"

cmp "$OUT1" "$OUT2" >/dev/null
grep "${MARKER}_GREEN" "$DISPLAY_OUT" >/dev/null
grep "$MARKER" "$DOC" >/dev/null
grep "$SRC_MARKER" "$SRC_DOC" >/dev/null
grep "$SRC_MARKER" "$SRC_PROOF" >/dev/null
grep "$SRC_MARKER" "$SRC_TOOL" >/dev/null

cat > "$VALIDATOR" <<'NODE'
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const file = process.argv[2];
const marker = process.env.MARKER;
const srcDoc = process.env.SRC_DOC;
const srcProof = process.env.SRC_PROOF;
const srcTool = process.env.SRC_TOOL;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function sha256(buffer) {
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
  return sha256(Buffer.from(canonical(value), 'utf8'));
}

const data = JSON.parse(readFileSync(file, 'utf8'));

if (data.marker !== marker) fail('marker mismatch');
if (data.green_marker !== `${marker}_GREEN`) fail('green marker mismatch');
if (!data.artifact || data.artifact.marker !== marker) fail('artifact marker mismatch');
if (data.artifact.status !== 'read_only_operator_decision_creation_readiness_gate_chain_terminal_status_rollup_ready') fail('status mismatch');
if (data.terminal_status_rollup_hash !== hashCanonical(data.artifact)) fail('terminal status rollup hash mismatch');

const rollup = data.artifact.terminal_status_rollup ?? {};
const trueFields = [
  'readiness_gate_created',
  'readiness_gate_closed',
  'final_seal_index_created',
  'final_seal_index_closed',
  'chain_status_rollup_created',
  'chain_status_rollup_closed',
  'chain_terminal_closeout_index_created',
  'chain_terminal_closeout_index_closed',
  'terminal_closeout_index_closeout_final_seal_index_created',
  'terminal_closeout_index_closeout_final_seal_index_closed',
  'terminal_status_rollup_created',
  'manual_operator_review_required'
];

for (const field of trueFields) {
  if (rollup[field] !== true) {
    fail(`${field} must be true`);
  }
}

const falseGateFields = [
  'operator_decision_creation_authorized',
  'operator_signature_authorized',
  'approval_execution_authorized',
  'canonical_ledger_append_authorized',
  'wallet_or_wc_mutation_authorized'
];

for (const field of falseGateFields) {
  if (rollup[field] !== false) {
    fail(`${field} must be false`);
  }
}

const boundary = data.artifact.boundary ?? {};
const falseBoundaryFields = [
  'operator_decision_created',
  'operator_signature_created',
  'approval_execution_created',
  'canonical_ledger_append_created',
  'wc_issuance_created',
  'wc_claim_created',
  'wallet_transfer_created',
  'mutation_authority_created'
];

for (const field of falseBoundaryFields) {
  if (boundary[field] !== false) {
    fail(`${field} must be false`);
  }
}

const expected = new Map([
  [srcDoc, sha256(readFileSync(srcDoc))],
  [srcProof, sha256(readFileSync(srcProof))],
  [srcTool, sha256(readFileSync(srcTool))]
]);

const inputs = data.artifact.inputs ?? [];
for (const [path, expectedHash] of expected.entries()) {
  const input = inputs.find((entry) => entry.path === path);
  if (!input) fail(`missing input ${path}`);
  if (input.sha256 !== expectedHash) fail(`input hash mismatch ${path}`);
  if (input.source_marker_present !== true) fail(`source marker missing ${path}`);
}
NODE

MARKER="$MARKER" SRC_DOC="$SRC_DOC" SRC_PROOF="$SRC_PROOF" SRC_TOOL="$SRC_TOOL" node "$VALIDATOR" "$OUT1"

echo "== operator decision creation readiness gate chain terminal status rollup deterministic / binding =="
echo "operator_decision_creation_readiness_gate_chain_terminal_status_rollup_deterministic_green=true"
echo "operator_decision_creation_readiness_gate_chain_terminal_status_rollup_binding_green=true"

node --input-type=module - "$OUT1" "$BAD_MARKER" <<'NODE'
import { readFileSync, writeFileSync } from 'node:fs';
const data = JSON.parse(readFileSync(process.argv[2], 'utf8'));
data.marker = 'BAD_MARKER';
writeFileSync(process.argv[3], `${JSON.stringify(data, null, 2)}\n`);
NODE

if MARKER="$MARKER" SRC_DOC="$SRC_DOC" SRC_PROOF="$SRC_PROOF" SRC_TOOL="$SRC_TOOL" node "$VALIDATOR" "$BAD_MARKER" >/dev/null 2>&1; then
  echo "bad_marker_rejection_failed=true"
  exit 1
fi
echo "bad_marker_rejection_green=true"

node --input-type=module - "$OUT1" "$BAD_HASH" <<'NODE'
import { readFileSync, writeFileSync } from 'node:fs';
const data = JSON.parse(readFileSync(process.argv[2], 'utf8'));
data.artifact.inputs[0].sha256 = '0'.repeat(64);
writeFileSync(process.argv[3], `${JSON.stringify(data, null, 2)}\n`);
NODE

if MARKER="$MARKER" SRC_DOC="$SRC_DOC" SRC_PROOF="$SRC_PROOF" SRC_TOOL="$SRC_TOOL" node "$VALIDATOR" "$BAD_HASH" >/dev/null 2>&1; then
  echo "bad_source_hash_rejection_failed=true"
  exit 1
fi
echo "bad_source_hash_rejection_green=true"

node --input-type=module - "$OUT1" "$BAD_ROLLUP" <<'NODE'
import { readFileSync, writeFileSync } from 'node:fs';
const data = JSON.parse(readFileSync(process.argv[2], 'utf8'));
data.artifact.terminal_status_rollup.terminal_status_rollup_created = false;
data.terminal_status_rollup_hash = '0'.repeat(64);
writeFileSync(process.argv[3], `${JSON.stringify(data, null, 2)}\n`);
NODE

if MARKER="$MARKER" SRC_DOC="$SRC_DOC" SRC_PROOF="$SRC_PROOF" SRC_TOOL="$SRC_TOOL" node "$VALIDATOR" "$BAD_ROLLUP" >/dev/null 2>&1; then
  echo "bad_terminal_status_rollup_rejection_failed=true"
  exit 1
fi
echo "bad_terminal_status_rollup_rejection_green=true"

for field in operator_decision_created operator_signature_created approval_execution_created canonical_ledger_append_created wc_issuance_created wc_claim_created wallet_transfer_created mutation_authority_created; do
  node --input-type=module - "$OUT1" "$BAD_BOUNDARY" "$field" <<'NODE'
import { readFileSync, writeFileSync } from 'node:fs';
const data = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const field = process.argv[4];
data.artifact.boundary[field] = true;
data.terminal_status_rollup_hash = '0'.repeat(64);
writeFileSync(process.argv[3], `${JSON.stringify(data, null, 2)}\n`);
NODE

  if MARKER="$MARKER" SRC_DOC="$SRC_DOC" SRC_PROOF="$SRC_PROOF" SRC_TOOL="$SRC_TOOL" node "$VALIDATOR" "$BAD_BOUNDARY" >/dev/null 2>&1; then
    echo "${field}_rejection_failed=true"
    exit 1
  fi
  echo "${field}_rejection_green=true"
done

for field in operator_decision_creation_authorized operator_signature_authorized approval_execution_authorized canonical_ledger_append_authorized wallet_or_wc_mutation_authorized; do
  node --input-type=module - "$OUT1" "$BAD_AUTH" "$field" <<'NODE'
import { readFileSync, writeFileSync } from 'node:fs';
const data = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const field = process.argv[4];
data.artifact.terminal_status_rollup[field] = true;
data.terminal_status_rollup_hash = '0'.repeat(64);
writeFileSync(process.argv[3], `${JSON.stringify(data, null, 2)}\n`);
NODE

  if MARKER="$MARKER" SRC_DOC="$SRC_DOC" SRC_PROOF="$SRC_PROOF" SRC_TOOL="$SRC_TOOL" node "$VALIDATOR" "$BAD_AUTH" >/dev/null 2>&1; then
    echo "${field}_auth_rejection_failed=true"
    exit 1
  fi
  echo "${field}_auth_rejection_green=true"
done

echo "== marker/source presence =="
echo "marker_source_presence_green=true"

echo "== forbidden WC cap wording scan =="
if grep -RInE '100,000,000 WC|100000000 WC|100m WC|100M WC|WC supply cap|capped WC|WC cap' "$DOC" "$TOOL"; then
  echo "forbidden_wc_cap_wording_scan_failed=true"
  exit 1
fi
echo "forbidden_wc_cap_wording_scan_green=true"

echo "== no mutation authority scan =="
if grep -RInE '"(operator_decision_created|operator_signature_created|approval_execution_created|canonical_ledger_append_created|wc_issuance_created|wc_claim_created|wallet_transfer_created|mutation_authority_created)"[[:space:]]*:[[:space:]]*true' "$DOC" "$TOOL"; then
  echo "no_mutation_authority_scan_failed=true"
  exit 1
fi
if grep -RInE '"(operator_decision_creation_authorized|operator_signature_authorized|approval_execution_authorized|canonical_ledger_append_authorized|wallet_or_wc_mutation_authorized)"[[:space:]]*:[[:space:]]*true' "$DOC" "$TOOL"; then
  echo "no_authorization_scan_failed=true"
  exit 1
fi
echo "no_mutation_authority_scan_green=true"

echo "== result =="
echo "${MARKER}_GREEN"
