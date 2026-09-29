#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import {
  importVoidEconomicEpoch2ProductionValidatorRuntimeEvidenceV1,
} from "./void-economic-epoch2-production-validator-runtime-evidence-import-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_PUBLICATION_V1 =
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_PUBLICATION_V1";

const BINDING_PATH =
  "ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json";
const RAW_DOMAIN_PATH =
  "ops/mainnet0/economic-epoch2-raw-transaction-domain-v1.json";
const PLUGIN_ARTIFACT_PATH =
  "ops/mainnet0/economic-epoch2-besu-raw-transaction-validator-plugin-artifact-v1.json";
const ROLES = new Set(["precision", "nimo", "xiphos"]);

function fail(reason) {
  throw new Error(reason);
}

function canonicalEvidencePath(role) {
  return (
    "ops/mainnet0/economic-epoch2-production-validator-runtime-evidence-" +
    role +
    "-v1.json"
  );
}

function canonicalImportPath(role) {
  return (
    "ops/mainnet0/economic-epoch2-production-validator-runtime-evidence-" +
    role +
    "-import-v1.json"
  );
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return (
      "{" +
      keys
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
        .join(",") +
      "}"
    );
  }
  fail("canonical_value_invalid");
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, "utf8"));
}

export function verifyVoidEconomicEpoch2ProductionValidatorRuntimePublicationV1({
  machineRole,
  evidenceBytes,
  importReceipt,
  bindingCandidate,
  rawDomainPolicy,
  pluginArtifactManifest,
}) {
  const role = String(machineRole || "").toLowerCase();
  if (!ROLES.has(role)) fail("machine_role_not_canonical");
  if (!Buffer.isBuffer(evidenceBytes)) fail("evidence_bytes_required");
  if (!importReceipt || typeof importReceipt !== "object" || Array.isArray(importReceipt)) {
    fail("import_receipt_required");
  }

  if (
    importReceipt.machine_role !== role ||
    importReceipt.evidence_file !== canonicalEvidencePath(role) ||
    importReceipt.import_receipt_file !== canonicalImportPath(role)
  ) {
    fail("canonical_publication_path_or_role_mismatch");
  }

  const reconstructed =
    importVoidEconomicEpoch2ProductionValidatorRuntimeEvidenceV1({
      machineRole: role,
      evidenceBytes,
      expectedFileSha256: importReceipt.evidence_file_sha256,
      expectedEvidenceId: importReceipt.evidence_id,
      evaluationTimeUtc: importReceipt.import_evaluated_at_utc,
      bindingCandidate,
      rawDomainPolicy,
      pluginArtifactManifest,
    });

  if (canonicalJson(reconstructed) !== canonicalJson(importReceipt)) {
    fail("import_receipt_reconstruction_mismatch");
  }

  if (
    reconstructed.verification?.runtime_evidence_semantically_verified !== true ||
    reconstructed.verification?.evidence_fresh_at_import !== true ||
    reconstructed.gates?.this_validator_runtime_evidence_imported !== true ||
    reconstructed.gates?.this_validator_runtime_evidence_semantically_verified !== true ||
    reconstructed.gates?.all_production_validators_epoch_domain_enforced !== false ||
    reconstructed.gates?.cross_epoch_replay_protection_proven !== false ||
    reconstructed.gates?.migration_authorized !== false ||
    reconstructed.gates?.public_activation_authorized !== false ||
    reconstructed.gates?.funds_movement_authorized !== false ||
    reconstructed.authority?.source_import_only !== true
  ) {
    fail("publication_gate_or_authority_mismatch");
  }

  for (const [key, value] of Object.entries(reconstructed.authority || {})) {
    if (key === "source_import_only") continue;
    if (value !== false) fail("publication_authority_must_remain_false:" + key);
  }

  return Object.freeze({
    marker:
      VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_PUBLICATION_V1,
    version: 1,
    status: "CANONICAL_SINGLE_VALIDATOR_RUNTIME_PUBLICATION_VALID",
    machine_role: role,
    evidence_file: reconstructed.evidence_file,
    import_receipt_file: reconstructed.import_receipt_file,
    evidence_file_sha256: reconstructed.evidence_file_sha256,
    evidence_id: reconstructed.evidence_id,
    runtime_evidence_semantically_verified: true,
    evidence_fresh_at_import: true,
    all_production_validators_epoch_domain_enforced: false,
    cross_epoch_replay_protection_proven: false,
    migration_authorized: false,
    public_activation_authorized: false,
    funds_movement_authorized: false,
  });
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

if (import.meta.url === new URL("file://" + path.resolve(process.argv[1])).href) {
  const role = String(arg("--machine-role") || "").toLowerCase();
  const evidencePath = path.resolve(String(arg("--evidence") || ""));
  const importPath = path.resolve(String(arg("--import") || ""));

  if (!fs.existsSync(evidencePath)) fail("evidence_file_missing");
  if (!fs.existsSync(importPath)) fail("import_receipt_missing");

  const result =
    verifyVoidEconomicEpoch2ProductionValidatorRuntimePublicationV1({
      machineRole: role,
      evidenceBytes: fs.readFileSync(evidencePath),
      importReceipt: readJson(importPath),
      bindingCandidate: readJson(BINDING_PATH),
      rawDomainPolicy: readJson(RAW_DOMAIN_PATH),
      pluginArtifactManifest: readJson(PLUGIN_ARTIFACT_PATH),
    });

  console.log(VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_PUBLICATION_V1);
  console.log("status=" + result.status);
  console.log("machine_role=" + result.machine_role);
  console.log("evidence_file_sha256=" + result.evidence_file_sha256);
  console.log("evidence_id=" + result.evidence_id);
  console.log("runtime_evidence_semantically_verified=true");
  console.log("evidence_fresh_at_import=true");
  console.log("all_production_validators_epoch_domain_enforced=false");
  console.log("cross_epoch_replay_protection_proven=false");
  console.log("migration_authorized=false");
  console.log("public_activation_authorized=false");
  console.log("funds_movement_authorized=false");
}
