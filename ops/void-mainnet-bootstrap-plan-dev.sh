#!/usr/bin/env bash
set -euo pipefail

# Simple harness to rehearse the mainnet PLAN against dev config JSON.
# Success (exit 0) means the PLAN is structurally sound.

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
DEV_CFG="${DEV_CFG:-config/void-mainnet-bootstrap-mainnet.dev.json}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

cd "$REPO_ROOT"

echo "=== [dev-plan] VOID mainnet DEV PLAN rehearsal ==="
echo "[dev-plan] DEV_CFG = $DEV_CFG"
echo "[dev-plan] RPC_URL = $RPC_URL"
echo
echo "[dev-plan] running forge script PLAN (no broadcasts)..."

forge script script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet \
  --rpc-url "$RPC_URL" \
  --sig "plan(string)" "$DEV_CFG" \
  -vvvv

echo
echo "=== [dev-plan] RESULT: PLAN rehearsal completed (no state changes) ==="
echo "If this exits 0, your dev PLAN config is structurally sound."
