import assert from "node:assert/strict";

import {
  VOID_BUY_VOID_VERIFIED_PAYMENT_IDENTITY_ADMISSION_AUTHORITY_V1,
  assertBuyVoidVerifiedPaymentIdentityAdmissionV1,
  classifyBuyVoidVerifiedPaymentIdentityAdmissionV1,
} from "../src/economic/buy_void_verified_payment_identity_admission_v1.js";

const tx = (digit: string) => "0x" + digit.repeat(64);

const request = (
  requestId: string,
  transactionHash: string,
) => ({
  request_id: requestId,
  source_chain: "base",
  tx_hash: transactionHash,
  quoted_void: 4,
});

const event = (
  value: ReturnType<typeof request>,
  logIndex: number,
  markedAt: number,
) => ({
  schema: "void_buy_void_verified_payment_event_v2",
  marker: "VOID_BUY_VOID_VERIFIED_PAYMENT_V2",
  request_id: value.request_id,
  operator_status: "payment_verified",
  payment_verified: true,
  payment_identity_input_complete: true,
  marked_at_ms: markedAt,
  tx_hash: value.tx_hash,
  quoted_void: value.quoted_void,
  payment_verifier: {
    chain: value.source_chain,
    transaction_hash: value.tx_hash,
    log_index: String(logIndex),
  },
});

const a = request("buyvoid_a_aaaaaaaa", tx("a"));
const bSamePayment = request("buyvoid_b_bbbbbbbb", tx("a"));
const bOtherPayment = request("buyvoid_b_bbbbbbbb", tx("b"));

const aEvent = event(a, 7, 1);
const fresh = classifyBuyVoidVerifiedPaymentIdentityAdmissionV1({
  request: a,
  event: aEvent,
  operator_events: [],
});
assert.equal(fresh.ready, true);
assert.equal(fresh.already_verified, false);
assert.match(
  fresh.canonical_payment_identity,
  /^voidpay1:base:0x[a-f0-9]{64}:7$/u,
);

const replay = classifyBuyVoidVerifiedPaymentIdentityAdmissionV1({
  request: bSamePayment,
  event: event(bSamePayment, 7, 2),
  operator_events: [aEvent],
});
assert.equal(replay.ready, false);
assert.equal(
  replay.reason,
  "buy_void_verified_payment_identity_reused",
);

const exactReplay = assertBuyVoidVerifiedPaymentIdentityAdmissionV1({
  request: a,
  event: event(a, 7, 3),
  operator_events: [aEvent],
});
assert.equal(exactReplay.already_verified, true);

const changedRequestPayment =
  classifyBuyVoidVerifiedPaymentIdentityAdmissionV1({
    request: a,
    event: event(a, 8, 4),
    operator_events: [aEvent],
  });
assert.equal(changedRequestPayment.ready, false);
assert.equal(
  changedRequestPayment.reason,
  "buy_void_verified_payment_identity_request_changed",
);

const differentPayment =
  classifyBuyVoidVerifiedPaymentIdentityAdmissionV1({
    request: bOtherPayment,
    event: event(bOtherPayment, 7, 5),
    operator_events: [aEvent],
  });
assert.equal(differentPayment.ready, true);
assert.equal(differentPayment.already_verified, false);

const sameTransactionDifferentLog =
  classifyBuyVoidVerifiedPaymentIdentityAdmissionV1({
    request: bSamePayment,
    event: event(bSamePayment, 9, 6),
    operator_events: [aEvent],
  });
assert.equal(sameTransactionDifferentLog.ready, true);

assert.throws(
  () =>
    classifyBuyVoidVerifiedPaymentIdentityAdmissionV1({
      request: bOtherPayment,
      event: event(bOtherPayment, 7, 7),
      operator_events: [
        {
          request_id: a.request_id,
          operator_status: "payment_verified",
          payment_verified: true,
        },
      ],
    }),
  /buy_void_verified_payment_identity_event_provenance_invalid/u,
);

assert.throws(
  () =>
    classifyBuyVoidVerifiedPaymentIdentityAdmissionV1({
      request: bOtherPayment,
      event: event(bOtherPayment, 7, 8),
      operator_events: [
        aEvent,
        event(bSamePayment, 7, 9),
      ],
    }),
  /buy_void_verified_payment_identity_history_reused/u,
);

const mismatchedRequest = {
  ...a,
  tx_hash: tx("c"),
};
assert.throws(
  () =>
    classifyBuyVoidVerifiedPaymentIdentityAdmissionV1({
      request: mismatchedRequest,
      event: aEvent,
      operator_events: [],
    }),
  /buy_void_verified_payment_identity_request_binding_mismatch/u,
);

for (const [key, value] of Object.entries(
  VOID_BUY_VOID_VERIFIED_PAYMENT_IDENTITY_ADMISSION_AUTHORITY_V1,
)) {
  if (
    [
      "source_contract",
      "canonical_payment_identity_validation",
      "strict_verified_history_collision_detection",
    ].includes(key)
  ) {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

console.log("VOID_BUY_VOID_VERIFIED_PAYMENT_IDENTITY_ADMISSION_V1_GREEN");
console.log("one_payment_identity_one_request=true");
console.log("same_request_different_identity_rejected=true");
console.log("same_transaction_different_log_identity_distinct=true");
console.log("incomplete_verified_history_fails_closed=true");
console.log("filesystem_write=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
