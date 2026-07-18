import {
  decideBuyVoidAutoFulfillmentV1,
  type BuyVoidAutoFulfillmentPolicyV1,
  type BuyVoidRequestV1,
} from "./buy_void_auto_fulfillment_v1.js";
import {
  buildBuyVoidVerifiedPaymentEventV2,
  type BuyVoidTransactionReceiptV2,
  type BuyVoidVerifiedPaymentPolicyV2,
} from "./buy_void_verified_payment_v2.js";
import {
  claimBuyVoidFulfillmentJournalV1,
  type BuyVoidFulfillmentJournalIntentV1,
} from "./buy_void_fulfillment_journal_v1.js";
import {
  prepareBuyVoidExecutionTransactionV1,
  recordBuyVoidExecutionBroadcastV1,
  recordBuyVoidExecutionConfirmedV1,
  recordBuyVoidExecutionPostbroadcastFailureV1,
  recordBuyVoidExecutionPrebroadcastFailureV1,
  reserveBuyVoidExecutionAttemptV1,
  type BuyVoidExecutionAttemptPolicyV1,
} from "./buy_void_execution_attempt_journal_v1.js";
import {
  recordBuyVoidBroadcastAcceptedV1,
  recordBuyVoidBroadcastConfirmedV1,
  recordBuyVoidBroadcastRevertedV1,
  recordBuyVoidBroadcastUnknownV1,
  recordBuyVoidNotBroadcastV1,
  type BuyVoidBroadcastOutcomePolicyV1,
} from "./buy_void_broadcast_outcome_journal_v1.js";
import {
  confirmBuyVoidFulfillmentV1,
  type BuyVoidConfirmedFulfillmentRecordV1,
  type BuyVoidDeliveryObservationV1,
  type BuyVoidFulfillmentConfirmationPolicyV1,
} from "./buy_void_fulfillment_confirmation_v1.js";
import { persistBuyVoidConfirmedStateV1 } from "./buy_void_confirmed_state_journal_v1.js";

export const VOID_BUY_VOID_PIPELINE_COORDINATOR_V1 =
  "VOID_BUY_VOID_PIPELINE_COORDINATOR_V1";

export const VOID_BUY_VOID_PIPELINE_COORDINATOR_AUTHORITY_V1 = {
  dry_by_default: true,
  explicit_confirmation_required: true,
  filesystem_read_via_journals: true,
  filesystem_write_via_journals: true,
  rpc_call: false,
  wallet_access: false,
  signing: false,
  raw_signed_transaction_input: false,
  transaction_broadcast: false,
  runtime_route_mount: false,
  service_restart: false,
  money_movement: false,
} as const;

export const VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1 = {
  verify_and_claim: "buyVoidVerifyAndClaim",
  reserve_execution: "buyVoidReserveExecution",
  prepare_execution: "buyVoidPrepareExecution",
  record_not_broadcast: "buyVoidRecordNotBroadcast",
  record_broadcast_unknown: "buyVoidRecordBroadcastUnknown",
  record_broadcast_accepted: "buyVoidRecordBroadcastAccepted",
  record_reverted: "buyVoidRecordReverted",
  record_confirmed: "buyVoidRecordConfirmed",
} as const;

export type BuyVoidPipelineActionV1 =
  keyof typeof VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1;

type MutationControlV1 = {
  apply?: boolean;
  confirmation?: unknown;
  now_ms?: number;
};

export type BuyVoidVerifyAndClaimCommandV1 = MutationControlV1 & {
  action: "verify_and_claim";
  root_dir: string;
  request: BuyVoidRequestV1;
  receipt: BuyVoidTransactionReceiptV2;
  verification_policy: BuyVoidVerifiedPaymentPolicyV2;
  fulfillment_policy: BuyVoidAutoFulfillmentPolicyV1;
};

export type BuyVoidReserveExecutionCommandV1 = MutationControlV1 & {
  action: "reserve_execution";
  root_dir: string;
  intent: BuyVoidFulfillmentJournalIntentV1;
  execution_policy: BuyVoidExecutionAttemptPolicyV1;
};

export type BuyVoidPrepareExecutionCommandV1 = MutationControlV1 & {
  action: "prepare_execution";
  root_dir: string;
  attempt_id: string;
  intent: BuyVoidFulfillmentJournalIntentV1;
  execution_policy: BuyVoidExecutionAttemptPolicyV1;
  transaction: {
    chain_id?: unknown;
    transaction_hash?: unknown;
    from_address?: unknown;
    to_address?: unknown;
    amount_units?: unknown;
  };
};

export type BuyVoidRecordNotBroadcastCommandV1 = MutationControlV1 & {
  action: "record_not_broadcast";
  root_dir: string;
  attempt_id: string;
  transaction_hash: unknown;
  reason_code: unknown;
  provider_submission_id?: unknown;
  detail?: Record<string, unknown>;
};

export type BuyVoidRecordBroadcastUnknownCommandV1 = MutationControlV1 & {
  action: "record_broadcast_unknown";
  root_dir: string;
  attempt_id: string;
  transaction_hash: unknown;
  reason_code: unknown;
  provider_submission_id?: unknown;
};

export type BuyVoidRecordBroadcastAcceptedCommandV1 = MutationControlV1 & {
  action: "record_broadcast_accepted";
  root_dir: string;
  attempt_id: string;
  transaction_hash: unknown;
  provider_submission_id?: unknown;
};

export type BuyVoidRecordRevertedCommandV1 = MutationControlV1 & {
  action: "record_reverted";
  root_dir: string;
  attempt_id: string;
  transaction_hash: unknown;
  observation: {
    chain_id?: unknown;
    transaction_status?: unknown;
    block_number?: unknown;
    current_block_number?: unknown;
  };
  outcome_policy: BuyVoidBroadcastOutcomePolicyV1;
};

export type BuyVoidRecordConfirmedCommandV1 = MutationControlV1 & {
  action: "record_confirmed";
  root_dir: string;
  attempt_id: string;
  intent: BuyVoidFulfillmentJournalIntentV1;
  observation: BuyVoidDeliveryObservationV1;
  confirmation_policy: BuyVoidFulfillmentConfirmationPolicyV1;
  prior_results?: BuyVoidConfirmedFulfillmentRecordV1[];
};

export type BuyVoidPipelineCommandV1 =
  | BuyVoidVerifyAndClaimCommandV1
  | BuyVoidReserveExecutionCommandV1
  | BuyVoidPrepareExecutionCommandV1
  | BuyVoidRecordNotBroadcastCommandV1
  | BuyVoidRecordBroadcastUnknownCommandV1
  | BuyVoidRecordBroadcastAcceptedCommandV1
  | BuyVoidRecordRevertedCommandV1
  | BuyVoidRecordConfirmedCommandV1;

export type BuyVoidPipelineCoordinatorDecisionV1 =
  | {
      ok: true;
      status: "dry_run";
      action: BuyVoidPipelineActionV1;
      applied: false;
      mutation_performed: false;
      required_confirmation: string;
      preview?: unknown;
    }
  | {
      ok: true;
      status: "applied";
      action: BuyVoidPipelineActionV1;
      applied: true;
      mutation_performed: true;
      result: unknown;
    }
  | {
      ok: false;
      status: "held";
      action: BuyVoidPipelineActionV1 | "invalid";
      applied: boolean;
      mutation_performed: false;
      reason: string;
      detail?: Record<string, unknown>;
    };

function held(
  action: BuyVoidPipelineActionV1 | "invalid",
  applied: boolean,
  reason: string,
  detail?: Record<string, unknown>,
): BuyVoidPipelineCoordinatorDecisionV1 {
  return {
    ok: false,
    status: "held",
    action,
    applied,
    mutation_performed: false,
    reason,
    ...(detail ? { detail } : {}),
  };
}

function requiredConfirmation(action: BuyVoidPipelineActionV1): string {
  return VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1[action];
}

function exactConfirmation(
  command: BuyVoidPipelineCommandV1,
): BuyVoidPipelineCoordinatorDecisionV1 | null {
  if (command.apply !== true) return null;
  const required = requiredConfirmation(command.action);
  if (String(command.confirmation || "") !== required) {
    return held(command.action, true, "explicit_confirmation_required", {
      required_confirmation: required,
    });
  }
  return null;
}

function dryRun(
  action: BuyVoidPipelineActionV1,
  preview?: unknown,
): BuyVoidPipelineCoordinatorDecisionV1 {
  return {
    ok: true,
    status: "dry_run",
    action,
    applied: false,
    mutation_performed: false,
    required_confirmation: requiredConfirmation(action),
    ...(preview === undefined ? {} : { preview }),
  };
}

function previewCommand(
  command: BuyVoidPipelineCommandV1,
): BuyVoidPipelineCoordinatorDecisionV1 {
  if (command.action === "verify_and_claim") {
    const verified = buildBuyVoidVerifiedPaymentEventV2({
      request: command.request,
      receipt: command.receipt,
      policy: command.verification_policy,
    });
    if ("reason" in verified) {
      return held(command.action, false, verified.reason, verified.detail);
    }
    const decision = decideBuyVoidAutoFulfillmentV1({
      request: command.request,
      verified_payment_event: verified.event,
      policy: command.fulfillment_policy,
      prior_claims: [],
    });
    if ("reason" in decision) {
      return held(command.action, false, decision.reason, decision.detail);
    }
    return dryRun(command.action, {
      verified_payment_event: verified.event,
      decision,
    });
  }

  if (command.action === "record_confirmed") {
    const confirmation = confirmBuyVoidFulfillmentV1({
      intent: command.intent,
      observation: command.observation,
      policy: command.confirmation_policy,
      prior_results: command.prior_results,
    });
    if ("reason" in confirmation) {
      return held(command.action, false, confirmation.reason, confirmation.detail);
    }
    return dryRun(command.action, { confirmation });
  }

  return dryRun(command.action);
}

function applyVerifyAndClaim(
  command: BuyVoidVerifyAndClaimCommandV1,
): BuyVoidPipelineCoordinatorDecisionV1 {
  const verified = buildBuyVoidVerifiedPaymentEventV2({
    request: command.request,
    receipt: command.receipt,
    policy: command.verification_policy,
  });
  if ("reason" in verified) {
    return held(command.action, true, verified.reason, verified.detail);
  }
  const claim = claimBuyVoidFulfillmentJournalV1({
    root_dir: command.root_dir,
    request: command.request,
    verified_payment_event: verified.event,
    policy: command.fulfillment_policy,
    now_ms: command.now_ms,
  });
  if ("reason" in claim) {
    return held(command.action, true, claim.reason, claim.detail);
  }
  return {
    ok: true,
    status: "applied",
    action: command.action,
    applied: true,
    mutation_performed: true,
    result: { verified_payment_event: verified.event, claim },
  };
}

function applyReserveExecution(
  command: BuyVoidReserveExecutionCommandV1,
): BuyVoidPipelineCoordinatorDecisionV1 {
  const result = reserveBuyVoidExecutionAttemptV1({
    root_dir: command.root_dir,
    intent: command.intent,
    policy: command.execution_policy,
    now_ms: command.now_ms,
  });
  if ("reason" in result) {
    return held(command.action, true, result.reason, result.detail);
  }
  return {
    ok: true,
    status: "applied",
    action: command.action,
    applied: true,
    mutation_performed: true,
    result,
  };
}

function applyPrepareExecution(
  command: BuyVoidPrepareExecutionCommandV1,
): BuyVoidPipelineCoordinatorDecisionV1 {
  const result = prepareBuyVoidExecutionTransactionV1({
    root_dir: command.root_dir,
    attempt_id: command.attempt_id,
    intent: command.intent,
    policy: command.execution_policy,
    transaction: command.transaction,
    now_ms: command.now_ms,
  });
  if ("reason" in result) {
    return held(command.action, true, result.reason, result.detail);
  }
  return {
    ok: true,
    status: "applied",
    action: command.action,
    applied: true,
    mutation_performed: true,
    result,
  };
}

function applyNotBroadcast(
  command: BuyVoidRecordNotBroadcastCommandV1,
): BuyVoidPipelineCoordinatorDecisionV1 {
  const outcome = recordBuyVoidNotBroadcastV1({
    root_dir: command.root_dir,
    attempt_id: command.attempt_id,
    transaction_hash: command.transaction_hash,
    reason_code: command.reason_code,
    provider_submission_id: command.provider_submission_id,
    now_ms: command.now_ms,
  });
  if ("reason" in outcome) {
    return held(command.action, true, outcome.reason, outcome.detail);
  }
  const attempt = recordBuyVoidExecutionPrebroadcastFailureV1({
    root_dir: command.root_dir,
    attempt_id: command.attempt_id,
    failure_code: command.reason_code,
    retryable: true,
    detail: command.detail,
    now_ms: command.now_ms,
  });
  if ("reason" in attempt) {
    return held(command.action, true, attempt.reason, attempt.detail);
  }
  return {
    ok: true,
    status: "applied",
    action: command.action,
    applied: true,
    mutation_performed: true,
    result: { outcome, attempt },
  };
}

function recordExternalBroadcast(
  command:
    | BuyVoidRecordBroadcastUnknownCommandV1
    | BuyVoidRecordBroadcastAcceptedCommandV1,
): BuyVoidPipelineCoordinatorDecisionV1 {
  const attempt = recordBuyVoidExecutionBroadcastV1({
    root_dir: command.root_dir,
    attempt_id: command.attempt_id,
    transaction_hash: command.transaction_hash,
    provider_submission_id: command.provider_submission_id,
    now_ms: command.now_ms,
  });
  if ("reason" in attempt) {
    return held(command.action, true, attempt.reason, attempt.detail);
  }

  const outcome =
    command.action === "record_broadcast_unknown"
      ? recordBuyVoidBroadcastUnknownV1({
          root_dir: command.root_dir,
          attempt_id: command.attempt_id,
          transaction_hash: command.transaction_hash,
          reason_code: command.reason_code,
          provider_submission_id: command.provider_submission_id,
          now_ms: command.now_ms,
        })
      : recordBuyVoidBroadcastAcceptedV1({
          root_dir: command.root_dir,
          attempt_id: command.attempt_id,
          transaction_hash: command.transaction_hash,
          provider_submission_id: command.provider_submission_id,
          now_ms: command.now_ms,
        });

  if ("reason" in outcome) {
    return held(command.action, true, outcome.reason, outcome.detail);
  }
  return {
    ok: true,
    status: "applied",
    action: command.action,
    applied: true,
    mutation_performed: true,
    result: { attempt, outcome },
  };
}

function applyReverted(
  command: BuyVoidRecordRevertedCommandV1,
): BuyVoidPipelineCoordinatorDecisionV1 {
  const outcome = recordBuyVoidBroadcastRevertedV1({
    root_dir: command.root_dir,
    attempt_id: command.attempt_id,
    transaction_hash: command.transaction_hash,
    observation: command.observation,
    policy: command.outcome_policy,
    now_ms: command.now_ms,
  });
  if ("reason" in outcome) {
    return held(command.action, true, outcome.reason, outcome.detail);
  }
  if (!outcome.state.reverted) {
    return held(command.action, true, "reverted_outcome_record_missing");
  }
  const attempt = recordBuyVoidExecutionPostbroadcastFailureV1({
    root_dir: command.root_dir,
    attempt_id: command.attempt_id,
    outcome: outcome.state.reverted,
    now_ms: command.now_ms,
  });
  if ("reason" in attempt) {
    return held(command.action, true, attempt.reason, attempt.detail);
  }
  return {
    ok: true,
    status: "applied",
    action: command.action,
    applied: true,
    mutation_performed: true,
    result: { outcome, attempt },
  };
}

function applyConfirmed(
  command: BuyVoidRecordConfirmedCommandV1,
): BuyVoidPipelineCoordinatorDecisionV1 {
  const confirmation = confirmBuyVoidFulfillmentV1({
    intent: command.intent,
    observation: command.observation,
    policy: command.confirmation_policy,
    prior_results: command.prior_results,
  });
  if ("reason" in confirmation) {
    return held(command.action, true, confirmation.reason, confirmation.detail);
  }

  const attempt = recordBuyVoidExecutionConfirmedV1({
    root_dir: command.root_dir,
    attempt_id: command.attempt_id,
    confirmed_record: confirmation.record,
    now_ms: command.now_ms,
  });
  if ("reason" in attempt) {
    return held(command.action, true, attempt.reason, attempt.detail);
  }

  const outcome = recordBuyVoidBroadcastConfirmedV1({
    root_dir: command.root_dir,
    attempt_id: command.attempt_id,
    transaction_hash: command.observation.transaction_hash,
    confirmed_record: confirmation.record,
    now_ms: command.now_ms,
  });
  if ("reason" in outcome) {
    return held(command.action, true, outcome.reason, outcome.detail);
  }

  const finalState = persistBuyVoidConfirmedStateV1({
    root_dir: command.root_dir,
    intent: command.intent,
    confirmed_record: confirmation.record,
    now_ms: command.now_ms,
  });
  if ("reason" in finalState) {
    return held(command.action, true, finalState.reason, finalState.detail);
  }

  return {
    ok: true,
    status: "applied",
    action: command.action,
    applied: true,
    mutation_performed: true,
    result: { confirmation, attempt, outcome, final_state: finalState },
  };
}

export function runBuyVoidPipelineCommandV1(
  command: BuyVoidPipelineCommandV1,
): BuyVoidPipelineCoordinatorDecisionV1 {
  if (!command || !(command.action in VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1)) {
    return held("invalid", false, "invalid_pipeline_action");
  }

  if (command.apply !== true) return previewCommand(command);

  const confirmationHold = exactConfirmation(command);
  if (confirmationHold) return confirmationHold;

  try {
    switch (command.action) {
      case "verify_and_claim":
        return applyVerifyAndClaim(command);
      case "reserve_execution":
        return applyReserveExecution(command);
      case "prepare_execution":
        return applyPrepareExecution(command);
      case "record_not_broadcast":
        return applyNotBroadcast(command);
      case "record_broadcast_unknown":
      case "record_broadcast_accepted":
        return recordExternalBroadcast(command);
      case "record_reverted":
        return applyReverted(command);
      case "record_confirmed":
        return applyConfirmed(command);
      default:
        return held("invalid", true, "invalid_pipeline_action");
    }
  } catch (error) {
    return held(command.action, true, "pipeline_command_failed", {
      message: String((error as Error)?.message || error),
    });
  }
}
