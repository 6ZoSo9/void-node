import {
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONFIRMATION_V1,
} from "./buy_void_fresh_candidate_auto_claim_activation_operator_approval_envelope_v1.js";
import {
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONSUMER_CONFIRMATION_V1,
} from "./buy_void_fresh_candidate_auto_claim_activation_operator_approval_consumer_v1.js";

export const VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_CONSOLE_V1 =
  "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_CONSOLE_V1";

export const VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_CONSOLE_AUTHORITY_V1 = {
  dry_by_default: true,
  exact_planned_request_required: true,
  exact_alert_required: true,
  exact_operator_approval_confirmation_required: true,
  exact_consumer_confirmation_required: true,
  maximum_admission_packet_invocations: 1,
  maximum_approval_envelope_invocations: 1,
  maximum_approval_consumer_invocations: 1,
  automatic_retry: false,
  persistent_config_write: false,
  request_journal_write: false,
  inventory_reservation: false,
  inventory_decrement: false,
  direct_rpc_call: false,
  direct_claim_write: false,
  direct_wallet_access: false,
  direct_signing: false,
  direct_transaction_broadcast: false,
  direct_money_movement: false,
} as const;

export type BuyVoidActivationPlanEnvelopeV1 = {
  schema?: unknown;
  marker?: unknown;
  version?: unknown;
  decision?: unknown;
};

export type BuyVoidActivationOperatorConsoleDecisionV1 =
  | {
      ok: true;
      status: "waiting";
      activation_authorized: false;
      mutation_performed: false;
      reason: "activation_plan_waiting";
      admission_packet_invocations: 0;
      approval_envelope_invocations: 0;
      approval_consumer_invocations: 0;
    }
  | {
      ok: true;
      status: "ready";
      activation_authorized: false;
      mutation_performed: false;
      request_id: string;
      required_operator_approval_confirmation:
        typeof VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONFIRMATION_V1;
      required_consumer_confirmation:
        typeof VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONSUMER_CONFIRMATION_V1;
      admission_packet_invocations: 0;
      approval_envelope_invocations: 0;
      approval_consumer_invocations: 0;
    }
  | {
      ok: true;
      status: "authorized";
      activation_authorized: true;
      mutation_performed: false;
      request_id: string;
      maximum_admission_packet_invocations: 1;
      maximum_approval_envelope_invocations: 1;
      maximum_approval_consumer_invocations: 1;
    }
  | {
      ok: false;
      status: "held";
      activation_authorized: false;
      mutation_performed: false;
      reason: string;
      admission_packet_invocations: 0;
      approval_envelope_invocations: 0;
      approval_consumer_invocations: 0;
      detail?: Record<string, unknown>;
    };

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{3,160}$/;

function normalized(value: unknown): string {
  return String(value || "").trim();
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function held(
  reason: string,
  detail?: Record<string, unknown>,
): BuyVoidActivationOperatorConsoleDecisionV1 {
  return {
    ok: false,
    status: "held",
    activation_authorized: false,
    mutation_performed: false,
    reason,
    admission_packet_invocations: 0,
    approval_envelope_invocations: 0,
    approval_consumer_invocations: 0,
    ...(detail ? { detail } : {}),
  };
}

export function authorizeBuyVoidFreshCandidateAutoClaimActivationOperatorConsoleV1(
  input: {
    plan: BuyVoidActivationPlanEnvelopeV1;
    alert_present: boolean;
    activate?: boolean;
    operator_approval_confirmation?: unknown;
    consumer_confirmation?: unknown;
  },
): BuyVoidActivationOperatorConsoleDecisionV1 {
  const plan = record(input?.plan);
  if (!plan) {
    return held("activation_plan_object_required");
  }

  if (
    normalized(plan.schema)
      !== "void_buy_void_fresh_candidate_auto_claim_activation_plan_result_v1"
    || normalized(plan.marker)
      !== "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_PLANNER_V1"
    || Number(plan.version) !== 1
  ) {
    return held("activation_plan_identity_mismatch");
  }

  const decision = record(plan.decision);
  if (!decision) {
    return held("activation_plan_decision_required");
  }

  if (
    normalized(decision.status) === "waiting"
    && decision.planned === false
    && decision.mutation_performed === false
  ) {
    return {
      ok: true,
      status: "waiting",
      activation_authorized: false,
      mutation_performed: false,
      reason: "activation_plan_waiting",
      admission_packet_invocations: 0,
      approval_envelope_invocations: 0,
      approval_consumer_invocations: 0,
    };
  }

  const requestId = normalized(decision.request_id);
  if (
    normalized(decision.status) !== "planned"
    || decision.planned !== true
    || decision.mutation_performed !== false
    || decision.one_shot !== true
    || Number(decision.maximum_claim_count) !== 1
    || !SAFE_REQUEST_ID.test(requestId)
  ) {
    return held("exact_one_planned_activation_required");
  }

  if (input.alert_present !== true) {
    return held("exact_activation_alert_required");
  }

  if (input.activate !== true) {
    return {
      ok: true,
      status: "ready",
      activation_authorized: false,
      mutation_performed: false,
      request_id: requestId,
      required_operator_approval_confirmation:
        VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONFIRMATION_V1,
      required_consumer_confirmation:
        VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONSUMER_CONFIRMATION_V1,
      admission_packet_invocations: 0,
      approval_envelope_invocations: 0,
      approval_consumer_invocations: 0,
    };
  }

  if (
    normalized(input.operator_approval_confirmation)
      !== VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONFIRMATION_V1
  ) {
    return held(
      "exact_operator_approval_confirmation_required",
      {
        required_confirmation:
          VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONFIRMATION_V1,
      },
    );
  }

  if (
    normalized(input.consumer_confirmation)
      !== VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONSUMER_CONFIRMATION_V1
  ) {
    return held(
      "exact_consumer_confirmation_required",
      {
        required_confirmation:
          VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONSUMER_CONFIRMATION_V1,
      },
    );
  }

  return {
    ok: true,
    status: "authorized",
    activation_authorized: true,
    mutation_performed: false,
    request_id: requestId,
    maximum_admission_packet_invocations: 1,
    maximum_approval_envelope_invocations: 1,
    maximum_approval_consumer_invocations: 1,
  };
}
