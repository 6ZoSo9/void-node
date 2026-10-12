import { createHash } from "node:crypto";

export const VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_V1 =
  "VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_V1";

export const VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_SCHEMA_V1 =
  "void.economic-intent-ttl-caps-policy.v1";

export const VOID_ECONOMIC_INTENT_RESERVATION_SCHEMA_V1 =
  "void.economic-intent-reservation.v1";

export const VOID_ECONOMIC_INTENT_TTL_CAPS_AUTHORITY_V1 =
  Object.freeze({
    source_only: true,
    explicit_input_only: true,
    wall_clock_read: false,
    runtime_enforcement: false,
    reservation_mutation: false,
    payment_observation: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    inventory_funding: false,
    liquidity_movement: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const POLICY_CONTRACT_PAYLOAD = Object.freeze({
  schema: "void.economic-intent-ttl-caps-policy-contract.v1",
  version: 1,
  chain_id: 2050,
  execution_epoch: 2,
  max_ttl_seconds: "300",
  exact_launch_policy_values_required: true,
  policy_committed_before_admission_required: true,
  positive_per_identity_cap_required: true,
  positive_global_cap_required: true,
  global_cap_not_less_than_identity_cap_required: true,
  content_addressed_policy_required: true,
  content_addressed_intent_required: true,
  expired_intents_not_counted_as_outstanding: true,
  expired_reservation_release_required: true,
  late_payment_action: "reconcile_without_automatic_execution",
  late_payment_automatic_execution: false,
  production_ttl_value_hardcoded: false,
  production_cap_values_hardcoded: false,
  source_only: true,
  runtime_enforcement_verified: false,
});

const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const UINT = /^(0|[1-9][0-9]*)$/u;
const MAX_TRACKED_INTENTS = 1_000_000;

const POLICY_KEYS = Object.freeze([
  "schema",
  "policy_id",
  "coupled_launch_id",
  "policy_generation",
  "policy_committed_at_ms",
  "intent_ttl_seconds",
  "per_identity_max_outstanding",
  "global_max_outstanding",
  "late_payment_action",
]);

const INTENT_KEYS = Object.freeze([
  "schema",
  "intent_id",
  "policy_id",
  "coupled_launch_id",
  "identity_id",
  "reservation_id",
  "issued_at_ms",
  "expires_at_ms",
  "state",
]);

function fail(code) {
  throw new Error(code);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function snapshotExact(value, keys, code) {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw null;
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const ownKeys = Reflect.ownKeys(descriptors);
    if (ownKeys.some((key) => typeof key !== "string")) throw null;
    const actual = ownKeys.sort(compareText);
    const expected = [...keys].sort(compareText);
    if (
      actual.length !== expected.length ||
      actual.some((key, index) => key !== expected[index])
    ) {
      throw null;
    }
    const out = Object.create(null);
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (
        !descriptor ||
        descriptor.enumerable !== true ||
        !Object.hasOwn(descriptor, "value")
      ) {
        throw null;
      }
      out[key] = descriptor.value;
    }
    return Object.freeze(out);
  } catch {
    fail(code);
  }
}

function snapshotArray(value, code) {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
      throw null;
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const length = descriptors.length?.value;
    if (
      !Number.isSafeInteger(length) ||
      length < 0 ||
      length > MAX_TRACKED_INTENTS ||
      Reflect.ownKeys(descriptors).length !== length + 1
    ) {
      throw null;
    }
    const out = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (
        !descriptor ||
        descriptor.enumerable !== true ||
        !Object.hasOwn(descriptor, "value")
      ) {
        throw null;
      }
      out.push(descriptor.value);
    }
    return out;
  } catch {
    fail(code);
  }
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort(compareText);
    return "{" + keys.map((key) =>
      JSON.stringify(key) + ":" + canonicalJson(value[key])
    ).join(",") + "}";
  }
  fail("INVALID_CANONICAL_VALUE");
}

function digest(value) {
  return "sha256:" +
    createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export const VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_CONTRACT_V1 =
  Object.freeze({
    ...POLICY_CONTRACT_PAYLOAD,
    policy_contract_id: digest(POLICY_CONTRACT_PAYLOAD),
  });

function canonicalSha(value, code) {
  if (typeof value !== "string" || !SHA256.test(value)) fail(code);
  return value;
}

function positiveSafeInteger(value, code) {
  if (!Number.isSafeInteger(value) || value <= 0) fail(code);
  return value;
}

function canonicalMs(value, code) {
  if (!Number.isSafeInteger(value) || value <= 0) fail(code);
  return value;
}

function canonicalGeneration(value) {
  if (typeof value !== "string" || !UINT.test(value) || BigInt(value) <= 0n) {
    fail("INVALID_ECONOMIC_INTENT_POLICY_GENERATION");
  }
  return value;
}

function policyPayload(value) {
  return Object.freeze({
    schema: value.schema,
    coupled_launch_id: value.coupled_launch_id,
    policy_generation: value.policy_generation,
    policy_committed_at_ms: value.policy_committed_at_ms,
    intent_ttl_seconds: value.intent_ttl_seconds,
    per_identity_max_outstanding: value.per_identity_max_outstanding,
    global_max_outstanding: value.global_max_outstanding,
    late_payment_action: value.late_payment_action,
  });
}

function intentPayload(value) {
  return Object.freeze({
    schema: value.schema,
    policy_id: value.policy_id,
    coupled_launch_id: value.coupled_launch_id,
    identity_id: value.identity_id,
    reservation_id: value.reservation_id,
    issued_at_ms: value.issued_at_ms,
    expires_at_ms: value.expires_at_ms,
    state: value.state,
  });
}

export function economicIntentTtlCapsPolicyIdV1(value) {
  const policy = snapshotExact(
    value,
    POLICY_KEYS,
    "INVALID_ECONOMIC_INTENT_TTL_CAPS_POLICY_SHAPE",
  );
  return digest(policyPayload(policy));
}

export function economicIntentReservationIdV1(value) {
  const intent = snapshotExact(
    value,
    INTENT_KEYS,
    "INVALID_ECONOMIC_INTENT_RESERVATION_SHAPE",
  );
  return digest(intentPayload(intent));
}

function verifyPolicy(raw) {
  const policy = snapshotExact(
    raw,
    POLICY_KEYS,
    "INVALID_ECONOMIC_INTENT_TTL_CAPS_POLICY_SHAPE",
  );
  if (policy.schema !== VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_SCHEMA_V1) {
    fail("INVALID_ECONOMIC_INTENT_TTL_CAPS_POLICY_SCHEMA");
  }
  canonicalSha(policy.policy_id, "INVALID_ECONOMIC_INTENT_TTL_CAPS_POLICY_ID");
  canonicalSha(policy.coupled_launch_id, "INVALID_COUPLED_LAUNCH_ID");
  canonicalGeneration(policy.policy_generation);
  const committedAt = canonicalMs(
    policy.policy_committed_at_ms,
    "INVALID_ECONOMIC_INTENT_POLICY_COMMITTED_AT_MS",
  );
  const ttl = positiveSafeInteger(
    policy.intent_ttl_seconds,
    "INVALID_ECONOMIC_INTENT_TTL_SECONDS",
  );
  if (
    ttl >
    Number(
      VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_CONTRACT_V1.max_ttl_seconds,
    )
  ) {
    fail("ECONOMIC_INTENT_TTL_ABOVE_SIGNED_SUBMISSION_MAXIMUM");
  }
  const perIdentity = positiveSafeInteger(
    policy.per_identity_max_outstanding,
    "INVALID_ECONOMIC_INTENT_PER_IDENTITY_CAP",
  );
  const global = positiveSafeInteger(
    policy.global_max_outstanding,
    "INVALID_ECONOMIC_INTENT_GLOBAL_CAP",
  );
  if (global < perIdentity) {
    fail("ECONOMIC_INTENT_GLOBAL_CAP_BELOW_IDENTITY_CAP");
  }
  if (global > MAX_TRACKED_INTENTS) {
    fail("ECONOMIC_INTENT_GLOBAL_CAP_ABOVE_TECHNICAL_BOUND");
  }
  if (
    policy.late_payment_action !==
    VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_CONTRACT_V1.late_payment_action
  ) {
    fail("ECONOMIC_INTENT_LATE_PAYMENT_ACTION_MISMATCH");
  }
  if (economicIntentTtlCapsPolicyIdV1(policy) !== policy.policy_id) {
    fail("ECONOMIC_INTENT_TTL_CAPS_POLICY_DIGEST_MISMATCH");
  }
  return Object.freeze({
    ...policy,
    policy_committed_at_ms: committedAt,
    intent_ttl_seconds: ttl,
    per_identity_max_outstanding: perIdentity,
    global_max_outstanding: global,
  });
}

function verifyIntent(raw, policy) {
  const intent = snapshotExact(
    raw,
    INTENT_KEYS,
    "INVALID_ECONOMIC_INTENT_RESERVATION_SHAPE",
  );
  if (intent.schema !== VOID_ECONOMIC_INTENT_RESERVATION_SCHEMA_V1) {
    fail("INVALID_ECONOMIC_INTENT_RESERVATION_SCHEMA");
  }
  canonicalSha(intent.intent_id, "INVALID_ECONOMIC_INTENT_ID");
  canonicalSha(intent.policy_id, "INVALID_ECONOMIC_INTENT_POLICY_ID");
  canonicalSha(intent.coupled_launch_id, "INVALID_COUPLED_LAUNCH_ID");
  canonicalSha(intent.identity_id, "INVALID_ECONOMIC_INTENT_IDENTITY_ID");
  canonicalSha(intent.reservation_id, "INVALID_ECONOMIC_INTENT_RESERVATION_ID");
  if (intent.policy_id !== policy.policy_id) {
    fail("ECONOMIC_INTENT_POLICY_ID_MISMATCH");
  }
  if (intent.coupled_launch_id !== policy.coupled_launch_id) {
    fail("ECONOMIC_INTENT_LAUNCH_ID_MISMATCH");
  }
  if (intent.state !== "pending_unpaid") {
    fail("ECONOMIC_INTENT_STATE_INVALID");
  }

  const issuedAt = canonicalMs(
    intent.issued_at_ms,
    "INVALID_ECONOMIC_INTENT_ISSUED_AT_MS",
  );
  const expiresAt = canonicalMs(
    intent.expires_at_ms,
    "INVALID_ECONOMIC_INTENT_EXPIRES_AT_MS",
  );
  if (policy.policy_committed_at_ms >= issuedAt) {
    fail("ECONOMIC_INTENT_POLICY_NOT_COMMITTED_BEFORE_ADMISSION");
  }
  const expectedExpires =
    issuedAt + policy.intent_ttl_seconds * 1_000;
  if (
    !Number.isSafeInteger(expectedExpires) ||
    expiresAt !== expectedExpires
  ) {
    fail("ECONOMIC_INTENT_EXPIRY_NOT_POLICY_BOUND");
  }
  if (economicIntentReservationIdV1(intent) !== intent.intent_id) {
    fail("ECONOMIC_INTENT_DIGEST_MISMATCH");
  }
  return Object.freeze({
    ...intent,
    issued_at_ms: issuedAt,
    expires_at_ms: expiresAt,
  });
}

export function verifyEconomicIntentTtlCapsStateV1({
  policy: rawPolicy,
  outstanding_intents: rawIntents,
  observed_at_ms: rawObservedAt,
}) {
  const policy = verifyPolicy(rawPolicy);
  const observedAt = canonicalMs(
    rawObservedAt,
    "INVALID_ECONOMIC_INTENT_OBSERVED_AT_MS",
  );
  const values = snapshotArray(
    rawIntents,
    "INVALID_ECONOMIC_INTENT_RESERVATION_SET",
  );

  const seenIntentIds = new Set();
  const seenReservationIds = new Set();
  const countsByIdentity = new Map();
  let active = 0;
  let expired = 0;

  const intents = values.map((raw) => {
    const intent = verifyIntent(raw, policy);
    if (seenIntentIds.has(intent.intent_id)) {
      fail("DUPLICATE_ECONOMIC_INTENT_ID");
    }
    if (seenReservationIds.has(intent.reservation_id)) {
      fail("DUPLICATE_ECONOMIC_INTENT_RESERVATION_ID");
    }
    seenIntentIds.add(intent.intent_id);
    seenReservationIds.add(intent.reservation_id);

    const isOutstanding = observedAt < intent.expires_at_ms;
    if (isOutstanding) {
      active += 1;
      const next = (countsByIdentity.get(intent.identity_id) || 0) + 1;
      countsByIdentity.set(intent.identity_id, next);
      if (next > policy.per_identity_max_outstanding) {
        fail("ECONOMIC_INTENT_PER_IDENTITY_OUTSTANDING_CAP_EXCEEDED");
      }
      if (active > policy.global_max_outstanding) {
        fail("ECONOMIC_INTENT_GLOBAL_OUTSTANDING_CAP_EXCEEDED");
      }
    } else {
      expired += 1;
    }

    return Object.freeze({
      intent_id: intent.intent_id,
      reservation_id: intent.reservation_id,
      identity_id: intent.identity_id,
      issued_at_ms: intent.issued_at_ms,
      expires_at_ms: intent.expires_at_ms,
      outstanding: isOutstanding,
      reservation_counted: isOutstanding,
      reservation_release_required: !isOutstanding,
    });
  });

  intents.sort((left, right) => compareText(left.intent_id, right.intent_id));
  Object.freeze(intents);

  const activeCounts = [...countsByIdentity.entries()]
    .map(([identity_id, count]) => Object.freeze({ identity_id, count }))
    .sort((left, right) => compareText(left.identity_id, right.identity_id));
  Object.freeze(activeCounts);

  return Object.freeze({
    marker: VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_V1,
    policy_contract_id:
      VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_CONTRACT_V1.policy_contract_id,
    policy_id: policy.policy_id,
    coupled_launch_id: policy.coupled_launch_id,
    policy_generation: policy.policy_generation,
    observed_at_ms: observedAt,
    intent_ttl_seconds: policy.intent_ttl_seconds,
    per_identity_max_outstanding: policy.per_identity_max_outstanding,
    global_max_outstanding: policy.global_max_outstanding,
    tracked_intent_count: intents.length,
    outstanding_intent_count: active,
    expired_intent_count: expired,
    per_identity_outstanding_counts: activeCounts,
    intents,
    ttl_bounded_by_signed_submission_maximum: true,
    outstanding_caps_explicit_and_bounded: true,
    expired_intents_not_counted_as_outstanding: true,
    expired_reservation_release_required: true,
    economic_intent_ttl_and_caps_source_ready: true,
    production_cap_values_hardcoded: false,
    wall_clock_read_performed: false,
    runtime_enforcement_verified: false,
    reservation_mutation_performed: false,
    authority: VOID_ECONOMIC_INTENT_TTL_CAPS_AUTHORITY_V1,
  });
}

export function classifyEconomicIntentAdmissionV1({
  policy: rawPolicy,
  outstanding_intents: rawIntents,
  observed_at_ms: rawObservedAt,
  identity_id: rawIdentityId,
}) {
  const policy = verifyPolicy(rawPolicy);
  const identityId = canonicalSha(
    rawIdentityId,
    "INVALID_ECONOMIC_INTENT_IDENTITY_ID",
  );
  const state = verifyEconomicIntentTtlCapsStateV1({
    policy,
    outstanding_intents: rawIntents,
    observed_at_ms: rawObservedAt,
  });

  const identityEntry = state.per_identity_outstanding_counts
    .find((entry) => entry.identity_id === identityId);
  const identityOutstanding = identityEntry?.count || 0;
  const globalOutstanding = state.outstanding_intent_count;

  const identityCapReached =
    identityOutstanding >= policy.per_identity_max_outstanding;
  const globalCapReached =
    globalOutstanding >= policy.global_max_outstanding;
  const allowed = !identityCapReached && !globalCapReached;

  return Object.freeze({
    marker: VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_V1,
    policy_contract_id:
      VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_CONTRACT_V1.policy_contract_id,
    policy_id: policy.policy_id,
    coupled_launch_id: policy.coupled_launch_id,
    identity_id: identityId,
    observed_at_ms: state.observed_at_ms,
    identity_outstanding_count: identityOutstanding,
    global_outstanding_count: globalOutstanding,
    per_identity_max_outstanding: policy.per_identity_max_outstanding,
    global_max_outstanding: policy.global_max_outstanding,
    per_identity_cap_reached: identityCapReached,
    global_cap_reached: globalCapReached,
    admission_allowed: allowed,
    reservation_created: false,
    reservation_mutation_performed: false,
    wall_clock_read_performed: false,
    transaction_submission: false,
    funds_movement: false,
    authority: VOID_ECONOMIC_INTENT_TTL_CAPS_AUTHORITY_V1,
  });
}

export function classifyEconomicIntentLatePaymentV1({
  policy: rawPolicy,
  intent: rawIntent,
  payment_observed_at_ms: rawPaymentObservedAt,
}) {
  const policy = verifyPolicy(rawPolicy);
  const intent = verifyIntent(rawIntent, policy);
  const paymentObservedAt = canonicalMs(
    rawPaymentObservedAt,
    "INVALID_ECONOMIC_INTENT_PAYMENT_OBSERVED_AT_MS",
  );
  const expired = paymentObservedAt >= intent.expires_at_ms;

  return Object.freeze({
    marker: VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_V1,
    policy_id: policy.policy_id,
    intent_id: intent.intent_id,
    payment_observed_at_ms: paymentObservedAt,
    intent_expires_at_ms: intent.expires_at_ms,
    payment_after_expiry: expired,
    action: expired
      ? "reconcile_without_automatic_execution"
      : "continue_normal_settlement_path",
    normal_settlement_path_eligible: !expired,
    automatic_execution_allowed: false,
    expired_reservation_release_required: expired,
    new_reservation_required_for_late_execution: expired,
    wall_clock_read_performed: false,
    payment_observation_performed: false,
    transaction_submission: false,
    funds_movement: false,
    authority: VOID_ECONOMIC_INTENT_TTL_CAPS_AUTHORITY_V1,
  });
}
