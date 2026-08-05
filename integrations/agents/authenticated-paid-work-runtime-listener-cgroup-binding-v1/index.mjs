import { createHash } from "node:crypto";

import {
  snapshotAuthenticatedPaidWorkReplacementIssuanceVerificationInputV1,
} from "../authenticated-paid-work-replacement-issuance-preparation-v1/closed-input-guard-v1.mjs";

export const MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_RUNTIME_LISTENER_CGROUP_BINDING_V1";
export const PROTOCOL =
  "void-authenticated-paid-work-runtime-listener-cgroup-binding/1";
export const STATUS = "sanitized_listener_binding_not_runtime_authority";
export const RECEIPT_PREFIX = "voidapwrlcb1_";

export const REVIEWED_SOURCE_MAIN =
  "68e3ef3a7c15cf5b3623555979766fadf8b670fe";
export const RUNTIME_REVALIDATION_MERGE_COMMIT =
  "d12b4620cb5a6e199a6a59f21dfae6dd434c550a";
export const EXPECTED_TARGET = Object.freeze({
  host: "zoso-Precision-Tower-7810",
  manager_scope: "systemd_user",
  service: "void-agent-paid-work-submission-receiver-v1.service",
  listener_protocol: "tcp",
  listener_address_family: "ipv4",
  listener_host: "127.0.0.1",
  listener_port: 4187,
});

export const FALSE_SAFETY = Object.freeze({
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
});

const INPUT_KEYS = [
  "evaluated_at_utc",
  "listeners",
  "max_age_seconds",
  "network_namespace",
  "observed_at_utc",
  "ownership",
  "safety",
  "service",
];
const RECEIPT_KEYS = [
  "decision",
  "listeners",
  "marker",
  "network_namespace",
  "observation",
  "ownership",
  "protocol",
  "receipt_id",
  "safety",
  "service",
  "source",
  "status",
  "target",
  "version",
];
const SOURCE_KEYS = [
  "repository",
  "reviewed_source_main",
  "runtime_revalidation_contract_merge_commit",
];
const TARGET_KEYS = [
  "host",
  "listener_address_family",
  "listener_host",
  "listener_port",
  "listener_protocol",
  "manager_scope",
  "service",
];
const OBSERVATION_KEYS = [
  "evaluated_at_utc",
  "max_age_seconds",
  "observed_at_utc",
  "relative_age_seconds",
  "wall_clock_authenticated",
];
const SERVICE_KEYS = [
  "cgroup_member_count",
  "cgroup_member_processes",
  "cgroup_snapshot_complete",
  "main_pid",
  "main_pid_in_control_group",
  "main_pid_start_time_ticks",
  "manager_control_group_path_sha256",
  "service_active",
];
const PROCESS_KEYS = [
  "pid",
  "proc_cgroup_path_sha256",
  "start_time_ticks",
];
const NAMESPACE_KEYS = [
  "listener_network_namespace_inode",
  "network_namespace_binding_verified",
  "service_network_namespace_inode",
];
const LISTENER_KEYS = [
  "address_family",
  "local_address",
  "local_port",
  "network_namespace_inode",
  "owner_pid",
  "owner_proc_cgroup_path_sha256",
  "owner_start_time_ticks",
  "protocol",
  "socket_inode",
  "state",
];
const OWNERSHIP_KEYS = [
  "all_target_port_listeners_accounted_for",
  "foreign_target_port_listener_detected",
  "listener_exclusive_to_expected_service_cgroup",
  "listener_owner_process_identity_verified",
  "listener_owner_within_service_cgroup",
  "listener_socket_inode_owned_by_reported_pid",
  "non_loopback_target_port_listener_detected",
  "socket_owner_scan_complete",
  "target_port_listener_count",
  "target_port_socket_scan_complete",
  "wildcard_target_port_listener_detected",
];
const DECISION_KEYS = [
  "complete_runtime_revalidation_established",
  "current_runtime_state_established",
  "execution_authorized",
  "listener_cgroup_binding_verified",
  "producer_authentication_established",
  "replacement_credential_validity_established",
  "sanitized_listener_snapshot_contract_validated",
  "status",
  "trusted_context_binding_established",
];

const RECEIPT_ID_RE = /^voidapwrlcb1_[a-f0-9]{64}$/;
const SHA256_RE = /^[a-f0-9]{64}$/;
const COMMIT_RE = /^[a-f0-9]{40}$/;
const ISO_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const MAX_PID = 4_194_304;
const MAX_CGROUP_MEMBERS = 4_096;
const MAX_SOCKET_INODE = Number.MAX_SAFE_INTEGER;

function fail(message) {
  throw new Error(message);
}

function requireRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label}_must_be_object`);
  }
  return value;
}

function exactKeys(value, expected, label) {
  const actual = Object.keys(requireRecord(value, label)).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    fail(`${label}_keys_mismatch`);
  }
}

function requireBoolean(value, expected, label) {
  if (value !== expected) fail(`${label}_must_be_${expected}`);
}

function requireSafeInteger(value, minimum, maximum, label) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    fail(`${label}_out_of_range`);
  }
  return value;
}

function parseUtc(value, label) {
  if (typeof value !== "string" || !ISO_UTC_RE.test(value)) {
    fail(`${label}_must_be_iso_utc_milliseconds`);
  }
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value) {
    fail(`${label}_invalid`);
  }
  return milliseconds;
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    const output = {};
    for (const key of Object.keys(value).sort()) output[key] = canonicalValue(value[key]);
    return output;
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

function unsignedReceipt(receipt) {
  const body = structuredClone(receipt);
  delete body.receipt_id;
  return body;
}

export function computeAuthenticatedPaidWorkRuntimeListenerCgroupBindingReceiptIdV1(
  receipt,
) {
  return `${RECEIPT_PREFIX}${sha256Hex(canonicalJson(unsignedReceipt(receipt)))}`;
}

function validateObservation(observation) {
  exactKeys(observation, OBSERVATION_KEYS, "observation");
  const observed = parseUtc(observation.observed_at_utc, "observed_at_utc");
  const evaluated = parseUtc(observation.evaluated_at_utc, "evaluated_at_utc");
  if (evaluated < observed) fail("evaluated_at_precedes_observation");
  requireSafeInteger(observation.max_age_seconds, 1, 300, "max_age_seconds");
  const expectedAge = Math.ceil((evaluated - observed) / 1000);
  if (observation.relative_age_seconds !== expectedAge) {
    fail("relative_age_seconds_mismatch");
  }
  if (expectedAge > observation.max_age_seconds) fail("observation_stale");
  requireBoolean(observation.wall_clock_authenticated, false, "wall_clock_authenticated");
}

function validateSource(source) {
  exactKeys(source, SOURCE_KEYS, "source");
  if (source.repository !== "6ZoSo9/void-node") fail("source_repository_mismatch");
  if (source.reviewed_source_main !== REVIEWED_SOURCE_MAIN) {
    fail("source_reviewed_main_mismatch");
  }
  if (source.runtime_revalidation_contract_merge_commit !== RUNTIME_REVALIDATION_MERGE_COMMIT) {
    fail("source_runtime_revalidation_merge_mismatch");
  }
  for (const key of ["reviewed_source_main", "runtime_revalidation_contract_merge_commit"]) {
    if (!COMMIT_RE.test(source[key])) fail(`source_${key}_invalid`);
  }
}

function validateTarget(target) {
  exactKeys(target, TARGET_KEYS, "target");
  for (const key of TARGET_KEYS) {
    if (target[key] !== EXPECTED_TARGET[key]) fail(`target_${key}_mismatch`);
  }
}

function validateService(service) {
  exactKeys(service, SERVICE_KEYS, "service");
  requireBoolean(service.service_active, true, "service_active");
  const mainPid = requireSafeInteger(service.main_pid, 2, MAX_PID, "main_pid");
  const mainStart = requireSafeInteger(
    service.main_pid_start_time_ticks,
    1,
    Number.MAX_SAFE_INTEGER,
    "main_pid_start_time_ticks",
  );
  if (!SHA256_RE.test(service.manager_control_group_path_sha256)) {
    fail("manager_control_group_path_sha256_invalid");
  }
  requireBoolean(service.cgroup_snapshot_complete, true, "cgroup_snapshot_complete");
  requireBoolean(service.main_pid_in_control_group, true, "main_pid_in_control_group");
  if (!Array.isArray(service.cgroup_member_processes)) {
    fail("cgroup_member_processes_must_be_array");
  }
  requireSafeInteger(
    service.cgroup_member_count,
    1,
    MAX_CGROUP_MEMBERS,
    "cgroup_member_count",
  );
  if (service.cgroup_member_count !== service.cgroup_member_processes.length) {
    fail("cgroup_member_count_mismatch");
  }
  if (service.cgroup_member_processes.length > MAX_CGROUP_MEMBERS) {
    fail("cgroup_member_processes_too_large");
  }

  let previousPid = 0;
  let mainMember = null;
  const members = new Map();
  for (const [index, process] of service.cgroup_member_processes.entries()) {
    exactKeys(process, PROCESS_KEYS, `cgroup_member_processes_${index}`);
    const pid = requireSafeInteger(process.pid, 2, MAX_PID, `cgroup_member_pid_${index}`);
    const startTime = requireSafeInteger(
      process.start_time_ticks,
      1,
      Number.MAX_SAFE_INTEGER,
      `cgroup_member_start_time_${index}`,
    );
    if (pid <= previousPid) fail("cgroup_member_processes_not_strictly_pid_sorted");
    previousPid = pid;
    if (process.proc_cgroup_path_sha256 !== service.manager_control_group_path_sha256) {
      fail("cgroup_member_path_binding_mismatch");
    }
    members.set(pid, { start_time_ticks: startTime });
    if (pid === mainPid) mainMember = { start_time_ticks: startTime };
  }
  if (!mainMember) fail("main_pid_missing_from_cgroup_members");
  if (mainMember.start_time_ticks !== mainStart) {
    fail("main_pid_process_identity_mismatch");
  }
  return members;
}

function validateNetworkNamespace(namespace) {
  exactKeys(namespace, NAMESPACE_KEYS, "network_namespace");
  const serviceNamespace = requireSafeInteger(
    namespace.service_network_namespace_inode,
    1,
    MAX_SOCKET_INODE,
    "service_network_namespace_inode",
  );
  const listenerNamespace = requireSafeInteger(
    namespace.listener_network_namespace_inode,
    1,
    MAX_SOCKET_INODE,
    "listener_network_namespace_inode",
  );
  if (serviceNamespace !== listenerNamespace) fail("network_namespace_inode_mismatch");
  requireBoolean(
    namespace.network_namespace_binding_verified,
    true,
    "network_namespace_binding_verified",
  );
  return serviceNamespace;
}

function validateListeners(listeners, members, service, namespaceInode) {
  if (!Array.isArray(listeners)) fail("listeners_must_be_array");
  if (listeners.length !== 1) fail("exactly_one_target_listener_required");
  const listener = listeners[0];
  exactKeys(listener, LISTENER_KEYS, "listener_0");
  if (listener.protocol !== EXPECTED_TARGET.listener_protocol) fail("listener_protocol_mismatch");
  if (listener.address_family !== EXPECTED_TARGET.listener_address_family) {
    fail("listener_address_family_mismatch");
  }
  if (listener.local_address !== EXPECTED_TARGET.listener_host) {
    fail("listener_local_address_mismatch");
  }
  if (listener.local_port !== EXPECTED_TARGET.listener_port) fail("listener_local_port_mismatch");
  if (listener.state !== "LISTEN") fail("listener_state_mismatch");
  requireSafeInteger(listener.socket_inode, 1, MAX_SOCKET_INODE, "listener_socket_inode");
  const ownerPid = requireSafeInteger(listener.owner_pid, 2, MAX_PID, "listener_owner_pid");
  const ownerStart = requireSafeInteger(
    listener.owner_start_time_ticks,
    1,
    Number.MAX_SAFE_INTEGER,
    "listener_owner_start_time_ticks",
  );
  if (!members.has(ownerPid)) fail("listener_owner_outside_service_cgroup");
  if (members.get(ownerPid).start_time_ticks !== ownerStart) {
    fail("listener_owner_process_identity_mismatch");
  }
  if (listener.owner_proc_cgroup_path_sha256 !== service.manager_control_group_path_sha256) {
    fail("listener_owner_cgroup_path_mismatch");
  }
  if (listener.network_namespace_inode !== namespaceInode) {
    fail("listener_network_namespace_mismatch");
  }
}

function validateOwnership(ownership) {
  exactKeys(ownership, OWNERSHIP_KEYS, "ownership");
  requireBoolean(
    ownership.target_port_socket_scan_complete,
    true,
    "target_port_socket_scan_complete",
  );
  requireBoolean(ownership.socket_owner_scan_complete, true, "socket_owner_scan_complete");
  if (ownership.target_port_listener_count !== 1) fail("target_port_listener_count_mismatch");
  requireBoolean(
    ownership.all_target_port_listeners_accounted_for,
    true,
    "all_target_port_listeners_accounted_for",
  );
  requireBoolean(
    ownership.listener_owner_within_service_cgroup,
    true,
    "listener_owner_within_service_cgroup",
  );
  requireBoolean(
    ownership.listener_owner_process_identity_verified,
    true,
    "listener_owner_process_identity_verified",
  );
  requireBoolean(
    ownership.listener_socket_inode_owned_by_reported_pid,
    true,
    "listener_socket_inode_owned_by_reported_pid",
  );
  requireBoolean(
    ownership.listener_exclusive_to_expected_service_cgroup,
    true,
    "listener_exclusive_to_expected_service_cgroup",
  );
  requireBoolean(
    ownership.foreign_target_port_listener_detected,
    false,
    "foreign_target_port_listener_detected",
  );
  requireBoolean(
    ownership.wildcard_target_port_listener_detected,
    false,
    "wildcard_target_port_listener_detected",
  );
  requireBoolean(
    ownership.non_loopback_target_port_listener_detected,
    false,
    "non_loopback_target_port_listener_detected",
  );
}

function validateSafety(safety) {
  exactKeys(safety, Object.keys(FALSE_SAFETY), "safety");
  for (const [key, expected] of Object.entries(FALSE_SAFETY)) {
    requireBoolean(safety[key], expected, `safety_${key}`);
  }
}

function validateDecision(decision) {
  exactKeys(decision, DECISION_KEYS, "decision");
  if (decision.status !== "HOLD_PENDING_COMPOSED_RUNTIME_REVALIDATION") {
    fail("decision_status_mismatch");
  }
  requireBoolean(
    decision.sanitized_listener_snapshot_contract_validated,
    true,
    "sanitized_listener_snapshot_contract_validated",
  );
  requireBoolean(
    decision.listener_cgroup_binding_verified,
    true,
    "listener_cgroup_binding_verified",
  );
  for (const key of [
    "producer_authentication_established",
    "current_runtime_state_established",
    "complete_runtime_revalidation_established",
    "replacement_credential_validity_established",
    "trusted_context_binding_established",
    "execution_authorized",
  ]) {
    requireBoolean(decision[key], false, `decision_${key}`);
  }
}

export function validateAuthenticatedPaidWorkRuntimeListenerCgroupBindingV1(value) {
  const receipt = requireRecord(value, "receipt");
  exactKeys(receipt, RECEIPT_KEYS, "receipt");
  if (
    receipt.marker !== MARKER ||
    receipt.protocol !== PROTOCOL ||
    receipt.version !== 1 ||
    receipt.status !== STATUS
  ) {
    fail("receipt_identity_mismatch");
  }
  if (typeof receipt.receipt_id !== "string" || !RECEIPT_ID_RE.test(receipt.receipt_id)) {
    fail("receipt_id_invalid");
  }
  validateSource(receipt.source);
  validateTarget(receipt.target);
  validateObservation(receipt.observation);
  const members = validateService(receipt.service);
  const namespaceInode = validateNetworkNamespace(receipt.network_namespace);
  validateListeners(receipt.listeners, members, receipt.service, namespaceInode);
  validateOwnership(receipt.ownership);
  validateSafety(receipt.safety);
  validateDecision(receipt.decision);
  if (
    receipt.receipt_id !==
    computeAuthenticatedPaidWorkRuntimeListenerCgroupBindingReceiptIdV1(receipt)
  ) {
    fail("receipt_id_derivation_mismatch");
  }
  return receipt;
}

function validateInput(value) {
  const input =
    snapshotAuthenticatedPaidWorkReplacementIssuanceVerificationInputV1(
      value,
      "$runtimeListenerCgroupBindingInput",
    );
  exactKeys(input, INPUT_KEYS, "input");
  return input;
}

export function buildAuthenticatedPaidWorkRuntimeListenerCgroupBindingV1(value) {
  const input = validateInput(value);
  const observed = parseUtc(input.observed_at_utc, "observed_at_utc");
  const evaluated = parseUtc(input.evaluated_at_utc, "evaluated_at_utc");
  const body = {
    marker: MARKER,
    protocol: PROTOCOL,
    version: 1,
    status: STATUS,
    source: {
      repository: "6ZoSo9/void-node",
      reviewed_source_main: REVIEWED_SOURCE_MAIN,
      runtime_revalidation_contract_merge_commit: RUNTIME_REVALIDATION_MERGE_COMMIT,
    },
    target: structuredClone(EXPECTED_TARGET),
    observation: {
      observed_at_utc: input.observed_at_utc,
      evaluated_at_utc: input.evaluated_at_utc,
      max_age_seconds: input.max_age_seconds,
      relative_age_seconds: Math.ceil((evaluated - observed) / 1000),
      wall_clock_authenticated: false,
    },
    service: input.service,
    network_namespace: input.network_namespace,
    listeners: input.listeners,
    ownership: input.ownership,
    safety: input.safety,
    decision: {
      status: "HOLD_PENDING_COMPOSED_RUNTIME_REVALIDATION",
      sanitized_listener_snapshot_contract_validated: true,
      listener_cgroup_binding_verified: true,
      producer_authentication_established: false,
      current_runtime_state_established: false,
      complete_runtime_revalidation_established: false,
      replacement_credential_validity_established: false,
      trusted_context_binding_established: false,
      execution_authorized: false,
    },
  };
  const receipt = {
    ...body,
    receipt_id: `${RECEIPT_PREFIX}${sha256Hex(canonicalJson(body))}`,
  };
  return validateAuthenticatedPaidWorkRuntimeListenerCgroupBindingV1(receipt);
}
