#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
LIVE_CFG="${LIVE_CFG:-config/void-mainnet-bootstrap-mainnet.live.json}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "=== [mainnet-plan-all] VOID mainnet bootstrap PLAN bundle ==="
echo "[cfg] REPO_ROOT = $(pwd)"
echo "[cfg] RPC_URL   = ${RPC_URL}"
echo "[cfg] LIVE_CFG  = ${LIVE_CFG}"
echo "[cfg] PROM_URL  = ${PROM_URL}"
echo

echo "=== [1] forge PLAN() against LIVE CFG (no broadcast) ==="
RPC_URL="${RPC_URL}" LIVE_CFG="${LIVE_CFG}" \
  ./ops/void-mainnet-bootstrap-mainnet-plan-from-live.sh

echo
echo "=== [2] check Prometheus PLAN health metric ==="
PROM_URL="${PROM_URL}" \
  ./ops/void-mainnet-bootstrap-plan-health-all.sh

echo
echo "=== [mainnet-plan-all] RESULT: OK (PLAN script + PLAN metric both good) ==="
