#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "${REPO_ROOT}"

echo "=== [plan-all] VOID mainnet bootstrap PLAN — full check ==="
echo "[cfg] REPO_ROOT = ${REPO_ROOT}"
echo

echo "=== [1] PLAN status (JSON ZERO vs SET) ==="
./ops/void-mainnet-bootstrap-plan-status.sh
echo

echo "=== [2] PLAN rehearsal (Forge, NO BROADCAST) ==="
./ops/void-mainnet-bootstrap-plan-rehearse.sh
echo

echo "=== [3] PLAN repo metrics + gauges (CONFIG_OK/STRUCT_OK) ==="
./ops/void-mainnet-bootstrap-plan-health-all.sh
echo

echo "=== [4] PLAN Prometheus view (recordings) ==="
./ops/void-mainnet-bootstrap-plan-prom-health.sh
echo

echo "=== [plan-all] DONE (PLAN is still NOT READY until you fill real roles/contracts/validator0) ==="
