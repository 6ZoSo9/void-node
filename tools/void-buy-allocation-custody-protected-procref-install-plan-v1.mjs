#!/usr/bin/env node
import { createHash } from "node:crypto";

export const VOID_BUY_VOID_CUSTODY_PROTECTED_PROCREF_INSTALL_PLAN_V1 =
  "VOID_BUY_VOID_CUSTODY_PROTECTED_PROCREF_INSTALL_PLAN_V1";

export const REVIEWED_SOURCE = Object.freeze({
  repository: "6ZoSo9/void-node",
  head: "42c014ee961bfaa5c3159ebd3995e5626deb1b45",
  path:
    "ops/precision/" +
    "void_buy_allocation_custody_runtime_v3_" +
    "protected_all_process_reference_census_v1.py",
  git_blob_sha1: "20b0a1bae77ba5002cd07463c723e6bcd59ad57b",
  bytes: 65223,
  sha256:
    "45fe6ee500986da0ba87afcc4eec06256e97c3017cb13c5e0ccd74b7d3bebb34",
  marker:
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_" +
    "PROTECTED_ALL_PROCESS_REFERENCE_CENSUS_V1",
  schema:
    "void_buy_void_custody_runtime_v3_" +
    "protected_all_process_reference_census_v1",
});

export const INSTALL_CONTRACT = Object.freeze({
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

export const AUTHORITY = Object.freeze({
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
});

function holdInstallContract(reason) {
  return Object.freeze({
    ok: false,
    status: "HOLD",
    reason,
    install_authorized: false,
    filesystem_write: false,
    root_census_execution_authorized: false,
    replacement_apply_authorized: false,
  });
}

function exactInstallContractObject(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    return false;
  }
  const expectedKeys = Object.keys(INSTALL_CONTRACT).sort();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actualKeys = Reflect.ownKeys(descriptors);
  if (
    actualKeys.some((key) => typeof key !== "string") ||
    actualKeys.length !== expectedKeys.length ||
    actualKeys.slice().sort().some((key, index) => key !== expectedKeys[index])
  ) {
    return false;
  }
  for (const key of expectedKeys) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      !descriptor.enumerable ||
      !Object.hasOwn(descriptor, "value") ||
      descriptor.value !== INSTALL_CONTRACT[key]
    ) {
      return false;
    }
  }
  return true;
}

export function classifyVoidBuyVoidCustodyProtectedProcRefInstallContractV1(
  candidate,
) {
  if (!exactInstallContractObject(candidate)) {
    return holdInstallContract("custody_procref_install_contract_mismatch");
  }
  return Object.freeze({
    ok: true,
    status: "SOURCE_CONTRACT_GREEN_NOT_AUTHORIZED",
    install_parent_contract_complete: true,
    install_parent_descriptor_retention_required: true,
    install_parent_mount_identity_required: true,
    install_parent_ancestry_revalidation_required: true,
    install_parent_revalidation_before_publication_required: true,
    install_parent_revalidation_after_fsync_required: true,
    stage_directory_contract_complete: true,
    stage_descriptor_relative_creation_required: true,
    stage_parent_descriptor_retention_required: true,
    stage_same_mount_revalidation_required: true,
    stage_ancestry_revalidation_required: true,
    stage_revalidation_before_publication_required: true,
    install_authorized: false,
    filesystem_write: false,
    root_census_execution_authorized: false,
    replacement_apply_authorized: false,
  });
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map((key) =>
      JSON.stringify(key) + ":" + canonicalJson(value[key])
    ).join(",") + "}";
  }
  throw new Error("custody_procref_install_plan_noncanonical_value");
}

function digest(value) {
  return createHash("sha256")
    .update(canonicalJson(value), "utf8")
    .digest("hex");
}

export function buildVoidBuyVoidCustodyProtectedProcRefInstallPlanV1() {
  const body = Object.freeze({
    schema: "void_buy_void_custody_protected_procref_install_plan_v1",
    marker: VOID_BUY_VOID_CUSTODY_PROTECTED_PROCREF_INSTALL_PLAN_V1,
    version: 1,
    status: "HOLD_SOURCE_ONLY_NO_INSTALL_AUTHORITY",
    reviewed_source: REVIEWED_SOURCE,
    install_contract: INSTALL_CONTRACT,
    required_future_apply_sequence: Object.freeze([
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
    ]),
    separate_later_gates: Object.freeze([
      "PROTECTED_INSTALL_RECEIPT_EXTERNAL_REVIEW",
      "HOST_NAMESPACE_LEASE_EXTERNAL_REVIEW",
      "LIVE_ROOT_ALL_PROCESS_CENSUS",
      "SERVICE_QUIESCENCE_AT_USE",
      "LIVE_NODE_BINARY_IDENTITY",
      "ACCEPTED_ARCHIVE_BYTES_AT_USE",
      "ROLLBACK_CRASH_RECOVERY_PROTOCOL",
      "EXPLICIT_REPLACEMENT_APPLY_AUTHORIZATION",
    ]),
    authority: AUTHORITY,
  });
  return Object.freeze({
    ...body,
    plan_id: "voidbuycustodyprocrefinstallplan1_" + digest(body),
  });
}

function main(argv) {
  if (argv.length === 1 && argv[0] === "--help") {
    process.stdout.write(
      "VOID custody protected proc-ref install plan: --plan only; no install mode.\n",
    );
    return 0;
  }
  if (argv.length !== 1 || argv[0] !== "--plan") {
    process.stderr.write(
      "HOLD: source-only plan; valid mode is --plan.\n",
    );
    return 2;
  }
  process.stdout.write(
    JSON.stringify(buildVoidBuyVoidCustodyProtectedProcRefInstallPlanV1()) +
      "\n",
  );
  return 0;
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  process.exitCode = main(process.argv.slice(2));
}
