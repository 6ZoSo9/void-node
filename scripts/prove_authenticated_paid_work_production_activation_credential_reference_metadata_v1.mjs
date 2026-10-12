#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROOF_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_CREDENTIAL_REFERENCE_METADATA_V1";
const SCHEMA_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_CREDENTIAL_REFERENCE_METADATA_SCHEMA_V1";
const SCHEMA_ID =
  "https://void.network/schemas/authenticated-paid-work-production-activation-credential-reference-metadata-v1.schema.json";

const METADATA_RELATIVE_PATH = "config/activation-candidates/authenticated-paid-work-production-activation-credential-reference-metadata-v1.json";
const DOC_RELATIVE_PATH = "docs/operations/authenticated-paid-work-production-activation-credential-reference-metadata-v1.md";
const SCHEMA_RELATIVE_PATH = "schemas/authenticated-paid-work-production-activation-credential-reference-metadata-v1.schema.json";
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

const EXPECTED_METADATA_SHA256 = "ddbab84d70d7cc44a5ef030a1161a44fa41b36b6b6850281e0b17b9ffcdb4f9a";
const EXPECTED_REGISTRY_ID = "voidapwcr1_ce24175f3144131773f730d4989113b949998d79c48c3ddbd9752390122aac4f";
const EXPECTED_REGISTRY_SHA256 = "92e3149e560f7fa159d8fb5c59cd680cb6547a8a8f8010036bc02c4aa8d6e00e";
const EXPECTED_CREDENTIAL_COUNT = 9;
const EXPECTED_CREDENTIAL_ID = "voidapwc1_13005c1ccf30c2fa0112eeb8801e5cd0186f3fc228fc4a41dda2f73ffed339f1";
const EXPECTED_ADDITIONAL_CREDENTIAL_ID =
  "voidapwc1_1c0f4b2e47c6943bcf3bd1570b9650a332315639877dda2024550fffc9ec2dc3";
const EXPECTED_REQUESTER_CREDENTIAL_ID =
  "voidapwc1_3e4068bf267d3e1625f87a27b0ef97a6c96ce5f279614f0f76c80961c65cd6dc";
const EXPECTED_AGENT_ID =
  "void-external-agent-e2e-fulfillment-canary-agent-v1";
const EXPECTED_SOURCE_LOCATOR_SHA256 =
  "7e350b1c58a25d41317953fce4958eb07ca33810b6546e2021cebd110400d454";
const EXPECTED_SCOPE = "agent_paid_work_submit";
const EXPECTED_NOT_BEFORE_UTC = "2026-08-03T15:02:30Z";
const EXPECTED_EXPIRES_AT_UTC = "2026-08-05T00:00:00Z";
const EXPECTED_RECEIVER_CLASSIFICATION =
  "RECEIVER_ACTIVE_TARGET_REGISTRY";
const EXPECTED_RESTART_RECEIPT_MARKER =
  "VOID_PAID_WORK_RECEIVER_NINE_RECORD_REGISTRY_RESTART_V1";
const EXPECTED_RESTART_RECEIPT_SHA256 = "d488a4f35a32b1ba8c8a0a955ce28b095af585391ae34e87c41a7f6837e48a49";
const EXPECTED_RESTART_RECORDED_AT_UTC = "2026-08-03T23:08:43.343081Z";
const EXPECTED_MAIN_PID_BEFORE = 1128846;
const EXPECTED_MAIN_PID_AFTER = 1426443;
const EXPECTED_RECEIPT_COUNT = 27;
const EXPECTED_SUBMISSION_INDEX_COUNT = 27;

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
const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
const isRecord = (value) =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

function exactKeys(value, expected, label) {
  assert.ok(isRecord(value), `${label} must be an object`);
  assert.deepEqual(
    Object.keys(value).sort(),
    [...expected].sort(),
    `${label} keys`,
  );
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
    for (const [key, child] of Object.entries(
      definition.properties ?? {},
    )) {
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
    for (const child of Object.values(value)) {
      collectStringValues(child, output);
    }
  }
  return output;
}

const metadataBytes = readFileSync(repoPath(METADATA_RELATIVE_PATH));
const metadataText = metadataBytes.toString("utf8");
const metadata = JSON.parse(metadataText);
const docText = readFileSync(repoPath(DOC_RELATIVE_PATH), "utf8");
const schema = JSON.parse(
  readFileSync(repoPath(SCHEMA_RELATIVE_PATH), "utf8"),
);
const activationSource = readFileSync(
  repoPath(ACTIVATION_SOURCE_RELATIVE_PATH),
  "utf8",
);
const activationSchemaText = readFileSync(
  repoPath(ACTIVATION_SCHEMA_RELATIVE_PATH),
  "utf8",
);
const registrySource = readFileSync(
  repoPath(REGISTRY_SOURCE_RELATIVE_PATH),
  "utf8",
);
const registrySchema = JSON.parse(
  readFileSync(repoPath(REGISTRY_SCHEMA_RELATIVE_PATH), "utf8"),
);
const receiverSource = readFileSync(
  repoPath(RECEIVER_SOURCE_RELATIVE_PATH),
  "utf8",
);
const registryDoc = readFileSync(
  repoPath(REGISTRY_DOC_RELATIVE_PATH),
  "utf8",
);

assert.equal(sha256(metadataBytes), EXPECTED_METADATA_SHA256);
assert.equal(schema.$id, SCHEMA_ID);
assert.equal(schema.x_void_marker, SCHEMA_MARKER);
validateExactSchema(schema, metadata, "credential reference metadata");

exactKeys(metadata, [
  "$schema",
  "marker",
  "version",
  "status",
  "reference_id",
  "credential_reference",
  "registry_snapshot",
  "evidence_binding",
  "revalidation",
  "service_unit_design_binding",
  "readiness_effect",
  "authority",
], "credential reference metadata");

assert.equal(metadata.marker, PROOF_MARKER);
assert.equal(metadata.version, 1);
assert.equal(
  metadata.status,
  "source_reference_only_credential_read_forbidden",
);

const reference = metadata.credential_reference;
assert.equal(reference.mode, "credential_registry");
assert.equal(reference.reference_id, EXPECTED_CREDENTIAL_ID);
assert.equal(reference.credential_id, EXPECTED_CREDENTIAL_ID);
assert.equal(reference.registry_id, EXPECTED_REGISTRY_ID);
assert.equal(reference.agent_id, EXPECTED_AGENT_ID);
assert.equal(reference.expected_scope, EXPECTED_SCOPE);
assert.equal(
  reference.source_locator_sha256,
  EXPECTED_SOURCE_LOCATOR_SHA256,
);
assert.equal(reference.not_before_utc, EXPECTED_NOT_BEFORE_UTC);
assert.equal(reference.expires_at_utc, EXPECTED_EXPIRES_AT_UTC);

const snapshot = metadata.registry_snapshot;
assert.equal(
  snapshot.registry_contract_marker,
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REGISTRY_V1",
);
assert.equal(snapshot.registry_contract_version, 1);
assert.equal(snapshot.registry_sha256, EXPECTED_REGISTRY_SHA256);
assert.equal(snapshot.credential_count, EXPECTED_CREDENTIAL_COUNT);
assert.equal(snapshot.raw_token_embedded_in_source, false);
assert.equal(snapshot.token_digest_embedded_in_source, false);
assert.equal(snapshot.private_registry_path_disclosed_in_source, false);
assert.equal(snapshot.private_token_path_disclosed_in_source, false);

const evidence = metadata.evidence_binding;
assert.equal(
  evidence.receiver_classification,
  EXPECTED_RECEIVER_CLASSIFICATION,
);
assert.equal(
  evidence.receiver_loaded_registry_id,
  EXPECTED_REGISTRY_ID,
);
assert.equal(
  evidence.receiver_loaded_credential_count,
  EXPECTED_CREDENTIAL_COUNT,
);
assert.equal(evidence.receiver_loaded_target_registry, true);
assert.equal(evidence.receiver_restart_required, false);
assert.equal(
  evidence.receiver_configuration_revalidation_required,
  true,
);
assert.equal(evidence.receiver_health_observed, true);
assert.equal(evidence.receiver_health_http_status, 200);
assert.equal(
  evidence.receiver_restart_receipt_marker,
  EXPECTED_RESTART_RECEIPT_MARKER,
);
assert.equal(
  evidence.receiver_restart_receipt_sha256,
  EXPECTED_RESTART_RECEIPT_SHA256,
);
assert.match(
  evidence.receiver_restart_receipt_sha256,
  /^[0-9a-f]{64}$/,
);
assert.equal(
  evidence.receiver_restart_recorded_at_utc,
  EXPECTED_RESTART_RECORDED_AT_UTC,
);
assert.equal(
  evidence.receiver_main_pid_before,
  EXPECTED_MAIN_PID_BEFORE,
);
assert.equal(
  evidence.receiver_main_pid_after,
  EXPECTED_MAIN_PID_AFTER,
);
assert.equal(evidence.receiver_main_pid_changed, true);
assert.equal(
  evidence.receiver_receipt_count_before,
  EXPECTED_RECEIPT_COUNT,
);
assert.equal(
  evidence.receiver_receipt_count_after,
  EXPECTED_RECEIPT_COUNT,
);
assert.equal(
  evidence.receiver_submission_index_count_before,
  EXPECTED_SUBMISSION_INDEX_COUNT,
);
assert.equal(
  evidence.receiver_submission_index_count_after,
  EXPECTED_SUBMISSION_INDEX_COUNT,
);
assert.equal(
  evidence.reviewed_eight_record_prefix_preserved_exactly,
  true,
);
assert.equal(evidence.safe_ninth_credential_append_exact, true);
assert.equal(
  evidence.additional_installed_credential_id,
  EXPECTED_ADDITIONAL_CREDENTIAL_ID,
);
assert.equal(
  evidence.fresh_direct_requester_credential_id,
  EXPECTED_REQUESTER_CREDENTIAL_ID,
);
assert.equal(
  evidence.fresh_direct_requester_used_as_activation_credential,
  false,
);
assert.equal(evidence.live_authentication_observed, false);
assert.equal(evidence.live_http_status, null);

for (const key of [
  "payment_execution_observed",
  "work_dispatch_observed",
  "work_credit_write_observed",
  "wallet_or_signer_access_observed",
  "fund_movement_observed",
]) {
  assert.equal(evidence[key], false, `evidence authority false: ${key}`);
}

const revalidation = metadata.revalidation;
assert.equal(
  revalidation.current_runtime_freshness_proven_by_source,
  false,
);
assert.equal(revalidation.registry_snapshot_revalidation_required, true);
assert.equal(revalidation.credential_identity_revalidation_required, true);
assert.equal(revalidation.scope_revalidation_required, true);
assert.equal(revalidation.validity_window_revalidation_required, true);
assert.equal(revalidation.revocation_revalidation_required, true);
assert.equal(revalidation.expired_or_rotated_reference_fails_closed, true);
assert.equal(revalidation.replacement_requires_separate_reviewed_metadata, true);
assert.equal(revalidation.credential_read_required_for_source_proof, false);
assert.equal(
  revalidation.credential_provider_invocation_required_for_source_proof,
  false,
);

assert.deepEqual(
  metadata.readiness_effect.known_satisfied_requirements,
  KNOWN_SATISFIED_REQUIREMENTS,
);
assert.deepEqual(
  metadata.readiness_effect.remaining_requirements_after_known_satisfied,
  REMAINING_REQUIREMENTS,
);
assert.equal(
  metadata.readiness_effect.satisfies,
  "credential_reference_metadata",
);
assert.equal(metadata.readiness_effect.decision_after_publication, "HOLD");
assert.equal(metadata.readiness_effect.activation_authorized, false);
assert.equal(
  metadata.readiness_effect.separate_activation_execution_lane_required,
  true,
);

assert.equal(metadata.authority.source_reference_metadata_created, true);
for (const [key, value] of Object.entries(metadata.authority)) {
  if (key !== "source_reference_metadata_created") {
    assert.equal(value, false, `authority must remain false: ${key}`);
  }
}

assert.ok(
  activationSource.includes(
    "ExternalAgentPaidWorkCredentialReferenceMetadataV1",
  ),
);
assert.ok(activationSource.includes("source_locator_sha256"));
assert.ok(activationSource.includes("credential_valid_for_activation_window"));
for (const field of [
  "source_locator_sha256",
  "expected_scope",
  "registry_id",
  "credential_id",
  "agent_id",
  "not_before_utc",
  "expires_at_utc",
]) {
  assert.ok(
    activationSchemaText.includes(`"${field}"`),
    `activation schema drift: ${field}`,
  );
}

assert.ok(
  registrySource.includes(
    "VOID_AGENT_PAID_WORK_CREDENTIAL_REGISTRY_V1",
  ),
);
assert.ok(registrySource.includes("agent_paid_work_submit"));
assert.equal(
  registrySchema.properties.credentials.items.properties.scopes
    .prefixItems[0].const,
  EXPECTED_SCOPE,
);
assert.ok(
  receiverSource.includes(
    "VOID_AGENT_PAID_WORK_CREDENTIAL_REGISTRY_FILE",
  ),
);
assert.ok(
  receiverSource.includes(
    "VOID_AGENT_PAID_WORK_SUBMISSION_TOKEN_FILE",
  ),
);
assert.ok(registryDoc.includes("Raw bearer tokens"));

for (const required of [
  EXPECTED_REGISTRY_ID,
  EXPECTED_REGISTRY_SHA256,
  EXPECTED_CREDENTIAL_ID,
  EXPECTED_ADDITIONAL_CREDENTIAL_ID,
  EXPECTED_REQUESTER_CREDENTIAL_ID,
  EXPECTED_RECEIVER_CLASSIFICATION,
  EXPECTED_RESTART_RECEIPT_SHA256,
  "receiver restart required: false",
  "current_runtime_freshness_proven_by_source",
  "The receipt path is not published.",
]) {
  assert.ok(docText.includes(required), `operator document missing: ${required}`);
}

for (const forbidden of [
  "/home/",
  '"token_sha256"',
  "Bearer ",
  "Authorization:",
  "-----BEGIN",
]) {
  assert.equal(metadataText.includes(forbidden), false);
  assert.equal(docText.includes(forbidden), false);
}

const secretValuePattern =
  /(?:\/home\/|bearer\s+|-----BEGIN|mnemonic|private[_-]?key|sk-[A-Za-z0-9]|gh[opusr]_)/iu;
for (const value of collectStringValues(metadata)) {
  assert.doesNotMatch(
    value,
    secretValuePattern,
    "secret or private path value is forbidden",
  );
}

const nodeMajor = Number.parseInt(
  process.versions.node.split(".")[0],
  10,
);
assert.equal(
  nodeMajor,
  22,
  `proof requires Node.js 22.x, observed ${process.versions.node}`,
);

console.log(`${PROOF_MARKER}_PROOF_GREEN=true`);
console.log(`metadata_path=${METADATA_RELATIVE_PATH}`);
console.log(`metadata_sha256=${EXPECTED_METADATA_SHA256}`);
console.log(`registry_id=${EXPECTED_REGISTRY_ID}`);
console.log(`registry_snapshot_sha256=${EXPECTED_REGISTRY_SHA256}`);
console.log(`registry_credential_count=${EXPECTED_CREDENTIAL_COUNT}`);
console.log(`credential_id=${EXPECTED_CREDENTIAL_ID}`);
console.log(`receiver_classification=${EXPECTED_RECEIVER_CLASSIFICATION}`);
console.log("receiver_loaded_target_registry=true");
console.log("receiver_restart_required=false");
console.log("receiver_configuration_revalidation_required=true");
console.log("receiver_health_observed=true");
console.log("receiver_health_http_status=200");
console.log(`receiver_restart_receipt_sha256=${EXPECTED_RESTART_RECEIPT_SHA256}`);
console.log("reviewed_eight_record_prefix_preserved_exactly=true");
console.log("safe_ninth_credential_append_exact=true");
console.log(`additional_installed_credential_id=${EXPECTED_ADDITIONAL_CREDENTIAL_ID}`);
console.log(`fresh_direct_requester_credential_id=${EXPECTED_REQUESTER_CREDENTIAL_ID}`);
console.log("fresh_direct_requester_used_as_activation_credential=false");
console.log("live_authentication_observed=false");
console.log("current_runtime_freshness_proven_by_source=false");
console.log("activation_authorized=false");
console.log("credential_or_token_read=false");
console.log("service_restart=false");
console.log("payment_execution=false");
console.log("work_credit_write=false");
console.log("wallet_or_signer_access=false");
console.log("transaction_broadcast=false");
console.log("fund_movement=false");
