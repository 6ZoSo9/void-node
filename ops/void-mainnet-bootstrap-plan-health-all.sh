#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "[plan-health-all] repo=$(pwd)"
echo "[plan-health-all] prom_url=$PROM_URL"

echo
echo "[plan-health-all] refreshing PLAN exporter (textfile)..."
./ops/void-mainnet-bootstrap-plan-health.sh

echo
echo "[plan-health-all] waiting briefly for node_exporter scrape..."
sleep 10

echo
echo "[plan-health-all] checking core PLAN health gauge..."
RAW=$(curl -fsS "$PROM_URL/api/v1/query?query=void_mainnet_bootstrap_plan_health" \
  | jq -r '.data.result[0].value[1] // "NaN"')

echo "  void_mainnet_bootstrap_plan_health = $RAW"

if [ "$RAW" != "1" ]; then
  echo "[plan-health-all] RESULT: BAD (raw gauge != 1)" >&2
  exit 1
fi

echo
echo "[plan-health-all] best-effort 5m smoothed view (optional)..."
SMOOTH=$(curl -fsS "$PROM_URL/api/v1/query?query=void:mainnet_bootstrap_plan:health:last_5m" \
  | jq -r '.data.result[0].value[1] // "null"')
echo "  void:mainnet_bootstrap_plan:health:last_5m = $SMOOTH"

echo
echo "[plan-health-all] RESULT: OK (PLAN health == 1)"
