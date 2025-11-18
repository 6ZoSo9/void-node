#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

# Require the devnet key (same one you've been using)
: "${DEVNET_PRIVKEY:?set DEVNET_PRIVKEY}"

echo "[cycle] posting JobQueue job via void-devnet-postjob-demo.sh..."

JOB_ID=$(
  ~/.local/bin/void-devnet-postjob-demo.sh \
    | sed -n 's/^\[ok\][[:space:]]*jobId[[:space:]]*=[[:space:]]*//p'
)

if [ -z "${JOB_ID:-}" ]; then
  echo "[cycle][ERR] failed to capture JOB_ID from postjob output" >&2
  exit 1
fi

echo "[cycle] JOB_ID = $JOB_ID"
echo "[cycle] running agent once for that job..."

JOB_ID="$JOB_ID" ~/.local/bin/void-devnet-agent-receipt-once.sh

echo "[cycle] refreshing devnet receipts health textfile..."
~/.local/bin/void-receipts-devnet-health.sh || true

echo "[cycle] sleeping 10s for Prom scrape/eval..."
sleep 10

echo
echo "[cycle] Prometheus derived metrics:"
curl -sS --data-urlencode 'query=void:devnet_receipts:health' \
  'http://127.0.0.1:9090/api/v1/query' | jq .

curl -sS --data-urlencode 'query=void:devnet_receipts:total' \
  'http://127.0.0.1:9090/api/v1/query' | jq .

curl -sS --data-urlencode 'query=void:devnet_receipts:model_total' \
  'http://127.0.0.1:9090/api/v1/query' | jq .

curl -sS --data-urlencode 'query=void:devnet_receipts:models_with_receipts' \
  'http://127.0.0.1:9090/api/v1/query' | jq .
