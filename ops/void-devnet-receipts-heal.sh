#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE="${STATE:-$REPO/docs/VOID-DEVNET-PROTOCOL-STATE.json}"

cd "$REPO"

if [[ ! -f "$STATE" ]]; then
  echo "[receipts-heal] ERROR: STATE file not found: $STATE" >&2
  exit 1
fi

JOBQUEUE=$(jq -r '(.JobQueue | (if type=="object" then (.address // empty) elif type=="string" then . else empty end))' "$STATE")
RECEIPT_REG=$(jq -r '(.ReceiptRegistry | (if type=="object" then (.address // empty) elif type=="string" then . else empty end))' "$STATE")

echo "[receipts-heal] REPO        = $REPO"
echo "[receipts-heal] RPC_URL     = $RPC_URL"
echo "[receipts-heal] STATE       = $STATE"
echo "[receipts-heal] JobQueue    = $JOBQUEUE"
echo "[receipts-heal] ReceiptReg  = $RECEIPT_REG"
echo

# Get totalJobs for reference
total_jobs=$(cast call "$JOBQUEUE" 'totalJobs()(uint256)' --rpc-url "$RPC_URL" | tr -d '\r')
echo "[receipts-heal] totalJobs() = $total_jobs"
echo

# Signature of JobPosted event
JOB_POSTED_SIG="0x9cc10673c0632147a123f5845fae256a875a506bf49adc87e47e69ffd69f088c"

echo "[receipts-heal] scanning JobPosted logs..."
RAW_JSON=$(cast logs \
  --from-block 0 \
  --to-block latest \
  --address "$JOBQUEUE" \
  --rpc-url "$RPC_URL" \
  --json)

mapfile -t JOB_IDS < <(printf '%s\n' "$RAW_JSON" | jq -r --arg sig "$JOB_POSTED_SIG" '
  .[]
  | select(.topics[0] == $sig)
  | .topics[1]
' | sort -u)

if [[ "${#JOB_IDS[@]}" -eq 0 ]]; then
  echo "[receipts-heal] no JobPosted events found"
  exit 0
fi

echo "[receipts-heal] found ${#JOB_IDS[@]} JobPosted ids:"
for id in "${JOB_IDS[@]}"; do
  echo "  - $id"
done
echo
echo "============================================================"

missing_count=0

for id in "${JOB_IDS[@]}"; do
  echo "[JOB] $id"
  echo "------------------------------------------------------------"

  status=$(cast call "$JOBQUEUE" 'getJobStatus(bytes32)(uint8)' "$id" --rpc-url "$RPC_URL" | tr -d '\r' || echo "ERR")
  has_res=$(cast call "$JOBQUEUE" 'hasResult(bytes32)(bool)' "$id" --rpc-url "$RPC_URL" | tr -d '\r' || echo "ERR")

  # getJob mainly for context
  job_struct=$(cast call "$JOBQUEUE" \
    'getJob(bytes32)((bytes32,uint256,string,address,string,bytes32,uint64,uint8,address,bytes32,uint64,uint32))' \
    "$id" \
    --rpc-url "$RPC_URL" 2>/dev/null || echo "<getJob failed>")

  echo "[1] getJobStatus(jobId) (uint8)      = $status"
  echo "[2] hasResult(jobId) (bool)          = $has_res"
  echo "[3] getJob(jobId) full struct        = $job_struct"
  echo

  if [[ "$has_res" != "true" ]]; then
    missing_count=$((missing_count+1))
    echo "[!!] MISSING RECEIPT for jobId:"
    echo "     $id"
    echo
    echo "     To record a devnet-only receipt for this job, you will need the"
    echo "     actual ReceiptRegistry function signature. For example:"
    echo
    echo "       DEVNET_PRIVKEY=0x... \\"
    echo "       cast send \\"
    echo "         --rpc-url $RPC_URL \\"
    echo "         --private-key \"\$DEVNET_PRIVKEY\" \\"
    echo "         $RECEIPT_REG \\"
    echo "         '<YourReceiptFn(bytes32,...)>' \\"
    echo "         '$id' \\"
    echo "         <other-args>"
    echo
    echo "     Fill in <YourReceiptFn(bytes32,...)> and <other-args> to match"
    echo "     the ReceiptRegistry ABI you defined."
    echo
  fi

  echo "============================================================"
done

echo "[receipts-heal] jobs missing receipts (hasResult=false): $missing_count"
