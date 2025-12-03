#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

# Default devnet VOID deployment (from our dev bootstrap/anvil pattern).
TOKEN_ADDR="${TOKEN_ADDR:-0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6}"

# Canonical devnet treasuries (VOID_TREASURY / OPS_TREASURY)
VOID_TREASURY_ADDR="${VOID_TREASURY_ADDR:-0x610178dA211FEF7D417bC0e6FeD39F05609AD788}"
OPS_TREASURY_ADDR="${OPS_TREASURY_ADDR:-0x8A791620dd6260079BF849Dc5567aDC3F2FdC318}"

echo "=== [devnet-balances] VOID devnet balance sanity ==="
echo "REPO_ROOT   = $PWD"
echo "RPC_URL     = $RPC_URL"
echo "TOKEN_ADDR  = $TOKEN_ADDR"
echo

echo "--- [1] VoidTreasury (devnet) ---"
RPC_URL="$RPC_URL" \
  ops/obelisk-wallet-balance-v2.sh \
    --network devnet \
    --token "$TOKEN_ADDR" \
    --address "$VOID_TREASURY_ADDR" \
  || echo "[devnet-balances] WARN: VoidTreasury balance probe failed (non-fatal)"

echo
echo "--- [2] OpsTreasury (devnet) ---"
RPC_URL="$RPC_URL" \
  ops/obelisk-wallet-balance-v2.sh \
    --network devnet \
    --token "$TOKEN_ADDR" \
    --address "$OPS_TREASURY_ADDR" \
  || echo "[devnet-balances] WARN: OpsTreasury balance probe failed (non-fatal)"

echo
echo "=== [devnet-balances] DONE ==="
