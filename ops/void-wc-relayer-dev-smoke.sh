#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:4311}"

echo "=== [wc-relayer-dev] health ==="
curl -fsS "$BASE_URL/health" | jq .

echo
echo "=== [wc-relayer-dev] quote (SEND_VOID) ==="
QUOTE_BODY='{
  "user": "0x0000000000000000000000000000000000000001",
  "to":   "0x0000000000000000000000000000000000000002",
  "data": "0x",
  "value": "0",
  "intent": "SEND_VOID"
}'

echo "$QUOTE_BODY" | jq .
echo

curl -fsS "$BASE_URL/api/wc-relayer/v1/quote" \
  -H 'content-type: application/json' \
  -d "$QUOTE_BODY" | jq .

echo
echo "=== [wc-relayer-dev] submit (dummy relayedCall + sig) ==="

SUBMIT_BODY='{
  "relayedCall": {
    "user":     "0x0000000000000000000000000000000000000001",
    "to":       "0x0000000000000000000000000000000000000002",
    "data":     "0x",
    "value":    "0",
    "nonce":    "0",
    "maxWCFee": "1000000000000000000",
    "deadline": "2000000000"
  },
  "signature": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
}'

echo "$SUBMIT_BODY" | jq .
echo

curl -fsS "$BASE_URL/api/wc-relayer/v1/submit" \
  -H 'content-type: application/json' \
  -d "$SUBMIT_BODY" | jq .

echo
echo "=== [wc-relayer-dev] smoke DONE ==="
