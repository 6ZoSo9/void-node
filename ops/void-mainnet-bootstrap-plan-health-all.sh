#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
METRIC="void_mainnet_bootstrap_plan_health"

echo "[plan-health-all] repo=$(pwd)"
echo "[plan-health-all] prom_url=${PROM_URL}"
echo

echo "[plan-health-all] querying ${METRIC}..."
RAW=$(curl -fsS "${PROM_URL}/api/v1/query?query=${METRIC}" \
  | jq -r '.data.result[0].value[1] // "NaN"' || echo "NaN")

echo "  ${METRIC} = ${RAW}"
echo

if [[ "${RAW}" != "1" ]]; then
  echo "[plan-health-all] RESULT: BAD (expected ${METRIC} == 1)"
  exit 1
fi

echo "[plan-health-all] RESULT: OK (${METRIC} == 1)"
