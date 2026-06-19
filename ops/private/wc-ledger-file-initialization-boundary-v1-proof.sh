#!/usr/bin/env bash
set -euo pipefail

SCRIPT="ops/private/wc-ledger-file-initialization-boundary-v1.sh"
PREFLIGHT="ops/private/wc-first-external-tester-private-apply-preflight-v1.sh"
LEDGER="ops/mainnet0/work-credits-ledger.jsonl"
KEY="first-external-tester:wc:actual-review-decision-record-v1:delta-100"

fail=0

req_script() {
  if ! grep -Fq "$1" "$SCRIPT"; then
    echo "missing_script: $1"
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

echo "=== VOID WC ledger file initialization boundary v1 proof ==="

req_script 'VOID_WC_LEDGER_FILE_INITIALIZATION_BOUNDARY_V1'
req_script 'initialization_boundary_only=true'
req_script 'ledger_entry_written_now=false'
req_script 'wc_award_now=false'
req_script 'wc_ledger_write_now=false'
req_script 'wc_balance_changed_now=false'
req_script 'money_movement_now=false'
req_script 'wallet_send_now=false'
req_script 'mutation_scope=empty_file_creation_only'
req_script 'operator_final_apply_still_required=true'

if [ ! -f "$LEDGER" ]; then
  echo "missing_ledger_file=$LEDGER"
  fail=1
fi

if [ -s "$LEDGER" ]; then
  echo "ledger_not_empty=true"
  fail=1
fi

if grep -Fq "$KEY" "$LEDGER"; then
  echo "duplicate_key_found_in_empty_ledger=true"
  fail=1
fi

out_init="$(mktemp)"
out_preflight="$(mktemp)"

bash "$SCRIPT" > "$out_init"
bash "$PREFLIGHT" > "$out_preflight"

req_out "$out_init" 'VOID_WC_LEDGER_FILE_INITIALIZATION_BOUNDARY_V1_GREEN'
req_out "$out_init" 'ledger_file_exists=true'
req_out "$out_init" 'ledger_entry_count=0'
req_out "$out_init" 'ledger_byte_count=0'
req_out "$out_init" 'duplicate_found=false'
req_out "$out_init" 'ledger_entry_written_now=false'
req_out "$out_init" 'wc_ledger_write_now=false'
req_out "$out_init" 'money_movement_now=false'
req_out "$out_init" 'wallet_send_now=false'

req_out "$out_preflight" 'VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_APPLY_PREFLIGHT_V1_GREEN'
req_out "$out_preflight" 'ledger_path_exists=true'
req_out "$out_preflight" 'duplicate_found=false'
req_out "$out_preflight" 'mutation_performed=false'
req_out "$out_preflight" 'preflight_result=go_operator_may_review_private_apply'

rm -f "$out_init" "$out_preflight"

if [ "$fail" -ne 0 ]; then
  echo "VOID_WC_LEDGER_FILE_INITIALIZATION_BOUNDARY_V1_PROOF_FAILED"
  exit 1
fi

echo "ledger_file_initialization_boundary_present=true"
echo "ledger_file_exists=true"
echo "ledger_entry_count=0"
echo "ledger_byte_count=0"
echo "duplicate_found=false"
echo "private_preflight_real_empty_ledger_go_path=true"
echo "ledger_entry_written_now=false"
echo "wc_award_now=false"
echo "wc_ledger_write_now=false"
echo "wc_balance_changed_now=false"
echo "money_movement_now=false"
echo "wallet_send_now=false"
echo "VOID_WC_LEDGER_FILE_INITIALIZATION_BOUNDARY_V1_PROOF_GREEN"
