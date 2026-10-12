#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_FULFILLMENT_EXECUTION_HOLD_GATE_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/public/public-node-usdc-void-buy-pool-fulfillment-execution-hold-gate-v1.md"
fixture="fixtures/public/usdc-void-buy-pool-fulfillment-execution-hold-gate-v1.json"

need(){ grep -qF "$1" "$2" || { echo "missing=$1 file=$2"; exit 1; }; }
bad(){ if grep -qF "$1" "$2"; then echo "forbidden=$1 file=$2"; exit 1; fi; }

marker="VOID_USDC_VOID_BUY_POOL_FULFILLMENT_EXECUTION_HOLD_GATE_V1"

need "$marker" "$doc"
need "This is a hold gate" "$doc"
need "does not execute fulfillment now" "$doc"
need "does not transfer VOID now" "$doc"
need "No fulfillment execution occurs now" "$doc"

need "$marker" "$fixture"
need "\"fulfillment_execution_hold_gate_green\": true" "$fixture"
need "\"fulfillment_execution_shape_policy_green\": true" "$fixture"
need "\"wallet_authority_absent_policy_green\": true" "$fixture"
need "\"transfer_receipt_required_policy_green\": true" "$fixture"
need "\"operator_review_policy_green\": true" "$fixture"
need "\"fulfillment_execution_now\": false" "$fixture"
need "\"automatic_fulfillment_enabled_now\": false" "$fixture"
need "\"wallet_signer_access_enabled_now\": false" "$fixture"
need "\"void_transfer_now\": false" "$fixture"
need "\"inventory_reserved_now\": false" "$fixture"
need "\"private_allocation_ledger_write_now\": false" "$fixture"
need "\"allocation_claim_created_now\": false" "$fixture"
need "\"fulfillment_execution_id\": \"deterministic_public_safe_id_from_inventory_reservation_and_fulfillment_policy\"" "$fixture"
need "\"transfer_request_state\": \"not_created\"" "$fixture"
need "\"transfer_receipt_state\": \"not_observed\"" "$fixture"
need "\"fulfillment_execution_hold\"" "$fixture"
need "\"blocked_inventory_not_reserved\"" "$fixture"
need "\"blocked_private_ledger_not_written\"" "$fixture"
need "\"blocked_claim_not_created\"" "$fixture"
need "\"blocked_operator_not_approved\"" "$fixture"
need "\"blocked_wallet_authority_absent\"" "$fixture"
need "\"blocked_transfer_receipt_missing\"" "$fixture"
need "\"operator_review_required\"" "$fixture"
need "\"may_execute_fulfillment\": false" "$fixture"
need "\"may_access_wallet_signer\": false" "$fixture"
need "\"may_transfer_void\": false" "$fixture"
need "\"may_enable_automatic_fulfillment\": false" "$fixture"
need "\"fulfillment_execution_enabled\": false" "$fixture"
need "\"wallet_signer_access_enabled\": false" "$fixture"
need "\"automatic_fulfillment_enabled\": false" "$fixture"

need "$marker" "$src"
need "/public-node/usdc-void-buy-pool/fulfillment-execution-hold-gate-v1.json" "$src"
need "/public-node/usdc-void-buy-pool/fulfillment-execution-hold-gate-v1" "$src"
need "fulfillment_execution_hold_gate_green: true" "$src"
need "fulfillment_execution_shape_policy_green: true" "$src"
need "wallet_authority_absent_policy_green: true" "$src"
need "transfer_receipt_required_policy_green: true" "$src"
need "fulfillment_execution_now: false" "$src"
need "automatic_fulfillment_enabled_now: false" "$src"
need "wallet_signer_access_enabled_now: false" "$src"
need "void_transfer_now: false" "$src"
need "inventory_reserved_now: false" "$src"
need "private_allocation_ledger_write_now: false" "$src"
need "fulfillment_execution_hold" "$src"
need "blocked_inventory_not_reserved" "$src"
need "blocked_wallet_authority_absent" "$src"
need "blocked_transfer_receipt_missing" "$src"
need "may_execute_fulfillment: false" "$src"
need "may_access_wallet_signer: false" "$src"
need "may_transfer_void: false" "$src"
need "may_enable_automatic_fulfillment: false" "$src"
need "fulfillment_execution_enabled: false" "$src"
need "wallet_signer_access_enabled: false" "$src"
need "automatic_fulfillment_enabled: false" "$src"

test "$(grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/fulfillment-execution-hold-gate-v1.json",' "$src" | wc -l)" = "1"
test "$(grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/fulfillment-execution-hold-gate-v1",' "$src" | wc -l)" = "1"

bad "    fulfillment_execution_now: true" "$src"
bad "    automatic_fulfillment_enabled_now: true" "$src"
bad "    wallet_signer_access_enabled_now: true" "$src"
bad "    void_transfer_now: true" "$src"
bad "    fulfillment_execution_enabled: true" "$src"
bad "    wallet_signer_access_enabled: true" "$src"
bad "    automatic_fulfillment_enabled: true" "$src"
bad "\"fulfillment_execution_now\": true" "$fixture"
bad "\"automatic_fulfillment_enabled_now\": true" "$fixture"
bad "\"wallet_signer_access_enabled_now\": true" "$fixture"
bad "\"void_transfer_now\": true" "$fixture"
bad "\"fulfillment_execution_enabled\": true" "$fixture"
bad "\"wallet_signer_access_enabled\": true" "$fixture"
bad "\"automatic_fulfillment_enabled\": true" "$fixture"

python3 - "$fixture" <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))

assert j["fulfillment_execution_hold_gate_green"] is True
assert j["fulfillment_execution_shape_policy_green"] is True
assert j["wallet_authority_absent_policy_green"] is True
assert j["transfer_receipt_required_policy_green"] is True
assert j["fulfillment_execution_now"] is False
assert j["automatic_fulfillment_enabled_now"] is False
assert j["wallet_signer_access_enabled_now"] is False
assert j["void_transfer_now"] is False
assert j["inventory_reserved_now"] is False
assert j["private_allocation_ledger_write_now"] is False

shape = j["fulfillment_execution_shape"]
for k in [
    "fulfillment_execution_id",
    "inventory_reservation_id",
    "ledger_entry_id",
    "claim_id",
    "buyer_binding_key",
    "receiving_void_address",
    "pool_id",
    "void_amount",
    "fulfillment_policy_version",
    "execution_state",
    "transfer_request_state",
    "transfer_receipt_state",
]:
    assert k in shape, k

states = set(j["fulfillment_execution_states"])
for state in [
    "fulfillment_execution_hold",
    "blocked_inventory_not_reserved",
    "blocked_private_ledger_not_written",
    "blocked_claim_not_created",
    "blocked_operator_not_approved",
    "blocked_wallet_authority_absent",
    "blocked_transfer_receipt_missing",
    "operator_review_required",
]:
    assert state in states, state

for ex in j["policy_examples"]:
    assert ex["may_execute_fulfillment"] is False, ex
    for k in ["may_access_wallet_signer", "may_transfer_void", "may_enable_automatic_fulfillment"]:
        if k in ex:
            assert ex[k] is False, (k, ex)

for k, v in j["authority_flags"].items():
    assert v is False, (k, v)

print("fulfillment_execution_hold_json_semantics_green=true")
PY

echo "fulfillment_execution_hold_source_green=true"
echo "fulfillment_execution_hold_fixture_green=true"
echo "fulfillment_execution_hold_routes_green=true"
echo "fulfillment_execution_hold_policy_green=true"
echo "fulfillment_execution_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_FULFILLMENT_EXECUTION_HOLD_GATE_V1_GREEN"
