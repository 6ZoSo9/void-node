import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  recordBuyVoidBroadcastAcceptedV1,
  recordBuyVoidBroadcastConfirmedV1,
  recordBuyVoidBroadcastRevertedV1,
  recordBuyVoidBroadcastUnknownV1,
  recordBuyVoidNotBroadcastV1,
} from "../src/economic/buy_void_broadcast_outcome_journal_v1.js";
import {
  prepareBuyVoidExecutionTransactionV1,
  recordBuyVoidExecutionBroadcastV1,
  recordBuyVoidExecutionConfirmedV1,
  reserveBuyVoidExecutionAttemptV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";
import { confirmBuyVoidFulfillmentV1 } from "../src/economic/buy_void_fulfillment_confirmation_v1.js";
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
const executionPolicy = {
  attempt_journal_enabled: true,
  max_attempts_per_payment: 3,
  chain_id: 2050,
  fulfillment_wallet_allowlist: [wallet],
};

function setup(label: string, paymentNibble: string, deliveryNibble: string) {
  const paymentTx = `0x${paymentNibble.repeat(64)}`;
  const deliveryTx = `0x${deliveryNibble.repeat(64)}`;
  const request: BuyVoidRequestV1 = {
    request_id: `buyvoid_broadcast_guard_${label}`,
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
    logs: [{
      address: usdc,
      topics: [transferTopic, topic(delivery), topic(receive)],
      data: "0x17d7840",
      logIndex: 7,
      transactionHash: paymentTx,
      blockNumber: 100,
      removed: false,
    }],
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
    root_dir: fs.mkdtempSync(path.join(os.tmpdir(), `void-buy-broadcast-guard-claim-${label}-`)),
    request,
    verified_payment_event: verified.event,
    policy: fulfillmentPolicy,
  });
  if ("reason" in claim) throw new Error(claim.reason);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `void-buy-broadcast-guard-${label}-`));
  const reserved = reserveBuyVoidExecutionAttemptV1({ root_dir: root, intent: claim.intent, policy: executionPolicy });
  if ("reason" in reserved) throw new Error(reserved.reason);
  const prepared = prepareBuyVoidExecutionTransactionV1({
    root_dir: root,
    attempt_id: reserved.attempt.reservation.attempt_id,
    intent: claim.intent,
    policy: executionPolicy,
    transaction: {
      chain_id: 2050,
      transaction_hash: deliveryTx,
      from_address: wallet,
      to_address: delivery,
      amount_units: "50000000",
    },
  });
  if ("reason" in prepared) throw new Error(prepared.reason);
  return { root, intent: claim.intent, attemptId: reserved.attempt.reservation.attempt_id, deliveryTx };
}

function expectHeld(value: unknown, reason: string): void {
  assert.equal(typeof value, "object");
  assert.notEqual(value, null);
  const record = value as Record<string, unknown>;
  assert.equal(record.reason, reason);
}

const wrongHash = `0x${"9".repeat(64)}`;
const unknownCase = setup("unknown", "1", "2");
expectHeld(recordBuyVoidBroadcastUnknownV1({
  root_dir: unknownCase.root,
  attempt_id: unknownCase.attemptId,
  transaction_hash: wrongHash,
  reason_code: "provider_timeout",
}), "broadcast_unknown_transaction_hash_mismatch");

const unknown = recordBuyVoidBroadcastUnknownV1({
  root_dir: unknownCase.root,
  attempt_id: unknownCase.attemptId,
  transaction_hash: unknownCase.deliveryTx,
  reason_code: "provider_timeout",
});
if ("reason" in unknown) throw new Error(unknown.reason);
expectHeld(recordBuyVoidNotBroadcastV1({
  root_dir: unknownCase.root,
  attempt_id: unknownCase.attemptId,
  transaction_hash: unknownCase.deliveryTx,
  reason_code: "late_claim_not_sent",
}), "cannot_mark_not_broadcast_after_uncertain_or_observed_broadcast");
expectHeld(recordBuyVoidBroadcastUnknownV1({
  root_dir: unknownCase.root,
  attempt_id: unknownCase.attemptId,
  transaction_hash: unknownCase.deliveryTx,
  reason_code: "different_timeout_code",
}), "broadcast_unknown_record_conflict");

const notCase = setup("not", "3", "4");
const notSent = recordBuyVoidNotBroadcastV1({
  root_dir: notCase.root,
  attempt_id: notCase.attemptId,
  transaction_hash: notCase.deliveryTx,
  reason_code: "rejected_before_submit",
});
if ("reason" in notSent) throw new Error(notSent.reason);
expectHeld(recordBuyVoidBroadcastUnknownV1({
  root_dir: notCase.root,
  attempt_id: notCase.attemptId,
  transaction_hash: notCase.deliveryTx,
  reason_code: "cannot_be_unknown_now",
}), "broadcast_unknown_invalid_transition");

const acceptedCase = setup("accepted", "5", "6");
expectHeld(recordBuyVoidBroadcastAcceptedV1({
  root_dir: acceptedCase.root,
  attempt_id: acceptedCase.attemptId,
  transaction_hash: acceptedCase.deliveryTx,
}), "execution_broadcast_observation_missing");
const broadcast = recordBuyVoidExecutionBroadcastV1({
  root_dir: acceptedCase.root,
  attempt_id: acceptedCase.attemptId,
  transaction_hash: acceptedCase.deliveryTx,
});
if ("reason" in broadcast) throw new Error(broadcast.reason);
const accepted = recordBuyVoidBroadcastAcceptedV1({
  root_dir: acceptedCase.root,
  attempt_id: acceptedCase.attemptId,
  transaction_hash: acceptedCase.deliveryTx,
});
if ("reason" in accepted) throw new Error(accepted.reason);
expectHeld(recordBuyVoidNotBroadcastV1({
  root_dir: acceptedCase.root,
  attempt_id: acceptedCase.attemptId,
  transaction_hash: acceptedCase.deliveryTx,
  reason_code: "impossible_after_accept",
}), "cannot_mark_not_broadcast_after_external_broadcast");
expectHeld(recordBuyVoidBroadcastRevertedV1({
  root_dir: acceptedCase.root,
  attempt_id: acceptedCase.attemptId,
  transaction_hash: acceptedCase.deliveryTx,
  observation: { chain_id: 2050, transaction_status: 0, block_number: 10, current_block_number: 11 },
  policy: { outcome_journal_enabled: true, chain_id: 2050, min_revert_confirmations: 3 },
}), "insufficient_revert_confirmations");
expectHeld(recordBuyVoidBroadcastRevertedV1({
  root_dir: acceptedCase.root,
  attempt_id: acceptedCase.attemptId,
  transaction_hash: acceptedCase.deliveryTx,
  observation: { chain_id: 1, transaction_status: 0, block_number: 10, current_block_number: 15 },
  policy: { outcome_journal_enabled: true, chain_id: 2050, min_revert_confirmations: 3 },
}), "broadcast_reverted_chain_mismatch");

const confirmCase = setup("confirm", "7", "8");
const confirmBroadcast = recordBuyVoidExecutionBroadcastV1({
  root_dir: confirmCase.root,
  attempt_id: confirmCase.attemptId,
  transaction_hash: confirmCase.deliveryTx,
});
if ("reason" in confirmBroadcast) throw new Error(confirmBroadcast.reason);
const confirmedTruth = confirmBuyVoidFulfillmentV1({
  intent: confirmCase.intent,
  observation: {
    chain_id: 2050,
    transaction_hash: confirmCase.deliveryTx,
    transaction_status: 1,
    block_number: 500,
    current_block_number: 505,
    from_address: wallet,
    to_address: delivery,
    amount_units: "50000000",
  },
  policy: { chain_id: 2050, min_confirmations: 3, fulfillment_wallet_allowlist: [wallet] },
});
if ("reason" in confirmedTruth) throw new Error(confirmedTruth.reason);
expectHeld(recordBuyVoidBroadcastConfirmedV1({
  root_dir: confirmCase.root,
  attempt_id: confirmCase.attemptId,
  transaction_hash: confirmCase.deliveryTx,
  confirmed_record: confirmedTruth.record,
}), "execution_attempt_confirmation_missing");
const execConfirmed = recordBuyVoidExecutionConfirmedV1({
  root_dir: confirmCase.root,
  attempt_id: confirmCase.attemptId,
  confirmed_record: confirmedTruth.record,
  delivery_block_hash: `0x${"9".repeat(64)}`,
});
if ("reason" in execConfirmed) throw new Error(execConfirmed.reason);
const altered = { ...confirmedTruth.record, request_id: "different_request" };
expectHeld(recordBuyVoidBroadcastConfirmedV1({
  root_dir: confirmCase.root,
  attempt_id: confirmCase.attemptId,
  transaction_hash: confirmCase.deliveryTx,
  confirmed_record: altered,
}), "confirmed_record_attempt_mismatch");

console.log("VOID_BUY_VOID_BROADCAST_OUTCOME_REPLAY_GUARD_V1_GREEN");
