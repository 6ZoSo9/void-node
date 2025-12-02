#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
CONFIG="config/void-mainnet-bootstrap-mainnet.live.json"

echo "=== [mainnet-plan] VOID mainnet PLAN-only rehearsal ==="
echo "[cfg] REPO_ROOT = $(pwd)"
echo "[cfg] RPC_URL   = $RPC_URL"
echo "[cfg] CONFIG    = $CONFIG"
echo

forge script script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet \
  --rpc-url "$RPC_URL" \
  --sig "plan(string)" "$CONFIG" \
  -vvvv

echo
echo "=== [mainnet-plan] DONE (PLAN-only, no broadcast) ==="
