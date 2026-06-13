#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
EXPECTED_BASE="${EXPECTED_BASE:-}"
EXPECTED_TESTER_LABEL="${EXPECTED_TESTER_LABEL:-standalone-outside-tester}"
OUT="${OUT:-/tmp/public-node-first-external-receipt-imported-closeout-proof-$(date -u +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_IMPORTED_CLOSEOUT_PROOF_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "expected_base=${EXPECTED_BASE:-auto}"
echo "expected_tester_label=$EXPECTED_TESTER_LABEL"
echo "out=$OUT"

curl -fsS "$LOCAL_BASE/public-node/tester-result-intake.json" > "$OUT/tester-result-intake.json"
curl -fsS "$LOCAL_BASE/public-node/external-tester-receipt-closeout-status.json" > "$OUT/external-tester-receipt-closeout-status.json"

python3 - "$OUT/tester-result-intake.json" "$OUT/external-tester-receipt-closeout-status.json" "$EXPECTED_BASE" "$EXPECTED_TESTER_LABEL" <<'PY'
import json
import sys
from pathlib import Path

intake = json.loads(Path(sys.argv[1]).read_text())
closeout = json.loads(Path(sys.argv[2]).read_text())
expected_base = sys.argv[3].strip().rstrip("/")
expected_tester = sys.argv[4].strip()

assert intake.get("marker") == "VOID_PUBLIC_NODE_TESTER_RESULT_INTAKE_V1"
assert intake.get("purpose") == "public_node_tester_result_intake_status"
assert intake.get("status") == "external_tester_result_imported"

assert closeout.get("marker") == "VOID_PUBLIC_NODE_EXTERNAL_TESTER_RECEIPT_CLOSEOUT_STATUS_V1"
assert closeout.get("purpose") == "public_node_external_tester_receipt_closeout_status"
assert closeout.get("status") == "external_tester_receipt_imported_closeout_ready"

effective_base = str(closeout.get("effective_base_url") or intake.get("effective_base_url") or "").rstrip("/")
assert effective_base.startswith(("http://", "https://"))
if expected_base:
    assert effective_base == expected_base, f"effective_base mismatch: expected {expected_base}, got {effective_base}"

closeout_obj = closeout.get("closeout", {})
intake_obj = intake.get("intake", {})
policy = closeout.get("policy", {})

assert closeout_obj.get("tester_lane_ready") is True
assert closeout_obj.get("receipt_required") is True
assert closeout_obj.get("waiting_for_external_receipt") is False
assert closeout_obj.get("latest_imported") is True
assert closeout_obj.get("latest_receipt_present") is True
assert closeout_obj.get("safe_import_guard_ready") is True
assert closeout_obj.get("expected_receipt_file") == "tester-receipt.json"
assert closeout_obj.get("expected_receipt_marker") == "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1"
assert closeout_obj.get("expected_green_marker") == "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"

assert intake_obj.get("latest_imported") is True
latest_from_intake = intake_obj.get("latest_result")
latest_from_closeout = closeout_obj.get("latest_result")
assert isinstance(latest_from_intake, dict)
assert isinstance(latest_from_closeout, dict)

for latest in (latest_from_intake, latest_from_closeout):
    assert latest.get("marker") == "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1"
    assert latest.get("intake_marker") == "VOID_PUBLIC_NODE_TESTER_RESULT_IMPORT_HELPER_V1"
    assert latest.get("tester_label") == expected_tester
    assert latest.get("tested_base_url", "").rstrip("/") == effective_base
    assert latest.get("observed_green_marker") == "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"
    assert latest.get("result") == "green"
    assert latest.get("imported_by_operator") is True
    assert latest.get("trusted_as_network_truth") is False
    orig = latest.get("original_receipt")
    assert isinstance(orig, dict)
    assert orig.get("marker") == "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1"
    assert orig.get("standalone_smoke_marker") == "VOID_PUBLIC_NODE_STANDALONE_OUTSIDE_TESTER_SMOKE_SCRIPT_V1"
    assert orig.get("demo003_folder_checked") is True
    assert str(orig.get("demo003_folder_manifest") or "").startswith(effective_base)
    assert orig.get("trusted_as_network_truth") is False

for key, expected in {
    "public_routes_only": True,
    "private_api": False,
    "public_post_endpoint": False,
    "operator_local_import_only": True,
    "mutation": False,
    "read_only": True,
    "money_movement": False,
    "wallet_send": False,
    "wc_to_void_swap": False,
    "buy_void_fulfillment": False,
    "validator_mutation": False,
    "trusted_as_network_truth": False,
}.items():
    assert policy.get(key) is expected, f"policy {key} mismatch"

print("imported_closeout_json_checks=green")
print(f"effective_base_url={effective_base}")
print("receipt_state=external_receipt_imported")
print("waiting_for_external_receipt=false")
print("latest_imported=true")
print(f"latest_result_tester={expected_tester}")
print("latest_result_status=green")
print("operator_local_import_only=true")
print("trusted_as_network_truth=false")
PY

LOCAL_BASE="$LOCAL_BASE" ops/mainnet0/public-node-first-external-receipt-watch.sh > "$OUT/first-external-receipt-watch.log"
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_WATCH_V1_GREEN" "$OUT/first-external-receipt-watch.log"
grep -Fq "receipt_state=external_receipt_imported" "$OUT/first-external-receipt-watch.log"
grep -Fq "latest_result_tester=$EXPECTED_TESTER_LABEL" "$OUT/first-external-receipt-watch.log"
echo "first_external_receipt_watch_imported_green=true"

LOCAL_BASE="$LOCAL_BASE" ops/mainnet0/public-node-live-status-rollup.sh > "$OUT/live-status-rollup.log"
grep -Fq "VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_V1_GREEN" "$OUT/live-status-rollup.log"
grep -Fq "receipt_state=external_receipt_imported" "$OUT/live-status-rollup.log"
grep -Fq "receipt_state_before_dryrun=external_receipt_imported" "$OUT/live-status-rollup.log"
grep -Fq "receipt_state_after_dryrun=external_receipt_imported" "$OUT/live-status-rollup.log"
grep -Fq "dryrun_preserved_receipt_state=true" "$OUT/live-status-rollup.log"
grep -Fq "dryrun_preserved_imported_state=true" "$OUT/live-status-rollup.log"
grep -Fq "external_tester_receipt_closeout_waiting=false" "$OUT/live-status-rollup.log"
grep -Fq "external_tester_receipt_closeout_latest_imported=true" "$OUT/live-status-rollup.log"
echo "live_rollup_imported_state_green=true"

echo "first_external_receipt_imported_closeout_green=true"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_IMPORTED_CLOSEOUT_PROOF_V1_GREEN"
