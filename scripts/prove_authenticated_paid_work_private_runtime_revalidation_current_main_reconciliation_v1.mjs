#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");
const readJson = (relative) => JSON.parse(read(relative));
const PLAN_PATH = "config/activation-candidates/authenticated-paid-work-private-runtime-revalidation-plan-v1.json";
const RECONCILIATION_PATH = "config/activation-candidates/authenticated-paid-work-private-runtime-revalidation-current-main-reconciliation-v1.json";
const SCHEMA_PATH = "schemas/authenticated-paid-work-private-runtime-revalidation-current-main-reconciliation-v1.schema.json";
const WORKFLOW_PATH = ".github/workflows/authenticated-paid-work-private-runtime-revalidation-plan-v1.yml";
const ORIGINAL_PLAN_SHA256 = "19017e95bb521d5a077fe30aa96e2d23372c0dd1cdfb1c77270565756bc8ddca";
const RECONCILIATION_ID = "voidapwprmr1_e3d676f29fe53fd322a75e15c20b9dcc1208c16fe0c849ab48be2eac8a6ef35c";
const MARKER = "VOID_AUTHENTICATED_PAID_WORK_PRIVATE_RUNTIME_REVALIDATION_CURRENT_MAIN_RECONCILIATION_V1";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`;
}

function requireAncestor(ancestor) {
  const result = spawnSync(
    "git",
    ["merge-base", "--is-ancestor", ancestor, "HEAD"],
    { cwd: ROOT, encoding: "utf8" },
  );
  assert.equal(
    result.status,
    0,
    `required commit is not an ancestor of HEAD: ${ancestor}`,
  );
}

const planRaw = read(PLAN_PATH);
const plan = JSON.parse(planRaw);
assert.equal(sha256(planRaw), ORIGINAL_PLAN_SHA256);
assert.equal(
  plan.marker,
  "VOID_AUTHENTICATED_PAID_WORK_PRIVATE_RUNTIME_REVALIDATION_PLAN_V1",
);
assert.equal(
  plan.decision.status,
  "HOLD_PENDING_PRIVATE_REPLACEMENT_ISSUANCE_AND_ROTATION",
);
assert.equal(plan.decision.execution_authorized, false);
assert.equal(plan.authority.credential_access_authorized, false);
assert.equal(plan.authority.service_restart_authorized, false);
assert.equal(plan.authority.work_credit_write_authorized, false);
assert.equal(plan.authority.wallet_or_signer_access_authorized, false);
assert.equal(plan.authority.transaction_broadcast_authorized, false);
assert.equal(plan.authority.fund_movement_authorized, false);

const reconciliation = readJson(RECONCILIATION_PATH);
assert.equal(reconciliation.reconciliation_id, RECONCILIATION_ID);
assert.equal(reconciliation.marker, MARKER);
assert.equal(
  reconciliation.protocol,
  "void-authenticated-paid-work-private-runtime-revalidation-current-main-reconciliation/1",
);
assert.equal(reconciliation.version, 1);
assert.equal(reconciliation.reconciled_at_utc, "2026-08-05T08:00:00.000Z");

const idBody = { ...reconciliation };
delete idBody.reconciliation_id;
assert.equal(
  reconciliation.reconciliation_id,
  `voidapwprmr1_${sha256(canonicalJson(idBody))}`,
);

assert.deepEqual(reconciliation.source, {
  reconciliation_source_main: "0a33693e23981457ebccde4d109571c49c9344ea",
  original_plan_commit: "fe5e6706d955b68d7758810d280569eaadb9ea4c",
  original_plan_parent: "68e3ef3a7c15cf5b3623555979766fadf8b670fe",
  original_plan_sha256: ORIGINAL_PLAN_SHA256,
  original_plan_marker: "VOID_AUTHENTICATED_PAID_WORK_PRIVATE_RUNTIME_REVALIDATION_PLAN_V1",
  post_expiry_recovery_pr: 975,
  post_expiry_recovery_merge_commit: "19a637eaa5d3c4986c922dea214a7c66ed824ca3",
  post_expiry_recovery_marker: "VOID_AUTHENTICATED_PAID_WORK_POST_EXPIRY_RECOVERY_PREPARATION_V1",
  runtime_listener_cgroup_binding_pr: 976,
  runtime_listener_cgroup_binding_merge_commit: "dfb74b694628d66aa943e20bc97b93dede9071ae",
  runtime_listener_cgroup_binding_marker: "VOID_AUTHENTICATED_PAID_WORK_RUNTIME_LISTENER_CGROUP_BINDING_V1",
});

for (const [key, expected] of Object.entries({
  original_plan_preserved_unchanged: true,
  post_expiry_recovery_contract_is_required: true,
  pre_expiry_runtime_receipt_can_no_longer_be_created: true,
  expired_credential_cannot_be_revalidated_as_current: true,
  canonical_issuance_plan_binding_required: true,
  rotation_plan_id_accepted_as_canonical_issuance_plan: false,
  listener_cgroup_binding_receipt_required: true,
  listener_cgroup_binding_receipt_sufficient_alone: false,
  replacement_credential_validity_required: true,
  trusted_context_binding_required: true,
  producer_authentication_required: true,
  replay_state_verification_required: true,
  fresh_zoso_confirmation_required: true,
})) {
  assert.equal(reconciliation.semantic_reconciliation[key], expected, key);
}

assert.deepEqual(reconciliation.required_composed_evidence, [
  "post_expiry_recovery_packet_voidapwperp1",
  "reviewed_canonical_issuance_plan_voidapwnlp1",
  "nimo_only_replacement_private_material_generation_receipt",
  "append_only_replacement_credential_registry_apply_receipt",
  "runtime_listener_cgroup_binding_receipt_voidapwrlcb1",
  "replacement_runtime_revalidation_receipt_voidapwrr1",
  "replacement_trusted_context_binding_voidapwrtcb1",
  "expired_old_binding_retirement_receipt",
  "replacement_single_active_wc_binding_closeout",
  "fresh_provider_and_requester_signatures",
  "fresh_quote_and_execution_plan_digests",
  "fresh_zoso_confirmation",
]);

assert.deepEqual(reconciliation.ordered_gates, [
  "verify_current_main_exact_and_original_plan_commit_ancestry",
  "verify_original_plan_bytes_and_sha256_unchanged",
  "verify_post_expiry_recovery_contract_merged_and_exact",
  "verify_runtime_listener_cgroup_binding_contract_merged_and_exact",
  "reject_expired_credential_for_current_runtime_revalidation",
  "require_post_expiry_recovery_packet",
  "require_reviewed_canonical_issuance_plan_binding",
  "obtain_separate_private_replacement_issuance_authorization",
  "generate_replacement_private_material_on_nimo_only",
  "review_and_apply_append_only_replacement_credential_registry_update",
  "collect_authenticated_listener_cgroup_binding_evidence",
  "compose_replacement_runtime_revalidation_and_trusted_context_evidence",
  "retire_expired_old_binding_with_durable_evidence",
  "bind_replacement_credential_and_verify_single_active_wc_binding",
  "capture_fresh_signatures_quote_execution_plan_and_zoso_confirmation",
  "make_separate_execution_readiness_decision",
]);

assert.equal(Object.keys(reconciliation.authority).length, 18);
for (const [key, value] of Object.entries(reconciliation.authority)) {
  assert.match(key, /_authorized$/);
  assert.equal(value, false, key);
}

assert.deepEqual(reconciliation.decision, {
  status: "HOLD_PENDING_CANONICAL_ISSUANCE_PLAN_PRIVATE_ROTATION_AND_COMPOSED_RUNTIME_REVALIDATION",
  current_main_reconciled: true,
  original_plan_source_complete: true,
  post_expiry_recovery_contract_merged: true,
  listener_cgroup_binding_contract_merged: true,
  canonical_issuance_plan_resolved: false,
  replacement_private_material_generated: false,
  replacement_registry_write_completed: false,
  listener_cgroup_binding_evidence_collected: false,
  replacement_runtime_revalidation_satisfied: false,
  trusted_context_binding_satisfied: false,
  old_binding_retired: false,
  replacement_binding_applied: false,
  execution_authorized: false,
  next_gate: "build_or_select_reviewed_canonical_issuance_plan_bound_to_post_expiry_recovery_packet",
});

requireAncestor("0a33693e23981457ebccde4d109571c49c9344ea");
requireAncestor("fe5e6706d955b68d7758810d280569eaadb9ea4c");
requireAncestor("19a637eaa5d3c4986c922dea214a7c66ed824ca3");
requireAncestor("dfb74b694628d66aa943e20bc97b93dede9071ae");

const postExpiryDoc = read(
  "docs/operations/authenticated-paid-work-post-expiry-recovery-preparation-v1.md",
);
assert.ok(postExpiryDoc.includes("VOID_AUTHENTICATED_PAID_WORK_POST_EXPIRY_RECOVERY_PREPARATION_V1"));
assert.ok(postExpiryDoc.includes("voidapwperp1_"));
assert.ok(postExpiryDoc.includes("HOLD_PENDING_CANONICAL_ISSUANCE_PLAN_BINDING_AND_PRIVATE_ROTATION"));
assert.ok(postExpiryDoc.includes("rotation_plan_id_not_accepted_as_canonical_issuance_plan=true"));

const listenerDoc = read(
  "docs/operations/authenticated-paid-work-runtime-listener-cgroup-binding-v1.md",
);
assert.ok(listenerDoc.includes("VOID_AUTHENTICATED_PAID_WORK_RUNTIME_LISTENER_CGROUP_BINDING_V1"));
assert.ok(listenerDoc.includes("voidapwrlcb1_"));
assert.ok(listenerDoc.includes("HOLD_PENDING_COMPOSED_RUNTIME_REVALIDATION"));
assert.ok(listenerDoc.includes("listener_cgroup_binding_verified=true"));
assert.ok(listenerDoc.includes("complete_runtime_revalidation_established=false"));

const schema = readJson(SCHEMA_PATH);
assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
assert.equal(schema.properties.reconciliation_id.const, RECONCILIATION_ID);
assert.equal(schema.properties.marker.const, MARKER);
assert.equal(
  schema.properties.source.properties.reconciliation_source_main.const,
  "0a33693e23981457ebccde4d109571c49c9344ea",
);
assert.equal(
  schema.properties.decision.properties.status.const,
  reconciliation.decision.status,
);
assert.equal(schema.properties.authority.minProperties, 18);
assert.equal(schema.properties.authority.maxProperties, 18);

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
  assert.ok(workflow.includes(required), `workflow missing ${required}`);
}
assert.equal(workflow.includes("workflow_dispatch"), false);
assert.equal(workflow.includes("contents: write"), false);

console.log(JSON.stringify({
  marker: MARKER,
  reconciliation_id: RECONCILIATION_ID,
  current_main: reconciliation.source.reconciliation_source_main,
  original_plan_sha256: ORIGINAL_PLAN_SHA256,
  original_plan_preserved_unchanged: true,
  post_expiry_recovery_contract_merged: true,
  runtime_listener_cgroup_binding_contract_merged: true,
  canonical_issuance_plan_resolved: false,
  private_rotation_authorized: false,
  service_restart_authorized: false,
  paid_work_submission_authorized: false,
  work_credit_write_authorized: false,
  wallet_or_signer_access_authorized: false,
  transaction_broadcast_authorized: false,
  fund_movement_authorized: false,
  decision: reconciliation.decision.status,
  status: "GREEN",
}, null, 2));
console.log(`${MARKER}_PROOF_GREEN`);
