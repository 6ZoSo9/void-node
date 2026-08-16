import {
  VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1,
  runBuyVoidPipelineCommandV1,
} from "./buy_void_pipeline_coordinator_v1.js";
import {
  VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1,
} from "./buy_void_native_execution_worker_v1.js";
import {
  runBuyVoidNativeExecutionRuntimeCommandV1,
} from "./buy_void_native_execution_runtime_v1.js";
import {
  VOID_BUY_VOID_CONFIRMED_CLOSEOUT_CONFIRMATION_V1,
  runBuyVoidConfirmedCloseoutV1,
} from "./buy_void_confirmed_closeout_v1.js";

export const VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_V1 =
  "VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_V1";

export const VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_CONFIRMATION_V1 =
  "buyVoidRunBoundedAutomaticFulfillmentStage";

export const VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_AUTHORITY_V1 = {
  one_request_per_invocation: true,
  max_requests_per_invocation: 1,
  one_stage_transition_per_invocation: true,
  disabled_by_policy_default: true,
  dry_by_default: true,
  exact_confirmation_required: true,
  exact_delegated_confirmation_required: true,
  exact_payment_identity_binding_delegated: true,
  claim_before_reservation: false,
  inventory_reservation_before_new_paid_claim: true,
  paid_unreservable_terminal_obligation_required: true,
  durable_reservation_before_execution: true,
  prepared_transaction_hash_before_broadcast: true,
  no_retry_after_possible_broadcast: true,
  unknown_broadcast_requires_reconciliation: true,
  confirmed_delivery_before_closeout: true,
  background_loop: false,
  startup_execution: false,
  automatic_retry: false,
  raw_signed_transaction_persistence: false,
  raw_signed_transaction_output: false,
  credential_value_logging: false,
  runtime_route_mount: false,
  wallet_access_only_in_execute_stage_apply: true,
  money_movement_only_in_execute_stage_apply: true,
  inventory_decrement_only_in_confirmed_closeout: true,
} as const;

export type BuyVoidBoundedAutoFulfillmentStageV1 =
  | "observe_and_claim"
  | "reserve_inventory_and_attempt"
  | "execute_reserved_plan"
  | "reconcile_possible_broadcast"
  | "closeout_confirmed_delivery";

export type BuyVoidBoundedAutoFulfillmentSnapshotV1 = {
  request_id: string;
  canonical_payment_identity?: string;
  public_status?: string;
  claim_status?: "missing" | "claimed";
  attempt_id?: string;
  attempt_status?:
    | "missing"
    | "reserved"
    | "prepared"
    | "broadcast"
    | "confirmed"
    | "failed_retryable"
    | "failed_terminal";
  broadcast_status?:
    | "none"
    | "not_broadcast"
    | "broadcast_unknown"
    | "broadcast_accepted"
    | "reverted"
    | "confirmed";
};

export type BuyVoidBoundedAutoFulfillmentDependenciesV1 = {
  run_pipeline_command?: (
    command: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  run_native_execution_command?: (
    command: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  run_confirmed_closeout?: (
    command: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
};

export type BuyVoidBoundedAutoFulfillmentInputV1 = {
  root_dir: string;
  request_dir?: string;
  snapshot: BuyVoidBoundedAutoFulfillmentSnapshotV1;
  stage_command?: Record<string, unknown>;
  apply?: boolean;
  confirmation?: unknown;
  delegated_confirmation?: unknown;
  dependencies?: BuyVoidBoundedAutoFulfillmentDependenciesV1;
};

export type BuyVoidBoundedAutoFulfillmentDecisionV1 =
  | {
      ok: true;
      status: "dry_run";
      applied: false;
      mutation_performed: false;
      terminal: boolean;
      selected_stage: BuyVoidBoundedAutoFulfillmentStageV1 | null;
      required_confirmation:
        typeof VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_CONFIRMATION_V1;
      required_delegated_confirmation: string | null;
      automatic_retry: false;
      stage_transition_count: 0;
      wallet_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
    }
  | {
      ok: true;
      status: "applied";
      applied: true;
      mutation_performed: boolean;
      terminal: false;
      selected_stage: BuyVoidBoundedAutoFulfillmentStageV1;
      delegated_result: unknown;
      automatic_retry: false;
      stage_transition_count: 1;
      wallet_access_performed: boolean;
      signing_performed: boolean;
      transaction_broadcast_performed: boolean;
      money_movement_performed: boolean;
    }
  | {
      ok: false;
      status: "held";
      applied: boolean;
      mutation_performed: false;
      terminal: boolean;
      selected_stage: BuyVoidBoundedAutoFulfillmentStageV1 | null;
      reason: string;
      detail?: Record<string, unknown>;
      automatic_retry: false;
      stage_transition_count: 0;
      wallet_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
    };

const SAFE_ID = /^[A-Za-z0-9._:-]{3,200}$/;

function held(input: {
  apply: boolean;
  terminal?: boolean;
  stage?: BuyVoidBoundedAutoFulfillmentStageV1 | null;
  reason: string;
  detail?: Record<string, unknown>;
}): BuyVoidBoundedAutoFulfillmentDecisionV1 {
  return {
    ok: false,
    status: "held",
    applied: input.apply,
    mutation_performed: false,
    terminal: input.terminal === true,
    selected_stage: input.stage || null,
    reason: input.reason,
    ...(input.detail ? { detail: input.detail } : {}),
    automatic_retry: false,
    stage_transition_count: 0,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  };
}

function normalized(value: unknown): string {
  return String(value || "").trim();
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function selectedStage(
  snapshot: BuyVoidBoundedAutoFulfillmentSnapshotV1,
): {
  terminal: boolean;
  stage: BuyVoidBoundedAutoFulfillmentStageV1 | null;
  reason?: string;
} {
  const publicStatus = normalized(snapshot.public_status).toLowerCase();
  const claimStatus = normalized(snapshot.claim_status).toLowerCase();
  const attemptStatus = normalized(snapshot.attempt_status).toLowerCase();
  const broadcastStatus = normalized(snapshot.broadcast_status).toLowerCase();

  if (publicStatus === "fulfilled") {
    return { terminal: true, stage: null };
  }
  if (!claimStatus || claimStatus === "missing") {
    return { terminal: false, stage: "observe_and_claim" };
  }
  if (claimStatus !== "claimed") {
    return { terminal: false, stage: null, reason: "unsupported_claim_status" };
  }
  if (!attemptStatus || attemptStatus === "missing") {
    return { terminal: false, stage: "reserve_inventory_and_attempt" };
  }
  if (
    attemptStatus === "confirmed" ||
    broadcastStatus === "confirmed"
  ) {
    return { terminal: false, stage: "closeout_confirmed_delivery" };
  }
  if (
    broadcastStatus === "broadcast_unknown" ||
    broadcastStatus === "broadcast_accepted" ||
    attemptStatus === "broadcast"
  ) {
    return { terminal: false, stage: "reconcile_possible_broadcast" };
  }
  if (
    attemptStatus === "reserved" ||
    attemptStatus === "prepared" ||
    attemptStatus === "failed_retryable" ||
    broadcastStatus === "not_broadcast" ||
    broadcastStatus === "reverted"
  ) {
    return { terminal: false, stage: "execute_reserved_plan" };
  }
  return {
    terminal: false,
    stage: null,
    reason: "unsupported_or_terminal_attempt_state",
  };
}

function requiredDelegatedConfirmation(
  stage: BuyVoidBoundedAutoFulfillmentStageV1,
  stageCommand: Record<string, unknown> | null,
): string | null {
  if (stage === "observe_and_claim") {
    return VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.verify_reserve_and_claim;
  }
  if (stage === "reserve_inventory_and_attempt") {
    return VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.reserve_execution;
  }
  if (stage === "execute_reserved_plan") {
    return VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1;
  }
  if (stage === "closeout_confirmed_delivery") {
    return VOID_BUY_VOID_CONFIRMED_CLOSEOUT_CONFIRMATION_V1;
  }
  const action = normalized(stageCommand?.action);
  const allowed = new Set([
    "record_not_broadcast",
    "record_broadcast_unknown",
    "record_broadcast_accepted",
    "record_reverted",
    "record_confirmed",
  ]);
  if (!allowed.has(action)) return null;
  return (
    VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1 as Record<string, string>
  )[action] || null;
}

function defaultDependencies():
  Required<BuyVoidBoundedAutoFulfillmentDependenciesV1> {
  return {
    run_pipeline_command: async (command) =>
      runBuyVoidPipelineCommandV1(command as never),
    run_native_execution_command: async (command) =>
      runBuyVoidNativeExecutionRuntimeCommandV1(command as never),
    run_confirmed_closeout: async (command) =>
      runBuyVoidConfirmedCloseoutV1(command as never),
  };
}

function delegatedFailure(
  result: unknown,
): { reason: string; detail?: Record<string, unknown> } | null {
  const value = record(result);
  if (!value) return { reason: "delegated_stage_result_not_object" };
  if (value.ok === true) return null;
  return {
    reason: normalized(value.reason) || "delegated_stage_held",
    detail: {
      delegated_status: normalized(value.status),
      delegated_reason: normalized(value.reason),
    },
  };
}

export async function runBuyVoidBoundedAutoFulfillmentOrchestratorV1(
  input: BuyVoidBoundedAutoFulfillmentInputV1,
): Promise<BuyVoidBoundedAutoFulfillmentDecisionV1> {
  const apply = input?.apply === true;
  const rootDir = normalized(input?.root_dir);
  const requestDir = normalized(input?.request_dir);
  const snapshot = input?.snapshot;
  const requestId = normalized(snapshot?.request_id);

  if (!rootDir) {
    return held({
      apply,
      stage: null,
      reason: "server_controlled_root_dir_required",
    });
  }
  if (!snapshot || !SAFE_ID.test(requestId)) {
    return held({
      apply,
      stage: null,
      reason: "invalid_or_missing_snapshot",
    });
  }

  const selected = selectedStage(snapshot);
  if (!selected.stage) {
    if (selected.terminal) {
      if (apply) {
        return held({
          apply,
          terminal: true,
          stage: null,
          reason: "request_already_fulfilled",
        });
      }
      return {
        ok: true,
        status: "dry_run",
        applied: false,
        mutation_performed: false,
        terminal: true,
        selected_stage: null,
        required_confirmation:
          VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_CONFIRMATION_V1,
        required_delegated_confirmation: null,
        automatic_retry: false,
        stage_transition_count: 0,
        wallet_access_performed: false,
        signing_performed: false,
        transaction_broadcast_performed: false,
        money_movement_performed: false,
      };
    }
    return held({
      apply,
      stage: null,
      reason: selected.reason || "next_stage_not_resolved",
    });
  }

  const stageCommand = record(input.stage_command);
  const delegatedConfirmation = requiredDelegatedConfirmation(
    selected.stage,
    stageCommand,
  );

  if (!apply) {
    return {
      ok: true,
      status: "dry_run",
      applied: false,
      mutation_performed: false,
      terminal: false,
      selected_stage: selected.stage,
      required_confirmation:
        VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_CONFIRMATION_V1,
      required_delegated_confirmation: delegatedConfirmation,
      automatic_retry: false,
      stage_transition_count: 0,
      wallet_access_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    };
  }

  if (
    normalized(input.confirmation) !==
    VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_CONFIRMATION_V1
  ) {
    return held({
      apply: true,
      stage: selected.stage,
      reason: "explicit_orchestrator_confirmation_required",
      detail: {
        required_confirmation:
          VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_CONFIRMATION_V1,
      },
    });
  }
  if (!stageCommand) {
    return held({
      apply: true,
      stage: selected.stage,
      reason: "stage_command_required_for_apply",
    });
  }
  if (!delegatedConfirmation) {
    return held({
      apply: true,
      stage: selected.stage,
      reason: "delegated_stage_confirmation_not_resolved",
    });
  }
  if (
    normalized(input.delegated_confirmation) !==
    delegatedConfirmation
  ) {
    return held({
      apply: true,
      stage: selected.stage,
      reason: "exact_delegated_confirmation_required",
      detail: { required_delegated_confirmation: delegatedConfirmation },
    });
  }

  const commandRequestId = normalized(stageCommand.request_id);
  if (commandRequestId && commandRequestId !== requestId) {
    return held({
      apply: true,
      stage: selected.stage,
      reason: "stage_command_request_id_mismatch",
    });
  }

  const dependencies = {
    ...defaultDependencies(),
    ...(input.dependencies || {}),
  };
  let delegatedResult: unknown;

  if (
    selected.stage === "observe_and_claim" ||
    selected.stage === "reserve_inventory_and_attempt" ||
    selected.stage === "reconcile_possible_broadcast"
  ) {
    const expectedAction =
      selected.stage === "observe_and_claim"
        ? "verify_reserve_and_claim"
        : selected.stage === "reserve_inventory_and_attempt"
          ? "reserve_execution"
          : normalized(stageCommand.action);
    if (normalized(stageCommand.action) !== expectedAction) {
      return held({
        apply: true,
        stage: selected.stage,
        reason: "stage_command_action_mismatch",
        detail: { expected_action: expectedAction },
      });
    }
    delegatedResult = await dependencies.run_pipeline_command({
      ...stageCommand,
      request_id: commandRequestId || requestId,
      root_dir: rootDir,
      apply: true,
      confirmation: delegatedConfirmation,
    });
  } else if (selected.stage === "execute_reserved_plan") {
    const snapshotAttemptId = normalized(snapshot.attempt_id);
    const commandAttemptId = normalized(stageCommand.attempt_id);
    if (
      !snapshotAttemptId ||
      !commandAttemptId ||
      snapshotAttemptId !== commandAttemptId
    ) {
      return held({
        apply: true,
        stage: selected.stage,
        reason: "execution_attempt_id_mismatch",
      });
    }
    delegatedResult = await dependencies.run_native_execution_command({
      ...stageCommand,
      root_dir: rootDir,
      apply: true,
      confirmation: delegatedConfirmation,
    });
  } else {
    const snapshotAttemptId = normalized(snapshot.attempt_id);
    const commandAttemptId = normalized(stageCommand.attempt_id);
    if (
      !snapshotAttemptId ||
      !commandAttemptId ||
      snapshotAttemptId !== commandAttemptId
    ) {
      return held({
        apply: true,
        stage: selected.stage,
        reason: "closeout_attempt_id_mismatch",
      });
    }
    const rawPolicy = record(stageCommand.policy) || {};
    delegatedResult = await dependencies.run_confirmed_closeout({
      ...stageCommand,
      attempt_id: commandAttemptId,
      policy: {
        ...rawPolicy,
        root_dir: rootDir,
        ...(requestDir ? { request_dir: requestDir } : {}),
      },
      apply: true,
      confirmation: delegatedConfirmation,
    });
  }

  const delegatedHeld = delegatedFailure(delegatedResult);
  if (delegatedHeld) {
    return held({
      apply: true,
      stage: selected.stage,
      reason: delegatedHeld.reason,
      detail: delegatedHeld.detail,
    });
  }

  const result = record(delegatedResult) || {};
  const executeStage = selected.stage === "execute_reserved_plan";
  return {
    ok: true,
    status: "applied",
    applied: true,
    mutation_performed:
      result.mutation_performed === true || result.applied === true,
    terminal: false,
    selected_stage: selected.stage,
    delegated_result: delegatedResult,
    automatic_retry: false,
    stage_transition_count: 1,
    wallet_access_performed:
      executeStage && result.wallet_access_performed === true,
    signing_performed:
      executeStage && result.signing_performed === true,
    transaction_broadcast_performed:
      executeStage &&
      result.transaction_broadcast_performed === true,
    money_movement_performed:
      executeStage && result.money_movement_performed === true,
  };
}
