import assert from "node:assert/strict";
import {
  readBuyVoidCanonicalPresaleServerPolicyV1,
  readBuyVoidCrashConsistentSagaServerPolicyV1,
  VOID_BUY_VOID_CANONICAL_DUAL_RAIL_PAYMENT_ENVS_V1,
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_AUTHORITY_V1,
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1,
} from "../src/economic/buy_void_crash_consistent_saga_server_policy_v1.js";

const MARKER = "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_V1";
const USDC = "0x6666666666666666666666666666666666666666";
const RECEIVE = "0x8888888888888888888888888888888888888888";
const WALLET = "0x4444444444444444444444444444444444444444";
const POOL_ID = "void-presale-mainnet0-v1";
const BASE_USDC = "0x1111111111111111111111111111111111111111";
const BASE_RECEIVE = "0x2222222222222222222222222222222222222222";
const ETH_USDC = "0x3333333333333333333333333333333333333333";
const ETH_RECEIVE = "0x4444444444444444444444444444444444444444";

function configuredEnv(): NodeJS.ProcessEnv {
  return {
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.payment_chain]:
      "ethereum",
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.payment_usdc_contract]:
      USDC,
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.payment_receive_address]:
      RECEIVE,
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.payment_current_block_number]:
      "123475",
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.payment_min_confirmations]:
      "12",
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.rate_void_units_numerator]:
      "2",
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.rate_void_units_denominator]:
      "1",
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.inventory_policy_version]:
      "proof-policy-v1",
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.pool_id]:
      POOL_ID,
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.pool_capacity_void_units]:
      "10000000",
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.max_reservation_void_units]:
      "5000000",
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.fulfillment_wallet_address]:
      WALLET,
  };
}

function canonicalDualRailEnv(): NodeJS.ProcessEnv {
  const common = VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1;
  const dual = VOID_BUY_VOID_CANONICAL_DUAL_RAIL_PAYMENT_ENVS_V1;
  return {
    [common.rate_void_units_numerator]: "2",
    [common.rate_void_units_denominator]: "1",
    [common.inventory_policy_version]: "presale-v1",
    [common.pool_id]: "buy-void-presale-v1",
    [common.pool_capacity_void_units]: "10000000000000",
    [common.max_reservation_void_units]: "10000000000000",
    [common.fulfillment_wallet_address]: WALLET,
    [dual.base.usdc_contract]: BASE_USDC,
    [dual.base.receive_address]: BASE_RECEIVE,
    [dual.base.finalized_reference_block]: "123475",
    [dual.base.min_confirmations]: "12",
    [dual.ethereum.usdc_contract]: ETH_USDC,
    [dual.ethereum.receive_address]: ETH_RECEIVE,
    [dual.ethereum.finalized_reference_block]: "987654",
    [dual.ethereum.min_confirmations]: "15",
  };
}

function changedStableValue(name: string): string {
  const names = VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1;
  if (name === names.payment_chain) return "base";
  if (name === names.payment_usdc_contract) {
    return "0x7777777777777777777777777777777777777777";
  }
  if (name === names.payment_receive_address) {
    return "0x9999999999999999999999999999999999999999";
  }
  if (name === names.payment_min_confirmations) return "13";
  if (name === names.rate_void_units_numerator) return "3";
  if (name === names.rate_void_units_denominator) return "2";
  if (name === names.inventory_policy_version) return "proof-policy-v2";
  if (name === names.pool_id) return "void-presale-mainnet0-v2";
  if (name === names.pool_capacity_void_units) return "11000000";
  if (name === names.max_reservation_void_units) return "4000000";
  if (name === names.fulfillment_wallet_address) {
    return "0x5555555555555555555555555555555555555555";
  }
  throw new Error(`unmapped_stable_policy_env:${name}`);
}

function main(): void {
  const missing = readBuyVoidCrashConsistentSagaServerPolicyV1({});
  assert.equal(missing.ok, false);
  if (missing.ok) throw new Error("missing policy unexpectedly configured");
  assert.equal(missing.reason, "server_policy_not_configured");
  assert.equal(
    missing.missing_envs.length,
    Object.keys(VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1).length,
  );

  const env = configuredEnv();
  const ready = readBuyVoidCrashConsistentSagaServerPolicyV1(env);
  if (!ready.ok) throw new Error(ready.reason);
  assert.equal(ready.ok, true);
  const policy = ready.policy;

  assert.deepEqual(policy.verification_policy, {
    allowed_chains: ["ethereum"],
    usdc_contract_by_chain: { ethereum: USDC },
    receive_address_by_chain: { ethereum: RECEIVE },
    current_block_number_by_chain: { ethereum: 123475 },
  });
  assert.deepEqual(policy.fulfillment_policy, {
    automatic_fulfillment_enabled: true,
    allowed_chains: ["ethereum"],
    min_confirmations_by_chain: { ethereum: 12 },
    usdc_contract_by_chain: { ethereum: USDC },
    receive_address_by_chain: { ethereum: RECEIVE },
    rate_void_units_numerator: "2",
    rate_void_units_denominator: "1",
    pool_remaining_void_units: "10000000",
    exact_payment_required: true,
  });
  assert.deepEqual(policy.inventory_policy, {
    inventory_reservation_enabled: true,
    pool_id: POOL_ID,
    inventory_policy_version: "proof-policy-v1",
    pool_capacity_void_units: "10000000",
    max_reservation_void_units: "5000000",
  });
  assert.deepEqual(policy.execution_policy, {
    attempt_journal_enabled: true,
    max_attempts_per_payment: 1,
    chain_id: "2050",
    fulfillment_wallet_allowlist: [WALLET],
  });
  assert.equal(policy.public_summary.pool_id, POOL_ID);

  for (const value of Object.values(policy.fingerprints)) {
    assert.match(value, /^[0-9a-f]{64}$/);
  }
  assert.match(
    policy.saga_policy_id,
    /^void-buy-void-saga-runtime-policy-v1-[0-9a-f]{64}$/,
  );
  assert.ok(
    policy.saga_policy_id.endsWith(
      policy.fingerprints.combined_policy_sha256,
    ),
  );

  const advancedHeadEnv = {
    ...env,
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.payment_current_block_number]:
      "123476",
  };
  const advanced = readBuyVoidCrashConsistentSagaServerPolicyV1(advancedHeadEnv);
  if (!advanced.ok) throw new Error(advanced.reason);
  assert.equal(advanced.ok, true);
  assert.equal(
    advanced.policy.fingerprints.combined_policy_sha256,
    policy.fingerprints.combined_policy_sha256,
  );
  assert.notEqual(
    advanced.policy.fingerprints.verification_observation_sha256,
    policy.fingerprints.verification_observation_sha256,
  );

  const stablePolicyFields = [
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.payment_chain,
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.payment_usdc_contract,
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.payment_receive_address,
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.payment_min_confirmations,
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.rate_void_units_numerator,
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.rate_void_units_denominator,
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.inventory_policy_version,
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.pool_id,
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.pool_capacity_void_units,
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.max_reservation_void_units,
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.fulfillment_wallet_address,
  ];
  for (const name of stablePolicyFields) {
    const changedEnv = { ...env, [name]: changedStableValue(name) };
    const changed = readBuyVoidCrashConsistentSagaServerPolicyV1(changedEnv);
    if (!changed.ok) throw new Error(`${name}:${changed.reason}`);
    assert.equal(changed.ok, true, name);
    assert.notEqual(
      changed.policy.fingerprints.combined_policy_sha256,
      policy.fingerprints.combined_policy_sha256,
      name,
    );
  }

  assert.deepEqual(policy.public_summary.payment_chains, ["ethereum"]);
  assert.deepEqual(policy.public_summary.payment_min_confirmations_by_chain, {
    ethereum: 12,
  });

  const dualEnv = canonicalDualRailEnv();
  const dualDecision = readBuyVoidCanonicalPresaleServerPolicyV1(dualEnv);
  if (!dualDecision.ok) throw new Error(dualDecision.reason);
  const dualPolicy = dualDecision.policy;
  assert.deepEqual(dualPolicy.verification_policy.allowed_chains, [
    "base",
    "ethereum",
  ]);
  assert.deepEqual(dualPolicy.verification_policy.usdc_contract_by_chain, {
    base: BASE_USDC,
    ethereum: ETH_USDC,
  });
  assert.deepEqual(dualPolicy.verification_policy.receive_address_by_chain, {
    base: BASE_RECEIVE,
    ethereum: ETH_RECEIVE,
  });
  assert.deepEqual(
    dualPolicy.verification_policy.current_block_number_by_chain,
    { base: 123475, ethereum: 987654 },
  );
  assert.deepEqual(dualPolicy.fulfillment_policy.allowed_chains, [
    "base",
    "ethereum",
  ]);
  assert.deepEqual(dualPolicy.fulfillment_policy.min_confirmations_by_chain, {
    base: 12,
    ethereum: 15,
  });
  assert.deepEqual(dualPolicy.public_summary.payment_chains, [
    "base",
    "ethereum",
  ]);
  assert.deepEqual(
    dualPolicy.public_summary.payment_min_confirmations_by_chain,
    { base: 12, ethereum: 15 },
  );
  assert.equal(
    dualPolicy.inventory_policy.pool_id,
    "buy-void-presale-v1",
  );
  assert.equal(
    dualPolicy.inventory_policy.pool_capacity_void_units,
    "10000000000000",
  );
  assert.equal(
    dualPolicy.fulfillment_policy.rate_void_units_numerator,
    "2",
  );
  assert.equal(
    dualPolicy.fulfillment_policy.rate_void_units_denominator,
    "1",
  );

  const dualPublicText = JSON.stringify(dualPolicy.public_summary);
  for (const hidden of [
    BASE_USDC,
    BASE_RECEIVE,
    ETH_USDC,
    ETH_RECEIVE,
    WALLET,
  ]) {
    assert.equal(dualPublicText.includes(hidden), false);
  }

  const dualAdvancedEnv = {
    ...dualEnv,
    [VOID_BUY_VOID_CANONICAL_DUAL_RAIL_PAYMENT_ENVS_V1.base.finalized_reference_block]:
      "123476",
  };
  const dualAdvanced =
    readBuyVoidCanonicalPresaleServerPolicyV1(dualAdvancedEnv);
  if (!dualAdvanced.ok) throw new Error(dualAdvanced.reason);
  assert.equal(
    dualAdvanced.policy.fingerprints.combined_policy_sha256,
    dualPolicy.fingerprints.combined_policy_sha256,
  );
  assert.notEqual(
    dualAdvanced.policy.fingerprints.verification_observation_sha256,
    dualPolicy.fingerprints.verification_observation_sha256,
  );

  const dualStableChanged = readBuyVoidCanonicalPresaleServerPolicyV1({
    ...dualEnv,
    [VOID_BUY_VOID_CANONICAL_DUAL_RAIL_PAYMENT_ENVS_V1.ethereum.usdc_contract]:
      "0x5555555555555555555555555555555555555555",
  });
  if (!dualStableChanged.ok) throw new Error(dualStableChanged.reason);
  assert.notEqual(
    dualStableChanged.policy.fingerprints.combined_policy_sha256,
    dualPolicy.fingerprints.combined_policy_sha256,
  );

  const partialDual = { ...dualEnv };
  delete partialDual[
    VOID_BUY_VOID_CANONICAL_DUAL_RAIL_PAYMENT_ENVS_V1.ethereum.receive_address
  ];
  const partialDecision =
    readBuyVoidCanonicalPresaleServerPolicyV1(partialDual);
  assert.equal(partialDecision.ok, false);
  if (partialDecision.ok) throw new Error("partial dual policy accepted");
  assert.equal(
    partialDecision.reason,
    "canonical_dual_rail_configuration_incomplete",
  );

  const mixedLegacy = {
    ...dualEnv,
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.payment_chain]:
      "base",
  };
  const mixedDecision =
    readBuyVoidCanonicalPresaleServerPolicyV1(mixedLegacy);
  assert.equal(mixedDecision.ok, false);
  if (mixedDecision.ok) throw new Error("mixed legacy policy accepted");
  assert.equal(
    mixedDecision.reason,
    "canonical_dual_rail_legacy_payment_configuration_present",
  );

  const publicText = JSON.stringify({
    fingerprints: policy.fingerprints,
    summary: policy.public_summary,
  });
  assert.equal(publicText.includes(USDC), false);
  assert.equal(publicText.includes(RECEIVE), false);
  assert.equal(publicText.includes(WALLET), false);
  assert.deepEqual(
    policy.authority,
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_AUTHORITY_V1,
  );

  console.log(`${MARKER}_PROOF_GREEN`);
  console.log("caller_policy_input=false");
  console.log("stable_policy_fingerprint_bound=true");
  console.log("server_controlled_pool_id_fingerprint_bound=true");
  console.log("dynamic_chain_head_changes_stable_fingerprint=false");
  console.log("canonical_dual_rail_complete_set=true");
  console.log("canonical_dual_rail_legacy_mixing_rejected=true");
  console.log("canonical_dual_rail_observation_not_stable_identity=true");
  console.log("wallet_signing_broadcast_money=false");
}

main();
