import assert from "node:assert/strict";
import fs from "node:fs";
import {
  VOID_BUY_COUPLED_LAUNCH_ID_V1,
  classifyBuyLaunchGateV1,
  readBuyLaunchGateV1,
} from "../src/economic/buy_void_coupled_launch_gate_v1.mjs";
import {
  classifyVoidEconomicEvmSuccessorMigrationV1,
} from "../tools/void-economic-evm-successor-migration-v1.mjs";
import {
  VOID_WC_VOID_COUPLED_LAUNCH_READINESS_V1,
  classifyVoidWcVoidCoupledLaunchReadinessV1,
} from "../tools/void-wc-void-coupled-launch-readiness-v1.mjs";

const production = JSON.parse(
  fs.readFileSync("ops/mainnet0/wc-void-production-candidate-v1.json", "utf8"),
);
const coupled = JSON.parse(
  fs.readFileSync("ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json", "utf8"),
);
const successor = JSON.parse(
  fs.readFileSync("ops/mainnet0/economic-evm-successor-migration-candidate-v1.json", "utf8"),
);
const current = classifyBuyLaunchGateV1({ production, coupled, successor });
assert.equal(current.ready, false);
assert.equal(current.id, VOID_BUY_COUPLED_LAUNCH_ID_V1);
assert.deepEqual(readBuyLaunchGateV1(), current);

const readyProduction = structuredClone(production);
readyProduction.status = "source_ready";
readyProduction.coupled_activation_ready = true;
readyProduction.bounded_canary_green = true;
readyProduction.wc_ledger_persistence_verified = true;
readyProduction.quote_reserve_custody_verified = true;
readyProduction.participant_opening_claim_policy_ready = true;
readyProduction.duplicate_replay_protection_proven = true;
readyProduction.market_vault_independently_verified = true;
readyProduction.inventory_funded = true;
readyProduction.inventory_lock_proven = true;
readyProduction.market_vault_address = "0x1111111111111111111111111111111111111111";
readyProduction.market_vault_runtime_code_sha256 = "1".repeat(64);

const readyCoupled = structuredClone(coupled);
readyCoupled.status = "SOURCE_READY";
for (const key of Object.keys(readyCoupled.gates)) readyCoupled.gates[key] = true;

const currentSuccessorDecision =
  classifyVoidEconomicEvmSuccessorMigrationV1(successor);
assert.equal(currentSuccessorDecision.ok, false);
assert.equal(currentSuccessorDecision.status, "HOLD");
assert.deepEqual(
  [...currentSuccessorDecision.missing_gates].sort(),
  [
    "public_economic_verification_path_required",
    "successor_state_root_public_void_anchor_required",
  ],
);

const currentSuccessorHold = classifyBuyLaunchGateV1({
  production: readyProduction,
  coupled: readyCoupled,
  successor,
});
assert.equal(currentSuccessorHold.ready, false);
assert.equal(currentSuccessorHold.id, VOID_BUY_COUPLED_LAUNCH_ID_V1);

const readySuccessor = structuredClone(successor);
readySuccessor.status = "SOURCE_READY";
readySuccessor.public_verification.successor_state_root_public_void_anchor_ready = true;
readySuccessor.public_verification.public_balance_receipt_code_verification_ready = true;
const readySuccessorDecision =
  classifyVoidEconomicEvmSuccessorMigrationV1(readySuccessor);
assert.equal(readySuccessorDecision.ok, true);
assert.equal(readySuccessorDecision.status, "SOURCE_READY");
assert.equal(readySuccessorDecision.migration_authorized, false);
assert.equal(readySuccessorDecision.public_activation_authorized, false);
assert.equal(readySuccessorDecision.money_movement_authorized, false);

const canonicalReady =
  classifyVoidWcVoidCoupledLaunchReadinessV1({
    production_candidate: readyProduction,
    coupled_candidate: readyCoupled,
    successor_migration_candidate: readySuccessor,
  });
assert.equal(canonicalReady.ok, true);
assert.equal(canonicalReady.status, "SOURCE_READY");
assert.equal(
  canonicalReady.marker,
  VOID_WC_VOID_COUPLED_LAUNCH_READINESS_V1,
);

// Canonical SOURCE_READY is necessary but not sufficient for public intake.
// These source-policy bundles still explicitly report that deployment/runtime
// evidence and launch-selected production values are not ready.
assert.equal(
  readyProduction.market_vault_compiled_identity_acceptance.deployment_attested,
  false,
);
assert.equal(
  readyProduction.market_vault_compiled_identity_acceptance
    .final_role_bindings_attested,
  false,
);
assert.equal(
  readyProduction.market_vault_compiled_identity_acceptance
    .deployed_runtime_code_observed,
  false,
);
assert.equal(
  readyProduction.wc_settlement_adapter_review.live_ledger_persistence_verified,
  false,
);
assert.equal(
  readyCoupled.opening_nonproduction_wc_exclusion_policy
    .runtime_or_launch_evidence,
  false,
);
assert.equal(
  readyCoupled.opening_participant_provenance_eligibility_policy
    .runtime_or_launch_evidence,
  false,
);
assert.equal(
  readyCoupled.opening_concentration_sybil_policy_contract
    .production_cap_values_hardcoded,
  false,
);
assert.equal(
  readyCoupled.opening_concentration_sybil_policy_contract
    .runtime_enforcement_verified,
  false,
);
assert.equal(
  readyCoupled.opening_concentration_sybil_policy_contract
    .related_identity_truth_verified,
  false,
);
assert.equal(
  readyCoupled.opening_minimum_real_wc_depth_policy_contract
    .production_minimum_real_wc_value_hardcoded,
  false,
);
assert.equal(
  readyCoupled.opening_minimum_real_wc_depth_policy_contract
    .runtime_enforcement_verified,
  false,
);
assert.equal(
  readyCoupled.reverse_void_to_wc_settlement_policy.runtime_or_launch_evidence,
  false,
);
assert.equal(
  readyCoupled.economic_intent_ttl_caps_policy_contract
    .production_ttl_value_hardcoded,
  false,
);
assert.equal(
  readyCoupled.economic_intent_ttl_caps_policy_contract
    .runtime_enforcement_verified,
  false,
);
assert.equal(
  readyCoupled.system_sponsored_execution_anti_grief_policy_contract
    .production_budget_values_hardcoded,
  false,
);
assert.equal(
  readyCoupled.system_sponsored_execution_anti_grief_policy_contract
    .runtime_enforcement_verified,
  false,
);
assert.equal(
  readyCoupled.shared_post_discovery_reconciliation.runtime_or_launch_evidence,
  false,
);

const topLevelOnlyCannotOpen = classifyBuyLaunchGateV1({
  production: readyProduction,
  coupled: readyCoupled,
  successor: readySuccessor,
});
assert.equal(topLevelOnlyCannotOpen.ready, false);
assert.equal(topLevelOnlyCannotOpen.id, VOID_BUY_COUPLED_LAUNCH_ID_V1);

// Changing one nested source-policy field without the reviewed source-policy
// definition moving with it is also rejected by the canonical classifier.
const nestedPolicyDrift = structuredClone(readyCoupled);
nestedPolicyDrift.opening_concentration_sybil_policy_contract
  .runtime_enforcement_verified = true;
const canonicalNestedDrift =
  classifyVoidWcVoidCoupledLaunchReadinessV1({
    production_candidate: readyProduction,
    coupled_candidate: nestedPolicyDrift,
    successor_migration_candidate: readySuccessor,
  });
assert.equal(canonicalNestedDrift.ok, false);
assert.equal(canonicalNestedDrift.status, "HOLD");
assert.match(
  canonicalNestedDrift.reason,
  /opening_concentration_sybil_policy_contract_mismatch:runtime_enforcement_verified/,
);
assert.equal(
  classifyBuyLaunchGateV1({
    production: readyProduction,
    coupled: nestedPolicyDrift,
    successor: readySuccessor,
  }).ready,
  false,
);

for (const mutate of [
  (p, _c, _s) => { p.status = "hold"; },
  (p, _c, _s) => { p.coupled_activation_ready = false; },
  (p, _c, _s) => { p.native_void_token = "0x2222222222222222222222222222222222222222"; },
  (p, _c, _s) => { p.fixed_conversion = true; },
  (_p, c, _s) => { c.gates.bounded_canary_green = false; },
  (_p, c, _s) => { c.execution_policy.raw_public_rpc_allowed = true; },
  (_p, c, _s) => { c.wc_void_opening.fixed_conversion = true; },
  (_p, c, _s) => {
    c.shared_post_discovery_reconciliation.coupled_launch_id =
      "sha256:" + "0".repeat(64);
  },
  (_p, c, _s) => { c.wc_void_opening.protocol_void_inventory_atoms = "1"; },
  (p, _c, _s) => { p.authority.market_activation = true; },
  (p, _c, _s) => { delete p.authority.market_activation; },
  (p, _c, _s) => { p.authority.unexpected_authority = false; },
  (_p, c, _s) => {
    delete c.gates.participant_post_purchase_voidtoken_control_ready;
  },
  (_p, c, _s) => { c.gates.unexpected_gate = true; },
  (_p, c, _s) => { delete c.authority.funds_movement; },
  (_p, c, _s) => { c.authority.unexpected_authority = false; },
  (_p, _c, s) => { delete s.launch_authority.money_movement; },
  (_p, _c, s) => { s.launch_authority.unexpected_authority = false; },
  (_p, _c, s) => {
    s.public_verification.successor_state_root_public_void_anchor_ready = false;
  },
  (_p, _c, s) => {
    s.public_verification.public_balance_receipt_code_verification_ready = false;
  },
]) {
  const p = structuredClone(readyProduction);
  const c = structuredClone(readyCoupled);
  const successorCandidate = structuredClone(readySuccessor);
  mutate(p, c, successorCandidate);
  assert.equal(
    classifyBuyLaunchGateV1({
      production: p,
      coupled: c,
      successor: successorCandidate,
    }).ready,
    false,
  );
}

console.log("VOID_BUY_COUPLED_LAUNCH_GATE_V1_GREEN");
console.log("current_canonical_source_ready=false");
console.log("coupled_launch_id=" + VOID_BUY_COUPLED_LAUNCH_ID_V1);
console.log("canonical_coupled_launch_classifier_required=true");
console.log("canonical_source_ready_alone_can_open_intake=false");
console.log("nested_production_runtime_evidence_required=true");
console.log("nested_coupled_runtime_evidence_required=true");
console.log("top_level_only_bypass=false");
console.log("successor_classifier_source_ready_required=true");
console.log("current_successor_classifier_status=HOLD");
console.log("activation_authority=false");
console.log("funds_movement=false");
