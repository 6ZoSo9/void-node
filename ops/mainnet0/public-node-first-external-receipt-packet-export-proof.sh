#!/usr/bin/env bash
set -euo pipefail

RUN_PORT="${RUN_PORT:-4153}"
BASE="${BASE:-http://127.0.0.1:${RUN_PORT}}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-first-external-receipt-packet-export-v1-proof-$STAMP"
mkdir -p "$OUT/data"

openssl genpkey -algorithm ED25519 -out "$OUT/nodeA.key" >/dev/null 2>&1
chmod 600 "$OUT/nodeA.key"

echo "=== Public Node First External Receipt Packet Export v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_EXPORT_V1" ops/mainnet0/public-node-first-external-receipt-packet-export.sh
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_EXPORT_DOC_V1" docs/public/public-node-first-external-receipt-packet-export.md

bash -n ops/mainnet0/public-node-first-external-receipt-packet-export.sh
bash -n ops/mainnet0/public-node-first-external-receipt-ask-export.sh
bash -n ops/mainnet0/public-node-live-status-rollup.sh

npm run build
echo "[ok] source/docs/build"

PIDS="$(lsof -tiTCP:${RUN_PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

(
  export DATA_DIR="$OUT/data"
  export P2P_PORT=4753
  export NODE_PRIVKEY_PATH="$OUT/nodeA.key"
  export PORT="${RUN_PORT}"
  export HTTP_PORT="${RUN_PORT}"
  export VOID_HTTP_PORT="${RUN_PORT}"
  export HOST=127.0.0.1
  export PUBLIC_NODE_EXTERNAL_BASE_URL="$BASE"
  npm start
) > "$OUT/server.log" 2>&1 &

PID="$!"
trap 'kill "$PID" 2>/dev/null || true' EXIT

for i in $(seq 1 100); do
  if curl --max-time 10 -fsS "$BASE/public-node/first-tester-request-copy-pack.json" > "$OUT/first-tester-request-copy-pack.json" 2>/dev/null; then
    echo "[ok] npm start server live"
    break
  fi
  sleep 0.25
done

EXPORT_OUT="$OUT/export"
LOCAL_BASE="$BASE" OUT="$EXPORT_OUT" ops/mainnet0/public-node-first-external-receipt-packet-export.sh | tee "$OUT/packet-export.log"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_EXPORT_V1_GREEN" "$OUT/packet-export.log"
grep -Fq "status=first_external_receipt_packet_ready" "$OUT/packet-export.log"
grep -Fq "expected_green_marker=VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN" "$OUT/packet-export.log"
grep -Fq "expected_receipt_file=tester-receipt.json" "$OUT/packet-export.log"
grep -Fq "public_upload=false" "$OUT/packet-export.log"
grep -Fq "operator_local_import_only=true" "$OUT/packet-export.log"
grep -Fq "trusted_as_network_truth=false" "$OUT/packet-export.log"

PACKET="$EXPORT_OUT/first-external-receipt-packet"

for f in \
  README.txt \
  first-external-receipt-ask.txt \
  first-external-receipt-ask.json \
  closeout-status.json \
  tester-lane-summary.json \
  real-data-import-lane-status.json \
  packet-manifest.json
do
  test -s "$PACKET/$f"
done

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_EXPORT_V1" "$PACKET/README.txt"
grep -Fq "$BASE/public-node/tester-share" "$PACKET/README.txt"
grep -Fq "$BASE/public-node/external-tester-receipt-closeout-status.json" "$PACKET/README.txt"
grep -Fq "$BASE/public-node/real-data-import-lane-status.json" "$PACKET/README.txt"
grep -Fq "tester-receipt.json" "$PACKET/README.txt"
grep -Fq "No public upload endpoint" "$PACKET/README.txt"

python3 - "$PACKET" "$BASE" <<'PY'
import json
import sys
from pathlib import Path

packet = Path(sys.argv[1])
base = sys.argv[2].rstrip("/")

manifest = json.loads((packet / "packet-manifest.json").read_text())
ask = json.loads((packet / "first-external-receipt-ask.json").read_text())
closeout = json.loads((packet / "closeout-status.json").read_text())
lane = json.loads((packet / "tester-lane-summary.json").read_text())

assert manifest["marker"] == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_EXPORT_V1"
assert manifest["purpose"] == "public_node_first_external_receipt_packet_export"
assert manifest["status"] == "first_external_receipt_packet_ready"
assert manifest["tester_share_page"] == base + "/public-node/tester-share"
assert manifest["closeout_status"] == base + "/public-node/external-tester-receipt-closeout-status.json"
assert manifest["real_data_import_lane_status"] == base + "/public-node/real-data-import-lane-status.json"
assert "standalone-outside-tester-smoke.sh" in manifest["standalone_smoke_command"]
assert manifest["expected_green_marker"] == "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"
assert manifest["expected_receipt_file"] == "tester-receipt.json"

assert ask["closeout_status"] == manifest["closeout_status"]
assert closeout["marker"] == "VOID_PUBLIC_NODE_EXTERNAL_TESTER_RECEIPT_CLOSEOUT_STATUS_V1"
assert closeout["policy"]["public_post_endpoint"] is False
assert closeout["policy"]["operator_local_import_only"] is True
assert closeout["policy"]["trusted_as_network_truth"] is False

assert lane["marker"] == "VOID_PUBLIC_NODE_TESTER_LANE_SUMMARY_V1"
assert lane["tester_lane"]["real_data_status_ready"] is True

boundary = manifest["safety_boundary"]
assert boundary["public_upload"] is False
assert boundary["operator_local_import_only"] is True
assert boundary["trusted_as_network_truth"] is False

print("[ok] packet manifest json")
PY

echo "marker=VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_EXPORT_V1"
echo "script=ops/mainnet0/public-node-first-external-receipt-packet-export.sh"
echo "doc=docs/public/public-node-first-external-receipt-packet-export.md"
echo "packet_dir=$PACKET"
echo "tester_share_page=$BASE/public-node/tester-share"
echo "closeout_status=$BASE/public-node/external-tester-receipt-closeout-status.json"
echo "expected_green_marker=VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"
echo "expected_receipt_file=tester-receipt.json"
echo "public_upload=false"
echo "operator_local_import_only=true"
echo "trusted_as_network_truth=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_EXPORT_V1_GREEN"
