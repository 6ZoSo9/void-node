import path from "node:path";

import {
  reconstructBuyVoidPaymentKeyedLeaseContextV1,
  type BuyVoidPaymentKeyedDispatcherLeaseContextReadyV1,
} from "./buy_void_payment_keyed_dispatcher_lease_context_v1.js";
import {
  type BuyVoidPaymentKeyedDispatcherLeaseV1,
  type BuyVoidPaymentKeyedDispatcherStoreV1,
} from "./buy_void_payment_keyed_dispatcher_v1.js";
import {
  readBuyVoidExecutionAttemptV1,
} from "./buy_void_execution_attempt_journal_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_V1,
  buyVoidPaymentKeyedFullRuntimeRootDirV1,
  runBuyVoidPaymentKeyedFullRuntimeV1,
} from "./buy_void_payment_keyed_full_runtime_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_RUNTIME_PREVIEW_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_RUNTIME_PREVIEW_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_RUNTIME_PREVIEW_AUTHORITY_V1 = {
  source_only_contract: true,
  lease_context_function_fixed: true,
  execution_attempt_reader_fixed: true,
  full_runtime_root_binding_required: true,
  full_runtime_preview_function_fixed: true,
  full_runtime_apply: false,
  caller_runtime_options_authority: false,
  prepared_attempt_required: true,
  prepared_attempt_custody_binding_required: true,
  prepared_stage_regression_forbidden: true,
  runtime_preview_sanitized: true,
  lease_capability_returned: false,
  raw_signed_transaction_returned: false,
  worker_runtime_preview: true,
  worker_execution: false,
  dispatcher_claim: false,
  dispatcher_renew: false,
  dispatcher_publish: false,
  runtime_route_mount: false,
  wallet_access: false,
  credential_access: false,
  signing: false,
  transaction_broadcast: false,
  inventory_mutation: false,
  public_fulfilled_closeout: false,
  money_movement: false,
} as const;

export type BuyVoidPaymentKeyedDispatcherRuntimePreviewInputV1 = {
  root_dir: string;
  lease: BuyVoidPaymentKeyedDispatcherLeaseV1;
  store: BuyVoidPaymentKeyedDispatcherStoreV1;
};

type AllowedStageV1 =
  | "preparation_recovery"
  | "guarded_broadcast"
  | "broadcast_reconciliation"
  | "receipt_reconciliation"
  | "terminal_closeout"
  | "complete"
  | "terminal_reverted";

type HeldReasonV1 =
  | "lease_context_held"
  | "lease_context_error"
  | "prepared_attempt_missing"
  | "prepared_attempt_invalid"
  | "prepared_attempt_custody_mismatch"
  | "runtime_root_mismatch"
  | "runtime_preview_held"
  | "runtime_preview_invalid"
  | "prepared_stage_regression"
  | "runtime_preview_identity_mismatch"
  | "runtime_preview_authority_violation";

export type BuyVoidPaymentKeyedDispatcherRuntimePreviewDecisionV1 =
  | {
      ok: true;
      status: "preview_ready";
      marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_RUNTIME_PREVIEW_V1;
      attempt_id: string;
      worker_id: string;
      lease_gen: bigint;
      lease_expires_us: bigint;
      stage: AllowedStageV1;
      saga_id: string;
      saga_state: string | null;
      full_runtime_policy_fingerprint_sha256: string;
      required_confirmation: string;
      inner_preview_status: string | null;
      request_fingerprint_sha256: string;
      custody_fingerprint_sha256: string;
      signed_transaction_hash: string;
      delivery_address: string;
      void_amount_units: string;
      lease_capability_returned: false;
      raw_signed_transaction_returned: false;
      worker_execution_performed: false;
      dispatcher_renew_performed: false;
      dispatcher_publish_performed: false;
      mutation_performed: false;
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
      marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_RUNTIME_PREVIEW_V1;
      attempt_id: string | null;
      worker_id: string | null;
      reason: HeldReasonV1;
      detail?: Record<string, string>;
      runtime_preview_performed: boolean;
      lease_capability_returned: false;
      raw_signed_transaction_returned: false;
      worker_execution_performed: false;
      dispatcher_renew_performed: false;
      dispatcher_publish_performed: false;
      mutation_performed: false;
      signer_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      inventory_mutation_performed: false;
      public_fulfilled_closeout_performed: false;
      money_movement_performed: false;
    };

const SHA256 = /^[0-9a-f]{64}$/;
const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/;
const ALLOWED_STAGES = new Set<AllowedStageV1>([
  "preparation_recovery",
  "guarded_broadcast",
  "broadcast_reconciliation",
  "receipt_reconciliation",
  "terminal_closeout",
  "complete",
  "terminal_reverted",
]);

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function requireRoot(value: unknown): string {
  const raw = text(value);
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
    throw new Error("payment_keyed_dispatcher_runtime_preview_root_invalid");
  }
  const resolved = path.resolve(raw);
  if (resolved === path.parse(resolved).root) {
    throw new Error(
      "payment_keyed_dispatcher_runtime_preview_root_is_filesystem_root",
    );
  }
  return resolved;
}

function baseHeld(
  context: BuyVoidPaymentKeyedDispatcherLeaseContextReadyV1 | null,
  reason: HeldReasonV1,
  runtimePreviewPerformed: boolean,
  detail?: Record<string, string>,
): Extract<
  BuyVoidPaymentKeyedDispatcherRuntimePreviewDecisionV1,
  { ok: false }
> {
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_RUNTIME_PREVIEW_V1,
    attempt_id: context?.attempt_id || null,
    worker_id: context?.worker_id || null,
    reason,
    ...(detail ? { detail } : {}),
    runtime_preview_performed: runtimePreviewPerformed,
    lease_capability_returned: false,
    raw_signed_transaction_returned: false,
    worker_execution_performed: false,
    dispatcher_renew_performed: false,
    dispatcher_publish_performed: false,
    mutation_performed: false,
    signer_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    inventory_mutation_performed: false,
    public_fulfilled_closeout_performed: false,
    money_movement_performed: false,
  };
}

export async function previewBuyVoidPaymentKeyedDispatcherRuntimeV1(
  input: BuyVoidPaymentKeyedDispatcherRuntimePreviewInputV1,
): Promise<BuyVoidPaymentKeyedDispatcherRuntimePreviewDecisionV1> {
  const rootDir = requireRoot(input.root_dir);

  let contextDecision;
  try {
    contextDecision =
      await reconstructBuyVoidPaymentKeyedLeaseContextV1({
        root_dir: rootDir,
        lease: input.lease,
        store: input.store,
      });
  } catch (error) {
    return baseHeld(null, "lease_context_error", false, {
      message: text((error as Error)?.message || error).slice(0, 240),
    });
  }
  if (contextDecision.ok !== true) {
    return baseHeld(null, "lease_context_held", false, {
      context_reason: contextDecision.reason,
    });
  }
  const context = contextDecision;

  let attempt;
  try {
    attempt = readBuyVoidExecutionAttemptV1({
      root_dir: rootDir,
      attempt_id: context.attempt_id,
    });
  } catch (error) {
    return baseHeld(context, "prepared_attempt_invalid", false, {
      message: text((error as Error)?.message || error).slice(0, 240),
    });
  }
  if (!attempt || !attempt.prepared || attempt.status === "reserved") {
    return baseHeld(context, "prepared_attempt_missing", false);
  }
  if (
    attempt.reservation.attempt_id !== context.attempt_id ||
    attempt.prepared.attempt_id !== context.attempt_id ||
    text(attempt.prepared.void_delivery_tx_hash).toLowerCase() !==
      context.signed_transaction_hash ||
    text(attempt.prepared.delivery_address).toLowerCase() !==
      context.delivery_address ||
    text(attempt.prepared.void_amount_units) !== context.void_amount_units
  ) {
    return baseHeld(context, "prepared_attempt_custody_mismatch", false);
  }

  let runtimeRoot: string;
  try {
    runtimeRoot = path.resolve(
      buyVoidPaymentKeyedFullRuntimeRootDirV1(process.env),
    );
  } catch (error) {
    return baseHeld(context, "runtime_root_mismatch", false, {
      message: text((error as Error)?.message || error).slice(0, 240),
    });
  }
  if (runtimeRoot !== rootDir) {
    return baseHeld(context, "runtime_root_mismatch", false);
  }

  let preview: Record<string, any>;
  try {
    preview = await runBuyVoidPaymentKeyedFullRuntimeV1({
      attempt_id: context.attempt_id,
      apply: false,
    });
  } catch (error) {
    return baseHeld(context, "runtime_preview_held", true, {
      message: text((error as Error)?.message || error).slice(0, 240),
    });
  }

  if (preview?.ok !== true) {
    return baseHeld(context, "runtime_preview_held", true, {
      runtime_reason: text(
        preview?.reason || preview?.status || "unknown",
      ).slice(0, 240),
    });
  }
  if (text(preview.stage) === "preparation") {
    return baseHeld(context, "prepared_stage_regression", true);
  }
  if (
    preview.marker !== VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_V1 ||
    preview.status !== "dry_run" ||
    preview.applied !== false ||
    !ALLOWED_STAGES.has(text(preview.stage) as AllowedStageV1)
  ) {
    return baseHeld(context, "runtime_preview_invalid", true);
  }
  if (
    preview.attempt_id !== context.attempt_id ||
    !SAGA_ID.test(text(preview.saga_id)) ||
    preview.saga_id !== context.saga_id ||
    !SHA256.test(
      text(preview.full_runtime_policy_fingerprint_sha256),
    )
  ) {
    return baseHeld(context, "runtime_preview_identity_mismatch", true);
  }
  if (
    preview.mutation_performed !== false ||
    preview.signing_performed !== false ||
    preview.transaction_broadcast_performed !== false ||
    preview.inventory_mutation_performed !== false ||
    preview.public_fulfilled_closeout_performed !== false ||
    preview.automatic_retry_allowed !== false ||
    preview.money_movement_performed !== false
  ) {
    return baseHeld(context, "runtime_preview_authority_violation", true);
  }

  return {
    ok: true,
    status: "preview_ready",
    marker: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_RUNTIME_PREVIEW_V1,
    attempt_id: context.attempt_id,
    worker_id: context.worker_id,
    lease_gen: context.lease_gen,
    lease_expires_us: context.lease_expires_us,
    stage: preview.stage as AllowedStageV1,
    saga_id: preview.saga_id,
    saga_state:
      preview.saga_state === null
        ? null
        : text(preview.saga_state) || null,
    full_runtime_policy_fingerprint_sha256:
      preview.full_runtime_policy_fingerprint_sha256,
    required_confirmation: text(preview.required_confirmation),
    inner_preview_status:
      preview.inner_preview?.status === undefined
        ? null
        : text(preview.inner_preview.status) || null,
    request_fingerprint_sha256: context.request_fingerprint_sha256,
    custody_fingerprint_sha256: context.custody_fingerprint_sha256,
    signed_transaction_hash: context.signed_transaction_hash,
    delivery_address: context.delivery_address,
    void_amount_units: context.void_amount_units,
    lease_capability_returned: false,
    raw_signed_transaction_returned: false,
    worker_execution_performed: false,
    dispatcher_renew_performed: false,
    dispatcher_publish_performed: false,
    mutation_performed: false,
    signer_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    inventory_mutation_performed: false,
    public_fulfilled_closeout_performed: false,
    money_movement_performed: false,
  };
}
