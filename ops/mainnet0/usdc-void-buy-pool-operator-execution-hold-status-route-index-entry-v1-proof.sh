#!/usr/bin/env bash
set -euo pipefail

doc="docs/public/public-node-usdc-void-buy-pool-operator-execution-hold-status-route-index-entry-v1.md"
status_doc="docs/public/public-node-usdc-void-buy-pool-operator-execution-hold-status-v1.md"
src="src/index.ts"

echo "VOID_USDC_VOID_BUY_POOL_OPERATOR_EXECUTION_HOLD_STATUS_ROUTE_INDEX_ENTRY_V1_PROOF_BEGIN"

test -f "$doc"
test -f "$status_doc"

grep -F "VOID_USDC_VOID_BUY_POOL_OPERATOR_EXECUTION_HOLD_STATUS_ROUTE_INDEX_ENTRY_V1" "$doc" >/dev/null
grep -F "VOID_USDC_VOID_BUY_POOL_OPERATOR_EXECUTION_HOLD_PUBLIC_STATUS_V1" "$doc" >/dev/null
grep -F "discovery-only" "$doc" >/dev/null
grep -F "It does not:" "$doc" >/dev/null
grep -F "create a public execution endpoint" "$doc" >/dev/null
grep -F "grant autonomous write authority" "$doc" >/dev/null

grep -F "VOID_USDC_VOID_BUY_POOL_OPERATOR_EXECUTION_HOLD_PUBLIC_STATUS_V1" "$status_doc" >/dev/null
grep -F "operator execution remains gated" "$status_doc" >/dev/null
grep -F "Automatic VOID delivery: false" "$status_doc" >/dev/null
grep -F "Public wallet-send mutation: false" "$status_doc" >/dev/null

grep -F "/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1" "$src" >/dev/null
grep -F "VOID_USDC_VOID_BUY_POOL_OPERATOR_EXECUTION_HOLD_PUBLIC_STATUS_V1" "$src" >/dev/null
grep -F "/public-node/usdc-void-buy-pool/operator-execution-hold-status-route-index-entry-v1" "$src" >/dev/null
grep -F "VOID_USDC_VOID_BUY_POOL_OPERATOR_EXECUTION_HOLD_STATUS_ROUTE_INDEX_ENTRY_V1" "$src" >/dev/null
grep -F "/public-node/buy-pool/usdc-void-v1" "$src" >/dev/null
grep -F "VOID_USDC_VOID_FIXED_PRICE_BUY_POOL_PUBLIC_PAGE_V1" "$src" >/dev/null

if grep -R "VOID_USDC_VOID_BUY_POOL_OPERATOR_MANUAL_EXECUTION_PACKET_HOLD_V1" src docs/public fixtures/public 2>/dev/null; then
  echo "private_hold_marker_leaked_to_public_surface=true"
  exit 1
fi

echo "VOID_USDC_VOID_BUY_POOL_OPERATOR_EXECUTION_HOLD_STATUS_ROUTE_INDEX_ENTRY_V1_ASSERT_GREEN"
echo "VOID_USDC_VOID_BUY_POOL_OPERATOR_EXECUTION_HOLD_STATUS_ROUTE_INDEX_ENTRY_V1_GREEN"
