import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buyVoidConfirmedStateJournalPathsV1,
  persistBuyVoidConfirmedStateV1,
} from "../src/economic/buy_void_confirmed_state_journal_v1.js";
import {
  confirmBuyVoidFulfillmentV1,
  type BuyVoidConfirmedFulfillmentRecordV1,
} from "../src/economic/buy_void_fulfillment_confirmation_v1.js";
import {
  claimBuyVoidFulfillmentJournalV1,
  type BuyVoidFulfillmentJournalIntentV1,
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

function pipeline(
  requestId: string,
  delivery: string,
  paymentHash: string,
  deliveryHash: string,
): {
  intent: BuyVoidFulfillmentJournalIntentV1;
  record: BuyVoidConfirmedFulfillmentRecordV1;
} {
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
    root_dir: fs.mkdtempSync(path.join(os.tmpdir(), "void-buy-final-claim-")),
    request,
    verified_payment_event: verified.event,
    policy: enginePolicy,
  });
  if ("reason" in claim) throw new Error(claim.reason);

  const confirmation = confirmBuyVoidFulfillmentV1({
    intent: claim.intent,
    observation: {
      chain_id: 2050,
      transaction_hash: deliveryHash,
      transaction_status: 1,
      block_number: 500,
      current_block_number: 505,
      from_address: wallet,
      to_address: delivery,
      amount_units: claim.intent.claim.unsigned_instruction.void_amount_units,
    },
    policy: {
      chain_id: 2050,
      min_confirmations: 3,
      fulfillment_wallet_allowlist: [wallet],
    },
  });
  if ("reason" in confirmation) throw new Error(confirmation.reason);
  return { intent: claim.intent, record: confirmation.record };
}

const deliveryA = "0x8888888888888888888888888888888888888888";
const deliveryB = "0x9999999999999999999999999999999999999999";
const firstPipeline = pipeline(
  "buyvoid_confirmed_recovery_a",
  deliveryA,
  tx("a"),
  tx("c"),
);

const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-buy-final-recovery-"));
const first = persistBuyVoidConfirmedStateV1({
  root_dir: root,
  intent: firstPipeline.intent,
  confirmed_record: firstPipeline.record,
});
if ("reason" in first) throw new Error(first.reason);

const paths = buyVoidConfirmedStateJournalPathsV1(root);
for (const dir of [
  paths.payments_dir,
  paths.requests_dir,
  paths.deliveries_dir,
  paths.complete_dir,
]) {
  for (const name of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, name));
}

const recovered = persistBuyVoidConfirmedStateV1({
  root_dir: root,
  intent: firstPipeline.intent,
  confirmed_record: {
    ...firstPipeline.record,
    delivery_confirmation_count: "12",
  },
});
if ("reason" in recovered) throw new Error(recovered.reason);
assert.equal(recovered.status, "duplicate");
assert.deepEqual(recovered.recovered_indexes.sort(), [
  "delivery",
  "payment",
  "request",
]);
assert.equal(recovered.recovered_completion, true);

const regressed = persistBuyVoidConfirmedStateV1({
  root_dir: root,
  intent: firstPipeline.intent,
  confirmed_record: {
    ...firstPipeline.record,
    delivery_confirmation_count: "5",
  },
});
assert.equal(regressed.ok, false);
assert.equal(
  "reason" in regressed && regressed.reason,
  "delivery_confirmation_count_regression",
);

const requestConflictRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-final-request-conflict-"),
);
const requestBase = pipeline(
  "buyvoid_shared_confirmed_request",
  deliveryA,
  tx("d"),
  tx("e"),
);
const requestFirst = persistBuyVoidConfirmedStateV1({
  root_dir: requestConflictRoot,
  intent: requestBase.intent,
  confirmed_record: requestBase.record,
});
if ("reason" in requestFirst) throw new Error(requestFirst.reason);

const requestReplay = pipeline(
  "buyvoid_shared_confirmed_request",
  deliveryB,
  tx("f"),
  tx("1"),
);
const requestHeld = persistBuyVoidConfirmedStateV1({
  root_dir: requestConflictRoot,
  intent: requestReplay.intent,
  confirmed_record: requestReplay.record,
});
assert.equal(requestHeld.ok, false);
assert.equal("reason" in requestHeld && requestHeld.reason, "request_index_conflict");

const deliveryConflictRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-final-delivery-conflict-"),
);
const deliveryFirstPipeline = pipeline(
  "buyvoid_delivery_conflict_a",
  deliveryA,
  tx("2"),
  tx("3"),
);
const deliveryFirst = persistBuyVoidConfirmedStateV1({
  root_dir: deliveryConflictRoot,
  intent: deliveryFirstPipeline.intent,
  confirmed_record: deliveryFirstPipeline.record,
});
if ("reason" in deliveryFirst) throw new Error(deliveryFirst.reason);

const deliveryReplay = pipeline(
  "buyvoid_delivery_conflict_b",
  deliveryB,
  tx("4"),
  tx("3"),
);
const deliveryHeld = persistBuyVoidConfirmedStateV1({
  root_dir: deliveryConflictRoot,
  intent: deliveryReplay.intent,
  confirmed_record: deliveryReplay.record,
});
assert.equal(deliveryHeld.ok, false);
assert.equal(
  "reason" in deliveryHeld && deliveryHeld.reason,
  "delivery_index_conflict",
);

const corruptRoot = fs.mkdtempSync(path.join(os.tmpdir(), "void-buy-final-corrupt-"));
const corruptFirst = persistBuyVoidConfirmedStateV1({
  root_dir: corruptRoot,
  intent: firstPipeline.intent,
  confirmed_record: firstPipeline.record,
});
if ("reason" in corruptFirst) throw new Error(corruptFirst.reason);
const corruptPaths = buyVoidConfirmedStateJournalPathsV1(corruptRoot);
const requestIndexName = fs.readdirSync(corruptPaths.requests_dir)[0];
fs.writeFileSync(
  path.join(corruptPaths.requests_dir, requestIndexName),
  "{not-json\n",
  "utf8",
);
const corruptRetry = persistBuyVoidConfirmedStateV1({
  root_dir: corruptRoot,
  intent: firstPipeline.intent,
  confirmed_record: firstPipeline.record,
});
assert.equal(corruptRetry.ok, false);
assert.equal(
  "reason" in corruptRetry && corruptRetry.reason,
  "confirmed_state_journal_failed",
);

console.log("VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_CRASH_RECOVERY_V1_GREEN");
