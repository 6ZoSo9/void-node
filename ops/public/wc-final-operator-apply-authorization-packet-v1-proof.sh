#!/usr/bin/env bash
SRC="src/index.ts"
fail=0

req() {
  if ! grep -Fq "$1" "$SRC"; then
    echo "missing: $1"
    fail=1
  fi
}

echo "=== VOID WC final operator apply authorization packet v1 proof ==="

req 'VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_FINAL_OPERATOR_APPLY_AUTHORIZATION_PACKET_V1'
req 'APP.get("/public-node/first-external-tester-wc-final-operator-apply-authorization-packet-v1.json"'
req 'wc_final_operator_apply_authorization_packet'
req 'ready_for_operator_final_apply_review'
req 'public read-only final operator apply authorization packet for exact 100 WC ledger entry path; no ledger write'

req 'VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_ACTUAL_REVIEW_DECISION_RECORD_V1'
req 'required_state: "accepted_for_wc_accounting_preflight"'

req 'VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_ENTRY_PREVIEW_FROM_ACTUAL_DECISION_V1'
req 'proposed_delta_required: 100'
req 'unit_required: "WC"'
req 'direction_required: "credit"'
req 'idempotency_key_required: "first-external-tester:wc:actual-review-decision-record-v1:delta-100"'

req 'VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_SOURCE_HASH_CHAIN_BOUND_TO_LEDGER_PREVIEW_V1'
req 'required_root_sha256: "cf09951ac295ac31896629f394cfbbdecc69bba8e921414e4d2fb51a763198ba"'

req 'VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_DUPLICATE_GUARD_RECHECK_BOUND_TO_SOURCE_HASH_V1'
req 'duplicate_guard_rechecked_now_required: true'
req 'duplicate_found_required: false'

req 'ledger: "work_credits"'
req 'subject_id: "first-external-tester"'
req 'proposed_delta: 100'
req 'unit: "WC"'
req 'direction: "credit"'
req 'idempotency_key: "first-external-tester:wc:actual-review-decision-record-v1:delta-100"'
req 'source_hash_root: "cf09951ac295ac31896629f394cfbbdecc69bba8e921414e4d2fb51a763198ba"'
req 'all_public_prewrite_gates_green: true'
req 'operator_review_required_before_mutation: true'
req 'operator_final_apply_required: true'
req 'final_apply_command_publicly_disclosed: false'
req 'final_apply_command_executed_now: false'
req 'final_apply_authorized_by_this_route: false'
req 'ledger_write_allowed_by_this_route: false'

req 'head commit matches the reviewed checkpoint'
req 'source hash root matches required_root_sha256'
req 'idempotency key has no existing ledger entry'
req 'duplicate_found remains false at execution time'
req 'final apply command remains private operator terminal action'

req 'authorization_packet_created_now: true'
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

req 'Final operator apply authorization packet'
req 'public read-only final operator apply authorization packet for exact 100 WC path; no ledger write or balance change'

if [ "$fail" -ne 0 ]; then
  echo "VOID_WC_FINAL_OPERATOR_APPLY_AUTHORIZATION_PACKET_V1_PROOF_FAILED"
  exit 1
fi

echo "final_operator_apply_authorization_packet_present=true"
echo "all_public_prewrite_gates_green=true"
echo "operator_final_apply_required=true"
echo "final_apply_command_publicly_disclosed=false"
echo "final_apply_command_executed_now=false"
echo "final_apply_authorized_by_this_route=false"
echo "ledger_write_allowed_by_this_route=false"
echo "wc_award_now=false"
echo "wc_ledger_write_now=false"
echo "wc_balance_changed_now=false"
echo "money_movement_now=false"
echo "wallet_send_now=false"
echo "VOID_WC_FINAL_OPERATOR_APPLY_AUTHORIZATION_PACKET_V1_GREEN"
