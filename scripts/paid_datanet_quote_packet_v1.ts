import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

import {
  PAID_DATANET_QUOTE_V1_SCHEMA,
  USD_CENTS,
  getPaidDatanetServiceV1,
  quotePaidDatanetServiceV1,
  type PaidDatanetQuoteRequestV1,
  type PaidDatanetQuoteV1,
} from "../src/paid_services/datanet_service_catalog_v1.js";

export const PAID_DATANET_QUOTE_PACKET_V1_MARKER =
  "VOID_PAID_DATANET_QUOTE_PACKET_V1" as const;

export const PAID_DATANET_QUOTE_PACKET_V1_SCHEMA =
  "void-paid-datanet-quote-packet-v1" as const;

export const PAID_DATANET_QUOTE_PACKET_CLI_V1_SCHEMA =
  "void-paid-datanet-quote-packet-cli-v1" as const;

export interface PaidDatanetQuotePacketRequestV1 {
  readonly issuer_name: string;
  readonly customer_name: string;
  readonly customer_reference: string;
  readonly quote_request: PaidDatanetQuoteRequestV1;
}

export interface PaidDatanetQuotePacketV1 {
  readonly schema: typeof PAID_DATANET_QUOTE_PACKET_V1_SCHEMA;
  readonly marker: typeof PAID_DATANET_QUOTE_PACKET_V1_MARKER;
  readonly packet_sha256: string;
  readonly packet_created_at_ms: number;
  readonly packet_created_at_iso: string;
  readonly issuer: {
    readonly display_name: string;
  };
  readonly customer: {
    readonly display_name: string;
    readonly customer_reference: string;
  };
  readonly quote: PaidDatanetQuoteV1;
  readonly summary: {
    readonly service_name: string;
    readonly service_code: string;
    readonly object_count: number;
    readonly total_bytes: number;
    readonly billable_mib: number;
    readonly currency: typeof USD_CENTS;
    readonly quoted_total_cents: number;
    readonly quoted_total_display: string;
    readonly valid_from_iso: string;
    readonly valid_until_iso: string;
  };
  readonly terms: {
    readonly quote_only: true;
    readonly operator_approval_required: true;
    readonly customer_payment_required_before_work: true;
    readonly tax_included: false;
    readonly payment_collection_enabled: false;
    readonly execution_authorized: false;
    readonly automatic_execution_enabled: false;
    readonly wc_mutation_enabled: false;
    readonly treasury_access_enabled: false;
  };
  readonly required_evidence: readonly string[];
  readonly exclusions: readonly string[];
  readonly markdown: string;
}

export interface PaidDatanetQuotePacketCliIoV1 {
  readonly stdout: (value: string) => void;
  readonly stderr: (value: string) => void;
}

type OutputFormat = "json" | "markdown";

type PaidDatanetQuotePacketCliCommandV1 =
  | { readonly kind: "help" }
  | {
      readonly kind: "packet";
      readonly format: OutputFormat;
      readonly request: PaidDatanetQuotePacketRequestV1;
    };

const VALUE_FLAGS = Object.freeze([
  "--issuer-name",
  "--customer-name",
  "--customer-reference",
  "--request-id",
  "--requester-id",
  "--service-code",
  "--object-count",
  "--total-bytes",
  "--operator-cost-basis-cents",
  "--requested-at-ms",
  "--format",
] as const);

const VALUE_FLAG_SET = new Set<string>(VALUE_FLAGS);

const HELP_TEXT = `\
${PAID_DATANET_QUOTE_PACKET_V1_MARKER}

Generate a deterministic customer-facing Paid DataNet quote packet locally.

Usage:
  npx --no-install tsx scripts/paid_datanet_quote_packet_v1.ts \\
    --issuer-name <display-name> \\
    --customer-name <display-name> \\
    --customer-reference <reference> \\
    --request-id <id> \\
    --requester-id <id> \\
    --service-code <service-code> \\
    --object-count <integer> \\
    --total-bytes <integer> \\
    --operator-cost-basis-cents <integer> \\
    --requested-at-ms <integer> \\
    [--format json|markdown]

The default format is json. JSON output includes the rendered Markdown packet.
No payment is collected and no work is authorized or executed.
`;

function defaultIo(): PaidDatanetQuotePacketCliIoV1 {
  return {
    stdout: (value: string): void => {
      process.stdout.write(value.endsWith("\n") ? value : `${value}\n`);
    },
    stderr: (value: string): void => {
      process.stderr.write(value.endsWith("\n") ? value : `${value}\n`);
    },
  };
}

function canonicalJson(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (
    typeof value === "string" ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new Error("canonical JSON does not support non-finite numbers");
    }
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }

  throw new Error(`canonical JSON does not support ${typeof value}`);
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function assertDisplayText(name: string, value: string): void {
  if (
    typeof value !== "string" ||
    value.length < 2 ||
    value.length > 80 ||
    !/^[A-Za-z0-9][A-Za-z0-9 .,'&()_\/-]*$/.test(value) ||
    /\s{2,}/.test(value)
  ) {
    throw new Error(
      `${name} must be 2-80 safe display characters without repeated whitespace`,
    );
  }
}

function assertReference(name: string, value: string): void {
  if (
    typeof value !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/.test(value)
  ) {
    throw new Error(
      `${name} must match ^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$`,
    );
  }
}

function freezeStrings(values: readonly string[]): readonly string[] {
  return Object.freeze([...values]);
}

function formatUsdCents(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new Error("USD cents must be a non-negative safe integer");
  }

  const dollars = Math.floor(cents / 100);
  const remainder = String(cents % 100).padStart(2, "0");
  return `$${dollars}.${remainder}`;
}

function isoFromMs(value: number): string {
  const iso = new Date(value).toISOString();
  if (Number.isNaN(Date.parse(iso))) {
    throw new Error("timestamp cannot be rendered as ISO-8601");
  }
  return iso;
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}\[\]()#+\-.!|>])/g, "\\$1");
}

function renderBulletList(values: readonly string[]): string {
  return values.map((value) => `- ${escapeMarkdown(value)}`).join("\n");
}

function renderMarkdown(input: {
  readonly packet_id: string;
  readonly issuer_name: string;
  readonly customer_name: string;
  readonly customer_reference: string;
  readonly quote: PaidDatanetQuoteV1;
  readonly service_name: string;
  readonly quoted_total_display: string;
  readonly valid_from_iso: string;
  readonly valid_until_iso: string;
}): string {
  return `# VOID DataNet Service Quote

` +
    `**Packet ID:** \`${input.packet_id}\`<br>
` +
    `**Quote ID:** \`${input.quote.quote_id}\`<br>
` +
    `**Issuer:** ${escapeMarkdown(input.issuer_name)}<br>
` +
    `**Customer:** ${escapeMarkdown(input.customer_name)}<br>
` +
    `**Customer reference:** \`${input.customer_reference}\`

` +
    `## Service

` +
    `**${escapeMarkdown(input.service_name)}**<br>
` +
    `Service code: \`${input.quote.service_code}\`

` +
    `## Scope

` +
    `- Objects: ${input.quote.request.object_count}
` +
    `- Total bytes: ${input.quote.request.total_bytes}
` +
    `- Billable MiB: ${input.quote.request.billable_mib}

` +
    `## Price

` +
    `**Quoted total: ${input.quoted_total_display} USD**<br>
` +
    `Tax included: No<br>
` +
    `Valid from: ${input.valid_from_iso}<br>
` +
    `Valid until: ${input.valid_until_iso}

` +
    `## Required completion evidence

` +
    `${renderBulletList(input.quote.required_evidence)}

` +
    `## Exclusions

` +
    `${renderBulletList(input.quote.exclusions)}

` +
    `## Terms

` +
    `- This packet is a quote only, not an invoice or receipt.
` +
    `- Operator approval is required before work is admitted.
` +
    `- Customer payment is required before work begins.
` +
    `- Payment collection is not performed by this packet generator.
` +
    `- Work is not authorized or executed by this packet generator.
` +
    `- Work Credits are not issued or modified by this packet generator.
` +
    `- Treasury access and automatic execution are disabled.
`;
}

function unsignedPacketBody(
  packet: PaidDatanetQuotePacketV1,
): Omit<PaidDatanetQuotePacketV1, "packet_sha256"> {
  const {
    packet_sha256: _packetSha256,
    ...unsigned
  } = packet;
  return unsigned;
}

export function createPaidDatanetQuotePacketV1(
  request: PaidDatanetQuotePacketRequestV1,
): PaidDatanetQuotePacketV1 {
  assertDisplayText("issuer_name", request.issuer_name);
  assertDisplayText("customer_name", request.customer_name);
  assertReference("customer_reference", request.customer_reference);

  const quote = quotePaidDatanetServiceV1(request.quote_request);
  const service = getPaidDatanetServiceV1(quote.service_code);
  const packetCreatedAtIso = isoFromMs(quote.requested_at_ms);
  const validUntilIso = isoFromMs(quote.expires_at_ms);
  const totalDisplay = formatUsdCents(
    quote.pricing.quoted_total_cents,
  );

  const identityBody = {
    schema: PAID_DATANET_QUOTE_PACKET_V1_SCHEMA,
    marker: PAID_DATANET_QUOTE_PACKET_V1_MARKER,
    issuer_name: request.issuer_name,
    customer_name: request.customer_name,
    customer_reference: request.customer_reference,
    quote_id: quote.quote_id,
  };
  const packetId = sha256Hex(canonicalJson(identityBody));

  const markdown = renderMarkdown({
    packet_id: packetId,
    issuer_name: request.issuer_name,
    customer_name: request.customer_name,
    customer_reference: request.customer_reference,
    quote,
    service_name: service.public_name,
    quoted_total_display: totalDisplay,
    valid_from_iso: packetCreatedAtIso,
    valid_until_iso: validUntilIso,
  });

  const body = {
    schema: PAID_DATANET_QUOTE_PACKET_V1_SCHEMA,
    marker: PAID_DATANET_QUOTE_PACKET_V1_MARKER,
    packet_created_at_ms: quote.requested_at_ms,
    packet_created_at_iso: packetCreatedAtIso,
    issuer: Object.freeze({
      display_name: request.issuer_name,
    }),
    customer: Object.freeze({
      display_name: request.customer_name,
      customer_reference: request.customer_reference,
    }),
    quote,
    summary: Object.freeze({
      service_name: service.public_name,
      service_code: service.service_code,
      object_count: quote.request.object_count,
      total_bytes: quote.request.total_bytes,
      billable_mib: quote.request.billable_mib,
      currency: USD_CENTS,
      quoted_total_cents: quote.pricing.quoted_total_cents,
      quoted_total_display: totalDisplay,
      valid_from_iso: packetCreatedAtIso,
      valid_until_iso: validUntilIso,
    }),
    terms: Object.freeze({
      quote_only: true as const,
      operator_approval_required: true as const,
      customer_payment_required_before_work: true as const,
      tax_included: false as const,
      payment_collection_enabled: false as const,
      execution_authorized: false as const,
      automatic_execution_enabled: false as const,
      wc_mutation_enabled: false as const,
      treasury_access_enabled: false as const,
    }),
    required_evidence: freezeStrings(quote.required_evidence),
    exclusions: freezeStrings(quote.exclusions),
    markdown,
  };

  const packetSha256 = sha256Hex(canonicalJson(body));

  return Object.freeze({
    ...body,
    packet_sha256: packetSha256,
  });
}

export function verifyPaidDatanetQuotePacketV1(
  packet: PaidDatanetQuotePacketV1,
): boolean {
  if (
    packet.schema !== PAID_DATANET_QUOTE_PACKET_V1_SCHEMA ||
    packet.marker !== PAID_DATANET_QUOTE_PACKET_V1_MARKER ||
    packet.quote.schema !== PAID_DATANET_QUOTE_V1_SCHEMA ||
    packet.quote.currency !== USD_CENTS ||
    packet.summary.currency !== USD_CENTS ||
    packet.summary.service_code !== packet.quote.service_code ||
    packet.summary.object_count !== packet.quote.request.object_count ||
    packet.summary.total_bytes !== packet.quote.request.total_bytes ||
    packet.summary.billable_mib !== packet.quote.request.billable_mib ||
    packet.summary.quoted_total_cents !==
      packet.quote.pricing.quoted_total_cents ||
    packet.summary.quoted_total_display !==
      formatUsdCents(packet.quote.pricing.quoted_total_cents) ||
    packet.packet_created_at_ms !== packet.quote.requested_at_ms ||
    packet.packet_created_at_iso !==
      isoFromMs(packet.quote.requested_at_ms) ||
    packet.summary.valid_from_iso !==
      isoFromMs(packet.quote.requested_at_ms) ||
    packet.summary.valid_until_iso !== isoFromMs(packet.quote.expires_at_ms) ||
    packet.terms.quote_only !== true ||
    packet.terms.operator_approval_required !== true ||
    packet.terms.customer_payment_required_before_work !== true ||
    packet.terms.tax_included !== false ||
    packet.terms.payment_collection_enabled !== false ||
    packet.terms.execution_authorized !== false ||
    packet.terms.automatic_execution_enabled !== false ||
    packet.terms.wc_mutation_enabled !== false ||
    packet.terms.treasury_access_enabled !== false
  ) {
    return false;
  }

  try {
    assertDisplayText("issuer.display_name", packet.issuer.display_name);
    assertDisplayText("customer.display_name", packet.customer.display_name);
    assertReference(
      "customer.customer_reference",
      packet.customer.customer_reference,
    );

    const expectedQuote = quotePaidDatanetServiceV1({
      request_id: packet.quote.request.request_id,
      requester_id: packet.quote.request.requester_id,
      service_code: packet.quote.service_code,
      object_count: packet.quote.request.object_count,
      total_bytes: packet.quote.request.total_bytes,
      operator_cost_basis_cents:
        packet.quote.pricing.operator_cost_basis_cents,
      requested_at_ms: packet.quote.requested_at_ms,
    });

    if (canonicalJson(expectedQuote) !== canonicalJson(packet.quote)) {
      return false;
    }

    const service = getPaidDatanetServiceV1(packet.quote.service_code);
    if (
      packet.summary.service_name !== service.public_name ||
      canonicalJson(packet.required_evidence) !==
        canonicalJson(packet.quote.required_evidence) ||
      canonicalJson(packet.exclusions) !==
        canonicalJson(packet.quote.exclusions)
    ) {
      return false;
    }

    const identityBody = {
      schema: PAID_DATANET_QUOTE_PACKET_V1_SCHEMA,
      marker: PAID_DATANET_QUOTE_PACKET_V1_MARKER,
      issuer_name: packet.issuer.display_name,
      customer_name: packet.customer.display_name,
      customer_reference: packet.customer.customer_reference,
      quote_id: packet.quote.quote_id,
    };
    const packetId = sha256Hex(canonicalJson(identityBody));
    const expectedMarkdown = renderMarkdown({
      packet_id: packetId,
      issuer_name: packet.issuer.display_name,
      customer_name: packet.customer.display_name,
      customer_reference: packet.customer.customer_reference,
      quote: packet.quote,
      service_name: service.public_name,
      quoted_total_display: packet.summary.quoted_total_display,
      valid_from_iso: packet.summary.valid_from_iso,
      valid_until_iso: packet.summary.valid_until_iso,
    });

    if (packet.markdown !== expectedMarkdown) {
      return false;
    }

    return packet.packet_sha256 === sha256Hex(
      canonicalJson(unsignedPacketBody(packet)),
    );
  } catch {
    return false;
  }
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

function parseFormat(value: string | undefined): OutputFormat {
  if (value === undefined || value === "json") {
    return "json";
  }
  if (value === "markdown") {
    return "markdown";
  }
  throw new Error("--format must be json or markdown");
}

function parseValueFlags(
  argv: readonly string[],
): ReadonlyMap<string, string> {
  if (argv.length % 2 !== 0) {
    throw new Error(`missing value for ${argv[argv.length - 1] ?? "option"}`);
  }

  const values = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];

    if (flag === undefined || !flag.startsWith("--")) {
      throw new Error(`unexpected positional argument: ${flag ?? ""}`);
    }
    if (!VALUE_FLAG_SET.has(flag)) {
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

export function parsePaidDatanetQuotePacketCliArgsV1(
  argv: readonly string[],
): PaidDatanetQuotePacketCliCommandV1 {
  if (argv.length === 0) {
    return { kind: "help" };
  }

  if (argv.includes("--help")) {
    if (argv.length !== 1) {
      throw new Error("--help cannot be combined with other options");
    }
    return { kind: "help" };
  }

  const values = parseValueFlags(argv);
  const issuerName = requireFlag(values, "--issuer-name");
  const customerName = requireFlag(values, "--customer-name");
  const customerReference = requireFlag(values, "--customer-reference");
  const requestId = requireFlag(values, "--request-id");
  const requesterId = requireFlag(values, "--requester-id");
  const serviceCode = requireFlag(values, "--service-code");
  const service = getPaidDatanetServiceV1(serviceCode);

  const request: PaidDatanetQuotePacketRequestV1 = {
    issuer_name: issuerName,
    customer_name: customerName,
    customer_reference: customerReference,
    quote_request: {
      request_id: requestId,
      requester_id: requesterId,
      service_code: service.service_code,
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
    },
  };

  return {
    kind: "packet",
    format: parseFormat(values.get("--format")),
    request,
  };
}

export function runPaidDatanetQuotePacketCliV1(
  argv: readonly string[],
  io: PaidDatanetQuotePacketCliIoV1 = defaultIo(),
): number {
  try {
    const command = parsePaidDatanetQuotePacketCliArgsV1(argv);

    if (command.kind === "help") {
      io.stdout(HELP_TEXT);
      return 0;
    }

    const packet = createPaidDatanetQuotePacketV1(command.request);
    io.stdout(
      command.format === "markdown"
        ? packet.markdown
        : JSON.stringify(packet),
    );
    return 0;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "unknown packet failure";

    io.stderr(
      JSON.stringify({
        schema: PAID_DATANET_QUOTE_PACKET_CLI_V1_SCHEMA,
        marker: PAID_DATANET_QUOTE_PACKET_V1_MARKER,
        status: "ERROR",
        error: message,
        packet_created: false,
        payment_collection_enabled: false,
        execution_authorized: false,
        automatic_execution_enabled: false,
        wc_mutation_enabled: false,
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
  process.exitCode = runPaidDatanetQuotePacketCliV1(
    process.argv.slice(2),
  );
}
