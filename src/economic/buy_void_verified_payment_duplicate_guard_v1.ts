import {
  canonicalBuyVoidPaymentIdentityV1,
} from "./buy_void_auto_fulfillment_v1.js";
import {
  VOID_BUY_VOID_VERIFIED_PAYMENT_V2,
  type BuyVoidVerifiedPaymentEventV2,
} from "./buy_void_verified_payment_v2.js";

export const VOID_BUY_VOID_VERIFIED_PAYMENT_DUPLICATE_GUARD_V1 =
  "VOID_BUY_VOID_VERIFIED_PAYMENT_DUPLICATE_GUARD_V1";

export const VOID_BUY_VOID_VERIFIED_PAYMENT_DUPLICATE_GUARD_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    canonical_payment_identity_reuse: true,
    in_memory_history_validation: true,
    runtime_integration: false,
    filesystem_read: false,
    filesystem_write: false,
    payment_receipt_verification: false,
    payment_verified_event_write: false,
    inventory_reservation_write: false,
    allocation_reservation_write: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const REQUEST_ID = /^[A-Za-z0-9._:-]{3,160}$/u;
const MAX_HISTORY_EVENTS = 100_000;

type VerifiedIdentityV1 = {
  request_id: string;
  canonical_payment_identity: string;
};

export type BuyVoidVerifiedPaymentDuplicateGuardReadyV1 = {
  ok: true;
  status: "available" | "idempotent";
  marker: typeof VOID_BUY_VOID_VERIFIED_PAYMENT_DUPLICATE_GUARD_V1;
  version: 1;
  ready: true;
  idempotent: boolean;
  request_id: string;
  canonical_payment_identity: string;
  existing_verified_payment_event_count: number;
  distinct_payment_identity_count: number;
  authority: typeof VOID_BUY_VOID_VERIFIED_PAYMENT_DUPLICATE_GUARD_AUTHORITY_V1;
};

export type BuyVoidVerifiedPaymentDuplicateGuardHeldV1 = {
  ok: false;
  status: "held";
  marker: typeof VOID_BUY_VOID_VERIFIED_PAYMENT_DUPLICATE_GUARD_V1;
  version: 1;
  ready: false;
  idempotent: false;
  reason: string;
  request_id: string | null;
  canonical_payment_identity: string | null;
  existing_verified_payment_event_count: number;
  distinct_payment_identity_count: number;
  authority: typeof VOID_BUY_VOID_VERIFIED_PAYMENT_DUPLICATE_GUARD_AUTHORITY_V1;
};

export type BuyVoidVerifiedPaymentDuplicateGuardDecisionV1 =
  | BuyVoidVerifiedPaymentDuplicateGuardReadyV1
  | BuyVoidVerifiedPaymentDuplicateGuardHeldV1;

function held(
  reason: string,
  input: {
    request_id?: string | null;
    canonical_payment_identity?: string | null;
    existing_verified_payment_event_count?: number;
    distinct_payment_identity_count?: number;
  } = {},
): BuyVoidVerifiedPaymentDuplicateGuardHeldV1 {
  return Object.freeze({
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_VERIFIED_PAYMENT_DUPLICATE_GUARD_V1,
    version: 1,
    ready: false,
    idempotent: false,
    reason,
    request_id: input.request_id ?? null,
    canonical_payment_identity:
      input.canonical_payment_identity ?? null,
    existing_verified_payment_event_count:
      input.existing_verified_payment_event_count ?? 0,
    distinct_payment_identity_count:
      input.distinct_payment_identity_count ?? 0,
    authority:
      VOID_BUY_VOID_VERIFIED_PAYMENT_DUPLICATE_GUARD_AUTHORITY_V1,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value),
  );
}

function paymentVerifiedStatus(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    String(value.operator_status || "").trim() === "payment_verified" ||
    value.payment_verified === true
  );
}

function readVerifiedIdentityV1(
  value: unknown,
  label: "candidate" | "existing",
): VerifiedIdentityV1 {
  if (!isRecord(value)) {
    throw new Error(label + "_verified_payment_event_invalid");
  }
  if (
    String(value.operator_status || "").trim() !== "payment_verified" ||
    value.payment_verified !== true
  ) {
    throw new Error(label + "_payment_not_verified");
  }
  if (
    value.schema !== "void_buy_void_verified_payment_event_v2" ||
    value.marker !== VOID_BUY_VOID_VERIFIED_PAYMENT_V2 ||
    value.payment_identity_input_complete !== true
  ) {
    throw new Error(label + "_verified_payment_identity_incomplete");
  }

  const requestId = String(value.request_id || "").trim();
  if (!REQUEST_ID.test(requestId)) {
    throw new Error(label + "_request_id_invalid");
  }

  const verifier = value.payment_verifier;
  if (!isRecord(verifier)) {
    throw new Error(label + "_payment_verifier_missing");
  }

  let canonicalPaymentIdentity: string;
  let outerPaymentIdentity: string;
  try {
    canonicalPaymentIdentity = canonicalBuyVoidPaymentIdentityV1({
      source_chain: verifier.chain,
      payment_transaction_hash: verifier.transaction_hash,
      payment_log_index: verifier.log_index,
    });
    outerPaymentIdentity = canonicalBuyVoidPaymentIdentityV1({
      source_chain: verifier.chain,
      payment_transaction_hash: value.tx_hash,
      payment_log_index: verifier.log_index,
    });
  } catch {
    throw new Error(label + "_canonical_payment_identity_invalid");
  }
  if (outerPaymentIdentity !== canonicalPaymentIdentity) {
    throw new Error(label + "_payment_transaction_hash_mismatch");
  }

  return Object.freeze({
    request_id: requestId,
    canonical_payment_identity: canonicalPaymentIdentity,
  });
}

export function classifyBuyVoidVerifiedPaymentDuplicateGuardV1(input: {
  candidate_event: unknown;
  existing_events: unknown[];
}): BuyVoidVerifiedPaymentDuplicateGuardDecisionV1 {
  if (
    !input ||
    !Array.isArray(input.existing_events) ||
    input.existing_events.length > MAX_HISTORY_EVENTS
  ) {
    return held("duplicate_guard_history_invalid");
  }

  let candidate: VerifiedIdentityV1;
  try {
    candidate = readVerifiedIdentityV1(
      input.candidate_event,
      "candidate",
    );
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "candidate_verified_payment_event_invalid",
    );
  }

  const paymentToRequest = new Map<string, string>();
  const requestToPayment = new Map<string, string>();
  let verifiedEventCount = 0;

  for (const raw of input.existing_events) {
    if (!isRecord(raw)) {
      return held("duplicate_guard_history_event_invalid", {
        request_id: candidate.request_id,
        canonical_payment_identity:
          candidate.canonical_payment_identity,
        existing_verified_payment_event_count: verifiedEventCount,
        distinct_payment_identity_count: paymentToRequest.size,
      });
    }
    if (!paymentVerifiedStatus(raw)) continue;

    let existing: VerifiedIdentityV1;
    try {
      existing = readVerifiedIdentityV1(raw, "existing");
    } catch (error) {
      return held(
        error instanceof Error
          ? error.message
          : "existing_verified_payment_event_invalid",
        {
          request_id: candidate.request_id,
          canonical_payment_identity:
            candidate.canonical_payment_identity,
          existing_verified_payment_event_count: verifiedEventCount,
          distinct_payment_identity_count: paymentToRequest.size,
        },
      );
    }
    verifiedEventCount += 1;

    const claimedRequest = paymentToRequest.get(
      existing.canonical_payment_identity,
    );
    if (
      claimedRequest !== undefined &&
      claimedRequest !== existing.request_id
    ) {
      return held(
        "existing_duplicate_payment_identity_conflict",
        {
          request_id: candidate.request_id,
          canonical_payment_identity:
            candidate.canonical_payment_identity,
          existing_verified_payment_event_count: verifiedEventCount,
          distinct_payment_identity_count: paymentToRequest.size,
        },
      );
    }

    const claimedPayment = requestToPayment.get(existing.request_id);
    if (
      claimedPayment !== undefined &&
      claimedPayment !== existing.canonical_payment_identity
    ) {
      return held(
        "existing_request_payment_identity_conflict",
        {
          request_id: candidate.request_id,
          canonical_payment_identity:
            candidate.canonical_payment_identity,
          existing_verified_payment_event_count: verifiedEventCount,
          distinct_payment_identity_count: paymentToRequest.size,
        },
      );
    }

    paymentToRequest.set(
      existing.canonical_payment_identity,
      existing.request_id,
    );
    requestToPayment.set(
      existing.request_id,
      existing.canonical_payment_identity,
    );
  }

  const priorPaymentForRequest = requestToPayment.get(
    candidate.request_id,
  );
  if (
    priorPaymentForRequest !== undefined &&
    priorPaymentForRequest !== candidate.canonical_payment_identity
  ) {
    return held("request_payment_identity_conflict", {
      request_id: candidate.request_id,
      canonical_payment_identity:
        candidate.canonical_payment_identity,
      existing_verified_payment_event_count: verifiedEventCount,
      distinct_payment_identity_count: paymentToRequest.size,
    });
  }

  const priorRequestForPayment = paymentToRequest.get(
    candidate.canonical_payment_identity,
  );
  if (
    priorRequestForPayment !== undefined &&
    priorRequestForPayment !== candidate.request_id
  ) {
    return held("duplicate_payment_identity_already_claimed", {
      request_id: candidate.request_id,
      canonical_payment_identity:
        candidate.canonical_payment_identity,
      existing_verified_payment_event_count: verifiedEventCount,
      distinct_payment_identity_count: paymentToRequest.size,
    });
  }

  const idempotent =
    priorPaymentForRequest === candidate.canonical_payment_identity &&
    priorRequestForPayment === candidate.request_id;

  return Object.freeze({
    ok: true,
    status: idempotent ? "idempotent" : "available",
    marker: VOID_BUY_VOID_VERIFIED_PAYMENT_DUPLICATE_GUARD_V1,
    version: 1,
    ready: true,
    idempotent,
    request_id: candidate.request_id,
    canonical_payment_identity:
      candidate.canonical_payment_identity,
    existing_verified_payment_event_count: verifiedEventCount,
    distinct_payment_identity_count: paymentToRequest.size,
    authority:
      VOID_BUY_VOID_VERIFIED_PAYMENT_DUPLICATE_GUARD_AUTHORITY_V1,
  });
}

export function testOnlyVerifiedPaymentIdentityV1(
  event: BuyVoidVerifiedPaymentEventV2,
): string {
  return readVerifiedIdentityV1(
    event,
    "candidate",
  ).canonical_payment_identity;
}
