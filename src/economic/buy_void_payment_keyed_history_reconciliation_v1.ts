import crypto from "node:crypto";

import {
  listBuyVoidFulfillmentJournalClaimsV1,
  type BuyVoidFulfillmentJournalIntentV1,
} from "./buy_void_fulfillment_journal_v1.js";
import {
  listBuyVoidInventoryReservationsV1,
  listBuyVoidPaidUnreservableObligationsV1,
  type BuyVoidInventoryReservationV1,
  type BuyVoidPaidUnreservableObligationV1,
} from "./buy_void_inventory_reservation_journal_v1.js";
import {
  buyVoidExecutionAttemptIntentFingerprintV1,
  listBuyVoidExecutionAttemptsV1,
  type BuyVoidExecutionAttemptStateV1,
} from "./buy_void_execution_attempt_journal_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_HISTORY_RECONCILIATION_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_HISTORY_RECONCILIATION_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_HISTORY_RECONCILIATION_AUTHORITY_V1 = {
  filesystem_read: true,
  filesystem_write: false,
  durable_inventory_history_read: true,
  paid_unreservable_obligation_history_read: true,
  fulfillment_intent_history_read: true,
  execution_attempt_history_read: true,
  exact_payment_key_identity_required: true,
  exact_request_key_identity_required: true,
  exact_canonical_payment_identity_required: true,
  exact_request_instruction_binding_required: true,
  exact_delivery_amount_binding_required: true,
  exact_inventory_intent_fingerprint_required: true,
  exact_attempt_intent_fingerprint_required: true,
  saga_binding_inputs_reconciled: true,
  saga_store_mutation: false,
  reservation_creation: false,
  execution_attempt_creation: false,
  obligation_creation: false,
  credential_access: false,
  wallet_access: false,
  rpc_call: false,
  signing: false,
  transaction_broadcast: false,
  runtime_activation: false,
  public_activation: false,
  automatic_retry: false,
  money_movement: false,
} as const;

const SAFE_CODE = /^[A-Za-z0-9._:-]{1,160}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;

export type BuyVoidPaymentKeyedHistoryReconciliationDependenciesV1 = {
  list_intents?: (rootDir: string) => BuyVoidFulfillmentJournalIntentV1[];
  list_inventory?: (input: {
    root_dir: string;
    pool_id: string;
  }) => BuyVoidInventoryReservationV1[];
  list_obligations?: (input: {
    root_dir: string;
    pool_id: string;
  }) => BuyVoidPaidUnreservableObligationV1[];
  list_attempts?: (rootDir: string) => BuyVoidExecutionAttemptStateV1[];
};

export type BuyVoidPaymentKeyedHistoryReconciliationDecisionV1 =
  | {
      ok: true;
      status: "reconciled_read_only";
      marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_HISTORY_RECONCILIATION_V1;
      version: 1;
      pool_id: string;
      intent_count: number;
      inventory_reservation_count: number;
      paid_unreservable_obligation_count: number;
      execution_attempt_count: number;
      unresolved_intent_count: number;
      saga_binding_input_count: number;
      history_fingerprint_sha256: string;
      mutation_performed: false;
      automatic_retry_allowed: false;
      authority:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_HISTORY_RECONCILIATION_AUTHORITY_V1;
    }
  | {
      ok: false;
      status: "held";
      marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_HISTORY_RECONCILIATION_V1;
      version: 1;
      reason: string;
      detail?: Record<string, unknown>;
      mutation_performed: false;
      automatic_retry_allowed: false;
      authority:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_HISTORY_RECONCILIATION_AUTHORITY_V1;
    };

function held(
  reason: string,
  detail?: Record<string, unknown>,
): Extract<
  BuyVoidPaymentKeyedHistoryReconciliationDecisionV1,
  { ok: false }
> {
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_PAYMENT_KEYED_HISTORY_RECONCILIATION_V1,
    version: 1,
    reason,
    ...(detail ? { detail } : {}),
    mutation_performed: false,
    automatic_retry_allowed: false,
    authority:
      VOID_BUY_VOID_PAYMENT_KEYED_HISTORY_RECONCILIATION_AUTHORITY_V1,
  };
}

function text(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : String(value ?? "").trim();
}

function normalizeAddress(value: unknown): string {
  const valueText = text(value).toLowerCase();
  return ADDRESS.test(valueText) ? valueText : "";
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function stableFingerprint(parts: Record<string, string>): string {
  return sha256(
    Object.keys(parts)
      .sort()
      .map((key) => `${key}=${parts[key]}`)
      .join("\n"),
  );
}

export function buyVoidPaymentKeyedInventoryIntentFingerprintV1(
  intent: BuyVoidFulfillmentJournalIntentV1,
): string {
  return stableFingerprint({
    marker: text(intent.marker),
    payment_key_sha256: text(intent.payment_key_sha256),
    request_key_sha256: text(intent.request_key_sha256),
    canonical_payment_identity:
      text(intent.claim?.canonical_payment_identity),
    request_id: text(intent.claim?.request_id),
    instruction_id: text(intent.claim?.instruction_id),
    delivery_address:
      normalizeAddress(intent.claim?.unsigned_instruction?.delivery_address),
    void_amount_units:
      text(intent.claim?.unsigned_instruction?.void_amount_units),
  });
}

function exactIntentIdentity(
  intent: BuyVoidFulfillmentJournalIntentV1,
  candidate: {
    payment_key_sha256: string;
    request_key_sha256: string;
    canonical_payment_identity: string;
    request_id: string;
    instruction_id: string;
    delivery_address: string;
    void_amount_units: string;
  },
): boolean {
  return (
    text(intent.payment_key_sha256) ===
      text(candidate.payment_key_sha256) &&
    text(intent.request_key_sha256) ===
      text(candidate.request_key_sha256) &&
    text(intent.claim?.canonical_payment_identity) ===
      text(candidate.canonical_payment_identity) &&
    text(intent.claim?.request_id) ===
      text(candidate.request_id) &&
    text(intent.claim?.instruction_id) ===
      text(candidate.instruction_id) &&
    normalizeAddress(
      intent.claim?.unsigned_instruction?.delivery_address,
    ) === normalizeAddress(candidate.delivery_address) &&
    text(intent.claim?.unsigned_instruction?.void_amount_units) ===
      text(candidate.void_amount_units)
  );
}

function reservationMatchesIntent(
  reservation: BuyVoidInventoryReservationV1,
  intent: BuyVoidFulfillmentJournalIntentV1,
): boolean {
  return (
    exactIntentIdentity(intent, {
      payment_key_sha256: reservation.payment_key_sha256,
      request_key_sha256: reservation.request_key_sha256,
      canonical_payment_identity:
        reservation.canonical_payment_identity,
      request_id: reservation.request_id,
      instruction_id: reservation.instruction_id,
      delivery_address: reservation.delivery_address,
      void_amount_units: reservation.reserved_void_units,
    }) &&
    reservation.intent_fingerprint ===
      buyVoidPaymentKeyedInventoryIntentFingerprintV1(intent)
  );
}

function attemptMatchesIntent(
  attempt: BuyVoidExecutionAttemptStateV1,
  intent: BuyVoidFulfillmentJournalIntentV1,
): boolean {
  const reservation = attempt.reservation;
  return (
    exactIntentIdentity(intent, {
      payment_key_sha256: reservation.payment_key_sha256,
      request_key_sha256: reservation.request_key_sha256,
      canonical_payment_identity:
        reservation.canonical_payment_identity,
      request_id: reservation.request_id,
      instruction_id: reservation.instruction_id,
      delivery_address:
        text(reservation.unsigned_instruction?.delivery_address),
      void_amount_units:
        text(reservation.unsigned_instruction?.void_amount_units),
    }) &&
    reservation.intent_fingerprint ===
      buyVoidExecutionAttemptIntentFingerprintV1(intent)
  );
}

export function buyVoidPaymentKeyedReservationAttemptIdentityMatchesV1(
  reservation: BuyVoidInventoryReservationV1,
  attempt: BuyVoidExecutionAttemptStateV1,
): boolean {
  const attemptReservation = attempt.reservation;
  return (
    reservation.payment_key_sha256 ===
      attemptReservation.payment_key_sha256 &&
    reservation.request_key_sha256 ===
      attemptReservation.request_key_sha256 &&
    reservation.canonical_payment_identity ===
      attemptReservation.canonical_payment_identity &&
    reservation.request_id === attemptReservation.request_id &&
    reservation.instruction_id ===
      attemptReservation.instruction_id &&
    normalizeAddress(reservation.delivery_address) ===
      normalizeAddress(
        attemptReservation.unsigned_instruction?.delivery_address,
      ) &&
    text(reservation.reserved_void_units) ===
      text(attemptReservation.unsigned_instruction?.void_amount_units)
  );
}

function obligationMatchesIntent(
  obligation: BuyVoidPaidUnreservableObligationV1,
  intent: BuyVoidFulfillmentJournalIntentV1,
): boolean {
  const binding = intent.verification_binding;
  return (
    exactIntentIdentity(intent, {
      payment_key_sha256: obligation.payment_key_sha256,
      request_key_sha256: obligation.request_key_sha256,
      canonical_payment_identity:
        obligation.canonical_payment_identity,
      request_id: obligation.request_id,
      instruction_id: obligation.instruction_id,
      delivery_address: obligation.delivery_address,
      void_amount_units: obligation.requested_void_units,
    }) &&
    text(binding.source_chain) === text(obligation.source_chain) &&
    text(binding.payment_transaction_hash).toLowerCase() ===
      text(obligation.payment_transaction_hash).toLowerCase() &&
    text(binding.payment_log_index) ===
      text(obligation.payment_log_index) &&
    text(binding.confirmed_block_number) ===
      text(obligation.confirmed_block_number) &&
    text(binding.confirmation_count_at_claim) ===
      text(obligation.confirmation_count_at_claim) &&
    text(binding.payment_usdc_units) ===
      text(obligation.payment_usdc_units)
  );
}

function sagaBindingFingerprint(
  intent: BuyVoidFulfillmentJournalIntentV1,
  poolId: string,
): string {
  return stableFingerprint({
    request_id: text(intent.claim?.request_id),
    canonical_payment_identity:
      text(intent.claim?.canonical_payment_identity),
    request_key_sha256: text(intent.request_key_sha256),
    payment_key_sha256: text(intent.payment_key_sha256),
    delivery_address:
      normalizeAddress(intent.claim?.unsigned_instruction?.delivery_address),
    void_amount_units:
      text(intent.claim?.unsigned_instruction?.void_amount_units),
    chain_id: "2050",
    pool_id: poolId,
  });
}

function historyFingerprint(input: {
  intents: BuyVoidFulfillmentJournalIntentV1[];
  inventory: BuyVoidInventoryReservationV1[];
  obligations: BuyVoidPaidUnreservableObligationV1[];
  attempts: BuyVoidExecutionAttemptStateV1[];
  pool_id: string;
}): string {
  const lines = [
    ...input.intents.map((intent) =>
      [
        "intent",
        text(intent.payment_key_sha256),
        text(intent.request_key_sha256),
        text(intent.claim?.request_id),
        text(intent.claim?.instruction_id),
      ].join(":")),
    ...input.inventory.map((reservation) =>
      [
        "reservation",
        reservation.reservation_id,
        reservation.payment_key_sha256,
        reservation.request_key_sha256,
      ].join(":")),
    ...input.obligations.map((obligation) =>
      [
        "obligation",
        obligation.obligation_id,
        obligation.payment_key_sha256,
        obligation.request_key_sha256,
      ].join(":")),
    ...input.attempts.map((attempt) =>
      [
        "attempt",
        attempt.reservation.attempt_id,
        attempt.reservation.payment_key_sha256,
        sagaBindingFingerprint(
          input.intents.find((intent) =>
            attemptMatchesIntent(attempt, intent))!,
          input.pool_id,
        ),
      ].join(":")),
  ].sort();
  return sha256(lines.join("\n"));
}

export function reconcileBuyVoidPaymentKeyedDurableHistoryV1(input: {
  root_dir: string;
  pool_id: string;
  dependencies?: BuyVoidPaymentKeyedHistoryReconciliationDependenciesV1;
}): BuyVoidPaymentKeyedHistoryReconciliationDecisionV1 {
  const rootDir = text(input?.root_dir);
  const poolId = text(input?.pool_id);
  if (!rootDir || rootDir.includes("\0") || !SAFE_CODE.test(poolId)) {
    return held("payment_keyed_history_reconciliation_input_invalid");
  }

  const deps = input.dependencies || {};
  let intents: BuyVoidFulfillmentJournalIntentV1[];
  let inventory: BuyVoidInventoryReservationV1[];
  let obligations: BuyVoidPaidUnreservableObligationV1[];
  let attempts: BuyVoidExecutionAttemptStateV1[];
  try {
    intents = (
      deps.list_intents || listBuyVoidFulfillmentJournalClaimsV1
    )(rootDir);
    inventory = (
      deps.list_inventory || listBuyVoidInventoryReservationsV1
    )({ root_dir: rootDir, pool_id: poolId });
    obligations = (
      deps.list_obligations ||
      listBuyVoidPaidUnreservableObligationsV1
    )({ root_dir: rootDir, pool_id: poolId });
    attempts = (
      deps.list_attempts || listBuyVoidExecutionAttemptsV1
    )(rootDir);
  } catch (error) {
    return held(
      "payment_keyed_history_reconciliation_read_failed",
      {
        error_class: text((error as Error)?.name || "Error"),
        message: text((error as Error)?.message || error).slice(0, 240),
      },
    );
  }

  const seenIntentPaymentKeys = new Set<string>();
  for (const intent of intents) {
    const paymentKey = text(intent.payment_key_sha256);
    if (!SHA256.test(paymentKey)) {
      return held("payment_keyed_history_intent_payment_key_invalid");
    }
    if (seenIntentPaymentKeys.has(paymentKey)) {
      return held(
        "payment_keyed_history_duplicate_intent_payment_key",
        { payment_key_sha256: paymentKey },
      );
    }
    seenIntentPaymentKeys.add(paymentKey);
  }

  const seenReservationPaymentKeys = new Set<string>();
  for (const reservation of inventory) {
    if (seenReservationPaymentKeys.has(reservation.payment_key_sha256)) {
      return held(
        "payment_keyed_history_duplicate_inventory_payment_key",
        { payment_key_sha256: reservation.payment_key_sha256 },
      );
    }
    seenReservationPaymentKeys.add(reservation.payment_key_sha256);
    const matches = intents.filter((intent) =>
      reservationMatchesIntent(reservation, intent));
    if (matches.length !== 1) {
      return held(
        "payment_keyed_history_inventory_intent_match_invalid",
        {
          reservation_id: reservation.reservation_id,
          payment_key_sha256: reservation.payment_key_sha256,
          candidate_count: matches.length,
        },
      );
    }
  }

  for (const attempt of attempts) {
    const intentMatches = intents.filter((intent) =>
      attemptMatchesIntent(attempt, intent));
    if (intentMatches.length !== 1) {
      return held(
        "payment_keyed_history_attempt_intent_match_invalid",
        {
          attempt_id: attempt.reservation.attempt_id,
          payment_key_sha256:
            attempt.reservation.payment_key_sha256,
          candidate_count: intentMatches.length,
        },
      );
    }
    const inventoryMatches = inventory.filter((reservation) =>
      buyVoidPaymentKeyedReservationAttemptIdentityMatchesV1(
        reservation,
        attempt,
      ));
    if (inventoryMatches.length !== 1) {
      return held(
        "payment_keyed_history_attempt_inventory_match_invalid",
        {
          attempt_id: attempt.reservation.attempt_id,
          payment_key_sha256:
            attempt.reservation.payment_key_sha256,
          candidate_count: inventoryMatches.length,
        },
      );
    }
  }

  const seenObligationPaymentKeys = new Set<string>();
  for (const obligation of obligations) {
    if (seenObligationPaymentKeys.has(obligation.payment_key_sha256)) {
      return held(
        "payment_keyed_history_duplicate_obligation_payment_key",
        { payment_key_sha256: obligation.payment_key_sha256 },
      );
    }
    seenObligationPaymentKeys.add(obligation.payment_key_sha256);
    const matches = intents.filter((intent) =>
      obligationMatchesIntent(obligation, intent));
    if (matches.length !== 1) {
      return held(
        "payment_keyed_history_obligation_intent_match_invalid",
        {
          obligation_id: obligation.obligation_id,
          payment_key_sha256: obligation.payment_key_sha256,
          candidate_count: matches.length,
        },
      );
    }
    if (
      inventory.some((reservation) =>
        reservation.payment_key_sha256 ===
          obligation.payment_key_sha256) ||
      attempts.some((attempt) =>
        attempt.reservation.payment_key_sha256 ===
          obligation.payment_key_sha256)
    ) {
      return held(
        "payment_keyed_history_obligation_execution_conflict",
        {
          obligation_id: obligation.obligation_id,
          payment_key_sha256: obligation.payment_key_sha256,
        },
      );
    }
  }

  const resolvedIntentKeys = new Set<string>([
    ...inventory.map((value) => value.payment_key_sha256),
    ...obligations.map((value) => value.payment_key_sha256),
  ]);
  const unresolvedIntentCount = intents.filter(
    (intent) => !resolvedIntentKeys.has(intent.payment_key_sha256),
  ).length;

  return {
    ok: true,
    status: "reconciled_read_only",
    marker: VOID_BUY_VOID_PAYMENT_KEYED_HISTORY_RECONCILIATION_V1,
    version: 1,
    pool_id: poolId,
    intent_count: intents.length,
    inventory_reservation_count: inventory.length,
    paid_unreservable_obligation_count: obligations.length,
    execution_attempt_count: attempts.length,
    unresolved_intent_count: unresolvedIntentCount,
    saga_binding_input_count: attempts.length,
    history_fingerprint_sha256: historyFingerprint({
      intents,
      inventory,
      obligations,
      attempts,
      pool_id: poolId,
    }),
    mutation_performed: false,
    automatic_retry_allowed: false,
    authority:
      VOID_BUY_VOID_PAYMENT_KEYED_HISTORY_RECONCILIATION_AUTHORITY_V1,
  };
}
