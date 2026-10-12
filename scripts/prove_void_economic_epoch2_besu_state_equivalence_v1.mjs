#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  VOID_ECONOMIC_EPOCH2_BESU_STATE_EQUIVALENCE_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_BESU_STATE_EQUIVALENCE_CONFIRMATION_V1,
  VOID_ECONOMIC_EPOCH2_BESU_STATE_EQUIVALENCE_V1,
  VoidEconomicEpoch2BesuStateEquivalenceHoldV1,
  classifyVoidEconomicEpoch2BesuStateObservationV1,
  runVoidEconomicEpoch2BesuStateEquivalenceV1,
} from "../tools/void-economic-epoch2-besu-state-equivalence-v1.mjs";

async function expectHold(run, reason) {
  let thrown = null;
  try {
    await run();
  } catch (error) {
    thrown = error;
  }
  assert(thrown, `expected hold: ${reason}`);
  assert(thrown instanceof VoidEconomicEpoch2BesuStateEquivalenceHoldV1);
  assert.equal(thrown.reason, reason);
}

const plan = await runVoidEconomicEpoch2BesuStateEquivalenceV1({
  apply: false,
});

assert.equal(plan.marker, VOID_ECONOMIC_EPOCH2_BESU_STATE_EQUIVALENCE_V1);
assert.equal(plan.version, 1);
assert.equal(plan.status, "PLAN_READY");
assert.equal(plan.rpc_url, "http://127.0.0.1:18552/");
assert.equal(plan.state_manifest_required, true);
assert.equal(plan.block_tag, "0x0");
assert.equal(
  plan.required_confirmation,
  VOID_ECONOMIC_EPOCH2_BESU_STATE_EQUIVALENCE_CONFIRMATION_V1,
);
assert.deepEqual(
  plan.authority,
  VOID_ECONOMIC_EPOCH2_BESU_STATE_EQUIVALENCE_AUTHORITY_V1,
);

for (const key of ["local_manifest_read", "local_besu_rpc_read"]) {
  assert.equal(plan.authority[key], true, key);
}
for (const key of [
  "authoritative_epoch1_rpc_call",
  "authoritative_chain2050_write",
  "rpc_admin_mutation",
  "wallet_access",
  "private_key_access",
  "credential_content_access",
  "transaction_construction",
  "transaction_signing",
  "transaction_submission",
  "transaction_broadcast",
  "token_movement",
  "funds_movement",
  "contract_deployment_transaction",
  "production_validator_set_binding",
  "public_activation",
]) {
  assert.equal(plan.authority[key], false, key);
}

const observation = {
  chain_id: 2050,
  network_id: "2050",
  block_number: "0x0",
  block_hash: "0x" + "1".repeat(64),
  state_root: "0x" + "2".repeat(64),
  base_fee_per_gas: "0x0",
  gas_price: "0x0",
  code_account_count: 4,
  verified_storage_entry_count: 1268,
  native_balance_sum_wei: "0",
  token_total_supply_atoms: "333333333000000000000000000",
  successor_holder_sum_atoms: "333333333000000000000000000",
  staking_validator_count: 126,
  staking_active_validator_count: 126,
  staking_stake_sum_atoms: "126000000000000000000000",
  retired_source_balance_sum_atoms: "0",
  retired_source_code_count: 0,
};

const classified =
  classifyVoidEconomicEpoch2BesuStateObservationV1(observation);

assert.equal(classified.ok, true);
assert.equal(
  classified.status,
  "BESU_CLIENT_SPECIFIC_STATE_EQUIVALENCE_GREEN",
);
assert.equal(classified.client_specific_genesis_built, true);
assert.equal(classified.besu_genesis_parse_verified, true);
assert.equal(classified.client_specific_state_equivalence_proven, true);
assert.equal(classified.zero_base_fee_verified, true);
assert.equal(classified.zero_gas_price_verified, true);
assert.equal(classified.participant_native_gas_balance_required, false);
assert.equal(classified.native_prefunded_account_count, 0);
assert.equal(
  classified.voidtoken_balance_storage_equivalence_verified,
  true,
);
assert.equal(
  classified.voidtoken_supply_storage_equivalence_verified,
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
assert.equal(classified.production_validator_set_bound, false);
assert.equal(classified.offline_successor_equivalence_proven, false);
assert.equal(classified.migration_authorized, false);
assert.equal(classified.public_activation_authorized, false);

for (const [field, value] of [
  ["base_fee_per_gas", "0x1"],
  ["gas_price", "0x1"],
  ["native_balance_sum_wei", "1"],
  ["verified_storage_entry_count", 1267],
  ["retired_source_balance_sum_atoms", "1"],
  ["retired_source_code_count", 1],
]) {
  await expectHold(
    async () =>
      classifyVoidEconomicEpoch2BesuStateObservationV1({
        ...observation,
        [field]: value,
      }),
    "besu_state_observation_mismatch",
  );
}

console.log("VOID_ECONOMIC_EPOCH2_BESU_STATE_EQUIVALENCE_V1_PROOF_GREEN");
console.log("chain_id=2050");
console.log("network_id=2050");
console.log("block_tag=0x0");
console.log("verified_storage_entry_count=1268");
console.log("native_balance_sum_wei=0");
console.log("zero_base_fee_verified=true");
console.log("zero_gas_price_verified=true");
console.log("client_specific_genesis_built=true");
console.log("besu_genesis_parse_verified=true");
console.log("client_specific_state_equivalence_proven=true");
console.log("production_validator_set_bound=false");
console.log("offline_successor_equivalence_proven=false");
console.log("authoritative_chain2050_write=false");
console.log("rpc_admin_mutation=false");
console.log("transaction_submission=false");
console.log("token_movement=false");
console.log("funds_movement=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
