#!/usr/bin/env bash
set -euo pipefail

echo "[job-debug] repo=$(pwd)"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE_FILE="${STATE_FILE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"

JOB_ID="${1:-}"
if [[ -z "$JOB_ID" ]]; then
  echo "Usage: $0 <jobId-hex>" >&2
  exit 1
fi

if [[ ! -f "$STATE_FILE" ]]; then
  echo "[job-debug] ERROR: state file not found: $STATE_FILE" >&2
  exit 1
fi

JOBQUEUE=$(jq -r '.JobQueue.address' "$STATE_FILE")
RECEIPT_REG=$(jq -r '.ReceiptRegistry.address' "$STATE_FILE")

echo "[job-debug] RPC_URL=$RPC_URL"
echo "[job-debug] STATE_FILE=$STATE_FILE"
echo "[job-debug] JobQueue=$JOBQUEUE"
echo "[job-debug] ReceiptRegistry=$RECEIPT_REG"
echo "[job-debug] jobId=$JOB_ID"
echo

echo "[job-debug] chain totals:"
cast call "$JOBQUEUE" 'totalJobs()(uint256)' --rpc-url "$RPC_URL" \
  | xargs printf '  totalJobs        = %s\n'
cast call "$RECEIPT_REG" 'totalReceipts()(uint256)' --rpc-url "$RPC_URL" \
  | xargs printf '  totalReceipts    = %s\n'
echo

echo "[job-debug] JobQueue view:"
if cast call "$JOBQUEUE" 'hasResult(bytes32)(bool)' "$JOB_ID" --rpc-url "$RPC_URL" >/tmp/void-job-hasresult.$$ 2>/dev/null; then
  xargs printf '  hasResult        = %s\n' </tmp/void-job-hasresult.$$
else
  echo "  hasResult        = <call failed>"
fi
rm -f /tmp/void-job-hasresult.$$ || true

if cast call "$JOBQUEUE" 'getJobStatus(bytes32)(uint8)' "$JOB_ID" --rpc-url "$RPC_URL" >/tmp/void-job-status.$$ 2>/dev/null; then
  xargs printf '  getJobStatus     = %s\n' </tmp/void-job-status.$$
else
  echo "  getJobStatus     = <call failed>"
fi
rm -f /tmp/void-job-status.$$ || true

echo
echo "[job-debug] getJob(...) tuple (raw):"
cast call "$JOBQUEUE" \
  'getJob(bytes32)((bytes32,uint256,string,address,string,bytes32,uint64,uint8,address,bytes32,uint64,uint32))' \
  "$JOB_ID" \
  --rpc-url "$RPC_URL" || echo "[job-debug] getJob(...) call failed"
echo

echo "[job-debug] ReceiptRegistry view:"
RECEIPT_IDS=$(cast call "$RECEIPT_REG" 'getReceiptsForJob(bytes32)(bytes32[])' "$JOB_ID" --rpc-url "$RPC_URL" || echo "")

if [[ -z "$RECEIPT_IDS" || "$RECEIPT_IDS" == "[]" ]]; then
  echo "  receipts_count   = 0"
  echo "  receipts         = []"
else
  # Count how many 0x entries we have
  COUNT=$(grep -o '0x' <<<"$RECEIPT_IDS" | wc -l | tr -d ' ')
  echo "  receipts_count   = $COUNT"
  echo "  receipts (first 5):"
  echo "$RECEIPT_IDS" \
    | sed -E 's/^\[//; s/\]$//' \
    | tr ',' '\n' \
    | sed 's/^ *//' \
    | sed -n '1,5p' \
    | sed 's/^/    - /'
fi

echo
echo "[job-debug] DONE."
