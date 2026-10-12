import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  prepareBuyVoidExecutionTransactionV1,
  recordBuyVoidExecutionBroadcastV1,
  recordBuyVoidExecutionPostbroadcastFailureV1,
  reserveBuyVoidExecutionAttemptV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";
import {
  recordBuyVoidBroadcastRevertedV1,
  recordBuyVoidBroadcastUnknownV1,
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

function claimFor(
  root: string,
  suffix: string,
  delivery: string,
  paymentTx: string,
  logIndex: number,
) {
  const request: BuyVoidRequestV1 = {
    request_id: `buyvoid_revert_release_guard_${suffix}`,
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
        logIndex,
        transactionHash: paymentTx,
        blockNumber: 100,
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
    root_dir: root,
    request,
    verified_payment_event: verified.event,
    policy: fulfillmentPolicy,
  });
  if ("reason" in claimed) throw new Error(claimed.reason);
  return claimed.intent;
}

function prepareBroadcast(
  root: string,
  intent: ReturnType<typeof claimFor>,
  txHash: string,
) {
  const reserved = reserveBuyVoidExecutionAttemptV1({
    root_dir: root,
    intent,
    policy: executionPolicy,
  });
  if ("reason" in reserved) throw new Error(reserved.reason);
  const attemptId = reserved.attempt.reservation.attempt_id;
  const prepared = prepareBuyVoidExecutionTransactionV1({
    root_dir: root,
    attempt_id: attemptId,
    intent,
    policy: executionPolicy,
    transaction: {
      chain_id: 2050,
      transaction_hash: txHash,
      from_address: wallet,
      to_address: intent.claim.unsigned_instruction.delivery_address,
      amount_units: intent.claim.unsigned_instruction.void_amount_units,
    },
  });
  if ("reason" in prepared) throw new Error(prepared.reason);
  const broadcast = recordBuyVoidExecutionBroadcastV1({
    root_dir: root,
    attempt_id: attemptId,
    transaction_hash: txHash,
  });
  if ("reason" in broadcast) throw new Error(broadcast.reason);
  return attemptId;
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-buy-revert-release-guard-"));
const deliveryA = "0x1111111111111111111111111111111111111111";
const deliveryB = "0x5555555555555555555555555555555555555555";
const paymentA = `0x${"a".repeat(64)}`;
const paymentB = `0x${"c".repeat(64)}`;
const deliveryTxA = `0x${"b".repeat(64)}`;
const deliveryTxB = `0x${"d".repeat(64)}`;

const intentA = claimFor(root, "a", deliveryA, paymentA, 7);
const attemptA = prepareBroadcast(root, intentA, deliveryTxA);
const revertedA = recordBuyVoidBroadcastRevertedV1({
  root_dir: root,
  attempt_id: attemptA,
  transaction_hash: deliveryTxA,
  observation: {
    chain_id: 2050,
    transaction_status: 0,
    block_number: 800,
    current_block_number: 804,
  },
  policy: {
    outcome_journal_enabled: true,
    chain_id: 2050,
    min_revert_confirmations: 3,
  },
  now_ms: 1_700_900_000_000,
});
if ("reason" in revertedA) throw new Error(revertedA.reason);
assert.ok(revertedA.state.reverted);

const firstRelease = recordBuyVoidExecutionPostbroadcastFailureV1({
  root_dir: root,
  attempt_id: attemptA,
  outcome: revertedA.state.reverted,
  now_ms: 1_700_900_100_000,
});
if ("reason" in firstRelease) throw new Error(firstRelease.reason);
assert.equal(firstRelease.status, "recorded");

const duplicateRelease = recordBuyVoidExecutionPostbroadcastFailureV1({
  root_dir: root,
  attempt_id: attemptA,
  outcome: revertedA.state.reverted,
  now_ms: 1_700_900_200_000,
});
if ("reason" in duplicateRelease) throw new Error(duplicateRelease.reason);
assert.equal(duplicateRelease.status, "duplicate");

const conflictingOutcome = {
  ...revertedA.state.reverted,
  confirmation_count: "99",
};
const conflict = recordBuyVoidExecutionPostbroadcastFailureV1({
  root_dir: root,
  attempt_id: attemptA,
  outcome: conflictingOutcome,
});
assert.equal("reason" in conflict, true);
if (!("reason" in conflict)) throw new Error("expected conflict");
assert.equal(conflict.reason, "execution_postbroadcast_failure_conflict");

const intentB = claimFor(root, "b", deliveryB, paymentB, 8);
const attemptB = prepareBroadcast(root, intentB, deliveryTxB);
const wrongAttempt = recordBuyVoidExecutionPostbroadcastFailureV1({
  root_dir: root,
  attempt_id: attemptB,
  outcome: revertedA.state.reverted,
});
assert.equal("reason" in wrongAttempt, true);
if (!("reason" in wrongAttempt)) throw new Error("expected wrong attempt hold");
assert.equal(wrongAttempt.reason, "invalid_definitive_revert_outcome");

const unknownB = recordBuyVoidBroadcastUnknownV1({
  root_dir: root,
  attempt_id: attemptB,
  transaction_hash: deliveryTxB,
  reason_code: "provider_timeout",
});
if ("reason" in unknownB) throw new Error(unknownB.reason);
assert.equal(unknownB.state.status, "broadcast_unknown");
assert.equal(unknownB.state.retry_allowed, false);

const fakeUnknownRelease = recordBuyVoidExecutionPostbroadcastFailureV1({
  root_dir: root,
  attempt_id: attemptB,
  outcome: {
    ...(unknownB.state.unknown as any),
    schema: "void_buy_void_broadcast_reverted_record_v1",
    transaction_status: 0,
    block_number: "900",
    current_block_number: "904",
    confirmation_count: "5",
    min_revert_confirmations: 3,
    definitive_revert: false,
    retry_allowed: true,
    reconciliation_required: false,
  },
});
assert.equal("reason" in fakeUnknownRelease, true);
if (!("reason" in fakeUnknownRelease)) throw new Error("expected unknown hold");
assert.equal(fakeUnknownRelease.reason, "invalid_definitive_revert_outcome");

const stillActive = reserveBuyVoidExecutionAttemptV1({
  root_dir: root,
  intent: intentB,
  policy: executionPolicy,
});
if ("reason" in stillActive) throw new Error(stillActive.reason);
assert.equal(stillActive.status, "duplicate");
assert.equal(stillActive.attempt.status, "broadcast");

console.log("VOID_BUY_VOID_EXECUTION_ATTEMPT_REVERT_RELEASE_GUARD_V1_GREEN");
