import assert from "node:assert/strict";
import {
  VOID_BUY_VOID_AUTO_FULFILLMENT_AUTHORITY_V1,
  VOID_BUY_VOID_AUTO_FULFILLMENT_V1,
  canonicalBuyVoidPaymentIdentityV1,
  decideBuyVoidAutoFulfillmentV1,
  type BuyVoidAutoFulfillmentInputV1,
} from "../src/economic/buy_void_auto_fulfillment_v1.js";

const txHash = `0x${"a".repeat(64)}`;
const deliveryAddress = `0x${"b".repeat(40)}`;
const receiveAddress = `0x${"c".repeat(40)}`;
const usdcContract = `0x${"d".repeat(40)}`;

function baseInput(): BuyVoidAutoFulfillmentInputV1 {
  return {
    request: {
      request_id: "buyvoid_proof_request_1",
      source_chain: "base",
      tx_hash: txHash,
      delivery_address: deliveryAddress,
      receive_address: receiveAddress,
      usdc_amount: "10",
      quoted_void: "20",
    },
    verified_payment_event: {
      request_id: "buyvoid_proof_request_1",
      operator_status: "payment_verified",
      payment_verified: true,
      tx_hash: txHash,
      payment_verifier: {
        chain: "base",
        transaction_hash: txHash,
        log_index: "7",
        block_number: "12345678",
        confirmations: "12",
        usdc_contract: usdcContract,
        from_address: deliveryAddress,
        receive_address: receiveAddress,
        delivery_address: deliveryAddress,
        amount_units: "10000000",
        requested_units: "10000000",
      },
    },
    policy: {
      automatic_fulfillment_enabled: true,
      allowed_chains: ["base", "ethereum"],
      min_confirmations_by_chain: {
        base: 12,
        ethereum: 24,
      },
      usdc_contract_by_chain: {
        base: usdcContract,
        ethereum: `0x${"e".repeat(40)}`,
      },
      receive_address_by_chain: {
        base: receiveAddress,
        ethereum: `0x${"f".repeat(40)}`,
      },
      rate_void_units_numerator: "2",
      rate_void_units_denominator: "1",
      pool_remaining_void_units: "10000000000000",
      exact_payment_required: true,
    },
    prior_claims: [],
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function heldReason(
  decision: ReturnType<typeof decideBuyVoidAutoFulfillmentV1>,
): string {
  assert.equal(decision.ok, false);
  if (decision.ok) throw new Error("expected held decision");
  return decision.reason;
}

assert.equal(
  VOID_BUY_VOID_AUTO_FULFILLMENT_V1,
  "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
);
assert.deepEqual(VOID_BUY_VOID_AUTO_FULFILLMENT_AUTHORITY_V1, {
  rpc_call: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  runtime_route_mount: false,
  filesystem_write: false,
  money_movement: false,
});

assert.equal(
  canonicalBuyVoidPaymentIdentityV1({
    source_chain: "BASE",
    payment_transaction_hash: txHash.toUpperCase().replace("0X", "0x"),
    payment_log_index: "0x7",
  }),
  `voidpay1:base:${txHash}:7`,
);

const approved = decideBuyVoidAutoFulfillmentV1(baseInput());
assert.equal(approved.ok, true);
assert.equal(approved.status, "approved");
if (!approved.ok) throw new Error("approved decision unexpectedly held");
assert.equal(approved.new_claim, true);
assert.equal(approved.duplicate, false);
assert.equal(approved.instruction.request_id, "buyvoid_proof_request_1");
assert.equal(
  approved.instruction.canonical_payment_identity,
  `voidpay1:base:${txHash}:7`,
);
assert.equal(approved.instruction.payment_usdc_units, "10000000");
assert.equal(approved.instruction.void_amount_units, "20000000");
assert.equal(approved.instruction.signing_authorized, false);
assert.equal(approved.instruction.transaction_broadcast_authorized, false);
assert.equal(approved.instruction.automatic_execution_authorized, false);
assert.match(approved.instruction.instruction_id, /^voidfill1_[0-9a-f]{32}$/);
assert.equal(approved.claim.canonical_payment_identity_sha256.length, 64);

const disabled = clone(baseInput());
disabled.policy.automatic_fulfillment_enabled = false;
assert.equal(
  heldReason(decideBuyVoidAutoFulfillmentV1(disabled)),
  "automatic_fulfillment_disabled",
);

const legacyMissingLogIndex = clone(baseInput());
delete legacyMissingLogIndex.verified_payment_event.payment_verifier?.log_index;
assert.equal(
  heldReason(decideBuyVoidAutoFulfillmentV1(legacyMissingLogIndex)),
  "missing_payment_log_index",
);

const legacyMissingConfirmations = clone(baseInput());
delete legacyMissingConfirmations.verified_payment_event.payment_verifier
  ?.confirmations;
assert.equal(
  heldReason(decideBuyVoidAutoFulfillmentV1(legacyMissingConfirmations)),
  "missing_confirmation_count",
);

const insufficientConfirmations = clone(baseInput());
insufficientConfirmations.verified_payment_event.payment_verifier!.confirmations =
  "11";
assert.equal(
  heldReason(decideBuyVoidAutoFulfillmentV1(insufficientConfirmations)),
  "insufficient_confirmations",
);

const overpayment = clone(baseInput());
overpayment.verified_payment_event.payment_verifier!.amount_units = "10000001";
assert.equal(
  heldReason(decideBuyVoidAutoFulfillmentV1(overpayment)),
  "exact_payment_required",
);

const wrongDelivery = clone(baseInput());
wrongDelivery.verified_payment_event.payment_verifier!.from_address =
  `0x${"1".repeat(40)}`;
assert.equal(
  heldReason(decideBuyVoidAutoFulfillmentV1(wrongDelivery)),
  "delivery_address_binding_mismatch",
);

const wrongReceiver = clone(baseInput());
wrongReceiver.verified_payment_event.payment_verifier!.receive_address =
  `0x${"2".repeat(40)}`;
assert.equal(
  heldReason(decideBuyVoidAutoFulfillmentV1(wrongReceiver)),
  "receive_address_binding_mismatch",
);

const wrongToken = clone(baseInput());
wrongToken.verified_payment_event.payment_verifier!.usdc_contract =
  `0x${"3".repeat(40)}`;
assert.equal(
  heldReason(decideBuyVoidAutoFulfillmentV1(wrongToken)),
  "usdc_contract_mismatch",
);

const badQuote = clone(baseInput());
badQuote.request.quoted_void = "19.999999";
assert.equal(
  heldReason(decideBuyVoidAutoFulfillmentV1(badQuote)),
  "quoted_void_rate_mismatch",
);

const lowInventory = clone(baseInput());
lowInventory.policy.pool_remaining_void_units = "19999999";
assert.equal(
  heldReason(decideBuyVoidAutoFulfillmentV1(lowInventory)),
  "insufficient_void_inventory",
);

const wrongRequest = clone(baseInput());
wrongRequest.verified_payment_event.request_id = "buyvoid_other_request";
assert.equal(
  heldReason(decideBuyVoidAutoFulfillmentV1(wrongRequest)),
  "request_event_mismatch",
);

console.log("VOID_BUY_VOID_AUTO_FULFILLMENT_V1_GREEN");
