#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  VOID_ECONOMIC_EPOCH2_FROZEN_SOURCE_CENSUS_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_FROZEN_SOURCE_CENSUS_CONFIRMATION_V1,
  VOID_ECONOMIC_EPOCH2_FROZEN_SOURCE_CENSUS_V1,
  classifyVoidEconomicEpoch2FrozenSourceObservationV1,
  deriveVoidEconomicEpoch2AllowanceStorageKeyV1,
  deriveVoidEconomicEpoch2BalanceStorageKeyV1,
  discoverVoidEconomicEpoch2TokenStorageLayoutV1,
  runVoidEconomicEpoch2FrozenSourceCensusV1,
} from "../tools/void-economic-epoch2-frozen-source-census-v1.mjs";

const TOKEN = "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const LEGACY_OWNER = "0x0d66fcdf95d38f7db6b4206bf183f34cd816c2aa";
const SUCCESSOR_OWNER = "0x54ded2daa618a257093556a5f54c43805b9bd516";
const BLOCK_HASH =
  "0x739679fd9f9b6f96213c440350980a1b590324c9152b7c394c81ce3627c94f52";
const CHECKPOINT_ID =
  "c251d3d92a0f3729f008fb7911243da0e4e2939af73f98fab2234a050c95a906";
const STATE_SHA256 =
  "94b25d36990d32616a7328f5419f5075fee757c15a955617c79ef30497a14505";
const RUNTIME_SHA256 =
  "1360507ef5816f53cf32179736190a5c7a3ce605aaee7d0e06bb8a5da7351198";
const TOTAL = "333333333000000000000000000";

const HOLDERS = Object.freeze([
  Object.freeze({
    label: "VoidTreasury",
    address: "0x554ecc7be6f0b7cc3d1c578c2bb848e535c02514",
    balance_atoms: "323207333000000000000000000",
  }),
  Object.freeze({
    label: "UpgradeStaking",
    address: "0x77dfeedd19a4741f299c902ad5bbe0de917a9e59",
    balance_atoms: "126000000000000000000000",
  }),
  Object.freeze({
    label: "PresaleFulfillment",
    address: "0xa40a43adfd174f88309173cb3daa6e09c10154a7",
    balance_atoms: "10000000000000000000000000",
  }),
]);

function wordBigInt(value) {
  return "0x" + BigInt(value).toString(16).padStart(64, "0");
}

function wordAddress(address) {
  return "0x" + address.toLowerCase().slice(2).padStart(64, "0");
}

async function expectHold(run, reason) {
  let thrown = null;
  try {
    await run();
  } catch (error) {
    thrown = error;
  }
  assert(thrown, `expected hold: ${reason}`);
  assert.equal(thrown.reason, reason);
}

const OWNER_SLOT = 2;
const SUPPLY_SLOT = 5;
const BALANCE_SLOT = 7;
const ALLOWANCE_SLOT = 8;
const ALLOWANCE = Object.freeze({
  owner: HOLDERS[0].address,
  spender: HOLDERS[1].address,
  amount_atoms: "123456789",
});

const storage = new Map();
for (let slot = 0; slot < 64; slot += 1) {
  storage.set(wordBigInt(slot), wordBigInt(0));
}
storage.set(wordBigInt(OWNER_SLOT), wordAddress(LEGACY_OWNER));
storage.set(wordBigInt(SUPPLY_SLOT), wordBigInt(TOTAL));
for (const holder of HOLDERS) {
  storage.set(
    deriveVoidEconomicEpoch2BalanceStorageKeyV1(
      holder.address,
      BALANCE_SLOT,
    ),
    wordBigInt(holder.balance_atoms),
  );
}
storage.set(
  deriveVoidEconomicEpoch2AllowanceStorageKeyV1(
    ALLOWANCE.owner,
    ALLOWANCE.spender,
    ALLOWANCE_SLOT,
  ),
  wordBigInt(ALLOWANCE.amount_atoms),
);

const layout = await discoverVoidEconomicEpoch2TokenStorageLayoutV1({
  readStorage: async (slot) => storage.get(slot.toLowerCase()) || wordBigInt(0),
  holders: HOLDERS,
  totalSupplyAtoms: TOTAL,
  owner: LEGACY_OWNER,
  nonzeroAllowances: [ALLOWANCE],
});

assert.equal(layout.owner_slot, OWNER_SLOT);
assert.equal(layout.total_supply_slot, SUPPLY_SLOT);
assert.equal(layout.balance_mapping_slot, BALANCE_SLOT);
assert.equal(layout.allowance_mapping_slot, ALLOWANCE_SLOT);
assert.equal(layout.holder_storage.length, 3);
for (const [index, holder] of HOLDERS.entries()) {
  assert.equal(layout.holder_storage[index].address, holder.address);
  assert.equal(layout.holder_storage[index].balance_atoms, holder.balance_atoms);
  assert.equal(
    layout.holder_storage[index].storage_key,
    deriveVoidEconomicEpoch2BalanceStorageKeyV1(
      holder.address,
      BALANCE_SLOT,
    ),
  );
}

await expectHold(
  () =>
    discoverVoidEconomicEpoch2TokenStorageLayoutV1({
      readStorage: async (slot) => {
        if (slot === wordBigInt(SUPPLY_SLOT + 1)) return wordBigInt(TOTAL);
        return storage.get(slot.toLowerCase()) || wordBigInt(0);
      },
      holders: HOLDERS,
      totalSupplyAtoms: TOTAL,
      owner: LEGACY_OWNER,
      nonzeroAllowances: [ALLOWANCE],
    }),
  "voidtoken_total_supply_storage_slot_not_unique",
);

await expectHold(
  () =>
    discoverVoidEconomicEpoch2TokenStorageLayoutV1({
      readStorage: async (slot) => {
        if (slot === wordBigInt(OWNER_SLOT + 1)) return wordAddress(LEGACY_OWNER);
        return storage.get(slot.toLowerCase()) || wordBigInt(0);
      },
      holders: HOLDERS,
      totalSupplyAtoms: TOTAL,
      owner: LEGACY_OWNER,
      nonzeroAllowances: [ALLOWANCE],
    }),
  "voidtoken_owner_storage_slot_not_unique",
);

const canonicalInputs = Object.freeze({
  holders: HOLDERS,
  legacy_owner: LEGACY_OWNER,
  successor_owner: SUCCESSOR_OWNER,
});

const observation = {
  chain_id: 2050,
  block_number: 37392,
  block_hash: BLOCK_HASH,
  checkpoint_id_sha256: CHECKPOINT_ID,
  state_sha256: STATE_SHA256,
  unlocked_account_count: 0,
  void_token: {
    address: TOKEN,
    runtime_sha256: RUNTIME_SHA256,
    total_supply_atoms: TOTAL,
    owner: LEGACY_OWNER,
    holders: HOLDERS,
    storage_layout: layout,
  },
  allowances: {
    discovered_approval_pair_count: 1,
    nonzero_allowance_count: 1,
    nonzero_allowances: [ALLOWANCE],
  },
  transfer_ownership_eth_call_supported: true,
  successor_owner_probe_address: SUCCESSOR_OWNER,
};

const classified =
  classifyVoidEconomicEpoch2FrozenSourceObservationV1(
    observation,
    canonicalInputs,
  );
assert.equal(classified.ok, true);
assert.equal(classified.status, "FROZEN_SOURCE_CENSUS_GREEN");
assert.equal(
  classified.marker,
  VOID_ECONOMIC_EPOCH2_FROZEN_SOURCE_CENSUS_V1,
);
assert.equal(classified.voidtoken_runtime_identity_verified, true);
assert.equal(classified.voidtoken_storage_layout_discovered, true);
assert.equal(classified.voidtoken_owner_rotation_simulation_verified, true);
assert.equal(classified.source_holder_sum_atoms, TOTAL);
assert.equal(classified.source_nonzero_holder_count, 3);
assert.equal(classified.authoritative_chain_mutation, false);
assert.equal(classified.token_movement, false);
assert.equal(classified.funds_movement, false);
assert.equal(classified.successor_built, false);
assert.equal(classified.migration_authorized, false);

await expectHold(
  async () =>
    classifyVoidEconomicEpoch2FrozenSourceObservationV1(
      {
        ...observation,
        void_token: {
          ...observation.void_token,
          runtime_sha256: "0".repeat(64),
        },
      },
      canonicalInputs,
    ),
  "voidtoken_observation_mismatch",
);

await expectHold(
  async () =>
    classifyVoidEconomicEpoch2FrozenSourceObservationV1(
      {
        ...observation,
        transfer_ownership_eth_call_supported: false,
      },
      canonicalInputs,
    ),
  "voidtoken_successor_owner_simulation_not_proven",
);

const plan = await runVoidEconomicEpoch2FrozenSourceCensusV1({
  apply: false,
});
assert.equal(plan.marker, VOID_ECONOMIC_EPOCH2_FROZEN_SOURCE_CENSUS_V1);
assert.equal(plan.status, "PLAN_READY");
assert.equal(plan.source_block_number, 37392);
assert.equal(plan.source_block_hash, BLOCK_HASH);
assert.equal(plan.source_checkpoint_id_sha256, CHECKPOINT_ID);
assert.equal(plan.source_state_sha256, STATE_SHA256);
assert.equal(plan.source_void_token, TOKEN);
assert.equal(plan.source_void_token_runtime_sha256, RUNTIME_SHA256);
assert.equal(plan.production_rpc_listener_must_be_absent, true);
assert.equal(
  plan.archive_checkpoint_root,
  `${process.env.HOME}/.local/state/void-economic-genesis-archive-v1/block-37392-final-candidate-v1`,
);
assert.equal(plan.production_startup_checkpoint_root_used, false);
assert.equal(plan.exact_checkpoint_selection_required, true);
assert.equal(plan.approval_history_census, true);
assert.equal(plan.transfer_ownership_eth_call_simulation, true);
assert.equal(
  plan.required_confirmation,
  VOID_ECONOMIC_EPOCH2_FROZEN_SOURCE_CENSUS_CONFIRMATION_V1,
);
assert.deepEqual(
  plan.authority,
  VOID_ECONOMIC_EPOCH2_FROZEN_SOURCE_CENSUS_AUTHORITY_V1,
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
]) {
  assert.equal(plan.authority[key], true, key);
}

console.log("VOID_ECONOMIC_EPOCH2_FROZEN_SOURCE_CENSUS_V1_PROOF_GREEN");
console.log("source_block_number=37392");
console.log(`source_block_hash=${BLOCK_HASH}`);
console.log(`checkpoint_id_sha256=${CHECKPOINT_ID}`);
console.log(`state_sha256=${STATE_SHA256}`);
console.log(`void_token=${TOKEN}`);
console.log(`void_token_runtime_sha256=${RUNTIME_SHA256}`);
console.log("storage_layout_discovery_adversaries_green=true");
console.log("source_holder_sum_atoms=333333333000000000000000000");
console.log("archive_checkpoint_root=economic_genesis_archive_quarantine");
console.log("production_startup_checkpoint_root_used=false");
console.log("isolated_replay_only=true");
console.log("authoritative_epoch1_rpc_call=false");
console.log("authoritative_chain2050_write=false");
console.log("wallet_or_signer_access=false");
console.log("token_or_funds_movement=false");
console.log("successor_built=false");
console.log("migration_authorized=false");
