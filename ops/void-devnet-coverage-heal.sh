#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$(pwd)}"
STATE="$REPO/docs/VOID-DEVNET-PROTOCOL-STATE.json"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

TEXTFILE_DIR="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
OUT="$TEXTFILE_DIR/void_devnet_coverage.prom"

JOBQUEUE="$(jq -r '.JobQueue.address' "$STATE")"
RECEIPT_REG="$(jq -r '.ReceiptRegistry.address' "$STATE")"

echo "[heal] repo=$REPO"
echo "[heal] rpc_url=$RPC_URL"
echo "[heal] JobQueue=$JOBQUEUE"
echo "[heal] ReceiptRegistry=$RECEIPT_REG"

# --- Totals from contracts ---

total_jobs="$(
  cast call "$JOBQUEUE" 'totalJobs()(uint256)' \
    --rpc-url "$RPC_URL"
)"

total_receipts="$(
  cast call "$RECEIPT_REG" 'totalReceipts()(uint256)' \
    --rpc-url "$RPC_URL"
)"

# --- Job IDs from the existing scan helper ---

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
    ./ops/void-devnet-jobs-scan.sh 2>/dev/null
)

echo "[heal] found ${#job_ids[@]} JobPosted ids:"
for jid in "${job_ids[@]}"; do
  echo "  - $jid"
done

# --- For each jobId, check if ReceiptRegistry has any receipts ---

jobs_with_result=0
jobs_without_result=0

for jid in "${job_ids[@]}"; do
  rec_raw="$(
    cast call "$RECEIPT_REG" \
      'getReceiptsForJob(bytes32)(bytes32[])' \
      "$jid" \
      --rpc-url "$RPC_URL" \
      | tr -d ' \n'
  )"

  if [[ "$rec_raw" == "[]" ]]; then
    ((jobs_without_result++))
  else
    ((jobs_with_result++))
  fi
done

# --- Coverage + health ---

if (( total_jobs > 0 )); then
  coverage_jobs="$(awk 'BEGIN { printf "%.6f\n", '"$jobs_with_result"' / '"$total_jobs"' }')"
  coverage_raw="$(awk 'BEGIN { printf "%.6f\n", '"$total_receipts"' / '"$total_jobs"' }')"
else
  coverage_jobs="0.000000"
  coverage_raw="0.000000"
fi

# v1: every job has >=1 receipt
if (( total_jobs > 0 && jobs_without_result == 0 )); then
  coverage_health=1
else
  coverage_health=0
fi

# v2: raw receipts_total >= jobs_total
if (( total_jobs > 0 && total_receipts >= total_jobs )); then
  receipts_health_v2=1
else
  receipts_health_v2=0
fi

echo "[heal] totals: jobs=$total_jobs receipts=$total_receipts coverage_raw=$coverage_raw coverage_jobs=$coverage_jobs"
echo "[heal] jobs_with_result=$jobs_with_result jobs_without_result=$jobs_without_result"
echo "[heal] health: coverage_health=$coverage_health receipts_health_v2=$receipts_health_v2"

metrics="$(cat <<EOF
# HELP void_devnet_coverage Job coverage on VOID devnet (0..1) [job-based, >=1 receipt per job]
# TYPE void_devnet_coverage gauge
void_devnet_coverage{chain="devnet"} $coverage_jobs
# HELP void_devnet_jobs_total Total jobs ever posted on VOID devnet
# TYPE void_devnet_jobs_total gauge
void_devnet_jobs_total{chain="devnet"} $total_jobs
# HELP void_devnet_receipts_total Total receipts ever recorded in ReceiptRegistry on VOID devnet
# TYPE void_devnet_receipts_total gauge
void_devnet_receipts_total{chain="devnet"} $total_receipts
# HELP void_devnet_coverage_health 1 if every JobQueue job has >=1 receipt, else 0
# TYPE void_devnet_coverage_health gauge
void_devnet_coverage_health{chain="devnet"} $coverage_health

# HELP void_devnet_jobs_with_result jobs with >=1 receipt on VOID devnet (job-based)
# TYPE void_devnet_jobs_with_result gauge
void_devnet_jobs_with_result{chain="devnet"} $jobs_with_result
# HELP void_devnet_jobs_without_result jobs with 0 receipts on VOID devnet (job-based)
# TYPE void_devnet_jobs_without_result gauge
void_devnet_jobs_without_result{chain="devnet"} $jobs_without_result

# HELP void_devnet_jobs_total_v2 total JobQueue jobs on VOID devnet [v2]
# TYPE void_devnet_jobs_total_v2 gauge
void_devnet_jobs_total_v2{chain="devnet"} $total_jobs
# HELP void_devnet_receipts_total_v2 total JobReceipts entries on VOID devnet [v2]
# TYPE void_devnet_receipts_total_v2 gauge
void_devnet_receipts_total_v2{chain="devnet"} $total_receipts
# HELP void_devnet_receipts_coverage_v2 raw receipts/job ratio on VOID devnet [v2]
# TYPE void_devnet_receipts_coverage_v2 gauge
void_devnet_receipts_coverage_v2{chain="devnet"} $coverage_raw
# HELP void_devnet_receipts_health_v2 ReceiptRegistry devnet raw health (1 if receipts_total>=jobs_total, else 0) [v2]
# TYPE void_devnet_receipts_health_v2 gauge
void_devnet_receipts_health_v2{chain="devnet"} $receipts_health_v2
EOF
)"

tmp="$(mktemp)"
printf "%s\n" "$metrics" >"$tmp"

echo "[heal] writing metrics via sudo mv to $OUT"
sudo mv "$tmp" "$OUT"
echo "[heal] wrote $OUT"
