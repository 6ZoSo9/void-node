#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-first-external-receipt-ask-export-$STAMP}"

mkdir -p "$OUT"

PACK_JSON="$OUT/first-tester-request-copy-pack.json"
CLOSEOUT_JSON="$OUT/external-tester-receipt-closeout-status.json"
ASK_TXT="$OUT/first-external-receipt-ask.txt"
ASK_JSON="$OUT/first-external-receipt-ask.json"

curl -fsS "$LOCAL_BASE/public-node/first-tester-request-copy-pack.json" > "$PACK_JSON"
curl -fsS "$LOCAL_BASE/public-node/external-tester-receipt-closeout-status.json" > "$CLOSEOUT_JSON"

python3 - "$PACK_JSON" "$CLOSEOUT_JSON" "$ASK_TXT" "$ASK_JSON" "$LOCAL_BASE" <<'PY'
import json
import sys
from pathlib import Path

pack_path = Path(sys.argv[1])
closeout_path = Path(sys.argv[2])
ask_txt_path = Path(sys.argv[3])
ask_json_path = Path(sys.argv[4])
local_base = sys.argv[5].rstrip("/")

pack = json.loads(pack_path.read_text())
closeout = json.loads(closeout_path.read_text())

assert pack.get("marker") == "VOID_PUBLIC_NODE_FIRST_TESTER_REQUEST_COPY_PACK_V1"
assert pack.get("status") == "first_tester_request_copy_ready"
assert pack.get("expected_green_marker") == "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"
assert pack.get("expected_receipt_file") == "tester-receipt.json"

assert closeout.get("marker") == "VOID_PUBLIC_NODE_EXTERNAL_TESTER_RECEIPT_CLOSEOUT_STATUS_V1"
assert closeout.get("purpose") == "public_node_external_tester_receipt_closeout_status"

closeout_obj = closeout.get("closeout", {})
policy = closeout.get("policy", {})
links = closeout.get("links", {})

assert closeout_obj.get("tester_lane_ready") is True
assert closeout_obj.get("receipt_required") is True
assert closeout_obj.get("waiting_for_external_receipt") is True
assert closeout_obj.get("latest_imported") is False
assert closeout_obj.get("safe_import_guard_ready") is True
assert policy.get("public_post_endpoint") is False
assert policy.get("operator_local_import_only") is True
assert policy.get("trusted_as_network_truth") is False

tester_links = pack.get("tester_links", {})
tester_share = tester_links.get("tester_share_page") or links.get("tester_share_page")
tester_lane_summary = tester_links.get("tester_lane_summary") or links.get("tester_lane_summary")
closeout_effective_base = str(closeout.get("effective_base_url") or local_base).rstrip("/")
closeout_status = closeout_effective_base + "/public-node/external-tester-receipt-closeout-status.json"
real_data_status = tester_links.get("real_data_import_lane_status") or links.get("real_data_import_lane_status")
smoke_command = pack.get("smoke_command")

assert tester_share
assert tester_lane_summary
assert closeout_status.endswith("/public-node/external-tester-receipt-closeout-status.json")
assert real_data_status and real_data_status.endswith("/public-node/real-data-import-lane-status.json")
assert smoke_command and "standalone-outside-tester-smoke.sh" in smoke_command

ask = {
    "marker": "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_ASK_EXPORT_V1",
    "purpose": "public_node_first_external_receipt_ask_export",
    "status": "first_external_receipt_ask_ready",
    "local_base": local_base,
    "tester_share_page": tester_share,
    "tester_lane_summary": tester_lane_summary,
    "closeout_status": closeout_status,
    "real_data_import_lane_status": real_data_status,
    "standalone_smoke_command": smoke_command,
    "expected_green_marker": "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN",
    "expected_receipt_file": "tester-receipt.json",
    "send_back_instruction": "Send back the generated tester-receipt.json file after the smoke script prints the expected green marker.",
    "safety_boundary": {
        "public_routes_only": True,
        "public_upload": False,
        "operator_local_import_only": True,
        "money_movement": False,
        "wallet_send": False,
        "wc_to_void_swap": False,
        "buy_void_fulfillment": False,
        "validator_mutation": False,
        "trusted_as_network_truth": False,
    },
}

ask_json_path.write_text(json.dumps(ask, indent=2, sort_keys=True) + "\n")

ask_txt_path.write_text(f"""VOID Network first outside tester receipt request

Tester page:
{tester_share}

Machine-readable tester lane summary:
{tester_lane_summary}

Receipt closeout status:
{closeout_status}

Real-data lane status:
{real_data_status}

Run this smoke command:
{smoke_command}

Expected green marker:
VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN

Send back:
tester-receipt.json

Safety boundary:
- Public read-only routes only
- No public upload endpoint
- No wallet send
- No funds movement
- No WC swap
- No Buy VOID fulfillment
- No validator mutation
- Receipt is external evidence only, not network truth
""")

print("marker=VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_ASK_EXPORT_V1")
print("status=first_external_receipt_ask_ready")
print(f"tester_share_page={tester_share}")
print(f"closeout_status={closeout_status}")
print(f"real_data_import_lane_status={real_data_status}")
print("expected_green_marker=VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN")
print("expected_receipt_file=tester-receipt.json")
print("send_back_instruction=tester-receipt.json")
print("public_upload=false")
print("operator_local_import_only=true")
print("trusted_as_network_truth=false")
print(f"ask_txt={ask_txt_path}")
print(f"ask_json={ask_json_path}")
PY

echo "out=$OUT"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_ASK_EXPORT_V1_GREEN"
