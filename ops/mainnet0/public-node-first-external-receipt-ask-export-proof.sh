#!/usr/bin/env bash
set -euo pipefail

RUN_PORT="${RUN_PORT:-4152}"
BASE="${BASE:-http://127.0.0.1:${RUN_PORT}}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-first-external-receipt-ask-export-v1-proof-$STAMP"
mkdir -p "$OUT/data"

openssl genpkey -algorithm ED25519 -out "$OUT/nodeA.key" >/dev/null 2>&1
chmod 600 "$OUT/nodeA.key"

echo "=== Public Node First External Receipt Ask Export v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_ASK_EXPORT_V1" ops/mainnet0/public-node-first-external-receipt-ask-export.sh
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_ASK_EXPORT_DOC_V1" docs/public/public-node-first-external-receipt-ask-export.md
grep -Fq "first-external-receipt-ask.txt" docs/public/public-node-first-external-receipt-ask-export.md

bash -n ops/mainnet0/public-node-first-external-receipt-ask-export.sh
bash -n ops/mainnet0/public-node-external-tester-receipt-closeout-status-proof.sh
bash -n ops/mainnet0/public-node-live-status-rollup.sh

npm run build
echo "[ok] source/docs/build"

PIDS="$(lsof -tiTCP:${RUN_PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

(
  export DATA_DIR="$OUT/data"
  export P2P_PORT=4752
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
LOCAL_BASE="$BASE" OUT="$EXPORT_OUT" ops/mainnet0/public-node-first-external-receipt-ask-export.sh | tee "$OUT/export.log"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_ASK_EXPORT_V1_GREEN" "$OUT/export.log"
grep -Fq "status=first_external_receipt_ask_ready" "$OUT/export.log"
grep -Fq "expected_green_marker=VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN" "$OUT/export.log"
grep -Fq "expected_receipt_file=tester-receipt.json" "$OUT/export.log"
grep -Fq "public_upload=false" "$OUT/export.log"
grep -Fq "operator_local_import_only=true" "$OUT/export.log"
grep -Fq "trusted_as_network_truth=false" "$OUT/export.log"

test -s "$EXPORT_OUT/first-external-receipt-ask.txt"
test -s "$EXPORT_OUT/first-external-receipt-ask.json"

grep -Fq "VOID Network first outside tester receipt request" "$EXPORT_OUT/first-external-receipt-ask.txt"
grep -Fq "$BASE/public-node/tester-share" "$EXPORT_OUT/first-external-receipt-ask.txt"
grep -Fq "$BASE/public-node/external-tester-receipt-closeout-status.json" "$EXPORT_OUT/first-external-receipt-ask.txt"
grep -Fq "$BASE/public-node/real-data-import-lane-status.json" "$EXPORT_OUT/first-external-receipt-ask.txt"
grep -Fq "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN" "$EXPORT_OUT/first-external-receipt-ask.txt"
grep -Fq "tester-receipt.json" "$EXPORT_OUT/first-external-receipt-ask.txt"
grep -Fq "No public upload endpoint" "$EXPORT_OUT/first-external-receipt-ask.txt"

python3 - "$EXPORT_OUT/first-external-receipt-ask.json" "$BASE" <<'PY'
import json
import sys

ask = json.loads(open(sys.argv[1], "r", encoding="utf-8").read())
base = sys.argv[2].rstrip("/")

assert ask["marker"] == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_ASK_EXPORT_V1"
assert ask["purpose"] == "public_node_first_external_receipt_ask_export"
assert ask["status"] == "first_external_receipt_ask_ready"
assert ask["tester_share_page"] == base + "/public-node/tester-share"
assert ask["closeout_status"] == base + "/public-node/external-tester-receipt-closeout-status.json"
assert ask["real_data_import_lane_status"] == base + "/public-node/real-data-import-lane-status.json"
assert "standalone-outside-tester-smoke.sh" in ask["standalone_smoke_command"]
assert ask["expected_green_marker"] == "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"
assert ask["expected_receipt_file"] == "tester-receipt.json"
assert "tester-receipt.json" in ask["send_back_instruction"]

boundary = ask["safety_boundary"]
assert boundary["public_routes_only"] is True
assert boundary["public_upload"] is False
assert boundary["operator_local_import_only"] is True
assert boundary["money_movement"] is False
assert boundary["wallet_send"] is False
assert boundary["wc_to_void_swap"] is False
assert boundary["buy_void_fulfillment"] is False
assert boundary["validator_mutation"] is False
assert boundary["trusted_as_network_truth"] is False

print("[ok] ask export json")
PY

echo "marker=VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_ASK_EXPORT_V1"
echo "script=ops/mainnet0/public-node-first-external-receipt-ask-export.sh"
echo "doc=docs/public/public-node-first-external-receipt-ask-export.md"
echo "ask_txt=$EXPORT_OUT/first-external-receipt-ask.txt"
echo "ask_json=$EXPORT_OUT/first-external-receipt-ask.json"
echo "tester_share_page=$BASE/public-node/tester-share"
echo "closeout_status=$BASE/public-node/external-tester-receipt-closeout-status.json"
echo "expected_green_marker=VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"
echo "expected_receipt_file=tester-receipt.json"
echo "public_upload=false"
echo "operator_local_import_only=true"
echo "trusted_as_network_truth=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_ASK_EXPORT_V1_GREEN"
