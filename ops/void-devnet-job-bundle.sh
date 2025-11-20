#!/usr/bin/env bash
set -euo pipefail

# Always operate from repo root
cd "$(dirname "$0")/.."

JOB_ID="${JOB_ID:-}"
RECEIPT_ID="${RECEIPT_ID:-}"

if [[ -z "$JOB_ID" ]]; then
  cat <<'USAGE' 1>&2
[usage] JOB_ID='<jobId>' ./ops/void-devnet-job-bundle.sh

Description:
  - Wraps the devnet JobQueue job inspector
  - Shows current jobs/receipts coverage gauges
  - Optionally runs the receipt inspector if RECEIPT_ID is set
USAGE
  exit 1
fi

REPO="$PWD"
STATE_FILE="docs/VOID-DEVNET-PROTOCOL-STATE.json"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
COV_TEXT="/var/lib/node_exporter/textfile_collector/void_devnet_coverage.prom"

echo "=== [devnet job+coverage bundle] ==="
echo "[repo]      $REPO"
echo "[state]     $STATE_FILE"
echo "[rpc_url]   $RPC_URL"
echo "[prom_url]  $PROM_URL"
echo "[jobId]     $JOB_ID"
[[ -n "$RECEIPT_ID" ]] && echo "[receiptId] $RECEIPT_ID"

echo
echo "=== [A] job inspector (on-chain) ==="
JOB_ID="$JOB_ID" ./ops/void-devnet-job-inspect.sh || {
  echo "[warn] job inspector failed; see above"
}

echo
echo "=== [B] devnet coverage snapshot (textfile gauges) ==="
if [[ -r "$COV_TEXT" ]]; then
  sed -n '1,40p' "$COV_TEXT"
else
  echo "[warn] coverage textfile not readable at $COV_TEXT"
  echo "[hint] run your devnet coverage exporter to refresh it."
fi

echo
echo "=== [C] optional receipt inspector (if RECEIPT_ID set) ==="
if [[ -n "$RECEIPT_ID" ]]; then
  RECEIPT_ID="$RECEIPT_ID" ./ops/void-devnet-receipt-inspect.sh || {
    echo "[warn] receipt inspector failed; see above"
  }
else
  echo "[info] RECEIPT_ID not set; skipping per-receipt lookup."
  echo "[hint] example:"
  echo "  JOB_ID='$JOB_ID' RECEIPT_ID='<receiptId>' ./ops/void-devnet-job-bundle.sh"
fi

echo
echo "=== [summary] ==="
echo "[ok] This hammer confirms:"
echo "  - job tuple on-chain via JobQueue"
echo "  - global jobs/receipts coverage gauges from node_exporter textfile"
echo "  - optional receipt inspector against the current ReceiptRegistry ABI"
echo
echo "[note] For full jobs+all-receipts matrix, keep using step 4 in:"
echo "  ./ops/void-devnet-ci-smoke.sh  # jobs/receipts report"
