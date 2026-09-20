import path from "node:path";

import {
  buildBuyVoidPaymentKeyedDispatcherGuardedBroadcastContextV1,
} from "./buy_void_payment_keyed_dispatcher_guarded_broadcast_context_v1.js";
import {
  createBuyVoidPaymentKeyedGuardedBroadcastLeaseRunnerV1,
  type BuyVoidPaymentKeyedGuardedBroadcastDecisionV1,
} from "./buy_void_payment_keyed_guarded_broadcast_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1,
  buyVoidPaymentKeyedFullRuntimePolicyStateV1,
  buyVoidPaymentKeyedFullRuntimeRootDirV1,
} from "./buy_void_payment_keyed_full_runtime_v1.js";
import {
  createBuyVoidPaymentKeyedRuntimeDependencyBootstrapV1,
  VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_DEPENDENCY_BOOTSTRAP_V1,
} from "./buy_void_payment_keyed_runtime_dependency_bootstrap_v1.js";
import {
  createBuyVoidPaymentKeyedDispatcherPostgresStoreV1,
  type BuyVoidPaymentKeyedDispatcherPostgresPoolV1,
} from "./buy_void_payment_keyed_dispatcher_postgres_store_v1.js";
import type {
  BuyVoidPaymentKeyedDispatcherLeaseV1,
} from "./buy_void_payment_keyed_dispatcher_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_APPLY_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_APPLY_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_APPLY_AUTHORITY_V1 =
  Object.freeze({
    source_only_contract: true,
    runtime_route_mount: false,
    fixed_guarded_broadcast_context_required: true,
    fixed_canonical_postgres_store_required: true,
    fixed_nonreplayable_lease_session_required: true,
    full_runtime_enabled_required: true,
    full_runtime_apply_enabled_required: true,
    full_runtime_policy_identity_required: true,
    production_dependency_bootstrap_fixed: true,
    caller_dependency_authority: false,
    caller_confirmation_authority: false,
    caller_policy_authority: false,
    worker_execution_bounded: true,
    worker_execution_scope: "guarded_broadcast_only",
    dispatcher_publish: false,
    dispatcher_renew: false,
    automatic_retry: false,
    raw_signed_transaction_returned: false,
    credential_read_possible_when_called: true,
    signer_access_possible_when_called: true,
    signing_possible_when_called: true,
    transaction_broadcast_possible_when_called: true,
    money_movement_possible_when_called: true,
    inventory_mutation: false,
    public_fulfilled_closeout: false,
  } as const);

export type BuyVoidPaymentKeyedDispatcherGuardedBroadcastApplyInputV1 = {
  root_dir: string;
  lease: BuyVoidPaymentKeyedDispatcherLeaseV1;
  pool: BuyVoidPaymentKeyedDispatcherPostgresPoolV1;
};

type HeldReasonV1 =
  | "input_invalid"
  | "full_runtime_disabled"
  | "full_runtime_apply_disabled"
  | "runtime_policy_held"
  | "runtime_root_mismatch"
  | "guarded_broadcast_context_held"
  | "context_identity_mismatch"
  | "signing_dependencies_not_configured"
  | "dependency_bootstrap_held"
  | "dependency_bootstrap_identity_mismatch"
  | "lease_session_held"
  | "coordinator_held"
  | "store_completion_unconfirmed";

export type BuyVoidPaymentKeyedDispatcherGuardedBroadcastApplyDecisionV1 =
  | {
      ok: true;
      status: "applied";
      marker:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_APPLY_V1;
      attempt_id: string;
      worker_id: string;
      lease_gen: bigint;
      coordinator: Extract<
        BuyVoidPaymentKeyedGuardedBroadcastDecisionV1,
        { ok: true }
      >;
      worker_execution_performed: true;
      dispatcher_publish_performed: false;
      dispatcher_renew_performed: false;
      dependency_bootstrap_performed: true;
      raw_signed_transaction_returned: false;
      automatic_retry_allowed: false;
      inventory_mutation_performed: false;
      public_fulfilled_closeout_performed: false;
      transaction_broadcast_performed: boolean;
      money_movement_performed: boolean;
      money_movement_may_have_occurred: boolean;
    }
  | {
      ok: false;
      status: "held" | "reconciliation_required";
      marker:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_APPLY_V1;
      attempt_id: string | null;
      worker_id: string | null;
      reason: HeldReasonV1;
      coordinator: BuyVoidPaymentKeyedGuardedBroadcastDecisionV1 | null;
      worker_execution_performed: boolean;
      dispatcher_publish_performed: false;
      dispatcher_renew_performed: false;
      dependency_bootstrap_performed: boolean;
      raw_signed_transaction_returned: false;
      automatic_retry_allowed: false;
      inventory_mutation_performed: false;
      public_fulfilled_closeout_performed: false;
      transaction_broadcast_performed: boolean;
      money_movement_performed: boolean;
      money_movement_may_have_occurred: boolean;
      detail?: Record<string, string>;
    };

const SHA256 = /^[0-9a-f]{64}$/;

function text(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : String(value ?? "").trim();
}

function flag(value: unknown): boolean {
  return text(value) === "1";
}

function rootDir(value: unknown): string {
  const raw = text(value);
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) return "";
  const resolved = path.resolve(raw);
  return resolved === path.parse(resolved).root ? "" : resolved;
}

function held(
  input: {
    attempt_id?: string | null;
    worker_id?: string | null;
  },
  reason: HeldReasonV1,
  options: {
    status?: "held" | "reconciliation_required";
    coordinator?: BuyVoidPaymentKeyedGuardedBroadcastDecisionV1 | null;
    worker_execution_performed?: boolean;
    dependency_bootstrap_performed?: boolean;
    detail?: Record<string, string>;
  } = {},
): Extract<
  BuyVoidPaymentKeyedDispatcherGuardedBroadcastApplyDecisionV1,
  { ok: false }
> {
  const coordinator = options.coordinator || null;
  return {
    ok: false,
    status: options.status || "held",
    marker:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_APPLY_V1,
    attempt_id: input.attempt_id || null,
    worker_id: input.worker_id || null,
    reason,
    coordinator,
    worker_execution_performed:
      options.worker_execution_performed === true,
    dispatcher_publish_performed: false,
    dispatcher_renew_performed: false,
    dependency_bootstrap_performed:
      options.dependency_bootstrap_performed === true,
    raw_signed_transaction_returned: false,
    automatic_retry_allowed: false,
    inventory_mutation_performed: false,
    public_fulfilled_closeout_performed: false,
    transaction_broadcast_performed:
      coordinator?.broadcast_call_performed === true,
    money_movement_performed:
      coordinator?.money_movement_performed === true,
    money_movement_may_have_occurred:
      coordinator?.money_movement_may_have_occurred === true,
    ...(options.detail ? { detail: options.detail } : {}),
  };
}

export async function applyBuyVoidPaymentKeyedDispatcherGuardedBroadcastV1(
  input: BuyVoidPaymentKeyedDispatcherGuardedBroadcastApplyInputV1,
): Promise<BuyVoidPaymentKeyedDispatcherGuardedBroadcastApplyDecisionV1> {
  const root = rootDir(input?.root_dir);
  if (!root || !input?.lease || !input?.pool) {
    return held({}, "input_invalid");
  }

  const envs = VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1;
  if (!flag(process.env[envs.enabled])) {
    return held(
      {
        attempt_id: input.lease.attempt_id,
        worker_id: input.lease.worker_id,
      },
      "full_runtime_disabled",
    );
  }
  if (!flag(process.env[envs.apply_enabled])) {
    return held(
      {
        attempt_id: input.lease.attempt_id,
        worker_id: input.lease.worker_id,
      },
      "full_runtime_apply_disabled",
    );
  }

  const policy = buyVoidPaymentKeyedFullRuntimePolicyStateV1(process.env);
  if (policy.configured !== true) {
    return held(
      {
        attempt_id: input.lease.attempt_id,
        worker_id: input.lease.worker_id,
      },
      "runtime_policy_held",
      { detail: { policy_reason: policy.reason } },
    );
  }
  const configuredRoot = path.resolve(
    buyVoidPaymentKeyedFullRuntimeRootDirV1(process.env),
  );
  if (
    configuredRoot !== root ||
    path.resolve(policy.root_dir) !== root
  ) {
    return held(
      {
        attempt_id: input.lease.attempt_id,
        worker_id: input.lease.worker_id,
      },
      "runtime_root_mismatch",
    );
  }

  const contextStore =
    createBuyVoidPaymentKeyedDispatcherPostgresStoreV1({
      pool: input.pool,
    });
  const context =
    await buildBuyVoidPaymentKeyedDispatcherGuardedBroadcastContextV1({
      root_dir: root,
      lease: input.lease,
      store: contextStore,
    });
  if (context.ok !== true) {
    return held(
      {
        attempt_id: context.attempt_id,
        worker_id: context.worker_id,
      },
      "guarded_broadcast_context_held",
      { detail: { context_reason: context.reason } },
    );
  }
  if (
    context.attempt_id !== input.lease.attempt_id ||
    context.worker_id !== input.lease.worker_id ||
    context.lease_gen !== input.lease.lease_gen ||
    context.lease_expires_us !== input.lease.lease_expires_us ||
    context.full_runtime_policy_fingerprint_sha256 !==
      policy.full_runtime_policy_fingerprint_sha256 ||
    !SHA256.test(context.request_fingerprint_sha256) ||
    context.required_signer_confirmation === null ||
    context.required_broadcast_confirmation === null
  ) {
    return held(context, "context_identity_mismatch");
  }

  const credentials = text(process.env[envs.credentials_directory]);
  const evidenceId = text(
    process.env[envs.credential_binding_evidence_id],
  );
  if (!credentials || !evidenceId) {
    return held(context, "signing_dependencies_not_configured");
  }

  const bootstrap =
    createBuyVoidPaymentKeyedRuntimeDependencyBootstrapV1({
      enabled: true,
      credential_binding_evidence_id: evidenceId,
      credentials_directory: credentials,
      fulfillment_wallet_address:
        policy.fulfillment_wallet_address,
      fulfillment_contract_address:
        policy.fulfillment_contract_address,
      max_token_amount_atoms:
        policy.max_token_amount_atoms,
      submission_guard_root_dir: root,
      rpc_url:
        policy.server_policy.preparation_policy.rpc_url,
      request_timeout_ms:
        policy.server_policy.preparation_policy.request_timeout_ms,
      max_response_bytes:
        policy.server_policy.preparation_policy.max_response_bytes,
    });
  if (bootstrap.ok !== true) {
    return held(
      context,
      "dependency_bootstrap_held",
      { detail: { bootstrap_reason: bootstrap.reason } },
    );
  }
  if (
    bootstrap.marker !==
      VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_DEPENDENCY_BOOTSTRAP_V1 ||
    bootstrap.fulfillment_wallet_address !==
      policy.fulfillment_wallet_address ||
    bootstrap.fulfillment_contract_address !==
      policy.fulfillment_contract_address ||
    bootstrap.rpc_url_fingerprint_sha256 !==
      policy.rpc_url_fingerprint_sha256 ||
    bootstrap.max_token_amount_atoms !==
      policy.max_token_amount_atoms ||
    bootstrap.credential_read_performed !== false ||
    bootstrap.rpc_call_performed !== false ||
    bootstrap.signing_performed !== false ||
    bootstrap.transaction_broadcast_performed !== false ||
    bootstrap.submission_guard_write_performed !== false ||
    bootstrap.money_movement_performed !== false
  ) {
    return held(
      context,
      "dependency_bootstrap_identity_mismatch",
      { dependency_bootstrap_performed: true },
    );
  }

  const runner =
    createBuyVoidPaymentKeyedGuardedBroadcastLeaseRunnerV1({
      pool: input.pool,
    });
  const outcome = await runner.run_once(
    input.lease,
    context.request_fingerprint_sha256,
    {
      root_dir: root,
      attempt_id: context.attempt_id,
      server_policy: policy.server_policy,
      apply: true,
      confirmation:
        context.required_guarded_broadcast_confirmation,
      runtime_policy_fingerprint_sha256:
        policy.runtime_policy_fingerprint_sha256,
      preparation_policy_fingerprint_sha256:
        policy.preparation_policy_fingerprint_sha256,
      saga_confirmation:
        context.required_saga_confirmation,
      saga_action_confirmation:
        context.required_saga_action_confirmation,
      signer_confirmation:
        context.required_signer_confirmation,
      broadcast_confirmation:
        context.required_broadcast_confirmation,
      dependencies: bootstrap.dependencies,
    },
  );

  const coordinator = outcome.result?.value || null;
  if (
    outcome.status === "reconciliation_required" &&
    coordinator !== null
  ) {
    return held(
      context,
      "store_completion_unconfirmed",
      {
        status: "reconciliation_required",
        coordinator,
        worker_execution_performed: true,
        dependency_bootstrap_performed: true,
      },
    );
  }
  if (
    outcome.status !== "completed" ||
    outcome.store_completion_confirmed !== true ||
    coordinator === null
  ) {
    return held(
      context,
      "lease_session_held",
      {
        status:
          outcome.reconciliation_required === true
            ? "reconciliation_required"
            : "held",
        coordinator,
        worker_execution_performed:
          outcome.action_started === true,
        dependency_bootstrap_performed: true,
        detail: {
          lease_session_reason:
            text(outcome.reason || "unknown"),
        },
      },
    );
  }
  if (coordinator.ok !== true) {
    return held(
      context,
      "coordinator_held",
      {
        coordinator,
        worker_execution_performed: true,
        dependency_bootstrap_performed: true,
      },
    );
  }

  return {
    ok: true,
    status: "applied",
    marker:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_APPLY_V1,
    attempt_id: context.attempt_id,
    worker_id: context.worker_id,
    lease_gen: context.lease_gen,
    coordinator,
    worker_execution_performed: true,
    dispatcher_publish_performed: false,
    dispatcher_renew_performed: false,
    dependency_bootstrap_performed: true,
    raw_signed_transaction_returned: false,
    automatic_retry_allowed: false,
    inventory_mutation_performed: false,
    public_fulfilled_closeout_performed: false,
    transaction_broadcast_performed:
      coordinator.broadcast_call_performed === true,
    money_movement_performed:
      coordinator.money_movement_performed === true,
    money_movement_may_have_occurred:
      coordinator.money_movement_may_have_occurred === true,
  };
}
