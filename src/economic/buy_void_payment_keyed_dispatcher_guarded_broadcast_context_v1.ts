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
import {
  readBuyVoidPaymentKeyedPreparationCustodyPublicV1,
} from "./buy_void_payment_keyed_preparation_custody_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1,
  type BuyVoidPaymentKeyedDispatcherJobRecordV1,
  type BuyVoidPaymentKeyedDispatcherLeaseV1,
  type BuyVoidPaymentKeyedDispatcherStoreV1,
  type BuyVoidPaymentKeyedDispatcherTransactionV1,
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
  final_database_time_after_identity_reads_required: true,
  final_stage_revalidation_required: true,
  final_context_identity_binding_required: true,
  final_saga_head_binding_required: true,
  final_saga_head_returned_for_execution_revalidation: true,
  dispatcher_admission_held_through_final_preview: true,
  lease_context_function_fixed: true,
  second_full_runtime_preview_function_fixed: true,
  final_full_runtime_preview_function_fixed: true,
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
  ready_is_execution_authority: false,
  execution_authorized: false,
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
  | "final_stage_revalidation_held"
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
      saga_event_count: number;
      saga_last_event_id: string;
      saga_head_revalidation_required: true;
      execution_authorized: false;
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
      execution_authorized: false;
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
const SAGA_EVENT_ID = /^voidbvfsge1_[0-9a-f]{64}$/;

type SagaModuleV1 = {
  createFilesystemSagaStoreV1: (rootDir: string) => {
    recover: (sagaId: string) => any | null;
  };
};

type SagaHeadV1 = {
  saga_state: string;
  event_count: number;
  last_event_id: string;
};

type FinalLeaseFenceV1 =
  | {
      ok: true;
      checked_at_us: bigint;
      job_version: bigint;
    }
  | {
      ok: false;
      reason: string;
      checked_at_us: bigint;
    };

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

async function readSagaHeadV1(
  rootDir: string,
  sagaId: string,
): Promise<SagaHeadV1> {
  const saga = await import(
    new URL(
      "../../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs",
      import.meta.url,
    ).href,
  ) as unknown as SagaModuleV1;
  const record = saga
    .createFilesystemSagaStoreV1(
      path.join(
        rootDir,
        "buy-void-crash-consistent-saga-runtime-v1",
      ),
    )
    .recover(sagaId);
  const state = record?.state;
  if (
    record?.saga_id !== sagaId ||
    !text(state?.state) ||
    !Number.isSafeInteger(state?.event_count) ||
    state.event_count < 1 ||
    !SAGA_EVENT_ID.test(text(state?.last_event_id))
  ) {
    throw new Error(
      "dispatcher_guarded_broadcast_context_saga_head_invalid",
    );
  }
  return {
    saga_state: text(state.state),
    event_count: state.event_count,
    last_event_id: text(state.last_event_id),
  };
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
    execution_authorized: false,
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

async function validateFinalLeaseFenceV1(input: {
  tx: BuyVoidPaymentKeyedDispatcherTransactionV1;
  lease: BuyVoidPaymentKeyedDispatcherLeaseV1;
  request_fingerprint_sha256: string;
}): Promise<FinalLeaseFenceV1> {
  const nowUs = await input.tx.now_us();
  if (typeof nowUs !== "bigint" || nowUs <= 0n) {
    throw new Error(
      "dispatcher_guarded_broadcast_context_database_time_invalid",
    );
  }
  const rawJob = await input.tx.read_job_for_update(
    input.lease.attempt_id,
  );
  if (!rawJob) {
    return { ok: false, reason: "dispatcher_job_missing", checked_at_us: nowUs };
  }
  const job = rawJob as BuyVoidPaymentKeyedDispatcherJobRecordV1;
  if (
    job.schema !== "void_buy_void_payment_keyed_dispatcher_job_v1" ||
    job.marker !== VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1 ||
    job.attempt_id !== input.lease.attempt_id ||
    typeof job.version !== "bigint" ||
    job.version < 0n
  ) {
    return { ok: false, reason: "dispatcher_job_invalid", checked_at_us: nowUs };
  }
  if (
    job.request_fingerprint_sha256 !==
      input.request_fingerprint_sha256
  ) {
    return {
      ok: false,
      reason: "dispatcher_request_fingerprint_mismatch",
      checked_at_us: nowUs,
    };
  }
  if (job.published) {
    return { ok: false, reason: "already_published", checked_at_us: nowUs };
  }
  if (job.lease_gen !== input.lease.lease_gen) {
    return { ok: false, reason: "stale_generation", checked_at_us: nowUs };
  }
  if (
    job.lease_token !== input.lease.lease_token ||
    job.lease_owner !== input.lease.worker_id ||
    job.lease_expires_us !== input.lease.lease_expires_us
  ) {
    return { ok: false, reason: "unauthorized_lease", checked_at_us: nowUs };
  }
  if (
    job.lease_expires_us === null ||
    job.lease_expires_us <= nowUs ||
    input.lease.lease_expires_us <= nowUs
  ) {
    return { ok: false, reason: "lease_expired", checked_at_us: nowUs };
  }
  return {
    ok: true,
    checked_at_us: nowUs,
    job_version: job.version,
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

  let finalAdmission;
  try {
    finalAdmission =
      await input.store.run_serializable_job_decision(
        context.attempt_id,
        async (tx) => {
          const before = await validateFinalLeaseFenceV1({
            tx,
            lease: input.lease,
            request_fingerprint_sha256:
              context.request_fingerprint_sha256,
          });
          if (before.ok !== true) {
            return {
              ok: false as const,
              kind: "lease" as const,
              boundary: "before_final_preview" as const,
              fence: before,
            };
          }

          const sagaHeadBefore = await readSagaHeadV1(
            root,
            context.saga_id,
          );

          const preview = await runBuyVoidPaymentKeyedFullRuntimeV1({
            attempt_id: context.attempt_id,
            apply: false,
          });

          const afterPreview = await validateFinalLeaseFenceV1({
            tx,
            lease: input.lease,
            request_fingerprint_sha256:
              context.request_fingerprint_sha256,
          });
          if (afterPreview.ok !== true) {
            return {
              ok: false as const,
              kind: "lease" as const,
              boundary: "after_final_preview" as const,
              fence: afterPreview,
            };
          }
          if (afterPreview.job_version !== before.job_version) {
            return {
              ok: false as const,
              kind: "lease" as const,
              boundary: "after_final_preview" as const,
              fence: {
                ok: false as const,
                reason: "dispatcher_job_version_changed",
                checked_at_us: afterPreview.checked_at_us,
              },
            };
          }

          const sagaHeadAfter = await readSagaHeadV1(
            root,
            context.saga_id,
          );
          if (
            sagaHeadAfter.event_count !==
              sagaHeadBefore.event_count ||
            sagaHeadAfter.last_event_id !==
              sagaHeadBefore.last_event_id ||
            sagaHeadAfter.saga_state !==
              sagaHeadBefore.saga_state
          ) {
            return {
              ok: false as const,
              kind: "stage" as const,
              boundary: "after_final_preview" as const,
              reason: "saga_head_changed_during_final_preview",
              saga_head_before: sagaHeadBefore,
              saga_head_after: sagaHeadAfter,
            };
          }

          const finalCustody =
            readBuyVoidPaymentKeyedPreparationCustodyPublicV1({
              root_dir: root,
              attempt_id: context.attempt_id,
            });
          const finalCustodyIdentityMismatch = finalCustody
            ? [
                ["attempt_id", context.attempt_id, finalCustody.attempt_id],
                ["saga_id", context.saga_id, finalCustody.saga_id],
                [
                  "request_fingerprint_sha256",
                  context.request_fingerprint_sha256,
                  finalCustody.request_fingerprint_sha256,
                ],
                [
                  "custody_fingerprint_sha256",
                  context.custody_fingerprint_sha256,
                  finalCustody.custody_fingerprint_sha256,
                ],
                [
                  "plan_reservation_id",
                  context.plan_reservation_id,
                  finalCustody.plan_reservation_id,
                ],
                [
                  "call_fingerprint_sha256",
                  context.call_fingerprint_sha256,
                  finalCustody.call_fingerprint_sha256,
                ],
                [
                  "transaction_plan_fingerprint_sha256",
                  context.transaction_plan_fingerprint_sha256,
                  finalCustody.transaction_plan_fingerprint_sha256,
                ],
                [
                  "unsigned_transaction_fingerprint_sha256",
                  context.unsigned_transaction_fingerprint_sha256,
                  finalCustody.unsigned_transaction_fingerprint_sha256,
                ],
                [
                  "signed_transaction_hash",
                  context.signed_transaction_hash,
                  finalCustody.signed_transaction_hash,
                ],
                [
                  "raw_signed_transaction_sha256",
                  context.raw_signed_transaction_sha256,
                  finalCustody.raw_signed_transaction_sha256,
                ],
                [
                  "delivery_address",
                  context.delivery_address,
                  finalCustody.delivery_address,
                ],
                [
                  "void_amount_units",
                  context.void_amount_units,
                  finalCustody.void_amount_units,
                ],
              ].find(([, expected, observed]) => expected !== observed)
            : ["custody", "present", "missing"];
          if (finalCustodyIdentityMismatch) {
            return {
              ok: false as const,
              kind: "context" as const,
              boundary: "after_final_preview" as const,
              identity: String(finalCustodyIdentityMismatch[0]),
            };
          }

          const afterAllReads = await validateFinalLeaseFenceV1({
            tx,
            lease: input.lease,
            request_fingerprint_sha256:
              context.request_fingerprint_sha256,
          });
          if (afterAllReads.ok !== true) {
            return {
              ok: false as const,
              kind: "lease" as const,
              boundary: "after_final_identity_reads" as const,
              fence: afterAllReads,
            };
          }
          if (afterAllReads.job_version !== before.job_version) {
            return {
              ok: false as const,
              kind: "lease" as const,
              boundary: "after_final_identity_reads" as const,
              fence: {
                ok: false as const,
                reason: "dispatcher_job_version_changed",
                checked_at_us: afterAllReads.checked_at_us,
              },
            };
          }

          return {
            ok: true as const,
            before,
            after_preview: afterPreview,
            after_all_reads: afterAllReads,
            preview,
            saga_head: sagaHeadAfter,
          };
        },
      );
  } catch (error) {
    return held(context, "final_lease_revalidation_error", {
      message: text((error as Error)?.message || error).slice(0, 240),
      boundary: "dispatcher_admission_final_preview",
    });
  }
  if (finalAdmission.ok !== true) {
    if (finalAdmission.kind === "lease") {
      return held(context, "final_lease_revalidation_held", {
        context_reason: finalAdmission.fence.reason,
        boundary: finalAdmission.boundary,
      });
    }
    if (finalAdmission.kind === "context") {
      return held(context, "final_context_identity_mismatch", {
        identity: finalAdmission.identity,
        boundary: finalAdmission.boundary,
      });
    }
    return held(context, "final_stage_revalidation_held", {
      context_reason: finalAdmission.reason,
      boundary: finalAdmission.boundary,
      saga_event_count_before: String(
        finalAdmission.saga_head_before.event_count,
      ),
      saga_event_count_after: String(
        finalAdmission.saga_head_after.event_count,
      ),
      saga_last_event_id_before:
        finalAdmission.saga_head_before.last_event_id,
      saga_last_event_id_after:
        finalAdmission.saga_head_after.last_event_id,
    });
  }

  const finalPreview = finalAdmission.preview;
  if (
    finalPreview?.ok !== true ||
    finalPreview.status !== "dry_run" ||
    finalPreview.applied !== false
  ) {
    return held(context, "final_stage_revalidation_held", {
      runtime_reason: text(
        finalPreview?.reason || finalPreview?.status || "unknown",
      ).slice(0, 240),
    });
  }
  if (finalPreview.stage !== "guarded_broadcast") {
    return held(context, "final_stage_revalidation_held", {
      stage: text(finalPreview.stage),
      earlier_stage: second.stage,
      earlier_saga_state: text(second.saga_state),
      saga_state: text(finalPreview.saga_state),
    });
  }
  if (
    finalPreview.marker !==
      VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_V1 ||
    finalPreview.attempt_id !== context.attempt_id ||
    finalPreview.saga_id !== context.saga_id ||
    finalPreview.saga_state !== second.saga_state ||
    text(finalPreview.saga_state) !==
      finalAdmission.saga_head.saga_state ||
    finalPreview.full_runtime_policy_fingerprint_sha256 !==
      second.full_runtime_policy_fingerprint_sha256
  ) {
    return held(context, "final_context_identity_mismatch", {
      identity: "final_full_runtime_preview",
    });
  }
  if (
    finalPreview.mutation_performed !== false ||
    finalPreview.signing_performed !== false ||
    finalPreview.transaction_broadcast_performed !== false ||
    finalPreview.inventory_mutation_performed !== false ||
    finalPreview.public_fulfilled_closeout_performed !== false ||
    finalPreview.automatic_retry_allowed !== false ||
    finalPreview.money_movement_performed !== false
  ) {
    return held(context, "guarded_broadcast_preview_authority_violation");
  }

  const finalInner = finalPreview.inner_preview;
  if (
    !finalInner ||
    finalInner.ok !== true ||
    finalInner.status !== "dry_run" ||
    finalInner.applied !== false ||
    finalInner.marker !==
      VOID_BUY_VOID_PAYMENT_KEYED_GUARDED_BROADCAST_COORDINATOR_V1 ||
    finalInner.attempt_id !== context.attempt_id ||
    finalInner.saga_id !== context.saga_id ||
    ![
      "execute_prepared_transaction",
      "reconcile_possible_broadcast",
    ].includes(text(finalInner.next_action)) ||
    finalInner.signer_access_performed !== false ||
    finalInner.signing_performed !== false ||
    finalInner.submission_guard_claimed !== false ||
    finalInner.broadcast_call_performed !== false ||
    finalInner.transaction_broadcast_accepted !== false ||
    finalInner.raw_signed_transaction_persisted !== false ||
    finalInner.raw_signed_transaction_returned !== false ||
    finalInner.automatic_retry_allowed !== false ||
    finalInner.money_movement_performed !== false ||
    finalInner.money_movement_may_have_occurred !== false
  ) {
    return held(context, "guarded_broadcast_preview_invalid");
  }
  if (
    finalInner.next_action !== "execute_prepared_transaction" ||
    finalInner.reconciliation_required !== false
  ) {
    return held(context, "final_stage_revalidation_held", {
      stage: finalPreview.stage,
      saga_state: text(finalPreview.saga_state),
      inner_next_action: text(finalInner.next_action),
    });
  }

  const finalRetryingDefinitiveNotSubmitted =
    finalPreview.saga_state === "broadcast_not_attempted";
  const finalIdentityMismatch = [
    [
      "retrying_definitive_not_submitted",
      retryingDefinitiveNotSubmitted,
      finalRetryingDefinitiveNotSubmitted,
    ],
    [
      "inner_retrying_definitive_not_submitted",
      finalRetryingDefinitiveNotSubmitted,
      finalInner.retrying_definitive_not_submitted,
    ],
    [
      "required_full_runtime_confirmation",
      second.required_confirmation,
      finalPreview.required_confirmation,
    ],
    [
      "required_guarded_broadcast_confirmation",
      inner.required_confirmation,
      finalInner.required_confirmation,
    ],
    [
      "required_saga_confirmation",
      inner.required_saga_confirmation,
      finalInner.required_saga_confirmation,
    ],
    [
      "required_saga_action_confirmation",
      inner.required_saga_action_confirmation,
      finalInner.required_saga_action_confirmation,
    ],
    [
      "required_signer_confirmation",
      inner.required_signer_confirmation,
      finalInner.required_signer_confirmation,
    ],
    [
      "required_broadcast_confirmation",
      inner.required_broadcast_confirmation,
      finalInner.required_broadcast_confirmation,
    ],
    [
      "existing_evidence_presence",
      inner.existing_evidence !== null &&
        inner.existing_evidence !== undefined,
      finalInner.existing_evidence !== null &&
        finalInner.existing_evidence !== undefined,
    ],
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
      finalPreview.saga_state === null
        ? null
        : text(finalPreview.saga_state) || null,
    saga_event_count: finalAdmission.saga_head.event_count,
    saga_last_event_id: finalAdmission.saga_head.last_event_id,
    saga_head_revalidation_required: true,
    execution_authorized: false,
    next_action: "execute_prepared_transaction",
    retrying_definitive_not_submitted:
      finalRetryingDefinitiveNotSubmitted,
    reconciliation_required: false,
    existing_evidence_present:
      finalInner.existing_evidence !== null &&
      finalInner.existing_evidence !== undefined,
    full_runtime_policy_fingerprint_sha256:
      finalPreview.full_runtime_policy_fingerprint_sha256,
    request_fingerprint_sha256:
      context.request_fingerprint_sha256,
    custody_fingerprint_sha256:
      context.custody_fingerprint_sha256,
    signed_transaction_hash:
      context.signed_transaction_hash,
    required_full_runtime_confirmation:
      text(finalPreview.required_confirmation),
    required_guarded_broadcast_confirmation:
      text(finalInner.required_confirmation),
    required_saga_confirmation:
      text(finalInner.required_saga_confirmation),
    required_saga_action_confirmation:
      text(finalInner.required_saga_action_confirmation),
    required_signer_confirmation:
      finalInner.required_signer_confirmation === null
        ? null
        : text(finalInner.required_signer_confirmation) || null,
    required_broadcast_confirmation:
      finalInner.required_broadcast_confirmation === null
        ? null
        : text(finalInner.required_broadcast_confirmation) || null,
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
