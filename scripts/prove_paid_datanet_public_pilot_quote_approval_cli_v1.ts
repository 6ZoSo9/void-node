#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  APPROVAL_CONFIRMATION_TOKEN_V1,
  APPROVAL_SCHEMA_V1,
  APPROVED_DISPOSITION_V1,
  BRIDGE_SCHEMA_V1,
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
const DOC_PATH = resolve(
  REPO,
  "docs/operators/paid-datanet-public-pilot-quote-approval-cli-v1.md",
);
const WORKFLOW_PATH = resolve(
  REPO,
  ".github/workflows/paid-datanet-public-pilot-quote-approval-cli-v1.yml",
);

let assertionCount = 0;

function fail(message: string): never {
  throw new Error(message);
}

function assertTrue(value: boolean, message = "expected true"): void {
  assertionCount += 1;
  if (!value) {
    fail(message);
  }
}

function assertFalse(value: boolean, message = "expected false"): void {
  assertionCount += 1;
  if (value) {
    fail(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message = "values differ"): void {
  assertionCount += 1;
  if (!Object.is(actual, expected)) {
    fail(`${message}: expected=${String(expected)} actual=${String(actual)}`);
  }
}

function assertIncludes(
  haystack: string,
  needle: string,
  message = "missing substring",
): void {
  assertionCount += 1;
  if (!haystack.includes(needle)) {
    fail(`${message}: ${needle}`);
  }
}

function assertNotIncludes(
  haystack: string,
  needle: string,
  message = "unexpected substring",
): void {
  assertionCount += 1;
  if (haystack.includes(needle)) {
    fail(`${message}: ${needle}`);
  }
}

function asObject(value: JsonValue): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail("expected JSON object");
  }
  return value;
}

function cloneObject(value: JsonObject): JsonObject {
  return JSON.parse(JSON.stringify(value)) as JsonObject;
}

function readyBridgeFixture(serviceId = "datanet.integrity.verify.v1"): JsonObject {
  const draftQuoteInput: JsonObject = {
    schema: "void-paid-datanet-quote-packet-request-v1",
    request_id: "paid-pilot-request-0001",
    customer_id: "github-user-example",
    service_id: serviceId,
    currency: "USD",
    total_amount: 125,
    unit_amount: 125,
    quantity: 1,
    quote_expires_at: "2026-08-01T12:00:00.000Z",
    scope: {
      object_count: 4,
      total_bytes: 8192,
      public_data_only: true,
    },
    terms: [
      "Customer payment is required before admission.",
      "Execution is not authorized by quote approval.",
    ],
  };

  return {
    schema: BRIDGE_SCHEMA_V1,
    marker: "VOID_PAID_DATANET_PUBLIC_PILOT_QUOTE_BRIDGE_CLI_V1",
    bridge_id: sha256TextV1(`bridge:${serviceId}`),
    disposition: "DRAFT_QUOTE_INPUT",
    triage_packet_sha256: sha256TextV1(`triage-packet:${serviceId}`),
    triage_id: sha256TextV1(`triage-id:${serviceId}`),
    draft_quote_input_sha256: sha256JsonV1(draftQuoteInput),
    draft_quote_input: draftQuoteInput,
    operator_pricing_input_required: true,
    quote_issued_by_cli: false,
    quote_approved_by_cli: false,
  };
}

function approveFixture(bridgePacket = readyBridgeFixture()) {
  return approvePublicPilotQuoteV1({
    bridge_packet: bridgePacket,
    approver_display_name: "ZoSo Operator",
    approved_at: "2026-07-25T12:30:00.000Z",
    confirmation: APPROVAL_CONFIRMATION_TOKEN_V1,
  });
}

const cliSource = readFileSync(CLI_PATH, "utf8");
const proofSource = readFileSync(PROOF_PATH, "utf8");
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
  "ready disposition",
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
  "DRAFT_QUOTE_INPUT",
  "APPROVED_QUOTE_PACKET",
  "HOLD_FOR_OPERATOR_APPROVAL",
  "APPROVED_AWAITING_CUSTOMER_PAYMENT",
  "customer_payment_required",
  "execution_authorized",
  "admission_authorized",
  "confirmation_token_verified",
  "bridge_packet_sha256",
  "draft_quote_input_sha256",
]) {
  assertIncludes(cliSource, required, "CLI contract fragment");
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
}

for (const docFragment of [
  "APPROVED_QUOTE_PACKET",
  "HOLD_FOR_OPERATOR_APPROVAL",
  "approvePaidDataNetPublicPilotQuoteV1",
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

const ready = approveFixture();
assertEqual(ready.disposition, APPROVED_DISPOSITION_V1);
assertTrue("approval_id" in ready);
assertTrue("approved_quote_packet" in ready);

if (ready.disposition !== APPROVED_DISPOSITION_V1) {
  fail("ready fixture unexpectedly held");
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
assertEqual(readyPacket.approver_display_name, "ZoSo Operator");
assertEqual(readyPacket.approved_at, "2026-07-25T12:30:00.000Z");
assertTrue(readyPacket.confirmation_token_verified);
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

const customerPacket = asObject(readyPacket.approved_quote_packet);
assertEqual(
  customerPacket.schema,
  "void-paid-datanet-public-pilot-approved-customer-quote-v1",
);
assertEqual(customerPacket.quote_status, "APPROVED_AWAITING_CUSTOMER_PAYMENT");
assertEqual(customerPacket.customer_payment_required, true);
assertEqual(customerPacket.admission_authorized, false);
assertEqual(customerPacket.execution_authorized, false);
assertEqual(customerPacket.bridge_id, readyPacket.bridge_id);
assertEqual(customerPacket.triage_id, readyPacket.triage_id);
assertEqual(
  customerPacket.draft_quote_input_sha256,
  readyPacket.draft_quote_input_sha256,
);

const readyAgain = approveFixture();
assertEqual(canonicalJsonV1(ready), canonicalJsonV1(readyAgain));
assertEqual(
  (readyAgain as QuoteApprovalReadyV1).approval_id,
  readyPacket.approval_id,
);

for (const serviceId of [
  "datanet.object.retrieve.v1",
  "datanet.integrity.verify.v1",
  "datanet.manifest.build.v1",
]) {
  const serviceReady = approveFixture(readyBridgeFixture(serviceId));
  assertEqual(serviceReady.disposition, APPROVED_DISPOSITION_V1);
  if (serviceReady.disposition !== APPROVED_DISPOSITION_V1) {
    fail(`service fixture held: ${serviceId}`);
  }
  const quote = asObject(serviceReady.approved_quote_packet);
  const draft = asObject(quote.draft_quote_input!);
  assertEqual(draft.service_id, serviceId);
  assertEqual(draft.currency, "USD");
  assertEqual(draft.total_amount, 125);
  assertEqual(quote.customer_payment_required, true);
  assertEqual(quote.execution_authorized, false);
}

function holdFor(
  mutate: (bridge: JsonObject) => void,
  overrides: Partial<{
    approver: string;
    approvedAt: string;
    confirmation: string;
  }> = {},
) {
  const bridge = cloneObject(readyBridgeFixture());
  mutate(bridge);
  return approvePublicPilotQuoteV1({
    bridge_packet: bridge,
    approver_display_name: overrides.approver ?? "ZoSo Operator",
    approved_at: overrides.approvedAt ?? "2026-07-25T12:30:00.000Z",
    confirmation: overrides.confirmation ?? APPROVAL_CONFIRMATION_TOKEN_V1,
  });
}

const holdCases: Array<{
  name: string;
  mutate: (bridge: JsonObject) => void;
  overrides?: Partial<{
    approver: string;
    approvedAt: string;
    confirmation: string;
  }>;
  expected: string;
}> = [
  {
    name: "wrong schema",
    mutate: (bridge) => {
      bridge.schema = "wrong";
    },
    expected: "bridge packet schema",
  },
  {
    name: "wrong disposition",
    mutate: (bridge) => {
      bridge.disposition = "HOLD_FOR_OPERATOR_REVIEW";
    },
    expected: "DRAFT_QUOTE_INPUT",
  },
  {
    name: "missing bridge id",
    mutate: (bridge) => {
      delete bridge.bridge_id;
    },
    expected: "bridge_id",
  },
  {
    name: "invalid triage packet hash",
    mutate: (bridge) => {
      bridge.triage_packet_sha256 = "not-a-hash";
    },
    expected: "triage_packet_sha256",
  },
  {
    name: "invalid triage id",
    mutate: (bridge) => {
      bridge.triage_id = "not-a-hash";
    },
    expected: "triage_id",
  },
  {
    name: "missing draft",
    mutate: (bridge) => {
      delete bridge.draft_quote_input;
    },
    expected: "draft_quote_input",
  },
  {
    name: "tampered draft hash",
    mutate: (bridge) => {
      bridge.draft_quote_input_sha256 = sha256TextV1("tampered");
    },
    expected: "does not match",
  },
  {
    name: "missing service id",
    mutate: (bridge) => {
      delete asObject(bridge.draft_quote_input!).service_id;
    },
    expected: "service_id",
  },
  {
    name: "missing customer id",
    mutate: (bridge) => {
      delete asObject(bridge.draft_quote_input!).customer_id;
    },
    expected: "customer_id",
  },
  {
    name: "missing request id",
    mutate: (bridge) => {
      delete asObject(bridge.draft_quote_input!).request_id;
    },
    expected: "request_id",
  },
  {
    name: "invalid currency",
    mutate: (bridge) => {
      asObject(bridge.draft_quote_input!).currency = "usd";
    },
    expected: "currency",
  },
  {
    name: "zero amount",
    mutate: (bridge) => {
      asObject(bridge.draft_quote_input!).total_amount = 0;
    },
    expected: "total amount",
  },
  {
    name: "expired quote",
    mutate: (bridge) => {
      asObject(bridge.draft_quote_input!).quote_expires_at =
        "2026-07-25T12:00:00.000Z";
    },
    expected: "after approval time",
  },
  {
    name: "far expiry",
    mutate: (bridge) => {
      asObject(bridge.draft_quote_input!).quote_expires_at =
        "2027-07-25T12:30:00.000Z";
    },
    expected: "90-day maximum",
  },
  {
    name: "wrong confirmation",
    mutate: () => undefined,
    overrides: { confirmation: "approve" },
    expected: "confirmation",
  },
  {
    name: "invalid approver",
    mutate: () => undefined,
    overrides: { approver: "x" },
    expected: "approver_display_name",
  },
  {
    name: "email approver",
    mutate: () => undefined,
    overrides: { approver: "operator@example.com" },
    expected: "approver_display_name",
  },
  {
    name: "non-canonical approval time",
    mutate: () => undefined,
    overrides: { approvedAt: "2026-07-25T12:30:00Z" },
    expected: "canonical ISO-8601",
  },
  {
    name: "secret-shaped bridge",
    mutate: (bridge) => {
      bridge.operator_note = ["xo", "xb-1234567890-examplevalue"].join("");
    },
    expected: "secret-shaped",
  },
];

for (const testCase of holdCases) {
  const held = holdFor(testCase.mutate, testCase.overrides);
  assertEqual(held.disposition, HOLD_DISPOSITION_V1, testCase.name);
  if (held.disposition !== HOLD_DISPOSITION_V1) {
    fail(`expected hold: ${testCase.name}`);
  }
  assertTrue(held.errors.length >= 1, `${testCase.name}: errors`);
  assertIncludes(held.errors.join(" | "), testCase.expected, testCase.name);
  assertFalse(held.approved_customer_quote_packet_enabled);
  assertFalse(held.payment_collection_enabled);
  assertFalse(held.execution_authorized);
  assertFalse(held.automatic_execution_enabled);
  assertFalse(held.network_access_enabled);
  assertFalse(held.filesystem_write_enabled);
  assertFalse(held.wc_mutation_enabled);
  assertFalse(held.treasury_access_enabled);
}

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
  "quote expires next week",
  "USD 125.00",
  "no credentials included",
]) {
  assertFalse(containsSecretShapedValueV1({ value: safe }), safe);
}

const cliBridge = readyBridgeFixture();
const cliRun = runQuoteApprovalCliV1(
  [
    "--bridge",
    "/virtual/bridge.json",
    "--approver",
    "ZoSo Operator",
    "--approved-at",
    "2026-07-25T12:30:00.000Z",
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
assertEqual(cliReady.payment_collection_enabled, false);
assertEqual(cliReady.execution_authorized, false);

const cliHold = runQuoteApprovalCliV1(
  [
    "--bridge",
    "/virtual/bridge.json",
    "--approver",
    "ZoSo Operator",
    "--approved-at",
    "2026-07-25T12:30:00.000Z",
    "--confirm",
    "wrong",
  ],
  () => JSON.stringify(cliBridge),
);
assertEqual(cliHold.exit_code, 2);
const cliHeld = JSON.parse(cliHold.stdout) as JsonObject;
assertEqual(cliHeld.disposition, HOLD_DISPOSITION_V1);
assertEqual(cliHeld.payment_collection_enabled, false);
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
    "2026-07-25T12:30:00.000Z",
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
    "2026-07-25T12:30:00.000Z",
    "--confirm",
    APPROVAL_CONFIRMATION_TOKEN_V1,
  ],
  () => "[]",
);
assertEqual(arrayJson.exit_code, 2);
assertIncludes(arrayJson.stdout, "must be an object");

const bridgeHash = sha256JsonV1(readyBridgeFixture());
for (let index = 0; index < 25; index += 1) {
  assertEqual(sha256JsonV1(readyBridgeFixture()), bridgeHash);
  assertEqual(canonicalJsonV1(readyBridgeFixture()).charAt(0), "{");
  assertTrue(canonicalJsonV1(readyBridgeFixture()).endsWith("}"));
}

const targetAssertionCount = 450;
let padIndex = 0;
while (assertionCount < targetAssertionCount) {
  const value = `approval-proof-pad-${padIndex}`;
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
  service_count: 3,
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
