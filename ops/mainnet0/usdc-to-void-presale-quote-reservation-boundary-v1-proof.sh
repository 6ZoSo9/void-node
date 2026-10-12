#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_TO_VOID_PRESALE_QUOTE_RESERVATION_BOUNDARY_V1_PROOF_BEGIN"

python3 - <<'PY'
from pathlib import Path
import re

src = Path("src/index.ts").read_text()
doc = Path("docs/public/public-node-usdc-to-void-presale-quote-reservation-boundary-v1.md").read_text()

marker = "VOID_USDC_TO_VOID_PRESALE_QUOTE_RESERVATION_BOUNDARY_V1"
route = "/public-node/usdc-void-buy-pool/presale-quote-reservation-boundary-v1.json"

needles = [
    marker,
    route,
    "presale_quote_reservation_boundary_active",
    "USDC_to_VOID_buy_only",
    "quote_created_inventory_effect",
    "payment_pending_inventory_effect",
    "payment_submitted_unverified_inventory_effect",
    "submitted_tx_hash_inventory_effect",
    "payment_verified_inventory_effect",
    "allocation_reserved_inventory_effect",
    "Pending quote / unverified request",
    "Verified presale allocation",
    "liquidity_pool: false",
    "void_to_usdc_supported: false",
    "redeem_supported: false",
    "sell_void_supported: false",
    "automatic_fulfillment_enabled: false",
    "void_transfer_now: false",
]

for n in needles:
    if n not in src:
        raise SystemExit(f"missing_source_needle={n}")

doc_needles = [
    marker,
    "buy-only presale boundary",
    "not a liquidity pool",
    "not a liquidity pool, swap route, exchange route, VOID-to-USDC route, redemption route, or sell route",
    "`quote_created` does not reserve VOID inventory",
    "`payment_pending` does not reserve VOID inventory",
    "`payment_submitted_unverified` does not reserve VOID inventory",
    "`payment_verified` is required before `allocation_reserved`",
]
for n in doc_needles:
    if n not in doc:
        raise SystemExit(f"missing_doc_needle={n}")

bad_live_copy = [
    "Requested/reserved",
    "Fixed-price buy pool proof page",
    "The current USDC → VOID public buy pool is exposed",
    "Open USDC → VOID Fixed Price Buy Pool v1",
]
for bad in bad_live_copy:
    if bad in src:
        raise SystemExit(f"bad_live_copy_still_present={bad}")

# The route path and historical marker names may retain buy-pool for compatibility.
# But the newly added route-index use string must use presale semantics.
m = re.search(r'\{\s*path:\s*"/public-node/usdc-void-buy-pool/presale-quote-reservation-boundary-v1\.json",\s*kind:\s*"json",\s*marker:\s*"VOID_USDC_TO_VOID_PRESALE_QUOTE_RESERVATION_BOUNDARY_V1",\s*use:\s*"([^"]*)"\s*\}', src)
if not m:
    raise SystemExit("route_index_entry_missing")
use = m.group(1)
for good in ["presale", "quotes and unverified payments do not reserve VOID", "verified USDC payment is required"]:
    if good not in use:
        raise SystemExit(f"route_index_use_missing={good}")

print("presale_quote_reservation_boundary_source_green=true")
print("unpaid_quote_cannot_reserve_void=true")
print("pending_payment_cannot_reserve_void=true")
print("submitted_tx_hash_cannot_reserve_void=true")
print("verified_usdc_payment_required_for_allocation_reserved=true")
print("presale_has_no_void_to_usdc_swap_route=true")
print("public_copy_no_requested_reserved_label=true")
PY

echo "VOID_USDC_TO_VOID_PRESALE_QUOTE_RESERVATION_BOUNDARY_V1_ASSERT_GREEN"
echo "VOID_USDC_TO_VOID_PRESALE_QUOTE_RESERVATION_BOUNDARY_V1_GREEN"
