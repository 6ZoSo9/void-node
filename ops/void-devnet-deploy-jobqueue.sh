#!/usr/bin/env bash
set -euo pipefail

REPO=${REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}
cd "$REPO"

STATE="${STATE:-$REPO/docs/VOID-DEVNET-PROTOCOL-STATE.json}"

echo "[jobqueue-deploy] repo:      $REPO"
echo "[jobqueue-deploy] STATE:     $STATE"

# Prefer explicit RPC_URL env, fall back to state file
RPC_URL="${RPC_URL:-$(jq -r '.rpcUrl' "$STATE")}"
DEVNET_PRIVKEY="${DEVNET_PRIVKEY:-}"

if [ -z "${RPC_URL:-}" ] || [ "$RPC_URL" = "null" ]; then
  echo "[jobqueue-deploy] ERROR: RPC_URL not set and not found in state" >&2
  exit 1
fi

if [ -z "${DEVNET_PRIVKEY:-}" ]; then
  echo "[jobqueue-deploy] ERROR: DEVNET_PRIVKEY not set" >&2
  exit 1
fi

echo "[jobqueue-deploy] RPC_URL:   $RPC_URL"

echo "[jobqueue-deploy] deploying JobQueue via forge create..."

# NOTE: --broadcast is required or this will be a dry run.
RAW_JSON=$(
  forge create contracts/JobQueue.sol:JobQueue \
    --rpc-url "$RPC_URL" \
    --private-key "$DEVNET_PRIVKEY" \
    --broadcast \
    --json
)

echo "$RAW_JSON"

ADDR=$(printf '%s\n' "$RAW_JSON" | jq -r '.deployedTo // .deployment.address // empty')

if [ -z "$ADDR" ] || ! [[ "$ADDR" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
  echo "[jobqueue-deploy] ERROR: failed to parse JobQueue address" >&2
  exit 1
fi

echo "[jobqueue-deploy] JobQueue deployed at $ADDR"

tmp=$(mktemp)
jq --arg addr "$ADDR" '.JobQueue = $addr' "$STATE" >"$tmp"
mv "$tmp" "$STATE"

chmod 600 "$STATE" || true

echo "[jobqueue-deploy] state updated with JobQueue"
