#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA_PATH = path.join(
  ROOT,
  "schemas/authenticated-paid-work-runtime-disabled-production-activation-configuration-v1.schema.json",
);
const DOC_PATH = path.join(
  ROOT,
  "docs/operations/authenticated-paid-work-runtime-disabled-production-activation-configuration-schema-v1.md",
);
const WORKFLOW_PATH = path.join(
  ROOT,
  ".github/workflows/authenticated-paid-work-runtime-disabled-production-activation-configuration-schema-v1.yml",
);

const SCHEMA_ID =
  "https://void.network/schemas/authenticated-paid-work-runtime-disabled-production-activation-configuration-v1.schema.json";
const MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_CONFIGURATION_V1";
const PROOF_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_CONFIGURATION_SCHEMA_V1_PROOF_GREEN";

const schemaText = fs.readFileSync(SCHEMA_PATH, "utf8");
const schema = JSON.parse(schemaText);

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function resolveRef(root, reference) {
  assert.match(reference, /^#\//u, `unsupported schema reference: ${reference}`);
  return reference
    .slice(2)
    .split("/")
    .map((token) => token.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((value, token) => value?.[token], root);
}

function typeMatches(value, type) {
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (type === "array") return Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  if (type === "string") return typeof value === "string";
  if (type === "boolean") return typeof value === "boolean";
  if (type === "null") return value === null;
  throw new Error(`unsupported schema type: ${type}`);
}

function validate(value, rule, root = schema, location = "$") {
  const errors = [];
  if (rule.$ref) {
    const resolved = resolveRef(root, rule.$ref);
    if (!resolved) errors.push(`${location}: unresolved reference ${rule.$ref}`);
    else errors.push(...validate(value, resolved, root, location));
  }
  if (rule.type && !typeMatches(value, rule.type)) {
    errors.push(`${location}: expected ${rule.type}`);
    return errors;
  }
  if (Object.hasOwn(rule, "const") && !same(value, rule.const)) {
    errors.push(`${location}: const mismatch`);
  }
  if (rule.enum && !rule.enum.some((entry) => same(entry, value))) {
    errors.push(`${location}: enum mismatch`);
  }
  if (typeof value === "string") {
    if (rule.minLength !== undefined && value.length < rule.minLength) {
      errors.push(`${location}: shorter than minLength`);
    }
    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      errors.push(`${location}: longer than maxLength`);
    }
    if (rule.pattern !== undefined && !new RegExp(rule.pattern, "u").test(value)) {
      errors.push(`${location}: pattern mismatch`);
    }
  }
  if (typeof value === "number") {
    if (rule.minimum !== undefined && value < rule.minimum) {
      errors.push(`${location}: below minimum`);
    }
    if (rule.maximum !== undefined && value > rule.maximum) {
      errors.push(`${location}: above maximum`);
    }
  }
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const properties = rule.properties ?? {};
    for (const key of rule.required ?? []) {
      if (!Object.hasOwn(value, key)) errors.push(`${location}: missing ${key}`);
    }
    if (rule.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.hasOwn(properties, key)) errors.push(`${location}: unexpected ${key}`);
      }
    }
    for (const [key, childRule] of Object.entries(properties)) {
      if (Object.hasOwn(value, key)) {
        errors.push(...validate(value[key], childRule, root, `${location}.${key}`));
      }
    }
  }
  return errors;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function digest(character) {
  return character.repeat(64);
}

function artifactReference(type, index) {
  return {
    artifact_type: type,
    reference_id: `void-${type.replaceAll("_", "-")}-v1-${index}`,
    schema_id: `https://void.network/schemas/${type.replaceAll("_", "-")}-v1.schema.json`,
    sha256: digest(String(index)),
    media_type: "application/json",
    contains_secret_material: false,
    separately_reviewed: true,
  };
}

const candidate = {
  $schema: SCHEMA_ID,
  marker: MARKER,
  version: 1,
  status: "reviewed_candidate_activation_forbidden",
  network: {
    name: "VOID Mainnet-0",
    identity: "mainnet0",
    chain_id: 2050,
  },
  provenance: {
    repository: "6ZoSo9/void-node",
    prerequisite_gate_id:
      "void.authenticated-paid-work.disabled-runtime.activation-prerequisites.v1",
    observed_main_commit: "a".repeat(40),
    prerequisite_merge_commit: "25db3a0b0ff802914ef40bacabcbbda3779866cd",
    repair_merge_commit: "e46619b4eba306dd0727e93ef87f52b68f724852",
    readiness_decision_merge_commit: "8ce112d6b0eb594bf0e0e1715e4217a7e1379753",
    evidence_composition_sha256: digest("b"),
    readiness_decision_sha256: digest("c"),
  },
  artifact_references: {
    trusted_context: artifactReference("trusted_context_reference_metadata", 1),
    credential: artifactReference("credential_reference_metadata", 2),
    bounded_replay_snapshot: artifactReference("bounded_replay_snapshot", 3),
    service_unit_design: artifactReference("service_unit_design", 4),
    rollback_plan: artifactReference("rollback_plan", 5),
    activation_execution_confirmation:
      artifactReference("activation_execution_confirmation", 6),
    live_canary_scope: artifactReference("live_canary_scope", 7),
  },
  runtime: {
    enabled: false,
    activation_authorized: false,
    desired_state: "disabled_pending_explicit_activation_execution",
    listener_created: false,
    service_installed: false,
    persistence_enabled: false,
    payment_execution_enabled: false,
    work_dispatch_enabled: false,
    work_credit_write_enabled: false,
    wallet_or_signer_access: false,
    fund_movement_enabled: false,
    separate_activation_execution_lane_required: true,
  },
  execution_boundary: {
    read_only: true,
    configuration_instance_created: false,
    activation_configuration_written: false,
    credential_or_token_read: false,
    deployment: false,
    service_restart: false,
    runtime_listener_created: false,
    payment_execution: false,
    work_dispatch: false,
    work_credit_write: false,
    wallet_or_signer_access: false,
    fund_movement: false,
    separate_activation_execution_lane_required: true,
  },
};

assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
assert.equal(schema.$id, SCHEMA_ID);
assert.equal(schema.additionalProperties, false);
assert.equal(schema.properties.marker.const, MARKER);
assert.deepEqual(validate(candidate, schema), []);

function expectInvalid(label, mutate, expectedFragment) {
  const value = clone(candidate);
  mutate(value);
  const errors = validate(value, schema);
  assert.ok(errors.length > 0, `${label}: candidate unexpectedly valid`);
  assert.ok(
    errors.some((error) => error.includes(expectedFragment)),
    `${label}: expected ${expectedFragment}; actual=${errors.join(" | ")}`,
  );
}

expectInvalid("unknown top-level key", (value) => {
  value.activate = true;
}, "unexpected activate");
expectInvalid("wrong chain", (value) => {
  value.network.chain_id = 1;
}, "network.chain_id: const mismatch");
expectInvalid("runtime enabled", (value) => {
  value.runtime.enabled = true;
}, "runtime.enabled: const mismatch");
expectInvalid("activation authorized", (value) => {
  value.runtime.activation_authorized = true;
}, "runtime.activation_authorized: const mismatch");
expectInvalid("listener created", (value) => {
  value.runtime.listener_created = true;
}, "runtime.listener_created: const mismatch");
expectInvalid("credential contains secret", (value) => {
  value.artifact_references.credential.contains_secret_material = true;
}, "credential.contains_secret_material: const mismatch");
expectInvalid("credential value embedded", (value) => {
  value.artifact_references.credential.token = "not-a-real-token";
}, "credential: unexpected token");
expectInvalid("wrong reference type", (value) => {
  value.artifact_references.credential.artifact_type =
    "trusted_context_reference_metadata";
}, "credential.artifact_type: const mismatch");
expectInvalid("missing rollback", (value) => {
  delete value.artifact_references.rollback_plan;
}, "artifact_references: missing rollback_plan");
expectInvalid("unreviewed reference", (value) => {
  value.artifact_references.live_canary_scope.separately_reviewed = false;
}, "live_canary_scope.separately_reviewed: const mismatch");
expectInvalid("wrong readiness merge", (value) => {
  value.provenance.readiness_decision_merge_commit = "f".repeat(40);
}, "readiness_decision_merge_commit: const mismatch");
expectInvalid("invalid evidence digest", (value) => {
  value.provenance.evidence_composition_sha256 = "short";
}, "evidence_composition_sha256: pattern mismatch");
expectInvalid("configuration instance claimed", (value) => {
  value.execution_boundary.configuration_instance_created = true;
}, "configuration_instance_created: const mismatch");
expectInvalid("work dispatch claimed", (value) => {
  value.execution_boundary.work_dispatch = true;
}, "execution_boundary.work_dispatch: const mismatch");

const documentation = fs.readFileSync(DOC_PATH, "utf8");
const workflow = fs.readFileSync(WORKFLOW_PATH, "utf8");
for (const required of [
  "closes only the `activation_configuration_schema` blocker",
  "does not create an activation configuration instance",
  "contains_secret_material=false",
  "activation-readiness result must remain `HOLD`",
  "No tracked or private production configuration instance is written",
]) {
  assert.ok(documentation.includes(required), `documentation missing: ${required}`);
}
for (const required of [
  "permissions:\n  contents: read",
  "persist-credentials: false",
  "node-version: \"22\"",
  "Prove exact disabled candidate boundary",
]) {
  assert.ok(workflow.includes(required), `workflow missing: ${required}`);
}

for (const [label, source] of [
  ["schema", schemaText],
  ["documentation", documentation],
  ["workflow", workflow],
]) {
  for (const forbidden of [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
    /\bsk-[A-Za-z0-9_-]{20,}\b/u,
    /\b0x[0-9a-fA-F]{64}\b/u,
  ]) {
    assert.equal(forbidden.test(source), false, `${label} contains forbidden secret material`);
  }
}

console.log(PROOF_MARKER);
console.log("schema_draft_2020_12=true");
console.log("schema_closed_objects=true");
console.log("synthetic_candidate_valid=true");
console.log("artifact_reference_count=7");
console.log("activation_configuration_schema_defined=true");
console.log("activation_configuration_instance_created=false");
console.log("readiness_decision=HOLD");
console.log("activation_enabled=false");
console.log("activation_authorized=false");
console.log("credential_or_token_read=false");
console.log("deployment=false");
console.log("service_restart=false");
console.log("runtime_listener_created=false");
console.log("payment_execution=false");
console.log("work_dispatch=false");
console.log("work_credit_write=false");
console.log("wallet_or_signer_access=false");
console.log("fund_movement=false");
console.log("separate_activation_execution_lane_required=true");
