#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
cd "$REPO"

STATE="docs/VOID-DEVNET-PROTOCOL-STATE.json"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
# Default to the standard anvil dev key if not provided
DEVNET_PRIVKEY="${DEVNET_PRIVKEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"

echo "[bootstrap-registry] repo:   $REPO"
echo "[bootstrap-registry] state:  $STATE"
echo "[bootstrap-registry] RPC_URL: $RPC_URL"

if ! command -v cast >/dev/null 2>&1; then
  echo "[ERR] cast not found in PATH" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[ERR] jq not found in PATH" >&2
  exit 1
fi

if [ ! -f "$STATE" ]; then
  echo "[ERR] missing $STATE – run void-devnet-system-deploy.sh first" >&2
  exit 1
fi

MODEL_REGISTRY=$(jq -r '.ModelRegistry // empty' "$STATE")
if [ -z "$MODEL_REGISTRY" ] || [ "$MODEL_REGISTRY" = "null" ]; then
  echo "[ERR] ModelRegistry address missing in $STATE" >&2
  exit 1
fi

echo "[bootstrap-registry] ModelRegistry: $MODEL_REGISTRY"

# Sanity: is there code at that address?
CODE=$(cast code "$MODEL_REGISTRY" --rpc-url "$RPC_URL")
if [ "$CODE" = "0x" ]; then
  echo "[ERR] no code at ModelRegistry address ($MODEL_REGISTRY)" >&2
  exit 1
fi

# Devnet demo model – aligned with your agent demo receipt
MODEL_ID="void-agent-devnet-demo-1"
MODEL_HASH="0x3d0474d3b68594a61d94426ecd7db24bbfaf8f47825828fa4106110f650caec8"
MODEL_URI="void://devnet/model/void-agent-devnet-demo-1"
MODEL_ACTIVE=true

echo "[bootstrap-registry] registering model:"
echo "  id:    $MODEL_ID"
echo "  hash:  $MODEL_HASH"
echo "  uri:   $MODEL_URI"
echo "  active: $MODEL_ACTIVE"

# NOTE:
# From earlier compile errors we know the ABI is:
#   function registerModel(string modelId, bytes32 hash, string uri, bool active) external;
# and it returns NOTHING (0 values). This will revert if the model already exists.

TX_HASH=$(cast send "$MODEL_REGISTRY" \
  "registerModel(string,bytes32,string,bool)" \
  "$MODEL_ID" "$MODEL_HASH" "$MODEL_URI" "$MODEL_ACTIVE" \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_PRIVKEY" \
  --json | jq -r '.transactionHash')

echo "[bootstrap-registry] tx: $TX_HASH"
echo "[bootstrap-registry] done."
