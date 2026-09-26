#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  VOID_ECONOMIC_EPOCH2_LEGACY_TOKEN_SEMANTIC_CENSUS_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_LEGACY_TOKEN_SEMANTIC_CENSUS_CONFIRMATION_V1,
  VOID_ECONOMIC_EPOCH2_LEGACY_TOKEN_SEMANTIC_CENSUS_V1,
  VoidEconomicEpoch2LegacyTokenSemanticCensusHoldV1,
  classifyVoidEconomicEpoch2LegacyTokenSemanticObservationV1,
  runVoidEconomicEpoch2LegacyTokenSemanticCensusV1,
} from "../tools/void-economic-epoch2-legacy-token-semantic-census-v1.mjs";

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

async function expectHold(run, reason) {
  let thrown = null;
  try {
    await run();
  } catch (error) {
    thrown = error;
  }
  assert(thrown, `expected hold: ${reason}`);
  assert(thrown instanceof VoidEconomicEpoch2LegacyTokenSemanticCensusHoldV1);
  assert.equal(thrown.reason, reason);
}

const plan = await runVoidEconomicEpoch2LegacyTokenSemanticCensusV1({
  apply: false,
});
assert.equal(plan.marker, VOID_ECONOMIC_EPOCH2_LEGACY_TOKEN_SEMANTIC_CENSUS_V1);
assert.equal(plan.status, "PLAN_READY");
assert.equal(plan.source_block_number, 37392);
assert.equal(
  plan.source_block_hash,
  "0x739679fd9f9b6f96213c440350980a1b590324c9152b7c394c81ce3627c94f52",
);
assert.equal(
  plan.source_checkpoint_id_sha256,
  "c251d3d92a0f3729f008fb7911243da0e4e2939af73f98fab2234a050c95a906",
);
assert.equal(
  plan.source_state_sha256,
  "94b25d36990d32616a7328f5419f5075fee757c15a955617c79ef30497a14505",
);
assert.equal(
  plan.source_void_token,
  "0x470075b85352eb86f7d089fb9ba88945f12aad94",
);
assert.equal(
  plan.source_void_token_runtime_sha256,
  "1360507ef5816f53cf32179736190a5c7a3ce605aaee7d0e06bb8a5da7351198",
);
assert.equal(
  plan.required_confirmation,
  VOID_ECONOMIC_EPOCH2_LEGACY_TOKEN_SEMANTIC_CENSUS_CONFIRMATION_V1,
);
assert.ok(plan.semantic_surfaces.includes("PREMINE()"));
assert.ok(
  plan.semantic_surfaces.includes(
    "transfer(address,uint256) positive/zero/zero-address/insufficient/self eth_call simulations",
  ),
);
assert.ok(
  plan.semantic_surfaces.includes(
    "approve(address,uint256) positive/zero-amount/zero-spender eth_call simulations",
  ),
);
assert.ok(
  plan.semantic_surfaces.includes(
    "transferFrom(address,address,uint256) live-allowance/no-allowance/zero-amount eth_call simulations",
  ),
);
assert.ok(
  plan.semantic_surfaces.includes(
    "transferFrom(address,address,uint256) positive-path eth_call state-override simulation derived from traced approve storage key",
  ),
);
assert.ok(
  plan.semantic_surfaces.includes(
    "mint(address,uint256) owner/non-owner/cap/zero-address/zero-amount eth_call simulations",
  ),
);
assert.deepEqual(
  plan.authority,
  VOID_ECONOMIC_EPOCH2_LEGACY_TOKEN_SEMANTIC_CENSUS_AUTHORITY_V1,
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
  "isolated_state_override_simulation",
]) {
  assert.equal(plan.authority[key], true, key);
}

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
  void_token: {
    address: "0x470075b85352eb86f7d089fb9ba88945f12aad94",
    runtime_sha256:
      "1360507ef5816f53cf32179736190a5c7a3ce605aaee7d0e06bb8a5da7351198",
    total_supply_atoms: "333333333000000000000000000",
    owner: "0x0d66fcdf95d38f7db6b4206bf183f34cd816c2aa",
    holders: HOLDERS,
  },
  semantic_profile: {
    metadata: {},
    allowances: {
      discovered_approval_pair_count: 0,
      nonzero_allowance_count: 0,
      nonzero_allowances: [],
    },
    simulations: {},
    selector_census: {},
    runtime_literal_census: {},
  },
};

const classified =
  classifyVoidEconomicEpoch2LegacyTokenSemanticObservationV1(observation);
assert.equal(classified.ok, true);
assert.equal(classified.status, "SEMANTIC_CENSUS_GREEN");
assert.equal(classified.source_identity_verified, true);
assert.equal(
  classified.source_holder_sum_atoms,
  "333333333000000000000000000",
);
assert.equal(classified.source_nonzero_holder_count, 3);
assert.equal(classified.successor_runtime_built, false);
assert.equal(
  classified.successor_runtime_semantic_equivalence_verified,
  false,
);
assert.equal(classified.migration_authorized, false);

await expectHold(
  async () =>
    classifyVoidEconomicEpoch2LegacyTokenSemanticObservationV1({
      ...observation,
      void_token: {
        ...observation.void_token,
        runtime_sha256: "0".repeat(64),
      },
    }),
  "voidtoken_observation_mismatch",
);

await expectHold(
  async () =>
    classifyVoidEconomicEpoch2LegacyTokenSemanticObservationV1({
      ...observation,
      void_token: {
        ...observation.void_token,
        holders: HOLDERS.map((row, index) =>
          index === 0
            ? { ...row, balance_atoms: "323207332999999999999999999" }
            : row,
        ),
      },
    }),
  "holder_balance_mismatch",
);

console.log("VOID_ECONOMIC_EPOCH2_LEGACY_TOKEN_SEMANTIC_CENSUS_V1_PROOF_GREEN");
console.log("source_block_number=37392");
console.log("source_void_token=0x470075b85352eb86f7d089fb9ba88945f12aad94");
console.log("source_holder_sum_atoms=333333333000000000000000000");
console.log("semantic_census_observational=true");
console.log("erc20_edge_census_declared=true");
console.log("positive_transfer_from_state_override_probe_declared=true");
console.log("state_override_persistence=false");
console.log("isolated_replay_only=true");
console.log("authoritative_chain2050_write=false");
console.log("transaction_submission=false");
console.log("token_movement=false");
console.log("funds_movement=false");
console.log("successor_runtime_built=false");
console.log("migration_authorized=false");
