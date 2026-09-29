#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const evidencePath="ops/mainnet0/economic-epoch2-besu-raw-transaction-validator-plugin-v1.json";
const policyPath="ops/mainnet0/economic-epoch2-raw-transaction-domain-v1.json";

const evidence=JSON.parse(fs.readFileSync(evidencePath,"utf8"));
const policy=JSON.parse(fs.readFileSync(policyPath,"utf8"));

function bytes(path){ return fs.readFileSync(path); }
function text(path){ return bytes(path).toString("utf8"); }
function gitBlobSha1(path){
  const body=bytes(path);
  const header=Buffer.from(`blob ${body.length}\0`,"utf8");
  return crypto.createHash("sha1").update(header).update(body).digest("hex");
}

assert.equal(
  evidence.marker,
  "VOID_ECONOMIC_EPOCH2_BESU_RAW_TRANSACTION_VALIDATOR_PLUGIN_V1",
);
assert.equal(evidence.version,1);
assert.equal(
  evidence.status,
  "SOURCE_PLUGIN_IMPLEMENTED_COMPILE_AND_TEST_CI_REQUIRED_RUNTIME_HOLD",
);
assert.equal(evidence.besu.version,"26.8.1");
assert.equal(
  evidence.besu.release_commit,
  "d97cbd61976a52bb109e637196fef9a8ebf2b617",
);
assert.equal(
  evidence.besu.plugin_api_coordinate,
  "org.hyperledger.besu:besu-plugin-api:26.8.1",
);
assert.equal(evidence.besu.java_release,25);

const upstream=evidence.besu.upstream_api_provenance;
assert.equal(upstream.besu_plugin_blob_sha1,"a7bab332e985b85e3a85e85915b64e913f9a28cb");
assert.equal(
  upstream.transaction_validator_service_blob_sha1,
  "401181ac490810b901ff838b1c72c7917c7c3069",
);
assert.equal(
  upstream.transaction_validation_rule_blob_sha1,
  "2e7ea61438f7aa9129b79f44ad41dcd253497231",
);
assert.equal(
  upstream.access_list_entry_blob_sha1,
  "121579f9dd58a13f61871ec6395073453c05ca11",
);
assert.equal(
  upstream.upstream_validator_plugin_example_blob_sha1,
  "b59812bd94354c028dc390a9cc3ac0d593efdfd7",
);
assert.equal(upstream.runner_builder_blob_sha1,"2919d49a005afdbba40f03b8417db082709b2d0a");
assert.equal(
  upstream.default_protocol_schedule_blob_sha1,
  "9c8e8d665915f3e453e5cd97b8680e1e9a0d168b",
);
assert.equal(
  upstream.transaction_validator_factory_blob_sha1,
  "c924e02e17927acabed8c456c5e4d3d7afabf80e",
);
assert.equal(
  upstream.extendable_transaction_validator_blob_sha1,
  "a3ea10497224a54839f6c825ce4a21f297239369",
);
assert.equal(
  upstream.mainnet_transaction_processor_blob_sha1,
  "d7a9f7f4565c2d6bdcfa7d33179c0bb16c9976d4",
);
for(const [key,value] of Object.entries(evidence.besu.protocol_validation_binding)){
  assert.equal(value,true,key);
}

for(const [name,path] of Object.entries({
  pom:evidence.source.pom_path,
  plugin_source:evidence.source.plugin_source_path,
  service_provider:evidence.source.service_provider_path,
  unit_test:evidence.source.unit_test_path,
})){
  assert.equal(gitBlobSha1(path),evidence.source.git_blob_sha1[name],name);
}

const pom=text(evidence.source.pom_path);
for(const required of [
  "<artifactId>besu-plugin-api</artifactId>",
  "<besu.version>26.8.1</besu.version>",
  "<maven.compiler.release>25</maven.compiler.release>",
  "https://hyperledger.jfrog.io/artifactory/besu-maven/",
  "<finalName>void-epoch2-raw-transaction-domain-plugin-v1</finalName>",
]){
  assert.ok(pom.includes(required),required);
}

const source=text(evidence.source.plugin_source_path);
for(const required of [
  "implements BesuPlugin",
  "getService(TransactionValidatorService.class)",
  "registerTransactionValidatorRule(",
  "TransactionType.EIP1559",
  "void_epoch2_chain_id_mismatch",
  "void_epoch2_type2_transaction_required",
  "void_epoch2_signed_access_list_required",
  "void_epoch2_marker_entry_count_invalid",
  "void_epoch2_marker_storage_key_invalid",
  "void_epoch2_transaction_validator_service_unavailable",
  evidence.rule.marker_address,
  evidence.rule.marker_storage_key,
]){
  assert.ok(source.includes(required),required);
}

const service=text(evidence.source.service_provider_path);
assert.equal(service,evidence.source.service_loader_class+"\n");

const tests=text(evidence.source.unit_test_path);
for(const required of [
  "acceptsExactEpoch2SignedDomain",
  "rejectsWrongOrMissingChainId",
  "rejectsNonType2Transaction",
  "rejectsMissingOrDuplicateMarker",
  "rejectsMissingAccessList",
  "rejectsWrongMarkerStorageKey",
  "registersRuleAndFailsClosedWhenServiceMissing",
]){
  assert.ok(tests.includes(required),required);
}

assert.equal(policy.besu_validation_boundary.plugin_module_path,evidence.source.module_path);
assert.equal(
  policy.besu_validation_boundary.plugin_source_evidence,
  evidencePath,
);
assert.equal(
  policy.besu_validation_boundary.plugin_api_coordinate,
  evidence.besu.plugin_api_coordinate,
);
assert.equal(policy.besu_validation_boundary.plugin_java_release,25);
assert.equal(policy.gates.besu_transaction_validation_rule_implemented,true);
assert.equal(policy.gates.besu_transaction_validation_rule_source_tested,true);
assert.equal(policy.gates.besu_transaction_validation_rule_runtime_proven,false);
assert.equal(policy.gates.all_production_validators_epoch_domain_enforced,false);
assert.equal(policy.gates.cross_epoch_replay_protection_proven,false);
assert.equal(policy.gates.migration_authorized,false);
assert.equal(policy.gates.public_activation_authorized,false);

assert.equal(evidence.gates.besu_transaction_validation_rule_implemented,true);
assert.equal(evidence.gates.besu_transaction_validation_rule_source_tested,true);
assert.equal(evidence.gates.besu_transaction_validation_rule_runtime_proven,false);
assert.equal(evidence.gates.plugin_artifact_content_addressed,false);
assert.equal(evidence.gates.all_production_validators_epoch_domain_enforced,false);
assert.equal(evidence.gates.cross_epoch_replay_protection_proven,false);

for(const [key,value] of Object.entries(evidence.authority)){
  if(key==="source_only"){ assert.equal(value,true,key); continue; }
  assert.equal(value,false,key);
}

console.log("VOID_ECONOMIC_EPOCH2_BESU_RAW_TRANSACTION_VALIDATOR_PLUGIN_V1_PROOF_GREEN");
console.log("besu_version=26.8.1");
console.log("java_release=25");
console.log("besu_transaction_validation_rule_implemented=true");
console.log("besu_transaction_validation_rule_source_tested=true");
console.log("plugin_artifact_content_addressed=false");
console.log("besu_transaction_validation_rule_runtime_proven=false");
console.log("all_production_validators_epoch_domain_enforced=false");
console.log("cross_epoch_replay_protection_proven=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
