#!/usr/bin/env node
import assert from "node:assert/strict";
import { Interface } from "ethers";

import {
  buildBuyVoidPaymentKeyedFulfillmentCallV1,
} from "../src/economic/buy_void_payment_keyed_fulfillment_call_v1.js";
import {
  VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
  type BuyVoidExecutionAttemptStateV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";
import {
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
} from "../src/economic/buy_void_source_finality_execution_preflight_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_RECEIPT_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_RECEIPT_V1,
  runBuyVoidPaymentKeyedFulfillmentReceiptV1,
  type BuyVoidPaymentKeyedFulfillmentReceiptPolicyV1,
  type BuyVoidPaymentKeyedFulfillmentReceiptRpcCallV1,
} from "../src/economic/buy_void_payment_keyed_fulfillment_receipt_v1.js";

const IDENTITY = "voidpay1:base:0x" + "a".repeat(64) + ":7";
const ATTEMPT_ID = "1".repeat(64);
const LEGACY_KEY = "2".repeat(64);
const CANONICAL_KEY =
  "a06bb682bc6225c6697d0a37a51fc1323dc657eac74a51506ddb5d7daed82c85";
const PAYMENT_ID = "0x" + CANONICAL_KEY;
const DELIVERY = "0x" + "4".repeat(40);
const CONTRACT = "0x" + "5".repeat(40);
const WALLET = "0x" + "6".repeat(40);
const TOKEN = "0x" + "7".repeat(40);
const TX_HASH = "0x" + "b".repeat(64);
const BLOCK_HASH = "0x" + "c".repeat(64);
const ALT_BLOCK_HASH = "0x" + "d".repeat(64);
const AMOUNT_ATOMS = 2_000_000_000_000_000_000n;
const BLOCK_NUMBER = 100n;

const fulfilledEvents = new Interface([
  "event Fulfilled(bytes32 indexed paymentDeliveryId,address indexed recipient,uint256 amountAtoms,uint256 fulfilledAtBlock)",
]);
const transferEvents = new Interface([
  "event Transfer(address indexed from,address indexed to,uint256 value)",
]);

function attempt(): BuyVoidExecutionAttemptStateV1 {
  return {
    reservation: {
      schema: "void_buy_void_execution_attempt_reservation_v1",
      marker: VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
      attempt_id: ATTEMPT_ID,
      attempt_number: 1,
      reserved_at_ms: 1,
      payment_key_sha256: LEGACY_KEY,
      request_key_sha256: "8".repeat(64),
      canonical_payment_identity: IDENTITY,
      request_id: "buyvoid-payment-keyed-receipt-v1",
      instruction_id: "9".repeat(64),
      intent_fingerprint: "f".repeat(64),
      max_attempts_per_payment: 1,
      unsigned_instruction: {
        schema: "void_buy_void_unsigned_fulfillment_instruction_v1",
        marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
        instruction_id: "9".repeat(64),
        request_id: "buyvoid-payment-keyed-receipt-v1",
        canonical_payment_identity: IDENTITY,
        source_chain: "base",
        payment_transaction_hash: "0x" + "a".repeat(64),
        payment_log_index: "7",
        delivery_address: DELIVERY,
        payment_usdc_units: "1000000",
        void_amount_units: "2000000",
        confirmed_block_number: "123",
        confirmation_count: "12",
        signing_authorized: false,
        transaction_broadcast_authorized: false,
        automatic_execution_authorized: false,
      },
      signing_authorized_by_this_module: false,
      transaction_broadcast_authorized_by_this_module: false,
      money_movement_authorized_by_this_module: false,
    },
    prepared: null,
    broadcast: null,
    failure: null,
    postbroadcast_failure: null,
    confirmation: null,
    status: "reserved",
  };
}

function fulfillmentCall() {
  const decision = buildBuyVoidPaymentKeyedFulfillmentCallV1({
    attempt: attempt(),
    source_finality: {
      ok: true,
      marker: VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
      version: 1,
      status: "ready",
      attempt_id: ATTEMPT_ID,
      source_chain: "base",
      canonical_payment_identity: IDENTITY,
      payment_key_sha256: CANONICAL_KEY,
      process_source_identity_verified: true,
      reviewed_source_files_verified: true,
      authenticated_transport_identity_verified: true,
      total_operation_deadline_verified: true,
      source_generation_verified: true,
      deployed_artifact_generation_verified: true,
      ancestry_verified: true,
      provider_quorum_verified: true,
      production_source_finality_authority_ready: true,
      wallet_access_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    },
    policy: {
      chain_id: "2050",
      fulfillment_contract_address: CONTRACT,
      max_void_amount_units: "10000000000000",
    },
  });
  if (decision.ok === false) throw new Error(decision.reason);
  return decision;
}

const call = fulfillmentCall();

const policy: BuyVoidPaymentKeyedFulfillmentReceiptPolicyV1 = {
  enabled: true,
  chain_id: "2050",
  rpc_url: "http://127.0.0.1:8545/",
  fulfillment_wallet_address: WALLET,
  fulfillment_contract_address: CONTRACT,
  void_token_address: TOKEN,
  min_confirmations: "3",
  request_timeout_ms: 5_000,
  max_response_bytes: 65_536,
};

function eventLog(
  iface: Interface,
  eventName: string,
  values: readonly unknown[],
  address: string,
  logIndex: number,
) {
  const encoded = iface.encodeEventLog(eventName, values);
  return {
    address,
    topics: encoded.topics,
    data: encoded.data,
    transactionHash: TX_HASH,
    logIndex: "0x" + logIndex.toString(16),
  };
}

function receipt(options: {
  blockHash?: string;
  blockNumber?: bigint;
  status?: string;
  from?: string;
  to?: string;
  paymentId?: string;
  recipient?: string;
  amountAtoms?: bigint;
  fulfilledAtBlock?: bigint;
  transferFrom?: string;
  transferTo?: string;
  transferValue?: bigint;
  transferLogIndex?: number;
  fulfillmentLogIndex?: number;
  includeTransfer?: boolean;
  includeFulfilled?: boolean;
} = {}) {
  const blockNumber = options.blockNumber ?? BLOCK_NUMBER;
  const logs: unknown[] = [];
  if (options.includeTransfer !== false) {
    logs.push(
      eventLog(
        transferEvents,
        "Transfer",
        [
          options.transferFrom ?? CONTRACT,
          options.transferTo ?? DELIVERY,
          options.transferValue ?? AMOUNT_ATOMS,
        ],
        TOKEN,
        options.transferLogIndex ?? 2,
      ),
    );
  }
  if (options.includeFulfilled !== false) {
    logs.push(
      eventLog(
        fulfilledEvents,
        "Fulfilled",
        [
          options.paymentId ?? PAYMENT_ID,
          options.recipient ?? DELIVERY,
          options.amountAtoms ?? AMOUNT_ATOMS,
          options.fulfilledAtBlock ?? blockNumber,
        ],
        CONTRACT,
        options.fulfillmentLogIndex ?? 3,
      ),
    );
  }
  return {
    transactionHash: TX_HASH,
    from: options.from ?? WALLET,
    to: options.to ?? CONTRACT,
    blockNumber: "0x" + blockNumber.toString(16),
    blockHash: options.blockHash ?? BLOCK_HASH,
    status: options.status ?? "0x1",
    logs,
  };
}

type TransportOptions = {
  chainId?: unknown;
  head?: unknown;
  firstReceipt?: unknown;
  secondReceipt?: unknown;
};

function transportFor(
  calls: BuyVoidPaymentKeyedFulfillmentReceiptRpcCallV1[],
  options: TransportOptions = {},
) {
  let receiptReads = 0;
  return async (
    rpcCall: Readonly<BuyVoidPaymentKeyedFulfillmentReceiptRpcCallV1>,
  ) => {
    calls.push({
      method: rpcCall.method,
      params: structuredClone(rpcCall.params),
    });
    if (rpcCall.method === "eth_chainId") {
      return options.chainId ?? "0x802";
    }
    if (rpcCall.method === "eth_blockNumber") {
      return options.head ?? "0x66";
    }
    receiptReads += 1;
    return receiptReads === 1
      ? options.firstReceipt ?? receipt()
      : options.secondReceipt ?? options.firstReceipt ?? receipt();
  };
}

const calls: BuyVoidPaymentKeyedFulfillmentReceiptRpcCallV1[] = [];
const confirmed = await runBuyVoidPaymentKeyedFulfillmentReceiptV1({
  transaction_hash: TX_HASH,
  fulfillment_call: call,
  policy,
  transport: transportFor(calls),
});
if (confirmed.ok === false) throw new Error(confirmed.reason);

assert.equal(confirmed.marker, VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_RECEIPT_V1);
assert.equal(confirmed.version, 1);
assert.equal(confirmed.status, "confirmed");
assert.equal(confirmed.transaction_hash, TX_HASH);
assert.equal(confirmed.payment_delivery_id, PAYMENT_ID);
assert.equal(confirmed.canonical_payment_identity, IDENTITY);
assert.equal(confirmed.fulfillment_wallet_address, WALLET);
assert.equal(confirmed.fulfillment_contract_address, CONTRACT);
assert.equal(confirmed.void_token_address, TOKEN);
assert.equal(confirmed.delivery_address, DELIVERY);
assert.equal(confirmed.void_amount_units, "2000000");
assert.equal(confirmed.token_amount_atoms, AMOUNT_ATOMS.toString());
assert.equal(confirmed.transfer_event_log_index, "2");
assert.equal(confirmed.fulfillment_event_log_index, "3");
assert.equal(confirmed.receipt_block_number, "100");
assert.equal(confirmed.receipt_block_hash, BLOCK_HASH);
assert.equal(confirmed.observed_confirmation_count, "3");
assert.match(confirmed.receipt_evidence_fingerprint_sha256, /^[0-9a-f]{64}$/);
assert.deepEqual(
  confirmed.rpc_methods_used,
  [
    "eth_chainId",
    "eth_getTransactionReceipt",
    "eth_blockNumber",
    "eth_getTransactionReceipt",
  ],
);
assert.equal(confirmed.mutation_performed, false);
assert.equal(confirmed.wallet_access_performed, false);
assert.equal(confirmed.signing_performed, false);
assert.equal(confirmed.transaction_broadcast_performed, false);
assert.equal(confirmed.money_movement_performed, false);

async function expectHeld(
  name: string,
  reason: string,
  options: {
    transactionHash?: string;
    fulfillmentCall?: any;
    policy?: BuyVoidPaymentKeyedFulfillmentReceiptPolicyV1;
    transport?: TransportOptions;
  } = {},
) {
  const heldCalls: BuyVoidPaymentKeyedFulfillmentReceiptRpcCallV1[] = [];
  const decision = await runBuyVoidPaymentKeyedFulfillmentReceiptV1({
    transaction_hash: options.transactionHash ?? TX_HASH,
    fulfillment_call: options.fulfillmentCall ?? call,
    policy: options.policy ?? policy,
    transport: transportFor(heldCalls, options.transport),
  });
  if (decision.ok) throw new Error(name + "_unexpected_confirmed");
  assert.equal(decision.ok, false, name);
  assert.equal(decision.reason, reason, name);
  assert.equal(decision.signing_performed, false, name);
  assert.equal(decision.transaction_broadcast_performed, false, name);
  assert.equal(decision.money_movement_performed, false, name);
  return { decision, calls: heldCalls };
}

const wrongCall = await expectHeld(
  "wrong_call_contract",
  "payment_keyed_fulfillment_receipt_call_invalid",
  {
    fulfillmentCall: {
      ...call,
      fulfillment_contract_address: "0x" + "9".repeat(40),
    },
  },
);
assert.deepEqual(wrongCall.calls, []);

const forgedKey = await expectHeld(
  "forged_payment_key",
  "payment_keyed_fulfillment_receipt_payment_key_invalid",
  {
    fulfillmentCall: {
      ...call,
      canonical_payment_key_sha256: "e".repeat(64),
    },
  },
);
assert.deepEqual(forgedKey.calls, []);

const forgedCalldata = await expectHeld(
  "forged_calldata",
  "payment_keyed_fulfillment_receipt_call_calldata_invalid",
  {
    fulfillmentCall: {
      ...call,
      calldata:
        call.calldata.slice(0, 10) +
        (call.calldata[10] === "0" ? "1" : "0") +
        call.calldata.slice(11),
    },
  },
);
assert.deepEqual(forgedCalldata.calls, []);

const forgedAtoms = await expectHeld(
  "forged_atom_scale",
  "payment_keyed_fulfillment_receipt_call_amount_invalid",
  {
    fulfillmentCall: {
      ...call,
      token_amount_atoms: (AMOUNT_ATOMS + 1n).toString(),
    },
  },
);
assert.deepEqual(forgedAtoms.calls, []);

const firstOverflowUnits =
  ((1n << 256n) - 1n) / 1_000_000_000_000n + 1n;
const overflowAtoms = firstOverflowUnits * 1_000_000_000_000n;
const forgedUint256Overflow = await expectHeld(
  "forged_uint256_overflow",
  "payment_keyed_fulfillment_receipt_call_amount_invalid",
  {
    fulfillmentCall: {
      ...call,
      void_amount_units: firstOverflowUnits.toString(),
      token_amount_atoms: overflowAtoms.toString(),
    },
  },
);
assert.deepEqual(forgedUint256Overflow.calls, []);

const changedFingerprint =
  (call.call_fingerprint_sha256[0] === "0" ? "1" : "0") +
  call.call_fingerprint_sha256.slice(1);
const forgedFingerprint = await expectHeld(
  "forged_call_fingerprint",
  "payment_keyed_fulfillment_receipt_call_fingerprint_invalid",
  {
    fulfillmentCall: {
      ...call,
      call_fingerprint_sha256: changedFingerprint,
    },
  },
);
assert.deepEqual(forgedFingerprint.calls, []);

await expectHeld(
  "wrong_chain",
  "payment_keyed_fulfillment_receipt_chain_id_mismatch",
  { transport: { chainId: "0x1" } },
);

await expectHeld(
  "wrong_payment_id",
  "payment_keyed_fulfillment_receipt_binding_invalid",
  {
    transport: {
      firstReceipt: receipt({ paymentId: "0x" + "e".repeat(64) }),
    },
  },
);

await expectHeld(
  "missing_transfer",
  "payment_keyed_fulfillment_receipt_binding_invalid",
  {
    transport: {
      firstReceipt: receipt({ includeTransfer: false }),
    },
  },
);

await expectHeld(
  "transfer_after_fulfilled",
  "payment_keyed_fulfillment_receipt_binding_invalid",
  {
    transport: {
      firstReceipt: receipt({
        transferLogIndex: 4,
        fulfillmentLogIndex: 3,
      }),
    },
  },
);

await expectHeld(
  "receipt_reverted",
  "payment_keyed_fulfillment_receipt_binding_invalid",
  {
    transport: {
      firstReceipt: receipt({ status: "0x0" }),
    },
  },
);

await expectHeld(
  "insufficient_confirmations",
  "payment_keyed_fulfillment_receipt_confirmations_insufficient",
  {
    transport: {
      head: "0x65",
    },
  },
);

await expectHeld(
  "reorg",
  "payment_keyed_fulfillment_receipt_changed_during_confirmation_window",
  {
    transport: {
      firstReceipt: receipt(),
      secondReceipt: receipt({ blockHash: ALT_BLOCK_HASH }),
    },
  },
);

let coercions = 0;
const hostile = {
  [Symbol.toPrimitive]() {
    coercions += 1;
    return CONTRACT;
  },
};
const hostileResult = await runBuyVoidPaymentKeyedFulfillmentReceiptV1({
  transaction_hash: TX_HASH,
  fulfillment_call: call,
  policy: {
    ...policy,
    fulfillment_contract_address: hostile as any,
  },
  transport: transportFor([]),
});
assert.equal(hostileResult.ok, false);
assert.equal(coercions, 0);

assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_RECEIPT_AUTHORITY_V1
    .exact_fulfilled_event_required,
  true,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_RECEIPT_AUTHORITY_V1
    .exact_void_token_transfer_required,
  true,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_RECEIPT_AUTHORITY_V1
    .receipt_revalidation_required,
  true,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_RECEIPT_AUTHORITY_V1
    .money_movement,
  false,
);

console.log("VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_RECEIPT_V1_PROOF_GREEN");
console.log("fulfillment_contract_receipt_target_bound=true");
console.log("canonical_payment_delivery_id_bound=true");
console.log("exact_fulfilled_event_required=true");
console.log("exact_void_token_transfer_required=true");
console.log("transfer_precedes_fulfilled_event=true");
console.log("fulfilled_block_number_matches_receipt=true");
console.log("minimum_confirmations_required=true");
console.log("receipt_revalidation_required=true");
console.log("receipt_block_hash_stability_required=true");
console.log("authority_string_coercion_executed=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("money_movement=false");
