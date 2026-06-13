#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-first-external-receipt-packet-export-$STAMP}"
PACKET_DIR="$OUT/first-external-receipt-packet"

mkdir -p "$PACKET_DIR"

LOCAL_BASE="$LOCAL_BASE" OUT="$PACKET_DIR" ops/mainnet0/public-node-first-external-receipt-ask-export.sh > "$PACKET_DIR/ask-export.log"

cp "$PACKET_DIR/external-tester-receipt-closeout-status.json" "$PACKET_DIR/closeout-status.json"

curl -fsS "$LOCAL_BASE/public-node/tester-lane-summary.json" > "$PACKET_DIR/tester-lane-summary.json"
curl -fsS "$LOCAL_BASE/public-node/real-data-import-lane-status.json" > "$PACKET_DIR/real-data-import-lane-status.json"

python3 - "$PACKET_DIR" "$LOCAL_BASE" <<'PY'
import json
import sys
from pathlib import Path

packet_dir = Path(sys.argv[1])
local_base = sys.argv[2].rstrip("/")

ask = json.loads((packet_dir / "first-external-receipt-ask.json").read_text())
closeout = json.loads((packet_dir / "closeout-status.json").read_text())
lane = json.loads((packet_dir / "tester-lane-summary.json").read_text())
real_data = json.loads((packet_dir / "real-data-import-lane-status.json").read_text())

assert ask.get("marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_ASK_EXPORT_V1"
assert ask.get("status") == "first_external_receipt_ask_ready"
assert ask.get("expected_green_marker") == "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"
assert ask.get("expected_receipt_file") == "tester-receipt.json"

assert closeout.get("marker") == "VOID_PUBLIC_NODE_EXTERNAL_TESTER_RECEIPT_CLOSEOUT_STATUS_V1"
assert closeout.get("purpose") == "public_node_external_tester_receipt_closeout_status"
assert closeout.get("closeout", {}).get("receipt_required") is True
assert closeout.get("closeout", {}).get("safe_import_guard_ready") is True
assert closeout.get("policy", {}).get("public_post_endpoint") is False
assert closeout.get("policy", {}).get("operator_local_import_only") is True
assert closeout.get("policy", {}).get("trusted_as_network_truth") is False

assert lane.get("marker") == "VOID_PUBLIC_NODE_TESTER_LANE_SUMMARY_V1"
assert lane.get("tester_lane", {}).get("real_data_status_ready") is True
assert lane.get("links", {}).get("real_data_import_lane_status", "").endswith("/public-node/real-data-import-lane-status.json")

assert "VOID_PUBLIC_NODE_REAL_DATA_IMPORT_LANE_STATUS" in str(real_data.get("marker", "")) or real_data.get("purpose") == "machine_readable_real_data_import_lane_status"

closeout_status = ask["closeout_status"]
assert closeout_status.endswith("/public-node/external-tester-receipt-closeout-status.json")
assert not closeout_status.startswith("http://127.0.0.1:4100")

packet_manifest = {
    "marker": "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_EXPORT_V1",
    "purpose": "public_node_first_external_receipt_packet_export",
    "status": "first_external_receipt_packet_ready",
    "local_base": local_base,
    "files": [
        "README.txt",
        "first-external-receipt-ask.txt",
        "first-external-receipt-ask.json",
        "closeout-status.json",
        "tester-lane-summary.json",
        "real-data-import-lane-status.json",
        "packet-manifest.json",
    ],
    "tester_share_page": ask["tester_share_page"],
    "closeout_status": closeout_status,
    "real_data_import_lane_status": ask["real_data_import_lane_status"],
    "standalone_smoke_command": ask["standalone_smoke_command"],
    "expected_green_marker": "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN",
    "expected_receipt_file": "tester-receipt.json",
    "safety_boundary": ask["safety_boundary"],
}

(packet_dir / "packet-manifest.json").write_text(json.dumps(packet_manifest, indent=2, sort_keys=True) + "\n")

(packet_dir / "README.txt").write_text(f"""VOID Network first external receipt packet

Marker:
VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_EXPORT_V1

Status:
first_external_receipt_packet_ready

Tester page:
{ask['tester_share_page']}

Receipt closeout status:
{closeout_status}

Real-data lane status:
{ask['real_data_import_lane_status']}

Run this smoke command:
{ask['standalone_smoke_command']}

Expected green marker:
VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN

Expected file back from tester:
tester-receipt.json

Files in this packet:
- first-external-receipt-ask.txt
- first-external-receipt-ask.json
- closeout-status.json
- tester-lane-summary.json
- real-data-import-lane-status.json
- packet-manifest.json

Safety boundary:
- Public read-only routes only
- No public upload endpoint
- Operator-local receipt import only
- No wallet send
- No funds movement
- No WC swap
- No Buy VOID fulfillment
- No validator mutation
- Receipt is external evidence only, not network truth
""")

print("marker=VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_EXPORT_V1")
print("status=first_external_receipt_packet_ready")
print(f"packet_dir={packet_dir}")
print(f"tester_share_page={ask['tester_share_page']}")
print(f"closeout_status={closeout_status}")
print(f"real_data_import_lane_status={ask['real_data_import_lane_status']}")
print("expected_green_marker=VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN")
print("expected_receipt_file=tester-receipt.json")
print("public_upload=false")
print("operator_local_import_only=true")
print("trusted_as_network_truth=false")
PY

echo "packet_dir=$PACKET_DIR"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_EXPORT_V1_GREEN"
