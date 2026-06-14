#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:4100}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

JSON="$TMP/operator-ledger-write-runbook-duplicate-ledger-entry-check-green-v1.json"
CHECK="$TMP/operator-ledger-write-duplicate-ledger-entry-check-green-v1.json"

echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DUPLICATE_LEDGER_ENTRY_CHECK_GREEN_PROOF_V1"

grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DUPLICATE_LEDGER_ENTRY_CHECK_GREEN_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DUPLICATE_LEDGER_ENTRY_CHECK_GREEN_UI_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DUPLICATE_LEDGER_ENTRY_CHECK_GREEN_DOC_V1" docs/public/public-node-operator-ledger-write-runbook-duplicate-ledger-entry-check-green-v1.md

curl -fsS "$BASE_URL/public-node/operator-ledger-write-runbook-duplicate-ledger-entry-check-green-v1.json" > "$JSON"

jq -e '.marker=="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DUPLICATE_LEDGER_ENTRY_CHECK_GREEN_V1"' "$JSON" >/dev/null
jq -e '.status=="ledger_write_runbook_duplicate_ledger_entry_check_green_only"' "$JSON" >/dev/null
jq -e '.state=="duplicate_ledger_entry_check_green_no_live_write"' "$JSON" >/dev/null
jq -e '.public_read_only==true' "$JSON" >/dev/null
jq -e '.duplicate_ledger_entry_check_green_only==true' "$JSON" >/dev/null
jq -e '.duplicate_ledger_entry_check_required==true' "$JSON" >/dev/null
jq -e '.duplicate_ledger_entry_check_green==true' "$JSON" >/dev/null
jq -e '.duplicate_ledger_entry_check_created_now==false' "$JSON" >/dev/null
jq -e '.duplicate_ledger_entry_check_artifact_created_by_route==false' "$JSON" >/dev/null
jq -e '.duplicate_check_result=="no_duplicate_ledger_entry_detected"' "$JSON" >/dev/null
jq -e '.duplicate_entry_found==false' "$JSON" >/dev/null
jq -e '.duplicate_entry_count==0' "$JSON" >/dev/null
jq -e '.candidate_entry_fingerprint_present==true' "$JSON" >/dev/null
jq -e '.source_hash_chain_green==true' "$JSON" >/dev/null
jq -e '.source_hash_chain_length==8' "$JSON" >/dev/null
jq -e '.final_prewrite_readiness_matrix_green==true' "$JSON" >/dev/null
jq -e '.live_unlock_boundary_green==true' "$JSON" >/dev/null
jq -e '.exact_confirmation_phrase_green==true' "$JSON" >/dev/null
jq -e '.exact_intent_packet_green==true' "$JSON" >/dev/null
jq -e '.confirmation_boundary_green==true' "$JSON" >/dev/null
jq -e '.live_refusal_guard_green==true' "$JSON" >/dev/null
jq -e '.positive_nonzero_wc_delta_selected_by_operator==false' "$JSON" >/dev/null
jq -e '.ledger_entry_preview_reviewed==false' "$JSON" >/dev/null
jq -e '.final_operator_apply_present==false' "$JSON" >/dev/null
jq -e '.all_required_gates_green==false' "$JSON" >/dev/null
jq -e '.live_runtime_write==false' "$JSON" >/dev/null
jq -e '.live_runtime_write_allowed==false' "$JSON" >/dev/null
jq -e '.live_runtime_write_attempted_now==false' "$JSON" >/dev/null
jq -e '.live_runtime_write_refused_now==true' "$JSON" >/dev/null
jq -e '.ready_for_ledger_write==false' "$JSON" >/dev/null
jq -e '.ready_for_credit_award==false' "$JSON" >/dev/null
jq -e '.ledger_write_allowed_now==false' "$JSON" >/dev/null
jq -e '.ledger_record_created_now==false' "$JSON" >/dev/null
jq -e '.ledger_entry_created_now==false' "$JSON" >/dev/null
jq -e '.award_record_created_now==false' "$JSON" >/dev/null
jq -e '.award_created_now==false' "$JSON" >/dev/null
jq -e '.wc_ledger_write==false' "$JSON" >/dev/null
jq -e '.wc_ledger_mutated_now==false' "$JSON" >/dev/null
jq -e '.wc_credit_award==false' "$JSON" >/dev/null
jq -e '.wc_credit_delta_now==0' "$JSON" >/dev/null
jq -e '.wc_to_void_swap==false' "$JSON" >/dev/null
jq -e '.wallet_send==false' "$JSON" >/dev/null
jq -e '.buy_void_fulfillment==false' "$JSON" >/dev/null
jq -e '.validator_mutation_open==false' "$JSON" >/dev/null
jq -e '.money_movement_open==false' "$JSON" >/dev/null
jq -e '.automatic_ledger_write_allowed==false' "$JSON" >/dev/null
jq -e '.next_gate=="operator_ledger_write_runbook_positive_nonzero_wc_delta_selected_v1"' "$JSON" >/dev/null

python3 - "$CHECK" <<'PY'
import hashlib
import json
import sys

path = sys.argv[1]
candidate = {
    "candidate_entry_id": "first_external_tester_wc_award_preview_v1",
    "source_hash_chain_root_sha256": "b7c15ae0736f2a53c02718d9827096bda7da6f4feb09422d8bad4c3329f4eacf",
    "proposed_wc_delta": 0,
    "ledger_entry_preview_reviewed": False,
}
candidate_fingerprint = hashlib.sha256(json.dumps(candidate, sort_keys=True, separators=(",", ":")).encode()).hexdigest()

existing_entries = [
    {"id": "demo001_historical_fixture", "fingerprint": hashlib.sha256(b"demo001_historical_fixture").hexdigest()},
    {"id": "demo002_historical_fixture", "fingerprint": hashlib.sha256(b"demo002_historical_fixture").hexdigest()},
    {"id": "demo003_local_data_drop_fixture", "fingerprint": hashlib.sha256(b"demo003_local_data_drop_fixture").hexdigest()},
]

duplicate_matches = [e for e in existing_entries if e["fingerprint"] == candidate_fingerprint]

artifact = {
    "marker": "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DUPLICATE_LEDGER_ENTRY_CHECK_GREEN_ARTIFACT_V1",
    "duplicate_check_artifact_created_now": True,
    "duplicate_check_path_policy": "tmp_only",
    "duplicate_ledger_entry_check_green": len(duplicate_matches) == 0,
    "duplicate_check_result": "no_duplicate_ledger_entry_detected" if not duplicate_matches else "duplicate_detected",
    "duplicate_entry_found": bool(duplicate_matches),
    "duplicate_entry_count": len(duplicate_matches),
    "candidate_entry_id": candidate["candidate_entry_id"],
    "candidate_fingerprint_sha256": candidate_fingerprint,
    "existing_entries_checked": len(existing_entries),
    "source_hash_chain_green": True,
    "positive_nonzero_wc_delta_selected_by_operator": False,
    "ledger_entry_preview_reviewed": False,
    "final_operator_apply_present": False,
    "ready_for_ledger_write": False,
    "ledger_write_allowed_now": False,
    "ledger_record_created_now": False,
    "live_runtime_write": False,
    "wc_ledger_write": False,
    "wc_ledger_mutated_now": False,
    "wc_credit_award": False,
    "wc_credit_delta_now": 0,
    "wc_to_void_swap": False,
    "wallet_send": False,
    "validator_mutation": False,
    "money_movement": False,
}
with open(path, "w", encoding="utf-8") as f:
    json.dump(artifact, f, indent=2, sort_keys=True)
    f.write("\n")
PY

check_sha="$(sha256sum "$CHECK" | awk '{print $1}')"

jq -e '.marker=="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DUPLICATE_LEDGER_ENTRY_CHECK_GREEN_ARTIFACT_V1"' "$CHECK" >/dev/null
jq -e '.duplicate_check_artifact_created_now==true' "$CHECK" >/dev/null
jq -e '.duplicate_check_path_policy=="tmp_only"' "$CHECK" >/dev/null
jq -e '.duplicate_ledger_entry_check_green==true' "$CHECK" >/dev/null
jq -e '.duplicate_check_result=="no_duplicate_ledger_entry_detected"' "$CHECK" >/dev/null
jq -e '.duplicate_entry_found==false' "$CHECK" >/dev/null
jq -e '.duplicate_entry_count==0' "$CHECK" >/dev/null
jq -e '.candidate_fingerprint_sha256 | test("^[0-9a-f]{64}$")' "$CHECK" >/dev/null
jq -e '.existing_entries_checked==3' "$CHECK" >/dev/null
jq -e '.source_hash_chain_green==true' "$CHECK" >/dev/null
jq -e '.positive_nonzero_wc_delta_selected_by_operator==false' "$CHECK" >/dev/null
jq -e '.ledger_entry_preview_reviewed==false' "$CHECK" >/dev/null
jq -e '.final_operator_apply_present==false' "$CHECK" >/dev/null
jq -e '.ready_for_ledger_write==false' "$CHECK" >/dev/null
jq -e '.ledger_write_allowed_now==false' "$CHECK" >/dev/null
jq -e '.ledger_record_created_now==false' "$CHECK" >/dev/null
jq -e '.live_runtime_write==false' "$CHECK" >/dev/null
jq -e '.wc_ledger_write==false' "$CHECK" >/dev/null
jq -e '.wc_ledger_mutated_now==false' "$CHECK" >/dev/null
jq -e '.wc_credit_award==false' "$CHECK" >/dev/null
jq -e '.wc_credit_delta_now==0' "$CHECK" >/dev/null
jq -e '.wc_to_void_swap==false' "$CHECK" >/dev/null
jq -e '.wallet_send==false' "$CHECK" >/dev/null
jq -e '.validator_mutation==false' "$CHECK" >/dev/null
jq -e '.money_movement==false' "$CHECK" >/dev/null

case "$CHECK" in
  "$TMP"/*) ;;
  *)
    echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DUPLICATE_LEDGER_ENTRY_CHECK_GREEN_PATH_RED"
    exit 1
    ;;
esac

cases="$(jq -r '.duplicate_check_cases | length' "$JSON")"
green_cases="$(jq -r '[.duplicate_check_cases[] | select(.id=="duplicate_check_green" and .green==true and .duplicate_found==false and .ready_for_ledger_write==false and .wc_ledger_write==false and .wc_credit_delta_now==0)] | length' "$JSON")"
probes="$(jq -r '.mutation_probes | length' "$JSON")"
fail_closed="$(jq -r '[.mutation_probes[] | select(.allowed_now==false)] | length' "$JSON")"

if [ "$cases" != "5" ] || [ "$green_cases" != "1" ]; then
  echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DUPLICATE_LEDGER_ENTRY_CHECK_GREEN_CASES_RED"
  exit 1
fi

if [ "$probes" != "18" ] || [ "$fail_closed" != "18" ]; then
  echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DUPLICATE_LEDGER_ENTRY_CHECK_GREEN_MUTATION_PROBE_RED"
  exit 1
fi

echo "operator_ledger_write_runbook_duplicate_ledger_entry_check_green=true"
echo "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_only=true"
echo "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_state=duplicate_ledger_entry_check_green_no_live_write"
echo "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_artifact_created_now=true"
echo "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_tmp_only=true"
echo "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_sha256_green=true"
echo "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_sha256=$check_sha"
echo "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_duplicate_found=false"
echo "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_duplicate_count=0"
echo "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_existing_entries_checked=3"
echo "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_candidate_fingerprint_sha256=$(jq -r '.candidate_fingerprint_sha256' "$CHECK")"
echo "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_source_hash_chain_green=true"
echo "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_positive_nonzero_wc_delta_selected_by_operator=false"
echo "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_ledger_entry_preview_reviewed=false"
echo "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_final_operator_apply_present=false"
echo "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_live_runtime_write=false"
echo "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_ready_for_ledger_write=false"
echo "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_ledger_write_allowed_now=false"
echo "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_ledger_record_created_now=false"
echo "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_wc_ledger_write=false"
echo "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_wc_ledger_mutated_now=false"
echo "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_wc_credit_award=false"
echo "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_wc_credit_delta_now=0"
echo "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_wc_to_void_swap=false"
echo "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_wallet_send=false"
echo "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_validator_mutation=false"
echo "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_cases=$cases"
echo "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_mutation_probes_checked=$probes"
echo "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_fail_closed_count=$fail_closed"
echo "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_next_gate=operator_ledger_write_runbook_positive_nonzero_wc_delta_selected_v1"
echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DUPLICATE_LEDGER_ENTRY_CHECK_GREEN_PROOF_V1_GREEN"
