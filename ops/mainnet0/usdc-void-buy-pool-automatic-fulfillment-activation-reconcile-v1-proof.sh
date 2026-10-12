#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_FULFILLMENT_ACTIVATION_RECONCILE_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/public/public-node-usdc-void-buy-pool-automatic-fulfillment-activation-reconcile-v1.md"
fixture="fixtures/public/usdc-void-buy-pool-automatic-fulfillment-activation-reconcile-v1.json"

need(){ grep -qF "$1" "$2" || { echo "missing=$1 file=$2"; exit 1; }; }
bad(){ if grep -qF "$1" "$2"; then echo "forbidden=$1 file=$2"; exit 1; fi; }

marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_FULFILLMENT_ACTIVATION_RECONCILE_V1"

need "$marker" "$doc"
need "This is not an authority flip" "$doc"
need "automatic fulfillment remains disabled" "$doc"
need "no VOID transfer" "$doc"

need "$marker" "$fixture"
need "\"activation_reconcile_green\": true" "$fixture"
need "\"sealed_prerequisite_map_green\": true" "$fixture"
need "\"authority_flip_required\": true" "$fixture"
need "\"automatic_fulfillment_enabled_now\": false" "$fixture"
need "\"public_mutation_enabled\": false" "$fixture"
need "\"runtime_queue_enabled\": false" "$fixture"
need "\"wallet_signer_access_enabled\": false" "$fixture"
need "\"void_transfer_now\": false" "$fixture"
need "\"overall_activation_state\": \"prerequisites_reconciled_authority_flip_required\"" "$fixture"
need "\"next_state\": \"authority_activation_gate_required\"" "$fixture"

for gate in \
  VOID_USDC_VOID_BUY_POOL_CHAIN_TOKEN_RECEIVER_ALLOWLIST_GATE_V1 \
  VOID_USDC_VOID_BUY_POOL_AMOUNT_RATE_POLICY_GATE_V1 \
  VOID_USDC_VOID_BUY_POOL_DUPLICATE_PAYMENT_GUARD_GATE_V1 \
  VOID_USDC_VOID_BUY_POOL_BUYER_IDENTITY_BINDING_GATE_V1 \
  VOID_USDC_VOID_BUY_POOL_FINALITY_CONFIRMATIONS_GATE_V1 \
  VOID_USDC_VOID_BUY_POOL_PAYMENT_ELIGIBILITY_DECISION_GATE_V1 \
  VOID_USDC_VOID_BUY_POOL_ALLOCATION_CLAIM_CREATION_HOLD_GATE_V1 \
  VOID_USDC_VOID_BUY_POOL_PRIVATE_ALLOCATION_LEDGER_WRITE_HOLD_GATE_V1 \
  VOID_USDC_VOID_BUY_POOL_INVENTORY_RESERVE_HOLD_GATE_V1 \
  VOID_USDC_VOID_BUY_POOL_FULFILLMENT_EXECUTION_HOLD_GATE_V1
do
  need "$gate" "$fixture"
  need "$gate" "$src"
done

need "$marker" "$src"
need "/public-node/usdc-void-buy-pool/automatic-fulfillment-activation-reconcile-v1.json" "$src"
need "/public-node/usdc-void-buy-pool/automatic-fulfillment-activation-reconcile-v1" "$src"
need "activation_reconcile_green: true" "$src"
need "sealed_prerequisite_map_green: true" "$src"
need "authority_flip_required: true" "$src"
need "automatic_fulfillment_enabled_now: false" "$src"
need "overall_activation_state: \"prerequisites_reconciled_authority_flip_required\"" "$src"
need "authority_activation_gate_required" "$src"
need "wallet_signer_access_enabled: false" "$src"
need "automatic_fulfillment_enabled: false" "$src"
need "void_transfer_now: false" "$src"

test "$(grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/automatic-fulfillment-activation-reconcile-v1.json",' "$src" | wc -l)" = "1"
test "$(grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/automatic-fulfillment-activation-reconcile-v1",' "$src" | wc -l)" = "1"

bad "    automatic_fulfillment_enabled_now: true" "$src"
bad "    public_mutation_enabled: true" "$src"
bad "    runtime_queue_enabled: true" "$src"
bad "    wallet_signer_access_enabled: true" "$src"
bad "    void_transfer_now: true" "$src"
bad "\"automatic_fulfillment_enabled_now\": true" "$fixture"
bad "\"public_mutation_enabled\": true" "$fixture"
bad "\"runtime_queue_enabled\": true" "$fixture"
bad "\"wallet_signer_access_enabled\": true" "$fixture"
bad "\"void_transfer_now\": true" "$fixture"

python3 - "$fixture" <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))

assert j["activation_reconcile_green"] is True
assert j["sealed_prerequisite_map_green"] is True
assert j["authority_flip_required"] is True
assert j["automatic_fulfillment_enabled_now"] is False
assert j["overall_activation_state"] == "prerequisites_reconciled_authority_flip_required"
assert j["next_state"] == "authority_activation_gate_required"

prereqs = j["sealed_prerequisites"]
assert len(prereqs) == 10, len(prereqs)
for p in prereqs:
    assert p["sealed"] is True, p
    assert p["marker"].startswith("VOID_USDC_VOID_BUY_POOL_"), p

for k, v in j["authority_flags"].items():
    assert v is False, (k, v)

print("activation_reconcile_json_semantics_green=true")
PY

echo "activation_reconcile_source_green=true"
echo "activation_reconcile_fixture_green=true"
echo "activation_reconcile_routes_green=true"
echo "activation_reconcile_prerequisite_map_green=true"
echo "activation_reconcile_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_FULFILLMENT_ACTIVATION_RECONCILE_V1_GREEN"
