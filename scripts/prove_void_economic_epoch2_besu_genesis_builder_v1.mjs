#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_V1,
  VoidEconomicEpoch2BesuGenesisBuilderHoldV1,
  buildVoidEconomicEpoch2BesuGenesisV1,
} from "../tools/void-economic-epoch2-besu-genesis-builder-v1.mjs";

const candidate = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-epoch2-production-client-candidate-v1.json",
    "utf8",
  ),
);

async function expectHold(run, reason) {
  let thrown = null;
  try {
    await run();
  } catch (error) {
    thrown = error;
  }
  assert(thrown, `expected hold: ${reason}`);
  assert(thrown instanceof VoidEconomicEpoch2BesuGenesisBuilderHoldV1);
  assert.equal(thrown.reason, reason);
}

const word = (n) => "0x" + BigInt(n).toString(16).padStart(64, "0");

const tokenStorage = [
  { slot: word(0), value: word(333333333000000000000000000n) },
  { slot: word(1), value: word(1) },
  { slot: word(2), value: word(2) },
  { slot: word(3), value: word(3) },
];

const stakingStorage = Array.from({ length: 1264 }, (_, index) => ({
  slot: word(10000 + index),
  value: index < 1010 ? word(index + 1) : word(0),
}));

const state = {
  marker: "VOID_ECONOMIC_EPOCH2_CLIENT_NEUTRAL_STATE_MANIFEST_V1",
  version: 1,
  status: "CLIENT_NEUTRAL_STATE_MANIFEST_GREEN",
  manifest_material_sha256: "a".repeat(64),
  chain_id: 2050,
  execution_epoch: 2,
  token_state: {
    total_supply_atoms: "333333333000000000000000000",
    holder_sum_atoms: "333333333000000000000000000",
    successor_nonzero_holder_count: 3,
    allowances_nonzero_count: 0,
  },
  staking_state: {
    storage_entry_count: 1264,
    validator_count: 126,
    active_validator_count: 126,
  },
  gates: {
    token_behavioral_semantic_equivalence: true,
    staking_exact_state_bound: true,
    offline_successor_equivalence_proven: false,
    client_specific_genesis_built: false,
    migration_authorized: false,
    public_activation_authorized: false,
  },
  accounts: [
    {
      address: "0x470075b85352eb86f7d089fb9ba88945f12aad94",
      label: "VoidEpoch2TokenV1",
      runtime_code_hex: "0x60006000",
      storage_entries: tokenStorage,
    },
    {
      address: "0x77dfeedd19a4741f299c902ad5bbe0de917a9e59",
      label: "ValidatorStakingV2",
      runtime_code_hex: "0x60016000",
      storage_entries: stakingStorage,
    },
    {
      address: "0x26c501a1edca3614f214face2d9b7be2aa7c864b",
      label: "VoidEpoch2TreasuryCustodyV1",
      runtime_code_hex: "0x60026000",
      storage_entries: [],
    },
    {
      address: "0x530bc90ba74f2539a9e484ccb1be9291c3bc35ce",
      label: "VoidEpoch2PresaleFulfillmentV1",
      runtime_code_hex: "0x60036000",
      storage_entries: [],
    },
  ],
};

const built = buildVoidEconomicEpoch2BesuGenesisV1({
  stateManifest: state,
  clientCandidate: candidate,
});

assert.equal(
  built.evidence.marker,
  VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_V1,
);
assert.equal(built.evidence.status, "BESU_GENESIS_CANDIDATE_BUILT");
assert.equal(built.genesis.config.chainId, 2050);
assert.equal(built.genesis.config.berlinBlock, 0);
assert.equal(built.genesis.config.londonBlock, 0);
assert.equal(built.genesis.config.zeroBaseFee, true);
assert.equal(built.genesis.config.contractSizeLimit, 24576);
assert.deepEqual(built.genesis.config.qbft, {
  blockperiodseconds: 5,
  epochlength: 30000,
  requesttimeoutseconds: 10,
});
assert.equal(built.genesis.gasLimit, "0xbebc200");
assert.equal(built.genesis.baseFeePerGas, "0x0");
assert.equal(built.genesis.difficulty, "0x1");
assert.equal(
  built.genesis.mixHash,
  "0x63746963616c2062797a616e74696e65206661756c7420746f6c6572616e6365",
);
assert.equal(
  built.genesis.extraData,
  candidate.consensus.offline_placeholder_qbft_extra_data,
);
assert.equal(Object.keys(built.genesis.alloc).length, 4);

for (const account of Object.values(built.genesis.alloc)) {
  assert.equal(account.balance, "0x0");
  assert.match(account.code, /^0x[0-9a-f]+$/);
}
assert.equal(
  Object.keys(
    built.genesis.alloc[
      "0x470075b85352eb86f7d089fb9ba88945f12aad94"
    ].storage,
  ).length,
  4,
);
assert.equal(
  Object.keys(
    built.genesis.alloc[
      "0x77dfeedd19a4741f299c902ad5bbe0de917a9e59"
    ].storage,
  ).length,
  1010,
);
for (const [key, value] of Object.entries(
  built.genesis.alloc[
    "0x77dfeedd19a4741f299c902ad5bbe0de917a9e59"
  ].storage,
)) {
  assert.match(key, /^[0-9a-f]{64}$/);
  assert.match(value, /^[0-9a-f]{64}$/);
  assert.notEqual(BigInt("0x" + value), 0n);
}

assert.equal(built.evidence.state.alloc_account_count, 4);
assert.equal(built.evidence.state.input_storage_entry_count, 1268);
assert.equal(
  built.evidence.state.nonzero_genesis_storage_entry_count,
  1014,
);
assert.equal(built.evidence.state.native_prefunded_account_count, 0);
assert.equal(
  built.evidence.consensus.production_validator_set_bound,
  false,
);
assert.equal(
  built.evidence.consensus.placeholder_validator_authority,
  false,
);
assert.equal(built.evidence.free_gas.zero_base_fee, true);
assert.equal(
  built.evidence.free_gas.participant_native_gas_balance_required,
  false,
);
assert.equal(
  built.evidence.gates.client_specific_genesis_candidate_built,
  true,
);
assert.equal(built.evidence.gates.besu_genesis_parse_verified, false);
assert.equal(
  built.evidence.gates.client_specific_state_equivalence_proven,
  false,
);
assert.equal(
  built.evidence.gates.production_validator_set_bound,
  false,
);
assert.equal(
  built.evidence.gates.offline_successor_equivalence_proven,
  false,
);
assert.equal(built.evidence.gates.migration_authorized, false);
assert.equal(built.evidence.gates.public_activation_authorized, false);
assert.match(built.evidence.genesis_material_sha256, /^[0-9a-f]{64}$/);
assert.match(built.evidence.evidence_material_sha256, /^[0-9a-f]{64}$/);

assert.deepEqual(
  built.evidence.authority,
  VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_AUTHORITY_V1,
);

const duplicate = structuredClone(state);
duplicate.accounts[3].address = duplicate.accounts[2].address;
await expectHold(
  async () =>
    buildVoidEconomicEpoch2BesuGenesisV1({
      stateManifest: duplicate,
      clientCandidate: candidate,
    }),
  "duplicate_alloc_address",
);

const badState = structuredClone(state);
badState.token_state.holder_sum_atoms =
  "333333332999999999999999999";
await expectHold(
  async () =>
    buildVoidEconomicEpoch2BesuGenesisV1({
      stateManifest: badState,
      clientCandidate: candidate,
    }),
  "client_neutral_state_manifest_state_mismatch",
);

const premature = structuredClone(candidate);
premature.gates.offline_successor_equivalence_proven = true;
await expectHold(
  async () =>
    buildVoidEconomicEpoch2BesuGenesisV1({
      stateManifest: state,
      clientCandidate: premature,
    }),
  "besu_candidate_gate_premature",
);

console.log("VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_V1_PROOF_GREEN");
console.log("chain_id=2050");
console.log("client=Besu");
console.log("client_version=26.8.1");
console.log("consensus=QBFT");
console.log("alloc_account_count=4");
console.log("input_storage_entry_count=1268");
console.log("nonzero_genesis_storage_entry_count=1014");
console.log("native_prefunded_account_count=0");
console.log("zero_base_fee=true");
console.log("participant_native_gas_balance_required=false");
console.log("placeholder_validator_authority=false");
console.log("production_validator_set_bound=false");
console.log("client_specific_genesis_candidate_built=true");
console.log("besu_genesis_parse_verified=false");
console.log("client_specific_state_equivalence_proven=false");
console.log("offline_successor_equivalence_proven=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
