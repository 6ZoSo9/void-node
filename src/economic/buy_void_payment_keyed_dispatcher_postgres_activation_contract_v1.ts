export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_CONTRACT_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_CONTRACT_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_ENVS_V1 =
  Object.freeze({
    parent_runtime: "VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED",
    claimed_runtime:
      "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED",
    full_runtime: "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED",
    admitted_guarded_runtime:
      "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED",
    full_runtime_apply:
      "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED",
  } as const);

export type BuyVoidPostgresActivationPhaseV1 =
  | "dormant"
  | "claimed_exclusive"
  | "full_preview"
  | "admission_armed"
  | "live_apply";

export type BuyVoidPostgresActivationGateStateV1 = Readonly<{
  parent_runtime: "1";
  claimed_runtime: "0" | "1";
  full_runtime: "0" | "1";
  admitted_guarded_runtime: "0" | "1";
  full_runtime_apply: "0" | "1";
}>;

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1:
  Readonly<Record<BuyVoidPostgresActivationPhaseV1, BuyVoidPostgresActivationGateStateV1>> =
  Object.freeze({
    dormant: Object.freeze({
      parent_runtime: "1",
      claimed_runtime: "0",
      full_runtime: "0",
      admitted_guarded_runtime: "0",
      full_runtime_apply: "0",
    }),
    claimed_exclusive: Object.freeze({
      parent_runtime: "1",
      claimed_runtime: "1",
      full_runtime: "0",
      admitted_guarded_runtime: "0",
      full_runtime_apply: "0",
    }),
    full_preview: Object.freeze({
      parent_runtime: "1",
      claimed_runtime: "1",
      full_runtime: "1",
      admitted_guarded_runtime: "0",
      full_runtime_apply: "0",
    }),
    admission_armed: Object.freeze({
      parent_runtime: "1",
      claimed_runtime: "1",
      full_runtime: "1",
      admitted_guarded_runtime: "1",
      full_runtime_apply: "0",
    }),
    live_apply: Object.freeze({
      parent_runtime: "1",
      claimed_runtime: "1",
      full_runtime: "1",
      admitted_guarded_runtime: "1",
      full_runtime_apply: "1",
    }),
  });

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASE_ORDER_V1 =
  Object.freeze([
    "dormant",
    "claimed_exclusive",
    "full_preview",
    "admission_armed",
    "live_apply",
  ] as const);

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_AUTHORITY_V1 =
  Object.freeze({
    source_only_contract: true,
    host_mutation: false,
    service_mutation: false,
    runtime_gate_mutation: false,
    database_mutation: false,
    credential_read: false,
    wallet_or_signer_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    token_or_work_credit_mutation: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
    staged_activation_required: true,
    adjacent_transition_only: true,
    claimed_selector_before_apply_required: true,
    full_runtime_before_apply_required: true,
    admitted_runtime_before_apply_required: true,
    rollback_clears_apply_first: true,
    exact_per_attempt_confirmation_still_required: true,
    automatic_retry: false,
  } as const);

function exactKeys(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return false;
  const own = Reflect.ownKeys(value);
  return (
    own.length === keys.length &&
    own.every((key) => typeof key === "string" && keys.includes(key))
  );
}

const STATE_KEYS = Object.freeze([
  "parent_runtime",
  "claimed_runtime",
  "full_runtime",
  "admitted_guarded_runtime",
  "full_runtime_apply",
]);

export function normalizeBuyVoidPostgresActivationGateStateV1(
  value: unknown,
): BuyVoidPostgresActivationGateStateV1 | null {
  if (!exactKeys(value, STATE_KEYS)) return null;
  const record = value as Record<string, unknown>;
  if (record.parent_runtime !== "1") return null;
  for (const key of STATE_KEYS.slice(1)) {
    if (record[key] !== "0" && record[key] !== "1") return null;
  }
  if (
    record.full_runtime_apply === "1" &&
    (
      record.claimed_runtime !== "1" ||
      record.full_runtime !== "1" ||
      record.admitted_guarded_runtime !== "1"
    )
  ) {
    return null;
  }
  return Object.freeze({
    parent_runtime: "1",
    claimed_runtime: record.claimed_runtime as "0" | "1",
    full_runtime: record.full_runtime as "0" | "1",
    admitted_guarded_runtime:
      record.admitted_guarded_runtime as "0" | "1",
    full_runtime_apply: record.full_runtime_apply as "0" | "1",
  });
}

export function classifyBuyVoidPostgresActivationPhaseV1(
  value: unknown,
): BuyVoidPostgresActivationPhaseV1 | null {
  const state = normalizeBuyVoidPostgresActivationGateStateV1(value);
  if (!state) return null;
  for (
    const phase of
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASE_ORDER_V1
  ) {
    const expected =
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1[phase];
    if (
      STATE_KEYS.every(
        (key) =>
          state[key as keyof BuyVoidPostgresActivationGateStateV1] ===
          expected[key as keyof BuyVoidPostgresActivationGateStateV1],
      )
    ) {
      return phase;
    }
  }
  return null;
}

export type BuyVoidPostgresActivationTransitionDecisionV1 =
  | Readonly<{
      ok: true;
      status: "stable" | "forward" | "rollback";
      from: BuyVoidPostgresActivationPhaseV1;
      to: BuyVoidPostgresActivationPhaseV1;
      changed_gate: string | null;
      money_capable_after: boolean;
    }>
  | Readonly<{
      ok: false;
      status: "held";
      reason: string;
      from: BuyVoidPostgresActivationPhaseV1 | null;
      to: BuyVoidPostgresActivationPhaseV1 | null;
    }>;

export function decideBuyVoidPostgresActivationTransitionV1(
  fromValue: unknown,
  toValue: unknown,
): BuyVoidPostgresActivationTransitionDecisionV1 {
  const from = classifyBuyVoidPostgresActivationPhaseV1(fromValue);
  const to = classifyBuyVoidPostgresActivationPhaseV1(toValue);
  if (!from || !to) {
    return Object.freeze({
      ok: false,
      status: "held",
      reason: "activation_state_not_canonical",
      from,
      to,
    });
  }

  const order =
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASE_ORDER_V1;
  const fromIndex = order.indexOf(from);
  const toIndex = order.indexOf(to);
  if (fromIndex === toIndex) {
    return Object.freeze({
      ok: true,
      status: "stable",
      from,
      to,
      changed_gate: null,
      money_capable_after: to === "live_apply",
    });
  }
  if (Math.abs(toIndex - fromIndex) !== 1) {
    return Object.freeze({
      ok: false,
      status: "held",
      reason: "activation_transition_must_be_adjacent",
      from,
      to,
    });
  }

  const fromState =
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1[from];
  const toState =
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1[to];
  const changed = STATE_KEYS.filter(
    (key) =>
      fromState[key as keyof BuyVoidPostgresActivationGateStateV1] !==
      toState[key as keyof BuyVoidPostgresActivationGateStateV1],
  );
  if (changed.length !== 1) {
    return Object.freeze({
      ok: false,
      status: "held",
      reason: "activation_transition_changes_multiple_gates",
      from,
      to,
    });
  }

  return Object.freeze({
    ok: true,
    status: toIndex > fromIndex ? "forward" : "rollback",
    from,
    to,
    changed_gate: changed[0],
    money_capable_after: to === "live_apply",
  });
}
