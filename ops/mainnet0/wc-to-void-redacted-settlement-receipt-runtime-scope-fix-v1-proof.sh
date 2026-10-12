#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

if grep -n '^app\.get("/public-node/wc-to-void/redacted-settlement-receipt-v1' src/index.ts; then
  echo "STOP: bare top-level app.get wc-to-void route remains."
  exit 1
fi

grep -F 'VOID_WC_TO_VOID_REDACTED_SETTLEMENT_RECEIPT_RUNTIME_V1' src/index.ts >/dev/null
grep -F '__void_wc_to_void_redacted_settlement_receipt_runtime_v1_mounted' src/index.ts >/dev/null
grep -F 'const APP: any = G.__void_http_app || G.app || null;' src/index.ts >/dev/null
grep -F 'APP.get("/public-node/wc-to-void/redacted-settlement-receipt-v1.json"' src/index.ts >/dev/null
grep -F 'APP.get("/public-node/wc-to-void/redacted-settlement-receipt-v1"' src/index.ts >/dev/null
grep -F 'setTimeout(mountWcToVoidRedactedSettlementReceiptRuntimeV1, 400);' src/index.ts >/dev/null

echo "VOID_WC_TO_VOID_REDACTED_SETTLEMENT_RECEIPT_RUNTIME_SCOPE_FIX_V1_PROOF_GREEN"
