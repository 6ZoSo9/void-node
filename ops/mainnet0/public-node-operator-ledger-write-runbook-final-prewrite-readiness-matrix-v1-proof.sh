#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:4100}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

JSON="$TMP/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1.json"
MATRIX="$TMP/operator-ledger-write-final-prewrite-readiness-matrix-v1.json"

echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_PREWRITE_READINESS_MATRIX_PROOF_V1"

grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_PREWRITE_READINESS_MATRIX_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_PREWRITE_READINESS_MATRIX_UI_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_PREWRITE_READINESS_MATRIX_DOC_V1" docs/public/public-node-operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1.md

curl -fsS "$BASE_URL/public-node/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1.json" > "$JSON"

jq -e '.marker=="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_PREWRITE_READINESS_MATRIX_V1"' "$JSON" >/dev/null
jq -e '.status=="ledger_write_runbook_final_prewrite_readiness_matrix_only"' "$JSON" >/dev/null
jq -e '.state=="final_prewrite_matrix_blocked_not_ready"' "$JSON" >/dev/null
jq -e '.public_read_only==true' "$JSON" >/dev/null
jq -e '.final_prewrite_readiness_matrix_only==true' "$JSON" >/dev/null
jq -e '.matrix_green==true' "$JSON" >/dev/null
jq -e '.matrix_result=="blocked_not_ready_for_live_ledger_write"' "$JSON" >/dev/null
jq -e '.allowed_to_apply_live_write_now==false' "$JSON" >/dev/null
jq -e '.all_required_gates_green==false' "$JSON" >/dev/null
jq -e '.required_green_gate_count==9' "$JSON" >/dev/null
jq -e '.current_green_gate_count==5' "$JSON" >/dev/null
jq -e '.required_blocking_gate_count==4' "$JSON" >/dev/null
jq -e '.current_blocking_gate_count==4' "$JSON" >/dev/null
jq -e '.live_unlock_boundary_green==true' "$JSON" >/dev/null
jq -e '.explicit_live_write_unlock_present==false' "$JSON" >/dev/null
jq -e '.live_write_unlock_created_now==false' "$JSON" >/dev/null
jq -e '.live_write_unlock_accepted_now==false' "$JSON" >/dev/null
jq -e '.unlock_record_created_now==false' "$JSON" >/dev/null
jq -e '.exact_confirmation_phrase_green==true' "$JSON" >/dev/null
jq -e '.exact_confirmation_phrase_present==false' "$JSON" >/dev/null
jq -e '.exact_confirmation_phrase_accepted_now==false' "$JSON" >/dev/null
jq -e '.exact_intent_packet_green==true' "$JSON" >/dev/null
jq -e '.exact_operator_intent_present==false' "$JSON" >/dev/null
jq -e '.exact_operator_intent_accepted_now==false' "$JSON" >/dev/null
jq -e '.explicit_operator_confirmation_present==false' "$JSON" >/dev/null
jq -e '.confirmation_boundary_green==true' "$JSON" >/dev/null
jq -e '.confirmation_record_created_now==false' "$JSON" >/dev/null
jq -e '.confirmation_unlock_created_now==false' "$JSON" >/dev/null
jq -e '.live_refusal_guard_green==true' "$JSON" >/dev/null
jq -e '.source_hash_chain_green==false' "$JSON" >/dev/null
jq -e '.duplicate_ledger_entry_check_green==false' "$JSON" >/dev/null
jq -e '.positive_nonzero_wc_delta_selected_by_operator==false' "$JSON" >/dev/null
jq -e '.ledger_entry_preview_reviewed==false' "$JSON" >/dev/null
jq -e '.final_operator_apply_present==false' "$JSON" >/dev/null
jq -e '.final_operator_apply_allowed_now==false' "$JSON" >/dev/null
jq -e '.live_runtime_write==false' "$JSON" >/dev/null
jq -e '.live_runtime_write_allowed==false' "$JSON" >/dev/null
jq -e '.live_runtime_write_attempted_now==false' "$JSON" >/dev/null
jq -e '.live_runtime_write_refused_now==true' "$JSON" >/dev/null
jq -e '.executable_live_runbook==false' "$JSON" >/dev/null
jq -e '.mutation_unlocked==false' "$JSON" >/dev/null
jq -e '.ready_for_ledger_write==false' "$JSON" >/dev/null
jq -e '.ready_for_credit_award==false' "$JSON" >/dev/null
jq -e '.ledger_write_allowed_now==false' "$JSON" >/dev/null
jq -e '.ledger_record_created_now==false' "$JSON" >/dev/null
jq -e '.ledger_entry_created_now==false' "$JSON" >/dev/null
jq -e '.award_record_created_now==false' "$JSON" >/dev/null
jq -e '.award_created_now==false' "$JSON" >/dev/null
jq -e '.wc_review_record_write==false' "$JSON" >/dev/null
jq -e '.wc_decision_record_write==false' "$JSON" >/dev/null
jq -e '.wc_award_record_write==false' "$JSON" >/dev/null
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
jq -e '.next_gate=="operator_ledger_write_runbook_source_hash_chain_green_v1"' "$JSON" >/dev/null

gates="$(jq -r '.gates | length' "$JSON")"
blocking="$(jq -r '[.gates[] | select(.blocking==true and .green==false)] | length' "$JSON")"
cases="$(jq -r '.readiness_cases | length' "$JSON")"
refused="$(jq -r '[.readiness_cases[] | select(.ready==false and .refused==true and .live_runtime_write==false and .wc_ledger_write==false and .wc_credit_delta_now==0)] | length' "$JSON")"
probes="$(jq -r '.mutation_probes | length' "$JSON")"
fail_closed="$(jq -r '[.mutation_probes[] | select(.allowed_now==false)] | length' "$JSON")"

if [ "$gates" != "9" ] || [ "$blocking" != "4" ]; then
  echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_PREWRITE_READINESS_MATRIX_GATES_RED"
  exit 1
fi

if [ "$cases" != "9" ] || [ "$refused" != "9" ]; then
  echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_PREWRITE_READINESS_MATRIX_CASES_RED"
  exit 1
fi

if [ "$probes" != "19" ] || [ "$fail_closed" != "19" ]; then
  echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_PREWRITE_READINESS_MATRIX_MUTATION_PROBE_RED"
  exit 1
fi

jq -n \
  --arg marker "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_PREWRITE_READINESS_MATRIX_ARTIFACT_V1" \
  --arg path "$MATRIX" \
  '{
    marker: $marker,
    matrix_artifact_created_now: true,
    matrix_path: $path,
    matrix_path_policy: "tmp_only",
    matrix_result: "blocked_not_ready_for_live_ledger_write",
    allowed_to_apply_live_write_now: false,
    all_required_gates_green: false,
    source_hash_chain_green: false,
    duplicate_ledger_entry_check_green: false,
    positive_nonzero_wc_delta_selected_by_operator: false,
    ledger_entry_preview_reviewed: false,
    final_operator_apply_present: false,
    live_runtime_write: false,
    ledger_write_allowed_now: false,
    ledger_record_created_now: false,
    wc_ledger_write: false,
    wc_ledger_mutated_now: false,
    wc_credit_award: false,
    wc_credit_delta_now: 0,
    wc_to_void_swap: false,
    wallet_send: false,
    validator_mutation: false,
    money_movement: false
  }' > "$MATRIX"

matrix_sha="$(sha256sum "$MATRIX" | awk '{print $1}')"

jq -e '.marker=="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_PREWRITE_READINESS_MATRIX_ARTIFACT_V1"' "$MATRIX" >/dev/null
jq -e '.matrix_artifact_created_now==true' "$MATRIX" >/dev/null
jq -e '.matrix_path_policy=="tmp_only"' "$MATRIX" >/dev/null
jq -e '.matrix_result=="blocked_not_ready_for_live_ledger_write"' "$MATRIX" >/dev/null
jq -e '.allowed_to_apply_live_write_now==false' "$MATRIX" >/dev/null
jq -e '.all_required_gates_green==false' "$MATRIX" >/dev/null
jq -e '.live_runtime_write==false' "$MATRIX" >/dev/null
jq -e '.ledger_write_allowed_now==false' "$MATRIX" >/dev/null
jq -e '.ledger_record_created_now==false' "$MATRIX" >/dev/null
jq -e '.wc_ledger_write==false' "$MATRIX" >/dev/null
jq -e '.wc_ledger_mutated_now==false' "$MATRIX" >/dev/null
jq -e '.wc_credit_award==false' "$MATRIX" >/dev/null
jq -e '.wc_credit_delta_now==0' "$MATRIX" >/dev/null
jq -e '.wc_to_void_swap==false' "$MATRIX" >/dev/null
jq -e '.wallet_send==false' "$MATRIX" >/dev/null
jq -e '.validator_mutation==false' "$MATRIX" >/dev/null
jq -e '.money_movement==false' "$MATRIX" >/dev/null

case "$MATRIX" in
  "$TMP"/*) ;;
  *)
    echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_PREWRITE_READINESS_MATRIX_PATH_RED"
    exit 1
    ;;
esac

echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_green=true"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_only=true"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_state=final_prewrite_matrix_blocked_not_ready"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_result=blocked_not_ready_for_live_ledger_write"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_artifact_created_now=true"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_tmp_only=true"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_sha256_green=true"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_sha256=$matrix_sha"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_allowed_to_apply_live_write_now=false"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_all_required_gates_green=false"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_gates=$gates"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_blocking_gates=$blocking"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_source_hash_chain_green=false"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_duplicate_ledger_entry_check_green=false"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_positive_nonzero_wc_delta_selected_by_operator=false"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_ledger_entry_preview_reviewed=false"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_final_operator_apply_present=false"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_live_runtime_write=false"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_ready_for_ledger_write=false"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_ledger_write_allowed_now=false"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_ledger_record_created_now=false"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_wc_ledger_write=false"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_wc_ledger_mutated_now=false"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_wc_credit_award=false"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_wc_credit_delta_now=0"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_wc_to_void_swap=false"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_wallet_send=false"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_validator_mutation=false"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_readiness_cases=$cases"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_refused_cases=$refused"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_mutation_probes_checked=$probes"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_fail_closed_count=$fail_closed"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_next_gate=operator_ledger_write_runbook_source_hash_chain_green_v1"
echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_PREWRITE_READINESS_MATRIX_PROOF_V1_GREEN"
