#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_TO_VOID_PRESALE_DUPLICATE_PAYMENT_GUARD_V1_PROOF_BEGIN"

python3 - <<'PY'
from pathlib import Path
import re

src = Path("src/index.ts").read_text()
doc = Path("docs/public/public-node-usdc-to-void-presale-duplicate-payment-guard-v1.md").read_text()

marker = "VOID_USDC_TO_VOID_PRESALE_DUPLICATE_PAYMENT_GUARD_V1"
route = "/public-node/usdc-void-buy-pool/duplicate-payment-guard-v1.json"

required_src = [
    marker,
    route,
    "duplicate_payment_guard_defined_authority_false",
    'activation_gate: "duplicate_payment_guard"',
    "duplicate_payment_guard_defined: true",
    "duplicate_payment_guard_green: false",
    "current_verifier_duplicate_payment_guard_enforced: false",
    "current_request_id_dedupe_is_not_payment_dedupe: true",
    "source_chain:transaction_hash:log_index",
    "submitted_tx_hash",
    "receipt_transaction_hash",
    "usdc_contract",
    "transfer_log_index",
    "official_receiver_address",
    "verified_amount",
    "request_id",
    "block_automatic_fulfillment_until_receipt_log_identity_is_recorded",
    "one_canonical_payment_identity_may_satisfy_at_most_one_request",
    "reused_payment_identity_fails_closed",
    "request_id_alone_is_not_duplicate_payment_guard",
    "submitted_tx_hash_alone_is_not_verified_payment",
    "verified_payment_alone_does_not_enable_automatic_fulfillment",
    "duplicate_guard_green_required_before_allocation_reservation",
    "inventory_guard_green_required_before_allocation_reservation",
    "explicit_operator_activation_record_required_before_automatic_fulfillment",
    "payment_verified_without_duplicate_guard",
    "no_automatic_fulfillment_no_void_transfer",
    "payment_verified_with_duplicate_guard_green",
    "allocation_may_reserve_only_if_inventory_guard_green",
    "automatic_fulfillment_enabled: false",
    "wallet_fulfillment_enabled: false",
    "signer_access_enabled: false",
    "treasury_transfer_authority_enabled: false",
    "buyer_execution_authorized: false",
    "public_mutation_enabled: false",
    "wc_ledger_write: false",
    "void_transfer_now: false",
]

for item in required_src:
    if item not in src:
        raise SystemExit(f"missing_source_item={item}")

bad_src = [
    "duplicate_payment_guard_green: true",
    "current_verifier_duplicate_payment_guard_enforced: true",
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
    "duplicate-payment guard contract",
    "does not enable automatic fulfillment",
    "same USDC transaction or the same matching transfer log must not be allowed",
    "Current request accounting can count payment-verified events by `request_id`",
    "source chain",
    "transaction hash",
    "receipt transaction hash",
    "USDC token contract",
    "matching ERC-20 Transfer log index",
    "official receiver address",
    "verified amount",
    "request id",
    "`source_chain:transaction_hash:log_index`",
    "If log index is unavailable",
    "One canonical payment identity may satisfy at most one request",
    "Reusing the same canonical payment identity for a second request must fail closed",
    "A request id alone is not a duplicate-payment guard",
    "A submitted tx hash alone is not a verified payment",
    "Duplicate guard must be green before allocation reservation or automatic fulfillment",
    "`duplicate_payment_guard_green`: false",
    "`current_verifier_duplicate_payment_guard_enforced`: false",
    "`void_transfer_now`: false",
]
for item in required_doc:
    if item not in doc:
        raise SystemExit(f"missing_doc_item={item}")

route_index_pattern = re.compile(
    r'\{\s*path:\s*"/public-node/usdc-void-buy-pool/duplicate-payment-guard-v1\.json",\s*kind:\s*"json",\s*marker:\s*"VOID_USDC_TO_VOID_PRESALE_DUPLICATE_PAYMENT_GUARD_V1",\s*use:\s*"([^"]*)"\s*\}',
    re.DOTALL,
)
matches = list(route_index_pattern.finditer(src))
if len(matches) != 1:
    raise SystemExit(f"route_index_entry_count_bad={len(matches)}")

entry = matches[0].group(0)
for item in [
    route,
    marker,
    "duplicate payment guard",
    "source_chain:transaction_hash:log_index",
    "rejects reused USDC payment identity",
    "request_id alone is not payment dedupe",
    "authority remains false",
]:
    if item not in entry:
        raise SystemExit(f"route_index_entry_missing={item}")

# Require that the previous verified-payment gate still requires duplicate guard,
# but does not claim the duplicate guard is already green.
for item in [
    "duplicate_payment_guard_green",
    "inventory_guard_green",
    "explicit_operator_activation_record",
    "verified_usdc_payment_detection_gate_green: false",
]:
    if item not in src:
        raise SystemExit(f"verified_payment_gate_link_missing={item}")

print("duplicate_payment_guard_source_green=true")
print("request_id_dedupe_not_payment_dedupe_declared=true")
print("canonical_payment_identity_required=true")
print("duplicate_payment_guard_green_false=true")
print("current_verifier_duplicate_payment_guard_enforced_false=true")
print("automatic_fulfillment_still_false=true")
print("VOID_USDC_TO_VOID_PRESALE_DUPLICATE_PAYMENT_GUARD_V1_ASSERT_GREEN")
PY

echo "VOID_USDC_TO_VOID_PRESALE_DUPLICATE_PAYMENT_GUARD_V1_GREEN"
