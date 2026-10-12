#!/usr/bin/env node

import assert from "node:assert/strict";

import {
  ADMISSION_DECISION_HOLD_DISPOSITION_V1,
  ADMISSION_DECISION_RECEIPT_DISPOSITION_V1,
  ADMISSION_DECISION_SCHEMA_V1,
  ADMISSION_DECISION_TOKEN_V1,
  VOID_PAID_DATANET_PUBLIC_PILOT_ADMISSION_DECISION_CLI_V1,
  decidePublicPilotAdmissionV1,
  runAdmissionDecisionCliV1,
  type AdmissionDecisionHoldV1,
  type AdmissionDecisionReadyV1,
} from "./paid_datanet_public_pilot_admission_decision_cli_v1.js";
import {
  PAYMENT_CONFIRMATION_TOKEN_V1,
  PAYMENT_CONFIRMED_DISPOSITION_V1,
  PAYMENT_EVIDENCE_SCHEMA_V1,
  confirmPublicPilotPaymentV1,
  type PaymentConfirmationReadyV1,
} from "./paid_datanet_public_pilot_payment_confirmation_cli_v1.js";
import {
  APPROVAL_CONFIRMATION_TOKEN_V1,
  APPROVED_DISPOSITION_V1,
  approvePublicPilotQuoteV1,
  canonicalJsonV1,
  sha256JsonV1,
  type JsonObject,
  type JsonValue,
  type QuoteApprovalReadyV1,
} from "./paid_datanet_public_pilot_quote_approval_cli_v1.js";
import {
  bridgePaidDatanetPublicPilotQuoteV1,
} from "./paid_datanet_public_pilot_quote_bridge_cli_v1.js";
import {
  triagePaidDatanetPublicPilotIssueV1,
  type PaidDatanetPublicPilotIssueExportV1,
} from "./paid_datanet_public_pilot_triage_cli_v1.js";
import {
  type PaidDatanetQuotePacketV1,
} from "./paid_datanet_quote_packet_v1.js";
import {
  appendPaidDatanetAdmissionDecisionV1,
  createPaidDatanetAdmissionRequestV1,
  verifyPaidDatanetAdmissionReceiptChainV1,
  verifyPaidDatanetAdmissionRequestV1,
  type PaidDatanetAdmissionReceiptV1,
  type PaidDatanetAdmissionRequestV1,
} from "../src/paid_services/datanet_request_admission_v1.js";
import { USD_CENTS } from "../src/paid_services/datanet_service_catalog_v1.js";

const REQUESTED_AT_MS = 1_780_000_000_000;
const APPROVED_AT_MS = REQUESTED_AT_MS + 5 * 60 * 1000;
const CUSTOMER_ACCEPTED_AT_MS = REQUESTED_AT_MS + 6 * 60 * 1000;
const OBSERVED_AT_MS = REQUESTED_AT_MS + 7 * 60 * 1000;
const CONFIRMED_AT_MS = REQUESTED_AT_MS + 8 * 60 * 1000;
const DECIDED_AT_MS = REQUESTED_AT_MS + 9 * 60 * 1000;
const APPROVED_AT = new Date(APPROVED_AT_MS).toISOString();
const CONFIRMED_AT = new Date(CONFIRMED_AT_MS).toISOString();
const DECIDED_AT = new Date(DECIDED_AT_MS).toISOString();

let assertionCount = 0;

function equal<T>(actual: T, expected: T, message?: string): void {
  assert.equal(actual, expected, message);
  assertionCount += 1;
}

function deepEqual(
  actual: unknown,
  expected: unknown,
  message?: string,
): void {
  assert.deepEqual(actual, expected, message);
  assertionCount += 1;
}

function ok(value: unknown, message?: string): asserts value {
  assert.ok(value, message);
  assertionCount += 1;
}

function includes(
  value: readonly string[] | string,
  expected: string,
  message?: string,
): void {
  assert.ok(value.includes(expected), message);
  assertionCount += 1;
}

function throws(
  callback: () => unknown,
  matcher?: RegExp,
): void {
  if (matcher === undefined) {
    assert.throws(callback);
  } else {
    assert.throws(callback, matcher);
  }
  assertionCount += 1;
}

function asObject(value: JsonValue | undefined): JsonObject {
  assert.ok(
    typeof value === "object" &&
      value !== null &&
      !Array.isArray(value),
    "expected object",
  );
  assertionCount += 1;
  return value as JsonObject;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function checkedBody(
  serviceCode = "datanet.object-integrity-check.v1",
  serviceName = "DataNet Object Integrity Check",
  requesterReference = "open-research-archive-pilot-001",
): string {
  return Object.entries({
    "Paid DataNet service": `${serviceCode} — ${serviceName}`,
    "Public project or organization name": "Open Research Archive",
    "Public requester reference": requesterReference,
    "Estimated object count": "2",
    "Estimated total bytes": "1048577",
    "Public object references":
      "https://example.org/public-object-1\nsha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    "Desired outcome":
      "Verify that the listed public objects match their published SHA-256 digests.",
    "Desired completion window": "Within 3 days",
    "Quote readiness": "Ready to receive a deterministic quote",
    "Additional public context": "Admission Decision integration fixture.",
    "Required acknowledgements": [
      "- [x] I understand this issue and everything I post in it may be publicly visible.",
      "- [x] I confirm I have not included passwords, API keys, private keys, seed phrases, payment credentials, personal data, confidential data, or private dataset contents.",
      "- [x] I have the right to submit every referenced object, URL, manifest, and dataset reference for this requested service.",
      "- [x] I understand submission does not create a contract, collect payment, guarantee acceptance, or authorize work.",
      "- [x] I understand an operator must review the request, issue the deterministic quote, provide approved payment instructions separately, verify payment evidence, and explicitly admit the work before execution.",
    ].join("\n"),
  })
    .map(([label, value]) => `### ${label}\n\n${value}`)
    .join("\n\n");
}

function issue(
  serviceCode = "datanet.object-integrity-check.v1",
  serviceName = "DataNet Object Integrity Check",
  requesterReference = "open-research-archive-pilot-001",
  issueNumber = 718,
): PaidDatanetPublicPilotIssueExportV1 {
  return {
    number: issueNumber,
    title: "[Paid DataNet Pilot]: Open Research Archive",
    body: checkedBody(serviceCode, serviceName, requesterReference),
    url: `https://github.com/6ZoSo9/void-node/issues/${issueNumber}`,
    author: {
      login: "public-customer-example",
    },
    createdAt: "2026-07-24T22:30:00.000Z",
    labels: [],
  };
}

function paymentEvidence(
  amountCents: number,
  suffix = "12345678",
): JsonObject {
  const transaction = `0x${suffix.padEnd(64, "a").slice(0, 64)}`;
  return {
    schema: PAYMENT_EVIDENCE_SCHEMA_V1,
    settlement_rail: "USDC_BASE",
    settlement_reference: `USDC_BASE:${transaction}`,
    settlement_evidence_sha256: sha256JsonV1({
      public_settlement_reference: transaction,
      chain: "base",
      confirmation_height: 12345678,
    }),
    verifier_id: "zoso.operator",
    verification_status: "VERIFIED",
    amount_cents: amountCents,
    currency: USD_CENTS,
    observed_at_ms: OBSERVED_AT_MS,
  };
}

function paymentChain(
  serviceCode = "datanet.object-integrity-check.v1",
  serviceName = "DataNet Object Integrity Check",
  requesterReference = "open-research-archive-pilot-001",
  issueNumber = 718,
) {
  const issueExport = issue(
    serviceCode,
    serviceName,
    requesterReference,
    issueNumber,
  );
  const issueText = JSON.stringify(issueExport);
  const triage = triagePaidDatanetPublicPilotIssueV1(
    issueExport,
    issueText,
  );
  const triageText = JSON.stringify(triage);
  const bridge = bridgePaidDatanetPublicPilotQuoteV1(
    triage,
    triageText,
    {
      issuer_name: "VOID Network",
      operator_cost_basis_cents: 500,
      requested_at_ms: REQUESTED_AT_MS,
    },
  );
  const bridgeJson = clone(bridge) as unknown as JsonObject;
  const approvalResult = approvePublicPilotQuoteV1({
    bridge_packet: bridgeJson,
    approver_display_name: "ZoSo Operator",
    approved_at: APPROVED_AT,
    confirmation: APPROVAL_CONFIRMATION_TOKEN_V1,
  });

  if (approvalResult.disposition !== APPROVED_DISPOSITION_V1) {
    throw new Error("approval chain unexpectedly held");
  }

  const approval = approvalResult as QuoteApprovalReadyV1;
  const wrapper = asObject(approval.approved_quote_packet);
  const quotePacket =
    asObject(wrapper.quote_packet) as unknown as PaidDatanetQuotePacketV1;
  const evidence = paymentEvidence(
    quotePacket.quote.pricing.quoted_total_cents,
    String(issueNumber),
  );
  const approvalJson = clone(approval) as JsonObject;
  const paymentResult = confirmPublicPilotPaymentV1({
    approval_packet: approvalJson,
    payment_evidence: evidence,
    customer_accepted_at_ms: CUSTOMER_ACCEPTED_AT_MS,
    confirmer_display_name: "ZoSo Payment Verifier",
    confirmed_at: CONFIRMED_AT,
    confirmation: PAYMENT_CONFIRMATION_TOKEN_V1,
  });

  if (
    paymentResult.disposition !==
    PAYMENT_CONFIRMED_DISPOSITION_V1
  ) {
    throw new Error("payment confirmation unexpectedly held");
  }

  return {
    issueExport,
    triage,
    bridge,
    approval,
    quotePacket,
    evidence,
    payment: paymentResult as PaymentConfirmationReadyV1,
  };
}

function readyDecision(
  payment: PaymentConfirmationReadyV1,
  existingReceipts: JsonValue = [],
  decision = "APPROVE",
  reasonCode = "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
  decidedAt = DECIDED_AT,
) {
  return decidePublicPilotAdmissionV1({
    payment_confirmation_packet: clone(payment) as JsonObject,
    existing_receipts: clone(existingReceipts),
    operator_id: "zoso.operator",
    decision,
    reason_code: reasonCode,
    decided_at: decidedAt,
    confirmation: ADMISSION_DECISION_TOKEN_V1,
  });
}

function holdMutation(
  payment: PaymentConfirmationReadyV1,
  mutate: (packet: JsonObject) => void,
  expectedError: string,
): AdmissionDecisionHoldV1 {
  const packet = clone(payment) as JsonObject;
  mutate(packet);
  const result = decidePublicPilotAdmissionV1({
    payment_confirmation_packet: packet,
    existing_receipts: [],
    operator_id: "zoso.operator",
    decision: "APPROVE",
    reason_code: "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
    decided_at: DECIDED_AT,
    confirmation: ADMISSION_DECISION_TOKEN_V1,
  });

  equal(
    result.disposition,
    ADMISSION_DECISION_HOLD_DISPOSITION_V1,
  );

  if (
    result.disposition !==
    ADMISSION_DECISION_HOLD_DISPOSITION_V1
  ) {
    throw new Error("mutation unexpectedly passed");
  }

  includes(result.errors.join("\n"), expectedError);
  equal(result.admission_authorized, false);
  equal(result.execution_authorized, false);
  return result;
}

const primary = paymentChain();
const approvedResult = readyDecision(primary.payment);

equal(
  approvedResult.disposition,
  ADMISSION_DECISION_RECEIPT_DISPOSITION_V1,
);

if (
  approvedResult.disposition !==
  ADMISSION_DECISION_RECEIPT_DISPOSITION_V1
) {
  throw new Error("approved admission decision unexpectedly held");
}

const approved = approvedResult as AdmissionDecisionReadyV1;
const approvedRequest = approved
  .admission_request as unknown as PaidDatanetAdmissionRequestV1;
const approvedReceipt = approved
  .admission_receipt as unknown as PaidDatanetAdmissionReceiptV1;
const approvedChain = approved
  .admission_receipt_chain as unknown as PaidDatanetAdmissionReceiptV1[];

equal(approved.schema, ADMISSION_DECISION_SCHEMA_V1);
equal(
  approved.marker,
  VOID_PAID_DATANET_PUBLIC_PILOT_ADMISSION_DECISION_CLI_V1,
);
equal(
  approved.disposition,
  ADMISSION_DECISION_RECEIPT_DISPOSITION_V1,
);
equal(
  approved.payment_confirmation_packet_sha256,
  sha256JsonV1(clone(primary.payment) as JsonObject),
);
equal(
  approved.payment_confirmation_id,
  primary.payment.payment_confirmation_id,
);
equal(approved.approval_id, primary.payment.approval_id);
equal(approved.bridge_id, primary.payment.bridge_id);
equal(approved.triage_id, primary.payment.triage_id);
equal(
  approved.quote_packet_sha256,
  primary.payment.quote_packet_sha256,
);
equal(approved.quote_id, primary.payment.quote_id);
equal(approved.service_code, primary.payment.service_code);
equal(approved.requester_id, primary.payment.requester_id);
equal(
  approved.quoted_total_cents,
  primary.payment.quoted_total_cents,
);
equal(approved.currency, USD_CENTS);
equal(
  approved.admission_request_id,
  approvedRequest.admission_request_id,
);
equal(approved.existing_receipt_chain_sha256, sha256JsonV1([]));
equal(approved.prior_receipt_count, 0);
equal(approved.operator_id, "zoso.operator");
equal(approved.decision, "APPROVE");
equal(
  approved.reason_code,
  "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
);
equal(approved.decided_at, DECIDED_AT);
equal(approved.decided_at_ms, DECIDED_AT_MS);
equal(approved.receipt_sha256, approvedReceipt.receipt_sha256);
equal(approved.receipt_sequence, 1);
equal(approved.previous_receipt_sha256, null);
equal(
  approved.status,
  "ADMITTED_AWAITING_SEPARATE_EXECUTION",
);
equal(approved.actual_payment_confirmation_contract_consumed, true);
equal(approved.payment_confirmation_integrity_verified, true);
equal(approved.canonical_admission_request_created, true);
equal(approved.canonical_admission_request_verified, true);
equal(approved.existing_receipt_chain_verified, true);
equal(approved.append_only_admission_receipt, true);
equal(approved.duplicate_decision_rejected, true);
equal(approved.explicit_operator_confirmation_required, true);
equal(approved.operator_admission_decision_recorded, true);
equal(approved.automatic_admission_enabled, false);
equal(approved.admission_authorized, true);
equal(approved.execution_authorized, false);
equal(approved.automatic_execution_enabled, false);
equal(approved.payment_collection_enabled, false);
equal(approved.payment_movement_enabled, false);
equal(approved.github_api_access_enabled, false);
equal(approved.network_access_enabled, false);
equal(approved.filesystem_write_enabled, false);
equal(approved.wc_mutation_enabled, false);
equal(approved.treasury_access_enabled, false);
equal(verifyPaidDatanetAdmissionRequestV1(approvedRequest), true);
equal(verifyPaidDatanetAdmissionReceiptChainV1(approvedChain), true);
equal(approvedChain.length, 1);
deepEqual(approvedChain[0], approvedReceipt);
equal(approvedReceipt.sequence, 1);
equal(approvedReceipt.previous_receipt_sha256, null);
equal(
  approvedReceipt.admission_request_id,
  approvedRequest.admission_request_id,
);
equal(approvedReceipt.quote_id, approvedRequest.quote.quote_id);
equal(
  approvedReceipt.service_code,
  approvedRequest.quote.service_code,
);
equal(
  approvedReceipt.requester_id,
  approvedRequest.quote.requester_id,
);
equal(approvedReceipt.operator_id, "zoso.operator");
equal(approvedReceipt.decision, "APPROVE");
equal(
  approvedReceipt.reason_code,
  "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
);
equal(approvedReceipt.decided_at_ms, DECIDED_AT_MS);
equal(
  approvedReceipt.status,
  "ADMITTED_AWAITING_SEPARATE_EXECUTION",
);
equal(approvedReceipt.controls.append_only_receipt, true);
equal(approvedReceipt.controls.payment_collection_enabled, false);
equal(approvedReceipt.controls.execution_authorized, false);
equal(approvedReceipt.controls.automatic_execution_enabled, false);
equal(approvedReceipt.controls.wc_mutation_enabled, false);
equal(approvedReceipt.controls.treasury_access_enabled, false);
equal(
  approved.admission_decision_id,
  sha256JsonV1({
    schema: ADMISSION_DECISION_SCHEMA_V1,
    payment_confirmation_packet_sha256:
      approved.payment_confirmation_packet_sha256,
    payment_confirmation_id: approved.payment_confirmation_id,
    admission_request_id: approved.admission_request_id,
    receipt_sha256: approved.receipt_sha256,
    operator_id: approved.operator_id,
    decision: approved.decision,
    reason_code: approved.reason_code,
    decided_at: approved.decided_at,
    confirmation: ADMISSION_DECISION_TOKEN_V1,
  }),
);

const deterministic = readyDecision(primary.payment);
deepEqual(deterministic, approved);
equal(
  canonicalJsonV1(deterministic as JsonObject),
  canonicalJsonV1(approved as JsonObject),
);

for (const reasonCode of [
  "CAPACITY_UNAVAILABLE",
  "PAYMENT_EVIDENCE_REJECTED",
  "POLICY_REJECTED",
  "REQUESTER_CANCELLED",
] as const) {
  const rejectedResult = readyDecision(
    primary.payment,
    [],
    "REJECT",
    reasonCode,
  );
  equal(
    rejectedResult.disposition,
    ADMISSION_DECISION_RECEIPT_DISPOSITION_V1,
  );

  if (
    rejectedResult.disposition !==
    ADMISSION_DECISION_RECEIPT_DISPOSITION_V1
  ) {
    throw new Error("rejection unexpectedly held");
  }

  equal(rejectedResult.decision, "REJECT");
  equal(rejectedResult.reason_code, reasonCode);
  equal(rejectedResult.status, "REJECTED");
  equal(rejectedResult.admission_authorized, false);
  equal(rejectedResult.execution_authorized, false);
  equal(rejectedResult.automatic_admission_enabled, false);
  equal(rejectedResult.receipt_sequence, 1);
  equal(rejectedResult.previous_receipt_sha256, null);
  equal(
    verifyPaidDatanetAdmissionReceiptChainV1(
      rejectedResult
        .admission_receipt_chain as unknown as PaidDatanetAdmissionReceiptV1[],
    ),
    true,
  );
}

const secondary = paymentChain(
  "datanet.public-retrieval-evidence.v1",
  "DataNet Public Retrieval Evidence",
  "secondary-public-request-002",
  719,
);
const secondaryDecision = readyDecision(secondary.payment);

if (
  secondaryDecision.disposition !==
  ADMISSION_DECISION_RECEIPT_DISPOSITION_V1
) {
  throw new Error("secondary decision unexpectedly held");
}

const secondOnChain = readyDecision(
  primary.payment,
  secondaryDecision.admission_receipt_chain,
);

equal(
  secondOnChain.disposition,
  ADMISSION_DECISION_RECEIPT_DISPOSITION_V1,
);

if (
  secondOnChain.disposition !==
  ADMISSION_DECISION_RECEIPT_DISPOSITION_V1
) {
  throw new Error("second chain decision unexpectedly held");
}

equal(secondOnChain.prior_receipt_count, 1);
equal(secondOnChain.receipt_sequence, 2);
equal(
  secondOnChain.previous_receipt_sha256,
  secondaryDecision.receipt_sha256,
);
equal(
  verifyPaidDatanetAdmissionReceiptChainV1(
    secondOnChain
      .admission_receipt_chain as unknown as PaidDatanetAdmissionReceiptV1[],
  ),
  true,
);
equal(
  secondOnChain.admission_receipt_chain.length,
  2,
);
deepEqual(
  secondOnChain.admission_receipt_chain[0],
  secondaryDecision.admission_receipt_chain[0],
);

const duplicate = readyDecision(
  primary.payment,
  approved.admission_receipt_chain,
);
equal(
  duplicate.disposition,
  ADMISSION_DECISION_HOLD_DISPOSITION_V1,
);
if (
  duplicate.disposition !==
  ADMISSION_DECISION_HOLD_DISPOSITION_V1
) {
  throw new Error("duplicate decision unexpectedly passed");
}
includes(
  duplicate.errors.join("\n"),
  "admission request already has a decision receipt",
);
equal(duplicate.duplicate_decision_rejected, true);
equal(duplicate.admission_authorized, false);

const invalidChains = [
  {
    mutate(chain: JsonValue[]): void {
      const first = asObject(chain[0]);
      first.sequence = 2;
    },
    error: "existing admission receipt chain is invalid",
  },
  {
    mutate(chain: JsonValue[]): void {
      const first = asObject(chain[0]);
      first.receipt_sha256 = "0".repeat(64);
    },
    error: "existing admission receipt chain is invalid",
  },
  {
    mutate(chain: JsonValue[]): void {
      const first = asObject(chain[0]);
      first.previous_receipt_sha256 = "1".repeat(64);
    },
    error: "existing admission receipt chain is invalid",
  },
  {
    mutate(chain: JsonValue[]): void {
      const first = asObject(chain[0]);
      first.status = "REJECTED";
    },
    error: "existing admission receipt chain is invalid",
  },
  {
    mutate(chain: JsonValue[]): void {
      const first = asObject(chain[0]);
      chain.push(clone(first));
    },
    error: "existing admission receipt chain is invalid",
  },
];

for (const test of invalidChains) {
  const chain = clone(
    approved.admission_receipt_chain,
  ) as JsonValue[];
  test.mutate(chain);
  const result = readyDecision(primary.payment, chain);
  equal(
    result.disposition,
    ADMISSION_DECISION_HOLD_DISPOSITION_V1,
  );
  if (
    result.disposition !==
    ADMISSION_DECISION_HOLD_DISPOSITION_V1
  ) {
    throw new Error("invalid chain unexpectedly passed");
  }
  includes(result.errors.join("\n"), test.error);
  equal(result.existing_receipt_chain_verified, undefined);
  equal(result.admission_authorized, false);
}

const nonArrayReceipts = readyDecision(
  primary.payment,
  {} as JsonValue,
);
equal(
  nonArrayReceipts.disposition,
  ADMISSION_DECISION_HOLD_DISPOSITION_V1,
);
if (
  nonArrayReceipts.disposition !==
  ADMISSION_DECISION_HOLD_DISPOSITION_V1
) {
  throw new Error("non-array receipts unexpectedly passed");
}
includes(
  nonArrayReceipts.errors.join("\n"),
  "existing_receipts must be a JSON array",
);

const nonObjectReceipt = readyDecision(
  primary.payment,
  ["not-an-object"],
);
equal(
  nonObjectReceipt.disposition,
  ADMISSION_DECISION_HOLD_DISPOSITION_V1,
);
if (
  nonObjectReceipt.disposition !==
  ADMISSION_DECISION_HOLD_DISPOSITION_V1
) {
  throw new Error("non-object receipt unexpectedly passed");
}
includes(
  nonObjectReceipt.errors.join("\n"),
  "existing_receipts entries must be JSON objects",
);

const secretReceipt = readyDecision(
  primary.payment,
  [{ note: ["-----BEGIN", "PRIVATE KEY-----"].join(" ") }],
);
equal(
  secretReceipt.disposition,
  ADMISSION_DECISION_HOLD_DISPOSITION_V1,
);
if (
  secretReceipt.disposition !==
  ADMISSION_DECISION_HOLD_DISPOSITION_V1
) {
  throw new Error("secret receipt unexpectedly passed");
}
includes(
  secretReceipt.errors.join("\n"),
  "existing receipt chain contains a secret-shaped value",
);

const mutationCases: Array<{
  mutate: (packet: JsonObject) => void;
  error: string;
}> = [
  {
    mutate(packet): void {
      packet.schema = "wrong-schema";
    },
    error: "payment confirmation schema mismatch",
  },
  {
    mutate(packet): void {
      packet.marker = "WRONG_MARKER";
    },
    error: "payment confirmation marker mismatch",
  },
  {
    mutate(packet): void {
      packet.disposition = "HOLD_FOR_PAYMENT_REVIEW";
    },
    error: "payment confirmation disposition mismatch",
  },
  {
    mutate(packet): void {
      packet.payment_confirmation_id = "0".repeat(64);
    },
    error: "payment_confirmation_id integrity check failed",
  },
  {
    mutate(packet): void {
      packet.approval_id = "0".repeat(64);
    },
    error: "payment_confirmation_id integrity check failed",
  },
  {
    mutate(packet): void {
      packet.bridge_id = "0".repeat(64);
    },
    error: "confirmed_payment_packet bridge_id mismatch",
  },
  {
    mutate(packet): void {
      packet.triage_id = "0".repeat(64);
    },
    error: "confirmed_payment_packet triage_id mismatch",
  },
  {
    mutate(packet): void {
      packet.quote_packet_sha256 = "0".repeat(64);
    },
    error: "payment_confirmation_id integrity check failed",
  },
  {
    mutate(packet): void {
      packet.quote_id = "0".repeat(64);
    },
    error: "payment_confirmation_id integrity check failed",
  },
  {
    mutate(packet): void {
      packet.service_code = "bad";
    },
    error: "payment confirmation admission-request binding mismatch",
  },
  {
    mutate(packet): void {
      packet.requester_id = "bad";
    },
    error: "payment confirmation admission-request binding mismatch",
  },
  {
    mutate(packet): void {
      packet.quoted_total_cents = 1;
    },
    error: "payment confirmation admission-request binding mismatch",
  },
  {
    mutate(packet): void {
      packet.currency = "VOID";
    },
    error: "payment confirmation currency mismatch",
  },
  {
    mutate(packet): void {
      packet.approval_packet_sha256 = "x";
    },
    error: "approval_packet_sha256 must be lowercase SHA-256 hex",
  },
  {
    mutate(packet): void {
      packet.payment_evidence_packet_sha256 = "x";
    },
    error: "payment_evidence_packet_sha256 must be lowercase SHA-256 hex",
  },
  {
    mutate(packet): void {
      packet.confirmer_display_name = "";
    },
    error: "confirmer_display_name is missing or invalid",
  },
  {
    mutate(packet): void {
      packet.confirmed_at = "not-a-time";
    },
    error: "confirmed_at must be canonical ISO-8601 UTC",
  },
  {
    mutate(packet): void {
      packet.confirmation_token_verified = false;
    },
    error: "payment confirmation confirmation_token_verified must be true",
  },
  {
    mutate(packet): void {
      packet.payment_verified = false;
    },
    error: "payment confirmation payment_verified must be true",
  },
  {
    mutate(packet): void {
      packet.exact_amount_and_currency_verified = false;
    },
    error:
      "payment confirmation exact_amount_and_currency_verified must be true",
  },
  {
    mutate(packet): void {
      packet.approval_source_chain_verified = false;
    },
    error:
      "payment confirmation approval_source_chain_verified must be true",
  },
  {
    mutate(packet): void {
      packet.quote_packet_verified = false;
    },
    error: "payment confirmation quote_packet_verified must be true",
  },
  {
    mutate(packet): void {
      packet.admission_request_compatible = false;
    },
    error:
      "payment confirmation admission_request_compatible must be true",
  },
  {
    mutate(packet): void {
      packet.operator_admission_decision_required = false;
    },
    error:
      "payment confirmation operator_admission_decision_required must be true",
  },
  ...[
    "payment_collection_enabled",
    "payment_movement_enabled",
    "wallet_access_enabled",
    "private_key_input_allowed",
    "admission_authorized",
    "execution_authorized",
    "automatic_execution_enabled",
    "github_api_access_enabled",
    "network_access_enabled",
    "filesystem_write_enabled",
    "wc_mutation_enabled",
    "treasury_access_enabled",
  ].map((field) => ({
    mutate(packet: JsonObject): void {
      packet[field] = true;
    },
    error: `payment confirmation ${field} must be false`,
  })),
  {
    mutate(packet): void {
      delete packet.admission_request_input;
    },
    error: "admission_request_input is missing or invalid",
  },
  {
    mutate(packet): void {
      delete packet.confirmed_payment_packet;
    },
    error: "confirmed_payment_packet is missing or invalid",
  },
  {
    mutate(packet): void {
      const input = asObject(packet.admission_request_input);
      input.submitted_at_ms = CONFIRMED_AT_MS + 1;
    },
    error:
      "admission_request_input.submitted_at_ms does not match confirmed_at",
  },
  {
    mutate(packet): void {
      const input = asObject(packet.admission_request_input);
      const acceptance = asObject(input.customer_acceptance);
      acceptance.accepted_total_cents = 1;
    },
    error: "canonical admission request creation failed",
  },
  {
    mutate(packet): void {
      const input = asObject(packet.admission_request_input);
      const evidence = asObject(input.payment_evidence);
      evidence.verification_status = "UNVERIFIED";
    },
    error: "canonical admission request creation failed",
  },
  {
    mutate(packet): void {
      const input = asObject(packet.admission_request_input);
      const quote = asObject(input.quote);
      quote.quote_id = "0".repeat(64);
    },
    error: "canonical admission request creation failed",
  },
  {
    mutate(packet): void {
      const confirmedPacket = asObject(
        packet.confirmed_payment_packet,
      );
      confirmedPacket.payment_status = "WRONG";
    },
    error: "confirmed_payment_packet payment_status mismatch",
  },
  {
    mutate(packet): void {
      const confirmedPacket = asObject(
        packet.confirmed_payment_packet,
      );
      confirmedPacket.admission_authorized = true;
    },
    error:
      "confirmed_payment_packet admission_authorized mismatch",
  },
  {
    mutate(packet): void {
      const confirmedPacket = asObject(
        packet.confirmed_payment_packet,
      );
      const nested = asObject(
        confirmedPacket.admission_request_input,
      );
      nested.submitted_at_ms = CONFIRMED_AT_MS + 1;
    },
    error: "confirmed payment packet admission input mismatch",
  },
  {
    mutate(packet): void {
      packet.note = ["-----BEGIN", "PRIVATE KEY-----"].join(" ");
    },
    error:
      "payment confirmation packet contains a secret-shaped value",
  },
];

for (const test of mutationCases) {
  holdMutation(primary.payment, test.mutate, test.error);
}

const invalidInputCases = [
  {
    operator_id: "x",
    decision: "APPROVE",
    reason_code: "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
    decided_at: DECIDED_AT,
    confirmation: ADMISSION_DECISION_TOKEN_V1,
    error: "operator_id must be a bounded identifier",
  },
  {
    operator_id: "zoso.operator",
    decision: "MAYBE",
    reason_code: "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
    decided_at: DECIDED_AT,
    confirmation: ADMISSION_DECISION_TOKEN_V1,
    error: "decision must equal APPROVE or REJECT",
  },
  {
    operator_id: "zoso.operator",
    decision: "APPROVE",
    reason_code: "CAPACITY_UNAVAILABLE",
    decided_at: DECIDED_AT,
    confirmation: ADMISSION_DECISION_TOKEN_V1,
    error:
      "APPROVE requires PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
  },
  {
    operator_id: "zoso.operator",
    decision: "REJECT",
    reason_code: "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
    decided_at: DECIDED_AT,
    confirmation: ADMISSION_DECISION_TOKEN_V1,
    error: "REJECT requires a canonical rejection reason",
  },
  {
    operator_id: "zoso.operator",
    decision: "REJECT",
    reason_code: "NOT_A_REASON",
    decided_at: DECIDED_AT,
    confirmation: ADMISSION_DECISION_TOKEN_V1,
    error: "REJECT requires a canonical rejection reason",
  },
  {
    operator_id: "zoso.operator",
    decision: "APPROVE",
    reason_code: "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
    decided_at: "not-a-time",
    confirmation: ADMISSION_DECISION_TOKEN_V1,
    error: "decided_at must be canonical ISO-8601 UTC",
  },
  {
    operator_id: "zoso.operator",
    decision: "APPROVE",
    reason_code: "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
    decided_at: new Date(CONFIRMED_AT_MS - 1).toISOString(),
    confirmation: ADMISSION_DECISION_TOKEN_V1,
    error: "decided_at must not precede admission submission",
  },
  {
    operator_id: "zoso.operator",
    decision: "APPROVE",
    reason_code: "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
    decided_at: DECIDED_AT,
    confirmation: "wrong-token",
    error: `confirmation must equal ${ADMISSION_DECISION_TOKEN_V1}`,
  },
];

for (const test of invalidInputCases) {
  const result = decidePublicPilotAdmissionV1({
    payment_confirmation_packet:
      clone(primary.payment) as JsonObject,
    existing_receipts: [],
    operator_id: test.operator_id,
    decision: test.decision,
    reason_code: test.reason_code,
    decided_at: test.decided_at,
    confirmation: test.confirmation,
  });
  equal(
    result.disposition,
    ADMISSION_DECISION_HOLD_DISPOSITION_V1,
  );
  if (
    result.disposition !==
    ADMISSION_DECISION_HOLD_DISPOSITION_V1
  ) {
    throw new Error("invalid input unexpectedly passed");
  }
  includes(result.errors.join("\n"), test.error);
  equal(result.admission_authorized, false);
  equal(result.execution_authorized, false);
}

const serviceFixtures = [
  [
    "datanet.object-integrity-check.v1",
    "DataNet Object Integrity Check",
    "service-fixture-001",
    720,
  ],
  [
    "datanet.public-retrieval-evidence.v1",
    "DataNet Public Retrieval Evidence",
    "service-fixture-002",
    721,
  ],
  [
    "datanet.dataset-replication-audit.v1",
    "DataNet Dataset Replication Audit",
    "service-fixture-003",
    722,
  ],
] as const;

for (const [code, name, requesterReference, number] of serviceFixtures) {
  const chain = paymentChain(
    code,
    name,
    requesterReference,
    number,
  );
  const result = readyDecision(chain.payment);
  equal(
    result.disposition,
    ADMISSION_DECISION_RECEIPT_DISPOSITION_V1,
  );
  if (
    result.disposition !==
    ADMISSION_DECISION_RECEIPT_DISPOSITION_V1
  ) {
    throw new Error("service fixture unexpectedly held");
  }
  equal(result.service_code, code);
  equal(result.quote_id, chain.payment.quote_id);
  equal(result.payment_confirmation_id, chain.payment.payment_confirmation_id);
  equal(result.admission_authorized, true);
  equal(result.execution_authorized, false);
  equal(result.status, "ADMITTED_AWAITING_SEPARATE_EXECUTION");
  equal(
    verifyPaidDatanetAdmissionRequestV1(
      result.admission_request as unknown as PaidDatanetAdmissionRequestV1,
    ),
    true,
  );
  equal(
    verifyPaidDatanetAdmissionReceiptChainV1(
      result
        .admission_receipt_chain as unknown as PaidDatanetAdmissionReceiptV1[],
    ),
    true,
  );
}

throws(
  () =>
    appendPaidDatanetAdmissionDecisionV1(
      approvedChain,
      {
        admission_request: approvedRequest,
        operator_id: "zoso.operator",
        decision: "APPROVE",
        reason_code:
          "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
        decided_at_ms: DECIDED_AT_MS + 1,
      },
    ),
  /already has a decision receipt/u,
);

throws(
  () =>
    appendPaidDatanetAdmissionDecisionV1(
      [],
      {
        admission_request: approvedRequest,
        operator_id: "zoso.operator",
        decision: "APPROVE",
        reason_code: "CAPACITY_UNAVAILABLE",
        decided_at_ms: DECIDED_AT_MS,
      },
    ),
  /APPROVE requires/u,
);

throws(
  () =>
    appendPaidDatanetAdmissionDecisionV1(
      [],
      {
        admission_request: approvedRequest,
        operator_id: "zoso.operator",
        decision: "REJECT",
        reason_code:
          "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
        decided_at_ms: DECIDED_AT_MS,
      },
    ),
  /REJECT requires/u,
);

throws(
  () =>
    appendPaidDatanetAdmissionDecisionV1(
      [],
      {
        admission_request: approvedRequest,
        operator_id: "zoso.operator",
        decision: "APPROVE",
        reason_code:
          "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
        decided_at_ms: approvedRequest.submitted_at_ms - 1,
      },
    ),
  /decided_at_ms/u,
);

const invalidRequest = clone(
  approvedRequest,
) as PaidDatanetAdmissionRequestV1;
(invalidRequest as unknown as JsonObject).admission_request_id =
  "0".repeat(64);

throws(
  () =>
    appendPaidDatanetAdmissionDecisionV1(
      [],
      {
        admission_request: invalidRequest,
        operator_id: "zoso.operator",
        decision: "APPROVE",
        reason_code:
          "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
        decided_at_ms: DECIDED_AT_MS,
      },
    ),
  /integrity check failed/u,
);

const files = new Map<string, string>([
  ["/payment.json", JSON.stringify(primary.payment)],
  ["/receipts.json", JSON.stringify([])],
  ["/bad-payment.json", "[]"],
  ["/bad-receipts.json", "{}"],
  ["/invalid-json", "{"],
]);

const cliReady = runAdmissionDecisionCliV1(
  [
    "--payment-confirmation",
    "/payment.json",
    "--receipts",
    "/receipts.json",
    "--operator",
    "zoso.operator",
    "--decision",
    "APPROVE",
    "--reason",
    "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
    "--decided-at",
    DECIDED_AT,
    "--confirm",
    ADMISSION_DECISION_TOKEN_V1,
  ],
  (path) => {
    const value = files.get(path);
    if (value === undefined) {
      throw new Error(`missing fixture: ${path}`);
    }
    return value;
  },
);

equal(cliReady.exit_code, 0);
const cliReadyJson = JSON.parse(cliReady.stdout) as AdmissionDecisionReadyV1;
equal(
  cliReadyJson.disposition,
  ADMISSION_DECISION_RECEIPT_DISPOSITION_V1,
);
equal(cliReadyJson.admission_authorized, true);
equal(cliReadyJson.execution_authorized, false);
equal(cliReadyJson.receipt_sequence, 1);

const cliReject = runAdmissionDecisionCliV1(
  [
    "--payment-confirmation",
    "/payment.json",
    "--receipts",
    "/receipts.json",
    "--operator",
    "zoso.operator",
    "--decision",
    "REJECT",
    "--reason",
    "CAPACITY_UNAVAILABLE",
    "--decided-at",
    DECIDED_AT,
    "--confirm",
    ADMISSION_DECISION_TOKEN_V1,
  ],
  (path) => files.get(path) ?? "",
);
equal(cliReject.exit_code, 0);
const cliRejectJson = JSON.parse(cliReject.stdout) as AdmissionDecisionReadyV1;
equal(cliRejectJson.status, "REJECTED");
equal(cliRejectJson.admission_authorized, false);

const cliFailureCases: Array<{
  args: string[];
  error: string;
}> = [
  {
    args: [],
    error: "usage:",
  },
  {
    args: ["--payment-confirmation", "/payment.json"],
    error: "usage:",
  },
  {
    args: [
      "--payment-confirmation",
      "/payment.json",
      "--payment-confirmation",
      "/payment.json",
      "--receipts",
      "/receipts.json",
      "--operator",
      "zoso.operator",
      "--decision",
      "APPROVE",
      "--reason",
      "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
      "--decided-at",
      DECIDED_AT,
      "--confirm",
      ADMISSION_DECISION_TOKEN_V1,
    ],
    error: "duplicate argument",
  },
  {
    args: [
      "--payment-confirmation",
      "/invalid-json",
      "--receipts",
      "/receipts.json",
      "--operator",
      "zoso.operator",
      "--decision",
      "APPROVE",
      "--reason",
      "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
      "--decided-at",
      DECIDED_AT,
      "--confirm",
      ADMISSION_DECISION_TOKEN_V1,
    ],
    error: "JSON",
  },
  {
    args: [
      "--payment-confirmation",
      "/bad-payment.json",
      "--receipts",
      "/receipts.json",
      "--operator",
      "zoso.operator",
      "--decision",
      "APPROVE",
      "--reason",
      "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
      "--decided-at",
      DECIDED_AT,
      "--confirm",
      ADMISSION_DECISION_TOKEN_V1,
    ],
    error: "payment confirmation JSON must be an object",
  },
  {
    args: [
      "--payment-confirmation",
      "/payment.json",
      "--receipts",
      "/bad-receipts.json",
      "--operator",
      "zoso.operator",
      "--decision",
      "APPROVE",
      "--reason",
      "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
      "--decided-at",
      DECIDED_AT,
      "--confirm",
      ADMISSION_DECISION_TOKEN_V1,
    ],
    error: "existing_receipts must be a JSON array",
  },
  {
    args: [
      "--payment-confirmation",
      "/missing.json",
      "--receipts",
      "/receipts.json",
      "--operator",
      "zoso.operator",
      "--decision",
      "APPROVE",
      "--reason",
      "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
      "--decided-at",
      DECIDED_AT,
      "--confirm",
      ADMISSION_DECISION_TOKEN_V1,
    ],
    error: "missing fixture",
  },
];

for (const test of cliFailureCases) {
  const result = runAdmissionDecisionCliV1(
    test.args,
    (path) => {
      const value = files.get(path);
      if (value === undefined) {
        throw new Error(`missing fixture: ${path}`);
      }
      return value;
    },
  );
  equal(result.exit_code, 2);
  const decoded = JSON.parse(result.stdout) as AdmissionDecisionHoldV1;
  equal(
    decoded.disposition,
    ADMISSION_DECISION_HOLD_DISPOSITION_V1,
  );
  includes(decoded.errors.join("\n"), test.error);
  equal(decoded.admission_authorized, false);
  equal(decoded.execution_authorized, false);
  equal(decoded.payment_collection_enabled, false);
  equal(decoded.payment_movement_enabled, false);
}

if (assertionCount < 450) {
  throw new Error(
    `proof assertion count is unexpectedly low: ${assertionCount}`,
  );
}

const summary = {
  marker: VOID_PAID_DATANET_PUBLIC_PILOT_ADMISSION_DECISION_CLI_V1,
  schema: ADMISSION_DECISION_SCHEMA_V1,
  assertion_count: assertionCount,
  ready_disposition: ADMISSION_DECISION_RECEIPT_DISPOSITION_V1,
  hold_disposition: ADMISSION_DECISION_HOLD_DISPOSITION_V1,
  confirmation_token: ADMISSION_DECISION_TOKEN_V1,
  approval_status: "ADMITTED_AWAITING_SEPARATE_EXECUTION",
  rejection_status: "REJECTED",
  ready_admission_decision_id: approved.admission_decision_id,
  ready_admission_request_id: approved.admission_request_id,
  ready_receipt_sha256: approved.receipt_sha256,
  service_count: 3,
  actual_payment_confirmation_contract_consumed: true,
  payment_confirmation_integrity_verified: true,
  canonical_admission_request_created: true,
  canonical_admission_request_verified: true,
  existing_receipt_chain_verified: true,
  append_only_admission_receipt: true,
  duplicate_decision_rejected: true,
  explicit_operator_confirmation_required: true,
  operator_admission_decision_recorded: true,
  automatic_admission_enabled: false,
  execution_authorized: false,
  automatic_execution_enabled: false,
  payment_collection_enabled: false,
  payment_movement_enabled: false,
  network_access_enabled: false,
  filesystem_write_enabled: false,
  wc_mutation_enabled: false,
  treasury_access_enabled: false,
  status: "GREEN",
};

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
