import { createHash } from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
  realpathSync,
} from "node:fs";
import { basename, isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  validateExternalOpportunityProviderRiskRegistryV1,
  type ExternalOpportunityProviderRiskRegistryV1,
} from "./provider_risk_registry_v1.js";
import {
  classifyExternalOpportunityPaperObservationV1,
  type ExternalOpportunityPaperRiskClassificationV1,
} from "./paper_risk_classification_adapter_v1.js";
import {
  planExternalOpportunityPaperClassificationJournalAppendV1,
  type ExternalOpportunityPaperClassificationJournalPlanV1,
} from "./paper_classification_journal_v1.js";
import {
  VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILENAME_V1,
  VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_CONFIG_SCHEMA_V1,
  VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_CONFIRMATION_V1,
  VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_V1,
  readExternalOpportunityPaperClassificationJournalFileStoreV1,
  storeExternalOpportunityPaperClassificationJournalFileV1,
  type ExternalOpportunityPaperClassificationJournalFileSnapshotV1,
  type ExternalOpportunityPaperClassificationJournalFileStoreConfigV1,
  type ExternalOpportunityPaperClassificationJournalFileStoreReceiptV1,
} from "./paper_classification_journal_file_store_v1.js";

export const VOID_EXTERNAL_OPPORTUNITY_PAPER_INTAKE_CLI_V1 =
  "VOID_EXTERNAL_OPPORTUNITY_PAPER_INTAKE_CLI_V1" as const;

export const VOID_EXTERNAL_OPPORTUNITY_PAPER_INTAKE_CLI_REQUEST_SCHEMA_V1 =
  "void-external-opportunity-paper-intake-cli-request-v1" as const;

export const VOID_EXTERNAL_OPPORTUNITY_PAPER_INTAKE_CLI_RESULT_SCHEMA_V1 =
  "void-external-opportunity-paper-intake-cli-result-v1" as const;

export const VOID_EXTERNAL_OPPORTUNITY_PAPER_INTAKE_CLI_RECORD_CONFIRMATION_V1 =
  "recordPaperOpportunityV1" as const;

export const VOID_EXTERNAL_OPPORTUNITY_PAPER_INTAKE_CLI_AUTHORITY_V1 =
  Object.freeze({
    explicit_local_request_read: true,
    explicit_local_registry_read: true,
    explicit_local_observation_read: true,
    explicit_local_journal_read: true,
    explicit_local_journal_write_with_confirmation: true,
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
  }) as Readonly<ExternalOpportunityPaperIntakeCliAuthorityV1>;

export interface ExternalOpportunityPaperIntakeCliAuthorityV1 {
  explicit_local_request_read: true;
  explicit_local_registry_read: true;
  explicit_local_observation_read: true;
  explicit_local_journal_read: true;
  explicit_local_journal_write_with_confirmation: true;
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

export type ExternalOpportunityPaperIntakeCliModeV1 =
  | "dry_run"
  | "record";

export interface ExternalOpportunityPaperIntakeCliRequestV1 {
  schema:
    typeof VOID_EXTERNAL_OPPORTUNITY_PAPER_INTAKE_CLI_REQUEST_SCHEMA_V1;
  marker: typeof VOID_EXTERNAL_OPPORTUNITY_PAPER_INTAKE_CLI_V1;
  version: 1;
  mode?: ExternalOpportunityPaperIntakeCliModeV1;
  registry_path: string;
  observation_path: string;
  allowed_root: string;
  recorded_at: string;
  confirmation?: string;
  allow_held_entries?: boolean;
  max_file_bytes?: number;
  max_entries?: number;
  max_line_bytes?: number;
}

export type ExternalOpportunityPaperIntakeCliStatusV1 =
  | "dry_run_ready"
  | "dry_run_duplicate"
  | "dry_run_held"
  | "record_applied"
  | "record_duplicate"
  | "record_held"
  | "record_lock_busy"
  | "input_held"
  | "usage_held"
  | "internal_held";

export interface ExternalOpportunityPaperIntakeCliJournalSummaryV1 {
  journal_filename:
    typeof VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILENAME_V1;
  allowed_root_basename: string;
  exists_before: boolean;
  entry_count_before: number;
  file_bytes_before: number;
  file_sha256_before: string;
  file_mode_before: "0600" | "absent";
  plan_status: "ready" | "duplicate" | "held" | "not_planned";
  plan_append_authorized: boolean;
  plan_duplicate: boolean;
  plan_reasons: string[];
  planned_entry_fingerprint_sha256: string;
}

export interface ExternalOpportunityPaperIntakeCliRecordSummaryV1 {
  status: "applied" | "duplicate" | "held" | "lock_busy";
  operation_id: string;
  applied: boolean;
  duplicate: boolean;
  lock_acquired: boolean;
  reason: string;
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
}

export interface ExternalOpportunityPaperIntakeCliResultV1 {
  schema:
    typeof VOID_EXTERNAL_OPPORTUNITY_PAPER_INTAKE_CLI_RESULT_SCHEMA_V1;
  marker: typeof VOID_EXTERNAL_OPPORTUNITY_PAPER_INTAKE_CLI_V1;
  version: 1;
  status: ExternalOpportunityPaperIntakeCliStatusV1;
  exit_code: number;
  mode: ExternalOpportunityPaperIntakeCliModeV1;
  reason: string;
  reasons: string[];
  request_file_sha256: string;
  registry_file_sha256: string;
  observation_file_sha256: string;
  registry_validation_ok: boolean;
  registry_validation_reasons: string[];
  classification: ExternalOpportunityPaperRiskClassificationV1 | null;
  journal: ExternalOpportunityPaperIntakeCliJournalSummaryV1 | null;
  record: ExternalOpportunityPaperIntakeCliRecordSummaryV1 | null;
  explicit_local_request_read_performed: boolean;
  explicit_local_registry_read_performed: boolean;
  explicit_local_observation_read_performed: boolean;
  explicit_local_journal_read_performed: boolean;
  explicit_local_journal_write_performed: boolean;
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
  execution_authorized: false;
}

export interface ExternalOpportunityPaperIntakeCliIoV1 {
  stdout_write: (value: string) => void;
  stderr_write: (value: string) => void;
}

interface LocalJsonFileV1 {
  value: unknown;
  sha256: string;
  bytes: number;
  realpath: string;
}

interface NormalizedRequestV1 {
  request: ExternalOpportunityPaperIntakeCliRequestV1;
  mode: ExternalOpportunityPaperIntakeCliModeV1;
  recorded_at: string;
  allow_held_entries: boolean;
  max_file_bytes: number;
  max_entries: number;
  max_line_bytes: number;
}

const REQUEST_MAX_BYTES_V1 = 128 * 1024;
const REGISTRY_MAX_BYTES_V1 = 1024 * 1024;
const OBSERVATION_MAX_BYTES_V1 = 256 * 1024;
const DEFAULT_MAX_FILE_BYTES_V1 = 8 * 1024 * 1024;
const DEFAULT_MAX_ENTRIES_V1 = 10_000;
const DEFAULT_MAX_LINE_BYTES_V1 = 1024 * 1024;
const O_NOFOLLOW_V1 = fsConstants.O_NOFOLLOW || 0;
const SHA256_V1 = /^[0-9a-f]{64}$/;
const SAFE_REASON_V1 = /^[A-Za-z0-9._:,-]{1,240}$/;
const REQUEST_KEYS_V1 = new Set([
  "schema",
  "marker",
  "version",
  "mode",
  "registry_path",
  "observation_path",
  "allowed_root",
  "recorded_at",
  "confirmation",
  "allow_held_entries",
  "max_file_bytes",
  "max_entries",
  "max_line_bytes",
]);

function isRecordV1(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sha256BytesV1(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function errnoCodeV1(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as NodeJS.ErrnoException).code === "string"
  ) {
    return (error as NodeJS.ErrnoException).code!;
  }
  return "unknown";
}

function safeReasonV1(error: unknown): string {
  const message =
    error instanceof Error && error.message
      ? error.message
      : `filesystem_error:${errnoCodeV1(error)}`;
  return SAFE_REASON_V1.test(message)
    ? message
    : `filesystem_error:${errnoCodeV1(error)}`;
}

function normalizedIntegerV1(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number | null {
  if (value === undefined) return fallback;
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    return null;
  }
  return value;
}

function readLocalJsonFileV1(
  inputPath: string,
  maxBytes: number,
  label: string,
): LocalJsonFileV1 {
  if (
    typeof inputPath !== "string" ||
    !isAbsolute(inputPath) ||
    inputPath.includes("\0")
  ) {
    throw new Error(`${label}_path_must_be_absolute`);
  }

  const metadata = lstatSync(inputPath);
  if (metadata.isSymbolicLink()) {
    throw new Error(`${label}_path_symlink`);
  }
  if (!metadata.isFile()) {
    throw new Error(`${label}_path_not_regular`);
  }
  if (metadata.size < 1) {
    throw new Error(`${label}_file_empty`);
  }
  if (metadata.size > maxBytes) {
    throw new Error(`${label}_file_size_limit_exceeded`);
  }

  const descriptor = openSync(
    inputPath,
    fsConstants.O_RDONLY | O_NOFOLLOW_V1,
  );
  try {
    const opened = fstatSync(descriptor);
    if (!opened.isFile()) {
      throw new Error(`${label}_descriptor_not_regular`);
    }
    if (
      Number(opened.dev) !== Number(metadata.dev) ||
      Number(opened.ino) !== Number(metadata.ino) ||
      opened.size !== metadata.size
    ) {
      throw new Error(`${label}_file_changed_before_read`);
    }

    const output = Buffer.alloc(opened.size);
    let offset = 0;
    while (offset < output.length) {
      const count = readSync(
        descriptor,
        output,
        offset,
        output.length - offset,
        offset,
      );
      if (count <= 0) {
        throw new Error(`${label}_short_read`);
      }
      offset += count;
    }

    let value: unknown;
    try {
      value = JSON.parse(output.toString("utf8"));
    } catch (error) {
      if (error instanceof Error) {
        void error.message;
      }
      throw new Error(`${label}_json_invalid`);
    }

    return {
      value,
      sha256: sha256BytesV1(output),
      bytes: output.length,
      realpath: realpathSync(inputPath),
    };
  } finally {
    closeSync(descriptor);
  }
}

function baseResultV1(
  status: ExternalOpportunityPaperIntakeCliStatusV1,
  exitCode: number,
  reason: string,
): ExternalOpportunityPaperIntakeCliResultV1 {
  return {
    schema: VOID_EXTERNAL_OPPORTUNITY_PAPER_INTAKE_CLI_RESULT_SCHEMA_V1,
    marker: VOID_EXTERNAL_OPPORTUNITY_PAPER_INTAKE_CLI_V1,
    version: 1,
    status,
    exit_code: exitCode,
    mode: "dry_run",
    reason,
    reasons: reason ? [reason] : [],
    request_file_sha256: "",
    registry_file_sha256: "",
    observation_file_sha256: "",
    registry_validation_ok: false,
    registry_validation_reasons: [],
    classification: null,
    journal: null,
    record: null,
    explicit_local_request_read_performed: false,
    explicit_local_registry_read_performed: false,
    explicit_local_observation_read_performed: false,
    explicit_local_journal_read_performed: false,
    explicit_local_journal_write_performed: false,
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
    execution_authorized: false,
  };
}

function validationResultV1(
  input: unknown,
): { normalized: NormalizedRequestV1 | null; reasons: string[] } {
  if (!isRecordV1(input)) {
    return { normalized: null, reasons: ["request_not_object"] };
  }

  const reasons: string[] = [];
  for (const key of Object.keys(input)) {
    if (!REQUEST_KEYS_V1.has(key)) {
      reasons.push(`unknown_request_key:${key}`);
    }
  }

  if (
    input.schema !==
    VOID_EXTERNAL_OPPORTUNITY_PAPER_INTAKE_CLI_REQUEST_SCHEMA_V1
  ) {
    reasons.push("request_schema_mismatch");
  }
  if (input.marker !== VOID_EXTERNAL_OPPORTUNITY_PAPER_INTAKE_CLI_V1) {
    reasons.push("request_marker_mismatch");
  }
  if (input.version !== 1) {
    reasons.push("request_version_mismatch");
  }

  const mode =
    input.mode === undefined
      ? "dry_run"
      : input.mode === "dry_run" || input.mode === "record"
        ? input.mode
        : null;
  if (mode === null) {
    reasons.push("mode_invalid");
  }

  for (const field of [
    "registry_path",
    "observation_path",
    "allowed_root",
  ] as const) {
    const value = input[field];
    if (
      typeof value !== "string" ||
      !isAbsolute(value) ||
      value.includes("\0")
    ) {
      reasons.push(`${field}_must_be_absolute`);
    }
  }

  if (
    typeof input.recorded_at !== "string" ||
    !Number.isFinite(Date.parse(input.recorded_at))
  ) {
    reasons.push("recorded_at_invalid");
  }

  const allowHeld =
    input.allow_held_entries === undefined
      ? false
      : input.allow_held_entries;
  if (typeof allowHeld !== "boolean") {
    reasons.push("allow_held_entries_invalid");
  }

  const maxFileBytes = normalizedIntegerV1(
    input.max_file_bytes,
    DEFAULT_MAX_FILE_BYTES_V1,
    1,
    64 * 1024 * 1024,
  );
  if (maxFileBytes === null) reasons.push("max_file_bytes_invalid");

  const maxEntries = normalizedIntegerV1(
    input.max_entries,
    DEFAULT_MAX_ENTRIES_V1,
    1,
    100_000,
  );
  if (maxEntries === null) reasons.push("max_entries_invalid");

  const maxLineBytes = normalizedIntegerV1(
    input.max_line_bytes,
    DEFAULT_MAX_LINE_BYTES_V1,
    256,
    1024 * 1024,
  );
  if (maxLineBytes === null) reasons.push("max_line_bytes_invalid");
  if (
    maxFileBytes !== null &&
    maxLineBytes !== null &&
    maxLineBytes > maxFileBytes
  ) {
    reasons.push("max_line_bytes_exceeds_file_limit");
  }

  if (mode === "record") {
    if (
      input.confirmation !==
      VOID_EXTERNAL_OPPORTUNITY_PAPER_INTAKE_CLI_RECORD_CONFIRMATION_V1
    ) {
      reasons.push(
        "record_confirmation_required:" +
          VOID_EXTERNAL_OPPORTUNITY_PAPER_INTAKE_CLI_RECORD_CONFIRMATION_V1,
      );
    }
  } else if (
    mode === "dry_run" &&
    input.confirmation !== undefined &&
    input.confirmation !== ""
  ) {
    reasons.push("confirmation_not_allowed_in_dry_run");
  }

  if (
    reasons.length > 0 ||
    mode === null ||
    typeof allowHeld !== "boolean" ||
    maxFileBytes === null ||
    maxEntries === null ||
    maxLineBytes === null ||
    typeof input.registry_path !== "string" ||
    typeof input.observation_path !== "string" ||
    typeof input.allowed_root !== "string" ||
    typeof input.recorded_at !== "string"
  ) {
    return {
      normalized: null,
      reasons: [...new Set(reasons)].sort(),
    };
  }

  return {
    normalized: {
      request: input as unknown as ExternalOpportunityPaperIntakeCliRequestV1,
      mode,
      recorded_at: new Date(input.recorded_at).toISOString(),
      allow_held_entries: allowHeld,
      max_file_bytes: maxFileBytes,
      max_entries: maxEntries,
      max_line_bytes: maxLineBytes,
    },
    reasons: [],
  };
}

export function validateExternalOpportunityPaperIntakeCliRequestV1(
  input: unknown,
): { ok: boolean; reasons: string[] } {
  const result = validationResultV1(input);
  return {
    ok: result.normalized !== null,
    reasons: result.reasons,
  };
}

function fileStoreConfigV1(
  request: NormalizedRequestV1,
): ExternalOpportunityPaperClassificationJournalFileStoreConfigV1 {
  return {
    schema:
      VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_CONFIG_SCHEMA_V1,
    marker:
      VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_V1,
    version: 1,
    allowed_root: request.request.allowed_root,
    journal_filename:
      VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILENAME_V1,
    max_file_bytes: request.max_file_bytes,
    max_entries: request.max_entries,
    max_line_bytes: request.max_line_bytes,
    required_file_mode_octal: "0600",
    allow_held_entries: request.allow_held_entries,
    fsync_directory: true,
  };
}

function journalSummaryV1(
  request: NormalizedRequestV1,
  snapshot: ExternalOpportunityPaperClassificationJournalFileSnapshotV1,
  plan: ExternalOpportunityPaperClassificationJournalPlanV1,
): ExternalOpportunityPaperIntakeCliJournalSummaryV1 {
  return {
    journal_filename:
      VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILENAME_V1,
    allowed_root_basename: basename(resolve(request.request.allowed_root)),
    exists_before: snapshot.exists,
    entry_count_before: snapshot.entry_count,
    file_bytes_before: snapshot.file_bytes,
    file_sha256_before: snapshot.file_sha256,
    file_mode_before: snapshot.file_mode_octal,
    plan_status: plan.status,
    plan_append_authorized: plan.append_authorized,
    plan_duplicate: plan.duplicate,
    plan_reasons: [...plan.reasons],
    planned_entry_fingerprint_sha256:
      plan.entry?.entry_fingerprint_sha256 || "",
  };
}

function recordSummaryV1(
  receipt: ExternalOpportunityPaperClassificationJournalFileStoreReceiptV1,
): ExternalOpportunityPaperIntakeCliRecordSummaryV1 {
  return {
    status: receipt.status,
    operation_id: receipt.operation_id,
    applied: receipt.applied,
    duplicate: receipt.duplicate,
    lock_acquired: receipt.lock_acquired,
    reason: receipt.reason,
    classification_id: receipt.classification_id,
    source_record_sha256: receipt.source_record_sha256,
    before_entry_count: receipt.before_entry_count,
    after_entry_count: receipt.after_entry_count,
    before_file_bytes: receipt.before_file_bytes,
    after_file_bytes: receipt.after_file_bytes,
    bytes_appended: receipt.bytes_appended,
    before_file_sha256: receipt.before_file_sha256,
    after_file_sha256: receipt.after_file_sha256,
    file_mode_octal: receipt.file_mode_octal,
    file_fsync_performed: receipt.file_fsync_performed,
    directory_fsync_performed: receipt.directory_fsync_performed,
    lock_released: receipt.lock_released,
  };
}

function statusForDryPlanV1(
  plan: ExternalOpportunityPaperClassificationJournalPlanV1,
): { status: ExternalOpportunityPaperIntakeCliStatusV1; exitCode: number } {
  if (plan.status === "ready") {
    return { status: "dry_run_ready", exitCode: 0 };
  }
  if (plan.status === "duplicate") {
    return { status: "dry_run_duplicate", exitCode: 10 };
  }
  return { status: "dry_run_held", exitCode: 20 };
}

function statusForRecordReceiptV1(
  receipt: ExternalOpportunityPaperClassificationJournalFileStoreReceiptV1,
): { status: ExternalOpportunityPaperIntakeCliStatusV1; exitCode: number } {
  if (receipt.status === "applied") {
    return { status: "record_applied", exitCode: 0 };
  }
  if (receipt.status === "duplicate") {
    return { status: "record_duplicate", exitCode: 10 };
  }
  if (receipt.status === "lock_busy") {
    return { status: "record_lock_busy", exitCode: 21 };
  }
  return { status: "record_held", exitCode: 20 };
}

export function executeExternalOpportunityPaperIntakeCliRequestV1(
  requestPath: string,
): ExternalOpportunityPaperIntakeCliResultV1 {
  const result = baseResultV1("input_held", 65, "");
  let requestFile: LocalJsonFileV1;

  try {
    requestFile = readLocalJsonFileV1(
      requestPath,
      REQUEST_MAX_BYTES_V1,
      "request",
    );
    result.explicit_local_request_read_performed = true;
    result.request_file_sha256 = requestFile.sha256;
  } catch (error) {
    const reason = safeReasonV1(error);
    result.reason = reason;
    result.reasons = [reason];
    return result;
  }

  const requestValidation = validationResultV1(requestFile.value);
  if (!requestValidation.normalized) {
    result.reason = requestValidation.reasons.join(",");
    result.reasons = requestValidation.reasons;
    return result;
  }

  const request = requestValidation.normalized;
  result.mode = request.mode;

  let registryFile: LocalJsonFileV1;
  let observationFile: LocalJsonFileV1;
  try {
    registryFile = readLocalJsonFileV1(
      request.request.registry_path,
      REGISTRY_MAX_BYTES_V1,
      "registry",
    );
    result.explicit_local_registry_read_performed = true;
    result.registry_file_sha256 = registryFile.sha256;

    observationFile = readLocalJsonFileV1(
      request.request.observation_path,
      OBSERVATION_MAX_BYTES_V1,
      "observation",
    );
    result.explicit_local_observation_read_performed = true;
    result.observation_file_sha256 = observationFile.sha256;
  } catch (error) {
    const reason = safeReasonV1(error);
    result.reason = reason;
    result.reasons = [reason];
    return result;
  }

  if (
    requestFile.realpath === registryFile.realpath ||
    requestFile.realpath === observationFile.realpath ||
    registryFile.realpath === observationFile.realpath
  ) {
    result.reason = "request_registry_observation_paths_must_be_distinct";
    result.reasons = [result.reason];
    return result;
  }

  if (!isRecordV1(registryFile.value)) {
    result.reason = "registry_json_root_not_object";
    result.reasons = [result.reason];
    return result;
  }
  const registry =
    registryFile.value as unknown as ExternalOpportunityProviderRiskRegistryV1;
  const registryValidation =
    validateExternalOpportunityProviderRiskRegistryV1(registry);
  result.registry_validation_ok = registryValidation.ok;
  result.registry_validation_reasons = registryValidation.errors;
  if (!registryValidation.ok) {
    result.reason = "registry_invalid";
    result.reasons = registryValidation.errors.map(
      (value) => `registry_invalid:${value}`,
    );
    return result;
  }

  const classification =
    classifyExternalOpportunityPaperObservationV1(
      registry,
      observationFile.value,
    );
  result.classification = classification;

  const config = fileStoreConfigV1(request);
  let snapshot: ExternalOpportunityPaperClassificationJournalFileSnapshotV1;
  try {
    snapshot =
      readExternalOpportunityPaperClassificationJournalFileStoreV1(config);
    result.explicit_local_journal_read_performed = true;
  } catch (error) {
    const reason = `journal_read_failed:${safeReasonV1(error)}`;
    result.reason = reason;
    result.reasons = [reason];
    return result;
  }

  const plan =
    planExternalOpportunityPaperClassificationJournalAppendV1({
      classification,
      existing_entries: snapshot.entries,
      recorded_at: request.recorded_at,
      policy: {
        allow_held_entries: request.allow_held_entries,
        max_existing_entries: request.max_entries,
      },
    });
  result.journal = journalSummaryV1(request, snapshot, plan);

  if (request.mode === "dry_run") {
    const mapped = statusForDryPlanV1(plan);
    result.status = mapped.status;
    result.exit_code = mapped.exitCode;
    result.reason =
      plan.status === "held" ? plan.reasons.join(",") : "";
    result.reasons =
      plan.status === "held" ? [...plan.reasons] : [];
    return result;
  }

  let receipt: ExternalOpportunityPaperClassificationJournalFileStoreReceiptV1;
  try {
    receipt =
      storeExternalOpportunityPaperClassificationJournalFileV1({
        config,
        classification,
        recorded_at: request.recorded_at,
        confirmation:
          VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_CONFIRMATION_V1,
      });
  } catch (error) {
    const reason = `journal_store_failed:${safeReasonV1(error)}`;
    result.status = "internal_held";
    result.exit_code = 70;
    result.reason = reason;
    result.reasons = [reason];
    return result;
  }

  result.record = recordSummaryV1(receipt);
  result.explicit_local_journal_read_performed =
    result.explicit_local_journal_read_performed ||
    receipt.explicit_local_filesystem_read_performed;
  result.explicit_local_journal_write_performed =
    receipt.explicit_local_filesystem_write_performed;

  const mapped = statusForRecordReceiptV1(receipt);
  result.status = mapped.status;
  result.exit_code = mapped.exitCode;
  result.reason = receipt.reason;
  result.reasons = receipt.reason ? [receipt.reason] : [];
  return result;
}

function usageResultV1(reason: string): ExternalOpportunityPaperIntakeCliResultV1 {
  return baseResultV1("usage_held", 64, reason);
}

function parseCliArgumentsV1(
  argv: string[],
):
  | { help: true; pretty: boolean; requestPath: "" }
  | { help: false; pretty: boolean; requestPath: string }
  | { error: string; pretty: boolean } {
  let requestPath = "";
  let pretty = false;
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--pretty") {
      if (pretty) return { error: "pretty_flag_duplicate", pretty };
      pretty = true;
      continue;
    }
    if (token === "--help" || token === "-h") {
      help = true;
      continue;
    }
    if (token === "--request") {
      if (requestPath) {
        return { error: "request_flag_duplicate", pretty };
      }
      const next = argv[index + 1];
      if (!next || next.startsWith("--")) {
        return { error: "request_path_missing", pretty };
      }
      requestPath = next;
      index += 1;
      continue;
    }
    return { error: `unknown_argument:${token}`, pretty };
  }

  if (help) {
    if (argv.some((token) => token !== "--help" && token !== "-h" && token !== "--pretty")) {
      return { error: "help_must_be_used_alone", pretty };
    }
    return { help: true, pretty, requestPath: "" };
  }
  if (!requestPath) {
    return { error: "request_flag_required", pretty };
  }
  if (!isAbsolute(requestPath)) {
    return { error: "request_path_must_be_absolute", pretty };
  }
  return { help: false, pretty, requestPath };
}

export function runExternalOpportunityPaperIntakeCliV1(
  argv: string[],
  io: ExternalOpportunityPaperIntakeCliIoV1,
): number {
  const parsed = parseCliArgumentsV1(argv);
  if ("error" in parsed) {
    const result = usageResultV1(parsed.error);
    io.stdout_write(
      `${JSON.stringify(result, null, parsed.pretty ? 2 : 0)}\n`,
    );
    return result.exit_code;
  }

  if (parsed.help) {
    io.stdout_write(
      `${JSON.stringify(
        {
          marker: VOID_EXTERNAL_OPPORTUNITY_PAPER_INTAKE_CLI_V1,
          usage:
            "tsx src/external_opportunity/paper_intake_cli_v1.ts --request /absolute/request.json [--pretty]",
          default_mode: "dry_run",
          record_confirmation:
            VOID_EXTERNAL_OPPORTUNITY_PAPER_INTAKE_CLI_RECORD_CONFIRMATION_V1,
          live_execution_authorized: false,
        },
        null,
        parsed.pretty ? 2 : 0,
      )}\n`,
    );
    return 0;
  }

  const result =
    executeExternalOpportunityPaperIntakeCliRequestV1(parsed.requestPath);
  const serialized = JSON.stringify(
    result,
    null,
    parsed.pretty ? 2 : 0,
  );
  if (result.exit_code >= 64) {
    io.stderr_write(`${serialized}\n`);
  } else {
    io.stdout_write(`${serialized}\n`);
  }
  return result.exit_code;
}

function invokedAsCliV1(): boolean {
  const argv1 = process.argv[1];
  if (!argv1) return false;
  return import.meta.url === pathToFileURL(resolve(argv1)).href;
}

if (invokedAsCliV1()) {
  process.exitCode = runExternalOpportunityPaperIntakeCliV1(
    process.argv.slice(2),
    {
      stdout_write(value) {
        process.stdout.write(value);
      },
      stderr_write(value) {
        process.stderr.write(value);
      },
    },
  );
}
