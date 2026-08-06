import crypto from "node:crypto";
import path from "node:path";
import {
  applyTerminalCloseoutArtifactsV1,
  readTerminalCloseoutPlanV1,
  terminalCloseoutPlanPathV1,
  type TerminalCloseoutApplyProgressV1,
  type TerminalCloseoutArtifactResultV1,
} from "./buy_void_saga_terminal_closeout_artifacts_v1.js";
import {
  reconstructTerminalCloseoutV1,
} from "./buy_void_saga_terminal_closeout_reconstruction_v1.js";
import {
  readBuyVoidSagaTerminalCloseoutServerPolicyV1,
} from "./buy_void_saga_terminal_closeout_server_policy_v1.js";
import {
  TERMINAL_CLOSEOUT_LEASE_TTL_MS,
  TERMINAL_CLOSEOUT_SAGA_ID,
  TERMINAL_CLOSEOUT_SAGA_ROOT,
  TERMINAL_CLOSEOUT_SHA256,
  VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
  VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_V1,
  VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_AUTHORITY_V1,
  terminalNow,
  terminalSafeRoot,
  terminalText,
  type BuyVoidSagaTerminalCloseoutDecisionV1,
  type BuyVoidSagaTerminalCloseoutDependenciesV1,
  type RunBuyVoidSagaTerminalCloseoutInputV1,
  type SagaModuleV1,
} from "./buy_void_saga_terminal_closeout_model_v1.js";

export {
  VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
  VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_V1,
  VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_AUTHORITY_V1,
};
export type {
  BuyVoidSagaTerminalCloseoutDecisionV1,
  BuyVoidSagaTerminalCloseoutDependenciesV1,
  BuyVoidSagaTerminalCloseoutFaultStageV1,
  BuyVoidSagaTerminalCloseoutPlanV1,
  RunBuyVoidSagaTerminalCloseoutInputV1,
} from "./buy_void_saga_terminal_closeout_model_v1.js";

function held(
  applied: boolean,
  stage: Extract<BuyVoidSagaTerminalCloseoutDecisionV1, { ok: false }>["stage"],
  reason: string,
  options: {
    detail?: Record<string, unknown>;
    mutation_performed?: boolean;
    inventory_consumption_performed?: boolean;
    public_request_fulfilled?: boolean;
  } = {},
): Extract<BuyVoidSagaTerminalCloseoutDecisionV1, { ok: false }> {
  return {
    ok: false,
    status: "held",
    applied,
    stage,
    reason,
    ...(options.detail ? { detail: options.detail } : {}),
    mutation_performed: options.mutation_performed === true,
    inventory_consumption_performed:
      options.inventory_consumption_performed === true,
    public_request_fulfilled:
      options.public_request_fulfilled === true,
    saga_closeout_appended: false,
    automatic_retry_allowed: false,
    money_movement_performed: false,
  };
}

async function defaultSagaModule(): Promise<SagaModuleV1> {
  return await import(
    new URL(
      "../../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs",
      import.meta.url,
    ).href,
  ) as unknown as SagaModuleV1;
}

function stageFor(message: string): Extract<
  BuyVoidSagaTerminalCloseoutDecisionV1,
  { ok: false }
>["stage"] {
  if (message.includes("confirmed_state")) return "canonical_confirmed_state";
  if (message.includes("inventory")) return "inventory_consumption";
  if (message.includes("public") || message.includes("fulfilled")) {
    return "public_closeout";
  }
  if (message.includes("plan")) return "closeout_plan";
  if (message.includes("lock")) return "closeout_lock";
  if (message.includes("saga")) return "saga_reconstruction";
  return "journal_reconstruction";
}

export async function runBuyVoidSagaTerminalCloseoutV1(
  input: RunBuyVoidSagaTerminalCloseoutInputV1,
): Promise<BuyVoidSagaTerminalCloseoutDecisionV1> {
  const rootDir = terminalSafeRoot(input?.root_dir);
  const sagaId = terminalText(input?.saga_id).toLowerCase();
  if (!rootDir || !TERMINAL_CLOSEOUT_SAGA_ID.test(sagaId)) {
    return held(
      input?.apply === true,
      "input",
      "terminal_closeout_input_invalid",
    );
  }

  const policyDecision = readBuyVoidSagaTerminalCloseoutServerPolicyV1();
  if (policyDecision.ok !== true) {
    return held(
      input?.apply === true,
      "server_policy",
      policyDecision.reason,
      {
        detail: {
          missing_envs: policyDecision.missing_envs,
          ...(policyDecision.detail || {}),
        },
      },
    );
  }
  const policy = policyDecision.policy;
  const dependencies: BuyVoidSagaTerminalCloseoutDependenciesV1 =
    input.dependencies || {};

  let sagaModule: SagaModuleV1;
  try {
    sagaModule = await (
      dependencies.load_saga_module || defaultSagaModule
    )();
  } catch (error) {
    return held(
      input?.apply === true,
      "saga_reconstruction",
      "terminal_closeout_saga_module_load_failed",
      {
        detail: {
          message: terminalText((error as Error)?.message || error).slice(0, 240),
        },
      },
    );
  }

  const sagaStore = sagaModule.createFilesystemSagaStoreV1(
    path.join(rootDir, TERMINAL_CLOSEOUT_SAGA_ROOT),
  );
  const sagaRecord = sagaStore.recover(sagaId);
  if (!sagaRecord) {
    return held(
      input?.apply === true,
      "saga_reconstruction",
      "terminal_closeout_saga_not_found",
    );
  }

  if (sagaRecord.state?.state === "closed") {
    const closeoutId = terminalText(sagaRecord.state.closeout_id);
    const attemptId = terminalText(sagaRecord.state.attempt_id);
    if (
      !TERMINAL_CLOSEOUT_SHA256.test(closeoutId) ||
      !TERMINAL_CLOSEOUT_SHA256.test(attemptId)
    ) {
      return held(
        input?.apply === true,
        "saga_reconstruction",
        "terminal_closeout_closed_saga_invalid",
      );
    }
    const plan = readTerminalCloseoutPlanV1({
      root_dir: rootDir,
      attempt_id: attemptId,
      expected: { closeout_id: closeoutId, saga_id: sagaId },
    });
    if (!plan) {
      return held(
        input?.apply === true,
        "closeout_plan",
        "terminal_closeout_closed_plan_missing",
        {
          detail: {
            path: terminalCloseoutPlanPathV1(rootDir, attemptId),
          },
        },
      );
    }
    return {
      ok: true,
      status: "duplicate",
      applied: true,
      mutation_performed: false,
      saga_id: sagaId,
      attempt_id: attemptId,
      closeout_id: closeoutId,
      plan,
      saga_state: sagaRecord.state,
      inventory_consumption_performed: false,
      public_request_fulfilled: true,
      saga_closeout_appended: false,
      automatic_retry_allowed: false,
      money_movement_performed: false,
    };
  }

  let reconstructed;
  try {
    reconstructed = reconstructTerminalCloseoutV1({
      root_dir: rootDir,
      saga_module: sagaModule,
      saga_store: sagaStore,
      saga_record: sagaRecord,
      policy,
      dependencies,
    });
  } catch (error) {
    const message = terminalText((error as Error)?.message || error);
    return held(
      input?.apply === true,
      stageFor(message),
      message || "terminal_closeout_reconstruction_failed",
    );
  }

  const requiredSagaConfirmation = sagaModule.ADVANCE_CONFIRMATION;
  const requiredActionConfirmation =
    sagaModule.ACTION_CONFIRMATIONS.closeout_confirmed_delivery;
  if (input?.apply !== true) {
    return {
      ok: true,
      status: "dry_run",
      applied: false,
      mutation_performed: false,
      saga_id: sagaId,
      attempt_id: reconstructed.plan.attempt_id,
      closeout_id: reconstructed.plan.closeout_id,
      plan: reconstructed.plan,
      required_confirmation:
        VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
      required_policy_fingerprint_sha256: policy.fingerprint_sha256,
      required_saga_confirmation: requiredSagaConfirmation,
      required_saga_action_confirmation: requiredActionConfirmation,
      inventory_consumption_performed: false,
      public_request_fulfilled: false,
      saga_closeout_appended: false,
      automatic_retry_allowed: false,
      money_movement_performed: false,
    };
  }

  if (
    terminalText(input.confirmation) !==
      VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_CONFIRMATION_V1 ||
    terminalText(input.policy_fingerprint_sha256).toLowerCase() !==
      policy.fingerprint_sha256 ||
    terminalText(input.saga_confirmation) !== requiredSagaConfirmation ||
    terminalText(input.saga_action_confirmation) !== requiredActionConfirmation
  ) {
    return held(true, "input", "terminal_closeout_confirmation_mismatch", {
      detail: {
        required_confirmation:
          VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
        required_policy_fingerprint_sha256: policy.fingerprint_sha256,
        required_saga_confirmation: requiredSagaConfirmation,
        required_saga_action_confirmation: requiredActionConfirmation,
      },
    });
  }

  let artifacts: TerminalCloseoutArtifactResultV1 | null = null;
  const progress: TerminalCloseoutApplyProgressV1 = {
    plan_persisted: false,
    inventory_committed: false,
    public_committed: false,
  };
  const nowMs = terminalNow(dependencies.now_ms?.());
  const initialized = sagaRecord.events?.[0]?.payload || {};
  try {
    const supervisor = await sagaModule.runSagaSupervisorTickV1({
      store: sagaStore,
      binding: sagaRecord.binding,
      owner_id:
        `terminal-closeout-${process.pid}-${crypto.randomBytes(12).toString("hex")}`,
      now_ms: nowMs,
      lease_ttl_ms: TERMINAL_CLOSEOUT_LEASE_TTL_MS,
      recorded_at_utc: new Date(nowMs).toISOString(),
      source_floor_main: initialized.source_floor_main,
      policy_id: initialized.policy_id,
      apply: true,
      confirmation: requiredSagaConfirmation,
      action_confirmation: requiredActionConfirmation,
      adapters: {
        closeout_confirmed_delivery: async ({ record }: any) => {
          const current = reconstructTerminalCloseoutV1({
            root_dir: rootDir,
            saga_module: sagaModule,
            saga_store: sagaStore,
            saga_record: record,
            policy,
            dependencies,
          });
          artifacts = applyTerminalCloseoutArtifactsV1(
            current,
            dependencies,
            progress,
          );
          return {
            payload: {
              attempt_id: current.plan.attempt_id,
              transaction_hash: current.plan.transaction_hash,
              closeout_id: current.plan.closeout_id,
              inventory_decremented: true,
              public_request_fulfilled: true,
            },
          };
        },
      },
    });
    if (!supervisor || supervisor.ok !== true || supervisor.status !== "applied") {
      return held(
        true,
        "saga_append",
        terminalText(supervisor?.reason) || "terminal_closeout_saga_held",
        {
          detail: supervisor?.detail,
          mutation_performed:
            progress.plan_persisted ||
            progress.inventory_committed ||
            progress.public_committed,
          inventory_consumption_performed: progress.inventory_committed,
          public_request_fulfilled: progress.public_committed,
        },
      );
    }
  } catch (error) {
    const message = terminalText((error as Error)?.message || error);
    return held(true, stageFor(message), message || "terminal_closeout_apply_failed", {
      mutation_performed:
        progress.plan_persisted ||
        progress.inventory_committed ||
        progress.public_committed,
      inventory_consumption_performed: progress.inventory_committed,
      public_request_fulfilled: progress.public_committed,
    });
  }

  const finalRecord = sagaStore.recover(sagaId);
  if (
    !finalRecord ||
    finalRecord.state?.state !== "closed" ||
    finalRecord.state?.closeout_id !== reconstructed.plan.closeout_id
  ) {
    return held(true, "saga_append", "terminal_closeout_final_saga_mismatch", {
      mutation_performed: true,
      inventory_consumption_performed: progress.inventory_committed,
      public_request_fulfilled: progress.public_committed,
    });
  }

  const artifactResult =
    artifacts as TerminalCloseoutArtifactResultV1 | null;
  const recoveredPartial =
    artifactResult?.plan_state === "duplicate" ||
    artifactResult?.inventory_duplicate === true ||
    artifactResult?.public_recovered_partial === true;
  return {
    ok: true,
    status: recoveredPartial ? "recovered_partial" : "closed",
    applied: true,
    mutation_performed: true,
    saga_id: sagaId,
    attempt_id: reconstructed.plan.attempt_id,
    closeout_id: reconstructed.plan.closeout_id,
    plan: reconstructed.plan,
    saga_state: finalRecord.state,
    inventory_consumption_performed: true,
    public_request_fulfilled: true,
    saga_closeout_appended: true,
    automatic_retry_allowed: false,
    money_movement_performed: false,
  };
}
