#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_BUYER_SELF_CUSTODY_CHECKLIST_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/public/public-node-usdc-void-buy-pool-buyer-self-custody-checklist-v1.md"

grep -F "VOID_BUY_POOL_BUYER_SELF_CUSTODY_CHECKLIST_V1" "$src" >/dev/null
grep -F "buyer_self_custody_checklist" "$src" >/dev/null
grep -F "Before you send USDC" "$src" >/dev/null
grep -F "Send Base USDC only from a self-custody wallet you control." "$src" >/dev/null
grep -F "Do not send from centralized exchanges" "$src" >/dev/null
grep -F "sender wallet is the receipt and delivery identity" "$src" >/dev/null
grep -F "Manual review remains required" "$src" >/dev/null
grep -F "automatic_fulfillment_promised: false" "$src" >/dev/null
grep -F "wallet_send_by_page: false" "$src" >/dev/null
grep -F "public_mutation_enabled: false" "$src" >/dev/null

grep -F "VOID_BUY_POOL_BUYER_SELF_CUSTODY_CHECKLIST_V1" "$doc" >/dev/null
grep -F "No new route." "$doc" >/dev/null
grep -F "No route-count increase." "$doc" >/dev/null
grep -F "No route-stack wrapper." "$doc" >/dev/null
grep -F "No public mutation route." "$doc" >/dev/null
grep -F "No wallet send route." "$doc" >/dev/null

python3 - <<'PY'
from pathlib import Path
import re

s = Path("src/index.ts").read_text()
marker = "VOID_BUY_POOL_BUYER_SELF_CUSTODY_CHECKLIST_V1"

const_idx = s.find("VOID_USDC_VOID_FIXED_PRICE_BUY_POOL_PUBLIC_PAGE_V1")
if const_idx == -1:
    raise SystemExit("buy-pool constant not found")

if "buyer_self_custody_checklist" not in s[const_idx: const_idx + 12000]:
    raise SystemExit("buyer_self_custody_checklist not near buy-pool constant")
if marker not in s[const_idx: const_idx + 12000]:
    raise SystemExit("marker not near buy-pool constant")

m = re.search(r'app\.get\(\s*["\']\/public-node\/buy-pool\/usdc-void-v1["\'][\s\S]*?\n\s*\}\);\n', s)
if not m:
    raise SystemExit('buy-pool HTML route not found')

seg = m.group(0)
for item in [
    marker,
    "Before you send USDC",
    "Self-custody only",
    "Sender wallet = receipt identity",
    "Manual review remains required",
    "No investment promise",
]:
    if item not in seg:
        raise SystemExit(f"buy-pool HTML route missing {item}")

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

echo "VOID_USDC_VOID_BUY_POOL_BUYER_SELF_CUSTODY_CHECKLIST_V1_ASSERT_GREEN"
echo "VOID_USDC_VOID_BUY_POOL_BUYER_SELF_CUSTODY_CHECKLIST_V1_GREEN"
