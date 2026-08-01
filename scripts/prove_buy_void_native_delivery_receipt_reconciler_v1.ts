import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  prepareBuyVoidExecutionTransactionV1,
  readBuyVoidExecutionAttemptV1,
  recordBuyVoidExecutionBroadcastV1,
  reserveBuyVoidExecutionAttemptV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";
import { claimBuyVoidFulfillmentJournalV1 } from "../src/economic/buy_void_fulfillment_journal_v1.js";
import {
  VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_AUTHORITY_V1,
  VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_CONFIRMATION_V1,
  VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_V1,
  runBuyVoidNativeDeliveryReceiptReconcilerV1,
  type BuyVoidNativeDeliveryReceiptRpcMethodV1,
} from "../src/economic/buy_void_native_delivery_receipt_reconciler_v1.js";
import {
  buildBuyVoidVerifiedPaymentEventV2,
  type BuyVoidTransactionReceiptV2,
} from "../src/economic/buy_void_verified_payment_v2.js";
import type {
  BuyVoidAutoFulfillmentPolicyV1,
  BuyVoidRequestV1,
} from "../src/economic/buy_void_auto_fulfillment_v1.js";

const delivery = "0x1111111111111111111111111111111111111111";
const receive = "0x3333333333333333333333333333333333333333";
const usdc = "0x4444444444444444444444444444444444444444";
const wallet = "0x5555555555555555555555555555555555555555";
const paymentTx = `0x${"a".repeat(64)}`;
const deliveryTx = `0x${"b".repeat(64)}`;
const transferTopic =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function topic(address: string): string {
  return `0x${"0".repeat(24)}${address.slice(2)}`;
}

const request: BuyVoidRequestV1 = {
  request_id: "buyvoid_native_receipt_reconciliation_v1",
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
const verifiedEvent = verified.event;

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
  max_attempts_per_payment: 1,
  chain_id: 2050,
  fulfillment_wallet_allowlist: [wallet],
};

function createBroadcastAttempt() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-buy-native-receipt-reconcile-"),
  );
  const claimed = claimBuyVoidFulfillmentJournalV1({
    root_dir: root,
    request,
    verified_payment_event: verifiedEvent,
    policy: fulfillmentPolicy,
    now_ms: 1_700_400_000_000,
  });
  if ("reason" in claimed) throw new Error(claimed.reason);
  const reserved = reserveBuyVoidExecutionAttemptV1({
    root_dir: root,
    intent: claimed.intent,
    policy: executionPolicy,
    now_ms: 1_700_400_100_000,
  });
  if ("reason" in reserved) throw new Error(reserved.reason);
  const attemptId = reserved.attempt.reservation.attempt_id;
  const prepared = prepareBuyVoidExecutionTransactionV1({
    root_dir: root,
    attempt_id: attemptId,
    intent: claimed.intent,
    policy: executionPolicy,
    transaction: {
      chain_id: 2050,
      transaction_hash: deliveryTx,
      from_address: wallet,
      to_address: delivery,
      amount_units: "50000000",
    },
    now_ms: 1_700_400_200_000,
  });
  if ("reason" in prepared) throw new Error(prepared.reason);
  const broadcast = recordBuyVoidExecutionBroadcastV1({
    root_dir: root,
    attempt_id: attemptId,
    transaction_hash: deliveryTx,
    provider_submission_id: "proof-rpc-submit-1",
    now_ms: 1_700_400_300_000,
  });
  if ("reason" in broadcast) throw new Error(broadcast.reason);
  return { root, attemptId, intent: claimed.intent };
}

function policy() {
  return {
    enabled: true as const,
    chain_id: "2050" as const,
    rpc_url: "http://127.0.0.1:8545/",
    min_confirmations: 3,
    fulfillment_wallet_allowlist: [wallet],
  };
}

function transport(options: {
  status?: "0x0" | "0x1";
  receipt?: unknown;
  chain?: unknown;
  block?: unknown;
  calls: BuyVoidNativeDeliveryReceiptRpcMethodV1[];
}) {
  return async (call: {
    method: BuyVoidNativeDeliveryReceiptRpcMethodV1;
    params: unknown[];
  }) => {
    options.calls.push(call.method);
    if (call.method === "eth_chainId") return options.chain ?? "0x802";
    if (call.method === "eth_blockNumber") return options.block ?? "0x1f8";
    assert.deepEqual(call.params, [deliveryTx]);
    if (options.receipt !== undefined) return options.receipt;
    return {
      transactionHash: deliveryTx,
      status: options.status ?? "0x1",
      blockNumber: "0x1f4",
      from: wallet,
      to: delivery,
    };
  };
}

function reason(value: Awaited<ReturnType<
  typeof runBuyVoidNativeDeliveryReceiptReconcilerV1
>>): string {
  assert.equal(value.ok, false);
  if (value.ok) throw new Error("expected held receipt reconciliation");
  return value.reason;
}

assert.equal(
  VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_V1,
  "VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_V1",
);
assert.equal(
  VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_CONFIRMATION_V1,
  "buyVoidReconcileNativeDeliveryReceipt",
);
assert.deepEqual(
  VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_AUTHORITY_V1
    .read_only_rpc_methods,
  ["eth_chainId", "eth_getTransactionReceipt", "eth_blockNumber"],
);
for (const key of [
  "wallet_access",
  "secret_access",
  "signing",
  "transaction_broadcast",
  "inventory_decrement",
  "public_request_journal_write",
  "runtime_route_mount",
  "background_loop",
  "automatic_retry",
  "service_restart",
  "money_movement",
] as const) {
  assert.equal(
    VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_AUTHORITY_V1[key],
    false,
    key,
  );
}

const roots: string[] = [];
try {
  const fixture = createBroadcastAttempt();
  roots.push(fixture.root);
  let calls: BuyVoidNativeDeliveryReceiptRpcMethodV1[] = [];
  const disabled = await runBuyVoidNativeDeliveryReceiptReconcilerV1({
    root_dir: fixture.root,
    attempt_id: fixture.attemptId,
    intent: fixture.intent,
    policy: { ...policy(), enabled: false },
    transport: transport({ calls }),
  });
  assert.equal(reason(disabled), "native_delivery_receipt_reconciler_disabled");
  assert.deepEqual(calls, []);

  calls = [];
  const missingConfirmation =
    await runBuyVoidNativeDeliveryReceiptReconcilerV1({
      root_dir: fixture.root,
      attempt_id: fixture.attemptId,
      intent: fixture.intent,
      policy: policy(),
      apply: true,
      transport: transport({ calls }),
    });
  assert.equal(reason(missingConfirmation), "explicit_confirmation_required");
  assert.deepEqual(calls, []);

  calls = [];
  const wrongChain = await runBuyVoidNativeDeliveryReceiptReconcilerV1({
    root_dir: fixture.root,
    attempt_id: fixture.attemptId,
    intent: fixture.intent,
    policy: policy(),
    transport: transport({ calls, chain: "0x1" }),
  });
  assert.equal(reason(wrongChain), "native_delivery_chain_mismatch");
  assert.deepEqual(calls, ["eth_chainId"]);

  calls = [];
  const pending = await runBuyVoidNativeDeliveryReceiptReconcilerV1({
    root_dir: fixture.root,
    attempt_id: fixture.attemptId,
    intent: fixture.intent,
    policy: policy(),
    transport: transport({ calls, receipt: null }),
  });
  assert.equal(reason(pending), "native_delivery_receipt_pending");
  assert.deepEqual(calls, ["eth_chainId", "eth_getTransactionReceipt"]);

  calls = [];
  const shallow = await runBuyVoidNativeDeliveryReceiptReconcilerV1({
    root_dir: fixture.root,
    attempt_id: fixture.attemptId,
    intent: fixture.intent,
    policy: policy(),
    transport: transport({ calls, block: "0x1f5" }),
  });
  assert.equal(reason(shallow), "insufficient_native_delivery_confirmations");
  assert.deepEqual(calls, [
    "eth_chainId",
    "eth_getTransactionReceipt",
    "eth_blockNumber",
  ]);

  calls = [];
  const dry = await runBuyVoidNativeDeliveryReceiptReconcilerV1({
    root_dir: fixture.root,
    attempt_id: fixture.attemptId,
    intent: fixture.intent,
    policy: policy(),
    transport: transport({ calls }),
  });
  assert.equal(dry.ok, true);
  assert.equal(dry.status, "dry_run_confirmed");
  assert.equal(dry.mutation_performed, false);
  assert.equal(dry.signing_performed, false);
  assert.equal(dry.transaction_broadcast_performed, false);
  assert.equal(dry.money_movement_performed, false);
  assert.equal(
    readBuyVoidExecutionAttemptV1({
      root_dir: fixture.root,
      attempt_id: fixture.attemptId,
    })?.status,
    "broadcast",
  );

  calls = [];
  const applied = await runBuyVoidNativeDeliveryReceiptReconcilerV1({
    root_dir: fixture.root,
    attempt_id: fixture.attemptId,
    intent: fixture.intent,
    policy: policy(),
    apply: true,
    confirmation:
      VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_CONFIRMATION_V1,
    transport: transport({ calls }),
    now_ms: 1_700_400_400_000,
  });
  assert.equal(applied.ok, true);
  assert.equal(applied.status, "confirmed");
  assert.equal(applied.mutation_performed, true);
  assert.equal(
    readBuyVoidExecutionAttemptV1({
      root_dir: fixture.root,
      attempt_id: fixture.attemptId,
    })?.status,
    "confirmed",
  );

  calls = [];
  const duplicate = await runBuyVoidNativeDeliveryReceiptReconcilerV1({
    root_dir: fixture.root,
    attempt_id: fixture.attemptId,
    intent: fixture.intent,
    policy: policy(),
    apply: true,
    confirmation:
      VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_CONFIRMATION_V1,
    transport: transport({ calls }),
  });
  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.status, "already_confirmed");
  assert.equal(duplicate.mutation_performed, false);
  assert.deepEqual(calls, []);

  const revertedFixture = createBroadcastAttempt();
  roots.push(revertedFixture.root);
  calls = [];
  const reverted = await runBuyVoidNativeDeliveryReceiptReconcilerV1({
    root_dir: revertedFixture.root,
    attempt_id: revertedFixture.attemptId,
    intent: revertedFixture.intent,
    policy: policy(),
    apply: true,
    confirmation:
      VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_CONFIRMATION_V1,
    transport: transport({ calls, status: "0x0" }),
    now_ms: 1_700_400_500_000,
  });
  assert.equal(reverted.ok, true);
  assert.equal(reverted.status, "reverted");
  assert.equal(
    readBuyVoidExecutionAttemptV1({
      root_dir: revertedFixture.root,
      attempt_id: revertedFixture.attemptId,
    })?.status,
    "failed_retryable",
  );

  const remoteFixture = createBroadcastAttempt();
  roots.push(remoteFixture.root);
  calls = [];
  const remote = await runBuyVoidNativeDeliveryReceiptReconcilerV1({
    root_dir: remoteFixture.root,
    attempt_id: remoteFixture.attemptId,
    intent: remoteFixture.intent,
    policy: { ...policy(), rpc_url: "https://rpc.example.invalid/" },
    transport: transport({ calls }),
  });
  assert.equal(reason(remote), "rpc_url_must_be_loopback_http");
  assert.deepEqual(calls, []);
} finally {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
}

console.log("marker=VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_V1");
console.log("read_only_rpc_method_count=3");
console.log("loopback_http_only=1");
console.log("dry_run_mutation_count=0");
console.log("confirmed_reconciliation=1");
console.log("reverted_reconciliation=1");
console.log("wallet_access=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("money_movement=0");
console.log("VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_V1_GREEN");
