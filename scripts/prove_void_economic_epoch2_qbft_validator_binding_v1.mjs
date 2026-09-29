#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { keccak256, toUtf8Bytes, getAddress, computeAddress } from "ethers";

const bindingPath =
  "ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json";
const topologyPath =
  "ops/mainnet0/economic-epoch2-qbft-topology-v1.json";
const clientPath =
  "ops/mainnet0/economic-epoch2-production-client-candidate-v1.json";
const migrationPath =
  "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json";
const statusPath = "ops/mainnet/validator-status.current.yaml";
const docPath =
  "docs/architecture/economic-epoch2-qbft-validator-binding-v1.md";
const precisionIdentityPath =
  "ops/mainnet0/economic-epoch2-qbft-node-identity-precision-v1.json";
const nimoIdentityPath =
  "ops/mainnet0/economic-epoch2-qbft-node-identity-nimo-v1.json";
const xiphosIdentityPath =
  "ops/mainnet0/economic-epoch2-qbft-node-identity-xiphos-v1.json";

const binding = JSON.parse(fs.readFileSync(bindingPath, "utf8"));
const topology = JSON.parse(fs.readFileSync(topologyPath, "utf8"));
const client = JSON.parse(fs.readFileSync(clientPath, "utf8"));
const migration = JSON.parse(fs.readFileSync(migrationPath, "utf8"));
const status = fs.readFileSync(statusPath, "utf8");
const doc = fs.readFileSync(docPath, "utf8");
const precisionIdentity = JSON.parse(
  fs.readFileSync(precisionIdentityPath, "utf8"),
);
const nimoIdentity = JSON.parse(
  fs.readFileSync(nimoIdentityPath, "utf8"),
);
const xiphosIdentity = JSON.parse(
  fs.readFileSync(xiphosIdentityPath, "utf8"),
);

assert.equal(
  binding.marker,
  "VOID_ECONOMIC_EPOCH2_QBFT_VALIDATOR_BINDING_CANDIDATE_V1",
);
const successorPromoted =
  binding.gates?.production_validator_set_bound===true &&
  binding.gates?.offline_successor_equivalence_proven===true;
assert.equal(
  binding.status,
  successorPromoted
    ? "PRODUCTION_VALIDATOR_SET_BOUND_OFFLINE_SUCCESSOR_EQUIVALENCE_GREEN"
    : "HOLD",
);

assert.equal(topology.marker, "VOID_ECONOMIC_EPOCH2_QBFT_TOPOLOGY_V1");
assert.equal(topology.status, "THREE_VALIDATOR_PRODUCTION_TOPOLOGY_SELECTED");
assert.equal(topology.production_validator_count, 3);
assert.deepEqual(topology.production_machine_roles, [
  "precision",
  "nimo",
  "xiphos",
]);
assert.equal(topology.quorum.besu_formula, "ceil(2N/3)");
assert.equal(topology.besu_quorum_source.project, "besu-eth/besu");
assert.equal(
  topology.besu_quorum_source.release_commit,
  "d97cbd61976a52bb109e637196fef9a8ebf2b617",
);
assert.equal(
  topology.besu_quorum_source.path,
  "consensus/common/src/main/java/org/hyperledger/besu/consensus/common/bft/BftHelpers.java",
);
assert.equal(
  topology.besu_quorum_source.git_blob_sha1,
  "6c52dd719144a4d85fd61f9efe06b353f34c9316",
);
assert.equal(
  topology.besu_quorum_source.implementation,
  "Util.fastDivCeiling(2 * validatorCount, 3)",
);
assert.equal(topology.quorum.required_validator_quorum, 2);
assert.equal(topology.quorum.byzantine_fault_tolerance, 0);
assert.equal(
  topology.quorum.one_byzantine_fault_tolerance_available,
  false,
);
assert.equal(
  topology.quorum.minimum_validator_count_for_one_byzantine_fault_tolerance,
  4,
);
assert.equal(topology.policy.fourth_validator_required_for_launch, false);
assert.equal(
  topology.policy.unassigned_fourth_slot_is_not_a_blocker,
  true,
);
assert.equal(
  topology.policy.production_topology_may_expand_later,
  true,
);

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
assert.equal(binding.qbft.topology_evidence, topologyPath);
assert.equal(binding.qbft.production_validator_count, 3);
assert.equal(binding.qbft.required_validator_quorum, 2);
assert.equal(binding.qbft.byzantine_fault_tolerance, 0);
assert.equal(binding.qbft.one_byzantine_fault_tolerance_available, false);
assert.equal(
  binding.qbft.minimum_validator_count_for_one_byzantine_fault_tolerance,
  4,
);
assert.equal(binding.qbft.fourth_validator_required_for_launch, false);
assert.equal(binding.qbft.required_live_node_count, 3);
assert.equal(binding.qbft.attested_live_node_count, 3);
assert.equal(binding.qbft.attested_identity_slots_remaining, 0);
assert.equal(binding.qbft.production_binding_entries.length, 3);
assert.deepEqual(
  binding.qbft.production_binding_entries.map((entry) => entry.machine_role),
  topology.production_machine_roles,
);

const [precisionBinding, nimoBinding, xiphosBinding] =
  binding.qbft.production_binding_entries;
assert.equal(precisionBinding.machine_role, "precision");
assert.equal(
  precisionBinding.void_node_id,
  "9d89483769e469e0473b489dc50dba96",
);
assert.equal(
  precisionBinding.besu_validator_address,
  "0xf00436d7e27cec6cd24723ee5a78ce24c0ef5863",
);
assert.equal(
  precisionBinding.public_key_address_derivation_verified,
  true,
);
assert.equal(
  precisionBinding.node_identity_attestation,
  precisionIdentityPath,
);
assert.equal(
  precisionBinding.node_identity_attestation_sha256,
  "496965f9d65ad41ac55d7fdc05715bf19c58dca822412ec43523bbe43e94393d",
);

assert.equal(
  precisionIdentity.marker,
  "VOID_ECONOMIC_EPOCH2_QBFT_NODE_IDENTITY_PUBLIC_ATTESTATION_V1",
);
assert.equal(
  precisionIdentity.status,
  "PUBLIC_IDENTITY_DERIVATION_GREEN_UNBOUND",
);
assert.equal(precisionIdentity.machine_role, "precision");
assert.equal(
  precisionIdentity.void_node_id,
  precisionBinding.void_node_id,
);
assert.equal(
  precisionIdentity.besu.public_key,
  precisionBinding.besu_public_key,
);
assert.equal(
  precisionIdentity.besu.validator_address,
  precisionBinding.besu_validator_address,
);
assert.equal(
  precisionIdentity.besu.public_key_address_derivation_verified,
  true,
);
assert.equal(
  computeAddress(precisionBinding.besu_public_key).toLowerCase(),
  precisionBinding.besu_validator_address,
);
assert.ok(
  !forbidden.includes(precisionBinding.besu_validator_address),
  "Precision validator address must not equal a proof-only placeholder",
);
assert.equal(
  precisionIdentity.local_private_attestation.file_sha256,
  precisionBinding.node_identity_attestation_sha256,
);
assert.equal(
  precisionIdentity.local_private_attestation.private_key_content_exported,
  false,
);
assert.equal(
  precisionIdentity.local_private_attestation.private_key_content_recorded_in_repo,
  false,
);

assert.equal(nimoBinding.machine_role, "nimo");
assert.equal(
  nimoBinding.void_node_id,
  "12babb04b0f88de7b74e17d04b343007",
);
assert.equal(
  nimoBinding.besu_validator_address,
  "0x02f967953386188397b992c208239d3a25180db6",
);
assert.equal(
  nimoBinding.besu_public_key,
  "0x042a748293a1959a5dbabd8e504ae2f09f0e1b3807e6353b1d9114ad581c6ea805419d7e8707576449ad35b12519f209a2d8f160343b3a139fec1665bf2e2c41fe",
);
assert.equal(nimoBinding.public_key_address_derivation_verified, true);
assert.equal(nimoBinding.node_identity_attestation, nimoIdentityPath);
assert.equal(
  nimoBinding.node_identity_attestation_sha256,
  "a784790de1b4502a04b2fa0e3f6949789553a3c765155f570811574cab838d40",
);

assert.equal(
  nimoIdentity.marker,
  "VOID_ECONOMIC_EPOCH2_QBFT_NODE_IDENTITY_PUBLIC_ATTESTATION_V1",
);
assert.equal(
  nimoIdentity.status,
  "PUBLIC_IDENTITY_DERIVATION_GREEN_UNBOUND",
);
assert.equal(nimoIdentity.machine_role, "nimo");
assert.equal(nimoIdentity.void_node_id, nimoBinding.void_node_id);
assert.equal(nimoIdentity.besu.public_key, nimoBinding.besu_public_key);
assert.equal(
  nimoIdentity.besu.validator_address,
  nimoBinding.besu_validator_address,
);
assert.equal(
  nimoIdentity.besu.public_key_address_derivation_verified,
  true,
);
assert.equal(
  computeAddress(nimoBinding.besu_public_key).toLowerCase(),
  nimoBinding.besu_validator_address,
);
assert.ok(
  !forbidden.includes(nimoBinding.besu_validator_address),
  "Nimo validator address must not equal a proof-only placeholder",
);
assert.equal(
  nimoIdentity.local_private_attestation.file_sha256,
  nimoBinding.node_identity_attestation_sha256,
);
assert.equal(
  nimoIdentity.local_private_attestation.private_key_content_exported,
  false,
);
assert.equal(
  nimoIdentity.local_private_attestation.private_key_content_recorded_in_repo,
  false,
);

assert.equal(xiphosBinding.machine_role, "xiphos");
assert.equal(
  xiphosBinding.void_node_id,
  "057593d7f3039b710bd904a081f83d17",
);
assert.equal(
  xiphosBinding.besu_validator_address,
  "0x461bf06270d9d28962f7570182c061b828799b66",
);
assert.equal(
  xiphosBinding.besu_public_key,
  "0x04f4e3b8a08d7f22c88652e000ad5e94fcbe8e883d0dc677fe2e2e676d02fafa79f5e8d6678f52b7641bb57882571931377b5e6694bcc3035cce0ba19d438d6935",
);
assert.equal(xiphosBinding.public_key_address_derivation_verified, true);
assert.equal(xiphosBinding.node_identity_attestation, xiphosIdentityPath);
assert.equal(
  xiphosBinding.node_identity_attestation_sha256,
  "511a6770292c3432ea17595e0db70630275b8aeb1f0c599a45f2705583a4ade2",
);

assert.equal(
  xiphosIdentity.marker,
  "VOID_ECONOMIC_EPOCH2_QBFT_NODE_IDENTITY_PUBLIC_ATTESTATION_V1",
);
assert.equal(
  xiphosIdentity.status,
  "PUBLIC_IDENTITY_DERIVATION_GREEN_UNBOUND",
);
assert.equal(xiphosIdentity.machine_role, "xiphos");
assert.equal(xiphosIdentity.void_node_id, xiphosBinding.void_node_id);
assert.equal(xiphosIdentity.besu.public_key, xiphosBinding.besu_public_key);
assert.equal(
  xiphosIdentity.besu.validator_address,
  xiphosBinding.besu_validator_address,
);
assert.equal(
  xiphosIdentity.besu.public_key_address_derivation_verified,
  true,
);
assert.equal(
  computeAddress(xiphosBinding.besu_public_key).toLowerCase(),
  xiphosBinding.besu_validator_address,
);
assert.ok(
  !forbidden.includes(xiphosBinding.besu_validator_address),
  "Xiphos validator address must not equal a proof-only placeholder",
);
assert.equal(
  xiphosIdentity.local_private_attestation.file_sha256,
  xiphosBinding.node_identity_attestation_sha256,
);
assert.equal(
  xiphosIdentity.local_private_attestation.private_key_content_exported,
  false,
);
assert.equal(
  xiphosIdentity.local_private_attestation.private_key_content_recorded_in_repo,
  false,
);

assert.equal(
  new Set(binding.qbft.production_binding_entries.map((x) => x.void_node_id)).size,
  binding.qbft.production_binding_entries.length,
);
assert.equal(
  new Set(
    binding.qbft.production_binding_entries.map((x) =>
      getAddress(x.besu_validator_address).toLowerCase(),
    ),
  ).size,
  binding.qbft.production_binding_entries.length,
);
assert.equal(
  new Set(
    binding.qbft.production_binding_entries.map((x) =>
      x.besu_public_key.toLowerCase(),
    ),
  ).size,
  binding.qbft.production_binding_entries.length,
);

assert.equal(binding.qbft.production_extra_data_built, true);
assert.equal(
  binding.qbft.production_extra_data_sha256,
  "3449e754ec65555e90ea70cdf830f4a8a18946ee5b6221fcf5ad1a748a98c181",
);
assert.equal(
  binding.qbft.production_extra_data_evidence,
  "ops/mainnet0/economic-epoch2-qbft-production-extra-data-v1.json",
);

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
]) {
  assert.equal(binding.gates[field], successorPromoted, field);
}
for (const field of [
  "migration_authorized",
  "public_activation_authorized",
]) {
  assert.equal(binding.gates[field], false, field);
}
if(successorPromoted){
  assert.equal(
    binding.production_successor_equivalence?.evidence_file,
    "ops/mainnet0/economic-epoch2-production-successor-equivalence-evidence-v1.json",
  );
  assert.equal(
    binding.production_successor_equivalence?.promotion_file,
    "ops/mainnet0/economic-epoch2-production-successor-equivalence-promotion-v1.json",
  );
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
  "Automatic conversion of legacy VOID consensus keys into Besu validator",
  "No private Besu node key belongs in the repository.",
  "production_validator_count=3",
  "byzantine_fault_tolerance=0",
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
console.log("qbft_production_validator_count=3");
console.log("qbft_required_validator_quorum=2");
console.log("qbft_byzantine_fault_tolerance=0");
console.log("qbft_one_byzantine_fault_tolerance_available=false");
console.log("qbft_minimum_validator_count_for_one_byzantine_fault_tolerance=4");
console.log("qbft_fourth_validator_required_for_launch=false");
console.log("production_binding_entry_count=3");
console.log("precision_void_node_id=9d89483769e469e0473b489dc50dba96");
console.log("precision_besu_validator_address=0xf00436d7e27cec6cd24723ee5a78ce24c0ef5863");
console.log("precision_public_key_address_derivation_verified=true");
console.log("nimo_void_node_id=12babb04b0f88de7b74e17d04b343007");
console.log("nimo_besu_validator_address=0x02f967953386188397b992c208239d3a25180db6");
console.log("nimo_public_key_address_derivation_verified=true");
console.log("xiphos_void_node_id=057593d7f3039b710bd904a081f83d17");
console.log("xiphos_besu_validator_address=0x461bf06270d9d28962f7570182c061b828799b66");
console.log("xiphos_public_key_address_derivation_verified=true");
console.log("qbft_attested_live_node_count=3");
console.log("qbft_attested_identity_slots_remaining=0");
console.log("placeholder_validator_addresses_forbidden=true");
console.log("economic_roster_is_not_besu_address_source=true");
console.log("qbft_production_extra_data_built=true");
console.log("production_validator_set_bound=" + String(successorPromoted));
console.log("offline_successor_equivalence_proven=" + String(successorPromoted));
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
