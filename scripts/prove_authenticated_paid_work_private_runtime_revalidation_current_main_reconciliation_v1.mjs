import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();

const MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_PRIVATE_RUNTIME_REVALIDATION_CURRENT_MAIN_RECONCILIATION_V1";
const RECONCILIATION_ID = "voidapwprmr1_022752019bef74f733e97fc1ba114978a222cc7621b794193359d9831f2265ca";
const CURRENT_MAIN = "b724cb1bee1418bbfa5f8ad44974bebf4cd81c9e";
const PREVIOUS_MAIN = "dc0e3bc8edb5708dcd99d6577f80d04721ad3043";
const PR984_REVIEWED_HEAD = "ec214dc27a55b96abec2e3e7be336bf29890bb1c";
const PR984_MERGE = "7dc10098a87dee5e27a558ef73a5ea3c52479f99";
const PR984_PARENT = "0a33693e23981457ebccde4d109571c49c9344ea";
const PR984_SUBJECT = "feat: add private runtime revalidation plan v1 (#984)";
const HISTORICAL_FEATURE_COMMIT =
  "fe5e6706d955b68d7758810d280569eaadb9ea4c";
const ORIGINAL_PLAN_SHA256 =
  "19017e95bb521d5a077fe30aa96e2d23372c0dd1cdfb1c77270565756bc8ddca";

const PR991_MERGE = "b724cb1bee1418bbfa5f8ad44974bebf4cd81c9e";
const PR991_PARENT = "dc0e3bc8edb5708dcd99d6577f80d04721ad3043";
const PR991_REVIEWED_HEAD = "874bdd53eccb39e42e6a4dbf798cf3d28eca1b03";
const PR991_SUBJECT = "feat: bind paid-work canonical issuance plan v1 (#991)";
const CANONICAL_PLAN_ID = "voidapwnlp1_3ae7ca2e7275d8aa323bca06d0cb2a931a7d6fd31c80f6501ce8d84bed6c0fe5";
const PLAN_BOUND_RECONCILIATION_ID =
  "voidapwprmr1_e3d676f29fe53fd322a75e15c20b9dcc1208c16fe0c849ab48be2eac8a6ef35c";
const CANONICAL_PLAN_FIXTURE_BLOB =
  "21dabcb3b205c27bdc83201dbe5e77fb2187137f";
const DECISION =
  "HOLD_PENDING_SANITIZED_REQUEST_MATERIALIZATION_PRIVATE_ROTATION_AND_COMPOSED_RUNTIME_REVALIDATION";

const PLAN_PATH =
  "config/activation-candidates/authenticated-paid-work-private-runtime-revalidation-plan-v1.json";
const RECONCILIATION_PATH =
  "config/activation-candidates/authenticated-paid-work-private-runtime-revalidation-current-main-reconciliation-v1.json";
const SCHEMA_PATH =
  "schemas/authenticated-paid-work-private-runtime-revalidation-current-main-reconciliation-v1.schema.json";
const DOC_PATH =
  "docs/operations/authenticated-paid-work-private-runtime-revalidation-plan-v1.md";
const SELF_PATH =
  "scripts/prove_authenticated_paid_work_private_runtime_revalidation_current_main_reconciliation_v1.mjs";
const WORKFLOW_PATH =
  ".github/workflows/authenticated-paid-work-private-runtime-revalidation-plan-v1.yml";
const CANONICAL_PLAN_PATH =
  "fixtures/agents/authenticated-paid-work-canonical-issuance-plan-binding-v1.example.json";
const CANONICAL_PLAN_PROOF_PATH =
  "scripts/prove_authenticated_paid_work_canonical_issuance_plan_binding_v1.mjs";

const EXPECTED = {
  "reconciliation_id": "voidapwprmr1_022752019bef74f733e97fc1ba114978a222cc7621b794193359d9831f2265ca",
  "marker": "VOID_AUTHENTICATED_PAID_WORK_PRIVATE_RUNTIME_REVALIDATION_CURRENT_MAIN_RECONCILIATION_V1",
  "protocol": "void-authenticated-paid-work-private-runtime-revalidation-current-main-reconciliation/1",
  "version": 1,
  "reconciled_at_utc": "2026-08-05T18:03:50.000Z",
  "source": {
    "reconciliation_source_main": "b724cb1bee1418bbfa5f8ad44974bebf4cd81c9e",
    "original_reconciliation_source_main": "0a33693e23981457ebccde4d109571c49c9344ea",
    "pr984": 984,
    "pr984_reviewed_head": "ec214dc27a55b96abec2e3e7be336bf29890bb1c",
    "pr984_squash_merge_commit": "7dc10098a87dee5e27a558ef73a5ea3c52479f99",
    "pr984_squash_merge_parent": "0a33693e23981457ebccde4d109571c49c9344ea",
    "pr984_merge_method": "squash",
    "original_plan_feature_commit": "fe5e6706d955b68d7758810d280569eaadb9ea4c",
    "original_plan_parent": "68e3ef3a7c15cf5b3623555979766fadf8b670fe",
    "original_plan_sha256": "19017e95bb521d5a077fe30aa96e2d23372c0dd1cdfb1c77270565756bc8ddca",
    "original_plan_marker": "VOID_AUTHENTICATED_PAID_WORK_PRIVATE_RUNTIME_REVALIDATION_PLAN_V1",
    "post_expiry_recovery_pr": 975,
    "post_expiry_recovery_merge_commit": "19a637eaa5d3c4986c922dea214a7c66ed824ca3",
    "post_expiry_recovery_marker": "VOID_AUTHENTICATED_PAID_WORK_POST_EXPIRY_RECOVERY_PREPARATION_V1",
    "runtime_listener_cgroup_binding_pr": 976,
    "runtime_listener_cgroup_binding_merge_commit": "dfb74b694628d66aa943e20bc97b93dede9071ae",
    "runtime_listener_cgroup_binding_marker": "VOID_AUTHENTICATED_PAID_WORK_RUNTIME_LISTENER_CGROUP_BINDING_V1",
    "previous_repair_base_main": "dc0e3bc8edb5708dcd99d6577f80d04721ad3043",
    "intervening_main_commit_count": 1,
    "intervening_main_changes_path_disjoint": true,
    "canonical_issuance_plan_binding_pr": 991,
    "canonical_issuance_plan_binding_reviewed_head": "874bdd53eccb39e42e6a4dbf798cf3d28eca1b03",
    "canonical_issuance_plan_binding_merge_commit": "b724cb1bee1418bbfa5f8ad44974bebf4cd81c9e",
    "canonical_issuance_plan_binding_marker": "VOID_AUTHENTICATED_PAID_WORK_CANONICAL_ISSUANCE_PLAN_BINDING_V1",
    "canonical_issuance_plan_fixture_path": "fixtures/agents/authenticated-paid-work-canonical-issuance-plan-binding-v1.example.json",
    "canonical_issuance_plan_fixture_blob_sha": "21dabcb3b205c27bdc83201dbe5e77fb2187137f",
    "canonical_issuance_plan_id": "voidapwnlp1_3ae7ca2e7275d8aa323bca06d0cb2a931a7d6fd31c80f6501ce8d84bed6c0fe5",
    "canonical_issuance_plan_bound_private_runtime_reconciliation_id": "voidapwprmr1_e3d676f29fe53fd322a75e15c20b9dcc1208c16fe0c849ab48be2eac8a6ef35c"
  },
  "semantic_reconciliation": {
    "original_plan_preserved_unchanged": true,
    "pr984_squash_merge_model_verified": true,
    "original_plan_feature_commit_is_historical_non_main_ancestry": true,
    "original_plan_feature_commit_required_as_main_ancestor": false,
    "reviewed_pr_head_required_as_main_ancestor": false,
    "pr984_squash_merge_commit_required_as_main_ancestor": true,
    "original_plan_blob_preserved_in_squash_merge": true,
    "post_expiry_recovery_contract_is_required": true,
    "pre_expiry_runtime_receipt_can_no_longer_be_created": true,
    "expired_credential_cannot_be_revalidated_as_current": true,
    "canonical_issuance_plan_binding_required": true,
    "rotation_plan_id_accepted_as_canonical_issuance_plan": false,
    "listener_cgroup_binding_receipt_required": true,
    "listener_cgroup_binding_receipt_sufficient_alone": false,
    "replacement_credential_validity_required": true,
    "trusted_context_binding_required": true,
    "producer_authentication_required": true,
    "replay_state_verification_required": true,
    "fresh_zoso_confirmation_required": true,
    "intervening_main_changes_path_disjoint": true,
    "canonical_issuance_plan_binding_merged": true,
    "canonical_issuance_plan_resolved": true,
    "canonical_issuance_plan_bound_to_superseded_reconciliation_id": true,
    "canonical_issuance_plan_compatible_with_squash_merge_ancestry_repair": true,
    "source_request_contract_ready": true,
    "sanitized_request_materialization_required": true,
    "sanitized_request_materialized": false
  },
  "required_composed_evidence": [
    "post_expiry_recovery_packet_voidapwperp1",
    "canonical_issuance_plan_binding_voidapwnlp1_3ae7ca2e7275d8aa323bca06d0cb2a931a7d6fd31c80f6501ce8d84bed6c0fe5",
    "sanitized_canonical_issuance_request_materialization_receipt_voidapwcir1",
    "nimo_only_replacement_private_material_generation_receipt",
    "append_only_replacement_credential_registry_apply_receipt",
    "runtime_listener_cgroup_binding_receipt_voidapwrlcb1",
    "replacement_runtime_revalidation_receipt_voidapwrr1",
    "replacement_trusted_context_binding_voidapwrtcb1",
    "expired_old_binding_retirement_receipt",
    "replacement_single_active_wc_binding_closeout",
    "fresh_provider_and_requester_signatures",
    "fresh_quote_and_execution_plan_digests",
    "fresh_zoso_confirmation"
  ],
  "ordered_gates": [
    "verify_current_main_contains_pr984_squash_merge_and_exact_parent",
    "verify_original_plan_blob_and_sha256_preserved_without_feature_commit_ancestry",
    "verify_post_expiry_recovery_contract_merged_and_exact",
    "verify_runtime_listener_cgroup_binding_contract_merged_and_exact",
    "verify_canonical_issuance_plan_binding_pr991_merged_and_exact",
    "verify_canonical_plan_compatibility_with_squash_merge_ancestry_repair",
    "reject_expired_credential_for_current_runtime_revalidation",
    "require_post_expiry_recovery_packet",
    "require_exact_reviewed_canonical_issuance_plan_id",
    "obtain_separate_authorization_to_materialize_sanitized_canonical_issuance_request",
    "materialize_sanitized_canonical_issuance_request_without_private_material",
    "obtain_separate_private_replacement_issuance_authorization",
    "generate_replacement_private_material_on_nimo_only",
    "review_and_apply_append_only_replacement_credential_registry_update",
    "collect_authenticated_listener_cgroup_binding_evidence",
    "compose_replacement_runtime_revalidation_and_trusted_context_evidence",
    "retire_expired_old_binding_and_bind_replacement_with_single_active_wc_binding",
    "capture_fresh_signatures_quote_execution_plan_and_zoso_confirmation_then_make_separate_readiness_decision"
  ],
  "authority": {
    "private_runtime_survey_authorized": false,
    "credential_access_authorized": false,
    "private_material_generation_authorized": false,
    "credential_registry_write_authorized": false,
    "service_restart_authorized": false,
    "binding_retirement_authorized": false,
    "replacement_binding_authorized": false,
    "authentication_authorized": false,
    "paid_work_submission_authorized": false,
    "quote_acceptance_authorized": false,
    "payment_execution_authorized": false,
    "work_dispatch_authorized": false,
    "work_credit_write_authorized": false,
    "wallet_or_signer_access_authorized": false,
    "signing_authorized": false,
    "transaction_construction_authorized": false,
    "transaction_broadcast_authorized": false,
    "fund_movement_authorized": false
  },
  "decision": {
    "status": "HOLD_PENDING_SANITIZED_REQUEST_MATERIALIZATION_PRIVATE_ROTATION_AND_COMPOSED_RUNTIME_REVALIDATION",
    "current_main_reconciled": true,
    "squash_merge_ancestry_contract_repaired": true,
    "original_plan_source_complete": true,
    "post_expiry_recovery_contract_merged": true,
    "listener_cgroup_binding_contract_merged": true,
    "canonical_issuance_plan_resolved": true,
    "replacement_private_material_generated": false,
    "replacement_registry_write_completed": false,
    "listener_cgroup_binding_evidence_collected": false,
    "replacement_runtime_revalidation_satisfied": false,
    "trusted_context_binding_satisfied": false,
    "old_binding_retired": false,
    "replacement_binding_applied": false,
    "execution_authorized": false,
    "next_gate": "obtain_separate_authorization_to_materialize_sanitized_canonical_issuance_request",
    "canonical_issuance_plan_binding_merged": true,
    "canonical_issuance_plan_id": "voidapwnlp1_3ae7ca2e7275d8aa323bca06d0cb2a931a7d6fd31c80f6501ce8d84bed6c0fe5",
    "source_request_contract_ready": true,
    "sanitized_request_materialized": false
  }
};

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

function readBytes(relative) {
  return fs.readFileSync(path.join(root, relative));
}

function readJson(relative) {
  return JSON.parse(read(relative));
}

function git(args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function readAt(commit, relative) {
  return execFileSync("git", ["show", `${commit}:${relative}`], {
    cwd: root,
    encoding: null,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function readJsonAt(commit, relative) {
  return JSON.parse(readAt(commit, relative).toString("utf8"));
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function canonicalJson(value) {
  if (
    value === null
    || typeof value === "string"
    || typeof value === "number"
    || typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  return `{
    ${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}
  }`.replace(/\n\s*/g, "");
}

function requireAncestor(commit) {
  execFileSync("git", ["merge-base", "--is-ancestor", commit, "HEAD"], {
    cwd: root,
    stdio: ["ignore", "ignore", "pipe"],
  });
}

function stableDependencyProjection(value) {
  return {
    post_expiry_recovery_merge_commit:
      value.source.post_expiry_recovery_merge_commit,
    post_expiry_recovery_contract_is_required:
      value.semantic_reconciliation.post_expiry_recovery_contract_is_required,
    pre_expiry_runtime_receipt_can_no_longer_be_created:
      value.semantic_reconciliation
        .pre_expiry_runtime_receipt_can_no_longer_be_created,
    expired_credential_cannot_be_revalidated_as_current:
      value.semantic_reconciliation
        .expired_credential_cannot_be_revalidated_as_current,
    canonical_issuance_plan_binding_required:
      value.semantic_reconciliation.canonical_issuance_plan_binding_required,
    rotation_plan_id_accepted_as_canonical_issuance_plan:
      value.semantic_reconciliation
        .rotation_plan_id_accepted_as_canonical_issuance_plan,
    listener_cgroup_binding_receipt_required:
      value.semantic_reconciliation.listener_cgroup_binding_receipt_required,
    listener_cgroup_binding_receipt_sufficient_alone:
      value.semantic_reconciliation
        .listener_cgroup_binding_receipt_sufficient_alone,
    replacement_credential_validity_required:
      value.semantic_reconciliation.replacement_credential_validity_required,
    trusted_context_binding_required:
      value.semantic_reconciliation.trusted_context_binding_required,
    producer_authentication_required:
      value.semantic_reconciliation.producer_authentication_required,
    replay_state_verification_required:
      value.semantic_reconciliation.replay_state_verification_required,
    fresh_zoso_confirmation_required:
      value.semantic_reconciliation.fresh_zoso_confirmation_required,
    execution_authorized: value.decision.execution_authorized,
  };
}

assert.equal(git(["rev-parse", "HEAD"]), CURRENT_MAIN);
requireAncestor(CURRENT_MAIN);
requireAncestor(PREVIOUS_MAIN);
requireAncestor(PR984_MERGE);
requireAncestor("19a637eaa5d3c4986c922dea214a7c66ed824ca3");
requireAncestor("dfb74b694628d66aa943e20bc97b93dede9071ae");
requireAncestor(PR991_MERGE);

const reconciliation = readJson(RECONCILIATION_PATH);
assert.deepEqual(reconciliation, EXPECTED);
assert.equal(reconciliation.marker, MARKER);
assert.equal(reconciliation.reconciliation_id, RECONCILIATION_ID);

const body = structuredClone(reconciliation);
delete body.reconciliation_id;
assert.equal(
  `voidapwprmr1_${sha256(Buffer.from(canonicalJson(body), "utf8"))}`,
  RECONCILIATION_ID,
);

assert.equal(
  reconciliation.source.reconciliation_source_main,
  CURRENT_MAIN,
);
assert.equal(
  reconciliation.source.canonical_issuance_plan_binding_pr,
  991,
);
assert.equal(
  reconciliation.source.canonical_issuance_plan_binding_reviewed_head,
  PR991_REVIEWED_HEAD,
);
assert.equal(
  reconciliation.source.canonical_issuance_plan_binding_merge_commit,
  PR991_MERGE,
);
assert.equal(
  reconciliation.source.canonical_issuance_plan_id,
  CANONICAL_PLAN_ID,
);
assert.equal(
  reconciliation.source
    .canonical_issuance_plan_bound_private_runtime_reconciliation_id,
  PLAN_BOUND_RECONCILIATION_ID,
);

assert.equal(
  reconciliation.semantic_reconciliation
    .original_plan_feature_commit_required_as_main_ancestor,
  false,
);
assert.equal(
  reconciliation.semantic_reconciliation
    .reviewed_pr_head_required_as_main_ancestor,
  false,
);
assert.equal(
  reconciliation.semantic_reconciliation
    .pr984_squash_merge_commit_required_as_main_ancestor,
  true,
);
assert.equal(
  reconciliation.semantic_reconciliation
    .canonical_issuance_plan_binding_merged,
  true,
);
assert.equal(
  reconciliation.semantic_reconciliation.canonical_issuance_plan_resolved,
  true,
);
assert.equal(
  reconciliation.semantic_reconciliation
    .canonical_issuance_plan_bound_to_superseded_reconciliation_id,
  true,
);
assert.equal(
  reconciliation.semantic_reconciliation
    .canonical_issuance_plan_compatible_with_squash_merge_ancestry_repair,
  true,
);
assert.equal(
  reconciliation.semantic_reconciliation.source_request_contract_ready,
  true,
);
assert.equal(
  reconciliation.semantic_reconciliation.sanitized_request_materialized,
  false,
);
assert.equal(Object.keys(reconciliation.authority).length, 18);
assert.equal(
  Object.values(reconciliation.authority).every((value) => value === false),
  true,
);
assert.equal(reconciliation.decision.status, DECISION);
assert.equal(reconciliation.decision.canonical_issuance_plan_resolved, true);
assert.equal(reconciliation.decision.source_request_contract_ready, true);
assert.equal(reconciliation.decision.sanitized_request_materialized, false);
assert.equal(reconciliation.decision.execution_authorized, false);
assert.equal(
  reconciliation.decision.next_gate,
  "obtain_separate_authorization_to_materialize_sanitized_canonical_issuance_request",
);

const pr984Parents = git([
  "rev-list",
  "--parents",
  "-n",
  "1",
  PR984_MERGE,
]).split(/\s+/);
assert.deepEqual(pr984Parents, [PR984_MERGE, PR984_PARENT]);
assert.equal(git(["show", "-s", "--format=%s", PR984_MERGE]), PR984_SUBJECT);

const pr991Parents = git([
  "rev-list",
  "--parents",
  "-n",
  "1",
  PR991_MERGE,
]).split(/\s+/);
assert.deepEqual(pr991Parents, [PR991_MERGE, PR991_PARENT]);
assert.equal(git(["show", "-s", "--format=%s", PR991_MERGE]), PR991_SUBJECT);

const planBytes = readBytes(PLAN_PATH);
const mergedPlanBytes = readAt(PR984_MERGE, PLAN_PATH);
assert.equal(sha256(planBytes), ORIGINAL_PLAN_SHA256);
assert.equal(sha256(mergedPlanBytes), ORIGINAL_PLAN_SHA256);
assert.equal(Buffer.compare(planBytes, mergedPlanBytes), 0);

const canonicalPlan = readJson(CANONICAL_PLAN_PATH);
assert.equal(
  git(["rev-parse", `${PR991_MERGE}:${CANONICAL_PLAN_PATH}`]),
  CANONICAL_PLAN_FIXTURE_BLOB,
);
assert.equal(
  Buffer.compare(
    readBytes(CANONICAL_PLAN_PATH),
    readAt(PR991_MERGE, CANONICAL_PLAN_PATH),
  ),
  0,
);
assert.equal(
  canonicalPlan.marker,
  "VOID_AUTHENTICATED_PAID_WORK_CANONICAL_ISSUANCE_PLAN_BINDING_V1",
);
assert.equal(canonicalPlan.plan_id, CANONICAL_PLAN_ID);
assert.equal(
  canonicalPlan.evidence.private_runtime_reconciliation_id,
  PLAN_BOUND_RECONCILIATION_ID,
);
assert.equal(
  canonicalPlan.decision.status,
  "HOLD_PENDING_SANITIZED_REQUEST_MATERIALIZATION_AND_PRIVATE_ROTATION",
);
assert.equal(canonicalPlan.decision.canonical_issuance_plan_resolved, true);
assert.equal(canonicalPlan.decision.source_request_contract_ready, true);
assert.equal(canonicalPlan.decision.sanitized_request_materialized, false);
assert.equal(canonicalPlan.decision.execution_authorized, false);
assert.equal(Object.keys(canonicalPlan.authority).length, 24);
assert.equal(
  Object.values(canonicalPlan.authority).every((value) => value === false),
  true,
);

const superseded = readJsonAt(CURRENT_MAIN, RECONCILIATION_PATH);
assert.equal(
  superseded.reconciliation_id,
  PLAN_BOUND_RECONCILIATION_ID,
);
assert.deepEqual(
  stableDependencyProjection(reconciliation),
  stableDependencyProjection(superseded),
);
assert.equal(
  Object.values(superseded.authority).every((value) => value === false),
  true,
);

const schema = readJson(SCHEMA_PATH);
assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
assert.deepEqual(schema.const, EXPECTED);

const document = read(DOC_PATH);
for (const required of [
  RECONCILIATION_ID,
  CURRENT_MAIN,
  PR984_REVIEWED_HEAD,
  PR984_MERGE,
  PR984_PARENT,
  HISTORICAL_FEATURE_COMMIT,
  PR991_MERGE,
  PR991_REVIEWED_HEAD,
  CANONICAL_PLAN_ID,
  PLAN_BOUND_RECONCILIATION_ID,
  "original_plan_feature_commit_required_as_main_ancestor=false",
  "reviewed_pr_head_required_as_main_ancestor=false",
  "pr984_squash_merge_commit_required_as_main_ancestor=true",
  "canonical_issuance_plan_bound_to_superseded_reconciliation_id=true",
  "canonical_issuance_plan_compatible_with_squash_merge_ancestry_repair=true",
  "sanitized_request_materialized=false",
  "This proves the merged source content without asserting an impossible ancestry",
]) {
  assert.ok(document.includes(required), `document missing: ${required}`);
}

const workflow = read(WORKFLOW_PATH);
for (const required of [
  "actions/checkout@v6",
  "actions/setup-node@v6",
  'node-version: "22"',
  RECONCILIATION_PATH,
  SCHEMA_PATH,
  "node scripts/prove_authenticated_paid_work_private_runtime_revalidation_plan_v1.mjs",
  "node scripts/prove_authenticated_paid_work_private_runtime_revalidation_current_main_reconciliation_v1.mjs",
  "npm run typecheck",
  "permissions:\n  contents: read",
]) {
  assert.ok(workflow.includes(required), `workflow missing: ${required}`);
}
assert.equal(workflow.includes("contents: write"), false);
assert.equal(fs.existsSync(path.join(root, CANONICAL_PLAN_PROOF_PATH)), true);

const self = read(SELF_PATH);
assert.equal(
  self.includes(`requireAncestor("${HISTORICAL_FEATURE_COMMIT}")`),
  false,
);
assert.equal(
  self.includes(`requireAncestor("${PR984_REVIEWED_HEAD}")`),
  false,
);

function rejectMutation(mutator) {
  const candidate = structuredClone(reconciliation);
  mutator(candidate);
  assert.notDeepEqual(candidate, EXPECTED);
}

rejectMutation((candidate) => {
  candidate.semantic_reconciliation.canonical_issuance_plan_resolved = false;
});
rejectMutation((candidate) => {
  candidate.decision.sanitized_request_materialized = true;
});
rejectMutation((candidate) => {
  candidate.authority.credential_access_authorized = true;
});
rejectMutation((candidate) => {
  candidate.source.canonical_issuance_plan_id =
    "voidapwnlp1_" + "0".repeat(64);
});

console.log(JSON.stringify({
  marker: MARKER,
  reconciliation_id: RECONCILIATION_ID,
  current_main: CURRENT_MAIN,
  pr984_reviewed_head: PR984_REVIEWED_HEAD,
  pr984_squash_merge_commit: PR984_MERGE,
  pr984_squash_merge_parent: PR984_PARENT,
  historical_feature_commit: HISTORICAL_FEATURE_COMMIT,
  historical_feature_commit_required_as_main_ancestor: false,
  reviewed_pr_head_required_as_main_ancestor: false,
  squash_merge_commit_required_as_main_ancestor: true,
  pr991_squash_merge_commit: PR991_MERGE,
  pr991_reviewed_head: PR991_REVIEWED_HEAD,
  canonical_issuance_plan_id: CANONICAL_PLAN_ID,
  canonical_plan_bound_reconciliation_id: PLAN_BOUND_RECONCILIATION_ID,
  canonical_plan_compatible_with_squash_merge_repair: true,
  sanitized_request_materialized: false,
  original_plan_sha256: ORIGINAL_PLAN_SHA256,
  denied_authorities: 18,
  execution_authorized: false,
  decision: reconciliation.decision.status,
  status: "GREEN",
}, null, 2));

console.log(`${MARKER}_PROOF_GREEN`);
console.log(`${MARKER}_PROOF_GREEN=true`);
