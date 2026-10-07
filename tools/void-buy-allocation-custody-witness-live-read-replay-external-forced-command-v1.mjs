import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import {
  parseBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessJournalV1,
  planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessAdvanceV1,
} from "../dist/economic/buy_void_allocation_custody_witness_live_read_replay_external_witness_v1.js";
import {
  withBuyVoidFilesystemBakeryLockV1,
} from "../dist/economic/buy_void_filesystem_bakery_lock_v1.js";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_FORCED_COMMAND_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_FORCED_COMMAND_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_FORCED_COMMAND_AUTHORITY_V1 =
  Object.freeze({
    source_handler: true,
    forced_command_boundary: true,
    root_owned_nonwritable_config_parent_required: true,
    root_owned_read_only_config_file_required: true,
    fixed_witness_filename: true,
    fixed_intent_filename: true,
    caller_selected_path: false,
    caller_selected_command: false,
    caller_selected_identity: false,
    descriptor_pinned_authority_root: true,
    nofollow_ancestor_walk: true,
    nofollow_config_read: true,
    nofollow_witness_open: true,
    single_link_mode_0600_witness_required: true,
    mode_0700_authority_root_required: true,
    shared_cross_process_lock: true,
    canonical_external_witness_planner_required: true,
    one_planned_event_per_append: true,
    durable_append_intent: true,
    exact_idempotence: true,
    torn_append_recovery: true,
    planner_bound_orphan_torn_recovery: true,
    witness_file_fsync: true,
    authority_directory_fsync: true,
    post_mutation_path_rebind: true,
    server_observed_witness_identity_required: true,
    original_remote_command_rejected: true,
    shell_access: false,
    generic_write_primitive: false,
    generic_delete_primitive: false,
    generic_rename_primitive: false,
    service_control_primitive: false,
    live_nimo_installed: false,
    server_controlled_policy_origin_proven: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    live_remote_read_performed: false,
    live_remote_append_performed: false,
    runtime_integration: false,
    rollback_resistance_proven: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    production_gate_ready: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    presale_activation: false,
    market_activation: false,
    funds_movement: false,
  });

const CONFIG_SCHEMA =
  "void_buy_void_allocation_custody_witness_live_read_replay_external_forced_command_config_v1";
const CONFIG_MARKER =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_FORCED_COMMAND_CONFIG_V1";
const REQUEST_SCHEMA =
  "void_buy_void_allocation_custody_witness_live_read_replay_external_forced_command_request_v1";
const REQUEST_MARKER =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_FORCED_COMMAND_REQUEST_V1";
const RESPONSE_SCHEMA =
  "void_buy_void_allocation_custody_witness_live_read_replay_external_forced_command_response_v1";
const RESPONSE_MARKER =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_FORCED_COMMAND_RESPONSE_V1";
const INTENT_SCHEMA =
  "void_buy_void_allocation_custody_witness_live_read_replay_external_forced_command_intent_v1";
const INTENT_MARKER =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_FORCED_COMMAND_INTENT_V1";

const WITNESS_NAME =
  "buy-void-allocation-custody-witness-live-read-replay-external-v1.jsonl";
const INTENT_NAME =
  "buy-void-allocation-custody-witness-live-read-replay-external-append-intent-v1.json";
const LOCK_NAME =
  ".buy-void-allocation-custody-witness-live-read-replay-external-v1";

const MAX_CONFIG_BYTES = 256 * 1024;
const MAX_REQUEST_BYTES = 12 * 1024 * 1024;
const MAX_WITNESS_EVENT_BYTES = 4 * 1024;
const MAX_INTENT_METADATA_BYTES = 64 * 1024;
const MAX_INTENT_BYTES =
  4 * Math.ceil(MAX_REQUEST_BYTES / 3) +
  4 * Math.ceil(MAX_WITNESS_EVENT_BYTES / 3) +
  MAX_INTENT_METADATA_BYTES;
const MAX_REPLAY_JOURNAL_BYTES = 8 * 1024 * 1024;
const MAX_HIGH_WATER_BYTES = 16 * 1024;
const MAX_WITNESS_BYTES = 8193 * MAX_WITNESS_EVENT_BYTES;
const O_NOFOLLOW = fs.constants.O_NOFOLLOW;
const O_DIRECTORY = fs.constants.O_DIRECTORY;
const REQUEST_ID = /^voidwlrwreq1_[0-9a-f]{64}$/u;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const SAFE_TEXT = /^[A-Za-z0-9._:@/+~-]{1,300}$/u;

function fail(reason) {
  throw new Error(reason);
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
  if (value && typeof value === "object") {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
        .join(",") +
      "}"
    );
  }
  fail("witness_replay_external_forced_command_noncanonical_value");
}

function canonicalLine(value) {
  return canonicalJson(value) + "\n";
}

function sha256Id(value) {
  return "sha256:" + crypto.createHash("sha256").update(value).digest("hex");
}

function exactObject(value, keys, reason) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(reason);
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(reason);
  }
  return value;
}

function safeText(value, reason) {
  if (typeof value !== "string" || !SAFE_TEXT.test(value)) fail(reason);
  return value;
}

function safeSha(value, reason) {
  if (typeof value !== "string" || !SHA256_ID.test(value)) fail(reason);
  return value;
}

function sameDirectory(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode
  );
}

function sameFileIdentity(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode &&
    left.nlink === right.nlink
  );
}

function sameFile(left, right) {
  return (
    sameFileIdentity(left, right) &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

function validateAncestor(stat, reason) {
  const uid = BigInt(process.getuid());
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    (stat.uid !== uid && stat.uid !== 0n) ||
    (
      (Number(stat.mode) & 0o022) !== 0 &&
      (Number(stat.mode) & 0o1000) === 0
    )
  ) {
    fail(reason);
  }
}

function validatePrivateDirectory(stat, reason) {
  const uid = BigInt(process.getuid());
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    stat.uid !== uid ||
    (Number(stat.mode) & 0o777) !== 0o700
  ) {
    fail(reason);
  }
}

function validateRootOwnedDirectory(stat, reason) {
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    stat.uid !== 0n ||
    (Number(stat.mode) & 0o022) !== 0
  ) {
    fail(reason);
  }
}

function validatePrivateFile(stat, maxBytes, allowEmpty, reason) {
  const uid = BigInt(process.getuid());
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.uid !== uid ||
    stat.nlink !== 1n ||
    (Number(stat.mode) & 0o777) !== 0o600 ||
    stat.size < BigInt(allowEmpty ? 0 : 1) ||
    stat.size > BigInt(maxBytes)
  ) {
    fail(reason);
  }
}

function validateRootOwnedReadOnlyFile(stat, maxBytes, reason) {
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.uid !== 0n ||
    stat.gid !== 0n ||
    stat.nlink !== 1n ||
    (Number(stat.mode) & 0o777) !== 0o444 ||
    stat.size < 2n ||
    stat.size > BigInt(maxBytes)
  ) {
    fail(reason);
  }
}

function openPinnedPrivateDirectory(rawPath, reason) {
  const resolved = path.resolve(String(rawPath ?? ""));
  if (
    !path.isAbsolute(resolved) ||
    resolved === path.parse(resolved).root ||
    resolved.includes("\0")
  ) {
    fail(reason);
  }
  const visible = fs.lstatSync(resolved, { bigint: true });
  validatePrivateDirectory(visible, reason);

  const parsed = path.parse(resolved);
  const parts = resolved
    .slice(parsed.root.length)
    .split(path.sep)
    .filter(Boolean);
  let fd = fs.openSync(
    parsed.root,
    fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
  );
  try {
    for (const part of parts) {
      validateAncestor(
        fs.fstatSync(fd, { bigint: true }),
        reason + "_ancestor_invalid",
      );
      const next = fs.openSync(
        path.join("/proc/self/fd", String(fd), part),
        fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
      );
      fs.closeSync(fd);
      fd = next;
    }
    const opened = fs.fstatSync(fd, { bigint: true });
    validatePrivateDirectory(opened, reason);
    if (!sameDirectory(visible, opened)) fail(reason + "_changed");
    const result = Object.freeze({
      path: resolved,
      fd,
      stat: opened,
      proc_path: "/proc/self/fd/" + String(fd),
    });
    fd = -1;
    return result;
  } finally {
    if (fd >= 0) fs.closeSync(fd);
  }
}

function assertPrivateDirectoryVisible(directory, reason) {
  const opened = fs.fstatSync(directory.fd, { bigint: true });
  const visible = fs.lstatSync(directory.path, { bigint: true });
  validatePrivateDirectory(opened, reason);
  validatePrivateDirectory(visible, reason);
  if (
    !sameDirectory(directory.stat, opened) ||
    !sameDirectory(opened, visible)
  ) {
    fail(reason + "_changed");
  }
}

function readExactFd(fd, size, maxBytes, allowEmpty, reason) {
  if (
    !Number.isSafeInteger(size) ||
    size < (allowEmpty ? 0 : 1) ||
    size > maxBytes
  ) {
    fail(reason);
  }
  const bytes = Buffer.alloc(size);
  let offset = 0;
  while (offset < size) {
    const count = fs.readSync(fd, bytes, offset, size - offset, offset);
    if (count <= 0) fail(reason + "_short_read");
    offset += count;
  }
  return bytes;
}

function readPinnedPrivateFile(directory, name, maxBytes, allowEmpty, reason) {
  assertPrivateDirectoryVisible(directory, reason + "_directory");
  const visiblePath = path.join(directory.path, name);
  const pinnedPath = path.join(directory.proc_path, name);
  const before = fs.lstatSync(visiblePath, { bigint: true });
  validatePrivateFile(before, maxBytes, allowEmpty, reason);
  const fd = fs.openSync(pinnedPath, fs.constants.O_RDONLY | O_NOFOLLOW);
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    validatePrivateFile(opened, maxBytes, allowEmpty, reason);
    if (!sameFile(before, opened)) fail(reason + "_path_not_bound");
    const bytes = readExactFd(
      fd,
      Number(opened.size),
      maxBytes,
      allowEmpty,
      reason,
    );
    const after = fs.fstatSync(fd, { bigint: true });
    const visibleAfter = fs.lstatSync(visiblePath, { bigint: true });
    validatePrivateFile(after, maxBytes, allowEmpty, reason);
    validatePrivateFile(visibleAfter, maxBytes, allowEmpty, reason);
    if (!sameFile(opened, after) || !sameFile(after, visibleAfter)) {
      fail(reason + "_changed");
    }
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}

function readOptionalPrivateFile(directory, name, maxBytes, reason) {
  assertPrivateDirectoryVisible(directory, reason + "_directory");
  const target = path.join(directory.proc_path, name);
  try {
    fs.lstatSync(target, { bigint: true });
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
  return readPinnedPrivateFile(directory, name, maxBytes, false, reason);
}

function writeAll(fd, bytes, start = null) {
  let offset = 0;
  while (offset < bytes.length) {
    const count = fs.writeSync(
      fd,
      bytes,
      offset,
      bytes.length - offset,
      start === null ? null : start + offset,
    );
    if (count <= 0) fail("witness_replay_external_forced_command_short_write");
    offset += count;
  }
}

function createPrivateFile(directory, name, bytes, maxBytes, reason) {
  if (bytes.length < 1 || bytes.length > maxBytes) fail(reason);
  assertPrivateDirectoryVisible(directory, reason + "_directory");
  const fd = fs.openSync(
    path.join(directory.proc_path, name),
    fs.constants.O_WRONLY |
      fs.constants.O_CREAT |
      fs.constants.O_EXCL |
      O_NOFOLLOW,
    0o600,
  );
  try {
    writeAll(fd, bytes);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.fsyncSync(directory.fd);
  assertPrivateDirectoryVisible(directory, reason + "_directory");
}

function assertExactPrivateFile(
  directory,
  name,
  expected,
  maxBytes,
  reason,
) {
  const current = readPinnedPrivateFile(
    directory,
    name,
    maxBytes,
    false,
    reason,
  );
  if (!current.equals(expected)) {
    fail(reason + "_content_mismatch");
  }
  assertPrivateDirectoryVisible(directory, reason + "_directory");
}

function unlinkPrivateFile(directory, name, maxBytes, reason) {
  assertPrivateDirectoryVisible(directory, reason + "_directory");
  const visible = path.join(directory.path, name);
  const pinned = path.join(directory.proc_path, name);
  const before = fs.lstatSync(visible, { bigint: true });
  const pinnedStat = fs.lstatSync(pinned, { bigint: true });
  validatePrivateFile(before, maxBytes, false, reason);
  validatePrivateFile(pinnedStat, maxBytes, false, reason);
  if (!sameFile(before, pinnedStat)) fail(reason + "_path_not_bound");
  fs.unlinkSync(pinned);
  fs.fsyncSync(directory.fd);
  assertPrivateDirectoryVisible(directory, reason + "_directory");
}

function openWitnessForUpdate(directory) {
  assertPrivateDirectoryVisible(
    directory,
    "witness_replay_external_forced_command_authority_root",
  );
  const visiblePath = path.join(directory.path, WITNESS_NAME);
  const pinnedPath = path.join(directory.proc_path, WITNESS_NAME);
  const before = fs.lstatSync(visiblePath, { bigint: true });
  validatePrivateFile(
    before,
    MAX_WITNESS_BYTES,
    true,
    "witness_replay_external_forced_command_witness_invalid",
  );
  const fd = fs.openSync(
    pinnedPath,
    fs.constants.O_RDWR | O_NOFOLLOW,
  );
  const opened = fs.fstatSync(fd, { bigint: true });
  validatePrivateFile(
    opened,
    MAX_WITNESS_BYTES,
    true,
    "witness_replay_external_forced_command_witness_invalid",
  );
  if (!sameFile(before, opened)) {
    fs.closeSync(fd);
    fail("witness_replay_external_forced_command_witness_path_not_bound");
  }
  return Object.freeze({ fd, visible_path: visiblePath, opened });
}

function assertWitnessStillBound(directory, witness) {
  const opened = fs.fstatSync(witness.fd, { bigint: true });
  const visible = fs.lstatSync(witness.visible_path, { bigint: true });
  validatePrivateFile(
    opened,
    MAX_WITNESS_BYTES,
    true,
    "witness_replay_external_forced_command_witness_invalid",
  );
  validatePrivateFile(
    visible,
    MAX_WITNESS_BYTES,
    true,
    "witness_replay_external_forced_command_witness_invalid",
  );
  if (
    !sameFileIdentity(witness.opened, opened) ||
    !sameFile(opened, visible)
  ) {
    fail("witness_replay_external_forced_command_witness_changed");
  }
  assertPrivateDirectoryVisible(
    directory,
    "witness_replay_external_forced_command_authority_root",
  );
}

function parseConfig(value) {
  const raw = exactObject(
    value,
    [
      "schema",
      "marker",
      "version",
      "authority_root",
      "witness_filename",
      "source_identity",
      "expected_witness_identity",
    ],
    "witness_replay_external_forced_command_config_invalid",
  );
  if (
    raw.schema !== CONFIG_SCHEMA ||
    raw.marker !== CONFIG_MARKER ||
    raw.version !== 1 ||
    raw.witness_filename !== WITNESS_NAME
  ) {
    fail("witness_replay_external_forced_command_config_invalid");
  }
  const authorityRoot = String(raw.authority_root ?? "").trim();
  if (
    !authorityRoot ||
    !path.isAbsolute(authorityRoot) ||
    authorityRoot.includes("\0")
  ) {
    fail("witness_replay_external_forced_command_config_invalid");
  }
  const source = exactObject(
    raw.source_identity,
    [
      "source_hostname",
      "source_journal_root",
      "source_high_water_root",
      "source_journal_disk_wwn",
      "source_high_water_disk_wwn",
    ],
    "witness_replay_external_forced_command_source_identity_invalid",
  );
  const expected = exactObject(
    raw.expected_witness_identity,
    [
      "witness_hostname",
      "witness_machine_id_sha256",
      "witness_root_disk_serial",
      "witness_root_disk_wwn",
    ],
    "witness_replay_external_forced_command_witness_identity_invalid",
  );
  const normalizedSource = Object.freeze({
    source_hostname: safeText(
      source.source_hostname,
      "witness_replay_external_forced_command_source_identity_invalid",
    ),
    source_journal_root: safeText(
      source.source_journal_root,
      "witness_replay_external_forced_command_source_identity_invalid",
    ),
    source_high_water_root: safeText(
      source.source_high_water_root,
      "witness_replay_external_forced_command_source_identity_invalid",
    ),
    source_journal_disk_wwn: safeText(
      source.source_journal_disk_wwn,
      "witness_replay_external_forced_command_source_identity_invalid",
    ),
    source_high_water_disk_wwn: safeText(
      source.source_high_water_disk_wwn,
      "witness_replay_external_forced_command_source_identity_invalid",
    ),
  });
  if (
    normalizedSource.source_journal_root ===
      normalizedSource.source_high_water_root ||
    normalizedSource.source_journal_disk_wwn ===
      normalizedSource.source_high_water_disk_wwn
  ) {
    fail("witness_replay_external_forced_command_source_separation_invalid");
  }
  const normalizedExpected = Object.freeze({
    witness_hostname: safeText(
      expected.witness_hostname,
      "witness_replay_external_forced_command_witness_identity_invalid",
    ),
    witness_machine_id_sha256: safeSha(
      expected.witness_machine_id_sha256,
      "witness_replay_external_forced_command_witness_identity_invalid",
    ),
    witness_root_disk_serial: safeText(
      expected.witness_root_disk_serial,
      "witness_replay_external_forced_command_witness_identity_invalid",
    ),
    witness_root_disk_wwn: safeText(
      expected.witness_root_disk_wwn,
      "witness_replay_external_forced_command_witness_identity_invalid",
    ),
  });
  return Object.freeze({
    schema: CONFIG_SCHEMA,
    marker: CONFIG_MARKER,
    version: 1,
    authority_root: path.resolve(authorityRoot),
    witness_filename: WITNESS_NAME,
    source_identity: normalizedSource,
    expected_witness_identity: normalizedExpected,
  });
}

function parseRequest(input) {
  const bytes = Buffer.isBuffer(input)
    ? Buffer.from(input)
    : Buffer.from(String(input ?? ""), "utf8");
  if (
    bytes.length < 3 ||
    bytes.length > MAX_REQUEST_BYTES ||
    bytes.at(-1) !== 0x0a ||
    bytes.subarray(0, -1).includes(0x0a)
  ) {
    fail("witness_replay_external_forced_command_request_invalid");
  }
  let parsed;
  try {
    parsed = JSON.parse(bytes.toString("utf8").slice(0, -1));
  } catch {
    fail("witness_replay_external_forced_command_request_invalid");
  }
  const raw = exactObject(
    parsed,
    [
      "schema",
      "marker",
      "version",
      "operation",
      "request_id",
      "source_journal_json_base64",
      "source_high_water_json_base64",
    ],
    "witness_replay_external_forced_command_request_invalid",
  );
  if (
    raw.schema !== REQUEST_SCHEMA ||
    raw.marker !== REQUEST_MARKER ||
    raw.version !== 1 ||
    (raw.operation !== "read" && raw.operation !== "append") ||
    typeof raw.request_id !== "string" ||
    !REQUEST_ID.test(raw.request_id)
  ) {
    fail("witness_replay_external_forced_command_request_invalid");
  }
  let journal = null;
  let highWater = null;
  if (raw.operation === "read") {
    if (
      raw.source_journal_json_base64 !== null ||
      raw.source_high_water_json_base64 !== null
    ) {
      fail("witness_replay_external_forced_command_read_payload_forbidden");
    }
  } else {
    if (
      typeof raw.source_journal_json_base64 !== "string" ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(
        raw.source_journal_json_base64,
      ) ||
      typeof raw.source_high_water_json_base64 !== "string" ||
      raw.source_high_water_json_base64.length < 4 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(
        raw.source_high_water_json_base64,
      )
    ) {
      fail("witness_replay_external_forced_command_append_payload_invalid");
    }
    journal = Buffer.from(raw.source_journal_json_base64, "base64");
    highWater = Buffer.from(raw.source_high_water_json_base64, "base64");
    if (
      journal.toString("base64") !== raw.source_journal_json_base64 ||
      highWater.toString("base64") !== raw.source_high_water_json_base64 ||
      journal.length > MAX_REPLAY_JOURNAL_BYTES ||
      highWater.length < 2 ||
      highWater.length > MAX_HIGH_WATER_BYTES
    ) {
      fail("witness_replay_external_forced_command_append_payload_invalid");
    }
  }
  const normalized = Object.freeze({
    schema: REQUEST_SCHEMA,
    marker: REQUEST_MARKER,
    version: 1,
    operation: raw.operation,
    request_id: raw.request_id,
    source_journal_json_base64:
      journal === null ? null : journal.toString("base64"),
    source_high_water_json_base64:
      highWater === null ? null : highWater.toString("base64"),
  });
  if (canonicalLine(normalized) !== bytes.toString("utf8")) {
    fail("witness_replay_external_forced_command_request_noncanonical");
  }
  return Object.freeze({
    value: normalized,
    bytes,
    journal,
    high_water: highWater,
  });
}

function witnessState(bytes) {
  if (bytes.length === 0) {
    return Object.freeze({
      initialized: false,
      witness_sha256: sha256Id(bytes),
      witness_bytes: 0,
      event_count: 0,
      tip_event_sha256: null,
      witnessed_replay_sequence: null,
    });
  }
  const parsed =
    parseBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessJournalV1(
      bytes,
    );
  return Object.freeze({
    initialized: true,
    witness_sha256: parsed.witness_sha256,
    witness_bytes: bytes.length,
    event_count: parsed.event_count,
    tip_event_sha256: parsed.tip.event_sha256,
    witnessed_replay_sequence: parsed.tip.replay_sequence,
  });
}

function observeHostFacts() {
  const machineId = fs.readFileSync("/etc/machine-id", "utf8").trim();
  if (!/^[0-9a-f]{32}$/u.test(machineId)) {
    fail("witness_replay_external_forced_command_machine_id_invalid");
  }
  const run = (command, args) => {
    const result = spawnSync(command, args, {
      encoding: "utf8",
      timeout: 5_000,
      maxBuffer: 64 * 1024,
      shell: false,
      env: {
        PATH: "/usr/bin:/bin",
        LANG: "C",
        LC_ALL: "C",
      },
    });
    if (
      result.error ||
      result.signal ||
      result.status !== 0 ||
      typeof result.stdout !== "string"
    ) {
      fail("witness_replay_external_forced_command_host_probe_failed");
    }
    return result.stdout.trim();
  };
  const source = run("/usr/bin/findmnt", ["-n", "-o", "SOURCE", "/"]);
  if (!source.startsWith("/dev/")) {
    fail("witness_replay_external_forced_command_root_source_invalid");
  }
  const parentName = run("/usr/bin/lsblk", ["-ndo", "PKNAME", source]);
  const parent =
    parentName && /^[A-Za-z0-9._-]+$/u.test(parentName)
      ? "/dev/" + parentName
      : source;
  const identity = run(
    "/usr/bin/lsblk",
    ["-ndo", "SERIAL,WWN", parent],
  )
    .split(/\s+/u)
    .filter(Boolean);
  if (identity.length !== 2) {
    fail("witness_replay_external_forced_command_root_identity_invalid");
  }
  return Object.freeze({
    witness_hostname: os.hostname(),
    witness_machine_id_sha256:
      sha256Id(Buffer.from(machineId, "utf8")),
    witness_root_disk_serial: identity[0],
    witness_root_disk_wwn: identity[1],
  });
}

function requireHostIdentity(config, observed) {
  const expected = config.expected_witness_identity;
  if (
    observed.witness_hostname !== expected.witness_hostname ||
    observed.witness_machine_id_sha256 !== expected.witness_machine_id_sha256 ||
    observed.witness_root_disk_serial !== expected.witness_root_disk_serial ||
    observed.witness_root_disk_wwn !== expected.witness_root_disk_wwn
  ) {
    fail("witness_replay_external_forced_command_host_identity_mismatch");
  }
}

function identityForPlanner(config, observed) {
  requireHostIdentity(config, observed);
  return Object.freeze({
    ...config.source_identity,
    witness_hostname: observed.witness_hostname,
    witness_machine_id_sha256: observed.witness_machine_id_sha256,
    witness_root_disk_serial: observed.witness_root_disk_serial,
    witness_root_disk_wwn: observed.witness_root_disk_wwn,
  });
}

function requireWitnessIdentity(bytes, identity) {
  if (bytes.length === 0) return;
  const parsed =
    parseBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessJournalV1(
      bytes,
    );
  const tip = parsed.tip;
  for (const key of [
    "source_hostname",
    "source_journal_root",
    "source_high_water_root",
    "source_journal_disk_wwn",
    "source_high_water_disk_wwn",
    "witness_hostname",
    "witness_machine_id_sha256",
    "witness_root_disk_serial",
    "witness_root_disk_wwn",
  ]) {
    if (tip[key] !== identity[key]) {
      fail("witness_replay_external_forced_command_witness_identity_mismatch");
    }
  }
}

function response(requestId, state, operationPerformed, recoveredIntent) {
  return canonicalLine(
    Object.freeze({
      schema: RESPONSE_SCHEMA,
      marker: RESPONSE_MARKER,
      version: 1,
      request_id: requestId,
      initialized: state.initialized,
      witness_sha256: state.witness_sha256,
      witness_bytes: state.witness_bytes,
      event_count: state.event_count,
      tip_event_sha256: state.tip_event_sha256,
      witnessed_replay_sequence: state.witnessed_replay_sequence,
      operation_performed: operationPerformed === true,
      recovered_intent: recoveredIntent === true,
      external_transport_authenticated: false,
      external_witness_storage_proven: false,
      production_gate_ready: false,
      funds_movement: false,
    }),
  );
}

function intentFromPlan(request, current, nextBytes, eventLine) {
  const prior = witnessState(current);
  const next = witnessState(nextBytes);
  const line = Buffer.from(eventLine, "utf8");
  if (line.length > MAX_WITNESS_EVENT_BYTES) {
    fail("witness_replay_external_forced_command_plan_event_too_large");
  }
  if (
    nextBytes.length <= current.length ||
    !nextBytes.subarray(0, current.length).equals(current) ||
    !nextBytes.subarray(current.length).equals(line)
  ) {
    fail("witness_replay_external_forced_command_plan_not_exact_append");
  }
  const value = Object.freeze({
    schema: INTENT_SCHEMA,
    marker: INTENT_MARKER,
    version: 1,
    request_id: request.value.request_id,
    request_sha256: sha256Id(request.bytes),
    request_json_base64: request.bytes.toString("base64"),
    prior_witness_sha256: prior.witness_sha256,
    prior_witness_bytes: prior.witness_bytes,
    prior_event_count: prior.event_count,
    prior_tip_event_sha256: prior.tip_event_sha256,
    next_line_base64: line.toString("base64"),
    expected_next_witness_sha256: next.witness_sha256,
    expected_next_witness_bytes: next.witness_bytes,
    next_event_count: next.event_count,
    next_tip_event_sha256: next.tip_event_sha256,
    next_witnessed_replay_sequence: next.witnessed_replay_sequence,
  });
  return Object.freeze({
    value,
    bytes: Buffer.from(canonicalLine(value), "utf8"),
    next_bytes: nextBytes,
    next_line: line,
  });
}

function parseIntent(bytes) {
  if (
    !Buffer.isBuffer(bytes) ||
    bytes.length < 3 ||
    bytes.length > MAX_INTENT_BYTES ||
    bytes.at(-1) !== 0x0a
  ) {
    fail("witness_replay_external_forced_command_intent_invalid");
  }
  let parsed;
  try {
    parsed = JSON.parse(bytes.toString("utf8").slice(0, -1));
  } catch {
    fail("witness_replay_external_forced_command_intent_invalid");
  }
  const raw = exactObject(
    parsed,
    [
      "schema",
      "marker",
      "version",
      "request_id",
      "request_sha256",
      "request_json_base64",
      "prior_witness_sha256",
      "prior_witness_bytes",
      "prior_event_count",
      "prior_tip_event_sha256",
      "next_line_base64",
      "expected_next_witness_sha256",
      "expected_next_witness_bytes",
      "next_event_count",
      "next_tip_event_sha256",
      "next_witnessed_replay_sequence",
    ],
    "witness_replay_external_forced_command_intent_invalid",
  );
  if (
    raw.schema !== INTENT_SCHEMA ||
    raw.marker !== INTENT_MARKER ||
    raw.version !== 1 ||
    typeof raw.request_id !== "string" ||
    !REQUEST_ID.test(raw.request_id) ||
    typeof raw.request_json_base64 !== "string" ||
    typeof raw.next_line_base64 !== "string" ||
    !SHA256_ID.test(String(raw.request_sha256 || "")) ||
    !SHA256_ID.test(String(raw.prior_witness_sha256 || "")) ||
    !SHA256_ID.test(String(raw.expected_next_witness_sha256 || "")) ||
    !Number.isSafeInteger(raw.prior_witness_bytes) ||
    raw.prior_witness_bytes < 0 ||
    !Number.isSafeInteger(raw.expected_next_witness_bytes) ||
    raw.expected_next_witness_bytes <= raw.prior_witness_bytes ||
    !Number.isSafeInteger(raw.prior_event_count) ||
    raw.prior_event_count < 0 ||
    !Number.isSafeInteger(raw.next_event_count) ||
    raw.next_event_count !== raw.prior_event_count + 1 ||
    (
      raw.prior_tip_event_sha256 !== null &&
      !SHA256_ID.test(String(raw.prior_tip_event_sha256))
    ) ||
    typeof raw.next_tip_event_sha256 !== "string" ||
    !SHA256_ID.test(raw.next_tip_event_sha256) ||
    !Number.isSafeInteger(raw.next_witnessed_replay_sequence) ||
    raw.next_witnessed_replay_sequence < 0
  ) {
    fail("witness_replay_external_forced_command_intent_invalid");
  }
  const requestBytes = Buffer.from(raw.request_json_base64, "base64");
  const line = Buffer.from(raw.next_line_base64, "base64");
  if (
    requestBytes.toString("base64") !== raw.request_json_base64 ||
    line.toString("base64") !== raw.next_line_base64 ||
    requestBytes.length > MAX_REQUEST_BYTES ||
    sha256Id(requestBytes) !== raw.request_sha256 ||
    line.length < 2 ||
    line.length > MAX_WITNESS_EVENT_BYTES ||
    line.at(-1) !== 0x0a ||
    line.subarray(0, -1).includes(0x0a) ||
    raw.expected_next_witness_bytes !== raw.prior_witness_bytes + line.length ||
    canonicalLine(raw) !== bytes.toString("utf8")
  ) {
    fail("witness_replay_external_forced_command_intent_invalid");
  }
  return Object.freeze({
    ...raw,
    request_bytes: requestBytes,
    next_line: line,
  });
}

function appendWithHooks(
  directory,
  prior,
  nextBytes,
  hooks,
  intentBytes = null,
) {
  if (intentBytes !== null) {
    assertExactPrivateFile(
      directory,
      INTENT_NAME,
      intentBytes,
      MAX_INTENT_BYTES,
      "witness_replay_external_forced_command_intent_invalid",
    );
  }
  const witness = openWitnessForUpdate(directory);
  try {
    const opened = readExactFd(
      witness.fd,
      Number(witness.opened.size),
      MAX_WITNESS_BYTES,
      true,
      "witness_replay_external_forced_command_witness_invalid",
    );
    if (!opened.equals(prior)) {
      fail("witness_replay_external_forced_command_witness_changed_before_append");
    }
    if (intentBytes !== null) {
      assertExactPrivateFile(
        directory,
        INTENT_NAME,
        intentBytes,
        MAX_INTENT_BYTES,
        "witness_replay_external_forced_command_intent_invalid",
      );
    }
    const delta = nextBytes.subarray(prior.length);
    if (delta.length < 2) {
      fail("witness_replay_external_forced_command_append_delta_invalid");
    }
    if (hooks?.interrupt_after_partial_append === true) {
      const partial = Math.max(1, Math.floor(delta.length / 2));
      writeAll(witness.fd, delta.subarray(0, partial), prior.length);
      fs.fsyncSync(witness.fd);
      assertWitnessStillBound(directory, witness);
      if (intentBytes !== null) {
        assertExactPrivateFile(
          directory,
          INTENT_NAME,
          intentBytes,
          MAX_INTENT_BYTES,
          "witness_replay_external_forced_command_intent_invalid",
        );
      }
      throw new Error(
        "witness_replay_external_forced_command_test_interrupt_after_partial_append",
      );
    }
    writeAll(witness.fd, delta, prior.length);
    fs.fsyncSync(witness.fd);
    assertWitnessStillBound(directory, witness);
    if (intentBytes !== null) {
      assertExactPrivateFile(
        directory,
        INTENT_NAME,
        intentBytes,
        MAX_INTENT_BYTES,
        "witness_replay_external_forced_command_intent_invalid",
      );
    }
    if (hooks?.interrupt_after_full_append === true) {
      throw new Error(
        "witness_replay_external_forced_command_test_interrupt_after_full_append",
      );
    }
  } finally {
    fs.closeSync(witness.fd);
  }
}

function validateIntentAgainstPlanner(
  intent,
  request,
  identity,
  prior,
) {
  const priorState = witnessState(prior);
  if (
    priorState.witness_sha256 !== intent.prior_witness_sha256 ||
    priorState.witness_bytes !== intent.prior_witness_bytes ||
    priorState.event_count !== intent.prior_event_count ||
    priorState.tip_event_sha256 !== intent.prior_tip_event_sha256
  ) {
    fail("witness_replay_external_forced_command_intent_prior_mismatch");
  }

  const planned =
    planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessAdvanceV1({
      witness_jsonl: prior,
      current_journal_jsonl: request.journal,
      current_high_water_json: request.high_water,
      identity,
    });
  if (
    planned.ok !== true ||
    (planned.status !== "planned" &&
      planned.status !== "planned_genesis") ||
    typeof planned.event_jsonl_line !== "string" ||
    typeof planned.next_witness_jsonl !== "string"
  ) {
    fail("witness_replay_external_forced_command_intent_plan_mismatch");
  }

  const line = Buffer.from(planned.event_jsonl_line, "utf8");
  const next = Buffer.from(planned.next_witness_jsonl, "utf8");
  const nextState = witnessState(next);
  if (
    !line.equals(intent.next_line) ||
    !next.subarray(0, prior.length).equals(prior) ||
    !next.subarray(prior.length).equals(line) ||
    next.length !== intent.expected_next_witness_bytes ||
    sha256Id(next) !== intent.expected_next_witness_sha256 ||
    nextState.event_count !== intent.next_event_count ||
    nextState.tip_event_sha256 !== intent.next_tip_event_sha256 ||
    nextState.witnessed_replay_sequence !==
      intent.next_witnessed_replay_sequence
  ) {
    fail("witness_replay_external_forced_command_intent_plan_mismatch");
  }
  return next;
}

function recoverOrphanTornAppend(
  directory,
  request,
  identity,
) {
  if (request.value.operation !== "append") return null;

  const current = readPinnedPrivateFile(
    directory,
    WITNESS_NAME,
    MAX_WITNESS_BYTES,
    true,
    "witness_replay_external_forced_command_witness_invalid",
  );

  let currentIsCanonical = false;
  try {
    witnessState(current);
    currentIsCanonical = true;
  } catch {
    currentIsCanonical = false;
  }
  if (currentIsCanonical) {
    requireWitnessIdentity(current, identity);
    return null;
  }

  const lastNewline = current.lastIndexOf(0x0a);
  const priorBytes = lastNewline < 0 ? 0 : lastNewline + 1;
  if (priorBytes >= current.length) {
    fail("witness_replay_external_forced_command_orphan_torn_conflict");
  }
  const prior = current.subarray(0, priorBytes);
  const tail = current.subarray(priorBytes);
  requireWitnessIdentity(prior, identity);

  const planned =
    planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessAdvanceV1({
      witness_jsonl: prior,
      current_journal_jsonl: request.journal,
      current_high_water_json: request.high_water,
      identity,
    });
  if (
    planned.ok !== true ||
    (planned.status !== "planned" &&
      planned.status !== "planned_genesis") ||
    typeof planned.event_jsonl_line !== "string" ||
    typeof planned.next_witness_jsonl !== "string"
  ) {
    fail("witness_replay_external_forced_command_orphan_torn_plan_mismatch");
  }

  const line = Buffer.from(planned.event_jsonl_line, "utf8");
  const nextBytes = Buffer.from(planned.next_witness_jsonl, "utf8");
  if (
    tail.length < 1 ||
    tail.length >= line.length ||
    !line.subarray(0, tail.length).equals(tail) ||
    !nextBytes.subarray(0, prior.length).equals(prior) ||
    !nextBytes.subarray(prior.length).equals(line)
  ) {
    fail("witness_replay_external_forced_command_orphan_torn_conflict");
  }

  const intent = intentFromPlan(
    request,
    prior,
    nextBytes,
    planned.event_jsonl_line,
  );
  createPrivateFile(
    directory,
    INTENT_NAME,
    intent.bytes,
    MAX_INTENT_BYTES,
    "witness_replay_external_forced_command_intent_invalid",
  );
  assertExactPrivateFile(
    directory,
    INTENT_NAME,
    intent.bytes,
    MAX_INTENT_BYTES,
    "witness_replay_external_forced_command_intent_invalid",
  );

  const witness = openWitnessForUpdate(directory);
  try {
    const opened = readExactFd(
      witness.fd,
      Number(witness.opened.size),
      MAX_WITNESS_BYTES,
      true,
      "witness_replay_external_forced_command_witness_invalid",
    );
    if (!opened.equals(current)) {
      fail("witness_replay_external_forced_command_orphan_torn_changed");
    }
    fs.ftruncateSync(witness.fd, prior.length);
    fs.fsyncSync(witness.fd);
    assertWitnessStillBound(directory, witness);
  } finally {
    fs.closeSync(witness.fd);
  }

  appendWithHooks(
    directory,
    prior,
    nextBytes,
    null,
    intent.bytes,
  );
  const finalBytes = readPinnedPrivateFile(
    directory,
    WITNESS_NAME,
    MAX_WITNESS_BYTES,
    true,
    "witness_replay_external_forced_command_witness_invalid",
  );
  requireWitnessIdentity(finalBytes, identity);
  const finalState = witnessState(finalBytes);
  if (
    !finalBytes.equals(nextBytes) ||
    finalState.witness_sha256 !== intent.value.expected_next_witness_sha256 ||
    finalState.event_count !== intent.value.next_event_count ||
    finalState.tip_event_sha256 !== intent.value.next_tip_event_sha256 ||
    finalState.witnessed_replay_sequence !==
      intent.value.next_witnessed_replay_sequence
  ) {
    fail("witness_replay_external_forced_command_orphan_torn_postcheck_failed");
  }
  unlinkPrivateFile(
    directory,
    INTENT_NAME,
    MAX_INTENT_BYTES,
    "witness_replay_external_forced_command_intent_invalid",
  );
  return Object.freeze({
    recovered: true,
    operation_performed: true,
  });
}

function recoverIntent(directory, config, request, identity) {
  const bytes = readOptionalPrivateFile(
    directory,
    INTENT_NAME,
    MAX_INTENT_BYTES,
    "witness_replay_external_forced_command_intent_invalid",
  );
  if (bytes === null) {
    const orphanRecovery =
      recoverOrphanTornAppend(directory, request, identity);
    if (orphanRecovery !== null) return orphanRecovery;
    return Object.freeze({
      recovered: false,
      operation_performed: false,
    });
  }
  if (request.value.operation !== "append") {
    fail("witness_replay_external_forced_command_nonappend_blocked_by_intent");
  }
  const intent = parseIntent(bytes);
  if (!intent.request_bytes.equals(request.bytes)) {
    fail("witness_replay_external_forced_command_pending_intent_request_mismatch");
  }

  let current = readPinnedPrivateFile(
    directory,
    WITNESS_NAME,
    MAX_WITNESS_BYTES,
    true,
    "witness_replay_external_forced_command_witness_invalid",
  );

  let prior;
  let phase;
  const currentState = (() => {
    try {
      requireWitnessIdentity(current, identity);
      return witnessState(current);
    } catch {
      return null;
    }
  })();

  if (
    currentState &&
    currentState.witness_sha256 === intent.expected_next_witness_sha256 &&
    currentState.witness_bytes === intent.expected_next_witness_bytes &&
    currentState.event_count === intent.next_event_count &&
    currentState.tip_event_sha256 === intent.next_tip_event_sha256
  ) {
    if (
      intent.prior_witness_bytes < 0 ||
      intent.prior_witness_bytes >= current.length
    ) {
      fail("witness_replay_external_forced_command_intent_recovery_conflict");
    }
    prior = current.subarray(0, intent.prior_witness_bytes);
    requireWitnessIdentity(prior, identity);
    phase = "complete";
  } else if (
    currentState &&
    currentState.witness_sha256 === intent.prior_witness_sha256 &&
    currentState.witness_bytes === intent.prior_witness_bytes &&
    currentState.event_count === intent.prior_event_count &&
    currentState.tip_event_sha256 === intent.prior_tip_event_sha256
  ) {
    prior = current;
    phase = "prior";
  } else {
    if (
      current.length <= intent.prior_witness_bytes ||
      current.length >= intent.expected_next_witness_bytes
    ) {
      fail("witness_replay_external_forced_command_intent_recovery_conflict");
    }
    prior = current.subarray(0, intent.prior_witness_bytes);
    requireWitnessIdentity(prior, identity);
    const tail = current.subarray(intent.prior_witness_bytes);
    if (
      tail.length < 1 ||
      tail.length >= intent.next_line.length ||
      !intent.next_line.subarray(0, tail.length).equals(tail)
    ) {
      fail("witness_replay_external_forced_command_intent_recovery_conflict");
    }
    phase = "partial";
  }

  const nextBytes = validateIntentAgainstPlanner(
    intent,
    request,
    identity,
    prior,
  );

  if (phase === "complete") {
    if (!current.equals(nextBytes)) {
      fail("witness_replay_external_forced_command_intent_next_mismatch");
    }
    unlinkPrivateFile(
      directory,
      INTENT_NAME,
      MAX_INTENT_BYTES,
      "witness_replay_external_forced_command_intent_invalid",
    );
    return Object.freeze({
      recovered: true,
      operation_performed: false,
    });
  }

  if (phase === "partial") {
    const witness = openWitnessForUpdate(directory);
    try {
      fs.ftruncateSync(witness.fd, intent.prior_witness_bytes);
      fs.fsyncSync(witness.fd);
      assertWitnessStillBound(directory, witness);
    } finally {
      fs.closeSync(witness.fd);
    }
  }

  appendWithHooks(
    directory,
    prior,
    nextBytes,
    null,
    bytes,
  );
  current = readPinnedPrivateFile(
    directory,
    WITNESS_NAME,
    MAX_WITNESS_BYTES,
    true,
    "witness_replay_external_forced_command_witness_invalid",
  );
  requireWitnessIdentity(current, identity);
  const finalState = witnessState(current);
  if (
    !current.equals(nextBytes) ||
    finalState.witness_sha256 !== intent.expected_next_witness_sha256 ||
    finalState.event_count !== intent.next_event_count ||
    finalState.tip_event_sha256 !== intent.next_tip_event_sha256 ||
    finalState.witnessed_replay_sequence !==
      intent.next_witnessed_replay_sequence
  ) {
    fail("witness_replay_external_forced_command_intent_postcheck_failed");
  }
  unlinkPrivateFile(
    directory,
    INTENT_NAME,
    MAX_INTENT_BYTES,
    "witness_replay_external_forced_command_intent_invalid",
  );
  return Object.freeze({
    recovered: true,
    operation_performed: true,
  });
}

function handleUnderLock(directory, config, request, dependencies) {
  const readHostFacts =
    dependencies?.read_host_facts_impl || observeHostFacts;
  if (typeof readHostFacts !== "function") {
    fail("witness_replay_external_forced_command_host_probe_invalid");
  }
  const hostFacts = readHostFacts();
  const identity = identityForPlanner(config, hostFacts);
  const recovered = recoverIntent(directory, config, request, identity);

  let current = readPinnedPrivateFile(
    directory,
    WITNESS_NAME,
    MAX_WITNESS_BYTES,
    true,
    "witness_replay_external_forced_command_witness_invalid",
  );
  requireWitnessIdentity(current, identity);

  if (request.value.operation === "read") {
    const state = witnessState(current);
    return Object.freeze({
      response_json: response(
        request.value.request_id,
        state,
        recovered.operation_performed,
        recovered.recovered,
      ),
      operation_performed: recovered.operation_performed,
      recovered_intent: recovered.recovered,
    });
  }

  const planned =
    planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessAdvanceV1({
      witness_jsonl: current,
      current_journal_jsonl: request.journal,
      current_high_water_json: request.high_water,
      identity,
    });
  if (planned.ok !== true) {
    fail(
      "witness_replay_external_forced_command_plan_" +
        String(planned.reason || "held"),
    );
  }
  if (planned.status === "idempotent") {
    const state = witnessState(current);
    return Object.freeze({
      response_json: response(
        request.value.request_id,
        state,
        recovered.operation_performed,
        recovered.recovered,
      ),
      operation_performed: recovered.operation_performed,
      recovered_intent: recovered.recovered,
    });
  }
  if (
    (planned.status !== "planned" &&
      planned.status !== "planned_genesis") ||
    typeof planned.event_jsonl_line !== "string"
  ) {
    fail("witness_replay_external_forced_command_plan_state_invalid");
  }

  const nextBytes = Buffer.from(planned.next_witness_jsonl, "utf8");
  const intent = intentFromPlan(
    request,
    current,
    nextBytes,
    planned.event_jsonl_line,
  );
  createPrivateFile(
    directory,
    INTENT_NAME,
    intent.bytes,
    MAX_INTENT_BYTES,
    "witness_replay_external_forced_command_intent_invalid",
  );
  if (dependencies?.hooks?.unlink_intent_after_create === true) {
    fs.unlinkSync(path.join(directory.proc_path, INTENT_NAME));
    fs.fsyncSync(directory.fd);
  }
  assertExactPrivateFile(
    directory,
    INTENT_NAME,
    intent.bytes,
    MAX_INTENT_BYTES,
    "witness_replay_external_forced_command_intent_invalid",
  );
  if (dependencies?.hooks?.interrupt_after_intent === true) {
    throw new Error(
      "witness_replay_external_forced_command_test_interrupt_after_intent",
    );
  }
  appendWithHooks(
    directory,
    current,
    nextBytes,
    dependencies?.hooks,
    intent.bytes,
  );
  current = readPinnedPrivateFile(
    directory,
    WITNESS_NAME,
    MAX_WITNESS_BYTES,
    true,
    "witness_replay_external_forced_command_witness_invalid",
  );
  requireWitnessIdentity(current, identity);
  const state = witnessState(current);
  if (
    state.witness_sha256 !== intent.value.expected_next_witness_sha256 ||
    state.event_count !== intent.value.next_event_count ||
    state.tip_event_sha256 !== intent.value.next_tip_event_sha256
  ) {
    fail("witness_replay_external_forced_command_append_postcheck_failed");
  }
  unlinkPrivateFile(
    directory,
    INTENT_NAME,
    MAX_INTENT_BYTES,
    "witness_replay_external_forced_command_intent_invalid",
  );
  return Object.freeze({
    response_json: response(
      request.value.request_id,
      state,
      true,
      false,
    ),
    operation_performed: true,
    recovered_intent: false,
  });
}

export function handleVoidBuyAllocationCustodyWitnessLiveReadReplayExternalForcedCommandRequestV1(
  rawConfig,
  requestInput,
  dependencies = {},
) {
  const config = parseConfig(rawConfig);
  const request = parseRequest(requestInput);
  const directory = openPinnedPrivateDirectory(
    config.authority_root,
    "witness_replay_external_forced_command_authority_root_invalid",
  );
  try {
    return withBuyVoidFilesystemBakeryLockV1(
      path.join(directory.proc_path, LOCK_NAME),
      () =>
        handleUnderLock(
          directory,
          config,
          request,
          dependencies,
        ),
    );
  } finally {
    fs.closeSync(directory.fd);
  }
}

function openPinnedRootOwnedDirectory(rawPath, reason) {
  const raw = String(rawPath ?? "").trim();
  if (
    !raw ||
    !path.isAbsolute(raw) ||
    raw.includes("\0")
  ) {
    fail(reason);
  }
  const resolved = path.resolve(raw);
  if (resolved === path.parse(resolved).root) {
    fail(reason);
  }

  const visible = fs.lstatSync(resolved, { bigint: true });
  validateRootOwnedDirectory(visible, reason);

  const parsed = path.parse(resolved);
  const parts = resolved
    .slice(parsed.root.length)
    .split(path.sep)
    .filter(Boolean);

  let fd = fs.openSync(
    parsed.root,
    fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
  );
  let current = parsed.root;
  try {
    for (const part of parts) {
      const openedCurrent = fs.fstatSync(fd, { bigint: true });
      const visibleCurrent = fs.lstatSync(current, { bigint: true });
      validateRootOwnedDirectory(
        openedCurrent,
        reason + "_ancestor_invalid",
      );
      validateRootOwnedDirectory(
        visibleCurrent,
        reason + "_ancestor_invalid",
      );
      if (!sameDirectory(openedCurrent, visibleCurrent)) {
        fail(reason + "_ancestor_changed");
      }
      if (!part || part === "." || part === "..") {
        fail(reason + "_ancestor_component_invalid");
      }

      const next = fs.openSync(
        path.join("/proc/self/fd", String(fd), part),
        fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
      );
      fs.closeSync(fd);
      fd = next;
      current = path.join(current, part);
    }

    const opened = fs.fstatSync(fd, { bigint: true });
    const visibleFinal = fs.lstatSync(resolved, { bigint: true });
    validateRootOwnedDirectory(opened, reason);
    validateRootOwnedDirectory(visibleFinal, reason);
    if (
      !sameDirectory(visible, opened) ||
      !sameDirectory(opened, visibleFinal)
    ) {
      fail(reason + "_changed");
    }

    const result = Object.freeze({
      path: resolved,
      fd,
      stat: opened,
      proc_path: "/proc/self/fd/" + String(fd),
    });
    fd = -1;
    return result;
  } finally {
    if (fd >= 0) fs.closeSync(fd);
  }
}

function assertRootOwnedDirectoryVisible(directory, reason) {
  const opened = fs.fstatSync(directory.fd, { bigint: true });
  const visible = fs.lstatSync(directory.path, { bigint: true });
  validateRootOwnedDirectory(opened, reason);
  validateRootOwnedDirectory(visible, reason);
  if (
    !sameDirectory(directory.stat, opened) ||
    !sameDirectory(opened, visible)
  ) {
    fail(reason + "_changed");
  }
}

function readRootOwnedConfig(configPath) {
  const raw = String(configPath ?? "").trim();
  if (
    !raw ||
    !path.isAbsolute(raw) ||
    raw.includes("\0")
  ) {
    fail("witness_replay_external_forced_command_config_invalid");
  }
  const resolved = path.resolve(raw);
  if (resolved === path.parse(resolved).root) {
    fail("witness_replay_external_forced_command_config_invalid");
  }

  const parent = openPinnedRootOwnedDirectory(
    path.dirname(resolved),
    "witness_replay_external_forced_command_config_parent_invalid",
  );
  try {
    const name = path.basename(resolved);
    const visiblePath = path.join(parent.path, name);
    const pinnedPath = path.join(parent.proc_path, name);
    const visibleBefore = fs.lstatSync(visiblePath, { bigint: true });
    validateRootOwnedReadOnlyFile(
      visibleBefore,
      MAX_CONFIG_BYTES,
      "witness_replay_external_forced_command_config_invalid",
    );

    const fd = fs.openSync(
      pinnedPath,
      fs.constants.O_RDONLY | O_NOFOLLOW,
    );
    try {
      const opened = fs.fstatSync(fd, { bigint: true });
      validateRootOwnedReadOnlyFile(
        opened,
        MAX_CONFIG_BYTES,
        "witness_replay_external_forced_command_config_invalid",
      );
      if (!sameFile(visibleBefore, opened)) {
        fail(
          "witness_replay_external_forced_command_config_path_not_bound",
        );
      }

      const bytes = readExactFd(
        fd,
        Number(opened.size),
        MAX_CONFIG_BYTES,
        false,
        "witness_replay_external_forced_command_config_invalid",
      );

      const after = fs.fstatSync(fd, { bigint: true });
      const visibleAfter = fs.lstatSync(visiblePath, { bigint: true });
      validateRootOwnedReadOnlyFile(
        after,
        MAX_CONFIG_BYTES,
        "witness_replay_external_forced_command_config_invalid",
      );
      validateRootOwnedReadOnlyFile(
        visibleAfter,
        MAX_CONFIG_BYTES,
        "witness_replay_external_forced_command_config_invalid",
      );
      assertRootOwnedDirectoryVisible(
        parent,
        "witness_replay_external_forced_command_config_parent_invalid",
      );
      if (
        !sameFile(opened, after) ||
        !sameFile(after, visibleAfter)
      ) {
        fail(
          "witness_replay_external_forced_command_config_changed_during_read",
        );
      }

      let parsed;
      try {
        parsed = JSON.parse(bytes.toString("utf8"));
      } catch {
        fail("witness_replay_external_forced_command_config_invalid");
      }
      const normalized = parseConfig(parsed);
      if (canonicalLine(normalized) !== bytes.toString("utf8")) {
        fail("witness_replay_external_forced_command_config_noncanonical");
      }
      return normalized;
    } finally {
      fs.closeSync(fd);
    }
  } finally {
    fs.closeSync(parent.fd);
  }
}
async function readOneRequest() {
  const chunks = [];
  let total = 0;
  for await (const chunk of process.stdin) {
    const bytes = Buffer.from(chunk);
    total += bytes.length;
    if (total > MAX_REQUEST_BYTES) {
      fail("witness_replay_external_forced_command_request_too_large");
    }
    chunks.push(bytes);
  }
  return Buffer.concat(chunks);
}

function parseCli(argv) {
  if (
    argv.length !== 1 ||
    !argv[0].startsWith("--config=")
  ) {
    fail("witness_replay_external_forced_command_cli_invalid");
  }
  const configPath = argv[0].slice("--config=".length);
  if (
    !configPath ||
    !path.isAbsolute(configPath) ||
    configPath.includes("\0")
  ) {
    fail("witness_replay_external_forced_command_cli_invalid");
  }
  return Object.freeze({ config_path: path.resolve(configPath) });
}

async function main() {
  if (
    process.env.VOID_BUY_VOID_REPLAY_EXTERNAL_WITNESS_FORCED_COMMAND_V1 !== "1"
  ) {
    fail("witness_replay_external_forced_command_marker_required");
  }
  if (String(process.env.SSH_ORIGINAL_COMMAND ?? "") !== "") {
    fail("witness_replay_external_forced_command_original_command_forbidden");
  }
  const cli = parseCli(process.argv.slice(2));
  const config = readRootOwnedConfig(cli.config_path);
  const request = await readOneRequest();
  const result =
    handleVoidBuyAllocationCustodyWitnessLiveReadReplayExternalForcedCommandRequestV1(
      config,
      request,
    );
  process.stdout.write(result.response_json);
}

const invokedAsScript =
  process.argv[1] &&
  import.meta.url ===
    pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedAsScript) {
  main().catch((error) => {
    process.stderr.write(
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_FORCED_COMMAND_V1 +
        "_HOLD " +
        String(error?.message || error) +
        "\n",
    );
    process.exitCode = 3;
  });
}