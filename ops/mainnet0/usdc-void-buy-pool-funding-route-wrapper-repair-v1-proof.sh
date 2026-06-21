#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_FUNDING_ROUTE_WRAPPER_REPAIR_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/public/public-node-usdc-void-buy-pool-funding-route-wrapper-repair-v1.md"

grep -F "VOID_BUY_POOL_LINK_FUNDING_ROUTE_WRAPPER_REPAIR_V1" "$src" >/dev/null
grep -F "__voidBuyPoolFundingRouteWrapperRepairV1PatchApp" "$src" >/dev/null
grep -F "__voidBuyPoolFundingRouteWrapperRepairV1PatchLayer" "$src" >/dev/null
grep -F "__voidBuyPoolFundingRouteWrapperRepairV1InjectHtml" "$src" >/dev/null
grep -F "__void_http_app" "$src" >/dev/null
grep -F "/public-node/funding" "$src" >/dev/null
grep -F "/public-node/buy-pool/usdc-void-v1" "$src" >/dev/null
grep -F "/public-node/buy-pool/usdc-void-v1.json" "$src" >/dev/null
grep -F '10,000,000 VOID at $0.50 USDC per VOID' "$src" >/dev/null
grep -F "self-custody wallet only" "$src" >/dev/null
grep -F "Do not send from an exchange" "$src" >/dev/null
grep -F "patched /public-node/funding HTML response" "$src" >/dev/null

grep -F "VOID_BUY_POOL_LINK_FUNDING_ROUTE_WRAPPER_REPAIR_V1" "$doc" >/dev/null
grep -F "No new route." "$doc" >/dev/null
grep -F "No route-count increase." "$doc" >/dev/null
grep -F "No public mutation route." "$doc" >/dev/null

# This patch must not add new routes; public safety count remains 175.
grep -F "public_literal_get_count=175" docs/public/public-surface-safety-index-v1.md >/dev/null
grep -F "public_literal_get_unique_count=175" docs/public/public-surface-safety-index-v1.md >/dev/null
grep -F "public_literal_get_count=175" ops/mainnet0/public-surface-safety-index-v1-proof.sh >/dev/null
grep -F "public_literal_get_unique_count=175" ops/mainnet0/public-surface-safety-index-v1-proof.sh >/dev/null

# No public-node mutation route may appear.
if grep -E "app\\.(post|put|patch|delete)\\('/public-node" "$src" >/dev/null; then
  echo "STOP: public-node mutation route detected."
  exit 1
fi

echo "VOID_USDC_VOID_BUY_POOL_FUNDING_ROUTE_WRAPPER_REPAIR_V1_ASSERT_GREEN"
echo "VOID_USDC_VOID_BUY_POOL_FUNDING_ROUTE_WRAPPER_REPAIR_V1_GREEN"
