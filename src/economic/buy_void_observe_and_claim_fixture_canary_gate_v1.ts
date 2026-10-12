import type {
  BuyVoidBoundedOrchestratorActivationPlanV1,
} from "./buy_void_bounded_orchestrator_apply_activation_gate_v1.js";

export const VOID_BUY_VOID_OBSERVE_AND_CLAIM_FIXTURE_CANARY_GATE_V1 =
  "VOID_BUY_VOID_OBSERVE_AND_CLAIM_FIXTURE_CANARY_GATE_V1";

export const VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANARY_CONFIRMATION_V1 =
  "buyVoidArmExactObserveAndClaimCanary";

export const VOID_BUY_VOID_OBSERVE_AND_CLAIM_FIXTURE_CANARY_AUTHORITY_V1 = {
  fixture_only_v1: true,
  live_activation_mounted_v1: false,
  disabled_by_default: true,
  default_enabled_stage_count: 0,
  default_exact_request_allowlist_count: 0,
  candidate_stage: "observe_and_claim",
  allowed_stage_count_when_armed: 1,
  exact_request_allowlist_required: true,
  exact_request_allowlist_count_when_armed: 1,
  server_derived_activation_plan_required: true,
  exact_plan_fingerprint_echo_required: true,
  exact_orchestrator_confirmation_required: true,
  exact_delegated_confirmation_required: true,
  exact_stage_confirmation_required: true,
  exact_canary_confirmation_required: true,
  operator_approval_required: true,
  one_request_per_invocation: true,
  one_stage_transition_per_invocation: true,
  maximum_successful_canary_mutations: 1,
  automatic_retry: false,
  auto_disable_after_terminal_outcome: true,
  no_retry_after_uncertain_mutation: true,
  pre_post_claim_journal_hashes_required: true,
  pre_post_public_queue_hashes_required: true,
  signed_operator_receipt_required: true,
  inventory_reservation: false,
  execution_attempt_reservation: false,
  inventory_decrement: false,
  inventory_release: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  rpc_mutation: false,
  money_movement: false,
  background_loop: false,
  startup_execution: false,
  filesystem_write: false,
} as const;

export type BuyVoidObserveAndClaimFixtureCanaryPolicyV1 = {
  enabled: boolean;
  exact_request_ids: string[];
  maximum_successful_canary_mutations: 1;
};

export const VOID_BUY_VOID_OBSERVE_AND_CLAIM_FIXTURE_CANARY_DEFAULT_POLICY_V1:
  BuyVoidObserveAndClaimFixtureCanaryPolicyV1 = {
    enabled: false,
    exact_request_ids: [],
    maximum_successful_canary_mutations: 1,
  };

export type BuyVoidObserveAndClaimFixtureCanaryDecisionV1 =
  | {
      ok: true;
      status: "planned";
      apply_requested: false;
      canary_authorized: false;
      fixture_only: true;
      live_activation_mounted: false;
      selected_stage: "observe_and_claim";
      request_id: string;
      plan_fingerprint_sha256: string;
      required_canary_confirmation:
        typeof VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANARY_CONFIRMATION_V1;
      successful_canary_mutation_count: number;
      maximum_successful_canary_mutations: 1;
      mutation_performed: false;
      inventory_reservation_performed: false;
      execution_attempt_reservation_performed: false;
      wallet_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      rpc_mutation_performed: false;
      money_movement_performed: false;
    }
  | {
      ok: true;
      status: "authorized";
      apply_requested: true;
      canary_authorized: true;
      fixture_only: true;
      live_activation_mounted: false;
      selected_stage: "observe_and_claim";
      request_id: string;
      plan_fingerprint_sha256: string;
      required_canary_confirmation:
        typeof VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANARY_CONFIRMATION_V1;
      successful_canary_mutation_count: number;
      maximum_successful_canary_mutations: 1;
      mutation_performed: false;
      inventory_reservation_performed: false;
      execution_attempt_reservation_performed: false;
      wallet_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      rpc_mutation_performed: false;
      money_movement_performed: false;
    }
  | {
      ok: false;
      status: "held";
      apply_requested: boolean;
      canary_authorized: false;
      fixture_only: true;
      live_activation_mounted: false;
      reason: string;
      request_id: string | null;
      plan_fingerprint_sha256: string | null;
      detail?: Record<string, unknown>;
      successful_canary_mutation_count: number;
      maximum_successful_canary_mutations: 1;
      mutation_performed: false;
      inventory_reservation_performed: false;
      execution_attempt_reservation_performed: false;
      wallet_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      rpc_mutation_performed: false;
      money_movement_performed: false;
    };

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{3,160}$/;
const SAFE_SHA256 = /^[0-9a-f]{64}$/;

function normalized(value: unknown): string {
  return String(value || "").trim();
}

function normalizedLower(value: unknown): string {
  return normalized(value).toLowerCase();
}

function count(value: unknown): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0
    ? parsed
    : 0;
}

function policyState(
  policy: BuyVoidObserveAndClaimFixtureCanaryPolicyV1 | undefined,
): {
  enabled: boolean;
  exact_request_ids: string[];
  maximum_successful_canary_mutations: 1;
} {
  const exact = Array.isArray(policy?.exact_request_ids)
    ? Array.from(new Set(
        policy.exact_request_ids
          .map((value) => normalized(value))
          .filter((value) => SAFE_REQUEST_ID.test(value)),
      )).sort()
    : [];
  return {
    enabled: policy?.enabled === true,
    exact_request_ids: exact,
    maximum_successful_canary_mutations: 1,
  };
}

function held(input: {
  apply_requested: boolean;
  reason: string;
  request_id?: string | null;
  plan_fingerprint_sha256?: string | null;
  successful_canary_mutation_count: number;
  detail?: Record<string, unknown>;
}): BuyVoidObserveAndClaimFixtureCanaryDecisionV1 {
  return {
    ok: false,
    status: "held",
    apply_requested: input.apply_requested,
    canary_authorized: false,
    fixture_only: true,
    live_activation_mounted: false,
    reason: input.reason,
    request_id: input.request_id || null,
    plan_fingerprint_sha256:
      input.plan_fingerprint_sha256 || null,
    ...(input.detail ? { detail: input.detail } : {}),
    successful_canary_mutation_count:
      input.successful_canary_mutation_count,
    maximum_successful_canary_mutations: 1,
    mutation_performed: false,
    inventory_reservation_performed: false,
    execution_attempt_reservation_performed: false,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    rpc_mutation_performed: false,
    money_movement_performed: false,
  };
}

function validatePlan(
  plan: BuyVoidBoundedOrchestratorActivationPlanV1 | undefined,
):
  | {
      request_id: string;
      plan_fingerprint_sha256: string;
    }
  | {
      reason: string;
      request_id: string | null;
      plan_fingerprint_sha256: string | null;
    } {
  if (!plan) {
    return {
      reason: "activation_plan_required",
      request_id: null,
      plan_fingerprint_sha256: null,
    };
  }

  const requestId = normalized(plan.request_id);
  const fingerprint = normalizedLower(
    plan.plan_fingerprint_sha256,
  );

  if (!SAFE_REQUEST_ID.test(requestId)) {
    return {
      reason: "valid_activation_plan_request_id_required",
      request_id: null,
      plan_fingerprint_sha256:
        SAFE_SHA256.test(fingerprint) ? fingerprint : null,
    };
  }
  if (!SAFE_SHA256.test(fingerprint)) {
    return {
      reason: "valid_activation_plan_fingerprint_required",
      request_id: requestId,
      plan_fingerprint_sha256: null,
    };
  }
  if (plan?.selected_stage !== "observe_and_claim") {
    return {
      reason: "observe_and_claim_stage_required",
      request_id: requestId,
      plan_fingerprint_sha256: fingerprint,
    };
  }
  if (plan.wallet_access_authorized !== false
    || plan.signing_authorized !== false
    || plan.transaction_broadcast_authorized !== false
    || plan.money_movement_authorized !== false) {
    return {
      reason: "non_money_activation_plan_required",
      request_id: requestId,
      plan_fingerprint_sha256: fingerprint,
    };
  }
  return {
    request_id: requestId,
    plan_fingerprint_sha256: fingerprint,
  };
}

export function buyVoidObserveAndClaimFixtureCanaryStatusV1():
  Record<string, unknown> {
  return {
    marker:
      VOID_BUY_VOID_OBSERVE_AND_CLAIM_FIXTURE_CANARY_GATE_V1,
    version: 1,
    ok: true,
    fixture_only: true,
    live_activation_mounted: false,
    enabled: false,
    enabled_stage_count: 0,
    exact_request_allowlist_count: 0,
    candidate_stage: "observe_and_claim",
    required_canary_confirmation:
      VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANARY_CONFIRMATION_V1,
    authority:
      VOID_BUY_VOID_OBSERVE_AND_CLAIM_FIXTURE_CANARY_AUTHORITY_V1,
  };
}

export function evaluateBuyVoidObserveAndClaimFixtureCanaryV1(input: {
  policy?: BuyVoidObserveAndClaimFixtureCanaryPolicyV1;
  activation_plan?: BuyVoidBoundedOrchestratorActivationPlanV1;
  apply?: boolean;
  plan_fingerprint?: unknown;
  orchestrator_confirmation?: unknown;
  delegated_confirmation?: unknown;
  stage_confirmation?: unknown;
  canary_confirmation?: unknown;
  successful_canary_mutation_count?: unknown;
}): BuyVoidObserveAndClaimFixtureCanaryDecisionV1 {
  const applyRequested = input?.apply === true;
  const successfulCount = count(
    input?.successful_canary_mutation_count,
  );
  const policy = policyState(input?.policy);
  const validated = validatePlan(input?.activation_plan);

  if ("reason" in validated) {
    return held({
      apply_requested: applyRequested,
      reason: validated.reason,
      request_id: validated.request_id,
      plan_fingerprint_sha256:
        validated.plan_fingerprint_sha256,
      successful_canary_mutation_count: successfulCount,
    });
  }

  const requestId = validated.request_id;
  const fingerprint = validated.plan_fingerprint_sha256;
  const plan = input.activation_plan as
    BuyVoidBoundedOrchestratorActivationPlanV1;

  if (!applyRequested) {
    return {
      ok: true,
      status: "planned",
      apply_requested: false,
      canary_authorized: false,
      fixture_only: true,
      live_activation_mounted: false,
      selected_stage: "observe_and_claim",
      request_id: requestId,
      plan_fingerprint_sha256: fingerprint,
      required_canary_confirmation:
        VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANARY_CONFIRMATION_V1,
      successful_canary_mutation_count: successfulCount,
      maximum_successful_canary_mutations: 1,
      mutation_performed: false,
      inventory_reservation_performed: false,
      execution_attempt_reservation_performed: false,
      wallet_access_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      rpc_mutation_performed: false,
      money_movement_performed: false,
    };
  }

  if (!policy.enabled) {
    return held({
      apply_requested: true,
      reason: "observe_and_claim_canary_disabled",
      request_id: requestId,
      plan_fingerprint_sha256: fingerprint,
      successful_canary_mutation_count: successfulCount,
      detail: {
        enabled_stage_count: 0,
        exact_request_allowlist_count: 0,
      },
    });
  }

  if (policy.exact_request_ids.length !== 1) {
    return held({
      apply_requested: true,
      reason: "exact_one_request_allowlist_required",
      request_id: requestId,
      plan_fingerprint_sha256: fingerprint,
      successful_canary_mutation_count: successfulCount,
      detail: {
        exact_request_allowlist_count:
          policy.exact_request_ids.length,
      },
    });
  }

  if (!policy.exact_request_ids.includes(requestId)) {
    return held({
      apply_requested: true,
      reason: "request_not_canary_allowlisted",
      request_id: requestId,
      plan_fingerprint_sha256: fingerprint,
      successful_canary_mutation_count: successfulCount,
      detail: {
        exact_request_id: policy.exact_request_ids[0],
      },
    });
  }

  if (successfulCount >= 1) {
    return held({
      apply_requested: true,
      reason: "maximum_successful_canary_mutations_reached",
      request_id: requestId,
      plan_fingerprint_sha256: fingerprint,
      successful_canary_mutation_count: successfulCount,
    });
  }

  if (normalizedLower(input.plan_fingerprint) !== fingerprint) {
    return held({
      apply_requested: true,
      reason: "exact_plan_fingerprint_required",
      request_id: requestId,
      plan_fingerprint_sha256: fingerprint,
      successful_canary_mutation_count: successfulCount,
      detail: {
        required_plan_fingerprint: fingerprint,
      },
    });
  }

  if (
    normalized(input.orchestrator_confirmation)
    !== plan.required_orchestrator_confirmation
  ) {
    return held({
      apply_requested: true,
      reason: "exact_orchestrator_confirmation_required",
      request_id: requestId,
      plan_fingerprint_sha256: fingerprint,
      successful_canary_mutation_count: successfulCount,
      detail: {
        required_confirmation:
          plan.required_orchestrator_confirmation,
      },
    });
  }

  if (
    normalized(input.delegated_confirmation)
    !== plan.required_delegated_confirmation
  ) {
    return held({
      apply_requested: true,
      reason: "exact_delegated_confirmation_required",
      request_id: requestId,
      plan_fingerprint_sha256: fingerprint,
      successful_canary_mutation_count: successfulCount,
      detail: {
        required_delegated_confirmation:
          plan.required_delegated_confirmation,
      },
    });
  }

  if (
    normalized(input.stage_confirmation)
    !== plan.required_stage_confirmation
  ) {
    return held({
      apply_requested: true,
      reason: "exact_stage_confirmation_required",
      request_id: requestId,
      plan_fingerprint_sha256: fingerprint,
      successful_canary_mutation_count: successfulCount,
      detail: {
        required_stage_confirmation:
          plan.required_stage_confirmation,
      },
    });
  }

  if (
    normalized(input.canary_confirmation)
    !== VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANARY_CONFIRMATION_V1
  ) {
    return held({
      apply_requested: true,
      reason: "exact_canary_confirmation_required",
      request_id: requestId,
      plan_fingerprint_sha256: fingerprint,
      successful_canary_mutation_count: successfulCount,
      detail: {
        required_canary_confirmation:
          VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANARY_CONFIRMATION_V1,
      },
    });
  }

  return {
    ok: true,
    status: "authorized",
    apply_requested: true,
    canary_authorized: true,
    fixture_only: true,
    live_activation_mounted: false,
    selected_stage: "observe_and_claim",
    request_id: requestId,
    plan_fingerprint_sha256: fingerprint,
    required_canary_confirmation:
      VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANARY_CONFIRMATION_V1,
    successful_canary_mutation_count: successfulCount,
    maximum_successful_canary_mutations: 1,
    mutation_performed: false,
    inventory_reservation_performed: false,
    execution_attempt_reservation_performed: false,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    rpc_mutation_performed: false,
    money_movement_performed: false,
  };
}
