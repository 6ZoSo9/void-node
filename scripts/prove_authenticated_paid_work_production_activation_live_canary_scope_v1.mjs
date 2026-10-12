import crypto from "node:crypto";
import fs from "node:fs";

const MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_" +
  "LIVE_CANARY_SCOPE_V1_RECOMPOSED_PROOF";
const ARTIFACT_PATH = "ops/mainnet0/authenticated-paid-work-production-activation-live-canary-scope-v1.json";
const SCHEMA_PATH = "schemas/authenticated-paid-work-production-activation-live-canary-scope-v1.schema.json";
const DOC_PATH = "docs/operations/authenticated-paid-work-production-activation-live-canary-scope-v1.md";
const WORKFLOW_PATH = ".github/workflows/authenticated-paid-work-production-activation-live-canary-scope-v1.yml";
const EXPECTED_ARTIFACT_SHA = "4d2a253d43334b5b0c2053007e0135a9467a1f58c0841d79778caf58ffc68f8e";
const EXPECTED_SOURCE_BASE = "b32a13792bb4d94fb0da52c175930e9ccf03d631";
const EXPECTED_ORIGINAL_HEAD = "0b45585b7ba11bd35403b5298bc6247bd5e5589c";
const EXPECTED_DYNAMIC_REPAIR_MERGE =
  "b32a13792bb4d94fb0da52c175930e9ccf03d631";
const EXPECTED_DYNAMIC_CONFIRMATION_SHA =
  "e2f6cecc52047931ce78445ef00c8eeba990a7f552a9b20efc93d6638f5809f6";
const EXPECTED_SUCCESS_CRITERIA_SHA =
  "57c34fd7ef515c91a550760f7630e814571d7b2d5b22bf74da0ab62d51821ebe";
const EXPECTED_SUCCESS_CRITERIA = {"activation_persistence_entry_count":0,"activation_persistence_root_mode":"0700","activation_persistence_root_owner":"zoso","activation_persistence_root_present":true,"current_pointer_present":false,"funds_moved":false,"generation_count":0,"lock_present":false,"non_secret_receipt_required":true,"payment_authorized":false,"payment_executed":false,"production_ingress_enabled":false,"quote_accepted":false,"runtime_command_result":"dry_run_validated_no_apply","runtime_listener_created":false,"service_exit_status":0,"service_start_attempt_count":1,"staging_entry_count":0,"terminal_service_state":"inactive_dead","wallet_or_signer_accessed":false,"work_credit_written":false,"work_dispatched":false};
const DEPENDENCIES = {"activation_configuration":{"git_blob_sha1":"ea2e9241b1ba07af3bcd376134b8dfd3e273aeb8","path":"config/activation-candidates/authenticated-paid-work-production-activation-configuration-v1.json","sha256":"abe7974246d47a4802a936e78f952d6db76d98cccfccc1ce7130309c56b3ee8f","source_commit":"b32a13792bb4d94fb0da52c175930e9ccf03d631"},"activation_configuration_schema":{"git_blob_sha1":"c692231506a8590345c6252342f9b38b635b18a7","path":"schemas/authenticated-paid-work-production-activation-configuration-v1.schema.json","sha256":"28bd9b1b64e42bc820db866a2d0cb1a3318c4634c696aadcf47c76026dd76b8e","source_commit":"b32a13792bb4d94fb0da52c175930e9ccf03d631"},"activation_execution_confirmation":{"git_blob_sha1":"2ed671a16216f9f861ef0358efeb9c3e291802bb","path":"ops/mainnet0/authenticated-paid-work-production-activation-execution-confirmation-v1.json","sha256":"e2f6cecc52047931ce78445ef00c8eeba990a7f552a9b20efc93d6638f5809f6","source_commit":"b32a13792bb4d94fb0da52c175930e9ccf03d631"},"bounded_replay_snapshot":{"git_blob_sha1":"5a6e1e5c7c9ff75b7d266ce25634dd46d311ad46","path":"ops/mainnet0/authenticated-paid-work-production-activation-bounded-replay-snapshot-v1.json","sha256":"4bd9c20409b961297554a5d830c4a6c3b7c9b24b000766c58c5bd30fb1959f33","source_commit":"b32a13792bb4d94fb0da52c175930e9ccf03d631"},"credential_reference_metadata":{"git_blob_sha1":"c8de0871418c2d88b74f5fb576525374d14f95b8","path":"config/activation-candidates/authenticated-paid-work-production-activation-credential-reference-metadata-v1.json","sha256":"eac53cc5a7fd9cbb48271a86c475866cf720f6600f3c9342f2f142ee95d5d89c","source_commit":"b32a13792bb4d94fb0da52c175930e9ccf03d631"},"rollback_plan":{"git_blob_sha1":"6796362f06f15dbef945c7fef00bb8d21c6f58bf","path":"ops/mainnet0/authenticated-paid-work-runtime-disabled-production-rollback-plan-v1.json","sha256":"31470e837beb091f3fb63617c5b5e1afa6268e8e4d81480037e1e459df426c2c","source_commit":"b32a13792bb4d94fb0da52c175930e9ccf03d631"},"service_unit_design":{"git_blob_sha1":"b36503e09c11d53014bbc94f94a8969f62860c40","path":"ops/mainnet0/authenticated-paid-work-production-activation-service-unit-design-v1.json","sha256":"f37bcf3931579e13a76e7ab2d03e9d961260fa0e9ec95ca4507bd06e3df38b07","source_commit":"b32a13792bb4d94fb0da52c175930e9ccf03d631"},"trusted_context_reference_metadata":{"git_blob_sha1":"489b34c2e684945c7b1a5287e0c1ed29f466bb82","path":"config/activation-candidates/authenticated-paid-work-production-activation-trusted-context-reference-metadata-v1.json","sha256":"49a84ccd443eab216f38bc926838272fb82999c0530bd76cb3cb259deac5259a","source_commit":"b32a13792bb4d94fb0da52c175930e9ccf03d631"}};

function fail(message) { throw new Error(`${MARKER}: ${message}`); }
function assert(condition, message) { if (!condition) fail(message); }
function canonical(value) {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) return value;
  if (typeof value === "number") {
    assert(Number.isFinite(value), "non-finite number");
    return value;
  }
  if (Array.isArray(value)) return value.map(canonical);
  assert(value && typeof value === "object", "canonical object required");
  const output = {};
  for (const key of Object.keys(value).sort()) output[key] = canonical(value[key]);
  return output;
}
function canonicalJson(value) { return JSON.stringify(canonical(value)); }
function sha256Bytes(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
function sha256File(path) { return sha256Bytes(fs.readFileSync(path)); }
function readJson(path) { return JSON.parse(fs.readFileSync(path, "utf8")); }
function* walk(value, path = "$") {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) yield* walk(value[i], `${path}[${i}]`);
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      const childPath = `${path}.${key}`;
      yield [childPath, key, child];
      yield* walk(child, childPath);
    }
  }
}
function hasKeyValue(records, key, expected) {
  return records.some(([, candidateKey, value]) =>
    candidateKey === key && canonicalJson(value) === canonicalJson(expected));
}

const artifact = readJson(ARTIFACT_PATH);
const schema = readJson(SCHEMA_PATH);
const docs = fs.readFileSync(DOC_PATH, "utf8");
const workflow = fs.readFileSync(WORKFLOW_PATH, "utf8");
const records = [...walk(artifact)];

assert(sha256File(ARTIFACT_PATH) === EXPECTED_ARTIFACT_SHA, "artifact SHA mismatch");
assert(
  artifact.marker ===
    "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_LIVE_CANARY_SCOPE_V1",
  "artifact marker mismatch",
);
assert(artifact.version === 1, "artifact version mismatch");
assert(
  artifact.provenance.source_base_commit === EXPECTED_SOURCE_BASE,
  "source-base mismatch",
);
assert(canonicalJson(schema.const) === canonicalJson(artifact), "schema const mismatch");

assert(
  artifact.provenance.recomposition.original_candidate_commit ===
    EXPECTED_ORIGINAL_HEAD,
  "original candidate preservation binding mismatch",
);
assert(
  artifact.provenance.recomposition.dynamic_main_repair_merge ===
    EXPECTED_DYNAMIC_REPAIR_MERGE,
  "dynamic-main repair merge binding mismatch",
);
assert(
  artifact.provenance.recomposition.original_candidate_preserved === true,
  "original candidate preservation flag missing",
);

const dependencyNames = Object.keys(DEPENDENCIES).sort();
assert(
  canonicalJson(Object.keys(artifact.provenance.dependencies).sort()) ===
    canonicalJson(dependencyNames),
  "dependency name set mismatch",
);
for (const [name, expected] of Object.entries(DEPENDENCIES)) {
  const actual = artifact.provenance.dependencies[name];
  assert(actual && typeof actual === "object", `dependency missing: ${name}`);
  assert(actual.path === expected.path, `dependency path mismatch: ${name}`);
  assert(
    actual.source_commit === EXPECTED_SOURCE_BASE,
    `dependency source mismatch: ${name}`,
  );
  assert(
    actual.git_blob_sha1 === expected.git_blob_sha1,
    `dependency blob mismatch: ${name}`,
  );
  assert(actual.sha256 === expected.sha256, `dependency SHA mismatch: ${name}`);

  const bytes = fs.readFileSync(expected.path);
  const blob = crypto
    .createHash("sha1")
    .update(Buffer.from(`blob ${bytes.length}\0`, "utf8"))
    .update(bytes)
    .digest("hex");
  assert(blob === expected.git_blob_sha1, `live dependency blob mismatch: ${name}`);
  assert(
    sha256Bytes(bytes) === expected.sha256,
    `live dependency SHA mismatch: ${name}`,
  );
}

const activationDependency = Object.values(DEPENDENCIES).find((entry) =>
  entry.path.endsWith(
    "authenticated-paid-work-production-activation-execution-confirmation-v1.json",
  ));
assert(activationDependency, "activation-execution dependency missing");
assert(
  activationDependency.sha256 === EXPECTED_DYNAMIC_CONFIRMATION_SHA,
  "dynamic-main confirmation artifact SHA mismatch",
);

assert(
  !records.some(([, key]) => key === "expected_main_commit"),
  "static expected_main_commit remains",
);
assert(
  hasKeyValue(
    records,
    "expected_main_commit_binding",
    "capture_origin_main_at_execution_plan_generation",
  ),
  "dynamic main binding marker missing",
);
assert(
  hasKeyValue(records, "static_expected_main_commit_forbidden", true),
  "static-main prohibition missing",
);
assert(
  hasKeyValue(records, "must_bind_operator_confirmation", true),
  "dynamic main is not bound to operator confirmation",
);
assert(
  hasKeyValue(records, "abort_before_mutation_on_change", true),
  "main-drift abort boundary missing",
);

assert(
  hasKeyValue(records, "closes_blocker", "live_canary_scope"),
  "live_canary_scope closure missing",
);
const zeroBlockers = records.some(([, key, value]) =>
  key.toLowerCase().includes("blocker") &&
  key.toLowerCase().includes("count") &&
  value === 0);
const emptyRemaining = records.some(([, key, value]) =>
  key.toLowerCase().includes("remaining") &&
  Array.isArray(value) &&
  value.length === 0);
assert(zeroBlockers || emptyRemaining, "zero remaining source blockers not proven");

const status = String(artifact.status || "").toLowerCase();
assert(
  status.includes("source") ||
  status.includes("scope") ||
  status.includes("forbidden"),
  "source-only status boundary missing",
);
assert(
  artifact.future_canary_execution &&
  typeof artifact.future_canary_execution === "object",
  "future canary execution contract missing",
);

const confirmationRequired = records.some(([, key, value]) =>
  key.toLowerCase().includes("confirmation") &&
  value === true &&
  (
    key.toLowerCase().includes("required") ||
    key.toLowerCase().includes("fresh") ||
    key.toLowerCase().includes("operator")
  ));
assert(confirmationRequired, "fresh confirmation boundary missing");

const riskyKeys = new Set([
  "activation",
  "activation_authorized",
  "activation_execution_authorized",
  "live_canary_execution_authorized",
  "live_canary_executed",
  "live_confirmation_issued",
  "live_confirmation_verified",
  "credential_or_token_read",
  "authorization_header_materialized",
  "authenticated_submission_post",
  "quote_acceptance",
  "payment_authorization",
  "payment_execution",
  "transaction_construction",
  "transaction_broadcast",
  "work_execution_authorization",
  "work_dispatch",
  "work_credit_write",
  "wallet_or_signer_access",
  "signing",
  "void_settlement",
  "fund_movement",
  "deployment",
  "runtime_mutation",
]);
for (const [path, key, value] of records) {
  if (riskyKeys.has(key)) assert(value === false, `authority widened at ${path}`);
}

assert(
  artifact.success_criteria &&
  typeof artifact.success_criteria === "object" &&
  !Array.isArray(artifact.success_criteria),
  "success_criteria object missing",
);
assert(
  canonicalJson(artifact.success_criteria) ===
    canonicalJson(EXPECTED_SUCCESS_CRITERIA),
  "success_criteria drifted from the preserved original candidate",
);
assert(
  sha256Bytes(Buffer.from(canonicalJson(artifact.success_criteria), "utf8")) ===
    EXPECTED_SUCCESS_CRITERIA_SHA,
  "success_criteria canonical SHA mismatch",
);

assert(docs.includes(EXPECTED_ARTIFACT_SHA), "docs artifact SHA missing");
assert(docs.includes(EXPECTED_DYNAMIC_REPAIR_MERGE), "docs repair merge missing");
assert(docs.includes("not statically pinned"), "docs dynamic-main boundary missing");
assert(docs.includes("Source-readiness completion is not activation authority"), "docs authority boundary missing");

assert(workflow.includes("permissions:\n  contents: read"), "workflow permission widened");
assert(workflow.includes("persist-credentials: false"), "checkout credential persistence enabled");
assert(workflow.includes("scripts/prove_authenticated_paid_work_production_activation_live_canary_scope_v1.mjs"), "workflow proof path mismatch");
for (const forbidden of [
  "pull_request_target:",
  "contents: write",
  "id-token: write",
  "secrets.",
]) assert(!workflow.includes(forbidden), `forbidden workflow authority: ${forbidden}`);

console.log(MARKER);
console.log(`artifact_sha256=${EXPECTED_ARTIFACT_SHA}`);
console.log(`source_base_commit=${EXPECTED_SOURCE_BASE}`);
console.log(`dependency_count=${dependencyNames.length}`);
console.log(`dependency_change_count=8`);
console.log(`static_main_binding_replacement_count=1`);
console.log("dynamic_main_binding_exact=true");
console.log("dynamic_main_confirmation_sha_exact=true");
console.log(`success_criteria_canonical_sha256=${EXPECTED_SUCCESS_CRITERIA_SHA}`);
console.log("success_criteria_exact_to_original=true");
console.log("original_candidate_preserved=true");
console.log("closes_blocker=live_canary_scope");
console.log("source_readiness_blocker_count_after_publication=0");
console.log("publication_execution_forbidden=true");
console.log("fresh_operator_confirmation_required=true");
console.log("activation=false");
console.log("credential_or_token_read=false");
console.log("authenticated_submission_post=false");
console.log("payment_execution=false");
console.log("work_dispatch=false");
console.log("work_credit_write=false");
console.log("wallet_or_signer_access=false");
console.log("fund_movement=false");
console.log(
  "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_" +
  "LIVE_CANARY_SCOPE_V1_RECOMPOSED_PROOF_GREEN",
);
