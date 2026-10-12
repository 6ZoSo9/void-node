#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_TO_VOID_PRESALE_PRIVATE_ALLOCATION_LEDGER_ACTIVATION_MATRIX_V1_PROOF_BEGIN"

python3 - <<'PY'
from pathlib import Path
import re

src = Path("src/index.ts").read_text()
doc = Path("docs/public/public-node-usdc-to-void-presale-private-allocation-ledger-activation-matrix-v1.md").read_text()

marker = "VOID_USDC_TO_VOID_PRESALE_PRIVATE_ALLOCATION_LEDGER_ACTIVATION_MATRIX_V1"
route = "/public-node/usdc-void-buy-pool/private-allocation-ledger-activation-matrix-v1.json"

required_src = [
    marker,
    route,
    "private_allocation_ledger_activation_matrix_defined_authority_false",
    'activation_gate: "private_allocation_ledger_activation_matrix"',
    "private_allocation_ledger_activation_matrix_defined: true",
    "private_allocation_ledger_activation_matrix_green: false",
    "private_allocation_ledger_activation_authorized: false",
    "private_allocation_ledger_created: false",
    "private_allocation_ledger_write_enabled: false",
    "private_allocation_ledger_append_only_enforced: false",
    "private_allocation_ledger_hash_chain_enforced: false",
    "allocation_reservation_record_write_enabled: false",
    "append_only_allocation_reservation_record_enforced: false",
    "public_route_shape_only: true",
    "public_route_discloses_private_ledger_contents: false",
    "define exact green gates required before the private allocation ledger can ever be created or written",
    "verified_usdc_payment_detection_gate_green: false",
    "duplicate_payment_guard_green: false",
    "inventory_allocation_guard_green: false",
    "allocation_reservation_record_green: false",
    "private_allocation_ledger_hold_green: false",
    "private_allocation_ledger_activation_matrix_green: false",
    "private_allocation_ledger_activation_authorized: false",
    "verified_usdc_payment_detection_gate_green",
    "duplicate_payment_guard_green",
    "inventory_allocation_guard_green",
    "allocation_reservation_record_green",
    "private_allocation_ledger_hold_green",
    "private_ledger_file_path_operator_selected",
    "private_ledger_path_no_leak_check_green",
    "append_only_writer_implementation_proof_green",
    "hash_chain_verifier_proof_green",
    "duplicate_request_id_recheck_green",
    "duplicate_canonical_payment_identity_recheck_green",
    "inventory_reservation_prewrite_recheck_green",
    "prewrite_backup_snapshot_green",
    "explicit_operator_activation_record_green",
    "public_mutation_boundary_green",
    "advisory_ai_no_write_boundary_green",
    "buyer_execution_refusal_green",
    "payment_verifier_definition_only_or_red",
    "duplicate_payment_guard_definition_only_or_red",
    "inventory_allocation_guard_definition_only_or_red",
    "allocation_reservation_record_gate_definition_only_or_red",
    "private_allocation_ledger_hold_not_green",
    "private_ledger_path_public_or_leaked",
    "append_only_writer_not_proven",
    "hash_chain_verifier_not_proven",
    "duplicate_request_or_payment_identity_recheck_missing",
    "inventory_prewrite_recheck_missing",
    "prewrite_backup_missing",
    "explicit_operator_activation_record_missing",
    "public_mutation_boundary_red",
    "advisory_ai_write_boundary_red",
    "buyer_execution_refusal_red",
    "activation_record_type",
    "activation_record_id",
    "operator_id",
    "activated_at_ms",
    "activated_commit",
    "activated_cross_box_tag",
    "verified_payment_gate_ref",
    "duplicate_payment_guard_ref",
    "inventory_allocation_guard_ref",
    "allocation_reservation_record_ref",
    "private_allocation_ledger_hold_ref",
    "private_ledger_path_ref",
    "path_no_leak_proof_ref",
    "append_only_writer_proof_ref",
    "hash_chain_verifier_proof_ref",
    "duplicate_recheck_proof_ref",
    "inventory_recheck_proof_ref",
    "prewrite_backup_ref",
    "public_mutation_boundary_ref",
    "advisory_ai_no_write_ref",
    "buyer_execution_refusal_ref",
    "activation_record_hash",
    "this route is a matrix only; it does not create the private ledger, enable writes, reserve inventory, or fulfill VOID",
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
    "private_allocation_ledger_activation_matrix_green: true",
    "private_allocation_ledger_activation_authorized: true",
    "private_allocation_ledger_created: true",
    "private_allocation_ledger_write_enabled: true",
    "private_allocation_ledger_append_only_enforced: true",
    "private_allocation_ledger_hash_chain_enforced: true",
    "allocation_reservation_record_write_enabled: true",
    "append_only_allocation_reservation_record_enforced: true",
    "public_route_discloses_private_ledger_contents: true",
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
    "public read-only activation matrix",
    "does not activate the ledger",
    "does not create a ledger file",
    "does not enable writes",
    "`private_allocation_ledger_activation_matrix_green`: false",
    "`private_allocation_ledger_activation_authorized`: false",
    "`private_allocation_ledger_created`: false",
    "`private_allocation_ledger_write_enabled`: false",
    "`private_allocation_ledger_append_only_enforced`: false",
    "`private_allocation_ledger_hash_chain_enforced`: false",
    "verified USDC payment detection gate green",
    "duplicate payment guard green",
    "inventory allocation guard green",
    "allocation reservation record gate green",
    "private allocation ledger hold green",
    "private ledger path no-leak check green",
    "append-only writer implementation proof green",
    "hash-chain verifier proof green",
    "duplicate request ID recheck green",
    "duplicate canonical payment identity recheck green",
    "inventory reservation prewrite recheck green",
    "prewrite backup/snapshot green",
    "explicit operator activation record green",
    "public mutation boundary green",
    "advisory AI no-write boundary green",
    "buyer execution refusal green",
    "private ledger path is public or leaked",
    "append-only writer is not proven",
    "hash-chain verifier is not proven",
    "`activation_record_hash`",
    route,
]
for item in required_doc:
    if item not in doc:
        raise SystemExit(f"missing_doc_item={item}")

route_index_pattern = re.compile(
    r'\{\s*path:\s*"/public-node/usdc-void-buy-pool/private-allocation-ledger-activation-matrix-v1\.json",\s*kind:\s*"json",\s*marker:\s*"VOID_USDC_TO_VOID_PRESALE_PRIVATE_ALLOCATION_LEDGER_ACTIVATION_MATRIX_V1",\s*use:\s*"([^"]*)"\s*\}',
    re.DOTALL,
)
matches = list(route_index_pattern.finditer(src))
if len(matches) != 1:
    raise SystemExit(f"route_index_entry_count_bad={len(matches)}")
entry = matches[0].group(0)
for item in [
    route,
    marker,
    "private allocation ledger activation matrix",
    "exact green gates",
    "ledger creation or writes",
    "verified payment",
    "duplicate guard",
    "inventory guard",
    "allocation record",
    "private ledger hold",
    "path no-leak",
    "append-only writer",
    "hash-chain verifier",
    "prewrite backup",
    "explicit operator activation",
    "public mutation boundary",
    "advisory AI no-write",
    "buyer execution refusal",
    "authority remains false",
]:
    if item not in entry:
        raise SystemExit(f"route_index_entry_missing={item}")

for item in [
    "VOID_USDC_TO_VOID_PRESALE_PRIVATE_ALLOCATION_LEDGER_HOLD_V1",
    "VOID_USDC_TO_VOID_PRESALE_ALLOCATION_RESERVATION_RECORD_V1",
    "VOID_USDC_TO_VOID_PRESALE_INVENTORY_ALLOCATION_GUARD_V1",
    "VOID_USDC_TO_VOID_PRESALE_DUPLICATE_PAYMENT_GUARD_V1",
    "VOID_USDC_TO_VOID_PRESALE_VERIFIED_PAYMENT_DETECTION_GATE_V1",
    "private_allocation_ledger_hold_green: false",
    "private_allocation_ledger_write_enabled: false",
    "allocation_reservation_record_green: false",
    "inventory_allocation_guard_green: false",
    "duplicate_payment_guard_green: false",
    "verified_usdc_payment_detection_gate_green: false",
]:
    if item not in src:
        raise SystemExit(f"upstream_gate_link_missing={item}")

print("private_allocation_ledger_activation_matrix_source_green=true")
print("activation_matrix_green_false=true")
print("activation_authorized_false=true")
print("ledger_creation_and_write_false=true")
print("required_green_gates_defined=true")
print("activation_blockers_defined=true")
print("automatic_fulfillment_still_false=true")
print("VOID_USDC_TO_VOID_PRESALE_PRIVATE_ALLOCATION_LEDGER_ACTIVATION_MATRIX_V1_ASSERT_GREEN")
PY

echo "VOID_USDC_TO_VOID_PRESALE_PRIVATE_ALLOCATION_LEDGER_ACTIVATION_MATRIX_V1_GREEN"
