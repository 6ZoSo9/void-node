#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  verifyVoidEconomicEpoch2ProductionValidatorDomainEvidenceRowV1,
} from "./void-economic-epoch2-production-validator-domain-enforcement-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_EVIDENCE_IMPORT_V1 =
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_EVIDENCE_IMPORT_V1";

const BINDING_PATH =
  "ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json";
const RAW_DOMAIN_PATH =
  "ops/mainnet0/economic-epoch2-raw-transaction-domain-v1.json";
const PLUGIN_ARTIFACT_PATH =
  "ops/mainnet0/economic-epoch2-besu-raw-transaction-validator-plugin-artifact-v1.json";
const SHA256 = /^[0-9a-f]{64}$/u;
const EVIDENCE_ID = /^voide2ve1_[0-9a-f]{64}$/u;
const ROLES = new Set(["precision", "nimo", "xiphos"]);

function fail(reason) {
  throw new Error(reason);
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function sha256Bytes(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, "utf8"));
}

function canonicalImportPath(role) {
  return (
    "ops/mainnet0/economic-epoch2-production-validator-runtime-evidence-" +
    role +
    "-import-v1.json"
  );
}

function canonicalEvidencePath(role) {
  return (
    "ops/mainnet0/economic-epoch2-production-validator-runtime-evidence-" +
    role +
    "-v1.json"
  );
}

export function importVoidEconomicEpoch2ProductionValidatorRuntimeEvidenceV1({
  machineRole,
  evidenceBytes,
  expectedFileSha256,
  expectedEvidenceId,
  evaluationTimeUtc,
  bindingCandidate,
  rawDomainPolicy,
  pluginArtifactManifest,
}) {
  const role = String(machineRole || "").toLowerCase();
  if (!ROLES.has(role)) fail("machine_role_not_canonical");
  if (!Buffer.isBuffer(evidenceBytes)) fail("evidence_bytes_required");
  if (
    typeof expectedFileSha256 !== "string" ||
    !SHA256.test(expectedFileSha256)
  ) {
    fail("expected_file_sha256_invalid");
  }
  if (
    typeof expectedEvidenceId !== "string" ||
    !EVIDENCE_ID.test(expectedEvidenceId)
  ) {
    fail("expected_evidence_id_invalid");
  }

  const observedFileSha256 = sha256Bytes(evidenceBytes);
  if (observedFileSha256 !== expectedFileSha256) {
    fail("evidence_file_sha256_mismatch");
  }

  let evidence;
  try {
    evidence = JSON.parse(evidenceBytes.toString("utf8"));
  } catch {
    fail("evidence_json_invalid");
  }

  if (evidence?.machine_role !== role) {
    fail("evidence_machine_role_mismatch");
  }
  if (evidence?.evidence_id !== expectedEvidenceId) {
    fail("evidence_id_input_mismatch");
  }

  const verified =
    verifyVoidEconomicEpoch2ProductionValidatorDomainEvidenceRowV1({
      binding_candidate: bindingCandidate,
      raw_domain_policy: rawDomainPolicy,
      plugin_artifact_manifest: pluginArtifactManifest,
      machine_role: role,
      expected_evidence_id: expectedEvidenceId,
      evaluation_time_utc: evaluationTimeUtc,
      evidence_row: evidence,
    });

  if (
    verified.ok !== true ||
    verified.status !== "RUNTIME_ENFORCEMENT_EVIDENCE_ROW_VALID" ||
    verified.runtime_evidence_semantically_verified !== true ||
    verified.machine_role !== role ||
    verified.evidence_id !== expectedEvidenceId ||
    verified.all_production_validators_epoch_domain_enforced !== false ||
    verified.cross_epoch_replay_protection_proven !== false
  ) {
    fail("single_validator_runtime_evidence_verification_invalid");
  }

  return Object.freeze({
    marker:
      VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_EVIDENCE_IMPORT_V1,
    version: 1,
    status:
      "SINGLE_VALIDATOR_RUNTIME_EVIDENCE_IMPORTED_OVERALL_ENFORCEMENT_HOLD",
    chain_id: 2050,
    execution_epoch: 2,
    machine_role: role,
    evidence_file: canonicalEvidencePath(role),
    import_receipt_file: canonicalImportPath(role),
    evidence_file_sha256: observedFileSha256,
    evidence_id: expectedEvidenceId,
    observed_at_utc: verified.observed_at_utc,
    valid_until_utc: verified.valid_until_utc,
    import_evaluated_at_utc: evaluationTimeUtc,
    canonical_binding: Object.freeze({
      void_node_id: verified.void_node_id,
      besu_validator_address: verified.besu_validator_address,
    }),
    verification: Object.freeze({
      evidence_file_sha256_verified: true,
      evidence_id_verified: true,
      canonical_role_binding_verified: true,
      runtime_evidence_semantically_verified: true,
      evidence_fresh_at_import: true,
    }),
    gates: Object.freeze({
      this_validator_runtime_evidence_imported: true,
      this_validator_runtime_evidence_semantically_verified: true,
      all_production_validators_epoch_domain_enforced: false,
      cross_epoch_replay_protection_proven: false,
      migration_authorized: false,
      public_activation_authorized: false,
      funds_movement_authorized: false,
    }),
    authority: Object.freeze({
      source_import_only: true,
      service_action: false,
      validator_mutation: false,
      rpc_call: false,
      wallet_access: false,
      private_key_access: false,
      credential_content_access: false,
      transaction_construction: false,
      transaction_signing: false,
      transaction_submission: false,
      transaction_broadcast: false,
      authoritative_chain2050_write: false,
      token_movement: false,
      funds_movement: false,
      migration_authorized: false,
      public_activation_authorized: false,
    }),
  });
}

if (import.meta.url === new URL("file://" + path.resolve(process.argv[1])).href) {
  const role = String(arg("--machine-role") || "").toLowerCase();
  const evidencePath = path.resolve(String(arg("--evidence") || ""));
  const expectedFileSha256 = String(arg("--expected-file-sha256") || "");
  const expectedEvidenceId = String(arg("--expected-evidence-id") || "");
  const evaluationTimeUtc = String(arg("--evaluation-time-utc") || "");
  const outputPath = path.resolve(String(arg("--output") || ""));

  for (const [value, reason] of [
    [evidencePath, "evidence_path_required"],
    [outputPath, "output_path_required"],
  ]) {
    if (!value || value === path.parse(value).root) fail(reason);
  }
  if (!fs.existsSync(evidencePath)) fail("evidence_file_missing");
  if (fs.existsSync(outputPath)) fail("output_already_exists");

  const bindingCandidate = readJson(BINDING_PATH);
  const rawDomainPolicy = readJson(RAW_DOMAIN_PATH);
  const pluginArtifactManifest = readJson(PLUGIN_ARTIFACT_PATH);
  const evidenceBytes = fs.readFileSync(evidencePath);

  const receipt =
    importVoidEconomicEpoch2ProductionValidatorRuntimeEvidenceV1({
      machineRole: role,
      evidenceBytes,
      expectedFileSha256,
      expectedEvidenceId,
      evaluationTimeUtc,
      bindingCandidate,
      rawDomainPolicy,
      pluginArtifactManifest,
    });

  fs.writeFileSync(
    outputPath,
    JSON.stringify(receipt, null, 2) + "\n",
    { encoding: "utf8", mode: 0o644, flag: "wx" },
  );

  console.log(
    VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_EVIDENCE_IMPORT_V1,
  );
  console.log("status=" + receipt.status);
  console.log("machine_role=" + receipt.machine_role);
  console.log("evidence_file_sha256=" + receipt.evidence_file_sha256);
  console.log("evidence_id=" + receipt.evidence_id);
  console.log("runtime_evidence_semantically_verified=true");
  console.log("evidence_fresh_at_import=true");
  console.log("all_production_validators_epoch_domain_enforced=false");
  console.log("cross_epoch_replay_protection_proven=false");
  console.log("migration_authorized=false");
  console.log("public_activation_authorized=false");
  console.log("funds_movement_authorized=false");
  console.log("output=" + outputPath);
}
