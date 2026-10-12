#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARTIFACT_PATH = path.join(
  ROOT,
  "ops/mainnet0/authenticated-paid-work-runtime-disabled-production-rollback-plan-v1.json",
);
const SCHEMA_PATH = path.join(
  ROOT,
  "schemas/authenticated-paid-work-runtime-disabled-production-rollback-plan-v1.schema.json",
);
const DOC_PATH = path.join(
  ROOT,
  "docs/operations/authenticated-paid-work-runtime-disabled-production-rollback-plan-v1.md",
);
const WORKFLOW_PATH = path.join(
  ROOT,
  ".github/workflows/authenticated-paid-work-runtime-disabled-production-rollback-plan-v1.yml",
);

const SCHEMA_ID =
  "https://void.network/schemas/authenticated-paid-work-runtime-disabled-production-rollback-plan-v1.schema.json";
const MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_PRODUCTION_ROLLBACK_PLAN_V1";
const PROOF_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_PRODUCTION_ROLLBACK_PLAN_V1_PROOF_GREEN";

const artifactBytes = fs.readFileSync(ARTIFACT_PATH);
const artifactText = artifactBytes.toString("utf8");
const schemaText = fs.readFileSync(SCHEMA_PATH, "utf8");
const documentation = fs.readFileSync(DOC_PATH, "utf8");
const workflow = fs.readFileSync(WORKFLOW_PATH, "utf8");
const artifact = JSON.parse(artifactText);
const schema = JSON.parse(schemaText);

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
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

function validate(value, rule, location = "$") {
  const errors = [];
  if (rule.type && !typeMatches(value, rule.type)) {
    errors.push(`${location}: expected ${rule.type}`);
    return errors;
  }
  if (Object.hasOwn(rule, "const") && !same(value, rule.const)) {
    errors.push(`${location}: const mismatch`);
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
        errors.push(...validate(value[key], childRule, `${location}.${key}`));
      }
    }
  }
  return errors;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function expectInvalid(label, mutate, expectedFragment) {
  const value = clone(artifact);
  mutate(value);
  const errors = validate(value, schema);
  assert.ok(errors.length > 0, `${label}: artifact unexpectedly valid`);
  assert.ok(
    errors.some((error) => error.includes(expectedFragment)),
    `${label}: expected ${expectedFragment}; actual=${errors.join(" | ")}`,
  );
}

assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
assert.equal(schema.$id, SCHEMA_ID);
assert.equal(schema.additionalProperties, false);
assert.equal(artifact.$schema, SCHEMA_ID);
assert.equal(artifact.marker, MARKER);
assert.deepEqual(validate(artifact, schema), []);

assert.deepEqual(
  artifact.trigger_conditions.map(({ id }) => id),
  [
    "activation_preflight_divergence",
    "authentication_boundary_failure",
    "listener_or_service_health_failure",
    "economic_safety_failure",
    "operator_emergency_stop",
  ],
);
assert.deepEqual(
  artifact.rollback_sequence.map(({ order }) => order),
  [1, 2, 3, 4, 5, 6, 7, 8, 9],
);
assert.deepEqual(
  artifact.rollback_sequence.map(({ id }) => id),
  [
    "confirm_execution_authority_and_bind_inputs",
    "deny_new_paid_work_ingress",
    "restore_disabled_activation_intent",
    "stop_and_disable_reviewed_runtime_unit",
    "detach_credential_reference_without_secret_read",
    "quarantine_inflight_economic_state",
    "verify_disabled_runtime_boundary",
    "emit_non_secret_rollback_receipt",
    "require_fresh_readiness_and_activation_review",
  ],
);
assert.equal(artifact.plan_scope.closes_blocker, "rollback_plan");
assert.equal(artifact.plan_scope.readiness_decision_after_publication, "HOLD");
assert.equal(artifact.plan_scope.remaining_blocker_count, 7);
assert.equal(artifact.plan_scope.required_before_execution.length, 7);
assert.equal(artifact.plan_scope.contains_secret_material, false);
assert.equal(artifact.plan_scope.separately_reviewed, true);
assert.equal(artifact.receipt_contract.contains_secret_material, false);
assert.equal(artifact.execution_boundary.read_only_source_artifact, true);
assert.equal(artifact.execution_boundary.execution_authorized_by_this_artifact, false);
assert.equal(artifact.execution_boundary.automatic_rollback_authorized, false);
assert.equal(artifact.execution_boundary.automatic_reactivation_authorized, false);
assert.equal(
  artifact.execution_boundary.separate_operator_confirmed_execution_lane_required,
  true,
);

expectInvalid("unknown authority", (value) => {
  value.execute_now = true;
}, "unexpected execute_now");
expectInvalid("execution authorized", (value) => {
  value.execution_boundary.execution_authorized_by_this_artifact = true;
}, "execution_boundary: const mismatch");
expectInvalid("automatic rollback authorized", (value) => {
  value.execution_boundary.automatic_rollback_authorized = true;
}, "execution_boundary: const mismatch");
expectInvalid("automatic reactivation authorized", (value) => {
  value.execution_boundary.automatic_reactivation_authorized = true;
}, "execution_boundary: const mismatch");
expectInvalid("secret material claimed", (value) => {
  value.plan_scope.contains_secret_material = true;
}, "plan_scope: const mismatch");
expectInvalid("wrong network", (value) => {
  value.network.chain_id = 1;
}, "network: const mismatch");
expectInvalid("step reordered", (value) => {
  value.rollback_sequence[0].order = 2;
}, "rollback_sequence: const mismatch");
expectInvalid("economic containment widened", (value) => {
  value.execution_boundary.fund_movement = true;
}, "execution_boundary: const mismatch");
expectInvalid("readiness widened", (value) => {
  value.plan_scope.readiness_decision_after_publication = "GO";
}, "plan_scope: const mismatch");

for (const required of [
  "closes only the `rollback_plan` blocker",
  "remains `HOLD` with seven blockers",
  "denies new paid-work ingress before any service-state change",
  "without reading secret material",
  "A separate operator-confirmed execution lane is required",
]) {
  assert.ok(documentation.includes(required), `documentation missing: ${required}`);
}
for (const required of [
  "permissions:\n  contents: read",
  "persist-credentials: false",
  "node-version: \"22\"",
  "Prove exact source-only rollback boundary",
]) {
  assert.ok(workflow.includes(required), `workflow missing: ${required}`);
}

for (const [label, source] of [
  ["artifact", artifactText],
  ["schema", schemaText],
  ["documentation", documentation],
  ["workflow", workflow],
]) {
  for (const forbidden of [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
    /\bsk-[A-Za-z0-9_-]{20,}\b/u,
    /\b0x[0-9a-fA-F]{64}\b/u,
    /Authorization:\s*Bearer\s+\S+/iu,
  ]) {
    assert.equal(forbidden.test(source), false, `${label} contains forbidden secret material`);
  }
}

const artifactSha256 = crypto.createHash("sha256").update(artifactBytes).digest("hex");
console.log(PROOF_MARKER);
console.log(`artifact_sha256=${artifactSha256}`);
console.log("schema_draft_2020_12=true");
console.log("schema_and_artifact_closed_exact=true");
console.log(`trigger_count=${artifact.trigger_conditions.length}`);
console.log(`rollback_step_count=${artifact.rollback_sequence.length}`);
console.log(`success_criterion_count=${artifact.success_criteria.length}`);
console.log(`fail_closed_condition_count=${artifact.fail_closed_conditions.length}`);
console.log("rollback_plan_defined=true");
console.log("rollback_execution_performed=false");
console.log("closes_blocker=rollback_plan");
console.log("readiness_decision=HOLD");
console.log("remaining_blocker_count=7");
console.log("activation_authorized=false");
console.log("automatic_rollback_authorized=false");
console.log("automatic_reactivation_authorized=false");
console.log("activation_configuration_written=false");
console.log("credential_or_token_read=false");
console.log("deployment=false");
console.log("service_created_or_restarted=false");
console.log("runtime_listener_created=false");
console.log("payment_execution=false");
console.log("work_dispatch=false");
console.log("work_credit_write=false");
console.log("wallet_or_signer_access=false");
console.log("fund_movement=false");
console.log("separate_operator_confirmed_execution_lane_required=true");
