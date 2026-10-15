import crypto from "node:crypto";

import {
  inspectVoidBuyVoidCustodyNodeBinaryProfileV1,
} from "./void-buy-allocation-custody-node-binary-profile-v1.mjs";
import {
  inspectBuyVoidAllocationCustodyPolkitDenyProfileV1,
} from "./void-buy-allocation-custody-polkit-deny-profile-v1.mjs";

export const VOID_BUY_VOID_CUSTODY_EXISTING_TARGET_REPLACEMENT_PLAN_V1 =
  "VOID_BUY_VOID_CUSTODY_EXISTING_TARGET_REPLACEMENT_PLAN_V1";

export const VOID_BUY_VOID_CUSTODY_EXISTING_TARGET_PATH_V1 =
  "/opt/void-buy-allocation-custody-runtime-v1";

export const VOID_BUY_VOID_CUSTODY_EXISTING_TARGET_HOST_V1 =
  "zoso-Precision-Tower-7810";

export const VOID_BUY_VOID_CUSTODY_EXISTING_TARGET_STATUS_V1 =
  "NONEMPTY_TARGET_NOT_EXACT_ACCEPTED_BUNDLE";

export const VOID_BUY_VOID_CUSTODY_ACCEPTED_ARCHIVE_ID_V1 =
  "voidbuycustodyarchive1_5685b87bba1987b7365909eb4bd684b89695f7d5e1253d59dcd63ff390732333";

export const VOID_BUY_VOID_CUSTODY_ACCEPTED_ARCHIVE_SHA256_V1 =
  "1fec540e1bac3f728bfa438512a6e0149eea1cda2ae5f2a05f4ec9f19a5a5c9d";

export const VOID_BUY_VOID_CUSTODY_ACCEPTED_ARCHIVE_BYTES_V1 = 256000;

export const VOID_BUY_VOID_CUSTODY_ARCHIVE_LOCK_PATH_V1 =
  "ops/security/buy-void-allocation-custody-runtime-install-archive-lock-v1.json";

export const VOID_BUY_VOID_CUSTODY_ARCHIVE_LOCK_GIT_BLOB_V1 =
  "099e81e1185a1590eb987e4b231889c571af6f49";

export const VOID_BUY_VOID_CUSTODY_ARCHIVE_LOCK_BYTES_V1 = 2185;

export const VOID_BUY_VOID_CUSTODY_ARCHIVE_LOCK_SHA256_V1 =
  "4d0a169bbc1dec33a3ef72fa9b93ff2ae3fd42dae7ae197fda61bd6e91e7791b";

export const VOID_BUY_VOID_CUSTODY_EXISTING_TARGET_REPLACEMENT_AUTHORITY_V1 =
  Object.freeze({
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
  });

const TARGET_KEYS = Object.freeze([
  "host",
  "target_path",
  "target_exists",
  "target_uid",
  "target_gid",
  "target_mode_octal",
  "target_root_owned",
  "target_group_world_writable",
  "target_symlink",
  "inventory_entries",
  "expected_runtime_file_matches",
  "expected_runtime_file_missing",
  "expected_runtime_file_mismatched",
  "expected_runtime_file_unreadable",
  "unexpected_entries",
  "opaque_unexpected_subtrees",
  "unsafe_owner_write_entries",
  "accepted_runtime_tree_exact",
  "observed_status",
]);

function hold(reason) {
  return Object.freeze({
    ok: false,
    status: "HOLD",
    marker: VOID_BUY_VOID_CUSTODY_EXISTING_TARGET_REPLACEMENT_PLAN_V1,
    version: 1,
    reason,
    authority:
      VOID_BUY_VOID_CUSTODY_EXISTING_TARGET_REPLACEMENT_AUTHORITY_V1,
  });
}

function exactObject(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function natural(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function acceptedArchiveLock(raw) {
  if (!Buffer.isBuffer(raw)) return false;
  if (raw.length !== VOID_BUY_VOID_CUSTODY_ARCHIVE_LOCK_BYTES_V1) return false;
  const sha256 = crypto.createHash("sha256").update(raw).digest("hex");
  if (sha256 !== VOID_BUY_VOID_CUSTODY_ARCHIVE_LOCK_SHA256_V1) return false;
  const gitBlob = crypto
    .createHash("sha1")
    .update(Buffer.concat([
      Buffer.from("blob " + raw.length + "\0", "utf8"),
      raw,
    ]))
    .digest("hex");
  if (gitBlob !== VOID_BUY_VOID_CUSTODY_ARCHIVE_LOCK_GIT_BLOB_V1) return false;

  let lock;
  try {
    lock = JSON.parse(raw.toString("utf8"));
  } catch {
    return false;
  }
  if (!lock || typeof lock !== "object" || Array.isArray(lock)) return false;
  return (
    lock.marker === "VOID_BUY_VOID_CUSTODY_RUNTIME_INSTALL_ARCHIVE_LOCK_V1" &&
    lock.archive_candidate_accepted === true &&
    lock.candidate_evidence?.candidate_id ===
      VOID_BUY_VOID_CUSTODY_ACCEPTED_ARCHIVE_ID_V1 &&
    lock.candidate_evidence?.bytes ===
      VOID_BUY_VOID_CUSTODY_ACCEPTED_ARCHIVE_BYTES_V1 &&
    lock.candidate_evidence?.sha256 ===
      VOID_BUY_VOID_CUSTODY_ACCEPTED_ARCHIVE_SHA256_V1 &&
    lock.candidate_evidence?.runtime_file_count === 10 &&
    lock.immutable_root_install === false &&
    lock.existing_target_replaced === false &&
    lock.node_binary_identity_verified === false &&
    lock.runtime_integration === false &&
    lock.payment_acceptance === false &&
    lock.public_presale_activation === false &&
    lock.production_gate_ready === false &&
    lock.funds_movement === false
  );
}

export function classifyVoidBuyVoidCustodyExistingTargetReplacementPlanV1(
  observed,
  archiveLockRaw,
) {
  if (!exactObject(observed, TARGET_KEYS)) {
    return hold("custody_existing_target_observation_shape_invalid");
  }
  if (
    observed.host !== VOID_BUY_VOID_CUSTODY_EXISTING_TARGET_HOST_V1 ||
    observed.target_path !== VOID_BUY_VOID_CUSTODY_EXISTING_TARGET_PATH_V1
  ) {
    return hold("custody_existing_target_identity_invalid");
  }
  if (
    observed.target_exists !== true ||
    observed.target_uid !== 0 ||
    observed.target_gid !== 0 ||
    observed.target_mode_octal !== "0755" ||
    observed.target_root_owned !== true ||
    observed.target_group_world_writable !== false ||
    observed.target_symlink !== false
  ) {
    return hold("custody_existing_target_custody_invalid");
  }
  for (const key of [
    "inventory_entries",
    "expected_runtime_file_matches",
    "expected_runtime_file_missing",
    "expected_runtime_file_mismatched",
    "expected_runtime_file_unreadable",
    "unexpected_entries",
    "opaque_unexpected_subtrees",
    "unsafe_owner_write_entries",
  ]) {
    if (!natural(observed[key])) {
      return hold("custody_existing_target_count_invalid:" + key);
    }
  }
  if (observed.inventory_entries < 1) {
    return hold("custody_existing_target_inventory_empty");
  }
  if (
    observed.expected_runtime_file_matches +
      observed.expected_runtime_file_missing +
      observed.expected_runtime_file_mismatched +
      observed.expected_runtime_file_unreadable !==
    10
  ) {
    return hold("custody_existing_target_expected_runtime_count_invalid");
  }
  if (
    observed.accepted_runtime_tree_exact !== false ||
    observed.observed_status !==
      VOID_BUY_VOID_CUSTODY_EXISTING_TARGET_STATUS_V1
  ) {
    return hold("custody_existing_target_nonexact_status_invalid");
  }
  if (
    observed.expected_runtime_file_missing +
        observed.expected_runtime_file_mismatched +
        observed.expected_runtime_file_unreadable +
        observed.unexpected_entries <
      1 ||
    observed.unsafe_owner_write_entries !== 0 ||
    observed.opaque_unexpected_subtrees > observed.unexpected_entries
  ) {
    return hold("custody_existing_target_replacement_preconditions_invalid");
  }
  if (!acceptedArchiveLock(archiveLockRaw)) {
    return hold("custody_existing_target_archive_lock_invalid");
  }

  const nodeProfile = inspectVoidBuyVoidCustodyNodeBinaryProfileV1();
  if (
    nodeProfile.expected?.path !== "/usr/bin/node" ||
    nodeProfile.expected?.sha256 !==
      "fde6a4bf8d0562f7751d1a2d6cb9b417c4cfe107bbcb0aa3e9a24e125e348f48" ||
    nodeProfile.authority?.expected_node_binary_identity_selected !== true ||
    nodeProfile.authority?.live_at_use_reverification_required !== true ||
    nodeProfile.authority?.node_binary_identity_verified !== false
  ) {
    return hold("custody_existing_target_node_profile_invalid");
  }

  const polkitProfile = inspectBuyVoidAllocationCustodyPolkitDenyProfileV1();
  if (
    polkitProfile.runtime_user !== "void-buy-runtime" ||
    polkitProfile.rule_bytes !== 442 ||
    polkitProfile.rule_sha256 !==
      "43ffa6d96236b2f5bb9daedf4ddb74c9ec3a7c93eb60ebfe1b4808f01af1c8d7" ||
    polkitProfile.authority?.installed_rule_verified !== false ||
    polkitProfile.authority?.runtime_control_denial_live_verified !== false
  ) {
    return hold("custody_existing_target_polkit_profile_invalid");
  }

  return Object.freeze({
    ok: true,
    status: "SOURCE_GUARDED_EXISTING_TARGET_REPLACEMENT_PLAN_GREEN",
    marker: VOID_BUY_VOID_CUSTODY_EXISTING_TARGET_REPLACEMENT_PLAN_V1,
    version: 1,
    target: Object.freeze({ ...observed }),
    dependencies: Object.freeze({
      accepted_archive_lock_path: VOID_BUY_VOID_CUSTODY_ARCHIVE_LOCK_PATH_V1,
      accepted_archive_lock_git_blob:
        VOID_BUY_VOID_CUSTODY_ARCHIVE_LOCK_GIT_BLOB_V1,
      accepted_archive_lock_bytes: VOID_BUY_VOID_CUSTODY_ARCHIVE_LOCK_BYTES_V1,
      accepted_archive_lock_sha256:
        VOID_BUY_VOID_CUSTODY_ARCHIVE_LOCK_SHA256_V1,
      accepted_archive_id: VOID_BUY_VOID_CUSTODY_ACCEPTED_ARCHIVE_ID_V1,
      accepted_archive_bytes: VOID_BUY_VOID_CUSTODY_ACCEPTED_ARCHIVE_BYTES_V1,
      accepted_archive_sha256:
        VOID_BUY_VOID_CUSTODY_ACCEPTED_ARCHIVE_SHA256_V1,
      node_profile_id: nodeProfile.profile_id,
      node_path: nodeProfile.expected.path,
      node_sha256: nodeProfile.expected.sha256,
      polkit_profile_id: polkitProfile.profile_id,
      polkit_runtime_user: polkitProfile.runtime_user,
      polkit_rule_sha256: polkitProfile.rule_sha256,
    }),
    plan: Object.freeze({
      kind: "GUARDED_EXISTING_TARGET_REPLACEMENT_REQUIRED",
      replacement_required: true,
      accepted_archive_reverification_at_apply_required: true,
      live_target_reverification_at_apply_required: true,
      live_node_reverification_at_apply_required: true,
      service_absent_or_inactive_required: true,
      process_reference_census_required: true,
      root_owned_same_filesystem_staging_required: true,
      staged_tree_exact_verification_required: true,
      existing_target_rollback_preservation_required: true,
      rollback_name_content_addressed_required: true,
      no_clobber_required: true,
      same_filesystem_rename_required: true,
      fsync_before_and_after_transition_required: true,
      post_transition_exact_tree_verification_required: true,
      polkit_install_separate_gate_required: true,
      polkit_live_denial_separate_gate_required: true,
      service_start_separate_gate_required: true,
      replacement_apply_authorized: false,
    }),
    authority:
      VOID_BUY_VOID_CUSTODY_EXISTING_TARGET_REPLACEMENT_AUTHORITY_V1,
  });
}
