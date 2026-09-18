#!/usr/bin/env node
import assert from "node:assert/strict";
import { Interface } from "ethers";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_V1,
  buildBuyVoidPaymentKeyedFulfillmentCallV1,
  type BuyVoidVerifiedSourceFinalityPaymentBindingV1,
} from "../src/economic/buy_void_payment_keyed_fulfillment_call_v1.js";
import {
  VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
  type BuyVoidExecutionAttemptStateV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";
import {
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
} from "../src/economic/buy_void_source_finality_execution_preflight_v1.js";

const IDENTITY =
  "voidpay1:base:0x" + "a".repeat(64) + ":7";
const ATTEMPT_ID = "1".repeat(64);
const LEGACY_KEY = "2".repeat(64);
const CANONICAL_KEY = "3".repeat(64);
const DELIVERY = "0x" + "4".repeat(40);
const CONTRACT = "0x" + "5".repeat(40);
const FULFILLMENT = new Interface([
  "function fulfill(bytes32 paymentDeliveryId,address recipient,uint256 amountAtoms)",
]);

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
      request_key_sha256: "6".repeat(64),
      canonical_payment_identity: IDENTITY,
      request_id: "buyvoid-payment-keyed-call-v1",
      instruction_id: "7".repeat(64),
      intent_fingerprint: "8".repeat(64),
      max_attempts_per_payment: 1,
      unsigned_instruction: {
        schema: "void_buy_void_unsigned_fulfillment_instruction_v1",
        marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
        instruction_id: "7".repeat(64),
        request_id: "buyvoid-payment-keyed-call-v1",
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

function finality(
  overrides: Record<string, unknown> = {},
): BuyVoidVerifiedSourceFinalityPaymentBindingV1 {
  return {
    marker: VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
    version: 1,
    status: "ready",
    attempt_id: ATTEMPT_ID,
    source_chain: "base",
    canonical_payment_identity: IDENTITY,
    payment_key_sha256: CANONICAL_KEY,
    production_source_finality_authority_ready: true,
    ...overrides,
  } as BuyVoidVerifiedSourceFinalityPaymentBindingV1;
}

const policy = {
  chain_id: "2050" as const,
  fulfillment_contract_address: CONTRACT,
  max_void_amount_units: "10000000000000",
};

let authorityStringCoercions = 0;
const hostileStringLike = {
  [Symbol.toPrimitive]() {
    authorityStringCoercions += 1;
    return IDENTITY;
  },
};

const hostileAttemptId = buildBuyVoidPaymentKeyedFulfillmentCallV1({
  attempt: attempt({ attempt_id: hostileStringLike as any }),
  source_finality: finality(),
  policy,
});
assert.equal(hostileAttemptId.ok, false);
if (hostileAttemptId.ok) throw new Error("hostile_attempt_id_unexpected_ready");
assert.equal(hostileAttemptId.reason, "payment_keyed_fulfillment_attempt_invalid");

const hostileFinalityAttemptId = buildBuyVoidPaymentKeyedFulfillmentCallV1({
  attempt: attempt(),
  source_finality: finality({
    attempt_id: hostileStringLike,
  }) as any,
  policy,
});
assert.equal(hostileFinalityAttemptId.ok, false);
if (hostileFinalityAttemptId.ok) {
  throw new Error("hostile_finality_attempt_id_unexpected_ready");
}
assert.equal(
  hostileFinalityAttemptId.reason,
  "payment_keyed_fulfillment_source_finality_attempt_mismatch",
);

const hostileCanonicalIdentity = buildBuyVoidPaymentKeyedFulfillmentCallV1({
  attempt: attempt(),
  source_finality: finality({
    canonical_payment_identity: hostileStringLike,
  }) as any,
  policy,
});
assert.equal(hostileCanonicalIdentity.ok, false);
if (hostileCanonicalIdentity.ok) {
  throw new Error("hostile_canonical_identity_unexpected_ready");
}
assert.equal(
  hostileCanonicalIdentity.reason,
  "payment_keyed_fulfillment_canonical_identity_invalid",
);

const hostileContract = buildBuyVoidPaymentKeyedFulfillmentCallV1({
  attempt: attempt(),
  source_finality: finality(),
  policy: {
    ...policy,
    fulfillment_contract_address: hostileStringLike as any,
  },
});
assert.equal(hostileContract.ok, false);
if (hostileContract.ok) throw new Error("hostile_contract_unexpected_ready");
assert.equal(hostileContract.reason, "payment_keyed_fulfillment_address_invalid");
assert.equal(authorityStringCoercions, 0);

const ready = buildBuyVoidPaymentKeyedFulfillmentCallV1({
  attempt: attempt(),
  source_finality: finality(),
  policy,
});
if (ready.ok === false) throw new Error(ready.reason);
assert.equal(ready.ok, true);
assert.equal(ready.marker, VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_V1);
assert.equal(ready.canonical_payment_key_sha256, CANONICAL_KEY);
assert.equal(ready.legacy_local_payment_key_sha256, LEGACY_KEY);
assert.equal(ready.legacy_local_payment_key_chain_authority, false);
assert.equal(ready.fulfillment_contract_address, CONTRACT);
assert.equal(ready.delivery_address, DELIVERY);
assert.equal(ready.void_amount_units, "2000000");
assert.equal(ready.token_amount_atoms, "2000000000000000000");
assert.equal(ready.value_wei, "0");
const decoded = FULFILLMENT.decodeFunctionData("fulfill", ready.calldata);
assert.equal(String(decoded[0]).toLowerCase(), `0x${CANONICAL_KEY}`);
assert.equal(String(decoded[1]).toLowerCase(), DELIVERY);
assert.equal(BigInt(decoded[2]), 2_000_000_000_000_000_000n);

const changedLegacy = buildBuyVoidPaymentKeyedFulfillmentCallV1({
  attempt: attempt({ payment_key_sha256: "9".repeat(64) }),
  source_finality: finality(),
  policy,
});
if (changedLegacy.ok === false) throw new Error(changedLegacy.reason);
assert.equal(changedLegacy.ok, true);
assert.equal(changedLegacy.calldata, ready.calldata);
assert.equal(
  changedLegacy.call_fingerprint_sha256,
  ready.call_fingerprint_sha256,
);
assert.notEqual(
  changedLegacy.legacy_local_payment_key_sha256,
  ready.legacy_local_payment_key_sha256,
);

const changedCanonical = buildBuyVoidPaymentKeyedFulfillmentCallV1({
  attempt: attempt(),
  source_finality: finality({ payment_key_sha256: "b".repeat(64) }) as any,
  policy,
});
if (changedCanonical.ok === false) throw new Error(changedCanonical.reason);
assert.equal(changedCanonical.ok, true);
assert.notEqual(changedCanonical.calldata, ready.calldata);
assert.notEqual(
  changedCanonical.call_fingerprint_sha256,
  ready.call_fingerprint_sha256,
);

for (const [name, value, reason] of [
  [
    "not_ready",
    finality({ production_source_finality_authority_ready: false }),
    "payment_keyed_fulfillment_source_finality_not_ready",
  ],
  [
    "attempt_mismatch",
    finality({ attempt_id: "9".repeat(64) }),
    "payment_keyed_fulfillment_source_finality_attempt_mismatch",
  ],
  [
    "identity_mismatch",
    finality({
      canonical_payment_identity:
        "voidpay1:base:0x" + "c".repeat(64) + ":7",
    }),
    "payment_keyed_fulfillment_canonical_identity_mismatch",
  ],
  [
    "chain_mismatch",
    finality({ source_chain: "ethereum" }),
    "payment_keyed_fulfillment_canonical_identity_mismatch",
  ],
  [
    "bad_key",
    finality({ payment_key_sha256: "not-a-key" }),
    "payment_keyed_fulfillment_payment_key_invalid",
  ],
] as const) {
  const decision = buildBuyVoidPaymentKeyedFulfillmentCallV1({
    attempt: attempt(),
    source_finality: value as any,
    policy,
  });
  if (decision.ok) throw new Error(`${name}_unexpected_ready`);
  assert.equal(decision.ok, false, name);
  assert.equal(decision.reason, reason, name);
}

const badContract = buildBuyVoidPaymentKeyedFulfillmentCallV1({
  attempt: attempt(),
  source_finality: finality(),
  policy: { ...policy, fulfillment_contract_address: "0x0" },
});
if (badContract.ok) throw new Error("bad_contract_unexpected_ready");
assert.equal(badContract.ok, false);
assert.equal(badContract.reason, "payment_keyed_fulfillment_address_invalid");

const overAmount = buildBuyVoidPaymentKeyedFulfillmentCallV1({
  attempt: attempt({
    unsigned_instruction: {
      ...attempt().reservation.unsigned_instruction,
      void_amount_units: "10000000000001",
    },
  }),
  source_finality: finality(),
  policy,
});
if (overAmount.ok) throw new Error("over_amount_unexpected_ready");
assert.equal(overAmount.ok, false);
assert.equal(
  overAmount.reason,
  "payment_keyed_fulfillment_amount_out_of_policy",
);

assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_AUTHORITY_V1
    .legacy_local_payment_key_is_not_chain_authority,
  true,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_AUTHORITY_V1.signing,
  false,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_AUTHORITY_V1
    .transaction_broadcast,
  false,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_AUTHORITY_V1.money_movement,
  false,
);

console.log("VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_V1_PROOF_GREEN");
console.log("canonical_source_finality_key_drives_calldata=true");
console.log("legacy_local_payment_key_chain_authority=false");
console.log("legacy_local_payment_key_changes_calldata=false");
console.log("source_finality_ready_required=true");
console.log("source_finality_attempt_id_bound=true");
console.log("authority_string_coercion_executed=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("money_movement=false");
