#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROOF_MARKER = "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_CREDENTIAL_REFERENCE_METADATA_V1";
const SCHEMA_MARKER = "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_CREDENTIAL_REFERENCE_METADATA_SCHEMA_V1";
const SCHEMA_ID = "https://void.network/schemas/authenticated-paid-work-production-activation-credential-reference-metadata-v1.schema.json";

const METADATA_RELATIVE_PATH =
  "config/activation-candidates/authenticated-paid-work-production-activation-credential-reference-metadata-v1.json";
const SCHEMA_RELATIVE_PATH =
  "schemas/authenticated-paid-work-production-activation-credential-reference-metadata-v1.schema.json";
const ACTIVATION_SOURCE_RELATIVE_PATH =
  "scripts/external_agent_paid_work_authenticated_submission_activation_prerequisite_v1.ts";
const ACTIVATION_SCHEMA_RELATIVE_PATH =
  "schemas/external-agent-paid-work-authenticated-submission-activation-prerequisite-v1.schema.json";
const REGISTRY_SOURCE_RELATIVE_PATH =
  "scripts/agent_paid_work_credential_registry_v1.ts";
const REGISTRY_SCHEMA_RELATIVE_PATH =
  "schemas/agent-paid-work-credential-registry-v1.schema.json";
const RECEIVER_SOURCE_RELATIVE_PATH =
  "scripts/agent_paid_work_submission_receiver_v1.ts";
const REGISTRY_DOC_RELATIVE_PATH =
  "docs/operators/agent-paid-work-credential-registry-v1.md";
const SERVICE_UNIT_ARTIFACT_RELATIVE_PATH =
  "ops/mainnet0/authenticated-paid-work-production-activation-service-unit-design-v1.json";
const SERVICE_UNIT_PROOF_RELATIVE_PATH =
  "scripts/prove_authenticated_paid_work_production_activation_service_unit_design_v1.mjs";

const EXPECTED_METADATA_SHA256 = "eac53cc5a7fd9cbb48271a86c475866cf720f6600f3c9342f2f142ee95d5d89c";
const EXPECTED_REGISTRY_ID = "voidapwcr1_89002fa57d804ced69cc48e832496c131ba460c67fdac34f9664921cc1b01415";
const EXPECTED_REGISTRY_SHA256 = "e2d6a292ef506f9fd4616b36feb9767929a184f6e35e18e3ff1378ec5983d852";
const EXPECTED_CREDENTIAL_ID = "voidapwc1_4930d236de11a88f7d856c6b6396bc5139095ef9eaa5aabdc6490a041903a426";
const EXPECTED_AGENT_ID = "void-external-agent-e2e-fulfillment-canary-agent-v1";
const EXPECTED_SOURCE_LOCATOR_SHA256 = "b5a7679f1189583f4cccc01ac58c5ca1de8334b86870639df2faf58626306f16";
const EXPECTED_LIFECYCLE_RECEIPT_SHA256 = "5cdcff499a6dbbbe3ac3f897d1625812177f42f341d5d56fa4d186f93d151e11";
const EXPECTED_SCOPE = "agent_paid_work_submit";
const EXPECTED_NOT_BEFORE_UTC = "2026-08-01T17:11:15Z";
const EXPECTED_EXPIRES_AT_UTC = "2026-08-02T17:11:15Z";
const EXPECTED_SERVICE_UNIT_ARTIFACT_SHA256 = "f37bcf3931579e13a76e7ab2d03e9d961260fa0e9ec95ca4507bd06e3df38b07";
const EXPECTED_SERVICE_UNIT_MARKER = "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_SERVICE_UNIT_DESIGN_V1";

const KNOWN_SATISFIED_REQUIREMENTS = Object.freeze([
  "activation_configuration_schema",
  "activation_configuration_instance",
  "rollback_plan",
  "trusted_context_reference_metadata",
  "service_unit_design",
  "credential_reference_metadata",
]);

const REMAINING_REQUIREMENTS = Object.freeze([
  "bounded_replay_snapshot",
  "activation_execution_confirmation",
  "live_canary_scope",
]);

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const repoPath = (relativePath) => path.join(repoRoot, relativePath);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const isRecord = (value) =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

function exactKeys(value, expected, label) {
  assert.ok(isRecord(value), `${label} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), `${label} keys`);
}

function validateExactSchema(definition, value, label = "value") {
  if (Object.hasOwn(definition, "const")) {
    assert.deepEqual(value, definition.const, `${label} const mismatch`);
    return;
  }
  if (definition.type === "object") {
    assert.ok(isRecord(value), `${label} must be an object`);
    for (const key of definition.required ?? []) {
      assert.ok(Object.hasOwn(value, key), `${label}.${key} is required`);
    }
    if (definition.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        assert.ok(
          Object.hasOwn(definition.properties ?? {}, key),
          `${label}.${key} is forbidden`,
        );
      }
    }
    for (const [key, child] of Object.entries(definition.properties ?? {})) {
      if (Object.hasOwn(value, key)) {
        validateExactSchema(child, value[key], `${label}.${key}`);
      }
    }
  }
}

function collectStringValues(value, output = []) {
  if (typeof value === "string") output.push(value);
  else if (Array.isArray(value)) {
    for (const item of value) collectStringValues(item, output);
  } else if (isRecord(value)) {
    for (const child of Object.values(value)) collectStringValues(child, output);
  }
  return output;
}

const metadataBytes = readFileSync(repoPath(METADATA_RELATIVE_PATH));
const metadataText = metadataBytes.toString("utf8");
const metadata = JSON.parse(metadataText);
const schema = JSON.parse(readFileSync(repoPath(SCHEMA_RELATIVE_PATH), "utf8"));
const activationSource = readFileSync(repoPath(ACTIVATION_SOURCE_RELATIVE_PATH), "utf8");
const activationSchemaText = readFileSync(repoPath(ACTIVATION_SCHEMA_RELATIVE_PATH), "utf8");
const registrySource = readFileSync(repoPath(REGISTRY_SOURCE_RELATIVE_PATH), "utf8");
const registrySchema = JSON.parse(readFileSync(repoPath(REGISTRY_SCHEMA_RELATIVE_PATH), "utf8"));
const receiverSource = readFileSync(repoPath(RECEIVER_SOURCE_RELATIVE_PATH), "utf8");
const registryDoc = readFileSync(repoPath(REGISTRY_DOC_RELATIVE_PATH), "utf8");
const serviceUnitArtifactBytes = readFileSync(repoPath(SERVICE_UNIT_ARTIFACT_RELATIVE_PATH));
const serviceUnitArtifact = JSON.parse(serviceUnitArtifactBytes.toString("utf8"));
const serviceUnitProofSource = readFileSync(repoPath(SERVICE_UNIT_PROOF_RELATIVE_PATH), "utf8");

assert.equal(sha256(metadataBytes), EXPECTED_METADATA_SHA256);
assert.equal(schema.$id, SCHEMA_ID);
assert.equal(schema.x_void_marker, SCHEMA_MARKER);
validateExactSchema(schema, metadata, "credential reference metadata");

exactKeys(metadata, [
  "$schema", "marker", "version", "status", "reference_id",
  "credential_reference", "registry_snapshot", "evidence_binding",
  "revalidation", "service_unit_design_binding", "readiness_effect", "authority",
], "credential reference metadata");

assert.equal(metadata.marker, PROOF_MARKER);
assert.equal(metadata.version, 1);
assert.equal(metadata.status, "source_reference_only_credential_read_forbidden");

const reference = metadata.credential_reference;
assert.equal(reference.mode, "credential_registry");
assert.equal(reference.reference_id, EXPECTED_CREDENTIAL_ID);
assert.equal(reference.source_locator_sha256, EXPECTED_SOURCE_LOCATOR_SHA256);
assert.equal(reference.expected_scope, EXPECTED_SCOPE);
assert.equal(reference.registry_id, EXPECTED_REGISTRY_ID);
assert.equal(reference.credential_id, EXPECTED_CREDENTIAL_ID);
assert.equal(reference.agent_id, EXPECTED_AGENT_ID);
assert.equal(reference.not_before_utc, EXPECTED_NOT_BEFORE_UTC);
assert.equal(reference.expires_at_utc, EXPECTED_EXPIRES_AT_UTC);
assert.equal(
  Date.parse(reference.expires_at_utc) - Date.parse(reference.not_before_utc),
  24 * 60 * 60 * 1000,
);

const snapshot = metadata.registry_snapshot;
assert.equal(snapshot.registry_contract_marker, "VOID_AGENT_PAID_WORK_CREDENTIAL_REGISTRY_V1");
assert.equal(snapshot.registry_contract_version, 1);
assert.equal(snapshot.registry_sha256, EXPECTED_REGISTRY_SHA256);
assert.equal(snapshot.credential_count, 6);
assert.equal(snapshot.registry_environment_variable, "VOID_AGENT_PAID_WORK_CREDENTIAL_REGISTRY_FILE");
assert.equal(snapshot.fallback_environment_variable, "VOID_AGENT_PAID_WORK_SUBMISSION_TOKEN_FILE");
assert.equal(snapshot.raw_token_embedded_in_source, false);
assert.equal(snapshot.token_digest_embedded_in_source, false);
assert.equal(snapshot.private_registry_path_disclosed_in_source, false);
assert.equal(snapshot.private_token_path_disclosed_in_source, false);

const evidence = metadata.evidence_binding;
assert.equal(evidence.credential_lifecycle_receipt_sha256, EXPECTED_LIFECYCLE_RECEIPT_SHA256);
assert.equal(evidence.source_locator_is_normalized_private_token_path_sha256, true);
assert.equal(evidence.receiver_loaded_registry_id, EXPECTED_REGISTRY_ID);
assert.equal(evidence.receiver_loaded_credential_count, 6);
assert.equal(evidence.receiver_loaded_target_registry, true);
assert.equal(evidence.live_authentication_observed, true);
assert.equal(evidence.live_http_status, 202);
for (const key of [
  "payment_execution_observed",
  "work_dispatch_observed",
  "work_credit_write_observed",
  "wallet_or_signer_access_observed",
  "fund_movement_observed",
]) {
  assert.equal(evidence[key], false, `evidence authority must remain false: ${key}`);
}

for (const [key, value] of Object.entries(metadata.revalidation)) {
  if (
    key === "credential_read_required_for_source_proof"
    || key === "credential_provider_invocation_required_for_source_proof"
    || key === "current_runtime_freshness_proven_by_source"
  ) {
    assert.equal(value, false, `source proof must keep ${key} false`);
  } else {
    assert.equal(value, true, `revalidation requirement must remain true: ${key}`);
  }
}


const serviceUnitBinding = metadata.service_unit_design_binding;
assert.equal(serviceUnitBinding.artifact_path, SERVICE_UNIT_ARTIFACT_RELATIVE_PATH);
assert.equal(serviceUnitBinding.artifact_sha256, EXPECTED_SERVICE_UNIT_ARTIFACT_SHA256);
assert.equal(serviceUnitBinding.artifact_marker, EXPECTED_SERVICE_UNIT_MARKER);
assert.equal(serviceUnitBinding.proof_path, SERVICE_UNIT_PROOF_RELATIVE_PATH);
assert.equal(serviceUnitBinding.closes_blocker, "service_unit_design");
assert.equal(serviceUnitBinding.source_design_created, true);
assert.equal(serviceUnitBinding.service_unit_file_created, false);
assert.equal(serviceUnitBinding.service_unit_installed, false);
assert.equal(serviceUnitBinding.service_started, false);
assert.equal(serviceUnitBinding.separate_activation_execution_lane_required, true);

assert.equal(sha256(serviceUnitArtifactBytes), EXPECTED_SERVICE_UNIT_ARTIFACT_SHA256);
assert.equal(serviceUnitArtifact.marker, EXPECTED_SERVICE_UNIT_MARKER);
assert.equal(serviceUnitArtifact.design_scope.closes_blocker, "service_unit_design");
assert.equal(serviceUnitArtifact.design_scope.readiness_decision_after_publication, "HOLD");
assert.equal(serviceUnitArtifact.authority.source_design_created, true);
assert.equal(serviceUnitArtifact.authority.service_unit_file_created, false);
assert.equal(serviceUnitArtifact.authority.service_unit_installed, false);
assert.equal(serviceUnitArtifact.authority.service_started, false);
assert.equal(serviceUnitArtifact.authority.separate_activation_execution_lane_required, true);
assert.ok(serviceUnitProofSource.includes(`const EXPECTED_SHA = "${EXPECTED_SERVICE_UNIT_ARTIFACT_SHA256}"`));
assert.ok(serviceUnitProofSource.includes('console.log("closes_blocker=service_unit_design")'));

assert.deepEqual(
  metadata.readiness_effect.known_satisfied_requirements,
  KNOWN_SATISFIED_REQUIREMENTS,
);
assert.deepEqual(
  metadata.readiness_effect.remaining_requirements_after_known_satisfied,
  REMAINING_REQUIREMENTS,
);
assert.equal(metadata.readiness_effect.satisfies, "credential_reference_metadata");
assert.equal(metadata.readiness_effect.parallel_service_unit_design_reconciled, true);
assert.equal(metadata.readiness_effect.decision_after_publication, "HOLD");
assert.equal(metadata.readiness_effect.activation_authorized, false);
assert.equal(metadata.readiness_effect.separate_activation_execution_lane_required, true);

assert.equal(metadata.authority.source_reference_metadata_created, true);
for (const [key, value] of Object.entries(metadata.authority)) {
  if (key !== "source_reference_metadata_created") {
    assert.equal(value, false, `authority must remain false: ${key}`);
  }
}

assert.ok(
  activationSource.includes("ExternalAgentPaidWorkCredentialReferenceMetadataV1"),
  "activation credential-reference interface drift",
);
assert.ok(
  activationSource.includes('mode: "credential_registry" | "single_token_fallback"'),
  "activation credential-reference mode drift",
);
assert.ok(activationSource.includes("source_locator_sha256"));
assert.ok(
  activationSource.includes(
    "credential-registry metadata must include registry, credential, agent, and validity window",
  ),
);
assert.ok(activationSource.includes("credential_valid_for_activation_window"));

for (const field of [
  "source_locator_sha256", "expected_scope", "registry_id", "credential_id",
  "agent_id", "not_before_utc", "expires_at_utc",
]) {
  assert.ok(activationSchemaText.includes(`"${field}"`), `activation schema drift: ${field}`);
}

assert.ok(registrySource.includes("VOID_AGENT_PAID_WORK_CREDENTIAL_REGISTRY_V1"));
assert.ok(registrySource.includes("agent_paid_work_submit"));
assert.equal(
  registrySchema.properties.credentials.items.properties.scopes.prefixItems[0].const,
  EXPECTED_SCOPE,
);
assert.ok(receiverSource.includes("VOID_AGENT_PAID_WORK_CREDENTIAL_REGISTRY_FILE"));
assert.ok(receiverSource.includes("VOID_AGENT_PAID_WORK_SUBMISSION_TOKEN_FILE"));
assert.ok(registryDoc.includes("Raw bearer tokens"));

assert.equal(metadataText.includes("/home/"), false, "private path leaked");
assert.equal(metadataText.includes('"token_sha256"'), false, "token digest leaked");
assert.equal(metadataText.includes("Bearer "), false, "bearer credential leaked");
assert.equal(metadataText.includes("Authorization:"), false, "authorization header leaked");
assert.equal(metadataText.includes("-----BEGIN"), false, "private material leaked");

const secretValuePattern =
  /(?:\/home\/|bearer\s+|-----BEGIN|mnemonic|private[_-]?key|sk-[A-Za-z0-9]|gh[opusr]_)/iu;
for (const value of collectStringValues(metadata)) {
  assert.doesNotMatch(value, secretValuePattern, "secret or private path value is forbidden");
}

console.log(`${PROOF_MARKER}_PROOF_GREEN=true`);
console.log(`metadata_path=${METADATA_RELATIVE_PATH}`);
console.log(`metadata_sha256=${EXPECTED_METADATA_SHA256}`);
console.log(`registry_id=${EXPECTED_REGISTRY_ID}`);
console.log(`registry_snapshot_sha256=${EXPECTED_REGISTRY_SHA256}`);
console.log("registry_credential_count=6");
console.log(`credential_reference_id=${EXPECTED_CREDENTIAL_ID}`);
console.log(`credential_id=${EXPECTED_CREDENTIAL_ID}`);
console.log(`agent_id=${EXPECTED_AGENT_ID}`);
console.log(`expected_scope=${EXPECTED_SCOPE}`);
console.log(`source_locator_sha256=${EXPECTED_SOURCE_LOCATOR_SHA256}`);
console.log(`observed_not_before_utc=${EXPECTED_NOT_BEFORE_UTC}`);
console.log(`observed_expires_at_utc=${EXPECTED_EXPIRES_AT_UTC}`);
console.log("observed_validity_window_seconds=86400");
console.log("schema_validation_exact=true");
console.log("activation_credential_reference_contract_exact=true");
console.log("credential_registry_contract_exact=true");
console.log("service_unit_design_contract_exact=true");
console.log(`service_unit_design_artifact_sha256=${EXPECTED_SERVICE_UNIT_ARTIFACT_SHA256}`);
console.log("service_unit_design_source_created=true");
console.log("service_unit_design_materialized=false");
console.log("parallel_service_unit_design_reconciled=true");
console.log("private_registry_path_disclosed=false");
console.log("private_token_path_disclosed=false");
console.log("raw_token_embedded=false");
console.log("token_digest_embedded=false");
console.log("private_registry_read=false");
console.log("credential_or_token_read=false");
console.log("credential_provider_invoked=false");
console.log("authorization_header_materialized=false");
console.log("source_reference_metadata_created=true");
console.log("current_runtime_freshness_proven=false");
console.log("expired_or_rotated_reference_fails_closed=true");
console.log("replacement_requires_separate_reviewed_metadata=true");
console.log("activation_authorized=false");
console.log("installed_configuration_written=false");
console.log("deployment=false");
console.log("service_restart=false");
console.log("runtime_listener_created=false");
console.log("payment_execution=false");
console.log("work_dispatch=false");
console.log("work_credit_write=false");
console.log("wallet_or_signer_access=false");
console.log("fund_movement=false");
console.log(`remaining_activation_requirements=${REMAINING_REQUIREMENTS.length}`);
console.log("separate_activation_execution_lane_required=true");
