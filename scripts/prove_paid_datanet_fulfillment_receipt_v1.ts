import assert from "node:assert/strict";

import {
  appendPaidDatanetFulfillmentReceiptV1,
  PAID_DATANET_FULFILLMENT_RECEIPT_V1_MARKER,
  PAID_DATANET_FULFILLMENT_RECEIPT_V1_SCHEMA,
  verifyPaidDatanetFulfillmentReceiptChainV1,
  verifyPaidDatanetFulfillmentReceiptsAgainstAdmissionsV1,
  type PaidDatanetFulfillmentReceiptV1,
} from "../src/paid_services/datanet_fulfillment_receipt_v1.js";

import {
  appendPaidDatanetAdmissionDecisionV1,
  createPaidDatanetAdmissionRequestV1,
  verifyPaidDatanetAdmissionReceiptChainV1,
  type PaidDatanetAdmissionReceiptV1,
} from "../src/paid_services/datanet_request_admission_v1.js";

import {
  quotePaidDatanetServiceV1,
} from "../src/paid_services/datanet_service_catalog_v1.js";

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
  expected: RegExp,
  message?: string,
): void {
  assert.match(actual, expected, message);
  assertions += 1;
}

function throws(
  block: () => unknown,
  expected: RegExp,
  message?: string,
): void {
  assert.throws(block, expected, message);
  assertions += 1;
}

const H1 = "1".repeat(64);
const H2 = "2".repeat(64);
const H3 = "3".repeat(64);
const H4 = "4".repeat(64);
const H5 = "5".repeat(64);
const H6 = "6".repeat(64);
const H7 = "7".repeat(64);
const H8 = "8".repeat(64);
const H9 = "9".repeat(64);

function makeApprovedAdmission(
  existing: readonly PaidDatanetAdmissionReceiptV1[],
  suffix: string,
  requestedAtMs: number,
): readonly PaidDatanetAdmissionReceiptV1[] {
  const quote = quotePaidDatanetServiceV1({
    request_id: `request-fulfillment-${suffix}`,
    requester_id: `customer-fulfillment-${suffix}`,
    service_code: "datanet.object-integrity-check.v1",
    object_count: 2,
    total_bytes: 1_048_577,
    operator_cost_basis_cents: 200,
    requested_at_ms: requestedAtMs,
  });

  const request = createPaidDatanetAdmissionRequestV1({
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
      evidence_sha256: suffix === "001" ? H1 : H2,
      verifier_id: "payment-verifier-001",
      verification_status: "VERIFIED",
      amount_cents: quote.pricing.quoted_total_cents,
      currency: quote.currency,
      observed_at_ms: requestedAtMs + 200,
    },
    submitted_at_ms: requestedAtMs + 300,
  });

  return appendPaidDatanetAdmissionDecisionV1(existing, {
    admission_request: request,
    operator_id: `admission-operator-${suffix}`,
    decision: "APPROVE",
    reason_code: "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
    decided_at_ms: requestedAtMs + 400,
  });
}

function makeRejectedAdmission(
  existing: readonly PaidDatanetAdmissionReceiptV1[],
  suffix: string,
  requestedAtMs: number,
): readonly PaidDatanetAdmissionReceiptV1[] {
  const quote = quotePaidDatanetServiceV1({
    request_id: `request-fulfillment-${suffix}`,
    requester_id: `customer-fulfillment-${suffix}`,
    service_code: "datanet.public-retrieval-evidence.v1",
    object_count: 1,
    total_bytes: 1,
    operator_cost_basis_cents: 0,
    requested_at_ms: requestedAtMs,
  });

  const request = createPaidDatanetAdmissionRequestV1({
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
      evidence_sha256: H3,
      verifier_id: "payment-verifier-001",
      verification_status: "VERIFIED",
      amount_cents: quote.pricing.quoted_total_cents,
      currency: quote.currency,
      observed_at_ms: requestedAtMs + 200,
    },
    submitted_at_ms: requestedAtMs + 300,
  });

  return appendPaidDatanetAdmissionDecisionV1(existing, {
    admission_request: request,
    operator_id: `admission-operator-${suffix}`,
    decision: "REJECT",
    reason_code: "CAPACITY_UNAVAILABLE",
    decided_at_ms: requestedAtMs + 400,
  });
}

let admissionReceipts: readonly PaidDatanetAdmissionReceiptV1[] = [];
admissionReceipts = makeApprovedAdmission(
  admissionReceipts,
  "001",
  1_800_000_000_000,
);
admissionReceipts = makeApprovedAdmission(
  admissionReceipts,
  "002",
  1_800_000_010_000,
);
admissionReceipts = makeRejectedAdmission(
  admissionReceipts,
  "003",
  1_800_000_020_000,
);

equal(admissionReceipts.length, 3);
equal(verifyPaidDatanetAdmissionReceiptChainV1(admissionReceipts), true);
equal(admissionReceipts[0]?.decision, "APPROVE");
equal(admissionReceipts[1]?.decision, "APPROVE");
equal(admissionReceipts[2]?.decision, "REJECT");

const firstAdmission = admissionReceipts[0];
const secondAdmission = admissionReceipts[1];
const rejectedAdmission = admissionReceipts[2];

if (!firstAdmission || !secondAdmission || !rejectedAdmission) {
  throw new Error("expected admission fixtures");
}

const unsortedEvidence = [
  {
    evidence_ref: "result-summary-001",
    evidence_sha256: H4,
    media_type: "application/json",
    byte_length: 512,
  },
  {
    evidence_ref: "object-digests-001",
    evidence_sha256: H5,
    media_type: "application/json",
    byte_length: 1024,
  },
] as const;

const completedInput = {
  admission_receipts: admissionReceipts,
  admission_receipt_sha256: firstAdmission.receipt_sha256,
  fulfillment_operator_id: "fulfillment-operator-001",
  execution_started_at_ms: firstAdmission.decided_at_ms + 100,
  completed_at_ms: firstAdmission.decided_at_ms + 500,
  outcome: "COMPLETED" as const,
  outcome_code: "DELIVERED_AS_QUOTED" as const,
  result_summary_sha256: H6,
  operator_attestation_sha256: H7,
  evidence_artifacts: unsortedEvidence,
};

const completedChain = appendPaidDatanetFulfillmentReceiptV1(
  [],
  completedInput,
);

equal(completedChain.length, 1);
equal(Object.isFrozen(completedChain), true);
const completed = completedChain[0];
if (!completed) {
  throw new Error("missing completed receipt");
}

equal(Object.isFrozen(completed), true);
equal(Object.isFrozen(completed.controls), true);
equal(Object.isFrozen(completed.evidence_artifacts), true);
equal(Object.isFrozen(completed.evidence_artifacts[0]), true);
equal(completed.schema, PAID_DATANET_FULFILLMENT_RECEIPT_V1_SCHEMA);
equal(completed.marker, PAID_DATANET_FULFILLMENT_RECEIPT_V1_MARKER);
matches(completed.receipt_sha256, /^[0-9a-f]{64}$/);
equal(completed.sequence, 1);
equal(completed.previous_receipt_sha256, null);
equal(completed.admission_receipt_sha256, firstAdmission.receipt_sha256);
equal(completed.admission_request_id, firstAdmission.admission_request_id);
equal(completed.quote_id, firstAdmission.quote_id);
equal(completed.service_code, firstAdmission.service_code);
equal(completed.requester_id, firstAdmission.requester_id);
equal(completed.admission_operator_id, firstAdmission.operator_id);
equal(completed.fulfillment_operator_id, "fulfillment-operator-001");
equal(completed.outcome, "COMPLETED");
equal(completed.outcome_code, "DELIVERED_AS_QUOTED");
equal(completed.status, "FULFILLED_DELIVERED");
equal(completed.result_summary_sha256, H6);
equal(completed.operator_attestation_sha256, H7);
equal(completed.evidence_count, 2);
equal(completed.total_evidence_bytes, 1536);
deepEqual(
  completed.evidence_artifacts.map((value) => value.evidence_ref),
  ["object-digests-001", "result-summary-001"],
);
equal(completed.controls.append_only_receipt, true);
equal(completed.controls.operator_attributed, true);
equal(completed.controls.evidence_bound, true);
equal(completed.controls.payment_collection_enabled, false);
equal(completed.controls.execution_performed_by_module, false);
equal(completed.controls.automatic_execution_enabled, false);
equal(completed.controls.wc_mutation_enabled, false);
equal(completed.controls.treasury_access_enabled, false);
equal(verifyPaidDatanetFulfillmentReceiptChainV1(completedChain), true);
equal(
  verifyPaidDatanetFulfillmentReceiptsAgainstAdmissionsV1(
    completedChain,
    admissionReceipts,
  ),
  true,
);

const repeatedCompleted = appendPaidDatanetFulfillmentReceiptV1(
  [],
  completedInput,
);
deepEqual(repeatedCompleted, completedChain);
equal(
  repeatedCompleted[0]?.receipt_sha256,
  completed.receipt_sha256,
);

const failedChain = appendPaidDatanetFulfillmentReceiptV1(
  completedChain,
  {
    admission_receipts: admissionReceipts,
    admission_receipt_sha256: secondAdmission.receipt_sha256,
    fulfillment_operator_id: "fulfillment-operator-002",
    execution_started_at_ms: secondAdmission.decided_at_ms + 100,
    completed_at_ms: secondAdmission.decided_at_ms + 200,
    outcome: "FAILED",
    outcome_code: "SOURCE_UNAVAILABLE",
    result_summary_sha256: H8,
    operator_attestation_sha256: H9,
    evidence_artifacts: [],
  },
);

equal(failedChain.length, 2);
equal(Object.isFrozen(failedChain), true);
const failed = failedChain[1];
if (!failed) {
  throw new Error("missing failed receipt");
}

equal(Object.isFrozen(failed), true);
equal(Object.isFrozen(failed.controls), true);
equal(Object.isFrozen(failed.evidence_artifacts), true);
equal(failed.sequence, 2);
equal(failed.previous_receipt_sha256, completed.receipt_sha256);
equal(failed.admission_receipt_sha256, secondAdmission.receipt_sha256);
equal(failed.admission_request_id, secondAdmission.admission_request_id);
equal(failed.outcome, "FAILED");
equal(failed.outcome_code, "SOURCE_UNAVAILABLE");
equal(failed.status, "FULFILLMENT_FAILED");
equal(failed.fulfillment_operator_id, "fulfillment-operator-002");
equal(failed.admission_operator_id, secondAdmission.operator_id);
equal(failed.requester_id, secondAdmission.requester_id);
equal(failed.quote_id, secondAdmission.quote_id);
equal(failed.service_code, secondAdmission.service_code);
equal(failed.result_summary_sha256, H8);
equal(failed.operator_attestation_sha256, H9);
equal(failed.evidence_count, 0);
equal(failed.total_evidence_bytes, 0);
equal(failed.controls.append_only_receipt, true);
equal(failed.controls.operator_attributed, true);
equal(failed.controls.evidence_bound, true);
equal(failed.controls.payment_collection_enabled, false);
equal(failed.controls.execution_performed_by_module, false);
equal(failed.controls.automatic_execution_enabled, false);
equal(failed.controls.wc_mutation_enabled, false);
equal(failed.controls.treasury_access_enabled, false);
deepEqual(failedChain[0], completed);
equal(verifyPaidDatanetFulfillmentReceiptChainV1(failedChain), true);
equal(
  verifyPaidDatanetFulfillmentReceiptsAgainstAdmissionsV1(
    failedChain,
    admissionReceipts,
  ),
  true,
);

throws(
  () => appendPaidDatanetFulfillmentReceiptV1(failedChain, completedInput),
  /already has a fulfillment receipt/,
);

throws(
  () =>
    appendPaidDatanetFulfillmentReceiptV1([], {
      ...completedInput,
      admission_receipt_sha256: rejectedAdmission.receipt_sha256,
    }),
  /requires an approved admission receipt/,
);

throws(
  () =>
    appendPaidDatanetFulfillmentReceiptV1([], {
      ...completedInput,
      admission_receipt_sha256: "a".repeat(64),
    }),
  /was not found/,
);

throws(
  () =>
    appendPaidDatanetFulfillmentReceiptV1([], {
      ...completedInput,
      fulfillment_operator_id: "x",
    }),
  /bounded identifier/,
);

throws(
  () =>
    appendPaidDatanetFulfillmentReceiptV1([], {
      ...completedInput,
      execution_started_at_ms: firstAdmission.decided_at_ms - 1,
    }),
  /execution_started_at_ms must be a safe integer/,
);

throws(
  () =>
    appendPaidDatanetFulfillmentReceiptV1([], {
      ...completedInput,
      completed_at_ms: completedInput.execution_started_at_ms - 1,
    }),
  /completed_at_ms must be a safe integer/,
);

throws(
  () =>
    appendPaidDatanetFulfillmentReceiptV1([], {
      ...completedInput,
      result_summary_sha256: "BAD",
    }),
  /lowercase SHA-256 hex/,
);

throws(
  () =>
    appendPaidDatanetFulfillmentReceiptV1([], {
      ...completedInput,
      operator_attestation_sha256: "BAD",
    }),
  /lowercase SHA-256 hex/,
);

throws(
  () =>
    appendPaidDatanetFulfillmentReceiptV1([], {
      ...completedInput,
      evidence_artifacts: [],
    }),
  /completed fulfillment semantics mismatch/,
);

throws(
  () =>
    appendPaidDatanetFulfillmentReceiptV1([], {
      ...completedInput,
      outcome_code: "EXECUTION_ERROR",
    }),
  /completed fulfillment semantics mismatch/,
);

throws(
  () =>
    appendPaidDatanetFulfillmentReceiptV1([], {
      ...completedInput,
      outcome: "FAILED",
      outcome_code: "DELIVERED_AS_QUOTED",
    }),
  /failed fulfillment semantics mismatch/,
);

throws(
  () =>
    appendPaidDatanetFulfillmentReceiptV1([], {
      ...completedInput,
      evidence_artifacts: [
        unsortedEvidence[0],
        { ...unsortedEvidence[0] },
      ],
    }),
  /must be unique/,
);

throws(
  () =>
    appendPaidDatanetFulfillmentReceiptV1([], {
      ...completedInput,
      evidence_artifacts: [
        {
          ...unsortedEvidence[0],
          evidence_ref: "x",
        },
      ],
    }),
  /bounded identifier/,
);

throws(
  () =>
    appendPaidDatanetFulfillmentReceiptV1([], {
      ...completedInput,
      evidence_artifacts: [
        {
          ...unsortedEvidence[0],
          evidence_sha256: "BAD",
        },
      ],
    }),
  /lowercase SHA-256 hex/,
);

throws(
  () =>
    appendPaidDatanetFulfillmentReceiptV1([], {
      ...completedInput,
      evidence_artifacts: [
        {
          ...unsortedEvidence[0],
          media_type: "Application/JSON",
        },
      ],
    }),
  /bounded lowercase media type/,
);

throws(
  () =>
    appendPaidDatanetFulfillmentReceiptV1([], {
      ...completedInput,
      evidence_artifacts: [
        {
          ...unsortedEvidence[0],
          byte_length: -1,
        },
      ],
    }),
  /evidence byte_length must be a safe integer/,
);

throws(
  () =>
    appendPaidDatanetFulfillmentReceiptV1([], {
      ...completedInput,
      evidence_artifacts: Array.from(
        { length: 257 },
        (_, index) => ({
          evidence_ref: `evidence-${String(index).padStart(3, "0")}`,
          evidence_sha256: H4,
          media_type: "application/json",
          byte_length: 1,
        }),
      ),
    }),
  /evidence artifact count must be a safe integer/,
);

const tamperedSchema = [
  {
    ...completed,
    schema: "bad-schema",
  } as unknown as PaidDatanetFulfillmentReceiptV1,
];
equal(verifyPaidDatanetFulfillmentReceiptChainV1(tamperedSchema), false);

const tamperedMarker = [
  {
    ...completed,
    marker: "bad-marker",
  } as unknown as PaidDatanetFulfillmentReceiptV1,
];
equal(verifyPaidDatanetFulfillmentReceiptChainV1(tamperedMarker), false);

const tamperedHash = [
  {
    ...completed,
    receipt_sha256: H1,
  },
];
equal(verifyPaidDatanetFulfillmentReceiptChainV1(tamperedHash), false);

const tamperedSequence = [
  {
    ...completed,
    sequence: 2,
  },
];
equal(verifyPaidDatanetFulfillmentReceiptChainV1(tamperedSequence), false);

const tamperedPrevious = [
  {
    ...completed,
    previous_receipt_sha256: H1,
  },
];
equal(verifyPaidDatanetFulfillmentReceiptChainV1(tamperedPrevious), false);

const tamperedEvidenceCount = [
  {
    ...completed,
    evidence_count: 99,
  },
];
equal(
  verifyPaidDatanetFulfillmentReceiptChainV1(tamperedEvidenceCount),
  false,
);

const tamperedTotal = [
  {
    ...completed,
    total_evidence_bytes: 1,
  },
];
equal(verifyPaidDatanetFulfillmentReceiptChainV1(tamperedTotal), false);

const tamperedOrder = [
  {
    ...completed,
    evidence_artifacts: Object.freeze([
      completed.evidence_artifacts[1]!,
      completed.evidence_artifacts[0]!,
    ]),
  },
];
equal(verifyPaidDatanetFulfillmentReceiptChainV1(tamperedOrder), false);

const tamperedOutcome = [
  {
    ...completed,
    outcome: "FAILED" as const,
  },
];
equal(verifyPaidDatanetFulfillmentReceiptChainV1(tamperedOutcome), false);

const tamperedStatus = [
  {
    ...completed,
    status: "FULFILLMENT_FAILED" as const,
  },
];
equal(verifyPaidDatanetFulfillmentReceiptChainV1(tamperedStatus), false);

const tamperedControl = [
  {
    ...completed,
    controls: {
      ...completed.controls,
      treasury_access_enabled: true,
    },
  } as unknown as PaidDatanetFulfillmentReceiptV1,
];
equal(verifyPaidDatanetFulfillmentReceiptChainV1(tamperedControl), false);

const duplicateChain = [
  completed,
  {
    ...failed,
    admission_request_id: completed.admission_request_id,
  },
];
equal(verifyPaidDatanetFulfillmentReceiptChainV1(duplicateChain), false);

const wrongAdmissionBinding = [
  {
    ...completed,
    requester_id: secondAdmission.requester_id,
  },
];
equal(
  verifyPaidDatanetFulfillmentReceiptsAgainstAdmissionsV1(
    wrongAdmissionBinding,
    admissionReceipts,
  ),
  false,
);

const missingAdmission = [
  {
    ...completed,
    admission_receipt_sha256: "a".repeat(64),
  },
];
equal(
  verifyPaidDatanetFulfillmentReceiptsAgainstAdmissionsV1(
    missingAdmission,
    admissionReceipts,
  ),
  false,
);

const invalidAdmissionChain = [
  {
    ...firstAdmission,
    receipt_sha256: H1,
  },
  ...admissionReceipts.slice(1),
];
equal(
  verifyPaidDatanetFulfillmentReceiptsAgainstAdmissionsV1(
    completedChain,
    invalidAdmissionChain,
  ),
  false,
);


const invalidOutcome = [
  {
    ...completed,
    outcome: "UNKNOWN" as never,
  },
];
equal(verifyPaidDatanetFulfillmentReceiptChainV1(invalidOutcome), false);

const invalidOutcomeCode = [
  {
    ...failed,
    outcome_code: "UNKNOWN" as never,
  },
];
equal(
  verifyPaidDatanetFulfillmentReceiptChainV1([completed, invalidOutcomeCode[0]!]),
  false,
);

equal(verifyPaidDatanetFulfillmentReceiptChainV1([]), true);
equal(
  verifyPaidDatanetFulfillmentReceiptsAgainstAdmissionsV1([], admissionReceipts),
  true,
);

throws(
  () =>
    appendPaidDatanetFulfillmentReceiptV1(
      [
        {
          ...completed,
          receipt_sha256: H1,
        },
      ],
      {
        ...completedInput,
        admission_receipt_sha256: secondAdmission.receipt_sha256,
      },
    ),
  /existing fulfillment receipt chain is invalid/,
);

throws(
  () =>
    appendPaidDatanetFulfillmentReceiptV1([], {
      ...completedInput,
      admission_receipts: invalidAdmissionChain,
    }),
  /admission receipt chain is invalid/,
);

equal(assertions >= 110, true);

console.log(
  JSON.stringify(
    {
      marker: PAID_DATANET_FULFILLMENT_RECEIPT_V1_MARKER,
      schema: PAID_DATANET_FULFILLMENT_RECEIPT_V1_SCHEMA,
      assertion_count: assertions,
      admission_receipt_count: admissionReceipts.length,
      fulfillment_receipt_count: failedChain.length,
      first_receipt_sha256: completed.receipt_sha256,
      second_receipt_sha256: failed.receipt_sha256,
      append_only_receipts: true,
      admission_binding_verified: true,
      evidence_bound: true,
      payment_collection_enabled: false,
      execution_performed_by_module: false,
      automatic_execution_enabled: false,
      wc_mutation_enabled: false,
      treasury_access_enabled: false,
      status: "GREEN",
    },
    null,
    2,
  ),
);
