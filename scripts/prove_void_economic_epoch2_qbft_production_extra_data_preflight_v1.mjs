#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  FORBIDDEN_PLACEHOLDERS,
  MARKER,
  prepareQbftProductionExtraDataInputV1,
} from "../tools/void-economic-epoch2-qbft-production-extra-data-preflight-v1.mjs";

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
  if(value.gates?.production_validator_set_bound===true){
    value.status="HOLD";
    value.gates.production_validator_set_bound=false;
    value.gates.offline_successor_equivalence_proven=false;
    Reflect.deleteProperty(value,"production_successor_equivalence");
  }
  value.qbft.production_extra_data_built = false;
  value.qbft.production_extra_data_sha256 = null;
  Reflect.deleteProperty(value.qbft,"production_extra_data_evidence");
  value.gates.qbft_production_extra_data_built = false;
  return value;
}

const unbuiltBinding = unbuiltBindingFixture(binding);

assert.equal(binding.qbft.production_extra_data_built, true);
assert.equal(
  binding.qbft.production_extra_data_sha256,
  "3449e754ec65555e90ea70cdf830f4a8a18946ee5b6221fcf5ad1a748a98c181",
);
assert.equal(
  binding.qbft.production_extra_data_evidence,
  "ops/mainnet0/economic-epoch2-qbft-production-extra-data-v1.json",
);
assert.equal(binding.gates.qbft_production_extra_data_built, true);

assert.equal(topology.production_validator_count, 3);
assert.equal(topology.quorum.required_validator_quorum, 2);
assert.equal(topology.quorum.byzantine_fault_tolerance, 0);
assert.equal(
  topology.quorum.one_byzantine_fault_tolerance_available,
  false,
);
assert.equal(topology.policy.fourth_validator_required_for_launch, false);

const ready = prepareQbftProductionExtraDataInputV1(unbuiltBinding);
assert.equal(ready.marker, MARKER);
assert.equal(ready.status, "READY_FOR_BESU_QBFT_EXTRA_DATA_ENCODING");
assert.equal(ready.attested_live_node_count, 3);
assert.equal(ready.required_live_node_count, 3);
assert.equal(ready.attested_identity_slots_remaining, 0);
assert.equal(ready.validators.length, 3);
assert.equal(new Set(ready.validators).size, 3);
assert.equal(ready.required_validator_quorum, 2);
assert.equal(ready.byzantine_fault_tolerance, 0);
assert.equal(ready.one_byzantine_fault_tolerance_available, false);
assert.equal(
  ready.besu.image,
  "hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042",
);
assert.deepEqual(ready.besu.rlp_command, [
  "rlp",
  "encode",
  "--from=/work/validators.json",
  "--type=QBFT_EXTRA_DATA",
]);
assert.equal(ready.production_extra_data_built, false);
assert.equal(ready.production_validator_set_bound, false);
assert.equal(ready.authoritative_chain2050_write, false);
assert.equal(ready.migration_authorized, false);
assert.equal(ready.public_activation_authorized, false);

for (const address of ready.validators) {
  assert.equal(FORBIDDEN_PLACEHOLDERS.includes(address), false);
}

{
  const bad = structuredClone(unbuiltBinding);
  bad.qbft.production_binding_entries[2].besu_validator_address =
    bad.qbft.production_binding_entries[0].besu_validator_address;
  assert.throws(
    () => prepareQbftProductionExtraDataInputV1(bad),
    /public_key_address_mismatch|besu_validator_address_duplicate/,
  );
}
{
  const bad = structuredClone(unbuiltBinding);
  bad.qbft.production_binding_entries[2].besu_validator_address =
    "0x1000000000000000000000000000000000000001";
  assert.throws(
    () => prepareQbftProductionExtraDataInputV1(bad),
    /public_key_address_mismatch|placeholder_address_forbidden/,
  );
}
{
  const bad = structuredClone(unbuiltBinding);
  bad.qbft.required_validator_quorum = 3;
  assert.throws(
    () => prepareQbftProductionExtraDataInputV1(bad),
    /three_validator_topology_contract_invalid/,
  );
}
{
  const bad = structuredClone(unbuiltBinding);
  bad.qbft.required_live_node_count = 4;
  assert.throws(
    () => prepareQbftProductionExtraDataInputV1(bad),
    /required_live_node_count_invalid/,
  );
}
{
  const bad = structuredClone(unbuiltBinding);
  bad.authority.transaction_broadcast = true;
  assert.throws(
    () => prepareQbftProductionExtraDataInputV1(bad),
    /authority_must_remain_false:transaction_broadcast/,
  );
}

const fixtureOutput = process.env.VOID_QBFT_EXTRA_DATA_PROOF_OUTPUT;
if (fixtureOutput) {
  const resolved = path.resolve(fixtureOutput);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, JSON.stringify(ready.validators) + "\n", "utf8");
}

console.log(
  "VOID_ECONOMIC_EPOCH2_QBFT_PRODUCTION_EXTRA_DATA_PREFLIGHT_V1_PROOF_GREEN",
);
console.log("canonical_attested_live_node_count=3");
console.log("canonical_required_live_node_count=3");
console.log("canonical_attested_identity_slots_remaining=0");
console.log("synthetic_unbuilt_three_identity_control=READY_FOR_BESU_QBFT_EXTRA_DATA_ENCODING");
console.log("required_validator_quorum=2");
console.log("byzantine_fault_tolerance=0");
console.log("one_byzantine_fault_tolerance_available=false");
console.log("fourth_validator_required_for_launch=false");
console.log("unique_validator_addresses_required=true");
console.log("placeholder_validator_addresses_forbidden=true");
console.log("canonical_production_extra_data_built=true");
console.log("synthetic_unbuilt_production_extra_data_built=false");
console.log("production_validator_set_bound=false");
console.log("authoritative_chain2050_write=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
