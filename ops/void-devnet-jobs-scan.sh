#!/usr/bin/env bash
set -euo pipefail

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE="${STATE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"

if [[ ! -f "$STATE" ]]; then
  echo "[ERR] STATE file not found: $STATE" >&2
  exit 1
fi

JOBQUEUE=$(jq -r '.JobQueue.address' "$STATE")

# Hard-coded JobPosted event signature from logs:
# 0x9cc10673c0632147a123f5845fae256a875a506bf49adc87e47e69ffd69f088c
JOB_POSTED_SIG="0x9cc10673c0632147a123f5845fae256a875a506bf49adc87e47e69ffd69f088c"

echo "[RPC_URL]   $RPC_URL"
echo "[STATE]     $STATE"
echo "[JobQueue]  $JOBQUEUE"
echo "[EventSig]  $JOB_POSTED_SIG (JobPosted)"
echo

# Dump logs as JSON so we can scrape jobIds cleanly
RAW_JSON=$(cast logs \
  --from-block 0 \
  --to-block latest \
  --address "$JOBQUEUE" \
  --rpc-url "$RPC_URL" \
  --json)

# Extract unique jobIds (topics[1]) for JobPosted
mapfile -t JOB_IDS < <(printf '%s\n' "$RAW_JSON" | jq -r --arg sig "$JOB_POSTED_SIG" '
  .[]
  | select(.topics[0] == $sig)
  | .topics[1]
' | sort -u)

if [[ ${#JOB_IDS[@]} -eq 0 ]]; then
  echo "[INFO] No JobPosted events found."
  exit 0
fi

echo "[INFO] Found ${#JOB_IDS[@]} JobPosted events:"
for id in "${JOB_IDS[@]}"; do
  echo "  - $id"
done
echo

# For each jobId, use the existing inspector
for id in "${JOB_IDS[@]}"; do
  echo "============================================================"
  echo "[JOB] $id"
  echo "------------------------------------------------------------"
  RPC_URL="$RPC_URL" ./ops/void-devnet-job-inspect.sh "$id" || {
    echo "[WARN] inspector failed for jobId=$id" >&2
  }
  echo
done
