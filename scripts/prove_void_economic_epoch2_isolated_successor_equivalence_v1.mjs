#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  VOID_ECONOMIC_EPOCH2_ISOLATED_SUCCESSOR_EQUIVALENCE_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_ISOLATED_SUCCESSOR_EQUIVALENCE_CONFIRMATION_V1,
  VOID_ECONOMIC_EPOCH2_ISOLATED_SUCCESSOR_EQUIVALENCE_V1,
  VoidEconomicEpoch2IsolatedSuccessorEquivalenceHoldV1,
  classifyVoidEconomicEpoch2IsolatedSuccessorObservationV1,
  runVoidEconomicEpoch2IsolatedSuccessorEquivalenceV1,
} from "../tools/void-economic-epoch2-isolated-successor-equivalence-v1.mjs";

async function expectHold(run, reason) {
  let thrown = null;
  try {
    await run();
  } catch (error) {
    thrown = error;
  }
  assert(thrown, `expected hold: ${reason}`);
  assert(
    thrown instanceof
      VoidEconomicEpoch2IsolatedSuccessorEquivalenceHoldV1,
  );
  assert.equal(thrown.reason, reason);
}

const plan =
  await runVoidEconomicEpoch2IsolatedSuccessorEquivalenceV1({
    apply: false,
  });

assert.equal(
  plan.marker,
  VOID_ECONOMIC_EPOCH2_ISOLATED_SUCCESSOR_EQUIVALENCE_V1,
);
assert.equal(plan.version, 1);
assert.equal(plan.status, "PLAN_READY");
assert.equal(plan.isolated_rpc_url, "http://127.0.0.1:18550/");
assert.equal(plan.state_manifest_required, true);
assert.equal(
  plan.required_confirmation,
  VOID_ECONOMIC_EPOCH2_ISOLATED_SUCCESSOR_EQUIVALENCE_CONFIRMATION_V1,
);
assert.deepEqual(
  plan.authority,
  VOID_ECONOMIC_EPOCH2_ISOLATED_SUCCESSOR_EQUIVALENCE_AUTHORITY_V1,
);

for (const key of [
  "isolated_process_start",
  "isolated_anvil_admin_rpc",
  "isolated_successor_state_mutation",
  "isolated_read_only_verification_rpc",
]) {
  assert.equal(plan.authority[key], true, key);
}
for (const key of [
  "authoritative_epoch1_service_action",
  "authoritative_epoch1_rpc_call",
  "authoritative_chain2050_write",
  "wallet_access",
  "private_key_access",
  "credential_content_access",
  "transaction_construction",
  "transaction_signing",
  "transaction_submission",
  "transaction_broadcast",
  "token_movement",
  "funds_movement",
  "client_specific_genesis_build",
  "production_client_selection",
  "contract_deployment_transaction",
  "public_activation",
]) {
  assert.equal(plan.authority[key], false, key);
}

const observation = {
  chain_id: 2050,
  unlocked_account_count: 0,
  code_account_count: 4,
  injected_storage_entry_count: 1268,
  verified_storage_entry_count: 1268,
  token_total_supply_atoms: "333333333000000000000000000",
  successor_holder_sum_atoms: "333333333000000000000000000",
  staking_validator_count: 126,
  staking_active_validator_count: 126,
  staking_stake_sum_atoms: "126000000000000000000000",
  staking_unbond_sum_atoms: "0",
  retired_source_balance_sum_atoms: "0",
  retired_source_code_count: 0,
};

const classified =
  classifyVoidEconomicEpoch2IsolatedSuccessorObservationV1(observation);

assert.equal(classified.ok, true);
assert.equal(
  classified.status,
  "ISOLATED_SUCCESSOR_EQUIVALENCE_GREEN",
);
assert.equal(
  classified.voidtoken_balance_storage_equivalence_verified,
  true,
);
assert.equal(
  classified.voidtoken_supply_storage_equivalence_verified,
  true,
);
assert.equal(
  classified.successor_total_supply_atomic,
  "333333333000000000000000000",
);
assert.equal(classified.every_holder_balance_conserved, true);
assert.equal(
  classified.successor_holder_sum_matches_successor_total_supply,
  true,
);
assert.equal(classified.source_successor_total_supply_equal, true);
assert.equal(classified.contract_holder_value_conserved, true);
assert.equal(
  classified.no_value_left_trapped_in_retired_contracts,
  true,
);
assert.equal(
  classified.source_successor_holder_balance_equivalence_proven,
  true,
);
assert.equal(
  classified.source_successor_total_supply_equivalence_proven,
  true,
);
assert.equal(
  classified.source_successor_open_obligation_equivalence_proven,
  true,
);
assert.equal(classified.unmapped_voidtoken_atomic_verified_zero, true);
assert.equal(
  classified.orphan_contract_held_void_atomic_verified_zero,
  true,
);
assert.equal(
  classified.isolated_successor_state_equivalence_proven,
  true,
);
assert.equal(classified.offline_successor_equivalence_proven, false);
assert.equal(classified.client_specific_genesis_built, false);
assert.equal(classified.migration_authorized, false);
assert.equal(classified.public_activation_authorized, false);

await expectHold(
  async () =>
    classifyVoidEconomicEpoch2IsolatedSuccessorObservationV1({
      ...observation,
      token_total_supply_atoms:
        "333333332999999999999999999",
    }),
  "isolated_successor_observation_mismatch",
);

await expectHold(
  async () =>
    classifyVoidEconomicEpoch2IsolatedSuccessorObservationV1({
      ...observation,
      retired_source_balance_sum_atoms: "1",
    }),
  "isolated_successor_observation_mismatch",
);

await expectHold(
  async () =>
    classifyVoidEconomicEpoch2IsolatedSuccessorObservationV1({
      ...observation,
      verified_storage_entry_count: 1267,
    }),
  "isolated_successor_observation_mismatch",
);

console.log(
  "VOID_ECONOMIC_EPOCH2_ISOLATED_SUCCESSOR_EQUIVALENCE_V1_PROOF_GREEN",
);
console.log("verified_storage_entry_count=1268");
console.log("token_supply_equivalence_gate=true");
console.log("token_balance_equivalence_gate=true");
console.log("staking_open_obligation_equivalence_gate=true");
console.log("unmapped_voidtoken_zero_gate=true");
console.log("orphan_contract_value_zero_gate=true");
console.log("isolated_successor_state_equivalence_proven=true");
console.log("offline_successor_equivalence_proven=false");
console.log("client_specific_genesis_built=false");
console.log("production_client_selection=false");
console.log("authoritative_chain2050_write=false");
console.log("transaction_submission=false");
console.log("token_movement=false");
console.log("funds_movement=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
