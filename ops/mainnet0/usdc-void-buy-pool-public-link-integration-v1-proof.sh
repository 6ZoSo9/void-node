#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_LINK_INTEGRATION_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/public/public-node-usdc-void-buy-pool-public-link-integration-v1.md"

# Integration markers: one per public surface.
grep -F "VOID_USDC_VOID_BUY_POOL_PUBLIC_LINK_INTEGRATION_V1" "$src" >/dev/null
grep -F "VOID_BUY_POOL_LINK_PUBLIC_NODE_V1" "$src" >/dev/null
grep -F "VOID_BUY_POOL_LINK_MONEY_ENGINE_V1" "$src" >/dev/null
grep -F "VOID_BUY_POOL_LINK_BUY_VOID_V1" "$src" >/dev/null
grep -F "VOID_BUY_POOL_LINK_FUNDING_V1" "$src" >/dev/null

# Destination is the already-sealed fixed-price buy-pool route.
grep -F "/public-node/buy-pool/usdc-void-v1" "$src" >/dev/null
grep -F "/public-node/buy-pool/usdc-void-v1.json" "$src" >/dev/null
grep -F "VOID_USDC_VOID_FIXED_PRICE_BUY_POOL_PUBLIC_PAGE_V1" "$src" >/dev/null

# Existing surfaces remain linked/discoverable.
grep -F "/public-node/money-engine-v1" "$src" >/dev/null
grep -F "/buy-void" "$src" >/dev/null
grep -F "/public-node/funding" "$src" >/dev/null

# The canonical buy-pool proof still carries the money/safety terms.
bash ops/mainnet0/usdc-void-fixed-price-buy-pool-public-page-v1-proof.sh >/tmp/void-buy-pool-link-integration-canonical-buy-pool-proof.out
grep -F "VOID_USDC_VOID_FIXED_PRICE_BUY_POOL_PUBLIC_PAGE_V1_GREEN" /tmp/void-buy-pool-link-integration-canonical-buy-pool-proof.out >/dev/null

# Link-integration doc.
grep -F "VOID_USDC_VOID_BUY_POOL_PUBLIC_LINK_INTEGRATION_V1" "$doc" >/dev/null
grep -F "/public-node/buy-pool/usdc-void-v1" "$doc" >/dev/null
grep -F "No new public mutation route." "$doc" >/dev/null
grep -F "No route-count increase" "$doc" >/dev/null

# This patch must not add new routes; public safety count remains 175.
grep -F "public_literal_get_count=175" docs/public/public-surface-safety-index-v1.md >/dev/null
grep -F "public_literal_get_unique_count=175" docs/public/public-surface-safety-index-v1.md >/dev/null
grep -F "public_literal_get_count=175" ops/mainnet0/public-surface-safety-index-v1-proof.sh >/dev/null
grep -F "public_literal_get_unique_count=175" ops/mainnet0/public-surface-safety-index-v1-proof.sh >/dev/null

if grep -E "app\\.(post|put|patch|delete)\\('/public-node" "$src" >/dev/null; then
  echo "STOP: public-node mutation route detected."
  exit 1
fi

echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_LINK_INTEGRATION_V1_ASSERT_GREEN"
echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_LINK_INTEGRATION_V1_GREEN"
