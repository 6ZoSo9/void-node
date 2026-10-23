#!/usr/bin/env node
import { createHash } from "node:crypto";

export const VOID_BUY_VOID_CUSTODY_PROTECTED_PROCREF_INSTALL_PLAN_V1 =
  "VOID_BUY_VOID_CUSTODY_PROTECTED_PROCREF_INSTALL_PLAN_V1";

export const REVIEWED_SOURCE = Object.freeze({
  repository: "6ZoSo9/void-node",
  head: "0fcd557319fbec6ffec78cb94a8fdeda41f67366",
  path:
    "ops/precision/" +
    "void_buy_allocation_custody_runtime_v3_" +
    "protected_all_process_reference_census_v1.py",
  git_blob_sha1: "25c0e32ae85da4569fb9521a0812e10ab0fcede3",
  bytes: 56180,
  sha256:
    "d87dc3c539d32aff9722b802ec4b172441e98095a5bcc5cd5edac868572b4e0a",
  marker:
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_" +
    "PROTECTED_ALL_PROCESS_REFERENCE_CENSUS_V1",
  schema:
    "void_buy_void_custody_runtime_v3_" +
    "protected_all_process_reference_census_v1",
});

export const INSTALL_CONTRACT = Object.freeze({
  install_parent: "/opt",
  protected_root: "/opt/void-buy-allocation-custody-procref-v1",
  protected_source:
    "/opt/void-buy-allocation-custody-procref-v1/" +
    "void_buy_allocation_custody_runtime_v3_" +
    "protected_all_process_reference_census_v1.py",
  stage_path: "/opt/.void-buy-allocation-custody-procref-v1.stage-v1",
  install_parent_uid: 0,
  install_parent_gid: 0,
  install_parent_group_world_writable: false,
  protected_root_uid: 0,
  protected_root_gid: 0,
  protected_root_mode: "0755",
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
  source_file_fsync_required: true,
  stage_directory_fsync_required: true,
  install_parent_fsync_required: true,
  post_install_exact_byte_reverification_required: true,
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
      "VERIFY_INSTALL_PARENT_ROOT_CUSTODY_AND_MOUNT",
      "REQUIRE_TARGET_AND_STAGE_NAMES_ABSENT",
      "MATERIALIZE_EXACT_BYTES_IN_ROOT_OWNED_SAME_FILESYSTEM_STAGE",
      "FSYNC_SOURCE_AND_STAGE_DIRECTORY",
      "REVERIFY_STAGED_BYTES_OWNER_MODE_NLINK_AND_ANCESTRY",
      "PUBLISH_WITH_RENAMEAT2_RENAME_NOREPLACE",
      "FSYNC_INSTALL_PARENT",
      "REVERIFY_INSTALLED_BYTES_OWNER_MODE_NLINK_AND_ANCESTRY",
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
