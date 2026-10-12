#!/usr/bin/env node
import assert from "node:assert/strict";
import { Interface, Transaction, Wallet } from "ethers";

import type {
  BuyVoidNativeChain2050JsonRpcCallV1,
  BuyVoidNativeChain2050JsonRpcTransportV1,
} from "../src/economic/buy_void_native_chain2050_broadcaster_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_BROADCASTER_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_BROADCASTER_V1,
  createBuyVoidPaymentKeyedChain2050BroadcasterV1,
  inspectBuyVoidPaymentKeyedSignedTransactionV1,
} from "../src/economic/buy_void_payment_keyed_chain2050_broadcaster_v1.js";

const CONTRACT = "0x" + "5".repeat(40);
const RECIPIENT = "0x" + "4".repeat(40);
const TOKEN = "0x" + "3".repeat(40);
const PAYMENT_ID =
  "0xa06bb682bc6225c6697d0a37a51fc1323dc657eac74a51506ddb5d7daed82c85";
const AMOUNT = 2_000_000_000_000_000_000n;
const MAX_ATOMS = 10_000_000n * 1_000_000_000_000_000_000n;
const wallet = new Wallet("0x" + "11".repeat(32));
const fulfillment = new Interface([
  "function fulfill(bytes32 paymentDeliveryId,address recipient,uint256 amountAtoms)",
]);
const transfer = new Interface([
  "function transfer(address to,uint256 value) returns (bool)",
]);

async function signed(options: {
  to?: string;
  value?: bigint;
  data?: string;
  chainId?: bigint;
} = {}) {
  return await wallet.signTransaction({
    type: 2,
    chainId: options.chainId ?? 2050n,
    nonce: 7,
    gasLimit: 120_000n,
    maxFeePerGas: 2_000_000_000n,
    maxPriorityFeePerGas: 1_000_000_000n,
    to: options.to ?? CONTRACT,
    value: options.value ?? 0n,
    data:
      options.data ??
      fulfillment.encodeFunctionData("fulfill", [
        PAYMENT_ID,
        RECIPIENT,
        AMOUNT,
      ]),
  });
}

const validRaw = await signed();
const validParsed = Transaction.from(validRaw);
const validHash = String(validParsed.hash).toLowerCase();

const inspected = inspectBuyVoidPaymentKeyedSignedTransactionV1({
  raw_signed_transaction: validRaw,
  fulfillment_contract_address: CONTRACT,
  max_token_amount_atoms: MAX_ATOMS,
});
if (inspected.ok === false) throw new Error(inspected.reason);
assert.equal(inspected.status, "valid");
assert.equal(inspected.transaction_hash, validHash);
assert.equal(inspected.fulfillment_contract_address, CONTRACT);
assert.equal(inspected.payment_delivery_id, PAYMENT_ID);
assert.equal(inspected.recipient, RECIPIENT);
assert.equal(inspected.amount_atoms, AMOUNT.toString());
assert.equal(
  inspected.calldata,
  fulfillment
    .encodeFunctionData("fulfill", [PAYMENT_ID, RECIPIENT, AMOUNT])
    .toLowerCase(),
);

const malformed = inspectBuyVoidPaymentKeyedSignedTransactionV1({
  raw_signed_transaction: "0xdeadbeef",
  fulfillment_contract_address: CONTRACT,
  max_token_amount_atoms: MAX_ATOMS,
});
assert.equal(malformed.ok, false);
if (malformed.ok) throw new Error("malformed_unexpected_valid");
assert.equal(malformed.reason, "payment_keyed_signed_transaction_parse_failed");

const wrongContractRaw = await signed({ to: TOKEN });
const wrongContract = inspectBuyVoidPaymentKeyedSignedTransactionV1({
  raw_signed_transaction: wrongContractRaw,
  fulfillment_contract_address: CONTRACT,
  max_token_amount_atoms: MAX_ATOMS,
});
assert.equal(wrongContract.ok, false);
if (wrongContract.ok) throw new Error("wrong_contract_unexpected_valid");
assert.equal(
  wrongContract.reason,
  "payment_keyed_signed_transaction_envelope_mismatch",
);

const transferRaw = await signed({
  data: transfer.encodeFunctionData("transfer", [RECIPIENT, AMOUNT]),
});
const transferDecision = inspectBuyVoidPaymentKeyedSignedTransactionV1({
  raw_signed_transaction: transferRaw,
  fulfillment_contract_address: CONTRACT,
  max_token_amount_atoms: MAX_ATOMS,
});
assert.equal(transferDecision.ok, false);
if (transferDecision.ok) throw new Error("legacy_transfer_unexpected_valid");
assert.equal(
  transferDecision.reason,
  "payment_keyed_signed_transaction_calldata_invalid",
);

const nonzeroValueRaw = await signed({ value: 1n });
const nonzeroValue = inspectBuyVoidPaymentKeyedSignedTransactionV1({
  raw_signed_transaction: nonzeroValueRaw,
  fulfillment_contract_address: CONTRACT,
  max_token_amount_atoms: MAX_ATOMS,
});
assert.equal(nonzeroValue.ok, false);
if (nonzeroValue.ok) throw new Error("nonzero_value_unexpected_valid");
assert.equal(
  nonzeroValue.reason,
  "payment_keyed_signed_transaction_envelope_mismatch",
);

const zeroPaymentRaw = await signed({
  data: fulfillment.encodeFunctionData("fulfill", [
    "0x" + "0".repeat(64),
    RECIPIENT,
    AMOUNT,
  ]),
});
const zeroPayment = inspectBuyVoidPaymentKeyedSignedTransactionV1({
  raw_signed_transaction: zeroPaymentRaw,
  fulfillment_contract_address: CONTRACT,
  max_token_amount_atoms: MAX_ATOMS,
});
assert.equal(zeroPayment.ok, false);
if (zeroPayment.ok) throw new Error("zero_payment_unexpected_valid");
assert.equal(
  zeroPayment.reason,
  "payment_keyed_signed_transaction_fulfillment_binding_invalid",
);

const overAmountRaw = await signed({
  data: fulfillment.encodeFunctionData("fulfill", [
    PAYMENT_ID,
    RECIPIENT,
    MAX_ATOMS + 1n,
  ]),
});
const overAmount = inspectBuyVoidPaymentKeyedSignedTransactionV1({
  raw_signed_transaction: overAmountRaw,
  fulfillment_contract_address: CONTRACT,
  max_token_amount_atoms: MAX_ATOMS,
});
assert.equal(overAmount.ok, false);
if (overAmount.ok) throw new Error("over_amount_unexpected_valid");
assert.equal(
  overAmount.reason,
  "payment_keyed_signed_transaction_fulfillment_binding_invalid",
);

let coercions = 0;
const hostile = {
  [Symbol.toPrimitive]() {
    coercions += 1;
    return CONTRACT;
  },
};
const hostilePolicy = inspectBuyVoidPaymentKeyedSignedTransactionV1({
  raw_signed_transaction: validRaw,
  fulfillment_contract_address: hostile,
  max_token_amount_atoms: MAX_ATOMS,
});
assert.equal(hostilePolicy.ok, false);
assert.equal(coercions, 0);

function transportFor(options: {
  chain_id?: string;
  returned_hash?: string;
} = {}) {
  const calls: BuyVoidNativeChain2050JsonRpcCallV1[] = [];
  const transport: BuyVoidNativeChain2050JsonRpcTransportV1 = {
    async call(input) {
      calls.push({
        ...input,
        params: [...input.params],
      });
      if (input.method === "eth_chainId") {
        return {
          ok: true,
          request_sent: true,
          response_received: true,
          http_status: 200,
          request_id: input.request_id,
          result: options.chain_id || "0x802",
          provider_submission_id: "mock-chain",
        };
      }
      return {
        ok: true,
        request_sent: true,
        response_received: true,
        http_status: 200,
        request_id: input.request_id,
        result: options.returned_hash || validHash,
        provider_submission_id: "mock-send",
      };
    },
  };
  return { calls, transport };
}

const mock = transportFor();
const factory = createBuyVoidPaymentKeyedChain2050BroadcasterV1(
  {
    rpc_url: "http://127.0.0.1:8545/",
    fulfillment_contract_address: CONTRACT,
    max_token_amount_atoms: MAX_ATOMS,
    request_timeout_ms: 5_000,
    max_response_bytes: 65_536,
  },
  mock.transport,
);
if (factory.ok === false) throw new Error(factory.reason);
assert.equal(factory.marker, VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_BROADCASTER_V1);
assert.equal(factory.chain_id, "2050");
assert.equal(factory.fulfillment_contract_address, CONTRACT);
assert.equal(factory.max_token_amount_atoms, MAX_ATOMS.toString());
assert.equal(factory.factory_rpc_probe_performed, false);
assert.equal(factory.transaction_broadcast_performed_by_factory, false);
assert.equal(factory.money_movement_performed_by_factory, false);
assert.deepEqual(mock.calls, []);

const localReject =
  await factory.broadcaster.broadcast_signed_transaction("0xdeadbeef");
assert.equal(localReject.accepted, false);
assert.equal(localReject.submission_may_have_occurred, false);
assert.deepEqual(mock.calls, []);

const broadcast = await factory.broadcaster.broadcast_signed_transaction(validRaw);
assert.equal(broadcast.accepted, true);
assert.equal(broadcast.transaction_hash, validHash);
assert.deepEqual(
  mock.calls.map((entry) => entry.method),
  ["eth_chainId", "eth_chainId", "eth_sendRawTransaction"],
);
assert.equal(mock.calls[2].params[0], validRaw);

const wrongChainMock = transportFor({ chain_id: "0x1" });
const wrongChainFactory = createBuyVoidPaymentKeyedChain2050BroadcasterV1(
  {
    rpc_url: "http://127.0.0.1:8545/",
    fulfillment_contract_address: CONTRACT,
    max_token_amount_atoms: MAX_ATOMS,
  },
  wrongChainMock.transport,
);
if (wrongChainFactory.ok === false) throw new Error(wrongChainFactory.reason);
const wrongChainBroadcast =
  await wrongChainFactory.broadcaster.broadcast_signed_transaction(validRaw);
assert.equal(wrongChainBroadcast.accepted, false);
assert.equal(wrongChainBroadcast.submission_may_have_occurred, false);
assert.deepEqual(
  wrongChainMock.calls.map((entry) => entry.method),
  ["eth_chainId"],
);

const invalidFactory = createBuyVoidPaymentKeyedChain2050BroadcasterV1({
  rpc_url: "https://example.com/",
  fulfillment_contract_address: CONTRACT,
  max_token_amount_atoms: MAX_ATOMS,
});
assert.equal(invalidFactory.ok, false);
if (invalidFactory.ok) throw new Error("invalid_factory_unexpected_ready");
assert.equal(
  invalidFactory.reason,
  "payment_keyed_chain2050_broadcaster_policy_invalid",
);

assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_BROADCASTER_AUTHORITY_V1
    .exact_fulfill_calldata_required,
  true,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_BROADCASTER_AUTHORITY_V1
    .legacy_void_token_transfer_authority,
  false,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_BROADCASTER_AUTHORITY_V1
    .factory_rpc_probe,
  false,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_BROADCASTER_AUTHORITY_V1
    .transaction_signing,
  false,
);

console.log("VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_BROADCASTER_V1_PROOF_GREEN");
console.log("fulfillment_contract_only=true");
console.log("exact_fulfill_calldata_required=true");
console.log("legacy_void_token_transfer_authority=false");
console.log("nonzero_payment_delivery_id_required=true");
console.log("positive_bounded_amount_required=true");
console.log("invalid_signed_transaction_rejected_before_rpc=true");
console.log("factory_rpc_probe=false");
console.log("live_chain_identity_probed_before_send=true");
console.log("per_broadcast_chain_identity_probe=true");
console.log("transaction_signing=false");
