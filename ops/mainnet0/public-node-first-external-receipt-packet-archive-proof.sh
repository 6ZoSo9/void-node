#!/usr/bin/env bash
set -euo pipefail

RUN_PORT="${RUN_PORT:-4154}"
BASE="${BASE:-http://127.0.0.1:${RUN_PORT}}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-first-external-receipt-packet-archive-v1-proof-$STAMP"
mkdir -p "$OUT/data"

openssl genpkey -algorithm ED25519 -out "$OUT/nodeA.key" >/dev/null 2>&1
chmod 600 "$OUT/nodeA.key"

echo "=== Public Node First External Receipt Packet Archive v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_ARCHIVE_V1" ops/mainnet0/public-node-first-external-receipt-packet-archive.sh
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_ARCHIVE_DOC_V1" docs/public/public-node-first-external-receipt-packet-archive.md

bash -n ops/mainnet0/public-node-first-external-receipt-packet-archive.sh
bash -n ops/mainnet0/public-node-first-external-receipt-packet-export.sh
bash -n ops/mainnet0/public-node-first-external-receipt-ask-export.sh

npm run build
echo "[ok] source/docs/build"

PIDS="$(lsof -tiTCP:${RUN_PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

(
  export DATA_DIR="$OUT/data"
  export P2P_PORT=4754
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

ARCHIVE_OUT="$OUT/archive"
LOCAL_BASE="$BASE" OUT="$ARCHIVE_OUT" ops/mainnet0/public-node-first-external-receipt-packet-archive.sh | tee "$OUT/archive.log"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_ARCHIVE_V1_GREEN" "$OUT/archive.log"
grep -Fq "status=first_external_receipt_packet_archive_ready" "$OUT/archive.log"
grep -Fq "expected_green_marker=VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN" "$OUT/archive.log"
grep -Fq "expected_receipt_file=tester-receipt.json" "$OUT/archive.log"
grep -Fq "public_upload=false" "$OUT/archive.log"
grep -Fq "operator_local_import_only=true" "$OUT/archive.log"
grep -Fq "trusted_as_network_truth=false" "$OUT/archive.log"

test -s "$ARCHIVE_OUT/first-external-receipt-packet.tar.gz"
test -s "$ARCHIVE_OUT/first-external-receipt-packet.tar.gz.sha256"

sha256sum -c "$ARCHIVE_OUT/first-external-receipt-packet.tar.gz.sha256"

TAR_LIST="$OUT/archive-list.txt"
tar -tzf "$ARCHIVE_OUT/first-external-receipt-packet.tar.gz" > "$TAR_LIST"

grep -Fq "first-external-receipt-packet/README.txt" "$TAR_LIST"
grep -Fq "first-external-receipt-packet/first-external-receipt-ask.txt" "$TAR_LIST"
grep -Fq "first-external-receipt-packet/first-external-receipt-ask.json" "$TAR_LIST"
grep -Fq "first-external-receipt-packet/closeout-status.json" "$TAR_LIST"
grep -Fq "first-external-receipt-packet/tester-lane-summary.json" "$TAR_LIST"
grep -Fq "first-external-receipt-packet/real-data-import-lane-status.json" "$TAR_LIST"
grep -Fq "first-external-receipt-packet/packet-manifest.json" "$TAR_LIST"

TMP_UNPACK="$OUT/unpack"
mkdir -p "$TMP_UNPACK"
tar -xzf "$ARCHIVE_OUT/first-external-receipt-packet.tar.gz" -C "$TMP_UNPACK"

grep -Fq "$BASE/public-node/external-tester-receipt-closeout-status.json" "$TMP_UNPACK/first-external-receipt-packet/README.txt"
grep -Fq "$BASE/public-node/external-tester-receipt-closeout-status.json" "$TMP_UNPACK/first-external-receipt-packet/packet-manifest.json"

if grep -R "http://127.0.0.1:4100/public-node/external-tester-receipt-closeout-status.json" "$TMP_UNPACK/first-external-receipt-packet" >/dev/null; then
  echo "bad_local_closeout_url_in_archive=true"
  exit 1
fi

echo "marker=VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_ARCHIVE_V1"
echo "script=ops/mainnet0/public-node-first-external-receipt-packet-archive.sh"
echo "doc=docs/public/public-node-first-external-receipt-packet-archive.md"
echo "archive=$ARCHIVE_OUT/first-external-receipt-packet.tar.gz"
echo "sha256_file=$ARCHIVE_OUT/first-external-receipt-packet.tar.gz.sha256"
echo "tester_share_page=$BASE/public-node/tester-share"
echo "closeout_status=$BASE/public-node/external-tester-receipt-closeout-status.json"
echo "expected_green_marker=VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"
echo "expected_receipt_file=tester-receipt.json"
echo "public_upload=false"
echo "operator_local_import_only=true"
echo "trusted_as_network_truth=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_ARCHIVE_V1_GREEN"
