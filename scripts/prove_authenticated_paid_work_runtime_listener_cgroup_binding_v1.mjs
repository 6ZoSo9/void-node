import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  buildAuthenticatedPaidWorkRuntimeListenerCgroupBindingV1,
  canonicalJson,
  computeAuthenticatedPaidWorkRuntimeListenerCgroupBindingReceiptIdV1,
  validateAuthenticatedPaidWorkRuntimeListenerCgroupBindingV1,
} from "../integrations/agents/authenticated-paid-work-runtime-listener-cgroup-binding-v1/index.mjs";

const fixturePath = new URL(
  "../fixtures/agents/authenticated-paid-work-runtime-listener-cgroup-binding-v1.example.json",
  import.meta.url,
);

const cgroupHash = "4a".repeat(32);
const input = {
  observed_at_utc: "2026-08-05T02:10:00.000Z",
  evaluated_at_utc: "2026-08-05T02:10:04.000Z",
  max_age_seconds: 30,
  service: {
    service_active: true,
    main_pid: 4812,
    main_pid_start_time_ticks: 99100221,
    manager_control_group_path_sha256: cgroupHash,
    cgroup_snapshot_complete: true,
    main_pid_in_control_group: true,
    cgroup_member_count: 2,
    cgroup_member_processes: [
      {
        pid: 4812,
        start_time_ticks: 99100221,
        proc_cgroup_path_sha256: cgroupHash,
      },
      {
        pid: 4820,
        start_time_ticks: 99100243,
        proc_cgroup_path_sha256: cgroupHash,
      },
    ],
  },
  network_namespace: {
    service_network_namespace_inode: 4026531840,
    listener_network_namespace_inode: 4026531840,
    network_namespace_binding_verified: true,
  },
  listeners: [
    {
      protocol: "tcp",
      address_family: "ipv4",
      local_address: "127.0.0.1",
      local_port: 4187,
      state: "LISTEN",
      socket_inode: 81726354,
      owner_pid: 4820,
      owner_start_time_ticks: 99100243,
      owner_proc_cgroup_path_sha256: cgroupHash,
      network_namespace_inode: 4026531840,
    },
  ],
  ownership: {
    target_port_socket_scan_complete: true,
    socket_owner_scan_complete: true,
    target_port_listener_count: 1,
    all_target_port_listeners_accounted_for: true,
    listener_owner_within_service_cgroup: true,
    listener_owner_process_identity_verified: true,
    listener_socket_inode_owned_by_reported_pid: true,
    listener_exclusive_to_expected_service_cgroup: true,
    foreign_target_port_listener_detected: false,
    wildcard_target_port_listener_detected: false,
    non_loopback_target_port_listener_detected: false,
  },
  safety: {
    service_mutation_performed: false,
    credential_access_performed: false,
    raw_token_read: false,
    private_path_disclosed: false,
    network_request_performed: false,
    producer_authentication_established: false,
    live_authentication_performed: false,
    paid_work_submission_performed: false,
    quote_acceptance_performed: false,
    payment_execution_performed: false,
    work_dispatch_performed: false,
    work_credit_write_performed: false,
    wallet_or_signer_access_performed: false,
    signing_performed: false,
    transaction_construction_performed: false,
    transaction_broadcast_performed: false,
    fund_movement_performed: false,
  },
};

const clone = (value) => structuredClone(value);
const built = buildAuthenticatedPaidWorkRuntimeListenerCgroupBindingV1(input);
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
assert.deepEqual(built, fixture);
assert.equal(
  built.receipt_id,
  computeAuthenticatedPaidWorkRuntimeListenerCgroupBindingReceiptIdV1(built),
);
assert.deepEqual(validateAuthenticatedPaidWorkRuntimeListenerCgroupBindingV1(fixture), fixture);

function reseal(receipt) {
  receipt.receipt_id = computeAuthenticatedPaidWorkRuntimeListenerCgroupBindingReceiptIdV1(receipt);
  return receipt;
}

function rejectsReceipt(mutator, expected) {
  const receipt = clone(fixture);
  mutator(receipt);
  reseal(receipt);
  assert.throws(
    () => validateAuthenticatedPaidWorkRuntimeListenerCgroupBindingV1(receipt),
    expected,
  );
}

function rejectsInput(mutator, expected) {
  const candidate = clone(input);
  mutator(candidate);
  assert.throws(
    () => buildAuthenticatedPaidWorkRuntimeListenerCgroupBindingV1(candidate),
    expected,
  );
}

rejectsReceipt((x) => { x.target.service = "other.service"; }, /target_service_mismatch/);
rejectsInput((x) => {
  x.service.cgroup_member_processes = x.service.cgroup_member_processes.slice(1);
  x.service.cgroup_member_count = 1;
}, /main_pid_missing_from_cgroup_members/);
rejectsInput((x) => { x.listeners[0].owner_pid = 4999; }, /listener_owner_outside_service_cgroup/);
rejectsInput((x) => { x.listeners[0].owner_start_time_ticks += 1; }, /listener_owner_process_identity_mismatch/);
rejectsInput((x) => { x.listeners[0].local_address = "0.0.0.0"; }, /listener_local_address_mismatch/);
rejectsInput((x) => { x.listeners[0].local_address = "192.168.1.50"; }, /listener_local_address_mismatch/);
rejectsInput((x) => { x.listeners.push(clone(x.listeners[0])); }, /exactly_one_target_listener_required/);
rejectsInput((x) => { x.network_namespace.listener_network_namespace_inode += 1; }, /network_namespace_inode_mismatch/);
rejectsInput((x) => { x.listeners[0].network_namespace_inode += 1; }, /listener_network_namespace_mismatch/);
rejectsInput((x) => { x.listeners[0].owner_proc_cgroup_path_sha256 = "5b".repeat(32); }, /listener_owner_cgroup_path_mismatch/);
rejectsInput((x) => { x.service.cgroup_member_processes[1].proc_cgroup_path_sha256 = "5b".repeat(32); }, /cgroup_member_path_binding_mismatch/);
rejectsInput((x) => { x.service.cgroup_member_processes.reverse(); }, /cgroup_member_processes_not_strictly_pid_sorted/);
rejectsInput((x) => {
  x.service.cgroup_member_processes[1].pid = x.service.cgroup_member_processes[0].pid;
}, /cgroup_member_processes_not_strictly_pid_sorted/);
rejectsInput((x) => { x.ownership.foreign_target_port_listener_detected = true; }, /foreign_target_port_listener_detected_must_be_false/);
rejectsInput((x) => { x.ownership.target_port_listener_count = 2; }, /target_port_listener_count_mismatch/);
rejectsInput((x) => { x.evaluated_at_utc = "2026-08-05T02:11:00.000Z"; }, /observation_stale/);
rejectsInput((x) => { x.safety.credential_access_performed = true; }, /safety_credential_access_performed_must_be_false/);
rejectsInput((x) => { x.unexpected_authority = true; }, /input_keys_mismatch/);
const tamperedReceiptId = clone(fixture);
tamperedReceiptId.receipt_id = `voidapwrlcb1_${"0".repeat(64)}`;
assert.throws(
  () => validateAuthenticatedPaidWorkRuntimeListenerCgroupBindingV1(tamperedReceiptId),
  /receipt_id_derivation_mismatch/,
);

let proxyTraps = 0;
const proxy = new Proxy(input, {
  get() { proxyTraps += 1; return undefined; },
  ownKeys() { proxyTraps += 1; return []; },
  getOwnPropertyDescriptor() { proxyTraps += 1; return undefined; },
  getPrototypeOf() { proxyTraps += 1; return Object.prototype; },
});
assert.throws(
  () => buildAuthenticatedPaidWorkRuntimeListenerCgroupBindingV1(proxy),
  /closed_input_proxy_forbidden/,
);
assert.equal(proxyTraps, 0);

let getterExecutions = 0;
const accessorInput = clone(input);
Object.defineProperty(accessorInput, "evaluated_at_utc", {
  enumerable: true,
  configurable: true,
  get() { getterExecutions += 1; return input.evaluated_at_utc; },
});
assert.throws(
  () => buildAuthenticatedPaidWorkRuntimeListenerCgroupBindingV1(accessorInput),
  /closed_input_accessor_forbidden/,
);
assert.equal(getterExecutions, 0);

assert.equal(fixture.decision.execution_authorized, false);
assert.equal(fixture.decision.current_runtime_state_established, false);
assert.equal(fixture.safety.producer_authentication_established, false);
assert.equal(canonicalJson(fixture).includes("voidapwc1."), false);

console.log(`receipt_id=${fixture.receipt_id}`);
console.log("main_pid_in_control_group=true");
console.log("listener_owner_within_service_cgroup=true");
console.log("listener_owner_process_identity_verified=true");
console.log("listener_socket_inode_owned_by_reported_pid=true");
console.log("network_namespace_binding_verified=true");
console.log("target_port_listener_count_exact=true");
console.log("wildcard_target_port_listener_detected=false");
console.log("foreign_target_port_listener_detected=false");
console.log("producer_authentication_established=false");
console.log("current_runtime_state_established=false");
console.log("execution_authorized=false");
console.log("VOID_AUTHENTICATED_PAID_WORK_RUNTIME_LISTENER_CGROUP_BINDING_V1_PROOF_GREEN");
