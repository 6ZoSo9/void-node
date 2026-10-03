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

const ready = classifyBuyLaunchGateV1({
  production: readyProduction,
  coupled: readyCoupled,
  successor: readySuccessor,
});
assert.equal(ready.ready, true);
assert.equal(ready.id, VOID_BUY_COUPLED_LAUNCH_ID_V1);

const nestedPolicyHold = structuredClone(readyCoupled);
nestedPolicyHold.opening_concentration_sybil_policy_contract
  .runtime_enforcement_verified = true;
for (const key of Object.keys(nestedPolicyHold.gates)) {
  assert.equal(nestedPolicyHold.gates[key], true);
}
const canonicalNestedHold =
  classifyVoidWcVoidCoupledLaunchReadinessV1({
    production_candidate: readyProduction,
    coupled_candidate: nestedPolicyHold,
    successor_migration_candidate: readySuccessor,
  });
assert.equal(canonicalNestedHold.ok, false);
assert.equal(canonicalNestedHold.status, "HOLD");
assert.match(
  canonicalNestedHold.reason,
  /opening_concentration_sybil_policy_contract_mismatch:runtime_enforcement_verified/,
);
assert.equal(
  classifyBuyLaunchGateV1({
    production: readyProduction,
    coupled: nestedPolicyHold,
    successor: readySuccessor,
  }).ready,
  false,
);

for (const mutate of [
  (p, _c, _s) => { p.status = "hold"; },
  (p, _c, _s) => { p.coupled_activation_ready = false; },
  (_p, c, _s) => { c.gates.bounded_canary_green = false; },
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
console.log("source_gate_only=true");
console.log("canonical_coupled_launch_classifier_required=true");
console.log("nested_policy_false_positive_blocked=true");
console.log("successor_classifier_source_ready_required=true");
console.log("exact_gate_and_authority_key_sets_required=true");
console.log("current_successor_classifier_status=HOLD");
console.log("activation_authority=false");
console.log("funds_movement=false");
