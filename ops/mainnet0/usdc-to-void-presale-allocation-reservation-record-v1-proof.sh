#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_TO_VOID_PRESALE_ALLOCATION_RESERVATION_RECORD_V1_PROOF_BEGIN"

python3 - <<'PY'
from pathlib import Path
import re

src = Path("src/index.ts").read_text()
doc = Path("docs/public/public-node-usdc-to-void-presale-allocation-reservation-record-v1.md").read_text()

marker = "VOID_USDC_TO_VOID_PRESALE_ALLOCATION_RESERVATION_RECORD_V1"
route = "/public-node/usdc-void-buy-pool/allocation-reservation-record-v1.json"

required_src = [
    marker,
    route,
    "allocation_reservation_record_defined_authority_false",
    'activation_gate: "allocation_reservation_record"',
    "allocation_reservation_record_defined: true",
    "allocation_reservation_record_green: false",
    "allocation_reservation_record_write_enabled: false",
    "append_only_allocation_reservation_record_enforced: false",
    "current_operator_events_are_not_allocation_reservation_ledger: true",
    "current_payment_verified_event_is_not_allocation_reserved: true",
    "current_fulfilled_event_is_not_automatic_fulfillment: true",
    "current_inventory_accounting_derived_from_payment_verified_events: true",
    "payment_verified operator events and sale-state derived accounting are not a dedicated append-only allocation reservation record",
    "operator_events_jsonl: true",
    "requests_jsonl: true",
    "sale_state_derived_accounting: true",
    "manual_fulfillment_status_event: true",
    "usdc_to_void_presale_allocation_reservation_record_v1",
    "verified_usdc_payment_detection_gate_green",
    "duplicate_payment_guard_green",
    "inventory_allocation_guard_green",
    "remaining_presale_inventory_gte_quoted_void",
    "canonical_payment_identity_not_already_reserved",
    "request_id_not_already_reserved",
    "private_operator_controlled_append_only_allocation_ledger_exists",
    "previous_allocation_record_hash_carried_forward",
    "new_allocation_record_hash_produced",
    "explicit_operator_activation_record",
    "record_type",
    "record_id",
    "request_id",
    "source_chain",
    "payment_transaction_hash",
    "payment_log_index",
    "canonical_payment_identity",
    "buyer_delivery_wallet",
    "quote_void_amount",
    "quote_usdc_amount",
    "pool_void_total_before",
    "reserved_void_total_before",
    "remaining_void_before",
    "reserved_void_total_after",
    "remaining_void_after",
    "verified_payment_receipt_ref",
    "duplicate_payment_guard_result",
    "inventory_allocation_guard_result",
    "operator_activation_record_ref",
    "created_at_ms",
    "previous_allocation_record_hash",
    "allocation_record_hash",
    "one_request_id_at_most_one_allocation_reservation_record",
    "one_canonical_payment_identity_at_most_one_allocation_reservation_record",
    "reserved_total_after_lte_pool_void_total",
    "remaining_inventory_after_non_negative",
    "allocation_reservation_before_fulfillment",
    "fulfillment_requires_prior_allocation_reservation",
    "allocation_record_hash_chain_append_only",
    "public_route_describes_shape_only_no_private_buyer_payment_operator_material",
    "payment_verified_with_duplicate_and_inventory_guard_without_allocation_record",
    "no_automatic_fulfillment",
    "allocation_reservation_record_written",
    "may_reserve_inventory_only_after_all_prerequisite_gates_green",
    "fulfilled",
    "requires_prior_allocation_reservation_record_and_fulfillment_receipt",
    "automatic_fulfillment_enabled: false",
    "wallet_fulfillment_enabled: false",
    "signer_access_enabled: false",
    "treasury_transfer_authority_enabled: false",
    "buyer_execution_authorized: false",
    "public_mutation_enabled: false",
    "wc_ledger_write: false",
    "void_transfer_now: false",
    "operator-events.jsonl",
    'operator_status: "payment_verified"',
    'operator_status === "fulfilled"',
    "fulfillment_receipt_required: operator_status === \"fulfilled\"",
    "allocation_reserved_void",
    "only payment_verified operator events may reserve presale allocation",
]

for item in required_src:
    if item not in src:
        raise SystemExit(f"missing_source_item={item}")

bad_src = [
    "allocation_reservation_record_green: true",
    "allocation_reservation_record_write_enabled: true",
    "append_only_allocation_reservation_record_enforced: true",
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
    "append-only allocation reservation record contract",
    "does not enable automatic fulfillment",
    "does not enable allocation record writes",
    "operator events such as `payment_verified`",
    "not a dedicated allocation reservation ledger",
    "A `payment_verified` operator event is not the same as `allocation_reserved`",
    "must write a separate append-only allocation reservation record",
    "verified payment detection gate is green",
    "duplicate payment guard is green",
    "inventory allocation guard is green",
    "canonical payment identity has not already reserved allocation",
    "request ID has not already reserved allocation",
    "previous allocation record hash is carried forward",
    "new allocation record hash is produced",
    "`record_type`",
    "`record_id`",
    "`canonical_payment_identity`",
    "`previous_allocation_record_hash`",
    "`allocation_record_hash`",
    "one request ID can have at most one allocation reservation record",
    "one canonical payment identity can have at most one allocation reservation record",
    "reserved total after must be less than or equal to total presale inventory",
    "fulfillment cannot happen without prior allocation reservation",
    "`allocation_reservation_record_green`: false",
    "`allocation_reservation_record_write_enabled`: false",
    "`append_only_allocation_reservation_record_enforced`: false",
    "`current_payment_verified_event_is_not_allocation_reserved`: true",
    "`void_transfer_now`: false",
]
for item in required_doc:
    if item not in doc:
        raise SystemExit(f"missing_doc_item={item}")

route_index_pattern = re.compile(
    r'\{\s*path:\s*"/public-node/usdc-void-buy-pool/allocation-reservation-record-v1\.json",\s*kind:\s*"json",\s*marker:\s*"VOID_USDC_TO_VOID_PRESALE_ALLOCATION_RESERVATION_RECORD_V1",\s*use:\s*"([^"]*)"\s*\}',
    re.DOTALL,
)
matches = list(route_index_pattern.finditer(src))
if len(matches) != 1:
    raise SystemExit(f"route_index_entry_count_bad={len(matches)}")

entry = matches[0].group(0)
for item in [
    route,
    marker,
    "append-only allocation reservation record",
    "payment_verified operator event is not allocation_reserved",
    "verified payment",
    "duplicate guard",
    "inventory guard",
    "unique request/payment identity",
    "hash-chained allocation record",
    "explicit operator activation",
    "allocation record writes remain disabled",
    "authority remains false",
]:
    if item not in entry:
        raise SystemExit(f"route_index_entry_missing={item}")

# Ensure upstream gates remain present and non-activating.
for item in [
    "VOID_USDC_TO_VOID_PRESALE_VERIFIED_PAYMENT_DETECTION_GATE_V1",
    "VOID_USDC_TO_VOID_PRESALE_DUPLICATE_PAYMENT_GUARD_V1",
    "VOID_USDC_TO_VOID_PRESALE_INVENTORY_ALLOCATION_GUARD_V1",
    "verified_usdc_payment_detection_gate_green: false",
    "duplicate_payment_guard_green: false",
    "inventory_allocation_guard_green: false",
    "atomic_allocation_reservation_enforced: false",
]:
    if item not in src:
        raise SystemExit(f"upstream_gate_link_missing={item}")

print("allocation_reservation_record_source_green=true")
print("payment_verified_event_not_allocation_reserved_declared=true")
print("allocation_reservation_record_green_false=true")
print("allocation_reservation_record_write_enabled_false=true")
print("append_only_allocation_reservation_record_enforced_false=true")
print("automatic_fulfillment_still_false=true")
print("VOID_USDC_TO_VOID_PRESALE_ALLOCATION_RESERVATION_RECORD_V1_ASSERT_GREEN")
PY

echo "VOID_USDC_TO_VOID_PRESALE_ALLOCATION_RESERVATION_RECORD_V1_GREEN"
