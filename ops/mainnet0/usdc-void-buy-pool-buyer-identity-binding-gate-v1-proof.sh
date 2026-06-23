#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_BUYER_IDENTITY_BINDING_GATE_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/public/public-node-usdc-void-buy-pool-buyer-identity-binding-gate-v1.md"
fixture="fixtures/public/usdc-void-buy-pool-buyer-identity-binding-gate-v1.json"

need(){ grep -qF "$1" "$2" || { echo "missing=$1 file=$2"; exit 1; }; }
bad(){ if grep -qF "$1" "$2"; then echo "forbidden=$1 file=$2"; exit 1; fi; }

marker="VOID_USDC_VOID_BUY_POOL_BUYER_IDENTITY_BINDING_GATE_V1"

need "$marker" "$doc"
need "Buyer binding key is a public-safe opaque identifier, not public PII" "$doc"
need "Buyer binding key must bind to exactly one receiving VOID address" "$doc"
need "Conflicting buyer binding claims must go to hold" "$doc"
need "Public surfaces must not reveal private PII" "$doc"
need "does not enable automatic fulfillment" "$doc"

need "$marker" "$fixture"
need "\"buyer_identity_binding_gate_green\": true" "$fixture"
need "\"buyer_binding_key_policy_green\": true" "$fixture"
need "\"receiving_void_address_policy_green\": true" "$fixture"
need "\"conflict_hold_policy_green\": true" "$fixture"
need "\"public_pii_redaction_policy_green\": true" "$fixture"
need "\"automatic_fulfillment_enabled_now\": false" "$fixture"
need "\"overall_automatic_activation_state\": \"still_blocked_other_gates_pending\"" "$fixture"
need "\"public_pii_allowed\": false" "$fixture"
need "\"private_contact_info_allowed_publicly\": false" "$fixture"
need "\"secret_material_allowed_publicly\": false" "$fixture"
need "\"buyer_binding_key\"" "$fixture"
need "\"receiving_void_address\"" "$fixture"
need "\"buyer_binding_candidate_ready\"" "$fixture"
need "\"buyer_binding_missing_hold\"" "$fixture"
need "\"buyer_binding_conflict_hold\"" "$fixture"
need "\"receiving_void_address_missing_hold\"" "$fixture"
need "\"receiving_void_address_conflict_hold\"" "$fixture"
need "\"payment_event_unbound_hold\"" "$fixture"
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
need "/public-node/usdc-void-buy-pool/buyer-identity-binding-gate-v1.json" "$src"
need "/public-node/usdc-void-buy-pool/buyer-identity-binding-gate-v1" "$src"
need "buyer_identity_binding_gate_green: true" "$src"
need "buyer_binding_key_policy_green: true" "$src"
need "receiving_void_address_policy_green: true" "$src"
need "conflict_hold_policy_green: true" "$src"
need "public_pii_redaction_policy_green: true" "$src"
need "automatic_fulfillment_enabled_now: false" "$src"
need "overall_automatic_activation_state: \"still_blocked_other_gates_pending\"" "$src"
need "public_pii_allowed: false" "$src"
need "private_contact_info_allowed_publicly: false" "$src"
need "secret_material_allowed_publicly: false" "$src"
need "buyer_binding_candidate_ready" "$src"
need "buyer_binding_missing_hold" "$src"
need "buyer_binding_conflict_hold" "$src"
need "receiving_void_address_conflict_hold" "$src"
need "payment_event_unbound_hold" "$src"
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

test "$(grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/buyer-identity-binding-gate-v1.json",' "$src" | wc -l)" = "1"
test "$(grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/buyer-identity-binding-gate-v1",' "$src" | wc -l)" = "1"

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

bad "email" "$fixture"
bad "phone" "$fixture"
bad "secret" "$fixture"
bad "private_key" "$fixture"
bad "seed_phrase" "$fixture"

python3 - "$fixture" <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))

assert j["buyer_identity_binding_gate_green"] is True
assert j["buyer_binding_key_policy_green"] is True
assert j["receiving_void_address_policy_green"] is True
assert j["conflict_hold_policy_green"] is True
assert j["public_pii_redaction_policy_green"] is True
assert j["automatic_fulfillment_enabled_now"] is False

bp = j["buyer_binding_policy"]
assert bp["buyer_binding_key_type"] == "opaque_public_safe_identifier"
assert bp["public_pii_allowed"] is False
assert bp["private_contact_info_allowed_publicly"] is False
assert bp["secret_material_allowed_publicly"] is False

fields = j["candidate_binding_key"]["key_fields"]
for required in ["chain_id", "tx_hash", "transfer_log_index", "buyer_binding_key", "receiving_void_address"]:
    assert required in fields, required

states = set(j["binding_states"])
for required in [
    "buyer_binding_candidate_ready",
    "buyer_binding_missing_hold",
    "buyer_binding_conflict_hold",
    "receiving_void_address_missing_hold",
    "receiving_void_address_conflict_hold",
    "payment_event_unbound_hold",
    "operator_review_required",
]:
    assert required in states, required

for ex in j["policy_examples"]:
    assert ex["may_create_allocation_claim"] is False, ex

for k, v in j["authority_flags"].items():
    assert v is False, (k, v)

print("buyer_identity_binding_json_semantics_green=true")
PY

echo "buyer_identity_binding_source_green=true"
echo "buyer_identity_binding_fixture_green=true"
echo "buyer_identity_binding_routes_green=true"
echo "buyer_identity_binding_policy_green=true"
echo "buyer_identity_binding_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_BUYER_IDENTITY_BINDING_GATE_V1_GREEN"
