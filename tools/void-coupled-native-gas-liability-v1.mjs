#!/usr/bin/env node
import crypto from "node:crypto";

export const VOID_COUPLED_NATIVE_GAS_LIABILITY_V1 =
  "VOID_COUPLED_NATIVE_GAS_LIABILITY_V1";

export const COUPLED_GAS_PAYER_V1 =
  "0xc884f631c3881b8b672bfcbf019c856146cd7f73";

export const PRESALE_MAX_GAS_LIMIT_V1 = 320000n;
export const MAX_FEE_PER_GAS_WEI_V1 = 3000000000n;
export const RESERVED_ATTEMPTS_PER_OBLIGATION_V1 = 2n;

export const PRESALE_MAX_COST_PER_ATTEMPT_WEI_V1 =
  PRESALE_MAX_GAS_LIMIT_V1 * MAX_FEE_PER_GAS_WEI_V1;
export const PRESALE_MAX_RESERVED_LIABILITY_PER_OBLIGATION_WEI_V1 =
  PRESALE_MAX_COST_PER_ATTEMPT_WEI_V1 *
  RESERVED_ATTEMPTS_PER_OBLIGATION_V1;

export const AUTHORITY = Object.freeze({
  source_only_policy: true,
  wallet_access: false,
  credential_access: false,
  rpc_call: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  chain2050_write: false,
  wc_ledger_write: false,
  presale_payment_acceptance: false,
  market_activation: false,
  public_presale_activation: false,
  funds_movement: false,
});

export const POLICY = Object.freeze({
  chain_id: "2050",
  payer_address: COUPLED_GAS_PAYER_V1,
  native_gas_balance_separate_from_void_token_balance: true,
  void_token_withholding_does_not_refill_native_gas_balance: true,
  shared_payer_requires_single_cross_lane_reservation_journal: true,
  reservation_must_precede_presale_payment_instruction_authority: true,
  reservation_must_precede_wc_void_irreversible_settlement_authority: true,
  reserved_attempts_per_obligation: Number(
    RESERVED_ATTEMPTS_PER_OBLIGATION_V1,
  ),
  primary_attempt_count: 1,
  manual_recovery_attempt_count: 1,
  automatic_retry: false,
  unrelated_post_activation_native_spend_must_preserve_open_liabilities: true,
  presale_hidden_minimum_introduced: false,
  presale_public_purchase_throttle_introduced: false,
  presale_max_gas_limit: PRESALE_MAX_GAS_LIMIT_V1.toString(),
  presale_max_fee_per_gas_wei: MAX_FEE_PER_GAS_WEI_V1.toString(),
  presale_max_cost_per_attempt_wei:
    PRESALE_MAX_COST_PER_ATTEMPT_WEI_V1.toString(),
  presale_max_reserved_liability_per_obligation_wei:
    PRESALE_MAX_RESERVED_LIABILITY_PER_OBLIGATION_WEI_V1.toString(),
  wc_void_deployed_settle_void_gas_census_required: true,
  wc_void_runtime_gas_ceiling_must_be_observed: true,
  wc_void_max_fee_per_gas_wei: MAX_FEE_PER_GAS_WEI_V1.toString(),
});

const UINT = /^(0|[1-9][0-9]*)$/u;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/u;
const SAFE_ID = /^[A-Za-z0-9._:-]{1,200}$/u;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const MAX_UINT128 = (1n << 128n) - 1n;

function plainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(label + " must be an object");
  }
  return value;
}

function exactKeys(value, keys, label) {
  const object = plainObject(value, label);
  const actual = Object.keys(object).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(label + " keys mismatch");
  }
  return object;
}

function uint(value, label, { allowZero = true } = {}) {
  if (typeof value !== "string" || !UINT.test(value)) {
    throw new Error(label + " must be a canonical unsigned decimal string");
  }
  const parsed = BigInt(value);
  if ((!allowZero && parsed === 0n) || parsed > MAX_UINT128) {
    throw new Error(label + " is outside the v1 range");
  }
  return parsed;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function contentId(prefix, value) {
  return (
    prefix +
    crypto
      .createHash("sha256")
      .update(JSON.stringify(canonicalize(value)))
      .digest("hex")
  );
}

function normalize(raw) {
  const request = exactKeys(
    structuredClone(raw),
    [
      "schema",
      "lane",
      "obligation_id",
      "payer_address",
      "payer_native_balance_wei",
      "journal_snapshot_id",
      "journal_verified",
      "open_reserved_liability_wei",
      "gas_limit",
      "max_fee_per_gas_wei",
      "gas_ceiling_observed",
      "gas_ceiling_source",
      "attempts_reserved",
    ],
    "coupled gas admission request",
  );

  if (request.schema !== "void.coupled_native_gas_admission.v1") {
    throw new Error("coupled gas admission schema mismatch");
  }
  if (!["presale", "wc_void"].includes(request.lane)) {
    throw new Error("coupled gas admission lane unsupported");
  }
  if (
    typeof request.obligation_id !== "string" ||
    !SAFE_ID.test(request.obligation_id)
  ) {
    throw new Error("obligation_id invalid");
  }
  if (
    typeof request.payer_address !== "string" ||
    !ADDRESS.test(request.payer_address) ||
    request.payer_address.toLowerCase() !== COUPLED_GAS_PAYER_V1
  ) {
    throw new Error("coupled gas payer mismatch");
  }
  if (
    typeof request.journal_snapshot_id !== "string" ||
    !SHA256_ID.test(request.journal_snapshot_id)
  ) {
    throw new Error("journal snapshot identity invalid");
  }
  if (request.journal_verified !== true) {
    throw new Error("cross-lane reservation journal must be verified");
  }
  if (
    request.attempts_reserved !==
    Number(RESERVED_ATTEMPTS_PER_OBLIGATION_V1)
  ) {
    throw new Error("exactly two bounded attempts must be reserved");
  }
  if (request.gas_ceiling_observed !== true) {
    throw new Error("runtime gas ceiling must be observed");
  }

  const payerBalance = uint(
    request.payer_native_balance_wei,
    "payer_native_balance_wei",
  );
  const openReserved = uint(
    request.open_reserved_liability_wei,
    "open_reserved_liability_wei",
  );
  const gasLimit = uint(request.gas_limit, "gas_limit", { allowZero: false });
  const maxFeePerGas = uint(
    request.max_fee_per_gas_wei,
    "max_fee_per_gas_wei",
    { allowZero: false },
  );

  if (openReserved > payerBalance) {
    throw new Error("open gas liabilities exceed payer balance");
  }

  if (request.lane === "presale") {
    if (
      gasLimit !== PRESALE_MAX_GAS_LIMIT_V1 ||
      maxFeePerGas !== MAX_FEE_PER_GAS_WEI_V1 ||
      request.gas_ceiling_source !==
        "production_real_token_fulfill_v1"
    ) {
      throw new Error("presale gas ceiling binding mismatch");
    }
  } else {
    if (
      request.gas_ceiling_source !==
        "deployed_wc_void_settle_void_v1"
    ) {
      throw new Error("WC/VOID gas ceiling source mismatch");
    }
    if (maxFeePerGas !== MAX_FEE_PER_GAS_WEI_V1) {
      throw new Error("WC/VOID max fee-per-gas binding mismatch");
    }
  }

  return {
    request: {
      ...request,
      payer_address: request.payer_address.toLowerCase(),
      payer_native_balance_wei: payerBalance.toString(),
      open_reserved_liability_wei: openReserved.toString(),
      gas_limit: gasLimit.toString(),
      max_fee_per_gas_wei: maxFeePerGas.toString(),
    },
    payerBalance,
    openReserved,
    gasLimit,
    maxFeePerGas,
  };
}

export function evaluateCoupledNativeGasAdmissionV1(raw) {
  const normalized = normalize(raw);
  const perAttemptMaxCost =
    normalized.gasLimit * normalized.maxFeePerGas;
  const requestedLiability =
    perAttemptMaxCost * RESERVED_ATTEMPTS_PER_OBLIGATION_V1;
  const availableBefore =
    normalized.payerBalance - normalized.openReserved;

  if (requestedLiability > availableBefore) {
    throw new Error(
      "insufficient unreserved native gas balance for bounded obligation",
    );
  }

  const openReservedAfter =
    normalized.openReserved + requestedLiability;
  const unreservedAfter =
    normalized.payerBalance - openReservedAfter;

  const payload = {
    schema: "void.coupled_native_gas_admission_result.v1",
    marker: VOID_COUPLED_NATIVE_GAS_LIABILITY_V1,
    request: normalized.request,
    accounting: {
      per_attempt_max_cost_wei: perAttemptMaxCost.toString(),
      attempts_reserved:
        RESERVED_ATTEMPTS_PER_OBLIGATION_V1.toString(),
      requested_liability_wei: requestedLiability.toString(),
      open_reserved_liability_before_wei:
        normalized.openReserved.toString(),
      open_reserved_liability_after_wei:
        openReservedAfter.toString(),
      unreserved_native_balance_before_wei:
        availableBefore.toString(),
      unreserved_native_balance_after_wei:
        unreservedAfter.toString(),
    },
    invariants: {
      native_gas_balance_is_not_void_token_balance: true,
      no_void_token_withholding_claimed_as_native_gas_replenishment: true,
      single_cross_lane_reservation_journal_required: true,
      gas_liability_reserved_before_external_authority: true,
      primary_attempt_funded: true,
      manual_recovery_attempt_funded: true,
      automatic_retry_forbidden: true,
      shared_balance_double_promise_forbidden: true,
      unrelated_spend_must_preserve_open_liabilities: true,
      presale_hidden_minimum_required: false,
      presale_public_purchase_throttle_required: false,
    },
    authority: AUTHORITY,
  };

  return Object.freeze({
    ...payload,
    gas_reservation_id:
      contentId("voidgasr1_", payload),
  });
}
