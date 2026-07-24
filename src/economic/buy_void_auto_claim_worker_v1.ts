import {
  decideBuyVoidAutoFulfillmentV1,
  type BuyVoidAutoFulfillmentDecisionV1,
  type BuyVoidAutoFulfillmentPolicyV1,
  type BuyVoidRequestV1,
} from "./buy_void_auto_fulfillment_v1.js";
import {
  claimBuyVoidFulfillmentJournalV1,
  listBuyVoidFulfillmentJournalClaimsV1,
  type BuyVoidFulfillmentJournalDecisionV1,
} from "./buy_void_fulfillment_journal_v1.js";
import {
  buildBuyVoidVerifiedPaymentEventV2,
  type BuyVoidVerifiedPaymentDecisionV2,
  type BuyVoidVerifiedPaymentPolicyV2,
} from "./buy_void_verified_payment_v2.js";
import {
  observeBuyVoidPaymentV1,
  type BuyVoidPaymentObservationReadyV1,
  type BuyVoidPaymentRpcObserverPolicyV1,
  type BuyVoidPaymentRpcTransportV1,
} from "./buy_void_payment_rpc_observer_v1.js";

export const VOID_BUY_VOID_AUTO_CLAIM_WORKER_V1 =
  "VOID_BUY_VOID_AUTO_CLAIM_WORKER_V1";

export const VOID_BUY_VOID_AUTO_CLAIM_CONFIRMATION_V1 =
  "buyVoidAutoClaimPayment";

export const VOID_BUY_VOID_AUTO_CLAIM_WORKER_AUTHORITY_V1 = {
  one_request_per_run: true,
  disabled_by_policy_default: true,
  dry_by_default: true,
  exact_confirmation_required: true,
  server_controlled_policy: true,
  rpc_read_via_observer: true,
  filesystem_read_via_claim_journal: true,
  filesystem_write_on_apply: true,
  request_journal_write: false,
  inventory_decrement: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  runtime_route_mount: false,
  background_loop: false,
  money_movement: false,
} as const;

export type BuyVoidAutoClaimWorkerPolicyV1 = {
  enabled: boolean;
  accepted_request_status:
    "payment_submitted_pending_manual_review";
  max_void_amount_units: string | number;
};

export type BuyVoidAutoClaimRequestV1 =
  BuyVoidRequestV1 & {
    status?: unknown;
  };

export type BuyVoidAutoClaimRequestStatePatchV1 = {
  status: "payment_verified_fulfillment_claimed";
  payment_verified_at_ms: number;
  canonical_payment_identity: string;
  fulfillment_instruction_id: string;
  fulfillment_claim_status: "claimed";
  automatic_delivery_started: false;
  signing_performed: false;
  transaction_broadcast: false;
};

export type BuyVoidAutoClaimWorkerDecisionV1 =
  | {
      ok: true;
      status: "dry_run";
      applied: false;
      mutation_performed: false;
      observer: BuyVoidPaymentObservationReadyV1;
      verification: BuyVoidVerifiedPaymentDecisionV2 & {
        ok: true;
      };
      admission: BuyVoidAutoFulfillmentDecisionV1 & {
        ok: true;
      };
      required_confirmation:
        typeof VOID_BUY_VOID_AUTO_CLAIM_CONFIRMATION_V1;
    }
  | {
      ok: true;
      status: "claimed" | "duplicate";
      applied: true;
      mutation_performed: boolean;
      observer: BuyVoidPaymentObservationReadyV1;
      verification: BuyVoidVerifiedPaymentDecisionV2 & {
        ok: true;
      };
      journal: BuyVoidFulfillmentJournalDecisionV1 & {
        ok: true;
      };
      request_state_patch: BuyVoidAutoClaimRequestStatePatchV1;
    }
  | {
      ok: false;
      status: "held";
      applied: boolean;
      mutation_performed: false;
      stage:
        | "worker_policy"
        | "payment_observation"
        | "payment_verification"
        | "fulfillment_admission"
        | "claim_journal";
      reason: string;
      detail?: Record<string, unknown>;
    };

function held(
  stage: BuyVoidAutoClaimWorkerDecisionV1 extends infer _T
    ? "worker_policy"
      | "payment_observation"
      | "payment_verification"
      | "fulfillment_admission"
      | "claim_journal"
    : never,
  applied: boolean,
  reason: string,
  detail?: Record<string, unknown>,
): BuyVoidAutoClaimWorkerDecisionV1 {
  return {
    ok: false,
    status: "held",
    applied,
    mutation_performed: false,
    stage,
    reason,
    ...(detail ? { detail } : {}),
  };
}

function decimalToUnits(
  value: unknown,
  decimals = 6,
): bigint | null {
  const raw = String(value ?? "").trim();
  if (!raw || !/^[0-9]+(?:\.[0-9]+)?$/.test(raw)) {
    return null;
  }

  const [whole, fraction = ""] = raw.split(".");
  if (fraction.length > decimals) return null;

  try {
    return (
      BigInt(whole) * 10n ** BigInt(decimals) +
      BigInt(fraction.padEnd(decimals, "0") || "0")
    );
  } catch {
    return null;
  }
}

function parsePositiveInteger(value: unknown): bigint | null {
  const raw = String(value ?? "").trim();
  if (!/^[0-9]+$/.test(raw)) return null;
  try {
    const parsed = BigInt(raw);
    return parsed > 0n ? parsed : null;
  } catch {
    return null;
  }
}

function validateWorkerPolicy(
  request: BuyVoidAutoClaimRequestV1,
  policy: BuyVoidAutoClaimWorkerPolicyV1,
): BuyVoidAutoClaimWorkerDecisionV1 | null {
  if (policy?.enabled !== true) {
    return held("worker_policy", false, "auto_claim_worker_disabled");
  }

  if (
    policy.accepted_request_status !==
    "payment_submitted_pending_manual_review"
  ) {
    return held(
      "worker_policy",
      false,
      "invalid_auto_claim_request_status_policy",
    );
  }

  const requestStatus = String(request?.status || "").trim();
  if (requestStatus !== policy.accepted_request_status) {
    return held(
      "worker_policy",
      false,
      "request_not_pending_payment_review",
      {
        expected_status: policy.accepted_request_status,
        observed_status: requestStatus,
      },
    );
  }

  const requestVoidUnits = decimalToUnits(
    request?.quoted_void,
    6,
  );
  const maximum = parsePositiveInteger(
    policy.max_void_amount_units,
  );
  if (
    requestVoidUnits === null ||
    requestVoidUnits <= 0n ||
    maximum === null
  ) {
    return held(
      "worker_policy",
      false,
      "invalid_auto_claim_amount_policy",
    );
  }
  if (requestVoidUnits > maximum) {
    return held(
      "worker_policy",
      false,
      "auto_claim_amount_exceeds_policy",
      {
        request_void_amount_units:
          requestVoidUnits.toString(),
        max_void_amount_units: maximum.toString(),
      },
    );
  }

  return null;
}

export async function runBuyVoidAutoClaimWorkerV1(input: {
  request: BuyVoidAutoClaimRequestV1;
  root_dir: string;
  worker_policy: BuyVoidAutoClaimWorkerPolicyV1;
  observer_policy: BuyVoidPaymentRpcObserverPolicyV1;
  verification_policy: BuyVoidVerifiedPaymentPolicyV2;
  fulfillment_policy: BuyVoidAutoFulfillmentPolicyV1;
  apply?: boolean;
  confirmation?: unknown;
  now_ms?: number;
  transport?: BuyVoidPaymentRpcTransportV1;
}): Promise<BuyVoidAutoClaimWorkerDecisionV1> {
  const workerHold = validateWorkerPolicy(
    input?.request,
    input?.worker_policy,
  );
  if (workerHold) return workerHold;

  if (
    input.apply === true &&
    String(input.confirmation || "") !==
      VOID_BUY_VOID_AUTO_CLAIM_CONFIRMATION_V1
  ) {
    return held(
      "worker_policy",
      true,
      "explicit_confirmation_required",
      {
        required_confirmation:
          VOID_BUY_VOID_AUTO_CLAIM_CONFIRMATION_V1,
      },
    );
  }

  const observation = await observeBuyVoidPaymentV1({
    request: input.request,
    policy: input.observer_policy,
    ...(input.transport ? { transport: input.transport } : {}),
  });
  if ("reason" in observation) {
    return held(
      "payment_observation",
      input.apply === true,
      observation.reason,
      observation.detail,
    );
  }

  const chain = String(input.request.source_chain || "")
    .trim()
    .toLowerCase();
  const verificationPolicy: BuyVoidVerifiedPaymentPolicyV2 = {
    ...input.verification_policy,
    current_block_number_by_chain: {
      ...(input.verification_policy
        ?.current_block_number_by_chain || {}),
      [chain]: observation.current_block_number,
    },
  };

  const verification = buildBuyVoidVerifiedPaymentEventV2({
    request: input.request,
    receipt: observation.receipt,
    policy: verificationPolicy,
  });
  if ("reason" in verification) {
    return held(
      "payment_verification",
      input.apply === true,
      verification.reason,
      verification.detail,
    );
  }

  if (input.apply !== true) {
    let priorClaims;
    try {
      priorClaims = listBuyVoidFulfillmentJournalClaimsV1(
        input.root_dir,
      ).map((intent) => intent.claim);
    } catch (error) {
      return held(
        "claim_journal",
        false,
        "claim_journal_read_failed",
        {
          error_class: String(
            (error as { name?: unknown })?.name || "Error",
          ).slice(0, 80),
        },
      );
    }

    const admission = decideBuyVoidAutoFulfillmentV1({
      request: input.request,
      verified_payment_event: verification.event,
      policy: input.fulfillment_policy,
      prior_claims: priorClaims,
    });
    if ("reason" in admission) {
      return held(
        "fulfillment_admission",
        false,
        admission.reason,
        admission.detail,
      );
    }

    return {
      ok: true,
      status: "dry_run",
      applied: false,
      mutation_performed: false,
      observer: observation,
      verification,
      admission,
      required_confirmation:
        VOID_BUY_VOID_AUTO_CLAIM_CONFIRMATION_V1,
    };
  }

  let journal: BuyVoidFulfillmentJournalDecisionV1;
  try {
    journal = claimBuyVoidFulfillmentJournalV1({
      root_dir: input.root_dir,
      request: input.request,
      verified_payment_event: verification.event,
      policy: input.fulfillment_policy,
      now_ms: input.now_ms,
    });
  } catch (error) {
    return held(
      "claim_journal",
      true,
      "claim_journal_write_failed",
      {
        error_class: String(
          (error as { name?: unknown })?.name || "Error",
        ).slice(0, 80),
      },
    );
  }
  if ("reason" in journal) {
    return held(
      "claim_journal",
      true,
      journal.reason,
      journal.detail,
    );
  }

  return {
    ok: true,
    status:
      journal.status === "duplicate"
        ? "duplicate"
        : "claimed",
    applied: true,
    mutation_performed: journal.new_claim,
    observer: observation,
    verification,
    journal,
    request_state_patch: {
      status: "payment_verified_fulfillment_claimed",
      payment_verified_at_ms: journal.intent.created_at_ms,
      canonical_payment_identity:
        journal.claim.canonical_payment_identity,
      fulfillment_instruction_id:
        journal.claim.instruction_id,
      fulfillment_claim_status: "claimed",
      automatic_delivery_started: false,
      signing_performed: false,
      transaction_broadcast: false,
    },
  };
}
