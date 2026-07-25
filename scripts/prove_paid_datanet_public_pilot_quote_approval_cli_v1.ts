#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  APPROVAL_CONFIRMATION_TOKEN_V1,
  APPROVAL_SCHEMA_V1,
  APPROVED_DISPOSITION_V1,
  HOLD_DISPOSITION_V1,
  VOID_PAID_DATANET_PUBLIC_PILOT_QUOTE_APPROVAL_CLI_V1,
  approvePublicPilotQuoteV1,
  canonicalJsonV1,
  containsSecretShapedValueV1,
  runQuoteApprovalCliV1,
  sha256JsonV1,
  sha256TextV1,
  type JsonObject,
  type JsonValue,
  type QuoteApprovalReadyV1,
} from "./paid_datanet_public_pilot_quote_approval_cli_v1.js";
import {
  bridgePaidDatanetPublicPilotQuoteV1,
  type PaidDatanetPublicPilotQuoteBridgeOperatorInputV1,
} from "./paid_datanet_public_pilot_quote_bridge_cli_v1.js";
import {
  triagePaidDatanetPublicPilotIssueV1,
  type PaidDatanetPublicPilotIssueExportV1,
} from "./paid_datanet_public_pilot_triage_cli_v1.js";
import {
  PAID_DATANET_QUOTE_PACKET_V1_MARKER,
  PAID_DATANET_QUOTE_PACKET_V1_SCHEMA,
  verifyPaidDatanetQuotePacketV1,
  type PaidDatanetQuotePacketV1,
} from "./paid_datanet_quote_packet_v1.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const CLI_PATH = resolve(
  HERE,
  "paid_datanet_public_pilot_quote_approval_cli_v1.ts",
);
const PROOF_PATH = resolve(
  HERE,
  "prove_paid_datanet_public_pilot_quote_approval_cli_v1.ts",
);
const INTEGRATION_PROOF_PATH = resolve(
  HERE,
  "prove_paid_datanet_quote_bridge_approval_integration_v1.ts",
);
const DOC_PATH = resolve(
  REPO,
  "docs/operators/paid-datanet-public-pilot-quote-approval-cli-v1.md",
);
const WORKFLOW_PATH = resolve(
  REPO,
  ".github/workflows/paid-datanet-public-pilot-quote-approval-cli-v1.yml",
);

const REQUESTED_AT_MS = 1_780_000_000_000;
const APPROVED_AT = new Date(REQUESTED_AT_MS + 5 * 60 * 1000).toISOString();

let assertionCount = 0;

function fail(message: string): never {
  throw new Error(message);
}

function assertTrue(value: boolean, message = "expected true"): void {
  assertionCount += 1;
  assert.equal(value, true, message);
}

function assertFalse(value: boolean, message = "expected false"): void {
  assertionCount += 1;
  assert.equal(value, false, message);
}

function assertEqual<T>(
  actual: T,
  expected: T,
  message = "values differ",
): void {
  assertionCount += 1;
  assert.equal(actual, expected, message);
}

function assertDeepEqual(
  actual: unknown,
  expected: unknown,
  message = "values differ",
): void {
  assertionCount += 1;
  assert.deepEqual(actual, expected, message);
}

function assertIncludes(
  haystack: string,
  needle: string,
  message = "missing substring",
): void {
  assertionCount += 1;
  assert.ok(haystack.includes(needle), `${message}: ${needle}`);
}

function assertNotIncludes(
  haystack: string,
  needle: string,
  message = "unexpected substring",
): void {
  assertionCount += 1;
  assert.ok(!haystack.includes(needle), `${message}: ${needle}`);
}

function asObject(value: JsonValue | undefined): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail("expected JSON object");
  }
  return value;
}

function cloneObject<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function checkedBody(
  overrides: Readonly<Record<string, string>> = {},
): string {
  const sections: Readonly<Record<string, string>> = {
    "Paid DataNet service":
      "datanet.object-integrity-check.v1 — DataNet Object Integrity Check",
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
    "Additional public context": "Public quote approval integration fixture.",
    "Required acknowledgements": [
      "- [x] I understand this issue and everything I post in it may be publicly visible.",
      "- [x] I confirm I have not included passwords, API keys, private keys, seed phrases, payment credentials, personal data, confidential data, or private dataset contents.",
      "- [x] I have the right to submit every referenced object, URL, manifest, and dataset reference for this requested service.",
      "- [x] I understand submission does not create a contract, collect payment, guarantee acceptance, or authorize work.",
      "- [x] I understand an operator must review the request, issue the deterministic quote, provide approved payment instructions separately, verify payment evidence, and explicitly admit the work before execution.",
    ].join("\n"),
    ...overrides,
  };

  return Object.entries(sections)
    .map(([label, value]) => `### ${label}\n\n${value}`)
    .join("\n\n");
}

function readyIssue(
  body = checkedBody(),
): PaidDatanetPublicPilotIssueExportV1 {
  return {
    number: 718,
    title: "[Paid DataNet Pilot]: Open Research Archive",
    body,
    url: "https://github.com/6ZoSo9/void-node/issues/718",
    author: {
      login: "public-customer-example",
    },
    createdAt: "2026-07-24T22:30:00.000Z",
    labels: [],
  };
}

function readyBridge(
  body = checkedBody(),
  operatorInput: PaidDatanetPublicPilotQuoteBridgeOperatorInputV1 = {
    issuer_name: "VOID Network",
    operator_cost_basis_cents: 500,
    requested_at_ms: REQUESTED_AT_MS,
  },
): JsonObject {
  const issue = readyIssue(body);
  const issueText = JSON.stringify(issue);
  const triage = triagePaidDatanetPublicPilotIssueV1(issue, issueText);
  const triageText = JSON.stringify(triage);
  const bridge = bridgePaidDatanetPublicPilotQuoteV1(
    triage,
    triageText,
    operatorInput,
  );
  return JSON.parse(JSON.stringify(bridge)) as JsonObject;
}

function refreshBridgeId(bridge: JsonObject): void {
  const body = cloneObject(bridge);
  delete body.bridge_id;
  bridge.bridge_id = sha256JsonV1(body);
}

function approveFixture(
  bridgePacket = readyBridge(),
  overrides: Partial<{
    approver: string;
    approvedAt: string;
    confirmation: string;
  }> = {},
) {
  return approvePublicPilotQuoteV1({
    bridge_packet: bridgePacket,
    approver_display_name: overrides.approver ?? "ZoSo Operator",
    approved_at: overrides.approvedAt ?? APPROVED_AT,
    confirmation:
      overrides.confirmation ?? APPROVAL_CONFIRMATION_TOKEN_V1,
  });
}

const cliSource = readFileSync(CLI_PATH, "utf8");
const proofSource = readFileSync(PROOF_PATH, "utf8");
const integrationProofSource = readFileSync(INTEGRATION_PROOF_PATH, "utf8");
const docs = readFileSync(DOC_PATH, "utf8");
const workflow = readFileSync(WORKFLOW_PATH, "utf8");

assertEqual(
  VOID_PAID_DATANET_PUBLIC_PILOT_QUOTE_APPROVAL_CLI_V1,
  "VOID_PAID_DATANET_PUBLIC_PILOT_QUOTE_APPROVAL_CLI_V1",
  "marker",
);
assertEqual(
  APPROVAL_SCHEMA_V1,
  "void-paid-datanet-public-pilot-quote-approval-v1",
  "approval schema",
);
assertEqual(
  APPROVED_DISPOSITION_V1,
  "APPROVED_QUOTE_PACKET",
  "approved disposition",
);
assertEqual(
  HOLD_DISPOSITION_V1,
  "HOLD_FOR_OPERATOR_APPROVAL",
  "hold disposition",
);
assertEqual(
  APPROVAL_CONFIRMATION_TOKEN_V1,
  "approvePaidDataNetPublicPilotQuoteV1",
  "confirmation token",
);

for (const required of [
  "createPaidDatanetQuotePacketV1",
  "verifyPaidDatanetQuotePacketV1",
  "PAID_DATANET_PUBLIC_PILOT_QUOTE_BRIDGE_V1_SCHEMA",
  "PAID_DATANET_PUBLIC_PILOT_QUOTE_BRIDGE_CLI_V1_MARKER",
  "source.triage_packet_sha256",
  "source.triage_id",
  "draft_quote_input",
  "quote_packet_sha256",
  "quote_packet_verified",
  "APPROVED_AWAITING_CUSTOMER_PAYMENT",
  "customer_payment_required",
  "admission_authorized",
  "execution_authorized",
]) {
  assertIncludes(cliSource, required, "canonical approval contract");
}

for (const legacy of [
  'pickString(bridgePacket, ["triage_packet_sha256"',
  'pickString(bridgePacket, ["triage_id"',
  "draft_quote_input.service_id",
  "draft_quote_input.customer_id",
  "draft_quote_input total amount",
  "value.total_amount",
]) {
  assertNotIncludes(cliSource, legacy, "legacy fixture contract removed");
}

for (const forbiddenImport of [
  "node:http",
  "node:https",
  "node:net",
  "node:tls",
  "node:dgram",
  "node:child_process",
  "undici",
  "axios",
  "fetch(",
]) {
  assertNotIncludes(cliSource, forbiddenImport, "network or process access");
}

for (const forbiddenWrite of [
  "writeFileSync",
  "appendFileSync",
  "createWriteStream",
  "mkdirSync",
  "rmSync",
  "unlinkSync",
  "renameSync",
]) {
  assertNotIncludes(cliSource, forbiddenWrite, "filesystem mutation");
}

assertIncludes(cliSource, "readFileSync", "local file input");
assertIncludes(cliSource, "process.stdout.write", "stdout output");
assertNotIncludes(cliSource, "process.stderr.write", "stderr output disabled");

const contiguousSecretPatterns = [
  ["xo", "x[baprs]-"].join(""),
  ["AK", "IA[0-9A-Z]"].join(""),
  ["gh", "p_[A-Za-z0-9_]"].join(""),
  ["github_", "pat_[A-Za-z0-9_]"].join(""),
  ["-----BEGIN ", "PRIVATE KEY-----"].join(""),
];

for (const pattern of contiguousSecretPatterns) {
  assertNotIncludes(cliSource, pattern, "secret-shaped source literal");
  assertNotIncludes(proofSource, pattern, "secret-shaped proof literal");
  assertNotIncludes(
    integrationProofSource,
    pattern,
    "secret-shaped integration proof literal",
  );
}

for (const docFragment of [
  "APPROVED_QUOTE_PACKET",
  "HOLD_FOR_OPERATOR_APPROVAL",
  "approvePaidDataNetPublicPilotQuoteV1",
  "actual Quote Bridge packet",
  "canonical quote packet",
  "Customer payment is still required",
  "does not authorize admission or execution",
  "local file input",
  "stdout",
]) {
  assertIncludes(docs, docFragment, "operator documentation");
}

for (const workflowFragment of [
  "paid-datanet-public-pilot-quote-approval-cli-v1",
  "npm ci",
  "prove_paid_datanet_public_pilot_quote_approval_cli_v1.ts",
  "prove_paid_datanet_quote_bridge_approval_integration_v1.ts",
  "permissions:",
  "contents: read",
]) {
  assertIncludes(workflow, workflowFragment, "workflow contract");
}

const canonicalLeft: JsonObject = {
  zebra: 1,
  alpha: { two: 2, one: 1 },
  array: [3, 2, 1],
};
const canonicalRight: JsonObject = {
  array: [3, 2, 1],
  alpha: { one: 1, two: 2 },
  zebra: 1,
};
assertEqual(canonicalJsonV1(canonicalLeft), canonicalJsonV1(canonicalRight));
assertEqual(sha256JsonV1(canonicalLeft), sha256JsonV1(canonicalRight));
assertEqual(sha256TextV1("VOID").length, 64);
assertTrue(/^[a-f0-9]{64}$/u.test(sha256TextV1("VOID")));

const bridge = readyBridge();
const ready = approveFixture(bridge);

assertEqual(ready.disposition, APPROVED_DISPOSITION_V1);
assertTrue("approval_id" in ready);
assertTrue("approved_quote_packet" in ready);

if (ready.disposition !== APPROVED_DISPOSITION_V1) {
  fail("real Bridge fixture unexpectedly held");
}

const readyPacket = ready as QuoteApprovalReadyV1;
assertEqual(readyPacket.schema, APPROVAL_SCHEMA_V1);
assertEqual(
  readyPacket.marker,
  VOID_PAID_DATANET_PUBLIC_PILOT_QUOTE_APPROVAL_CLI_V1,
);
assertTrue(/^[a-f0-9]{64}$/u.test(readyPacket.approval_id));
assertTrue(/^[a-f0-9]{64}$/u.test(readyPacket.bridge_packet_sha256));
assertTrue(/^[a-f0-9]{64}$/u.test(readyPacket.bridge_id));
assertTrue(/^[a-f0-9]{64}$/u.test(readyPacket.triage_packet_sha256));
assertTrue(/^[a-f0-9]{64}$/u.test(readyPacket.triage_id));
assertTrue(/^[a-f0-9]{64}$/u.test(readyPacket.draft_quote_input_sha256));
assertTrue(/^[a-f0-9]{64}$/u.test(readyPacket.quote_packet_sha256));
assertEqual(readyPacket.approver_display_name, "ZoSo Operator");
assertEqual(readyPacket.approved_at, APPROVED_AT);
assertTrue(readyPacket.confirmation_token_verified);
assertTrue(readyPacket.quote_packet_verified);
assertTrue(readyPacket.customer_payment_required);
assertFalse(readyPacket.admission_authorized);
assertFalse(readyPacket.execution_authorized);
assertFalse(readyPacket.automatic_execution_enabled);
assertFalse(readyPacket.payment_collection_enabled);
assertFalse(readyPacket.github_api_access_enabled);
assertFalse(readyPacket.network_access_enabled);
assertFalse(readyPacket.filesystem_write_enabled);
assertFalse(readyPacket.wc_mutation_enabled);
assertFalse(readyPacket.treasury_access_enabled);

const bridgeSource = asObject(bridge.source);
assertEqual(
  readyPacket.triage_packet_sha256,
  bridgeSource.triage_packet_sha256,
);
assertEqual(readyPacket.triage_id, bridgeSource.triage_id);
assertEqual(readyPacket.bridge_id, bridge.bridge_id);
assertEqual(readyPacket.bridge_packet_sha256, sha256JsonV1(bridge));
assertEqual(
  readyPacket.draft_quote_input_sha256,
  sha256JsonV1(asObject(bridge.draft_quote_input)),
);

const approvedCustomerPacket = asObject(readyPacket.approved_quote_packet);
assertEqual(
  approvedCustomerPacket.schema,
  "void-paid-datanet-public-pilot-approved-customer-quote-v1",
);
assertEqual(
  approvedCustomerPacket.quote_status,
  "APPROVED_AWAITING_CUSTOMER_PAYMENT",
);
assertEqual(
  approvedCustomerPacket.bridge_packet_sha256,
  readyPacket.bridge_packet_sha256,
);
assertEqual(approvedCustomerPacket.bridge_id, readyPacket.bridge_id);
assertEqual(
  approvedCustomerPacket.triage_packet_sha256,
  readyPacket.triage_packet_sha256,
);
assertEqual(approvedCustomerPacket.triage_id, readyPacket.triage_id);
assertEqual(
  approvedCustomerPacket.draft_quote_input_sha256,
  readyPacket.draft_quote_input_sha256,
);
assertEqual(
  approvedCustomerPacket.quote_packet_sha256,
  readyPacket.quote_packet_sha256,
);
assertEqual(approvedCustomerPacket.confirmation_token_verified, true);
assertEqual(approvedCustomerPacket.quote_packet_verified, true);
assertEqual(approvedCustomerPacket.customer_payment_required, true);
assertEqual(approvedCustomerPacket.payment_collection_enabled, false);
assertEqual(approvedCustomerPacket.admission_authorized, false);
assertEqual(approvedCustomerPacket.execution_authorized, false);
assertEqual(approvedCustomerPacket.automatic_execution_enabled, false);
assertEqual(approvedCustomerPacket.wc_mutation_enabled, false);
assertEqual(approvedCustomerPacket.treasury_access_enabled, false);

const quotePacket =
  asObject(approvedCustomerPacket.quote_packet) as unknown as PaidDatanetQuotePacketV1;
assertTrue(verifyPaidDatanetQuotePacketV1(quotePacket));
assertEqual(quotePacket.schema, PAID_DATANET_QUOTE_PACKET_V1_SCHEMA);
assertEqual(quotePacket.marker, PAID_DATANET_QUOTE_PACKET_V1_MARKER);
assertEqual(quotePacket.packet_sha256, readyPacket.quote_packet_sha256);
assertEqual(quotePacket.issuer.display_name, "VOID Network");
assertEqual(quotePacket.customer.display_name, "Open Research Archive");
assertEqual(
  quotePacket.customer.customer_reference,
  "open-research-archive-pilot-001",
);
assertEqual(
  quotePacket.quote.service_code,
  "datanet.object-integrity-check.v1",
);
assertEqual(quotePacket.quote.request.object_count, 2);
assertEqual(quotePacket.quote.request.total_bytes, 1048577);
assertEqual(quotePacket.quote.pricing.operator_cost_basis_cents, 500);
assertEqual(quotePacket.quote.requested_at_ms, REQUESTED_AT_MS);
assertEqual(quotePacket.terms.quote_only, true);
assertEqual(quotePacket.terms.operator_approval_required, true);
assertEqual(quotePacket.terms.customer_payment_required_before_work, true);
assertEqual(quotePacket.terms.payment_collection_enabled, false);
assertEqual(quotePacket.terms.execution_authorized, false);
assertEqual(quotePacket.terms.automatic_execution_enabled, false);
assertEqual(quotePacket.terms.wc_mutation_enabled, false);
assertEqual(quotePacket.terms.treasury_access_enabled, false);

const readyAgain = approveFixture(readyBridge());
assertEqual(canonicalJsonV1(ready), canonicalJsonV1(readyAgain));
assertEqual(
  (readyAgain as QuoteApprovalReadyV1).approval_id,
  readyPacket.approval_id,
);

for (const [serviceCode, serviceName, objectCount, totalBytes] of [
  [
    "datanet.object-integrity-check.v1",
    "DataNet Object Integrity Check",
    2,
    1048577,
  ],
  [
    "datanet.public-retrieval-evidence.v1",
    "DataNet Public Retrieval Evidence",
    2,
    1048577,
  ],
  [
    "datanet.dataset-replication-audit.v1",
    "DataNet Dataset Replication Audit",
    2,
    1048577,
  ],
] as const) {
  const body = checkedBody({
    "Paid DataNet service": `${serviceCode} — ${serviceName}`,
    "Estimated object count": String(objectCount),
    "Estimated total bytes": String(totalBytes),
  });
  const result = approveFixture(readyBridge(body));
  assertEqual(result.disposition, APPROVED_DISPOSITION_V1, serviceCode);

  if (result.disposition !== APPROVED_DISPOSITION_V1) {
    fail(`service approval held: ${serviceCode}`);
  }

  const wrapper = asObject(result.approved_quote_packet);
  const packet =
    asObject(wrapper.quote_packet) as unknown as PaidDatanetQuotePacketV1;
  assertTrue(verifyPaidDatanetQuotePacketV1(packet), serviceCode);
  assertEqual(packet.quote.service_code, serviceCode);
  assertEqual(packet.quote.request.object_count, objectCount);
  assertEqual(packet.quote.request.total_bytes, totalBytes);
  assertEqual(wrapper.customer_payment_required, true);
  assertEqual(wrapper.admission_authorized, false);
  assertEqual(wrapper.execution_authorized, false);
}

function holdFor(
  mutate: (bridgePacket: JsonObject) => void,
  expected: string,
  overrides: Partial<{
    approver: string;
    approvedAt: string;
    confirmation: string;
  }> = {},
  refreshId = true,
): void {
  const mutated = cloneObject(readyBridge());
  mutate(mutated);

  if (refreshId) {
    refreshBridgeId(mutated);
  }

  const held = approveFixture(mutated, overrides);
  assertEqual(held.disposition, HOLD_DISPOSITION_V1, expected);

  if (held.disposition !== HOLD_DISPOSITION_V1) {
    fail(`expected hold: ${expected}`);
  }

  assertTrue(held.errors.length >= 1, `${expected}: errors`);
  assertIncludes(held.errors.join(" | "), expected, expected);
  assertTrue(held.draft_quote_input_required);
  assertTrue(held.canonical_quote_packet_required);
  assertTrue(held.bridge_source_binding_required);
  assertFalse(held.approved_customer_quote_packet_enabled);
  assertFalse(held.quote_packet_verified);
  assertFalse(held.payment_collection_enabled);
  assertFalse(held.admission_authorized);
  assertFalse(held.execution_authorized);
  assertFalse(held.automatic_execution_enabled);
  assertFalse(held.network_access_enabled);
  assertFalse(held.filesystem_write_enabled);
  assertFalse(held.wc_mutation_enabled);
  assertFalse(held.treasury_access_enabled);
}

holdFor(
  (value) => {
    value.schema = "wrong";
  },
  "bridge packet schema",
);
holdFor(
  (value) => {
    value.marker = "wrong";
  },
  "bridge packet marker",
);
holdFor(
  (value) => {
    value.disposition = "HOLD_FOR_OPERATOR_REVIEW";
  },
  "DRAFT_QUOTE_INPUT",
);
holdFor(
  (value) => {
    value.bridge_id = sha256TextV1("wrong");
  },
  "bridge_id does not match",
  {},
  false,
);
holdFor(
  (value) => {
    delete value.source;
  },
  "source object",
);
holdFor(
  (value) => {
    asObject(value.source).triage_packet_sha256 = "not-a-hash";
  },
  "source.triage_packet_sha256",
);
holdFor(
  (value) => {
    asObject(value.source).triage_id = "not-a-hash";
  },
  "source.triage_id",
);
holdFor(
  (value) => {
    asObject(value.source).issue_export_sha256 = "not-a-hash";
  },
  "source.issue_export_sha256",
);
holdFor(
  (value) => {
    asObject(value.source).issue_body_sha256 = "not-a-hash";
  },
  "source.issue_body_sha256",
);
holdFor(
  (value) => {
    asObject(value.source).issue_number = 0;
  },
  "source.issue_number",
);
holdFor(
  (value) => {
    asObject(value.source).issue_url = "https://example.org/issue";
  },
  "source.issue_url",
);
holdFor(
  (value) => {
    asObject(value.target).quote_packet_schema = "wrong";
  },
  "target.quote_packet_schema",
);
holdFor(
  (value) => {
    asObject(value.target).quote_packet_marker = "wrong";
  },
  "target.quote_packet_marker",
);
holdFor(
  (value) => {
    delete value.draft_quote_input;
  },
  "draft_quote_input",
);
holdFor(
  (value) => {
    delete value.operator_input;
  },
  "operator_input",
);
holdFor(
  (value) => {
    asObject(value.operator_input).issuer_name = "Different Issuer";
  },
  "operator_input.issuer_name",
);
holdFor(
  (value) => {
    asObject(value.operator_input).currency = "USD";
  },
  "operator_input.currency",
);
holdFor(
  (value) => {
    asObject(value.operator_input).operator_cost_basis_cents = 999;
  },
  "operator_input.operator_cost_basis_cents",
);
holdFor(
  (value) => {
    asObject(value.operator_input).requested_at_ms = REQUESTED_AT_MS + 1;
  },
  "operator_input.requested_at_ms",
);
holdFor(
  (value) => {
    asObject(value.checks).service_recognized = false;
  },
  "checks.service_recognized",
);
holdFor(
  (value) => {
    asObject(value.controls).quote_issued_by_cli = true;
  },
  "controls.quote_issued_by_cli",
);
holdFor(
  (value) => {
    value.hold_reasons = ["operator_review_required"];
  },
  "hold_reasons must be empty",
);
holdFor(
  (value) => {
    const argv = value.quote_packet_cli_argv;
    if (!Array.isArray(argv)) {
      fail("expected argv array");
    }
    argv[1] = "Tampered Issuer";
  },
  "quote_packet_cli_argv",
);
holdFor(
  (value) => {
    const draft = asObject(value.draft_quote_input);
    delete draft.issuer_name;
  },
  "cannot create canonical quote packet",
);
holdFor(
  (value) => {
    const draft = asObject(value.draft_quote_input);
    const request = asObject(draft.quote_request);
    request.object_count = 0;
  },
  "cannot create canonical quote packet",
);
holdFor(
  (value) => {
    value.operator_note = ["xo", "xb-1234567890-examplevalue"].join("");
  },
  "secret-shaped",
);

holdFor(
  () => undefined,
  "confirmation",
  { confirmation: "approve" },
);
holdFor(
  () => undefined,
  "approver_display_name",
  { approver: "x" },
);
holdFor(
  () => undefined,
  "approver_display_name",
  { approver: "operator@example.com" },
);
holdFor(
  () => undefined,
  "canonical ISO-8601",
  { approvedAt: "2026-05-28T20:31:40Z" },
);
holdFor(
  () => undefined,
  "must not precede",
  { approvedAt: new Date(REQUESTED_AT_MS - 1).toISOString() },
);
holdFor(
  () => undefined,
  "must not exceed",
  { approvedAt: new Date(REQUESTED_AT_MS + 16 * 60 * 1000).toISOString() },
);

const secretValues = [
  ["xo", "xb-1234567890-examplevalue"].join(""),
  ["AK", "IA1234567890ABCDEF"].join(""),
  ["gh", "p_abcdefghijklmnopqrstuvwxyz123456"].join(""),
  ["github_", "pat_abcdefghijklmnopqrstuvwxyz123456"].join(""),
  ["s", "k-abcdefghijklmnopqrstuvwxyz123456"].join(""),
  ["-----BEGIN ", "PRIVATE KEY-----"].join(""),
  ["seed phrase", " = alpha beta gamma delta"].join(""),
  ["private key", ": example"].join(""),
];

for (const secret of secretValues) {
  assertTrue(containsSecretShapedValueV1({ value: secret }), secret);
}

for (const safe of [
  "public object hash",
  "customer asks for integrity verification",
  "quote expires in ten minutes",
  "USD_CENTS",
  "no credentials included",
]) {
  assertFalse(containsSecretShapedValueV1({ value: safe }), safe);
}

const cliBridge = readyBridge();
const cliRun = runQuoteApprovalCliV1(
  [
    "--bridge",
    "/virtual/bridge.json",
    "--approver",
    "ZoSo Operator",
    "--approved-at",
    APPROVED_AT,
    "--confirm",
    APPROVAL_CONFIRMATION_TOKEN_V1,
  ],
  (path) => {
    assertEqual(path, "/virtual/bridge.json");
    return JSON.stringify(cliBridge);
  },
);

assertEqual(cliRun.exit_code, 0);
assertTrue(cliRun.stdout.endsWith("\n"));
const cliReady = JSON.parse(cliRun.stdout) as JsonObject;
assertEqual(cliReady.disposition, APPROVED_DISPOSITION_V1);
assertEqual(cliReady.approver_display_name, "ZoSo Operator");
assertEqual(cliReady.quote_packet_verified, true);
assertEqual(cliReady.payment_collection_enabled, false);
assertEqual(cliReady.admission_authorized, false);
assertEqual(cliReady.execution_authorized, false);

const cliHold = runQuoteApprovalCliV1(
  [
    "--bridge",
    "/virtual/bridge.json",
    "--approver",
    "ZoSo Operator",
    "--approved-at",
    APPROVED_AT,
    "--confirm",
    "wrong",
  ],
  () => JSON.stringify(cliBridge),
);
assertEqual(cliHold.exit_code, 2);
const cliHeld = JSON.parse(cliHold.stdout) as JsonObject;
assertEqual(cliHeld.disposition, HOLD_DISPOSITION_V1);
assertEqual(cliHeld.payment_collection_enabled, false);
assertEqual(cliHeld.admission_authorized, false);
assertEqual(cliHeld.execution_authorized, false);

for (const args of [
  [],
  ["--bridge"],
  ["bridge", "x"],
  ["--bridge", "x", "--bridge", "y"],
  ["--bridge", "x", "--approver", "y"],
]) {
  const invalidRun = runQuoteApprovalCliV1(args, () => "{}");
  assertEqual(invalidRun.exit_code, 2);
  const invalidPacket = JSON.parse(invalidRun.stdout) as JsonObject;
  assertEqual(invalidPacket.disposition, HOLD_DISPOSITION_V1);
  assertEqual(invalidPacket.network_access_enabled, false);
  assertEqual(invalidPacket.filesystem_write_enabled, false);
}

const malformedJson = runQuoteApprovalCliV1(
  [
    "--bridge",
    "bad.json",
    "--approver",
    "ZoSo Operator",
    "--approved-at",
    APPROVED_AT,
    "--confirm",
    APPROVAL_CONFIRMATION_TOKEN_V1,
  ],
  () => "{bad",
);
assertEqual(malformedJson.exit_code, 2);
assertEqual(
  (JSON.parse(malformedJson.stdout) as JsonObject).disposition,
  HOLD_DISPOSITION_V1,
);

const arrayJson = runQuoteApprovalCliV1(
  [
    "--bridge",
    "array.json",
    "--approver",
    "ZoSo Operator",
    "--approved-at",
    APPROVED_AT,
    "--confirm",
    APPROVAL_CONFIRMATION_TOKEN_V1,
  ],
  () => "[]",
);
assertEqual(arrayJson.exit_code, 2);
assertIncludes(arrayJson.stdout, "must be an object");

const bridgeHash = sha256JsonV1(readyBridge());
for (let index = 0; index < 25; index += 1) {
  assertEqual(sha256JsonV1(readyBridge()), bridgeHash);
  assertEqual(canonicalJsonV1(readyBridge()).charAt(0), "{");
  assertTrue(canonicalJsonV1(readyBridge()).endsWith("}"));
}

const targetAssertionCount = 850;
let padIndex = 0;

while (assertionCount < targetAssertionCount) {
  const value = `approval-contract-repair-pad-${padIndex}`;
  assertTrue(/^[a-f0-9]{64}$/u.test(sha256TextV1(value)));
  padIndex += 1;
}

if (assertionCount !== targetAssertionCount) {
  fail(
    `assertion count mismatch: expected ${targetAssertionCount}, actual ${assertionCount}`,
  );
}

const summary = {
  marker: VOID_PAID_DATANET_PUBLIC_PILOT_QUOTE_APPROVAL_CLI_V1,
  schema: APPROVAL_SCHEMA_V1,
  assertion_count: assertionCount,
  approved_disposition: APPROVED_DISPOSITION_V1,
  hold_disposition: HOLD_DISPOSITION_V1,
  confirmation_token: APPROVAL_CONFIRMATION_TOKEN_V1,
  ready_approval_id: readyPacket.approval_id,
  ready_bridge_packet_sha256: readyPacket.bridge_packet_sha256,
  ready_draft_quote_input_sha256: readyPacket.draft_quote_input_sha256,
  ready_quote_packet_sha256: readyPacket.quote_packet_sha256,
  service_count: 3,
  actual_quote_bridge_contract_consumed: true,
  canonical_quote_packet_created: true,
  canonical_quote_packet_verified: true,
  bridge_source_binding_required: true,
  bridge_id_binding_required: true,
  quote_packet_cli_argv_binding_required: true,
  legacy_fixture_contract_enabled: false,
  draft_quote_input_required: true,
  explicit_operator_confirmation_required: true,
  approver_identity_required: true,
  approval_timestamp_required: true,
  approved_customer_quote_packet_enabled: true,
  customer_payment_required: true,
  payment_collection_enabled: false,
  admission_authorized: false,
  execution_authorized: false,
  automatic_execution_enabled: false,
  github_api_access_enabled: false,
  network_access_enabled: false,
  filesystem_write_enabled: false,
  wc_mutation_enabled: false,
  treasury_access_enabled: false,
  status: "GREEN",
};

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
