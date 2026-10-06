import crypto from "node:crypto";

import {
  VOID_COUPLED_NATIVE_GAS_LIABILITY_V1,
  type CoupledNativeGasLiabilityRecordV1,
} from "./coupled_native_gas_liability_v1.js";
import {
  VOID_COUPLED_NATIVE_GAS_TERMINAL_COST_EVIDENCE_AUTHORITY_V1,
  VOID_COUPLED_NATIVE_GAS_TERMINAL_COST_EVIDENCE_V1,
  VOID_COUPLED_NATIVE_GAS_TERMINAL_COST_IDENTITY_V1,
  type CoupledNativeGasTerminalCostEvidenceVerifiedV1,
} from "./coupled_native_gas_terminal_cost_evidence_v1.js";

export const VOID_COUPLED_NATIVE_GAS_LIABILITY_RECONCILIATION_V1 =
  "VOID_COUPLED_NATIVE_GAS_LIABILITY_RECONCILIATION_V1";

export const VOID_COUPLED_NATIVE_GAS_LIABILITY_RECONCILIATION_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    pure_classifier: true,
    buy_void_only: true,
    exact_open_liability_identity_rederived: true,
    exact_terminal_cost_evidence_identity_rederived: true,
    stable_terminal_cost_identity_rederived: true,
    exact_liability_terminal_evidence_binding_required: true,
    terminal_cost_evidence_provenance_verified: false,
    terminal_outcome_storage_read_verified: false,
    raw_receipt_transport_verified: false,
    current_block_transport_verified: false,
    minimum_confirmation_policy_trusted: false,
    release_candidate_requires_authenticated_terminal_reobservation: true,
    durable_reconciliation_writer_required: true,
    consumed_reserve_retirement_candidate_classified: true,
    unused_reserve_release_candidate_classified: true,
    current_buy_void_attempt_limit_one_required: true,
    multi_attempt_reconciliation_authority: false,
    reverted_reconciliation_authority: false,
    reverted_retry_requires_new_liability: false,
    confirmed_future_attempt_allowance_zero: true,
    liability_store_binding_verified: false,
    liability_store_mutation: false,
    liability_release_authorized: false,
    retry_execution_authorized: false,
    wc_void_reconciliation_authority: false,
    runtime_integration: false,
    live_balance_observation: false,
    live_fee_observation: false,
    rpc_read: false,
    rpc_write: false,
    wallet_access: false,
    private_key_access: false,
    signing: false,
    transaction_construction: false,
    transaction_broadcast: false,
    chain2050_write: false,
    activation: false,
    inventory_movement: false,
    treasury_or_liquidity_movement: false,
    funds_movement: false,
  });

const LIABILITY_SCHEMA = "void_coupled_native_gas_liability_v1";
const EVIDENCE_SCHEMA =
  "void_coupled_native_gas_terminal_cost_evidence_v1";
const TERMINAL_COST_IDENTITY_SCHEMA =
  "void_coupled_native_gas_terminal_cost_identity_v1";
const RECONCILIATION_SCHEMA =
  "void_coupled_native_gas_liability_reconciliation_v1";
const SHA256 = /^[0-9a-f]{64}$/u;
const HASH = /^0x[0-9a-f]{64}$/u;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/u;
const DECIMAL = /^(0|[1-9][0-9]*)$/u;
const UINT256_MAX = (1n << 256n) - 1n;

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

const EVIDENCE_KEYS = Object.freeze([
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
  "saga_id",
  "attempt_id",
  "transaction_hash",
  "outcome",
  "terminal_record_fingerprint_sha256",
  "terminal_recorded_at_ms",
  "receipt_block_number",
  "receipt_block_hash",
  "current_block_number",
  "observed_confirmation_count",
  "required_min_confirmations",
  "gas_used",
  "effective_gas_price_wei",
  "gas_cost_wei",
  "transaction_native_value_consumed_wei",
  "liability_consumed_wei",
  "maximum_reserved_wei",
  "within_reserved_envelope",
  "terminal_cost_identity_sha256",
  "evidence_id",
  "liability_release_authorized",
  "mutation_performed",
  "funds_movement_performed",
  "authority",
]);

export type CoupledNativeGasLiabilityReconciliationVerifiedV1 = {
  ok: true;
  status: "reconciliation_classified";
  schema: typeof RECONCILIATION_SCHEMA;
  marker: typeof VOID_COUPLED_NATIVE_GAS_LIABILITY_RECONCILIATION_V1;
  version: 1;
  lane: "presale";
  liability_id: string;
  obligation_id: string;
  payer_address: string;
  nonce: number;
  transaction_plan_fingerprint_sha256: string;
  terminal_cost_identity_sha256: string;
  outcome: "confirmed";
  attempt_limit: 1;
  completed_attempt_count: 1;
  remaining_attempt_allowance: 0;
  one_attempt_maximum_wei: string;
  maximum_reserved_wei: string;
  actual_consumed_wei: string;
  unconsumed_before_reconciliation_wei: string;
  consumed_reserve_retirement_candidate_wei: string;
  retained_future_attempt_reserve_wei: string;
  unused_reserve_release_candidate_wei: string;
  next_open_reserved_wei: string;
  retry_allowance_reserved: boolean;
  additional_attempt_requires_new_liability: boolean;
  terminal_close_candidate: boolean;
  reconciliation_id: string;
  liability_release_authorized: false;
  liability_store_mutation: false;
  retry_execution_authorized: false;
  funds_movement_performed: false;
  authority:
    typeof VOID_COUPLED_NATIVE_GAS_LIABILITY_RECONCILIATION_AUTHORITY_V1;
};

export type CoupledNativeGasLiabilityReconciliationHeldV1 = {
  ok: false;
  status: "held";
  reason: string;
  liability_release_authorized: false;
  liability_store_mutation: false;
  retry_execution_authorized: false;
  funds_movement_performed: false;
  authority:
    typeof VOID_COUPLED_NATIVE_GAS_LIABILITY_RECONCILIATION_AUTHORITY_V1;
};

export type CoupledNativeGasLiabilityReconciliationDecisionV1 =
  | CoupledNativeGasLiabilityReconciliationVerifiedV1
  | CoupledNativeGasLiabilityReconciliationHeldV1;

function held(
  reason: string,
): CoupledNativeGasLiabilityReconciliationHeldV1 {
  return Object.freeze({
    ok: false,
    status: "held",
    reason,
    liability_release_authorized: false,
    liability_store_mutation: false,
    retry_execution_authorized: false,
    funds_movement_performed: false,
    authority:
      VOID_COUPLED_NATIVE_GAS_LIABILITY_RECONCILIATION_AUTHORITY_V1,
  });
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) {
      throw new Error("coupled_native_gas_reconciliation_noncanonical_value");
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

function terminalCostIdentityBody(input: {
  liability_id: string;
  obligation_id: string;
  payer_address: string;
  nonce: number;
  transaction_plan_fingerprint_sha256: string;
  saga_id: string;
  attempt_id: string;
  transaction_hash: string;
  outcome: "confirmed" | "reverted";
  terminal_record_fingerprint_sha256: string;
  terminal_recorded_at_ms: number;
  receipt_block_number: string;
  receipt_block_hash: string;
  gas_used: string;
  effective_gas_price_wei: string;
  gas_cost_wei: string;
  transaction_native_value_consumed_wei: string;
  liability_consumed_wei: string;
  maximum_reserved_wei: string;
}) {
  return Object.freeze({
    schema: TERMINAL_COST_IDENTITY_SCHEMA,
    marker: VOID_COUPLED_NATIVE_GAS_TERMINAL_COST_IDENTITY_V1,
    version: 1 as const,
    lane: "presale" as const,
    liability_id: input.liability_id,
    obligation_id: input.obligation_id,
    payer_address: input.payer_address,
    nonce: input.nonce,
    transaction_plan_fingerprint_sha256:
      input.transaction_plan_fingerprint_sha256,
    saga_id: input.saga_id,
    attempt_id: input.attempt_id,
    transaction_hash: input.transaction_hash,
    outcome: input.outcome,
    terminal_record_fingerprint_sha256:
      input.terminal_record_fingerprint_sha256,
    terminal_recorded_at_ms: input.terminal_recorded_at_ms,
    receipt_block_number: input.receipt_block_number,
    receipt_block_hash: input.receipt_block_hash,
    gas_used: input.gas_used,
    effective_gas_price_wei: input.effective_gas_price_wei,
    gas_cost_wei: input.gas_cost_wei,
    transaction_native_value_consumed_wei:
      input.transaction_native_value_consumed_wei,
    liability_consumed_wei: input.liability_consumed_wei,
    maximum_reserved_wei: input.maximum_reserved_wei,
    within_reserved_envelope: true as const,
  });
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

function normalizeAddress(value: unknown): string {
  const raw = String(value ?? "").trim().toLowerCase();
  return ADDRESS.test(raw) ? raw : "";
}

function validateLiability(
  raw: unknown,
): CoupledNativeGasLiabilityRecordV1 {
  const value = directObject(
    raw,
    "coupled_native_gas_reconciliation_liability_object_required",
  );
  exactKeys(
    value,
    LIABILITY_KEYS,
    "coupled_native_gas_reconciliation_liability_keys_invalid",
  );
  const payer = normalizeAddress(value.payer_address);
  const nonce = Number(value.nonce);
  const nativeValue = positive(value.transaction_native_value_wei);
  const gasLimit = positive(value.gas_limit);
  const maxFee = positive(value.admitted_max_fee_per_gas_wei);
  const maximumReserved = positive(value.maximum_reserved_wei);
  const attemptLimit =
    value.attempt_limit === 1
      ? 1
      : value.attempt_limit === 2
        ? 2
        : null;
  if (
    value.schema !== LIABILITY_SCHEMA ||
    value.marker !== VOID_COUPLED_NATIVE_GAS_LIABILITY_V1 ||
    value.version !== 1 ||
    !SHA256.test(String(value.liability_id ?? "")) ||
    value.lane !== "presale" ||
    !SHA256.test(String(value.obligation_id ?? "")) ||
    !payer ||
    !Number.isSafeInteger(nonce) ||
    nonce < 0 ||
    !SHA256.test(
      String(value.transaction_plan_fingerprint_sha256 ?? ""),
    ) ||
    nativeValue === null ||
    gasLimit === null ||
    maxFee === null ||
    attemptLimit === null ||
    maximumReserved === null ||
    !SHA256.test(String(value.fee_observation_sha256 ?? "")) ||
    value.source_evidence_kind !== "buy_void_prepared_plan_v1" ||
    !SHA256.test(String(value.source_evidence_id ?? "")) ||
    value.status !== "open"
  ) {
    throw new Error(
      "coupled_native_gas_reconciliation_liability_invalid",
    );
  }
  const oneAttempt = nativeValue + gasLimit * maxFee;
  const computedMaximum = oneAttempt * BigInt(attemptLimit);
  if (
    oneAttempt > UINT256_MAX ||
    computedMaximum > UINT256_MAX ||
    maximumReserved !== computedMaximum
  ) {
    throw new Error(
      "coupled_native_gas_reconciliation_liability_envelope_invalid",
    );
  }
  const body = {
    schema: LIABILITY_SCHEMA,
    marker: VOID_COUPLED_NATIVE_GAS_LIABILITY_V1,
    version: 1,
    lane: "presale",
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
    source_evidence_kind: "buy_void_prepared_plan_v1",
    source_evidence_id: String(value.source_evidence_id),
    status: "open",
  } as const;
  if (value.liability_id !== sha256Canonical(body)) {
    throw new Error(
      "coupled_native_gas_reconciliation_liability_identity_mismatch",
    );
  }
  return value as unknown as CoupledNativeGasLiabilityRecordV1;
}

function validateEvidence(
  raw: unknown,
  liability: CoupledNativeGasLiabilityRecordV1,
): CoupledNativeGasTerminalCostEvidenceVerifiedV1 {
  const value = directObject(
    raw,
    "coupled_native_gas_reconciliation_terminal_evidence_object_required",
  );
  exactKeys(
    value,
    EVIDENCE_KEYS,
    "coupled_native_gas_reconciliation_terminal_evidence_keys_invalid",
  );
  const payer = normalizeAddress(value.payer_address);
  const nonce = Number(value.nonce);
  const terminalRecordedAt = Number(value.terminal_recorded_at_ms);
  const receiptBlock = positive(value.receipt_block_number);
  const currentBlock = positive(value.current_block_number);
  const observedConfirmations = positive(
    value.observed_confirmation_count,
  );
  const requiredMinConfirmations = positive(
    value.required_min_confirmations,
  );
  const gasUsed = positive(value.gas_used);
  const effectiveGasPrice = decimal(value.effective_gas_price_wei);
  const gasCost = decimal(value.gas_cost_wei);
  const nativeValueConsumed = decimal(
    value.transaction_native_value_consumed_wei,
  );
  const liabilityConsumed = decimal(value.liability_consumed_wei);
  const maximumReserved = positive(value.maximum_reserved_wei);
  const outcome =
    value.outcome === "confirmed"
      ? "confirmed"
      : value.outcome === "reverted"
        ? "reverted"
        : null;
  if (
    value.ok !== true ||
    value.status !== "terminal_cost_verified" ||
    value.schema !== EVIDENCE_SCHEMA ||
    value.marker !== VOID_COUPLED_NATIVE_GAS_TERMINAL_COST_EVIDENCE_V1 ||
    value.version !== 1 ||
    value.lane !== "presale" ||
    !SHA256.test(String(value.liability_id ?? "")) ||
    !SHA256.test(String(value.obligation_id ?? "")) ||
    !payer ||
    !Number.isSafeInteger(nonce) ||
    nonce < 0 ||
    !SHA256.test(
      String(value.transaction_plan_fingerprint_sha256 ?? ""),
    ) ||
    !SAGA_ID.test(String(value.saga_id ?? "")) ||
    !SHA256.test(String(value.attempt_id ?? "")) ||
    !HASH.test(String(value.transaction_hash ?? "")) ||
    outcome === null ||
    !SHA256.test(
      String(value.terminal_record_fingerprint_sha256 ?? ""),
    ) ||
    !Number.isSafeInteger(terminalRecordedAt) ||
    terminalRecordedAt <= 0 ||
    receiptBlock === null ||
    !HASH.test(String(value.receipt_block_hash ?? "")) ||
    currentBlock === null ||
    observedConfirmations === null ||
    requiredMinConfirmations === null ||
    gasUsed === null ||
    effectiveGasPrice === null ||
    gasCost === null ||
    nativeValueConsumed === null ||
    liabilityConsumed === null ||
    maximumReserved === null ||
    value.within_reserved_envelope !== true ||
    !SHA256.test(
      String(value.terminal_cost_identity_sha256 ?? ""),
    ) ||
    !SHA256.test(String(value.evidence_id ?? "")) ||
    value.liability_release_authorized !== false ||
    value.mutation_performed !== false ||
    value.funds_movement_performed !== false
  ) {
    throw new Error(
      "coupled_native_gas_reconciliation_terminal_evidence_invalid",
    );
  }
  if (
    canonical(value.authority) !==
    canonical(
      VOID_COUPLED_NATIVE_GAS_TERMINAL_COST_EVIDENCE_AUTHORITY_V1,
    )
  ) {
    throw new Error(
      "coupled_native_gas_reconciliation_terminal_evidence_authority_mismatch",
    );
  }
  if (
    value.liability_id !== liability.liability_id ||
    value.obligation_id !== liability.obligation_id ||
    payer !== liability.payer_address ||
    nonce !== liability.nonce ||
    value.transaction_plan_fingerprint_sha256 !==
      liability.transaction_plan_fingerprint_sha256 ||
    maximumReserved.toString() !== liability.maximum_reserved_wei
  ) {
    throw new Error(
      "coupled_native_gas_reconciliation_liability_evidence_binding_mismatch",
    );
  }

  const liabilityGasLimit = BigInt(liability.gas_limit);
  const liabilityMaxFee = BigInt(
    liability.admitted_max_fee_per_gas_wei,
  );
  if (gasUsed !== liabilityGasLimit) {
    throw new Error(
      "coupled_native_gas_reconciliation_gas_used_mismatch",
    );
  }
  if (effectiveGasPrice > liabilityMaxFee) {
    throw new Error(
      "coupled_native_gas_reconciliation_effective_gas_price_exceeds_liability",
    );
  }
  if (gasCost !== gasUsed * effectiveGasPrice) {
    throw new Error(
      "coupled_native_gas_reconciliation_gas_cost_mismatch",
    );
  }
  const liabilityNativeValue = BigInt(
    liability.transaction_native_value_wei,
  );
  const expectedNativeConsumed =
    outcome === "confirmed" ? liabilityNativeValue : 0n;
  if (nativeValueConsumed !== expectedNativeConsumed) {
    throw new Error(
      "coupled_native_gas_reconciliation_native_value_consumption_mismatch",
    );
  }
  if (
    liabilityConsumed !== gasCost + nativeValueConsumed ||
    liabilityConsumed > maximumReserved
  ) {
    throw new Error(
      "coupled_native_gas_reconciliation_consumed_amount_mismatch",
    );
  }
  if (
    currentBlock < receiptBlock ||
    observedConfirmations !== currentBlock - receiptBlock + 1n ||
    observedConfirmations < requiredMinConfirmations
  ) {
    throw new Error(
      "coupled_native_gas_reconciliation_confirmation_binding_mismatch",
    );
  }

  const terminalCostIdentity = sha256Canonical(
    terminalCostIdentityBody({
      liability_id: liability.liability_id,
      obligation_id: liability.obligation_id,
      payer_address: liability.payer_address,
      nonce: liability.nonce,
      transaction_plan_fingerprint_sha256:
        liability.transaction_plan_fingerprint_sha256,
      saga_id: String(value.saga_id),
      attempt_id: String(value.attempt_id),
      transaction_hash: String(value.transaction_hash),
      outcome,
      terminal_record_fingerprint_sha256: String(
        value.terminal_record_fingerprint_sha256,
      ),
      terminal_recorded_at_ms: terminalRecordedAt,
      receipt_block_number: receiptBlock.toString(),
      receipt_block_hash: String(value.receipt_block_hash),
      gas_used: gasUsed.toString(),
      effective_gas_price_wei: effectiveGasPrice.toString(),
      gas_cost_wei: gasCost.toString(),
      transaction_native_value_consumed_wei:
        nativeValueConsumed.toString(),
      liability_consumed_wei: liabilityConsumed.toString(),
      maximum_reserved_wei: maximumReserved.toString(),
    }),
  );
  if (value.terminal_cost_identity_sha256 !== terminalCostIdentity) {
    throw new Error(
      "coupled_native_gas_reconciliation_terminal_cost_identity_mismatch",
    );
  }

  const body = {
    schema: EVIDENCE_SCHEMA,
    marker: VOID_COUPLED_NATIVE_GAS_TERMINAL_COST_EVIDENCE_V1,
    version: 1,
    lane: "presale",
    liability_id: liability.liability_id,
    obligation_id: liability.obligation_id,
    payer_address: liability.payer_address,
    nonce: liability.nonce,
    transaction_plan_fingerprint_sha256:
      liability.transaction_plan_fingerprint_sha256,
    saga_id: String(value.saga_id),
    attempt_id: String(value.attempt_id),
    transaction_hash: String(value.transaction_hash),
    outcome,
    terminal_record_fingerprint_sha256: String(
      value.terminal_record_fingerprint_sha256,
    ),
    terminal_recorded_at_ms: terminalRecordedAt,
    receipt_block_number: receiptBlock.toString(),
    receipt_block_hash: String(value.receipt_block_hash),
    current_block_number: currentBlock.toString(),
    observed_confirmation_count: observedConfirmations.toString(),
    required_min_confirmations: requiredMinConfirmations.toString(),
    gas_used: gasUsed.toString(),
    effective_gas_price_wei: effectiveGasPrice.toString(),
    gas_cost_wei: gasCost.toString(),
    transaction_native_value_consumed_wei:
      nativeValueConsumed.toString(),
    liability_consumed_wei: liabilityConsumed.toString(),
    maximum_reserved_wei: maximumReserved.toString(),
    within_reserved_envelope: true,
    terminal_cost_identity_sha256: terminalCostIdentity,
  } as const;
  if (value.evidence_id !== sha256Canonical(body)) {
    throw new Error(
      "coupled_native_gas_reconciliation_terminal_evidence_identity_mismatch",
    );
  }
  return value as unknown as CoupledNativeGasTerminalCostEvidenceVerifiedV1;
}

export function classifyCoupledNativeGasLiabilityReconciliationV1(input: {
  liability: unknown;
  terminal_cost_evidence: unknown;
}): CoupledNativeGasLiabilityReconciliationDecisionV1 {
  try {
    const liability = validateLiability(input?.liability);
    if (liability.attempt_limit !== 1) {
      return held(
        "coupled_native_gas_reconciliation_attempt_limit_not_supported",
      );
    }
    const evidence = validateEvidence(
      input?.terminal_cost_evidence,
      liability,
    );
    if (evidence.outcome === "reverted") {
      return held(
        "coupled_native_gas_reconciliation_reverted_disposition_unresolved",
      );
    }

    const nativeValue = BigInt(liability.transaction_native_value_wei);
    const gasLimit = BigInt(liability.gas_limit);
    const maxFee = BigInt(liability.admitted_max_fee_per_gas_wei);
    const attemptLimit = 1 as const;
    const oneAttemptMaximum = nativeValue + gasLimit * maxFee;
    const maximumReserved = BigInt(liability.maximum_reserved_wei);
    const actualConsumed = BigInt(evidence.liability_consumed_wei);
    if (actualConsumed > maximumReserved) {
      return held(
        "coupled_native_gas_reconciliation_consumed_exceeds_reserved",
      );
    }

    const unconsumed = maximumReserved - actualConsumed;
    const remainingAttemptAllowance = 0 as const;
    const retainedFutureAttemptReserve = 0n;
    const unusedReleaseCandidate = unconsumed;
    const terminalCloseCandidate = true;
    const additionalAttemptRequiresNewLiability = true;

    const body = {
      schema: RECONCILIATION_SCHEMA,
      marker: VOID_COUPLED_NATIVE_GAS_LIABILITY_RECONCILIATION_V1,
      version: 1,
      lane: "presale",
      liability_id: liability.liability_id,
      obligation_id: liability.obligation_id,
      payer_address: liability.payer_address,
      nonce: liability.nonce,
      transaction_plan_fingerprint_sha256:
        liability.transaction_plan_fingerprint_sha256,
      terminal_cost_identity_sha256:
        evidence.terminal_cost_identity_sha256,
      outcome: "confirmed" as const,
      attempt_limit: attemptLimit,
      completed_attempt_count: 1 as const,
      remaining_attempt_allowance: remainingAttemptAllowance,
      one_attempt_maximum_wei: oneAttemptMaximum.toString(),
      maximum_reserved_wei: maximumReserved.toString(),
      actual_consumed_wei: actualConsumed.toString(),
      unconsumed_before_reconciliation_wei: unconsumed.toString(),
      consumed_reserve_retirement_candidate_wei:
        actualConsumed.toString(),
      retained_future_attempt_reserve_wei:
        retainedFutureAttemptReserve.toString(),
      unused_reserve_release_candidate_wei:
        unusedReleaseCandidate.toString(),
      next_open_reserved_wei:
        retainedFutureAttemptReserve.toString(),
      retry_allowance_reserved:
        remainingAttemptAllowance > 0,
      additional_attempt_requires_new_liability:
        additionalAttemptRequiresNewLiability,
      terminal_close_candidate: terminalCloseCandidate,
    } as const;

    return Object.freeze({
      ok: true,
      status: "reconciliation_classified",
      ...body,
      reconciliation_id: sha256Canonical(body),
      liability_release_authorized: false,
      liability_store_mutation: false,
      retry_execution_authorized: false,
      funds_movement_performed: false,
      authority:
        VOID_COUPLED_NATIVE_GAS_LIABILITY_RECONCILIATION_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "coupled_native_gas_liability_reconciliation_failed",
    );
  }
}
