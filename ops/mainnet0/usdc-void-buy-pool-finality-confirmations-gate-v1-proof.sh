#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_FINALITY_CONFIRMATIONS_GATE_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/public/public-node-usdc-void-buy-pool-finality-confirmations-gate-v1.md"
fixture="fixtures/public/usdc-void-buy-pool-finality-confirmations-gate-v1.json"

need(){ grep -qF "$1" "$2" || { echo "missing=$1 file=$2"; exit 1; }; }
bad(){ if grep -qF "$1" "$2"; then echo "forbidden=$1 file=$2"; exit 1; fi; }

marker="VOID_USDC_VOID_BUY_POOL_FINALITY_CONFIRMATIONS_GATE_V1"

need "$marker" "$doc"
need "Ethereum mainnet requires at least 12 confirmations" "$doc"
need "Base mainnet requires at least 30 confirmations" "$doc"
need "Receipt status must be successful" "$doc"
need "does not fetch live chain data now" "$doc"
need "does not enable automatic fulfillment" "$doc"

need "$marker" "$fixture"
need "\"finality_confirmations_gate_green\": true" "$fixture"
need "\"chain_confirmation_thresholds_green\": true" "$fixture"
need "\"receipt_success_policy_green\": true" "$fixture"
need "\"transfer_log_persistence_policy_green\": true" "$fixture"
need "\"reorg_hold_policy_green\": true" "$fixture"
need "\"automatic_fulfillment_enabled_now\": false" "$fixture"
need "\"finality_verified_now\": false" "$fixture"
need "\"live_fetch_now\": false" "$fixture"
need "\"overall_automatic_activation_state\": \"still_blocked_other_gates_pending\"" "$fixture"
need "\"chain_id\": 1" "$fixture"
need "\"required_confirmations\": 12" "$fixture"
need "\"chain_id\": 8453" "$fixture"
need "\"required_confirmations\": 30" "$fixture"
need "\"receipt_status_failed_hold\"" "$fixture"
need "\"confirmations_below_threshold_hold\"" "$fixture"
need "\"transfer_log_missing_hold\"" "$fixture"
need "\"reorg_risk_hold\"" "$fixture"
need "\"operator_review_required\"" "$fixture"
need "\"may_create_allocation_claim\": false" "$fixture"
need "\"public_mutation_enabled\": false" "$fixture"
need "\"runtime_queue_enabled\": false" "$fixture"
need "\"external_state_root_trust_enabled\": false" "$fixture"
need "\"real_payment_verified_now\": false" "$fixture"
need "\"automatic_fulfillment_enabled\": false" "$fixture"
need "\"private_allocation_ledger_write_enabled\": false" "$fixture"
need "\"inventory_reserved_now\": false" "$fixture"
need "\"void_transfer_now\": false" "$fixture"

need "$marker" "$src"
need "/public-node/usdc-void-buy-pool/finality-confirmations-gate-v1.json" "$src"
need "/public-node/usdc-void-buy-pool/finality-confirmations-gate-v1" "$src"
need "finality_confirmations_gate_green: true" "$src"
need "chain_confirmation_thresholds_green: true" "$src"
need "receipt_success_policy_green: true" "$src"
need "transfer_log_persistence_policy_green: true" "$src"
need "reorg_hold_policy_green: true" "$src"
need "automatic_fulfillment_enabled_now: false" "$src"
need "finality_verified_now: false" "$src"
need "live_fetch_now: false" "$src"
need "overall_automatic_activation_state: \"still_blocked_other_gates_pending\"" "$src"
need "required_confirmations: 12" "$src"
need "required_confirmations: 30" "$src"
need "confirmations_below_threshold_hold" "$src"
need "receipt_status_failed_hold" "$src"
need "transfer_log_missing_hold" "$src"
need "reorg_risk_hold" "$src"
need "may_create_allocation_claim: false" "$src"
need "public_mutation_enabled: false" "$src"
need "runtime_queue_enabled: false" "$src"
need "external_state_root_trust_enabled: false" "$src"
need "real_payment_verified_now: false" "$src"
need "automatic_fulfillment_enabled: false" "$src"
need "private_allocation_ledger_write_enabled: false" "$src"
need "inventory_reserved_now: false" "$src"
need "void_transfer_now: false" "$src"

test "$(grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/finality-confirmations-gate-v1.json",' "$src" | wc -l)" = "1"
test "$(grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/finality-confirmations-gate-v1",' "$src" | wc -l)" = "1"

bad "automatic_fulfillment_enabled_now: true" "$src"
bad "      finality_verified_now: true" "$src"
bad "live_fetch_now: true" "$src"
bad "automatic_fulfillment_enabled: true" "$src"
bad "private_allocation_ledger_write_enabled: true" "$src"
bad "inventory_reserved_now: true" "$src"
bad "void_transfer_now: true" "$src"
bad "\"automatic_fulfillment_enabled_now\": true" "$fixture"
bad "\"finality_verified_now\": true" "$fixture"
bad "\"live_fetch_now\": true" "$fixture"
bad "\"automatic_fulfillment_enabled\": true" "$fixture"
bad "\"private_allocation_ledger_write_enabled\": true" "$fixture"
bad "\"inventory_reserved_now\": true" "$fixture"
bad "\"void_transfer_now\": true" "$fixture"

python3 - "$fixture" <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))

assert j["finality_confirmations_gate_green"] is True
assert j["chain_confirmation_thresholds_green"] is True
assert j["receipt_success_policy_green"] is True
assert j["transfer_log_persistence_policy_green"] is True
assert j["reorg_hold_policy_green"] is True
assert j["automatic_fulfillment_enabled_now"] is False
assert j["finality_verified_now"] is False
assert j["live_fetch_now"] is False

thresholds = {x["chain_id"]: x["required_confirmations"] for x in j["chain_finality_policy"]}
assert thresholds[1] == 12
assert thresholds[8453] == 30

states = set(j["finality_states"])
for required in [
    "finality_policy_candidate_ready",
    "confirmations_below_threshold_hold",
    "receipt_status_failed_hold",
    "receipt_missing_hold",
    "transfer_log_missing_hold",
    "chain_head_unknown_hold",
    "block_number_missing_hold",
    "reorg_risk_hold",
    "unsupported_chain_hold",
    "operator_review_required",
]:
    assert required in states, required

for ex in j["policy_examples"]:
    assert ex["may_create_allocation_claim"] is False, ex

for k, v in j["authority_flags"].items():
    assert v is False, (k, v)

print("finality_confirmations_json_semantics_green=true")
PY

echo "finality_confirmations_source_green=true"
echo "finality_confirmations_fixture_green=true"
echo "finality_confirmations_routes_green=true"
echo "finality_confirmations_policy_green=true"
echo "finality_confirmations_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_FINALITY_CONFIRMATIONS_GATE_V1_GREEN"
