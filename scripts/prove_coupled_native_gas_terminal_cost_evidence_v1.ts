#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  VOID_BUY_VOID_BROADCAST_OUTCOME_JOURNAL_V1,
  type BuyVoidBroadcastConfirmedRecordV1,
  type BuyVoidBroadcastRevertedRecordV1,
} from "../src/economic/buy_void_broadcast_outcome_journal_v1.js";
import {
  VOID_BUY_VOID_FULFILLMENT_CONFIRMATION_V1,
  type BuyVoidConfirmedFulfillmentRecordV1,
} from "../src/economic/buy_void_fulfillment_confirmation_v1.js";
import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_PLAN_RESERVATION_V1,
  type BuyVoidPreparedTransactionPlanReservationV1,
} from "../src/economic/buy_void_prepared_transaction_plan_reservation_v1.js";
import {
  buildCoupledNativeGasPayerObservationV1,
  classifyCoupledNativeGasBuyVoidAdmissionV1,
  type CoupledNativeGasLiabilityRecordV1,
} from "../src/economic/coupled_native_gas_liability_v1.js";
import {
  VOID_COUPLED_NATIVE_GAS_TERMINAL_COST_EVIDENCE_AUTHORITY_V1,
  VOID_COUPLED_NATIVE_GAS_TERMINAL_COST_EVIDENCE_V1,
  classifyCoupledNativeGasTerminalCostEvidenceV1,
  type CoupledNativeGasRawTerminalReceiptV1,
  type CoupledNativeGasTerminalCostEvidenceDecisionV1,
  type CoupledNativeGasTerminalOutcomeV1,
} from "../src/economic/coupled_native_gas_terminal_cost_evidence_v1.js";

const wallet = "0x" + "1".repeat(40);
const delivery = "0x" + "3".repeat(40);
const deliveryTx = "0x" + "6".repeat(64);
const deliveryBlockHash = "0x" + "7".repeat(64);
const revertedBlockHash = "0x" + "8".repeat(64);
const paymentTx = "0x" + "9".repeat(64);

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
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function stableFingerprint(parts: Record<string, string>): string {
  return sha256Text(
    Object.keys(parts)
      .sort()
      .map((key) => key + "=" + parts[key])
      .join("\n"),
  );
}

function makePlan(input: {
  attempt?: string;
  nonce?: number;
  gas_limit?: string;
  max_fee_per_gas_wei?: string;
  native_value_wei?: string;
} = {}): BuyVoidPreparedTransactionPlanReservationV1 {
  const attempt = input.attempt ?? "a".repeat(64);
  const nonce = input.nonce ?? 7;
  const gas = input.gas_limit ?? "21000";
  const maxFee = input.max_fee_per_gas_wei ?? "10";
  const nativeValue = input.native_value_wei ?? "1";
  const priority = "1";
  const saga = "voidbvfsg1_" + "b".repeat(64);
  const economic = "c".repeat(64);
  const preparation = "d".repeat(64);
  const walletKey = sha256Text(
    "void-buy-wallet-v1\n2050\n" + wallet,
  );
  const template = sha256Canonical({
    saga_id: saga,
    attempt_id: attempt,
    chain_id: "2050",
    wallet_address: wallet,
    delivery_address: delivery,
    native_value_wei: nativeValue,
    gas_limit: gas,
    max_fee_per_gas_wei: maxFee,
    max_priority_fee_per_gas_wei: priority,
    economic_policy_fingerprint_sha256: economic,
    preparation_policy_fingerprint_sha256: preparation,
  });
  const planFingerprint = sha256Canonical({
    transaction_template_fingerprint_sha256: template,
    nonce,
  });
  const reservationId = sha256Text(
    [
      "void-buy-prepared-transaction-plan-reservation-v1",
      walletKey,
      String(nonce),
      attempt,
      planFingerprint,
    ].join("\n"),
  );
  return {
    schema: "void_buy_void_prepared_transaction_plan_reservation_v1",
    marker: VOID_BUY_VOID_PREPARED_TRANSACTION_PLAN_RESERVATION_V1,
    version: 1,
    reservation_id: reservationId,
    reserved_at_ms: 1_800_000_000_000,
    saga_id: saga,
    attempt_id: attempt,
    chain_id: "2050",
    wallet_address: wallet,
    wallet_key_sha256: walletKey,
    nonce,
    delivery_address: delivery,
    native_value_wei: nativeValue,
    gas_limit: gas,
    max_fee_per_gas_wei: maxFee,
    max_priority_fee_per_gas_wei: priority,
    economic_policy_fingerprint_sha256: economic,
    preparation_policy_fingerprint_sha256: preparation,
    transaction_template_fingerprint_sha256: template,
    transaction_plan_fingerprint_sha256: planFingerprint,
    reservation_status: "reserved",
    nonce_release_authorized: false,
    credential_access_authorized: false,
    wallet_access_authorized: false,
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    raw_signed_transaction_persisted: false,
    money_movement_authorized: false,
  };
}

function liabilityFor(
  plan: BuyVoidPreparedTransactionPlanReservationV1,
): CoupledNativeGasLiabilityRecordV1 {
  const observation = buildCoupledNativeGasPayerObservationV1({
    payer_address: wallet,
    observed_native_balance_wei: "1000000",
    required_max_fee_per_gas_wei: "9",
    observed_at_ms: 1000,
    expires_at_ms: 2000,
    source_identity_sha256: "e".repeat(64),
  });
  const decision = classifyCoupledNativeGasBuyVoidAdmissionV1({
    now_ms: 1500,
    buy_void_plan: plan,
    payer_observation: observation,
    open_liabilities: [],
  });
  if (decision.ok !== true) throw new Error(decision.reason);
  assert.equal(decision.status, "admitted");
  return decision.liability;
}

function makeConfirmedFulfillmentRecord(
  plan: BuyVoidPreparedTransactionPlanReservationV1,
  input: {
    amount?: string;
    wallet_address?: string;
    delivery_address?: string;
    block_hash?: string;
    block_number?: string;
    confirmations?: string;
  } = {},
): BuyVoidConfirmedFulfillmentRecordV1 {
  const identity =
    "voidpay1:base:0x" + "f".repeat(64) + ":7";
  const amount = input.amount ?? plan.native_value_wei;
  const fulfillmentWallet = input.wallet_address ?? plan.wallet_address;
  const deliveryAddress =
    input.delivery_address ?? plan.delivery_address;
  const blockHash = input.block_hash ?? deliveryBlockHash;
  const blockNumber = input.block_number ?? "100";
  const confirmations = input.confirmations ?? "3";
  const requestId = "buyvoid_a_aaaaaaaa";
  const instructionId = "voidfill1_" + "1".repeat(32);
  const deliveryBinding = stableFingerprint({
    canonical_payment_identity: identity,
    request_id: requestId,
    instruction_id: instructionId,
    delivery_chain_id: "2050",
    void_delivery_tx_hash: deliveryTx,
    delivery_block_number: blockNumber,
    delivery_block_hash: blockHash,
    fulfillment_wallet: fulfillmentWallet,
    delivery_address: deliveryAddress,
    void_amount_units: amount,
  });
  return {
    schema: "void_buy_void_confirmed_fulfillment_record_v1",
    marker: VOID_BUY_VOID_FULFILLMENT_CONFIRMATION_V1,
    status: "fulfilled_confirmed",
    canonical_payment_identity: identity,
    canonical_payment_identity_sha256: sha256Text(identity),
    request_id: requestId,
    instruction_id: instructionId,
    source_payment_chain: "base",
    payment_transaction_hash: paymentTx,
    payment_log_index: "7",
    delivery_chain_id: "2050",
    void_delivery_tx_hash: deliveryTx,
    delivery_block_number: blockNumber,
    delivery_block_hash: blockHash,
    delivery_confirmation_count: confirmations,
    fulfillment_wallet: fulfillmentWallet,
    delivery_address: deliveryAddress,
    void_amount_units: amount,
    delivery_binding_fingerprint: deliveryBinding,
    buyer_fulfilled: true,
    automatic_fulfillment_completed: true,
    payment_claim_persisted: true,
    delivery_confirmation_observed: true,
    signing_authorized_by_this_module: false,
    transaction_broadcast_authorized_by_this_module: false,
    money_movement_authorized_by_this_module: false,
  };
}

function confirmedFingerprint(
  record: BuyVoidConfirmedFulfillmentRecordV1,
): string {
  return stableFingerprint({
    marker: record.marker,
    canonical_payment_identity: record.canonical_payment_identity,
    request_id: record.request_id,
    instruction_id: record.instruction_id,
    void_delivery_tx_hash: record.void_delivery_tx_hash,
    delivery_block_hash: String(record.delivery_block_hash),
    fulfillment_wallet: record.fulfillment_wallet,
    delivery_address: record.delivery_address,
    void_amount_units: record.void_amount_units,
    delivery_block_number: record.delivery_block_number,
    delivery_binding_fingerprint: record.delivery_binding_fingerprint,
  });
}

function makeConfirmedOutcome(
  plan: BuyVoidPreparedTransactionPlanReservationV1,
  confirmed = makeConfirmedFulfillmentRecord(plan),
): BuyVoidBroadcastConfirmedRecordV1 {
  return {
    schema: "void_buy_void_broadcast_confirmed_record_v1",
    marker: VOID_BUY_VOID_BROADCAST_OUTCOME_JOURNAL_V1,
    attempt_id: plan.attempt_id,
    recorded_at_ms: 1_800_000_001_000,
    void_delivery_tx_hash: deliveryTx,
    confirmation_fingerprint: confirmedFingerprint(confirmed),
    confirmed_record: confirmed,
    definitive_confirmation: true,
    reconciliation_required: false,
    retry_allowed: false,
    transaction_broadcast_performed_by_this_module: false,
  };
}

function makeRevertedOutcome(
  plan: BuyVoidPreparedTransactionPlanReservationV1,
  input: {
    block_number?: string;
    current_block_number?: string;
    confirmation_count?: string;
    min_revert_confirmations?: number;
  } = {},
): BuyVoidBroadcastRevertedRecordV1 {
  return {
    schema: "void_buy_void_broadcast_reverted_record_v1",
    marker: VOID_BUY_VOID_BROADCAST_OUTCOME_JOURNAL_V1,
    attempt_id: plan.attempt_id,
    recorded_at_ms: 1_800_000_001_000,
    chain_id: "2050",
    void_delivery_tx_hash: deliveryTx,
    transaction_status: 0,
    block_number: input.block_number ?? "100",
    current_block_number: input.current_block_number ?? "102",
    confirmation_count: input.confirmation_count ?? "3",
    min_revert_confirmations:
      input.min_revert_confirmations ?? 2,
    definitive_revert: true,
    reconciliation_required: false,
    retry_allowed: true,
    transaction_broadcast_performed_by_this_module: false,
  };
}

function makeReceipt(
  outcome: "confirmed" | "reverted",
  input: Partial<CoupledNativeGasRawTerminalReceiptV1> = {},
): CoupledNativeGasRawTerminalReceiptV1 {
  return {
    transactionHash: deliveryTx,
    blockNumber: "0x64",
    blockHash:
      outcome === "confirmed"
        ? deliveryBlockHash
        : revertedBlockHash,
    status: outcome === "confirmed" ? "0x1" : "0x0",
    gasUsed: "0x5208",
    effectiveGasPrice: "0x5",
    from: wallet,
    to: delivery,
    ...input,
  };
}

function classify(input: {
  plan?: BuyVoidPreparedTransactionPlanReservationV1;
  liability?: CoupledNativeGasLiabilityRecordV1;
  outcome?: "confirmed" | "reverted";
  terminal?: CoupledNativeGasTerminalOutcomeV1;
  receipt?: CoupledNativeGasRawTerminalReceiptV1 | Record<string, unknown>;
  current_block_number?: string;
  required_min_confirmations?: string;
} = {}): CoupledNativeGasTerminalCostEvidenceDecisionV1 {
  const plan = input.plan ?? makePlan();
  const outcome = input.outcome ?? "confirmed";
  return classifyCoupledNativeGasTerminalCostEvidenceV1({
    liability: input.liability ?? liabilityFor(plan),
    buy_void_plan: plan,
    terminal_outcome:
      input.terminal ??
      (
        outcome === "confirmed"
          ? makeConfirmedOutcome(plan)
          : makeRevertedOutcome(plan)
      ),
    raw_receipt: input.receipt ?? makeReceipt(outcome),
    current_block_number:
      input.current_block_number ?? "0x66",
    required_min_confirmations:
      input.required_min_confirmations ?? "2",
  });
}

function requireOk(
  value: CoupledNativeGasTerminalCostEvidenceDecisionV1,
) {
  if (value.ok !== true) throw new Error(value.reason);
  return value;
}

function requireHeld(
  value: CoupledNativeGasTerminalCostEvidenceDecisionV1,
  reason: string,
): void {
  if (value.ok !== false) {
    throw new Error("expected terminal gas cost HOLD");
  }
  assert.equal(value.reason, reason);
  assert.equal(value.liability_release_authorized, false);
  assert.equal(value.mutation_performed, false);
  assert.equal(value.funds_movement_performed, false);
}

const confirmed = requireOk(classify());
assert.equal(confirmed.status, "terminal_cost_verified");
assert.equal(confirmed.outcome, "confirmed");
assert.equal(confirmed.gas_used, "21000");
assert.equal(confirmed.effective_gas_price_wei, "5");
assert.equal(confirmed.gas_cost_wei, "105000");
assert.equal(
  confirmed.transaction_native_value_consumed_wei,
  "1",
);
assert.equal(confirmed.liability_consumed_wei, "105001");
assert.equal(confirmed.maximum_reserved_wei, "210001");
assert.equal(confirmed.observed_confirmation_count, "3");
assert.equal(confirmed.within_reserved_envelope, true);
assert.equal(confirmed.liability_release_authorized, false);
assert.equal(confirmed.mutation_performed, false);
assert.equal(confirmed.funds_movement_performed, false);

const reverted = requireOk(classify({ outcome: "reverted" }));
assert.equal(reverted.outcome, "reverted");
assert.equal(reverted.gas_cost_wei, "105000");
assert.equal(
  reverted.transaction_native_value_consumed_wei,
  "0",
);
assert.equal(reverted.liability_consumed_wei, "105000");
assert.notEqual(reverted.evidence_id, confirmed.evidence_id);

const freeGas = requireOk(
  classify({
    receipt: makeReceipt("confirmed", {
      effectiveGasPrice: "0x0",
    }),
  }),
);
assert.equal(freeGas.gas_cost_wei, "0");
assert.equal(freeGas.liability_consumed_wei, "1");

requireHeld(
  classify({
    receipt: makeReceipt("confirmed", {
      gasUsed: "0x5209",
    }),
  }),
  "coupled_native_gas_terminal_cost_gas_used_exceeds_liability",
);

requireHeld(
  classify({
    receipt: makeReceipt("confirmed", {
      effectiveGasPrice: "0xb",
    }),
  }),
  "coupled_native_gas_terminal_cost_effective_gas_price_exceeds_liability",
);

requireHeld(
  classify({
    receipt: makeReceipt("confirmed", {
      transactionHash: "0x" + "2".repeat(64),
    }),
  }),
  "coupled_native_gas_terminal_cost_receipt_identity_mismatch",
);

requireHeld(
  classify({
    receipt: makeReceipt("confirmed", {
      blockNumber: "0x65",
    }),
  }),
  "coupled_native_gas_terminal_cost_receipt_identity_mismatch",
);

requireHeld(
  classify({
    receipt: makeReceipt("confirmed", {
      blockHash: "0x" + "2".repeat(64),
    }),
  }),
  "coupled_native_gas_terminal_cost_confirmed_block_hash_mismatch",
);

requireHeld(
  classify({
    receipt: makeReceipt("confirmed", {
      status: "0x0",
    }),
  }),
  "coupled_native_gas_terminal_cost_receipt_identity_mismatch",
);

requireHeld(
  classify({
    receipt: makeReceipt("confirmed", {
      from: "0x" + "2".repeat(40),
    }),
  }),
  "coupled_native_gas_terminal_cost_receipt_endpoint_mismatch",
);

requireHeld(
  classify({
    receipt: makeReceipt("confirmed", {
      to: "0x" + "2".repeat(40),
    }),
  }),
  "coupled_native_gas_terminal_cost_receipt_endpoint_mismatch",
);

requireHeld(
  classify({ current_block_number: "0x63" }),
  "coupled_native_gas_terminal_cost_current_block_precedes_receipt",
);

requireHeld(
  classify({
    current_block_number: "0x64",
    required_min_confirmations: "2",
  }),
  "coupled_native_gas_terminal_cost_confirmations_insufficient",
);

requireHeld(
  classify({
    required_min_confirmations: "1001",
  }),
  "coupled_native_gas_terminal_cost_confirmation_policy_invalid",
);

{
  const plan = makePlan();
  const liability = liabilityFor(plan);
  const changedPlan = makePlan({
    attempt: "2".repeat(64),
    nonce: plan.nonce + 1,
  });
  requireHeld(
    classify({
      plan: changedPlan,
      liability,
      terminal: makeConfirmedOutcome(changedPlan),
      receipt: makeReceipt("confirmed"),
    }),
    "coupled_native_gas_terminal_cost_plan_liability_binding_mismatch",
  );
}

{
  const plan = makePlan();
  const confirmedRecord = makeConfirmedFulfillmentRecord(plan, {
    amount: "2",
  });
  const terminal = makeConfirmedOutcome(plan, confirmedRecord);
  requireHeld(
    classify({
      plan,
      liability: liabilityFor(plan),
      terminal,
      receipt: makeReceipt("confirmed"),
    }),
    "coupled_native_gas_terminal_cost_confirmed_plan_binding_mismatch",
  );
}

{
  const plan = makePlan();
  const confirmedRecord = makeConfirmedFulfillmentRecord(plan);
  const terminal = {
    ...makeConfirmedOutcome(plan, confirmedRecord),
    confirmation_fingerprint: "0".repeat(64),
  };
  requireHeld(
    classify({
      plan,
      liability: liabilityFor(plan),
      terminal,
      receipt: makeReceipt("confirmed"),
    }),
    "coupled_native_gas_terminal_cost_confirmation_fingerprint_mismatch",
  );
}

{
  const plan = makePlan();
  const confirmedRecord = {
    ...makeConfirmedFulfillmentRecord(plan),
    delivery_binding_fingerprint: "0".repeat(64),
  };
  const terminal = {
    ...makeConfirmedOutcome(
      plan,
      confirmedRecord as BuyVoidConfirmedFulfillmentRecordV1,
    ),
    confirmation_fingerprint: "0".repeat(64),
  };
  requireHeld(
    classify({
      plan,
      liability: liabilityFor(plan),
      terminal,
      receipt: makeReceipt("confirmed"),
    }),
    "coupled_native_gas_terminal_cost_delivery_binding_fingerprint_mismatch",
  );
}

{
  const plan = makePlan();
  const terminal = makeRevertedOutcome(plan, {
    confirmation_count: "2",
  });
  requireHeld(
    classify({
      plan,
      liability: liabilityFor(plan),
      outcome: "reverted",
      terminal,
      receipt: makeReceipt("reverted"),
    }),
    "coupled_native_gas_terminal_cost_reverted_outcome_invalid",
  );
}

{
  const plan = makePlan();
  const raw = {
    ...makeReceipt("confirmed"),
    extra: "not-reviewed",
  };
  requireHeld(
    classify({
      plan,
      liability: liabilityFor(plan),
      terminal: makeConfirmedOutcome(plan),
      receipt: raw,
    }),
    "coupled_native_gas_terminal_cost_raw_receipt_keys_invalid",
  );
}

for (const [key, value] of Object.entries(
  VOID_COUPLED_NATIVE_GAS_TERMINAL_COST_EVIDENCE_AUTHORITY_V1,
)) {
  const trueKeys = new Set([
    "source_contract",
    "pure_classifier",
    "buy_void_only",
    "exact_open_liability_required",
    "exact_prepared_plan_binding_required",
    "durable_native_terminal_outcome_required",
    "confirmed_delivery_fingerprint_rederived",
    "confirmed_outcome_fingerprint_rederived",
    "reverted_outcome_arithmetic_rederived",
    "fresh_raw_receipt_required",
    "fresh_confirmation_depth_required",
    "exact_transaction_block_binding_required",
    "exact_receipt_sender_delivery_binding_required",
    "confirmed_and_reverted_supported",
    "gas_used_ceiling_required",
    "effective_gas_price_ceiling_required",
    "exact_integer_gas_cost",
    "confirmed_native_value_consumption_bound",
    "reverted_native_value_consumption_zero",
    "reserved_envelope_ceiling_required",
  ]);
  assert.equal(value, trueKeys.has(key), key);
}

assert.equal(
  confirmed.marker,
  VOID_COUPLED_NATIVE_GAS_TERMINAL_COST_EVIDENCE_V1,
);

console.log(
  "VOID_COUPLED_NATIVE_GAS_TERMINAL_COST_EVIDENCE_V1_PROOF_GREEN",
);
console.log("native_terminal_outcome_required=true");
console.log("confirmed_delivery_fingerprint_rederived=true");
console.log("confirmed_outcome_fingerprint_rederived=true");
console.log("reverted_outcome_arithmetic_rederived=true");
console.log("fresh_receipt_confirmation_revalidation=true");
console.log("confirmed_gas_cost_bound=true");
console.log("reverted_native_value_consumption_zero=true");
console.log("zero_effective_gas_price_supported=true");
console.log("gas_used_ceiling_enforced=true");
console.log("effective_gas_price_ceiling_enforced=true");
console.log("exact_receipt_identity_bound=true");
console.log("receipt_sender_delivery_bound=true");
console.log("liability_release_authorized=false");
console.log("runtime_integration=false");
console.log("rpc_read=false");
console.log("transaction_broadcast=false");
console.log("funds_movement=false");
