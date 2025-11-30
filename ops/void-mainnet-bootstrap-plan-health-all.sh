#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "[plan-health] repo=$(pwd)"
echo "[plan-health] prom_url=${PROM_URL}"

echo
echo "[plan-health] checking raw PLAN health gauge..."
RAW=$(
  curl -fsS "${PROM_URL}/api/v1/query?query=void_mainnet_bootstrap_plan_health" \
    | jq -r '.data.result[0].value[1]' 2>/dev/null || echo "NaN"
)
echo "[plan-health]   void_mainnet_bootstrap_plan_health = ${RAW}"

echo
echo "[plan-health] checking 5m smoothed PLAN health..."
SMOOTH=$(
  curl -fsS "${PROM_URL}/api/v1/query?query=void:mainnet_bootstrap_plan:health:last_5m" \
    | jq -r '.data.result[0].value[1]' 2>/dev/null || echo "NaN"
)
echo "[plan-health]   void:mainnet_bootstrap_plan:health:last_5m = ${SMOOTH}"

echo
if [[ "${SMOOTH}" == "1" ]]; then
  echo "[plan-health] RESULT: OK (PLAN READY: last_5m == 1)"
  exit 0
fi

echo "[plan-health] RESULT: NOT READY (PLAN NOT LOCKED / NOT GREEN YET)"
exit 1
