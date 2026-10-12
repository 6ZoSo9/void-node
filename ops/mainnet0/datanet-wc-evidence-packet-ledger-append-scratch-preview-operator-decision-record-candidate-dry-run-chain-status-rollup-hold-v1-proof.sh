#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT}"

LANE="datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-decision-record-candidate-dry-run-chain-status-rollup"
MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_RECORD_CANDIDATE_DRY_RUN_CHAIN_STATUS_ROLLUP_HOLD_V1"
SOURCE_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_RECORD_CANDIDATE_DRY_RUN_CLOSEOUT_FINAL_SEAL_INDEX_CLOSEOUT_HOLD_V1"
TOOL="tools/${LANE}.mjs"
DOC="docs/datanet/${LANE}-hold-v1.md"
PROOF="ops/mainnet0/${LANE}-hold-v1-proof.sh"
PREV_PROOF="ops/mainnet0/datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-decision-record-candidate-dry-run-closeout-final-seal-index-closeout-hold-v1-proof.sh"

printf '== tools exist / syntax ==\n'
test -f "${TOOL}"
test -x "${TOOL}"
node --check "${TOOL}"
test -f "${DOC}"
test -f "${PREV_PROOF}"
bash -n "${PREV_PROOF}"
bash -n "${PROOF}"

printf '== operator decision record candidate dry-run closeout final seal index closeout source proof ==\n'
bash "${PREV_PROOF}"

TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT
SOURCE="${TMP}/operator-decision-record-candidate-dry-run-closeout-final-seal-index-closeout.json"
OUT_A="${TMP}/operator-decision-record-candidate-dry-run-chain-status-rollup-a.json"
OUT_B="${TMP}/operator-decision-record-candidate-dry-run-chain-status-rollup-b.json"
BAD="${TMP}/bad-source.json"
BAD_OUT="${TMP}/bad-rollup.json"
CREATED="${TMP}/created-source.json"
CREATED_OUT="${TMP}/created-rollup.json"
SIGNED="${TMP}/signed-source.json"
SIGNED_OUT="${TMP}/signed-rollup.json"
EXEC_READY="${TMP}/exec-ready-source.json"
EXEC_READY_OUT="${TMP}/exec-ready-rollup.json"
AUTH_EXEC="${TMP}/auth-exec-source.json"
AUTH_EXEC_OUT="${TMP}/auth-exec-rollup.json"

printf '== create fixture operator decision record candidate dry-run closeout final seal index closeout ==\n'
cat > "${SOURCE}" <<JSON
{
  "marker": "${SOURCE_MARKER}",
  "status": "closed",
  "closeout_id": "operator-decision-record-candidate-dry-run-closeout-final-seal-index-closeout-fixture-v1",
  "closed_at": "2026-07-03T00:00:00.000Z",
  "closeout_hash": "5e56206e2e8e0c03ccb5f2fca44f4f58b096d8ba2957a7e8cfa0d17c4c99c5b2",
  "source": {
    "marker": "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_RECORD_CANDIDATE_DRY_RUN_CLOSEOUT_FINAL_SEAL_INDEX_HOLD_V1",
    "path_basename": "operator-decision-record-candidate-dry-run-closeout-final-seal-index.json",
    "sha256": "13f9a74e0acf59af0cbd6fb5cd3637088bd9bedcb9742d2791c55bf98849a4a2",
    "canonical_sha256": "fixture-canonical-sha256",
    "final_seal_index_id": "operator-decision-record-candidate-dry-run-closeout-final-seal-index-fixture-v1",
    "final_seal_index_hash": "850c532b34b24c29b9ef980be962980172d36c523cc286bb4a9bcaf7a5ad1464",
    "source_closeout_hash": "b6f0d3651be9d362b3461884f37815ed55577622fd6afbf64dfc554f0a1266de",
    "candidate_dry_run_hash": "3d33944b319642ae2b8b41d0dbb6cf4432a7b843bc10bee9b5e6fd65c93ce98e",
    "draft_packet_hash": "0088a79ec4372824796a5279e6a8003cff49bb0a993949e07ae1d686f442c0f5",
    "readiness_packet_hash": "79b25512f54a37d7ddd96559f7853e02504a4f6d7a2c6df5a216c8eba3a2bcc2",
    "source_rollup_hash": "2466190665899e930a8b9e0cf1614331ccff424e880879c1985a370b7ab87538",
    "candidate_outcome": "prepare_manual_operator_decision_record",
    "status": "indexed"
  },
  "closeout": {
    "source_status": "indexed",
    "final_seal_index_review_closed": true,
    "final_seal_index_closeout_only": true,
    "dry_run_artifact_chain_remains_dry_run_only": true,
    "manual_operator_review_required": true,
    "operator_decision_record_created": false,
    "operator_decision_signed": false,
    "operator_decision_final": false,
    "operator_decision_authorized": false,
    "approval_execution_authorized": false,
    "canonical_ledger_append_ready_for_execution": false,
    "future_live_decision_requires_separate_authorized_record": true
  },
  "closeout_guardrails": {
    "no_confirm_phrase_accepted_in_this_lane": true,
    "no_signature_material_requested": true,
    "no_automatic_promotion_to_operator_decision": true,
    "no_execution_authority": true,
    "no_canonical_ledger_target_path_written": true,
    "future_operator_decision_record_must_bind_this_final_seal_index_closeout_hash": true
  },
  "checks": {
    "source_marker_green": true,
    "source_hash_bound_green": true,
    "final_seal_index_hash_bound_green": true,
    "source_closeout_hash_bound_green": true,
    "source_candidate_dry_run_hash_bound_green": true,
    "source_draft_packet_hash_bound_green": true,
    "source_readiness_packet_hash_bound_green": true,
    "source_rollup_hash_bound_green": true,
    "deterministic_closeout_green": true,
    "public_safe_review_artifact_green": true,
    "manual_operator_review_required": true,
    "no_operator_decision_record_created": true,
    "no_operator_signature": true,
    "no_approval_execution": true,
    "no_canonical_ledger_append": true,
    "no_wc_issuance": true,
    "no_wc_claim": true,
    "no_wallet_transfer": true,
    "no_live_mutation_power": true
  },
  "boundary": {
    "public_safe": true,
    "read_only": true,
    "dry_run_only": true,
    "review_artifact_only": true,
    "final_seal_index_closeout_only": true,
    "operator_decision_record_candidate_closeout_final_seal_index_closeout_only": true,
    "operator_decision_authorized": false,
    "approval_execution_authorized": false,
    "canonical_ledger_append_authorized": false,
    "wc_issuance_authorized": false,
    "wc_claim_authorized": false,
    "wallet_transfer_authorized": false,
    "mutation_authority": false
  }
}
JSON

printf '== operator decision record candidate dry-run chain status rollup ==\n'
node "${TOOL}" --source "${SOURCE}" --out "${OUT_A}" --rollup-at "2026-07-03T00:00:00.000Z" --rollup-id "operator-decision-record-candidate-dry-run-chain-status-rollup-fixture-v1"
node "${TOOL}" --source "${SOURCE}" --out "${OUT_B}" --rollup-at "2026-07-03T00:00:00.000Z" --rollup-id "operator-decision-record-candidate-dry-run-chain-status-rollup-fixture-v1"

printf '== chain status rollup deterministic / binding ==\n'
cmp "${OUT_A}" "${OUT_B}"
echo "operator_decision_record_candidate_dry_run_chain_status_rollup_deterministic_green=true"
node --input-type=module - "${SOURCE}" "${OUT_A}" <<'NODE_BINDING_EOF'
import fs from 'node:fs';
import crypto from 'node:crypto';
const [sourcePath, outPath] = process.argv.slice(2);
const sourceRaw = fs.readFileSync(sourcePath);
const source = JSON.parse(sourceRaw.toString('utf8'));
const out = JSON.parse(fs.readFileSync(outPath, 'utf8'));
const expectedMarker = 'VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_RECORD_CANDIDATE_DRY_RUN_CHAIN_STATUS_ROLLUP_HOLD_V1';
const expectedSourceMarker = 'VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_RECORD_CANDIDATE_DRY_RUN_CLOSEOUT_FINAL_SEAL_INDEX_CLOSEOUT_HOLD_V1';
const sourceHash = crypto.createHash('sha256').update(sourceRaw).digest('hex');
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
assert(out.marker === expectedMarker, 'rollup marker mismatch');
assert(out.status === 'rolled_up', 'rollup status mismatch');
assert(out.source?.marker === expectedSourceMarker, 'source marker mismatch');
assert(out.source?.sha256 === sourceHash, 'source hash binding mismatch');
assert(out.source?.final_seal_index_closeout_hash === source.closeout_hash, 'final seal index closeout hash binding mismatch');
assert(out.source?.final_seal_index_hash === source.source.final_seal_index_hash, 'final seal index hash binding mismatch');
assert(out.source?.candidate_closeout_hash === source.source.source_closeout_hash, 'candidate closeout hash binding mismatch');
assert(out.source?.candidate_dry_run_hash === source.source.candidate_dry_run_hash, 'candidate dry-run hash binding mismatch');
assert(out.source?.draft_packet_hash === source.source.draft_packet_hash, 'draft packet hash binding mismatch');
assert(out.source?.readiness_packet_hash === source.source.readiness_packet_hash, 'readiness packet hash binding mismatch');
assert(out.source?.operator_handoff_chain_status_rollup_hash === source.source.source_rollup_hash, 'operator handoff chain status rollup hash binding mismatch');
assert(out.chain?.operator_decision_record_candidate_dry_run_created === true, 'candidate dry-run created flag missing');
assert(out.chain?.operator_decision_record_candidate_dry_run_closed === true, 'candidate dry-run closed flag missing');
assert(out.chain?.operator_decision_record_candidate_dry_run_closeout_final_seal_indexed === true, 'final seal indexed flag missing');
assert(out.chain?.operator_decision_record_candidate_dry_run_closeout_final_seal_index_closed === true, 'final seal index closed flag missing');
assert(out.chain?.dry_run_candidate_chain_status_consolidated === true, 'chain status consolidated flag missing');
assert(out.chain?.still_requires_separate_live_operator_decision_record === true, 'separate live decision requirement missing');
assert(out.chain?.operator_decision_record_created === false, 'operator decision record was created');
assert(out.chain?.operator_decision_signed === false, 'operator decision signature changed');
assert(out.chain?.approval_execution_authorized === false, 'approval execution changed');
assert(out.chain?.canonical_ledger_append_ready_for_execution === false, 'canonical ledger append became ready');
assert(out.checks?.source_hash_bound_green === true, 'missing source hash bound check');
assert(out.checks?.source_closeout_hash_bound_green === true, 'missing source closeout hash bound check');
assert(out.checks?.source_final_seal_index_hash_bound_green === true, 'missing final seal index hash bound check');
assert(out.checks?.source_candidate_closeout_hash_bound_green === true, 'missing candidate closeout hash bound check');
assert(out.checks?.source_candidate_dry_run_hash_bound_green === true, 'missing candidate dry-run hash bound check');
assert(out.checks?.source_draft_packet_hash_bound_green === true, 'missing draft packet hash bound check');
assert(out.checks?.source_readiness_packet_hash_bound_green === true, 'missing readiness packet hash bound check');
assert(out.checks?.source_operator_handoff_chain_status_rollup_hash_bound_green === true, 'missing operator handoff chain status rollup hash bound check');
assert(out.checks?.no_operator_decision_record_created === true, 'missing no operator decision record check');
assert(out.checks?.no_operator_signature === true, 'missing no operator signature check');
assert(out.checks?.no_approval_execution === true, 'missing no approval execution check');
assert(out.boundary?.read_only === true, 'read-only boundary missing');
assert(out.boundary?.dry_run_only === true, 'dry-run boundary missing');
assert(out.boundary?.review_artifact_only === true, 'review artifact boundary missing');
assert(out.boundary?.chain_status_rollup_only === true, 'chain status rollup boundary missing');
assert(out.boundary?.operator_decision_record_candidate_dry_run_chain_status_rollup_only === true, 'candidate dry-run chain status rollup boundary missing');
assert(out.boundary?.operator_decision_authorized === false, 'operator decision boundary changed');
assert(out.boundary?.approval_execution_authorized === false, 'approval execution boundary changed');
assert(out.boundary?.canonical_ledger_append_authorized === false, 'canonical ledger append boundary changed');
assert(out.boundary?.wc_issuance_authorized === false, 'WC issuance boundary changed');
assert(out.boundary?.wc_claim_authorized === false, 'WC claim boundary changed');
assert(out.boundary?.wallet_transfer_authorized === false, 'wallet transfer boundary changed');
assert(out.boundary?.mutation_authority === false, 'mutation authority boundary changed');
NODE_BINDING_EOF
echo "operator_decision_record_candidate_dry_run_chain_status_rollup_binding_green=true"

printf '== bad marker rejection ==\n'
cat > "${BAD}" <<JSON
{"marker":"VOID_BAD_MARKER"}
JSON
if node "${TOOL}" --source "${BAD}" --out "${BAD_OUT}" >/tmp/void-bad-operator-decision-record-candidate-dry-run-chain-status-rollup.log 2>&1; then
  cat /tmp/void-bad-operator-decision-record-candidate-dry-run-chain-status-rollup.log
  echo "bad_marker_rejection_failed=true"
  exit 1
fi
echo "bad_marker_rejection_green=true"

printf '== created decision source rejection ==\n'
node --input-type=module - "${SOURCE}" "${CREATED}" <<'NODE_MUTATE_CREATED_EOF'
import fs from 'node:fs';
const [sourcePath, outPath] = process.argv.slice(2);
const value = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
value.closeout.operator_decision_record_created = true;
value.checks.no_operator_decision_record_created = false;
value.boundary.operator_decision_authorized = true;
fs.writeFileSync(outPath, `${JSON.stringify(value, null, 2)}\n`);
NODE_MUTATE_CREATED_EOF
if node "${TOOL}" --source "${CREATED}" --out "${CREATED_OUT}" >/tmp/void-created-operator-decision-record-candidate-dry-run-chain-status-rollup.log 2>&1; then
  cat /tmp/void-created-operator-decision-record-candidate-dry-run-chain-status-rollup.log
  echo "created_decision_rejection_failed=true"
  exit 1
fi
echo "created_decision_rejection_green=true"

printf '== signed source rejection ==\n'
node --input-type=module - "${SOURCE}" "${SIGNED}" <<'NODE_MUTATE_SIGNED_EOF'
import fs from 'node:fs';
const [sourcePath, outPath] = process.argv.slice(2);
const value = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
value.closeout.operator_decision_signed = true;
value.checks.no_operator_signature = false;
fs.writeFileSync(outPath, `${JSON.stringify(value, null, 2)}\n`);
NODE_MUTATE_SIGNED_EOF
if node "${TOOL}" --source "${SIGNED}" --out "${SIGNED_OUT}" >/tmp/void-signed-operator-decision-record-candidate-dry-run-chain-status-rollup.log 2>&1; then
  cat /tmp/void-signed-operator-decision-record-candidate-dry-run-chain-status-rollup.log
  echo "signed_rejection_failed=true"
  exit 1
fi
echo "signed_rejection_green=true"

printf '== execution-ready source rejection ==\n'
node --input-type=module - "${SOURCE}" "${EXEC_READY}" <<'NODE_MUTATE_EXEC_READY_EOF'
import fs from 'node:fs';
const [sourcePath, outPath] = process.argv.slice(2);
const value = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
value.closeout.canonical_ledger_append_ready_for_execution = true;
value.boundary.canonical_ledger_append_authorized = true;
fs.writeFileSync(outPath, `${JSON.stringify(value, null, 2)}\n`);
NODE_MUTATE_EXEC_READY_EOF
if node "${TOOL}" --source "${EXEC_READY}" --out "${EXEC_READY_OUT}" >/tmp/void-exec-ready-operator-decision-record-candidate-dry-run-chain-status-rollup.log 2>&1; then
  cat /tmp/void-exec-ready-operator-decision-record-candidate-dry-run-chain-status-rollup.log
  echo "execution_ready_rejection_failed=true"
  exit 1
fi
echo "execution_ready_rejection_green=true"

printf '== approval-execution source rejection ==\n'
node --input-type=module - "${SOURCE}" "${AUTH_EXEC}" <<'NODE_MUTATE_AUTH_EXEC_EOF'
import fs from 'node:fs';
const [sourcePath, outPath] = process.argv.slice(2);
const value = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
value.closeout.approval_execution_authorized = true;
value.checks.no_approval_execution = false;
value.boundary.approval_execution_authorized = true;
fs.writeFileSync(outPath, `${JSON.stringify(value, null, 2)}\n`);
NODE_MUTATE_AUTH_EXEC_EOF
if node "${TOOL}" --source "${AUTH_EXEC}" --out "${AUTH_EXEC_OUT}" >/tmp/void-auth-exec-operator-decision-record-candidate-dry-run-chain-status-rollup.log 2>&1; then
  cat /tmp/void-auth-exec-operator-decision-record-candidate-dry-run-chain-status-rollup.log
  echo "approval_execution_rejection_failed=true"
  exit 1
fi
echo "approval_execution_rejection_green=true"

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
