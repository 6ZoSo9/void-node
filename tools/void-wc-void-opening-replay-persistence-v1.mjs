#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  deriveWcVoidOpeningReplayTransitionV1,
  initialWcVoidOpeningReplayStateV1,
} from "./void-wc-void-opening-replay-protection-v1.mjs";

export const VOID_WC_VOID_OPENING_REPLAY_PERSISTENCE_V1 =
  "VOID_WC_VOID_OPENING_REPLAY_PERSISTENCE_V1";
export const VOID_WC_VOID_OPENING_REPLAY_TERMINAL_CAPSULE_V1 =
  "VOID_WC_VOID_OPENING_REPLAY_TERMINAL_CAPSULE_V1";
export const VOID_WC_VOID_OPENING_REPLAY_PERSISTENCE_CONFIRMATION_V1 =
  "persistWcVoidOpeningReplayTerminalState";

export const VOID_WC_VOID_OPENING_REPLAY_PERSISTENCE_AUTHORITY_V1 =
  Object.freeze({
    explicit_confirmation_required: true,
    bounded_filesystem_read: true,
    bounded_filesystem_write: true,
    terminal_replay_state_persistence: true,
    credential_access: false,
    wallet_or_signer_access: false,
    rpc_call: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    wc_ledger_write: false,
    wc_balance_mutation: false,
    token_transfer: false,
    refund_write: false,
    inventory_funding: false,
    liquidity_movement: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

export const VOID_WC_VOID_OPENING_REPLAY_INSPECTION_AUTHORITY_V1 =
  Object.freeze({
    bounded_filesystem_read: true,
    filesystem_write: false,
    credential_access: false,
    wallet_or_signer_access: false,
    rpc_call: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    wc_ledger_write: false,
    wc_balance_mutation: false,
    token_transfer: false,
    refund_write: false,
    replay_state_persistence: false,
    inventory_funding: false,
    liquidity_movement: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const INPUT_KEYS = Object.freeze([
  "data_dir",
  "recorded_at_utc",
  "confirmation",
  "before_state",
  "coupled_launch_id",
  "commitments",
  "ledger_debits",
  "mode",
  "dispositions",
]);
const INSPECTION_INPUT_KEYS = Object.freeze([
  "data_dir",
  "before_state",
  "coupled_launch_id",
  "commitments",
  "ledger_debits",
  "mode",
  "dispositions",
]);
const STORE_DIRECTORY = "opening-replay-terminal-v1";
const MAX_TERMINAL_FILES = 10000;
const MAX_CAPSULE_BYTES = 16 * 1024 * 1024;

function fail(code) {
  throw new Error(code);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactObject(value, keys, code) {
  if (!plain(value)) fail(code);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Reflect.ownKeys(descriptors);
  if (actual.some((key) => typeof key !== "string")) fail(code);
  const sorted = actual.sort(compareText);
  const expected = [...keys].sort(compareText);
  if (
    sorted.length !== expected.length ||
    sorted.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  const out = Object.create(null);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(code);
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
    const keys = Object.keys(value).sort(compareText);
    return "{" + keys.map((key) =>
      JSON.stringify(key) + ":" + canonicalJson(value[key])
    ).join(",") + "}";
  }
  fail("INVALID_CANONICAL_VALUE");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function compactJsonBytes(value) {
  return Buffer.from(canonicalJson(value) + "\n", "utf8");
}

function canonicalSha(value, code) {
  if (typeof value !== "string" || !SHA256.test(value)) fail(code);
  return value;
}

function canonicalDataDir(value) {
  if (
    typeof value !== "string" ||
    !value ||
    value.includes("\0") ||
    !path.isAbsolute(value)
  ) {
    fail("INVALID_WC_VOID_OPENING_REPLAY_PERSISTENCE_DATA_DIR");
  }
  const normalized = path.normalize(value);
  if (normalized === path.parse(normalized).root) {
    fail("INVALID_WC_VOID_OPENING_REPLAY_PERSISTENCE_DATA_DIR");
  }
  return normalized;
}

function canonicalRecordedAtUtc(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(value)
  ) {
    fail("INVALID_WC_VOID_OPENING_REPLAY_PERSISTENCE_RECORDED_AT");
  }
  const milliseconds = Date.parse(value);
  if (
    !Number.isFinite(milliseconds) ||
    new Date(milliseconds).toISOString() !== value.replace("Z", ".000Z")
  ) {
    fail("INVALID_WC_VOID_OPENING_REPLAY_PERSISTENCE_RECORDED_AT");
  }
  return value;
}

function directPrivateDirectory(candidate, code) {
  let stat;
  try {
    stat = fs.lstatSync(candidate, { bigint: true });
  } catch {
    fail(code);
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail(code);
  let real;
  try {
    real = fs.realpathSync(candidate);
  } catch {
    fail(code);
  }
  if (real !== candidate) fail(code);
  if (
    typeof process.getuid === "function" &&
    stat.uid !== BigInt(process.getuid())
  ) {
    fail(code);
  }
  if ((Number(stat.mode) & 0o022) !== 0) fail(code);
  return stat;
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

function directPrivateFile(candidate, code) {
  let stat;
  try {
    stat = fs.lstatSync(candidate, { bigint: true });
  } catch {
    fail(code);
  }
  if (!stat.isFile() || stat.isSymbolicLink()) fail(code);
  let real;
  try {
    real = fs.realpathSync(candidate);
  } catch {
    fail(code);
  }
  if (real !== candidate) fail(code);
  if (
    typeof process.getuid === "function" &&
    stat.uid !== BigInt(process.getuid())
  ) {
    fail(code);
  }
  if ((Number(stat.mode) & 0o777) !== 0o600) fail(code);
  if (stat.size <= 0n || stat.size > BigInt(MAX_CAPSULE_BYTES)) fail(code);
  return stat;
}

function sameFile(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

function noFollowFlag() {
  return typeof fs.constants.O_NOFOLLOW === "number"
    ? fs.constants.O_NOFOLLOW
    : 0;
}

function fsyncDirectory(directory) {
  const flags =
    fs.constants.O_RDONLY |
    (typeof fs.constants.O_DIRECTORY === "number"
      ? fs.constants.O_DIRECTORY
      : 0);
  const fd = fs.openSync(directory, flags);
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function ensurePrivateDirectory(directory, parent, code) {
  if (!fs.existsSync(directory)) {
    try {
      fs.mkdirSync(directory, { mode: 0o700 });
      fsyncDirectory(parent);
    } catch (error) {
      if (!fs.existsSync(directory)) throw error;
    }
  }
  return directPrivateDirectory(directory, code);
}

function writeExclusiveFile(file, bytes) {
  const fd = fs.openSync(
    file,
    fs.constants.O_CREAT |
      fs.constants.O_EXCL |
      fs.constants.O_WRONLY |
      noFollowFlag(),
    0o600,
  );
  try {
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  return directPrivateFile(
    file,
    "WC_VOID_OPENING_REPLAY_PERSISTENCE_PENDING_FILE_INVALID",
  );
}

function readStablePrivateFile(file) {
  const lstat = directPrivateFile(
    file,
    "WC_VOID_OPENING_REPLAY_TERMINAL_FILE_INVALID",
  );
  const fd = fs.openSync(file, fs.constants.O_RDONLY | noFollowFlag());
  try {
    const before = fs.fstatSync(fd, { bigint: true });
    if (!sameFile(lstat, before)) {
      fail("WC_VOID_OPENING_REPLAY_TERMINAL_CHANGED_BEFORE_READ");
    }
    const size = Number(before.size);
    if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_CAPSULE_BYTES) {
      fail("WC_VOID_OPENING_REPLAY_TERMINAL_FILE_SIZE_INVALID");
    }
    const bytes = Buffer.allocUnsafe(size);
    let offset = 0;
    while (offset < size) {
      const read = fs.readSync(fd, bytes, offset, size - offset, offset);
      if (read <= 0) fail("WC_VOID_OPENING_REPLAY_TERMINAL_SHORT_READ");
      offset += read;
    }
    const after = fs.fstatSync(fd, { bigint: true });
    if (!sameFile(before, after)) {
      fail("WC_VOID_OPENING_REPLAY_TERMINAL_CHANGED_DURING_READ");
    }
    return Object.freeze({ bytes, stat: before });
  } finally {
    fs.closeSync(fd);
  }
}

function capsuleFor(transition, mode) {
  const body = Object.freeze({
    marker: VOID_WC_VOID_OPENING_REPLAY_TERMINAL_CAPSULE_V1,
    version: 1,
    coupled_launch_id: transition.coupled_launch_id,
    mode,
    transition_id: transition.transition_id,
    binding_id: transition.binding_id,
    before_state_id: transition.before_state_id,
    after_state_id: transition.after_state_id,
    after_revision: transition.after_revision,
    terminal_state: transition.next_state,
  });
  return Object.freeze({
    ...body,
    capsule_id: "voidwcrp1_" + sha256(canonicalJson(body)),
  });
}

function relativeTerminalPath(launchId) {
  return (
    "wc_v1/" +
    STORE_DIRECTORY +
    "/" +
    launchId.slice("sha256:".length) +
    ".json"
  );
}

export function persistWcVoidOpeningReplayTerminalV1(input) {
  const request = exactObject(
    input,
    INPUT_KEYS,
    "INVALID_WC_VOID_OPENING_REPLAY_PERSISTENCE_INPUT_SHAPE",
  );

  if (
    request.confirmation !==
    VOID_WC_VOID_OPENING_REPLAY_PERSISTENCE_CONFIRMATION_V1
  ) {
    fail("WC_VOID_OPENING_REPLAY_PERSISTENCE_CONFIRMATION_REQUIRED");
  }

  const recordedAtUtc = canonicalRecordedAtUtc(request.recorded_at_utc);
  const launchId = canonicalSha(
    request.coupled_launch_id,
    "INVALID_WC_VOID_OPENING_REPLAY_PERSISTENCE_LAUNCH_ID",
  );
  const expectedInitial = initialWcVoidOpeningReplayStateV1(launchId);
  if (canonicalJson(request.before_state) !== canonicalJson(expectedInitial)) {
    fail("WC_VOID_OPENING_REPLAY_PERSISTENCE_INITIAL_STATE_REQUIRED");
  }

  const transition = deriveWcVoidOpeningReplayTransitionV1({
    before_state: request.before_state,
    coupled_launch_id: launchId,
    commitments: request.commitments,
    ledger_debits: request.ledger_debits,
    mode: request.mode,
    dispositions: request.dispositions,
  });
  if (
    transition.duplicate_replay_protection_source_ready !== true ||
    transition.duplicate_replay_protection_proven !== false ||
    transition.durable_replay_state_persistence_verified !== false ||
    transition.after_revision !== 1
  ) {
    fail("WC_VOID_OPENING_REPLAY_TRANSITION_NOT_TERMINAL_SOURCE_READY");
  }

  const capsule = capsuleFor(transition, request.mode);
  const expectedBytes = compactJsonBytes(capsule);
  if (expectedBytes.length > MAX_CAPSULE_BYTES) {
    fail("WC_VOID_OPENING_REPLAY_TERMINAL_CAPSULE_TOO_LARGE");
  }

  const dataDir = canonicalDataDir(request.data_dir);
  const dataStat = directPrivateDirectory(
    dataDir,
    "WC_VOID_OPENING_REPLAY_PERSISTENCE_DATA_DIR_CUSTODY_INVALID",
  );
  const wcDir = path.join(dataDir, "wc_v1");
  const wcStat = directPrivateDirectory(
    wcDir,
    "WC_VOID_OPENING_REPLAY_PERSISTENCE_WC_DIR_CUSTODY_INVALID",
  );
  const storeDir = path.join(wcDir, STORE_DIRECTORY);
  const storeStat = ensurePrivateDirectory(
    storeDir,
    wcDir,
    "WC_VOID_OPENING_REPLAY_PERSISTENCE_STORE_DIR_CUSTODY_INVALID",
  );

  const entries = fs.readdirSync(storeDir);
  if (entries.length > MAX_TERMINAL_FILES) {
    fail("WC_VOID_OPENING_REPLAY_PERSISTENCE_TERMINAL_COUNT_EXCEEDED");
  }
  for (const name of entries) {
    if (name.startsWith(".pending-")) {
      fail("WC_VOID_OPENING_REPLAY_PERSISTENCE_PENDING_ARTIFACT_REQUIRES_REVIEW");
    }
    if (!/^[0-9a-f]{64}\.json$/u.test(name)) {
      fail("WC_VOID_OPENING_REPLAY_PERSISTENCE_UNEXPECTED_STORE_ENTRY");
    }
    directPrivateFile(
      path.join(storeDir, name),
      "WC_VOID_OPENING_REPLAY_PERSISTENCE_EXISTING_TERMINAL_INVALID",
    );
  }

  const terminal = path.join(
    storeDir,
    launchId.slice("sha256:".length) + ".json",
  );
  if (
    entries.length >= MAX_TERMINAL_FILES &&
    !fs.existsSync(terminal)
  ) {
    fail("WC_VOID_OPENING_REPLAY_PERSISTENCE_TERMINAL_COUNT_EXCEEDED");
  }
  const pending = path.join(
    storeDir,
    ".pending-" +
      launchId.slice("sha256:".length) +
      "-" +
      String(process.pid) +
      ".json",
  );
  if (fs.existsSync(pending)) {
    fail("WC_VOID_OPENING_REPLAY_PERSISTENCE_PENDING_PATH_BUSY");
  }

  writeExclusiveFile(pending, expectedBytes);
  let linked = false;
  let status = "committed";
  try {
    try {
      fs.linkSync(pending, terminal);
      linked = true;
      fsyncDirectory(storeDir);
    } catch (error) {
      if (!error || error.code !== "EEXIST") throw error;
      const existing = readStablePrivateFile(terminal);
      if (!existing.bytes.equals(expectedBytes)) {
        fail("WC_VOID_OPENING_REPLAY_TERMINAL_ALREADY_COMMITTED");
      }
      status = "duplicate";
    }
  } finally {
    if (fs.existsSync(pending)) {
      const pendingStat = directPrivateFile(
        pending,
        "WC_VOID_OPENING_REPLAY_PERSISTENCE_PENDING_FILE_INVALID",
      );
      if (linked) {
        const terminalStat = directPrivateFile(
          terminal,
          "WC_VOID_OPENING_REPLAY_TERMINAL_FILE_INVALID",
        );
        if (
          pendingStat.dev !== terminalStat.dev ||
          pendingStat.ino !== terminalStat.ino
        ) {
          fail("WC_VOID_OPENING_REPLAY_PERSISTENCE_LINK_IDENTITY_MISMATCH");
        }
      }
      fs.unlinkSync(pending);
      fsyncDirectory(storeDir);
    }
  }

  const persisted = readStablePrivateFile(terminal);
  if (!persisted.bytes.equals(expectedBytes)) {
    fail("WC_VOID_OPENING_REPLAY_TERMINAL_CONTENT_MISMATCH");
  }

  const finalDataStat = directPrivateDirectory(
    dataDir,
    "WC_VOID_OPENING_REPLAY_PERSISTENCE_DATA_DIR_CHANGED",
  );
  const finalWcStat = directPrivateDirectory(
    wcDir,
    "WC_VOID_OPENING_REPLAY_PERSISTENCE_WC_DIR_CHANGED",
  );
  const finalStoreStat = directPrivateDirectory(
    storeDir,
    "WC_VOID_OPENING_REPLAY_PERSISTENCE_STORE_DIR_CHANGED",
  );
  if (
    !sameDirectory(dataStat, finalDataStat) ||
    !sameDirectory(wcStat, finalWcStat) ||
    !sameDirectory(storeStat, finalStoreStat)
  ) {
    fail("WC_VOID_OPENING_REPLAY_PERSISTENCE_CUSTODY_CHANGED");
  }

  return Object.freeze({
    ok: true,
    status,
    marker: VOID_WC_VOID_OPENING_REPLAY_PERSISTENCE_V1,
    version: 1,
    coupled_launch_id: launchId,
    mode: request.mode,
    recorded_at_utc: recordedAtUtc,
    capsule_id: capsule.capsule_id,
    transition_id: transition.transition_id,
    binding_id: transition.binding_id,
    before_state_id: transition.before_state_id,
    after_state_id: transition.after_state_id,
    terminal_path: relativeTerminalPath(launchId),
    terminal_capsule_sha256: sha256(persisted.bytes),
    terminal_replay_state_persisted: true,
    exact_duplicate: status === "duplicate",
    create_once_terminal_file: true,
    atomic_complete_file_publication: true,
    stable_private_custody_verified: true,
    duplicate_replay_protection_persistence_mechanism_ready: true,
    production_duplicate_replay_gate_updated: false,
    market_activation_authority: false,
    public_presale_activation_authority: false,
    funds_movement_authority: false,
    authority:
      VOID_WC_VOID_OPENING_REPLAY_PERSISTENCE_AUTHORITY_V1,
  });
}

export function inspectWcVoidOpeningReplayTerminalV1(input) {
  const request = exactObject(
    input,
    INSPECTION_INPUT_KEYS,
    "INVALID_WC_VOID_OPENING_REPLAY_INSPECTION_INPUT_SHAPE",
  );
  const launchId = canonicalSha(
    request.coupled_launch_id,
    "INVALID_WC_VOID_OPENING_REPLAY_INSPECTION_LAUNCH_ID",
  );
  const expectedInitial = initialWcVoidOpeningReplayStateV1(launchId);
  if (canonicalJson(request.before_state) !== canonicalJson(expectedInitial)) {
    fail("WC_VOID_OPENING_REPLAY_INSPECTION_INITIAL_STATE_REQUIRED");
  }

  const transition = deriveWcVoidOpeningReplayTransitionV1({
    before_state: request.before_state,
    coupled_launch_id: launchId,
    commitments: request.commitments,
    ledger_debits: request.ledger_debits,
    mode: request.mode,
    dispositions: request.dispositions,
  });
  if (
    transition.duplicate_replay_protection_source_ready !== true ||
    transition.after_revision !== 1
  ) {
    fail("WC_VOID_OPENING_REPLAY_INSPECTION_TRANSITION_INVALID");
  }

  const capsule = capsuleFor(transition, request.mode);
  const expectedBytes = compactJsonBytes(capsule);
  const dataDir = canonicalDataDir(request.data_dir);
  const dataStat = directPrivateDirectory(
    dataDir,
    "WC_VOID_OPENING_REPLAY_INSPECTION_DATA_DIR_CUSTODY_INVALID",
  );
  const wcDir = path.join(dataDir, "wc_v1");
  const wcStat = directPrivateDirectory(
    wcDir,
    "WC_VOID_OPENING_REPLAY_INSPECTION_WC_DIR_CUSTODY_INVALID",
  );
  const storeDir = path.join(wcDir, STORE_DIRECTORY);
  const storeStat = directPrivateDirectory(
    storeDir,
    "WC_VOID_OPENING_REPLAY_INSPECTION_STORE_DIR_CUSTODY_INVALID",
  );

  const entries = fs.readdirSync(storeDir);
  if (entries.length > MAX_TERMINAL_FILES) {
    fail("WC_VOID_OPENING_REPLAY_INSPECTION_TERMINAL_COUNT_EXCEEDED");
  }
  for (const name of entries) {
    if (name.startsWith(".pending-")) {
      fail("WC_VOID_OPENING_REPLAY_INSPECTION_PENDING_ARTIFACT_REQUIRES_REVIEW");
    }
    if (!/^[0-9a-f]{64}\.json$/u.test(name)) {
      fail("WC_VOID_OPENING_REPLAY_INSPECTION_UNEXPECTED_STORE_ENTRY");
    }
    directPrivateFile(
      path.join(storeDir, name),
      "WC_VOID_OPENING_REPLAY_INSPECTION_EXISTING_TERMINAL_INVALID",
    );
  }

  const terminal = path.join(
    storeDir,
    launchId.slice("sha256:".length) + ".json",
  );
  const persisted = readStablePrivateFile(terminal);
  if (!persisted.bytes.equals(expectedBytes)) {
    fail("WC_VOID_OPENING_REPLAY_INSPECTION_TERMINAL_CONTENT_MISMATCH");
  }

  const finalDataStat = directPrivateDirectory(
    dataDir,
    "WC_VOID_OPENING_REPLAY_INSPECTION_DATA_DIR_CHANGED",
  );
  const finalWcStat = directPrivateDirectory(
    wcDir,
    "WC_VOID_OPENING_REPLAY_INSPECTION_WC_DIR_CHANGED",
  );
  const finalStoreStat = directPrivateDirectory(
    storeDir,
    "WC_VOID_OPENING_REPLAY_INSPECTION_STORE_DIR_CHANGED",
  );
  if (
    !sameDirectory(dataStat, finalDataStat) ||
    !sameDirectory(wcStat, finalWcStat) ||
    !sameDirectory(storeStat, finalStoreStat)
  ) {
    fail("WC_VOID_OPENING_REPLAY_INSPECTION_CUSTODY_CHANGED");
  }

  return Object.freeze({
    ok: true,
    status: "verified",
    marker: VOID_WC_VOID_OPENING_REPLAY_PERSISTENCE_V1,
    version: 1,
    coupled_launch_id: launchId,
    mode: request.mode,
    capsule_id: capsule.capsule_id,
    transition_id: transition.transition_id,
    binding_id: transition.binding_id,
    before_state_id: transition.before_state_id,
    after_state_id: transition.after_state_id,
    terminal_path: relativeTerminalPath(launchId),
    terminal_capsule_sha256: sha256(persisted.bytes),
    terminal_replay_state_persisted: true,
    durable_replay_state_persistence_verified: true,
    duplicate_replay_protection_verified_for_launch: true,
    production_duplicate_replay_gate_updated: false,
    market_activation_authority: false,
    public_presale_activation_authority: false,
    funds_movement_authority: false,
    authority:
      VOID_WC_VOID_OPENING_REPLAY_INSPECTION_AUTHORITY_V1,
  });
}
