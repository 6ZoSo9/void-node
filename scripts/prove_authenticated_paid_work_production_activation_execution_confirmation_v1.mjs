#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";

const MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_EXECUTION_CONFIRMATION_V1_PROOF";
const ARTIFACT_PATH = "ops/mainnet0/authenticated-paid-work-production-activation-execution-confirmation-v1.json";
const SCHEMA_PATH = "schemas/authenticated-paid-work-production-activation-execution-confirmation-v1.schema.json";
const DOCS_PATH = "docs/operations/authenticated-paid-work-production-activation-execution-confirmation-v1.md";
const WORKFLOW_PATH = ".github/workflows/authenticated-paid-work-production-activation-execution-confirmation-v1.yml";
const EXPECTED_ARTIFACT_SHA = "b5bb1a44e8e707f48df34d786b36bd93f149ff4adf88b15132f1dc2873cc73d7";
const EXPECTED_BASE = "97dd668fdbe8e3329cc5a083df010a1ffd6050c8";
const DEPENDENCIES = {"activation_configuration":{"path":"config/activation-candidates/authenticated-paid-work-production-activation-configuration-v1.json","source_commit":"97dd668fdbe8e3329cc5a083df010a1ffd6050c8","git_blob_sha1":"ea2e9241b1ba07af3bcd376134b8dfd3e273aeb8","sha256":"abe7974246d47a4802a936e78f952d6db76d98cccfccc1ce7130309c56b3ee8f"},"trusted_context_reference_metadata":{"path":"config/activation-candidates/authenticated-paid-work-production-activation-trusted-context-reference-metadata-v1.json","source_commit":"97dd668fdbe8e3329cc5a083df010a1ffd6050c8","git_blob_sha1":"489b34c2e684945c7b1a5287e0c1ed29f466bb82","sha256":"49a84ccd443eab216f38bc926838272fb82999c0530bd76cb3cb259deac5259a"},"credential_reference_metadata":{"path":"config/activation-candidates/authenticated-paid-work-production-activation-credential-reference-metadata-v1.json","source_commit":"97dd668fdbe8e3329cc5a083df010a1ffd6050c8","git_blob_sha1":"c8de0871418c2d88b74f5fb576525374d14f95b8","sha256":"eac53cc5a7fd9cbb48271a86c475866cf720f6600f3c9342f2f142ee95d5d89c"},"service_unit_design":{"path":"ops/mainnet0/authenticated-paid-work-production-activation-service-unit-design-v1.json","source_commit":"97dd668fdbe8e3329cc5a083df010a1ffd6050c8","git_blob_sha1":"b36503e09c11d53014bbc94f94a8969f62860c40","sha256":"f37bcf3931579e13a76e7ab2d03e9d961260fa0e9ec95ca4507bd06e3df38b07"},"rollback_plan":{"path":"ops/mainnet0/authenticated-paid-work-runtime-disabled-production-rollback-plan-v1.json","source_commit":"97dd668fdbe8e3329cc5a083df010a1ffd6050c8","git_blob_sha1":"6796362f06f15dbef945c7fef00bb8d21c6f58bf","sha256":"31470e837beb091f3fb63617c5b5e1afa6268e8e4d81480037e1e459df426c2c"},"bounded_replay_snapshot":{"path":"ops/mainnet0/authenticated-paid-work-production-activation-bounded-replay-snapshot-v1.json","source_commit":"97dd668fdbe8e3329cc5a083df010a1ffd6050c8","git_blob_sha1":"5a6e1e5c7c9ff75b7d266ce25634dd46d311ad46","sha256":"4bd9c20409b961297554a5d830c4a6c3b7c9b24b000766c58c5bd30fb1959f33"}};

function fail(message) {
  throw new Error(`${MARKER}: ${message}`);
}
function assert(condition, message) {
  if (!condition) fail(message);
}
function record(value, label) {
  assert(
    value !== null && typeof value === "object" && !Array.isArray(value),
    `${label} must be an object`,
  );
  return value;
}
function exactKeys(value, expected, label) {
  const actual = Object.keys(record(value, label)).sort();
  const wanted = [...expected].sort();
  assert(
    JSON.stringify(actual) === JSON.stringify(wanted),
    `${label} keys mismatch`,
  );
}
function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}
function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}
function sha256Bytes(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
function sha256File(filename) {
  return sha256Bytes(fs.readFileSync(filename));
}
function gitBlobSha1(filename) {
  const bytes = fs.readFileSync(filename);
  return crypto
    .createHash("sha1")
    .update(Buffer.from(`blob ${bytes.length}\0`, "utf8"))
    .update(bytes)
    .digest("hex");
}

const artifact = JSON.parse(fs.readFileSync(ARTIFACT_PATH, "utf8"));
const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8"));
const docs = fs.readFileSync(DOCS_PATH, "utf8");
const workflow = fs.readFileSync(WORKFLOW_PATH, "utf8");

assert(
  sha256File(ARTIFACT_PATH) === EXPECTED_ARTIFACT_SHA,
  "artifact SHA mismatch",
);
exactKeys(artifact, ["$schema", "marker", "version", "status", "network", "provenance", "confirmation_scope", "confirmation_protocol", "execution_plan_contract", "pre_confirmation_gates", "future_execution_sequence", "rollback_contract", "authority"], "artifact");
assert(
  artifact.marker ===
    "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_EXECUTION_CONFIRMATION_V1",
  "artifact marker mismatch",
);
assert(artifact.version === 1, "artifact version mismatch");
assert(
  artifact.status ===
    "reviewed_source_confirmation_contract_execution_forbidden",
  "artifact status mismatch",
);
assert(
  canonicalJson(artifact.network) ===
    canonicalJson({
      name: "VOID Mainnet-0",
      identity: "mainnet0",
      chain_id: 2050,
    }),
  "network mismatch",
);

assert(
  artifact.provenance.repository === "6ZoSo9/void-node",
  "repository mismatch",
);
assert(
  artifact.provenance.source_base_commit === EXPECTED_BASE,
  "source base mismatch",
);
exactKeys(
  artifact.provenance.dependencies,
  Object.keys(DEPENDENCIES),
  "dependencies",
);
for (const [name, expected] of Object.entries(DEPENDENCIES)) {
  const actual = artifact.provenance.dependencies[name];
  exactKeys(
    actual,
    ["path", "source_commit", "git_blob_sha1", "sha256"],
    `dependency ${name}`,
  );
  assert(actual.path === expected.path, `dependency path mismatch: ${name}`);
  assert(
    actual.source_commit === EXPECTED_BASE,
    `dependency source commit mismatch: ${name}`,
  );
  assert(
    actual.git_blob_sha1 === expected.git_blob_sha1,
    `dependency blob mismatch: ${name}`,
  );
  assert(
    actual.sha256 === expected.sha256,
    `dependency SHA mismatch: ${name}`,
  );
  assert(
    gitBlobSha1(expected.path) === expected.git_blob_sha1,
    `live dependency blob mismatch: ${name}`,
  );
  assert(
    sha256File(expected.path) === expected.sha256,
    `live dependency SHA mismatch: ${name}`,
  );
}

const scope = artifact.confirmation_scope;
assert(
  scope.closes_blocker === "activation_execution_confirmation",
  "wrong closed blocker",
);
assert(scope.remaining_blocker_count === 1, "remaining blocker count mismatch");
assert(
  canonicalJson(scope.remaining_blockers) ===
    canonicalJson(["live_canary_scope"]),
  "remaining blocker mismatch",
);
assert(
  scope.readiness_decision_after_publication === "HOLD",
  "readiness widened",
);
assert(
  scope.publication_effect ===
    "source_only_confirmation_protocol_no_live_confirmation",
  "publication effect mismatch",
);

const protocol = artifact.confirmation_protocol;
assert(
  protocol.confirmation_template ===
    "confirm-void-authenticated-paid-work-production-activation-v1:<operation_id>:<execution_plan_sha256>",
  "confirmation template mismatch",
);
assert(
  protocol.confirmation_transport ===
    "fresh_interactive_operator_input_only",
  "confirmation transport mismatch",
);
assert(protocol.maximum_ttl_seconds === 600, "confirmation TTL mismatch");
assert(protocol.maximum_attempt_count === 1, "attempt count mismatch");
assert(protocol.automatic_retry === false, "automatic retry widened");
for (const key of [
  "live_confirmation_embedded_in_source",
  "confirmation_issued_by_this_artifact",
  "confirmation_verified_by_this_artifact",
]) {
  assert(protocol[key] === false, `confirmation boundary widened: ${key}`);
}
for (const key of [
  "command_line_argument_forbidden",
  "environment_inheritance_forbidden",
  "wildcard_confirmation_forbidden",
  "replay_forbidden",
  "case_sensitive",
  "trailing_newline_forbidden",
]) {
  assert(protocol[key] === true, `confirmation gate missing: ${key}`);
}
assert(
  protocol.binds_exactly.includes("live_canary_scope_sha256"),
  "canary-scope confirmation binding missing",
);
for (const value of Object.values(protocol.verification_order)) {
  assert(value === true, "confirmation verification order weakened");
}

const plan = artifact.execution_plan_contract;
assert(plan.must_exist_before_confirmation === true, "plan gate missing");
assert(plan.contains_secret_material === false, "plan secret boundary widened");
assert(plan.target.hostname === "zoso-Precision-Tower-7810", "host mismatch");
assert(plan.target.runtime_user === "zoso", "runtime user mismatch");
assert(plan.target.expected_main_commit === EXPECTED_BASE, "plan base mismatch");
assert(plan.target.node_major === 22, "Node major mismatch");
assert(
  plan.target.service_manager_scope === "systemd_user",
  "service manager scope mismatch",
);
assert(plan.future_mutation_order_locked === true, "mutation order unlocked");
assert(plan.extra_mutations_forbidden === true, "extra mutations allowed");
assert(plan.service_enable_forbidden === true, "service enablement allowed");
assert(plan.automatic_start_forbidden === true, "automatic start allowed");
assert(plan.automatic_restart_forbidden === true, "automatic restart allowed");
assert(
  plan.second_start_without_new_plan_and_confirmation_forbidden === true,
  "second start allowed",
);
for (const [key, value] of Object.entries(plan.economic_authority)) {
  assert(value === false, `economic authority widened: ${key}`);
}

for (const [key, value] of Object.entries(artifact.pre_confirmation_gates)) {
  assert(value === true, `pre-confirmation gate missing: ${key}`);
}

const sequence = artifact.future_execution_sequence;
assert(sequence.length === 12, "execution sequence length mismatch");
assert(
  sequence.map((step) => step.order).join(",") ===
    "1,2,3,4,5,6,7,8,9,10,11,12",
  "execution order mismatch",
);
assert(
  sequence.slice(0, 6).every((step) => step.mutation === false),
  "mutation allowed before confirmation",
);
assert(
  sequence[5].id ===
    "collect_fresh_operation_bound_operator_confirmation",
  "confirmation step mismatch",
);
assert(
  sequence[6].id ===
    "consume_confirmation_and_acquire_one_shot_execution_lease",
  "first mutation is not confirmation consumption",
);

const rollback = artifact.rollback_contract;
assert(
  rollback.rollback_plan_sha256 ===
    DEPENDENCIES.rollback_plan.sha256,
  "rollback digest mismatch",
);
for (const [key, value] of Object.entries(rollback)) {
  if (key === "rollback_plan_path" || key === "rollback_plan_sha256") continue;
  assert(value === true, `rollback contract weakened: ${key}`);
}

const authority = artifact.authority;
const allowedTrue = new Set(["source_confirmation_contract_created"]);
for (const [key, value] of Object.entries(authority)) {
  assert(
    value === allowedTrue.has(key),
    `authority mismatch: ${key}`,
  );
}

assert(
  schema.$schema === "https://json-schema.org/draft/2020-12/schema",
  "schema dialect mismatch",
);
assert(
  schema.x_void_schema_strategy === "exact_const_artifact",
  "schema strategy mismatch",
);
assert(
  canonicalJson(schema.const) === canonicalJson(artifact),
  "schema const mismatch",
);

for (const token of [
  EXPECTED_ARTIFACT_SHA,
  "Production activation remains **HOLD**",
  "`live_canary_scope`",
  "does **not** issue or verify a live confirmation",
  "maximum 600 seconds",
]) {
  assert(docs.includes(token), `documentation token missing: ${token}`);
}
assert(workflow.includes('node-version: "22"'), "workflow Node 22 missing");
assert(
  workflow.includes(
    "node scripts/prove_authenticated_paid_work_production_activation_execution_confirmation_v1.mjs",
  ),
  "workflow proof command missing",
);

console.log(MARKER);
console.log(`artifact_sha256=${EXPECTED_ARTIFACT_SHA}`);
console.log(`source_base_commit=${EXPECTED_BASE}`);
console.log(`dependency_count=${Object.keys(DEPENDENCIES).length}`);
console.log("confirmation_contract_defined=true");
console.log("live_confirmation_issued=false");
console.log("live_confirmation_verified=false");
console.log("maximum_confirmation_ttl_seconds=600");
console.log("maximum_attempt_count=1");
console.log("automatic_retry=false");
console.log("closes_blocker=activation_execution_confirmation");
console.log("remaining_blocker_count=1");
console.log("remaining_blockers=live_canary_scope");
console.log("readiness_decision=HOLD");
console.log("execution_plan_materialized=false");
console.log("execution_lease_written=false");
console.log("activation_configuration_written=false");
console.log("activation_persistence_root_created=false");
console.log("service_unit_written=false");
console.log("daemon_reload=false");
console.log("service_started=false");
console.log("credential_or_token_read=false");
console.log("payment_execution=false");
console.log("work_dispatch=false");
console.log("work_credit_write=false");
console.log("wallet_or_signer_access=false");
console.log("fund_movement=false");
console.log(
  "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_EXECUTION_CONFIRMATION_V1_PROOF_GREEN",
);
