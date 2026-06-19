#!/usr/bin/env bash
set -euo pipefail

LEDGER_PATH="${VOID_WC_LEDGER_PATH:-ops/mainnet0/work-credits-ledger.jsonl}"
EXPECTED_KEY="first-external-tester:wc:actual-review-decision-record-v1:delta-100"

mkdir -p "$(dirname "$LEDGER_PATH")"

created_now=false
if [ ! -e "$LEDGER_PATH" ]; then
  : > "$LEDGER_PATH"
  created_now=true
fi

if [ ! -f "$LEDGER_PATH" ]; then
  echo "VOID_WC_LEDGER_FILE_INITIALIZATION_BOUNDARY_V1_FAILED"
  echo "reason=ledger_path_exists_but_is_not_regular_file"
  exit 1
fi

entry_count="$(wc -l < "$LEDGER_PATH" | tr -d ' ')"
byte_count="$(wc -c < "$LEDGER_PATH" | tr -d ' ')"

duplicate_found=false
if grep -Fq "$EXPECTED_KEY" "$LEDGER_PATH"; then
  duplicate_found=true
fi

echo "VOID_WC_LEDGER_FILE_INITIALIZATION_BOUNDARY_V1"
echo "ledger_path=$LEDGER_PATH"
echo "ledger_file_exists=true"
echo "ledger_file_created_now=$created_now"
echo "ledger_entry_count=$entry_count"
echo "ledger_byte_count=$byte_count"
echo "expected_idempotency_key=$EXPECTED_KEY"
echo "duplicate_found=$duplicate_found"
echo "initialization_boundary_only=true"
echo "ledger_entry_written_now=false"
echo "wc_award_now=false"
echo "wc_ledger_write_now=false"
echo "wc_balance_changed_now=false"
echo "money_movement_now=false"
echo "wallet_send_now=false"
echo "mutation_scope=empty_file_creation_only"
echo "operator_final_apply_still_required=true"
echo "VOID_WC_LEDGER_FILE_INITIALIZATION_BOUNDARY_V1_GREEN"

if [ "$duplicate_found" = "true" ]; then
  exit 2
fi
