import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_AUTHORITY_V1,
  buyVoidExecutionAttemptJournalPathsV1,
  prepareBuyVoidExecutionTransactionV1,
  recordBuyVoidExecutionBroadcastV1,
  recordBuyVoidExecutionPostbroadcastFailureV1,
  reserveBuyVoidExecutionAttemptV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";
import {
  recordBuyVoidBroadcastAcceptedV1,
  recordBuyVoidBroadcastRevertedV1,
} from "../src/economic/buy_void_broadcast_outcome_journal_v1.js";
import { claimBuyVoidFulfillmentJournalV1 } from "../src/economic/buy_void_fulfillment_journal_v1.js";
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
const wallet = "0x4444444444444444444444444444444444444444";
const paymentTx = `0x${"a".repeat(64)}`;
const deliveryTx = `0x${"b".repeat(64)}`;
const transferTopic =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function topic(address: string): string {
  return `0x${"0".repeat(24)}${address.slice(2)}`;
}

const request: BuyVoidRequestV1 = {
  request_id: "buyvoid_execution_revert_release_v1",
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

const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-buy-revert-release-"));
const claimed = claimBuyVoidFulfillmentJournalV1({
  root_dir: root,
  request,
  verified_payment_event: verified.event,
  policy: fulfillmentPolicy,
  now_ms: 1_700_800_000_000,
});
if ("reason" in claimed) throw new Error(claimed.reason);

const executionPolicy = {
  attempt_journal_enabled: true,
  max_attempts_per_payment: 3,
  chain_id: 2050,
  fulfillment_wallet_allowlist: [wallet],
};

assert.equal(
  VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_AUTHORITY_V1
    .definitive_revert_release_persistence,
  true,
);
assert.equal(VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_AUTHORITY_V1.rpc_call, false);
assert.equal(VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_AUTHORITY_V1.signing, false);
assert.equal(
  VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_AUTHORITY_V1.transaction_broadcast,
  false,
);

const first = reserveBuyVoidExecutionAttemptV1({
  root_dir: root,
  intent: claimed.intent,
  policy: executionPolicy,
  now_ms: 1_700_800_100_000,
});
if ("reason" in first) throw new Error(first.reason);

const prepared = prepareBuyVoidExecutionTransactionV1({
  root_dir: root,
  attempt_id: first.attempt.reservation.attempt_id,
  intent: claimed.intent,
  policy: executionPolicy,
  transaction: {
    chain_id: 2050,
    transaction_hash: deliveryTx,
    from_address: wallet,
    to_address: delivery,
    amount_units: "50000000",
  },
  now_ms: 1_700_800_200_000,
});
if ("reason" in prepared) throw new Error(prepared.reason);

const broadcast = recordBuyVoidExecutionBroadcastV1({
  root_dir: root,
  attempt_id: first.attempt.reservation.attempt_id,
  transaction_hash: deliveryTx,
  provider_submission_id: "submit-revert-release-v1",
  now_ms: 1_700_800_300_000,
});
if ("reason" in broadcast) throw new Error(broadcast.reason);

const accepted = recordBuyVoidBroadcastAcceptedV1({
  root_dir: root,
  attempt_id: first.attempt.reservation.attempt_id,
  transaction_hash: deliveryTx,
  provider_submission_id: "submit-revert-release-v1",
  now_ms: 1_700_800_400_000,
});
if ("reason" in accepted) throw new Error(accepted.reason);

const reverted = recordBuyVoidBroadcastRevertedV1({
  root_dir: root,
  attempt_id: first.attempt.reservation.attempt_id,
  transaction_hash: deliveryTx,
  observation: {
    chain_id: 2050,
    transaction_status: 0,
    block_number: 700,
    current_block_number: 704,
  },
  policy: {
    outcome_journal_enabled: true,
    chain_id: 2050,
    min_revert_confirmations: 3,
  },
  now_ms: 1_700_800_500_000,
});
if ("reason" in reverted) throw new Error(reverted.reason);
assert.equal(reverted.state.status, "reverted");
assert.equal(reverted.state.retry_allowed, true);
assert.ok(reverted.state.reverted);

const beforeRelease = reserveBuyVoidExecutionAttemptV1({
  root_dir: root,
  intent: claimed.intent,
  policy: executionPolicy,
});
if ("reason" in beforeRelease) throw new Error(beforeRelease.reason);
assert.equal(beforeRelease.status, "duplicate");
assert.equal(beforeRelease.attempt.status, "broadcast");

const released = recordBuyVoidExecutionPostbroadcastFailureV1({
  root_dir: root,
  attempt_id: first.attempt.reservation.attempt_id,
  outcome: reverted.state.reverted,
  now_ms: 1_700_800_600_000,
});
if ("reason" in released) throw new Error(released.reason);
assert.equal(released.status, "recorded");
assert.equal(released.attempt.status, "failed_retryable");
assert.equal(
  released.attempt.postbroadcast_failure?.failure_code,
  "delivery_transaction_reverted",
);
assert.equal(released.attempt.postbroadcast_failure?.definitive_revert, true);
assert.equal(
  released.attempt.postbroadcast_failure?.transaction_broadcast_observed,
  true,
);

const second = reserveBuyVoidExecutionAttemptV1({
  root_dir: root,
  intent: claimed.intent,
  policy: executionPolicy,
  now_ms: 1_700_800_700_000,
});
if ("reason" in second) throw new Error(second.reason);
assert.equal(second.status, "reserved");
assert.equal(second.attempt.reservation.attempt_number, 2);
assert.notEqual(
  second.attempt.reservation.attempt_id,
  first.attempt.reservation.attempt_id,
);

const paths = buyVoidExecutionAttemptJournalPathsV1(root);
const failureFile = path.join(
  paths.attempts_dir,
  first.attempt.reservation.attempt_id,
  "postbroadcast-failure.json",
);
assert.equal(fs.statSync(failureFile).mode & 0o777, 0o600);

console.log("VOID_BUY_VOID_EXECUTION_ATTEMPT_REVERT_RELEASE_V1_GREEN");
