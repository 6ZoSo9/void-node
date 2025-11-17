#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
cd "$REPO"

STATE="$REPO/docs/VOID-DEVNET-PROTOCOL-STATE.json"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
DEVNET_PRIVKEY="${DEVNET_PRIVKEY:-}"

if [[ -z "$DEVNET_PRIVKEY" ]]; then
  echo "[model-deploy] ERROR: DEVNET_PRIVKEY not set" >&2
  exit 1
fi

if [[ ! -f "$STATE" ]]; then
  echo "[model-deploy] ERROR: state file not found: $STATE" >&2
  exit 1
fi

ADMIN_GATE="$(jq -r '.AdminGate' "$STATE")"
CHAIN_ID="$(jq -r '.chainId // 2050' "$STATE")"

echo "[model-deploy] repo:       $REPO"
echo "[model-deploy] state:      $STATE"
echo "[model-deploy] RPC:        $RPC_URL"
echo "[model-deploy] AdminGate:  $ADMIN_GATE"
echo "[model-deploy] chainId:    $CHAIN_ID"

ADDR=$(
  forge create \
    --rpc-url "$RPC_URL" \
    --private-key "$DEVNET_PRIVKEY" \
    --broadcast \
    contracts/ModelRegistry.sol:ModelRegistry \
    --constructor-args "$ADMIN_GATE" "$CHAIN_ID" \
  | awk '/Deployed to:/ {print $3}'
)

echo "[model-deploy] ModelRegistry deployed to: $ADDR"

tmp="$(mktemp)"
jq '.ModelRegistry = {
  "address": "'"$ADDR"'",
  "chainId": '"$CHAIN_ID"',
  "contract": "ModelRegistry",
  "source": "contracts/ModelRegistry.sol"
}' "$STATE" >"$tmp"
mv "$tmp" "$STATE"

echo "[model-deploy] updated state:"
jq '.ModelRegistry' "$STATE"
