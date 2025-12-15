#!/usr/bin/env bash
set -euo pipefail

# Deploy ReceiptRegistry on VOID devnet (anvil)
# Requires:
#   - forge, cast, jq
#   - RPC_URL (default http://127.0.0.1:8545)
#   - DEVNET_PRIVKEY (anvil[0] key)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
: "${DEVNET_PRIVKEY:?DEVNET_PRIVKEY env not set}"

STATE_FILE="docs/VOID-DEVNET-PROTOCOL-STATE.json"

echo "[receipt-deploy] repo:     $ROOT_DIR"
echo "[receipt-deploy] RPC_URL:  $RPC_URL"
echo "[receipt-deploy] STATE:    $STATE_FILE"

for bin in forge cast jq; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "[ERR] $bin not found in PATH" >&2
    exit 1
  fi
done

if [ ! -f "$STATE_FILE" ]; then
  echo "[ERR] missing $STATE_FILE (run system-deploy first?)" >&2
  exit 1
fi

JOBQUEUE_ADDR="$(jq -r '(.JobQueue | (if type=="object" then (.address // empty) elif type=="string" then . else empty end))' "$STATE_FILE")"
if [ -z "$JOBQUEUE_ADDR" ] || [ "$JOBQUEUE_ADDR" = "null" ]; then
  echo "[ERR] JobQueue.address missing from $STATE_FILE" >&2
  exit 1
fi

ADMIN_ADDR="$(cast wallet address "$DEVNET_PRIVKEY")"

echo "[receipt-deploy] JobQueue: $JOBQUEUE_ADDR"
echo "[receipt-deploy] Admin:    $ADMIN_ADDR"

echo "[receipt-deploy] deploying ReceiptRegistry via forge create --broadcast..."
DEPLOY_OUT="$(forge create \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_PRIVKEY" \
  --broadcast \
  contracts/ReceiptRegistry.sol:ReceiptRegistry \
  --constructor-args "$ADMIN_ADDR")"

echo "$DEPLOY_OUT" | sed -n '1,40p'

RECEIPT_ADDR="$(printf '%s\n' "$DEPLOY_OUT" | awk '/Deployed to:/ {print $3}' | tail -n1)"

if [ -z "$RECEIPT_ADDR" ]; then
  echo "[ERR] could not parse ReceiptRegistry address from forge output" >&2
  printf '%s\n' "$DEPLOY_OUT" >&2
  exit 1
fi

echo "[receipt-deploy] ReceiptRegistry: $RECEIPT_ADDR"

echo "[receipt-deploy] setAllowedJobQueue(JobQueue, true)..."
cast send \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_PRIVKEY" \
  "$RECEIPT_ADDR" \
  "setAllowedJobQueue(address,bool)" \
  "$JOBQUEUE_ADDR" true

TMP="$(mktemp)"
jq ".ReceiptRegistry = {\"address\": \"$RECEIPT_ADDR\"}" "$STATE_FILE" > "$TMP"
mv "$TMP" "$STATE_FILE"

echo "[receipt-deploy] updated $STATE_FILE with ReceiptRegistry.address"
echo "[receipt-deploy] done."
