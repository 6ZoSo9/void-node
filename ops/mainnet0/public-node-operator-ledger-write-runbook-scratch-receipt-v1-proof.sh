#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:4100}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

JSON="$TMP/operator-ledger-write-runbook-scratch-receipt-v1.json"
CANDIDATE="$TMP/scratch-ledger-write-candidate-v1.json"
RECEIPT="$TMP/scratch-ledger-write-receipt-v1.json"

echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SCRATCH_RECEIPT_PROOF_V1"

grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SCRATCH_RECEIPT_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SCRATCH_RECEIPT_UI_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SCRATCH_RECEIPT_DOC_V1" docs/public/public-node-operator-ledger-write-runbook-scratch-receipt-v1.md

curl -fsS "$BASE_URL/public-node/operator-ledger-write-runbook-scratch-receipt-v1.json" > "$JSON"

jq -e '.marker=="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SCRATCH_RECEIPT_V1"' "$JSON" >/dev/null
jq -e '.status=="ledger_write_runbook_scratch_receipt_only"' "$JSON" >/dev/null
jq -e '.state=="scratch_receipt_no_live_ledger_write"' "$JSON" >/dev/null
jq -e '.public_read_only==true' "$JSON" >/dev/null
jq -e '.scratch_receipt_only==true' "$JSON" >/dev/null
jq -e '.scratch_candidate_required==true' "$JSON" >/dev/null
jq -e '.scratch_candidate_source=="proof_tmp_only"' "$JSON" >/dev/null
jq -e '.scratch_receipt_write_allowed==true' "$JSON" >/dev/null
jq -e '.scratch_receipt_write_path_policy=="tmp_only"' "$JSON" >/dev/null
jq -e '.scratch_receipt_created_by_route==false' "$JSON" >/dev/null
jq -e '.scratch_receipt_hash_created_by_route==false' "$JSON" >/dev/null
jq -e '.live_runtime_write==false' "$JSON" >/dev/null
jq -e '.live_runtime_write_allowed==false' "$JSON" >/dev/null
jq -e '.executable_live_runbook==false' "$JSON" >/dev/null
jq -e '.mutation_unlocked==false' "$JSON" >/dev/null
jq -e '.public_mutation_open==false' "$JSON" >/dev/null
jq -e '.public_earning_open==false' "$JSON" >/dev/null
jq -e '.public_submission_open==false' "$JSON" >/dev/null
jq -e '.work_execution_open==false' "$JSON" >/dev/null
jq -e '.operator_confirmation_present==false' "$JSON" >/dev/null
jq -e '.readiness_snapshot_green==false' "$JSON" >/dev/null
jq -e '.source_hash_chain_green==false' "$JSON" >/dev/null
jq -e '.duplicate_ledger_entry_check_green==false' "$JSON" >/dev/null
jq -e '.positive_nonzero_wc_delta_selected_by_operator==false' "$JSON" >/dev/null
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
jq -e '.wallet_send==false' "$JSON" >/dev/null
jq -e '.buy_void_fulfillment==false' "$JSON" >/dev/null
jq -e '.validator_mutation_open==false' "$JSON" >/dev/null
jq -e '.money_movement_open==false' "$JSON" >/dev/null
jq -e '.automatic_ledger_write_allowed==false' "$JSON" >/dev/null
jq -e '.next_gate=="operator_ledger_write_runbook_live_refusal_guard_v1"' "$JSON" >/dev/null

jq -n \
  --arg marker "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SCRATCH_CANDIDATE_FOR_RECEIPT_V1" \
  --arg path "$CANDIDATE" \
  '{
    marker: $marker,
    scratch_candidate_created_now: true,
    scratch_path: $path,
    scratch_path_policy: "tmp_only",
    proposed_wc_delta: 0,
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
  }' > "$CANDIDATE"

candidate_sha="$(sha256sum "$CANDIDATE" | awk '{print $1}')"

jq -n \
  --arg marker "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SCRATCH_RECEIPT_ARTIFACT_V1" \
  --arg candidate_path "$CANDIDATE" \
  --arg receipt_path "$RECEIPT" \
  --arg candidate_sha256 "$candidate_sha" \
  '{
    marker: $marker,
    scratch_receipt_created_now: true,
    scratch_receipt_path: $receipt_path,
    scratch_receipt_path_policy: "tmp_only",
    candidate_path: $candidate_path,
    candidate_sha256: $candidate_sha256,
    receipt_references_candidate: true,
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
  }' > "$RECEIPT"

jq -e '.marker=="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SCRATCH_RECEIPT_ARTIFACT_V1"' "$RECEIPT" >/dev/null
jq -e '.scratch_receipt_created_now==true' "$RECEIPT" >/dev/null
jq -e '.scratch_receipt_path_policy=="tmp_only"' "$RECEIPT" >/dev/null
jq -e '.receipt_references_candidate==true' "$RECEIPT" >/dev/null
jq -e --arg candidate_sha256 "$candidate_sha" '.candidate_sha256==$candidate_sha256' "$RECEIPT" >/dev/null
jq -e '.live_runtime_write==false' "$RECEIPT" >/dev/null
jq -e '.ledger_write_allowed_now==false' "$RECEIPT" >/dev/null
jq -e '.ledger_record_created_now==false' "$RECEIPT" >/dev/null
jq -e '.wc_ledger_write==false' "$RECEIPT" >/dev/null
jq -e '.wc_ledger_mutated_now==false' "$RECEIPT" >/dev/null
jq -e '.wc_credit_award==false' "$RECEIPT" >/dev/null
jq -e '.wc_credit_delta_now==0' "$RECEIPT" >/dev/null
jq -e '.wc_to_void_swap==false' "$RECEIPT" >/dev/null
jq -e '.wallet_send==false' "$RECEIPT" >/dev/null
jq -e '.validator_mutation==false' "$RECEIPT" >/dev/null
jq -e '.money_movement==false' "$RECEIPT" >/dev/null

case "$CANDIDATE" in "$TMP"/*) ;; *) echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SCRATCH_RECEIPT_CANDIDATE_PATH_RED"; exit 1 ;; esac
case "$RECEIPT" in "$TMP"/*) ;; *) echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SCRATCH_RECEIPT_PATH_RED"; exit 1 ;; esac

probes="$(jq -r '.mutation_probes | length' "$JSON")"
fail_closed="$(jq -r '[.mutation_probes[] | select(.allowed_now==false)] | length' "$JSON")"
checks="$(jq -r '.receipt_checks | length' "$JSON")"

if [ "$checks" != "11" ]; then
  echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SCRATCH_RECEIPT_CHECK_COUNT_RED"
  exit 1
fi

if [ "$probes" != "12" ] || [ "$fail_closed" != "12" ]; then
  echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SCRATCH_RECEIPT_MUTATION_PROBE_RED"
  exit 1
fi

echo "operator_ledger_write_runbook_scratch_receipt_green=true"
echo "operator_ledger_write_runbook_scratch_receipt_only=true"
echo "operator_ledger_write_runbook_scratch_receipt_state=scratch_receipt_no_live_ledger_write"
echo "operator_ledger_write_runbook_scratch_receipt_created_now=true"
echo "operator_ledger_write_runbook_scratch_receipt_tmp_only=true"
echo "operator_ledger_write_runbook_scratch_receipt_candidate_sha256_green=true"
echo "operator_ledger_write_runbook_scratch_receipt_live_runtime_write=false"
echo "operator_ledger_write_runbook_scratch_receipt_ready_for_ledger_write=false"
echo "operator_ledger_write_runbook_scratch_receipt_ledger_write_allowed_now=false"
echo "operator_ledger_write_runbook_scratch_receipt_ledger_record_created_now=false"
echo "operator_ledger_write_runbook_scratch_receipt_wc_ledger_write=false"
echo "operator_ledger_write_runbook_scratch_receipt_wc_ledger_mutated_now=false"
echo "operator_ledger_write_runbook_scratch_receipt_wc_credit_award=false"
echo "operator_ledger_write_runbook_scratch_receipt_wc_credit_delta_now=0"
echo "operator_ledger_write_runbook_scratch_receipt_wc_to_void_swap=false"
echo "operator_ledger_write_runbook_scratch_receipt_wallet_send=false"
echo "operator_ledger_write_runbook_scratch_receipt_validator_mutation=false"
echo "operator_ledger_write_runbook_scratch_receipt_checks=$checks"
echo "operator_ledger_write_runbook_scratch_receipt_mutation_probes_checked=$probes"
echo "operator_ledger_write_runbook_scratch_receipt_fail_closed_count=$fail_closed"
echo "operator_ledger_write_runbook_scratch_receipt_next_gate=operator_ledger_write_runbook_live_refusal_guard_v1"
echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SCRATCH_RECEIPT_PROOF_V1_GREEN"
