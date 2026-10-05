#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  type BuyVoidRequestV1,
} from "../src/economic/buy_void_auto_fulfillment_v1.js";
import {
  buildBuyVoidVerifiedPaymentEventV2,
  type BuyVoidVerifiedPaymentEventV2,
} from "../src/economic/buy_void_verified_payment_v2.js";
import {
  VOID_BUY_VOID_VERIFIED_PAYMENT_DUPLICATE_GUARD_AUTHORITY_V1,
  VOID_BUY_VOID_VERIFIED_PAYMENT_DUPLICATE_GUARD_V1,
  classifyBuyVoidVerifiedPaymentDuplicateGuardV1,
  testOnlyVerifiedPaymentIdentityV1,
} from "../src/economic/buy_void_verified_payment_duplicate_guard_v1.js";

const txHash = `0x${"a".repeat(64)}`;
const otherTxHash = `0x${"b".repeat(64)}`;
const delivery = `0x${"1".repeat(40)}`;
const receiver = `0x${"2".repeat(40)}`;
const usdc = `0x${"3".repeat(40)}`;
const transferTopic =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const addressTopic = (address: string): string =>
  `0x${"0".repeat(24)}${address.slice(2)}`;

function verifiedEvent(
  requestId: string,
  logIndex: number,
): BuyVoidVerifiedPaymentEventV2 {
  const request: BuyVoidRequestV1 = {
    request_id: requestId,
    source_chain: "base",
    tx_hash: txHash,
    delivery_address: delivery,
    receive_address: receiver,
    usdc_amount: "12.5",
    quoted_void: "25",
  };
  const decision = buildBuyVoidVerifiedPaymentEventV2({
    request,
    receipt: {
      status: "0x1",
      transactionHash: txHash,
      blockNumber: "0x64",
      logs: [
        {
          address: usdc,
          topics: [
            transferTopic,
            addressTopic(delivery),
            addressTopic(receiver),
          ],
          data: "0xbebc20",
          logIndex: "0x" + logIndex.toString(16),
          transactionHash: txHash,
          blockNumber: "0x64",
        },
      ],
    },
    policy: {
      allowed_chains: ["base"],
      usdc_contract_by_chain: { base: usdc },
      receive_address_by_chain: { base: receiver },
      current_block_number_by_chain: { base: "0x65" },
    },
  });
  if (decision.ok !== true) {
    throw new Error(decision.reason);
  }
  return decision.event;
}

const eventA = verifiedEvent("buyvoid_dup_a", 7);
const eventB = verifiedEvent("buyvoid_dup_b", 7);
const eventC = verifiedEvent("buyvoid_dup_c", 8);

assert.equal(
  testOnlyVerifiedPaymentIdentityV1(eventA),
  `voidpay1:base:${txHash}:7`,
);
assert.equal(
  testOnlyVerifiedPaymentIdentityV1(eventC),
  `voidpay1:base:${txHash}:8`,
);

const available =
  classifyBuyVoidVerifiedPaymentDuplicateGuardV1({
    candidate_event: eventA,
    existing_events: [],
  });
if (available.ok !== true) {
  throw new Error("expected duplicate guard available");
}
assert.equal(available.ok, true);
assert.equal(available.status, "available");
assert.equal(available.idempotent, false);
assert.equal(
  available.canonical_payment_identity,
  `voidpay1:base:${txHash}:7`,
);

const idempotent =
  classifyBuyVoidVerifiedPaymentDuplicateGuardV1({
    candidate_event: eventA,
    existing_events: [
      { operator_status: "reviewed", request_id: eventA.request_id },
      eventA,
    ],
  });
if (idempotent.ok !== true) {
  throw new Error("expected duplicate guard idempotent");
}
assert.equal(idempotent.ok, true);
assert.equal(idempotent.status, "idempotent");
assert.equal(idempotent.idempotent, true);
assert.equal(idempotent.existing_verified_payment_event_count, 1);

const duplicate =
  classifyBuyVoidVerifiedPaymentDuplicateGuardV1({
    candidate_event: eventB,
    existing_events: [eventA],
  });
assert.equal(duplicate.ok, false);
if (duplicate.ok) throw new Error("expected duplicate identity HOLD");
assert.equal(
  duplicate.reason,
  "duplicate_payment_identity_already_claimed",
);

const distinctLog =
  classifyBuyVoidVerifiedPaymentDuplicateGuardV1({
    candidate_event: eventC,
    existing_events: [eventA],
  });
if (distinctLog.ok !== true) {
  throw new Error("expected distinct transfer-log identity available");
}
assert.equal(distinctLog.ok, true);
assert.equal(distinctLog.status, "available");
assert.equal(
  distinctLog.canonical_payment_identity,
  `voidpay1:base:${txHash}:8`,
);

const existingDuplicateConflict =
  classifyBuyVoidVerifiedPaymentDuplicateGuardV1({
    candidate_event: eventC,
    existing_events: [eventA, eventB],
  });
assert.equal(existingDuplicateConflict.ok, false);
if (existingDuplicateConflict.ok) {
  throw new Error("expected existing duplicate-history HOLD");
}
assert.equal(
  existingDuplicateConflict.reason,
  "existing_duplicate_payment_identity_conflict",
);

const eventCRelabeledToA = {
  ...eventC,
  request_id: eventA.request_id,
};
const existingRequestConflict =
  classifyBuyVoidVerifiedPaymentDuplicateGuardV1({
    candidate_event: eventC,
    existing_events: [eventA, eventCRelabeledToA],
  });
assert.equal(existingRequestConflict.ok, false);
if (existingRequestConflict.ok) {
  throw new Error("expected existing request-identity conflict HOLD");
}
assert.equal(
  existingRequestConflict.reason,
  "existing_request_payment_identity_conflict",
);

const requestIdentityConflict =
  classifyBuyVoidVerifiedPaymentDuplicateGuardV1({
    candidate_event: eventCRelabeledToA,
    existing_events: [eventA],
  });
assert.equal(requestIdentityConflict.ok, false);
if (requestIdentityConflict.ok) {
  throw new Error("expected candidate request-identity conflict HOLD");
}
assert.equal(
  requestIdentityConflict.reason,
  "request_payment_identity_conflict",
);

const legacyHistory =
  classifyBuyVoidVerifiedPaymentDuplicateGuardV1({
    candidate_event: eventC,
    existing_events: [
      {
        request_id: "buyvoid_legacy_a",
        operator_status: "payment_verified",
        payment_verified: true,
        tx_hash: txHash,
      },
    ],
  });
assert.equal(legacyHistory.ok, false);
if (legacyHistory.ok) throw new Error("expected legacy history HOLD");
assert.equal(
  legacyHistory.reason,
  "existing_verified_payment_identity_incomplete",
);

const incompleteCandidate = structuredClone(eventA) as any;
delete incompleteCandidate.payment_verifier.log_index;
const incomplete =
  classifyBuyVoidVerifiedPaymentDuplicateGuardV1({
    candidate_event: incompleteCandidate,
    existing_events: [],
  });
assert.equal(incomplete.ok, false);
if (incomplete.ok) throw new Error("expected incomplete candidate HOLD");
assert.equal(
  incomplete.reason,
  "candidate_canonical_payment_identity_invalid",
);

const outerMismatchCandidate = {
  ...eventA,
  tx_hash: otherTxHash,
};
const outerMismatch =
  classifyBuyVoidVerifiedPaymentDuplicateGuardV1({
    candidate_event: outerMismatchCandidate,
    existing_events: [],
  });
assert.equal(outerMismatch.ok, false);
if (outerMismatch.ok) throw new Error("expected outer tx mismatch HOLD");
assert.equal(
  outerMismatch.reason,
  "candidate_payment_transaction_hash_mismatch",
);

const malformedHistory =
  classifyBuyVoidVerifiedPaymentDuplicateGuardV1({
    candidate_event: eventA,
    existing_events: [null],
  });
assert.equal(malformedHistory.ok, false);
if (malformedHistory.ok) throw new Error("expected malformed history HOLD");
assert.equal(
  malformedHistory.reason,
  "duplicate_guard_history_event_invalid",
);

const oversizedHistory =
  classifyBuyVoidVerifiedPaymentDuplicateGuardV1({
    candidate_event: eventA,
    existing_events: Array.from(
      { length: 100_001 },
      () => ({ operator_status: "reviewed" }),
    ),
  });
assert.equal(oversizedHistory.ok, false);
if (oversizedHistory.ok) throw new Error("expected history bound HOLD");
assert.equal(
  oversizedHistory.reason,
  "duplicate_guard_history_invalid",
);

assert.deepEqual(
  VOID_BUY_VOID_VERIFIED_PAYMENT_DUPLICATE_GUARD_AUTHORITY_V1,
  {
    source_contract: true,
    canonical_payment_identity_reuse: true,
    in_memory_history_validation: true,
    runtime_integration: false,
    filesystem_read: false,
    filesystem_write: false,
    payment_receipt_verification: false,
    payment_verified_event_write: false,
    inventory_reservation_write: false,
    allocation_reservation_write: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  },
);

console.log(VOID_BUY_VOID_VERIFIED_PAYMENT_DUPLICATE_GUARD_V1 + "_GREEN");
console.log("canonical_identity_scheme=voidpay1:chain:tx_hash:log_index");
console.log("same_identity_different_request_rejected=true");
console.log("same_request_same_identity_idempotent=true");
console.log("same_tx_different_log_index_distinct=true");
console.log("legacy_verified_payment_history_fail_closed=true");
console.log("existing_history_conflicts_fail_closed=true");
console.log("runtime_integration=false");
console.log("payment_verified_event_write=false");
console.log("allocation_reservation_write=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
