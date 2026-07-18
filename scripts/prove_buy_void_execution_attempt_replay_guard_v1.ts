import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buyVoidExecutionAttemptJournalPathsV1,
  listBuyVoidExecutionAttemptsV1,
  prepareBuyVoidExecutionTransactionV1,
  recordBuyVoidExecutionBroadcastV1,
  recordBuyVoidExecutionPrebroadcastFailureV1,
  reserveBuyVoidExecutionAttemptV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";
import { claimBuyVoidFulfillmentJournalV1 } from "../src/economic/buy_void_fulfillment_journal_v1.js";
import {
  buildBuyVoidVerifiedPaymentEventV2,
  type BuyVoidTransactionReceiptV2,
} from "../src/economic/buy_void_verified_payment_v2.js";
import type {
  BuyVoidAutoFulfillmentPolicyV1,
  BuyVoidRequestV1,
} from "../src/economic/buy_void_auto_fulfillment_v1.js";

const receive = "0x2222222222222222222222222222222222222222";
const usdc = "0x3333333333333333333333333333333333333333";
const wallet = "0x4444444444444444444444444444444444444444";
const otherWallet = "0x5555555555555555555555555555555555555555";
const transferTopic =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function topic(address: string): string {
  return `0x${"0".repeat(24)}${address.slice(2)}`;
}

const fulfillmentPolicy: BuyVoidAutoFulfillmentPolicyV1 = {
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

function makeIntent(label: string, paymentNibble: string, deliveryNibble: string) {
  const delivery = `0x${deliveryNibble.repeat(40)}`;
  const paymentTx = `0x${paymentNibble.repeat(64)}`;
  const request: BuyVoidRequestV1 = {
    request_id: `buyvoid_execution_replay_${label}`,
    source_chain: "base",
    tx_hash: paymentTx,
    delivery_address: delivery,
    receive_address: receive,
    usdc_amount: "25",
    quoted_void: "50",
  };
  const receipt: BuyVoidTransactionReceiptV2 = {
    status: 1,
    transactionHash: paymentTx,
    blockNumber: 100,
    logs: [
      {
        address: usdc,
        topics: [transferTopic, topic(delivery), topic(receive)],
        data: "0x17d7840",
        logIndex: 7,
        transactionHash: paymentTx,
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
  const claimed = claimBuyVoidFulfillmentJournalV1({
    root_dir: fs.mkdtempSync(path.join(os.tmpdir(), `void-buy-exec-claim-${label}-`)),
    request,
    verified_payment_event: verified.event,
    policy: fulfillmentPolicy,
  });
  if ("reason" in claimed) throw new Error(claimed.reason);
  return { intent: claimed.intent, delivery, paymentTx };
}

const one = makeIntent("one", "a", "1");
const two = makeIntent("two", "c", "6");
const three = makeIntent("three", "e", "7");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-buy-execution-replay-"));
const policy = {
  attempt_journal_enabled: true,
  max_attempts_per_payment: 3,
  chain_id: 2050,
  fulfillment_wallet_allowlist: [wallet],
};
const deliveryTx = `0x${"b".repeat(64)}`;
const conflictingTx = `0x${"d".repeat(64)}`;

const first = reserveBuyVoidExecutionAttemptV1({
  root_dir: root,
  intent: one.intent,
  policy,
});
if ("reason" in first) throw new Error(first.reason);
const firstId = first.attempt.reservation.attempt_id;

for (const [name, transaction, reason] of [
  [
    "wrong_chain",
    {
      chain_id: 1,
      transaction_hash: deliveryTx,
      from_address: wallet,
      to_address: one.delivery,
      amount_units: "50000000",
    },
    "delivery_chain_mismatch",
  ],
  [
    "wrong_wallet",
    {
      chain_id: 2050,
      transaction_hash: deliveryTx,
      from_address: otherWallet,
      to_address: one.delivery,
      amount_units: "50000000",
    },
    "fulfillment_wallet_not_allowlisted",
  ],
  [
    "wrong_recipient",
    {
      chain_id: 2050,
      transaction_hash: deliveryTx,
      from_address: wallet,
      to_address: two.delivery,
      amount_units: "50000000",
    },
    "delivery_address_mismatch",
  ],
  [
    "wrong_amount",
    {
      chain_id: 2050,
      transaction_hash: deliveryTx,
      from_address: wallet,
      to_address: one.delivery,
      amount_units: "49999999",
    },
    "void_delivery_amount_mismatch",
  ],
] as const) {
  const result = prepareBuyVoidExecutionTransactionV1({
    root_dir: root,
    attempt_id: firstId,
    intent: one.intent,
    policy,
    transaction,
  });
  assert.equal("reason" in result, true, name);
  if (!("reason" in result)) throw new Error(`expected held ${name}`);
  assert.equal(result.reason, reason, name);
}

const prepared = prepareBuyVoidExecutionTransactionV1({
  root_dir: root,
  attempt_id: firstId,
  intent: one.intent,
  policy,
  transaction: {
    chain_id: 2050,
    transaction_hash: deliveryTx,
    from_address: wallet,
    to_address: one.delivery,
    amount_units: "50000000",
  },
});
if ("reason" in prepared) throw new Error(prepared.reason);

const paths = buyVoidExecutionAttemptJournalPathsV1(root);
const deliveryNames = fs.readdirSync(paths.deliveries_dir);
assert.equal(deliveryNames.length, 1);
fs.unlinkSync(path.join(paths.deliveries_dir, deliveryNames[0]));

const recovered = prepareBuyVoidExecutionTransactionV1({
  root_dir: root,
  attempt_id: firstId,
  intent: one.intent,
  policy,
  transaction: {
    chain_id: 2050,
    transaction_hash: deliveryTx,
    from_address: wallet,
    to_address: one.delivery,
    amount_units: "50000000",
  },
});
if ("reason" in recovered) throw new Error(recovered.reason);
assert.equal(recovered.status, "duplicate");
assert.equal(recovered.recovered_delivery_index, true);
assert.equal(fs.readdirSync(paths.deliveries_dir).length, 1);

const conflictingPrepare = prepareBuyVoidExecutionTransactionV1({
  root_dir: root,
  attempt_id: firstId,
  intent: one.intent,
  policy,
  transaction: {
    chain_id: 2050,
    transaction_hash: conflictingTx,
    from_address: wallet,
    to_address: one.delivery,
    amount_units: "50000000",
  },
});
assert.equal("reason" in conflictingPrepare, true);
if (!("reason" in conflictingPrepare)) throw new Error("expected prepare conflict");
assert.equal(conflictingPrepare.reason, "execution_attempt_already_prepared");

const secondPaymentAttempt = reserveBuyVoidExecutionAttemptV1({
  root_dir: root,
  intent: two.intent,
  policy,
});
if ("reason" in secondPaymentAttempt) throw new Error(secondPaymentAttempt.reason);
const replay = prepareBuyVoidExecutionTransactionV1({
  root_dir: root,
  attempt_id: secondPaymentAttempt.attempt.reservation.attempt_id,
  intent: two.intent,
  policy,
  transaction: {
    chain_id: 2050,
    transaction_hash: deliveryTx,
    from_address: wallet,
    to_address: two.delivery,
    amount_units: "50000000",
  },
});
assert.equal("reason" in replay, true);
if (!("reason" in replay)) throw new Error("expected delivery replay hold");
assert.equal(replay.reason, "delivery_tx_already_reserved");
const afterReplay = listBuyVoidExecutionAttemptsV1(root).find(
  (attempt) =>
    attempt.reservation.attempt_id ===
    secondPaymentAttempt.attempt.reservation.attempt_id,
);
assert.equal(afterReplay?.status, "failed_retryable");

const wrongBroadcast = recordBuyVoidExecutionBroadcastV1({
  root_dir: root,
  attempt_id: firstId,
  transaction_hash: conflictingTx,
});
assert.equal("reason" in wrongBroadcast, true);
if (!("reason" in wrongBroadcast)) throw new Error("expected broadcast mismatch");
assert.equal(wrongBroadcast.reason, "broadcast_transaction_hash_mismatch");

const broadcast = recordBuyVoidExecutionBroadcastV1({
  root_dir: root,
  attempt_id: firstId,
  transaction_hash: deliveryTx,
});
if ("reason" in broadcast) throw new Error(broadcast.reason);
assert.equal(broadcast.attempt.status, "broadcast");

const failAfterBroadcast = recordBuyVoidExecutionPrebroadcastFailureV1({
  root_dir: root,
  attempt_id: firstId,
  failure_code: "rpc_timeout",
  retryable: true,
});
assert.equal("reason" in failAfterBroadcast, true);
if (!("reason" in failAfterBroadcast)) throw new Error("expected post-broadcast hold");
assert.equal(failAfterBroadcast.reason, "cannot_fail_after_broadcast");

const capPolicy = {
  ...policy,
  max_attempts_per_payment: 2,
};
const capOne = reserveBuyVoidExecutionAttemptV1({
  root_dir: root,
  intent: three.intent,
  policy: capPolicy,
});
if ("reason" in capOne) throw new Error(capOne.reason);
const capFailOne = recordBuyVoidExecutionPrebroadcastFailureV1({
  root_dir: root,
  attempt_id: capOne.attempt.reservation.attempt_id,
  failure_code: "signer_unavailable_1",
  retryable: true,
});
if ("reason" in capFailOne) throw new Error(capFailOne.reason);
const capTwo = reserveBuyVoidExecutionAttemptV1({
  root_dir: root,
  intent: three.intent,
  policy: capPolicy,
});
if ("reason" in capTwo) throw new Error(capTwo.reason);
const capFailTwo = recordBuyVoidExecutionPrebroadcastFailureV1({
  root_dir: root,
  attempt_id: capTwo.attempt.reservation.attempt_id,
  failure_code: "signer_unavailable_2",
  retryable: true,
});
if ("reason" in capFailTwo) throw new Error(capFailTwo.reason);
const capHeld = reserveBuyVoidExecutionAttemptV1({
  root_dir: root,
  intent: three.intent,
  policy: capPolicy,
});
assert.equal("reason" in capHeld, true);
if (!("reason" in capHeld)) throw new Error("expected attempt cap hold");
assert.equal(capHeld.reason, "execution_attempt_cap_reached");

console.log("VOID_BUY_VOID_EXECUTION_ATTEMPT_REPLAY_GUARD_V1_GREEN");
