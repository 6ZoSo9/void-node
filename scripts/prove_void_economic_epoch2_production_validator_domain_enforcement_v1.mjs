#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { SigningKey, computeAddress } from "ethers";

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
const rawDomain = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-epoch2-raw-transaction-domain-v1.json",
    "utf8",
  ),
);
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
assert.equal(current.reason, "production_validator_identity_set_incomplete");
assert.equal(current.attested_live_node_count, 3);
assert.equal(current.required_live_node_count, 4);
assert.equal(current.attested_identity_slots_remaining, 1);
assert.equal(current.evidence_contract_source_ready, true);
assert.equal(
  current.all_production_validators_epoch_domain_enforced,
  false,
);
assert.equal(current.cross_epoch_replay_protection_proven, false);
assert.equal(current.migration_authorized, false);
assert.equal(current.public_activation_authorized, false);

const synthetic = structuredClone(binding);
const syntheticSigningKey = new SigningKey(
  "0x1111111111111111111111111111111111111111111111111111111111111111",
);
const syntheticPublicKey = syntheticSigningKey.publicKey.toLowerCase();
const syntheticAddress = computeAddress(syntheticPublicKey).toLowerCase();
synthetic.qbft.production_binding_entries.push({
  machine_role: "alienware-proof",
  void_node_id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  besu_validator_address: syntheticAddress,
  besu_public_key: syntheticPublicKey,
  public_key_address_derivation_verified: true,
  address_derivation_method:
    "ethers.SigningKey.publicKey + ethers.computeAddress",
  node_identity_attestation:
    "ops/mainnet0/economic-epoch2-qbft-node-identity-alienware-proof-v1.json",
  node_identity_attestation_sha256:
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
});
synthetic.qbft.attested_live_node_count = 4;
synthetic.qbft.attested_identity_slots_remaining = 0;

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

const evidenceRows =
  synthetic.qbft.production_binding_entries.map(evidenceFor);
const evidenceIds = evidenceRows.map((row) => row.evidence_id);

const candidate =
  verifyVoidEconomicEpoch2ProductionValidatorDomainEnforcementV1({
    binding_candidate: synthetic,
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
assert.equal(candidate.chain_id, 2050);
assert.equal(candidate.execution_epoch, 2);
assert.equal(candidate.required_live_node_count, 4);
assert.equal(candidate.validator_evidence_candidate_count, 4);
assert.equal(candidate.validator_evidence_candidates.length, 4);
assert.equal(
  candidate.plugin_jar_sha256,
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_EXPECTED_V1
    .plugin_jar_sha256,
);
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
  const missing = evidenceRows.slice(0, 3);
  const held =
    verifyVoidEconomicEpoch2ProductionValidatorDomainEnforcementV1({
      binding_candidate: synthetic,
      raw_domain_policy: rawDomain,
      plugin_artifact_manifest: artifact,
      expected_evidence_ids: evidenceIds.slice(0, 3),
      evaluation_time_utc: "2030-01-01T00:05:00Z",
      validator_evidence_rows: missing,
    });
  assert.equal(held.ok, false);
  assert.equal(
    held.reason,
    "production_validator_enforcement_evidence_set_incomplete",
  );
  assert.equal(
    held.all_production_validators_epoch_domain_enforced,
    false,
  );
}

{
  const bad = structuredClone(evidenceRows);
  bad[0].plugin_jar_sha256 = "b".repeat(64);
  bad[0].evidence_id =
    voidEconomicEpoch2ProductionValidatorDomainEvidenceIdV1(bad[0]);
  const ids = bad.map((row) => row.evidence_id);
  assert.throws(
    () =>
      verifyVoidEconomicEpoch2ProductionValidatorDomainEnforcementV1({
        binding_candidate: synthetic,
        raw_domain_policy: rawDomain,
        plugin_artifact_manifest: artifact,
        expected_evidence_ids: ids,
        evaluation_time_utc: "2030-01-01T00:05:00Z",
        validator_evidence_rows: bad,
      }),
    /validator_enforcement_evidence_binding_mismatch/,
  );
}

{
  const bad = structuredClone(evidenceRows);
  bad[0].valid_until_utc = "2030-01-01T00:01:00Z";
  bad[0].evidence_id =
    voidEconomicEpoch2ProductionValidatorDomainEvidenceIdV1(bad[0]);
  const ids = bad.map((row) => row.evidence_id);
  assert.throws(
    () =>
      verifyVoidEconomicEpoch2ProductionValidatorDomainEnforcementV1({
        binding_candidate: synthetic,
        raw_domain_policy: rawDomain,
        plugin_artifact_manifest: artifact,
        expected_evidence_ids: ids,
        evaluation_time_utc: "2030-01-01T00:05:00Z",
        validator_evidence_rows: bad,
      }),
    /validator_enforcement_evidence_not_current/,
  );
}

{
  const ids = structuredClone(evidenceIds);
  ids[3] = ids[0];
  assert.throws(
    () =>
      verifyVoidEconomicEpoch2ProductionValidatorDomainEnforcementV1({
        binding_candidate: synthetic,
        raw_domain_policy: rawDomain,
        plugin_artifact_manifest: artifact,
        expected_evidence_ids: ids,
        evaluation_time_utc: "2030-01-01T00:05:00Z",
        validator_evidence_rows: evidenceRows,
      }),
    /production_validator_expected_evidence_id_duplicate/,
  );
}

{
  const badBinding = structuredClone(synthetic);
  badBinding.qbft.production_binding_entries[3].besu_validator_address =
    badBinding.qbft.production_binding_entries[0].besu_validator_address;
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
    /validator_binding_public_key_address_mismatch|validator_binding_address_duplicate/,
  );
}

for (const [key, value] of Object.entries(
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_AUTHORITY_V1,
)) {
  if (key === "source_verification_only") {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const source = fs.readFileSync(
  "tools/void-economic-epoch2-production-validator-domain-enforcement-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "JsonRpcProvider(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  "writeFileSync",
  "appendFileSync",
  "renameSync",
  "systemctl",
  "child_process",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_V1_PROOF_GREEN",
);
console.log("canonical_attested_live_node_count=3");
console.log("canonical_required_live_node_count=4");
console.log("canonical_identity_gap_holds=true");
console.log("alienware_role_supported_by_existing_identity_prep=true");
console.log("synthetic_four_identity_evidence_contract_valid=true");
console.log("peer_import_protocol_rejection_source_proven=true");
console.log("upstream_runtime_evidence_semantically_verified=false");
console.log("all_production_validators_epoch_domain_enforced=false");
console.log("cross_epoch_replay_protection_proven=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
console.log("funds_movement=false");
