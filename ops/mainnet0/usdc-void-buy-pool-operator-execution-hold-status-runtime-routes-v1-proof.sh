#!/usr/bin/env bash
set -euo pipefail

doc="docs/public/public-node-usdc-void-buy-pool-operator-execution-hold-status-runtime-routes-v1.md"
src="src/index.ts"

echo "VOID_USDC_VOID_BUY_POOL_OPERATOR_EXECUTION_HOLD_STATUS_RUNTIME_ROUTES_V1_PROOF_BEGIN"

test -f "$doc"

grep -F "VOID_USDC_VOID_BUY_POOL_OPERATOR_EXECUTION_HOLD_STATUS_RUNTIME_ROUTES_V1" "$doc" >/dev/null
grep -F "/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1" "$doc" >/dev/null
grep -F "/public-node/usdc-void-buy-pool/operator-execution-hold-status-route-index-entry-v1" "$doc" >/dev/null
grep -F "read-only evidence pages" "$doc" >/dev/null
grep -F "trigger VOID fulfillment" "$doc" >/dev/null
grep -F "grant autonomous write authority" "$doc" >/dev/null

grep -F "VOID_USDC_VOID_BUY_POOL_OPERATOR_EXECUTION_HOLD_STATUS_RUNTIME_ROUTES_V1" "$src" >/dev/null
grep -F 'app.get("/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1"' "$src" >/dev/null
grep -F 'app.get("/public-node/usdc-void-buy-pool/operator-execution-hold-status-route-index-entry-v1"' "$src" >/dev/null
grep -F "VOID_USDC_VOID_BUY_POOL_OPERATOR_EXECUTION_HOLD_PUBLIC_STATUS_V1" "$src" >/dev/null
grep -F "VOID_USDC_VOID_BUY_POOL_OPERATOR_EXECUTION_HOLD_STATUS_ROUTE_INDEX_ENTRY_V1" "$src" >/dev/null
grep -F "automatic delivery false" "$src" >/dev/null
grep -F "public fulfillment false" "$src" >/dev/null
grep -F "autonomous write false" "$src" >/dev/null
grep -F "This is discovery-only" "$src" >/dev/null

if grep -R "VOID_USDC_VOID_BUY_POOL_OPERATOR_MANUAL_EXECUTION_PACKET_HOLD_V1" src docs/public fixtures/public 2>/dev/null; then
  echo "private_hold_marker_leaked_to_public_surface=true"
  exit 1
fi

echo "VOID_USDC_VOID_BUY_POOL_OPERATOR_EXECUTION_HOLD_STATUS_RUNTIME_ROUTES_V1_ASSERT_GREEN"
echo "VOID_USDC_VOID_BUY_POOL_OPERATOR_EXECUTION_HOLD_STATUS_RUNTIME_ROUTES_V1_GREEN"
