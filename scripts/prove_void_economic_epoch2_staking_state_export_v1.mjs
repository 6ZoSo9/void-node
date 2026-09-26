#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  VOID_ECONOMIC_EPOCH2_STAKING_STATE_EXPORT_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_STAKING_STATE_EXPORT_CONFIRMATION_V1,
  VOID_ECONOMIC_EPOCH2_STAKING_STATE_EXPORT_V1,
  VoidEconomicEpoch2StakingStateExportHoldV1,
  classifyVoidEconomicEpoch2StakingStateObservationV1,
  decodeVoidEconomicEpoch2ValidatorFlagsV1,
  runVoidEconomicEpoch2StakingStateExportV1,
  voidEconomicEpoch2AddStorageWordV1,
  voidEconomicEpoch2DynamicArrayElementSlotV1,
  voidEconomicEpoch2StakingMappingBaseV1,
} from "../tools/void-economic-epoch2-staking-state-export-v1.mjs";

async function expectHold(run, reason) {
  let thrown = null;
  try {
    await run();
  } catch (error) {
    thrown = error;
  }
  assert(thrown, `expected hold: ${reason}`);
  assert(thrown instanceof VoidEconomicEpoch2StakingStateExportHoldV1);
  assert.equal(thrown.reason, reason);
}

const plan = await runVoidEconomicEpoch2StakingStateExportV1({ apply: false });

assert.equal(plan.marker, VOID_ECONOMIC_EPOCH2_STAKING_STATE_EXPORT_V1);
assert.equal(plan.version, 1);
assert.equal(plan.status, "PLAN_READY");
assert.equal(plan.source_block_number, 37392);
assert.equal(
  plan.source_block_hash,
  "0x739679fd9f9b6f96213c440350980a1b590324c9152b7c394c81ce3627c94f52",
);
assert.equal(
  plan.staking_address,
  "0x77dfeedd19a4741f299c902ad5bbe0de917a9e59",
);
assert.equal(plan.isolated_rpc_url, "http://127.0.0.1:18549/");
assert.equal(plan.storage_layout.validators_by_reward_mapping_slot, 0);
assert.equal(plan.storage_layout.controller_to_reward_mapping_slot, 1);
assert.equal(plan.storage_layout.all_validators_array_slot, 2);
assert.equal(plan.storage_layout.active_validators_array_slot, 3);
assert.equal(plan.storage_layout.validator_struct_slots, 7);
assert.equal(plan.storage_layout.validator_flags_packed_slot_offset, 4);
assert.equal(
  plan.required_confirmation,
  VOID_ECONOMIC_EPOCH2_STAKING_STATE_EXPORT_CONFIRMATION_V1,
);
assert.deepEqual(
  plan.authority,
  VOID_ECONOMIC_EPOCH2_STAKING_STATE_EXPORT_AUTHORITY_V1,
);

for (const key of [
  "authoritative_epoch1_service_action",
  "authoritative_epoch1_rpc_call",
  "authoritative_chain2050_write",
  "isolated_transaction_submission",
  "wallet_access",
  "private_key_access",
  "credential_content_access",
  "transaction_construction",
  "transaction_signing",
  "transaction_broadcast",
  "token_movement",
  "funds_movement",
  "successor_state_mutation",
  "successor_genesis_build",
  "public_activation",
]) {
  assert.equal(plan.authority[key], false, key);
}
for (const key of [
  "isolated_replay_only",
  "isolated_state_materialization",
  "isolated_process_start",
  "isolated_read_only_rpc",
  "isolated_staking_state_export",
]) {
  assert.equal(plan.authority[key], true, key);
}

const reward =
  "0x0000000000000000000000000000000000000001";
const mappingBase0 = voidEconomicEpoch2StakingMappingBaseV1(reward, 0);
const mappingBase1 = voidEconomicEpoch2StakingMappingBaseV1(reward, 1);
assert.match(mappingBase0, /^0x[0-9a-f]{64}$/);
assert.match(mappingBase1, /^0x[0-9a-f]{64}$/);
assert.notEqual(mappingBase0, mappingBase1);
assert.equal(
  voidEconomicEpoch2StakingMappingBaseV1(reward, 0),
  mappingBase0,
);

const all0 = voidEconomicEpoch2DynamicArrayElementSlotV1(2, 0);
const all1 = voidEconomicEpoch2DynamicArrayElementSlotV1(2, 1);
const active0 = voidEconomicEpoch2DynamicArrayElementSlotV1(3, 0);
assert.match(all0, /^0x[0-9a-f]{64}$/);
assert.equal(
  all1,
  voidEconomicEpoch2AddStorageWordV1(all0, 1),
);
assert.notEqual(all0, active0);

assert.equal(
  voidEconomicEpoch2AddStorageWordV1(
    "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    1,
  ),
  "0x" + "0".repeat(64),
);
assert.equal(
  voidEconomicEpoch2AddStorageWordV1(
    "0x" + "0".repeat(64),
    -1,
  ),
  "0x" + "f".repeat(64),
);

assert.deepEqual(
  decodeVoidEconomicEpoch2ValidatorFlagsV1("0x1"),
  {
    active: true,
    pending_activation: false,
    pending_exit: false,
    jailed: false,
  },
);
assert.deepEqual(
  decodeVoidEconomicEpoch2ValidatorFlagsV1("0x01010101"),
  {
    active: true,
    pending_activation: true,
    pending_exit: true,
    jailed: true,
  },
);
await expectHold(
  async () => decodeVoidEconomicEpoch2ValidatorFlagsV1("0x2"),
  "validator_flags_bool_encoding_invalid",
);
await expectHold(
  async () =>
    decodeVoidEconomicEpoch2ValidatorFlagsV1(
      "0x0000000000000000000000000000000000000000000000000000000100000000",
    ),
  "validator_flags_upper_bits_nonzero",
);

const addresses = Array.from({ length: 126 }, (_, index) =>
  `0x${BigInt(index + 1).toString(16).padStart(40, "0")}`,
);

const observation = {
  chain_id: 2050,
  block_number: 37392,
  block_hash:
    "0x739679fd9f9b6f96213c440350980a1b590324c9152b7c394c81ce3627c94f52",
  checkpoint_id_sha256:
    "c251d3d92a0f3729f008fb7911243da0e4e2939af73f98fab2234a050c95a906",
  state_sha256:
    "94b25d36990d32616a7328f5419f5075fee757c15a955617c79ef30497a14505",
  unlocked_account_count: 0,
  staking: {
    address: "0x77dfeedd19a4741f299c902ad5bbe0de917a9e59",
    runtime_sha256:
      "0d35f9cf3d578cb8065d2e73f5f3d75f3332ea26002c4ae1ba8114aa96884ecd",
    void_token: "0x470075b85352eb86f7d089fb9ba88945f12aad94",
    min_stake_atoms: "1000000000000000000000",
    unbonding_period_seconds: "604800",
    validator_count: 126,
    active_validator_count: 126,
    pending_activation_count: 0,
    pending_exit_count: 0,
    jailed_count: 0,
    stake_sum_atoms: "126000000000000000000000",
    unbond_sum_atoms: "0",
    validators: addresses.map((address) => ({ reward: address })),
    all_validator_addresses: addresses,
    active_validator_addresses: addresses,
    storage_entries: [
      {
        slot: "0x" + "0".repeat(64),
        value: "0x" + "0".repeat(64),
      },
      {
        slot: "0x" + "0".repeat(63) + "2",
        value: "0x" + "0".repeat(62) + "7e",
      },
    ],
    nonzero_storage_entries: [
      {
        slot: "0x" + "0".repeat(63) + "2",
        value: "0x" + "0".repeat(62) + "7e",
      },
    ],
  },
};

const classified =
  classifyVoidEconomicEpoch2StakingStateObservationV1(observation);
assert.equal(classified.ok, true);
assert.equal(classified.status, "STAKING_STATE_EXPORT_GREEN");
assert.equal(classified.source_identity_verified, true);
assert.equal(classified.exact_runtime_exported, true);
assert.equal(classified.exact_known_storage_layout_exported, true);
assert.equal(classified.validator_count, 126);
assert.equal(classified.active_validator_count, 126);
assert.equal(
  classified.stake_sum_atoms,
  "126000000000000000000000",
);
assert.equal(classified.unbond_sum_atoms, "0");
assert.equal(classified.successor_state_built, false);
assert.equal(classified.migration_authorized, false);

await expectHold(
  async () =>
    classifyVoidEconomicEpoch2StakingStateObservationV1({
      ...observation,
      staking: {
        ...observation.staking,
        runtime_sha256: "0".repeat(64),
      },
    }),
  "staking_observation_mismatch",
);

await expectHold(
  async () =>
    classifyVoidEconomicEpoch2StakingStateObservationV1({
      ...observation,
      staking: {
        ...observation.staking,
        validators: observation.staking.validators.slice(1),
      },
    }),
  "staking_record_cardinality_mismatch",
);

console.log("VOID_ECONOMIC_EPOCH2_STAKING_STATE_EXPORT_V1_PROOF_GREEN");
console.log("source_block_number=37392");
console.log("staking_address=0x77dfeedd19a4741f299c902ad5bbe0de917a9e59");
console.log("staking_runtime_identity_bound=true");
console.log("staking_storage_layout_bound=true");
console.log("mapping_slot_arithmetic_green=true");
console.log("dynamic_array_slot_arithmetic_green=true");
console.log("uint256_slot_wraparound_green=true");
console.log("packed_validator_flags_green=true");
console.log("validator_count=126");
console.log("active_validator_count=126");
console.log("stake_sum_atoms=126000000000000000000000");
console.log("isolated_replay_only=true");
console.log("authoritative_chain2050_write=false");
console.log("token_movement=false");
console.log("funds_movement=false");
console.log("successor_state_built=false");
console.log("migration_authorized=false");
