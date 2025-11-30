#!/usr/bin/env bash
set -euo pipefail

#
# ops/void-mainnet-bootstrap-plan-live.sh
#
# Read-only LIVE PLAN rehearsal against a real RPC.
# - Uses config/void-mainnet-bootstrap-mainnet.live.json by default.
# - Calls VoidMainnetBootstrapMainnet.plan(configPath) ONLY (no broadcasts).
# - Verifies the RPC chainId is 2050 before running.
#

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
LIVE_CFG="${LIVE_CFG:-config/void-mainnet-bootstrap-mainnet.live.json}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

cd "$REPO_ROOT"

echo "=== [mainnet-live-plan] VOID mainnet LIVE PLAN rehearsal (read-only) ==="
echo "[live-plan] REPO_ROOT = $REPO_ROOT"
echo "[live-plan] LIVE_CFG  = $LIVE_CFG"
echo "[live-plan] RPC_URL   = $RPC_URL"
echo

if [ ! -f "$LIVE_CFG" ]; then
  echo "[live-plan][FATAL] LIVE config not found: $LIVE_CFG" >&2
  echo "           Create it from the template before running this script." >&2
  exit 1
fi

if ! [ -s "$LIVE_CFG" ]; then
  echo "[live-plan][FATAL] LIVE config exists but is empty: $LIVE_CFG" >&2
  exit 1
fi

echo "[live-plan] sanity: show first few lines of LIVE config:"
head -n 5 "$LIVE_CFG" || true
echo

echo "[live-plan] sanity: reading chainId from RPC with cast..."
CHAIN_ID="ERR"
if command -v cast >/dev/null 2>&1; then
  CHAIN_ID="$(cast chain-id --rpc-url "$RPC_URL" 2>/dev/null || echo "ERR")"
else
  echo "[live-plan][WARN] cast not found on PATH; skipping RPC chainId sanity." >&2
fi

echo "[live-plan] RPC chainId = $CHAIN_ID"

if [ "$CHAIN_ID" != "2050" ]; then
  echo "[live-plan][FATAL] RPC chainId is not 2050 (VOID mainnet). Got: $CHAIN_ID" >&2
  echo "           Point RPC_URL at an anvil-2050 rehearsal or real VOID mainnet RPC." >&2
  exit 1
fi

echo
echo "[live-plan] running forge script PLAN (no broadcasts, plan() only)..."
echo "            script: script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet"
echo "            func  : plan(string)"
echo

forge script script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet \
  --rpc-url "$RPC_URL" \
  --sig "plan(string)" "$LIVE_CFG"

echo
echo "=== [mainnet-live-plan] RESULT: LIVE PLAN rehearsal completed (no state changes) ==="
echo "If this exited 0, your LIVE PLAN JSON is parseable against that RPC and"
echo "VoidMainnetBootstrapMainnet.plan(...) can walk it without reverting."
