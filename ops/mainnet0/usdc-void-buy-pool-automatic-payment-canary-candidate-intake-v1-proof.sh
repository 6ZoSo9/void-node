#!/usr/bin/env bash
set -euo pipefail

name="usdc-void-buy-pool-automatic-payment-canary-candidate-intake-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_CANDIDATE_INTAKE_V1"

doc="docs/public/$name.md"
fixture="fixtures/public/$name.json"
runtime_config_fixture="fixtures/public/usdc-void-buy-pool-automatic-payment-canary-runtime-config-v1.json"
src="src/index.ts"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
test -f "$runtime_config_fixture"
test -f "$src"
echo "automatic_payment_canary_candidate_intake_files_exist=true"

grep -F "$marker" "$doc" >/dev/null
grep -F "$marker" "$fixture" >/dev/null
grep -F "$marker" "$src" >/dev/null
echo "automatic_payment_canary_candidate_intake_marker_green=true"

grep -F '/public-node/usdc-void-buy-pool/automatic-payment-canary/candidate-intake-v1' "$src" >/dev/null
grep -F '/public-node/usdc-void-buy-pool/automatic-payment-canary/candidate-intake-v1.json' "$src" >/dev/null
echo "automatic_payment_canary_candidate_intake_routes_wired=true"

python3 - <<'PY'
import json
from pathlib import Path

d = json.loads(Path("fixtures/public/usdc-void-buy-pool-automatic-payment-canary-candidate-intake-v1.json").read_text())
cfg = json.loads(Path("fixtures/public/usdc-void-buy-pool-automatic-payment-canary-runtime-config-v1.json").read_text())

assert d["marker"] == "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_CANDIDATE_INTAKE_V1"
assert d["schema"] == "usdc_void_buy_pool_automatic_payment_canary_candidate_intake_v1"
assert d["visibility"] == "public_safe_runtime_status"
assert d["status"] == "automatic_payment_canary_candidate_intake_ready"

assert cfg["marker"] == "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_RUNTIME_CONFIG_V1"
assert cfg["canary_runtime_config"]["automatic_payment_canary_enabled"] is True
assert cfg["canary_runtime_config"]["canary_payment_limit"] == 1

ci = d["candidate_intake"]
assert ci["candidate_intake_enabled"] is True
assert ci["candidate_source"] == "verified_native_usdc_receipt_transfer_log_only"
assert ci["canary_candidate_limit"] == 1
assert ci["canary_max_usdc"] == "100.00"
assert ci["native_usdc_only"] is True
assert 1 in ci["accepted_chain_ids"]
assert 8453 in ci["accepted_chain_ids"]
assert ci["canonical_payment_identity"] == "chain_id:transaction_hash:transfer_log_index"
for field in ["chain_id", "transaction_hash", "transfer_log_index", "usdc_contract", "from", "to", "amount_raw", "confirmations", "buyer_key", "void_receive_address"]:
    assert field in ci["required_input_fields"], field
assert ci["candidate_output_kind"] == "automatic_payment_canary_candidate"
assert ci["candidate_object_creation_enabled"] is True
assert ci["candidate_persistence_enabled"] is False
assert ci["process_one_candidate_then_stop"] is True
assert ci["operator_review_required_after_candidate"] is True

for k, v in d["required_green_gates"].items():
    assert v is True, k

auth = d["authority"]
assert auth["automatic_payment_candidate_intake_enabled"] is True
assert auth["automatic_payment_observation_enabled"] is True
assert auth["automatic_payment_eligibility_enabled"] is True
assert auth["automatic_candidate_object_creation_enabled"] is True
assert auth["automatic_inventory_reserve_candidate_enabled"] is True
assert auth["automatic_private_allocation_ledger_candidate_enabled"] is True
assert auth["automatic_fulfillment_candidate_enabled"] is True

assert auth["automatic_private_allocation_ledger_write_enabled"] is False
assert auth["inventory_reserved_now"] is False
assert auth["fulfillment_executed_now"] is False
assert auth["automatic_void_transfer_enabled"] is False
assert auth["automatic_wallet_signing_enabled"] is False
assert auth["public_mutation_authorized"] is False
assert auth["public_buyer_execution_authorized"] is False
assert auth["private_key_material_exposed"] is False
assert auth["wallet_or_treasury_secret_exposed"] is False

print("automatic_payment_canary_candidate_intake_json_semantics_green=true")
PY

grep -RIn 'docs/private/\|fixtures/private/\|PRIVATE_KEY\|SECRET\|MNEMONIC\|SEED\|0x[a-fA-F0-9]\{64\}' "$doc" "$fixture" && {
  echo "automatic_payment_canary_candidate_intake_public_leak_found=true"
  exit 1
} || echo "automatic_payment_canary_candidate_intake_public_leak_absent=true"

echo "${marker}_GREEN"
