#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_BUY_VOID_CUSTODY_ACCEPTED_ARCHIVE_BYTES_V1,
  VOID_BUY_VOID_CUSTODY_ACCEPTED_ARCHIVE_ID_V1,
  VOID_BUY_VOID_CUSTODY_ACCEPTED_ARCHIVE_SHA256_V1,
  VOID_BUY_VOID_CUSTODY_EXISTING_TARGET_REPLACEMENT_AUTHORITY_V1,
  VOID_BUY_VOID_CUSTODY_EXISTING_TARGET_REPLACEMENT_PLAN_V1,
  classifyVoidBuyVoidCustodyExistingTargetReplacementPlanV1,
} from "../tools/void-buy-allocation-custody-existing-target-replacement-plan-v1.mjs";

const archiveLock = JSON.parse(
  fs.readFileSync(
    "ops/security/buy-void-allocation-custody-runtime-install-archive-lock-v1.json",
    "utf8",
  ),
);

const observed = Object.freeze({
  host: "zoso-Precision-Tower-7810",
  target_path: "/opt/void-buy-allocation-custody-runtime-v1",
  target_exists: true,
  target_uid: 0,
  target_gid: 0,
  target_mode_octal: "0755",
  target_root_owned: true,
  target_group_world_writable: false,
  target_symlink: false,
  inventory_entries: 906,
  expected_runtime_file_matches: 2,
  expected_runtime_file_missing: 6,
  expected_runtime_file_mismatched: 2,
  expected_runtime_file_unreadable: 0,
  unexpected_entries: 897,
  opaque_unexpected_subtrees: 56,
  unsafe_owner_write_entries: 0,
  accepted_runtime_tree_exact: false,
  observed_status: "NONEMPTY_TARGET_NOT_EXACT_ACCEPTED_BUNDLE",
});

const positive =
  classifyVoidBuyVoidCustodyExistingTargetReplacementPlanV1(
    observed,
    archiveLock,
  );

assert.equal(positive.ok, true);
assert.equal(
  positive.status,
  "SOURCE_GUARDED_EXISTING_TARGET_REPLACEMENT_PLAN_GREEN",
);
assert.equal(
  positive.marker,
  VOID_BUY_VOID_CUSTODY_EXISTING_TARGET_REPLACEMENT_PLAN_V1,
);
assert.equal(positive.plan.replacement_required, true);
assert.equal(positive.plan.replacement_apply_authorized, false);
assert.equal(positive.plan.root_owned_same_filesystem_staging_required, true);
assert.equal(positive.plan.existing_target_rollback_preservation_required, true);
assert.equal(positive.plan.rollback_name_content_addressed_required, true);
assert.equal(positive.plan.no_clobber_required, true);
assert.equal(positive.plan.same_filesystem_rename_required, true);
assert.equal(positive.plan.fsync_before_and_after_transition_required, true);
assert.equal(positive.plan.post_transition_exact_tree_verification_required, true);
assert.equal(positive.plan.polkit_install_separate_gate_required, true);
assert.equal(positive.plan.polkit_live_denial_separate_gate_required, true);
assert.equal(positive.plan.service_start_separate_gate_required, true);

assert.equal(
  positive.dependencies.accepted_archive_id,
  VOID_BUY_VOID_CUSTODY_ACCEPTED_ARCHIVE_ID_V1,
);
assert.equal(
  positive.dependencies.accepted_archive_bytes,
  VOID_BUY_VOID_CUSTODY_ACCEPTED_ARCHIVE_BYTES_V1,
);
assert.equal(
  positive.dependencies.accepted_archive_sha256,
  VOID_BUY_VOID_CUSTODY_ACCEPTED_ARCHIVE_SHA256_V1,
);
assert.equal(positive.dependencies.node_path, "/usr/bin/node");
assert.equal(
  positive.dependencies.node_sha256,
  "fde6a4bf8d0562f7751d1a2d6cb9b417c4cfe107bbcb0aa3e9a24e125e348f48",
);
assert.equal(positive.dependencies.polkit_runtime_user, "void-buy-runtime");
assert.equal(
  positive.dependencies.polkit_rule_sha256,
  "43ffa6d96236b2f5bb9daedf4ddb74c9ec3a7c93eb60ebfe1b4808f01af1c8d7",
);

for (const mutate of [
  (x) => { x.target_exists = false; },
  (x) => { x.target_uid = 1000; },
  (x) => { x.target_gid = 1000; },
  (x) => { x.target_mode_octal = "0775"; },
  (x) => { x.target_root_owned = false; },
  (x) => { x.target_group_world_writable = true; },
  (x) => { x.target_symlink = true; },
  (x) => { x.inventory_entries = 0; },
  (x) => { x.expected_runtime_file_missing = 5; },
  (x) => { x.accepted_runtime_tree_exact = true; },
  (x) => { x.observed_status = "EXACT_ACCEPTED_BUNDLE"; },
  (x) => { x.unsafe_owner_write_entries = 1; },
  (x) => { x.opaque_unexpected_subtrees = 898; },
  (x) => { x.extra = true; },
]) {
  const candidate = structuredClone(observed);
  mutate(candidate);
  const result =
    classifyVoidBuyVoidCustodyExistingTargetReplacementPlanV1(
      candidate,
      archiveLock,
    );
  assert.equal(result.ok, false);
  assert.equal(result.status, "HOLD");
}

for (const mutate of [
  (x) => { x.archive_candidate_accepted = false; },
  (x) => { x.candidate_evidence.sha256 = "0".repeat(64); },
  (x) => { x.candidate_evidence.bytes += 1; },
  (x) => { x.candidate_evidence.runtime_file_count = 9; },
  (x) => { x.immutable_root_install = true; },
  (x) => { x.existing_target_replaced = true; },
  (x) => { x.production_gate_ready = true; },
  (x) => { x.funds_movement = true; },
]) {
  const candidate = structuredClone(archiveLock);
  mutate(candidate);
  const result =
    classifyVoidBuyVoidCustodyExistingTargetReplacementPlanV1(
      observed,
      candidate,
    );
  assert.equal(result.ok, false);
  assert.equal(result.status, "HOLD");
  assert.equal(result.reason, "custody_existing_target_archive_lock_invalid");
}

for (const [key, expected] of Object.entries({
  source_plan_only: true,
  accepted_archive_required: true,
  expected_node_profile_required: true,
  staged_runtime_polkit_profile_required: true,
  operator_evidence_authenticated: false,
  observation_time_bound: false,
  observation_freshness_proven: false,
  live_at_use_target_reverification_required: true,
  live_at_use_node_reverification_required: true,
  replacement_required: true,
  replacement_authorized: false,
  replacement_apply_authorized: false,
  existing_target_replaced: false,
  rollback_snapshot_created: false,
  rollback_deletion_authorized: false,
  filesystem_write: false,
  service_mutation: false,
  systemd_mutation: false,
  permission_mutation: false,
  runtime_integration: false,
  payment_acceptance: false,
  public_presale_activation: false,
  production_gate_ready: false,
  funds_movement: false,
})) {
  assert.equal(
    VOID_BUY_VOID_CUSTODY_EXISTING_TARGET_REPLACEMENT_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source = fs.readFileSync(
  "tools/void-buy-allocation-custody-existing-target-replacement-plan-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "node:child_process",
  "node:fs",
  "writeFile",
  "renameSync",
  "rmSync",
  "systemctl",
  "sudo ",
  "spawnSync",
  "execSync",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log("VOID_BUY_VOID_CUSTODY_EXISTING_TARGET_REPLACEMENT_PLAN_V1_GREEN");
console.log("current_observed_status=NONEMPTY_TARGET_NOT_EXACT_ACCEPTED_BUNDLE");
console.log("inventory_entries=906");
console.log("expected_runtime_file_matches=2");
console.log("expected_runtime_file_missing=6");
console.log("expected_runtime_file_mismatched=2");
console.log("unexpected_entries=897");
console.log("replacement_required=true");
console.log("replacement_authorized=false");
console.log("replacement_apply_authorized=false");
console.log("live_at_use_target_reverification_required=true");
console.log("live_at_use_node_reverification_required=true");
console.log("polkit_runtime_user=void-buy-runtime");
console.log("filesystem_write=false");
console.log("service_mutation=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
