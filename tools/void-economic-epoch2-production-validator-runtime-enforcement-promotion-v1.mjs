#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  verifyVoidEconomicEpoch2ProductionValidatorDomainEvidenceRowV1,
} from "./void-economic-epoch2-production-validator-domain-enforcement-v1.mjs";
import {
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_EVIDENCE_IMPORT_V1,
} from "./void-economic-epoch2-production-validator-runtime-evidence-import-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_ENFORCEMENT_PROMOTION_V1 =
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_ENFORCEMENT_PROMOTION_V1";

const ROLES = Object.freeze(["precision", "nimo", "xiphos"]);
const SHA256 = /^[0-9a-f]{64}$/u;
const EVIDENCE_ID = /^voide2ve1_[0-9a-f]{64}$/u;
const UTC_SECONDS = /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$/u;

function fail(reason) {
  throw new Error(reason);
}

function sha256Bytes(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function exactUtcSeconds(value) {
  return (
    typeof value === "string" &&
    UTC_SECONDS.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(Date.parse(value)).toISOString() === value.replace("Z", ".000Z")
  );
}

function currentUtcSeconds() {
  return new Date(Math.floor(Date.now() / 1000) * 1000)
    .toISOString()
    .replace(".000Z", "Z");
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

function exactImportReceipt(receipt, role) {
  if (
    !receipt ||
    receipt.marker !==
      VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_EVIDENCE_IMPORT_V1 ||
    receipt.version !== 1 ||
    receipt.status !==
      "SINGLE_VALIDATOR_RUNTIME_EVIDENCE_IMPORTED_OVERALL_ENFORCEMENT_HOLD" ||
    receipt.chain_id !== 2050 ||
    receipt.execution_epoch !== 2 ||
    receipt.machine_role !== role ||
    receipt.evidence_file !== canonicalEvidencePath(role) ||
    receipt.import_receipt_file !== canonicalImportPath(role) ||
    !SHA256.test(String(receipt.evidence_file_sha256 || "")) ||
    !EVIDENCE_ID.test(String(receipt.evidence_id || "")) ||
    receipt.verification?.evidence_file_sha256_verified !== true ||
    receipt.verification?.evidence_id_verified !== true ||
    receipt.verification?.canonical_role_binding_verified !== true ||
    receipt.verification?.runtime_evidence_semantically_verified !== true ||
    receipt.verification?.evidence_fresh_at_import !== true ||
    receipt.gates?.this_validator_runtime_evidence_imported !== true ||
    receipt.gates?.this_validator_runtime_evidence_semantically_verified !== true ||
    receipt.gates?.all_production_validators_epoch_domain_enforced !== false ||
    receipt.gates?.cross_epoch_replay_protection_proven !== false ||
    receipt.gates?.migration_authorized !== false ||
    receipt.gates?.public_activation_authorized !== false ||
    receipt.gates?.funds_movement_authorized !== false ||
    receipt.authority?.source_import_only !== true
  ) {
    fail("runtime_evidence_import_receipt_invalid:" + role);
  }

  for (const [key, value] of Object.entries(receipt.authority || {})) {
    if (key === "source_import_only") continue;
    if (value !== false) fail("runtime_evidence_import_authority_invalid:" + role);
  }
  return receipt;
}

export function promoteVoidEconomicEpoch2ProductionValidatorRuntimeEnforcementV1({
  bindingCandidate,
  rawDomainPolicy,
  pluginArtifactManifest,
  migrationCandidate,
  evidenceBytesByRole,
  importReceiptsByRole,
  promotionEvaluationTimeUtc,
}) {
  if (
    bindingCandidate?.qbft?.production_validator_count !== 3 ||
    bindingCandidate?.qbft?.required_live_node_count !== 3 ||
    bindingCandidate?.qbft?.attested_live_node_count !== 3 ||
    bindingCandidate?.qbft?.attested_identity_slots_remaining !== 0 ||
    bindingCandidate?.gates?.production_validator_set_bound !== false
  ) {
    fail("canonical_three_validator_binding_invalid");
  }
  if (
    rawDomainPolicy?.gates?.all_production_validators_epoch_domain_enforced !== false ||
    rawDomainPolicy?.gates?.cross_epoch_replay_protection_proven !== false
  ) {
    fail("raw_domain_promotion_start_state_invalid");
  }
  if (
    migrationCandidate?.replay_and_epoch_safety
      ?.all_production_validators_epoch_domain_enforced !== false ||
    migrationCandidate?.replay_and_epoch_safety
      ?.cross_epoch_replay_protection_proven !== false
  ) {
    fail("migration_promotion_start_state_invalid");
  }

  if (!exactUtcSeconds(promotionEvaluationTimeUtc)) {
    fail("promotion_evaluation_time_invalid");
  }
  const promotionEvaluationMs=Date.parse(promotionEvaluationTimeUtc);

  const verifiedRows = [];
  for (const role of ROLES) {
    const bytes = evidenceBytesByRole?.[role];
    if (!Buffer.isBuffer(bytes)) fail("runtime_evidence_bytes_missing:" + role);
    const receipt = exactImportReceipt(importReceiptsByRole?.[role], role);
    const fileSha = sha256Bytes(bytes);
    if (fileSha !== receipt.evidence_file_sha256) {
      fail("runtime_evidence_file_sha256_mismatch:" + role);
    }

    let evidence;
    try {
      evidence = JSON.parse(bytes.toString("utf8"));
    } catch {
      fail("runtime_evidence_json_invalid:" + role);
    }
    if (evidence?.evidence_id !== receipt.evidence_id) {
      fail("runtime_evidence_id_receipt_mismatch:" + role);
    }

    const verified =
      verifyVoidEconomicEpoch2ProductionValidatorDomainEvidenceRowV1({
        binding_candidate: bindingCandidate,
        raw_domain_policy: rawDomainPolicy,
        plugin_artifact_manifest: pluginArtifactManifest,
        machine_role: role,
        expected_evidence_id: receipt.evidence_id,
        evaluation_time_utc: promotionEvaluationTimeUtc,
        evidence_row: evidence,
      });

    if (
      verified.ok !== true ||
      verified.runtime_evidence_semantically_verified !== true ||
      verified.machine_role !== role ||
      verified.evidence_id !== receipt.evidence_id ||
      receipt.canonical_binding?.void_node_id !== verified.void_node_id ||
      receipt.canonical_binding?.besu_validator_address !==
        verified.besu_validator_address
    ) {
      fail("runtime_evidence_reverification_invalid:" + role);
    }

    if (
      receipt.observed_at_utc !== evidence.observed_at_utc ||
      receipt.valid_until_utc !== evidence.valid_until_utc
    ) {
      fail("runtime_evidence_import_window_mismatch:" + role);
    }

    if (!exactUtcSeconds(receipt.import_evaluated_at_utc)) {
      fail("runtime_evidence_import_time_invalid:" + role);
    }
    const observedMs=Date.parse(evidence.observed_at_utc);
    const validUntilMs=Date.parse(evidence.valid_until_utc);
    const importEvaluationMs=Date.parse(receipt.import_evaluated_at_utc);
    if (
      importEvaluationMs < observedMs ||
      importEvaluationMs > validUntilMs
    ) {
      fail("runtime_evidence_import_time_invalid:" + role);
    }
    if (promotionEvaluationMs < importEvaluationMs) {
      fail("promotion_evaluation_precedes_import:" + role);
    }

    verifiedRows.push(
      Object.freeze({
        machine_role: role,
        evidence_file: receipt.evidence_file,
        import_receipt_file: receipt.import_receipt_file,
        evidence_file_sha256: receipt.evidence_file_sha256,
        evidence_id: receipt.evidence_id,
        import_evaluated_at_utc: receipt.import_evaluated_at_utc,
        promotion_evaluated_at_utc: promotionEvaluationTimeUtc,
        void_node_id: verified.void_node_id,
        besu_validator_address: verified.besu_validator_address,
      }),
    );
  }

  if (
    new Set(verifiedRows.map((row) => row.evidence_id)).size !== ROLES.length ||
    new Set(verifiedRows.map((row) => row.besu_validator_address)).size !==
      ROLES.length
  ) {
    fail("production_validator_runtime_evidence_not_unique");
  }

  const updatedRawDomain = structuredClone(rawDomainPolicy);
  updatedRawDomain.status =
    "BESU_PRODUCTION_VALIDATOR_ENFORCEMENT_GREEN_CROSS_EPOCH_HOLD";
  updatedRawDomain.besu_validation_boundary.all_production_validators_enforce_rule =
    true;
  updatedRawDomain.gates.all_production_validators_epoch_domain_enforced = true;
  updatedRawDomain.gates.cross_epoch_replay_protection_proven = false;
  updatedRawDomain.gates.migration_authorized = false;
  updatedRawDomain.gates.public_activation_authorized = false;

  const updatedMigration = structuredClone(migrationCandidate);
  updatedMigration.replay_and_epoch_safety
    .all_production_validators_epoch_domain_enforced = true;
  updatedMigration.replay_and_epoch_safety.cross_epoch_replay_protection_proven =
    false;
  updatedMigration.replay_and_epoch_safety
    .production_validator_runtime_enforcement_evidence =
    "ops/mainnet0/economic-epoch2-production-validator-runtime-enforcement-promotion-v1.json";
  updatedMigration.launch_authority.public_activation = false;
  updatedMigration.launch_authority.money_movement = false;

  const promotion = Object.freeze({
    marker:
      VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_ENFORCEMENT_PROMOTION_V1,
    version: 1,
    status:
      "PRODUCTION_VALIDATOR_RUNTIME_ENFORCEMENT_PROMOTED_CROSS_EPOCH_HOLD",
    chain_id: 2050,
    execution_epoch: 2,
    validator_count: 3,
    promotion_evaluated_at_utc: promotionEvaluationTimeUtc,
    validators: Object.freeze(verifiedRows),
    verification: Object.freeze({
      all_three_import_receipts_verified: true,
      all_three_evidence_file_hashes_verified: true,
      all_three_evidence_ids_verified: true,
      all_three_runtime_rows_semantically_verified: true,
      all_three_runtime_rows_fresh_at_common_promotion_time: true,
      canonical_binding_reverified: true,
    }),
    gates: Object.freeze({
      upstream_runtime_evidence_semantically_verified: true,
      all_production_validators_epoch_domain_enforced: true,
      cross_epoch_replay_protection_proven: false,
      production_validator_set_bound: false,
      authoritative_chain2050_write: false,
      migration_authorized: false,
      public_activation_authorized: false,
      funds_movement_authorized: false,
    }),
    authority: Object.freeze({
      source_promotion_only: true,
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

  return Object.freeze({
    promotion,
    updated_raw_domain_policy: updatedRawDomain,
    updated_migration_candidate: updatedMigration,
  });
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, "utf8"));
}

if (import.meta.url === new URL("file://" + path.resolve(process.argv[1])).href) {
  const root = process.cwd();
  if (arg("--promotion-evaluated-at-utc") !== undefined) {
    fail("promotion_evaluation_time_override_forbidden");
  }
  const promotionEvaluationTimeUtc=currentUtcSeconds();
  const outputDir = path.resolve(String(arg("--output-dir") || ""));
  if (!outputDir || outputDir === path.parse(outputDir).root) {
    fail("output_dir_required");
  }
  if (fs.existsSync(outputDir)) fail("output_dir_already_exists");

  const bindingCandidate = readJson(
    path.join(
      root,
      "ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json",
    ),
  );
  const rawDomainPolicy = readJson(
    path.join(
      root,
      "ops/mainnet0/economic-epoch2-raw-transaction-domain-v1.json",
    ),
  );
  const pluginArtifactManifest = readJson(
    path.join(
      root,
      "ops/mainnet0/economic-epoch2-besu-raw-transaction-validator-plugin-artifact-v1.json",
    ),
  );
  const migrationCandidate = readJson(
    path.join(
      root,
      "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json",
    ),
  );

  const evidenceBytesByRole = Object.create(null);
  const importReceiptsByRole = Object.create(null);
  for (const role of ROLES) {
    const evidencePath = path.resolve(String(arg("--" + role + "-evidence") || ""));
    const importPath = path.resolve(String(arg("--" + role + "-import") || ""));
    if (!fs.existsSync(evidencePath)) fail("evidence_file_missing:" + role);
    if (!fs.existsSync(importPath)) fail("import_receipt_missing:" + role);
    evidenceBytesByRole[role] = fs.readFileSync(evidencePath);
    importReceiptsByRole[role] = readJson(importPath);
  }

  const result =
    promoteVoidEconomicEpoch2ProductionValidatorRuntimeEnforcementV1({
      bindingCandidate,
      rawDomainPolicy,
      pluginArtifactManifest,
      migrationCandidate,
      evidenceBytesByRole,
      importReceiptsByRole,
      promotionEvaluationTimeUtc,
    });

  fs.mkdirSync(outputDir, { recursive: false });
  const outputs = [
    [
      "economic-epoch2-production-validator-runtime-enforcement-promotion-v1.json",
      result.promotion,
    ],
    ["economic-epoch2-raw-transaction-domain-v1.json", result.updated_raw_domain_policy],
    [
      "economic-evm-successor-migration-candidate-v1.json",
      result.updated_migration_candidate,
    ],
  ];
  for (const [name, value] of outputs) {
    fs.writeFileSync(
      path.join(outputDir, name),
      JSON.stringify(value, null, 2) + "\n",
      { encoding: "utf8", mode: 0o644, flag: "wx" },
    );
  }

  console.log(
    VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_ENFORCEMENT_PROMOTION_V1,
  );
  console.log("status=" + result.promotion.status);
  console.log("validator_count=3");
  console.log(
    "promotion_evaluated_at_utc=" +
      result.promotion.promotion_evaluated_at_utc,
  );
  console.log("upstream_runtime_evidence_semantically_verified=true");
  console.log(
    "all_three_runtime_rows_fresh_at_common_promotion_time=true",
  );
  console.log("all_production_validators_epoch_domain_enforced=true");
  console.log("cross_epoch_replay_protection_proven=false");
  console.log("production_validator_set_bound=false");
  console.log("authoritative_chain2050_write=false");
  console.log("migration_authorized=false");
  console.log("public_activation_authorized=false");
  console.log("funds_movement_authorized=false");
  console.log("output_dir=" + outputDir);
}
