#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const evidencePath="ops/mainnet0/economic-epoch2-besu-raw-transaction-validator-runtime-evidence-v1.json";
const importPath="ops/mainnet0/economic-epoch2-besu-raw-transaction-validator-runtime-import-v1.json";
const artifactPath="ops/mainnet0/economic-epoch2-besu-raw-transaction-validator-plugin-artifact-v1.json";
const policyPath="ops/mainnet0/economic-epoch2-raw-transaction-domain-v1.json";
const candidatePath="ops/mainnet0/economic-evm-successor-migration-candidate-v1.json";

const readJson=(path)=>JSON.parse(fs.readFileSync(path,"utf8"));
const bytes=(path)=>fs.readFileSync(path);
const sha256=(buffer)=>crypto.createHash("sha256").update(buffer).digest("hex");
const gitBlobSha1=(path)=>{
  const body=bytes(path);
  return crypto
    .createHash("sha1")
    .update(Buffer.from(`blob ${body.length}\0`,"utf8"))
    .update(body)
    .digest("hex");
};
function canonical(value){
  if(value===null || typeof value!=="object") return JSON.stringify(value);
  if(Array.isArray(value)) return "["+value.map(canonical).join(",")+"]";
  return "{"+Object.keys(value).sort()
    .map((key)=>JSON.stringify(key)+":"+canonical(value[key]))
    .join(",")+"}";
}

const evidence=readJson(evidencePath);
const imported=readJson(importPath);
const artifact=readJson(artifactPath);
const policy=readJson(policyPath);
const candidate=readJson(candidatePath);

assert.equal(
  sha256(bytes(evidencePath)),
  "4679d1c99b93353ab9748594da12469090921a4a28373f2db3ae825af68d98c1",
);
const {receipt_material_sha256:receiptMaterialSha256,...receiptBody}=evidence;
assert.equal(
  sha256(Buffer.from(canonical(receiptBody),"utf8")),
  receiptMaterialSha256,
);
assert.equal(
  receiptMaterialSha256,
  "c1bbe8eac870abe049bc690474cc286864df73727c5fa14730aa69c8cbb94bba",
);

assert.equal(
  evidence.marker,
  "VOID_ECONOMIC_EPOCH2_BESU_RAW_TRANSACTION_VALIDATOR_RUNTIME_V1",
);
assert.equal(evidence.version,1);
assert.equal(evidence.status,"BESU_RAW_TRANSACTION_EPOCH_DOMAIN_RUNTIME_GREEN");
assert.deepEqual(evidence.client,{
  name:"Besu",
  version:"26.8.1",
  chain_id:2050,
  network_id:"2050",
  consensus:"QBFT",
  validator_count:1,
});
assert.equal(evidence.domain.execution_epoch,2);
assert.equal(evidence.domain.transaction_type,2);
assert.equal(
  evidence.domain.marker_address,
  "0x0000000000000000000000000000000000002050",
);
assert.equal(
  evidence.domain.marker_storage_key,
  "0xde7f074f5f127e9918248d0d3643786cb0a4de66256d2c40bb26beafa63c73b7",
);

for(const key of ["legacy_type0","missing_marker","wrong_marker","duplicate_marker"]){
  const row=evidence.negative_cases[key];
  assert.equal(row.rejected,true,key);
  assert.equal(row.code,-32000,key);
  assert.equal(row.message,"Plugin has marked the transaction as invalid",key);
}
assert.equal(evidence.negative_cases.rejected_transaction_nonce_unchanged,true);
assert.equal(evidence.positive_case.accepted_and_mined,true);
assert.equal(
  evidence.positive_case.transaction_hash,
  "0x3bd7084c406a773428502c319887339036f545a85a6067add3c9f100a074181d",
);
assert.equal(evidence.positive_case.transaction_status,"1");
assert.equal(evidence.positive_case.transaction_type,"0x2");
assert.equal(evidence.positive_case.chain_id,2050);
assert.equal(evidence.positive_case.exact_marker_readback,true);
assert.equal(evidence.positive_case.gas_used,"25300");
assert.equal(evidence.positive_case.effective_gas_price_atoms,"0");
assert.equal(evidence.positive_case.sender_nonce_before,"0");
assert.equal(evidence.positive_case.sender_nonce_after,"1");
assert.equal(evidence.positive_case.sender_native_balance_before_atoms,"0");
assert.equal(evidence.positive_case.sender_native_balance_after_atoms,"0");
assert.ok(
  BigInt(evidence.positive_case.block_after) >
    BigInt(evidence.positive_case.block_before),
);

assert.equal(evidence.build.java_release,25);
assert.equal(evidence.build.maven_reproducible_build_proven,true);
assert.equal(evidence.build.plugin_jar_sha256,"6637c57b64666e7761a8e254e7968a60f4a80bef05e070be8e8b934d887d5518");
assert.equal(evidence.build.plugin_jar_bytes,5569);
assert.equal(evidence.build.plugin_service_loader_verified,true);
assert.equal(evidence.build.canonical_plugin_artifact_manifest,artifactPath);
assert.equal(evidence.build.plugin_artifact_runtime_identity_verified,true);

assert.equal(
  evidence.runtime.besu_image_repo_digest,
  "hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042",
);
assert.equal(evidence.runtime.requested_plugin,"VoidEpoch2RawTransactionDomainPlugin");
assert.equal(evidence.runtime.plugin_registration_log_verified,true);
assert.equal(evidence.runtime.transaction_validator_rule_registration_log_verified,true);
assert.equal(
  evidence.runtime.genesis_sha256,
  "ad6409a790b6462c83f986b90b70d14520fa0cfc2a51b553a53f5e09e2643146",
);
assert.equal(
  evidence.runtime.besu_log_sha256,
  "8679c13fe2e718d10489d538c69dfc9fae5359c31c502e8c195fa669a7b8faf1",
);

assert.equal(evidence.provenance.source_commit,"0949148a20d87460d02bfcc3c07209e6841b3056");
assert.equal(evidence.provenance.github_merge_context_sha,"4f5ce5ed694822e6183b728cd2a036cacded398d");
assert.equal(evidence.provenance.github_run_id,"36510974101");
assert.equal(evidence.provenance.github_run_attempt,"1");

for(const gate of [
  "plugin_loaded_and_rule_registered",
  "plugin_runtime_negative_cases_proven",
  "plugin_runtime_positive_case_proven",
  "plugin_artifact_content_addressed",
  "plugin_artifact_runtime_identity_verified",
  "besu_transaction_validation_rule_runtime_proven",
]){
  assert.equal(evidence.gates[gate],true,gate);
}
for(const gate of [
  "all_production_validators_epoch_domain_enforced",
  "cross_epoch_replay_protection_proven",
  "migration_authorized",
  "public_activation_authorized",
]){
  assert.equal(evidence.gates[gate],false,gate);
}

assert.equal(evidence.authority.hosted_disposable_runtime_only,true);
for(const key of [
  "user_ceremony_keys_used","user_wallet_access","production_rpc_contact",
  "authoritative_chain2050_write","validator_mutation","token_movement","funds_movement",
]){
  assert.equal(evidence.authority[key],false,key);
}

assert.equal(
  imported.marker,
  "VOID_ECONOMIC_EPOCH2_BESU_RAW_TRANSACTION_VALIDATOR_RUNTIME_IMPORT_V1",
);
assert.equal(imported.version,1);
assert.equal(imported.status,"CANONICAL_HOSTED_RUNTIME_EVIDENCE_IMPORTED");
assert.equal(imported.canonical_plugin_artifact_manifest,artifactPath);
assert.equal(imported.canonical_plugin_jar_sha256,"6637c57b64666e7761a8e254e7968a60f4a80bef05e070be8e8b934d887d5518");
assert.equal(imported.canonical_evidence_path,evidencePath);
assert.equal(
  imported.canonical_evidence_file_sha256,
  "4679d1c99b93353ab9748594da12469090921a4a28373f2db3ae825af68d98c1",
);
assert.equal(imported.evidence_receipt_material_sha256,receiptMaterialSha256);
assert.equal(imported.source_head,evidence.provenance.source_commit);
assert.equal(
  imported.github_merge_context_sha,
  evidence.provenance.github_merge_context_sha,
);
assert.equal(imported.workflow_run_id,evidence.provenance.github_run_id);
assert.equal(
  imported.workflow_run_attempt,
  evidence.provenance.github_run_attempt,
);
assert.equal(imported.artifact.id,"11008849091");
assert.equal(
  imported.artifact.digest,
  "sha256:8e3340563f7e149387928ac69b2ee35db1de0442beeef9f2fb8787eb48e6ac62",
);
assert.equal(imported.artifact.size_bytes,10317);
assert.equal(imported.artifact_files.plugin_jar.sha256,"6637c57b64666e7761a8e254e7968a60f4a80bef05e070be8e8b934d887d5518");
assert.equal(imported.artifact_files.plugin_jar.bytes,5569);
assert.equal(imported.artifact_files.genesis_json.sha256,evidence.runtime.genesis_sha256);
assert.equal(imported.artifact_files.besu_log.sha256,evidence.runtime.besu_log_sha256);
assert.equal(
  imported.artifact_files.qbft_extra_data.sha256,
  "d607f6ac9ae906ec7c91dbf00b92cc26dbe32bbc5e9817d417af0d2331b4b666",
);
assert.equal(imported.superseded_runtime_artifacts.length,2);
assert.equal(imported.superseded_runtime_artifacts[0].authoritative,false);
assert.equal(imported.superseded_runtime_artifacts[1].authoritative,false);
assert.equal(
  imported.superseded_runtime_artifacts[1].plugin_jar_sha256,
  "12f4d1ae799d94a4710fb211fe8e2c20fcc7063fd5e8b83e49e817632987eb83",
);

for(const gate of [
  "plugin_artifact_content_addressed",
  "plugin_artifact_runtime_identity_verified",
  "besu_transaction_validation_rule_runtime_proven",
]){
  assert.equal(imported.gates[gate],true,gate);
}
for(const gate of [
  "all_production_validators_epoch_domain_enforced",
  "cross_epoch_replay_protection_proven",
  "migration_authorized",
  "public_activation_authorized",
]){
  assert.equal(imported.gates[gate],false,gate);
}
assert.equal(imported.authority.source_import_only,true);
for(const key of [
  "plugin_installation_on_operator_host","service_action","production_rpc_contact",
  "wallet_access","private_key_access","transaction_signing",
  "transaction_broadcast_to_production","authoritative_chain2050_write",
  "validator_mutation","token_movement","funds_movement",
]){
  assert.equal(imported.authority[key],false,key);
}

assert.equal(
  artifact.marker,
  "VOID_ECONOMIC_EPOCH2_BESU_RAW_TRANSACTION_VALIDATOR_PLUGIN_ARTIFACT_V1",
);
assert.equal(artifact.jar_sha256,"6637c57b64666e7761a8e254e7968a60f4a80bef05e070be8e8b934d887d5518");
assert.equal(artifact.gates.plugin_artifact_content_addressed,true);
assert.equal(artifact.gates.plugin_artifact_runtime_identity_verified,false);

const sourcePaths={
  pom:"besu-plugins/epoch2-raw-transaction-domain-v1/pom.xml",
  plugin_source:
    "besu-plugins/epoch2-raw-transaction-domain-v1/src/main/java/org/voidnetwork/besu/epoch2/VoidEpoch2RawTransactionDomainPlugin.java",
  service_provider:
    "besu-plugins/epoch2-raw-transaction-domain-v1/src/main/resources/META-INF/services/org.hyperledger.besu.plugin.BesuPlugin",
  runtime_runner:"scripts/run_void_economic_epoch2_besu_raw_transaction_validator_runtime_v1.sh",
  runtime_verifier:"scripts/prove_void_economic_epoch2_besu_raw_transaction_validator_runtime_v1.mjs",
  runtime_source_proof:
    "scripts/prove_void_economic_epoch2_besu_raw_transaction_validator_runtime_source_v1.mjs",
  runtime_workflow:
    ".github/workflows/void-economic-epoch2-besu-raw-transaction-validator-runtime-v1.yml",
};
for(const [key,path] of Object.entries(sourcePaths)){
  assert.equal(
    gitBlobSha1(path),
    imported.tested_source_git_blobs_sha1[key],
    key,
  );
}
assert.equal(artifact.source_binding.pom_git_blob_sha1,imported.tested_source_git_blobs_sha1.pom);
assert.equal(
  artifact.source_binding.plugin_source_git_blob_sha1,
  imported.tested_source_git_blobs_sha1.plugin_source,
);
assert.equal(
  artifact.source_binding.service_provider_git_blob_sha1,
  imported.tested_source_git_blobs_sha1.service_provider,
);

assert.equal(policy.status,"BESU_PRODUCTION_VALIDATOR_ENFORCEMENT_GREEN_CROSS_EPOCH_HOLD");
assert.equal(policy.besu_validation_boundary.plugin_artifact_sha256,"6637c57b64666e7761a8e254e7968a60f4a80bef05e070be8e8b934d887d5518");
assert.equal(policy.besu_validation_boundary.plugin_artifact_content_addressed,true);
assert.equal(policy.besu_validation_boundary.plugin_artifact_runtime_identity_verified,true);
assert.equal(policy.besu_validation_boundary.plugin_runtime_proven,true);
assert.equal(policy.besu_validation_boundary.plugin_runtime_evidence,evidencePath);
assert.equal(policy.besu_validation_boundary.plugin_runtime_import,importPath);
assert.equal(policy.besu_validation_boundary.hosted_runtime_workflow_run_id,"36510974101");
assert.equal(policy.besu_validation_boundary.all_production_validators_enforce_rule,true);
assert.equal(policy.gates.plugin_artifact_runtime_identity_verified,true);
assert.equal(policy.gates.besu_transaction_validation_rule_runtime_proven,true);
assert.equal(policy.gates.all_production_validators_epoch_domain_enforced,true);
assert.equal(policy.gates.cross_epoch_replay_protection_proven,false);
assert.equal(policy.gates.migration_authorized,false);
assert.equal(policy.gates.public_activation_authorized,false);

const replay=candidate.replay_and_epoch_safety;
assert.equal(replay.raw_transaction_epoch_domain_defined,true);
assert.equal(replay.raw_transaction_epoch_domain_source_proven,true);
assert.equal(replay.besu_transaction_validation_rule_implemented,true);
assert.equal(replay.plugin_artifact_content_addressed,true);
assert.equal(replay.plugin_artifact_runtime_identity_verified,true);
assert.equal(replay.besu_transaction_validation_rule_runtime_proven,true);
assert.equal(replay.raw_transaction_epoch_domain_runtime_evidence,evidencePath);
assert.equal(replay.raw_transaction_epoch_domain_runtime_import,importPath);
assert.equal(replay.raw_transaction_epoch_domain_plugin_sha256,"6637c57b64666e7761a8e254e7968a60f4a80bef05e070be8e8b934d887d5518");
assert.equal(replay.all_production_validators_epoch_domain_enforced,true);
assert.equal(replay.cross_epoch_replay_protection_proven,false);
assert.equal(candidate.status,"HOLD");
assert.equal(candidate.launch_authority.transaction_broadcast,false);
assert.equal(candidate.launch_authority.chain2050_write,false);
assert.equal(candidate.launch_authority.public_activation,false);
assert.equal(candidate.launch_authority.money_movement,false);

console.log("VOID_ECONOMIC_EPOCH2_BESU_RAW_TRANSACTION_VALIDATOR_RUNTIME_EVIDENCE_V1_GREEN");
console.log("canonical_plugin_jar_sha256=6637c57b64666e7761a8e254e7968a60f4a80bef05e070be8e8b934d887d5518");
console.log("plugin_artifact_content_addressed=true");
console.log("plugin_artifact_runtime_identity_verified=true");
console.log("besu_transaction_validation_rule_runtime_proven=true");
console.log("all_production_validators_epoch_domain_enforced=true");
console.log("cross_epoch_replay_protection_proven=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
console.log("authoritative_chain2050_write=false");
console.log("funds_movement=false");
