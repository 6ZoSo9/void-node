#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_PAYMENT_ELIGIBILITY_DECISION_GATE_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/public/public-node-usdc-void-buy-pool-payment-eligibility-decision-gate-v1.md"
fixture="fixtures/public/usdc-void-buy-pool-payment-eligibility-decision-gate-v1.json"

need(){ grep -qF "$1" "$2" || { echo "missing=$1 file=$2"; exit 1; }; }
bad(){ if grep -qF "$1" "$2"; then echo "forbidden=$1 file=$2"; exit 1; fi; }

marker="VOID_USDC_VOID_BUY_POOL_PAYMENT_ELIGIBILITY_DECISION_GATE_V1"

need "$marker" "$doc"
need "Chain/token/receiver allowlist gate" "$doc"
need "Amount/rate policy gate" "$doc"
need "Duplicate payment guard gate" "$doc"
need "Buyer identity binding gate" "$doc"
need "Finality/confirmations gate" "$doc"
need "does not create an allocation claim" "$doc"
need "does not transfer VOID" "$doc"

need "$marker" "$fixture"
need "\"payment_eligibility_decision_gate_green\": true" "$fixture"
need "\"upstream_gate_inputs_green\": true" "$fixture"
need "\"eligibility_decision_policy_green\": true" "$fixture"
need "\"hold_reject_state_policy_green\": true" "$fixture"
need "\"operator_review_policy_green\": true" "$fixture"
need "\"automatic_fulfillment_enabled_now\": false" "$fixture"
need "\"real_payment_verified_now\": false" "$fixture"
need "\"allocation_claim_created_now\": false" "$fixture"
need "\"overall_automatic_activation_state\": \"still_blocked_other_gates_pending\"" "$fixture"
need "VOID_USDC_VOID_BUY_POOL_CHAIN_TOKEN_RECEIVER_ALLOWLIST_GATE_V1" "$fixture"
need "VOID_USDC_VOID_BUY_POOL_AMOUNT_RATE_POLICY_GATE_V1" "$fixture"
need "VOID_USDC_VOID_BUY_POOL_DUPLICATE_PAYMENT_GUARD_GATE_V1" "$fixture"
need "VOID_USDC_VOID_BUY_POOL_BUYER_IDENTITY_BINDING_GATE_V1" "$fixture"
need "VOID_USDC_VOID_BUY_POOL_FINALITY_CONFIRMATIONS_GATE_V1" "$fixture"
need "\"payment_eligibility_candidate_ready\"" "$fixture"
need "\"hold_chain_token_receiver_not_allowed\"" "$fixture"
need "\"hold_amount_rate_invalid\"" "$fixture"
need "\"hold_duplicate_payment_candidate\"" "$fixture"
need "\"hold_buyer_identity_missing_or_conflicting\"" "$fixture"
need "\"hold_finality_confirmations_not_met\"" "$fixture"
need "\"reject_failed_receipt\"" "$fixture"
need "\"reject_missing_transfer_log\"" "$fixture"
need "\"operator_review_required\"" "$fixture"
need "\"may_create_allocation_claim\": false" "$fixture"
need "\"may_write_private_allocation_ledger\": false" "$fixture"
need "\"may_reserve_inventory\": false" "$fixture"
need "\"may_automatic_fulfill\": false" "$fixture"
need "\"may_transfer_void\": false" "$fixture"
need "\"public_mutation_enabled\": false" "$fixture"
need "\"runtime_queue_enabled\": false" "$fixture"
need "\"live_fetch_now\": false" "$fixture"
need "\"finality_verified_now\": false" "$fixture"
need "\"external_state_root_trust_enabled\": false" "$fixture"
need "\"real_payment_verified_now\": false" "$fixture"
need "\"automatic_fulfillment_enabled\": false" "$fixture"
need "\"private_allocation_ledger_write_enabled\": false" "$fixture"
need "\"inventory_reserved_now\": false" "$fixture"
need "\"void_transfer_now\": false" "$fixture"

need "$marker" "$src"
need "/public-node/usdc-void-buy-pool/payment-eligibility-decision-gate-v1.json" "$src"
need "/public-node/usdc-void-buy-pool/payment-eligibility-decision-gate-v1" "$src"
need "payment_eligibility_decision_gate_green: true" "$src"
need "upstream_gate_inputs_green: true" "$src"
need "eligibility_decision_policy_green: true" "$src"
need "hold_reject_state_policy_green: true" "$src"
need "operator_review_policy_green: true" "$src"
need "automatic_fulfillment_enabled_now: false" "$src"
need "real_payment_verified_now: false" "$src"
need "allocation_claim_created_now: false" "$src"
need "overall_automatic_activation_state: \"still_blocked_other_gates_pending\"" "$src"
need "payment_eligibility_candidate_ready" "$src"
need "hold_duplicate_payment_candidate" "$src"
need "hold_buyer_identity_missing_or_conflicting" "$src"
need "hold_finality_confirmations_not_met" "$src"
need "reject_failed_receipt" "$src"
need "reject_missing_transfer_log" "$src"
need "may_create_allocation_claim: false" "$src"
need "may_write_private_allocation_ledger: false" "$src"
need "may_reserve_inventory: false" "$src"
need "may_automatic_fulfill: false" "$src"
need "may_transfer_void: false" "$src"
need "public_mutation_enabled: false" "$src"
need "runtime_queue_enabled: false" "$src"
need "live_fetch_now: false" "$src"
need "finality_verified_now: false" "$src"
need "external_state_root_trust_enabled: false" "$src"
need "real_payment_verified_now: false" "$src"
need "automatic_fulfillment_enabled: false" "$src"
need "private_allocation_ledger_write_enabled: false" "$src"
need "inventory_reserved_now: false" "$src"
need "void_transfer_now: false" "$src"

test "$(grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/payment-eligibility-decision-gate-v1.json",' "$src" | wc -l)" = "1"
test "$(grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/payment-eligibility-decision-gate-v1",' "$src" | wc -l)" = "1"

bad "      automatic_fulfillment_enabled_now: true" "$src"
bad "      real_payment_verified_now: true" "$src"
bad "      allocation_claim_created_now: true" "$src"
bad "      finality_verified_now: true" "$src"
bad "      live_fetch_now: true" "$src"
bad "      automatic_fulfillment_enabled: true" "$src"
bad "      private_allocation_ledger_write_enabled: true" "$src"
bad "      inventory_reserved_now: true" "$src"
bad "      void_transfer_now: true" "$src"
bad "\"automatic_fulfillment_enabled_now\": true" "$fixture"
bad "\"real_payment_verified_now\": true" "$fixture"
bad "\"allocation_claim_created_now\": true" "$fixture"
bad "\"finality_verified_now\": true" "$fixture"
bad "\"live_fetch_now\": true" "$fixture"
bad "\"automatic_fulfillment_enabled\": true" "$fixture"
bad "\"private_allocation_ledger_write_enabled\": true" "$fixture"
bad "\"inventory_reserved_now\": true" "$fixture"
bad "\"void_transfer_now\": true" "$fixture"

python3 - "$fixture" <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))

assert j["payment_eligibility_decision_gate_green"] is True
assert j["upstream_gate_inputs_green"] is True
assert j["eligibility_decision_policy_green"] is True
assert j["hold_reject_state_policy_green"] is True
assert j["operator_review_policy_green"] is True
assert j["automatic_fulfillment_enabled_now"] is False
assert j["real_payment_verified_now"] is False
assert j["allocation_claim_created_now"] is False

required_gates = set(j["required_upstream_gates"])
for gate in [
    "VOID_USDC_VOID_BUY_POOL_CHAIN_TOKEN_RECEIVER_ALLOWLIST_GATE_V1",
    "VOID_USDC_VOID_BUY_POOL_AMOUNT_RATE_POLICY_GATE_V1",
    "VOID_USDC_VOID_BUY_POOL_DUPLICATE_PAYMENT_GUARD_GATE_V1",
    "VOID_USDC_VOID_BUY_POOL_BUYER_IDENTITY_BINDING_GATE_V1",
    "VOID_USDC_VOID_BUY_POOL_FINALITY_CONFIRMATIONS_GATE_V1",
]:
    assert gate in required_gates, gate

states = set(j["decision_states"])
for state in [
    "payment_eligibility_candidate_ready",
    "hold_chain_token_receiver_not_allowed",
    "hold_amount_rate_invalid",
    "hold_duplicate_payment_candidate",
    "hold_buyer_identity_missing_or_conflicting",
    "hold_finality_confirmations_not_met",
    "reject_failed_receipt",
    "reject_missing_transfer_log",
    "operator_review_required",
]:
    assert state in states, state

for ex in j["policy_examples"]:
    assert ex["may_create_allocation_claim"] is False, ex
    for k in ["may_write_private_allocation_ledger", "may_reserve_inventory", "may_automatic_fulfill", "may_transfer_void"]:
        if k in ex:
            assert ex[k] is False, (k, ex)

for k, v in j["authority_flags"].items():
    assert v is False, (k, v)

print("payment_eligibility_decision_json_semantics_green=true")
PY

echo "payment_eligibility_decision_source_green=true"
echo "payment_eligibility_decision_fixture_green=true"
echo "payment_eligibility_decision_routes_green=true"
echo "payment_eligibility_decision_policy_green=true"
echo "payment_eligibility_decision_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_PAYMENT_ELIGIBILITY_DECISION_GATE_V1_GREEN"
