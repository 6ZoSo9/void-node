import assert from "node:assert/strict";
import {
  readBuyVoidCrashConsistentSagaServerPolicyV1,
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_AUTHORITY_V1,
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1,
} from "../src/economic/buy_void_crash_consistent_saga_server_policy_v1.js";

const MARKER = "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_V1";
const USDC = "0x6666666666666666666666666666666666666666";
const RECEIVE = "0x8888888888888888888888888888888888888888";
const WALLET = "0x4444444444444444444444444444444444444444";

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
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.pool_capacity_void_units]:
      "10000000",
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.max_reservation_void_units]:
      "5000000",
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.fulfillment_wallet_address]:
      WALLET,
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
    pool_id: "void-fixed-price-pool-v1",
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
  console.log("dynamic_chain_head_changes_stable_fingerprint=false");
  console.log("wallet_signing_broadcast_money=false");
}

main();
