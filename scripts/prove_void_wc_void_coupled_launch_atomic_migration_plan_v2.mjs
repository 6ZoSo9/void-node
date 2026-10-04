#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const PLAN =
  "ops/mainnet0/wc-void-coupled-launch-atomic-migration-plan-v2.json";

const plan = JSON.parse(fs.readFileSync(PLAN, "utf8"));

assert.equal(
  plan.marker,
  "VOID_WC_VOID_COUPLED_LAUNCH_ATOMIC_MIGRATION_PLAN_V2",
);
assert.equal(plan.version, 2);
assert.equal(
  plan.status,
  "CORRECTED_COUPLED_LAUNCH_MIGRATION_PLAN_READY_NOT_APPLIED",
);

assert.equal(
  plan.identities.superseded_coupled_launch_id,
  "sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26",
);
assert.equal(
  plan.identities.corrected_coupled_launch_id,
  "sha256:b893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d",
);
assert.equal(
  plan.identities.corrected_wc_opening_state_id,
  "sha256:8f027c95e3b2376a50957600c57e9afe4c0e06422de05f1f8691fe44f0da54af",
);
assert.equal(
  plan.identities.corrected_reconciliation_id,
  "sha256:9b74e695f3988b4bcaa7abcdbdb767ea927fc294440a1ff2ecfbcd4db9bf7f04",
);
assert.equal(
  plan.identities.corrected_creation_bytecode_sha256,
  "84bbf44ee873c9e8b271271d8d3dc10bf6bb58d38b0d7da26558275510c0d540",
);
assert.equal(
  plan.identities.corrected_runtime_template_sha256,
  "99a7179850af5a6e13c1a1b24cf873b011a98fcc8d54479722c20fc254188f7e",
);

assert.equal(plan.canonical_state_and_policy_updates.length, 16);
assert.equal(plan.focused_proof_updates.length, 13);
assert.equal(plan.operator_documentation_updates.length, 9);
assert.equal(
  plan.historical_evidence_retained_without_identity_rewrite.length,
  6,
);

for (const key of [
  "canonical_state_and_policy_updates",
  "focused_proof_updates",
  "operator_documentation_updates",
  "historical_evidence_retained_without_identity_rewrite",
]) {
  assert.ok(Array.isArray(plan[key]), key);
  assert.ok(plan[key].length > 0, key);
  assert.equal(new Set(plan[key]).size, plan[key].length, key + ":duplicates");
  for (const value of plan[key]) {
    assert.equal(typeof value, "string", key + ":path");
    assert.ok(value.length > 0, key + ":path-empty");
  }
}

const active = new Set([
  ...plan.canonical_state_and_policy_updates,
  ...plan.focused_proof_updates,
  ...plan.operator_documentation_updates,
]);
for (const historical of
  plan.historical_evidence_retained_without_identity_rewrite) {
  assert.equal(
    active.has(historical),
    false,
    "historical_path_must_not_be_in_active_update_set:" + historical,
  );
}

assert.ok(
  plan.canonical_state_and_policy_updates.includes(
    "ops/nimo/void-nimo-wc-void-launch-controller-control-signing-v1.mjs",
  ),
);
assert.ok(
  plan.canonical_state_and_policy_updates.includes(
    "tools/void-wc-void-market-vault-role-deployment-qualification-v1.mjs",
  ),
);
assert.ok(
  plan.canonical_state_and_policy_updates.includes(
    "tools/void-btc-void-atomic-settlement-state-invariants-v1.mjs",
  ),
);
assert.ok(
  plan.canonical_state_and_policy_updates.includes(
    "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json",
  ),
);
assert.ok(
  plan.canonical_state_and_policy_updates.includes(
    "ops/mainnet0/wc-void-production-candidate-v1.json",
  ),
);

assert.deepEqual(plan.execution_order, [
  "merge_compiled_identity_correction_v2",
  "merge_corrected_generation_derivation_v2",
  "apply_all_active_coupled_launch_dependencies_in_one_source_only_lane",
  "require_all_focused_proofs_green",
  "mint_fresh_launch_controller_challenge_for_corrected_generation",
  "perform_fresh_offline_control_signature_ceremony",
  "generate_fresh_corrected_role_deployment_qualification",
  "run_live_read_only_market_vault_observation",
  "separately_review_deployment_fee_nonce_and_authority",
]);

for (const value of Object.values(plan.fail_closed_rules)) {
  assert.equal(value, false);
}

for (const [key, value] of Object.entries(plan.authority)) {
  assert.equal(value, key === "source_plan_only", key);
}

console.log(
  "VOID_WC_VOID_COUPLED_LAUNCH_ATOMIC_MIGRATION_PLAN_V2_PROOF_GREEN",
);
console.log(
  "corrected_coupled_launch_id=" +
    plan.identities.corrected_coupled_launch_id,
);
console.log(
  "corrected_wc_opening_state_id=" +
    plan.identities.corrected_wc_opening_state_id,
);
console.log(
  "corrected_reconciliation_id=" +
    plan.identities.corrected_reconciliation_id,
);
console.log(
  "active_source_update_count=" +
    plan.canonical_state_and_policy_updates.length,
);
console.log(
  "focused_proof_update_count=" +
    plan.focused_proof_updates.length,
);
console.log(
  "historical_retained_count=" +
    plan.historical_evidence_retained_without_identity_rewrite.length,
);
console.log("repository_application=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("funds_movement=false");
