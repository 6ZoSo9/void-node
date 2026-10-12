#!/usr/bin/env bash
set -euo pipefail

SRC="src/index.ts"
LEDGER="ops/mainnet0/work-credits-ledger.jsonl"

echo "=== VOID WC first external tester applied receipt status v1 proof ==="

req() {
  grep -Fq "$1" "$SRC" || {
    echo "missing: $1"
    exit 1
  }
}

req 'VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_APPLIED_RECEIPT_STATUS_V1'
req 'APP.get("/public-node/first-external-tester-wc-applied-receipt-status-v1.json"'
req 'public read-only receipt/status proving the first external tester WC ledger entry was privately applied and cross-box verified; no public mutation'
req 'private_final_apply_completed: true'
req 'precision_cross_box_verified: true'
req 'ledger_entry_exists: true'
req 'ledger_entry_count: 1'
req 'matching_final_apply_entry_count: 1'
req 'duplicate_count: 0'
req 'idempotency_key: "first-external-tester:wc:actual-review-decision-record-v1:delta-100"'
req 'source_hash_root: "cf09951ac295ac31896629f394cfbbdecc69bba8e921414e4d2fb51a763198ba"'
req 'delta: 100'
req 'unit: "WC"'
req 'direction: "credit"'
req 'private_final_apply_head: "8a3ae883"'
req 'ckpt-wc-first-external-tester-private-final-apply-v1-local-green-20260619-204133'
req 'ckpt-wc-first-external-tester-private-final-apply-v1-cross-box-green-20260619-204445'
req 'VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_FINAL_APPLY_V1_PRECISION_CROSS_BOX_VERIFY_GREEN'
req 'wc_balance_changed_now: true'
req 'wc_ledger_write_now: true'
req 'wc_credit_delta_applied_now: 100'
req 'void_balance_changed_now: false'
req 'money_movement_now: false'
req 'wallet_send_now: false'
req 'void_transfer_now: false'
req 'wc_to_void_swap_now: false'
req 'buy_void_fulfillment_now: false'
req 'validator_mutation_now: false'
req 'public_route: true'
req 'read_only: true'
req 'public_mutation: false'
req 'exposes_private_ledger_path: false'
req 'exposes_operator_home_path: false'
req 'exposes_shell_command: false'
req 'Applied WC receipt status →'
req 'VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_APPLIED_RECEIPT_STATUS_V1", use: "public read-only receipt/status for first external tester applied WC ledger entry'

python3 <<'PY'
from pathlib import Path
import json

ledger = Path("ops/mainnet0/work-credits-ledger.jsonl")
key = "first-external-tester:wc:actual-review-decision-record-v1:delta-100"
root = "cf09951ac295ac31896629f394cfbbdecc69bba8e921414e4d2fb51a763198ba"

lines = [ln for ln in ledger.read_text().splitlines() if ln.strip()]
matches = [json.loads(ln) for ln in lines if json.loads(ln).get("idempotency_key") == key]

print(f"ledger_entry_count={len(lines)}")
print(f"matching_final_apply_entry_count={len(matches)}")

if len(lines) != 1:
    raise SystemExit("ledger_entry_count_not_exactly_one")
if len(matches) != 1:
    raise SystemExit("matching_entry_count_not_exactly_one")

entry = matches[0]
checks = {
    "delta_valid": entry.get("delta") == 100,
    "unit_valid": entry.get("unit") == "WC",
    "direction_valid": entry.get("direction") == "credit",
    "source_hash_root_valid": entry.get("source_hash_root") == root,
    "entry_payload_sha256_present": bool(entry.get("entry_payload_sha256")),
    "money_movement_false": entry.get("safety", {}).get("money_movement_now") is False,
    "wallet_send_false": entry.get("safety", {}).get("wallet_send_now") is False,
    "void_transfer_false": entry.get("safety", {}).get("void_transfer_now") is False,
    "wc_to_void_swap_false": entry.get("safety", {}).get("wc_to_void_swap_now") is False,
    "validator_mutation_false": entry.get("safety", {}).get("validator_mutation_now") is False,
}
for k, v in checks.items():
    print(f"{k}={str(v).lower()}")
if not all(checks.values()):
    raise SystemExit("ledger_receipt_source_mismatch")

print("VOID_WC_FIRST_EXTERNAL_TESTER_APPLIED_RECEIPT_STATUS_V1_LEDGER_SOURCE_GREEN")
PY

echo "public_route_read_only=true"
echo "wc_applied_receipt_status_present=true"
echo "ledger_entry_count_bound=true"
echo "money_movement_now=false"
echo "wallet_send_now=false"
echo "void_transfer_now=false"
echo "wc_to_void_swap_now=false"
echo "VOID_WC_FIRST_EXTERNAL_TESTER_APPLIED_RECEIPT_STATUS_V1_GREEN"
