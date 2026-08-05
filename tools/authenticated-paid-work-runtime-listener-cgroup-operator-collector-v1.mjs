#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { hostname as systemHostname } from "node:os";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

import {
  FALSE_SAFETY,
  buildAuthenticatedPaidWorkRuntimeListenerCgroupBindingV1,
  validateAuthenticatedPaidWorkRuntimeListenerCgroupBindingV1,
} from "../integrations/agents/authenticated-paid-work-runtime-listener-cgroup-binding-v1/index.mjs";

export const MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_RUNTIME_LISTENER_CGROUP_OPERATOR_COLLECTOR_V1";
export const CONFIRMATION =
  "collect-authenticated-paid-work-runtime-listener-cgroup-evidence-v1";
export const EXPECTED_HOST = "zoso-Precision-Tower-7810";
export const EXPECTED_SERVICE =
  "void-agent-paid-work-submission-receiver-v1.service";
export const EXPECTED_ADDRESS = "127.0.0.1";
export const EXPECTED_PORT = 4187;
export const MAX_AGE_SECONDS = 60;
export const DECISION = "HOLD_PENDING_COMPOSED_RUNTIME_REVALIDATION";

const MAX_PID = 4_194_304;
const MAX_CGROUP_MEMBERS = 4_096;
const MAX_VISIBLE_PROCESSES = 131_072;
const MAX_FDS_PER_PROCESS = 65_536;
const MAX_TEXT_BYTES = 8 * 1024 * 1024;
const LISTEN_STATE_HEX = "0A";
const TCP_PORT_HEX = EXPECTED_PORT.toString(16).toUpperCase().padStart(4, "0");
const SOCKET_LINK_RE = /^socket:\[(\d+)\]$/;
const INTEGER_RE = /^\d+$/;
const SHA256_RE = /^[a-f0-9]{64}$/;

function fail(message) {
  throw new Error(message);
}

function requireString(value, label, minimum = 1, maximum = 4096) {
  if (typeof value !== "string") fail(`${label}_must_be_string`);
  if (value !== value.trim()) fail(`${label}_must_be_trimmed`);
  if (value.length < minimum || value.length > maximum) {
    fail(`${label}_length_out_of_range`);
  }
  return value;
}

function requireSafeInteger(value, minimum, maximum, label) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    fail(`${label}_out_of_range`);
  }
  return value;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256Text(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function canonicalUtc(date, label) {
  const parsed = date instanceof Date ? date : new Date(date);
  if (!Number.isFinite(parsed.getTime())) fail(`${label}_invalid`);
  return parsed.toISOString();
}

function sameJson(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function parsePositiveInteger(value, label, maximum = Number.MAX_SAFE_INTEGER) {
  const text = String(value);
  if (!INTEGER_RE.test(text)) fail(`${label}_invalid_integer`);
  return requireSafeInteger(Number(text), 1, maximum, label);
}

function normalizeControlGroupPath(value) {
  const path = requireString(value, "control_group", 2, 4096);
  if (!path.startsWith("/")) fail("control_group_must_be_absolute");
  if (/\0|\r|\n/.test(path)) fail("control_group_contains_control_character");
  if (path.includes("//")) fail("control_group_contains_empty_component");
  const components = path.split("/").slice(1);
  if (components.some((component) => component === "." || component === "..")) {
    fail("control_group_contains_relative_component");
  }
  return path;
}

function parseSystemctlShow(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("systemctl_show_must_be_object");
  }
  const actual = Object.keys(value).sort();
  const expected = ["active_state", "control_group", "main_pid"].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail("systemctl_show_keys_mismatch");
  }
  if (value.active_state !== "active") fail("service_not_active");
  return {
    active_state: "active",
    main_pid: requireSafeInteger(value.main_pid, 2, MAX_PID, "main_pid"),
    control_group: normalizeControlGroupPath(value.control_group),
  };
}

function parseCgroupProcs(value) {
  const pids = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => parsePositiveInteger(line, "cgroup_pid", MAX_PID));
  if (pids.length < 1 || pids.length > MAX_CGROUP_MEMBERS) {
    fail("cgroup_member_count_out_of_range");
  }
  const unique = [...new Set(pids)].sort((a, b) => a - b);
  if (unique.length !== pids.length) fail("cgroup_contains_duplicate_pid");
  return unique;
}

function parseProcCgroup(value) {
  const matches = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.startsWith("0::"));
  if (matches.length !== 1) fail("proc_cgroup_v2_path_not_unique");
  return normalizeControlGroupPath(matches[0].slice(3));
}

function parseProcStartTimeTicks(value) {
  const close = value.lastIndexOf(")");
  if (close < 2) fail("proc_stat_comm_terminator_missing");
  const fields = value.slice(close + 1).trim().split(/\s+/);
  if (fields.length < 20) fail("proc_stat_field_count_too_small");
  return parsePositiveInteger(fields[19], "proc_start_time_ticks");
}

function decodeIpv4LittleEndian(value) {
  if (!/^[A-Fa-f0-9]{8}$/.test(value)) fail("tcp_ipv4_hex_invalid");
  const bytes = value.match(/../g).reverse();
  return bytes.map((item) => String(Number.parseInt(item, 16))).join(".");
}

function parseTcpTable(value, addressFamily) {
  const listeners = [];
  const lines = value.split(/\r?\n/).slice(1);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const fields = line.split(/\s+/);
    if (fields.length < 10) fail(`${addressFamily}_tcp_row_too_short`);
    const local = fields[1].split(":");
    if (local.length !== 2) fail(`${addressFamily}_tcp_local_endpoint_invalid`);
    const localPortHex = local[1].toUpperCase();
    if (localPortHex !== TCP_PORT_HEX || fields[3].toUpperCase() !== LISTEN_STATE_HEX) {
      continue;
    }
    const socketInode = parsePositiveInteger(fields[9], "tcp_socket_inode");
    const socketUid = requireSafeInteger(
      Number(fields[7]),
      0,
      4_294_967_295,
      "tcp_socket_uid",
    );
    listeners.push({
      address_family: addressFamily,
      local_address:
        addressFamily === "ipv4" ? decodeIpv4LittleEndian(local[0]) : local[0].toLowerCase(),
      local_port: Number.parseInt(localPortHex, 16),
      socket_inode: socketInode,
      socket_uid: socketUid,
    });
  }
  return listeners;
}

function collectProcessRecord(adapters, pid, expectedControlGroup) {
  const startTime = parseProcStartTimeTicks(adapters.readText(`/proc/${pid}/stat`));
  const cgroupPath = parseProcCgroup(adapters.readText(`/proc/${pid}/cgroup`));
  if (cgroupPath !== expectedControlGroup) fail("process_control_group_mismatch");
  return {
    pid,
    start_time_ticks: startTime,
    proc_cgroup_path_sha256: sha256Text(cgroupPath),
  };
}

function scanSocketOwners(adapters, socketInode) {
  const expectedLink = `socket:[${socketInode}]`;
  const visiblePids = adapters.listSameUidPids();
  if (!Array.isArray(visiblePids)) fail("visible_pid_scan_must_return_array");
  if (visiblePids.length > MAX_VISIBLE_PROCESSES) fail("visible_pid_scan_too_large");
  const owners = [];
  let previous = 0;
  for (const pid of visiblePids) {
    requireSafeInteger(pid, 2, MAX_PID, "visible_pid");
    if (pid <= previous) fail("visible_pid_scan_not_strictly_sorted");
    previous = pid;
    const links = adapters.listFdLinks(pid);
    if (!Array.isArray(links)) fail("fd_link_scan_must_return_array");
    if (links.length > MAX_FDS_PER_PROCESS) fail("fd_link_scan_too_large");
    if (links.some((link) => link === expectedLink)) owners.push(pid);
  }
  return owners;
}

function snapshotTargetListeners(adapters, mainPid, expectedUid) {
  const ipv4 = parseTcpTable(adapters.readText(`/proc/${mainPid}/net/tcp`), "ipv4");
  const ipv6 = parseTcpTable(adapters.readText(`/proc/${mainPid}/net/tcp6`), "ipv6");
  if (ipv6.length !== 0) fail("unexpected_ipv6_target_listener");
  if (ipv4.length !== 1) fail("exactly_one_ipv4_target_listener_required");
  const listener = ipv4[0];
  if (listener.local_address !== EXPECTED_ADDRESS) fail("listener_local_address_mismatch");
  if (listener.local_port !== EXPECTED_PORT) fail("listener_local_port_mismatch");
  if (listener.socket_uid !== expectedUid) fail("listener_socket_uid_mismatch");
  return listener;
}

function assertStableProcess(adapters, process, expectedControlGroup, label) {
  const current = collectProcessRecord(adapters, process.pid, expectedControlGroup);
  if (!sameJson(current, process)) fail(`${label}_process_identity_changed`);
}

function ensureExactConfirmation(value) {
  if (value !== CONFIRMATION) fail("confirmation_mismatch");
}

export function collectAuthenticatedPaidWorkRuntimeListenerCgroupEvidenceV1({
  confirmation,
  outputPath = null,
  adapters = createRealAdaptersV1(),
}) {
  ensureExactConfirmation(confirmation);
  if (adapters.hostname() !== EXPECTED_HOST) fail("hostname_mismatch");
  const uid = requireSafeInteger(adapters.uid(), 1, 4_294_967_295, "operator_uid");

  const observedAtUtc = canonicalUtc(adapters.now(), "observed_at_utc");
  const firstShow = parseSystemctlShow(adapters.systemctlShow());
  const controlGroupHash = sha256Text(firstShow.control_group);
  if (!SHA256_RE.test(controlGroupHash)) fail("control_group_hash_invalid");

  const cgroupProcsPath = `/sys/fs/cgroup${firstShow.control_group}/cgroup.procs`;
  const firstPids = parseCgroupProcs(adapters.readText(cgroupProcsPath));
  if (!firstPids.includes(firstShow.main_pid)) fail("main_pid_missing_from_cgroup_snapshot");

  const firstMembers = firstPids.map((pid) =>
    collectProcessRecord(adapters, pid, firstShow.control_group),
  );
  const mainMember = firstMembers.find((process) => process.pid === firstShow.main_pid);
  if (!mainMember) fail("main_pid_process_record_missing");

  const firstListener = snapshotTargetListeners(adapters, firstShow.main_pid, uid);
  const firstOwners = scanSocketOwners(adapters, firstListener.socket_inode);
  if (firstOwners.length !== 1) fail("exactly_one_same_uid_socket_owner_required");
  const ownerPid = firstOwners[0];
  const ownerMember = firstMembers.find((process) => process.pid === ownerPid);
  if (!ownerMember) fail("listener_owner_outside_service_cgroup");

  const serviceNamespaceInode = requireSafeInteger(
    adapters.statInode(`/proc/${firstShow.main_pid}/ns/net`),
    1,
    Number.MAX_SAFE_INTEGER,
    "service_network_namespace_inode",
  );
  const listenerNamespaceInode = requireSafeInteger(
    adapters.statInode(`/proc/${ownerPid}/ns/net`),
    1,
    Number.MAX_SAFE_INTEGER,
    "listener_network_namespace_inode",
  );
  if (serviceNamespaceInode !== listenerNamespaceInode) {
    fail("listener_network_namespace_mismatch");
  }

  const secondShow = parseSystemctlShow(adapters.systemctlShow());
  if (!sameJson(firstShow, secondShow)) fail("systemd_service_identity_changed");
  const secondPids = parseCgroupProcs(adapters.readText(cgroupProcsPath));
  if (!sameJson(firstPids, secondPids)) fail("cgroup_snapshot_changed");
  for (const process of firstMembers) {
    assertStableProcess(adapters, process, firstShow.control_group, "cgroup_member");
  }
  const secondListener = snapshotTargetListeners(adapters, firstShow.main_pid, uid);
  if (!sameJson(firstListener, secondListener)) fail("target_listener_snapshot_changed");
  const secondOwners = scanSocketOwners(adapters, secondListener.socket_inode);
  if (!sameJson(firstOwners, secondOwners)) fail("socket_owner_snapshot_changed");
  assertStableProcess(adapters, ownerMember, firstShow.control_group, "owner");
  const secondServiceNamespace = adapters.statInode(`/proc/${firstShow.main_pid}/ns/net`);
  const secondListenerNamespace = adapters.statInode(`/proc/${ownerPid}/ns/net`);
  if (
    secondServiceNamespace !== serviceNamespaceInode ||
    secondListenerNamespace !== listenerNamespaceInode
  ) {
    fail("network_namespace_snapshot_changed");
  }

  const evaluatedAtUtc = canonicalUtc(adapters.now(), "evaluated_at_utc");
  const ageSeconds = Math.ceil(
    (Date.parse(evaluatedAtUtc) - Date.parse(observedAtUtc)) / 1000,
  );
  if (ageSeconds < 0 || ageSeconds > MAX_AGE_SECONDS) fail("collection_window_stale");

  const input = {
    observed_at_utc: observedAtUtc,
    evaluated_at_utc: evaluatedAtUtc,
    max_age_seconds: MAX_AGE_SECONDS,
    service: {
      service_active: true,
      main_pid: firstShow.main_pid,
      main_pid_start_time_ticks: mainMember.start_time_ticks,
      manager_control_group_path_sha256: controlGroupHash,
      cgroup_snapshot_complete: true,
      main_pid_in_control_group: true,
      cgroup_member_count: firstMembers.length,
      cgroup_member_processes: firstMembers,
    },
    network_namespace: {
      service_network_namespace_inode: serviceNamespaceInode,
      listener_network_namespace_inode: listenerNamespaceInode,
      network_namespace_binding_verified: true,
    },
    listeners: [
      {
        protocol: "tcp",
        address_family: "ipv4",
        local_address: EXPECTED_ADDRESS,
        local_port: EXPECTED_PORT,
        state: "LISTEN",
        socket_inode: firstListener.socket_inode,
        owner_pid: ownerPid,
        owner_start_time_ticks: ownerMember.start_time_ticks,
        owner_proc_cgroup_path_sha256: controlGroupHash,
        network_namespace_inode: listenerNamespaceInode,
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
    safety: structuredClone(FALSE_SAFETY),
  };

  const receipt = validateAuthenticatedPaidWorkRuntimeListenerCgroupBindingV1(
    buildAuthenticatedPaidWorkRuntimeListenerCgroupBindingV1(input),
  );

  let outputWritten = false;
  if (outputPath !== null) {
    const output = requireString(outputPath, "output_path", 1, 4096);
    adapters.writePrivateReceipt(output, `${JSON.stringify(receipt, null, 2)}\n`);
    outputWritten = true;
  }

  return {
    marker: MARKER,
    receipt,
    output_written: outputWritten,
    private_path_disclosed: false,
    network_request_performed: false,
    service_mutation_performed: false,
    credential_access_performed: false,
    raw_token_read: false,
    execution_authorized: false,
    decision: DECISION,
  };
}

function transientProcError(error) {
  return error && ["ENOENT", "ESRCH"].includes(error.code);
}

function readBoundedText(path) {
  const raw = readFileSync(path);
  if (raw.length > MAX_TEXT_BYTES) fail("read_text_size_limit_exceeded");
  return raw.toString("utf8");
}

function parseUidFromStatus(value) {
  const line = value.split(/\r?\n/).find((item) => item.startsWith("Uid:"));
  if (!line) fail("proc_status_uid_missing");
  const fields = line.trim().split(/\s+/);
  if (fields.length < 2) fail("proc_status_uid_invalid");
  return requireSafeInteger(Number(fields[1]), 0, 4_294_967_295, "proc_status_uid");
}

function realSystemctlShow() {
  const result = spawnSync(
    "systemctl",
    [
      "--user",
      "show",
      EXPECTED_SERVICE,
      "--property=ActiveState",
      "--property=MainPID",
      "--property=ControlGroup",
      "--no-pager",
    ],
    {
      encoding: "utf8",
      timeout: 5_000,
      maxBuffer: 64 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  if (result.error) fail(`systemctl_show_failed_${result.error.code || "error"}`);
  if (result.status !== 0) fail("systemctl_show_nonzero");
  const properties = new Map();
  for (const line of result.stdout.split(/\r?\n/)) {
    if (!line) continue;
    const separator = line.indexOf("=");
    if (separator < 1) fail("systemctl_show_line_invalid");
    properties.set(line.slice(0, separator), line.slice(separator + 1));
  }
  return {
    active_state: properties.get("ActiveState"),
    main_pid: Number(properties.get("MainPID")),
    control_group: properties.get("ControlGroup"),
  };
}

function realListSameUidPids() {
  const uid = process.getuid();
  const pids = [];
  const entries = readdirSync("/proc", { withFileTypes: true });
  if (entries.length > MAX_VISIBLE_PROCESSES * 4) fail("proc_directory_unexpectedly_large");
  for (const entry of entries) {
    if (!entry.isDirectory() || !INTEGER_RE.test(entry.name)) continue;
    const pid = Number(entry.name);
    if (!Number.isSafeInteger(pid) || pid < 2 || pid > MAX_PID) continue;
    try {
      if (parseUidFromStatus(readBoundedText(`/proc/${pid}/status`)) === uid) pids.push(pid);
    } catch (error) {
      if (transientProcError(error)) continue;
      throw error;
    }
  }
  return [...new Set(pids)].sort((a, b) => a - b);
}

function realListFdLinks(pid) {
  const directory = `/proc/${pid}/fd`;
  let entries;
  try {
    entries = readdirSync(directory);
  } catch (error) {
    if (transientProcError(error)) return [];
    throw error;
  }
  if (entries.length > MAX_FDS_PER_PROCESS) fail("fd_directory_too_large");
  const links = [];
  for (const entry of entries) {
    try {
      const link = readlinkSync(`${directory}/${entry}`);
      const match = SOCKET_LINK_RE.exec(link);
      if (match) links.push(`socket:[${parsePositiveInteger(match[1], "fd_socket_inode")}]`);
    } catch (error) {
      if (transientProcError(error)) continue;
      throw error;
    }
  }
  return links.sort();
}

function ensurePrivateDirectory(path) {
  const resolved = resolve(path);
  if (!existsSync(resolved)) mkdirSync(resolved, { recursive: true, mode: 0o700 });
  const metadata = lstatSync(resolved);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    fail("output_parent_must_be_direct_directory");
  }
  if (metadata.uid !== process.getuid()) fail("output_parent_owner_mismatch");
  if ((metadata.mode & 0o777) !== 0o700) fail("output_parent_mode_must_be_0700");
  return resolved;
}

function writePrivateReceipt(path, text) {
  const resolved = resolve(path);
  ensurePrivateDirectory(dirname(resolved));
  const descriptor = openSync(resolved, "wx", 0o600);
  try {
    writeFileSync(descriptor, text, "utf8");
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
  const metadata = lstatSync(resolved);
  if (!metadata.isFile() || metadata.isSymbolicLink()) fail("output_not_direct_regular_file");
  if (metadata.uid !== process.getuid()) fail("output_owner_mismatch");
  if ((metadata.mode & 0o777) !== 0o600) fail("output_mode_must_be_0600");
}

export function createRealAdaptersV1() {
  if (typeof process.getuid !== "function") fail("posix_uid_required");
  return {
    hostname: () => systemHostname(),
    uid: () => process.getuid(),
    now: () => new Date(),
    systemctlShow: realSystemctlShow,
    readText: readBoundedText,
    statInode: (path) => Number(statSync(path).ino),
    listSameUidPids: realListSameUidPids,
    listFdLinks: realListFdLinks,
    writePrivateReceipt,
  };
}

function parseArguments(argv) {
  const options = { confirmation: null, outputPath: null };
  const seen = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (!["--confirmation", "--output"].includes(option)) fail("unknown_option");
    if (seen.has(option)) fail("duplicate_option");
    seen.add(option);
    const value = argv[index + 1];
    if (value === undefined) fail("option_value_missing");
    index += 1;
    if (option === "--confirmation") options.confirmation = value;
    if (option === "--output") options.outputPath = value;
  }
  if (options.confirmation === null) fail("confirmation_required");
  return options;
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  const result = collectAuthenticatedPaidWorkRuntimeListenerCgroupEvidenceV1({
    confirmation: options.confirmation,
    outputPath: options.outputPath,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`${MARKER}_EXACT_GREEN\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`HOLD: ${String(error?.message || error)}\n`);
    process.exitCode = 1;
  }
}
