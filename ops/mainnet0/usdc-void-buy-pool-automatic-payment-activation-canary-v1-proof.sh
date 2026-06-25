#!/usr/bin/env bash
set -euo pipefail

name="usdc-void-buy-pool-automatic-payment-activation-canary-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANARY_V1"
doc="docs/private/$name.md"
fixture="fixtures/private/$name.json"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
echo "automatic_payment_activation_canary_files_exist=true"

grep -F "$marker" "$doc" >/dev/null
grep -F "$marker" "$fixture" >/dev/null
echo "automatic_payment_activation_canary_marker_green=true"

python3 - <<'PY'
import json
from pathlib import Path

p = Path("fixtures/private/usdc-void-buy-pool-automatic-payment-activation-canary-v1.json")
d = json.loads(p.read_text())

assert d["marker"] == "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANARY_V1"
assert d["schema"] == "usdc_void_buy_pool_automatic_payment_activation_canary_v1"
assert d["visibility"] == "private_operator_only"
assert d["status"] == "automatic_payment_activation_canary_enabled"

a = d["activation"]
assert a["automatic_payment_canary_enabled"] is True
assert a["activation_mode"] == "canary"
assert a["canary_payment_limit"] == 1
assert a["canary_max_usdc"] == "100.00"
assert a["emergency_stop_supported"] is True
assert a["emergency_stop_active"] is False
assert a["operator_review_required_after_canary"] is True

inputs = d["allowed_payment_inputs"]
assert inputs["native_usdc_only"] is True
assert "ethereum" in inputs["allowed_chains"]
assert "base" in inputs["allowed_chains"]
assert inputs["allowlist_required"] is True
assert inputs["finality_confirmations_required"] is True
assert inputs["erc20_transfer_log_required"] is True

for k, v in d["required_green_gates"].items():
    assert v is True, k

auth = d["canary_authority"]
assert auth["automatic_payment_observation_enabled"] is True
assert auth["automatic_payment_eligibility_enabled"] is True
assert auth["automatic_allocation_candidate_enabled"] is True
assert auth["automatic_inventory_reserve_candidate_enabled"] is True
assert auth["automatic_private_allocation_ledger_candidate_enabled"] is True
assert auth["automatic_fulfillment_candidate_enabled"] is True

# Keep actual transfer/signing off for the first activation canary.
assert auth["automatic_void_transfer_enabled"] is False
assert auth["automatic_wallet_signing_enabled"] is False

# Public surface remains non-mutating.
assert auth["public_mutation_authorized"] is False
assert auth["public_buyer_execution_authorized"] is False
assert auth["private_key_material_exposed"] is False
assert auth["wallet_or_treasury_secret_exposed"] is False

r = d["first_canary_rule"]
assert r["process_one_candidate_then_stop"] is True
assert r["requires_operator_review_before_second_candidate"] is True
assert r["requires_operator_review_before_void_transfer"] is True

print("automatic_payment_activation_canary_json_semantics_green=true")
PY

grep -RIn 'PRIVATE_KEY\|SECRET\|MNEMONIC\|SEED\|0x[a-fA-F0-9]\{64\}' "$doc" "$fixture" && {
  echo "automatic_payment_activation_canary_secret_leak_found=true"
  exit 1
} || echo "automatic_payment_activation_canary_secret_leak_absent=true"

echo "${marker}_GREEN"
