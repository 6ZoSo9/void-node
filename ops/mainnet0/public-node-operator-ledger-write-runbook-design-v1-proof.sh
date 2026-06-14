#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:4100}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

JSON="$TMP/operator-ledger-write-runbook-design-v1.json"

echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DESIGN_PROOF_V1"

grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DESIGN_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DESIGN_UI_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DESIGN_DOC_V1" docs/public/public-node-operator-ledger-write-runbook-design-v1.md

curl -fsS "$BASE_URL/public-node/operator-ledger-write-runbook-design-v1.json" > "$JSON"

jq -e '.marker=="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DESIGN_V1"' "$JSON" >/dev/null
jq -e '.status=="ledger_write_runbook_design_only"' "$JSON" >/dev/null
jq -e '.state=="runbook_not_executable"' "$JSON" >/dev/null
jq -e '.design_only==true' "$JSON" >/dev/null
jq -e '.public_read_only==true' "$JSON" >/dev/null
jq -e '.executable==false' "$JSON" >/dev/null
jq -e '.runbook_exists==false' "$JSON" >/dev/null
jq -e '.runbook_created_now==false' "$JSON" >/dev/null
jq -e '.live_runtime_write==false' "$JSON" >/dev/null
jq -e '.mutation_unlocked==false' "$JSON" >/dev/null
jq -e '.public_mutation_open==false' "$JSON" >/dev/null
jq -e '.public_earning_open==false' "$JSON" >/dev/null
jq -e '.work_execution_open==false' "$JSON" >/dev/null
jq -e '.operator_confirmation_required==true' "$JSON" >/dev/null
jq -e '.operator_confirmation_present==false' "$JSON" >/dev/null
jq -e '.source_hash_chain_required==true' "$JSON" >/dev/null
jq -e '.source_hash_chain_green==false' "$JSON" >/dev/null
jq -e '.duplicate_ledger_entry_check_required==true' "$JSON" >/dev/null
jq -e '.duplicate_ledger_entry_check_green==false' "$JSON" >/dev/null
jq -e '.positive_nonzero_wc_delta_required==true' "$JSON" >/dev/null
jq -e '.positive_nonzero_wc_delta_selected_by_operator==false' "$JSON" >/dev/null
jq -e '.ledger_entry_preview_required==true' "$JSON" >/dev/null
jq -e '.ledger_entry_preview_reviewed==false' "$JSON" >/dev/null
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
jq -e '.validator_mutation_open==false' "$JSON" >/dev/null
jq -e '.money_movement_open==false' "$JSON" >/dev/null
jq -e '.wallet_send==false' "$JSON" >/dev/null
jq -e '.buy_void_fulfillment==false' "$JSON" >/dev/null
jq -e '.automatic_ledger_write_allowed==false' "$JSON" >/dev/null
jq -e '.next_gate=="operator_ledger_write_runbook_scratch_fixture_v1"' "$JSON" >/dev/null

cases="$(jq -r '.runbook_design_cases | length' "$JSON")"
probes="$(jq -r '.mutation_probes | length' "$JSON")"
fail_closed="$(jq -r '[.mutation_probes[] | select(.allowed_now==false)] | length' "$JSON")"

if [ "$cases" != "5" ]; then
  echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DESIGN_CASE_COUNT_RED"
  exit 1
fi

if [ "$probes" != "10" ] || [ "$fail_closed" != "10" ]; then
  echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DESIGN_MUTATION_PROBE_RED"
  exit 1
fi

echo "operator_ledger_write_runbook_design_green=true"
echo "operator_ledger_write_runbook_design_only=true"
echo "operator_ledger_write_runbook_design_state=runbook_not_executable"
echo "operator_ledger_write_runbook_design_executable=false"
echo "operator_ledger_write_runbook_design_runbook_exists=false"
echo "operator_ledger_write_runbook_design_runbook_created_now=false"
echo "operator_ledger_write_runbook_design_live_runtime_write=false"
echo "operator_ledger_write_runbook_design_ready_for_ledger_write=false"
echo "operator_ledger_write_runbook_design_ledger_write_allowed_now=false"
echo "operator_ledger_write_runbook_design_source_hash_chain_green=false"
echo "operator_ledger_write_runbook_design_duplicate_ledger_entry_check_green=false"
echo "operator_ledger_write_runbook_design_positive_nonzero_wc_delta_selected=false"
echo "operator_ledger_write_runbook_design_ledger_record_created_now=false"
echo "operator_ledger_write_runbook_design_wc_ledger_write=false"
echo "operator_ledger_write_runbook_design_wc_ledger_mutated_now=false"
echo "operator_ledger_write_runbook_design_wc_credit_award=false"
echo "operator_ledger_write_runbook_design_wc_credit_delta_now=0"
echo "operator_ledger_write_runbook_design_wc_to_void_swap=false"
echo "operator_ledger_write_runbook_design_cases=$cases"
echo "operator_ledger_write_runbook_design_mutation_probes_checked=$probes"
echo "operator_ledger_write_runbook_design_fail_closed_count=$fail_closed"
echo "operator_ledger_write_runbook_design_next_gate=operator_ledger_write_runbook_scratch_fixture_v1"
echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DESIGN_PROOF_V1_GREEN"
