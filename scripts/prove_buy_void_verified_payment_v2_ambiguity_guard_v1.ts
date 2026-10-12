import assert from "node:assert/strict";
import {
  canonicalBuyVoidPaymentIdentityV1,
  decideBuyVoidAutoFulfillmentV1,
  type BuyVoidAutoFulfillmentPolicyV1,
  type BuyVoidRequestV1,
} from "../src/economic/buy_void_auto_fulfillment_v1.js";
import {
  buildBuyVoidVerifiedPaymentEventV2,
  type BuyVoidTransactionReceiptV2,
} from "../src/economic/buy_void_verified_payment_v2.js";

const txHash = `0x${"b".repeat(64)}`;
const delivery = `0x${"4".repeat(40)}`;
const receiver = `0x${"5".repeat(40)}`;
const usdc = `0x${"6".repeat(40)}`;
const transferTopic =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const addressTopic = (address: string): string =>
  `0x${"0".repeat(24)}${address.slice(2)}`;

const request: BuyVoidRequestV1 = {
  request_id: "buyvoid_ambiguity_guard_v2",
  source_chain: "base",
  tx_hash: txHash,
  delivery_address: delivery,
  receive_address: receiver,
  usdc_amount: "10",
  quoted_void: "20",
};

const exactLog = (logIndex: number) => ({
  address: usdc,
  topics: [transferTopic, addressTopic(delivery), addressTopic(receiver)],
  data: "0x989680",
  logIndex,
  transactionHash: txHash,
  blockNumber: 200,
});

const policy = {
  allowed_chains: ["base"],
  usdc_contract_by_chain: { base: usdc },
  receive_address_by_chain: { base: receiver },
  current_block_number_by_chain: { base: 205 },
};

const ambiguous = buildBuyVoidVerifiedPaymentEventV2({
  request,
  receipt: {
    status: 1,
    transactionHash: txHash,
    blockNumber: 200,
    logs: [exactLog(3), exactLog(9)],
  },
  policy,
});
assert.equal(ambiguous.ok, false);
if (ambiguous.ok) throw new Error("expected ambiguous transfer hold");
assert.equal(ambiguous.reason, "ambiguous_matching_usdc_transfers");
assert.deepEqual(ambiguous.detail?.matching_log_indexes, ["3", "9"]);

const overpayment = structuredClone({
  status: 1,
  transactionHash: txHash,
  blockNumber: 200,
  logs: [exactLog(3)],
}) as BuyVoidTransactionReceiptV2;
(overpayment.logs as any[])[0].data = "0x989681";
const overpaymentHeld = buildBuyVoidVerifiedPaymentEventV2({
  request,
  receipt: overpayment,
  policy,
});
assert.equal(overpaymentHeld.ok, false);
if (overpaymentHeld.ok) throw new Error("expected exact-payment hold");
assert.equal(overpaymentHeld.reason, "matching_usdc_transfer_not_found");

const wrongPayer = structuredClone({
  status: 1,
  transactionHash: txHash,
  blockNumber: 200,
  logs: [exactLog(3)],
}) as BuyVoidTransactionReceiptV2;
(wrongPayer.logs as any[])[0].topics[1] = addressTopic(`0x${"7".repeat(40)}`);
const wrongPayerHeld = buildBuyVoidVerifiedPaymentEventV2({
  request,
  receipt: wrongPayer,
  policy,
});
assert.equal(wrongPayerHeld.ok, false);
if (wrongPayerHeld.ok) throw new Error("expected payer binding hold");
assert.equal(wrongPayerHeld.reason, "matching_usdc_transfer_not_found");

const removed = structuredClone({
  status: 1,
  transactionHash: txHash,
  blockNumber: 200,
  logs: [exactLog(3)],
}) as BuyVoidTransactionReceiptV2;
(removed.logs as any[])[0].removed = true;
const removedHeld = buildBuyVoidVerifiedPaymentEventV2({
  request,
  receipt: removed,
  policy,
});
assert.equal(removedHeld.ok, false);
if (removedHeld.ok) throw new Error("expected removed-log hold");
assert.equal(removedHeld.reason, "matching_usdc_transfer_not_found");

const failed = buildBuyVoidVerifiedPaymentEventV2({
  request,
  receipt: {
    status: 0,
    transactionHash: txHash,
    blockNumber: 200,
    logs: [exactLog(3)],
  },
  policy,
});
assert.equal(failed.ok, false);
if (failed.ok) throw new Error("expected failed tx hold");
assert.equal(failed.reason, "payment_tx_failed");

const verified = buildBuyVoidVerifiedPaymentEventV2({
  request,
  receipt: {
    status: 1,
    transactionHash: txHash,
    blockNumber: 200,
    logs: [exactLog(3)],
  },
  policy,
});
if ("reason" in verified) throw new Error(verified.reason);
assert.equal(verified.ok, true);

const fulfillmentPolicy: BuyVoidAutoFulfillmentPolicyV1 = {
  automatic_fulfillment_enabled: true,
  allowed_chains: ["base"],
  min_confirmations_by_chain: { base: 6 },
  usdc_contract_by_chain: { base: usdc },
  receive_address_by_chain: { base: receiver },
  rate_void_units_numerator: 2,
  rate_void_units_denominator: 1,
  pool_remaining_void_units: "100000000",
  exact_payment_required: true,
};
const first = decideBuyVoidAutoFulfillmentV1({
  request,
  verified_payment_event: verified.event,
  policy: fulfillmentPolicy,
});
if ("reason" in first) throw new Error(first.reason);
assert.equal(first.ok, true);

const replayRequest = { ...request, request_id: "buyvoid_replay_other_request" };
const replayEvent = { ...verified.event, request_id: replayRequest.request_id };
const replay = decideBuyVoidAutoFulfillmentV1({
  request: replayRequest,
  verified_payment_event: replayEvent,
  policy: fulfillmentPolicy,
  prior_claims: [first.claim],
});
assert.equal(replay.ok, false);
if (replay.ok) throw new Error("expected payment replay hold");
assert.equal(replay.reason, "payment_identity_already_claimed");

assert.notEqual(
  canonicalBuyVoidPaymentIdentityV1({
    source_chain: "base",
    payment_transaction_hash: txHash,
    payment_log_index: 3,
  }),
  canonicalBuyVoidPaymentIdentityV1({
    source_chain: "base",
    payment_transaction_hash: txHash,
    payment_log_index: 9,
  }),
);

console.log("VOID_BUY_VOID_VERIFIED_PAYMENT_V2_AMBIGUITY_GUARD_GREEN");
