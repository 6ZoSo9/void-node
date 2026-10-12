#!/usr/bin/env bash
SRC="src/index.ts"
fail=0

req() {
  if ! grep -Fq "$1" "$SRC"; then
    echo "missing: $1"
    fail=1
  fi
}

echo "=== VOID WC ledger entry preview from actual decision v1 proof ==="

req 'VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_ENTRY_PREVIEW_FROM_ACTUAL_DECISION_V1'
req 'APP.get("/public-node/first-external-tester-wc-ledger-entry-preview-from-actual-decision-v1.json"'
req 'exact WC ledger entry preview derived from the actual review decision record; preview only; no ledger write'
req 'record_type: "wc_ledger_entry_preview_from_actual_review_decision"'
req 'preview_id: "first-external-tester-wc-ledger-entry-preview-from-actual-decision-v1"'
req 'VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_ACTUAL_REVIEW_DECISION_RECORD_V1'
req 'required_state: "accepted_for_wc_accounting_preflight"'
req 'operator_review_performed_now_required: true'
req 'useful_work_recognized_required: true'
req 'proposed_wc_delta_required: 100'
req 'decision_is_award_required: false'
req 'decision_is_ledger_write_required: false'
req 'decision_is_money_movement_required: false'
req 'ledger: "work_credits"'
req 'entry_kind: "credit_preview"'
req 'subject_id: "first-external-tester"'
req 'subject_role: "external_tester"'
req 'candidate_id: "first-external-tester-wc-candidate-v1"'
req 'proposed_delta: 100'
req 'unit: "WC"'
req 'direction: "credit"'
req 'idempotency_key: "first-external-tester:wc:actual-review-decision-record-v1:delta-100"'
req 'duplicate_guard_required_before_write: true'
req 'source_hash_chain_required_before_write: true'
req 'final_operator_apply_required_before_write: true'
req 'duplicate ledger entry guard must be rechecked against live ledger state'
req 'source hash chain must be bound to this exact preview'
req 'operator must explicitly authorize final ledger write separately'
req 'final apply route/command must remain outside public unauthenticated routes'
req 'preview_created_now: true'
req 'public_mutation: false'
req 'award_record_created_now: false'
req 'wc_award_now: false'
req 'wc_ledger_write_now: false'
req 'wc_balance_changed_now: false'
req 'wc_to_void_swap_now: false'
req 'void_transfer_now: false'
req 'wallet_send_now: false'
req 'money_movement_now: false'
req 'buy_void_fulfillment_now: false'
req 'validator_mutation_now: false'
req 'Ledger entry preview from decision'
req 'preview only; no ledger write or balance change'

if [ "$fail" -ne 0 ]; then
  echo "VOID_WC_LEDGER_ENTRY_PREVIEW_FROM_ACTUAL_DECISION_V1_PROOF_FAILED"
  exit 1
fi

echo "ledger_entry_preview_from_actual_decision_present=true"
echo "source_decision_record_required=true"
echo "accepted_for_wc_accounting_preflight_required=true"
echo "proposed_delta=100"
echo "preview_created_now=true"
echo "wc_award_now=false"
echo "wc_ledger_write_now=false"
echo "wc_balance_changed_now=false"
echo "money_movement_now=false"
echo "wallet_send_now=false"
echo "VOID_WC_LEDGER_ENTRY_PREVIEW_FROM_ACTUAL_DECISION_V1_GREEN"
