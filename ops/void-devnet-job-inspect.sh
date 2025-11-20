#!/usr/bin/env bash
set -euo pipefail

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE="${STATE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"

JOB_ID="${1:-}"

if [[ -z "$JOB_ID" ]]; then
  echo "usage: $0 <jobId-hex>" >&2
  exit 1
fi

if [[ ! -f "$STATE" ]]; then
  echo "[ERR] STATE file not found: $STATE" >&2
  exit 1
fi

JOBQUEUE=$(jq -r '.JobQueue.address' "$STATE")
RECEIPT_REG=$(jq -r '.ReceiptRegistry.address' "$STATE")

echo "[RPC_URL]      $RPC_URL"
echo "[STATE]        $STATE"
echo "[JobQueue]     $JOBQUEUE"
echo "[ReceiptReg]   $RECEIPT_REG"
echo "[jobId]        $JOB_ID"
echo

echo "[1] totalJobs()"
cast call "$JOBQUEUE" 'totalJobs()(uint256)' --rpc-url "$RPC_URL" || {
  echo "[ERR] totalJobs() call failed" >&2
  exit 1
}
echo

echo "[2] getJobStatus(jobId) (uint8)"
cast call "$JOBQUEUE" 'getJobStatus(bytes32)(uint8)' "$JOB_ID" --rpc-url "$RPC_URL" || {
  echo "[ERR] getJobStatus(bytes32) call failed" >&2
  exit 1
}
echo

echo "[3] hasResult(jobId) (bool)"
cast call "$JOBQUEUE" 'hasResult(bytes32)(bool)' "$JOB_ID" --rpc-url "$RPC_URL" || {
  echo "[ERR] hasResult(bytes32) call failed" >&2
  exit 1
}
echo

echo "[4] getJob(jobId) full struct"
cast call "$JOBQUEUE" \
  'getJob(bytes32)((bytes32,uint256,string,address,string,bytes32,uint64,uint8,address,bytes32,uint64,uint32))' \
  "$JOB_ID" \
  --rpc-url "$RPC_URL" || {
    echo "[ERR] getJob(bytes32) call failed" >&2
    exit 1
  }
