#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_FIXED_PRICE_BUY_POOL_PUBLIC_PAGE_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/public/public-surface-safety-index-v1.md"
safety="ops/mainnet0/public-surface-safety-index-v1-proof.sh"

grep -F "VOID_USDC_VOID_FIXED_PRICE_BUY_POOL_PUBLIC_PAGE_V1" "$src" >/dev/null
grep -F "void_usdc_void_fixed_price_buy_pool_public_page_v1" "$src" >/dev/null
grep -F "/public-node/buy-pool/usdc-void-v1.json" "$src" >/dev/null
grep -F "/public-node/buy-pool/usdc-void-v1" "$src" >/dev/null
grep -F "__voidMountUsdcVoidFixedPriceBuyPoolPublicPageV1" "$src" >/dev/null
grep -F "__voidTryMountUsdcVoidFixedPriceBuyPoolPublicPageV1" "$src" >/dev/null
grep -F "__void_http_app" "$src" >/dev/null

grep -F "VOID_BUY_RECEIVE_ADDRESS" "$src" >/dev/null
grep -F "VOID_BUY_CHAIN" "$src" >/dev/null
grep -F "VOID_BUY_USDC_SYMBOL" "$src" >/dev/null
grep -F "VOID_BUY_PRICE_USDC_PER_VOID" "$src" >/dev/null
grep -F "VOID_BUY_POOL_VOID_TOTAL" "$src" >/dev/null
grep -F "VOID_BUY_MAX_RAISE_USDC" "$src" >/dev/null

grep -F "0.50" "$src" >/dev/null
grep -F "10000000" "$src" >/dev/null
grep -F "5000000" "$src" >/dev/null
grep -F "pool_locks_and_closes_once_all_10_000_000_VOID_allocation_is_drained" "$src" >/dev/null
grep -F "Self-custody wallet only" "$src" >/dev/null
grep -F "Do not send from an exchange" "$src" >/dev/null
grep -F "sender_address_is_receipt_identity" "$src" >/dev/null
grep -F "no_guaranteed_return" "$src" >/dev/null
grep -F "no_investment_return_promise" "$src" >/dev/null
grep -F "locked USDC/VOID liquidity pool for trading" "$src" >/dev/null
grep -F "locked ETH/VOID liquidity pool" "$src" >/dev/null

grep -F "public_literal_get_count=175" "$doc" >/dev/null
grep -F "public_literal_get_unique_count=175" "$doc" >/dev/null
grep -F "public_literal_get_count=175" "$safety" >/dev/null
grep -F "public_literal_get_unique_count=175" "$safety" >/dev/null

python3 - <<'PY'
from pathlib import Path

s = Path("src/index.ts").read_text()
route = 'app.get("/public-node/buy-pool/usdc-void-v1.json"'
mount = "function __voidMountUsdcVoidFixedPriceBuyPoolPublicPageV1"

route_i = s.find(route)
mount_i = s.find(mount)

if route_i == -1:
    raise SystemExit("missing USDC/VOID buy pool JSON route")
if mount_i == -1:
    raise SystemExit("missing USDC/VOID buy pool mount function")
if route_i < mount_i:
    raise SystemExit("USDC/VOID buy pool route appears before mount function; likely top-level")

pre_mount = s[:mount_i]
if route in pre_mount:
    raise SystemExit("top-level buy-pool app.get remains before mount wrapper")
PY

if grep -E "app\\.(post|put|patch|delete)\\('/public-node/buy-pool/usdc-void-v1" "$src" >/dev/null; then
  echo "STOP: buy pool public page must remain GET-only."
  exit 1
fi

if grep -E "app\\.(post|put|patch|delete)\\('/public-node" "$src" >/dev/null; then
  echo "STOP: public-node mutation route detected."
  exit 1
fi

echo "VOID_USDC_VOID_FIXED_PRICE_BUY_POOL_PUBLIC_PAGE_V1_ASSERT_GREEN"
echo "VOID_USDC_VOID_FIXED_PRICE_BUY_POOL_PUBLIC_PAGE_V1_GREEN"
