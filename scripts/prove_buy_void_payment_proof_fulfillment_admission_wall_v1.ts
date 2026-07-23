import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_AUTO_FULFILLMENT_AUTHORITY_V1,
  decideBuyVoidAutoFulfillmentV1,
  type BuyVoidAutoFulfillmentInputV1,
} from "../src/economic/buy_void_auto_fulfillment_v1.js";
import {
  claimBuyVoidFulfillmentJournalV1,
} from "../src/economic/buy_void_fulfillment_journal_v1.js";

const TX_HASH = `0x${"ab".repeat(32)}`;
const DELIVERY = `0x${"11".repeat(20)}`;
const RECEIVE = `0x${"22".repeat(20)}`;
const USDC = `0x${"33".repeat(20)}`;

function baseInput(): BuyVoidAutoFulfillmentInputV1 {
  return {
    request: {
      request_id: "fixture-payment-provenance-wall-v1",
      source_chain: "base",
      tx_hash: TX_HASH,
      delivery_address: DELIVERY,
      receive_address: RECEIVE,
      usdc_amount: "1",
      quoted_void: "2",
    },
    verified_payment_event: {
      schema: "void_buy_void_verified_payment_event_v2",
      marker: "VOID_BUY_VOID_VERIFIED_PAYMENT_V2",
      payment_identity_input_complete: true,
      request_id: "fixture-payment-provenance-wall-v1",
      operator_status: "payment_verified",
      payment_verified: true,
      tx_hash: TX_HASH,
      payment_verifier: {
        chain: "base",
        transaction_hash: TX_HASH,
        log_index: "7",
        block_number: "100",
        confirmations: "12",
        usdc_contract: USDC,
        from_address: DELIVERY,
        receive_address: RECEIVE,
        delivery_address: DELIVERY,
        amount_units: "1000000",
        requested_units: "1000000",
      },
    },
    policy: {
      automatic_fulfillment_enabled: true,
      allowed_chains: ["base"],
      min_confirmations_by_chain: { base: 2 },
      usdc_contract_by_chain: { base: USDC },
      receive_address_by_chain: { base: RECEIVE },
      rate_void_units_numerator: "2",
      rate_void_units_denominator: "1",
      pool_remaining_void_units: "1000000000000",
      exact_payment_required: true,
    },
    prior_claims: [],
  };
}

function heldReason(value: unknown): string {
  return String((value as { reason?: unknown })?.reason || "");
}

assert.deepEqual(VOID_BUY_VOID_AUTO_FULFILLMENT_AUTHORITY_V1, {
  rpc_call: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  runtime_route_mount: false,
  filesystem_write: false,
  money_movement: false,
});

const approved = decideBuyVoidAutoFulfillmentV1(baseInput());
assert.equal(approved.ok, true);
assert.equal(approved.status, "approved");

const missingSchema = structuredClone(baseInput()) as any;
delete missingSchema.verified_payment_event.schema;
assert.equal(
  heldReason(decideBuyVoidAutoFulfillmentV1(missingSchema)),
  "untrusted_payment_verification_provenance",
);

const wrongSchema = structuredClone(baseInput()) as any;
wrongSchema.verified_payment_event.schema =
  "void_buy_void_verified_payment_event_v1";
assert.equal(
  heldReason(decideBuyVoidAutoFulfillmentV1(wrongSchema)),
  "untrusted_payment_verification_provenance",
);

const missingMarker = structuredClone(baseInput()) as any;
delete missingMarker.verified_payment_event.marker;
assert.equal(
  heldReason(decideBuyVoidAutoFulfillmentV1(missingMarker)),
  "untrusted_payment_verification_provenance",
);

const wrongMarker = structuredClone(baseInput()) as any;
wrongMarker.verified_payment_event.marker =
  "VOID_BUY_VOID_UNTRUSTED_PAYMENT_EVENT";
assert.equal(
  heldReason(decideBuyVoidAutoFulfillmentV1(wrongMarker)),
  "untrusted_payment_verification_provenance",
);

const incompleteIdentity = structuredClone(baseInput()) as any;
incompleteIdentity.verified_payment_event.payment_identity_input_complete =
  false;
assert.equal(
  heldReason(decideBuyVoidAutoFulfillmentV1(incompleteIdentity)),
  "untrusted_payment_verification_provenance",
);

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-payment-provenance-wall-v1-"),
);
try {
  const journalInput = structuredClone(baseInput()) as any;
  delete journalInput.verified_payment_event.schema;

  const journalDecision = claimBuyVoidFulfillmentJournalV1({
    root_dir: root,
    request: journalInput.request,
    verified_payment_event: journalInput.verified_payment_event,
    policy: journalInput.policy,
    now_ms: 1_753_287_200_000,
  });

  assert.equal(journalDecision.ok, false);
  assert.equal(heldReason(journalDecision), "untrusted_payment_verification_provenance");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log(
  JSON.stringify(
    {
      marker:
        "VOID_BUY_VOID_PAYMENT_PROOF_FULFILLMENT_ADMISSION_WALL_V1_PROOF_EXACT_GREEN",
      cases: {
        exact_v2_provenance_admitted: true,
        missing_schema_denied: true,
        wrong_schema_denied: true,
        missing_marker_denied: true,
        wrong_marker_denied: true,
        incomplete_payment_identity_denied: true,
        fulfillment_journal_rechecks_admission: true,
      },
      authority: VOID_BUY_VOID_AUTO_FULFILLMENT_AUTHORITY_V1,
      fixture_only: true,
      production_state_mutated: false,
      live_payment_rpc_called: false,
      wallet_accessed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      service_restart_performed: false,
    },
    null,
    2,
  ),
);

console.log(
  "VOID_BUY_VOID_PAYMENT_PROOF_FULFILLMENT_ADMISSION_WALL_V1_PROOF_EXACT_GREEN",
);
