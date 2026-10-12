#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROOF_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_CONFIGURATION_INSTANCE_V1";
const SCHEMA_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_CONFIGURATION_SCHEMA_V1";
const RUNTIME_CONFIG_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_ACTIVATION_PERSISTENCE_RUNTIME_CONFIG_V1";
const PERSISTENCE_CONFIG_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_ACTIVATION_PERSISTENCE_CONFIG_V1";
const SCHEMA_ID =
  "https://void.network/schemas/authenticated-paid-work-production-activation-configuration-v1.schema.json";
const INSTANCE_RELATIVE_PATH =
  "config/activation-candidates/authenticated-paid-work-production-activation-configuration-v1.json";
const EXPECTED_INSTANCE_SHA256 =
  "abe7974246d47a4802a936e78f952d6db76d98cccfccc1ce7130309c56b3ee8f";
const EXPECTED_ALLOWED_ROOT =
  "/home/zoso/.local/share/void-authenticated-paid-work-runtime-disabled-v1/activation";
const EXPECTED_INSTALLED_CONFIG_PATH =
  "/home/zoso/.local/share/void-authenticated-paid-work-runtime-disabled-v1/enabled-config.json";

const BEFORE_REQUIREMENTS = Object.freeze([
  "activation_configuration_instance",
  "trusted_context_reference_metadata",
  "credential_reference_metadata",
  "bounded_replay_snapshot",
  "service_unit_design",
  "rollback_plan",
  "activation_execution_confirmation",
  "live_canary_scope",
]);

const AFTER_REQUIREMENTS = Object.freeze([
  "trusted_context_reference_metadata",
  "credential_reference_metadata",
  "bounded_replay_snapshot",
  "service_unit_design",
  "rollback_plan",
  "activation_execution_confirmation",
  "live_canary_scope",
]);

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const schemaPath = path.join(
  repoRoot,
  "schemas/authenticated-paid-work-production-activation-configuration-v1.schema.json",
);
const instancePath = path.join(repoRoot, INSTANCE_RELATIVE_PATH);
const runtimeSourcePath = path.join(
  repoRoot,
  "scripts/authenticated_paid_work_quote_acceptance_payment_authority_activation_persistence_runtime_binding_v1.ts",
);

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

function resolveReference(root, reference) {
  assert.match(reference, /^#\/\$defs\/[A-Za-z0-9_-]+$/u, "unsupported $ref");
  const name = reference.split("/").at(-1);
  assert.ok(root.$defs[name], `missing $defs entry: ${name}`);
  return root.$defs[name];
}

function validateSubset(root, definition, value, label = "value") {
  const current = definition.$ref
    ? resolveReference(root, definition.$ref)
    : definition;

  if (Object.hasOwn(current, "const")) {
    assert.deepEqual(value, current.const, `${label} const mismatch`);
  }

  if (current.type === "object") {
    assert.ok(isRecord(value), `${label} must be an object`);
    for (const key of current.required ?? []) {
      assert.ok(Object.hasOwn(value, key), `${label}.${key} is required`);
    }
    if (current.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        assert.ok(Object.hasOwn(current.properties ?? {}, key), `${label}.${key} is forbidden`);
      }
    }
    for (const [key, child] of Object.entries(current.properties ?? {})) {
      if (Object.hasOwn(value, key)) {
        validateSubset(root, child, value[key], `${label}.${key}`);
      }
    }
  } else if (current.type === "string") {
    assert.equal(typeof value, "string", `${label} must be a string`);
    if (current.minLength !== undefined) {
      assert.ok(value.length >= current.minLength, `${label} is too short`);
    }
    if (current.maxLength !== undefined) {
      assert.ok(value.length <= current.maxLength, `${label} is too long`);
    }
    if (current.pattern !== undefined) {
      assert.match(value, new RegExp(current.pattern, "u"), `${label} pattern`);
    }
  } else if (current.type === "integer") {
    assert.ok(Number.isSafeInteger(value), `${label} must be an integer`);
    if (current.minimum !== undefined) {
      assert.ok(value >= current.minimum, `${label} is below minimum`);
    }
    if (current.maximum !== undefined) {
      assert.ok(value <= current.maximum, `${label} is above maximum`);
    }
  } else if (current.type !== undefined) {
    assert.fail(`${label} uses unsupported schema type: ${current.type}`);
  }
}

function collectKeys(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, output);
    return output;
  }
  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      output.push(key);
      collectKeys(child, output);
    }
  }
  return output;
}

const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
const instanceBytes = readFileSync(instancePath);
const instance = JSON.parse(instanceBytes.toString("utf8"));

assert.equal(schema.$id, SCHEMA_ID);
assert.equal(schema.x_void_marker, SCHEMA_MARKER);
assert.equal(schema.x_void_readiness_effect.satisfies, "activation_configuration_schema");
assert.deepEqual(schema.x_void_readiness_effect.remaining_requirements, BEFORE_REQUIREMENTS);
assert.equal(schema.x_void_authority.configuration_instance_created, false);
assert.equal(schema.x_void_authority.activation_authorized, false);
assert.equal(schema.x_void_authority.secret_material_permitted, false);
assert.equal(schema.x_void_authority.separate_activation_execution_lane_required, true);

assert.equal(sha256(instanceBytes), EXPECTED_INSTANCE_SHA256);
validateSubset(schema, schema, instance, "activation configuration instance");

exactKeys(
  instance,
  ["marker", "version", "enabled", "persistence_config"],
  "activation configuration instance",
);
assert.equal(instance.marker, RUNTIME_CONFIG_MARKER);
assert.equal(instance.version, 1);
assert.equal(instance.enabled, true);

exactKeys(
  instance.persistence_config,
  [
    "marker",
    "version",
    "enabled",
    "allowed_root",
    "max_pointer_bytes",
    "max_generation_file_bytes",
    "max_generation_count",
    "recover_exact_orphaned_generation",
  ],
  "persistence configuration",
);
assert.equal(instance.persistence_config.marker, PERSISTENCE_CONFIG_MARKER);
assert.equal(instance.persistence_config.version, 1);
assert.equal(instance.persistence_config.enabled, true);
assert.equal(instance.persistence_config.allowed_root, EXPECTED_ALLOWED_ROOT);
assert.equal(path.isAbsolute(instance.persistence_config.allowed_root), true);
assert.equal(
  path.resolve(instance.persistence_config.allowed_root),
  instance.persistence_config.allowed_root,
  "allowed root must already be normalized",
);
assert.equal(instance.persistence_config.max_pointer_bytes, 65_536);
assert.equal(instance.persistence_config.max_generation_file_bytes, 4_194_304);
assert.equal(instance.persistence_config.max_generation_count, 10_000);
assert.equal(instance.persistence_config.recover_exact_orphaned_generation, true);

const forbiddenKey = /(?:secret|credential|token|private[_-]?key|mnemonic|authorization|wallet|signer)/iu;
for (const key of collectKeys(instance)) {
  assert.doesNotMatch(key, forbiddenKey, `secret-bearing key forbidden: ${key}`);
}

assert.equal(
  path.relative(repoRoot, instancePath).split(path.sep).join("/"),
  INSTANCE_RELATIVE_PATH,
);
assert.notEqual(instancePath, EXPECTED_INSTALLED_CONFIG_PATH);
assert.notEqual(path.basename(instancePath), path.basename(EXPECTED_INSTALLED_CONFIG_PATH));

const runtimeSource = readFileSync(runtimeSourcePath, "utf8");
assert.equal(
  runtimeSource.includes(INSTANCE_RELATIVE_PATH),
  false,
  "runtime source must not auto-load the tracked candidate path",
);
assert.equal(
  runtimeSource.includes(EXPECTED_ALLOWED_ROOT),
  false,
  "runtime source must not hard-code the candidate persistence root",
);

const afterRequirements = BEFORE_REQUIREMENTS.filter(
  (requirement) => requirement !== "activation_configuration_instance",
);
assert.deepEqual(afterRequirements, AFTER_REQUIREMENTS);

console.log(`${PROOF_MARKER}_PROOF_GREEN=true`);
console.log(`instance_path=${INSTANCE_RELATIVE_PATH}`);
console.log(`instance_sha256=${EXPECTED_INSTANCE_SHA256}`);
console.log("schema_validation_exact=true");
console.log("production_operator_path_exact=true");
console.log("persistence_bounds_exact=true");
console.log("exact_orphan_recovery_required=true");
console.log("secret_material_present=false");
console.log("source_configuration_instance_created=true");
console.log("installed_configuration_written=false");
console.log("activation_authorized=false");
console.log("deployment=false");
console.log("service_restart=false");
console.log("runtime_listener_created=false");
console.log("payment_execution=false");
console.log("work_dispatch=false");
console.log("work_credit_write=false");
console.log("wallet_or_signer_access=false");
console.log("fund_movement=false");
console.log(`remaining_activation_requirements=${AFTER_REQUIREMENTS.length}`);
console.log("separate_activation_execution_lane_required=true");
