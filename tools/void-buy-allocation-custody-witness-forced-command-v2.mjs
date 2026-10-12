import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_ENDPOINT_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_V1,
  buildBuyVoidAllocationCustodyWitnessTransportAppendResponseV1,
  classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1,
  classifyBuyVoidAllocationCustodyWitnessTransportRequestEnvelopeV1,
  classifyBuyVoidAllocationCustodyWitnessTransportServerRequestV1,
} from "../dist/economic/buy_void_allocation_custody_witness_transport_v1.js";
import {
  parseBuyVoidAllocationCustodyExternalWitnessJournalV1,
} from "../dist/economic/buy_void_allocation_custody_external_witness_v1.js";
import {
  withBuyVoidFilesystemBakeryLockV1,
} from "../dist/economic/buy_void_filesystem_bakery_lock_v1.js";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_V2 =
  "VOID_BUY_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_V2";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_AUTHORITY_V2 =
  Object.freeze({
    source_handler: true,
    forced_command_boundary: true,
    protected_server_config_contract: true,
    root_owned_nonwritable_config_parent_required: true,
    root_owned_read_only_config_file_required: true,
    server_controlled_policy_origin_contract: true,
    fixed_witness_filename: true,
    caller_selected_policy: false,
    caller_selected_remote_path: false,
    caller_selected_remote_command: false,
    descriptor_pinned_authority_root: true,
    nofollow_ancestor_walk: true,
    nofollow_config_read: true,
    nofollow_witness_open: true,
    single_link_mode_0600_witness_required: true,
    mode_0700_authority_root_required: true,
    shared_cross_process_lock: true,
    durable_append_intent: true,
    exact_single_event_append: true,
    exact_idempotence: true,
    exact_torn_append_recovery: true,
    witness_file_fsync: true,
    authority_directory_fsync: true,
    post_mutation_path_rebind: true,
    local_host_identity_rechecked: true,
    continuity_attestation_consumption_contract: true,
    exact_reviewed_continuity_attestation_required: true,
    exact_historical_predecessor_prefix_required: true,
    successor_machine_id_identity_path_defined: true,
    live_continuity_attestation_installed: false,
    current_machine_id_runtime_admission_proven: false,
    original_remote_command_rejected: true,
    live_nimo_installed: false,
    authorized_keys_mutated: false,
    ssh_key_generated: false,
    server_controlled_policy_origin_proven: false,
    challenge_freshness_proven: false,
    response_replay_resistance_proven: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    runtime_integration: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    production_gate_ready: false,
    payment_acceptance: false,
    wallet_or_signer_access: false,
    transaction_broadcast: false,
    funds_movement: false,
  });

const CONFIG_SCHEMA =
  "void_buy_void_allocation_custody_witness_forced_command_config_v1";
const CONFIG_MARKER =
  "VOID_BUY_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_CONFIG_V1";
const INTENT_SCHEMA =
  "void_buy_void_allocation_custody_witness_append_intent_v1";
const INTENT_MARKER =
  "VOID_BUY_ALLOCATION_CUSTODY_WITNESS_APPEND_INTENT_V1";
const WITNESS_NAME =
  "buy-void-allocation-custody-high-water-witness-v1.jsonl";
const INTENT_NAME =
  "buy-void-allocation-custody-witness-append-intent-v1.json";
const LOCK_NAME =
  ".buy-void-allocation-custody-witness-forced-command-v1";
const MAX_CONFIG_BYTES = 256 * 1024;
const MAX_INTENT_BYTES = 512 * 1024;
const MAX_REQUEST_BYTES = 256 * 1024;
const MAX_WITNESS_BYTES = 16 * 1024 * 1024;
const O_NOFOLLOW = fs.constants.O_NOFOLLOW;
const O_DIRECTORY = fs.constants.O_DIRECTORY;

const CONTINUITY_ATTESTATION_NAME =
  "buy-void-allocation-custody-witness-identity-continuity-attestation-v1.json";
const MAX_CONTINUITY_ATTESTATION_BYTES = 16 * 1024;

const HISTORICAL_PREDECESSOR_WITNESS_SHA256 =
  "sha256:a73c8c674bea5ed473938ddbf4275a651272fefd4e75d212d3d2bb8c8e5cbe1a";
const HISTORICAL_PREDECESSOR_WITNESS_BYTES = 1411;
const HISTORICAL_PREDECESSOR_EVENT_COUNT = 1;
const HISTORICAL_PREDECESSOR_TIP_EVENT_SHA256 =
  "sha256:2092c92ac3117ae4ec1cd4d55627ff9e46e3bd4e3b20d1bbd848e1189d5d4654";

const REVIEWED_CONTINUITY_ATTESTATION_SHA256 =
  "sha256:12a6f037d1297c89f017f4d4ed3ca96c2ffadae820dd6d1b170f3966183481eb";
const REVIEWED_CONTINUITY_ATTESTATION_ID =
  "voidwica1_49191c526f27da78075973403bc7e98238eedcdd2442fd1339311cf4c45e3eee";
const REVIEWED_CENSUS_RECEIPT_SHA256 =
  "sha256:17bdb840978606db5145696a7b5085cabbcf27dee76b35a1b57324c1021241ef";
const HISTORICAL_MACHINE_ID_SHA256 =
  "sha256:318e4b68f99f27982112de8b2279949f685f27bef0854feea47178618e5580da";
const SUCCESSOR_MACHINE_ID_SHA256 =
  "sha256:48a3554126d621d6460385ebacf3d41b454157337271cb7405af012158f203d4";
const REVIEWED_HOSTKEY_FINGERPRINT =
  "SHA256:3c9mfrwEQ9RKbVwL8pw/kvbCFt5imaj3QCK79yynkvk";

function fail(reason) {
  throw new Error(reason);
}

function sha256Id(value) {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(value).digest("hex")
  );
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
        .map(
          (key) =>
            JSON.stringify(key) + ":" + canonicalJson(value[key]),
        )
        .join(",") +
      "}"
    );
  }
  fail("witness_forced_command_noncanonical_value");
}

function canonicalLine(value) {
  return canonicalJson(value) + "\n";
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

function sameDirectory(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode
  );
}

function sameFileCore(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode &&
    left.nlink === right.nlink
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

function validateRootOwnedNonWritableDirectory(stat, reason) {
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

function validateRootOwnedReadOnlyFile(
  stat,
  maxBytes,
  allowEmpty,
  reason,
) {
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.uid !== 0n ||
    stat.gid !== 0n ||
    stat.nlink !== 1n ||
    (Number(stat.mode) & 0o777) !== 0o444 ||
    stat.size < BigInt(allowEmpty ? 0 : 1) ||
    stat.size > BigInt(maxBytes)
  ) {
    fail(reason);
  }
}

function openPinnedDirectory(rawPath, reason) {
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
    if (!sameDirectory(visible, opened)) {
      fail(reason + "_changed");
    }

    const result = Object.freeze({
      path: resolved,
      fd,
      stat: opened,
      proc_path: "/proc/self/fd/" + String(fd),
      trust_policy: "private_account",
    });
    fd = -1;
    return result;
  } finally {
    if (fd >= 0) fs.closeSync(fd);
  }
}

function openPinnedRootOwnedNonWritableDirectory(rawPath, reason) {
  const resolved = path.resolve(String(rawPath ?? ""));
  if (
    !path.isAbsolute(resolved) ||
    resolved === path.parse(resolved).root ||
    resolved.includes("\0")
  ) {
    fail(reason);
  }

  const visible = fs.lstatSync(resolved, { bigint: true });
  validateRootOwnedNonWritableDirectory(visible, reason);

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
      validateRootOwnedNonWritableDirectory(
        openedCurrent,
        reason + "_ancestor_invalid",
      );
      validateRootOwnedNonWritableDirectory(
        visibleCurrent,
        reason + "_ancestor_invalid",
      );
      if (!sameDirectory(openedCurrent, visibleCurrent)) {
        fail(reason + "_ancestor_changed");
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
    validateRootOwnedNonWritableDirectory(opened, reason);
    validateRootOwnedNonWritableDirectory(visibleFinal, reason);
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
      trust_policy: "root_owned_nonwritable",
    });
    fd = -1;
    return result;
  } finally {
    if (fd >= 0) fs.closeSync(fd);
  }
}

function assertPinnedDirectoryVisible(directory, reason) {
  const opened = fs.fstatSync(directory.fd, { bigint: true });
  const visible = fs.lstatSync(directory.path, { bigint: true });

  if (directory.trust_policy === "private_account") {
    validatePrivateDirectory(opened, reason);
    validatePrivateDirectory(visible, reason);
  } else if (directory.trust_policy === "root_owned_nonwritable") {
    validateRootOwnedNonWritableDirectory(opened, reason);
    validateRootOwnedNonWritableDirectory(visible, reason);
  } else {
    fail(reason + "_trust_policy_invalid");
  }

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
    const count = fs.readSync(
      fd,
      bytes,
      offset,
      size - offset,
      offset,
    );
    if (count <= 0) fail(reason + "_short_read");
    offset += count;
  }
  return bytes;
}

function readPinnedNamedFile(
  directory,
  name,
  maxBytes,
  allowEmpty,
  reason,
  validateFile = validatePrivateFile,
) {
  if (typeof validateFile !== "function") {
    fail(reason + "_validator_invalid");
  }
  assertPinnedDirectoryVisible(directory, reason + "_directory");
  const visiblePath = path.join(directory.path, name);
  const pinnedPath = path.join(directory.proc_path, name);
  const visibleBefore = fs.lstatSync(visiblePath, { bigint: true });
  validateFile(visibleBefore, maxBytes, allowEmpty, reason);

  const fd = fs.openSync(
    pinnedPath,
    fs.constants.O_RDONLY | O_NOFOLLOW,
  );
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    validateFile(opened, maxBytes, allowEmpty, reason);
    if (
      !sameFileCore(visibleBefore, opened) ||
      visibleBefore.size !== opened.size ||
      visibleBefore.mtimeNs !== opened.mtimeNs ||
      visibleBefore.ctimeNs !== opened.ctimeNs
    ) {
      fail(reason + "_path_not_bound");
    }

    const bytes = readExactFd(
      fd,
      Number(opened.size),
      maxBytes,
      allowEmpty,
      reason,
    );

    const after = fs.fstatSync(fd, { bigint: true });
    const visibleAfter = fs.lstatSync(visiblePath, { bigint: true });
    validateFile(after, maxBytes, allowEmpty, reason);
    validateFile(visibleAfter, maxBytes, allowEmpty, reason);

    if (
      !sameFileCore(opened, after) ||
      !sameFileCore(after, visibleAfter) ||
      after.size !== visibleAfter.size ||
      after.mtimeNs !== visibleAfter.mtimeNs ||
      after.ctimeNs !== visibleAfter.ctimeNs
    ) {
      fail(reason + "_changed_during_read");
    }

    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}

function readOptionalPinnedNamedFile(
  directory,
  name,
  maxBytes,
  reason,
) {
  assertPinnedDirectoryVisible(directory, reason + "_directory");
  const pinnedPath = path.join(directory.proc_path, name);
  try {
    fs.lstatSync(pinnedPath, { bigint: true });
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
  return readPinnedNamedFile(
    directory,
    name,
    maxBytes,
    false,
    reason,
  );
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
    if (count <= 0) fail("witness_forced_command_short_write");
    offset += count;
  }
}

function createPinnedNamedFile(
  directory,
  name,
  bytes,
  maxBytes,
  reason,
) {
  if (bytes.length < 1 || bytes.length > maxBytes) fail(reason);
  assertPinnedDirectoryVisible(directory, reason + "_directory");
  const target = path.join(directory.proc_path, name);
  const fd = fs.openSync(
    target,
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
}

function unlinkPinnedNamedFile(directory, name, reason) {
  assertPinnedDirectoryVisible(directory, reason + "_directory");
  const pinned = path.join(directory.proc_path, name);
  const visible = path.join(directory.path, name);
  const before = fs.lstatSync(visible, { bigint: true });
  validatePrivateFile(before, MAX_INTENT_BYTES, false, reason);
  const pinnedStat = fs.lstatSync(pinned, { bigint: true });
  validatePrivateFile(pinnedStat, MAX_INTENT_BYTES, false, reason);
  if (!sameFileCore(before, pinnedStat)) fail(reason + "_path_not_bound");
  fs.unlinkSync(pinned);
  fs.fsyncSync(directory.fd);
  assertPinnedDirectoryVisible(
    directory,
    reason + "_directory",
  );
}

function openPinnedWitnessForUpdate(directory) {
  assertPinnedDirectoryVisible(
    directory,
    "witness_forced_command_authority_root",
  );
  const visiblePath = path.join(directory.path, WITNESS_NAME);
  const pinnedPath = path.join(directory.proc_path, WITNESS_NAME);
  const before = fs.lstatSync(visiblePath, { bigint: true });
  validatePrivateFile(
    before,
    MAX_WITNESS_BYTES,
    false,
    "witness_forced_command_witness_invalid",
  );
  const fd = fs.openSync(
    pinnedPath,
    fs.constants.O_RDWR | O_NOFOLLOW,
  );
  const opened = fs.fstatSync(fd, { bigint: true });
  validatePrivateFile(
    opened,
    MAX_WITNESS_BYTES,
    false,
    "witness_forced_command_witness_invalid",
  );
  if (
    !sameFileCore(before, opened) ||
    before.size !== opened.size ||
    before.mtimeNs !== opened.mtimeNs ||
    before.ctimeNs !== opened.ctimeNs
  ) {
    fs.closeSync(fd);
    fail("witness_forced_command_witness_path_not_bound");
  }
  return Object.freeze({
    fd,
    visible_path: visiblePath,
    opened,
  });
}

function assertWitnessStillBound(directory, witness) {
  const after = fs.fstatSync(witness.fd, { bigint: true });
  const visible = fs.lstatSync(witness.visible_path, { bigint: true });
  validatePrivateFile(
    after,
    MAX_WITNESS_BYTES,
    false,
    "witness_forced_command_witness_invalid",
  );
  validatePrivateFile(
    visible,
    MAX_WITNESS_BYTES,
    false,
    "witness_forced_command_witness_invalid",
  );
  if (
    !sameFileCore(witness.opened, after) ||
    !sameFileCore(after, visible) ||
    after.size !== visible.size ||
    after.mtimeNs !== visible.mtimeNs ||
    after.ctimeNs !== visible.ctimeNs
  ) {
    fail("witness_forced_command_witness_path_changed");
  }
  assertPinnedDirectoryVisible(
    directory,
    "witness_forced_command_authority_root",
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
      "policy",
    ],
    "witness_forced_command_config_invalid",
  );
  if (
    raw.schema !== CONFIG_SCHEMA ||
    raw.marker !== CONFIG_MARKER ||
    raw.version !== 1 ||
    raw.witness_filename !== WITNESS_NAME
  ) {
    fail("witness_forced_command_config_invalid");
  }

  const authorityRoot = String(raw.authority_root ?? "").trim();
  if (
    !authorityRoot ||
    !path.isAbsolute(authorityRoot) ||
    authorityRoot.includes("\0")
  ) {
    fail("witness_forced_command_config_invalid");
  }

  const policy =
    classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1(
      raw.policy,
    );
  if (policy.ok !== true) {
    fail("witness_forced_command_policy_" + policy.reason);
  }

  return Object.freeze({
    schema: CONFIG_SCHEMA,
    marker: CONFIG_MARKER,
    version: 1,
    authority_root: path.resolve(authorityRoot),
    witness_filename: WITNESS_NAME,
    policy: policy.policy,
    policy_sha256: policy.policy_sha256,
  });
}

function readVoidBuyAllocationCustodyWitnessForcedCommandConfigWithParentOpenerV2(
  configPath,
  openConfigParent,
  validateConfigFile,
) {
  const resolved = path.resolve(String(configPath ?? ""));
  if (
    !path.isAbsolute(resolved) ||
    resolved === path.parse(resolved).root ||
    resolved.includes("\0")
  ) {
    fail("witness_forced_command_config_path_invalid");
  }

  if (typeof openConfigParent !== "function") {
    fail("witness_forced_command_config_parent_opener_invalid");
  }
  if (typeof validateConfigFile !== "function") {
    fail("witness_forced_command_config_file_validator_invalid");
  }

  const parent = openConfigParent(
    path.dirname(resolved),
    "witness_forced_command_config_parent_invalid",
  );

  try {
    const bytes = readPinnedNamedFile(
      parent,
      path.basename(resolved),
      MAX_CONFIG_BYTES,
      false,
      "witness_forced_command_config_file_invalid",
      validateConfigFile,
    );
    if (bytes.at(-1) !== 0x0a) {
      fail("witness_forced_command_config_noncanonical");
    }
    let raw;
    try {
      raw = JSON.parse(bytes.toString("utf8").slice(0, -1));
    } catch {
      fail("witness_forced_command_config_json_invalid");
    }
    const config = parseConfig(raw);
    const externalConfig = Object.freeze({
      schema: config.schema,
      marker: config.marker,
      version: config.version,
      authority_root: config.authority_root,
      witness_filename: config.witness_filename,
      policy: config.policy,
    });
    if (
      canonicalLine(externalConfig) !==
      bytes.toString("utf8")
    ) {
      fail("witness_forced_command_config_noncanonical");
    }
    return externalConfig;
  } finally {
    fs.closeSync(parent.fd);
  }
}


export function readVoidBuyAllocationCustodyWitnessForcedCommandConfigV2(
  configPath,
) {
  return readVoidBuyAllocationCustodyWitnessForcedCommandConfigWithParentOpenerV2(
    configPath,
    openPinnedRootOwnedNonWritableDirectory,
    validateRootOwnedReadOnlyFile,
  );
}

export function testOnlyReadVoidBuyAllocationCustodyWitnessForcedCommandConfigFromPrivateDirectoryV2(
  configPath,
) {
  return readVoidBuyAllocationCustodyWitnessForcedCommandConfigWithParentOpenerV2(
    configPath,
    openPinnedDirectory,
    validatePrivateFile,
  );
}

function parseIntent(bytes) {
  if (
    bytes.length < 3 ||
    bytes.length > MAX_INTENT_BYTES ||
    bytes.at(-1) !== 0x0a
  ) {
    fail("witness_forced_command_intent_invalid");
  }

  let raw;
  try {
    raw = JSON.parse(bytes.toString("utf8").slice(0, -1));
  } catch {
    fail("witness_forced_command_intent_invalid");
  }

  const record = exactObject(
    raw,
    [
      "schema",
      "marker",
      "version",
      "request_id",
      "request_sha256",
      "request_json_base64",
      "policy_sha256",
      "prior_witness_sha256",
      "prior_witness_bytes",
      "prior_event_count",
      "prior_tip_event_sha256",
      "next_line_base64",
      "expected_next_witness_sha256",
      "expected_next_witness_bytes",
      "next_event_count",
      "next_tip_event_sha256",
    ],
    "witness_forced_command_intent_invalid",
  );

  if (
    record.schema !== INTENT_SCHEMA ||
    record.marker !== INTENT_MARKER ||
    record.version !== 1 ||
    typeof record.request_id !== "string" ||
    !/^voidwreq1_[0-9a-f]{64}$/u.test(record.request_id) ||
    typeof record.request_sha256 !== "string" ||
    !/^sha256:[0-9a-f]{64}$/u.test(record.request_sha256) ||
    typeof record.policy_sha256 !== "string" ||
    !/^sha256:[0-9a-f]{64}$/u.test(record.policy_sha256) ||
    typeof record.prior_witness_sha256 !== "string" ||
    !/^sha256:[0-9a-f]{64}$/u.test(record.prior_witness_sha256) ||
    typeof record.prior_tip_event_sha256 !== "string" ||
    !/^sha256:[0-9a-f]{64}$/u.test(record.prior_tip_event_sha256) ||
    typeof record.expected_next_witness_sha256 !== "string" ||
    !/^sha256:[0-9a-f]{64}$/u.test(record.expected_next_witness_sha256) ||
    typeof record.next_tip_event_sha256 !== "string" ||
    !/^sha256:[0-9a-f]{64}$/u.test(record.next_tip_event_sha256) ||
    !Number.isSafeInteger(record.prior_witness_bytes) ||
    record.prior_witness_bytes < 2 ||
    !Number.isSafeInteger(record.expected_next_witness_bytes) ||
    record.expected_next_witness_bytes <= record.prior_witness_bytes ||
    !Number.isSafeInteger(record.prior_event_count) ||
    record.prior_event_count < 1 ||
    !Number.isSafeInteger(record.next_event_count) ||
    record.next_event_count !== record.prior_event_count + 1 ||
    typeof record.request_json_base64 !== "string" ||
    typeof record.next_line_base64 !== "string"
  ) {
    fail("witness_forced_command_intent_invalid");
  }

  const requestBytes = Buffer.from(record.request_json_base64, "base64");
  const nextLine = Buffer.from(record.next_line_base64, "base64");

  if (
    requestBytes.toString("base64") !== record.request_json_base64 ||
    nextLine.toString("base64") !== record.next_line_base64 ||
    sha256Id(requestBytes) !== record.request_sha256 ||
    nextLine.length < 2 ||
    nextLine.at(-1) !== 0x0a ||
    nextLine.subarray(0, -1).includes(0x0a) ||
    record.expected_next_witness_bytes !==
      record.prior_witness_bytes + nextLine.length
  ) {
    fail("witness_forced_command_intent_invalid");
  }

  const normalized = Object.freeze({
    ...record,
    request_json_base64: requestBytes.toString("base64"),
    next_line_base64: nextLine.toString("base64"),
  });

  if (canonicalLine(normalized) !== bytes.toString("utf8")) {
    fail("witness_forced_command_intent_noncanonical");
  }

  return Object.freeze({
    ...normalized,
    request_bytes: requestBytes,
    next_line: nextLine,
  });
}

function buildIntent(config, requestBytes, currentBytes, decision) {
  if (decision.status !== "append_ready") {
    fail("witness_forced_command_append_ready_required");
  }

  const current =
    parseBuyVoidAllocationCustodyExternalWitnessJournalV1(
      currentBytes,
    );
  const nextBytes = Buffer.from(decision.next_witness_jsonl);

  if (
    nextBytes.length <= currentBytes.length ||
    !nextBytes.subarray(0, currentBytes.length).equals(currentBytes)
  ) {
    fail("witness_forced_command_next_witness_not_append_only");
  }

  const line = nextBytes.subarray(currentBytes.length);
  const request = JSON.parse(requestBytes.toString("utf8").slice(0, -1));

  const intent = Object.freeze({
    schema: INTENT_SCHEMA,
    marker: INTENT_MARKER,
    version: 1,
    request_id: decision.request_id,
    request_sha256: sha256Id(requestBytes),
    request_json_base64: requestBytes.toString("base64"),
    policy_sha256: request.policy_sha256,
    prior_witness_sha256: current.witness_sha256,
    prior_witness_bytes: currentBytes.length,
    prior_event_count: current.event_count,
    prior_tip_event_sha256: current.tip.event_sha256,
    next_line_base64: line.toString("base64"),
    expected_next_witness_sha256:
      decision.expected_next_witness_sha256,
    expected_next_witness_bytes: nextBytes.length,
    next_event_count: current.event_count + 1,
    next_tip_event_sha256: decision.next_tip_event_sha256,
  });

  return Object.freeze({
    value: intent,
    bytes: Buffer.from(canonicalLine(intent), "utf8"),
    next_bytes: nextBytes,
    next_line: line,
  });
}

function observeHostFacts() {
  const machineId = fs.readFileSync("/etc/machine-id", "utf8").trim();
  if (!/^[0-9a-f]{32}$/u.test(machineId)) {
    fail("witness_forced_command_machine_id_invalid");
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
      fail("witness_forced_command_host_probe_failed");
    }
    return result.stdout.trim();
  };

  const source = run(
    "/usr/bin/findmnt",
    ["-n", "-o", "SOURCE", "/"],
  );
  if (!source.startsWith("/dev/")) {
    fail("witness_forced_command_root_source_invalid");
  }

  const parentName = run(
    "/usr/bin/lsblk",
    ["-ndo", "PKNAME", source],
  );
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
    fail("witness_forced_command_root_identity_invalid");
  }

  return Object.freeze({
    witness_hostname: os.hostname(),
    witness_machine_id_sha256:
      sha256Id(Buffer.from(machineId, "utf8")),
    witness_root_disk_serial: identity[0],
    witness_root_disk_wwn: identity[1],
  });
}

function parseContinuityAttestation(bytes) {
  if (
    !Buffer.isBuffer(bytes) ||
    bytes.length < 3 ||
    bytes.length > MAX_CONTINUITY_ATTESTATION_BYTES ||
    bytes.at(-1) !== 0x0a ||
    sha256Id(bytes) !== REVIEWED_CONTINUITY_ATTESTATION_SHA256
  ) {
    fail("witness_forced_command_continuity_attestation_invalid");
  }

  let raw;
  try {
    raw = JSON.parse(bytes.toString("utf8").slice(0, -1));
  } catch {
    fail("witness_forced_command_continuity_attestation_invalid");
  }

  const record = exactObject(
    raw,
    [
      "schema",
      "marker",
      "version",
      "continuity_scope",
      "census_receipt_sha256",
      "predecessor_witness_sha256",
      "predecessor_witness_bytes",
      "predecessor_event_count",
      "historical_predecessor_witness_pinned",
      "predecessor_tip_event_sha256",
      "predecessor_machine_id_sha256",
      "successor_machine_id_sha256",
      "stable_hostname",
      "stable_root_disk_serial",
      "stable_root_disk_wwn",
      "stable_ssh_hostkey_algorithm",
      "stable_ssh_hostkey_fingerprint",
      "existing_known_hosts_match",
      "ssh_hostkey_update",
      "v1_witness_retained_exact",
      "v1_witness_history_rewritten",
      "handler_integration_required",
      "current_machine_id_runtime_admission_authorized",
      "production_gate_ready",
      "attestation_id",
    ],
    "witness_forced_command_continuity_attestation_invalid",
  );

  if (
    record.schema !==
      "void_buy_void_allocation_custody_witness_identity_continuity_attestation_v1" ||
    record.marker !==
      "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_IDENTITY_CONTINUITY_ATTESTATION_V1" ||
    record.version !== 1 ||
    record.continuity_scope !== "machine_id_rotation_only" ||
    record.census_receipt_sha256 !== REVIEWED_CENSUS_RECEIPT_SHA256 ||
    record.predecessor_witness_sha256 !==
      HISTORICAL_PREDECESSOR_WITNESS_SHA256 ||
    record.predecessor_witness_bytes !==
      HISTORICAL_PREDECESSOR_WITNESS_BYTES ||
    record.predecessor_event_count !==
      HISTORICAL_PREDECESSOR_EVENT_COUNT ||
    record.historical_predecessor_witness_pinned !== true ||
    record.predecessor_tip_event_sha256 !==
      HISTORICAL_PREDECESSOR_TIP_EVENT_SHA256 ||
    record.predecessor_machine_id_sha256 !==
      HISTORICAL_MACHINE_ID_SHA256 ||
    record.successor_machine_id_sha256 !==
      SUCCESSOR_MACHINE_ID_SHA256 ||
    record.stable_ssh_hostkey_algorithm !== "ssh-ed25519" ||
    record.stable_ssh_hostkey_fingerprint !==
      REVIEWED_HOSTKEY_FINGERPRINT ||
    record.existing_known_hosts_match !== true ||
    record.ssh_hostkey_update !== false ||
    record.v1_witness_retained_exact !== true ||
    record.v1_witness_history_rewritten !== false ||
    record.handler_integration_required !== true ||
    record.current_machine_id_runtime_admission_authorized !== false ||
    record.production_gate_ready !== false ||
    record.attestation_id !== REVIEWED_CONTINUITY_ATTESTATION_ID
  ) {
    fail("witness_forced_command_continuity_attestation_invalid");
  }

  const body = { ...record };
  delete body.attestation_id;
  const derivedId =
    "voidwica1_" +
    crypto
      .createHash("sha256")
      .update(canonicalJson(body))
      .digest("hex");

  if (
    derivedId !== record.attestation_id ||
    canonicalLine(record) !== bytes.toString("utf8")
  ) {
    fail("witness_forced_command_continuity_attestation_invalid");
  }

  return Object.freeze({ ...record });
}

function readContinuityAttestation(directory) {
  const bytes = readOptionalPinnedNamedFile(
    directory,
    CONTINUITY_ATTESTATION_NAME,
    MAX_CONTINUITY_ATTESTATION_BYTES,
    "witness_forced_command_continuity_attestation_invalid",
  );
  if (bytes === null) {
    fail("witness_forced_command_continuity_attestation_missing");
  }
  return parseContinuityAttestation(bytes);
}

function requireHostFactsMatchWitness(
  directory,
  currentBytes,
  observedFacts,
) {
  const parsed =
    parseBuyVoidAllocationCustodyExternalWitnessJournalV1(
      currentBytes,
    );
  const tip = parsed.tip;

  if (
    observedFacts.witness_hostname !== tip.witness_hostname ||
    observedFacts.witness_root_disk_serial !==
      tip.witness_root_disk_serial ||
    observedFacts.witness_root_disk_wwn !==
      tip.witness_root_disk_wwn
  ) {
    fail("witness_forced_command_host_identity_mismatch");
  }

  if (
    observedFacts.witness_machine_id_sha256 ===
      tip.witness_machine_id_sha256
  ) {
    return Object.freeze({
      identity_path: "historical_exact",
      continuity_attestation_consumed: false,
    });
  }

  if (
    tip.witness_machine_id_sha256 !==
      HISTORICAL_MACHINE_ID_SHA256 ||
    observedFacts.witness_machine_id_sha256 !==
      SUCCESSOR_MACHINE_ID_SHA256
  ) {
    fail("witness_forced_command_host_identity_mismatch");
  }

  if (currentBytes.length < HISTORICAL_PREDECESSOR_WITNESS_BYTES) {
    fail("witness_forced_command_historical_predecessor_mismatch");
  }

  const historicalPrefix = currentBytes.subarray(
    0,
    HISTORICAL_PREDECESSOR_WITNESS_BYTES,
  );
  const historical =
    parseBuyVoidAllocationCustodyExternalWitnessJournalV1(
      historicalPrefix,
    );

  if (
    sha256Id(historicalPrefix) !==
      HISTORICAL_PREDECESSOR_WITNESS_SHA256 ||
    historical.event_count !==
      HISTORICAL_PREDECESSOR_EVENT_COUNT ||
    historical.tip.event_sha256 !==
      HISTORICAL_PREDECESSOR_TIP_EVENT_SHA256
  ) {
    fail("witness_forced_command_historical_predecessor_mismatch");
  }

  const attestation = readContinuityAttestation(directory);

  if (
    attestation.stable_hostname !== tip.witness_hostname ||
    attestation.stable_root_disk_serial !==
      tip.witness_root_disk_serial ||
    attestation.stable_root_disk_wwn !==
      tip.witness_root_disk_wwn ||
    attestation.predecessor_machine_id_sha256 !==
      tip.witness_machine_id_sha256 ||
    attestation.successor_machine_id_sha256 !==
      observedFacts.witness_machine_id_sha256
  ) {
    fail("witness_forced_command_continuity_attestation_mismatch");
  }

  return Object.freeze({
    identity_path: "reviewed_machine_id_continuity",
    continuity_attestation_consumed: true,
    attestation_id: attestation.attestation_id,
  });
}

function readWitnessBytes(directory) {
  return readPinnedNamedFile(
    directory,
    WITNESS_NAME,
    MAX_WITNESS_BYTES,
    false,
    "witness_forced_command_witness_invalid",
  );
}

function appendDeltaWithHooks(
  directory,
  priorBytes,
  nextBytes,
  hooks,
) {
  const witness = openPinnedWitnessForUpdate(directory);
  try {
    const openedBytes = readExactFd(
      witness.fd,
      Number(witness.opened.size),
      MAX_WITNESS_BYTES,
      false,
      "witness_forced_command_witness_invalid",
    );

    if (!openedBytes.equals(priorBytes)) {
      fail("witness_forced_command_witness_changed_before_append");
    }

    const delta = nextBytes.subarray(priorBytes.length);
    if (delta.length < 2) {
      fail("witness_forced_command_append_delta_invalid");
    }

    if (hooks?.interrupt_after_partial_append === true) {
      const partial = Math.max(1, Math.floor(delta.length / 2));
      writeAll(
        witness.fd,
        delta.subarray(0, partial),
        priorBytes.length,
      );
      fs.fsyncSync(witness.fd);
      assertWitnessStillBound(directory, witness);
      throw new Error("witness_forced_command_test_interrupt_after_partial_append");
    }

    writeAll(
      witness.fd,
      delta,
      priorBytes.length,
    );
    fs.fsyncSync(witness.fd);
    assertWitnessStillBound(directory, witness);

    if (hooks?.interrupt_after_full_append === true) {
      throw new Error("witness_forced_command_test_interrupt_after_full_append");
    }
  } finally {
    fs.closeSync(witness.fd);
  }
}

function recoverIntentUnderLock(
  directory,
  config,
  hostFacts,
  expectedRequestBytes,
) {
  const intentBytes = readOptionalPinnedNamedFile(
    directory,
    INTENT_NAME,
    MAX_INTENT_BYTES,
    "witness_forced_command_intent_invalid",
  );

  if (intentBytes === null) {
    return Object.freeze({
      recovered: false,
      request_id: null,
      operation_performed: false,
    });
  }

  const intent = parseIntent(intentBytes);

  if (
    !Buffer.isBuffer(expectedRequestBytes) ||
    !intent.request_bytes.equals(expectedRequestBytes)
  ) {
    fail("witness_forced_command_pending_intent_request_mismatch");
  }

  if (intent.policy_sha256 !== config.policy_sha256) {
    fail("witness_forced_command_intent_policy_mismatch");
  }

  let currentBytes = readWitnessBytes(directory);

  const validCurrent = (() => {
    try {
      return parseBuyVoidAllocationCustodyExternalWitnessJournalV1(
        currentBytes,
      );
    } catch {
      return null;
    }
  })();

  if (
    validCurrent &&
    validCurrent.witness_sha256 ===
      intent.expected_next_witness_sha256 &&
    currentBytes.length ===
      intent.expected_next_witness_bytes &&
    validCurrent.event_count === intent.next_event_count &&
    validCurrent.tip.event_sha256 === intent.next_tip_event_sha256
  ) {
    requireHostFactsMatchWitness(directory, currentBytes, hostFacts);
    unlinkPinnedNamedFile(
      directory,
      INTENT_NAME,
      "witness_forced_command_intent_invalid",
    );
    return Object.freeze({
      recovered: true,
      request_id: intent.request_id,
      operation_performed: false,
    });
  }

  let priorBytes;
  if (
    validCurrent &&
    validCurrent.witness_sha256 === intent.prior_witness_sha256 &&
    currentBytes.length === intent.prior_witness_bytes &&
    validCurrent.event_count === intent.prior_event_count &&
    validCurrent.tip.event_sha256 === intent.prior_tip_event_sha256
  ) {
    requireHostFactsMatchWitness(directory, currentBytes, hostFacts);
    priorBytes = currentBytes;
  } else {
    if (
      currentBytes.length <= intent.prior_witness_bytes ||
      currentBytes.length >= intent.expected_next_witness_bytes
    ) {
      fail("witness_forced_command_intent_recovery_conflict");
    }

    priorBytes = currentBytes.subarray(
      0,
      intent.prior_witness_bytes,
    );
    const prior =
      parseBuyVoidAllocationCustodyExternalWitnessJournalV1(
        priorBytes,
      );

    if (
      prior.witness_sha256 !== intent.prior_witness_sha256 ||
      prior.event_count !== intent.prior_event_count ||
      prior.tip.event_sha256 !== intent.prior_tip_event_sha256
    ) {
      fail("witness_forced_command_intent_recovery_conflict");
    }

    requireHostFactsMatchWitness(directory, priorBytes, hostFacts);

    const tail = currentBytes.subarray(intent.prior_witness_bytes);
    if (
      tail.length < 1 ||
      tail.length >= intent.next_line.length ||
      !intent.next_line.subarray(0, tail.length).equals(tail)
    ) {
      fail("witness_forced_command_intent_recovery_conflict");
    }

    const witness = openPinnedWitnessForUpdate(directory);
    try {
      fs.ftruncateSync(witness.fd, intent.prior_witness_bytes);
      fs.fsyncSync(witness.fd);
      assertWitnessStillBound(directory, witness);
    } finally {
      fs.closeSync(witness.fd);
    }
  }

  const nextBytes = Buffer.concat([
    priorBytes,
    intent.next_line,
  ]);

  if (
    nextBytes.length !== intent.expected_next_witness_bytes ||
    sha256Id(nextBytes) !== intent.expected_next_witness_sha256
  ) {
    fail("witness_forced_command_intent_next_mismatch");
  }

  appendDeltaWithHooks(
    directory,
    priorBytes,
    nextBytes,
    null,
  );

  currentBytes = readWitnessBytes(directory);
  const finalParsed =
    parseBuyVoidAllocationCustodyExternalWitnessJournalV1(
      currentBytes,
    );

  if (
    currentBytes.length !== intent.expected_next_witness_bytes ||
    finalParsed.witness_sha256 !== intent.expected_next_witness_sha256 ||
    finalParsed.event_count !== intent.next_event_count ||
    finalParsed.tip.event_sha256 !== intent.next_tip_event_sha256
  ) {
    fail("witness_forced_command_intent_recovery_postcheck_failed");
  }

  requireHostFactsMatchWitness(directory, currentBytes, hostFacts);

  const classified =
    classifyBuyVoidAllocationCustodyWitnessTransportServerRequestV1({
      policy: config.policy,
      request_json: intent.request_bytes,
      current_witness_jsonl: currentBytes,
    });

  if (
    classified.ok !== true ||
    classified.status !== "idempotent"
  ) {
    fail("witness_forced_command_intent_recovery_classifier_mismatch");
  }

  unlinkPinnedNamedFile(
    directory,
    INTENT_NAME,
    "witness_forced_command_intent_invalid",
  );

  return Object.freeze({
    recovered: true,
    request_id: intent.request_id,
    operation_performed: true,
  });
}

function requestOperationBeforeRecovery(
  config,
  requestBytes,
) {
  const classified =
    classifyBuyVoidAllocationCustodyWitnessTransportRequestEnvelopeV1({
      policy: config.policy,
      request_json: requestBytes,
    });
  if (classified.ok !== true) {
    return "unknown";
  }
  return classified.operation;
}

function handleUnderLock(
  directory,
  config,
  requestBytes,
  dependencies,
) {
  const readHostFacts =
    dependencies?.read_host_facts_impl || observeHostFacts;
  if (typeof readHostFacts !== "function") {
    fail("witness_forced_command_host_probe_invalid");
  }

  const hostFacts = readHostFacts();
  const requestOperation =
    requestOperationBeforeRecovery(config, requestBytes);

  let recovered = Object.freeze({
    recovered: false,
    request_id: null,
    operation_performed: false,
  });

  if (requestOperation === "append") {
    recovered =
      recoverIntentUnderLock(
        directory,
        config,
        hostFacts,
        requestBytes,
      );
  } else {
    const pendingIntent = readOptionalPinnedNamedFile(
      directory,
      INTENT_NAME,
      MAX_INTENT_BYTES,
      "witness_forced_command_intent_invalid",
    );
    if (pendingIntent !== null) {
      fail("witness_forced_command_nonappend_blocked_by_pending_intent");
    }
  }

  const currentBytes =
    readWitnessBytes(directory);

  requireHostFactsMatchWitness(directory,
    currentBytes,
    hostFacts,
  );

  const decision =
    classifyBuyVoidAllocationCustodyWitnessTransportServerRequestV1({
      policy: config.policy,
      request_json: requestBytes,
      current_witness_jsonl: currentBytes,
    });

  if (decision.ok !== true) {
    fail("witness_forced_command_transport_" + decision.reason);
  }

  if (decision.operation === "read") {
    return Object.freeze({
      response_json: decision.response_json,
      operation_performed: recovered.operation_performed,
      recovered_intent: recovered.recovered,
    });
  }

  if (decision.status === "idempotent") {
    const response =
      buildBuyVoidAllocationCustodyWitnessTransportAppendResponseV1({
        policy: config.policy,
        request_json: requestBytes,
        observed_witness_jsonl: currentBytes,
        operation_performed:
          recovered.request_id === decision.request_id &&
          recovered.operation_performed === true,
      });

    if (response.ok !== true) {
      fail(
        "witness_forced_command_response_" + response.reason,
      );
    }

    return Object.freeze({
      response_json: response.response_json,
      operation_performed:
        recovered.operation_performed,
      recovered_intent: recovered.recovered,
    });
  }

  if (decision.status !== "append_ready") {
    fail("witness_forced_command_append_state_invalid");
  }

  const intent = buildIntent(
    config,
    requestBytes,
    currentBytes,
    decision,
  );

  createPinnedNamedFile(
    directory,
    INTENT_NAME,
    intent.bytes,
    MAX_INTENT_BYTES,
    "witness_forced_command_intent_invalid",
  );

  if (dependencies?.hooks?.interrupt_after_intent === true) {
    throw new Error(
      "witness_forced_command_test_interrupt_after_intent",
    );
  }

  appendDeltaWithHooks(
    directory,
    currentBytes,
    intent.next_bytes,
    dependencies?.hooks,
  );

  const observedBytes =
    readWitnessBytes(directory);

  const observed =
    parseBuyVoidAllocationCustodyExternalWitnessJournalV1(
      observedBytes,
    );

  if (
    observed.witness_sha256 !==
      intent.value.expected_next_witness_sha256 ||
    observedBytes.length !==
      intent.value.expected_next_witness_bytes ||
    observed.event_count !== intent.value.next_event_count ||
    observed.tip.event_sha256 !==
      intent.value.next_tip_event_sha256
  ) {
    fail("witness_forced_command_append_postcheck_failed");
  }

  requireHostFactsMatchWitness(directory,
    observedBytes,
    hostFacts,
  );

  const response =
    buildBuyVoidAllocationCustodyWitnessTransportAppendResponseV1({
      policy: config.policy,
      request_json: requestBytes,
      observed_witness_jsonl: observedBytes,
      operation_performed: true,
    });

  if (response.ok !== true) {
    fail("witness_forced_command_response_" + response.reason);
  }

  unlinkPinnedNamedFile(
    directory,
    INTENT_NAME,
    "witness_forced_command_intent_invalid",
  );

  return Object.freeze({
    response_json: response.response_json,
    operation_performed: true,
    recovered_intent: false,
  });
}

export function handleVoidBuyAllocationCustodyWitnessForcedCommandRequestV2(
  rawConfig,
  requestInput,
  dependencies = {},
) {
  const config = parseConfig(rawConfig);
  const requestBytes = Buffer.isBuffer(requestInput)
    ? Buffer.from(requestInput)
    : Buffer.from(String(requestInput ?? ""), "utf8");

  if (
    requestBytes.length < 3 ||
    requestBytes.length > MAX_REQUEST_BYTES ||
    requestBytes.at(-1) !== 0x0a
  ) {
    fail("witness_forced_command_request_invalid");
  }

  const directory = openPinnedDirectory(
    config.authority_root,
    "witness_forced_command_authority_root_invalid",
  );

  try {
    return withBuyVoidFilesystemBakeryLockV1(
      path.join(
        directory.proc_path,
        LOCK_NAME,
      ),
      () =>
        handleUnderLock(
          directory,
          config,
          requestBytes,
          dependencies,
        ),
    );
  } finally {
    fs.closeSync(directory.fd);
  }
}

async function readOneRequestLine() {
  const chunks = [];
  let total = 0;

  for await (const chunk of process.stdin) {
    const bytes = Buffer.from(chunk);
    total += bytes.length;
    if (total > MAX_REQUEST_BYTES) {
      fail("witness_forced_command_request_too_large");
    }
    chunks.push(bytes);
  }

  const bytes = Buffer.concat(chunks);

  if (
    bytes.length < 3 ||
    bytes.at(-1) !== 0x0a ||
    bytes.subarray(0, -1).includes(0x0a)
  ) {
    fail("witness_forced_command_request_framing_invalid");
  }

  return bytes;
}

function parseCli(argv) {
  if (
    argv.length !== 1 ||
    !argv[0].startsWith("--config=")
  ) {
    fail("witness_forced_command_cli_invalid");
  }

  const configPath =
    argv[0].slice("--config=".length);

  if (
    !configPath ||
    !path.isAbsolute(configPath) ||
    configPath.includes("\0")
  ) {
    fail("witness_forced_command_cli_invalid");
  }

  return Object.freeze({
    config_path: path.resolve(configPath),
  });
}

async function main() {
  if (
    process.env.VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V2 !== "1"
  ) {
    fail("witness_forced_command_marker_required");
  }

  if (String(process.env.SSH_ORIGINAL_COMMAND ?? "") !== "") {
    fail("witness_forced_command_original_command_forbidden");
  }

  const cli = parseCli(process.argv.slice(2));
  const config =
    readVoidBuyAllocationCustodyWitnessForcedCommandConfigV2(
      cli.config_path,
    );
  const request =
    await readOneRequestLine();

  const result =
    handleVoidBuyAllocationCustodyWitnessForcedCommandRequestV2(
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
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_V2 +
        "_HOLD " +
        String(error?.message || error) +
        "\n",
    );
    process.exitCode = 3;
  });
}
