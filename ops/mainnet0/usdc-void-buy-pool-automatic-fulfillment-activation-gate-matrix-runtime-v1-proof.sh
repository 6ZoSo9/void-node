#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_FULFILLMENT_ACTIVATION_GATE_MATRIX_RUNTIME_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/public/public-node-usdc-void-buy-pool-automatic-fulfillment-activation-gate-matrix-runtime-v1.md"
fixture="fixtures/public/usdc-void-buy-pool-automatic-fulfillment-activation-gate-matrix-runtime-v1.json"

need(){ grep -qF "$1" "$2" || { echo "missing=$1 file=$2"; exit 1; }; }
bad(){ if grep -qF "$1" "$2"; then echo "forbidden=$1 file=$2"; exit 1; fi; }

need "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_FULFILLMENT_ACTIVATION_GATE_MATRIX_RUNTIME_V1" "$doc"
need "automatic fulfillment enabled now: false" "$doc"
need "overall activation state: blocked" "$doc"
need "Non-activation statement" "$doc"

need "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_FULFILLMENT_ACTIVATION_GATE_MATRIX_RUNTIME_V1" "$fixture"
need "\"automatic_fulfillment_enabled_now\": false" "$fixture"
need "\"overall_activation_state\": \"blocked_all_gates_pending\"" "$fixture"
need "\"gate_count\": 14" "$fixture"
need "\"gate_green\": false" "$fixture"
need "\"required_before_automatic\": true" "$fixture"
need "\"public_mutation_enabled\": false" "$fixture"
need "\"runtime_queue_enabled\": false" "$fixture"
need "\"live_fetch_now\": false" "$fixture"
need "\"finality_verified_now\": false" "$fixture"
need "\"real_payment_verified_now\": false" "$fixture"
need "\"automatic_fulfillment_enabled\": false" "$fixture"
need "\"private_allocation_ledger_write_enabled\": false" "$fixture"
need "\"inventory_reserved_now\": false" "$fixture"
need "\"void_transfer_now\": false" "$fixture"

for gate in \
  live_receipt_fetch_or_observation_scheduler_gate \
  chain_allowlist_and_rpc_endpoint_policy_gate \
  receiver_allowlist_gate \
  usdc_token_address_allowlist_gate \
  amount_and_rate_policy_gate \
  buyer_identity_binding_gate \
  duplicate_payment_guard_gate \
  finality_confirmation_policy_gate \
  private_allocation_ledger_write_gate \
  inventory_reserve_gate \
  fulfillment_signer_transfer_gate \
  operator_kill_switch_gate \
  rollback_and_audit_evidence_pack_gate \
  public_mutation_boundary_audit_gate
do
  need "$gate" "$fixture"
  need "$gate" "$src"
done

need "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_FULFILLMENT_ACTIVATION_GATE_MATRIX_RUNTIME_V1" "$src"
need "/public-node/usdc-void-buy-pool/automatic-fulfillment-activation-gate-matrix-runtime-v1.json" "$src"
need "/public-node/usdc-void-buy-pool/automatic-fulfillment-activation-gate-matrix-runtime-v1" "$src"
need "automatic_fulfillment_enabled_now: false" "$src"
need "overall_activation_state: \"blocked_all_gates_pending\"" "$src"
need "gate_green: false" "$src"
need "public_mutation_enabled: false" "$src"
need "runtime_queue_enabled: false" "$src"
need "live_fetch_now: false" "$src"
need "finality_verified_now: false" "$src"
need "real_payment_verified_now: false" "$src"
need "automatic_fulfillment_enabled: false" "$src"
need "private_allocation_ledger_write_enabled: false" "$src"
need "inventory_reserved_now: false" "$src"
need "void_transfer_now: false" "$src"

test "$(grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/automatic-fulfillment-activation-gate-matrix-runtime-v1.json",' "$src" | wc -l)" = "1"
test "$(grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/automatic-fulfillment-activation-gate-matrix-runtime-v1",' "$src" | wc -l)" = "1"

bad "automatic_fulfillment_enabled_now: true" "$src"
bad "gate_green: true" "$src"
bad "automatic_fulfillment_enabled: true" "$src"
bad "private_allocation_ledger_write_enabled: true" "$src"
bad "inventory_reserved_now: true" "$src"
bad "void_transfer_now: true" "$src"
bad "\"automatic_fulfillment_enabled_now\": true" "$fixture"
bad "\"gate_green\": true" "$fixture"
bad "\"automatic_fulfillment_enabled\": true" "$fixture"
bad "\"private_allocation_ledger_write_enabled\": true" "$fixture"
bad "\"inventory_reserved_now\": true" "$fixture"
bad "\"void_transfer_now\": true" "$fixture"

echo "activation_gate_matrix_source_green=true"
echo "activation_gate_matrix_fixture_green=true"
echo "activation_gate_matrix_routes_green=true"
echo "activation_gate_matrix_all_gates_false_green=true"
echo "activation_gate_matrix_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_FULFILLMENT_ACTIVATION_GATE_MATRIX_RUNTIME_V1_GREEN"
