import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { TextDecoder } from "node:util";

import {
  VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1,
  buyVoidFulfillmentJournalPathsV1,
  type BuyVoidFulfillmentJournalIntentV1,
} from "./buy_void_fulfillment_journal_v1.js";
import {
  VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1,
  VOID_BUY_VOID_PAID_UNRESERVABLE_OBLIGATION_V1,
  buyVoidInventoryReservationJournalPathsV1,
  type BuyVoidInventoryReservationV1,
  type BuyVoidPaidUnreservableObligationV1,
} from "./buy_void_inventory_reservation_journal_v1.js";
import {
  VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
  buyVoidExecutionAttemptIntentFingerprintV1,
  buyVoidExecutionAttemptJournalPathsV1,
  type BuyVoidExecutionAttemptStateV1,
  type BuyVoidExecutionAttemptReservationV1,
  type BuyVoidExecutionPreparedTransactionV1,
  type BuyVoidExecutionBroadcastObservationV1,
  type BuyVoidExecutionPrebroadcastFailureV1,
  type BuyVoidExecutionPostbroadcastFailureV1,
  type BuyVoidExecutionAttemptConfirmationV1,
} from "./buy_void_execution_attempt_journal_v1.js";
import {
  VOID_BUY_VOID_CONFIRMED_CLOSEOUT_V1,
  type BuyVoidInventoryConsumptionRecordV1,
} from "./buy_void_confirmed_closeout_v1.js";
import {
  buyVoidPaymentKeyedInventoryIntentFingerprintV1,
} from "./buy_void_payment_keyed_history_reconciliation_v1.js";

export const VOID_BUY_VOID_PAYMENT_HISTORY_PROJECTION_V1 =
  "VOID_BUY_VOID_PAYMENT_HISTORY_PROJECTION_V1";

export const VOID_BUY_VOID_PAYMENT_HISTORY_PROJECTION_MAX_ATTEMPT_SLOTS_V1 =
  10;

export const VOID_BUY_VOID_PAYMENT_HISTORY_PROJECTION_MAX_JSON_BYTES_V1 =
  1024 * 1024;

export const VOID_BUY_VOID_PAYMENT_HISTORY_PROJECTION_AUTHORITY_V1 = {
  bounded_per_payment_projection: true,
  full_history_scan: false,
  payment_intent_direct_read: true,
  deterministic_primary_record_direct_read: true,
  exact_intent_record_digest_bound: true,
  canonical_payment_identity_hash_recomputed: true,
  full_attempt_state_fingerprint_bound: true,
  prepared_delivery_identity_revalidated: true,
  prepared_transaction_binding_fingerprint_recomputed: true,
  confirmation_payment_delivery_identity_revalidated: true,
  delivery_binding_fingerprint_recomputed: true,
  execution_confirmation_fingerprint_recomputed: true,
  deterministic_attempt_slot_reads: true,
  bounded_attempt_event_reads: true,
  legacy_unbounded_attempt_reader_used: false,
  max_attempt_slots_checked:
    VOID_BUY_VOID_PAYMENT_HISTORY_PROJECTION_MAX_ATTEMPT_SLOTS_V1,
  inventory_closeout_direct_read: true,
  closeout_consumption_fingerprint_recomputed: true,
  exact_closeout_record_digest_bound: true,
  inventory_consumption_closeout_state_bound: true,
  public_closeout_completion_bound: false,
  saga_closed_state_bound: false,
  filesystem_read: true,
  filesystem_write: false,
  process_environment_read: false,
  rpc_call: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  automatic_retry: false,
  runtime_activation: false,
  public_activation: false,
  money_movement: false,
} as const;

const SHA256 = /^[0-9a-f]{64}$/;
const TX_HASH = /^0x[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const SAFE_CODE = /^[A-Za-z0-9._:-]{1,160}$/;
const FATAL_UTF8 = new TextDecoder("utf-8", { fatal: true });

type DirectReadV1 = {
  value: Record<string, any>;
  bytes: Buffer;
  sha256: string;
};

export type BuyVoidPaymentHistoryAttemptProjectionV1 = {
  attempt_id: string;
  attempt_number: number;
  max_attempts_per_payment: number;
  status: BuyVoidExecutionAttemptStateV1["status"];
  attempt_state_fingerprint_sha256: string;
  prepared_transaction_hash: string | null;
  broadcast_transaction_hash: string | null;
  prebroadcast_failure_code: string | null;
  postbroadcast_failure_transaction_hash: string | null;
  confirmation_transaction_hash: string | null;
};

export type BuyVoidPaymentHistoryCloseoutProjectionV1 = {
  consumption_id: string;
  consumption_fingerprint_sha256: string;
  closeout_record_sha256: string;
  execution_attempt_id: string;
  void_delivery_tx_hash: string;
  consumed_void_units: string;
};

export type BuyVoidPaymentHistoryProjectionV1 = {
  marker: typeof VOID_BUY_VOID_PAYMENT_HISTORY_PROJECTION_V1;
  version: 1;
  pool_id: string;
  payment_key_sha256: string;
  request_key_sha256: string;
  canonical_payment_identity: string;
  request_id: string;
  instruction_id: string;
  delivery_address: string;
  void_amount_units: string;
  intent_record_sha256: string;
  primary_kind:
    | "reservation"
    | "paid_unreservable_obligation";
  primary_record_id: string;
  primary_record_sha256: string;
  primary_record:
    | BuyVoidInventoryReservationV1
    | BuyVoidPaidUnreservableObligationV1;
  attempt_slots_checked:
    typeof VOID_BUY_VOID_PAYMENT_HISTORY_PROJECTION_MAX_ATTEMPT_SLOTS_V1;
  attempt_count: number;
  attempts: BuyVoidPaymentHistoryAttemptProjectionV1[];
  closeout: BuyVoidPaymentHistoryCloseoutProjectionV1 | null;
  lifecycle_state:
    | "paid_unreservable_obligation"
    | "reserved"
    | "attempt_reserved"
    | "prepared"
    | "broadcast"
    | "failed_retryable"
    | "failed_terminal"
    | "confirmed_pending_closeout"
    | "inventory_consumed";
  payment_history_fingerprint_sha256: string;
  authority:
    typeof VOID_BUY_VOID_PAYMENT_HISTORY_PROJECTION_AUTHORITY_V1;
};

function fail(code: string, detail: string): never {
  throw new Error(
    VOID_BUY_VOID_PAYMENT_HISTORY_PROJECTION_V1 +
      ":" +
      code +
      ":" +
      detail,
  );
}

function sha256(value: Buffer | string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function keyValueFingerprint(
  parts: Record<string, string>,
): string {
  return sha256(
    Object.keys(parts)
      .sort()
      .map((key) => key + "=" + parts[key])
      .join("\n"),
  );
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return "[" + value.map(stableJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(record)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key) +
            ":" +
            stableJson(record[key]),
        )
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(value) ?? "null";
}

function text(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : String(value ?? "").trim();
}

function address(value: unknown): string {
  const normalized = text(value).toLowerCase();
  return ADDRESS.test(normalized) ? normalized : "";
}

function positive(value: unknown): string {
  const raw = text(value);
  if (!/^[1-9][0-9]*$/.test(raw)) {
    fail("INVALID_POSITIVE_INTEGER", raw || "empty");
  }
  return raw;
}

function safeRoot(value: unknown): string {
  const raw = text(value);
  if (
    !raw ||
    raw.includes("\0") ||
    !path.isAbsolute(raw)
  ) {
    fail("INVALID_RUNTIME_ROOT", raw || "empty");
  }
  const resolved = path.resolve(raw);
  if (resolved === path.parse(resolved).root) {
    fail("INVALID_RUNTIME_ROOT", resolved);
  }
  return resolved;
}

function readBoundedJson(
  file: string,
  required: boolean,
): DirectReadV1 | null {
  let fd: number | null = null;
  try {
    fd = fs.openSync(
      file,
      fs.constants.O_RDONLY |
        ((fs.constants as any).O_NOFOLLOW || 0),
    );
  } catch (error) {
    if (
      !required &&
      (error as NodeJS.ErrnoException)?.code === "ENOENT"
    ) {
      return null;
    }
    fail(
      "JSON_OPEN_FAILED",
      file +
        ":" +
        text((error as Error)?.message || error).slice(0, 160),
    );
  }

  try {
    const before = fs.fstatSync(fd, { bigint: true });
    if (
      !before.isFile() ||
      before.size <= 0n ||
      before.size >
        BigInt(
          VOID_BUY_VOID_PAYMENT_HISTORY_PROJECTION_MAX_JSON_BYTES_V1,
        )
    ) {
      fail(
        "JSON_FILE_SHAPE_INVALID",
        file + ":" + String(before.size),
      );
    }
    const bytes = fs.readFileSync(fd);
    const after = fs.fstatSync(fd, { bigint: true });
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeNs !== after.mtimeNs ||
      before.ctimeNs !== after.ctimeNs ||
      BigInt(bytes.length) !== before.size
    ) {
      fail("JSON_FILE_CHANGED_DURING_READ", file);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(FATAL_UTF8.decode(bytes));
    } catch {
      fail("JSON_PARSE_FAILED", file);
    }
    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      fail("JSON_OBJECT_REQUIRED", file);
    }
    return {
      value: parsed as Record<string, any>,
      bytes,
      sha256: sha256(bytes),
    };
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
}

function requireSha256(value: unknown, code: string): string {
  const raw = text(value).toLowerCase();
  if (!SHA256.test(raw)) fail(code, raw || "empty");
  return raw;
}

function validateIntent(
  raw: Record<string, any>,
  paymentKey: string,
): BuyVoidFulfillmentJournalIntentV1 {
  if (
    raw.schema !==
      "void_buy_void_fulfillment_journal_intent_v1" ||
    raw.marker !== VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1 ||
    raw.signing_authorized !== false ||
    raw.transaction_broadcast_authorized !== false ||
    raw.money_movement_authorized !== false
  ) {
    fail("INTENT_SHAPE_INVALID", paymentKey);
  }
  const claim = raw.claim;
  const instruction = claim?.unsigned_instruction;
  if (
    claim?.schema !==
      "void_buy_void_fulfillment_claim_v1" ||
    claim?.status !== "claimed" ||
    instruction?.schema !==
      "void_buy_void_unsigned_fulfillment_instruction_v1"
  ) {
    fail("INTENT_CLAIM_INVALID", paymentKey);
  }

  const canonicalIdentity =
    text(claim.canonical_payment_identity);
  const requestId = text(claim.request_id);
  const instructionId = text(claim.instruction_id);
  const requestKey =
    requireSha256(
      raw.request_key_sha256,
      "REQUEST_KEY_INVALID",
    );
  if (
    requireSha256(
      raw.payment_key_sha256,
      "PAYMENT_KEY_INVALID",
    ) !== paymentKey ||
    !canonicalIdentity ||
    !SAFE_CODE.test(requestId) ||
    !SAFE_CODE.test(instructionId) ||
    requestKey !==
      sha256("void-buy-request-v1\n" + requestId) ||
    paymentKey !==
      sha256(
        "void-buy-payment-v1\n" +
          canonicalIdentity,
      ) ||
    text(claim.canonical_payment_identity_sha256) !==
      sha256(canonicalIdentity) ||
    text(instruction.canonical_payment_identity) !==
      canonicalIdentity ||
    text(instruction.request_id) !== requestId ||
    text(instruction.instruction_id) !== instructionId ||
    !address(instruction.delivery_address) ||
    instruction.signing_authorized !== false ||
    instruction.transaction_broadcast_authorized !== false ||
    instruction.automatic_execution_authorized !== false
  ) {
    fail("INTENT_IDENTITY_INVALID", paymentKey);
  }
  positive(instruction.void_amount_units);

  const binding = raw.verification_binding;
  if (
    !binding ||
    text(binding.source_chain) !==
      text(instruction.source_chain) ||
    text(binding.payment_transaction_hash).toLowerCase() !==
      text(instruction.payment_transaction_hash).toLowerCase() ||
    text(binding.payment_log_index) !==
      text(instruction.payment_log_index) ||
    address(binding.delivery_address) !==
      address(instruction.delivery_address) ||
    text(binding.quoted_void_units) !==
      text(instruction.void_amount_units)
  ) {
    fail("INTENT_VERIFICATION_BINDING_INVALID", paymentKey);
  }

  return raw as BuyVoidFulfillmentJournalIntentV1;
}

function poolKey(poolId: string): string {
  return sha256(
    "void-buy-inventory-pool-v1\n" + poolId,
  );
}

function reservationId(
  poolId: string,
  intent: BuyVoidFulfillmentJournalIntentV1,
): string {
  return sha256(
    [
      "void-buy-inventory-reservation-v1",
      poolKey(poolId),
      intent.payment_key_sha256,
      intent.claim.instruction_id,
    ].join("\n"),
  );
}

function obligationId(
  poolId: string,
  intent: BuyVoidFulfillmentJournalIntentV1,
): string {
  return sha256(
    [
      "void-buy-paid-unreservable-obligation-v1",
      poolKey(poolId),
      intent.payment_key_sha256,
      intent.request_key_sha256,
      intent.claim.instruction_id,
    ].join("\n"),
  );
}

function validateReservation(
  raw: Record<string, any>,
  expectedId: string,
  poolId: string,
  intent: BuyVoidFulfillmentJournalIntentV1,
): BuyVoidInventoryReservationV1 {
  const instruction = intent.claim.unsigned_instruction;
  if (
    raw.schema !==
      "void_buy_void_inventory_reservation_v1" ||
    raw.marker !==
      VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1 ||
    text(raw.reservation_id) !== expectedId ||
    text(raw.pool_id) !== poolId ||
    text(raw.payment_key_sha256) !==
      intent.payment_key_sha256 ||
    text(raw.request_key_sha256) !==
      intent.request_key_sha256 ||
    text(raw.canonical_payment_identity) !==
      intent.claim.canonical_payment_identity ||
    text(raw.request_id) !== intent.claim.request_id ||
    text(raw.instruction_id) !==
      intent.claim.instruction_id ||
    address(raw.delivery_address) !==
      address(instruction.delivery_address) ||
    text(raw.reserved_void_units) !==
      text(instruction.void_amount_units) ||
    text(raw.intent_fingerprint) !==
      buyVoidPaymentKeyedInventoryIntentFingerprintV1(
        intent,
      ) ||
    raw.reservation_status !== "reserved" ||
    raw.inventory_decrement_performed !== false ||
    raw.reservation_release_authorized !== false ||
    raw.execution_authorized_by_this_module !== false ||
    raw.signing_authorized_by_this_module !== false ||
    raw.transaction_broadcast_authorized_by_this_module !== false ||
    raw.money_movement_authorized_by_this_module !== false
  ) {
    fail("RESERVATION_IDENTITY_INVALID", expectedId);
  }
  positive(raw.reserved_void_units);
  return raw as BuyVoidInventoryReservationV1;
}

function validateObligation(
  raw: Record<string, any>,
  expectedId: string,
  poolId: string,
  intent: BuyVoidFulfillmentJournalIntentV1,
): BuyVoidPaidUnreservableObligationV1 {
  const instruction = intent.claim.unsigned_instruction;
  const binding = intent.verification_binding;
  if (
    raw.schema !==
      "void_buy_void_paid_unreservable_obligation_v1" ||
    raw.marker !==
      VOID_BUY_VOID_PAID_UNRESERVABLE_OBLIGATION_V1 ||
    text(raw.obligation_id) !== expectedId ||
    text(raw.pool_id) !== poolId ||
    text(raw.payment_key_sha256) !==
      intent.payment_key_sha256 ||
    text(raw.request_key_sha256) !==
      intent.request_key_sha256 ||
    text(raw.canonical_payment_identity) !==
      intent.claim.canonical_payment_identity ||
    text(raw.request_id) !== intent.claim.request_id ||
    text(raw.instruction_id) !==
      intent.claim.instruction_id ||
    address(raw.delivery_address) !==
      address(instruction.delivery_address) ||
    text(raw.requested_void_units) !==
      text(instruction.void_amount_units) ||
    text(raw.source_chain) !==
      text(binding.source_chain) ||
    text(raw.payment_transaction_hash).toLowerCase() !==
      text(binding.payment_transaction_hash).toLowerCase() ||
    text(raw.payment_log_index) !==
      text(binding.payment_log_index) ||
    text(raw.confirmed_block_number) !==
      text(binding.confirmed_block_number) ||
    text(raw.confirmation_count_at_claim) !==
      text(binding.confirmation_count_at_claim) ||
    text(raw.payment_usdc_units) !==
      text(binding.payment_usdc_units) ||
    raw.terminal_state !==
      "operator_reconciliation_required" ||
    raw.customer_payment_confirmed !== true ||
    raw.reservation_created !== false ||
    raw.automatic_retry !== false ||
    raw.refund_execution_authorized !== false ||
    raw.alternate_fulfillment_execution_authorized !== false ||
    raw.wallet_access_authorized !== false ||
    raw.signing_authorized !== false ||
    raw.transaction_broadcast_authorized !== false ||
    raw.money_movement_authorized !== false
  ) {
    fail("OBLIGATION_IDENTITY_INVALID", expectedId);
  }
  positive(raw.requested_void_units);
  return raw as BuyVoidPaidUnreservableObligationV1;
}

function expectedAttemptId(
  intent: BuyVoidFulfillmentJournalIntentV1,
  attemptNumber: number,
): string {
  return sha256(
    [
      "void-buy-execution-attempt-v1",
      intent.payment_key_sha256,
      intent.claim.instruction_id,
      String(attemptNumber),
    ].join("\n"),
  );
}

function nonNegativeIntegerText(value: unknown): boolean {
  const raw = text(value).toLowerCase();
  if (!raw) return false;
  try {
    if (/^[0-9]+$/.test(raw) || /^0x[0-9a-f]+$/.test(raw)) {
      return BigInt(raw) >= 0n;
    }
  } catch {
    return false;
  }
  return false;
}

function boundedAttemptEvent(
  rootDir: string,
  attemptId: string,
  event:
    | "reserved"
    | "prepared"
    | "broadcast"
    | "failure"
    | "postbroadcast-failure"
    | "confirmed",
  required: boolean,
): Record<string, any> | null {
  const paths = buyVoidExecutionAttemptJournalPathsV1(rootDir);
  const file = path.join(
    paths.attempts_dir,
    attemptId,
    event + ".json",
  );
  return readBoundedJson(file, required)?.value ?? null;
}

function readBoundedAttemptState(
  rootDir: string,
  attemptId: string,
): BuyVoidExecutionAttemptStateV1 | null {
  const reservedRaw =
    boundedAttemptEvent(rootDir, attemptId, "reserved", false);
  if (!reservedRaw) return null;

  if (
    reservedRaw.schema !==
      "void_buy_void_execution_attempt_reservation_v1" ||
    reservedRaw.marker !==
      VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1 ||
    text(reservedRaw.attempt_id) !== attemptId ||
    !Number.isSafeInteger(reservedRaw.attempt_number) ||
    reservedRaw.attempt_number < 1 ||
    !SHA256.test(text(reservedRaw.payment_key_sha256)) ||
    !SHA256.test(text(reservedRaw.request_key_sha256)) ||
    !SHA256.test(text(reservedRaw.intent_fingerprint)) ||
    !SAFE_CODE.test(text(reservedRaw.instruction_id))
  ) {
    fail("ATTEMPT_RESERVATION_INVALID", attemptId);
  }
  const reservation =
    reservedRaw as BuyVoidExecutionAttemptReservationV1;

  const preparedRaw =
    boundedAttemptEvent(rootDir, attemptId, "prepared", false);
  const broadcastRaw =
    boundedAttemptEvent(rootDir, attemptId, "broadcast", false);
  const failureRaw =
    boundedAttemptEvent(rootDir, attemptId, "failure", false);
  const postbroadcastFailureRaw =
    boundedAttemptEvent(
      rootDir,
      attemptId,
      "postbroadcast-failure",
      false,
    );
  const confirmedRaw =
    boundedAttemptEvent(rootDir, attemptId, "confirmed", false);

  if (
    preparedRaw &&
    (
      preparedRaw.schema !==
        "void_buy_void_execution_prepared_transaction_v1" ||
      preparedRaw.marker !==
        VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1 ||
      text(preparedRaw.attempt_id) !== attemptId ||
      !TX_HASH.test(text(preparedRaw.void_delivery_tx_hash).toLowerCase()) ||
      !address(preparedRaw.fulfillment_wallet) ||
      !address(preparedRaw.delivery_address) ||
      !nonNegativeIntegerText(preparedRaw.void_amount_units)
    )
  ) {
    fail("ATTEMPT_PREPARED_INVALID", attemptId);
  }
  const prepared =
    preparedRaw as BuyVoidExecutionPreparedTransactionV1 | null;

  if (
    broadcastRaw &&
    (
      broadcastRaw.schema !==
        "void_buy_void_execution_broadcast_observation_v1" ||
      broadcastRaw.marker !==
        VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1 ||
      text(broadcastRaw.attempt_id) !== attemptId ||
      !TX_HASH.test(text(broadcastRaw.void_delivery_tx_hash).toLowerCase()) ||
      broadcastRaw.external_broadcast_observed !== true
    )
  ) {
    fail("ATTEMPT_BROADCAST_INVALID", attemptId);
  }
  const broadcast =
    broadcastRaw as BuyVoidExecutionBroadcastObservationV1 | null;

  if (
    failureRaw &&
    (
      failureRaw.schema !==
        "void_buy_void_execution_prebroadcast_failure_v1" ||
      failureRaw.marker !==
        VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1 ||
      text(failureRaw.attempt_id) !== attemptId ||
      !SAFE_CODE.test(text(failureRaw.failure_code)) ||
      typeof failureRaw.retryable !== "boolean"
    )
  ) {
    fail("ATTEMPT_FAILURE_INVALID", attemptId);
  }
  const failure =
    failureRaw as BuyVoidExecutionPrebroadcastFailureV1 | null;

  if (
    postbroadcastFailureRaw &&
    (
      postbroadcastFailureRaw.schema !==
        "void_buy_void_execution_postbroadcast_failure_v1" ||
      postbroadcastFailureRaw.marker !==
        VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1 ||
      text(postbroadcastFailureRaw.attempt_id) !== attemptId ||
      postbroadcastFailureRaw.failure_code !==
        "delivery_transaction_reverted" ||
      postbroadcastFailureRaw.retryable !== true ||
      !TX_HASH.test(
        text(postbroadcastFailureRaw.void_delivery_tx_hash).toLowerCase(),
      ) ||
      postbroadcastFailureRaw.broadcast_outcome_marker !==
        "VOID_BUY_VOID_BROADCAST_OUTCOME_JOURNAL_V1" ||
      !Number.isSafeInteger(
        postbroadcastFailureRaw.broadcast_outcome_recorded_at_ms,
      ) ||
      postbroadcastFailureRaw.broadcast_outcome_recorded_at_ms < 0 ||
      !nonNegativeIntegerText(
        postbroadcastFailureRaw.revert_block_number,
      ) ||
      !nonNegativeIntegerText(
        postbroadcastFailureRaw.revert_confirmation_count,
      ) ||
      postbroadcastFailureRaw.definitive_revert !== true ||
      postbroadcastFailureRaw.transaction_broadcast_observed !== true
    )
  ) {
    fail("ATTEMPT_POSTBROADCAST_FAILURE_INVALID", attemptId);
  }
  const postbroadcastFailure =
    postbroadcastFailureRaw as
      BuyVoidExecutionPostbroadcastFailureV1 | null;

  if (
    confirmedRaw &&
    (
      confirmedRaw.schema !==
        "void_buy_void_execution_attempt_confirmation_v1" ||
      confirmedRaw.marker !==
        VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1 ||
      text(confirmedRaw.attempt_id) !== attemptId ||
      !TX_HASH.test(text(confirmedRaw.void_delivery_tx_hash).toLowerCase()) ||
      (
        confirmedRaw.delivery_block_hash !== undefined &&
        !TX_HASH.test(text(confirmedRaw.delivery_block_hash).toLowerCase())
      ) ||
      !SHA256.test(text(confirmedRaw.confirmation_fingerprint))
    )
  ) {
    fail("ATTEMPT_CONFIRMATION_INVALID", attemptId);
  }
  const confirmation =
    confirmedRaw as BuyVoidExecutionAttemptConfirmationV1 | null;

  if (broadcast && !prepared) {
    fail("ATTEMPT_BROADCAST_WITHOUT_PREPARE", attemptId);
  }
  if (failure && broadcast) {
    fail("ATTEMPT_FAILURE_AFTER_BROADCAST", attemptId);
  }
  if (postbroadcastFailure && !broadcast) {
    fail("ATTEMPT_POSTBROADCAST_FAILURE_WITHOUT_BROADCAST", attemptId);
  }
  if (failure && postbroadcastFailure) {
    fail("ATTEMPT_FAILURE_KIND_CONFLICT", attemptId);
  }
  if (confirmation && !broadcast) {
    fail("ATTEMPT_CONFIRMATION_WITHOUT_BROADCAST", attemptId);
  }
  if ((failure || postbroadcastFailure) && confirmation) {
    fail("ATTEMPT_FAILURE_CONFIRMATION_CONFLICT", attemptId);
  }
  if (
    prepared &&
    broadcast &&
    prepared.void_delivery_tx_hash !== broadcast.void_delivery_tx_hash
  ) {
    fail("ATTEMPT_BROADCAST_TX_MISMATCH", attemptId);
  }
  if (
    prepared &&
    postbroadcastFailure &&
    prepared.void_delivery_tx_hash !==
      postbroadcastFailure.void_delivery_tx_hash
  ) {
    fail("ATTEMPT_POSTBROADCAST_FAILURE_TX_MISMATCH", attemptId);
  }
  if (
    prepared &&
    confirmation &&
    prepared.void_delivery_tx_hash !==
      confirmation.void_delivery_tx_hash
  ) {
    fail("ATTEMPT_CONFIRMATION_TX_MISMATCH", attemptId);
  }

  let status: BuyVoidExecutionAttemptStateV1["status"] = "reserved";
  if (prepared) status = "prepared";
  if (broadcast) status = "broadcast";
  if (failure) {
    status = failure.retryable
      ? "failed_retryable"
      : "failed_terminal";
  }
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

function attemptProjection(
  state: BuyVoidExecutionAttemptStateV1,
  intent: BuyVoidFulfillmentJournalIntentV1,
  attemptNumber: number,
): BuyVoidPaymentHistoryAttemptProjectionV1 {
  const reservation = state.reservation;
  const instruction = intent.claim.unsigned_instruction;
  if (
    reservation.attempt_id !==
      expectedAttemptId(intent, attemptNumber) ||
    reservation.attempt_number !== attemptNumber ||
    reservation.max_attempts_per_payment < attemptNumber ||
    reservation.max_attempts_per_payment >
      VOID_BUY_VOID_PAYMENT_HISTORY_PROJECTION_MAX_ATTEMPT_SLOTS_V1 ||
    reservation.payment_key_sha256 !==
      intent.payment_key_sha256 ||
    reservation.request_key_sha256 !==
      intent.request_key_sha256 ||
    reservation.canonical_payment_identity !==
      intent.claim.canonical_payment_identity ||
    reservation.request_id !== intent.claim.request_id ||
    reservation.instruction_id !==
      intent.claim.instruction_id ||
    reservation.intent_fingerprint !==
      buyVoidExecutionAttemptIntentFingerprintV1(
        intent,
      ) ||
    address(
      reservation.unsigned_instruction?.delivery_address,
    ) !== address(instruction.delivery_address) ||
    text(
      reservation.unsigned_instruction?.void_amount_units,
    ) !== text(instruction.void_amount_units)
  ) {
    fail(
      "ATTEMPT_IDENTITY_INVALID",
      reservation.attempt_id,
    );
  }

  if (
    state.prepared &&
    (
      text(state.prepared.chain_id) !== "2050" ||
      address(state.prepared.delivery_address) !==
        address(instruction.delivery_address) ||
      text(state.prepared.void_amount_units) !==
        text(instruction.void_amount_units) ||
      state.prepared.transaction_binding_fingerprint !==
        keyValueFingerprint({
          attempt_id: reservation.attempt_id,
          chain_id: text(state.prepared.chain_id),
          void_delivery_tx_hash:
            text(state.prepared.void_delivery_tx_hash).toLowerCase(),
          fulfillment_wallet:
            address(state.prepared.fulfillment_wallet),
          delivery_address:
            address(state.prepared.delivery_address),
          void_amount_units:
            text(state.prepared.void_amount_units),
        })
    )
  ) {
    fail(
      "ATTEMPT_PREPARED_BINDING_INVALID",
      reservation.attempt_id,
    );
  }

  const confirmed = state.confirmation?.confirmed_record;
  const verification = intent.verification_binding;
  const deliveryBindingFingerprint = confirmed
    ? keyValueFingerprint({
        canonical_payment_identity:
          text(confirmed.canonical_payment_identity),
        request_id: text(confirmed.request_id),
        instruction_id: text(confirmed.instruction_id),
        delivery_chain_id: text(confirmed.delivery_chain_id),
        void_delivery_tx_hash:
          text(confirmed.void_delivery_tx_hash).toLowerCase(),
        delivery_block_number:
          text(confirmed.delivery_block_number),
        ...(confirmed.delivery_block_hash
          ? {
              delivery_block_hash:
                text(confirmed.delivery_block_hash).toLowerCase(),
            }
          : {}),
        fulfillment_wallet:
          address(confirmed.fulfillment_wallet),
        delivery_address:
          address(confirmed.delivery_address),
        void_amount_units:
          text(confirmed.void_amount_units),
      })
    : "";
  const outerDeliveryBlockHash =
    state.confirmation?.delivery_block_hash
      ? text(state.confirmation.delivery_block_hash).toLowerCase()
      : "";
  const confirmationFingerprint = confirmed && state.confirmation
    ? keyValueFingerprint({
        marker: text(confirmed.marker),
        canonical_payment_identity:
          text(confirmed.canonical_payment_identity),
        request_id: text(confirmed.request_id),
        instruction_id: text(confirmed.instruction_id),
        void_delivery_tx_hash:
          text(confirmed.void_delivery_tx_hash).toLowerCase(),
        delivery_block_number:
          text(confirmed.delivery_block_number),
        delivery_block_hash: outerDeliveryBlockHash,
        delivery_binding_fingerprint:
          text(confirmed.delivery_binding_fingerprint),
        fulfillment_wallet:
          address(confirmed.fulfillment_wallet),
        delivery_address:
          address(confirmed.delivery_address),
        void_amount_units:
          text(confirmed.void_amount_units),
      })
    : "";
  if (
    confirmed &&
    (
      confirmed.status !== "fulfilled_confirmed" ||
      confirmed.canonical_payment_identity !==
        intent.claim.canonical_payment_identity ||
      text(confirmed.canonical_payment_identity_sha256) !==
        sha256(intent.claim.canonical_payment_identity) ||
      confirmed.request_id !== intent.claim.request_id ||
      confirmed.instruction_id !==
        intent.claim.instruction_id ||
      text(confirmed.source_payment_chain) !==
        text(verification.source_chain) ||
      text(confirmed.payment_transaction_hash).toLowerCase() !==
        text(verification.payment_transaction_hash).toLowerCase() ||
      text(confirmed.payment_log_index) !==
        text(verification.payment_log_index) ||
      text(confirmed.delivery_chain_id) !== "2050" ||
      text(confirmed.void_delivery_tx_hash).toLowerCase() !==
        text(state.confirmation?.void_delivery_tx_hash).toLowerCase() ||
      address(confirmed.fulfillment_wallet) !==
        address(state.prepared?.fulfillment_wallet) ||
      address(confirmed.delivery_address) !==
        address(instruction.delivery_address) ||
      (
        Boolean(confirmed.delivery_block_hash) !==
          Boolean(outerDeliveryBlockHash) ||
        (
          confirmed.delivery_block_hash &&
          text(confirmed.delivery_block_hash).toLowerCase() !==
            outerDeliveryBlockHash
        )
      ) ||
      text(confirmed.delivery_binding_fingerprint) !==
        deliveryBindingFingerprint ||
      text(state.confirmation?.confirmation_fingerprint) !==
        confirmationFingerprint ||
      text(confirmed.void_amount_units) !==
        text(instruction.void_amount_units) ||
      confirmed.buyer_fulfilled !== true ||
      confirmed.automatic_fulfillment_completed !== true ||
      confirmed.payment_claim_persisted !== true ||
      confirmed.delivery_confirmation_observed !== true ||
      confirmed.signing_authorized_by_this_module !== false ||
      confirmed.transaction_broadcast_authorized_by_this_module !== false ||
      confirmed.money_movement_authorized_by_this_module !== false
    )
  ) {
    fail(
      "ATTEMPT_CONFIRMATION_BINDING_INVALID",
      reservation.attempt_id,
    );
  }

  return {
    attempt_id: reservation.attempt_id,
    attempt_number: reservation.attempt_number,
    max_attempts_per_payment:
      reservation.max_attempts_per_payment,
    status: state.status,
    attempt_state_fingerprint_sha256:
      sha256(stableJson(state)),
    prepared_transaction_hash:
      state.prepared?.void_delivery_tx_hash ?? null,
    broadcast_transaction_hash:
      state.broadcast?.void_delivery_tx_hash ?? null,
    prebroadcast_failure_code:
      state.failure?.failure_code ?? null,
    postbroadcast_failure_transaction_hash:
      state.postbroadcast_failure
        ?.void_delivery_tx_hash ?? null,
    confirmation_transaction_hash:
      state.confirmation?.void_delivery_tx_hash ?? null,
  };
}

function readConsumption(
  rootDir: string,
  reservation: BuyVoidInventoryReservationV1,
  attempts: BuyVoidExecutionAttemptStateV1[],
): BuyVoidPaymentHistoryCloseoutProjectionV1 | null {
  const file = path.join(
    rootDir,
    "inventory-consumption-v1",
    "records",
    reservation.reservation_id + ".json",
  );
  const read = readBoundedJson(file, false);
  if (!read) return null;
  const raw = read.value;
  const consumptionBinding = {
    marker: VOID_BUY_VOID_CONFIRMED_CLOSEOUT_V1,
    pool_id: text(raw.pool_id),
    reservation_id: text(raw.reservation_id),
    execution_attempt_id: text(raw.execution_attempt_id),
    canonical_payment_identity:
      text(raw.canonical_payment_identity),
    request_id: text(raw.request_id),
    instruction_id: text(raw.instruction_id),
    delivery_address: address(raw.delivery_address),
    void_delivery_tx_hash:
      text(raw.void_delivery_tx_hash).toLowerCase(),
    consumed_void_units: text(raw.consumed_void_units),
  };
  const expectedConsumptionFingerprint =
    sha256(stableJson(consumptionBinding));
  const expectedConsumptionId =
    sha256(stableJson({
      schema: "void_buy_void_inventory_consumption_v1",
      ...consumptionBinding,
    }));
  const attempt = attempts.find(
    (candidate) =>
      candidate.reservation.attempt_id ===
        text(raw.execution_attempt_id),
  );
  if (
    raw.schema !==
      "void_buy_void_inventory_consumption_v1" ||
    raw.marker !== VOID_BUY_VOID_CONFIRMED_CLOSEOUT_V1 ||
    raw.version !== 1 ||
    text(raw.pool_id) !== reservation.pool_id ||
    text(raw.reservation_id) !==
      reservation.reservation_id ||
    !attempt ||
    attempt.status !== "confirmed" ||
    text(raw.canonical_payment_identity) !==
      reservation.canonical_payment_identity ||
    text(raw.request_id) !== reservation.request_id ||
    text(raw.instruction_id) !==
      reservation.instruction_id ||
    address(raw.delivery_address) !==
      address(reservation.delivery_address) ||
    text(raw.reserved_void_units) !==
      reservation.reserved_void_units ||
    text(raw.consumed_void_units) !==
      reservation.reserved_void_units ||
    !TX_HASH.test(
      text(raw.void_delivery_tx_hash).toLowerCase(),
    ) ||
    text(raw.void_delivery_tx_hash).toLowerCase() !==
      text(
        attempt.confirmation?.void_delivery_tx_hash,
      ).toLowerCase() ||
    !SHA256.test(text(raw.consumption_id)) ||
    !SHA256.test(
      text(raw.consumption_fingerprint_sha256),
    ) ||
    text(raw.consumption_id) !==
      expectedConsumptionId ||
    text(raw.consumption_fingerprint_sha256) !==
      expectedConsumptionFingerprint ||
    raw.inventory_decrement_performed !== true ||
    raw.reservation_status_before !== "reserved" ||
    raw.reservation_status_after !== "consumed" ||
    raw.base_reservation_record_mutated !== false ||
    raw.public_request_base_record_mutated !== false ||
    raw.wallet_access_performed !== false ||
    raw.credential_access_performed !== false ||
    raw.signing_performed !== false ||
    raw.transaction_broadcast_performed !== false ||
    raw.money_movement_performed !== false
  ) {
    fail(
      "CLOSEOUT_CONSUMPTION_INVALID",
      reservation.reservation_id,
    );
  }

  const confirmed = attempt.confirmation?.confirmed_record;
  if (
    !confirmed ||
    confirmed.status !== "fulfilled_confirmed" ||
    confirmed.canonical_payment_identity !==
      reservation.canonical_payment_identity ||
    confirmed.request_id !== reservation.request_id ||
    confirmed.instruction_id !==
      reservation.instruction_id ||
    address(confirmed.delivery_address) !==
      address(reservation.delivery_address) ||
    text(confirmed.void_amount_units) !==
      reservation.reserved_void_units
  ) {
    fail(
      "CLOSEOUT_CONFIRMATION_INVALID",
      reservation.reservation_id,
    );
  }

  return {
    consumption_id: text(raw.consumption_id),
    consumption_fingerprint_sha256:
      text(raw.consumption_fingerprint_sha256),
    closeout_record_sha256: read.sha256,
    execution_attempt_id:
      text(raw.execution_attempt_id),
    void_delivery_tx_hash:
      text(raw.void_delivery_tx_hash).toLowerCase(),
    consumed_void_units:
      text(raw.consumed_void_units),
  };
}

export function projectBuyVoidPaymentHistoryV1(input: {
  root_dir: string;
  pool_id: string;
  payment_key_sha256: string;
}): BuyVoidPaymentHistoryProjectionV1 {
  const rootDir = safeRoot(input?.root_dir);
  const poolId = text(input?.pool_id);
  const paymentKey =
    requireSha256(
      input?.payment_key_sha256,
      "PAYMENT_KEY_INVALID",
    );
  if (!SAFE_CODE.test(poolId)) {
    fail("POOL_ID_INVALID", poolId || "empty");
  }

  const fulfillmentPaths =
    buyVoidFulfillmentJournalPathsV1(rootDir);
  const intentRead = readBoundedJson(
    path.join(
      fulfillmentPaths.payments_dir,
      paymentKey + ".json",
    ),
    true,
  )!;
  const intent =
    validateIntent(intentRead.value, paymentKey);

  const inventoryPaths =
    buyVoidInventoryReservationJournalPathsV1(
      rootDir,
      poolId,
    );
  const expectedReservationId =
    reservationId(poolId, intent);
  const expectedObligationId =
    obligationId(poolId, intent);

  const reservationRead = readBoundedJson(
    path.join(
      inventoryPaths.reservations_dir,
      expectedReservationId + ".json",
    ),
    false,
  );
  const obligationRead = readBoundedJson(
    path.join(
      inventoryPaths.holds_dir,
      expectedObligationId + ".json",
    ),
    false,
  );
  if (
    Number(Boolean(reservationRead)) +
      Number(Boolean(obligationRead)) !==
    1
  ) {
    fail(
      "PRIMARY_RECORD_COUNT_INVALID",
      paymentKey,
    );
  }

  let primary:
    | BuyVoidInventoryReservationV1
    | BuyVoidPaidUnreservableObligationV1;
  let primaryKind:
    | "reservation"
    | "paid_unreservable_obligation";
  let primaryId: string;
  let primarySha256: string;

  if (reservationRead) {
    primary =
      validateReservation(
        reservationRead.value,
        expectedReservationId,
        poolId,
        intent,
      );
    primaryKind = "reservation";
    primaryId = expectedReservationId;
    primarySha256 = reservationRead.sha256;
  } else {
    primary =
      validateObligation(
        obligationRead!.value,
        expectedObligationId,
        poolId,
        intent,
      );
    primaryKind = "paid_unreservable_obligation";
    primaryId = expectedObligationId;
    primarySha256 = obligationRead!.sha256;
  }

  const attemptStates: BuyVoidExecutionAttemptStateV1[] = [];
  const attempts: BuyVoidPaymentHistoryAttemptProjectionV1[] = [];
  let gapSeen = false;
  let declaredMaximum: number | null = null;
  for (
    let attemptNumber = 1;
    attemptNumber <=
      VOID_BUY_VOID_PAYMENT_HISTORY_PROJECTION_MAX_ATTEMPT_SLOTS_V1;
    attemptNumber += 1
  ) {
    const attemptId =
      expectedAttemptId(intent, attemptNumber);
    let state: BuyVoidExecutionAttemptStateV1 | null;
    try {
      state = readBoundedAttemptState(
        rootDir,
        attemptId,
      );
    } catch (error) {
      fail(
        "ATTEMPT_READ_FAILED",
        attemptId +
          ":" +
          text((error as Error)?.message || error).slice(0, 160),
      );
    }
    if (!state) {
      gapSeen = true;
      continue;
    }
    if (gapSeen) {
      fail(
        "ATTEMPT_SEQUENCE_GAP",
        attemptId,
      );
    }
    const projected =
      attemptProjection(
        state,
        intent,
        attemptNumber,
      );
    if (declaredMaximum === null) {
      declaredMaximum =
        projected.max_attempts_per_payment;
    } else if (
      projected.max_attempts_per_payment !==
        declaredMaximum
    ) {
      fail(
        "ATTEMPT_POLICY_DRIFT",
        attemptId,
      );
    }
    if (
      attemptNumber >
        projected.max_attempts_per_payment
    ) {
      fail(
        "ATTEMPT_EXCEEDS_DECLARED_MAXIMUM",
        attemptId,
      );
    }
    attemptStates.push(state);
    attempts.push(projected);
  }

  if (
    primaryKind ===
      "paid_unreservable_obligation" &&
    attempts.length !== 0
  ) {
    fail(
      "OBLIGATION_ATTEMPT_CONFLICT",
      paymentKey,
    );
  }

  const closeout =
    primaryKind === "reservation"
      ? readConsumption(
          rootDir,
          primary as BuyVoidInventoryReservationV1,
          attemptStates,
        )
      : null;

  let lifecycleState:
    BuyVoidPaymentHistoryProjectionV1["lifecycle_state"];
  if (
    primaryKind === "paid_unreservable_obligation"
  ) {
    lifecycleState =
      "paid_unreservable_obligation";
  } else if (closeout) {
    lifecycleState = "inventory_consumed";
  } else if (attempts.length === 0) {
    lifecycleState = "reserved";
  } else {
    const last = attempts[attempts.length - 1];
    lifecycleState =
      last.status === "confirmed"
        ? "confirmed_pending_closeout"
        : last.status;
  }

  const instruction =
    intent.claim.unsigned_instruction;
  const core = {
    marker:
      VOID_BUY_VOID_PAYMENT_HISTORY_PROJECTION_V1 as
        typeof VOID_BUY_VOID_PAYMENT_HISTORY_PROJECTION_V1,
    version: 1 as const,
    pool_id: poolId,
    payment_key_sha256: paymentKey,
    request_key_sha256:
      intent.request_key_sha256,
    canonical_payment_identity:
      intent.claim.canonical_payment_identity,
    request_id: intent.claim.request_id,
    instruction_id: intent.claim.instruction_id,
    delivery_address:
      address(instruction.delivery_address),
    void_amount_units:
      text(instruction.void_amount_units),
    intent_record_sha256: intentRead.sha256,
    primary_kind: primaryKind,
    primary_record_id: primaryId,
    primary_record_sha256: primarySha256,
    attempt_slots_checked:
      VOID_BUY_VOID_PAYMENT_HISTORY_PROJECTION_MAX_ATTEMPT_SLOTS_V1 as
        typeof VOID_BUY_VOID_PAYMENT_HISTORY_PROJECTION_MAX_ATTEMPT_SLOTS_V1,
    attempt_count: attempts.length,
    attempts,
    closeout,
    lifecycle_state: lifecycleState,
  };
  const fingerprint =
    sha256(stableJson(core));

  return {
    ...core,
    primary_record: primary,
    payment_history_fingerprint_sha256:
      fingerprint,
    authority:
      VOID_BUY_VOID_PAYMENT_HISTORY_PROJECTION_AUTHORITY_V1,
  };
}
