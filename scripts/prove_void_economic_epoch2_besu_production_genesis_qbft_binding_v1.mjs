#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { encodeRlp } from "ethers";

import {
  buildVoidEconomicEpoch2BesuGenesisV1,
  VoidEconomicEpoch2BesuGenesisBuilderHoldV1,
} from "../tools/void-economic-epoch2-besu-genesis-builder-v1.mjs";
import {
  PINNED_BESU_26_8_1,
  bindVoidEconomicEpoch2QbftProductionExtraDataV1,
} from "../tools/void-economic-epoch2-qbft-production-extra-data-bind-v1.mjs";
import {
  prepareQbftProductionExtraDataInputV1,
} from "../tools/void-economic-epoch2-qbft-production-extra-data-preflight-v1.mjs";

const candidate = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-epoch2-production-client-candidate-v1.json",
    "utf8",
  ),
);
const nonceContinuity = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-epoch2-account-nonce-continuity-candidate-v1.json",
    "utf8",
  ),
);
const binding = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json",
    "utf8",
  ),
);
const topology = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-epoch2-qbft-topology-v1.json",
    "utf8",
  ),
);

function unbuiltBindingFixture(source) {
  const value = structuredClone(source);
  value.qbft.production_extra_data_built = false;
  value.qbft.production_extra_data_sha256 = null;
  delete value.qbft.production_extra_data_evidence;
  value.gates.qbft_production_extra_data_built = false;
  return value;
}

const unbuiltBinding = unbuiltBindingFixture(binding);

assert.equal(binding.qbft.production_extra_data_built, true);
assert.equal(
  binding.qbft.production_extra_data_sha256,
  "3449e754ec65555e90ea70cdf830f4a8a18946ee5b6221fcf5ad1a748a98c181",
);
assert.equal(binding.gates.qbft_production_extra_data_built, true);

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

async function expectHold(run, reason) {
  let thrown = null;
  try {
    await run();
  } catch (error) {
    thrown = error;
  }
  assert(thrown, "expected hold:" + reason);
  assert(thrown instanceof VoidEconomicEpoch2BesuGenesisBuilderHoldV1);
  assert.equal(thrown.reason, reason);
}

assert.equal(topology.production_validator_count, 3);
assert.equal(topology.quorum.required_validator_quorum, 2);
assert.equal(topology.quorum.byzantine_fault_tolerance, 0);

const preflight = prepareQbftProductionExtraDataInputV1(unbuiltBinding);
assert.equal(
  preflight.status,
  "READY_FOR_BESU_QBFT_EXTRA_DATA_ENCODING",
);
assert.equal(preflight.validators.length, 3);

const extraData = encodeRlp([
  "0x" + "00".repeat(32),
  preflight.validators,
  [],
  "0x",
  [],
]);
const qbftBound = bindVoidEconomicEpoch2QbftProductionExtraDataV1({
  binding: unbuiltBinding,
  extraData,
  besuImageDigest: PINNED_BESU_26_8_1,
});

assert.equal(qbftBound.evidence.validator_count, 3);
assert.deepEqual(qbftBound.evidence.validators, preflight.validators);

const placeholder = buildVoidEconomicEpoch2BesuGenesisV1({
  stateManifest: state,
  clientCandidate: candidate,
  nonceContinuity,
});
assert.equal(placeholder.evidence.status, "BESU_GENESIS_CANDIDATE_BUILT");
assert.equal(
  placeholder.genesis.extraData,
  candidate.consensus.offline_placeholder_qbft_extra_data,
);
assert.equal(
  placeholder.evidence.gates.production_qbft_extra_data_bound_into_genesis,
  false,
);

const production = buildVoidEconomicEpoch2BesuGenesisV1({
  stateManifest: state,
  clientCandidate: candidate,
  nonceContinuity,
  productionQbftExtraDataEvidence: qbftBound.evidence,
});

assert.equal(
  production.evidence.status,
  "BESU_PRODUCTION_GENESIS_CANDIDATE_BUILT_VALIDATOR_RUNTIME_HOLD",
);
assert.equal(production.genesis.extraData, qbftBound.evidence.extra_data_hex);
assert.notEqual(
  production.genesis.extraData,
  candidate.consensus.offline_placeholder_qbft_extra_data,
);
assert.equal(production.evidence.consensus.engine, "QBFT");
assert.equal(
  production.evidence.consensus.mode,
  "production_validator_extra_data",
);
assert.deepEqual(
  production.evidence.consensus.production_validator_addresses,
  qbftBound.evidence.validators,
);
assert.equal(
  production.evidence.consensus.production_validator_addresses.length,
  3,
);
assert.equal(
  production.evidence.consensus.production_extra_data_sha256,
  qbftBound.evidence.extra_data_sha256,
);
assert.equal(
  production.evidence.consensus
    .production_qbft_extra_data_bound_into_genesis,
  true,
);
assert.equal(
  production.evidence.gates
    .production_qbft_extra_data_bound_into_genesis,
  true,
);

assert.equal(production.evidence.consensus.production_validator_set_bound, false);
assert.equal(production.evidence.gates.production_validator_set_bound, false);
assert.equal(
  production.evidence.gates.offline_successor_equivalence_proven,
  false,
);
assert.equal(production.evidence.gates.migration_authorized, false);
assert.equal(production.evidence.gates.public_activation_authorized, false);
assert.equal(
  production.evidence.gates.client_specific_genesis_candidate_built,
  true,
);
assert.equal(production.evidence.gates.besu_genesis_parse_verified, false);
assert.equal(
  production.evidence.gates.client_specific_state_equivalence_proven,
  false,
);

assert.equal(Object.keys(production.genesis.alloc).length, 156);
assert.equal(
  production.genesis.alloc[
    "0x4d0a1149d13b03448c56ee6582d161159c5e537f"
  ].nonce,
  "0x1",
);
assert.equal(
  production.genesis.alloc[
    "0x7d493c395fc3636becac605f9cbc855b7fffe6f1"
  ].nonce,
  "0x111",
);

{
  const bad = structuredClone(qbftBound.evidence);
  bad.extra_data_sha256 = "0".repeat(64);
  await expectHold(
    async () =>
      buildVoidEconomicEpoch2BesuGenesisV1({
        stateManifest: state,
        clientCandidate: candidate,
        nonceContinuity,
        productionQbftExtraDataEvidence: bad,
      }),
    "production_qbft_extra_data_hash_mismatch",
  );
}
{
  const bad = structuredClone(qbftBound.evidence);
  bad.validators = [...bad.validators].reverse();
  await expectHold(
    async () =>
      buildVoidEconomicEpoch2BesuGenesisV1({
        stateManifest: state,
        clientCandidate: candidate,
        nonceContinuity,
        productionQbftExtraDataEvidence: bad,
      }),
    "production_qbft_validator_record_mismatch",
  );
}
{
  const bad = structuredClone(qbftBound.evidence);
  bad.validator_count = 4;
  await expectHold(
    async () =>
      buildVoidEconomicEpoch2BesuGenesisV1({
        stateManifest: state,
        clientCandidate: candidate,
        nonceContinuity,
        productionQbftExtraDataEvidence: bad,
      }),
    "production_qbft_extra_data_identity_mismatch",
  );
}
{
  const bad = structuredClone(qbftBound.evidence);
  bad.gates.production_validator_set_bound = true;
  await expectHold(
    async () =>
      buildVoidEconomicEpoch2BesuGenesisV1({
        stateManifest: state,
        clientCandidate: candidate,
        nonceContinuity,
        productionQbftExtraDataEvidence: bad,
      }),
    "production_qbft_extra_data_gate_premature",
  );
}

const outputDir =
  process.env.VOID_EPOCH2_PRODUCTION_GENESIS_OUTPUT_DIR || "";
if (outputDir) {
  const resolved = path.resolve(outputDir);
  fs.mkdirSync(resolved, { recursive: true });
  fs.writeFileSync(
    path.join(resolved, "genesis.json"),
    JSON.stringify(production.genesis, null, 2) + "\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(resolved, "builder-evidence.json"),
    JSON.stringify(production.evidence, null, 2) + "\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(resolved, "qbft-extra-data-evidence.json"),
    JSON.stringify(qbftBound.evidence, null, 2) + "\n",
    "utf8",
  );
}

console.log(
  "VOID_ECONOMIC_EPOCH2_BESU_PRODUCTION_GENESIS_QBFT_BINDING_V1_PROOF_GREEN",
);
console.log("placeholder_mode_preserved=true");
console.log("production_qbft_extra_data_bound_into_genesis=true");
console.log("production_validator_count=3");
console.log("required_validator_quorum=2");
console.log("byzantine_fault_tolerance=0");
console.log("one_byzantine_fault_tolerance_available=false");
console.log("production_genesis_extra_data_exact=true");
console.log("nonce_continuity_preserved=true");
console.log("production_validator_set_bound=false");
console.log("besu_genesis_parse_verified=false");
console.log("client_specific_state_equivalence_proven=false");
console.log("offline_successor_equivalence_proven=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
