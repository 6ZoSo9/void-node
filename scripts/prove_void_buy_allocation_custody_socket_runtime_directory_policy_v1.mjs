#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_BUY_VOID_CUSTODY_SOCKET_RUNTIME_DIRECTORY_AUTHORITY_V1,
  VOID_BUY_VOID_CUSTODY_SOCKET_RUNTIME_DIRECTORY_FRAGMENT_V1,
  VOID_BUY_VOID_CUSTODY_SOCKET_RUNTIME_DIRECTORY_POLICY_V1,
  classifyVoidBuyVoidCustodySocketRuntimeDirectoryPolicyV1,
  renderVoidBuyVoidCustodySocketRuntimeDirectoryFragmentV1,
} from "../tools/void-buy-allocation-custody-socket-runtime-directory-policy-v1.mjs";

const input = structuredClone(
  VOID_BUY_VOID_CUSTODY_SOCKET_RUNTIME_DIRECTORY_FRAGMENT_V1,
);

const accepted =
  classifyVoidBuyVoidCustodySocketRuntimeDirectoryPolicyV1(input);
assert.equal(accepted.ok, true);
assert.equal(accepted.status, "SOURCE_POLICY_GREEN_NOT_INSTALLED");
assert.equal(
  accepted.marker,
  VOID_BUY_VOID_CUSTODY_SOCKET_RUNTIME_DIRECTORY_POLICY_V1,
);
assert.equal(accepted.runtime_directory_mechanism_selected, true);
assert.equal(accepted.custody_primary_group_preserved, true);
assert.equal(accepted.supplementary_ipc_group_required, true);
assert.equal(accepted.existing_two_read_write_paths_preserved, true);
assert.equal(accepted.third_read_write_path_added, false);
assert.equal(accepted.systemd_socket_activation_used, false);
assert.equal(accepted.host_account_membership_verified, false);
assert.equal(accepted.host_runtime_directory_behavior_verified, false);
assert.equal(accepted.host_socket_bind_verified, false);
assert.equal(accepted.production_gate_ready, false);

assert.equal(
  renderVoidBuyVoidCustodySocketRuntimeDirectoryFragmentV1(),
  [
    "[Service]",
    "RuntimeDirectory=void-allocation-custody-v1",
    "RuntimeDirectoryMode=0750",
    "RuntimeDirectoryPreserve=no",
    "SupplementaryGroups=void-buy-custody-ipc",
    "ExecStartPre=/usr/bin/chgrp -- void-buy-custody-ipc /run/void-allocation-custody-v1",
    "",
  ].join("\n"),
);

function held(mutator, reason) {
  const candidate = structuredClone(
    VOID_BUY_VOID_CUSTODY_SOCKET_RUNTIME_DIRECTORY_FRAGMENT_V1,
  );
  mutator(candidate);
  const result =
    classifyVoidBuyVoidCustodySocketRuntimeDirectoryPolicyV1(candidate);
  assert.equal(result.ok, false, reason);
  assert.equal(result.status, "HOLD", reason);
  assert.equal(result.reason, reason);
  assert.equal(result.production_gate_ready, false);
}

held(
  (x) => { x.systemd_manager = "user"; },
  "custody_socket_runtime_directory_systemd_manager_invalid",
);
held(
  (x) => { x.service_group = "void-buy-custody-ipc"; },
  "custody_socket_runtime_directory_service_group_invalid",
);
held(
  (x) => { x.runtime_directory_mode = "0770"; },
  "custody_socket_runtime_directory_runtime_directory_mode_invalid",
);
held(
  (x) => { x.runtime_directory_preserve = "yes"; },
  "custody_socket_runtime_directory_runtime_directory_preserve_invalid",
);
held(
  (x) => { x.supplementary_groups = []; },
  "custody_socket_runtime_directory_supplementary_groups_invalid",
);
held(
  (x) => {
    x.exec_start_pre = [
      "/usr/bin/chgrp",
      "--",
      "void-buy-custody",
      "/run/void-allocation-custody-v1",
    ];
  },
  "custody_socket_runtime_directory_exec_start_pre_invalid",
);
held(
  (x) => {
    x.read_write_paths.push("/run/void-allocation-custody-v1");
  },
  "custody_socket_runtime_directory_read_write_paths_invalid",
);

const bootstrap = fs.readFileSync(
  "tools/void-buy-allocation-custody-service-bootstrap-plan-v1.mjs",
  "utf8",
);
for (const needle of [
  'systemd_manager: "system"',
  'public_node_systemd_manager: "user"',
  'unit_name_candidate: "void-buy-allocation-custody-v1.service"',
  'socket_unit_needed: false',
  'socket_binder: "custody-service-net.createServer"',
  'socket_transport: "AF_UNIX"',
  'socket_mode_target: "0660"',
  'socket_parent_mode_target: "0750"',
  'socket_parent_owner: "void-buy-custody"',
  'ProtectSystem: "strict"',
  '"/var/lib/void-allocation-custody-v1"',
  '"/var/lib/void-allocation-ledger-v1"',
]) {
  assert.ok(bootstrap.includes(needle), needle);
}

const service = fs.readFileSync(
  "tools/void-buy-allocation-custody-service-v2.mjs",
  "utf8",
);
for (const needle of [
  'path.dirname(options.socket_path)',
  '0o750',
  'options.socket_group_gid',
  'process.getgroups().includes(options.socket_group_gid)',
  'server.listen(options.socket_path)',
  'fs.chmodSync(options.socket_path, 0o660)',
  'fs.chownSync(',
]) {
  assert.ok(service.includes(needle), needle);
}

for (const [key, expected] of Object.entries({
  source_policy_only: true,
  runtime_directory_mechanism_selected: true,
  distinct_ipc_group_required: true,
  custody_primary_group_preserved: true,
  supplementary_ipc_group_required: true,
  nonprivileged_prestart_group_transition_required: true,
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
})) {
  assert.equal(
    VOID_BUY_VOID_CUSTODY_SOCKET_RUNTIME_DIRECTORY_AUTHORITY_V1[key],
    expected,
    key,
  );
}

console.log("VOID_BUY_VOID_CUSTODY_SOCKET_RUNTIME_DIRECTORY_POLICY_V1_GREEN");
console.log("runtime_directory_mechanism_selected=true");
console.log("custody_primary_group_preserved=true");
console.log("supplementary_ipc_group_required=true");
console.log("prestart_group_transition=chgrp_to_ipc_group");
console.log("existing_two_read_write_paths_preserved=true");
console.log("third_read_write_path_added=false");
console.log("systemd_socket_activation_used=false");
console.log("host_runtime_directory_behavior_verified=false");
console.log("host_socket_bind_verified=false");
console.log("service_install=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
