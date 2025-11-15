#!/usr/bin/env bash
set -euo pipefail

ADDR_FILE="docs/VOID-DEVNET-DEPLOY-ADDRESSES.json"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

# 230,000,000 * 1e18
PREMINE_WEI="230000000000000000000000000"

if [ ! -f "$ADDR_FILE" ]; then
  echo "[ERR] missing $ADDR_FILE – run ops/void-devnet-deploy.sh first" >&2
  exit 1
fi

TOKEN_ADDR=$(jq -r '.VoidToken' "$ADDR_FILE")
DEPLOYER=$(jq -r '.deployer' "$ADDR_FILE")

if [[ -z "$TOKEN_ADDR" || "$TOKEN_ADDR" == "null" ]]; then
  echo "[ERR] VoidToken address missing in $ADDR_FILE" >&2
  exit 1
fi

echo "[verify] RPC_URL  = $RPC_URL"
echo "[verify] Token    = $TOKEN_ADDR"
echo "[verify] Deployer = $DEPLOYER"

# cast prints: "<uint> [pretty]" – grab just the first column
tsupply=$(cast call "$TOKEN_ADDR" "totalSupply()(uint256)" --rpc-url "$RPC_URL" | awk '{print $1}')
dbal=$(cast call "$TOKEN_ADDR" "balanceOf(address)(uint256)" "$DEPLOYER" --rpc-url "$RPC_URL" | awk '{print $1}')

echo "[verify] totalSupply      = $tsupply"
echo "[verify] deployer balance = $dbal"
echo "[verify] expected premine = $PREMINE_WEI"

if [ "$tsupply" != "$PREMINE_WEI" ]; then
  echo "[FAIL] totalSupply != premine" >&2
  exit 1
fi

if [ "$dbal" != "$PREMINE_WEI" ]; then
  echo "[WARN] deployer balance != premine (supply moved?)" >&2
else
  echo "[OK] premine and deployer balance match spec"
fi
