export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_QUALIFIED_REFERENCE_V1 = {
  source_design_sha256:
    "816ce079d3f8b36c374ec4a24698f01af1b291e7a8e9c2d9aca79bdbad10989f",
  substantive_audit_receipt_sha256:
    "23e38a4dcf01cb1fe4286850b06354e8db66a457dc12b1b12b3451afaa064f00",
  sqlite_reference_sha256:
    "c19c10bebf575932a5e28ee84a3b55fc585a18dd2b6c6ddbc152e48ab127a8b6",
  postgres_reference_v3_sha256:
    "0ebc2ae33838080dc08fe238d950d8b1558d306b2165a42502630d0e887c710b",
  qualification_launcher_sha256:
    "c3fed8e1edd366b5a0de8bb4d21dcda32d99fe4bd6031ae6908adefe52ee00f7",
  baseline_tests: "9/9",
  audit_order_tests: "5/5",
  server_crash_tests: "4/4",
  modelcheck: "24/24 seeds; 2880 steps",
  differential_oracle: "20/20 seeds; 2800 steps; 2862 comparisons",
  linearizability: "70/70 rounds",
} as const;

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_AUTHORITY_V1 = {
  source_only_contract: true,
  runtime_route_mount: false,
  canonical_parent_dispatch: false,
  production_store_adapter_present: true,
  transaction_isolation_required: "SERIALIZABLE",
  per_job_admission_required:
    "session_advisory_lock_before_serializable_snapshot",
  retry_sqlstates_required: ["40001", "40P01"] as const,
  canonical_audit_order_required: "per_job_decision_seq",
  audit_id_is_commit_order: false,
  immutable_request_fingerprint_required: true,
  monotonic_lease_generation_required: true,
  random_128_bit_lease_capability_required: true,
  worker_identity_binding_required: true,
  database_time_inside_transaction_required: true,
  state_and_success_audit_atomicity_required: true,
  rejected_decision_audit_commit_required: true,
  transaction_broadcast: false,
  wallet_access: false,
  signing: false,
  money_movement: false,
} as const;

export type BuyVoidPaymentKeyedDispatcherEventTypeV1 =
  | "SUBMIT"
  | "SUBMIT_REPLAY"
  | "PAYLOAD_CONFLICT"
  | "CLAIM"
  | "CLAIM_REJECT_NOT_FOUND"
  | "CLAIM_REJECT_PUBLISHED"
  | "CLAIM_REJECT_ACTIVE"
  | "LEASE_EXPIRED_RECLAIM"
  | "LEASE_RENEW"
  | "RENEW_REJECT_NOT_FOUND"
  | "RENEW_REJECT_PUBLISHED"
  | "RENEW_REJECT_STALE"
  | "RENEW_REJECT_UNAUTHORIZED"
  | "RENEW_REJECT_EXPIRED"
  | "PUBLISH"
  | "PUBLISH_REPLAY"
  | "PUBLISH_REJECT_NOT_FOUND"
  | "PUBLISH_REJECT_STALE"
  | "PUBLISH_REJECT_UNAUTHORIZED"
  | "PUBLISH_REJECT_EXPIRED";

export type BuyVoidPaymentKeyedDispatcherOutcomeV1 =
  | "SUCCESS"
  | "IDEMPOTENT"
  | "REJECTED"
  | "OBSERVED";

export type BuyVoidPaymentKeyedDispatcherJobRecordV1 = {
  schema: "void_buy_void_payment_keyed_dispatcher_job_v1";
  marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1;
  attempt_id: string;
  request_fingerprint_sha256: string;
  submitted_at_us: bigint;
  result_fingerprint_sha256: string | null;
  published: boolean;
  published_gen: bigint | null;
  lease_gen: bigint;
  lease_token: string | null;
  lease_owner: string | null;
  lease_expires_us: bigint | null;
  version: bigint;
};

export type BuyVoidPaymentKeyedDispatcherPublicJobV1 = Omit<
  BuyVoidPaymentKeyedDispatcherJobRecordV1,
  "lease_token"
>;

export type BuyVoidPaymentKeyedDispatcherLeaseV1 = {
  marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1;
  attempt_id: string;
  lease_gen: bigint;
  lease_token: string;
  worker_id: string;
  lease_expires_us: bigint;
};

export type BuyVoidPaymentKeyedDispatcherAuditDecisionV1 = {
  schema: "void_buy_void_payment_keyed_dispatcher_audit_v1";
  marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1;
  attempt_id: string;
  decision_seq: bigint;
  event_type: BuyVoidPaymentKeyedDispatcherEventTypeV1;
  outcome: BuyVoidPaymentKeyedDispatcherOutcomeV1;
  actor_id: string | null;
  lease_gen: bigint;
  created_at_us: bigint;
  detail: Record<string, string | boolean>;
};

export type BuyVoidPaymentKeyedDispatcherTransactionV1 = {
  now_us: () => bigint | Promise<bigint>;
  read_job_for_update: (
    attemptId: string,
  ) =>
    | BuyVoidPaymentKeyedDispatcherJobRecordV1
    | null
    | Promise<BuyVoidPaymentKeyedDispatcherJobRecordV1 | null>;
  insert_job: (
    record: BuyVoidPaymentKeyedDispatcherJobRecordV1,
  ) => boolean | Promise<boolean>;
  update_job: (
    attemptId: string,
    expectedVersion: bigint,
    next: BuyVoidPaymentKeyedDispatcherJobRecordV1,
  ) => boolean | Promise<boolean>;
  append_decision: (
    decision: Omit<BuyVoidPaymentKeyedDispatcherAuditDecisionV1, "decision_seq">,
  ) => bigint | Promise<bigint>;
};

export type BuyVoidPaymentKeyedDispatcherStoreV1 = {
  authority: {
    transaction_isolation: "SERIALIZABLE";
    per_job_admission:
      "session_advisory_lock_before_serializable_snapshot";
    canonical_audit_order: "per_job_decision_seq";
    retry_sqlstates: readonly ["40001", "40P01"];
  };
  run_serializable_job_decision: <T>(
    attemptId: string,
    action: (
      tx: BuyVoidPaymentKeyedDispatcherTransactionV1,
    ) => T | Promise<T>,
  ) => Promise<T>;
};

export type BuyVoidPaymentKeyedDispatcherTokenFactoryV1 = () => string;

export type BuyVoidPaymentKeyedDispatcherSubmitDecisionV1 =
  | {
      ok: true;
      status: "submitted" | "idempotent";
      job: BuyVoidPaymentKeyedDispatcherPublicJobV1;
    }
  | {
      ok: false;
      status: "rejected";
      reason: "request_fingerprint_mismatch";
      job: BuyVoidPaymentKeyedDispatcherPublicJobV1;
    };

export type BuyVoidPaymentKeyedDispatcherClaimDecisionV1 =
  | {
      ok: true;
      status: "claimed";
      lease: BuyVoidPaymentKeyedDispatcherLeaseV1;
      job: BuyVoidPaymentKeyedDispatcherPublicJobV1;
    }
  | {
      ok: true;
      status: "published";
      job: BuyVoidPaymentKeyedDispatcherPublicJobV1;
    }
  | {
      ok: false;
      status: "rejected";
      reason: "attempt_not_found" | "active_lease";
      job?: BuyVoidPaymentKeyedDispatcherPublicJobV1;
    };

export type BuyVoidPaymentKeyedDispatcherRenewDecisionV1 =
  | {
      ok: true;
      status: "renewed";
      lease: BuyVoidPaymentKeyedDispatcherLeaseV1;
      job: BuyVoidPaymentKeyedDispatcherPublicJobV1;
    }
  | {
      ok: false;
      status: "rejected";
      reason:
        | "attempt_not_found"
        | "already_published"
        | "stale_generation"
        | "unauthorized_lease"
        | "lease_expired";
    };

export type BuyVoidPaymentKeyedDispatcherPublishDecisionV1 =
  | {
      ok: true;
      status: "published" | "idempotent";
      job: BuyVoidPaymentKeyedDispatcherPublicJobV1;
    }
  | {
      ok: false;
      status: "rejected";
      reason:
        | "attempt_not_found"
        | "stale_generation"
        | "unauthorized_lease"
        | "lease_expired";
    };

const SHA256 = /^[0-9a-f]{64}$/;
const TOKEN = /^[0-9a-f]{32}$/;
const ATTEMPT_ID = /^[0-9a-f]{64}$/;
const ACTOR = /^[A-Za-z0-9._:@/-]{1,160}$/;

function requireSha256(name: string, value: unknown): string {
  const text = String(value ?? "").trim().toLowerCase();
  if (!SHA256.test(text)) throw new Error(name + "_invalid");
  return text;
}

function requireAttemptId(value: unknown): string {
  const text = String(value ?? "").trim().toLowerCase();
  if (!ATTEMPT_ID.test(text)) throw new Error("dispatcher_attempt_id_invalid");
  return text;
}

function requireActor(name: string, value: unknown): string {
  const text = String(value ?? "").trim();
  if (!ACTOR.test(text)) throw new Error(name + "_invalid");
  return text;
}

function requirePositiveBigInt(name: string, value: unknown): bigint {
  const parsed = typeof value === "bigint" ? value : BigInt(String(value));
  if (parsed <= 0n) throw new Error(name + "_invalid");
  return parsed;
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
    throw new Error("dispatcher_store_authority_invalid");
  }
  return store;
}

function publicJob(
  job: BuyVoidPaymentKeyedDispatcherJobRecordV1,
): BuyVoidPaymentKeyedDispatcherPublicJobV1 {
  const { lease_token: _leaseToken, ...safe } = job;
  return safe;
}

function assertRecord(job: BuyVoidPaymentKeyedDispatcherJobRecordV1): void {
  if (
    job.schema !== "void_buy_void_payment_keyed_dispatcher_job_v1" ||
    job.marker !== VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1 ||
    !ATTEMPT_ID.test(job.attempt_id) ||
    !SHA256.test(job.request_fingerprint_sha256) ||
    job.submitted_at_us <= 0n ||
    job.lease_gen < 0n ||
    job.version < 0n
  ) {
    throw new Error("dispatcher_job_record_invalid");
  }
  const leaseParts = [
    job.lease_token !== null,
    job.lease_owner !== null,
    job.lease_expires_us !== null,
  ];
  if (new Set(leaseParts).size !== 1) {
    throw new Error("dispatcher_job_lease_shape_invalid");
  }
  if (job.lease_token !== null && !TOKEN.test(job.lease_token)) {
    throw new Error("dispatcher_job_lease_token_invalid");
  }
  if (job.lease_owner !== null && !ACTOR.test(job.lease_owner)) {
    throw new Error("dispatcher_job_lease_owner_invalid");
  }
  if (job.lease_expires_us !== null && job.lease_expires_us <= 0n) {
    throw new Error("dispatcher_job_lease_expiry_invalid");
  }
  if (job.published) {
    if (
      !job.result_fingerprint_sha256 ||
      !SHA256.test(job.result_fingerprint_sha256) ||
      job.published_gen !== job.lease_gen ||
      job.lease_token !== null ||
      job.lease_owner !== null ||
      job.lease_expires_us !== null
    ) {
      throw new Error("dispatcher_job_published_shape_invalid");
    }
  } else if (
    job.result_fingerprint_sha256 !== null ||
    job.published_gen !== null
  ) {
    throw new Error("dispatcher_job_unpublished_shape_invalid");
  }
}

async function audit(
  tx: BuyVoidPaymentKeyedDispatcherTransactionV1,
  input: Omit<BuyVoidPaymentKeyedDispatcherAuditDecisionV1, "decision_seq">,
): Promise<bigint> {
  const sequence = await tx.append_decision(input);
  if (sequence <= 0n) throw new Error("dispatcher_decision_seq_invalid");
  return sequence;
}

function auditBase(input: {
  attempt_id: string;
  event_type: BuyVoidPaymentKeyedDispatcherEventTypeV1;
  outcome: BuyVoidPaymentKeyedDispatcherOutcomeV1;
  actor_id: string | null;
  lease_gen: bigint;
  created_at_us: bigint;
  detail?: Record<string, string | boolean>;
}): Omit<BuyVoidPaymentKeyedDispatcherAuditDecisionV1, "decision_seq"> {
  return {
    schema: "void_buy_void_payment_keyed_dispatcher_audit_v1",
    marker: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1,
    attempt_id: input.attempt_id,
    event_type: input.event_type,
    outcome: input.outcome,
    actor_id: input.actor_id,
    lease_gen: input.lease_gen,
    created_at_us: input.created_at_us,
    detail: input.detail || {},
  };
}

function leaseFromJob(
  job: BuyVoidPaymentKeyedDispatcherJobRecordV1,
): BuyVoidPaymentKeyedDispatcherLeaseV1 {
  if (
    !job.lease_token ||
    !job.lease_owner ||
    job.lease_expires_us === null
  ) {
    throw new Error("dispatcher_active_lease_missing");
  }
  return {
    marker: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1,
    attempt_id: job.attempt_id,
    lease_gen: job.lease_gen,
    lease_token: job.lease_token,
    worker_id: job.lease_owner,
    lease_expires_us: job.lease_expires_us,
  };
}

function requireLease(
  lease: BuyVoidPaymentKeyedDispatcherLeaseV1,
): BuyVoidPaymentKeyedDispatcherLeaseV1 {
  if (
    lease?.marker !== VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1 ||
    !ATTEMPT_ID.test(String(lease.attempt_id || "")) ||
    lease.lease_gen <= 0n ||
    !TOKEN.test(String(lease.lease_token || "")) ||
    !ACTOR.test(String(lease.worker_id || "")) ||
    lease.lease_expires_us <= 0n
  ) {
    throw new Error("dispatcher_lease_invalid");
  }
  return lease;
}

export async function submitBuyVoidPaymentKeyedDispatchV1(input: {
  attempt_id: unknown;
  request_fingerprint_sha256: unknown;
  client_id: unknown;
  store: BuyVoidPaymentKeyedDispatcherStoreV1;
}): Promise<BuyVoidPaymentKeyedDispatcherSubmitDecisionV1> {
  const attemptId = requireAttemptId(input.attempt_id);
  const fingerprint = requireSha256(
    "dispatcher_request_fingerprint_sha256",
    input.request_fingerprint_sha256,
  );
  const clientId = requireActor("dispatcher_client_id", input.client_id);
  const store = requireStore(input.store);

  return store.run_serializable_job_decision(attemptId, async (tx) => {
    const now = await tx.now_us();
    if (now <= 0n) throw new Error("dispatcher_database_time_invalid");
    const existing = await tx.read_job_for_update(attemptId);
    if (!existing) {
      const job: BuyVoidPaymentKeyedDispatcherJobRecordV1 = {
        schema: "void_buy_void_payment_keyed_dispatcher_job_v1",
        marker: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1,
        attempt_id: attemptId,
        request_fingerprint_sha256: fingerprint,
        submitted_at_us: now,
        result_fingerprint_sha256: null,
        published: false,
        published_gen: null,
        lease_gen: 0n,
        lease_token: null,
        lease_owner: null,
        lease_expires_us: null,
        version: 0n,
      };
      assertRecord(job);
      if (!(await tx.insert_job(job))) {
        throw new Error("dispatcher_unexpected_insert_conflict");
      }
      await audit(
        tx,
        auditBase({
          attempt_id: attemptId,
          event_type: "SUBMIT",
          outcome: "SUCCESS",
          actor_id: clientId,
          lease_gen: 0n,
          created_at_us: now,
          detail: { request_fingerprint_sha256: fingerprint },
        }),
      );
      return { ok: true, status: "submitted", job: publicJob(job) };
    }

    assertRecord(existing);
    if (existing.request_fingerprint_sha256 !== fingerprint) {
      await audit(
        tx,
        auditBase({
          attempt_id: attemptId,
          event_type: "PAYLOAD_CONFLICT",
          outcome: "REJECTED",
          actor_id: clientId,
          lease_gen: existing.lease_gen,
          created_at_us: now,
          detail: { submitted_request_fingerprint_sha256: fingerprint },
        }),
      );
      return {
        ok: false,
        status: "rejected",
        reason: "request_fingerprint_mismatch",
        job: publicJob(existing),
      };
    }

    await audit(
      tx,
      auditBase({
        attempt_id: attemptId,
        event_type: "SUBMIT_REPLAY",
        outcome: "IDEMPOTENT",
        actor_id: clientId,
        lease_gen: existing.lease_gen,
        created_at_us: now,
        detail: { published: existing.published },
      }),
    );
    return { ok: true, status: "idempotent", job: publicJob(existing) };
  });
}

export async function claimBuyVoidPaymentKeyedDispatchV1(input: {
  attempt_id: unknown;
  worker_id: unknown;
  lease_ttl_us: unknown;
  lease_token_factory: BuyVoidPaymentKeyedDispatcherTokenFactoryV1;
  store: BuyVoidPaymentKeyedDispatcherStoreV1;
}): Promise<BuyVoidPaymentKeyedDispatcherClaimDecisionV1> {
  const attemptId = requireAttemptId(input.attempt_id);
  const workerId = requireActor("dispatcher_worker_id", input.worker_id);
  const ttl = requirePositiveBigInt("dispatcher_lease_ttl_us", input.lease_ttl_us);
  const store = requireStore(input.store);
  if (typeof input.lease_token_factory !== "function") {
    throw new Error("dispatcher_lease_token_factory_missing");
  }

  return store.run_serializable_job_decision(attemptId, async (tx) => {
    const now = await tx.now_us();
    if (now <= 0n) throw new Error("dispatcher_database_time_invalid");
    const current = await tx.read_job_for_update(attemptId);
    if (!current) {
      await audit(
        tx,
        auditBase({
          attempt_id: attemptId,
          event_type: "CLAIM_REJECT_NOT_FOUND",
          outcome: "REJECTED",
          actor_id: workerId,
          lease_gen: 0n,
          created_at_us: now,
        }),
      );
      return { ok: false, status: "rejected", reason: "attempt_not_found" };
    }
    assertRecord(current);
    if (current.published) {
      await audit(
        tx,
        auditBase({
          attempt_id: attemptId,
          event_type: "CLAIM_REJECT_PUBLISHED",
          outcome: "REJECTED",
          actor_id: workerId,
          lease_gen: current.lease_gen,
          created_at_us: now,
        }),
      );
      return { ok: true, status: "published", job: publicJob(current) };
    }

    const active =
      current.lease_token !== null &&
      current.lease_expires_us !== null &&
      current.lease_expires_us > now;
    if (active) {
      await audit(
        tx,
        auditBase({
          attempt_id: attemptId,
          event_type: "CLAIM_REJECT_ACTIVE",
          outcome: "REJECTED",
          actor_id: workerId,
          lease_gen: current.lease_gen,
          created_at_us: now,
          detail: {
            lease_owner: current.lease_owner || "",
            lease_expires_us: String(current.lease_expires_us),
          },
        }),
      );
      return {
        ok: false,
        status: "rejected",
        reason: "active_lease",
        job: publicJob(current),
      };
    }

    if (current.lease_token !== null) {
      await audit(
        tx,
        auditBase({
          attempt_id: attemptId,
          event_type: "LEASE_EXPIRED_RECLAIM",
          outcome: "OBSERVED",
          actor_id: workerId,
          lease_gen: current.lease_gen,
          created_at_us: now,
          detail: {
            previous_owner: current.lease_owner || "",
            previous_expires_us: String(current.lease_expires_us),
          },
        }),
      );
    }

    const token = String(input.lease_token_factory()).trim().toLowerCase();
    if (!TOKEN.test(token)) {
      throw new Error("dispatcher_generated_lease_token_invalid");
    }
    const next: BuyVoidPaymentKeyedDispatcherJobRecordV1 = {
      ...current,
      lease_gen: current.lease_gen + 1n,
      lease_token: token,
      lease_owner: workerId,
      lease_expires_us: now + ttl,
      version: current.version + 1n,
    };
    assertRecord(next);
    if (!(await tx.update_job(attemptId, current.version, next))) {
      throw new Error("dispatcher_storage_conflict");
    }
    await audit(
      tx,
      auditBase({
        attempt_id: attemptId,
        event_type: "CLAIM",
        outcome: "SUCCESS",
        actor_id: workerId,
        lease_gen: next.lease_gen,
        created_at_us: now,
        detail: { lease_expires_us: String(next.lease_expires_us) },
      }),
    );
    return {
      ok: true,
      status: "claimed",
      lease: leaseFromJob(next),
      job: publicJob(next),
    };
  });
}

export async function renewBuyVoidPaymentKeyedDispatchLeaseV1(input: {
  lease: BuyVoidPaymentKeyedDispatcherLeaseV1;
  lease_ttl_us: unknown;
  store: BuyVoidPaymentKeyedDispatcherStoreV1;
}): Promise<BuyVoidPaymentKeyedDispatcherRenewDecisionV1> {
  const lease = requireLease(input.lease);
  const ttl = requirePositiveBigInt("dispatcher_lease_ttl_us", input.lease_ttl_us);
  const store = requireStore(input.store);

  return store.run_serializable_job_decision(lease.attempt_id, async (tx) => {
    const now = await tx.now_us();
    if (now <= 0n) throw new Error("dispatcher_database_time_invalid");
    const current = await tx.read_job_for_update(lease.attempt_id);
    if (!current) {
      await audit(
        tx,
        auditBase({
          attempt_id: lease.attempt_id,
          event_type: "RENEW_REJECT_NOT_FOUND",
          outcome: "REJECTED",
          actor_id: lease.worker_id,
          lease_gen: lease.lease_gen,
          created_at_us: now,
        }),
      );
      return { ok: false, status: "rejected", reason: "attempt_not_found" };
    }
    assertRecord(current);
    if (current.published) {
      await audit(
        tx,
        auditBase({
          attempt_id: lease.attempt_id,
          event_type: "RENEW_REJECT_PUBLISHED",
          outcome: "REJECTED",
          actor_id: lease.worker_id,
          lease_gen: lease.lease_gen,
          created_at_us: now,
        }),
      );
      return { ok: false, status: "rejected", reason: "already_published" };
    }
    if (current.lease_gen !== lease.lease_gen) {
      await audit(
        tx,
        auditBase({
          attempt_id: lease.attempt_id,
          event_type: "RENEW_REJECT_STALE",
          outcome: "REJECTED",
          actor_id: lease.worker_id,
          lease_gen: lease.lease_gen,
          created_at_us: now,
          detail: { current_lease_gen: String(current.lease_gen) },
        }),
      );
      return { ok: false, status: "rejected", reason: "stale_generation" };
    }
    if (
      current.lease_token !== lease.lease_token ||
      current.lease_owner !== lease.worker_id
    ) {
      await audit(
        tx,
        auditBase({
          attempt_id: lease.attempt_id,
          event_type: "RENEW_REJECT_UNAUTHORIZED",
          outcome: "REJECTED",
          actor_id: lease.worker_id,
          lease_gen: lease.lease_gen,
          created_at_us: now,
        }),
      );
      return { ok: false, status: "rejected", reason: "unauthorized_lease" };
    }
    if (current.lease_expires_us === null || current.lease_expires_us <= now) {
      await audit(
        tx,
        auditBase({
          attempt_id: lease.attempt_id,
          event_type: "RENEW_REJECT_EXPIRED",
          outcome: "REJECTED",
          actor_id: lease.worker_id,
          lease_gen: lease.lease_gen,
          created_at_us: now,
        }),
      );
      return { ok: false, status: "rejected", reason: "lease_expired" };
    }

    const next: BuyVoidPaymentKeyedDispatcherJobRecordV1 = {
      ...current,
      lease_expires_us: now + ttl,
      version: current.version + 1n,
    };
    assertRecord(next);
    if (!(await tx.update_job(lease.attempt_id, current.version, next))) {
      throw new Error("dispatcher_storage_conflict");
    }
    await audit(
      tx,
      auditBase({
        attempt_id: lease.attempt_id,
        event_type: "LEASE_RENEW",
        outcome: "SUCCESS",
        actor_id: lease.worker_id,
        lease_gen: lease.lease_gen,
        created_at_us: now,
        detail: { lease_expires_us: String(next.lease_expires_us) },
      }),
    );
    return {
      ok: true,
      status: "renewed",
      lease: leaseFromJob(next),
      job: publicJob(next),
    };
  });
}

export async function publishBuyVoidPaymentKeyedDispatchResultV1(input: {
  lease: BuyVoidPaymentKeyedDispatcherLeaseV1;
  result_fingerprint_sha256: unknown;
  store: BuyVoidPaymentKeyedDispatcherStoreV1;
}): Promise<BuyVoidPaymentKeyedDispatcherPublishDecisionV1> {
  const lease = requireLease(input.lease);
  const resultFingerprint = requireSha256(
    "dispatcher_result_fingerprint_sha256",
    input.result_fingerprint_sha256,
  );
  const store = requireStore(input.store);

  return store.run_serializable_job_decision(lease.attempt_id, async (tx) => {
    const now = await tx.now_us();
    if (now <= 0n) throw new Error("dispatcher_database_time_invalid");
    const current = await tx.read_job_for_update(lease.attempt_id);
    if (!current) {
      await audit(
        tx,
        auditBase({
          attempt_id: lease.attempt_id,
          event_type: "PUBLISH_REJECT_NOT_FOUND",
          outcome: "REJECTED",
          actor_id: lease.worker_id,
          lease_gen: lease.lease_gen,
          created_at_us: now,
        }),
      );
      return { ok: false, status: "rejected", reason: "attempt_not_found" };
    }
    assertRecord(current);
    if (current.published) {
      await audit(
        tx,
        auditBase({
          attempt_id: lease.attempt_id,
          event_type: "PUBLISH_REPLAY",
          outcome: "IDEMPOTENT",
          actor_id: lease.worker_id,
          lease_gen: lease.lease_gen,
          created_at_us: now,
          detail: {
            submitted_result_fingerprint_sha256: resultFingerprint,
            canonical_result_fingerprint_sha256:
              current.result_fingerprint_sha256 || "",
          },
        }),
      );
      return { ok: true, status: "idempotent", job: publicJob(current) };
    }
    if (current.lease_gen !== lease.lease_gen) {
      await audit(
        tx,
        auditBase({
          attempt_id: lease.attempt_id,
          event_type: "PUBLISH_REJECT_STALE",
          outcome: "REJECTED",
          actor_id: lease.worker_id,
          lease_gen: lease.lease_gen,
          created_at_us: now,
          detail: { current_lease_gen: String(current.lease_gen) },
        }),
      );
      return { ok: false, status: "rejected", reason: "stale_generation" };
    }
    if (
      current.lease_token !== lease.lease_token ||
      current.lease_owner !== lease.worker_id
    ) {
      await audit(
        tx,
        auditBase({
          attempt_id: lease.attempt_id,
          event_type: "PUBLISH_REJECT_UNAUTHORIZED",
          outcome: "REJECTED",
          actor_id: lease.worker_id,
          lease_gen: lease.lease_gen,
          created_at_us: now,
        }),
      );
      return { ok: false, status: "rejected", reason: "unauthorized_lease" };
    }
    if (current.lease_expires_us === null || current.lease_expires_us <= now) {
      await audit(
        tx,
        auditBase({
          attempt_id: lease.attempt_id,
          event_type: "PUBLISH_REJECT_EXPIRED",
          outcome: "REJECTED",
          actor_id: lease.worker_id,
          lease_gen: lease.lease_gen,
          created_at_us: now,
        }),
      );
      return { ok: false, status: "rejected", reason: "lease_expired" };
    }

    const next: BuyVoidPaymentKeyedDispatcherJobRecordV1 = {
      ...current,
      result_fingerprint_sha256: resultFingerprint,
      published: true,
      published_gen: current.lease_gen,
      lease_token: null,
      lease_owner: null,
      lease_expires_us: null,
      version: current.version + 1n,
    };
    assertRecord(next);
    if (!(await tx.update_job(lease.attempt_id, current.version, next))) {
      throw new Error("dispatcher_storage_conflict");
    }
    await audit(
      tx,
      auditBase({
        attempt_id: lease.attempt_id,
        event_type: "PUBLISH",
        outcome: "SUCCESS",
        actor_id: lease.worker_id,
        lease_gen: lease.lease_gen,
        created_at_us: now,
        detail: { result_fingerprint_sha256: resultFingerprint },
      }),
    );
    return { ok: true, status: "published", job: publicJob(next) };
  });
}
