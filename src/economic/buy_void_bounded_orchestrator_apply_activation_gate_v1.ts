import { createHash } from "node:crypto";
import {
  VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_CONFIRMATION_V1,
  type BuyVoidBoundedAutoFulfillmentDecisionV1,
  type BuyVoidBoundedAutoFulfillmentSnapshotV1,
  type BuyVoidBoundedAutoFulfillmentStageV1,
} from "./buy_void_bounded_auto_fulfillment_orchestrator_v1.js";
import type {
  BuyVoidBoundedOrchestratorServerSnapshotEvidenceV1,
} from "./buy_void_bounded_orchestrator_server_snapshot_v1.js";

export const VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ACTIVATION_GATE_V1 =
  "VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ACTIVATION_GATE_V1";

export const VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_PLAN_CONFIRMATION_V1 =
  "buyVoidConfirmServerDerivedBoundedOrchestratorPlan";

export const VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_STAGE_CONFIRMATIONS_V1 = {
  observe_and_claim: "buyVoidApplyObserveAndClaim",
  reserve_inventory_and_attempt:
    "buyVoidApplyReserveInventoryAndAttempt",
} as const;

export const VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_HARD_FORBIDDEN_STAGES_V1 = [
  "execute_reserved_plan",
  "reconcile_possible_broadcast",
  "closeout_confirmed_delivery",
] as const satisfies readonly BuyVoidBoundedAutoFulfillmentStageV1[];

export const VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ACTIVATION_AUTHORITY_V1 = {
  disabled_by_default: true,
  default_enabled_stage_count: 0,
  request_id_only_selector: true,
  server_derived_snapshot_required: true,
  client_supplied_snapshot_forbidden: true,
  server_derived_plan_fingerprint_required: true,
  exact_plan_fingerprint_echo_required: true,
  exact_orchestrator_confirmation_required: true,
  exact_delegated_confirmation_required: true,
  exact_stage_confirmation_required: true,
  stage_allowlist_required: true,
  one_request_per_invocation: true,
  one_stage_transition_per_invocation: true,
  non_money_candidate_stage_count: 2,
  hard_forbidden_stage_count: 3,
  automatic_retry: false,
  operator_loopback_only_delegated_to_runtime: true,
  runtime_execution_mounted_v1: true,
  background_loop: false,
  startup_execution: false,
  filesystem_write: false,
  rpc_call: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  money_movement: false,
} as const;

export type BuyVoidBoundedOrchestratorApplyActivationPolicyV1 = {
  enabled: boolean;
  allowed_stages: BuyVoidBoundedAutoFulfillmentStageV1[];
};

export const VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ACTIVATION_DEFAULT_POLICY_V1:
  BuyVoidBoundedOrchestratorApplyActivationPolicyV1 = {
    enabled: false,
    allowed_stages: [],
  };

export type BuyVoidBoundedOrchestratorActivationPlanV1 = {
  schema: "void_buy_void_bounded_orchestrator_activation_plan_v1";
  marker:
    typeof VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ACTIVATION_GATE_V1;
  version: 1;
  request_id: string;
  canonical_payment_identity: string | null;
  attempt_id: string | null;
  public_status: string | null;
  claim_status: string | null;
  attempt_status: string | null;
  broadcast_status: string | null;
  selected_stage: BuyVoidBoundedAutoFulfillmentStageV1;
  stage_command: Record<string, unknown> | null;
  required_orchestrator_confirmation:
    typeof VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_CONFIRMATION_V1;
  required_delegated_confirmation: string;
  required_plan_confirmation:
    typeof VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_PLAN_CONFIRMATION_V1;
  required_stage_confirmation: string;
  operator_event_files: string[];
  operator_event_count: number;
  fulfilled_event_count: number;
  claim_count: number;
  attempt_count: number;
  confirmed_state_count: number;
  selected_attempt_number: number | null;
  confirmed_state_present: boolean;
  public_status_source: "request_base" | "operator_event";
  plan_fingerprint_sha256: string;
  wallet_access_authorized: false;
  signing_authorized: false;
  transaction_broadcast_authorized: false;
  money_movement_authorized: false;
};

export type BuyVoidBoundedOrchestratorApplyActivationDecisionV1 =
  | {
      ok: true;
      status: "planned";
      apply_requested: false;
      apply_authorized: false;
      mutation_performed: false;
      plan: BuyVoidBoundedOrchestratorActivationPlanV1;
      policy_enabled: boolean;
      allowed_stage_count: number;
      automatic_retry: false;
      stage_transition_count: 0;
      wallet_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
    }
  | {
      ok: true;
      status: "authorized";
      apply_requested: true;
      apply_authorized: true;
      mutation_performed: false;
      plan: BuyVoidBoundedOrchestratorActivationPlanV1;
      policy_enabled: true;
      allowed_stage_count: number;
      automatic_retry: false;
      stage_transition_count: 0;
      wallet_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
    }
  | {
      ok: false;
      status: "held";
      apply_requested: boolean;
      apply_authorized: false;
      mutation_performed: false;
      reason: string;
      plan: BuyVoidBoundedOrchestratorActivationPlanV1 | null;
      detail?: Record<string, unknown>;
      automatic_retry: false;
      stage_transition_count: 0;
      wallet_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
    };

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{3,160}$/;
const SAFE_SHA256 = /^[0-9a-f]{64}$/;
const MAX_CANONICAL_DEPTH = 12;
const MAX_CANONICAL_KEYS = 256;
const MAX_CANONICAL_ARRAY = 256;
const MAX_CANONICAL_STRING = 16_384;

const CANDIDATE_STAGES = new Set<BuyVoidBoundedAutoFulfillmentStageV1>([
  "observe_and_claim",
  "reserve_inventory_and_attempt",
]);

const HARD_FORBIDDEN_STAGES =
  new Set<BuyVoidBoundedAutoFulfillmentStageV1>(
    VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_HARD_FORBIDDEN_STAGES_V1,
  );

function normalized(value: unknown): string {
  return String(value || "").trim();
}

function normalizedLower(value: unknown): string {
  return normalized(value).toLowerCase();
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function canonical(value: unknown, depth = 0): string {
  if (depth > MAX_CANONICAL_DEPTH) {
    throw new Error("activation_plan_canonical_depth_exceeded");
  }
  if (value === null) return "null";
  if (typeof value === "string") {
    if (value.length > MAX_CANONICAL_STRING) {
      throw new Error("activation_plan_string_too_large");
    }
    return JSON.stringify(value);
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("activation_plan_nonfinite_number");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_CANONICAL_ARRAY) {
      throw new Error("activation_plan_array_too_large");
    }
    return `[${value.map((item) => canonical(item, depth + 1)).join(",")}]`;
  }
  const valueRecord = record(value);
  if (!valueRecord) {
    throw new Error("activation_plan_unsupported_value");
  }
  const keys = Object.keys(valueRecord).sort();
  if (keys.length > MAX_CANONICAL_KEYS) {
    throw new Error("activation_plan_object_too_large");
  }
  return `{${keys.map((key) => {
    const child = valueRecord[key];
    if (child === undefined) {
      throw new Error("activation_plan_undefined_value");
    }
    return `${JSON.stringify(key)}:${canonical(child, depth + 1)}`;
  }).join(",")}}`;
}

function sha256Canonical(value: unknown): string {
  return createHash("sha256")
    .update(canonical(value), "utf8")
    .digest("hex");
}

function normalizePolicy(
  policy: BuyVoidBoundedOrchestratorApplyActivationPolicyV1 | undefined,
): {
  enabled: boolean;
  allowed_stages: BuyVoidBoundedAutoFulfillmentStageV1[];
} {
  const values = Array.isArray(policy?.allowed_stages)
    ? policy.allowed_stages
    : [];
  const allowed = Array.from(new Set(
    values.filter((stage):
      stage is BuyVoidBoundedAutoFulfillmentStageV1 =>
        [
          "observe_and_claim",
          "reserve_inventory_and_attempt",
          "execute_reserved_plan",
          "reconcile_possible_broadcast",
          "closeout_confirmed_delivery",
        ].includes(String(stage)),
    ),
  )).sort();
  return {
    enabled: policy?.enabled === true,
    allowed_stages: allowed,
  };
}

function normalizedEvidence(
  evidence: BuyVoidBoundedOrchestratorServerSnapshotEvidenceV1,
): {
  operator_event_files: string[];
  operator_event_count: number;
  fulfilled_event_count: number;
  claim_count: number;
  attempt_count: number;
  confirmed_state_count: number;
  selected_attempt_number: number | null;
  confirmed_state_present: boolean;
  public_status_source: "request_base" | "operator_event";
} {
  return {
    operator_event_files: [...evidence.operator_event_files].sort(),
    operator_event_count: evidence.operator_event_count,
    fulfilled_event_count: evidence.fulfilled_event_count,
    claim_count: evidence.claim_count,
    attempt_count: evidence.attempt_count,
    confirmed_state_count: evidence.confirmed_state_count,
    selected_attempt_number: evidence.selected_attempt_number,
    confirmed_state_present: evidence.confirmed_state_present,
    public_status_source: evidence.public_status_source,
  };
}

function stageConfirmation(
  stage: BuyVoidBoundedAutoFulfillmentStageV1,
): string | null {
  if (stage === "observe_and_claim") {
    return (
      VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_STAGE_CONFIRMATIONS_V1
        .observe_and_claim
    );
  }
  if (stage === "reserve_inventory_and_attempt") {
    return (
      VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_STAGE_CONFIRMATIONS_V1
        .reserve_inventory_and_attempt
    );
  }
  return null;
}

function held(input: {
  apply_requested: boolean;
  reason: string;
  plan?: BuyVoidBoundedOrchestratorActivationPlanV1 | null;
  detail?: Record<string, unknown>;
}): BuyVoidBoundedOrchestratorApplyActivationDecisionV1 {
  return {
    ok: false,
    status: "held",
    apply_requested: input.apply_requested,
    apply_authorized: false,
    mutation_performed: false,
    reason: input.reason,
    plan: input.plan || null,
    ...(input.detail ? { detail: input.detail } : {}),
    automatic_retry: false,
    stage_transition_count: 0,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  };
}

function buildPlan(input: {
  request_id: string;
  derived_snapshot: BuyVoidBoundedAutoFulfillmentSnapshotV1;
  snapshot_evidence: BuyVoidBoundedOrchestratorServerSnapshotEvidenceV1;
  dry_run_decision: BuyVoidBoundedAutoFulfillmentDecisionV1;
  stage_command?: Record<string, unknown>;
}):
  | { plan: BuyVoidBoundedOrchestratorActivationPlanV1 }
  | { reason: string; detail?: Record<string, unknown> } {
  const requestId = normalized(input.request_id);
  if (!SAFE_REQUEST_ID.test(requestId)) {
    return { reason: "invalid_request_id" };
  }
  if (normalized(input.derived_snapshot.request_id) !== requestId) {
    return { reason: "derived_snapshot_request_id_mismatch" };
  }
  if (
    input.dry_run_decision.status !== "dry_run" ||
    input.dry_run_decision.ok !== true ||
    input.dry_run_decision.applied !== false
  ) {
    return { reason: "successful_dry_run_decision_required" };
  }
  const stage = input.dry_run_decision.selected_stage;
  if (!stage) {
    return {
      reason: input.dry_run_decision.terminal
        ? "terminal_request_has_no_apply_stage"
        : "dry_run_selected_stage_required",
    };
  }
  const delegatedConfirmation = normalized(
    input.dry_run_decision.required_delegated_confirmation,
  );
  if (!delegatedConfirmation) {
    return {
      reason: "delegated_stage_confirmation_required_for_plan",
      detail: { selected_stage: stage },
    };
  }
  const requiredStageConfirmation = stageConfirmation(stage);
  if (!requiredStageConfirmation) {
    if (HARD_FORBIDDEN_STAGES.has(stage)) {
      return {
        reason: "money_or_terminal_stage_hard_forbidden",
        detail: { selected_stage: stage },
      };
    }
    return {
      reason: "stage_confirmation_not_defined",
      detail: { selected_stage: stage },
    };
  }

  const stageCommand = input.stage_command
    ? record(input.stage_command)
    : null;
  if (input.stage_command && !stageCommand) {
    return { reason: "stage_command_must_be_object" };
  }

  const base:
    Omit<
      BuyVoidBoundedOrchestratorActivationPlanV1,
      "plan_fingerprint_sha256"
    > = {
    schema: "void_buy_void_bounded_orchestrator_activation_plan_v1",
    marker:
      VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ACTIVATION_GATE_V1,
    version: 1,
    request_id: requestId,
    canonical_payment_identity:
      normalized(input.derived_snapshot.canonical_payment_identity) || null,
    attempt_id:
      normalizedLower(input.derived_snapshot.attempt_id) || null,
    public_status:
      normalizedLower(input.derived_snapshot.public_status) || null,
    claim_status:
      normalizedLower(input.derived_snapshot.claim_status) || null,
    attempt_status:
      normalizedLower(input.derived_snapshot.attempt_status) || null,
    broadcast_status:
      normalizedLower(input.derived_snapshot.broadcast_status) || null,
    selected_stage: stage,
    stage_command: stageCommand,
    required_orchestrator_confirmation:
      VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_CONFIRMATION_V1,
    required_delegated_confirmation: delegatedConfirmation,
    required_plan_confirmation:
      VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_PLAN_CONFIRMATION_V1,
    required_stage_confirmation: requiredStageConfirmation,
    ...normalizedEvidence(input.snapshot_evidence),
    wallet_access_authorized: false,
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    money_movement_authorized: false,
  };

  let fingerprint = "";
  try {
    fingerprint = sha256Canonical(base);
  } catch (error) {
    return {
      reason: "activation_plan_fingerprint_failed",
      detail: {
        error_class: normalized(
          (error as { name?: unknown })?.name || "Error",
        ).slice(0, 80),
      },
    };
  }

  return {
    plan: {
      ...base,
      plan_fingerprint_sha256: fingerprint,
    },
  };
}

export function buyVoidBoundedOrchestratorApplyActivationStatusV1(
  policy?:
    BuyVoidBoundedOrchestratorApplyActivationPolicyV1,
): Record<string, unknown> {
  const normalizedPolicy = normalizePolicy(policy);
  return {
    marker:
      VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ACTIVATION_GATE_V1,
    version: 1,
    ok: true,
    enabled: normalizedPolicy.enabled,
    enabled_stage_count: normalizedPolicy.enabled
      ? normalizedPolicy.allowed_stages.length
      : 0,
    allowed_stages: normalizedPolicy.allowed_stages,
    non_money_candidate_stages: [
      "observe_and_claim",
      "reserve_inventory_and_attempt",
    ],
    hard_forbidden_stages:
      VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_HARD_FORBIDDEN_STAGES_V1,
    required_plan_confirmation:
      VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_PLAN_CONFIRMATION_V1,
    required_stage_confirmations:
      VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_STAGE_CONFIRMATIONS_V1,
    runtime_execution_mounted_v1: true,
    authority:
      VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ACTIVATION_AUTHORITY_V1,
  };
}

export function evaluateBuyVoidBoundedOrchestratorApplyActivationV1(input: {
  policy?: BuyVoidBoundedOrchestratorApplyActivationPolicyV1;
  request_id: string;
  derived_snapshot: BuyVoidBoundedAutoFulfillmentSnapshotV1;
  snapshot_evidence: BuyVoidBoundedOrchestratorServerSnapshotEvidenceV1;
  dry_run_decision: BuyVoidBoundedAutoFulfillmentDecisionV1;
  stage_command?: Record<string, unknown>;
  apply?: boolean;
  plan_fingerprint?: unknown;
  confirmation?: unknown;
  delegated_confirmation?: unknown;
  stage_confirmation?: unknown;
}): BuyVoidBoundedOrchestratorApplyActivationDecisionV1 {
  const applyRequested = input?.apply === true;
  const policy = normalizePolicy(input?.policy);
  const built = buildPlan({
    request_id: input?.request_id,
    derived_snapshot: input?.derived_snapshot,
    snapshot_evidence: input?.snapshot_evidence,
    dry_run_decision: input?.dry_run_decision,
    stage_command: input?.stage_command,
  });

  if ("reason" in built) {
    return held({
      apply_requested: applyRequested,
      reason: built.reason,
      detail: built.detail,
    });
  }

  const plan = built.plan;

  if (!applyRequested) {
    return {
      ok: true,
      status: "planned",
      apply_requested: false,
      apply_authorized: false,
      mutation_performed: false,
      plan,
      policy_enabled: policy.enabled,
      allowed_stage_count: policy.allowed_stages.length,
      automatic_retry: false,
      stage_transition_count: 0,
      wallet_access_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    };
  }

  if (!policy.enabled) {
    return held({
      apply_requested: true,
      reason: "apply_activation_gate_disabled",
      plan,
      detail: {
        enabled_stage_count: 0,
        required_plan_fingerprint:
          plan.plan_fingerprint_sha256,
      },
    });
  }

  if (HARD_FORBIDDEN_STAGES.has(plan.selected_stage)) {
    return held({
      apply_requested: true,
      reason: "money_or_terminal_stage_hard_forbidden",
      plan,
      detail: { selected_stage: plan.selected_stage },
    });
  }

  if (!CANDIDATE_STAGES.has(plan.selected_stage)) {
    return held({
      apply_requested: true,
      reason: "stage_not_non_money_candidate",
      plan,
      detail: { selected_stage: plan.selected_stage },
    });
  }

  if (!policy.allowed_stages.includes(plan.selected_stage)) {
    return held({
      apply_requested: true,
      reason: "stage_not_allowlisted",
      plan,
      detail: {
        selected_stage: plan.selected_stage,
        allowed_stages: policy.allowed_stages,
      },
    });
  }

  const fingerprint = normalizedLower(input.plan_fingerprint);
  if (
    !SAFE_SHA256.test(fingerprint) ||
    fingerprint !== plan.plan_fingerprint_sha256
  ) {
    return held({
      apply_requested: true,
      reason: "exact_plan_fingerprint_required",
      plan,
      detail: {
        required_plan_fingerprint:
          plan.plan_fingerprint_sha256,
      },
    });
  }

  if (
    normalized(input.confirmation) !==
    plan.required_orchestrator_confirmation
  ) {
    return held({
      apply_requested: true,
      reason: "exact_orchestrator_confirmation_required",
      plan,
      detail: {
        required_confirmation:
          plan.required_orchestrator_confirmation,
      },
    });
  }

  if (
    normalized(input.delegated_confirmation) !==
    plan.required_delegated_confirmation
  ) {
    return held({
      apply_requested: true,
      reason: "exact_delegated_confirmation_required",
      plan,
      detail: {
        required_delegated_confirmation:
          plan.required_delegated_confirmation,
      },
    });
  }

  if (
    normalized(input.stage_confirmation) !==
    plan.required_stage_confirmation
  ) {
    return held({
      apply_requested: true,
      reason: "exact_stage_confirmation_required",
      plan,
      detail: {
        required_stage_confirmation:
          plan.required_stage_confirmation,
      },
    });
  }

  return {
    ok: true,
    status: "authorized",
    apply_requested: true,
    apply_authorized: true,
    mutation_performed: false,
    plan,
    policy_enabled: true,
    allowed_stage_count: policy.allowed_stages.length,
    automatic_retry: false,
    stage_transition_count: 0,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  };
}
