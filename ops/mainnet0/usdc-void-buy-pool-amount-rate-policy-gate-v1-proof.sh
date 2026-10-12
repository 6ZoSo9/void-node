#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_AMOUNT_RATE_POLICY_GATE_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/public/public-node-usdc-void-buy-pool-amount-rate-policy-gate-v1.md"
fixture="fixtures/public/usdc-void-buy-pool-amount-rate-policy-gate-v1.json"

need(){ grep -qF "$1" "$2" || { echo "missing=$1 file=$2"; exit 1; }; }
bad(){ if grep -qF "$1" "$2"; then echo "forbidden=$1 file=$2"; exit 1; fi; }

marker="VOID_USDC_VOID_BUY_POOL_AMOUNT_RATE_POLICY_GATE_V1"

need "$marker" "$doc"
need "Fixed price: 0.50 USDC per 1 VOID" "$doc"
need "Quote rate: 1 USDC quotes 2 VOID" "$doc"
need "Micro-USDC per VOID: 500000" "$doc"
need "Target micro-USDC if full pool drains: 5000000000000" "$doc"
need "does not enable automatic fulfillment" "$doc"

need "$marker" "$fixture"
need "\"amount_rate_policy_gate_green\": true" "$fixture"
need "\"usdc_decimals_green\": true" "$fixture"
need "\"fixed_rate_policy_green\": true" "$fixture"
need "\"quote_math_green\": true" "$fixture"
need "\"pool_capacity_math_green\": true" "$fixture"
need "\"automatic_fulfillment_enabled_now\": false" "$fixture"
need "\"overall_automatic_activation_state\": \"still_blocked_other_gates_pending\"" "$fixture"
need "\"decimals\": 6" "$fixture"
need "\"usdc_per_void\": \"0.50\"" "$fixture"
need "\"micro_usdc_per_void\": 500000" "$fixture"
need "\"void_per_usdc\": \"2.000000\"" "$fixture"
need "\"public_pool_void_allocation\": 10000000" "$fixture"
need "\"target_usdc_if_full_pool_drains\": 5000000" "$fixture"
need "\"target_micro_usdc_if_full_pool_drains\": 5000000000000" "$fixture"
need "\"public_mutation_enabled\": false" "$fixture"
need "\"runtime_queue_enabled\": false" "$fixture"
need "\"live_fetch_now\": false" "$fixture"
need "\"finality_verified_now\": false" "$fixture"
need "\"real_payment_verified_now\": false" "$fixture"
need "\"automatic_fulfillment_enabled\": false" "$fixture"
need "\"private_allocation_ledger_write_enabled\": false" "$fixture"
need "\"inventory_reserved_now\": false" "$fixture"
need "\"void_transfer_now\": false" "$fixture"

need "$marker" "$src"
need "/public-node/usdc-void-buy-pool/amount-rate-policy-gate-v1.json" "$src"
need "/public-node/usdc-void-buy-pool/amount-rate-policy-gate-v1" "$src"
need "amount_rate_policy_gate_green: true" "$src"
need "usdc_decimals_green: true" "$src"
need "fixed_rate_policy_green: true" "$src"
need "quote_math_green: true" "$src"
need "pool_capacity_math_green: true" "$src"
need "automatic_fulfillment_enabled_now: false" "$src"
need "overall_automatic_activation_state: \"still_blocked_other_gates_pending\"" "$src"
need "micro_usdc_per_void: 500000" "$src"
need "public_pool_void_allocation: 10000000" "$src"
need "target_micro_usdc_if_full_pool_drains: 5000000000000" "$src"
need "public_mutation_enabled: false" "$src"
need "runtime_queue_enabled: false" "$src"
need "live_fetch_now: false" "$src"
need "finality_verified_now: false" "$src"
need "real_payment_verified_now: false" "$src"
need "automatic_fulfillment_enabled: false" "$src"
need "private_allocation_ledger_write_enabled: false" "$src"
need "inventory_reserved_now: false" "$src"
need "void_transfer_now: false" "$src"

test "$(grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/amount-rate-policy-gate-v1.json",' "$src" | wc -l)" = "1"
test "$(grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/amount-rate-policy-gate-v1",' "$src" | wc -l)" = "1"

bad "automatic_fulfillment_enabled_now: true" "$src"
bad "automatic_fulfillment_enabled: true" "$src"
bad "private_allocation_ledger_write_enabled: true" "$src"
bad "inventory_reserved_now: true" "$src"
bad "void_transfer_now: true" "$src"
bad "\"automatic_fulfillment_enabled_now\": true" "$fixture"
bad "\"automatic_fulfillment_enabled\": true" "$fixture"
bad "\"private_allocation_ledger_write_enabled\": true" "$fixture"
bad "\"inventory_reserved_now\": true" "$fixture"
bad "\"void_transfer_now\": true" "$fixture"

python3 - "$fixture" <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))

assert j["amount_rate_policy_gate_green"] is True
assert j["usdc_decimals_green"] is True
assert j["fixed_rate_policy_green"] is True
assert j["quote_math_green"] is True
assert j["pool_capacity_math_green"] is True
assert j["automatic_fulfillment_enabled_now"] is False

assert j["accepted_payment_asset"]["symbol"] == "USDC"
assert j["accepted_payment_asset"]["decimals"] == 6
assert j["rate_policy"]["usdc_per_void"] == "0.50"
assert j["rate_policy"]["micro_usdc_per_void"] == 500000
assert j["rate_policy"]["void_per_usdc"] == "2.000000"

pool_void = j["pool_capacity_policy"]["public_pool_void_allocation"]
micro_per_void = j["rate_policy"]["micro_usdc_per_void"]
target_micro = j["pool_capacity_policy"]["target_micro_usdc_if_full_pool_drains"]

assert pool_void == 10000000
assert micro_per_void == 500000
assert target_micro == 5000000000000
assert pool_void * micro_per_void == target_micro

examples = {e["input_micro_usdc"]: e["quoted_void"] for e in j["quote_examples"]}
assert examples[1000000] == "2.000000"
assert examples[100000000] == "200.000000"
assert examples[5000000000000] == "10000000.000000"

for k, v in j["authority_flags"].items():
    assert v is False, (k, v)

print("amount_rate_policy_json_semantics_green=true")
PY

echo "amount_rate_policy_source_green=true"
echo "amount_rate_policy_fixture_green=true"
echo "amount_rate_policy_routes_green=true"
echo "amount_rate_policy_math_green=true"
echo "amount_rate_policy_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_AMOUNT_RATE_POLICY_GATE_V1_GREEN"
