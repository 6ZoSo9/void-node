import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  VOID_BUY_VOID_FULFILLMENT_CONFIRMATION_V1,
  type BuyVoidConfirmedFulfillmentRecordV1,
} from "./buy_void_fulfillment_confirmation_v1.js";
import {
  VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1,
  type BuyVoidFulfillmentJournalIntentV1,
} from "./buy_void_fulfillment_journal_v1.js";
import type {
  BuyVoidBroadcastRevertedRecordV1,
} from "./buy_void_broadcast_outcome_journal_v1.js";

export const VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1 =
  "VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1";

export const VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_AUTHORITY_V1 = {
  filesystem_read: true,
  filesystem_write: true,
  execution_attempt_reservation: true,
  signed_transaction_binding: true,
  broadcast_observation_persistence: true,
  definitive_revert_release_persistence: true,
  confirmation_reference_persistence: true,
  rpc_call: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  raw_transaction_persistence: false,
  runtime_route_mount: false,
  money_movement: false,
} as const;

const ADDRESS = /^0x[0-9a-f]{40}$/;
const HEX_32 = /^0x[0-9a-f]{64}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const SAFE_CODE = /^[A-Za-z0-9._:-]{1,160}$/;

export type BuyVoidExecutionAttemptPolicyV1 = {
  attempt_journal_enabled: boolean;
  max_attempts_per_payment: string | number;
  chain_id: string | number;
  fulfillment_wallet_allowlist: string[];
};

export type BuyVoidExecutionAttemptJournalPathsV1 = {
  root_dir: string;
  journal_dir: string;
  attempts_dir: string;
  deliveries_dir: string;
  holds_dir: string;
};

export type BuyVoidExecutionAttemptReservationV1 = {
  schema: "void_buy_void_execution_attempt_reservation_v1";
  marker: typeof VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1;
  attempt_id: string;
  attempt_number: number;
  reserved_at_ms: number;
  payment_key_sha256: string;
  request_key_sha256: string;
  canonical_payment_identity: string;
  request_id: string;
  instruction_id: string;
  intent_fingerprint: string;
  max_attempts_per_payment: number;
  unsigned_instruction: BuyVoidFulfillmentJournalIntentV1["claim"]["unsigned_instruction"];
  signing_authorized_by_this_module: false;
  transaction_broadcast_authorized_by_this_module: false;
  money_movement_authorized_by_this_module: false;
};

export type BuyVoidExecutionPreparedTransactionV1 = {
  schema: "void_buy_void_execution_prepared_transaction_v1";
  marker: typeof VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1;
  attempt_id: string;
  prepared_at_ms: number;
  chain_id: string;
  void_delivery_tx_hash: string;
  fulfillment_wallet: string;
  delivery_address: string;
  void_amount_units: string;
  transaction_binding_fingerprint: string;
  signed_transaction_persisted: false;
  raw_transaction_persisted: false;
  transaction_broadcast_performed_by_this_module: false;
};

export type BuyVoidExecutionDeliveryIndexV1 = {
  schema: "void_buy_void_execution_delivery_index_v1";
  marker: typeof VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1;
  delivery_key_sha256: string;
  void_delivery_tx_hash: string;
  attempt_id: string;
  canonical_payment_identity: string;
  request_id: string;
  instruction_id: string;
};

export type BuyVoidExecutionBroadcastObservationV1 = {
  schema: "void_buy_void_execution_broadcast_observation_v1";
  marker: typeof VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1;
  attempt_id: string;
  observed_at_ms: number;
  void_delivery_tx_hash: string;
  provider_submission_id: string;
  external_broadcast_observed: true;
  transaction_broadcast_performed_by_this_module: false;
};

export type BuyVoidExecutionPrebroadcastFailureV1 = {
  schema: "void_buy_void_execution_prebroadcast_failure_v1";
  marker: typeof VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1;
  attempt_id: string;
  failed_at_ms: number;
  failure_code: string;
  retryable: boolean;
  detail?: Record<string, unknown>;
  transaction_broadcast_observed: false;
};

export type BuyVoidExecutionPostbroadcastFailureV1 = {
  schema: "void_buy_void_execution_postbroadcast_failure_v1";
  marker: typeof VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1;
  attempt_id: string;
  failed_at_ms: number;
  failure_code: "delivery_transaction_reverted";
  retryable: true;
  void_delivery_tx_hash: string;
  broadcast_outcome_marker: "VOID_BUY_VOID_BROADCAST_OUTCOME_JOURNAL_V1";
  broadcast_outcome_recorded_at_ms: number;
  revert_block_number: string;
  revert_confirmation_count: string;
  definitive_revert: true;
  transaction_broadcast_observed: true;
};

export type BuyVoidExecutionAttemptConfirmationV1 = {
  schema: "void_buy_void_execution_attempt_confirmation_v1";
  marker: typeof VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1;
  attempt_id: string;
  confirmed_at_ms: number;
  void_delivery_tx_hash: string;
  confirmation_fingerprint: string;
  confirmed_record: BuyVoidConfirmedFulfillmentRecordV1;
};

export type BuyVoidExecutionAttemptStateV1 = {
  reservation: BuyVoidExecutionAttemptReservationV1;
  prepared: BuyVoidExecutionPreparedTransactionV1 | null;
  broadcast: BuyVoidExecutionBroadcastObservationV1 | null;
  failure: BuyVoidExecutionPrebroadcastFailureV1 | null;
  postbroadcast_failure: BuyVoidExecutionPostbroadcastFailureV1 | null;
  confirmation: BuyVoidExecutionAttemptConfirmationV1 | null;
  status:
    | "reserved"
    | "prepared"
    | "broadcast"
    | "failed_retryable"
    | "failed_terminal"
    | "confirmed";
};

export type BuyVoidExecutionAttemptReserveDecisionV1 =
  | {
      ok: true;
      status: "reserved";
      duplicate: false;
      new_attempt: true;
      attempt: BuyVoidExecutionAttemptStateV1;
    }
  | {
      ok: true;
      status: "duplicate";
      duplicate: true;
      new_attempt: false;
      attempt: BuyVoidExecutionAttemptStateV1;
    }
  | {
      ok: false;
      status: "held";
      duplicate: false;
      new_attempt: false;
      reason: string;
      detail?: Record<string, unknown>;
    };

export type BuyVoidExecutionAttemptMutationDecisionV1 =
  | {
      ok: true;
      status: "recorded" | "duplicate";
      duplicate: boolean;
      recovered_delivery_index: boolean;
      attempt: BuyVoidExecutionAttemptStateV1;
    }
  | {
      ok: false;
      status: "held";
      duplicate: false;
      recovered_delivery_index: false;
      reason: string;
      detail?: Record<string, unknown>;
    };

export type ReserveBuyVoidExecutionAttemptInputV1 = {
  root_dir: string;
  intent: BuyVoidFulfillmentJournalIntentV1;
  policy: BuyVoidExecutionAttemptPolicyV1;
  now_ms?: number;
};

export type PrepareBuyVoidExecutionTransactionInputV1 = {
  root_dir: string;
  attempt_id: string;
  intent: BuyVoidFulfillmentJournalIntentV1;
  policy: BuyVoidExecutionAttemptPolicyV1;
  transaction: {
    chain_id?: unknown;
    transaction_hash?: unknown;
    from_address?: unknown;
    to_address?: unknown;
    amount_units?: unknown;
  };
  now_ms?: number;
};

export type RecordBuyVoidExecutionBroadcastInputV1 = {
  root_dir: string;
  attempt_id: string;
  transaction_hash: unknown;
  provider_submission_id?: unknown;
  now_ms?: number;
};

export type RecordBuyVoidExecutionPrebroadcastFailureInputV1 = {
  root_dir: string;
  attempt_id: string;
  failure_code: unknown;
  retryable: boolean;
  detail?: Record<string, unknown>;
  now_ms?: number;
};

export type RecordBuyVoidExecutionPostbroadcastFailureInputV1 = {
  root_dir: string;
  attempt_id: string;
  outcome: BuyVoidBroadcastRevertedRecordV1;
  now_ms?: number;
};

export type RecordBuyVoidExecutionConfirmedInputV1 = {
  root_dir: string;
  attempt_id: string;
  confirmed_record: BuyVoidConfirmedFulfillmentRecordV1;
  now_ms?: number;
};

function heldReserve(
  reason: string,
  detail?: Record<string, unknown>,
): BuyVoidExecutionAttemptReserveDecisionV1 {
  return {
    ok: false,
    status: "held",
    duplicate: false,
    new_attempt: false,
    reason,
    ...(detail ? { detail } : {}),
  };
}

function heldMutation(
  reason: string,
  detail?: Record<string, unknown>,
): BuyVoidExecutionAttemptMutationDecisionV1 {
  return {
    ok: false,
    status: "held",
    duplicate: false,
    recovered_delivery_index: false,
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

function normalizeAddress(value: unknown): string {
  const address = String(value || "").trim().toLowerCase();
  return ADDRESS.test(address) ? address : "";
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
      const n = BigInt(raw);
      return n >= 0n ? n : null;
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
  if (!raw || raw.includes("\0")) throw new Error("invalid_execution_attempt_root");
  return path.resolve(raw);
}

export function buyVoidExecutionAttemptJournalPathsV1(
  rootDir: string,
): BuyVoidExecutionAttemptJournalPathsV1 {
  const root = validateRoot(rootDir);
  const journalDir = path.join(root, "buy-void-execution-attempts-v1");
  return {
    root_dir: root,
    journal_dir: journalDir,
    attempts_dir: path.join(journalDir, "attempts"),
    deliveries_dir: path.join(journalDir, "deliveries"),
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
    // Directory fsync is unavailable on some filesystems.
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
      `execution_attempt_corrupt_json:${file}:${String((error as Error)?.message || error)}`,
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`execution_attempt_corrupt_shape:${file}`);
  }
  return parsed as Record<string, any>;
}

function intentFingerprint(intent: BuyVoidFulfillmentJournalIntentV1): string {
  return stableFingerprint({
    marker: String(intent.marker || ""),
    canonical_payment_identity: String(intent.claim?.canonical_payment_identity || ""),
    payment_key_sha256: String(intent.payment_key_sha256 || ""),
    request_key_sha256: String(intent.request_key_sha256 || ""),
    request_id: String(intent.claim?.request_id || ""),
    instruction_id: String(intent.claim?.instruction_id || ""),
    source_chain: String(intent.claim?.unsigned_instruction?.source_chain || ""),
    payment_transaction_hash: String(
      intent.claim?.unsigned_instruction?.payment_transaction_hash || "",
    ),
    payment_log_index: String(intent.claim?.unsigned_instruction?.payment_log_index || ""),
    delivery_address: String(intent.claim?.unsigned_instruction?.delivery_address || ""),
    void_amount_units: String(intent.claim?.unsigned_instruction?.void_amount_units || ""),
  });
}

function validateIntent(
  intent: BuyVoidFulfillmentJournalIntentV1,
): { ok: true } | { ok: false; reason: string } {
  if (!intent || typeof intent !== "object") return { ok: false, reason: "missing_intent" };
  if (intent.marker !== VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1) {
    return { ok: false, reason: "wrong_fulfillment_journal_marker" };
  }
  if (intent.claim?.status !== "claimed") return { ok: false, reason: "intent_not_claimed" };
  if (intent.signing_authorized !== false) return { ok: false, reason: "intent_signing_authority_present" };
  if (intent.transaction_broadcast_authorized !== false) {
    return { ok: false, reason: "intent_broadcast_authority_present" };
  }
  if (intent.money_movement_authorized !== false) {
    return { ok: false, reason: "intent_money_movement_authority_present" };
  }
  if (!SHA256.test(String(intent.payment_key_sha256 || ""))) {
    return { ok: false, reason: "invalid_payment_key" };
  }
  if (!SHA256.test(String(intent.request_key_sha256 || ""))) {
    return { ok: false, reason: "invalid_request_key" };
  }
  if (!SAFE_CODE.test(String(intent.claim?.request_id || ""))) {
    return { ok: false, reason: "invalid_request_id" };
  }
  if (!SAFE_CODE.test(String(intent.claim?.instruction_id || ""))) {
    return { ok: false, reason: "invalid_instruction_id" };
  }
  if (!normalizeAddress(intent.claim?.unsigned_instruction?.delivery_address)) {
    return { ok: false, reason: "invalid_delivery_address" };
  }
  const amount = parseNonNegativeInteger(
    intent.claim?.unsigned_instruction?.void_amount_units,
  );
  if (amount === null || amount <= 0n) return { ok: false, reason: "invalid_void_amount" };
  return { ok: true };
}

function normalizePolicy(
  policy: BuyVoidExecutionAttemptPolicyV1,
):
  | {
      ok: true;
      max_attempts: number;
      chain_id: string;
      wallet_allowlist: Set<string>;
    }
  | { ok: false; reason: string } {
  if (!policy || policy.attempt_journal_enabled !== true) {
    return { ok: false, reason: "execution_attempt_journal_disabled" };
  }
  const maxAttemptsBig = parseNonNegativeInteger(policy.max_attempts_per_payment);
  if (maxAttemptsBig === null || maxAttemptsBig < 1n || maxAttemptsBig > 10n) {
    return { ok: false, reason: "invalid_max_attempts_policy" };
  }
  const chainId = parseNonNegativeInteger(policy.chain_id);
  if (chainId === null || chainId <= 0n) {
    return { ok: false, reason: "invalid_execution_chain_policy" };
  }
  const walletAllowlist = new Set(
    (policy.fulfillment_wallet_allowlist || [])
      .map(normalizeAddress)
      .filter(Boolean),
  );
  if (walletAllowlist.size === 0) {
    return { ok: false, reason: "empty_fulfillment_wallet_allowlist" };
  }
  return {
    ok: true,
    max_attempts: Number(maxAttemptsBig),
    chain_id: chainId.toString(),
    wallet_allowlist: walletAllowlist,
  };
}

function attemptDir(paths: BuyVoidExecutionAttemptJournalPathsV1, attemptId: string): string {
  if (!SHA256.test(attemptId)) throw new Error("invalid_attempt_id");
  return path.join(paths.attempts_dir, attemptId);
}

function eventFile(
  paths: BuyVoidExecutionAttemptJournalPathsV1,
  attemptId: string,
  event:
    | "reserved"
    | "prepared"
    | "broadcast"
    | "failure"
    | "postbroadcast-failure"
    | "confirmed",
): string {
  return path.join(attemptDir(paths, attemptId), `${event}.json`);
}

function deliveryKey(txHash: string): string {
  return sha256Hex(`void-buy-execution-delivery-v1\n${txHash}`);
}

function deliveryFile(paths: BuyVoidExecutionAttemptJournalPathsV1, txHash: string): string {
  return path.join(paths.deliveries_dir, `${deliveryKey(txHash)}.json`);
}

function parseReservation(raw: Record<string, any>): BuyVoidExecutionAttemptReservationV1 {
  if (
    raw.schema !== "void_buy_void_execution_attempt_reservation_v1" ||
    raw.marker !== VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1 ||
    !SHA256.test(String(raw.attempt_id || "")) ||
    !Number.isSafeInteger(raw.attempt_number) ||
    raw.attempt_number < 1 ||
    !SHA256.test(String(raw.payment_key_sha256 || "")) ||
    !SHA256.test(String(raw.request_key_sha256 || "")) ||
    !SHA256.test(String(raw.intent_fingerprint || "")) ||
    !SAFE_CODE.test(String(raw.instruction_id || ""))
  ) {
    throw new Error("invalid_execution_attempt_reservation");
  }
  return raw as BuyVoidExecutionAttemptReservationV1;
}

function parsePrepared(raw: Record<string, any>): BuyVoidExecutionPreparedTransactionV1 {
  if (
    raw.schema !== "void_buy_void_execution_prepared_transaction_v1" ||
    raw.marker !== VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1 ||
    !SHA256.test(String(raw.attempt_id || "")) ||
    !normalizeHash(raw.void_delivery_tx_hash) ||
    !normalizeAddress(raw.fulfillment_wallet) ||
    !normalizeAddress(raw.delivery_address) ||
    parseNonNegativeInteger(raw.void_amount_units) === null
  ) {
    throw new Error("invalid_execution_prepared_transaction");
  }
  return raw as BuyVoidExecutionPreparedTransactionV1;
}

function parseBroadcast(raw: Record<string, any>): BuyVoidExecutionBroadcastObservationV1 {
  if (
    raw.schema !== "void_buy_void_execution_broadcast_observation_v1" ||
    raw.marker !== VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1 ||
    !SHA256.test(String(raw.attempt_id || "")) ||
    !normalizeHash(raw.void_delivery_tx_hash) ||
    raw.external_broadcast_observed !== true
  ) {
    throw new Error("invalid_execution_broadcast_observation");
  }
  return raw as BuyVoidExecutionBroadcastObservationV1;
}

function parseFailure(raw: Record<string, any>): BuyVoidExecutionPrebroadcastFailureV1 {
  if (
    raw.schema !== "void_buy_void_execution_prebroadcast_failure_v1" ||
    raw.marker !== VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1 ||
    !SHA256.test(String(raw.attempt_id || "")) ||
    !SAFE_CODE.test(String(raw.failure_code || "")) ||
    typeof raw.retryable !== "boolean"
  ) {
    throw new Error("invalid_execution_prebroadcast_failure");
  }
  return raw as BuyVoidExecutionPrebroadcastFailureV1;
}

function parsePostbroadcastFailure(
  raw: Record<string, any>,
): BuyVoidExecutionPostbroadcastFailureV1 {
  if (
    raw.schema !== "void_buy_void_execution_postbroadcast_failure_v1" ||
    raw.marker !== VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1 ||
    !SHA256.test(String(raw.attempt_id || "")) ||
    raw.failure_code !== "delivery_transaction_reverted" ||
    raw.retryable !== true ||
    !normalizeHash(raw.void_delivery_tx_hash) ||
    raw.broadcast_outcome_marker !==
      "VOID_BUY_VOID_BROADCAST_OUTCOME_JOURNAL_V1" ||
    !Number.isSafeInteger(raw.broadcast_outcome_recorded_at_ms) ||
    raw.broadcast_outcome_recorded_at_ms < 0 ||
    parseNonNegativeInteger(raw.revert_block_number) === null ||
    parseNonNegativeInteger(raw.revert_confirmation_count) === null ||
    raw.definitive_revert !== true ||
    raw.transaction_broadcast_observed !== true
  ) {
    throw new Error("invalid_execution_postbroadcast_failure");
  }
  return raw as BuyVoidExecutionPostbroadcastFailureV1;
}

function parseConfirmation(raw: Record<string, any>): BuyVoidExecutionAttemptConfirmationV1 {
  if (
    raw.schema !== "void_buy_void_execution_attempt_confirmation_v1" ||
    raw.marker !== VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1 ||
    !SHA256.test(String(raw.attempt_id || "")) ||
    !normalizeHash(raw.void_delivery_tx_hash) ||
    !SHA256.test(String(raw.confirmation_fingerprint || ""))
  ) {
    throw new Error("invalid_execution_attempt_confirmation");
  }
  return raw as BuyVoidExecutionAttemptConfirmationV1;
}

function readAttemptState(
  paths: BuyVoidExecutionAttemptJournalPathsV1,
  attemptId: string,
): BuyVoidExecutionAttemptStateV1 | null {
  const reservedRaw = readJsonObject(eventFile(paths, attemptId, "reserved"));
  if (!reservedRaw) return null;
  const reservation = parseReservation(reservedRaw);
  const preparedRaw = readJsonObject(eventFile(paths, attemptId, "prepared"));
  const broadcastRaw = readJsonObject(eventFile(paths, attemptId, "broadcast"));
  const failureRaw = readJsonObject(eventFile(paths, attemptId, "failure"));
  const postbroadcastFailureRaw = readJsonObject(
    eventFile(paths, attemptId, "postbroadcast-failure"),
  );
  const confirmedRaw = readJsonObject(eventFile(paths, attemptId, "confirmed"));

  const prepared = preparedRaw ? parsePrepared(preparedRaw) : null;
  const broadcast = broadcastRaw ? parseBroadcast(broadcastRaw) : null;
  const failure = failureRaw ? parseFailure(failureRaw) : null;
  const postbroadcastFailure = postbroadcastFailureRaw
    ? parsePostbroadcastFailure(postbroadcastFailureRaw)
    : null;
  const confirmation = confirmedRaw ? parseConfirmation(confirmedRaw) : null;

  for (const record of [
    prepared,
    broadcast,
    failure,
    postbroadcastFailure,
    confirmation,
  ]) {
    if (record && record.attempt_id !== reservation.attempt_id) {
      throw new Error("execution_attempt_record_id_mismatch");
    }
  }
  if (broadcast && !prepared) throw new Error("execution_attempt_broadcast_without_prepare");
  if (failure && broadcast) throw new Error("execution_attempt_failure_after_broadcast");
  if (postbroadcastFailure && !broadcast) {
    throw new Error("execution_attempt_postbroadcast_failure_without_broadcast");
  }
  if (failure && postbroadcastFailure) {
    throw new Error("execution_attempt_failure_kind_conflict");
  }
  if (confirmation && !broadcast) throw new Error("execution_attempt_confirmation_without_broadcast");
  if ((failure || postbroadcastFailure) && confirmation) {
    throw new Error("execution_attempt_failure_confirmation_conflict");
  }
  if (
    prepared &&
    postbroadcastFailure &&
    prepared.void_delivery_tx_hash !== postbroadcastFailure.void_delivery_tx_hash
  ) {
    throw new Error("execution_attempt_postbroadcast_failure_tx_mismatch");
  }
  if (
    prepared &&
    broadcast &&
    prepared.void_delivery_tx_hash !== broadcast.void_delivery_tx_hash
  ) {
    throw new Error("execution_attempt_broadcast_tx_mismatch");
  }
  if (
    prepared &&
    confirmation &&
    prepared.void_delivery_tx_hash !== confirmation.void_delivery_tx_hash
  ) {
    throw new Error("execution_attempt_confirmation_tx_mismatch");
  }

  let status: BuyVoidExecutionAttemptStateV1["status"] = "reserved";
  if (prepared) status = "prepared";
  if (broadcast) status = "broadcast";
  if (failure) status = failure.retryable ? "failed_retryable" : "failed_terminal";
  if (postbroadcastFailure) status = "failed_retryable";
  if (confirmation) status = "confirmed";

  return {
    reservation,
    prepared,
    broadcast,
    failure,
    postbroadcast_failure: postbroadcastFailure,
    confirmation,
    status,
  };
}

export function listBuyVoidExecutionAttemptsV1(
  rootDir: string,
): BuyVoidExecutionAttemptStateV1[] {
  const paths = buyVoidExecutionAttemptJournalPathsV1(rootDir);
  if (!fs.existsSync(paths.attempts_dir)) return [];
  const out: BuyVoidExecutionAttemptStateV1[] = [];
  for (const name of fs.readdirSync(paths.attempts_dir).sort()) {
    if (!SHA256.test(name)) continue;
    const state = readAttemptState(paths, name);
    if (state) out.push(state);
  }
  out.sort((a, b) => a.reservation.attempt_number - b.reservation.attempt_number);
  return out;
}

export function readBuyVoidExecutionAttemptV1(input: {
  root_dir: string;
  attempt_id: string;
}): BuyVoidExecutionAttemptStateV1 | null {
  const paths = buyVoidExecutionAttemptJournalPathsV1(input.root_dir);
  return readAttemptState(paths, String(input.attempt_id || ""));
}

function matchingAttempts(
  paths: BuyVoidExecutionAttemptJournalPathsV1,
  intent: BuyVoidFulfillmentJournalIntentV1,
): BuyVoidExecutionAttemptStateV1[] {
  return listBuyVoidExecutionAttemptsV1(paths.root_dir).filter(
    (state) =>
      state.reservation.canonical_payment_identity ===
        intent.claim.canonical_payment_identity ||
      state.reservation.request_id === intent.claim.request_id ||
      state.reservation.instruction_id === intent.claim.instruction_id,
  );
}

function reservationFor(
  intent: BuyVoidFulfillmentJournalIntentV1,
  attemptNumber: number,
  maxAttempts: number,
  nowMs: number,
): BuyVoidExecutionAttemptReservationV1 {
  const fingerprint = intentFingerprint(intent);
  const attemptId = sha256Hex(
    [
      "void-buy-execution-attempt-v1",
      intent.payment_key_sha256,
      intent.claim.instruction_id,
      String(attemptNumber),
    ].join("\n"),
  );
  return {
    schema: "void_buy_void_execution_attempt_reservation_v1",
    marker: VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
    attempt_id: attemptId,
    attempt_number: attemptNumber,
    reserved_at_ms: nowMs,
    payment_key_sha256: intent.payment_key_sha256,
    request_key_sha256: intent.request_key_sha256,
    canonical_payment_identity: intent.claim.canonical_payment_identity,
    request_id: intent.claim.request_id,
    instruction_id: intent.claim.instruction_id,
    intent_fingerprint: fingerprint,
    max_attempts_per_payment: maxAttempts,
    unsigned_instruction: intent.claim.unsigned_instruction,
    signing_authorized_by_this_module: false,
    transaction_broadcast_authorized_by_this_module: false,
    money_movement_authorized_by_this_module: false,
  };
}

export function reserveBuyVoidExecutionAttemptV1(
  input: ReserveBuyVoidExecutionAttemptInputV1,
): BuyVoidExecutionAttemptReserveDecisionV1 {
  let paths: BuyVoidExecutionAttemptJournalPathsV1;
  try {
    paths = buyVoidExecutionAttemptJournalPathsV1(input?.root_dir);
  } catch (error) {
    return heldReserve(String((error as Error)?.message || error));
  }

  const intentCheck = validateIntent(input?.intent);
  if ("reason" in intentCheck) return heldReserve(intentCheck.reason);
  const policyCheck = normalizePolicy(input?.policy);
  if ("reason" in policyCheck) return heldReserve(policyCheck.reason);

  try {
    ensurePrivateDir(paths.attempts_dir);
    ensurePrivateDir(paths.deliveries_dir);
    ensurePrivateDir(paths.holds_dir);

    const attempts = matchingAttempts(paths, input.intent);
    for (const state of attempts) {
      if (
        state.reservation.canonical_payment_identity !==
          input.intent.claim.canonical_payment_identity ||
        state.reservation.request_id !== input.intent.claim.request_id ||
        state.reservation.instruction_id !== input.intent.claim.instruction_id ||
        state.reservation.intent_fingerprint !== intentFingerprint(input.intent)
      ) {
        return heldReserve("execution_attempt_identity_conflict", {
          attempt_id: state.reservation.attempt_id,
        });
      }
      if (
        state.reservation.max_attempts_per_payment !== policyCheck.max_attempts
      ) {
        return heldReserve("execution_attempt_policy_changed", {
          original_max_attempts: state.reservation.max_attempts_per_payment,
          attempted_max_attempts: policyCheck.max_attempts,
        });
      }
    }

    const confirmed = attempts.find((state) => state.status === "confirmed");
    if (confirmed) {
      return heldReserve("payment_already_confirmed", {
        attempt_id: confirmed.reservation.attempt_id,
        void_delivery_tx_hash:
          confirmed.confirmation?.void_delivery_tx_hash || "",
      });
    }

    const active = attempts.find((state) =>
      ["reserved", "prepared", "broadcast"].includes(state.status),
    );
    if (active) {
      return {
        ok: true,
        status: "duplicate",
        duplicate: true,
        new_attempt: false,
        attempt: active,
      };
    }

    const latest = attempts[attempts.length - 1] || null;
    if (latest?.status === "failed_terminal") {
      return heldReserve("execution_attempt_terminal_failure", {
        attempt_id: latest.reservation.attempt_id,
        failure_code: latest.failure?.failure_code || "",
      });
    }

    if (attempts.length >= policyCheck.max_attempts) {
      return heldReserve("execution_attempt_cap_reached", {
        attempt_count: attempts.length,
        max_attempts: policyCheck.max_attempts,
      });
    }

    const attemptNumber = attempts.length + 1;
    const reservation = reservationFor(
      input.intent,
      attemptNumber,
      policyCheck.max_attempts,
      safeNow(input.now_ms),
    );
    ensurePrivateDir(attemptDir(paths, reservation.attempt_id));
    const created = atomicCreateJson(
      eventFile(paths, reservation.attempt_id, "reserved"),
      reservation,
    );
    const state = readAttemptState(paths, reservation.attempt_id);
    if (!state) return heldReserve("execution_attempt_reservation_unreadable");

    if (created === "exists") {
      if (state.reservation.intent_fingerprint !== reservation.intent_fingerprint) {
        return heldReserve("execution_attempt_reservation_race_conflict");
      }
      return {
        ok: true,
        status: "duplicate",
        duplicate: true,
        new_attempt: false,
        attempt: state,
      };
    }

    return {
      ok: true,
      status: "reserved",
      duplicate: false,
      new_attempt: true,
      attempt: state,
    };
  } catch (error) {
    return heldReserve("execution_attempt_reservation_failed", {
      message: String((error as Error)?.message || error),
    });
  }
}

function stateForMutation(
  rootDir: string,
  attemptId: string,
):
  | {
      ok: true;
      paths: BuyVoidExecutionAttemptJournalPathsV1;
      state: BuyVoidExecutionAttemptStateV1;
    }
  | { ok: false; reason: string } {
  try {
    const paths = buyVoidExecutionAttemptJournalPathsV1(rootDir);
    if (!SHA256.test(attemptId)) return { ok: false, reason: "invalid_attempt_id" };
    const state = readAttemptState(paths, attemptId);
    if (!state) return { ok: false, reason: "execution_attempt_not_found" };
    return { ok: true, paths, state };
  } catch (error) {
    return {
      ok: false,
      reason: `execution_attempt_read_failed:${String((error as Error)?.message || error)}`,
    };
  }
}

function validateIntentMatchesReservation(
  intent: BuyVoidFulfillmentJournalIntentV1,
  reservation: BuyVoidExecutionAttemptReservationV1,
): string | null {
  const check = validateIntent(intent);
  if ("reason" in check) return check.reason;
  if (reservation.intent_fingerprint !== intentFingerprint(intent)) {
    return "execution_attempt_intent_mismatch";
  }
  return null;
}

function deliveryIndexFor(
  prepared: BuyVoidExecutionPreparedTransactionV1,
  reservation: BuyVoidExecutionAttemptReservationV1,
): BuyVoidExecutionDeliveryIndexV1 {
  return {
    schema: "void_buy_void_execution_delivery_index_v1",
    marker: VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
    delivery_key_sha256: deliveryKey(prepared.void_delivery_tx_hash),
    void_delivery_tx_hash: prepared.void_delivery_tx_hash,
    attempt_id: reservation.attempt_id,
    canonical_payment_identity: reservation.canonical_payment_identity,
    request_id: reservation.request_id,
    instruction_id: reservation.instruction_id,
  };
}

function ensureDeliveryIndex(
  paths: BuyVoidExecutionAttemptJournalPathsV1,
  prepared: BuyVoidExecutionPreparedTransactionV1,
  reservation: BuyVoidExecutionAttemptReservationV1,
): { ok: true; recovered: boolean } | { ok: false; reason: string; detail?: Record<string, unknown> } {
  const file = deliveryFile(paths, prepared.void_delivery_tx_hash);
  const expected = deliveryIndexFor(prepared, reservation);
  const existingRaw = readJsonObject(file);
  if (existingRaw) {
    if (
      existingRaw.schema === expected.schema &&
      existingRaw.marker === expected.marker &&
      existingRaw.void_delivery_tx_hash === expected.void_delivery_tx_hash &&
      existingRaw.attempt_id === expected.attempt_id &&
      existingRaw.canonical_payment_identity === expected.canonical_payment_identity &&
      existingRaw.request_id === expected.request_id &&
      existingRaw.instruction_id === expected.instruction_id
    ) {
      return { ok: true, recovered: false };
    }
    return {
      ok: false,
      reason: "delivery_tx_already_reserved",
      detail: {
        void_delivery_tx_hash: prepared.void_delivery_tx_hash,
        existing_attempt_id: String(existingRaw.attempt_id || ""),
        attempted_attempt_id: reservation.attempt_id,
      },
    };
  }

  const created = atomicCreateJson(file, expected);
  if (created === "created") return { ok: true, recovered: true };
  return ensureDeliveryIndex(paths, prepared, reservation);
}

export function prepareBuyVoidExecutionTransactionV1(
  input: PrepareBuyVoidExecutionTransactionInputV1,
): BuyVoidExecutionAttemptMutationDecisionV1 {
  const found = stateForMutation(input?.root_dir, String(input?.attempt_id || ""));
  if ("reason" in found) return heldMutation(found.reason);
  const intentMismatch = validateIntentMatchesReservation(
    input.intent,
    found.state.reservation,
  );
  if (intentMismatch) return heldMutation(intentMismatch);
  const policyCheck = normalizePolicy(input.policy);
  if ("reason" in policyCheck) return heldMutation(policyCheck.reason);
  if (
    found.state.reservation.max_attempts_per_payment !== policyCheck.max_attempts
  ) {
    return heldMutation("execution_attempt_policy_changed");
  }
  if (found.state.failure || found.state.postbroadcast_failure) {
    return heldMutation("execution_attempt_already_failed");
  }
  if (found.state.broadcast) return heldMutation("execution_attempt_already_broadcast");
  if (found.state.confirmation) return heldMutation("execution_attempt_already_confirmed");

  const transactionHash = normalizeHash(input.transaction?.transaction_hash);
  if (!transactionHash) return heldMutation("invalid_void_delivery_tx_hash");
  if (
    transactionHash ===
    normalizeHash(found.state.reservation.unsigned_instruction.payment_transaction_hash)
  ) {
    return heldMutation("delivery_tx_matches_payment_tx");
  }
  const chainId = parseNonNegativeInteger(input.transaction?.chain_id);
  if (chainId === null || chainId.toString() !== policyCheck.chain_id) {
    return heldMutation("delivery_chain_mismatch");
  }
  const wallet = normalizeAddress(input.transaction?.from_address);
  if (!wallet || !policyCheck.wallet_allowlist.has(wallet)) {
    return heldMutation("fulfillment_wallet_not_allowlisted");
  }
  const deliveryAddress = normalizeAddress(input.transaction?.to_address);
  const expectedDeliveryAddress = normalizeAddress(
    found.state.reservation.unsigned_instruction.delivery_address,
  );
  if (!deliveryAddress || deliveryAddress !== expectedDeliveryAddress) {
    return heldMutation("delivery_address_mismatch");
  }
  const amount = parseNonNegativeInteger(input.transaction?.amount_units);
  const expectedAmount = parseNonNegativeInteger(
    found.state.reservation.unsigned_instruction.void_amount_units,
  );
  if (amount === null || expectedAmount === null || amount !== expectedAmount) {
    return heldMutation("void_delivery_amount_mismatch");
  }

  const prepared: BuyVoidExecutionPreparedTransactionV1 = {
    schema: "void_buy_void_execution_prepared_transaction_v1",
    marker: VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
    attempt_id: found.state.reservation.attempt_id,
    prepared_at_ms: safeNow(input.now_ms),
    chain_id: chainId.toString(),
    void_delivery_tx_hash: transactionHash,
    fulfillment_wallet: wallet,
    delivery_address: deliveryAddress,
    void_amount_units: amount.toString(),
    transaction_binding_fingerprint: stableFingerprint({
      attempt_id: found.state.reservation.attempt_id,
      chain_id: chainId.toString(),
      void_delivery_tx_hash: transactionHash,
      fulfillment_wallet: wallet,
      delivery_address: deliveryAddress,
      void_amount_units: amount.toString(),
    }),
    signed_transaction_persisted: false,
    raw_transaction_persisted: false,
    transaction_broadcast_performed_by_this_module: false,
  };

  try {
    const preparedPath = eventFile(
      found.paths,
      found.state.reservation.attempt_id,
      "prepared",
    );
    const existingPreparedRaw = readJsonObject(preparedPath);
    if (existingPreparedRaw) {
      const existing = parsePrepared(existingPreparedRaw);
      if (
        existing.transaction_binding_fingerprint !==
        prepared.transaction_binding_fingerprint
      ) {
        return heldMutation("execution_attempt_already_prepared", {
          existing_void_delivery_tx_hash: existing.void_delivery_tx_hash,
          attempted_void_delivery_tx_hash: transactionHash,
        });
      }
      const indexResult = ensureDeliveryIndex(
        found.paths,
        existing,
        found.state.reservation,
      );
      if ("reason" in indexResult) return heldMutation(indexResult.reason, indexResult.detail);
      const state = readAttemptState(found.paths, found.state.reservation.attempt_id);
      if (!state) return heldMutation("prepared_attempt_unreadable");
      return {
        ok: true,
        status: "duplicate",
        duplicate: true,
        recovered_delivery_index: indexResult.recovered,
        attempt: state,
      };
    }

    const created = atomicCreateJson(preparedPath, prepared);
    if (created === "exists") return prepareBuyVoidExecutionTransactionV1(input);

    const indexResult = ensureDeliveryIndex(
      found.paths,
      prepared,
      found.state.reservation,
    );
    if ("reason" in indexResult) {
      const failure: BuyVoidExecutionPrebroadcastFailureV1 = {
        schema: "void_buy_void_execution_prebroadcast_failure_v1",
        marker: VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
        attempt_id: found.state.reservation.attempt_id,
        failed_at_ms: safeNow(input.now_ms),
        failure_code: "delivery_tx_already_reserved",
        retryable: true,
        ...(indexResult.detail ? { detail: indexResult.detail } : {}),
        transaction_broadcast_observed: false,
      };
      atomicCreateJson(
        eventFile(found.paths, found.state.reservation.attempt_id, "failure"),
        failure,
      );
      return heldMutation(indexResult.reason, indexResult.detail);
    }

    const state = readAttemptState(found.paths, found.state.reservation.attempt_id);
    if (!state) return heldMutation("prepared_attempt_unreadable");
    return {
      ok: true,
      status: "recorded",
      duplicate: false,
      recovered_delivery_index: indexResult.recovered,
      attempt: state,
    };
  } catch (error) {
    return heldMutation("execution_transaction_prepare_failed", {
      message: String((error as Error)?.message || error),
    });
  }
}

export function recordBuyVoidExecutionBroadcastV1(
  input: RecordBuyVoidExecutionBroadcastInputV1,
): BuyVoidExecutionAttemptMutationDecisionV1 {
  const found = stateForMutation(input?.root_dir, String(input?.attempt_id || ""));
  if ("reason" in found) return heldMutation(found.reason);
  if (!found.state.prepared) return heldMutation("execution_attempt_not_prepared");
  if (found.state.failure || found.state.postbroadcast_failure) {
    return heldMutation("execution_attempt_already_failed");
  }
  if (found.state.confirmation) return heldMutation("execution_attempt_already_confirmed");
  const txHash = normalizeHash(input.transaction_hash);
  if (!txHash || txHash !== found.state.prepared.void_delivery_tx_hash) {
    return heldMutation("broadcast_transaction_hash_mismatch");
  }

  try {
    const indexResult = ensureDeliveryIndex(
      found.paths,
      found.state.prepared,
      found.state.reservation,
    );
    if ("reason" in indexResult) return heldMutation(indexResult.reason, indexResult.detail);

    const providerSubmissionId = String(input.provider_submission_id || "")
      .trim()
      .slice(0, 200);
    const record: BuyVoidExecutionBroadcastObservationV1 = {
      schema: "void_buy_void_execution_broadcast_observation_v1",
      marker: VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
      attempt_id: found.state.reservation.attempt_id,
      observed_at_ms: safeNow(input.now_ms),
      void_delivery_tx_hash: txHash,
      provider_submission_id: providerSubmissionId,
      external_broadcast_observed: true,
      transaction_broadcast_performed_by_this_module: false,
    };
    const file = eventFile(found.paths, found.state.reservation.attempt_id, "broadcast");
    const created = atomicCreateJson(file, record);
    if (created === "exists") {
      const existingRaw = readJsonObject(file);
      if (!existingRaw) return heldMutation("broadcast_record_unreadable");
      const existing = parseBroadcast(existingRaw);
      if (existing.void_delivery_tx_hash !== txHash) {
        return heldMutation("execution_attempt_broadcast_conflict");
      }
    }
    const state = readAttemptState(found.paths, found.state.reservation.attempt_id);
    if (!state) return heldMutation("broadcast_attempt_unreadable");
    return {
      ok: true,
      status: created === "created" ? "recorded" : "duplicate",
      duplicate: created === "exists",
      recovered_delivery_index: indexResult.recovered,
      attempt: state,
    };
  } catch (error) {
    return heldMutation("execution_broadcast_record_failed", {
      message: String((error as Error)?.message || error),
    });
  }
}

export function recordBuyVoidExecutionPrebroadcastFailureV1(
  input: RecordBuyVoidExecutionPrebroadcastFailureInputV1,
): BuyVoidExecutionAttemptMutationDecisionV1 {
  const found = stateForMutation(input?.root_dir, String(input?.attempt_id || ""));
  if ("reason" in found) return heldMutation(found.reason);
  if (found.state.broadcast) return heldMutation("cannot_fail_after_broadcast");
  if (found.state.confirmation) return heldMutation("execution_attempt_already_confirmed");
  const code = String(input.failure_code || "").trim();
  if (!SAFE_CODE.test(code)) return heldMutation("invalid_failure_code");

  const failure: BuyVoidExecutionPrebroadcastFailureV1 = {
    schema: "void_buy_void_execution_prebroadcast_failure_v1",
    marker: VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
    attempt_id: found.state.reservation.attempt_id,
    failed_at_ms: safeNow(input.now_ms),
    failure_code: code,
    retryable: input.retryable === true,
    ...(input.detail ? { detail: input.detail } : {}),
    transaction_broadcast_observed: false,
  };

  try {
    const file = eventFile(found.paths, found.state.reservation.attempt_id, "failure");
    const created = atomicCreateJson(file, failure);
    if (created === "exists") {
      const existingRaw = readJsonObject(file);
      if (!existingRaw) return heldMutation("failure_record_unreadable");
      const existing = parseFailure(existingRaw);
      if (
        existing.failure_code !== failure.failure_code ||
        existing.retryable !== failure.retryable
      ) {
        return heldMutation("execution_attempt_failure_conflict");
      }
    }
    const state = readAttemptState(found.paths, found.state.reservation.attempt_id);
    if (!state) return heldMutation("failed_attempt_unreadable");
    return {
      ok: true,
      status: created === "created" ? "recorded" : "duplicate",
      duplicate: created === "exists",
      recovered_delivery_index: false,
      attempt: state,
    };
  } catch (error) {
    return heldMutation("execution_failure_record_failed", {
      message: String((error as Error)?.message || error),
    });
  }
}

export function recordBuyVoidExecutionPostbroadcastFailureV1(
  input: RecordBuyVoidExecutionPostbroadcastFailureInputV1,
): BuyVoidExecutionAttemptMutationDecisionV1 {
  const found = stateForMutation(input?.root_dir, String(input?.attempt_id || ""));
  if ("reason" in found) return heldMutation(found.reason);
  if (!found.state.prepared || !found.state.broadcast) {
    return heldMutation("execution_attempt_not_broadcast");
  }
  if (found.state.failure) return heldMutation("execution_attempt_already_failed");
  if (found.state.confirmation) {
    return heldMutation("execution_attempt_already_confirmed");
  }

  const outcome = input?.outcome;
  if (
    !outcome ||
    outcome.schema !== "void_buy_void_broadcast_reverted_record_v1" ||
    outcome.marker !== "VOID_BUY_VOID_BROADCAST_OUTCOME_JOURNAL_V1" ||
    outcome.attempt_id !== found.state.reservation.attempt_id ||
    outcome.definitive_revert !== true ||
    outcome.retry_allowed !== true ||
    outcome.reconciliation_required !== false ||
    outcome.transaction_status !== 0
  ) {
    return heldMutation("invalid_definitive_revert_outcome");
  }

  const txHash = normalizeHash(outcome.void_delivery_tx_hash);
  if (
    !txHash ||
    txHash !== found.state.prepared.void_delivery_tx_hash ||
    txHash !== found.state.broadcast.void_delivery_tx_hash
  ) {
    return heldMutation("definitive_revert_transaction_hash_mismatch");
  }

  const blockNumber = parseNonNegativeInteger(outcome.block_number);
  const confirmationCount = parseNonNegativeInteger(outcome.confirmation_count);
  const requiredConfirmations = parseNonNegativeInteger(
    outcome.min_revert_confirmations,
  );
  if (
    blockNumber === null ||
    blockNumber <= 0n ||
    confirmationCount === null ||
    requiredConfirmations === null ||
    requiredConfirmations <= 0n ||
    confirmationCount < requiredConfirmations
  ) {
    return heldMutation("invalid_definitive_revert_confirmation");
  }

  const failure: BuyVoidExecutionPostbroadcastFailureV1 = {
    schema: "void_buy_void_execution_postbroadcast_failure_v1",
    marker: VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
    attempt_id: found.state.reservation.attempt_id,
    failed_at_ms: safeNow(input.now_ms),
    failure_code: "delivery_transaction_reverted",
    retryable: true,
    void_delivery_tx_hash: txHash,
    broadcast_outcome_marker: "VOID_BUY_VOID_BROADCAST_OUTCOME_JOURNAL_V1",
    broadcast_outcome_recorded_at_ms: outcome.recorded_at_ms,
    revert_block_number: blockNumber.toString(),
    revert_confirmation_count: confirmationCount.toString(),
    definitive_revert: true,
    transaction_broadcast_observed: true,
  };

  try {
    const file = eventFile(
      found.paths,
      found.state.reservation.attempt_id,
      "postbroadcast-failure",
    );
    const created = atomicCreateJson(file, failure);
    if (created === "exists") {
      const existingRaw = readJsonObject(file);
      if (!existingRaw) {
        return heldMutation("postbroadcast_failure_record_unreadable");
      }
      const existing = parsePostbroadcastFailure(existingRaw);
      if (
        existing.void_delivery_tx_hash !== failure.void_delivery_tx_hash ||
        existing.broadcast_outcome_recorded_at_ms !==
          failure.broadcast_outcome_recorded_at_ms ||
        existing.revert_block_number !== failure.revert_block_number ||
        existing.revert_confirmation_count !==
          failure.revert_confirmation_count
      ) {
        return heldMutation("execution_postbroadcast_failure_conflict");
      }
    }

    const state = readAttemptState(
      found.paths,
      found.state.reservation.attempt_id,
    );
    if (!state) return heldMutation("postbroadcast_failed_attempt_unreadable");
    return {
      ok: true,
      status: created === "created" ? "recorded" : "duplicate",
      duplicate: created === "exists",
      recovered_delivery_index: false,
      attempt: state,
    };
  } catch (error) {
    return heldMutation("execution_postbroadcast_failure_record_failed", {
      message: String((error as Error)?.message || error),
    });
  }
}

function confirmationFingerprint(record: BuyVoidConfirmedFulfillmentRecordV1): string {
  return stableFingerprint({
    marker: String(record.marker || ""),
    canonical_payment_identity: String(record.canonical_payment_identity || ""),
    request_id: String(record.request_id || ""),
    instruction_id: String(record.instruction_id || ""),
    void_delivery_tx_hash: String(record.void_delivery_tx_hash || ""),
    fulfillment_wallet: String(record.fulfillment_wallet || ""),
    delivery_address: String(record.delivery_address || ""),
    void_amount_units: String(record.void_amount_units || ""),
  });
}

export function recordBuyVoidExecutionConfirmedV1(
  input: RecordBuyVoidExecutionConfirmedInputV1,
): BuyVoidExecutionAttemptMutationDecisionV1 {
  const found = stateForMutation(input?.root_dir, String(input?.attempt_id || ""));
  if ("reason" in found) return heldMutation(found.reason);
  if (!found.state.prepared || !found.state.broadcast) {
    return heldMutation("execution_attempt_not_broadcast");
  }
  if (found.state.failure || found.state.postbroadcast_failure) {
    return heldMutation("execution_attempt_already_failed");
  }

  const record = input.confirmed_record;
  if (
    !record ||
    record.marker !== VOID_BUY_VOID_FULFILLMENT_CONFIRMATION_V1 ||
    record.status !== "fulfilled_confirmed" ||
    record.buyer_fulfilled !== true ||
    record.automatic_fulfillment_completed !== true
  ) {
    return heldMutation("invalid_confirmed_fulfillment_record");
  }
  if (
    record.canonical_payment_identity !==
      found.state.reservation.canonical_payment_identity ||
    record.request_id !== found.state.reservation.request_id ||
    record.instruction_id !== found.state.reservation.instruction_id ||
    normalizeHash(record.void_delivery_tx_hash) !==
      found.state.prepared.void_delivery_tx_hash ||
    normalizeAddress(record.fulfillment_wallet) !==
      found.state.prepared.fulfillment_wallet ||
    normalizeAddress(record.delivery_address) !==
      found.state.prepared.delivery_address ||
    String(record.void_amount_units || "") !==
      found.state.prepared.void_amount_units
  ) {
    return heldMutation("confirmed_record_attempt_mismatch");
  }

  const confirmation: BuyVoidExecutionAttemptConfirmationV1 = {
    schema: "void_buy_void_execution_attempt_confirmation_v1",
    marker: VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
    attempt_id: found.state.reservation.attempt_id,
    confirmed_at_ms: safeNow(input.now_ms),
    void_delivery_tx_hash: found.state.prepared.void_delivery_tx_hash,
    confirmation_fingerprint: confirmationFingerprint(record),
    confirmed_record: record,
  };

  try {
    const file = eventFile(found.paths, found.state.reservation.attempt_id, "confirmed");
    const created = atomicCreateJson(file, confirmation);
    if (created === "exists") {
      const existingRaw = readJsonObject(file);
      if (!existingRaw) return heldMutation("confirmation_record_unreadable");
      const existing = parseConfirmation(existingRaw);
      if (existing.confirmation_fingerprint !== confirmation.confirmation_fingerprint) {
        return heldMutation("execution_attempt_confirmation_conflict");
      }
    }
    const state = readAttemptState(found.paths, found.state.reservation.attempt_id);
    if (!state) return heldMutation("confirmed_attempt_unreadable");
    return {
      ok: true,
      status: created === "created" ? "recorded" : "duplicate",
      duplicate: created === "exists",
      recovered_delivery_index: false,
      attempt: state,
    };
  } catch (error) {
    return heldMutation("execution_confirmation_record_failed", {
      message: String((error as Error)?.message || error),
    });
  }
}
