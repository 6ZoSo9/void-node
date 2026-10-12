#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  verifyVoidEconomicEpoch2ProductionValidatorDomainEnforcementV1,
} from "./void-economic-epoch2-production-validator-domain-enforcement-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_FRESHNESS_REQUALIFICATION_V1 =
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_FRESHNESS_REQUALIFICATION_V1";

const ROLES = Object.freeze(["precision", "nimo", "xiphos"]);
const SHA256 = /^[0-9a-f]{64}$/u;
const EVIDENCE_ID = /^voide2ve1_[0-9a-f]{64}$/u;
const CANONICAL_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;

function fail(reason) {
  throw new Error(reason);
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, "utf8"));
}

function sha256Bytes(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function canonicalUtc(value, reason) {
  if (typeof value !== "string" || !CANONICAL_UTC.test(value)) fail(reason);
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) fail(reason);
  return ms;
}

function canonicalPromotionValid(promotion) {
  if (
    promotion?.marker !==
      "VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_ENFORCEMENT_PROMOTION_V1" ||
    promotion?.version !== 1 ||
    promotion?.chain_id !== 2050 ||
    promotion?.execution_epoch !== 2 ||
    promotion?.validator_count !== 3 ||
    promotion?.verification?.all_three_import_receipts_verified !== true ||
    promotion?.verification?.all_three_evidence_file_hashes_verified !== true ||
    promotion?.verification?.all_three_evidence_ids_verified !== true ||
    promotion?.verification?.all_three_runtime_rows_semantically_verified !== true ||
    promotion?.verification?.canonical_binding_reverified !== true ||
    promotion?.gates?.upstream_runtime_evidence_semantically_verified !== true ||
    promotion?.gates?.all_production_validators_epoch_domain_enforced !== true ||
    promotion?.authority?.source_promotion_only !== true
  ) {
    fail("committed_validator_promotion_invalid");
  }

  for (const [key, value] of Object.entries(promotion.authority || {})) {
    if (key === "source_promotion_only") continue;
    if (value !== false) fail("committed_validator_promotion_authority_invalid");
  }
}

function reconstructVerificationRawDomain(rawDomain) {
  if (
    rawDomain?.marker !== "VOID_ECONOMIC_EPOCH2_RAW_TRANSACTION_DOMAIN_V1" ||
    rawDomain?.version !== 1 ||
    rawDomain?.chain_id !== 2050 ||
    rawDomain?.execution_epoch !== 2 ||
    rawDomain?.gates?.all_production_validators_epoch_domain_enforced !== true ||
    rawDomain?.besu_validation_boundary?.all_production_validators_enforce_rule !== true ||
    rawDomain?.gates?.migration_authorized !== false ||
    rawDomain?.gates?.public_activation_authorized !== false
  ) {
    fail("committed_raw_domain_validator_state_invalid");
  }

  const verification = structuredClone(rawDomain);
  verification.status = "BESU_RUNTIME_VALIDATOR_GREEN_PRODUCTION_ENFORCEMENT_HOLD";
  verification.besu_validation_boundary.all_production_validators_enforce_rule = false;
  verification.gates.all_production_validators_epoch_domain_enforced = false;
  verification.gates.cross_epoch_replay_protection_proven = false;
  verification.gates.migration_authorized = false;
  verification.gates.public_activation_authorized = false;
  return verification;
}

export function requalifyVoidEconomicEpoch2ProductionValidatorRuntimeFreshnessV1({
  bindingCandidate,
  rawDomainPolicy,
  pluginArtifactManifest,
  committedPromotion,
  evidenceBytesByRole,
  expectedFileSha256ByRole,
  expectedEvidenceIdByRole,
  evaluationTimeUtc,
}) {
  canonicalPromotionValid(committedPromotion);

  const verificationRawDomain =
    reconstructVerificationRawDomain(rawDomainPolicy);

  const evaluationMs = canonicalUtc(
    evaluationTimeUtc,
    "evaluation_time_utc_invalid",
  );

  const evidenceRows = [];
  const expectedIds = [];
  const validators = [];
  let overlapStartMs = Number.NEGATIVE_INFINITY;
  let overlapEndMs = Number.POSITIVE_INFINITY;

  for (const role of ROLES) {
    const bytes = evidenceBytesByRole?.[role];
    if (!Buffer.isBuffer(bytes)) fail("evidence_bytes_missing:" + role);

    const expectedSha = String(expectedFileSha256ByRole?.[role] || "");
    const expectedId = String(expectedEvidenceIdByRole?.[role] || "");
    if (!SHA256.test(expectedSha)) fail("expected_sha256_invalid:" + role);
    if (!EVIDENCE_ID.test(expectedId)) fail("expected_evidence_id_invalid:" + role);

    const observedSha = sha256Bytes(bytes);
    if (observedSha !== expectedSha) fail("evidence_sha256_mismatch:" + role);

    let evidence;
    try {
      evidence = JSON.parse(bytes.toString("utf8"));
    } catch {
      fail("evidence_json_invalid:" + role);
    }

    if (evidence?.machine_role !== role) fail("evidence_role_mismatch:" + role);
    if (evidence?.evidence_id !== expectedId) fail("evidence_id_mismatch:" + role);

    const observedMs = canonicalUtc(
      evidence.observed_at_utc,
      "evidence_observed_at_invalid:" + role,
    );
    const validUntilMs = canonicalUtc(
      evidence.valid_until_utc,
      "evidence_valid_until_invalid:" + role,
    );
    if (validUntilMs <= observedMs) fail("evidence_window_invalid:" + role);

    overlapStartMs = Math.max(overlapStartMs, observedMs);
    overlapEndMs = Math.min(overlapEndMs, validUntilMs);

    evidenceRows.push(evidence);
    expectedIds.push(expectedId);
    validators.push({
      machine_role: role,
      evidence_file_sha256: observedSha,
      evidence_id: expectedId,
      observed_at_utc: evidence.observed_at_utc,
      valid_until_utc: evidence.valid_until_utc,
      void_node_id: evidence.void_node_id,
      besu_validator_address: evidence.besu_validator_address,
    });
  }

  if (overlapStartMs > overlapEndMs) {
    fail("three_validator_evidence_overlap_missing");
  }
  if (evaluationMs < overlapStartMs || evaluationMs > overlapEndMs) {
    fail("evaluation_time_outside_three_validator_overlap");
  }

  const verified =
    verifyVoidEconomicEpoch2ProductionValidatorDomainEnforcementV1({
      binding_candidate: bindingCandidate,
      raw_domain_policy: verificationRawDomain,
      plugin_artifact_manifest: pluginArtifactManifest,
      expected_evidence_ids: expectedIds,
      evaluation_time_utc: evaluationTimeUtc,
      validator_evidence_rows: evidenceRows,
    });

  if (
    verified.ok !== true ||
    verified.status !==
      "ENFORCEMENT_EVIDENCE_CANDIDATE_VALID_UPSTREAM_RUNTIME_UNVERIFIED" ||
    verified.required_live_node_count !== 3 ||
    verified.validator_evidence_candidate_count !== 3 ||
    verified.production_validator_enforcement_evidence_candidate_valid !== true
  ) {
    fail("fresh_validator_runtime_evidence_verification_invalid");
  }

  const promotionAddresses = new Map(
    (committedPromotion.validators || []).map((row) => [
      row.machine_role,
      String(row.besu_validator_address || "").toLowerCase(),
    ]),
  );

  for (const row of validators) {
    if (
      promotionAddresses.get(row.machine_role) !==
      String(row.besu_validator_address || "").toLowerCase()
    ) {
      fail("fresh_evidence_promotion_binding_mismatch:" + row.machine_role);
    }
  }

  return Object.freeze({
    marker:
      VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_FRESHNESS_REQUALIFICATION_V1,
    version: 1,
    status:
      "PRODUCTION_VALIDATOR_RUNTIME_FRESHNESS_REQUALIFIED_EXISTING_PROMOTION_PRESERVED",
    chain_id: 2050,
    execution_epoch: 2,
    evaluation_time_utc: evaluationTimeUtc,
    evidence_overlap: Object.freeze({
      overlap_start_utc: new Date(overlapStartMs).toISOString().replace(".000Z", "Z"),
      overlap_end_utc: new Date(overlapEndMs).toISOString().replace(".000Z", "Z"),
      evaluation_time_within_overlap: true,
    }),
    validators: Object.freeze(validators.map((row) => Object.freeze(row))),
    verification: Object.freeze({
      fresh_evidence_count: 3,
      all_three_evidence_file_hashes_verified: true,
      all_three_evidence_ids_verified: true,
      all_three_runtime_rows_semantically_verified: true,
      canonical_binding_reverified: true,
      existing_validator_promotion_verified: true,
      existing_validator_gate_preserved: true,
      existing_cross_epoch_replay_value_preserved:
        rawDomainPolicy.gates.cross_epoch_replay_protection_proven === true,
    }),
    gates: Object.freeze({
      all_production_validators_epoch_domain_enforced_requalified: true,
      validator_runtime_fresh_at_evaluation_time: true,
      cross_epoch_replay_protection_requalified: false,
      migration_authorized: false,
      public_activation_authorized: false,
      funds_movement_authorized: false,
    }),
    authority: Object.freeze({
      source_verification_only: true,
      repository_mutation: false,
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
  const root = process.cwd();
  const evaluationTimeUtc = String(arg("--evaluation-time-utc") || "");
  const outputPath = path.resolve(String(arg("--output") || ""));
  if (!outputPath || outputPath === path.parse(outputPath).root) {
    fail("output_path_required");
  }
  if (fs.existsSync(outputPath)) fail("output_already_exists");

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
  const committedPromotion = readJson(
    path.join(
      root,
      "ops/mainnet0/economic-epoch2-production-validator-runtime-enforcement-promotion-v1.json",
    ),
  );

  const evidenceBytesByRole = Object.create(null);
  const expectedFileSha256ByRole = Object.create(null);
  const expectedEvidenceIdByRole = Object.create(null);

  for (const role of ROLES) {
    const evidencePath = path.resolve(String(arg("--" + role + "-evidence") || ""));
    const expectedSha = String(arg("--" + role + "-sha256") || "");
    const expectedId = String(arg("--" + role + "-evidence-id") || "");
    if (!fs.existsSync(evidencePath)) fail("evidence_file_missing:" + role);
    evidenceBytesByRole[role] = fs.readFileSync(evidencePath);
    expectedFileSha256ByRole[role] = expectedSha;
    expectedEvidenceIdByRole[role] = expectedId;
  }

  const result =
    requalifyVoidEconomicEpoch2ProductionValidatorRuntimeFreshnessV1({
      bindingCandidate,
      rawDomainPolicy,
      pluginArtifactManifest,
      committedPromotion,
      evidenceBytesByRole,
      expectedFileSha256ByRole,
      expectedEvidenceIdByRole,
      evaluationTimeUtc,
    });

  fs.writeFileSync(
    outputPath,
    JSON.stringify(result, null, 2) + "\n",
    { encoding: "utf8", mode: 0o644, flag: "wx" },
  );

  console.log(
    VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_FRESHNESS_REQUALIFICATION_V1,
  );
  console.log("status=" + result.status);
  console.log("evaluation_time_utc=" + result.evaluation_time_utc);
  console.log("overlap_start_utc=" + result.evidence_overlap.overlap_start_utc);
  console.log("overlap_end_utc=" + result.evidence_overlap.overlap_end_utc);
  console.log("fresh_evidence_count=3");
  console.log("all_three_runtime_rows_semantically_verified=true");
  console.log("existing_validator_promotion_verified=true");
  console.log("all_production_validators_epoch_domain_enforced_requalified=true");
  console.log("cross_epoch_replay_protection_requalified=false");
  console.log("migration_authorized=false");
  console.log("public_activation_authorized=false");
  console.log("funds_movement_authorized=false");
  console.log("output=" + outputPath);
}
