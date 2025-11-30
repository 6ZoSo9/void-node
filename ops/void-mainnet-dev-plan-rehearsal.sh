#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

DEV_CFG="config/void-mainnet-bootstrap-mainnet.dev.json"
RPC_URL_DEFAULT="http://127.0.0.1:8545"
RPC_URL="${RPC_URL:-$RPC_URL_DEFAULT}"

echo "=== [dev-plan] VOID mainnet DEV PLAN rehearsal ==="
echo "[dev-plan] DEV_CFG = $DEV_CFG"
echo "[dev-plan] RPC_URL = $RPC_URL"
echo

if [[ ! -f "$DEV_CFG" ]]; then
  echo "[dev-plan] FATAL: $DEV_CFG not found." >&2
  echo "[dev-plan] Hint: rebuild it with your dev keys helper before running this." >&2
  exit 1
fi

echo "[dev-plan] running forge script PLAN (no broadcasts)..."
forge script script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet \
  --rpc-url "$RPC_URL" \
  --sig "plan(string)" "$DEV_CFG" \
  -vvvv

echo
echo "=== [dev-plan] RESULT: PLAN rehearsal completed (no state changes) ==="
echo "If this exits 0, your dev PLAN config is structurally sound."
