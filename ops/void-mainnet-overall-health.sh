#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "=== [VOID mainnet core/tokenomics/overall – 5m recordings] ==="
echo

for q in \
  'void:mainnet_core:health:last_5m' \
  'void:mainnet_tokenomics:health:last_5m' \
  'void:mainnet_overall:health:last_5m'
do
  echo "[query] $q"
  curl -fsS "$PROM_URL/api/v1/query" \
    --data-urlencode "query=$q" \
    | jq '.data.result'
  echo
done

echo "=== [scalar] max(void:mainnet_overall:health:last_5m) ==="
curl -fsS "$PROM_URL/api/v1/query" \
  --data-urlencode 'query=max(void:mainnet_overall:health:last_5m)' \
  | jq '.data.result'
echo

echo "=== [alerts] VoidMainnetOverallUnhealthy (if any) ==="
curl -fsS "$PROM_URL/api/v1/alerts" \
  | jq '.data.alerts[]
        | select(.labels.alertname=="VoidMainnetOverallUnhealthy")
        | {alertname: .labels.alertname, state: .state, labels: .labels, annotations: .annotations}' \
  || echo "(no matching alerts or jq filter empty)"
echo

echo "[summary]"
echo "  - core       : expect value=1"
echo "  - tokenomics : expect value=1"
echo "  - overall    : expect value=1"
echo "  - max(overall) should be 1 and there should be NO active VoidMainnetOverallUnhealthy alerts."
