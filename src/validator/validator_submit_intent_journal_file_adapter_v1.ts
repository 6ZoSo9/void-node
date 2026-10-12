import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { TextDecoder } from "node:util";
import {
  VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1,
  VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1,
} from "./validator_submit_intent_lifecycle_v1.js";
import {
  VOID_VALIDATOR_SUBMIT_INTENT_STORE_V1,
} from "./validator_submit_intent_store_v1.js";
import {
  VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_V1,
  appendValidatorSubmitIntentJournalEntryV1,
  replayValidatorSubmitIntentJournalV1,
  type ValidatorSubmitIntentJournalAppendInputV1,
  type ValidatorSubmitIntentJournalEntryV1,
  type ValidatorSubmitIntentJournalReplayV1,
} from "./validator_submit_intent_journal_v1.js";

export const VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_V1 =
  "VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_V1";

export const VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_STORAGE_V1 = {
  explicit_operator_path_required: true,
  absolute_canonical_path_required: true,
  parent_directory_preprovisioned: true,
  parent_directory_mode: "0700",
  journal_file_mode: "0600",
  jsonl: true,
  append_only: true,
  truncate_or_rewrite: false,
  no_follow: true,
  regular_file_only: true,
  single_link_required: true,
  bounded_file_read: true,
  bounded_line_read: true,
  bounded_entry_count: true,
  utf8_fatal_decode: true,
  lf_newline_required: true,
  torn_write_detection: true,
  malformed_line_fail_closed: true,
  journal_replay_fail_closed: true,
  compare_and_swap_head_required: true,
  exclusive_lock_file: true,
  stale_lock_auto_break: false,
  fsync_after_append: true,
  parent_fsync_on_create: true,
  survives_process_restart: true,
  automatic_rebroadcast_allowed: false,
} as const;

export const VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_AUTHORITY_V1 = {
  filesystem_read: true,
  filesystem_write: true,
  create_parent_directory: false,
  create_journal_file: true,
  append_journal_entry: true,
  create_exclusive_lock_file: true,
  remove_owned_lock_file: true,
  truncate_journal_file: false,
  rewrite_journal_file: false,
  delete_journal_file: false,
  repair_corrupt_journal: false,
  break_stale_lock_automatically: false,
  rpc_call: false,
  wallet_access: false,
  signer_access: false,
  transaction_signing: false,
  transaction_broadcast: false,
  automatic_rebroadcast: false,
  runtime_route_mount: false,
  validator_registration: false,
  validator_admission: false,
  active_validator_set_mutation: false,
  money_movement: false,
} as const;

export const VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_DEFAULT_MAX_FILE_BYTES =
  64 * 1024 * 1024;
export const VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_MIN_MAX_FILE_BYTES =
  256;
export const VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_MAX_MAX_FILE_BYTES =
  1024 * 1024 * 1024;

export const VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_DEFAULT_MAX_LINE_BYTES =
  64 * 1024;
export const VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_MIN_MAX_LINE_BYTES =
  256;
export const VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_MAX_MAX_LINE_BYTES =
  1024 * 1024;

export const VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_DEFAULT_MAX_ENTRIES =
  100_000;
export const VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_MIN_MAX_ENTRIES =
  1;
export const VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_MAX_MAX_ENTRIES =
  1_000_000;

export type ValidatorSubmitIntentJournalFileAdapterOptionsV1 = {
  journal_path: string;
  max_file_bytes?: string | number;
  max_line_bytes?: string | number;
  max_entries?: string | number;
};

export type ValidatorSubmitIntentJournalFileAppendInputV1 = {
  now_ms: string | number;
  expected_entries_total: string | number;
  expected_head_hash_sha256: string;
  event: ValidatorSubmitIntentJournalAppendInputV1;
};

export type ValidatorSubmitIntentJournalFileLoadReadyV1 = {
  ok: true;
  marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_V1;
  journal_marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_V1;
  lifecycle_marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1;
  store_marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_STORE_V1;
  status: "loaded";
  journal_path: string;
  lock_path: string;
  file_exists: boolean;
  lock_present: boolean;
  file_bytes: number;
  entries_total: number;
  journal_head_hash_sha256: string;
  entries: ValidatorSubmitIntentJournalEntryV1[];
  replay: Extract<ValidatorSubmitIntentJournalReplayV1, { ok: true }>;
  storage: typeof VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_STORAGE_V1;
  authority: typeof VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_AUTHORITY_V1;
};

export type ValidatorSubmitIntentJournalFileLoadHeldV1 = {
  ok: false;
  marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_V1;
  journal_marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_V1;
  status: "held";
  reason: string;
  source: "path" | "filesystem" | "format" | "journal";
  journal_path: string;
  write_performed: false;
  details?: Record<string, string | number | boolean | null>;
  storage: typeof VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_STORAGE_V1;
  authority: typeof VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_AUTHORITY_V1;
};

export type ValidatorSubmitIntentJournalFileLoadDecisionV1 =
  | ValidatorSubmitIntentJournalFileLoadReadyV1
  | ValidatorSubmitIntentJournalFileLoadHeldV1;

export type ValidatorSubmitIntentJournalFileAppendReadyV1 = {
  ok: true;
  marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_V1;
  journal_marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_V1;
  status: "appended";
  journal_path: string;
  lock_path: string;
  journal_file_created: boolean;
  bytes_appended: number;
  file_bytes: number;
  entries_total: number;
  previous_head_hash_sha256: string;
  current_head_hash_sha256: string;
  entry: ValidatorSubmitIntentJournalEntryV1;
  entries: ValidatorSubmitIntentJournalEntryV1[];
  replay: Extract<ValidatorSubmitIntentJournalReplayV1, { ok: true }>;
  fsync_completed: true;
  automatic_rebroadcast_allowed: false;
  storage: typeof VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_STORAGE_V1;
  authority: typeof VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_AUTHORITY_V1;
};

export type ValidatorSubmitIntentJournalFileAppendHeldV1 = {
  ok: false;
  marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_V1;
  journal_marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_V1;
  status: "held";
  reason: string;
  source: "path" | "filesystem" | "format" | "journal" | "compare_and_swap";
  journal_path: string;
  write_performed: boolean;
  replay_required: boolean;
  details?: Record<string, string | number | boolean | null>;
  automatic_rebroadcast_allowed: false;
  storage: typeof VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_STORAGE_V1;
  authority: typeof VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_AUTHORITY_V1;
};

export type ValidatorSubmitIntentJournalFileAppendDecisionV1 =
  | ValidatorSubmitIntentJournalFileAppendReadyV1
  | ValidatorSubmitIntentJournalFileAppendHeldV1;

type FileIdentityV1 = {
  dev: number;
  ino: number;
  size: number;
};

type InternalLoadReadyV1 = ValidatorSubmitIntentJournalFileLoadReadyV1 & {
  identity: FileIdentityV1 | null;
};

type InternalLoadDecisionV1 =
  | InternalLoadReadyV1
  | ValidatorSubmitIntentJournalFileLoadHeldV1;

type PathInspectionReadyV1 = {
  ok: true;
  file_exists: boolean;
  identity: FileIdentityV1 | null;
};

type PathInspectionHeldV1 = {
  ok: false;
  reason: string;
  source: "path" | "filesystem";
  details?: Record<string, string | number | boolean | null>;
};

type PathInspectionDecisionV1 = PathInspectionReadyV1 | PathInspectionHeldV1;

type LockLeaseV1 = {
  token: string;
};

const ZERO_HASH = "0".repeat(64);
const HASH = /^[0-9a-f]{64}$/;
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function parseSafeInteger(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  }
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parseBoundedInteger(
  name: string,
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = value === undefined ? fallback : parseSafeInteger(value);
  if (parsed === null || parsed < minimum || parsed > maximum) {
    throw new RangeError(`invalid_${name}`);
  }
  return parsed;
}

function normalizeHash(value: unknown): string {
  const normalized = String(value || "").trim().toLowerCase();
  return HASH.test(normalized) ? normalized : "";
}

function modeOf(stat: { mode: number }): number {
  return stat.mode & 0o777;
}

function errorDetails(error: unknown): Record<string, string | number | boolean | null> {
  const candidate = error as { code?: unknown; message?: unknown; errno?: unknown };
  return {
    error_code: typeof candidate?.code === "string" ? candidate.code : null,
    error_message:
      typeof candidate?.message === "string"
        ? candidate.message.slice(0, 512)
        : String(error).slice(0, 512),
    error_errno:
      typeof candidate?.errno === "number" && Number.isSafeInteger(candidate.errno)
        ? candidate.errno
        : null,
  };
}

function recordFileAdapterBestEffortFailure(
  scope: string,
  error: unknown,
): void {
  const details = errorDetails(error);
  console.warn(
    "VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_V1_BEST_EFFORT_FAILURE_VISIBLE",
    {
      scope,
      ...details,
    },
  );
}

function loadHeld(
  journalPath: string,
  reason: string,
  source: ValidatorSubmitIntentJournalFileLoadHeldV1["source"],
  details?: Record<string, string | number | boolean | null>,
): ValidatorSubmitIntentJournalFileLoadHeldV1 {
  return {
    ok: false,
    marker: VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_V1,
    journal_marker: VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_V1,
    status: "held",
    reason,
    source,
    journal_path: journalPath,
    write_performed: false,
    ...(details ? { details } : {}),
    storage: VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_STORAGE_V1,
    authority: VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_AUTHORITY_V1,
  };
}

function appendHeld(
  journalPath: string,
  reason: string,
  source: ValidatorSubmitIntentJournalFileAppendHeldV1["source"],
  writePerformed: boolean,
  details?: Record<string, string | number | boolean | null>,
): ValidatorSubmitIntentJournalFileAppendHeldV1 {
  return {
    ok: false,
    marker: VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_V1,
    journal_marker: VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_V1,
    status: "held",
    reason,
    source,
    journal_path: journalPath,
    write_performed: writePerformed,
    replay_required: writePerformed,
    ...(details ? { details } : {}),
    automatic_rebroadcast_allowed: false,
    storage: VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_STORAGE_V1,
    authority: VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_AUTHORITY_V1,
  };
}

function filesystemFlags(...flags: string[]): number {
  let combined = 0;
  for (const name of flags) {
    const value = (fs.constants as unknown as Record<string, number>)[name];
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(`filesystem_flag_unavailable:${name}`);
    }
    combined |= value;
  }
  return combined;
}

function identityOf(stat: { dev: number; ino: number; size: number }): FileIdentityV1 {
  return {
    dev: stat.dev,
    ino: stat.ino,
    size: stat.size,
  };
}

function sameIdentity(left: FileIdentityV1, right: FileIdentityV1): boolean {
  return left.dev === right.dev && left.ino === right.ino;
}

export class ValidatorSubmitIntentJournalFileAdapterV1 {
  readonly #journalPath: string;
  readonly #parentPath: string;
  readonly #lockPath: string;
  readonly #maxFileBytes: number;
  readonly #maxLineBytes: number;
  readonly #maxEntries: number;

  constructor(options: ValidatorSubmitIntentJournalFileAdapterOptionsV1) {
    const rawPath = String(options?.journal_path || "");
    if (
      !rawPath ||
      rawPath.includes("\0") ||
      !path.isAbsolute(rawPath) ||
      path.resolve(rawPath) !== rawPath ||
      path.basename(rawPath) === "." ||
      path.basename(rawPath) === ".." ||
      !rawPath.endsWith(".jsonl")
    ) {
      throw new RangeError("invalid_journal_path");
    }

    this.#journalPath = rawPath;
    this.#parentPath = path.dirname(rawPath);
    this.#lockPath = `${rawPath}.lock`;
    this.#maxFileBytes = parseBoundedInteger(
      "max_file_bytes",
      options.max_file_bytes,
      VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_DEFAULT_MAX_FILE_BYTES,
      VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_MIN_MAX_FILE_BYTES,
      VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_MAX_MAX_FILE_BYTES,
    );
    this.#maxLineBytes = parseBoundedInteger(
      "max_line_bytes",
      options.max_line_bytes,
      VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_DEFAULT_MAX_LINE_BYTES,
      VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_MIN_MAX_LINE_BYTES,
      VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_MAX_MAX_LINE_BYTES,
    );
    this.#maxEntries = parseBoundedInteger(
      "max_entries",
      options.max_entries,
      VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_DEFAULT_MAX_ENTRIES,
      VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_MIN_MAX_ENTRIES,
      VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_MAX_MAX_ENTRIES,
    );

    filesystemFlags("O_NOFOLLOW", "O_DIRECTORY");
  }

  get journal_path(): string {
    return this.#journalPath;
  }

  get lock_path(): string {
    return this.#lockPath;
  }

  load(now_ms: string | number): ValidatorSubmitIntentJournalFileLoadDecisionV1 {
    return this.#loadInternal(now_ms);
  }

  append(
    input: ValidatorSubmitIntentJournalFileAppendInputV1,
  ): ValidatorSubmitIntentJournalFileAppendDecisionV1 {
    const nowMs = parseSafeInteger(input?.now_ms);
    if (nowMs === null) {
      return appendHeld(this.#journalPath, "invalid_now_ms", "journal", false);
    }

    const expectedEntries = parseSafeInteger(input?.expected_entries_total);
    if (
      expectedEntries === null ||
      expectedEntries > this.#maxEntries
    ) {
      return appendHeld(
        this.#journalPath,
        "invalid_expected_entries_total",
        "compare_and_swap",
        false,
      );
    }

    const expectedHead = normalizeHash(input?.expected_head_hash_sha256);
    if (!expectedHead) {
      return appendHeld(
        this.#journalPath,
        "invalid_expected_head_hash_sha256",
        "compare_and_swap",
        false,
      );
    }

    if (!input?.event || typeof input.event !== "object") {
      return appendHeld(this.#journalPath, "invalid_event", "journal", false);
    }

    const pathInspection = this.#inspectPath();
    if (pathInspection.ok === false) {
      return appendHeld(
        this.#journalPath,
        pathInspection.reason,
        pathInspection.source,
        false,
        pathInspection.details,
      );
    }

    let lease: LockLeaseV1 | null = null;
    let outcome: ValidatorSubmitIntentJournalFileAppendDecisionV1;
    try {
      const acquired = this.#acquireLock(nowMs);
      if (acquired.ok === false) return acquired;
      lease = acquired.lease;

      const before = this.#loadInternal(nowMs);
      if (before.ok === false) {
        outcome = appendHeld(
          this.#journalPath,
          before.reason,
          before.source,
          false,
          before.details,
        );
      } else if (
        before.entries_total !== expectedEntries ||
        before.journal_head_hash_sha256 !== expectedHead
      ) {
        outcome = appendHeld(
          this.#journalPath,
          "journal_compare_and_swap_mismatch",
          "compare_and_swap",
          false,
          {
            expected_entries_total: expectedEntries,
            current_entries_total: before.entries_total,
            expected_head_hash_sha256: expectedHead,
            current_head_hash_sha256: before.journal_head_hash_sha256,
          },
        );
      } else if (before.entries_total >= this.#maxEntries) {
        outcome = appendHeld(
          this.#journalPath,
          "journal_entry_capacity_reached",
          "format",
          false,
          { max_entries: this.#maxEntries },
        );
      } else {
        outcome = this.#appendUnderLock(before, input.event, nowMs);
      }
    } catch (error) {
      outcome = appendHeld(
        this.#journalPath,
        "journal_append_unexpected_error",
        "filesystem",
        false,
        errorDetails(error),
      );
    }

    if (lease) {
      const release = this.#releaseLock(lease);
      if (release.ok === false) {
        return appendHeld(
          this.#journalPath,
          "journal_lock_release_failed",
          "filesystem",
          outcome.ok === true ? true : outcome.write_performed,
          {
            prior_outcome:
              outcome.ok === true ? "appended" : outcome.reason,
            ...release.details,
          },
        );
      }
    }

    return outcome;
  }

  #inspectPath(): PathInspectionDecisionV1 {
    let parentStat: any;
    try {
      parentStat = fs.lstatSync(this.#parentPath);
    } catch (error) {
      return {
        ok: false,
        reason: "journal_parent_missing_or_unreadable",
        source: "path",
        details: errorDetails(error),
      };
    }

    if (parentStat.isSymbolicLink()) {
      return { ok: false, reason: "journal_parent_symlink_forbidden", source: "path" };
    }
    if (!parentStat.isDirectory()) {
      return { ok: false, reason: "journal_parent_not_directory", source: "path" };
    }
    if (modeOf(parentStat) !== 0o700) {
      return {
        ok: false,
        reason: "journal_parent_mode_invalid",
        source: "path",
        details: {
          expected_mode_octal: "0700",
          observed_mode_octal: modeOf(parentStat).toString(8).padStart(4, "0"),
        },
      };
    }

    try {
      if (fs.realpathSync(this.#parentPath) !== this.#parentPath) {
        return {
          ok: false,
          reason: "journal_parent_path_not_canonical",
          source: "path",
        };
      }
    } catch (error) {
      return {
        ok: false,
        reason: "journal_parent_realpath_failed",
        source: "path",
        details: errorDetails(error),
      };
    }

    let targetStat: any;
    try {
      targetStat = fs.lstatSync(this.#journalPath);
    } catch (error) {
      if ((error as { code?: string })?.code === "ENOENT") {
        return { ok: true, file_exists: false, identity: null };
      }
      return {
        ok: false,
        reason: "journal_path_lstat_failed",
        source: "filesystem",
        details: errorDetails(error),
      };
    }

    if (targetStat.isSymbolicLink()) {
      return { ok: false, reason: "journal_path_symlink_forbidden", source: "path" };
    }
    if (!targetStat.isFile()) {
      return { ok: false, reason: "journal_path_not_regular_file", source: "path" };
    }
    if (targetStat.nlink !== 1) {
      return {
        ok: false,
        reason: "journal_path_multiple_links_forbidden",
        source: "path",
        details: { observed_link_count: targetStat.nlink },
      };
    }
    if (modeOf(targetStat) !== 0o600) {
      return {
        ok: false,
        reason: "journal_file_mode_invalid",
        source: "path",
        details: {
          expected_mode_octal: "0600",
          observed_mode_octal: modeOf(targetStat).toString(8).padStart(4, "0"),
        },
      };
    }

    try {
      if (fs.realpathSync(this.#journalPath) !== this.#journalPath) {
        return { ok: false, reason: "journal_path_not_canonical", source: "path" };
      }
    } catch (error) {
      return {
        ok: false,
        reason: "journal_path_realpath_failed",
        source: "path",
        details: errorDetails(error),
      };
    }

    return {
      ok: true,
      file_exists: true,
      identity: identityOf(targetStat),
    };
  }

  #lockPresent(): boolean {
    try {
      fs.lstatSync(this.#lockPath);
      return true;
    } catch (error) {
      if ((error as { code?: string })?.code === "ENOENT") return false;
      return true;
    }
  }

  #loadInternal(now_ms: string | number): InternalLoadDecisionV1 {
    const nowMs = parseSafeInteger(now_ms);
    if (nowMs === null) {
      return loadHeld(this.#journalPath, "invalid_now_ms", "journal");
    }

    const inspected = this.#inspectPath();
    if (inspected.ok === false) {
      return loadHeld(
        this.#journalPath,
        inspected.reason,
        inspected.source,
        inspected.details,
      );
    }

    if (!inspected.file_exists) {
      const replay = replayValidatorSubmitIntentJournalV1([], nowMs);
      if (replay.ok === false) {
        return loadHeld(
          this.#journalPath,
          "empty_journal_replay_held",
          "journal",
          {
            replay_reason: replay.reason,
            replay_entry_index: replay.entry_index,
          },
        );
      }
      return {
        ok: true,
        marker: VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_V1,
        journal_marker: VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_V1,
        lifecycle_marker: VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1,
        store_marker: VOID_VALIDATOR_SUBMIT_INTENT_STORE_V1,
        status: "loaded",
        journal_path: this.#journalPath,
        lock_path: this.#lockPath,
        file_exists: false,
        lock_present: this.#lockPresent(),
        file_bytes: 0,
        entries_total: 0,
        journal_head_hash_sha256: ZERO_HASH,
        entries: [],
        replay,
        identity: null,
        storage: VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_STORAGE_V1,
        authority: VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_AUTHORITY_V1,
      };
    }

    let fd: number | null = null;
    try {
      fd = fs.openSync(
        this.#journalPath,
        filesystemFlags("O_RDONLY", "O_NOFOLLOW"),
      );
      const openedStat: any = fs.fstatSync(fd);
      if (!openedStat.isFile()) {
        return loadHeld(this.#journalPath, "opened_journal_not_regular_file", "path");
      }
      if (openedStat.nlink !== 1) {
        return loadHeld(
          this.#journalPath,
          "opened_journal_multiple_links_forbidden",
          "path",
          { observed_link_count: openedStat.nlink },
        );
      }
      if (modeOf(openedStat) !== 0o600) {
        return loadHeld(
          this.#journalPath,
          "opened_journal_mode_invalid",
          "path",
          {
            observed_mode_octal: modeOf(openedStat).toString(8).padStart(4, "0"),
          },
        );
      }
      const openedIdentity = identityOf(openedStat);
      if (!inspected.identity || !sameIdentity(openedIdentity, inspected.identity)) {
        return loadHeld(this.#journalPath, "journal_identity_changed_before_read", "path");
      }
      if (
        !Number.isSafeInteger(openedStat.size) ||
        openedStat.size < 0 ||
        openedStat.size > this.#maxFileBytes
      ) {
        return loadHeld(
          this.#journalPath,
          "journal_file_size_out_of_bounds",
          "format",
          {
            observed_file_bytes: openedStat.size,
            max_file_bytes: this.#maxFileBytes,
          },
        );
      }

      const buffer = Buffer.alloc(openedStat.size);
      let offset = 0;
      while (offset < buffer.length) {
        const read = fs.readSync(fd, buffer, offset, buffer.length - offset, offset);
        if (read <= 0) {
          return loadHeld(
            this.#journalPath,
            "journal_unexpected_eof",
            "filesystem",
            { expected_file_bytes: buffer.length, bytes_read: offset },
          );
        }
        offset += read;
      }

      const afterStat: any = fs.fstatSync(fd);
      const afterIdentity = identityOf(afterStat);
      if (
        !sameIdentity(openedIdentity, afterIdentity) ||
        afterIdentity.size !== openedIdentity.size
      ) {
        return loadHeld(
          this.#journalPath,
          "journal_changed_during_read",
          "filesystem",
        );
      }

      const parsed = this.#parseBuffer(buffer, nowMs);
      if (parsed.ok === false) return parsed;

      return {
        ok: true,
        marker: VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_V1,
        journal_marker: VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_V1,
        lifecycle_marker: VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1,
        store_marker: VOID_VALIDATOR_SUBMIT_INTENT_STORE_V1,
        status: "loaded",
        journal_path: this.#journalPath,
        lock_path: this.#lockPath,
        file_exists: true,
        lock_present: this.#lockPresent(),
        file_bytes: buffer.length,
        entries_total: parsed.entries.length,
        journal_head_hash_sha256: parsed.replay.journal_head_hash_sha256,
        entries: clone(parsed.entries),
        replay: clone(parsed.replay),
        identity: openedIdentity,
        storage: VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_STORAGE_V1,
        authority: VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_AUTHORITY_V1,
      };
    } catch (error) {
      return loadHeld(
        this.#journalPath,
        "journal_read_failed",
        "filesystem",
        errorDetails(error),
      );
    } finally {
      if (fd !== null) {
        try {
          fs.closeSync(fd);
        } catch (closeError) {
          recordFileAdapterBestEffortFailure("close-read-descriptor", closeError);
        }
      }
    }
  }

  #parseBuffer(
    buffer: Buffer,
    nowMs: number,
  ):
    | {
        ok: true;
        entries: ValidatorSubmitIntentJournalEntryV1[];
        replay: Extract<ValidatorSubmitIntentJournalReplayV1, { ok: true }>;
      }
    | ValidatorSubmitIntentJournalFileLoadHeldV1 {
    if (buffer.length === 0) {
      const replay = replayValidatorSubmitIntentJournalV1([], nowMs);
      if (replay.ok === false) {
        return loadHeld(
          this.#journalPath,
          "empty_journal_replay_held",
          "journal",
          {
            replay_reason: replay.reason,
            replay_entry_index: replay.entry_index,
          },
        );
      }
      return { ok: true, entries: [], replay };
    }

    let text: string;
    try {
      text = UTF8_DECODER.decode(buffer);
    } catch (error) {
      return loadHeld(
        this.#journalPath,
        "journal_utf8_decode_failed",
        "format",
        errorDetails(error),
      );
    }

    if (text.charCodeAt(0) === 0xfeff) {
      return loadHeld(this.#journalPath, "journal_utf8_bom_forbidden", "format");
    }
    if (!text.endsWith("\n")) {
      return loadHeld(
        this.#journalPath,
        "journal_torn_write_missing_final_newline",
        "format",
      );
    }
    if (text.includes("\r")) {
      return loadHeld(this.#journalPath, "journal_non_lf_newline_forbidden", "format");
    }
    if (text.includes("\0")) {
      return loadHeld(this.#journalPath, "journal_nul_byte_forbidden", "format");
    }

    const lines = text.split("\n");
    lines.pop();
    if (lines.length > this.#maxEntries) {
      return loadHeld(
        this.#journalPath,
        "journal_entry_count_out_of_bounds",
        "format",
        {
          observed_entries_total: lines.length,
          max_entries: this.#maxEntries,
        },
      );
    }

    const entries: ValidatorSubmitIntentJournalEntryV1[] = [];
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (!line || !line.trim()) {
        return loadHeld(
          this.#journalPath,
          "journal_empty_line_forbidden",
          "format",
          { line_number: index + 1 },
        );
      }
      const lineBytes = Buffer.byteLength(line, "utf8");
      if (lineBytes > this.#maxLineBytes) {
        return loadHeld(
          this.#journalPath,
          "journal_line_size_out_of_bounds",
          "format",
          {
            line_number: index + 1,
            observed_line_bytes: lineBytes,
            max_line_bytes: this.#maxLineBytes,
          },
        );
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch (error) {
        return loadHeld(
          this.#journalPath,
          "journal_json_parse_failed",
          "format",
          {
            line_number: index + 1,
            ...errorDetails(error),
          },
        );
      }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return loadHeld(
          this.#journalPath,
          "journal_line_not_object",
          "format",
          { line_number: index + 1 },
        );
      }
      if (JSON.stringify(parsed) !== line) {
        return loadHeld(
          this.#journalPath,
          "journal_json_line_not_compact_canonical",
          "format",
          { line_number: index + 1 },
        );
      }
      entries.push(parsed as ValidatorSubmitIntentJournalEntryV1);
    }

    const replay = replayValidatorSubmitIntentJournalV1(entries, nowMs);
    if (replay.ok === false) {
      return loadHeld(
        this.#journalPath,
        "journal_replay_held",
        "journal",
        {
          replay_reason: replay.reason,
          replay_entry_index: replay.entry_index,
        },
      );
    }

    return {
      ok: true,
      entries: clone(entries),
      replay: clone(replay),
    };
  }

  #acquireLock(
    nowMs: number,
  ):
    | { ok: true; lease: LockLeaseV1 }
    | ValidatorSubmitIntentJournalFileAppendHeldV1 {
    try {
      const existing = fs.lstatSync(this.#lockPath);
      return appendHeld(
        this.#journalPath,
        existing.isSymbolicLink()
          ? "journal_lock_symlink_forbidden"
          : "journal_lock_exists",
        "path",
        false,
        {
          stale_lock_auto_break: false,
          observed_mode_octal: modeOf(existing).toString(8).padStart(4, "0"),
        },
      );
    } catch (error) {
      if ((error as { code?: string })?.code !== "ENOENT") {
        return appendHeld(
          this.#journalPath,
          "journal_lock_lstat_failed",
          "filesystem",
          false,
          errorDetails(error),
        );
      }
    }

    const token = crypto.randomBytes(32).toString("hex");
    let fd: number | null = null;
    let createdIdentity: FileIdentityV1 | null = null;
    try {
      fd = fs.openSync(
        this.#lockPath,
        filesystemFlags(
          "O_WRONLY",
          "O_CREAT",
          "O_EXCL",
          "O_NOFOLLOW",
        ),
        0o600,
      );
      const stat: any = fs.fstatSync(fd);
      if (!stat.isFile() || stat.nlink !== 1 || modeOf(stat) !== 0o600) {
        throw new Error("created_lock_invariants_failed");
      }
      createdIdentity = identityOf(stat);

      const line = `${JSON.stringify({
        marker: VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_V1,
        token,
        pid: process.pid,
        acquired_at_ms: nowMs,
      })}\n`;
      const bytes = Buffer.from(line, "utf8");
      let written = 0;
      while (written < bytes.length) {
        const count = fs.writeSync(fd, bytes, written, bytes.length - written, null);
        if (count <= 0) throw new Error("lock_write_returned_zero");
        written += count;
      }
      fs.fsyncSync(fd);
    } catch (error) {
      if (fd !== null) {
        try {
          fs.closeSync(fd);
        } catch (closeError) {
          recordFileAdapterBestEffortFailure("close-lock-after-acquire-failure", closeError);
        }
        fd = null;
      }
      if (createdIdentity) {
        try {
          const lock: any = fs.lstatSync(this.#lockPath);
          if (
            lock.isFile() &&
            !lock.isSymbolicLink() &&
            lock.nlink === 1 &&
            modeOf(lock) === 0o600 &&
            sameIdentity(identityOf(lock), createdIdentity)
          ) {
            fs.unlinkSync(this.#lockPath);
          }
        } catch (cleanupError) {
          recordFileAdapterBestEffortFailure("cleanup-owned-lock-after-acquire-failure", cleanupError);
        }
      }
      return appendHeld(
        this.#journalPath,
        "journal_lock_acquire_failed",
        "filesystem",
        false,
        errorDetails(error),
      );
    } finally {
      if (fd !== null) {
        try {
          fs.closeSync(fd);
        } catch (closeError) {
          recordFileAdapterBestEffortFailure("close-acquired-lock-descriptor", closeError);
        }
      }
    }

    return { ok: true, lease: { token } };
  }

  #releaseLock(
    lease: LockLeaseV1,
  ):
    | { ok: true }
    | { ok: false; details: Record<string, string | number | boolean | null> } {
    let fd: number | null = null;
    try {
      const stat: any = fs.lstatSync(this.#lockPath);
      if (
        stat.isSymbolicLink() ||
        !stat.isFile() ||
        stat.nlink !== 1 ||
        modeOf(stat) !== 0o600
      ) {
        throw new Error("lock_release_invariants_failed");
      }

      fd = fs.openSync(
        this.#lockPath,
        filesystemFlags("O_RDONLY", "O_NOFOLLOW"),
      );
      const opened: any = fs.fstatSync(fd);
      if (
        !opened.isFile() ||
        opened.nlink !== 1 ||
        modeOf(opened) !== 0o600 ||
        opened.dev !== stat.dev ||
        opened.ino !== stat.ino ||
        opened.size > 4096
      ) {
        throw new Error("lock_release_opened_invariants_failed");
      }

      const buffer = Buffer.alloc(opened.size);
      let offset = 0;
      while (offset < buffer.length) {
        const read = fs.readSync(fd, buffer, offset, buffer.length - offset, offset);
        if (read <= 0) throw new Error("lock_release_unexpected_eof");
        offset += read;
      }
      const text = UTF8_DECODER.decode(buffer);
      if (!text.endsWith("\n")) throw new Error("lock_release_torn_lock");
      const parsed = JSON.parse(text.slice(0, -1)) as { token?: unknown };
      if (parsed.token !== lease.token) throw new Error("lock_release_token_mismatch");

      fs.closeSync(fd);
      fd = null;
      fs.unlinkSync(this.#lockPath);
      this.#fsyncParent();
      return { ok: true };
    } catch (error) {
      return { ok: false, details: errorDetails(error) };
    } finally {
      if (fd !== null) {
        try {
          fs.closeSync(fd);
        } catch (closeError) {
          recordFileAdapterBestEffortFailure("close-lock-release-descriptor", closeError);
        }
      }
    }
  }

  #fsyncParent(): void {
    let fd: number | null = null;
    try {
      fd = fs.openSync(
        this.#parentPath,
        filesystemFlags(
          "O_RDONLY",
          "O_DIRECTORY",
          "O_NOFOLLOW",
        ),
      );
      const stat: any = fs.fstatSync(fd);
      if (!stat.isDirectory()) throw new Error("parent_fsync_not_directory");
      fs.fsyncSync(fd);
    } finally {
      if (fd !== null) fs.closeSync(fd);
    }
  }

  #appendUnderLock(
    before: InternalLoadReadyV1,
    event: ValidatorSubmitIntentJournalAppendInputV1,
    nowMs: number,
  ): ValidatorSubmitIntentJournalFileAppendDecisionV1 {
    const coreDecision = appendValidatorSubmitIntentJournalEntryV1(
      before.entries,
      event,
    );
    if (coreDecision.ok === false) {
      return appendHeld(
        this.#journalPath,
        coreDecision.reason,
        "journal",
        false,
        coreDecision.details,
      );
    }

    if (nowMs < coreDecision.entry.event_at_ms) {
      return appendHeld(
        this.#journalPath,
        "now_before_appended_event",
        "journal",
        false,
        {
          now_ms: nowMs,
          event_at_ms: coreDecision.entry.event_at_ms,
        },
      );
    }

    const line = `${JSON.stringify(coreDecision.entry)}\n`;
    const bytes = Buffer.from(line, "utf8");
    if (bytes.length - 1 > this.#maxLineBytes) {
      return appendHeld(
        this.#journalPath,
        "journal_line_size_out_of_bounds",
        "format",
        false,
        {
          observed_line_bytes: bytes.length - 1,
          max_line_bytes: this.#maxLineBytes,
        },
      );
    }
    if (before.file_bytes + bytes.length > this.#maxFileBytes) {
      return appendHeld(
        this.#journalPath,
        "journal_file_capacity_reached",
        "format",
        false,
        {
          current_file_bytes: before.file_bytes,
          attempted_append_bytes: bytes.length,
          max_file_bytes: this.#maxFileBytes,
        },
      );
    }

    const created = !before.file_exists;
    let fd: number | null = null;
    let bytesWritten = 0;
    let fsyncCompleted = false;
    try {
      fd = fs.openSync(
        this.#journalPath,
        filesystemFlags(
          "O_WRONLY",
          "O_APPEND",
          "O_CREAT",
          "O_NOFOLLOW",
        ),
        0o600,
      );

      const openedStat: any = fs.fstatSync(fd);
      if (
        !openedStat.isFile() ||
        openedStat.nlink !== 1 ||
        modeOf(openedStat) !== 0o600
      ) {
        throw new Error("opened_journal_append_invariants_failed");
      }
      if (openedStat.size !== before.file_bytes) {
        throw new Error("journal_size_changed_before_append");
      }
      if (
        before.identity &&
        !sameIdentity(identityOf(openedStat), before.identity)
      ) {
        throw new Error("journal_identity_changed_before_append");
      }
      if (!before.identity && openedStat.size !== 0) {
        throw new Error("new_journal_not_empty_before_append");
      }

      const lstat: any = fs.lstatSync(this.#journalPath);
      if (
        lstat.isSymbolicLink() ||
        !lstat.isFile() ||
        lstat.nlink !== 1 ||
        lstat.dev !== openedStat.dev ||
        lstat.ino !== openedStat.ino
      ) {
        throw new Error("journal_path_changed_after_append_open");
      }

      while (bytesWritten < bytes.length) {
        const count = fs.writeSync(
          fd,
          bytes,
          bytesWritten,
          bytes.length - bytesWritten,
          null,
        );
        if (count <= 0) throw new Error("journal_append_write_returned_zero");
        bytesWritten += count;
      }

      fs.fsyncSync(fd);
      fsyncCompleted = true;

      const afterStat: any = fs.fstatSync(fd);
      if (afterStat.size !== before.file_bytes + bytes.length) {
        throw new Error("journal_size_mismatch_after_append");
      }
    } catch (error) {
      return appendHeld(
        this.#journalPath,
        "journal_append_write_failed",
        "filesystem",
        bytesWritten > 0,
        {
          bytes_written: bytesWritten,
          expected_append_bytes: bytes.length,
          fsync_completed: fsyncCompleted,
          ...errorDetails(error),
        },
      );
    } finally {
      if (fd !== null) {
        try {
          fs.closeSync(fd);
        } catch (closeError) {
          recordFileAdapterBestEffortFailure("close-journal-append-descriptor", closeError);
        }
      }
    }

    if (created) {
      try {
        this.#fsyncParent();
      } catch (error) {
        return appendHeld(
          this.#journalPath,
          "journal_parent_fsync_failed_after_create",
          "filesystem",
          true,
          {
            bytes_written: bytesWritten,
            fsync_completed: fsyncCompleted,
            ...errorDetails(error),
          },
        );
      }
    }

    const after = this.#loadInternal(nowMs);
    if (after.ok === false) {
      return appendHeld(
        this.#journalPath,
        "journal_post_append_replay_failed",
        after.source,
        true,
        {
          post_append_reason: after.reason,
          ...(after.details || {}),
        },
      );
    }

    const expectedTotal = before.entries_total + 1;
    const last = after.entries.at(-1) || null;
    if (
      after.entries_total !== expectedTotal ||
      after.journal_head_hash_sha256 !== coreDecision.entry.entry_hash_sha256 ||
      !last ||
      JSON.stringify(last) !== JSON.stringify(coreDecision.entry)
    ) {
      return appendHeld(
        this.#journalPath,
        "journal_post_append_verification_mismatch",
        "journal",
        true,
        {
          expected_entries_total: expectedTotal,
          observed_entries_total: after.entries_total,
          expected_head_hash_sha256: coreDecision.entry.entry_hash_sha256,
          observed_head_hash_sha256: after.journal_head_hash_sha256,
        },
      );
    }

    return {
      ok: true,
      marker: VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_V1,
      journal_marker: VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_V1,
      status: "appended",
      journal_path: this.#journalPath,
      lock_path: this.#lockPath,
      journal_file_created: created,
      bytes_appended: bytes.length,
      file_bytes: after.file_bytes,
      entries_total: after.entries_total,
      previous_head_hash_sha256: before.journal_head_hash_sha256,
      current_head_hash_sha256: after.journal_head_hash_sha256,
      entry: clone(coreDecision.entry),
      entries: clone(after.entries),
      replay: clone(after.replay),
      fsync_completed: true,
      automatic_rebroadcast_allowed: false,
      storage: VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_STORAGE_V1,
      authority: VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_AUTHORITY_V1,
    };
  }
}

export const VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_CORE_AUTHORITY_V1 = {
  lifecycle: VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1,
  journal_filesystem_write_remains_separate: true,
} as const;
