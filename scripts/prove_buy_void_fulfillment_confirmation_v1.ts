import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  VOID_BUY_VOID_FULFILLMENT_CONFIRMATION_AUTHORITY_V1,
  confirmBuyVoidFulfillmentV1,
} from "../src/economic/buy_void_fulfillment_confirmation_v1.js";
import {
  claimBuyVoidFulfillmentJournalV1,
} from "../src/economic/buy_void_fulfillment_journal_v1.js";
import {
  buildBuyVoidVerifiedPaymentEventV2,
  type BuyVoidTransactionReceiptV2,
} from "../src/economic/buy_void_verified_payment_v2.js";
import type {
  BuyVoidAutoFulfillmentPolicyV1,
  BuyVoidRequestV1,
} from "../src/economic/buy_void_auto_fulfillment_v1.js";

const delivery = "0x1111111111111111111111111111111111111111";
const receive = "0x2222222222222222222222222222222222222222";
const usdc = "0x3333333333333333333333333333333333333333";
const fulfillmentWallet = "0x4444444444444444444444444444444444444444";
const paymentTx = `0x${"a".repeat(64)}`;
const deliveryTx = `0x${"b".repeat(64)}`;
const transferTopic =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function topic(address: string): string {
  return `0x${"0".repeat(24)}${address.slice(2)}`;
}

const request: BuyVoidRequestV1 = {
  request_id: "buyvoid_confirmation_v1",
  source_chain: "base",
  tx_hash: paymentTx,
  delivery_address: delivery,
  receive_address: receive,
  usdc_amount: "25",
  quoted_void: "50",
};

const receipt: BuyVoidTransactionReceiptV2 = {
  status: "0x1",
  transactionHash: paymentTx,
  blockNumber: "0x64",
  logs: [
    {
      address: usdc,
      topics: [transferTopic, topic(delivery), topic(receive)],
      data: "0x17d7840",
      logIndex: "0x7",
      transactionHash: paymentTx,
      blockNumber: "0x64",
      removed: false,
    },
  ],
};

const verified = buildBuyVoidVerifiedPaymentEventV2({
  request,
  receipt,
  policy: {
    allowed_chains: ["base"],
    usdc_contract_by_chain: { base: usdc },
    receive_address_by_chain: { base: receive },
    current_block_number_by_chain: { base: 105 },
  },
});
if ("reason" in verified) throw new Error(verified.reason);

const policy: BuyVoidAutoFulfillmentPolicyV1 = {
  automatic_fulfillment_enabled: true,
  allowed_chains: ["base"],
  min_confirmations_by_chain: { base: 3 },
  usdc_contract_by_chain: { base: usdc },
  receive_address_by_chain: { base: receive },
  rate_void_units_numerator: "2",
  rate_void_units_denominator: "1",
  pool_remaining_void_units: "1000000000",
  exact_payment_required: true,
};

const claim = claimBuyVoidFulfillmentJournalV1({
  root_dir: fs.mkdtempSync(path.join(os.tmpdir(), "void-buy-confirm-v1-")),
  request,
  verified_payment_event: verified.event,
  policy,
  now_ms: 1_700_100_000_000,
});
if ("reason" in claim) throw new Error(claim.reason);

assert.equal(VOID_BUY_VOID_FULFILLMENT_CONFIRMATION_AUTHORITY_V1.rpc_call, false);
assert.equal(
  VOID_BUY_VOID_FULFILLMENT_CONFIRMATION_AUTHORITY_V1.filesystem_write,
  false,
);
assert.equal(
  VOID_BUY_VOID_FULFILLMENT_CONFIRMATION_AUTHORITY_V1.wallet_access,
  false,
);
assert.equal(VOID_BUY_VOID_FULFILLMENT_CONFIRMATION_AUTHORITY_V1.signing, false);
assert.equal(
  VOID_BUY_VOID_FULFILLMENT_CONFIRMATION_AUTHORITY_V1.transaction_broadcast,
  false,
);
assert.equal(
  VOID_BUY_VOID_FULFILLMENT_CONFIRMATION_AUTHORITY_V1.money_movement,
  false,
);
assert.equal(
  VOID_BUY_VOID_FULFILLMENT_CONFIRMATION_AUTHORITY_V1.fulfillment_truth_decision,
  true,
);

const confirmed = confirmBuyVoidFulfillmentV1({
  intent: claim.intent,
  observation: {
    chain_id: 2050,
    transaction_hash: deliveryTx,
    transaction_status: 1,
    block_number: 500,
    current_block_number: 505,
    from_address: fulfillmentWallet,
    to_address: delivery,
    amount_units: "50000000",
  },
  policy: {
    chain_id: 2050,
    min_confirmations: 3,
    fulfillment_wallet_allowlist: [fulfillmentWallet],
  },
});
if ("reason" in confirmed) throw new Error(confirmed.reason);
assert.equal(confirmed.status, "confirmed");
assert.equal(confirmed.new_confirmation, true);
assert.equal(confirmed.duplicate, false);
assert.equal(confirmed.record.status, "fulfilled_confirmed");
assert.equal(confirmed.record.buyer_fulfilled, true);
assert.equal(confirmed.record.automatic_fulfillment_completed, true);
assert.equal(confirmed.record.payment_claim_persisted, true);
assert.equal(confirmed.record.delivery_confirmation_observed, true);
assert.equal(confirmed.record.signing_authorized_by_this_module, false);
assert.equal(
  confirmed.record.transaction_broadcast_authorized_by_this_module,
  false,
);
assert.equal(confirmed.record.money_movement_authorized_by_this_module, false);
assert.equal(confirmed.record.void_amount_units, "50000000");
assert.equal(confirmed.record.delivery_confirmation_count, "6");
assert.equal(confirmed.record.delivery_address, delivery);
assert.equal(confirmed.record.fulfillment_wallet, fulfillmentWallet);

for (const [reason, patch] of [
  ["delivery_chain_mismatch", { chain_id: 1 }],
  ["void_delivery_tx_failed", { transaction_status: 0 }],
  ["insufficient_delivery_confirmations", { current_block_number: 501 }],
  ["fulfillment_wallet_not_allowlisted", { from_address: receive }],
  ["delivery_address_mismatch", { to_address: receive }],
  ["void_delivery_amount_mismatch", { amount_units: "49999999" }],
  ["delivery_tx_matches_payment_tx", { transaction_hash: paymentTx }],
] as const) {
  const held = confirmBuyVoidFulfillmentV1({
    intent: claim.intent,
    observation: {
      chain_id: 2050,
      transaction_hash: deliveryTx,
      transaction_status: 1,
      block_number: 500,
      current_block_number: 505,
      from_address: fulfillmentWallet,
      to_address: delivery,
      amount_units: "50000000",
      ...patch,
    },
    policy: {
      chain_id: 2050,
      min_confirmations: 3,
      fulfillment_wallet_allowlist: [fulfillmentWallet],
    },
  });
  assert.equal(held.ok, false);
  assert.equal("reason" in held && held.reason, reason);
}

console.log("VOID_BUY_VOID_FULFILLMENT_CONFIRMATION_V1_GREEN");
