#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_COUPLED_ECONOMIC_SUCCESSOR_GATE_AUTHORITY_V1,
  VOID_COUPLED_ECONOMIC_SUCCESSOR_GATE_V1,
  classifyVoidCoupledEconomicSuccessorGateFromDecisionV1,
  classifyVoidCoupledEconomicSuccessorGateV1,
} from "../tools/void-coupled-economic-successor-gate-v1.mjs";

const candidate = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json",
    "utf8",
  ),
);
const successor = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json",
    "utf8",
  ),
);

const held = classifyVoidCoupledEconomicSuccessorGateV1(
  candidate,
  successor,
);
assert.equal(held.ok, false);
assert.equal(held.status, "HOLD");
assert.equal(held.reason, "coupled_economic_gates_incomplete");
assert.ok(
  held.missing_gates.includes(
    "economic_successor_migration_source_ready_required",
  ),
);

for (const gate of [
  "opening_commitment_window_policy_required",
  "opening_participant_provenance_and_eligibility_required",
  "opening_concentration_and_sybil_limits_required",
  "opening_minimum_real_wc_depth_policy_required",
  "opening_nonproduction_wc_exclusion_required",
  "opening_claim_transfer_or_refund_binding_required",
  "wc_ledger_persistence_verification_required",
  "quote_reserve_custody_verification_required",
  "shared_post_discovery_model_reconciliation_required",
  "reverse_void_to_wc_settlement_required",
  "participant_post_purchase_voidtoken_control_required",
  "system_sponsored_execution_anti_grief_required",
  "economic_intent_ttl_and_caps_required",
  "public_quote_disclosure_required",
  "bounded_canary_required",
  "coupled_activation_ready_required",
]) {
  assert.ok(held.missing_gates.includes(gate), gate);
}

const upstreamReady = Object.freeze({
  ok: true,
  status: "SOURCE_READY",
  marker: "VOID_ECONOMIC_EVM_SUCCESSOR_MIGRATION_V1",
  execution_epoch: 2,
  chain_id: 2050,
  participant_eoa_balances_same_address: true,
  voidtoken_same_address_preserved: true,
  voidtoken_runtime_identity_verified: true,
  voidtoken_balance_and_supply_equivalence_verified: true,
  contract_holder_value_remap_manifest_ready: true,
  ceremony_key_continuity_verified: true,
  offline_successor_equivalence_proven: true,
  unmapped_voidtoken_atomic_verified_zero: true,
  orphan_contract_held_void_atomic_verified_zero: true,
  admin_gate_migrates: false,
  config_gate_migrates: false,
  legacy_wc_relayer_migrates: false,
  native_gas_is_economic_asset: false,
  migration_authorized: false,
  public_activation_authorized: false,
  money_movement_authorized: false,
});

const ready = structuredClone(candidate);
ready.status = "SOURCE_READY";
for (const key of Object.keys(ready.gates)) {
  ready.gates[key] = true;
}

const sourceReady =
  classifyVoidCoupledEconomicSuccessorGateFromDecisionV1(
    ready,
    upstreamReady,
  );
assert.equal(sourceReady.ok, true);
assert.equal(sourceReady.status, "SOURCE_READY");
assert.equal(
  sourceReady.marker,
  VOID_COUPLED_ECONOMIC_SUCCESSOR_GATE_V1,
);
assert.equal(sourceReady.chain_id, 2050);
assert.equal(sourceReady.execution_epoch, 2);
assert.equal(sourceReady.presale_wc_void_coupled_launch_required, true);
assert.equal(
  sourceReady.protocol_void_inventory_atoms,
  "10000000000000000000000000",
);
assert.equal(
  sourceReady.opening_sale_tranche_void_atoms,
  "5000000000000000000000000",
);
assert.equal(
  sourceReady.post_opening_void_reserve_atoms,
  "5000000000000000000000000",
);
assert.equal(
  sourceReady.opening_price_source,
  "settled_wc_over_opening_sale_tranche",
);
assert.equal(
  sourceReady.opening_allocation_policy,
  "pro_rata_largest_remainder_v1",
);
assert.equal(sourceReady.voidtoken_is_only_economic_void_asset, true);
assert.equal(sourceReady.native_gas_is_economic_asset, false);
assert.equal(sourceReady.participant_native_gas_balance_required, false);
assert.equal(sourceReady.raw_public_rpc_allowed, false);
assert.equal(sourceReady.successor_migration_authorized, false);
assert.equal(sourceReady.market_activation_authorized, false);
assert.equal(sourceReady.public_presale_activation_authorized, false);
assert.equal(sourceReady.funds_movement_authorized, false);

{
  const bad = structuredClone(candidate);
  bad.wc_void_opening.opening_price_source =
    "settled_wc_reserve_ratio";
  const result =
    classifyVoidCoupledEconomicSuccessorGateFromDecisionV1(
      bad,
      upstreamReady,
    );
  assert.equal(result.ok, false);
  assert.equal(result.reason, "wc_void_opening_policy_mismatch");
}

{
  const bad = structuredClone(candidate);
  bad.execution_policy.native_gas_is_economic_asset = true;
  const result =
    classifyVoidCoupledEconomicSuccessorGateFromDecisionV1(
      bad,
      upstreamReady,
    );
  assert.equal(result.ok, false);
  assert.equal(result.reason, "successor_execution_policy_mismatch");
}

{
  const bad = structuredClone(candidate);
  bad.execution_policy.participant_native_gas_balance_required = true;
  const result =
    classifyVoidCoupledEconomicSuccessorGateFromDecisionV1(
      bad,
      upstreamReady,
    );
  assert.equal(result.ok, false);
  assert.equal(result.reason, "successor_execution_policy_mismatch");
}

{
  const bad = structuredClone(candidate);
  bad.authority.transaction_broadcast = true;
  const result =
    classifyVoidCoupledEconomicSuccessorGateFromDecisionV1(
      bad,
      upstreamReady,
    );
  assert.equal(result.ok, false);
  assert.equal(
    result.reason,
    "authority_must_remain_false:transaction_broadcast",
  );
}

for (const [key, value] of Object.entries(
  VOID_COUPLED_ECONOMIC_SUCCESSOR_GATE_AUTHORITY_V1,
)) {
  assert.equal(
    key === "source_classification_only" ? value : value === false,
    true,
    key,
  );
}

const source = fs.readFileSync(
  "tools/void-coupled-economic-successor-gate-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "sendTransaction(",
  "broadcastTransaction(",
  "Wallet(",
  "systemctl",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log("VOID_COUPLED_ECONOMIC_SUCCESSOR_GATE_V1_PROOF_GREEN");
console.log("checked_in_candidate=HOLD");
console.log("economic_successor_migration_source_ready=false");
console.log("execution_epoch=2");
console.log("voidtoken_is_only_economic_void_asset=true");
console.log("native_gas_is_economic_asset=false");
console.log("participant_native_gas_balance_required=false");
console.log("zero_fee_or_system_sponsored_execution_required=true");
console.log("raw_public_rpc_allowed=false");
console.log("opening_sale_tranche_void=5000000");
console.log("post_opening_void_reserve=5000000");
console.log("opening_allocation_policy=pro_rata_largest_remainder_v1");
console.log("old_anvil_productionization_required=false");
console.log("successor_migration_authorized=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
