#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT}"

LANE="datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-decision-record-candidate-dry-run-chain-status-rollup-closeout-final-seal-index-closeout"
MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_RECORD_CANDIDATE_DRY_RUN_CHAIN_STATUS_ROLLUP_CLOSEOUT_FINAL_SEAL_INDEX_CLOSEOUT_HOLD_V1"
SOURCE_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_RECORD_CANDIDATE_DRY_RUN_CHAIN_STATUS_ROLLUP_CLOSEOUT_FINAL_SEAL_INDEX_HOLD_V1"
TOOL="tools/${LANE}.mjs"
DOC="docs/datanet/${LANE}-hold-v1.md"
PROOF="ops/mainnet0/${LANE}-hold-v1-proof.sh"
PREV_PROOF="ops/mainnet0/datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-decision-record-candidate-dry-run-chain-status-rollup-closeout-final-seal-index-hold-v1-proof.sh"

printf '== tools exist / syntax ==\n'
test -f "${TOOL}"
test -x "${TOOL}"
node --check "${TOOL}"
test -f "${DOC}"
test -f "${PREV_PROOF}"
bash -n "${PREV_PROOF}"
bash -n "${PROOF}"

printf '== operator decision record candidate dry-run chain status rollup closeout final seal index source proof ==\n'
bash "${PREV_PROOF}"

TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT
SOURCE="${TMP}/operator-decision-record-candidate-dry-run-chain-status-rollup-closeout-final-seal-index.json"
OUT_A="${TMP}/final-seal-index-closeout-a.json"
OUT_B="${TMP}/final-seal-index-closeout-b.json"
BAD="${TMP}/bad-source.json"
BAD_OUT="${TMP}/bad-final-seal-index-closeout.json"
CREATED="${TMP}/created-source.json"
CREATED_OUT="${TMP}/created-final-seal-index-closeout.json"
SIGNED="${TMP}/signed-source.json"
SIGNED_OUT="${TMP}/signed-final-seal-index-closeout.json"
EXEC_READY="${TMP}/exec-ready-source.json"
EXEC_READY_OUT="${TMP}/exec-ready-final-seal-index-closeout.json"
AUTH_EXEC="${TMP}/auth-exec-source.json"
AUTH_EXEC_OUT="${TMP}/auth-exec-final-seal-index-closeout.json"

printf '== create fixture operator decision record candidate dry-run chain status rollup closeout final seal index ==\n'
cat > "${SOURCE}" <<JSON
{
  "marker": "${SOURCE_MARKER}",
  "status": "indexed",
  "final_seal_index_id": "operator-decision-record-candidate-dry-run-chain-status-rollup-closeout-final-seal-index-fixture-v1",
  "sealed_at": "2026-07-03T00:00:00.000Z",
  "source": {
    "marker": "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_RECORD_CANDIDATE_DRY_RUN_CHAIN_STATUS_ROLLUP_CLOSEOUT_HOLD_V1",
    "path_basename": "operator-decision-record-candidate-dry-run-chain-status-rollup-closeout.json",
    "sha256": "92bbcc7a56ab507e07ff4bb196aac7ebf899829150dc965c72fe73bf17d2cce6",
    "canonical_sha256": "fixture-canonical-sha256",
    "closeout_id": "operator-decision-record-candidate-dry-run-chain-status-rollup-closeout-fixture-v1",
    "closeout_hash": "c2e8d10b84968296e8d7cb0c194ca43ab7703bdbf1fb7e39ce2c98a1ec97de6b",
    "rollup_hash": "f5d4133a39febd65e085c71908ce77e941d9bc1f726dbd3f5e13ecdd4963f543",
    "final_seal_index_closeout_hash": "5e56206e2e8e0c03ccb5f2fca44f4f58b096d8ba2957a7e8cfa0d17c4c99c5b2",
    "final_seal_index_hash": "850c532b34b24c29b9ef980be962980172d36c523cc286bb4a9bcaf7a5ad1464",
    "candidate_closeout_hash": "b6f0d3651be9d362b3461884f37815ed55577622fd6afbf64dfc554f0a1266de",
    "candidate_dry_run_hash": "3d33944b319642ae2b8b41d0dbb6cf4432a7b843bc10bee9b5e6fd65c93ce98e",
    "draft_packet_hash": "0088a79ec4372824796a5279e6a8003cff49bb0a993949e07ae1d686f442c0f5",
    "readiness_packet_hash": "79b25512f54a37d7ddd96559f7853e02504a4f6d7a2c6df5a216c8eba3a2bcc2",
    "operator_handoff_chain_status_rollup_hash": "2466190665899e930a8b9e0cf1614331ccff424e880879c1985a370b7ab87538",
    "status": "closed"
  },
  "entries": [
    {
      "kind": "operator_decision_record_candidate_dry_run_chain_status_rollup_closeout",
      "marker": "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_RECORD_CANDIDATE_DRY_RUN_CHAIN_STATUS_ROLLUP_CLOSEOUT_HOLD_V1",
      "sha256": "92bbcc7a56ab507e07ff4bb196aac7ebf899829150dc965c72fe73bf17d2cce6",
      "canonical_sha256": "fixture-canonical-sha256",
      "closeout_hash": "c2e8d10b84968296e8d7cb0c194ca43ab7703bdbf1fb7e39ce2c98a1ec97de6b",
      "rollup_hash": "f5d4133a39febd65e085c71908ce77e941d9bc1f726dbd3f5e13ecdd4963f543",
      "final_seal_index_closeout_hash": "5e56206e2e8e0c03ccb5f2fca44f4f58b096d8ba2957a7e8cfa0d17c4c99c5b2",
      "final_seal_index_hash": "850c532b34b24c29b9ef980be962980172d36c523cc286bb4a9bcaf7a5ad1464",
      "candidate_closeout_hash": "b6f0d3651be9d362b3461884f37815ed55577622fd6afbf64dfc554f0a1266de",
      "candidate_dry_run_hash": "3d33944b319642ae2b8b41d0dbb6cf4432a7b843bc10bee9b5e6fd65c93ce98e",
      "draft_packet_hash": "0088a79ec4372824796a5279e6a8003cff49bb0a993949e07ae1d686f442c0f5",
      "readiness_packet_hash": "79b25512f54a37d7ddd96559f7853e02504a4f6d7a2c6df5a216c8eba3a2bcc2",
      "operator_handoff_chain_status_rollup_hash": "2466190665899e930a8b9e0cf1614331ccff424e880879c1985a370b7ab87538",
      "status": "closed"
    }
  ],
  "index_guardrails": {
    "source_chain_status_rollup_closeout_only": true,
    "no_confirm_phrase_accepted_in_this_lane": true,
    "no_signature_material_requested": true,
    "no_automatic_promotion_to_operator_decision": true,
    "no_execution_authority": true,
    "no_canonical_ledger_target_path_written": true,
    "future_operator_decision_record_must_bind_this_final_seal_index_hash": true
  },
  "checks": {
    "source_marker_green": true,
    "source_hash_bound_green": true,
    "source_closeout_hash_bound_green": true,
    "source_rollup_hash_bound_green": true,
    "source_final_seal_index_closeout_hash_bound_green": true,
    "source_final_seal_index_hash_bound_green": true,
    "source_candidate_closeout_hash_bound_green": true,
    "source_candidate_dry_run_hash_bound_green": true,
    "source_draft_packet_hash_bound_green": true,
    "source_readiness_packet_hash_bound_green": true,
    "source_operator_handoff_chain_status_rollup_hash_bound_green": true,
    "final_seal_index_deterministic_green": true,
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
    "final_seal_index_only": true,
    "operator_decision_record_candidate_dry_run_chain_status_rollup_closeout_final_seal_index_only": true,
    "operator_decision_authorized": false,
    "approval_execution_authorized": false,
    "canonical_ledger_append_authorized": false,
    "wc_issuance_authorized": false,
    "wc_claim_authorized": false,
    "wallet_transfer_authorized": false,
    "mutation_authority": false
  },
  "final_seal_index_hash": "6827eb46f48a1f9e014d0892dea6d7a1f614a45ad658cf166323c1f311482fd0"
}
JSON

printf '== operator decision record candidate dry-run chain status rollup closeout final seal index closeout ==\n'
node "${TOOL}" --source "${SOURCE}" --out "${OUT_A}" --closed-at "2026-07-03T00:00:00.000Z" --closeout-id "operator-decision-record-candidate-dry-run-chain-status-rollup-closeout-final-seal-index-closeout-fixture-v1"
node "${TOOL}" --source "${SOURCE}" --out "${OUT_B}" --closed-at "2026-07-03T00:00:00.000Z" --closeout-id "operator-decision-record-candidate-dry-run-chain-status-rollup-closeout-final-seal-index-closeout-fixture-v1"

printf '== final seal index closeout deterministic / binding ==\n'
cmp "${OUT_A}" "${OUT_B}"
echo "operator_decision_record_candidate_dry_run_chain_status_rollup_closeout_final_seal_index_closeout_deterministic_green=true"
node --input-type=module - "${SOURCE}" "${OUT_A}" <<'NODE_BINDING_EOF'
import fs from 'node:fs';
import crypto from 'node:crypto';
const [sourcePath, outPath] = process.argv.slice(2);
const sourceRaw = fs.readFileSync(sourcePath);
const source = JSON.parse(sourceRaw.toString('utf8'));
const out = JSON.parse(fs.readFileSync(outPath, 'utf8'));
const expectedMarker = 'VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_RECORD_CANDIDATE_DRY_RUN_CHAIN_STATUS_ROLLUP_CLOSEOUT_FINAL_SEAL_INDEX_CLOSEOUT_HOLD_V1';
const expectedSourceMarker = 'VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_DECISION_RECORD_CANDIDATE_DRY_RUN_CHAIN_STATUS_ROLLUP_CLOSEOUT_FINAL_SEAL_INDEX_HOLD_V1';
const sourceHash = crypto.createHash('sha256').update(sourceRaw).digest('hex');
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
assert(out.marker === expectedMarker, 'closeout marker mismatch');
assert(out.status === 'closed', 'closeout status mismatch');
assert(out.source?.marker === expectedSourceMarker, 'source marker mismatch');
assert(out.source?.sha256 === sourceHash, 'source hash binding mismatch');
assert(out.source?.final_seal_index_hash === source.final_seal_index_hash, 'final seal index hash binding mismatch');
assert(out.source?.source_chain_status_rollup_closeout_hash === source.source.closeout_hash, 'source chain status rollup closeout hash binding mismatch');
assert(out.source?.source_candidate_dry_run_hash === source.source.candidate_dry_run_hash, 'candidate dry-run hash binding mismatch');
assert(out.source?.source_draft_packet_hash === source.source.draft_packet_hash, 'draft packet hash binding mismatch');
assert(out.source?.source_readiness_packet_hash === source.source.readiness_packet_hash, 'readiness packet hash binding mismatch');
assert(out.source?.source_rollup_hash === source.source.rollup_hash, 'source rollup hash binding mismatch');
assert(out.source?.source_final_seal_index_closeout_hash === source.source.final_seal_index_closeout_hash, 'source final seal index closeout hash binding mismatch');
assert(out.source?.source_final_seal_index_hash === source.source.final_seal_index_hash, 'source final seal index hash binding mismatch');
assert(out.source?.source_candidate_closeout_hash === source.source.candidate_closeout_hash, 'source candidate closeout hash binding mismatch');
assert(out.source?.source_operator_handoff_chain_status_rollup_hash === source.source.operator_handoff_chain_status_rollup_hash, 'operator handoff chain status rollup hash binding mismatch');
assert(out.closeout?.final_seal_index_review_closed === true, 'review closeout missing');
assert(out.closeout?.final_seal_index_closeout_only === true, 'final seal index closeout only missing');
assert(out.closeout?.operator_decision_record_created === false, 'operator decision record was created');
assert(out.closeout?.operator_decision_signed === false, 'operator decision signed changed');
assert(out.closeout?.approval_execution_authorized === false, 'approval execution changed');
assert(out.closeout_guardrails?.no_signature_material_requested === true, 'signature guard missing');
assert(out.closeout_guardrails?.no_automatic_promotion_to_operator_decision === true, 'automatic promotion guard missing');
assert(out.closeout_guardrails?.no_execution_authority === true, 'execution authority guard missing');
assert(out.checks?.final_seal_index_hash_bound_green === true, 'missing final seal index hash check');
assert(out.checks?.source_chain_status_rollup_closeout_hash_bound_green === true, 'missing chain status rollup closeout hash check');
assert(out.checks?.source_candidate_dry_run_hash_bound_green === true, 'missing candidate dry-run hash check');
assert(out.checks?.source_draft_packet_hash_bound_green === true, 'missing draft packet hash check');
assert(out.checks?.source_readiness_packet_hash_bound_green === true, 'missing readiness packet hash check');
assert(out.checks?.source_rollup_hash_bound_green === true, 'missing source rollup hash check');
assert(out.checks?.source_final_seal_index_closeout_hash_bound_green === true, 'missing source final seal index closeout hash check');
assert(out.checks?.source_final_seal_index_hash_bound_green === true, 'missing source final seal index hash check');
assert(out.checks?.source_candidate_closeout_hash_bound_green === true, 'missing source candidate closeout hash check');
assert(out.checks?.source_operator_handoff_chain_status_rollup_hash_bound_green === true, 'missing operator handoff chain status rollup hash check');
assert(out.checks?.no_operator_decision_record_created === true, 'missing no operator decision record check');
assert(out.checks?.no_operator_signature === true, 'missing no operator signature check');
assert(out.checks?.no_approval_execution === true, 'missing no approval execution check');
assert(out.boundary?.read_only === true, 'read-only boundary missing');
assert(out.boundary?.dry_run_only === true, 'dry-run boundary missing');
assert(out.boundary?.review_artifact_only === true, 'review artifact boundary missing');
assert(out.boundary?.final_seal_index_closeout_only === true, 'final seal index closeout boundary missing');
assert(out.boundary?.operator_decision_record_candidate_dry_run_chain_status_rollup_closeout_final_seal_index_closeout_only === true, 'chain status rollup closeout final seal index closeout boundary missing');
assert(out.boundary?.operator_decision_authorized === false, 'operator decision boundary changed');
assert(out.boundary?.approval_execution_authorized === false, 'approval execution boundary changed');
assert(out.boundary?.canonical_ledger_append_authorized === false, 'canonical ledger append boundary changed');
assert(out.boundary?.wc_issuance_authorized === false, 'WC issuance boundary changed');
assert(out.boundary?.wc_claim_authorized === false, 'WC claim boundary changed');
assert(out.boundary?.wallet_transfer_authorized === false, 'wallet transfer boundary changed');
assert(out.boundary?.mutation_authority === false, 'mutation authority boundary changed');
NODE_BINDING_EOF
echo "operator_decision_record_candidate_dry_run_chain_status_rollup_closeout_final_seal_index_closeout_binding_green=true"

printf '== bad marker rejection ==\n'
cat > "${BAD}" <<JSON
{"marker":"VOID_BAD_MARKER"}
JSON
if node "${TOOL}" --source "${BAD}" --out "${BAD_OUT}" >/tmp/void-bad-operator-decision-record-candidate-dry-run-chain-status-rollup-closeout-final-seal-index-closeout.log 2>&1; then
  cat /tmp/void-bad-operator-decision-record-candidate-dry-run-chain-status-rollup-closeout-final-seal-index-closeout.log
  echo "bad_marker_rejection_failed=true"
  exit 1
fi
echo "bad_marker_rejection_green=true"

printf '== created decision source rejection ==\n'
python3 - "${SOURCE}" "${CREATED}" <<'PY_CREATED_EOF'
import json, sys
src, out = sys.argv[1:3]
data = json.load(open(src))
data['checks']['no_operator_decision_record_created'] = False
json.dump(data, open(out, 'w'), indent=2)
PY_CREATED_EOF
if node "${TOOL}" --source "${CREATED}" --out "${CREATED_OUT}" >/tmp/void-created-operator-decision-record-candidate-dry-run-chain-status-rollup-closeout-final-seal-index-closeout.log 2>&1; then
  cat /tmp/void-created-operator-decision-record-candidate-dry-run-chain-status-rollup-closeout-final-seal-index-closeout.log
  echo "created_decision_rejection_failed=true"
  exit 1
fi
echo "created_decision_rejection_green=true"

printf '== signed source rejection ==\n'
python3 - "${SOURCE}" "${SIGNED}" <<'PY_SIGNED_EOF'
import json, sys
src, out = sys.argv[1:3]
data = json.load(open(src))
data['checks']['no_operator_signature'] = False
json.dump(data, open(out, 'w'), indent=2)
PY_SIGNED_EOF
if node "${TOOL}" --source "${SIGNED}" --out "${SIGNED_OUT}" >/tmp/void-signed-operator-decision-record-candidate-dry-run-chain-status-rollup-closeout-final-seal-index-closeout.log 2>&1; then
  cat /tmp/void-signed-operator-decision-record-candidate-dry-run-chain-status-rollup-closeout-final-seal-index-closeout.log
  echo "signed_rejection_failed=true"
  exit 1
fi
echo "signed_rejection_green=true"

printf '== execution-ready source rejection ==\n'
python3 - "${SOURCE}" "${EXEC_READY}" <<'PY_EXEC_READY_EOF'
import json, sys
src, out = sys.argv[1:3]
data = json.load(open(src))
data['boundary']['canonical_ledger_append_authorized'] = True
json.dump(data, open(out, 'w'), indent=2)
PY_EXEC_READY_EOF
if node "${TOOL}" --source "${EXEC_READY}" --out "${EXEC_READY_OUT}" >/tmp/void-exec-ready-operator-decision-record-candidate-dry-run-chain-status-rollup-closeout-final-seal-index-closeout.log 2>&1; then
  cat /tmp/void-exec-ready-operator-decision-record-candidate-dry-run-chain-status-rollup-closeout-final-seal-index-closeout.log
  echo "execution_ready_rejection_failed=true"
  exit 1
fi
echo "execution_ready_rejection_green=true"

printf '== approval-execution source rejection ==\n'
python3 - "${SOURCE}" "${AUTH_EXEC}" <<'PY_AUTH_EXEC_EOF'
import json, sys
src, out = sys.argv[1:3]
data = json.load(open(src))
data['boundary']['approval_execution_authorized'] = True
json.dump(data, open(out, 'w'), indent=2)
PY_AUTH_EXEC_EOF
if node "${TOOL}" --source "${AUTH_EXEC}" --out "${AUTH_EXEC_OUT}" >/tmp/void-auth-exec-operator-decision-record-candidate-dry-run-chain-status-rollup-closeout-final-seal-index-closeout.log 2>&1; then
  cat /tmp/void-auth-exec-operator-decision-record-candidate-dry-run-chain-status-rollup-closeout-final-seal-index-closeout.log
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
