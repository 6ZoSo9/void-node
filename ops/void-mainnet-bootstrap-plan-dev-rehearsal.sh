#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

CFG="config/void-mainnet-bootstrap-mainnet.dev.json"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

echo "=== [mainnet-bootstrap-plan-dev] VOID mainnet DEV PLAN rehearsal ==="
echo "[cfg] CFG     = $CFG"
echo "[cfg] RPC_URL = $RPC_URL"
echo

if [[ ! -f "$CFG" ]]; then
  echo "[FATAL] DEV config $CFG not found. Run the dev-config builder first." >&2
  exit 1
fi

echo "[step] running forge script in PLAN mode (no broadcasts)..."
forge script script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet \
  --rpc-url "$RPC_URL" \
  --sig "plan(string)" "$CFG" \
  -vvvv

echo
echo "[mainnet-bootstrap-plan-dev] DONE (PLAN only; no deployments)."
