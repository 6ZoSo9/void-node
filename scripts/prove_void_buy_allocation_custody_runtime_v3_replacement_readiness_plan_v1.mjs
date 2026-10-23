#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";

import {
  VOID_BUY_VOID_CUSTODY_RUNTIME_V3_REPLACEMENT_READINESS_PLAN_V1,
  PRESTATE_SOURCE,
  QUIESCENCE_SOURCE,
  PROCESS_REFERENCE_SOURCE,
  ACCEPTED_ARCHIVE_LOCK_V3,
  HISTORICAL_V1_REPLACEMENT_PLAN,
  NODE_BINARY_PROFILE_V1,
  POLKIT_PROFILE_V1,
  AUTHORITY,
  classifyVoidBuyVoidCustodyRuntimeV3ReplacementReadinessV1,
} from "../tools/void-buy-allocation-custody-runtime-v3-replacement-readiness-plan-v1.mjs";

const SOURCE =
  "tools/void-buy-allocation-custody-runtime-v3-replacement-readiness-plan-v1.mjs";
const EXPECTED_SOURCE_BLOB = "a1e405b3a08360c8b992eaf75bbc0dfbb1896ea8";

function gitBlob(bytes) {
  return crypto
    .createHash("sha1")
    .update(Buffer.concat([
      Buffer.from("blob " + bytes.length + "\0", "utf8"),
      bytes,
    ]))
    .digest("hex");
}

const sourceBytes = fs.readFileSync(SOURCE);
assert.equal(gitBlob(sourceBytes), EXPECTED_SOURCE_BLOB);

assert.equal(
  VOID_BUY_VOID_CUSTODY_RUNTIME_V3_REPLACEMENT_READINESS_PLAN_V1,
  "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_REPLACEMENT_READINESS_PLAN_V1",
);
assert.equal(PRESTATE_SOURCE.head, "7736a3a5c53da37448c357a5d98e4dad09f3f617");
assert.equal(
  PRESTATE_SOURCE.git_blob_sha1,
  "e32ebd94ad09cd80e03489079e74657aab159d7a",
);
assert.equal(
  QUIESCENCE_SOURCE.head,
  "b52752700e44dea447c0fda76c61bcf32228416e",
);
assert.equal(
  QUIESCENCE_SOURCE.git_blob_sha1,
  "90358ef1df3ecfa3daeee39452ffd025e9a8d86e",
);
assert.equal(
  PROCESS_REFERENCE_SOURCE.head,
  "7736a3a5c53da37448c357a5d98e4dad09f3f617",
);
assert.equal(
  PROCESS_REFERENCE_SOURCE.git_blob_sha1,
  "6bf476e3383b7b18966320df13b4041da9c8c11f",
);
assert.equal(
  ACCEPTED_ARCHIVE_LOCK_V3.git_blob_sha1,
  "edb4ea2b833373ab387762e45ba7da4032c860f3",
);
assert.equal(
  HISTORICAL_V1_REPLACEMENT_PLAN.git_blob_sha1,
  "425c2b68d96bd9122f0d55c11d4722360f5e19ca",
);
assert.equal(HISTORICAL_V1_REPLACEMENT_PLAN.authority_reused, false);
assert.equal(
  NODE_BINARY_PROFILE_V1.git_blob_sha1,
  "4d4d656bddf40de6f215be7b4b6e7cec62098036",
);
assert.equal(NODE_BINARY_PROFILE_V1.live_identity_verified, false);
assert.equal(
  POLKIT_PROFILE_V1.git_blob_sha1,
  "91470e0924910d57786390f4722d323f1cf7b89b",
);

for (const [key, value] of Object.entries(AUTHORITY)) {
  if (key === "source_plan_only" || key === "receipt_inputs_untrusted") {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const archiveLock = Object.freeze({
  git_blob_sha1: ACCEPTED_ARCHIVE_LOCK_V3.git_blob_sha1,
  sha256: ACCEPTED_ARCHIVE_LOCK_V3.sha256,
  archive_candidate_accepted: true,
});

function id(prefix, char) {
  return prefix + char.repeat(64);
}

function prestateReceipt(overrides = {}) {
  return {
    schema: PRESTATE_SOURCE.schema,
    marker: PRESTATE_SOURCE.marker,
    version: 1,
    prestate_id: id("voidbuycustodyprestate1_", "1"),
    archive_lock: archiveLock,
    prestate: {
      target: {
        state: "PRESENT_SCANNED",
        root: { dev: 11, ino: 22, mount_id: 33 },
        tree: { entries: 100 },
      },
      proposed_stage: { present: false },
      proposed_rollback: { present: false },
      same_filesystem_rename_candidate: true,
      rollback_rename_candidate: true,
      create_only_install_candidate: false,
    },
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
    install_target_selected: false,
    existing_target_replaced: false,
    runtime_integration: false,
    payment_acceptance: false,
    public_presale_activation: false,
    funds_movement: false,
    ...overrides,
  };
}

function quiescenceReceipt(overrides = {}) {
  return {
    schema: QUIESCENCE_SOURCE.schema,
    marker: QUIESCENCE_SOURCE.marker,
    version: 1,
    census_id: id("voidbuycustodyquiescence1_", "2"),
    archive_lock: archiveLock,
    service_observation: {
      service_quiescence_candidate: true,
      service_quiescence_proven: false,
      live_process_binding_checked: false,
      service_inactive_observed: true,
      socket_absent_observed: true,
      runtime_directory_absent_observed: true,
      daemon_reload_clear_observed: true,
      unit_state_safe_observed: true,
    },
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
    install_target_selected: false,
    existing_target_replaced: false,
    runtime_integration: false,
    payment_acceptance: false,
    public_presale_activation: false,
    funds_movement: false,
    ...overrides,
  };
}

function processReceipt(overrides = {}) {
  return {
    schema: PROCESS_REFERENCE_SOURCE.schema,
    marker: PROCESS_REFERENCE_SOURCE.marker,
    version: 1,
    census_id: id("voidbuycustodyprocref1_", "3"),
    archive_lock: archiveLock,
    target: {
      root_dev: 11,
      root_ino: 22,
      mount_id: 33,
      snapshot_matches_selected_attempt: true,
    },
    process: {
      current_uid_target_reference_absent_candidate: true,
      selected_target_snapshot_stable: true,
      selected_target_root_dev: 11,
      selected_target_root_ino: 22,
      selected_target_mount_id: 33,
      all_process_reference_absence_proven: false,
      privileged_all_process_scan: false,
      custody_principal_process_scan_performed: false,
      target_snapshot_stable_required: true,
      fd_table_stability_proven: false,
      mapping_set_stability_proven: false,
      live_at_use_reverification_required: true,
    },
    read_only: true,
    host_pid_namespace_external_lease_required: true,
    host_pid_namespace_lease_verified: true,
    host_pid_namespace_lease_revalidated_after_census: true,
    pid1_namespace_direct_read: false,
    host_mount_namespace_external_lease_required: true,
    host_mount_namespace_lease_verified: true,
    host_mount_namespace_lease_revalidated_after_census: true,
    pid1_mount_namespace_direct_read: false,
    host_namespace_lease_provenance_authenticated_by_census: false,
    target_resolved_in_host_mount_namespace: true,
    complete_proc_visibility_verified: true,
    proc_visibility_revalidated_after_census: true,
    retained_procfs_view_used: true,
    retained_procfs_view_revalidated_after_census: true,
    production_filesystem_write: false,
    root_execution_forbidden: true,
    target_snapshot_stable_required: true,
    fd_table_stability_proven: false,
    mapping_set_stability_proven: false,
    live_at_use_reverification_required: true,
    process_environment_read: false,
    process_arguments_read: false,
    proc_cmdline_read: false,
    proc_environ_read: false,
    proc_fd_target_text_read: false,
    proc_maps_path_text_retained: false,
    service_mutation: false,
    systemd_mutation: false,
    install_target_selected: false,
    replacement_apply_authorized: false,
    existing_target_replaced: false,
    runtime_integration: false,
    payment_acceptance: false,
    public_presale_activation: false,
    funds_movement: false,
    ...overrides,
  };
}

function classify(parts = {}) {
  return classifyVoidBuyVoidCustodyRuntimeV3ReplacementReadinessV1({
    prestate: parts.prestate ?? prestateReceipt(),
    quiescence: parts.quiescence ?? quiescenceReceipt(),
    process: parts.process ?? processReceipt(),
  });
}

const diagnosticGreen = classify();
assert.equal(
  diagnosticGreen.status,
  "HOLD_SOURCE_ONLY_REPLACEMENT_NOT_AUTHORIZED",
);
assert.match(
  diagnosticGreen.plan_id,
  /^voidbuycustodyreplaceplan1_[0-9a-f]{64}$/u,
);
assert.equal(
  diagnosticGreen.diagnostic.target_generation_consistent,
  true,
);
assert.equal(
  diagnosticGreen.diagnostic.diagnostic_inputs_complete,
  true,
);
assert.equal(diagnosticGreen.privileged_replacement_ready, false);
assert.equal(diagnosticGreen.replacement_apply_authorized, false);
assert.equal(
  diagnosticGreen.remaining_gates.includes(
    "PRIVILEGED_ALL_PROCESS_REFERENCE_ABSENCE_REQUIRED",
  ),
  true,
);
assert.equal(
  diagnosticGreen.remaining_gates.includes(
    "SERVICE_QUIESCENCE_PROOF_REQUIRED_AT_USE",
  ),
  true,
);
assert.equal(
  diagnosticGreen.remaining_gates.includes(
    "LIVE_NODE_BINARY_IDENTITY_VERIFICATION_REQUIRED",
  ),
  true,
);
assert.equal(
  diagnosticGreen.remaining_gates.includes(
    "EXPLICIT_REPLACEMENT_APPLY_AUTHORIZATION_REQUIRED",
  ),
  true,
);
assert.equal(diagnosticGreen.authority.replacement_apply_authorized, false);
assert.equal(diagnosticGreen.authority.funds_movement, false);

const mismatchedProcess = processReceipt({
  target: {
    root_dev: 11,
    root_ino: 999,
    mount_id: 33,
    snapshot_matches_selected_attempt: true,
  },
});
const mismatch = classify({ process: mismatchedProcess });
assert.equal(mismatch.diagnostic.target_generation_consistent, false);
assert.equal(mismatch.diagnostic.diagnostic_inputs_complete, false);
assert.equal(
  mismatch.remaining_gates.includes(
    "CROSS_RECEIPT_TARGET_GENERATION_MISMATCH",
  ),
  true,
);
assert.equal(mismatch.replacement_apply_authorized, false);

const notQuiet = quiescenceReceipt({
  service_observation: {
    ...quiescenceReceipt().service_observation,
    service_quiescence_candidate: false,
  },
});
const quietHold = classify({ quiescence: notQuiet });
assert.equal(quietHold.diagnostic.diagnostic_inputs_complete, false);
assert.equal(
  quietHold.remaining_gates.includes(
    "SERVICE_QUIESCENCE_CANDIDATE_REQUIRED",
  ),
  true,
);

const referenced = processReceipt({
  process: {
    ...processReceipt().process,
    current_uid_target_reference_absent_candidate: false,
  },
});
const referenceHold = classify({ process: referenced });
assert.equal(referenceHold.diagnostic.diagnostic_inputs_complete, false);
assert.equal(
  referenceHold.remaining_gates.includes(
    "CURRENT_UID_REFERENCE_ABSENCE_CANDIDATE_REQUIRED",
  ),
  true,
);

const collision = prestateReceipt({
  prestate: {
    ...prestateReceipt().prestate,
    proposed_stage: { present: true },
    rollback_rename_candidate: false,
  },
});
const collisionHold = classify({ prestate: collision });
assert.equal(collisionHold.diagnostic.diagnostic_inputs_complete, false);
assert.equal(
  collisionHold.remaining_gates.includes("STAGE_OR_ROLLBACK_NAME_COLLISION"),
  true,
);

for (const field of [
  "service_inactive_observed",
  "socket_absent_observed",
  "runtime_directory_absent_observed",
  "daemon_reload_clear_observed",
  "unit_state_safe_observed",
]) {
  const rejected = classify({
    quiescence: quiescenceReceipt({
      service_observation: {
        ...quiescenceReceipt().service_observation,
        [field]: false,
      },
    }),
  });
  assert.equal(
    rejected.status,
    "HOLD",
    "quiescence candidate support flip accepted: " + field,
  );
  assert.match(rejected.reason, /quiescence_candidate_support_invalid/u);
  assert.equal(rejected.replacement_apply_authorized, false);
}

const quiescenceOverclaim = quiescenceReceipt({
  service_observation: {
    ...quiescenceReceipt().service_observation,
    service_quiescence_proven: true,
  },
});
const quiescenceRejected = classify({ quiescence: quiescenceOverclaim });
assert.equal(quiescenceRejected.status, "HOLD");
assert.match(quiescenceRejected.reason, /quiescence_proof_overclaim/u);
assert.equal(quiescenceRejected.replacement_apply_authorized, false);

for (const [field, bad] of [
  ["selected_target_root_dev", 999],
  ["selected_target_root_ino", 999],
  ["selected_target_mount_id", 999],
]) {
  const rejected = classify({
    process: processReceipt({
      process: {
        ...processReceipt().process,
        [field]: bad,
      },
    }),
  });
  assert.equal(
    rejected.status,
    "HOLD",
    "selected process target identity mismatch accepted: " + field,
  );
  assert.match(rejected.reason, /process_selected_target_identity_mismatch/u);
  assert.equal(rejected.replacement_apply_authorized, false);
}

const processOverclaim = processReceipt({
  process: {
    ...processReceipt().process,
    all_process_reference_absence_proven: true,
  },
});
const processRejected = classify({ process: processOverclaim });
assert.equal(processRejected.status, "HOLD");
assert.match(processRejected.reason, /process_all_process_overclaim/u);
assert.equal(processRejected.replacement_apply_authorized, false);

const prestateContractFlips = Object.freeze({
  read_only: false,
  filesystem_explicit_write: true,
  filesystem_write_free: true,
  atime_write_possible: false,
  production_census_read_only: false,
  production_census_explicit_filesystem_write: true,
  production_census_filesystem_write_free: true,
  production_census_atime_write_possible: false,
  archive_extraction: true,
  permission_mutation: true,
  service_state_checked: true,
  service_mutation: true,
  live_process_binding_checked: true,
  process_environment_read: true,
  process_arguments_read: true,
  request_history_read: true,
  custody_data_read: true,
  credential_access: true,
  wallet_or_signer_access: true,
  install_target_selected: true,
  existing_target_replaced: true,
  runtime_integration: true,
  payment_acceptance: true,
  public_presale_activation: true,
  funds_movement: true,
});
for (const [field, bad] of Object.entries(prestateContractFlips)) {
  const rejected = classify({ prestate: prestateReceipt({ [field]: bad }) });
  assert.equal(rejected.status, "HOLD", "prestate contract flip accepted: " + field);
  assert.equal(rejected.replacement_apply_authorized, false);
}

const quiescenceContractFlips = Object.freeze({
  read_only: false,
  filesystem_write: true,
  systemd_show_only: false,
  systemd_mutation: true,
  daemon_reload: true,
  service_start: true,
  service_stop: true,
  service_restart: true,
  socket_connect: true,
  socket_unlink: true,
  process_environment_read: true,
  process_arguments_read: true,
  request_history_read: true,
  custody_data_read: true,
  credential_access: true,
  wallet_or_signer_access: true,
  install_target_selected: true,
  existing_target_replaced: true,
  runtime_integration: true,
  payment_acceptance: true,
  public_presale_activation: true,
  funds_movement: true,
});
for (const [field, bad] of Object.entries(quiescenceContractFlips)) {
  const rejected = classify({ quiescence: quiescenceReceipt({ [field]: bad }) });
  assert.equal(rejected.status, "HOLD", "quiescence contract flip accepted: " + field);
  assert.equal(rejected.replacement_apply_authorized, false);
}

const nestedProcessContractFlips = Object.freeze({
  target_snapshot_stable_required: false,
  fd_table_stability_proven: true,
  mapping_set_stability_proven: true,
  live_at_use_reverification_required: false,
});
for (const [field, bad] of Object.entries(nestedProcessContractFlips)) {
  const rejected = classify({
    process: processReceipt({
      process: {
        ...processReceipt().process,
        [field]: bad,
      },
    }),
  });
  assert.equal(
    rejected.status,
    "HOLD",
    "nested process contract flip accepted: " + field,
  );
  assert.equal(rejected.replacement_apply_authorized, false);
}

const processContractFlips = Object.freeze({
  read_only: false,
  pid1_namespace_direct_read: true,
  pid1_mount_namespace_direct_read: true,
  host_namespace_lease_provenance_authenticated_by_census: true,
  proc_visibility_revalidated_after_census: false,
  retained_procfs_view_used: false,
  production_filesystem_write: true,
  root_execution_forbidden: false,
  process_environment_read: true,
  process_arguments_read: true,
  proc_cmdline_read: true,
  proc_environ_read: true,
  proc_fd_target_text_read: true,
  proc_maps_path_text_retained: true,
  service_mutation: true,
  systemd_mutation: true,
  install_target_selected: true,
  replacement_apply_authorized: true,
  existing_target_replaced: true,
  runtime_integration: true,
  payment_acceptance: true,
  public_presale_activation: true,
  funds_movement: true,
});
for (const [field, bad] of Object.entries(processContractFlips)) {
  const rejected = classify({ process: processReceipt({ [field]: bad }) });
  assert.equal(rejected.status, "HOLD", "process contract flip accepted: " + field);
  assert.equal(rejected.replacement_apply_authorized, false);
}

const injected = classifyVoidBuyVoidCustodyRuntimeV3ReplacementReadinessV1({
  prestate: prestateReceipt(),
  quiescence: quiescenceReceipt(),
  process: processReceipt(),
  replacement_apply_authorized: true,
});
assert.equal(injected.status, "HOLD");
assert.equal(injected.reason, "replacement_readiness_input_shape_invalid");
assert.equal(injected.replacement_apply_authorized, false);

const source = sourceBytes.toString("utf8");
for (const forbidden of [
  "node:fs",
  "node:child_process",
  "subprocess",
  "systemctl",
  "sudo ",
  "--apply",
  "replacement_apply_authorized: true",
  "funds_movement: true",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}
for (const required of [
  "diagnostic_inputs_complete",
  "target_generation_consistent",
  "PRIVILEGED_ALL_PROCESS_REFERENCE_ABSENCE_REQUIRED",
  "SERVICE_QUIESCENCE_PROOF_REQUIRED_AT_USE",
  "LIVE_NODE_BINARY_IDENTITY_VERIFICATION_REQUIRED",
  "ACCEPTED_ARCHIVE_BYTES_AT_USE_VERIFICATION_REQUIRED",
  "ROOT_OWNED_SAME_FILESYSTEM_STAGING_VERIFICATION_REQUIRED",
  "ROLLBACK_CRASH_RECOVERY_PROTOCOL_ACCEPTANCE_REQUIRED",
  "EXPLICIT_REPLACEMENT_APPLY_AUTHORIZATION_REQUIRED",
]) {
  assert.equal(source.includes(required), true, required);
}

console.log("VOID_BUY_VOID_CUSTODY_RUNTIME_V3_REPLACEMENT_READINESS_PLAN_V1_GREEN");
console.log("exact_source_blob_asserted=true");
console.log("prestate_source_bound=true");
console.log("quiescence_source_bound=true");
console.log("process_reference_source_bound=true");
console.log("host_pid_namespace_lease_required=true");
console.log("host_mount_namespace_lease_required=true");
console.log("target_bound_to_host_mount_namespace=true");
console.log("archive_lock_v3_bound=true");
console.log("historical_v1_plan_sequencing_only=true");
console.log("cross_receipt_target_generation_bound=true");
console.log("diagnostic_bundle_can_be_complete=true");
console.log("diagnostic_bundle_does_not_authorize_replacement=true");
console.log("forged_quiescence_proof_rejected=true");
console.log("forged_all_process_proof_rejected=true");
console.log("caller_apply_authority_injection_rejected=true");
console.log("receipt_contract_mutation_overclaims_rejected=true");
console.log("nested_process_contract_overclaims_rejected=true");
console.log("quiescence_candidate_support_observations_bound=true");
console.log("process_selected_attempt_identity_bound=true");
console.log("repaired_prestate_process_sources_bound=true");
console.log("privileged_all_process_reference_absence_required=true");
console.log("live_node_binary_identity_verification_required=true");
console.log("accepted_archive_bytes_at_use_verification_required=true");
console.log("rollback_protocol_acceptance_required=true");
console.log("replacement_apply_authorized=false");
console.log("service_mutation=false");
console.log("filesystem_write=false");
console.log("runtime_integration=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
