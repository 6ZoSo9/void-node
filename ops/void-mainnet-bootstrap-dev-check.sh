#!/usr/bin/env bash
set -euo pipefail

# Normalize to repo root
ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT_DIR"
echo "[bootstrap-dev-check] repo root: $PWD"

RPC_URL="${RPC_URL:-http://127.0.0.1:8550}"
KEY_DEFAULT="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
MAINNET_DEV_BOOTSTRAP_KEY="${MAINNET_DEV_BOOTSTRAP_KEY:-$KEY_DEFAULT}"

echo "[bootstrap-dev-check] RPC_URL=$RPC_URL"
echo "[bootstrap-dev-check] using MAINNET_DEV_BOOTSTRAP_KEY=${MAINNET_DEV_BOOTSTRAP_KEY:0:10}..."

echo
echo "=== [0] sanity: anvil chain-id ==="
CHAIN_ID="$(cast chain-id --rpc-url "$RPC_URL")"
echo "[bootstrap-dev-check] chain-id=$CHAIN_ID"
if [ "$CHAIN_ID" != "2050" ]; then
  echo "[bootstrap-dev-check] FATAL: expected chainId 2050, got $CHAIN_ID" >&2
  exit 1
fi

echo
echo "=== [1] run VOID mainnet bootstrap invariants script (no broadcast) ==="
forge script script/void-mainnet/VoidMainnetBootstrapDev.s.sol:VoidMainnetBootstrapDev \
  --rpc-url "$RPC_URL" \
  --private-key "$MAINNET_DEV_BOOTSTRAP_KEY" \
  -vv

echo
echo "[bootstrap-dev-check] OK: config + tokenomics invariants passed."
