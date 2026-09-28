#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  Interface,
  Wallet,
} from "ethers";

import {
  VOID_PARTICIPANT_POSTPURCHASE_FINALITY_AUTHORITY_V1,
  VOID_PARTICIPANT_POSTPURCHASE_FINALITY_V1,
  verifyVoidParticipantPostpurchaseFinalityV1,
} from "../tools/void-participant-postpurchase-finality-v1.mjs";

const token =
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const recipient =
  "0x2222222222222222222222222222222222222222";
const other =
  "0x3333333333333333333333333333333333333333";
const iface = new Interface([
  "event Transfer(address indexed from,address indexed to,uint256 value)",
]);

const participantWallet = Wallet.createRandom();
const participant = participantWallet.address.toLowerCase();
const transactionHash = "0x" + "a".repeat(64);
const blockHash = "0x" + "b".repeat(64);
const amount = 25_000000000000000000n;

function submission(overrides = {}) {
  return {
    marker: "VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_V1",
    version: 1,
    status: "submission_accepted_finality_required",
    chain_id: "2050",
    participant_address: participant,
    void_token: token,
    transfer_recipient: recipient,
    transfer_amount_atoms: amount.toString(),
    transaction_hash: transactionHash,
    submission_may_have_occurred: true,
    automatic_retry: false,
    delivery_reconciliation_confirmed: true,
    participant_signature_recovered: true,
    delivery_recipient_equals_signer: true,
    canonical_voidtoken_transfer_verified: true,
    zero_native_value_verified: true,
    zero_gas_price_policy_bound: true,
    transaction_submission_performed: true,
    transaction_broadcast_performed: true,
    receipt_finality_verified: false,
    participant_postpurchase_voidtoken_control_ready: false,
    ...overrides,
  };
}

function transferLog({
  from = participant,
  to = recipient,
  value = amount,
  index = "0x0",
  hash = transactionHash,
  address = token,
} = {}) {
  const encoded = iface.encodeEventLog(
    iface.getEvent("Transfer"),
    [from, to, value],
  );
  return {
    address,
    topics: encoded.topics,
    data: encoded.data,
    logIndex: index,
    transactionHash: hash,
  };
}

function receipt(overrides = {}) {
  return {
    transactionHash,
    from: participant,
    to: token,
    status: "0x1",
    blockNumber: "0x64",
    blockHash,
    logs: [transferLog()],
    ...overrides,
  };
}

function transportFor({
  chain = "0x802",
  head = "0x6f",
  firstReceipt = receipt(),
  secondReceipt = firstReceipt,
} = {}) {
  const calls = [];
  let receiptReads = 0;
  const transport = async ({ method, params }) => {
    calls.push({ method, params });
    if (method === "eth_chainId") return chain;
    if (method === "eth_blockNumber") return head;
    if (method === "eth_getTransactionReceipt") {
      assert.deepEqual(params, [transactionHash]);
      return receiptReads++ === 0 ? firstReceipt : secondReceipt;
    }
    throw new Error("unexpected_method");
  };
  return { calls, transport };
}

async function reject(options, code) {
  await assert.rejects(
    () =>
      verifyVoidParticipantPostpurchaseFinalityV1({
        submission: options.submission ?? submission(),
        min_confirmations: options.minConfirmations ?? "3",
        transport: options.transport,
      }),
    (error) => error instanceof Error && error.message === code,
    code,
  );
}

const happyTransport = transportFor();
const first = await verifyVoidParticipantPostpurchaseFinalityV1({
  submission: submission(),
  min_confirmations: "3",
  transport: happyTransport.transport,
});

assert.equal(first.marker, VOID_PARTICIPANT_POSTPURCHASE_FINALITY_V1);
assert.equal(first.schema, "void.participant-postpurchase-finality-evidence.v1");
assert.equal(first.chain_id, 2050);
assert.equal(first.execution_epoch, 2);
assert.equal(first.transaction_hash, transactionHash);
assert.equal(first.participant_address, participant);
assert.equal(first.void_token, token);
assert.equal(first.transfer_recipient, recipient);
assert.equal(first.transfer_amount_atoms, amount.toString());
assert.equal(first.transfer_log_index, "0");
assert.equal(first.receipt_block_number, "100");
assert.equal(first.receipt_block_hash, blockHash);
assert.equal(first.observed_confirmation_count, "12");
assert.equal(first.required_confirmation_count, "3");
assert.match(first.evidence_id, /^sha256:[0-9a-f]{64}$/);
assert.deepEqual(
  first.rpc_methods_used,
  [
    "eth_chainId",
    "eth_getTransactionReceipt",
    "eth_blockNumber",
    "eth_getTransactionReceipt",
  ],
);
assert.equal(first.exact_submission_receipt_binding_verified, true);
assert.equal(first.exact_voidtoken_transfer_finality_verified, true);
assert.equal(first.stable_receipt_revalidation_verified, true);
assert.equal(
  first.participant_postpurchase_voidtoken_control_finality_source_ready,
  true,
);
assert.equal(first.runtime_or_launch_evidence, false);
assert.equal(first.runtime_route_active, false);
assert.equal(first.public_submission_open, false);
assert.equal(first.transaction_submission_performed, false);
assert.equal(first.transaction_broadcast_performed, false);
assert.equal(first.authoritative_chain2050_write_performed, false);
assert.equal(first.token_movement_performed_by_this_verifier, false);
assert.equal(first.funds_movement_performed_by_this_verifier, false);

const repeatTransport = transportFor();
const repeated = await verifyVoidParticipantPostpurchaseFinalityV1({
  submission: submission(),
  min_confirmations: "3",
  transport: repeatTransport.transport,
});
assert.equal(repeated.evidence_id, first.evidence_id);

{
  const t = transportFor({ chain: "0x1" });
  await reject(
    { transport: t.transport },
    "PARTICIPANT_POSTPURCHASE_FINALITY_CHAIN_ID_MISMATCH",
  );
}

{
  const t = transportFor({ firstReceipt: null, secondReceipt: null });
  await reject(
    { transport: t.transport },
    "PARTICIPANT_POSTPURCHASE_FINALITY_RECEIPT_NOT_FOUND",
  );
}

{
  const t = transportFor({
    firstReceipt: receipt({ status: "0x0" }),
  });
  await reject(
    { transport: t.transport },
    "PARTICIPANT_POSTPURCHASE_FINALITY_TRANSACTION_NOT_SUCCESS",
  );
}

{
  const t = transportFor({
    firstReceipt: receipt({
      transactionHash: "0x" + "c".repeat(64),
    }),
  });
  await reject(
    { transport: t.transport },
    "PARTICIPANT_POSTPURCHASE_FINALITY_TRANSACTION_HASH_MISMATCH",
  );
}

{
  const t = transportFor({
    firstReceipt: receipt({ from: other }),
  });
  await reject(
    { transport: t.transport },
    "PARTICIPANT_POSTPURCHASE_FINALITY_RECEIPT_FROM_MISMATCH",
  );
}

{
  const t = transportFor({
    firstReceipt: receipt({ to: other }),
  });
  await reject(
    { transport: t.transport },
    "PARTICIPANT_POSTPURCHASE_FINALITY_RECEIPT_TOKEN_MISMATCH",
  );
}

{
  const t = transportFor({
    firstReceipt: receipt({ logs: [] }),
  });
  await reject(
    { transport: t.transport },
    "PARTICIPANT_POSTPURCHASE_FINALITY_EXACT_ONE_TRANSFER_REQUIRED",
  );
}

{
  const t = transportFor({
    firstReceipt: receipt({
      logs: [
        transferLog(),
        transferLog({ index: "0x1" }),
      ],
    }),
  });
  await reject(
    { transport: t.transport },
    "PARTICIPANT_POSTPURCHASE_FINALITY_EXACT_ONE_TRANSFER_REQUIRED",
  );
}

{
  const t = transportFor({
    firstReceipt: receipt({
      logs: [transferLog({ from: other })],
    }),
  });
  await reject(
    { transport: t.transport },
    "PARTICIPANT_POSTPURCHASE_FINALITY_TRANSFER_FROM_MISMATCH",
  );
}

{
  const t = transportFor({
    firstReceipt: receipt({
      logs: [transferLog({ to: other })],
    }),
  });
  await reject(
    { transport: t.transport },
    "PARTICIPANT_POSTPURCHASE_FINALITY_TRANSFER_TO_MISMATCH",
  );
}

{
  const t = transportFor({
    firstReceipt: receipt({
      logs: [transferLog({ value: amount - 1n })],
    }),
  });
  await reject(
    { transport: t.transport },
    "PARTICIPANT_POSTPURCHASE_FINALITY_TRANSFER_AMOUNT_MISMATCH",
  );
}

{
  const t = transportFor({ head: "0x65" });
  await reject(
    { transport: t.transport, minConfirmations: "3" },
    "PARTICIPANT_POSTPURCHASE_FINALITY_CONFIRMATIONS_INSUFFICIENT",
  );
}

{
  const t = transportFor({ head: "0x63" });
  await reject(
    { transport: t.transport },
    "PARTICIPANT_POSTPURCHASE_FINALITY_HEAD_BEFORE_RECEIPT",
  );
}

{
  const changed = receipt({
    blockHash: "0x" + "d".repeat(64),
  });
  const t = transportFor({
    firstReceipt: receipt(),
    secondReceipt: changed,
  });
  await reject(
    { transport: t.transport },
    "PARTICIPANT_POSTPURCHASE_FINALITY_RECEIPT_CHANGED",
  );
}

{
  const changed = receipt({
    logs: [transferLog({ index: "0x1" })],
  });
  const t = transportFor({
    firstReceipt: receipt(),
    secondReceipt: changed,
  });
  await reject(
    { transport: t.transport },
    "PARTICIPANT_POSTPURCHASE_FINALITY_RECEIPT_CHANGED",
  );
}

{
  const t = transportFor({
    firstReceipt: receipt(),
    secondReceipt: null,
  });
  await reject(
    { transport: t.transport },
    "PARTICIPANT_POSTPURCHASE_FINALITY_RECEIPT_REVALIDATION_MISSING",
  );
}

{
  const t = transportFor({
    firstReceipt: receipt({
      logs: new Array(1025).fill(transferLog()),
    }),
  });
  await reject(
    { transport: t.transport },
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_LOG_SET",
  );
}

{
  const bad = submission({
    receipt_finality_verified: true,
  });
  const t = transportFor();
  await reject(
    { submission: bad, transport: t.transport },
    "PARTICIPANT_POSTPURCHASE_SUBMISSION_NOT_FINALITY_ELIGIBLE",
  );
  assert.equal(t.calls.length, 0);
}

{
  let getterCalled = false;
  const bad = submission();
  Object.defineProperty(bad, "transaction_hash", {
    enumerable: true,
    get() {
      getterCalled = true;
      return transactionHash;
    },
  });
  const t = transportFor();
  await reject(
    { submission: bad, transport: t.transport },
    "INVALID_PARTICIPANT_POSTPURCHASE_SUBMISSION_SHAPE",
  );
  assert.equal(getterCalled, false);
  assert.equal(t.calls.length, 0);
}

{
  let getterCalled = false;
  const badReceipt = receipt();
  Object.defineProperty(badReceipt, "status", {
    enumerable: true,
    get() {
      getterCalled = true;
      return "0x1";
    },
  });
  const t = transportFor({
    firstReceipt: badReceipt,
  });
  await reject(
    { transport: t.transport },
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_RECEIPT_SHAPE",
  );
  assert.equal(getterCalled, false);
}

{
  await assert.rejects(
    () =>
      verifyVoidParticipantPostpurchaseFinalityV1({
        submission: submission(),
        min_confirmations: "0",
        transport: transportFor().transport,
      }),
    (error) =>
      error instanceof Error &&
      error.message ===
        "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_MIN_CONFIRMATIONS",
  );
}

{
  await assert.rejects(
    () =>
      verifyVoidParticipantPostpurchaseFinalityV1({
        submission: submission(),
        min_confirmations: "1001",
        transport: transportFor().transport,
      }),
    (error) =>
      error instanceof Error &&
      error.message ===
        "PARTICIPANT_POSTPURCHASE_FINALITY_MIN_CONFIRMATIONS_TOO_LARGE",
  );
}

{
  await assert.rejects(
    () =>
      verifyVoidParticipantPostpurchaseFinalityV1({
        submission: submission(),
        min_confirmations: "3",
        transport: null,
      }),
    (error) =>
      error instanceof Error &&
      error.message ===
        "PARTICIPANT_POSTPURCHASE_FINALITY_INJECTED_TRANSPORT_REQUIRED",
  );
}

for (const [key, value] of Object.entries(
  VOID_PARTICIPANT_POSTPURCHASE_FINALITY_AUTHORITY_V1,
)) {
  if (
    [
      "source_only",
      "explicit_input_only",
      "injected_read_transport_required",
      "read_only_rpc",
    ].includes(key)
  ) {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const source = fs.readFileSync(
  "tools/void-participant-postpurchase-finality-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "http.request",
  "https.request",
  "JsonRpcProvider(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  "appendFileSync",
  "writeFileSync",
  "renameSync",
  "systemctl",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}
assert.match(source, /eth_getTransactionReceipt/);
assert.match(source, /eth_blockNumber/);
assert.match(source, /PARTICIPANT_POSTPURCHASE_FINALITY_RECEIPT_CHANGED/);
assert.match(source, /participant_postpurchase_voidtoken_control_finality_source_ready: true/);

console.log("VOID_PARTICIPANT_POSTPURCHASE_FINALITY_V1_GREEN");
console.log("participant_postpurchase_voidtoken_control_finality_source_ready=true");
console.log("exact_submission_receipt_binding_verified=true");
console.log("exact_voidtoken_transfer_finality_verified=true");
console.log("stable_receipt_revalidation_verified=true");
console.log("injected_read_transport_required=true");
console.log("read_only_rpc=true");
console.log("built_in_network_transport=false");
console.log("runtime_or_launch_evidence=false");
console.log("runtime_route_active=false");
console.log("public_submission_open=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("authoritative_chain2050_write=false");
console.log("funds_movement=false");
