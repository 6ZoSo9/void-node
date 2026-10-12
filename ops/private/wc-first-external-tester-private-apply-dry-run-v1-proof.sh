#!/usr/bin/env bash
set -euo pipefail

SCRIPT="ops/private/wc-first-external-tester-private-apply-dry-run-v1.sh"
SRC="src/index.ts"
LEDGER="ops/mainnet0/work-credits-ledger.jsonl"
KEY="first-external-tester:wc:actual-review-decision-record-v1:delta-100"
ROOT="cf09951ac295ac31896629f394cfbbdecc69bba8e921414e4d2fb51a763198ba"

fail=0

req_script() {
  if ! grep -Fq "$1" "$SCRIPT"; then
    echo "missing_script: $1"
    fail=1
  fi
}

req_absent_script() {
  if grep -Fq "$1" "$SCRIPT"; then
    echo "forbidden_script: $1"
    fail=1
  fi
}

req_absent_src() {
  if grep -Fq "$1" "$SRC"; then
    echo "forbidden_public_source: $1"
    fail=1
  fi
}

req_out() {
  local file="$1"
  local needle="$2"
  if ! grep -Fq "$needle" "$file"; then
    echo "missing_output: $needle"
    fail=1
  fi
}

echo "=== VOID WC first external tester private apply dry run v1 proof ==="

req_script 'VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_APPLY_DRY_RUN_V1'
req_script 'dry_run_only=true'
req_script 'public_route=false'
req_script 'no_public_route=true'
req_script 'real_ledger_unchanged='
req_script 'ledger_entry_written_now=false'
req_script 'real_ledger_entry_created_now=false'
req_script 'wc_award_now=false'
req_script 'wc_ledger_write_now=false'
req_script 'wc_balance_changed_now=false'
req_script 'money_movement_now=false'
req_script 'wallet_send_now=false'
req_script 'mutation_performed=false'
req_script "$KEY"
req_script "$ROOT"

req_absent_script 'APP.get('
req_absent_script 'res.json'
req_absent_script 'git push'
req_absent_script 'curl '
req_absent_script '>> "$LEDGER_PATH"'
req_absent_script '> "$LEDGER_PATH"'

req_absent_src 'wc-first-external-tester-private-apply-dry-run-v1'
req_absent_src 'VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_APPLY_DRY_RUN_V1'

if [ ! -f "$LEDGER" ]; then
  echo "missing_real_ledger=$LEDGER"
  fail=1
fi

before_bytes="$(wc -c < "$LEDGER" | tr -d ' ')"
before_lines="$(wc -l < "$LEDGER" | tr -d ' ')"

dry_json="$(mktemp /tmp/void-wc-dry-run-proof-json.XXXXXX.jsonl)"
out_run="$(mktemp /tmp/void-wc-dry-run-proof-output.XXXXXX.txt)"

VOID_WC_DRY_RUN_OUT="$dry_json" bash "$SCRIPT" > "$out_run"

after_bytes="$(wc -c < "$LEDGER" | tr -d ' ')"
after_lines="$(wc -l < "$LEDGER" | tr -d ' ')"

req_out "$out_run" 'VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_APPLY_DRY_RUN_V1_GREEN'
req_out "$out_run" 'dry_run_only=true'
req_out "$out_run" 'public_route=false'
req_out "$out_run" 'no_public_route=true'
req_out "$out_run" 'real_ledger_unchanged=true'
req_out "$out_run" 'dry_run_entry_lines=1'
req_out "$out_run" 'duplicate_found=false'
req_out "$out_run" 'ledger_entry_written_now=false'
req_out "$out_run" 'real_ledger_entry_created_now=false'
req_out "$out_run" 'wc_award_now=false'
req_out "$out_run" 'wc_ledger_write_now=false'
req_out "$out_run" 'wc_balance_changed_now=false'
req_out "$out_run" 'money_movement_now=false'
req_out "$out_run" 'wallet_send_now=false'
req_out "$out_run" 'mutation_performed=false'

if [ "$before_bytes" != "$after_bytes" ] || [ "$before_lines" != "$after_lines" ]; then
  echo "real_ledger_changed_during_dry_run=true"
  fail=1
fi

if [ "$(wc -l < "$dry_json" | tr -d ' ')" != "1" ]; then
  echo "dry_run_jsonl_line_count_not_one=true"
  fail=1
fi

python3 - "$dry_json" "$KEY" "$ROOT" <<'PY'
import json
import sys

path, key, root = sys.argv[1:]
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

if len(lines) != 1:
    print("json_line_count_invalid=true")
    sys.exit(1)

entry = json.loads(lines[0])

expected = {
    "schema": "void_work_credits_ledger_entry_v1",
    "entry_kind": "credit",
    "dry_run_only": True,
    "real_ledger_entry_created_now": False,
    "subject_id": "first-external-tester",
    "subject_role": "external_tester",
    "candidate_id": "first-external-tester-wc-candidate-v1",
    "source_record_id": "first-external-tester-wc-actual-review-decision-record-v1",
    "source_hash_root": root,
    "idempotency_key": key,
    "wc_delta": 100,
    "unit": "WC",
    "direction": "credit",
    "operator_final_apply_required": True,
    "final_apply_command_publicly_disclosed": False,
    "final_apply_command_executed_now": False,
    "wc_ledger_write_now": False,
    "wc_balance_changed_now": False,
    "money_movement_now": False,
    "wallet_send_now": False,
}

for k, v in expected.items():
    if entry.get(k) != v:
        print(f"json_field_mismatch={k}")
        print(f"expected={v!r}")
        print(f"actual={entry.get(k)!r}")
        sys.exit(1)

print("dry_run_json_entry_valid=true")
PY

rm -f "$dry_json" "$out_run"

if [ "$fail" -ne 0 ]; then
  echo "VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_APPLY_DRY_RUN_V1_PROOF_FAILED"
  exit 1
fi

echo "private_apply_dry_run_script_present=true"
echo "public_route=false"
echo "not_present_in_src_index=true"
echo "dry_run_json_entry_valid=true"
echo "real_ledger_unchanged=true"
echo "dry_run_entry_lines=1"
echo "expected_delta=100"
echo "expected_unit=WC"
echo "expected_idempotency_key=$KEY"
echo "expected_source_hash_root=$ROOT"
echo "ledger_entry_written_now=false"
echo "real_ledger_entry_created_now=false"
echo "wc_award_now=false"
echo "wc_ledger_write_now=false"
echo "wc_balance_changed_now=false"
echo "money_movement_now=false"
echo "wallet_send_now=false"
echo "mutation_performed=false"
echo "VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_APPLY_DRY_RUN_V1_PROOF_GREEN"
