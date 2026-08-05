import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_V1 =
  "VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_V1";

export type BuyVoidDeliverySubmissionAdapterMarkerV1 =
  | "VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_ADAPTER_V1"
  | "VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_ADAPTER_V1";

export type BuyVoidDeliverySubmissionBindingV1 = {
  marker: BuyVoidDeliverySubmissionAdapterMarkerV1;
  submission_idempotency_key: string;
  attempt_id: string;
  expected_transaction_hash: string;
  transaction_plan_fingerprint_sha256: string;
};

export type BuyVoidDeliverySubmissionGuardV1 = {
  claim_submission_once: (
    binding: Readonly<BuyVoidDeliverySubmissionBindingV1>,
  ) => Promise<
    | { claimed: true }
    | {
        claimed: false;
        reason?: string;
        existing_transaction_hash?: string;
      }
  >;
  release_submission_claim: (
    binding: Readonly<BuyVoidDeliverySubmissionBindingV1>,
    release_reason: string,
  ) => Promise<
    | { released: true }
    | {
        released: false;
        reason?: string;
      }
  >;
};

export const VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_AUTHORITY_V1 = {
  filesystem_read: true,
  filesystem_write: true,
  append_only_journal: true,
  hash_chain: true,
  exclusive_lock: true,
  attempt_binding_immutable: true,
  idempotency_key_binding_immutable: true,
  release_reason_binding_immutable: true,
  retry_safe_release_allowlist: true,
  terminal_release_reclaim_forbidden: true,
  alternate_idempotency_key_replay_forbidden: true,
  replay_lifecycle_verified: true,
  closed_journal_contract: true,
  monotonic_write_timestamp: true,
  automatic_stale_lock_removal: false,
  rpc_call: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  service_restart: false,
  money_movement: false,
} as const;

const HEX64 = /^[0-9a-f]{64}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const MAX_REASON = 160;
const CLAIM_SCHEMA =
  "void_buy_void_delivery_submission_guard_claim_v1";
const RELEASE_SCHEMA =
  "void_buy_void_delivery_submission_guard_release_v1";
const RETRY_SAFE_RELEASE_REASONS = new Set([
  "signer_address_read_failed",
  "signer_address_mismatch",
  "transaction_signing_failed",
  "invalid_raw_signed_transaction_from_signer",
  "signed_transaction_parse_failed",
  "signed_transaction_hash_mismatch",
  "signed_transaction_binding_mismatch",
  "invalid_provider_submission_id",
  "broadcast_definitively_not_submitted",
]);
const COMMON_ENTRY_KEYS = [
  "schema",
  "marker",
  "sequence",
  "recorded_at_ms",
  "previous_entry_hash_sha256",
  "entry_hash_sha256",
  "event",
  "adapter_marker",
  "submission_idempotency_key",
  "attempt_id",
  "expected_transaction_hash",
  "transaction_plan_fingerprint_sha256",
] as const;
const CLAIM_ENTRY_KEYS = [...COMMON_ENTRY_KEYS] as const;
const RELEASE_ENTRY_KEYS = [
  ...COMMON_ENTRY_KEYS,
  "release_reason",
] as const;
const LEGACY_CLAIM_ENTRY_KEYS = CLAIM_ENTRY_KEYS.filter(
  (key) => key !== "adapter_marker",
);
const LEGACY_RELEASE_ENTRY_KEYS = RELEASE_ENTRY_KEYS.filter(
  (key) => key !== "adapter_marker",
);

export type BuyVoidDeliverySubmissionGuardPathsV1 = {
  root_dir: string;
  state_dir: string;
  journal_file: string;
  lock_file: string;
};

type ClaimEntryV1 = {
  schema: "void_buy_void_delivery_submission_guard_claim_v1";
  marker: typeof VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_V1;
  sequence: number;
  recorded_at_ms: number;
  previous_entry_hash_sha256: string;
  entry_hash_sha256: string;
  event: "claim";
  adapter_marker: BuyVoidDeliverySubmissionAdapterMarkerV1;
  submission_idempotency_key: string;
  attempt_id: string;
  expected_transaction_hash: string;
  transaction_plan_fingerprint_sha256: string;
};

type ReleaseEntryV1 = {
  schema: "void_buy_void_delivery_submission_guard_release_v1";
  marker: typeof VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_V1;
  sequence: number;
  recorded_at_ms: number;
  previous_entry_hash_sha256: string;
  entry_hash_sha256: string;
  event: "release";
  adapter_marker: BuyVoidDeliverySubmissionAdapterMarkerV1;
  submission_idempotency_key: string;
  attempt_id: string;
  expected_transaction_hash: string;
  transaction_plan_fingerprint_sha256: string;
  release_reason: string;
};

export type BuyVoidDeliverySubmissionGuardEntryV1 =
  | ClaimEntryV1
  | ReleaseEntryV1;

type NormalizedBindingV1 = {
  adapter_marker: BuyVoidDeliverySubmissionAdapterMarkerV1;
  submission_idempotency_key: string;
  attempt_id: string;
  expected_transaction_hash: string;
  transaction_plan_fingerprint_sha256: string;
};

export function buyVoidDeliverySubmissionGuardPathsV1(
  rootDir: string,
): BuyVoidDeliverySubmissionGuardPathsV1 {
  const root = path.resolve(String(rootDir || ""));
  if (!path.isAbsolute(root) || root === path.parse(root).root) {
    throw new Error("invalid_submission_guard_root");
  }
  const stateDir = path.join(
    root,
    "delivery-submission-guard-v1",
  );
  return {
    root_dir: root,
    state_dir: stateDir,
    journal_file: path.join(
      stateDir,
      "delivery-submission-guard-v1.jsonl",
    ),
    lock_file: path.join(
      stateDir,
      "delivery-submission-guard-v1.lock",
    ),
  };
}

function sha256(value: string | Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return (
    actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index])
  );
}

function validateJournalEntryShape(
  value: Record<string, unknown>,
): BuyVoidDeliverySubmissionAdapterMarkerV1 {
  const isClaim = value.event === "claim";
  const isRelease = value.event === "release";
  if (!isClaim && !isRelease) {
    throw new Error("submission_guard_journal_contract_mismatch");
  }

  const currentKeys = isClaim
    ? CLAIM_ENTRY_KEYS
    : RELEASE_ENTRY_KEYS;
  const legacyKeys = isClaim
    ? LEGACY_CLAIM_ENTRY_KEYS
    : LEGACY_RELEASE_ENTRY_KEYS;
  if (
    !hasExactKeys(value, currentKeys) &&
    !hasExactKeys(value, legacyKeys)
  ) {
    throw new Error("submission_guard_journal_keys_mismatch");
  }

  const expectedSchema = isClaim
    ? CLAIM_SCHEMA
    : RELEASE_SCHEMA;
  if (value.schema !== expectedSchema) {
    throw new Error("submission_guard_journal_schema_mismatch");
  }

  if (
    !Number.isSafeInteger(value.recorded_at_ms) ||
    Number(value.recorded_at_ms) < 0
  ) {
    throw new Error("submission_guard_journal_timestamp_invalid");
  }

  const marker =
    value.adapter_marker ||
    "VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_ADAPTER_V1";
  if (
    marker !==
      "VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_ADAPTER_V1" &&
    marker !==
      "VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_ADAPTER_V1"
  ) {
    throw new Error("submission_guard_journal_adapter_mismatch");
  }
  return marker as BuyVoidDeliverySubmissionAdapterMarkerV1;
}

function normalizeBinding(
  binding: Readonly<BuyVoidDeliverySubmissionBindingV1>,
): NormalizedBindingV1 {
  if (
    !binding ||
    ![
      "VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_ADAPTER_V1",
      "VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_ADAPTER_V1",
    ].includes(binding.marker)
  ) {
    throw new Error("invalid_submission_binding_marker");
  }

  const adapterMarker =
    binding.marker as BuyVoidDeliverySubmissionAdapterMarkerV1;
  const submissionKey = String(
    binding.submission_idempotency_key || "",
  )
    .trim()
    .toLowerCase();
  const attemptId = String(binding.attempt_id || "")
    .trim()
    .toLowerCase();
  const transactionHash = String(
    binding.expected_transaction_hash || "",
  )
    .trim()
    .toLowerCase();
  const fingerprint = String(
    binding.transaction_plan_fingerprint_sha256 || "",
  )
    .trim()
    .toLowerCase();

  if (!HEX64.test(submissionKey)) {
    throw new Error("invalid_submission_idempotency_key");
  }
  if (!HEX64.test(attemptId)) {
    throw new Error("invalid_submission_attempt_id");
  }
  if (!HASH.test(transactionHash)) {
    throw new Error("invalid_submission_transaction_hash");
  }
  if (!HEX64.test(fingerprint)) {
    throw new Error("invalid_submission_plan_fingerprint");
  }

  return {
    adapter_marker: adapterMarker,
    submission_idempotency_key: submissionKey,
    attempt_id: attemptId,
    expected_transaction_hash: transactionHash,
    transaction_plan_fingerprint_sha256: fingerprint,
  };
}

function normalizeReleaseReason(value: unknown): string {
  const reason = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]/g, "_")
    .slice(0, MAX_REASON);
  if (!reason) throw new Error("invalid_submission_release_reason");
  return reason;
}

function releaseReasonAllowsRetry(reason: string): boolean {
  return RETRY_SAFE_RELEASE_REASONS.has(reason);
}

function entryHash(
  entry: Omit<
    BuyVoidDeliverySubmissionGuardEntryV1,
    "entry_hash_sha256"
  >,
): string {
  return sha256(JSON.stringify(entry));
}

function ensureStateDir(
  paths: BuyVoidDeliverySubmissionGuardPathsV1,
): void {
  fs.mkdirSync(paths.state_dir, {
    recursive: true,
    mode: 0o700,
  });
  fs.chmodSync(paths.state_dir, 0o700);
}

function withExclusiveLock<T>(
  paths: BuyVoidDeliverySubmissionGuardPathsV1,
  fn: () => T,
): T {
  ensureStateDir(paths);
  let fd: number | null = null;
  let created = false;
  try {
    fd = fs.openSync(
      paths.lock_file,
      fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        fs.constants.O_WRONLY,
      0o600,
    );
    created = true;
    fs.writeFileSync(
      fd,
      JSON.stringify({
        marker: VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_V1,
        pid: process.pid,
        created_at_ms: Date.now(),
      }) + "\n",
      { encoding: "utf8" },
    );
    fs.fsyncSync(fd);
    return fn();
  } catch (error: any) {
    if (error?.code === "EEXIST") {
      throw new Error("submission_guard_lock_exists");
    }
    throw error;
  } finally {
    if (fd !== null) fs.closeSync(fd);
    if (created) {
      try {
        fs.unlinkSync(paths.lock_file);
      } catch (error: any) {
        if (error?.code !== "ENOENT") throw error;
      }
    }
  }
}

function sameBinding(
  entry: BuyVoidDeliverySubmissionGuardEntryV1,
  binding: NormalizedBindingV1,
): boolean {
  return (
    entry.adapter_marker === binding.adapter_marker &&
    entry.submission_idempotency_key ===
      binding.submission_idempotency_key &&
    entry.attempt_id === binding.attempt_id &&
    entry.expected_transaction_hash ===
      binding.expected_transaction_hash &&
    entry.transaction_plan_fingerprint_sha256 ===
      binding.transaction_plan_fingerprint_sha256
  );
}

function sameAttempt(
  entry: BuyVoidDeliverySubmissionGuardEntryV1,
  binding: NormalizedBindingV1,
): boolean {
  return (
    entry.adapter_marker === binding.adapter_marker &&
    entry.attempt_id === binding.attempt_id
  );
}

function firstForAttempt(
  entries: BuyVoidDeliverySubmissionGuardEntryV1[],
  binding: NormalizedBindingV1,
): BuyVoidDeliverySubmissionGuardEntryV1 | null {
  return entries.find((entry) => sameAttempt(entry, binding)) || null;
}

function latestForKey(
  entries: BuyVoidDeliverySubmissionGuardEntryV1[],
  key: string,
): BuyVoidDeliverySubmissionGuardEntryV1 | null {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    if (entries[index].submission_idempotency_key === key) {
      return entries[index];
    }
  }
  return null;
}

function nextRecordedAtMs(
  entries: BuyVoidDeliverySubmissionGuardEntryV1[],
  now: () => number,
): number {
  const candidate = now();
  if (!Number.isSafeInteger(candidate) || candidate < 0) {
    throw new Error("submission_guard_write_timestamp_invalid");
  }
  const previous = entries.at(-1)?.recorded_at_ms ?? -1;
  if (candidate < previous) {
    throw new Error("submission_guard_write_timestamp_regression");
  }
  return candidate;
}

function readJournal(
  paths: BuyVoidDeliverySubmissionGuardPathsV1,
): BuyVoidDeliverySubmissionGuardEntryV1[] {
  if (!fs.existsSync(paths.journal_file)) return [];
  const text = fs.readFileSync(paths.journal_file, "utf8");
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const entries: BuyVoidDeliverySubmissionGuardEntryV1[] = [];
  let previous = "0".repeat(64);
  let previousRecordedAtMs = -1;

  for (let index = 0; index < lines.length; index += 1) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(lines[index]);
    } catch {
      throw new Error("submission_guard_journal_invalid_json");
    }
    if (!isRecord(parsed)) {
      throw new Error("submission_guard_journal_contract_mismatch");
    }
    const value = parsed;
    const adapterMarker = validateJournalEntryShape(value);

    if (
      value.marker !==
        VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_V1 ||
      value.sequence !== index + 1 ||
      value.previous_entry_hash_sha256 !== previous ||
      !HEX64.test(String(value.entry_hash_sha256 || ""))
    ) {
      throw new Error("submission_guard_journal_contract_mismatch");
    }

    const recordedAtMs = Number(value.recorded_at_ms);
    if (recordedAtMs < previousRecordedAtMs) {
      throw new Error("submission_guard_journal_timestamp_regression");
    }

    const {
      entry_hash_sha256: recordedHash,
      ...withoutHash
    } = value;
    const expectedHash = entryHash(withoutHash as any);
    if (recordedHash !== expectedHash) {
      throw new Error("submission_guard_journal_hash_mismatch");
    }

    const normalizedBinding = normalizeBinding({
      marker: adapterMarker,
      submission_idempotency_key:
        value.submission_idempotency_key as string,
      attempt_id: value.attempt_id as string,
      expected_transaction_hash:
        value.expected_transaction_hash as string,
      transaction_plan_fingerprint_sha256:
        value.transaction_plan_fingerprint_sha256 as string,
    });

    const existingAttempt = firstForAttempt(
      entries,
      normalizedBinding,
    );
    if (
      existingAttempt &&
      !sameBinding(existingAttempt, normalizedBinding)
    ) {
      throw new Error("submission_guard_attempt_binding_mismatch");
    }

    const existingKey = latestForKey(
      entries,
      normalizedBinding.submission_idempotency_key,
    );
    if (existingKey && !sameBinding(existingKey, normalizedBinding)) {
      throw new Error(
        "submission_guard_idempotency_binding_mismatch",
      );
    }

    if (value.event === "claim") {
      if (existingKey?.event === "claim") {
        throw new Error("submission_guard_duplicate_claim");
      }
      if (
        existingKey?.event === "release" &&
        !releaseReasonAllowsRetry(existingKey.release_reason)
      ) {
        throw new Error(
          "submission_guard_non_retryable_release_reclaimed",
        );
      }
    } else {
      if (
        normalizeReleaseReason(value.release_reason) !==
          value.release_reason
      ) {
        throw new Error(
          "submission_guard_release_reason_mismatch",
        );
      }
      if (!existingKey) {
        throw new Error("submission_guard_release_without_claim");
      }
      if (existingKey.event !== "claim") {
        throw new Error("submission_guard_duplicate_release");
      }
    }

    const normalizedValue = {
      ...value,
      adapter_marker: adapterMarker,
    } as BuyVoidDeliverySubmissionGuardEntryV1;
    entries.push(normalizedValue);
    previous = String(recordedHash);
    previousRecordedAtMs = recordedAtMs;
  }

  return entries;
}

function appendEntry(
  paths: BuyVoidDeliverySubmissionGuardPathsV1,
  entry:
    | Omit<ClaimEntryV1, "entry_hash_sha256">
    | Omit<ReleaseEntryV1, "entry_hash_sha256">,
): BuyVoidDeliverySubmissionGuardEntryV1 {
  ensureStateDir(paths);
  const complete = {
    ...entry,
    entry_hash_sha256: entryHash(entry as any),
  } as BuyVoidDeliverySubmissionGuardEntryV1;

  const fd = fs.openSync(
    paths.journal_file,
    fs.constants.O_CREAT |
      fs.constants.O_APPEND |
      fs.constants.O_WRONLY,
    0o600,
  );
  try {
    fs.writeFileSync(
      fd,
      JSON.stringify(complete) + "\n",
      { encoding: "utf8" },
    );
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.chmodSync(paths.journal_file, 0o600);
  return complete;
}

export function readBuyVoidDeliverySubmissionGuardJournalV1(
  rootDir: string,
): BuyVoidDeliverySubmissionGuardEntryV1[] {
  return readJournal(
    buyVoidDeliverySubmissionGuardPathsV1(rootDir),
  );
}

export function createBuyVoidDeliverySubmissionGuardV1(
  rootDir: string,
  now: () => number = () => Date.now(),
): BuyVoidDeliverySubmissionGuardV1 {
  const paths = buyVoidDeliverySubmissionGuardPathsV1(rootDir);

  return {
    async claim_submission_once(binding) {
      const normalized = normalizeBinding(binding);
      return withExclusiveLock(paths, () => {
        const entries = readJournal(paths);
        const attemptBinding = firstForAttempt(entries, normalized);
        if (attemptBinding && !sameBinding(attemptBinding, normalized)) {
          return {
            claimed: false as const,
            reason: "submission_attempt_binding_conflict",
            existing_transaction_hash:
              attemptBinding.expected_transaction_hash,
          };
        }

        const latest = latestForKey(
          entries,
          normalized.submission_idempotency_key,
        );

        if (latest && !sameBinding(latest, normalized)) {
          return {
            claimed: false as const,
            reason: "submission_idempotency_key_conflict",
            existing_transaction_hash:
              latest.expected_transaction_hash,
          };
        }

        if (latest?.event === "claim") {
          return {
            claimed: false as const,
            reason: "submission_already_claimed",
            existing_transaction_hash:
              latest.expected_transaction_hash,
          };
        }
        if (
          latest?.event === "release" &&
          !releaseReasonAllowsRetry(latest.release_reason)
        ) {
          return {
            claimed: false as const,
            reason: "submission_release_not_retry_safe",
            existing_transaction_hash:
              latest.expected_transaction_hash,
          };
        }

        const previous =
          entries.at(-1)?.entry_hash_sha256 ||
          "0".repeat(64);
        appendEntry(paths, {
          schema:
            "void_buy_void_delivery_submission_guard_claim_v1",
          marker:
            VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_V1,
          sequence: entries.length + 1,
          recorded_at_ms: nextRecordedAtMs(entries, now),
          previous_entry_hash_sha256: previous,
          event: "claim",
          ...normalized,
        });
        return { claimed: true as const };
      });
    },

    async release_submission_claim(binding, releaseReason) {
      const normalized = normalizeBinding(binding);
      const reason = normalizeReleaseReason(releaseReason);

      return withExclusiveLock(paths, () => {
        const entries = readJournal(paths);
        const attemptBinding = firstForAttempt(entries, normalized);
        if (attemptBinding && !sameBinding(attemptBinding, normalized)) {
          return {
            released: false as const,
            reason: "submission_attempt_binding_conflict",
          };
        }

        const latest = latestForKey(
          entries,
          normalized.submission_idempotency_key,
        );

        if (!latest) {
          return {
            released: false as const,
            reason: "submission_claim_not_found",
          };
        }
        if (!sameBinding(latest, normalized)) {
          return {
            released: false as const,
            reason: "submission_claim_binding_conflict",
          };
        }
        if (latest.event === "release") {
          if (latest.release_reason !== reason) {
            return {
              released: false as const,
              reason: "submission_release_reason_conflict",
            };
          }
          return { released: true as const };
        }

        const previous =
          entries.at(-1)?.entry_hash_sha256 ||
          "0".repeat(64);
        appendEntry(paths, {
          schema:
            "void_buy_void_delivery_submission_guard_release_v1",
          marker:
            VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_V1,
          sequence: entries.length + 1,
          recorded_at_ms: nextRecordedAtMs(entries, now),
          previous_entry_hash_sha256: previous,
          event: "release",
          release_reason: reason,
          ...normalized,
        });
        return { released: true as const };
      });
    },
  };
}
