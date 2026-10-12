import { pathToFileURL } from "node:url";

import {
  PAID_DATANET_SERVICE_CATALOG_V1,
  PAID_DATANET_SERVICE_CATALOG_V1_MARKER,
  PAID_DATANET_SERVICE_CATALOG_V1_SCHEMA,
  getPaidDatanetServiceV1,
  quotePaidDatanetServiceV1,
  type PaidDatanetQuoteRequestV1,
  type PaidDatanetServiceCodeV1,
} from "../src/paid_services/datanet_service_catalog_v1.js";

export const PAID_DATANET_QUOTE_CLI_V1_MARKER =
  "VOID_PAID_DATANET_QUOTE_CLI_V1" as const;

export const PAID_DATANET_QUOTE_CLI_V1_SCHEMA =
  "void-paid-datanet-quote-cli-v1" as const;

type OutputFormat = "compact" | "pretty";

export interface PaidDatanetQuoteCliIoV1 {
  readonly stdout: (value: string) => void;
  readonly stderr: (value: string) => void;
}

type PaidDatanetQuoteCliCommandV1 =
  | {
      readonly kind: "help";
    }
  | {
      readonly kind: "list-services";
      readonly format: OutputFormat;
    }
  | {
      readonly kind: "quote";
      readonly format: OutputFormat;
      readonly request: PaidDatanetQuoteRequestV1;
    };

const HELP_TEXT = `\
${PAID_DATANET_QUOTE_CLI_V1_MARKER}

Generate deterministic, quote-only Paid DataNet offers without contacting
a network or collecting payment.

Usage:
  npx --no-install tsx scripts/paid_datanet_quote_cli_v1.ts --help

  npx --no-install tsx scripts/paid_datanet_quote_cli_v1.ts \\
    --list-services [--format compact|pretty]

  npx --no-install tsx scripts/paid_datanet_quote_cli_v1.ts \\
    --request-id <id> \\
    --requester-id <id> \\
    --service-code <service-code> \\
    --object-count <integer> \\
    --total-bytes <integer> \\
    --operator-cost-basis-cents <integer> \\
    --requested-at-ms <integer> \\
    [--format compact|pretty]

Controls:
  Quote generation only.
  Automatic execution: disabled.
  Automatic payment collection: disabled.
  Treasury access: disabled.
`;

const QUOTE_VALUE_FLAGS = Object.freeze([
  "--request-id",
  "--requester-id",
  "--service-code",
  "--object-count",
  "--total-bytes",
  "--operator-cost-basis-cents",
  "--requested-at-ms",
  "--format",
] as const);

const QUOTE_VALUE_FLAG_SET = new Set<string>(QUOTE_VALUE_FLAGS);

function defaultIo(): PaidDatanetQuoteCliIoV1 {
  return {
    stdout: (value: string): void => {
      process.stdout.write(value.endsWith("\n") ? value : `${value}\n`);
    },
    stderr: (value: string): void => {
      process.stderr.write(value.endsWith("\n") ? value : `${value}\n`);
    },
  };
}

function serialize(value: unknown, format: OutputFormat): string {
  return format === "pretty"
    ? JSON.stringify(value, null, 2)
    : JSON.stringify(value);
}

function parseFormat(value: string | undefined): OutputFormat {
  if (value === undefined || value === "compact") {
    return "compact";
  }
  if (value === "pretty") {
    return "pretty";
  }
  throw new Error("--format must be compact or pretty");
}

function parseUnsignedInteger(name: string, value: string): number {
  if (!/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new Error(`${name} must be an unsigned base-10 integer`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${name} must be a JavaScript safe integer`);
  }

  return parsed;
}

function parseValueFlags(
  argv: readonly string[],
): ReadonlyMap<string, string> {
  const values = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];

    if (flag === undefined || !flag.startsWith("--")) {
      throw new Error(`unexpected positional argument: ${flag ?? ""}`);
    }
    if (!QUOTE_VALUE_FLAG_SET.has(flag)) {
      throw new Error(`unknown option: ${flag}`);
    }
    if (values.has(flag)) {
      throw new Error(`duplicate option: ${flag}`);
    }
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`missing value for ${flag}`);
    }

    values.set(flag, value);
  }

  return values;
}

function requireFlag(
  values: ReadonlyMap<string, string>,
  flag: string,
): string {
  const value = values.get(flag);
  if (value === undefined) {
    throw new Error(`missing required option: ${flag}`);
  }
  return value;
}

export function parsePaidDatanetQuoteCliArgsV1(
  argv: readonly string[],
): PaidDatanetQuoteCliCommandV1 {
  if (argv.length === 0) {
    return { kind: "help" };
  }

  if (argv.includes("--help")) {
    if (argv.length !== 1) {
      throw new Error("--help cannot be combined with other options");
    }
    return { kind: "help" };
  }

  if (argv.includes("--list-services")) {
    const remaining = argv.filter(
      (value) => value !== "--list-services",
    );
    const values = parseValueFlags(remaining);

    for (const flag of values.keys()) {
      if (flag !== "--format") {
        throw new Error(
          "--list-services may only be combined with --format",
        );
      }
    }

    return {
      kind: "list-services",
      format: parseFormat(values.get("--format")),
    };
  }

  if (argv.length % 2 !== 0) {
    const finalFlag = argv[argv.length - 1] ?? "option";
    throw new Error(`missing value for ${finalFlag}`);
  }

  const values = parseValueFlags(argv);
  const serviceCode = requireFlag(values, "--service-code");

  getPaidDatanetServiceV1(serviceCode);

  const request: PaidDatanetQuoteRequestV1 = {
    request_id: requireFlag(values, "--request-id"),
    requester_id: requireFlag(values, "--requester-id"),
    service_code: serviceCode as PaidDatanetServiceCodeV1,
    object_count: parseUnsignedInteger(
      "--object-count",
      requireFlag(values, "--object-count"),
    ),
    total_bytes: parseUnsignedInteger(
      "--total-bytes",
      requireFlag(values, "--total-bytes"),
    ),
    operator_cost_basis_cents: parseUnsignedInteger(
      "--operator-cost-basis-cents",
      requireFlag(values, "--operator-cost-basis-cents"),
    ),
    requested_at_ms: parseUnsignedInteger(
      "--requested-at-ms",
      requireFlag(values, "--requested-at-ms"),
    ),
  };

  return {
    kind: "quote",
    format: parseFormat(values.get("--format")),
    request,
  };
}

function serviceListPayload(): object {
  const services = Object.values(
    PAID_DATANET_SERVICE_CATALOG_V1,
  ).map((service) => ({
    service_code: service.service_code,
    public_name: service.public_name,
    customer_outcome: service.customer_outcome,
    currency: service.currency,
    max_object_count: service.max_object_count,
    max_total_bytes: service.max_total_bytes,
    target_completion_seconds: service.target_completion_seconds,
    quote_valid_for_ms: service.quote_valid_for_ms,
    pricing: service.pricing,
    required_evidence: service.required_evidence,
    exclusions: service.exclusions,
  }));

  return {
    schema: PAID_DATANET_QUOTE_CLI_V1_SCHEMA,
    marker: PAID_DATANET_QUOTE_CLI_V1_MARKER,
    catalog_schema: PAID_DATANET_SERVICE_CATALOG_V1_SCHEMA,
    catalog_marker: PAID_DATANET_SERVICE_CATALOG_V1_MARKER,
    service_count: services.length,
    quote_only: true,
    automatic_execution_enabled: false,
    automatic_payment_collection_enabled: false,
    treasury_access_enabled: false,
    services,
  };
}

export function runPaidDatanetQuoteCliV1(
  argv: readonly string[],
  io: PaidDatanetQuoteCliIoV1 = defaultIo(),
): number {
  try {
    const command = parsePaidDatanetQuoteCliArgsV1(argv);

    if (command.kind === "help") {
      io.stdout(HELP_TEXT);
      return 0;
    }

    if (command.kind === "list-services") {
      io.stdout(serialize(serviceListPayload(), command.format));
      return 0;
    }

    const quote = quotePaidDatanetServiceV1(command.request);
    io.stdout(serialize(quote, command.format));
    return 0;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "unknown CLI failure";

    io.stderr(
      JSON.stringify({
        schema: PAID_DATANET_QUOTE_CLI_V1_SCHEMA,
        marker: PAID_DATANET_QUOTE_CLI_V1_MARKER,
        status: "ERROR",
        error: message,
        quote_created: false,
        payment_collection_enabled: false,
        execution_authorized: false,
        automatic_execution_enabled: false,
        treasury_access_enabled: false,
      }),
    );
    return 2;
  }
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }

  return import.meta.url === pathToFileURL(entry).href;
}

if (isMainModule()) {
  process.exitCode = runPaidDatanetQuoteCliV1(process.argv.slice(2));
}
