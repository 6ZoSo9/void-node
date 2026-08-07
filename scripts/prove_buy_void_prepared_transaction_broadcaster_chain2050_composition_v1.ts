import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Transaction, Wallet } from "ethers";
import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_CHAIN2050_COMPOSITION_AUTHORITY_V1,
  createBuyVoidPreparedTransactionBroadcasterChain2050CompositionV1,
} from "../src/economic/buy_void_prepared_transaction_broadcaster_chain2050_composition_v1.js";
import {
  createBuyVoidPreparedTransactionBroadcasterIpcV1,
} from "../src/economic/buy_void_prepared_transaction_broadcaster_ipc_v1.js";
import type {
  BuyVoidNativeChain2050JsonRpcCallV1,
  BuyVoidNativeChain2050JsonRpcCallResultV1,
  BuyVoidNativeChain2050JsonRpcTransportV1,
} from "../src/economic/buy_void_native_chain2050_broadcaster_v1.js";
import type {
  BuyVoidPreparedTransactionChain2050ReadMethodV1,
} from "../src/economic/buy_void_prepared_transaction_chain2050_transport_v1.js";

const MARKER =
  "VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_CHAIN2050_COMPOSITION_V1_PROOF_GREEN";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function mkdirPrivate(directory: string): void {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
}

function writePrivateJson(file: string, value: unknown): void {
  mkdirPrivate(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  fs.chmodSync(file, 0o600);
}

async function main(): Promise<void> {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-broadcaster-chain2050-composition-proof-"),
  );
  const socketDir = path.join(root, "socket");
  const custodyStore = path.join(root, "custody-store");
  const stateDir = path.join(root, "broadcaster-state");
  mkdirPrivate(socketDir);
  mkdirPrivate(custodyStore);
  mkdirPrivate(path.join(custodyStore, "records"));

  const socketPath = path.join(socketDir, "broadcaster.sock");
  const signerFingerprint = sha256("composition-proof-signer");
  const wallet = new Wallet(`0x${"1".repeat(64)}`);
  const delivery = `0x${"2".repeat(40)}`;
  const nativeValueWei = 2_500_000n * 1_000_000_000_000n;

  const raw = await wallet.signTransaction({
    type: 2,
    chainId: 2050,
    nonce: 21,
    to: delivery,
    value: nativeValueWei,
    gasLimit: 21000n,
    maxFeePerGas: 100n,
    maxPriorityFeePerGas: 2n,
    data: "0x",
    accessList: [],
  });
  const transaction = Transaction.from(raw);
  const hash = String(transaction.hash).toLowerCase();

  const sagaId = `voidbvfsg1_${sha256("composition-saga")}`;
  const attemptId = sha256("composition-attempt");
  const planReservationId = sha256("composition-plan-reservation");
  const planFingerprint = sha256("composition-plan");
  const custodyIdempotencyKey = sha256("composition-custody-key");
  const custodyHandle =
    `custody:void-buy:composition/${custodyIdempotencyKey}`;
  const broadcastIntentId =
    `voidbvbci1_${sha256("composition-broadcast-intent")}`;

  writePrivateJson(
    path.join(custodyStore, "records", `${custodyIdempotencyKey}.json`),
    {
      schema:
        "void_buy_void_prepared_transaction_custodian_service_record_v1",
      marker:
        "VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_SERVICE_V1",
      version: 1,
      recorded_at_ms: Date.parse("2026-08-07T17:00:00.000Z"),
      idempotency_key_sha256: custodyIdempotencyKey,
      saga_id: sagaId,
      attempt_id: attemptId,
      plan_reservation_id: planReservationId,
      transaction_plan_fingerprint_sha256: planFingerprint,
      chain_id: "2050",
      wallet_address: wallet.address.toLowerCase(),
      nonce: 21,
      delivery_address: delivery.toLowerCase(),
      native_value_wei: nativeValueWei.toString(),
      gas_limit: "21000",
      max_fee_per_gas_wei: "100",
      max_priority_fee_per_gas_wei: "2",
      custody_handle: custodyHandle,
      signed_transaction_hash: hash,
      signer_fingerprint_sha256: signerFingerprint,
      raw_signed_transaction: raw,
      raw_signed_transaction_sha256: sha256(raw.toLowerCase()),
      transaction_broadcast_authorized: false,
      money_movement_authorized: false,
    },
  );

  let sendCalls = 0;
  let submitChainCalls = 0;
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
          provider_submission_id: "composition-chain-probe",
        };
      }
      assert.equal(call.method, "eth_sendRawTransaction");
      sendCalls += 1;
      assert.deepEqual(call.params, [raw]);
      return {
        ok: true,
        request_sent: true,
        response_received: true,
        http_status: 200,
        request_id: call.request_id,
        result: hash,
        provider_submission_id: "composition-send",
      };
    },
  };

  const readCalls: BuyVoidPreparedTransactionChain2050ReadMethodV1[] = [];
  const readTransport = async (call: {
    method: BuyVoidPreparedTransactionChain2050ReadMethodV1;
    params: readonly unknown[];
  }): Promise<unknown> => {
    readCalls.push(call.method);
    if (call.method === "eth_chainId") return "0x802";
    if (call.method === "eth_getTransactionReceipt") {
      return {
        transactionHash: hash,
        from: wallet.address.toLowerCase(),
        to: delivery.toLowerCase(),
        blockNumber: "0x64",
        blockHash: `0x${"b".repeat(64)}`,
        status: "0x1",
      };
    }
    if (call.method === "eth_getTransactionByHash") {
      return {
        hash,
        from: wallet.address.toLowerCase(),
        to: delivery.toLowerCase(),
        chainId: "0x802",
        value: `0x${nativeValueWei.toString(16)}`,
      };
    }
    assert.equal(call.method, "eth_blockNumber");
    return "0x6f";
  };

  const composed =
    await createBuyVoidPreparedTransactionBroadcasterChain2050CompositionV1(
      {
        socket_path: socketPath,
        custody_store_dir: custodyStore,
        state_dir: stateDir,
        expected_signer_fingerprint_sha256: signerFingerprint,
        rpc: {
          rpc_url: "http://127.0.0.1:8545/",
          expected_chain_id: 2050,
          request_timeout_ms: 5000,
          max_response_bytes: 65536,
        },
      },
      {
        chain_transport: {
          submit_rpc_transport: submitRpcTransport,
          read_transport: readTransport,
        },
      },
    );

  if (!composed.ok) {
    throw new Error("broadcaster_chain2050_composition_should_be_ready");
  }
  assert.equal(composed.ok, true);
  assert.equal(composed.service_started, false);
  assert.equal(composed.transaction_broadcast_performed, false);
  assert.equal(composed.money_movement_performed, false);
  assert.equal(sendCalls, 0);
  assert.equal(submitChainCalls, 1);

  const started = await composed.service.start();
  assert.equal(started.raw_signed_transaction_ipc_output, false);

  const broadcaster =
    createBuyVoidPreparedTransactionBroadcasterIpcV1({
      socket_path: socketPath,
    });

  const publicRequest = {
    submission_idempotency_key_sha256: sha256(
      [
        "void-buy-prepared-transaction-broadcast-custody-v1",
        sagaId,
        attemptId,
        broadcastIntentId,
        custodyIdempotencyKey,
        hash,
      ].join("\n"),
    ),
    saga_id: sagaId,
    attempt_id: attemptId,
    broadcast_intent_id: broadcastIntentId,
    custody_idempotency_key_sha256: custodyIdempotencyKey,
    custody_handle_fingerprint_sha256: sha256(custodyHandle),
    transaction_plan_fingerprint_sha256: planFingerprint,
    signed_transaction_hash: hash,
  };

  const submitted = await broadcaster.submit_once(publicRequest);
  assert.equal(submitted.ok, true);
  assert.equal(submitted.status, "accepted");
  assert.equal(sendCalls, 1);
  assert.equal(submitChainCalls, 2);
  assert.equal(JSON.stringify(submitted).includes(raw), false);

  const duplicate = await broadcaster.submit_once(publicRequest);
  assert.equal(duplicate.ok, false);
  assert.equal(sendCalls, 1);

  readCalls.length = 0;
  const confirmed = await broadcaster.inspect_submission(publicRequest);
  assert.equal(confirmed.ok, true);
  assert.equal(confirmed.status, "confirmed");
  if (!confirmed.ok || confirmed.status !== "confirmed") {
    throw new Error("composition_confirmed_expected");
  }
  assert.equal(confirmed.receipt.transaction_hash, hash);
  assert.equal(confirmed.receipt.from_address, wallet.address.toLowerCase());
  assert.equal(confirmed.receipt.to_address, delivery.toLowerCase());
  assert.equal(confirmed.receipt.amount_units, "2500000");
  assert.equal(confirmed.receipt.confirmation_count, "12");
  assert.equal(sendCalls, 1);
  assert.deepEqual(readCalls, [
    "eth_chainId",
    "eth_getTransactionReceipt",
    "eth_getTransactionByHash",
    "eth_blockNumber",
  ]);

  await composed.service.stop();
  fs.rmSync(root, { recursive: true, force: true });

  assert.deepEqual(
    VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_CHAIN2050_COMPOSITION_AUTHORITY_V1,
    {
      source_only_contract: true,
      server_controlled_paths_required: true,
      server_controlled_rpc_policy_required: true,
      private_broadcaster_service_reused: true,
      private_chain2050_transport_reused: true,
      chain2050_transport_factory_read_only_probe_when_invoked: true,
      service_created_but_not_started: true,
      service_start: false,
      application_private_material_access: false,
      application_wallet_access: false,
      application_signing: false,
      raw_signed_transaction_application_visibility: false,
      raw_signed_transaction_composition_visibility: false,
      runtime_route_mount: false,
      background_loop: false,
      startup_execution: false,
      automatic_retry: false,
      transaction_broadcast_during_composition: false,
      money_movement_during_composition: false,
    },
  );

  console.log(MARKER);
  console.log("private_service_reused=true");
  console.log("private_chain2050_transport_reused=true");
  console.log("composition_factory_service_start=false");
  console.log("composition_factory_transaction_broadcast=false");
  console.log("synthetic_service_start=true");
  console.log("synthetic_submit_calls=1");
  console.log("duplicate_submit_resubmission=false");
  console.log("synthetic_confirmed_inspection=true");
  console.log("raw_signed_transaction_application_visibility=false");
  console.log("real_rpc_calls=0");
  console.log("real_transaction_broadcast=false");
  console.log("production_service_activation=false");
  console.log("runtime_route_mount=false");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
