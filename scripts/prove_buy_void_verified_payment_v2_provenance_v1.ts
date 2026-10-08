import assert from "node:assert/strict";

import {
  buildBuyVoidVerifiedPaymentEventV2,
  type BuyVoidReceiptLogV2,
  type BuyVoidTransactionReceiptV2,
  type BuyVoidVerifiedPaymentPolicyV2,
} from "../src/economic/buy_void_verified_payment_v2.js";
import type {
  BuyVoidRequestV1,
} from "../src/economic/buy_void_auto_fulfillment_v1.js";

const tx = "0x" + "a".repeat(64);
const otherTx = "0x" + "b".repeat(64);
const delivery = "0x" + "1".repeat(40);
const receiver = "0x" + "2".repeat(40);
const usdc = "0x" + "3".repeat(40);
const transferTopic =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const topicAddress = (address: string) =>
  "0x" + "0".repeat(24) + address.slice(2);

const request: BuyVoidRequestV1 = {
  request_id: "buyvoid_provenance_00000001",
  source_chain: "base",
  tx_hash: tx,
  delivery_address: delivery,
  receive_address: receiver,
  usdc_amount: "1",
  quoted_void: "2",
};

const matchingLog = (
  overrides: Partial<BuyVoidReceiptLogV2> = {},
): BuyVoidReceiptLogV2 => ({
  address: usdc,
  topics: [
    transferTopic,
    topicAddress(delivery),
    topicAddress(receiver),
  ],
  data: "0xf4240",
  logIndex: "0x7",
  transactionHash: tx,
  blockNumber: "0x64",
  ...overrides,
});

const receipt = (
  overrides: Partial<BuyVoidTransactionReceiptV2> = {},
): BuyVoidTransactionReceiptV2 => ({
  status: "0x1",
  transactionHash: tx,
  blockNumber: "0x64",
  logs: [matchingLog()],
  ...overrides,
});

const policy = (
  currentBlock = "0x65",
): BuyVoidVerifiedPaymentPolicyV2 => ({
  allowed_chains: ["base"],
  usdc_contract_by_chain: { base: usdc },
  receive_address_by_chain: { base: receiver },
  current_block_number_by_chain: { base: currentBlock },
});

function verify(
  receiptInput: BuyVoidTransactionReceiptV2 = receipt(),
  policyInput: BuyVoidVerifiedPaymentPolicyV2 = policy(),
) {
  return buildBuyVoidVerifiedPaymentEventV2({
    request,
    receipt: receiptInput,
    policy: policyInput,
  });
}

function requireVerified(
  value: ReturnType<typeof verify>,
): Extract<ReturnType<typeof verify>, { ok: true }> {
  const runtime = value as ReturnType<typeof verify> & {
    ok: boolean;
    reason?: string;
  };
  if (runtime.ok !== true) {
    throw new Error(runtime.reason ?? "unexpected_verified_payment_hold");
  }
  return value as Extract<ReturnType<typeof verify>, { ok: true }>;
}

function expectHeld(
  value: ReturnType<typeof verify>,
  reason: string,
): void {
  const runtime = value as ReturnType<typeof verify> & {
    ok: boolean;
    reason?: string;
  };
  if (runtime.ok !== false) {
    throw new Error("expected verified-payment V2 HOLD");
  }
  assert.equal(runtime.reason, reason);
}

const baseline = requireVerified(verify());
assert.equal(baseline.event.payment_verifier.log_index, "7");
assert.equal(baseline.event.payment_verifier.block_number, "100");
assert.equal(baseline.event.payment_verifier.confirmations, "2");
assert.equal(
  baseline.event.payment_verifier.transaction_hash,
  tx,
);

expectHeld(
  verify(receipt({ logs: [matchingLog({ removed: true })] })),
  "matching_usdc_transfer_not_found",
);

expectHeld(
  verify(receipt({
    logs: [matchingLog({ transactionHash: otherTx })],
  })),
  "matching_usdc_transfer_not_found",
);

expectHeld(
  verify(receipt({
    logs: [matchingLog({ blockNumber: "0x65" })],
  })),
  "matching_usdc_transfer_not_found",
);

expectHeld(
  verify(receipt({ transactionHash: otherTx })),
  "payment_transaction_hash_mismatch",
);

expectHeld(
  verify(receipt({
    logs: [
      matchingLog(),
      matchingLog({ logIndex: "0x8" }),
    ],
  })),
  "ambiguous_matching_usdc_transfers",
);

expectHeld(
  verify(receipt(), policy("0x63")),
  "invalid_current_block_number",
);

const oneConfirmation = requireVerified(
  verify(receipt(), policy("0x64")),
);
assert.equal(
  oneConfirmation.event.payment_verifier.confirmations,
  "1",
);

const maxU32 = requireVerified(
  verify(receipt({
    logs: [matchingLog({ logIndex: "0xffffffff" })],
  })),
);
assert.equal(
  maxU32.event.payment_verifier.log_index,
  "4294967295",
);

expectHeld(
  verify(receipt({
    logs: [matchingLog({ logIndex: "0x100000000" })],
  })),
  "log_index_exceeds_1463_domain",
);

expectHeld(
  buildBuyVoidVerifiedPaymentEventV2({
    request,
    receipt: receipt(),
    policy: {
      ...policy(),
      receive_address_by_chain: {
        base: "0x" + "4".repeat(40),
      },
    },
  }),
  "receive_address_binding_mismatch",
);

// Bound checkout token, configured verifier token and receipt token must agree
// on fixed native USDC, independently of the caller-supplied policy address.
const BASE_NATIVE_USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const ETH_NATIVE_USDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const checkout = {
  ...request,
  usdc_contract: BASE_NATIVE_USDC,
  launch_authority: { marker: "VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1" },
};
const canonicalPolicy: BuyVoidVerifiedPaymentPolicyV2 = {
  ...policy(),
  usdc_contract_by_chain: { base: BASE_NATIVE_USDC },
};
const canonicalReceipt = receipt({
  logs: [matchingLog({ address: BASE_NATIVE_USDC })],
});
const nativeBase = requireVerified(buildBuyVoidVerifiedPaymentEventV2({
  request: checkout, receipt: canonicalReceipt, policy: canonicalPolicy,
}));
assert.equal(nativeBase.event.payment_verifier.chain, "base");
assert.equal(nativeBase.event.payment_verifier.usdc_contract, BASE_NATIVE_USDC);
expectHeld(buildBuyVoidVerifiedPaymentEventV2({
  request: checkout, receipt: receipt(), policy: policy(),
}), "verified_payment_policy_original_usdc_mismatch");
expectHeld(buildBuyVoidVerifiedPaymentEventV2({
  request: { ...checkout, usdc_contract: usdc },
  receipt: receipt(), policy: policy(),
}), "original_request_non_native_usdc_contract");
expectHeld(buildBuyVoidVerifiedPaymentEventV2({
  request: { ...request, launch_authority: checkout.launch_authority },
  receipt: canonicalReceipt, policy: canonicalPolicy,
}), "original_request_usdc_contract_missing_or_invalid");
expectHeld(buildBuyVoidVerifiedPaymentEventV2({
  request: { ...checkout, usdc_contract: undefined },
  receipt: canonicalReceipt, policy: canonicalPolicy,
}), "original_request_usdc_contract_missing_or_invalid");
const caseInsensitiveNative = requireVerified(buildBuyVoidVerifiedPaymentEventV2({
  request: { ...checkout, usdc_contract: BASE_NATIVE_USDC.toUpperCase() },
  receipt: canonicalReceipt, policy: canonicalPolicy,
}));
assert.equal(caseInsensitiveNative.event.payment_verifier.usdc_contract, BASE_NATIVE_USDC);
// Ethereum payment-log shape does not replace independent Ethereum finality.
const nativeEthereum = requireVerified(buildBuyVoidVerifiedPaymentEventV2({
  request: { ...checkout, source_chain: "ethereum", usdc_contract: ETH_NATIVE_USDC },
  receipt: receipt({ logs: [matchingLog({ address: ETH_NATIVE_USDC })] }),
  policy: {
    allowed_chains: ["ethereum"],
    usdc_contract_by_chain: { ethereum: ETH_NATIVE_USDC },
    receive_address_by_chain: { ethereum: receiver },
    current_block_number_by_chain: { ethereum: "0x65" },
  },
}));
assert.equal(nativeEthereum.event.payment_verifier.chain, "ethereum");
assert.equal(nativeEthereum.event.payment_verifier.usdc_contract, ETH_NATIVE_USDC);

console.log("VOID_BUY_VOID_VERIFIED_PAYMENT_V2_PROVENANCE_V1_GREEN");
console.log("native_usdc_checkout_config_receipt_consistency=true");
console.log("non_native_config_cannot_verify_native_checkout=true");
console.log("missing_or_wrong_original_coupled_token_holds=true");
console.log("ethereum_payment_log_not_finality=true");
console.log("removed_log_rejected=true");
console.log("per_log_transaction_hash_bound=true");
console.log("per_log_block_number_bound=true");
console.log("receipt_transaction_hash_bound=true");
console.log("ambiguous_exact_transfers_rejected=true");
console.log("current_block_order_bound=true");
console.log("confirmation_count_derived=true");
console.log("payment_log_index_uint32_domain_bound=true");
console.log("receive_address_policy_bound=true");
console.log("runtime_mutation=false");
console.log("funds_movement=false");
