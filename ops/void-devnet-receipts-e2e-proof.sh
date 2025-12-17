#!/usr/bin/env bash
set -euo pipefail

RPC="${RPC:-http://127.0.0.1:8545}"
RR="${RR:-$(python3 -c "import json;from pathlib import Path;p=Path('docs/VOID-DEVNET-PROTOCOL-STATE.json');j=json.loads(p.read_text());c=j.get('contracts',{}) or {}; print((c.get('ReceiptRegistry',{}) or {}).get('address',''))" 2>/dev/null || true)}"
JOBID="${JOBID:-}"
RID="${RID:-}"

need(){ command -v "$1" >/dev/null 2>&1 || { echo "[ERR] missing $1"; exit 2; }; }
need cast
need python3

if [ -z "$RR" ] || [ "${#RR}" -ne 42 ]; then
  echo "[ERR] RR missing/invalid (set RR=0x... or fix state json)"; exit 3
fi

# If JOBID/RID not provided, try to pull the most recent RID for a provided JOBID is mandatory for deterministic checks.
if [ -z "$JOBID" ]; then
  echo "[ERR] JOBID is required (export JOBID=0x...)"; exit 4
fi

if [ -z "$RID" ]; then
  # best-effort: take first receiptId from index
  RID="$(cast call --rpc-url "$RPC" --rpc-timeout 5 "$RR" "getReceiptsForJob(bytes32)(bytes32[])" "$JOBID" \
    | tr -d '[],' | awk '{print $1}' | tr -d '\r\n' || true)"
fi

echo "=== [rpc] ==="
cast chain-id --rpc-url "$RPC" --rpc-timeout 3
cast block-number --rpc-url "$RPC" --rpc-timeout 3

echo
echo "=== [index] getReceiptsForJob(jobId) ==="
cast call --rpc-url "$RPC" --rpc-timeout 5 "$RR" "getReceiptsForJob(bytes32)(bytes32[])" "$JOBID"

echo
echo "=== [receipt] receipts(RID) ==="
cast call --rpc-url "$RPC" --rpc-timeout 5 "$RR" \
  "receipts(bytes32)(bytes32,bytes32,address,string,bytes32,bytes32,bytes32,uint64,uint64,uint8)" \
  "$RID"

echo
echo "=== [counter] totalReceipts ==="
cast call --rpc-url "$RPC" --rpc-timeout 5 "$RR" "totalReceipts()(uint256)"
