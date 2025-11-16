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

if ! command -v jq >/dev/null 2>&1; then
  echo "[ERR] jq not installed" >&2
  exit 1
fi

DEVNET_PRIVKEY="${DEVNET_PRIVKEY:-}"
if [ -z "$DEVNET_PRIVKEY" ]; then
  echo "[ERR] DEVNET_PRIVKEY not set" >&2
  exit 1
fi

MODEL_REGISTRY=$(jq -r '.ModelRegistry.address // empty' "$STATE_FILE")
if [ -z "$MODEL_REGISTRY" ] || [ "$MODEL_REGISTRY" = "0x0000000000000000000000000000000000000000" ]; then
  echo "[ERR] ModelRegistry.address missing/zero in $STATE_FILE" >&2
  exit 1
fi

ADMIN=$(cast call --rpc-url "$RPC_URL" "$MODEL_REGISTRY" "admin()(address)")

echo "[info] REPO=$REPO"
echo "[info] RPC_URL=$RPC_URL"
echo "[info] ModelRegistry=$MODEL_REGISTRY"
echo "[info] admin(from ModelRegistry)=$ADMIN"

BYTECODE=$(forge inspect contracts/JobQueue.sol:JobQueue bytecode)
echo "[info] JobQueue bytecode length: ${#BYTECODE} chars"

echo "[info] deploying JobQueue via cast send..."
TX_OUT=$(cast send \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_PRIVKEY" \
  --create "$BYTECODE" \
  "constructor(address,address)" "$ADMIN" "$MODEL_REGISTRY")

echo "$TX_OUT"

JOBQUEUE_ADDR=$(echo "$TX_OUT" | awk '/contractAddress/ {print $2}')
if [ -z "$JOBQUEUE_ADDR" ] || [ "$JOBQUEUE_ADDR" = "0x0000000000000000000000000000000000000000" ]; then
  echo "[ERR] failed to parse JobQueue address from tx output" >&2
  exit 1
fi

echo "[info] JobQueue deployed at: $JOBQUEUE_ADDR"

TMP=$(mktemp)
jq --arg addr "$JOBQUEUE_ADDR" '
  .JobQueue = {
    address: $addr,
    chainId: 2050,
    contract: "JobQueue",
    source: "contracts/JobQueue.sol"
  }
' "$STATE_FILE" > "$TMP"

mv "$TMP" "$STATE_FILE"

echo "[info] Updated $STATE_FILE:"
jq '.JobQueue' "$STATE_FILE"
