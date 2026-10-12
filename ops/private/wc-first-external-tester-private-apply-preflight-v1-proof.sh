#!/usr/bin/env bash
set -euo pipefail

SCRIPT="ops/private/wc-first-external-tester-private-apply-preflight-v1.sh"
SRC="src/index.ts"
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

req_file_contains() {
  local file="$1"
  local needle="$2"
  if ! grep -Fq "$needle" "$file"; then
    echo "missing_runtime: $needle"
    fail=1
  fi
}

echo "=== VOID WC first external tester private apply preflight v1 proof ==="

req_script 'VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_APPLY_PREFLIGHT_V1'
req_script 'preflight_only=true'
req_script 'public_route=false'
req_script 'no_public_route=true'
req_script "$KEY"
req_script "$ROOT"
req_script 'duplicate_found='
req_script 'mutation_performed=false'
req_script 'operator_final_apply_still_required=true'
req_script 'final_apply_command_publicly_disclosed=false'
req_script 'final_apply_command_printed=false'
req_script 'final_apply_command_returned_by_route=false'
req_script 'final_apply_command_executed_now=false'
req_script 'wc_award_now=false'
req_script 'wc_ledger_write_now=false'
req_script 'wc_balance_changed_now=false'
req_script 'money_movement_now=false'
req_script 'wallet_send_now=false'

req_absent_script 'APP.get('
req_absent_script 'res.json'
req_absent_script 'curl '
req_absent_script 'git push'
req_absent_script '>> "$LEDGER_PATH"'
req_absent_script '> "$LEDGER_PATH"'

req_absent_src 'wc-first-external-tester-private-apply-preflight-v1'
req_absent_src 'VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_APPLY_PREFLIGHT_V1'

tmp_ok="$(mktemp)"
out_ok="$(mktemp)"
VOID_WC_LEDGER_PATH="$tmp_ok" bash "$SCRIPT" > "$out_ok"
req_file_contains "$out_ok" 'VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_APPLY_PREFLIGHT_V1_GREEN'
req_file_contains "$out_ok" 'ledger_path_exists=true'
req_file_contains "$out_ok" 'duplicate_found=false'
req_file_contains "$out_ok" 'mutation_performed=false'
req_file_contains "$out_ok" 'preflight_result=go_operator_may_review_private_apply'

tmp_dup="$(mktemp)"
out_dup="$(mktemp)"
printf '%s\n' "$KEY" > "$tmp_dup"
VOID_WC_LEDGER_PATH="$tmp_dup" bash "$SCRIPT" > "$out_dup"
req_file_contains "$out_dup" 'VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_APPLY_PREFLIGHT_V1_GREEN'
req_file_contains "$out_dup" 'ledger_path_exists=true'
req_file_contains "$out_dup" 'duplicate_found=true'
req_file_contains "$out_dup" 'mutation_performed=false'
req_file_contains "$out_dup" 'preflight_result=no_go_operator_must_review_blockers'

rm -f "$tmp_ok" "$out_ok" "$tmp_dup" "$out_dup"

if [ "$fail" -ne 0 ]; then
  echo "VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_APPLY_PREFLIGHT_V1_PROOF_FAILED"
  exit 1
fi

echo "private_apply_preflight_script_present=true"
echo "public_route=false"
echo "not_present_in_src_index=true"
echo "empty_temp_ledger_go_path=true"
echo "duplicate_temp_ledger_no_go_path=true"
echo "mutation_performed=false"
echo "wc_ledger_write_now=false"
echo "money_movement_now=false"
echo "wallet_send_now=false"
echo "VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_APPLY_PREFLIGHT_V1_PROOF_GREEN"
