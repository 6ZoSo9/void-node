import assert from "node:assert/strict";
import crypto from "node:crypto";
import { Transaction, Wallet } from "ethers";
import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_CHAIN2050_TRANSPORT_AUTHORITY_V1,
  createBuyVoidPreparedTransactionChain2050TransportV1,
  type BuyVoidPreparedTransactionChain2050ReadMethodV1,
} from "../src/economic/buy_void_prepared_transaction_chain2050_transport_v1.js";
import type {
  BuyVoidNativeChain2050JsonRpcCallV1,
  BuyVoidNativeChain2050JsonRpcCallResultV1,
  BuyVoidNativeChain2050JsonRpcTransportV1,
} from "../src/economic/buy_void_native_chain2050_broadcaster_v1.js";

const MARKER =
  "VOID_BUY_VOID_PREPARED_TRANSACTION_CHAIN2050_TRANSPORT_V1_PROOF_GREEN";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

async function main(): Promise<void> {
  const wallet = new Wallet(`0x${"1".repeat(64)}`);
  const delivery = `0x${"2".repeat(40)}`;
  const nativeValueWei = 2_500_000n * 1_000_000_000_000n;
  const raw = await wallet.signTransaction({
    type: 2,
    chainId: 2050,
    nonce: 5,
    to: delivery,
    value: nativeValueWei,
    gasLimit: 21000n,
    maxFeePerGas: 100n,
    maxPriorityFeePerGas: 2n,
    data: "0x",
    accessList: [],
  });
  const parsed = Transaction.from(raw);
  const hash = String(parsed.hash).toLowerCase();

  const sagaId = `voidbvfsg1_${sha256("proof-saga")}`;
  const attemptId = sha256("proof-attempt");
  const intentId = `voidbvbci1_${sha256("proof-intent")}`;

  let submitSendCalls = 0;
  let submitChainCalls = 0;
  let sendMode: "accepted" | "definite_failure" | "ambiguous_failure" =
    "accepted";

  const submitRpcTransport: BuyVoidNativeChain2050JsonRpcTransportV1 = {
    async call(
      call: Readonly<BuyVoidNativeChain2050JsonRpcCallV1>,
    ): Promise<BuyVoidNativeChain2050JsonRpcCallResultV1> {
      if (call.method === "eth_chainId") {
        submitChainCalls += 1;
        return {
          ok: true,
          request_sent: true,
          response_received: true,
          http_status: 200,
          request_id: call.request_id,
          result: "0x802",
          provider_submission_id: "native-proof-chain",
        };
      }
      assert.equal(call.method, "eth_sendRawTransaction");
      submitSendCalls += 1;
      assert.equal(call.params.length, 1);
      assert.equal(call.params[0], raw);
      if (sendMode === "accepted") {
        return {
          ok: true,
          request_sent: true,
          response_received: true,
          http_status: 200,
          request_id: call.request_id,
          result: hash,
          provider_submission_id: "native-proof-send",
        };
      }
      return {
        ok: false,
        request_sent: sendMode === "ambiguous_failure",
        response_received: false,
        http_status: null,
        request_id: call.request_id,
        error_code: "proof_failure",
        json_rpc_error_code: "",
        provider_submission_id: "native-proof-failure",
      };
    },
  };

  type ReadMode =
    | "missing"
    | "pending"
    | "confirmed"
    | "reverted"
    | "wrong_chain"
    | "bad_binding";
  let readMode: ReadMode = "pending";
  const readCalls: BuyVoidPreparedTransactionChain2050ReadMethodV1[] = [];

  const txObject = {
    hash,
    from: wallet.address.toLowerCase(),
    to: delivery.toLowerCase(),
    chainId: "0x802",
    value: `0x${nativeValueWei.toString(16)}`,
  };
  const receiptObject = (status: "0x0" | "0x1") => ({
    transactionHash: hash,
    from: wallet.address.toLowerCase(),
    to: delivery.toLowerCase(),
    blockNumber: "0x64",
    blockHash: `0x${"b".repeat(64)}`,
    status,
  });

  const readTransport = async (call: {
    method: BuyVoidPreparedTransactionChain2050ReadMethodV1;
    params: readonly unknown[];
  }): Promise<unknown> => {
    readCalls.push(call.method);
    if (call.method === "eth_chainId") {
      return readMode === "wrong_chain" ? "0x1" : "0x802";
    }
    if (call.method === "eth_getTransactionReceipt") {
      if (readMode === "confirmed") return receiptObject("0x1");
      if (readMode === "reverted") return receiptObject("0x0");
      return null;
    }
    if (call.method === "eth_getTransactionByHash") {
      if (readMode === "missing") return null;
      if (readMode === "bad_binding") {
        return { ...txObject, hash: `0x${"f".repeat(64)}` };
      }
      return txObject;
    }
    assert.equal(call.method, "eth_blockNumber");
    return "0x6f";
  };

  const created = await createBuyVoidPreparedTransactionChain2050TransportV1(
    {
      rpc_url: "http://127.0.0.1:8545/",
      expected_chain_id: 2050,
      request_timeout_ms: 5000,
      max_response_bytes: 65536,
    },
    {
      submit_rpc_transport: submitRpcTransport,
      read_transport: readTransport,
    },
  );
  if (!created.ok) throw new Error("chain2050_transport_should_be_ready");
  assert.equal(created.ok, true);

  assert.equal(submitChainCalls, 1);
  const stableProviderPrefix =
    `chain2050:${created.rpc_url_fingerprint_sha256.slice(0, 16)}:`;

  const privateSubmit = {
    submission_idempotency_key_sha256: sha256("submission-key"),
    saga_id: sagaId,
    attempt_id: attemptId,
    broadcast_intent_id: intentId,
    signed_transaction_hash: hash,
    raw_signed_transaction: raw,
  };

  const accepted = await created.transport.submit_once(privateSubmit);
  if (!accepted.ok) throw new Error("accepted_submit_result_expected");
  assert.equal(accepted.ok, true);
  assert.equal(accepted.status, "accepted");
  assert.ok(accepted.provider_submission_id.startsWith(stableProviderPrefix));
  const stableProvider = accepted.provider_submission_id;
  assert.equal(submitSendCalls, 1);
  assert.equal(submitChainCalls, 2);

  const publicInspect = {
    submission_idempotency_key_sha256: sha256("submission-key"),
    saga_id: sagaId,
    attempt_id: attemptId,
    broadcast_intent_id: intentId,
    custody_idempotency_key_sha256: sha256("custody-key"),
    custody_handle_fingerprint_sha256: sha256("custody-handle"),
    transaction_plan_fingerprint_sha256: sha256("plan"),
    signed_transaction_hash: hash,
  };

  readMode = "pending";
  readCalls.length = 0;
  const pending = await created.transport.inspect_submission(publicInspect);
  if (!pending.ok) throw new Error("pending_inspection_result_expected");
  assert.equal(pending.ok, true);
  assert.equal(pending.status, "accepted");
  assert.equal(pending.provider_submission_id, stableProvider);
  assert.deepEqual(readCalls, [
    "eth_chainId",
    "eth_getTransactionReceipt",
    "eth_getTransactionByHash",
  ]);

  readMode = "missing";
  readCalls.length = 0;
  const missing = await created.transport.inspect_submission(publicInspect);
  if (!missing.ok) throw new Error("missing_inspection_result_expected");
  assert.equal(missing.ok, true);
  assert.equal(missing.status, "unknown");
  assert.equal(missing.provider_submission_id, stableProvider);

  readMode = "confirmed";
  readCalls.length = 0;
  const confirmed = await created.transport.inspect_submission(publicInspect);
  assert.equal(confirmed.ok, true);
  assert.equal(confirmed.status, "confirmed");
  if (!confirmed.ok || confirmed.status !== "confirmed") {
    throw new Error("confirmed_result_expected");
  }
  assert.equal(confirmed.provider_submission_id, stableProvider);
  assert.equal(confirmed.receipt.chain_id, "2050");
  assert.equal(confirmed.receipt.transaction_hash, hash);
  assert.equal(confirmed.receipt.transaction_status, 1);
  assert.equal(confirmed.receipt.block_number, "100");
  assert.equal(confirmed.receipt.current_block_number, "111");
  assert.equal(confirmed.receipt.confirmation_count, "12");
  assert.equal(confirmed.receipt.from_address, wallet.address.toLowerCase());
  assert.equal(confirmed.receipt.to_address, delivery.toLowerCase());
  assert.equal(confirmed.receipt.amount_units, "2500000");
  assert.deepEqual(readCalls, [
    "eth_chainId",
    "eth_getTransactionReceipt",
    "eth_getTransactionByHash",
    "eth_blockNumber",
  ]);

  readMode = "reverted";
  const reverted = await created.transport.inspect_submission(publicInspect);
  assert.equal(reverted.ok, true);
  assert.equal(reverted.status, "reverted");
  if (!reverted.ok || reverted.status !== "reverted") {
    throw new Error("reverted_result_expected");
  }
  assert.equal(reverted.receipt.transaction_status, 0);

  readMode = "wrong_chain";
  const wrongChain = await created.transport.inspect_submission(publicInspect);
  assert.equal(wrongChain.ok, false);
  if (wrongChain.ok) throw new Error("wrong_chain_should_hold");
  assert.equal(wrongChain.reason, "chain2050_transport_chain_identity_held");

  readMode = "bad_binding";
  const badBinding = await created.transport.inspect_submission(publicInspect);
  assert.equal(badBinding.ok, false);
  if (badBinding.ok) throw new Error("bad_binding_should_hold");
  assert.equal(
    badBinding.reason,
    "chain2050_transport_transaction_binding_held",
  );

  sendMode = "definite_failure";
  const definitelyNotSubmitted =
    await created.transport.submit_once(privateSubmit);
  assert.equal(definitelyNotSubmitted.ok, true);
  assert.equal(definitelyNotSubmitted.status, "not_submitted");

  sendMode = "ambiguous_failure";
  const ambiguous = await created.transport.submit_once(privateSubmit);
  assert.equal(ambiguous.ok, true);
  assert.equal(ambiguous.status, "unknown");

  const mismatchedRaw = {
    ...privateSubmit,
    signed_transaction_hash: `0x${"f".repeat(64)}`,
  };
  const mismatch = await created.transport.submit_once(mismatchedRaw);
  assert.equal(mismatch.ok, false);
  assert.equal(submitSendCalls, 3);

  const remotePolicy =
    await createBuyVoidPreparedTransactionChain2050TransportV1(
      {
        rpc_url: "http://198.51.100.1:8545/",
        expected_chain_id: 2050,
      },
      {
        submit_rpc_transport: submitRpcTransport,
        read_transport: readTransport,
      },
    );
  assert.equal(remotePolicy.ok, false);

  assert.deepEqual(
    VOID_BUY_VOID_PREPARED_TRANSACTION_CHAIN2050_TRANSPORT_AUTHORITY_V1,
    {
      source_only_contract: true,
      private_broadcaster_service_transport: true,
      expected_chain_id: 2050,
      loopback_http_only: true,
      existing_chain2050_broadcaster_reused_for_submit: true,
      submit_rpc_mutation_method: "eth_sendRawTransaction",
      inspection_rpc_methods: [
        "eth_chainId",
        "eth_getTransactionByHash",
        "eth_getTransactionReceipt",
        "eth_blockNumber",
      ],
      stable_provider_submission_identity: true,
      raw_signed_transaction_private_input: true,
      raw_signed_transaction_output: false,
      raw_signed_transaction_persistence: false,
      private_key_access: false,
      wallet_access: false,
      signing: false,
      runtime_route_mount: false,
      background_loop: false,
      startup_execution: false,
      automatic_retry: false,
      production_activation: false,
      money_movement_when_submit_called: true,
    },
  );

  console.log(MARKER);
  console.log("existing_chain2050_broadcaster_reused_for_submit=true");
  console.log("submit_rpc_mutation_method=eth_sendRawTransaction");
  console.log("inspection_rpc_is_read_only=true");
  console.log("stable_provider_submission_identity=true");
  console.log("rpc_transaction_hash_self_consistency=true");
  console.log("receipt_fields_bound_to_observed_transaction=true");
  console.log("attempt_specific_recipient_amount_binding=downstream_reconciliation");
  console.log("missing_receipt_and_transaction=unknown");
  console.log("pending_transaction=accepted");
  console.log("confirmed_receipt=true");
  console.log("reverted_receipt=true");
  console.log("wrong_chain=held");
  console.log("definitive_presubmit_failure=not_submitted");
  console.log("ambiguous_submit_failure=unknown");
  console.log("raw_signed_transaction_output=false");
  console.log("real_rpc_calls=0");
  console.log("real_transaction_broadcast=false");
  console.log("runtime_route_mount=false");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
