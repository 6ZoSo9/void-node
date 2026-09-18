#!/usr/bin/env node
import assert from "node:assert/strict";
import { Transaction } from "ethers";

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
  VOID_BUY_VOID_PAYMENT_KEYED_UNSIGNED_TRANSACTION_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_UNSIGNED_TRANSACTION_V1,
  buildBuyVoidPaymentKeyedUnsignedTransactionV1,
  type BuyVoidPaymentKeyedUnsignedTransactionPolicyV1,
} from "../src/economic/buy_void_payment_keyed_unsigned_transaction_v1.js";
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
      request_id: "buyvoid-payment-keyed-unsigned-transaction-v1",
      instruction_id: "8".repeat(64),
      intent_fingerprint: "9".repeat(64),
      max_attempts_per_payment: 1,
      unsigned_instruction: {
        schema: "void_buy_void_unsigned_fulfillment_instruction_v1",
        marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
        instruction_id: "8".repeat(64),
        request_id: "buyvoid-payment-keyed-unsigned-transaction-v1",
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
const policy: BuyVoidPaymentKeyedUnsignedTransactionPolicyV1 = {
  chain_id: "2050",
  fulfillment_wallet_address: WALLET,
  fulfillment_contract_address: CONTRACT,
  max_void_amount_units: "10000000000000",
  max_gas_limit: "300000",
  max_fee_per_gas_wei: "5000000000",
  max_priority_fee_per_gas_wei: "1000000000",
};
const plan: BuyVoidDeliveryTransactionPlanV1 = {
  chain_id: "2050",
  nonce: 7,
  gas_limit: "120000",
  max_fee_per_gas_wei: "2000000000",
  max_priority_fee_per_gas_wei: "1000000000",
};

const ready = buildBuyVoidPaymentKeyedUnsignedTransactionV1({
  fulfillment_call: call,
  plan,
  policy,
});
if (ready.ok === false) throw new Error(ready.reason);

assert.equal(ready.marker, VOID_BUY_VOID_PAYMENT_KEYED_UNSIGNED_TRANSACTION_V1);
assert.equal(ready.version, 1);
assert.equal(ready.status, "ready");
assert.equal(ready.chain_id, "2050");
assert.equal(ready.attempt_id, ATTEMPT_ID);
assert.equal(ready.canonical_payment_identity, IDENTITY);
assert.equal(ready.canonical_payment_key_sha256, CANONICAL_KEY);
assert.equal(ready.fulfillment_wallet_address, WALLET);
assert.equal(ready.fulfillment_contract_address, CONTRACT);
assert.equal(ready.delivery_address, DELIVERY);
assert.equal(ready.void_amount_units, "2000000");
assert.equal(ready.token_amount_atoms, "2000000000000000000");
assert.equal(ready.transaction_calldata, call.calldata);
assert.equal(ready.transaction_calldata_sha256, call.calldata_sha256);
assert.equal(ready.call_fingerprint_sha256, call.call_fingerprint_sha256);
assert.match(ready.transaction_plan_fingerprint_sha256, /^[0-9a-f]{64}$/);
assert.match(ready.unsigned_transaction_fingerprint_sha256, /^[0-9a-f]{64}$/);
assert.deepEqual(ready.transaction_plan, {
  chain_id: "2050",
  nonce: 7,
  gas_limit: "120000",
  max_fee_per_gas_wei: "2000000000",
  max_priority_fee_per_gas_wei: "1000000000",
});
assert.deepEqual(ready.unsigned_transaction, {
  type: 2,
  chainId: 2050n,
  nonce: 7,
  gasLimit: 120000n,
  maxFeePerGas: 2000000000n,
  maxPriorityFeePerGas: 1000000000n,
  to: CONTRACT,
  value: 0n,
  data: call.calldata,
});
const materialized = Transaction.from(ready.unsigned_transaction);
assert.equal(materialized.type, 2);
assert.equal(materialized.chainId, 2050n);
assert.equal(materialized.to?.toLowerCase(), CONTRACT);
assert.equal(materialized.value, 0n);
assert.equal(materialized.data.toLowerCase(), call.calldata);
assert.equal(ready.mutation_performed, false);
assert.equal(ready.credential_access_performed, false);
assert.equal(ready.wallet_access_performed, false);
assert.equal(ready.signing_performed, false);
assert.equal(ready.transaction_broadcast_performed, false);
assert.equal(ready.money_movement_performed, false);

function expectHeld(
  name: string,
  reason: string,
  options: {
    fulfillmentCall?: any;
    plan?: BuyVoidDeliveryTransactionPlanV1;
    policy?: BuyVoidPaymentKeyedUnsignedTransactionPolicyV1;
  } = {},
) {
  const decision = buildBuyVoidPaymentKeyedUnsignedTransactionV1({
    fulfillment_call: options.fulfillmentCall ?? call,
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
  "wrong_contract",
  "payment_keyed_unsigned_transaction_fulfillment_call_invalid",
  {
    policy: {
      ...policy,
      fulfillment_contract_address: "0x" + "7".repeat(40),
    },
  },
);

expectHeld(
  "forged_payment_key",
  "payment_keyed_unsigned_transaction_fulfillment_call_invalid",
  {
    fulfillmentCall: {
      ...call,
      canonical_payment_key_sha256: "e".repeat(64),
    },
  },
);

expectHeld(
  "forged_calldata",
  "payment_keyed_unsigned_transaction_fulfillment_call_invalid",
  {
    fulfillmentCall: {
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
  "payment_keyed_unsigned_transaction_plan_invalid",
  {
    plan: {
      ...plan,
      chain_id: "1",
    },
  },
);

expectHeld(
  "gas_limit_over_policy",
  "payment_keyed_unsigned_transaction_plan_invalid",
  {
    plan: {
      ...plan,
      gas_limit: "300001",
    },
  },
);

expectHeld(
  "priority_over_max_fee",
  "payment_keyed_unsigned_transaction_plan_invalid",
  {
    plan: {
      ...plan,
      max_fee_per_gas_wei: "500000000",
      max_priority_fee_per_gas_wei: "600000000",
    },
  },
);

expectHeld(
  "unsafe_nonce",
  "payment_keyed_unsigned_transaction_plan_invalid",
  {
    plan: {
      ...plan,
      nonce: "9007199254740992",
    },
  },
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
  "payment_keyed_unsigned_transaction_policy_invalid",
  {
    policy: {
      ...policy,
      fulfillment_contract_address: hostile as any,
    },
  },
);
assert.equal(coercions, 0);

assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_UNSIGNED_TRANSACTION_AUTHORITY_V1
    .exact_fulfill_calldata_required,
  true,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_UNSIGNED_TRANSACTION_AUTHORITY_V1
    .legacy_void_token_transfer_authority,
  false,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_UNSIGNED_TRANSACTION_AUTHORITY_V1.signing,
  false,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_UNSIGNED_TRANSACTION_AUTHORITY_V1
    .transaction_broadcast,
  false,
);

console.log("VOID_BUY_VOID_PAYMENT_KEYED_UNSIGNED_TRANSACTION_V1_PROOF_GREEN");
console.log("canonical_payment_key_rederived=true");
console.log("call_fingerprint_rederived=true");
console.log("fulfillment_contract_is_transaction_target=true");
console.log("exact_fulfill_calldata_required=true");
console.log("eip1559_type_2_required=true");
console.log("transaction_value_wei=0");
console.log("bounded_nonce_and_fee_plan_required=true");
console.log("legacy_void_token_transfer_authority=false");
console.log("authority_string_coercion_executed=false");
console.log("rpc_access=false");
console.log("wallet_access=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("money_movement=false");
