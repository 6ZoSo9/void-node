#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "[plan-status] PROM_URL=$PROM_URL"
echo

echo "=== [1] raw PLAN gauges ==="

for METRIC in \
  void_mainnet_bootstrap_plan_configured \
  void_mainnet_bootstrap_plan_health
do
  echo
  echo ">>> $METRIC"
  curl -fsS "$PROM_URL/api/v1/query?query=$METRIC" \
    | jq '.data.result'
done

echo
echo ">>> void_mainnet_bootstrap_plan_health_info"
curl -fsS "$PROM_URL/api/v1/query?query=void_mainnet_bootstrap_plan_health_info" \
  | jq '.data.result'

echo
echo ">>> void:mainnet_bootstrap_plan:health:last_5m"
curl -fsS "$PROM_URL/api/v1/query?query=void:mainnet_bootstrap_plan:health:last_5m" \
  | jq '.data.result'

echo
echo "=== [2] summary ==="

CONFIGURED=$(curl -fsS "$PROM_URL/api/v1/query?query=void_mainnet_bootstrap_plan_configured" \
  | jq -r '.data.result[0].value[1] // "NaN"' 2>/dev/null || echo "NaN")

HEALTH=$(curl -fsS "$PROM_URL/api/v1/query?query=void_mainnet_bootstrap_plan_health" \
  | jq -r '.data.result[0].value[1] // "NaN"' 2>/dev/null || echo "NaN")

HEALTH5=$(curl -fsS "$PROM_URL/api/v1/query?query=void:mainnet_bootstrap_plan:health:last_5m" \
  | jq -r '.data.result[0].value[1] // "NaN"' 2>/dev/null || echo "NaN")

REASON=$(curl -fsS "$PROM_URL/api/v1/query?query=void_mainnet_bootstrap_plan_health_info" \
  | jq -r '.data.result[0].metric.reason // "unknown"' 2>/dev/null || echo "unknown")

echo "[summary] configured = $CONFIGURED"
echo "[summary] health     = $HEALTH"
echo "[summary] health_5m  = $HEALTH5"
echo "[summary] reason     = $REASON"

if [[ "$CONFIGURED" != "1" ]]; then
  echo "[summary] PLAN exporter not fully configured yet (configured != 1)."
fi

if [[ "$HEALTH5" == "1" ]]; then
  echo "[summary] PLAN is GREEN (5m smoothed health == 1)."
else
  echo "[summary] PLAN is NOT ready (health_5m != 1)."
fi

echo
echo "=== [3] next steps hint ==="
if [[ "$REASON" == "bad_roles" ]]; then
  echo "- Roles in config/void-mainnet-bootstrap-mainnet.live.json are placeholders or missing."
  echo "- Fill them with real hardware-wallet addresses that satisfy:"
  echo "    docs/void-mainnet-bootstrap-roles-and-keys.md"
  echo "- Then re-run:"
  echo "    ./ops/void-mainnet-bootstrap-plan-sim.sh"
  echo "    ./ops/void-mainnet-bootstrap-plan-health-all.sh"
else
  echo "- Check exporter/sim/live JSON for details."
  echo "  See docs/void-mainnet-bootstrap-plan.md and"
  echo "      docs/void-mainnet-bootstrap-roles-and-keys.md."
fi
