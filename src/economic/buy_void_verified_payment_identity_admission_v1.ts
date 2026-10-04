import {
  canonicalBuyVoidPaymentIdentityV1,
} from "./buy_void_auto_fulfillment_v1.js";

export const VOID_BUY_VOID_VERIFIED_PAYMENT_IDENTITY_ADMISSION_V1 =
  "VOID_BUY_VOID_VERIFIED_PAYMENT_IDENTITY_ADMISSION_V1";

export const VOID_BUY_VOID_VERIFIED_PAYMENT_IDENTITY_ADMISSION_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    canonical_payment_identity_validation: true,
    strict_verified_history_collision_detection: true,
    filesystem_read: false,
    filesystem_write: false,
    rpc_call: false,
    credential_access: false,
    wallet_or_signer_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    inventory_funding: false,
    token_transfer: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const REQUEST_ID = /^buyvoid_[a-z0-9]+_[0-9a-f]{8}$/u;

function fail(code: string): never {
  throw new Error(code);
}

function canonicalIdentity(input: {
  source_chain: unknown;
  payment_transaction_hash: unknown;
  payment_log_index: unknown;
}, code: string): string {
  try {
    return canonicalBuyVoidPaymentIdentityV1(input);
  } catch {
    fail(code);
  }
}

function verifiedPaymentIdentityFromEventV1(event: any) {
  if (
    !event ||
    typeof event !== "object" ||
    Array.isArray(event) ||
    event.schema !== "void_buy_void_verified_payment_event_v2" ||
    event.marker !== "VOID_BUY_VOID_VERIFIED_PAYMENT_V2" ||
    event.payment_identity_input_complete !== true ||
    event.payment_verified !== true ||
    String(event.operator_status || "").trim() !== "payment_verified"
  ) {
    fail("buy_void_verified_payment_identity_event_provenance_invalid");
  }

  const requestId = String(event.request_id || "").trim();
  if (!REQUEST_ID.test(requestId)) {
    fail("buy_void_verified_payment_identity_request_id_invalid");
  }

  const verifier = event.payment_verifier;
  if (!verifier || typeof verifier !== "object" || Array.isArray(verifier)) {
    fail("buy_void_verified_payment_identity_verifier_missing");
  }

  const identity = canonicalIdentity(
    {
      source_chain: verifier.chain,
      payment_transaction_hash: verifier.transaction_hash,
      payment_log_index: verifier.log_index,
    },
    "buy_void_verified_payment_identity_invalid",
  );
  const outerIdentity = canonicalIdentity(
    {
      source_chain: verifier.chain,
      payment_transaction_hash: event.tx_hash,
      payment_log_index: verifier.log_index,
    },
    "buy_void_verified_payment_identity_outer_tx_invalid",
  );
  if (identity !== outerIdentity) {
    fail("buy_void_verified_payment_identity_outer_tx_mismatch");
  }

  return Object.freeze({
    request_id: requestId,
    canonical_payment_identity: identity,
  });
}

function candidatePaymentIdentityV1(request: any, event: any) {
  const candidate = verifiedPaymentIdentityFromEventV1(event);
  if (
    !request ||
    typeof request !== "object" ||
    Array.isArray(request) ||
    String(request.request_id || "").trim() !== candidate.request_id
  ) {
    fail("buy_void_verified_payment_identity_request_event_mismatch");
  }

  const verifier = event.payment_verifier;
  const requestIdentity = canonicalIdentity(
    {
      source_chain: request.source_chain,
      payment_transaction_hash: request.tx_hash,
      payment_log_index: verifier.log_index,
    },
    "buy_void_verified_payment_identity_request_binding_invalid",
  );
  if (requestIdentity !== candidate.canonical_payment_identity) {
    fail("buy_void_verified_payment_identity_request_binding_mismatch");
  }

  return candidate;
}

function freezeDecision(input: {
  ready: boolean;
  reason: string | null;
  already_verified: boolean;
  request_id: string;
  canonical_payment_identity: string;
  observed_verified_identity_count: number;
  observed_verified_request_count: number;
}) {
  return Object.freeze({
    marker: VOID_BUY_VOID_VERIFIED_PAYMENT_IDENTITY_ADMISSION_V1,
    version: 1,
    ready: input.ready,
    reason: input.reason,
    already_verified: input.already_verified,
    request_id: input.request_id,
    canonical_payment_identity: input.canonical_payment_identity,
    observed_verified_identity_count: input.observed_verified_identity_count,
    observed_verified_request_count: input.observed_verified_request_count,
    authority:
      VOID_BUY_VOID_VERIFIED_PAYMENT_IDENTITY_ADMISSION_AUTHORITY_V1,
  });
}

export function classifyBuyVoidVerifiedPaymentIdentityAdmissionV1(input: {
  request: any;
  event: any;
  operator_events: any[];
}) {
  if (!Array.isArray(input?.operator_events)) {
    fail("buy_void_verified_payment_identity_history_invalid");
  }

  const candidate = candidatePaymentIdentityV1(input.request, input.event);
  const identityOwners = new Map<string, string>();
  const requestIdentities = new Map<string, string>();

  for (const row of input.operator_events) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      fail("buy_void_verified_payment_identity_history_row_invalid");
    }
    if (String(row.operator_status || "").trim() !== "payment_verified") {
      continue;
    }

    const prior = verifiedPaymentIdentityFromEventV1(row);
    const owner = identityOwners.get(prior.canonical_payment_identity);
    if (owner !== undefined && owner !== prior.request_id) {
      fail("buy_void_verified_payment_identity_history_reused");
    }
    identityOwners.set(prior.canonical_payment_identity, prior.request_id);

    const priorIdentity = requestIdentities.get(prior.request_id);
    if (
      priorIdentity !== undefined &&
      priorIdentity !== prior.canonical_payment_identity
    ) {
      fail("buy_void_verified_payment_identity_request_history_conflict");
    }
    requestIdentities.set(
      prior.request_id,
      prior.canonical_payment_identity,
    );
  }

  const identityOwner = identityOwners.get(
    candidate.canonical_payment_identity,
  );
  if (identityOwner !== undefined && identityOwner !== candidate.request_id) {
    return freezeDecision({
      ready: false,
      reason: "buy_void_verified_payment_identity_reused",
      already_verified: false,
      request_id: candidate.request_id,
      canonical_payment_identity: candidate.canonical_payment_identity,
      observed_verified_identity_count: identityOwners.size,
      observed_verified_request_count: requestIdentities.size,
    });
  }

  const priorRequestIdentity = requestIdentities.get(candidate.request_id);
  if (
    priorRequestIdentity !== undefined &&
    priorRequestIdentity !== candidate.canonical_payment_identity
  ) {
    return freezeDecision({
      ready: false,
      reason: "buy_void_verified_payment_identity_request_changed",
      already_verified: true,
      request_id: candidate.request_id,
      canonical_payment_identity: candidate.canonical_payment_identity,
      observed_verified_identity_count: identityOwners.size,
      observed_verified_request_count: requestIdentities.size,
    });
  }

  return freezeDecision({
    ready: true,
    reason: null,
    already_verified: identityOwner === candidate.request_id,
    request_id: candidate.request_id,
    canonical_payment_identity: candidate.canonical_payment_identity,
    observed_verified_identity_count: identityOwners.size,
    observed_verified_request_count: requestIdentities.size,
  });
}

export function assertBuyVoidVerifiedPaymentIdentityAdmissionV1(input: {
  request: any;
  event: any;
  operator_events: any[];
}) {
  const decision = classifyBuyVoidVerifiedPaymentIdentityAdmissionV1(input);
  if (!decision.ready) fail(String(decision.reason));
  return decision;
}
