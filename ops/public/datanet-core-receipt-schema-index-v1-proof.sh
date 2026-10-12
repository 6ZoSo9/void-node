#!/usr/bin/env bash
set -euo pipefail

SRC="src/index.ts"
LEDGER="ops/mainnet0/work-credits-ledger.jsonl"

echo "=== VOID DataNet core receipt schema index v1 proof ==="

req() {
  grep -Fq "$1" "$SRC" || {
    echo "missing: $1"
    exit 1
  }
}

req 'VOID_DATANET_CORE_RECEIPT_SCHEMA_INDEX_V1'
req 'APP.get("/public-node/datanet/core-receipt-schema-index-v1.json"'
req 'public read-only schema/reference index for DataNet receipt types; defines evidence shapes without validating, scoring, awarding, or writing ledgers'
req 'schema_reference_for_receipt_surfaces'
req 'descriptive_reference_only: true'
req 'validates_input_now: false'
req 'accepts_public_submit_now: false'
req 'performs_scoring_now: false'
req 'creates_review_record_now: false'
req 'creates_award_record_now: false'
req 'writes_wc_ledger_now: false'
req 'mutates_datanet_now: false'
req 'settlement_action_now: false'
req 'published_retrieval_receipt'
req 'datanet.published_retrieval_receipt.v1'
req 'VOID_DATANET_PUBLISHED_RETRIEVAL_RECEIPT_V1'
req 'dataset_id'
req 'sha256_verified'
req 'bytes_match_manifest'
req 'challenge_tester_result_receipt'
req 'datanet.challenge_tester_result_receipt.v1'
req 'VOID_DATANET_CHALLENGE_TESTER_RESULT_RECEIPT_V1'
req 'operator_review_required'
req 'challenge_receipt_intake_status'
req 'datanet.challenge_receipt_intake_status.v1'
req 'VOID_DATANET_CHALLENGE_RECEIPT_INTAKE_STATUS_V1'
req 'imported_tester_receipt_fixture'
req 'datanet.imported_tester_receipt_fixture.v1'
req 'VOID_DATANET_CHALLENGE_IMPORTED_TESTER_RECEIPT_FIXTURE_V1'
req 'core_mirror_registry_receipt'
req 'datanet.core_mirror_registry_receipt.v1'
req 'VOID_DATANET_CORE_MIRROR_SERVE_REGISTRY_V1'
req 'core_mirror_serve_receipt'
req 'datanet.core_mirror_serve_receipt.v1'
req 'VOID_DATANET_CORE_MIRROR_SERVE_RECEIPT_V1'
req 'published_dataset_manifest_read_receipt_source'
req 'datanet.published_dataset_manifest_read_receipt_source.v1'
req 'VOID_DATANET_PUBLISHED_DATASET_READ_ROUTE_V1'
req 'forbidden_effects'
req 'ledger_write'
req 'wc_award'
req 'wallet_send'
req 'void_transfer'
req 'public_shell_execution'
req 'review_boundary_schema_notes'
req 'VOID_DATANET_PUBLISHED_RETRIEVAL_WC_CANDIDATE_BOUNDARY_V1'
req 'VOID_DATANET_PUBLISHED_RETRIEVAL_OPERATOR_REVIEW_PACKET_V1'
req 'VOID_DATANET_PUBLISHED_RETRIEVAL_OPERATOR_APPROVAL_DECISION_BOUNDARY_V1'
req 'VOID_DATANET_PUBLISHED_RETRIEVAL_DUPLICATE_GUARD_DECISION_BOUNDARY_V1'
req 'wc_ledger_entry_count_observed_before_this_route: 1'
req 'total_wc_issued_observed_before_this_route: 100'
req 'this_route_changes_wc_ledger: false'
req 'public_route: true'
req 'read_only: true'
req 'public_mutation: false'
req 'local_filesystem_write: false'
req 'validates_or_accepts_public_receipts_now: false'
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
req 'DataNet core receipt schema index →'
req 'VOID_DATANET_CORE_RECEIPT_SCHEMA_INDEX_V1", use: "public read-only schema/reference index for DataNet receipt types'

python3 <<'PY'
from pathlib import Path
import json

ledger = Path("ops/mainnet0/work-credits-ledger.jsonl")
lines = [ln for ln in ledger.read_text().splitlines() if ln.strip()]
entries = [json.loads(ln) for ln in lines]
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

print("VOID_DATANET_CORE_RECEIPT_SCHEMA_INDEX_V1_WC_LEDGER_UNCHANGED_GREEN")
PY

echo "datanet_receipt_schema_index_present=true"
echo "descriptive_reference_only=true"
echo "validates_input_now=false"
echo "creates_award_record_now=false"
echo "ledger_write=false"
echo "wc_award_now=false"
echo "money_movement_now=false"
echo "wallet_send_now=false"
echo "void_transfer_now=false"
echo "wc_to_void_swap_now=false"
echo "VOID_DATANET_CORE_RECEIPT_SCHEMA_INDEX_V1_GREEN"
