#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="logs/mainnet-plan/plan-${STAMP}.log"

echo "=== [mainnet-plan-snapshot] VOID mainnet PLAN snapshot ==="
echo "[cfg] REPO_ROOT = $(pwd)"
echo "[cfg] RPC_URL   = $RPC_URL"
echo "[cfg] OUT       = $OUT"
echo

# Capture full plan() narrative into a log file
./ops/void-mainnet-plan-run.sh \
  2>&1 | tee "$OUT"

echo
echo "=== [mainnet-plan-snapshot] written: $OUT ==="
