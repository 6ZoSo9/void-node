#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  buildVoidEconomicEpoch2ProductionValidatorRuntimeEvidenceCandidateV1,
} from "../tools/void-economic-epoch2-production-validator-runtime-evidence-candidate-v1.mjs";
import {
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_IMPORT_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_IMPORT_V1,
  verifyVoidEconomicEpoch2ProductionValidatorRuntimeImportV1,
} from "../tools/void-economic-epoch2-production-validator-runtime-import-v1.mjs";

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
const runtimeText = fs.readFileSync(
  "ops/mainnet0/economic-epoch2-besu-raw-transaction-validator-runtime-evidence-v1.json",
  "utf8",
);
const runtimeResult = JSON.parse(runtimeText);

const pluginSha =
  "6637c57b64666e7761a8e254e7968a60f4a80bef05e070be8e8b934d887d5518";
const roles = ["precision", "nimo", "xiphos"];
const observed = [
  "2030-01-01T00:00:00Z",
  "2030-01-01T00:01:00Z",
  "2030-01-01T00:02:00Z",
];
const runtimeSha = sha256(runtimeText);

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function identityText(role) {
  return fs.readFileSync(
    `ops/mainnet0/economic-epoch2-qbft-node-identity-${role}-v1.json`,
    "utf8",
  );
}

function factsFor(role, identity, logSha) {
  const entry = binding.qbft.production_binding_entries.find(
    (row) => row.machine_role === role,
  );
  assert(entry);
  return {
    marker:
      "VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_LOCAL_RUNTIME_FACTS_V1",
    version: 1,
    machine_role: role,
    hostname: identity.hostname,
    void_node_id: entry.void_node_id,
    besu_validator_address: entry.besu_validator_address,
    besu_public_key: entry.besu_public_key,
    node_private_key_path: path.join(
      os.homedir(),
      ".local",
      "share",
      "void",
      "epoch2-qbft-validator-identity-v1",
      role,
      "nodekey",
    ),
    node_private_key_mode: "600",
    node_private_key_matches_canonical_identity: true,
    node_private_key_content_exported: false,
    node_private_key_stdout: false,
    void_health_loopback_verified: true,
    besu_image:
      "hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042",
    plugin_name: "VoidEpoch2RawTransactionDomainPlugin",
    plugin_jar_sha256: pluginSha,
    plugin_loaded: true,
    transaction_validation_rule_registered: true,
    local_unmarked_raw_transaction_rejected: true,
    raw_public_rpc_disabled: true,
    rpc_host_binding: "127.0.0.1",
    external_p2p_exposure: false,
    startup_fail_closed_on_plugin_mismatch: true,
    production_rpc_contact: false,
    authoritative_chain2050_write: false,
    validator_mutation: false,
    funds_movement: false,
    runtime_result_sha256: runtimeSha,
    besu_log_sha256: logSha,
  };
}

function bundleFor(role, index) {
  const identityJson = identityText(role);
  const identity = JSON.parse(identityJson);
  const logText = [
    "INFO Registered plugin of type org.voidnetwork.besu.epoch2.VoidEpoch2RawTransactionDomainPlugin",
    "INFO Registered new transaction validator rule",
    "",
  ].join("\n");
  const logSha = sha256(logText);
  const facts = factsFor(role, identity, logSha);
  const factsText = JSON.stringify(facts, null, 2) + "\n";
  const candidate =
    buildVoidEconomicEpoch2ProductionValidatorRuntimeEvidenceCandidateV1({
      machineRole: role,
      runtimeResult,
      runtimeResultSha256: runtimeSha,
      facts,
      factsSha256: sha256(factsText),
      pluginJarSha256: pluginSha,
      besuLogSha256: logSha,
      observedAtUtc: observed[index],
      validUntilUtc: "2030-01-01T00:10:00Z",
      hostName: identity.hostname,
    });
  return {
    machine_role: role,
    runtime_result_json: runtimeText,
    facts_json: factsText,
    identity_attestation_json: identityJson,
    besu_log_text: logText,
    plugin_jar_sha256: pluginSha,
    candidate,
  };
}

function request(bundles = roles.map(bundleFor), evaluation = "2030-01-01T00:05:00Z") {
  return {
    binding_candidate: binding,
    raw_domain_policy: rawDomain,
    plugin_artifact_manifest: artifact,
    evaluation_time_utc: evaluation,
    bundles,
  };
}

function rejects(fn, pattern) {
  assert.throws(fn, pattern);
}

assert.equal(
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_IMPORT_V1,
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_IMPORT_V1",
);

const imported =
  verifyVoidEconomicEpoch2ProductionValidatorRuntimeImportV1(request());

assert.equal(imported.ok, true);
assert.equal(
  imported.status,
  "THREE_HOST_RUNTIME_BUNDLES_SEMANTICALLY_VERIFIED_PRODUCTION_SERVICE_HOLD",
);
assert.equal(imported.chain_id, 2050);
assert.equal(imported.execution_epoch, 2);
assert.equal(imported.imported_role_count, 3);
assert.deepEqual(imported.imported_roles, roles);
assert.equal(imported.evidence_ids.length, 3);
assert.equal(new Set(imported.evidence_ids).size, 3);
assert.equal(imported.source_bundle_digests.length, 3);
assert.equal(imported.upstream_runtime_evidence_semantically_verified, true);
assert.equal(imported.disposable_runtime_identity_bound, true);
assert.equal(imported.production_service_configuration_verified, false);
assert.equal(
  imported.production_service_runtime_plugin_enforcement_verified,
  false,
);
assert.equal(imported.all_production_validators_epoch_domain_enforced, false);
assert.equal(imported.cross_epoch_replay_protection_proven, false);
assert.equal(imported.migration_authorized, false);
assert.equal(imported.public_activation_authorized, false);
assert.equal(imported.funds_movement_authorized, false);

for (const row of imported.source_bundle_digests) {
  assert.match(row.runtime_result_sha256, /^[0-9a-f]{64}$/);
  assert.match(row.facts_sha256, /^[0-9a-f]{64}$/);
  assert.match(row.identity_attestation_git_blob_sha, /^[0-9a-f]{40}$/);
  assert.match(row.private_attestation_sha256, /^[0-9a-f]{64}$/);
  assert.match(row.besu_log_sha256, /^[0-9a-f]{64}$/);
  assert.equal(row.plugin_jar_sha256, pluginSha);
}

{
  const reordered = roles.map(bundleFor);
  [reordered[0], reordered[1]] = [reordered[1], reordered[0]];
  rejects(
    () =>
      verifyVoidEconomicEpoch2ProductionValidatorRuntimeImportV1(
        request(reordered),
      ),
    /runtime_import_role_order_or_set_mismatch/,
  );
}

{
  const bundles = roles.map(bundleFor);
  bundles[1] = structuredClone(bundles[1]);
  bundles[1].identity_attestation_json =
    bundles[1].identity_attestation_json.replace(
      '"hostname": "Nimo"',
      '"hostname": "forged-nimo"',
    );
  rejects(
    () =>
      verifyVoidEconomicEpoch2ProductionValidatorRuntimeImportV1(
        request(bundles),
      ),
    /runtime_import_identity_attestation_mismatch/,
  );
}

{
  const bundles = roles.map(bundleFor);
  bundles[0] = structuredClone(bundles[0]);
  bundles[0].runtime_result_json =
    bundles[0].runtime_result_json.replace(
      '"BESU_RAW_TRANSACTION_EPOCH_DOMAIN_RUNTIME_GREEN"',
      '"FORGED_RUNTIME_GREEN"',
    );
  rejects(
    () =>
      verifyVoidEconomicEpoch2ProductionValidatorRuntimeImportV1(
        request(bundles),
      ),
    /runtime_import_runtime_result_invalid/,
  );
}

{
  const bundles = roles.map(bundleFor);
  bundles[2] = structuredClone(bundles[2]);
  const facts = JSON.parse(bundles[2].facts_json);
  facts.hostname = "wrong-xiphos";
  bundles[2].facts_json = JSON.stringify(facts, null, 2) + "\n";
  rejects(
    () =>
      verifyVoidEconomicEpoch2ProductionValidatorRuntimeImportV1(
        request(bundles),
      ),
    /runtime_import_facts_binding_mismatch/,
  );
}

{
  const bundles = roles.map(bundleFor);
  bundles[0] = structuredClone(bundles[0]);
  bundles[0].besu_log_text =
    "INFO Registered plugin of type org.voidnetwork.besu.epoch2.VoidEpoch2RawTransactionDomainPlugin\n";
  rejects(
    () =>
      verifyVoidEconomicEpoch2ProductionValidatorRuntimeImportV1(
        request(bundles),
      ),
    /runtime_import_besu_log_semantics_missing/,
  );
}

{
  const bundles = roles.map(bundleFor);
  bundles[0] = structuredClone(bundles[0]);
  bundles[0].candidate = structuredClone(bundles[0].candidate);
  bundles[0].candidate.observed_at_utc = "2030-01-01T00:00:01Z";
  rejects(
    () =>
      verifyVoidEconomicEpoch2ProductionValidatorRuntimeImportV1(
        request(bundles),
      ),
    /runtime_import_candidate_reconstruction_mismatch/,
  );
}

rejects(
  () =>
    verifyVoidEconomicEpoch2ProductionValidatorRuntimeImportV1(
      request(roles.map(bundleFor), "2030-01-01T00:11:00Z"),
    ),
  /validator_enforcement_evidence_not_current/,
);

for (const [key, value] of Object.entries(
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_IMPORT_AUTHORITY_V1,
)) {
  if (key === "source_verification_only") {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const source = fs.readFileSync(
  "tools/void-economic-epoch2-production-validator-runtime-import-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "readFileSync(",
  "writeFileSync(",
  "appendFileSync(",
  "renameSync(",
  "unlinkSync(",
  "JsonRpcProvider(",
  "eth_sendRawTransaction",
  "new Wallet(",
  "private_key",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_IMPORT_V1_PROOF_GREEN",
);
console.log("canonical_roles=precision,nimo,xiphos");
console.log("raw_bundle_byte_hashes_verified=true");
console.log("public_identity_git_blob_binding_verified=true");
console.log("private_attestation_hash_binding_verified=true");
console.log("runtime_result_semantics_verified=true");
console.log("runtime_facts_semantics_verified=true");
console.log("besu_registration_log_semantics_verified=true");
console.log("candidate_rows_reconstructed_exactly=true");
console.log("upstream_runtime_evidence_semantically_verified=true");
console.log("production_service_configuration_verified=false");
console.log("production_service_runtime_plugin_enforcement_verified=false");
console.log("all_production_validators_epoch_domain_enforced=false");
console.log("cross_epoch_replay_protection_proven=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
console.log("funds_movement=false");
