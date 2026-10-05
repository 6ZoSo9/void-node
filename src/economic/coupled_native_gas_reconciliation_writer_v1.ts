import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  withBuyVoidFilesystemBakeryLockAsyncExistingQueueV1,
} from "./buy_void_filesystem_bakery_lock_v1.js";
import {
  serializeCoupledNativeGasStorePayerDomainV1,
} from "./coupled_native_gas_liability_store_v1.js";
import {
  qualifyCoupledNativeGasReconciliationStorageV1,
} from "./coupled_native_gas_reconciliation_storage_v1.js";
import {
  classifyCoupledNativeGasEffectiveOpenCensusV1,
  type CoupledNativeGasEffectiveOpenCensusVerifiedV1,
} from "./coupled_native_gas_effective_open_census_v1.js";
import {
  resolveCoupledNativeGasReconciliationEvidenceV1,
  type CoupledNativeGasReconciliationEvidenceResolverDecisionV1,
  type CoupledNativeGasReconciliationEvidenceResolverPolicyV1,
} from "./coupled_native_gas_reconciliation_evidence_resolver_v1.js";
import type {
  CoupledNativeGasLiabilityRecordV1,
} from "./coupled_native_gas_liability_v1.js";
import type {
  CoupledNativeGasLiabilityReconciliationVerifiedV1,
} from "./coupled_native_gas_liability_reconciliation_v1.js";

export const VOID_COUPLED_NATIVE_GAS_RECONCILIATION_WRITER_V1 =
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_WRITER_V1";

export const VOID_COUPLED_NATIVE_GAS_RECONCILIATION_WRITER_AUTHORITY_V1 =
  Object.freeze({
    source_writer: true,
    payer_scoped_serialization: true,
    existing_liability_queue_reused: true,
    payer_domain_bound_before_temp_cleanup: true,
    reconciliation_storage_qualification_required: true,
    exact_effective_open_census_precheck: true,
    exact_reconciliation_evidence_resolver_reused: true,
    idempotent_replay_reauthenticates_terminal_evidence: true,
    idempotent_directory_durability_refresh: true,
    immutable_liability_history: true,
    immutable_reconciliation_history: true,
    exact_reconciliation_history_append_postcheck: true,
    create_once_reconciliation_publication: true,
    crash_temp_normalization: true,
    record_filename_identity_binding: true,
    exact_effective_open_postcheck: true,
    exact_reconciliation_history_delta: true,
    descriptor_bound_reads: true,
    filesystem_read: true,
    filesystem_write: true,
    reconciliation_record_write: true,
    effective_open_reserve_release_by_reconciliation: true,
    storage_bootstrap: false,
    root_path_stability_proven: false,
    liability_record_mutation: false,
    liability_record_delete: false,
    reconciliation_record_replace: false,
    retry_execution: false,
    wc_void_reconciliation: false,
    runtime_integration: false,
    wallet_access: false,
    private_key_access: false,
    signing: false,
    transaction_construction: false,
    transaction_broadcast: false,
    chain2050_write: false,
    gas_spend: false,
    market_activation: false,
    public_presale_activation: false,
    inventory_movement: false,
    treasury_or_liquidity_movement: false,
    funds_movement: false,
  });

const DOMAIN_NAME = "payer-domain-v1.json";
const RECORDS_DIRECTORY = "records";
const RECONCILIATIONS_DIRECTORY = "reconciliations";
const QUEUE_DIRECTORY = "gas-liability-admission-v1.queue";
const MAX_FILE_BYTES = 64 * 1024;
const MAX_HISTORY_RECORDS = 100_000;
const MAX_HISTORY_TOTAL_BYTES = 256 * 1024 * 1024;
const SHA256 = /^[0-9a-f]{64}$/u;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const RECORD_NAME = /^([0-9a-f]{64})\.json$/u;
const TEMP_RECONCILIATION_NAME =
  /^\.([0-9a-f]{64})\.json\.tmp-[1-9][0-9]*-[0-9a-f]{16}$/u;
const O_NOFOLLOW = fs.constants.O_NOFOLLOW;
const O_DIRECTORY = fs.constants.O_DIRECTORY;

type PinnedDirectoryV1 = {
  path: string;
  fd: number;
  stat: fs.BigIntStats;
  proc_path: string;
};

type HistorySnapshotV1 = {
  rows: readonly unknown[];
  entries: readonly {
    name: string;
    bytes: number;
    sha256: string;
    identity: string;
  }[];
  snapshot_sha256: string;
};

type WriterDependenciesV1 = {
  resolve_evidence: typeof resolveCoupledNativeGasReconciliationEvidenceV1;
  after_publication?: () => void;
};

export type CoupledNativeGasReconciliationWriterDecisionV1 =
  | {
      ok: true;
      status: "stored" | "idempotent";
      mutation_performed: boolean;
      payer_address: string;
      liability_id: string;
      reconciliation_id: string;
      resolver_packet_id: string | null;
      census_before_id: string;
      census_after_id: string;
      effective_open_reserved_before_wei: string;
      effective_open_reserved_after_wei: string;
      released_open_reserve_wei: string;
      reconciliation:
        CoupledNativeGasLiabilityReconciliationVerifiedV1;
      authority:
        typeof VOID_COUPLED_NATIVE_GAS_RECONCILIATION_WRITER_AUTHORITY_V1;
    }
  | {
      ok: false;
      status: "held" | "held_after_mutation";
      reason: string;
      mutation_performed: boolean;
      authority:
        typeof VOID_COUPLED_NATIVE_GAS_RECONCILIATION_WRITER_AUTHORITY_V1;
    };

function held(
  reason: string,
  mutationPerformed: boolean,
): Extract<CoupledNativeGasReconciliationWriterDecisionV1, { ok: false }> {
  return Object.freeze({
    ok: false,
    status: mutationPerformed ? "held_after_mutation" : "held",
    reason,
    mutation_performed: mutationPerformed,
    authority:
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_WRITER_AUTHORITY_V1,
  });
}

function fail(code: string): never {
  throw new Error(code);
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) {
      fail("coupled_native_gas_reconciliation_writer_noncanonical_value");
    }
    return encoded;
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonical).join(",") + "]";
  }
  const record = value as Record<string, unknown>;
  return (
    "{" +
    Object.keys(record)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonical(record[key]))
      .join(",") +
    "}"
  );
}

function sha256Bytes(bytes: Buffer): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function sha256Text(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeAddress(value: unknown): string {
  const result = String(value ?? "").trim().toLowerCase();
  return ADDRESS.test(result) ? result : "";
}

function requireDescriptorSafety(): void {
  if (
    typeof O_NOFOLLOW !== "number" ||
    typeof O_DIRECTORY !== "number" ||
    !fs.existsSync("/proc/self/fd")
  ) {
    fail("coupled_native_gas_reconciliation_writer_descriptor_safety_unavailable");
  }
}

function validatePrivateDirectory(
  stat: fs.BigIntStats,
  code: string,
): void {
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

function validatePrivateFile(
  stat: fs.BigIntStats,
  code: string,
  allowedLinks = 1n,
): void {
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.nlink !== allowedLinks ||
    stat.size < 2n ||
    stat.size > BigInt(MAX_FILE_BYTES) ||
    (
      typeof process.getuid === "function" &&
      stat.uid !== BigInt(process.getuid())
    ) ||
    (Number(stat.mode) & 0o077) !== 0
  ) {
    fail(code);
  }
}

function sameDirectoryIdentity(
  left: fs.BigIntStats,
  right: fs.BigIntStats,
): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode
  );
}

function sameDirectorySnapshot(
  left: fs.BigIntStats,
  right: fs.BigIntStats,
): boolean {
  return (
    sameDirectoryIdentity(left, right) &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs &&
    left.nlink === right.nlink
  );
}

function sameFileIdentity(
  left: fs.BigIntStats,
  right: fs.BigIntStats,
): boolean {
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

function directoryIdentity(stat: fs.BigIntStats): string {
  return [
    stat.dev,
    stat.ino,
    stat.uid,
    stat.gid,
    stat.mode,
    stat.size,
    stat.mtimeNs,
    stat.ctimeNs,
    stat.nlink,
  ].map(String).join(":");
}

function fileIdentity(stat: fs.BigIntStats): string {
  return [
    stat.dev,
    stat.ino,
    stat.uid,
    stat.gid,
    stat.mode,
    stat.size,
    stat.mtimeNs,
    stat.ctimeNs,
    stat.nlink,
  ].map(String).join(":");
}

function openPinnedDirectory(
  rawPath: string,
  code: string,
): PinnedDirectoryV1 {
  requireDescriptorSafety();
  const raw = String(rawPath || "").trim();
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
    fail(code + "_path_invalid");
  }
  const resolved = path.resolve(raw);
  let visible: fs.BigIntStats;
  try {
    visible = fs.lstatSync(resolved, { bigint: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      fail(code + "_missing");
    }
    throw error;
  }
  validatePrivateDirectory(visible, code + "_invalid");
  const fd = fs.openSync(
    resolved,
    fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
  );
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    validatePrivateDirectory(opened, code + "_invalid");
    if (!sameDirectoryIdentity(visible, opened)) {
      fail(code + "_changed");
    }
    return {
      path: resolved,
      fd,
      stat: opened,
      proc_path: "/proc/self/fd/" + String(fd),
    };
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
}

function openPinnedChildDirectory(
  parent: PinnedDirectoryV1,
  name: string,
  code: string,
): PinnedDirectoryV1 {
  assertPinnedDirectoryVisible(parent, code + "_parent");
  const visiblePath = path.join(parent.path, name);
  const pinnedPath = path.join(parent.proc_path, name);
  let visible: fs.BigIntStats;
  try {
    visible = fs.lstatSync(visiblePath, { bigint: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      fail(code + "_missing");
    }
    throw error;
  }
  validatePrivateDirectory(visible, code + "_invalid");
  const fd = fs.openSync(
    pinnedPath,
    fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
  );
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    validatePrivateDirectory(opened, code + "_invalid");
    if (!sameDirectoryIdentity(visible, opened)) {
      fail(code + "_path_not_bound");
    }
    assertPinnedDirectoryVisible(parent, code + "_parent");
    return {
      path: visiblePath,
      fd,
      stat: opened,
      proc_path: "/proc/self/fd/" + String(fd),
    };
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
  validatePrivateDirectory(opened, code + "_invalid");
  validatePrivateDirectory(visible, code + "_invalid");
  if (
    !sameDirectoryIdentity(directory.stat, opened) ||
    !sameDirectoryIdentity(opened, visible)
  ) {
    fail(code + "_changed");
  }
}

function closePinned(directory: PinnedDirectoryV1 | null): void {
  if (!directory) return;
  try {
    fs.closeSync(directory.fd);
  } catch {
    // Best effort only.
  }
}

function readPinnedNamedFile(
  directory: PinnedDirectoryV1,
  name: string,
  code: string,
): {
  bytes: Buffer;
  identity: string;
} {
  if (!name || name.includes("/") || name === "." || name === "..") {
    fail(code + "_name_invalid");
  }
  assertPinnedDirectoryVisible(directory, code + "_directory");
  const visiblePath = path.join(directory.path, name);
  const pinnedPath = path.join(directory.proc_path, name);
  const visibleBefore = fs.lstatSync(visiblePath, { bigint: true });
  validatePrivateFile(visibleBefore, code + "_file_invalid");
  const fd = fs.openSync(
    pinnedPath,
    fs.constants.O_RDONLY | O_NOFOLLOW,
  );
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    validatePrivateFile(opened, code + "_file_invalid");
    if (!sameFileIdentity(visibleBefore, opened)) {
      fail(code + "_path_not_bound");
    }
    const length = Number(opened.size);
    if (!Number.isSafeInteger(length) || length < 2) {
      fail(code + "_file_invalid");
    }
    const bytes = Buffer.alloc(length);
    let offset = 0;
    while (offset < length) {
      const count = fs.readSync(
        fd,
        bytes,
        offset,
        length - offset,
        offset,
      );
      if (count <= 0) fail(code + "_short_read");
      offset += count;
    }
    const after = fs.fstatSync(fd, { bigint: true });
    const visibleAfter = fs.lstatSync(visiblePath, { bigint: true });
    validatePrivateFile(after, code + "_file_invalid");
    validatePrivateFile(visibleAfter, code + "_file_invalid");
    if (
      !sameFileIdentity(opened, after) ||
      !sameFileIdentity(after, visibleAfter)
    ) {
      fail(code + "_changed_during_read");
    }
    assertPinnedDirectoryVisible(directory, code + "_directory");
    return {
      bytes,
      identity: fileIdentity(after),
    };
  } finally {
    fs.closeSync(fd);
  }
}

function parseCanonicalJson(
  bytes: Buffer,
  code: string,
): Record<string, unknown> {
  const text = bytes.toString("utf8");
  if (!text.endsWith("\n")) {
    fail(code + "_missing_final_newline");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(0, -1));
  } catch {
    fail(code + "_json_invalid");
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    fail(code + "_object_required");
  }
  if (text !== canonical(parsed) + "\n") {
    fail(code + "_serialization_noncanonical");
  }
  return parsed as Record<string, unknown>;
}

function recoverStaleReconciliationTempsV1(
  directory: PinnedDirectoryV1,
  onMutation: () => void,
): number {
  assertPinnedDirectoryVisible(
    directory,
    "coupled_native_gas_reconciliation_writer_temp_recovery_directory",
  );
  const names = fs.readdirSync(directory.proc_path).sort();
  let recovered = 0;
  for (const name of names) {
    const match = TEMP_RECONCILIATION_NAME.exec(name);
    if (!match) continue;
    const filePath = path.join(directory.proc_path, name);
    const visible = fs.lstatSync(filePath, { bigint: true });
    if (
      !visible.isFile() ||
      visible.isSymbolicLink() ||
      visible.size > BigInt(MAX_FILE_BYTES) ||
      (
        typeof process.getuid === "function" &&
        visible.uid !== BigInt(process.getuid())
      ) ||
      (Number(visible.mode) & 0o077) !== 0
    ) {
      fail("coupled_native_gas_reconciliation_writer_temp_recovery_file_invalid");
    }
    if (visible.nlink === 1n) {
      const fd = fs.openSync(
        filePath,
        fs.constants.O_RDONLY | O_NOFOLLOW,
      );
      try {
        const opened = fs.fstatSync(fd, { bigint: true });
        const visibleAgain = fs.lstatSync(filePath, { bigint: true });
        if (
          !sameFileIdentity(visible, opened) ||
          !sameFileIdentity(opened, visibleAgain)
        ) {
          fail(
            "coupled_native_gas_reconciliation_writer_temp_recovery_file_changed",
          );
        }
        fs.unlinkSync(filePath);
        onMutation();
        fs.fsyncSync(directory.fd);
        recovered += 1;
      } finally {
        fs.closeSync(fd);
      }
      continue;
    }
    validatePrivateFile(
      visible,
      "coupled_native_gas_reconciliation_writer_temp_recovery_file_invalid",
      2n,
    );
    const finalPath = path.join(
      directory.proc_path,
      match[1] + ".json",
    );
    const final = fs.lstatSync(finalPath, { bigint: true });
    validatePrivateFile(
      final,
      "coupled_native_gas_reconciliation_writer_temp_recovery_final_invalid",
      2n,
    );
    if (visible.dev !== final.dev || visible.ino !== final.ino) {
      fail(
        "coupled_native_gas_reconciliation_writer_temp_recovery_binding_invalid",
      );
    }
    fs.unlinkSync(filePath);
    onMutation();
    fs.fsyncSync(directory.fd);
    recovered += 1;
  }
  assertPinnedDirectoryVisible(
    directory,
    "coupled_native_gas_reconciliation_writer_temp_recovery_directory",
  );
  return recovered;
}

function readHistoryDirectory(
  directory: PinnedDirectoryV1,
  code: string,
  identityField: "liability_id" | "reconciliation_id",
): HistorySnapshotV1 {
  assertPinnedDirectoryVisible(directory, code + "_directory");
  const before = fs.fstatSync(directory.fd, { bigint: true });
  validatePrivateDirectory(before, code + "_directory_invalid");
  const names = fs.readdirSync(directory.proc_path).sort();
  if (names.length > MAX_HISTORY_RECORDS) {
    fail(code + "_record_count_exceeded");
  }
  const rows: unknown[] = [];
  const entries: {
    name: string;
    bytes: number;
    sha256: string;
    identity: string;
  }[] = [];
  let totalBytes = 0;
  for (const name of names) {
    const nameMatch = RECORD_NAME.exec(name);
    if (!nameMatch) {
      fail(code + "_entry_name_invalid");
    }
    const read = readPinnedNamedFile(
      directory,
      name,
      code + "_record",
    );
    totalBytes += read.bytes.length;
    if (totalBytes > MAX_HISTORY_TOTAL_BYTES) {
      fail(code + "_history_bytes_exceeded");
    }
    const row = parseCanonicalJson(read.bytes, code + "_record");
    if (String(row[identityField] ?? "") !== nameMatch[1]) {
      fail(code + "_record_filename_identity_mismatch");
    }
    rows.push(row);
    entries.push({
      name,
      bytes: read.bytes.length,
      sha256: sha256Bytes(read.bytes),
      identity: read.identity,
    });
  }
  const after = fs.fstatSync(directory.fd, { bigint: true });
  const visible = fs.lstatSync(directory.path, { bigint: true });
  validatePrivateDirectory(after, code + "_directory_invalid");
  validatePrivateDirectory(visible, code + "_directory_invalid");
  if (
    !sameDirectorySnapshot(before, after) ||
    !sameDirectoryIdentity(after, visible)
  ) {
    fail(code + "_directory_changed_during_scan");
  }
  const snapshot = {
    directory_identity: directoryIdentity(after),
    entries,
  };
  return {
    rows: Object.freeze(rows),
    entries: Object.freeze(entries),
    snapshot_sha256: sha256Text(canonical(snapshot)),
  };
}

function readAndBindPayerDomain(
  root: PinnedDirectoryV1,
  payerAddress: string,
): string {
  const read = readPinnedNamedFile(
    root,
    DOMAIN_NAME,
    "coupled_native_gas_reconciliation_writer_payer_domain",
  );
  const expected = Buffer.from(
    serializeCoupledNativeGasStorePayerDomainV1(payerAddress),
    "utf8",
  );
  if (!read.bytes.equals(expected)) {
    fail("coupled_native_gas_reconciliation_writer_payer_domain_mismatch");
  }
  return sha256Text(
    canonical({
      sha256: sha256Bytes(read.bytes),
      identity: read.identity,
    }),
  );
}

function requireCensus(
  payerAddress: string,
  liabilities: readonly unknown[],
  reconciliations: readonly unknown[],
): CoupledNativeGasEffectiveOpenCensusVerifiedV1 {
  const decision = classifyCoupledNativeGasEffectiveOpenCensusV1({
    payer_address: payerAddress,
    liabilities,
    reconciliations,
  });
  if (decision.ok !== true) {
    fail(
      "coupled_native_gas_reconciliation_writer_census_" +
        decision.reason,
    );
  }
  return decision;
}

function findLiability(
  rows: readonly unknown[],
  liabilityId: string,
): CoupledNativeGasLiabilityRecordV1 | null {
  for (const row of rows) {
    if (
      row &&
      typeof row === "object" &&
      !Array.isArray(row) &&
      String((row as Record<string, unknown>).liability_id ?? "") ===
        liabilityId
    ) {
      return row as CoupledNativeGasLiabilityRecordV1;
    }
  }
  return null;
}

function findReconciliation(
  rows: readonly unknown[],
  liabilityId: string,
): CoupledNativeGasLiabilityReconciliationVerifiedV1 | null {
  for (const row of rows) {
    if (
      row &&
      typeof row === "object" &&
      !Array.isArray(row) &&
      String((row as Record<string, unknown>).liability_id ?? "") ===
        liabilityId
    ) {
      return row as CoupledNativeGasLiabilityReconciliationVerifiedV1;
    }
  }
  return null;
}

function writeAll(fd: number, bytes: Buffer): void {
  let offset = 0;
  while (offset < bytes.length) {
    const count = fs.writeSync(
      fd,
      bytes,
      offset,
      bytes.length - offset,
      null,
    );
    if (count <= 0) {
      fail("coupled_native_gas_reconciliation_writer_short_write");
    }
    offset += count;
  }
}

function publishReconciliationCreateOnce(
  directory: PinnedDirectoryV1,
  reconciliation: CoupledNativeGasLiabilityReconciliationVerifiedV1,
  onPublished: () => void,
): void {
  if (!SHA256.test(reconciliation.reconciliation_id)) {
    fail("coupled_native_gas_reconciliation_writer_reconciliation_id_invalid");
  }
  const bytes = Buffer.from(canonical(reconciliation) + "\n", "utf8");
  if (bytes.length > MAX_FILE_BYTES) {
    fail("coupled_native_gas_reconciliation_writer_reconciliation_too_large");
  }
  assertPinnedDirectoryVisible(
    directory,
    "coupled_native_gas_reconciliation_writer_reconciliations_directory",
  );
  const finalName = reconciliation.reconciliation_id + ".json";
  const finalPath = path.join(directory.proc_path, finalName);
  try {
    fs.lstatSync(finalPath, { bigint: true });
    fail("coupled_native_gas_reconciliation_writer_reconciliation_already_exists");
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException)?.code !== "ENOENT"
    ) {
      throw error;
    }
  }
  const tempName =
    "." +
    finalName +
    ".tmp-" +
    String(process.pid) +
    "-" +
    crypto.randomBytes(8).toString("hex");
  const tempPath = path.join(directory.proc_path, tempName);
  let fd = -1;
  let linked = false;
  try {
    fd = fs.openSync(
      tempPath,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        O_NOFOLLOW,
      0o600,
    );
    writeAll(fd, bytes);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = -1;
    fs.linkSync(tempPath, finalPath);
    linked = true;
    onPublished();
    fs.fsyncSync(directory.fd);
    fs.unlinkSync(tempPath);
    fs.fsyncSync(directory.fd);
    const published = readPinnedNamedFile(
      directory,
      finalName,
      "coupled_native_gas_reconciliation_writer_published_record",
    );
    if (!published.bytes.equals(bytes)) {
      fail(
        "coupled_native_gas_reconciliation_writer_publication_postcheck_failed",
      );
    }
  } catch (error) {
    if (linked) {
      throw new Error(
        "coupled_native_gas_reconciliation_writer_postpublication_" +
          String((error as Error)?.message || error),
      );
    }
    throw error;
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
        fs.fsyncSync(directory.fd);
      }
    } catch {
      // A non-authoritative temp may remain for operator inspection.
    }
  }
}

function exactExpectedReconciliationHistory(
  before: HistorySnapshotV1,
  after: HistorySnapshotV1,
  reconciliation: CoupledNativeGasLiabilityReconciliationVerifiedV1,
): void {
  const expectedName = reconciliation.reconciliation_id + ".json";
  const expectedBytes = Buffer.from(
    canonical(reconciliation) + "\n",
    "utf8",
  );
  const beforeByName = new Map(
    before.entries.map((entry) => [entry.name, entry] as const),
  );
  const afterByName = new Map(
    after.entries.map((entry) => [entry.name, entry] as const),
  );
  if (
    beforeByName.has(expectedName) ||
    after.entries.length !== before.entries.length + 1
  ) {
    fail(
      "coupled_native_gas_reconciliation_writer_reconciliation_history_changed_after_publication",
    );
  }
  for (const entry of before.entries) {
    const current = afterByName.get(entry.name);
    if (
      !current ||
      current.bytes !== entry.bytes ||
      current.sha256 !== entry.sha256 ||
      current.identity !== entry.identity
    ) {
      fail(
        "coupled_native_gas_reconciliation_writer_reconciliation_history_changed_after_publication",
      );
    }
  }
  const published = afterByName.get(expectedName);
  if (
    !published ||
    published.bytes !== expectedBytes.length ||
    published.sha256 !== sha256Bytes(expectedBytes)
  ) {
    fail(
      "coupled_native_gas_reconciliation_writer_reconciliation_history_changed_after_publication",
    );
  }
  for (const entry of after.entries) {
    if (entry.name !== expectedName && !beforeByName.has(entry.name)) {
      fail(
        "coupled_native_gas_reconciliation_writer_reconciliation_history_changed_after_publication",
      );
    }
  }
}

function exactExpectedPostCensus(
  before: CoupledNativeGasEffectiveOpenCensusVerifiedV1,
  after: CoupledNativeGasEffectiveOpenCensusVerifiedV1,
  liability: CoupledNativeGasLiabilityRecordV1,
  reconciliation:
    CoupledNativeGasLiabilityReconciliationVerifiedV1,
): void {
  if (
    after.historical_liability_count !==
      before.historical_liability_count ||
    after.reconciled_liability_count !==
      before.reconciled_liability_count + 1 ||
    after.effective_open_liability_count !==
      before.effective_open_liability_count - 1 ||
    after.historical_maximum_reserved_wei !==
      before.historical_maximum_reserved_wei ||
    !after.reconciled_liability_ids.includes(liability.liability_id) ||
    after.effective_open_liability_ids.includes(liability.liability_id) ||
    !after.reconciliation_ids.includes(reconciliation.reconciliation_id)
  ) {
    fail("coupled_native_gas_reconciliation_writer_postcensus_shape_mismatch");
  }
  const beforeReserve = BigInt(before.effective_open_reserved_wei);
  const afterReserve = BigInt(after.effective_open_reserved_wei);
  const maximumReserved = BigInt(liability.maximum_reserved_wei);
  if (
    beforeReserve < maximumReserved ||
    beforeReserve - maximumReserved !== afterReserve
  ) {
    fail(
      "coupled_native_gas_reconciliation_writer_postcensus_reserve_mismatch",
    );
  }
}

async function persistWithDependencies(
  input: {
    root_dir: string;
    payer_address: string;
    liability_id: string;
    policy: CoupledNativeGasReconciliationEvidenceResolverPolicyV1;
  },
  dependencies: WriterDependenciesV1,
): Promise<CoupledNativeGasReconciliationWriterDecisionV1> {
  let mutationPerformed = false;
  let root: PinnedDirectoryV1 | null = null;
  let records: PinnedDirectoryV1 | null = null;
  let reconciliations: PinnedDirectoryV1 | null = null;
  let queue: PinnedDirectoryV1 | null = null;
  try {
    const payerAddress = normalizeAddress(input?.payer_address);
    const liabilityId = String(input?.liability_id || "").trim().toLowerCase();
    if (!payerAddress) {
      fail("coupled_native_gas_reconciliation_writer_payer_address_invalid");
    }
    if (!SHA256.test(liabilityId)) {
      fail("coupled_native_gas_reconciliation_writer_liability_id_invalid");
    }

    root = openPinnedDirectory(
      String(input?.root_dir || "").trim(),
      "coupled_native_gas_reconciliation_writer_root",
    );
    records = openPinnedChildDirectory(
      root,
      RECORDS_DIRECTORY,
      "coupled_native_gas_reconciliation_writer_records_directory",
    );
    reconciliations = openPinnedChildDirectory(
      root,
      RECONCILIATIONS_DIRECTORY,
      "coupled_native_gas_reconciliation_writer_reconciliations_directory",
    );
    queue = openPinnedChildDirectory(
      root,
      QUEUE_DIRECTORY,
      "coupled_native_gas_reconciliation_writer_queue",
    );

    return await withBuyVoidFilesystemBakeryLockAsyncExistingQueueV1(
      queue.proc_path,
      async () => {
        assertPinnedDirectoryVisible(
          root!,
          "coupled_native_gas_reconciliation_writer_root",
        );
        assertPinnedDirectoryVisible(
          records!,
          "coupled_native_gas_reconciliation_writer_records_directory",
        );
        assertPinnedDirectoryVisible(
          reconciliations!,
          "coupled_native_gas_reconciliation_writer_reconciliations_directory",
        );
        assertPinnedDirectoryVisible(
          queue!,
          "coupled_native_gas_reconciliation_writer_queue",
        );

        const domainBeforeCleanup = readAndBindPayerDomain(
          root!,
          payerAddress,
        );

        recoverStaleReconciliationTempsV1(
          reconciliations!,
          () => {
            mutationPerformed = true;
          },
        );

        const qualified =
          await qualifyCoupledNativeGasReconciliationStorageV1({
            root_dir: root!.path,
            payer_address: payerAddress,
          });
        if (qualified.ok !== true) {
          fail(
            "coupled_native_gas_reconciliation_writer_storage_" +
              qualified.reason,
          );
        }

        const domainBefore = readAndBindPayerDomain(
          root!,
          payerAddress,
        );
        if (domainBefore !== domainBeforeCleanup) {
          fail(
            "coupled_native_gas_reconciliation_writer_payer_domain_changed_during_temp_cleanup",
          );
        }
        const liabilitiesBefore = readHistoryDirectory(
          records!,
          "coupled_native_gas_reconciliation_writer_liabilities",
          "liability_id",
        );
        const reconciliationsBefore = readHistoryDirectory(
          reconciliations!,
          "coupled_native_gas_reconciliation_writer_reconciliations",
          "reconciliation_id",
        );
        const censusBefore = requireCensus(
          payerAddress,
          liabilitiesBefore.rows,
          reconciliationsBefore.rows,
        );

        const liability = findLiability(
          liabilitiesBefore.rows,
          liabilityId,
        );
        if (!liability) {
          fail("coupled_native_gas_reconciliation_writer_liability_not_found");
        }

        const existingReconciliation =
          censusBefore.reconciled_liability_ids.includes(liabilityId)
            ? findReconciliation(
                reconciliationsBefore.rows,
                liabilityId,
              )
            : null;
        if (
          censusBefore.reconciled_liability_ids.includes(liabilityId) &&
          !existingReconciliation
        ) {
          fail(
            "coupled_native_gas_reconciliation_writer_idempotent_reconciliation_missing",
          );
        }
        if (
          !existingReconciliation &&
          !censusBefore.effective_open_liability_ids.includes(
            liabilityId,
          )
        ) {
          fail(
            "coupled_native_gas_reconciliation_writer_liability_not_effective_open",
          );
        }
        if (liability.lane !== "presale") {
          fail(
            "coupled_native_gas_reconciliation_writer_wc_void_not_supported",
          );
        }

        const resolved = await dependencies.resolve_evidence({
          root_dir: root!.path,
          liability,
          policy: input.policy,
        });
        if (resolved.ok !== true) {
          fail(
            "coupled_native_gas_reconciliation_writer_resolver_" +
              resolved.stage +
              "_" +
              resolved.reason,
          );
        }
        const packet = resolved.packet;
        const reconciliation = packet.reconciliation;
        if (
          packet.liability_id !== liabilityId ||
          packet.payer_address !== payerAddress ||
          packet.obligation_id !== liability.obligation_id ||
          packet.prepared_plan_reservation_id !==
            liability.obligation_id ||
          packet.prepared_plan_fingerprint_sha256 !==
            liability.transaction_plan_fingerprint_sha256 ||
          packet.terminal_cost_evidence.terminal_cost_identity_sha256 !==
            reconciliation.terminal_cost_identity_sha256 ||
          reconciliation.liability_id !== liabilityId ||
          reconciliation.payer_address !== payerAddress ||
          reconciliation.obligation_id !== liability.obligation_id ||
          reconciliation.transaction_plan_fingerprint_sha256 !==
            liability.transaction_plan_fingerprint_sha256 ||
          reconciliation.terminal_close_candidate !== true ||
          reconciliation.next_open_reserved_wei !== "0" ||
          reconciliation.liability_release_authorized !== false ||
          reconciliation.liability_store_mutation !== false ||
          reconciliation.retry_execution_authorized !== false ||
          reconciliation.funds_movement_performed !== false
        ) {
          fail(
            "coupled_native_gas_reconciliation_writer_resolver_binding_mismatch",
          );
        }

        const domainAfterResolver = readAndBindPayerDomain(
          root!,
          payerAddress,
        );
        const liabilitiesAfterResolver = readHistoryDirectory(
          records!,
          "coupled_native_gas_reconciliation_writer_liabilities",
          "liability_id",
        );
        const reconciliationsAfterResolver = readHistoryDirectory(
          reconciliations!,
          "coupled_native_gas_reconciliation_writer_reconciliations",
          "reconciliation_id",
        );
        const censusAfterResolver = requireCensus(
          payerAddress,
          liabilitiesAfterResolver.rows,
          reconciliationsAfterResolver.rows,
        );
        if (
          domainAfterResolver !== domainBefore ||
          liabilitiesAfterResolver.snapshot_sha256 !==
            liabilitiesBefore.snapshot_sha256 ||
          reconciliationsAfterResolver.snapshot_sha256 !==
            reconciliationsBefore.snapshot_sha256 ||
          censusAfterResolver.census_id !== censusBefore.census_id
        ) {
          fail(
            "coupled_native_gas_reconciliation_writer_history_changed_before_publication",
          );
        }

        if (existingReconciliation) {
          if (
            existingReconciliation.reconciliation_id !==
              reconciliation.reconciliation_id ||
            canonical(existingReconciliation) !==
              canonical(reconciliation)
          ) {
            fail(
              "coupled_native_gas_reconciliation_writer_idempotent_reconciliation_evidence_mismatch",
            );
          }
          fs.fsyncSync(reconciliations!.fd);
          assertPinnedDirectoryVisible(
            reconciliations!,
            "coupled_native_gas_reconciliation_writer_idempotent_directory",
          );
          return Object.freeze({
            ok: true,
            status: "idempotent",
            mutation_performed: mutationPerformed,
            payer_address: payerAddress,
            liability_id: liabilityId,
            reconciliation_id: existingReconciliation.reconciliation_id,
            resolver_packet_id: packet.packet_id,
            census_before_id: censusBefore.census_id,
            census_after_id: censusBefore.census_id,
            effective_open_reserved_before_wei:
              censusBefore.effective_open_reserved_wei,
            effective_open_reserved_after_wei:
              censusBefore.effective_open_reserved_wei,
            released_open_reserve_wei: "0",
            reconciliation: existingReconciliation,
            authority:
              VOID_COUPLED_NATIVE_GAS_RECONCILIATION_WRITER_AUTHORITY_V1,
          });
        }

        const qualifiedBeforePublication =
          await qualifyCoupledNativeGasReconciliationStorageV1({
            root_dir: root!.path,
            payer_address: payerAddress,
          });
        if (qualifiedBeforePublication.ok !== true) {
          fail(
            "coupled_native_gas_reconciliation_writer_storage_changed_before_publication",
          );
        }

        publishReconciliationCreateOnce(
          reconciliations!,
          reconciliation,
          () => {
            mutationPerformed = true;
          },
        );
        dependencies.after_publication?.();

        const domainAfter = readAndBindPayerDomain(
          root!,
          payerAddress,
        );
        const liabilitiesAfter = readHistoryDirectory(
          records!,
          "coupled_native_gas_reconciliation_writer_liabilities",
          "liability_id",
        );
        const reconciliationsAfter = readHistoryDirectory(
          reconciliations!,
          "coupled_native_gas_reconciliation_writer_reconciliations",
          "reconciliation_id",
        );
        exactExpectedReconciliationHistory(
          reconciliationsBefore,
          reconciliationsAfter,
          reconciliation,
        );
        if (
          domainAfter !== domainBefore ||
          liabilitiesAfter.snapshot_sha256 !==
            liabilitiesBefore.snapshot_sha256
        ) {
          fail(
            "coupled_native_gas_reconciliation_writer_liability_history_changed_after_publication",
          );
        }
        const censusAfter = requireCensus(
          payerAddress,
          liabilitiesAfter.rows,
          reconciliationsAfter.rows,
        );
        exactExpectedPostCensus(
          censusBefore,
          censusAfter,
          liability,
          reconciliation,
        );

        const qualifiedAfter =
          await qualifyCoupledNativeGasReconciliationStorageV1({
            root_dir: root!.path,
            payer_address: payerAddress,
          });
        if (
          qualifiedAfter.ok !== true ||
          qualifiedAfter.reconciliation_record_count !==
            reconciliationsAfter.rows.length
        ) {
          fail(
            "coupled_native_gas_reconciliation_writer_storage_postcheck_failed",
          );
        }

        const released =
          BigInt(censusBefore.effective_open_reserved_wei) -
          BigInt(censusAfter.effective_open_reserved_wei);

        return Object.freeze({
          ok: true,
          status: "stored",
          mutation_performed: true,
          payer_address: payerAddress,
          liability_id: liabilityId,
          reconciliation_id: reconciliation.reconciliation_id,
          resolver_packet_id: packet.packet_id,
          census_before_id: censusBefore.census_id,
          census_after_id: censusAfter.census_id,
          effective_open_reserved_before_wei:
            censusBefore.effective_open_reserved_wei,
          effective_open_reserved_after_wei:
            censusAfter.effective_open_reserved_wei,
          released_open_reserve_wei: released.toString(),
          reconciliation,
          authority:
            VOID_COUPLED_NATIVE_GAS_RECONCILIATION_WRITER_AUTHORITY_V1,
        });
      },
    );
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "coupled_native_gas_reconciliation_writer_failed",
      mutationPerformed,
    );
  } finally {
    closePinned(queue);
    closePinned(reconciliations);
    closePinned(records);
    closePinned(root);
  }
}

export async function persistCoupledNativeGasReconciliationV1(input: {
  root_dir: string;
  payer_address: string;
  liability_id: string;
  policy: CoupledNativeGasReconciliationEvidenceResolverPolicyV1;
}): Promise<CoupledNativeGasReconciliationWriterDecisionV1> {
  return await persistWithDependencies(input, {
    resolve_evidence:
      resolveCoupledNativeGasReconciliationEvidenceV1,
  });
}

export async function testOnlyPersistCoupledNativeGasReconciliationV1(
  input: {
    root_dir: string;
    payer_address: string;
    liability_id: string;
    policy: CoupledNativeGasReconciliationEvidenceResolverPolicyV1;
  },
  dependencies: {
    resolve_evidence: (
      input: Parameters<
        typeof resolveCoupledNativeGasReconciliationEvidenceV1
      >[0],
    ) => Promise<
      CoupledNativeGasReconciliationEvidenceResolverDecisionV1
    >;
    after_publication?: () => void;
  },
): Promise<CoupledNativeGasReconciliationWriterDecisionV1> {
  if (typeof dependencies?.resolve_evidence !== "function") {
    return held(
      "coupled_native_gas_reconciliation_writer_test_resolver_required",
      false,
    );
  }
  return await persistWithDependencies(input, {
    resolve_evidence: dependencies.resolve_evidence,
    after_publication: dependencies.after_publication,
  });
}
