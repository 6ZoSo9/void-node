#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_PRIVATE_ALLOCATION_LEDGER_WRITE_HOLD_GATE_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/public/public-node-usdc-void-buy-pool-private-allocation-ledger-write-hold-gate-v1.md"
fixture="fixtures/public/usdc-void-buy-pool-private-allocation-ledger-write-hold-gate-v1.json"

need(){ grep -qF "$1" "$2" || { echo "missing=$1 file=$2"; exit 1; }; }
bad(){ if grep -qF "$1" "$2"; then echo "forbidden=$1 file=$2"; exit 1; fi; }

marker="VOID_USDC_VOID_BUY_POOL_PRIVATE_ALLOCATION_LEDGER_WRITE_HOLD_GATE_V1"

need "$marker" "$doc"
need "This is a hold gate" "$doc"
need "does not write the private allocation ledger now" "$doc"
need "No private ledger write occurs" "$doc"
need "no VOID transfer occurs" "$doc"

need "$marker" "$fixture"
need "\"private_allocation_ledger_write_hold_gate_green\": true" "$fixture"
need "\"ledger_write_shape_policy_green\": true" "$fixture"
need "\"append_only_ledger_policy_green\": true" "$fixture"
need "\"ledger_write_hold_policy_green\": true" "$fixture"
need "\"operator_review_policy_green\": true" "$fixture"
need "\"private_allocation_ledger_write_now\": false" "$fixture"
need "\"allocation_claim_created_now\": false" "$fixture"
need "\"inventory_reserved_now\": false" "$fixture"
need "\"automatic_fulfillment_enabled_now\": false" "$fixture"
need "\"void_transfer_now\": false" "$fixture"
need "\"ledger_entry_id\": \"deterministic_public_safe_id_from_claim_id_and_ledger_policy_version\"" "$fixture"
need "\"previous_ledger_entry_hash\": \"previous_append_only_hash_or_genesis\"" "$fixture"
need "\"entry_hash\": \"hash_of_canonical_private_ledger_entry\"" "$fixture"
need "\"private_allocation_ledger_write_hold\"" "$fixture"
need "\"blocked_claim_not_created\"" "$fixture"
need "\"blocked_claim_creation_hold\"" "$fixture"
need "\"blocked_duplicate_claim\"" "$fixture"
need "\"blocked_inventory_not_reserved\"" "$fixture"
need "\"blocked_operator_not_approved\"" "$fixture"
need "\"operator_review_required\"" "$fixture"
need "\"may_write_private_allocation_ledger\": false" "$fixture"
need "\"may_reserve_inventory\": false" "$fixture"
need "\"may_automatic_fulfill\": false" "$fixture"
need "\"may_transfer_void\": false" "$fixture"
need "\"private_allocation_ledger_write_enabled\": false" "$fixture"
need "\"automatic_fulfillment_enabled\": false" "$fixture"

need "$marker" "$src"
need "/public-node/usdc-void-buy-pool/private-allocation-ledger-write-hold-gate-v1.json" "$src"
need "/public-node/usdc-void-buy-pool/private-allocation-ledger-write-hold-gate-v1" "$src"
need "private_allocation_ledger_write_hold_gate_green: true" "$src"
need "ledger_write_shape_policy_green: true" "$src"
need "append_only_ledger_policy_green: true" "$src"
need "ledger_write_hold_policy_green: true" "$src"
need "private_allocation_ledger_write_now: false" "$src"
need "allocation_claim_created_now: false" "$src"
need "inventory_reserved_now: false" "$src"
need "automatic_fulfillment_enabled_now: false" "$src"
need "void_transfer_now: false" "$src"
need "private_allocation_ledger_write_hold" "$src"
need "blocked_claim_not_created" "$src"
need "blocked_operator_not_approved" "$src"
need "may_write_private_allocation_ledger: false" "$src"
need "may_reserve_inventory: false" "$src"
need "may_automatic_fulfill: false" "$src"
need "may_transfer_void: false" "$src"
need "private_allocation_ledger_write_enabled: false" "$src"
need "automatic_fulfillment_enabled: false" "$src"

test "$(grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/private-allocation-ledger-write-hold-gate-v1.json",' "$src" | wc -l)" = "1"
test "$(grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/private-allocation-ledger-write-hold-gate-v1",' "$src" | wc -l)" = "1"

bad "    private_allocation_ledger_write_now: true" "$src"
bad "    inventory_reserved_now: true" "$src"
bad "    automatic_fulfillment_enabled_now: true" "$src"
bad "    void_transfer_now: true" "$src"
bad "    private_allocation_ledger_write_enabled: true" "$src"
bad "    automatic_fulfillment_enabled: true" "$src"
bad "\"private_allocation_ledger_write_now\": true" "$fixture"
bad "\"inventory_reserved_now\": true" "$fixture"
bad "\"automatic_fulfillment_enabled_now\": true" "$fixture"
bad "\"void_transfer_now\": true" "$fixture"
bad "\"private_allocation_ledger_write_enabled\": true" "$fixture"
bad "\"automatic_fulfillment_enabled\": true" "$fixture"

python3 - "$fixture" <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))

assert j["private_allocation_ledger_write_hold_gate_green"] is True
assert j["ledger_write_shape_policy_green"] is True
assert j["append_only_ledger_policy_green"] is True
assert j["ledger_write_hold_policy_green"] is True
assert j["private_allocation_ledger_write_now"] is False
assert j["inventory_reserved_now"] is False
assert j["automatic_fulfillment_enabled_now"] is False
assert j["void_transfer_now"] is False

shape = j["ledger_write_shape"]
for k in [
    "ledger_entry_id",
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
    "ledger_policy_version",
    "previous_ledger_entry_hash",
    "entry_hash",
    "write_state",
]:
    assert k in shape, k

states = set(j["ledger_write_states"])
for state in [
    "private_allocation_ledger_write_hold",
    "blocked_claim_not_created",
    "blocked_claim_creation_hold",
    "blocked_duplicate_claim",
    "blocked_inventory_not_reserved",
    "blocked_operator_not_approved",
    "operator_review_required",
]:
    assert state in states, state

for ex in j["policy_examples"]:
    assert ex["may_write_private_allocation_ledger"] is False, ex
    for k in ["may_reserve_inventory", "may_automatic_fulfill", "may_transfer_void"]:
        if k in ex:
            assert ex[k] is False, (k, ex)

for k, v in j["authority_flags"].items():
    assert v is False, (k, v)

print("private_allocation_ledger_write_hold_json_semantics_green=true")
PY

echo "private_allocation_ledger_write_hold_source_green=true"
echo "private_allocation_ledger_write_hold_fixture_green=true"
echo "private_allocation_ledger_write_hold_routes_green=true"
echo "private_allocation_ledger_write_hold_policy_green=true"
echo "private_allocation_ledger_write_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_PRIVATE_ALLOCATION_LEDGER_WRITE_HOLD_GATE_V1_GREEN"
