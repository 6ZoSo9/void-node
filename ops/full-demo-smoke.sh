#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-${MAIN_BASE:-http://127.0.0.1:4100}}"
WC_BASE="${WC_BASE:-http://127.0.0.1:4312/workcredits/devnet}"
ACCOUNT="${ACCOUNT:-${WC_ADDR:-demo-user}}"
WC_ADDR="${WC_ADDR:-}"

fail(){ echo "FAIL: $*" >&2; exit 1; }

echo "=== [0] health ==="
curl -fsS --max-time 5 "${BASE}/health" >/dev/null
echo "[ok] health"
echo

echo "=== [1] wc before ==="
POOL_BEFORE="$(curl -fsS --max-time 5 "${WC_BASE}/pool.json")"
echo "$POOL_BEFORE"

EARN_BEFORE=0
if [ -n "$WC_ADDR" ]; then
  ACC_BEFORE="$(curl -fsS --max-time 5 "${WC_BASE}/account/${WC_ADDR}.json")"
  echo "$ACC_BEFORE"
  EARN_BEFORE="$(printf '%s' "$ACC_BEFORE" | python3 -c 'import sys,json; j=json.load(sys.stdin); print(int((j.get("earnings") or {}).get("redeemable_wc") or 0))')"
fi
echo "redeemable_wc_before=$EARN_BEFORE"
echo

echo "=== [2] autoprop smoke ==="
BASE="$BASE" MAIN_BASE="$BASE" ./ops/autoprop-smoke.sh
echo

echo "=== [3] datanet loopproof ==="
BODY="void-datanet-loop-proof-$(date +%s)-$$-$(openssl rand -hex 4 2>/dev/null || echo nossl)"
BODY_B64="$(printf '%s' "$BODY" | base64 -w0)"
PUB="$(curl -fsS --max-time 20 \
  -H 'content-type: application/json' \
  -X POST "${BASE}/datanet/v1/publish?who=${ACCOUNT}" \
  --data '{"name":"loopproof.txt","mime":"text/plain","plaintext_b64":"'"$BODY_B64"'"}')"
echo "[ok] publish_http=200"
echo "publish_body:"
echo "$PUB"
DATASET_ID="$(printf '%s' "$PUB" | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')"
ROOT="$(printf '%s' "$PUB" | python3 -c 'import sys,json; print(json.load(sys.stdin)["merkleRootHex"])')"
BYTES="$(printf '%s' "$PUB" | python3 -c 'import sys,json; print(json.load(sys.stdin)["sizeBytes"])')"
echo "datasetId=$DATASET_ID"
echo "root=$ROOT"
echo "bytes=$BYTES"
echo

echo "=== [4] fetch ==="
FETCH="$(curl -fsS --max-time 20 "${BASE}/datanet/v1/fetch?id=${DATASET_ID}&who=${ACCOUNT}")"
echo "[ok] fetch_http=200"
echo "fetch_body:"
echo "$FETCH"
FETCH_B64="$(printf '%s' "$FETCH" | python3 -c 'import sys,json; print(json.load(sys.stdin)["cipher_b64"])')"
[ "$FETCH_B64" = "$BODY_B64" ] || fail "loopproof mismatch"
echo "[ok] loopproof match (b64)"
echo

echo "=== [5] receipt ==="
LEAF="$(printf '%s' "$FETCH" | python3 -c 'import sys,json; j=json.load(sys.stdin); print(j["manifest"]["chunks"][0]["leafHashHex"])')"
ROOT_FROM_FETCH="$(printf '%s' "$FETCH" | python3 -c 'import sys,json; j=json.load(sys.stdin); print(j["manifest"]["merkleRootHex"])')"
INDEX_FROM_FETCH="$(printf '%s' "$FETCH" | python3 -c 'import sys,json; j=json.load(sys.stdin); print(int(j["manifest"]["chunks"][0]["index"]))')"
PLAIN_SHA256="$LEAF"
RECEIPT="$(curl -fsS --max-time 20 \
  -H 'content-type: application/json' \
  -X POST "${BASE}/datanet/v1/receipt" \
  --data '{"who":"'"$ACCOUNT"'","id":"'"$DATASET_ID"'","root":"'"$ROOT_FROM_FETCH"'","leaf":"'"$LEAF"'","index":'"$INDEX_FROM_FETCH"',"plain_sha256":"'"$PLAIN_SHA256"'"}')"
echo "[ok] receipt_http=200"
echo "$RECEIPT"
echo

echo "=== [6] wc after (diagnostic only) ==="
POOL_AFTER="$(curl -fsS --max-time 5 "${WC_BASE}/pool.json")"
echo "$POOL_AFTER"

ACC_AFTER=""
EARN_AFTER=""
if [ -n "$WC_ADDR" ]; then
  ACC_AFTER="$(curl -fsS --max-time 5 "${WC_BASE}/account/${WC_ADDR}.json" || true)"
  if [ -n "$ACC_AFTER" ]; then
    echo "$ACC_AFTER"
    EARN_AFTER="$(printf '%s' "$ACC_AFTER" | python3 -c 'import sys,json; j=json.load(sys.stdin); print(int((j.get("earnings") or {}).get("redeemable_wc") or 0))')"
    echo "helper_redeemable_wc_after=$EARN_AFTER"
    if [ -n "${EARN_BEFORE:-}" ]; then
      echo "helper_redeemable_wc_delta=$((EARN_AFTER-EARN_BEFORE))"
    fi
  else
    echo "helper_redeemable_wc_after=n/a"
    echo "helper_redeemable_wc_delta=n/a"
  fi
fi

echo
echo "=== [7] raw participant truth ==="
echo "--- /receipts"
curl -fsS --max-time 8 "${BASE}/receipts?account=${ACCOUNT:-demo-user}&limit=5" | sed -n '1,220p' || true
echo
echo "--- /wc/ledger"
curl -fsS --max-time 8 "${BASE}/wc/ledger?account=${ACCOUNT:-demo-user}&limit=5" | sed -n '1,220p' || true
echo
echo "--- raw datanet receipt tail"
DATA_DIR_LOCAL="${DATA_DIR:-data_a}"
tail -n 5 "${DATA_DIR_LOCAL}/datanet/receipts/datanet.jsonl" 2>/dev/null || true
echo
echo "--- raw wc ledger tail"
tail -n 5 "${DATA_DIR_LOCAL}/wc_v1/ledger.jsonl" 2>/dev/null || true

echo
echo "wc_earnings_delta=$((EARN_AFTER - EARN_BEFORE))"

echo
echo "[ok] full demo smoke passed"
