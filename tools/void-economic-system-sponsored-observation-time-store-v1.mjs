import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { types as utilTypes } from "node:util";

import {
  VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_RECEIPT_V1,
  VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_V1,
  canonicalVoidEconomicSystemSponsoredObservationTimeReceiptBytesV1,
  createVoidEconomicSystemSponsoredObservationTimeV1,
  verifyVoidEconomicSystemSponsoredObservationTimeReceiptV1,
} from "./void-economic-system-sponsored-observation-time-v1.mjs";

export const VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_V1 =
  "VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_V1";

export const VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_AUTHORITY_V1 =
  Object.freeze({
    source_only_store: true,
    canonical_observation_contract_reused: true,
    caller_prior_receipt_input: false,
    caller_timestamp_input: false,
    append_only_history: true,
    unique_receipt_chain_enforced: true,
    serialized_observation: true,
    descriptor_bound_reads: true,
    create_once_publication: true,
    historical_receipts_retained: true,
    read_only_cleanup: false,
    storage_bootstrap: false,
    caller_selected_record_path: false,
    filesystem_read: true,
    filesystem_write: true,
    trusted_clock_source_proven: false,
    trusted_clock_host_binding_proven: false,
    receipt_store_rollback_resistance_proven: false,
    cross_process_restart_continuity_proven: false,
    cross_boot_restart_continuity_proven: false,
    root_path_stability_proven: false,
    runtime_route_mount: false,
    runtime_enforcement_verified: false,
    gas_sponsorship_performed: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    public_presale_activation: false,
    market_activation: false,
    funds_movement: false,
  });

const RECEIPT_SCHEMA =
  "void.economic-system-sponsored-observation-time-receipt.v1";
const RECORDS_DIRECTORY = "records";
const LOCK_NAME = "observation-time-v1";
const MAX_RECORD_BYTES = 64 * 1024;
const MAX_RECORDS = 1_000_000;
const O_NOFOLLOW = fs.constants.O_NOFOLLOW;
const O_DIRECTORY = fs.constants.O_DIRECTORY;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const DECIMAL = /^(0|[1-9][0-9]*)$/u;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const RECORD_NAME = /^[0-9a-f]{64}\.json$/u;
const MAX_UINT64 = (1n << 64n) - 1n;
const MAX_MONOTONIC = (1n << 127n) - 1n;
const NS_PER_MS = 1_000_000n;

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
    return (
      "{" +
      Object.keys(value)
        .sort(compareText)
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
        .join(",") +
      "}"
    );
  }
  fail("SPONSORED_OBSERVATION_TIME_STORE_NONCANONICAL_VALUE");
}

function exactSnapshot(value, keys, code) {
  if (
    !value ||
    typeof value !== "object" ||
    utilTypes.isProxy(value) ||
    Array.isArray(value)
  ) {
    fail(code);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const own = Reflect.ownKeys(descriptors);
  if (own.some((key) => typeof key !== "string")) fail(code);
  const actual = own.slice().sort(compareText);
  const wanted = [...keys].sort(compareText);
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
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

function currentUid() {
  if (typeof process.getuid !== "function") {
    fail("SPONSORED_OBSERVATION_TIME_STORE_UID_UNAVAILABLE");
  }
  return BigInt(process.getuid());
}

function validateAncestor(stat) {
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    fail("SPONSORED_OBSERVATION_TIME_STORE_ANCESTOR_INVALID");
  }
  const uid = currentUid();
  if (stat.uid !== 0n && stat.uid !== uid) {
    fail("SPONSORED_OBSERVATION_TIME_STORE_ANCESTOR_OWNER_INVALID");
  }
  const writable = (stat.mode & 0o022n) !== 0n;
  const sticky = (stat.mode & 0o1000n) !== 0n;
  if (writable && !sticky) {
    fail("SPONSORED_OBSERVATION_TIME_STORE_ANCESTOR_WRITABLE");
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

function requireDescriptorSafety() {
  if (
    typeof O_NOFOLLOW !== "number" ||
    typeof O_DIRECTORY !== "number" ||
    !fs.existsSync("/proc/self/fd")
  ) {
    fail("SPONSORED_OBSERVATION_TIME_STORE_DESCRIPTOR_SAFETY_UNAVAILABLE");
  }
}

function openPinnedDirectory(directoryPath, code) {
  requireDescriptorSafety();
  if (
    typeof directoryPath !== "string" ||
    !directoryPath ||
    !path.isAbsolute(directoryPath) ||
    directoryPath.includes("\0")
  ) {
    fail(code + "_PATH_INVALID");
  }
  const resolved = path.resolve(directoryPath);
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
    validateAncestor(fs.fstatSync(fd, { bigint: true }));
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      if (!part || part === "." || part === "..") {
        fail(code + "_ANCESTOR_COMPONENT_INVALID");
      }
      const next = fs.openSync(
        path.join("/proc/self/fd", String(fd), part),
        fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
      );
      const stat = fs.fstatSync(next, { bigint: true });
      if (index === parts.length - 1) {
        validatePrivateDirectory(stat, code + "_INVALID");
      } else {
        validateAncestor(stat);
      }
      fs.closeSync(fd);
      fd = next;
    }
    const visible = fs.lstatSync(resolved, { bigint: true });
    const opened = fs.fstatSync(fd, { bigint: true });
    validatePrivateDirectory(visible, code + "_INVALID");
    validatePrivateDirectory(opened, code + "_INVALID");
    if (!sameDirectoryIdentity(visible, opened)) {
      fail(code + "_PATH_NOT_BOUND");
    }
    const result = Object.freeze({
      path: resolved,
      fd,
      stat: opened,
      proc_path: "/proc/self/fd/" + String(fd),
    });
    fd = -1;
    return result;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("SPONSORED_OBSERVATION_TIME_STORE_")
    ) {
      throw error;
    }
    fail(code + "_ANCESTOR_WALK_FAILED");
  } finally {
    if (fd >= 0) fs.closeSync(fd);
  }
}

function assertPinnedDirectoryVisible(directory, code) {
  const opened = fs.fstatSync(directory.fd, { bigint: true });
  const visible = fs.lstatSync(directory.path, { bigint: true });
  validatePrivateDirectory(opened, code + "_INVALID");
  validatePrivateDirectory(visible, code + "_INVALID");
  if (
    !sameDirectoryIdentity(directory.stat, opened) ||
    !sameDirectoryIdentity(opened, visible)
  ) {
    fail(code + "_CHANGED");
  }
}

function openRecordsDirectory(root) {
  assertPinnedDirectoryVisible(
    root,
    "SPONSORED_OBSERVATION_TIME_STORE_ROOT",
  );
  const visiblePath = path.join(root.path, RECORDS_DIRECTORY);
  const pinnedPath = path.join(root.proc_path, RECORDS_DIRECTORY);
  const visible = fs.lstatSync(visiblePath, { bigint: true });
  validatePrivateDirectory(
    visible,
    "SPONSORED_OBSERVATION_TIME_STORE_RECORDS_DIRECTORY_INVALID",
  );
  const fd = fs.openSync(
    pinnedPath,
    fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
  );
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    validatePrivateDirectory(
      opened,
      "SPONSORED_OBSERVATION_TIME_STORE_RECORDS_DIRECTORY_INVALID",
    );
    if (!sameDirectoryIdentity(visible, opened)) {
      fail("SPONSORED_OBSERVATION_TIME_STORE_RECORDS_DIRECTORY_PATH_NOT_BOUND");
    }
    return Object.freeze({
      path: visiblePath,
      fd,
      stat: opened,
      proc_path: "/proc/self/fd/" + String(fd),
    });
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
}

function validateRecordStat(stat, allowedLinks = 1n) {
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.uid !== currentUid() ||
    stat.nlink !== allowedLinks ||
    (stat.mode & 0o077n) !== 0n ||
    stat.size < 2n ||
    stat.size > BigInt(MAX_RECORD_BYTES)
  ) {
    fail("SPONSORED_OBSERVATION_TIME_STORE_RECORD_FILE_INVALID");
  }
}

function validateTempStat(stat, allowedLinks) {
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.uid !== currentUid() ||
    stat.nlink !== allowedLinks ||
    (stat.mode & 0o077n) !== 0n ||
    stat.size > BigInt(MAX_RECORD_BYTES)
  ) {
    fail("SPONSORED_OBSERVATION_TIME_STORE_TEMP_FILE_INVALID");
  }
}

function readExactRecord(records, name) {
  if (!RECORD_NAME.test(name)) {
    fail("SPONSORED_OBSERVATION_TIME_STORE_RECORD_NAME_INVALID");
  }
  assertPinnedDirectoryVisible(
    records,
    "SPONSORED_OBSERVATION_TIME_STORE_RECORDS_DIRECTORY",
  );
  const visiblePath = path.join(records.path, name);
  const pinnedPath = path.join(records.proc_path, name);
  const before = fs.lstatSync(visiblePath, { bigint: true });
  validateRecordStat(before);
  const fd = fs.openSync(
    pinnedPath,
    fs.constants.O_RDONLY | O_NOFOLLOW,
  );
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    validateRecordStat(opened);
    if (!sameFileIdentity(before, opened)) {
      fail("SPONSORED_OBSERVATION_TIME_STORE_RECORD_PATH_NOT_BOUND");
    }
    const size = Number(opened.size);
    if (!Number.isSafeInteger(size) || size < 2 || size > MAX_RECORD_BYTES) {
      fail("SPONSORED_OBSERVATION_TIME_STORE_RECORD_SIZE_INVALID");
    }
    const bytes = Buffer.alloc(size);
    let offset = 0;
    while (offset < size) {
      const count = fs.readSync(fd, bytes, offset, size - offset, offset);
      if (count <= 0) {
        fail("SPONSORED_OBSERVATION_TIME_STORE_RECORD_SHORT_READ");
      }
      offset += count;
    }
    const after = fs.fstatSync(fd, { bigint: true });
    const visibleAfter = fs.lstatSync(visiblePath, { bigint: true });
    validateRecordStat(after);
    validateRecordStat(visibleAfter);
    if (
      !sameFileIdentity(opened, after) ||
      !sameFileIdentity(after, visibleAfter)
    ) {
      fail("SPONSORED_OBSERVATION_TIME_STORE_RECORD_CHANGED_DURING_READ");
    }
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}

function parseReceiptBytes(bytes, expectedName) {
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail("SPONSORED_OBSERVATION_TIME_STORE_RECORD_JSON_INVALID");
  }
  let receipt;
  let canonicalBytes;
  try {
    receipt =
      verifyVoidEconomicSystemSponsoredObservationTimeReceiptV1(value);
    canonicalBytes =
      canonicalVoidEconomicSystemSponsoredObservationTimeReceiptBytesV1(
        receipt,
      );
  } catch {
    fail("SPONSORED_OBSERVATION_TIME_STORE_RECORD_RECEIPT_INVALID");
  }
  if (!bytes.equals(canonicalBytes)) {
    fail("SPONSORED_OBSERVATION_TIME_STORE_RECORD_BYTES_NOT_CANONICAL");
  }
  const expectedFile =
    receipt.receipt_sha256.slice("sha256:".length) + ".json";
  if (expectedName !== expectedFile) {
    fail("SPONSORED_OBSERVATION_TIME_STORE_RECORD_FILENAME_MISMATCH");
  }
  return Object.freeze({
    receipt,
    generation: BigInt(receipt.generation),
    bytes,
    name: expectedFile,
  });
}

function readHistory(records) {
  const namesBefore = fs.readdirSync(records.proc_path).sort(compareText);
  if (namesBefore.some((name) => name.startsWith("."))) {
    fail("SPONSORED_OBSERVATION_TIME_STORE_RECOVERY_REQUIRED");
  }
  const names = namesBefore.filter((name) => !name.startsWith("."));
  if (names.length > MAX_RECORDS) {
    fail("SPONSORED_OBSERVATION_TIME_STORE_RECORD_COUNT_EXCEEDED");
  }
  if (names.some((name) => !RECORD_NAME.test(name))) {
    fail("SPONSORED_OBSERVATION_TIME_STORE_RECORD_NAME_INVALID");
  }
  const rows = names.map((name) =>
    parseReceiptBytes(readExactRecord(records, name), name),
  );
  const namesAfter = fs.readdirSync(records.proc_path).sort(compareText);
  if (namesAfter.some((name) => name.startsWith("."))) {
    fail("SPONSORED_OBSERVATION_TIME_STORE_RECOVERY_REQUIRED");
  }
  if (
    namesAfter.length !== namesBefore.length ||
    namesAfter.some((name, index) => name !== namesBefore[index])
  ) {
    fail("SPONSORED_OBSERVATION_TIME_STORE_DIRECTORY_CHANGED_DURING_READ");
  }
  rows.sort((left, right) =>
    left.generation < right.generation
      ? -1
      : left.generation > right.generation
        ? 1
        : compareText(
            left.receipt.receipt_sha256,
            right.receipt.receipt_sha256,
          ),
  );
  if (rows.length === 0) {
    return Object.freeze({ rows: Object.freeze([]), head: null });
  }
  if (rows[0].generation !== 0n) {
    fail("SPONSORED_OBSERVATION_TIME_STORE_GENESIS_MISSING");
  }
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (row.generation !== BigInt(index)) {
      fail("SPONSORED_OBSERVATION_TIME_STORE_GENERATION_DISCONTINUITY");
    }
    if (index === 0) continue;
    const prior = rows[index - 1];
    if (
      row.receipt.previous_receipt_sha256 !==
        prior.receipt.receipt_sha256
    ) {
      fail("SPONSORED_OBSERVATION_TIME_STORE_PARENT_MISMATCH");
    }
    if (
      row.receipt.boot_id !== prior.receipt.boot_id ||
      row.receipt.process_start_ticks !== prior.receipt.process_start_ticks ||
      row.receipt.baseline_wall_time_ms !==
        prior.receipt.baseline_wall_time_ms ||
      row.receipt.baseline_monotonic_ns !==
        prior.receipt.baseline_monotonic_ns
    ) {
      fail("SPONSORED_OBSERVATION_TIME_STORE_CHAIN_IDENTITY_CHANGED");
    }
    if (
      row.receipt.observed_at_ms < prior.receipt.observed_at_ms ||
      BigInt(row.receipt.monotonic_ns) <=
        BigInt(prior.receipt.monotonic_ns)
    ) {
      fail("SPONSORED_OBSERVATION_TIME_STORE_CHAIN_NOT_FORWARD");
    }
  }
  return Object.freeze({
    rows: Object.freeze(rows),
    head: rows[rows.length - 1],
  });
}

function tempName(finalName) {
  return (
    "." +
    finalName +
    ".tmp-" +
    String(process.pid) +
    "-" +
    crypto.randomBytes(8).toString("hex")
  );
}

function cleanupTemps(records, markMutation) {
  const pattern =
    /^\.([0-9a-f]{64}\.json)\.tmp-[1-9][0-9]*-[0-9a-f]{16}$/u;
  let changed = false;
  for (const name of fs.readdirSync(records.proc_path)) {
    if (!name.startsWith(".")) continue;
    const match = pattern.exec(name);
    if (!match) {
      fail("SPONSORED_OBSERVATION_TIME_STORE_TEMP_NAME_INVALID");
    }
    const tempPath = path.join(records.proc_path, name);
    const temp = fs.lstatSync(tempPath, { bigint: true });
    if (temp.nlink === 1n) {
      validateTempStat(temp, 1n);
      fs.unlinkSync(tempPath);
      markMutation();
      changed = true;
      continue;
    }
    validateTempStat(temp, 2n);
    const finalPath = path.join(records.proc_path, match[1]);
    const final = fs.lstatSync(finalPath, { bigint: true });
    validateRecordStat(final, 2n);
    if (temp.dev !== final.dev || temp.ino !== final.ino) {
      fail("SPONSORED_OBSERVATION_TIME_STORE_TEMP_BINDING_INVALID");
    }
    parseReceiptBytes(
      readExactRecord(records, match[1]),
      match[1],
    );
    fs.unlinkSync(tempPath);
    markMutation();
    changed = true;
  }
  if (changed) fs.fsyncSync(records.fd);
}

function candidateReceipt(receipt) {
  const verified =
    verifyVoidEconomicSystemSponsoredObservationTimeReceiptV1(receipt);
  const name =
    verified.receipt_sha256.slice("sha256:".length) + ".json";
  const bytes =
    canonicalVoidEconomicSystemSponsoredObservationTimeReceiptBytesV1(
      verified,
    );
  return parseReceiptBytes(bytes, name);
}

function publishReceipt(records, candidate, markMutation) {
  const finalPath = path.join(records.proc_path, candidate.name);
  if (fs.existsSync(finalPath)) {
    const existing = readExactRecord(records, candidate.name);
    if (!existing.equals(candidate.bytes)) {
      fail("SPONSORED_OBSERVATION_TIME_STORE_EXISTING_RECORD_CONFLICT");
    }
    return false;
  }
  const temporary = tempName(candidate.name);
  const tempPath = path.join(records.proc_path, temporary);
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
    markMutation();
    let offset = 0;
    while (offset < candidate.bytes.length) {
      const written = fs.writeSync(
        fd,
        candidate.bytes,
        offset,
        candidate.bytes.length - offset,
        null,
      );
      if (written <= 0) {
        fail("SPONSORED_OBSERVATION_TIME_STORE_RECORD_SHORT_WRITE");
      }
      offset += written;
    }
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = -1;
    fs.linkSync(tempPath, finalPath);
    fs.fsyncSync(records.fd);
    fs.unlinkSync(tempPath);
    fs.fsyncSync(records.fd);
    const published = readExactRecord(records, candidate.name);
    if (!published.equals(candidate.bytes)) {
      fail("SPONSORED_OBSERVATION_TIME_STORE_PUBLICATION_POSTCHECK_FAILED");
    }
    return true;
  } finally {
    if (fd >= 0) {
      try {
        fs.closeSync(fd);
      } catch (error) {
        void error;
      }
    }
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
        fs.fsyncSync(records.fd);
      }
    } catch (error) {
      void error;
    }
  }
}

async function canonicalLock() {
  const module = await import(
    "../dist/economic/buy_void_filesystem_bakery_lock_v1.js"
  );
  if (
    typeof module.withBuyVoidFilesystemBakeryLockAsyncV1 !== "function"
  ) {
    fail("SPONSORED_OBSERVATION_TIME_STORE_LOCK_UNAVAILABLE");
  }
  return module.withBuyVoidFilesystemBakeryLockAsyncV1;
}

function held(reason, mutationPerformed = false, observationPerformed = false) {
  return Object.freeze({
    ok: false,
    status: "held",
    marker: VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_V1,
    version: 1,
    reason: String(reason || "SPONSORED_OBSERVATION_TIME_STORE_HELD").slice(
      0,
      220,
    ),
    mutation_performed: mutationPerformed === true,
    observation_performed: observationPerformed === true,
    accepted_observed_at_ms: null,
    head_receipt_sha256: null,
    trusted_clock_source_proven: false,
    trusted_clock_host_binding_proven: false,
    receipt_store_rollback_resistance_proven: false,
    cross_process_restart_continuity_proven: false,
    cross_boot_restart_continuity_proven: false,
    runtime_enforcement_verified: false,
    gas_sponsorship_performed: false,
    transaction_submission: false,
    transaction_broadcast: false,
    funds_movement: false,
    authority:
      VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_AUTHORITY_V1,
  });
}

function success(receipt, mutationPerformed, count) {
  return Object.freeze({
    ok: true,
    status: "source_accepted",
    marker: VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_V1,
    version: 1,
    mutation_performed: mutationPerformed === true,
    observation_performed: true,
    accepted_observed_at_ms: receipt.observed_at_ms,
    generation: receipt.generation,
    head_receipt_sha256: receipt.receipt_sha256,
    durable_receipt_count: count,
    durable_receipt_storage_proven: true,
    trusted_clock_source_proven: false,
    trusted_clock_host_binding_proven: false,
    receipt_store_rollback_resistance_proven: false,
    cross_process_restart_continuity_proven: false,
    cross_boot_restart_continuity_proven: false,
    runtime_enforcement_verified: false,
    gas_sponsorship_performed: false,
    transaction_submission: false,
    transaction_broadcast: false,
    funds_movement: false,
    authority:
      VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_AUTHORITY_V1,
  });
}

function inspectSuccess(history) {
  return Object.freeze({
    ok: true,
    status: "source_inspected",
    marker: VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_V1,
    version: 1,
    mutation_performed: false,
    durable_receipt_count: history.rows.length,
    head_receipt_sha256:
      history.head?.receipt.receipt_sha256 || null,
    head_generation:
      history.head?.receipt.generation || null,
    head_observed_at_ms:
      history.head?.receipt.observed_at_ms ?? null,
    durable_receipt_storage_proven: true,
    trusted_clock_source_proven: false,
    trusted_clock_host_binding_proven: false,
    receipt_store_rollback_resistance_proven: false,
    cross_process_restart_continuity_proven: false,
    cross_boot_restart_continuity_proven: false,
    runtime_enforcement_verified: false,
    gas_sponsorship_performed: false,
    transaction_submission: false,
    transaction_broadcast: false,
    funds_movement: false,
    authority:
      VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_AUTHORITY_V1,
  });
}

export function createVoidEconomicSystemSponsoredObservationTimeStoreV1(input) {
  const binding = exactSnapshot(
    input,
    ["root_dir", "trustedClock"],
    "SPONSORED_OBSERVATION_TIME_STORE_BINDING_INVALID",
  );
  if (
    typeof binding.root_dir !== "string" ||
    !path.isAbsolute(binding.root_dir) ||
    binding.root_dir.includes("\0")
  ) {
    fail("SPONSORED_OBSERVATION_TIME_STORE_ROOT_PATH_INVALID");
  }
  if (typeof binding.trustedClock !== "function") {
    fail("SPONSORED_OBSERVATION_TIME_STORE_CLOCK_INVALID");
  }
  const rootPath = path.resolve(binding.root_dir);
  if (rootPath !== binding.root_dir) {
    fail("SPONSORED_OBSERVATION_TIME_STORE_ROOT_PATH_INVALID");
  }
  const trustedClock = binding.trustedClock;

  return Object.freeze({
    marker: VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_V1,
    version: 1,
    caller_prior_receipt_input: false,
    caller_timestamp_input: false,
    runtime_enforcement_verified: false,

    async observe(...args) {
      if (args.length !== 0) {
        return held(
          "SPONSORED_OBSERVATION_TIME_STORE_REQUEST_INPUT_FORBIDDEN",
          false,
          false,
        );
      }
      let root = null;
      let records = null;
      let mutationPerformed = false;
      let observationPerformed = false;
      const markMutation = () => {
        mutationPerformed = true;
      };
      try {
        root = openPinnedDirectory(
          rootPath,
          "SPONSORED_OBSERVATION_TIME_STORE_ROOT",
        );
        records = openRecordsDirectory(root);
        const withLock = await canonicalLock();
        const lockPath = path.join(root.proc_path, LOCK_NAME);
        return await withLock(lockPath, async () => {
          assertPinnedDirectoryVisible(
            root,
            "SPONSORED_OBSERVATION_TIME_STORE_ROOT",
          );
          assertPinnedDirectoryVisible(
            records,
            "SPONSORED_OBSERVATION_TIME_STORE_RECORDS_DIRECTORY",
          );
          cleanupTemps(records, markMutation);
          const before = readHistory(records);
          const source =
            createVoidEconomicSystemSponsoredObservationTimeV1({
              trustedClock,
            });
          const observed = source.observe({
            prior_receipt: before.head?.receipt || null,
          });
          observationPerformed = observed.observation_performed === true;
          if (!observed.ok) {
            return held(
              observed.reason,
              mutationPerformed,
              observationPerformed,
            );
          }
          const candidate = candidateReceipt(observed.receipt);
          assertPinnedDirectoryVisible(
            root,
            "SPONSORED_OBSERVATION_TIME_STORE_ROOT",
          );
          assertPinnedDirectoryVisible(
            records,
            "SPONSORED_OBSERVATION_TIME_STORE_RECORDS_DIRECTORY",
          );
          publishReceipt(records, candidate, markMutation);
          assertPinnedDirectoryVisible(
            root,
            "SPONSORED_OBSERVATION_TIME_STORE_ROOT",
          );
          assertPinnedDirectoryVisible(
            records,
            "SPONSORED_OBSERVATION_TIME_STORE_RECORDS_DIRECTORY",
          );
          const after = readHistory(records);
          if (
            after.rows.length !== before.rows.length + 1 ||
            after.head?.receipt.receipt_sha256 !==
              candidate.receipt.receipt_sha256 ||
            after.head?.receipt.generation !==
              candidate.receipt.generation
          ) {
            fail("SPONSORED_OBSERVATION_TIME_STORE_POSTCHECK_FAILED");
          }
          assertPinnedDirectoryVisible(
            root,
            "SPONSORED_OBSERVATION_TIME_STORE_ROOT",
          );
          assertPinnedDirectoryVisible(
            records,
            "SPONSORED_OBSERVATION_TIME_STORE_RECORDS_DIRECTORY",
          );
          return success(
            candidate.receipt,
            mutationPerformed,
            after.rows.length,
          );
        });
      } catch (error) {
        return held(
          error instanceof Error
            ? error.message
            : "SPONSORED_OBSERVATION_TIME_STORE_FAILED",
          mutationPerformed,
          observationPerformed,
        );
      } finally {
        if (records?.fd >= 0) {
          try {
            fs.closeSync(records.fd);
          } catch (error) {
            void error;
          }
        }
        if (root?.fd >= 0) {
          try {
            fs.closeSync(root.fd);
          } catch (error) {
            void error;
          }
        }
      }
    },

    inspect(...args) {
      if (args.length !== 0) {
        return held(
          "SPONSORED_OBSERVATION_TIME_STORE_REQUEST_INPUT_FORBIDDEN",
          false,
          false,
        );
      }
      let root = null;
      let records = null;
      try {
        root = openPinnedDirectory(
          rootPath,
          "SPONSORED_OBSERVATION_TIME_STORE_ROOT",
        );
        records = openRecordsDirectory(root);
        const history = readHistory(records);
        assertPinnedDirectoryVisible(
          root,
          "SPONSORED_OBSERVATION_TIME_STORE_ROOT",
        );
        assertPinnedDirectoryVisible(
          records,
          "SPONSORED_OBSERVATION_TIME_STORE_RECORDS_DIRECTORY",
        );
        return inspectSuccess(history);
      } catch (error) {
        return held(
          error instanceof Error
            ? error.message
            : "SPONSORED_OBSERVATION_TIME_STORE_FAILED",
          false,
          false,
        );
      } finally {
        if (records?.fd >= 0) {
          try {
            fs.closeSync(records.fd);
          } catch (error) {
            void error;
          }
        }
        if (root?.fd >= 0) {
          try {
            fs.closeSync(root.fd);
          } catch (error) {
            void error;
          }
        }
      }
    },
  });
}
