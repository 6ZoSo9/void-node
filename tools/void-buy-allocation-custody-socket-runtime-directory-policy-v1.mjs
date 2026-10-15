#!/usr/bin/env node

export const VOID_BUY_VOID_CUSTODY_SOCKET_RUNTIME_DIRECTORY_POLICY_V1 =
  "VOID_BUY_VOID_CUSTODY_SOCKET_RUNTIME_DIRECTORY_POLICY_V1";

export const VOID_BUY_VOID_CUSTODY_SOCKET_RUNTIME_DIRECTORY_FRAGMENT_V1 =
  Object.freeze({
    systemd_manager: "system",
    service_user: "void-buy-custody",
    service_group: "void-buy-custody",
    ipc_group: "void-buy-custody-ipc",
    runtime_directory: "void-allocation-custody-v1",
    runtime_directory_path: "/run/void-allocation-custody-v1",
    runtime_directory_mode: "0750",
    runtime_directory_preserve: "no",
    supplementary_groups: Object.freeze(["void-buy-custody-ipc"]),
    exec_start_pre: Object.freeze([
      "/usr/bin/chgrp",
      "--",
      "void-buy-custody-ipc",
      "/run/void-allocation-custody-v1",
    ]),
    socket_path: "/run/void-allocation-custody-v1/custody.sock",
    socket_mode: "0660",
    protect_system: "strict",
    read_write_paths: Object.freeze([
      "/var/lib/void-allocation-custody-v1",
      "/var/lib/void-allocation-ledger-v1",
    ]),
  });

export const VOID_BUY_VOID_CUSTODY_SOCKET_RUNTIME_DIRECTORY_AUTHORITY_V1 =
  Object.freeze({
    source_policy_only: true,
    runtime_directory_mechanism_selected: true,
    distinct_ipc_group_required: true,
    custody_primary_group_preserved: true,
    supplementary_ipc_group_required: true,
    nonprivileged_prestart_group_transition_required: true,
    socket_parent_owner_uid_must_be_custody_uid: true,
    socket_parent_group_must_be_ipc_gid: true,
    socket_parent_mode_must_be_0750: true,
    socket_mode_must_be_0660: true,
    runtime_socket_parent_write_denied_required: true,
    service_socket_parent_write_required: true,
    existing_two_read_write_paths_preserved: true,
    third_read_write_path_added: false,
    systemd_socket_activation_used: false,
    host_account_membership_verified: false,
    host_runtime_directory_behavior_verified: false,
    host_exec_start_pre_verified: false,
    host_socket_bind_verified: false,
    host_socket_cleanup_verified: false,
    service_install: false,
    service_start: false,
    service_restart: false,
    systemd_mutation: false,
    permission_mutation: false,
    polkit_mutation: false,
    payment_acceptance: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const SAFE_NAME = /^[a-zA-Z0-9_.@-]{1,128}$/u;
const MODE = /^0[0-7]{3}$/u;

function hold(reason) {
  return Object.freeze({
    ok: false,
    status: "HOLD",
    marker: VOID_BUY_VOID_CUSTODY_SOCKET_RUNTIME_DIRECTORY_POLICY_V1,
    reason,
    runtime_directory_mechanism_selected: false,
    host_runtime_directory_behavior_verified: false,
    host_socket_bind_verified: false,
    production_gate_ready: false,
    authority: VOID_BUY_VOID_CUSTODY_SOCKET_RUNTIME_DIRECTORY_AUTHORITY_V1,
  });
}

function exactObject(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(code);
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new Error(code);
  }
  return value;
}

function exactString(value, expected, code) {
  if (value !== expected) throw new Error(code);
}

function safeName(value, code) {
  if (typeof value !== "string" || !SAFE_NAME.test(value)) {
    throw new Error(code);
  }
  return value;
}

function exactArray(value, expected, code) {
  if (
    !Array.isArray(value) ||
    value.length !== expected.length ||
    value.some((entry, index) => entry !== expected[index])
  ) {
    throw new Error(code);
  }
}

export function renderVoidBuyVoidCustodySocketRuntimeDirectoryFragmentV1() {
  return [
    "[Service]",
    "RuntimeDirectory=void-allocation-custody-v1",
    "RuntimeDirectoryMode=0750",
    "RuntimeDirectoryPreserve=no",
    "SupplementaryGroups=void-buy-custody-ipc",
    "ExecStartPre=/usr/bin/chgrp -- void-buy-custody-ipc /run/void-allocation-custody-v1",
    "",
  ].join("\n");
}

export function classifyVoidBuyVoidCustodySocketRuntimeDirectoryPolicyV1(
  input,
) {
  try {
    const value = exactObject(
      input,
      [
        "systemd_manager",
        "service_user",
        "service_group",
        "ipc_group",
        "runtime_directory",
        "runtime_directory_path",
        "runtime_directory_mode",
        "runtime_directory_preserve",
        "supplementary_groups",
        "exec_start_pre",
        "socket_path",
        "socket_mode",
        "protect_system",
        "read_write_paths",
      ],
      "custody_socket_runtime_directory_shape_invalid",
    );

    for (const [key, expected] of Object.entries({
      systemd_manager: "system",
      service_user: "void-buy-custody",
      service_group: "void-buy-custody",
      ipc_group: "void-buy-custody-ipc",
      runtime_directory: "void-allocation-custody-v1",
      runtime_directory_path: "/run/void-allocation-custody-v1",
      runtime_directory_mode: "0750",
      runtime_directory_preserve: "no",
      socket_path: "/run/void-allocation-custody-v1/custody.sock",
      socket_mode: "0660",
      protect_system: "strict",
    })) {
      exactString(value[key], expected, "custody_socket_runtime_directory_" + key + "_invalid");
    }

    safeName(value.service_user, "custody_socket_runtime_directory_service_user_invalid");
    safeName(value.service_group, "custody_socket_runtime_directory_service_group_invalid");
    safeName(value.ipc_group, "custody_socket_runtime_directory_ipc_group_invalid");
    if (!MODE.test(value.runtime_directory_mode) || !MODE.test(value.socket_mode)) {
      throw new Error("custody_socket_runtime_directory_mode_invalid");
    }

    exactArray(
      value.supplementary_groups,
      ["void-buy-custody-ipc"],
      "custody_socket_runtime_directory_supplementary_groups_invalid",
    );
    exactArray(
      value.exec_start_pre,
      [
        "/usr/bin/chgrp",
        "--",
        "void-buy-custody-ipc",
        "/run/void-allocation-custody-v1",
      ],
      "custody_socket_runtime_directory_exec_start_pre_invalid",
    );
    exactArray(
      value.read_write_paths,
      [
        "/var/lib/void-allocation-custody-v1",
        "/var/lib/void-allocation-ledger-v1",
      ],
      "custody_socket_runtime_directory_read_write_paths_invalid",
    );

    if (value.service_group === value.ipc_group) {
      throw new Error("custody_socket_runtime_directory_primary_group_not_distinct");
    }

    return Object.freeze({
      ok: true,
      status: "SOURCE_POLICY_GREEN_NOT_INSTALLED",
      marker: VOID_BUY_VOID_CUSTODY_SOCKET_RUNTIME_DIRECTORY_POLICY_V1,
      version: 1,
      runtime_directory_mechanism_selected: true,
      runtime_directory_path: value.runtime_directory_path,
      runtime_directory_initial_group_source: "service_primary_group",
      runtime_directory_final_group_target: value.ipc_group,
      prestart_group_transition_runs_as_service_identity_required: true,
      custody_primary_group_preserved: true,
      supplementary_ipc_group_required: true,
      existing_two_read_write_paths_preserved: true,
      third_read_write_path_added: false,
      systemd_socket_activation_used: false,
      host_account_membership_verified: false,
      host_runtime_directory_behavior_verified: false,
      host_exec_start_pre_verified: false,
      host_socket_bind_verified: false,
      host_socket_cleanup_verified: false,
      production_gate_ready: false,
      authority: VOID_BUY_VOID_CUSTODY_SOCKET_RUNTIME_DIRECTORY_AUTHORITY_V1,
    });
  } catch (error) {
    return hold(error instanceof Error ? error.message : String(error));
  }
}
