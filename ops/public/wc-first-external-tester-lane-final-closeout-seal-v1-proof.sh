#!/usr/bin/env bash
set -euo pipefail

SRC="src/index.ts"
LEDGER="ops/mainnet0/work-credits-ledger.jsonl"

echo "=== VOID WC first external tester lane final closeout seal v1 proof ==="

req() {
  grep -Fq "$1" "$SRC" || {
    echo "missing: $1"
    exit 1
  }
}

req 'VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LANE_FINAL_CLOSEOUT_SEAL_V1'
req 'APP.get("/public-node/first-external-tester-wc-lane-final-closeout-seal-v1.json"'
req 'final public read-only closeout seal for first external tester Work Credit lane after private ledger apply and public applied receipt cross-box verification'
req 'closed: true'
req 'completed: true'
req 'useful_work_reviewed: true'
req 'operator_decision_recorded: true'
req 'ledger_entry_previewed: true'
req 'source_hash_chain_bound: true'
req 'duplicate_guard_rechecked: true'
req 'private_final_apply_completed: true'
req 'public_applied_receipt_status_exposed: true'
req 'cross_box_verified: true'
req 'wc_ledger_entry_exists: true'
req 'ledger_entry_count: 1'
req 'matching_final_apply_entry_count: 1'
req 'duplicate_count: 0'
req 'idempotency_key: "first-external-tester:wc:actual-review-decision-record-v1:delta-100"'
req 'source_hash_root: "cf09951ac295ac31896629f394cfbbdecc69bba8e921414e4d2fb51a763198ba"'
req 'delta: 100'
req 'unit: "WC"'
req 'direction: "credit"'
req 'private_final_apply_cross_box_tag: "ckpt-wc-first-external-tester-private-final-apply-v1-cross-box-green-20260619-204445"'
req 'applied_receipt_status_cross_box_tag: "ckpt-wc-first-external-tester-applied-receipt-status-v1-cross-box-green-20260619-204848"'
req 'public_route: true'
req 'read_only: true'
req 'public_mutation: false'
req 'additional_ledger_write_now: false'
req 'duplicate_record_written_now: false'
req 'money_movement_now: false'
req 'wallet_send_now: false'
req 'void_transfer_now: false'
req 'wc_to_void_swap_now: false'
req 'buy_void_fulfillment_now: false'
req 'validator_mutation_now: false'
req 'automatic_future_award_opened: false'
req 'First external tester WC final closeout seal →'
req 'VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LANE_FINAL_CLOSEOUT_SEAL_V1", use: "final public read-only closeout seal for first external tester WC lane'

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
    raise SystemExit("closeout_seal_ledger_source_mismatch")

print("VOID_WC_FIRST_EXTERNAL_TESTER_LANE_FINAL_CLOSEOUT_SEAL_V1_LEDGER_SOURCE_GREEN")
PY

echo "lane_final_closeout_seal_present=true"
echo "public_route_read_only=true"
echo "additional_ledger_write_now=false"
echo "money_movement_now=false"
echo "wallet_send_now=false"
echo "void_transfer_now=false"
echo "wc_to_void_swap_now=false"
echo "VOID_WC_FIRST_EXTERNAL_TESTER_LANE_FINAL_CLOSEOUT_SEAL_V1_GREEN"
