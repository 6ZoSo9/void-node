#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/dev/void-node"
CONFIG_PATH="config/void-mainnet-bootstrap-mainnet.live.json"
RPC_URL="http://127.0.0.1:8545"
SCRIPT_FQ="script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet"

cd "$ROOT"

echo "=== [mainnet-plan-verify] VOID mainnet bootstrap MAINNET PLAN verify ==="
echo "[cfg] ROOT        = $ROOT"
echo "[cfg] SCRIPT_FQ   = $SCRIPT_FQ"
echo "[cfg] CONFIG_PATH = $CONFIG_PATH"
echo "[cfg] RPC_URL     = $RPC_URL"

echo
echo "=== [1] chainId sanity via cast chain-id ==="
if command -v cast >/dev/null 2>&1; then
  cast chain-id --rpc-url "$RPC_URL" || {
    echo "[FATAL] cast chain-id failed; is anvil/mainnet RPC up on $RPC_URL?"
    exit 1
  }
else
  echo "[WARN] cast not found; skipping chain-id check"
fi

echo
echo "=== [2] forge script PLAN dry-run (no broadcast) ==="
set -x
forge script "$SCRIPT_FQ" \
  --rpc-url "$RPC_URL" \
  --sig 'plan(string)' \
  "$CONFIG_PATH"
set +x

echo
echo "=== [mainnet-plan-verify] DONE (PLAN only: no broadcasts, no state changes) ==="
