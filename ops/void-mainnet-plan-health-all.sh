#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "=== [plan-health-all] VOID mainnet bootstrap PLAN health ==="
echo "[plan-health-all] repo=$REPO_ROOT"
echo "[plan-health-all] prom_url=$PROM_URL"
echo

cd "$REPO_ROOT"

echo "[plan-health-all] querying void_mainnet_bootstrap_plan_health..."
raw_value="$(curl -fsS "$PROM_URL/api/v1/query?query=void_mainnet_bootstrap_plan_health" \
  | jq -r '.data.result[0].value[1]' 2>/dev/null || echo "NaN")"

echo "  void_mainnet_bootstrap_plan_health = $raw_value"
echo

if [[ "$raw_value" == "1" ]]; then
  echo "[plan-health-all] RESULT: OK (void_mainnet_bootstrap_plan_health == 1)"
  exit 0
else
  echo "[plan-health-all] RESULT: ERROR (expected 1, got $raw_value)"
  exit 1
fi
