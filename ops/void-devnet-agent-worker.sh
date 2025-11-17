#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
STATE="$REPO/docs/VOID-DEVNET-PROTOCOL-STATE.json"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

if [[ ! -f "$STATE" ]]; then
  echo "[agent-worker] ERROR: state file not found: $STATE" >&2
  exit 1
fi

JOBQUEUE_ADDR="$(jq -r '.JobQueue.address' "$STATE")"
if [[ -z "$JOBQUEUE_ADDR" || "$JOBQUEUE_ADDR" == "null" ]]; then
  echo "[agent-worker] ERROR: JobQueue.address missing in state" >&2
  exit 1
fi

if [[ -z "${DEVNET_PRIVKEY:-}" ]]; then
  echo "[agent-worker] ERROR: DEVNET_PRIVKEY not set in env" >&2
  exit 1
fi

echo "[agent-worker] repo:    $REPO"
echo "[agent-worker] state:   $STATE"
echo "[agent-worker] RPC:     $RPC_URL"
echo "[agent-worker] JobQueue $JOBQUEUE_ADDR"

cd "$REPO"

NEXT_JOB_ID="$(cast call "$JOBQUEUE_ADDR" "nextJobId()(uint256)" --rpc-url "$RPC_URL")"
echo "[agent-worker] nextJobId = $NEXT_JOB_ID"

# Interpret nextJobId as "latest job id" for now.
LAST_ID="$NEXT_JOB_ID"
if [[ "$LAST_ID" -lt 1 ]]; then
  echo "[agent-worker] no jobs yet (LAST_ID=$LAST_ID)"
  exit 0
fi

processed=0
for ((id=1; id<=LAST_ID; id++)); do
  STATUS="$(cast call "$JOBQUEUE_ADDR" "getStatus(uint256)(uint8)" "$id" --rpc-url "$RPC_URL")"
  # 0 = Posted, 1 = Claimed, 2 = Completed, 3 = Cancelled, 4 = Expired
  if [[ "$STATUS" != "0" ]]; then
    echo "[agent-worker] job $id: status=$STATUS (not Posted, skipping)"
    continue
  fi

  echo "[agent-worker] === processing job $id ==="

  JOB_RAW="$(cast call "$JOBQUEUE_ADDR" \
    "getJob(uint256)((address,bytes32,string,bytes32,string,bytes32,uint256,uint64,uint64,uint8,address,bytes32,string,uint256,uint16))" \
    "$id" \
    --rpc-url "$RPC_URL")"
  echo "[agent-worker] job $id: $JOB_RAW"

  echo "[agent-worker] claiming job $id..."
  cast send \
    --rpc-url "$RPC_URL" \
    --private-key "$DEVNET_PRIVKEY" \
    "$JOBQUEUE_ADDR" \
    "claimJob(uint256)" \
    "$id"

  RECEIPT_META="$(jq -cn --arg id "$id" '
    {
      ok: true,
      jobId: ($id|tonumber),
      msg:  "devnet agent auto-complete",
      ts:   (now | floor)
    }
  ')"
  RECEIPT_HASH="$(cast keccak "$RECEIPT_META")"

  echo "[agent-worker] completing job $id..."
  echo "[agent-worker]   RECEIPT_HASH=$RECEIPT_HASH"
  echo "[agent-worker]   RECEIPT_META=$RECEIPT_META"

  cast send \
    --rpc-url "$RPC_URL" \
    --private-key "$DEVNET_PRIVKEY" \
    "$JOBQUEUE_ADDR" \
    "completeJob(uint256,bytes32,string)" \
    "$id" \
    "$RECEIPT_HASH" \
    "$RECEIPT_META"

  FINAL="$(cast call "$JOBQUEUE_ADDR" \
    "getJob(uint256)((address,bytes32,string,bytes32,string,bytes32,uint256,uint64,uint64,uint8,address,bytes32,string,uint256,uint16))" \
    "$id" \
    --rpc-url "$RPC_URL")"
  echo "[agent-worker] job $id final: $FINAL"

  processed=$((processed+1))
done

echo "[agent-worker] done, processed $processed job(s)"
