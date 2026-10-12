#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_FIXED_PRICE_BUY_POOL_PUBLIC_PAGE_V1_SAFETY_COUNT_PROOF_BEGIN"

doc="docs/public/public-surface-safety-index-v1.md"
proof="ops/mainnet0/public-surface-safety-index-v1-proof.sh"

grep -F "public_literal_get_count=175" "$doc" >/dev/null
grep -F "public_literal_get_unique_count=175" "$doc" >/dev/null
grep -F "public_literal_get_count=175" "$proof" >/dev/null
grep -F "public_literal_get_unique_count=175" "$proof" >/dev/null

if grep -F "public_literal_get_count=173" "$doc" "$proof" >/dev/null; then
  echo "STOP: stale public_literal_get_count=173 remains in safety doc/proof."
  exit 1
fi

if grep -F "public_literal_get_unique_count=173" "$doc" "$proof" >/dev/null; then
  echo "STOP: stale public_literal_get_unique_count=173 remains in safety doc/proof."
  exit 1
fi

echo "VOID_USDC_VOID_FIXED_PRICE_BUY_POOL_PUBLIC_PAGE_V1_SAFETY_COUNT_ASSERT_GREEN"
echo "VOID_USDC_VOID_FIXED_PRICE_BUY_POOL_PUBLIC_PAGE_V1_SAFETY_COUNT_GREEN"
