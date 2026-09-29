#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { decodeRlp, encodeRlp, getAddress } from "ethers";

const evidencePath =
  "ops/mainnet0/economic-epoch2-qbft-production-extra-data-v1.json";
const bindingPath =
  "ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json";
const promotionPath =
  "ops/mainnet0/economic-epoch2-qbft-production-extra-data-promotion-v1.json";
const topologyPath =
  "ops/mainnet0/economic-epoch2-qbft-topology-v1.json";

const EXPECTED = Object.freeze({
  workflow_run_id: "36572243857",
  source_head: "0ddc47de7d332d56f6cb022133dc6eb9cb49e8c6",
  artifact_id: "11034841633",
  artifact_name:
    "void-economic-epoch2-qbft-production-extra-data-bind-v1-0ddc47de7d332d56f6cb022133dc6eb9cb49e8c6",
  artifact_zip_sha256:
    "bd095f554f96a860b1a7af8a7ff6a8f6942c0a14889b86c7fd87ceb7a3308baf",
  evidence_file_sha256:
    "347c35fadceb550afc952d213a9d34744247615620d9fdc23eb62c65ddf8d689",
  binding_file_sha256:
    "d0b359d8c20330905ed879db8671e179e41d0fb4d4fb46a6c7b5d4b95e8066eb",
  extra_data_sha256:
    "89a70f0930a5899921c2eb7f65c1f6e5d1ea59d2044cd5b5bd08d635f9fb099a",
  extra_data_bytes: 103,
});

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function readRawJson(path) {
  const raw = fs.readFileSync(path);
  return Object.freeze({
    raw,
    json: JSON.parse(raw.toString("utf8")),
    sha256: sha256(raw),
  });
}

const evidenceFile = readRawJson(evidencePath);
const bindingFile = readRawJson(bindingPath);
const promotionFile = readRawJson(promotionPath);
const topologyFile = readRawJson(topologyPath);

assert.equal(evidenceFile.sha256, EXPECTED.evidence_file_sha256);
assert.equal(bindingFile.sha256, EXPECTED.binding_file_sha256);

const promotion = promotionFile.json;
assert.equal(
  promotion.marker,
  "VOID_ECONOMIC_EPOCH2_QBFT_PRODUCTION_EXTRA_DATA_PROMOTION_V1",
);
assert.equal(promotion.version, 1);
assert.equal(
  promotion.status,
  "CANONICAL_PRODUCTION_EXTRA_DATA_PROMOTED_VALIDATOR_RUNTIME_HOLD",
);
assert.equal(
  promotion.promotion_base_main,
  "b66501f212d8f176e90125e17112a10fd2156c44",
);
assert.equal(
  promotion.hosted_source.workflow_run_id,
  EXPECTED.workflow_run_id,
);
assert.equal(
  promotion.hosted_source.source_head,
  EXPECTED.source_head,
);
assert.equal(
  promotion.hosted_source.artifact_id,
  EXPECTED.artifact_id,
);
assert.equal(
  promotion.hosted_source.artifact_name,
  EXPECTED.artifact_name,
);
assert.equal(
  promotion.hosted_source.artifact_zip_sha256,
  EXPECTED.artifact_zip_sha256,
);
assert.equal(
  promotion.hosted_source.evidence_file_sha256,
  evidenceFile.sha256,
);
assert.equal(
  promotion.hosted_source.binding_file_sha256,
  bindingFile.sha256,
);
assert.equal(promotion.qbft.validator_count, 3);
assert.equal(promotion.qbft.required_validator_quorum, 2);
assert.equal(promotion.qbft.byzantine_fault_tolerance, 0);
assert.equal(
  promotion.qbft.one_byzantine_fault_tolerance_available,
  false,
);
assert.equal(
  promotion.qbft.fourth_validator_required_for_launch,
  false,
);
assert.equal(
  promotion.qbft.extra_data_sha256,
  EXPECTED.extra_data_sha256,
);
assert.equal(
  promotion.qbft.extra_data_bytes,
  EXPECTED.extra_data_bytes,
);

const topology = topologyFile.json;
assert.equal(
  topology.marker,
  "VOID_ECONOMIC_EPOCH2_QBFT_TOPOLOGY_V1",
);
assert.equal(
  topology.status,
  "THREE_VALIDATOR_PRODUCTION_TOPOLOGY_SELECTED",
);
assert.equal(topology.chain_id, 2050);
assert.equal(topology.execution_epoch, 2);
assert.equal(topology.client, "Besu");
assert.equal(topology.client_version, "26.8.1");
assert.equal(topology.consensus, "QBFT");
assert.equal(topology.production_validator_count, 3);
assert.deepEqual(
  topology.production_machine_roles,
  ["precision", "nimo", "xiphos"],
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
assert.equal(
  topology.policy.fourth_validator_required_for_launch,
  false,
);
assert.equal(
  topology.policy.unassigned_fourth_slot_is_not_a_blocker,
  true,
);
assert.equal(
  topology.policy.three_validator_risk_must_remain_explicit,
  true,
);

const evidence = evidenceFile.json;
assert.equal(
  evidence.marker,
  "VOID_ECONOMIC_EPOCH2_QBFT_PRODUCTION_EXTRA_DATA_EVIDENCE_V1",
);
assert.equal(evidence.version, 1);
assert.equal(
  evidence.status,
  "PRODUCTION_QBFT_EXTRA_DATA_BUILT_GENESIS_BINDING_HOLD",
);
assert.equal(evidence.client.name, "Besu");
assert.equal(evidence.client.version, "26.8.1");
assert.equal(
  evidence.client.image,
  "hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042",
);
assert.equal(
  evidence.client.release_commit,
  "d97cbd61976a52bb109e637196fef9a8ebf2b617",
);
assert.equal(evidence.chain_id, 2050);
assert.equal(evidence.validator_management_method, "blockheader");
assert.equal(evidence.validator_count, 3);
assert.equal(evidence.validators.length, 3);
assert.equal(evidence.validator_records.length, 3);
assert.equal(new Set(evidence.validators).size, 3);

const expectedRoles = ["precision", "nimo", "xiphos"];
for (let index = 0; index < 3; index += 1) {
  assert.equal(
    evidence.validator_records[index].machine_role,
    expectedRoles[index],
  );
  assert.equal(
    getAddress(evidence.validator_records[index].besu_validator_address)
      .toLowerCase(),
    getAddress(evidence.validators[index]).toLowerCase(),
  );
}

const normalizedExtraData = String(evidence.extra_data_hex).toLowerCase();
assert.match(normalizedExtraData, /^0x(?:[0-9a-f]{2})+$/);
const extraDataBytes = Buffer.from(normalizedExtraData.slice(2), "hex");
assert.equal(extraDataBytes.length, EXPECTED.extra_data_bytes);
assert.equal(sha256(extraDataBytes), EXPECTED.extra_data_sha256);
assert.equal(evidence.extra_data_bytes, EXPECTED.extra_data_bytes);
assert.equal(evidence.extra_data_sha256, EXPECTED.extra_data_sha256);

const decoded = decodeRlp(normalizedExtraData);
assert.equal(decoded.length, 5);
assert.equal(
  String(decoded[0]).toLowerCase(),
  "0x" + "00".repeat(32),
);
assert.equal(decoded[1].length, 3);
for (let index = 0; index < 3; index += 1) {
  assert.equal(
    getAddress(decoded[1][index]).toLowerCase(),
    getAddress(evidence.validators[index]).toLowerCase(),
  );
}
assert.deepEqual(decoded[2], []);
assert.equal(String(decoded[3]).toLowerCase(), "0x");
assert.deepEqual(decoded[4], []);

const independentlyEncoded = encodeRlp([
  "0x" + "00".repeat(32),
  evidence.validators,
  [],
  "0x",
  [],
]).toLowerCase();
assert.equal(independentlyEncoded, normalizedExtraData);
assert.equal(evidence.decoded.vanity_zero_bytes, 32);
assert.equal(evidence.decoded.validator_order_exact, true);
assert.equal(evidence.decoded.vote_empty, true);
assert.equal(evidence.decoded.round, 0);
assert.equal(evidence.decoded.commit_seals_empty, true);
assert.equal(evidence.decoded.independently_reencoded_exact, true);

const binding = bindingFile.json;
assert.equal(
  binding.marker,
  "VOID_ECONOMIC_EPOCH2_QBFT_VALIDATOR_BINDING_CANDIDATE_V1",
);
assert.equal(binding.status, "HOLD");
assert.equal(
  binding.qbft.topology_evidence,
  topologyPath,
);
assert.equal(binding.qbft.production_validator_count, 3);
assert.equal(binding.qbft.required_live_node_count, 3);
assert.equal(binding.qbft.attested_live_node_count, 3);
assert.equal(binding.qbft.attested_identity_slots_remaining, 0);
assert.equal(binding.qbft.required_validator_quorum, 2);
assert.equal(binding.qbft.byzantine_fault_tolerance, 0);
assert.equal(
  binding.qbft.one_byzantine_fault_tolerance_available,
  false,
);
assert.equal(
  binding.qbft.fourth_validator_required_for_launch,
  false,
);
assert.equal(binding.qbft.production_extra_data_built, true);
assert.equal(
  binding.qbft.production_extra_data_sha256,
  EXPECTED.extra_data_sha256,
);
assert.equal(
  binding.qbft.production_extra_data_evidence,
  evidencePath,
);
assert.equal(binding.qbft.production_binding_entries.length, 3);
for (let index = 0; index < 3; index += 1) {
  const row = binding.qbft.production_binding_entries[index];
  const evidenceRow = evidence.validator_records[index];
  assert.equal(row.machine_role, evidenceRow.machine_role);
  assert.equal(row.void_node_id, evidenceRow.void_node_id);
  assert.equal(
    row.besu_validator_address,
    evidenceRow.besu_validator_address,
  );
  assert.equal(row.besu_public_key, evidenceRow.besu_public_key);
  assert.equal(
    row.node_identity_attestation_sha256,
    evidenceRow.node_identity_attestation_sha256,
  );
}

assert.equal(binding.gates.qbft_live_identity_manifest_ready, true);
assert.equal(binding.gates.qbft_minimum_live_nodes_attested, true);
assert.equal(
  binding.gates.qbft_public_key_address_derivations_verified,
  true,
);
assert.equal(binding.gates.qbft_production_extra_data_built, true);
assert.equal(binding.gates.production_validator_set_bound, false);
assert.equal(binding.gates.offline_successor_equivalence_proven, false);
assert.equal(binding.gates.migration_authorized, false);
assert.equal(binding.gates.public_activation_authorized, false);

for (const [key, value] of Object.entries(evidence.authority)) {
  if (key === "source_and_offline_encoding_only") {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}
for (const [key, value] of Object.entries(binding.authority)) {
  if (key === "source_only") {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}
for (const [key, value] of Object.entries(promotion.authority)) {
  if (key === "source_promotion_only") {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

assert.equal(promotion.gates.qbft_production_extra_data_built, true);
assert.equal(promotion.gates.production_validator_set_bound, false);
assert.equal(
  promotion.gates.all_production_validators_epoch_domain_enforced,
  false,
);
assert.equal(
  promotion.gates.offline_successor_equivalence_proven,
  false,
);
assert.equal(
  promotion.gates.cross_epoch_replay_protection_proven,
  false,
);
assert.equal(
  promotion.gates.authoritative_chain2050_write,
  false,
);
assert.equal(promotion.gates.migration_authorized, false);
assert.equal(promotion.gates.public_activation_authorized, false);

console.log(
  "VOID_ECONOMIC_EPOCH2_QBFT_PRODUCTION_EXTRA_DATA_PROMOTION_V1_GREEN",
);
console.log("hosted_workflow_run_id=" + EXPECTED.workflow_run_id);
console.log("hosted_source_head=" + EXPECTED.source_head);
console.log("hosted_artifact_id=" + EXPECTED.artifact_id);
console.log(
  "hosted_artifact_zip_sha256=" + EXPECTED.artifact_zip_sha256,
);
console.log(
  "evidence_file_sha256=" + evidenceFile.sha256,
);
console.log(
  "binding_file_sha256=" + bindingFile.sha256,
);
console.log(
  "extra_data_sha256=" + EXPECTED.extra_data_sha256,
);
console.log("extra_data_bytes=103");
console.log("validator_count=3");
console.log("required_validator_quorum=2");
console.log("byzantine_fault_tolerance=0");
console.log("fourth_validator_required_for_launch=false");
console.log("independent_rlp_reencode_exact=true");
console.log("qbft_production_extra_data_built=true");
console.log("production_validator_set_bound=false");
console.log("all_production_validators_epoch_domain_enforced=false");
console.log("offline_successor_equivalence_proven=false");
console.log("cross_epoch_replay_protection_proven=false");
console.log("authoritative_chain2050_write=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
console.log("funds_movement=false");
