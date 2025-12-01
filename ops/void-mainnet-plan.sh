#!/usr/bin/env bash
set -euo pipefail

# PLAN-only check against LIVE config JSON (no broadcasts, no state changes)

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
LIVE_CFG="${LIVE_CFG:-config/void-mainnet-bootstrap-mainnet.live.json}"

echo "=== [mainnet-plan] VOID mainnet PLAN-only check (from LIVE JSON) ==="
echo "[cfg] REPO_ROOT = $REPO_ROOT"
echo "[cfg] RPC_URL   = $RPC_URL"
echo "[cfg] LIVE_CFG  = $LIVE_CFG"
echo

echo "=== [0] sanity: chainId on $RPC_URL ==="
cast chain-id --rpc-url "$RPC_URL"
echo

echo "=== [1] forge script plan(...) against LIVE CFG (no broadcast) ==="
forge script script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet \
  --rpc-url "$RPC_URL" \
  --sig "plan(string)" \
  "$LIVE_CFG"

echo
echo "=== [done] PLAN-only mainnet script completed (no state changes). ==="
