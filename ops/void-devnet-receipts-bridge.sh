#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$REPO"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
: "${WORKER_PRIVKEY:?WORKER_PRIVKEY not set}"

STATE="docs/VOID-DEVNET-PROTOCOL-STATE.json"
RECEIPTS_FILE="ops/devnet-job-receipts.jsonl"

if [ ! -f "$STATE" ]; then
  echo "[ERR] missing state file: $STATE" >&2
  exit 1
fi

if [ ! -f "$RECEIPTS_FILE" ]; then
  echo "[ERR] no receipts file: $RECEIPTS_FILE (nothing to bridge)" >&2
  exit 0
fi

JOBQUEUE=$(jq -r '(.JobQueue | (if type=="object" then (.address // empty) elif type=="string" then . else empty end))' "$STATE")
RECEIPTREG=$(jq -r '(.ReceiptRegistry | (if type=="object" then (.address // empty) elif type=="string" then . else empty end))' "$STATE")

if [ -z "$JOBQUEUE" ] || [ "$JOBQUEUE" = "null" ]; then
  echo "[ERR] JobQueue.address missing in $STATE" >&2
  exit 1
fi
if [ -z "$RECEIPTREG" ] || [ "$RECEIPTREG" = "null" ]; then
  echo "[ERR] ReceiptRegistry.address missing in $STATE" >&2
  exit 1
fi

WORKER_ADDR=$(cast wallet address --private-key "$WORKER_PRIVKEY")

echo "[info] REPO=$REPO"
echo "[info] RPC_URL=$RPC_URL"
echo "[info] JobQueue=$JOBQUEUE"
echo "[info] ReceiptRegistry=$RECEIPTREG"
echo "[info] worker=$WORKER_ADDR"
echo "[info] reading receipts from $RECEIPTS_FILE"

while IFS= read -r line; do
  [ -z "$line" ] && continue

  jobId=$(jq -r '.jobId' <<<"$line")
  worker=$(jq -r '.worker' <<<"$line")
  payloadHash=$(jq -r '.payloadHash' <<<"$line")
  resultHash=$(jq -r '.resultHash' <<<"$line")
  appId=$(jq -r '.appId' <<<"$line")
  appKey=$(cast keccak "$appId")

  if [ "$jobId" = "null" ] || [ -z "$jobId" ]; then
    echo "[warn] skipping line with no jobId: $line"
    continue
  fi

  echo
  echo "------------------------------------------------------------"
  echo "[job] id=$jobId app=$appId worker=$worker"
  echo "[info] appKey=$appKey"

  # Skip if already recorded on-chain
  has=$(cast call \
    --rpc-url "$RPC_URL" \
    "$RECEIPTREG" \
    "hasReceipt(address,uint256)(bool)" \
    "$JOBQUEUE" "$jobId")

  if [ "$has" = "true" ]; then
    echo "[info] already has receipt on-chain; skipping"
    continue
  fi

  echo "[bridge] recording receipt on-chain..."
  cast send \
    --rpc-url "$RPC_URL" \
    --private-key "$WORKER_PRIVKEY" \
    "$RECEIPTREG" \
    "recordReceipt(address,uint256,address,bytes32,bytes32,bytes32)" \
    "$JOBQUEUE" "$jobId" "$worker" "$payloadHash" "$resultHash" "$appKey"
done < "$RECEIPTS_FILE"

echo
echo "[done] bridge pass complete."
