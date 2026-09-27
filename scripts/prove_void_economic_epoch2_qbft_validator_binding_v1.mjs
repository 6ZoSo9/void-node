#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { keccak256, toUtf8Bytes, getAddress } from "ethers";

const bindingPath =
  "ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json";
const clientPath =
  "ops/mainnet0/economic-epoch2-production-client-candidate-v1.json";
const migrationPath =
  "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json";
const statusPath = "ops/mainnet/validator-status.current.yaml";
const docPath =
  "docs/architecture/economic-epoch2-qbft-validator-binding-v1.md";

const binding = JSON.parse(fs.readFileSync(bindingPath, "utf8"));
const client = JSON.parse(fs.readFileSync(clientPath, "utf8"));
const migration = JSON.parse(fs.readFileSync(migrationPath, "utf8"));
const status = fs.readFileSync(statusPath, "utf8");
const doc = fs.readFileSync(docPath, "utf8");

assert.equal(
  binding.marker,
  "VOID_ECONOMIC_EPOCH2_QBFT_VALIDATOR_BINDING_CANDIDATE_V1",
);
assert.equal(binding.status, "HOLD");

assert.equal(binding.economic_validator_roster.validator_count, 126);
assert.equal(
  binding.economic_validator_roster.total_power_atoms,
  "126000000000000000000000",
);
assert.equal(
  binding.economic_validator_roster.validator_set_commitment,
  "0x55ea66fcd73d8e74c0e6baeaa54da5b399c7c3256b5cc9bd296e5540e9079c00",
);
assert.equal(
  binding.economic_validator_roster.ordered_roster_material_sha256,
  "aa69c4c9e353fe0c7a62d80fdd31554debfc9632e8f19498e3584d68b327f4fc",
);
assert.equal(
  binding.economic_validator_roster.offline_roster_receipt_file_sha256,
  "18826de09a3d9513be389b6fa13e82ff73c3b1fff7467845a54df0387598b979",
);
assert.equal(
  binding.economic_validator_roster.is_besu_qbft_validator_address_source,
  false,
);

const nodeIdMatch = status.match(/node_id=([0-9a-fA-F]+)/);
assert.ok(nodeIdMatch, "validator status must record node_id");
const statusNodeId = nodeIdMatch[1].toLowerCase();
assert.equal(
  statusNodeId,
  binding.identity_semantics.candidate_validator_01.void_node_id,
);

const modernHash = keccak256(
  toUtf8Bytes(
    binding.identity_semantics.candidate_validator_01.modern_candidate_domain +
      statusNodeId,
  ),
).toLowerCase();
assert.equal(
  modernHash,
  binding.identity_semantics.candidate_validator_01.modern_candidate_consensus_key_hash,
);
assert.notEqual(
  modernHash,
  binding.identity_semantics.candidate_validator_01.legacy_consensus_key,
);
assert.equal(binding.identity_semantics.candidate_validator_01.equal, false);
assert.equal(
  binding.identity_semantics
    .automatic_legacy_void_consensus_key_to_besu_address_derivation_proven,
  false,
);
assert.equal(
  binding.identity_semantics
    .automatic_legacy_void_consensus_key_to_besu_address_derivation_allowed,
  false,
);

assert.equal(client.consensus.engine, "QBFT");
assert.equal(client.consensus.production_validator_set_bound, false);
assert.equal(
  client.consensus.placeholder_validator_set_must_not_ship_to_production,
  true,
);

const placeholders =
  client.consensus.placeholder_validator_set_for_offline_genesis_proof_only.map(
    (x) => getAddress(x).toLowerCase(),
  );
const forbidden =
  binding.qbft.placeholder_validator_addresses_forbidden.map((x) =>
    getAddress(x).toLowerCase(),
  );
assert.deepEqual(placeholders, forbidden);
assert.equal(new Set(forbidden).size, 4);

assert.equal(binding.qbft.client, "Besu");
assert.equal(binding.qbft.client_version, "26.8.1");
assert.equal(binding.qbft.consensus, "QBFT");
assert.equal(binding.qbft.selected_validator_management_method, "blockheader");
assert.equal(binding.qbft.minimum_byzantine_fault_tolerant_validator_count, 4);
assert.deepEqual(binding.qbft.production_binding_entries, []);
assert.equal(binding.qbft.production_extra_data_built, false);
assert.equal(binding.qbft.production_extra_data_sha256, null);

assert.equal(
  migration.source_contract_disposition.ValidatorSet,
  "archive_only_economic_migration_does_not_depend_on_frozen_bootstrap_validator_contract",
);
assert.match(
  migration.source_contract_disposition.UpgradeStaking,
  /preserve_stake_beneficiary_accounting/,
);

for (const field of [
  "economic_validator_roster_proven",
  "void_and_besu_identity_semantics_separated",
]) {
  assert.equal(binding.gates[field], true, field);
}
for (const field of [
  "qbft_live_identity_manifest_ready",
  "qbft_minimum_live_nodes_attested",
  "qbft_public_key_address_derivations_verified",
  "qbft_production_extra_data_built",
  "production_validator_set_bound",
  "offline_successor_equivalence_proven",
  "migration_authorized",
  "public_activation_authorized",
]) {
  assert.equal(binding.gates[field], false, field);
}

for (const field of [
  "service_action",
  "validator_mutation",
  "wallet_access",
  "private_key_access",
  "credential_content_access",
  "transaction_construction",
  "transaction_signing",
  "transaction_submission",
  "transaction_broadcast",
  "authoritative_chain2050_write",
  "token_movement",
  "funds_movement",
  "migration_authorized",
  "public_activation_authorized",
]) {
  assert.equal(binding.authority[field], false, field);
}

for (const needle of [
  "Automatic truncation, reinterpretation, hashing, or other conversion",
  "No private Besu node key belongs in the repository.",
  "fewer than four independently attested live Besu validator identities",
  "production_validator_set_bound=false",
]) {
  assert.ok(doc.includes(needle), needle);
}

console.log(
  "VOID_ECONOMIC_EPOCH2_QBFT_VALIDATOR_BINDING_BOUNDARY_V1_PROOF_GREEN",
);
console.log("economic_validator_count=126");
console.log(
  "economic_validator_set_commitment=0x55ea66fcd73d8e74c0e6baeaa54da5b399c7c3256b5cc9bd296e5540e9079c00",
);
console.log(
  "ordered_roster_material_sha256=aa69c4c9e353fe0c7a62d80fdd31554debfc9632e8f19498e3584d68b327f4fc",
);
console.log("modern_candidate_node_id_hash=" + modernHash);
console.log(
  "legacy_consensus_key=" +
    binding.identity_semantics.candidate_validator_01.legacy_consensus_key,
);
console.log("legacy_key_equals_modern_node_id_hash=false");
console.log("legacy_void_consensus_key_auto_conversion_allowed=false");
console.log("qbft_validator_management_method=blockheader");
console.log("qbft_minimum_fault_tolerant_validator_count=4");
console.log("production_binding_entry_count=0");
console.log("placeholder_validator_addresses_forbidden=true");
console.log("economic_roster_is_not_besu_address_source=true");
console.log("production_validator_set_bound=false");
console.log("offline_successor_equivalence_proven=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
