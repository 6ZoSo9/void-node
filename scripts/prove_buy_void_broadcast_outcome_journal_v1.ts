import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  VOID_BUY_VOID_BROADCAST_OUTCOME_AUTHORITY_V1,
  readBuyVoidBroadcastOutcomeStateV1,
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

function setupAttempt(label: string, paymentNibble: string, deliveryNibble: string) {
  const paymentTx = `0x${paymentNibble.repeat(64)}`;
  const deliveryTx = `0x${deliveryNibble.repeat(64)}`;
  const request: BuyVoidRequestV1 = {
    request_id: `buyvoid_broadcast_${label}`,
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

  const claimRoot = fs.mkdtempSync(path.join(os.tmpdir(), `void-buy-broadcast-claim-${label}-`));
  const claim = claimBuyVoidFulfillmentJournalV1({
    root_dir: claimRoot,
    request,
    verified_payment_event: verified.event,
    policy: fulfillmentPolicy,
  });
  if ("reason" in claim) throw new Error(claim.reason);

  const root = fs.mkdtempSync(path.join(os.tmpdir(), `void-buy-broadcast-${label}-`));
  const reserved = reserveBuyVoidExecutionAttemptV1({
    root_dir: root,
    intent: claim.intent,
    policy: executionPolicy,
  });
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
  return {
    root,
    intent: claim.intent,
    attemptId: reserved.attempt.reservation.attempt_id,
    paymentTx,
    deliveryTx,
  };
}

assert.equal(VOID_BUY_VOID_BROADCAST_OUTCOME_AUTHORITY_V1.filesystem_write, true);
assert.equal(VOID_BUY_VOID_BROADCAST_OUTCOME_AUTHORITY_V1.rpc_call, false);
assert.equal(VOID_BUY_VOID_BROADCAST_OUTCOME_AUTHORITY_V1.wallet_access, false);
assert.equal(VOID_BUY_VOID_BROADCAST_OUTCOME_AUTHORITY_V1.signing, false);
assert.equal(VOID_BUY_VOID_BROADCAST_OUTCOME_AUTHORITY_V1.transaction_broadcast, false);
assert.equal(VOID_BUY_VOID_BROADCAST_OUTCOME_AUTHORITY_V1.money_movement, false);

const uncertain = setupAttempt("unknown_to_confirmed", "a", "b");
const unknown = recordBuyVoidBroadcastUnknownV1({
  root_dir: uncertain.root,
  attempt_id: uncertain.attemptId,
  transaction_hash: uncertain.deliveryTx,
  reason_code: "provider_timeout_after_submit",
  provider_submission_id: "provider-unknown-1",
});
if ("reason" in unknown) throw new Error(unknown.reason);
assert.equal(unknown.state.status, "broadcast_unknown");
assert.equal(unknown.state.retry_allowed, false);
assert.equal(unknown.state.reconciliation_required, true);

const unknownDuplicate = recordBuyVoidBroadcastUnknownV1({
  root_dir: uncertain.root,
  attempt_id: uncertain.attemptId,
  transaction_hash: uncertain.deliveryTx,
  reason_code: "provider_timeout_after_submit",
  provider_submission_id: "provider-unknown-1",
});
if ("reason" in unknownDuplicate) throw new Error(unknownDuplicate.reason);
assert.equal(unknownDuplicate.status, "duplicate");

const externalBroadcast = recordBuyVoidExecutionBroadcastV1({
  root_dir: uncertain.root,
  attempt_id: uncertain.attemptId,
  transaction_hash: uncertain.deliveryTx,
  provider_submission_id: "provider-accepted-1",
});
if ("reason" in externalBroadcast) throw new Error(externalBroadcast.reason);

const accepted = recordBuyVoidBroadcastAcceptedV1({
  root_dir: uncertain.root,
  attempt_id: uncertain.attemptId,
  transaction_hash: uncertain.deliveryTx,
  provider_submission_id: "provider-accepted-1",
});
if ("reason" in accepted) throw new Error(accepted.reason);
assert.equal(accepted.state.status, "broadcast_accepted");
assert.equal(accepted.state.retry_allowed, false);
assert.equal(accepted.state.reconciliation_required, true);

const confirmedTruth = confirmBuyVoidFulfillmentV1({
  intent: uncertain.intent,
  observation: {
    chain_id: 2050,
    transaction_hash: uncertain.deliveryTx,
    transaction_status: 1,
    block_number: 500,
    current_block_number: 505,
    from_address: wallet,
    to_address: delivery,
    amount_units: "50000000",
  },
  policy: {
    chain_id: 2050,
    min_confirmations: 3,
    fulfillment_wallet_allowlist: [wallet],
  },
});
if ("reason" in confirmedTruth) throw new Error(confirmedTruth.reason);
const executionConfirmed = recordBuyVoidExecutionConfirmedV1({
  root_dir: uncertain.root,
  attempt_id: uncertain.attemptId,
  confirmed_record: confirmedTruth.record,
});
if ("reason" in executionConfirmed) throw new Error(executionConfirmed.reason);

const confirmed = recordBuyVoidBroadcastConfirmedV1({
  root_dir: uncertain.root,
  attempt_id: uncertain.attemptId,
  transaction_hash: uncertain.deliveryTx,
  confirmed_record: confirmedTruth.record,
});
if ("reason" in confirmed) throw new Error(confirmed.reason);
assert.equal(confirmed.state.status, "confirmed");
assert.equal(confirmed.state.retry_allowed, false);
assert.equal(confirmed.state.reconciliation_required, false);
assert.equal(confirmed.state.terminal, true);

const notSent = setupAttempt("not_broadcast", "c", "d");
const notBroadcast = recordBuyVoidNotBroadcastV1({
  root_dir: notSent.root,
  attempt_id: notSent.attemptId,
  transaction_hash: notSent.deliveryTx,
  reason_code: "provider_rejected_before_submission",
});
if ("reason" in notBroadcast) throw new Error(notBroadcast.reason);
assert.equal(notBroadcast.state.status, "not_broadcast");
assert.equal(notBroadcast.state.retry_allowed, true);
assert.equal(notBroadcast.state.reconciliation_required, false);
assert.equal(notBroadcast.state.terminal, true);

const revertedAttempt = setupAttempt("reverted", "e", "f");
const revertedBroadcast = recordBuyVoidExecutionBroadcastV1({
  root_dir: revertedAttempt.root,
  attempt_id: revertedAttempt.attemptId,
  transaction_hash: revertedAttempt.deliveryTx,
});
if ("reason" in revertedBroadcast) throw new Error(revertedBroadcast.reason);
const reverted = recordBuyVoidBroadcastRevertedV1({
  root_dir: revertedAttempt.root,
  attempt_id: revertedAttempt.attemptId,
  transaction_hash: revertedAttempt.deliveryTx,
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
});
if ("reason" in reverted) throw new Error(reverted.reason);
assert.equal(reverted.state.status, "reverted");
assert.equal(reverted.state.retry_allowed, true);
assert.equal(reverted.state.reconciliation_required, false);
assert.equal(reverted.state.reverted?.confirmation_count, "5");

const reread = readBuyVoidBroadcastOutcomeStateV1({
  root_dir: uncertain.root,
  attempt_id: uncertain.attemptId,
});
assert.equal(reread?.status, "confirmed");

for (const scenarioRoot of [uncertain.root, notSent.root, revertedAttempt.root]) {
  const journal = path.join(scenarioRoot, "buy-void-broadcast-outcomes-v1");
  assert.equal(fs.statSync(journal).mode & 0o777, 0o700);
}

console.log("VOID_BUY_VOID_BROADCAST_OUTCOME_JOURNAL_V1_GREEN");
