#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
cd "$REPO"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
: "${DEVNET_PRIVKEY:?set DEVNET_PRIVKEY first (devnet private key)}"

STATE_FILE="docs/VOID-DEVNET-PROTOCOL-STATE.json"
if [ ! -f "$STATE_FILE" ]; then
  echo "[ERR] missing $STATE_FILE" >&2
  exit 1
fi

JOBQUEUE_ADDR="$(jq -r '.JobQueue' "$STATE_FILE")"
if [ -z "$JOBQUEUE_ADDR" ] || [ "$JOBQUEUE_ADDR" = "null" ]; then
  echo "[ERR] JobQueue address not found in $STATE_FILE" >&2
  exit 1
fi

JOB_ID="${1:-}"

if [ -z "$JOB_ID" ]; then
  echo "[agent] no jobId supplied, creating a new job on-chain..."

  # Next job id before postJob
  JOB_ID="$(cast call "$JOBQUEUE_ADDR" "nextJobId()(uint256)" --rpc-url "$RPC_URL")"
  echo "[agent] nextJobId() = $JOB_ID (will be used)"

  APP="$(cast keccak "nullfeed")"
  CHAN="$(cast keccak "#general")"
  MSG="$(cast keccak "devnet-auto-job-$JOB_ID")"
  KIND="$(cast keccak "summarize")"

  cast send "$JOBQUEUE_ADDR" \
    "postJob(bytes32,bytes32,bytes32,bytes32,string)(uint256)" \
    "$APP" "$CHAN" "$MSG" "$KIND" "void-agent demo job $JOB_ID" \
    --rpc-url "$RPC_URL" \
    --private-key "$DEVNET_PRIVKEY" \
    >/dev/null

  echo "[agent] posted jobId=$JOB_ID"
else
  echo "[agent] using existing jobId=$JOB_ID (no new postJob)"
fi

echo "[agent] claiming jobId=$JOB_ID..."
cast send "$JOBQUEUE_ADDR" \
  "claimJob(uint256)" \
  "$JOB_ID" \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_PRIVKEY" \
  >/dev/null

RESULT_TEXT="void-devnet demo result for job $JOB_ID"
RESULT_HASH="$(cast keccak "$RESULT_TEXT")"
RESULT_URI="void://devnet/job/$JOB_ID/demo-result-1"

echo "[agent] completing jobId=$JOB_ID..."
TX_JSON="$(cast send "$JOBQUEUE_ADDR" \
  "completeJob(uint256,bytes32,string,bool)" \
  "$JOB_ID" "$RESULT_HASH" "$RESULT_URI" true \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_PRIVKEY" \
  --json)"

TX_HASH_COMPLETE="$(jq -r '.transactionHash' <<<"$TX_JSON")"

# Read job struct AFTER completion
JOB_JSON="$(cast call "$JOBQUEUE_ADDR" \
  "jobs(uint256)(address,uint8,bytes32,bytes32,bytes32,bytes32,string,string,bytes32,uint64,uint64,address)" \
  "$JOB_ID" \
  --rpc-url "$RPC_URL" \
  --json)"

POSTER_ADDR="$(jq -r '.[0]' <<<"$JOB_JSON")"
CREATED_AT="$(jq -r '.[9]' <<<"$JOB_JSON")"
UPDATED_AT="$(jq -r '.[10]' <<<"$JOB_JSON")"
AGENT_ADDR="$(jq -r '.[11]' <<<"$JOB_JSON")"

[ "$AGENT_ADDR" != "0x0000000000000000000000000000000000000000" ] || AGENT_ADDR="$POSTER_ADDR"

# Policy hook wants a stable id; match the pattern it already used:
# jobqueue-<jobId>-<app>-<suffix>
ID="jobqueue-${JOB_ID}-nullfeed-demo-1"

RECEIPT_PATH="/tmp/agent-receipt-job-${JOB_ID}.json"

cat >"$RECEIPT_PATH" <<JSON
{
  "version": "v0",
  "chainId": 2050,
  "jobqueue": "$JOBQUEUE_ADDR",
  "jobId": $JOB_ID,
  "poster": "$POSTER_ADDR",
  "agent": "$AGENT_ADDR",
  "status": "done",
  "resultHash": "$RESULT_HASH",
  "resultURI": "$RESULT_URI",
  "txHashComplete": "$TX_HASH_COMPLETE",
  "success": true,
  "createdAt": $CREATED_AT,
  "completedAt": $UPDATED_AT,
  "app": "nullfeed",
  "channel": "#general",
  "kind": "summarize",
  "msgId": "devnet-auto-job-$JOB_ID",
  "modelId": "void-agent-devnet-demo-1",
  "modelHash": "sha256:demo-model-hash",
  "id": "$ID"
}
JSON

echo "[agent] receipt body:"
cat "$RECEIPT_PATH"

echo
echo "[agent] POSTing receipt to /agent/v0/receipt..."
curl -i -X POST "http://127.0.0.1:4100/agent/v0/receipt" \
  -H 'Content-Type: application/json' \
  --data-binary @"$RECEIPT_PATH"

echo
echo "[agent] done. jobId=$JOB_ID tx=$TX_HASH_COMPLETE"
