#!/usr/bin/env bash
set -euo pipefail

RUN_PORT="${RUN_PORT:-4156}"
BASE="${BASE:-http://127.0.0.1:${RUN_PORT}}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-first-external-receipt-packet-status-ui-v1-proof-$STAMP"
mkdir -p "$OUT/data"

openssl genpkey -algorithm ED25519 -out "$OUT/nodeA.key" >/dev/null 2>&1
chmod 600 "$OUT/nodeA.key"

echo "=== Public Node First External Receipt Packet Status UI v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_STATUS_UI_V1" src/index.ts
grep -Fq "publicNodeFirstExternalReceiptPacketStatusCard" src/index.ts
grep -Fq "publicNodeFirstExternalReceiptPacketStatusLink" src/index.ts
grep -Fq "/public-node/first-external-receipt-packet-status.json" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_STATUS_UI_DOC_V1" docs/public/public-node-first-external-receipt-packet-status-ui.md

bash -n ops/mainnet0/public-node-first-external-receipt-packet-status-ui-proof.sh
bash -n ops/mainnet0/public-node-first-external-receipt-packet-status-proof.sh
bash -n ops/mainnet0/public-node-live-status-rollup.sh

npm run build
echo "[ok] source/docs/build"

PIDS="$(lsof -tiTCP:${RUN_PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

(
  export DATA_DIR="$OUT/data"
  export P2P_PORT=4756
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
  if curl --max-time 10 -fsS "$BASE/public-node" > "$OUT/public-node.html" 2>/dev/null; then
    echo "[ok] npm start server live"
    break
  fi
  sleep 0.25
done

curl -fsS "$BASE/public-node/first-external-receipt-packet-status.json" > "$OUT/packet-status.json"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_STATUS_UI_V1" "$OUT/public-node.html"
grep -Fq "publicNodeFirstExternalReceiptPacketStatusCard" "$OUT/public-node.html"
grep -Fq "publicNodeFirstExternalReceiptPacketStatusLink" "$OUT/public-node.html"
grep -Fq "Open packet status JSON" "$OUT/public-node.html"
grep -Fq "/public-node/first-external-receipt-packet-status.json" "$OUT/public-node.html"
grep -Fq "Public archive download:</span> <code>false</code>" "$OUT/public-node.html"
grep -Fq "Public upload:</span> <code>false</code>" "$OUT/public-node.html"
grep -Fq "Operator-local export only:</span> <code>true</code>" "$OUT/public-node.html"
grep -Fq "Trusted as network truth:</span> <code>false</code>" "$OUT/public-node.html"
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_STATUS_V1" "$OUT/packet-status.json"

echo "marker=VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_STATUS_UI_V1"
echo "card=publicNodeFirstExternalReceiptPacketStatusCard"
echo "link=/public-node/first-external-receipt-packet-status.json"
echo "public_archive_download=false"
echo "operator_local_export_only=true"
echo "public_upload=false"
echo "trusted_as_network_truth=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_STATUS_UI_V1_GREEN"
