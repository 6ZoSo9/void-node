#!/usr/bin/env bash
set -euo pipefail

echo "[receipt-smoke-v1] repo=$HOME/dev/void-node"
cd "$HOME/dev/void-node"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE="${STATE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"
JOB_SPOOL="${JOB_SPOOL:-docs/VOID-DEVNET-JOB-SPOOL.txt}"

JOBQUEUE_ADDR="$(jq -r '((.JobQueue.address // .JobQueue // .contracts.JobQueue.address // .contracts.JobQueue // empty) // .JobQueue // .contracts(.JobQueue.address // .JobQueue // .contracts.JobQueue.address // .contracts.JobQueue // empty) // .contracts.JobQueue // empty)' "$STATE")"
RECEIPT_ADDR="$(jq -r '((.ReceiptRegistry.address // .ReceiptRegistry // .contracts.ReceiptRegistry.address // .contracts.ReceiptRegistry // empty) // .ReceiptRegistry // .contracts(.ReceiptRegistry.address // .ReceiptRegistry // .contracts.ReceiptRegistry.address // .contracts.ReceiptRegistry // empty) // .contracts.ReceiptRegistry // empty)' "$STATE")"

echo "[receipt-smoke-v1] JobQueue        = $JOBQUEUE_ADDR"
echo "[receipt-smoke-v1] ReceiptRegistry = $RECEIPT_ADDR"

if [[ -z "${DEVNET_CALLER_KEY:-}" ]]; then
  echo "[receipt-smoke-v1] FATAL: DEVNET_CALLER_KEY not set in env" >&2
  exit 1
fi

echo "[receipt-smoke-v1] devnet caller key length: $(printf '%s\n' "$DEVNET_CALLER_KEY" | wc -c)"

# Choose a jobId: override via JOB_ID_OVERRIDE, else last non-empty hex from the spool
JOB_ID="${JOB_ID_OVERRIDE:-$(grep -E '^0x' "$JOB_SPOOL" | tail -n1)}"
if [[ -z "$JOB_ID" ]]; then
  echo "[receipt-smoke-v1] FATAL: no jobId found in $JOB_SPOOL and JOB_ID_OVERRIDE not set" >&2
  exit 1
fi

MODEL_ID="${MODEL_ID:-devnet-test-model}"

INPUT_HASH="${INPUT_HASH:-0x07e9c8bd04cb9442f0d2ce0bfc1f7192c07e5e6af85d02656d2d309615e5cc18}"
OUTPUT_HASH="${OUTPUT_HASH:-0xd40b83295123a5339194637c79a205a38391adb8a46662d226e1547d8df91f8e}"
MODEL_HASH="${MODEL_HASH:-0xed8371d6ce2eba240c640919242012c0e8e00cd48ac9b9540e043416fea14d2b}"
STATUS="${STATUS:-1}"

echo "[receipt-smoke-v1] using JOB_ID    = $JOB_ID"
echo "[receipt-smoke-v1] MODEL_ID        = $MODEL_ID"
echo "[receipt-smoke-v1] INPUT_HASH      = $INPUT_HASH"
echo "[receipt-smoke-v1] OUTPUT_HASH     = $OUTPUT_HASH"
echo "[receipt-smoke-v1] MODEL_HASH      = $MODEL_HASH"
echo "[receipt-smoke-v1] STATUS          = $STATUS"

echo
echo "[receipt-smoke-v1] === [0] totals BEFORE ==="
TOTAL_BEFORE="$(cast call "$RECEIPT_ADDR" 'totalReceipts()(uint256)' --rpc-url "$RPC_URL")"
echo "  totalReceipts_before = $TOTAL_BEFORE"

echo
echo "[receipt-smoke-v1] === [1] submitReceipt(...) ==="

TUPLE_ARG="($JOB_ID,\"$MODEL_ID\",$INPUT_HASH,$OUTPUT_HASH,$MODEL_HASH,$STATUS)"
echo "[receipt-smoke-v1] tuple arg = $TUPLE_ARG"

TMP_LOG="$(mktemp)"
set +e
cast send "$RECEIPT_ADDR" \
  'submitReceipt((bytes32,string,bytes32,bytes32,bytes32,uint8))' \
  "$TUPLE_ARG" \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_CALLER_KEY" \
  >"$TMP_LOG" 2>&1
RC=$?
set -e

echo "[receipt-smoke-v1] tx rc = $RC"
echo "[receipt-smoke-v1] tx output:"
cat "$TMP_LOG"

if [[ $RC -ne 0 ]]; then
  if grep -q 'ReceiptRegistry: agent not authorized' "$TMP_LOG"; then
    echo
    echo "[receipt-smoke-v1] RESULT: OK (auth guard working; caller is NOT an authorized agent)"
    rm -f "$TMP_LOG"
    exit 0
  else
    echo
    echo "[receipt-smoke-v1] FATAL: unexpected revert / failure (see log above)" >&2
    rm -f "$TMP_LOG"
    exit $RC
  fi
fi

rm -f "$TMP_LOG"

echo
echo "[receipt-smoke-v1] === [2] totals AFTER ==="
TOTAL_AFTER="$(cast call "$RECEIPT_ADDR" 'totalReceipts()(uint256)' --rpc-url "$RPC_URL")"
echo "  totalReceipts_after  = $TOTAL_AFTER"

echo
echo "[receipt-smoke-v1] === [3] receipt dump (best-effort) ==="
echo "[receipt-smoke-v1] getReceiptsForJob(jobId):"
cast call "$RECEIPT_ADDR" \
  'getReceiptsForJob(bytes32)(bytes32[])' \
  "$JOB_ID" \
  --rpc-url "$RPC_URL" || true

FIRST_RECEIPT_ID="$(cast call "$RECEIPT_ADDR" \
  'getReceiptsForJob(bytes32)(bytes32[])' \
  "$JOB_ID" \
  --rpc-url "$RPC_URL" 2>/dev/null | awk 'NR==1{print $1}')"

if [[ -n "$FIRST_RECEIPT_ID" && "$FIRST_RECEIPT_ID" != "0x" ]]; then
  echo
  echo "[receipt-smoke-v1] first receiptId = $FIRST_RECEIPT_ID"
  cast call "$RECEIPT_ADDR" \
    'receipts(bytes32)(bytes32,bytes32,address,string,bytes32,bytes32,bytes32,uint64,uint64,uint8)' \
    "$FIRST_RECEIPT_ID" \
    --rpc-url "$RPC_URL" || true
else
  echo "[receipt-smoke-v1] no receipts discovered for that jobId yet"
fi

echo
echo "[receipt-smoke-v1] RESULT:"
echo "  totalReceipts_before = $TOTAL_BEFORE"
echo "  totalReceipts_after  = $TOTAL_AFTER"
