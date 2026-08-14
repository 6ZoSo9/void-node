import assert from "node:assert/strict";
import * as http from "node:http";
import {
  Interface,
  Wallet,
} from "ethers";
import {
  VOID_BUY_VOID_ERC20_DELIVERY_RECEIPT_RECONCILER_AUTHORITY_V1,
  runBuyVoidErc20DeliveryReceiptReconcilerV1,
  type BuyVoidErc20DeliveryReceiptRpcTransportV1,
} from "../src/economic/buy_void_erc20_delivery_receipt_reconciler_v1.js";
import {
  buyVoidExecutionAttemptIntentFingerprintV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";

const wallet = Wallet.createRandom().address.toLowerCase();
const recipient = Wallet.createRandom().address.toLowerCase();
const token = Wallet.createRandom().address.toLowerCase();
const other = Wallet.createRandom().address.toLowerCase();
const txHash = `0x${"1".repeat(64)}`;
const blockHash = `0x${"2".repeat(64)}`;
const amountUnits = 2_500_000_000n;
const amountAtoms = amountUnits * 1_000_000_000_000n;
const attemptId = "a".repeat(64);
const paymentKey = "b".repeat(64);
const requestKey = "c".repeat(64);
const canonicalPaymentIdentity =
  "voidpay1:ethereum:0x" + "d".repeat(64) + ":0";
const requestId = "request-erc20-receipt-v1";
const instructionId = "e".repeat(64);

const transferInterface = new Interface([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);
const transferEvent = transferInterface.getEvent("Transfer");
if (!transferEvent) throw new Error("Transfer event unavailable");

function unsignedInstruction() {
  return {
    schema: "void_buy_void_unsigned_fulfillment_instruction_v1",
    marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
    instruction_id: instructionId,
    request_id: requestId,
    canonical_payment_identity: canonicalPaymentIdentity,
    source_chain: "ethereum",
    payment_transaction_hash: `0x${"d".repeat(64)}`,
    payment_log_index: "0",
    confirmed_block_number: "10",
    confirmation_count: "10",
    payment_usdc_units: "25000000",
    delivery_address: recipient,
    void_amount_units: amountUnits.toString(),
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    automatic_execution_authorized: false,
  } as const;
}

function intent() {
  return {
    schema: "void_buy_void_fulfillment_journal_intent_v1",
    marker: "VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1",
    created_at_ms: 1,
    payment_key_sha256: paymentKey,
    request_key_sha256: requestKey,
    claim: {
      schema: "void_buy_void_fulfillment_claim_v1",
      marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
      canonical_payment_identity: canonicalPaymentIdentity,
      canonical_payment_identity_sha256: "4".repeat(64),
      request_id: requestId,
      decision_fingerprint: "5".repeat(64),
      instruction_id: instructionId,
      unsigned_instruction: unsignedInstruction(),
      status: "claimed",
    },
    verification_binding: {
      source_chain: "ethereum",
      payment_transaction_hash: `0x${"d".repeat(64)}`,
      payment_log_index: "0",
      confirmed_block_number: "10",
      confirmation_count_at_claim: "10",
      usdc_contract: other,
      payer_address: other,
      receive_address: wallet,
      delivery_address: recipient,
      payment_usdc_units: "25000000",
      requested_usdc_units: "25000000",
      quoted_void_units: amountUnits.toString(),
    },
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    money_movement_authorized: false,
  } as any;
}

function attempt() {
  const fulfillmentIntent = intent();
  return {
    reservation: {
      schema: "void_buy_void_execution_attempt_reservation_v1",
      marker: "VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1",
      attempt_id: attemptId,
      attempt_number: 1,
      reserved_at_ms: 1,
      payment_key_sha256: paymentKey,
      request_key_sha256: requestKey,
      canonical_payment_identity: canonicalPaymentIdentity,
      request_id: requestId,
      instruction_id: instructionId,
      intent_fingerprint:
        buyVoidExecutionAttemptIntentFingerprintV1(fulfillmentIntent),
      max_attempts_per_payment: 1,
      unsigned_instruction: fulfillmentIntent.claim.unsigned_instruction,
      signing_authorized_by_this_module: false,
      transaction_broadcast_authorized_by_this_module: false,
      money_movement_authorized_by_this_module: false,
    },
    prepared: {
      schema: "void_buy_void_execution_prepared_transaction_v1",
      marker: "VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1",
      attempt_id: attemptId,
      prepared_at_ms: 2,
      chain_id: "2050",
      void_delivery_tx_hash: txHash,
      fulfillment_wallet: wallet,
      delivery_address: recipient,
      void_amount_units: amountUnits.toString(),
      transaction_binding_fingerprint: "1".repeat(64),
      signed_transaction_persisted: false,
      raw_transaction_persisted: false,
      transaction_broadcast_performed_by_this_module: false,
    },
    broadcast: {
      schema: "void_buy_void_execution_broadcast_observation_v1",
      marker: "VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1",
      attempt_id: attemptId,
      observed_at_ms: 3,
      void_delivery_tx_hash: txHash,
      provider_submission_id: "synthetic",
      external_broadcast_observed: true,
      transaction_broadcast_performed_by_this_module: false,
    },
    failure: null,
    postbroadcast_failure: null,
    confirmation: null,
    status: "broadcast",
  } as any;
}

function encodedTransfer(
  from = wallet,
  to = recipient,
  value = amountAtoms,
) {
  return transferInterface.encodeEventLog(
    transferEvent,
    [from, to, value],
  );
}

function receipt(options: {
  tokenAddress?: string;
  from?: string;
  to?: string;
  amount?: bigint;
  status?: string;
  extraTransfer?: boolean;
} = {}) {
  const event = encodedTransfer(
    options.from ?? wallet,
    options.to ?? recipient,
    options.amount ?? amountAtoms,
  );
  const logs: any[] = [
    {
      address: options.tokenAddress ?? token,
      topics: event.topics,
      data: event.data,
      transactionHash: txHash,
      logIndex: "0x0",
    },
  ];
  if (options.extraTransfer) {
    const extra = encodedTransfer(wallet, other, 1n);
    logs.push({
      address: token,
      topics: extra.topics,
      data: extra.data,
      transactionHash: txHash,
      logIndex: "0x1",
    });
  }
  return {
    transactionHash: txHash,
    status: options.status ?? "0x1",
    blockNumber: "0x64",
    blockHash,
    from: wallet,
    to: token,
    logs,
  };
}

function policy() {
  return {
    enabled: true,
    chain_id: "2050" as const,
    rpc_url: "http://127.0.0.1:8545/",
    void_token_address: token,
    min_confirmations: "3",
    fulfillment_wallet_allowlist: [wallet],
  };
}

function transportFor(
  receiptValue: unknown,
  head = "0x69",
  chain = "0x802",
  revalidationValue: unknown = receiptValue,
) {
  const calls: string[] = [];
  let receiptReads = 0;
  const transport: BuyVoidErc20DeliveryReceiptRpcTransportV1 =
    async (call) => {
      calls.push(call.method);
      if (call.method === "eth_chainId") return chain;
      if (call.method === "eth_getTransactionReceipt") {
        assert.deepEqual(call.params, [txHash]);
        const value = receiptReads === 0
          ? receiptValue
          : revalidationValue;
        receiptReads += 1;
        return value;
      }
      if (call.method === "eth_blockNumber") return head;
      throw new Error(`unexpected method ${call.method}`);
    };
  return { calls, transport };
}

const baseTransport = transportFor(receipt());
const confirmed = await runBuyVoidErc20DeliveryReceiptReconcilerV1({
  attempt: attempt(),
  intent: intent(),
  policy: policy(),
  transport: baseTransport.transport,
});
assert.equal(confirmed.ok, true);
if ("reason" in confirmed) throw new Error(String(confirmed.reason));
assert.equal(confirmed.status, "confirmed");
assert.equal(confirmed.delivery_confirmed, true);
assert.equal(confirmed.void_token_address, token);
assert.equal(confirmed.fulfillment_wallet, wallet);
assert.equal(confirmed.delivery_address, recipient);
assert.equal(confirmed.void_amount_units, amountUnits.toString());
assert.equal(confirmed.token_amount_atoms, amountAtoms.toString());
assert.equal(confirmed.transfer_log_index, "0");
assert.equal(confirmed.receipt_block_number, "100");
assert.equal(confirmed.observed_confirmation_count, "6");
assert.match(confirmed.receipt_evidence_fingerprint_sha256, /^[0-9a-f]{64}$/);
assert.deepEqual(baseTransport.calls, [
  "eth_chainId",
  "eth_getTransactionReceipt",
  "eth_blockNumber",
  "eth_getTransactionReceipt",
]);
assert.equal(confirmed.mutation_performed, false);
assert.equal(confirmed.signing_performed, false);
assert.equal(confirmed.transaction_broadcast_performed, false);
assert.equal(confirmed.money_movement_performed, false);

let slowDripChunks = 0;
const slowDripServer = http.createServer((request, response) => {
  request.resume();
  request.on("end", () => {
    response.writeHead(200, {
      "content-type": "application/json",
    });
    const responseBody = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      result: "0x802",
    });
    let offset = 0;
    const interval = setInterval(() => {
      if (offset >= responseBody.length) {
        clearInterval(interval);
        response.end();
        return;
      }
      response.write(responseBody.slice(offset, offset + 1));
      offset += 1;
      slowDripChunks += 1;
    }, 20);
    response.on("close", () => clearInterval(interval));
  });
});
await new Promise<void>((resolve, reject) => {
  slowDripServer.once("error", reject);
  slowDripServer.listen(0, "127.0.0.1", resolve);
});
try {
  const address = slowDripServer.address();
  assert.ok(address && typeof address === "object");
  const requestTimeoutMs = 120;
  const startedAtMs = Date.now();
  const slowDripDecision =
    await runBuyVoidErc20DeliveryReceiptReconcilerV1({
      attempt: attempt(),
      intent: intent(),
      policy: {
        ...policy(),
        rpc_url: `http://127.0.0.1:${address.port}/`,
        request_timeout_ms: requestTimeoutMs,
      },
    });
  const elapsedMs = Date.now() - startedAtMs;
  assert.equal(slowDripDecision.ok, false);
  if (slowDripDecision.ok) {
    throw new Error("slow-drip RPC response must hold");
  }
  assert.equal(slowDripDecision.reason, "rpc_call_failed");
  assert.deepEqual(slowDripDecision.rpc_methods_used, ["eth_chainId"]);
  assert.ok(
    slowDripChunks >= 2,
    "fixture must keep the socket active before total deadline",
  );
  assert.ok(
    elapsedMs >= requestTimeoutMs - 40,
    `total deadline fired too early: ${elapsedMs}ms`,
  );
  assert.ok(
    elapsedMs < requestTimeoutMs + 1_000,
    `slow-drip response exceeded total deadline bound: ${elapsedMs}ms`,
  );
} finally {
  await new Promise<void>((resolve, reject) => {
    slowDripServer.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function expectHeld(
  expectedReason: string,
  receiptValue: unknown,
  head = "0x69",
  chain = "0x802",
) {
  const synthetic = transportFor(receiptValue, head, chain);
  const decision = await runBuyVoidErc20DeliveryReceiptReconcilerV1({
    attempt: attempt(),
    intent: intent(),
    policy: policy(),
    transport: synthetic.transport,
  });
  assert.equal(decision.ok, false);
  if (decision.ok) throw new Error("expected held decision");
  assert.equal(decision.reason, expectedReason);
  assert.equal(decision.mutation_performed, false);
  assert.equal(decision.signing_performed, false);
  assert.equal(decision.transaction_broadcast_performed, false);
  assert.equal(decision.money_movement_performed, false);
}

async function expectRevalidationHeld(
  expectedReason: string,
  revalidationValue: unknown,
) {
  const synthetic = transportFor(
    receipt(),
    "0x69",
    "0x802",
    revalidationValue,
  );
  const decision = await runBuyVoidErc20DeliveryReceiptReconcilerV1({
    attempt: attempt(),
    intent: intent(),
    policy: policy(),
    transport: synthetic.transport,
  });
  assert.equal(decision.ok, false);
  if (decision.ok) throw new Error("expected revalidation HOLD");
  assert.equal(decision.reason, expectedReason);
  assert.deepEqual(synthetic.calls, [
    "eth_chainId",
    "eth_getTransactionReceipt",
    "eth_blockNumber",
    "eth_getTransactionReceipt",
  ]);
  assert.equal(decision.mutation_performed, false);
  assert.equal(decision.signing_performed, false);
  assert.equal(decision.transaction_broadcast_performed, false);
  assert.equal(decision.money_movement_performed, false);
}

async function expectBindingHeld(
  expectedReason: string,
  attemptValue: ReturnType<typeof attempt>,
  intentValue: ReturnType<typeof intent> = intent(),
) {
  const synthetic = transportFor(receipt());
  const decision = await runBuyVoidErc20DeliveryReceiptReconcilerV1({
    attempt: attemptValue,
    intent: intentValue,
    policy: policy(),
    transport: synthetic.transport,
  });
  assert.equal(decision.ok, false);
  if (decision.ok) throw new Error("expected binding HOLD");
  assert.equal(decision.reason, expectedReason);
  assert.deepEqual(synthetic.calls, []);
  assert.equal(decision.mutation_performed, false);
  assert.equal(decision.signing_performed, false);
  assert.equal(decision.transaction_broadcast_performed, false);
  assert.equal(decision.money_movement_performed, false);
}

const wrongPreparedAttempt = attempt();
wrongPreparedAttempt.prepared.attempt_id = "6".repeat(64);
await expectBindingHeld(
  "execution_attempt_identity_binding_mismatch",
  wrongPreparedAttempt,
);

const wrongBroadcastAttempt = attempt();
wrongBroadcastAttempt.broadcast.attempt_id = "7".repeat(64);
await expectBindingHeld(
  "execution_attempt_identity_binding_mismatch",
  wrongBroadcastAttempt,
);

const wrongIntentFingerprintAttempt = attempt();
wrongIntentFingerprintAttempt.reservation.intent_fingerprint = "8".repeat(64);
await expectBindingHeld(
  "fulfillment_intent_attempt_binding_mismatch",
  wrongIntentFingerprintAttempt,
);

const wrongPaymentKeyIntent = intent();
wrongPaymentKeyIntent.payment_key_sha256 = "9".repeat(64);
await expectBindingHeld(
  "fulfillment_intent_attempt_binding_mismatch",
  attempt(),
  wrongPaymentKeyIntent,
);

const wrongClaimSchemaIntent = intent();
wrongClaimSchemaIntent.claim.schema =
  "void_buy_void_execution_attempt_reservation_v1";
await expectBindingHeld(
  "fulfillment_intent_attempt_binding_mismatch",
  attempt(),
  wrongClaimSchemaIntent,
);

await expectHeld(
  "delivery_receipt_token_contract_mismatch",
  { ...receipt(), to: other },
);
await expectHeld(
  "void_token_transfer_event_count_invalid",
  receipt({ tokenAddress: other }),
);
await expectHeld(
  "void_token_transfer_from_mismatch",
  receipt({ from: other }),
);
await expectHeld(
  "void_token_transfer_to_mismatch",
  receipt({ to: other }),
);
await expectHeld(
  "void_token_transfer_amount_mismatch",
  receipt({ amount: amountAtoms + 1n }),
);
await expectHeld(
  "void_token_transfer_event_count_invalid",
  receipt({ extraTransfer: true }),
);
await expectHeld(
  "delivery_transaction_reverted",
  receipt({ status: "0x0" }),
);
await expectHeld(
  "insufficient_delivery_confirmations",
  receipt(),
  "0x65",
);
await expectHeld(
  "chain_id_mismatch",
  receipt(),
  "0x69",
  "0x1",
);

await expectRevalidationHeld(
  "delivery_receipt_revalidation_invalid",
  null,
);
await expectRevalidationHeld(
  "delivery_receipt_changed_during_confirmation_window",
  {
    ...receipt(),
    blockHash: `0x${"3".repeat(64)}`,
  },
);
await expectRevalidationHeld(
  "delivery_receipt_changed_during_confirmation_window",
  receipt({ amount: amountAtoms + 1n }),
);
const changedLogIndexReceipt = receipt();
changedLogIndexReceipt.logs[0] = {
  ...changedLogIndexReceipt.logs[0],
  logIndex: "0x1",
};
await expectRevalidationHeld(
  "delivery_receipt_changed_during_confirmation_window",
  changedLogIndexReceipt,
);

const disabledTransport = transportFor(receipt());
const disabled = await runBuyVoidErc20DeliveryReceiptReconcilerV1({
  attempt: attempt(),
  intent: intent(),
  policy: { ...policy(), enabled: false },
  transport: disabledTransport.transport,
});
assert.equal(disabled.ok, false);
if (disabled.ok) throw new Error("disabled policy must hold");
assert.equal(
  disabled.reason,
  "erc20_delivery_receipt_reconciler_disabled",
);
assert.deepEqual(disabledTransport.calls, []);

assert.equal(
  VOID_BUY_VOID_ERC20_DELIVERY_RECEIPT_RECONCILER_AUTHORITY_V1
    .exact_execution_attempt_identity_required,
  true,
);
assert.equal(
  VOID_BUY_VOID_ERC20_DELIVERY_RECEIPT_RECONCILER_AUTHORITY_V1
    .exact_fulfillment_intent_fingerprint_required,
  true,
);
assert.equal(
  VOID_BUY_VOID_ERC20_DELIVERY_RECEIPT_RECONCILER_AUTHORITY_V1
    .exact_void_token_transfer_required,
  true,
);
assert.equal(
  VOID_BUY_VOID_ERC20_DELIVERY_RECEIPT_RECONCILER_AUTHORITY_V1
    .dry_only,
  true,
);
assert.equal(
  VOID_BUY_VOID_ERC20_DELIVERY_RECEIPT_RECONCILER_AUTHORITY_V1
    .filesystem_write,
  false,
);
assert.equal(
  VOID_BUY_VOID_ERC20_DELIVERY_RECEIPT_RECONCILER_AUTHORITY_V1
    .wallet_access,
  false,
);
assert.equal(
  VOID_BUY_VOID_ERC20_DELIVERY_RECEIPT_RECONCILER_AUTHORITY_V1
    .signing,
  false,
);
assert.equal(
  VOID_BUY_VOID_ERC20_DELIVERY_RECEIPT_RECONCILER_AUTHORITY_V1
    .transaction_broadcast,
  false,
);
assert.equal(
  VOID_BUY_VOID_ERC20_DELIVERY_RECEIPT_RECONCILER_AUTHORITY_V1
    .money_movement,
  false,
);

console.log("VOID_BUY_VOID_ERC20_DELIVERY_RECEIPT_RECONCILER_V1_PROOF_GREEN");
console.log("chain_id=2050");
console.log("transfer_event_required=true");
console.log("exact_execution_attempt_identity=true");
console.log("exact_fulfillment_intent_fingerprint=true");
console.log("exact_token_contract=true");
console.log("exact_from_wallet=true");
console.log("exact_to_delivery_address=true");
console.log("exact_token_amount_atoms=true");
console.log("min_confirmations_enforced=true");
console.log("receipt_revalidation_after_confirmations=true");
console.log("rpc_inactivity_timeout_enforced=true");
console.log("rpc_total_deadline_enforced=true");
console.log("mutation_performed=false");
console.log("signing_performed=false");
console.log("transaction_broadcast_performed=false");
console.log("money_movement_performed=false");
