#!/usr/bin/env bash
set -euo pipefail

echo "VOID_WC_TO_VOID_SETTLEMENT_COMPLETE_PUBLIC_SMOKE_V1_PROOF_BEGIN"

script="ops/mainnet0/wc-to-void-settlement-complete-public-smoke-v1.sh"
tx="0xaccef593ae1cab3f99ff786a26913b0d873ee789dfb96056007dd9dab9f3e717"

test -x "$script"

grep -F "VOID_WC_TO_VOID_SETTLEMENT_COMPLETE_PUBLIC_SMOKE_V1_BEGIN" "$script" >/dev/null
grep -F "VOID_WC_TO_VOID_SETTLEMENT_COMPLETE_PUBLIC_SMOKE_V1_GREEN" "$script" >/dev/null
grep -F "VOID_WC_TO_VOID_SETTLEMENT_COMPLETE_DASHBOARD_CARD_RUNTIME_V1" "$script" >/dev/null
grep -F "VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_FINAL_PUBLIC_INDEX_RUNTIME_V1" "$script" >/dev/null
grep -F "VOID_WC_TO_VOID_PUBLIC_REVIEWER_VERIFY_PACK_RUNTIME_V1" "$script" >/dev/null
grep -F "VOID_WC_TO_VOID_REDACTED_SETTLEMENT_RECEIPT_RUNTIME_V1" "$script" >/dev/null
grep -F "$tx" "$script" >/dev/null
grep -F "/public-node" "$script" >/dev/null
grep -F "/public-node/route-index.json" "$script" >/dev/null
grep -F "/public-node/wc-to-void/settlement-evidence-final-public-index-v1.json" "$script" >/dev/null
grep -F "/public-node/wc-to-void/public-reviewer-one-command-verify-pack-v1.json" "$script" >/dev/null
grep -F "/public-node/wc-to-void/redacted-settlement-receipt-v1.json" "$script" >/dev/null

if grep -E "curl .* -X *(POST|PUT|PATCH|DELETE)|curl .*--request *(POST|PUT|PATCH|DELETE)" "$script" >/dev/null; then
  echo "STOP: smoke script must be GET-only."
  exit 1
fi

if grep -E "app\\.(post|put|patch|delete)\\('/public-node" src/index.ts >/dev/null; then
  echo "STOP: public-node mutation route detected."
  exit 1
fi

echo "VOID_WC_TO_VOID_SETTLEMENT_COMPLETE_PUBLIC_SMOKE_V1_ASSERT_GREEN"
echo "VOID_WC_TO_VOID_SETTLEMENT_COMPLETE_PUBLIC_SMOKE_V1_PROOF_GREEN"
