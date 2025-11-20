#!/usr/bin/env bash
set -euo pipefail

echo "[agent-submit-receipt] starting..."

REPO=$(cd "$(dirname "$0")/.." && pwd)
cd "$REPO"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE_FILE="${STATE_FILE:-$REPO/docs/VOID-DEVNET-PROTOCOL-STATE.json}"

if [ ! -f "$STATE_FILE" ]; then
  echo "[agent-submit-receipt] ERROR: state file not found: $STATE_FILE" >&2
  exit 1
fi

JOBQUEUE=$(jq -r '.JobQueue.address' "$STATE_FILE")
RECEIPTS=$(jq -r '.ReceiptRegistry.address' "$STATE_FILE")

echo "[agent-submit-receipt] repo=$REPO"
echo "[agent-submit-receipt] rpc_url=$RPC_URL"
echo "[agent-submit-receipt] JobQueue=$JOBQUEUE"
echo "[agent-submit-receipt] ReceiptRegistry=$RECEIPTS"

if [ -z "${DEVNET_PRIVKEY:-}" ]; then
  echo "[agent-submit-receipt] ERROR: DEVNET_PRIVKEY is not set" >&2
  exit 1
fi

# 1) Decide which jobId to use
JOB_ID="${1:-}"

if [ -z "$JOB_ID" ]; then
  echo "[agent-submit-receipt] no jobId arg, probing spool via spool-health..."

  TMP_OUT=$(mktemp)
  ./ops/void-devnet-spool-health.sh >"$TMP_OUT"

  # Grab the last line mentioning next_pending_job=...
  RAW_LINE=$(awk '/next_pending_job=/' "$TMP_OUT" | tail -n1 || true)
  rm -f "$TMP_OUT"

  # Extract just the 0x... part
  JOB_ID=$(printf '%s\n' "$RAW_LINE" | sed -E 's/.*next_pending_job=(0x[0-9a-fA-F]+).*/\1/')

  if [ -z "$JOB_ID" ]; then
    echo "[agent-submit-receipt] ERROR: could not parse next_pending_job from spool-health output" >&2
    echo "[agent-submit-receipt] RAW_LINE=$RAW_LINE" >&2
    exit 1
  fi
fi

echo "[agent-submit-receipt] using jobId=$JOB_ID"

# 2) Build tuple for submitReceipt((bytes32,string,bytes32,bytes32,bytes32,uint8))
FUNC_SIG='submitReceipt((bytes32,string,bytes32,bytes32,bytes32,uint8))'

MODEL_ID="${MODEL_ID:-devnet-test-model}"

ZERO32="0x0000000000000000000000000000000000000000000000000000000000000000"
INPUT_HASH="${INPUT_HASH:-$ZERO32}"
OUTPUT_HASH="${OUTPUT_HASH:-$ZERO32}"
MODEL_HASH="${MODEL_HASH:-$ZERO32}"
STATUS="${STATUS:-1}"

TUPLE="($JOB_ID,\"$MODEL_ID\",$INPUT_HASH,$OUTPUT_HASH,$MODEL_HASH,$STATUS)"

echo "[agent-submit-receipt] FUNC_SIG=$FUNC_SIG"
echo "[agent-submit-receipt] MODEL_ID=$MODEL_ID"
echo "[agent-submit-receipt] INPUT_HASH=$INPUT_HASH"
echo "[agent-submit-receipt] OUTPUT_HASH=$OUTPUT_HASH"
echo "[agent-submit-receipt] MODEL_HASH=$MODEL_HASH"
echo "[agent-submit-receipt] STATUS=$STATUS"
echo "[agent-submit-receipt] TUPLE=$TUPLE"

# 3) Send tx
cast send \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_PRIVKEY" \
  "$RECEIPTS" \
  "$FUNC_SIG" \
  "$TUPLE"

echo "[agent-submit-receipt] DONE"
