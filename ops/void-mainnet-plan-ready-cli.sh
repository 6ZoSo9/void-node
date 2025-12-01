#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "=== [mainnet-plan-ready] check void:mainnet_plan:ready ==="
echo "[cfg] PROM_URL = ${PROM_URL}"
echo

RAW_JSON=$(curl -fsS "${PROM_URL}/api/v1/query" \
  --get --data-urlencode 'query=void:mainnet_plan:ready')

VALUE=$(printf '%s\n' "${RAW_JSON}" | jq -r '.data.result[0].value[1] // empty')

if [[ -z "${VALUE}" ]]; then
  echo "[FATAL] void:mainnet_plan:ready has no data (no recording rule output)."
  echo "        Check Prom rules + reload, and that void_mainnet_bootstrap_plan_health exists."
  exit 1
fi

echo "void:mainnet_plan:ready = ${VALUE}"

if [[ "${VALUE}" != "1" ]]; then
  echo "[FATAL] PLAN is NOT ready (void:mainnet_plan:ready != 1)."
  exit 1
fi

echo "[OK] PLAN is ready (void:mainnet_plan:ready == 1)."
