import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { keccak256 } from "ethers";
import {
  buildBuyVoidVerifiedPaymentEventV2,
  type BuyVoidTransactionReceiptV2,
} from "../src/economic/buy_void_verified_payment_v2.js";
import type {
  BuyVoidAutoFulfillmentPolicyV1,
  BuyVoidRequestV1,
} from "../src/economic/buy_void_auto_fulfillment_v1.js";
import {
  claimBuyVoidFulfillmentJournalV1,
} from "../src/economic/buy_void_fulfillment_journal_v1.js";
import {
  prepareBuyVoidExecutionTransactionV1,
  recordBuyVoidExecutionBroadcastV1,
  reserveBuyVoidExecutionAttemptV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";
import {
  VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_CONFIRMATION_V1,
  type BuyVoidNativeDeliveryReceiptRpcMethodV1,
} from "../src/economic/buy_void_native_delivery_receipt_reconciler_v1.js";
import {
  runBuyVoidNativeDeliveryReceiptRuntimeCommandV1,
  type BuyVoidNativeDeliveryReceiptRuntimePolicyV1,
} from "../src/economic/buy_void_native_delivery_receipt_runtime_v1.js";
import {
  VOID_BUY_VOID_CHAIN2050_DURABILITY_GATE_AUTHORITY_V1,
  VOID_BUY_VOID_CHAIN2050_DURABILITY_GATE_V1,
  VoidBuyVoidChain2050DurabilityHoldV1,
  armBuyVoidChain2050DurabilityDebtV1,
  inspectBuyVoidChain2050DurabilityV1,
  satisfyBuyVoidChain2050DurabilityDebtV1,
  wrapBuyVoidChain2050DurabilityBroadcasterV1,
} from "../src/economic/buy_void_chain2050_durability_gate_v1.js";
import {
  VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_CONFIRMATION_V1,
  VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_V1,
  runBuyVoidChain2050DurabilityRuntimeCommandV1,
} from "../src/economic/buy_void_chain2050_durability_runtime_v1.js";
import {
  initializeBuyVoidNativeDeliveryRuntimeDependenciesFromProcessV1,
} from "../src/economic/buy_void_native_delivery_runtime_dependencies_v1.js";

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
  request_id: "buyvoid_chain2050_durability_integration_v1",
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
if (!verified.ok) throw new Error(verified.reason);
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

function makeBroadcastAttempt() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-chain2050-durability-attempt-"),
  );
  const claimed = claimBuyVoidFulfillmentJournalV1({
    root_dir: root,
    request,
    verified_payment_event: verifiedEvent,
    policy: fulfillmentPolicy,
    now_ms: 1_700_700_000_000,
  });
  if ("reason" in claimed) throw new Error(claimed.reason);
  const reserved = reserveBuyVoidExecutionAttemptV1({
    root_dir: root,
    intent: claimed.intent,
    policy: executionPolicy,
    now_ms: 1_700_700_100_000,
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
    now_ms: 1_700_700_200_000,
  });
  if ("reason" in prepared) throw new Error(prepared.reason);
  const broadcast = recordBuyVoidExecutionBroadcastV1({
    root_dir: root,
    attempt_id: attemptId,
    transaction_hash: deliveryTx,
    provider_submission_id: "durability-proof-submit-1",
    now_ms: 1_700_700_300_000,
  });
  if ("reason" in broadcast) throw new Error(broadcast.reason);
  return { root, attemptId };
}

function receiptPolicy(
  root: string,
): BuyVoidNativeDeliveryReceiptRuntimePolicyV1 {
  return {
    enabled: true,
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

function transport(calls: BuyVoidNativeDeliveryReceiptRpcMethodV1[]) {
  return async (call: {
    method: BuyVoidNativeDeliveryReceiptRpcMethodV1;
    params: unknown[];
  }) => {
    calls.push(call.method);
    if (call.method === "eth_chainId") return "0x802";
    if (call.method === "eth_blockNumber") return "0x1f8";
    assert.deepEqual(call.params, [deliveryTx]);
    return {
      transactionHash: deliveryTx,
      status: "0x1",
      blockNumber: "0x1f4",
      from: wallet,
      to: delivery,
    };
  };
}

assert.equal(
  VOID_BUY_VOID_CHAIN2050_DURABILITY_GATE_V1,
  "VOID_BUY_VOID_CHAIN2050_DURABILITY_GATE_V1",
);
assert.equal(
  VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_V1,
  "VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_V1",
);
assert.equal(
  VOID_BUY_VOID_CHAIN2050_DURABILITY_GATE_AUTHORITY_V1.atomic_active_debt_claim_required,
  true,
);

const roots: string[] = [];
try {
  const preclaimRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-chain2050-preclaim-"),
  );
  roots.push(preclaimRoot);
  const preclaimHash = `0x${"d".repeat(64)}`;
  const preclaimDebtDir = path.join(preclaimRoot, "debts");
  fs.mkdirSync(preclaimDebtDir, { recursive: true, mode: 0o700 });
  fs.chmodSync(preclaimDebtDir, 0o700);
  fs.writeFileSync(
    path.join(preclaimDebtDir, `${preclaimHash.slice(2)}.json`),
    `${JSON.stringify({
      schema: "void_buy_void_chain2050_durability_debt_v1",
      marker: VOID_BUY_VOID_CHAIN2050_DURABILITY_GATE_V1,
      version: 1,
      transaction_hash: preclaimHash,
      armed_at_ms: 1_700_700_900_000,
      raw_signed_transaction_persisted: false,
      automatic_retry_allowed: false,
    }, null, 2)}\n`,
    { mode: 0o600 },
  );
  const preclaimState = inspectBuyVoidChain2050DurabilityV1(preclaimRoot);
  assert.equal(preclaimState.preclaim_debt_count, 1);
  assert.equal(preclaimState.unresolved_debt_count, 0);
  assert.equal(preclaimState.active_debt_transaction_hash, null);

  const gateRoot = fs.mkdtempSync(path.join(os.tmpdir(), "void-chain2050-gate-"));
  roots.push(gateRoot);
  let underlyingCalls = 0;
  const raw = "0x1234";
  const expectedHash = keccak256(raw).toLowerCase();
  const guarded = wrapBuyVoidChain2050DurabilityBroadcasterV1({
    root_dir: gateRoot,
    now_ms: () => 1_700_701_000_000,
    broadcaster: {
      broadcast_signed_transaction: async () => {
        underlyingCalls += 1;
        const during = inspectBuyVoidChain2050DurabilityV1(gateRoot);
        assert.equal(during.unresolved_debt_count, 1);
        assert.equal(during.active_debt_transaction_hash, expectedHash);
        assert.deepEqual(during.unresolved_transaction_hashes, [expectedHash]);
        const debtPath = path.join(
          gateRoot,
          "debts",
          `${expectedHash.slice(2)}.json`,
        );
        const activePath = path.join(gateRoot, "active-debt-v1.json");
        const debtStat = fs.statSync(debtPath);
        const activeStat = fs.statSync(activePath);
        assert.equal(activeStat.dev, debtStat.dev);
        assert.equal(activeStat.ino, debtStat.ino);
        return {
          accepted: true,
          transaction_hash: expectedHash,
          provider_submission_id: "proof-provider-1",
          submission_may_have_occurred: true,
        };
      },
    },
  });
  const accepted = await guarded.broadcast_signed_transaction(raw);
  assert.equal(accepted.accepted, true);
  assert.equal(underlyingCalls, 1);
  const afterAccepted = inspectBuyVoidChain2050DurabilityV1(gateRoot);
  assert.equal(afterAccepted.unresolved_debt_count, 1);
  assert.throws(
    () => armBuyVoidChain2050DurabilityDebtV1({
      root_dir: gateRoot,
      transaction_hash: `0x${"c".repeat(64)}`,
      now_ms: 1_700_701_100_000,
    }),
    (error: unknown) =>
      error instanceof VoidBuyVoidChain2050DurabilityHoldV1 &&
      error.reason === "chain2050_checkpoint_debt_active",
  );
  const debtText = fs.readFileSync(
    path.join(gateRoot, "debts", `${expectedHash.slice(2)}.json`),
    "utf8",
  );
  assert.equal(debtText.includes(raw), false);
  assert.equal(fs.statSync(path.join(gateRoot, "debts")).mode & 0o777, 0o700);
  assert.equal(
    fs.statSync(
      path.join(gateRoot, "debts", `${expectedHash.slice(2)}.json`),
    ).mode & 0o777,
    0o600,
  );
  satisfyBuyVoidChain2050DurabilityDebtV1({
    root_dir: gateRoot,
    transaction_hash: expectedHash,
    attempt_id: "1".repeat(64),
    delivery_block_number: "10",
    checkpoint: {
      checkpoint_id_sha256: "2".repeat(64),
      chain_id: 2050,
      block_number: 10,
      block_hash: `0x${"3".repeat(64)}`,
    },
    now_ms: 1_700_701_200_000,
  });
  assert.equal(inspectBuyVoidChain2050DurabilityV1(gateRoot).unresolved_debt_count, 0);

  const noBroadcastRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-chain2050-no-broadcast-"),
  );
  roots.push(noBroadcastRoot);
  const noBroadcast = wrapBuyVoidChain2050DurabilityBroadcasterV1({
    root_dir: noBroadcastRoot,
    broadcaster: {
      broadcast_signed_transaction: async () => ({
        accepted: false,
        submission_may_have_occurred: false,
      }),
    },
  });
  await noBroadcast.broadcast_signed_transaction("0xabcd");
  assert.equal(
    inspectBuyVoidChain2050DurabilityV1(noBroadcastRoot).unresolved_debt_count,
    0,
  );

  const unknownRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-chain2050-unknown-"),
  );
  roots.push(unknownRoot);
  const unknown = wrapBuyVoidChain2050DurabilityBroadcasterV1({
    root_dir: unknownRoot,
    broadcaster: {
      broadcast_signed_transaction: async () => {
        throw new Error("transport_lost_after_submission");
      },
    },
  });
  await assert.rejects(() => unknown.broadcast_signed_transaction("0xbeef"));
  assert.equal(inspectBuyVoidChain2050DurabilityV1(unknownRoot).unresolved_debt_count, 1);

  const runtimeFixture = makeBroadcastAttempt();
  roots.push(runtimeFixture.root);
  const calls: BuyVoidNativeDeliveryReceiptRpcMethodV1[] = [];
  const confirmed = await runBuyVoidNativeDeliveryReceiptRuntimeCommandV1({
    runtime_policy: receiptPolicy(runtimeFixture.root),
    command: {
      attempt_id: runtimeFixture.attemptId,
      apply: true,
      confirmation:
        VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_CONFIRMATION_V1,
    },
    transport: transport(calls),
    now_ms: 1_700_702_000_000,
  });
  assert.equal(confirmed.ok, true);
  assert.equal(confirmed.status, "confirmed");
  assert.deepEqual(calls, [
    "eth_chainId",
    "eth_getTransactionReceipt",
    "eth_blockNumber",
  ]);

  const durabilityRoot = path.join(
    runtimeFixture.root,
    "chain2050-durability-v1",
  );
  armBuyVoidChain2050DurabilityDebtV1({
    root_dir: durabilityRoot,
    transaction_hash: deliveryTx,
    now_ms: 1_700_702_100_000,
  });
  const planned = await runBuyVoidChain2050DurabilityRuntimeCommandV1({
    attempt_id: runtimeFixture.attemptId,
    durability_root_dir: durabilityRoot,
    buy_void_runtime_root_dir: runtimeFixture.root,
  });
  assert.equal(planned.ok, true);
  assert.equal(planned.status, "planned");
  if (!planned.ok || planned.status !== "planned") {
    throw new Error("planned_expected");
  }
  assert.equal(planned.delivery_block_number, "500");
  assert.equal(planned.checkpoint_capture_performed, false);

  let capturedMinimum = 0;
  const satisfied = await runBuyVoidChain2050DurabilityRuntimeCommandV1({
    attempt_id: runtimeFixture.attemptId,
    durability_root_dir: durabilityRoot,
    buy_void_runtime_root_dir: runtimeFixture.root,
    apply: true,
    confirmation: VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_CONFIRMATION_V1,
    checkpoint_capture: async ({ minimum_block_number }) => {
      capturedMinimum = minimum_block_number;
      return {
        marker: "VOID_PRIVATE_CHAIN2050_CHECKPOINT_V1",
        checkpoint_id_sha256: "4".repeat(64),
        chain_id: 2050,
        block_number: 501,
        block_hash: `0x${"5".repeat(64)}`,
      };
    },
    now_ms: 1_700_702_200_000,
  });
  assert.equal(capturedMinimum, 500);
  assert.equal(satisfied.ok, true);
  assert.equal(satisfied.status, "checkpoint_satisfied");
  assert.equal(
    inspectBuyVoidChain2050DurabilityV1(durabilityRoot).unresolved_debt_count,
    0,
  );

  const failureFixture = makeBroadcastAttempt();
  roots.push(failureFixture.root);
  const failureCalls: BuyVoidNativeDeliveryReceiptRpcMethodV1[] = [];
  const failureConfirmed = await runBuyVoidNativeDeliveryReceiptRuntimeCommandV1({
    runtime_policy: receiptPolicy(failureFixture.root),
    command: {
      attempt_id: failureFixture.attemptId,
      apply: true,
      confirmation:
        VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_CONFIRMATION_V1,
    },
    transport: transport(failureCalls),
    now_ms: 1_700_703_000_000,
  });
  assert.equal(failureConfirmed.ok, true);
  const failureDurabilityRoot = path.join(
    failureFixture.root,
    "chain2050-durability-v1",
  );
  armBuyVoidChain2050DurabilityDebtV1({
    root_dir: failureDurabilityRoot,
    transaction_hash: deliveryTx,
    now_ms: 1_700_703_100_000,
  });
  const checkpointFailure = await runBuyVoidChain2050DurabilityRuntimeCommandV1({
    attempt_id: failureFixture.attemptId,
    durability_root_dir: failureDurabilityRoot,
    buy_void_runtime_root_dir: failureFixture.root,
    apply: true,
    confirmation: VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_CONFIRMATION_V1,
    checkpoint_capture: async () => {
      throw new Error("synthetic_checkpoint_failure");
    },
  });
  assert.equal(checkpointFailure.ok, false);
  assert.equal(checkpointFailure.status, "held");
  if (checkpointFailure.ok) throw new Error("checkpoint_failure_expected");
  assert.equal(checkpointFailure.stage, "checkpoint_capture");
  assert.equal(
    inspectBuyVoidChain2050DurabilityV1(failureDurabilityRoot).unresolved_debt_count,
    1,
  );

  const previousInjector =
    process.env.VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_INJECTOR_ENABLED;
  const previousGate =
    process.env.VOID_BUY_VOID_CHAIN2050_DURABILITY_GATE_ENABLED;
  const previousCreds = process.env.CREDENTIALS_DIRECTORY;
  try {
    process.env.VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_INJECTOR_ENABLED = "1";
    process.env.VOID_BUY_VOID_CHAIN2050_DURABILITY_GATE_ENABLED = "0";
    process.env.CREDENTIALS_DIRECTORY = "/definitely/not/read/by-this-proof";
    const blockedInitializer =
      await initializeBuyVoidNativeDeliveryRuntimeDependenciesFromProcessV1();
    assert.equal(blockedInitializer.ok, false);
    if (blockedInitializer.ok) throw new Error("gate_required_expected");
    assert.equal(
      blockedInitializer.reason,
      "chain2050_durability_gate_required",
    );
    assert.equal(blockedInitializer.signer_configured, false);
    assert.equal(blockedInitializer.broadcaster_configured, false);
  } finally {
    if (previousInjector === undefined) {
      delete process.env.VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_INJECTOR_ENABLED;
    } else {
      process.env.VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_INJECTOR_ENABLED =
        previousInjector;
    }
    if (previousGate === undefined) {
      delete process.env.VOID_BUY_VOID_CHAIN2050_DURABILITY_GATE_ENABLED;
    } else {
      process.env.VOID_BUY_VOID_CHAIN2050_DURABILITY_GATE_ENABLED = previousGate;
    }
    if (previousCreds === undefined) delete process.env.CREDENTIALS_DIRECTORY;
    else process.env.CREDENTIALS_DIRECTORY = previousCreds;
  }

  console.log("preclaim_crash_debt_authority=0");
  console.log("atomic_active_debt_hardlink=1");
  console.log("debt_armed_before_broadcast=1");
  console.log("unresolved_debt_blocks_later_mutation=1");
  console.log("raw_signed_transaction_persisted=0");
  console.log("definitive_not_broadcast_resolves_debt=1");
  console.log("transport_unknown_preserves_debt=1");
  console.log("confirmed_delivery_block_bound_to_checkpoint_minimum=1");
  console.log("checkpoint_failure_preserves_debt=1");
  console.log("finalized_checkpoint_satisfies_debt=1");
  console.log("production_dependency_injector_requires_gate=1");
  console.log("VOID_BUY_VOID_CHAIN2050_DURABILITY_INTEGRATION_V1_PROOF_GREEN");
} finally {
  for (const root of roots) {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
