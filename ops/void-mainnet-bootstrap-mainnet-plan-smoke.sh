#!/usr/bin/env bash
set -euo pipefail

# VOID mainnet bootstrap mainnet PLAN-mode smoke:
# - Calls VoidMainnetBootstrapMainnet.plan(configPath) against the given RPC.
# - NO broadcasts, NO state changes, NO deployments.
# - Just proves the LIVE JSON is parseable and matches chainId=2050.

cd "$HOME/dev/void-node"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
CONFIG_PATH="${CONFIG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"

echo "=== [mainnet-bootstrap-mainnet-plan-smoke] VoidMainnetBootstrapMainnet PLAN ==="
echo "[cfg] REPO_ROOT   = $PWD"
echo "[cfg] RPC_URL     = $RPC_URL"
echo "[cfg] CONFIG_PATH = $CONFIG_PATH"
echo

forge script script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet \
  --rpc-url "$RPC_URL" \
  --sig "plan(string)" "$CONFIG_PATH" \
  -vvvv
