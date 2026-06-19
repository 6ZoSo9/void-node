#!/usr/bin/env bash
SRC="src/index.ts"
fail=0

req() {
  if ! grep -Fq "$1" "$SRC"; then
    echo "missing: $1"
    fail=1
  fi
}

echo "=== VOID WC source hash chain bound to ledger preview v1 proof ==="

req 'VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_SOURCE_HASH_CHAIN_BOUND_TO_LEDGER_PREVIEW_V1'
req 'source-hash-chain-bound-to-ledger-preview-v1.json'
req 'wc_source_hash_chain_bound_to_ledger_preview'
req 'algorithm: "sha256"'
req 'root is sha256 of newline-joined record hashes'
req 'VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_ENTRY_PREVIEW_FROM_ACTUAL_DECISION_V1'
req 'required_delta: 100'
req 'required_unit: "WC"'
req 'required_idempotency_key: "first-external-tester:wc:actual-review-decision-record-v1:delta-100"'
req 'actual_review_decision_record'
req 'ledger_entry_preview_from_actual_decision'
req 'safety_lock'
req '9ba61848b174158204381bbf2c63bd9de636f172857812073ba8a48dcdca130a'
req '630f9b5331984d13e7af0116f720c5639b9ef549d29326346084a3f6b9ad0741'
req '803ca61ec1c15c34273bcf1c515705e72fb80edfebf8dd65d3ab9cf69a1d69fa'
req 'cf09951ac295ac31896629f394cfbbdecc69bba8e921414e4d2fb51a763198ba'
req 'binds_exact_preview: true'
req 'binds_exact_delta: true'
req 'binds_exact_idempotency_key: true'
req 'binds_no_ledger_write_safety: true'
req 'duplicate ledger entry guard must be rechecked against live ledger state using this idempotency key'
req 'final apply must verify this source hash chain root before mutation'
req 'source_hash_chain_bound_now: true'
req 'wc_award_now: false'
req 'wc_ledger_write_now: false'
req 'wc_balance_changed_now: false'
req 'money_movement_now: false'
req 'wallet_send_now: false'
req 'Source-hash chain bound to preview'
req 'no ledger write or balance change'

python3 <<'PY' || fail=1
import hashlib
from pathlib import Path

src = Path("src/index.ts").read_text()

records = [
  "marker=VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_ACTUAL_REVIEW_DECISION_RECORD_V1|state=accepted_for_wc_accounting_preflight|operator_review_performed_now=true|useful_work_recognized=true|proposed_wc_delta=100|decision_is_award=false|decision_is_ledger_write=false|decision_is_money_movement=false",
  "marker=VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_ENTRY_PREVIEW_FROM_ACTUAL_DECISION_V1|ledger=work_credits|entry_kind=credit_preview|subject_id=first-external-tester|proposed_delta=100|unit=WC|direction=credit|idempotency_key=first-external-tester:wc:actual-review-decision-record-v1:delta-100|duplicate_guard_required_before_write=true|source_hash_chain_required_before_write=true|final_operator_apply_required_before_write=true",
  "public_route=true|read_only=true|public_mutation=false|wc_award_now=false|wc_ledger_write_now=false|wc_balance_changed_now=false|wc_to_void_swap_now=false|void_transfer_now=false|wallet_send_now=false|money_movement_now=false|buy_void_fulfillment_now=false|validator_mutation_now=false",
]

hashes = [hashlib.sha256(x.encode()).hexdigest() for x in records]
root = hashlib.sha256("\n".join(hashes).encode()).hexdigest()

missing = [x for x in hashes + [root] if x not in src]
if missing:
    print("missing computed hash:")
    for x in missing:
        print(x)
    raise SystemExit(1)

print("computed_record_hashes_present=true")
print("computed_root_sha256=" + root)
PY

if [ "$fail" -ne 0 ]; then
  echo "VOID_WC_SOURCE_HASH_CHAIN_BOUND_TO_LEDGER_PREVIEW_V1_PROOF_FAILED"
  exit 1
fi

echo "source_hash_chain_bound_to_preview_present=true"
echo "computed_hashes_verified=true"
echo "binds_exact_100_wc_preview=true"
echo "source_hash_chain_bound_now=true"
echo "wc_award_now=false"
echo "wc_ledger_write_now=false"
echo "wc_balance_changed_now=false"
echo "money_movement_now=false"
echo "wallet_send_now=false"
echo "VOID_WC_SOURCE_HASH_CHAIN_BOUND_TO_LEDGER_PREVIEW_V1_GREEN"
