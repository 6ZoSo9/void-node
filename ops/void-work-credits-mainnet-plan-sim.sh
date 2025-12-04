#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
CFG_PATH="${CFG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"

cd "$REPO_ROOT"

echo "=== [wc-mainnet-plan-sim] VOID Work Credits mainnet PLAN simulation ==="
echo "[cfg] REPO_ROOT = $REPO_ROOT"
echo "[cfg] CFG_PATH  = $CFG_PATH"
echo

VOID_MAINNET_CFG="$CFG_PATH" \
  forge script script/VoidWorkCreditsMainnetPlan.s.sol:VoidWorkCreditsMainnetPlan -vv
