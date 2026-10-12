#!/usr/bin/env bash
set -euo pipefail

SCRIPT="ops/private/wc-first-external-tester-private-final-apply-readiness-lock-v1.sh"
SRC="src/index.ts"
LEDGER="ops/mainnet0/work-credits-ledger.jsonl"

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

echo "=== VOID WC first external tester private final apply readiness lock v1 proof ==="

req_script 'VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_FINAL_APPLY_READINESS_LOCK_V1'
req_script 'final_apply_readiness_locked=true'
req_script 'next_step_operator_controlled_append_only=true'
req_script 'final_apply_command_publicly_disclosed=false'
req_script 'final_apply_command_printed=false'
req_script 'final_apply_command_executed_now=false'
req_script 'ledger_entry_written_now=false'
req_script 'real_ledger_entry_created_now=false'
req_script 'wc_award_now=false'
req_script 'wc_ledger_write_now=false'
req_script 'wc_balance_changed_now=false'
req_script 'money_movement_now=false'
req_script 'wallet_send_now=false'
req_script 'mutation_performed=false'
req_script 'operator_final_apply_still_required=true'

req_absent_script 'APP.get('
req_absent_script 'res.json'
req_absent_script 'git push'
req_absent_script 'curl '
req_absent_script '>> "$LEDGER_PATH"'
req_absent_script '> "$LEDGER_PATH"'

req_absent_src 'wc-first-external-tester-private-final-apply-readiness-lock-v1'
req_absent_src 'VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_FINAL_APPLY_READINESS_LOCK_V1'

before_bytes="$(wc -c < "$LEDGER" | tr -d ' ')"
before_lines="$(wc -l < "$LEDGER" | tr -d ' ')"

out="$(mktemp /tmp/void-wc-final-readiness-lock-proof-output.XXXXXX.txt)"
bash "$SCRIPT" > "$out"

after_bytes="$(wc -c < "$LEDGER" | tr -d ' ')"
after_lines="$(wc -l < "$LEDGER" | tr -d ' ')"

req_out "$out" 'VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_FINAL_APPLY_READINESS_LOCK_V1_GREEN'
req_out "$out" 'required_tags_present_and_ancestors=true'
req_out "$out" 'ledger_file_exists=true'
req_out "$out" 'ledger_entry_count=0'
req_out "$out" 'ledger_byte_count=0'
req_out "$out" 'duplicate_found=false'
req_out "$out" 'dry_run_json_entry_valid=true'
req_out "$out" 'private_preflight_go_state=true'
req_out "$out" 'final_apply_readiness_locked=true'
req_out "$out" 'next_step_operator_controlled_append_only=true'
req_out "$out" 'final_apply_command_publicly_disclosed=false'
req_out "$out" 'final_apply_command_printed=false'
req_out "$out" 'final_apply_command_executed_now=false'
req_out "$out" 'ledger_entry_written_now=false'
req_out "$out" 'real_ledger_entry_created_now=false'
req_out "$out" 'wc_award_now=false'
req_out "$out" 'wc_ledger_write_now=false'
req_out "$out" 'wc_balance_changed_now=false'
req_out "$out" 'money_movement_now=false'
req_out "$out" 'wallet_send_now=false'
req_out "$out" 'mutation_performed=false'
req_out "$out" 'operator_final_apply_still_required=true'

if grep -Fq 'missing_required_tag=' "$out"; then
  echo "readiness_output_contains_missing_tag=true"
  fail=1
fi

if [ "$before_bytes" != "$after_bytes" ] || [ "$before_lines" != "$after_lines" ]; then
  echo "real_ledger_changed_during_readiness_lock=true"
  fail=1
fi

rm -f "$out"

if [ "$fail" -ne 0 ]; then
  echo "VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_FINAL_APPLY_READINESS_LOCK_V1_PROOF_FAILED"
  exit 1
fi

echo "private_final_apply_readiness_lock_present=true"
echo "required_tags_present_and_ancestors=true"
echo "ledger_entry_count=0"
echo "ledger_byte_count=0"
echo "duplicate_found=false"
echo "dry_run_json_entry_valid=true"
echo "private_preflight_go_state=true"
echo "real_ledger_unchanged=true"
echo "final_apply_readiness_locked=true"
echo "next_step_operator_controlled_append_only=true"
echo "ledger_entry_written_now=false"
echo "real_ledger_entry_created_now=false"
echo "wc_award_now=false"
echo "wc_ledger_write_now=false"
echo "wc_balance_changed_now=false"
echo "money_movement_now=false"
echo "wallet_send_now=false"
echo "mutation_performed=false"
echo "VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_FINAL_APPLY_READINESS_LOCK_V1_PROOF_GREEN"
