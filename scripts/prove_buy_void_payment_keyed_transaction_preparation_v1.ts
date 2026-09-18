#!/usr/bin/env node
import assert from "node:assert/strict";

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
  VOID_BUY_VOID_PAYMENT_KEYED_TRANSACTION_PREPARATION_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_TRANSACTION_PREPARATION_V1,
  runBuyVoidPaymentKeyedTransactionPreparationV1,
  validateBuyVoidPaymentKeyedTransactionPreparationPolicyV1,
  type BuyVoidPaymentKeyedTransactionPreparationPolicyV1,
  type BuyVoidPaymentKeyedTransactionPreparationRpcCallV1,
} from "../src/economic/buy_void_payment_keyed_transaction_preparation_v1.js";

const IDENTITY = "voidpay1:base:0x" + "a".repeat(64) + ":7";
const ATTEMPT_ID = "1".repeat(64);
const LEGACY_KEY = "2".repeat(64);
const CANONICAL_KEY =
  "a06bb682bc6225c6697d0a37a51fc1323dc657eac74a51506ddb5d7daed82c85";
const DELIVERY = "0x" + "4".repeat(40);
const CONTRACT = "0x" + "5".repeat(40);
const WALLET = "0x" + "6".repeat(40);

function attempt(
  overrides: Partial<BuyVoidExecutionAttemptStateV1["reservation"]> = {},
): BuyVoidExecutionAttemptStateV1 {
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
      request_id: "buyvoid-payment-keyed-transaction-preparation-v1",
      instruction_id: "8".repeat(64),
      intent_fingerprint: "9".repeat(64),
      max_attempts_per_payment: 1,
      unsigned_instruction: {
        schema: "void_buy_void_unsigned_fulfillment_instruction_v1",
        marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
        instruction_id: "8".repeat(64),
        request_id: "buyvoid-payment-keyed-transaction-preparation-v1",
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
      ...overrides,
    },
    prepared: null,
    broadcast: null,
    failure: null,
    postbroadcast_failure: null,
    confirmation: null,
    status: "reserved",
  };
}

function fulfillmentCall(inputAttempt = attempt()) {
  const decision = buildBuyVoidPaymentKeyedFulfillmentCallV1({
    attempt: inputAttempt,
    source_finality: {
      ok: true,
      marker: VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
      version: 1,
      status: "ready",
      attempt_id: inputAttempt.reservation.attempt_id,
      source_chain: "base",
      canonical_payment_identity:
        inputAttempt.reservation.canonical_payment_identity,
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

const policy: BuyVoidPaymentKeyedTransactionPreparationPolicyV1 = {
  enabled: true,
  chain_id: "2050",
  rpc_url: "http://127.0.0.1:8545/",
  fulfillment_wallet_address: WALLET,
  fulfillment_contract_address: CONTRACT,
  max_void_amount_units: "10000000000000",
  gas_limit_multiplier_bps: "12000",
  max_gas_limit: "300000",
  fee_multiplier_bps: "20000",
  max_fee_per_gas_wei: "5000000000",
  max_priority_fee_per_gas_wei: "1000000000",
  request_timeout_ms: "5000",
  max_response_bytes: "65536",
};

type Overrides = Partial<
  Record<
    "eth_chainId" |
    "eth_getTransactionCount" |
    "eth_gasPrice" |
    "eth_estimateGas" |
    "eth_getBalance",
    unknown
  >
>;

function transportFor(
  calls: BuyVoidPaymentKeyedTransactionPreparationRpcCallV1[],
  overrides: Overrides = {},
) {
  const defaults: Record<string, unknown> = {
    eth_chainId: "0x802",
    eth_getTransactionCount: "0x7",
    eth_gasPrice: "0x3b9aca00",
    eth_estimateGas: "0x186a0",
    eth_getBalance: "0xde0b6b3a7640000",
  };
  return async (call: Readonly<BuyVoidPaymentKeyedTransactionPreparationRpcCallV1>) => {
    calls.push({
      method: call.method,
      params: structuredClone(call.params),
    });
    if (Object.prototype.hasOwnProperty.call(overrides, call.method)) {
      return overrides[call.method];
    }
    return defaults[call.method];
  };
}

const validatedPolicy =
  validateBuyVoidPaymentKeyedTransactionPreparationPolicyV1(policy);
assert.equal(validatedPolicy.ok, true);
if (validatedPolicy.ok === false) throw new Error(validatedPolicy.reason);
assert.match(validatedPolicy.policy_fingerprint_sha256, /^[0-9a-f]{64}$/);
assert.match(validatedPolicy.rpc_url_fingerprint_sha256, /^[0-9a-f]{64}$/);

const baseAttempt = attempt();
const call = fulfillmentCall(baseAttempt);
const calls: BuyVoidPaymentKeyedTransactionPreparationRpcCallV1[] = [];
const planned = await runBuyVoidPaymentKeyedTransactionPreparationV1({
  attempt: baseAttempt,
  fulfillment_call: call,
  policy,
  transport: transportFor(calls),
});
if (planned.ok === false) throw new Error(planned.reason);

assert.equal(planned.status, "planned");
assert.equal(
  planned.marker,
  VOID_BUY_VOID_PAYMENT_KEYED_TRANSACTION_PREPARATION_V1,
);
assert.equal(planned.version, 1);
assert.equal(planned.attempt_id, ATTEMPT_ID);
assert.equal(planned.canonical_payment_identity, IDENTITY);
assert.equal(planned.canonical_payment_key_sha256, CANONICAL_KEY);
assert.equal(planned.fulfillment_wallet_address, WALLET);
assert.equal(planned.fulfillment_contract_address, CONTRACT);
assert.equal(planned.delivery_address, DELIVERY);
assert.equal(planned.void_amount_units, "2000000");
assert.equal(planned.token_amount_atoms, "2000000000000000000");
assert.equal(planned.transaction_calldata, call.calldata);
assert.equal(planned.transaction_calldata_sha256, call.calldata_sha256);
assert.equal(planned.call_fingerprint_sha256, call.call_fingerprint_sha256);
assert.equal(planned.transaction_value_wei, "0");
assert.equal(planned.pending_nonce, 7);
assert.equal(planned.observed_estimated_gas, "100000");
assert.equal(planned.computed_gas_limit, "120000");
assert.equal(planned.computed_max_fee_per_gas_wei, "2000000000");
assert.equal(planned.estimated_max_gas_cost_wei, "240000000000000");
assert.deepEqual(planned.transaction_plan, {
  chain_id: "2050",
  nonce: 7,
  gas_limit: "120000",
  max_fee_per_gas_wei: "2000000000",
  max_priority_fee_per_gas_wei: "1000000000",
});
assert.deepEqual(
  planned.rpc_methods_used,
  [
    "eth_chainId",
    "eth_getTransactionCount",
    "eth_gasPrice",
    "eth_estimateGas",
    "eth_getBalance",
  ],
);
const estimate = calls.find((entry) => entry.method === "eth_estimateGas");
assert.ok(estimate);
assert.deepEqual(estimate.params, [
  {
    from: WALLET,
    to: CONTRACT,
    value: "0x0",
    data: call.calldata,
  },
  "pending",
]);
assert.equal(planned.mutation_performed, false);
assert.equal(planned.wallet_access_performed, false);
assert.equal(planned.signing_performed, false);
assert.equal(planned.transaction_broadcast_performed, false);
assert.equal(planned.money_movement_performed, false);

async function expectHeld(
  name: string,
  expectedReason: string,
  options: {
    attempt?: BuyVoidExecutionAttemptStateV1;
    call?: any;
    policy?: BuyVoidPaymentKeyedTransactionPreparationPolicyV1;
    overrides?: Overrides;
  } = {},
) {
  const heldCalls: BuyVoidPaymentKeyedTransactionPreparationRpcCallV1[] = [];
  const decision = await runBuyVoidPaymentKeyedTransactionPreparationV1({
    attempt: options.attempt || baseAttempt,
    fulfillment_call: options.call || call,
    policy: options.policy || policy,
    transport: transportFor(heldCalls, options.overrides),
  });
  if (decision.ok) throw new Error(name + "_unexpected_ready");
  assert.equal(decision.ok, false, name);
  assert.equal(decision.reason, expectedReason, name);
  assert.equal(decision.signing_performed, false, name);
  assert.equal(decision.transaction_broadcast_performed, false, name);
  assert.equal(decision.money_movement_performed, false, name);
  return { decision, calls: heldCalls };
}

const wrongAttempt = attempt({ attempt_id: "b".repeat(64) });
await expectHeld(
  "attempt_mismatch",
  "payment_keyed_transaction_preparation_fulfillment_call_invalid",
  { attempt: wrongAttempt },
);

await expectHeld(
  "contract_mismatch",
  "payment_keyed_transaction_preparation_fulfillment_call_invalid",
  {
    policy: {
      ...policy,
      fulfillment_contract_address: "0x" + "7".repeat(40),
    },
  },
);

await expectHeld(
  "calldata_mismatch",
  "payment_keyed_transaction_preparation_calldata_mismatch",
  {
    call: {
      ...call,
      calldata: call.calldata.slice(0, -2) + "00",
    },
  },
);

await expectHeld(
  "fingerprint_mismatch",
  "payment_keyed_transaction_preparation_call_fingerprint_mismatch",
  {
    call: {
      ...call,
      call_fingerprint_sha256: "f".repeat(64),
    },
  },
);

await expectHeld(
  "chain_mismatch",
  "payment_keyed_transaction_preparation_chain_id_mismatch",
  {
    overrides: {
      eth_chainId: "0x1",
    },
  },
);

await expectHeld(
  "gas_estimate_invalid",
  "payment_keyed_transaction_preparation_fulfillment_gas_estimate_invalid",
  {
    overrides: {
      eth_estimateGas: "0x0",
    },
  },
);

await expectHeld(
  "insufficient_gas_balance",
  "payment_keyed_transaction_preparation_insufficient_native_gas_balance",
  {
    overrides: {
      eth_getBalance: "0x1",
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
const hostileResult = await runBuyVoidPaymentKeyedTransactionPreparationV1({
  attempt: baseAttempt,
  fulfillment_call: {
    ...call,
    fulfillment_contract_address: hostile as any,
  },
  policy,
  transport: transportFor([]),
});
assert.equal(hostileResult.ok, false);
if (hostileResult.ok) throw new Error("hostile_contract_unexpected_ready");
assert.equal(
  hostileResult.reason,
  "payment_keyed_transaction_preparation_fulfillment_call_invalid",
);
assert.equal(coercions, 0);

assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_TRANSACTION_PREPARATION_AUTHORITY_V1
    .payment_keyed_fulfillment_call_required,
  true,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_TRANSACTION_PREPARATION_AUTHORITY_V1
    .legacy_void_token_transfer_authority,
  false,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_TRANSACTION_PREPARATION_AUTHORITY_V1.signing,
  false,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_TRANSACTION_PREPARATION_AUTHORITY_V1
    .transaction_broadcast,
  false,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_TRANSACTION_PREPARATION_AUTHORITY_V1
    .money_movement,
  false,
);

console.log("VOID_BUY_VOID_PAYMENT_KEYED_TRANSACTION_PREPARATION_V1_PROOF_GREEN");
console.log("exact_merged_payment_keyed_call_consumed=true");
console.log("fulfillment_contract_is_transaction_target=true");
console.log("exact_fulfill_calldata_estimated=true");
console.log("legacy_void_token_transfer_authority=false");
console.log("pending_nonce_bound=true");
console.log("gas_and_fee_caps_bound=true");
console.log("native_gas_balance_checked=true");
console.log("call_fingerprint_rederived=true");
console.log("authority_string_coercion_executed=false");
console.log("wallet_access=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("money_movement=false");
