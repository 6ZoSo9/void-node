#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLAN_REL =
  "tools/void-buy-allocation-custody-protected-procref-install-plan-v1.mjs";
const PLAN = path.join(ROOT, PLAN_REL);
const REVIEWED_REL =
  "ops/precision/" +
  "void_buy_allocation_custody_runtime_v3_" +
  "protected_all_process_reference_census_v1.py";
const REVIEWED = path.join(ROOT, REVIEWED_REL);

const EXPECTED_PLAN_BLOB = "b65ee376331d08cdc1133d9b34fe438d979a02f2";
const EXPECTED_REVIEWED_BLOB =
  "20b0a1bae77ba5002cd07463c723e6bcd59ad57b";
const EXPECTED_REVIEWED_BYTES = 65223;
const EXPECTED_REVIEWED_SHA256 =
  "45fe6ee500986da0ba87afcc4eec06256e97c3017cb13c5e0ccd74b7d3bebb34";

function gitBlob(bytes) {
  return createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0", "ascii"))
    .update(bytes)
    .digest("hex");
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

const planBytes = readFileSync(PLAN);
const reviewedBytes = readFileSync(REVIEWED);

assert.equal(gitBlob(planBytes), EXPECTED_PLAN_BLOB);
assert.equal(gitBlob(reviewedBytes), EXPECTED_REVIEWED_BLOB);
assert.equal(reviewedBytes.length, EXPECTED_REVIEWED_BYTES);
assert.equal(sha256(reviewedBytes), EXPECTED_REVIEWED_SHA256);

const planModule = await import(pathToFileURL(PLAN).href);
assert.equal(
  planModule.VOID_BUY_VOID_CUSTODY_PROTECTED_PROCREF_INSTALL_PLAN_V1,
  "VOID_BUY_VOID_CUSTODY_PROTECTED_PROCREF_INSTALL_PLAN_V1",
);
assert.deepEqual(planModule.REVIEWED_SOURCE, {
  repository: "6ZoSo9/void-node",
  head: "42c014ee961bfaa5c3159ebd3995e5626deb1b45",
  path: REVIEWED_REL,
  git_blob_sha1: EXPECTED_REVIEWED_BLOB,
  bytes: EXPECTED_REVIEWED_BYTES,
  sha256: EXPECTED_REVIEWED_SHA256,
  marker:
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_" +
    "PROTECTED_ALL_PROCESS_REFERENCE_CENSUS_V1",
  schema:
    "void_buy_void_custody_runtime_v3_" +
    "protected_all_process_reference_census_v1",
});

assert.deepEqual(planModule.INSTALL_CONTRACT, {
  install_parent: "/opt",
  install_parent_directory: true,
  install_parent_symlink: false,
  install_parent_mount_id_bound_required: true,
  install_parent_descriptor_retained_through_publication_required: true,
  install_parent_direct_ancestry_required: true,
  install_parent_symlink_free_ancestry_required: true,
  install_parent_revalidation_before_publication_required: true,
  install_parent_revalidation_after_fsync_required: true,
  protected_root: "/opt/void-buy-allocation-custody-procref-v1",
  protected_source:
    "/opt/void-buy-allocation-custody-procref-v1/" +
    "void_buy_allocation_custody_runtime_v3_" +
    "protected_all_process_reference_census_v1.py",
  stage_path: "/opt/.void-buy-allocation-custody-procref-v1.stage-v1",
  stage_parent: "/opt",
  stage_uid: 0,
  stage_gid: 0,
  stage_mode: "0755",
  stage_group_world_writable: false,
  stage_nlink: 2,
  stage_expected_entry_count: 1,
  stage_source_name:
    "void_buy_allocation_custody_runtime_v3_" +
    "protected_all_process_reference_census_v1.py",
  stage_unexpected_entries_forbidden: true,
  stage_directory: true,
  stage_symlink: false,
  stage_same_mount_as_install_parent: true,
  stage_descriptor_relative_creation_required: true,
  stage_parent_descriptor_retained_through_publication_required: true,
  stage_descriptor_retained_through_publication_required: true,
  stage_direct_child_of_install_parent_required: true,
  stage_symlink_free_ancestry_required: true,
  stage_revalidation_before_publication_required: true,
  install_parent_uid: 0,
  install_parent_gid: 0,
  install_parent_group_world_writable: false,
  protected_root_uid: 0,
  protected_root_gid: 0,
  protected_root_mode: "0755",
  protected_root_expected_entry_count: 1,
  protected_root_unexpected_entries_forbidden: true,
  protected_source_uid: 0,
  protected_source_gid: 0,
  protected_source_mode: "0444",
  protected_source_nlink: 1,
  protected_source_regular_file: true,
  protected_source_symlink: false,
  publication_syscall: "renameat2",
  publication_flag: "RENAME_NOREPLACE",
  ordinary_rename_publication_forbidden: true,
});

const authority = planModule.AUTHORITY;
for (const [key, expected] of Object.entries({
  source_plan_only: true,
  reviewed_source_identity_selected: true,
  mutable_worktree_copy_authorized: false,
  exact_git_object_materialization_required: true,
  create_only_install_required: true,
  target_absence_required_before_apply: true,
  stage_absence_required_before_apply: true,
  no_clobber_required: true,
  atomic_noreplace_publication_required: true,
  renameat2_rename_noreplace_required: true,
  absence_precheck_is_not_publication_authority: true,
  root_owned_same_filesystem_staging_required: true,
  install_parent_exact_metadata_required: true,
  install_parent_directory_not_symlink_required: true,
  install_parent_mount_identity_required: true,
  install_parent_descriptor_retention_required: true,
  install_parent_ancestry_revalidation_required: true,
  install_parent_revalidation_before_publication_required: true,
  install_parent_revalidation_after_fsync_required: true,
  stage_directory_exact_metadata_required: true,
  stage_descriptor_relative_creation_required: true,
  stage_parent_descriptor_retention_required: true,
  stage_descriptor_retention_required: true,
  stage_exact_entry_set_required: true,
  stage_same_mount_revalidation_required: true,
  stage_ancestry_revalidation_required: true,
  stage_revalidation_before_publication_required: true,
  source_file_fsync_required: true,
  stage_directory_fsync_required: true,
  install_parent_fsync_required: true,
  post_install_exact_byte_reverification_required: true,
  post_install_exact_entry_set_required: true,
  post_install_ancestry_reverification_required: true,
  install_receipt_required: true,
  install_receipt_external_review_required: true,
  root_execution_required_at_apply: true,
  protected_source_install_authorized: false,
  protected_source_installed: false,
  root_census_execution_authorized: false,
  privileged_all_process_census_executed: false,
  filesystem_write: false,
  permission_mutation: false,
  service_mutation: false,
  systemd_mutation: false,
  runtime_integration: false,
  payment_acceptance: false,
  public_presale_activation: false,
  production_gate_ready: false,
  replacement_apply_authorized: false,
  funds_movement: false,
})) {
  assert.equal(authority[key], expected, key);
}

const first = planModule.buildVoidBuyVoidCustodyProtectedProcRefInstallPlanV1();
const second = planModule.buildVoidBuyVoidCustodyProtectedProcRefInstallPlanV1();
assert.deepEqual(first, second);
assert.equal(first.schema, "void_buy_void_custody_protected_procref_install_plan_v1");
assert.equal(
  first.marker,
  "VOID_BUY_VOID_CUSTODY_PROTECTED_PROCREF_INSTALL_PLAN_V1",
);
assert.equal(first.version, 1);
assert.equal(first.status, "HOLD_SOURCE_ONLY_NO_INSTALL_AUTHORITY");
assert.match(first.plan_id, /^voidbuycustodyprocrefinstallplan1_[0-9a-f]{64}$/);
assert.deepEqual(first.reviewed_source, planModule.REVIEWED_SOURCE);
assert.deepEqual(first.install_contract, planModule.INSTALL_CONTRACT);
assert.equal(first.authority, authority);

assert.deepEqual(first.required_future_apply_sequence, [
  "VERIFY_EXACT_REVIEWED_GIT_OBJECT_BYTES",
  "VERIFY_AND_RETAIN_INSTALL_PARENT_DIRECT_ROOT_ROOT_DIRECTORY_ANCESTRY_AND_MOUNT",
  "REQUIRE_TARGET_AND_STAGE_NAMES_ABSENT",
  "CREATE_STAGE_DIRECTORY_DESCRIPTOR_RELATIVE_ROOT_ROOT_MODE_0755",
  "REVALIDATE_STAGE_DIRECTORY_TYPE_OWNER_MODE_NLINK_MOUNT_ANCESTRY_AND_EMPTY_STATE",
  "MATERIALIZE_EXACT_BYTES_IN_ROOT_OWNED_SAME_FILESYSTEM_STAGE",
  "FSYNC_SOURCE_AND_STAGE_DIRECTORY",
  "REVERIFY_STAGE_DIRECTORY_EXACT_ENTRY_SET_AND_STAGED_BYTES_BEFORE_PUBLICATION",
  "REVALIDATE_INSTALL_PARENT_IDENTITY_MOUNT_AND_ANCESTRY_BEFORE_PUBLICATION",
  "PUBLISH_WITH_RENAMEAT2_RENAME_NOREPLACE",
  "FSYNC_INSTALL_PARENT",
  "REVALIDATE_INSTALL_PARENT_IDENTITY_MOUNT_AND_ANCESTRY_AFTER_FSYNC",
  "REVERIFY_INSTALLED_ROOT_EXACT_ENTRY_SET_BYTES_OWNER_MODE_NLINK_AND_ANCESTRY",
  "EMIT_CONTENT_ADDRESSED_INSTALL_RECEIPT",
  "STOP_BEFORE_ROOT_CENSUS_EXECUTION",
]);
const exactContract = planModule.classifyVoidBuyVoidCustodyProtectedProcRefInstallContractV1(
  planModule.INSTALL_CONTRACT,
);
assert.equal(exactContract.ok, true);
assert.equal(exactContract.status, "SOURCE_CONTRACT_GREEN_NOT_AUTHORIZED");
assert.equal(exactContract.install_parent_contract_complete, true);
assert.equal(exactContract.install_parent_descriptor_retention_required, true);
assert.equal(exactContract.install_parent_mount_identity_required, true);
assert.equal(exactContract.install_parent_ancestry_revalidation_required, true);
assert.equal(exactContract.install_parent_revalidation_before_publication_required, true);
assert.equal(exactContract.install_parent_revalidation_after_fsync_required, true);
assert.equal(exactContract.stage_directory_contract_complete, true);
assert.equal(exactContract.install_authorized, false);
assert.equal(exactContract.filesystem_write, false);
assert.equal(exactContract.root_census_execution_authorized, false);
assert.equal(exactContract.replacement_apply_authorized, false);

for (const key of Object.keys(planModule.INSTALL_CONTRACT)) {
  const missing = { ...planModule.INSTALL_CONTRACT };
  delete missing[key];
  const result =
    planModule.classifyVoidBuyVoidCustodyProtectedProcRefInstallContractV1(
      missing,
    );
  assert.equal(result.ok, false, "missing:" + key);
  assert.equal(result.status, "HOLD", "missing:" + key);
}

for (const [key, bad] of Object.entries({
  install_parent: "/tmp",
  install_parent_directory: false,
  install_parent_symlink: true,
  install_parent_mount_id_bound_required: false,
  install_parent_descriptor_retained_through_publication_required: false,
  install_parent_direct_ancestry_required: false,
  install_parent_symlink_free_ancestry_required: false,
  install_parent_revalidation_before_publication_required: false,
  install_parent_revalidation_after_fsync_required: false,
  install_parent_uid: 1,
  install_parent_gid: 1,
  install_parent_group_world_writable: true,
  stage_parent: "/tmp",
  stage_uid: 1,
  stage_gid: 1,
  stage_mode: "0775",
  stage_group_world_writable: true,
  stage_nlink: 3,
  stage_expected_entry_count: 2,
  stage_source_name: "unexpected.py",
  stage_unexpected_entries_forbidden: false,
  protected_root_expected_entry_count: 2,
  protected_root_unexpected_entries_forbidden: false,
  stage_directory: false,
  stage_symlink: true,
  stage_same_mount_as_install_parent: false,
  stage_descriptor_relative_creation_required: false,
  stage_parent_descriptor_retained_through_publication_required: false,
  stage_descriptor_retained_through_publication_required: false,
  stage_direct_child_of_install_parent_required: false,
  stage_symlink_free_ancestry_required: false,
  stage_revalidation_before_publication_required: false,
})) {
  const mutated = { ...planModule.INSTALL_CONTRACT, [key]: bad };
  const result =
    planModule.classifyVoidBuyVoidCustodyProtectedProcRefInstallContractV1(
      mutated,
    );
  assert.equal(result.ok, false, key);
  assert.equal(result.status, "HOLD", key);
  assert.equal(result.install_authorized, false, key);
}

const extra = { ...planModule.INSTALL_CONTRACT, surprise: true };
assert.equal(
  planModule.classifyVoidBuyVoidCustodyProtectedProcRefInstallContractV1(extra)
    .ok,
  false,
);

assert(first.separate_later_gates.includes("PROTECTED_INSTALL_RECEIPT_EXTERNAL_REVIEW"));
assert(first.separate_later_gates.includes("LIVE_ROOT_ALL_PROCESS_CENSUS"));
assert(first.separate_later_gates.includes("EXPLICIT_REPLACEMENT_APPLY_AUTHORIZATION"));

const sourceText = planBytes.toString("utf8");
for (const forbidden of [
  'from "node:fs"',
  "from 'node:fs'",
  'from "node:child_process"',
  "from 'node:child_process'",
  "writeFile",
  "mkdir",
  "chmod",
  "chown",
  "unlink",
  "rmSync",
  "systemctl",
  "sudo ",
  "--apply",
  "--install",
  "--execute",
]) {
  assert.equal(sourceText.includes(forbidden), false, forbidden);
}
assert.equal((sourceText.match(/from "node:crypto"/g) ?? []).length, 1);
assert(sourceText.includes("--plan only; no install mode"));
assert(sourceText.includes("valid mode is --plan"));
assert(sourceText.includes('publication_syscall: "renameat2"'));
assert(sourceText.includes('publication_flag: "RENAME_NOREPLACE"'));
assert(sourceText.includes("absence_precheck_is_not_publication_authority: true"));
assert(sourceText.includes("install_parent_directory: true"));
assert(sourceText.includes("install_parent_symlink: false"));
assert(sourceText.includes("install_parent_mount_id_bound_required: true"));
assert(sourceText.includes("install_parent_descriptor_retained_through_publication_required: true"));
assert(sourceText.includes("install_parent_direct_ancestry_required: true"));
assert(sourceText.includes("install_parent_symlink_free_ancestry_required: true"));
assert(sourceText.includes("install_parent_revalidation_before_publication_required: true"));
assert(sourceText.includes("install_parent_revalidation_after_fsync_required: true"));
assert(sourceText.includes('stage_mode: "0755"'));
assert(sourceText.includes("stage_group_world_writable: false"));
assert(sourceText.includes("stage_expected_entry_count: 1"));
assert(sourceText.includes("stage_unexpected_entries_forbidden: true"));
assert(sourceText.includes("protected_root_expected_entry_count: 1"));
assert(sourceText.includes("protected_root_unexpected_entries_forbidden: true"));
assert(sourceText.includes("stage_directory: true"));
assert(sourceText.includes("stage_symlink: false"));
assert(sourceText.includes("stage_nlink: 2"));
assert(sourceText.includes("stage_same_mount_as_install_parent: true"));
assert(sourceText.includes("stage_descriptor_relative_creation_required: true"));
assert(sourceText.includes("stage_parent_descriptor_retained_through_publication_required: true"));
assert(sourceText.includes("stage_descriptor_retained_through_publication_required: true"));
assert(sourceText.includes("stage_direct_child_of_install_parent_required: true"));
assert(sourceText.includes("stage_symlink_free_ancestry_required: true"));
assert(sourceText.includes("stage_revalidation_before_publication_required: true"));

const node = process.execPath;
function run(args) {
  return spawnSync(node, [PLAN, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    input: "",
    timeout: 10000,
    env: {
      PATH: "/usr/bin:/bin",
      HOME: "/nonexistent",
      LANG: "C",
      LC_ALL: "C",
    },
  });
}

const cliPlan = run(["--plan"]);
assert.equal(cliPlan.status, 0, cliPlan.stderr);
assert.equal(cliPlan.stderr, "");
assert.deepEqual(JSON.parse(cliPlan.stdout), first);

const cliHelp = run(["--help"]);
assert.equal(cliHelp.status, 0, cliHelp.stderr);
assert.match(cliHelp.stdout, /--plan only; no install mode/);

for (const invalidArgs of [
  [],
  ["--apply"],
  ["--install"],
  ["--execute"],
  ["--plan", "--apply"],
]) {
  const result = run(invalidArgs);
  assert.equal(result.status, 2, JSON.stringify(invalidArgs));
  assert.match(result.stderr, /HOLD: source-only plan/);
  assert.equal(result.stdout, "");
}

console.log("VOID_BUY_VOID_CUSTODY_PROTECTED_PROCREF_INSTALL_PLAN_V1_PROOF_GREEN");
console.log("exact_plan_source_blob=true");
console.log("reviewed_protected_source_blob_exact=true");
console.log("reviewed_protected_source_bytes_exact=true");
console.log("reviewed_protected_source_sha256_exact=true");
console.log("fixed_protected_install_paths_bound=true");
console.log("create_only_no_clobber_contract=true");
console.log("atomic_renameat2_noreplace_publication_required=true");
console.log("absence_precheck_not_publication_authority=true");
console.log("same_filesystem_root_staging_required=true");
console.log("install_parent_exact_metadata_bound=true");
console.log("install_parent_directory_not_symlink_bound=true");
console.log("install_parent_mount_id_bound=true");
console.log("install_parent_descriptor_retention_required=true");
console.log("install_parent_ancestry_revalidation_required=true");
console.log("install_parent_revalidation_before_publication_required=true");
console.log("install_parent_revalidation_after_fsync_required=true");
console.log("stage_directory_exact_metadata_bound=true");
console.log("stage_root_root_mode_0755_bound=true");
console.log("stage_group_world_writable_false_bound=true");
console.log("stage_nlink_2_bound=true");
console.log("stage_exact_single_entry_set_bound=true");
console.log("protected_root_exact_single_entry_set_bound=true");
console.log("stage_descriptor_relative_creation_required=true");
console.log("stage_parent_descriptor_retention_required=true");
console.log("stage_descriptor_retention_required=true");
console.log("stage_same_mount_revalidation_required=true");
console.log("stage_direct_ancestry_required=true");
console.log("stage_symlink_free_ancestry_required=true");
console.log("stage_revalidation_before_publication_required=true");
console.log("stage_contract_missing_field_rejected=true");
console.log("stage_contract_mutation_adversaries_rejected=true");
console.log("fsync_and_postinstall_reverification_required=true");
console.log("content_addressed_install_receipt_required=true");
console.log("install_receipt_external_review_required=true");
console.log("stop_before_root_census_required=true");
console.log("no_filesystem_module_import=true");
console.log("no_child_process_module_import_in_plan=true");
console.log("no_apply_install_execute_mode=true");
console.log("protected_source_install_authorized=false");
console.log("protected_source_installed=false");
console.log("root_census_execution_authorized=false");
console.log("privileged_all_process_census_executed=false");
console.log("filesystem_write=false");
console.log("service_mutation=false");
console.log("systemd_mutation=false");
console.log("replacement_apply_authorized=false");
console.log("runtime_integration=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
