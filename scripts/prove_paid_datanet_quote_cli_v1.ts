import assert from "node:assert/strict";

import {
  PAID_DATANET_QUOTE_CLI_V1_MARKER,
  PAID_DATANET_QUOTE_CLI_V1_SCHEMA,
  parsePaidDatanetQuoteCliArgsV1,
  runPaidDatanetQuoteCliV1,
  type PaidDatanetQuoteCliIoV1,
} from "./paid_datanet_quote_cli_v1.js";

import {
  PAID_DATANET_QUOTE_V1_SCHEMA,
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
  pattern: RegExp,
  message?: string,
): void {
  assert.match(actual, pattern, message);
  assertions += 1;
}

interface Capture {
  readonly stdout: string[];
  readonly stderr: string[];
  readonly io: PaidDatanetQuoteCliIoV1;
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
  const exitCode = runPaidDatanetQuoteCliV1(argv, target.io);
  return {
    exitCode,
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
    quote_created: boolean;
    payment_collection_enabled: boolean;
    execution_authorized: boolean;
    automatic_execution_enabled: boolean;
    treasury_access_enabled: boolean;
  };
  equal(payload.schema, PAID_DATANET_QUOTE_CLI_V1_SCHEMA);
  equal(payload.marker, PAID_DATANET_QUOTE_CLI_V1_MARKER);
  equal(payload.status, "ERROR");
  matches(payload.error, pattern);
  equal(payload.quote_created, false);
  equal(payload.payment_collection_enabled, false);
  equal(payload.execution_authorized, false);
  equal(payload.automatic_execution_enabled, false);
  equal(payload.treasury_access_enabled, false);
}

const noArgs = runCase([]);
equal(noArgs.exitCode, 0);
equal(noArgs.stderr.length, 0);
equal(noArgs.stdout.length, 1);
matches(noArgs.stdout[0] ?? "", /Generate deterministic/);
matches(noArgs.stdout[0] ?? "", /Automatic execution: disabled/);

const help = runCase(["--help"]);
equal(help.exitCode, 0);
deepEqual(help, noArgs);

const listCompact = runCase(["--list-services"]);
equal(listCompact.exitCode, 0);
equal(listCompact.stderr.length, 0);
const listPayload = parseSingleJson(listCompact.stdout) as {
  schema: string;
  marker: string;
  service_count: number;
  quote_only: boolean;
  automatic_execution_enabled: boolean;
  automatic_payment_collection_enabled: boolean;
  treasury_access_enabled: boolean;
  services: Array<{
    service_code: string;
    currency: string;
    pricing: {
      base_cents: number;
    };
  }>;
};
equal(listPayload.schema, PAID_DATANET_QUOTE_CLI_V1_SCHEMA);
equal(listPayload.marker, PAID_DATANET_QUOTE_CLI_V1_MARKER);
equal(listPayload.service_count, 3);
equal(listPayload.services.length, 3);
equal(listPayload.quote_only, true);
equal(listPayload.automatic_execution_enabled, false);
equal(listPayload.automatic_payment_collection_enabled, false);
equal(listPayload.treasury_access_enabled, false);
deepEqual(
  listPayload.services.map((service) => service.service_code),
  [
    "datanet.object-integrity-check.v1",
    "datanet.public-retrieval-evidence.v1",
    "datanet.dataset-replication-audit.v1",
  ],
);
equal(listPayload.services[0]?.currency, "USD_CENTS");
equal(listPayload.services[0]?.pricing.base_cents, 250);
equal(listPayload.services[1]?.pricing.base_cents, 400);
equal(listPayload.services[2]?.pricing.base_cents, 1200);

const listPretty = runCase([
  "--list-services",
  "--format",
  "pretty",
]);
equal(listPretty.exitCode, 0);
equal(listPretty.stderr.length, 0);
equal(listPretty.stdout.length, 1);
matches(listPretty.stdout[0] ?? "", /\n  "marker"/);
deepEqual(
  JSON.parse(listPretty.stdout[0] ?? ""),
  listPayload,
);

const baseQuoteArgs = [
  "--request-id",
  "request-cli-001",
  "--requester-id",
  "customer-cli-001",
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

const parsedCommand = parsePaidDatanetQuoteCliArgsV1(baseQuoteArgs);
equal(parsedCommand.kind, "quote");
if (parsedCommand.kind !== "quote") {
  throw new Error("expected quote command");
}
equal(parsedCommand.format, "compact");
equal(parsedCommand.request.request_id, "request-cli-001");
equal(parsedCommand.request.requester_id, "customer-cli-001");
equal(
  parsedCommand.request.service_code,
  "datanet.object-integrity-check.v1",
);
equal(parsedCommand.request.object_count, 2);
equal(parsedCommand.request.total_bytes, 1_048_577);
equal(parsedCommand.request.operator_cost_basis_cents, 200);
equal(parsedCommand.request.requested_at_ms, 1_800_000_000_000);

const quoteCompact = runCase(baseQuoteArgs);
equal(quoteCompact.exitCode, 0);
equal(quoteCompact.stderr.length, 0);
const quotePayload = parseSingleJson(quoteCompact.stdout) as {
  schema: string;
  marker: string;
  quote_id: string;
  quote_only: boolean;
  service_code: string;
  currency: string;
  request: {
    request_id: string;
    requester_id: string;
    billable_mib: number;
  };
  pricing: {
    catalog_subtotal_cents: number;
    cost_protected_subtotal_cents: number;
    quoted_total_cents: number;
  };
  controls: {
    operator_approval_required: boolean;
    customer_payment_required_before_work: boolean;
    automatic_execution_enabled: boolean;
    automatic_payment_collection_enabled: boolean;
    treasury_access_enabled: boolean;
  };
};
equal(quotePayload.schema, PAID_DATANET_QUOTE_V1_SCHEMA);
matches(quotePayload.quote_id, /^[0-9a-f]{64}$/);
equal(quotePayload.quote_only, true);
equal(
  quotePayload.service_code,
  "datanet.object-integrity-check.v1",
);
equal(quotePayload.currency, "USD_CENTS");
equal(quotePayload.request.request_id, "request-cli-001");
equal(quotePayload.request.requester_id, "customer-cli-001");
equal(quotePayload.request.billable_mib, 2);
equal(quotePayload.pricing.catalog_subtotal_cents, 304);
equal(quotePayload.pricing.cost_protected_subtotal_cents, 267);
equal(quotePayload.pricing.quoted_total_cents, 304);
equal(quotePayload.controls.operator_approval_required, true);
equal(
  quotePayload.controls.customer_payment_required_before_work,
  true,
);
equal(quotePayload.controls.automatic_execution_enabled, false);
equal(
  quotePayload.controls.automatic_payment_collection_enabled,
  false,
);
equal(quotePayload.controls.treasury_access_enabled, false);

const expectedDirectQuote = quotePaidDatanetServiceV1({
  request_id: "request-cli-001",
  requester_id: "customer-cli-001",
  service_code: "datanet.object-integrity-check.v1",
  object_count: 2,
  total_bytes: 1_048_577,
  operator_cost_basis_cents: 200,
  requested_at_ms: 1_800_000_000_000,
});
deepEqual(quotePayload, expectedDirectQuote);

const quoteRepeated = runCase(baseQuoteArgs);
equal(quoteRepeated.exitCode, 0);
deepEqual(quoteRepeated, quoteCompact);

const quotePretty = runCase([
  ...baseQuoteArgs,
  "--format",
  "pretty",
]);
equal(quotePretty.exitCode, 0);
equal(quotePretty.stderr.length, 0);
equal(quotePretty.stdout.length, 1);
matches(quotePretty.stdout[0] ?? "", /\n  "schema"/);
deepEqual(
  JSON.parse(quotePretty.stdout[0] ?? ""),
  quotePayload,
);

const costProtected = runCase([
  ...baseQuoteArgs.slice(0, 10),
  "--operator-cost-basis-cents",
  "1000",
  "--requested-at-ms",
  "1800000000000",
]);
equal(costProtected.exitCode, 0);
const costPayload = parseSingleJson(costProtected.stdout) as {
  pricing: {
    catalog_subtotal_cents: number;
    cost_protected_subtotal_cents: number;
    quoted_total_cents: number;
  };
};
equal(costPayload.pricing.catalog_subtotal_cents, 304);
equal(costPayload.pricing.cost_protected_subtotal_cents, 1334);
equal(costPayload.pricing.quoted_total_cents, 1334);

expectError(["--help", "--format", "pretty"], /cannot be combined/);
expectError(
  ["--list-services", "--request-id", "request-cli-001"],
  /may only be combined/,
);
expectError(["--list-services", "--format"], /missing value/);
expectError(["--list-services", "--format", "yaml"], /compact or pretty/);
expectError(["--unknown", "value"], /unknown option/);
expectError(["request-cli-001"], /missing value|unexpected positional/);
expectError(
  ["--request-id", "request-cli-001", "--request-id", "again"],
  /duplicate option/,
);
expectError(["--request-id"], /missing value/);
expectError(
  [
    "--request-id",
    "--requester-id",
    "customer-cli-001",
  ],
  /missing value/,
);
expectError(
  [
    "--request-id",
    "request-cli-001",
    "--requester-id",
    "customer-cli-001",
  ],
  /missing required option: --service-code/,
);
expectError(
  [
    ...baseQuoteArgs.slice(0, 4),
    "--service-code",
    "unknown.service",
    ...baseQuoteArgs.slice(6),
  ],
  /unknown paid DataNet service/,
);
expectError(
  [
    ...baseQuoteArgs.slice(0, 7),
    "2.5",
    ...baseQuoteArgs.slice(8),
  ],
  /unsigned base-10 integer/,
);
expectError(
  [
    ...baseQuoteArgs.slice(0, 7),
    "-1",
    ...baseQuoteArgs.slice(8),
  ],
  /unsigned base-10 integer/,
);
expectError(
  [
    ...baseQuoteArgs.slice(0, 7),
    "01",
    ...baseQuoteArgs.slice(8),
  ],
  /unsigned base-10 integer/,
);
expectError(
  [
    ...baseQuoteArgs.slice(0, 7),
    "0",
    ...baseQuoteArgs.slice(8),
  ],
  /object_count must be a safe integer/,
);
expectError(
  [
    ...baseQuoteArgs.slice(0, 9),
    "0",
    ...baseQuoteArgs.slice(10),
  ],
  /total_bytes must be a safe integer/,
);
expectError(
  [
    ...baseQuoteArgs.slice(0, 9),
    "268435457",
    ...baseQuoteArgs.slice(10),
  ],
  /total_bytes must be a safe integer/,
);
expectError(
  [
    ...baseQuoteArgs.slice(0, 11),
    "9007199254740992",
    ...baseQuoteArgs.slice(12),
  ],
  /safe integer/,
);
expectError(
  [
    "--request-id",
    "x",
    ...baseQuoteArgs.slice(2),
  ],
  /request_id must match/,
);
expectError(
  [
    ...baseQuoteArgs.slice(0, 3),
    "contains space",
    ...baseQuoteArgs.slice(4),
  ],
  /requester_id must match/,
);
expectError(
  [
    ...baseQuoteArgs,
    "--format",
    "yaml",
  ],
  /compact or pretty/,
);

equal(assertions >= 200, true);

console.log(
  JSON.stringify(
    {
      marker: PAID_DATANET_QUOTE_CLI_V1_MARKER,
      schema: PAID_DATANET_QUOTE_CLI_V1_SCHEMA,
      assertion_count: assertions,
      service_count: listPayload.service_count,
      deterministic_quote_id: quotePayload.quote_id,
      stdout_only_success: true,
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
