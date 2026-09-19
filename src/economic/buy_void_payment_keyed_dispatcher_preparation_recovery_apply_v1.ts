import path from "node:path";

import {
  previewBuyVoidPaymentKeyedDispatcherRuntimeV1,
} from "./buy_void_payment_keyed_dispatcher_runtime_preview_v1.js";
import {
  reconstructBuyVoidPaymentKeyedLeaseContextV1,
} from "./buy_void_payment_keyed_dispatcher_lease_context_v1.js";
import {
  readBuyVoidExecutionAttemptV1,
} from "./buy_void_execution_attempt_journal_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_V1,
  buyVoidPaymentKeyedFullRuntimePolicyStateV1,
  buyVoidPaymentKeyedFullRuntimeRootDirV1,
  runBuyVoidPaymentKeyedFullRuntimeV1,
} from "./buy_void_payment_keyed_full_runtime_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_COORDINATOR_V1,
  runBuyVoidPaymentKeyedPreparationCoordinatorV1,
} from "./buy_void_payment_keyed_preparation_coordinator_v1.js";
import type {
  BuyVoidPaymentKeyedDispatcherLeaseV1,
  BuyVoidPaymentKeyedDispatcherStoreV1,
} from "./buy_void_payment_keyed_dispatcher_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_PREPARATION_RECOVERY_APPLY_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_PREPARATION_RECOVERY_APPLY_V1";

export const
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_PREPARATION_RECOVERY_APPLY_AUTHORITY_V1 = {
  source_only_contract: true,
  durable_lease_context_required: true,
  runtime_preview_required: true,
  runtime_preview_function_fixed: true,
  lease_revalidation_immediately_before_apply_required: true,
  lease_context_function_fixed: true,
  execution_attempt_reader_fixed: true,
  server_runtime_policy_fixed: true,
  full_runtime_enabled_required: true,
  full_runtime_apply_enabled_required: true,
  full_runtime_root_binding_required: true,
  server_derived_stage_required: "preparation_recovery",
  generic_full_runtime_apply_forbidden: true,
  preparation_coordinator_function_fixed: true,
  caller_confirmation_authority: false,
  caller_stage_authority: false,
  caller_policy_authority: false,
  caller_dependencies_authority: false,
  durable_prepared_recovery_only: true,
  fresh_preparation_forbidden: true,
  signer_dependency_forbidden: true,
  rpc_dependency_bootstrap_forbidden: true,
  worker_execution_bounded: true,
  worker_execution_scope: "preparation_recovery_only",
  dispatcher_claim: false,
  dispatcher_renew: false,
  dispatcher_publish: false,
  lease_capability_returned: false,
  raw_signed_transaction_returned: false,
  runtime_route_mount: false,
  wallet_access: false,
  credential_access: false,
  signing: false,
  transaction_broadcast: false,
  inventory_mutation: false,
  public_fulfilled_closeout: false,
  money_movement: false,
} as const;

export type
  BuyVoidPaymentKeyedDispatcherPreparationRecoveryApplyInputV1 = {
  root_dir: string;
  lease: BuyVoidPaymentKeyedDispatcherLeaseV1;
  store: BuyVoidPaymentKeyedDispatcherStoreV1;
};

type HeldReasonV1 =
  | "runtime_preview_held"
  | "stage_not_preparation_recovery"
  | "lease_revalidation_held"
  | "lease_revalidation_error"
  | "full_runtime_disabled"
  | "full_runtime_apply_disabled"
  | "runtime_policy_held"
  | "runtime_root_mismatch"
  | "attempt_not_prepared"
  | "dry_preview_held"
  | "stage_changed_before_apply"
  | "dry_preview_identity_mismatch"
  | "recovery_apply_held"
  | "recovery_identity_mismatch"
  | "recovery_authority_violation";

export type
  BuyVoidPaymentKeyedDispatcherPreparationRecoveryApplyDecisionV1 =
  | {
      ok: true;
      status: "recovered" | "duplicate";
      marker:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_PREPARATION_RECOVERY_APPLY_V1;
      attempt_id: string;
      worker_id: string;
      lease_gen: bigint;
      saga_id: string;
      saga_state_before: "attempt_reserved" | "transaction_prepared";
      saga_state_after: "transaction_prepared";
      request_fingerprint_sha256: string;
      custody_fingerprint_sha256: string;
      mutation_performed: boolean;
      worker_execution_performed: boolean;
      lease_capability_returned: false;
      raw_signed_transaction_returned: false;
      dispatcher_renew_performed: false;
      dispatcher_publish_performed: false;
      signer_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      inventory_mutation_performed: false;
      public_fulfilled_closeout_performed: false;
      money_movement_performed: false;
    }
  | {
      ok: false;
      status: "held";
      marker:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_PREPARATION_RECOVERY_APPLY_V1;
      attempt_id: string | null;
      worker_id: string | null;
      reason: HeldReasonV1;
      mutation_performed: boolean;
      worker_execution_performed: boolean;
      lease_capability_returned: false;
      raw_signed_transaction_returned: false;
      dispatcher_renew_performed: false;
      dispatcher_publish_performed: false;
      signer_access_performed: boolean;
      signing_performed: boolean;
      transaction_broadcast_performed: false;
      inventory_mutation_performed: false;
      public_fulfilled_closeout_performed: false;
      money_movement_performed: false;
      detail?: Record<string, string>;
    };

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function rootDir(value: unknown): string {
  const raw = text(value);
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
    throw new Error("dispatcher_preparation_recovery_root_invalid");
  }
  const resolved = path.resolve(raw);
  if (resolved === path.parse(resolved).root) {
    throw new Error("dispatcher_preparation_recovery_root_is_filesystem_root");
  }
  return resolved;
}

function flag(value: unknown): boolean {
  return text(value) === "1";
}

function held(
  input: {
    attempt_id?: string | null;
    worker_id?: string | null;
  },
  reason: HeldReasonV1,
  options: {
    mutation_performed?: boolean;
    worker_execution_performed?: boolean;
    signer_access_performed?: boolean;
    signing_performed?: boolean;
    detail?: Record<string, string>;
  } = {},
): Extract<
  BuyVoidPaymentKeyedDispatcherPreparationRecoveryApplyDecisionV1,
  { ok: false }
> {
  return {
    ok: false,
    status: "held",
    marker:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_PREPARATION_RECOVERY_APPLY_V1,
    attempt_id: input.attempt_id || null,
    worker_id: input.worker_id || null,
    reason,
    mutation_performed: options.mutation_performed === true,
    worker_execution_performed:
      options.worker_execution_performed === true,
    lease_capability_returned: false,
    raw_signed_transaction_returned: false,
    dispatcher_renew_performed: false,
    dispatcher_publish_performed: false,
    signer_access_performed:
      options.signer_access_performed === true,
    signing_performed: options.signing_performed === true,
    transaction_broadcast_performed: false,
    inventory_mutation_performed: false,
    public_fulfilled_closeout_performed: false,
    money_movement_performed: false,
    ...(options.detail ? { detail: options.detail } : {}),
  };
}

export async function
applyBuyVoidPaymentKeyedDispatcherPreparationRecoveryV1(
  input: BuyVoidPaymentKeyedDispatcherPreparationRecoveryApplyInputV1,
): Promise<
  BuyVoidPaymentKeyedDispatcherPreparationRecoveryApplyDecisionV1
> {
  const root = rootDir(input.root_dir);

  const preview =
    await previewBuyVoidPaymentKeyedDispatcherRuntimeV1({
      root_dir: root,
      lease: input.lease,
      store: input.store,
    });
  if (preview.ok !== true) {
    return held(
      {
        attempt_id: preview.attempt_id,
        worker_id: preview.worker_id,
      },
      "runtime_preview_held",
      {
        detail: { preview_reason: preview.reason },
      },
    );
  }
  if (preview.stage !== "preparation_recovery") {
    return held(preview, "stage_not_preparation_recovery", {
      detail: { stage: preview.stage },
    });
  }

  let context;
  try {
    context = await reconstructBuyVoidPaymentKeyedLeaseContextV1({
      root_dir: root,
      lease: input.lease,
      store: input.store,
    });
  } catch (error) {
    return held(preview, "lease_revalidation_error", {
      detail: {
        message: text((error as Error)?.message || error).slice(0, 240),
      },
    });
  }
  if (context.ok !== true) {
    return held(preview, "lease_revalidation_held", {
      detail: { context_reason: context.reason },
    });
  }

  const envs = VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1;
  if (!flag(process.env[envs.enabled])) {
    return held(context, "full_runtime_disabled");
  }
  if (!flag(process.env[envs.apply_enabled])) {
    return held(context, "full_runtime_apply_disabled");
  }

  const policy = buyVoidPaymentKeyedFullRuntimePolicyStateV1(process.env);
  if (policy.configured !== true) {
    return held(context, "runtime_policy_held", {
      detail: { policy_reason: policy.reason },
    });
  }
  const configuredRoot = path.resolve(
    buyVoidPaymentKeyedFullRuntimeRootDirV1(process.env),
  );
  if (
    configuredRoot !== root ||
    path.resolve(policy.root_dir) !== root
  ) {
    return held(context, "runtime_root_mismatch");
  }
  if (
    policy.full_runtime_policy_fingerprint_sha256 !==
      preview.full_runtime_policy_fingerprint_sha256
  ) {
    return held(context, "dry_preview_identity_mismatch", {
      detail: { identity: "full_runtime_policy_fingerprint" },
    });
  }

  const attempt = readBuyVoidExecutionAttemptV1({
    root_dir: root,
    attempt_id: context.attempt_id,
  });
  if (
    !attempt ||
    attempt.status !== "prepared" ||
    !attempt.prepared
  ) {
    return held(context, "attempt_not_prepared");
  }

  const dry = await runBuyVoidPaymentKeyedFullRuntimeV1({
    attempt_id: context.attempt_id,
    apply: false,
  });
  if (
    dry?.ok !== true ||
    dry.status !== "dry_run" ||
    dry.applied !== false
  ) {
    return held(context, "dry_preview_held", {
      detail: {
        runtime_reason: text(
          dry?.reason || dry?.status || "unknown",
        ).slice(0, 240),
      },
    });
  }
  if (dry.stage !== "preparation_recovery") {
    return held(context, "stage_changed_before_apply", {
      detail: { stage: text(dry.stage) },
    });
  }
  if (
    dry.marker !== VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_V1 ||
    dry.attempt_id !== context.attempt_id ||
    dry.saga_id !== context.saga_id ||
    dry.full_runtime_policy_fingerprint_sha256 !==
      policy.full_runtime_policy_fingerprint_sha256
  ) {
    return held(context, "dry_preview_identity_mismatch");
  }

  const inner = dry.inner_preview;
  if (
    !inner ||
    inner.ok !== true ||
    inner.status !== "dry_run_recovery" ||
    inner.attempt_id !== context.attempt_id ||
    inner.saga_id !== context.saga_id ||
    inner.signer_required !== false ||
    inner.rpc_required !== false
  ) {
    return held(context, "dry_preview_identity_mismatch", {
      detail: { identity: "preparation_recovery_inner_preview" },
    });
  }

  const decision =
    await runBuyVoidPaymentKeyedPreparationCoordinatorV1({
      root_dir: root,
      attempt_id: context.attempt_id,
      server_policy: policy.server_policy,
      env: process.env,
      apply: true,
      confirmation: inner.required_confirmation,
      runtime_policy_fingerprint_sha256:
        inner.required_runtime_policy_fingerprint_sha256,
      preparation_policy_fingerprint_sha256:
        inner.required_preparation_policy_fingerprint_sha256,
      saga_confirmation: inner.required_saga_confirmation,
      saga_action_confirmation:
        inner.required_saga_action_confirmation,
      custody_confirmation: inner.required_custody_confirmation,
      pipeline_confirmation: inner.required_pipeline_confirmation,
    });

  if (decision.ok !== true) {
    return held(context, "recovery_apply_held", {
      mutation_performed: decision.mutation_performed,
      worker_execution_performed:
        decision.mutation_performed,
      signer_access_performed:
        decision.signer_access_performed,
      signing_performed: decision.signing_performed,
      detail: {
        coordinator_reason: decision.reason.slice(0, 240),
        coordinator_stage: decision.stage,
      },
    });
  }

  const sagaState = text(
    (decision.saga_state as Record<string, unknown>)?.state,
  );
  if (
    decision.marker !==
      VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_COORDINATOR_V1 ||
    decision.applied !== true ||
    !["prepared", "duplicate"].includes(decision.status) ||
    decision.attempt_id !== context.attempt_id ||
    decision.saga_id !== context.saga_id ||
    sagaState !== "transaction_prepared"
  ) {
    return held(context, "recovery_identity_mismatch", {
      mutation_performed: decision.mutation_performed,
      worker_execution_performed:
        decision.mutation_performed,
    });
  }
  if (
    decision.signer_access_performed !== false ||
    decision.signing_performed !== false ||
    decision.transaction_broadcast_performed !== false ||
    decision.raw_signed_transaction_persisted !== false ||
    decision.raw_signed_transaction_returned !== false ||
    decision.durable_submission_claimed !== false ||
    decision.money_movement_performed !== false
  ) {
    return held(context, "recovery_authority_violation", {
      mutation_performed: decision.mutation_performed,
      worker_execution_performed:
        decision.mutation_performed,
      signer_access_performed:
        decision.signer_access_performed,
      signing_performed: decision.signing_performed,
    });
  }

  return {
    ok: true,
    status:
      decision.status === "duplicate"
        ? "duplicate"
        : "recovered",
    marker:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_PREPARATION_RECOVERY_APPLY_V1,
    attempt_id: context.attempt_id,
    worker_id: context.worker_id,
    lease_gen: context.lease_gen,
    saga_id: context.saga_id,
    saga_state_before: preview.saga_state === "transaction_prepared"
      ? "transaction_prepared"
      : "attempt_reserved",
    saga_state_after: "transaction_prepared",
    request_fingerprint_sha256:
      context.request_fingerprint_sha256,
    custody_fingerprint_sha256:
      context.custody_fingerprint_sha256,
    mutation_performed: decision.mutation_performed,
    worker_execution_performed: decision.mutation_performed,
    lease_capability_returned: false,
    raw_signed_transaction_returned: false,
    dispatcher_renew_performed: false,
    dispatcher_publish_performed: false,
    signer_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    inventory_mutation_performed: false,
    public_fulfilled_closeout_performed: false,
    money_movement_performed: false,
  };
}
