import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1,
  type BuyVoidPaymentKeyedDispatcherAuditDecisionV1,
  type BuyVoidPaymentKeyedDispatcherJobRecordV1,
  type BuyVoidPaymentKeyedDispatcherStoreV1,
  type BuyVoidPaymentKeyedDispatcherTransactionV1,
} from "./buy_void_payment_keyed_dispatcher_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_STORE_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_STORE_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_TABLES_V1 = {
  jobs: "void_buy_void_payment_keyed_dispatcher_jobs_v1",
  audit: "void_buy_void_payment_keyed_dispatcher_audit_v1",
  decision_cursors:
    "void_buy_void_payment_keyed_dispatcher_decision_cursors_v1",
} as const;

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_AUTHORITY_V1 = {
  source_only_adapter: true,
  production_store_adapter_implementation_present: true,
  production_connection_factory_present: false,
  injected_pool_required: true,
  package_pg_dependency_added: false,
  automatic_schema_migration: false,
  runtime_route_mount: false,
  canonical_parent_dispatch: false,
  transaction_isolation: "SERIALIZABLE",
  per_job_admission:
    "session_advisory_lock_before_serializable_snapshot",
  session_advisory_key:
    "first_64_bits_of_attempt_id_as_two_signed_int32",
  advisory_lock_collision_effect: "safe_over_serialization_only",
  canonical_audit_order: "per_job_decision_seq",
  audit_id_is_commit_order: false,
  retry_sqlstates: ["40001", "40P01"] as const,
  default_max_attempts: 3,
  database_time_source: "clock_timestamp",
  sql_values_parameterized: true,
  transaction_broadcast: false,
  wallet_access: false,
  signing: false,
  money_movement: false,
} as const;

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SQL_V1 = {
  advisory_lock:
    "SELECT pg_advisory_lock($1::integer, $2::integer)",
  advisory_unlock:
    "SELECT pg_advisory_unlock($1::integer, $2::integer) AS unlocked",
  begin_serializable:
    "BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE",
  commit: "COMMIT",
  rollback: "ROLLBACK",
  now_us:
    "SELECT floor(extract(epoch FROM clock_timestamp()) * 1000000)::bigint AS now_us",
  read_job_for_update: `
SELECT
  attempt_id,
  request_fingerprint_sha256,
  submitted_at_us,
  result_fingerprint_sha256,
  published,
  published_gen,
  lease_gen,
  lease_token,
  lease_owner,
  lease_expires_us,
  version
FROM void_buy_void_payment_keyed_dispatcher_jobs_v1
WHERE attempt_id = $1
FOR UPDATE`.trim(),
  insert_job: `
INSERT INTO void_buy_void_payment_keyed_dispatcher_jobs_v1 (
  attempt_id,
  request_fingerprint_sha256,
  submitted_at_us,
  result_fingerprint_sha256,
  published,
  published_gen,
  lease_gen,
  lease_token,
  lease_owner,
  lease_expires_us,
  version
) VALUES (
  $1, $2, $3::bigint, $4, $5, $6::bigint, $7::bigint, $8, $9,
  $10::bigint, $11::bigint
)
ON CONFLICT (attempt_id) DO NOTHING`.trim(),
  update_job: `
UPDATE void_buy_void_payment_keyed_dispatcher_jobs_v1
SET
  request_fingerprint_sha256 = $3,
  submitted_at_us = $4::bigint,
  result_fingerprint_sha256 = $5,
  published = $6,
  published_gen = $7::bigint,
  lease_gen = $8::bigint,
  lease_token = $9,
  lease_owner = $10,
  lease_expires_us = $11::bigint,
  version = $12::bigint
WHERE attempt_id = $1
  AND version = $2::bigint`.trim(),
  allocate_decision_seq: `
INSERT INTO void_buy_void_payment_keyed_dispatcher_decision_cursors_v1 (
  attempt_id,
  last_decision_seq
) VALUES ($1, 1)
ON CONFLICT (attempt_id) DO UPDATE
SET last_decision_seq =
  void_buy_void_payment_keyed_dispatcher_decision_cursors_v1.last_decision_seq + 1
RETURNING last_decision_seq`.trim(),
  insert_audit: `
INSERT INTO void_buy_void_payment_keyed_dispatcher_audit_v1 (
  attempt_id,
  decision_seq,
  event_type,
  outcome,
  actor_id,
  lease_gen,
  created_at_us,
  detail
) VALUES (
  $1, $2::bigint, $3, $4, $5, $6::bigint, $7::bigint, $8::jsonb
)`.trim(),
} as const;

export type BuyVoidPaymentKeyedDispatcherPostgresQueryResultV1 = {
  rows: readonly Record<string, unknown>[];
  rowCount: number | null;
};

export type BuyVoidPaymentKeyedDispatcherPostgresClientV1 = {
  query: (
    text: string,
    values?: readonly unknown[],
  ) => Promise<BuyVoidPaymentKeyedDispatcherPostgresQueryResultV1>;
  release: (error?: Error | boolean) => void;
};

export type BuyVoidPaymentKeyedDispatcherPostgresPoolV1 = {
  connect: () => Promise<BuyVoidPaymentKeyedDispatcherPostgresClientV1>;
};

export type BuyVoidPaymentKeyedDispatcherPostgresRetryV1 = {
  attempt_id: string;
  sqlstate: "40001" | "40P01";
  failed_attempt: number;
  next_attempt: number;
  max_attempts: number;
};

export type BuyVoidPaymentKeyedDispatcherPostgresStoreOptionsV1 = {
  pool: BuyVoidPaymentKeyedDispatcherPostgresPoolV1;
  max_attempts?: number;
  on_retry?: (
    event: BuyVoidPaymentKeyedDispatcherPostgresRetryV1,
  ) => void | Promise<void>;
};

const ATTEMPT_ID = /^[0-9a-f]{64}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const TOKEN = /^[0-9a-f]{32}$/;
const ACTOR = /^[A-Za-z0-9._:@/-]{1,160}$/;
const EVENT_TYPES = new Set([
  "SUBMIT",
  "SUBMIT_REPLAY",
  "PAYLOAD_CONFLICT",
  "CLAIM",
  "CLAIM_REJECT_NOT_FOUND",
  "CLAIM_REJECT_PUBLISHED",
  "CLAIM_REJECT_ACTIVE",
  "LEASE_EXPIRED_RECLAIM",
  "LEASE_RENEW",
  "RENEW_REJECT_NOT_FOUND",
  "RENEW_REJECT_PUBLISHED",
  "RENEW_REJECT_STALE",
  "RENEW_REJECT_UNAUTHORIZED",
  "RENEW_REJECT_EXPIRED",
  "PUBLISH",
  "PUBLISH_REPLAY",
  "PUBLISH_REJECT_NOT_FOUND",
  "PUBLISH_REJECT_STALE",
  "PUBLISH_REJECT_UNAUTHORIZED",
  "PUBLISH_REJECT_EXPIRED",
]);
const OUTCOMES = new Set(["SUCCESS", "IDEMPOTENT", "REJECTED", "OBSERVED"]);

function requireAttemptId(value: unknown): string {
  const text = String(value ?? "").trim().toLowerCase();
  if (!ATTEMPT_ID.test(text)) {
    throw new Error("dispatcher_postgres_attempt_id_invalid");
  }
  return text;
}

function requireMaxAttempts(value: unknown): number {
  const parsed =
    value === undefined
      ? VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_AUTHORITY_V1
          .default_max_attempts
      : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 8) {
    throw new Error("dispatcher_postgres_max_attempts_invalid");
  }
  return parsed;
}

function requireBigInt(name: string, value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return BigInt(value);
  }
  if (typeof value === "string" && /^-?[0-9]+$/.test(value)) {
    return BigInt(value);
  }
  throw new Error(name + "_invalid");
}

function nullableBigInt(name: string, value: unknown): bigint | null {
  return value === null || value === undefined ? null : requireBigInt(name, value);
}

function nullableText(name: string, value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error(name + "_invalid");
  return value;
}

function signedInt32(hex: string): number {
  const unsigned = Number.parseInt(hex, 16);
  if (!Number.isSafeInteger(unsigned) || unsigned < 0 || unsigned > 0xffffffff) {
    throw new Error("dispatcher_postgres_advisory_key_invalid");
  }
  return unsigned >= 0x80000000 ? unsigned - 0x100000000 : unsigned;
}

export function buyVoidPaymentKeyedDispatcherPostgresAdvisoryKeysV1(
  attemptId: string,
): readonly [number, number] {
  const canonical = requireAttemptId(attemptId);
  return [
    signedInt32(canonical.slice(0, 8)),
    signedInt32(canonical.slice(8, 16)),
  ] as const;
}

function assertJobRecord(
  job: BuyVoidPaymentKeyedDispatcherJobRecordV1,
): BuyVoidPaymentKeyedDispatcherJobRecordV1 {
  if (
    job.schema !== "void_buy_void_payment_keyed_dispatcher_job_v1" ||
    job.marker !== VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1 ||
    !ATTEMPT_ID.test(job.attempt_id) ||
    !SHA256.test(job.request_fingerprint_sha256) ||
    job.submitted_at_us <= 0n ||
    job.lease_gen < 0n ||
    job.version < 0n
  ) {
    throw new Error("dispatcher_postgres_job_record_invalid");
  }
  const leaseShape = [
    job.lease_token !== null,
    job.lease_owner !== null,
    job.lease_expires_us !== null,
  ];
  if (new Set(leaseShape).size !== 1) {
    throw new Error("dispatcher_postgres_job_lease_shape_invalid");
  }
  if (job.lease_token !== null && !TOKEN.test(job.lease_token)) {
    throw new Error("dispatcher_postgres_job_lease_token_invalid");
  }
  if (job.lease_owner !== null && !ACTOR.test(job.lease_owner)) {
    throw new Error("dispatcher_postgres_job_lease_owner_invalid");
  }
  if (job.lease_expires_us !== null && job.lease_expires_us <= 0n) {
    throw new Error("dispatcher_postgres_job_lease_expiry_invalid");
  }
  if (job.published) {
    if (
      job.result_fingerprint_sha256 === null ||
      !SHA256.test(job.result_fingerprint_sha256) ||
      job.published_gen !== job.lease_gen ||
      job.lease_token !== null ||
      job.lease_owner !== null ||
      job.lease_expires_us !== null
    ) {
      throw new Error("dispatcher_postgres_job_published_shape_invalid");
    }
  } else if (
    job.result_fingerprint_sha256 !== null ||
    job.published_gen !== null
  ) {
    throw new Error("dispatcher_postgres_job_unpublished_shape_invalid");
  }
  return job;
}

function jobFromRow(
  row: Record<string, unknown>,
): BuyVoidPaymentKeyedDispatcherJobRecordV1 {
  const attemptId = requireAttemptId(row.attempt_id);
  const fingerprint = String(row.request_fingerprint_sha256 ?? "")
    .trim()
    .toLowerCase();
  if (!SHA256.test(fingerprint)) {
    throw new Error("dispatcher_postgres_request_fingerprint_invalid");
  }
  if (typeof row.published !== "boolean") {
    throw new Error("dispatcher_postgres_published_invalid");
  }
  const result = nullableText(
    "dispatcher_postgres_result_fingerprint",
    row.result_fingerprint_sha256,
  );
  if (result !== null && !SHA256.test(result)) {
    throw new Error("dispatcher_postgres_result_fingerprint_invalid");
  }
  const token = nullableText(
    "dispatcher_postgres_lease_token",
    row.lease_token,
  );
  const owner = nullableText(
    "dispatcher_postgres_lease_owner",
    row.lease_owner,
  );
  return assertJobRecord({
    schema: "void_buy_void_payment_keyed_dispatcher_job_v1",
    marker: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1,
    attempt_id: attemptId,
    request_fingerprint_sha256: fingerprint,
    submitted_at_us: requireBigInt(
      "dispatcher_postgres_submitted_at_us",
      row.submitted_at_us,
    ),
    result_fingerprint_sha256: result,
    published: row.published,
    published_gen: nullableBigInt(
      "dispatcher_postgres_published_gen",
      row.published_gen,
    ),
    lease_gen: requireBigInt(
      "dispatcher_postgres_lease_gen",
      row.lease_gen,
    ),
    lease_token: token,
    lease_owner: owner,
    lease_expires_us: nullableBigInt(
      "dispatcher_postgres_lease_expires_us",
      row.lease_expires_us,
    ),
    version: requireBigInt("dispatcher_postgres_version", row.version),
  });
}

function jobValues(
  job: BuyVoidPaymentKeyedDispatcherJobRecordV1,
): readonly unknown[] {
  assertJobRecord(job);
  return [
    job.attempt_id,
    job.request_fingerprint_sha256,
    String(job.submitted_at_us),
    job.result_fingerprint_sha256,
    job.published,
    job.published_gen === null ? null : String(job.published_gen),
    String(job.lease_gen),
    job.lease_token,
    job.lease_owner,
    job.lease_expires_us === null ? null : String(job.lease_expires_us),
    String(job.version),
  ];
}

function assertAuditDecision(
  decision: Omit<BuyVoidPaymentKeyedDispatcherAuditDecisionV1, "decision_seq">,
): void {
  if (
    decision.schema !== "void_buy_void_payment_keyed_dispatcher_audit_v1" ||
    decision.marker !== VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1 ||
    !ATTEMPT_ID.test(decision.attempt_id) ||
    !EVENT_TYPES.has(decision.event_type) ||
    !OUTCOMES.has(decision.outcome) ||
    (decision.actor_id !== null && !ACTOR.test(decision.actor_id)) ||
    decision.lease_gen < 0n ||
    decision.created_at_us <= 0n ||
    !decision.detail ||
    typeof decision.detail !== "object" ||
    Array.isArray(decision.detail)
  ) {
    throw new Error("dispatcher_postgres_audit_decision_invalid");
  }
  for (const [key, value] of Object.entries(decision.detail)) {
    if (
      !/^[A-Za-z0-9._:-]{1,96}$/.test(key) ||
      (typeof value !== "string" && typeof value !== "boolean")
    ) {
      throw new Error("dispatcher_postgres_audit_detail_invalid");
    }
  }
}

function sqlstate(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const value = (error as { code?: unknown }).code;
  return typeof value === "string" ? value : "";
}

function asError(error: unknown, fallback: string): Error {
  if (error instanceof Error) return error;
  return new Error(fallback + ":" + String(error));
}

function transactionFor(
  client: BuyVoidPaymentKeyedDispatcherPostgresClientV1,
): BuyVoidPaymentKeyedDispatcherTransactionV1 {
  const sql = VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SQL_V1;
  return {
    async now_us() {
      const result = await client.query(sql.now_us);
      if (result.rows.length !== 1) {
        throw new Error("dispatcher_postgres_database_time_row_invalid");
      }
      const now = requireBigInt(
        "dispatcher_postgres_database_time",
        result.rows[0]?.now_us,
      );
      if (now <= 0n) {
        throw new Error("dispatcher_postgres_database_time_invalid");
      }
      return now;
    },

    async read_job_for_update(attemptId) {
      const canonical = requireAttemptId(attemptId);
      const result = await client.query(sql.read_job_for_update, [canonical]);
      if (result.rows.length === 0) return null;
      if (result.rows.length !== 1) {
        throw new Error("dispatcher_postgres_job_row_count_invalid");
      }
      return jobFromRow(result.rows[0] as Record<string, unknown>);
    },

    async insert_job(record) {
      const values = jobValues(record);
      const result = await client.query(sql.insert_job, values);
      return result.rowCount === 1;
    },

    async update_job(attemptId, expectedVersion, next) {
      const canonical = requireAttemptId(attemptId);
      assertJobRecord(next);
      if (
        next.attempt_id !== canonical ||
        next.version !== expectedVersion + 1n
      ) {
        throw new Error("dispatcher_postgres_update_binding_invalid");
      }
      const values = jobValues(next);
      const result = await client.query(sql.update_job, [
        canonical,
        String(expectedVersion),
        ...values.slice(1),
      ]);
      return result.rowCount === 1;
    },

    async append_decision(decision) {
      assertAuditDecision(decision);
      const cursor = await client.query(sql.allocate_decision_seq, [
        decision.attempt_id,
      ]);
      if (cursor.rows.length !== 1) {
        throw new Error("dispatcher_postgres_decision_cursor_invalid");
      }
      const sequence = requireBigInt(
        "dispatcher_postgres_decision_seq",
        cursor.rows[0]?.last_decision_seq,
      );
      if (sequence <= 0n) {
        throw new Error("dispatcher_postgres_decision_seq_invalid");
      }
      const inserted = await client.query(sql.insert_audit, [
        decision.attempt_id,
        String(sequence),
        decision.event_type,
        decision.outcome,
        decision.actor_id,
        String(decision.lease_gen),
        String(decision.created_at_us),
        JSON.stringify(decision.detail),
      ]);
      if (inserted.rowCount !== 1) {
        throw new Error("dispatcher_postgres_audit_insert_failed");
      }
      return sequence;
    },
  };
}

export function createBuyVoidPaymentKeyedDispatcherPostgresStoreV1(
  options: BuyVoidPaymentKeyedDispatcherPostgresStoreOptionsV1,
): BuyVoidPaymentKeyedDispatcherStoreV1 {
  if (
    !options?.pool ||
    typeof options.pool.connect !== "function"
  ) {
    throw new Error("dispatcher_postgres_pool_invalid");
  }
  const maxAttempts = requireMaxAttempts(options.max_attempts);
  const retryStates = new Set<string>(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_AUTHORITY_V1
      .retry_sqlstates,
  );
  const sql = VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SQL_V1;

  return {
    authority: {
      transaction_isolation: "SERIALIZABLE",
      per_job_admission:
        "session_advisory_lock_before_serializable_snapshot",
      canonical_audit_order: "per_job_decision_seq",
      retry_sqlstates: ["40001", "40P01"],
    },

    async run_serializable_job_decision<T>(
      attemptId: string,
      action: (
        tx: BuyVoidPaymentKeyedDispatcherTransactionV1,
      ) => T | Promise<T>,
    ): Promise<T> {
      const canonical = requireAttemptId(attemptId);
      if (typeof action !== "function") {
        throw new Error("dispatcher_postgres_action_invalid");
      }
      const client = await options.pool.connect();
      if (
        !client ||
        typeof client.query !== "function" ||
        typeof client.release !== "function"
      ) {
        throw new Error("dispatcher_postgres_client_invalid");
      }

      const keys =
        buyVoidPaymentKeyedDispatcherPostgresAdvisoryKeysV1(canonical);
      let lockHeld = false;
      let operationError: unknown;
      let releaseError: Error | undefined;

      try {
        await client.query(sql.advisory_lock, keys);
        lockHeld = true;

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          let transactionOpen = false;
          try {
            await client.query(sql.begin_serializable);
            transactionOpen = true;
            const value = await action(transactionFor(client));
            await client.query(sql.commit);
            transactionOpen = false;
            return value;
          } catch (error) {
            if (transactionOpen) {
              try {
                await client.query(sql.rollback);
                transactionOpen = false;
              } catch (rollbackError) {
                releaseError = asError(
                  rollbackError,
                  "dispatcher_postgres_rollback_failed",
                );
                throw new Error(
                  "dispatcher_postgres_rollback_failed",
                  { cause: rollbackError },
                );
              }
            }

            const state = sqlstate(error);
            if (
              retryStates.has(state) &&
              attempt < maxAttempts
            ) {
              if (options.on_retry) {
                await options.on_retry({
                  attempt_id: canonical,
                  sqlstate: state as "40001" | "40P01",
                  failed_attempt: attempt,
                  next_attempt: attempt + 1,
                  max_attempts: maxAttempts,
                });
              }
              continue;
            }
            throw error;
          }
        }
        throw new Error("dispatcher_postgres_retry_loop_unreachable");
      } catch (error) {
        operationError = error;
        throw error;
      } finally {
        if (lockHeld) {
          try {
            const unlocked = await client.query(sql.advisory_unlock, keys);
            if (
              unlocked.rows.length !== 1 ||
              unlocked.rows[0]?.unlocked !== true
            ) {
              throw new Error("dispatcher_postgres_advisory_unlock_failed");
            }
          } catch (error) {
            releaseError = asError(
              error,
              "dispatcher_postgres_advisory_unlock_failed",
            );
          }
        }

        try {
          client.release(releaseError);
        } catch (error) {
          if (operationError === undefined && releaseError === undefined) {
            throw error;
          }
        }

        if (operationError === undefined && releaseError !== undefined) {
          throw releaseError;
        }
      }
    },
  };
}
