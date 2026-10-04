import crypto from "node:crypto";

import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_PLAN_RESERVATION_V1,
  type BuyVoidPreparedTransactionPlanReservationV1,
} from "./buy_void_prepared_transaction_plan_reservation_v1.js";

export const VOID_COUPLED_NATIVE_GAS_LIABILITY_V1 =
  "VOID_COUPLED_NATIVE_GAS_LIABILITY_V1";

export const VOID_COUPLED_NATIVE_GAS_PAYER_OBSERVATION_V1 =
  "VOID_COUPLED_NATIVE_GAS_PAYER_OBSERVATION_V1";

export const VOID_COUPLED_NATIVE_GAS_LIABILITY_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    pure_admission_classifier: true,
    deterministic_liability_identity: true,
    buy_void_prepared_plan_reused: true,
    payer_scoped_balance_accounting: true,
    fee_freshness_recomputed: true,
    nonce_collision_detection: true,
    exact_replay_idempotent: true,
    altered_obligation_conflict_hold: true,
    cross_lane_record_accounting: true,
    wc_void_candidate_admission: false,
    durable_journal_read: false,
    durable_journal_write: false,
    live_balance_observation: false,
    live_fee_observation: false,
    trusted_time_source_proven: false,
    terminal_receipt_reconciliation: false,
    manual_recovery_allowance_bound: false,
    full_presale_lifetime_capacity_proven: false,
    ongoing_wc_void_native_gas_model_proven: false,
    hidden_purchase_or_trade_minimum: false,
    runtime_integration: false,
    wallet_access: false,
    private_key_access: false,
    signing: false,
    transaction_construction: false,
    transaction_broadcast: false,
    chain2050_write: false,
    inventory_movement: false,
    market_activation: false,
    public_presale_activation: false,
    treasury_or_liquidity_movement: false,
    funds_movement: false,
  });

const OBSERVATION_SCHEMA =
  "void_coupled_native_gas_payer_observation_v1";
const LIABILITY_SCHEMA =
  "void_coupled_native_gas_liability_v1";
const SHA256 = /^[0-9a-f]{64}$/u;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const DECIMAL = /^(0|[1-9][0-9]*)$/u;
const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/u;
const UINT256_MAX = (1n << 256n) - 1n;
const MAX_OPEN_LIABILITIES = 100_000;

export type CoupledNativeGasPayerObservationV1 = {
  schema: typeof OBSERVATION_SCHEMA;
  marker: typeof VOID_COUPLED_NATIVE_GAS_PAYER_OBSERVATION_V1;
  version: 1;
  chain_id: "2050";
  payer_address: string;
  observed_native_balance_wei: string;
  required_max_fee_per_gas_wei: string;
  observed_at_ms: number;
  expires_at_ms: number;
  source_identity_sha256: string;
  observation_sha256: string;
};

export type CoupledNativeGasLiabilityRecordV1 = {
  schema: typeof LIABILITY_SCHEMA;
  marker: typeof VOID_COUPLED_NATIVE_GAS_LIABILITY_V1;
  version: 1;
  liability_id: string;
  lane: "presale" | "wc_void";
  obligation_id: string;
  payer_address: string;
  nonce: number;
  transaction_plan_fingerprint_sha256: string;
  gas_limit: string;
  admitted_max_fee_per_gas_wei: string;
  attempt_limit: 1 | 2;
  maximum_reserved_wei: string;
  fee_observation_sha256: string;
  source_evidence_kind:
    | "buy_void_prepared_plan_v1"
    | "wc_void_reviewed_settlement_plan";
  source_evidence_id: string;
  status: "open";
};

export type CoupledNativeGasLiabilityDecisionV1 =
  | {
      ok: true;
      status: "admitted" | "idempotent";
      duplicate: boolean;
      mutation_performed: false;
      lane: "presale";
      payer_address: string;
      observed_native_balance_wei: string;
      reserved_before_wei: string;
      requested_max_liability_wei: string;
      reserved_after_wei: string;
      unreserved_after_wei: string;
      liability: CoupledNativeGasLiabilityRecordV1;
      authority:
        typeof VOID_COUPLED_NATIVE_GAS_LIABILITY_AUTHORITY_V1;
    }
  | {
      ok: false;
      status: "held";
      reason: string;
      mutation_performed: false;
      authority:
        typeof VOID_COUPLED_NATIVE_GAS_LIABILITY_AUTHORITY_V1;
      detail?: Readonly<Record<string, unknown>>;
      liability?: never;
    };

type ObservationInputV1 = {
  payer_address: unknown;
  observed_native_balance_wei: unknown;
  required_max_fee_per_gas_wei: unknown;
  observed_at_ms: unknown;
  expires_at_ms: unknown;
  source_identity_sha256: unknown;
};

const PLAN_KEYS = Object.freeze([
  "schema",
  "marker",
  "version",
  "reservation_id",
  "reserved_at_ms",
  "saga_id",
  "attempt_id",
  "chain_id",
  "wallet_address",
  "wallet_key_sha256",
  "nonce",
  "delivery_address",
  "native_value_wei",
  "gas_limit",
  "max_fee_per_gas_wei",
  "max_priority_fee_per_gas_wei",
  "economic_policy_fingerprint_sha256",
  "preparation_policy_fingerprint_sha256",
  "transaction_template_fingerprint_sha256",
  "transaction_plan_fingerprint_sha256",
  "reservation_status",
  "nonce_release_authorized",
  "credential_access_authorized",
  "wallet_access_authorized",
  "signing_authorized",
  "transaction_broadcast_authorized",
  "raw_signed_transaction_persisted",
  "money_movement_authorized",
]);

const OBSERVATION_KEYS = Object.freeze([
  "schema",
  "marker",
  "version",
  "chain_id",
  "payer_address",
  "observed_native_balance_wei",
  "required_max_fee_per_gas_wei",
  "observed_at_ms",
  "expires_at_ms",
  "source_identity_sha256",
  "observation_sha256",
]);

const LIABILITY_KEYS = Object.freeze([
  "schema",
  "marker",
  "version",
  "liability_id",
  "lane",
  "obligation_id",
  "payer_address",
  "nonce",
  "transaction_plan_fingerprint_sha256",
  "gas_limit",
  "admitted_max_fee_per_gas_wei",
  "attempt_limit",
  "maximum_reserved_wei",
  "fee_observation_sha256",
  "source_evidence_kind",
  "source_evidence_id",
  "status",
]);

function held(
  reason: string,
  detail?: Readonly<Record<string, unknown>>,
): Extract<CoupledNativeGasLiabilityDecisionV1, { ok: false }> {
  return Object.freeze({
    ok: false,
    status: "held",
    reason,
    mutation_performed: false,
    authority: VOID_COUPLED_NATIVE_GAS_LIABILITY_AUTHORITY_V1,
    ...(detail ? { detail } : {}),
  });
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
    .join(",")}}`;
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function fingerprint(value: unknown): string {
  return sha256(canonical(value));
}

function directObject(
  value: unknown,
  code: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(code);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(code);
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
  code: string,
): void {
  const actual = Object.keys(value).sort().join("\n");
  const expected = [...keys].sort().join("\n");
  if (actual !== expected) throw new Error(code);
}

function address(value: unknown): string {
  const normalized = String(value ?? "").trim().toLowerCase();
  return ADDRESS.test(normalized) ? normalized : "";
}

function decimal(value: unknown): bigint | null {
  const raw = String(value ?? "").trim();
  if (!DECIMAL.test(raw)) return null;
  try {
    const parsed = BigInt(raw);
    return parsed <= UINT256_MAX ? parsed : null;
  } catch {
    return null;
  }
}

function positive(value: unknown): bigint | null {
  const parsed = decimal(value);
  return parsed !== null && parsed > 0n ? parsed : null;
}

function safeInteger(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0
    ? parsed
    : null;
}

function validateBuyVoidPlan(
  raw: unknown,
): BuyVoidPreparedTransactionPlanReservationV1 {
  const value = directObject(
    raw,
    "coupled_native_gas_buy_void_plan_object_required",
  );
  exactKeys(
    value,
    PLAN_KEYS,
    "coupled_native_gas_buy_void_plan_keys_invalid",
  );
  const wallet = address(value.wallet_address);
  const delivery = address(value.delivery_address);
  const nonce = safeInteger(value.nonce);
  const nativeValue = positive(value.native_value_wei);
  const gasLimit = positive(value.gas_limit);
  const maxFee = positive(value.max_fee_per_gas_wei);
  const priorityFee = decimal(value.max_priority_fee_per_gas_wei);
  if (
    value.schema !==
      "void_buy_void_prepared_transaction_plan_reservation_v1" ||
    value.marker !==
      VOID_BUY_VOID_PREPARED_TRANSACTION_PLAN_RESERVATION_V1 ||
    value.version !== 1 ||
    !SHA256.test(String(value.reservation_id ?? "")) ||
    !Number.isSafeInteger(value.reserved_at_ms) ||
    Number(value.reserved_at_ms) <= 0 ||
    !SAGA_ID.test(String(value.saga_id ?? "")) ||
    !SHA256.test(String(value.attempt_id ?? "")) ||
    value.chain_id !== "2050" ||
    !wallet ||
    !SHA256.test(String(value.wallet_key_sha256 ?? "")) ||
    nonce === null ||
    !delivery ||
    delivery === wallet ||
    nativeValue === null ||
    gasLimit === null ||
    maxFee === null ||
    priorityFee === null ||
    priorityFee > maxFee ||
    !SHA256.test(
      String(value.economic_policy_fingerprint_sha256 ?? ""),
    ) ||
    !SHA256.test(
      String(value.preparation_policy_fingerprint_sha256 ?? ""),
    ) ||
    !SHA256.test(
      String(value.transaction_template_fingerprint_sha256 ?? ""),
    ) ||
    !SHA256.test(
      String(value.transaction_plan_fingerprint_sha256 ?? ""),
    ) ||
    value.reservation_status !== "reserved" ||
    value.nonce_release_authorized !== false ||
    value.credential_access_authorized !== false ||
    value.wallet_access_authorized !== false ||
    value.signing_authorized !== false ||
    value.transaction_broadcast_authorized !== false ||
    value.raw_signed_transaction_persisted !== false ||
    value.money_movement_authorized !== false
  ) {
    throw new Error("coupled_native_gas_buy_void_plan_invalid");
  }

  const walletKey = sha256(
    `void-buy-wallet-v1\n2050\n${wallet}`,
  );
  if (value.wallet_key_sha256 !== walletKey) {
    throw new Error(
      "coupled_native_gas_buy_void_wallet_key_mismatch",
    );
  }

  const template = fingerprint({
    saga_id: value.saga_id,
    attempt_id: value.attempt_id,
    chain_id: "2050",
    wallet_address: wallet,
    delivery_address: delivery,
    native_value_wei: nativeValue.toString(),
    gas_limit: gasLimit.toString(),
    max_fee_per_gas_wei: maxFee.toString(),
    max_priority_fee_per_gas_wei: priorityFee.toString(),
    economic_policy_fingerprint_sha256:
      value.economic_policy_fingerprint_sha256,
    preparation_policy_fingerprint_sha256:
      value.preparation_policy_fingerprint_sha256,
  });
  if (
    value.transaction_template_fingerprint_sha256 !== template
  ) {
    throw new Error(
      "coupled_native_gas_buy_void_template_fingerprint_mismatch",
    );
  }

  const plan = fingerprint({
    transaction_template_fingerprint_sha256: template,
    nonce,
  });
  if (value.transaction_plan_fingerprint_sha256 !== plan) {
    throw new Error(
      "coupled_native_gas_buy_void_plan_fingerprint_mismatch",
    );
  }

  const reservationId = sha256(
    [
      "void-buy-prepared-transaction-plan-reservation-v1",
      walletKey,
      String(nonce),
      String(value.attempt_id),
      plan,
    ].join("\n"),
  );
  if (value.reservation_id !== reservationId) {
    throw new Error(
      "coupled_native_gas_buy_void_reservation_id_mismatch",
    );
  }
  return value as unknown as BuyVoidPreparedTransactionPlanReservationV1;
}

function observationBody(input: ObservationInputV1) {
  const payer = address(input.payer_address);
  const balance = decimal(input.observed_native_balance_wei);
  const requiredFee = positive(input.required_max_fee_per_gas_wei);
  const observedAt = safeInteger(input.observed_at_ms);
  const expiresAt = safeInteger(input.expires_at_ms);
  const sourceIdentity = String(
    input.source_identity_sha256 ?? "",
  ).trim().toLowerCase();
  if (
    !payer ||
    balance === null ||
    requiredFee === null ||
    observedAt === null ||
    observedAt <= 0 ||
    expiresAt === null ||
    expiresAt <= observedAt ||
    !SHA256.test(sourceIdentity)
  ) {
    throw new Error(
      "coupled_native_gas_payer_observation_input_invalid",
    );
  }
  return Object.freeze({
    schema: OBSERVATION_SCHEMA,
    marker: VOID_COUPLED_NATIVE_GAS_PAYER_OBSERVATION_V1,
    version: 1 as const,
    chain_id: "2050" as const,
    payer_address: payer,
    observed_native_balance_wei: balance.toString(),
    required_max_fee_per_gas_wei: requiredFee.toString(),
    observed_at_ms: observedAt,
    expires_at_ms: expiresAt,
    source_identity_sha256: sourceIdentity,
  });
}

export function buildCoupledNativeGasPayerObservationV1(
  input: ObservationInputV1,
): CoupledNativeGasPayerObservationV1 {
  const body = observationBody(input);
  return Object.freeze({
    ...body,
    observation_sha256: fingerprint(body),
  });
}

function validateObservation(
  raw: unknown,
): CoupledNativeGasPayerObservationV1 {
  const value = directObject(
    raw,
    "coupled_native_gas_payer_observation_object_required",
  );
  exactKeys(
    value,
    OBSERVATION_KEYS,
    "coupled_native_gas_payer_observation_keys_invalid",
  );
  const body = observationBody(value as ObservationInputV1);
  if (
    value.schema !== body.schema ||
    value.marker !== body.marker ||
    value.version !== body.version ||
    value.chain_id !== body.chain_id ||
    value.payer_address !== body.payer_address ||
    value.observed_native_balance_wei !==
      body.observed_native_balance_wei ||
    value.required_max_fee_per_gas_wei !==
      body.required_max_fee_per_gas_wei ||
    value.observed_at_ms !== body.observed_at_ms ||
    value.expires_at_ms !== body.expires_at_ms ||
    value.source_identity_sha256 !== body.source_identity_sha256 ||
    value.observation_sha256 !== fingerprint(body)
  ) {
    throw new Error(
      "coupled_native_gas_payer_observation_binding_invalid",
    );
  }
  return value as unknown as CoupledNativeGasPayerObservationV1;
}

function liabilityBody(
  input: Omit<
    CoupledNativeGasLiabilityRecordV1,
    "schema" | "marker" | "version" | "liability_id" | "status"
  >,
) {
  return Object.freeze({
    schema: LIABILITY_SCHEMA,
    marker: VOID_COUPLED_NATIVE_GAS_LIABILITY_V1,
    version: 1 as const,
    lane: input.lane,
    obligation_id: input.obligation_id,
    payer_address: input.payer_address,
    nonce: input.nonce,
    transaction_plan_fingerprint_sha256:
      input.transaction_plan_fingerprint_sha256,
    gas_limit: input.gas_limit,
    admitted_max_fee_per_gas_wei:
      input.admitted_max_fee_per_gas_wei,
    attempt_limit: input.attempt_limit,
    maximum_reserved_wei: input.maximum_reserved_wei,
    fee_observation_sha256: input.fee_observation_sha256,
    source_evidence_kind: input.source_evidence_kind,
    source_evidence_id: input.source_evidence_id,
    status: "open" as const,
  });
}

function liabilityId(
  body: ReturnType<typeof liabilityBody>,
): string {
  return sha256(canonical(body));
}

function validateLiability(
  raw: unknown,
): CoupledNativeGasLiabilityRecordV1 {
  const value = directObject(
    raw,
    "coupled_native_gas_liability_object_required",
  );
  exactKeys(
    value,
    LIABILITY_KEYS,
    "coupled_native_gas_liability_keys_invalid",
  );
  const lane =
    value.lane === "presale"
      ? "presale"
      : value.lane === "wc_void"
        ? "wc_void"
        : null;
  const payer = address(value.payer_address);
  const nonce = safeInteger(value.nonce);
  const gasLimit = positive(value.gas_limit);
  const maxFee = positive(value.admitted_max_fee_per_gas_wei);
  const reserved = positive(value.maximum_reserved_wei);
  const attemptLimit =
    value.attempt_limit === 1
      ? 1
      : value.attempt_limit === 2
        ? 2
        : null;
  const evidenceKind =
    value.source_evidence_kind === "buy_void_prepared_plan_v1"
      ? "buy_void_prepared_plan_v1"
      : value.source_evidence_kind ===
          "wc_void_reviewed_settlement_plan"
        ? "wc_void_reviewed_settlement_plan"
        : null;
  if (
    value.schema !== LIABILITY_SCHEMA ||
    value.marker !== VOID_COUPLED_NATIVE_GAS_LIABILITY_V1 ||
    value.version !== 1 ||
    !SHA256.test(String(value.liability_id ?? "")) ||
    lane === null ||
    !SHA256.test(String(value.obligation_id ?? "")) ||
    !payer ||
    nonce === null ||
    !SHA256.test(
      String(value.transaction_plan_fingerprint_sha256 ?? ""),
    ) ||
    gasLimit === null ||
    maxFee === null ||
    attemptLimit === null ||
    reserved === null ||
    !SHA256.test(String(value.fee_observation_sha256 ?? "")) ||
    evidenceKind === null ||
    !SHA256.test(String(value.source_evidence_id ?? "")) ||
    value.status !== "open"
  ) {
    throw new Error("coupled_native_gas_liability_invalid");
  }
  const computed = gasLimit * maxFee * BigInt(attemptLimit);
  if (
    computed > UINT256_MAX ||
    reserved !== computed ||
    (lane === "presale" &&
      evidenceKind !== "buy_void_prepared_plan_v1") ||
    (lane === "wc_void" &&
      evidenceKind !== "wc_void_reviewed_settlement_plan")
  ) {
    throw new Error(
      "coupled_native_gas_liability_economic_binding_invalid",
    );
  }
  const body = liabilityBody({
    lane,
    obligation_id: String(value.obligation_id),
    payer_address: payer,
    nonce,
    transaction_plan_fingerprint_sha256: String(
      value.transaction_plan_fingerprint_sha256,
    ),
    gas_limit: gasLimit.toString(),
    admitted_max_fee_per_gas_wei: maxFee.toString(),
    attempt_limit: attemptLimit,
    maximum_reserved_wei: reserved.toString(),
    fee_observation_sha256: String(value.fee_observation_sha256),
    source_evidence_kind: evidenceKind,
    source_evidence_id: String(value.source_evidence_id),
  });
  if (value.liability_id !== liabilityId(body)) {
    throw new Error(
      "coupled_native_gas_liability_identity_mismatch",
    );
  }
  return value as unknown as CoupledNativeGasLiabilityRecordV1;
}

function candidateFromBuyVoid(
  plan: BuyVoidPreparedTransactionPlanReservationV1,
  observation: CoupledNativeGasPayerObservationV1,
): CoupledNativeGasLiabilityRecordV1 {
  const gasLimit = BigInt(plan.gas_limit);
  const maxFee = BigInt(plan.max_fee_per_gas_wei);
  const maximum = gasLimit * maxFee;
  if (maximum <= 0n || maximum > UINT256_MAX) {
    throw new Error(
      "coupled_native_gas_candidate_liability_out_of_range",
    );
  }
  const body = liabilityBody({
    lane: "presale",
    obligation_id: plan.reservation_id,
    payer_address: plan.wallet_address,
    nonce: plan.nonce,
    transaction_plan_fingerprint_sha256:
      plan.transaction_plan_fingerprint_sha256,
    gas_limit: gasLimit.toString(),
    admitted_max_fee_per_gas_wei: maxFee.toString(),
    attempt_limit: 1,
    maximum_reserved_wei: maximum.toString(),
    fee_observation_sha256: observation.observation_sha256,
    source_evidence_kind: "buy_void_prepared_plan_v1",
    source_evidence_id: plan.transaction_plan_fingerprint_sha256,
  });
  return Object.freeze({
    ...body,
    liability_id: liabilityId(body),
  });
}

export function classifyCoupledNativeGasBuyVoidAdmissionV1(input: {
  now_ms: unknown;
  buy_void_plan: unknown;
  payer_observation: unknown;
  open_liabilities: readonly unknown[];
}): CoupledNativeGasLiabilityDecisionV1 {
  try {
    const nowMs = safeInteger(input?.now_ms);
    if (nowMs === null || nowMs <= 0) {
      return held("coupled_native_gas_now_invalid");
    }
    const plan = validateBuyVoidPlan(input?.buy_void_plan);
    const observation = validateObservation(input?.payer_observation);
    if (plan.wallet_address !== observation.payer_address) {
      return held("coupled_native_gas_payer_mismatch");
    }
    if (
      nowMs < observation.observed_at_ms ||
      nowMs > observation.expires_at_ms
    ) {
      return held("coupled_native_gas_fee_observation_stale");
    }
    if (
      BigInt(plan.max_fee_per_gas_wei) <
      BigInt(observation.required_max_fee_per_gas_wei)
    ) {
      return held(
        "coupled_native_gas_reserved_fee_below_fresh_requirement",
      );
    }
    if (!Array.isArray(input?.open_liabilities)) {
      return held("coupled_native_gas_liability_census_array_required");
    }
    if (input.open_liabilities.length > MAX_OPEN_LIABILITIES) {
      return held("coupled_native_gas_liability_census_too_large");
    }

    const candidate = candidateFromBuyVoid(plan, observation);
    const seen = new Set<string>();
    let reservedBefore = 0n;
    let exactReplay: CoupledNativeGasLiabilityRecordV1 | null = null;
    for (const raw of input.open_liabilities) {
      const record = validateLiability(raw);
      if (record.payer_address !== candidate.payer_address) {
        return held("coupled_native_gas_liability_census_payer_mismatch");
      }
      if (seen.has(record.liability_id)) {
        return held("coupled_native_gas_liability_census_duplicate_id");
      }
      seen.add(record.liability_id);
      reservedBefore += BigInt(record.maximum_reserved_wei);
      if (reservedBefore > UINT256_MAX) {
        return held("coupled_native_gas_reserved_total_overflow");
      }
      if (record.liability_id === candidate.liability_id) {
        exactReplay = record;
        continue;
      }
      if (record.obligation_id === candidate.obligation_id) {
        return held("coupled_native_gas_obligation_conflict");
      }
      if (
        record.transaction_plan_fingerprint_sha256 ===
        candidate.transaction_plan_fingerprint_sha256
      ) {
        return held("coupled_native_gas_transaction_plan_conflict");
      }
      if (record.nonce === candidate.nonce) {
        return held("coupled_native_gas_nonce_conflict");
      }
    }

    const observedBalance = BigInt(
      observation.observed_native_balance_wei,
    );
    if (reservedBefore > observedBalance) {
      return held(
        "coupled_native_gas_existing_liability_exceeds_balance",
        Object.freeze({
          observed_native_balance_wei:
            observation.observed_native_balance_wei,
          reserved_before_wei: reservedBefore.toString(),
        }),
      );
    }

    const requested = BigInt(candidate.maximum_reserved_wei);
    if (exactReplay) {
      return Object.freeze({
        ok: true,
        status: "idempotent",
        duplicate: true,
        mutation_performed: false,
        lane: "presale",
        payer_address: candidate.payer_address,
        observed_native_balance_wei:
          observation.observed_native_balance_wei,
        reserved_before_wei: reservedBefore.toString(),
        requested_max_liability_wei: requested.toString(),
        reserved_after_wei: reservedBefore.toString(),
        unreserved_after_wei:
          (observedBalance - reservedBefore).toString(),
        liability: exactReplay,
        authority: VOID_COUPLED_NATIVE_GAS_LIABILITY_AUTHORITY_V1,
      });
    }

    const reservedAfter = reservedBefore + requested;
    if (
      reservedAfter > UINT256_MAX ||
      reservedAfter > observedBalance
    ) {
      return held(
        "coupled_native_gas_insufficient_unreserved_native_balance",
        Object.freeze({
          observed_native_balance_wei:
            observation.observed_native_balance_wei,
          reserved_before_wei: reservedBefore.toString(),
          requested_max_liability_wei: requested.toString(),
        }),
      );
    }

    return Object.freeze({
      ok: true,
      status: "admitted",
      duplicate: false,
      mutation_performed: false,
      lane: "presale",
      payer_address: candidate.payer_address,
      observed_native_balance_wei:
        observation.observed_native_balance_wei,
      reserved_before_wei: reservedBefore.toString(),
      requested_max_liability_wei: requested.toString(),
      reserved_after_wei: reservedAfter.toString(),
      unreserved_after_wei:
        (observedBalance - reservedAfter).toString(),
      liability: candidate,
      authority: VOID_COUPLED_NATIVE_GAS_LIABILITY_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "coupled_native_gas_admission_failed",
    );
  }
}

export function classifyCoupledNativeGasWcVoidAdmissionV1():
  Extract<CoupledNativeGasLiabilityDecisionV1, { ok: false }> {
  return held(
    "coupled_native_gas_wc_void_settlement_plan_not_reviewed",
    Object.freeze({
      wc_void_candidate_admission: false,
      required_next_evidence:
        "exact_reviewed_wc_void_settlement_gas_nonce_plan",
    }),
  );
}
