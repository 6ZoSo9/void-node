#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_FULFILLMENT_TARGET_POLICY_V1_PROOF_BEGIN"

python3 - <<'PY'
from pathlib import Path
import re

src = Path("src/index.ts").read_text()
doc = Path("docs/public/public-node-usdc-void-buy-pool-automatic-fulfillment-target-policy-v1.md").read_text()

marker = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_FULFILLMENT_TARGET_POLICY_V1"
route = "/public-node/usdc-void-buy-pool/automatic-fulfillment-target-policy-v1.json"
closeout_route = "/public-node/usdc-void-buy-pool/closeout-status-v1.json"

if marker not in doc:
    raise SystemExit("doc_marker_missing")

if src.count(marker) < 3:
    raise SystemExit(f"source_marker_count_too_low={src.count(marker)}")

if route not in src:
    raise SystemExit("runtime_route_missing")

if closeout_route not in src:
    raise SystemExit("closeout_route_missing")

required_target_strings = [
    'normal_fulfillment_mode: "automatic_after_verified_usdc_payment"',
    "manual_approval_required_for_normal_fulfillment: false",
    'sold_out_behavior: "close_pool_when_inventory_remaining_reaches_zero"',
    "normal_buyer_fulfillment_requires_manual_approval: false",
    "manual_review_allowed_for_exceptions_only: true",
    "verified_usdc_payment_detection",
    "inventory_reservation",
    "duplicate_payment_guard",
    "idempotency_key",
    "sold_out_close_condition",
    "fulfillment_receipt",
    "explicit_operator_activation_record",
]

for required in required_target_strings:
    if required not in src:
        raise SystemExit(f"required_target_string_missing={required}")

required_false_flags = [
    "automatic_fulfillment_enabled: false",
    "wallet_fulfillment_enabled: false",
    "signer_access_enabled: false",
    "treasury_transfer_authority_enabled: false",
    "buyer_execution_authorized: false",
    "public_mutation_enabled: false",
    "wc_ledger_write: false",
    "void_transfer_now: false",
]

for flag in required_false_flags:
    if flag not in src:
        raise SystemExit(f"required_false_flag_missing={flag}")

for forbidden in [
    "automatic_fulfillment_enabled: true",
    "wallet_fulfillment_enabled: true",
    "signer_access_enabled: true",
    "treasury_transfer_authority_enabled: true",
    "buyer_execution_authorized: true",
    "public_mutation_enabled: true",
    "wc_ledger_write: true",
    "void_transfer_now: true",
    "manual_approval_required_for_normal_fulfillment: true",
    "normal_buyer_fulfillment_requires_manual_approval: true",
]:
    if forbidden in src:
        raise SystemExit(f"forbidden_true_or_manual_required_present={forbidden}")

route_index_pattern = re.compile(
    r'\{\s*path:\s*"/public-node/usdc-void-buy-pool/automatic-fulfillment-target-policy-v1\.json",\s*kind:\s*"json",\s*marker:\s*"VOID_USDC_VOID_BUY_POOL_AUTOMATIC_FULFILLMENT_TARGET_POLICY_V1",\s*use:\s*"([^"]*)"\s*\}',
    re.DOTALL,
)

matches = list(route_index_pattern.finditer(src))
if len(matches) != 1:
    raise SystemExit(f"route_index_entry_count_bad={len(matches)}")

entry = matches[0].group(0)
for required in [
    route,
    marker,
    "automatic USDC to VOID fulfillment",
    "sold-out closure",
    "policy only",
    "current runtime authority remains false",
]:
    if required not in entry:
        raise SystemExit(f"route_index_entry_required_text_missing={required}")

print("automatic_fulfillment_target_policy_source_green=true")
print("VOID_USDC_VOID_BUY_POOL_AUTOMATIC_FULFILLMENT_TARGET_POLICY_V1_ASSERT_GREEN")
PY

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_FULFILLMENT_TARGET_POLICY_V1_GREEN"
