#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
cd "$REPO"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE_FILE="docs/VOID-DEVNET-PROTOCOL-STATE.json"

if [ ! -f "$STATE_FILE" ]; then
  echo "[ERR] missing $STATE_FILE" >&2
  exit 1
fi

MODEL_REGISTRY=$(jq -r '.ModelRegistry.address // empty' "$STATE_FILE")
if [ -z "$MODEL_REGISTRY" ] || [ "$MODEL_REGISTRY" = "0x0000000000000000000000000000000000000000" ]; then
  echo "[ERR] ModelRegistry.address missing/zero in $STATE_FILE" >&2
  exit 1
fi

DEVNET_PRIVKEY="${DEVNET_PRIVKEY:-}"
if [ -z "$DEVNET_PRIVKEY" ]; then
  echo "[ERR] DEVNET_PRIVKEY not set in env" >&2
  exit 1
fi

echo "[info] REPO=$REPO"
echo "[info] RPC_URL=$RPC_URL"
echo "[info] ModelRegistry=$MODEL_REGISTRY"

ADMIN=$(cast call --rpc-url "$RPC_URL" "$MODEL_REGISTRY" "admin()(address)")
echo "[info] admin=$ADMIN"

register_model() {
  local id="$1"
  local uri="$2"
  local owner="${3:-$ADMIN}"

  echo
  echo "[*] ensuring model '$id' (owner=$owner, uri=$uri)"

  local existing=0
  if cast call --rpc-url "$RPC_URL" "$MODEL_REGISTRY" \
       "getModel(string)((address,bytes32,string,bool))" "$id" >/dev/null 2>&1; then
    existing=1
  fi

  if [ "$existing" -eq 1 ]; then
    echo "    - model already exists (getModel ok), skipping register"
  else
    local hash
    hash=$(cast keccak "$id")
    echo "    - registering (hash=$hash)"
    cast send \
      --rpc-url "$RPC_URL" \
      --private-key "$DEVNET_PRIVKEY" \
      "$MODEL_REGISTRY" \
      "registerModel(string,address,bytes32,string)" \
      "$id" "$owner" "$hash" "$uri"
  fi

  echo "    - forcing active=true"
  cast send \
    --rpc-url "$RPC_URL" \
    --private-key "$DEVNET_PRIVKEY" \
    "$MODEL_REGISTRY" \
    "setActive(string,bool)" \
    "$id" true

  local result
  result=$(cast call --rpc-url "$RPC_URL" "$MODEL_REGISTRY" \
             "getModel(string)((address,bytes32,string,bool))" "$id")
  echo "    - current: $result"
}

# Seed a couple of demo models
register_model "void-devnet-demo-1" "ipfs://void-devnet-demo-1"
register_model "void-devnet-demo-2" "ipfs://void-devnet-demo-2"

echo
echo "[done] Model demos ensured."
