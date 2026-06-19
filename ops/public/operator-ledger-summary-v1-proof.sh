#!/usr/bin/env bash
set -euo pipefail

SRC="src/index.ts"
LEDGER="ops/mainnet0/work-credits-ledger.jsonl"

echo "=== VOID operator ledger summary v1 proof ==="

req() {
  grep -Fq "$1" "$SRC" || {
    echo "missing: $1"
    exit 1
  }
}

req 'VOID_PUBLIC_NODE_OPERATOR_LEDGER_SUMMARY_V1'
req 'APP.get("/public-node/operator-ledger-summary-v1.json"'
req 'public read-only summary of operator Work Credit ledger totals after first external tester WC lane closeout; no mutation and no money movement'
req 'ledger_exists: true'
req 'ledger_entry_count: 1'
req 'total_wc_issued: 100'
req 'total_subject_count: 1'
req 'latest_entry_subject_id: "first-external-tester"'
req 'latest_entry_delta: 100'
req 'latest_entry_unit: "WC"'
req 'latest_entry_direction: "credit"'
req 'latest_entry_idempotency_key: "first-external-tester:wc:actual-review-decision-record-v1:delta-100"'
req 'latest_entry_source_hash_root: "cf09951ac295ac31896629f394cfbbdecc69bba8e921414e4d2fb51a763198ba"'
req '"subject_id": "first-external-tester"'
req '"entry_count": 1'
req '"total_wc": 100'
req 'first_external_tester_lane_final_closeout_cross_box_tag: "ckpt-wc-first-external-tester-lane-final-closeout-seal-v1-cross-box-green-20260619-205526"'
req 'public_route: true'
req 'read_only: true'
req 'public_mutation: false'
req 'additional_ledger_write_now: false'
req 'award_record_created_now: false'
req 'wc_award_now: false'
req 'money_movement_now: false'
req 'wallet_send_now: false'
req 'void_transfer_now: false'
req 'wc_to_void_swap_now: false'
req 'buy_void_fulfillment_now: false'
req 'validator_mutation_now: false'
req 'exposes_private_ledger_path: false'
req 'exposes_operator_home_path: false'
req 'exposes_shell_command: false'
req 'Operator WC ledger summary →'
req 'VOID_PUBLIC_NODE_OPERATOR_LEDGER_SUMMARY_V1", use: "public read-only summary of operator Work Credit ledger totals'

python3 <<'PY'
from pathlib import Path
import json

ledger = Path("ops/mainnet0/work-credits-ledger.jsonl")
key = "first-external-tester:wc:actual-review-decision-record-v1:delta-100"
root = "cf09951ac295ac31896629f394cfbbdecc69bba8e921414e4d2fb51a763198ba"

lines = [ln for ln in ledger.read_text().splitlines() if ln.strip()]
entries = [json.loads(ln) for ln in lines]
matches = [obj for obj in entries if obj.get("idempotency_key") == key]
total_wc = sum(int(obj.get("delta", 0)) for obj in entries if obj.get("direction") == "credit" and obj.get("unit") == "WC")

print(f"ledger_entry_count={len(entries)}")
print(f"matching_final_apply_entry_count={len(matches)}")
print(f"total_wc_issued={total_wc}")

if len(entries) != 1:
    raise SystemExit("ledger_entry_count_not_exactly_one")
if len(matches) != 1:
    raise SystemExit("matching_entry_count_not_exactly_one")
if total_wc != 100:
    raise SystemExit("total_wc_issued_not_100")

entry = matches[0]
checks = {
    "subject_id_valid": entry.get("subject_id") == "first-external-tester",
    "delta_valid": entry.get("delta") == 100,
    "unit_valid": entry.get("unit") == "WC",
    "direction_valid": entry.get("direction") == "credit",
    "source_hash_root_valid": entry.get("source_hash_root") == root,
    "money_movement_false": entry.get("safety", {}).get("money_movement_now") is False,
    "wallet_send_false": entry.get("safety", {}).get("wallet_send_now") is False,
    "void_transfer_false": entry.get("safety", {}).get("void_transfer_now") is False,
    "wc_to_void_swap_false": entry.get("safety", {}).get("wc_to_void_swap_now") is False,
    "validator_mutation_false": entry.get("safety", {}).get("validator_mutation_now") is False,
}
for k, v in checks.items():
    print(f"{k}={str(v).lower()}")
if not all(checks.values()):
    raise SystemExit("operator_ledger_summary_source_mismatch")

print("VOID_OPERATOR_LEDGER_SUMMARY_V1_LEDGER_SOURCE_GREEN")
PY

echo "operator_ledger_summary_present=true"
echo "public_route_read_only=true"
echo "ledger_entry_count_bound=true"
echo "total_wc_issued_bound=true"
echo "additional_ledger_write_now=false"
echo "money_movement_now=false"
echo "wallet_send_now=false"
echo "void_transfer_now=false"
echo "wc_to_void_swap_now=false"
echo "VOID_OPERATOR_LEDGER_SUMMARY_V1_GREEN"
