#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
CFG="$REPO_ROOT/config/void-workcredits-devnet.live.json"

if [[ ! -f "$CFG" ]]; then
  echo "[FATAL] config not found: $CFG" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[FATAL] jq not found in PATH" >&2
  exit 1
fi

if ! command -v cast >/dev/null 2>&1; then
  echo "[FATAL] cast not found in PATH" >&2
  exit 1
fi

if [[ -z "${DEVNET_DEPLOYER_KEY:-}" ]]; then
  echo "[FATAL] DEVNET_DEPLOYER_KEY is not set" >&2
  exit 1
fi

CHAIN_ID="$(jq -r '.chainId' "$CFG")"
RPC_URL="$(jq -r '.rpcUrl' "$CFG")"
VOID_TOKEN="$(jq -r '.voidToken' "$CFG")"
WC_TOKEN="$(jq -r '.workCreditsToken' "$CFG")"

# This is the contractAddress we just saw from cast send
LP_POOL_ADDR="0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"

echo "=== [WC-devnet-lp-salvage] ==="
echo "CFG          = $CFG"
echo "CHAIN_ID     = $CHAIN_ID"
echo "RPC_URL      = $RPC_URL"
echo "VOID_TOKEN   = $VOID_TOKEN"
echo "WC_TOKEN     = $WC_TOKEN"
echo "LP_POOL_ADDR = $LP_POOL_ADDR"
echo

echo "=== [1] verify code at lpPool ==="
CODE="$(cast code "$LP_POOL_ADDR" --rpc-url "$RPC_URL")"
echo "code = $CODE"
if [[ "$CODE" == "0x" || "$CODE" == "0x0" ]]; then
  echo "[FATAL] no code at $LP_POOL_ADDR, refusing to write config" >&2
  exit 1
fi
echo "[ok] non-empty code at lpPool address"
echo

echo "=== [2] update config.lpPool ==="
TMP="$(mktemp)"
jq --arg addr "$LP_POOL_ADDR" '.lpPool = $addr' "$CFG" >"$TMP"
mv "$TMP" "$CFG"
echo "[ok] updated .lpPool in $CFG"
echo "=> lpPool now:"
jq '.lpPool' "$CFG"
echo

echo "=== [3] approve + seed pool (devnet only) ==="
DEVNET_DEPLOYER_ADDR="$(cast wallet address --private-key "$DEVNET_DEPLOYER_KEY")"
echo "DEVNET_DEPLOYER_ADDR = $DEVNET_DEPLOYER_ADDR"
echo

# 1000 VOID, 100,000 WC (18 decimals)
AMOUNT_VOID="1000000000000000000000"      # 1_000 * 1e18
AMOUNT_WC="100000000000000000000000"     # 100_000 * 1e18

echo "AMOUNT_VOID = $AMOUNT_VOID"
echo "AMOUNT_WC   = $AMOUNT_WC"
echo

echo "--- approve VOID -> pool ---"
cast send \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_DEPLOYER_KEY" \
  "$VOID_TOKEN" "approve(address,uint256)" "$LP_POOL_ADDR" "$AMOUNT_VOID"

echo "--- approve WC -> pool ---"
cast send \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_DEPLOYER_KEY" \
  "$WC_TOKEN" "approve(address,uint256)" "$LP_POOL_ADDR" "$AMOUNT_WC"

echo "--- pool.seed(amountVOID,amountWC) ---"
cast send \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_DEPLOYER_KEY" \
  "$LP_POOL_ADDR" "seed(uint256,uint256)" "$AMOUNT_VOID" "$AMOUNT_WC"

echo
echo "=== [DONE] lpPool salvaged + seeded ==="
echo "lpPool = $LP_POOL_ADDR"
