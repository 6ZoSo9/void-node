import type {
  BuyVoidExecutionAttemptStateV1,
} from "./buy_void_execution_attempt_journal_v1.js";
import {
  runBuyVoidPaymentKeyedTransactionPreparationV1,
  type BuyVoidPaymentKeyedTransactionPreparationPolicyV1,
  type BuyVoidPaymentKeyedTransactionPreparationRpcMethodV1,
  type BuyVoidPaymentKeyedTransactionPreparationTransportV1,
} from "./buy_void_payment_keyed_transaction_preparation_v1.js";
import {
  buildBuyVoidPaymentKeyedUnsignedTransactionV1,
} from "./buy_void_payment_keyed_unsigned_transaction_v1.js";
import {
  buildBuyVoidPaymentKeyedCustodianPrepareRequestV1,
} from "./buy_void_payment_keyed_custodian_prepare_request_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1,
  runBuyVoidPaymentKeyedCustodianSignerV1,
} from "./buy_void_payment_keyed_custodian_signer_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_CONFIRMATION_V1,
  runBuyVoidPaymentKeyedCustodianBroadcastV1,
} from "./buy_void_payment_keyed_custodian_broadcast_v1.js";
import type {
  BuyVoidPaymentKeyedFulfillmentCallReadyV1,
} from "./buy_void_payment_keyed_fulfillment_call_v1.js";
import type {
  BuyVoidDeliveryBroadcasterV1,
  BuyVoidDeliverySignerV1,
} from "./buy_void_delivery_sign_broadcast_adapter_v1.js";
import type {
  BuyVoidDeliverySubmissionGuardV1,
} from "./buy_void_delivery_submission_guard_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_EXECUTION_COMPOSITION_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_EXECUTION_COMPOSITION_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_EXECUTION_COMPOSITION_AUTHORITY_V1 = {
  source_only_contract: true,
  runtime_route_mount: false,
  deployment: false,
  disabled_without_preparation_policy: true,
  read_only_transaction_planning_rpc_only_before_apply: true,
  exact_sign_confirmation_required: true,
  exact_broadcast_confirmation_required: true,
  injected_signer_required_for_apply: true,
  durable_submission_guard_required_for_apply: true,
  injected_broadcaster_required_for_apply: true,
  canonical_unsigned_transaction_required: true,
  canonical_custodian_request_required: true,
  signer_dry_run_revalidation_required: true,
  raw_signed_transaction_input: false,
  raw_signed_transaction_output: false,
  raw_signed_transaction_persistence: false,
  automatic_retry: false,
  receipt_wait: false,
  receipt_acceptance: false,
  inventory_mutation: false,
  public_fulfilled_closeout: false,
  signing_when_explicitly_applied: true,
  transaction_broadcast_when_explicitly_applied: true,
  money_movement_possible_when_broadcaster_accepts: true,
} as const;

export type BuyVoidPaymentKeyedExecutionCompositionDependenciesV1 = {
  preparation_transport?: BuyVoidPaymentKeyedTransactionPreparationTransportV1;
  signer?: BuyVoidDeliverySignerV1;
  submission_guard?: BuyVoidDeliverySubmissionGuardV1;
  broadcaster?: BuyVoidDeliveryBroadcasterV1;
};

export type BuyVoidPaymentKeyedExecutionCompositionInputV1 = {
  saga_id: string;
  plan_reservation_id: string;
  attempt: BuyVoidExecutionAttemptStateV1;
  fulfillment_call: BuyVoidPaymentKeyedFulfillmentCallReadyV1;
  policy: BuyVoidPaymentKeyedTransactionPreparationPolicyV1;
  apply?: boolean;
  sign_confirmation?: unknown;
  broadcast_confirmation?: unknown;
  dependencies?: BuyVoidPaymentKeyedExecutionCompositionDependenciesV1;
};

export type BuyVoidPaymentKeyedExecutionCompositionReadyV1 = {
  ok: true;
  marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_EXECUTION_COMPOSITION_V1;
  version: 1;
  status: "dry_run" | "broadcast_accepted";
  applied: boolean;
  attempt_id: string;
  saga_id: string;
  plan_reservation_id: string;
  preparation_fingerprint_sha256: string;
  rpc_url_fingerprint_sha256: string;
  rpc_methods_used: BuyVoidPaymentKeyedTransactionPreparationRpcMethodV1[];
  transaction_plan_fingerprint_sha256: string;
  unsigned_transaction_fingerprint_sha256: string;
  request_fingerprint_sha256: string;
  request_idempotency_key_sha256: string;
  submission_idempotency_key: string | null;
  transaction_hash: string | null;
  provider_submission_id: string;
  signer_wallet_access_performed: boolean;
  signing_performed: boolean;
  submission_guard_claimed: boolean;
  broadcast_call_performed: boolean;
  transaction_broadcast_accepted: boolean;
  reconciliation_required: false;
  retry_allowed: false;
  raw_signed_transaction_persisted: false;
  raw_signed_transaction_returned: false;
  automatic_retry_allowed: false;
  receipt_verified: false;
  inventory_mutation_performed: false;
  public_fulfilled_closeout_performed: false;
};

export type BuyVoidPaymentKeyedExecutionCompositionHeldV1 = {
  ok: false;
  marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_EXECUTION_COMPOSITION_V1;
  version: 1;
  status: "held" | "not_broadcast" | "broadcast_unknown";
  stage:
    | "input"
    | "confirmation"
    | "dependencies"
    | "preparation"
    | "unsigned_transaction"
    | "custodian_request"
    | "signer_preflight"
    | "signer"
    | "broadcast";
  reason: string;
  attempt_id: string | null;
  rpc_url_fingerprint_sha256: string | null;
  rpc_methods_used: BuyVoidPaymentKeyedTransactionPreparationRpcMethodV1[];
  preparation_fingerprint_sha256: string | null;
  transaction_plan_fingerprint_sha256: string | null;
  unsigned_transaction_fingerprint_sha256: string | null;
  request_fingerprint_sha256: string | null;
  request_idempotency_key_sha256: string | null;
  submission_idempotency_key: string | null;
  transaction_hash: string | null;
  provider_submission_id: string;
  signer_wallet_access_performed: boolean;
  signing_performed: boolean;
  submission_guard_claimed: boolean;
  broadcast_call_performed: boolean;
  reconciliation_required: boolean;
  retry_allowed: boolean;
  raw_signed_transaction_persisted: false;
  raw_signed_transaction_returned: false;
  automatic_retry_allowed: false;
  receipt_verified: false;
  inventory_mutation_performed: false;
  public_fulfilled_closeout_performed: false;
};

export type BuyVoidPaymentKeyedExecutionCompositionDecisionV1 =
  | BuyVoidPaymentKeyedExecutionCompositionReadyV1
  | BuyVoidPaymentKeyedExecutionCompositionHeldV1;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function attemptIdFrom(
  attempt: BuyVoidExecutionAttemptStateV1 | null | undefined,
): string | null {
  const value = text(attempt?.reservation?.attempt_id).toLowerCase();
  return /^[0-9a-f]{64}$/.test(value) ? value : null;
}

function held(
  stage: BuyVoidPaymentKeyedExecutionCompositionHeldV1["stage"],
  reason: string,
  options: Partial<BuyVoidPaymentKeyedExecutionCompositionHeldV1> = {},
): BuyVoidPaymentKeyedExecutionCompositionHeldV1 {
  return {
    ok: false,
    marker: VOID_BUY_VOID_PAYMENT_KEYED_EXECUTION_COMPOSITION_V1,
    version: 1,
    status: options.status || "held",
    stage,
    reason,
    attempt_id: options.attempt_id || null,
    rpc_url_fingerprint_sha256:
      options.rpc_url_fingerprint_sha256 || null,
    rpc_methods_used: options.rpc_methods_used || [],
    preparation_fingerprint_sha256:
      options.preparation_fingerprint_sha256 || null,
    transaction_plan_fingerprint_sha256:
      options.transaction_plan_fingerprint_sha256 || null,
    unsigned_transaction_fingerprint_sha256:
      options.unsigned_transaction_fingerprint_sha256 || null,
    request_fingerprint_sha256:
      options.request_fingerprint_sha256 || null,
    request_idempotency_key_sha256:
      options.request_idempotency_key_sha256 || null,
    submission_idempotency_key:
      options.submission_idempotency_key || null,
    transaction_hash: options.transaction_hash || null,
    provider_submission_id: options.provider_submission_id || "",
    signer_wallet_access_performed:
      options.signer_wallet_access_performed === true,
    signing_performed: options.signing_performed === true,
    submission_guard_claimed:
      options.submission_guard_claimed === true,
    broadcast_call_performed:
      options.broadcast_call_performed === true,
    reconciliation_required:
      options.reconciliation_required === true,
    retry_allowed: options.retry_allowed === true,
    raw_signed_transaction_persisted: false,
    raw_signed_transaction_returned: false,
    automatic_retry_allowed: false,
    receipt_verified: false,
    inventory_mutation_performed: false,
    public_fulfilled_closeout_performed: false,
  };
}

export async function runBuyVoidPaymentKeyedExecutionCompositionV1(
  input: BuyVoidPaymentKeyedExecutionCompositionInputV1,
): Promise<BuyVoidPaymentKeyedExecutionCompositionDecisionV1> {
  if (
    !input ||
    !input.attempt ||
    !input.fulfillment_call ||
    !input.policy
  ) {
    return held("input", "payment_keyed_execution_composition_missing_input");
  }

  const attemptId = attemptIdFrom(input.attempt);

  if (input.apply === true) {
    if (
      text(input.sign_confirmation) !==
        VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1 ||
      text(input.broadcast_confirmation) !==
        VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_CONFIRMATION_V1
    ) {
      return held(
        "confirmation",
        "payment_keyed_execution_composition_exact_confirmations_required",
        { attempt_id: attemptId },
      );
    }

    const dependencies = input.dependencies;
    if (
      !dependencies ||
      typeof dependencies.signer?.get_address !== "function" ||
      typeof dependencies.signer?.sign_transaction !== "function" ||
      typeof dependencies.submission_guard?.claim_submission_once !==
        "function" ||
      typeof dependencies.submission_guard?.release_submission_claim !==
        "function" ||
      typeof dependencies.broadcaster?.broadcast_signed_transaction !==
        "function"
    ) {
      return held(
        "dependencies",
        "payment_keyed_execution_composition_apply_dependencies_required",
        { attempt_id: attemptId },
      );
    }
  }

  const preparation = await runBuyVoidPaymentKeyedTransactionPreparationV1({
    attempt: input.attempt,
    fulfillment_call: input.fulfillment_call,
    policy: input.policy,
    ...(input.dependencies?.preparation_transport
      ? { transport: input.dependencies.preparation_transport }
      : {}),
  });

  if (preparation.ok === false) {
    return held("preparation", preparation.reason, {
      attempt_id: preparation.attempt_id,
      rpc_url_fingerprint_sha256:
        preparation.rpc_url_fingerprint_sha256,
      rpc_methods_used: preparation.rpc_methods_used,
    });
  }

  const unsigned = buildBuyVoidPaymentKeyedUnsignedTransactionV1({
    attempt_id: preparation.attempt_id,
    fulfillment_call: input.fulfillment_call,
    plan: preparation.transaction_plan,
    policy: input.policy,
  });
  if (unsigned.ok === false) {
    return held("unsigned_transaction", unsigned.reason, {
      attempt_id: unsigned.attempt_id,
      rpc_url_fingerprint_sha256:
        preparation.rpc_url_fingerprint_sha256,
      rpc_methods_used: preparation.rpc_methods_used,
      preparation_fingerprint_sha256:
        preparation.preparation_fingerprint_sha256,
    });
  }

  const requestDecision =
    buildBuyVoidPaymentKeyedCustodianPrepareRequestV1({
      saga_id: input.saga_id,
      attempt_id: preparation.attempt_id,
      plan_reservation_id: input.plan_reservation_id,
      fulfillment_call: input.fulfillment_call,
      plan: preparation.transaction_plan,
      unsigned_transaction: unsigned,
      policy: input.policy,
    });
  if (requestDecision.ok === false) {
    return held("custodian_request", requestDecision.reason, {
      attempt_id: requestDecision.attempt_id,
      rpc_url_fingerprint_sha256:
        preparation.rpc_url_fingerprint_sha256,
      rpc_methods_used: preparation.rpc_methods_used,
      preparation_fingerprint_sha256:
        preparation.preparation_fingerprint_sha256,
      transaction_plan_fingerprint_sha256:
        unsigned.transaction_plan_fingerprint_sha256,
      unsigned_transaction_fingerprint_sha256:
        unsigned.unsigned_transaction_fingerprint_sha256,
    });
  }
  const request = requestDecision.request;

  const signerPreflight =
    await runBuyVoidPaymentKeyedCustodianSignerV1({
      request,
      apply: false,
    });
  if (signerPreflight.ok === false) {
    return held("signer_preflight", signerPreflight.reason, {
      attempt_id: signerPreflight.attempt_id,
      rpc_url_fingerprint_sha256:
        preparation.rpc_url_fingerprint_sha256,
      rpc_methods_used: preparation.rpc_methods_used,
      preparation_fingerprint_sha256:
        preparation.preparation_fingerprint_sha256,
      transaction_plan_fingerprint_sha256:
        request.transaction_plan_fingerprint_sha256,
      unsigned_transaction_fingerprint_sha256:
        request.unsigned_transaction_fingerprint_sha256,
      request_fingerprint_sha256:
        request.request_fingerprint_sha256,
      request_idempotency_key_sha256:
        request.idempotency_key_sha256,
    });
  }

  if (input.apply !== true) {
    return {
      ok: true,
      marker: VOID_BUY_VOID_PAYMENT_KEYED_EXECUTION_COMPOSITION_V1,
      version: 1,
      status: "dry_run",
      applied: false,
      attempt_id: preparation.attempt_id,
      saga_id: request.saga_id,
      plan_reservation_id: request.plan_reservation_id,
      preparation_fingerprint_sha256:
        preparation.preparation_fingerprint_sha256,
      rpc_url_fingerprint_sha256:
        preparation.rpc_url_fingerprint_sha256,
      rpc_methods_used: preparation.rpc_methods_used,
      transaction_plan_fingerprint_sha256:
        request.transaction_plan_fingerprint_sha256,
      unsigned_transaction_fingerprint_sha256:
        request.unsigned_transaction_fingerprint_sha256,
      request_fingerprint_sha256:
        request.request_fingerprint_sha256,
      request_idempotency_key_sha256:
        request.idempotency_key_sha256,
      submission_idempotency_key: null,
      transaction_hash: null,
      provider_submission_id: "",
      signer_wallet_access_performed: false,
      signing_performed: false,
      submission_guard_claimed: false,
      broadcast_call_performed: false,
      transaction_broadcast_accepted: false,
      reconciliation_required: false,
      retry_allowed: false,
      raw_signed_transaction_persisted: false,
      raw_signed_transaction_returned: false,
      automatic_retry_allowed: false,
      receipt_verified: false,
      inventory_mutation_performed: false,
      public_fulfilled_closeout_performed: false,
    };
  }

  const deps = input.dependencies!;
  const signed = await runBuyVoidPaymentKeyedCustodianSignerV1({
    request,
    apply: true,
    confirmation:
      VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1,
    signer: deps.signer!,
  });
  if (signed.ok === false) {
    return held("signer", signed.reason, {
      attempt_id: signed.attempt_id,
      rpc_url_fingerprint_sha256:
        preparation.rpc_url_fingerprint_sha256,
      rpc_methods_used: preparation.rpc_methods_used,
      preparation_fingerprint_sha256:
        preparation.preparation_fingerprint_sha256,
      transaction_plan_fingerprint_sha256:
        request.transaction_plan_fingerprint_sha256,
      unsigned_transaction_fingerprint_sha256:
        request.unsigned_transaction_fingerprint_sha256,
      request_fingerprint_sha256:
        request.request_fingerprint_sha256,
      request_idempotency_key_sha256:
        request.idempotency_key_sha256,
      signer_wallet_access_performed:
        signed.wallet_access_performed,
      signing_performed: signed.signing_performed,
    });
  }
  if (signed.status !== "signed") {
    return held(
      "signer",
      "payment_keyed_execution_composition_signer_not_signed",
      {
        attempt_id: signed.attempt_id,
        rpc_url_fingerprint_sha256:
          preparation.rpc_url_fingerprint_sha256,
        rpc_methods_used: preparation.rpc_methods_used,
        preparation_fingerprint_sha256:
          preparation.preparation_fingerprint_sha256,
        transaction_plan_fingerprint_sha256:
          request.transaction_plan_fingerprint_sha256,
        unsigned_transaction_fingerprint_sha256:
          request.unsigned_transaction_fingerprint_sha256,
        request_fingerprint_sha256:
          request.request_fingerprint_sha256,
        request_idempotency_key_sha256:
          request.idempotency_key_sha256,
        signer_wallet_access_performed:
          signed.wallet_access_performed,
        signing_performed: signed.signing_performed,
      },
    );
  }

  const broadcast = await runBuyVoidPaymentKeyedCustodianBroadcastV1({
    request,
    signed,
    apply: true,
    confirmation:
      VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_CONFIRMATION_V1,
    dependencies: {
      submission_guard: deps.submission_guard!,
      broadcaster: deps.broadcaster!,
    },
  });

  if (broadcast.ok === false) {
    return held("broadcast", broadcast.reason, {
      status: broadcast.status,
      attempt_id: broadcast.attempt_id,
      rpc_url_fingerprint_sha256:
        preparation.rpc_url_fingerprint_sha256,
      rpc_methods_used: preparation.rpc_methods_used,
      preparation_fingerprint_sha256:
        preparation.preparation_fingerprint_sha256,
      transaction_plan_fingerprint_sha256:
        broadcast.transaction_plan_fingerprint_sha256,
      unsigned_transaction_fingerprint_sha256:
        broadcast.unsigned_transaction_fingerprint_sha256,
      request_fingerprint_sha256:
        broadcast.request_fingerprint_sha256,
      request_idempotency_key_sha256:
        request.idempotency_key_sha256,
      submission_idempotency_key:
        broadcast.submission_idempotency_key,
      transaction_hash: broadcast.expected_transaction_hash,
      provider_submission_id:
        broadcast.provider_submission_id,
      signer_wallet_access_performed: true,
      signing_performed: true,
      submission_guard_claimed:
        broadcast.submission_guard_claimed,
      broadcast_call_performed:
        broadcast.broadcast_call_performed,
      reconciliation_required:
        broadcast.reconciliation_required,
      retry_allowed: broadcast.retry_allowed,
    });
  }

  return {
    ok: true,
    marker: VOID_BUY_VOID_PAYMENT_KEYED_EXECUTION_COMPOSITION_V1,
    version: 1,
    status: "broadcast_accepted",
    applied: true,
    attempt_id: broadcast.attempt_id,
    saga_id: request.saga_id,
    plan_reservation_id: request.plan_reservation_id,
    preparation_fingerprint_sha256:
      preparation.preparation_fingerprint_sha256,
    rpc_url_fingerprint_sha256:
      preparation.rpc_url_fingerprint_sha256,
    rpc_methods_used: preparation.rpc_methods_used,
    transaction_plan_fingerprint_sha256:
      broadcast.transaction_plan_fingerprint_sha256,
    unsigned_transaction_fingerprint_sha256:
      broadcast.unsigned_transaction_fingerprint_sha256,
    request_fingerprint_sha256:
      broadcast.request_fingerprint_sha256,
    request_idempotency_key_sha256:
      request.idempotency_key_sha256,
    submission_idempotency_key:
      broadcast.submission_idempotency_key,
    transaction_hash: broadcast.transaction_hash,
    provider_submission_id:
      broadcast.provider_submission_id,
    signer_wallet_access_performed: true,
    signing_performed: true,
    submission_guard_claimed: true,
    broadcast_call_performed: true,
    transaction_broadcast_accepted: true,
    reconciliation_required: false,
    retry_allowed: false,
    raw_signed_transaction_persisted: false,
    raw_signed_transaction_returned: false,
    automatic_retry_allowed: false,
    receipt_verified: false,
    inventory_mutation_performed: false,
    public_fulfilled_closeout_performed: false,
  };
}
