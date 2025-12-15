#!/usr/bin/env bash
set -euo pipefail

# Read-only inspector for a single ReceiptRegistry entry on VOID devnet.
# Usage:
#   ./ops/void-devnet-receipt-inspect.sh 0x...
#   RECEIPT_ID=0x... ./ops/void-devnet-receipt-inspect.sh
#
# Notes:
# - totalReceipts() is known to work on the current devnet ReceiptRegistry.
# - hasReceipt() and getReceipt() are best-effort; if the contract does not
#   expose them or uses a different lookup shape, we just emit warnings.

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo"

if ! command -v cast >/dev/null 2>&1; then
  echo "[error] cast not found in PATH" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[error] jq not found in PATH" >&2
  exit 1
fi

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE="${STATE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"

RECEIPT_ID="${1:-${RECEIPT_ID:-}}"
if [[ -z "${RECEIPT_ID}" ]]; then
  echo "usage: $0 <receiptId>  (or set RECEIPT_ID env)" >&2
  exit 1
fi

if [[ ! -f "$STATE" ]]; then
  echo "[error] state file not found: $STATE" >&2
  exit 1
fi

RECEIPTS="$(jq -r '(.ReceiptRegistry | (if type=="object" then (.address // empty) elif type=="string" then . else empty end))' "$STATE")"
if [[ -z "$RECEIPTS" || "$RECEIPTS" == "null" ]]; then
  echo "[error] ReceiptRegistry.address missing in $STATE" >&2
  exit 1
fi

echo "=== [devnet receipt inspect] ==="
echo "[repo]        $repo"
echo "[state]       $STATE"
echo "[rpc_url]     $RPC_URL"
echo "[ReceiptsReg] $RECEIPTS"
echo "[receiptId]   $RECEIPT_ID"
echo

echo "=== [totals (best-effort)] ==="
if cast call "$RECEIPTS" 'totalReceipts()(uint256)' --rpc-url "$RPC_URL" >/tmp/.void_receipts_total 2>/tmp/.void_receipts_total.err; then
  awk '{print "totalReceipts   =", $1}' </tmp/.void_receipts_total
else
  echo "[warn] totalReceipts() call failed; ABI or function may differ (see /tmp/.void_receipts_total.err)"
fi
rm -f /tmp/.void_receipts_total /tmp/.void_receipts_total.err || true
echo

echo "=== [hasReceipt(receiptId) (best-effort)] ==="
if cast call "$RECEIPTS" 'hasReceipt(bytes32)(bool)' "$RECEIPT_ID" --rpc-url "$RPC_URL" >/tmp/.void_receipt_has 2>/tmp/.void_receipt_has.err; then
  awk '{print "hasReceipt     =", $1}' </tmp/.void_receipt_has
else
  echo "[warn] hasReceipt() call failed; contract may not expose it (see /tmp/.void_receipt_has.err)"
fi
rm -f /tmp/.void_receipt_has /tmp/.void_receipt_has.err || true
echo

echo "=== [getReceipt full tuple (best-effort)] ==="
# NOTE: This ABI matches our current ReceiptRegistry design:
#   function getReceipt(bytes32 receiptId)
#     external
#     view
#     returns (bytes32 receiptIdOut,
#              bytes32 jobId,
#              address agent,
#              uint8 status,
#              uint64 createdAt,
#              string uri);
#
# If the contract uses a different shape (e.g. indexed by jobId+index),
# this will revert and we just print a warning.
if ! cast call "$RECEIPTS" \
  'getReceipt(bytes32)((bytes32,bytes32,address,uint8,uint64,string))' \
  "$RECEIPT_ID" \
  --rpc-url "$RPC_URL"; then
  echo "[warn] getReceipt() reverted – either this receiptId is not stored under the current key scheme, or the implementation uses a different lookup shape (e.g., jobId+index)."
fi
