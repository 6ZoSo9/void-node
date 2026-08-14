import assert from "node:assert/strict";
import {
  Interface,
  Wallet,
} from "ethers";
import {
  VOID_BUY_VOID_ERC20_DELIVERY_RECEIPT_RECONCILER_AUTHORITY_V1,
  runBuyVoidErc20DeliveryReceiptReconcilerV1,
  type BuyVoidErc20DeliveryReceiptRpcTransportV1,
} from "../src/economic/buy_void_erc20_delivery_receipt_reconciler_v1.js";

const wallet = Wallet.createRandom().address.toLowerCase();
const recipient = Wallet.createRandom().address.toLowerCase();
const token = Wallet.createRandom().address.toLowerCase();
const other = Wallet.createRandom().address.toLowerCase();
const txHash = `0x${"1".repeat(64)}`;
const blockHash = `0x${"2".repeat(64)}`;
const amountUnits = 2_500_000_000n;
const amountAtoms = amountUnits * 1_000_000_000_000n;

const transferInterface = new Interface([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);
const transferEvent = transferInterface.getEvent("Transfer");
if (!transferEvent) throw new Error("Transfer event unavailable");

function attempt() {
  return {
    reservation: {
      schema: "void_buy_void_execution_attempt_reservation_v1",
      marker: "VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1",
      attempt_id: "a".repeat(64),
      attempt_number: 1,
      reserved_at_ms: 1,
      payment_key_sha256: "b".repeat(64),
      request_key_sha256: "c".repeat(64),
      canonical_payment_identity: "voidpay1:ethereum:0x" + "d".repeat(64) + ":0",
      request_id: "request-erc20-receipt-v1",
      instruction_id: "e".repeat(64),
      intent_fingerprint: "f".repeat(64),
      max_attempts_per_payment: 1,
      unsigned_instruction: {
        schema: "void_buy_void_unsigned_fulfillment_instruction_v1",
        marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
        instruction_id: "e".repeat(64),
        request_id: "request-erc20-receipt-v1",
        canonical_payment_identity:
          "voidpay1:ethereum:0x" + "d".repeat(64) + ":0",
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
      },
      signing_authorized_by_this_module: false,
      transaction_broadcast_authorized_by_this_module: false,
      money_movement_authorized_by_this_module: false,
    },
    prepared: {
      schema: "void_buy_void_execution_prepared_transaction_v1",
      marker: "VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1",
      attempt_id: "a".repeat(64),
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
      attempt_id: "a".repeat(64),
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

function intent() {
  return {
    schema: "void_buy_void_fulfillment_journal_intent_v1",
    marker: "VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1",
    intent_id: "2".repeat(64),
    created_at_ms: 1,
    claim: {
      ...attempt().reservation,
      status: "claimed",
      unsigned_instruction: attempt().reservation.unsigned_instruction,
    },
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    money_movement_authorized: false,
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
) {
  const calls: string[] = [];
  const transport: BuyVoidErc20DeliveryReceiptRpcTransportV1 =
    async (call) => {
      calls.push(call.method);
      if (call.method === "eth_chainId") return chain;
      if (call.method === "eth_getTransactionReceipt") {
        assert.deepEqual(call.params, [txHash]);
        return receiptValue;
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
]);
assert.equal(confirmed.mutation_performed, false);
assert.equal(confirmed.signing_performed, false);
assert.equal(confirmed.transaction_broadcast_performed, false);
assert.equal(confirmed.money_movement_performed, false);

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
console.log("exact_token_contract=true");
console.log("exact_from_wallet=true");
console.log("exact_to_delivery_address=true");
console.log("exact_token_amount_atoms=true");
console.log("min_confirmations_enforced=true");
console.log("mutation_performed=false");
console.log("signing_performed=false");
console.log("transaction_broadcast_performed=false");
console.log("money_movement_performed=false");
