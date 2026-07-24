import assert from "node:assert/strict";

import {
  PAID_DATANET_QUOTE_PACKET_CLI_V1_SCHEMA,
  PAID_DATANET_QUOTE_PACKET_V1_MARKER,
  PAID_DATANET_QUOTE_PACKET_V1_SCHEMA,
  createPaidDatanetQuotePacketV1,
  parsePaidDatanetQuotePacketCliArgsV1,
  runPaidDatanetQuotePacketCliV1,
  verifyPaidDatanetQuotePacketV1,
  type PaidDatanetQuotePacketCliIoV1,
  type PaidDatanetQuotePacketV1,
} from "./paid_datanet_quote_packet_v1.js";

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

interface Capture {
  readonly stdout: string[];
  readonly stderr: string[];
  readonly io: PaidDatanetQuotePacketCliIoV1;
}

function capture(): Capture {
  const stdout: string[] = [];
  const stderr: string[] = [];

  return {
    stdout,
    stderr,
    io: {
      stdout: (value: string): void => {
        stdout.push(value);
      },
      stderr: (value: string): void => {
        stderr.push(value);
      },
    },
  };
}

function runCase(argv: readonly string[]): {
  readonly exitCode: number;
  readonly stdout: string[];
  readonly stderr: string[];
} {
  const target = capture();
  return {
    exitCode: runPaidDatanetQuotePacketCliV1(argv, target.io),
    stdout: target.stdout,
    stderr: target.stderr,
  };
}

function parseSingleJson(values: readonly string[]): unknown {
  equal(values.length, 1);
  return JSON.parse(values[0] ?? "");
}

function expectError(
  argv: readonly string[],
  pattern: RegExp,
): void {
  const result = runCase(argv);
  equal(result.exitCode, 2);
  equal(result.stdout.length, 0);

  const payload = parseSingleJson(result.stderr) as {
    schema: string;
    marker: string;
    status: string;
    error: string;
    packet_created: boolean;
    payment_collection_enabled: boolean;
    execution_authorized: boolean;
    automatic_execution_enabled: boolean;
    wc_mutation_enabled: boolean;
    treasury_access_enabled: boolean;
  };

  equal(payload.schema, PAID_DATANET_QUOTE_PACKET_CLI_V1_SCHEMA);
  equal(payload.marker, PAID_DATANET_QUOTE_PACKET_V1_MARKER);
  equal(payload.status, "ERROR");
  matches(payload.error, pattern);
  equal(payload.packet_created, false);
  equal(payload.payment_collection_enabled, false);
  equal(payload.execution_authorized, false);
  equal(payload.automatic_execution_enabled, false);
  equal(payload.wc_mutation_enabled, false);
  equal(payload.treasury_access_enabled, false);
}

const packetRequest = {
  issuer_name: "VOID Network",
  customer_name: "Example Customer",
  customer_reference: "customer-ref-001",
  quote_request: {
    request_id: "request-packet-001",
    requester_id: "customer-account-001",
    service_code: "datanet.object-integrity-check.v1" as const,
    object_count: 2,
    total_bytes: 1_048_577,
    operator_cost_basis_cents: 200,
    requested_at_ms: 1_800_000_000_000,
  },
};

const packet = createPaidDatanetQuotePacketV1(packetRequest);
equal(packet.schema, PAID_DATANET_QUOTE_PACKET_V1_SCHEMA);
equal(packet.marker, PAID_DATANET_QUOTE_PACKET_V1_MARKER);
matches(packet.packet_sha256, /^[0-9a-f]{64}$/);
equal(packet.packet_created_at_ms, 1_800_000_000_000);
equal(packet.packet_created_at_iso, "2027-01-15T08:00:00.000Z");
equal(packet.issuer.display_name, "VOID Network");
equal(packet.customer.display_name, "Example Customer");
equal(packet.customer.customer_reference, "customer-ref-001");
equal(packet.quote.service_code, "datanet.object-integrity-check.v1");
equal(packet.quote.request.object_count, 2);
equal(packet.quote.request.total_bytes, 1_048_577);
equal(packet.quote.request.billable_mib, 2);
equal(packet.quote.pricing.catalog_subtotal_cents, 304);
equal(packet.quote.pricing.cost_protected_subtotal_cents, 267);
equal(packet.quote.pricing.quoted_total_cents, 304);
equal(packet.summary.service_name, "DataNet Object Integrity Check");
equal(packet.summary.service_code, packet.quote.service_code);
equal(packet.summary.object_count, 2);
equal(packet.summary.total_bytes, 1_048_577);
equal(packet.summary.billable_mib, 2);
equal(packet.summary.currency, "USD_CENTS");
equal(packet.summary.quoted_total_cents, 304);
equal(packet.summary.quoted_total_display, "$3.04");
equal(packet.summary.valid_from_iso, "2027-01-15T08:00:00.000Z");
equal(packet.summary.valid_until_iso, "2027-01-15T08:15:00.000Z");
equal(packet.terms.quote_only, true);
equal(packet.terms.operator_approval_required, true);
equal(packet.terms.customer_payment_required_before_work, true);
equal(packet.terms.tax_included, false);
equal(packet.terms.payment_collection_enabled, false);
equal(packet.terms.execution_authorized, false);
equal(packet.terms.automatic_execution_enabled, false);
equal(packet.terms.wc_mutation_enabled, false);
equal(packet.terms.treasury_access_enabled, false);
equal(packet.required_evidence.length, 5);
equal(packet.exclusions.length, 4);
equal(Object.isFrozen(packet), true);
equal(Object.isFrozen(packet.issuer), true);
equal(Object.isFrozen(packet.customer), true);
equal(Object.isFrozen(packet.summary), true);
equal(Object.isFrozen(packet.terms), true);
equal(Object.isFrozen(packet.required_evidence), true);
equal(Object.isFrozen(packet.exclusions), true);
matches(packet.markdown, /^# VOID DataNet Service Quote/);
matches(packet.markdown, /\*\*Quoted total: \$3\.04 USD\*\*/);
matches(packet.markdown, /Tax included: No/);
matches(packet.markdown, /Operator approval is required/);
matches(packet.markdown, /Payment collection is not performed/);
matches(packet.markdown, /Work Credits are not issued or modified/);
matches(packet.markdown, /Treasury access and automatic execution are disabled/);
equal(verifyPaidDatanetQuotePacketV1(packet), true);

const packetRepeated = createPaidDatanetQuotePacketV1({
  ...packetRequest,
  quote_request: { ...packetRequest.quote_request },
});
deepEqual(packetRepeated, packet);
equal(packetRepeated.packet_sha256, packet.packet_sha256);
equal(packetRepeated.markdown, packet.markdown);

const costProtectedPacket = createPaidDatanetQuotePacketV1({
  ...packetRequest,
  quote_request: {
    ...packetRequest.quote_request,
    request_id: "request-packet-002",
    operator_cost_basis_cents: 1000,
  },
});
equal(costProtectedPacket.summary.quoted_total_cents, 1334);
equal(costProtectedPacket.summary.quoted_total_display, "$13.34");
matches(costProtectedPacket.markdown, /\$13\.34 USD/);
equal(verifyPaidDatanetQuotePacketV1(costProtectedPacket), true);
equal(
  costProtectedPacket.packet_sha256 === packet.packet_sha256,
  false,
);

const markdownEscapingPacket = createPaidDatanetQuotePacketV1({
  ...packetRequest,
  issuer_name: "VOID Network (Ops)",
  customer_name: "Example Customer-2",
  customer_reference: "customer-ref-002",
  quote_request: {
    ...packetRequest.quote_request,
    request_id: "request-packet-003",
  },
});
matches(markdownEscapingPacket.markdown, /VOID Network \\\(Ops\\\)/);
matches(markdownEscapingPacket.markdown, /Example Customer\\-2/);
equal(verifyPaidDatanetQuotePacketV1(markdownEscapingPacket), true);

const tamperCases: PaidDatanetQuotePacketV1[] = [
  {
    ...packet,
    packet_sha256: "0".repeat(64),
  },
  {
    ...packet,
    marker: "VOID_PAID_DATANET_QUOTE_PACKET_V2" as never,
  },
  {
    ...packet,
    customer: {
      ...packet.customer,
      display_name: "Different Customer",
    },
  },
  {
    ...packet,
    summary: {
      ...packet.summary,
      quoted_total_cents: 305,
    },
  },
  {
    ...packet,
    summary: {
      ...packet.summary,
      quoted_total_display: "$3.05",
    },
  },
  {
    ...packet,
    terms: {
      ...packet.terms,
      payment_collection_enabled: true as never,
    },
  },
  {
    ...packet,
    markdown: `${packet.markdown}\nTampered`,
  },
  {
    ...packet,
    required_evidence: [...packet.required_evidence, "invented evidence"],
  },
  {
    ...packet,
    exclusions: [],
  },
  {
    ...packet,
    quote: {
      ...packet.quote,
      quote_id: "0".repeat(64),
    },
  },
];

for (const tampered of tamperCases) {
  equal(verifyPaidDatanetQuotePacketV1(tampered), false);
}

const baseArgs = [
  "--issuer-name",
  "VOID Network",
  "--customer-name",
  "Example Customer",
  "--customer-reference",
  "customer-ref-001",
  "--request-id",
  "request-packet-001",
  "--requester-id",
  "customer-account-001",
  "--service-code",
  "datanet.object-integrity-check.v1",
  "--object-count",
  "2",
  "--total-bytes",
  "1048577",
  "--operator-cost-basis-cents",
  "200",
  "--requested-at-ms",
  "1800000000000",
] as const;

const parsed = parsePaidDatanetQuotePacketCliArgsV1(baseArgs);
equal(parsed.kind, "packet");
if (parsed.kind !== "packet") {
  throw new Error("expected packet command");
}
equal(parsed.format, "json");
deepEqual(parsed.request, packetRequest);

const help = runCase([]);
equal(help.exitCode, 0);
equal(help.stdout.length, 1);
equal(help.stderr.length, 0);
matches(help.stdout[0] ?? "", /Generate a deterministic customer-facing/);
matches(help.stdout[0] ?? "", /No payment is collected/);

const explicitHelp = runCase(["--help"]);
deepEqual(explicitHelp, help);

const jsonRun = runCase(baseArgs);
equal(jsonRun.exitCode, 0);
equal(jsonRun.stderr.length, 0);
const jsonPacket = parseSingleJson(jsonRun.stdout) as PaidDatanetQuotePacketV1;
deepEqual(jsonPacket, packet);
equal(verifyPaidDatanetQuotePacketV1(jsonPacket), true);

const repeatedJsonRun = runCase(baseArgs);
deepEqual(repeatedJsonRun, jsonRun);

const markdownRun = runCase([...baseArgs, "--format", "markdown"]);
equal(markdownRun.exitCode, 0);
equal(markdownRun.stderr.length, 0);
equal(markdownRun.stdout.length, 1);
equal(markdownRun.stdout[0], packet.markdown);

expectError(["--help", "--format", "json"], /cannot be combined/);
expectError(["--unknown", "value"], /unknown option/);
expectError(["issuer"], /missing value|unexpected positional/);
expectError(["--issuer-name"], /missing value/);
expectError(
  ["--issuer-name", "VOID Network", "--issuer-name", "Again"],
  /duplicate option/,
);
expectError(
  ["--issuer-name", "VOID Network"],
  /missing required option: --customer-name/,
);
expectError(
  [
    ...baseArgs.slice(0, 11),
    "unknown.service",
    ...baseArgs.slice(12),
  ],
  /unknown paid DataNet service/,
);
expectError(
  [
    "--issuer-name",
    "X",
    ...baseArgs.slice(2),
  ],
  /issuer_name must be 2-80/,
);
expectError(
  [
    ...baseArgs.slice(0, 3),
    "Bad  Customer",
    ...baseArgs.slice(4),
  ],
  /customer_name must be 2-80/,
);
expectError(
  [
    ...baseArgs.slice(0, 5),
    "bad reference",
    ...baseArgs.slice(6),
  ],
  /customer_reference must match/,
);
expectError(
  [
    ...baseArgs.slice(0, 13),
    "2.5",
    ...baseArgs.slice(14),
  ],
  /unsigned base-10 integer/,
);
expectError(
  [
    ...baseArgs.slice(0, 13),
    "0",
    ...baseArgs.slice(14),
  ],
  /object_count must be a safe integer/,
);
expectError(
  [
    ...baseArgs.slice(0, 15),
    "0",
    ...baseArgs.slice(16),
  ],
  /total_bytes must be a safe integer/,
);
expectError(
  [
    ...baseArgs.slice(0, 17),
    "-1",
    ...baseArgs.slice(18),
  ],
  /unsigned base-10 integer/,
);
expectError(
  [
    ...baseArgs.slice(0, 19),
    "9007199254740992",
  ],
  /safe integer/,
);
expectError(
  [...baseArgs, "--format", "html"],
  /json or markdown/,
);
expectError(
  [
    ...baseArgs.slice(0, 7),
    "x",
    ...baseArgs.slice(8),
  ],
  /request_id must match/,
);
expectError(
  [
    ...baseArgs.slice(0, 9),
    "contains space",
    ...baseArgs.slice(10),
  ],
  /requester_id must match/,
);

const services = [
  {
    code: "datanet.object-integrity-check.v1" as const,
    expectedName: "DataNet Object Integrity Check",
  },
  {
    code: "datanet.public-retrieval-evidence.v1" as const,
    expectedName: "DataNet Public Retrieval Evidence",
  },
  {
    code: "datanet.dataset-replication-audit.v1" as const,
    expectedName: "DataNet Dataset Replication Audit",
  },
];

for (const [index, service] of services.entries()) {
  const servicePacket = createPaidDatanetQuotePacketV1({
    ...packetRequest,
    customer_reference: `service-customer-${index + 1}`,
    quote_request: {
      ...packetRequest.quote_request,
      request_id: `service-request-${index + 1}`,
      service_code: service.code,
      object_count: 1,
      total_bytes: 1,
    },
  });
  equal(servicePacket.summary.service_name, service.expectedName);
  equal(servicePacket.summary.service_code, service.code);
  equal(verifyPaidDatanetQuotePacketV1(servicePacket), true);
  matches(servicePacket.markdown, new RegExp(service.expectedName));
}

equal(assertions >= 240, true);

console.log(
  JSON.stringify(
    {
      marker: PAID_DATANET_QUOTE_PACKET_V1_MARKER,
      schema: PAID_DATANET_QUOTE_PACKET_V1_SCHEMA,
      assertion_count: assertions,
      deterministic_packet_sha256: packet.packet_sha256,
      deterministic_quote_id: packet.quote.quote_id,
      markdown_embedded: true,
      json_output_supported: true,
      markdown_output_supported: true,
      quote_only: true,
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
