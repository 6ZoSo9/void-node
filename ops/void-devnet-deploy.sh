#!/usr/bin/env bash
set -euo pipefail

# Simple devnet deploy helper for VOID core contracts.
# - Assumes an anvil-style local devnet on RPC_URL.
# - Uses DEVNET_PRIVKEY as the deployer key.
# - Writes addresses to docs/VOID-DEVNET-DEPLOY-ADDRESSES.json

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
OUT="${OUT:-docs/VOID-DEVNET-DEPLOY-ADDRESSES.json}"

: "${DEVNET_PRIVKEY:?set DEVNET_PRIVKEY to your devnet deployer private key}"

echo "[void-devnet] RPC_URL=$RPC_URL"
echo "[void-devnet] OUT=$OUT"

# Derive deployer address from the private key
DEPLOYER="$(cast wallet address "$DEVNET_PRIVKEY")"
echo "[void-devnet] DEPLOYER=$DEPLOYER"

echo "[void-devnet] deploying VoidToken..."
# NOTE: VoidToken constructor expects 1 arg: owner/treasury address.
VoidTokenAddr="$(
  forge create \
    --rpc-url "$RPC_URL" \
    --private-key "$DEVNET_PRIVKEY" \
    contracts/VoidToken.sol:VoidToken \
    --constructor-args "$DEPLOYER" \
    | awk '/Deployed to:/ {print $3}'
)"
echo "[void-devnet] VoidToken=$VoidTokenAddr"

echo "[void-devnet] deploying AdminGate..."
# AdminGate(chainId, masterKey, updateGate)
AdminGateAddr="$(
  forge create \
    --rpc-url "$RPC_URL" \
    --private-key "$DEVNET_PRIVKEY" \
    contracts/AdminGate.sol:AdminGate \
    --constructor-args 2050 "$DEPLOYER" 0x0000000000000000000000000000000000000000 \
    | awk '/Deployed to:/ {print $3}'
)"
echo "[void-devnet] AdminGate=$AdminGateAddr"

mkdir -p "$(dirname "$OUT")"

cat >"$OUT" <<JSON
{
  "rpcUrl": "$RPC_URL",
  "deployer": "$DEPLOYER",
  "VoidToken": "$VoidTokenAddr",
  "AdminGate": "$AdminGateAddr"
}
JSON

echo "[void-devnet] wrote $OUT"
