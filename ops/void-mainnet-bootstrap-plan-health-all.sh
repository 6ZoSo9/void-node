#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

echo "=== [plan-health-all] VOID mainnet bootstrap PLAN health-all ==="
echo "[cfg] REPO_ROOT = $REPO_ROOT"
echo

echo "=== [1] run exporter (refresh metrics file) ==="
if [ ! -x ops/void-mainnet-bootstrap-plan-exporter.sh ]; then
  echo "[plan-health-all] ERROR: ops/void-mainnet-bootstrap-plan-exporter.sh missing or not executable." >&2
  exit 1
fi

./ops/void-mainnet-bootstrap-plan-exporter.sh
echo

echo "=== [2] show plan status (JSON view) ==="
if [ ! -x ops/void-mainnet-bootstrap-plan-status.sh ]; then
  echo "[plan-health-all] ERROR: ops/void-mainnet-bootstrap-plan-status.sh missing or not executable." >&2
  exit 1
fi

./ops/void-mainnet-bootstrap-plan-status.sh
echo

echo "=== [3] read gauges from metrics file ==="
METRICS_FILE="ops/metrics/void_mainnet_bootstrap_plan.prom"
if [ ! -f "$METRICS_FILE" ]; then
  echo "[plan-health-all] ERROR: metrics file not found: $METRICS_FILE" >&2
  exit 1
fi

CONFIG_OK=$(grep -E '^void_mainnet_bootstrap_plan_configured ' "$METRICS_FILE" | awk '{print $2}' || echo "0")
STRUCT_OK=$(grep -E '^void_mainnet_bootstrap_plan_health ' "$METRICS_FILE" | awk '{print $2}' || echo "0")

echo "=== [4] summary ==="
echo "  CONFIG_OK  = $CONFIG_OK"
echo "  STRUCT_OK  = $STRUCT_OK"

if [ "$CONFIG_OK" != "1" ]; then
  echo "  RESULT: NOT CONFIGURED (fix config JSON/chainId/structure)."
elif [ "$STRUCT_OK" != "1" ]; then
  echo "  RESULT: CONFIGURED BUT NOT READY (critical roles/contracts/validator0 still missing)."
else
  echo "  RESULT: PLAN READY (safe to consider broadcast wiring, subject to keys/ops checks)."
fi

echo "=== [plan-health-all] DONE ==="
