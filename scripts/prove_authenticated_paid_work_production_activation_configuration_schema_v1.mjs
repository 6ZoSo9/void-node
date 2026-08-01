#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCHEMA_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_CONFIGURATION_SCHEMA_V1";
const RUNTIME_CONFIG_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_ACTIVATION_PERSISTENCE_RUNTIME_CONFIG_V1";
const PERSISTENCE_CONFIG_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_ACTIVATION_PERSISTENCE_CONFIG_V1";
const GATE_ID =
  "void.authenticated-paid-work.disabled-runtime.activation-prerequisites.v1";

const PRODUCTION_BINDINGS = Object.freeze({
  release_id: "paid-work-runtime-disabled-v1-3b298bc1e313-64841279f90d",
  packet_id:
    "voidapwrdp1_64841279f90db042c455ed8bdd3e865cb9a791b224bffc309acae11696bc9784",
  packet_commit: "eaa41fdf76044c88eb9c078046bd370acb3ee457",
  runtime_source_commit: "3b298bc1e31365aec7a20d03c3f425e22fd2f949",
  runtime_source_sha256:
    "3248f5720121d699e5ea4fe34554f7c0ee75ae1f751a8ade7f0a93e3ce72f1b7",
  prerequisite_merge_commit: "25db3a0b0ff802914ef40bacabcbbda3779866cd",
  evidence_composition_merge_commit:
    "a7fa57062f96995f222550ab6838b8bbea2e274f",
  readiness_decision_merge_commit:
    "8ce112d6b0eb594bf0e0e1715e4217a7e1379753",
});

const REMAINING_REQUIREMENTS = Object.freeze([
  "activation_configuration_instance",
  "trusted_context_reference_metadata",
  "credential_reference_metadata",
  "bounded_replay_snapshot",
  "service_unit_design",
  "rollback_plan",
  "activation_execution_confirmation",
  "live_canary_scope",
]);

const schemaPath = fileURLToPath(new URL(
  "../schemas/authenticated-paid-work-production-activation-configuration-v1.schema.json",
  import.meta.url,
));
const schemaBytes = readFileSync(schemaPath, "utf8");
const schema = JSON.parse(schemaBytes);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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
    const required = current.required ?? [];
    for (const key of required) {
      assert.ok(Object.hasOwn(value, key), `${label}.${key} is required`);
    }
    if (current.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        assert.ok(Object.hasOwn(current.properties ?? {}, key), `${label}.${key} is forbidden`);
      }
    }
    for (const [key, child] of Object.entries(current.properties ?? {})) {
      if (Object.hasOwn(value, key)) validateSubset(root, child, value[key], `${label}.${key}`);
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

assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
assert.equal(
  schema.$id,
  "https://void.network/schemas/authenticated-paid-work-production-activation-configuration-v1.schema.json",
);
assert.equal(schema.x_void_marker, SCHEMA_MARKER);
assert.equal(schema.x_void_prerequisite_gate_id, GATE_ID);
assert.equal(schema.type, "object");
assert.equal(schema.additionalProperties, false);
assert.deepEqual(
  schema.required,
  ["marker", "version", "enabled", "persistence_config"],
);
exactKeys(
  schema.properties,
  ["marker", "version", "enabled", "persistence_config"],
  "runtime configuration properties",
);
assert.equal(schema.properties.marker.const, RUNTIME_CONFIG_MARKER);
assert.equal(schema.properties.version.const, 1);
assert.equal(schema.properties.enabled.const, true);

const persistence = schema.$defs.persistenceConfig;
assert.equal(persistence.additionalProperties, false);
assert.deepEqual(persistence.required, [
  "marker",
  "version",
  "enabled",
  "allowed_root",
  "max_pointer_bytes",
  "max_generation_file_bytes",
  "max_generation_count",
  "recover_exact_orphaned_generation",
]);
exactKeys(persistence.properties, persistence.required, "persistence properties");
assert.equal(persistence.properties.marker.const, PERSISTENCE_CONFIG_MARKER);
assert.equal(persistence.properties.version.const, 1);
assert.equal(persistence.properties.enabled.const, true);
assert.equal(persistence.properties.max_pointer_bytes.minimum, 512);
assert.equal(persistence.properties.max_pointer_bytes.maximum, 1_048_576);
assert.equal(persistence.properties.max_generation_file_bytes.minimum, 1_024);
assert.equal(persistence.properties.max_generation_file_bytes.maximum, 33_554_432);
assert.equal(persistence.properties.max_generation_count.minimum, 1);
assert.equal(persistence.properties.max_generation_count.maximum, 1_000_000);
assert.equal(persistence.properties.recover_exact_orphaned_generation.const, true);

assert.deepEqual(schema.x_void_production_bindings, PRODUCTION_BINDINGS);
assert.equal(schema.x_void_readiness_effect.satisfies, "activation_configuration_schema");
assert.deepEqual(
  schema.x_void_readiness_effect.remaining_requirements,
  REMAINING_REQUIREMENTS,
);
assert.equal(schema.x_void_readiness_effect.remaining_requirements.length, 8);

const authority = schema.x_void_authority;
assert.equal(authority.schema_only, true);
assert.equal(authority.separate_activation_execution_lane_required, true);
for (const [key, value] of Object.entries(authority)) {
  if (!["schema_only", "separate_activation_execution_lane_required"].includes(key)) {
    assert.equal(value, false, `schema authority widened: ${key}`);
  }
}

const validConfiguration = {
  marker: RUNTIME_CONFIG_MARKER,
  version: 1,
  enabled: true,
  persistence_config: {
    marker: PERSISTENCE_CONFIG_MARKER,
    version: 1,
    enabled: true,
    allowed_root: "/private/void/authenticated-paid-work/persistence",
    max_pointer_bytes: 65_536,
    max_generation_file_bytes: 4_194_304,
    max_generation_count: 10_000,
    recover_exact_orphaned_generation: true,
  },
};

validateSubset(schema, schema, validConfiguration, "configuration");

const mutations = [
  ["runtime marker", (value) => { value.marker = "wrong"; }],
  ["disabled", (value) => { value.enabled = false; }],
  ["null persistence", (value) => { value.persistence_config = null; }],
  ["top-level secret", (value) => { value.api_key = "forbidden"; }],
  ["nested credential", (value) => { value.persistence_config.credential = "forbidden"; }],
  ["relative root", (value) => { value.persistence_config.allowed_root = "relative/path"; }],
  ["dot segment", (value) => { value.persistence_config.allowed_root = "/private/../escape"; }],
  ["pointer below minimum", (value) => { value.persistence_config.max_pointer_bytes = 511; }],
  ["generation bytes above maximum", (value) => {
    value.persistence_config.max_generation_file_bytes = 33_554_433;
  }],
  ["generation count zero", (value) => { value.persistence_config.max_generation_count = 0; }],
  ["non-exact orphan recovery", (value) => {
    value.persistence_config.recover_exact_orphaned_generation = false;
  }],
];

for (const [label, mutate] of mutations) {
  const candidate = clone(validConfiguration);
  mutate(candidate);
  assert.throws(
    () => validateSubset(schema, schema, candidate, "configuration"),
    undefined,
    label,
  );
}

assert.equal(path.basename(schemaPath), "authenticated-paid-work-production-activation-configuration-v1.schema.json");
assert.ok(schemaBytes.endsWith("\n"), "schema must end with a newline");

console.log("VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_CONFIGURATION_SCHEMA_V1_PROOF_GREEN=true");
console.log("runtime_configuration_shape_exact=true");
console.log("production_bindings_exact=true");
console.log("enabled_configuration_required=true");
console.log("persistence_bounds_exact=true");
console.log("absolute_normalized_persistence_root_required=true");
console.log("exact_orphan_recovery_required=true");
console.log("secret_material_permitted=false");
console.log("remaining_activation_requirements=8");
console.log("configuration_instance_created=false");
console.log("activation_authorized=false");
console.log("deployment=false");
console.log("service_restart=false");
console.log("runtime_listener_created=false");
console.log("payment_execution=false");
console.log("work_dispatch=false");
console.log("work_credit_write=false");
console.log("wallet_or_signer_access=false");
console.log("fund_movement=false");
console.log("separate_activation_execution_lane_required=true");
