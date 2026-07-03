#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT}"

LANE="datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-decision-readiness-packet"
MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_READINESS_PACKET_HOLD_V1"
SOURCE_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_CHAIN_STATUS_ROLLUP_HOLD_V1"
TOOL="tools/${LANE}.mjs"
DOC="docs/datanet/${LANE}-hold-v1.md"
PROOF="ops/mainnet0/${LANE}-hold-v1-proof.sh"
PREV_PROOF="ops/mainnet0/datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-handoff-chain-status-rollup-hold-v1-proof.sh"

printf '== tools exist / syntax ==\n'
test -f "${TOOL}"
test -x "${TOOL}"
node --check "${TOOL}"
test -f "${DOC}"
test -f "${PREV_PROOF}"
bash -n "${PREV_PROOF}"
bash -n "${PROOF}"

printf '== operator handoff chain status rollup source proof ==\n'
bash "${PREV_PROOF}"

TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT
SOURCE="${TMP}/operator-handoff-chain-status-rollup.json"
OUT_A="${TMP}/operator-decision-readiness-packet-a.json"
OUT_B="${TMP}/operator-decision-readiness-packet-b.json"
BAD="${TMP}/bad-source.json"
BAD_OUT="${TMP}/bad-readiness-packet.json"
NOT_READY="${TMP}/not-ready-source.json"
NOT_READY_OUT="${TMP}/not-ready-out.json"

printf '== create fixture operator handoff chain status rollup ==\n'
cat > "${SOURCE}" <<JSON
{
  "marker": "${SOURCE_MARKER}",
  "status": "rolled_up",
  "rollup_id": "operator-handoff-chain-status-rollup-fixture-v1",
  "rollup_at": "2026-07-03T00:00:00.000Z",
  "rollup_hash": "2466190665899e930a8b9e0cf1614331ccff424e880879c1985a370b7ab87538",
  "source": {
    "marker": "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_TERMINAL_ROLLUP_CLOSEOUT_FINAL_SEAL_INDEX_CLOSEOUT_HOLD_V1",
    "closeout_hash": "e72a2238b12eafef8f628dd885feae13c3d61cfb4e15b1f520808a164441c000",
    "status": "closed"
  },
  "chain": {
    "operator_handoff_terminal_rollup_closed": true,
    "final_seal_indexed": true,
    "final_seal_index_closed": true,
    "source_closeout_hash_bound": true,
    "ready_for_manual_operator_decision_review": true
  },
  "checks": {
    "source_marker_green": true,
    "source_hash_bound_green": true,
    "source_closeout_hash_bound_green": true,
    "operator_handoff_chain_status_rollup_green": true,
    "deterministic_rollup_green": true,
    "public_safe_review_artifact_green": true,
    "manual_operator_review_required": true,
    "no_canonical_ledger_append": true,
    "no_wc_issuance": true,
    "no_wc_claim": true,
    "no_wallet_transfer": true,
    "no_live_mutation_power": true
  },
  "boundary": {
    "public_safe": true,
    "read_only": true,
    "review_artifact_only": true,
    "chain_status_rollup_only": true,
    "canonical_ledger_append_authorized": false,
    "wc_issuance_authorized": false,
    "wc_claim_authorized": false,
    "wallet_transfer_authorized": false,
    "mutation_authority": false
  }
}
JSON

printf '== operator decision readiness packet ==\n'
node "${TOOL}" --source "${SOURCE}" --out "${OUT_A}" --ready-at "2026-07-03T00:00:00.000Z" --packet-id "operator-decision-readiness-packet-fixture-v1"
node "${TOOL}" --source "${SOURCE}" --out "${OUT_B}" --ready-at "2026-07-03T00:00:00.000Z" --packet-id "operator-decision-readiness-packet-fixture-v1"

printf '== operator decision readiness packet deterministic / binding ==\n'
cmp "${OUT_A}" "${OUT_B}"
echo "operator_decision_readiness_packet_deterministic_green=true"
node --input-type=module - "${SOURCE}" "${OUT_A}" <<'NODE_BINDING_EOF'
import fs from 'node:fs';
import crypto from 'node:crypto';
const [sourcePath, outPath] = process.argv.slice(2);
const sourceRaw = fs.readFileSync(sourcePath);
const source = JSON.parse(sourceRaw.toString('utf8'));
const out = JSON.parse(fs.readFileSync(outPath, 'utf8'));
const expectedMarker = 'VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_READINESS_PACKET_HOLD_V1';
const expectedSourceMarker = 'VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_CHAIN_STATUS_ROLLUP_HOLD_V1';
const sourceHash = crypto.createHash('sha256').update(sourceRaw).digest('hex');
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
assert(out.marker === expectedMarker, 'readiness packet marker mismatch');
assert(out.status === 'ready_for_operator_review', 'readiness packet status mismatch');
assert(out.source?.marker === expectedSourceMarker, 'source marker mismatch');
assert(out.source?.sha256 === sourceHash, 'source hash binding mismatch');
assert(out.source?.rollup_hash === source.rollup_hash, 'source rollup hash binding mismatch');
assert(out.source?.source_closeout_hash === source.source.closeout_hash, 'source closeout hash binding mismatch');
assert(out.readiness?.scratch_preview_chain_present === true, 'scratch preview chain flag missing');
assert(out.readiness?.operator_handoff_chain_status_bound === true, 'chain status bound flag missing');
assert(out.readiness?.manual_operator_decision_review_ready === true, 'manual operator decision ready flag missing');
assert(out.readiness?.operator_decision_created === false, 'operator decision must not be created');
assert(out.readiness?.canonical_ledger_append_ready_for_execution === false, 'canonical ledger append must not be ready for execution');
assert(Array.isArray(out.permitted_next_review_actions), 'permitted next review actions missing');
assert(out.permitted_next_review_actions.includes('prepare_separate_operator_decision_record'), 'separate operator decision record action missing');
assert(out.checks?.source_hash_bound_green === true, 'missing source hash bound check');
assert(out.checks?.source_rollup_hash_bound_green === true, 'missing source rollup hash bound check');
assert(out.checks?.no_operator_decision_created === true, 'missing no operator decision check');
assert(out.boundary?.read_only === true, 'read-only boundary missing');
assert(out.boundary?.review_artifact_only === true, 'review artifact boundary missing');
assert(out.boundary?.operator_decision_readiness_packet_only === true, 'readiness packet only boundary missing');
assert(out.boundary?.operator_decision_authorized === false, 'operator decision boundary changed');
assert(out.boundary?.canonical_ledger_append_authorized === false, 'canonical ledger append boundary changed');
assert(out.boundary?.wc_issuance_authorized === false, 'WC issuance boundary changed');
assert(out.boundary?.wc_claim_authorized === false, 'WC claim boundary changed');
assert(out.boundary?.wallet_transfer_authorized === false, 'wallet transfer boundary changed');
assert(out.boundary?.mutation_authority === false, 'mutation authority boundary changed');
NODE_BINDING_EOF
echo "operator_decision_readiness_packet_binding_green=true"

printf '== bad marker rejection ==\n'
cat > "${BAD}" <<JSON
{"marker":"VOID_BAD_MARKER"}
JSON
if node "${TOOL}" --source "${BAD}" --out "${BAD_OUT}" >/tmp/void-bad-operator-decision-readiness-packet.log 2>&1; then
  cat /tmp/void-bad-operator-decision-readiness-packet.log
  echo "bad_marker_rejection_failed=true"
  exit 1
fi
echo "bad_marker_rejection_green=true"

printf '== not-ready source rejection ==\n'
python3 - "${SOURCE}" "${NOT_READY}" <<'PY_NOT_READY_EOF'
import json, sys
src, out = sys.argv[1:3]
data = json.load(open(src))
data['chain']['ready_for_manual_operator_decision_review'] = False
json.dump(data, open(out, 'w'), indent=2)
PY_NOT_READY_EOF
if node "${TOOL}" --source "${NOT_READY}" --out "${NOT_READY_OUT}" >/tmp/void-not-ready-operator-decision-readiness-packet.log 2>&1; then
  cat /tmp/void-not-ready-operator-decision-readiness-packet.log
  echo "not_ready_rejection_failed=true"
  exit 1
fi
echo "not_ready_rejection_green=true"

printf '== marker/source presence ==\n'
grep -R "${MARKER}" "${TOOL}" "${DOC}" "${PROOF}" >/dev/null
grep -R "${SOURCE_MARKER}" "${TOOL}" "${DOC}" "${PROOF}" >/dev/null
echo "marker_source_presence_green=true"

printf '== forbidden WC cap wording scan ==\n'
node --input-type=module - "${TOOL}" "${DOC}" "${PROOF}" <<'NODE_WORDING_EOF'
import fs from 'node:fs';
const files = process.argv.slice(2);
const banned = [
  /100,?000,?000\s*WC/i,
  /100m\s*WC/i,
  /capped\s+at/i,
  /lifetime\s+WC\s+cap/i
];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const pattern of banned) {
    if (pattern.test(text)) {
      throw new Error(`forbidden WC wording in ${file}`);
    }
  }
}
NODE_WORDING_EOF
echo "forbidden_wc_cap_wording_scan_green=true"

printf '== no mutation authority scan ==\n'
node --input-type=module - "${TOOL}" "${DOC}" "${PROOF}" <<'NODE_AUTH_EOF'
import fs from 'node:fs';
const files = process.argv.slice(2);
const banned = [
  /operator_decision_authorized['"]?\s*:\s*true/i,
  /canonical_ledger_append_authorized['"]?\s*:\s*true/i,
  /wc_issuance_authorized['"]?\s*:\s*true/i,
  /wc_claim_authorized['"]?\s*:\s*true/i,
  /wallet_transfer_authorized['"]?\s*:\s*true/i,
  /\bmutation_authority['"]?\s*:\s*true/i
];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const pattern of banned) {
    if (pattern.test(text)) {
      throw new Error(`mutation authority wording in ${file}`);
    }
  }
}
NODE_AUTH_EOF
echo "no_mutation_authority_scan_green=true"

printf '== result ==\n'
echo "${MARKER}_GREEN"
