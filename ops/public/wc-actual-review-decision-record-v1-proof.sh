#!/usr/bin/env bash
SRC="src/index.ts"
fail=0

req() {
  if ! grep -Fq "$1" "$SRC"; then
    echo "missing: $1"
    fail=1
  fi
}

echo "=== VOID WC actual review decision record v1 proof ==="

req 'VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_ACTUAL_REVIEW_DECISION_RECORD_V1'
req 'APP.get("/public-node/first-external-tester-wc-actual-review-decision-record-v1.json"'
req 'actual public operator review decision record for first external tester WC candidate'
req 'record_type: "actual_review_decision_record"'
req 'candidate_id: "first-external-tester-wc-candidate-v1"'
req 'state: "accepted_for_wc_accounting_preflight"'
req 'operator_review_performed_now: true'
req 'evidence_sufficient_for_preflight: true'
req 'useful_work_recognized: true'
req 'proposed_wc_delta: 100'
req 'decision_is_award: false'
req 'decision_is_ledger_write: false'
req 'decision_is_money_movement: false'
req 'VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_CANDIDATE_V1'
req 'VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_CHECKLIST_V1'
req 'VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_AWARD_POLICY_V1'
req 'VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_RECORD_STUB_V1'
req 'VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_DECISION_BOUNDARY_V1'
req 'VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_PACKET_V1'
req 'duplicate ledger entry check must remain green'
req 'source hash chain must remain green'
req 'ledger write readiness status must remain green'
req 'explicit operator ledger write allowance must be separate'
req 'final ledger mutation must be an operator-controlled action, not this public route'
req 'review_decision_record_created_now: true'
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
req 'Actual review decision record'
req 'accepted for WC accounting preflight only; no award or ledger write'

if [ "$fail" -ne 0 ]; then
  echo "VOID_WC_ACTUAL_REVIEW_DECISION_RECORD_V1_PROOF_FAILED"
  exit 1
fi

echo "actual_review_decision_record_present=true"
echo "operator_review_performed_now=true"
echo "useful_work_recognized=true"
echo "accepted_for_wc_accounting_preflight=true"
echo "proposed_wc_delta=100"
echo "wc_award_now=false"
echo "wc_ledger_write_now=false"
echo "wc_balance_changed_now=false"
echo "money_movement_now=false"
echo "wallet_send_now=false"
echo "VOID_WC_ACTUAL_REVIEW_DECISION_RECORD_V1_GREEN"
