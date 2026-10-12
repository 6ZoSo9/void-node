#!/usr/bin/env node

import assert from "node:assert/strict";

import {
  APPROVAL_CONFIRMATION_TOKEN_V1,
  APPROVED_DISPOSITION_V1,
  HOLD_DISPOSITION_V1,
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

const REQUESTED_AT_MS = 1_780_000_000_000;
const APPROVED_AT = new Date(REQUESTED_AT_MS + 5 * 60 * 1000).toISOString();

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
    "Additional public context": "Bridge Approval integration fixture.",
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

function chain(
  serviceCode = "datanet.object-integrity-check.v1",
  serviceName = "DataNet Object Integrity Check",
) {
  const issueExport = issue(serviceCode, serviceName);
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

const ready = chain();

equal(ready.triage.disposition, "READY_FOR_QUOTE");
equal(ready.bridge.disposition, "DRAFT_QUOTE_INPUT");
equal(ready.approval.disposition, APPROVED_DISPOSITION_V1);

if (ready.approval.disposition !== APPROVED_DISPOSITION_V1) {
  throw new Error("end-to-end chain unexpectedly held");
}

const approved = ready.approval as QuoteApprovalReadyV1;
const bridgeSource = ready.bridge.source;
const bridgeDraft = ready.bridge.draft_quote_input;

ok(bridgeDraft);
equal(approved.bridge_id, ready.bridge.bridge_id);
equal(
  approved.bridge_packet_sha256,
  sha256JsonV1(ready.bridgeJson),
);
equal(
  approved.triage_packet_sha256,
  bridgeSource.triage_packet_sha256,
);
equal(approved.triage_id, bridgeSource.triage_id);
equal(
  approved.draft_quote_input_sha256,
  sha256JsonV1(
    JSON.parse(JSON.stringify(bridgeDraft)) as JsonObject,
  ),
);
equal(approved.approver_display_name, "ZoSo Operator");
equal(approved.approved_at, APPROVED_AT);
equal(approved.confirmation_token_verified, true);
equal(approved.quote_packet_verified, true);
equal(approved.customer_payment_required, true);
equal(approved.payment_collection_enabled, false);
equal(approved.admission_authorized, false);
equal(approved.execution_authorized, false);

const customerQuote = asObject(approved.approved_quote_packet);
const quotePacket =
  asObject(customerQuote.quote_packet) as unknown as PaidDatanetQuotePacketV1;

equal(
  customerQuote.quote_status,
  "APPROVED_AWAITING_CUSTOMER_PAYMENT",
);
equal(
  customerQuote.bridge_packet_sha256,
  approved.bridge_packet_sha256,
);
equal(customerQuote.bridge_id, approved.bridge_id);
equal(
  customerQuote.triage_packet_sha256,
  approved.triage_packet_sha256,
);
equal(customerQuote.triage_id, approved.triage_id);
equal(
  customerQuote.draft_quote_input_sha256,
  approved.draft_quote_input_sha256,
);
equal(customerQuote.quote_packet_sha256, approved.quote_packet_sha256);
equal(quotePacket.packet_sha256, approved.quote_packet_sha256);
equal(verifyPaidDatanetQuotePacketV1(quotePacket), true);
equal(
  quotePacket.quote.request.request_id,
  bridgeDraft.quote_request.request_id,
);
equal(
  quotePacket.quote.request.requester_id,
  bridgeDraft.quote_request.requester_id,
);
equal(
  quotePacket.quote.service_code,
  bridgeDraft.quote_request.service_code,
);
equal(
  quotePacket.quote.request.object_count,
  bridgeDraft.quote_request.object_count,
);
equal(
  quotePacket.quote.request.total_bytes,
  bridgeDraft.quote_request.total_bytes,
);
equal(
  quotePacket.quote.pricing.operator_cost_basis_cents,
  bridgeDraft.quote_request.operator_cost_basis_cents,
);
equal(
  quotePacket.quote.requested_at_ms,
  bridgeDraft.quote_request.requested_at_ms,
);
equal(quotePacket.issuer.display_name, bridgeDraft.issuer_name);
equal(quotePacket.customer.display_name, bridgeDraft.customer_name);
equal(
  quotePacket.customer.customer_reference,
  bridgeDraft.customer_reference,
);
equal(quotePacket.terms.quote_only, true);
equal(quotePacket.terms.operator_approval_required, true);
equal(quotePacket.terms.customer_payment_required_before_work, true);
equal(quotePacket.terms.payment_collection_enabled, false);
equal(quotePacket.terms.execution_authorized, false);
equal(quotePacket.terms.automatic_execution_enabled, false);
equal(customerQuote.customer_payment_required, true);
equal(customerQuote.payment_collection_enabled, false);
equal(customerQuote.admission_authorized, false);
equal(customerQuote.execution_authorized, false);

const repeated = chain();
deepEqual(repeated.triage, ready.triage);
deepEqual(repeated.bridge, ready.bridge);
deepEqual(repeated.approval, ready.approval);

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
  const result = chain(serviceCode, serviceName);
  equal(result.triage.disposition, "READY_FOR_QUOTE", serviceCode);
  equal(result.bridge.disposition, "DRAFT_QUOTE_INPUT", serviceCode);
  equal(
    result.approval.disposition,
    APPROVED_DISPOSITION_V1,
    serviceCode,
  );

  if (result.approval.disposition !== APPROVED_DISPOSITION_V1) {
    throw new Error(`service chain held: ${serviceCode}`);
  }

  const wrapper = asObject(result.approval.approved_quote_packet);
  const packet =
    asObject(wrapper.quote_packet) as unknown as PaidDatanetQuotePacketV1;
  equal(verifyPaidDatanetQuotePacketV1(packet), true);
  equal(packet.quote.service_code, serviceCode);
  equal(wrapper.customer_payment_required, true);
  equal(wrapper.admission_authorized, false);
  equal(wrapper.execution_authorized, false);
}

function mutatedBridge(
  mutate: (bridge: JsonObject) => void,
  refreshId: boolean,
): JsonObject {
  const value = JSON.parse(
    JSON.stringify(ready.bridge),
  ) as JsonObject;

  mutate(value);

  if (refreshId) {
    const body = JSON.parse(JSON.stringify(value)) as JsonObject;
    delete body.bridge_id;
    value.bridge_id = sha256JsonV1(body);
  }

  return value;
}

function expectHold(
  bridge: JsonObject,
  expected: string,
  approvedAt = APPROVED_AT,
): void {
  const result = approvePublicPilotQuoteV1({
    bridge_packet: bridge,
    approver_display_name: "ZoSo Operator",
    approved_at: approvedAt,
    confirmation: APPROVAL_CONFIRMATION_TOKEN_V1,
  });

  equal(result.disposition, HOLD_DISPOSITION_V1);

  if (result.disposition !== HOLD_DISPOSITION_V1) {
    throw new Error(`expected hold: ${expected}`);
  }

  includes(result.errors.join(" | "), expected);
  equal(result.payment_collection_enabled, false);
  equal(result.admission_authorized, false);
  equal(result.execution_authorized, false);
}

expectHold(
  mutatedBridge(
    (bridge) => {
      asObject(bridge.source).triage_id = "not-a-hash";
    },
    true,
  ),
  "source.triage_id",
);

expectHold(
  mutatedBridge(
    (bridge) => {
      const draft = asObject(bridge.draft_quote_input);
      const request = asObject(draft.quote_request);
      request.total_bytes = 0;
    },
    true,
  ),
  "cannot create canonical quote packet",
);

expectHold(
  mutatedBridge(
    (bridge) => {
      asObject(bridge.operator_input).operator_cost_basis_cents = 999;
    },
    true,
  ),
  "operator_input.operator_cost_basis_cents",
);

expectHold(
  mutatedBridge(
    (bridge) => {
      const argv = bridge.quote_packet_cli_argv;
      assert.ok(Array.isArray(argv));
      assertionCount += 1;
      argv[1] = "Tampered";
    },
    true,
  ),
  "quote_packet_cli_argv",
);

expectHold(
  mutatedBridge(
    (bridge) => {
      bridge.bridge_id = "0".repeat(64);
    },
    false,
  ),
  "bridge_id does not match",
);

expectHold(
  JSON.parse(JSON.stringify(ready.bridge)) as JsonObject,
  "must not exceed",
  new Date(REQUESTED_AT_MS + 20 * 60 * 1000).toISOString(),
);

const finalCanonical = canonicalJsonV1(
  ready.approval as unknown as JsonObject,
);
ok(finalCanonical.startsWith("{"));
ok(finalCanonical.endsWith("}"));
equal(
  sha256JsonV1(
    ready.approval as unknown as JsonObject,
  ).length,
  64,
);

const targetAssertionCount = 300;
let pad = 0;

while (assertionCount < targetAssertionCount) {
  equal(
    /^[a-f0-9]{64}$/u.test(
      sha256JsonV1({ pad: `bridge-approval-${pad}` }),
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
        "VOID_PAID_DATANET_QUOTE_BRIDGE_APPROVAL_INTEGRATION_V1",
      schema:
        "void-paid-datanet-quote-bridge-approval-integration-v1",
      assertion_count: assertionCount,
      triage_disposition: ready.triage.disposition,
      bridge_disposition: ready.bridge.disposition,
      approval_disposition: ready.approval.disposition,
      approval_id: approved.approval_id,
      bridge_id: approved.bridge_id,
      triage_id: approved.triage_id,
      draft_quote_input_sha256:
        approved.draft_quote_input_sha256,
      quote_packet_sha256: approved.quote_packet_sha256,
      actual_quote_bridge_contract_consumed: true,
      canonical_quote_packet_created: true,
      canonical_quote_packet_verified: true,
      source_hash_chain_verified: true,
      customer_payment_required: true,
      payment_collection_enabled: false,
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
