#!/usr/bin/env bash
set -euo pipefail

SRC="src/index.ts"
LEDGER="ops/mainnet0/work-credits-ledger.jsonl"

echo "=== VOID DataNet core receipt example pack v1 proof ==="

req() {
  grep -Fq "$1" "$SRC" || {
    echo "missing: $1"
    exit 1
  }
}

req 'VOID_DATANET_CORE_RECEIPT_EXAMPLE_PACK_V1'
req 'APP.get("/public-node/datanet/core-receipt-example-pack-v1.json"'
req 'VOID_DATANET_CORE_RECEIPT_EXAMPLE_PACK_ROUTE_V1'
req 'void_datanet_core_receipt_example_pack_v1'
req 'public read-only example pack for DataNet receipt JSON shapes; examples only'
req 'VOID_DATANET_CORE_RECEIPT_SCHEMA_INDEX_V1'
req 'example_pack_for_schema_reference'

req 'illustrative_only: true'
req 'accepted_as_submission_now: false'
req 'validated_by_route_now: false'
req 'scored_by_route_now: false'
req 'eligible_for_award_by_route_now: false'
req 'writes_ledger_now: false'

req 'example-published-retrieval-receipt-v1'
req 'published_retrieval_receipt'
req 'datanet.published_retrieval_receipt.v1'
req 'VOID_DATANET_PUBLISHED_RETRIEVAL_RECEIPT_V1'
req 'dataset_id: "demo003-folder-fixture-v1"'
req 'sha256_verified: true'
req 'bytes_match_manifest: true'

req 'example-challenge-tester-result-receipt-v1'
req 'challenge_tester_result_receipt'
req 'datanet.challenge_tester_result_receipt.v1'
req 'VOID_DATANET_CHALLENGE_TESTER_RESULT_RECEIPT_V1'
req 'operator_review_required: true'

req 'example-core-mirror-serve-receipt-v1'
req 'core_mirror_serve_receipt'
req 'datanet.core_mirror_serve_receipt.v1'
req 'VOID_DATANET_CORE_MIRROR_SERVE_RECEIPT_V1'
req 'ledger_write_false: true'

req 'forbidden_effects_confirmed_false'
req 'ledger_write'
req 'wc_award'
req 'wallet_send'
req 'void_transfer'
req 'public_shell_execution'
req 'automatic_award'
req 'wc_balance_change'
req 'money_movement'
req 'validator_mutation'
req 'raw_request_path_filesystem_construction'
req 'private_path_disclosure'

req 'wc_ledger_entry_count_observed_before_this_route: 1'
req 'total_wc_issued_observed_before_this_route: 100'
req 'this_route_changes_wc_ledger: false'

req 'public_route: true'
req 'read_only: true'
req 'example_only: true'
req 'public_mutation: false'
req 'local_filesystem_write: false'
req 'accepts_public_submit_now: false'
req 'validates_receipts_now: false'
req 'scores_receipts_now: false'
req 'creates_review_record_now: false'
req 'creates_award_record_now: false'
req 'ledger_write: false'
req 'wc_award_now: false'
req 'wc_balance_change_now: false'
req 'money_movement_now: false'
req 'wallet_send_now: false'
req 'void_transfer_now: false'
req 'wc_to_void_swap_now: false'
req 'validator_mutation_now: false'
req 'public_shell_execution: false'
req 'exposes_private_ledger_path: false'
req 'exposes_operator_home_path: false'
req 'exposes_shell_command: false'

req 'DataNet core receipt example pack →'
req 'VOID_DATANET_CORE_RECEIPT_EXAMPLE_PACK_V1", use: "public read-only example pack for DataNet receipt JSON shapes'

python3 <<'PY'
from pathlib import Path
import json

ledger = Path("ops/mainnet0/work-credits-ledger.jsonl")
entries = [json.loads(ln) for ln in ledger.read_text().splitlines() if ln.strip()]
total_wc = sum(int(obj.get("delta", 0)) for obj in entries if obj.get("unit") == "WC" and obj.get("direction") == "credit")

print(f"wc_ledger_entry_count={len(entries)}")
print(f"total_wc_issued={total_wc}")

if len(entries) != 1:
    raise SystemExit("wc_ledger_entry_count_changed")
if total_wc != 100:
    raise SystemExit("total_wc_issued_changed")

entry = entries[0]
checks = {
    "subject_id_valid": entry.get("subject_id") == "first-external-tester",
    "delta_valid": entry.get("delta") == 100,
    "unit_valid": entry.get("unit") == "WC",
    "direction_valid": entry.get("direction") == "credit",
    "money_movement_false": entry.get("safety", {}).get("money_movement_now") is False,
    "wallet_send_false": entry.get("safety", {}).get("wallet_send_now") is False,
    "void_transfer_false": entry.get("safety", {}).get("void_transfer_now") is False,
    "wc_to_void_swap_false": entry.get("safety", {}).get("wc_to_void_swap_now") is False,
    "validator_mutation_false": entry.get("safety", {}).get("validator_mutation_now") is False,
}
for k, v in checks.items():
    print(f"{k}={str(v).lower()}")
if not all(checks.values()):
    raise SystemExit("wc_ledger_boundary_mismatch")

print("VOID_DATANET_CORE_RECEIPT_EXAMPLE_PACK_V1_WC_LEDGER_UNCHANGED_GREEN")
PY

echo "datanet_receipt_example_pack_present=true"
echo "example_only=true"
echo "accepted_as_submission_now=false"
echo "validates_receipts_now=false"
echo "scores_receipts_now=false"
echo "creates_award_record_now=false"
echo "ledger_write=false"
echo "wc_award_now=false"
echo "money_movement_now=false"
echo "wallet_send_now=false"
echo "void_transfer_now=false"
echo "wc_to_void_swap_now=false"
echo "VOID_DATANET_CORE_RECEIPT_EXAMPLE_PACK_V1_GREEN"
