#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { computeAddress } from "ethers";

const identityPath =
  "ops/mainnet0/economic-epoch2-qbft-node-identity-nimo-v1.json";
const bindingPath =
  "ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json";
const rotationPath =
  "ops/mainnet0/economic-epoch2-qbft-node-identity-nimo-rotation-v1.json";

const identityBytes = fs.readFileSync(identityPath);
const identity = JSON.parse(identityBytes.toString("utf8"));
const binding = JSON.parse(fs.readFileSync(bindingPath, "utf8"));
const rotation = JSON.parse(fs.readFileSync(rotationPath, "utf8"));

const sha256 = (bytes) =>
  crypto.createHash("sha256").update(bytes).digest("hex");

assert.equal(
  sha256(identityBytes),
  "f7480b1a1086fe62328528e108c7cde9588e9c3b26a8277e88169aa486fd9ab2",
);

assert.equal(
  rotation.marker,
  "VOID_ECONOMIC_EPOCH2_QBFT_NIMO_IDENTITY_ROTATION_V1",
);
assert.equal(
  rotation.status,
  "NIMO_QBFT_IDENTITY_ROTATED_PRE_BINDING_RECOVERY_MISS_GREEN",
);
assert.equal(rotation.machine_role, "nimo");
assert.equal(rotation.hostname, "Nimo");
assert.equal(rotation.recovery_census.candidate_file_count, 1);
assert.equal(rotation.recovery_census.matching_key_count, 0);
assert.equal(rotation.recovery_census.recovery_candidate_found, false);
assert.equal(rotation.recovery_census.private_key_content_printed, false);

assert.equal(rotation.preconditions.production_validator_set_bound, false);
assert.equal(rotation.preconditions.offline_successor_equivalence_proven, false);
assert.equal(rotation.preconditions.migration_authorized, false);
assert.equal(rotation.preconditions.public_activation_authorized, false);

assert.equal(
  rotation.old_identity.besu_validator_address,
  "0x95cd9f9b57a53e1fc86411d52092051611282904",
);
assert.equal(
  rotation.old_identity.besu_public_key,
  "0x04972a3772467df3d3986364ccd0668c8502d9b1e5e365e5370999363b01afd027bdc5873068db86c191f97100442d4bd6367ebab5bf6ce6c515be2d783fc6ce25",
);
assert.equal(rotation.old_identity.private_key_available, false);

assert.equal(
  rotation.new_identity.public_attestation_path,
  identityPath,
);
assert.equal(
  rotation.new_identity.public_attestation_sha256,
  sha256(identityBytes),
);
assert.equal(
  rotation.new_identity.local_private_attestation_sha256,
  "a784790de1b4502a04b2fa0e3f6949789553a3c765155f570811574cab838d40",
);
assert.equal(
  rotation.new_identity.local_private_attestation_filename,
  "void_epoch2_qbft_identity_nimo_v1_20260929T140832Z.json",
);
assert.equal(rotation.new_identity.node_private_key_created, true);
assert.equal(rotation.new_identity.node_private_key_mode, "600");
assert.equal(rotation.new_identity.private_key_content_printed, false);
assert.equal(rotation.new_identity.private_key_content_exported, false);
assert.equal(rotation.new_identity.private_key_content_recorded_in_repo, false);

assert.equal(
  identity.marker,
  "VOID_ECONOMIC_EPOCH2_QBFT_NODE_IDENTITY_PUBLIC_ATTESTATION_V1",
);
assert.equal(identity.status, "PUBLIC_IDENTITY_DERIVATION_GREEN_UNBOUND");
assert.equal(
  identity.source_commit,
  "aa978947bdeb5045f94b50b4c59b53c2d0dd7841",
);
assert.equal(identity.machine_role, "nimo");
assert.equal(identity.hostname, "Nimo");
assert.equal(identity.void_node_id, "12babb04b0f88de7b74e17d04b343007");
assert.equal(identity.node_base, "http://127.0.0.1:4100");
assert.equal(
  identity.besu.public_key,
  "0x042a748293a1959a5dbabd8e504ae2f09f0e1b3807e6353b1d9114ad581c6ea805419d7e8707576449ad35b12519f209a2d8f160343b3a139fec1665bf2e2c41fe",
);
assert.equal(
  identity.besu.validator_address,
  "0x02f967953386188397b992c208239d3a25180db6",
);
assert.equal(
  computeAddress(identity.besu.public_key).toLowerCase(),
  identity.besu.validator_address,
);
assert.equal(identity.besu.public_key_address_derivation_verified, true);
assert.equal(
  identity.local_private_attestation.file_sha256,
  rotation.new_identity.local_private_attestation_sha256,
);
assert.equal(
  identity.local_private_attestation.private_key_content_exported,
  false,
);
assert.equal(
  identity.local_private_attestation.private_key_content_recorded_in_repo,
  false,
);

assert.notEqual(
  rotation.old_identity.besu_public_key,
  identity.besu.public_key,
);
assert.notEqual(
  rotation.old_identity.besu_validator_address,
  identity.besu.validator_address,
);
assert.equal(
  rotation.old_identity.void_node_id,
  identity.void_node_id,
);

const nimo = binding.qbft.production_binding_entries.find(
  (entry) => entry.machine_role === "nimo",
);
assert.ok(nimo);
assert.equal(nimo.void_node_id, identity.void_node_id);
assert.equal(nimo.besu_public_key, identity.besu.public_key);
assert.equal(nimo.besu_validator_address, identity.besu.validator_address);
assert.equal(nimo.public_key_address_derivation_verified, true);
assert.equal(nimo.node_identity_attestation, identityPath);
assert.equal(
  nimo.node_identity_attestation_sha256,
  identity.local_private_attestation.file_sha256,
);

assert.equal(binding.qbft.production_binding_entries.length, 3);
assert.equal(binding.qbft.required_live_node_count, 3);
assert.equal(binding.qbft.attested_live_node_count, 3);
assert.equal(binding.qbft.attested_identity_slots_remaining, 0);
assert.equal(binding.qbft.production_extra_data_built, true);
assert.equal(
  binding.qbft.production_extra_data_sha256,
  "3449e754ec65555e90ea70cdf830f4a8a18946ee5b6221fcf5ad1a748a98c181",
);
assert.equal(
  binding.qbft.production_extra_data_evidence,
  "ops/mainnet0/economic-epoch2-qbft-production-extra-data-v1.json",
);

for (const field of [
  "qbft_live_identity_manifest_ready",
  "qbft_minimum_live_nodes_attested",
  "qbft_public_key_address_derivations_verified",
  "qbft_production_extra_data_built",
]) {
  assert.equal(binding.gates[field], true, field);
}
for (const field of [
  "production_validator_set_bound",
  "offline_successor_equivalence_proven",
  "migration_authorized",
  "public_activation_authorized",
]) {
  assert.equal(binding.gates[field], false, field);
}

for (const field of [
  "production_validator_set_bound",
  "offline_successor_equivalence_proven",
  "all_production_validators_epoch_domain_enforced",
  "cross_epoch_replay_protection_proven",
  "migration_authorized",
  "public_activation_authorized",
]) {
  assert.equal(rotation.gates[field], false, field);
}

for (const [field, value] of Object.entries(rotation.authority)) {
  assert.equal(
    value,
    field === "source_rotation_record_only",
    field,
  );
}

console.log("VOID_ECONOMIC_EPOCH2_QBFT_NIMO_IDENTITY_ROTATION_V1_PROOF_GREEN");
console.log("public_attestation_sha256=f7480b1a1086fe62328528e108c7cde9588e9c3b26a8277e88169aa486fd9ab2");
console.log("old_validator_address=0x95cd9f9b57a53e1fc86411d52092051611282904");
console.log("new_validator_address=0x02f967953386188397b992c208239d3a25180db6");
console.log("recovery_candidate_found=false");
console.log("private_key_content_printed=false");
console.log("canonical_qbft_production_extra_data_built=true");
console.log("production_validator_set_bound=false");
console.log("offline_successor_equivalence_proven=false");
console.log("all_production_validators_epoch_domain_enforced=false");
console.log("cross_epoch_replay_protection_proven=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
