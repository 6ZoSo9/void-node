#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import {
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_INACTIVE_RUNTIME_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_INACTIVE_RUNTIME_V1,
} from "./void-economic-epoch2-production-gateway-inactive-runtime-v1.mjs";
import {
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_V1,
} from "./void-economic-epoch2-production-gateway-replay-binding-v1.mjs";
import {
  VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_V1,
} from "./void-economic-epoch2-durable-replay-store-v1.mjs";
import {
  VOID_ECONOMIC_EPOCH2_PUBLIC_SUBMISSION_GATEWAY_CORE_V1,
} from "./void-economic-epoch2-public-submission-gateway-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_CANDIDATE_V1 =
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_CANDIDATE_V1";
export const VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_SERVICE_CONTRACT_V1 =
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_SERVICE_CONTRACT_V1";
export const VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_CONFIRMATION_V1 =
  "collectVoidEconomicEpoch2ProductionGatewayRuntimeEvidence";

export const VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_AUTHORITY_V1 =
  Object.freeze({
    source_runtime_evidence_collection: true,
    systemd_readonly_inspection: true,
    procfs_readonly_inspection: true,
    filesystem_metadata_read: true,
    private_status_receipt_read: true,
    private_evidence_write: true,
    service_action: false,
    network_request: false,
    credential_access: false,
    wallet_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    validator_mutation: false,
    token_movement: false,
    funds_movement: false,
    migration_authorized: false,
    public_activation_authorized: false,
  });

const CONTRACT_PREFIX = "voide2grc1_";
const EVIDENCE_PREFIX = "voide2gre1_";
const RECEIPT_PREFIX = "voide2grt1_";
const SHA256 = /^[0-9a-f]{64}$/u;
const CONTRACT_ID = /^voide2grc1_[0-9a-f]{64}$/u;
const EVIDENCE_ID = /^voide2gre1_[0-9a-f]{64}$/u;
const RECEIPT_ID = /^voide2grt1_[0-9a-f]{64}$/u;
const UNIT = /^[A-Za-z0-9_.@:-]+\.service$/u;
const INVOCATION = /^[0-9a-f]{32}$/u;
const UTC_SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;
const SOCKET_LINK = /^socket:\[(\d+)\]$/u;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_SERVICE_PROCESSES = 64;
const MAX_SOCKET_FDS_PER_PROCESS = 4096;
const FUTURE_SKEW_MS = 5_000;

const CONTRACT_KEYS = Object.freeze([
  "marker",
  "version",
  "hostname",
  "service_unit",
  "unit_file_sha256",
  "runtime_source_sha256",
  "replay_root_path_sha256",
  "status_file_path_sha256",
  "max_evidence_age_seconds",
  "systemd_user_service_required",
  "current_operator_uid_required",
  "same_uid_process_model_accepted",
  "private_startup_receipt_required",
  "no_service_socket_fds_required",
  "runtime_route_active_required",
  "public_submission_open_required",
  "transaction_submission_required",
  "transaction_broadcast_required",
  "authoritative_chain2050_write_required",
  "contract_id",
]);

const RECEIPT_KEYS = Object.freeze([
  "marker",
  "version",
  "status",
  "chain_id",
  "execution_epoch",
  "hostname",
  "pid",
  "uid",
  "observed_at_utc",
  "runtime_source_path",
  "runtime_source_sha256",
  "runtime_source_bytes",
  "binding_marker",
  "gateway_marker",
  "replay_store_marker",
  "replay_root",
  "runtime_process_binding_constructed",
  "binding_constructed_from_exact_replay_root",
  "replay_root_identity_stable_during_binding",
  "production_gateway_replay_store_binding_source_verified",
  "runtime_service_identity_verified",
  "same_uid_process_model_verified",
  "production_gateway_replay_store_binding_verified",
  "runtime_route_active",
  "public_submission_open",
  "network_listener_created",
  "rpc_call",
  "transaction_submission",
  "transaction_broadcast",
  "authoritative_chain2050_write",
  "migration_authorized",
  "public_activation_authorized",
  "funds_movement",
  "receipt_id",
  "authority",
]);

const RECEIPT_ROOT_KEYS = Object.freeze([
  "path",
  "path_sha256",
  "dev",
  "ino",
  "uid",
  "gid",
  "mode",
  "realpath_sha256",
]);

function fail(reason) {
  throw new Error(reason);
}

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactObject(value, keys, reason) {
  if (!plain(value)) fail(reason);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail(reason);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Reflect.ownKeys(descriptors);
  if (actual.some((key) => typeof key !== "string")) fail(reason);
  const sorted = actual.sort();
  const expected = [...keys].sort();
  if (
    sorted.length !== expected.length ||
    sorted.some((key, index) => key !== expected[index])
  ) {
    fail(reason);
  }
  const out = Object.create(null);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(reason);
    }
    out[key] = descriptor.value;
  }
  return Object.freeze(out);
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
  if (plain(value)) {
    const keys = Object.keys(value).sort();
    return "{" + keys.map((key) =>
      JSON.stringify(key) + ":" + canonicalJson(value[key])
    ).join(",") + "}";
  }
  fail("canonical_value_invalid");
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256Text(text) {
  return sha256Bytes(Buffer.from(text, "utf8"));
}

function canonicalUtc(value, reason) {
  if (typeof value !== "string" || !UTC_SECONDS.test(value)) fail(reason);
  const ms = Date.parse(value);
  if (
    !Number.isFinite(ms) ||
    new Date(ms).toISOString() !== value.replace("Z", ".000Z")
  ) {
    fail(reason);
  }
  return ms;
}

function utcFromMs(ms) {
  return new Date(ms).toISOString().replace(".000Z", "Z");
}

function bodyWithoutId(value, idKey) {
  const out = Object.create(null);
  for (const [key, item] of Object.entries(value)) {
    if (key !== idKey) out[key] = item;
  }
  return out;
}

export function voidEconomicEpoch2ProductionGatewayRuntimeServiceContractIdV1(
  contract,
) {
  return CONTRACT_PREFIX +
    sha256Text(canonicalJson(bodyWithoutId(contract, "contract_id")));
}

export function voidEconomicEpoch2ProductionGatewayRuntimeEvidenceIdV1(
  evidence,
) {
  return EVIDENCE_PREFIX +
    sha256Text(canonicalJson(bodyWithoutId(evidence, "evidence_id")));
}

function validateContract(raw, expectedId) {
  const contract = exactObject(
    raw,
    CONTRACT_KEYS,
    "runtime_service_contract_shape_invalid",
  );
  if (
    contract.marker !==
      VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_SERVICE_CONTRACT_V1 ||
    contract.version !== 1 ||
    typeof contract.hostname !== "string" ||
    contract.hostname.length < 1 ||
    contract.hostname.length > 255 ||
    typeof contract.service_unit !== "string" ||
    !UNIT.test(contract.service_unit)
  ) {
    fail("runtime_service_contract_identity_invalid");
  }
  for (const key of [
    "unit_file_sha256",
    "runtime_source_sha256",
    "replay_root_path_sha256",
    "status_file_path_sha256",
  ]) {
    if (typeof contract[key] !== "string" || !SHA256.test(contract[key])) {
      fail("runtime_service_contract_sha256_invalid");
    }
  }
  if (
    !Number.isSafeInteger(contract.max_evidence_age_seconds) ||
    contract.max_evidence_age_seconds < 1 ||
    contract.max_evidence_age_seconds > 3600
  ) {
    fail("runtime_service_contract_max_age_invalid");
  }
  for (const key of [
    "systemd_user_service_required",
    "current_operator_uid_required",
    "same_uid_process_model_accepted",
    "private_startup_receipt_required",
    "no_service_socket_fds_required",
  ]) {
    if (contract[key] !== true) {
      fail("runtime_service_contract_required_true_flag_invalid");
    }
  }
  for (const key of [
    "runtime_route_active_required",
    "public_submission_open_required",
    "transaction_submission_required",
    "transaction_broadcast_required",
    "authoritative_chain2050_write_required",
  ]) {
    if (contract[key] !== false) {
      fail("runtime_service_contract_required_false_flag_invalid");
    }
  }
  if (
    typeof contract.contract_id !== "string" ||
    !CONTRACT_ID.test(contract.contract_id) ||
    contract.contract_id !==
      voidEconomicEpoch2ProductionGatewayRuntimeServiceContractIdV1(contract) ||
    expectedId !== contract.contract_id
  ) {
    fail("runtime_service_contract_id_mismatch");
  }
  return contract;
}

function stableFileIdentity(stat) {
  return Object.freeze({
    dev: stat.dev.toString(),
    ino: stat.ino.toString(),
    size: stat.size.toString(),
    uid: stat.uid.toString(),
    gid: stat.gid.toString(),
    mode: (Number(stat.mode) & 0o777).toString(8).padStart(4, "0"),
    mtime_ns: stat.mtimeNs.toString(),
    ctime_ns: stat.ctimeNs.toString(),
  });
}

function sameFileIdentity(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function readStableDirectFile(
  filename,
  {
    exactMode = null,
    forbidGroupWorldWrite = false,
    currentUid = null,
    maxBytes = MAX_FILE_BYTES,
    reason,
  },
) {
  const absolute = path.resolve(String(filename || ""));
  if (!path.isAbsolute(String(filename || ""))) fail(reason);
  let lstat;
  let realpath;
  try {
    lstat = fs.lstatSync(absolute, { bigint: true });
    realpath = fs.realpathSync.native(absolute);
  } catch {
    fail(reason);
  }
  if (!lstat.isFile() || lstat.isSymbolicLink() || realpath !== absolute) {
    fail(reason);
  }
  const mode = Number(lstat.mode) & 0o777;
  if (exactMode !== null && mode !== exactMode) fail(reason);
  if (forbidGroupWorldWrite && (mode & 0o022) !== 0) fail(reason);
  if (currentUid !== null && lstat.uid !== BigInt(currentUid)) fail(reason);
  if (lstat.size < 1n || lstat.size > BigInt(maxBytes)) fail(reason);

  const fd = fs.openSync(
    absolute,
    fs.constants.O_RDONLY |
      (typeof fs.constants.O_NOFOLLOW === "number"
        ? fs.constants.O_NOFOLLOW
        : 0),
  );
  try {
    const before = fs.fstatSync(fd, { bigint: true });
    if (!sameFileIdentity(stableFileIdentity(lstat), stableFileIdentity(before))) {
      fail(reason);
    }
    const size = Number(before.size);
    const bytes = Buffer.allocUnsafe(size);
    let offset = 0;
    while (offset < size) {
      const read = fs.readSync(fd, bytes, offset, size - offset, offset);
      if (read <= 0) fail(reason);
      offset += read;
    }
    const after = fs.fstatSync(fd, { bigint: true });
    if (!sameFileIdentity(stableFileIdentity(before), stableFileIdentity(after))) {
      fail(reason);
    }
    const pathAfter = fs.lstatSync(absolute, { bigint: true });
    if (!sameFileIdentity(stableFileIdentity(before), stableFileIdentity(pathAfter))) {
      fail(reason);
    }
    return Object.freeze({
      path: absolute,
      bytes,
      sha256: sha256Bytes(bytes),
      identity: stableFileIdentity(before),
    });
  } finally {
    fs.closeSync(fd);
  }
}

function directPrivateDirectory(candidate, currentUid, reason) {
  const absolute = path.resolve(String(candidate || ""));
  if (
    !path.isAbsolute(String(candidate || "")) ||
    absolute === path.parse(absolute).root
  ) {
    fail(reason);
  }
  let stat;
  let realpath;
  try {
    stat = fs.lstatSync(absolute, { bigint: true });
    realpath = fs.realpathSync.native(absolute);
  } catch {
    fail(reason);
  }
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    realpath !== absolute ||
    stat.uid !== BigInt(currentUid) ||
    (Number(stat.mode) & 0o777) !== 0o700
  ) {
    fail(reason);
  }
  return Object.freeze({
    path: absolute,
    path_sha256: sha256Text(absolute),
    dev: stat.dev.toString(),
    ino: stat.ino.toString(),
    uid: stat.uid.toString(),
    gid: stat.gid.toString(),
    mode: "0700",
    realpath_sha256: sha256Text(realpath),
  });
}

function sameDirectoryIdentity(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function receiptBody(receipt) {
  const out = Object.create(null);
  for (const [key, value] of Object.entries(receipt)) {
    if (key !== "receipt_id" && key !== "authority") out[key] = value;
  }
  return out;
}

function validateStartupReceipt({
  raw,
  fileSha256,
  contract,
  replayRoot,
  runtimeSourceSha256,
  serviceMainPid,
  operatorUid,
  hostname,
  evaluatedAtMs,
}) {
  const receipt = exactObject(
    raw,
    RECEIPT_KEYS,
    "startup_receipt_shape_invalid",
  );
  const root = exactObject(
    receipt.replay_root,
    RECEIPT_ROOT_KEYS,
    "startup_receipt_replay_root_shape_invalid",
  );

  if (
    receipt.marker !==
      VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_INACTIVE_RUNTIME_V1 ||
    receipt.version !== 1 ||
    receipt.status !== "INACTIVE_RUNTIME_REPLAY_ROOT_BOUND_ROUTE_CLOSED" ||
    receipt.chain_id !== 2050 ||
    receipt.execution_epoch !== 2 ||
    receipt.hostname !== hostname ||
    receipt.pid !== serviceMainPid ||
    receipt.uid !== operatorUid ||
    receipt.runtime_source_path !==
      "tools/void-economic-epoch2-production-gateway-inactive-runtime-v1.mjs" ||
    receipt.runtime_source_sha256 !== runtimeSourceSha256 ||
    receipt.binding_marker !==
      VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_V1 ||
    receipt.gateway_marker !==
      VOID_ECONOMIC_EPOCH2_PUBLIC_SUBMISSION_GATEWAY_CORE_V1 ||
    receipt.replay_store_marker !==
      VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_V1 ||
    receipt.runtime_process_binding_constructed !== true ||
    receipt.binding_constructed_from_exact_replay_root !== true ||
    receipt.replay_root_identity_stable_during_binding !== true ||
    receipt.production_gateway_replay_store_binding_source_verified !== true ||
    receipt.runtime_service_identity_verified !== false ||
    receipt.same_uid_process_model_verified !== false ||
    receipt.production_gateway_replay_store_binding_verified !== false ||
    receipt.runtime_route_active !== false ||
    receipt.public_submission_open !== false ||
    receipt.network_listener_created !== false ||
    receipt.rpc_call !== false ||
    receipt.transaction_submission !== false ||
    receipt.transaction_broadcast !== false ||
    receipt.authoritative_chain2050_write !== false ||
    receipt.migration_authorized !== false ||
    receipt.public_activation_authorized !== false ||
    receipt.funds_movement !== false
  ) {
    fail("startup_receipt_contract_mismatch");
  }

  if (
    canonicalJson(receipt.authority) !==
      canonicalJson(
        VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_INACTIVE_RUNTIME_AUTHORITY_V1,
      )
  ) {
    fail("startup_receipt_authority_mismatch");
  }

  if (
    root.path !== replayRoot.path ||
    root.path_sha256 !== contract.replay_root_path_sha256 ||
    root.path_sha256 !== replayRoot.path_sha256 ||
    root.dev !== replayRoot.dev ||
    root.ino !== replayRoot.ino ||
    root.uid !== replayRoot.uid ||
    root.gid !== replayRoot.gid ||
    root.mode !== replayRoot.mode ||
    root.realpath_sha256 !== replayRoot.realpath_sha256
  ) {
    fail("startup_receipt_replay_root_mismatch");
  }

  const observedAtMs = canonicalUtc(
    receipt.observed_at_utc,
    "startup_receipt_observed_at_invalid",
  );
  if (observedAtMs - evaluatedAtMs > FUTURE_SKEW_MS) {
    fail("startup_receipt_observed_in_future");
  }
  const maxAgeMs = contract.max_evidence_age_seconds * 1000;
  if (evaluatedAtMs - observedAtMs > maxAgeMs) {
    fail("startup_receipt_stale");
  }

  const expectedId =
    RECEIPT_PREFIX + sha256Text(canonicalJson(receiptBody(receipt)));
  if (
    typeof receipt.receipt_id !== "string" ||
    !RECEIPT_ID.test(receipt.receipt_id) ||
    receipt.receipt_id !== expectedId
  ) {
    fail("startup_receipt_id_mismatch");
  }
  if (typeof fileSha256 !== "string" || !SHA256.test(fileSha256)) {
    fail("startup_receipt_file_sha256_invalid");
  }

  return Object.freeze({
    receipt,
    observed_at_ms: observedAtMs,
    observed_at_utc: receipt.observed_at_utc,
  });
}

function normalizeSystemctlShow(raw, contract) {
  if (
    !plain(raw) ||
    raw.active_state !== "active" ||
    raw.sub_state !== "running" ||
    !Number.isSafeInteger(raw.main_pid) ||
    raw.main_pid < 2 ||
    typeof raw.control_group !== "string" ||
    !raw.control_group.startsWith("/") ||
    raw.control_group.includes("..") ||
    typeof raw.invocation_id !== "string" ||
    !INVOCATION.test(raw.invocation_id) ||
    typeof raw.fragment_path !== "string" ||
    !path.isAbsolute(raw.fragment_path)
  ) {
    fail("systemd_service_state_invalid");
  }
  if (raw.service_unit !== contract.service_unit) {
    fail("systemd_service_unit_mismatch");
  }
  return Object.freeze({
    service_unit: raw.service_unit,
    active_state: raw.active_state,
    sub_state: raw.sub_state,
    main_pid: raw.main_pid,
    control_group: raw.control_group,
    invocation_id: raw.invocation_id,
    fragment_path: path.resolve(raw.fragment_path),
  });
}

function normalizeProcessFacts(raw, pid, controlGroup, operatorUid) {
  if (
    !plain(raw) ||
    raw.pid !== pid ||
    raw.uid !== operatorUid ||
    typeof raw.start_time_ticks !== "string" ||
    !/^[1-9][0-9]*$/u.test(raw.start_time_ticks) ||
    raw.cgroup_path !== controlGroup ||
    typeof raw.netns_inode !== "string" ||
    !/^[1-9][0-9]*$/u.test(raw.netns_inode) ||
    !Array.isArray(raw.socket_inodes) ||
    raw.socket_inodes.length > MAX_SOCKET_FDS_PER_PROCESS
  ) {
    fail("service_process_facts_invalid");
  }
  const sockets = raw.socket_inodes.map((value) => String(value));
  if (
    sockets.some((value) => !/^[1-9][0-9]*$/u.test(value)) ||
    new Set(sockets).size !== sockets.length
  ) {
    fail("service_process_socket_set_invalid");
  }
  sockets.sort();
  return Object.freeze({
    pid,
    uid: operatorUid,
    start_time_ticks: raw.start_time_ticks,
    cgroup_path: controlGroup,
    netns_inode: raw.netns_inode,
    socket_inodes: Object.freeze(sockets),
  });
}

function serviceSnapshot(adapters, contract, operatorUid) {
  const show = normalizeSystemctlShow(
    adapters.systemctlShow(contract.service_unit),
    contract,
  );
  const pids = adapters.cgroupPids(show.control_group);
  if (
    !Array.isArray(pids) ||
    pids.length < 1 ||
    pids.length > MAX_SERVICE_PROCESSES ||
    pids.some((pid) => !Number.isSafeInteger(pid) || pid < 2) ||
    new Set(pids).size !== pids.length
  ) {
    fail("service_cgroup_pid_set_invalid");
  }
  const sortedPids = [...pids].sort((a, b) => a - b);
  if (!sortedPids.includes(show.main_pid)) {
    fail("service_main_pid_outside_cgroup");
  }

  const members = sortedPids.map((pid) =>
    normalizeProcessFacts(
      adapters.processFacts(pid),
      pid,
      show.control_group,
      operatorUid,
    )
  );
  const netns = new Set(members.map((row) => row.netns_inode));
  if (netns.size !== 1) fail("service_network_namespace_inconsistent");

  const sockets = members.flatMap((row) => row.socket_inodes);
  if (new Set(sockets).size !== sockets.length) {
    fail("service_socket_inode_duplicated_across_processes");
  }
  if (contract.no_service_socket_fds_required && sockets.length !== 0) {
    fail("service_socket_fd_detected");
  }

  const main = members.find((row) => row.pid === show.main_pid);
  if (!main) fail("service_main_process_missing");

  return Object.freeze({
    service_unit: show.service_unit,
    active_state: show.active_state,
    sub_state: show.sub_state,
    main_pid: show.main_pid,
    main_pid_start_time_ticks: main.start_time_ticks,
    control_group_path_sha256: sha256Text(show.control_group),
    invocation_id: show.invocation_id,
    fragment_path: show.fragment_path,
    cgroup_member_count: members.length,
    member_processes: Object.freeze(members),
    network_namespace_inode: main.netns_inode,
    service_socket_fd_count: sockets.length,
  });
}

function createRealAdaptersV1() {
  function systemctlShow(serviceUnit) {
    const result = spawnSync(
      "systemctl",
      [
        "--user",
        "show",
        serviceUnit,
        "--property=ActiveState",
        "--property=SubState",
        "--property=MainPID",
        "--property=ControlGroup",
        "--property=InvocationID",
        "--property=FragmentPath",
        "--no-pager",
      ],
      { encoding: "utf8" },
    );
    if (result.status !== 0) fail("systemctl_show_failed");
    const values = new Map();
    for (const line of result.stdout.split(/\n/u)) {
      if (!line) continue;
      const index = line.indexOf("=");
      if (index < 1) continue;
      values.set(line.slice(0, index), line.slice(index + 1));
    }
    return {
      service_unit: serviceUnit,
      active_state: values.get("ActiveState"),
      sub_state: values.get("SubState"),
      main_pid: Number(values.get("MainPID")),
      control_group: values.get("ControlGroup"),
      invocation_id: String(values.get("InvocationID") || "").toLowerCase(),
      fragment_path: values.get("FragmentPath"),
    };
  }

  function cgroupPids(controlGroup) {
    const root = "/sys/fs/cgroup";
    const target = path.resolve(root, "." + controlGroup, "cgroup.procs");
    if (!target.startsWith(root + path.sep)) fail("cgroup_path_escape");
    const text = fs.readFileSync(target, "utf8").trim();
    if (!text) return [];
    return text.split(/\s+/u).map((value) => Number(value));
  }

  function processFacts(pid) {
    const proc = "/proc/" + String(pid);
    const statText = fs.readFileSync(path.join(proc, "stat"), "utf8");
    const close = statText.lastIndexOf(")");
    if (close < 0) fail("proc_stat_invalid");
    const fields = statText.slice(close + 1).trim().split(/\s+/u);
    const startTicks = fields[19];
    if (!/^[1-9][0-9]*$/u.test(String(startTicks || ""))) {
      fail("proc_start_ticks_invalid");
    }

    const status = fs.readFileSync(path.join(proc, "status"), "utf8");
    const uidLine = status.split(/\n/u).find((line) => line.startsWith("Uid:"));
    if (!uidLine) fail("proc_uid_missing");
    const uid = Number(uidLine.trim().split(/\s+/u)[1]);
    if (!Number.isSafeInteger(uid) || uid < 0) fail("proc_uid_invalid");

    const cgroupLines = fs
      .readFileSync(path.join(proc, "cgroup"), "utf8")
      .split(/\n/u)
      .filter((line) => line.startsWith("0::"));
    if (cgroupLines.length !== 1) fail("proc_cgroup_invalid");
    const cgroupPath = cgroupLines[0].slice(3);

    const netnsStat = fs.statSync(path.join(proc, "ns", "net"), { bigint: true });
    const socketInodes = [];
    const fds = fs.readdirSync(path.join(proc, "fd"));
    if (fds.length > MAX_SOCKET_FDS_PER_PROCESS) {
      fail("proc_fd_count_above_bound");
    }
    for (const fd of fds) {
      let link;
      try {
        link = fs.readlinkSync(path.join(proc, "fd", fd));
      } catch {
        fail("proc_fd_namespace_changed");
      }
      const match = SOCKET_LINK.exec(link);
      if (match) socketInodes.push(match[1]);
    }

    return {
      pid,
      uid,
      start_time_ticks: startTicks,
      cgroup_path: cgroupPath,
      netns_inode: netnsStat.ino.toString(),
      socket_inodes: [...new Set(socketInodes)].sort(),
    };
  }

  return Object.freeze({
    hostname: () => os.hostname(),
    uid: () => {
      if (typeof process.getuid !== "function") fail("operator_uid_unavailable");
      return process.getuid();
    },
    nowUtcSeconds: () => {
      const ms = Math.floor(Date.now() / 1000) * 1000;
      return new Date(ms).toISOString().replace(".000Z", "Z");
    },
    systemctlShow,
    cgroupPids,
    processFacts,
  });
}

function writePrivateEvidence(filename, evidence, currentUid) {
  const absolute = path.resolve(String(filename || ""));
  if (!path.isAbsolute(String(filename || ""))) fail("evidence_output_path_invalid");
  const parent = directPrivateDirectory(
    path.dirname(absolute),
    currentUid,
    "evidence_output_parent_custody_invalid",
  );
  void parent;

  const bytes = Buffer.from(JSON.stringify(evidence, null, 2) + "\n", "utf8");
  let fd;
  try {
    fd = fs.openSync(
      absolute,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        (typeof fs.constants.O_NOFOLLOW === "number"
          ? fs.constants.O_NOFOLLOW
          : 0),
      0o600,
    );
  } catch {
    fail("evidence_output_create_failed");
  }
  try {
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  const directoryFd = fs.openSync(
    path.dirname(absolute),
    fs.constants.O_RDONLY |
      (typeof fs.constants.O_DIRECTORY === "number"
        ? fs.constants.O_DIRECTORY
        : 0),
  );
  try {
    fs.fsyncSync(directoryFd);
  } finally {
    fs.closeSync(directoryFd);
  }
  return Object.freeze({
    path: absolute,
    sha256: sha256Bytes(bytes),
    bytes: bytes.length,
  });
}

export function collectVoidEconomicEpoch2ProductionGatewayRuntimeEvidenceCandidateV1({
  confirmation,
  expectedServiceContractId,
  serviceContract,
  replayRoot,
  statusFile,
  runtimeSourceFile,
  outputPath = null,
  adapters = createRealAdaptersV1(),
}) {
  if (
    confirmation !==
    VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_CONFIRMATION_V1
  ) {
    fail("runtime_evidence_confirmation_required");
  }

  const contract = validateContract(
    serviceContract,
    expectedServiceContractId,
  );
  const operatorUid = adapters.uid();
  if (!Number.isSafeInteger(operatorUid) || operatorUid < 0) {
    fail("operator_uid_invalid");
  }
  const hostname = adapters.hostname();
  if (hostname !== contract.hostname) fail("runtime_hostname_mismatch");

  const replayRootAbsolute = path.resolve(String(replayRoot || ""));
  const statusFileAbsolute = path.resolve(String(statusFile || ""));
  const sourceFileAbsolute = path.resolve(String(runtimeSourceFile || ""));
  if (
    !path.isAbsolute(String(replayRoot || "")) ||
    !path.isAbsolute(String(statusFile || "")) ||
    !path.isAbsolute(String(runtimeSourceFile || ""))
  ) {
    fail("runtime_absolute_paths_required");
  }
  if (sha256Text(replayRootAbsolute) !== contract.replay_root_path_sha256) {
    fail("runtime_replay_root_path_contract_mismatch");
  }
  if (sha256Text(statusFileAbsolute) !== contract.status_file_path_sha256) {
    fail("runtime_status_file_path_contract_mismatch");
  }

  const evaluatedAtUtc = adapters.nowUtcSeconds();
  const evaluatedAtMs = canonicalUtc(
    evaluatedAtUtc,
    "runtime_evaluation_time_invalid",
  );

  const beforeSnapshot = serviceSnapshot(adapters, contract, operatorUid);

  const unitFile = readStableDirectFile(beforeSnapshot.fragment_path, {
    forbidGroupWorldWrite: true,
    currentUid: operatorUid,
    reason: "service_unit_file_invalid",
  });
  if (unitFile.sha256 !== contract.unit_file_sha256) {
    fail("service_unit_file_sha256_mismatch");
  }

  const sourceFile = readStableDirectFile(sourceFileAbsolute, {
    forbidGroupWorldWrite: true,
    currentUid: operatorUid,
    reason: "runtime_source_file_invalid",
  });
  if (sourceFile.sha256 !== contract.runtime_source_sha256) {
    fail("runtime_source_file_sha256_mismatch");
  }

  const rootBefore = directPrivateDirectory(
    replayRootAbsolute,
    operatorUid,
    "runtime_replay_root_custody_invalid",
  );

  const statusParent = directPrivateDirectory(
    path.dirname(statusFileAbsolute),
    operatorUid,
    "runtime_status_parent_custody_invalid",
  );
  void statusParent;
  const status = readStableDirectFile(statusFileAbsolute, {
    exactMode: 0o600,
    currentUid: operatorUid,
    maxBytes: 256 * 1024,
    reason: "runtime_status_file_invalid",
  });

  let parsedReceipt;
  try {
    parsedReceipt = JSON.parse(status.bytes.toString("utf8"));
  } catch {
    fail("startup_receipt_json_invalid");
  }

  const receipt = validateStartupReceipt({
    raw: parsedReceipt,
    fileSha256: status.sha256,
    contract,
    replayRoot: rootBefore,
    runtimeSourceSha256: sourceFile.sha256,
    serviceMainPid: beforeSnapshot.main_pid,
    operatorUid,
    hostname,
    evaluatedAtMs,
  });

  const afterSnapshot = serviceSnapshot(adapters, contract, operatorUid);
  if (canonicalJson(beforeSnapshot) !== canonicalJson(afterSnapshot)) {
    fail("service_snapshot_changed_during_collection");
  }

  const rootAfter = directPrivateDirectory(
    replayRootAbsolute,
    operatorUid,
    "runtime_replay_root_custody_invalid",
  );
  if (!sameDirectoryIdentity(rootBefore, rootAfter)) {
    fail("runtime_replay_root_changed_during_collection");
  }

  const unitAfter = fs.lstatSync(unitFile.path, { bigint: true });
  if (!sameFileIdentity(unitFile.identity, stableFileIdentity(unitAfter))) {
    fail("service_unit_file_changed_during_collection");
  }
  const sourceAfter = fs.lstatSync(sourceFile.path, { bigint: true });
  if (!sameFileIdentity(sourceFile.identity, stableFileIdentity(sourceAfter))) {
    fail("runtime_source_file_changed_during_collection");
  }
  const statusAfter = fs.lstatSync(status.path, { bigint: true });
  if (!sameFileIdentity(status.identity, stableFileIdentity(statusAfter))) {
    fail("runtime_status_file_changed_during_collection");
  }

  if (
    beforeSnapshot.service_socket_fd_count !== 0 ||
    afterSnapshot.service_socket_fd_count !== 0
  ) {
    fail("service_socket_fd_detected");
  }

  const validUntilMs =
    receipt.observed_at_ms +
    contract.max_evidence_age_seconds * 1000;

  const evidenceBody = Object.freeze({
    marker:
      VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_CANDIDATE_V1,
    version: 1,
    status: "RUNTIME_BINDING_EVIDENCE_CANDIDATE_REVIEW_REQUIRED",
    chain_id: 2050,
    execution_epoch: 2,
    service_contract_id: contract.contract_id,
    hostname,
    service_unit: contract.service_unit,
    unit_file_sha256: unitFile.sha256,
    runtime_source_sha256: sourceFile.sha256,
    startup_receipt_id: receipt.receipt.receipt_id,
    startup_receipt_file_sha256: status.sha256,
    startup_receipt_status_file_path_sha256:
      contract.status_file_path_sha256,
    replay_root_path_sha256: contract.replay_root_path_sha256,
    replay_root_dev: rootBefore.dev,
    replay_root_ino: rootBefore.ino,
    replay_root_uid: rootBefore.uid,
    replay_root_gid: rootBefore.gid,
    replay_root_mode: rootBefore.mode,
    replay_root_identity_stable: true,
    systemd_service_active: true,
    systemd_service_running: true,
    service_main_pid: beforeSnapshot.main_pid,
    service_main_pid_start_time_ticks:
      beforeSnapshot.main_pid_start_time_ticks,
    service_invocation_id: beforeSnapshot.invocation_id,
    service_control_group_path_sha256:
      beforeSnapshot.control_group_path_sha256,
    service_cgroup_member_count:
      beforeSnapshot.cgroup_member_count,
    all_service_processes_current_uid: true,
    same_uid_process_model_observed: true,
    network_namespace_consistent: true,
    service_socket_fd_count: 0,
    no_service_socket_fds_observed: true,
    runtime_process_binding_constructed: true,
    replay_root_binding_receipt_verified: true,
    production_gateway_replay_store_binding_source_verified: true,
    production_gateway_replay_store_binding_evidence_candidate: true,
    upstream_live_evidence_semantically_verified: false,
    runtime_service_identity_verified: false,
    same_uid_process_model_verified: false,
    production_gateway_replay_store_binding_verified: false,
    runtime_route_active: false,
    public_submission_open: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    cross_epoch_replay_protection_proven: false,
    observed_at_utc: receipt.observed_at_utc,
    evaluated_at_utc: evaluatedAtUtc,
    valid_until_utc: utcFromMs(validUntilMs),
    migration_authorized: false,
    public_activation_authorized: false,
    funds_movement_authorized: false,
  });

  const evidenceBase = Object.freeze({
    ...evidenceBody,
    authority:
      VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_AUTHORITY_V1,
  });
  const evidenceId =
    voidEconomicEpoch2ProductionGatewayRuntimeEvidenceIdV1({
      ...evidenceBase,
      evidence_id: EVIDENCE_PREFIX + "0".repeat(64),
    });
  if (!EVIDENCE_ID.test(evidenceId)) fail("runtime_evidence_id_invalid");

  const evidence = Object.freeze({
    ...evidenceBase,
    evidence_id: evidenceId,
  });

  let output = null;
  if (outputPath !== null) {
    output = writePrivateEvidence(outputPath, evidence, operatorUid);
  }

  return Object.freeze({
    marker:
      VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_CANDIDATE_V1,
    evidence,
    output_written: output !== null,
    output_path: output?.path ?? null,
    output_sha256: output?.sha256 ?? null,
    production_gateway_replay_store_binding_verified: false,
    cross_epoch_replay_protection_proven: false,
    service_action_performed: false,
    network_request_performed: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    migration_authorized: false,
    public_activation_authorized: false,
    funds_movement: false,
  });
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, "utf8"));
}

async function main() {
  const contractPath = path.resolve(String(arg("--service-contract") || ""));
  const outputPath = path.resolve(String(arg("--output") || ""));
  if (!fs.existsSync(contractPath)) fail("service_contract_file_missing");

  const result =
    collectVoidEconomicEpoch2ProductionGatewayRuntimeEvidenceCandidateV1({
      confirmation: arg("--confirmation"),
      expectedServiceContractId: arg("--expected-service-contract-id"),
      serviceContract: readJson(contractPath),
      replayRoot: arg("--replay-root"),
      statusFile: arg("--status-file"),
      runtimeSourceFile: arg("--runtime-source-file"),
      outputPath,
    });

  console.log(
    VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_CANDIDATE_V1,
  );
  console.log("evidence_id=" + result.evidence.evidence_id);
  console.log("service_contract_id=" + result.evidence.service_contract_id);
  console.log("systemd_service_active=true");
  console.log("systemd_service_running=true");
  console.log("same_uid_process_model_observed=true");
  console.log("no_service_socket_fds_observed=true");
  console.log("replay_root_binding_receipt_verified=true");
  console.log("production_gateway_replay_store_binding_evidence_candidate=true");
  console.log("upstream_live_evidence_semantically_verified=false");
  console.log("runtime_service_identity_verified=false");
  console.log("same_uid_process_model_verified=false");
  console.log("production_gateway_replay_store_binding_verified=false");
  console.log("runtime_route_active=false");
  console.log("public_submission_open=false");
  console.log("cross_epoch_replay_protection_proven=false");
  console.log("service_action_performed=false");
  console.log("network_request_performed=false");
  console.log("transaction_submission=false");
  console.log("transaction_broadcast=false");
  console.log("authoritative_chain2050_write=false");
  console.log("migration_authorized=false");
  console.log("public_activation_authorized=false");
  console.log("funds_movement=false");
  console.log("output=" + result.output_path);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main().catch((error) => {
    process.stderr.write("HOLD: " + error.message + "\n");
    process.exitCode = 1;
  });
}
