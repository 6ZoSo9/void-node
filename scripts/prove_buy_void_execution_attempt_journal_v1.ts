import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_AUTHORITY_V1,
  buyVoidExecutionAttemptJournalPathsV1,
  listBuyVoidExecutionAttemptsV1,
  prepareBuyVoidExecutionTransactionV1,
  recordBuyVoidExecutionBroadcastV1,
  recordBuyVoidExecutionConfirmedV1,
  recordBuyVoidExecutionPrebroadcastFailureV1,
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
const paymentTx = `0x${"a".repeat(64)}`;
const deliveryTx = `0x${"b".repeat(64)}`;
const transferTopic =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function topic(address: string): string {
  return `0x${"0".repeat(24)}${address.slice(2)}`;
}

const request: BuyVoidRequestV1 = {
  request_id: "buyvoid_execution_attempt_basic_v1",
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

const claimRoot = fs.mkdtempSync(path.join(os.tmpdir(), "void-buy-exec-claim-"));
const claimed = claimBuyVoidFulfillmentJournalV1({
  root_dir: claimRoot,
  request,
  verified_payment_event: verified.event,
  policy: fulfillmentPolicy,
  now_ms: 1_700_300_000_000,
});
if ("reason" in claimed) throw new Error(claimed.reason);

const executionPolicy = {
  attempt_journal_enabled: true,
  max_attempts_per_payment: 3,
  chain_id: 2050,
  fulfillment_wallet_allowlist: [wallet],
};
const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-buy-execution-attempt-"));

assert.equal(VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_AUTHORITY_V1.filesystem_write, true);
assert.equal(VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_AUTHORITY_V1.rpc_call, false);
assert.equal(VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_AUTHORITY_V1.wallet_access, false);
assert.equal(VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_AUTHORITY_V1.signing, false);
assert.equal(
  VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_AUTHORITY_V1.transaction_broadcast,
  false,
);
assert.equal(VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_AUTHORITY_V1.money_movement, false);
assert.equal(
  VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_AUTHORITY_V1.raw_transaction_persistence,
  false,
);

const first = reserveBuyVoidExecutionAttemptV1({
  root_dir: root,
  intent: claimed.intent,
  policy: executionPolicy,
  now_ms: 1_700_300_100_000,
});
if ("reason" in first) throw new Error(first.reason);
assert.equal(first.status, "reserved");
assert.equal(first.new_attempt, true);
assert.equal(first.attempt.reservation.attempt_number, 1);
assert.equal(first.attempt.status, "reserved");

const duplicateReserve = reserveBuyVoidExecutionAttemptV1({
  root_dir: root,
  intent: claimed.intent,
  policy: executionPolicy,
});
if ("reason" in duplicateReserve) throw new Error(duplicateReserve.reason);
assert.equal(duplicateReserve.status, "duplicate");
assert.equal(
  duplicateReserve.attempt.reservation.attempt_id,
  first.attempt.reservation.attempt_id,
);

const failed = recordBuyVoidExecutionPrebroadcastFailureV1({
  root_dir: root,
  attempt_id: first.attempt.reservation.attempt_id,
  failure_code: "signer_temporarily_unavailable",
  retryable: true,
  now_ms: 1_700_300_200_000,
});
if ("reason" in failed) throw new Error(failed.reason);
assert.equal(failed.attempt.status, "failed_retryable");

const second = reserveBuyVoidExecutionAttemptV1({
  root_dir: root,
  intent: claimed.intent,
  policy: executionPolicy,
  now_ms: 1_700_300_300_000,
});
if ("reason" in second) throw new Error(second.reason);
assert.equal(second.status, "reserved");
assert.equal(second.attempt.reservation.attempt_number, 2);
assert.notEqual(
  second.attempt.reservation.attempt_id,
  first.attempt.reservation.attempt_id,
);

const prepared = prepareBuyVoidExecutionTransactionV1({
  root_dir: root,
  attempt_id: second.attempt.reservation.attempt_id,
  intent: claimed.intent,
  policy: executionPolicy,
  transaction: {
    chain_id: 2050,
    transaction_hash: deliveryTx,
    from_address: wallet,
    to_address: delivery,
    amount_units: "50000000",
  },
  now_ms: 1_700_300_400_000,
});
if ("reason" in prepared) throw new Error(prepared.reason);
assert.equal(prepared.status, "recorded");
assert.equal(prepared.attempt.status, "prepared");
assert.equal(prepared.attempt.prepared?.raw_transaction_persisted, false);
assert.equal(prepared.attempt.prepared?.signed_transaction_persisted, false);

const duplicatePrepare = prepareBuyVoidExecutionTransactionV1({
  root_dir: root,
  attempt_id: second.attempt.reservation.attempt_id,
  intent: claimed.intent,
  policy: executionPolicy,
  transaction: {
    chain_id: 2050,
    transaction_hash: deliveryTx,
    from_address: wallet,
    to_address: delivery,
    amount_units: "50000000",
  },
});
if ("reason" in duplicatePrepare) throw new Error(duplicatePrepare.reason);
assert.equal(duplicatePrepare.status, "duplicate");

const broadcast = recordBuyVoidExecutionBroadcastV1({
  root_dir: root,
  attempt_id: second.attempt.reservation.attempt_id,
  transaction_hash: deliveryTx,
  provider_submission_id: "rpc-submit-1",
  now_ms: 1_700_300_500_000,
});
if ("reason" in broadcast) throw new Error(broadcast.reason);
assert.equal(broadcast.attempt.status, "broadcast");
assert.equal(broadcast.attempt.broadcast?.external_broadcast_observed, true);
assert.equal(
  broadcast.attempt.broadcast?.transaction_broadcast_performed_by_this_module,
  false,
);

const activeRetry = reserveBuyVoidExecutionAttemptV1({
  root_dir: root,
  intent: claimed.intent,
  policy: executionPolicy,
});
if ("reason" in activeRetry) throw new Error(activeRetry.reason);
assert.equal(activeRetry.status, "duplicate");
assert.equal(activeRetry.attempt.status, "broadcast");

const confirmed = confirmBuyVoidFulfillmentV1({
  intent: claimed.intent,
  observation: {
    chain_id: 2050,
    transaction_hash: deliveryTx,
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
if ("reason" in confirmed) throw new Error(confirmed.reason);

const recordedConfirmation = recordBuyVoidExecutionConfirmedV1({
  root_dir: root,
  attempt_id: second.attempt.reservation.attempt_id,
  confirmed_record: confirmed.record,
  delivery_block_hash: `0x${"9".repeat(64)}`,
  now_ms: 1_700_300_600_000,
});
if ("reason" in recordedConfirmation) throw new Error(recordedConfirmation.reason);
assert.equal(recordedConfirmation.attempt.status, "confirmed");

const duplicateConfirmation = recordBuyVoidExecutionConfirmedV1({
  root_dir: root,
  attempt_id: second.attempt.reservation.attempt_id,
  confirmed_record: confirmed.record,
  delivery_block_hash: `0x${"9".repeat(64)}`,
});
if ("reason" in duplicateConfirmation) throw new Error(duplicateConfirmation.reason);
assert.equal(duplicateConfirmation.status, "duplicate");

const afterConfirmed = reserveBuyVoidExecutionAttemptV1({
  root_dir: root,
  intent: claimed.intent,
  policy: executionPolicy,
});
assert.equal("reason" in afterConfirmed, true);
if (!("reason" in afterConfirmed)) throw new Error("expected held result");
assert.equal(afterConfirmed.reason, "payment_already_confirmed");

const attempts = listBuyVoidExecutionAttemptsV1(root);
assert.equal(attempts.length, 2);
assert.deepEqual(
  attempts.map((attempt) => attempt.status),
  ["failed_retryable", "confirmed"],
);

const paths = buyVoidExecutionAttemptJournalPathsV1(root);
for (const dir of [paths.journal_dir, paths.attempts_dir, paths.deliveries_dir]) {
  assert.equal(fs.statSync(dir).mode & 0o777, 0o700);
}
for (const attempt of attempts) {
  const dir = path.join(paths.attempts_dir, attempt.reservation.attempt_id);
  assert.equal(fs.statSync(dir).mode & 0o777, 0o700);
  for (const name of fs.readdirSync(dir)) {
    assert.equal(fs.statSync(path.join(dir, name)).mode & 0o777, 0o600);
  }
}
for (const name of fs.readdirSync(paths.deliveries_dir)) {
  assert.equal(fs.statSync(path.join(paths.deliveries_dir, name)).mode & 0o777, 0o600);
  assert.equal(name.includes(deliveryTx.slice(2, 18)), false);
}

console.log("VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1_GREEN");
