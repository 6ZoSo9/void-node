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
import {
  claimBuyVoidFulfillmentJournalV1,
} from "../src/economic/buy_void_fulfillment_journal_v1.js";
import {
  VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_CONFIRMATION_V1,
  type BuyVoidNativeDeliveryReceiptRpcMethodV1,
} from "../src/economic/buy_void_native_delivery_receipt_reconciler_v1.js";
import {
  VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_AUTHORITY_V1,
  VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_ROUTES_V1,
  VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_V1,
  buyVoidNativeDeliveryReceiptRuntimeStatusV1,
  handleBuyVoidNativeDeliveryReceiptRuntimeCommandV1,
  runBuyVoidNativeDeliveryReceiptRuntimeCommandV1,
  type BuyVoidNativeDeliveryReceiptRuntimePolicyV1,
} from "../src/economic/buy_void_native_delivery_receipt_runtime_v1.js";
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
const deliveryBlockHash = `0x${"9".repeat(64)}`;
const transferTopic =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function topic(address: string): string {
  return `0x${"0".repeat(24)}${address.slice(2)}`;
}

const request: BuyVoidRequestV1 = {
  request_id: "buyvoid_native_receipt_runtime_v1",
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
    path.join(os.tmpdir(), "void-buy-native-receipt-runtime-"),
  );
  const claimed = claimBuyVoidFulfillmentJournalV1({
    root_dir: root,
    request,
    verified_payment_event: verifiedEvent,
    policy: fulfillmentPolicy,
    now_ms: 1_700_500_000_000,
  });
  if ("reason" in claimed) throw new Error(claimed.reason);
  const reserved = reserveBuyVoidExecutionAttemptV1({
    root_dir: root,
    intent: claimed.intent,
    policy: executionPolicy,
    now_ms: 1_700_500_100_000,
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
    now_ms: 1_700_500_200_000,
  });
  if ("reason" in prepared) throw new Error(prepared.reason);
  const broadcast = recordBuyVoidExecutionBroadcastV1({
    root_dir: root,
    attempt_id: attemptId,
    transaction_hash: deliveryTx,
    provider_submission_id: "proof-runtime-rpc-submit-1",
    now_ms: 1_700_500_300_000,
  });
  if ("reason" in broadcast) throw new Error(broadcast.reason);
  return { root, attemptId };
}

function runtimePolicy(
  root: string,
  enabled: boolean,
): BuyVoidNativeDeliveryReceiptRuntimePolicyV1 {
  return {
    enabled,
    root_dir: root,
    receipt_policy: {
      enabled: true,
      chain_id: "2050",
      rpc_url: "http://127.0.0.1:8545/",
      min_confirmations: 3,
      fulfillment_wallet_allowlist: [wallet],
    },
  };
}

function transport(options: {
  calls: BuyVoidNativeDeliveryReceiptRpcMethodV1[];
  receipt?: unknown;
  status?: "0x0" | "0x1";
}) {
  return async (call: {
    method: BuyVoidNativeDeliveryReceiptRpcMethodV1;
    params: unknown[];
  }) => {
    options.calls.push(call.method);
    if (call.method === "eth_chainId") return "0x802";
    if (call.method === "eth_blockNumber") return "0x1f8";
    assert.deepEqual(call.params, [deliveryTx]);
    if (options.receipt !== undefined) return options.receipt;
    return {
      transactionHash: deliveryTx,
      status: options.status ?? "0x1",
      blockNumber: "0x1f4",
      blockHash: deliveryBlockHash,
      from: wallet,
      to: delivery,
    };
  };
}

function responseCapture() {
  const capture: { status: number; body: any } = {
    status: 0,
    body: null,
  };
  const res = {
    status(value: number) {
      capture.status = value;
      return this;
    },
    json(value: unknown) {
      capture.body = value;
      return value;
    },
  };
  return { capture, res };
}

assert.equal(
  VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_V1,
  "VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_V1",
);
assert.deepEqual(
  VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_ROUTES_V1,
  {
    status:
      "/__void/operator/buy-void-native-delivery-receipt-v1/status",
    command:
      "/__void/operator/buy-void-native-delivery-receipt-v1/command",
  },
);
for (const key of [
  "wallet_access",
  "credential_access",
  "secret_access",
  "signing",
  "transaction_broadcast",
  "inventory_decrement",
  "public_request_journal_write",
  "background_loop",
  "automatic_retry",
  "startup_execution",
  "service_restart",
  "money_movement",
] as const) {
  assert.equal(
    VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_AUTHORITY_V1[key],
    false,
    key,
  );
}
assert.equal(
  VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_AUTHORITY_V1
    .dry_run_allowed_while_disabled,
  true,
);
assert.equal(
  VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_AUTHORITY_V1
    .exact_confirmation_required_before_apply_io,
  true,
);

const envKeys = [
  "VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_ENABLED",
  "VOID_BUY_VOID_RUNTIME_DIR",
  "VOID_BUY_VOID_NATIVE_CHAIN2050_RPC_URL",
  "VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS",
  "VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_MIN_CONFIRMATIONS",
] as const;
const savedEnv = Object.fromEntries(
  envKeys.map((key) => [key, process.env[key]]),
);
const roots: string[] = [];

try {
  for (const key of envKeys) delete process.env[key];
  let status = buyVoidNativeDeliveryReceiptRuntimeStatusV1();
  assert.equal(status.enabled, false);
  assert.equal(status.policy_configured, false);
  assert.equal(status.apply_ready, false);
  assert.deepEqual(status.missing_policy_envs, [
    "VOID_BUY_VOID_NATIVE_CHAIN2050_RPC_URL",
    "VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_MIN_CONFIRMATIONS",
    "VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS",
  ]);

  process.env.VOID_BUY_VOID_NATIVE_CHAIN2050_RPC_URL =
    "http://127.0.0.1:8545/";
  process.env.VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS = wallet;
  process.env.VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_MIN_CONFIRMATIONS = "3";
  status = buyVoidNativeDeliveryReceiptRuntimeStatusV1();
  assert.equal(status.enabled, false);
  assert.equal(status.policy_configured, true);
  assert.equal(status.apply_ready, false);
  assert.match(
    String(status.rpc_url_fingerprint_sha256),
    /^[0-9a-f]{64}$/u,
  );
  assert.equal(JSON.stringify(status).includes("127.0.0.1:8545"), false);

  let calls: BuyVoidNativeDeliveryReceiptRpcMethodV1[] = [];
  const disabledApply =
    await runBuyVoidNativeDeliveryReceiptRuntimeCommandV1({
      runtime_policy: runtimePolicy("/does/not/exist", false),
      command: {
        attempt_id: "1".repeat(64),
        apply: true,
        confirmation:
          VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_CONFIRMATION_V1,
      },
      transport: transport({ calls }),
    });
  assert.equal(disabledApply.ok, false);
  assert.equal(
    disabledApply.ok ? "" : disabledApply.reason,
    "native_delivery_receipt_runtime_disabled",
  );
  assert.deepEqual(calls, []);

  calls = [];
  const missingConfirmation =
    await runBuyVoidNativeDeliveryReceiptRuntimeCommandV1({
      runtime_policy: runtimePolicy("/does/not/exist", true),
      command: { attempt_id: "1".repeat(64), apply: true },
      transport: transport({ calls }),
    });
  assert.equal(missingConfirmation.ok, false);
  assert.equal(
    missingConfirmation.ok ? "" : missingConfirmation.reason,
    "explicit_confirmation_required",
  );
  assert.deepEqual(calls, []);

  const fixture = createBroadcastAttempt();
  roots.push(fixture.root);
  calls = [];
  const dry = await runBuyVoidNativeDeliveryReceiptRuntimeCommandV1({
    runtime_policy: runtimePolicy(fixture.root, false),
    command: { attempt_id: fixture.attemptId },
    transport: transport({ calls }),
  });
  assert.equal(dry.ok, true);
  assert.equal(dry.status, "dry_run_confirmed");
  assert.equal(dry.mutation_performed, false);
  assert.equal(dry.reconstructed_from_server_journals, true);
  assert.deepEqual(calls, [
    "eth_chainId",
    "eth_getTransactionReceipt",
    "eth_blockNumber",
  ]);
  assert.equal(
    readBuyVoidExecutionAttemptV1({
      root_dir: fixture.root,
      attempt_id: fixture.attemptId,
    })?.status,
    "broadcast",
  );

  calls = [];
  const applied = await runBuyVoidNativeDeliveryReceiptRuntimeCommandV1({
    runtime_policy: runtimePolicy(fixture.root, true),
    command: {
      attempt_id: fixture.attemptId,
      apply: true,
      confirmation:
        VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_CONFIRMATION_V1,
    },
    transport: transport({ calls }),
    now_ms: 1_700_500_400_000,
  });
  assert.equal(applied.ok, true);
  assert.equal(applied.status, "confirmed");
  assert.equal(applied.mutation_performed, true);
  assert.equal(applied.signing_performed, false);
  assert.equal(applied.transaction_broadcast_performed, false);
  assert.equal(applied.money_movement_performed, false);
  assert.equal(
    readBuyVoidExecutionAttemptV1({
      root_dir: fixture.root,
      attempt_id: fixture.attemptId,
    })?.status,
    "confirmed",
  );

  calls = [];
  const duplicate =
    await runBuyVoidNativeDeliveryReceiptRuntimeCommandV1({
      runtime_policy: runtimePolicy(fixture.root, true),
      command: {
        attempt_id: fixture.attemptId,
        apply: true,
        confirmation:
          VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_CONFIRMATION_V1,
      },
      transport: transport({ calls }),
    });
  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.status, "already_confirmed");
  assert.equal(duplicate.mutation_performed, false);
  assert.deepEqual(calls, []);

  const revertedFixture = createBroadcastAttempt();
  roots.push(revertedFixture.root);
  calls = [];
  const reverted =
    await runBuyVoidNativeDeliveryReceiptRuntimeCommandV1({
      runtime_policy: runtimePolicy(revertedFixture.root, true),
      command: {
        attempt_id: revertedFixture.attemptId,
        apply: true,
        confirmation:
          VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_CONFIRMATION_V1,
      },
      transport: transport({ calls, status: "0x0" }),
      now_ms: 1_700_500_500_000,
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

  let capture = responseCapture();
  await handleBuyVoidNativeDeliveryReceiptRuntimeCommandV1(
    {
      socket: { remoteAddress: "203.0.113.10" },
      body: { attempt_id: fixture.attemptId },
    },
    capture.res,
  );
  assert.equal(capture.capture.status, 403);
  assert.equal(capture.capture.body.error, "loopback_required");

  capture = responseCapture();
  await handleBuyVoidNativeDeliveryReceiptRuntimeCommandV1(
    {
      socket: { remoteAddress: "127.0.0.1" },
      body: {
        attempt_id: fixture.attemptId,
        rpc_url: "http://127.0.0.1:8545/",
      },
    },
    capture.res,
  );
  assert.equal(capture.capture.status, 400);
  assert.equal(capture.capture.body.error, "forbidden_execution_material");
  assert.equal(capture.capture.body.forbidden_key, "rpc_url");
} finally {
  for (const root of roots) {
    fs.rmSync(root, { recursive: true, force: true });
  }
  for (const key of envKeys) {
    const value = savedEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

console.log(`marker=${VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_V1}`);
console.log("current_main_reconstruction=1");
console.log("dry_run_while_disabled=1");
console.log("apply_confirmation_before_io=1");
console.log("one_attempt_per_command=1");
console.log("server_controlled_rpc=1");
console.log("confirmed_runtime_reconciliation=1");
console.log("reverted_runtime_reconciliation=1");
console.log("terminal_duplicate_rpc_calls=0");
console.log("wallet_access=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("money_movement=0");
console.log("VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_V1_GREEN");
