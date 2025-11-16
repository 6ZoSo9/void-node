#!/usr/bin/env bash
set -euo pipefail

HTTP="${HTTP_PORT:-4100}"

# Chain + contract (from your devnet run)
CHAIN_ID=2050
JOBQUEUE_ADDR="0x5FbDB2315678afecb367f032d93F642f64180aa3"
JOB_ID=1

# Same dev EOA you used on devnet
POSTER="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
AGENT="$POSTER"

# From your completeJob tx
RESULT_HASH="0x97f1c839596b50ef3833283af670f695ee669a2933304347e023ae068042eeb8"
RESULT_URI="void://devnet/job/1/result-1"
TX_HASH_COMPLETE="0xabaa5937bc13fb60c58c618e07ac1da810cadd4ed999f24312f79efcf428ff6b"

# From jobs(1) call you ran (createdAt/updatedAt)
CREATED_AT=1763244776
COMPLETED_AT=1763244816

payload="$(
  jq -n \
    --arg version "v0" \
    --argjson chainId "$CHAIN_ID" \
    --arg jobqueue "$JOBQUEUE_ADDR" \
    --argjson jobId "$JOB_ID" \
    --arg poster "$POSTER" \
    --arg agent "$AGENT" \
    --arg status "done" \
    --arg resultHash "$RESULT_HASH" \
    --arg resultURI "$RESULT_URI" \
    --arg txHashComplete "$TX_HASH_COMPLETE" \
    --argjson createdAt "$CREATED_AT" \
    --argjson completedAt "$COMPLETED_AT" \
    --arg app "nullfeed" \
    --arg channel "#general" \
    --arg kind "summarize" \
    --arg msgId "demo-message-1" \
    --arg modelId "void-agent-devnet-demo-1" \
    --arg modelHash "sha256:demo-model-hash" \
    '{
      version: $version,
      chainId: $chainId,
      jobqueue: $jobqueue,
      jobId: $jobId,
      poster: $poster,
      agent: $agent,
      status: $status,
      resultHash: $resultHash,
      resultURI: $resultURI,
      txHashComplete: $txHashComplete,
      success: true,
      createdAt: $createdAt,
      completedAt: $completedAt,
      app: $app,
      channel: $channel,
      kind: $kind,
      msgId: $msgId,
      modelId: $modelId,
      modelHash: $modelHash
    }'
)"

echo "[payload]"
echo "$payload" | jq .

echo
echo "[POST] -> http://127.0.0.1:${HTTP}/agent/v0/receipt"
curl -fsS -X POST "http://127.0.0.1:${HTTP}/agent/v0/receipt" \
  -H 'Content-Type: application/json' \
  -d "$payload"

echo
echo "[ok posted]"
