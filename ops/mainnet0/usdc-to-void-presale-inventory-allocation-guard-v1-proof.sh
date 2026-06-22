#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_TO_VOID_PRESALE_INVENTORY_ALLOCATION_GUARD_V1_PROOF_BEGIN"

python3 - <<'PY'
from pathlib import Path
import re

src = Path("src/index.ts").read_text()
doc = Path("docs/public/public-node-usdc-to-void-presale-inventory-allocation-guard-v1.md").read_text()

marker = "VOID_USDC_TO_VOID_PRESALE_INVENTORY_ALLOCATION_GUARD_V1"
route = "/public-node/usdc-void-buy-pool/inventory-allocation-guard-v1.json"

required_src = [
    marker,
    route,
    "inventory_allocation_guard_defined_authority_false",
    'activation_gate: "inventory_allocation_guard"',
    "inventory_allocation_guard_defined: true",
    "inventory_allocation_guard_green: false",
    "atomic_allocation_reservation_enforced: false",
    "current_sale_state_quote_capacity_check_present: true",
    "current_verified_payment_inventory_accounting_present: true",
    "current_request_capacity_check_is_not_atomic_allocation_guard: true",
    "request-time quote capacity checks and sale-state accounting are not sufficient for automatic allocation reservation",
    "/__void/buy-void/sale-state.json",
    "request_intake_rejects_sold_out: true",
    "request_intake_rejects_quote_above_remaining_void: true",
    "sale_state_reports_remaining_void: true",
    "sale_state_reports_allocation_reserved_void: true",
    "sale_state_counts_payment_verified_operator_events: true",
    "verified_usdc_payment_detection_gate_green",
    "duplicate_payment_guard_green",
    "remaining_presale_inventory_gte_quoted_void",
    "append_only_allocation_reservation_record",
    "unique_allocation_reservation_record",
    "reserved_total_lte_pool_void_total",
    "concurrent_reservation_oversell_guard",
    "sold_out_closure_when_remaining_inventory_zero",
    "allocation_reserved_before_fulfillment",
    "explicit_operator_activation_record",
    "payment_verified_without_duplicate_guard",
    "no_automatic_allocation_reservation",
    "payment_verified_with_duplicate_guard_without_inventory_guard",
    "payment_verified_with_duplicate_and_inventory_guard_green",
    "allocation_may_reserve_only_through_append_only_allocation_record",
    "fulfilled",
    "requires_prior_allocation_reservation_and_fulfillment_receipt",
    "automatic_fulfillment_enabled: false",
    "wallet_fulfillment_enabled: false",
    "signer_access_enabled: false",
    "treasury_transfer_authority_enabled: false",
    "buyer_execution_authorized: false",
    "public_mutation_enabled: false",
    "wc_ledger_write: false",
    "void_transfer_now: false",
    "pool_void_total",
    "remaining_void",
    "allocation_reserved_void",
    "sold_out",
    "buy_void_pool_sold_out",
    "quoted_void > sale_state.remaining_void",
    "only payment_verified operator events may reserve presale allocation",
]

for item in required_src:
    if item not in src:
        raise SystemExit(f"missing_source_item={item}")

bad_src = [
    "inventory_allocation_guard_green: true",
    "atomic_allocation_reservation_enforced: true",
    "automatic_fulfillment_enabled: true",
    "wallet_fulfillment_enabled: true",
    "signer_access_enabled: true",
    "treasury_transfer_authority_enabled: true",
    "buyer_execution_authorized: true",
    "public_mutation_enabled: true",
    "wc_ledger_write: true",
    "void_transfer_now: true",
]
for item in bad_src:
    if item in src:
        raise SystemExit(f"forbidden_true_authority_present={item}")

required_doc = [
    marker,
    "inventory/allocation guard contract",
    "does not enable automatic fulfillment",
    "current request lane already exposes sale-state accounting",
    "sold-out state exists",
    "remaining presale inventory is reported",
    "request intake can reject a quote request larger than remaining inventory",
    "That is not the same as an automatic allocation reservation guard",
    "payment is verified by the verified-payment detection gate",
    "duplicate-payment guard is green",
    "remaining presale inventory is greater than or equal to the quoted VOID allocation",
    "allocation reservation record is append-only and unique",
    "allocation reservation cannot exceed total presale inventory",
    "concurrent reservation attempts cannot oversell inventory",
    "sold-out closure is triggered when remaining inventory reaches zero",
    "allocation reservation happens before fulfillment",
    "fulfillment cannot happen without allocation reservation",
    "`inventory_allocation_guard_green`: false",
    "`atomic_allocation_reservation_enforced`: false",
    "`current_request_capacity_check_is_not_atomic_allocation_guard`: true",
    "`void_transfer_now`: false",
]
for item in required_doc:
    if item not in doc:
        raise SystemExit(f"missing_doc_item={item}")

route_index_pattern = re.compile(
    r'\{\s*path:\s*"/public-node/usdc-void-buy-pool/inventory-allocation-guard-v1\.json",\s*kind:\s*"json",\s*marker:\s*"VOID_USDC_TO_VOID_PRESALE_INVENTORY_ALLOCATION_GUARD_V1",\s*use:\s*"([^"]*)"\s*\}',
    re.DOTALL,
)
matches = list(route_index_pattern.finditer(src))
if len(matches) != 1:
    raise SystemExit(f"route_index_entry_count_bad={len(matches)}")

entry = matches[0].group(0)
for item in [
    route,
    marker,
    "inventory/allocation guard",
    "request-time quote capacity checks are not atomic allocation reservation",
    "verified payment",
    "duplicate guard",
    "remaining inventory",
    "append-only allocation record",
    "oversell guard",
    "sold-out closure",
    "explicit operator activation",
    "authority remains false",
]:
    if item not in entry:
        raise SystemExit(f"route_index_entry_missing={item}")

# Ensure earlier activation prerequisites still exist and remain non-activating.
for item in [
    "VOID_USDC_TO_VOID_PRESALE_VERIFIED_PAYMENT_DETECTION_GATE_V1",
    "VOID_USDC_TO_VOID_PRESALE_DUPLICATE_PAYMENT_GUARD_V1",
    "verified_usdc_payment_detection_gate_green: false",
    "duplicate_payment_guard_green: false",
    "current_verifier_duplicate_payment_guard_enforced: false",
]:
    if item not in src:
        raise SystemExit(f"upstream_gate_link_missing={item}")

print("inventory_allocation_guard_source_green=true")
print("request_capacity_check_not_atomic_allocation_guard_declared=true")
print("inventory_allocation_guard_green_false=true")
print("atomic_allocation_reservation_enforced_false=true")
print("automatic_fulfillment_still_false=true")
print("VOID_USDC_TO_VOID_PRESALE_INVENTORY_ALLOCATION_GUARD_V1_ASSERT_GREEN")
PY

echo "VOID_USDC_TO_VOID_PRESALE_INVENTORY_ALLOCATION_GUARD_V1_GREEN"
