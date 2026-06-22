#!/usr/bin/env python3
import json
from pathlib import Path
fixture_path = Path("fixtures/public/usdc-external-payment-proof-pack-example-v1.json")
data = json.loads(fixture_path.read_text())
required_root = ["marker", "status", "parent_marker", "example_fixture_only", "live_chain_data", "real_payment", "proof_verified_now", "finality_verified_now", "external_state_root_trust_enabled", "automatic_fulfillment_enabled", "private_allocation_ledger_write_enabled", "inventory_reserved_now", "void_transfer_now", "proof_pack"]
required_pack = ["proof_pack_version", "source_chain", "source_chain_id", "source_network_family", "block_number", "block_hash", "block_timestamp", "transaction_hash", "transaction_index", "receipt_index", "receipt_status", "log_index", "token_contract", "token_decimals", "from_address", "to_address", "official_receiver_ref", "amount_raw", "amount_decimal", "canonical_payment_identity", "payment_event_type", "receipt_root_ref", "state_root_ref", "proof_material_ref", "finality_mode", "trust_mode", "allocation_rule_ref", "duplicate_guard_ref", "inventory_guard_ref"]
for key in required_root:
 assert key in data, f"missing_root_field={key}"
pack = data["proof_pack"]
for key in required_pack:
 assert key in pack, f"missing_proof_pack_field={key}"
assert data["marker"] == "VOID_USDC_EXTERNAL_PAYMENT_PROOF_PACK_EXAMPLE_V1"
assert data["parent_marker"] == "VOID_USDC_EXTERNAL_PAYMENT_PROOF_PACK_V1"
assert data["example_fixture_only"] is True
for key in ["live_chain_data", "real_payment", "proof_verified_now", "finality_verified_now", "external_state_root_trust_enabled", "automatic_fulfillment_enabled", "private_allocation_ledger_write_enabled", "inventory_reserved_now", "void_transfer_now"]:
 assert data[key] is False, f"authority_must_remain_false={key}"
expected_identity = ":".join([str(pack["source_chain_id"]), str(pack["transaction_hash"]), str(pack["log_index"]), str(pack["token_contract"]), str(pack["to_address"]), str(pack["amount_raw"])])
assert pack["canonical_payment_identity"] == expected_identity, "canonical_payment_identity_mismatch"
assert "not_live" in str(pack["source_chain_id"])
assert "not_live" in str(pack["transaction_hash"])
assert "not_live" in str(pack["to_address"])
print("VOID_USDC_EXTERNAL_PAYMENT_PROOF_PACK_STATIC_VERIFIER_V1_BEGIN")
print("fixture_path=fixtures/public/usdc-external-payment-proof-pack-example-v1.json")
print("required_root_fields_green=true")
print("required_proof_pack_fields_green=true")
print("authority_false_green=true")
print("canonical_payment_identity_green=true")
print("no_live_chain_no_real_payment_green=true")
print("VOID_USDC_EXTERNAL_PAYMENT_PROOF_PACK_STATIC_VERIFIER_V1_GREEN")
