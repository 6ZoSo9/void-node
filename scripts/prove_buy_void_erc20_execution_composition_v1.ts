import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Interface, Wallet } from "ethers";
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
import {
  reserveBuyVoidInventoryV1,
} from "../src/economic/buy_void_inventory_reservation_journal_v1.js";
import {
  readBuyVoidExecutionAttemptV1,
  reserveBuyVoidExecutionAttemptV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";
import {
  VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_CONFIRMATION_V1,
  readBuyVoidErc20ExecutionCompositionPolicyV1,
  readBuyVoidErc20PreparationCustodyV1,
  runBuyVoidErc20ExecutionCompositionV1,
} from "../src/economic/buy_void_erc20_execution_composition_v1.js";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-erc20-execution-composition-v1-"));
const wallet = Wallet.createRandom();
const recipient = Wallet.createRandom().address.toLowerCase();
const token = Wallet.createRandom().address.toLowerCase();
const receive = Wallet.createRandom().address.toLowerCase();
const usdc = Wallet.createRandom().address.toLowerCase();
const paymentTx = `0x${"a".repeat(64)}`;
const poolId = "buy-void-presale-v1";
const amountUnits = "50000000";
const nowBase = 1_701_900_000_000;

const env: NodeJS.ProcessEnv = {
  VOID_BUY_VOID_DELIVERY_CHAIN_ID: "2050",
  VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS: token,
  VOID_BUY_VOID_DELIVERY_WALLET_ADDRESS: wallet.address,
  VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS: "1000000000",
  VOID_BUY_VOID_DELIVERY_MAX_GAS_LIMIT: "100000",
  VOID_BUY_VOID_DELIVERY_MAX_FEE_PER_GAS_WEI: "3000000000",
  VOID_BUY_VOID_DELIVERY_MAX_PRIORITY_FEE_PER_GAS_WEI: "1000000000",
  VOID_BUY_VOID_ERC20_EXECUTION_RPC_URL: "http://127.0.0.1:8545/",
  VOID_BUY_VOID_DELIVERY_GAS_LIMIT_MULTIPLIER_BPS: "12000",
  VOID_BUY_VOID_DELIVERY_FEE_MULTIPLIER_BPS: "20000",
  VOID_BUY_VOID_DELIVERY_MIN_CONFIRMATIONS: "3",
  VOID_BUY_VOID_DELIVERY_RPC_TIMEOUT_MS: "5000",
  VOID_BUY_VOID_DELIVERY_RPC_MAX_RESPONSE_BYTES: "65536",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_CHAIN: "base",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_USDC_CONTRACT: usdc,
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_RECEIVE_ADDRESS: receive,
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_CURRENT_BLOCK_NUMBER: "105",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_MIN_CONFIRMATIONS: "3",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_NUMERATOR: "2",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_DENOMINATOR: "1",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_INVENTORY_POLICY_VERSION: "presale-v1",
  VOID_BUY_VOID_INVENTORY_POOL_ID: poolId,
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_POOL_CAPACITY_VOID_UNITS: "10000000000000",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_MAX_RESERVATION_VOID_UNITS: "10000000000000",
  VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS: wallet.address,
};
const invalidPolicyCases: Array<{
  override: Record<string, string>;
  reasonIncludes: string;
}> = [
  {
    override: {
      VOID_BUY_VOID_ERC20_EXECUTION_RPC_URL:
        "https://127.0.0.1:8545/",
    },
    reasonIncludes: "rpc_url_must_be_loopback_http",
  },
  {
    override: {
      VOID_BUY_VOID_DELIVERY_WALLET_ADDRESS: "0x1234",
      VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS: "0x1234",
    },
    reasonIncludes: "address",
  },
  {
    override: {
      VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS: "0x1234",
    },
    reasonIncludes: "erc20_execution_address_policy_invalid",
  },
  {
    override: {
      VOID_BUY_VOID_DELIVERY_GAS_LIMIT_MULTIPLIER_BPS: "9999",
    },
    reasonIncludes: "invalid_erc20_transaction_preparation_policy",
  },
  {
    override: {
      VOID_BUY_VOID_DELIVERY_FEE_MULTIPLIER_BPS: "50001",
    },
    reasonIncludes: "invalid_erc20_transaction_preparation_policy",
  },
  {
    override: {
      VOID_BUY_VOID_DELIVERY_MIN_CONFIRMATIONS: "1001",
    },
    reasonIncludes: "receipt_min_confirmations_invalid",
  },
  {
    override: {
      VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS:
        "1000000000000000000000",
    },
    reasonIncludes:
      "max_amount_exceeds_saga_fulfillment_unit_cap",
  },
];
for (const testCase of invalidPolicyCases) {
  const decision =
    readBuyVoidErc20ExecutionCompositionPolicyV1({
      ...env,
      ...testCase.override,
    });
  assert.equal(decision.ok, false);
  if (decision.ok !== false) {
    throw new Error("invalid policy fixture unexpectedly configured");
  }
  assert.match(decision.reason, new RegExp(testCase.reasonIncludes));
}

const policyDecision = readBuyVoidErc20ExecutionCompositionPolicyV1(env);
if (policyDecision.ok === false) throw new Error(policyDecision.reason);
const policy = policyDecision.policy;
assert.equal(policy.planner_policy.rpc_url, "http://127.0.0.1:8545/");
assert.equal(policy.saga_policy.execution_policy.max_attempts_per_payment, 1);

const request: BuyVoidRequestV1 = {
  request_id: "buyvoid_erc20_execution_composition_v1",
  source_chain: "base",
  tx_hash: paymentTx,
  delivery_address: recipient,
  receive_address: receive,
  usdc_amount: "25",
  quoted_void: "50",
};
const transferTopic =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const topic = (address: string): string => `0x${"0".repeat(24)}${address.slice(2).toLowerCase()}`;
const paymentReceipt: BuyVoidTransactionReceiptV2 = {
  status: 1,
  transactionHash: paymentTx,
  blockNumber: 100,
  logs: [{
    address: usdc,
    topics: [transferTopic, topic(recipient), topic(receive)],
    data: "0x17d7840",
    logIndex: 7,
    transactionHash: paymentTx,
    blockNumber: 100,
    removed: false,
  }],
};
const verified = buildBuyVoidVerifiedPaymentEventV2({
  request,
  receipt: paymentReceipt,
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
  pool_remaining_void_units: "10000000000000",
  exact_payment_required: true,
};
const claimed = claimBuyVoidFulfillmentJournalV1({
  root_dir: root,
  request,
  verified_payment_event: verified.event,
  policy: fulfillmentPolicy,
  now_ms: nowBase,
});
if ("reason" in claimed) throw new Error(claimed.reason);
assert.equal(claimed.intent.claim.unsigned_instruction.void_amount_units, amountUnits);

const inventory = reserveBuyVoidInventoryV1({
  root_dir: root,
  intent: claimed.intent,
  policy: {
    inventory_reservation_enabled: true,
    pool_id: poolId,
    inventory_policy_version: "presale-v1",
    pool_capacity_void_units: "10000000000000",
    max_reservation_void_units: "10000000000000",
  },
  apply: true,
  now_ms: nowBase + 100,
});
if (inventory.ok === false) throw new Error(inventory.reason);
assert.equal(inventory.reservation.reserved_void_units, amountUnits);

const reserved = reserveBuyVoidExecutionAttemptV1({
  root_dir: root,
  intent: claimed.intent,
  policy: policy.saga_policy.execution_policy,
  now_ms: nowBase + 200,
});
if ("reason" in reserved) throw new Error(reserved.reason);
const attemptId = reserved.attempt.reservation.attempt_id;

let plannerCalls = 0;
const plannerTransport = async ({ method }: any) => {
  plannerCalls += 1;
  if (method === "eth_chainId") return "0x802";
  if (method === "eth_getTransactionCount") return "0x7";
  if (method === "eth_gasPrice") return "0x3b9aca00";
  if (method === "eth_estimateGas") return "0xc350";
  if (method === "eth_getBalance") return "0x8ac7230489e80000";
  throw new Error(`unexpected planner method ${method}`);
};
let signCalls = 0;
const signer = {
  async get_address() { return wallet.address; },
  async sign_transaction(transaction: any) {
    signCalls += 1;
    return wallet.signTransaction(transaction);
  },
};
let broadcasterCalls = 0;
let lastBroadcastHash = "";
const broadcaster = {
  async broadcast_signed_transaction(raw: string) {
    broadcasterCalls += 1;
    const parsed = (await import("ethers")).Transaction.from(raw);
    lastBroadcastHash = String(parsed.hash || "").toLowerCase();
    return {
      accepted: true,
      transaction_hash: lastBroadcastHash,
      provider_submission_id: "synthetic-erc20-provider-v1",
      submission_may_have_occurred: true,
    };
  },
};

let prepareFault = true;
const firstPrepare = await runBuyVoidErc20ExecutionCompositionV1({
  root_dir: root,
  attempt_id: attemptId,
  apply: true,
  confirmation: VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_CONFIRMATION_V1,
  policy,
  dependencies: {
    signer,
    planner_transport: plannerTransport,
    now_ms: () => nowBase + 300,
    fault_inject(stage) {
      if (prepareFault && stage === "after_preparation_custody_before_attempt_projection") {
        prepareFault = false;
        throw new Error("synthetic_prepare_crash");
      }
    },
  },
});
assert.equal(firstPrepare.ok, false);
assert.equal(firstPrepare.reconciliation_required, true);
assert.equal(signCalls, 1);
assert.ok(readBuyVoidErc20PreparationCustodyV1({ root_dir: root, attempt_id: attemptId }));
assert.equal(readBuyVoidExecutionAttemptV1({ root_dir: root, attempt_id: attemptId })?.status, "reserved");

const recoveredPrepare = await runBuyVoidErc20ExecutionCompositionV1({
  root_dir: root,
  attempt_id: attemptId,
  apply: true,
  confirmation: VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_CONFIRMATION_V1,
  policy,
  dependencies: {
    signer,
    planner_transport: plannerTransport,
    now_ms: () => nowBase + 400,
  },
});
assert.equal(recoveredPrepare.ok, true);
assert.equal(recoveredPrepare.status, "prepared");
assert.equal(signCalls, 1, "restart must reuse signed-hash custody without re-signing");
assert.equal(readBuyVoidExecutionAttemptV1({ root_dir: root, attempt_id: attemptId })?.status, "prepared");

let broadcastFault = true;
const crashedBroadcast = await runBuyVoidErc20ExecutionCompositionV1({
  root_dir: root,
  attempt_id: attemptId,
  apply: true,
  confirmation: VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_CONFIRMATION_V1,
  policy,
  dependencies: {
    signer,
    broadcaster,
    planner_transport: plannerTransport,
    now_ms: () => nowBase + 500,
    fault_inject(stage) {
      if (broadcastFault && stage === "after_external_outcome_before_projection") {
        broadcastFault = false;
        throw new Error("synthetic_post_accept_crash");
      }
    },
  },
});
assert.equal(crashedBroadcast.ok, false);
assert.equal(crashedBroadcast.reconciliation_required, true);
assert.equal(broadcasterCalls, 1);
assert.ok(lastBroadcastHash);
assert.equal(readBuyVoidExecutionAttemptV1({ root_dir: root, attempt_id: attemptId })?.status, "prepared");

const tokenAtoms = BigInt(amountUnits) * 1_000_000_000_000n;
const transferInterface = new Interface([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);
const encoded = transferInterface.encodeEventLog(
  transferInterface.getEvent("Transfer")!,
  [wallet.address, recipient, tokenAtoms],
);
const deliveryReceipt = {
  transactionHash: lastBroadcastHash,
  from: wallet.address,
  to: token,
  blockNumber: "0x64",
  blockHash: `0x${"b".repeat(64)}`,
  status: "0x1",
  logs: [{
    address: token,
    topics: encoded.topics,
    data: encoded.data,
    logIndex: "0x1",
    transactionHash: lastBroadcastHash,
  }],
};
let receiptCalls = 0;
let deliveryHead = 102n;
const receiptTransport = async ({ method }: any) => {
  receiptCalls += 1;
  if (method === "eth_chainId") return "0x802";
  if (method === "eth_getTransactionReceipt") return structuredClone(deliveryReceipt);
  if (method === "eth_blockNumber") return `0x${deliveryHead.toString(16)}`;
  throw new Error(`unexpected receipt method ${method}`);
};

deliveryHead = 100n + 1_000_001n - 1n;
const overSagaRange =
  await runBuyVoidErc20ExecutionCompositionV1({
    root_dir: root,
    attempt_id: attemptId,
    apply: true,
    confirmation:
      VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_CONFIRMATION_V1,
    policy,
    dependencies: {
      receipt_transport: receiptTransport,
      planner_transport: plannerTransport,
      now_ms: () => nowBase + 600,
    },
  });
assert.equal(overSagaRange.ok, false);
if (overSagaRange.ok !== false) {
  throw new Error("1,000,001 confirmation fixture unexpectedly applied");
}
assert.equal(
  overSagaRange.reason,
  "erc20_receipt_confirmation_count_out_of_saga_range",
);
let heldAttempt = readBuyVoidExecutionAttemptV1({
  root_dir: root,
  attempt_id: attemptId,
});
assert.ok(heldAttempt);
assert.equal(heldAttempt?.confirmation, null);
assert.notEqual(heldAttempt?.status, "confirmed");
assert.equal(broadcasterCalls, 1);

deliveryHead =
  100n + BigInt(Number.MAX_SAFE_INTEGER) + 1n - 1n;
const aboveSafeInteger =
  await runBuyVoidErc20ExecutionCompositionV1({
    root_dir: root,
    attempt_id: attemptId,
    apply: true,
    confirmation:
      VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_CONFIRMATION_V1,
    policy,
    dependencies: {
      receipt_transport: receiptTransport,
      planner_transport: plannerTransport,
      now_ms: () => nowBase + 650,
    },
  });
assert.equal(aboveSafeInteger.ok, false);
if (aboveSafeInteger.ok !== false) {
  throw new Error("above-safe-integer confirmation fixture unexpectedly applied");
}
assert.equal(
  aboveSafeInteger.reason,
  "erc20_receipt_confirmation_count_out_of_saga_range",
);
heldAttempt = readBuyVoidExecutionAttemptV1({
  root_dir: root,
  attempt_id: attemptId,
});
assert.equal(heldAttempt?.confirmation, null);
assert.notEqual(heldAttempt?.status, "confirmed");
assert.equal(broadcasterCalls, 1);

deliveryHead = 100n + 1_000_000n - 1n;
const recovered = await runBuyVoidErc20ExecutionCompositionV1({
  root_dir: root,
  attempt_id: attemptId,
  apply: true,
  confirmation: VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_CONFIRMATION_V1,
  policy,
  dependencies: {
    receipt_transport: receiptTransport,
    planner_transport: plannerTransport,
    now_ms: () => nowBase + 800,
  },
});
assert.equal(recovered.ok, true);
assert.equal(recovered.status, "reconciled_confirmed");
assert.equal(recovered.next_stage, "terminal_closeout");
assert.equal(broadcasterCalls, 1, "crash recovery must not rebroadcast");
assert.ok(receiptCalls >= 9, "range holds + final stability reconciliation must execute");
const confirmedAttempt = readBuyVoidExecutionAttemptV1({
  root_dir: root,
  attempt_id: attemptId,
});
assert.equal(confirmedAttempt?.status, "confirmed");
assert.equal(
  confirmedAttempt?.prepared?.void_delivery_tx_hash,
  lastBroadcastHash,
);

const terminalReady = await runBuyVoidErc20ExecutionCompositionV1({
  root_dir: root,
  attempt_id: attemptId,
  apply: false,
  policy,
  dependencies: { now_ms: () => nowBase + 700 },
});
assert.equal(terminalReady.ok, true);
assert.equal(terminalReady.status, "ready_for_terminal_closeout");
assert.equal(terminalReady.next_stage, "terminal_closeout");

const runtimeSource = fs.readFileSync(
  path.join(process.cwd(), "src/economic/buy_void_delivery_runtime_integration_v1.ts"),
  "utf8",
);
assert.match(runtimeSource, /server_derived_transaction_plan:\s*true/);
assert.match(runtimeSource, /caller_supplied_transaction_plan:\s*false/);
assert.match(
  runtimeSource,
  /const ALLOWED_INPUT_KEYS = new Set\(\[/,
);
for (const allowedKey of [
  "action",
  "attempt_id",
  "apply",
  "confirmation",
]) {
  assert.match(
    runtimeSource,
    new RegExp(`"${allowedKey}"`),
  );
}
assert.doesNotMatch(
  runtimeSource,
  /^\s*"plan",\s*$/m,
);
assert.doesNotMatch(
  runtimeSource,
  /^\s*"transaction_plan",\s*$/m,
);
assert.doesNotMatch(runtimeSource, /const plan = \(body as any\)\.plan/);
assert.doesNotMatch(runtimeSource, /submission_idempotency_key:\s*\(body as any\)/);

console.log("VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_V1_PROOF_GREEN");
console.log(`attempt_id=${attemptId}`);
console.log(`prepared_hash=${lastBroadcastHash}`);
console.log(`planner_calls=${plannerCalls}`);
console.log(`sign_calls=${signCalls}`);
console.log(`broadcast_calls=${broadcasterCalls}`);
console.log(`receipt_rpc_calls=${receiptCalls}`);
console.log("caller_supplied_transaction_plan=false");
console.log("crash_recovery_rebroadcast=false");
console.log("terminal_closeout_reused=true");
console.log("canonical_planner_policy_validator_reused=true");
console.log("max_amount_unit_domain=fulfillment_units_6_decimal");
console.log("token_atom_multiplier=1000000000000");
console.log("confirmation_1000000_accepted=true");
console.log("confirmation_1000001_held_before_confirmed_mutation=true");
console.log("confirmation_above_safe_integer_held_before_confirmed_mutation=true");
console.log("production_runtime_activation=false");
console.log("production_wallet_use=false");
console.log("production_rpc_calls=0");
console.log("live_transaction_broadcast=false");
console.log("live_money_movement=false");
