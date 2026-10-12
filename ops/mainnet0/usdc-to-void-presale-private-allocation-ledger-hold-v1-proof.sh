#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_TO_VOID_PRESALE_PRIVATE_ALLOCATION_LEDGER_HOLD_V1_PROOF_BEGIN"

python3 - <<'PY'
from pathlib import Path
import json
import re

src = Path("src/index.ts").read_text()
doc = Path("docs/private/usdc-to-void-presale-private-allocation-ledger-hold-v1.md").read_text()
fixture_path = Path("fixtures/private/usdc-to-void-presale-private-allocation-ledger-hold-v1.json")
fixture = json.loads(fixture_path.read_text())

marker = "VOID_USDC_TO_VOID_PRESALE_PRIVATE_ALLOCATION_LEDGER_HOLD_V1"
route = "/public-node/usdc-void-buy-pool/private-allocation-ledger-hold-v1.json"

required_src = [
    marker,
    route,
    "private_allocation_ledger_hold_defined_authority_false",
    'activation_gate: "private_allocation_ledger_hold"',
    "private_allocation_ledger_hold_defined: true",
    "private_allocation_ledger_hold_green: false",
    "private_allocation_ledger_created: false",
    "private_allocation_ledger_write_enabled: false",
    "private_allocation_ledger_append_only_enforced: false",
    "private_allocation_ledger_hash_chain_enforced: false",
    "public_route_discloses_private_ledger_contents: false",
    "public_route_shape_only: true",
    "usdc_to_void_presale_allocation_reservations_v1",
    "private_operator_only",
    "allocation-reservations.jsonl",
    "current_operator_events_are_not_allocation_reservation_ledger: true",
    "current_payment_verified_event_is_not_allocation_reserved: true",
    "allocation_reservation_record_write_enabled: false",
    "append_only_allocation_reservation_record_enforced: false",
    "allocation reservation record shape exists but the private operator-only append-only allocation ledger remains held and write-disabled",
    "verified_usdc_payment_detection_gate_green",
    "duplicate_payment_guard_green",
    "inventory_allocation_guard_green",
    "allocation_reservation_record_green",
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
    "first_line_uses_genesis_previous_hash",
    "each_later_line_references_previous_line_hash",
    "line_hash_covers_canonical_json_before_hash_insertion",
    "fail_closed_on_malformed_json",
    "fail_closed_on_missing_previous_hash",
    "fail_closed_on_wrong_previous_hash",
    "fail_closed_on_duplicate_record_hash",
    "fail_closed_on_duplicate_request_id",
    "fail_closed_on_duplicate_canonical_payment_identity",
    "verified_payment_gate_not_green",
    "duplicate_payment_guard_not_green",
    "inventory_allocation_guard_not_green",
    "allocation_reservation_record_gate_not_green",
    "private_ledger_hold_not_green",
    "canonical_payment_identity_missing",
    "request_id_missing",
    "buyer_delivery_wallet_missing",
    "quoted_void_amount_non_positive",
    "remaining_inventory_before_lt_quoted_void",
    "reserved_total_after_gt_pool_total",
    "remaining_inventory_after_negative",
    "previous_allocation_record_hash_missing_or_wrong",
    "operator_activation_record_missing",
    "public_mutation_write_attempt",
    "buyer_write_attempt",
    "ai_advisory_write_attempt",
    "automatic_fulfillment_enabled: false",
    "wallet_fulfillment_enabled: false",
    "signer_access_enabled: false",
    "treasury_transfer_authority_enabled: false",
    "buyer_execution_authorized: false",
    "public_mutation_enabled: false",
    "wc_ledger_write: false",
    "void_transfer_now: false",
    "operator-events.jsonl",
    "requests.jsonl",
    "allocation_reserved_void",
]
for item in required_src:
    if item not in src:
        raise SystemExit(f"missing_source_item={item}")

bad_src = [
    "private_allocation_ledger_hold_green: true",
    "private_allocation_ledger_created: true",
    "private_allocation_ledger_write_enabled: true",
    "private_allocation_ledger_append_only_enforced: true",
    "private_allocation_ledger_hash_chain_enforced: true",
    "public_route_discloses_private_ledger_contents: true",
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
    "private/operator-only allocation reservation ledger hold",
    "does not enable ledger writes",
    "operator-controlled append-only JSONL ledger",
    "must not expose private buyer delivery wallets",
    "`ledger_write_enabled`: false",
    "`append_only_enforced`: false",
    "`hash_chain_enforced`: false",
    "`private_ledger_created`: false",
    "`private_ledger_write_authorized`: false",
    "`allocation-reservations.jsonl`",
    "`previous_allocation_record_hash`",
    "`allocation_record_hash`",
    "the first line must use a genesis previous hash value",
    "every later line must reference the previous line hash",
    "fail closed on duplicate request ID",
    "fail closed on duplicate canonical payment identity",
    "verified payment gate is not green",
    "duplicate payment guard is not green",
    "inventory allocation guard is not green",
    "allocation reservation record gate is not green",
    "private ledger hold is not green",
    "public mutation attempts to write the ledger",
    "buyer attempts to write the ledger",
    "AI/advisory tooling attempts to write the ledger",
    "`private_allocation_ledger_hold_green`: false",
    "`private_allocation_ledger_write_enabled`: false",
    "`private_allocation_ledger_hash_chain_enforced`: false",
    "`void_transfer_now`: false",
]
for item in required_doc:
    if item not in doc:
        raise SystemExit(f"missing_doc_item={item}")

if fixture.get("marker") != marker:
    raise SystemExit("fixture_marker_bad")
if fixture.get("private_ledger_write_enabled") is not False:
    raise SystemExit("fixture_write_enabled_not_false")
if fixture.get("append_only_enforced") is not False:
    raise SystemExit("fixture_append_only_not_false")
if fixture.get("hash_chain_enforced") is not False:
    raise SystemExit("fixture_hash_chain_not_false")
if fixture.get("public_record_contents_exposed") is not False:
    raise SystemExit("fixture_public_exposure_not_false")
for item in [
    "record_type",
    "record_id",
    "request_id",
    "canonical_payment_identity",
    "previous_allocation_record_hash",
    "allocation_record_hash",
]:
    if item not in fixture.get("line_shape_required_fields", []):
        raise SystemExit(f"fixture_required_field_missing={item}")
for item in [
    "duplicate_request_id",
    "duplicate_canonical_payment_identity",
    "previous_allocation_record_hash_missing_or_wrong",
    "public_mutation_attempt",
    "buyer_write_attempt",
    "ai_advisory_write_attempt",
]:
    if item not in fixture.get("refusal_conditions", []):
        raise SystemExit(f"fixture_refusal_missing={item}")

route_index_pattern = re.compile(
    r'\{\s*path:\s*"/public-node/usdc-void-buy-pool/private-allocation-ledger-hold-v1\.json",\s*kind:\s*"json",\s*marker:\s*"VOID_USDC_TO_VOID_PRESALE_PRIVATE_ALLOCATION_LEDGER_HOLD_V1",\s*use:\s*"([^"]*)"\s*\}',
    re.DOTALL,
)
matches = list(route_index_pattern.finditer(src))
if len(matches) != 1:
    raise SystemExit(f"route_index_entry_count_bad={len(matches)}")
entry = matches[0].group(0)
for item in [
    route,
    marker,
    "private allocation ledger hold",
    "operator-only append-only ledger",
    "hash-chain rules",
    "duplicate request/payment refusal",
    "inventory refusal",
    "no public/private record exposure",
    "ledger writes remain disabled",
    "authority remains false",
]:
    if item not in entry:
        raise SystemExit(f"route_index_entry_missing={item}")

for item in [
    "VOID_USDC_TO_VOID_PRESALE_ALLOCATION_RESERVATION_RECORD_V1",
    "VOID_USDC_TO_VOID_PRESALE_INVENTORY_ALLOCATION_GUARD_V1",
    "VOID_USDC_TO_VOID_PRESALE_DUPLICATE_PAYMENT_GUARD_V1",
    "VOID_USDC_TO_VOID_PRESALE_VERIFIED_PAYMENT_DETECTION_GATE_V1",
    "allocation_reservation_record_green: false",
    "inventory_allocation_guard_green: false",
    "duplicate_payment_guard_green: false",
    "verified_usdc_payment_detection_gate_green: false",
]:
    if item not in src:
        raise SystemExit(f"upstream_gate_link_missing={item}")

print("private_allocation_ledger_hold_source_green=true")
print("private_ledger_write_enabled_false=true")
print("private_ledger_hash_chain_enforced_false=true")
print("public_private_record_exposure_false=true")
print("allocation_reservation_record_write_still_false=true")
print("automatic_fulfillment_still_false=true")
print("VOID_USDC_TO_VOID_PRESALE_PRIVATE_ALLOCATION_LEDGER_HOLD_V1_ASSERT_GREEN")
PY

echo "VOID_USDC_TO_VOID_PRESALE_PRIVATE_ALLOCATION_LEDGER_HOLD_V1_GREEN"
