#!/usr/bin/env bash
set -euo pipefail

SCRIPT_NAME="[agent-complete-tx]"

# Resolve repo root (ops/..)
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

echo "$SCRIPT_NAME starting..."
echo "$SCRIPT_NAME repo=$REPO_DIR"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE_FILE="${STATE_FILE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"

: "${DEVNET_PRIVKEY:?DEVNET_PRIVKEY must be set in env}"

echo "$SCRIPT_NAME rpc_url=$RPC_URL"
echo "$SCRIPT_NAME state_file=$STATE_FILE"

if [ ! -f "$STATE_FILE" ]; then
  echo "$SCRIPT_NAME ERROR: state file not found at $STATE_FILE" >&2
  exit 1
fi

RECEIPT_REG_ADDR="$(jq -r '(.ReceiptRegistry | (if type=="object" then (.address // empty) elif type=="string" then . else empty end))' "$STATE_FILE")"
if [ -z "$RECEIPT_REG_ADDR" ] || [ "$RECEIPT_REG_ADDR" = "null" ]; then
  echo "$SCRIPT_NAME ERROR: ReceiptRegistry.address missing in $STATE_FILE" >&2
  exit 1
fi

echo "$SCRIPT_NAME ReceiptRegistry=$RECEIPT_REG_ADDR"

JOB_ID="${JOB_ID:-${1:-}}"
if [ -z "$JOB_ID" ]; then
  cat >&2 <<'USAGE'
[agent-complete-tx] ERROR: JOB_ID not set

Usage:
  JOB_ID=0x... INPUT_HASH=0x... OUTPUT_HASH=0x... ./ops/void-devnet-agent-complete-tx.sh

Environment (required/optional):
  DEVNET_PRIVKEY   - sender private key (required)
  RPC_URL          - RPC endpoint (default http://127.0.0.1:8545)
  STATE_FILE       - protocol state JSON (default docs/VOID-DEVNET-PROTOCOL-STATE.json)
  JOB_ID           - jobId (bytes32) to complete (or pass as first arg)
  MODEL_ID         - logical model id (default "devnet-test-model")
  INPUT_HASH       - bytes32 hash of job input (required)
  OUTPUT_HASH      - bytes32 hash of result (required)
  MODEL_HASH       - bytes32 hash of model version (default ZERO32)
  STATUS           - uint8 status code (default 1 = OK)

Example:
  export DEVNET_PRIVKEY='0x...'
  export RPC_URL='http://127.0.0.1:8545'
  export JOB_ID='0x...'
  export INPUT_HASH='0x...'
  export OUTPUT_HASH='0x...'
  ./ops/void-devnet-agent-complete-tx.sh
USAGE
  exit 1
fi

MODEL_ID="${MODEL_ID:-devnet-test-model}"

if [ -z "${INPUT_HASH:-}" ]; then
  echo "$SCRIPT_NAME ERROR: INPUT_HASH must be set in env" >&2
  exit 1
fi

if [ -z "${OUTPUT_HASH:-}" ]; then
  echo "$SCRIPT_NAME ERROR: OUTPUT_HASH must be set in env" >&2
  exit 1
fi

ZERO32="0x0000000000000000000000000000000000000000000000000000000000000000"
MODEL_HASH="${MODEL_HASH:-$ZERO32}"
STATUS="${STATUS:-1}"

echo "$SCRIPT_NAME JOB_ID=$JOB_ID"
echo "$SCRIPT_NAME MODEL_ID=$MODEL_ID"
echo "$SCRIPT_NAME INPUT_HASH=$INPUT_HASH"
echo "$SCRIPT_NAME OUTPUT_HASH=$OUTPUT_HASH"
echo "$SCRIPT_NAME MODEL_HASH=$MODEL_HASH"
echo "$SCRIPT_NAME STATUS=$STATUS"

TUPLE="($JOB_ID,\"$MODEL_ID\",$INPUT_HASH,$OUTPUT_HASH,$MODEL_HASH,$STATUS)"

echo "$SCRIPT_NAME FUNC_SIG=submitReceipt((bytes32,string,bytes32,bytes32,bytes32,uint8))"
echo "$SCRIPT_NAME TUPLE=$TUPLE"
echo "$SCRIPT_NAME sending tx via cast..."

cast send \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_PRIVKEY" \
  "$RECEIPT_REG_ADDR" \
  'submitReceipt((bytes32,string,bytes32,bytes32,bytes32,uint8))' \
  "$TUPLE"

echo "$SCRIPT_NAME DONE"
