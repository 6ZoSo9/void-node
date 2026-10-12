#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  buildVoidEconomicEpoch2ProductionValidatorRuntimeEvidenceCandidateV1,
} from "../tools/void-economic-epoch2-production-validator-runtime-evidence-candidate-v1.mjs";
import {
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_EVIDENCE_IMPORT_V1,
  importVoidEconomicEpoch2ProductionValidatorRuntimeEvidenceV1,
} from "../tools/void-economic-epoch2-production-validator-runtime-evidence-import-v1.mjs";

const binding=JSON.parse(fs.readFileSync(
  "ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json","utf8"));
const rawDomain=JSON.parse(fs.readFileSync(
  "ops/mainnet0/economic-epoch2-raw-transaction-domain-v1.json","utf8"));
if(rawDomain?.gates?.all_production_validators_epoch_domain_enforced===true){
  rawDomain.status="BESU_RUNTIME_VALIDATOR_GREEN_PRODUCTION_ENFORCEMENT_HOLD";
  rawDomain.besu_validation_boundary.all_production_validators_enforce_rule=false;
  rawDomain.gates.all_production_validators_epoch_domain_enforced=false;
  rawDomain.gates.cross_epoch_replay_protection_proven=false;
}
const artifact=JSON.parse(fs.readFileSync(
  "ops/mainnet0/economic-epoch2-besu-raw-transaction-validator-plugin-artifact-v1.json","utf8"));
const runtimeResult=JSON.parse(fs.readFileSync(
  "ops/mainnet0/economic-epoch2-besu-raw-transaction-validator-runtime-evidence-v1.json","utf8"));

const role="nimo";
const identity=JSON.parse(fs.readFileSync(
  "ops/mainnet0/economic-epoch2-qbft-node-identity-nimo-v1.json","utf8"));
const entry=binding.qbft.production_binding_entries.find((x)=>x.machine_role===role);
assert(entry);

const runtimeSha="a".repeat(64);
const logSha="b".repeat(64);
const pluginSha=
  "6637c57b64666e7761a8e254e7968a60f4a80bef05e070be8e8b934d887d5518";

const facts={
  marker:"VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_LOCAL_RUNTIME_FACTS_V1",
  version:1,
  machine_role:role,
  hostname:identity.hostname,
  void_node_id:entry.void_node_id,
  besu_validator_address:entry.besu_validator_address,
  besu_public_key:entry.besu_public_key,
  node_private_key_path:path.join(
    os.homedir(),".local","share","void",
    "epoch2-qbft-validator-identity-v1",role,"nodekey"),
  node_private_key_mode:"600",
  node_private_key_matches_canonical_identity:true,
  node_private_key_content_exported:false,
  node_private_key_stdout:false,
  void_health_loopback_verified:true,
  besu_image:"hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042",
  plugin_name:"VoidEpoch2RawTransactionDomainPlugin",
  plugin_jar_sha256:pluginSha,
  plugin_loaded:true,
  transaction_validation_rule_registered:true,
  local_unmarked_raw_transaction_rejected:true,
  raw_public_rpc_disabled:true,
  rpc_host_binding:"127.0.0.1",
  external_p2p_exposure:false,
  startup_fail_closed_on_plugin_mismatch:true,
  production_rpc_contact:false,
  authoritative_chain2050_write:false,
  validator_mutation:false,
  funds_movement:false,
  runtime_result_sha256:runtimeSha,
  besu_log_sha256:logSha,
};

const evidence=
  buildVoidEconomicEpoch2ProductionValidatorRuntimeEvidenceCandidateV1({
    machineRole:role,
    runtimeResult,
    runtimeResultSha256:runtimeSha,
    facts,
    factsSha256:"c".repeat(64),
    pluginJarSha256:pluginSha,
    besuLogSha256:logSha,
    observedAtUtc:"2030-01-01T00:00:00Z",
    validUntilUtc:"2030-01-01T00:10:00Z",
    hostName:identity.hostname,
  });

const evidenceBytes=Buffer.from(JSON.stringify(evidence,null,2)+"\n","utf8");
const evidenceFileSha256=crypto.createHash("sha256").update(evidenceBytes).digest("hex");

const receipt=
  importVoidEconomicEpoch2ProductionValidatorRuntimeEvidenceV1({
    machineRole:role,
    evidenceBytes,
    expectedFileSha256:evidenceFileSha256,
    expectedEvidenceId:evidence.evidence_id,
    evaluationTimeUtc:"2030-01-01T00:05:00Z",
    bindingCandidate:binding,
    rawDomainPolicy:rawDomain,
    pluginArtifactManifest:artifact,
  });

assert.equal(
  receipt.marker,
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_EVIDENCE_IMPORT_V1,
);
assert.equal(
  receipt.status,
  "SINGLE_VALIDATOR_RUNTIME_EVIDENCE_IMPORTED_OVERALL_ENFORCEMENT_HOLD",
);
assert.equal(receipt.machine_role,"nimo");
assert.equal(receipt.evidence_file_sha256,evidenceFileSha256);
assert.equal(receipt.evidence_id,evidence.evidence_id);
assert.equal(receipt.verification.runtime_evidence_semantically_verified,true);
assert.equal(receipt.verification.evidence_fresh_at_import,true);
assert.equal(receipt.gates.this_validator_runtime_evidence_imported,true);
assert.equal(receipt.gates.this_validator_runtime_evidence_semantically_verified,true);
assert.equal(receipt.gates.all_production_validators_epoch_domain_enforced,false);
assert.equal(receipt.gates.cross_epoch_replay_protection_proven,false);
assert.equal(receipt.gates.migration_authorized,false);
assert.equal(receipt.gates.public_activation_authorized,false);
assert.equal(receipt.gates.funds_movement_authorized,false);

{
  assert.throws(
    ()=>importVoidEconomicEpoch2ProductionValidatorRuntimeEvidenceV1({
      machineRole:role,
      evidenceBytes,
      expectedFileSha256:"0".repeat(64),
      expectedEvidenceId:evidence.evidence_id,
      evaluationTimeUtc:"2030-01-01T00:05:00Z",
      bindingCandidate:binding,
      rawDomainPolicy:rawDomain,
      pluginArtifactManifest:artifact,
    }),
    /evidence_file_sha256_mismatch/,
  );
}
{
  assert.throws(
    ()=>importVoidEconomicEpoch2ProductionValidatorRuntimeEvidenceV1({
      machineRole:"precision",
      evidenceBytes,
      expectedFileSha256:evidenceFileSha256,
      expectedEvidenceId:evidence.evidence_id,
      evaluationTimeUtc:"2030-01-01T00:05:00Z",
      bindingCandidate:binding,
      rawDomainPolicy:rawDomain,
      pluginArtifactManifest:artifact,
    }),
    /evidence_machine_role_mismatch/,
  );
}
{
  assert.throws(
    ()=>importVoidEconomicEpoch2ProductionValidatorRuntimeEvidenceV1({
      machineRole:role,
      evidenceBytes,
      expectedFileSha256:evidenceFileSha256,
      expectedEvidenceId:evidence.evidence_id,
      evaluationTimeUtc:"2030-01-01T00:20:00Z",
      bindingCandidate:binding,
      rawDomainPolicy:rawDomain,
      pluginArtifactManifest:artifact,
    }),
    /validator_enforcement_evidence_not_current/,
  );
}

console.log(
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_EVIDENCE_IMPORT_V1_PROOF_GREEN",
);
console.log("machine_role=nimo");
console.log("evidence_file_sha256_verified=true");
console.log("evidence_id_verified=true");
console.log("runtime_evidence_semantically_verified=true");
console.log("evidence_fresh_at_import=true");
console.log("all_production_validators_epoch_domain_enforced=false");
console.log("cross_epoch_replay_protection_proven=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
