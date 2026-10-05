import crypto from "node:crypto";

import {
  VOID_COUPLED_NATIVE_GAS_LIABILITY_V1,
  type CoupledNativeGasLiabilityRecordV1,
} from "./coupled_native_gas_liability_v1.js";
import {
  VOID_COUPLED_NATIVE_GAS_LIABILITY_RECONCILIATION_AUTHORITY_V1,
  VOID_COUPLED_NATIVE_GAS_LIABILITY_RECONCILIATION_V1,
  type CoupledNativeGasLiabilityReconciliationVerifiedV1,
} from "./coupled_native_gas_liability_reconciliation_v1.js";

export const VOID_COUPLED_NATIVE_GAS_EFFECTIVE_OPEN_CENSUS_V1 =
  "VOID_COUPLED_NATIVE_GAS_EFFECTIVE_OPEN_CENSUS_V1";

export const VOID_COUPLED_NATIVE_GAS_EFFECTIVE_OPEN_CENSUS_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    pure_census_classifier: true,
    payer_scoped: true,
    immutable_liability_history: true,
    immutable_reconciliation_history: true,
    exact_liability_identity_rederived: true,
    exact_reconciliation_identity_rederived: true,
    reconciliation_liability_binding_required: true,
    one_reconciliation_per_liability: true,
    orphan_reconciliation_rejected: true,
    duplicate_reconciliation_rejected: true,
    historical_obligation_uniqueness_checked: true,
    historical_transaction_plan_uniqueness_checked: true,
    historical_nonce_uniqueness_checked: true,
    effective_open_set_derived: true,
    reserve_conservation_rederived: true,
    content_addressed_census: true,
    presale_reconciliation_supported: true,
    wc_void_liabilities_remain_open: true,
    terminal_evidence_provenance_verified: false,
    reconciliation_namespace_custody_verified: false,
    liability_release_authorized: false,
    filesystem_read: false,
    filesystem_write: false,
    runtime_integration: false,
    live_balance_observation: false,
    live_fee_observation: false,
    nonce_scheduler_authority: false,
    wallet_access: false,
    private_key_access: false,
    signing: false,
    transaction_construction: false,
    transaction_broadcast: false,
    chain2050_write: false,
    gas_spend: false,
    activation: false,
    inventory_movement: false,
    treasury_or_liquidity_movement: false,
    funds_movement: false,
  });

const CENSUS_SCHEMA =
  "void_coupled_native_gas_effective_open_census_v1";
const LIABILITY_SCHEMA = "void_coupled_native_gas_liability_v1";
const RECONCILIATION_SCHEMA =
  "void_coupled_native_gas_liability_reconciliation_v1";
const SHA256 = /^[0-9a-f]{64}$/u;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const DECIMAL = /^(0|[1-9][0-9]*)$/u;
const UINT256_MAX = (1n << 256n) - 1n;
const MAX_HISTORY_ROWS = 100_000;

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
  "transaction_native_value_wei",
  "gas_limit",
  "admitted_max_fee_per_gas_wei",
  "attempt_limit",
  "maximum_reserved_wei",
  "fee_observation_sha256",
  "source_evidence_kind",
  "source_evidence_id",
  "status",
]);

const RECONCILIATION_KEYS = Object.freeze([
  "ok",
  "status",
  "schema",
  "marker",
  "version",
  "lane",
  "liability_id",
  "obligation_id",
  "payer_address",
  "nonce",
  "transaction_plan_fingerprint_sha256",
  "terminal_cost_evidence_id",
  "outcome",
  "attempt_limit",
  "completed_attempt_count",
  "remaining_attempt_allowance",
  "one_attempt_maximum_wei",
  "maximum_reserved_wei",
  "actual_consumed_wei",
  "unconsumed_before_reconciliation_wei",
  "consumed_reserve_retirement_candidate_wei",
  "retained_future_attempt_reserve_wei",
  "unused_reserve_release_candidate_wei",
  "next_open_reserved_wei",
  "retry_allowance_reserved",
  "additional_attempt_requires_new_liability",
  "terminal_close_candidate",
  "reconciliation_id",
  "liability_release_authorized",
  "liability_store_mutation",
  "retry_execution_authorized",
  "funds_movement_performed",
  "authority",
]);

export type CoupledNativeGasEffectiveOpenCensusVerifiedV1 = {
  ok: true;
  status: "census_classified";
  schema: typeof CENSUS_SCHEMA;
  marker: typeof VOID_COUPLED_NATIVE_GAS_EFFECTIVE_OPEN_CENSUS_V1;
  version: 1;
  payer_address: string;
  historical_liability_count: number;
  reconciled_liability_count: number;
  effective_open_liability_count: number;
  wc_void_effective_open_liability_count: number;
  historical_maximum_reserved_wei: string;
  reconciled_maximum_reserved_wei: string;
  reconciled_actual_consumed_wei: string;
  reconciled_unused_release_candidate_wei: string;
  effective_open_reserved_wei: string;
  historical_liability_ids: readonly string[];
  reconciliation_ids: readonly string[];
  reconciled_liability_ids: readonly string[];
  effective_open_liability_ids: readonly string[];
  census_id: string;
  terminal_evidence_provenance_verified: false;
  liability_release_authorized: false;
  mutation_performed: false;
  funds_movement_performed: false;
  authority:
    typeof VOID_COUPLED_NATIVE_GAS_EFFECTIVE_OPEN_CENSUS_AUTHORITY_V1;
};

export type CoupledNativeGasEffectiveOpenCensusHeldV1 = {
  ok: false;
  status: "held";
  reason: string;
  terminal_evidence_provenance_verified: false;
  liability_release_authorized: false;
  mutation_performed: false;
  funds_movement_performed: false;
  authority:
    typeof VOID_COUPLED_NATIVE_GAS_EFFECTIVE_OPEN_CENSUS_AUTHORITY_V1;
};

export type CoupledNativeGasEffectiveOpenCensusDecisionV1 =
  | CoupledNativeGasEffectiveOpenCensusVerifiedV1
  | CoupledNativeGasEffectiveOpenCensusHeldV1;

function held(
  reason: string,
): CoupledNativeGasEffectiveOpenCensusHeldV1 {
  return Object.freeze({
    ok: false,
    status: "held",
    reason,
    terminal_evidence_provenance_verified: false,
    liability_release_authorized: false,
    mutation_performed: false,
    funds_movement_performed: false,
    authority:
      VOID_COUPLED_NATIVE_GAS_EFFECTIVE_OPEN_CENSUS_AUTHORITY_V1,
  });
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) {
      throw new Error(
        "coupled_native_gas_effective_open_noncanonical_value",
      );
    }
    return encoded;
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonical).join(",") + "]";
  }
  const record = value as Record<string, unknown>;
  return (
    "{" +
    Object.keys(record)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonical(record[key]))
      .join(",") +
    "}"
  );
}

function sha256Canonical(value: unknown): string {
  return crypto
    .createHash("sha256")
    .update(canonical(value), "utf8")
    .digest("hex");
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
  expected: readonly string[],
  code: string,
): void {
  if (
    Object.keys(value).sort().join("\n") !==
    [...expected].sort().join("\n")
  ) {
    throw new Error(code);
  }
}

function normalizedAddress(value: unknown): string {
  const raw = String(value ?? "").trim().toLowerCase();
  return ADDRESS.test(raw) ? raw : "";
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

function addBounded(
  left: bigint,
  right: bigint,
  code: string,
): bigint {
  const next = left + right;
  if (next > UINT256_MAX) throw new Error(code);
  return next;
}

function liabilityBody(
  value: {
    lane: "presale" | "wc_void";
    obligation_id: string;
    payer_address: string;
    nonce: number;
    transaction_plan_fingerprint_sha256: string;
    transaction_native_value_wei: string;
    gas_limit: string;
    admitted_max_fee_per_gas_wei: string;
    attempt_limit: 1 | 2;
    maximum_reserved_wei: string;
    fee_observation_sha256: string;
    source_evidence_kind:
      | "buy_void_prepared_plan_v1"
      | "wc_void_reviewed_settlement_plan";
    source_evidence_id: string;
  },
) {
  return Object.freeze({
    schema: LIABILITY_SCHEMA,
    marker: VOID_COUPLED_NATIVE_GAS_LIABILITY_V1,
    version: 1 as const,
    lane: value.lane,
    obligation_id: value.obligation_id,
    payer_address: value.payer_address,
    nonce: value.nonce,
    transaction_plan_fingerprint_sha256:
      value.transaction_plan_fingerprint_sha256,
    transaction_native_value_wei:
      value.transaction_native_value_wei,
    gas_limit: value.gas_limit,
    admitted_max_fee_per_gas_wei:
      value.admitted_max_fee_per_gas_wei,
    attempt_limit: value.attempt_limit,
    maximum_reserved_wei: value.maximum_reserved_wei,
    fee_observation_sha256: value.fee_observation_sha256,
    source_evidence_kind: value.source_evidence_kind,
    source_evidence_id: value.source_evidence_id,
    status: "open" as const,
  });
}

function validateLiability(
  raw: unknown,
): CoupledNativeGasLiabilityRecordV1 {
  const value = directObject(
    raw,
    "coupled_native_gas_effective_open_liability_object_required",
  );
  exactKeys(
    value,
    LIABILITY_KEYS,
    "coupled_native_gas_effective_open_liability_keys_invalid",
  );
  const lane =
    value.lane === "presale"
      ? "presale"
      : value.lane === "wc_void"
        ? "wc_void"
        : null;
  const payer = normalizedAddress(value.payer_address);
  const nonce = safeInteger(value.nonce);
  const nativeValue = decimal(value.transaction_native_value_wei);
  const gasLimit = positive(value.gas_limit);
  const maxFee = positive(value.admitted_max_fee_per_gas_wei);
  const maximumReserved = positive(value.maximum_reserved_wei);
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
    value.payer_address !== payer ||
    nonce === null ||
    value.nonce !== nonce ||
    !SHA256.test(
      String(value.transaction_plan_fingerprint_sha256 ?? ""),
    ) ||
    nativeValue === null ||
    value.transaction_native_value_wei !== nativeValue.toString() ||
    gasLimit === null ||
    value.gas_limit !== gasLimit.toString() ||
    maxFee === null ||
    value.admitted_max_fee_per_gas_wei !== maxFee.toString() ||
    attemptLimit === null ||
    maximumReserved === null ||
    value.maximum_reserved_wei !== maximumReserved.toString() ||
    !SHA256.test(String(value.fee_observation_sha256 ?? "")) ||
    evidenceKind === null ||
    !SHA256.test(String(value.source_evidence_id ?? "")) ||
    value.status !== "open"
  ) {
    throw new Error(
      "coupled_native_gas_effective_open_liability_invalid",
    );
  }

  const oneAttemptGas = gasLimit * maxFee;
  const oneAttemptEnvelope = nativeValue + oneAttemptGas;
  const computedMaximum =
    oneAttemptEnvelope * BigInt(attemptLimit);
  if (
    oneAttemptGas > UINT256_MAX ||
    oneAttemptEnvelope > UINT256_MAX ||
    computedMaximum > UINT256_MAX ||
    computedMaximum !== maximumReserved ||
    (lane === "presale" &&
      evidenceKind !== "buy_void_prepared_plan_v1") ||
    (lane === "wc_void" &&
      evidenceKind !== "wc_void_reviewed_settlement_plan")
  ) {
    throw new Error(
      "coupled_native_gas_effective_open_liability_economic_binding_invalid",
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
    transaction_native_value_wei: nativeValue.toString(),
    gas_limit: gasLimit.toString(),
    admitted_max_fee_per_gas_wei: maxFee.toString(),
    attempt_limit: attemptLimit,
    maximum_reserved_wei: maximumReserved.toString(),
    fee_observation_sha256: String(value.fee_observation_sha256),
    source_evidence_kind: evidenceKind,
    source_evidence_id: String(value.source_evidence_id),
  });
  if (value.liability_id !== sha256Canonical(body)) {
    throw new Error(
      "coupled_native_gas_effective_open_liability_identity_mismatch",
    );
  }
  return value as unknown as CoupledNativeGasLiabilityRecordV1;
}

function reconciliationBody(
  input: {
    liability_id: string;
    obligation_id: string;
    payer_address: string;
    nonce: number;
    transaction_plan_fingerprint_sha256: string;
    terminal_cost_evidence_id: string;
    one_attempt_maximum_wei: string;
    maximum_reserved_wei: string;
    actual_consumed_wei: string;
    unconsumed_before_reconciliation_wei: string;
    consumed_reserve_retirement_candidate_wei: string;
    unused_reserve_release_candidate_wei: string;
  },
) {
  return Object.freeze({
    schema: RECONCILIATION_SCHEMA,
    marker: VOID_COUPLED_NATIVE_GAS_LIABILITY_RECONCILIATION_V1,
    version: 1 as const,
    lane: "presale" as const,
    liability_id: input.liability_id,
    obligation_id: input.obligation_id,
    payer_address: input.payer_address,
    nonce: input.nonce,
    transaction_plan_fingerprint_sha256:
      input.transaction_plan_fingerprint_sha256,
    terminal_cost_evidence_id: input.terminal_cost_evidence_id,
    outcome: "confirmed" as const,
    attempt_limit: 1 as const,
    completed_attempt_count: 1 as const,
    remaining_attempt_allowance: 0 as const,
    one_attempt_maximum_wei: input.one_attempt_maximum_wei,
    maximum_reserved_wei: input.maximum_reserved_wei,
    actual_consumed_wei: input.actual_consumed_wei,
    unconsumed_before_reconciliation_wei:
      input.unconsumed_before_reconciliation_wei,
    consumed_reserve_retirement_candidate_wei:
      input.consumed_reserve_retirement_candidate_wei,
    retained_future_attempt_reserve_wei: "0",
    unused_reserve_release_candidate_wei:
      input.unused_reserve_release_candidate_wei,
    next_open_reserved_wei: "0",
    retry_allowance_reserved: false,
    additional_attempt_requires_new_liability: true,
    terminal_close_candidate: true,
  });
}

function validateReconciliation(
  raw: unknown,
  liability: CoupledNativeGasLiabilityRecordV1,
): CoupledNativeGasLiabilityReconciliationVerifiedV1 {
  const value = directObject(
    raw,
    "coupled_native_gas_effective_open_reconciliation_object_required",
  );
  exactKeys(
    value,
    RECONCILIATION_KEYS,
    "coupled_native_gas_effective_open_reconciliation_keys_invalid",
  );

  const payer = normalizedAddress(value.payer_address);
  const nonce = safeInteger(value.nonce);
  const oneAttemptMaximum = positive(value.one_attempt_maximum_wei);
  const maximumReserved = positive(value.maximum_reserved_wei);
  const actualConsumed = decimal(value.actual_consumed_wei);
  const unconsumed = decimal(
    value.unconsumed_before_reconciliation_wei,
  );
  const consumedRetirement = decimal(
    value.consumed_reserve_retirement_candidate_wei,
  );
  const retainedFuture = decimal(
    value.retained_future_attempt_reserve_wei,
  );
  const unusedRelease = decimal(
    value.unused_reserve_release_candidate_wei,
  );
  const nextOpen = decimal(value.next_open_reserved_wei);

  if (
    value.ok !== true ||
    value.status !== "reconciliation_classified" ||
    value.schema !== RECONCILIATION_SCHEMA ||
    value.marker !==
      VOID_COUPLED_NATIVE_GAS_LIABILITY_RECONCILIATION_V1 ||
    value.version !== 1 ||
    value.lane !== "presale" ||
    !SHA256.test(String(value.liability_id ?? "")) ||
    !SHA256.test(String(value.obligation_id ?? "")) ||
    !payer ||
    value.payer_address !== payer ||
    nonce === null ||
    value.nonce !== nonce ||
    !SHA256.test(
      String(value.transaction_plan_fingerprint_sha256 ?? ""),
    ) ||
    !SHA256.test(String(value.terminal_cost_evidence_id ?? "")) ||
    value.outcome !== "confirmed" ||
    value.attempt_limit !== 1 ||
    value.completed_attempt_count !== 1 ||
    value.remaining_attempt_allowance !== 0 ||
    oneAttemptMaximum === null ||
    value.one_attempt_maximum_wei !== oneAttemptMaximum.toString() ||
    maximumReserved === null ||
    value.maximum_reserved_wei !== maximumReserved.toString() ||
    actualConsumed === null ||
    value.actual_consumed_wei !== actualConsumed.toString() ||
    unconsumed === null ||
    value.unconsumed_before_reconciliation_wei !== unconsumed.toString() ||
    consumedRetirement === null ||
    value.consumed_reserve_retirement_candidate_wei !==
      consumedRetirement.toString() ||
    retainedFuture === null ||
    value.retained_future_attempt_reserve_wei !== retainedFuture.toString() ||
    unusedRelease === null ||
    value.unused_reserve_release_candidate_wei !==
      unusedRelease.toString() ||
    nextOpen === null ||
    value.next_open_reserved_wei !== nextOpen.toString() ||
    value.retry_allowance_reserved !== false ||
    value.additional_attempt_requires_new_liability !== true ||
    value.terminal_close_candidate !== true ||
    !SHA256.test(String(value.reconciliation_id ?? "")) ||
    value.liability_release_authorized !== false ||
    value.liability_store_mutation !== false ||
    value.retry_execution_authorized !== false ||
    value.funds_movement_performed !== false
  ) {
    throw new Error(
      "coupled_native_gas_effective_open_reconciliation_invalid",
    );
  }

  if (
    canonical(value.authority) !==
    canonical(
      VOID_COUPLED_NATIVE_GAS_LIABILITY_RECONCILIATION_AUTHORITY_V1,
    )
  ) {
    throw new Error(
      "coupled_native_gas_effective_open_reconciliation_authority_mismatch",
    );
  }

  if (liability.lane !== "presale") {
    throw new Error(
      "coupled_native_gas_effective_open_wc_void_reconciliation_not_supported",
    );
  }
  if (
    liability.attempt_limit !== 1 ||
    value.liability_id !== liability.liability_id ||
    value.obligation_id !== liability.obligation_id ||
    payer !== liability.payer_address ||
    nonce !== liability.nonce ||
    value.transaction_plan_fingerprint_sha256 !==
      liability.transaction_plan_fingerprint_sha256 ||
    maximumReserved.toString() !== liability.maximum_reserved_wei
  ) {
    throw new Error(
      "coupled_native_gas_effective_open_reconciliation_liability_binding_mismatch",
    );
  }

  const liabilityNativeValue =
    BigInt(liability.transaction_native_value_wei);
  const liabilityGasLimit = BigInt(liability.gas_limit);
  const liabilityMaxFee =
    BigInt(liability.admitted_max_fee_per_gas_wei);
  const liabilityOneAttemptMaximum =
    liabilityNativeValue + liabilityGasLimit * liabilityMaxFee;
  const gasCost = actualConsumed - liabilityNativeValue;
  const effectiveGasPrice =
    actualConsumed >= liabilityNativeValue &&
    gasCost % liabilityGasLimit === 0n
      ? gasCost / liabilityGasLimit
      : null;
  if (
    oneAttemptMaximum !== liabilityOneAttemptMaximum ||
    oneAttemptMaximum !== maximumReserved ||
    actualConsumed < liabilityNativeValue ||
    actualConsumed > maximumReserved ||
    effectiveGasPrice === null ||
    effectiveGasPrice > liabilityMaxFee ||
    unconsumed !== maximumReserved - actualConsumed ||
    consumedRetirement !== actualConsumed ||
    retainedFuture !== 0n ||
    unusedRelease !== unconsumed ||
    nextOpen !== 0n ||
    actualConsumed + unusedRelease !== maximumReserved
  ) {
    throw new Error(
      "coupled_native_gas_effective_open_reconciliation_accounting_invalid",
    );
  }

  const body = reconciliationBody({
    liability_id: liability.liability_id,
    obligation_id: liability.obligation_id,
    payer_address: liability.payer_address,
    nonce: liability.nonce,
    transaction_plan_fingerprint_sha256:
      liability.transaction_plan_fingerprint_sha256,
    terminal_cost_evidence_id: String(
      value.terminal_cost_evidence_id,
    ),
    one_attempt_maximum_wei: oneAttemptMaximum.toString(),
    maximum_reserved_wei: maximumReserved.toString(),
    actual_consumed_wei: actualConsumed.toString(),
    unconsumed_before_reconciliation_wei: unconsumed.toString(),
    consumed_reserve_retirement_candidate_wei:
      consumedRetirement.toString(),
    unused_reserve_release_candidate_wei:
      unusedRelease.toString(),
  });
  if (value.reconciliation_id !== sha256Canonical(body)) {
    throw new Error(
      "coupled_native_gas_effective_open_reconciliation_identity_mismatch",
    );
  }

  return value as unknown as CoupledNativeGasLiabilityReconciliationVerifiedV1;
}

export function classifyCoupledNativeGasEffectiveOpenCensusV1(input: {
  payer_address: unknown;
  liabilities: readonly unknown[];
  reconciliations: readonly unknown[];
}): CoupledNativeGasEffectiveOpenCensusDecisionV1 {
  try {
    const payerAddress = normalizedAddress(input?.payer_address);
    if (!payerAddress) {
      return held(
        "coupled_native_gas_effective_open_payer_address_invalid",
      );
    }
    if (!Array.isArray(input?.liabilities)) {
      return held(
        "coupled_native_gas_effective_open_liabilities_array_required",
      );
    }
    if (!Array.isArray(input?.reconciliations)) {
      return held(
        "coupled_native_gas_effective_open_reconciliations_array_required",
      );
    }
    if (
      input.liabilities.length > MAX_HISTORY_ROWS ||
      input.reconciliations.length > MAX_HISTORY_ROWS
    ) {
      return held(
        "coupled_native_gas_effective_open_history_too_large",
      );
    }

    const liabilitiesById =
      new Map<string, CoupledNativeGasLiabilityRecordV1>();
    const seenObligations = new Set<string>();
    const seenTransactionPlans = new Set<string>();
    const seenNonces = new Set<number>();
    let historicalMaximumReserved = 0n;
    for (const raw of input.liabilities) {
      const liability = validateLiability(raw);
      if (liability.payer_address !== payerAddress) {
        return held(
          "coupled_native_gas_effective_open_liability_payer_mismatch",
        );
      }
      if (liabilitiesById.has(liability.liability_id)) {
        return held(
          "coupled_native_gas_effective_open_duplicate_liability",
        );
      }
      if (seenObligations.has(liability.obligation_id)) {
        return held(
          "coupled_native_gas_effective_open_historical_obligation_conflict",
        );
      }
      if (
        seenTransactionPlans.has(
          liability.transaction_plan_fingerprint_sha256,
        )
      ) {
        return held(
          "coupled_native_gas_effective_open_historical_transaction_plan_conflict",
        );
      }
      if (seenNonces.has(liability.nonce)) {
        return held(
          "coupled_native_gas_effective_open_historical_nonce_conflict",
        );
      }
      liabilitiesById.set(liability.liability_id, liability);
      seenObligations.add(liability.obligation_id);
      seenTransactionPlans.add(
        liability.transaction_plan_fingerprint_sha256,
      );
      seenNonces.add(liability.nonce);
      historicalMaximumReserved = addBounded(
        historicalMaximumReserved,
        BigInt(liability.maximum_reserved_wei),
        "coupled_native_gas_effective_open_historical_reserved_overflow",
      );
    }

    const reconciliationsByLiability =
      new Map<
        string,
        CoupledNativeGasLiabilityReconciliationVerifiedV1
      >();
    const reconciliationIds = new Set<string>();
    let reconciledMaximumReserved = 0n;
    let reconciledActualConsumed = 0n;
    let reconciledUnusedRelease = 0n;

    for (const raw of input.reconciliations) {
      const rawObject = directObject(
        raw,
        "coupled_native_gas_effective_open_reconciliation_object_required",
      );
      const liabilityId = String(rawObject.liability_id ?? "");
      if (!SHA256.test(liabilityId)) {
        return held(
          "coupled_native_gas_effective_open_reconciliation_liability_id_invalid",
        );
      }
      const liability = liabilitiesById.get(liabilityId);
      if (!liability) {
        return held(
          "coupled_native_gas_effective_open_orphan_reconciliation",
        );
      }
      const reconciliation = validateReconciliation(raw, liability);
      const prior = reconciliationsByLiability.get(liabilityId);
      if (prior) {
        return held(
          prior.reconciliation_id === reconciliation.reconciliation_id
            ? "coupled_native_gas_effective_open_duplicate_reconciliation"
            : "coupled_native_gas_effective_open_conflicting_reconciliation",
        );
      }
      if (reconciliationIds.has(reconciliation.reconciliation_id)) {
        return held(
          "coupled_native_gas_effective_open_duplicate_reconciliation_id",
        );
      }
      reconciliationsByLiability.set(
        liabilityId,
        reconciliation,
      );
      reconciliationIds.add(reconciliation.reconciliation_id);
      reconciledMaximumReserved = addBounded(
        reconciledMaximumReserved,
        BigInt(reconciliation.maximum_reserved_wei),
        "coupled_native_gas_effective_open_reconciled_reserved_overflow",
      );
      reconciledActualConsumed = addBounded(
        reconciledActualConsumed,
        BigInt(reconciliation.actual_consumed_wei),
        "coupled_native_gas_effective_open_reconciled_consumed_overflow",
      );
      reconciledUnusedRelease = addBounded(
        reconciledUnusedRelease,
        BigInt(
          reconciliation.unused_reserve_release_candidate_wei,
        ),
        "coupled_native_gas_effective_open_reconciled_release_overflow",
      );
    }

    const historicalLiabilityIds =
      [...liabilitiesById.keys()].sort();
    const reconciledLiabilityIds =
      [...reconciliationsByLiability.keys()].sort();
    const acceptedReconciliationIds =
      [...reconciliationIds].sort();
    const effectiveOpenLiabilityIds: string[] = [];
    let effectiveOpenReserved = 0n;
    let wcVoidEffectiveOpenCount = 0;

    for (const liabilityId of historicalLiabilityIds) {
      if (reconciliationsByLiability.has(liabilityId)) continue;
      const liability = liabilitiesById.get(liabilityId)!;
      effectiveOpenLiabilityIds.push(liabilityId);
      effectiveOpenReserved = addBounded(
        effectiveOpenReserved,
        BigInt(liability.maximum_reserved_wei),
        "coupled_native_gas_effective_open_reserved_overflow",
      );
      if (liability.lane === "wc_void") {
        wcVoidEffectiveOpenCount += 1;
      }
    }

    if (
      historicalMaximumReserved !==
        reconciledMaximumReserved + effectiveOpenReserved ||
      reconciledMaximumReserved !==
        reconciledActualConsumed + reconciledUnusedRelease
    ) {
      return held(
        "coupled_native_gas_effective_open_reserve_conservation_mismatch",
      );
    }

    const body = Object.freeze({
      schema: CENSUS_SCHEMA,
      marker: VOID_COUPLED_NATIVE_GAS_EFFECTIVE_OPEN_CENSUS_V1,
      version: 1 as const,
      payer_address: payerAddress,
      historical_liability_count: historicalLiabilityIds.length,
      reconciled_liability_count: reconciledLiabilityIds.length,
      effective_open_liability_count:
        effectiveOpenLiabilityIds.length,
      wc_void_effective_open_liability_count:
        wcVoidEffectiveOpenCount,
      historical_maximum_reserved_wei:
        historicalMaximumReserved.toString(),
      reconciled_maximum_reserved_wei:
        reconciledMaximumReserved.toString(),
      reconciled_actual_consumed_wei:
        reconciledActualConsumed.toString(),
      reconciled_unused_release_candidate_wei:
        reconciledUnusedRelease.toString(),
      effective_open_reserved_wei:
        effectiveOpenReserved.toString(),
      historical_liability_ids:
        Object.freeze(historicalLiabilityIds),
      reconciliation_ids:
        Object.freeze(acceptedReconciliationIds),
      reconciled_liability_ids:
        Object.freeze(reconciledLiabilityIds),
      effective_open_liability_ids:
        Object.freeze(effectiveOpenLiabilityIds),
    });

    return Object.freeze({
      ok: true,
      status: "census_classified",
      ...body,
      census_id: sha256Canonical(body),
      terminal_evidence_provenance_verified: false,
      liability_release_authorized: false,
      mutation_performed: false,
      funds_movement_performed: false,
      authority:
        VOID_COUPLED_NATIVE_GAS_EFFECTIVE_OPEN_CENSUS_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "coupled_native_gas_effective_open_census_failed",
    );
  }
}
