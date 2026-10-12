#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  requalifyVoidEconomicEpoch2ProductionValidatorRuntimeFreshnessV1,
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_FRESHNESS_REQUALIFICATION_V1,
} from "../tools/void-economic-epoch2-production-validator-runtime-freshness-requalification-v1.mjs";
import {
  voidEconomicEpoch2ProductionValidatorDomainEvidenceIdV1,
} from "../tools/void-economic-epoch2-production-validator-domain-enforcement-v1.mjs";

const roles = ["precision", "nimo", "xiphos"];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

const bindingCandidate = readJson(
  "ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json",
);
const rawDomainPolicy = readJson(
  "ops/mainnet0/economic-epoch2-raw-transaction-domain-v1.json",
);
const pluginArtifactManifest = readJson(
  "ops/mainnet0/economic-epoch2-besu-raw-transaction-validator-plugin-artifact-v1.json",
);
const committedPromotion = readJson(
  "ops/mainnet0/economic-epoch2-production-validator-runtime-enforcement-promotion-v1.json",
);

assert.equal(
  rawDomainPolicy.gates.all_production_validators_epoch_domain_enforced,
  true,
);
assert.equal(rawDomainPolicy.gates.cross_epoch_replay_protection_proven, true);
assert.equal(
  committedPromotion.gates.all_production_validators_epoch_domain_enforced,
  true,
);

const observed = {
  precision: "2030-01-01T00:00:00Z",
  nimo: "2030-01-01T00:01:00Z",
  xiphos: "2030-01-01T00:02:00Z",
};
const validUntil = "2030-01-01T01:00:00Z";
const evaluation = "2030-01-01T00:05:00Z";

const evidenceBytesByRole = Object.create(null);
const expectedFileSha256ByRole = Object.create(null);
const expectedEvidenceIdByRole = Object.create(null);

for (const role of roles) {
  const row = readJson(
    `ops/mainnet0/economic-epoch2-production-validator-runtime-evidence-${role}-v1.json`,
  );
  row.observed_at_utc = observed[role];
  row.valid_until_utc = validUntil;
  row.evidence_id = "voide2ve1_" + "0".repeat(64);
  row.evidence_id =
    voidEconomicEpoch2ProductionValidatorDomainEvidenceIdV1(row);

  const bytes = Buffer.from(JSON.stringify(row, null, 2) + "\n", "utf8");
  evidenceBytesByRole[role] = bytes;
  expectedFileSha256ByRole[role] = sha256(bytes);
  expectedEvidenceIdByRole[role] = row.evidence_id;
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
    evaluationTimeUtc: evaluation,
  });

assert.equal(
  result.marker,
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_FRESHNESS_REQUALIFICATION_V1,
);
assert.equal(
  result.status,
  "PRODUCTION_VALIDATOR_RUNTIME_FRESHNESS_REQUALIFIED_EXISTING_PROMOTION_PRESERVED",
);
assert.equal(result.chain_id, 2050);
assert.equal(result.execution_epoch, 2);
assert.equal(result.evaluation_time_utc, evaluation);
assert.equal(result.evidence_overlap.overlap_start_utc, "2030-01-01T00:02:00Z");
assert.equal(result.evidence_overlap.overlap_end_utc, validUntil);
assert.equal(result.evidence_overlap.evaluation_time_within_overlap, true);
assert.equal(result.validators.length, 3);
assert.deepEqual(
  result.validators.map((row) => row.machine_role),
  roles,
);
assert.equal(result.verification.fresh_evidence_count, 3);
assert.equal(
  result.verification.all_three_evidence_file_hashes_verified,
  true,
);
assert.equal(result.verification.all_three_evidence_ids_verified, true);
assert.equal(
  result.verification.all_three_runtime_rows_semantically_verified,
  true,
);
assert.equal(result.verification.canonical_binding_reverified, true);
assert.equal(result.verification.existing_validator_promotion_verified, true);
assert.equal(result.verification.existing_validator_gate_preserved, true);
assert.equal(
  result.verification.existing_cross_epoch_replay_value_preserved,
  true,
);
assert.equal(
  result.gates.all_production_validators_epoch_domain_enforced_requalified,
  true,
);
assert.equal(result.gates.validator_runtime_fresh_at_evaluation_time, true);
assert.equal(result.gates.cross_epoch_replay_protection_requalified, false);
assert.equal(result.gates.migration_authorized, false);
assert.equal(result.gates.public_activation_authorized, false);
assert.equal(result.gates.funds_movement_authorized, false);
assert.equal(result.authority.source_verification_only, true);
for (const [key, value] of Object.entries(result.authority)) {
  if (key === "source_verification_only") continue;
  assert.equal(value, false, key);
}

assert.equal(
  rawDomainPolicy.gates.all_production_validators_epoch_domain_enforced,
  true,
);
assert.equal(rawDomainPolicy.gates.cross_epoch_replay_protection_proven, true);
assert.equal(
  committedPromotion.gates.all_production_validators_epoch_domain_enforced,
  true,
);

assert.throws(
  () =>
    requalifyVoidEconomicEpoch2ProductionValidatorRuntimeFreshnessV1({
      bindingCandidate,
      rawDomainPolicy,
      pluginArtifactManifest,
      committedPromotion,
      evidenceBytesByRole,
      expectedFileSha256ByRole: {
        ...expectedFileSha256ByRole,
        precision: "0".repeat(64),
      },
      expectedEvidenceIdByRole,
      evaluationTimeUtc: evaluation,
    }),
  /evidence_sha256_mismatch:precision/,
);

assert.throws(
  () =>
    requalifyVoidEconomicEpoch2ProductionValidatorRuntimeFreshnessV1({
      bindingCandidate,
      rawDomainPolicy,
      pluginArtifactManifest,
      committedPromotion,
      evidenceBytesByRole,
      expectedFileSha256ByRole,
      expectedEvidenceIdByRole,
      evaluationTimeUtc: "2030-01-01T01:01:00Z",
    }),
  /evaluation_time_outside_three_validator_overlap/,
);

console.log(
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_FRESHNESS_REQUALIFICATION_V1_PROOF_GREEN",
);
console.log("fresh_evidence_count=3");
console.log("canonical_binding_reverified=true");
console.log("existing_validator_promotion_verified=true");
console.log("existing_validator_gate_preserved=true");
console.log("all_production_validators_epoch_domain_enforced_requalified=true");
console.log("cross_epoch_replay_protection_requalified=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
console.log("funds_movement_authorized=false");
