import assert from "node:assert/strict";
import {
  decideBuyVoidAutoFulfillmentV1,
  type BuyVoidAutoFulfillmentPolicyV1,
  type BuyVoidRequestV1,
} from "../src/economic/buy_void_auto_fulfillment_v1.js";
import {
  buildBuyVoidVerifiedPaymentEventV2,
  VOID_BUY_VOID_VERIFIED_PAYMENT_AUTHORITY_V2,
} from "../src/economic/buy_void_verified_payment_v2.js";

const txHash = `0x${"a".repeat(64)}`;
const delivery = `0x${"1".repeat(40)}`;
const receiver = `0x${"2".repeat(40)}`;
const usdc = `0x${"3".repeat(40)}`;
const transferTopic =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const addressTopic = (address: string): string =>
  `0x${"0".repeat(24)}${address.slice(2)}`;

const request: BuyVoidRequestV1 = {
  request_id: "buyvoid_verified_payment_v2",
  source_chain: "base",
  tx_hash: txHash,
  delivery_address: delivery,
  receive_address: receiver,
  usdc_amount: "12.5",
  quoted_void: "25",
};

const verification = buildBuyVoidVerifiedPaymentEventV2({
  request,
  receipt: {
    status: "0x1",
    transactionHash: txHash,
    blockNumber: "0x64",
    logs: [
      {
        address: usdc,
        topics: [transferTopic, addressTopic(delivery), addressTopic(receiver)],
        data: "0xbebc20",
        logIndex: "0x7",
        transactionHash: txHash,
        blockNumber: "0x64",
      },
    ],
  },
  policy: {
    allowed_chains: ["base", "ethereum"],
    usdc_contract_by_chain: { base: usdc },
    receive_address_by_chain: { base: receiver },
    current_block_number_by_chain: { base: "0x65" },
  },
});

if ("reason" in verification) throw new Error(verification.reason);
assert.equal(verification.ok, true);
assert.equal(verification.event.payment_verifier.log_index, "7");
assert.equal(verification.event.payment_verifier.block_number, "100");
assert.equal(verification.event.payment_verifier.confirmations, "2");
assert.equal(verification.event.payment_verifier.amount_units, "12500000");
assert.equal(verification.event.payment_identity_input_complete, true);

const fulfillmentPolicy: BuyVoidAutoFulfillmentPolicyV1 = {
  automatic_fulfillment_enabled: true,
  allowed_chains: ["base"],
  min_confirmations_by_chain: { base: 2 },
  usdc_contract_by_chain: { base: usdc },
  receive_address_by_chain: { base: receiver },
  rate_void_units_numerator: 2,
  rate_void_units_denominator: 1,
  pool_remaining_void_units: "1000000000",
  exact_payment_required: true,
};

const decision = decideBuyVoidAutoFulfillmentV1({
  request,
  verified_payment_event: verification.event,
  policy: fulfillmentPolicy,
});
if ("reason" in decision) throw new Error(decision.reason);
assert.equal(decision.ok, true);
assert.equal(decision.status, "approved");
assert.equal(
  decision.instruction.canonical_payment_identity,
  `voidpay1:base:${txHash}:7`,
);
assert.equal(decision.instruction.void_amount_units, "25000000");
assert.equal(decision.instruction.signing_authorized, false);
assert.equal(decision.instruction.transaction_broadcast_authorized, false);

const tooDeepPolicy = {
  ...fulfillmentPolicy,
  min_confirmations_by_chain: { base: 3 },
};
const notFinal = decideBuyVoidAutoFulfillmentV1({
  request,
  verified_payment_event: verification.event,
  policy: tooDeepPolicy,
});
assert.equal(notFinal.ok, false);
if (notFinal.ok) throw new Error("expected insufficient confirmations hold");
assert.equal(notFinal.reason, "insufficient_confirmations");

assert.deepEqual(VOID_BUY_VOID_VERIFIED_PAYMENT_AUTHORITY_V2, {
  rpc_call: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  runtime_route_mount: false,
  filesystem_write: false,
  money_movement: false,
});

console.log("VOID_BUY_VOID_VERIFIED_PAYMENT_V2_GREEN");
