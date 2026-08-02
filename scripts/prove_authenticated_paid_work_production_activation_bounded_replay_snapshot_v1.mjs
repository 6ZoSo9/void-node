import crypto from "node:crypto";
import fs from "node:fs";

const MARKER = "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_BOUNDED_REPLAY_SNAPSHOT_V1_PROOF";
const ARTIFACT_PATH = "ops/mainnet0/authenticated-paid-work-production-activation-bounded-replay-snapshot-v1.json";
const SCHEMA_PATH = "schemas/authenticated-paid-work-production-activation-bounded-replay-snapshot-v1.schema.json";
const DOCS_PATH = "docs/operations/authenticated-paid-work-production-activation-bounded-replay-snapshot-v1.md";
const WORKFLOW_PATH = ".github/workflows/authenticated-paid-work-production-activation-bounded-replay-snapshot-v1.yml";
const EXPECTED_ARTIFACT_SHA = "4bd9c20409b961297554a5d830c4a6c3b7c9b24b000766c58c5bd30fb1959f33";
const EXPECTED_ACCEPTANCE_STATE_ID = "voidawrs1_09fcfb20aa71c21c83beddec7ca3965d2bcd98d13c08d9f0e70842e0f255d678";
const EXPECTED_PAYMENT_STATE_ID = "voidawpars1_097a5fbf4f39114585363c8152bd2d4666a914cc54358b7008de73ba97037837";
const EXPECTED_SNAPSHOT_BYTES = 775;
const DEPENDENCIES = {"acceptance_replay_consumer":{"git_blob_sha1":"66b810610404eccb1fa2162797704c8ea5f77a9c","path":"scripts/public_agent_service_acceptance_materialization_replay_consumer_v1.ts","sha256":"b6241ece951f7e6d20ed3f60a3751252b771a6407adae0c15c6375a200b58631","source_commit":"58dd94a3f2718334d509422400c286ce1a0b6793"},"activation_configuration":{"git_blob_sha1":"ea2e9241b1ba07af3bcd376134b8dfd3e273aeb8","path":"config/activation-candidates/authenticated-paid-work-production-activation-configuration-v1.json","sha256":"abe7974246d47a4802a936e78f952d6db76d98cccfccc1ce7130309c56b3ee8f","source_commit":"58dd94a3f2718334d509422400c286ce1a0b6793"},"canonical_json":{"git_blob_sha1":"8ee1825cc15b3f36e85df81830bc8b2f39d076b3","path":"scripts/agent_paid_work_order_envelope_v1.ts","sha256":"c803796b968678c9b8b0a35291dede8f96647922b494cf123c3660715f7e3575","source_commit":"58dd94a3f2718334d509422400c286ce1a0b6793"},"example_fixture":{"git_blob_sha1":"bfe577d3fc8c444c6bb59db8fdbb843ad967b9ca","path":"examples/authenticated-paid-work-quote-acceptance-payment-authority-activation-persistence-v1.example.json","sha256":"3265aef51ef9d6c115231419548c37a6ae9f544bbe7cfec035e03891145e02bb","source_commit":"58dd94a3f2718334d509422400c286ce1a0b6793"},"persistence_engine":{"git_blob_sha1":"4b961cdb61cc9e7f9b50c4af28af805d4619e366","path":"scripts/authenticated_paid_work_quote_acceptance_payment_authority_activation_persistence_v1.ts","sha256":"2250c1da64686f6495d4416c20fdef33762139975d09562225d948553a0cc450","source_commit":"58dd94a3f2718334d509422400c286ce1a0b6793"},"rollback_plan":{"git_blob_sha1":"6796362f06f15dbef945c7fef00bb8d21c6f58bf","path":"ops/mainnet0/authenticated-paid-work-runtime-disabled-production-rollback-plan-v1.json","sha256":"31470e837beb091f3fb63617c5b5e1afa6268e8e4d81480037e1e459df426c2c","source_commit":"58dd94a3f2718334d509422400c286ce1a0b6793"},"runtime_binding":{"git_blob_sha1":"0591291f99bb72e55be7a023d182e506bfc1fcd9","path":"scripts/authenticated_paid_work_quote_acceptance_payment_authority_activation_persistence_runtime_binding_v1.ts","sha256":"3248f5720121d699e5ea4fe34554f7c0ee75ae1f751a8ade7f0a93e3ce72f1b7","source_commit":"58dd94a3f2718334d509422400c286ce1a0b6793"},"service_unit_design":{"git_blob_sha1":"b36503e09c11d53014bbc94f94a8969f62860c40","path":"ops/mainnet0/authenticated-paid-work-production-activation-service-unit-design-v1.json","sha256":"f37bcf3931579e13a76e7ab2d03e9d961260fa0e9ec95ca4507bd06e3df38b07","source_commit":"58dd94a3f2718334d509422400c286ce1a0b6793"},"credential_reference_metadata":{"git_blob_sha1":"c8de0871418c2d88b74f5fb576525374d14f95b8","path":"config/activation-candidates/authenticated-paid-work-production-activation-credential-reference-metadata-v1.json","sha256":"eac53cc5a7fd9cbb48271a86c475866cf720f6600f3c9342f2f142ee95d5d89c","source_commit":"58dd94a3f2718334d509422400c286ce1a0b6793"}};

function fail(message) { throw new Error(`${MARKER}: ${message}`); }
function assert(condition, message) { if (!condition) fail(message); }
function record(value, label) {
  assert(value !== null && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  return value;
}
function exactKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  assert(JSON.stringify(actual) === JSON.stringify(wanted), `${label} keys mismatch`);
}
function canonicalize(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") {
    assert(Number.isFinite(value), "non-finite number");
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  const source = record(value, "canonical value");
  const result = {};
  for (const key of Object.keys(source).sort()) result[key] = canonicalize(source[key]);
  return result;
}
function canonicalJson(value) { return JSON.stringify(canonicalize(value)); }
function sha256Bytes(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function sha256File(filename) { return sha256Bytes(fs.readFileSync(filename)); }
function readJson(filename) { return JSON.parse(fs.readFileSync(filename, "utf8")); }
function deepClone(value) { return JSON.parse(JSON.stringify(value)); }

const artifact = readJson(ARTIFACT_PATH);
const schema = readJson(SCHEMA_PATH);
const docs = fs.readFileSync(DOCS_PATH, "utf8");
const workflow = fs.readFileSync(WORKFLOW_PATH, "utf8");

assert(sha256File(ARTIFACT_PATH) === EXPECTED_ARTIFACT_SHA, "artifact SHA mismatch");
exactKeys(artifact, [
  "$schema", "marker", "version", "status", "network", "provenance", "snapshot_scope",
  "store_precondition", "replay_snapshot", "cardinality_bounds",
  "runtime_binding_contract", "freshness_and_consumption", "authority"
], "artifact");
assert(artifact.marker === "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_BOUNDED_REPLAY_SNAPSHOT_V1", "artifact marker mismatch");
assert(artifact.version === 1, "artifact version mismatch");
assert(artifact.status === "reviewed_fresh_store_zero_state_snapshot_materialization_forbidden", "artifact status mismatch");
assert(artifact.network.name === "VOID Mainnet-0" && artifact.network.identity === "mainnet0" && artifact.network.chain_id === 2050, "network mismatch");

assert(schema.$schema === "https://json-schema.org/draft/2020-12/schema", "schema dialect mismatch");
assert(schema.$id === artifact.$schema, "schema ID mismatch");
assert(schema.x_void_marker === "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_BOUNDED_REPLAY_SNAPSHOT_SCHEMA_V1", "schema marker mismatch");
assert(schema.x_void_schema_strategy === "exact_const_artifact", "schema strategy mismatch");
assert(canonicalJson(schema.const) === canonicalJson(artifact), "schema const does not equal artifact");

const acceptance = artifact.replay_snapshot.acceptance_replay_state_snapshot;
const payment = artifact.replay_snapshot.payment_authority_replay_state_snapshot;
exactKeys(acceptance, [
  "marker", "version", "revision", "consumed_requester_authentication_ids",
  "consumed_provider_authentication_ids", "consumed_acceptance_ids",
  "active_acceptance_by_quote", "state_id"
], "acceptance snapshot");
exactKeys(payment, [
  "marker", "version", "revision", "consumed_prepared_packet_ids",
  "consumed_payment_intent_ids", "active_payment_intent_by_acceptance", "state_id"
], "payment snapshot");

const acceptanceDraft = deepClone(acceptance);
delete acceptanceDraft.state_id;
const paymentDraft = deepClone(payment);
delete paymentDraft.state_id;
const acceptanceStateId = `voidawrs1_${sha256Bytes(Buffer.from(canonicalJson(acceptanceDraft), "utf8"))}`;
const paymentStateId = `voidawpars1_${sha256Bytes(Buffer.from(canonicalJson(paymentDraft), "utf8"))}`;
assert(acceptanceStateId === EXPECTED_ACCEPTANCE_STATE_ID, "computed acceptance state ID mismatch");
assert(paymentStateId === EXPECTED_PAYMENT_STATE_ID, "computed payment state ID mismatch");
assert(acceptance.state_id === acceptanceStateId, "artifact acceptance state ID mismatch");
assert(payment.state_id === paymentStateId, "artifact payment state ID mismatch");

assert(acceptance.revision === 0 && payment.revision === 0, "snapshot revisions must be zero");
for (const key of [
  "consumed_requester_authentication_ids",
  "consumed_provider_authentication_ids",
  "consumed_acceptance_ids"
]) assert(Array.isArray(acceptance[key]) && acceptance[key].length === 0, `${key} must be empty`);
for (const key of ["consumed_prepared_packet_ids", "consumed_payment_intent_ids"])
  assert(Array.isArray(payment[key]) && payment[key].length === 0, `${key} must be empty`);
assert(Object.keys(acceptance.active_acceptance_by_quote).length === 0, "acceptance active map must be empty");
assert(Object.keys(payment.active_payment_intent_by_acceptance).length === 0, "payment active map must be empty");
assert(artifact.replay_snapshot.expected_acceptance_revision === 0, "expected acceptance revision mismatch");
assert(artifact.replay_snapshot.expected_payment_authority_revision === 0, "expected payment revision mismatch");

const snapshotPayload = {
  acceptance_replay_state_snapshot: acceptance,
  payment_authority_replay_state_snapshot: payment,
  expected_acceptance_revision: 0,
  expected_payment_authority_revision: 0,
};
const actualSnapshotBytes = Buffer.byteLength(canonicalJson(snapshotPayload), "utf8");
assert(actualSnapshotBytes === EXPECTED_SNAPSHOT_BYTES, "snapshot byte count mismatch");
assert(artifact.replay_snapshot.serialization_bounds.actual_canonical_bytes === actualSnapshotBytes, "artifact snapshot bytes mismatch");
assert(actualSnapshotBytes <= artifact.replay_snapshot.serialization_bounds.maximum_canonical_bytes, "snapshot exceeds bound");

const store = artifact.store_precondition;
assert(store.allowed_root === "/home/zoso/.local/share/void-authenticated-paid-work-runtime-disabled-v1/activation", "allowed_root mismatch");
assert(store.source_lane_observed_filesystem === false, "source lane must not observe production filesystem");
assert(store.pre_materialization.allowed_root_must_be_absent === true, "pre-materialization absence gate missing");
assert(store.permitted_future_preparation.mode === "0700", "future root mode mismatch");
assert(Array.isArray(store.permitted_future_preparation.entries_after_creation) && store.permitted_future_preparation.entries_after_creation.length === 0, "future root must be empty");
assert(store.runtime_entry.current_pointer_present === false, "current pointer must be absent");
assert(store.runtime_entry.generation_count === 0, "generation count must be zero");
assert(store.runtime_entry.staging_entry_count === 0, "staging count must be zero");
assert(store.runtime_entry.lock_present === false, "lock must be absent");
assert(store.runtime_entry.entries_exact.length === 0, "runtime-entry root must be empty");

const scope = artifact.snapshot_scope;
assert(scope.production_state_observed === false && scope.production_state_read === false, "snapshot scope read production state");
assert(scope.closes_blocker === "bounded_replay_snapshot", "wrong blocker");
assert(scope.remaining_blocker_count === 2, "remaining blocker count mismatch");
assert(canonicalJson(scope.remaining_blockers) === canonicalJson([
  "activation_execution_confirmation", "live_canary_scope"
]), "remaining blockers mismatch");
assert(scope.readiness_decision_after_publication === "HOLD", "readiness decision widened");

const bounds = artifact.cardinality_bounds;
for (const key of [
  "acceptance_revision", "payment_authority_revision",
  "consumed_requester_authentication_id_count",
  "consumed_provider_authentication_id_count",
  "consumed_acceptance_id_count", "active_acceptance_by_quote_count",
  "consumed_prepared_packet_id_count", "consumed_payment_intent_id_count",
  "active_payment_intent_by_acceptance_count"
]) assert(bounds[key] === 0, `${key} must equal zero`);
assert(bounds.first_commit_atomic_consumption_count === 5, "atomic consumption count mismatch");
assert(bounds.first_commit_acceptance_revision_after === 1, "first acceptance revision mismatch");
assert(bounds.first_commit_payment_revision_after === 1, "first payment revision mismatch");
assert(bounds.max_pointer_bytes === 65536, "pointer byte bound mismatch");
assert(bounds.max_generation_file_bytes === 4194304, "generation file bound mismatch");
assert(bounds.max_generation_count === 10000, "generation count bound mismatch");
assert(bounds.recover_exact_orphaned_generation === true, "orphan recovery contract mismatch");

const binding = artifact.runtime_binding_contract;
assert(binding.runtime_command_supplies_replay_snapshot === false, "runtime command must not supply snapshot");
assert(binding.runtime_inspection_injects_replay_snapshot === true, "inspection injection missing");
assert(binding.first_commit_requires_zero_revisions === true, "first-commit zero revision gate missing");
assert(binding.first_commit_requires_empty_replay_state === true, "first-commit empty state gate missing");
assert(binding.compare_and_swap_required_after_first_commit === true, "CAS gate missing");
assert(binding.fresh_snapshot_orphan_recovery_allowed === false, "fresh snapshot must not use orphan recovery");
assert(binding.separate_activation_execution_confirmation_required === true, "separate execution confirmation missing");

const freshness = artifact.freshness_and_consumption;
assert(freshness.valid_only_for_initial_empty_store === true, "fresh-store restriction missing");
assert(freshness.automatic_reset_to_zero_forbidden === true, "automatic reset prohibition missing");
assert(freshness.rollback_must_not_reuse_zero_snapshot_after_committed_generation === true, "rollback zero-state reuse prohibition missing");

for (const [key, value] of Object.entries(artifact.authority))
  assert(value === false, `authority widened: ${key}`);

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
  assert(actual.source_commit === expected.source_commit, `dependency source commit mismatch: ${name}`);
  assert(actual.git_blob_sha1 === expected.git_blob_sha1, `dependency blob mismatch: ${name}`);
  assert(actual.sha256 === expected.sha256, `dependency SHA mismatch: ${name}`);
  const liveBytes = fs.readFileSync(expected.path);
  const liveBlobSha1 = crypto
    .createHash("sha1")
    .update(Buffer.from(`blob ${liveBytes.length}\0`, "utf8"))
    .update(liveBytes)
    .digest("hex");
  assert(liveBlobSha1 === expected.git_blob_sha1, `live dependency blob mismatch: ${name}`);
  assert(sha256Bytes(liveBytes) === expected.sha256, `live dependency SHA mismatch: ${name}`);
}

const runtimeBinding = fs.readFileSync(DEPENDENCIES.runtime_binding.path, "utf8");
for (const token of [
  "function emptyAcceptanceStateV1()",
  "function emptyPaymentStateV1()",
  "inspectAuthenticatedPaidWorkActivationPersistenceStoreV1",
  "acceptance_replay_state_snapshot: selectedAcceptanceState",
  "payment_authority_replay_state_snapshot: selectedPaymentState"
]) assert(runtimeBinding.includes(token), `runtime binding token missing: ${token}`);

const persistence = fs.readFileSync(DEPENDENCIES.persistence_engine.path, "utf8");
for (const token of [
  "empty store requires zero revisions",
  "empty store requires empty replay state",
  "replay identifier already consumed"
]) assert(persistence.includes(token), `persistence token missing: ${token}`);

const canonicalSource = fs.readFileSync(DEPENDENCIES.canonical_json.path, "utf8");
assert(canonicalSource.includes("Object.keys(value).sort()"), "canonical key ordering token missing");
assert(canonicalSource.includes("return JSON.stringify(toJsonValue(value));"), "canonical serialization token missing");

assert(docs.includes(EXPECTED_ARTIFACT_SHA), "docs artifact SHA missing");
assert(docs.includes(EXPECTED_ACCEPTANCE_STATE_ID), "docs acceptance state ID missing");
assert(docs.includes(EXPECTED_PAYMENT_STATE_ID), "docs payment state ID missing");
assert(docs.includes("Readiness remains **HOLD**"), "docs HOLD decision missing");
assert(workflow.includes('node-version: "22"'), "workflow Node 22 binding missing");
assert(workflow.includes("prove_authenticated_paid_work_production_activation_bounded_replay_snapshot_v1.mjs"), "workflow proof command missing");

const revisionMutation = deepClone(artifact);
revisionMutation.replay_snapshot.acceptance_replay_state_snapshot.revision = 1;
assert(canonicalJson(revisionMutation) !== canonicalJson(schema.const), "schema const accepted revision mutation");
const identifierMutation = deepClone(artifact);
identifierMutation.replay_snapshot.payment_authority_replay_state_snapshot.consumed_payment_intent_ids =
  ["voidawpi1_" + "0".repeat(64)];
assert(canonicalJson(identifierMutation) !== canonicalJson(schema.const), "schema const accepted identifier mutation");
const authorityMutation = deepClone(artifact);
authorityMutation.authority.activation = true;
assert(canonicalJson(authorityMutation) !== canonicalJson(schema.const), "schema const accepted authority mutation");
const rootMutation = deepClone(artifact);
rootMutation.store_precondition.runtime_entry.generation_count = 1;
assert(canonicalJson(rootMutation) !== canonicalJson(schema.const), "schema const accepted nonzero generation count");

const combinedSource = [
  fs.readFileSync(ARTIFACT_PATH, "utf8"),
  fs.readFileSync(SCHEMA_PATH, "utf8"),
  docs,
  workflow,
  fs.readFileSync(new URL(import.meta.url), "utf8"),
].join("\n");
for (const forbidden of [
  ["BEGIN PRIVATE", " KEY"].join(""),
  ["gh", "p_"].join(""),
  ["github", "_pat_"].join(""),
  ["sk", "-proj-"].join(""),
  ["Authorization", ": Bearer"].join("")
]) assert(!combinedSource.includes(forbidden), `forbidden secret-like token found: ${forbidden}`);

console.log(MARKER);
console.log(`artifact_sha256=${EXPECTED_ARTIFACT_SHA}`);
console.log(`acceptance_state_id=${acceptanceStateId}`);
console.log(`payment_state_id=${paymentStateId}`);
console.log(`snapshot_canonical_bytes=${actualSnapshotBytes}`);
console.log("store_precondition=fresh_owner_private_empty_root");
console.log("production_state_observed=false");
console.log("production_state_read=false");
console.log("replay_snapshot_materialized=false");
console.log("closes_blocker=bounded_replay_snapshot");
console.log("remaining_blocker_count=2");
console.log("readiness_decision=HOLD");
console.log("service_unit_created_or_installed=false");
console.log("deployment=false");
console.log("activation=false");
console.log("credential_or_token_read=false");
console.log("payment_execution=false");
console.log("work_dispatch=false");
console.log("work_credit_write=false");
console.log("wallet_or_signer_access=false");
console.log("fund_movement=false");
console.log("VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_BOUNDED_REPLAY_SNAPSHOT_V1_PROOF_GREEN");
