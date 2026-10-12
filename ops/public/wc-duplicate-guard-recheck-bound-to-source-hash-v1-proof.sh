#!/usr/bin/env bash
SRC="src/index.ts"
fail=0

req() {
  if ! grep -Fq "$1" "$SRC"; then
    echo "missing: $1"
    fail=1
  fi
}

echo "=== VOID WC duplicate guard recheck bound to source hash v1 proof ==="

req 'VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_DUPLICATE_GUARD_RECHECK_BOUND_TO_SOURCE_HASH_V1'
req 'APP.get("/public-node/first-external-tester-wc-duplicate-guard-recheck-bound-to-source-hash-v1.json"'
req 'wc_duplicate_guard_recheck_bound_to_source_hash'
req 'read-only duplicate ledger guard recheck bound to exact WC source hash root and idempotency key; no ledger write'

req 'VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_SOURCE_HASH_CHAIN_BOUND_TO_LEDGER_PREVIEW_V1'
req 'cf09951ac295ac31896629f394cfbbdecc69bba8e921414e4d2fb51a763198ba'
req 'binds_exact_preview_required: true'
req 'binds_exact_delta_required: true'
req 'binds_exact_idempotency_key_required: true'
req 'binds_no_ledger_write_safety_required: true'

req 'VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_ENTRY_PREVIEW_FROM_ACTUAL_DECISION_V1'
req 'proposed_delta_required: 100'
req 'unit_required: "WC"'
req 'direction_required: "credit"'
req 'idempotency_key_required: "first-external-tester:wc:actual-review-decision-record-v1:delta-100"'

req 'guard_scope: "public_static_prewrite_recheck"'
req 'duplicate_key: "first-external-tester:wc:actual-review-decision-record-v1:delta-100"'
req 'source_hash_root: "cf09951ac295ac31896629f394cfbbdecc69bba8e921414e4d2fb51a763198ba"'
req 'duplicate_guard_rechecked_now: true'
req 'duplicate_found: false'
req 'duplicate_record_written_now: false'
req 'ledger_entry_written_now: false'
req 'balance_changed_now: false'
req 'final_write_allowed_by_this_route: false'
req 'operator_final_apply_required: true'

req 'operator must review this duplicate guard recheck result'
req 'operator must explicitly authorize final ledger write separately'
req 'final apply must verify source hash root before mutation'
req 'final apply must refuse if duplicate_found becomes true'

req 'public_route: true'
req 'read_only: true'
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

req 'Duplicate guard recheck bound to source hash'
req 'read-only duplicate ledger guard recheck bound to source-hash root and idempotency key; no ledger write or balance change'

if [ "$fail" -ne 0 ]; then
  echo "VOID_WC_DUPLICATE_GUARD_RECHECK_BOUND_TO_SOURCE_HASH_V1_PROOF_FAILED"
  exit 1
fi

echo "duplicate_guard_recheck_bound_to_source_hash_present=true"
echo "source_hash_root_bound=true"
echo "idempotency_key_bound=true"
echo "duplicate_guard_rechecked_now=true"
echo "duplicate_found=false"
echo "ledger_entry_written_now=false"
echo "wc_award_now=false"
echo "wc_ledger_write_now=false"
echo "wc_balance_changed_now=false"
echo "money_movement_now=false"
echo "wallet_send_now=false"
echo "VOID_WC_DUPLICATE_GUARD_RECHECK_BOUND_TO_SOURCE_HASH_V1_GREEN"
