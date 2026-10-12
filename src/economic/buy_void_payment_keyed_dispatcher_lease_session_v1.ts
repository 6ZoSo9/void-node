import {
  createBuyVoidPaymentKeyedDispatcherNonReplayablePostgresV1,
  type BuyVoidPaymentKeyedDispatcherNonReplayableOptionsV1,
} from "./buy_void_payment_keyed_dispatcher_nonreplayable_postgres_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1,
  type BuyVoidPaymentKeyedDispatcherLeaseV1,
  type BuyVoidPaymentKeyedDispatcherTransactionV1,
} from "./buy_void_payment_keyed_dispatcher_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_LEASE_SESSION_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_LEASE_SESSION_V1";

export type BuyVoidPaymentKeyedDispatcherLeaseSessionV1 = Readonly<{
  attempt_id: string;
  // A current sample, not permission to reuse a prior true at a later effect.
  revalidate_lease: () => Promise<boolean>;
}>;

type ReasonV1 =
  | "input_invalid"
  | "job_invalid"
  | "job_missing"
  | "request_identity_mismatch"
  | "lease_identity_mismatch"
  | "job_version_changed"
  | "lease_expired"
  | "database_clock_invalid"
  | "database_clock_regressed"
  | "lease_read_failed"
  | "overlapping_recheck"
  | "session_closed_during_recheck"
  | "action_failed"
  | "store_completion_unconfirmed";

export type BuyVoidPaymentKeyedDispatcherLeaseSessionOutcomeV1<T> = Readonly<{
  marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_LEASE_SESSION_V1;
  ok: boolean;
  status: "completed" | "held" | "reconciliation_required";
  reason: ReasonV1 | null;
  action_started: boolean;
  action_returned: boolean;
  result: Readonly<{ value: T }> | null;
  store_completion_confirmed: boolean;
  reconciliation_required: boolean;
  lease_checks_started: number;
  lease_checks_completed: number;
  last_database_time_us: bigint | null;
  session_closed: true;
  pending_lease_checks_settled: true;
  session_exposes_lease_token: false;
  session_exposes_transaction_interface: false;
  automatic_retry_allowed: false;
  durable_outcome_receipt: false;
  cross_invocation_deduplication: false;
  saga_validation_performed: false;
  effect_cut_integration_complete: false;
}>;

const SHA = /^[0-9a-f]{64}$/;
const TOKEN = /^[0-9a-f]{32}$/;
const ACTOR = /^[A-Za-z0-9._:@/-]{1,160}$/;
const LEASE_KEYS = [
  "marker", "attempt_id", "lease_gen", "lease_token", "worker_id", "lease_expires_us",
];

// Internal server configuration, not a deserializer for arbitrary live graphs.
// Ordinary accessors are rejected; Proxy traps are outside this trusted boundary.
function captureLease(value: BuyVoidPaymentKeyedDispatcherLeaseV1):
Readonly<BuyVoidPaymentKeyedDispatcherLeaseV1> | null {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== LEASE_KEYS.length ||
        keys.some((key) => typeof key !== "string" || !LEASE_KEYS.includes(key))) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const copy: Record<string, unknown> = {};
    for (const key of LEASE_KEYS) {
      const descriptor = descriptors[key];
      if (!descriptor || !Object.hasOwn(descriptor, "value") || !descriptor.enumerable) return null;
      copy[key] = descriptor.value;
    }
    if (copy.marker !== VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1 ||
        typeof copy.attempt_id !== "string" || !SHA.test(copy.attempt_id) ||
        typeof copy.lease_gen !== "bigint" || copy.lease_gen <= 0n ||
        typeof copy.lease_token !== "string" || !TOKEN.test(copy.lease_token) ||
        typeof copy.worker_id !== "string" || !ACTOR.test(copy.worker_id) ||
        typeof copy.lease_expires_us !== "bigint" || copy.lease_expires_us <= 0n) return null;
    return Object.freeze(copy) as Readonly<BuyVoidPaymentKeyedDispatcherLeaseV1>;
  } catch {
    return null;
  }
}

/**
 * One server-owned action under a canonical, non-replayable PostgreSQL session.
 * Validates a real dispatcher lease before entry and owns all subsequent lease
 * reads through completion. This is not a complete signing/broadcast adapter.
 */
export function createBuyVoidPaymentKeyedDispatcherLeaseSessionV1(
  options: BuyVoidPaymentKeyedDispatcherNonReplayableOptionsV1,
) {
  const runner = createBuyVoidPaymentKeyedDispatcherNonReplayablePostgresV1(options);
  return Object.freeze({
    async run_once<T>(
      leaseInput: BuyVoidPaymentKeyedDispatcherLeaseV1,
      requestFingerprint: string,
      action: (session: BuyVoidPaymentKeyedDispatcherLeaseSessionV1) => T | Promise<T>,
    ): Promise<BuyVoidPaymentKeyedDispatcherLeaseSessionOutcomeV1<T>> {
      const lease = captureLease(leaseInput);
      const state: {
        open: boolean;
        pending: Promise<boolean> | null;
        reason: ReasonV1 | null;
        started: boolean;
        returned: boolean;
        result: Readonly<{ value: T }> | null;
        checks: number;
        completed: number;
        clock: bigint | null;
        version: bigint | null;
      } = {
        open: false, pending: null, reason: null, started: false, returned: false,
        result: null, checks: 0, completed: 0, clock: null, version: null,
      };
      const fail = (reason: ReasonV1): false => {
        state.reason ??= reason;
        return false;
      };
      function finish(storeConfirmed: boolean): BuyVoidPaymentKeyedDispatcherLeaseSessionOutcomeV1<T> {
        const ok = state.started && state.returned && storeConfirmed && state.reason === null;
        return Object.freeze({
          marker: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_LEASE_SESSION_V1,
          ok,
          status: ok ? "completed" : state.started ? "reconciliation_required" : "held",
          reason: ok ? null : state.reason ?? "store_completion_unconfirmed",
          action_started: state.started,
          action_returned: state.returned,
          result: state.result,
          store_completion_confirmed: storeConfirmed,
          reconciliation_required: !ok && state.started,
          lease_checks_started: state.checks,
          lease_checks_completed: state.completed,
          last_database_time_us: state.clock,
          session_closed: true,
          pending_lease_checks_settled: true,
          session_exposes_lease_token: false,
          session_exposes_transaction_interface: false,
          automatic_retry_allowed: false,
          durable_outcome_receipt: false,
          cross_invocation_deduplication: false,
          saga_validation_performed: false,
          effect_cut_integration_complete: false,
        });
      }
      if (!lease || typeof requestFingerprint !== "string" ||
          !SHA.test(requestFingerprint) || typeof action !== "function") {
        fail("input_invalid");
        return finish(false);
      }
      const outcome = await runner.run_once(lease.attempt_id, async (tx: BuyVoidPaymentKeyedDispatcherTransactionV1) => {
        state.open = true;
        const revalidate = (): Promise<boolean> => {
          // An escaped session cannot issue SQL or alter an already returned result.
          if (!state.open) return Promise.resolve(false);
          if (state.reason !== null) return Promise.resolve(false);
          if (state.pending !== null) return Promise.resolve(fail("overlapping_recheck"));
          state.checks += 1;
          const check = async (): Promise<boolean> => {
            try {
              const value = await tx.read_job_for_update(lease.attempt_id);
              if (!state.open) return fail("session_closed_during_recheck");
              if (state.reason !== null) return false;
              if (value === null) return fail("job_missing");
              // Capture the read result before the next await. The canonical
              // per-job lock excludes cooperating writers for this whole session.
              const job = { ...value };
              if (job.schema !== "void_buy_void_payment_keyed_dispatcher_job_v1" ||
                  job.marker !== VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1 ||
                  job.attempt_id !== lease.attempt_id ||
                  typeof job.submitted_at_us !== "bigint" || job.submitted_at_us <= 0n ||
                  typeof job.version !== "bigint" || job.version < 0n ||
                  job.published !== false || job.published_gen !== null ||
                  job.result_fingerprint_sha256 !== null) return fail("job_invalid");
              if (job.request_fingerprint_sha256 !== requestFingerprint) return fail("request_identity_mismatch");
              if (job.lease_gen !== lease.lease_gen || job.lease_token !== lease.lease_token ||
                  job.lease_owner !== lease.worker_id || job.lease_expires_us !== lease.lease_expires_us) {
                return fail("lease_identity_mismatch");
              }
              if (state.version !== null && job.version !== state.version) return fail("job_version_changed");
              // Database time must follow the possibly delayed row read.
              const now = await tx.now_us();
              if (!state.open) return fail("session_closed_during_recheck");
              if (state.reason !== null) return false;
              if (typeof now !== "bigint" || now <= 0n) return fail("database_clock_invalid");
              if (state.clock !== null && now < state.clock) return fail("database_clock_regressed");
              state.clock = now;
              if (lease.lease_expires_us <= now) return fail("lease_expired");
              state.version ??= job.version;
              return true;
            } catch {
              return fail("lease_read_failed");
            } finally {
              state.completed += 1;
            }
          };
          const pending = check();
          state.pending = pending;
          void pending.then(() => {
            if (state.pending === pending) state.pending = null;
          });
          return pending;
        };
        const session: BuyVoidPaymentKeyedDispatcherLeaseSessionV1 = Object.freeze({
          attempt_id: lease.attempt_id,
          revalidate_lease: revalidate,
        });
        try {
          if (!(await revalidate())) return;
          state.started = true;
          try {
            const value = await action(session);
            state.result = Object.freeze({ value });
            state.returned = true;
          } catch {
            // Do not hand unknown callback exceptions to driver SQL-state parsing.
            fail("action_failed");
            throw new Error("dispatcher_lease_session_action_failed");
          }
        } finally {
          // Revoke new reads first; drain the existing one before the canonical
          // adapter is allowed to COMMIT/ROLLBACK/unlock/release the connection.
          state.open = false;
          const pending = state.pending;
          if (pending !== null) await pending;
        }
      });
      return finish(outcome.store_completion_confirmed);
    },
  });
}
