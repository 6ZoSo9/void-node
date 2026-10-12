#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_AUTHORITY_ACTIVATION_GATE_DRAFT_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/public/public-node-usdc-void-buy-pool-authority-activation-gate-draft-v1.md"
fixture="fixtures/public/usdc-void-buy-pool-authority-activation-gate-draft-v1.json"

need(){ grep -qF "$1" "$2" || { echo "missing=$1 file=$2"; exit 1; }; }
bad(){ if grep -qF "$1" "$2"; then echo "forbidden=$1 file=$2"; exit 1; fi; }

marker="VOID_USDC_VOID_BUY_POOL_AUTHORITY_ACTIVATION_GATE_DRAFT_V1"

need "$marker" "$doc"
need "This is a draft gate" "$doc"
need "does not activate authority" "$doc"
need "no automatic fulfillment" "$doc"
need "no VOID transfer" "$doc"

need "$marker" "$fixture"
need "\"authority_activation_gate_draft_green\": true" "$fixture"
need "\"activation_conditions_defined\": true" "$fixture"
need "\"explicit_operator_approval_required\": true" "$fixture"
need "\"separate_authority_activation_commit_required\": true" "$fixture"
need "\"authority_activation_enabled_now\": false" "$fixture"
need "\"automatic_fulfillment_enabled_now\": false" "$fixture"
need "\"runtime_queue_enabled_now\": false" "$fixture"
need "\"wallet_signer_access_enabled_now\": false" "$fixture"
need "\"public_mutation_enabled_now\": false" "$fixture"
need "\"void_transfer_now\": false" "$fixture"
need "\"authority_activation_gate_draft_only\"" "$fixture"
need "\"operator_authority_activation_approval_record_required\"" "$fixture"

for required in \
  explicit_operator_approval_record \
  sealed_prerequisite_reconcile \
  runtime_queue_boundary_proof \
  wallet_signer_boundary_proof \
  public_mutation_boundary_proof \
  transfer_receipt_verification_proof \
  emergency_pause_rollback_boundary \
  cross_box_green_tag \
  final_precision_sync
do
  need "$required" "$fixture"
done

need "$marker" "$src"
need "/public-node/usdc-void-buy-pool/authority-activation-gate-draft-v1.json" "$src"
need "/public-node/usdc-void-buy-pool/authority-activation-gate-draft-v1" "$src"
need "authority_activation_gate_draft_green: true" "$src"
need "activation_conditions_defined: true" "$src"
need "explicit_operator_approval_required: true" "$src"
need "authority_activation_enabled_now: false" "$src"
need "automatic_fulfillment_enabled_now: false" "$src"
need "runtime_queue_enabled_now: false" "$src"
need "wallet_signer_access_enabled_now: false" "$src"
need "public_mutation_enabled_now: false" "$src"
need "void_transfer_now: false" "$src"
need "authority_activation_gate_draft_only" "$src"
need "operator_authority_activation_approval_record_required" "$src"

test "$(grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/authority-activation-gate-draft-v1.json",' "$src" | wc -l)" = "1"
test "$(grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/authority-activation-gate-draft-v1",' "$src" | wc -l)" = "1"

bad "    authority_activation_enabled_now: true" "$src"
bad "    automatic_fulfillment_enabled_now: true" "$src"
bad "    runtime_queue_enabled_now: true" "$src"
bad "    wallet_signer_access_enabled_now: true" "$src"
bad "    public_mutation_enabled_now: true" "$src"
bad "    void_transfer_now: true" "$src"
bad "\"authority_activation_enabled_now\": true" "$fixture"
bad "\"automatic_fulfillment_enabled_now\": true" "$fixture"
bad "\"runtime_queue_enabled_now\": true" "$fixture"
bad "\"wallet_signer_access_enabled_now\": true" "$fixture"
bad "\"public_mutation_enabled_now\": true" "$fixture"
bad "\"void_transfer_now\": true" "$fixture"

python3 - "$fixture" <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))

assert j["authority_activation_gate_draft_green"] is True
assert j["activation_conditions_defined"] is True
assert j["explicit_operator_approval_required"] is True
assert j["separate_authority_activation_commit_required"] is True
assert j["authority_activation_enabled_now"] is False
assert j["automatic_fulfillment_enabled_now"] is False
assert j["runtime_queue_enabled_now"] is False
assert j["wallet_signer_access_enabled_now"] is False
assert j["public_mutation_enabled_now"] is False
assert j["void_transfer_now"] is False
assert j["overall_activation_state"] == "authority_activation_gate_draft_only"

assert len(j["activation_required_conditions"]) == 9
assert len(j["blocking_states"]) == 7

for k, v in j["authority_flags"].items():
    assert v is False, (k, v)

print("authority_activation_gate_draft_json_semantics_green=true")
PY

echo "authority_activation_gate_draft_source_green=true"
echo "authority_activation_gate_draft_fixture_green=true"
echo "authority_activation_gate_draft_routes_green=true"
echo "authority_activation_gate_draft_policy_green=true"
echo "authority_activation_gate_draft_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_AUTHORITY_ACTIVATION_GATE_DRAFT_V1_GREEN"
