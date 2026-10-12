#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  buyVoidExecutionAttemptIntentFingerprintV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_HISTORY_RECONCILIATION_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_HISTORY_RECONCILIATION_V1,
  buyVoidPaymentKeyedInventoryIntentFingerprintV1,
  reconcileBuyVoidPaymentKeyedDurableHistoryV1,
} from "../src/economic/buy_void_payment_keyed_history_reconciliation_v1.js";

const POOL = "buy-void-presale-v1";
const ADDRESS_A = "0x" + "1".repeat(40);
const ADDRESS_B = "0x" + "2".repeat(40);
const PAYMENT_A = "a".repeat(64);
const PAYMENT_B = "b".repeat(64);
const REQUEST_A = "c".repeat(64);
const REQUEST_B = "d".repeat(64);

function intent(options: {
  payment: string;
  requestKey: string;
  requestId: string;
  instructionId: string;
  address: string;
  amount: string;
  txChar: string;
  logIndex: string;
}): any {
  const tx = "0x" + options.txChar.repeat(64);
  const identity =
    `voidpay1:base:${tx}:${options.logIndex}`;
  return {
    schema: "void_buy_void_fulfillment_journal_intent_v1",
    marker: "VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1",
    created_at_ms: 1770000000000,
    payment_key_sha256: options.payment,
    request_key_sha256: options.requestKey,
    claim: {
      schema: "void_buy_void_fulfillment_claim_v1",
      status: "claimed",
      canonical_payment_identity: identity,
      request_id: options.requestId,
      instruction_id: options.instructionId,
      unsigned_instruction: {
        schema: "void_buy_void_unsigned_fulfillment_instruction_v1",
        source_chain: "base",
        payment_transaction_hash: tx,
        payment_log_index: options.logIndex,
        delivery_address: options.address,
        void_amount_units: options.amount,
      },
    },
    verification_binding: {
      source_chain: "base",
      payment_transaction_hash: tx,
      payment_log_index: options.logIndex,
      confirmed_block_number: "100",
      confirmation_count_at_claim: "12",
      usdc_contract: "0x" + "3".repeat(40),
      payer_address: "0x" + "4".repeat(40),
      receive_address: "0x" + "5".repeat(40),
      delivery_address: options.address,
      payment_usdc_units: "500000",
      requested_usdc_units: "500000",
      quoted_void_units: options.amount,
    },
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    money_movement_authorized: false,
  };
}

const reservedIntent = intent({
  payment: PAYMENT_A,
  requestKey: REQUEST_A,
  requestId: "buyvoid-history-a",
  instructionId: "voidfill-history-a",
  address: ADDRESS_A,
  amount: "1000000",
  txChar: "6",
  logIndex: "7",
});

const obligationIntent = intent({
  payment: PAYMENT_B,
  requestKey: REQUEST_B,
  requestId: "buyvoid-history-b",
  instructionId: "voidfill-history-b",
  address: ADDRESS_B,
  amount: "2000000",
  txChar: "7",
  logIndex: "8",
});

function inventory(): any {
  return {
    schema: "void_buy_void_inventory_reservation_v1",
    marker: "VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1",
    reservation_id: "e".repeat(64),
    payment_key_sha256: PAYMENT_A,
    request_key_sha256: REQUEST_A,
    canonical_payment_identity:
      reservedIntent.claim.canonical_payment_identity,
    request_id: reservedIntent.claim.request_id,
    instruction_id: reservedIntent.claim.instruction_id,
    delivery_address: ADDRESS_A,
    reserved_void_units: "1000000",
    intent_fingerprint:
      buyVoidPaymentKeyedInventoryIntentFingerprintV1(
        reservedIntent,
      ),
  };
}

function attempt(): any {
  return {
    status: "reserved",
    reservation: {
      attempt_id: "f".repeat(64),
      payment_key_sha256: PAYMENT_A,
      request_key_sha256: REQUEST_A,
      canonical_payment_identity:
        reservedIntent.claim.canonical_payment_identity,
      request_id: reservedIntent.claim.request_id,
      instruction_id: reservedIntent.claim.instruction_id,
      intent_fingerprint:
        buyVoidExecutionAttemptIntentFingerprintV1(
          reservedIntent,
        ),
      unsigned_instruction: {
        delivery_address: ADDRESS_A,
        void_amount_units: "1000000",
      },
    },
    prepared: null,
    broadcast: null,
    failure: null,
    postbroadcast_failure: null,
    confirmation: null,
  };
}

function obligation(): any {
  return {
    schema: "void_buy_void_paid_unreservable_obligation_v1",
    marker: "VOID_BUY_VOID_PAID_UNRESERVABLE_OBLIGATION_V1",
    obligation_id: "9".repeat(64),
    payment_key_sha256: PAYMENT_B,
    request_key_sha256: REQUEST_B,
    canonical_payment_identity:
      obligationIntent.claim.canonical_payment_identity,
    request_id: obligationIntent.claim.request_id,
    instruction_id: obligationIntent.claim.instruction_id,
    delivery_address: ADDRESS_B,
    requested_void_units: "2000000",
    source_chain: "base",
    payment_transaction_hash:
      obligationIntent.verification_binding
        .payment_transaction_hash,
    payment_log_index: "8",
    confirmed_block_number: "100",
    confirmation_count_at_claim: "12",
    payment_usdc_units: "500000",
  };
}

function run(options: {
  intents?: any[];
  inventory?: any[];
  obligations?: any[];
  attempts?: any[];
} = {}) {
  return reconcileBuyVoidPaymentKeyedDurableHistoryV1({
    root_dir: "/tmp/void-history-proof",
    pool_id: POOL,
    dependencies: {
      list_intents: () =>
        options.intents || [
          reservedIntent,
          obligationIntent,
        ],
      list_inventory: () =>
        options.inventory || [inventory()],
      list_obligations: () =>
        options.obligations || [obligation()],
      list_attempts: () =>
        options.attempts || [attempt()],
    },
  });
}

const ready = run();
if (ready.ok === false) throw new Error(ready.reason);
assert.equal(
  ready.marker,
  VOID_BUY_VOID_PAYMENT_KEYED_HISTORY_RECONCILIATION_V1,
);
assert.equal(ready.status, "reconciled_read_only");
assert.equal(ready.intent_count, 2);
assert.equal(ready.inventory_reservation_count, 1);
assert.equal(ready.paid_unreservable_obligation_count, 1);
assert.equal(ready.execution_attempt_count, 1);
assert.equal(ready.unresolved_intent_count, 0);
assert.equal(ready.saga_binding_input_count, 1);
assert.match(ready.history_fingerprint_sha256, /^[0-9a-f]{64}$/);
assert.equal(ready.mutation_performed, false);
assert.equal(ready.automatic_retry_allowed, false);

const noAttemptYet = run({ attempts: [] });
if (noAttemptYet.ok === false) {
  throw new Error(noAttemptYet.reason);
}
assert.equal(noAttemptYet.execution_attempt_count, 0);
assert.equal(noAttemptYet.inventory_reservation_count, 1);

{
  const value = inventory();
  value.canonical_payment_identity = "wrong";
  const result = run({ inventory: [value] });
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("expected hold");
  assert.equal(
    result.reason,
    "payment_keyed_history_inventory_intent_match_invalid",
  );
}

{
  const value = inventory();
  value.intent_fingerprint = "0".repeat(64);
  const result = run({ inventory: [value] });
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("expected hold");
  assert.equal(
    result.reason,
    "payment_keyed_history_inventory_intent_match_invalid",
  );
}

{
  const value = attempt();
  value.reservation.request_key_sha256 = "1".repeat(64);
  const result = run({ attempts: [value] });
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("expected hold");
  assert.equal(
    result.reason,
    "payment_keyed_history_attempt_intent_match_invalid",
  );
}

{
  const duplicate = {
    ...reservedIntent,
    claim: {
      ...reservedIntent.claim,
      request_id: "conflicting-request",
    },
  };
  const result = run({
    intents: [
      reservedIntent,
      duplicate,
      obligationIntent,
    ],
  });
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("expected hold");
  assert.equal(
    result.reason,
    "payment_keyed_history_duplicate_intent_payment_key",
  );
}

{
  const conflictInventory = {
    ...inventory(),
    reservation_id: "8".repeat(64),
    payment_key_sha256: PAYMENT_B,
    request_key_sha256: REQUEST_B,
    canonical_payment_identity:
      obligationIntent.claim.canonical_payment_identity,
    request_id: obligationIntent.claim.request_id,
    instruction_id: obligationIntent.claim.instruction_id,
    delivery_address: ADDRESS_B,
    reserved_void_units: "2000000",
    intent_fingerprint:
      buyVoidPaymentKeyedInventoryIntentFingerprintV1(
        obligationIntent,
      ),
  };
  const result = run({
    inventory: [inventory(), conflictInventory],
  });
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("expected hold");
  assert.equal(
    result.reason,
    "payment_keyed_history_obligation_execution_conflict",
  );
}

for (const [key, expected] of Object.entries({
  filesystem_read: true,
  filesystem_write: false,
  saga_binding_inputs_reconciled: true,
  saga_store_mutation: false,
  credential_access: false,
  wallet_access: false,
  rpc_call: false,
  signing: false,
  transaction_broadcast: false,
  runtime_activation: false,
  public_activation: false,
  automatic_retry: false,
  money_movement: false,
})) {
  assert.equal(
    (VOID_BUY_VOID_PAYMENT_KEYED_HISTORY_RECONCILIATION_AUTHORITY_V1 as any)[key],
    expected,
    key,
  );
}

console.log(
  "VOID_BUY_VOID_PAYMENT_KEYED_HISTORY_RECONCILIATION_V1_PROOF_GREEN",
);
console.log("inventory_history_full_identity_bound=true");
console.log("attempt_history_full_identity_bound=true");
console.log("obligation_history_full_identity_bound=true");
console.log("saga_binding_inputs_reconciled=true");
console.log("reservation_without_attempt_allowed=true");
console.log("filesystem_write=false");
console.log("wallet_access=false");
console.log("rpc_call=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("runtime_activation=false");
console.log("public_activation=false");
console.log("automatic_retry=false");
console.log("money_movement=false");
