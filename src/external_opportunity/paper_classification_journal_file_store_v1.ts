import { createHash } from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  fchmodSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  openSync,
  readSync,
  realpathSync,
  statSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";

import type {
  ExternalOpportunityPaperRiskClassificationV1,
} from "./paper_risk_classification_adapter_v1.js";
import {
  VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_APPEND_CONFIRMATION_V1,
  planExternalOpportunityPaperClassificationJournalAppendV1,
  validateExternalOpportunityPaperClassificationJournalEntryV1,
  writeExternalOpportunityPaperClassificationJournalV1,
  type ExternalOpportunityPaperClassificationJournalEntryV1,
} from "./paper_classification_journal_v1.js";

export const VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_V1 =
  "VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_V1" as const;

export const VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_CONFIG_SCHEMA_V1 =
  "void-external-opportunity-paper-classification-journal-file-store-config-v1" as const;

export const VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_RECEIPT_SCHEMA_V1 =
  "void-external-opportunity-paper-classification-journal-file-store-receipt-v1" as const;

export const VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_CONFIRMATION_V1 =
  "storePaperClassificationJournalEntryV1" as const;

export const VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILENAME_V1 =
  "paper-classification-journal-v1.jsonl" as const;

export const VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_AUTHORITY_V1 =
  Object.freeze({
    explicit_local_filesystem_read: true,
    explicit_local_filesystem_write: true,
    implicit_or_scheduled_access: false,
    network_request: false,
    credential_access: false,
    wallet_or_key_access: false,
    transaction_construction: false,
    transaction_submission: false,
    runtime_mutation: false,
    service_mutation: false,
    scheduler_mutation: false,
    live_execution: false,
  }) as Readonly<ExternalOpportunityPaperClassificationJournalFileStoreAuthorityV1>;

export interface ExternalOpportunityPaperClassificationJournalFileStoreAuthorityV1 {
  explicit_local_filesystem_read: true;
  explicit_local_filesystem_write: true;
  implicit_or_scheduled_access: false;
  network_request: false;
  credential_access: false;
  wallet_or_key_access: false;
  transaction_construction: false;
  transaction_submission: false;
  runtime_mutation: false;
  service_mutation: false;
  scheduler_mutation: false;
  live_execution: false;
}

export interface ExternalOpportunityPaperClassificationJournalFileStoreConfigV1 {
  schema:
    typeof VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_CONFIG_SCHEMA_V1;
  marker:
    typeof VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_V1;
  version: 1;
  allowed_root: string;
  journal_filename:
    typeof VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILENAME_V1;
  max_file_bytes: number;
  max_entries: number;
  max_line_bytes: number;
  required_file_mode_octal: "0600";
  allow_held_entries: boolean;
  fsync_directory: true;
}

export interface ExternalOpportunityPaperClassificationJournalFileStorePathsV1 {
  allowed_root_realpath: string;
  journal_path: string;
  lock_path: string;
}

export interface ExternalOpportunityPaperClassificationJournalFileSnapshotV1 {
  exists: boolean;
  entries: ExternalOpportunityPaperClassificationJournalEntryV1[];
  entry_count: number;
  file_bytes: number;
  file_sha256: string;
  file_mode_octal: "0600" | "absent";
}

export type ExternalOpportunityPaperClassificationJournalFileStoreStatusV1 =
  | "applied"
  | "duplicate"
  | "held"
  | "lock_busy";

export interface ExternalOpportunityPaperClassificationJournalFileStoreReceiptV1 {
  schema:
    typeof VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_RECEIPT_SCHEMA_V1;
  marker:
    typeof VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_V1;
  version: 1;
  status: ExternalOpportunityPaperClassificationJournalFileStoreStatusV1;
  operation_id: string;
  applied: boolean;
  duplicate: boolean;
  lock_acquired: boolean;
  reason: string;
  journal_path: string;
  lock_path: string;
  classification_id: string;
  source_record_sha256: string;
  before_entry_count: number;
  after_entry_count: number;
  before_file_bytes: number;
  after_file_bytes: number;
  bytes_appended: number;
  before_file_sha256: string;
  after_file_sha256: string;
  file_mode_octal: "0600" | "absent";
  file_fsync_performed: boolean;
  directory_fsync_performed: boolean;
  lock_released: boolean;
  explicit_local_filesystem_read_performed: boolean;
  explicit_local_filesystem_write_performed: boolean;
  implicit_or_scheduled_access_performed: false;
  network_request_performed: false;
  credential_access_performed: false;
  wallet_or_key_access_performed: false;
  transaction_construction_performed: false;
  transaction_submission_performed: false;
  runtime_mutation_performed: false;
  service_mutation_performed: false;
  scheduler_mutation_performed: false;
  live_execution_authorized: false;
}

interface JournalFileSnapshotInternalV1
  extends ExternalOpportunityPaperClassificationJournalFileSnapshotV1 {
  file_dev: number | null;
  file_ino: number | null;
}

interface LockHandleV1 {
  acquired: true;
  file_dev: number;
  file_ino: number;
}

interface LockBusyV1 {
  acquired: false;
  reason: "lock_busy" | "lock_path_symlink" | "lock_path_not_regular";
}

type LockResultV1 = LockHandleV1 | LockBusyV1;

class FileStoreHoldV1 extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "FileStoreHoldV1";
    this.code = code;
  }
}

const EMPTY_SHA256_V1 =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const MAX_ALLOWED_FILE_BYTES_V1 = 64 * 1024 * 1024;
const MAX_ALLOWED_ENTRIES_V1 = 100_000;
const MAX_ALLOWED_LINE_BYTES_V1 = 1024 * 1024;
const O_NOFOLLOW_V1 = fsConstants.O_NOFOLLOW || 0;
const O_DIRECTORY_V1 = fsConstants.O_DIRECTORY || 0;

function sha256BytesV1(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function sha256TextV1(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isErrnoV1(error: unknown, code: string): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === code
  );
}

function modeOctalV1(mode: number): string {
  return (mode & 0o777).toString(8).padStart(4, "0");
}

function assertIntegerRangeV1(
  value: unknown,
  minimum: number,
  maximum: number,
  code: string,
): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new FileStoreHoldV1(code);
  }
}

function safeClassificationBindingV1(
  classification: ExternalOpportunityPaperRiskClassificationV1,
): { classification_id: string; source_record_sha256: string } {
  const classificationId =
    typeof classification?.classification_id === "string"
      ? classification.classification_id
      : "";
  const sourceRecordSha256 =
    typeof classification?.source_record_sha256 === "string"
      ? classification.source_record_sha256
      : "";
  return {
    classification_id: /^[0-9a-f]{64}$/.test(classificationId)
      ? classificationId
      : "",
    source_record_sha256: /^[0-9a-f]{64}$/.test(sourceRecordSha256)
      ? sourceRecordSha256
      : "",
  };
}

export function validateExternalOpportunityPaperClassificationJournalFileStoreConfigV1(
  config: unknown,
): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return { ok: false, reasons: ["config_not_object"] };
  }

  const record = config as Record<string, unknown>;
  if (
    record.schema !==
    VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_CONFIG_SCHEMA_V1
  ) {
    reasons.push("config_schema_mismatch");
  }
  if (
    record.marker !==
    VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_V1
  ) {
    reasons.push("config_marker_mismatch");
  }
  if (record.version !== 1) reasons.push("config_version_mismatch");

  if (
    typeof record.allowed_root !== "string" ||
    !isAbsolute(record.allowed_root) ||
    record.allowed_root.includes("\0")
  ) {
    reasons.push("allowed_root_invalid");
  }

  if (
    record.journal_filename !==
    VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILENAME_V1
  ) {
    reasons.push("journal_filename_mismatch");
  }

  for (const [field, minimum, maximum] of [
    ["max_file_bytes", 1, MAX_ALLOWED_FILE_BYTES_V1],
    ["max_entries", 1, MAX_ALLOWED_ENTRIES_V1],
    ["max_line_bytes", 256, MAX_ALLOWED_LINE_BYTES_V1],
  ] as const) {
    const value = record[field];
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < minimum ||
      value > maximum
    ) {
      reasons.push(`${field}_invalid`);
    }
  }

  if (
    typeof record.max_file_bytes === "number" &&
    typeof record.max_line_bytes === "number" &&
    record.max_line_bytes > record.max_file_bytes
  ) {
    reasons.push("max_line_bytes_exceeds_file_limit");
  }

  if (record.required_file_mode_octal !== "0600") {
    reasons.push("required_file_mode_mismatch");
  }
  if (typeof record.allow_held_entries !== "boolean") {
    reasons.push("allow_held_entries_invalid");
  }
  if (record.fsync_directory !== true) {
    reasons.push("fsync_directory_must_be_true");
  }

  return { ok: reasons.length === 0, reasons: [...new Set(reasons)].sort() };
}

function assertConfigV1(
  config: ExternalOpportunityPaperClassificationJournalFileStoreConfigV1,
): void {
  const validation =
    validateExternalOpportunityPaperClassificationJournalFileStoreConfigV1(
      config,
    );
  if (!validation.ok) {
    throw new FileStoreHoldV1(validation.reasons.join(","));
  }
  assertIntegerRangeV1(
    config.max_file_bytes,
    1,
    MAX_ALLOWED_FILE_BYTES_V1,
    "max_file_bytes_invalid",
  );
  assertIntegerRangeV1(
    config.max_entries,
    1,
    MAX_ALLOWED_ENTRIES_V1,
    "max_entries_invalid",
  );
  assertIntegerRangeV1(
    config.max_line_bytes,
    256,
    MAX_ALLOWED_LINE_BYTES_V1,
    "max_line_bytes_invalid",
  );
}

function containsPathV1(root: string, candidate: string): boolean {
  const relation = relative(root, candidate);
  return (
    relation === "" ||
    (!relation.startsWith(`..${sep}`) &&
      relation !== ".." &&
      !isAbsolute(relation))
  );
}

export function resolveExternalOpportunityPaperClassificationJournalFileStorePathsV1(
  config: ExternalOpportunityPaperClassificationJournalFileStoreConfigV1,
): ExternalOpportunityPaperClassificationJournalFileStorePathsV1 {
  assertConfigV1(config);

  let rootMetadata;
  try {
    rootMetadata = lstatSync(config.allowed_root);
  } catch (error) {
    if (isErrnoV1(error, "ENOENT")) {
      throw new FileStoreHoldV1("allowed_root_absent");
    }
    throw error;
  }

  if (rootMetadata.isSymbolicLink()) {
    throw new FileStoreHoldV1("allowed_root_symlink");
  }
  if (!rootMetadata.isDirectory()) {
    throw new FileStoreHoldV1("allowed_root_not_directory");
  }

  const rootRealpath = realpathSync(config.allowed_root);
  const journalPath = join(rootRealpath, config.journal_filename);
  const lockPath = `${journalPath}.lock`;

  if (
    basename(journalPath) !== config.journal_filename ||
    dirname(journalPath) !== rootRealpath ||
    !containsPathV1(rootRealpath, journalPath) ||
    !containsPathV1(rootRealpath, lockPath)
  ) {
    throw new FileStoreHoldV1("journal_path_outside_allowed_root");
  }

  return {
    allowed_root_realpath: rootRealpath,
    journal_path: journalPath,
    lock_path: lockPath,
  };
}

function verifyExistingRegularPathV1(
  path: string,
  root: string,
  kind: "journal" | "lock",
): void {
  let metadata;
  try {
    metadata = lstatSync(path);
  } catch (error) {
    if (isErrnoV1(error, "ENOENT")) return;
    throw error;
  }

  if (metadata.isSymbolicLink()) {
    throw new FileStoreHoldV1(`${kind}_path_symlink`);
  }
  if (!metadata.isFile()) {
    throw new FileStoreHoldV1(`${kind}_path_not_regular`);
  }

  const real = realpathSync(path);
  if (!containsPathV1(root, real)) {
    throw new FileStoreHoldV1(`${kind}_realpath_outside_allowed_root`);
  }
}

function readExactFileV1(
  path: string,
  expectedMaximumBytes: number,
): { bytes: Buffer; metadata: ReturnType<typeof fstatSync> } {
  const descriptor = openSync(
    path,
    fsConstants.O_RDONLY | O_NOFOLLOW_V1,
  );
  try {
    const metadata = fstatSync(descriptor);
    if (!metadata.isFile()) {
      throw new FileStoreHoldV1("journal_descriptor_not_regular");
    }
    if (modeOctalV1(metadata.mode) !== "0600") {
      throw new FileStoreHoldV1("journal_file_mode_not_0600");
    }
    if (metadata.size > expectedMaximumBytes) {
      throw new FileStoreHoldV1("journal_file_size_limit_exceeded");
    }

    const output = Buffer.alloc(metadata.size);
    let offset = 0;
    while (offset < output.length) {
      const read = readSync(
        descriptor,
        output,
        offset,
        output.length - offset,
        offset,
      );
      if (read <= 0) {
        throw new FileStoreHoldV1("journal_short_read");
      }
      offset += read;
    }
    return { bytes: output, metadata };
  } finally {
    closeSync(descriptor);
  }
}

export function readExternalOpportunityPaperClassificationJournalFileStoreV1(
  config: ExternalOpportunityPaperClassificationJournalFileStoreConfigV1,
): ExternalOpportunityPaperClassificationJournalFileSnapshotV1 {
  const paths =
    resolveExternalOpportunityPaperClassificationJournalFileStorePathsV1(
      config,
    );
  return readJournalSnapshotInternalV1(config, paths);
}

function readJournalSnapshotInternalV1(
  config: ExternalOpportunityPaperClassificationJournalFileStoreConfigV1,
  paths: ExternalOpportunityPaperClassificationJournalFileStorePathsV1,
): JournalFileSnapshotInternalV1 {
  verifyExistingRegularPathV1(
    paths.journal_path,
    paths.allowed_root_realpath,
    "journal",
  );

  let metadata;
  try {
    metadata = statSync(paths.journal_path);
  } catch (error) {
    if (isErrnoV1(error, "ENOENT")) {
      return {
        exists: false,
        entries: [],
        entry_count: 0,
        file_bytes: 0,
        file_sha256: EMPTY_SHA256_V1,
        file_mode_octal: "absent",
        file_dev: null,
        file_ino: null,
      };
    }
    throw error;
  }

  if (!metadata.isFile()) {
    throw new FileStoreHoldV1("journal_path_not_regular");
  }
  if (metadata.size > config.max_file_bytes) {
    throw new FileStoreHoldV1("journal_file_size_limit_exceeded");
  }

  const opened = readExactFileV1(
    paths.journal_path,
    config.max_file_bytes,
  );
  const bytes = opened.bytes;
  metadata = opened.metadata;
  const entries: ExternalOpportunityPaperClassificationJournalEntryV1[] = [];

  if (bytes.length > 0) {
    if (bytes[bytes.length - 1] !== 0x0a) {
      throw new FileStoreHoldV1("journal_trailing_partial_line");
    }

    const rawLines = bytes.toString("utf8").split("\n");
    rawLines.pop();
    if (rawLines.length > config.max_entries) {
      throw new FileStoreHoldV1("journal_entry_limit_exceeded");
    }

    const classificationIds = new Set<string>();
    const sourceRecords = new Set<string>();

    for (let index = 0; index < rawLines.length; index += 1) {
      const line = rawLines[index];
      const lineNumber = index + 1;
      if (line.length === 0) {
        throw new FileStoreHoldV1(`journal_empty_line:${lineNumber}`);
      }
      if (Buffer.byteLength(line) > config.max_line_bytes) {
        throw new FileStoreHoldV1(
          `journal_line_size_limit_exceeded:${lineNumber}`,
        );
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        throw new FileStoreHoldV1(`journal_json_invalid:${lineNumber}`);
      }

      const validation =
        validateExternalOpportunityPaperClassificationJournalEntryV1(parsed);
      if (!validation.ok) {
        throw new FileStoreHoldV1(
          `journal_entry_invalid:${lineNumber}:${validation.reasons.join("|")}`,
        );
      }

      const entry =
        parsed as ExternalOpportunityPaperClassificationJournalEntryV1;
      if (classificationIds.has(entry.classification_id)) {
        throw new FileStoreHoldV1(
          `journal_duplicate_classification_id:${lineNumber}`,
        );
      }
      if (sourceRecords.has(entry.source_record_sha256)) {
        throw new FileStoreHoldV1(
          `journal_duplicate_source_record:${lineNumber}`,
        );
      }

      classificationIds.add(entry.classification_id);
      sourceRecords.add(entry.source_record_sha256);
      entries.push(entry);
    }
  }

  return {
    exists: true,
    entries,
    entry_count: entries.length,
    file_bytes: bytes.length,
    file_sha256: sha256BytesV1(bytes),
    file_mode_octal: "0600",
    file_dev: Number(metadata.dev),
    file_ino: Number(metadata.ino),
  };
}

function acquireLockV1(
  paths: ExternalOpportunityPaperClassificationJournalFileStorePathsV1,
  operationId: string,
  recordedAt: string,
): LockResultV1 {
  verifyExistingRegularPathV1(
    paths.lock_path,
    paths.allowed_root_realpath,
    "lock",
  );

  let descriptor: number;
  try {
    descriptor = openSync(
      paths.lock_path,
      fsConstants.O_WRONLY |
        fsConstants.O_CREAT |
        fsConstants.O_EXCL |
        O_NOFOLLOW_V1,
      0o600,
    );
  } catch (error) {
    if (isErrnoV1(error, "EEXIST")) {
      const metadata = lstatSync(paths.lock_path);
      if (metadata.isSymbolicLink()) {
        return { acquired: false, reason: "lock_path_symlink" };
      }
      if (!metadata.isFile()) {
        return { acquired: false, reason: "lock_path_not_regular" };
      }
      return { acquired: false, reason: "lock_busy" };
    }
    throw error;
  }

  try {
    fchmodSync(descriptor, 0o600);
    const lockBytes = Buffer.from(
      `${JSON.stringify({
        marker:
          VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_V1,
        operation_id: operationId,
        recorded_at: recordedAt,
        pid: process.pid,
      })}\n`,
      "utf8",
    );
    let offset = 0;
    while (offset < lockBytes.length) {
      offset += writeSync(
        descriptor,
        lockBytes,
        offset,
        lockBytes.length - offset,
        null,
      );
    }
    fsyncSync(descriptor);
    const metadata = fstatSync(descriptor);
    return {
      acquired: true,
      file_dev: Number(metadata.dev),
      file_ino: Number(metadata.ino),
    };
  } catch (error) {
    try {
      closeSync(descriptor);
    } catch {}
    try {
      unlinkSync(paths.lock_path);
    } catch {}
    throw error;
  } finally {
    try {
      closeSync(descriptor);
    } catch {}
  }
}

function fsyncDirectoryV1(root: string): void {
  const descriptor = openSync(
    root,
    fsConstants.O_RDONLY | O_DIRECTORY_V1,
  );
  try {
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

function releaseLockV1(
  paths: ExternalOpportunityPaperClassificationJournalFileStorePathsV1,
  handle: LockHandleV1,
  fsyncDirectory: boolean,
): boolean {
  let metadata;
  try {
    metadata = lstatSync(paths.lock_path);
  } catch (error) {
    if (isErrnoV1(error, "ENOENT")) return false;
    throw error;
  }

  if (
    metadata.isSymbolicLink() ||
    !metadata.isFile() ||
    Number(metadata.dev) !== handle.file_dev ||
    Number(metadata.ino) !== handle.file_ino
  ) {
    return false;
  }

  unlinkSync(paths.lock_path);
  if (fsyncDirectory) {
    fsyncDirectoryV1(paths.allowed_root_realpath);
  }
  return true;
}

function operationIdV1(
  config: ExternalOpportunityPaperClassificationJournalFileStoreConfigV1,
  classification: ExternalOpportunityPaperRiskClassificationV1,
  recordedAt: string,
): string {
  const binding = safeClassificationBindingV1(classification);
  return sha256TextV1(
    JSON.stringify({
      marker:
        VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_V1,
      allowed_root: resolve(config.allowed_root),
      journal_filename: config.journal_filename,
      classification_id: binding.classification_id,
      source_record_sha256: binding.source_record_sha256,
      recorded_at: recordedAt,
    }),
  );
}

function baseReceiptV1(input: {
  status: ExternalOpportunityPaperClassificationJournalFileStoreStatusV1;
  operation_id: string;
  applied: boolean;
  duplicate: boolean;
  lock_acquired: boolean;
  reason: string;
  paths?: ExternalOpportunityPaperClassificationJournalFileStorePathsV1;
  classification: ExternalOpportunityPaperRiskClassificationV1;
  before?: JournalFileSnapshotInternalV1;
  after?: JournalFileSnapshotInternalV1;
  bytes_appended?: number;
  file_fsync_performed?: boolean;
  directory_fsync_performed?: boolean;
  lock_released?: boolean;
  read_performed?: boolean;
  write_performed?: boolean;
}): ExternalOpportunityPaperClassificationJournalFileStoreReceiptV1 {
  const binding = safeClassificationBindingV1(input.classification);
  const before = input.before;
  const after = input.after || before;
  return {
    schema:
      VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_RECEIPT_SCHEMA_V1,
    marker:
      VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_V1,
    version: 1,
    status: input.status,
    operation_id: input.operation_id,
    applied: input.applied,
    duplicate: input.duplicate,
    lock_acquired: input.lock_acquired,
    reason: input.reason,
    journal_path: input.paths?.journal_path || "",
    lock_path: input.paths?.lock_path || "",
    classification_id: binding.classification_id,
    source_record_sha256: binding.source_record_sha256,
    before_entry_count: before?.entry_count || 0,
    after_entry_count: after?.entry_count || 0,
    before_file_bytes: before?.file_bytes || 0,
    after_file_bytes: after?.file_bytes || 0,
    bytes_appended: input.bytes_appended || 0,
    before_file_sha256: before?.file_sha256 || EMPTY_SHA256_V1,
    after_file_sha256: after?.file_sha256 || EMPTY_SHA256_V1,
    file_mode_octal: after?.file_mode_octal || before?.file_mode_octal || "absent",
    file_fsync_performed: input.file_fsync_performed || false,
    directory_fsync_performed:
      input.directory_fsync_performed || false,
    lock_released: input.lock_released || false,
    explicit_local_filesystem_read_performed: input.read_performed || false,
    explicit_local_filesystem_write_performed: input.write_performed || false,
    implicit_or_scheduled_access_performed: false,
    network_request_performed: false,
    credential_access_performed: false,
    wallet_or_key_access_performed: false,
    transaction_construction_performed: false,
    transaction_submission_performed: false,
    runtime_mutation_performed: false,
    service_mutation_performed: false,
    scheduler_mutation_performed: false,
    live_execution_authorized: false,
  };
}

export function storeExternalOpportunityPaperClassificationJournalFileV1(
  input: {
    config: ExternalOpportunityPaperClassificationJournalFileStoreConfigV1;
    classification: ExternalOpportunityPaperRiskClassificationV1;
    recorded_at: string;
    confirmation: string;
  },
): ExternalOpportunityPaperClassificationJournalFileStoreReceiptV1 {
  const operationId = operationIdV1(
    input.config,
    input.classification,
    input.recorded_at,
  );

  let paths:
    | ExternalOpportunityPaperClassificationJournalFileStorePathsV1
    | undefined;
  let lockHandle: LockHandleV1 | undefined;
  let before: JournalFileSnapshotInternalV1 | undefined;
  let after: JournalFileSnapshotInternalV1 | undefined;
  let bytesAppended = 0;
  let fileFsyncPerformed = false;
  let directoryFsyncPerformed = false;
  let readPerformed = false;
  let writePerformed = false;
  let pendingReceipt:
    | ExternalOpportunityPaperClassificationJournalFileStoreReceiptV1
    | undefined;

  try {
    if (
      input.confirmation !==
      VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_CONFIRMATION_V1
    ) {
      return baseReceiptV1({
        status: "held",
        operation_id: operationId,
        applied: false,
        duplicate: false,
        lock_acquired: false,
        reason:
          "file_store_confirmation_required:" +
          VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_CONFIRMATION_V1,
        classification: input.classification,
      });
    }

    if (
      !input.recorded_at ||
      !Number.isFinite(Date.parse(input.recorded_at))
    ) {
      return baseReceiptV1({
        status: "held",
        operation_id: operationId,
        applied: false,
        duplicate: false,
        lock_acquired: false,
        reason: "recorded_at_invalid",
        classification: input.classification,
      });
    }

    paths =
      resolveExternalOpportunityPaperClassificationJournalFileStorePathsV1(
        input.config,
      );

    const lockResult = acquireLockV1(
      paths,
      operationId,
      new Date(input.recorded_at).toISOString(),
    );
    if (lockResult.acquired === false) {
      return baseReceiptV1({
        status:
          lockResult.reason === "lock_busy" ? "lock_busy" : "held",
        operation_id: operationId,
        applied: false,
        duplicate: false,
        lock_acquired: false,
        reason: lockResult.reason,
        paths,
        classification: input.classification,
      });
    }
    lockHandle = lockResult;
    writePerformed = true;

    before = readJournalSnapshotInternalV1(input.config, paths);
    readPerformed = true;

    const plan =
      planExternalOpportunityPaperClassificationJournalAppendV1({
        classification: input.classification,
        existing_entries: before.entries,
        recorded_at: input.recorded_at,
        policy: {
          allow_held_entries: input.config.allow_held_entries,
          max_existing_entries: input.config.max_entries,
        },
      });

    const journalResult =
      writeExternalOpportunityPaperClassificationJournalV1({
        plan,
        confirmation:
          plan.status === "ready"
            ? VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_APPEND_CONFIRMATION_V1
            : "",
        dependencies: {
          append_json_line(line, entry) {
            const lineBytes = Buffer.from(line, "utf8");
            if (lineBytes.length > input.config.max_line_bytes) {
              return {
                ok: false as const,
                error: "journal_line_size_limit_exceeded",
              };
            }
            if (
              before &&
              before.file_bytes + lineBytes.length >
                input.config.max_file_bytes
            ) {
              return {
                ok: false as const,
                error: "journal_file_size_limit_exceeded",
              };
            }

            const current = readJournalSnapshotInternalV1(
              input.config,
              paths!,
            );
            readPerformed = true;
            if (
              !before ||
              current.file_bytes !== before.file_bytes ||
              current.file_sha256 !== before.file_sha256 ||
              current.entry_count !== before.entry_count
            ) {
              return {
                ok: false as const,
                error: "journal_changed_after_plan",
              };
            }

            verifyExistingRegularPathV1(
              paths!.journal_path,
              paths!.allowed_root_realpath,
              "journal",
            );

            const openFlags =
              fsConstants.O_WRONLY |
              fsConstants.O_APPEND |
              O_NOFOLLOW_V1 |
              (before.exists
                ? 0
                : fsConstants.O_CREAT | fsConstants.O_EXCL);
            let descriptor: number;
            try {
              descriptor = openSync(
                paths!.journal_path,
                openFlags,
                0o600,
              );
            } catch (error) {
              if (!before.exists && isErrnoV1(error, "EEXIST")) {
                return {
                  ok: false as const,
                  error: "journal_created_after_plan",
                };
              }
              if (before.exists && isErrnoV1(error, "ENOENT")) {
                return {
                  ok: false as const,
                  error: "journal_removed_after_plan",
                };
              }
              throw error;
            }
            try {
              const metadata = fstatSync(descriptor);
              if (!metadata.isFile()) {
                return {
                  ok: false as const,
                  error: "journal_descriptor_not_regular",
                };
              }
              if (
                before.exists &&
                (Number(metadata.dev) !== before.file_dev ||
                  Number(metadata.ino) !== before.file_ino ||
                  metadata.size !== before.file_bytes)
              ) {
                return {
                  ok: false as const,
                  error: "journal_inode_or_size_changed_after_plan",
                };
              }
              if (!before.exists && metadata.size !== 0) {
                return {
                  ok: false as const,
                  error: "journal_created_with_unexpected_content",
                };
              }

              fchmodSync(descriptor, 0o600);
              let offset = 0;
              while (offset < lineBytes.length) {
                const written = writeSync(
                  descriptor,
                  lineBytes,
                  offset,
                  lineBytes.length - offset,
                  null,
                );
                if (written <= 0) {
                  return {
                    ok: false as const,
                    error: "journal_zero_byte_write",
                  };
                }
                offset += written;
              }
              fsyncSync(descriptor);
              fileFsyncPerformed = true;
              bytesAppended = lineBytes.length;
              writePerformed = true;
            } finally {
              closeSync(descriptor);
            }

            if (input.config.fsync_directory) {
              fsyncDirectoryV1(paths!.allowed_root_realpath);
              directoryFsyncPerformed = true;
            }

            if (
              entry.classification_id !==
              input.classification.classification_id
            ) {
              return {
                ok: false as const,
                error: "appended_entry_classification_binding_mismatch",
              };
            }

            return {
              ok: true as const,
              bytes_written: lineBytes.length,
            };
          },
        },
      });

    if (journalResult.status === "applied") {
      after = readJournalSnapshotInternalV1(input.config, paths);
      readPerformed = true;
      if (
        after.entry_count !== before.entry_count + 1 ||
        after.file_bytes !== before.file_bytes + bytesAppended ||
        after.entries[after.entries.length - 1]?.classification_id !==
          input.classification.classification_id ||
        after.file_sha256 === before.file_sha256
      ) {
        throw new FileStoreHoldV1("post_append_verification_failed");
      }

      pendingReceipt = baseReceiptV1({
        status: "applied",
        operation_id: operationId,
        applied: true,
        duplicate: false,
        lock_acquired: true,
        reason: "",
        paths,
        classification: input.classification,
        before,
        after,
        bytes_appended: bytesAppended,
        file_fsync_performed: fileFsyncPerformed,
        directory_fsync_performed: directoryFsyncPerformed,
        read_performed: readPerformed,
        write_performed: writePerformed,
      });
    } else if (journalResult.status === "duplicate") {
      after = readJournalSnapshotInternalV1(input.config, paths);
      readPerformed = true;
      if (
        after.file_sha256 !== before.file_sha256 ||
        after.file_bytes !== before.file_bytes ||
        after.entry_count !== before.entry_count
      ) {
        throw new FileStoreHoldV1(
          "journal_changed_during_duplicate_resolution",
        );
      }

      pendingReceipt = baseReceiptV1({
        status: "duplicate",
        operation_id: operationId,
        applied: false,
        duplicate: true,
        lock_acquired: true,
        reason: "classification_already_recorded",
        paths,
        classification: input.classification,
        before,
        after,
        read_performed: readPerformed,
        write_performed: writePerformed,
      });
    } else {
      after = readJournalSnapshotInternalV1(input.config, paths);
      readPerformed = true;
      if (
        after.file_sha256 !== before.file_sha256 ||
        after.file_bytes !== before.file_bytes ||
        after.entry_count !== before.entry_count
      ) {
        throw new FileStoreHoldV1(
          "journal_changed_during_held_resolution",
        );
      }

      pendingReceipt = baseReceiptV1({
        status: "held",
        operation_id: operationId,
        applied: false,
        duplicate: false,
        lock_acquired: true,
        reason: journalResult.reason || "journal_plan_held",
        paths,
        classification: input.classification,
        before,
        after,
        read_performed: readPerformed,
        write_performed: writePerformed,
      });
    }
  } catch (error) {
    const reason =
      error instanceof FileStoreHoldV1
        ? error.code
        : error instanceof Error
          ? `file_store_error:${error.message}`
          : "file_store_unknown_error";
    pendingReceipt = baseReceiptV1({
      status: "held",
      operation_id: operationId,
      applied: false,
      duplicate: false,
      lock_acquired: Boolean(lockHandle),
      reason,
      paths,
      classification: input.classification,
      before,
      after,
      bytes_appended: bytesAppended,
      file_fsync_performed: fileFsyncPerformed,
      directory_fsync_performed: directoryFsyncPerformed,
      read_performed: readPerformed,
      write_performed: writePerformed,
    });
  } finally {
    if (paths && lockHandle) {
      const released = releaseLockV1(
        paths,
        lockHandle,
        input.config.fsync_directory,
      );
      directoryFsyncPerformed =
        directoryFsyncPerformed || input.config.fsync_directory;
      if (pendingReceipt) {
        pendingReceipt.lock_released = released;
        pendingReceipt.directory_fsync_performed =
          directoryFsyncPerformed;
        pendingReceipt.explicit_local_filesystem_write_performed = true;
        if (!released && pendingReceipt.status !== "held") {
          pendingReceipt.status = "held";
          pendingReceipt.applied = false;
          pendingReceipt.duplicate = false;
          pendingReceipt.reason = "lock_release_failed";
        }
      }
    }
  }

  return (
    pendingReceipt ||
    baseReceiptV1({
      status: "held",
      operation_id: operationId,
      applied: false,
      duplicate: false,
      lock_acquired: false,
      reason: "file_store_no_result",
      paths,
      classification: input.classification,
      before,
      after,
      read_performed: readPerformed,
      write_performed: writePerformed,
    })
  );
}
