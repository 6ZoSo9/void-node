#!/usr/bin/env bash
set -euo pipefail

# Simple devnet "agent" that:
#  - Takes a JOB_ID (arg or env)
#  - Checks if ReceiptRegistry already has any receipts for that job
#  - If none, submits one ReceiptInput using deterministic hashes
#
# Uses:
#  - DEVNET_PRIVKEY for the devnet EOA
#  - docs/VOID-DEVNET-PROTOCOL-STATE.json for addresses

STATE_DEFAULT="$HOME/dev/void-node/docs/VOID-DEVNET-PROTOCOL-STATE.json"
STATE="${STATE_FILE:-${STATE:-$STATE_DEFAULT}}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

JOB_ID="${1:-${JOB_ID:-}}"
MODEL_ID="${MODEL_ID:-void-demo-llm-1}"

if [ -z "${DEVNET_PRIVKEY:-}" ]; then
  echo "[ERR] DEVNET_PRIVKEY not set in env" >&2
  exit 1
fi

if [ -z "$JOB_ID" ]; then
  echo "[ERR] JOB_ID not provided (arg or env)" >&2
  echo "      usage: JOB_ID=0x... void-devnet-agent-receipt-once.sh" >&2
  echo "      or:    void-devnet-agent-receipt-once.sh 0x..." >&2
  exit 1
fi

if [ ! -f "$STATE" ]; then
  echo "[ERR] STATE file not found: $STATE" >&2
  exit 1
fi

JOBQUEUE_ADDR=$(jq -r '(.JobQueue | (if type=="object" then (.address // empty) elif type=="string" then . else empty end))' "$STATE")
RECEIPT_ADDR=$(jq -r '(.ReceiptRegistry | (if type=="object" then (.address // empty) elif type=="string" then . else empty end))' "$STATE")

if [ -z "$JOBQUEUE_ADDR" ] || [ "$JOBQUEUE_ADDR" = "null" ]; then
  echo "[ERR] JobQueue.address missing in $STATE" >&2
  exit 1
fi

if [ -z "$RECEIPT_ADDR" ] || [ "$RECEIPT_ADDR" = "null" ]; then
  echo "[ERR] ReceiptRegistry.address missing in $STATE" >&2
  exit 1
fi

echo "[agent-once] STATE        = $STATE"
echo "[agent-once] RPC_URL      = $RPC_URL"
echo "[agent-once] JobQueue     = $JOBQUEUE_ADDR"
echo "[agent-once] ReceiptReg   = $RECEIPT_ADDR"
echo "[agent-once] JOB_ID       = $JOB_ID"
echo "[agent-once] MODEL_ID     = $MODEL_ID"

echo
echo "[1] Check existing receipts for job via getReceiptsForJob..."
RAW=$(cast call \
  --rpc-url "$RPC_URL" \
  "$RECEIPT_ADDR" \
  "getReceiptsForJob(bytes32)(bytes32[])" \
  "$JOB_ID" | tr -d '[:space:]')

echo "    getReceiptsForJob(...) => $RAW"

if [ "$RAW" != "[]" ]; then
  echo "[agent-once] Job already has receipt(s); nothing to do."
  exit 0
fi

echo
echo "[2] Compute deterministic hashes from JOB_ID / MODEL_ID..."
INPUT_HASH=$(cast keccak "void-input:$JOB_ID")
OUTPUT_HASH=$(cast keccak "void-output:$JOB_ID")
MODEL_HASH=$(cast keccak "void-model:$MODEL_ID")
STATUS=1

echo "    INPUT_HASH  = $INPUT_HASH"
echo "    OUTPUT_HASH = $OUTPUT_HASH"
echo "    MODEL_HASH  = $MODEL_HASH"
echo "    STATUS      = $STATUS"

echo
echo "[3] totalReceipts() BEFORE..."
BEFORE=$(cast call \
  --rpc-url "$RPC_URL" \
  "$RECEIPT_ADDR" \
  "totalReceipts()(uint256)")
echo "    totalReceipts(before) = $BEFORE"

echo
echo "[4] submitReceipt(ReceiptInput) via cast send..."
TUPLE="($JOB_ID,\"$MODEL_ID\",$INPUT_HASH,$OUTPUT_HASH,$MODEL_HASH,$STATUS)"
echo "    tuple = $TUPLE"

cast send \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_PRIVKEY" \
  "$RECEIPT_ADDR" \
  "submitReceipt((bytes32,string,bytes32,bytes32,bytes32,uint8))" \
  "$TUPLE"

echo
echo "[5] totalReceipts() AFTER..."
AFTER=$(cast call \
  --rpc-url "$RPC_URL" \
  "$RECEIPT_ADDR" \
  "totalReceipts()(uint256)")
echo "    totalReceipts(after) = $AFTER"

echo
echo "[6] getReceiptsForJob(JOB_ID) AFTER..."
cast call \
  --rpc-url "$RPC_URL" \
  "$RECEIPT_ADDR" \
  "getReceiptsForJob(bytes32)(bytes32[])" \
  "$JOB_ID"

echo
echo "[done] agent one-shot complete."
