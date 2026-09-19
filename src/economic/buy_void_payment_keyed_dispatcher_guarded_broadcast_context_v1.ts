import path from "node:path";

import {
  previewBuyVoidPaymentKeyedDispatcherRuntimeV1,
} from "./buy_void_payment_keyed_dispatcher_runtime_preview_v1.js";
import {
  reconstructBuyVoidPaymentKeyedLeaseContextV1,
} from "./buy_void_payment_keyed_dispatcher_lease_context_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_V1,
  buyVoidPaymentKeyedFullRuntimeRootDirV1,
  runBuyVoidPaymentKeyedFullRuntimeV1,
} from "./buy_void_payment_keyed_full_runtime_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_GUARDED_BROADCAST_COORDINATOR_V1,
} from "./buy_void_payment_keyed_guarded_broadcast_v1.js";
import type {
  BuyVoidPaymentKeyedDispatcherLeaseV1,
  BuyVoidPaymentKeyedDispatcherStoreV1,
} from "./buy_void_payment_keyed_dispatcher_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_CONTEXT_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_CONTEXT_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_CONTEXT_AUTHORITY_V1 = {
  source_only_contract: true,
  durable_lease_context_required: true,
  dispatcher_runtime_preview_required: true,
  first_runtime_preview_function_fixed: true,
  lease_revalidation_required: true,
  final_lease_revalidation_required: true,
  final_context_identity_binding_required: true,
  lease_context_function_fixed: true,
  second_full_runtime_preview_function_fixed: true,
  full_runtime_apply: false,
  full_runtime_root_binding_required: true,
  server_derived_stage_required: "guarded_broadcast",
  guarded_stage_action_required: "execute_prepared_transaction",
  guarded_stage_reconciliation_action_forbidden: true,
  guarded_broadcast_inner_preview_required: true,
  guarded_broadcast_coordinator_marker_required: true,
  caller_runtime_options_authority: false,
  dependency_bootstrap: false,
  credential_read: false,
  rpc_call: false,
  submission_guard_claim: false,
  signer_access: false,
  signing: false,
  broadcast_call: false,
  transaction_broadcast: false,
  money_movement: false,
  existing_evidence_sanitized: true,
  lease_capability_returned: false,
  raw_signed_transaction_returned: false,
  provider_submission_id_returned: false,
  worker_execution: false,
  dispatcher_claim: false,
  dispatcher_renew: false,
  dispatcher_publish: false,
  runtime_route_mount: false,
  inventory_mutation: false,
  public_fulfilled_closeout: false,
} as const;

export type BuyVoidPaymentKeyedDispatcherGuardedBroadcastContextInputV1 = {
  root_dir: string;
  lease: BuyVoidPaymentKeyedDispatcherLeaseV1;
  store: BuyVoidPaymentKeyedDispatcherStoreV1;
};

type HeldReasonV1 =
  | "runtime_preview_held"
  | "stage_not_guarded_broadcast"
  | "lease_revalidation_held"
  | "lease_revalidation_error"
  | "final_lease_revalidation_held"
  | "final_lease_revalidation_error"
  | "final_context_identity_mismatch"
  | "runtime_root_mismatch"
  | "second_preview_held"
  | "stage_changed_after_lease_revalidation"
  | "guarded_broadcast_stage_drift"
  | "preview_identity_mismatch"
  | "guarded_broadcast_preview_invalid"
  | "guarded_broadcast_preview_authority_violation";

export type BuyVoidPaymentKeyedDispatcherGuardedBroadcastContextDecisionV1 =
  | {
      ok: true;
      status: "ready";
      marker:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_CONTEXT_V1;
      attempt_id: string;
      worker_id: string;
      lease_gen: bigint;
      lease_expires_us: bigint;
      saga_id: string;
      saga_state: string | null;
      next_action: "execute_prepared_transaction";
      retrying_definitive_not_submitted: boolean;
      reconciliation_required: false;
      existing_evidence_present: boolean;
      full_runtime_policy_fingerprint_sha256: string;
      request_fingerprint_sha256: string;
      custody_fingerprint_sha256: string;
      signed_transaction_hash: string;
      required_full_runtime_confirmation: string;
      required_guarded_broadcast_confirmation: string;
      required_saga_confirmation: string;
      required_saga_action_confirmation: string;
      required_signer_confirmation: string | null;
      required_broadcast_confirmation: string | null;
      lease_capability_returned: false;
      raw_signed_transaction_returned: false;
      provider_submission_id_returned: false;
      dependency_bootstrap_performed: false;
      credential_read_performed: false;
      rpc_call_performed: false;
      submission_guard_claimed: false;
      signer_access_performed: false;
      signing_performed: false;
      broadcast_call_performed: false;
      transaction_broadcast_performed: false;
      worker_execution_performed: false;
      dispatcher_renew_performed: false;
      dispatcher_publish_performed: false;
      mutation_performed: false;
      inventory_mutation_performed: false;
      public_fulfilled_closeout_performed: false;
      money_movement_performed: false;
      money_movement_may_have_occurred: false;
    }
  | {
      ok: false;
      status: "held";
      marker:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_CONTEXT_V1;
      attempt_id: string | null;
      worker_id: string | null;
      reason: HeldReasonV1;
      detail?: Record<string, string>;
      lease_capability_returned: false;
      raw_signed_transaction_returned: false;
      provider_submission_id_returned: false;
      dependency_bootstrap_performed: false;
      credential_read_performed: false;
      rpc_call_performed: false;
      submission_guard_claimed: false;
      signer_access_performed: false;
      signing_performed: false;
      broadcast_call_performed: false;
      transaction_broadcast_performed: false;
      worker_execution_performed: false;
      dispatcher_renew_performed: false;
      dispatcher_publish_performed: false;
      mutation_performed: false;
      inventory_mutation_performed: false;
      public_fulfilled_closeout_performed: false;
      money_movement_performed: false;
      money_movement_may_have_occurred: false;
    };

const SHA256 = /^[0-9a-f]{64}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function requireRoot(value: unknown): string {
  const raw = text(value);
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
    throw new Error("dispatcher_guarded_broadcast_context_root_invalid");
  }
  const resolved = path.resolve(raw);
  if (resolved === path.parse(resolved).root) {
    throw new Error(
      "dispatcher_guarded_broadcast_context_root_is_filesystem_root",
    );
  }
  return resolved;
}

function held(
  input: {
    attempt_id?: string | null;
    worker_id?: string | null;
  },
  reason: HeldReasonV1,
  detail?: Record<string, string>,
): Extract<
  BuyVoidPaymentKeyedDispatcherGuardedBroadcastContextDecisionV1,
  { ok: false }
> {
  return {
    ok: false,
    status: "held",
    marker:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_CONTEXT_V1,
    attempt_id: input.attempt_id || null,
    worker_id: input.worker_id || null,
    reason,
    ...(detail ? { detail } : {}),
    lease_capability_returned: false,
    raw_signed_transaction_returned: false,
    provider_submission_id_returned: false,
    dependency_bootstrap_performed: false,
    credential_read_performed: false,
    rpc_call_performed: false,
    submission_guard_claimed: false,
    signer_access_performed: false,
    signing_performed: false,
    broadcast_call_performed: false,
    transaction_broadcast_performed: false,
    worker_execution_performed: false,
    dispatcher_renew_performed: false,
    dispatcher_publish_performed: false,
    mutation_performed: false,
    inventory_mutation_performed: false,
    public_fulfilled_closeout_performed: false,
    money_movement_performed: false,
    money_movement_may_have_occurred: false,
  };
}

export async function buildBuyVoidPaymentKeyedDispatcherGuardedBroadcastContextV1(
  input: BuyVoidPaymentKeyedDispatcherGuardedBroadcastContextInputV1,
): Promise<BuyVoidPaymentKeyedDispatcherGuardedBroadcastContextDecisionV1> {
  const root = requireRoot(input.root_dir);

  const first =
    await previewBuyVoidPaymentKeyedDispatcherRuntimeV1({
      root_dir: root,
      lease: input.lease,
      store: input.store,
    });
  if (first.ok !== true) {
    return held(
      {
        attempt_id: first.attempt_id,
        worker_id: first.worker_id,
      },
      "runtime_preview_held",
      { preview_reason: first.reason },
    );
  }
  if (first.stage !== "guarded_broadcast") {
    return held(first, "stage_not_guarded_broadcast", {
      stage: first.stage,
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
    return held(first, "lease_revalidation_error", {
      message: text((error as Error)?.message || error).slice(0, 240),
    });
  }
  if (context.ok !== true) {
    return held(first, "lease_revalidation_held", {
      context_reason: context.reason,
    });
  }

  if (
    context.attempt_id !== first.attempt_id ||
    context.worker_id !== first.worker_id ||
    context.lease_gen !== first.lease_gen ||
    context.lease_expires_us !== first.lease_expires_us ||
    context.request_fingerprint_sha256 !==
      first.request_fingerprint_sha256 ||
    context.custody_fingerprint_sha256 !==
      first.custody_fingerprint_sha256 ||
    context.saga_id !== first.saga_id ||
    context.signed_transaction_hash !==
      first.signed_transaction_hash
  ) {
    return held(context, "preview_identity_mismatch", {
      identity: "first_preview_to_lease_context",
    });
  }

  const runtimeRoot = path.resolve(
    buyVoidPaymentKeyedFullRuntimeRootDirV1(process.env),
  );
  if (runtimeRoot !== root) {
    return held(context, "runtime_root_mismatch");
  }

  const second = await runBuyVoidPaymentKeyedFullRuntimeV1({
    attempt_id: context.attempt_id,
    apply: false,
  });
  if (
    second?.ok !== true ||
    second.status !== "dry_run" ||
    second.applied !== false
  ) {
    return held(context, "second_preview_held", {
      runtime_reason: text(
        second?.reason || second?.status || "unknown",
      ).slice(0, 240),
    });
  }
  if (second.stage !== "guarded_broadcast") {
    return held(context, "stage_changed_after_lease_revalidation", {
      stage: text(second.stage),
    });
  }
  if (
    second.marker !== VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_V1 ||
    second.attempt_id !== context.attempt_id ||
    !SAGA_ID.test(text(second.saga_id)) ||
    second.saga_id !== context.saga_id ||
    !SHA256.test(
      text(second.full_runtime_policy_fingerprint_sha256),
    ) ||
    second.full_runtime_policy_fingerprint_sha256 !==
      first.full_runtime_policy_fingerprint_sha256
  ) {
    return held(context, "preview_identity_mismatch");
  }
  if (
    second.mutation_performed !== false ||
    second.signing_performed !== false ||
    second.transaction_broadcast_performed !== false ||
    second.inventory_mutation_performed !== false ||
    second.public_fulfilled_closeout_performed !== false ||
    second.automatic_retry_allowed !== false ||
    second.money_movement_performed !== false
  ) {
    return held(context, "guarded_broadcast_preview_authority_violation");
  }

  const inner = second.inner_preview;
  if (
    !inner ||
    inner.ok !== true ||
    inner.status !== "dry_run" ||
    inner.applied !== false ||
    inner.marker !==
      VOID_BUY_VOID_PAYMENT_KEYED_GUARDED_BROADCAST_COORDINATOR_V1 ||
    inner.attempt_id !== context.attempt_id ||
    inner.saga_id !== context.saga_id ||
    ![
      "execute_prepared_transaction",
      "reconcile_possible_broadcast",
    ].includes(text(inner.next_action)) ||
    inner.signer_access_performed !== false ||
    inner.signing_performed !== false ||
    inner.submission_guard_claimed !== false ||
    inner.broadcast_call_performed !== false ||
    inner.transaction_broadcast_accepted !== false ||
    inner.raw_signed_transaction_persisted !== false ||
    inner.raw_signed_transaction_returned !== false ||
    inner.automatic_retry_allowed !== false ||
    inner.money_movement_performed !== false ||
    inner.money_movement_may_have_occurred !== false
  ) {
    return held(context, "guarded_broadcast_preview_invalid");
  }

  if (
    inner.next_action !== "execute_prepared_transaction" ||
    inner.reconciliation_required !== false
  ) {
    return held(context, "guarded_broadcast_stage_drift", {
      outer_stage: second.stage,
      outer_saga_state: text(second.saga_state),
      inner_next_action: text(inner.next_action),
    });
  }

  const retryingDefinitiveNotSubmitted =
    second.saga_state === "broadcast_not_attempted";
  if (
    inner.retrying_definitive_not_submitted !==
      retryingDefinitiveNotSubmitted ||
    !text(second.required_confirmation) ||
    !text(inner.required_signer_confirmation) ||
    !text(inner.required_broadcast_confirmation)
  ) {
    return held(context, "preview_identity_mismatch", {
      identity: "guarded_broadcast_action_contract",
    });
  }

  if (
    !HASH.test(context.signed_transaction_hash) ||
    !text(inner.required_confirmation) ||
    !text(inner.required_saga_confirmation) ||
    !text(inner.required_saga_action_confirmation)
  ) {
    return held(context, "preview_identity_mismatch");
  }

  let finalContext;
  try {
    finalContext = await reconstructBuyVoidPaymentKeyedLeaseContextV1({
      root_dir: root,
      lease: input.lease,
      store: input.store,
    });
  } catch (error) {
    return held(context, "final_lease_revalidation_error", {
      message: text((error as Error)?.message || error).slice(0, 240),
    });
  }
  if (finalContext.ok !== true) {
    return held(context, "final_lease_revalidation_held", {
      context_reason: finalContext.reason,
    });
  }

  const finalIdentityMismatch = [
    ["attempt_id", context.attempt_id, finalContext.attempt_id],
    ["worker_id", context.worker_id, finalContext.worker_id],
    ["lease_gen", context.lease_gen, finalContext.lease_gen],
    [
      "lease_expires_us",
      context.lease_expires_us,
      finalContext.lease_expires_us,
    ],
    [
      "request_fingerprint_sha256",
      context.request_fingerprint_sha256,
      finalContext.request_fingerprint_sha256,
    ],
    [
      "custody_fingerprint_sha256",
      context.custody_fingerprint_sha256,
      finalContext.custody_fingerprint_sha256,
    ],
    ["saga_id", context.saga_id, finalContext.saga_id],
    [
      "signed_transaction_hash",
      context.signed_transaction_hash,
      finalContext.signed_transaction_hash,
    ],
    [
      "raw_signed_transaction_sha256",
      context.raw_signed_transaction_sha256,
      finalContext.raw_signed_transaction_sha256,
    ],
    ["delivery_address", context.delivery_address, finalContext.delivery_address],
    ["void_amount_units", context.void_amount_units, finalContext.void_amount_units],
  ].find(([, before, after]) => before !== after);
  if (finalIdentityMismatch) {
    return held(context, "final_context_identity_mismatch", {
      identity: String(finalIdentityMismatch[0]),
    });
  }

  return {
    ok: true,
    status: "ready",
    marker:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_CONTEXT_V1,
    attempt_id: context.attempt_id,
    worker_id: context.worker_id,
    lease_gen: context.lease_gen,
    lease_expires_us: context.lease_expires_us,
    saga_id: context.saga_id,
    saga_state:
      second.saga_state === null
        ? null
        : text(second.saga_state) || null,
    next_action: "execute_prepared_transaction",
    retrying_definitive_not_submitted:
      retryingDefinitiveNotSubmitted,
    reconciliation_required: false,
    existing_evidence_present:
      inner.existing_evidence !== null &&
      inner.existing_evidence !== undefined,
    full_runtime_policy_fingerprint_sha256:
      second.full_runtime_policy_fingerprint_sha256,
    request_fingerprint_sha256:
      context.request_fingerprint_sha256,
    custody_fingerprint_sha256:
      context.custody_fingerprint_sha256,
    signed_transaction_hash:
      context.signed_transaction_hash,
    required_full_runtime_confirmation:
      text(second.required_confirmation),
    required_guarded_broadcast_confirmation:
      text(inner.required_confirmation),
    required_saga_confirmation:
      text(inner.required_saga_confirmation),
    required_saga_action_confirmation:
      text(inner.required_saga_action_confirmation),
    required_signer_confirmation:
      inner.required_signer_confirmation === null
        ? null
        : text(inner.required_signer_confirmation) || null,
    required_broadcast_confirmation:
      inner.required_broadcast_confirmation === null
        ? null
        : text(inner.required_broadcast_confirmation) || null,
    lease_capability_returned: false,
    raw_signed_transaction_returned: false,
    provider_submission_id_returned: false,
    dependency_bootstrap_performed: false,
    credential_read_performed: false,
    rpc_call_performed: false,
    submission_guard_claimed: false,
    signer_access_performed: false,
    signing_performed: false,
    broadcast_call_performed: false,
    transaction_broadcast_performed: false,
    worker_execution_performed: false,
    dispatcher_renew_performed: false,
    dispatcher_publish_performed: false,
    mutation_performed: false,
    inventory_mutation_performed: false,
    public_fulfilled_closeout_performed: false,
    money_movement_performed: false,
    money_movement_may_have_occurred: false,
  };
}
