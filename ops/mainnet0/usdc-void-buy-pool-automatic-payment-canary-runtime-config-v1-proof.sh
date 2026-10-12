#!/usr/bin/env bash
set -euo pipefail

name="usdc-void-buy-pool-automatic-payment-canary-runtime-config-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_RUNTIME_CONFIG_V1"

doc="docs/public/$name.md"
fixture="fixtures/public/$name.json"
private_fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-activation-canary-v1.json"
src="src/index.ts"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
test -f "$private_fixture"
test -f "$src"
echo "automatic_payment_canary_runtime_config_files_exist=true"

grep -F "$marker" "$doc" >/dev/null
grep -F "$marker" "$fixture" >/dev/null
grep -F "$marker" "$src" >/dev/null
echo "automatic_payment_canary_runtime_config_marker_green=true"

grep -F '/public-node/usdc-void-buy-pool/automatic-payment-canary/runtime-config-v1' "$src" >/dev/null
grep -F '/public-node/usdc-void-buy-pool/automatic-payment-canary/runtime-config-v1.json' "$src" >/dev/null
echo "automatic_payment_canary_runtime_config_routes_wired=true"

python3 - <<'PY'
import json
from pathlib import Path

pub = json.loads(Path("fixtures/public/usdc-void-buy-pool-automatic-payment-canary-runtime-config-v1.json").read_text())
priv = json.loads(Path("fixtures/private/usdc-void-buy-pool-automatic-payment-activation-canary-v1.json").read_text())

assert pub["marker"] == "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_RUNTIME_CONFIG_V1"
assert pub["schema"] == "usdc_void_buy_pool_automatic_payment_canary_runtime_config_v1"
assert pub["visibility"] == "public_safe_runtime_status"
assert pub["status"] == "automatic_payment_canary_runtime_config_ready"

assert priv["marker"] == "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANARY_V1"
assert priv["activation"]["automatic_payment_canary_enabled"] is True

cfg = pub["canary_runtime_config"]
pa = priv["activation"]
assert cfg["automatic_payment_canary_enabled"] is True
assert cfg["activation_mode"] == "canary"
assert cfg["canary_payment_limit"] == pa["canary_payment_limit"] == 1
assert cfg["canary_max_usdc"] == pa["canary_max_usdc"] == "100.00"
assert cfg["emergency_stop_supported"] is True
assert cfg["emergency_stop_active"] is False
assert cfg["operator_review_required_after_canary"] is True
assert cfg["process_one_candidate_then_stop"] is True

inputs = priv["allowed_payment_inputs"]
assert cfg["native_usdc_only"] is True
assert sorted(cfg["allowed_chains"]) == sorted(inputs["allowed_chains"])
assert cfg["allowlist_required"] is True
assert cfg["finality_confirmations_required"] is True
assert cfg["erc20_transfer_log_required"] is True

assert pub["source_activation"]["private_canary_paths_exposed"] is False

auth = pub["authority"]
assert auth["automatic_payment_observation_enabled"] is True
assert auth["automatic_payment_eligibility_enabled"] is True
assert auth["automatic_allocation_candidate_enabled"] is True
assert auth["automatic_inventory_reserve_candidate_enabled"] is True
assert auth["automatic_private_allocation_ledger_candidate_enabled"] is True
assert auth["automatic_fulfillment_candidate_enabled"] is True
assert auth["automatic_void_transfer_enabled"] is False
assert auth["automatic_wallet_signing_enabled"] is False
assert auth["public_mutation_authorized"] is False
assert auth["public_buyer_execution_authorized"] is False
assert auth["private_key_material_exposed"] is False
assert auth["wallet_or_treasury_secret_exposed"] is False

print("automatic_payment_canary_runtime_config_json_semantics_green=true")
PY

grep -RIn 'docs/private/\|fixtures/private/\|PRIVATE_KEY\|SECRET\|MNEMONIC\|SEED\|0x[a-fA-F0-9]\{64\}' "$doc" "$fixture" && {
  echo "automatic_payment_canary_runtime_config_public_leak_found=true"
  exit 1
} || echo "automatic_payment_canary_runtime_config_public_leak_absent=true"

echo "${marker}_GREEN"
