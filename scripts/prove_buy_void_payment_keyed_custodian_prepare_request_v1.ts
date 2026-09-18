#!/usr/bin/env node
import assert from "node:assert/strict";
import { Interface } from "ethers";

import {
  buildBuyVoidPaymentKeyedFulfillmentCallV1,
} from "../src/economic/buy_void_payment_keyed_fulfillment_call_v1.js";
import {
  VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
  type BuyVoidExecutionAttemptStateV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";
import {
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
} from "../src/economic/buy_void_source_finality_execution_preflight_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_REQUEST_SCHEMA_V1,
  buildBuyVoidPaymentKeyedCustodianPrepareRequestV1,
  type BuyVoidPaymentKeyedCustodianPrepareRequestPolicyV1,
} from "../src/economic/buy_void_payment_keyed_custodian_prepare_request_v1.js";
import type {
  BuyVoidDeliveryTransactionPlanV1,
} from "../src/economic/buy_void_delivery_sign_broadcast_adapter_v1.js";

const IDENTITY = "voidpay1:base:0x" + "a".repeat(64) + ":7";
const ATTEMPT_ID = "1".repeat(64);
const LEGACY_KEY = "2".repeat(64);
const CANONICAL_KEY =
  "a06bb682bc6225c6697d0a37a51fc1323dc657eac74a51506ddb5d7daed82c85";
const DELIVERY = "0x" + "4".repeat(40);
const CONTRACT = "0x" + "5".repeat(40);
const WALLET = "0x" + "6".repeat(40);
const SAGA_ID = "voidbvfsg1_" + "a".repeat(64);
const PLAN_RESERVATION_ID = "b".repeat(64);

function attempt(): BuyVoidExecutionAttemptStateV1 {
  return {
    reservation: {
      schema: "void_buy_void_execution_attempt_reservation_v1",
      marker: VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
      attempt_id: ATTEMPT_ID,
      attempt_number: 1,
      reserved_at_ms: 1,
      payment_key_sha256: LEGACY_KEY,
      request_key_sha256: "7".repeat(64),
      canonical_payment_identity: IDENTITY,
      request_id: "buyvoid-payment-keyed-custodian-request-v1",
      instruction_id: "8".repeat(64),
      intent_fingerprint: "9".repeat(64),
      max_attempts_per_payment: 1,
      unsigned_instruction: {
        schema: "void_buy_void_unsigned_fulfillment_instruction_v1",
        marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
        instruction_id: "8".repeat(64),
        request_id: "buyvoid-payment-keyed-custodian-request-v1",
        canonical_payment_identity: IDENTITY,
        source_chain: "base",
        payment_transaction_hash: "0x" + "a".repeat(64),
        payment_log_index: "7",
        delivery_address: DELIVERY,
        payment_usdc_units: "1000000",
        void_amount_units: "2000000",
        confirmed_block_number: "123",
        confirmation_count: "12",
        signing_authorized: false,
        transaction_broadcast_authorized: false,
        automatic_execution_authorized: false,
      },
      signing_authorized_by_this_module: false,
      transaction_broadcast_authorized_by_this_module: false,
      money_movement_authorized_by_this_module: false,
    },
    prepared: null,
    broadcast: null,
    failure: null,
    postbroadcast_failure: null,
    confirmation: null,
    status: "reserved",
  };
}

function fulfillmentCall() {
  const decision = buildBuyVoidPaymentKeyedFulfillmentCallV1({
    attempt: attempt(),
    source_finality: {
      ok: true,
      marker: VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
      version: 1,
      status: "ready",
      attempt_id: ATTEMPT_ID,
      source_chain: "base",
      canonical_payment_identity: IDENTITY,
      payment_key_sha256: CANONICAL_KEY,
      process_source_identity_verified: true,
      reviewed_source_files_verified: true,
      authenticated_transport_identity_verified: true,
      total_operation_deadline_verified: true,
      source_generation_verified: true,
      deployed_artifact_generation_verified: true,
      ancestry_verified: true,
      provider_quorum_verified: true,
      production_source_finality_authority_ready: true,
      wallet_access_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    },
    policy: {
      chain_id: "2050",
      fulfillment_contract_address: CONTRACT,
      max_void_amount_units: "10000000000000",
    },
  });
  if (decision.ok === false) throw new Error(decision.reason);
  return decision;
}

const call = fulfillmentCall();
const plan: BuyVoidDeliveryTransactionPlanV1 = {
  chain_id: "2050",
  nonce: 7,
  gas_limit: "120000",
  max_fee_per_gas_wei: "2000000000",
  max_priority_fee_per_gas_wei: "1000000000",
};
const policy: BuyVoidPaymentKeyedCustodianPrepareRequestPolicyV1 = {
  chain_id: "2050",
  fulfillment_wallet_address: WALLET,
  fulfillment_contract_address: CONTRACT,
  max_void_amount_units: "10000000000000",
  max_gas_limit: "300000",
  max_fee_per_gas_wei: "5000000000",
  max_priority_fee_per_gas_wei: "1000000000",
};

const ready = buildBuyVoidPaymentKeyedCustodianPrepareRequestV1({
  saga_id: SAGA_ID,
  attempt_id: ATTEMPT_ID,
  plan_reservation_id: PLAN_RESERVATION_ID,
  fulfillment_call: call,
  plan,
  policy,
});
if (ready.ok === false) throw new Error(ready.reason);

assert.equal(
  ready.marker,
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_V1,
);
assert.equal(ready.status, "ready");
assert.equal(ready.version, 1);
const request = ready.request;
assert.equal(
  request.schema,
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_REQUEST_SCHEMA_V1,
);
assert.equal(
  request.marker,
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_V1,
);
assert.equal(request.version, 1);
assert.match(request.idempotency_key_sha256, /^[0-9a-f]{64}$/);
assert.match(request.request_fingerprint_sha256, /^[0-9a-f]{64}$/);
assert.equal(request.saga_id, SAGA_ID);
assert.equal(request.attempt_id, ATTEMPT_ID);
assert.equal(request.plan_reservation_id, PLAN_RESERVATION_ID);
assert.equal(request.chain_id, "2050");
assert.equal(request.wallet_address, WALLET);
assert.equal(request.nonce, 7);
assert.equal(request.transaction_to, CONTRACT);
assert.equal(request.transaction_value_wei, "0");
assert.equal(request.transaction_calldata, call.calldata);
assert.equal(request.transaction_calldata_sha256, call.calldata_sha256);
assert.equal(request.gas_limit, "120000");
assert.equal(request.max_fee_per_gas_wei, "2000000000");
assert.equal(request.max_priority_fee_per_gas_wei, "1000000000");
assert.equal(request.canonical_payment_identity, IDENTITY);
assert.equal(request.canonical_payment_key_sha256, CANONICAL_KEY);
assert.equal(request.delivery_address, DELIVERY);
assert.equal(request.void_amount_units, "2000000");
assert.equal(request.token_amount_atoms, "2000000000000000000");
assert.equal(request.call_fingerprint_sha256, call.call_fingerprint_sha256);
assert.match(request.transaction_plan_fingerprint_sha256, /^[0-9a-f]{64}$/);
assert.match(request.unsigned_transaction_fingerprint_sha256, /^[0-9a-f]{64}$/);
assert.equal(request.credential_access_authorized, false);
assert.equal(request.wallet_access_authorized, false);
assert.equal(request.signing_authorized, false);
assert.equal(request.transaction_broadcast_authorized, false);
assert.equal(request.raw_signed_transaction_persisted, false);
assert.equal(request.money_movement_authorized, false);
assert.equal(ready.mutation_performed, false);
assert.equal(ready.credential_access_performed, false);
assert.equal(ready.wallet_access_performed, false);
assert.equal(ready.signing_performed, false);
assert.equal(ready.transaction_broadcast_performed, false);
assert.equal(ready.money_movement_performed, false);

const fulfillment = new Interface([
  "function fulfill(bytes32 paymentDeliveryId,address recipient,uint256 amountAtoms)",
]);
assert.equal(
  request.transaction_calldata,
  fulfillment
    .encodeFunctionData("fulfill", [
      "0x" + CANONICAL_KEY,
      DELIVERY,
      2_000_000_000_000_000_000n,
    ])
    .toLowerCase(),
);

function expectHeld(
  name: string,
  reason: string,
  options: {
    sagaId?: string;
    attemptId?: string;
    reservationId?: string;
    call?: any;
    plan?: BuyVoidDeliveryTransactionPlanV1;
    policy?: BuyVoidPaymentKeyedCustodianPrepareRequestPolicyV1;
  } = {},
) {
  const decision = buildBuyVoidPaymentKeyedCustodianPrepareRequestV1({
    saga_id: options.sagaId ?? SAGA_ID,
    attempt_id: options.attemptId ?? ATTEMPT_ID,
    plan_reservation_id: options.reservationId ?? PLAN_RESERVATION_ID,
    fulfillment_call: options.call ?? call,
    plan: options.plan ?? plan,
    policy: options.policy ?? policy,
  });
  if (decision.ok) throw new Error(name + "_unexpected_ready");
  assert.equal(decision.ok, false, name);
  assert.equal(decision.reason, reason, name);
  assert.equal(decision.credential_access_performed, false, name);
  assert.equal(decision.wallet_access_performed, false, name);
  assert.equal(decision.signing_performed, false, name);
  assert.equal(decision.transaction_broadcast_performed, false, name);
  assert.equal(decision.money_movement_performed, false, name);
}

expectHeld(
  "invalid_saga",
  "payment_keyed_custodian_request_saga_id_invalid",
  { sagaId: "not-a-saga" },
);

expectHeld(
  "wrong_attempt",
  "payment_keyed_custodian_request_fulfillment_call_invalid",
  { attemptId: "e".repeat(64) },
);

expectHeld(
  "invalid_reservation",
  "payment_keyed_custodian_request_plan_reservation_id_invalid",
  { reservationId: "not-a-reservation" },
);

expectHeld(
  "wrong_contract",
  "payment_keyed_custodian_request_fulfillment_call_invalid",
  {
    policy: {
      ...policy,
      fulfillment_contract_address: "0x" + "7".repeat(40),
    },
  },
);

expectHeld(
  "forged_key",
  "payment_keyed_custodian_request_fulfillment_call_invalid",
  {
    call: {
      ...call,
      canonical_payment_key_sha256: "e".repeat(64),
    },
  },
);

expectHeld(
  "forged_calldata",
  "payment_keyed_custodian_request_fulfillment_call_invalid",
  {
    call: {
      ...call,
      calldata:
        call.calldata.slice(0, 10) +
        (call.calldata[10] === "0" ? "1" : "0") +
        call.calldata.slice(11),
    },
  },
);

expectHeld(
  "wrong_chain",
  "payment_keyed_custodian_request_transaction_plan_invalid",
  {
    plan: {
      ...plan,
      chain_id: "1",
    },
  },
);

expectHeld(
  "gas_over_policy",
  "payment_keyed_custodian_request_transaction_plan_invalid",
  {
    plan: {
      ...plan,
      gas_limit: "300001",
    },
  },
);

expectHeld(
  "fee_over_policy",
  "payment_keyed_custodian_request_transaction_plan_invalid",
  {
    plan: {
      ...plan,
      max_fee_per_gas_wei: "5000000001",
    },
  },
);

const replay = buildBuyVoidPaymentKeyedCustodianPrepareRequestV1({
  saga_id: SAGA_ID,
  attempt_id: ATTEMPT_ID,
  plan_reservation_id: PLAN_RESERVATION_ID,
  fulfillment_call: call,
  plan,
  policy,
});
if (replay.ok === false) throw new Error(replay.reason);
assert.deepEqual(replay.request, request);

const changedNonce = buildBuyVoidPaymentKeyedCustodianPrepareRequestV1({
  saga_id: SAGA_ID,
  attempt_id: ATTEMPT_ID,
  plan_reservation_id: PLAN_RESERVATION_ID,
  fulfillment_call: call,
  plan: { ...plan, nonce: 8 },
  policy,
});
if (changedNonce.ok === false) throw new Error(changedNonce.reason);
assert.notEqual(
  changedNonce.request.transaction_plan_fingerprint_sha256,
  request.transaction_plan_fingerprint_sha256,
);
assert.notEqual(
  changedNonce.request.unsigned_transaction_fingerprint_sha256,
  request.unsigned_transaction_fingerprint_sha256,
);
assert.notEqual(
  changedNonce.request.idempotency_key_sha256,
  request.idempotency_key_sha256,
);

let coercions = 0;
const hostile = {
  [Symbol.toPrimitive]() {
    coercions += 1;
    return CONTRACT;
  },
};
expectHeld(
  "hostile_contract",
  "payment_keyed_custodian_request_policy_invalid",
  {
    policy: {
      ...policy,
      fulfillment_contract_address: hostile as any,
    },
  },
);
assert.equal(coercions, 0);

assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_AUTHORITY_V1
    .explicit_calldata_bearing_custody_request,
  true,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_AUTHORITY_V1
    .legacy_delivery_address_as_transaction_target,
  false,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_AUTHORITY_V1
    .legacy_empty_calldata_authority,
  false,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_AUTHORITY_V1.signing,
  false,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_AUTHORITY_V1
    .transaction_broadcast,
  false,
);

console.log("VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_V1_PROOF_GREEN");
console.log("exact_saga_attempt_reservation_binding=true");
console.log("canonical_payment_key_rederived=true");
console.log("fulfillment_contract_is_transaction_target=true");
console.log("exact_fulfill_calldata_required=true");
console.log("transaction_value_wei=0");
console.log("transaction_plan_fingerprint_bound=true");
console.log("unsigned_transaction_fingerprint_bound=true");
console.log("idempotency_key_bound=true");
console.log("legacy_delivery_address_as_transaction_target=false");
console.log("legacy_empty_calldata_authority=false");
console.log("authority_string_coercion_executed=false");
console.log("credential_access=false");
console.log("wallet_access=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("money_movement=false");
