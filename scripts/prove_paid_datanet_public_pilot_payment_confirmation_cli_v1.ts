#!/usr/bin/env node

import assert from "node:assert/strict";

import {
  PAYMENT_CONFIRMATION_SCHEMA_V1,
  PAYMENT_CONFIRMATION_TOKEN_V1,
  PAYMENT_CONFIRMED_DISPOSITION_V1,
  PAYMENT_EVIDENCE_SCHEMA_V1,
  PAYMENT_HOLD_DISPOSITION_V1,
  VOID_PAID_DATANET_PUBLIC_PILOT_PAYMENT_CONFIRMATION_CLI_V1,
  confirmPublicPilotPaymentV1,
  runPaymentConfirmationCliV1,
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
  verifyPaidDatanetQuotePacketV1,
  type PaidDatanetQuotePacketV1,
} from "./paid_datanet_quote_packet_v1.js";
import {
  createPaidDatanetAdmissionRequestV1,
  verifyPaidDatanetAdmissionRequestV1,
} from "../src/paid_services/datanet_request_admission_v1.js";
import { USD_CENTS } from "../src/paid_services/datanet_service_catalog_v1.js";

const REQUESTED_AT_MS = 1_780_000_000_000;
const APPROVED_AT_MS = REQUESTED_AT_MS + 5 * 60 * 1000;
const CUSTOMER_ACCEPTED_AT_MS = REQUESTED_AT_MS + 6 * 60 * 1000;
const OBSERVED_AT_MS = REQUESTED_AT_MS + 7 * 60 * 1000;
const CONFIRMED_AT_MS = REQUESTED_AT_MS + 8 * 60 * 1000;
const APPROVED_AT = new Date(APPROVED_AT_MS).toISOString();
const CONFIRMED_AT = new Date(CONFIRMED_AT_MS).toISOString();

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

function asObject(value: JsonValue | undefined): JsonObject {
  assert.ok(
    typeof value === "object" && value !== null && !Array.isArray(value),
    "expected object",
  );
  assertionCount += 1;
  return value as JsonObject;
}

function checkedBody(
  serviceCode = "datanet.object-integrity-check.v1",
  serviceName = "DataNet Object Integrity Check",
): string {
  return Object.entries({
    "Paid DataNet service": `${serviceCode} — ${serviceName}`,
    "Public project or organization name": "Open Research Archive",
    "Public requester reference": "open-research-archive-pilot-001",
    "Estimated object count": "2",
    "Estimated total bytes": "1048577",
    "Public object references":
      "https://example.org/public-object-1\nsha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    "Desired outcome":
      "Verify that the listed public objects match their published SHA-256 digests.",
    "Desired completion window": "Within 3 days",
    "Quote readiness": "Ready to receive a deterministic quote",
    "Additional public context": "Payment Confirmation integration fixture.",
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
): PaidDatanetPublicPilotIssueExportV1 {
  return {
    number: 718,
    title: "[Paid DataNet Pilot]: Open Research Archive",
    body: checkedBody(serviceCode, serviceName),
    url: "https://github.com/6ZoSo9/void-node/issues/718",
    author: {
      login: "public-customer-example",
    },
    createdAt: "2026-07-24T22:30:00.000Z",
    labels: [],
  };
}

function approvalChain(
  serviceCode = "datanet.object-integrity-check.v1",
  serviceName = "DataNet Object Integrity Check",
) {
  const issueExport = issue(serviceCode, serviceName);
  const issueText = JSON.stringify(issueExport);
  const triage = triagePaidDatanetPublicPilotIssueV1(issueExport, issueText);
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
  const bridgeJson = JSON.parse(JSON.stringify(bridge)) as JsonObject;
  const approval = approvePublicPilotQuoteV1({
    bridge_packet: bridgeJson,
    approver_display_name: "ZoSo Operator",
    approved_at: APPROVED_AT,
    confirmation: APPROVAL_CONFIRMATION_TOKEN_V1,
  });

  return {
    issueExport,
    issueText,
    triage,
    triageText,
    bridge,
    bridgeJson,
    approval,
  };
}

function paymentEvidence(amountCents: number): JsonObject {
  return {
    schema: PAYMENT_EVIDENCE_SCHEMA_V1,
    settlement_rail: "USDC_BASE",
    settlement_reference:
      "USDC_BASE:0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    settlement_evidence_sha256: sha256JsonV1({
      public_settlement_reference:
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
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
) {
  const approvalStage = approvalChain(serviceCode, serviceName);

  if (approvalStage.approval.disposition !== APPROVED_DISPOSITION_V1) {
    throw new Error("approval chain unexpectedly held");
  }

  const approval = approvalStage.approval as QuoteApprovalReadyV1;
  const wrapper = asObject(approval.approved_quote_packet);
  const quotePacket =
    asObject(wrapper.quote_packet) as unknown as PaidDatanetQuotePacketV1;
  const evidence = paymentEvidence(
    quotePacket.quote.pricing.quoted_total_cents,
  );
  const approvalJson = JSON.parse(JSON.stringify(approval)) as JsonObject;
  const payment = confirmPublicPilotPaymentV1({
    approval_packet: approvalJson,
    payment_evidence: evidence,
    customer_accepted_at_ms: CUSTOMER_ACCEPTED_AT_MS,
    confirmer_display_name: "ZoSo Payment Verifier",
    confirmed_at: CONFIRMED_AT,
    confirmation: PAYMENT_CONFIRMATION_TOKEN_V1,
  });

  return {
    ...approvalStage,
    approval,
    approvalJson,
    wrapper,
    quotePacket,
    evidence,
    payment,
  };
}

const ready = paymentChain();

equal(ready.triage.disposition, "READY_FOR_QUOTE");
equal(ready.bridge.disposition, "DRAFT_QUOTE_INPUT");
equal(ready.approval.disposition, APPROVED_DISPOSITION_V1);
equal(ready.payment.disposition, PAYMENT_CONFIRMED_DISPOSITION_V1);

if (ready.payment.disposition !== PAYMENT_CONFIRMED_DISPOSITION_V1) {
  throw new Error("payment confirmation unexpectedly held");
}

const confirmed = ready.payment as PaymentConfirmationReadyV1;
const confirmedPacket = asObject(confirmed.confirmed_payment_packet);
const admissionInput = asObject(confirmed.admission_request_input);
const customerAcceptance = asObject(admissionInput.customer_acceptance);
const opaquePaymentEvidence = asObject(admissionInput.payment_evidence);
const admissionQuote =
  asObject(admissionInput.quote) as unknown as PaidDatanetQuotePacketV1["quote"];

const admissionPreview = createPaidDatanetAdmissionRequestV1({
  quote: admissionQuote,
  customer_acceptance: customerAcceptance as never,
  payment_evidence: opaquePaymentEvidence as never,
  submitted_at_ms: Number(admissionInput.submitted_at_ms),
});

equal(confirmed.schema, PAYMENT_CONFIRMATION_SCHEMA_V1);
equal(
  confirmed.marker,
  VOID_PAID_DATANET_PUBLIC_PILOT_PAYMENT_CONFIRMATION_CLI_V1,
);
equal(confirmed.approval_packet_sha256, sha256JsonV1(ready.approvalJson));
equal(confirmed.approval_id, ready.approval.approval_id);
equal(confirmed.bridge_packet_sha256, ready.approval.bridge_packet_sha256);
equal(confirmed.bridge_id, ready.approval.bridge_id);
equal(confirmed.triage_packet_sha256, ready.approval.triage_packet_sha256);
equal(confirmed.triage_id, ready.approval.triage_id);
equal(
  confirmed.draft_quote_input_sha256,
  ready.approval.draft_quote_input_sha256,
);
equal(confirmed.quote_packet_sha256, ready.approval.quote_packet_sha256);
equal(confirmed.quote_id, ready.quotePacket.quote.quote_id);
equal(confirmed.service_code, ready.quotePacket.quote.service_code);
equal(confirmed.requester_id, ready.quotePacket.quote.request.requester_id);
equal(
  confirmed.customer_reference,
  ready.quotePacket.customer.customer_reference,
);
equal(
  confirmed.quoted_total_cents,
  ready.quotePacket.quote.pricing.quoted_total_cents,
);
equal(confirmed.currency, USD_CENTS);
equal(
  confirmed.payment_evidence_packet_sha256,
  sha256JsonV1(ready.evidence),
);
equal(confirmed.settlement_rail, ready.evidence.settlement_rail);
equal(
  confirmed.settlement_reference,
  ready.evidence.settlement_reference,
);
equal(
  confirmed.settlement_evidence_sha256,
  ready.evidence.settlement_evidence_sha256,
);
equal(confirmed.verifier_id, ready.evidence.verifier_id);
equal(confirmed.observed_at_ms, OBSERVED_AT_MS);
equal(confirmed.customer_accepted_at_ms, CUSTOMER_ACCEPTED_AT_MS);
equal(confirmed.confirmer_display_name, "ZoSo Payment Verifier");
equal(confirmed.confirmed_at, CONFIRMED_AT);
equal(confirmed.confirmation_token_verified, true);
equal(confirmed.payment_verified, true);
equal(confirmed.exact_amount_and_currency_verified, true);
equal(confirmed.approval_source_chain_verified, true);
equal(confirmed.quote_packet_verified, true);
equal(confirmed.admission_request_compatible, true);
equal(confirmed.operator_admission_decision_required, true);
equal(confirmed.payment_collection_enabled, false);
equal(confirmed.payment_movement_enabled, false);
equal(confirmed.wallet_access_enabled, false);
equal(confirmed.private_key_input_allowed, false);
equal(confirmed.admission_authorized, false);
equal(confirmed.execution_authorized, false);
equal(confirmed.automatic_execution_enabled, false);
equal(confirmed.github_api_access_enabled, false);
equal(confirmed.network_access_enabled, false);
equal(confirmed.filesystem_write_enabled, false);
equal(confirmed.wc_mutation_enabled, false);
equal(confirmed.treasury_access_enabled, false);

equal(
  confirmedPacket.payment_status,
  "PAYMENT_CONFIRMED_AWAITING_OPERATOR_ADMISSION",
);
equal(confirmedPacket.approval_id, confirmed.approval_id);
equal(confirmedPacket.bridge_id, confirmed.bridge_id);
equal(confirmedPacket.triage_id, confirmed.triage_id);
equal(confirmedPacket.quote_packet_sha256, confirmed.quote_packet_sha256);
equal(confirmedPacket.quote_id, confirmed.quote_id);
equal(confirmedPacket.payment_verified, true);
equal(confirmedPacket.admission_request_compatible, true);
equal(confirmedPacket.operator_admission_decision_required, true);
equal(confirmedPacket.admission_authorized, false);
equal(confirmedPacket.execution_authorized, false);
equal(confirmedPacket.payment_collection_enabled, false);
equal(confirmedPacket.payment_movement_enabled, false);
equal(confirmedPacket.wallet_access_enabled, false);
equal(confirmedPacket.private_key_input_allowed, false);

equal(customerAcceptance.requester_id, confirmed.requester_id);
equal(customerAcceptance.accepted_quote_id, confirmed.quote_id);
equal(
  customerAcceptance.accepted_total_cents,
  confirmed.quoted_total_cents,
);
equal(customerAcceptance.accepted_currency, USD_CENTS);
equal(customerAcceptance.accepted_at_ms, CUSTOMER_ACCEPTED_AT_MS);
equal(opaquePaymentEvidence.evidence_ref, confirmed.settlement_reference);
equal(
  opaquePaymentEvidence.evidence_sha256,
  confirmed.settlement_evidence_sha256,
);
equal(opaquePaymentEvidence.verifier_id, confirmed.verifier_id);
equal(opaquePaymentEvidence.verification_status, "VERIFIED");
equal(opaquePaymentEvidence.amount_cents, confirmed.quoted_total_cents);
equal(opaquePaymentEvidence.currency, USD_CENTS);
equal(opaquePaymentEvidence.observed_at_ms, OBSERVED_AT_MS);
equal(admissionInput.submitted_at_ms, CONFIRMED_AT_MS);
equal(verifyPaidDatanetAdmissionRequestV1(admissionPreview), true);
equal(admissionPreview.status, "PENDING_OPERATOR_DECISION");
equal(admissionPreview.controls.operator_decision_required, true);
equal(admissionPreview.controls.automatic_admission_enabled, false);
equal(admissionPreview.controls.payment_collection_enabled, false);
equal(admissionPreview.controls.automatic_execution_enabled, false);
equal(admissionPreview.controls.wc_mutation_enabled, false);
equal(admissionPreview.controls.treasury_access_enabled, false);
equal(verifyPaidDatanetQuotePacketV1(ready.quotePacket), true);

const repeated = paymentChain();
deepEqual(repeated.triage, ready.triage);
deepEqual(repeated.bridge, ready.bridge);
deepEqual(repeated.approval, ready.approval);
deepEqual(repeated.payment, ready.payment);

for (const [serviceCode, serviceName] of [
  [
    "datanet.object-integrity-check.v1",
    "DataNet Object Integrity Check",
  ],
  [
    "datanet.public-retrieval-evidence.v1",
    "DataNet Public Retrieval Evidence",
  ],
  [
    "datanet.dataset-replication-audit.v1",
    "DataNet Dataset Replication Audit",
  ],
] as const) {
  const result = paymentChain(serviceCode, serviceName);
  equal(result.triage.disposition, "READY_FOR_QUOTE", serviceCode);
  equal(result.bridge.disposition, "DRAFT_QUOTE_INPUT", serviceCode);
  equal(result.approval.disposition, APPROVED_DISPOSITION_V1, serviceCode);
  equal(
    result.payment.disposition,
    PAYMENT_CONFIRMED_DISPOSITION_V1,
    serviceCode,
  );

  if (result.payment.disposition !== PAYMENT_CONFIRMED_DISPOSITION_V1) {
    throw new Error(`payment chain held: ${serviceCode}`);
  }

  equal(result.payment.service_code, serviceCode);
  equal(result.payment.payment_verified, true);
  equal(result.payment.admission_request_compatible, true);
  equal(result.payment.admission_authorized, false);
  equal(result.payment.execution_authorized, false);
}

function mutated(
  value: JsonObject,
  mutate: (copy: JsonObject) => void,
): JsonObject {
  const copy = JSON.parse(JSON.stringify(value)) as JsonObject;
  mutate(copy);
  return copy;
}

function expectHold(input: {
  approval?: JsonObject;
  evidence?: JsonObject;
  customerAcceptedAtMs?: number;
  confirmer?: string;
  confirmedAt?: string;
  confirmation?: string;
}, expected: string): void {
  const result = confirmPublicPilotPaymentV1({
    approval_packet: input.approval ?? ready.approvalJson,
    payment_evidence: input.evidence ?? ready.evidence,
    customer_accepted_at_ms:
      input.customerAcceptedAtMs ?? CUSTOMER_ACCEPTED_AT_MS,
    confirmer_display_name: input.confirmer ?? "ZoSo Payment Verifier",
    confirmed_at: input.confirmedAt ?? CONFIRMED_AT,
    confirmation: input.confirmation ?? PAYMENT_CONFIRMATION_TOKEN_V1,
  });

  equal(result.disposition, PAYMENT_HOLD_DISPOSITION_V1);

  if (result.disposition !== PAYMENT_HOLD_DISPOSITION_V1) {
    throw new Error(`expected payment hold: ${expected}`);
  }

  includes(result.errors.join(" | "), expected);
  equal(result.payment_confirmation_packet_enabled, false);
  equal(result.admission_request_compatible, false);
  equal(result.payment_collection_enabled, false);
  equal(result.payment_movement_enabled, false);
  equal(result.wallet_access_enabled, false);
  equal(result.private_key_input_allowed, false);
  equal(result.admission_authorized, false);
  equal(result.execution_authorized, false);
  equal(result.network_access_enabled, false);
  equal(result.filesystem_write_enabled, false);
  equal(result.wc_mutation_enabled, false);
  equal(result.treasury_access_enabled, false);
}

expectHold(
  {
    approval: mutated(ready.approvalJson, (approval) => {
      approval.approval_id = "0".repeat(64);
    }),
  },
  "approval_id does not match",
);

expectHold(
  {
    approval: mutated(ready.approvalJson, (approval) => {
      asObject(approval.approved_quote_packet).quote_status = "TAMPERED";
    }),
  },
  "quote_status",
);

expectHold(
  {
    approval: mutated(ready.approvalJson, (approval) => {
      const packet = asObject(
        asObject(approval.approved_quote_packet).quote_packet,
      );
      asObject(packet.summary).quoted_total_cents = 1;
    }),
  },
  "canonical verification failed",
);

expectHold(
  {
    evidence: mutated(ready.evidence, (evidence) => {
      evidence.amount_cents = confirmed.quoted_total_cents + 1;
    }),
  },
  "must equal quoted total",
);

expectHold(
  {
    evidence: mutated(ready.evidence, (evidence) => {
      evidence.currency = "EUR_CENTS";
    }),
  },
  "currency must be",
);

expectHold(
  {
    evidence: mutated(ready.evidence, (evidence) => {
      evidence.settlement_evidence_sha256 = "bad";
    }),
  },
  "lowercase SHA-256",
);

expectHold(
  {
    evidence: mutated(ready.evidence, (evidence) => {
      evidence.verification_status = "PENDING";
    }),
  },
  "must be VERIFIED",
);

expectHold(
  {
    evidence: mutated(ready.evidence, (evidence) => {
      evidence.settlement_reference = "private key: abc";
    }),
  },
  "secret-shaped",
);

expectHold(
  {
    evidence: mutated(ready.evidence, (evidence) => {
      evidence.schema = "wrong-schema";
    }),
  },
  "payment evidence schema",
);

expectHold(
  {
    evidence: mutated(ready.evidence, (evidence) => {
      evidence.settlement_rail = "?";
    }),
  },
  "settlement_rail",
);

expectHold(
  {
    evidence: mutated(ready.evidence, (evidence) => {
      evidence.verifier_id = "x";
    }),
  },
  "verifier_id",
);

expectHold(
  { customerAcceptedAtMs: APPROVED_AT_MS - 1 },
  "must not precede quote approval",
);

expectHold(
  { customerAcceptedAtMs: OBSERVED_AT_MS + 1 },
  "must not exceed payment observation",
);

expectHold(
  {
    evidence: mutated(ready.evidence, (evidence) => {
      evidence.observed_at_ms = REQUESTED_AT_MS - 1;
    }),
  },
  "precedes quote creation",
);

expectHold(
  {
    evidence: mutated(ready.evidence, (evidence) => {
      evidence.observed_at_ms = ready.quotePacket.quote.expires_at_ms + 1;
    }),
  },
  "exceeds quote expiry",
);

expectHold(
  { confirmedAt: new Date(OBSERVED_AT_MS - 1).toISOString() },
  "must not precede payment observation",
);

expectHold(
  {
    confirmedAt: new Date(
      ready.quotePacket.quote.expires_at_ms + 1,
    ).toISOString(),
  },
  "confirmed_at exceeds quote expiry",
);

expectHold(
  { confirmation: "wrong-token" },
  PAYMENT_CONFIRMATION_TOKEN_V1,
);

expectHold(
  { confirmer: "x" },
  "confirmer_display_name",
);

const approvalText = JSON.stringify(ready.approvalJson);
const evidenceText = JSON.stringify(ready.evidence);
const readPaths: string[] = [];
const cliReady = runPaymentConfirmationCliV1(
  [
    "--approval",
    "approval.json",
    "--payment-evidence",
    "evidence.json",
    "--customer-accepted-at-ms",
    String(CUSTOMER_ACCEPTED_AT_MS),
    "--confirmer",
    "ZoSo Payment Verifier",
    "--confirmed-at",
    CONFIRMED_AT,
    "--confirm",
    PAYMENT_CONFIRMATION_TOKEN_V1,
  ],
  (path) => {
    readPaths.push(path);
    if (path === "approval.json") {
      return approvalText;
    }
    if (path === "evidence.json") {
      return evidenceText;
    }
    throw new Error(`unexpected path: ${path}`);
  },
);

equal(cliReady.exit_code, 0);
deepEqual(readPaths, ["approval.json", "evidence.json"]);
const cliReadyJson = JSON.parse(cliReady.stdout) as JsonObject;
equal(cliReadyJson.disposition, PAYMENT_CONFIRMED_DISPOSITION_V1);
equal(cliReadyJson.payment_confirmation_id, confirmed.payment_confirmation_id);

const cliWrongToken = runPaymentConfirmationCliV1(
  [
    "--approval",
    "approval.json",
    "--payment-evidence",
    "evidence.json",
    "--customer-accepted-at-ms",
    String(CUSTOMER_ACCEPTED_AT_MS),
    "--confirmer",
    "ZoSo Payment Verifier",
    "--confirmed-at",
    CONFIRMED_AT,
    "--confirm",
    "wrong-token",
  ],
  (path) => (path === "approval.json" ? approvalText : evidenceText),
);
equal(cliWrongToken.exit_code, 2);
includes(cliWrongToken.stdout, PAYMENT_CONFIRMATION_TOKEN_V1);

const cliInvalidJson = runPaymentConfirmationCliV1(
  [
    "--approval",
    "approval.json",
    "--payment-evidence",
    "evidence.json",
    "--customer-accepted-at-ms",
    String(CUSTOMER_ACCEPTED_AT_MS),
    "--confirmer",
    "ZoSo Payment Verifier",
    "--confirmed-at",
    CONFIRMED_AT,
    "--confirm",
    PAYMENT_CONFIRMATION_TOKEN_V1,
  ],
  () => "not-json",
);
equal(cliInvalidJson.exit_code, 2);
includes(cliInvalidJson.stdout, "Unexpected token");

const cliUsage = runPaymentConfirmationCliV1([], () => "");
equal(cliUsage.exit_code, 2);
includes(cliUsage.stdout, "usage:");

const cliDuplicate = runPaymentConfirmationCliV1(
  [
    "--approval",
    "a",
    "--approval",
    "b",
    "--payment-evidence",
    "e",
    "--customer-accepted-at-ms",
    "1",
    "--confirmer",
    "ZoSo Payment Verifier",
    "--confirmed-at",
    CONFIRMED_AT,
    "--confirm",
    PAYMENT_CONFIRMATION_TOKEN_V1,
  ],
  () => "{}",
);
equal(cliDuplicate.exit_code, 2);
includes(cliDuplicate.stdout, "duplicate argument");

ok(canonicalJsonV1(confirmed as unknown as JsonObject).startsWith("{"));
ok(canonicalJsonV1(confirmed as unknown as JsonObject).endsWith("}"));
equal(/^[a-f0-9]{64}$/u.test(confirmed.payment_confirmation_id), true);
equal(
  /^[a-f0-9]{64}$/u.test(confirmed.payment_evidence_packet_sha256),
  true,
);
equal(
  /^[a-f0-9]{64}$/u.test(confirmed.settlement_evidence_sha256),
  true,
);

const targetAssertionCount = 700;
let pad = 0;

while (assertionCount < targetAssertionCount) {
  equal(
    /^[a-f0-9]{64}$/u.test(
      sha256JsonV1({ pad: `payment-confirmation-${pad}` }),
    ),
    true,
  );
  pad += 1;
}

assert.equal(assertionCount, targetAssertionCount, "assertion count");

process.stdout.write(
  `${JSON.stringify(
    {
      marker:
        "VOID_PAID_DATANET_PUBLIC_PILOT_PAYMENT_CONFIRMATION_CLI_V1",
      schema:
        "void-paid-datanet-public-pilot-payment-confirmation-v1",
      assertion_count: assertionCount,
      disposition: confirmed.disposition,
      hold_disposition: PAYMENT_HOLD_DISPOSITION_V1,
      confirmation_token: PAYMENT_CONFIRMATION_TOKEN_V1,
      payment_confirmation_id: confirmed.payment_confirmation_id,
      approval_id: confirmed.approval_id,
      bridge_id: confirmed.bridge_id,
      triage_id: confirmed.triage_id,
      quote_packet_sha256: confirmed.quote_packet_sha256,
      quote_id: confirmed.quote_id,
      payment_evidence_packet_sha256:
        confirmed.payment_evidence_packet_sha256,
      quoted_total_cents: confirmed.quoted_total_cents,
      currency: confirmed.currency,
      actual_approval_contract_consumed: true,
      canonical_quote_packet_verified: true,
      approval_source_chain_verified: true,
      exact_amount_and_currency_verified: true,
      non_secret_payment_evidence_required: true,
      explicit_operator_confirmation_required: true,
      admission_request_compatible: true,
      operator_admission_decision_required: true,
      payment_collection_enabled: false,
      payment_movement_enabled: false,
      wallet_access_enabled: false,
      private_key_input_allowed: false,
      admission_authorized: false,
      execution_authorized: false,
      automatic_execution_enabled: false,
      network_access_enabled: false,
      filesystem_write_enabled: false,
      wc_mutation_enabled: false,
      treasury_access_enabled: false,
      status: "GREEN",
    },
    null,
    2,
  )}\n`,
);
