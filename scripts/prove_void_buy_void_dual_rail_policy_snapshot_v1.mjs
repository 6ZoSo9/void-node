#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_DUAL_RAIL_V1 as ECONOMICS,
  VOID_BUY_VOID_DUAL_RAIL_DEFINITIONS_V1 as DEFINITIONS,
  VOID_BUY_VOID_DUAL_RAIL_ENV_V1 as ENV,
  VOID_BUY_VOID_DUAL_RAIL_ORDER_V1 as ORDER,
  VOID_BUY_VOID_DUAL_RAIL_SERVER_POLICY_AUTHORITY_V1 as AUTHORITY,
  VOID_BUY_VOID_LEGACY_SINGLE_CHAIN_ENV_V1 as LEGACY,
  evaluateBuyVoidDualRailPaymentFinalityV1,
  readBuyVoidDualRailServerPolicyContractV1 as readPolicy,
  validateBuyVoidDualRailServerPolicyObjectV1 as validatePolicy,
} from "./lib/void_buy_void_dual_rail_server_policy_contract_v1.mjs";
import {
  VOID_BUY_VOID_DUAL_RAIL_AUTHORITY_ISOLATION_BOUNDARY_V1 as BOUNDARY,
  assertBuyVoidDualRailAuthorityIsolationV1 as assertIsolation,
  readBuyVoidDualRailAuthorityIsolatedPolicyV1 as readIsolated,
  validateBuyVoidDualRailAuthorityIsolatedPolicyV1 as validateIsolated,
} from "./lib/void_buy_void_dual_rail_authority_isolation_v1.mjs";

let cases = 0;
function check(name, fn) {
  try {
    fn();
    cases += 1;
  } catch (error) {
    error.message = `${name}: ${error.message}`;
    throw error;
  }
}

// Deliberately literal: mutating an exported ENV/ORDER must not mutate this oracle.
function environment() {
  return {
    VOID_BUY_VOID_DUAL_RAIL_BASE_USDC_CONTRACT: `0x${"1".repeat(40)}`,
    VOID_BUY_VOID_DUAL_RAIL_BASE_RECEIVE_ADDRESS: `0x${"2".repeat(40)}`,
    VOID_BUY_VOID_DUAL_RAIL_BASE_RPC_IDENTITY: "rpc:base",
    VOID_BUY_VOID_DUAL_RAIL_BASE_FINALITY_ADAPTER_ID: "finality:base",
    VOID_BUY_VOID_DUAL_RAIL_BASE_MIN_CONFIRMATIONS: "2",
    VOID_BUY_VOID_DUAL_RAIL_BASE_FINALIZED_REFERENCE_BLOCK: "100",
    VOID_BUY_VOID_DUAL_RAIL_ETHEREUM_USDC_CONTRACT: `0x${"3".repeat(40)}`,
    VOID_BUY_VOID_DUAL_RAIL_ETHEREUM_RECEIVE_ADDRESS: `0x${"2".repeat(40)}`,
    VOID_BUY_VOID_DUAL_RAIL_ETHEREUM_RPC_IDENTITY: "rpc:ethereum",
    VOID_BUY_VOID_DUAL_RAIL_ETHEREUM_FINALITY_ADAPTER_ID: "finality:ethereum",
    VOID_BUY_VOID_DUAL_RAIL_ETHEREUM_MIN_CONFIRMATIONS: "2",
    VOID_BUY_VOID_DUAL_RAIL_ETHEREUM_FINALIZED_REFERENCE_BLOCK: "200",
  };
}
function configured() {
  const result = readIsolated(environment());
  assert.equal(result.ok, true, JSON.stringify(result));
  return result;
}
function attempt(write) {
  try { write(); }
  catch (error) { assert.ok(error instanceof TypeError); }
}
function assertFrozenTree(value) {
  if (value === null || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertFrozenTree(child);
}
const baseline = structuredClone(configured());
function assertCanonical() {
  const fresh = configured();
  assert.deepEqual(fresh, baseline);
  assert.equal(fresh.policy.economics.rate_void_units_numerator, "2");
  assert.equal(fresh.policy.economics.canonical_presale_max_void, "10000000");
  assert.equal(fresh.policy.public_summary.rate_void_per_usdc, "2");
  assert.equal(fresh.policy.public_summary.canonical_presale_max_void, "10000000");
  assert.equal(fresh.policy.authority.money_movement, false);
  assert.equal(fresh.policy.authority.public_presale_activation, false);
  assert.equal(fresh.isolation.boundary.money_movement, false);
  assert.deepEqual(validatePolicy(fresh.policy), baseline.policy);
}

check("returned economics cannot poison later readers", () => {
  const first = configured();
  attempt(() => { first.policy.economics.rate_void_units_numerator = "200"; });
  assertCanonical();
});
check("returned cap cannot poison canonical inventory", () => {
  attempt(() => { configured().policy.economics.canonical_presale_max_void = "999999999999"; });
  assertCanonical();
});
for (const key of Object.keys(AUTHORITY)) {
  check(`returned authority cannot poison ${key}`, () => {
    const policy = configured().policy;
    attempt(() => { policy.authority[key] = !baseline.policy.authority[key]; });
    assertCanonical();
  });
}
check("exported economics is not a writable trust root", () => {
  attempt(() => { ECONOMICS.exact_payment_required = false; });
  attempt(() => { ECONOMICS.one_payment_one_fulfillment = false; });
  assertCanonical();
});
check("exported Base definition cannot become Ethereum", () => {
  attempt(() => { DEFINITIONS.base.evm_chain_id = "1"; });
  assertCanonical();
});
check("exported Ethereum definition cannot become Base", () => {
  attempt(() => { DEFINITIONS.ethereum.evm_chain_id = "8453"; });
  assertCanonical();
});
check("exported rail order cannot be reversed", () => {
  attempt(() => { ORDER.reverse(); });
  assertCanonical();
});
check("exported environment map cannot redirect an authority", () => {
  attempt(() => { ENV.base.rpc_identity = ENV.ethereum.rpc_identity; });
  assertCanonical();
});
check("legacy migration rejection cannot be deleted", () => {
  attempt(() => { LEGACY.length = 0; });
  const result = readPolicy({ ...environment(), VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_CHAIN: "base" });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "legacy_single_chain_configuration_present");
});
check("isolation report cannot elevate later boundary reports", () => {
  attempt(() => { configured().isolation.boundary.money_movement = true; });
  attempt(() => { BOUNDARY.public_presale_activation = true; });
  assertCanonical();
});
check("property redefinition and prototype replacement are rejected", () => {
  assert.equal(Reflect.defineProperty(ECONOMICS, "rate_void_units_numerator", { value: "200" }), false);
  assert.equal(Reflect.setPrototypeOf(DEFINITIONS.base, { evm_chain_id: "1" }), false);
  assertCanonical();
});
check("JSON validation returns a detached immutable value", () => {
  const input = structuredClone(baseline.policy);
  const accepted = validatePolicy(input);
  assert.notEqual(accepted, input);
  assert.notEqual(accepted.rails, input.rails);
  assertFrozenTree(accepted);
  assert.equal(Object.isFrozen(input), false);
  input.rails[0].rpc_identity = "rpc:changed-after-admission";
  input.rails[0].finality.finalized_reference_block = "999999";
  input.economics.rate_void_units_numerator = "200";
  assert.deepEqual(accepted, baseline.policy);
  assert.throws(() => validatePolicy(input));
  assertCanonical();
});
check("isolated validation returns the same admitted snapshot generation", () => {
  const input = structuredClone(baseline.policy);
  const accepted = validateIsolated(input);
  assert.notEqual(accepted, input);
  input.rails[1].rpc_identity = input.rails[0].rpc_identity;
  input.authority.public_presale_activation = true;
  assert.deepEqual(accepted, baseline.policy);
  assertFrozenTree(accepted);
  assert.equal(assertIsolation(accepted).policy_id, accepted.policy_id);
});
check("all exported contract trees are immutable", () => {
  for (const value of [ECONOMICS, DEFINITIONS, ENV, ORDER, AUTHORITY, LEGACY, BOUNDARY]) assertFrozenTree(value);
});
check("configured decisions and reports are immutable", () => {
  assertFrozenTree(readPolicy(environment()));
  assertFrozenTree(configured());
  assertFrozenTree(assertIsolation(structuredClone(baseline.policy)));
});
check("nested result mutation does not change the admitted value", () => {
  const result = configured();
  attempt(() => { result.policy.rails[0].finality.adapter_id = "finality:ethereum"; });
  attempt(() => { result.policy.public_summary.advertised_chains.pop(); });
  attempt(() => { result.policy.fingerprints.combined_stable_sha256 = "0".repeat(64); });
  attempt(() => { result.isolation.policy_id = "forged"; });
  attempt(() => { result.ok = false; });
  assert.deepEqual(result, baseline);
});
check("policy reader never freezes caller environment", () => {
  const env = environment();
  readPolicy(env);
  assert.equal(Object.isFrozen(env), false);
  env.VOID_BUY_VOID_DUAL_RAIL_BASE_MIN_CONFIRMATIONS = "3";
  assert.equal(readPolicy(env).ok, true);
});
check("observation refresh preserves stable identity", () => {
  const env = environment();
  env.VOID_BUY_VOID_DUAL_RAIL_BASE_FINALIZED_REFERENCE_BLOCK = "101";
  const changed = readIsolated(env);
  assert.equal(changed.ok, true);
  assert.equal(changed.policy.policy_id, baseline.policy.policy_id);
  assert.notEqual(changed.policy.fingerprints.observation_sha256, baseline.policy.fingerprints.observation_sha256);
  assertCanonical();
});
check("legitimate server policy changes remain distinguishable", () => {
  const env = environment();
  env.VOID_BUY_VOID_DUAL_RAIL_ETHEREUM_RPC_IDENTITY = "rpc:ethereum:replacement";
  const changed = readIsolated(env);
  assert.equal(changed.ok, true);
  assert.notEqual(changed.policy.policy_id, baseline.policy.policy_id);
  assertCanonical();
});
for (const [field, reason] of [
  ["RPC_IDENTITY", "dual_rail_rpc_identity_collision"],
  ["FINALITY_ADAPTER_ID", "dual_rail_finality_adapter_collision"],
]) {
  check(`existing isolation guard remains closed for ${field}`, () => {
    const env = environment();
    env[`VOID_BUY_VOID_DUAL_RAIL_ETHEREUM_${field}`] = env[`VOID_BUY_VOID_DUAL_RAIL_BASE_${field}`];
    const result = readIsolated(env);
    assert.equal(result.ok, false);
    assert.equal(result.reason, reason);
  });
}
check("serialized policy remains value-compatible", () => {
  const roundTrip = JSON.parse(JSON.stringify(configured().policy));
  assert.deepEqual(validateIsolated(roundTrip), baseline.policy);
});
check("both rails still admit bounded reference observations without money authority", () => {
  for (const [chain, id, reference] of [["base", "8453", "100"], ["ethereum", "1", "200"]]) {
    const result = evaluateBuyVoidDualRailPaymentFinalityV1(configured().policy, {
      source_chain: chain, evm_chain_id: id, transaction_hash: `0x${"a".repeat(64)}`,
      log_index: "0", receipt_block_number: (BigInt(reference) - 1n).toString(),
      observed_finalized_reference_block: reference, confirmations_observed: "2",
      finality_adapter_id: `finality:${chain}`,
    });
    assert.equal(result.ok, true);
    assert.equal(result.fulfillment_authority_granted, false);
    assert.equal(result.inventory_mutation_authority_granted, false);
    assert.equal(result.signing_or_broadcast_authority_granted, false);
  }
});
check("finality output uses admitted policy, not a later caller rewrite", () => {
  const policy = structuredClone(baseline.policy);
  let reads = 0;
  const observation = {
    source_chain: "base", evm_chain_id: "8453", transaction_hash: `0x${"a".repeat(64)}`,
    log_index: "0", receipt_block_number: "99",
    observed_finalized_reference_block: "100", confirmations_observed: "2",
    get finality_adapter_id() {
      reads += 1;
      policy.policy_id = "forged-after-policy-admission";
      policy.fingerprints.combined_stable_sha256 = "0".repeat(64);
      policy.fingerprints.observation_sha256 = "f".repeat(64);
      return "finality:base";
    },
  };
  const result = evaluateBuyVoidDualRailPaymentFinalityV1(policy, observation);
  assert.ok(reads > 0);
  assert.equal(result.ok, true);
  assert.equal(result.policy_id, baseline.policy.policy_id);
  assert.equal(result.stable_config_sha256, baseline.policy.fingerprints.combined_stable_sha256);
  assert.equal(result.observation_sha256, baseline.policy.fingerprints.observation_sha256);
  assert.equal(policy.policy_id, "forged-after-policy-admission");
});
console.log("VOID_BUY_VOID_DUAL_RAIL_POLICY_SNAPSHOT_V1_GREEN");
console.log("canonical_economics_and_authority_not_caller_mutable=true");
console.log("accepted_policy_detached_and_deeply_immutable=true");
console.log("caller_input_not_frozen=true");
console.log("runtime_rpc_signing_broadcast_money=false");
console.log(`cases=${cases}`);
