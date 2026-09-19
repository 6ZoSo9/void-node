import path from "node:path";

import {
  reconstructBuyVoidPaymentKeyedLeaseContextV1,
} from "./buy_void_payment_keyed_dispatcher_lease_context_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_CLAIM_LEASE_TTL_US_V1,
} from "./buy_void_payment_keyed_dispatcher_claim_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1,
  renewBuyVoidPaymentKeyedDispatchLeaseV1,
  type BuyVoidPaymentKeyedDispatcherLeaseV1,
  type BuyVoidPaymentKeyedDispatcherPublicJobV1,
  type BuyVoidPaymentKeyedDispatcherStoreV1,
} from "./buy_void_payment_keyed_dispatcher_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_RENEW_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_RENEW_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_RENEW_AUTHORITY_V1 = {
  source_only_contract: true,
  durable_lease_context_required: true,
  lease_context_function_fixed: true,
  dispatcher_renew_only: true,
  dispatcher_renew_function_fixed: true,
  lease_ttl_policy_inherited_from_claim: true,
  lease_ttl_us: "30000000",
  caller_lease_ttl_authority: false,
  lease_generation_preserved: true,
  lease_capability_preserved: true,
  worker_identity_preserved: true,
  lease_capability_returned: true,
  worker_execution: false,
  dispatcher_claim: false,
  dispatcher_publish: false,
  runtime_preview: false,
  runtime_apply: false,
  runtime_route_mount: false,
  production_connection_factory: false,
  wallet_access: false,
  credential_access: false,
  signing: false,
  transaction_broadcast: false,
  inventory_mutation: false,
  public_fulfilled_closeout: false,
  money_movement: false,
} as const;

export type BuyVoidPaymentKeyedDispatcherRenewInputV1 = {
  root_dir: string;
  lease: BuyVoidPaymentKeyedDispatcherLeaseV1;
  store: BuyVoidPaymentKeyedDispatcherStoreV1;
};

type RenewRejectReasonV1 =
  | "lease_context_held"
  | "lease_context_error"
  | "attempt_not_found"
  | "already_published"
  | "stale_generation"
  | "unauthorized_lease"
  | "lease_expired"
  | "renew_identity_changed"
  | "renew_expiry_not_extended";

export type BuyVoidPaymentKeyedDispatcherRenewDecisionV1 =
  | {
      ok: true;
      status: "renewed";
      marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_RENEW_V1;
      attempt_id: string;
      worker_id: string;
      lease_gen: bigint;
      previous_lease_expires_us: bigint;
      renewed_lease_expires_us: bigint;
      request_fingerprint_sha256: string;
      custody_fingerprint_sha256: string;
      lease: BuyVoidPaymentKeyedDispatcherLeaseV1;
      dispatcher_job: BuyVoidPaymentKeyedDispatcherPublicJobV1;
      worker_execution_performed: false;
      dispatcher_claim_performed: false;
      dispatcher_publish_performed: false;
      runtime_preview_performed: false;
      runtime_apply_performed: false;
      signer_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      inventory_mutation_performed: false;
      public_fulfilled_closeout_performed: false;
      money_movement_performed: false;
    }
  | {
      ok: false;
      status: "held" | "rejected";
      marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_RENEW_V1;
      attempt_id: string | null;
      worker_id: string | null;
      reason: RenewRejectReasonV1;
      dispatcher_renew_attempted: boolean;
      lease_capability_returned: false;
      worker_execution_performed: false;
      dispatcher_claim_performed: false;
      dispatcher_publish_performed: false;
      runtime_preview_performed: false;
      runtime_apply_performed: false;
      signer_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      inventory_mutation_performed: false;
      public_fulfilled_closeout_performed: false;
      money_movement_performed: false;
      detail?: Record<string, string>;
    };

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function requireRoot(value: unknown): string {
  const raw = text(value);
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
    throw new Error("payment_keyed_dispatcher_renew_root_invalid");
  }
  const resolved = path.resolve(raw);
  if (resolved === path.parse(resolved).root) {
    throw new Error("payment_keyed_dispatcher_renew_root_is_filesystem_root");
  }
  return resolved;
}

function held(
  lease: BuyVoidPaymentKeyedDispatcherLeaseV1 | null,
  reason: RenewRejectReasonV1,
  attempted: boolean,
  status: "held" | "rejected" = "held",
  detail?: Record<string, string>,
): Extract<BuyVoidPaymentKeyedDispatcherRenewDecisionV1, { ok: false }> {
  return {
    ok: false,
    status,
    marker: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_RENEW_V1,
    attempt_id: lease?.attempt_id || null,
    worker_id: lease?.worker_id || null,
    reason,
    dispatcher_renew_attempted: attempted,
    lease_capability_returned: false,
    worker_execution_performed: false,
    dispatcher_claim_performed: false,
    dispatcher_publish_performed: false,
    runtime_preview_performed: false,
    runtime_apply_performed: false,
    signer_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    inventory_mutation_performed: false,
    public_fulfilled_closeout_performed: false,
    money_movement_performed: false,
    ...(detail ? { detail } : {}),
  };
}

export async function renewBuyVoidPaymentKeyedPreparedAttemptLeaseV1(
  input: BuyVoidPaymentKeyedDispatcherRenewInputV1,
): Promise<BuyVoidPaymentKeyedDispatcherRenewDecisionV1> {
  const rootDir = requireRoot(input.root_dir);

  let context;
  try {
    context = await reconstructBuyVoidPaymentKeyedLeaseContextV1({
      root_dir: rootDir,
      lease: input.lease,
      store: input.store,
    });
  } catch (error) {
    return held(input.lease || null, "lease_context_error", false, "held", {
      message: text((error as Error)?.message || error).slice(0, 240),
    });
  }
  if (context.ok !== true) {
    return held(input.lease, "lease_context_held", false, "held", {
      context_reason: context.reason,
    });
  }

  const renewed = await renewBuyVoidPaymentKeyedDispatchLeaseV1({
    lease: input.lease,
    lease_ttl_us:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_CLAIM_LEASE_TTL_US_V1,
    store: input.store,
  });

  if (renewed.ok !== true) {
    return held(
      input.lease,
      renewed.reason,
      true,
      "rejected",
    );
  }

  if (
    renewed.lease.marker !== VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1 ||
    renewed.lease.attempt_id !== input.lease.attempt_id ||
    renewed.lease.worker_id !== input.lease.worker_id ||
    renewed.lease.lease_gen !== input.lease.lease_gen ||
    renewed.lease.lease_token !== input.lease.lease_token
  ) {
    return held(input.lease, "renew_identity_changed", true, "rejected");
  }
  if (renewed.lease.lease_expires_us <= input.lease.lease_expires_us) {
    return held(
      input.lease,
      "renew_expiry_not_extended",
      true,
      "rejected",
    );
  }

  return {
    ok: true,
    status: "renewed",
    marker: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_RENEW_V1,
    attempt_id: context.attempt_id,
    worker_id: context.worker_id,
    lease_gen: context.lease_gen,
    previous_lease_expires_us: input.lease.lease_expires_us,
    renewed_lease_expires_us: renewed.lease.lease_expires_us,
    request_fingerprint_sha256: context.request_fingerprint_sha256,
    custody_fingerprint_sha256: context.custody_fingerprint_sha256,
    lease: renewed.lease,
    dispatcher_job: renewed.job,
    worker_execution_performed: false,
    dispatcher_claim_performed: false,
    dispatcher_publish_performed: false,
    runtime_preview_performed: false,
    runtime_apply_performed: false,
    signer_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    inventory_mutation_performed: false,
    public_fulfilled_closeout_performed: false,
    money_movement_performed: false,
  };
}
