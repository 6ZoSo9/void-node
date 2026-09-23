#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const policy = JSON.parse(fs.readFileSync(
  "ops/mainnet0/void-economic-self-sustainability-bootstrap-discretion-v1.json",
  "utf8",
));

assert.equal(policy.marker, "VOID_ECONOMIC_SELF_SUSTAINABILITY_BOOTSTRAP_DISCRETION_V1");
assert.equal(policy.version, 1);
assert.equal(policy.status, "constraint_only_not_runtime_authority");
assert.equal(policy.network_objective.self_sustaining_routine_operation_target, true);
assert.equal(policy.network_objective.routine_manual_babysitting_end_state, false);
assert.equal(policy.network_objective.premine_permanent_operating_subsidy_target, false);
assert.equal(policy.network_objective.organic_protocol_revenue_should_replace_bootstrap_support_over_time, true);
assert.equal(policy.network_objective.routine_protocol_economics_should_automate_after_separate_proof_and_activation, true);

assert.equal(policy.wc_void.existing_initial_bootstrap_inventory_policy_unchanged, true);
assert.equal(policy.wc_void.market_determined_exchange_required, true);
assert.equal(policy.wc_void.bidirectional_exchange_permitted_when_market_is_separately_enabled, true);
assert.equal(policy.wc_void.fixed_wc_to_void_conversion_or_redemption_ratio, false);
assert.equal(policy.wc_void.wc_issuance_creates_fixed_void_claim, false);
assert.equal(policy.wc_void.guaranteed_treasury_redemption, false);
assert.equal(policy.wc_void.guaranteed_liquidity, false);
assert.equal(policy.wc_void.wc_goods_and_services_use_is_intended_future_demand, true);
assert.equal(policy.wc_void.organic_market_activity_may_return_void_to_pool, true);
assert.equal(policy.wc_void.supplemental_void_liquidity_support_phase, "bootstrap_only");
assert.equal(policy.wc_void.supplemental_void_liquidity_support_authority, "sovereign_discretion");
assert.equal(policy.wc_void.supplemental_void_liquidity_support_required, false);

for (const key of [
  "automatic_treasury_top_up",
  "deterministic_public_top_up_formula",
  "public_top_up_threshold",
  "wc_holder_top_up_entitlement",
  "market_participant_top_up_entitlement",
  "automatic_price_support",
  "automatic_peg",
  "post_bootstrap_routine_manual_liquidity_support_target",
]) assert.equal(policy.wc_void[key], false, key);

for (const key of [
  "validator_reward_accounting",
  "protocol_fee_accounting",
  "ordinary_fee_distribution",
  "routine_network_maintenance_accounting",
  "routine_market_settlement_within_standing_rules",
  "routine_health_monitoring_and_bounded_recovery",
  "ordinary_validator_consensus_under_standing_rules",
]) assert.equal(policy.routine_automation_target[key], true, key);

for (const value of Object.values(policy.reserved_human_authority)) assert.equal(value, false);
for (const value of Object.values(policy.authority)) assert.equal(value, false);

const governance = fs.readFileSync(
  "docs/governance/void-datanet-chain-truth-membrane-wc-exchange-v1.md",
  "utf8",
);
for (const required of [
  "Supplemental WC/VOID liquidity during bootstrap remains Sovereign-discretionary.",
  "There is no automatic treasury top-up trigger",
  "WC holders and market participants have no entitlement to a treasury top-up",
  "future demand may include direct exchange of WC for goods and services",
  "routine network economics and operations should become protocol-automated",
  "Automation does not absorb Sovereign-reserved discretion",
]) assert.ok(governance.includes(required), required);

const market = fs.readFileSync(
  "docs/architecture/void-market-distribution-policy-v1.md",
  "utf8",
);
for (const required of [
  "The initial `10,000,000 VOID` WC/VOID inventory remains the defined opening bootstrap inventory.",
  "No refill schedule, reserve floor, price threshold, depletion threshold, or public formula creates an obligation to add more VOID.",
  "Any supplemental WC/VOID treasury liquidity during bootstrap is a separate Sovereign-discretionary act.",
  "Supplemental discretionary liquidity is a bootstrap mechanism, not the intended steady-state operating model.",
]) assert.ok(market.includes(required), required);

console.log("VOID_ECONOMIC_SELF_SUSTAINABILITY_BOOTSTRAP_DISCRETION_V1_GREEN");
console.log("wc_void_market_price=market_determined");
console.log("wc_void_supplemental_liquidity=sovereign_discretion_bootstrap_only");
console.log("automatic_wc_void_treasury_top_up=false");
console.log("top_up_entitlement=false");
console.log("premine_permanent_operating_subsidy_target=false");
console.log("routine_network_automation_target=true");
console.log("runtime_activation=false");
console.log("liquidity_movement=false");
console.log("treasury_transfer=false");
console.log("chain2050_mutation=false");
console.log("funds_action=false");
