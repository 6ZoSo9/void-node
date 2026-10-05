import crypto from "node:crypto";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_EVIDENCE_V1,
  type BuyVoidPaymentKeyedReceiptEvidenceV1,
} from "./buy_void_payment_keyed_receipt_evidence_v1.js";
import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_PLAN_RESERVATION_V1,
  type BuyVoidPreparedTransactionPlanReservationV1,
} from "./buy_void_prepared_transaction_plan_reservation_v1.js";
import {
  VOID_COUPLED_NATIVE_GAS_LIABILITY_V1,
  type CoupledNativeGasLiabilityRecordV1,
} from "./coupled_native_gas_liability_v1.js";

export const VOID_COUPLED_NATIVE_GAS_TERMINAL_COST_EVIDENCE_V1 =
  "VOID_COUPLED_NATIVE_GAS_TERMINAL_COST_EVIDENCE_V1";

export const VOID_COUPLED_NATIVE_GAS_TERMINAL_COST_EVIDENCE_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    pure_classifier: true,
    buy_void_only: true,
    exact_open_liability_required: true,
    exact_prepared_plan_binding_required: true,
    immutable_terminal_receipt_evidence_required: true,
    exact_receipt_policy_fingerprint_required: true,
    raw_receipt_cost_fields_required: true,
    exact_transaction_block_binding_required: true,
    exact_receipt_sender_contract_binding_required: true,
    confirmed_and_reverted_supported: true,
    gas_used_ceiling_required: true,
    effective_gas_price_ceiling_required: true,
    exact_integer_gas_cost: true,
    confirmed_native_value_debit_bound: true,
    reverted_native_value_debit_zero: true,
    reserved_envelope_ceiling_required: true,
    receipt_evidence_storage_read: false,
    raw_receipt_transport_verified: false,
    terminal_receipt_reconciliation_performed: false,
    liability_release_authorized: false,
    liability_store_mutation: false,
    retry_allowance_release_authorized: false,
    wc_void_terminal_cost_authority: false,
    runtime_integration: false,
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
const PLAN_SCHEMA =
  "void_buy_void_prepared_transaction_plan_reservation_v1";
const RECEIPT_EVIDENCE_SCHEMA =
  "void_buy_void_payment_keyed_receipt_evidence_v1";
const EVIDENCE_SCHEMA =
  "void_coupled_native_gas_terminal_cost_evidence_v1";

const SHA256 = /^[0-9a-f]{64}$/u;
const HASH = /^0x[0-9a-f]{64}$/u;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/u;
const DECIMAL = /^(0|[1-9][0-9]*)$/u;
const HEX_QUANTITY = /^0x(?:0|[1-9a-f][0-9a-f]*)$/u;
const UINT256_MAX = (1n << 256n) - 1n;

export type CoupledNativeGasRawTerminalReceiptV1 = {
  transactionHash: string;
  blockNumber: string;
  blockHash: string;
  status: "0x0" | "0x1";
  gasUsed: string;
  effectiveGasPrice: string;
  from: string;
  to: string;
};

export type CoupledNativeGasTerminalCostEvidenceVerifiedV1 = {
  ok: true;
  status: "terminal_cost_verified";
  schema: typeof EVIDENCE_SCHEMA;
  marker: typeof VOID_COUPLED_NATIVE_GAS_TERMINAL_COST_EVIDENCE_V1;
  version: 1;
  lane: "presale";
  liability_id: string;
  obligation_id: string;
  payer_address: string;
  nonce: number;
  transaction_plan_fingerprint_sha256: string;
  saga_id: string;
  attempt_id: string;
  transaction_hash: string;
  outcome: "confirmed" | "reverted";
  receipt_block_number: string;
  receipt_block_hash: string;
  observed_confirmation_count: string;
  receipt_policy_fingerprint_sha256: string;
  receipt_evidence_fingerprint_sha256: string;
  gas_used: string;
  effective_gas_price_wei: string;
  gas_cost_wei: string;
  transaction_native_value_debit_wei: string;
  actual_payer_debit_wei: string;
  maximum_reserved_wei: string;
  within_reserved_envelope: true;
  evidence_id: string;
  liability_release_authorized: false;
  mutation_performed: false;
  funds_movement_performed: false;
  authority:
    typeof VOID_COUPLED_NATIVE_GAS_TERMINAL_COST_EVIDENCE_AUTHORITY_V1;
};

export type CoupledNativeGasTerminalCostEvidenceHeldV1 = {
  ok: false;
  status: "held";
  reason: string;
  liability_release_authorized: false;
  mutation_performed: false;
  funds_movement_performed: false;
  authority:
    typeof VOID_COUPLED_NATIVE_GAS_TERMINAL_COST_EVIDENCE_AUTHORITY_V1;
};

export type CoupledNativeGasTerminalCostEvidenceDecisionV1 =
  | CoupledNativeGasTerminalCostEvidenceVerifiedV1
  | CoupledNativeGasTerminalCostEvidenceHeldV1;

function held(
  reason: string,
): CoupledNativeGasTerminalCostEvidenceHeldV1 {
  return Object.freeze({
    ok: false,
    status: "held",
    reason,
    liability_release_authorized: false,
    mutation_performed: false,
    funds_movement_performed: false,
    authority:
      VOID_COUPLED_NATIVE_GAS_TERMINAL_COST_EVIDENCE_AUTHORITY_V1,
  });
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new Error("noncanonical_value");
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

function sha256(value: unknown): string {
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

function decimal(value: unknown): bigint | null {
  const raw = String(value ?? "");
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

function hexQuantity(value: unknown): bigint | null {
  const raw = String(value ?? "").toLowerCase();
  if (!HEX_QUANTITY.test(raw)) return null;
  try {
    const parsed = BigInt(raw);
    return parsed <= UINT256_MAX ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeHash(value: unknown): string {
  const raw = String(value ?? "").trim().toLowerCase();
  return HASH.test(raw) ? raw : "";
}

function normalizeAddress(value: unknown): string {
  const raw = String(value ?? "").trim().toLowerCase();
  return ADDRESS.test(raw) ? raw : "";
}

function validatePlan(
  raw: unknown,
): BuyVoidPreparedTransactionPlanReservationV1 {
  const value = directObject(
    raw,
    "coupled_native_gas_terminal_cost_plan_object_required",
  );
  if (
    value.schema !== PLAN_SCHEMA ||
    value.marker !==
      VOID_BUY_VOID_PREPARED_TRANSACTION_PLAN_RESERVATION_V1 ||
    value.version !== 1 ||
    !SHA256.test(String(value.reservation_id ?? "")) ||
    !SAGA_ID.test(String(value.saga_id ?? "")) ||
    !SHA256.test(String(value.attempt_id ?? "")) ||
    value.chain_id !== "2050" ||
    !normalizeAddress(value.wallet_address) ||
    !Number.isSafeInteger(value.nonce) ||
    Number(value.nonce) < 0 ||
    !normalizeAddress(value.delivery_address) ||
    positive(value.native_value_wei) === null ||
    positive(value.gas_limit) === null ||
    positive(value.max_fee_per_gas_wei) === null ||
    positive(value.max_priority_fee_per_gas_wei) === null ||
    !SHA256.test(
      String(value.transaction_plan_fingerprint_sha256 ?? ""),
    ) ||
    value.reservation_status !== "reserved" ||
    value.nonce_release_authorized !== false ||
    value.transaction_broadcast_authorized !== false ||
    value.money_movement_authorized !== false
  ) {
    throw new Error(
      "coupled_native_gas_terminal_cost_plan_invalid",
    );
  }
  return value as unknown as BuyVoidPreparedTransactionPlanReservationV1;
}

function validateLiability(
  raw: unknown,
): CoupledNativeGasLiabilityRecordV1 {
  const value = directObject(
    raw,
    "coupled_native_gas_terminal_cost_liability_object_required",
  );
  const payer = normalizeAddress(value.payer_address);
  const nativeValue = positive(value.transaction_native_value_wei);
  const gasLimit = positive(value.gas_limit);
  const maxFee = positive(value.admitted_max_fee_per_gas_wei);
  const reserved = positive(value.maximum_reserved_wei);
  if (
    value.schema !== LIABILITY_SCHEMA ||
    value.marker !== VOID_COUPLED_NATIVE_GAS_LIABILITY_V1 ||
    value.version !== 1 ||
    !SHA256.test(String(value.liability_id ?? "")) ||
    value.lane !== "presale" ||
    !SHA256.test(String(value.obligation_id ?? "")) ||
    !payer ||
    !Number.isSafeInteger(value.nonce) ||
    Number(value.nonce) < 0 ||
    !SHA256.test(
      String(value.transaction_plan_fingerprint_sha256 ?? ""),
    ) ||
    nativeValue === null ||
    gasLimit === null ||
    maxFee === null ||
    value.attempt_limit !== 1 ||
    reserved === null ||
    !SHA256.test(String(value.fee_observation_sha256 ?? "")) ||
    value.source_evidence_kind !== "buy_void_prepared_plan_v1" ||
    !SHA256.test(String(value.source_evidence_id ?? "")) ||
    value.status !== "open"
  ) {
    throw new Error(
      "coupled_native_gas_terminal_cost_liability_invalid",
    );
  }
  const maximum = nativeValue + gasLimit * maxFee;
  if (maximum > UINT256_MAX || maximum !== reserved) {
    throw new Error(
      "coupled_native_gas_terminal_cost_liability_envelope_invalid",
    );
  }
  const body = {
    schema: LIABILITY_SCHEMA,
    marker: VOID_COUPLED_NATIVE_GAS_LIABILITY_V1,
    version: 1,
    lane: "presale",
    obligation_id: String(value.obligation_id),
    payer_address: payer,
    nonce: Number(value.nonce),
    transaction_plan_fingerprint_sha256: String(
      value.transaction_plan_fingerprint_sha256,
    ),
    transaction_native_value_wei: nativeValue.toString(),
    gas_limit: gasLimit.toString(),
    admitted_max_fee_per_gas_wei: maxFee.toString(),
    attempt_limit: 1,
    maximum_reserved_wei: reserved.toString(),
    fee_observation_sha256: String(value.fee_observation_sha256),
    source_evidence_kind: "buy_void_prepared_plan_v1",
    source_evidence_id: String(value.source_evidence_id),
    status: "open",
  };
  if (value.liability_id !== sha256(body)) {
    throw new Error(
      "coupled_native_gas_terminal_cost_liability_identity_mismatch",
    );
  }
  return value as unknown as CoupledNativeGasLiabilityRecordV1;
}

function validateReceiptEvidence(
  raw: unknown,
): BuyVoidPaymentKeyedReceiptEvidenceV1 {
  const value = directObject(
    raw,
    "coupled_native_gas_terminal_cost_receipt_evidence_object_required",
  );
  if (
    value.schema !== RECEIPT_EVIDENCE_SCHEMA ||
    value.marker !== VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_EVIDENCE_V1 ||
    value.version !== 1 ||
    !SAGA_ID.test(String(value.saga_id ?? "")) ||
    !SHA256.test(String(value.attempt_id ?? "")) ||
    !normalizeHash(value.transaction_hash) ||
    (
      value.outcome !== "confirmed" &&
      value.outcome !== "reverted"
    ) ||
    !Number.isSafeInteger(value.recorded_at_ms) ||
    Number(value.recorded_at_ms) <= 0 ||
    !SHA256.test(
      String(value.receipt_policy_fingerprint_sha256 ?? ""),
    ) ||
    !SHA256.test(
      String(value.receipt_evidence_fingerprint_sha256 ?? ""),
    ) ||
    positive(value.receipt_block_number) === null ||
    !normalizeHash(value.receipt_block_hash) ||
    positive(value.observed_confirmation_count) === null ||
    !normalizeAddress(value.fulfillment_wallet_address) ||
    !normalizeAddress(value.fulfillment_contract_address) ||
    !normalizeAddress(value.delivery_address) ||
    positive(value.void_amount_units) === null ||
    !SHA256.test(String(value.evidence_fingerprint_sha256 ?? ""))
  ) {
    throw new Error(
      "coupled_native_gas_terminal_cost_receipt_evidence_invalid",
    );
  }
  return value as unknown as BuyVoidPaymentKeyedReceiptEvidenceV1;
}

function validateRawReceipt(
  raw: unknown,
): CoupledNativeGasRawTerminalReceiptV1 {
  const value = directObject(
    raw,
    "coupled_native_gas_terminal_cost_raw_receipt_object_required",
  );
  const expected = [
    "transactionHash",
    "blockNumber",
    "blockHash",
    "status",
    "gasUsed",
    "effectiveGasPrice",
    "from",
    "to",
  ].sort();
  if (
    Object.keys(value).sort().join("\n") !== expected.join("\n") ||
    !normalizeHash(value.transactionHash) ||
    hexQuantity(value.blockNumber) === null ||
    !normalizeHash(value.blockHash) ||
    (value.status !== "0x0" && value.status !== "0x1") ||
    positive(hexQuantity(value.gasUsed)?.toString()) === null ||
    hexQuantity(value.effectiveGasPrice) === null ||
    !normalizeAddress(value.from) ||
    !normalizeAddress(value.to)
  ) {
    throw new Error(
      "coupled_native_gas_terminal_cost_raw_receipt_invalid",
    );
  }
  return {
    transactionHash: normalizeHash(value.transactionHash),
    blockNumber: String(value.blockNumber).toLowerCase(),
    blockHash: normalizeHash(value.blockHash),
    status: value.status as "0x0" | "0x1",
    gasUsed: String(value.gasUsed).toLowerCase(),
    effectiveGasPrice:
      String(value.effectiveGasPrice).toLowerCase(),
    from: normalizeAddress(value.from),
    to: normalizeAddress(value.to),
  };
}

export function classifyCoupledNativeGasTerminalCostEvidenceV1(input: {
  liability: unknown;
  buy_void_plan: unknown;
  terminal_receipt_evidence: unknown;
  raw_receipt: unknown;
  expected_receipt_policy_fingerprint_sha256: unknown;
}): CoupledNativeGasTerminalCostEvidenceDecisionV1 {
  try {
    const liability = validateLiability(input?.liability);
    const plan = validatePlan(input?.buy_void_plan);
    const evidence = validateReceiptEvidence(
      input?.terminal_receipt_evidence,
    );
    const receipt = validateRawReceipt(input?.raw_receipt);
    const expectedPolicy = String(
      input?.expected_receipt_policy_fingerprint_sha256 ?? "",
    ).toLowerCase();

    if (!SHA256.test(expectedPolicy)) {
      return held(
        "coupled_native_gas_terminal_cost_receipt_policy_fingerprint_invalid",
      );
    }
    if (
      liability.obligation_id !== plan.reservation_id ||
      liability.payer_address !== plan.wallet_address ||
      liability.nonce !== plan.nonce ||
      liability.transaction_plan_fingerprint_sha256 !==
        plan.transaction_plan_fingerprint_sha256 ||
      liability.transaction_native_value_wei !== plan.native_value_wei ||
      liability.gas_limit !== plan.gas_limit ||
      liability.admitted_max_fee_per_gas_wei !==
        plan.max_fee_per_gas_wei ||
      liability.source_evidence_id !==
        plan.transaction_plan_fingerprint_sha256
    ) {
      return held(
        "coupled_native_gas_terminal_cost_plan_liability_binding_mismatch",
      );
    }
    if (
      evidence.saga_id !== plan.saga_id ||
      evidence.attempt_id !== plan.attempt_id ||
      evidence.delivery_address !== plan.delivery_address
    ) {
      return held(
        "coupled_native_gas_terminal_cost_attempt_binding_mismatch",
      );
    }
    if (
      evidence.receipt_policy_fingerprint_sha256 !== expectedPolicy
    ) {
      return held(
        "coupled_native_gas_terminal_cost_receipt_policy_mismatch",
      );
    }

    const transactionHash = normalizeHash(receipt.transactionHash);
    const blockHash = normalizeHash(receipt.blockHash);
    const blockNumber = hexQuantity(receipt.blockNumber)!;
    const gasUsed = hexQuantity(receipt.gasUsed)!;
    const effectiveGasPrice = hexQuantity(
      receipt.effectiveGasPrice,
    )!;
    const receiptOutcome =
      receipt.status === "0x1" ? "confirmed" : "reverted";

    if (
      transactionHash !== evidence.transaction_hash ||
      blockNumber.toString() !== evidence.receipt_block_number ||
      blockHash !== evidence.receipt_block_hash ||
      receiptOutcome !== evidence.outcome
    ) {
      return held(
        "coupled_native_gas_terminal_cost_receipt_identity_mismatch",
      );
    }
    if (
      receipt.from !== liability.payer_address ||
      receipt.to !== evidence.fulfillment_contract_address
    ) {
      return held(
        "coupled_native_gas_terminal_cost_receipt_endpoint_mismatch",
      );
    }

    const gasLimit = BigInt(liability.gas_limit);
    const maxFee = BigInt(
      liability.admitted_max_fee_per_gas_wei,
    );
    if (gasUsed > gasLimit) {
      return held(
        "coupled_native_gas_terminal_cost_gas_used_exceeds_liability",
      );
    }
    if (effectiveGasPrice > maxFee) {
      return held(
        "coupled_native_gas_terminal_cost_effective_gas_price_exceeds_liability",
      );
    }
    const gasCost = gasUsed * effectiveGasPrice;
    if (gasCost > UINT256_MAX) {
      return held(
        "coupled_native_gas_terminal_cost_gas_cost_overflow",
      );
    }

    const nativeValue = BigInt(
      liability.transaction_native_value_wei,
    );
    const nativeValueDebit =
      evidence.outcome === "confirmed" ? nativeValue : 0n;
    const actualPayerDebit = gasCost + nativeValueDebit;
    const maximumReserved = BigInt(liability.maximum_reserved_wei);
    if (
      actualPayerDebit > UINT256_MAX ||
      actualPayerDebit > maximumReserved
    ) {
      return held(
        "coupled_native_gas_terminal_cost_reserved_envelope_exceeded",
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
      saga_id: plan.saga_id,
      attempt_id: plan.attempt_id,
      transaction_hash: transactionHash,
      outcome: evidence.outcome,
      receipt_block_number: blockNumber.toString(),
      receipt_block_hash: blockHash,
      observed_confirmation_count:
        evidence.observed_confirmation_count,
      receipt_policy_fingerprint_sha256: expectedPolicy,
      receipt_evidence_fingerprint_sha256:
        evidence.evidence_fingerprint_sha256,
      gas_used: gasUsed.toString(),
      effective_gas_price_wei: effectiveGasPrice.toString(),
      gas_cost_wei: gasCost.toString(),
      transaction_native_value_debit_wei:
        nativeValueDebit.toString(),
      actual_payer_debit_wei: actualPayerDebit.toString(),
      maximum_reserved_wei: maximumReserved.toString(),
      within_reserved_envelope: true as const,
    };
    return Object.freeze({
      ok: true,
      status: "terminal_cost_verified",
      ...body,
      evidence_id: sha256(body),
      liability_release_authorized: false,
      mutation_performed: false,
      funds_movement_performed: false,
      authority:
        VOID_COUPLED_NATIVE_GAS_TERMINAL_COST_EVIDENCE_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "coupled_native_gas_terminal_cost_evidence_failed",
    );
  }
}
