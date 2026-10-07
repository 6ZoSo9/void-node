#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_SOURCE_GENERATION_ID_V1,
  classifyCoupledNativeGasReconciliationCustodyReceiptContinuityV1,
  planCoupledNativeGasReconciliationCustodyReceiptV1,
} from "./void-coupled-native-gas-reconciliation-custody-receipt-continuity-v1.mjs";

export const VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_WRITER_V1 =
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_WRITER_V1";

export const VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_WRITER_AUTHORITY_V1 =
  Object.freeze({
    source_only_writer: true,
    continuity_contract_reused: true,
    exact_planned_append_required: true,
    descriptor_bound_reads: true,
    filesystem_read: true,
    filesystem_write: true,
    serialized_publication: true,
    dual_root_serialization_lock: true,
    preprovisioned_lock_queue_required: true,
    separate_storage_roots_required: true,
    redundant_publication_intent: true,
    crash_recovery: true,
    atomic_journal_publication: true,
    atomic_high_water_publication: true,
    exact_post_reclassification: true,
    exact_terminal_idempotent_retry: true,
    paired_terminal_root_revalidation: true,
    high_water_exact_journal_binding: true,
    storage_bootstrap: false,
    protected_custody_proven: false,
    independent_custody_proven: false,
    rollback_resistance_proven: false,
    trusted_collector_proven: false,
    bootstrap_receipt_external_trust_proven: false,
    evidence_generation_monotonicity_proven: false,
    verification_clock_authority_proven: false,
    live_host_qualification_performed: false,
    runtime_integration: false,
    payment_acceptance: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    gas_spend: false,
    inventory_mutation: false,
    market_activation: false,
    public_presale_activation: false,
    production_gate_ready: false,
    funds_movement: false,
  });

export const VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_WRITER_HIGH_WATER_V1 =
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_WRITER_HIGH_WATER_V1";

const HIGH_WATER_SCHEMA =
  "void_coupled_native_gas_reconciliation_custody_receipt_writer_high_water_v1";
const INTENT_SCHEMA =
  "void_coupled_native_gas_reconciliation_custody_receipt_writer_intent_v1";
const INTENT_MARKER =
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_WRITER_INTENT_V1";
const JOURNAL_NAME =
  "coupled-native-gas-reconciliation-custody-receipts-v1.jsonl";
const HIGH_WATER_NAME =
  "coupled-native-gas-reconciliation-custody-receipt-high-water-v1.json";
const INTENT_NAME =
  "coupled-native-gas-reconciliation-custody-receipt-writer-intent-v1.json";
const LOCK_QUEUE_NAME =
  "coupled-native-gas-reconciliation-custody-receipt-writer-v1.queue";
const MAX_JOURNAL_BYTES = 8 * 1024 * 1024;
const MAX_HIGH_WATER_BYTES = 64 * 1024;
const MAX_INTENT_BYTES = 10 * 1024 * 1024;
const O_NOFOLLOW = fs.constants.O_NOFOLLOW;
const O_DIRECTORY = fs.constants.O_DIRECTORY;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;

function fail(code) {
  throw new Error(code);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
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
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      fail("receipt_writer_canonical_object_invalid");
    }
    const keys = Object.keys(value).sort(compareText);
    return (
      "{" +
      keys
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
        .join(",") +
      "}"
    );
  }
  fail("receipt_writer_canonical_value_invalid");
}

function sha256Id(value) {
  const bytes = Buffer.isBuffer(value)
    ? value
    : Buffer.from(String(value), "utf8");
  return "sha256:" + crypto.createHash("sha256").update(bytes).digest("hex");
}

function exactKeys(value, expected, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  const actual = Object.keys(value).sort(compareText);
  const wanted = [...expected].sort(compareText);
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    fail(code);
  }
  return value;
}

function currentUid() {
  if (typeof process.getuid !== "function") fail("receipt_writer_uid_unavailable");
  return BigInt(process.getuid());
}

function requireDescriptorSafety() {
  if (
    typeof O_NOFOLLOW !== "number" ||
    typeof O_DIRECTORY !== "number" ||
    !fs.existsSync("/proc/self/fd")
  ) {
    fail("receipt_writer_descriptor_safety_unavailable");
  }
}

function sameDirectoryIdentity(left, right) {
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
    (((stat.mode & 0o022n) !== 0n) && ((stat.mode & 0o1000n) === 0n))
  ) {
    fail(code);
  }
}

function validatePrivateDirectory(stat, code) {
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    stat.uid !== currentUid() ||
    (stat.mode & 0o077n) !== 0n
  ) {
    fail(code);
  }
}

function validatePrivateFile(stat, maxBytes, allowEmpty, code, links = 1n) {
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.uid !== currentUid() ||
    stat.nlink !== links ||
    (stat.mode & 0o077n) !== 0n ||
    stat.size < (allowEmpty ? 0n : 1n) ||
    stat.size > BigInt(maxBytes)
  ) {
    fail(code);
  }
}

function openPinnedDirectory(directoryPath, code) {
  requireDescriptorSafety();
  const raw = String(directoryPath || "").trim();
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
    fail(code + "_path_invalid");
  }
  const resolved = path.resolve(raw);
  const parsed = path.parse(resolved);
  const parts = resolved
    .slice(parsed.root.length)
    .split(path.sep)
    .filter(Boolean);

  let walkFd = fs.openSync(
    parsed.root,
    fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
  );
  try {
    validateAncestor(
      fs.fstatSync(walkFd, { bigint: true }),
      code + "_ancestor_invalid",
    );
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      if (!part || part === "." || part === "..") {
        fail(code + "_ancestor_component_invalid");
      }
      const nextFd = fs.openSync(
        path.join("/proc/self/fd", String(walkFd), part),
        fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
      );
      const opened = fs.fstatSync(nextFd, { bigint: true });
      if (index === parts.length - 1) {
        validatePrivateDirectory(opened, code + "_invalid");
      } else {
        validateAncestor(opened, code + "_ancestor_invalid");
      }
      fs.closeSync(walkFd);
      walkFd = nextFd;
    }
    const visible = fs.lstatSync(resolved, { bigint: true });
    const opened = fs.fstatSync(walkFd, { bigint: true });
    validatePrivateDirectory(visible, code + "_invalid");
    validatePrivateDirectory(opened, code + "_invalid");
    if (!sameDirectoryIdentity(visible, opened)) {
      fail(code + "_path_not_bound");
    }
    const result = Object.freeze({
      path: resolved,
      fd: walkFd,
      stat: opened,
      proc_path: "/proc/self/fd/" + String(walkFd),
    });
    walkFd = -1;
    return result;
  } catch (error) {
    if (
      error instanceof Error &&
      String(error.message).startsWith(code + "_")
    ) {
      throw error;
    }
    fail(code + "_ancestor_walk_failed");
  } finally {
    if (walkFd >= 0) {
      try {
        fs.closeSync(walkFd);
      } catch (error) {
        void error;
      }
    }
  }
}

function openPrivateChildDirectory(root, name, code) {
  assertPinnedDirectoryVisible(root, code + "_root");
  if (!name || name.includes("/") || name === "." || name === "..") {
    fail(code + "_name_invalid");
  }
  const visiblePath = path.join(root.path, name);
  const pinnedPath = path.join(root.proc_path, name);
  let visible;
  try {
    visible = fs.lstatSync(visiblePath, { bigint: true });
  } catch (error) {
    if (error?.code === "ENOENT") fail(code + "_missing");
    throw error;
  }
  validatePrivateDirectory(visible, code + "_invalid");
  let fd;
  try {
    fd = fs.openSync(
      pinnedPath,
      fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
    );
  } catch (error) {
    if (error?.code === "ENOENT") fail(code + "_changed");
    throw error;
  }
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    validatePrivateDirectory(opened, code + "_invalid");
    if (!sameDirectoryIdentity(visible, opened)) {
      fail(code + "_path_not_bound");
    }
    const result = Object.freeze({
      path: visiblePath,
      fd,
      stat: opened,
      proc_path: "/proc/self/fd/" + String(fd),
    });
    return result;
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
}

function assertPinnedDirectoryVisible(directory, code) {
  const opened = fs.fstatSync(directory.fd, { bigint: true });
  const visible = fs.lstatSync(directory.path, { bigint: true });
  validatePrivateDirectory(opened, code + "_invalid");
  validatePrivateDirectory(visible, code + "_invalid");
  if (
    !sameDirectoryIdentity(directory.stat, opened) ||
    !sameDirectoryIdentity(opened, visible)
  ) {
    fail(code + "_changed");
  }
}

function rootsNested(parent, child) {
  const relative = path.relative(parent, child);
  return (
    relative !== "" &&
    relative !== ".." &&
    !relative.startsWith(".." + path.sep) &&
    !path.isAbsolute(relative)
  );
}

function assertDistinctRoots(journalRoot, highWaterRoot) {
  if (
    journalRoot.path === highWaterRoot.path ||
    rootsNested(journalRoot.path, highWaterRoot.path) ||
    rootsNested(highWaterRoot.path, journalRoot.path) ||
    (
      journalRoot.stat.dev === highWaterRoot.stat.dev &&
      journalRoot.stat.ino === highWaterRoot.stat.ino
    )
  ) {
    fail("receipt_writer_storage_roots_not_distinct");
  }
}

function assertRootsVisible(roots) {
  assertPinnedDirectoryVisible(
    roots.journal,
    "receipt_writer_journal_root",
  );
  assertPinnedDirectoryVisible(
    roots.high_water,
    "receipt_writer_high_water_root",
  );
  assertPinnedDirectoryVisible(
    roots.journal_lock_queue,
    "receipt_writer_journal_lock_queue",
  );
  assertPinnedDirectoryVisible(
    roots.high_water_lock_queue,
    "receipt_writer_high_water_lock_queue",
  );
  assertDistinctRoots(roots.journal, roots.high_water);
}

function closeRoots(roots) {
  if (!roots) return;
  for (const key of [
    "high_water_lock_queue",
    "journal_lock_queue",
    "high_water",
    "journal",
  ]) {
    const entry = roots[key];
    if (!entry) continue;
    try {
      fs.closeSync(entry.fd);
    } catch (error) {
      void error;
    }
  }
}

function openRoots(input) {
  const journal = openPinnedDirectory(
    input?.journal_root,
    "receipt_writer_journal_root",
  );
  let highWater = null;
  let journalLockQueue = null;
  let highWaterLockQueue = null;
  try {
    highWater = openPinnedDirectory(
      input?.high_water_root,
      "receipt_writer_high_water_root",
    );
    assertDistinctRoots(journal, highWater);
    journalLockQueue = openPrivateChildDirectory(
      journal,
      LOCK_QUEUE_NAME,
      "receipt_writer_journal_lock_queue",
    );
    highWaterLockQueue = openPrivateChildDirectory(
      highWater,
      LOCK_QUEUE_NAME,
      "receipt_writer_high_water_lock_queue",
    );
    const roots = Object.freeze({
      journal,
      high_water: highWater,
      journal_lock_queue: journalLockQueue,
      high_water_lock_queue: highWaterLockQueue,
    });
    assertRootsVisible(roots);
    return roots;
  } catch (error) {
    if (highWaterLockQueue) fs.closeSync(highWaterLockQueue.fd);
    if (journalLockQueue) fs.closeSync(journalLockQueue.fd);
    if (highWater) fs.closeSync(highWater.fd);
    fs.closeSync(journal.fd);
    throw error;
  }
}

function openPinnedNamedFileSnapshot(
  directory,
  name,
  maxBytes,
  allowEmpty,
  code,
) {
  if (!name || name.includes("/") || name === "." || name === "..") {
    fail(code + "_name_invalid");
  }
  assertPinnedDirectoryVisible(directory, code + "_directory");
  const visiblePath = path.join(directory.path, name);
  const pinnedPath = path.join(directory.proc_path, name);
  const visibleBefore = fs.lstatSync(visiblePath, { bigint: true });
  validatePrivateFile(
    visibleBefore,
    maxBytes,
    allowEmpty,
    code + "_file_invalid",
  );
  let fd = -1;
  try {
    fd = fs.openSync(
      pinnedPath,
      fs.constants.O_RDONLY | O_NOFOLLOW,
    );
    const opened = fs.fstatSync(fd, { bigint: true });
    validatePrivateFile(
      opened,
      maxBytes,
      allowEmpty,
      code + "_file_invalid",
    );
    if (!sameFileIdentity(visibleBefore, opened)) {
      fail(code + "_path_not_bound");
    }
    const size = Number(opened.size);
    if (
      !Number.isSafeInteger(size) ||
      size < (allowEmpty ? 0 : 1) ||
      size > maxBytes
    ) {
      fail(code + "_size_invalid");
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
      if (count <= 0) fail(code + "_short_read");
      offset += count;
    }
    const after = fs.fstatSync(fd, { bigint: true });
    const visibleAfter = fs.lstatSync(visiblePath, { bigint: true });
    validatePrivateFile(after, maxBytes, allowEmpty, code + "_file_invalid");
    validatePrivateFile(
      visibleAfter,
      maxBytes,
      allowEmpty,
      code + "_file_invalid",
    );
    if (
      !sameFileIdentity(opened, after) ||
      !sameFileIdentity(after, visibleAfter)
    ) {
      fail(code + "_changed_during_read");
    }
    assertPinnedDirectoryVisible(directory, code + "_directory");
    return Object.freeze({
      directory,
      visible_path: visiblePath,
      fd,
      stat: after,
      bytes,
      max_bytes: maxBytes,
      allow_empty: allowEmpty,
      code,
    });
  } catch (error) {
    if (fd >= 0) {
      try { fs.closeSync(fd); } catch (closeError) { void closeError; }
    }
    throw error;
  }
}

function assertPinnedNamedFileSnapshotVisible(snapshot) {
  const opened = fs.fstatSync(snapshot.fd, { bigint: true });
  const visible = fs.lstatSync(snapshot.visible_path, { bigint: true });
  validatePrivateFile(
    opened,
    snapshot.max_bytes,
    snapshot.allow_empty,
    snapshot.code + "_file_invalid",
  );
  validatePrivateFile(
    visible,
    snapshot.max_bytes,
    snapshot.allow_empty,
    snapshot.code + "_file_invalid",
  );
  if (
    !sameFileIdentity(snapshot.stat, opened) ||
    !sameFileIdentity(opened, visible)
  ) {
    fail(snapshot.code + "_snapshot_changed");
  }
  assertPinnedDirectoryVisible(
    snapshot.directory,
    snapshot.code + "_directory",
  );
}

function closePinnedNamedFileSnapshot(snapshot) {
  if (!snapshot) return;
  fs.closeSync(snapshot.fd);
}

function readPinnedNamedFile(
  directory,
  name,
  maxBytes,
  allowEmpty,
  code,
) {
  const snapshot = openPinnedNamedFileSnapshot(
    directory,
    name,
    maxBytes,
    allowEmpty,
    code,
  );
  try {
    return Buffer.from(snapshot.bytes);
  } finally {
    closePinnedNamedFileSnapshot(snapshot);
  }
}

function openOptionalPinnedNamedFileSnapshot(
  directory,
  name,
  maxBytes,
  allowEmpty,
  code,
) {
  assertPinnedDirectoryVisible(directory, code + "_directory");
  const visible = path.join(directory.path, name);
  const pinned = path.join(directory.proc_path, name);
  let visibleMissing = false;
  let pinnedMissing = false;
  try {
    fs.lstatSync(visible, { bigint: true });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    visibleMissing = true;
  }
  try {
    fs.lstatSync(pinned, { bigint: true });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    pinnedMissing = true;
  }
  if (visibleMissing || pinnedMissing) {
    if (visibleMissing !== pinnedMissing) {
      fail(code + "_presence_mismatch");
    }
    assertPinnedDirectoryVisible(directory, code + "_directory");
    return null;
  }
  return openPinnedNamedFileSnapshot(
    directory,
    name,
    maxBytes,
    allowEmpty,
    code,
  );
}

function readOptionalPinnedNamedFile(
  directory,
  name,
  maxBytes,
  allowEmpty,
  code,
) {
  const snapshot = openOptionalPinnedNamedFileSnapshot(
    directory,
    name,
    maxBytes,
    allowEmpty,
    code,
  );
  if (snapshot === null) return null;
  try {
    return Buffer.from(snapshot.bytes);
  } finally {
    closePinnedNamedFileSnapshot(snapshot);
  }
}

function writeAll(fd, bytes, code) {
  let offset = 0;
  while (offset < bytes.length) {
    const count = fs.writeSync(
      fd,
      bytes,
      offset,
      bytes.length - offset,
      null,
    );
    if (count <= 0) fail(code + "_short_write");
    offset += count;
  }
}

function temporaryName(name) {
  return (
    "." +
    name +
    ".tmp-" +
    String(process.pid) +
    "-" +
    crypto.randomBytes(8).toString("hex")
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^$()|[\]\\]/gu, "\\$&");
}

function tempPattern(name) {
  return new RegExp(
    "^\\." +
      escapeRegExp(name) +
      "\\.tmp-[1-9][0-9]*-[0-9a-f]{16}$",
    "u",
  );
}

function cleanupTempsForName(
  directory,
  name,
  maxBytes,
  allowEmpty,
  code,
  markMutation,
) {
  if (typeof markMutation !== "function") {
    fail(code + "_cleanup_tracker_invalid");
  }
  assertPinnedDirectoryVisible(directory, code + "_directory");
  const pattern = tempPattern(name);
  let changed = false;
  for (const entry of fs.readdirSync(directory.proc_path)) {
    if (!entry.startsWith("." + name + ".tmp-")) continue;
    if (!pattern.test(entry)) fail(code + "_temp_name_invalid");
    const tempPath = path.join(directory.proc_path, entry);
    const temp = fs.lstatSync(tempPath, { bigint: true });
    if (temp.nlink === 1n) {
      validatePrivateFile(
        temp,
        maxBytes,
        allowEmpty,
        code + "_temp_invalid",
        1n,
      );
      fs.unlinkSync(tempPath);
      markMutation();
      changed = true;
      continue;
    }
    validatePrivateFile(
      temp,
      maxBytes,
      allowEmpty,
      code + "_temp_invalid",
      2n,
    );
    const finalPath = path.join(directory.proc_path, name);
    const final = fs.lstatSync(finalPath, { bigint: true });
    validatePrivateFile(
      final,
      maxBytes,
      allowEmpty,
      code + "_file_invalid",
      2n,
    );
    if (temp.dev !== final.dev || temp.ino !== final.ino) {
      fail(code + "_temp_binding_invalid");
    }
    fs.unlinkSync(tempPath);
    markMutation();
    changed = true;
  }
  if (changed) {
    fs.fsyncSync(directory.fd);
    assertPinnedDirectoryVisible(directory, code + "_directory");
  }
  return changed;
}

function hasReviewedTempForName(directory, name, code) {
  assertPinnedDirectoryVisible(directory, code + "_directory");
  const pattern = tempPattern(name);
  for (const entry of fs.readdirSync(directory.proc_path)) {
    if (!entry.startsWith("." + name + ".tmp-")) continue;
    if (!pattern.test(entry)) fail(code + "_temp_name_invalid");
    return true;
  }
  return false;
}

function normalizeReviewedTemps(roots, markMutation) {
  cleanupTempsForName(
    roots.journal,
    INTENT_NAME,
    MAX_INTENT_BYTES,
    false,
    "receipt_writer_journal_intent",
    markMutation,
  );
  cleanupTempsForName(
    roots.high_water,
    INTENT_NAME,
    MAX_INTENT_BYTES,
    false,
    "receipt_writer_high_water_intent",
    markMutation,
  );
  cleanupTempsForName(
    roots.journal,
    JOURNAL_NAME,
    MAX_JOURNAL_BYTES,
    true,
    "receipt_writer_journal",
    markMutation,
  );
  cleanupTempsForName(
    roots.high_water,
    HIGH_WATER_NAME,
    MAX_HIGH_WATER_BYTES,
    false,
    "receipt_writer_high_water",
    markMutation,
  );
  assertRootsVisible(roots);
}

function fsyncDirectory(directory, code) {
  assertPinnedDirectoryVisible(directory, code);
  fs.fsyncSync(directory.fd);
}

function createOnceFile(directory, name, bytes, maxBytes, code) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 1 || bytes.length > maxBytes) {
    fail(code + "_bytes_invalid");
  }
  if (
    readOptionalPinnedNamedFile(
      directory,
      name,
      maxBytes,
      false,
      code,
    ) !== null
  ) {
    fail(code + "_already_exists");
  }
  const tempName = temporaryName(name);
  const tempPath = path.join(directory.proc_path, tempName);
  const finalPath = path.join(directory.proc_path, name);
  let fd = -1;
  try {
    fd = fs.openSync(
      tempPath,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        O_NOFOLLOW,
      0o600,
    );
    writeAll(fd, bytes, code);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = -1;
    fs.linkSync(tempPath, finalPath);
    fsyncDirectory(directory, code + "_directory");
    fs.unlinkSync(tempPath);
    fsyncDirectory(directory, code + "_directory");
    const published = readPinnedNamedFile(
      directory,
      name,
      maxBytes,
      false,
      code,
    );
    if (!published.equals(bytes)) fail(code + "_postcheck_failed");
  } finally {
    if (fd >= 0) {
      try { fs.closeSync(fd); } catch (error) { void error; }
    }
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
        fsyncDirectory(directory, code + "_directory");
      }
    } catch (error) {
      void error;
    }
  }
}

function atomicReplaceFile(
  directory,
  name,
  nextBytes,
  expectedBytes,
  maxBytes,
  allowEmpty,
  code,
  beforeReplace = null,
) {
  if (
    !Buffer.isBuffer(nextBytes) ||
    nextBytes.length < (allowEmpty ? 0 : 1) ||
    nextBytes.length > maxBytes
  ) {
    fail(code + "_bytes_invalid");
  }
  const current = readPinnedNamedFile(
    directory,
    name,
    maxBytes,
    allowEmpty,
    code + "_pre_replace",
  );
  if (!current.equals(expectedBytes)) {
    fail(code + "_changed_before_replace");
  }
  const tempName = temporaryName(name);
  const tempPath = path.join(directory.proc_path, tempName);
  const finalPath = path.join(directory.proc_path, name);
  let fd = -1;
  try {
    fd = fs.openSync(
      tempPath,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        O_NOFOLLOW,
      0o600,
    );
    if (nextBytes.length > 0) writeAll(fd, nextBytes, code);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = -1;
    assertPinnedDirectoryVisible(directory, code + "_directory");
    if (typeof beforeReplace === "function") beforeReplace();
    fs.renameSync(tempPath, finalPath);
    fsyncDirectory(directory, code + "_directory");
    const published = readPinnedNamedFile(
      directory,
      name,
      maxBytes,
      allowEmpty,
      code,
    );
    if (!published.equals(nextBytes)) fail(code + "_postcheck_failed");
  } finally {
    if (fd >= 0) {
      try { fs.closeSync(fd); } catch (error) { void error; }
    }
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
        fsyncDirectory(directory, code + "_directory");
      }
    } catch (error) {
      void error;
    }
  }
}

function removeExactFile(directory, name, expected, maxBytes, code) {
  const current = readPinnedNamedFile(
    directory,
    name,
    maxBytes,
    false,
    code,
  );
  if (!current.equals(expected)) fail(code + "_changed_before_remove");
  assertPinnedDirectoryVisible(directory, code + "_directory");
  fs.unlinkSync(path.join(directory.proc_path, name));
  fsyncDirectory(directory, code + "_directory");
}

export function deriveCoupledNativeGasReconciliationCustodyReceiptWriterHighWaterV1(
  journalInput,
) {
  const bytes = Buffer.isBuffer(journalInput)
    ? Buffer.from(journalInput)
    : Buffer.from(String(journalInput ?? ""), "utf8");
  if (bytes.length > MAX_JOURNAL_BYTES) {
    fail("receipt_writer_journal_too_large");
  }
  const classified =
    classifyCoupledNativeGasReconciliationCustodyReceiptContinuityV1(bytes);
  if (classified.ok !== true) {
    fail(
      "receipt_writer_journal_" +
        String(classified.reason || "classification_failed"),
    );
  }
  const body = Object.freeze({
    schema: HIGH_WATER_SCHEMA,
    marker:
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_WRITER_HIGH_WATER_V1,
    version: 1,
    source_generation_id:
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_SOURCE_GENERATION_ID_V1,
    journal_sha256: sha256Id(bytes),
    journal_bytes: bytes.length,
    record_count: classified.record_count,
    generation: classified.generation,
    tip_receipt_sha256: classified.tip_receipt_sha256,
    host_id: classified.host_id,
    payer_address: classified.payer_address,
    payer_domain_id: classified.payer_domain_id,
    payer_root_path: classified.payer_root_path,
    payer_root_identity_sha256:
      classified.payer_root_identity_sha256,
    machine_id_sha256: classified.machine_id_sha256,
  });
  return Object.freeze({
    ...body,
    high_water_sha256: sha256Id(canonicalJson(body)),
  });
}

function highWaterBytes(journalBytes) {
  const value =
    deriveCoupledNativeGasReconciliationCustodyReceiptWriterHighWaterV1(
      journalBytes,
    );
  return Buffer.from(canonicalJson(value) + "\n", "utf8");
}

export function classifyCoupledNativeGasReconciliationCustodyReceiptWriterHighWaterV1(
  journalInput,
  highWaterInput,
) {
  try {
    const journal = Buffer.isBuffer(journalInput)
      ? Buffer.from(journalInput)
      : Buffer.from(String(journalInput ?? ""), "utf8");
    const highWater = Buffer.isBuffer(highWaterInput)
      ? Buffer.from(highWaterInput)
      : Buffer.from(String(highWaterInput ?? ""), "utf8");
    const expected = highWaterBytes(journal);
    if (!highWater.equals(expected)) {
      fail("receipt_writer_high_water_mismatch");
    }
    const value = JSON.parse(highWater.toString("utf8"));
    return Object.freeze({
      ok: true,
      status: "bound",
      marker:
        VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_WRITER_V1,
      version: 1,
      high_water: Object.freeze(value),
      rollback_resistance_proven: false,
      protected_custody_proven: false,
      independent_custody_proven: false,
      funds_movement: false,
      authority:
        VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_WRITER_AUTHORITY_V1,
    });
  } catch (error) {
    return held(error instanceof Error ? error.message : String(error), false);
  }
}

function intentBytes({
  beforeJournal,
  appendJsonl,
  beforeHighWater,
  afterHighWater,
  generation,
  receiptSha256,
}) {
  const append = Buffer.from(String(appendJsonl), "utf8");
  const afterJournal = Buffer.concat([beforeJournal, append]);
  const body = Object.freeze({
    schema: INTENT_SCHEMA,
    marker: INTENT_MARKER,
    version: 1,
    source_generation_id:
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_SOURCE_GENERATION_ID_V1,
    generation,
    receipt_sha256: receiptSha256,
    before_journal_jsonl: beforeJournal.toString("utf8"),
    before_journal_sha256: sha256Id(beforeJournal),
    append_jsonl: append.toString("utf8"),
    append_jsonl_sha256: sha256Id(append),
    after_journal_sha256: sha256Id(afterJournal),
    before_high_water_json: beforeHighWater.toString("utf8"),
    before_high_water_sha256: sha256Id(beforeHighWater),
    after_high_water_json: afterHighWater.toString("utf8"),
    after_high_water_sha256: sha256Id(afterHighWater),
  });
  const value = Object.freeze({
    ...body,
    intent_sha256: sha256Id(canonicalJson(body)),
  });
  const bytes = Buffer.from(canonicalJson(value) + "\n", "utf8");
  if (bytes.length > MAX_INTENT_BYTES) fail("receipt_writer_intent_too_large");
  return bytes;
}

const INTENT_KEYS = Object.freeze([
  "schema",
  "marker",
  "version",
  "source_generation_id",
  "generation",
  "receipt_sha256",
  "before_journal_jsonl",
  "before_journal_sha256",
  "append_jsonl",
  "append_jsonl_sha256",
  "after_journal_sha256",
  "before_high_water_json",
  "before_high_water_sha256",
  "after_high_water_json",
  "after_high_water_sha256",
  "intent_sha256",
]);

function parseIntent(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 2 || bytes.length > MAX_INTENT_BYTES) {
    fail("receipt_writer_intent_bytes_invalid");
  }
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail("receipt_writer_intent_json_invalid");
  }
  exactKeys(value, INTENT_KEYS, "receipt_writer_intent_shape_invalid");
  const body = { ...value };
  delete body.intent_sha256;
  if (
    value.schema !== INTENT_SCHEMA ||
    value.marker !== INTENT_MARKER ||
    value.version !== 1 ||
    value.source_generation_id !==
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_SOURCE_GENERATION_ID_V1 ||
    !Number.isSafeInteger(value.generation) ||
    value.generation < 1 ||
    !SHA256_ID.test(String(value.receipt_sha256 || "")) ||
    !SHA256_ID.test(String(value.intent_sha256 || "")) ||
    value.intent_sha256 !== sha256Id(canonicalJson(body)) ||
    !bytes.equals(Buffer.from(canonicalJson(value) + "\n", "utf8"))
  ) {
    fail("receipt_writer_intent_identity_invalid");
  }
  const beforeJournal = Buffer.from(value.before_journal_jsonl, "utf8");
  const append = Buffer.from(value.append_jsonl, "utf8");
  const afterJournal = Buffer.concat([beforeJournal, append]);
  const beforeHighWater = Buffer.from(value.before_high_water_json, "utf8");
  const afterHighWater = Buffer.from(value.after_high_water_json, "utf8");
  if (
    beforeJournal.length > MAX_JOURNAL_BYTES ||
    afterJournal.length > MAX_JOURNAL_BYTES ||
    beforeHighWater.length > MAX_HIGH_WATER_BYTES ||
    afterHighWater.length > MAX_HIGH_WATER_BYTES ||
    value.before_journal_sha256 !== sha256Id(beforeJournal) ||
    value.append_jsonl_sha256 !== sha256Id(append) ||
    value.after_journal_sha256 !== sha256Id(afterJournal) ||
    value.before_high_water_sha256 !== sha256Id(beforeHighWater) ||
    value.after_high_water_sha256 !== sha256Id(afterHighWater) ||
    !beforeHighWater.equals(highWaterBytes(beforeJournal)) ||
    !afterHighWater.equals(highWaterBytes(afterJournal))
  ) {
    fail("receipt_writer_intent_binding_invalid");
  }
  const afterClassified =
    classifyCoupledNativeGasReconciliationCustodyReceiptContinuityV1(
      afterJournal,
    );
  if (
    afterClassified.ok !== true ||
    afterClassified.generation !== value.generation ||
    afterClassified.tip_receipt_sha256 !== value.receipt_sha256
  ) {
    fail("receipt_writer_intent_receipt_binding_invalid");
  }
  return Object.freeze({
    value: Object.freeze(value),
    bytes,
    before_journal: beforeJournal,
    after_journal: afterJournal,
    before_high_water: beforeHighWater,
    after_high_water: afterHighWater,
  });
}

function coherentState(
  roots,
  afterJournalReadHook = null,
  afterHighWaterReadHook = null,
) {
  let journalSnapshot = null;
  let highWaterSnapshot = null;
  try {
    journalSnapshot = openPinnedNamedFileSnapshot(
      roots.journal,
      JOURNAL_NAME,
      MAX_JOURNAL_BYTES,
      true,
      "receipt_writer_journal",
    );
    if (typeof afterJournalReadHook === "function") {
      afterJournalReadHook();
    }
    highWaterSnapshot = openPinnedNamedFileSnapshot(
      roots.high_water,
      HIGH_WATER_NAME,
      MAX_HIGH_WATER_BYTES,
      false,
      "receipt_writer_high_water",
    );
    if (typeof afterHighWaterReadHook === "function") {
      afterHighWaterReadHook();
    }
    const journal = journalSnapshot.bytes;
    const highWater = highWaterSnapshot.bytes;
    const binding =
      classifyCoupledNativeGasReconciliationCustodyReceiptWriterHighWaterV1(
        journal,
        highWater,
      );
    if (binding.ok !== true) {
      fail(binding.reason || "receipt_writer_high_water_hold");
    }
    const continuity =
      classifyCoupledNativeGasReconciliationCustodyReceiptContinuityV1(journal);
    if (continuity.ok !== true) {
      fail(continuity.reason || "receipt_writer_continuity_hold");
    }
    assertRootsVisible(roots);
    assertPinnedNamedFileSnapshotVisible(journalSnapshot);
    assertPinnedNamedFileSnapshotVisible(highWaterSnapshot);
    assertRootsVisible(roots);
    return Object.freeze({
      journal: Buffer.from(journal),
      high_water: Buffer.from(highWater),
      continuity,
      high_water_binding: binding.high_water,
    });
  } finally {
    if (highWaterSnapshot) {
      closePinnedNamedFileSnapshot(highWaterSnapshot);
    }
    if (journalSnapshot) {
      closePinnedNamedFileSnapshot(journalSnapshot);
    }
  }
}

function assertStatePairSnapshotVisible(roots, pair) {
  if (!pair?.journal_snapshot || !pair?.high_water_snapshot) {
    fail("receipt_writer_state_pair_snapshot_invalid");
  }
  assertRootsVisible(roots);
  assertPinnedNamedFileSnapshotVisible(pair.journal_snapshot);
  assertPinnedNamedFileSnapshotVisible(pair.high_water_snapshot);
  assertRootsVisible(roots);
}

function closeStatePairSnapshot(pair) {
  if (!pair) return;
  if (pair.high_water_snapshot) {
    closePinnedNamedFileSnapshot(pair.high_water_snapshot);
  }
  if (pair.journal_snapshot) {
    closePinnedNamedFileSnapshot(pair.journal_snapshot);
  }
}

function openStatePairSnapshot(
  roots,
  expectedJournal,
  expectedHighWater,
) {
  let journalSnapshot = null;
  let highWaterSnapshot = null;
  try {
    journalSnapshot = openPinnedNamedFileSnapshot(
      roots.journal,
      JOURNAL_NAME,
      MAX_JOURNAL_BYTES,
      true,
      "receipt_writer_journal_state",
    );
    highWaterSnapshot = openPinnedNamedFileSnapshot(
      roots.high_water,
      HIGH_WATER_NAME,
      MAX_HIGH_WATER_BYTES,
      false,
      "receipt_writer_high_water_state",
    );
    if (!journalSnapshot.bytes.equals(expectedJournal)) {
      fail("receipt_writer_journal_state_snapshot_bytes_mismatch");
    }
    if (!highWaterSnapshot.bytes.equals(expectedHighWater)) {
      fail("receipt_writer_high_water_state_snapshot_bytes_mismatch");
    }
    const pair = Object.freeze({
      journal_snapshot: journalSnapshot,
      high_water_snapshot: highWaterSnapshot,
    });
    assertStatePairSnapshotVisible(roots, pair);
    return pair;
  } catch (error) {
    if (highWaterSnapshot) {
      closePinnedNamedFileSnapshot(highWaterSnapshot);
    }
    if (journalSnapshot) {
      closePinnedNamedFileSnapshot(journalSnapshot);
    }
    throw error;
  }
}

async function canonicalLock() {
  const module = await import(
    "../dist/economic/buy_void_filesystem_bakery_lock_v1.js"
  );
  if (
    typeof module.withBuyVoidFilesystemBakeryLockAsyncExistingQueueV1 !==
    "function"
  ) {
    fail("receipt_writer_lock_unavailable");
  }
  return module.withBuyVoidFilesystemBakeryLockAsyncExistingQueueV1;
}

function openIntentPairSnapshot(
  roots,
  afterJournalIntentReadHook = null,
  afterHighWaterIntentReadHook = null,
) {
  let leftSnapshot = null;
  let rightSnapshot = null;
  try {
    leftSnapshot = openOptionalPinnedNamedFileSnapshot(
      roots.journal,
      INTENT_NAME,
      MAX_INTENT_BYTES,
      false,
      "receipt_writer_journal_intent",
    );
    if (typeof afterJournalIntentReadHook === "function") {
      afterJournalIntentReadHook();
    }
    rightSnapshot = openOptionalPinnedNamedFileSnapshot(
      roots.high_water,
      INTENT_NAME,
      MAX_INTENT_BYTES,
      false,
      "receipt_writer_high_water_intent",
    );
    if (typeof afterHighWaterIntentReadHook === "function") {
      afterHighWaterIntentReadHook();
    }
    if (leftSnapshot === null && rightSnapshot === null) return null;
    return {
      left:
        leftSnapshot === null ? null : Buffer.from(leftSnapshot.bytes),
      right:
        rightSnapshot === null ? null : Buffer.from(rightSnapshot.bytes),
      left_snapshot: leftSnapshot,
      right_snapshot: rightSnapshot,
    };
  } catch (error) {
    if (rightSnapshot !== null) closePinnedNamedFileSnapshot(rightSnapshot);
    if (leftSnapshot !== null) closePinnedNamedFileSnapshot(leftSnapshot);
    throw error;
  }
}

function closeIntentPairSnapshot(pair) {
  if (!pair) return;
  if (pair.right_snapshot !== null) {
    closePinnedNamedFileSnapshot(pair.right_snapshot);
  }
  if (pair.left_snapshot !== null) {
    closePinnedNamedFileSnapshot(pair.left_snapshot);
  }
}

function assertIntentPairSnapshotVisible(roots, pair) {
  if (!pair) fail("receipt_writer_intent_pair_empty");
  assertRootsVisible(roots);
  if (pair.left_snapshot !== null) {
    assertPinnedNamedFileSnapshotVisible(pair.left_snapshot);
  }
  if (pair.right_snapshot !== null) {
    assertPinnedNamedFileSnapshotVisible(pair.right_snapshot);
  }
  assertRootsVisible(roots);
}

function readIntentPair(roots) {
  const pair = openIntentPairSnapshot(roots);
  if (pair === null) return null;
  try {
    assertIntentPairSnapshotVisible(roots, pair);
    return Object.freeze({
      left: pair.left === null ? null : Buffer.from(pair.left),
      right: pair.right === null ? null : Buffer.from(pair.right),
    });
  } finally {
    closeIntentPairSnapshot(pair);
  }
}

function parseIntentPair(pair) {
  if (!pair || (pair.left === null && pair.right === null)) {
    fail("receipt_writer_intent_pair_empty");
  }
  if (
    pair.left !== null &&
    pair.right !== null &&
    !pair.left.equals(pair.right)
  ) {
    fail("receipt_writer_intent_pair_mismatch");
  }
  return parseIntent(pair.left ?? pair.right);
}

function pendingIntentMatchesInput(intent, input) {
  const planned =
    planCoupledNativeGasReconciliationCustodyReceiptV1({
      journal_jsonl: intent.before_journal,
      collector_decision: input?.collector_decision,
      source_binding: input?.source_binding,
    });
  if (planned.ok !== true) return false;
  const append = Buffer.from(planned.append_jsonl, "utf8");
  return (
    append.equals(Buffer.from(intent.value.append_jsonl, "utf8")) &&
    planned.generation === intent.value.generation &&
    planned.receipt_sha256 === intent.value.receipt_sha256
  );
}

function ensureRedundantIntentSnapshot(roots, pair, markMutation) {
  const parsed = parseIntentPair(pair);
  const selected = parsed.bytes;
  let leftSnapshot = pair.left_snapshot;
  let rightSnapshot = pair.right_snapshot;
  let createdLeft = null;
  let createdRight = null;

  assertIntentPairSnapshotVisible(roots, pair);
  try {
    if (pair.left === null) {
      createOnceFile(
        roots.journal,
        INTENT_NAME,
        selected,
        MAX_INTENT_BYTES,
        "receipt_writer_journal_intent",
      );
      markMutation();
      createdLeft = openPinnedNamedFileSnapshot(
        roots.journal,
        INTENT_NAME,
        MAX_INTENT_BYTES,
        false,
        "receipt_writer_journal_intent",
      );
      leftSnapshot = createdLeft;
    }
    if (pair.right === null) {
      createOnceFile(
        roots.high_water,
        INTENT_NAME,
        selected,
        MAX_INTENT_BYTES,
        "receipt_writer_high_water_intent",
      );
      markMutation();
      createdRight = openPinnedNamedFileSnapshot(
        roots.high_water,
        INTENT_NAME,
        MAX_INTENT_BYTES,
        false,
        "receipt_writer_high_water_intent",
      );
      rightSnapshot = createdRight;
    }

    const completed = {
      left:
        pair.left === null
          ? Buffer.from(leftSnapshot.bytes)
          : Buffer.from(pair.left),
      right:
        pair.right === null
          ? Buffer.from(rightSnapshot.bytes)
          : Buffer.from(pair.right),
      left_snapshot: leftSnapshot,
      right_snapshot: rightSnapshot,
    };
    const completedParsed = parseIntentPair(completed);
    if (!completedParsed.bytes.equals(selected)) {
      fail("receipt_writer_intent_pair_changed_during_redundancy");
    }
    assertIntentPairSnapshotVisible(roots, completed);
    return Object.freeze({
      pair: completed,
      intent: completedParsed,
    });
  } catch (error) {
    if (createdRight !== null) closePinnedNamedFileSnapshot(createdRight);
    if (createdLeft !== null) closePinnedNamedFileSnapshot(createdLeft);
    throw error;
  }
}

function createIntentPairSnapshot(
  roots,
  bytes,
  crashAfter,
  markMutation,
) {
  let leftSnapshot = null;
  let rightSnapshot = null;
  try {
    createOnceFile(
      roots.journal,
      INTENT_NAME,
      bytes,
      MAX_INTENT_BYTES,
      "receipt_writer_journal_intent",
    );
    markMutation();
    if (crashAfter === "after_journal_intent") {
      fail("receipt_writer_test_crash_after_journal_intent");
    }
    leftSnapshot = openPinnedNamedFileSnapshot(
      roots.journal,
      INTENT_NAME,
      MAX_INTENT_BYTES,
      false,
      "receipt_writer_journal_intent",
    );
    if (!leftSnapshot.bytes.equals(bytes)) {
      fail("receipt_writer_journal_intent_changed_after_create");
    }

    createOnceFile(
      roots.high_water,
      INTENT_NAME,
      bytes,
      MAX_INTENT_BYTES,
      "receipt_writer_high_water_intent",
    );
    markMutation();
    if (crashAfter === "after_high_water_intent") {
      fail("receipt_writer_test_crash_after_high_water_intent");
    }
    rightSnapshot = openPinnedNamedFileSnapshot(
      roots.high_water,
      INTENT_NAME,
      MAX_INTENT_BYTES,
      false,
      "receipt_writer_high_water_intent",
    );
    if (!rightSnapshot.bytes.equals(bytes)) {
      fail("receipt_writer_high_water_intent_changed_after_create");
    }

    const pair = {
      left: Buffer.from(leftSnapshot.bytes),
      right: Buffer.from(rightSnapshot.bytes),
      left_snapshot: leftSnapshot,
      right_snapshot: rightSnapshot,
    };
    const parsed = parseIntentPair(pair);
    if (!parsed.bytes.equals(bytes)) {
      fail("receipt_writer_fresh_intent_pair_changed");
    }
    assertIntentPairSnapshotVisible(roots, pair);
    return pair;
  } catch (error) {
    if (rightSnapshot !== null) closePinnedNamedFileSnapshot(rightSnapshot);
    if (leftSnapshot !== null) closePinnedNamedFileSnapshot(leftSnapshot);
    throw error;
  }
}

function removeIntentPair(roots, expected, markMutation, crashAfter) {
  removeExactFile(
    roots.journal,
    INTENT_NAME,
    expected,
    MAX_INTENT_BYTES,
    "receipt_writer_journal_intent",
  );
  markMutation();
  if (crashAfter === "after_journal_intent_remove") {
    fail("receipt_writer_test_crash_after_journal_intent_remove");
  }
  removeExactFile(
    roots.high_water,
    INTENT_NAME,
    expected,
    MAX_INTENT_BYTES,
    "receipt_writer_high_water_intent",
  );
  markMutation();
  assertRootsVisible(roots);
}

function publishJournal(
  roots,
  before,
  after,
  markMutation,
  beforeReplace = null,
) {
  atomicReplaceFile(
    roots.journal,
    JOURNAL_NAME,
    after,
    before,
    MAX_JOURNAL_BYTES,
    true,
    "receipt_writer_journal",
    () => {
      assertRootsVisible(roots);
      if (typeof beforeReplace === "function") beforeReplace();
    },
  );
  markMutation();
}

function publishHighWater(
  roots,
  before,
  after,
  markMutation,
  beforeReplace = null,
) {
  atomicReplaceFile(
    roots.high_water,
    HIGH_WATER_NAME,
    after,
    before,
    MAX_HIGH_WATER_BYTES,
    false,
    "receipt_writer_high_water",
    () => {
      assertRootsVisible(roots);
      if (typeof beforeReplace === "function") beforeReplace();
    },
  );
  markMutation();
}

function bytesState(current, before, after, code) {
  if (current.equals(before)) return "before";
  if (current.equals(after)) return "after";
  fail(code);
}

function priorJournalAndTipLine(journal) {
  if (!Buffer.isBuffer(journal) || journal.length < 2) return null;
  if (journal[journal.length - 1] !== 0x0a) return null;
  const priorNewline = journal.lastIndexOf(0x0a, journal.length - 2);
  const priorLength = priorNewline < 0 ? 0 : priorNewline + 1;
  return Object.freeze({
    prior: Buffer.from(journal.subarray(0, priorLength)),
    tip_line: Buffer.from(journal.subarray(priorLength)),
  });
}

function classifyExactTipIdempotentRetry(state, input) {
  const split = priorJournalAndTipLine(state.journal);
  if (split === null) return null;
  const planned =
    planCoupledNativeGasReconciliationCustodyReceiptV1({
      journal_jsonl: split.prior,
      collector_decision: input?.collector_decision,
      source_binding: input?.source_binding,
    });
  if (planned.ok !== true) return null;
  const append = Buffer.from(planned.append_jsonl, "utf8");
  if (
    !append.equals(split.tip_line) ||
    planned.receipt_sha256 !== state.continuity.tip_receipt_sha256 ||
    planned.generation !== state.continuity.generation
  ) {
    return null;
  }
  return planned;
}

function success(status, state, mutationPerformed, recoveryPerformed) {
  return Object.freeze({
    ok: true,
    status,
    marker:
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_WRITER_V1,
    version: 1,
    operation_performed: mutationPerformed,
    recovery_performed: recoveryPerformed,
    source_generation_id:
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_SOURCE_GENERATION_ID_V1,
    record_count: state.continuity.record_count,
    generation: state.continuity.generation,
    tip_receipt_sha256: state.continuity.tip_receipt_sha256,
    journal_sha256: sha256Id(state.journal),
    high_water_sha256: sha256Id(state.high_water),
    publication_intent_present: false,
    storage_bootstrap: false,
    rollback_resistance_proven: false,
    protected_custody_proven: false,
    independent_custody_proven: false,
    trusted_collector_proven: false,
    verification_clock_authority_proven: false,
    live_host_qualification_performed: false,
    runtime_integration: false,
    production_gate_ready: false,
    funds_movement: false,
    authority:
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_WRITER_AUTHORITY_V1,
  });
}

function held(reason, mutationPerformed = false) {
  return Object.freeze({
    ok: false,
    status: "held",
    marker:
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_WRITER_V1,
    version: 1,
    reason: String(reason || "receipt_writer_held").slice(0, 300),
    operation_performed: mutationPerformed,
    storage_bootstrap: false,
    rollback_resistance_proven: false,
    protected_custody_proven: false,
    independent_custody_proven: false,
    runtime_integration: false,
    production_gate_ready: false,
    funds_movement: false,
    authority:
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_WRITER_AUTHORITY_V1,
  });
}

function recoverLocked(
  roots,
  markMutation,
  crashAfter = null,
  input = null,
  mutationAlreadyPerformed = false,
  {
    afterJournalIntentReadHook = null,
    afterHighWaterIntentReadHook = null,
    afterRecoveryJournalStateSnapshotHook = null,
    afterRecoveryHighWaterStateSnapshotHook = null,
  } = {},
) {
  let pair = null;
  try {
    pair = openIntentPairSnapshot(
      roots,
      afterJournalIntentReadHook,
      afterHighWaterIntentReadHook,
    );
    if (pair === null) {
      const state = coherentState(roots);
      return success("clean", state, false, false);
    }

    let parsedIntent = parseIntentPair(pair);
    if (
      input !== null &&
      !pendingIntentMatchesInput(parsedIntent, input)
    ) {
      return held(
        "receipt_writer_pending_intent_input_mismatch",
        mutationAlreadyPerformed,
      );
    }

    const currentJournal = readPinnedNamedFile(
      roots.journal,
      JOURNAL_NAME,
      MAX_JOURNAL_BYTES,
      true,
      "receipt_writer_journal",
    );
    const currentHighWater = readPinnedNamedFile(
      roots.high_water,
      HIGH_WATER_NAME,
      MAX_HIGH_WATER_BYTES,
      false,
      "receipt_writer_high_water",
    );
    const journalPhase = bytesState(
      currentJournal,
      parsedIntent.before_journal,
      parsedIntent.after_journal,
      "receipt_writer_recovery_journal_unknown",
    );
    const highWaterPhase = bytesState(
      currentHighWater,
      parsedIntent.before_high_water,
      parsedIntent.after_high_water,
      "receipt_writer_recovery_high_water_unknown",
    );

    const redundant =
      ensureRedundantIntentSnapshot(roots, pair, markMutation);
    pair = redundant.pair;
    parsedIntent = redundant.intent;

    if (
      input !== null &&
      !pendingIntentMatchesInput(parsedIntent, input)
    ) {
      fail("receipt_writer_pending_intent_input_changed");
    }

    if (journalPhase === "before") {
      let journalBoundary = null;
      try {
        journalBoundary = openStatePairSnapshot(
          roots,
          parsedIntent.before_journal,
          highWaterPhase === "before"
            ? parsedIntent.before_high_water
            : parsedIntent.after_high_water,
        );
        if (afterRecoveryJournalStateSnapshotHook !== null) {
          if (typeof afterRecoveryJournalStateSnapshotHook !== "function") {
            fail("receipt_writer_test_recovery_journal_state_hook_invalid");
          }
          afterRecoveryJournalStateSnapshotHook(roots, journalBoundary);
        }
        assertIntentPairSnapshotVisible(roots, pair);
        publishJournal(
          roots,
          parsedIntent.before_journal,
          parsedIntent.after_journal,
          markMutation,
          () => {
            assertIntentPairSnapshotVisible(roots, pair);
            assertStatePairSnapshotVisible(roots, journalBoundary);
          },
        );
      } finally {
        closeStatePairSnapshot(journalBoundary);
      }
      if (crashAfter === "after_recovery_journal") {
        fail("receipt_writer_test_crash_after_recovery_journal");
      }
    }
    if (highWaterPhase === "before") {
      let highWaterBoundary = null;
      try {
        highWaterBoundary = openStatePairSnapshot(
          roots,
          parsedIntent.after_journal,
          parsedIntent.before_high_water,
        );
        if (afterRecoveryHighWaterStateSnapshotHook !== null) {
          if (typeof afterRecoveryHighWaterStateSnapshotHook !== "function") {
            fail("receipt_writer_test_recovery_high_water_state_hook_invalid");
          }
          afterRecoveryHighWaterStateSnapshotHook(
            roots,
            highWaterBoundary,
          );
        }
        assertIntentPairSnapshotVisible(roots, pair);
        publishHighWater(
          roots,
          parsedIntent.before_high_water,
          parsedIntent.after_high_water,
          markMutation,
          () => {
            assertIntentPairSnapshotVisible(roots, pair);
            assertStatePairSnapshotVisible(roots, highWaterBoundary);
          },
        );
      } finally {
        closeStatePairSnapshot(highWaterBoundary);
      }
      if (crashAfter === "after_recovery_high_water") {
        fail("receipt_writer_test_crash_after_recovery_high_water");
      }
    }

    assertIntentPairSnapshotVisible(roots, pair);
    const post = coherentState(roots);
    if (
      !post.journal.equals(parsedIntent.after_journal) ||
      !post.high_water.equals(parsedIntent.after_high_water) ||
      post.continuity.generation !== parsedIntent.value.generation ||
      post.continuity.tip_receipt_sha256 !==
        parsedIntent.value.receipt_sha256
    ) {
      fail("receipt_writer_recovery_postcheck_failed");
    }
    assertIntentPairSnapshotVisible(roots, pair);
    removeIntentPair(
      roots,
      parsedIntent.bytes,
      markMutation,
      crashAfter,
    );
    const finalState = coherentState(roots);
    return success("recovered", finalState, true, true);
  } finally {
    closeIntentPairSnapshot(pair);
  }
}

async function withWriterLock(input, callback) {
  let roots = null;
  try {
    roots = openRoots(input);
    const withLock = await canonicalLock();
    const orderedLocks = [
      {
        root: roots.journal,
        queue: roots.journal_lock_queue,
      },
      {
        root: roots.high_water,
        queue: roots.high_water_lock_queue,
      },
    ].sort((left, right) => {
      if (left.root.stat.dev < right.root.stat.dev) return -1;
      if (left.root.stat.dev > right.root.stat.dev) return 1;
      if (left.root.stat.ino < right.root.stat.ino) return -1;
      if (left.root.stat.ino > right.root.stat.ino) return 1;
      return left.root.path.localeCompare(right.root.path);
    });
    return await withLock(
      orderedLocks[0].queue.proc_path,
      async () =>
        await withLock(
          orderedLocks[1].queue.proc_path,
          async () => {
            assertRootsVisible(roots);
            return await callback(roots);
          },
        ),
    );
  } finally {
    closeRoots(roots);
  }
}

export async function testOnlyWithCoupledNativeGasReconciliationCustodyReceiptWriterLocksV1(
  input,
  callback,
) {
  if (typeof callback !== "function") {
    fail("receipt_writer_test_lock_callback_required");
  }
  return await withWriterLock(input, callback);
}

async function persistInternal(
  input,
  crashAfter = null,
  {
    afterFreshIntentPairSnapshotHook = null,
    afterJournalStateSnapshotHook = null,
    afterHighWaterStateSnapshotHook = null,
  } = {},
) {
  let mutationPerformed = false;
  const markMutation = () => {
    mutationPerformed = true;
  };
  try {
    return await withWriterLock(input, async (roots) => {
      normalizeReviewedTemps(roots, markMutation);
      const pending = readIntentPair(roots);
      if (pending !== null) {
        return recoverLocked(
          roots,
          markMutation,
          crashAfter,
          input,
          mutationPerformed,
        );
      }

      const state = coherentState(roots);
      const planned =
        planCoupledNativeGasReconciliationCustodyReceiptV1({
          journal_jsonl: state.journal,
          collector_decision: input?.collector_decision,
          source_binding: input?.source_binding,
        });
      if (planned.ok !== true) {
        const idempotent =
          classifyExactTipIdempotentRetry(state, input);
        if (idempotent !== null) {
          assertRootsVisible(roots);
          return success("idempotent", state, mutationPerformed, false);
        }
        return held(
          "receipt_writer_plan_" +
            String(planned.reason || "held"),
          mutationPerformed,
        );
      }
      const append = Buffer.from(planned.append_jsonl, "utf8");
      const nextJournal = Buffer.concat([state.journal, append]);
      const nextHighWater = highWaterBytes(nextJournal);
      const intent = intentBytes({
        beforeJournal: state.journal,
        appendJsonl: planned.append_jsonl,
        beforeHighWater: state.high_water,
        afterHighWater: nextHighWater,
        generation: planned.generation,
        receiptSha256: planned.receipt_sha256,
      });

      let freshIntentPair = null;
      try {
        freshIntentPair = createIntentPairSnapshot(
          roots,
          intent,
          crashAfter,
          markMutation,
        );
        if (afterFreshIntentPairSnapshotHook !== null) {
          if (typeof afterFreshIntentPairSnapshotHook !== "function") {
            fail("receipt_writer_test_fresh_intent_hook_invalid");
          }
          afterFreshIntentPairSnapshotHook(roots, freshIntentPair);
        }

        const assertFreshIntent = () =>
          assertIntentPairSnapshotVisible(roots, freshIntentPair);

        let journalBoundary = null;
        try {
          journalBoundary = openStatePairSnapshot(
            roots,
            state.journal,
            state.high_water,
          );
          if (afterJournalStateSnapshotHook !== null) {
            if (typeof afterJournalStateSnapshotHook !== "function") {
              fail("receipt_writer_test_journal_state_hook_invalid");
            }
            afterJournalStateSnapshotHook(roots, journalBoundary);
          }
          assertFreshIntent();
          publishJournal(
            roots,
            state.journal,
            nextJournal,
            markMutation,
            () => {
              assertFreshIntent();
              assertStatePairSnapshotVisible(roots, journalBoundary);
            },
          );
        } finally {
          closeStatePairSnapshot(journalBoundary);
        }
        if (crashAfter === "after_journal_write") {
          fail("receipt_writer_test_crash_after_journal_write");
        }

        let highWaterBoundary = null;
        try {
          highWaterBoundary = openStatePairSnapshot(
            roots,
            nextJournal,
            state.high_water,
          );
          if (afterHighWaterStateSnapshotHook !== null) {
            if (typeof afterHighWaterStateSnapshotHook !== "function") {
              fail("receipt_writer_test_high_water_state_hook_invalid");
            }
            afterHighWaterStateSnapshotHook(
              roots,
              highWaterBoundary,
            );
          }
          assertFreshIntent();
          publishHighWater(
            roots,
            state.high_water,
            nextHighWater,
            markMutation,
            () => {
              assertFreshIntent();
              assertStatePairSnapshotVisible(roots, highWaterBoundary);
            },
          );
        } finally {
          closeStatePairSnapshot(highWaterBoundary);
        }
        if (crashAfter === "after_high_water_write") {
          fail("receipt_writer_test_crash_after_high_water_write");
        }

        assertFreshIntent();
        const post = coherentState(roots);
        if (
          !post.journal.equals(nextJournal) ||
          !post.high_water.equals(nextHighWater) ||
          post.continuity.generation !== planned.generation ||
          post.continuity.tip_receipt_sha256 !== planned.receipt_sha256
        ) {
          fail("receipt_writer_persist_postcheck_failed");
        }
        assertFreshIntent();
        removeIntentPair(
          roots,
          intent,
          markMutation,
          crashAfter,
        );
        const finalState = coherentState(roots);
        return success("persisted", finalState, true, false);
      } finally {
        closeIntentPairSnapshot(freshIntentPair);
      }
    });
  } catch (error) {
    return held(
      error instanceof Error ? error.message : String(error),
      mutationPerformed,
    );
  }
}

export async function persistCoupledNativeGasReconciliationCustodyReceiptWriterV1(
  input,
) {
  return await persistInternal(input, null);
}

export async function recoverCoupledNativeGasReconciliationCustodyReceiptWriterV1(
  input,
) {
  let mutationPerformed = false;
  const markMutation = () => {
    mutationPerformed = true;
  };
  try {
    return await withWriterLock(input, async (roots) => {
      normalizeReviewedTemps(roots, markMutation);
      if (readIntentPair(roots) === null && mutationPerformed) {
        const state = coherentState(roots);
        return success("recovered", state, true, true);
      }
      return recoverLocked(roots, markMutation, null);
    });
  } catch (error) {
    return held(
      error instanceof Error ? error.message : String(error),
      mutationPerformed,
    );
  }
}

export async function inspectCoupledNativeGasReconciliationCustodyReceiptWriterV1(
  input,
) {
  try {
    return await withWriterLock(input, async (roots) => {
      if (
        hasReviewedTempForName(
          roots.journal,
          INTENT_NAME,
          "receipt_writer_journal_intent",
        ) ||
        hasReviewedTempForName(
          roots.high_water,
          INTENT_NAME,
          "receipt_writer_high_water_intent",
        ) ||
        hasReviewedTempForName(
          roots.journal,
          JOURNAL_NAME,
          "receipt_writer_journal",
        ) ||
        hasReviewedTempForName(
          roots.high_water,
          HIGH_WATER_NAME,
          "receipt_writer_high_water",
        ) ||
        readIntentPair(roots) !== null
      ) {
        return held("receipt_writer_recovery_required", false);
      }
      const state = coherentState(roots);
      return success("clean", state, false, false);
    });
  } catch (error) {
    return held(error instanceof Error ? error.message : String(error), false);
  }
}

export async function testOnlyRecoverCoupledNativeGasReconciliationCustodyReceiptWriterIntentFileSwapV1(
  input,
  which = "journal",
) {
  if (which !== "journal" && which !== "high_water") {
    return held("receipt_writer_test_intent_swap_target_invalid", false);
  }
  let target = null;
  let displaced = null;
  let replacementCreated = false;
  let mutationPerformed = false;
  const markMutation = () => {
    mutationPerformed = true;
  };
  try {
    return await withWriterLock(input, async (roots) => {
      normalizeReviewedTemps(roots, markMutation);
      const directory =
        which === "high_water" ? roots.high_water : roots.journal;
      target = path.join(directory.path, INTENT_NAME);
      displaced =
        target + ".test-intent-displaced-" + process.pid + "-" + which;
      const replace = () => {
        const bytes = fs.readFileSync(target);
        fs.renameSync(target, displaced);
        fs.writeFileSync(target, bytes, { mode: 0o600 });
        replacementCreated = true;
      };
      return recoverLocked(
        roots,
        markMutation,
        null,
        null,
        mutationPerformed,
        {
          afterJournalIntentReadHook:
            which === "journal" ? replace : null,
          afterHighWaterIntentReadHook:
            which === "high_water" ? replace : null,
        },
      );
    });
  } catch (error) {
    return held(
      error instanceof Error ? error.message : String(error),
      mutationPerformed,
    );
  } finally {
    try {
      if (replacementCreated && target && fs.existsSync(target)) {
        fs.unlinkSync(target);
      }
      if (displaced && target && fs.existsSync(displaced)) {
        fs.renameSync(displaced, target);
      }
    } catch (error) {
      void error;
    }
  }
}

export async function testOnlyPersistCoupledNativeGasReconciliationCustodyReceiptWriterFreshIntentFileSwapV1(
  input,
  which = "journal",
) {
  if (which !== "journal" && which !== "high_water") {
    return held("receipt_writer_test_fresh_intent_swap_target_invalid", false);
  }
  let target = null;
  let displaced = null;
  let replacementCreated = false;
  try {
    return await persistInternal(
      input,
      null,
      {
        afterFreshIntentPairSnapshotHook(roots) {
          const directory =
            which === "high_water" ? roots.high_water : roots.journal;
          target = path.join(directory.path, INTENT_NAME);
          displaced =
            target +
            ".test-fresh-intent-displaced-" +
            process.pid +
            "-" +
            which;
          const bytes = fs.readFileSync(target);
          fs.renameSync(target, displaced);
          fs.writeFileSync(target, bytes, { mode: 0o600 });
          fs.fsyncSync(directory.fd);
          replacementCreated = true;
        },
      },
    );
  } finally {
    try {
      if (replacementCreated && target && fs.existsSync(target)) {
        fs.unlinkSync(target);
      }
      if (displaced && target && fs.existsSync(displaced)) {
        fs.renameSync(displaced, target);
      }
    } catch (error) {
      void error;
    }
  }
}

export async function testOnlyPersistCoupledNativeGasReconciliationCustodyReceiptWriterPeerStateSwapV1(
  input,
  phase = "before_journal",
) {
  if (phase !== "before_journal" && phase !== "before_high_water") {
    return held("receipt_writer_test_peer_state_swap_phase_invalid", false);
  }
  let target = null;
  let displaced = null;
  let replacementCreated = false;
  try {
    return await persistInternal(
      input,
      null,
      {
        afterJournalStateSnapshotHook:
          phase === "before_journal"
            ? (roots) => {
                target = path.join(
                  roots.high_water.path,
                  HIGH_WATER_NAME,
                );
                displaced =
                  target +
                  ".test-peer-state-displaced-" +
                  process.pid +
                  "-high-water";
                const bytes = fs.readFileSync(target);
                fs.renameSync(target, displaced);
                fs.writeFileSync(target, bytes, { mode: 0o600 });
                fs.fsyncSync(roots.high_water.fd);
                replacementCreated = true;
              }
            : null,
        afterHighWaterStateSnapshotHook:
          phase === "before_high_water"
            ? (roots) => {
                target = path.join(
                  roots.journal.path,
                  JOURNAL_NAME,
                );
                displaced =
                  target +
                  ".test-peer-state-displaced-" +
                  process.pid +
                  "-journal";
                const bytes = fs.readFileSync(target);
                fs.renameSync(target, displaced);
                fs.writeFileSync(target, bytes, { mode: 0o600 });
                fs.fsyncSync(roots.journal.fd);
                replacementCreated = true;
              }
            : null,
      },
    );
  } finally {
    try {
      if (replacementCreated && target && fs.existsSync(target)) {
        fs.unlinkSync(target);
      }
      if (displaced && target && fs.existsSync(displaced)) {
        fs.renameSync(displaced, target);
      }
    } catch (error) {
      void error;
    }
  }
}

export async function testOnlyPersistCoupledNativeGasReconciliationCustodyReceiptWriterCrashV1(
  input,
  phase,
) {
  const allowed = new Set([
    "after_journal_intent",
    "after_high_water_intent",
    "after_journal_write",
    "after_high_water_write",
    "after_journal_intent_remove",
  ]);
  if (!allowed.has(phase)) {
    return held("receipt_writer_test_crash_phase_invalid", false);
  }
  return await persistInternal(input, phase);
}

export function testOnlyInspectCoupledNativeGasReconciliationCustodyReceiptWriterFileSwapV1(
  input,
  which = "journal",
) {
  let roots = null;
  let displaced = null;
  let replacementCreated = false;
  try {
    roots = openRoots(input);
    const directory =
      which === "high_water" ? roots.high_water : roots.journal;
    const name =
      which === "high_water" ? HIGH_WATER_NAME : JOURNAL_NAME;
    const target = path.join(directory.path, name);
    displaced = target + ".test-displaced-" + process.pid;
    const replace = () => {
      const bytes = fs.readFileSync(target);
      fs.renameSync(target, displaced);
      fs.writeFileSync(target, bytes, { mode: 0o600 });
      replacementCreated = true;
    };
    const state = coherentState(
      roots,
      which === "journal" ? replace : null,
      which === "high_water" ? replace : null,
    );
    return success("clean", state, false, false);
  } catch (error) {
    return held(error instanceof Error ? error.message : String(error), false);
  } finally {
    if (roots) {
      const directory =
        which === "high_water" ? roots.high_water : roots.journal;
      const name =
        which === "high_water" ? HIGH_WATER_NAME : JOURNAL_NAME;
      const target = path.join(directory.path, name);
      try {
        if (replacementCreated && fs.existsSync(target)) {
          fs.unlinkSync(target);
        }
        if (displaced && fs.existsSync(displaced)) {
          fs.renameSync(displaced, target);
        }
      } catch (error) {
        void error;
      }
      closeRoots(roots);
    }
  }
}

export function testOnlyInspectCoupledNativeGasReconciliationCustodyReceiptWriterRootSwapV1(
  input,
  which = "journal",
) {
  let roots = null;
  let displaced = null;
  let replacementCreated = false;
  try {
    roots = openRoots(input);
    const selected = which === "high_water" ? roots.high_water : roots.journal;
    displaced = selected.path + ".test-displaced-" + process.pid;
    const state = coherentState(roots, () => {
      fs.renameSync(selected.path, displaced);
      fs.mkdirSync(selected.path, { mode: 0o700 });
      replacementCreated = true;
    });
    return success("clean", state, false, false);
  } catch (error) {
    return held(error instanceof Error ? error.message : String(error), false);
  } finally {
    if (roots) {
      const selected = which === "high_water" ? roots.high_water : roots.journal;
      try {
        if (replacementCreated && fs.existsSync(selected.path)) {
          fs.rmSync(selected.path, { recursive: true, force: true });
        }
        if (displaced && fs.existsSync(displaced)) {
          fs.renameSync(displaced, selected.path);
        }
      } catch (error) {
        void error;
      }
      closeRoots(roots);
    }
  }
}
