#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
STATE_FILE="${STATE_FILE:-$REPO/docs/VOID-DEVNET-PROTOCOL-STATE.json}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

# Default devnet key (same one you've been using)
DEVNET_PRIVKEY="${DEVNET_PRIVKEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"

cd "$REPO"

echo "=== [load devnet addresses from state] ==="
JOBQUEUE_ADDR=$(jq -r '(.JobQueue | (if type=="object" then (.address // empty) elif type=="string" then . else empty end))        // ""' "$STATE_FILE")
AGENT_REG_ADDR=$(jq -r '(.AgentRegistry | if type=="object" then (.address // empty) elif type=="string" then . else empty end)  // ""' "$STATE_FILE")
RECEIPT_REG_ADDR=$(jq -r '(.ReceiptRegistry | (if type=="object" then (.address // empty) elif type=="string" then . else empty end)) // ""' "$STATE_FILE")

echo "[JobQueue]        ${JOBQUEUE_ADDR:-<missing>}"
echo "[AgentRegistry]   ${AGENT_REG_ADDR:-<missing>}"
echo "[ReceiptRegistry] ${RECEIPT_REG_ADDR:-<missing>}"

if [ -z "$JOBQUEUE_ADDR" ] || [ -z "$AGENT_REG_ADDR" ] || [ -z "$RECEIPT_REG_ADDR" ]; then
  echo "[FATAL] one or more devnet addresses missing in $STATE_FILE" >&2
  exit 1
fi

echo
echo "=== [code size sanity] ==="
echo -n "JobQueue bytecode prefix:        "
cast code --rpc-url "$RPC_URL" "$JOBQUEUE_ADDR"    | head -c 10; echo
echo -n "AgentRegistry bytecode prefix:   "
cast code --rpc-url "$RPC_URL" "$AGENT_REG_ADDR"   | head -c 10; echo
echo -n "ReceiptRegistry bytecode prefix: "
cast code --rpc-url "$RPC_URL" "$RECEIPT_REG_ADDR" | head -c 10; echo

# ----------------------------------------------------------------------
# 1) Post a demo job to JobQueue
# ----------------------------------------------------------------------

APP_ID="void/devnet/demo-job-1"
MODEL_ID="gpt-4.1-mini"
PAYLOAD_URI="ipfs://void-devnet-demo-job-1.json"

PAYLOAD_HASH=$(cast keccak "void-devnet-demo-job-1-payload")
INPUT_HASH=$(cast keccak "void-devnet-demo-job-1-input")
OUTPUT_HASH=$(cast keccak "void-devnet-demo-job-1-output")
MODEL_HASH=$(cast keccak "gpt-4.1-mini@devnet")

echo
echo "=== [1] Posting job via JobQueue.postJob(...) ==="
echo "[1] appId       = $APP_ID"
echo "[1] payloadHash = $PAYLOAD_HASH"
echo "[1] payloadURI  = $PAYLOAD_URI"

TX_LOG=$(mktemp)
cast send \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_PRIVKEY" \
  "$JOBQUEUE_ADDR" \
  "postJob(string,bytes32,string)" \
  "$APP_ID" \
  "$PAYLOAD_HASH" \
  "$PAYLOAD_URI" | tee "$TX_LOG"

TX_HASH=$(grep -m1 '^transactionHash' "$TX_LOG" | awk '{print $2}')
rm -f "$TX_LOG"

if [ -z "$TX_HASH" ]; then
  echo "[ERR] could not parse transactionHash from cast send output" >&2
  exit 1
fi

echo "[1] tx hash: $TX_HASH"

# ----------------------------------------------------------------------
# 2) Derive jobId from the JobQueue event logs
# ----------------------------------------------------------------------

echo
echo "=== [2] Deriving jobId from tx receipt logs ==="
RECEIPT_JSON=$(cast receipt --rpc-url "$RPC_URL" "$TX_HASH" --json)

JOB_ID=$(echo "$RECEIPT_JSON" | jq -r '.logs[0].topics[1]')

if [ -z "$JOB_ID" ] || [ "$JOB_ID" = "null" ]; then
  echo "[ERR] could not extract jobId from logs[0].topics[1]" >&2
  echo "$RECEIPT_JSON" | jq '.logs' >&2 || true
  exit 1
fi

echo "[2] jobId (topics[1]) = $JOB_ID"

# ----------------------------------------------------------------------
# 3) Submit a receipt via ReceiptRegistry.submitReceipt(ReceiptInput)
# ----------------------------------------------------------------------

STATUS=1

echo
echo "=== [3] Submitting receipt via ReceiptRegistry.submitReceipt(...) ==="
echo "[3] modelId    = $MODEL_ID"
echo "[3] inputHash  = $INPUT_HASH"
echo "[3] outputHash = $OUTPUT_HASH"
echo "[3] modelHash  = $MODEL_HASH"
echo "[3] status     = $STATUS"

# NOTE: For a tuple parameter, cast expects `( ... )`, not `[ ... ]`.
cast send \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_PRIVKEY" \
  "$RECEIPT_REG_ADDR" \
  "submitReceipt((bytes32,string,bytes32,bytes32,bytes32,uint8))" \
  "($JOB_ID,\"$MODEL_ID\",$INPUT_HASH,$OUTPUT_HASH,$MODEL_HASH,$STATUS)"

# ----------------------------------------------------------------------
# 4) Verify totals and per-job receipts
# ----------------------------------------------------------------------

echo
echo "=== [4] Totals after job + receipt ==="
TOTAL_JOBS=$(cast call --rpc-url "$RPC_URL" "$JOBQUEUE_ADDR" "totalJobs()(uint256)")
TOTAL_RECEIPTS=$(cast call --rpc-url "$RPC_URL" "$RECEIPT_REG_ADDR" "totalReceipts()(uint256)")

echo "[4] totalJobs()     = $TOTAL_JOBS"
echo "[4] totalReceipts() = $TOTAL_RECEIPTS"

echo
echo "=== [5] getReceiptsForJob(jobId) ==="
cast call \
  --rpc-url "$RPC_URL" \
  "$RECEIPT_REG_ADDR" \
  "getReceiptsForJob(bytes32)(bytes32[])" \
  "$JOB_ID"

echo
echo "=== [6] receipts(jobReceiptId) for first entry (if any) ==="
FIRST_RECEIPT_ID=$(cast call \
  --rpc-url "$RPC_URL" \
  "$RECEIPT_REG_ADDR" \
  "getReceiptsForJob(bytes32)(bytes32[])" \
  "$JOB_ID" | sed -e 's/[][]//g' -e 's/,.*$//' -e 's/ //g')

if [ -n "$FIRST_RECEIPT_ID" ]; then
  echo "[6] first receiptId = $FIRST_RECEIPT_ID"
  cast call \
    --rpc-url "$RPC_URL" \
    "$RECEIPT_REG_ADDR" \
    "receipts(bytes32)(bytes32,bytes32,address,string,bytes32,bytes32,bytes32,uint64,uint64,uint8)" \
    "$FIRST_RECEIPT_ID"
else
  echo "[6] no receipts returned for this jobId"
fi

echo
echo "=== [done] devnet job + receipt demo complete ==="
