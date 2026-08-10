import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
  readBuyVoidExecutionAttemptV1,
  type BuyVoidExecutionAttemptStateV1,
} from "./buy_void_execution_attempt_journal_v1.js";
import {
  VOID_BUY_VOID_FULFILLMENT_CONFIRMATION_V1,
  type BuyVoidConfirmedFulfillmentRecordV1,
} from "./buy_void_fulfillment_confirmation_v1.js";

export const VOID_BUY_VOID_BROADCAST_OUTCOME_JOURNAL_V1 =
  "VOID_BUY_VOID_BROADCAST_OUTCOME_JOURNAL_V1";

export const VOID_BUY_VOID_BROADCAST_OUTCOME_AUTHORITY_V1 = {
  filesystem_read: true,
  filesystem_write: true,
  external_broadcast_outcome_persistence: true,
  reconciliation_hold_decision: true,
  retry_release_decision: true,
  rpc_call: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  raw_transaction_persistence: false,
  runtime_route_mount: false,
  money_movement: false,
} as const;

const HEX_32 = /^0x[0-9a-f]{64}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const SAFE_CODE = /^[A-Za-z0-9._:-]{1,160}$/;

export type BuyVoidBroadcastOutcomePolicyV1 = {
  outcome_journal_enabled: boolean;
  chain_id: string | number;
  min_revert_confirmations: string | number;
};

export type BuyVoidBroadcastOutcomeJournalPathsV1 = {
  root_dir: string;
  journal_dir: string;
  attempts_dir: string;
  holds_dir: string;
};

export type BuyVoidNotBroadcastRecordV1 = {
  schema: "void_buy_void_not_broadcast_record_v1";
  marker: typeof VOID_BUY_VOID_BROADCAST_OUTCOME_JOURNAL_V1;
  attempt_id: string;
  recorded_at_ms: number;
  void_delivery_tx_hash: string;
  reason_code: string;
  provider_submission_id: string;
  definitive_not_broadcast: true;
  retry_allowed: true;
  transaction_broadcast_performed_by_this_module: false;
};

export type BuyVoidBroadcastUnknownRecordV1 = {
  schema: "void_buy_void_broadcast_unknown_record_v1";
  marker: typeof VOID_BUY_VOID_BROADCAST_OUTCOME_JOURNAL_V1;
  attempt_id: string;
  recorded_at_ms: number;
  void_delivery_tx_hash: string;
  reason_code: string;
  provider_submission_id: string;
  broadcast_may_have_occurred: true;
  reconciliation_required: true;
  retry_allowed: false;
  transaction_broadcast_performed_by_this_module: false;
};

export type BuyVoidBroadcastAcceptedRecordV1 = {
  schema: "void_buy_void_broadcast_accepted_record_v1";
  marker: typeof VOID_BUY_VOID_BROADCAST_OUTCOME_JOURNAL_V1;
  attempt_id: string;
  recorded_at_ms: number;
  void_delivery_tx_hash: string;
  provider_submission_id: string;
  external_broadcast_accepted: true;
  reconciliation_required: true;
  retry_allowed: false;
  transaction_broadcast_performed_by_this_module: false;
};

export type BuyVoidBroadcastRevertedRecordV1 = {
  schema: "void_buy_void_broadcast_reverted_record_v1";
  marker: typeof VOID_BUY_VOID_BROADCAST_OUTCOME_JOURNAL_V1;
  attempt_id: string;
  recorded_at_ms: number;
  chain_id: string;
  void_delivery_tx_hash: string;
  transaction_status: 0;
  block_number: string;
  current_block_number: string;
  confirmation_count: string;
  min_revert_confirmations: number;
  definitive_revert: true;
  reconciliation_required: false;
  retry_allowed: true;
  transaction_broadcast_performed_by_this_module: false;
};

export type BuyVoidBroadcastConfirmedRecordV1 = {
  schema: "void_buy_void_broadcast_confirmed_record_v1";
  marker: typeof VOID_BUY_VOID_BROADCAST_OUTCOME_JOURNAL_V1;
  attempt_id: string;
  recorded_at_ms: number;
  void_delivery_tx_hash: string;
  confirmation_fingerprint: string;
  confirmed_record: BuyVoidConfirmedFulfillmentRecordV1;
  definitive_confirmation: true;
  reconciliation_required: false;
  retry_allowed: false;
  transaction_broadcast_performed_by_this_module: false;
};

export type BuyVoidBroadcastOutcomeStateV1 = {
  attempt_id: string;
  void_delivery_tx_hash: string;
  attempt: BuyVoidExecutionAttemptStateV1;
  not_broadcast: BuyVoidNotBroadcastRecordV1 | null;
  unknown: BuyVoidBroadcastUnknownRecordV1 | null;
  accepted: BuyVoidBroadcastAcceptedRecordV1 | null;
  reverted: BuyVoidBroadcastRevertedRecordV1 | null;
  confirmed: BuyVoidBroadcastConfirmedRecordV1 | null;
  status:
    | "prepared_no_outcome"
    | "not_broadcast"
    | "broadcast_unknown"
    | "broadcast_accepted"
    | "reverted"
    | "confirmed";
  retry_allowed: boolean;
  reconciliation_required: boolean;
  terminal: boolean;
};

export type BuyVoidBroadcastOutcomeDecisionV1 =
  | {
      ok: true;
      status: "recorded" | "duplicate";
      duplicate: boolean;
      state: BuyVoidBroadcastOutcomeStateV1;
    }
  | {
      ok: false;
      status: "held";
      duplicate: false;
      reason: string;
      detail?: Record<string, unknown>;
    };

export type RecordBuyVoidNotBroadcastInputV1 = {
  root_dir: string;
  attempt_id: string;
  transaction_hash: unknown;
  reason_code: unknown;
  provider_submission_id?: unknown;
  now_ms?: number;
};

export type RecordBuyVoidBroadcastUnknownInputV1 = {
  root_dir: string;
  attempt_id: string;
  transaction_hash: unknown;
  reason_code: unknown;
  provider_submission_id?: unknown;
  now_ms?: number;
};

export type RecordBuyVoidBroadcastAcceptedInputV1 = {
  root_dir: string;
  attempt_id: string;
  transaction_hash: unknown;
  provider_submission_id?: unknown;
  now_ms?: number;
};

export type RecordBuyVoidBroadcastRevertedInputV1 = {
  root_dir: string;
  attempt_id: string;
  transaction_hash: unknown;
  observation: {
    chain_id?: unknown;
    transaction_status?: unknown;
    block_number?: unknown;
    current_block_number?: unknown;
  };
  policy: BuyVoidBroadcastOutcomePolicyV1;
  now_ms?: number;
};

export type RecordBuyVoidBroadcastConfirmedInputV1 = {
  root_dir: string;
  attempt_id: string;
  transaction_hash: unknown;
  confirmed_record: BuyVoidConfirmedFulfillmentRecordV1;
  now_ms?: number;
};

function held(
  reason: string,
  detail?: Record<string, unknown>,
): BuyVoidBroadcastOutcomeDecisionV1 {
  return {
    ok: false,
    status: "held",
    duplicate: false,
    reason,
    ...(detail ? { detail } : {}),
  };
}

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function stableFingerprint(parts: Record<string, string>): string {
  return sha256Hex(
    Object.keys(parts)
      .sort()
      .map((key) => `${key}=${parts[key]}`)
      .join("\n"),
  );
}

function normalizeHash(value: unknown): string {
  const hash = String(value || "").trim().toLowerCase();
  return HEX_32.test(hash) ? hash : "";
}

function parseNonNegativeInteger(value: unknown): bigint | null {
  if (typeof value === "bigint") return value >= 0n ? value : null;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) return null;
    return BigInt(value);
  }
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;
  try {
    if (/^0x[0-9a-f]+$/.test(raw) || /^[0-9]+$/.test(raw)) {
      const parsed = BigInt(raw);
      return parsed >= 0n ? parsed : null;
    }
  } catch {
    return null;
  }
  return null;
}

function safeNow(value: unknown): number {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : Date.now();
}

function validateRoot(rootDir: unknown): string {
  const raw = String(rootDir || "").trim();
  if (!raw || raw.includes("\0")) throw new Error("invalid_broadcast_outcome_root");
  return path.resolve(raw);
}

export function buyVoidBroadcastOutcomeJournalPathsV1(
  rootDir: string,
): BuyVoidBroadcastOutcomeJournalPathsV1 {
  const root = validateRoot(rootDir);
  const journalDir = path.join(root, "buy-void-broadcast-outcomes-v1");
  return {
    root_dir: root,
    journal_dir: journalDir,
    attempts_dir: path.join(journalDir, "attempts"),
    holds_dir: path.join(journalDir, "holds"),
  };
}

function ensurePrivateDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  try {
    fs.chmodSync(dir, 0o700);
  } catch {
    // Best effort on non-POSIX filesystems.
  }
}

function fsyncDir(dir: string): void {
  let fd: number | null = null;
  try {
    fd = fs.openSync(dir, "r");
    fs.fsyncSync(fd);
  } catch {
    // Directory fsync may be unavailable.
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
}

function writeTempJson(parentDir: string, basename: string, value: unknown): string {
  ensurePrivateDir(parentDir);
  const temp = path.join(
    parentDir,
    `.${basename}.tmp-${process.pid}-${crypto.randomBytes(8).toString("hex")}`,
  );
  const fd = fs.openSync(temp, "wx", 0o600);
  try {
    fs.writeFileSync(fd, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  return temp;
}

function atomicCreateJson(file: string, value: unknown): "created" | "exists" {
  const parent = path.dirname(file);
  const temp = writeTempJson(parent, path.basename(file), value);
  try {
    try {
      fs.linkSync(temp, file);
    } catch (error) {
      if (String((error as NodeJS.ErrnoException)?.code || "") === "EEXIST") {
        return "exists";
      }
      throw error;
    }
    fsyncDir(parent);
    return "created";
  } finally {
    try {
      fs.unlinkSync(temp);
    } catch {
      // Published hard link remains durable.
    }
  }
}

function readJsonObject(file: string): Record<string, any> | null {
  if (!fs.existsSync(file)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(
      `broadcast_outcome_corrupt_json:${file}:${String((error as Error)?.message || error)}`,
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`broadcast_outcome_corrupt_shape:${file}`);
  }
  return parsed as Record<string, any>;
}

function attemptDir(paths: BuyVoidBroadcastOutcomeJournalPathsV1, attemptId: string): string {
  if (!SHA256.test(attemptId)) throw new Error("invalid_attempt_id");
  return path.join(paths.attempts_dir, attemptId);
}

function recordFile(
  paths: BuyVoidBroadcastOutcomeJournalPathsV1,
  attemptId: string,
  kind: "not-broadcast" | "unknown" | "accepted" | "reverted" | "confirmed",
): string {
  return path.join(attemptDir(paths, attemptId), `${kind}.json`);
}

function readNotBroadcast(raw: Record<string, any>): BuyVoidNotBroadcastRecordV1 {
  if (
    raw.schema !== "void_buy_void_not_broadcast_record_v1" ||
    raw.marker !== VOID_BUY_VOID_BROADCAST_OUTCOME_JOURNAL_V1 ||
    raw.definitive_not_broadcast !== true ||
    raw.retry_allowed !== true
  ) {
    throw new Error("invalid_not_broadcast_record");
  }
  return raw as BuyVoidNotBroadcastRecordV1;
}

function readUnknown(raw: Record<string, any>): BuyVoidBroadcastUnknownRecordV1 {
  if (
    raw.schema !== "void_buy_void_broadcast_unknown_record_v1" ||
    raw.marker !== VOID_BUY_VOID_BROADCAST_OUTCOME_JOURNAL_V1 ||
    raw.broadcast_may_have_occurred !== true ||
    raw.reconciliation_required !== true ||
    raw.retry_allowed !== false
  ) {
    throw new Error("invalid_broadcast_unknown_record");
  }
  return raw as BuyVoidBroadcastUnknownRecordV1;
}

function readAccepted(raw: Record<string, any>): BuyVoidBroadcastAcceptedRecordV1 {
  if (
    raw.schema !== "void_buy_void_broadcast_accepted_record_v1" ||
    raw.marker !== VOID_BUY_VOID_BROADCAST_OUTCOME_JOURNAL_V1 ||
    raw.external_broadcast_accepted !== true ||
    raw.retry_allowed !== false
  ) {
    throw new Error("invalid_broadcast_accepted_record");
  }
  return raw as BuyVoidBroadcastAcceptedRecordV1;
}

function readReverted(raw: Record<string, any>): BuyVoidBroadcastRevertedRecordV1 {
  if (
    raw.schema !== "void_buy_void_broadcast_reverted_record_v1" ||
    raw.marker !== VOID_BUY_VOID_BROADCAST_OUTCOME_JOURNAL_V1 ||
    raw.transaction_status !== 0 ||
    raw.definitive_revert !== true ||
    raw.retry_allowed !== true
  ) {
    throw new Error("invalid_broadcast_reverted_record");
  }
  return raw as BuyVoidBroadcastRevertedRecordV1;
}

function readConfirmed(raw: Record<string, any>): BuyVoidBroadcastConfirmedRecordV1 {
  if (
    raw.schema !== "void_buy_void_broadcast_confirmed_record_v1" ||
    raw.marker !== VOID_BUY_VOID_BROADCAST_OUTCOME_JOURNAL_V1 ||
    raw.definitive_confirmation !== true ||
    raw.retry_allowed !== false
  ) {
    throw new Error("invalid_broadcast_confirmed_record");
  }
  return raw as BuyVoidBroadcastConfirmedRecordV1;
}

function attemptFor(
  rootDir: string,
  attemptId: string,
  allowExistingNotBroadcastAfterFailure = false,
):
  | {
      ok: true;
      paths: BuyVoidBroadcastOutcomeJournalPathsV1;
      attempt: BuyVoidExecutionAttemptStateV1;
      tx_hash: string;
    }
  | { ok: false; reason: string } {
  try {
    const paths = buyVoidBroadcastOutcomeJournalPathsV1(rootDir);
    if (!SHA256.test(attemptId)) return { ok: false, reason: "invalid_attempt_id" };
    const attempt = readBuyVoidExecutionAttemptV1({
      root_dir: paths.root_dir,
      attempt_id: attemptId,
    });
    if (!attempt) return { ok: false, reason: "execution_attempt_not_found" };
    if (attempt.reservation.marker !== VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1) {
      return { ok: false, reason: "wrong_execution_attempt_marker" };
    }
    if (!attempt.prepared) return { ok: false, reason: "execution_attempt_not_prepared" };
    if (attempt.failure) {
      const existingNotBroadcast = readJsonObject(
        recordFile(paths, attemptId, "not-broadcast"),
      );
      if (
        !allowExistingNotBroadcastAfterFailure ||
        !existingNotBroadcast
      ) {
        return {
          ok: false,
          reason: "execution_attempt_failed_prebroadcast",
        };
      }
    }
    return {
      ok: true,
      paths,
      attempt,
      tx_hash: attempt.prepared.void_delivery_tx_hash,
    };
  } catch (error) {
    return {
      ok: false,
      reason: `broadcast_outcome_attempt_read_failed:${String((error as Error)?.message || error)}`,
    };
  }
}

function readState(
  paths: BuyVoidBroadcastOutcomeJournalPathsV1,
  attempt: BuyVoidExecutionAttemptStateV1,
): BuyVoidBroadcastOutcomeStateV1 {
  if (!attempt.prepared) throw new Error("execution_attempt_not_prepared");
  const id = attempt.reservation.attempt_id;
  const notRaw = readJsonObject(recordFile(paths, id, "not-broadcast"));
  const unknownRaw = readJsonObject(recordFile(paths, id, "unknown"));
  const acceptedRaw = readJsonObject(recordFile(paths, id, "accepted"));
  const revertedRaw = readJsonObject(recordFile(paths, id, "reverted"));
  const confirmedRaw = readJsonObject(recordFile(paths, id, "confirmed"));

  const notBroadcast = notRaw ? readNotBroadcast(notRaw) : null;
  const unknown = unknownRaw ? readUnknown(unknownRaw) : null;
  const accepted = acceptedRaw ? readAccepted(acceptedRaw) : null;
  const reverted = revertedRaw ? readReverted(revertedRaw) : null;
  const confirmed = confirmedRaw ? readConfirmed(confirmedRaw) : null;
  const expectedTx = attempt.prepared.void_delivery_tx_hash;

  for (const record of [notBroadcast, unknown, accepted, reverted, confirmed]) {
    if (!record) continue;
    if (record.attempt_id !== id || normalizeHash(record.void_delivery_tx_hash) !== expectedTx) {
      throw new Error("broadcast_outcome_attempt_binding_mismatch");
    }
  }

  if (notBroadcast && (unknown || accepted || reverted || confirmed)) {
    throw new Error("broadcast_outcome_conflicting_not_broadcast_state");
  }
  if (reverted && confirmed) {
    throw new Error("broadcast_outcome_conflicting_terminal_state");
  }
  if (reverted && !unknown && !accepted && !attempt.broadcast) {
    throw new Error("broadcast_revert_without_possible_broadcast");
  }
  if (confirmed && !attempt.confirmation) {
    throw new Error("broadcast_confirmation_without_execution_confirmation");
  }

  let status: BuyVoidBroadcastOutcomeStateV1["status"] = "prepared_no_outcome";
  let retryAllowed = false;
  let reconciliationRequired = false;
  let terminal = false;

  if (notBroadcast) {
    status = "not_broadcast";
    retryAllowed = true;
    terminal = true;
  }
  if (unknown) {
    status = "broadcast_unknown";
    retryAllowed = false;
    reconciliationRequired = true;
  }
  if (accepted) {
    status = "broadcast_accepted";
    retryAllowed = false;
    reconciliationRequired = true;
  }
  if (reverted) {
    status = "reverted";
    retryAllowed = true;
    reconciliationRequired = false;
    terminal = true;
  }
  if (confirmed) {
    status = "confirmed";
    retryAllowed = false;
    reconciliationRequired = false;
    terminal = true;
  }

  return {
    attempt_id: id,
    void_delivery_tx_hash: expectedTx,
    attempt,
    not_broadcast: notBroadcast,
    unknown,
    accepted,
    reverted,
    confirmed,
    status,
    retry_allowed: retryAllowed,
    reconciliation_required: reconciliationRequired,
    terminal,
  };
}

export function readBuyVoidBroadcastOutcomeStateV1(input: {
  root_dir: string;
  attempt_id: string;
}): BuyVoidBroadcastOutcomeStateV1 | null {
  const found = attemptFor(input?.root_dir, String(input?.attempt_id || ""));
  if ("reason" in found) return null;
  return readState(found.paths, found.attempt);
}

function currentForMutation(
  rootDir: string,
  attemptId: string,
  allowExistingNotBroadcastAfterFailure = false,
):
  | {
      ok: true;
      paths: BuyVoidBroadcastOutcomeJournalPathsV1;
      attempt: BuyVoidExecutionAttemptStateV1;
      tx_hash: string;
      state: BuyVoidBroadcastOutcomeStateV1;
    }
  | { ok: false; reason: string; detail?: Record<string, unknown> } {
  const found = attemptFor(
    rootDir,
    attemptId,
    allowExistingNotBroadcastAfterFailure,
  );
  if ("reason" in found) return found;
  try {
    ensurePrivateDir(found.paths.attempts_dir);
    ensurePrivateDir(found.paths.holds_dir);
    ensurePrivateDir(attemptDir(found.paths, attemptId));
    return {
      ...found,
      state: readState(found.paths, found.attempt),
    };
  } catch (error) {
    return {
      ok: false,
      reason: "broadcast_outcome_state_invalid",
      detail: { message: String((error as Error)?.message || error) },
    };
  }
}

function exactTx(input: unknown, expected: string): string | null {
  const tx = normalizeHash(input);
  return tx && tx === expected ? tx : null;
}

function duplicateOrConflict<T extends { attempt_id: string; void_delivery_tx_hash: string }>(
  file: string,
  expected: T,
  parse: (raw: Record<string, any>) => T,
  fingerprint: (value: T) => string,
): "created" | "duplicate" | "conflict" {
  const created = atomicCreateJson(file, expected);
  if (created === "created") return "created";
  const raw = readJsonObject(file);
  if (!raw) return "conflict";
  const existing = parse(raw);
  return fingerprint(existing) === fingerprint(expected) ? "duplicate" : "conflict";
}

function baseFingerprint(value: Record<string, any>): string {
  return stableFingerprint(
    Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !["recorded_at_ms"].includes(key))
        .map(([key, item]) => [key, typeof item === "object" ? JSON.stringify(item) : String(item)]),
    ),
  );
}

export function recordBuyVoidNotBroadcastV1(
  input: RecordBuyVoidNotBroadcastInputV1,
): BuyVoidBroadcastOutcomeDecisionV1 {
  const found = currentForMutation(
    input?.root_dir,
    String(input?.attempt_id || ""),
    true,
  );
  if ("reason" in found) return held(found.reason, found.detail);
  const tx = exactTx(input.transaction_hash, found.tx_hash);
  if (!tx) return held("not_broadcast_transaction_hash_mismatch");
  if (found.attempt.broadcast || found.attempt.confirmation) {
    return held("cannot_mark_not_broadcast_after_external_broadcast");
  }
  if (found.state.status !== "prepared_no_outcome" && found.state.status !== "not_broadcast") {
    return held("cannot_mark_not_broadcast_after_uncertain_or_observed_broadcast");
  }
  const code = String(input.reason_code || "").trim();
  if (!SAFE_CODE.test(code)) return held("invalid_not_broadcast_reason_code");
  const record: BuyVoidNotBroadcastRecordV1 = {
    schema: "void_buy_void_not_broadcast_record_v1",
    marker: VOID_BUY_VOID_BROADCAST_OUTCOME_JOURNAL_V1,
    attempt_id: found.attempt.reservation.attempt_id,
    recorded_at_ms: safeNow(input.now_ms),
    void_delivery_tx_hash: tx,
    reason_code: code,
    provider_submission_id: String(input.provider_submission_id || "").trim().slice(0, 200),
    definitive_not_broadcast: true,
    retry_allowed: true,
    transaction_broadcast_performed_by_this_module: false,
  };
  try {
    const result = duplicateOrConflict(
      recordFile(found.paths, record.attempt_id, "not-broadcast"),
      record,
      readNotBroadcast,
      (value) => baseFingerprint(value as unknown as Record<string, any>),
    );
    if (result === "conflict") return held("not_broadcast_record_conflict");
    return {
      ok: true,
      status: result === "created" ? "recorded" : "duplicate",
      duplicate: result === "duplicate",
      state: readState(found.paths, found.attempt),
    };
  } catch (error) {
    return held("not_broadcast_record_failed", {
      message: String((error as Error)?.message || error),
    });
  }
}

export function recordBuyVoidBroadcastUnknownV1(
  input: RecordBuyVoidBroadcastUnknownInputV1,
): BuyVoidBroadcastOutcomeDecisionV1 {
  const found = currentForMutation(input?.root_dir, String(input?.attempt_id || ""));
  if ("reason" in found) return held(found.reason, found.detail);
  const tx = exactTx(input.transaction_hash, found.tx_hash);
  if (!tx) return held("broadcast_unknown_transaction_hash_mismatch");
  if (found.state.status !== "prepared_no_outcome" && found.state.status !== "broadcast_unknown") {
    return held("broadcast_unknown_invalid_transition", { current_status: found.state.status });
  }
  const code = String(input.reason_code || "").trim();
  if (!SAFE_CODE.test(code)) return held("invalid_broadcast_unknown_reason_code");
  const record: BuyVoidBroadcastUnknownRecordV1 = {
    schema: "void_buy_void_broadcast_unknown_record_v1",
    marker: VOID_BUY_VOID_BROADCAST_OUTCOME_JOURNAL_V1,
    attempt_id: found.attempt.reservation.attempt_id,
    recorded_at_ms: safeNow(input.now_ms),
    void_delivery_tx_hash: tx,
    reason_code: code,
    provider_submission_id: String(input.provider_submission_id || "").trim().slice(0, 200),
    broadcast_may_have_occurred: true,
    reconciliation_required: true,
    retry_allowed: false,
    transaction_broadcast_performed_by_this_module: false,
  };
  try {
    const result = duplicateOrConflict(
      recordFile(found.paths, record.attempt_id, "unknown"),
      record,
      readUnknown,
      (value) => baseFingerprint(value as unknown as Record<string, any>),
    );
    if (result === "conflict") return held("broadcast_unknown_record_conflict");
    return {
      ok: true,
      status: result === "created" ? "recorded" : "duplicate",
      duplicate: result === "duplicate",
      state: readState(found.paths, found.attempt),
    };
  } catch (error) {
    return held("broadcast_unknown_record_failed", {
      message: String((error as Error)?.message || error),
    });
  }
}

export function recordBuyVoidBroadcastAcceptedV1(
  input: RecordBuyVoidBroadcastAcceptedInputV1,
): BuyVoidBroadcastOutcomeDecisionV1 {
  const found = currentForMutation(input?.root_dir, String(input?.attempt_id || ""));
  if ("reason" in found) return held(found.reason, found.detail);
  const tx = exactTx(input.transaction_hash, found.tx_hash);
  if (!tx) return held("broadcast_accepted_transaction_hash_mismatch");
  if (!found.attempt.broadcast) return held("execution_broadcast_observation_missing");
  if (
    !["prepared_no_outcome", "broadcast_unknown", "broadcast_accepted"].includes(
      found.state.status,
    )
  ) {
    return held("broadcast_accepted_invalid_transition", {
      current_status: found.state.status,
    });
  }
  const record: BuyVoidBroadcastAcceptedRecordV1 = {
    schema: "void_buy_void_broadcast_accepted_record_v1",
    marker: VOID_BUY_VOID_BROADCAST_OUTCOME_JOURNAL_V1,
    attempt_id: found.attempt.reservation.attempt_id,
    recorded_at_ms: safeNow(input.now_ms),
    void_delivery_tx_hash: tx,
    provider_submission_id: String(input.provider_submission_id || "").trim().slice(0, 200),
    external_broadcast_accepted: true,
    reconciliation_required: true,
    retry_allowed: false,
    transaction_broadcast_performed_by_this_module: false,
  };
  try {
    const result = duplicateOrConflict(
      recordFile(found.paths, record.attempt_id, "accepted"),
      record,
      readAccepted,
      (value) => baseFingerprint(value as unknown as Record<string, any>),
    );
    if (result === "conflict") return held("broadcast_accepted_record_conflict");
    return {
      ok: true,
      status: result === "created" ? "recorded" : "duplicate",
      duplicate: result === "duplicate",
      state: readState(found.paths, found.attempt),
    };
  } catch (error) {
    return held("broadcast_accepted_record_failed", {
      message: String((error as Error)?.message || error),
    });
  }
}

function normalizePolicy(
  policy: BuyVoidBroadcastOutcomePolicyV1,
):
  | { ok: true; chain_id: string; min_revert_confirmations: number }
  | { ok: false; reason: string } {
  if (policy?.outcome_journal_enabled !== true) {
    return { ok: false, reason: "broadcast_outcome_journal_disabled" };
  }
  const chain = parseNonNegativeInteger(policy.chain_id);
  const minimum = parseNonNegativeInteger(policy.min_revert_confirmations);
  if (chain === null || chain <= 0n) return { ok: false, reason: "invalid_chain_id" };
  if (minimum === null || minimum <= 0n || minimum > 1000n) {
    return { ok: false, reason: "invalid_min_revert_confirmations" };
  }
  return {
    ok: true,
    chain_id: chain.toString(),
    min_revert_confirmations: Number(minimum),
  };
}

export function recordBuyVoidBroadcastRevertedV1(
  input: RecordBuyVoidBroadcastRevertedInputV1,
): BuyVoidBroadcastOutcomeDecisionV1 {
  const found = currentForMutation(input?.root_dir, String(input?.attempt_id || ""));
  if ("reason" in found) return held(found.reason, found.detail);
  const tx = exactTx(input.transaction_hash, found.tx_hash);
  if (!tx) return held("broadcast_reverted_transaction_hash_mismatch");
  const policy = normalizePolicy(input.policy);
  if ("reason" in policy) return held(policy.reason);
  if (
    !["broadcast_unknown", "broadcast_accepted", "reverted"].includes(
      found.state.status,
    ) && !found.attempt.broadcast
  ) {
    return held("broadcast_reverted_without_possible_broadcast");
  }
  if (found.state.status === "confirmed") return held("cannot_revert_confirmed_delivery");
  const chain = parseNonNegativeInteger(input.observation?.chain_id);
  const status = parseNonNegativeInteger(input.observation?.transaction_status);
  const block = parseNonNegativeInteger(input.observation?.block_number);
  const current = parseNonNegativeInteger(input.observation?.current_block_number);
  if (chain === null || chain.toString() !== policy.chain_id) {
    return held("broadcast_reverted_chain_mismatch");
  }
  if (status !== 0n) return held("broadcast_reverted_status_not_failed");
  if (block === null || current === null || current < block) {
    return held("invalid_revert_block_numbers");
  }
  const confirmations = current - block + 1n;
  if (confirmations < BigInt(policy.min_revert_confirmations)) {
    return held("insufficient_revert_confirmations", {
      confirmation_count: confirmations.toString(),
      required: policy.min_revert_confirmations,
    });
  }
  const record: BuyVoidBroadcastRevertedRecordV1 = {
    schema: "void_buy_void_broadcast_reverted_record_v1",
    marker: VOID_BUY_VOID_BROADCAST_OUTCOME_JOURNAL_V1,
    attempt_id: found.attempt.reservation.attempt_id,
    recorded_at_ms: safeNow(input.now_ms),
    chain_id: chain.toString(),
    void_delivery_tx_hash: tx,
    transaction_status: 0,
    block_number: block.toString(),
    current_block_number: current.toString(),
    confirmation_count: confirmations.toString(),
    min_revert_confirmations: policy.min_revert_confirmations,
    definitive_revert: true,
    reconciliation_required: false,
    retry_allowed: true,
    transaction_broadcast_performed_by_this_module: false,
  };
  try {
    const result = duplicateOrConflict(
      recordFile(found.paths, record.attempt_id, "reverted"),
      record,
      readReverted,
      (value) => baseFingerprint(value as unknown as Record<string, any>),
    );
    if (result === "conflict") return held("broadcast_reverted_record_conflict");
    return {
      ok: true,
      status: result === "created" ? "recorded" : "duplicate",
      duplicate: result === "duplicate",
      state: readState(found.paths, found.attempt),
    };
  } catch (error) {
    return held("broadcast_reverted_record_failed", {
      message: String((error as Error)?.message || error),
    });
  }
}

function confirmationFingerprint(
  record: BuyVoidConfirmedFulfillmentRecordV1,
  deliveryBlockHash?: string,
): string {
  const legacy = {
    marker: String(record.marker || ""),
    canonical_payment_identity: String(record.canonical_payment_identity || ""),
    request_id: String(record.request_id || ""),
    instruction_id: String(record.instruction_id || ""),
    void_delivery_tx_hash: String(record.void_delivery_tx_hash || ""),
    ...(record.delivery_block_hash
      ? { delivery_block_hash: String(record.delivery_block_hash) }
      : {}),
    fulfillment_wallet: String(record.fulfillment_wallet || ""),
    delivery_address: String(record.delivery_address || ""),
    void_amount_units: String(record.void_amount_units || ""),
  };
  if (!deliveryBlockHash) return stableFingerprint(legacy);
  return stableFingerprint({
    ...legacy,
    delivery_block_number: String(record.delivery_block_number || ""),
    delivery_block_hash: deliveryBlockHash,
    delivery_binding_fingerprint: String(
      record.delivery_binding_fingerprint || "",
    ),
  });
}

export function recordBuyVoidBroadcastConfirmedV1(
  input: RecordBuyVoidBroadcastConfirmedInputV1,
): BuyVoidBroadcastOutcomeDecisionV1 {
  const found = currentForMutation(input?.root_dir, String(input?.attempt_id || ""));
  if ("reason" in found) return held(found.reason, found.detail);
  const tx = exactTx(input.transaction_hash, found.tx_hash);
  if (!tx) return held("broadcast_confirmed_transaction_hash_mismatch");
  if (found.state.status === "not_broadcast") return held("cannot_confirm_not_broadcast");
  if (found.state.status === "reverted") return held("cannot_confirm_reverted_delivery");
  if (!found.attempt.confirmation) return held("execution_attempt_confirmation_missing");
  const record = input.confirmed_record;
  if (
    !record ||
    record.marker !== VOID_BUY_VOID_FULFILLMENT_CONFIRMATION_V1 ||
    record.status !== "fulfilled_confirmed" ||
    record.void_delivery_tx_hash !== tx ||
    record.canonical_payment_identity !==
      found.attempt.reservation.canonical_payment_identity ||
    record.request_id !== found.attempt.reservation.request_id ||
    record.instruction_id !== found.attempt.reservation.instruction_id
  ) {
    return held("confirmed_record_attempt_mismatch");
  }
  const fingerprint = confirmationFingerprint(
    record,
    found.attempt.confirmation.delivery_block_hash,
  );
  if (found.attempt.confirmation.confirmation_fingerprint !== fingerprint) {
    return held("execution_confirmation_fingerprint_mismatch");
  }
  const outcome: BuyVoidBroadcastConfirmedRecordV1 = {
    schema: "void_buy_void_broadcast_confirmed_record_v1",
    marker: VOID_BUY_VOID_BROADCAST_OUTCOME_JOURNAL_V1,
    attempt_id: found.attempt.reservation.attempt_id,
    recorded_at_ms: safeNow(input.now_ms),
    void_delivery_tx_hash: tx,
    confirmation_fingerprint: fingerprint,
    confirmed_record: record,
    definitive_confirmation: true,
    reconciliation_required: false,
    retry_allowed: false,
    transaction_broadcast_performed_by_this_module: false,
  };
  try {
    const result = duplicateOrConflict(
      recordFile(found.paths, outcome.attempt_id, "confirmed"),
      outcome,
      readConfirmed,
      (value) => baseFingerprint(value as unknown as Record<string, any>),
    );
    if (result === "conflict") return held("broadcast_confirmed_record_conflict");
    return {
      ok: true,
      status: result === "created" ? "recorded" : "duplicate",
      duplicate: result === "duplicate",
      state: readState(found.paths, found.attempt),
    };
  } catch (error) {
    return held("broadcast_confirmed_record_failed", {
      message: String((error as Error)?.message || error),
    });
  }
}
