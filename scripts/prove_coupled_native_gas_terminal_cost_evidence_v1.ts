#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_EVIDENCE_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_EVIDENCE_V1,
  type BuyVoidPaymentKeyedReceiptEvidenceV1,
} from "../src/economic/buy_void_payment_keyed_receipt_evidence_v1.js";
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
} from "../src/economic/coupled_native_gas_terminal_cost_evidence_v1.js";

const wallet = "0x" + "1".repeat(40);
const delivery = "0x" + "3".repeat(40);
const fulfillment = "0x" + "4".repeat(40);
const voidToken = "0x" + "5".repeat(40);
const txHash = "0x" + "6".repeat(64);
const blockHash = "0x" + "7".repeat(64);
const policyFingerprint = "8".repeat(64);
const receiptFingerprint = "9".repeat(64);

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

function makeEvidence(
  plan: BuyVoidPreparedTransactionPlanReservationV1,
  outcome: "confirmed" | "reverted",
): BuyVoidPaymentKeyedReceiptEvidenceV1 {
  const common = {
    schema: "void_buy_void_payment_keyed_receipt_evidence_v1" as const,
    marker: VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_EVIDENCE_V1,
    version: 1 as const,
    saga_id: plan.saga_id,
    attempt_id: plan.attempt_id,
    transaction_hash: txHash,
    outcome,
    recorded_at_ms: 1_800_000_001_000,
    receipt_policy_fingerprint_sha256: policyFingerprint,
    receipt_evidence_fingerprint_sha256: receiptFingerprint,
    receipt_block_number: "100",
    receipt_block_hash: blockHash,
    observed_confirmation_count: "3",
    fulfillment_wallet_address: wallet,
    fulfillment_contract_address: fulfillment,
    delivery_address: delivery,
    void_amount_units: "6",
  };
  const body =
    outcome === "confirmed"
      ? {
          ...common,
          outcome: "confirmed" as const,
          canonical_payment_identity:
            "voidpay1:base:0x" + "f".repeat(64) + ":7",
          payment_delivery_id: "0x" + "1".repeat(64),
          void_token_address: voidToken,
          token_amount_atoms: "6000000000000000000",
          fulfillment_event_log_index: "1",
          transfer_event_log_index: "2",
          authority:
            VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_EVIDENCE_AUTHORITY_V1,
        }
      : {
          ...common,
          outcome: "reverted" as const,
          canonical_payment_identity: null,
          payment_delivery_id: null,
          void_token_address: null,
          token_amount_atoms: null,
          fulfillment_event_log_index: null,
          transfer_event_log_index: null,
          authority:
            VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_EVIDENCE_AUTHORITY_V1,
        };
  const { recorded_at_ms: _recordedAt, ...semantic } = body;
  void _recordedAt;
  return {
    ...body,
    evidence_fingerprint_sha256: sha256Canonical(semantic),
  };
}

function makeReceipt(
  outcome: "confirmed" | "reverted",
  input: Partial<CoupledNativeGasRawTerminalReceiptV1> = {},
): CoupledNativeGasRawTerminalReceiptV1 {
  return {
    transactionHash: txHash,
    blockNumber: "0x64",
    blockHash,
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
  evidence?: BuyVoidPaymentKeyedReceiptEvidenceV1;
  receipt?: CoupledNativeGasRawTerminalReceiptV1 | Record<string, unknown>;
  policy?: string;
} = {}): CoupledNativeGasTerminalCostEvidenceDecisionV1 {
  const plan = input.plan ?? makePlan();
  const outcome = input.outcome ?? "confirmed";
  return classifyCoupledNativeGasTerminalCostEvidenceV1({
    liability: input.liability ?? liabilityFor(plan),
    buy_void_plan: plan,
    terminal_receipt_evidence:
      input.evidence ?? makeEvidence(plan, outcome),
    raw_receipt: input.receipt ?? makeReceipt(outcome),
    expected_receipt_policy_fingerprint_sha256:
      input.policy ?? policyFingerprint,
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
assert.equal(confirmed.transaction_native_value_debit_wei, "1");
assert.equal(confirmed.actual_payer_debit_wei, "105001");
assert.equal(confirmed.maximum_reserved_wei, "210001");
assert.equal(confirmed.within_reserved_envelope, true);
assert.equal(confirmed.liability_release_authorized, false);
assert.equal(confirmed.mutation_performed, false);
assert.equal(confirmed.funds_movement_performed, false);

const reverted = requireOk(classify({ outcome: "reverted" }));
assert.equal(reverted.outcome, "reverted");
assert.equal(reverted.gas_cost_wei, "105000");
assert.equal(reverted.transaction_native_value_debit_wei, "0");
assert.equal(reverted.actual_payer_debit_wei, "105000");
assert.notEqual(reverted.evidence_id, confirmed.evidence_id);

const freeGas = requireOk(
  classify({
    receipt: makeReceipt("confirmed", {
      effectiveGasPrice: "0x0",
    }),
  }),
);
assert.equal(freeGas.gas_cost_wei, "0");
assert.equal(freeGas.actual_payer_debit_wei, "1");

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
      blockHash: "0x" + "3".repeat(64),
    }),
  }),
  "coupled_native_gas_terminal_cost_receipt_identity_mismatch",
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
  classify({ policy: "a".repeat(64) }),
  "coupled_native_gas_terminal_cost_receipt_policy_mismatch",
);

{
  const plan = makePlan();
  const liability = liabilityFor(plan);
  const changedPlan = { ...plan, nonce: plan.nonce + 1 };
  requireHeld(
    classify({
      plan: changedPlan as BuyVoidPreparedTransactionPlanReservationV1,
      liability,
      evidence: makeEvidence(plan, "confirmed"),
      receipt: makeReceipt("confirmed"),
    }),
    "coupled_native_gas_terminal_cost_plan_liability_binding_mismatch",
  );
}

{
  const plan = makePlan();
  const evidence = makeEvidence(plan, "confirmed");
  const tampered = {
    ...evidence,
    observed_confirmation_count: "4",
  };
  requireHeld(
    classify({
      plan,
      liability: liabilityFor(plan),
      evidence:
        tampered as BuyVoidPaymentKeyedReceiptEvidenceV1,
      receipt: makeReceipt("confirmed"),
    }),
    "coupled_native_gas_terminal_cost_receipt_evidence_fingerprint_mismatch",
  );
}

{
  const plan = makePlan();
  const evidence = makeEvidence(plan, "reverted");
  const malformed = {
    ...evidence,
    canonical_payment_identity:
      "voidpay1:base:0x" + "f".repeat(64) + ":7",
  };
  requireHeld(
    classify({
      plan,
      liability: liabilityFor(plan),
      outcome: "reverted",
      evidence:
        malformed as BuyVoidPaymentKeyedReceiptEvidenceV1,
      receipt: makeReceipt("reverted"),
    }),
    "coupled_native_gas_terminal_cost_reverted_evidence_invalid",
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
      evidence: makeEvidence(plan, "confirmed"),
      receipt: raw,
    }),
    "coupled_native_gas_terminal_cost_raw_receipt_invalid",
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
    "immutable_terminal_receipt_evidence_required",
    "exact_receipt_policy_fingerprint_required",
    "raw_receipt_cost_fields_required",
    "exact_transaction_block_binding_required",
    "exact_receipt_sender_delivery_binding_required",
    "confirmed_and_reverted_supported",
    "gas_used_ceiling_required",
    "effective_gas_price_ceiling_required",
    "exact_integer_gas_cost",
    "confirmed_native_value_debit_bound",
    "reverted_native_value_debit_zero",
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
console.log("confirmed_gas_cost_bound=true");
console.log("reverted_native_value_debit_zero=true");
console.log("zero_effective_gas_price_supported=true");
console.log("gas_used_ceiling_enforced=true");
console.log("effective_gas_price_ceiling_enforced=true");
console.log("exact_receipt_identity_bound=true");
console.log("receipt_sender_contract_bound=true");
console.log("receipt_policy_fingerprint_bound=true");
console.log("receipt_evidence_fingerprint_revalidated=true");
console.log("liability_release_authorized=false");
console.log("runtime_integration=false");
console.log("rpc_read=false");
console.log("transaction_broadcast=false");
console.log("funds_movement=false");
