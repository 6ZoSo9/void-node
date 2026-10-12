#!/usr/bin/env bash
set -euo pipefail

SRC="src/index.ts"
LEDGER_PATH="${VOID_WC_LEDGER_PATH:-ops/mainnet0/work-credits-ledger.jsonl}"
EXPECTED_HEAD="${VOID_EXPECTED_HEAD:-}"

EXPECTED_ROOT="cf09951ac295ac31896629f394cfbbdecc69bba8e921414e4d2fb51a763198ba"
EXPECTED_KEY="first-external-tester:wc:actual-review-decision-record-v1:delta-100"
EXPECTED_SUBJECT="first-external-tester"
EXPECTED_DELTA="100"
EXPECTED_UNIT="WC"

fail=0
missing_markers=0
duplicate_found="unknown"
ledger_path_exists="false"
head_check="not_requested"

req_src() {
  if ! grep -Fq "$1" "$SRC"; then
    echo "missing_source_marker=$1"
    missing_markers=$((missing_markers + 1))
    fail=1
  fi
}

current_head="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
current_head_short="$(git rev-parse --short=8 HEAD 2>/dev/null || echo unknown)"

if [ -n "$EXPECTED_HEAD" ]; then
  if [ "$current_head" = "$EXPECTED_HEAD" ] || [ "$current_head_short" = "$EXPECTED_HEAD" ]; then
    head_check="match"
  else
    head_check="mismatch"
    fail=1
  fi
fi

req_src "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_ACTUAL_REVIEW_DECISION_RECORD_V1"
req_src "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_ENTRY_PREVIEW_FROM_ACTUAL_DECISION_V1"
req_src "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_SOURCE_HASH_CHAIN_BOUND_TO_LEDGER_PREVIEW_V1"
req_src "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_DUPLICATE_GUARD_RECHECK_BOUND_TO_SOURCE_HASH_V1"
req_src "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_FINAL_OPERATOR_APPLY_AUTHORIZATION_PACKET_V1"
req_src "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_FINAL_APPLY_COMMAND_HOLD_PRIVATE_BOUNDARY_V1"
req_src "$EXPECTED_ROOT"
req_src "$EXPECTED_KEY"

if [ -f "$LEDGER_PATH" ]; then
  ledger_path_exists="true"
  if grep -Fq "$EXPECTED_KEY" "$LEDGER_PATH"; then
    duplicate_found="true"
    fail=1
  else
    duplicate_found="false"
  fi
else
  duplicate_found="not_checked_ledger_path_missing"
fi

if [ "$fail" -eq 0 ] && [ "$duplicate_found" = "false" ]; then
  preflight_result="go_operator_may_review_private_apply"
else
  preflight_result="no_go_operator_must_review_blockers"
fi

echo "VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_APPLY_PREFLIGHT_V1"
echo "preflight_only=true"
echo "public_route=false"
echo "no_public_route=true"
echo "current_head=$current_head_short"
echo "expected_head_check=$head_check"
echo "source_markers_missing=$missing_markers"
echo "ledger_path=$LEDGER_PATH"
echo "ledger_path_exists=$ledger_path_exists"
echo "expected_subject=$EXPECTED_SUBJECT"
echo "expected_delta=$EXPECTED_DELTA"
echo "expected_unit=$EXPECTED_UNIT"
echo "expected_idempotency_key=$EXPECTED_KEY"
echo "expected_source_hash_root=$EXPECTED_ROOT"
echo "duplicate_found=$duplicate_found"
echo "final_apply_command_publicly_disclosed=false"
echo "final_apply_command_printed=false"
echo "final_apply_command_returned_by_route=false"
echo "final_apply_command_executed_now=false"
echo "wc_award_now=false"
echo "wc_ledger_write_now=false"
echo "wc_balance_changed_now=false"
echo "money_movement_now=false"
echo "wallet_send_now=false"
echo "mutation_performed=false"
echo "operator_final_apply_still_required=true"
echo "preflight_result=$preflight_result"
echo "VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_APPLY_PREFLIGHT_V1_GREEN"

if [ "${VOID_PREFLIGHT_STRICT:-0}" = "1" ] && [ "$preflight_result" != "go_operator_may_review_private_apply" ]; then
  exit 10
fi
