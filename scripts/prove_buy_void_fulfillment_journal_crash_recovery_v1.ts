import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  claimBuyVoidFulfillmentJournalV1,
  buyVoidFulfillmentJournalPathsV1,
  listBuyVoidFulfillmentJournalClaimsV1,
} from "../src/economic/buy_void_fulfillment_journal_v1.js";
import {
  buildBuyVoidVerifiedPaymentEventV2,
  type BuyVoidTransactionReceiptV2,
} from "../src/economic/buy_void_verified_payment_v2.js";
import type {
  BuyVoidAutoFulfillmentPolicyV1,
  BuyVoidRequestV1,
} from "../src/economic/buy_void_auto_fulfillment_v1.js";

const delivery = "0x4444444444444444444444444444444444444444";
const receive = "0x5555555555555555555555555555555555555555";
const usdc = "0x6666666666666666666666666666666666666666";
const transferTopic =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function topic(address: string): string {
  return `0x${"0".repeat(24)}${address.slice(2)}`;
}

function uintHex(value: bigint): string {
  return `0x${value.toString(16)}`;
}

function tx(char: string): string {
  return `0x${char.repeat(64)}`;
}

function makeRequest(requestId: string, txHash: string): BuyVoidRequestV1 {
  return {
    request_id: requestId,
    source_chain: "base",
    tx_hash: txHash,
    delivery_address: delivery,
    receive_address: receive,
    usdc_amount: "10",
    quoted_void: "20",
  };
}

function makeReceipt(txHash: string, logIndex: number): BuyVoidTransactionReceiptV2 {
  return {
    status: "0x1",
    transactionHash: txHash,
    blockNumber: "0xc8",
    logs: [
      {
        address: usdc,
        topics: [transferTopic, topic(delivery), topic(receive)],
        data: uintHex(10_000_000n),
        logIndex,
        transactionHash: txHash,
        blockNumber: "0xc8",
        removed: false,
      },
    ],
  };
}

function verified(
  request: BuyVoidRequestV1,
  receipt: BuyVoidTransactionReceiptV2,
  currentBlock: number,
) {
  const result = buildBuyVoidVerifiedPaymentEventV2({
    request,
    receipt,
    policy: {
      allowed_chains: ["base"],
      usdc_contract_by_chain: { base: usdc },
      receive_address_by_chain: { base: receive },
      current_block_number_by_chain: { base: currentBlock },
    },
  });
  if ("reason" in result) throw new Error(result.reason);
  return result.event;
}

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

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-journal-crash-v1-"),
);
const request = makeRequest("buyvoid_crash_recovery_v1", tx("b"));
const receipt = makeReceipt(request.tx_hash, 9);
const event = verified(request, receipt, 205);

const first = claimBuyVoidFulfillmentJournalV1({
  root_dir: root,
  request,
  verified_payment_event: event,
  policy,
  now_ms: 1_700_001_000_000,
});
if ("reason" in first) throw new Error(first.reason);
assert.equal(first.status, "approved");

const paths = buyVoidFulfillmentJournalPathsV1(root);
const requestIndexFile = path.join(
  paths.requests_dir,
  `${first.intent.request_key_sha256}.json`,
);
fs.unlinkSync(requestIndexFile);
assert.equal(fs.existsSync(requestIndexFile), false);

const recovered = claimBuyVoidFulfillmentJournalV1({
  root_dir: root,
  request,
  verified_payment_event: verified(request, receipt, 210),
  policy,
  now_ms: 1_700_001_100_000,
});
if ("reason" in recovered) throw new Error(recovered.reason);
assert.equal(recovered.status, "duplicate");
assert.equal(recovered.recovered_request_index, true);
assert.equal(fs.existsSync(requestIndexFile), true);
assert.equal(recovered.claim.instruction_id, first.claim.instruction_id);

const regressed = claimBuyVoidFulfillmentJournalV1({
  root_dir: root,
  request,
  verified_payment_event: verified(request, receipt, 202),
  policy,
});
assert.equal(regressed.ok, false);
assert.equal("reason" in regressed && regressed.reason, "confirmation_count_regression");

const secondPaymentRequest = makeRequest(request.request_id, tx("c"));
const secondPaymentReceipt = makeReceipt(secondPaymentRequest.tx_hash, 10);
const secondPayment = claimBuyVoidFulfillmentJournalV1({
  root_dir: root,
  request: secondPaymentRequest,
  verified_payment_event: verified(
    secondPaymentRequest,
    secondPaymentReceipt,
    205,
  ),
  policy,
});
assert.equal(secondPayment.ok, false);
assert.equal("reason" in secondPayment && secondPayment.reason, "request_already_claimed");
assert.equal(listBuyVoidFulfillmentJournalClaimsV1(root).length, 1);

const replayRequest = makeRequest("buyvoid_replay_other_request_v1", request.tx_hash);
const replay = claimBuyVoidFulfillmentJournalV1({
  root_dir: root,
  request: replayRequest,
  verified_payment_event: verified(replayRequest, receipt, 205),
  policy,
});
assert.equal(replay.ok, false);
assert.equal(
  "reason" in replay && replay.reason,
  "payment_identity_already_claimed",
);
assert.equal(listBuyVoidFulfillmentJournalClaimsV1(root).length, 1);

const corruptRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-journal-corrupt-v1-"),
);
const corruptFirst = claimBuyVoidFulfillmentJournalV1({
  root_dir: corruptRoot,
  request,
  verified_payment_event: event,
  policy,
});
if ("reason" in corruptFirst) throw new Error(corruptFirst.reason);
const corruptPaths = buyVoidFulfillmentJournalPathsV1(corruptRoot);
const corruptPaymentFile = path.join(
  corruptPaths.payments_dir,
  `${corruptFirst.intent.payment_key_sha256}.json`,
);
fs.writeFileSync(corruptPaymentFile, "{truncated", { mode: 0o600 });
const corruptRetry = claimBuyVoidFulfillmentJournalV1({
  root_dir: corruptRoot,
  request,
  verified_payment_event: event,
  policy,
});
assert.equal(corruptRetry.ok, false);
assert.equal("reason" in corruptRetry && corruptRetry.reason, "fulfillment_journal_failed");
assert.match(
  String("detail" in corruptRetry ? corruptRetry.detail?.message : ""),
  /journal_corrupt_json/,
);

console.log("VOID_BUY_VOID_FULFILLMENT_JOURNAL_CRASH_RECOVERY_V1_GREEN");
