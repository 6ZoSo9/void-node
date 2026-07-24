import assert from "node:assert/strict";

import {
  USD_CENTS,
  quotePaidDatanetServiceV1,
  type PaidDatanetQuoteV1,
} from "../src/paid_services/datanet_service_catalog_v1.js";
import {
  PAID_DATANET_ADMISSION_RECEIPT_V1_SCHEMA,
  PAID_DATANET_ADMISSION_REQUEST_V1_SCHEMA,
  PAID_DATANET_REQUEST_ADMISSION_V1_MARKER,
  appendPaidDatanetAdmissionDecisionV1,
  createPaidDatanetAdmissionRequestV1,
  verifyPaidDatanetAdmissionReceiptChainV1,
  verifyPaidDatanetAdmissionRequestV1,
  type CreatePaidDatanetAdmissionRequestV1Input,
  type PaidDatanetAdmissionReceiptV1,
  type PaidDatanetAdmissionRequestV1,
} from "../src/paid_services/datanet_request_admission_v1.js";

let assertions = 0;

function equal<T>(actual: T, expected: T, message?: string): void {
  assert.equal(actual, expected, message);
  assertions += 1;
}

function deepEqual(
  actual: unknown,
  expected: unknown,
  message?: string,
): void {
  assert.deepEqual(actual, expected, message);
  assertions += 1;
}

function matches(
  actual: string,
  pattern: RegExp,
  message?: string,
): void {
  assert.match(actual, pattern, message);
  assertions += 1;
}

function throws(
  fn: () => unknown,
  pattern: RegExp,
  message?: string,
): void {
  assert.throws(fn, pattern, message);
  assertions += 1;
}

function makeInput(
  suffix: string,
  requestedAtMs: number,
): CreatePaidDatanetAdmissionRequestV1Input {
  const quote = quotePaidDatanetServiceV1({
    request_id: `request-admission-${suffix}`,
    requester_id: `customer-admission-${suffix}`,
    service_code: "datanet.object-integrity-check.v1",
    object_count: 2,
    total_bytes: 1_048_577,
    operator_cost_basis_cents: 200,
    requested_at_ms: requestedAtMs,
  });

  return {
    quote,
    customer_acceptance: {
      requester_id: quote.request.requester_id,
      accepted_quote_id: quote.quote_id,
      accepted_total_cents: quote.pricing.quoted_total_cents,
      accepted_currency: quote.currency,
      accepted_at_ms: requestedAtMs + 100,
    },
    payment_evidence: {
      evidence_ref: `payment-evidence-${suffix}`,
      evidence_sha256: suffix === "002" ? "d".repeat(64) : "c".repeat(64),
      verifier_id: "payment-verifier-001",
      verification_status: "VERIFIED",
      amount_cents: quote.pricing.quoted_total_cents,
      currency: quote.currency,
      observed_at_ms: requestedAtMs + 200,
    },
    submitted_at_ms: requestedAtMs + 300,
  };
}

const inputA = makeInput("001", 1_800_000_000_000);
const requestA = createPaidDatanetAdmissionRequestV1(inputA);

equal(requestA.schema, PAID_DATANET_ADMISSION_REQUEST_V1_SCHEMA);
equal(requestA.marker, PAID_DATANET_REQUEST_ADMISSION_V1_MARKER);
equal(requestA.status, "PENDING_OPERATOR_DECISION");
equal(requestA.quote.quote_id, inputA.quote.quote_id);
equal(requestA.quote.service_code, inputA.quote.service_code);
equal(requestA.quote.requester_id, inputA.quote.request.requester_id);
equal(
  requestA.quote.quoted_total_cents,
  inputA.quote.pricing.quoted_total_cents,
);
equal(requestA.quote.currency, USD_CENTS);
equal(requestA.quote.expires_at_ms, inputA.quote.expires_at_ms);
equal(
  requestA.customer_acceptance.accepted_quote_id,
  inputA.quote.quote_id,
);
equal(
  requestA.payment_evidence.evidence_ref,
  "payment-evidence-001",
);
equal(requestA.payment_evidence.verification_status, "VERIFIED");
equal(requestA.controls.operator_decision_required, true);
equal(requestA.controls.automatic_admission_enabled, false);
equal(requestA.controls.payment_collection_enabled, false);
equal(requestA.controls.automatic_execution_enabled, false);
equal(requestA.controls.wc_mutation_enabled, false);
equal(requestA.controls.treasury_access_enabled, false);
matches(requestA.admission_request_id, /^[0-9a-f]{64}$/);
equal(verifyPaidDatanetAdmissionRequestV1(requestA), true);
equal(Object.isFrozen(requestA), true);
equal(Object.isFrozen(requestA.quote), true);
equal(Object.isFrozen(requestA.customer_acceptance), true);
equal(Object.isFrozen(requestA.payment_evidence), true);
equal(Object.isFrozen(requestA.controls), true);

const repeatedA = createPaidDatanetAdmissionRequestV1({
  ...inputA,
  customer_acceptance: { ...inputA.customer_acceptance },
  payment_evidence: { ...inputA.payment_evidence },
});
equal(repeatedA.admission_request_id, requestA.admission_request_id);
deepEqual(repeatedA, requestA);

equal(verifyPaidDatanetAdmissionReceiptChainV1([]), true);
const chainA = appendPaidDatanetAdmissionDecisionV1([], {
  admission_request: requestA,
  operator_id: "operator-zoso-001",
  decision: "APPROVE",
  reason_code: "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
  decided_at_ms: inputA.submitted_at_ms + 100,
});

equal(chainA.length, 1);
equal(Object.isFrozen(chainA), true);
equal(chainA[0].schema, PAID_DATANET_ADMISSION_RECEIPT_V1_SCHEMA);
equal(chainA[0].marker, PAID_DATANET_REQUEST_ADMISSION_V1_MARKER);
equal(chainA[0].sequence, 1);
equal(chainA[0].previous_receipt_sha256, null);
equal(chainA[0].admission_request_id, requestA.admission_request_id);
equal(chainA[0].decision, "APPROVE");
equal(chainA[0].reason_code, "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE");
equal(chainA[0].status, "ADMITTED_AWAITING_SEPARATE_EXECUTION");
equal(chainA[0].controls.append_only_receipt, true);
equal(chainA[0].controls.payment_collection_enabled, false);
equal(chainA[0].controls.execution_authorized, false);
equal(chainA[0].controls.automatic_execution_enabled, false);
equal(chainA[0].controls.wc_mutation_enabled, false);
equal(chainA[0].controls.treasury_access_enabled, false);
matches(chainA[0].receipt_sha256, /^[0-9a-f]{64}$/);
equal(verifyPaidDatanetAdmissionReceiptChainV1(chainA), true);
equal(Object.isFrozen(chainA[0]), true);
equal(Object.isFrozen(chainA[0].controls), true);

const inputB = makeInput("002", 1_800_000_010_000);
const requestB = createPaidDatanetAdmissionRequestV1(inputB);
const chainB = appendPaidDatanetAdmissionDecisionV1(chainA, {
  admission_request: requestB,
  operator_id: "operator-zoso-001",
  decision: "REJECT",
  reason_code: "CAPACITY_UNAVAILABLE",
  decided_at_ms: inputB.submitted_at_ms + 100,
});

equal(chainB.length, 2);
equal(chainB[1].sequence, 2);
equal(chainB[1].previous_receipt_sha256, chainB[0].receipt_sha256);
equal(chainB[1].decision, "REJECT");
equal(chainB[1].reason_code, "CAPACITY_UNAVAILABLE");
equal(chainB[1].status, "REJECTED");
equal(verifyPaidDatanetAdmissionReceiptChainV1(chainB), true);
equal(chainB[0], chainA[0]);

const tamperedRequest = {
  ...requestA,
  submitted_at_ms: requestA.submitted_at_ms + 1,
} as PaidDatanetAdmissionRequestV1;
equal(verifyPaidDatanetAdmissionRequestV1(tamperedRequest), false);

const tamperedOperator = [
  {
    ...chainB[0],
    operator_id: "operator-attacker-001",
  },
  chainB[1],
] as readonly PaidDatanetAdmissionReceiptV1[];
equal(
  verifyPaidDatanetAdmissionReceiptChainV1(tamperedOperator),
  false,
);

const tamperedSequence = [
  chainB[0],
  { ...chainB[1], sequence: 3 },
] as readonly PaidDatanetAdmissionReceiptV1[];
equal(
  verifyPaidDatanetAdmissionReceiptChainV1(tamperedSequence),
  false,
);

const tamperedPrevious = [
  chainB[0],
  { ...chainB[1], previous_receipt_sha256: null },
] as readonly PaidDatanetAdmissionReceiptV1[];
equal(
  verifyPaidDatanetAdmissionReceiptChainV1(tamperedPrevious),
  false,
);

equal(
  verifyPaidDatanetAdmissionReceiptChainV1([chainB[0], chainB[0]]),
  false,
);

throws(
  () =>
    appendPaidDatanetAdmissionDecisionV1(chainA, {
      admission_request: requestA,
      operator_id: "operator-zoso-001",
      decision: "APPROVE",
      reason_code: "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
      decided_at_ms: inputA.submitted_at_ms + 200,
    }),
  /already has a decision receipt/,
);
throws(
  () =>
    appendPaidDatanetAdmissionDecisionV1(tamperedSequence, {
      admission_request: requestB,
      operator_id: "operator-zoso-001",
      decision: "REJECT",
      reason_code: "POLICY_REJECTED",
      decided_at_ms: inputB.submitted_at_ms + 200,
    }),
  /existing admission receipt chain is invalid/,
);
throws(
  () =>
    appendPaidDatanetAdmissionDecisionV1([], {
      admission_request: tamperedRequest,
      operator_id: "operator-zoso-001",
      decision: "REJECT",
      reason_code: "POLICY_REJECTED",
      decided_at_ms: inputA.submitted_at_ms + 200,
    }),
  /admission request integrity check failed/,
);
throws(
  () =>
    appendPaidDatanetAdmissionDecisionV1([], {
      admission_request: requestA,
      operator_id: "x",
      decision: "APPROVE",
      reason_code: "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
      decided_at_ms: inputA.submitted_at_ms + 200,
    }),
  /operator_id must be a bounded identifier/,
);
throws(
  () =>
    appendPaidDatanetAdmissionDecisionV1([], {
      admission_request: requestA,
      operator_id: "operator-zoso-001",
      decision: "APPROVE",
      reason_code: "CAPACITY_UNAVAILABLE",
      decided_at_ms: inputA.submitted_at_ms + 200,
    }),
  /APPROVE requires the approval reason code/,
);
throws(
  () =>
    appendPaidDatanetAdmissionDecisionV1([], {
      admission_request: requestA,
      operator_id: "operator-zoso-001",
      decision: "REJECT",
      reason_code: "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
      decided_at_ms: inputA.submitted_at_ms + 200,
    }),
  /REJECT requires a rejection reason code/,
);
throws(
  () =>
    appendPaidDatanetAdmissionDecisionV1([], {
      admission_request: requestA,
      operator_id: "operator-zoso-001",
      decision: "REJECT",
      reason_code: "POLICY_REJECTED",
      decided_at_ms: inputA.submitted_at_ms - 1,
    }),
  /decided_at_ms must be a safe integer/,
);

throws(
  () =>
    createPaidDatanetAdmissionRequestV1({
      ...inputA,
      customer_acceptance: {
        ...inputA.customer_acceptance,
        requester_id: "different-customer-001",
      },
    }),
  /acceptance requester does not match quote/,
);
throws(
  () =>
    createPaidDatanetAdmissionRequestV1({
      ...inputA,
      customer_acceptance: {
        ...inputA.customer_acceptance,
        accepted_quote_id: "f".repeat(64),
      },
    }),
  /acceptance quote ID does not match quote/,
);
throws(
  () =>
    createPaidDatanetAdmissionRequestV1({
      ...inputA,
      customer_acceptance: {
        ...inputA.customer_acceptance,
        accepted_total_cents:
          inputA.customer_acceptance.accepted_total_cents + 1,
      },
    }),
  /accepted total does not match quote/,
);
throws(
  () =>
    createPaidDatanetAdmissionRequestV1({
      ...inputA,
      customer_acceptance: {
        ...inputA.customer_acceptance,
        accepted_currency: "EUR_CENTS" as typeof USD_CENTS,
      },
    }),
  /accepted currency does not match quote/,
);
throws(
  () =>
    createPaidDatanetAdmissionRequestV1({
      ...inputA,
      customer_acceptance: {
        ...inputA.customer_acceptance,
        accepted_at_ms: inputA.quote.expires_at_ms + 1,
      },
    }),
  /accepted_at_ms must be a safe integer/,
);
throws(
  () =>
    createPaidDatanetAdmissionRequestV1({
      ...inputA,
      payment_evidence: {
        ...inputA.payment_evidence,
        evidence_ref: "x",
      },
    }),
  /payment evidence_ref must be a bounded identifier/,
);
throws(
  () =>
    createPaidDatanetAdmissionRequestV1({
      ...inputA,
      payment_evidence: {
        ...inputA.payment_evidence,
        evidence_sha256: "not-a-digest",
      },
    }),
  /payment evidence_sha256 must be lowercase SHA-256 hex/,
);
throws(
  () =>
    createPaidDatanetAdmissionRequestV1({
      ...inputA,
      payment_evidence: {
        ...inputA.payment_evidence,
        verifier_id: "x",
      },
    }),
  /payment verifier_id must be a bounded identifier/,
);
throws(
  () =>
    createPaidDatanetAdmissionRequestV1({
      ...inputA,
      payment_evidence: {
        ...inputA.payment_evidence,
        verification_status: "REJECTED" as "VERIFIED",
      },
    }),
  /payment evidence must be VERIFIED/,
);
throws(
  () =>
    createPaidDatanetAdmissionRequestV1({
      ...inputA,
      payment_evidence: {
        ...inputA.payment_evidence,
        amount_cents: inputA.payment_evidence.amount_cents + 1,
      },
    }),
  /payment amount does not match quote/,
);
throws(
  () =>
    createPaidDatanetAdmissionRequestV1({
      ...inputA,
      payment_evidence: {
        ...inputA.payment_evidence,
        currency: "EUR_CENTS" as typeof USD_CENTS,
      },
    }),
  /payment currency does not match quote/,
);
throws(
  () =>
    createPaidDatanetAdmissionRequestV1({
      ...inputA,
      payment_evidence: {
        ...inputA.payment_evidence,
        observed_at_ms:
          inputA.customer_acceptance.accepted_at_ms - 1,
      },
    }),
  /payment observed_at_ms must be a safe integer/,
);
throws(
  () =>
    createPaidDatanetAdmissionRequestV1({
      ...inputA,
      submitted_at_ms: inputA.payment_evidence.observed_at_ms - 1,
    }),
  /submitted_at_ms must be a safe integer/,
);

const invalidQuoteId = {
  ...inputA.quote,
  quote_id: "invalid",
} as PaidDatanetQuoteV1;
throws(
  () =>
    createPaidDatanetAdmissionRequestV1({
      ...inputA,
      quote: invalidQuoteId,
    }),
  /quote_id must be lowercase SHA-256 hex/,
);

console.log(
  JSON.stringify(
    {
      marker: PAID_DATANET_REQUEST_ADMISSION_V1_MARKER,
      request_schema: PAID_DATANET_ADMISSION_REQUEST_V1_SCHEMA,
      receipt_schema: PAID_DATANET_ADMISSION_RECEIPT_V1_SCHEMA,
      assertion_count: assertions,
      admission_request_id: requestA.admission_request_id,
      first_receipt_sha256: chainA[0].receipt_sha256,
      receipt_chain_length: chainB.length,
      append_only_receipts: true,
      payment_collection_enabled: false,
      execution_authorized: false,
      automatic_execution_enabled: false,
      wc_mutation_enabled: false,
      treasury_access_enabled: false,
      status: "GREEN",
    },
    null,
    2,
  ),
);
