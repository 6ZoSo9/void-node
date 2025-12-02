#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

CONFIG="config/void-mainnet-bootstrap-mainnet.live.json"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

echo "=== [mainnet-plan] VOID mainnet bootstrap PLAN (no broadcast) ==="
echo "[cfg] CONFIG  = $CONFIG"
echo "[cfg] RPC_URL = $RPC_URL"
echo

if [ ! -f "$CONFIG" ]; then
  echo "[FATAL] config file not found: $CONFIG" >&2
  exit 1
fi

forge script script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet \
  --sig 'plan(string)' \
  "$CONFIG" \
  --rpc-url "$RPC_URL"
