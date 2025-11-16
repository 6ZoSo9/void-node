#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
cd "$REPO"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
JOBQUEUE=$(jq -r '.JobQueue.address' docs/VOID-DEVNET-PROTOCOL-STATE.json)
WORKER_PRIVKEY="${WORKER_PRIVKEY:?set WORKER_PRIVKEY}"

echo "[info] RPC_URL=$RPC_URL"
echo "[info] JobQueue=$JOBQUEUE"

worker=$(cast wallet address --private-key "$WORKER_PRIVKEY")
echo "[info] worker=$worker"

# Helper: strip one pair of leading/trailing double quotes if present
strip_quotes() {
  local s="$1"
  s="${s#\"}"
  s="${s%\"}"
  printf '%s' "$s"
}

# Read latest job id (this is the HIGHEST EXISTING id in this devnet)
nextId=$(cast call \
  --rpc-url "$RPC_URL" \
  "$JOBQUEUE" \
  "nextJobId()(uint256)")
echo "[info] nextJobId=$nextId"

if [[ "$nextId" -eq 0 ]]; then
  echo "[info] no jobs at all; nothing to do"
  exit 0
fi

start=1
end="$nextId"

echo "[info] scanning jobs $start..$end for oldest Posted job..."

pickedId=
pickedPoster=
pickedApp=
pickedModel=
pickedPayload=

for ((id=start; id<=end; id++)); do
  # jobs(uint256)(address,address,string,string,bytes32,bytes32,uint8,uint64,uint64)
  mapfile -t fields < <(
    cast call \
      --rpc-url "$RPC_URL" \
      "$JOBQUEUE" \
      "jobs(uint256)(address,address,string,string,bytes32,bytes32,uint8,uint64,uint64)" \
      "$id"
  )

  poster="${fields[0]}"
  workerAddr="${fields[1]}"
  appId="${fields[2]}"
  modelId="${fields[3]}"
  payloadHash="${fields[4]}"
  resultHash="${fields[5]}"
  status="${fields[6]}"
  createdAt="${fields[7]}"
  updatedAt="${fields[8]}"

  # status: 1 = Posted, 2 = Claimed, 3 = Completed, 4 = Cancelled
  if [[ "$status" == "1" ]]; then
    pickedId="$id"
    pickedPoster="$poster"
    pickedApp="$(strip_quotes "$appId")"
    pickedModel="$(strip_quotes "$modelId")"
    pickedPayload="$payloadHash"
    echo "[info] picked jobId=$pickedId (poster=$pickedPoster, app=\"$pickedApp\", model=\"$pickedModel\")"
    break
  fi
done

if [[ -z "${pickedId:-}" ]]; then
  echo "[info] no Posted jobs to claim; nothing to do"
  exit 0
fi

echo "[info] claiming job $pickedId as $worker..."
cast send \
  --rpc-url "$RPC_URL" \
  --private-key "$WORKER_PRIVKEY" \
  "$JOBQUEUE" \
  "claimJob(uint256)" \
  "$pickedId"

RESULT_HASH=$(cast keccak "void-devnet-fake-result-for-job-$pickedId")
echo "[info] RESULT_HASH=$RESULT_HASH"
echo "[info] completing job $pickedId..."

cast send \
  --rpc-url "$RPC_URL" \
  --private-key "$WORKER_PRIVKEY" \
  "$JOBQUEUE" \
  "completeJob(uint256,bytes32)" \
  "$pickedId" "$RESULT_HASH"

# Append a JSONL receipt
mkdir -p ops
out="ops/devnet-job-receipts.jsonl"
ts=$(date +%s)

jq -c --null-input \
  --argjson jobId "$pickedId" \
  --arg ts "$ts" \
  --arg jq "$JOBQUEUE" \
  --arg wid "$worker" \
  --arg app "$pickedApp" \
  --arg model "$pickedModel" \
  --arg payload "$pickedPayload" \
  --arg result "$RESULT_HASH" \
  --arg rpc "$RPC_URL" \
  '{jobId: $jobId,
    ts: ($ts|tonumber),
    jobQueue: $jq,
    worker: $wid,
    appId: $app,
    modelId: $model,
    payloadHash: $payload,
    resultHash: $result,
    rpcUrl: $rpc}' >> "$out"

echo "[info] appended receipt to $out"
