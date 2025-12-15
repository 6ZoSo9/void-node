#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE="${STATE:-$REPO/docs/VOID-DEVNET-PROTOCOL-STATE.json}"

cd "$REPO"
echo "[receipt-smoke-v1] repo=$REPO"
echo "[receipt-smoke-v1] rpc =$RPC_URL"
echo "[receipt-smoke-v1] state=$STATE"

need_addr() {
  local name="$1" jqexpr="$2"
  local a
  a="$(jq -r "$jqexpr" "$STATE" 2>/dev/null || true)"
  if [[ ! "$a" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
    echo "[FATAL] $name address not found in state json"
    echo "        got: '$a'"
    exit 1
  fi
  echo "$a"
}

JOBQ="$(need_addr "JobQueue" '(.JobQueue.address // .JobQueue // .contracts.JobQueue.address // .contracts.JobQueue // empty)')"
RR="$(need_addr "ReceiptRegistry" '(.ReceiptRegistry.address // .ReceiptRegistry // .contracts.ReceiptRegistry.address // .contracts.ReceiptRegistry // empty)')"

echo
echo "JobQueue       = $JOBQ"
echo "ReceiptRegistry= $RR"

echo
echo "=== [code] bytecode non-empty (best-effort) ==="
cast code --rpc-url "$RPC_URL" "$JOBQ" | head -c 10; echo
cast code --rpc-url "$RPC_URL" "$RR" | head -c 10; echo

echo
echo "=== [read] ReceiptRegistry totalReceipts() (best-effort) ==="
cast call --rpc-url "$RPC_URL" "$RR" 'totalReceipts()(uint256)' 2>/dev/null || \
cast call --rpc-url "$RPC_URL" "$RR" 'total()(uint256)' 2>/dev/null || \
echo "[WARN] could not read total receipts (ABI mismatch); skipping"

echo
echo "[receipt-smoke-v1] DONE"
