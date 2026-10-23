#!/usr/bin/env node
import { createHash } from "node:crypto";

export const VOID_BUY_VOID_CUSTODY_RUNTIME_V3_REPLACEMENT_READINESS_PLAN_V1 =
  "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_REPLACEMENT_READINESS_PLAN_V1";

export const PRESTATE_SOURCE = Object.freeze({
  head: "7736a3a5c53da37448c357a5d98e4dad09f3f617",
  path: "ops/precision/void_buy_allocation_custody_runtime_v3_install_prestate_census_v1.py",
  git_blob_sha1: "e32ebd94ad09cd80e03489079e74657aab159d7a",
  schema: "void_buy_void_custody_runtime_v3_install_prestate_census_v1",
  marker: "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_INSTALL_PRESTATE_CENSUS_V1",
});

export const QUIESCENCE_SOURCE = Object.freeze({
  head: "b52752700e44dea447c0fda76c61bcf32228416e",
  path: "ops/precision/void_buy_allocation_custody_runtime_v3_service_quiescence_census_v1.py",
  git_blob_sha1: "90358ef1df3ecfa3daeee39452ffd025e9a8d86e",
  schema: "void_buy_void_custody_runtime_v3_service_quiescence_census_v1",
  marker: "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_SERVICE_QUIESCENCE_CENSUS_V1",
});

export const PROCESS_REFERENCE_SOURCE = Object.freeze({
  head: "7736a3a5c53da37448c357a5d98e4dad09f3f617",
  path: "ops/precision/void_buy_allocation_custody_runtime_v3_process_reference_census_v1.py",
  git_blob_sha1: "6bf476e3383b7b18966320df13b4041da9c8c11f",
  schema: "void_buy_void_custody_runtime_v3_process_reference_census_v1",
  marker: "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROCESS_REFERENCE_CENSUS_V1",
});

export const ACCEPTED_ARCHIVE_LOCK_V3 = Object.freeze({
  path: "ops/security/buy-void-allocation-custody-runtime-install-archive-lock-v3.json",
  git_blob_sha1: "edb4ea2b833373ab387762e45ba7da4032c860f3",
  sha256: "ab96f16d93895b42c977fd26aef2c008115580e3ce31927275ed92986c86f8e7",
});

export const HISTORICAL_V1_REPLACEMENT_PLAN = Object.freeze({
  path: "tools/void-buy-allocation-custody-existing-target-replacement-plan-v1.mjs",
  git_blob_sha1: "425c2b68d96bd9122f0d55c11d4722360f5e19ca",
  sequencing_reference_only: true,
  authority_reused: false,
});

export const NODE_BINARY_PROFILE_V1 = Object.freeze({
  path: "tools/void-buy-allocation-custody-node-binary-profile-v1.mjs",
  git_blob_sha1: "4d4d656bddf40de6f215be7b4b6e7cec62098036",
  live_at_use_verification_required: true,
  live_identity_verified: false,
});

export const POLKIT_PROFILE_V1 = Object.freeze({
  path: "tools/void-buy-allocation-custody-polkit-deny-profile-v1.mjs",
  git_blob_sha1: "91470e0924910d57786390f4722d323f1cf7b89b",
  install_separate_gate_required: true,
  live_denial_separate_gate_required: true,
});

export const AUTHORITY = Object.freeze({
  source_plan_only: true,
  receipt_inputs_untrusted: true,
  diagnostic_receipts_authenticated: false,
  observation_freshness_proven: false,
  service_quiescence_proven: false,
  all_process_reference_absence_proven: false,
  live_node_binary_identity_verified: false,
  accepted_archive_bytes_verified_at_use: false,
  root_owned_same_filesystem_staging_verified: false,
  rollback_protocol_accepted: false,
  replacement_authorized: false,
  replacement_apply_authorized: false,
  existing_target_replaced: false,
  service_mutation: false,
  systemd_mutation: false,
  filesystem_write: false,
  permission_mutation: false,
  runtime_integration: false,
  payment_acceptance: false,
  public_presale_activation: false,
  production_gate_ready: false,
  funds_movement: false,
});

const HEX64 = /^[0-9a-f]{64}$/u;

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
  throw new Error("custody_v3_readiness_noncanonical_value");
}

function digest(value) {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

function object(value, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(code);
  }
  return value;
}

function bool(value, expected, code) {
  if (value !== expected) throw new Error(code);
}

function requireExactBooleanContract(value, prefix, contract) {
  for (const [key, expected] of Object.entries(contract)) {
    bool(value[key], expected, prefix + "_contract_invalid:" + key);
  }
}

function string(value, expected, code) {
  if (value !== expected) throw new Error(code);
}

function natural(value, code) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(code);
  return value;
}

function receiptId(value, prefix, code) {
  if (
    typeof value !== "string" ||
    !value.startsWith(prefix) ||
    !HEX64.test(value.slice(prefix.length))
  ) {
    throw new Error(code);
  }
  return value;
}

function requireCommonNoAuthority(value, prefix) {
  for (const key of [
    "install_target_selected",
    "existing_target_replaced",
    "runtime_integration",
    "payment_acceptance",
    "public_presale_activation",
    "funds_movement",
  ]) {
    bool(value[key], false, prefix + "_authority_not_false:" + key);
  }
}

function validateArchiveLock(value, prefix) {
  const lock = object(value, prefix + "_archive_lock_invalid");
  string(
    lock.git_blob_sha1,
    ACCEPTED_ARCHIVE_LOCK_V3.git_blob_sha1,
    prefix + "_archive_lock_blob_invalid",
  );
  string(
    lock.sha256,
    ACCEPTED_ARCHIVE_LOCK_V3.sha256,
    prefix + "_archive_lock_sha256_invalid",
  );
  bool(
    lock.archive_candidate_accepted,
    true,
    prefix + "_archive_not_accepted",
  );
}

function validatePrestate(raw) {
  const value = object(raw, "prestate_receipt_invalid");
  string(value.schema, PRESTATE_SOURCE.schema, "prestate_schema_invalid");
  string(value.marker, PRESTATE_SOURCE.marker, "prestate_marker_invalid");
  if (value.version !== 1) throw new Error("prestate_version_invalid");
  receiptId(value.prestate_id, "voidbuycustodyprestate1_", "prestate_id_invalid");
  validateArchiveLock(value.archive_lock, "prestate");
  requireExactBooleanContract(value, "prestate", {
    read_only: true,
    filesystem_explicit_write: false,
    filesystem_write_free: false,
    atime_write_possible: true,
    production_census_read_only: true,
    production_census_explicit_filesystem_write: false,
    production_census_filesystem_write_free: false,
    production_census_atime_write_possible: true,
    archive_extraction: false,
    permission_mutation: false,
    service_state_checked: false,
    service_mutation: false,
    live_process_binding_checked: false,
    process_environment_read: false,
    process_arguments_read: false,
    request_history_read: false,
    custody_data_read: false,
    credential_access: false,
    wallet_or_signer_access: false,
  });
  requireCommonNoAuthority(value, "prestate");

  const prestate = object(value.prestate, "prestate_body_invalid");
  const target = object(prestate.target, "prestate_target_invalid");
  if (!["ABSENT", "PRESENT_SCANNED"].includes(target.state)) {
    throw new Error("prestate_target_state_invalid");
  }
  const stage = object(prestate.proposed_stage, "prestate_stage_invalid");
  const rollback = object(
    prestate.proposed_rollback,
    "prestate_rollback_invalid",
  );
  if (typeof stage.present !== "boolean" || typeof rollback.present !== "boolean") {
    throw new Error("prestate_collision_shape_invalid");
  }

  let targetIdentity = null;
  if (target.state === "PRESENT_SCANNED") {
    const root = object(target.root, "prestate_target_root_invalid");
    natural(root.dev, "prestate_target_dev_invalid");
    natural(root.ino, "prestate_target_ino_invalid");
    natural(root.mount_id, "prestate_target_mount_id_invalid");
    targetIdentity = Object.freeze({
      dev: root.dev,
      ino: root.ino,
      mount_id: root.mount_id,
    });
  } else if (target.root !== null || target.tree !== null) {
    throw new Error("prestate_absent_target_identity_invalid");
  }

  return Object.freeze({
    id: value.prestate_id,
    target_state: target.state,
    target_identity: targetIdentity,
    stage_present: stage.present,
    rollback_present: rollback.present,
    rollback_rename_candidate: prestate.rollback_rename_candidate === true,
    create_only_install_candidate: prestate.create_only_install_candidate === true,
    same_filesystem_rename_candidate:
      prestate.same_filesystem_rename_candidate === true,
  });
}

function validateQuiescence(raw) {
  const value = object(raw, "quiescence_receipt_invalid");
  string(
    value.schema,
    QUIESCENCE_SOURCE.schema,
    "quiescence_schema_invalid",
  );
  string(
    value.marker,
    QUIESCENCE_SOURCE.marker,
    "quiescence_marker_invalid",
  );
  if (value.version !== 1) throw new Error("quiescence_version_invalid");
  receiptId(
    value.census_id,
    "voidbuycustodyquiescence1_",
    "quiescence_id_invalid",
  );
  validateArchiveLock(value.archive_lock, "quiescence");
  requireExactBooleanContract(value, "quiescence", {
    read_only: true,
    filesystem_write: false,
    systemd_show_only: true,
    systemd_mutation: false,
    daemon_reload: false,
    service_start: false,
    service_stop: false,
    service_restart: false,
    socket_connect: false,
    socket_unlink: false,
    process_environment_read: false,
    process_arguments_read: false,
    request_history_read: false,
    custody_data_read: false,
    credential_access: false,
    wallet_or_signer_access: false,
  });
  requireCommonNoAuthority(value, "quiescence");

  const observed = object(
    value.service_observation,
    "quiescence_observation_invalid",
  );
  bool(
    observed.service_quiescence_proven,
    false,
    "quiescence_proof_overclaim",
  );
  bool(
    observed.live_process_binding_checked,
    false,
    "quiescence_live_process_overclaim",
  );

  return Object.freeze({
    id: value.census_id,
    candidate: observed.service_quiescence_candidate === true,
    inactive: observed.service_inactive_observed === true,
    socket_absent: observed.socket_absent_observed === true,
    runtime_directory_absent:
      observed.runtime_directory_absent_observed === true,
    daemon_reload_clear: observed.daemon_reload_clear_observed === true,
    unit_state_safe: observed.unit_state_safe_observed === true,
  });
}

function validateProcess(raw) {
  const value = object(raw, "process_receipt_invalid");
  string(
    value.schema,
    PROCESS_REFERENCE_SOURCE.schema,
    "process_schema_invalid",
  );
  string(
    value.marker,
    PROCESS_REFERENCE_SOURCE.marker,
    "process_marker_invalid",
  );
  if (value.version !== 1) throw new Error("process_version_invalid");
  receiptId(value.census_id, "voidbuycustodyprocref1_", "process_id_invalid");
  validateArchiveLock(value.archive_lock, "process");
  requireExactBooleanContract(value, "process", {
    read_only: true,
    pid1_namespace_direct_read: false,
    pid1_mount_namespace_direct_read: false,
    host_namespace_lease_provenance_authenticated_by_census: false,
    proc_visibility_revalidated_after_census: true,
    retained_procfs_view_used: true,
    production_filesystem_write: false,
    root_execution_forbidden: true,
    process_environment_read: false,
    process_arguments_read: false,
    proc_cmdline_read: false,
    proc_environ_read: false,
    proc_fd_target_text_read: false,
    proc_maps_path_text_retained: false,
    service_mutation: false,
    systemd_mutation: false,
  });
  requireCommonNoAuthority(value, "process");
  bool(
    value.host_pid_namespace_external_lease_required,
    true,
    "process_external_lease_requirement_invalid",
  );
  bool(
    value.host_pid_namespace_lease_verified,
    true,
    "process_namespace_lease_unverified",
  );
  bool(
    value.host_pid_namespace_lease_revalidated_after_census,
    true,
    "process_namespace_lease_not_revalidated",
  );
  bool(
    value.host_mount_namespace_external_lease_required,
    true,
    "process_mount_namespace_lease_requirement_invalid",
  );
  bool(
    value.host_mount_namespace_lease_verified,
    true,
    "process_mount_namespace_lease_unverified",
  );
  bool(
    value.host_mount_namespace_lease_revalidated_after_census,
    true,
    "process_mount_namespace_lease_not_revalidated",
  );
  bool(
    value.target_resolved_in_host_mount_namespace,
    true,
    "process_target_not_bound_to_host_mount_namespace",
  );
  bool(
    value.complete_proc_visibility_verified,
    true,
    "process_proc_visibility_unverified",
  );
  bool(
    value.retained_procfs_view_revalidated_after_census,
    true,
    "process_procfs_view_not_revalidated",
  );
  bool(
    value.target_snapshot_stable_required,
    true,
    "process_target_stability_requirement_invalid",
  );
  bool(
    value.fd_table_stability_proven,
    false,
    "process_fd_table_overclaim",
  );
  bool(
    value.mapping_set_stability_proven,
    false,
    "process_mapping_set_overclaim",
  );
  bool(
    value.live_at_use_reverification_required,
    true,
    "process_live_reverification_not_required",
  );
  bool(
    value.replacement_apply_authorized,
    false,
    "process_replacement_authority_invalid",
  );

  const target = object(value.target, "process_target_invalid");
  natural(target.root_dev, "process_target_dev_invalid");
  natural(target.root_ino, "process_target_ino_invalid");
  natural(target.mount_id, "process_target_mount_id_invalid");
  bool(
    target.snapshot_matches_selected_attempt,
    true,
    "process_target_snapshot_binding_invalid",
  );
  const process = object(value.process, "process_body_invalid");
  requireExactBooleanContract(process, "process_body", {
    target_snapshot_stable_required: true,
    fd_table_stability_proven: false,
    mapping_set_stability_proven: false,
    live_at_use_reverification_required: true,
  });
  bool(
    process.all_process_reference_absence_proven,
    false,
    "process_all_process_overclaim",
  );
  bool(
    process.privileged_all_process_scan,
    false,
    "process_privileged_scan_overclaim",
  );
  bool(
    process.custody_principal_process_scan_performed,
    false,
    "process_custody_principal_overclaim",
  );

  return Object.freeze({
    id: value.census_id,
    target_identity: Object.freeze({
      dev: target.root_dev,
      ino: target.root_ino,
      mount_id: target.mount_id,
    }),
    current_uid_reference_absent_candidate:
      process.current_uid_target_reference_absent_candidate === true,
    selected_target_snapshot_stable:
      process.selected_target_snapshot_stable === true,
    host_pid_namespace_lease_verified: true,
    host_mount_namespace_lease_verified: true,
    target_resolved_in_host_mount_namespace: true,
    proc_visibility_verified: true,
  });
}

function identitiesEqual(a, b) {
  return (
    a !== null &&
    b !== null &&
    a.dev === b.dev &&
    a.ino === b.ino &&
    a.mount_id === b.mount_id
  );
}

export function classifyVoidBuyVoidCustodyRuntimeV3ReplacementReadinessV1(
  raw,
) {
  try {
    const input = object(raw, "replacement_readiness_input_invalid");
    const actualKeys = Object.keys(input).sort();
    const expectedKeys = ["prestate", "process", "quiescence"];
    if (
      actualKeys.length !== expectedKeys.length ||
      actualKeys.some((key, index) => key !== expectedKeys[index])
    ) {
      throw new Error("replacement_readiness_input_shape_invalid");
    }

    const prestate = validatePrestate(input.prestate);
    const quiescence = validateQuiescence(input.quiescence);
    const process = validateProcess(input.process);

    const targetGenerationConsistent =
      prestate.target_state === "PRESENT_SCANNED" &&
      identitiesEqual(prestate.target_identity, process.target_identity);

    const diagnosticInputsComplete =
      prestate.target_state === "PRESENT_SCANNED" &&
      prestate.rollback_rename_candidate &&
      prestate.same_filesystem_rename_candidate &&
      !prestate.stage_present &&
      !prestate.rollback_present &&
      quiescence.candidate &&
      process.current_uid_reference_absent_candidate &&
      process.selected_target_snapshot_stable &&
      targetGenerationConsistent;

    const blockers = [];
    if (prestate.target_state !== "PRESENT_SCANNED") {
      blockers.push("LEGACY_TARGET_PRESENT_PRESTATE_REQUIRED");
    }
    if (!prestate.rollback_rename_candidate) {
      blockers.push("ROLLBACK_RENAME_CANDIDATE_REQUIRED");
    }
    if (!prestate.same_filesystem_rename_candidate) {
      blockers.push("SAME_FILESYSTEM_RENAME_CANDIDATE_REQUIRED");
    }
    if (prestate.stage_present || prestate.rollback_present) {
      blockers.push("STAGE_OR_ROLLBACK_NAME_COLLISION");
    }
    if (!quiescence.candidate) {
      blockers.push("SERVICE_QUIESCENCE_CANDIDATE_REQUIRED");
    }
    if (!process.current_uid_reference_absent_candidate) {
      blockers.push("CURRENT_UID_REFERENCE_ABSENCE_CANDIDATE_REQUIRED");
    }
    if (!process.selected_target_snapshot_stable) {
      blockers.push("PROCESS_TARGET_SNAPSHOT_STABILITY_REQUIRED");
    }
    if (!targetGenerationConsistent) {
      blockers.push("CROSS_RECEIPT_TARGET_GENERATION_MISMATCH");
    }

    // These remain mandatory even when all three diagnostic receipts are green.
    blockers.push(
      "PRIVILEGED_ALL_PROCESS_REFERENCE_ABSENCE_REQUIRED",
      "SERVICE_QUIESCENCE_PROOF_REQUIRED_AT_USE",
      "LIVE_NODE_BINARY_IDENTITY_VERIFICATION_REQUIRED",
      "ACCEPTED_ARCHIVE_BYTES_AT_USE_VERIFICATION_REQUIRED",
      "ROOT_OWNED_SAME_FILESYSTEM_STAGING_VERIFICATION_REQUIRED",
      "ROLLBACK_CRASH_RECOVERY_PROTOCOL_ACCEPTANCE_REQUIRED",
      "POLKIT_INSTALL_AND_LIVE_DENIAL_SEPARATE_GATE_REQUIRED",
      "SERVICE_START_SEPARATE_GATE_REQUIRED",
      "EXPLICIT_REPLACEMENT_APPLY_AUTHORIZATION_REQUIRED",
    );

    const body = Object.freeze({
      schema: "void_buy_void_custody_runtime_v3_replacement_readiness_plan_v1",
      marker: VOID_BUY_VOID_CUSTODY_RUNTIME_V3_REPLACEMENT_READINESS_PLAN_V1,
      version: 1,
      status: "HOLD_SOURCE_ONLY_REPLACEMENT_NOT_AUTHORIZED",
      dependencies: Object.freeze({
        prestate_source: PRESTATE_SOURCE,
        quiescence_source: QUIESCENCE_SOURCE,
        process_reference_source: PROCESS_REFERENCE_SOURCE,
        accepted_archive_lock_v3: ACCEPTED_ARCHIVE_LOCK_V3,
        historical_v1_replacement_plan: HISTORICAL_V1_REPLACEMENT_PLAN,
        node_binary_profile_v1: NODE_BINARY_PROFILE_V1,
        polkit_profile_v1: POLKIT_PROFILE_V1,
      }),
      receipts: Object.freeze({
        prestate_id: prestate.id,
        quiescence_id: quiescence.id,
        process_reference_id: process.id,
      }),
      diagnostic: Object.freeze({
        prestate,
        quiescence,
        process,
        target_generation_consistent: targetGenerationConsistent,
        diagnostic_inputs_complete: diagnosticInputsComplete,
      }),
      remaining_gates: Object.freeze([...blockers]),
      privileged_replacement_ready: false,
      replacement_apply_authorized: false,
      authority: AUTHORITY,
    });

    return Object.freeze({
      ...body,
      plan_id: "voidbuycustodyreplaceplan1_" + digest(body),
    });
  } catch (error) {
    return Object.freeze({
      ok: false,
      status: "HOLD",
      marker: VOID_BUY_VOID_CUSTODY_RUNTIME_V3_REPLACEMENT_READINESS_PLAN_V1,
      reason: error instanceof Error ? error.message : String(error),
      privileged_replacement_ready: false,
      replacement_apply_authorized: false,
      authority: AUTHORITY,
    });
  }
}
