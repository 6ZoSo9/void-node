#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROOF_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_TRUSTED_CONTEXT_REFERENCE_METADATA_V1";
const METADATA_MARKER = PROOF_MARKER;
const SCHEMA_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_TRUSTED_CONTEXT_REFERENCE_METADATA_SCHEMA_V1";
const BUNDLE_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_V1";
const BUNDLE_PATH_ENV =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_BUNDLE_PATH";
const PROVIDER_GLOBAL =
  "__void_public_agent_service_acceptance_persistence_trusted_context_provider_v1";
const RESULT_GLOBAL =
  "__void_public_agent_service_acceptance_persistence_trusted_context_provider_binding_v1_result";
const SCHEMA_ID =
  "https://void.network/schemas/authenticated-paid-work-production-activation-trusted-context-reference-metadata-v1.schema.json";
const METADATA_RELATIVE_PATH =
  "config/activation-candidates/authenticated-paid-work-production-activation-trusted-context-reference-metadata-v1.json";
const SCHEMA_RELATIVE_PATH =
  "schemas/authenticated-paid-work-production-activation-trusted-context-reference-metadata-v1.schema.json";
const PROVIDER_SOURCE_RELATIVE_PATH =
  "src/http/public_agent_service_acceptance_persistence_trusted_context_provider_binding_v1.ts";
const PROVIDER_SCHEMA_RELATIVE_PATH =
  "schemas/public-agent-service-acceptance-persistence-trusted-context-provider-binding-v1.schema.json";
const EXPECTED_METADATA_SHA256 =
  "49a84ccd443eab216f38bc926838272fb82999c0530bd76cb3cb259deac5259a";
const EXPECTED_BUNDLE_SHA256 =
  "6bf506fa7637fca967a21dd70ba8be7e940194397fc6bf51077309bd7f755a96";
const EXPECTED_PATH_FINGERPRINT_SHA256 =
  "606f2f3aaec35e0534d12ff5a28ee94301b8c24f370e949ec26e75e91963456a";

const KNOWN_SATISFIED_REQUIREMENTS = Object.freeze([
  "activation_configuration_schema",
  "activation_configuration_instance",
  "rollback_plan",
  "trusted_context_reference_metadata",
]);
const REMAINING_REQUIREMENTS = Object.freeze([
  "credential_reference_metadata",
  "bounded_replay_snapshot",
  "service_unit_design",
  "activation_execution_confirmation",
  "live_canary_scope",
]);

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const metadataPath = path.join(repoRoot, METADATA_RELATIVE_PATH);
const schemaPath = path.join(repoRoot, SCHEMA_RELATIVE_PATH);
const providerSourcePath = path.join(repoRoot, PROVIDER_SOURCE_RELATIVE_PATH);
const providerSchemaPath = path.join(repoRoot, PROVIDER_SCHEMA_RELATIVE_PATH);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

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
  if (typeof value === "string") {
    output.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectStringValues(item, output);
  } else if (isRecord(value)) {
    for (const child of Object.values(value)) collectStringValues(child, output);
  }
  return output;
}

const metadataBytes = readFileSync(metadataPath);
const metadataText = metadataBytes.toString("utf8");
const metadata = JSON.parse(metadataText);
const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
const providerSource = readFileSync(providerSourcePath, "utf8");
const providerSchema = JSON.parse(readFileSync(providerSchemaPath, "utf8"));

assert.equal(sha256(metadataBytes), EXPECTED_METADATA_SHA256);
assert.equal(schema.$id, SCHEMA_ID);
assert.equal(schema.x_void_marker, SCHEMA_MARKER);
validateExactSchema(schema, metadata, "trusted-context reference metadata");

exactKeys(
  metadata,
  [
    "$schema",
    "marker",
    "version",
    "status",
    "reference_id",
    "trusted_context_reference",
    "provider_binding_contract",
    "readiness_effect",
    "authority",
  ],
  "trusted-context reference metadata",
);
assert.equal(metadata.marker, METADATA_MARKER);
assert.equal(metadata.version, 1);
assert.equal(metadata.status, "source_reference_only_activation_forbidden");

const reference = metadata.trusted_context_reference;
assert.equal(reference.bundle_contract_marker, BUNDLE_MARKER);
assert.equal(reference.bundle_contract_version, 1);
assert.equal(reference.bundle_sha256, EXPECTED_BUNDLE_SHA256);
assert.equal(
  reference.bundle_path_fingerprint_sha256,
  EXPECTED_PATH_FINGERPRINT_SHA256,
);
assert.equal(reference.bundle_path_environment_variable, BUNDLE_PATH_ENV);
assert.equal(reference.bundle_path_disclosed_in_source, false);
assert.equal(reference.bundle_contents_embedded_in_source, false);
assert.equal(reference.bundle_read_required_for_source_proof, false);
assert.equal(reference.maximum_bundle_bytes, 24 * 1024 * 1024);

const binding = metadata.provider_binding_contract;
assert.equal(binding.implementation_path, PROVIDER_SOURCE_RELATIVE_PATH);
assert.equal(binding.schema_path, PROVIDER_SCHEMA_RELATIVE_PATH);
assert.equal(binding.provider_global, PROVIDER_GLOBAL);
assert.equal(binding.result_global, RESULT_GLOBAL);
assert.equal(binding.absolute_normalized_path_required, true);
assert.equal(binding.regular_file_required, true);
assert.equal(binding.symlink_components_forbidden, true);
assert.equal(binding.group_or_other_write_forbidden, true);
assert.equal(binding.owner_must_be_runtime_user_or_root, true);
assert.equal(binding.bundle_read_during_install, false);
assert.equal(binding.bundle_read_deferred_until_provider_invocation, true);
assert.equal(binding.provider_global_replace_allowed, false);

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
  "trusted_context_reference_metadata",
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

assert.equal(metadataText.includes("/home/"), false, "private bundle path leaked");
assert.equal(Object.hasOwn(metadata, "catalog"), false);
assert.equal(Object.hasOwn(metadata, "work_order"), false);
assert.equal(Object.hasOwn(metadata, "quote"), false);
const secretValuePattern =
  /(?:bearer\s|authorization:|-----BEGIN|mnemonic|private[_-]?key|api[_-]?key|access[_-]?token)/iu;
for (const value of collectStringValues(metadata)) {
  assert.doesNotMatch(value, secretValuePattern, "secret material is forbidden");
}

assert.ok(providerSource.includes(BUNDLE_MARKER), "provider bundle marker drift");
assert.ok(providerSource.includes(BUNDLE_PATH_ENV), "provider environment drift");
assert.ok(providerSource.includes(PROVIDER_GLOBAL), "provider global drift");
assert.ok(providerSource.includes(RESULT_GLOBAL), "provider result global drift");
assert.ok(
  providerSource.includes("const MAX_BUNDLE_BYTES = 24 * 1024 * 1024"),
  "provider maximum bundle size drift",
);
assert.ok(
  providerSource.includes("sha256Text(config.bundle_path)"),
  "provider path fingerprint behavior drift",
);
assert.ok(
  providerSource.includes("trusted context provider global already exists"),
  "provider non-replacement guard drift",
);

assert.equal(
  providerSchema.properties.bundle_contract.properties.marker.const,
  BUNDLE_MARKER,
);
assert.equal(
  providerSchema.properties.bundle_contract.properties.maximum_bytes.const,
  24 * 1024 * 1024,
);
assert.equal(
  providerSchema.properties.runtime_binding.properties.provider_global.const,
  PROVIDER_GLOBAL,
);
assert.equal(
  providerSchema.properties.runtime_binding.properties.result_global.const,
  RESULT_GLOBAL,
);
assert.equal(
  providerSchema.properties.runtime_binding.properties.bundle_read_during_install.const,
  false,
);
assert.equal(
  providerSchema.properties.runtime_binding.properties.bundle_read_deferred_until_provider_invocation.const,
  true,
);
assert.equal(
  providerSchema.properties.runtime_binding.properties.provider_global_replace_allowed.const,
  false,
);

console.log(`${PROOF_MARKER}_PROOF_GREEN=true`);
console.log(`metadata_path=${METADATA_RELATIVE_PATH}`);
console.log(`metadata_sha256=${EXPECTED_METADATA_SHA256}`);
console.log(`bundle_sha256=${EXPECTED_BUNDLE_SHA256}`);
console.log(`bundle_path_fingerprint_sha256=${EXPECTED_PATH_FINGERPRINT_SHA256}`);
console.log("schema_validation_exact=true");
console.log("provider_binding_contract_exact=true");
console.log("private_bundle_path_disclosed=false");
console.log("trusted_context_bundle_read=false");
console.log("trusted_context_bundle_copied=false");
console.log("credential_or_token_read=false");
console.log("authorization_header_materialized=false");
console.log("source_reference_metadata_created=true");
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
