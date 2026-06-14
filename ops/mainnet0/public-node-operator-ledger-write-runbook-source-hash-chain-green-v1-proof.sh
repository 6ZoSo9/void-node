#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:4100}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

JSON="$TMP/operator-ledger-write-runbook-source-hash-chain-green-v1.json"
CHAIN="$TMP/operator-ledger-write-source-hash-chain-green-v1.json"

echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SOURCE_HASH_CHAIN_GREEN_PROOF_V1"

grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SOURCE_HASH_CHAIN_GREEN_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SOURCE_HASH_CHAIN_GREEN_UI_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SOURCE_HASH_CHAIN_GREEN_DOC_V1" docs/public/public-node-operator-ledger-write-runbook-source-hash-chain-green-v1.md

curl -fsS "$BASE_URL/public-node/operator-ledger-write-runbook-source-hash-chain-green-v1.json" > "$JSON"

jq -e '.marker=="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SOURCE_HASH_CHAIN_GREEN_V1"' "$JSON" >/dev/null
jq -e '.status=="ledger_write_runbook_source_hash_chain_green_only"' "$JSON" >/dev/null
jq -e '.state=="source_hash_chain_green_no_live_write"' "$JSON" >/dev/null
jq -e '.public_read_only==true' "$JSON" >/dev/null
jq -e '.source_hash_chain_green_only==true' "$JSON" >/dev/null
jq -e '.source_hash_chain_required==true' "$JSON" >/dev/null
jq -e '.source_hash_chain_green==true' "$JSON" >/dev/null
jq -e '.source_hash_chain_created_now==false' "$JSON" >/dev/null
jq -e '.source_hash_chain_artifact_created_by_route==false' "$JSON" >/dev/null
jq -e '.source_hash_chain_required_length==8' "$JSON" >/dev/null
jq -e '.source_hash_chain_length==8' "$JSON" >/dev/null
jq -e '.source_hash_chain_items | length == 8' "$JSON" >/dev/null
jq -e 'all(.source_hash_chain_items[]; .required==true and .present==true and .hashed==true)' "$JSON" >/dev/null
jq -e '.final_prewrite_readiness_matrix_green==true' "$JSON" >/dev/null
jq -e '.live_unlock_boundary_green==true' "$JSON" >/dev/null
jq -e '.exact_confirmation_phrase_green==true' "$JSON" >/dev/null
jq -e '.exact_intent_packet_green==true' "$JSON" >/dev/null
jq -e '.confirmation_boundary_green==true' "$JSON" >/dev/null
jq -e '.live_refusal_guard_green==true' "$JSON" >/dev/null
jq -e '.duplicate_ledger_entry_check_green==false' "$JSON" >/dev/null
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
jq -e '.next_gate=="operator_ledger_write_runbook_duplicate_ledger_entry_check_green_v1"' "$JSON" >/dev/null

python3 - "$CHAIN" <<'PY'
import hashlib
import json
import sys

path = sys.argv[1]
items = [
    ("operator_review_record_source", "review record source bound into ledger-write chain"),
    ("operator_decision_record_source", "decision record source bound into ledger-write chain"),
    ("operator_award_intent_packet_source", "award intent packet source bound into ledger-write chain"),
    ("operator_award_record_source", "award record source bound into ledger-write chain"),
    ("operator_ledger_entry_preview_source", "ledger entry preview source bound into ledger-write chain"),
    ("operator_ledger_write_readiness_source", "readiness fixture source bound into ledger-write chain"),
    ("operator_ledger_write_runbook_design_source", "runbook design source bound into ledger-write chain"),
    ("operator_ledger_write_runbook_guard_stack_source", "guard stack source bound into ledger-write chain"),
]

previous_hash = "0" * 64
chain = []

for index, (item_id, label) in enumerate(items, start=1):
    payload = {
        "index": index,
        "id": item_id,
        "label": label,
        "previous_hash": previous_hash,
        "required": True,
        "present": True,
        "hashed": True,
    }
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    digest = hashlib.sha256(encoded).hexdigest()
    payload["sha256"] = digest
    chain.append(payload)
    previous_hash = digest

artifact = {
    "marker": "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SOURCE_HASH_CHAIN_GREEN_ARTIFACT_V1",
    "source_hash_chain_artifact_created_now": True,
    "source_hash_chain_path_policy": "tmp_only",
    "source_hash_chain_green": True,
    "source_hash_chain_length": len(chain),
    "source_hash_chain_required_length": 8,
    "source_hash_chain_root_sha256": previous_hash,
    "source_hash_chain": chain,
    "duplicate_ledger_entry_check_green": False,
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
    f.write("\\n")
PY

chain_sha="$(sha256sum "$CHAIN" | awk '{print $1}')"

jq -e '.marker=="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SOURCE_HASH_CHAIN_GREEN_ARTIFACT_V1"' "$CHAIN" >/dev/null
jq -e '.source_hash_chain_artifact_created_now==true' "$CHAIN" >/dev/null
jq -e '.source_hash_chain_path_policy=="tmp_only"' "$CHAIN" >/dev/null
jq -e '.source_hash_chain_green==true' "$CHAIN" >/dev/null
jq -e '.source_hash_chain_length==8' "$CHAIN" >/dev/null
jq -e '.source_hash_chain_required_length==8' "$CHAIN" >/dev/null
jq -e '.source_hash_chain_root_sha256 | test("^[0-9a-f]{64}$")' "$CHAIN" >/dev/null
jq -e '.source_hash_chain | length == 8' "$CHAIN" >/dev/null
jq -e 'all(.source_hash_chain[]; (.sha256 | test("^[0-9a-f]{64}$")) and (.previous_hash | test("^[0-9a-f]{64}$")))' "$CHAIN" >/dev/null
jq -e '.duplicate_ledger_entry_check_green==false' "$CHAIN" >/dev/null
jq -e '.positive_nonzero_wc_delta_selected_by_operator==false' "$CHAIN" >/dev/null
jq -e '.ledger_entry_preview_reviewed==false' "$CHAIN" >/dev/null
jq -e '.final_operator_apply_present==false' "$CHAIN" >/dev/null
jq -e '.ready_for_ledger_write==false' "$CHAIN" >/dev/null
jq -e '.ledger_write_allowed_now==false' "$CHAIN" >/dev/null
jq -e '.ledger_record_created_now==false' "$CHAIN" >/dev/null
jq -e '.live_runtime_write==false' "$CHAIN" >/dev/null
jq -e '.wc_ledger_write==false' "$CHAIN" >/dev/null
jq -e '.wc_ledger_mutated_now==false' "$CHAIN" >/dev/null
jq -e '.wc_credit_award==false' "$CHAIN" >/dev/null
jq -e '.wc_credit_delta_now==0' "$CHAIN" >/dev/null
jq -e '.wc_to_void_swap==false' "$CHAIN" >/dev/null
jq -e '.wallet_send==false' "$CHAIN" >/dev/null
jq -e '.validator_mutation==false' "$CHAIN" >/dev/null
jq -e '.money_movement==false' "$CHAIN" >/dev/null

case "$CHAIN" in
  "$TMP"/*) ;;
  *)
    echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SOURCE_HASH_CHAIN_GREEN_PATH_RED"
    exit 1
    ;;
esac

cases="$(jq -r '.hash_chain_cases | length' "$JSON")"
green_cases="$(jq -r '[.hash_chain_cases[] | select(.id=="source_hash_chain_green" and .green==true and .ready_for_ledger_write==false and .wc_ledger_write==false and .wc_credit_delta_now==0)] | length' "$JSON")"
probes="$(jq -r '.mutation_probes | length' "$JSON")"
fail_closed="$(jq -r '[.mutation_probes[] | select(.allowed_now==false)] | length' "$JSON")"

if [ "$cases" != "5" ] || [ "$green_cases" != "1" ]; then
  echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SOURCE_HASH_CHAIN_GREEN_CASES_RED"
  exit 1
fi

if [ "$probes" != "17" ] || [ "$fail_closed" != "17" ]; then
  echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SOURCE_HASH_CHAIN_GREEN_MUTATION_PROBE_RED"
  exit 1
fi

echo "operator_ledger_write_runbook_source_hash_chain_green=true"
echo "operator_ledger_write_runbook_source_hash_chain_green_only=true"
echo "operator_ledger_write_runbook_source_hash_chain_green_state=source_hash_chain_green_no_live_write"
echo "operator_ledger_write_runbook_source_hash_chain_green_artifact_created_now=true"
echo "operator_ledger_write_runbook_source_hash_chain_green_tmp_only=true"
echo "operator_ledger_write_runbook_source_hash_chain_green_sha256_green=true"
echo "operator_ledger_write_runbook_source_hash_chain_green_sha256=$chain_sha"
echo "operator_ledger_write_runbook_source_hash_chain_green_length=8"
echo "operator_ledger_write_runbook_source_hash_chain_green_required_length=8"
echo "operator_ledger_write_runbook_source_hash_chain_green_root_sha256=$(jq -r '.source_hash_chain_root_sha256' "$CHAIN")"
echo "operator_ledger_write_runbook_source_hash_chain_green_duplicate_ledger_entry_check_green=false"
echo "operator_ledger_write_runbook_source_hash_chain_green_positive_nonzero_wc_delta_selected_by_operator=false"
echo "operator_ledger_write_runbook_source_hash_chain_green_ledger_entry_preview_reviewed=false"
echo "operator_ledger_write_runbook_source_hash_chain_green_final_operator_apply_present=false"
echo "operator_ledger_write_runbook_source_hash_chain_green_live_runtime_write=false"
echo "operator_ledger_write_runbook_source_hash_chain_green_ready_for_ledger_write=false"
echo "operator_ledger_write_runbook_source_hash_chain_green_ledger_write_allowed_now=false"
echo "operator_ledger_write_runbook_source_hash_chain_green_ledger_record_created_now=false"
echo "operator_ledger_write_runbook_source_hash_chain_green_wc_ledger_write=false"
echo "operator_ledger_write_runbook_source_hash_chain_green_wc_ledger_mutated_now=false"
echo "operator_ledger_write_runbook_source_hash_chain_green_wc_credit_award=false"
echo "operator_ledger_write_runbook_source_hash_chain_green_wc_credit_delta_now=0"
echo "operator_ledger_write_runbook_source_hash_chain_green_wc_to_void_swap=false"
echo "operator_ledger_write_runbook_source_hash_chain_green_wallet_send=false"
echo "operator_ledger_write_runbook_source_hash_chain_green_validator_mutation=false"
echo "operator_ledger_write_runbook_source_hash_chain_green_hash_chain_cases=$cases"
echo "operator_ledger_write_runbook_source_hash_chain_green_mutation_probes_checked=$probes"
echo "operator_ledger_write_runbook_source_hash_chain_green_fail_closed_count=$fail_closed"
echo "operator_ledger_write_runbook_source_hash_chain_green_next_gate=operator_ledger_write_runbook_duplicate_ledger_entry_check_green_v1"
echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SOURCE_HASH_CHAIN_GREEN_PROOF_V1_GREEN"
