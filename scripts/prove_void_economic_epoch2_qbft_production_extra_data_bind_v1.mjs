#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { encodeRlp } from "ethers";

import {
  PINNED_BESU_26_8_1,
  PRODUCTION_EXTRA_DATA_EVIDENCE_PATH,
  VOID_ECONOMIC_EPOCH2_QBFT_PRODUCTION_EXTRA_DATA_BIND_V1,
  VOID_ECONOMIC_EPOCH2_QBFT_PRODUCTION_EXTRA_DATA_EVIDENCE_V1,
  bindVoidEconomicEpoch2QbftProductionExtraDataV1,
} from "../tools/void-economic-epoch2-qbft-production-extra-data-bind-v1.mjs";
import {
  prepareQbftProductionExtraDataInputV1,
} from "../tools/void-economic-epoch2-qbft-production-extra-data-preflight-v1.mjs";

const bindingPath =
  "ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json";
const binding = JSON.parse(fs.readFileSync(bindingPath, "utf8"));

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
  "89a70f0930a5899921c2eb7f65c1f6e5d1ea59d2044cd5b5bd08d635f9fb099a",
);
assert.equal(
  binding.qbft.production_extra_data_evidence,
  PRODUCTION_EXTRA_DATA_EVIDENCE_PATH,
);
assert.equal(binding.gates.qbft_production_extra_data_built, true);

const ready = prepareQbftProductionExtraDataInputV1(unbuiltBinding);
assert.equal(
  ready.status,
  "READY_FOR_BESU_QBFT_EXTRA_DATA_ENCODING",
);
assert.equal(ready.validators.length, 3);
assert.equal(ready.required_validator_quorum, 2);
assert.equal(ready.byzantine_fault_tolerance, 0);

const extraData = encodeRlp([
  "0x" + "00".repeat(32),
  ready.validators,
  [],
  "0x",
  [],
]);

const bound = bindVoidEconomicEpoch2QbftProductionExtraDataV1({
  binding: unbuiltBinding,
  extraData,
  besuImageDigest: PINNED_BESU_26_8_1,
});

assert.equal(
  bound.evidence.marker,
  VOID_ECONOMIC_EPOCH2_QBFT_PRODUCTION_EXTRA_DATA_EVIDENCE_V1,
);
assert.equal(
  bound.evidence.status,
  "PRODUCTION_QBFT_EXTRA_DATA_BUILT_GENESIS_BINDING_HOLD",
);
assert.equal(bound.evidence.validator_count, 3);
assert.deepEqual(bound.evidence.validators, ready.validators);
assert.equal(bound.evidence.extra_data_hex, extraData);
assert.equal(bound.evidence.decoded.validator_order_exact, true);
assert.equal(bound.evidence.decoded.independently_reencoded_exact, true);
assert.equal(bound.updated_binding.qbft.production_binding_entries.length, 3);
assert.equal(bound.updated_binding.qbft.attested_live_node_count, 3);
assert.equal(bound.updated_binding.qbft.required_live_node_count, 3);
assert.equal(
  bound.updated_binding.qbft.attested_identity_slots_remaining,
  0,
);
assert.equal(bound.updated_binding.qbft.production_extra_data_built, true);
assert.equal(
  bound.updated_binding.qbft.production_extra_data_sha256,
  bound.evidence.extra_data_sha256,
);
assert.equal(
  bound.updated_binding.qbft.production_extra_data_evidence,
  PRODUCTION_EXTRA_DATA_EVIDENCE_PATH,
);

for (const field of [
  "qbft_live_identity_manifest_ready",
  "qbft_minimum_live_nodes_attested",
  "qbft_public_key_address_derivations_verified",
  "qbft_production_extra_data_built",
]) {
  assert.equal(bound.updated_binding.gates[field], true, field);
}
for (const field of [
  "production_validator_set_bound",
  "offline_successor_equivalence_proven",
  "migration_authorized",
  "public_activation_authorized",
]) {
  assert.equal(bound.updated_binding.gates[field], false, field);
}
assert.equal(
  bound.evidence.gates.all_production_validators_epoch_domain_enforced,
  false,
);

assert.throws(
  () =>
    bindVoidEconomicEpoch2QbftProductionExtraDataV1({
      binding: unbuiltBinding,
      extraData,
      besuImageDigest: "hyperledger/besu@sha256:" + "0".repeat(64),
    }),
  /besu_image_digest_mismatch/,
);

const reordered = encodeRlp([
  "0x" + "00".repeat(32),
  [...ready.validators].reverse(),
  [],
  "0x",
  [],
]);
assert.throws(
  () =>
    bindVoidEconomicEpoch2QbftProductionExtraDataV1({
      binding: unbuiltBinding,
      extraData: reordered,
      besuImageDigest: PINNED_BESU_26_8_1,
    }),
  /qbft_extra_data_validator_order_mismatch/,
);

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-qbft-production-extra-data-bind-v1-"),
);
try {
  const extraDataFile = path.join(temp, "extra-data.txt");
  const syntheticBindingPath = path.join(temp, "unbuilt-binding.json");
  const outputDir = path.join(temp, "out");
  fs.writeFileSync(extraDataFile, extraData + "\n", { mode: 0o600 });
  fs.writeFileSync(
    syntheticBindingPath,
    JSON.stringify(unbuiltBinding, null, 2) + "\n",
    { mode: 0o600 },
  );

  const run = spawnSync(
    process.execPath,
    [
      "tools/void-economic-epoch2-qbft-production-extra-data-bind-v1.mjs",
      "--binding",
      syntheticBindingPath,
      "--extra-data",
      extraDataFile,
      "--besu-image-digest",
      PINNED_BESU_26_8_1,
      "--output-dir",
      outputDir,
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env },
    },
  );
  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.match(
    run.stdout,
    new RegExp(
      VOID_ECONOMIC_EPOCH2_QBFT_PRODUCTION_EXTRA_DATA_BIND_V1,
    ),
  );
  assert.match(run.stdout, /validator_count=3/);
  assert.match(run.stdout, /production_validator_set_bound=false/);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log(
  "VOID_ECONOMIC_EPOCH2_QBFT_PRODUCTION_EXTRA_DATA_BIND_V1_PROOF_GREEN",
);
console.log("synthetic_unbuilt_three_identity_preflight_ready=true");
console.log("canonical_production_extra_data_promoted=true");
console.log("canonical_rlp_structure_verified=true");
console.log("validator_count=3");
console.log("required_validator_quorum=2");
console.log("byzantine_fault_tolerance=0");
console.log("one_byzantine_fault_tolerance_available=false");
console.log("fourth_validator_required_for_launch=false");
console.log("production_validator_set_bound=false");
console.log("offline_successor_equivalence_proven=false");
console.log("all_production_validators_epoch_domain_enforced=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
