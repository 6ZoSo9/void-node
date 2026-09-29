#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const evidencePath =
  "ops/mainnet0/economic-epoch2-besu-raw-transaction-validator-runtime-evidence-v1.json";
const importPath =
  "ops/mainnet0/economic-epoch2-besu-raw-transaction-validator-runtime-import-v1.json";
const artifactPath =
  "ops/mainnet0/economic-epoch2-besu-raw-transaction-validator-plugin-artifact-v1.json";

const rawEvidence = fs.readFileSync(evidencePath);
const evidence = JSON.parse(rawEvidence.toString("utf8"));
const imported = JSON.parse(fs.readFileSync(importPath, "utf8"));
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");
const canonical = (value) => {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonical(value[key]))
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(value);
};
const gitBlobSha1 = (path) => {
  const body = fs.readFileSync(path);
  const header = Buffer.from(`blob ${body.length}\0`, "utf8");
  return crypto.createHash("sha1").update(header).update(body).digest("hex");
};

assert.equal(
  evidence.marker,
  "VOID_ECONOMIC_EPOCH2_BESU_RAW_TRANSACTION_VALIDATOR_RUNTIME_V1",
);
assert.equal(evidence.version, 1);
assert.equal(
  evidence.status,
  "BESU_RAW_TRANSACTION_EPOCH_DOMAIN_RUNTIME_GREEN",
);
assert.equal(
  imported.marker,
  "VOID_ECONOMIC_EPOCH2_BESU_RAW_TRANSACTION_VALIDATOR_RUNTIME_IMPORT_V1",
);
assert.equal(imported.version, 1);
assert.equal(imported.status, "CANONICAL_HOSTED_RUNTIME_EVIDENCE_IMPORTED");

const evidenceFileSha256 = sha256(rawEvidence);
assert.equal(evidenceFileSha256, imported.canonical_evidence_file_sha256);
assert.equal(imported.canonical_evidence_path, evidencePath);

const {
  receipt_material_sha256: receiptMaterialSha256,
  ...receiptMaterial
} = evidence;
assert.equal(
  sha256(Buffer.from(canonical(receiptMaterial), "utf8")),
  receiptMaterialSha256,
);
assert.equal(
  receiptMaterialSha256,
  imported.evidence_receipt_material_sha256,
);

assert.equal(
  artifact.marker,
  "VOID_ECONOMIC_EPOCH2_BESU_RAW_TRANSACTION_VALIDATOR_PLUGIN_ARTIFACT_V1",
);
assert.equal(
  artifact.jar_sha256,
  "6637c57b64666e7761a8e254e7968a60f4a80bef05e070be8e8b934d887d5518",
);
assert.equal(
  imported.canonical_plugin_artifact_manifest,
  artifactPath,
);
assert.equal(imported.canonical_plugin_jar_sha256, artifact.jar_sha256);
assert.equal(evidence.build.plugin_jar_sha256, artifact.jar_sha256);
assert.equal(
  evidence.build.canonical_plugin_artifact_manifest,
  artifactPath,
);
assert.equal(evidence.build.plugin_artifact_runtime_identity_verified, true);
assert.equal(imported.artifact_files.plugin_jar.sha256, artifact.jar_sha256);
assert.equal(imported.artifact_files.plugin_jar.bytes, evidence.build.plugin_jar_bytes);

assert.equal(evidence.client.name, "Besu");
assert.equal(evidence.client.version, "26.8.1");
assert.equal(evidence.client.chain_id, 2050);
assert.equal(evidence.client.network_id, "2050");
assert.equal(evidence.client.consensus, "QBFT");
assert.equal(evidence.client.validator_count, 1);
assert.equal(evidence.domain.execution_epoch, 2);
assert.equal(evidence.domain.transaction_type, 2);
assert.equal(
  evidence.domain.marker_address,
  "0x0000000000000000000000000000000000002050",
);
assert.equal(
  evidence.domain.marker_storage_key,
  "0xde7f074f5f127e9918248d0d3643786cb0a4de66256d2c40bb26beafa63c73b7",
);

for (const label of [
  "legacy_type0",
  "missing_marker",
  "wrong_marker",
  "duplicate_marker",
]) {
  const row = evidence.negative_cases[label];
  assert.equal(row.rejected, true, label);
  assert.equal(row.code, -32000, label);
  assert.equal(
    row.message,
    "Plugin has marked the transaction as invalid",
    label,
  );
}
assert.equal(evidence.negative_cases.rejected_transaction_nonce_unchanged, true);

assert.equal(evidence.positive_case.accepted_and_mined, true);
assert.match(evidence.positive_case.transaction_hash, /^0x[0-9a-f]{64}$/);
assert.equal(evidence.positive_case.transaction_status, "1");
assert.equal(evidence.positive_case.transaction_type, "0x2");
assert.equal(evidence.positive_case.chain_id, 2050);
assert.equal(evidence.positive_case.exact_marker_readback, true);
assert.ok(BigInt(evidence.positive_case.gas_used) > 0n);
assert.equal(evidence.positive_case.effective_gas_price_atoms, "0");
assert.equal(evidence.positive_case.sender_nonce_before, "0");
assert.equal(evidence.positive_case.sender_nonce_after, "1");
assert.equal(evidence.positive_case.sender_native_balance_before_atoms, "0");
assert.equal(evidence.positive_case.sender_native_balance_after_atoms, "0");
assert.ok(
  BigInt(evidence.positive_case.block_after) >
    BigInt(evidence.positive_case.block_before),
);

assert.equal(evidence.gates.plugin_loaded_and_rule_registered, true);
assert.equal(evidence.gates.plugin_runtime_negative_cases_proven, true);
assert.equal(evidence.gates.plugin_runtime_positive_case_proven, true);
assert.equal(evidence.gates.plugin_artifact_content_addressed, true);
assert.equal(evidence.gates.plugin_artifact_runtime_identity_verified, true);
assert.equal(
  evidence.gates.besu_transaction_validation_rule_runtime_proven,
  true,
);
assert.equal(
  evidence.gates.all_production_validators_epoch_domain_enforced,
  false,
);
assert.equal(evidence.gates.cross_epoch_replay_protection_proven, false);
assert.equal(evidence.gates.migration_authorized, false);
assert.equal(evidence.gates.public_activation_authorized, false);

assert.equal(
  evidence.runtime.besu_image_pinned_reference,
  "hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042",
);
assert.equal(
  evidence.runtime.besu_image_repo_digest,
  evidence.runtime.besu_image_pinned_reference,
);
assert.equal(evidence.runtime.plugin_directory, "/plugins");
assert.equal(
  evidence.runtime.requested_plugin,
  "VoidEpoch2RawTransactionDomainPlugin",
);
assert.equal(evidence.runtime.plugin_registration_log_verified, true);
assert.equal(
  evidence.runtime.transaction_validator_rule_registration_log_verified,
  true,
);
assert.equal(
  evidence.runtime.genesis_sha256,
  imported.artifact_files.genesis_json.sha256,
);
assert.equal(
  evidence.runtime.besu_log_sha256,
  imported.artifact_files.besu_log.sha256,
);

assert.equal(
  evidence.provenance.source_commit,
  "0949148a20d87460d02bfcc3c07209e6841b3056",
);
assert.equal(evidence.provenance.source_commit, imported.source_head);
assert.equal(
  evidence.provenance.github_merge_context_sha,
  "4f5ce5ed694822e6183b728cd2a036cacded398d",
);
assert.equal(
  evidence.provenance.github_merge_context_sha,
  imported.github_merge_context_sha,
);
assert.equal(evidence.provenance.github_run_id, "36510974101");
assert.equal(evidence.provenance.github_run_id, imported.workflow_run_id);
assert.equal(evidence.provenance.github_run_attempt, "1");
assert.equal(evidence.provenance.github_run_attempt, imported.workflow_run_attempt);

assert.equal(imported.artifact.id, "11008849091");
assert.equal(
  imported.artifact.name,
  "void-economic-epoch2-besu-raw-transaction-validator-runtime-v1-0949148a20d87460d02bfcc3c07209e6841b3056",
);
assert.equal(
  imported.artifact.digest,
  "sha256:8e3340563f7e149387928ac69b2ee35db1de0442beeef9f2fb8787eb48e6ac62",
);
assert.equal(imported.artifact.size_bytes, 10317);

const currentBlobBindings = {
  pom: gitBlobSha1(
    "besu-plugins/epoch2-raw-transaction-domain-v1/pom.xml",
  ),
  plugin_source: gitBlobSha1(
    "besu-plugins/epoch2-raw-transaction-domain-v1/src/main/java/org/voidnetwork/besu/epoch2/VoidEpoch2RawTransactionDomainPlugin.java",
  ),
  service_provider: gitBlobSha1(
    "besu-plugins/epoch2-raw-transaction-domain-v1/src/main/resources/META-INF/services/org.hyperledger.besu.plugin.BesuPlugin",
  ),
  runtime_runner: gitBlobSha1(
    "scripts/run_void_economic_epoch2_besu_raw_transaction_validator_runtime_v1.sh",
  ),
  runtime_verifier: gitBlobSha1(
    "scripts/prove_void_economic_epoch2_besu_raw_transaction_validator_runtime_v1.mjs",
  ),
  runtime_source_proof: gitBlobSha1(
    "scripts/prove_void_economic_epoch2_besu_raw_transaction_validator_runtime_source_v1.mjs",
  ),
};
for (const [key, observed] of Object.entries(currentBlobBindings)) {
  assert.equal(
    observed,
    imported.tested_source_git_blobs_sha1[key],
    key,
  );
}
assert.equal(
  imported.tested_source_git_blobs_sha1.runtime_workflow,
  "ed47725db8ce9fbca6464205731cfc86da19bc98",
);

for (const row of imported.superseded_runtime_artifacts) {
  assert.equal(row.authoritative, false);
}
assert.equal(imported.superseded_runtime_artifacts.length, 2);

assert.equal(imported.gates.plugin_artifact_content_addressed, true);
assert.equal(imported.gates.plugin_artifact_runtime_identity_verified, true);
assert.equal(
  imported.gates.besu_transaction_validation_rule_runtime_proven,
  true,
);
assert.equal(
  imported.gates.all_production_validators_epoch_domain_enforced,
  false,
);
assert.equal(imported.gates.cross_epoch_replay_protection_proven, false);
assert.equal(imported.gates.migration_authorized, false);
assert.equal(imported.gates.public_activation_authorized, false);

for (const [key, value] of Object.entries(evidence.authority)) {
  if (key === "hosted_disposable_runtime_only") {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}
for (const [key, value] of Object.entries(imported.authority)) {
  if (key === "source_import_only") {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

console.log(
  "VOID_ECONOMIC_EPOCH2_BESU_RAW_TRANSACTION_VALIDATOR_RUNTIME_IMPORT_V1_PROOF_GREEN",
);
console.log("canonical_evidence_file_sha256=" + evidenceFileSha256);
console.log("receipt_material_sha256=" + receiptMaterialSha256);
console.log("canonical_plugin_jar_sha256=" + artifact.jar_sha256);
console.log("hosted_runtime_workflow_run_id=36510974101");
console.log("hosted_runtime_artifact_id=11008849091");
console.log("plugin_artifact_runtime_identity_verified=true");
console.log("besu_transaction_validation_rule_runtime_proven=true");
console.log("all_production_validators_epoch_domain_enforced=false");
console.log("cross_epoch_replay_protection_proven=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
