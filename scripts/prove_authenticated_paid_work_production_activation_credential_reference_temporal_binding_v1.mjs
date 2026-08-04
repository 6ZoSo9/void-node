#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROOF_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_CREDENTIAL_REFERENCE_TEMPORAL_BINDING_V1";
const METADATA_RELATIVE_PATH =
  "config/activation-candidates/authenticated-paid-work-production-activation-credential-reference-metadata-v1.json";
const DOC_RELATIVE_PATH =
  "docs/operations/authenticated-paid-work-production-activation-credential-reference-metadata-v1.md";
const SERVICE_ARTIFACT_RELATIVE_PATH =
  "ops/mainnet0/authenticated-paid-work-production-activation-service-unit-design-v1.json";
const SERVICE_PROOF_RELATIVE_PATH =
  "scripts/prove_authenticated_paid_work_production_activation_service_unit_design_v1.mjs";
const EXPECTED_SERVICE_ARTIFACT_SHA256 =
  "f37bcf3931579e13a76e7ab2d03e9d961260fa0e9ec95ca4507bd06e3df38b07";
const EXPECTED_SERVICE_ARTIFACT_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_SERVICE_UNIT_DESIGN_V1";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const repoPath = (relativePath) => path.join(repoRoot, relativePath);
const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");

function parseInstant(value, label) {
  assert.equal(typeof value, "string", `${label} must be a string`);
  const milliseconds = Date.parse(value);
  assert.ok(Number.isFinite(milliseconds), `${label} must parse`);
  return milliseconds;
}

const metadata = JSON.parse(
  readFileSync(repoPath(METADATA_RELATIVE_PATH), "utf8"),
);
const docText = readFileSync(repoPath(DOC_RELATIVE_PATH), "utf8");
const normalizedDocText = docText.replace(/\s+/gu, " ");
const serviceArtifactBytes = readFileSync(
  repoPath(SERVICE_ARTIFACT_RELATIVE_PATH),
);
const serviceArtifact = JSON.parse(serviceArtifactBytes.toString("utf8"));
const serviceProofText = readFileSync(
  repoPath(SERVICE_PROOF_RELATIVE_PATH),
  "utf8",
);

const serviceBinding = metadata.service_unit_design_binding;
assert.deepEqual(serviceBinding, {
  artifact_path: SERVICE_ARTIFACT_RELATIVE_PATH,
  artifact_sha256: EXPECTED_SERVICE_ARTIFACT_SHA256,
  artifact_marker: EXPECTED_SERVICE_ARTIFACT_MARKER,
  proof_path: SERVICE_PROOF_RELATIVE_PATH,
  closes_blocker: "service_unit_design",
  source_design_created: true,
  service_unit_file_created: false,
  service_unit_installed: false,
  service_started: false,
  separate_activation_execution_lane_required: true,
});
assert.equal(
  sha256(serviceArtifactBytes),
  serviceBinding.artifact_sha256,
  "metadata service-unit digest must match repository bytes",
);
assert.equal(serviceArtifact.marker, serviceBinding.artifact_marker);
assert.equal(
  serviceArtifact.design_scope.closes_blocker,
  serviceBinding.closes_blocker,
);
assert.equal(serviceArtifact.authority.source_design_created, true);
assert.equal(serviceArtifact.authority.service_unit_file_created, false);
assert.equal(serviceArtifact.authority.service_unit_installed, false);
assert.equal(serviceArtifact.authority.service_started, false);
assert.equal(
  serviceArtifact.authority.separate_activation_execution_lane_required,
  true,
);
assert.ok(
  serviceProofText.includes(
    `const EXPECTED_SHA = "${EXPECTED_SERVICE_ARTIFACT_SHA256}"`,
  ),
  "service-unit proof must bind the same artifact digest",
);
assert.ok(
  serviceProofText.includes(
    'console.log("closes_blocker=service_unit_design")',
  ),
  "service-unit proof must retain the blocker marker",
);

const reference = metadata.credential_reference;
const evidence = metadata.evidence_binding;
const restartObservedAt = parseInstant(
  evidence.receiver_restart_recorded_at_utc,
  "receiver restart observation",
);
const credentialNotBefore = parseInstant(
  reference.not_before_utc,
  "credential not-before",
);
const credentialExpires = parseInstant(
  reference.expires_at_utc,
  "credential expiry",
);
const bindingValidFrom = parseInstant(
  evidence.binding_valid_from,
  "binding valid-from",
);
const bindingValidUntil = parseInstant(
  evidence.binding_valid_until,
  "binding valid-until",
);

assert.ok(
  credentialNotBefore <= restartObservedAt &&
    restartObservedAt < credentialExpires,
  "restart observation must fall inside the selected credential window",
);
assert.ok(
  bindingValidFrom <= restartObservedAt &&
    restartObservedAt < bindingValidUntil,
  "restart observation must fall inside the Work Credit binding window",
);
assert.equal(evidence.binding_active, true);
assert.equal(evidence.receiver_loaded_target_registry, true);
assert.equal(evidence.receiver_restart_required, false);
assert.equal(evidence.live_authentication_observed, false);
assert.equal(
  metadata.revalidation.current_runtime_freshness_proven_by_source,
  false,
);
assert.equal(metadata.readiness_effect.decision_after_publication, "HOLD");
assert.equal(metadata.readiness_effect.activation_authorized, false);

for (const token of [
  "The captured receiver state proves that the nine-record registry was loaded at the evidence time. It does not make runtime state permanently fresh.",
  "current_runtime_freshness_proven_by_source",
  "selected credential validity and revocation state",
  "The readiness decision remains `HOLD`.",
]) {
  assert.ok(
    normalizedDocText.includes(token),
    `operator document missing: ${token}`,
  );
}

const nodeMajor = Number.parseInt(process.versions.node.split(".")[0], 10);
assert.equal(
  nodeMajor,
  22,
  `proof requires Node.js 22.x, observed ${process.versions.node}`,
);

console.log(`${PROOF_MARKER}_PROOF_GREEN=true`);
console.log(`service_artifact_sha256=${EXPECTED_SERVICE_ARTIFACT_SHA256}`);
console.log("service_unit_binding_repository_bytes_exact=true");
console.log("restart_observation_within_credential_window=true");
console.log("restart_observation_within_wc_binding_window=true");
console.log("binding_active_claim_is_point_in_time=true");
console.log("current_credential_validity_proven_by_source=false");
console.log("current_runtime_freshness_proven_by_source=false");
console.log("live_authentication_observed=false");
console.log("activation_authorized=false");
console.log("wall_clock_read=false");
console.log("credential_or_token_read=false");
console.log("service_restart=false");
console.log("payment_execution=false");
console.log("work_credit_write=false");
console.log("wallet_or_signer_access=false");
console.log("fund_movement=false");
