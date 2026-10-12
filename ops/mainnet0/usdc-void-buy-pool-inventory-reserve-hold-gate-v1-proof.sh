#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_INVENTORY_RESERVE_HOLD_GATE_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/public/public-node-usdc-void-buy-pool-inventory-reserve-hold-gate-v1.md"
fixture="fixtures/public/usdc-void-buy-pool-inventory-reserve-hold-gate-v1.json"

need(){ grep -qF "$1" "$2" || { echo "missing=$1 file=$2"; exit 1; }; }
bad(){ if grep -qF "$1" "$2"; then echo "forbidden=$1 file=$2"; exit 1; fi; }

marker="VOID_USDC_VOID_BUY_POOL_INVENTORY_RESERVE_HOLD_GATE_V1"

need "$marker" "$doc"
need "This is a hold gate" "$doc"
need "does not reserve inventory now" "$doc"
need "No inventory is reserved now" "$doc"
need "no VOID transfer occurs" "$doc"

need "$marker" "$fixture"
need "\"inventory_reserve_hold_gate_green\": true" "$fixture"
need "\"inventory_reservation_shape_policy_green\": true" "$fixture"
need "\"capacity_check_policy_green\": true" "$fixture"
need "\"inventory_reserve_hold_policy_green\": true" "$fixture"
need "\"operator_review_policy_green\": true" "$fixture"
need "\"inventory_reserved_now\": false" "$fixture"
need "\"private_allocation_ledger_write_now\": false" "$fixture"
need "\"allocation_claim_created_now\": false" "$fixture"
need "\"automatic_fulfillment_enabled_now\": false" "$fixture"
need "\"void_transfer_now\": false" "$fixture"
need "\"inventory_reservation_id\": \"deterministic_public_safe_id_from_claim_pool_inventory_policy\"" "$fixture"
need "\"pool_id\": \"usdc_void_buy_pool_v1\"" "$fixture"
need "\"inventory_reserve_hold\"" "$fixture"
need "\"blocked_private_ledger_not_written\"" "$fixture"
need "\"blocked_claim_not_created\"" "$fixture"
need "\"blocked_capacity_insufficient\"" "$fixture"
need "\"blocked_duplicate_reservation\"" "$fixture"
need "\"blocked_operator_not_approved\"" "$fixture"
need "\"operator_review_required\"" "$fixture"
need "\"may_reserve_inventory\": false" "$fixture"
need "\"may_write_private_allocation_ledger\": false" "$fixture"
need "\"may_automatic_fulfill\": false" "$fixture"
need "\"may_transfer_void\": false" "$fixture"
need "\"inventory_reserve_enabled\": false" "$fixture"
need "\"automatic_fulfillment_enabled\": false" "$fixture"

need "$marker" "$src"
need "/public-node/usdc-void-buy-pool/inventory-reserve-hold-gate-v1.json" "$src"
need "/public-node/usdc-void-buy-pool/inventory-reserve-hold-gate-v1" "$src"
need "inventory_reserve_hold_gate_green: true" "$src"
need "inventory_reservation_shape_policy_green: true" "$src"
need "capacity_check_policy_green: true" "$src"
need "inventory_reserve_hold_policy_green: true" "$src"
need "inventory_reserved_now: false" "$src"
need "private_allocation_ledger_write_now: false" "$src"
need "automatic_fulfillment_enabled_now: false" "$src"
need "void_transfer_now: false" "$src"
need "inventory_reserve_hold" "$src"
need "blocked_capacity_insufficient" "$src"
need "blocked_operator_not_approved" "$src"
need "may_reserve_inventory: false" "$src"
need "may_write_private_allocation_ledger: false" "$src"
need "may_automatic_fulfill: false" "$src"
need "may_transfer_void: false" "$src"
need "inventory_reserve_enabled: false" "$src"
need "automatic_fulfillment_enabled: false" "$src"

test "$(grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/inventory-reserve-hold-gate-v1.json",' "$src" | wc -l)" = "1"
test "$(grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/inventory-reserve-hold-gate-v1",' "$src" | wc -l)" = "1"

bad "    inventory_reserved_now: true" "$src"
bad "    private_allocation_ledger_write_now: true" "$src"
bad "    automatic_fulfillment_enabled_now: true" "$src"
bad "    void_transfer_now: true" "$src"
bad "    inventory_reserve_enabled: true" "$src"
bad "    automatic_fulfillment_enabled: true" "$src"
bad "\"inventory_reserved_now\": true" "$fixture"
bad "\"private_allocation_ledger_write_now\": true" "$fixture"
bad "\"automatic_fulfillment_enabled_now\": true" "$fixture"
bad "\"void_transfer_now\": true" "$fixture"
bad "\"inventory_reserve_enabled\": true" "$fixture"
bad "\"automatic_fulfillment_enabled\": true" "$fixture"

python3 - "$fixture" <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))

assert j["inventory_reserve_hold_gate_green"] is True
assert j["inventory_reservation_shape_policy_green"] is True
assert j["capacity_check_policy_green"] is True
assert j["inventory_reserve_hold_policy_green"] is True
assert j["inventory_reserved_now"] is False
assert j["private_allocation_ledger_write_now"] is False
assert j["automatic_fulfillment_enabled_now"] is False
assert j["void_transfer_now"] is False

shape = j["inventory_reservation_shape"]
for k in [
    "inventory_reservation_id",
    "claim_id",
    "ledger_entry_id",
    "buyer_binding_key",
    "receiving_void_address",
    "pool_id",
    "void_amount",
    "inventory_policy_version",
    "available_inventory_before",
    "reserved_amount",
    "available_inventory_after",
    "reservation_state",
]:
    assert k in shape, k

states = set(j["inventory_reserve_states"])
for state in [
    "inventory_reserve_hold",
    "blocked_private_ledger_not_written",
    "blocked_claim_not_created",
    "blocked_capacity_insufficient",
    "blocked_duplicate_reservation",
    "blocked_operator_not_approved",
    "operator_review_required",
]:
    assert state in states, state

for ex in j["policy_examples"]:
    assert ex["may_reserve_inventory"] is False, ex
    for k in ["may_write_private_allocation_ledger", "may_automatic_fulfill", "may_transfer_void"]:
        if k in ex:
            assert ex[k] is False, (k, ex)

for k, v in j["authority_flags"].items():
    assert v is False, (k, v)

print("inventory_reserve_hold_json_semantics_green=true")
PY

echo "inventory_reserve_hold_source_green=true"
echo "inventory_reserve_hold_fixture_green=true"
echo "inventory_reserve_hold_routes_green=true"
echo "inventory_reserve_hold_policy_green=true"
echo "inventory_reserve_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_INVENTORY_RESERVE_HOLD_GATE_V1_GREEN"
