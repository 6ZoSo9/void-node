#!/usr/bin/env bash
set -euo pipefail

doc="docs/public/public-node-usdc-void-buy-pool-operator-execution-hold-status-v1.md"
src="src/index.ts"

echo "VOID_USDC_VOID_BUY_POOL_OPERATOR_EXECUTION_HOLD_PUBLIC_STATUS_V1_PROOF_BEGIN"

test -f "$doc"

grep -F "VOID_USDC_VOID_BUY_POOL_OPERATOR_EXECUTION_HOLD_PUBLIC_STATUS_V1" "$doc" >/dev/null
grep -F "Public fixed-price buy-pool page: live" "$doc" >/dev/null
grep -F "Manual execution packet: withheld hold-only" "$doc" >/dev/null
grep -F "Automatic VOID delivery: false" "$doc" >/dev/null
grep -F "Public fulfillment endpoint: false" "$doc" >/dev/null
grep -F "Public wallet-send mutation: false" "$doc" >/dev/null
grep -F "Autonomous write authority: false" "$doc" >/dev/null
grep -F "manual_execution_packet_withheld = true" "$doc" >/dev/null
grep -F "public_mutation_enabled = false" "$doc" >/dev/null
grep -F "automatic_delivery_enabled = false" "$doc" >/dev/null

grep -F "/public-node/buy-pool/usdc-void-v1" "$src" >/dev/null
grep -F "/public-node/funding" "$src" >/dev/null
grep -F "VOID_USDC_VOID_FIXED_PRICE_BUY_POOL_PUBLIC_PAGE_V1" "$src" >/dev/null
grep -F "VOID_BUY_POOL_BUYER_SELF_CUSTODY_CHECKLIST_V1" "$src" >/dev/null
grep -F "VOID_BUY_POOL_RECEIPT_INTAKE_READINESS_V1" "$src" >/dev/null

if grep -R "VOID_USDC_VOID_BUY_POOL_OPERATOR_MANUAL_EXECUTION_PACKET_HOLD_V1" src docs/public fixtures/public 2>/dev/null; then
  echo "private_hold_marker_leaked_to_public_surface=true"
  exit 1
fi

if grep -R "VOID_USDC_VOID_BUY_POOL_OPERATOR_MANUAL_EXECUTION_PACKET_HOLD_V1" docs/private fixtures/private ops/mainnet0/usdc-void-buy-pool-operator-manual-execution-packet-hold-v1-proof.sh >/dev/null; then
  echo "private_hold_marker_present_in_private_operator_materials=true"
else
  echo "private_hold_marker_missing_from_private_operator_materials=true"
  exit 1
fi

echo "VOID_USDC_VOID_BUY_POOL_OPERATOR_EXECUTION_HOLD_PUBLIC_STATUS_V1_ASSERT_GREEN"
echo "VOID_USDC_VOID_BUY_POOL_OPERATOR_EXECUTION_HOLD_PUBLIC_STATUS_V1_GREEN"
