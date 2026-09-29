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
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_PUBLICATION_V1,
  verifyVoidEconomicEpoch2ProductionValidatorRuntimePublicationV1,
} from "../tools/void-economic-epoch2-production-validator-runtime-publication-v1.mjs";

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

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function factsFor(role, identity, runtimeSha, logSha) {
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

function syntheticPublication(role, index) {
  const identity = JSON.parse(
    fs.readFileSync(
      `ops/mainnet0/economic-epoch2-qbft-node-identity-${role}-v1.json`,
      "utf8",
    ),
  );
  const runtimeSha = sha256(Buffer.from(runtimeText, "utf8"));
  const logSha = "c".repeat(64);
  const facts = factsFor(role, identity, runtimeSha, logSha);
  const candidate =
    buildVoidEconomicEpoch2ProductionValidatorRuntimeEvidenceCandidateV1({
      machineRole: role,
      runtimeResult,
      runtimeResultSha256: runtimeSha,
      facts,
      factsSha256: "d".repeat(64),
      pluginJarSha256: pluginSha,
      besuLogSha256: logSha,
      observedAtUtc: observed[index],
      validUntilUtc: "2030-01-01T00:10:00Z",
      hostName: identity.hostname,
    });

  const evidenceBytes = Buffer.from(
    JSON.stringify(candidate, null, 2) + "\n",
    "utf8",
  );
  const receipt =
    importVoidEconomicEpoch2ProductionValidatorRuntimeEvidenceV1({
      machineRole: role,
      evidenceBytes,
      expectedFileSha256: sha256(evidenceBytes),
      expectedEvidenceId: candidate.evidence_id,
      evaluationTimeUtc: "2030-01-01T00:05:00Z",
      bindingCandidate: binding,
      rawDomainPolicy: rawDomain,
      pluginArtifactManifest: artifact,
    });

  return { evidenceBytes, receipt };
}

assert.equal(
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_PUBLICATION_V1,
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_PUBLICATION_V1",
);

for (let index = 0; index < roles.length; index += 1) {
  const role = roles[index];
  const { evidenceBytes, receipt } = syntheticPublication(role, index);
  const verified =
    verifyVoidEconomicEpoch2ProductionValidatorRuntimePublicationV1({
      machineRole: role,
      evidenceBytes,
      importReceipt: receipt,
      bindingCandidate: binding,
      rawDomainPolicy: rawDomain,
      pluginArtifactManifest: artifact,
    });

  assert.equal(
    verified.status,
    "CANONICAL_SINGLE_VALIDATOR_RUNTIME_PUBLICATION_VALID",
  );
  assert.equal(verified.machine_role, role);
  assert.equal(verified.evidence_file_sha256, receipt.evidence_file_sha256);
  assert.equal(verified.evidence_id, receipt.evidence_id);
  assert.equal(verified.runtime_evidence_semantically_verified, true);
  assert.equal(verified.evidence_fresh_at_import, true);
  assert.equal(verified.all_production_validators_epoch_domain_enforced, false);
  assert.equal(verified.cross_epoch_replay_protection_proven, false);
  assert.equal(verified.migration_authorized, false);
  assert.equal(verified.public_activation_authorized, false);
  assert.equal(verified.funds_movement_authorized, false);
}

{
  const { evidenceBytes, receipt } = syntheticPublication("nimo", 1);
  const bad = structuredClone(receipt);
  bad.gates.all_production_validators_epoch_domain_enforced = true;
  assert.throws(
    () =>
      verifyVoidEconomicEpoch2ProductionValidatorRuntimePublicationV1({
        machineRole: "nimo",
        evidenceBytes,
        importReceipt: bad,
        bindingCandidate: binding,
        rawDomainPolicy: rawDomain,
        pluginArtifactManifest: artifact,
      }),
    /import_receipt_reconstruction_mismatch/,
  );
}

{
  const { evidenceBytes, receipt } = syntheticPublication("precision", 0);
  const bad = Buffer.from(evidenceBytes);
  bad[bad.length - 2] = bad[bad.length - 2] === 32 ? 33 : 32;
  assert.throws(
    () =>
      verifyVoidEconomicEpoch2ProductionValidatorRuntimePublicationV1({
        machineRole: "precision",
        evidenceBytes: bad,
        importReceipt: receipt,
        bindingCandidate: binding,
        rawDomainPolicy: rawDomain,
        pluginArtifactManifest: artifact,
      }),
    /evidence_file_sha256_mismatch|evidence_json_invalid/,
  );
}

console.log(
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_PUBLICATION_V1_PROOF_GREEN",
);
console.log("canonical_roles=precision,nimo,xiphos");
console.log("single_host_publication_reconstruction_verified=true");
console.log("evidence_hash_tamper_rejected=true");
console.log("premature_gate_promotion_rejected=true");
console.log("all_production_validators_epoch_domain_enforced=false");
console.log("cross_epoch_replay_protection_proven=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
console.log("funds_movement_authorized=false");
