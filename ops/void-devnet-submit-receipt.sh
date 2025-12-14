# SCHEMAFIX_v1: state entries may be string OR {address}
#!/usr/bin/env bash
set -euo pipefail

# AUTOENV_v1: make submit-receipt usable in demos/CI without manual env vars
SPOOL="${SPOOL:-$(pwd)/docs/VOID-DEVNET-JOB-SPOOL.txt}"

# fill JOB_ID from spool if missing
if [[ -z "${JOB_ID:-}" && -f "$SPOOL" ]]; then
  JOB_ID="$(tail -n 400 "$SPOOL" | rg -o '0x[0-9a-fA-F]{64}' | tail -n 1 || true)"
fi

# if still missing, fail non-fatally (do NOT kill the shell)
if [[ -z "${JOB_ID:-}" ]]; then
  echo "[warn] no JOB_ID provided and none found in $SPOOL; skipping receipt submit"
  exit 0
fi

# safe defaults
: "${MODEL_ID:=dev.auto.v1}"
: "${INPUT_HASH:=$(cast keccak "input:$JOB_ID" | tr -d '[:space:]')}"
: "${OUTPUT_HASH:=$(cast keccak "output:$JOB_ID" | tr -d '[:space:]')}"

export JOB_ID MODEL_ID INPUT_HASH OUTPUT_HASH

# Simple helper to submit a ReceiptRegistry receipt for a completed JobQueue job.
#
# Usage (env-based):
#   RPC_URL=http://127.0.0.1:8545 \
#   DEVNET_PRIVKEY='0x...' \
#   JOB_ID=0x... \
#   INPUT_HASH=0x... \
#   OUTPUT_HASH=0x... \
#   MODEL_ID='devnet-test-model' \
#     ./ops/void-devnet-submit-receipt.sh
#
# Optional env:
#   STATE       (default: docs/VOID-DEVNET-PROTOCOL-STATE.json)
#   MODEL_HASH  (default: keccak256(MODEL_ID @ v1))
#   STATUS      (default: 1)
#
# This script assumes AgentRegistry already marks the caller EOA as an agent
# (you've just done setAgentGlobal(address,bool) with DEVNET_PRIVKEY).

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE="${STATE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"

if [[ -z "${DEVNET_PRIVKEY:-}" ]]; then
  echo "[err] DEVNET_PRIVKEY is not set" >&2
  exit 1
fi

JOB_ID="${JOB_ID:-}"
MODEL_ID="${MODEL_ID:-}"
INPUT_HASH="${INPUT_HASH:-}"
OUTPUT_HASH="${OUTPUT_HASH:-}"
MODEL_HASH="${MODEL_HASH:-}"
STATUS="${STATUS:-1}"

if [[ -z "$JOB_ID" || -z "$MODEL_ID" || -z "$INPUT_HASH" || -z "$OUTPUT_HASH" ]]; then
  echo "[err] require JOB_ID, MODEL_ID, INPUT_HASH, OUTPUT_HASH env vars" >&2
  exit 1
fi

if [[ ! -f "$STATE" ]]; then
  echo "[err] STATE file not found: $STATE" >&2
  exit 1
fi

RECEIPTR=$(jq -r '(.ReceiptRegistry | (if type=="object" then (.address // empty) elif type=="string" then . else empty end))' "$STATE")
if [[ -z "$RECEIPTR" || "$RECEIPTR" == "0x0000000000000000000000000000000000000000" ]]; then
  echo "[err] invalid ReceiptRegistry.address in $STATE" >&2
  exit 1
fi

if [[ -z "$MODEL_HASH" ]]; then
  MODEL_HASH=$(cast keccak "${MODEL_ID}@v1")
fi

echo "[cfg] RPC_URL:    $RPC_URL"
echo "[cfg] STATE:      $STATE"
echo "[cfg] ReceiptReg: $RECEIPTR"
echo "[cfg] JOB_ID:     $JOB_ID"
echo "[cfg] MODEL_ID:   $MODEL_ID"
echo "[cfg] INPUT_HASH: $INPUT_HASH"
echo "[cfg] OUTPUT_HASH:$OUTPUT_HASH"
echo "[cfg] MODEL_HASH: $MODEL_HASH"
echo "[cfg] STATUS:     $STATUS"

TUPLE_ARG="($JOB_ID,\"$MODEL_ID\",$INPUT_HASH,$OUTPUT_HASH,$MODEL_HASH,$STATUS)"
echo "[cfg] TUPLE_ARG:  $TUPLE_ARG"

echo "[tx] submitting receipt..."
cast send "$RECEIPTR" \
  'submitReceipt((bytes32,string,bytes32,bytes32,bytes32,uint8))' \
  "$TUPLE_ARG" \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_PRIVKEY" \
  --json

echo "[tx] done. totalReceipts now:"
cast call "$RECEIPTR" 'totalReceipts()(uint256)' --rpc-url "$RPC_URL"
