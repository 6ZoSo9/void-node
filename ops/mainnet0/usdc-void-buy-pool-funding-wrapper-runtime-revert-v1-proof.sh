#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_FUNDING_WRAPPER_RUNTIME_REVERT_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/public/public-node-usdc-void-buy-pool-funding-wrapper-runtime-revert-v1.md"

grep -F "VOID_USDC_VOID_BUY_POOL_FUNDING_WRAPPER_RUNTIME_REVERT_V1" "$doc" >/dev/null
grep -F "runtime safety revert" "$doc" >/dev/null
grep -F "Remove crash-looping route-wrapper code." "$doc" >/dev/null

# Wrapper repair must be gone from runtime source after revert.
if grep -F "VOID_BUY_POOL_LINK_FUNDING_ROUTE_WRAPPER_REPAIR_V1" "$src" >/dev/null; then
  echo "STOP: crash-looping wrapper marker still present in src/index.ts"
  exit 1
fi

if grep -F "__voidBuyPoolFundingRouteWrapperRepairV1" "$src" >/dev/null; then
  echo "STOP: crash-looping wrapper functions still present in src/index.ts"
  exit 1
fi

# The sealed buy-pool page and link integration must remain.
grep -F "VOID_USDC_VOID_FIXED_PRICE_BUY_POOL_PUBLIC_PAGE_V1" "$src" >/dev/null
grep -F "VOID_USDC_VOID_BUY_POOL_PUBLIC_LINK_INTEGRATION_V1" "$src" >/dev/null
grep -F "VOID_BUY_POOL_LINK_PUBLIC_NODE_V1" "$src" >/dev/null
grep -F "VOID_BUY_POOL_LINK_MONEY_ENGINE_V1" "$src" >/dev/null
grep -F "VOID_BUY_POOL_LINK_BUY_VOID_V1" "$src" >/dev/null
grep -F "/public-node/buy-pool/usdc-void-v1" "$src" >/dev/null
grep -F "/public-node/buy-pool/usdc-void-v1.json" "$src" >/dev/null

# No route-count bump; public safety count remains 175.
grep -F "public_literal_get_count=175" docs/public/public-surface-safety-index-v1.md >/dev/null
grep -F "public_literal_get_unique_count=175" docs/public/public-surface-safety-index-v1.md >/dev/null
grep -F "public_literal_get_count=175" ops/mainnet0/public-surface-safety-index-v1-proof.sh >/dev/null
grep -F "public_literal_get_unique_count=175" ops/mainnet0/public-surface-safety-index-v1-proof.sh >/dev/null

if grep -E "app\\.(post|put|patch|delete)\\('/public-node" "$src" >/dev/null; then
  echo "STOP: public-node mutation route detected."
  exit 1
fi

echo "VOID_USDC_VOID_BUY_POOL_FUNDING_WRAPPER_RUNTIME_REVERT_V1_ASSERT_GREEN"
echo "VOID_USDC_VOID_BUY_POOL_FUNDING_WRAPPER_RUNTIME_REVERT_V1_GREEN"
