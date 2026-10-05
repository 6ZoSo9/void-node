import crypto from "node:crypto";

import {
  VOID_BUY_VOID_BROADCAST_OUTCOME_JOURNAL_V1,
  type BuyVoidBroadcastConfirmedRecordV1,
  type BuyVoidBroadcastRevertedRecordV1,
} from "./buy_void_broadcast_outcome_journal_v1.js";
import {
  VOID_BUY_VOID_FULFILLMENT_CONFIRMATION_V1,
  type BuyVoidConfirmedFulfillmentRecordV1,
} from "./buy_void_fulfillment_confirmation_v1.js";
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
    durable_native_terminal_outcome_required: true,
    confirmed_delivery_fingerprint_rederived: true,
    confirmed_outcome_fingerprint_rederived: true,
    reverted_outcome_arithmetic_rederived: true,
    fresh_raw_receipt_required: true,
    fresh_confirmation_depth_required: true,
    exact_transaction_block_binding_required: true,
    exact_receipt_sender_delivery_binding_required: true,
    confirmed_and_reverted_supported: true,
    gas_used_ceiling_required: true,
    exact_gas_used_binding_required: true,
    effective_gas_price_ceiling_required: true,
    exact_integer_gas_cost: true,
    confirmed_native_value_consumption_bound: true,
    reverted_native_value_consumption_zero: true,
    reserved_envelope_ceiling_required: true,
    terminal_outcome_storage_read: false,
    raw_receipt_transport_verified: false,
    current_block_transport_verified: false,
    minimum_confirmation_policy_trusted: false,
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
const EVIDENCE_SCHEMA =
  "void_coupled_native_gas_terminal_cost_evidence_v1";
const CONFIRMED_OUTCOME_SCHEMA =
  "void_buy_void_broadcast_confirmed_record_v1";
const REVERTED_OUTCOME_SCHEMA =
  "void_buy_void_broadcast_reverted_record_v1";
const CONFIRMED_RECORD_SCHEMA =
  "void_buy_void_confirmed_fulfillment_record_v1";

const SHA256 = /^[0-9a-f]{64}$/u;
const HASH = /^0x[0-9a-f]{64}$/u;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/u;
const PAYMENT_ID =
  /^voidpay1:(base|ethereum):0x[0-9a-f]{64}:(0|[1-9][0-9]*)$/u;
const DECIMAL = /^(0|[1-9][0-9]*)$/u;
const HEX_QUANTITY = /^0x(?:0|[1-9a-f][0-9a-f]*)$/u;
const UINT256_MAX = (1n << 256n) - 1n;
const MAX_CONFIRMATIONS = 1000n;
const NATIVE_VALUE_MULTIPLIER = 1_000_000_000_000n;

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

export type CoupledNativeGasTerminalOutcomeV1 =
  | BuyVoidBroadcastConfirmedRecordV1
  | BuyVoidBroadcastRevertedRecordV1;

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
  terminal_record_fingerprint_sha256: string;
  terminal_recorded_at_ms: number;
  receipt_block_number: string;
  receipt_block_hash: string;
  current_block_number: string;
  observed_confirmation_count: string;
  required_min_confirmations: string;
  gas_used: string;
  effective_gas_price_wei: string;
  gas_cost_wei: string;
  transaction_native_value_consumed_wei: string;
  liability_consumed_wei: string;
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

function sha256Canonical(value: unknown): string {
  return crypto
    .createHash("sha256")
    .update(canonical(value), "utf8")
    .digest("hex");
}

function sha256Text(value: string): string {
  return crypto
    .createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

function stableFingerprint(parts: Record<string, string>): string {
  return sha256Text(
    Object.keys(parts)
      .sort()
      .map((key) => key + "=" + parts[key])
      .join("\n"),
  );
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

function hexQuantity(value: unknown): bigint | null {
  const raw = String(value ?? "").trim().toLowerCase();
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
  exactKeys(
    value,
    [
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
    ],
    "coupled_native_gas_terminal_cost_plan_keys_invalid",
  );
  const wallet = normalizeAddress(value.wallet_address);
  const delivery = normalizeAddress(value.delivery_address);
  const reservedAt = Number(value.reserved_at_ms);
  const nonce = Number(value.nonce);
  const nativeValue = positive(value.native_value_wei);
  const gasLimit = positive(value.gas_limit);
  const maxFee = positive(value.max_fee_per_gas_wei);
  const priorityFee = decimal(value.max_priority_fee_per_gas_wei);
  if (
    value.schema !== PLAN_SCHEMA ||
    value.marker !==
      VOID_BUY_VOID_PREPARED_TRANSACTION_PLAN_RESERVATION_V1 ||
    value.version !== 1 ||
    !SHA256.test(String(value.reservation_id ?? "")) ||
    !Number.isSafeInteger(reservedAt) ||
    reservedAt <= 0 ||
    !SAGA_ID.test(String(value.saga_id ?? "")) ||
    !SHA256.test(String(value.attempt_id ?? "")) ||
    value.chain_id !== "2050" ||
    !wallet ||
    !SHA256.test(String(value.wallet_key_sha256 ?? "")) ||
    !Number.isSafeInteger(nonce) ||
    nonce < 0 ||
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
    throw new Error(
      "coupled_native_gas_terminal_cost_plan_invalid",
    );
  }

  const walletKey = sha256Text(
    "void-buy-wallet-v1\n2050\n" + wallet,
  );
  if (value.wallet_key_sha256 !== walletKey) {
    throw new Error(
      "coupled_native_gas_terminal_cost_wallet_key_mismatch",
    );
  }
  const template = sha256Canonical({
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
      "coupled_native_gas_terminal_cost_template_fingerprint_mismatch",
    );
  }
  const planFingerprint = sha256Canonical({
    transaction_template_fingerprint_sha256: template,
    nonce,
  });
  if (
    value.transaction_plan_fingerprint_sha256 !== planFingerprint
  ) {
    throw new Error(
      "coupled_native_gas_terminal_cost_plan_fingerprint_mismatch",
    );
  }
  const reservationId = sha256Text(
    [
      "void-buy-prepared-transaction-plan-reservation-v1",
      walletKey,
      String(nonce),
      String(value.attempt_id),
      planFingerprint,
    ].join("\n"),
  );
  if (value.reservation_id !== reservationId) {
    throw new Error(
      "coupled_native_gas_terminal_cost_reservation_id_mismatch",
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
  exactKeys(
    value,
    [
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
    ],
    "coupled_native_gas_terminal_cost_liability_keys_invalid",
  );
  const payer = normalizeAddress(value.payer_address);
  const nonce = Number(value.nonce);
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
    !Number.isSafeInteger(nonce) ||
    nonce < 0 ||
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
    nonce,
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
  if (value.liability_id !== sha256Canonical(body)) {
    throw new Error(
      "coupled_native_gas_terminal_cost_liability_identity_mismatch",
    );
  }
  return value as unknown as CoupledNativeGasLiabilityRecordV1;
}

function validateConfirmedRecord(
  raw: unknown,
): BuyVoidConfirmedFulfillmentRecordV1 {
  const value = directObject(
    raw,
    "coupled_native_gas_terminal_cost_confirmed_record_object_required",
  );
  exactKeys(
    value,
    [
      "schema",
      "marker",
      "status",
      "canonical_payment_identity",
      "canonical_payment_identity_sha256",
      "request_id",
      "instruction_id",
      "source_payment_chain",
      "payment_transaction_hash",
      "payment_log_index",
      "delivery_chain_id",
      "void_delivery_tx_hash",
      "delivery_block_number",
      "delivery_block_hash",
      "delivery_confirmation_count",
      "fulfillment_wallet",
      "delivery_address",
      "void_amount_units",
      "delivery_binding_fingerprint",
      "buyer_fulfilled",
      "automatic_fulfillment_completed",
      "payment_claim_persisted",
      "delivery_confirmation_observed",
      "signing_authorized_by_this_module",
      "transaction_broadcast_authorized_by_this_module",
      "money_movement_authorized_by_this_module",
    ],
    "coupled_native_gas_terminal_cost_confirmed_record_keys_invalid",
  );
  const identity = String(value.canonical_payment_identity ?? "");
  const deliveryTx = normalizeHash(value.void_delivery_tx_hash);
  const paymentTx = normalizeHash(value.payment_transaction_hash);
  const blockNumber = positive(value.delivery_block_number);
  const blockHash = normalizeHash(value.delivery_block_hash);
  const confirmations = positive(value.delivery_confirmation_count);
  const wallet = normalizeAddress(value.fulfillment_wallet);
  const delivery = normalizeAddress(value.delivery_address);
  const amount = positive(value.void_amount_units);
  if (
    value.schema !== CONFIRMED_RECORD_SCHEMA ||
    value.marker !== VOID_BUY_VOID_FULFILLMENT_CONFIRMATION_V1 ||
    value.status !== "fulfilled_confirmed" ||
    !PAYMENT_ID.test(identity) ||
    value.canonical_payment_identity_sha256 !== sha256Text(identity) ||
    !String(value.request_id ?? "").trim() ||
    !String(value.instruction_id ?? "").trim() ||
    !["base", "ethereum"].includes(
      String(value.source_payment_chain ?? "").toLowerCase(),
    ) ||
    !paymentTx ||
    !DECIMAL.test(String(value.payment_log_index ?? "")) ||
    value.delivery_chain_id !== "2050" ||
    !deliveryTx ||
    deliveryTx === paymentTx ||
    blockNumber === null ||
    !blockHash ||
    confirmations === null ||
    !wallet ||
    !delivery ||
    amount === null ||
    !SHA256.test(String(value.delivery_binding_fingerprint ?? "")) ||
    value.buyer_fulfilled !== true ||
    value.automatic_fulfillment_completed !== true ||
    value.payment_claim_persisted !== true ||
    value.delivery_confirmation_observed !== true ||
    value.signing_authorized_by_this_module !== false ||
    value.transaction_broadcast_authorized_by_this_module !== false ||
    value.money_movement_authorized_by_this_module !== false
  ) {
    throw new Error(
      "coupled_native_gas_terminal_cost_confirmed_record_invalid",
    );
  }
  const binding = stableFingerprint({
    canonical_payment_identity: identity,
    request_id: String(value.request_id),
    instruction_id: String(value.instruction_id),
    delivery_chain_id: "2050",
    void_delivery_tx_hash: deliveryTx,
    delivery_block_number: blockNumber.toString(),
    delivery_block_hash: blockHash,
    fulfillment_wallet: wallet,
    delivery_address: delivery,
    void_amount_units: amount.toString(),
  });
  if (value.delivery_binding_fingerprint !== binding) {
    throw new Error(
      "coupled_native_gas_terminal_cost_delivery_binding_fingerprint_mismatch",
    );
  }
  return value as unknown as BuyVoidConfirmedFulfillmentRecordV1;
}

function validateTerminalOutcome(
  raw: unknown,
):
  | {
      kind: "confirmed";
      record: BuyVoidBroadcastConfirmedRecordV1;
      confirmed: BuyVoidConfirmedFulfillmentRecordV1;
      block_number: bigint;
      block_hash: string;
      recorded_confirmations: bigint;
      terminal_fingerprint: string;
    }
  | {
      kind: "reverted";
      record: BuyVoidBroadcastRevertedRecordV1;
      block_number: bigint;
      block_hash: null;
      recorded_confirmations: bigint;
      terminal_fingerprint: string;
    } {
  const value = directObject(
    raw,
    "coupled_native_gas_terminal_cost_terminal_outcome_object_required",
  );

  if (value.schema === CONFIRMED_OUTCOME_SCHEMA) {
    exactKeys(
      value,
      [
        "schema",
        "marker",
        "attempt_id",
        "recorded_at_ms",
        "void_delivery_tx_hash",
        "confirmation_fingerprint",
        "confirmed_record",
        "definitive_confirmation",
        "reconciliation_required",
        "retry_allowed",
        "transaction_broadcast_performed_by_this_module",
      ],
      "coupled_native_gas_terminal_cost_confirmed_outcome_keys_invalid",
    );
    const attemptId = String(value.attempt_id ?? "");
    const txHash = normalizeHash(value.void_delivery_tx_hash);
    const recordedAt = Number(value.recorded_at_ms);
    const confirmed = validateConfirmedRecord(value.confirmed_record);
    if (
      value.marker !== VOID_BUY_VOID_BROADCAST_OUTCOME_JOURNAL_V1 ||
      !SHA256.test(attemptId) ||
      !Number.isSafeInteger(recordedAt) ||
      recordedAt <= 0 ||
      !txHash ||
      confirmed.void_delivery_tx_hash !== txHash ||
      !SHA256.test(String(value.confirmation_fingerprint ?? "")) ||
      value.definitive_confirmation !== true ||
      value.reconciliation_required !== false ||
      value.retry_allowed !== false ||
      value.transaction_broadcast_performed_by_this_module !== false
    ) {
      throw new Error(
        "coupled_native_gas_terminal_cost_confirmed_outcome_invalid",
      );
    }
    const confirmationFingerprint = stableFingerprint({
      marker: String(confirmed.marker),
      canonical_payment_identity:
        confirmed.canonical_payment_identity,
      request_id: confirmed.request_id,
      instruction_id: confirmed.instruction_id,
      void_delivery_tx_hash: txHash,
      delivery_block_hash: String(confirmed.delivery_block_hash),
      fulfillment_wallet: confirmed.fulfillment_wallet,
      delivery_address: confirmed.delivery_address,
      void_amount_units: confirmed.void_amount_units,
      delivery_block_number: confirmed.delivery_block_number,
      delivery_binding_fingerprint:
        confirmed.delivery_binding_fingerprint,
    });
    if (value.confirmation_fingerprint !== confirmationFingerprint) {
      throw new Error(
        "coupled_native_gas_terminal_cost_confirmation_fingerprint_mismatch",
      );
    }
    return {
      kind: "confirmed",
      record: value as unknown as BuyVoidBroadcastConfirmedRecordV1,
      confirmed,
      block_number: BigInt(confirmed.delivery_block_number),
      block_hash: String(confirmed.delivery_block_hash),
      recorded_confirmations:
        BigInt(confirmed.delivery_confirmation_count),
      terminal_fingerprint: sha256Canonical(value),
    };
  }

  if (value.schema === REVERTED_OUTCOME_SCHEMA) {
    exactKeys(
      value,
      [
        "schema",
        "marker",
        "attempt_id",
        "recorded_at_ms",
        "chain_id",
        "void_delivery_tx_hash",
        "transaction_status",
        "block_number",
        "current_block_number",
        "confirmation_count",
        "min_revert_confirmations",
        "definitive_revert",
        "reconciliation_required",
        "retry_allowed",
        "transaction_broadcast_performed_by_this_module",
      ],
      "coupled_native_gas_terminal_cost_reverted_outcome_keys_invalid",
    );
    const attemptId = String(value.attempt_id ?? "");
    const txHash = normalizeHash(value.void_delivery_tx_hash);
    const recordedAt = Number(value.recorded_at_ms);
    const block = positive(value.block_number);
    const current = positive(value.current_block_number);
    const confirmations = positive(value.confirmation_count);
    const minimum = Number(value.min_revert_confirmations);
    if (
      value.marker !== VOID_BUY_VOID_BROADCAST_OUTCOME_JOURNAL_V1 ||
      !SHA256.test(attemptId) ||
      !Number.isSafeInteger(recordedAt) ||
      recordedAt <= 0 ||
      value.chain_id !== "2050" ||
      !txHash ||
      value.transaction_status !== 0 ||
      block === null ||
      current === null ||
      current < block ||
      confirmations === null ||
      confirmations !== current - block + 1n ||
      !Number.isSafeInteger(minimum) ||
      minimum <= 0 ||
      minimum > Number(MAX_CONFIRMATIONS) ||
      confirmations < BigInt(minimum) ||
      value.definitive_revert !== true ||
      value.reconciliation_required !== false ||
      value.retry_allowed !== true ||
      value.transaction_broadcast_performed_by_this_module !== false
    ) {
      throw new Error(
        "coupled_native_gas_terminal_cost_reverted_outcome_invalid",
      );
    }
    return {
      kind: "reverted",
      record: value as unknown as BuyVoidBroadcastRevertedRecordV1,
      block_number: block,
      block_hash: null,
      recorded_confirmations: confirmations,
      terminal_fingerprint: sha256Canonical(value),
    };
  }

  throw new Error(
    "coupled_native_gas_terminal_cost_terminal_outcome_invalid",
  );
}

function validateRawReceipt(
  raw: unknown,
): CoupledNativeGasRawTerminalReceiptV1 {
  const value = directObject(
    raw,
    "coupled_native_gas_terminal_cost_raw_receipt_object_required",
  );
  exactKeys(
    value,
    [
      "transactionHash",
      "blockNumber",
      "blockHash",
      "status",
      "gasUsed",
      "effectiveGasPrice",
      "from",
      "to",
    ],
    "coupled_native_gas_terminal_cost_raw_receipt_keys_invalid",
  );
  if (
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
  terminal_outcome: unknown;
  raw_receipt: unknown;
  current_block_number: unknown;
  required_min_confirmations: unknown;
}): CoupledNativeGasTerminalCostEvidenceDecisionV1 {
  try {
    const liability = validateLiability(input?.liability);
    const plan = validatePlan(input?.buy_void_plan);
    const terminal = validateTerminalOutcome(input?.terminal_outcome);
    const receipt = validateRawReceipt(input?.raw_receipt);
    const currentBlock = hexQuantity(input?.current_block_number);
    const requiredMin = positive(input?.required_min_confirmations);

    if (
      currentBlock === null ||
      requiredMin === null ||
      requiredMin > MAX_CONFIRMATIONS
    ) {
      return held(
        "coupled_native_gas_terminal_cost_confirmation_policy_invalid",
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

    if (terminal.record.attempt_id !== plan.attempt_id) {
      return held(
        "coupled_native_gas_terminal_cost_attempt_binding_mismatch",
      );
    }
    if (terminal.kind === "confirmed") {
      const confirmedUnits = positive(
        terminal.confirmed.void_amount_units,
      );
      const expectedNativeValue =
        confirmedUnits === null
          ? null
          : confirmedUnits * NATIVE_VALUE_MULTIPLIER;
      if (
        terminal.confirmed.fulfillment_wallet !== plan.wallet_address ||
        terminal.confirmed.delivery_address !== plan.delivery_address ||
        expectedNativeValue === null ||
        expectedNativeValue > UINT256_MAX ||
        expectedNativeValue.toString() !== plan.native_value_wei
      ) {
        return held(
          "coupled_native_gas_terminal_cost_confirmed_plan_binding_mismatch",
        );
      }
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
    const terminalTx = normalizeHash(
      terminal.record.void_delivery_tx_hash,
    );

    if (
      transactionHash !== terminalTx ||
      blockNumber !== terminal.block_number ||
      receiptOutcome !== terminal.kind
    ) {
      return held(
        "coupled_native_gas_terminal_cost_receipt_identity_mismatch",
      );
    }
    if (
      terminal.kind === "confirmed" &&
      blockHash !== terminal.block_hash
    ) {
      return held(
        "coupled_native_gas_terminal_cost_confirmed_block_hash_mismatch",
      );
    }
    if (
      receipt.from !== liability.payer_address ||
      receipt.to !== plan.delivery_address
    ) {
      return held(
        "coupled_native_gas_terminal_cost_receipt_endpoint_mismatch",
      );
    }

    if (currentBlock < blockNumber) {
      return held(
        "coupled_native_gas_terminal_cost_current_block_precedes_receipt",
      );
    }
    const confirmations = currentBlock - blockNumber + 1n;
    if (
      confirmations < requiredMin ||
      confirmations < terminal.recorded_confirmations
    ) {
      return held(
        "coupled_native_gas_terminal_cost_confirmations_insufficient",
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
    if (gasUsed !== gasLimit) {
      return held(
        "coupled_native_gas_terminal_cost_gas_used_mismatch",
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
    const nativeValueConsumed =
      terminal.kind === "confirmed" ? nativeValue : 0n;
    const liabilityConsumed = gasCost + nativeValueConsumed;
    const maximumReserved = BigInt(liability.maximum_reserved_wei);
    if (
      liabilityConsumed > UINT256_MAX ||
      liabilityConsumed > maximumReserved
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
      outcome: terminal.kind,
      terminal_record_fingerprint_sha256:
        terminal.terminal_fingerprint,
      terminal_recorded_at_ms: terminal.record.recorded_at_ms,
      receipt_block_number: blockNumber.toString(),
      receipt_block_hash: blockHash,
      current_block_number: currentBlock.toString(),
      observed_confirmation_count: confirmations.toString(),
      required_min_confirmations: requiredMin.toString(),
      gas_used: gasUsed.toString(),
      effective_gas_price_wei: effectiveGasPrice.toString(),
      gas_cost_wei: gasCost.toString(),
      transaction_native_value_consumed_wei:
        nativeValueConsumed.toString(),
      liability_consumed_wei: liabilityConsumed.toString(),
      maximum_reserved_wei: maximumReserved.toString(),
      within_reserved_envelope: true as const,
    } as const;
    return Object.freeze({
      ok: true,
      status: "terminal_cost_verified",
      ...body,
      evidence_id: sha256Canonical(body),
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
