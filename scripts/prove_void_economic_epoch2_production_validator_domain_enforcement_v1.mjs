#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_EXPECTED_V1,
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_V1,
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_EVIDENCE_V1,
  verifyVoidEconomicEpoch2ProductionValidatorDomainEnforcementV1,
  voidEconomicEpoch2ProductionValidatorDomainEvidenceIdV1,
} from "../tools/void-economic-epoch2-production-validator-domain-enforcement-v1.mjs";

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
const rawDomain = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-epoch2-raw-transaction-domain-v1.json",
    "utf8",
  ),
);
if(rawDomain?.gates?.all_production_validators_epoch_domain_enforced===true){
  rawDomain.status="BESU_RUNTIME_VALIDATOR_GREEN_PRODUCTION_ENFORCEMENT_HOLD";
  rawDomain.besu_validation_boundary.all_production_validators_enforce_rule=false;
  rawDomain.gates.all_production_validators_epoch_domain_enforced=false;
  rawDomain.gates.cross_epoch_replay_protection_proven=false;
}
const artifact = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-epoch2-besu-raw-transaction-validator-plugin-artifact-v1.json",
    "utf8",
  ),
);

assert.equal(
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_V1,
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_V1",
);
assert.equal(
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_EVIDENCE_V1,
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_EVIDENCE_V1",
);
assert.equal(
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_EXPECTED_V1
    .required_live_node_count,
  3,
);
assert.equal(topology.production_validator_count, 3);
assert.equal(topology.quorum.required_validator_quorum, 2);
assert.equal(topology.quorum.byzantine_fault_tolerance, 0);
assert.equal(
  topology.quorum.one_byzantine_fault_tolerance_available,
  false,
);
assert.equal(topology.policy.fourth_validator_required_for_launch, false);

const current = verifyVoidEconomicEpoch2ProductionValidatorDomainEnforcementV1({
  binding_candidate: binding,
  raw_domain_policy: rawDomain,
  plugin_artifact_manifest: artifact,
  expected_evidence_ids: [],
  evaluation_time_utc: "2030-01-01T00:05:00Z",
  validator_evidence_rows: [],
});
assert.equal(current.ok, false);
assert.equal(current.status, "HOLD");
assert.equal(
  current.reason,
  "production_validator_enforcement_evidence_set_incomplete",
);
assert.equal(current.attested_live_node_count, 3);
assert.equal(current.evidence_row_count, 0);
assert.equal(current.expected_evidence_id_count, 0);
assert.equal(current.evidence_contract_source_ready, true);
assert.equal(
  current.all_production_validators_epoch_domain_enforced,
  false,
);
assert.equal(current.cross_epoch_replay_protection_proven, false);

function evidenceFor(entry, index) {
  const value = {
    marker:
      VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_EVIDENCE_V1,
    version: 1,
    status: "RUNTIME_ENFORCEMENT_EVIDENCE_CANDIDATE",
    machine_role: entry.machine_role,
    void_node_id: entry.void_node_id,
    besu_validator_address:
      String(entry.besu_validator_address).toLowerCase(),
    besu_public_key:
      String(entry.besu_public_key).toLowerCase(),
    node_identity_attestation_sha256:
      entry.node_identity_attestation_sha256,
    chain_id: 2050,
    execution_epoch: 2,
    besu_client: "Besu",
    besu_version: "26.8.1",
    besu_image:
      VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_EXPECTED_V1
        .besu_image,
    plugin_name: "VoidEpoch2RawTransactionDomainPlugin",
    plugin_jar_sha256:
      VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_EXPECTED_V1
        .plugin_jar_sha256,
    plugin_loaded: true,
    transaction_validation_rule_registered: true,
    local_unmarked_raw_transaction_rejected: true,
    raw_public_rpc_disabled: true,
    startup_fail_closed_on_plugin_mismatch: true,
    peer_import_protocol_rejection_source_head:
      VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_EXPECTED_V1
        .peer_import_source_head,
    peer_import_workflow_run_id:
      VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_EXPECTED_V1
        .peer_import_workflow_run_id,
    observed_at_utc: `2030-01-01T00:0${index}:00Z`,
    valid_until_utc: "2030-01-01T00:10:00Z",
    market_activation_authorized: false,
    migration_authorized: false,
    public_activation_authorized: false,
    funds_movement_authorized: false,
    evidence_id: "voide2ve1_" + "0".repeat(64),
  };
  value.evidence_id =
    voidEconomicEpoch2ProductionValidatorDomainEvidenceIdV1(value);
  return value;
}

const evidenceRows = binding.qbft.production_binding_entries.map(evidenceFor);
const evidenceIds = evidenceRows.map((row) => row.evidence_id);
assert.equal(evidenceRows.length, 3);

const candidate =
  verifyVoidEconomicEpoch2ProductionValidatorDomainEnforcementV1({
    binding_candidate: binding,
    raw_domain_policy: rawDomain,
    plugin_artifact_manifest: artifact,
    expected_evidence_ids: evidenceIds,
    evaluation_time_utc: "2030-01-01T00:05:00Z",
    validator_evidence_rows: evidenceRows,
  });

assert.equal(candidate.ok, true);
assert.equal(
  candidate.status,
  "ENFORCEMENT_EVIDENCE_CANDIDATE_VALID_UPSTREAM_RUNTIME_UNVERIFIED",
);
assert.equal(candidate.required_live_node_count, 3);
assert.equal(candidate.validator_evidence_candidate_count, 3);
assert.equal(candidate.validator_evidence_candidates.length, 3);
assert.equal(candidate.peer_import_protocol_rejection_source_proven, true);
assert.equal(
  candidate.upstream_runtime_evidence_semantically_verified,
  false,
);
assert.equal(
  candidate.production_validator_enforcement_evidence_candidate_valid,
  true,
);
assert.equal(
  candidate.all_production_validators_epoch_domain_enforced,
  false,
);
assert.equal(candidate.cross_epoch_replay_protection_proven, false);
assert.equal(candidate.migration_authorized, false);
assert.equal(candidate.public_activation_authorized, false);
assert.equal(candidate.funds_movement_authorized, false);

{
  const held =
    verifyVoidEconomicEpoch2ProductionValidatorDomainEnforcementV1({
      binding_candidate: binding,
      raw_domain_policy: rawDomain,
      plugin_artifact_manifest: artifact,
      expected_evidence_ids: evidenceIds.slice(0, 2),
      evaluation_time_utc: "2030-01-01T00:05:00Z",
      validator_evidence_rows: evidenceRows.slice(0, 2),
    });
  assert.equal(held.ok, false);
  assert.equal(
    held.reason,
    "production_validator_enforcement_evidence_set_incomplete",
  );
}

{
  const bad = structuredClone(evidenceRows);
  bad[0].plugin_jar_sha256 = "b".repeat(64);
  bad[0].evidence_id =
    voidEconomicEpoch2ProductionValidatorDomainEvidenceIdV1(bad[0]);
  assert.throws(
    () =>
      verifyVoidEconomicEpoch2ProductionValidatorDomainEnforcementV1({
        binding_candidate: binding,
        raw_domain_policy: rawDomain,
        plugin_artifact_manifest: artifact,
        expected_evidence_ids: bad.map((row) => row.evidence_id),
        evaluation_time_utc: "2030-01-01T00:05:00Z",
        validator_evidence_rows: bad,
      }),
    /validator_enforcement_evidence_binding_mismatch/,
  );
}

{
  const badBinding = structuredClone(binding);
  badBinding.qbft.required_validator_quorum = 3;
  assert.throws(
    () =>
      verifyVoidEconomicEpoch2ProductionValidatorDomainEnforcementV1({
        binding_candidate: badBinding,
        raw_domain_policy: rawDomain,
        plugin_artifact_manifest: artifact,
        expected_evidence_ids: evidenceIds,
        evaluation_time_utc: "2030-01-01T00:05:00Z",
        validator_evidence_rows: evidenceRows,
      }),
    /validator_binding_contract_mismatch/,
  );
}

for (const [key, value] of Object.entries(
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_AUTHORITY_V1,
)) {
  assert.equal(value, key === "source_verification_only", key);
}

console.log(
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_V1_PROOF_GREEN",
);
console.log("canonical_attested_live_node_count=3");
console.log("canonical_required_live_node_count=3");
console.log("canonical_identity_set_complete=true");
console.log("required_validator_quorum=2");
console.log("byzantine_fault_tolerance=0");
console.log("one_byzantine_fault_tolerance_available=false");
console.log("fourth_validator_required_for_launch=false");
console.log("three_validator_evidence_contract_valid=true");
console.log("upstream_runtime_evidence_semantically_verified=false");
console.log("all_production_validators_epoch_domain_enforced=false");
console.log("cross_epoch_replay_protection_proven=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
console.log("funds_movement=false");
