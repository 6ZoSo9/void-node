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

  for (let index = 0; index < lines.length; index += 1) {
    let value: any;
    try {
      value = JSON.parse(lines[index]);
    } catch {
      throw new Error("submission_guard_journal_invalid_json");
    }

    if (
      !value ||
      value.marker !==
        VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_V1 ||
      !["claim", "release"].includes(value.event) ||
      value.sequence !== index + 1 ||
      value.previous_entry_hash_sha256 !== previous ||
      !HEX64.test(String(value.entry_hash_sha256 || ""))
    ) {
      throw new Error("submission_guard_journal_contract_mismatch");
    }

    const {
      entry_hash_sha256: recordedHash,
      ...withoutHash
    } = value;
    const expectedHash = entryHash(withoutHash as any);
    if (recordedHash !== expectedHash) {
      throw new Error("submission_guard_journal_hash_mismatch");
    }

    normalizeBinding({
      marker:
        value.adapter_marker ||
        "VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_ADAPTER_V1",
      submission_idempotency_key:
        value.submission_idempotency_key,
      attempt_id: value.attempt_id,
      expected_transaction_hash:
        value.expected_transaction_hash,
      transaction_plan_fingerprint_sha256:
        value.transaction_plan_fingerprint_sha256,
    });

    if (
      value.event === "release" &&
      normalizeReleaseReason(value.release_reason) !==
        value.release_reason
    ) {
      throw new Error(
        "submission_guard_release_reason_mismatch",
      );
    }

    const normalizedValue = {
      ...value,
      adapter_marker:
        value.adapter_marker ||
        "VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_ADAPTER_V1",
    } as BuyVoidDeliverySubmissionGuardEntryV1;
    entries.push(normalizedValue);
    previous = recordedHash;
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

        const previous =
          entries.at(-1)?.entry_hash_sha256 ||
          "0".repeat(64);
        appendEntry(paths, {
          schema:
            "void_buy_void_delivery_submission_guard_claim_v1",
          marker:
            VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_V1,
          sequence: entries.length + 1,
          recorded_at_ms: now(),
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
          recorded_at_ms: now(),
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
