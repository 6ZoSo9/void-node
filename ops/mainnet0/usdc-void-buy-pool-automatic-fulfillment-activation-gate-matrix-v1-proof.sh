#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_FULFILLMENT_ACTIVATION_GATE_MATRIX_V1_PROOF_BEGIN"

python3 - <<'PY'
from pathlib import Path
import re

src = Path("src/index.ts").read_text()
doc = Path("docs/public/public-node-usdc-void-buy-pool-automatic-fulfillment-activation-gate-matrix-v1.md").read_text()

marker = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_FULFILLMENT_ACTIVATION_GATE_MATRIX_V1"
route = "/public-node/usdc-void-buy-pool/automatic-fulfillment-activation-gate-matrix-v1.json"
target_route = "/public-node/usdc-void-buy-pool/automatic-fulfillment-target-policy-v1.json"

if marker not in doc:
    raise SystemExit("doc_marker_missing")

if src.count(marker) < 3:
    raise SystemExit(f"source_marker_count_too_low={src.count(marker)}")

for required in [
    route,
    target_route,
    'status: "activation_blocked_until_all_gates_green"',
    'required_state_before_enablement: "all_required_gates_green_and_explicit_operator_activation_record_created"',
    "activation_ready: false",
    "can_enable_automatic_fulfillment_now: false",
    "required_gate_count: 12",
    "green_gate_count: 0",
    "blocked_gate_count: 12",
    "sold_out_auto_close_enabled: false",
]:
    if required not in src:
        raise SystemExit(f"required_text_missing={required}")

gates = [
    "verified_usdc_payment_detection",
    "buyer_address_validation",
    "quote_expiry_and_price_lock",
    "inventory_reservation",
    "duplicate_payment_guard",
    "idempotency_key",
    "sold_out_close_condition",
    "isolated_signer_or_treasury_execution_boundary",
    "fulfillment_receipt",
    "failure_refund_or_manual_exception_state",
    "two_box_runtime_proof",
    "explicit_operator_activation_record",
]

for gate in gates:
    if gate not in src:
        raise SystemExit(f"gate_missing={gate}")

for false_flag in [
    "automatic_fulfillment_enabled: false",
    "wallet_fulfillment_enabled: false",
    "signer_access_enabled: false",
    "treasury_transfer_authority_enabled: false",
    "buyer_execution_authorized: false",
    "public_mutation_enabled: false",
    "wc_ledger_write: false",
    "void_transfer_now: false",
    "sold_out_auto_close_enabled: false",
]:
    if false_flag not in src:
        raise SystemExit(f"false_flag_missing={false_flag}")

for forbidden in [
    "automatic_fulfillment_enabled: true",
    "wallet_fulfillment_enabled: true",
    "signer_access_enabled: true",
    "treasury_transfer_authority_enabled: true",
    "buyer_execution_authorized: true",
    "public_mutation_enabled: true",
    "wc_ledger_write: true",
    "void_transfer_now: true",
    "sold_out_auto_close_enabled: true",
    "activation_ready: true",
    "can_enable_automatic_fulfillment_now: true",
]:
    if forbidden in src:
        raise SystemExit(f"forbidden_true_present={forbidden}")

route_index_pattern = re.compile(
    r'\{\s*path:\s*"/public-node/usdc-void-buy-pool/automatic-fulfillment-activation-gate-matrix-v1\.json",\s*kind:\s*"json",\s*marker:\s*"VOID_USDC_VOID_BUY_POOL_AUTOMATIC_FULFILLMENT_ACTIVATION_GATE_MATRIX_V1",\s*use:\s*"([^"]*)"\s*\}',
    re.DOTALL,
)
matches = list(route_index_pattern.finditer(src))
if len(matches) != 1:
    raise SystemExit(f"route_index_entry_count_bad={len(matches)}")

entry = matches[0].group(0)
for required in [
    route,
    marker,
    "hard blockers",
    "automatic USDC to VOID fulfillment",
    "activation remains false",
]:
    if required not in entry:
        raise SystemExit(f"route_index_entry_required_text_missing={required}")

print("activation_gate_matrix_source_green=true")
print("VOID_USDC_VOID_BUY_POOL_AUTOMATIC_FULFILLMENT_ACTIVATION_GATE_MATRIX_V1_ASSERT_GREEN")
PY

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_FULFILLMENT_ACTIVATION_GATE_MATRIX_V1_GREEN"
