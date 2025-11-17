#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$(pwd)}"
cd "$REPO"

STATE="docs/VOID-DEVNET-PROTOCOL-STATE.json"

if [ ! -f "$STATE" ]; then
  echo "[ERR] missing state file: $STATE" >&2
  exit 1
fi

if [ -z "${RPC_URL:-}" ]; then
  echo "[ERR] RPC_URL not set" >&2
  exit 1
fi

if [ -z "${DEVNET_PRIVKEY:-}" ]; then
  echo "[ERR] DEVNET_PRIVKEY not set" >&2
  exit 1
fi

AdminGate=$(jq -r '.AdminGate' "$STATE")
chainId=$(jq -r '.chainId' "$STATE")

echo "[deploy-datasetregistry] repo  = $REPO"
echo "[deploy-datasetregistry] state = $STATE"
echo "[deploy-datasetregistry] AdminGate = $AdminGate"
echo "[deploy-datasetregistry] chainId   = $chainId"
echo "[deploy-datasetregistry] deploying DatasetRegistry via forge create --broadcast…"

LOG=$(mktemp)

# IMPORTANT: --broadcast so this is NOT a dry run
if ! forge create contracts/DatasetRegistry.sol:DatasetRegistry \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_PRIVKEY" \
  --constructor-args "$AdminGate" \
  --broadcast 2>&1 | tee "$LOG"
then
  echo "[ERR] forge create failed; see $LOG" >&2
  exit 1
fi

# Parse deployed address from standard forge output
ADDR=$(awk '/Deployed to:/{print $3}' "$LOG" | tail -n1)

if [ -z "$ADDR" ]; then
  echo "[ERR] failed to parse deployed address from forge output; log at $LOG" >&2
  exit 1
fi

echo "[deploy-datasetregistry] DatasetRegistry deployed at $ADDR"

TMP=$(mktemp)
jq --arg addr "$ADDR" '
  .DatasetRegistry = {
    address: $addr,
    chainId: (try (.chainId | tonumber) catch .chainId),
    contract: "DatasetRegistry",
    source: "contracts/DatasetRegistry.sol"
  }
' "$STATE" > "$TMP"
mv "$TMP" "$STATE"

echo "[deploy-datasetregistry] updated $STATE"
jq '{chainId, AdminGate, DatasetRegistry}' "$STATE"
