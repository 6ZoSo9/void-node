#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_DUPLICATE_PAYMENT_GUARD_GATE_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/public/public-node-usdc-void-buy-pool-duplicate-payment-guard-gate-v1.md"
fixture="fixtures/public/usdc-void-buy-pool-duplicate-payment-guard-gate-v1.json"

need(){ grep -qF "$1" "$2" || { echo "missing=$1 file=$2"; exit 1; }; }
bad(){ if grep -qF "$1" "$2"; then echo "forbidden=$1 file=$2"; exit 1; fi; }

marker="VOID_USDC_VOID_BUY_POOL_DUPLICATE_PAYMENT_GUARD_GATE_V1"

need "$marker" "$doc"
need "Primary payment event key: chain_id + tx_hash + transfer_log_index" "$doc"
need "Same payment event key cannot be counted twice" "$doc"
need "duplicate_same_chain_tx_log_index_blocked" "$doc"
need "duplicate_same_tx_without_log_index_hold" "$doc"
need "does not enable automatic fulfillment" "$doc"

need "$marker" "$fixture"
need "\"duplicate_payment_guard_gate_green\": true" "$fixture"
need "\"primary_event_key_policy_green\": true" "$fixture"
need "\"candidate_claim_key_policy_green\": true" "$fixture"
need "\"duplicate_rejection_policy_green\": true" "$fixture"
need "\"ambiguous_duplicate_hold_policy_green\": true" "$fixture"
need "\"automatic_fulfillment_enabled_now\": false" "$fixture"
need "\"overall_automatic_activation_state\": \"still_blocked_other_gates_pending\"" "$fixture"
need "\"chain_id\"" "$fixture"
need "\"tx_hash\"" "$fixture"
need "\"transfer_log_index\"" "$fixture"
need "\"buyer_binding_key\"" "$fixture"
need "\"duplicate_same_chain_tx_log_index_blocked\"" "$fixture"
need "\"duplicate_same_candidate_claim_key_blocked\"" "$fixture"
need "\"duplicate_same_tx_without_log_index_hold\"" "$fixture"
need "\"duplicate_conflicting_buyer_binding_hold\"" "$fixture"
need "\"duplicate_conflicting_amount_hold\"" "$fixture"
need "\"operator_review_required\"" "$fixture"
need "\"may_create_allocation_claim\": false" "$fixture"
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
need "/public-node/usdc-void-buy-pool/duplicate-payment-guard-gate-v1.json" "$src"
need "/public-node/usdc-void-buy-pool/duplicate-payment-guard-gate-v1" "$src"
need "duplicate_payment_guard_gate_green: true" "$src"
need "primary_event_key_policy_green: true" "$src"
need "candidate_claim_key_policy_green: true" "$src"
need "duplicate_rejection_policy_green: true" "$src"
need "ambiguous_duplicate_hold_policy_green: true" "$src"
need "automatic_fulfillment_enabled_now: false" "$src"
need "overall_automatic_activation_state: \"still_blocked_other_gates_pending\"" "$src"
need "duplicate_same_chain_tx_log_index_blocked" "$src"
need "duplicate_same_candidate_claim_key_blocked" "$src"
need "duplicate_same_tx_without_log_index_hold" "$src"
need "operator_review_required" "$src"
need "may_create_allocation_claim: false" "$src"
need "public_mutation_enabled: false" "$src"
need "runtime_queue_enabled: false" "$src"
need "live_fetch_now: false" "$src"
need "finality_verified_now: false" "$src"
need "real_payment_verified_now: false" "$src"
need "automatic_fulfillment_enabled: false" "$src"
need "private_allocation_ledger_write_enabled: false" "$src"
need "inventory_reserved_now: false" "$src"
need "void_transfer_now: false" "$src"

test "$(grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/duplicate-payment-guard-gate-v1.json",' "$src" | wc -l)" = "1"
test "$(grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/duplicate-payment-guard-gate-v1",' "$src" | wc -l)" = "1"

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

assert j["duplicate_payment_guard_gate_green"] is True
assert j["primary_event_key_policy_green"] is True
assert j["candidate_claim_key_policy_green"] is True
assert j["duplicate_rejection_policy_green"] is True
assert j["ambiguous_duplicate_hold_policy_green"] is True
assert j["automatic_fulfillment_enabled_now"] is False

primary_fields = j["primary_payment_event_key"]["key_fields"]
claim_fields = j["candidate_claim_key"]["key_fields"]

assert primary_fields == ["chain_id", "tx_hash", "transfer_log_index"], primary_fields
for required in ["chain_id", "tx_hash", "transfer_log_index", "receiver", "token_address", "buyer_binding_key"]:
    assert required in claim_fields, required

states = set(j["duplicate_states"])
for required in [
    "new_payment_candidate",
    "duplicate_same_chain_tx_log_index_blocked",
    "duplicate_same_candidate_claim_key_blocked",
    "duplicate_same_tx_without_log_index_hold",
    "duplicate_conflicting_buyer_binding_hold",
    "duplicate_conflicting_amount_hold",
    "operator_review_required",
]:
    assert required in states, required

for ex in j["policy_examples"]:
    assert ex["may_create_allocation_claim"] is False, ex

for k, v in j["authority_flags"].items():
    assert v is False, (k, v)

print("duplicate_payment_guard_json_semantics_green=true")
PY

echo "duplicate_payment_guard_source_green=true"
echo "duplicate_payment_guard_fixture_green=true"
echo "duplicate_payment_guard_routes_green=true"
echo "duplicate_payment_guard_policy_green=true"
echo "duplicate_payment_guard_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_DUPLICATE_PAYMENT_GUARD_GATE_V1_GREEN"
