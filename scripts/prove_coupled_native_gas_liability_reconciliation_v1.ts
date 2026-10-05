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
  VOID_COUPLED_NATIVE_GAS_LIABILITY_V1,
  buildCoupledNativeGasPayerObservationV1,
  classifyCoupledNativeGasBuyVoidAdmissionV1,
  type CoupledNativeGasLiabilityRecordV1,
} from "../src/economic/coupled_native_gas_liability_v1.js";
import {
  classifyCoupledNativeGasTerminalCostEvidenceV1,
  type CoupledNativeGasRawTerminalReceiptV1,
  type CoupledNativeGasTerminalCostEvidenceVerifiedV1,
} from "../src/economic/coupled_native_gas_terminal_cost_evidence_v1.js";
import {
  VOID_COUPLED_NATIVE_GAS_LIABILITY_RECONCILIATION_AUTHORITY_V1,
  VOID_COUPLED_NATIVE_GAS_LIABILITY_RECONCILIATION_V1,
  classifyCoupledNativeGasLiabilityReconciliationV1,
  type CoupledNativeGasLiabilityReconciliationDecisionV1,
} from "../src/economic/coupled_native_gas_liability_reconciliation_v1.js";

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
  const nativeValue =
    input.native_value_wei ?? "1000000000000";
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
    observed_native_balance_wei: "3000000000000",
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
  return decision.liability;
}

function liabilityWithAttemptLimit(
  liability: CoupledNativeGasLiabilityRecordV1,
  attemptLimit: 1 | 2,
): CoupledNativeGasLiabilityRecordV1 {
  const nativeValue = BigInt(liability.transaction_native_value_wei);
  const gas = BigInt(liability.gas_limit);
  const maxFee = BigInt(liability.admitted_max_fee_per_gas_wei);
  const maximum =
    (nativeValue + gas * maxFee) * BigInt(attemptLimit);
  const body = {
    schema: "void_coupled_native_gas_liability_v1",
    marker: VOID_COUPLED_NATIVE_GAS_LIABILITY_V1,
    version: 1,
    lane: "presale",
    obligation_id: liability.obligation_id,
    payer_address: liability.payer_address,
    nonce: liability.nonce,
    transaction_plan_fingerprint_sha256:
      liability.transaction_plan_fingerprint_sha256,
    transaction_native_value_wei:
      liability.transaction_native_value_wei,
    gas_limit: liability.gas_limit,
    admitted_max_fee_per_gas_wei:
      liability.admitted_max_fee_per_gas_wei,
    attempt_limit: attemptLimit,
    maximum_reserved_wei: maximum.toString(),
    fee_observation_sha256: liability.fee_observation_sha256,
    source_evidence_kind: "buy_void_prepared_plan_v1",
    source_evidence_id: liability.source_evidence_id,
    status: "open",
  } as const;
  return {
    ...body,
    liability_id: sha256Canonical(body),
  };
}

function makeConfirmedFulfillmentRecord(
  plan: BuyVoidPreparedTransactionPlanReservationV1,
): BuyVoidConfirmedFulfillmentRecordV1 {
  const identity =
    "voidpay1:base:0x" + "f".repeat(64) + ":7";
  const amount =
    (BigInt(plan.native_value_wei) / 1_000_000_000_000n).toString();
  const requestId = "buyvoid_a_aaaaaaaa";
  const instructionId = "voidfill1_" + "1".repeat(32);
  const deliveryBinding = stableFingerprint({
    canonical_payment_identity: identity,
    request_id: requestId,
    instruction_id: instructionId,
    delivery_chain_id: "2050",
    void_delivery_tx_hash: deliveryTx,
    delivery_block_number: "100",
    delivery_block_hash: deliveryBlockHash,
    fulfillment_wallet: plan.wallet_address,
    delivery_address: plan.delivery_address,
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
    delivery_block_number: "100",
    delivery_block_hash: deliveryBlockHash,
    delivery_confirmation_count: "3",
    fulfillment_wallet: plan.wallet_address,
    delivery_address: plan.delivery_address,
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
): BuyVoidBroadcastConfirmedRecordV1 {
  const confirmed = makeConfirmedFulfillmentRecord(plan);
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
): BuyVoidBroadcastRevertedRecordV1 {
  return {
    schema: "void_buy_void_broadcast_reverted_record_v1",
    marker: VOID_BUY_VOID_BROADCAST_OUTCOME_JOURNAL_V1,
    attempt_id: plan.attempt_id,
    recorded_at_ms: 1_800_000_001_000,
    chain_id: "2050",
    void_delivery_tx_hash: deliveryTx,
    transaction_status: 0,
    block_number: "100",
    current_block_number: "102",
    confirmation_count: "3",
    min_revert_confirmations: 2,
    definitive_revert: true,
    reconciliation_required: false,
    retry_allowed: true,
    transaction_broadcast_performed_by_this_module: false,
  };
}

function makeReceipt(
  outcome: "confirmed" | "reverted",
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
  };
}

function terminalEvidence(
  plan: BuyVoidPreparedTransactionPlanReservationV1,
  liability: CoupledNativeGasLiabilityRecordV1,
  outcome: "confirmed" | "reverted",
): CoupledNativeGasTerminalCostEvidenceVerifiedV1 {
  const decision = classifyCoupledNativeGasTerminalCostEvidenceV1({
    liability,
    buy_void_plan: plan,
    terminal_outcome:
      outcome === "confirmed"
        ? makeConfirmedOutcome(plan)
        : makeRevertedOutcome(plan),
    raw_receipt: makeReceipt(outcome),
    current_block_number: "0x66",
    required_min_confirmations: "2",
  });
  if (decision.ok !== true) throw new Error(decision.reason);
  return decision;
}

function requireOk(
  value: CoupledNativeGasLiabilityReconciliationDecisionV1,
) {
  if (value.ok !== true) throw new Error(value.reason);
  return value;
}

function requireHeld(
  value: CoupledNativeGasLiabilityReconciliationDecisionV1,
  reason: string,
): void {
  if (value.ok !== false) {
    throw new Error("expected liability reconciliation HOLD");
  }
  assert.equal(value.reason, reason);
  assert.equal(value.liability_release_authorized, false);
  assert.equal(value.liability_store_mutation, false);
  assert.equal(value.retry_execution_authorized, false);
  assert.equal(value.funds_movement_performed, false);
}

const plan = makePlan();
const liability1 = liabilityFor(plan);
assert.equal(liability1.attempt_limit, 1);
assert.equal(liability1.maximum_reserved_wei, "1000000210000");

const confirmed1 = requireOk(
  classifyCoupledNativeGasLiabilityReconciliationV1({
    liability: liability1,
    terminal_cost_evidence:
      terminalEvidence(plan, liability1, "confirmed"),
  }),
);
assert.equal(confirmed1.outcome, "confirmed");
assert.equal(confirmed1.attempt_limit, 1);
assert.equal(confirmed1.completed_attempt_count, 1);
assert.equal(confirmed1.remaining_attempt_allowance, 0);
assert.equal(confirmed1.one_attempt_maximum_wei, "1000000210000");
assert.equal(confirmed1.actual_consumed_wei, "1000000105000");
assert.equal(
  confirmed1.unconsumed_before_reconciliation_wei,
  "105000",
);
assert.equal(
  confirmed1.consumed_reserve_retirement_candidate_wei,
  "1000000105000",
);
assert.equal(confirmed1.retained_future_attempt_reserve_wei, "0");
assert.equal(
  confirmed1.unused_reserve_release_candidate_wei,
  "105000",
);
assert.equal(confirmed1.next_open_reserved_wei, "0");
assert.equal(confirmed1.retry_allowance_reserved, false);
assert.equal(
  confirmed1.additional_attempt_requires_new_liability,
  false,
);
assert.equal(confirmed1.terminal_close_candidate, true);
assert.equal(confirmed1.liability_release_authorized, false);
assert.equal(confirmed1.liability_store_mutation, false);

const reverted1 = requireOk(
  classifyCoupledNativeGasLiabilityReconciliationV1({
    liability: liability1,
    terminal_cost_evidence:
      terminalEvidence(plan, liability1, "reverted"),
  }),
);
assert.equal(reverted1.outcome, "reverted");
assert.equal(reverted1.actual_consumed_wei, "105000");
assert.equal(
  reverted1.unconsumed_before_reconciliation_wei,
  "1000000105000",
);
assert.equal(reverted1.remaining_attempt_allowance, 0);
assert.equal(reverted1.retained_future_attempt_reserve_wei, "0");
assert.equal(
  reverted1.unused_reserve_release_candidate_wei,
  "1000000105000",
);
assert.equal(reverted1.next_open_reserved_wei, "0");
assert.equal(reverted1.retry_allowance_reserved, false);
assert.equal(
  reverted1.additional_attempt_requires_new_liability,
  true,
);
assert.equal(reverted1.terminal_close_candidate, true);

const liability2 = liabilityWithAttemptLimit(liability1, 2);
assert.equal(liability2.maximum_reserved_wei, "2000000420000");
requireHeld(
  classifyCoupledNativeGasLiabilityReconciliationV1({
    liability: liability2,
    terminal_cost_evidence:
      terminalEvidence(plan, liability1, "confirmed"),
  }),
  "coupled_native_gas_reconciliation_attempt_limit_not_supported",
);

{
  const evidence = terminalEvidence(plan, liability1, "confirmed");
  const altered = {
    ...evidence,
    liability_consumed_wei: "1",
  };
  requireHeld(
    classifyCoupledNativeGasLiabilityReconciliationV1({
      liability: liability1,
      terminal_cost_evidence: altered,
    }),
    "coupled_native_gas_reconciliation_consumed_amount_mismatch",
  );
}

{
  const evidence = terminalEvidence(plan, liability1, "confirmed");
  const altered = {
    ...evidence,
    gas_used: "20999",
  };
  requireHeld(
    classifyCoupledNativeGasLiabilityReconciliationV1({
      liability: liability1,
      terminal_cost_evidence: altered,
    }),
    "coupled_native_gas_reconciliation_gas_used_mismatch",
  );
}

{
  const evidence = terminalEvidence(plan, liability1, "confirmed");
  const altered = {
    ...evidence,
    authority: {
      ...evidence.authority,
      exact_gas_used_binding_required: false,
    },
  };
  requireHeld(
    classifyCoupledNativeGasLiabilityReconciliationV1({
      liability: liability1,
      terminal_cost_evidence: altered,
    }),
    "coupled_native_gas_reconciliation_terminal_evidence_authority_mismatch",
  );
}

{
  const changed = {
    ...liability1,
    nonce: liability1.nonce + 1,
  };
  requireHeld(
    classifyCoupledNativeGasLiabilityReconciliationV1({
      liability: changed,
      terminal_cost_evidence:
        terminalEvidence(plan, liability1, "confirmed"),
    }),
    "coupled_native_gas_reconciliation_liability_identity_mismatch",
  );
}

{
  const evidence = terminalEvidence(plan, liability1, "confirmed");
  const altered = {
    ...evidence,
    evidence_id: "f".repeat(64),
  };
  requireHeld(
    classifyCoupledNativeGasLiabilityReconciliationV1({
      liability: liability1,
      terminal_cost_evidence: altered,
    }),
    "coupled_native_gas_reconciliation_terminal_evidence_identity_mismatch",
  );
}

assert.match(confirmed1.reconciliation_id, /^[0-9a-f]{64}$/u);
assert.notEqual(confirmed1.reconciliation_id, reverted1.reconciliation_id);

for (const [key, value] of Object.entries(
  VOID_COUPLED_NATIVE_GAS_LIABILITY_RECONCILIATION_AUTHORITY_V1,
)) {
  const trueKeys = new Set([
    "source_contract",
    "pure_classifier",
    "buy_void_only",
    "exact_open_liability_identity_rederived",
    "exact_terminal_cost_evidence_identity_rederived",
    "exact_liability_terminal_evidence_binding_required",
    "consumed_reserve_retirement_candidate_classified",
    "unused_reserve_release_candidate_classified",
    "current_buy_void_attempt_limit_one_required",
    "reverted_retry_requires_new_liability",
    "confirmed_future_attempt_allowance_zero",
  ]);
  assert.equal(value, trueKeys.has(key), key);
}

assert.equal(
  confirmed1.marker,
  VOID_COUPLED_NATIVE_GAS_LIABILITY_RECONCILIATION_V1,
);

console.log(
  "VOID_COUPLED_NATIVE_GAS_LIABILITY_RECONCILIATION_V1_PROOF_GREEN",
);
console.log("liability_identity_rederived=true");
console.log("terminal_cost_evidence_identity_rederived=true");
console.log("confirmed_unused_reserve_classified=true");
console.log("reverted_actual_gas_retired=true");
console.log("current_buy_void_attempt_limit_one_required=true");
console.log("reverted_retry_requires_new_liability=true");
console.log("attempt_limit_2_reconciliation_hold=true");
console.log("liability_release_authorized=false");
console.log("liability_store_mutation=false");
console.log("retry_execution_authorized=false");
console.log("runtime_integration=false");
console.log("funds_movement=false");
