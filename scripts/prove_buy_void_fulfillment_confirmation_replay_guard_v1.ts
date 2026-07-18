import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  confirmBuyVoidFulfillmentV1,
  type BuyVoidConfirmedFulfillmentRecordV1,
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

const receive = "0x5555555555555555555555555555555555555555";
const usdc = "0x6666666666666666666666666666666666666666";
const wallet = "0x7777777777777777777777777777777777777777";
const transferTopic =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function tx(char: string): string {
  return `0x${char.repeat(64)}`;
}

function topic(address: string): string {
  return `0x${"0".repeat(24)}${address.slice(2)}`;
}

const enginePolicy: BuyVoidAutoFulfillmentPolicyV1 = {
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

function makeIntent(requestId: string, delivery: string, paymentHash: string) {
  const request: BuyVoidRequestV1 = {
    request_id: requestId,
    source_chain: "base",
    tx_hash: paymentHash,
    delivery_address: delivery,
    receive_address: receive,
    usdc_amount: "10",
    quoted_void: "20",
  };
  const receipt: BuyVoidTransactionReceiptV2 = {
    status: 1,
    transactionHash: paymentHash,
    blockNumber: 100,
    logs: [
      {
        address: usdc,
        topics: [transferTopic, topic(delivery), topic(receive)],
        data: "0x989680",
        logIndex: 4,
        transactionHash: paymentHash,
        blockNumber: 100,
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

  const claim = claimBuyVoidFulfillmentJournalV1({
    root_dir: fs.mkdtempSync(path.join(os.tmpdir(), "void-buy-confirm-replay-")),
    request,
    verified_payment_event: verified.event,
    policy: enginePolicy,
  });
  if ("reason" in claim) throw new Error(claim.reason);
  return claim.intent;
}

const deliveryA = "0x8888888888888888888888888888888888888888";
const deliveryB = "0x9999999999999999999999999999999999999999";
const intentA = makeIntent("buyvoid_confirm_replay_a", deliveryA, tx("a"));
const intentB = makeIntent("buyvoid_confirm_replay_b", deliveryB, tx("b"));
const deliveryTx = tx("c");

function observe(intent: typeof intentA, currentBlock: number, priorResults: BuyVoidConfirmedFulfillmentRecordV1[] = []) {
  return confirmBuyVoidFulfillmentV1({
    intent,
    observation: {
      chain_id: 2050,
      transaction_hash: deliveryTx,
      transaction_status: 1,
      block_number: 500,
      current_block_number: currentBlock,
      from_address: wallet,
      to_address: intent.claim.unsigned_instruction.delivery_address,
      amount_units: intent.claim.unsigned_instruction.void_amount_units,
    },
    policy: {
      chain_id: 2050,
      min_confirmations: 3,
      fulfillment_wallet_allowlist: [wallet],
    },
    prior_results: priorResults,
  });
}

const first = observe(intentA, 505);
if ("reason" in first) throw new Error(first.reason);
assert.equal(first.status, "confirmed");

const duplicate = observe(intentA, 510, [first.record]);
if ("reason" in duplicate) throw new Error(duplicate.reason);
assert.equal(duplicate.status, "duplicate");
assert.equal(duplicate.duplicate, true);
assert.equal(duplicate.new_confirmation, false);
assert.equal(duplicate.record.void_delivery_tx_hash, deliveryTx);
assert.equal(duplicate.observed_confirmation_count, "11");

const regressed = observe(intentA, 503, [first.record]);
assert.equal(regressed.ok, false);
assert.equal(
  "reason" in regressed && regressed.reason,
  "delivery_confirmation_count_regression",
);

const replay = observe(intentB, 505, [first.record]);
assert.equal(replay.ok, false);
assert.equal("reason" in replay && replay.reason, "delivery_tx_replay_conflict");

const alternateTx = confirmBuyVoidFulfillmentV1({
  intent: intentA,
  observation: {
    chain_id: 2050,
    transaction_hash: tx("d"),
    transaction_status: 1,
    block_number: 501,
    current_block_number: 505,
    from_address: wallet,
    to_address: deliveryA,
    amount_units: intentA.claim.unsigned_instruction.void_amount_units,
  },
  policy: {
    chain_id: 2050,
    min_confirmations: 3,
    fulfillment_wallet_allowlist: [wallet],
  },
  prior_results: [first.record],
});
assert.equal(alternateTx.ok, false);
assert.equal(
  "reason" in alternateTx && alternateTx.reason,
  "fulfillment_instruction_already_confirmed",
);

const malformed = observe(intentA, 505, [
  { ...first.record, void_delivery_tx_hash: "bad" },
]);
assert.equal(malformed.ok, false);
assert.equal(
  "reason" in malformed && malformed.reason,
  "malformed_prior_fulfillment_result",
);

console.log("VOID_BUY_VOID_FULFILLMENT_CONFIRMATION_REPLAY_GUARD_V1_GREEN");
