#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$(pwd)}"
STATE="$REPO/docs/VOID-DEVNET-PROTOCOL-STATE.json"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

JOBQUEUE="$(jq -r '.JobQueue.address' "$STATE")"
RECEIPT_REG="$(jq -r '.ReceiptRegistry.address' "$STATE")"

echo "=== [void-devnet jobs/receipts report] ==="
echo "[repo]      $REPO"
echo "[state]     $STATE"
echo "[rpc_url]   $RPC_URL"
echo "[JobQueue]  $JOBQUEUE"
echo "[Receipts]  $RECEIPT_REG"
echo

# --- Totals (sanity) ---

total_jobs="$(
  cast call "$JOBQUEUE" 'totalJobs()(uint256)' \
    --rpc-url "$RPC_URL"
)"

total_receipts="$(
  cast call "$RECEIPT_REG" 'totalReceipts()(uint256)' \
    --rpc-url "$RPC_URL"
)"

if (( total_jobs > 0 )); then
  coverage_jobs="$(awk 'BEGIN { printf "%.6f\n", '"$total_receipts"' / '"$total_jobs"' }')"
else
  coverage_jobs="0.000000"
fi

echo "[totals]"
echo "  totalJobs        = $total_jobs"
echo "  totalReceipts    = $total_receipts"
echo "  receipts/job     = $coverage_jobs"
echo

# --- Derive jobIds from existing scan helper ---

if [[ ! -x "$REPO/ops/void-devnet-jobs-scan.sh" ]]; then
  echo "[error] ops/void-devnet-jobs-scan.sh not found or not executable" >&2
  exit 1
fi

job_ids=()
while IFS= read -r line; do
  case "$line" in
    "  - "0x*)
      jid="${line##*- }"
      job_ids+=("$jid")
      ;;
  esac
done < <(
  RPC_URL="$RPC_URL" \
    "$REPO/ops/void-devnet-jobs-scan.sh" 2>/dev/null
)

echo "[jobs] discovered ${#job_ids[@]} jobIds from scan"
echo

if (( ${#job_ids[@]} == 0 )); then
  echo "No jobs discovered on devnet; nothing to report."
  exit 0
fi

# --- Per-job report ---

idx=0
for jid in "${job_ids[@]}"; do
  ((idx++)) || true

  # hasResult flag
  has_result="$(
    cast call "$JOBQUEUE" 'hasResult(bytes32)(bool)' \
      "$jid" \
      --rpc-url "$RPC_URL"
  )"

  # receipts for this job (JSON array)
  rec_json="$(
    cast call "$RECEIPT_REG" \
      'getReceiptsForJob(bytes32)(bytes32[])' \
      "$jid" \
      --rpc-url "$RPC_URL" \
      --json
  )"

  rec_count="$(jq 'length' <<<"$rec_json")"

  echo "---- job #$idx ----"
  echo "jobId        : $jid"
  echo "hasResult    : $has_result"
  echo "receipts     : $rec_count"

  if (( rec_count > 0 )); then
    echo "receiptIds   :"
    # Pretty-print each receipt id on its own line
    jq -r '.[]' <<<"$rec_json" | sed 's/^/  - /'
  fi

  echo
done

echo "=== [summary] ==="
echo "jobs discovered    : ${#job_ids[@]}"
echo "totalJobs (chain)  : $total_jobs"
echo "totalReceipts      : $total_receipts"
echo "receipts/job (raw) : $coverage_jobs"
