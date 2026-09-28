import assert from "node:assert/strict";
import * as fs from "node:fs";
import {
  Interface,
  Transaction,
  Wallet,
} from "ethers";

import {
  VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_AUTHORITY_V1,
  VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_CONFIRMATION_V1,
  VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_V1,
  runVoidParticipantPostpurchaseRawSubmissionV1,
} from "../src/economic/participant_postpurchase_raw_submission_v1.js";
import {
  buyVoidExecutionAttemptIntentFingerprintV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";
import type {
  BuyVoidErc20DeliveryReceiptRpcTransportV1,
} from "../src/economic/buy_void_erc20_delivery_receipt_reconciler_v1.js";
import type {
  BuyVoidNativeChain2050JsonRpcCallResultV1,
  BuyVoidNativeChain2050JsonRpcTransportV1,
} from "../src/economic/buy_void_native_chain2050_broadcaster_v1.js";

const participantWallet = Wallet.createRandom();
const otherWallet = Wallet.createRandom();
const fulfillmentWallet = Wallet.createRandom();
const participant = participantWallet.address.toLowerCase();
const fulfillment = fulfillmentWallet.address.toLowerCase();
const other = otherWallet.address.toLowerCase();

const token = "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const transferRecipient =
  "0x2222222222222222222222222222222222222222";
const deliveryTxHash = `0x${"1".repeat(64)}`;
const deliveryBlockHash = `0x${"2".repeat(64)}`;
const amountUnits = 100_000_000n;
const amountAtoms = amountUnits * 1_000_000_000_000n;
const controlAmount = amountAtoms / 4n;
const attemptId = "a".repeat(64);
const paymentKey = "b".repeat(64);
const requestKey = "c".repeat(64);
const canonicalPaymentIdentity =
  "voidpay1:ethereum:0x" + "d".repeat(64) + ":0";
const requestId = "request-participant-raw-submission-v1";
const instructionId = "e".repeat(64);

const transferInterface = new Interface([
  "event Transfer(address indexed from,address indexed to,uint256 value)",
  "function transfer(address to,uint256 amount) returns (bool)",
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
    payment_usdc_units: "1000000",
    delivery_address: participant,
    void_amount_units: amountUnits.toString(),
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    automatic_execution_authorized: false,
  } as const;
}

function fulfillmentIntent() {
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
      receive_address: fulfillment,
      delivery_address: participant,
      payment_usdc_units: "1000000",
      requested_usdc_units: "1000000",
      quoted_void_units: amountUnits.toString(),
    },
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    money_movement_authorized: false,
  } as any;
}

function executionAttempt() {
  const intent = fulfillmentIntent();
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
        buyVoidExecutionAttemptIntentFingerprintV1(intent),
      max_attempts_per_payment: 1,
      unsigned_instruction: intent.claim.unsigned_instruction,
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
      void_delivery_tx_hash: deliveryTxHash,
      fulfillment_wallet: fulfillment,
      delivery_address: participant,
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
      void_delivery_tx_hash: deliveryTxHash,
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

function deliveryReceipt(options: {
  status?: string;
  tokenAddress?: string;
  from?: string;
  to?: string;
  amount?: bigint;
} = {}) {
  const event = transferInterface.encodeEventLog(
    transferEvent,
    [
      options.from ?? fulfillment,
      options.to ?? participant,
      options.amount ?? amountAtoms,
    ],
  );
  return {
    transactionHash: deliveryTxHash,
    status: options.status ?? "0x1",
    blockNumber: "0x64",
    blockHash: deliveryBlockHash,
    from: fulfillment,
    to: token,
    logs: [
      {
        address: options.tokenAddress ?? token,
        topics: event.topics,
        data: event.data,
        transactionHash: deliveryTxHash,
        logIndex: "0x0",
      },
    ],
  };
}

function deliveryTransportFor(
  receiptValue: unknown = deliveryReceipt(),
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
        assert.deepEqual(call.params, [deliveryTxHash]);
        const value =
          receiptReads === 0 ? receiptValue : revalidationValue;
        receiptReads += 1;
        return value;
      }
      if (call.method === "eth_blockNumber") return head;
      throw new Error("unexpected delivery RPC method");
    };
  return { calls, transport };
}

function deliveryInput(
  transport: BuyVoidErc20DeliveryReceiptRpcTransportV1,
  enabled = true,
) {
  return {
    attempt: executionAttempt(),
    intent: fulfillmentIntent(),
    policy: {
      enabled,
      chain_id: "2050" as const,
      rpc_url: "http://127.0.0.1:8545/",
      void_token_address: token,
      min_confirmations: "3",
      fulfillment_wallet_allowlist: [fulfillment],
    },
    transport,
  };
}

async function signedControlTransaction(options: {
  wallet?: Wallet;
  chainId?: number;
  to?: string;
  amount?: bigint;
  value?: bigint;
  gasLimit?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  data?: string;
  nonce?: number;
} = {}) {
  return await (options.wallet ?? participantWallet).signTransaction({
    type: 2,
    chainId: options.chainId ?? 2050,
    nonce: options.nonce ?? 7,
    to: options.to ?? token,
    value: options.value ?? 0n,
    gasLimit: options.gasLimit ?? 100_000n,
    maxFeePerGas: options.maxFeePerGas ?? 0n,
    maxPriorityFeePerGas:
      options.maxPriorityFeePerGas ?? 0n,
    data:
      options.data ??
      transferInterface.encodeFunctionData(
        "transfer",
        [transferRecipient, options.amount ?? controlAmount],
      ),
  });
}

function rpcReady(
  requestId: number,
  result: unknown,
  suffix: string,
): BuyVoidNativeChain2050JsonRpcCallResultV1 {
  return {
    ok: true,
    request_sent: true,
    response_received: true,
    http_status: 200,
    request_id: requestId,
    result,
    provider_submission_id: `participant-proof:${requestId}:${suffix}`,
  };
}

function broadcastTransportFor(options: {
  startupChain?: string;
  liveChain?: string;
  sendResult?: string | null;
  sendFailure?: {
    request_sent: boolean;
    response_received: boolean;
    error_code?: string;
  } | null;
  throwOnSend?: boolean;
} = {}) {
  const calls: string[] = [];
  let chainReads = 0;
  let sendCalls = 0;
  let expectedHash = "";
  const transport: BuyVoidNativeChain2050JsonRpcTransportV1 = {
    async call(input) {
      calls.push(input.method);
      if (input.method === "eth_chainId") {
        const result =
          chainReads++ === 0
            ? options.startupChain ?? "0x802"
            : options.liveChain ?? "0x802";
        return rpcReady(input.request_id, result, "chain");
      }
      if (input.method !== "eth_sendRawTransaction") {
        throw new Error("unexpected broadcaster RPC method");
      }
      sendCalls += 1;
      const raw = String(input.params[0] ?? "");
      expectedHash =
        String(Transaction.from(raw).hash ?? "").toLowerCase();

      if (options.throwOnSend) {
        throw new Error("synthetic send transport failure");
      }
      if (options.sendFailure) {
        return {
          ok: false,
          request_sent: options.sendFailure.request_sent,
          response_received: options.sendFailure.response_received,
          http_status: options.sendFailure.response_received ? 200 : null,
          request_id: input.request_id,
          error_code:
            options.sendFailure.error_code ?? "synthetic_send_failure",
          json_rpc_error_code: "",
          provider_submission_id:
            `participant-proof:${input.request_id}:send-failed`,
        };
      }

      return rpcReady(
        input.request_id,
        options.sendResult ?? expectedHash,
        "send",
      );
    },
  };
  return {
    calls,
    transport,
    get sendCalls() {
      return sendCalls;
    },
    get expectedHash() {
      return expectedHash;
    },
  };
}

function broadcastPolicy() {
  return {
    rpc_url: "http://127.0.0.1:18550/",
    expected_chain_id: "2050",
    request_timeout_ms: 1000,
    max_response_bytes: 65536,
  };
}

async function runFixture(options: {
  raw?: string;
  deliveryTransport?: ReturnType<typeof deliveryTransportFor>;
  broadcastTransport?: ReturnType<typeof broadcastTransportFor>;
  apply?: boolean;
  confirmation?: string;
  deliveryEnabled?: boolean;
} = {}) {
  const delivery =
    options.deliveryTransport ?? deliveryTransportFor();
  const broadcast =
    options.broadcastTransport ?? broadcastTransportFor();
  const raw =
    options.raw ?? await signedControlTransaction();

  const result = await runVoidParticipantPostpurchaseRawSubmissionV1({
    delivery_reconciliation:
      deliveryInput(
        delivery.transport,
        options.deliveryEnabled ?? true,
      ),
    raw_signed_transaction: raw,
    broadcast_policy: broadcastPolicy(),
    broadcast_transport: broadcast.transport,
    apply: options.apply ?? true,
    confirmation:
      options.confirmation ??
      VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_CONFIRMATION_V1,
  });
  return { result, delivery, broadcast, raw };
}

{
  const { result, delivery, broadcast } =
    await runFixture({ apply: false });
  assert.equal(result.ok, true);
  assert.equal(result.status, "plan_ready");
  assert.equal(result.live_transport_called, false);
  assert.equal(result.transaction_submission_performed, false);
  assert.deepEqual(delivery.calls, []);
  assert.deepEqual(broadcast.calls, []);
}

{
  const { result, delivery, broadcast } =
    await runFixture({ confirmation: "wrong-confirmation" });
  assert.equal(result.ok, false);
  assert.equal(result.status, "held");
  assert.equal(result.reason, "explicit_confirmation_required");
  assert.deepEqual(delivery.calls, []);
  assert.deepEqual(broadcast.calls, []);
}

{
  const { result, delivery, broadcast } =
    await runFixture({ deliveryEnabled: false });
  assert.equal(result.ok, false);
  assert.equal(result.status, "held");
  assert.equal(result.reason, "delivery_reconciliation_required");
  assert.deepEqual(delivery.calls, []);
  assert.deepEqual(broadcast.calls, []);
}

{
  const raw = await signedControlTransaction({ wallet: otherWallet });
  const { result, delivery, broadcast } =
    await runFixture({ raw });
  assert.equal(result.ok, false);
  assert.equal(
    result.reason,
    "raw_transaction_signer_not_delivery_recipient",
  );
  assert.deepEqual(delivery.calls, [
    "eth_chainId",
    "eth_getTransactionReceipt",
    "eth_blockNumber",
    "eth_getTransactionReceipt",
  ]);
  assert.deepEqual(broadcast.calls, []);
}

{
  const raw = await signedControlTransaction({ chainId: 1 });
  const { result, broadcast } = await runFixture({ raw });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "raw_transaction_chain_id_mismatch");
  assert.deepEqual(broadcast.calls, []);
}

{
  const raw = await signedControlTransaction({
    maxFeePerGas: 1n,
  });
  const { result, broadcast } = await runFixture({ raw });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "raw_transaction_max_fee_mismatch");
  assert.deepEqual(broadcast.calls, []);
}

{
  const raw = await signedControlTransaction({
    amount: amountAtoms + 1n,
  });
  const { result, broadcast } = await runFixture({ raw });
  assert.equal(result.ok, false);
  assert.equal(
    result.reason,
    "raw_transaction_amount_exceeds_delivered_lot",
  );
  assert.deepEqual(broadcast.calls, []);
}

{
  const broadcast = broadcastTransportFor({
    startupChain: "0x1",
  });
  const { result } = await runFixture({
    broadcastTransport: broadcast,
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "chain2050_broadcaster_not_ready");
  assert.deepEqual(broadcast.calls, ["eth_chainId"]);
  assert.equal(broadcast.sendCalls, 0);
}

{
  const broadcast = broadcastTransportFor({
    startupChain: "0x802",
    liveChain: "0x1",
  });
  const { result } = await runFixture({
    broadcastTransport: broadcast,
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "transaction_submission_not_accepted");
  assert.deepEqual(
    broadcast.calls,
    ["eth_chainId", "eth_chainId"],
  );
  assert.equal(broadcast.sendCalls, 0);
}

{
  const broadcast = broadcastTransportFor({
    sendFailure: {
      request_sent: false,
      response_received: false,
    },
  });
  const { result } = await runFixture({
    broadcastTransport: broadcast,
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, "held");
  assert.equal(result.reason, "transaction_submission_not_accepted");
  assert.equal(result.submission_may_have_occurred, false);
  assert.equal(result.automatic_retry, false);
  assert.deepEqual(
    broadcast.calls,
    ["eth_chainId", "eth_chainId", "eth_sendRawTransaction"],
  );
  assert.equal(broadcast.sendCalls, 1);
}

{
  const broadcast = broadcastTransportFor({
    sendFailure: {
      request_sent: true,
      response_received: true,
    },
  });
  const { result } = await runFixture({
    broadcastTransport: broadcast,
  });
  assert.equal(result.ok, false);
  assert.equal(
    result.status,
    "ambiguous_reconciliation_required",
  );
  assert.equal(result.submission_may_have_occurred, true);
  assert.equal(result.automatic_retry, false);
  assert.deepEqual(
    broadcast.calls,
    ["eth_chainId", "eth_chainId", "eth_sendRawTransaction"],
  );
  assert.equal(broadcast.sendCalls, 1);
}

{
  const broadcast = broadcastTransportFor({
    throwOnSend: true,
  });
  const { result } = await runFixture({
    broadcastTransport: broadcast,
  });
  assert.equal(result.ok, false);
  assert.equal(
    result.status,
    "ambiguous_reconciliation_required",
  );
  assert.equal(result.submission_may_have_occurred, true);
  assert.equal(result.automatic_retry, false);
  assert.equal(broadcast.sendCalls, 1);
}

{
  const broadcast = broadcastTransportFor({
    sendResult: `0x${"f".repeat(64)}`,
  });
  const { result } = await runFixture({
    broadcastTransport: broadcast,
  });
  assert.equal(result.ok, false);
  assert.equal(
    result.status,
    "ambiguous_reconciliation_required",
  );
  assert.equal(result.submission_may_have_occurred, true);
  assert.equal(result.automatic_retry, false);
  assert.equal(broadcast.sendCalls, 1);
}

{
  const { result, delivery, broadcast, raw } =
    await runFixture();
  assert.equal(result.ok, true);
  if (!result.ok || result.status !==
      "submission_accepted_finality_required") {
    throw new Error("expected accepted submission");
  }
  const localHash =
    String(Transaction.from(raw).hash ?? "").toLowerCase();
  assert.equal(
    result.marker,
    VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_V1,
  );
  assert.equal(result.chain_id, "2050");
  assert.equal(result.participant_address, participant);
  assert.equal(result.void_token, token);
  assert.equal(result.transfer_recipient, transferRecipient);
  assert.equal(
    result.transfer_amount_atoms,
    controlAmount.toString(),
  );
  assert.equal(result.transaction_hash, localHash);
  assert.equal(result.submission_may_have_occurred, true);
  assert.equal(result.automatic_retry, false);
  assert.equal(result.raw_signed_transaction_persisted, false);
  assert.equal(result.raw_signed_transaction_output, false);
  assert.equal(result.participant_private_key_accessed, false);
  assert.equal(result.delivery_reconciliation_confirmed, true);
  assert.equal(result.participant_signature_recovered, true);
  assert.equal(result.delivery_recipient_equals_signer, true);
  assert.equal(result.canonical_voidtoken_transfer_verified, true);
  assert.equal(result.zero_native_value_verified, true);
  assert.equal(result.zero_gas_price_policy_bound, true);
  assert.equal(result.transaction_submission_performed, true);
  assert.equal(result.transaction_broadcast_performed, true);
  assert.equal(result.receipt_finality_verified, false);
  assert.equal(
    result.participant_postpurchase_voidtoken_control_ready,
    false,
  );
  assert.equal(result.authoritative_chain2050_write_verified, false);
  assert.equal(result.token_movement_confirmed, false);
  assert.equal(result.funds_movement_confirmed, false);
  assert.deepEqual(delivery.calls, [
    "eth_chainId",
    "eth_getTransactionReceipt",
    "eth_blockNumber",
    "eth_getTransactionReceipt",
  ]);
  assert.deepEqual(
    broadcast.calls,
    ["eth_chainId", "eth_chainId", "eth_sendRawTransaction"],
  );
  assert.equal(broadcast.sendCalls, 1);
  assert.equal(broadcast.expectedHash, localHash);
}

for (const [key, value] of Object.entries(
  VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_AUTHORITY_V1,
)) {
  if (
    [
      "source_only",
      "explicit_apply_confirmation_required",
      "injected_delivery_read_transport_required",
      "injected_broadcast_transport_required",
      "delivery_receipt_reconciliation",
      "participant_signature_recovery",
      "transaction_submission_when_apply",
      "transaction_broadcast_when_apply",
      "token_movement_may_occur_when_apply",
      "funds_movement_may_occur_when_apply",
    ].includes(key)
  ) {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const source = fs.readFileSync(
  "src/economic/participant_postpurchase_raw_submission_v1.ts",
  "utf8",
);
assert.doesNotMatch(source, /createBuyVoidNativeChain2050HttpTransportV1/);
assert.doesNotMatch(source, /http\.request|https\.request/);
assert.doesNotMatch(source, /JsonRpcProvider\s*\(/);
assert.doesNotMatch(source, /new\s+Wallet\s*\(/);
assert.doesNotMatch(
  source,
  /PRIVATE_KEY\s*=|process\.env\.[A-Z0-9_]*PRIVATE_KEY|mnemonic/i,
);
assert.match(source, /input\.broadcast_transport/);
assert.match(source, /input\.delivery_reconciliation/);
assert.match(
  source,
  /VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_CONFIRMATION_V1/,
);
assert.match(source, /automatic_retry: false/);
assert.match(source, /receipt_finality_verified: false/);
assert.match(
  source,
  /participant_postpurchase_voidtoken_control_ready: false/,
);

console.log(
  "VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_V1_GREEN",
);
console.log("delivery_receipt_reconciliation_required=true");
console.log("participant_signature_recovery_required=true");
console.log("injected_delivery_transport_required=true");
console.log("injected_broadcast_transport_required=true");
console.log("built_in_network_transport=false");
console.log("exact_send_attempts=1");
console.log("automatic_retry=false");
console.log("ambiguous_submission_requires_reconciliation=true");
console.log("raw_signed_transaction_persisted=false");
console.log("participant_private_key_accessed=false");
console.log("receipt_finality_verified=false");
console.log("runtime_route_active=false");
console.log("public_submission_open=false");
console.log("participant_postpurchase_voidtoken_control_ready=false");
