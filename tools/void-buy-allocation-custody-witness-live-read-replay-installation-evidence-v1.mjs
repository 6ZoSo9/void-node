#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1,
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1,
} from "../dist/economic/buy_void_allocation_custody_witness_live_read_replay_high_water_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_V1,
} from "../dist/economic/buy_void_allocation_custody_witness_live_read_replay_writer_v1.js";
import {
  parseMountInfoV1,
  resolveMountForPathV1,
} from "./void-buy-void-allocation-custody-preflight-v1.mjs";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_AUTHORITY_V1 =
  Object.freeze({
    source_only_collector: true,
    designated_host_read_only_observation: true,
    canonical_replay_writer_required: true,
    canonical_replay_high_water_required: true,
    descriptor_bound_root_observation: true,
    descriptor_bound_file_reads: true,
    terminal_root_and_file_revalidation: true,
    double_census_required: true,
    proc_mountinfo_read: true,
    mountinfo_stability_required: true,
    local_block_filesystem_required: true,
    distinct_mount_domains_required: true,
    distinct_parent_block_devices_required: true,
    mount_source_device_number_bound: true,
    single_parent_block_topology_required: true,
    parent_disk_serial_and_wwn_required: true,
    no_pending_publication_intent_required: true,
    caller_supplied_snapshot_authority: false,
    synthetic_storage_authority: false,
    filesystem_write: false,
    mount_mutation: false,
    storage_bootstrap: false,
    replay_journal_write: false,
    high_water_write: false,
    writer_intent_write: false,
    live_durable_storage_proven: false,
    rollback_resistance_proven: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    trusted_verification_clock_proven: false,
    challenge_entropy_proven: false,
    challenge_unpredictability_proven: false,
    live_evidence_origin_proven: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    live_remote_read_performed: false,
    runtime_integration: false,
    production_gate_ready: false,
    payment_acceptance: false,
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

const JOURNAL_NAME = "live-read-replay-v1.jsonl";
const HIGH_WATER_NAME = "live-read-replay-high-water-v1.json";
const INTENT_NAME = "live-read-replay-publication-intent-v1.json";

const MAX_JOURNAL_BYTES = 8 * 1024 * 1024;
const MAX_HIGH_WATER_BYTES = 16 * 1024;
const LOCAL_FS_TYPES = new Set(["ext4", "xfs", "btrfs"]);
const O_NOFOLLOW = fs.constants.O_NOFOLLOW;
const O_DIRECTORY = fs.constants.O_DIRECTORY;
const SAFE_DISK_TOKEN = /^[A-Za-z0-9._:+-]{1,300}$/u;
const SAFE_DEVICE_PATH = /^\/dev\/[A-Za-z0-9._:+/-]{1,300}$/u;
const SAFE_HOSTNAME = /^[A-Za-z0-9._-]{1,255}$/u;

function fail(code) {
  throw new Error(code);
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
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
  fail("witness_replay_installation_evidence_noncanonical_value");
}

function sha256Id(value) {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(value).digest("hex")
  );
}

function exactObject(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(code);
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  return value;
}

function currentUid() {
  if (typeof process.geteuid !== "function") {
    fail("witness_replay_installation_evidence_uid_unavailable");
  }
  return BigInt(process.geteuid());
}

function sameDirectoryIdentity(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode &&
    left.nlink === right.nlink
  );
}

function sameFileIdentity(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode &&
    left.nlink === right.nlink &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

function validateAncestor(stat, code) {
  const uid = currentUid();
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    (stat.uid !== 0n && stat.uid !== uid) ||
    (
      (Number(stat.mode) & 0o022) !== 0 &&
      (Number(stat.mode) & 0o1000) === 0
    )
  ) {
    fail(code);
  }
}

function validateRoot(stat, code) {
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    stat.uid !== currentUid() ||
    (Number(stat.mode) & 0o077) !== 0
  ) {
    fail(code);
  }
}

function validatePrivateFile(stat, maxBytes, allowEmpty, code) {
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.uid !== currentUid() ||
    stat.nlink !== 1n ||
    (Number(stat.mode) & 0o077) !== 0 ||
    stat.size < BigInt(allowEmpty ? 0 : 1) ||
    stat.size > BigInt(maxBytes)
  ) {
    fail(code);
  }
}

function requireDescriptorSafety() {
  if (
    process.platform !== "linux" ||
    typeof O_NOFOLLOW !== "number" ||
    typeof O_DIRECTORY !== "number" ||
    !fs.existsSync("/proc/self/fd")
  ) {
    fail("witness_replay_installation_evidence_descriptor_safety_unavailable");
  }
}

function openPinnedRoot(rawPath, label) {
  requireDescriptorSafety();
  const raw = String(rawPath || "").trim();
  if (
    !raw ||
    !path.isAbsolute(raw) ||
    path.resolve(raw) !== raw ||
    raw.includes("\0")
  ) {
    fail(label + "_path_invalid");
  }
  const real = fs.realpathSync(raw);
  if (real !== raw) fail(label + "_symlink_ancestor_or_alias");
  const visible = fs.lstatSync(raw, { bigint: true });
  validateRoot(visible, label + "_invalid");

  const parsed = path.parse(raw);
  const parts = raw
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
        label + "_ancestor_invalid",
      );
      if (!part || part === "." || part === "..") {
        fail(label + "_ancestor_component_invalid");
      }
      const next = fs.openSync(
        path.join("/proc/self/fd", String(fd), part),
        fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
      );
      fs.closeSync(fd);
      fd = next;
    }
    const opened = fs.fstatSync(fd, { bigint: true });
    validateRoot(opened, label + "_invalid");
    if (!sameDirectoryIdentity(visible, opened)) {
      fail(label + "_path_not_bound");
    }
    const result = Object.freeze({
      path: raw,
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

function assertPinnedRootVisible(root, label) {
  const opened = fs.fstatSync(root.fd, { bigint: true });
  const visible = fs.lstatSync(root.path, { bigint: true });
  validateRoot(opened, label + "_invalid");
  validateRoot(visible, label + "_invalid");
  if (
    fs.realpathSync(root.path) !== root.path ||
    !sameDirectoryIdentity(root.stat, opened) ||
    !sameDirectoryIdentity(opened, visible)
  ) {
    fail(label + "_changed");
  }
}

function readPinnedFile(root, name, maxBytes, allowEmpty, label) {
  assertPinnedRootVisible(root, label + "_root");
  const visiblePath = path.join(root.path, name);
  const pinnedPath = path.join(root.proc_path, name);
  const before = fs.lstatSync(visiblePath, { bigint: true });
  validatePrivateFile(before, maxBytes, allowEmpty, label + "_invalid");
  const fd = fs.openSync(
    pinnedPath,
    fs.constants.O_RDONLY | O_NOFOLLOW,
  );
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    validatePrivateFile(opened, maxBytes, allowEmpty, label + "_invalid");
    if (!sameFileIdentity(before, opened)) {
      fail(label + "_path_not_bound");
    }
    const size = Number(opened.size);
    if (!Number.isSafeInteger(size) || size < 0 || size > maxBytes) {
      fail(label + "_size_invalid");
    }
    const bytes = Buffer.alloc(size);
    let offset = 0;
    while (offset < size) {
      const count = fs.readSync(
        fd,
        bytes,
        offset,
        size - offset,
        offset,
      );
      if (count <= 0) fail(label + "_short_read");
      offset += count;
    }
    const growth = Buffer.alloc(1);
    if (fs.readSync(fd, growth, 0, 1, size) !== 0) {
      fail(label + "_grew_after_open");
    }
    const after = fs.fstatSync(fd, { bigint: true });
    const visibleAfter = fs.lstatSync(visiblePath, { bigint: true });
    validatePrivateFile(after, maxBytes, allowEmpty, label + "_invalid");
    validatePrivateFile(
      visibleAfter,
      maxBytes,
      allowEmpty,
      label + "_invalid",
    );
    if (
      !sameFileIdentity(opened, after) ||
      !sameFileIdentity(after, visibleAfter)
    ) {
      fail(label + "_changed");
    }
    return Object.freeze({
      bytes,
      stat: after,
      path: visiblePath,
    });
  } finally {
    fs.closeSync(fd);
  }
}

function assertPinnedFileVisible(observed, maxBytes, allowEmpty, label) {
  const visible = fs.lstatSync(observed.path, { bigint: true });
  validatePrivateFile(visible, maxBytes, allowEmpty, label + "_invalid");
  if (!sameFileIdentity(observed.stat, visible)) {
    fail(label + "_changed_after_snapshot");
  }
}

function assertIntentAbsent(root, label) {
  assertPinnedRootVisible(root, label + "_root");
  const pinned = path.join(root.proc_path, INTENT_NAME);
  try {
    const stat = fs.lstatSync(pinned, { bigint: true });
    if (stat) fail(label + "_publication_intent_present");
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
}

function runText(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: false,
    timeout: 5_000,
    maxBuffer: 1024 * 1024,
    env: {
      PATH: "/usr/sbin:/usr/bin:/sbin:/bin",
      LANG: "C",
      LC_ALL: "C",
    },
  });
  if (
    result.error ||
    result.signal ||
    result.status !== 0 ||
    typeof result.stdout !== "string" ||
    typeof result.stderr !== "string"
  ) {
    fail("witness_replay_installation_evidence_command_failed");
  }
  return result.stdout.trim();
}

function sameBlockDeviceIdentity(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.rdev === right.rdev &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode &&
    left.nlink === right.nlink
  );
}

function statHexDeviceNumberToDecimalV1(raw, code) {
  const value = String(raw || "").trim();
  if (!/^[0-9a-fA-F]+:[0-9a-fA-F]+$/u.test(value)) {
    fail(code);
  }
  const [majorHex, minorHex] = value.split(":");
  let major;
  let minor;
  try {
    major = BigInt("0x" + majorHex);
    minor = BigInt("0x" + minorHex);
  } catch {
    fail(code);
  }
  if (
    major < 0n ||
    minor < 0n ||
    major > 0xffffffffn ||
    minor > 0xffffffffn
  ) {
    fail(code);
  }
  return String(major) + ":" + String(minor);
}

export function testOnlyStatHexDeviceNumberToDecimalV1(raw) {
  return statHexDeviceNumberToDecimalV1(
    raw,
    "witness_replay_installation_evidence_test_device_number_invalid",
  );
}

function singleParentNameV1(raw) {
  const value = String(raw || "");
  if (value === "") return null;
  if (!/^[A-Za-z0-9._+-]+$/u.test(value)) {
    fail("witness_replay_installation_evidence_parent_topology_ambiguous");
  }
  return value;
}

export function testOnlySingleParentNameV1(raw) {
  return singleParentNameV1(raw);
}

function observeStableBlockDeviceV1(devicePath, label, observe) {
  if (
    typeof devicePath !== "string" ||
    !SAFE_DEVICE_PATH.test(devicePath) ||
    fs.realpathSync(devicePath) !== devicePath ||
    typeof observe !== "function"
  ) {
    fail(label + "_invalid");
  }

  const before = fs.lstatSync(devicePath, { bigint: true });
  if (!before.isBlockDevice() || before.isSymbolicLink()) {
    fail(label + "_not_block_device");
  }
  const majorMinorBefore = statHexDeviceNumberToDecimalV1(
    runText("/usr/bin/stat", ["-Lc", "%t:%T", devicePath]),
    label + "_device_number_invalid",
  );

  const value = observe();

  const majorMinorAfter = statHexDeviceNumberToDecimalV1(
    runText("/usr/bin/stat", ["-Lc", "%t:%T", devicePath]),
    label + "_device_number_invalid",
  );
  const after = fs.lstatSync(devicePath, { bigint: true });
  if (
    !after.isBlockDevice() ||
    after.isSymbolicLink() ||
    !sameBlockDeviceIdentity(before, after) ||
    majorMinorBefore !== majorMinorAfter
  ) {
    fail(label + "_changed");
  }

  return Object.freeze({
    major_minor: majorMinorAfter,
    observed: value,
  });
}

function parentDiskIdentity(mountSource, mountMajorMinor) {
  if (
    typeof mountSource !== "string" ||
    !SAFE_DEVICE_PATH.test(mountSource) ||
    typeof mountMajorMinor !== "string" ||
    !/^[0-9]+:[0-9]+$/u.test(mountMajorMinor)
  ) {
    fail("witness_replay_installation_evidence_mount_source_invalid");
  }
  const resolved = fs.realpathSync(mountSource);
  if (!SAFE_DEVICE_PATH.test(resolved)) {
    fail("witness_replay_installation_evidence_mount_source_invalid");
  }

  const mountObservation = observeStableBlockDeviceV1(
    resolved,
    "witness_replay_installation_evidence_mount_source_device",
    () =>
      runText(
        "/usr/bin/lsblk",
        ["-ndo", "PKNAME", resolved],
      ),
  );
  if (mountObservation.major_minor !== mountMajorMinor) {
    fail("witness_replay_installation_evidence_mount_source_device_mismatch");
  }

  const parentName = singleParentNameV1(mountObservation.observed);
  const parentRaw =
    parentName === null ? resolved : "/dev/" + parentName;
  const parent = fs.realpathSync(parentRaw);
  if (!SAFE_DEVICE_PATH.test(parent)) {
    fail("witness_replay_installation_evidence_parent_device_invalid");
  }

  const parentObservation = observeStableBlockDeviceV1(
    parent,
    "witness_replay_installation_evidence_parent_device",
    () =>
      runText(
        "/usr/bin/lsblk",
        ["-ndo", "SERIAL,WWN", parent],
      ),
  );
  const identity = parentObservation.observed
    .split(/\s+/u)
    .filter(Boolean);
  if (
    identity.length !== 2 ||
    !SAFE_DISK_TOKEN.test(identity[0]) ||
    !SAFE_DISK_TOKEN.test(identity[1])
  ) {
    fail("witness_replay_installation_evidence_disk_identity_invalid");
  }
  return Object.freeze({
    mount_source_resolved: resolved,
    parent_device: parent,
    disk_serial: identity[0],
    disk_wwn: identity[1],
  });
}

function pathAncestor(left, right) {
  return (
    right === left ||
    right.startsWith(left.endsWith(path.sep) ? left : left + path.sep)
  );
}

function publicRootSnapshot(root, mount, disk) {
  return Object.freeze({
    path: root.path,
    dev: String(root.stat.dev),
    ino: String(root.stat.ino),
    uid: Number(root.stat.uid),
    gid: Number(root.stat.gid),
    mode: Number(root.stat.mode) & 0o7777,
    mount_id: mount.mount_id,
    major_minor: mount.major_minor,
    fs_type: mount.fs_type,
    mount_source: mount.mount_source,
    mount_source_resolved: disk.mount_source_resolved,
    mount_point: mount.mount_point,
    parent_device: disk.parent_device,
    disk_serial: disk.disk_serial,
    disk_wwn: disk.disk_wwn,
  });
}

function publicFileSnapshot(observed) {
  return Object.freeze({
    path: observed.path,
    dev: String(observed.stat.dev),
    ino: String(observed.stat.ino),
    mtime_ns: String(observed.stat.mtimeNs),
    ctime_ns: String(observed.stat.ctimeNs),
    sha256: sha256Id(observed.bytes),
    bytes: observed.bytes.length,
    uid: Number(observed.stat.uid),
    gid: Number(observed.stat.gid),
    mode: Number(observed.stat.mode) & 0o7777,
    nlink: Number(observed.stat.nlink),
    regular_file: observed.stat.isFile(),
    symlink: observed.stat.isSymbolicLink(),
  });
}

const ROOT_KEYS = Object.freeze([
  "path",
  "dev",
  "ino",
  "uid",
  "gid",
  "mode",
  "mount_id",
  "major_minor",
  "fs_type",
  "mount_source",
  "mount_source_resolved",
  "mount_point",
  "parent_device",
  "disk_serial",
  "disk_wwn",
]);

const FILE_KEYS = Object.freeze([
  "path",
  "dev",
  "ino",
  "mtime_ns",
  "ctime_ns",
  "sha256",
  "bytes",
  "uid",
  "gid",
  "mode",
  "nlink",
  "regular_file",
  "symlink",
]);

function classifySnapshot(snapshot, live) {
  const raw = exactObject(
    snapshot,
    [
      "hostname",
      "journal_root",
      "high_water_root",
      "journal_file",
      "high_water_file",
      "journal_jsonl",
      "high_water_json",
      "journal_intent_present",
      "high_water_intent_present",
    ],
    "witness_replay_installation_evidence_snapshot_invalid",
  );
  if (
    typeof raw.hostname !== "string" ||
    !SAFE_HOSTNAME.test(raw.hostname)
  ) {
    fail("witness_replay_installation_evidence_hostname_invalid");
  }
  const journalRoot = exactObject(
    raw.journal_root,
    ROOT_KEYS,
    "witness_replay_installation_evidence_journal_root_invalid",
  );
  const highWaterRoot = exactObject(
    raw.high_water_root,
    ROOT_KEYS,
    "witness_replay_installation_evidence_high_water_root_invalid",
  );
  const journalFile = exactObject(
    raw.journal_file,
    FILE_KEYS,
    "witness_replay_installation_evidence_journal_file_invalid",
  );
  const highWaterFile = exactObject(
    raw.high_water_file,
    FILE_KEYS,
    "witness_replay_installation_evidence_high_water_file_invalid",
  );

  for (const [label, root] of [
    ["journal", journalRoot],
    ["high_water", highWaterRoot],
  ]) {
    if (
      typeof root.path !== "string" ||
      !path.isAbsolute(root.path) ||
      typeof root.dev !== "string" ||
      !root.dev ||
      typeof root.ino !== "string" ||
      !root.ino ||
      !Number.isSafeInteger(root.uid) ||
      root.uid < 0 ||
      !Number.isSafeInteger(root.gid) ||
      root.gid < 0 ||
      root.mode !== 0o700 ||
      !Number.isSafeInteger(root.mount_id) ||
      root.mount_id < 1 ||
      typeof root.major_minor !== "string" ||
      !/^[0-9]+:[0-9]+$/u.test(root.major_minor) ||
      !LOCAL_FS_TYPES.has(String(root.fs_type || "")) ||
      typeof root.mount_source !== "string" ||
      !SAFE_DEVICE_PATH.test(root.mount_source) ||
      typeof root.mount_source_resolved !== "string" ||
      !SAFE_DEVICE_PATH.test(root.mount_source_resolved) ||
      typeof root.mount_point !== "string" ||
      !path.isAbsolute(root.mount_point) ||
      typeof root.parent_device !== "string" ||
      !SAFE_DEVICE_PATH.test(root.parent_device) ||
      typeof root.disk_serial !== "string" ||
      !SAFE_DISK_TOKEN.test(root.disk_serial) ||
      typeof root.disk_wwn !== "string" ||
      !SAFE_DISK_TOKEN.test(root.disk_wwn)
    ) {
      fail(
        "witness_replay_installation_evidence_" +
          label +
          "_storage_domain_invalid",
      );
    }
  }

  if (
    journalRoot.uid !== highWaterRoot.uid ||
    journalRoot.gid !== highWaterRoot.gid
  ) {
    fail("witness_replay_installation_evidence_root_owner_mismatch");
  }
  if (
    pathAncestor(journalRoot.path, highWaterRoot.path) ||
    pathAncestor(highWaterRoot.path, journalRoot.path)
  ) {
    fail("witness_replay_installation_evidence_roots_not_path_disjoint");
  }
  if (
    journalRoot.dev === highWaterRoot.dev ||
    journalRoot.mount_id === highWaterRoot.mount_id ||
    journalRoot.major_minor === highWaterRoot.major_minor ||
    journalRoot.mount_source === highWaterRoot.mount_source ||
    journalRoot.mount_source_resolved === highWaterRoot.mount_source_resolved
  ) {
    fail("witness_replay_installation_evidence_mount_domains_not_distinct");
  }
  if (
    journalRoot.parent_device === highWaterRoot.parent_device ||
    journalRoot.disk_serial === highWaterRoot.disk_serial ||
    journalRoot.disk_wwn === highWaterRoot.disk_wwn
  ) {
    fail("witness_replay_installation_evidence_parent_disks_not_distinct");
  }

  for (const [label, file, expectedPath, maxBytes, allowEmpty] of [
    [
      "journal",
      journalFile,
      path.join(journalRoot.path, JOURNAL_NAME),
      MAX_JOURNAL_BYTES,
      true,
    ],
    [
      "high_water",
      highWaterFile,
      path.join(highWaterRoot.path, HIGH_WATER_NAME),
      MAX_HIGH_WATER_BYTES,
      false,
    ],
  ]) {
    if (
      file.path !== expectedPath ||
      typeof file.dev !== "string" ||
      !/^[0-9]+$/u.test(file.dev) ||
      typeof file.ino !== "string" ||
      !/^[1-9][0-9]*$/u.test(file.ino) ||
      typeof file.mtime_ns !== "string" ||
      !/^[0-9]+$/u.test(file.mtime_ns) ||
      typeof file.ctime_ns !== "string" ||
      !/^[0-9]+$/u.test(file.ctime_ns) ||
      typeof file.sha256 !== "string" ||
      !/^sha256:[0-9a-f]{64}$/u.test(file.sha256) ||
      !Number.isSafeInteger(file.bytes) ||
      file.bytes < (allowEmpty ? 0 : 1) ||
      file.bytes > maxBytes ||
      file.uid !== journalRoot.uid ||
      file.gid !== journalRoot.gid ||
      file.mode !== 0o600 ||
      file.nlink !== 1 ||
      file.regular_file !== true ||
      file.symlink !== false
    ) {
      fail(
        "witness_replay_installation_evidence_" +
          label +
          "_file_invalid",
      );
    }
  }

  if (
    journalFile.dev !== journalRoot.dev ||
    highWaterFile.dev !== highWaterRoot.dev
  ) {
    fail("witness_replay_installation_evidence_file_storage_domain_mismatch");
  }

  if (
    raw.journal_intent_present !== false ||
    raw.high_water_intent_present !== false
  ) {
    fail("witness_replay_installation_evidence_publication_intent_present");
  }

  const journalBytes = Buffer.isBuffer(raw.journal_jsonl)
    ? Buffer.from(raw.journal_jsonl)
    : typeof raw.journal_jsonl === "string"
      ? Buffer.from(raw.journal_jsonl, "utf8")
      : fail("witness_replay_installation_evidence_journal_bytes_invalid");
  const highWaterBytes = Buffer.isBuffer(raw.high_water_json)
    ? Buffer.from(raw.high_water_json)
    : typeof raw.high_water_json === "string"
      ? Buffer.from(raw.high_water_json, "utf8")
      : fail("witness_replay_installation_evidence_high_water_bytes_invalid");

  if (
    sha256Id(journalBytes) !== journalFile.sha256 ||
    journalBytes.length !== journalFile.bytes ||
    sha256Id(highWaterBytes) !== highWaterFile.sha256 ||
    highWaterBytes.length !== highWaterFile.bytes
  ) {
    fail("witness_replay_installation_evidence_file_digest_mismatch");
  }

  const binding =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1({
      journal_jsonl: journalBytes,
      high_water_json: highWaterBytes,
    });
  if (binding.ok !== true) {
    fail(
      "witness_replay_installation_evidence_high_water_" +
        String(binding.reason || "invalid"),
    );
  }

  const normalized = Object.freeze({
    schema:
      "void_buy_void_allocation_custody_witness_live_read_replay_installation_evidence_v1",
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_V1,
    version: 1,
    parent_writer_marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_V1,
    high_water_marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1,
    hostname: raw.hostname,
    journal_root: journalRoot,
    high_water_root: highWaterRoot,
    journal_file: journalFile,
    high_water_file: highWaterFile,
    high_water_sha256: binding.high_water_sha256,
    generation: binding.high_water.generation,
    sequence: binding.high_water.sequence,
    event_count: binding.high_water.event_count,
    pending: binding.high_water.pending,
    pending_challenge_sha256:
      binding.high_water.pending_challenge_sha256,
    pending_challenge_id:
      binding.high_water.pending_challenge_id,
    pending_expires_at_ms:
      binding.high_water.pending_expires_at_ms,
    last_terminal_state:
      binding.high_water.last_terminal_state,
    ready_for_issue:
      binding.high_water.ready_for_issue,
  });
  const qualificationId =
    "voidwlrie1_" +
    crypto
      .createHash("sha256")
      .update(canonicalJson(normalized), "utf8")
      .digest("hex");

  return Object.freeze({
    ok: true,
    status: live
      ? "LIVE_REPLAY_STORAGE_DOMAINS_QUALIFIED"
      : "REPLAY_STORAGE_DOMAINS_CLASSIFIED_TEST_ONLY",
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_V1,
    version: 1,
    qualification_id: qualificationId,
    normalized,
    operation_performed: false,
    storage_domain_classification_green: true,
    live_storage_observation_proven: live === true,
    distinct_local_storage_domains_proven: live === true,
    distinct_parent_block_devices_proven: live === true,
    canonical_journal_high_water_binding_proven: true,
    no_pending_publication_intent_observed: true,
    double_census_stability_proven: live === true,
    live_durable_storage_proven: false,
    rollback_resistance_proven: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    live_evidence_origin_proven: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    live_remote_read_performed: false,
    runtime_integration: false,
    production_gate_ready: false,
    funds_movement: false,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_AUTHORITY_V1,
  });
}

export function testOnlyClassifyBuyVoidAllocationCustodyWitnessLiveReadReplayInstallationSnapshotV1(
  snapshot,
) {
  try {
    return classifySnapshot(snapshot, false);
  } catch (error) {
    return Object.freeze({
      ok: false,
      status: "HOLD",
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_V1,
      version: 1,
      reason: String(error?.message || error || "snapshot_invalid"),
      operation_performed: false,
      live_storage_observation_proven: false,
      distinct_local_storage_domains_proven: false,
      distinct_parent_block_devices_proven: false,
      protected_high_water_custody_proven: false,
      independent_custody_proven: false,
      production_gate_ready: false,
      funds_movement: false,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_AUTHORITY_V1,
    });
  }
}

function observeOnce({
  journal_root,
  high_water_root,
  expected_hostname,
}) {
  const hostname = os.hostname();
  if (
    typeof expected_hostname !== "string" ||
    !SAFE_HOSTNAME.test(expected_hostname) ||
    hostname !== expected_hostname
  ) {
    fail("witness_replay_installation_evidence_designated_host_mismatch");
  }

  const mountInfoBefore = fs.readFileSync(
    "/proc/self/mountinfo",
    "utf8",
  );
  const mounts = parseMountInfoV1(mountInfoBefore);

  const journalRoot = openPinnedRoot(
    journal_root,
    "witness_replay_installation_evidence_journal_root",
  );
  let highWaterRoot = null;
  try {
    highWaterRoot = openPinnedRoot(
      high_water_root,
      "witness_replay_installation_evidence_high_water_root",
    );

    assertIntentAbsent(
      journalRoot,
      "witness_replay_installation_evidence_journal",
    );
    assertIntentAbsent(
      highWaterRoot,
      "witness_replay_installation_evidence_high_water",
    );

    const journalObserved = readPinnedFile(
      journalRoot,
      JOURNAL_NAME,
      MAX_JOURNAL_BYTES,
      true,
      "witness_replay_installation_evidence_journal_file",
    );
    const highWaterObserved = readPinnedFile(
      highWaterRoot,
      HIGH_WATER_NAME,
      MAX_HIGH_WATER_BYTES,
      false,
      "witness_replay_installation_evidence_high_water_file",
    );

    const journalMount =
      resolveMountForPathV1(mounts, journalRoot.path);
    const highWaterMount =
      resolveMountForPathV1(mounts, highWaterRoot.path);
    const journalDisk = parentDiskIdentity(
      journalMount.mount_source,
      journalMount.major_minor,
    );
    const highWaterDisk = parentDiskIdentity(
      highWaterMount.mount_source,
      highWaterMount.major_minor,
    );

    const mountInfoAfter = fs.readFileSync(
      "/proc/self/mountinfo",
      "utf8",
    );
    if (mountInfoAfter !== mountInfoBefore) {
      fail("witness_replay_installation_evidence_mountinfo_changed");
    }

    assertPinnedRootVisible(
      journalRoot,
      "witness_replay_installation_evidence_journal_root",
    );
    assertPinnedRootVisible(
      highWaterRoot,
      "witness_replay_installation_evidence_high_water_root",
    );
    assertPinnedFileVisible(
      journalObserved,
      MAX_JOURNAL_BYTES,
      true,
      "witness_replay_installation_evidence_journal_file",
    );
    assertPinnedFileVisible(
      highWaterObserved,
      MAX_HIGH_WATER_BYTES,
      false,
      "witness_replay_installation_evidence_high_water_file",
    );
    assertIntentAbsent(
      journalRoot,
      "witness_replay_installation_evidence_journal",
    );
    assertIntentAbsent(
      highWaterRoot,
      "witness_replay_installation_evidence_high_water",
    );

    return Object.freeze({
      hostname,
      journal_root: publicRootSnapshot(
        journalRoot,
        journalMount,
        journalDisk,
      ),
      high_water_root: publicRootSnapshot(
        highWaterRoot,
        highWaterMount,
        highWaterDisk,
      ),
      journal_file: publicFileSnapshot(journalObserved),
      high_water_file: publicFileSnapshot(highWaterObserved),
      journal_jsonl: Buffer.from(journalObserved.bytes),
      high_water_json: Buffer.from(highWaterObserved.bytes),
      journal_intent_present: false,
      high_water_intent_present: false,
    });
  } finally {
    if (highWaterRoot) fs.closeSync(highWaterRoot.fd);
    fs.closeSync(journalRoot.fd);
  }
}

function stablePublicSnapshot(snapshot) {
  return Object.freeze({
    hostname: snapshot.hostname,
    journal_root: snapshot.journal_root,
    high_water_root: snapshot.high_water_root,
    journal_file: snapshot.journal_file,
    high_water_file: snapshot.high_water_file,
    journal_sha256: sha256Id(snapshot.journal_jsonl),
    high_water_sha256: sha256Id(snapshot.high_water_json),
    journal_intent_present: snapshot.journal_intent_present,
    high_water_intent_present: snapshot.high_water_intent_present,
  });
}

export function testOnlyStableBuyVoidAllocationCustodyWitnessLiveReadReplayInstallationSnapshotsEqualV1(
  left,
  right,
) {
  return (
    canonicalJson(stablePublicSnapshot(left)) ===
    canonicalJson(stablePublicSnapshot(right))
  );
}

export function inspectBuyVoidAllocationCustodyWitnessLiveReadReplayInstallationEvidenceV1(
  input = {},
) {
  try {
    const first = observeOnce(input);
    const second = observeOnce(input);
    if (
      canonicalJson(stablePublicSnapshot(first)) !==
      canonicalJson(stablePublicSnapshot(second))
    ) {
      fail("witness_replay_installation_evidence_changed_between_censuses");
    }
    return classifySnapshot(second, true);
  } catch (error) {
    return Object.freeze({
      ok: false,
      status: "HOLD",
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_V1,
      version: 1,
      reason: String(error?.message || error || "installation_evidence_failed"),
      operation_performed: false,
      live_storage_observation_proven: false,
      distinct_local_storage_domains_proven: false,
      distinct_parent_block_devices_proven: false,
      protected_high_water_custody_proven: false,
      independent_custody_proven: false,
      production_gate_ready: false,
      funds_movement: false,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_AUTHORITY_V1,
    });
  }
}

function arg(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || index + 1 >= process.argv.length) return "";
  return String(process.argv[index + 1] || "").trim();
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url))
) {
  if (process.argv.includes("--help")) {
    process.stdout.write([
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_V1,
      "read_only=true",
      "storage_bootstrap=false",
      "protected_high_water_custody_proven=false",
      "independent_custody_proven=false",
      "",
      "Usage:",
      "  node tools/void-buy-allocation-custody-witness-live-read-replay-installation-evidence-v1.mjs \\",
      "    --journal-root /absolute/private/journal-root \\",
      "    --high-water-root /absolute/private/high-water-root \\",
      "    --expected-hostname HOST",
      "",
    ].join("\n"));
  } else {
    const decision =
      inspectBuyVoidAllocationCustodyWitnessLiveReadReplayInstallationEvidenceV1({
        journal_root: arg("--journal-root"),
        high_water_root: arg("--high-water-root"),
        expected_hostname: arg("--expected-hostname"),
      });
    process.stdout.write(JSON.stringify(decision, null, 2) + "\n");
    if (!decision.ok) process.exitCode = 2;
  }
}
