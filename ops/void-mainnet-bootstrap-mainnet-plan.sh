#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
CFG_PATH="${CFG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"
SCRIPT_NAME="script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet"

cd "$REPO_ROOT"

echo "=== [mainnet-bootstrap-plan] VOID mainnet PLAN narrative ==="
echo "[cfg] REPO_ROOT   = $REPO_ROOT"
echo "[cfg] RPC_URL     = $RPC_URL"
echo "[cfg] CONFIG_PATH = $CFG_PATH"
echo

forge script "$SCRIPT_NAME" \
  --rpc-url "$RPC_URL" \
  --sig "plan(string)" \
  "$CFG_PATH" \
  -vvvv
