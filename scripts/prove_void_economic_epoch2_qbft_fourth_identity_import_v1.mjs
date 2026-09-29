#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  importVoidEconomicEpoch2QbftFourthIdentityV1,
} from "../tools/void-economic-epoch2-qbft-fourth-identity-import-v1.mjs";
import {
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
  value.qbft.production_extra_data_built = false;
  value.qbft.production_extra_data_sha256 = null;
  delete value.qbft.production_extra_data_evidence;
  value.gates.qbft_production_extra_data_built = false;
  return value;
}

const unbuiltBinding = unbuiltBindingFixture(binding);

assert.equal(binding.qbft.production_extra_data_built, true);
assert.equal(binding.gates.qbft_production_extra_data_built, true);

assert.equal(topology.production_validator_count, 3);
assert.equal(topology.policy.fourth_validator_required_for_launch, false);
assert.equal(
  topology.policy.unassigned_fourth_slot_is_not_a_blocker,
  true,
);

const preflight = prepareQbftProductionExtraDataInputV1(unbuiltBinding);
assert.equal(
  preflight.status,
  "READY_FOR_BESU_QBFT_EXTRA_DATA_ENCODING",
);
assert.equal(preflight.attested_live_node_count, 3);
assert.equal(preflight.required_live_node_count, 3);
assert.equal(preflight.attested_identity_slots_remaining, 0);

assert.throws(
  () =>
    importVoidEconomicEpoch2QbftFourthIdentityV1({
      binding,
      attestation: {},
    }),
  /canonical_qbft_binding_not_ready_for_fourth_identity/,
);

console.log(
  "VOID_ECONOMIC_EPOCH2_QBFT_FOURTH_IDENTITY_IMPORT_V1_SUPERSEDED_GREEN",
);
console.log("production_validator_count=3");
console.log("required_live_node_count=3");
console.log("attested_live_node_count=3");
console.log("attested_identity_slots_remaining=0");
console.log("fourth_validator_required_for_launch=false");
console.log("unassigned_fourth_slot_is_not_a_blocker=true");
console.log("historical_importer_active_path=false");
console.log("future_expansion_requires_topology_review=true");
