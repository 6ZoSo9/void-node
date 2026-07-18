import assert from "node:assert/strict";
import {
  canonicalBuyVoidPaymentIdentityV1,
  decideBuyVoidAutoFulfillmentV1,
  type BuyVoidAutoFulfillmentInputV1,
  type BuyVoidFulfillmentClaimV1,
} from "../src/economic/buy_void_auto_fulfillment_v1.js";

const txHash = `0x${"4".repeat(64)}`;
const deliveryAddress = `0x${"5".repeat(40)}`;
const receiveAddress = `0x${"6".repeat(40)}`;
const usdcContract = `0x${"7".repeat(40)}`;

function baseInput(): BuyVoidAutoFulfillmentInputV1 {
  return {
    request: {
      request_id: "buyvoid_replay_request_1",
      source_chain: "base",
      tx_hash: txHash,
      delivery_address: deliveryAddress,
      receive_address: receiveAddress,
      usdc_amount: "25",
      quoted_void: "50",
    },
    verified_payment_event: {
      request_id: "buyvoid_replay_request_1",
      operator_status: "payment_verified",
      payment_verified: true,
      tx_hash: txHash,
      payment_verifier: {
        chain: "base",
        transaction_hash: txHash,
        log_index: "3",
        block_number: "20000000",
        confirmations: "20",
        usdc_contract: usdcContract,
        from_address: deliveryAddress,
        receive_address: receiveAddress,
        delivery_address: deliveryAddress,
        amount_units: "25000000",
        requested_units: "25000000",
      },
    },
    policy: {
      automatic_fulfillment_enabled: true,
      allowed_chains: ["base"],
      min_confirmations_by_chain: { base: 12 },
      usdc_contract_by_chain: { base: usdcContract },
      receive_address_by_chain: { base: receiveAddress },
      rate_void_units_numerator: "2",
      rate_void_units_denominator: "1",
      pool_remaining_void_units: "5000000000000",
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

const first = decideBuyVoidAutoFulfillmentV1(baseInput());
assert.equal(first.ok, true);
assert.equal(first.status, "approved");
if (!first.ok) throw new Error("first decision unexpectedly held");

const claim: BuyVoidFulfillmentClaimV1 = first.claim;

const duplicateInput = baseInput();
duplicateInput.prior_claims = [claim];
const duplicate = decideBuyVoidAutoFulfillmentV1(duplicateInput);
assert.equal(duplicate.ok, true);
assert.equal(duplicate.status, "duplicate");
if (!duplicate.ok) throw new Error("duplicate decision unexpectedly held");
assert.equal(duplicate.new_claim, false);
assert.equal(duplicate.duplicate, true);
assert.equal(duplicate.instruction.instruction_id, first.instruction.instruction_id);
assert.equal(
  duplicate.claim.canonical_payment_identity,
  first.claim.canonical_payment_identity,
);

const reusedPayment = clone(baseInput());
reusedPayment.request.request_id = "buyvoid_replay_request_2";
reusedPayment.verified_payment_event.request_id = "buyvoid_replay_request_2";
reusedPayment.prior_claims = [claim];
const reusedPaymentDecision = decideBuyVoidAutoFulfillmentV1(reusedPayment);
assert.equal(reusedPaymentDecision.ok, false);
assert.equal(
  heldReason(reusedPaymentDecision),
  "payment_identity_already_claimed",
);

const sameRequestDifferentLog = clone(baseInput());
sameRequestDifferentLog.verified_payment_event.payment_verifier!.log_index = "4";
sameRequestDifferentLog.prior_claims = [claim];
const sameRequestDifferentLogDecision =
  decideBuyVoidAutoFulfillmentV1(sameRequestDifferentLog);
assert.equal(sameRequestDifferentLogDecision.ok, false);
assert.equal(
  heldReason(sameRequestDifferentLogDecision),
  "request_already_claimed",
);

const sameIdentityChangedDecision = clone(baseInput());
sameIdentityChangedDecision.verified_payment_event.payment_verifier!.confirmations =
  "21";
sameIdentityChangedDecision.prior_claims = [claim];
const sameIdentityChangedDecisionResult =
  decideBuyVoidAutoFulfillmentV1(sameIdentityChangedDecision);
assert.equal(sameIdentityChangedDecisionResult.ok, false);
assert.equal(
  heldReason(sameIdentityChangedDecisionResult),
  "payment_identity_claim_conflict",
);

assert.equal(
  canonicalBuyVoidPaymentIdentityV1({
    source_chain: "ETH",
    payment_transaction_hash: `0x${"A".repeat(64)}`,
    payment_log_index: 9,
  }),
  `voidpay1:ethereum:0x${"a".repeat(64)}:9`,
);

const malformedPriorClaim = clone(claim);
malformedPriorClaim.unsigned_instruction = undefined as never;
const malformedDuplicateInput = baseInput();
malformedDuplicateInput.prior_claims = [malformedPriorClaim];
const malformedDuplicate =
  decideBuyVoidAutoFulfillmentV1(malformedDuplicateInput);
assert.equal(malformedDuplicate.ok, false);
assert.equal(
  heldReason(malformedDuplicate),
  "payment_identity_claim_conflict",
);

console.log("VOID_BUY_VOID_AUTO_FULFILLMENT_REPLAY_GUARD_V1_GREEN");
