import path from "node:path";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1,
  readBuyVoidPaymentKeyedPreparationCustodyPublicV1,
  type BuyVoidPaymentKeyedPreparationCustodyPublicV1,
} from "./buy_void_payment_keyed_preparation_custody_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1,
  type BuyVoidPaymentKeyedDispatcherJobRecordV1,
  type BuyVoidPaymentKeyedDispatcherLeaseV1,
  type BuyVoidPaymentKeyedDispatcherStoreV1,
} from "./buy_void_payment_keyed_dispatcher_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_LEASE_CONTEXT_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_LEASE_CONTEXT_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_LEASE_CONTEXT_AUTHORITY_V1 = {
  source_only_contract: true,
  durable_preparation_custody_required: true,
  custody_reader_fixed: true,
  dispatcher_job_required: true,
  dispatcher_read_only_preflight: true,
  database_time_required: true,
  exact_lease_generation_required: true,
  exact_lease_capability_required_for_validation: true,
  exact_worker_identity_required: true,
  exact_lease_expiry_required: true,
  request_fingerprint_binding_required: true,
  lease_capability_returned: false,
  raw_signed_transaction_returned: false,
  worker_execution: false,
  dispatcher_claim: false,
  dispatcher_renew: false,
  dispatcher_publish: false,
  runtime_route_mount: false,
  production_connection_factory: false,
  wallet_access: false,
  credential_access: false,
  signing: false,
  transaction_broadcast: false,
  money_movement: false,
} as const;

export type BuyVoidPaymentKeyedDispatcherLeaseContextInputV1 = {
  root_dir: string;
  lease: BuyVoidPaymentKeyedDispatcherLeaseV1;
  store: BuyVoidPaymentKeyedDispatcherStoreV1;
};

export type BuyVoidPaymentKeyedDispatcherLeaseContextReadyV1 = {
  ok: true;
  status: "ready";
  marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_LEASE_CONTEXT_V1;
  attempt_id: string;
  worker_id: string;
  lease_gen: bigint;
  lease_expires_us: bigint;
  request_fingerprint_sha256: string;
  custody_fingerprint_sha256: string;
  saga_id: string;
  plan_reservation_id: string;
  call_fingerprint_sha256: string;
  transaction_plan_fingerprint_sha256: string;
  unsigned_transaction_fingerprint_sha256: string;
  signed_transaction_hash: string;
  raw_signed_transaction_sha256: string;
  delivery_address: string;
  void_amount_units: string;
  dispatcher_read_performed: true;
  lease_capability_returned: false;
  raw_signed_transaction_returned: false;
  worker_execution_performed: false;
  dispatcher_renew_performed: false;
  dispatcher_publish_performed: false;
  signer_access_performed: false;
  signing_performed: false;
  transaction_broadcast_performed: false;
  money_movement_performed: false;
};

export type BuyVoidPaymentKeyedDispatcherLeaseContextHeldV1 = {
  ok: false;
  status: "held";
  marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_LEASE_CONTEXT_V1;
  attempt_id: string | null;
  worker_id: string | null;
  reason:
    | "lease_invalid"
    | "preparation_custody_missing"
    | "preparation_custody_invalid"
    | "dispatcher_job_missing"
    | "dispatcher_job_invalid"
    | "dispatcher_request_fingerprint_mismatch"
    | "already_published"
    | "stale_generation"
    | "unauthorized_lease"
    | "lease_expired";
  dispatcher_read_performed: boolean;
  lease_capability_returned: false;
  raw_signed_transaction_returned: false;
  worker_execution_performed: false;
  dispatcher_renew_performed: false;
  dispatcher_publish_performed: false;
  signer_access_performed: false;
  signing_performed: false;
  transaction_broadcast_performed: false;
  money_movement_performed: false;
  detail?: Record<string, string>;
};

export type BuyVoidPaymentKeyedDispatcherLeaseContextDecisionV1 =
  | BuyVoidPaymentKeyedDispatcherLeaseContextReadyV1
  | BuyVoidPaymentKeyedDispatcherLeaseContextHeldV1;

const SHA256 = /^[0-9a-f]{64}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const TOKEN = /^[0-9a-f]{32}$/;
const ACTOR = /^[A-Za-z0-9._:@/-]{1,160}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function requireRootDir(value: unknown): string {
  const raw = text(value);
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
    throw new Error("payment_keyed_dispatcher_lease_context_root_invalid");
  }
  const resolved = path.resolve(raw);
  if (resolved === path.parse(resolved).root) {
    throw new Error(
      "payment_keyed_dispatcher_lease_context_root_is_filesystem_root",
    );
  }
  return resolved;
}

function requireStore(
  store: BuyVoidPaymentKeyedDispatcherStoreV1,
): BuyVoidPaymentKeyedDispatcherStoreV1 {
  const authority = store?.authority;
  if (
    !store ||
    typeof store.run_serializable_job_decision !== "function" ||
    authority?.transaction_isolation !== "SERIALIZABLE" ||
    authority?.per_job_admission !==
      "session_advisory_lock_before_serializable_snapshot" ||
    authority?.canonical_audit_order !== "per_job_decision_seq" ||
    authority?.retry_sqlstates?.[0] !== "40001" ||
    authority?.retry_sqlstates?.[1] !== "40P01"
  ) {
    throw new Error(
      "payment_keyed_dispatcher_lease_context_store_authority_invalid",
    );
  }
  return store;
}

function validateLease(
  lease: BuyVoidPaymentKeyedDispatcherLeaseV1,
): BuyVoidPaymentKeyedDispatcherLeaseV1 {
  if (
    lease?.marker !== VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1 ||
    !SHA256.test(String(lease.attempt_id || "")) ||
    typeof lease.lease_gen !== "bigint" ||
    lease.lease_gen <= 0n ||
    !TOKEN.test(String(lease.lease_token || "")) ||
    !ACTOR.test(String(lease.worker_id || "")) ||
    typeof lease.lease_expires_us !== "bigint" ||
    lease.lease_expires_us <= 0n
  ) {
    throw new Error("payment_keyed_dispatcher_lease_context_lease_invalid");
  }
  return lease;
}

function validateCustody(
  custody: BuyVoidPaymentKeyedPreparationCustodyPublicV1,
  attemptId: string,
): BuyVoidPaymentKeyedPreparationCustodyPublicV1 {
  if (
    custody?.marker !== VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1 ||
    custody.version !== 1 ||
    custody.attempt_id !== attemptId ||
    !SAGA_ID.test(String(custody.saga_id || "")) ||
    !SHA256.test(String(custody.plan_reservation_id || "")) ||
    !SHA256.test(String(custody.request_fingerprint_sha256 || "")) ||
    !SHA256.test(String(custody.custody_fingerprint_sha256 || "")) ||
    !SHA256.test(String(custody.call_fingerprint_sha256 || "")) ||
    !SHA256.test(String(custody.transaction_plan_fingerprint_sha256 || "")) ||
    !SHA256.test(String(custody.unsigned_transaction_fingerprint_sha256 || "")) ||
    !HASH.test(String(custody.signed_transaction_hash || "")) ||
    !SHA256.test(String(custody.raw_signed_transaction_sha256 || "")) ||
    !ADDRESS.test(String(custody.delivery_address || "")) ||
    !/^[1-9][0-9]*$/.test(String(custody.void_amount_units || "")) ||
    custody.deterministic_signing_verified !== true ||
    custody.raw_signed_transaction_persisted !== false ||
    custody.raw_signed_transaction_returned !== false ||
    custody.transaction_broadcast_authorized !== false ||
    custody.money_movement_authorized !== false
  ) {
    throw new Error(
      "payment_keyed_dispatcher_lease_context_custody_invalid",
    );
  }
  return custody;
}

function validateJob(
  job: BuyVoidPaymentKeyedDispatcherJobRecordV1,
  attemptId: string,
): BuyVoidPaymentKeyedDispatcherJobRecordV1 {
  if (
    job?.schema !== "void_buy_void_payment_keyed_dispatcher_job_v1" ||
    job.marker !== VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1 ||
    job.attempt_id !== attemptId ||
    !SHA256.test(String(job.request_fingerprint_sha256 || "")) ||
    typeof job.submitted_at_us !== "bigint" ||
    job.submitted_at_us <= 0n ||
    typeof job.lease_gen !== "bigint" ||
    job.lease_gen < 0n ||
    typeof job.version !== "bigint" ||
    job.version < 0n
  ) {
    throw new Error("payment_keyed_dispatcher_lease_context_job_invalid");
  }
  return job;
}

function held(
  lease: BuyVoidPaymentKeyedDispatcherLeaseV1 | null,
  reason: BuyVoidPaymentKeyedDispatcherLeaseContextHeldV1["reason"],
  options: {
    dispatcher_read_performed?: boolean;
    detail?: Record<string, string>;
  } = {},
): BuyVoidPaymentKeyedDispatcherLeaseContextHeldV1 {
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_LEASE_CONTEXT_V1,
    attempt_id: lease?.attempt_id || null,
    worker_id: lease?.worker_id || null,
    reason,
    dispatcher_read_performed:
      options.dispatcher_read_performed === true,
    lease_capability_returned: false,
    raw_signed_transaction_returned: false,
    worker_execution_performed: false,
    dispatcher_renew_performed: false,
    dispatcher_publish_performed: false,
    signer_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    ...(options.detail ? { detail: options.detail } : {}),
  };
}

export async function reconstructBuyVoidPaymentKeyedLeaseContextV1(
  input: BuyVoidPaymentKeyedDispatcherLeaseContextInputV1,
): Promise<BuyVoidPaymentKeyedDispatcherLeaseContextDecisionV1> {
  const rootDir = requireRootDir(input.root_dir);
  const store = requireStore(input.store);

  let lease: BuyVoidPaymentKeyedDispatcherLeaseV1;
  try {
    lease = validateLease(input.lease);
  } catch {
    return held(null, "lease_invalid");
  }

  let custody: BuyVoidPaymentKeyedPreparationCustodyPublicV1 | null;
  try {
    custody = readBuyVoidPaymentKeyedPreparationCustodyPublicV1({
      root_dir: rootDir,
      attempt_id: lease.attempt_id,
    });
  } catch (error) {
    return held(lease, "preparation_custody_invalid", {
      detail: {
        message: text((error as Error)?.message || error).slice(0, 240),
      },
    });
  }
  if (!custody) {
    return held(lease, "preparation_custody_missing");
  }

  try {
    custody = validateCustody(custody, lease.attempt_id);
  } catch (error) {
    return held(lease, "preparation_custody_invalid", {
      detail: {
        message: text((error as Error)?.message || error).slice(0, 240),
      },
    });
  }

  const snapshot = await store.run_serializable_job_decision(
    lease.attempt_id,
    async (tx) => ({
      now_us: await tx.now_us(),
      job: await tx.read_job_for_update(lease.attempt_id),
    }),
  );

  if (snapshot.now_us <= 0n) {
    throw new Error(
      "payment_keyed_dispatcher_lease_context_database_time_invalid",
    );
  }
  if (!snapshot.job) {
    return held(lease, "dispatcher_job_missing", {
      dispatcher_read_performed: true,
    });
  }

  let job: BuyVoidPaymentKeyedDispatcherJobRecordV1;
  try {
    job = validateJob(snapshot.job, lease.attempt_id);
  } catch (error) {
    return held(lease, "dispatcher_job_invalid", {
      dispatcher_read_performed: true,
      detail: {
        message: text((error as Error)?.message || error).slice(0, 240),
      },
    });
  }

  if (job.request_fingerprint_sha256 !== custody.request_fingerprint_sha256) {
    return held(lease, "dispatcher_request_fingerprint_mismatch", {
      dispatcher_read_performed: true,
    });
  }
  if (job.published) {
    return held(lease, "already_published", {
      dispatcher_read_performed: true,
    });
  }
  if (job.lease_gen !== lease.lease_gen) {
    return held(lease, "stale_generation", {
      dispatcher_read_performed: true,
    });
  }
  if (
    job.lease_token !== lease.lease_token ||
    job.lease_owner !== lease.worker_id ||
    job.lease_expires_us !== lease.lease_expires_us
  ) {
    return held(lease, "unauthorized_lease", {
      dispatcher_read_performed: true,
    });
  }
  if (
    job.lease_expires_us === null ||
    job.lease_expires_us <= snapshot.now_us ||
    lease.lease_expires_us <= snapshot.now_us
  ) {
    return held(lease, "lease_expired", {
      dispatcher_read_performed: true,
    });
  }

  return {
    ok: true,
    status: "ready",
    marker: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_LEASE_CONTEXT_V1,
    attempt_id: lease.attempt_id,
    worker_id: lease.worker_id,
    lease_gen: lease.lease_gen,
    lease_expires_us: lease.lease_expires_us,
    request_fingerprint_sha256: custody.request_fingerprint_sha256,
    custody_fingerprint_sha256: custody.custody_fingerprint_sha256,
    saga_id: custody.saga_id,
    plan_reservation_id: custody.plan_reservation_id,
    call_fingerprint_sha256: custody.call_fingerprint_sha256,
    transaction_plan_fingerprint_sha256:
      custody.transaction_plan_fingerprint_sha256,
    unsigned_transaction_fingerprint_sha256:
      custody.unsigned_transaction_fingerprint_sha256,
    signed_transaction_hash: custody.signed_transaction_hash,
    raw_signed_transaction_sha256:
      custody.raw_signed_transaction_sha256,
    delivery_address: custody.delivery_address,
    void_amount_units: custody.void_amount_units,
    dispatcher_read_performed: true,
    lease_capability_returned: false,
    raw_signed_transaction_returned: false,
    worker_execution_performed: false,
    dispatcher_renew_performed: false,
    dispatcher_publish_performed: false,
    signer_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  };
}
