#!/usr/bin/env python3
import json
import sys
from pathlib import Path
fixture_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("fixtures/public/usdc-external-payment-proof-pack-transfer-log-parser-example-v1.json")
data = json.loads(fixture_path.read_text())
pack = data["proof_pack"]
TRANSFER_TOPIC0 = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
assert data["marker"] == "VOID_USDC_EXTERNAL_PAYMENT_PROOF_PACK_TRANSFER_LOG_PARSER_EXAMPLE_V1"
assert data["transfer_log_parser_example_only"] is True
assert pack["erc20_transfer_topic0"] == TRANSFER_TOPIC0, "erc20_transfer_topic0_mismatch"
assert pack["transfer_log_token_contract"] == pack["token_contract"], "transfer_log_token_contract_mismatch"
assert pack["transfer_log_from_address"] == pack["from_address"], "transfer_log_from_address_mismatch"
assert pack["transfer_log_to_address"] == pack["to_address"], "transfer_log_to_address_mismatch"
assert pack["transfer_log_amount_raw"] == pack["amount_raw"], "transfer_log_amount_raw_mismatch"
assert pack["transfer_log_receiver_matches_official_receiver"] is True, "receiver_match_false"
assert pack["transfer_log_amount_matches_payment_amount"] is True, "amount_match_false"
expected_identity = ":".join([str(pack["source_chain_id"]), str(pack["transaction_hash"]), str(pack["log_index"]), str(pack["token_contract"]), str(pack["to_address"]), str(pack["amount_raw"])])
assert pack["canonical_payment_identity"] == expected_identity, "canonical_payment_identity_mismatch"
for key in ["live_chain_data", "real_payment", "proof_verified_now", "finality_verified_now", "external_state_root_trust_enabled", "automatic_fulfillment_enabled", "private_allocation_ledger_write_enabled", "inventory_reserved_now", "void_transfer_now"]:
 assert data[key] is False, f"authority_must_remain_false={key}"
print("VOID_USDC_EXTERNAL_PAYMENT_PROOF_PACK_TRANSFER_LOG_PARSER_V1_BEGIN")
print(f"fixture_path={fixture_path}")
print("erc20_transfer_topic0_green=true")
print("transfer_log_token_contract_green=true")
print("transfer_log_receiver_green=true")
print("transfer_log_amount_green=true")
print("canonical_payment_identity_green=true")
print("transfer_log_parser_authority_false_green=true")
print("VOID_USDC_EXTERNAL_PAYMENT_PROOF_PACK_TRANSFER_LOG_PARSER_V1_GREEN")
