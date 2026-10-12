#!/usr/bin/env bash
set -euo pipefail

RUN_PORT="${RUN_PORT:-4155}"
BASE="${BASE:-http://127.0.0.1:${RUN_PORT}}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-first-external-receipt-packet-status-v1-proof-$STAMP"
mkdir -p "$OUT/data"

openssl genpkey -algorithm ED25519 -out "$OUT/nodeA.key" >/dev/null 2>&1
chmod 600 "$OUT/nodeA.key"

echo "=== Public Node First External Receipt Packet Status v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_STATUS_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_STATUS_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_STATUS_DOC_V1" docs/public/public-node-first-external-receipt-packet-status.md
grep -Fq "/public-node/first-external-receipt-packet-status.json" src/index.ts

bash -n ops/mainnet0/public-node-first-external-receipt-packet-status-proof.sh
bash -n ops/mainnet0/public-node-first-external-receipt-packet-export.sh
bash -n ops/mainnet0/public-node-first-external-receipt-packet-archive.sh
bash -n ops/mainnet0/public-node-live-status-rollup.sh

npm run build
echo "[ok] source/docs/build"

PIDS="$(lsof -tiTCP:${RUN_PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

(
  export DATA_DIR="$OUT/data"
  export P2P_PORT=4755
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
  if curl --max-time 10 -fsS "$BASE/public-node/first-external-receipt-packet-status.json" > "$OUT/packet-status.json" 2>/dev/null; then
    echo "[ok] npm start server live"
    break
  fi
  sleep 0.25
done

curl -fsS "$BASE/public-node/route-index.json" > "$OUT/route-index.json"
curl -fsS "$BASE/public-node/route-manifest.json" > "$OUT/route-manifest.json"
curl -fsS "$BASE/public-node/self-check-snapshot.json" > "$OUT/self-check-snapshot.json"

python3 - "$OUT" "$BASE" <<'PY'
import json
import sys
from pathlib import Path

out = Path(sys.argv[1])
base = sys.argv[2].rstrip("/")

status = json.loads((out / "packet-status.json").read_text())
route_index = json.loads((out / "route-index.json").read_text())
route_manifest = json.loads((out / "route-manifest.json").read_text())
self_check = json.loads((out / "self-check-snapshot.json").read_text())

route = "/public-node/first-external-receipt-packet-status.json"
url = base + route

assert status["ok"] is True
assert status["marker"] == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_STATUS_V1"
assert status["route_marker"] == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_STATUS_ROUTE_V1"
assert status["purpose"] == "public_node_first_external_receipt_packet_status"
assert status["status"] == "first_external_receipt_packet_operator_export_ready"
assert status["effective_base_url"] == base

packet = status["packet_status"]
assert packet["packet_export_ready"] is True
assert packet["packet_archive_ready"] is True
assert packet["packet_archive_sha256_ready"] is True
assert packet["public_archive_download"] is False
assert packet["operator_local_export_only"] is True
assert packet["public_upload"] is False
assert packet["expected_receipt_file"] == "tester-receipt.json"
assert packet["expected_receipt_marker"] == "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1"
assert packet["expected_green_marker"] == "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"
assert packet["trusted_as_network_truth"] is False

policy = status["policy"]
assert policy["public_routes_only"] is True
assert policy["public_archive_download"] is False
assert policy["public_upload"] is False
assert policy["public_post_endpoint"] is False
assert policy["operator_local_export_only"] is True
assert policy["operator_local_import_only"] is True
assert policy["private_api"] is False
assert policy["mutation"] is False
assert policy["read_only"] is True
assert policy["trusted_as_network_truth"] is False

safety = status["safety"]
assert safety["money_movement"] is False
assert safety["wallet_send"] is False
assert safety["wc_to_void_swap"] is False
assert safety["buy_void_fulfillment"] is False
assert safety["validator_mutation"] is False

links = status["links"]
assert links["tester_share_page"] == base + "/public-node/tester-share"
assert links["tester_lane_summary"] == base + "/public-node/tester-lane-summary.json"
assert links["external_tester_receipt_closeout_status"] == base + "/public-node/external-tester-receipt-closeout-status.json"
assert links["real_data_import_lane_status"] == base + "/public-node/real-data-import-lane-status.json"
assert links["route_manifest"] == base + "/public-node/route-manifest.json"
assert links["self_check_snapshot"] == base + "/public-node/self-check-snapshot.json"

index_routes = route_index.get("routes", [])
assert any(r.get("path") == route and r.get("marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_STATUS_V1" for r in index_routes)

manifest_routes = route_manifest.get("routes", [])
assert any(r.get("path") == route and r.get("marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_STATUS_V1" for r in manifest_routes)

expected_routes = self_check.get("expected_routes", [])
assert route in expected_routes
assert self_check.get("links", {}).get("first_external_receipt_packet_status") == url

print("[ok] packet status json/discovery")
PY

echo "marker=VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_STATUS_V1"
echo "route=/public-node/first-external-receipt-packet-status.json"
echo "packet_export_ready=true"
echo "packet_archive_ready=true"
echo "packet_archive_sha256_ready=true"
echo "public_archive_download=false"
echo "operator_local_export_only=true"
echo "public_upload=false"
echo "public_post_endpoint=false"
echo "operator_local_import_only=true"
echo "trusted_as_network_truth=false"
echo "expected_green_marker=VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"
echo "expected_receipt_file=tester-receipt.json"
echo "route_index_discovery_green=true"
echo "route_manifest_discovery_green=true"
echo "self_check_discovery_green=true"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_STATUS_V1_GREEN"
