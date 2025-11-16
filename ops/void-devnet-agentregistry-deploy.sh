#!/usr/bin/env bash
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE="$REPO/docs/VOID-DEVNET-PROTOCOL-STATE.json"

if [ ! -f "$STATE" ]; then
  echo "[agentreg-deploy] missing state file: $STATE" >&2
  exit 1
fi

if [ -z "${DEVNET_PRIVKEY:-}" ]; then
  echo "[agentreg-deploy] DEVNET_PRIVKEY is required (devnet deployer key)" >&2
  exit 1
fi

# Try to grab a canonical admin from state; fall back to devnet deployer address.
ADMIN="$(jq -r '.Admin.address // .deployer // empty' "$STATE" || true)"
if [ -z "$ADMIN" ] || [ "$ADMIN" = "null" ]; then
  if ! command -v cast >/dev/null 2>&1; then
    echo "[agentreg-deploy] cast not found and no Admin in state" >&2
    exit 1
  fi
  ADMIN="$(cast wallet address --private-key "$DEVNET_PRIVKEY")"
fi

echo "[agentreg-deploy] repo:    $REPO"
echo "[agentreg-deploy] RPC_URL: $RPC_URL"
echo "[agentreg-deploy] STATE:   $STATE"
echo "[agentreg-deploy] Admin:   $ADMIN"

# Deploy AgentRegistry
echo "[agentreg-deploy] deploying AgentRegistry via forge create --broadcast..."
out_file="$(mktemp)"
forge create contracts/AgentRegistry.sol:AgentRegistry \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_PRIVKEY" \
  --constructor-args "$ADMIN" \
  --broadcast \
  | tee "$out_file"

ADDR="$(grep -m1 'Deployed to:' "$out_file" | awk '{print $3}')"
rm -f "$out_file"

if [ -z "$ADDR" ]; then
  echo "[agentreg-deploy] ERROR: could not parse AgentRegistry address" >&2
  exit 1
fi

echo "[agentreg-deploy] AgentRegistry: $ADDR"

# Update protocol state
tmp="$STATE.tmp.$$"
jq --arg addr "$ADDR" '.AgentRegistry = { address: $addr }' "$STATE" > "$tmp"
mv "$tmp" "$STATE"

echo "[agentreg-deploy] updated $STATE with AgentRegistry.address"
echo "[agentreg-deploy] done."
