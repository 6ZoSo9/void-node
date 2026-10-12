import {
  createBuyVoidPaymentKeyedDispatcherPostgresStoreV1,
  type BuyVoidPaymentKeyedDispatcherPostgresPoolV1,
} from "./buy_void_payment_keyed_dispatcher_postgres_store_v1.js";
import type {
  BuyVoidPaymentKeyedDispatcherTransactionV1,
} from "./buy_void_payment_keyed_dispatcher_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_NONREPLAYABLE_POSTGRES_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_NONREPLAYABLE_POSTGRES_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_NONREPLAYABLE_AUTHORITY_V1 =
  Object.freeze({
    source_only_contract: true,
    canonical_postgres_store_required: true,
    max_transaction_attempts: 1,
    automatic_callback_replay: false,
    caller_retry_configuration: false,
    per_job_admission: "session_advisory_lock_before_serializable_snapshot",
    returned_value_survives_store_failure: true,
    outcome_storage: "in_process_only",
    cross_invocation_deduplication: false,
    external_effect_database_atomicity: false,
    lease_validation_performed: false,
    saga_validation_performed: false,
    runtime_route_mount: false,
    production_connection_factory_present: false,
    signing_authority: false,
    broadcast_authority: false,
    funds_authority: false,
  } as const);

type ReturnBoxV1<T> = Readonly<{ value: T }>;

type BoundaryV1 = {
  marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_NONREPLAYABLE_POSTGRES_V1;
  automatic_retry_allowed: false;
  cross_invocation_deduplication: false;
  durable_outcome_receipt: false;
  external_effect_database_atomicity: false;
};

export type BuyVoidPaymentKeyedDispatcherNonReplayableOutcomeV1<T> =
  BoundaryV1 & (
    | {
        ok: true;
        status: "completed";
        action_started: true;
        action_returned: true;
        result: ReturnBoxV1<T>;
        store_completion_confirmed: true;
        reconciliation_required: false;
      }
    | {
        ok: false;
        status: "held";
        reason: "input_invalid" | "store_failed_before_action";
        action_started: false;
        action_returned: false;
        result: null;
        store_completion_confirmed: false;
        reconciliation_required: false;
      }
    | {
        ok: false;
        status: "reconciliation_required";
        reason: "store_failed_after_action" | "callback_reentry_blocked";
        action_started: true;
        action_returned: boolean;
        result: ReturnBoxV1<T> | null;
        store_completion_confirmed: false;
        reconciliation_required: true;
      }
  );

export type BuyVoidPaymentKeyedDispatcherNonReplayableOptionsV1 = {
  pool: BuyVoidPaymentKeyedDispatcherPostgresPoolV1;
  lock_timeout_ms?: number;
  statement_timeout_ms?: number;
};

const BOUNDARY: BoundaryV1 = Object.freeze({
  marker: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_NONREPLAYABLE_POSTGRES_V1,
  automatic_retry_allowed: false,
  cross_invocation_deduplication: false,
  durable_outcome_receipt: false,
  external_effect_database_atomicity: false,
});

function held(
  reason: "input_invalid" | "store_failed_before_action",
): BuyVoidPaymentKeyedDispatcherNonReplayableOutcomeV1<never> {
  return Object.freeze({
    ...BOUNDARY,
    ok: false,
    status: "held",
    reason,
    action_started: false,
    action_returned: false,
    result: null,
    store_completion_confirmed: false,
    reconciliation_required: false,
  });
}

/**
 * Internal composition primitive, not a public dispatcher or an execution grant.
 * The caller must provide a reviewed, server-owned action that validates its
 * lease and saga at the actual effect cuts. No live dependencies are built here.
 */
export function createBuyVoidPaymentKeyedDispatcherNonReplayablePostgresV1(
  options: BuyVoidPaymentKeyedDispatcherNonReplayableOptionsV1,
) {
  const allowed = new Set(["pool", "lock_timeout_ms", "statement_timeout_ms"]);
  if (
    !options || typeof options !== "object" || Array.isArray(options) ||
    Reflect.ownKeys(options).some((key) => typeof key !== "string" || !allowed.has(key))
  ) {
    throw new Error("dispatcher_nonreplayable_options_invalid");
  }

  // Do not spread options: retry hooks/counts must not enter this path.
  // Ordinary database-only callers retain the canonical store's default retries.
  const store = createBuyVoidPaymentKeyedDispatcherPostgresStoreV1({
    pool: options.pool,
    lock_timeout_ms: options.lock_timeout_ms,
    statement_timeout_ms: options.statement_timeout_ms,
    max_attempts: 1,
  });

  return Object.freeze({
    authority: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_NONREPLAYABLE_AUTHORITY_V1,

    async run_once<T>(
      attemptId: string,
      action: (tx: BuyVoidPaymentKeyedDispatcherTransactionV1) => T | Promise<T>,
    ): Promise<BuyVoidPaymentKeyedDispatcherNonReplayableOutcomeV1<T>> {
      if (
        typeof attemptId !== "string" || !/^[0-9a-f]{64}$/.test(attemptId) ||
        typeof action !== "function"
      ) return held("input_invalid");

      const state: {
        started: boolean;
        reentry: boolean;
        result: ReturnBoxV1<T> | null;
      } = { started: false, reentry: false, result: null };
      let storeReturned = false;
      try {
        await store.run_serializable_job_decision(attemptId, async (tx) => {
          // A second defense if the underlying adapter ever regresses: do not
          // call the action again, even when its first invocation threw.
          if (state.started) {
            state.reentry = true;
            throw new Error("dispatcher_nonreplayable_callback_reentry");
          }
          state.started = true;
          const value = await action(tx);
          // A box distinguishes a returned undefined from no completed return.
          // It retains an internal value, not a durable or sanitized receipt.
          state.result = Object.freeze({ value });
          return state.result;
        });
        storeReturned = true;
      } catch {
        // Never emit driver/callback exception text or infer a rollback of
        // external effects from an SQL rollback or cleanup failure.
        storeReturned = false;
      }

      if (!state.started) return held("store_failed_before_action");
      if (!storeReturned || state.reentry || state.result === null) {
        return Object.freeze({
          ...BOUNDARY,
          ok: false,
          status: "reconciliation_required",
          reason: state.reentry
            ? "callback_reentry_blocked"
            : "store_failed_after_action",
          action_started: true,
          action_returned: state.result !== null,
          result: state.result,
          store_completion_confirmed: false,
          reconciliation_required: true,
        });
      }
      return Object.freeze({
        ...BOUNDARY,
        ok: true,
        status: "completed",
        action_started: true,
        action_returned: true,
        result: state.result,
        store_completion_confirmed: true,
        reconciliation_required: false,
      });
    },
  });
}
