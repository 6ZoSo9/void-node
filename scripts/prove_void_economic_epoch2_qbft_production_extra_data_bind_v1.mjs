#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { SigningKey, computeAddress, encodeRlp } from "ethers";

import {
  importVoidEconomicEpoch2QbftFourthIdentityV1,
} from "../tools/void-economic-epoch2-qbft-fourth-identity-import-v1.mjs";
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
const canonical = JSON.parse(fs.readFileSync(bindingPath, "utf8"));

const current = prepareQbftProductionExtraDataInputV1(canonical);
assert.equal(current.status, "HOLD");
assert.equal(current.reason, "insufficient_attested_live_nodes");
assert.equal(current.attested_live_node_count, 3);
assert.equal(current.required_live_node_count, 4);
assert.equal(current.attested_identity_slots_remaining, 1);

const signingKey = new SigningKey("0x" + "44".repeat(32));
const publicKey = signingKey.publicKey.toLowerCase();
const validatorAddress = computeAddress(publicKey).toLowerCase();

const fourthAttestation = {
  marker: "VOID_ECONOMIC_EPOCH2_QBFT_NODE_IDENTITY_PUBLIC_ATTESTATION_V1",
  version: 1,
  status: "PUBLIC_IDENTITY_DERIVATION_GREEN_UNBOUND",
  source_commit: "5c8238969c8e5ed02f7c941f8977fe411ce4ce7c",
  machine_role: "alienware",
  hostname: "Alienware",
  void_node_id: "a".repeat(32),
  node_base: "http://127.0.0.1:4100",
  besu: {
    client: "Besu",
    client_version: "26.8.1",
    image: PINNED_BESU_26_8_1,
    public_key: publicKey,
    validator_address: validatorAddress,
    address_derivation_method:
      "ethers.SigningKey.publicKey + ethers.computeAddress",
    public_key_address_derivation_verified: true,
  },
  local_private_attestation: {
    filename:
      "void_epoch2_qbft_identity_alienware_v1_20260929T120000Z.json",
    file_sha256: "b".repeat(64),
    private_key_content_exported: false,
    private_key_content_recorded_in_repo: false,
  },
  authority: {
    besu_node_started: false,
    production_validator_set_bound: false,
    validator_mutation: false,
    authoritative_chain2050_write: false,
    funds_movement: false,
    migration_authorized: false,
    public_activation: false,
  },
};

const imported = importVoidEconomicEpoch2QbftFourthIdentityV1({
  binding: canonical,
  attestation: fourthAttestation,
});

const ready =
  prepareQbftProductionExtraDataInputV1(imported.updated_binding);
assert.equal(
  ready.status,
  "READY_FOR_BESU_QBFT_EXTRA_DATA_ENCODING",
);
assert.equal(ready.validators.length, 4);
assert.equal(ready.validators[3], validatorAddress);

const syntheticExtraData = encodeRlp([
  "0x" + "00".repeat(32),
  ready.validators,
  [],
  "0x",
  [],
]);

const bound = bindVoidEconomicEpoch2QbftProductionExtraDataV1({
  binding: imported.updated_binding,
  extraData: syntheticExtraData,
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
assert.equal(bound.evidence.client.name, "Besu");
assert.equal(bound.evidence.client.version, "26.8.1");
assert.equal(bound.evidence.client.image, PINNED_BESU_26_8_1);
assert.equal(bound.evidence.chain_id, 2050);
assert.equal(bound.evidence.validator_count, 4);
assert.deepEqual(bound.evidence.validators, ready.validators);
assert.equal(bound.evidence.extra_data_hex, syntheticExtraData);
assert.ok(bound.evidence.extra_data_bytes > 0);
assert.match(bound.evidence.extra_data_sha256, /^[0-9a-f]{64}$/);
assert.equal(bound.evidence.decoded.vanity_zero_bytes, 32);
assert.equal(bound.evidence.decoded.validator_order_exact, true);
assert.equal(bound.evidence.decoded.vote_empty, true);
assert.equal(bound.evidence.decoded.round, 0);
assert.equal(bound.evidence.decoded.commit_seals_empty, true);
assert.equal(bound.evidence.decoded.independently_reencoded_exact, true);

assert.equal(bound.updated_binding.status, "HOLD");
assert.equal(
  bound.updated_binding.qbft.production_binding_entries.length,
  4,
);
assert.equal(bound.updated_binding.qbft.attested_live_node_count, 4);
assert.equal(
  bound.updated_binding.qbft.attested_identity_slots_remaining,
  0,
);
assert.equal(
  bound.updated_binding.qbft.production_extra_data_built,
  true,
);
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
for (const field of [
  "production_validator_set_bound",
  "offline_successor_equivalence_proven",
  "all_production_validators_epoch_domain_enforced",
  "authoritative_chain2050_write",
  "migration_authorized",
  "public_activation_authorized",
]) {
  assert.equal(bound.evidence.gates[field], false, field);
}
assert.equal(
  bound.evidence.gates.qbft_live_identity_manifest_ready,
  true,
);
assert.equal(
  bound.evidence.gates.qbft_minimum_live_nodes_attested,
  true,
);
assert.equal(
  bound.evidence.gates.qbft_public_key_address_derivations_verified,
  true,
);
assert.equal(
  bound.evidence.gates.qbft_production_extra_data_built,
  true,
);

for (const [key, value] of Object.entries(bound.evidence.authority)) {
  if (key === "source_and_offline_encoding_only") {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

assert.throws(
  () =>
    bindVoidEconomicEpoch2QbftProductionExtraDataV1({
      binding: canonical,
      extraData: syntheticExtraData,
      besuImageDigest: PINNED_BESU_26_8_1,
    }),
  /qbft_production_extra_data_preflight_not_ready/,
);

assert.throws(
  () =>
    bindVoidEconomicEpoch2QbftProductionExtraDataV1({
      binding: imported.updated_binding,
      extraData: syntheticExtraData,
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
      binding: imported.updated_binding,
      extraData: reordered,
      besuImageDigest: PINNED_BESU_26_8_1,
    }),
  /qbft_extra_data_validator_order_mismatch/,
);

const wrongVanity = encodeRlp([
  "0x" + "11".repeat(32),
  ready.validators,
  [],
  "0x",
  [],
]);
assert.throws(
  () =>
    bindVoidEconomicEpoch2QbftProductionExtraDataV1({
      binding: imported.updated_binding,
      extraData: wrongVanity,
      besuImageDigest: PINNED_BESU_26_8_1,
    }),
  /qbft_extra_data_vanity_invalid/,
);

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-qbft-production-extra-data-bind-v1-"),
);
try {
  const syntheticBinding = path.join(temp, "binding.json");
  const extraDataFile = path.join(temp, "extra-data.txt");
  const outputDir = path.join(temp, "out");
  fs.writeFileSync(
    syntheticBinding,
    imported.updated_binding_bytes,
    { mode: 0o600 },
  );
  fs.writeFileSync(extraDataFile, syntheticExtraData + "\n", {
    mode: 0o600,
  });

  const run = spawnSync(
    process.execPath,
    [
      "tools/void-economic-epoch2-qbft-production-extra-data-bind-v1.mjs",
      "--binding",
      syntheticBinding,
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
  assert.match(run.stdout, /qbft_production_extra_data_built=true/);
  assert.match(run.stdout, /production_validator_set_bound=false/);

  const outBinding = JSON.parse(
    fs.readFileSync(
      path.join(
        outputDir,
        "economic-epoch2-qbft-validator-binding-candidate-v1.json",
      ),
      "utf8",
    ),
  );
  const outEvidence = JSON.parse(
    fs.readFileSync(
      path.join(
        outputDir,
        "economic-epoch2-qbft-production-extra-data-v1.json",
      ),
      "utf8",
    ),
  );
  assert.equal(outBinding.qbft.production_extra_data_built, true);
  assert.equal(
    outBinding.qbft.production_extra_data_sha256,
    outEvidence.extra_data_sha256,
  );
  assert.equal(
    outEvidence.extra_data_hex,
    syntheticExtraData,
  );
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

const syntheticBindingOutput =
  process.env.VOID_QBFT_PRODUCTION_EXTRA_DATA_SYNTHETIC_BINDING_OUTPUT;
if (syntheticBindingOutput) {
  const resolved = path.resolve(syntheticBindingOutput);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, imported.updated_binding_bytes, {
    mode: 0o644,
  });
}

console.log(
  "VOID_ECONOMIC_EPOCH2_QBFT_PRODUCTION_EXTRA_DATA_BIND_V1_PROOF_GREEN",
);
console.log("canonical_current_identity_count=3");
console.log("synthetic_four_identity_preflight_ready=true");
console.log("canonical_rlp_structure_verified=true");
console.log("validator_order_exact=true");
console.log("pinned_besu_digest_required=true");
console.log("qbft_live_identity_manifest_ready=true");
console.log("qbft_minimum_live_nodes_attested=true");
console.log("qbft_public_key_address_derivations_verified=true");
console.log("qbft_production_extra_data_built=true");
console.log("production_validator_set_bound=false");
console.log("offline_successor_equivalence_proven=false");
console.log("all_production_validators_epoch_domain_enforced=false");
console.log("authoritative_chain2050_write=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
console.log("funds_movement=false");
