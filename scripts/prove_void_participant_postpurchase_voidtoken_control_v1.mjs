#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  Interface,
  Wallet,
} from "ethers";

import {
  VOID_PARTICIPANT_POSTPURCHASE_VOIDTOKEN_CONTROL_AUTHORITY_V1,
  VOID_PARTICIPANT_POSTPURCHASE_VOIDTOKEN_CONTROL_POLICY_V1,
  VOID_PARTICIPANT_POSTPURCHASE_VOIDTOKEN_CONTROL_V1,
  verifyVoidParticipantPostpurchaseVoidTokenControlV1,
} from "../tools/void-participant-postpurchase-voidtoken-control-v1.mjs";

const token = "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const otherToken = "0x3333333333333333333333333333333333333333";
const recipient = "0x2222222222222222222222222222222222222222";
const iface = new Interface([
  "function transfer(address to,uint256 amount) returns (bool)",
  "function approve(address spender,uint256 amount) returns (bool)",
]);

const participantWallet = Wallet.createRandom();
const otherWallet = Wallet.createRandom();
const participant = participantWallet.address.toLowerCase();

function delivery(overrides = {}) {
  return {
    marker: "VOID_BUY_VOID_ERC20_DELIVERY_RECEIPT_RECONCILER_V1",
    delivery_confirmed: true,
    chain_id: "2050",
    void_token_address: token,
    delivery_address: participant,
    token_amount_atoms: "100000000000000000000",
    transaction_hash: "0x" + "a".repeat(64),
    receipt_evidence_fingerprint_sha256: "b".repeat(64),
    observed_confirmation_count: "12",
    ...overrides,
  };
}

async function signedTransfer({
  wallet = participantWallet,
  chainId = 2050,
  nonce = 7,
  to = token,
  recipientAddress = recipient,
  amount = 25_000000000000000000n,
  value = 0n,
  gasLimit = 100_000n,
  maxFeePerGas = 0n,
  maxPriorityFeePerGas = 0n,
  data = null,
} = {}) {
  return await wallet.signTransaction({
    type: 2,
    chainId,
    nonce,
    to,
    value,
    gasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
    data: data ??
      iface.encodeFunctionData("transfer", [recipientAddress, amount]),
  });
}

function expectHold(value, reason) {
  assert.throws(
    () => verifyVoidParticipantPostpurchaseVoidTokenControlV1(value),
    (error) => error instanceof Error && error.message === reason,
    reason,
  );
}

const raw = await signedTransfer();
const verified = verifyVoidParticipantPostpurchaseVoidTokenControlV1({
  delivery: delivery(),
  raw_signed_transaction: raw,
});

assert.equal(
  verified.marker,
  VOID_PARTICIPANT_POSTPURCHASE_VOIDTOKEN_CONTROL_V1,
);
assert.equal(verified.chain_id, 2050);
assert.equal(verified.execution_epoch, 2);
assert.equal(verified.void_token, token);
assert.equal(verified.delivery_address, participant);
assert.equal(
  verified.delivered_token_amount_atoms,
  "100000000000000000000",
);
assert.equal(verified.delivery_transaction_hash, "0x" + "a".repeat(64));
assert.equal(
  verified.delivery_receipt_evidence_fingerprint_sha256,
  "b".repeat(64),
);
assert.equal(verified.observed_delivery_confirmation_count, "12");
assert.match(verified.control_transaction_hash, /^0x[0-9a-f]{64}$/);
assert.equal(verified.control_signer_address, participant);
assert.equal(verified.control_nonce, "7");
assert.equal(verified.control_transaction_type, 2);
assert.equal(verified.control_target, token);
assert.equal(verified.control_transfer_recipient, recipient);
assert.equal(
  verified.control_transfer_amount_atoms,
  "25000000000000000000",
);
assert.equal(verified.participant_eoa_signature_recovered, true);
assert.equal(verified.delivery_recipient_equals_control_signer, true);
assert.equal(verified.canonical_voidtoken_transfer_calldata_verified, true);
assert.equal(verified.zero_native_value_verified, true);
assert.equal(verified.zero_gas_price_policy_bound, true);
assert.equal(verified.delivered_amount_upper_bound_enforced, true);
assert.equal(
  verified.participant_postpurchase_voidtoken_control_source_ready,
  true,
);
assert.equal(verified.delivery_provenance_verified, false);
assert.equal(verified.participant_balance_verified_live, false);
assert.equal(verified.transaction_submission_path_ready, false);
assert.equal(verified.runtime_route_active, false);
assert.equal(verified.public_submission_open, false);
assert.equal(verified.transaction_submitted, false);
assert.equal(verified.transaction_broadcast, false);
assert.equal(verified.authoritative_chain2050_write, false);
assert.equal(verified.token_movement_performed_by_this_verifier, false);
assert.equal(verified.market_activation_authority, false);
assert.equal(verified.public_presale_activation_authority, false);
assert.equal(verified.funds_movement_authority, false);
assert.equal(verified.raw_signed_transaction_persisted, false);

assert.deepEqual(
  VOID_PARTICIPANT_POSTPURCHASE_VOIDTOKEN_CONTROL_POLICY_V1,
  {
    chain_id: "2050",
    execution_epoch: 2,
    void_token: token,
    transaction_type: 2,
    native_value_wei_required: "0",
    max_fee_per_gas_wei_required: "0",
    max_priority_fee_per_gas_wei_required: "0",
    max_gas_limit: "3000000",
    transfer_selector: "0xa9059cbb",
    participant_raw_signature_required: true,
    delivery_recipient_signer_binding_required: true,
    raw_public_rpc_allowed: false,
  },
);

{
  const bad = await signedTransfer({ wallet: otherWallet });
  expectHold(
    {
      delivery: delivery(),
      raw_signed_transaction: bad,
    },
    "PARTICIPANT_POSTPURCHASE_SIGNER_NOT_DELIVERY_RECIPIENT",
  );
}

{
  const bad = await signedTransfer({ chainId: 1 });
  expectHold(
    {
      delivery: delivery(),
      raw_signed_transaction: bad,
    },
    "PARTICIPANT_POSTPURCHASE_CHAIN_ID_MISMATCH",
  );
}

{
  const bad = await signedTransfer({ to: otherToken });
  expectHold(
    {
      delivery: delivery(),
      raw_signed_transaction: bad,
    },
    "PARTICIPANT_POSTPURCHASE_TRANSACTION_TARGET_MISMATCH",
  );
}

{
  const bad = await signedTransfer({ value: 1n });
  expectHold(
    {
      delivery: delivery(),
      raw_signed_transaction: bad,
    },
    "PARTICIPANT_POSTPURCHASE_NATIVE_VALUE_FORBIDDEN",
  );
}

{
  const bad = await signedTransfer({ maxFeePerGas: 1n });
  expectHold(
    {
      delivery: delivery(),
      raw_signed_transaction: bad,
    },
    "PARTICIPANT_POSTPURCHASE_MAX_FEE_PER_GAS_MISMATCH",
  );
}

{
  const bad = await signedTransfer({
    maxFeePerGas: 1n,
    maxPriorityFeePerGas: 1n,
  });
  expectHold(
    {
      delivery: delivery(),
      raw_signed_transaction: bad,
    },
    "PARTICIPANT_POSTPURCHASE_MAX_FEE_PER_GAS_MISMATCH",
  );
}

{
  const bad = await signedTransfer({
    amount: 100_000000000000000001n,
  });
  expectHold(
    {
      delivery: delivery(),
      raw_signed_transaction: bad,
    },
    "PARTICIPANT_POSTPURCHASE_TRANSFER_EXCEEDS_DELIVERED_AMOUNT",
  );
}

{
  const bad = await signedTransfer({ amount: 0n });
  expectHold(
    {
      delivery: delivery(),
      raw_signed_transaction: bad,
    },
    "PARTICIPANT_POSTPURCHASE_TRANSFER_AMOUNT_INVALID",
  );
}

{
  const bad = await signedTransfer({
    data: iface.encodeFunctionData(
      "approve",
      [recipient, 25_000000000000000000n],
    ),
  });
  expectHold(
    {
      delivery: delivery(),
      raw_signed_transaction: bad,
    },
    "PARTICIPANT_POSTPURCHASE_NOT_VOIDTOKEN_TRANSFER",
  );
}

{
  expectHold(
    {
      delivery: delivery({ delivery_confirmed: false }),
      raw_signed_transaction: raw,
    },
    "PARTICIPANT_POSTPURCHASE_DELIVERY_NOT_CONFIRMED",
  );
}

{
  expectHold(
    {
      delivery: delivery({ void_token_address: otherToken }),
      raw_signed_transaction: raw,
    },
    "PARTICIPANT_POSTPURCHASE_DELIVERY_TOKEN_MISMATCH",
  );
}

{
  expectHold(
    {
      delivery: delivery({
        receipt_evidence_fingerprint_sha256: "not-a-digest",
      }),
      raw_signed_transaction: raw,
    },
    "INVALID_PARTICIPANT_POSTPURCHASE_RECEIPT_FINGERPRINT",
  );
}

{
  let getterCalled = false;
  const badDelivery = delivery();
  Object.defineProperty(badDelivery, "delivery_address", {
    enumerable: true,
    get() {
      getterCalled = true;
      return participant;
    },
  });
  expectHold(
    {
      delivery: badDelivery,
      raw_signed_transaction: raw,
    },
    "INVALID_PARTICIPANT_POSTPURCHASE_DELIVERY_SHAPE",
  );
  assert.equal(getterCalled, false);
}

{
  const legacy = await participantWallet.signTransaction({
    type: 0,
    chainId: 2050,
    nonce: 8,
    to: token,
    value: 0n,
    gasLimit: 100_000n,
    gasPrice: 0n,
    data: iface.encodeFunctionData(
      "transfer",
      [recipient, 1_000000000000000000n],
    ),
  });
  expectHold(
    {
      delivery: delivery(),
      raw_signed_transaction: legacy,
    },
    "PARTICIPANT_POSTPURCHASE_TRANSACTION_TYPE_MISMATCH",
  );
}

for (const [key, value] of Object.entries(
  VOID_PARTICIPANT_POSTPURCHASE_VOIDTOKEN_CONTROL_AUTHORITY_V1,
)) {
  if (
    key === "source_only" ||
    key === "explicit_input_only" ||
    key === "raw_signed_transaction_content_read" ||
    key === "signature_recovery"
  ) {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const source = fs.readFileSync(
  "tools/void-participant-postpurchase-voidtoken-control-v1.mjs",
  "utf8",
);

for (const forbidden of [
  "JsonRpcProvider(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "sendTransaction(",
  "broadcastTransaction(",
  "new Wallet(",
  "appendFileSync",
  "writeFileSync",
  "renameSync",
  "systemctl",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

assert.match(source, /Transaction\.from\(raw\)/);
assert.match(source, /tx\.isSigned\(\)/);
assert.match(
  source,
  /PARTICIPANT_POSTPURCHASE_SIGNER_NOT_DELIVERY_RECIPIENT/,
);
assert.match(
  source,
  /PARTICIPANT_POSTPURCHASE_TRANSFER_EXCEEDS_DELIVERED_AMOUNT/,
);
assert.match(source, /participant_postpurchase_voidtoken_control_source_ready/);
assert.match(source, /transaction_submission_path_ready: false/);
assert.match(source, /raw_signed_transaction_persisted: false/);

console.log("VOID_PARTICIPANT_POSTPURCHASE_VOIDTOKEN_CONTROL_V1_GREEN");
console.log("participant_postpurchase_voidtoken_control_source_ready=true");
console.log("participant_eoa_signature_recovered=true");
console.log("delivery_recipient_equals_control_signer=true");
console.log("canonical_voidtoken_transfer_calldata_verified=true");
console.log("transaction_type=2");
console.log("native_value_wei=0");
console.log("max_fee_per_gas_wei=0");
console.log("max_priority_fee_per_gas_wei=0");
console.log("delivery_provenance_verified=false");
console.log("participant_balance_verified_live=false");
console.log("transaction_submission_path_ready=false");
console.log("runtime_route_active=false");
console.log("public_submission_open=false");
console.log("transaction_broadcast=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
