#!/usr/bin/env bash
set -euo pipefail

LEDGER="ops/mainnet0/work-credits-ledger.jsonl"
SCRIPT="ops/private/wc-first-external-tester-private-final-apply-v1.sh"
SRC="src/index.ts"

echo "=== VOID WC first external tester private final apply v1 proof ==="

python3 <<'PY'
from pathlib import Path
import json, sys

ledger = Path("ops/mainnet0/work-credits-ledger.jsonl")
key = "first-external-tester:wc:actual-review-decision-record-v1:delta-100"
root = "cf09951ac295ac31896629f394cfbbdecc69bba8e921414e4d2fb51a763198ba"

if not ledger.exists():
    print("ledger_exists=false")
    sys.exit(30)

lines = [ln for ln in ledger.read_text().splitlines() if ln.strip()]
matches = []
for n, line in enumerate(lines, 1):
    obj = json.loads(line)
    if obj.get("idempotency_key") == key:
        matches.append((n, obj))

if len(matches) != 1:
    print(f"matching_entry_count={len(matches)}")
    sys.exit(31)

n, obj = matches[0]

checks = {
    "ledger_exists": True,
    "matching_entry_count_is_one": len(matches) == 1,
    "subject_id_valid": obj.get("subject_id") == "first-external-tester",
    "delta_valid": obj.get("delta") == 100,
    "unit_valid": obj.get("unit") == "WC",
    "direction_valid": obj.get("direction") == "credit",
    "source_hash_root_valid": obj.get("source_hash_root") == root,
    "entry_payload_sha256_present": bool(obj.get("entry_payload_sha256")),
    "public_route_false": obj.get("safety", {}).get("public_route") is False,
    "public_mutation_false": obj.get("safety", {}).get("public_mutation") is False,
    "money_movement_false": obj.get("safety", {}).get("money_movement_now") is False,
    "wallet_send_false": obj.get("safety", {}).get("wallet_send_now") is False,
    "void_transfer_false": obj.get("safety", {}).get("void_transfer_now") is False,
    "wc_to_void_swap_false": obj.get("safety", {}).get("wc_to_void_swap_now") is False,
    "validator_mutation_false": obj.get("safety", {}).get("validator_mutation_now") is False,
}

for k, v in checks.items():
    print(f"{k}={str(v).lower()}")

if not all(checks.values()):
    sys.exit(32)

print(f"ledger_entry_line={n}")
print(f"ledger_entry_count={len(lines)}")
print("wc_credit_delta_applied_now=100")
print("ledger_entry_written_now=true")
print("real_ledger_entry_created_now=true")
print("money_movement_now=false")
print("wallet_send_now=false")
print("void_transfer_now=false")
print("wc_to_void_swap_now=false")
print("validator_mutation_now=false")
print("VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_FINAL_APPLY_V1_PROOF_GREEN")
PY

grep -Fq 'VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_FINAL_APPLY_V1_GREEN' "$SCRIPT"
grep -Fq 'duplicate_found_before_apply=false' "$SCRIPT"
grep -Fq 'money_movement_now=false' "$SCRIPT"
grep -Fq 'wallet_send_now=false' "$SCRIPT"

if grep -Fq 'wc-first-external-tester-private-final-apply-v1' "$SRC"; then
  echo "forbidden_public_source_leak=true"
  exit 40
fi

echo "private_apply_script_present=true"
echo "public_source_leak=false"
echo "VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_FINAL_APPLY_V1_SOURCE_PROOF_GREEN"
