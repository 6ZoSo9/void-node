#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 2 ]; then
  echo "usage: $0 <jobId> <channel> [summary...]" >&2
  exit 1
fi

JOB_ID="$1"
CHANNEL="$2"
shift 2 || true
SUMMARY="${*:-auto summary for job $JOB_ID}"

STATE="docs/VOID-DEVNET-PROTOCOL-STATE.json"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
PRIV="${DEVNET_PRIVKEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"

if [ ! -f "$STATE" ]; then
  echo "[ERR] missing state file: $STATE" >&2
  exit 1
fi

RECEIPT_REGISTRY=$(jq -r '.ReceiptRegistry' "$STATE")
if [ -z "$RECEIPT_REGISTRY" ] || [ "$RECEIPT_REGISTRY" = "null" ]; then
  echo "[ERR] ReceiptRegistry address not set in $STATE" >&2
  exit 1
fi

# Demo IDs; can override via env
AGENT_ID="${AGENT_ID:-1}"
MODEL_ID="${MODEL_ID:-1}"
DATASET_ID="${DATASET_ID:-1}"

SUMMARY_HASH=$(cast keccak "$SUMMARY")
RESULT_PRE="nf:v1;channel:$CHANNEL;kind:summary;job:$JOB_ID;body_hash:$SUMMARY_HASH"
RESULT_HASH=$(cast keccak "$RESULT_PRE")

PROOF_HASH=0x0000000000000000000000000000000000000000000000000000000000000000
META_URI="void:nullfeed/$CHANNEL/summary/job-$JOB_ID"
STATUS_OK=1

RID_BEFORE=$(cast call "$RECEIPT_REGISTRY" "nextReceiptId()(uint256)" --rpc-url "$RPC_URL" || echo "0")

TX_HASH=$(cast send \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIV" \
  "$RECEIPT_REGISTRY" \
  "recordReceipt(uint256,uint256,uint256,uint256,bytes32,bytes32,string,uint8)(uint256)" \
  "$JOB_ID" \
  "$AGENT_ID" \
  "$MODEL_ID" \
  "$DATASET_ID" \
  "$RESULT_HASH" \
  "$PROOF_HASH" \
  "$META_URI" \
  "$STATUS_OK" \
  --json | jq -r .transactionHash)

RID_AFTER=$(cast call "$RECEIPT_REGISTRY" "nextReceiptId()(uint256)" --rpc-url "$RPC_URL")
NEW_RID="$RID_AFTER"

echo "[nullfeed-receipt] jobId:       $JOB_ID"
echo "[nullfeed-receipt] channel:     $CHANNEL"
echo "[nullfeed-receipt] summary:     $SUMMARY"
echo "[nullfeed-receipt] summaryHash: $SUMMARY_HASH"
echo "[nullfeed-receipt] resultHash:  $RESULT_HASH"
echo "[nullfeed-receipt] metaURI:     $META_URI"
echo "[nullfeed-receipt] txHash:      $TX_HASH"
echo "[nullfeed-receipt] receiptId:   $NEW_RID"

# Local log
mkdir -p data
LOG_FILE="data/nullfeed-receipts.jsonl"
TS=$(date -Iseconds)

jq -nc \
  --arg ts "$TS" \
  --arg channel "$CHANNEL" \
  --arg summary "$SUMMARY" \
  --arg resultHash "$RESULT_HASH" \
  --arg proofHash "$PROOF_HASH" \
  --arg metaURI "$META_URI" \
  --arg txHash "$TX_HASH" \
  --argjson jobId "$JOB_ID" \
  --argjson receiptId "$NEW_RID" \
  --argjson agentId "$AGENT_ID" \
  --argjson modelId "$MODEL_ID" \
  --argjson datasetId "$DATASET_ID" \
  --argjson status "$STATUS_OK" \
  '{
    ts: $ts,
    jobId: $jobId,
    receiptId: $receiptId,
    channel: $channel,
    agentId: $agentId,
    modelId: $modelId,
    datasetId: $datasetId,
    summary: $summary,
    resultHash: $resultHash,
    proofHash: $proofHash,
    metaURI: $metaURI,
    status: $status,
    txHash: $txHash
  }' >> "$LOG_FILE"
