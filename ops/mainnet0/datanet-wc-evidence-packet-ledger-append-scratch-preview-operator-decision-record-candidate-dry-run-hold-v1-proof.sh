#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT}"

LANE="datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-decision-record-candidate-dry-run"
MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_RECORD_CANDIDATE_DRY_RUN_HOLD_V1"
SOURCE_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_DRAFT_PACKET_HOLD_V1"
TOOL="tools/${LANE}.mjs"
DOC="docs/datanet/${LANE}-hold-v1.md"
PROOF="ops/mainnet0/${LANE}-hold-v1-proof.sh"
PREV_PROOF="ops/mainnet0/datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-decision-draft-packet-hold-v1-proof.sh"

printf '== tools exist / syntax ==\n'
test -f "${TOOL}"
test -x "${TOOL}"
node --check "${TOOL}"
test -f "${DOC}"
test -f "${PREV_PROOF}"
bash -n "${PREV_PROOF}"
bash -n "${PROOF}"

printf '== operator decision draft packet source proof ==\n'
bash "${PREV_PROOF}"

TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT
SOURCE="${TMP}/operator-decision-draft-packet.json"
OUT_A="${TMP}/operator-decision-record-candidate-dry-run-a.json"
OUT_B="${TMP}/operator-decision-record-candidate-dry-run-b.json"
BAD="${TMP}/bad-source.json"
BAD_OUT="${TMP}/bad-candidate-dry-run.json"
INVALID_OUT="${TMP}/invalid-outcome-candidate-dry-run.json"
NOT_DRAFT="${TMP}/not-draft-source.json"
NOT_DRAFT_OUT="${TMP}/not-draft-candidate-dry-run.json"
SIGNED="${TMP}/signed-source.json"
SIGNED_OUT="${TMP}/signed-candidate-dry-run.json"
EXEC_READY="${TMP}/exec-ready-source.json"
EXEC_READY_OUT="${TMP}/exec-ready-candidate-dry-run.json"

printf '== create fixture operator decision draft packet ==\n'
cat > "${SOURCE}" <<JSON
{
  "marker": "${SOURCE_MARKER}",
  "status": "draft_only",
  "draft_id": "operator-decision-draft-packet-fixture-v1",
  "drafted_at": "2026-07-03T00:00:00.000Z",
  "source": {
    "marker": "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_READINESS_PACKET_HOLD_V1",
    "sha256": "419b39a95d68ebcb60831189047ffce29a43e558440d1114165e47afa8d06e67",
    "canonical_sha256": "fixture-canonical-sha256",
    "readiness_packet_hash": "79b25512f54a37d7ddd96559f7853e02504a4f6d7a2c6df5a216c8eba3a2bcc2",
    "source_rollup_hash": "2466190665899e930a8b9e0cf1614331ccff424e880879c1985a370b7ab87538",
    "status": "ready_for_operator_review"
  },
  "draft": {
    "recommendation": "prepare_separate_operator_decision_record",
    "allowed_recommendations": [
      "no_recommendation",
      "request_changes",
      "reject_chain",
      "prepare_separate_operator_decision_record"
    ],
    "manual_operator_review_required": true,
    "separate_operator_decision_record_required": true,
    "draft_only": true,
    "operator_decision_created": false,
    "operator_decision_signed": false,
    "operator_decision_final": false,
    "canonical_ledger_append_ready_for_execution": false
  },
  "draft_guardrails": {
    "no_confirm_phrase_accepted_in_this_lane": true,
    "no_automatic_promotion_to_decision": true,
    "no_execution_authority": true,
    "operator_must_create_a_separate_decision_record": true,
    "future_decision_record_must_bind_this_draft_hash": true
  },
  "checks": {
    "source_marker_green": true,
    "source_hash_bound_green": true,
    "source_readiness_packet_hash_bound_green": true,
    "source_rollup_hash_bound_green": true,
    "valid_recommendation_green": true,
    "deterministic_draft_packet_green": true,
    "public_safe_review_artifact_green": true,
    "manual_operator_review_required": true,
    "no_operator_decision_created": true,
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
    "operator_decision_draft_packet_only": true,
    "operator_decision_authorized": false,
    "canonical_ledger_append_authorized": false,
    "wc_issuance_authorized": false,
    "wc_claim_authorized": false,
    "wallet_transfer_authorized": false,
    "mutation_authority": false
  },
  "draft_packet_hash": "0088a79ec4372824796a5279e6a8003cff49bb0a993949e07ae1d686f442c0f5"
}
JSON

printf '== operator decision record candidate dry-run ==\n'
node "${TOOL}" --source "${SOURCE}" --out "${OUT_A}" --candidate-at "2026-07-03T00:00:00.000Z" --candidate-id "operator-decision-record-candidate-dry-run-fixture-v1" --outcome "prepare_manual_operator_decision_record"
node "${TOOL}" --source "${SOURCE}" --out "${OUT_B}" --candidate-at "2026-07-03T00:00:00.000Z" --candidate-id "operator-decision-record-candidate-dry-run-fixture-v1" --outcome "prepare_manual_operator_decision_record"

printf '== operator decision record candidate dry-run deterministic / binding ==\n'
cmp "${OUT_A}" "${OUT_B}"
echo "operator_decision_record_candidate_dry_run_deterministic_green=true"
node --input-type=module - "${SOURCE}" "${OUT_A}" <<'NODE_BINDING_EOF'
import fs from 'node:fs';
import crypto from 'node:crypto';
const [sourcePath, outPath] = process.argv.slice(2);
const sourceRaw = fs.readFileSync(sourcePath);
const source = JSON.parse(sourceRaw.toString('utf8'));
const out = JSON.parse(fs.readFileSync(outPath, 'utf8'));
const expectedMarker = 'VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_RECORD_CANDIDATE_DRY_RUN_HOLD_V1';
const expectedSourceMarker = 'VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_DRAFT_PACKET_HOLD_V1';
const sourceHash = crypto.createHash('sha256').update(sourceRaw).digest('hex');
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
assert(out.marker === expectedMarker, 'candidate marker mismatch');
assert(out.status === 'candidate_dry_run_only', 'candidate status mismatch');
assert(out.source?.marker === expectedSourceMarker, 'source marker mismatch');
assert(out.source?.sha256 === sourceHash, 'source hash binding mismatch');
assert(out.source?.draft_packet_hash === source.draft_packet_hash, 'source draft hash binding mismatch');
assert(out.source?.readiness_packet_hash === source.source.readiness_packet_hash, 'source readiness hash binding mismatch');
assert(out.source?.source_rollup_hash === source.source.source_rollup_hash, 'source rollup hash binding mismatch');
assert(out.candidate_decision_record?.outcome === 'prepare_manual_operator_decision_record', 'candidate outcome mismatch');
assert(out.candidate_decision_record?.dry_run_only === true, 'candidate dry-run flag missing');
assert(out.candidate_decision_record?.manual_operator_review_required === true, 'manual operator review flag missing');
assert(out.candidate_decision_record?.operator_decision_record_created === false, 'operator decision record must not be created');
assert(out.candidate_decision_record?.operator_decision_signed === false, 'operator decision must not be signed');
assert(out.candidate_decision_record?.operator_decision_final === false, 'operator decision must not be final');
assert(out.candidate_decision_record?.operator_decision_authorized === false, 'operator decision must not be authorized');
assert(out.candidate_decision_record?.approval_execution_authorized === false, 'approval execution must not be authorized');
assert(out.candidate_decision_record?.canonical_ledger_append_ready_for_execution === false, 'canonical ledger append must not be ready for execution');
assert(out.candidate_decision_record?.separate_live_decision_step_required === true, 'separate live decision step flag missing');
assert(Array.isArray(out.candidate_decision_record?.allowed_outcomes), 'allowed outcomes missing');
assert(out.candidate_decision_record.allowed_outcomes.includes('request_changes'), 'request_changes outcome missing');
assert(out.candidate_decision_record.allowed_outcomes.includes('reject_chain'), 'reject_chain outcome missing');
assert(out.candidate_decision_record.allowed_outcomes.includes('prepare_manual_operator_decision_record'), 'prepare manual decision outcome missing');
assert(out.dry_run_guardrails?.no_confirm_phrase_accepted_in_this_lane === true, 'confirm phrase guard missing');
assert(out.dry_run_guardrails?.no_signature_material_requested === true, 'signature material guard missing');
assert(out.dry_run_guardrails?.no_automatic_promotion_to_operator_decision === true, 'automatic promotion guard missing');
assert(out.dry_run_guardrails?.no_execution_authority === true, 'execution authority guard missing');
assert(out.dry_run_guardrails?.no_canonical_ledger_target_path_written === true, 'canonical ledger target path guard missing');
assert(out.checks?.source_hash_bound_green === true, 'missing source hash bound check');
assert(out.checks?.source_draft_packet_hash_bound_green === true, 'missing source draft hash bound check');
assert(out.checks?.valid_candidate_outcome_green === true, 'valid candidate outcome check missing');
assert(out.checks?.no_operator_decision_record_created === true, 'missing no operator decision record created check');
assert(out.checks?.no_operator_signature === true, 'missing no operator signature check');
assert(out.checks?.no_approval_execution === true, 'missing no approval execution check');
assert(out.boundary?.read_only === true, 'read-only boundary missing');
assert(out.boundary?.dry_run_only === true, 'dry-run boundary missing');
assert(out.boundary?.review_artifact_only === true, 'review artifact boundary missing');
assert(out.boundary?.operator_decision_record_candidate_only === true, 'candidate-only boundary missing');
assert(out.boundary?.operator_decision_authorized === false, 'operator decision boundary changed');
assert(out.boundary?.approval_execution_authorized === false, 'approval execution boundary changed');
assert(out.boundary?.canonical_ledger_append_authorized === false, 'canonical ledger append boundary changed');
assert(out.boundary?.wc_issuance_authorized === false, 'WC issuance boundary changed');
assert(out.boundary?.wc_claim_authorized === false, 'WC claim boundary changed');
assert(out.boundary?.wallet_transfer_authorized === false, 'wallet transfer boundary changed');
assert(out.boundary?.mutation_authority === false, 'mutation authority boundary changed');
NODE_BINDING_EOF
echo "operator_decision_record_candidate_dry_run_binding_green=true"

printf '== bad marker rejection ==\n'
cat > "${BAD}" <<JSON
{"marker":"VOID_BAD_MARKER"}
JSON
if node "${TOOL}" --source "${BAD}" --out "${BAD_OUT}" >/tmp/void-bad-operator-decision-record-candidate-dry-run.log 2>&1; then
  cat /tmp/void-bad-operator-decision-record-candidate-dry-run.log
  echo "bad_marker_rejection_failed=true"
  exit 1
fi
echo "bad_marker_rejection_green=true"

printf '== invalid outcome rejection ==\n'
if node "${TOOL}" --source "${SOURCE}" --out "${INVALID_OUT}" --outcome "execute_canonical_ledger_append" >/tmp/void-invalid-operator-decision-record-candidate-dry-run.log 2>&1; then
  cat /tmp/void-invalid-operator-decision-record-candidate-dry-run.log
  echo "invalid_outcome_rejection_failed=true"
  exit 1
fi
echo "invalid_outcome_rejection_green=true"

printf '== not-draft source rejection ==\n'
python3 - "${SOURCE}" "${NOT_DRAFT}" <<'PY_NOT_DRAFT_EOF'
import json, sys
src, out = sys.argv[1:3]
data = json.load(open(src))
data['status'] = 'operator_decision_created'
json.dump(data, open(out, 'w'), indent=2)
PY_NOT_DRAFT_EOF
if node "${TOOL}" --source "${NOT_DRAFT}" --out "${NOT_DRAFT_OUT}" >/tmp/void-not-draft-operator-decision-record-candidate-dry-run.log 2>&1; then
  cat /tmp/void-not-draft-operator-decision-record-candidate-dry-run.log
  echo "not_draft_rejection_failed=true"
  exit 1
fi
echo "not_draft_rejection_green=true"

printf '== signed source rejection ==\n'
python3 - "${SOURCE}" "${SIGNED}" <<'PY_SIGNED_EOF'
import json, sys
src, out = sys.argv[1:3]
data = json.load(open(src))
data['draft']['operator_decision_signed'] = True
json.dump(data, open(out, 'w'), indent=2)
PY_SIGNED_EOF
if node "${TOOL}" --source "${SIGNED}" --out "${SIGNED_OUT}" >/tmp/void-signed-operator-decision-record-candidate-dry-run.log 2>&1; then
  cat /tmp/void-signed-operator-decision-record-candidate-dry-run.log
  echo "signed_rejection_failed=true"
  exit 1
fi
echo "signed_rejection_green=true"

printf '== execution-ready source rejection ==\n'
python3 - "${SOURCE}" "${EXEC_READY}" <<'PY_EXEC_READY_EOF'
import json, sys
src, out = sys.argv[1:3]
data = json.load(open(src))
data['draft']['canonical_ledger_append_ready_for_execution'] = True
json.dump(data, open(out, 'w'), indent=2)
PY_EXEC_READY_EOF
if node "${TOOL}" --source "${EXEC_READY}" --out "${EXEC_READY_OUT}" >/tmp/void-exec-ready-operator-decision-record-candidate-dry-run.log 2>&1; then
  cat /tmp/void-exec-ready-operator-decision-record-candidate-dry-run.log
  echo "execution_ready_rejection_failed=true"
  exit 1
fi
echo "execution_ready_rejection_green=true"

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
  /approval_execution_authorized['"]?\s*:\s*true/i,
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
