#!/usr/bin/env bash
set -euo pipefail

# Simple read-only inspector for a single JobQueue job on VOID devnet.
# Usage:
#   ./ops/void-devnet-job-inspect.sh 0x...
#   JOB_ID=0x... ./ops/void-devnet-job-inspect.sh

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE="${STATE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"

JOB_ID="${1:-${JOB_ID:-}}"
if [[ -z "${JOB_ID}" ]]; then
  echo "usage: $0 <jobId>  (or set JOB_ID env)" >&2
  exit 1
fi

if [[ ! -f "$STATE" ]]; then
  echo "[error] state file not found: $STATE" >&2
  exit 1
fi

JOBQUEUE="$(jq -r '(.JobQueue | (if type=="object" then (.address // empty) elif type=="string" then . else empty end))' "$STATE")"
if [[ -z "$JOBQUEUE" || "$JOBQUEUE" == "null" ]]; then
  echo "[error] JobQueue.address missing in $STATE" >&2
  exit 1
fi

echo "=== [devnet job inspect] ==="
echo "[repo]      $repo"
echo "[state]     $STATE"
echo "[rpc_url]   $RPC_URL"
echo "[JobQueue]  $JOBQUEUE"
echo "[jobId]     $JOB_ID"
echo

echo "=== [totals] ==="
cast call "$JOBQUEUE" 'totalJobs()(uint256)' --rpc-url "$RPC_URL" \
  | awk '{print "totalJobs       =", $1}'
echo

echo "=== [status + hasResult] ==="
cast call "$JOBQUEUE" 'getJobStatus(bytes32)(uint8)' "$JOB_ID" --rpc-url "$RPC_URL" \
  | awk '{print "getJobStatus    =", $1}'
cast call "$JOBQUEUE" 'hasResult(bytes32)(bool)' "$JOB_ID" --rpc-url "$RPC_URL" \
  | awk '{print "hasResult       =", $1}'
echo

echo "=== [getJob full tuple] ==="
cast call "$JOBQUEUE" \
  'getJob(bytes32)((bytes32,uint256,string,address,string,bytes32,uint64,uint8,address,bytes32,uint64,uint32))' \
  "$JOB_ID" \
  --rpc-url "$RPC_URL" || {
    echo "[warn] getJob call failed" >&2
  }
