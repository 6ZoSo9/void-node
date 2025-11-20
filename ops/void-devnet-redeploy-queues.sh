#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
cd "$REPO"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
DEVNET_PRIVKEY="${DEVNET_PRIVKEY:-}"

STATE="docs/VOID-DEVNET-PROTOCOL-STATE.json"

echo "[redeploy] repo      = $REPO"
echo "[redeploy] RPC_URL   = $RPC_URL"
echo "[redeploy] STATE     = $STATE"

if [ -z "$DEVNET_PRIVKEY" ]; then
  echo "[ERR] DEVNET_PRIVKEY not set (export it first)" >&2
  exit 1
fi

if [ ! -f "$STATE" ]; then
  echo "[ERR] state file missing: $STATE" >&2
  exit 1
fi

echo
echo "[redeploy] reading Admin/master key from STATE..."
ADMIN=$(jq -r '.AdminGate.address' "$STATE")
if [ -z "$ADMIN" ] || [ "$ADMIN" = "null" ]; then
  echo "[ERR] could not read .AdminGate.address from $STATE" >&2
  exit 1
fi
echo "[redeploy] Admin/master = $ADMIN"

echo
echo "=== [1] Deploy JobQueue (with --broadcast) ==="
forge create contracts/JobQueue.sol:JobQueue \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_PRIVKEY" \
  --constructor-args "$ADMIN" \
  --broadcast \
  --json \
  > /tmp/void-devnet-JobQueue-deploy.json

echo "[redeploy] raw JobQueue deploy JSON (first line):"
head -n 1 /tmp/void-devnet-JobQueue-deploy.json || true

JQ_ADDR=$(jq -r '.deployedTo' /tmp/void-devnet-JobQueue-deploy.json)
if [ -z "$JQ_ADDR" ] || [ "$JQ_ADDR" = "null" ]; then
  echo "[ERR] could not parse JobQueue deployed address from forge JSON" >&2
  exit 1
fi
echo "[redeploy] JobQueue deployed at: $JQ_ADDR"

echo
echo "=== [2] Deploy ReceiptRegistry (with --broadcast) ==="
forge create contracts/ReceiptRegistry.sol:ReceiptRegistry \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_PRIVKEY" \
  --constructor-args "$ADMIN" \
  --broadcast \
  --json \
  > /tmp/void-devnet-ReceiptRegistry-deploy.json

echo "[redeploy] raw ReceiptRegistry deploy JSON (first line):"
head -n 1 /tmp/void-devnet-ReceiptRegistry-deploy.json || true

RR_ADDR=$(jq -r '.deployedTo' /tmp/void-devnet-ReceiptRegistry-deploy.json)
if [ -z "$RR_ADDR" ] || [ "$RR_ADDR" = "null" ]; then
  echo "[ERR] could not parse ReceiptRegistry deployed address from forge JSON" >&2
  exit 1
fi
echo "[redeploy] ReceiptRegistry deployed at: $RR_ADDR"

echo
echo "=== [3] Sanity check code at new addresses ==="
JQ_CODE=$(cast code --rpc-url "$RPC_URL" "$JQ_ADDR")
RR_CODE=$(cast code --rpc-url "$RPC_URL" "$RR_ADDR")

echo "JobQueue code prefix:   ${JQ_CODE:0:12}"
echo "ReceiptRegistry prefix: ${RR_CODE:0:12}"

if [ "$JQ_CODE" = "0x" ]; then
  echo "[ERR] JobQueue address has no code, aborting state write." >&2
  exit 1
fi

if [ "$RR_CODE" = "0x" ]; then
  echo "[ERR] ReceiptRegistry address has no code, aborting state write." >&2
  exit 1
fi

echo
echo "=== [4] Backup and update STATE json ==="
BACKUP="docs/VOID-DEVNET-PROTOCOL-STATE.json.bak.$(date +%Y%m%d-%H%M%S)"
cp "$STATE" "$BACKUP"
echo "[redeploy] backup -> $BACKUP"

jq --arg jq "$JQ_ADDR" --arg rr "$RR_ADDR" '
  .JobQueue.address = $jq
  | .JobQueue.chainId = (.chainId // 2050)
  | .ReceiptRegistry.address = $rr
  | .ReceiptRegistry.chainId = (.chainId // 2050)
' "$BACKUP" > "$STATE.tmp"

mv "$STATE.tmp" "$STATE"

echo
echo "=== [5] Final STATE slice (AdminGate / JobQueue / ReceiptRegistry) ==="
jq '{AdminGate, JobQueue, ReceiptRegistry}' "$STATE"

echo
echo "[redeploy] DONE: JobQueue + ReceiptRegistry live and STATE updated."
