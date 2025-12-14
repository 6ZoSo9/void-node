#!/usr/bin/env bash
set -euo pipefail

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE="${STATE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"

need(){ command -v "$1" >/dev/null 2>&1 || { echo "[ERR] missing: $1"; exit 2; }; }
need jq; need cast

RECEIPTR="$(jq -r '(.ReceiptRegistry | (if type=="object" then (.address // empty) elif type=="string" then . else empty end))' "$STATE")"
[[ "$RECEIPTR" =~ ^0x[0-9a-fA-F]{40}$ ]] || { echo "[ERR] bad ReceiptRegistry addr: '$RECEIPTR'"; exit 2; }

ARG="${1:-}"
if [[ -z "$ARG" ]]; then
  [[ -f docs/VOID-DEVNET-JOB-SPOOL.tsv ]] || { echo "[ERR] no arg and missing docs/VOID-DEVNET-JOB-SPOOL.tsv"; exit 2; }
  ARG="$(tail -n 1 docs/VOID-DEVNET-JOB-SPOOL.tsv | cut -f1)"
fi

JOB_ID=""
RID=""

if [[ "$ARG" =~ ^0x[0-9a-fA-F]{64}$ ]]; then
  # could be jobId or rid; try as jobId first
  JOB_ID="$ARG"
  RID="$(cast call "$RECEIPTR" 'getReceiptsForJob(bytes32)(bytes32[])' "$JOB_ID" --rpc-url "$RPC_URL"     | tr -d '[]' | tr -d ',' | awk '{print $1}')"
  if [[ ! "$RID" =~ ^0x[0-9a-fA-F]{64}$ ]]; then
    # treat ARG as RID
    RID="$ARG"
    JOB_ID=""
  fi
else
  echo "[ERR] arg must be 0x + 64 hex (jobId or receiptId)."
  exit 2
fi

echo "[cfg] rpc=$RPC_URL"
echo "[cfg] receiptReg=$RECEIPTR"
[[ -n "$JOB_ID" ]] && echo "[cfg] jobId=$JOB_ID"
echo "[cfg] rid=$RID"

echo
echo "=== receipts(rid) typed ==="
cast call "$RECEIPTR" \
  'receipts(bytes32)(bytes32,bytes32,address,string,bytes32,bytes32,bytes32,uint64,uint64,uint8)' \
  "$RID" --rpc-url "$RPC_URL"

echo
echo "=== receipts(rid) raw ==="
RAW="$(cast call "$RECEIPTR" 'receipts(bytes32)' "$RID" --rpc-url "$RPC_URL" | tr -d '\n')"
echo "RAW=${RAW:0:18}... len=${#RAW}"

echo
echo "=== raw decode via calldata-decode (stable) ==="
SIG='f(bytes32,bytes32,address,string,bytes32,bytes32,bytes32,uint64,uint64,uint8)'
SEL="$(cast sig "$SIG")"
CALDATA="0x${SEL#0x}${RAW#0x}"
cast calldata-decode "$SIG" "$CALDATA"
