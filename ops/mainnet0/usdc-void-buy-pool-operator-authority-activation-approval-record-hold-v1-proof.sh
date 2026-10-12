#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_OPERATOR_AUTHORITY_ACTIVATION_APPROVAL_RECORD_HOLD_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/public/public-node-usdc-void-buy-pool-operator-authority-activation-approval-record-hold-v1.md"
fixture="fixtures/public/usdc-void-buy-pool-operator-authority-activation-approval-record-hold-v1.json"

need(){ grep -qF "$1" "$2" || { echo "missing=$1 file=$2"; exit 1; }; }
bad(){ if grep -qF "$1" "$2"; then echo "forbidden=$1 file=$2"; exit 1; fi; }

marker="VOID_USDC_VOID_BUY_POOL_OPERATOR_AUTHORITY_ACTIVATION_APPROVAL_RECORD_HOLD_V1"

need "$marker" "$doc"
need "This is a hold gate" "$doc"
need "does not create an approval record" "$doc"
need "does not activate authority" "$doc"
need "no VOID transfer" "$doc"

need "$marker" "$fixture"
need "\"operator_approval_record_hold_gate_green\": true" "$fixture"
need "\"approval_record_shape_policy_green\": true" "$fixture"
need "\"approval_scope_policy_green\": true" "$fixture"
need "\"operator_review_policy_green\": true" "$fixture"
need "\"approval_record_created_now\": false" "$fixture"
need "\"operator_approval_present_now\": false" "$fixture"
need "\"authority_activation_enabled_now\": false" "$fixture"
need "\"automatic_fulfillment_enabled_now\": false" "$fixture"
need "\"runtime_queue_enabled_now\": false" "$fixture"
need "\"wallet_signer_access_enabled_now\": false" "$fixture"
need "\"public_mutation_enabled_now\": false" "$fixture"
need "\"void_transfer_now\": false" "$fixture"
need "\"operator_approval_record_hold_authority_false\"" "$fixture"
need "\"operator_authority_activation_approval_record_hold\"" "$fixture"
need "\"blocked_missing_operator_approval\"" "$fixture"
need "\"blocked_invalid_approval_scope\"" "$fixture"
need "\"blocked_missing_reconcile_reference\"" "$fixture"
need "\"blocked_missing_cross_box_green\"" "$fixture"
need "\"blocked_missing_final_sync\"" "$fixture"
need "\"operator_review_required\"" "$fixture"
need "\"may_create_approval_record\": false" "$fixture"
need "\"may_activate_authority\": false" "$fixture"
need "\"may_enable_runtime_queue\": false" "$fixture"
need "\"may_access_wallet_signer\": false" "$fixture"
need "\"may_enable_automatic_fulfillment\": false" "$fixture"
need "\"may_transfer_void\": false" "$fixture"

need "$marker" "$src"
need "/public-node/usdc-void-buy-pool/operator-authority-activation-approval-record-hold-v1.json" "$src"
need "/public-node/usdc-void-buy-pool/operator-authority-activation-approval-record-hold-v1" "$src"
need "operator_approval_record_hold_gate_green: true" "$src"
need "approval_record_shape_policy_green: true" "$src"
need "approval_scope_policy_green: true" "$src"
need "approval_record_created_now: false" "$src"
need "operator_approval_present_now: false" "$src"
need "authority_activation_enabled_now: false" "$src"
need "automatic_fulfillment_enabled_now: false" "$src"
need "runtime_queue_enabled_now: false" "$src"
need "wallet_signer_access_enabled_now: false" "$src"
need "public_mutation_enabled_now: false" "$src"
need "void_transfer_now: false" "$src"
need "operator_approval_record_hold_authority_false" "$src"
need "operator_authority_activation_approval_record_hold" "$src"
need "operator_approval_record_creation_gate_required" "$src"
need "may_create_approval_record: false" "$src"
need "may_activate_authority: false" "$src"
need "may_transfer_void: false" "$src"

test "$(grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/operator-authority-activation-approval-record-hold-v1.json",' "$src" | wc -l)" = "1"
test "$(grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/operator-authority-activation-approval-record-hold-v1",' "$src" | wc -l)" = "1"

bad "    approval_record_created_now: true" "$src"
bad "    operator_approval_present_now: true" "$src"
bad "    authority_activation_enabled_now: true" "$src"
bad "    automatic_fulfillment_enabled_now: true" "$src"
bad "    runtime_queue_enabled_now: true" "$src"
bad "    wallet_signer_access_enabled_now: true" "$src"
bad "    public_mutation_enabled_now: true" "$src"
bad "    void_transfer_now: true" "$src"
bad "\"approval_record_created_now\": true" "$fixture"
bad "\"operator_approval_present_now\": true" "$fixture"
bad "\"authority_activation_enabled_now\": true" "$fixture"
bad "\"automatic_fulfillment_enabled_now\": true" "$fixture"
bad "\"runtime_queue_enabled_now\": true" "$fixture"
bad "\"wallet_signer_access_enabled_now\": true" "$fixture"
bad "\"public_mutation_enabled_now\": true" "$fixture"
bad "\"void_transfer_now\": true" "$fixture"

python3 - "$fixture" <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))

assert j["operator_approval_record_hold_gate_green"] is True
assert j["approval_record_shape_policy_green"] is True
assert j["approval_scope_policy_green"] is True
assert j["approval_record_created_now"] is False
assert j["operator_approval_present_now"] is False
assert j["authority_activation_enabled_now"] is False
assert j["automatic_fulfillment_enabled_now"] is False
assert j["runtime_queue_enabled_now"] is False
assert j["wallet_signer_access_enabled_now"] is False
assert j["public_mutation_enabled_now"] is False
assert j["void_transfer_now"] is False

shape = j["approval_record_shape"]
for k in [
    "approval_record_id",
    "operator_identity_key",
    "approval_scope",
    "activation_gate_marker",
    "prerequisite_reconcile_marker",
    "approval_policy_version",
    "approval_state",
    "approval_reason",
    "created_at_policy",
    "cross_box_required",
    "final_sync_required",
]:
    assert k in shape, k

for ex in j["policy_examples"]:
    for k in ["may_create_approval_record", "may_activate_authority", "may_enable_runtime_queue", "may_access_wallet_signer", "may_enable_automatic_fulfillment", "may_transfer_void"]:
        if k in ex:
            assert ex[k] is False, (k, ex)

for k, v in j["authority_flags"].items():
    assert v is False, (k, v)

print("operator_authority_activation_approval_record_hold_json_semantics_green=true")
PY

echo "operator_authority_activation_approval_record_hold_source_green=true"
echo "operator_authority_activation_approval_record_hold_fixture_green=true"
echo "operator_authority_activation_approval_record_hold_routes_green=true"
echo "operator_authority_activation_approval_record_hold_policy_green=true"
echo "operator_authority_activation_approval_record_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_OPERATOR_AUTHORITY_ACTIVATION_APPROVAL_RECORD_HOLD_V1_GREEN"
