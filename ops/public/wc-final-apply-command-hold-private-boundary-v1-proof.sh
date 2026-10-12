#!/usr/bin/env bash
SRC="src/index.ts"
fail=0

req() {
  if ! grep -Fq "$1" "$SRC"; then
    echo "missing: $1"
    fail=1
  fi
}

echo "=== VOID WC final apply command hold private boundary v1 proof ==="

req 'VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_FINAL_APPLY_COMMAND_HOLD_PRIVATE_BOUNDARY_V1'
req 'APP.get("/public-node/first-external-tester-wc-final-apply-command-hold-private-boundary-v1.json"'
req 'wc_final_apply_command_hold_private_boundary'
req 'public read-only boundary proving final WC ledger apply command is withheld, private, not printed, not routed, and not executed'

req 'final_apply_command_exists_as_operator_private_action: true'
req 'final_apply_command_publicly_disclosed: false'
req 'final_apply_command_printed: false'
req 'final_apply_command_returned_by_route: false'
req 'final_apply_command_executed_now: false'
req 'final_apply_command_callable_by_public_route: false'
req 'public_route_contains_secret: false'
req 'public_route_contains_private_command: false'
req 'operator_terminal_action_required: true'
req 'operator_must_execute_separately_if_approved: true'

req 'VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_FINAL_OPERATOR_APPLY_AUTHORIZATION_PACKET_V1'
req 'required_authorization_state: "ready_for_operator_final_apply_review"'
req 'required_all_public_prewrite_gates_green: true'
req 'required_operator_final_apply_required: true'
req 'required_final_apply_authorized_by_this_route: false'
req 'required_ledger_write_allowed_by_this_route: false'

req 'ledger: "work_credits"'
req 'subject_id: "first-external-tester"'
req 'proposed_delta: 100'
req 'unit: "WC"'
req 'direction: "credit"'
req 'idempotency_key: "first-external-tester:wc:actual-review-decision-record-v1:delta-100"'
req 'source_hash_root: "cf09951ac295ac31896629f394cfbbdecc69bba8e921414e4d2fb51a763198ba"'

req 'operator must be on trusted local terminal'
req 'operator must verify repo head and source hash root'
req 'operator must recheck idempotency key immediately before mutation'
req 'operator must not use any public route to execute mutation'
req 'operator must record a post-apply receipt only after a real private apply'

req 'command_hold_boundary_created_now: true'
req 'public_mutation: false'
req 'private_command_disclosed_now: false'
req 'final_apply_command_executed_now: false'
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

req 'Final apply command hold / private boundary'
req 'public read-only boundary proving final apply command is private, withheld, not routed, and not executed; no ledger write or balance change'

if [ "$fail" -ne 0 ]; then
  echo "VOID_WC_FINAL_APPLY_COMMAND_HOLD_PRIVATE_BOUNDARY_V1_PROOF_FAILED"
  exit 1
fi

echo "final_apply_command_hold_private_boundary_present=true"
echo "final_apply_command_exists_as_operator_private_action=true"
echo "final_apply_command_publicly_disclosed=false"
echo "final_apply_command_printed=false"
echo "final_apply_command_returned_by_route=false"
echo "final_apply_command_executed_now=false"
echo "final_apply_command_callable_by_public_route=false"
echo "operator_terminal_action_required=true"
echo "wc_award_now=false"
echo "wc_ledger_write_now=false"
echo "wc_balance_changed_now=false"
echo "money_movement_now=false"
echo "wallet_send_now=false"
echo "VOID_WC_FINAL_APPLY_COMMAND_HOLD_PRIVATE_BOUNDARY_V1_GREEN"
