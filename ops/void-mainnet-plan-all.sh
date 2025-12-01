#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
LIVE_CFG="${LIVE_CFG:-config/void-mainnet-bootstrap-mainnet.live.json}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

echo "=== [mainnet-plan-all] VOID mainnet bootstrap PLAN bundle ==="
echo "[cfg] REPO_ROOT = $REPO_ROOT"
echo "[cfg] RPC_URL   = $RPC_URL"
echo "[cfg] LIVE_CFG  = $LIVE_CFG"
echo "[cfg] PROM_URL  = $PROM_URL"
echo

echo "=== [1] forge PLAN() against LIVE CFG (no broadcast) ==="
./ops/void-mainnet-plan.sh
echo

echo "=== [2] check Prometheus PLAN health metric ==="
./ops/void-mainnet-plan-health-all.sh
echo

echo "=== [mainnet-plan-all] RESULT: OK (PLAN script + PLAN metric both good) ==="
