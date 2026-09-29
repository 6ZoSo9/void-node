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
  importVoidEconomicEpoch2ProductionValidatorRuntimeEvidenceV1,
} from "../tools/void-economic-epoch2-production-validator-runtime-evidence-import-v1.mjs";
import {
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_ENFORCEMENT_PROMOTION_V1,
  promoteVoidEconomicEpoch2ProductionValidatorRuntimeEnforcementV1,
} from "../tools/void-economic-epoch2-production-validator-runtime-enforcement-promotion-v1.mjs";
import {
  classifyVoidEconomicEvmSuccessorMigrationV1,
} from "../tools/void-economic-evm-successor-migration-v1.mjs";

const binding=JSON.parse(fs.readFileSync(
  "ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json","utf8"));
const rawDomain=JSON.parse(fs.readFileSync(
  "ops/mainnet0/economic-epoch2-raw-transaction-domain-v1.json","utf8"));
const artifact=JSON.parse(fs.readFileSync(
  "ops/mainnet0/economic-epoch2-besu-raw-transaction-validator-plugin-artifact-v1.json","utf8"));
const migration=JSON.parse(fs.readFileSync(
  "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json","utf8"));

// The canonical repository may already contain the real three-validator
// promotion. This synthetic unit proof deliberately exercises the transition
// from the exact pre-promotion state, so reconstruct only the fields changed
// by the promotion before generating synthetic rows.
if(rawDomain?.gates?.all_production_validators_epoch_domain_enforced===true){
  rawDomain.status="BESU_RUNTIME_VALIDATOR_GREEN_PRODUCTION_ENFORCEMENT_HOLD";
  rawDomain.besu_validation_boundary.all_production_validators_enforce_rule=false;
  rawDomain.gates.all_production_validators_epoch_domain_enforced=false;
  rawDomain.gates.cross_epoch_replay_protection_proven=false;
}
if(
  migration?.replay_and_epoch_safety
    ?.all_production_validators_epoch_domain_enforced===true
){
  migration.replay_and_epoch_safety
    .all_production_validators_epoch_domain_enforced=false;
  migration.replay_and_epoch_safety.cross_epoch_replay_protection_proven=false;
  delete migration.replay_and_epoch_safety
    .production_validator_runtime_enforcement_evidence;
  delete migration.replay_and_epoch_safety
    .production_gateway_replay_store_binding_verified;
  delete migration.replay_and_epoch_safety
    .production_gateway_replay_binding_runtime_evidence;
  delete migration.replay_and_epoch_safety
    .production_gateway_replay_binding_runtime_import;
  delete migration.replay_and_epoch_safety
    .cross_epoch_replay_protection_promotion;
}
const runtimeResult=JSON.parse(fs.readFileSync(
  "ops/mainnet0/economic-epoch2-besu-raw-transaction-validator-runtime-evidence-v1.json","utf8"));

const roles=["precision","nimo","xiphos"];
const pluginSha=
  "6637c57b64666e7761a8e254e7968a60f4a80bef05e070be8e8b934d887d5518";
const evidenceBytesByRole=Object.create(null);
const importReceiptsByRole=Object.create(null);

function factsFor(role, identity, entry, runtimeSha, logSha){
  return {
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
}

for(let index=0;index<roles.length;index+=1){
  const role=roles[index];
  const identity=JSON.parse(fs.readFileSync(
    `ops/mainnet0/economic-epoch2-qbft-node-identity-${role}-v1.json`,"utf8"));
  const entry=binding.qbft.production_binding_entries.find((x)=>x.machine_role===role);
  assert(entry);

  const runtimeSha=String(index+1).repeat(64);
  const logSha=String(index+4).repeat(64);
  const observedAt=`2030-01-01T00:0${index}:00Z`;

  const evidence=
    buildVoidEconomicEpoch2ProductionValidatorRuntimeEvidenceCandidateV1({
      machineRole:role,
      runtimeResult,
      runtimeResultSha256:runtimeSha,
      facts:factsFor(role,identity,entry,runtimeSha,logSha),
      factsSha256:String(index+7).repeat(64),
      pluginJarSha256:pluginSha,
      besuLogSha256:logSha,
      observedAtUtc:observedAt,
      validUntilUtc:"2030-01-01T00:10:00Z",
      hostName:identity.hostname,
    });

  const bytes=Buffer.from(JSON.stringify(evidence,null,2)+"\n","utf8");
  const fileSha=crypto.createHash("sha256").update(bytes).digest("hex");
  const importTime=`2030-01-01T00:0${index+4}:00Z`;

  const receipt=
    importVoidEconomicEpoch2ProductionValidatorRuntimeEvidenceV1({
      machineRole:role,
      evidenceBytes:bytes,
      expectedFileSha256:fileSha,
      expectedEvidenceId:evidence.evidence_id,
      evaluationTimeUtc:importTime,
      bindingCandidate:binding,
      rawDomainPolicy:rawDomain,
      pluginArtifactManifest:artifact,
    });

  evidenceBytesByRole[role]=bytes;
  importReceiptsByRole[role]=receipt;
}

const result=
  promoteVoidEconomicEpoch2ProductionValidatorRuntimeEnforcementV1({
    bindingCandidate:binding,
    rawDomainPolicy:rawDomain,
    pluginArtifactManifest:artifact,
    migrationCandidate:migration,
    evidenceBytesByRole,
    importReceiptsByRole,
  });

assert.equal(
  result.promotion.marker,
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_ENFORCEMENT_PROMOTION_V1,
);
assert.equal(
  result.promotion.status,
  "PRODUCTION_VALIDATOR_RUNTIME_ENFORCEMENT_PROMOTED_CROSS_EPOCH_HOLD",
);
assert.equal(result.promotion.validator_count,3);
assert.deepEqual(result.promotion.validators.map((x)=>x.machine_role),roles);
assert.equal(
  result.promotion.verification.all_three_import_receipts_verified,
  true,
);
assert.equal(
  result.promotion.verification.all_three_evidence_file_hashes_verified,
  true,
);
assert.equal(
  result.promotion.verification.all_three_runtime_rows_semantically_verified,
  true,
);
assert.equal(
  result.promotion.gates.upstream_runtime_evidence_semantically_verified,
  true,
);
assert.equal(
  result.promotion.gates.all_production_validators_epoch_domain_enforced,
  true,
);
assert.equal(result.promotion.gates.cross_epoch_replay_protection_proven,false);
assert.equal(result.promotion.gates.production_validator_set_bound,false);
assert.equal(result.promotion.gates.migration_authorized,false);
assert.equal(result.promotion.gates.public_activation_authorized,false);
assert.equal(result.promotion.gates.funds_movement_authorized,false);

assert.equal(
  result.updated_raw_domain_policy.besu_validation_boundary
    .all_production_validators_enforce_rule,
  true,
);
assert.equal(
  result.updated_raw_domain_policy.gates
    .all_production_validators_epoch_domain_enforced,
  true,
);
assert.equal(
  result.updated_raw_domain_policy.gates.cross_epoch_replay_protection_proven,
  false,
);
assert.equal(
  result.updated_migration_candidate.replay_and_epoch_safety
    .all_production_validators_epoch_domain_enforced,
  true,
);
assert.equal(
  result.updated_migration_candidate.replay_and_epoch_safety
    .cross_epoch_replay_protection_proven,
  false,
);

const classified=
  classifyVoidEconomicEvmSuccessorMigrationV1(
    result.updated_migration_candidate,
  );
assert.equal(classified.ok,false);
assert.equal(classified.status,"HOLD");
assert.equal(
  classified.missing_gates.includes(
    "production_validator_epoch_domain_enforcement_required",
  ),
  false,
);
assert.equal(
  classified.missing_gates.includes("cross_epoch_replay_protection_required"),
  true,
);

{
  const badBytes={...evidenceBytesByRole};
  badBytes.nimo=Buffer.from(evidenceBytesByRole.nimo);
  badBytes.nimo[badBytes.nimo.length-2]^=1;
  assert.throws(
    ()=>promoteVoidEconomicEpoch2ProductionValidatorRuntimeEnforcementV1({
      bindingCandidate:binding,
      rawDomainPolicy:rawDomain,
      pluginArtifactManifest:artifact,
      migrationCandidate:migration,
      evidenceBytesByRole:badBytes,
      importReceiptsByRole,
    }),
    /runtime_evidence_file_sha256_mismatch:nimo/,
  );
}
{
  const badReceipts={...importReceiptsByRole};
  badReceipts.precision=structuredClone(importReceiptsByRole.precision);
  badReceipts.precision.gates.cross_epoch_replay_protection_proven=true;
  assert.throws(
    ()=>promoteVoidEconomicEpoch2ProductionValidatorRuntimeEnforcementV1({
      bindingCandidate:binding,
      rawDomainPolicy:rawDomain,
      pluginArtifactManifest:artifact,
      migrationCandidate:migration,
      evidenceBytesByRole,
      importReceiptsByRole:badReceipts,
    }),
    /runtime_evidence_import_receipt_invalid:precision/,
  );
}

console.log(
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_ENFORCEMENT_PROMOTION_V1_PROOF_GREEN",
);
console.log("validator_count=3");
console.log("all_three_import_receipts_verified=true");
console.log("all_three_evidence_file_hashes_verified=true");
console.log("all_three_runtime_rows_semantically_verified=true");
console.log("all_production_validators_epoch_domain_enforced=true");
console.log("production_validator_epoch_domain_enforcement_gate_remaining=false");
console.log("cross_epoch_replay_protection_proven=false");
console.log("cross_epoch_replay_protection_gate_remaining=true");
console.log("production_validator_set_bound=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
