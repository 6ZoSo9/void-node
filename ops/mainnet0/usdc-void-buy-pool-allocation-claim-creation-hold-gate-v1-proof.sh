#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_ALLOCATION_CLAIM_CREATION_HOLD_GATE_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/public/public-node-usdc-void-buy-pool-allocation-claim-creation-hold-gate-v1.md"
fixture="fixtures/public/usdc-void-buy-pool-allocation-claim-creation-hold-gate-v1.json"

need(){ grep -qF "$1" "$2" || { echo "missing=$1 file=$2"; exit 1; }; }
bad(){ if grep -qF "$1" "$2"; then echo "forbidden=$1 file=$2"; exit 1; fi; }

marker="VOID_USDC_VOID_BUY_POOL_ALLOCATION_CLAIM_CREATION_HOLD_GATE_V1"

need "$marker" "$doc"
need "This gate is a hold gate" "$doc"
need "does not create an allocation claim now" "$doc"
need "No claim is created now" "$doc"
need "no VOID transfer occurs" "$doc"

need "$marker" "$fixture"
need "\"allocation_claim_creation_hold_gate_green\": true" "$fixture"
need "\"claim_shape_policy_green\": true" "$fixture"
need "\"claim_creation_hold_policy_green\": true" "$fixture"
need "\"operator_review_policy_green\": true" "$fixture"
need "\"automatic_fulfillment_enabled_now\": false" "$fixture"
need "\"allocation_claim_created_now\": false" "$fixture"
need "\"private_allocation_ledger_write_now\": false" "$fixture"
need "\"inventory_reserved_now\": false" "$fixture"
need "\"void_transfer_now\": false" "$fixture"
need "\"claim_id\": \"deterministic_public_safe_id_from_chain_tx_log_buyer_receiver_token_rate\"" "$fixture"
need "\"buyer_binding_key\": \"opaque_public_safe_identifier\"" "$fixture"
need "\"receiving_void_address\": \"single_public_receiving_void_address\"" "$fixture"
need "\"allocation_claim_creation_hold\"" "$fixture"
need "\"blocked_payment_not_eligible\"" "$fixture"
need "\"blocked_duplicate_payment\"" "$fixture"
need "\"blocked_buyer_identity_missing_or_conflicting\"" "$fixture"
need "\"blocked_finality_not_met\"" "$fixture"
need "\"blocked_amount_rate_invalid\"" "$fixture"
need "\"blocked_inventory_not_reserved\"" "$fixture"
need "\"operator_review_required\"" "$fixture"
need "\"may_create_allocation_claim\": false" "$fixture"
need "\"may_write_private_allocation_ledger\": false" "$fixture"
need "\"may_reserve_inventory\": false" "$fixture"
need "\"may_automatic_fulfill\": false" "$fixture"
need "\"may_transfer_void\": false" "$fixture"
need "\"allocation_claim_creation_enabled\": false" "$fixture"
need "\"automatic_fulfillment_enabled\": false" "$fixture"
need "\"private_allocation_ledger_write_enabled\": false" "$fixture"

need "$marker" "$src"
need "/public-node/usdc-void-buy-pool/allocation-claim-creation-hold-gate-v1.json" "$src"
need "/public-node/usdc-void-buy-pool/allocation-claim-creation-hold-gate-v1" "$src"
need "allocation_claim_creation_hold_gate_green: true" "$src"
need "claim_shape_policy_green: true" "$src"
need "claim_creation_hold_policy_green: true" "$src"
need "automatic_fulfillment_enabled_now: false" "$src"
need "allocation_claim_created_now: false" "$src"
need "private_allocation_ledger_write_now: false" "$src"
need "inventory_reserved_now: false" "$src"
need "void_transfer_now: false" "$src"
need "allocation_claim_creation_hold" "$src"
need "blocked_payment_not_eligible" "$src"
need "blocked_duplicate_payment" "$src"
need "blocked_buyer_identity_missing_or_conflicting" "$src"
need "may_create_allocation_claim: false" "$src"
need "may_write_private_allocation_ledger: false" "$src"
need "may_reserve_inventory: false" "$src"
need "may_automatic_fulfill: false" "$src"
need "may_transfer_void: false" "$src"
need "allocation_claim_creation_enabled: false" "$src"
need "automatic_fulfillment_enabled: false" "$src"
need "private_allocation_ledger_write_enabled: false" "$src"

test "$(grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/allocation-claim-creation-hold-gate-v1.json",' "$src" | wc -l)" = "1"
test "$(grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/allocation-claim-creation-hold-gate-v1",' "$src" | wc -l)" = "1"

bad "    allocation_claim_created_now: true" "$src"
bad "    private_allocation_ledger_write_now: true" "$src"
bad "    inventory_reserved_now: true" "$src"
bad "    void_transfer_now: true" "$src"
bad "    allocation_claim_creation_enabled: true" "$src"
bad "    automatic_fulfillment_enabled: true" "$src"
bad "    private_allocation_ledger_write_enabled: true" "$src"
bad "\"allocation_claim_created_now\": true" "$fixture"
bad "\"private_allocation_ledger_write_now\": true" "$fixture"
bad "\"inventory_reserved_now\": true" "$fixture"
bad "\"void_transfer_now\": true" "$fixture"
bad "\"allocation_claim_creation_enabled\": true" "$fixture"
bad "\"automatic_fulfillment_enabled\": true" "$fixture"
bad "\"private_allocation_ledger_write_enabled\": true" "$fixture"

python3 - "$fixture" <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))

assert j["allocation_claim_creation_hold_gate_green"] is True
assert j["claim_shape_policy_green"] is True
assert j["claim_creation_hold_policy_green"] is True
assert j["automatic_fulfillment_enabled_now"] is False
assert j["allocation_claim_created_now"] is False
assert j["private_allocation_ledger_write_now"] is False
assert j["inventory_reserved_now"] is False
assert j["void_transfer_now"] is False

shape = j["allocation_claim_shape"]
for k in [
    "claim_id",
    "buyer_binding_key",
    "receiving_void_address",
    "chain_id",
    "tx_hash",
    "transfer_log_index",
    "token_address",
    "receiver_address",
    "usdc_amount_micro",
    "void_amount",
    "rate_policy_version",
    "eligibility_decision_state",
    "allocation_claim_state",
]:
    assert k in shape, k

states = set(j["claim_creation_states"])
for state in [
    "allocation_claim_creation_hold",
    "blocked_payment_not_eligible",
    "blocked_duplicate_payment",
    "blocked_buyer_identity_missing_or_conflicting",
    "blocked_finality_not_met",
    "blocked_amount_rate_invalid",
    "blocked_inventory_not_reserved",
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

print("allocation_claim_creation_hold_json_semantics_green=true")
PY

echo "allocation_claim_creation_hold_source_green=true"
echo "allocation_claim_creation_hold_fixture_green=true"
echo "allocation_claim_creation_hold_routes_green=true"
echo "allocation_claim_creation_hold_policy_green=true"
echo "allocation_claim_creation_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_ALLOCATION_CLAIM_CREATION_HOLD_GATE_V1_GREEN"
