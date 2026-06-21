#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_RECEIPT_INTAKE_READINESS_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/public/public-node-usdc-void-buy-pool-receipt-intake-readiness-v1.md"

grep -F "VOID_BUY_POOL_RECEIPT_INTAKE_READINESS_V1" "$src" >/dev/null
grep -F "receipt_intake_readiness" "$src" >/dev/null
grep -F "Receipt information to prepare" "$src" >/dev/null
grep -F "manual_receipt_preparation_only" "$src" >/dev/null
grep -F "public_receipt_intake_endpoint_open: false" "$src" >/dev/null
grep -F "public_receipt_mutation_enabled: false" "$src" >/dev/null
grep -F "automatic_receipt_acceptance_enabled: false" "$src" >/dev/null
grep -F "automatic_fulfillment_promised: false" "$src" >/dev/null
grep -F "Base USDC transaction hash" "$src" >/dev/null
grep -F "Exact sending wallet address" "$src" >/dev/null
grep -F "USDC amount sent" "$src" >/dev/null
grep -F "Approximate send timestamp or block time" "$src" >/dev/null
grep -F "Receiver address used" "$src" >/dev/null
grep -F "Wallet proof may be requested from the sending wallet" "$src" >/dev/null
grep -F "The sending wallet is the receipt identity and default fulfillment identity" "$src" >/dev/null
grep -F "no_public_write: true" "$src" >/dev/null
grep -F "no_wallet_send_by_page: true" "$src" >/dev/null
grep -F "no_private_queue_exposed: true" "$src" >/dev/null
grep -F "no_secret_exposure: true" "$src" >/dev/null

grep -F "VOID_BUY_POOL_RECEIPT_INTAKE_READINESS_V1" "$doc" >/dev/null
grep -F "No new route." "$doc" >/dev/null
grep -F "No route-count increase." "$doc" >/dev/null
grep -F "No route-stack wrapper." "$doc" >/dev/null
grep -F "No public receipt mutation route." "$doc" >/dev/null
grep -F "No public intake endpoint." "$doc" >/dev/null
grep -F "No wallet send route." "$doc" >/dev/null
grep -F "No automatic fulfillment." "$doc" >/dev/null
grep -F "No private queue exposure." "$doc" >/dev/null
grep -F "No secret exposure." "$doc" >/dev/null

python3 - <<'PY'
from pathlib import Path
import re

s = Path("src/index.ts").read_text()
marker = "VOID_BUY_POOL_RECEIPT_INTAKE_READINESS_V1"

const_idx = s.find("VOID_USDC_VOID_FIXED_PRICE_BUY_POOL_PUBLIC_PAGE_V1")
if const_idx == -1:
    raise SystemExit("buy-pool constant not found")

near_const = s[const_idx: const_idx + 16000]
for item in [
    "receipt_intake_readiness",
    marker,
    "public_receipt_intake_endpoint_open: false",
    "public_receipt_mutation_enabled: false",
    "automatic_receipt_acceptance_enabled: false",
    "automatic_fulfillment_promised: false",
    "The sending wallet is the receipt identity and default fulfillment identity",
]:
    if item not in near_const:
        raise SystemExit(f"receipt readiness missing near buy-pool constant: {item}")

m = re.search(r'app\.get\(\s*["\']\/public-node\/buy-pool\/usdc-void-v1["\'][\s\S]*?\n\s*\}\);\n', s)
if not m:
    raise SystemExit('buy-pool HTML route not found')

seg = m.group(0)
for item in [
    marker,
    "Receipt information to prepare",
    "preparation only",
    "no public receipt intake endpoint",
    "Base USDC transaction hash",
    "Exact sending wallet",
    "sender wallet is the receipt identity and default fulfillment identity",
    "Do not send from exchanges or pooled custody services",
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

echo "VOID_USDC_VOID_BUY_POOL_RECEIPT_INTAKE_READINESS_V1_ASSERT_GREEN"
echo "VOID_USDC_VOID_BUY_POOL_RECEIPT_INTAKE_READINESS_V1_GREEN"
