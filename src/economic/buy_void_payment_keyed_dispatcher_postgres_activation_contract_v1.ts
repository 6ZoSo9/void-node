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
    staged_transition_supported: true,
    adjacent_staged_transition_required: true,
    atomic_restart_transition_supported: true,
    atomic_restart_dormant_live_apply_only: true,
    atomic_restart_single_config_generation_required: true,
    non_atomic_multi_gate_transition_forbidden: true,
    claimed_selector_required_when_apply_live: true,
    full_runtime_required_when_apply_live: true,
    admitted_runtime_required_when_apply_live: true,
    staged_rollback_clears_apply_first: true,
    atomic_rollback_all_inner_gates_zero_together: true,
    exact_per_attempt_confirmation_still_required: true,
    automatic_retry: false,
  } as const);

function exactOwnDataObject(
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) return null;
    const own = Reflect.ownKeys(value);
    if (
      own.length !== keys.length ||
      own.some((key) => typeof key !== "string" || !keys.includes(key))
    ) {
      return null;
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const out: Record<string, unknown> = {};
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (
        !descriptor ||
        descriptor.enumerable !== true ||
        !Object.hasOwn(descriptor, "value")
      ) {
        return null;
      }
      out[key] = descriptor.value;
    }
    return out;
  } catch {
    return null;
  }
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
  const record = exactOwnDataObject(value, STATE_KEYS);
  if (!record) return null;
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

export type BuyVoidPostgresActivationTransitionModeV1 =
  | "staged"
  | "atomic_restart";

export type BuyVoidPostgresActivationTransitionDecisionV1 =
  | Readonly<{
      ok: true;
      status:
        | "stable"
        | "forward"
        | "rollback"
        | "atomic_forward"
        | "atomic_rollback";
      mode: BuyVoidPostgresActivationTransitionModeV1;
      from: BuyVoidPostgresActivationPhaseV1;
      to: BuyVoidPostgresActivationPhaseV1;
      changed_gates: readonly string[];
      requires_process_restart: boolean;
      money_capable_after: boolean;
    }>
  | Readonly<{
      ok: false;
      status: "held";
      mode: BuyVoidPostgresActivationTransitionModeV1 | null;
      reason: string;
      from: BuyVoidPostgresActivationPhaseV1 | null;
      to: BuyVoidPostgresActivationPhaseV1 | null;
    }>;

export function decideBuyVoidPostgresActivationTransitionV1(
  fromValue: unknown,
  toValue: unknown,
  modeValue: unknown = "staged",
): BuyVoidPostgresActivationTransitionDecisionV1 {
  const mode =
    modeValue === "staged" || modeValue === "atomic_restart"
      ? modeValue
      : null;
  if (!mode) {
    return Object.freeze({
      ok: false,
      status: "held",
      mode: null,
      reason: "activation_transition_mode_invalid",
      from: null,
      to: null,
    });
  }

  const from = classifyBuyVoidPostgresActivationPhaseV1(fromValue);
  const to = classifyBuyVoidPostgresActivationPhaseV1(toValue);
  if (!from || !to) {
    return Object.freeze({
      ok: false,
      status: "held",
      mode,
      reason: "activation_state_not_canonical",
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

  if (from === to) {
    return Object.freeze({
      ok: true,
      status: "stable",
      mode,
      from,
      to,
      changed_gates: Object.freeze([]),
      requires_process_restart: false,
      money_capable_after: to === "live_apply",
    });
  }

  if (mode === "atomic_restart") {
    const forward = from === "dormant" && to === "live_apply";
    const rollback = from === "live_apply" && to === "dormant";
    if (!forward && !rollback) {
      return Object.freeze({
        ok: false,
        status: "held",
        mode,
        reason: "atomic_restart_transition_scope_invalid",
        from,
        to,
      });
    }
    const expectedChanged = [
      "claimed_runtime",
      "full_runtime",
      "admitted_guarded_runtime",
      "full_runtime_apply",
    ];
    if (
      changed.length !== expectedChanged.length ||
      changed.some((key, index) => key !== expectedChanged[index])
    ) {
      return Object.freeze({
        ok: false,
        status: "held",
        mode,
        reason: "atomic_restart_gate_set_invalid",
        from,
        to,
      });
    }
    return Object.freeze({
      ok: true,
      status: forward ? "atomic_forward" : "atomic_rollback",
      mode,
      from,
      to,
      changed_gates: Object.freeze([...changed]),
      requires_process_restart: true,
      money_capable_after: forward,
    });
  }

  const order =
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASE_ORDER_V1;
  const fromIndex = order.indexOf(from);
  const toIndex = order.indexOf(to);
  if (Math.abs(toIndex - fromIndex) !== 1) {
    return Object.freeze({
      ok: false,
      status: "held",
      mode,
      reason: "staged_activation_transition_must_be_adjacent",
      from,
      to,
    });
  }
  if (changed.length !== 1) {
    return Object.freeze({
      ok: false,
      status: "held",
      mode,
      reason: "staged_activation_transition_changes_multiple_gates",
      from,
      to,
    });
  }

  return Object.freeze({
    ok: true,
    status: toIndex > fromIndex ? "forward" : "rollback",
    mode,
    from,
    to,
    changed_gates: Object.freeze([...changed]),
    requires_process_restart: true,
    money_capable_after: to === "live_apply",
  });
}

