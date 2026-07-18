import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  VOID_BUY_VOID_FULFILLMENT_JOURNAL_AUTHORITY_V1,
  claimBuyVoidFulfillmentJournalV1,
  buyVoidFulfillmentJournalPathsV1,
  listBuyVoidFulfillmentJournalClaimsV1,
  readBuyVoidFulfillmentJournalClaimV1,
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
const txHash = `0x${"a".repeat(64)}`;
const transferTopic =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function topic(address: string): string {
  return `0x${"0".repeat(24)}${address.slice(2)}`;
}

function uintHex(value: bigint): string {
  return `0x${value.toString(16)}`;
}

const request: BuyVoidRequestV1 = {
  request_id: "buyvoid_journal_basic_v1",
  source_chain: "base",
  tx_hash: txHash,
  delivery_address: delivery,
  receive_address: receive,
  usdc_amount: "25",
  quoted_void: "50",
};

const receipt: BuyVoidTransactionReceiptV2 = {
  status: "0x1",
  transactionHash: txHash,
  blockNumber: "0x64",
  logs: [
    {
      address: usdc,
      topics: [transferTopic, topic(delivery), topic(receive)],
      data: uintHex(25_000_000n),
      logIndex: "0x7",
      transactionHash: txHash,
      blockNumber: "0x64",
      removed: false,
    },
  ],
};

function verified(currentBlock: number) {
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

const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-buy-journal-v1-"));

assert.equal(VOID_BUY_VOID_FULFILLMENT_JOURNAL_AUTHORITY_V1.filesystem_write, true);
assert.equal(VOID_BUY_VOID_FULFILLMENT_JOURNAL_AUTHORITY_V1.rpc_call, false);
assert.equal(VOID_BUY_VOID_FULFILLMENT_JOURNAL_AUTHORITY_V1.wallet_access, false);
assert.equal(VOID_BUY_VOID_FULFILLMENT_JOURNAL_AUTHORITY_V1.signing, false);
assert.equal(
  VOID_BUY_VOID_FULFILLMENT_JOURNAL_AUTHORITY_V1.transaction_broadcast,
  false,
);
assert.equal(VOID_BUY_VOID_FULFILLMENT_JOURNAL_AUTHORITY_V1.money_movement, false);

const first = claimBuyVoidFulfillmentJournalV1({
  root_dir: root,
  request,
  verified_payment_event: verified(105),
  policy,
  now_ms: 1_700_000_000_000,
});
if ("reason" in first) throw new Error(first.reason);
assert.equal(first.status, "approved");
assert.equal(first.new_claim, true);
assert.equal(first.duplicate, false);
assert.equal(first.recovered_request_index, false);
assert.equal(first.claim.status, "claimed");
assert.equal(first.intent.signing_authorized, false);
assert.equal(first.intent.transaction_broadcast_authorized, false);
assert.equal(first.intent.money_movement_authorized, false);

const paths = buyVoidFulfillmentJournalPathsV1(root);
const paymentFile = path.join(
  paths.payments_dir,
  `${first.intent.payment_key_sha256}.json`,
);
const requestFile = path.join(
  paths.requests_dir,
  `${first.intent.request_key_sha256}.json`,
);
assert.equal(fs.existsSync(paymentFile), true);
assert.equal(fs.existsSync(requestFile), true);
assert.equal(fs.statSync(paths.journal_dir).mode & 0o777, 0o700);
assert.equal(fs.statSync(paths.payments_dir).mode & 0o777, 0o700);
assert.equal(fs.statSync(paths.requests_dir).mode & 0o777, 0o700);
assert.equal(fs.statSync(paymentFile).mode & 0o777, 0o600);
assert.equal(fs.statSync(requestFile).mode & 0o777, 0o600);
assert.equal(path.basename(paymentFile).includes(txHash.slice(2, 18)), false);

const retry = claimBuyVoidFulfillmentJournalV1({
  root_dir: root,
  request,
  verified_payment_event: verified(112),
  policy: {
    ...policy,
    automatic_fulfillment_enabled: false,
    pool_remaining_void_units: "0",
  },
  now_ms: 1_700_000_100_000,
});
if ("reason" in retry) throw new Error(retry.reason);
assert.equal(retry.status, "duplicate");
assert.equal(retry.new_claim, false);
assert.equal(retry.duplicate, true);
assert.equal(retry.claim.instruction_id, first.claim.instruction_id);
assert.equal(
  retry.claim.unsigned_instruction.confirmation_count,
  first.claim.unsigned_instruction.confirmation_count,
);

const claims = listBuyVoidFulfillmentJournalClaimsV1(root);
assert.equal(claims.length, 1);
assert.equal(claims[0].claim.instruction_id, first.claim.instruction_id);

const readBack = readBuyVoidFulfillmentJournalClaimV1({
  root_dir: root,
  canonical_payment_identity: first.claim.canonical_payment_identity,
});
assert.ok(readBack);
assert.equal(readBack.claim.request_id, request.request_id);
assert.equal(readBack.verification_binding.confirmation_count_at_claim, "6");
assert.equal(readBack.verification_binding.payment_log_index, "7");

console.log("VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1_GREEN");
