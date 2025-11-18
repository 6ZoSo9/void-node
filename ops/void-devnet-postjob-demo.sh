#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
STATE="${STATE:-$REPO/docs/VOID-DEVNET-PROTOCOL-STATE.json}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

if [ ! -f "$STATE" ]; then
  echo "[ERR] missing state file: $STATE" >&2
  exit 1
fi

DEVNET_PRIVKEY="${DEVNET_PRIVKEY:-}"
if [ -z "${DEVNET_PRIVKEY}" ]; then
  echo "[ERR] DEVNET_PRIVKEY is not set in env" >&2
  exit 1
fi

JOBQ_ADDR=$(jq -r '.JobQueue.address // .JobQueue // empty' "$STATE")
if [ -z "$JOBQ_ADDR" ] || [ "$JOBQ_ADDR" = "null" ]; then
  echo "[ERR] JobQueue address not found in $STATE" >&2
  exit 1
fi

echo "[job] JobQueue       = $JOBQ_ADDR"
echo "[job] RPC_URL        = $RPC_URL"
echo "[job] STATE          = $STATE"

# Use the same demo IDs/hashes you already use for agent-os so everything lines up
MODEL_ID="${MODEL_ID:-void-demo-llm-1}"
PAYLOAD_HASH="${PAYLOAD_HASH:-0xd43bc6f13439e1e2be2178364c9d05f28b591917b12bb7498ee51d6649a1c3a1}"
APP_TAG="${APP_TAG:-void-devnet-receipts-test}"

echo "[job] MODEL_ID       = $MODEL_ID"
echo "[job] PAYLOAD_HASH   = $PAYLOAD_HASH"
echo "[job] APP_TAG        = $APP_TAG"

echo "[job] totalJobs() BEFORE..."
JOBS_BEFORE=$(cast call --rpc-url "$RPC_URL" "$JOBQ_ADDR" "totalJobs()(uint256)" | tr -d '\r')
echo "      totalJobs(before) = $JOBS_BEFORE"

echo "[job] cast send postJob(string,bytes32,string)(bytes32)..."
TX_JSON=$(
  cast send \
    --rpc-url "$RPC_URL" \
    --private-key "$DEVNET_PRIVKEY" \
    "$JOBQ_ADDR" \
    "postJob(string,bytes32,string)(bytes32)" \
    "$MODEL_ID" \
    "$PAYLOAD_HASH" \
    "$APP_TAG" \
    --json
)

# Debug line for you if you need it:
# echo "$TX_JSON" | jq .

# JobPosted is the only event; jobId is the first indexed arg => topics[1]
JOB_ID=$(jq -r '.logs[0].topics[1]' <<<"$TX_JSON")

if [ -z "$JOB_ID" ] || [ "$JOB_ID" = "null" ]; then
  echo "[ERR] failed to parse jobId from JobPosted logs; raw TX JSON follows:" >&2
  echo "$TX_JSON" >&2
  exit 1
fi

echo "[ok] jobId           = $JOB_ID"

echo "[job] totalJobs() AFTER..."
JOBS_AFTER=$(cast call --rpc-url "$RPC_URL" "$JOBQ_ADDR" "totalJobs()(uint256)" | tr -d '\r')
echo "      totalJobs(after) = $JOBS_AFTER"

if [ "$JOBS_AFTER" = "$JOBS_BEFORE" ]; then
  echo "[WARN] totalJobs did not change; something is off" >&2
fi

cat <<EOF

[summary]
  - Posted devnet JobQueue job:
      jobId      = $JOB_ID
      modelId    = $MODEL_ID
      payloadHash= $PAYLOAD_HASH
      appTag     = $APP_TAG
  - totalJobs: $JOBS_BEFORE -> $JOBS_AFTER

Use this jobId for ReceiptRegistry.submitReceipt or let your agent pipeline pick it up.

EOF
