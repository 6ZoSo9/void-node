#!/usr/bin/env bash
set -euo pipefail

LEDGER_PATH="${VOID_WC_LEDGER_PATH:-ops/mainnet0/work-credits-ledger.jsonl}"
EXPECTED_KEY="first-external-tester:wc:actual-review-decision-record-v1:delta-100"
EXPECTED_ROOT="cf09951ac295ac31896629f394cfbbdecc69bba8e921414e4d2fb51a763198ba"
EXPECTED_SUBJECT="first-external-tester"
EXPECTED_DELTA="100"
EXPECTED_UNIT="WC"
DRY_RUN_OUT="${VOID_WC_DRY_RUN_OUT:-$(mktemp /tmp/void-wc-first-external-tester-dry-run-v1.XXXXXX.jsonl)}"

if [ ! -f "$LEDGER_PATH" ]; then
  echo "VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_APPLY_DRY_RUN_V1_FAILED"
  echo "reason=ledger_path_missing"
  echo "ledger_path=$LEDGER_PATH"
  exit 1
fi

real_ledger_before_bytes="$(wc -c < "$LEDGER_PATH" | tr -d ' ')"
real_ledger_before_lines="$(wc -l < "$LEDGER_PATH" | tr -d ' ')"

duplicate_found=false
if grep -Fq "$EXPECTED_KEY" "$LEDGER_PATH"; then
  duplicate_found=true
fi

if [ "$duplicate_found" = "true" ]; then
  echo "VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_APPLY_DRY_RUN_V1_FAILED"
  echo "reason=duplicate_found_in_real_ledger"
  echo "ledger_path=$LEDGER_PATH"
  echo "expected_idempotency_key=$EXPECTED_KEY"
  echo "mutation_performed=false"
  exit 2
fi

python3 - "$DRY_RUN_OUT" "$EXPECTED_KEY" "$EXPECTED_ROOT" "$EXPECTED_SUBJECT" "$EXPECTED_DELTA" "$EXPECTED_UNIT" <<'PY'
import json
import sys

out, key, root, subject, delta, unit = sys.argv[1:]
entry = {
    "schema": "void_work_credits_ledger_entry_v1",
    "entry_kind": "credit",
    "dry_run_only": True,
    "real_ledger_entry_created_now": False,
    "subject_id": subject,
    "subject_role": "external_tester",
    "candidate_id": "first-external-tester-wc-candidate-v1",
    "source_record_id": "first-external-tester-wc-actual-review-decision-record-v1",
    "source_hash_root": root,
    "idempotency_key": key,
    "wc_delta": int(delta),
    "unit": unit,
    "direction": "credit",
    "reason": "first external tester useful-work recognition after public proof chain and private preflight",
    "operator_final_apply_required": True,
    "final_apply_command_publicly_disclosed": False,
    "final_apply_command_executed_now": False,
    "wc_ledger_write_now": False,
    "wc_balance_changed_now": False,
    "money_movement_now": False,
    "wallet_send_now": False
}
with open(out, "w", encoding="utf-8") as f:
    f.write(json.dumps(entry, sort_keys=True, separators=(",", ":")) + "\n")
PY

dry_run_lines="$(wc -l < "$DRY_RUN_OUT" | tr -d ' ')"
dry_run_bytes="$(wc -c < "$DRY_RUN_OUT" | tr -d ' ')"

real_ledger_after_bytes="$(wc -c < "$LEDGER_PATH" | tr -d ' ')"
real_ledger_after_lines="$(wc -l < "$LEDGER_PATH" | tr -d ' ')"

real_ledger_unchanged=false
if [ "$real_ledger_before_bytes" = "$real_ledger_after_bytes" ] && [ "$real_ledger_before_lines" = "$real_ledger_after_lines" ]; then
  real_ledger_unchanged=true
fi

echo "VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_APPLY_DRY_RUN_V1"
echo "dry_run_only=true"
echo "public_route=false"
echo "no_public_route=true"
echo "real_ledger_path=$LEDGER_PATH"
echo "real_ledger_before_lines=$real_ledger_before_lines"
echo "real_ledger_before_bytes=$real_ledger_before_bytes"
echo "real_ledger_after_lines=$real_ledger_after_lines"
echo "real_ledger_after_bytes=$real_ledger_after_bytes"
echo "real_ledger_unchanged=$real_ledger_unchanged"
echo "dry_run_output_path=$DRY_RUN_OUT"
echo "dry_run_entry_lines=$dry_run_lines"
echo "dry_run_entry_bytes=$dry_run_bytes"
echo "expected_subject=$EXPECTED_SUBJECT"
echo "expected_delta=$EXPECTED_DELTA"
echo "expected_unit=$EXPECTED_UNIT"
echo "expected_idempotency_key=$EXPECTED_KEY"
echo "expected_source_hash_root=$EXPECTED_ROOT"
echo "duplicate_found=false"
echo "ledger_entry_written_now=false"
echo "real_ledger_entry_created_now=false"
echo "wc_award_now=false"
echo "wc_ledger_write_now=false"
echo "wc_balance_changed_now=false"
echo "money_movement_now=false"
echo "wallet_send_now=false"
echo "mutation_performed=false"
echo "operator_final_apply_still_required=true"
echo "VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_APPLY_DRY_RUN_V1_GREEN"
