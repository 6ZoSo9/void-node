#!/usr/bin/env bash
set -euo pipefail

REPO=${REPO:-"$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"}
PROM_URL=${PROM_URL:-"http://127.0.0.1:9090"}

cd "$REPO"

echo "[agent-e2e] repo=$REPO"
echo "[agent-e2e] prom_url=$PROM_URL"
echo

q() {
  local query="$1"
  curl -fsS "$PROM_URL/api/v1/query" \
    --data-urlencode "query=$query"
}

get_gauge() {
  local query="$1"
  q "$query" | jq -r '.data.result[0].value[1]'
}

echo "[agent-e2e] step 1: registry health gauges..."

models_health=$(get_gauge 'void_models_devnet_health{chain="devnet"}')
datasets_health=$(get_gauge 'void_datasets_devnet_health{chain="devnet"}')
agentreg_health=$(get_gauge 'void_agentreg_devnet_health{chain="devnet"}')

echo "[agent-e2e] void_models_devnet_health   = $models_health"
echo "[agent-e2e] void_datasets_devnet_health = $datasets_health"
echo "[agent-e2e] void_agentreg_devnet_health = $agentreg_health"

if [[ "$models_health" != "1" || "$datasets_health" != "1" || "$agentreg_health" != "1" ]]; then
  echo "[agent-e2e] ERROR: one or more registry health gauges != 1" >&2
  exit 1
fi

echo
echo "[agent-e2e] step 2: job/receipt coverage gauges..."

coverage=$(get_gauge 'void_devnet_coverage{chain="devnet"}')
coverage_health=$(get_gauge 'void_devnet_coverage_health{chain="devnet"}')
receipts_cov_v2=$(get_gauge 'void_devnet_receipts_coverage_v2{chain="devnet"}')
receipts_health_v2=$(get_gauge 'void_devnet_receipts_health_v2{chain="devnet"}')

echo "[agent-e2e] void_devnet_coverage             = $coverage"
echo "[agent-e2e] void_devnet_coverage_health      = $coverage_health"
echo "[agent-e2e] void_devnet_receipts_coverage_v2 = $receipts_cov_v2"
echo "[agent-e2e] void_devnet_receipts_health_v2   = $receipts_health_v2"

if [[ "$coverage" != "1" || "$coverage_health" != "1" || "$receipts_health_v2" != "1" ]]; then
  echo "[agent-e2e] ERROR: coverage/health gauges not all 1" >&2
  exit 1
fi

echo
echo "[agent-e2e] step 3: overall devnet health gauges..."

overall_raw=$(get_gauge 'void:devnet_overall_with_jobs_v2:health:last_5m{chain="devnet"}')
overall_5m=$(get_gauge 'void:devnet_overall:max_5m{chain="devnet"}')

echo "[agent-e2e] void:devnet_overall_with_jobs_v2:health:last_5m   = $overall_raw"
echo "[agent-e2e] void:devnet_overall:max_5m   = $overall_5m"

if [[ "$overall_raw" != "1" || "$overall_5m" != "1" ]]; then
  echo "[agent-e2e] ERROR: overall devnet health gauges not both 1" >&2
  exit 1
fi

echo
echo "[agent-e2e] RESULT: OK (registries healthy, coverage==1, overall==1)"
