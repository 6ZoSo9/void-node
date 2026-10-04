import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  withBuyVoidFilesystemBakeryLockV1,
} from "./buy_void_filesystem_bakery_lock_v1.js";
import {
  classifyBuyVoidAllocationReservationLedgerV1,
} from "./buy_void_allocation_reservation_ledger_v1.js";
import {
  classifyBuyVoidAllocationReservationHighWaterBindingV1,
} from "./buy_void_allocation_reservation_high_water_v1.js";
import {
  buildBuyVoidAllocationReservationPublicationIntentV1,
  classifyBuyVoidAllocationReservationPublicationRecoveryV1,
} from "./buy_void_allocation_reservation_publication_protocol_v1.js";

export const VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_V1 =
  "VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_V1";

export const VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    filesystem_read: true,
    filesystem_write: true,
    descriptor_bound_reads: true,
    same_uid_private_storage: true,
    separate_storage_roots_required: true,
    shared_serialization_lock: true,
    dual_root_serialization_lock: true,
    redundant_publication_intent: true,
    single_root_mid_publication_recovery: true,
    post_admission_root_path_stability_proven: false,
    single_root_post_publication_recovery: false,
    publication_intent_write: true,
    allocation_ledger_write: true,
    high_water_write: true,
    crash_recovery: true,
    atomic_ledger_publication: true,
    atomic_high_water_publication: true,
    exact_postcheck: true,
    storage_bootstrap: false,
    runtime_integration: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    payment_verified_event_write: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    inventory_funding: false,
    inventory_transfer: false,
    token_transfer: false,
    market_activation: false,
    public_presale_activation: false,
    production_gate_ready: false,
    funds_movement: false,
  });

const LEDGER_NAME = "allocation-reservations-v1.jsonl";
const HIGH_WATER_NAME = "allocation-reservation-high-water-v1.json";
const INTENT_NAME = "allocation-reservation-publication-intent-v1.json";
const LOCK_NAME = ".allocation-reservation-publication-v1";
const MAX_LEDGER_BYTES = 64 * 1024 * 1024;
const MAX_HIGH_WATER_BYTES = 4096;
const MAX_INTENT_BYTES = 256 * 1024;
const O_NOFOLLOW = fs.constants.O_NOFOLLOW;
const O_DIRECTORY = fs.constants.O_DIRECTORY;

function requireDescriptorSafetyV1(): void {
  if (
    typeof O_NOFOLLOW !== "number" ||
    typeof O_DIRECTORY !== "number" ||
    !fs.existsSync("/proc/self/fd")
  ) {
    fail("allocation_reservation_writer_descriptor_safety_unavailable");
  }
}

type PinnedDirectoryV1 = {
  path: string;
  fd: number;
  stat: any;
  proc_path: string;
};

type WriterSuccessV1 = {
  ok: true;
  status: "persisted" | "idempotent" | "recovered" | "clean";
  marker: typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_V1;
  version: 1;
  operation_performed: boolean;
  record_count: number;
  tip_hash: string;
  publication_intent_present: false;
  runtime_integration: false;
  production_gate_ready: false;
  funds_movement: false;
  authority:
    typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_AUTHORITY_V1;
};

type WriterHeldV1 = {
  ok: false;
  status: "held";
  marker: typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_V1;
  version: 1;
  reason: string;
  authority:
    typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_AUTHORITY_V1;
};

export type BuyVoidAllocationReservationPublicationWriterDecisionV1 =
  | WriterSuccessV1
  | WriterHeldV1;

function held(reason: string): WriterHeldV1 {
  return Object.freeze({
    ok: false,
    status: "held",
    marker:
      VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_V1,
    version: 1,
    reason,
    authority:
      VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_AUTHORITY_V1,
  });
}

function fail(code: string): never {
  throw new Error(code);
}

function sameDirectoryIdentity(left: any, right: any): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode
  );
}

function sameFileIdentity(left: any, right: any): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs &&
    left.mode === right.mode &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.nlink === right.nlink
  );
}

function validateDirectoryStat(stat: any, code: string): void {
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    (
      typeof process.getuid === "function" &&
      stat.uid !== BigInt(process.getuid())
    ) ||
    (Number(stat.mode) & 0o077) !== 0
  ) {
    fail(code);
  }
}

function validateFileStat(
  stat: any,
  maxBytes: number,
  allowEmpty: boolean,
  code: string,
  allowedLinks = 1n,
): void {
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.nlink !== allowedLinks ||
    stat.size < (allowEmpty ? 0n : 1n) ||
    stat.size > BigInt(maxBytes) ||
    (
      typeof process.getuid === "function" &&
      stat.uid !== BigInt(process.getuid())
    ) ||
    (Number(stat.mode) & 0o077) !== 0
  ) {
    fail(code);
  }
}

function openPinnedDirectory(
  directoryPath: string,
  code: string,
): PinnedDirectoryV1 {
  requireDescriptorSafetyV1();
  const raw = String(directoryPath || "").trim();
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
    fail(code + "_path_invalid");
  }
  const resolved = path.resolve(raw);
  const visible = fs.lstatSync(resolved, { bigint: true });
  validateDirectoryStat(visible, code + "_invalid");
  const fd = fs.openSync(
    resolved,
    fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
  );
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    validateDirectoryStat(opened, code + "_invalid");
    if (!sameDirectoryIdentity(visible, opened)) {
      fail(code + "_changed");
    }
    return Object.freeze({
      path: resolved,
      fd,
      stat: opened,
      proc_path: "/proc/self/fd/" + String(fd),
    });
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
}

function assertPinnedDirectoryVisible(
  directory: PinnedDirectoryV1,
  code: string,
): void {
  const opened = fs.fstatSync(directory.fd, { bigint: true });
  const visible = fs.lstatSync(directory.path, { bigint: true });
  validateDirectoryStat(opened, code + "_invalid");
  validateDirectoryStat(visible, code + "_invalid");
  if (
    !sameDirectoryIdentity(directory.stat, opened) ||
    !sameDirectoryIdentity(opened, visible)
  ) {
    fail(code + "_changed");
  }
}

function assertDistinctRoots(
  ledgerDirectory: PinnedDirectoryV1,
  highWaterDirectory: PinnedDirectoryV1,
): void {
  const nestedUnder = (parent: string, child: string): boolean => {
    const relative = path.relative(parent, child);
    return (
      relative !== "" &&
      relative !== ".." &&
      !relative.startsWith(".." + path.sep) &&
      !path.isAbsolute(relative)
    );
  };
  if (
    ledgerDirectory.path === highWaterDirectory.path ||
    nestedUnder(ledgerDirectory.path, highWaterDirectory.path) ||
    nestedUnder(highWaterDirectory.path, ledgerDirectory.path) ||
    (
      ledgerDirectory.stat.dev === highWaterDirectory.stat.dev &&
      ledgerDirectory.stat.ino === highWaterDirectory.stat.ino
    )
  ) {
    fail("allocation_reservation_writer_storage_roots_must_be_disjoint");
  }
}

function assertWriterRootsVisible(
  ledgerDirectory: PinnedDirectoryV1,
  highWaterDirectory: PinnedDirectoryV1,
): void {
  assertPinnedDirectoryVisible(
    ledgerDirectory,
    "allocation_reservation_writer_ledger_directory",
  );
  assertPinnedDirectoryVisible(
    highWaterDirectory,
    "allocation_reservation_writer_high_water_directory",
  );
  assertDistinctRoots(ledgerDirectory, highWaterDirectory);
}

function fsyncDirectory(
  directory: PinnedDirectoryV1,
  code: string,
): void {
  assertPinnedDirectoryVisible(directory, code);
  fs.fsyncSync(directory.fd);
}

function readPinnedNamedFile(
  directory: PinnedDirectoryV1,
  name: string,
  maxBytes: number,
  allowEmpty: boolean,
  code: string,
): Buffer {
  if (
    !name ||
    name.includes("/") ||
    name === "." ||
    name === ".."
  ) {
    fail(code + "_name_invalid");
  }
  assertPinnedDirectoryVisible(directory, code + "_directory");
  const visiblePath = path.join(directory.path, name);
  const pinnedPath = path.join(directory.proc_path, name);
  const visibleBefore = fs.lstatSync(visiblePath, { bigint: true });
  validateFileStat(
    visibleBefore,
    maxBytes,
    allowEmpty,
    code + "_file_invalid",
  );
  const fd = fs.openSync(
    pinnedPath,
    fs.constants.O_RDONLY | O_NOFOLLOW,
  );
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    validateFileStat(
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
      fail(code + "_file_invalid");
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
    const visibleAfter = fs.lstatSync(
      visiblePath,
      { bigint: true },
    );
    validateFileStat(
      after,
      maxBytes,
      allowEmpty,
      code + "_file_invalid",
    );
    validateFileStat(
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
    assertPinnedDirectoryVisible(
      directory,
      code + "_directory",
    );
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}

function readOptionalPinnedNamedFile(
  directory: PinnedDirectoryV1,
  name: string,
  maxBytes: number,
  allowEmpty: boolean,
  code: string,
): Buffer | null {
  assertPinnedDirectoryVisible(directory, code + "_directory");
  const visiblePath = path.join(directory.path, name);
  const pinnedPath = path.join(directory.proc_path, name);
  let visibleMissing = false;
  let pinnedMissing = false;
  try {
    fs.lstatSync(visiblePath, { bigint: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") throw error;
    visibleMissing = true;
  }
  try {
    fs.lstatSync(pinnedPath, { bigint: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") throw error;
    pinnedMissing = true;
  }
  if (visibleMissing || pinnedMissing) {
    if (visibleMissing !== pinnedMissing) {
      fail(code + "_presence_mismatch");
    }
    assertPinnedDirectoryVisible(directory, code + "_directory");
    return null;
  }
  return readPinnedNamedFile(
    directory,
    name,
    maxBytes,
    allowEmpty,
    code,
  );
}

function writeAll(fd: number, bytes: Buffer, code: string): void {
  let offset = 0;
  while (offset < bytes.length) {
    const written = fs.writeSync(
      fd,
      bytes,
      offset,
      bytes.length - offset,
      null,
    );
    if (written <= 0) fail(code + "_short_write");
    offset += written;
  }
}

function temporaryName(name: string): string {
  return (
    "." +
    name +
    ".tmp-" +
    String(process.pid) +
    "-" +
    crypto.randomBytes(8).toString("hex")
  );
}

function cleanupIntentTemps(
  directory: PinnedDirectoryV1,
): void {
  assertPinnedDirectoryVisible(
    directory,
    "allocation_reservation_writer_intent_directory",
  );
  const prefix = "." + INTENT_NAME + ".tmp-";
  let changed = false;
  for (const name of fs.readdirSync(directory.proc_path)) {
    if (!name.startsWith(prefix)) continue;
    if (
      !/^\.allocation-reservation-publication-intent-v1\.json\.tmp-[1-9][0-9]*-[0-9a-f]{16}$/u.test(
        name,
      )
    ) {
      fail("allocation_reservation_writer_intent_temp_name_invalid");
    }
    const tempPath = path.join(directory.proc_path, name);
    const temp = fs.lstatSync(tempPath, { bigint: true });
    if (temp.nlink === 1n) {
      validateFileStat(
        temp,
        MAX_INTENT_BYTES,
        false,
        "allocation_reservation_writer_intent_temp_invalid",
      );
      fs.unlinkSync(tempPath);
      changed = true;
      continue;
    }
    validateFileStat(
      temp,
      MAX_INTENT_BYTES,
      false,
      "allocation_reservation_writer_intent_temp_invalid",
      2n,
    );
    const finalPath = path.join(
      directory.proc_path,
      INTENT_NAME,
    );
    const final = fs.lstatSync(finalPath, { bigint: true });
    validateFileStat(
      final,
      MAX_INTENT_BYTES,
      false,
      "allocation_reservation_writer_intent_invalid",
      2n,
    );
    if (final.dev !== temp.dev || final.ino !== temp.ino) {
      fail("allocation_reservation_writer_intent_temp_binding_invalid");
    }
    fs.unlinkSync(tempPath);
    changed = true;
  }
  if (changed) {
    fsyncDirectory(
      directory,
      "allocation_reservation_writer_intent_directory",
    );
  }
}

function createOnceIntent(
  directory: PinnedDirectoryV1,
  bytes: Buffer,
): void {
  if (
    bytes.length < 1 ||
    bytes.length > MAX_INTENT_BYTES
  ) {
    fail("allocation_reservation_writer_intent_bytes_invalid");
  }
  cleanupIntentTemps(directory);
  if (
    readOptionalPinnedNamedFile(
      directory,
      INTENT_NAME,
      MAX_INTENT_BYTES,
      false,
      "allocation_reservation_writer_intent",
    ) !== null
  ) {
    fail("allocation_reservation_writer_intent_already_exists");
  }

  const tempName = temporaryName(INTENT_NAME);
  const tempPath = path.join(directory.proc_path, tempName);
  const finalPath = path.join(directory.proc_path, INTENT_NAME);
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
    writeAll(
      fd,
      bytes,
      "allocation_reservation_writer_intent",
    );
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = -1;
    fs.linkSync(tempPath, finalPath);
    fsyncDirectory(
      directory,
      "allocation_reservation_writer_intent_directory",
    );
    fs.unlinkSync(tempPath);
    fsyncDirectory(
      directory,
      "allocation_reservation_writer_intent_directory",
    );
    const published = readPinnedNamedFile(
      directory,
      INTENT_NAME,
      MAX_INTENT_BYTES,
      false,
      "allocation_reservation_writer_intent",
    );
    if (!published.equals(bytes)) {
      fail("allocation_reservation_writer_intent_postcheck_failed");
    }
  } finally {
    if (fd >= 0) {
      try {
        fs.closeSync(fd);
      } catch {
        // Best effort only; no authority is granted by a temp name.
      }
    }
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
        fsyncDirectory(
          directory,
          "allocation_reservation_writer_intent_directory",
        );
      }
    } catch {
      // Recovery normalizes any surviving reviewed temp name.
    }
  }
}

function atomicReplaceFile(
  directory: PinnedDirectoryV1,
  name: string,
  bytes: Buffer,
  expectedCurrent: Buffer,
  maxBytes: number,
  allowEmpty: boolean,
  code: string,
  beforeReplace: () => void,
): void {
  if (
    bytes.length < (allowEmpty ? 0 : 1) ||
    bytes.length > maxBytes
  ) {
    fail(code + "_bytes_invalid");
  }
  assertPinnedDirectoryVisible(directory, code + "_directory");
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
    const current = readPinnedNamedFile(
      directory,
      name,
      maxBytes,
      allowEmpty,
      code + "_pre_replace",
    );
    if (!current.equals(expectedCurrent)) {
      fail(code + "_changed_before_replace");
    }
    beforeReplace();
    fs.renameSync(tempPath, finalPath);
    fsyncDirectory(directory, code + "_directory");
    const published = readPinnedNamedFile(
      directory,
      name,
      maxBytes,
      allowEmpty,
      code,
    );
    if (!published.equals(bytes)) {
      fail(code + "_postcheck_failed");
    }
  } finally {
    if (fd >= 0) {
      try {
        fs.closeSync(fd);
      } catch {
        // Best effort only.
      }
    }
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
        fsyncDirectory(directory, code + "_directory");
      }
    } catch {
      // A non-authoritative temp may remain for operator inspection.
    }
  }
}

function removeIntent(
  directory: PinnedDirectoryV1,
  expected: Buffer,
): void {
  const current = readPinnedNamedFile(
    directory,
    INTENT_NAME,
    MAX_INTENT_BYTES,
    false,
    "allocation_reservation_writer_intent",
  );
  if (!current.equals(expected)) {
    fail("allocation_reservation_writer_intent_changed_before_remove");
  }
  fs.unlinkSync(path.join(directory.proc_path, INTENT_NAME));
  fsyncDirectory(
    directory,
    "allocation_reservation_writer_intent_directory",
  );
}

function readRedundantIntent(
  ledgerDirectory: PinnedDirectoryV1,
  highWaterDirectory: PinnedDirectoryV1,
): Buffer | null {
  cleanupIntentTemps(ledgerDirectory);
  cleanupIntentTemps(highWaterDirectory);
  let ledgerIntent = readOptionalPinnedNamedFile(
    ledgerDirectory,
    INTENT_NAME,
    MAX_INTENT_BYTES,
    false,
    "allocation_reservation_writer_intent",
  );
  let highWaterIntent = readOptionalPinnedNamedFile(
    highWaterDirectory,
    INTENT_NAME,
    MAX_INTENT_BYTES,
    false,
    "allocation_reservation_writer_intent",
  );
  if (ledgerIntent === null && highWaterIntent === null) {
    return null;
  }
  const intent = ledgerIntent ?? highWaterIntent!;
  if (
    ledgerIntent !== null &&
    highWaterIntent !== null &&
    !ledgerIntent.equals(highWaterIntent)
  ) {
    fail("allocation_reservation_writer_intent_copies_mismatch");
  }
  if (ledgerIntent === null) {
    createOnceIntent(ledgerDirectory, intent);
    ledgerIntent = intent;
  }
  if (highWaterIntent === null) {
    createOnceIntent(highWaterDirectory, intent);
    highWaterIntent = intent;
  }
  assertWriterRootsVisible(ledgerDirectory, highWaterDirectory);
  if (!ledgerIntent.equals(intent) || !highWaterIntent.equals(intent)) {
    fail("allocation_reservation_writer_intent_redundancy_postcheck_failed");
  }
  return intent;
}

function createRedundantIntent(
  ledgerDirectory: PinnedDirectoryV1,
  highWaterDirectory: PinnedDirectoryV1,
  intent: Buffer,
): void {
  createOnceIntent(ledgerDirectory, intent);
  createOnceIntent(highWaterDirectory, intent);
  const rebound = readRedundantIntent(
    ledgerDirectory,
    highWaterDirectory,
  );
  if (rebound === null || !rebound.equals(intent)) {
    fail("allocation_reservation_writer_intent_redundancy_postcheck_failed");
  }
}

function removeRedundantIntent(
  ledgerDirectory: PinnedDirectoryV1,
  highWaterDirectory: PinnedDirectoryV1,
  expected: Buffer,
): void {
  const ledgerIntent = readPinnedNamedFile(
    ledgerDirectory,
    INTENT_NAME,
    MAX_INTENT_BYTES,
    false,
    "allocation_reservation_writer_intent",
  );
  const highWaterIntent = readPinnedNamedFile(
    highWaterDirectory,
    INTENT_NAME,
    MAX_INTENT_BYTES,
    false,
    "allocation_reservation_writer_intent",
  );
  if (
    !ledgerIntent.equals(expected) ||
    !highWaterIntent.equals(expected)
  ) {
    fail("allocation_reservation_writer_intent_copies_changed_before_remove");
  }
  removeIntent(ledgerDirectory, expected);
  removeIntent(highWaterDirectory, expected);
}

function readLedger(
  directory: PinnedDirectoryV1,
): Buffer {
  return readPinnedNamedFile(
    directory,
    LEDGER_NAME,
    MAX_LEDGER_BYTES,
    true,
    "allocation_reservation_writer_ledger",
  );
}

function readHighWater(
  directory: PinnedDirectoryV1,
): Buffer {
  return readPinnedNamedFile(
    directory,
    HIGH_WATER_NAME,
    MAX_HIGH_WATER_BYTES,
    false,
    "allocation_reservation_writer_high_water",
  );
}

function currentLedgerSummary(
  ledger: Buffer,
): {
  record_count: number;
  tip_hash: string;
} {
  const classified =
    classifyBuyVoidAllocationReservationLedgerV1(ledger);
  if (classified.ok === false) {
    fail(
      "allocation_reservation_writer_ledger_" +
        classified.reason,
    );
  }
  return Object.freeze({
    record_count: classified.record_count,
    tip_hash: classified.tip_hash,
  });
}

function requireCurrentBinding(
  ledger: Buffer,
  highWater: Buffer,
): void {
  const binding =
    classifyBuyVoidAllocationReservationHighWaterBindingV1({
      ledger_jsonl: ledger,
      high_water_json: highWater,
    });
  if (binding.ok === false) {
    fail(
      "allocation_reservation_writer_high_water_" +
        binding.reason,
    );
  }
}

function success(
  status: WriterSuccessV1["status"],
  operationPerformed: boolean,
  ledger: Buffer,
): WriterSuccessV1 {
  const summary = currentLedgerSummary(ledger);
  return Object.freeze({
    ok: true,
    status,
    marker:
      VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_V1,
    version: 1,
    operation_performed: operationPerformed,
    record_count: summary.record_count,
    tip_hash: summary.tip_hash,
    publication_intent_present: false,
    runtime_integration: false,
    production_gate_ready: false,
    funds_movement: false,
    authority:
      VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_AUTHORITY_V1,
  });
}

function recoverUnderLock(
  ledgerDirectory: PinnedDirectoryV1,
  highWaterDirectory: PinnedDirectoryV1,
): {
  recovered: boolean;
  ledger: Buffer;
  high_water: Buffer;
} {
  let ledger = readLedger(ledgerDirectory);
  let highWater = readHighWater(highWaterDirectory);
  const intent = readRedundantIntent(
    ledgerDirectory,
    highWaterDirectory,
  );
  if (intent === null) {
    requireCurrentBinding(ledger, highWater);
    return Object.freeze({
      recovered: false,
      ledger,
      high_water: highWater,
    });
  }

  const recovery =
    classifyBuyVoidAllocationReservationPublicationRecoveryV1({
      intent_bytes: intent,
      observed_ledger_jsonl: ledger,
      observed_high_water_json: highWater,
    });
  if (recovery.ok === false) {
    fail(
      "allocation_reservation_writer_recovery_" +
        recovery.reason,
    );
  }

  if (recovery.write_ledger_append_required) {
    const append = Buffer.from(
      recovery.append_bytes_base64,
      "base64",
    );
    const nextLedger = Buffer.concat([ledger, append]);
    atomicReplaceFile(
      ledgerDirectory,
      LEDGER_NAME,
      nextLedger,
      ledger,
      MAX_LEDGER_BYTES,
      true,
      "allocation_reservation_writer_ledger",
      () =>
        assertWriterRootsVisible(
          ledgerDirectory,
          highWaterDirectory,
        ),
    );
  }

  ledger = readLedger(ledgerDirectory);
  highWater = readHighWater(highWaterDirectory);
  const afterLedger =
    classifyBuyVoidAllocationReservationPublicationRecoveryV1({
      intent_bytes: intent,
      observed_ledger_jsonl: ledger,
      observed_high_water_json: highWater,
    });
  if (afterLedger.ok === false) {
    fail(
      "allocation_reservation_writer_recovery_" +
        afterLedger.reason,
    );
  }

  if (afterLedger.write_high_water_required) {
    atomicReplaceFile(
      highWaterDirectory,
      HIGH_WATER_NAME,
      Buffer.from(afterLedger.next_high_water_json, "utf8"),
      highWater,
      MAX_HIGH_WATER_BYTES,
      false,
      "allocation_reservation_writer_high_water",
      () =>
        assertWriterRootsVisible(
          ledgerDirectory,
          highWaterDirectory,
        ),
    );
  }

  ledger = readLedger(ledgerDirectory);
  highWater = readHighWater(highWaterDirectory);
  const complete =
    classifyBuyVoidAllocationReservationPublicationRecoveryV1({
      intent_bytes: intent,
      observed_ledger_jsonl: ledger,
      observed_high_water_json: highWater,
    });
  if (
    complete.ok === false ||
    complete.phase !== "complete" ||
    complete.write_ledger_append_required ||
    complete.write_high_water_required
  ) {
    fail(
      complete.ok === false
        ? "allocation_reservation_writer_recovery_" +
            complete.reason
        : "allocation_reservation_writer_recovery_not_complete",
    );
  }
  requireCurrentBinding(ledger, highWater);
  removeRedundantIntent(
    ledgerDirectory,
    highWaterDirectory,
    intent,
  );
  return Object.freeze({
    recovered: true,
    ledger,
    high_water: highWater,
  });
}

function withWriterRoots<T>(
  ledgerRoot: string,
  highWaterRoot: string,
  operation: (
    ledgerDirectory: PinnedDirectoryV1,
    highWaterDirectory: PinnedDirectoryV1,
  ) => T,
): T {
  const ledgerDirectory = openPinnedDirectory(
    ledgerRoot,
    "allocation_reservation_writer_ledger_directory",
  );
  let highWaterDirectory: PinnedDirectoryV1 | null = null;
  try {
    highWaterDirectory = openPinnedDirectory(
      highWaterRoot,
      "allocation_reservation_writer_high_water_directory",
    );
    assertDistinctRoots(ledgerDirectory, highWaterDirectory);
    const orderedLocks = [
      {
        directory: ledgerDirectory,
        lock_path: path.join(ledgerDirectory.proc_path, LOCK_NAME),
      },
      {
        directory: highWaterDirectory,
        lock_path: path.join(highWaterDirectory.proc_path, LOCK_NAME),
      },
    ].sort((left, right) => {
      if (left.directory.stat.dev < right.directory.stat.dev) return -1;
      if (left.directory.stat.dev > right.directory.stat.dev) return 1;
      if (left.directory.stat.ino < right.directory.stat.ino) return -1;
      if (left.directory.stat.ino > right.directory.stat.ino) return 1;
      return left.directory.path.localeCompare(right.directory.path);
    });
    return withBuyVoidFilesystemBakeryLockV1(
      orderedLocks[0].lock_path,
      () =>
        withBuyVoidFilesystemBakeryLockV1(
          orderedLocks[1].lock_path,
          () => {
            assertWriterRootsVisible(
              ledgerDirectory,
              highWaterDirectory!,
            );
            return operation(
              ledgerDirectory,
              highWaterDirectory!,
            );
          },
        ),
    );
  } finally {
    if (highWaterDirectory) {
      try {
        fs.closeSync(highWaterDirectory.fd);
      } catch {
        // Best effort only.
      }
    }
    try {
      fs.closeSync(ledgerDirectory.fd);
    } catch {
      // Best effort only.
    }
  }
}

export function testOnlyWithBuyVoidAllocationReservationPublicationWriterLocksV1<T>(
  input: {
    ledger_root: string;
    high_water_root: string;
  },
  operation: () => T,
): T {
  if (typeof operation !== "function") {
    fail("allocation_reservation_writer_test_operation_required");
  }
  return withWriterRoots(
    String(input?.ledger_root || "").trim(),
    String(input?.high_water_root || "").trim(),
    () => operation(),
  );
}

export function recoverBuyVoidAllocationReservationPublicationWriterV1(
  input: {
    ledger_root: string;
    high_water_root: string;
  },
): BuyVoidAllocationReservationPublicationWriterDecisionV1 {
  try {
    return withWriterRoots(
      String(input?.ledger_root || "").trim(),
      String(input?.high_water_root || "").trim(),
      (ledgerDirectory, highWaterDirectory) => {
        const recovered = recoverUnderLock(
          ledgerDirectory,
          highWaterDirectory,
        );
        return success(
          recovered.recovered ? "recovered" : "clean",
          recovered.recovered,
          recovered.ledger,
        );
      },
    );
  } catch (error) {
    return held(
      String((error as Error)?.message || error),
    );
  }
}

export function persistBuyVoidAllocationReservationPublicationWriterV1(
  input: {
    ledger_root: string;
    high_water_root: string;
    next_ledger_jsonl: string | Buffer;
  },
): BuyVoidAllocationReservationPublicationWriterDecisionV1 {
  try {
    const nextLedger = Buffer.isBuffer(input?.next_ledger_jsonl)
      ? Buffer.from(input.next_ledger_jsonl)
      : Buffer.from(
          String(input?.next_ledger_jsonl ?? ""),
          "utf8",
        );
    if (nextLedger.length > MAX_LEDGER_BYTES) {
      fail("allocation_reservation_writer_next_ledger_too_large");
    }

    return withWriterRoots(
      String(input?.ledger_root || "").trim(),
      String(input?.high_water_root || "").trim(),
      (ledgerDirectory, highWaterDirectory) => {
        const recovered = recoverUnderLock(
          ledgerDirectory,
          highWaterDirectory,
        );
        if (recovered.recovered) {
          return success("recovered", true, recovered.ledger);
        }

        let ledger = recovered.ledger;
        let highWater = recovered.high_water;

        if (ledger.equals(nextLedger)) {
          requireCurrentBinding(ledger, highWater);
          return success("idempotent", false, ledger);
        }

        const nextClassified =
          classifyBuyVoidAllocationReservationLedgerV1(
            nextLedger,
          );
        if (nextClassified.ok === false) {
          fail(
            "allocation_reservation_writer_next_ledger_" +
              nextClassified.reason,
          );
        }

        const built =
          buildBuyVoidAllocationReservationPublicationIntentV1({
            current_ledger_jsonl: ledger,
            current_high_water_json: highWater,
            next_ledger_jsonl: nextLedger,
          });
        if (built.ok === false) {
          fail(
            "allocation_reservation_writer_intent_" +
              built.reason,
          );
        }
        const intent = Buffer.from(built.intent_json, "utf8");
        createRedundantIntent(
          ledgerDirectory,
          highWaterDirectory,
          intent,
        );

        const intentOnly =
          classifyBuyVoidAllocationReservationPublicationRecoveryV1({
            intent_bytes: intent,
            observed_ledger_jsonl: ledger,
            observed_high_water_json: highWater,
          });
        if (
          intentOnly.ok === false ||
          intentOnly.phase !== "intent_only" ||
          !intentOnly.write_ledger_append_required ||
          !intentOnly.write_high_water_required
        ) {
          fail(
            intentOnly.ok === false
              ? "allocation_reservation_writer_intent_" +
                  intentOnly.reason
              : "allocation_reservation_writer_intent_phase_invalid",
          );
        }

        atomicReplaceFile(
          ledgerDirectory,
          LEDGER_NAME,
          nextLedger,
          ledger,
          MAX_LEDGER_BYTES,
          true,
          "allocation_reservation_writer_ledger",
          () =>
            assertWriterRootsVisible(
              ledgerDirectory,
              highWaterDirectory,
            ),
        );
        ledger = readLedger(ledgerDirectory);
        highWater = readHighWater(highWaterDirectory);

        const ledgerCommitted =
          classifyBuyVoidAllocationReservationPublicationRecoveryV1({
            intent_bytes: intent,
            observed_ledger_jsonl: ledger,
            observed_high_water_json: highWater,
          });
        if (
          ledgerCommitted.ok === false ||
          ledgerCommitted.phase !== "ledger_committed" ||
          ledgerCommitted.write_ledger_append_required ||
          !ledgerCommitted.write_high_water_required
        ) {
          fail(
            ledgerCommitted.ok === false
              ? "allocation_reservation_writer_ledger_commit_" +
                  ledgerCommitted.reason
              : "allocation_reservation_writer_ledger_commit_phase_invalid",
          );
        }

        atomicReplaceFile(
          highWaterDirectory,
          HIGH_WATER_NAME,
          Buffer.from(
            ledgerCommitted.next_high_water_json,
            "utf8",
          ),
          highWater,
          MAX_HIGH_WATER_BYTES,
          false,
          "allocation_reservation_writer_high_water",
          () =>
            assertWriterRootsVisible(
              ledgerDirectory,
              highWaterDirectory,
            ),
        );

        ledger = readLedger(ledgerDirectory);
        highWater = readHighWater(highWaterDirectory);
        const complete =
          classifyBuyVoidAllocationReservationPublicationRecoveryV1({
            intent_bytes: intent,
            observed_ledger_jsonl: ledger,
            observed_high_water_json: highWater,
          });
        if (
          complete.ok === false ||
          complete.phase !== "complete" ||
          complete.write_ledger_append_required ||
          complete.write_high_water_required
        ) {
          fail(
            complete.ok === false
              ? "allocation_reservation_writer_postcheck_" +
                  complete.reason
              : "allocation_reservation_writer_postcheck_not_complete",
          );
        }
        requireCurrentBinding(ledger, highWater);
        removeRedundantIntent(
    ledgerDirectory,
    highWaterDirectory,
    intent,
  );

        return success(
          "persisted",
          true,
          ledger,
        );
      },
    );
  } catch (error) {
    return held(
      String((error as Error)?.message || error),
    );
  }
}
