#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_NODE_FUNDING_DIRECT_LINK_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/public/public-node-usdc-void-buy-pool-public-node-funding-direct-link-v1.md"

grep -F "VOID_BUY_POOL_LINK_PUBLIC_NODE_FUNDING_DIRECT_V1" "$src" >/dev/null
grep -F 'APP.get("/public-node/funding"' "$src" >/dev/null
grep -F "VOID_FUNDING_PATH_TIGHTEN_ROUTE_V1" "$src" >/dev/null
grep -F "VOID_FUNDING_PATH_TIGHTEN_V1" "$src" >/dev/null
grep -F "/public-node/buy-pool/usdc-void-v1" "$src" >/dev/null
grep -F "/public-node/buy-pool/usdc-void-v1.json" "$src" >/dev/null
grep -F "Open fixed-price USDC → VOID buy pool" "$src" >/dev/null

grep -F "VOID_BUY_POOL_LINK_PUBLIC_NODE_FUNDING_DIRECT_V1" "$doc" >/dev/null
grep -F 'APP.get("/public-node/funding", ...)' "$doc" >/dev/null
grep -F "No route-stack wrapper." "$doc" >/dev/null
grep -F "No new route." "$doc" >/dev/null
grep -F "No route-count increase." "$doc" >/dev/null
grep -F "No public mutation route." "$doc" >/dev/null

python3 - <<'PY'
from pathlib import Path
import re

s = Path("src/index.ts").read_text()
href = "/public-node/buy-pool/usdc-void-v1"
marker = "VOID_BUY_POOL_LINK_PUBLIC_NODE_FUNDING_DIRECT_V1"

m = re.search(r'APP\.get\(\s*["\']\/public-node\/funding["\'][\s\S]*?\n\}\);\n', s)
if not m:
    raise SystemExit('direct APP.get("/public-node/funding") route block not found')

seg = m.group(0)

required = [
    "VOID_FUNDING_PATH_TIGHTEN_ROUTE_V1",
    "VOID_FUNDING_PATH_TIGHTEN_V1",
    marker,
    href,
    "/public-node/buy-pool/usdc-void-v1.json",
    "Open fixed-price USDC → VOID buy pool",
]
for item in required:
    if item not in seg:
        raise SystemExit(f"direct funding route missing {item}")

if "VOID_BUY_POOL_LINK_FUNDING_ROUTE_WRAPPER_REPAIR_V1" in s:
    raise SystemExit("crash-looping route wrapper marker must remain absent")
if "__voidBuyPoolFundingRouteWrapperRepairV1" in s:
    raise SystemExit("crash-looping route wrapper functions must remain absent")
PY

# This patch must not add new routes; public safety count remains 175.
grep -F "public_literal_get_count=175" docs/public/public-surface-safety-index-v1.md >/dev/null
grep -F "public_literal_get_unique_count=175" docs/public/public-surface-safety-index-v1.md >/dev/null
grep -F "public_literal_get_count=175" ops/mainnet0/public-surface-safety-index-v1-proof.sh >/dev/null
grep -F "public_literal_get_unique_count=175" ops/mainnet0/public-surface-safety-index-v1-proof.sh >/dev/null

if grep -E "app\\.(post|put|patch|delete)\\('/public-node" "$src" >/dev/null; then
  echo "STOP: lowercase public-node mutation route detected."
  exit 1
fi

if grep -E "APP\\.(post|put|patch|delete)\\('/public-node" "$src" >/dev/null; then
  echo "STOP: uppercase public-node mutation route detected."
  exit 1
fi

echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_NODE_FUNDING_DIRECT_LINK_V1_ASSERT_GREEN"
echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_NODE_FUNDING_DIRECT_LINK_V1_GREEN"
