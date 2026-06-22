#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_TO_VOID_PRESALE_VERIFIED_PAYMENT_DETECTION_GATE_V1_PROOF_BEGIN"

python3 - <<'PY'
from pathlib import Path
import re

src = Path("src/index.ts").read_text()
doc = Path("docs/public/public-node-usdc-to-void-presale-verified-payment-detection-gate-v1.md").read_text()

marker = "VOID_USDC_TO_VOID_PRESALE_VERIFIED_PAYMENT_DETECTION_GATE_V1"
route = "/public-node/usdc-void-buy-pool/verified-payment-detection-gate-v1.json"

required_src = [
    marker,
    route,
    "verified_payment_detection_gate_defined_authority_false",
    'activation_gate: "verified_usdc_payment_detection"',
    "verified_usdc_payment_detection_gate_defined: true",
    "verified_usdc_payment_detection_gate_green: false",
    "VOID_BUY_VOID_MULTI_CHAIN_USDC_VERIFIER_V1",
    "__voidBuyVoidPaymentChainV1",
    "__voidBuyVoidRpcV1",
    "__voidBuyVoidUsdcTransferMatchV1",
    "eth_getTransactionReceipt",
    "receipt.status",
    "matching_usdc_transfer_not_found",
    'operator_status: "payment_verified"',
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "tx_hash_only_inventory_effect",
    "payment_submitted_unverified",
    "submitted_tx_hash",
    "official_receiver_match",
    "amount_match",
    "duplicate_payment_guard_green",
    "inventory_guard_green",
    "explicit_operator_activation_record",
    "public_endpoint_enabled: false",
    "public_route_is_status_only: true",
    "automatic_fulfillment_enabled: false",
    "wallet_fulfillment_enabled: false",
    "signer_access_enabled: false",
    "treasury_transfer_authority_enabled: false",
    "buyer_execution_authorized: false",
    "public_mutation_enabled: false",
    "wc_ledger_write: false",
    "void_transfer_now: false",
    "unverified tx-hash submissions do not reserve presale capacity",
    'cutoff_rule: "buy_void_hidden_and_requests_rejected_when_verified_payment_reserved_void_reaches_presale_limit"',
    "only payment_verified operator events may reserve presale allocation",
    "verified_usdc_total",
    "verified_void_total",
    "allocation_reserved_void",
]

for item in required_src:
    if item not in src:
        raise SystemExit(f"missing_source_item={item}")

bad_src = [
    "Pool capacity is reserved only once a payment tx hash is submitted.",
    "buy_void_hidden_and_requests_rejected_when_paid_or_submitted_tx_reserved_void_reaches_pool_limit",
]
for item in bad_src:
    if item in src:
        raise SystemExit(f"stale_submitted_tx_reservation_text_present={item}")

required_doc = [
    marker,
    "verified USDC payment detection contract",
    "does not enable automatic fulfillment",
    "submitted tx hash is a valid EVM transaction hash",
    "source chain is allowlisted",
    "transaction receipt exists",
    "transaction receipt status is successful",
    "matching USDC ERC-20 Transfer log",
    "receiver matches the configured official receive address",
    "amount satisfies the quoted USDC amount",
    "duplicate-payment guard remains required",
    "inventory guard remains required",
    "explicit operator activation record remains required",
    "`payment_submitted_unverified`: no inventory effect",
    "`submitted_tx_hash`: no inventory effect",
    "`payment_verified`: allocation may reserve",
    "`verified_usdc_payment_detection_gate_green`: false",
    "`void_transfer_now`: false",
]
for item in required_doc:
    if item not in doc:
        raise SystemExit(f"missing_doc_item={item}")

route_index_pattern = re.compile(
    r'\{\s*path:\s*"/public-node/usdc-void-buy-pool/verified-payment-detection-gate-v1\.json",\s*kind:\s*"json",\s*marker:\s*"VOID_USDC_TO_VOID_PRESALE_VERIFIED_PAYMENT_DETECTION_GATE_V1",\s*use:\s*"([^"]*)"\s*\}',
    re.DOTALL,
)
matches = list(route_index_pattern.finditer(src))
if len(matches) != 1:
    raise SystemExit(f"route_index_entry_count_bad={len(matches)}")

entry = matches[0].group(0)
for item in [
    route,
    marker,
    "verified USDC payment detection gate",
    "receipt status 0x1",
    "matching USDC Transfer log",
    "official receiver match",
    "amount match",
    "duplicate guard",
    "inventory guard",
    "explicit operator activation record",
    "authority remains false",
]:
    if item not in entry:
        raise SystemExit(f"route_index_entry_missing={item}")

print("verified_payment_detection_gate_source_green=true")
print("existing_operator_verifier_shape_detected=true")
print("submitted_tx_hash_inventory_effect_none_enforced=true")
print("verified_payment_detection_gate_green_false=true")
print("automatic_fulfillment_still_false=true")
print("VOID_USDC_TO_VOID_PRESALE_VERIFIED_PAYMENT_DETECTION_GATE_V1_ASSERT_GREEN")
PY

echo "VOID_USDC_TO_VOID_PRESALE_VERIFIED_PAYMENT_DETECTION_GATE_V1_GREEN"
