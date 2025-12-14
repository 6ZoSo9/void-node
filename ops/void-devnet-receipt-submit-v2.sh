#!/usr/bin/env bash
set -euo pipefail
[[ "${DEBUG:-}" == "1" ]] && set -x || true

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE="${STATE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"
PRIVKEY="${PRIVKEY:-}"
STATUS="${STATUS:-1}"

# Prefer args, else env
JOB_ID="${1:-${JOB_ID:-}}"
MODEL_ID="${2:-${MODEL_ID:-dev.demo.v1}}"
INPUT_HASH="${3:-${INPUT_HASH:-}}"
OUTPUT_HASH="${4:-${OUTPUT_HASH:-}}"

die(){ echo "[ERR] $*" >&2; exit 1; }

[[ -n "$JOB_ID" ]] || die "JOB_ID missing"
[[ -n "$MODEL_ID" ]] || die "MODEL_ID missing"
[[ -n "$INPUT_HASH" ]] || die "INPUT_HASH missing"
[[ -n "$OUTPUT_HASH" ]] || die "OUTPUT_HASH missing"
[[ -f "$STATE" ]] || die "STATE file not found: $STATE"
[[ -n "$PRIVKEY" ]] || die "PRIVKEY missing (export PRIVKEY=... or pass via env)"

# Validate 32-byte hashes
[[ "$INPUT_HASH"  =~ ^0x[0-9a-fA-F]{64}$ ]] || die "INPUT_HASH not bytes32: $INPUT_HASH"
[[ "$OUTPUT_HASH" =~ ^0x[0-9a-fA-F]{64}$ ]] || die "OUTPUT_HASH not bytes32: $OUTPUT_HASH"

RECEIPTR="$(jq -r '(.ReceiptRegistry | (if type=="object" then (.address // empty) elif type=="string" then . else empty end))' "$STATE")"
[[ -n "$RECEIPTR" ]] || die "ReceiptRegistry missing in $STATE"

# Normalize JOB_ID to bytes32 (contract expects bytes32)
JOB_ID_B32="$JOB_ID"
if [[ ! "$JOB_ID_B32" =~ ^0x[0-9a-fA-F]{64}$ ]]; then
  JOB_ID_B32="$(cast keccak "job:${JOB_ID}")"
fi

# Model hash (your existing convention)
MODEL_HASH="$(cast keccak "${MODEL_ID}@v1")"

echo "[cfg] RPC_URL:    $RPC_URL"
echo "[cfg] STATE:      $STATE"
echo "[cfg] ReceiptReg: $RECEIPTR"
echo "[cfg] JOB_ID:     $JOB_ID"
echo "[cfg] JOB_ID_B32: $JOB_ID_B32"
echo "[cfg] MODEL_ID:   $MODEL_ID"
echo "[cfg] INPUT_HASH: $INPUT_HASH"
echo "[cfg] OUTPUT_HASH:$OUTPUT_HASH"
echo "[cfg] MODEL_HASH: $MODEL_HASH"
echo "[cfg] STATUS:     $STATUS"

TUPLE_ARG="(${JOB_ID_B32},\"${MODEL_ID}\",${INPUT_HASH},${OUTPUT_HASH},${MODEL_HASH},${STATUS})"
echo "[cfg] TUPLE_ARG:  $TUPLE_ARG"

echo "[tx] submitting receipt..."
cast send "$RECEIPTR" \
  'submitReceipt((bytes32,string,bytes32,bytes32,bytes32,uint8))' \
  "$TUPLE_ARG" \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVKEY" \
  --json
