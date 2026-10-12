import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_AUTHORITY_V1,
  buyVoidConfirmedStateJournalPathsV1,
  listBuyVoidConfirmedStatesV1,
  persistBuyVoidConfirmedStateV1,
  readBuyVoidConfirmedStateByPaymentV1,
} from "../src/economic/buy_void_confirmed_state_journal_v1.js";
import {
  confirmBuyVoidFulfillmentV1,
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
  request_id: "buyvoid_confirmed_state_v1",
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

const intentDecision = claimBuyVoidFulfillmentJournalV1({
  root_dir: fs.mkdtempSync(path.join(os.tmpdir(), "void-buy-confirmed-claim-")),
  request,
  verified_payment_event: verified.event,
  policy,
  now_ms: 1_700_200_000_000,
});
if ("reason" in intentDecision) throw new Error(intentDecision.reason);

const confirmed = confirmBuyVoidFulfillmentV1({
  intent: intentDecision.intent,
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

assert.equal(VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_AUTHORITY_V1.rpc_call, false);
assert.equal(VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_AUTHORITY_V1.wallet_access, false);
assert.equal(VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_AUTHORITY_V1.signing, false);
assert.equal(
  VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_AUTHORITY_V1.transaction_broadcast,
  false,
);
assert.equal(VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_AUTHORITY_V1.money_movement, false);
assert.equal(
  VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_AUTHORITY_V1.confirmed_state_persistence,
  true,
);

const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-buy-confirmed-state-"));
const persisted = persistBuyVoidConfirmedStateV1({
  root_dir: root,
  intent: intentDecision.intent,
  confirmed_record: confirmed.record,
  now_ms: 1_700_200_100_000,
});
if ("reason" in persisted) throw new Error(persisted.reason);

assert.equal(persisted.status, "persisted");
assert.equal(persisted.new_state, true);
assert.equal(persisted.duplicate, false);
assert.equal(persisted.recovered_indexes.length, 0);
assert.equal(persisted.recovered_completion, false);
assert.equal(persisted.state.buyer_status.buyer_fulfilled, true);
assert.equal(persisted.state.allocation_status.allocation_fulfilled, true);
assert.equal(
  persisted.state.allocation_status.reserved_void_units,
  persisted.state.allocation_status.delivered_void_units,
);
assert.equal(
  persisted.state.fulfillment_receipt.void_delivery_tx_hash,
  deliveryTx,
);
assert.equal(persisted.state.signing_authorized_by_this_module, false);
assert.equal(
  persisted.state.transaction_broadcast_authorized_by_this_module,
  false,
);
assert.equal(persisted.state.money_movement_authorized_by_this_module, false);
assert.equal(persisted.completion.final, true);

const paths = buyVoidConfirmedStateJournalPathsV1(root);
for (const dir of [
  paths.journal_dir,
  paths.candidates_dir,
  paths.complete_dir,
  paths.payments_dir,
  paths.requests_dir,
  paths.deliveries_dir,
]) {
  assert.equal(fs.statSync(dir).mode & 0o777, 0o700);
}
for (const dir of [
  paths.candidates_dir,
  paths.complete_dir,
  paths.payments_dir,
  paths.requests_dir,
  paths.deliveries_dir,
]) {
  const names = fs.readdirSync(dir);
  assert.equal(names.length, 1);
  assert.equal(fs.statSync(path.join(dir, names[0])).mode & 0o777, 0o600);
}

const duplicate = persistBuyVoidConfirmedStateV1({
  root_dir: root,
  intent: intentDecision.intent,
  confirmed_record: {
    ...confirmed.record,
    delivery_confirmation_count: "11",
  },
  now_ms: 1_700_200_200_000,
});
if ("reason" in duplicate) throw new Error(duplicate.reason);
assert.equal(duplicate.status, "duplicate");
assert.equal(duplicate.duplicate, true);
assert.equal(duplicate.new_state, false);
assert.equal(duplicate.state.state_id, persisted.state.state_id);

const readBack = readBuyVoidConfirmedStateByPaymentV1({
  root_dir: root,
  canonical_payment_identity: confirmed.record.canonical_payment_identity,
});
assert.ok(readBack);
assert.equal(readBack.state_id, persisted.state.state_id);
assert.equal(readBack.buyer_status.status, "fulfilled_confirmed");

const listed = listBuyVoidConfirmedStatesV1(root);
assert.equal(listed.length, 1);
assert.equal(listed[0].state_id, persisted.state.state_id);

console.log("VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_V1_GREEN");
