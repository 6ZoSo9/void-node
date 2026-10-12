#!/usr/bin/env bash
set -euo pipefail

LEDGER="ops/mainnet0/work-credits-ledger.jsonl"
KEY="first-external-tester:wc:actual-review-decision-record-v1:delta-100"
ROOT="cf09951ac295ac31896629f394cfbbdecc69bba8e921414e4d2fb51a763198ba"
SUBJECT="first-external-tester"
DELTA="100"
UNIT="WC"

REQUIRED_TAGS=(
  "ckpt-wc-first-external-tester-private-apply-preflight-v1-cross-box-green-20260619-200620"
  "ckpt-wc-ledger-file-initialization-boundary-v1-cross-box-green-20260619-201510"
  "ckpt-wc-first-external-tester-private-apply-dry-run-v1-cross-box-green-20260619-202443"
  "ckpt-wc-first-external-tester-private-final-apply-readiness-lock-v1-cross-box-green-20260619-203703"
)

echo "VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_FINAL_APPLY_V1"
echo "public_route=false"
echo "operator_terminal_private_apply=true"
echo "ledger_path=$LEDGER"
echo "idempotency_key=$KEY"
echo "source_hash_root=$ROOT"

git fetch --tags origin >/dev/null 2>&1 || true

for tag in "${REQUIRED_TAGS[@]}"; do
  git rev-parse -q --verify "refs/tags/$tag" >/dev/null || {
    echo "required_tag_missing=$tag"
    exit 10
  }
  git merge-base --is-ancestor "$tag" HEAD || {
    echo "required_tag_not_ancestor=$tag"
    exit 11
  }
done

mkdir -p "$(dirname "$LEDGER")"
touch "$LEDGER"

python3 <<'PY'
from pathlib import Path
import json, sys, hashlib, shutil, datetime, subprocess, os

ledger = Path("ops/mainnet0/work-credits-ledger.jsonl")
key = "first-external-tester:wc:actual-review-decision-record-v1:delta-100"
root = "cf09951ac295ac31896629f394cfbbdecc69bba8e921414e4d2fb51a763198ba"
subject = "first-external-tester"

raw_before = ledger.read_bytes() if ledger.exists() else b""
before_lines = [ln for ln in raw_before.decode("utf-8").splitlines() if ln.strip()]

matches = []
parsed = []
for n, line in enumerate(before_lines, 1):
    try:
        obj = json.loads(line)
    except Exception as e:
        print(f"ledger_json_parse_error_line={n}")
        print(f"error={e}")
        sys.exit(20)
    parsed.append(obj)
    if obj.get("idempotency_key") == key:
        matches.append(n)

if matches:
    print("duplicate_found=true")
    print("duplicate_lines=" + ",".join(map(str, matches)))
    print("ledger_entry_written_now=false")
    print("VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_FINAL_APPLY_V1_REFUSED_DUPLICATE")
    sys.exit(21)

stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d-%H%M%S")
backup = Path(f"/tmp/void-wc-first-external-tester-private-final-apply-v1-ledger-before-{stamp}.jsonl")
shutil.copy2(ledger, backup)

head = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
short_head = subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], text=True).strip()

entry_body = {
    "schema": "void_work_credits_ledger_entry_v1",
    "record_type": "wc_ledger_entry",
    "lane": "first_external_tester_wc_private_final_apply_v1",
    "subject_id": subject,
    "direction": "credit",
    "delta": 100,
    "unit": "WC",
    "idempotency_key": key,
    "source_hash_root": root,
    "source_chain": {
        "actual_review_decision_record_marker": "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_ACTUAL_REVIEW_DECISION_RECORD_V1",
        "ledger_entry_preview_marker": "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_ENTRY_PREVIEW_FROM_ACTUAL_DECISION_V1",
        "source_hash_chain_marker": "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_SOURCE_HASH_CHAIN_BOUND_TO_LEDGER_PREVIEW_V1",
        "duplicate_guard_recheck_marker": "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_DUPLICATE_GUARD_RECHECK_BOUND_TO_SOURCE_HASH_V1",
        "private_preflight_marker": "VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_APPLY_PREFLIGHT_V1_GREEN",
        "private_dry_run_marker": "VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_APPLY_DRY_RUN_V1_GREEN",
        "private_final_apply_readiness_lock_marker": "VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_FINAL_APPLY_READINESS_LOCK_V1_GREEN"
    },
    "required_cross_box_tags": [
        "ckpt-wc-first-external-tester-private-apply-preflight-v1-cross-box-green-20260619-200620",
        "ckpt-wc-ledger-file-initialization-boundary-v1-cross-box-green-20260619-201510",
        "ckpt-wc-first-external-tester-private-apply-dry-run-v1-cross-box-green-20260619-202443",
        "ckpt-wc-first-external-tester-private-final-apply-readiness-lock-v1-cross-box-green-20260619-203703"
    ],
    "applied_by": "operator_private_terminal",
    "apply_script": "ops/private/wc-first-external-tester-private-final-apply-v1.sh",
    "git_head_at_apply": head,
    "git_short_head_at_apply": short_head,
    "created_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z"),
    "safety": {
        "public_route": False,
        "public_mutation": False,
        "wallet_send_now": False,
        "money_movement_now": False,
        "void_transfer_now": False,
        "wc_to_void_swap_now": False,
        "buy_void_fulfillment_now": False,
        "validator_mutation_now": False
    }
}

payload = json.dumps(entry_body, sort_keys=True, separators=(",", ":"))
entry_hash = hashlib.sha256(payload.encode("utf-8")).hexdigest()
entry = dict(entry_body)
entry["entry_payload_sha256"] = entry_hash
line = json.dumps(entry, sort_keys=True, separators=(",", ":"))

# Final self-check before append.
check = json.loads(line)
assert check["idempotency_key"] == key
assert check["delta"] == 100
assert check["unit"] == "WC"
assert check["source_hash_root"] == root

with ledger.open("ab") as f:
    if raw_before and not raw_before.endswith(b"\n"):
        f.write(b"\n")
    f.write(line.encode("utf-8") + b"\n")

raw_after = ledger.read_bytes()
after_lines = [ln for ln in raw_after.decode("utf-8").splitlines() if ln.strip()]
after_matches = []
for n, line2 in enumerate(after_lines, 1):
    obj = json.loads(line2)
    if obj.get("idempotency_key") == key:
        after_matches.append(n)

if len(after_matches) != 1:
    print("post_apply_match_count=" + str(len(after_matches)))
    print("VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_FINAL_APPLY_V1_POSTCHECK_FAILED")
    sys.exit(22)

print("required_tags_present_and_ancestors=true")
print(f"ledger_before_lines={len(before_lines)}")
print(f"ledger_after_lines={len(after_lines)}")
print(f"backup_path={backup}")
print("duplicate_found_before_apply=false")
print("ledger_entry_written_now=true")
print("real_ledger_entry_created_now=true")
print("wc_credit_delta_applied_now=100")
print("wc_ledger_write_now=true")
print("wc_balance_changed_now=true")
print("money_movement_now=false")
print("wallet_send_now=false")
print("void_transfer_now=false")
print("wc_to_void_swap_now=false")
print("validator_mutation_now=false")
print("VOID_WC_FIRST_EXTERNAL_TESTER_PRIVATE_FINAL_APPLY_V1_GREEN")
PY
