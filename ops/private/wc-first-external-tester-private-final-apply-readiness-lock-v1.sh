#!/usr/bin/env bash
set -euo pipefail

LEDGER_PATH="${VOID_WC_LEDGER_PATH:-ops/mainnet0/work-credits-ledger.jsonl}"
DRY_RUN_SCRIPT="ops/private/wc-first-external-tester-private-apply-dry-run-v1.sh"
DRY_RUN_PROOF="ops/private/wc-first-external-tester-private-apply-dry-run-v1-proof.sh"
PREFLIGHT_SCRIPT="ops/private/wc-first-external-tester-private-apply-preflight-v1.sh"
INIT_PROOF="ops/private/wc-ledger-file-initialization-boundary-v1-proof.sh"

EXPECTED_KEY="first-external-tester:wc:actual-review-decision-record-v1:delta-100"
EXPECTED_ROOT="cf09951ac295ac31896629f394cfbbdecc69bba8e921414e4d2fb51a763198ba"
EXPECTED_DELTA="100"
EXPECTED_UNIT="WC"

REQ_PREFLIGHT_TAG="ckpt-wc-first-external-tester-private-apply-preflight-v1-cross-box-green-20260619-200620"
REQ_LEDGER_INIT_TAG="ckpt-wc-ledger-file-initialization-boundary-v1-cross-box-green-20260619-201510"
REQ_DRY_RUN_TAG="ckpt-wc-first-external-tester-private-apply-dry-run-v1-cross-box-green-20260619-202443"

fail=0
tags_ok=true

check_file() {
  if [ ! -f "$1" ]; then
    echo "missing_file=$1"
    fail=1
  fi
}

check_tag() {
  local tag="$1"
  if ! git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then
    echo "missing_required_tag=$tag"
    fail=1
    tags_ok=false
    return
  fi
  if ! git merge-base --is-ancestor "$tag" HEAD; then
    echo "required_tag_not_ancestor=$tag"
    fail=1
    tags_ok=false
  fi
}

echo "VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_FINAL_APPLY_READINESS_LOCK_V1"

current_head="$(git rev-parse --short HEAD)"
echo "current_head=$current_head"

check_file "$LEDGER_PATH"
check_file "$DRY_RUN_SCRIPT"
check_file "$DRY_RUN_PROOF"
check_file "$PREFLIGHT_SCRIPT"
check_file "$INIT_PROOF"

check_tag "$REQ_PREFLIGHT_TAG"
check_tag "$REQ_LEDGER_INIT_TAG"
check_tag "$REQ_DRY_RUN_TAG"

if [ -f "$LEDGER_PATH" ]; then
  ledger_lines="$(wc -l < "$LEDGER_PATH" | tr -d ' ')"
  ledger_bytes="$(wc -c < "$LEDGER_PATH" | tr -d ' ')"
else
  ledger_lines="missing"
  ledger_bytes="missing"
fi

duplicate_found=false
if [ -f "$LEDGER_PATH" ] && grep -Fq "$EXPECTED_KEY" "$LEDGER_PATH"; then
  duplicate_found=true
fi

dry_json="$(mktemp /tmp/void-wc-final-readiness-lock-dry-json.XXXXXX.jsonl)"
dry_out="$(mktemp /tmp/void-wc-final-readiness-lock-dry-out.XXXXXX.txt)"
proof_out="$(mktemp /tmp/void-wc-final-readiness-lock-proof-out.XXXXXX.txt)"
preflight_out="$(mktemp /tmp/void-wc-final-readiness-lock-preflight-out.XXXXXX.txt)"
init_out="$(mktemp /tmp/void-wc-final-readiness-lock-init-out.XXXXXX.txt)"

VOID_WC_DRY_RUN_OUT="$dry_json" bash "$DRY_RUN_SCRIPT" > "$dry_out"
bash "$DRY_RUN_PROOF" > "$proof_out"
bash "$PREFLIGHT_SCRIPT" > "$preflight_out"
bash "$INIT_PROOF" > "$init_out"

need_out() {
  local file="$1"
  local needle="$2"
  if ! grep -Fq "$needle" "$file"; then
    echo "missing_output=$needle"
    fail=1
  fi
}

need_out "$dry_out" 'VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_APPLY_DRY_RUN_V1_GREEN'
need_out "$dry_out" 'real_ledger_unchanged=true'
need_out "$dry_out" 'dry_run_entry_lines=1'
need_out "$dry_out" 'ledger_entry_written_now=false'
need_out "$dry_out" 'wc_ledger_write_now=false'
need_out "$dry_out" 'mutation_performed=false'

need_out "$proof_out" 'VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_APPLY_DRY_RUN_V1_PROOF_GREEN'
need_out "$proof_out" 'dry_run_json_entry_valid=true'
need_out "$proof_out" 'real_ledger_unchanged=true'

need_out "$preflight_out" 'VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_APPLY_PREFLIGHT_V1_GREEN'
need_out "$preflight_out" 'ledger_path_exists=true'
need_out "$preflight_out" 'duplicate_found=false'
need_out "$preflight_out" 'preflight_result=go_operator_may_review_private_apply'
need_out "$preflight_out" 'mutation_performed=false'

need_out "$init_out" 'VOID_WC_LEDGER_FILE_INITIALIZATION_BOUNDARY_V1_PROOF_GREEN'
need_out "$init_out" 'ledger_entry_count=0'
need_out "$init_out" 'ledger_byte_count=0'
need_out "$init_out" 'private_preflight_real_empty_ledger_go_path=true'

python3 - "$dry_json" "$EXPECTED_KEY" "$EXPECTED_ROOT" "$EXPECTED_DELTA" "$EXPECTED_UNIT" <<'PY'
import json
import sys

path, key, root, delta, unit = sys.argv[1:]
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

if len(lines) != 1:
    print("dry_run_json_line_count_invalid=true")
    sys.exit(1)

entry = json.loads(lines[0])
checks = {
    "schema": "void_work_credits_ledger_entry_v1",
    "entry_kind": "credit",
    "dry_run_only": True,
    "real_ledger_entry_created_now": False,
    "subject_id": "first-external-tester",
    "source_hash_root": root,
    "idempotency_key": key,
    "wc_delta": int(delta),
    "unit": unit,
    "direction": "credit",
    "operator_final_apply_required": True,
    "final_apply_command_publicly_disclosed": False,
    "final_apply_command_executed_now": False,
    "wc_ledger_write_now": False,
    "wc_balance_changed_now": False,
    "money_movement_now": False,
    "wallet_send_now": False,
}

for k, v in checks.items():
    if entry.get(k) != v:
        print(f"dry_run_json_field_mismatch={k}")
        sys.exit(1)

print("dry_run_json_entry_valid=true")
PY

rm -f "$dry_json" "$dry_out" "$proof_out" "$preflight_out" "$init_out"

echo "required_preflight_cross_box_tag=$REQ_PREFLIGHT_TAG"
echo "required_ledger_init_cross_box_tag=$REQ_LEDGER_INIT_TAG"
echo "required_dry_run_cross_box_tag=$REQ_DRY_RUN_TAG"
echo "required_tags_present_and_ancestors=$tags_ok"
echo "ledger_path=$LEDGER_PATH"
echo "ledger_file_exists=true"
echo "ledger_entry_count=$ledger_lines"
echo "ledger_byte_count=$ledger_bytes"
echo "duplicate_found=$duplicate_found"
echo "dry_run_json_entry_valid=true"
echo "private_preflight_go_state=true"
echo "final_apply_readiness_locked=true"
echo "next_step_operator_controlled_append_only=true"
echo "final_apply_command_publicly_disclosed=false"
echo "final_apply_command_printed=false"
echo "final_apply_command_executed_now=false"
echo "ledger_entry_written_now=false"
echo "real_ledger_entry_created_now=false"
echo "wc_award_now=false"
echo "wc_ledger_write_now=false"
echo "wc_balance_changed_now=false"
echo "money_movement_now=false"
echo "wallet_send_now=false"
echo "mutation_performed=false"
echo "operator_final_apply_still_required=true"

if [ "$fail" -ne 0 ] || [ "$duplicate_found" = "true" ] || [ "$ledger_lines" != "0" ] || [ "$ledger_bytes" != "0" ]; then
  echo "VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_FINAL_APPLY_READINESS_LOCK_V1_FAILED"
  exit 1
fi

echo "VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_FINAL_APPLY_READINESS_LOCK_V1_GREEN"
