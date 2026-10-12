#!/usr/bin/env bash
set -euo pipefail

SRC="src/index.ts"
LEDGER="ops/mainnet0/work-credits-ledger.jsonl"

echo "=== VOID DataNet core contribution receipt index v1 proof ==="

req() {
  grep -Fq "$1" "$SRC" || {
    echo "missing: $1"
    exit 1
  }
}

req 'VOID_DATANET_CORE_CONTRIBUTION_RECEIPT_INDEX_V1'
req 'APP.get("/public-node/datanet/core-contribution-receipt-index-v1.json"'
req 'public read-only index of DataNet contribution receipt surfaces, separated from Work Credit accounting and award decisions'
req 'receipt_evidence_plane: true'
req 'work_credit_accounting_plane: false'
req 'award_decision_plane: false'
req 'settlement_plane: false'
req 'wallet_plane: false'
req 'validator_plane: false'
req 'route_performs_scoring: false'
req 'route_creates_award: false'
req 'route_writes_ledger: false'
req 'contribution_receipt_surface_count: 7'
req 'receipt_candidate_boundary_count: 4'
req 'published-retrieval-receipt-v1'
req 'VOID_DATANET_PUBLISHED_RETRIEVAL_RECEIPT_V1'
req 'challenge-tester-result-receipt-v1'
req 'VOID_DATANET_CHALLENGE_TESTER_RESULT_RECEIPT_V1'
req 'challenge-receipt-intake-status-v1'
req 'VOID_DATANET_CHALLENGE_RECEIPT_INTAKE_STATUS_V1'
req 'challenge-imported-tester-receipt-fixture-v1'
req 'VOID_DATANET_CHALLENGE_IMPORTED_TESTER_RECEIPT_FIXTURE_V1'
req 'core-mirror-registry-v1'
req 'VOID_DATANET_CORE_MIRROR_SERVE_REGISTRY_V1'
req 'core-mirror-receipt-v1'
req 'VOID_DATANET_CORE_MIRROR_SERVE_RECEIPT_V1'
req 'published-dataset-read-route-v1'
req 'VOID_DATANET_PUBLISHED_DATASET_READ_ROUTE_V1'
req 'published-retrieval-wc-candidate-boundary-v1'
req 'automatic_award: false'
req 'approval_recorded_by_this_route: false'
req 'operator_wc_ledger_summary_available: true'
req 'operator_wc_ledger_summary_path: "/public-node/operator-ledger-summary-v1.json"'
req 'wc_ledger_entry_count_observed_before_this_route: 1'
req 'total_wc_issued_observed_before_this_route: 100'
req 'this_route_changes_wc_ledger: false'
req 'public_route: true'
req 'read_only: true'
req 'public_mutation: false'
req 'local_filesystem_write: false'
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
req 'VOID_DATANET_CORE_CONTRIBUTION_RECEIPT_INDEX_V1", use: "public read-only index of DataNet contribution receipt surfaces separated from WC accounting'

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

print("VOID_DATANET_CORE_CONTRIBUTION_RECEIPT_INDEX_V1_WC_LEDGER_UNCHANGED_GREEN")
PY

echo "datanet_receipt_index_present=true"
echo "receipt_evidence_plane=true"
echo "work_credit_accounting_plane=false"
echo "ledger_write=false"
echo "wc_award_now=false"
echo "money_movement_now=false"
echo "wallet_send_now=false"
echo "void_transfer_now=false"
echo "wc_to_void_swap_now=false"
echo "VOID_DATANET_CORE_CONTRIBUTION_RECEIPT_INDEX_V1_GREEN"
