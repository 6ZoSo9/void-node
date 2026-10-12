#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:4100}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

JSON="$TMP/operator-ledger-write-runbook-confirmation-boundary-v1.json"
BOUNDARY="$TMP/operator-ledger-write-confirmation-boundary-v1.json"

echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_CONFIRMATION_BOUNDARY_PROOF_V1"

grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_CONFIRMATION_BOUNDARY_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_CONFIRMATION_BOUNDARY_UI_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_CONFIRMATION_BOUNDARY_DOC_V1" docs/public/public-node-operator-ledger-write-runbook-confirmation-boundary-v1.md

curl -fsS "$BASE_URL/public-node/operator-ledger-write-runbook-confirmation-boundary-v1.json" > "$JSON"

jq -e '.marker=="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_CONFIRMATION_BOUNDARY_V1"' "$JSON" >/dev/null
jq -e '.status=="ledger_write_runbook_confirmation_boundary_only"' "$JSON" >/dev/null
jq -e '.state=="confirmation_absent_live_write_locked"' "$JSON" >/dev/null
jq -e '.public_read_only==true' "$JSON" >/dev/null
jq -e '.confirmation_boundary_only==true' "$JSON" >/dev/null
jq -e '.confirmation_boundary_green==true' "$JSON" >/dev/null
jq -e '.explicit_operator_confirmation_required==true' "$JSON" >/dev/null
jq -e '.explicit_operator_confirmation_present==false' "$JSON" >/dev/null
jq -e '.exact_operator_intent_required==true' "$JSON" >/dev/null
jq -e '.exact_operator_intent_present==false' "$JSON" >/dev/null
jq -e '.exact_confirmation_phrase_required==true' "$JSON" >/dev/null
jq -e '.exact_confirmation_phrase_present==false' "$JSON" >/dev/null
jq -e '.confirmation_record_created_now==false' "$JSON" >/dev/null
jq -e '.confirmation_record_write==false' "$JSON" >/dev/null
jq -e '.confirmation_unlock_created_now==false' "$JSON" >/dev/null
jq -e '.confirmation_unlock_allowed_now==false' "$JSON" >/dev/null
jq -e '.explicit_live_write_unlock_present==false' "$JSON" >/dev/null
jq -e '.live_refusal_guard_required==true' "$JSON" >/dev/null
jq -e '.live_refusal_guard_green==true' "$JSON" >/dev/null
jq -e '.live_runtime_write==false' "$JSON" >/dev/null
jq -e '.live_runtime_write_allowed==false' "$JSON" >/dev/null
jq -e '.live_runtime_write_attempted_now==false' "$JSON" >/dev/null
jq -e '.live_runtime_write_refused_now==true' "$JSON" >/dev/null
jq -e '.executable_live_runbook==false' "$JSON" >/dev/null
jq -e '.mutation_unlocked==false' "$JSON" >/dev/null
jq -e '.public_mutation_open==false' "$JSON" >/dev/null
jq -e '.public_earning_open==false' "$JSON" >/dev/null
jq -e '.public_submission_open==false' "$JSON" >/dev/null
jq -e '.work_execution_open==false' "$JSON" >/dev/null
jq -e '.readiness_snapshot_green==false' "$JSON" >/dev/null
jq -e '.source_hash_chain_green==false' "$JSON" >/dev/null
jq -e '.duplicate_ledger_entry_check_green==false' "$JSON" >/dev/null
jq -e '.positive_nonzero_wc_delta_selected_by_operator==false' "$JSON" >/dev/null
jq -e '.ledger_entry_preview_reviewed==false' "$JSON" >/dev/null
jq -e '.scratch_fixture_required==true' "$JSON" >/dev/null
jq -e '.scratch_receipt_required==true' "$JSON" >/dev/null
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
jq -e '.next_gate=="operator_ledger_write_runbook_exact_intent_packet_v1"' "$JSON" >/dev/null

cases="$(jq -r '.confirmation_cases | length' "$JSON")"
refused="$(jq -r '[.confirmation_cases[] | select(.accepted==false and .refused==true and .live_runtime_write==false and .wc_ledger_write==false and .wc_credit_delta_now==0)] | length' "$JSON")"
probes="$(jq -r '.mutation_probes | length' "$JSON")"
fail_closed="$(jq -r '[.mutation_probes[] | select(.allowed_now==false)] | length' "$JSON")"

if [ "$cases" != "9" ] || [ "$refused" != "9" ]; then
  echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_CONFIRMATION_BOUNDARY_CASES_RED"
  exit 1
fi

if [ "$probes" != "15" ] || [ "$fail_closed" != "15" ]; then
  echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_CONFIRMATION_BOUNDARY_MUTATION_PROBE_RED"
  exit 1
fi

jq -n \
  --arg marker "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_CONFIRMATION_BOUNDARY_ARTIFACT_V1" \
  --arg path "$BOUNDARY" \
  '{
    marker: $marker,
    boundary_artifact_created_now: true,
    boundary_path: $path,
    boundary_path_policy: "tmp_only",
    explicit_operator_confirmation_present: false,
    exact_operator_intent_present: false,
    exact_confirmation_phrase_present: false,
    confirmation_record_created_now: false,
    confirmation_unlock_created_now: false,
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
  }' > "$BOUNDARY"

jq -e '.marker=="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_CONFIRMATION_BOUNDARY_ARTIFACT_V1"' "$BOUNDARY" >/dev/null
jq -e '.boundary_artifact_created_now==true' "$BOUNDARY" >/dev/null
jq -e '.boundary_path_policy=="tmp_only"' "$BOUNDARY" >/dev/null
jq -e '.explicit_operator_confirmation_present==false' "$BOUNDARY" >/dev/null
jq -e '.exact_operator_intent_present==false' "$BOUNDARY" >/dev/null
jq -e '.exact_confirmation_phrase_present==false' "$BOUNDARY" >/dev/null
jq -e '.confirmation_record_created_now==false' "$BOUNDARY" >/dev/null
jq -e '.confirmation_unlock_created_now==false' "$BOUNDARY" >/dev/null
jq -e '.live_runtime_write==false' "$BOUNDARY" >/dev/null
jq -e '.ledger_write_allowed_now==false' "$BOUNDARY" >/dev/null
jq -e '.ledger_record_created_now==false' "$BOUNDARY" >/dev/null
jq -e '.wc_ledger_write==false' "$BOUNDARY" >/dev/null
jq -e '.wc_ledger_mutated_now==false' "$BOUNDARY" >/dev/null
jq -e '.wc_credit_award==false' "$BOUNDARY" >/dev/null
jq -e '.wc_credit_delta_now==0' "$BOUNDARY" >/dev/null
jq -e '.wc_to_void_swap==false' "$BOUNDARY" >/dev/null
jq -e '.wallet_send==false' "$BOUNDARY" >/dev/null
jq -e '.validator_mutation==false' "$BOUNDARY" >/dev/null
jq -e '.money_movement==false' "$BOUNDARY" >/dev/null

case "$BOUNDARY" in
  "$TMP"/*) ;;
  *)
    echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_CONFIRMATION_BOUNDARY_PATH_RED"
    exit 1
    ;;
esac

echo "operator_ledger_write_runbook_confirmation_boundary_green=true"
echo "operator_ledger_write_runbook_confirmation_boundary_only=true"
echo "operator_ledger_write_runbook_confirmation_boundary_state=confirmation_absent_live_write_locked"
echo "operator_ledger_write_runbook_confirmation_boundary_artifact_created_now=true"
echo "operator_ledger_write_runbook_confirmation_boundary_tmp_only=true"
echo "operator_ledger_write_runbook_confirmation_boundary_explicit_operator_confirmation_present=false"
echo "operator_ledger_write_runbook_confirmation_boundary_exact_operator_intent_present=false"
echo "operator_ledger_write_runbook_confirmation_boundary_exact_confirmation_phrase_present=false"
echo "operator_ledger_write_runbook_confirmation_boundary_confirmation_record_created_now=false"
echo "operator_ledger_write_runbook_confirmation_boundary_confirmation_unlock_created_now=false"
echo "operator_ledger_write_runbook_confirmation_boundary_live_runtime_write=false"
echo "operator_ledger_write_runbook_confirmation_boundary_ready_for_ledger_write=false"
echo "operator_ledger_write_runbook_confirmation_boundary_ledger_write_allowed_now=false"
echo "operator_ledger_write_runbook_confirmation_boundary_ledger_record_created_now=false"
echo "operator_ledger_write_runbook_confirmation_boundary_wc_ledger_write=false"
echo "operator_ledger_write_runbook_confirmation_boundary_wc_ledger_mutated_now=false"
echo "operator_ledger_write_runbook_confirmation_boundary_wc_credit_award=false"
echo "operator_ledger_write_runbook_confirmation_boundary_wc_credit_delta_now=0"
echo "operator_ledger_write_runbook_confirmation_boundary_wc_to_void_swap=false"
echo "operator_ledger_write_runbook_confirmation_boundary_wallet_send=false"
echo "operator_ledger_write_runbook_confirmation_boundary_validator_mutation=false"
echo "operator_ledger_write_runbook_confirmation_boundary_confirmation_cases=$cases"
echo "operator_ledger_write_runbook_confirmation_boundary_refused_cases=$refused"
echo "operator_ledger_write_runbook_confirmation_boundary_mutation_probes_checked=$probes"
echo "operator_ledger_write_runbook_confirmation_boundary_fail_closed_count=$fail_closed"
echo "operator_ledger_write_runbook_confirmation_boundary_next_gate=operator_ledger_write_runbook_exact_intent_packet_v1"
echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_CONFIRMATION_BOUNDARY_PROOF_V1_GREEN"
