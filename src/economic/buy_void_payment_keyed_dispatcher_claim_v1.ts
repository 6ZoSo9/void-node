import crypto from "node:crypto";
import path from "node:path";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1,
  readBuyVoidPaymentKeyedPreparationCustodyPublicV1,
  type BuyVoidPaymentKeyedPreparationCustodyPublicV1,
} from "./buy_void_payment_keyed_preparation_custody_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1,
  claimBuyVoidPaymentKeyedDispatchV1,
  type BuyVoidPaymentKeyedDispatcherJobRecordV1,
  type BuyVoidPaymentKeyedDispatcherLeaseV1,
  type BuyVoidPaymentKeyedDispatcherPublicJobV1,
  type BuyVoidPaymentKeyedDispatcherStoreV1,
} from "./buy_void_payment_keyed_dispatcher_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_CLAIM_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_CLAIM_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_CLAIM_LEASE_TTL_US_V1 =
  30_000_000n;

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_CLAIM_AUTHORITY_V1 = {
  source_only_contract: true,
  durable_preparation_custody_required: true,
  custody_reader_fixed: true,
  enqueued_dispatcher_job_required: true,
  dispatcher_job_identity_preflight_required: true,
  dispatcher_claim_only: true,
  dispatcher_claim_function_fixed: true,
  lease_ttl_policy_fixed: true,
  lease_ttl_us: "30000000",
  caller_lease_ttl_authority: false,
  lease_token_factory_fixed: true,
  lease_token_random_bytes: 16,
  worker_identity_required: true,
  lease_capability_returned: true,
  worker_execution: false,
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

export type BuyVoidPaymentKeyedDispatcherClaimInputV1 = {
  root_dir: string;
  attempt_id: unknown;
  worker_id: unknown;
  store: BuyVoidPaymentKeyedDispatcherStoreV1;
};

type ClaimCommonV1 = {
  marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_CLAIM_V1;
  attempt_id: string;
  request_fingerprint_sha256: string;
  custody_fingerprint_sha256: string;
  worker_id: string;
  lease_ttl_us: "30000000";
  worker_execution_performed: false;
  dispatcher_renew_performed: false;
  dispatcher_publish_performed: false;
  signer_access_performed: false;
  signing_performed: false;
  transaction_broadcast_performed: false;
  money_movement_performed: false;
};

export type BuyVoidPaymentKeyedDispatcherClaimDecisionV1 =
  | (ClaimCommonV1 & {
      ok: true;
      status: "claimed";
      dispatcher_claim_attempted: true;
      lease_capability_issued: true;
      lease: BuyVoidPaymentKeyedDispatcherLeaseV1;
      dispatcher_job: BuyVoidPaymentKeyedDispatcherPublicJobV1;
    })
  | (ClaimCommonV1 & {
      ok: true;
      status: "published";
      dispatcher_claim_attempted: true;
      lease_capability_issued: false;
      dispatcher_job: BuyVoidPaymentKeyedDispatcherPublicJobV1;
    })
  | {
      ok: false;
      status: "held";
      marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_CLAIM_V1;
      attempt_id: string;
      worker_id: string;
      reason:
        | "preparation_custody_missing"
        | "preparation_custody_invalid"
        | "dispatcher_job_missing"
        | "dispatcher_job_invalid"
        | "dispatcher_request_fingerprint_mismatch";
      dispatcher_claim_attempted: false;
      lease_capability_issued: false;
      worker_execution_performed: false;
      dispatcher_renew_performed: false;
      dispatcher_publish_performed: false;
      signer_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      detail?: Record<string, string>;
    }
  | (ClaimCommonV1 & {
      ok: false;
      status: "rejected";
      reason: "attempt_not_found" | "active_lease";
      dispatcher_claim_attempted: true;
      lease_capability_issued: false;
      dispatcher_job?: BuyVoidPaymentKeyedDispatcherPublicJobV1;
    });

const SHA256 = /^[0-9a-f]{64}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const ACTOR = /^[A-Za-z0-9._:@/-]{1,160}$/;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function requireAttemptId(value: unknown): string {
  const attemptId = text(value).toLowerCase();
  if (!SHA256.test(attemptId)) {
    throw new Error("payment_keyed_dispatcher_claim_attempt_id_invalid");
  }
  return attemptId;
}

function requireWorkerId(value: unknown): string {
  const workerId = text(value);
  if (!ACTOR.test(workerId)) {
    throw new Error("payment_keyed_dispatcher_claim_worker_id_invalid");
  }
  return workerId;
}

function requireRootDir(value: unknown): string {
  const raw = text(value);
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
    throw new Error("payment_keyed_dispatcher_claim_root_invalid");
  }
  const resolved = path.resolve(raw);
  if (resolved === path.parse(resolved).root) {
    throw new Error("payment_keyed_dispatcher_claim_root_is_filesystem_root");
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
    throw new Error("payment_keyed_dispatcher_claim_store_authority_invalid");
  }
  return store;
}

function validateCustody(
  custody: BuyVoidPaymentKeyedPreparationCustodyPublicV1,
  attemptId: string,
): BuyVoidPaymentKeyedPreparationCustodyPublicV1 {
  if (
    custody?.marker !== VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1 ||
    custody.version !== 1 ||
    custody.attempt_id !== attemptId ||
    !SHA256.test(String(custody.request_fingerprint_sha256 || "")) ||
    !SHA256.test(String(custody.custody_fingerprint_sha256 || "")) ||
    !HASH.test(String(custody.signed_transaction_hash || "")) ||
    custody.deterministic_signing_verified !== true ||
    custody.raw_signed_transaction_persisted !== false ||
    custody.raw_signed_transaction_returned !== false ||
    custody.transaction_broadcast_authorized !== false ||
    custody.money_movement_authorized !== false
  ) {
    throw new Error("payment_keyed_dispatcher_claim_custody_invalid");
  }
  return custody;
}

function validateDispatcherJobIdentity(
  job: BuyVoidPaymentKeyedDispatcherJobRecordV1,
  attemptId: string,
): BuyVoidPaymentKeyedDispatcherJobRecordV1 {
  if (
    job?.schema !== "void_buy_void_payment_keyed_dispatcher_job_v1" ||
    job.marker !== VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1 ||
    job.attempt_id !== attemptId ||
    !SHA256.test(String(job.request_fingerprint_sha256 || ""))
  ) {
    throw new Error("payment_keyed_dispatcher_claim_job_invalid");
  }
  return job;
}

function held(
  attemptId: string,
  workerId: string,
  reason: Extract<
    BuyVoidPaymentKeyedDispatcherClaimDecisionV1,
    { status: "held" }
  >["reason"],
  detail?: Record<string, string>,
): Extract<
  BuyVoidPaymentKeyedDispatcherClaimDecisionV1,
  { status: "held" }
> {
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_CLAIM_V1,
    attempt_id: attemptId,
    worker_id: workerId,
    reason,
    dispatcher_claim_attempted: false,
    lease_capability_issued: false,
    worker_execution_performed: false,
    dispatcher_renew_performed: false,
    dispatcher_publish_performed: false,
    signer_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    ...(detail ? { detail } : {}),
  };
}

function secureLeaseTokenV1(): string {
  return crypto.randomBytes(16).toString("hex");
}

export async function claimBuyVoidPaymentKeyedPreparedAttemptV1(
  input: BuyVoidPaymentKeyedDispatcherClaimInputV1,
): Promise<BuyVoidPaymentKeyedDispatcherClaimDecisionV1> {
  const rootDir = requireRootDir(input.root_dir);
  const attemptId = requireAttemptId(input.attempt_id);
  const workerId = requireWorkerId(input.worker_id);
  const store = requireStore(input.store);

  let custody: BuyVoidPaymentKeyedPreparationCustodyPublicV1 | null;
  try {
    custody = readBuyVoidPaymentKeyedPreparationCustodyPublicV1({
      root_dir: rootDir,
      attempt_id: attemptId,
    });
  } catch (error) {
    return held(attemptId, workerId, "preparation_custody_invalid", {
      message: text((error as Error)?.message || error).slice(0, 240),
    });
  }
  if (!custody) {
    return held(attemptId, workerId, "preparation_custody_missing");
  }

  try {
    custody = validateCustody(custody, attemptId);
  } catch (error) {
    return held(attemptId, workerId, "preparation_custody_invalid", {
      message: text((error as Error)?.message || error).slice(0, 240),
    });
  }

  const snapshot = await store.run_serializable_job_decision(
    attemptId,
    async (tx) => tx.read_job_for_update(attemptId),
  );
  if (!snapshot) {
    return held(attemptId, workerId, "dispatcher_job_missing");
  }

  let current: BuyVoidPaymentKeyedDispatcherJobRecordV1;
  try {
    current = validateDispatcherJobIdentity(snapshot, attemptId);
  } catch (error) {
    return held(attemptId, workerId, "dispatcher_job_invalid", {
      message: text((error as Error)?.message || error).slice(0, 240),
    });
  }

  if (
    current.request_fingerprint_sha256 !==
    custody.request_fingerprint_sha256
  ) {
    return held(
      attemptId,
      workerId,
      "dispatcher_request_fingerprint_mismatch",
      {
        custody_request_fingerprint_sha256:
          custody.request_fingerprint_sha256,
        dispatcher_request_fingerprint_sha256:
          current.request_fingerprint_sha256,
      },
    );
  }

  const decision = await claimBuyVoidPaymentKeyedDispatchV1({
    attempt_id: attemptId,
    worker_id: workerId,
    lease_ttl_us:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_CLAIM_LEASE_TTL_US_V1,
    lease_token_factory: secureLeaseTokenV1,
    store,
  });

  const common: ClaimCommonV1 = {
    marker: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_CLAIM_V1,
    attempt_id: attemptId,
    request_fingerprint_sha256: custody.request_fingerprint_sha256,
    custody_fingerprint_sha256: custody.custody_fingerprint_sha256,
    worker_id: workerId,
    lease_ttl_us: "30000000",
    worker_execution_performed: false,
    dispatcher_renew_performed: false,
    dispatcher_publish_performed: false,
    signer_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  };

  if (decision.ok === true && decision.status === "claimed") {
    return {
      ...common,
      ok: true,
      status: "claimed",
      dispatcher_claim_attempted: true,
      lease_capability_issued: true,
      lease: decision.lease,
      dispatcher_job: decision.job,
    };
  }

  if (decision.ok === true && decision.status === "published") {
    return {
      ...common,
      ok: true,
      status: "published",
      dispatcher_claim_attempted: true,
      lease_capability_issued: false,
      dispatcher_job: decision.job,
    };
  }

  if (decision.ok === false) {
    return {
      ...common,
      ok: false,
      status: "rejected",
      reason: decision.reason,
      dispatcher_claim_attempted: true,
      lease_capability_issued: false,
      ...(decision.job ? { dispatcher_job: decision.job } : {}),
    };
  }

  throw new Error("payment_keyed_dispatcher_claim_unreachable");
}
