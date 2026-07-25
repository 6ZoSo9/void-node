import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { pathToFileURL } from "node:url";

import {
  PAID_DATANET_PUBLIC_PILOT_TRIAGE_CLI_V1_MARKER,
  PAID_DATANET_PUBLIC_PILOT_TRIAGE_V1_SCHEMA,
  type PaidDatanetPublicPilotTriagePacketV1,
} from "./paid_datanet_public_pilot_triage_cli_v1.js";
import {
  PAID_DATANET_QUOTE_PACKET_V1_MARKER,
  PAID_DATANET_QUOTE_PACKET_V1_SCHEMA,
  type PaidDatanetQuotePacketRequestV1,
} from "./paid_datanet_quote_packet_v1.js";
import {
  USD_CENTS,
  getPaidDatanetServiceV1,
  type PaidDatanetServiceCodeV1,
} from "../src/paid_services/datanet_service_catalog_v1.js";

export const PAID_DATANET_PUBLIC_PILOT_QUOTE_BRIDGE_CLI_V1_MARKER =
  "VOID_PAID_DATANET_PUBLIC_PILOT_QUOTE_BRIDGE_CLI_V1" as const;

export const PAID_DATANET_PUBLIC_PILOT_QUOTE_BRIDGE_V1_SCHEMA =
  "void-paid-datanet-public-pilot-quote-bridge-v1" as const;

const MAX_INPUT_BYTES = 2 * 1024 * 1024;
const MAX_OPERATOR_COST_BASIS_CENTS = 100_000_000;
const MAX_REQUESTED_AT_MS = 8_000_000_000_000_000;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const ISSUER_NAME_PATTERN = /^[^\u0000-\u001f\u007f]{2,160}$/;

type OutputFormat = "compact" | "pretty";

export type PaidDatanetPublicPilotQuoteBridgeDispositionV1 =
  | "DRAFT_QUOTE_INPUT"
  | "HOLD_FOR_OPERATOR_REVIEW";

export interface PaidDatanetPublicPilotQuoteBridgeOperatorInputV1 {
  readonly issuer_name: string;
  readonly operator_cost_basis_cents: number;
  readonly requested_at_ms: number;
}

export interface PaidDatanetPublicPilotQuoteBridgePacketV1 {
  readonly schema: typeof PAID_DATANET_PUBLIC_PILOT_QUOTE_BRIDGE_V1_SCHEMA;
  readonly marker: typeof PAID_DATANET_PUBLIC_PILOT_QUOTE_BRIDGE_CLI_V1_MARKER;
  readonly bridge_id: string;
  readonly disposition: PaidDatanetPublicPilotQuoteBridgeDispositionV1;
  readonly source: {
    readonly triage_packet_sha256: string;
    readonly triage_id: string | null;
    readonly issue_export_sha256: string | null;
    readonly issue_body_sha256: string | null;
    readonly issue_number: number | null;
    readonly issue_url: string;
  };
  readonly target: {
    readonly quote_packet_schema: typeof PAID_DATANET_QUOTE_PACKET_V1_SCHEMA;
    readonly quote_packet_marker: typeof PAID_DATANET_QUOTE_PACKET_V1_MARKER;
  };
  readonly operator_input: {
    readonly issuer_name: string;
    readonly currency: typeof USD_CENTS;
    readonly operator_cost_basis_cents: number | null;
    readonly requested_at_ms: number | null;
  };
  readonly draft_quote_input: PaidDatanetQuotePacketRequestV1 | null;
  readonly quote_packet_cli_argv: readonly string[];
  readonly checks: {
    readonly triage_schema_valid: boolean;
    readonly triage_marker_valid: boolean;
    readonly triage_disposition_ready: boolean;
    readonly triage_id_valid: boolean;
    readonly triage_source_binding_valid: boolean;
    readonly triage_request_complete: boolean;
    readonly triage_quote_seed_complete: boolean;
    readonly triage_controls_valid: boolean;
    readonly triage_has_no_hold_reasons: boolean;
    readonly service_recognized: boolean;
    readonly service_scope_within_catalog_bounds: boolean;
    readonly operator_issuer_valid: boolean;
    readonly operator_cost_basis_valid: boolean;
    readonly requested_at_ms_valid: boolean;
  };
  readonly hold_reasons: readonly string[];
  readonly controls: {
    readonly deterministic_quote_bridge: true;
    readonly triage_packet_input_only: true;
    readonly stdout_output_only: true;
    readonly triage_binding_required: true;
    readonly operator_pricing_input_required: true;
    readonly operator_review_required: true;
    readonly canonical_draft_quote_input_enabled: true;
    readonly quote_issued_by_cli: false;
    readonly quote_approved_by_cli: false;
    readonly github_api_access_enabled: false;
    readonly network_access_enabled: false;
    readonly filesystem_write_enabled: false;
    readonly payment_collection_enabled: false;
    readonly execution_enabled: false;
    readonly wc_mutation_enabled: false;
    readonly treasury_access_enabled: false;
  };
}

export interface PaidDatanetPublicPilotQuoteBridgeCliIoV1 {
  readonly readTextFile: (path: string) => string;
  readonly statFile: (path: string) => {
    readonly isFile: boolean;
    readonly size: number;
  };
  readonly stdout: (value: string) => void;
  readonly stderr: (value: string) => void;
}

interface QuoteBridgeCliCommandV1 {
  readonly help: boolean;
  readonly inputPath: string | null;
  readonly operatorInput: PaidDatanetPublicPilotQuoteBridgeOperatorInputV1 | null;
  readonly format: OutputFormat;
}

const HELP_TEXT = `\
${PAID_DATANET_PUBLIC_PILOT_QUOTE_BRIDGE_CLI_V1_MARKER}

Convert a READY_FOR_QUOTE Paid DataNet public-pilot triage packet plus explicit
operator pricing into deterministic draft input for the quote-packet tooling.

Usage:
  npx --no-install tsx \\
    scripts/paid_datanet_public_pilot_quote_bridge_cli_v1.ts \\
    --triage-json TRIAGE_PACKET.json \\
    --issuer-name "VOID Network" \\
    --operator-cost-basis-cents 500 \\
    --requested-at-ms 1780000000000 \\
    [--format pretty|compact]

Output dispositions:
  DRAFT_QUOTE_INPUT
  HOLD_FOR_OPERATOR_REVIEW

Controls:
  Local triage-packet file input only.
  Operator pricing is mandatory and never inferred.
  This CLI does not issue or approve a quote.
  GitHub API and network access are disabled.
  Filesystem writes are disabled.
  Payment collection, execution, Work Credit mutation, and treasury access are disabled.
`;

function defaultIo(): PaidDatanetPublicPilotQuoteBridgeCliIoV1 {
  return {
    readTextFile: (path: string): string => readFileSync(path, "utf8"),
    statFile: (path: string) => {
      const stat = statSync(path);
      return {
        isFile: stat.isFile(),
        size: stat.size,
      };
    },
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(
  record: Record<string, unknown> | null,
  key: string,
): string | null {
  const value = record?.[key];
  return typeof value === "string" ? value : null;
}

function integerField(
  record: Record<string, unknown> | null,
  key: string,
): number | null {
  const value = record?.[key];
  return typeof value === "number" && Number.isSafeInteger(value)
    ? value
    : null;
}

function booleanField(
  record: Record<string, unknown> | null,
  key: string,
): boolean | null {
  const value = record?.[key];
  return typeof value === "boolean" ? value : null;
}

function recordField(
  record: Record<string, unknown> | null,
  key: string,
): Record<string, unknown> | null {
  const value = record?.[key];
  return isRecord(value) ? value : null;
}

function stringArrayField(
  record: Record<string, unknown> | null,
  key: string,
): readonly string[] | null {
  const value = record?.[key];
  return Array.isArray(value) && value.every((entry) => typeof entry === "string")
    ? value
    : null;
}

function freezeStrings(values: readonly string[]): readonly string[] {
  return Object.freeze([...values]);
}

function freezeDraftQuoteInput(
  value: PaidDatanetQuotePacketRequestV1,
): PaidDatanetQuotePacketRequestV1 {
  return Object.freeze({
    issuer_name: value.issuer_name,
    customer_name: value.customer_name,
    customer_reference: value.customer_reference,
    quote_request: Object.freeze({ ...value.quote_request }),
  });
}

function validIssuerName(value: string): boolean {
  return value === value.trim() && ISSUER_NAME_PATTERN.test(value);
}

function validCostBasis(value: number): boolean {
  return (
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= MAX_OPERATOR_COST_BASIS_CENTS
  );
}

function validRequestedAtMs(value: number): boolean {
  return (
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= MAX_REQUESTED_AT_MS
  );
}

function validSha256(value: string | null): value is string {
  return value !== null && SHA256_PATTERN.test(value);
}

function validIdentifier(value: string | null): value is string {
  return value !== null && IDENTIFIER_PATTERN.test(value);
}

export function bridgePaidDatanetPublicPilotQuoteV1(
  rawTriagePacket: unknown,
  triagePacketText: string,
  operatorInput: PaidDatanetPublicPilotQuoteBridgeOperatorInputV1,
): PaidDatanetPublicPilotQuoteBridgePacketV1 {
  const packet = isRecord(rawTriagePacket) ? rawTriagePacket : null;
  const source = recordField(packet, "source");
  const request = recordField(packet, "request");
  const serviceBounds = recordField(packet, "service_bounds");
  const quoteSeed = recordField(packet, "quote_request_seed");
  const controls = recordField(packet, "controls");

  const schema = stringField(packet, "schema");
  const marker = stringField(packet, "marker");
  const disposition = stringField(packet, "disposition");
  const triageId = stringField(packet, "triage_id");
  const issueExportSha256 = stringField(source, "issue_export_sha256");
  const issueBodySha256 = stringField(source, "issue_body_sha256");
  const issueNumber = integerField(source, "issue_number");
  const issueUrl = stringField(source, "issue_url") ?? "";

  const serviceCode = stringField(request, "service_code");
  const publicProjectName = stringField(request, "public_project_name") ?? "";
  const requesterReference = stringField(request, "requester_reference");
  const objectCount = integerField(request, "object_count");
  const totalBytes = integerField(request, "total_bytes");

  const requestId = stringField(quoteSeed, "request_id");
  const requesterId = stringField(quoteSeed, "requester_id");
  const seedServiceCode = stringField(quoteSeed, "service_code");
  const seedObjectCount = integerField(quoteSeed, "object_count");
  const seedTotalBytes = integerField(quoteSeed, "total_bytes");

  const maxObjectCount = integerField(serviceBounds, "max_object_count");
  const maxTotalBytes = integerField(serviceBounds, "max_total_bytes");
  const withinObjectLimit = booleanField(
    serviceBounds,
    "within_object_count_limit",
  );
  const withinByteLimit = booleanField(
    serviceBounds,
    "within_total_bytes_limit",
  );

  const holdReasonsFromTriage = stringArrayField(packet, "hold_reasons");

  const triageSchemaValid =
    schema === PAID_DATANET_PUBLIC_PILOT_TRIAGE_V1_SCHEMA;
  const triageMarkerValid =
    marker === PAID_DATANET_PUBLIC_PILOT_TRIAGE_CLI_V1_MARKER;
  const triageDispositionReady = disposition === "READY_FOR_QUOTE";
  const triageIdValid = validSha256(triageId);
  const triageSourceBindingValid =
    validSha256(issueExportSha256) &&
    validSha256(issueBodySha256) &&
    issueNumber !== null &&
    issueNumber > 0 &&
    /^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/[1-9][0-9]*$/.test(
      issueUrl,
    );

  let serviceRecognized = false;
  let serviceScopeWithinCatalogBounds = false;
  let normalizedServiceCode: PaidDatanetServiceCodeV1 | null = null;

  if (serviceCode !== null) {
    try {
      const service = getPaidDatanetServiceV1(serviceCode);
      normalizedServiceCode = service.service_code;
      serviceRecognized = true;
      serviceScopeWithinCatalogBounds =
        objectCount !== null &&
        objectCount >= 1 &&
        objectCount <= service.max_object_count &&
        totalBytes !== null &&
        totalBytes >= 1 &&
        totalBytes <= service.max_total_bytes &&
        maxObjectCount === service.max_object_count &&
        maxTotalBytes === service.max_total_bytes &&
        withinObjectLimit === true &&
        withinByteLimit === true;
    } catch {
      serviceRecognized = false;
    }
  }

  const triageRequestComplete =
    normalizedServiceCode !== null &&
    publicProjectName === publicProjectName.trim() &&
    publicProjectName.length >= 2 &&
    publicProjectName.length <= 160 &&
    validIdentifier(requesterReference) &&
    objectCount !== null &&
    totalBytes !== null;

  const triageQuoteSeedComplete =
    validIdentifier(requestId) &&
    validIdentifier(requesterId) &&
    seedServiceCode === normalizedServiceCode &&
    seedObjectCount === objectCount &&
    seedTotalBytes === totalBytes &&
    requesterId === requesterReference &&
    booleanField(quoteSeed, "operator_cost_basis_cents_required") === true &&
    booleanField(quoteSeed, "requested_at_ms_required") === true;

  const triageControlsValid =
    booleanField(controls, "deterministic_triage_packet") === true &&
    booleanField(controls, "local_issue_export_input_only") === true &&
    booleanField(controls, "stdout_output_only") === true &&
    booleanField(controls, "operator_review_required") === true &&
    booleanField(controls, "quote_issued_by_cli") === false &&
    booleanField(controls, "automatic_quote_approval_enabled") === false &&
    booleanField(controls, "payment_collection_enabled") === false &&
    booleanField(controls, "execution_enabled") === false &&
    booleanField(controls, "wc_mutation_enabled") === false &&
    booleanField(controls, "treasury_access_enabled") === false;

  const triageHasNoHoldReasons =
    holdReasonsFromTriage !== null && holdReasonsFromTriage.length === 0;
  const operatorIssuerValid = validIssuerName(operatorInput.issuer_name);
  const operatorCostBasisValid = validCostBasis(
    operatorInput.operator_cost_basis_cents,
  );
  const requestedAtMsValid = validRequestedAtMs(
    operatorInput.requested_at_ms,
  );

  const holdReasons: string[] = [];

  if (!triageSchemaValid) holdReasons.push("triage_schema_invalid");
  if (!triageMarkerValid) holdReasons.push("triage_marker_invalid");
  if (!triageDispositionReady) holdReasons.push("triage_not_ready_for_quote");
  if (!triageIdValid) holdReasons.push("triage_id_invalid");
  if (!triageSourceBindingValid) holdReasons.push("triage_source_binding_invalid");
  if (!triageRequestComplete) holdReasons.push("triage_request_incomplete");
  if (!triageQuoteSeedComplete) holdReasons.push("triage_quote_seed_incomplete");
  if (!triageControlsValid) holdReasons.push("triage_controls_invalid");
  if (!triageHasNoHoldReasons) holdReasons.push("triage_hold_reasons_present");
  if (!serviceRecognized) holdReasons.push("service_unrecognized");
  if (!serviceScopeWithinCatalogBounds) {
    holdReasons.push("service_scope_outside_catalog_bounds");
  }
  if (!operatorIssuerValid) holdReasons.push("operator_issuer_invalid");
  if (!operatorCostBasisValid) holdReasons.push("operator_cost_basis_invalid");
  if (!requestedAtMsValid) holdReasons.push("requested_at_ms_invalid");

  const ready = holdReasons.length === 0;
  const draftQuoteInput: PaidDatanetQuotePacketRequestV1 | null = ready
    ? freezeDraftQuoteInput({
        issuer_name: operatorInput.issuer_name,
        customer_name: publicProjectName,
        customer_reference: requesterReference as string,
        quote_request: {
          request_id: requestId as string,
          requester_id: requesterId as string,
          service_code: normalizedServiceCode as PaidDatanetServiceCodeV1,
          object_count: objectCount as number,
          total_bytes: totalBytes as number,
          operator_cost_basis_cents:
            operatorInput.operator_cost_basis_cents,
          requested_at_ms: operatorInput.requested_at_ms,
        },
      })
    : null;

  const quotePacketCliArgv = draftQuoteInput
    ? Object.freeze([
        "--issuer-name",
        draftQuoteInput.issuer_name,
        "--customer-name",
        draftQuoteInput.customer_name,
        "--customer-reference",
        draftQuoteInput.customer_reference,
        "--request-id",
        draftQuoteInput.quote_request.request_id,
        "--requester-id",
        draftQuoteInput.quote_request.requester_id,
        "--service-code",
        draftQuoteInput.quote_request.service_code,
        "--object-count",
        String(draftQuoteInput.quote_request.object_count),
        "--total-bytes",
        String(draftQuoteInput.quote_request.total_bytes),
        "--operator-cost-basis-cents",
        String(draftQuoteInput.quote_request.operator_cost_basis_cents),
        "--requested-at-ms",
        String(draftQuoteInput.quote_request.requested_at_ms),
        "--format",
        "json",
      ])
    : Object.freeze([] as string[]);

  const bodyWithoutId = {
    schema: PAID_DATANET_PUBLIC_PILOT_QUOTE_BRIDGE_V1_SCHEMA,
    marker: PAID_DATANET_PUBLIC_PILOT_QUOTE_BRIDGE_CLI_V1_MARKER,
    disposition: ready
      ? ("DRAFT_QUOTE_INPUT" as const)
      : ("HOLD_FOR_OPERATOR_REVIEW" as const),
    source: Object.freeze({
      triage_packet_sha256: sha256Hex(triagePacketText),
      triage_id: triageIdValid ? triageId : null,
      issue_export_sha256: validSha256(issueExportSha256)
        ? issueExportSha256
        : null,
      issue_body_sha256: validSha256(issueBodySha256)
        ? issueBodySha256
        : null,
      issue_number: issueNumber,
      issue_url: issueUrl,
    }),
    target: Object.freeze({
      quote_packet_schema: PAID_DATANET_QUOTE_PACKET_V1_SCHEMA,
      quote_packet_marker: PAID_DATANET_QUOTE_PACKET_V1_MARKER,
    }),
    operator_input: Object.freeze({
      issuer_name: operatorInput.issuer_name,
      currency: USD_CENTS,
      operator_cost_basis_cents: operatorCostBasisValid
        ? operatorInput.operator_cost_basis_cents
        : null,
      requested_at_ms: requestedAtMsValid
        ? operatorInput.requested_at_ms
        : null,
    }),
    draft_quote_input: draftQuoteInput,
    quote_packet_cli_argv: quotePacketCliArgv,
    checks: Object.freeze({
      triage_schema_valid: triageSchemaValid,
      triage_marker_valid: triageMarkerValid,
      triage_disposition_ready: triageDispositionReady,
      triage_id_valid: triageIdValid,
      triage_source_binding_valid: triageSourceBindingValid,
      triage_request_complete: triageRequestComplete,
      triage_quote_seed_complete: triageQuoteSeedComplete,
      triage_controls_valid: triageControlsValid,
      triage_has_no_hold_reasons: triageHasNoHoldReasons,
      service_recognized: serviceRecognized,
      service_scope_within_catalog_bounds: serviceScopeWithinCatalogBounds,
      operator_issuer_valid: operatorIssuerValid,
      operator_cost_basis_valid: operatorCostBasisValid,
      requested_at_ms_valid: requestedAtMsValid,
    }),
    hold_reasons: freezeStrings(holdReasons),
    controls: Object.freeze({
      deterministic_quote_bridge: true as const,
      triage_packet_input_only: true as const,
      stdout_output_only: true as const,
      triage_binding_required: true as const,
      operator_pricing_input_required: true as const,
      operator_review_required: true as const,
      canonical_draft_quote_input_enabled: true as const,
      quote_issued_by_cli: false as const,
      quote_approved_by_cli: false as const,
      github_api_access_enabled: false as const,
      network_access_enabled: false as const,
      filesystem_write_enabled: false as const,
      payment_collection_enabled: false as const,
      execution_enabled: false as const,
      wc_mutation_enabled: false as const,
      treasury_access_enabled: false as const,
    }),
  };

  return Object.freeze({
    ...bodyWithoutId,
    bridge_id: sha256Hex(canonicalJson(bodyWithoutId)),
  });
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
  if (value === undefined || value === "compact") {
    return "compact";
  }
  if (value === "pretty") {
    return "pretty";
  }
  throw new Error("--format must be compact or pretty");
}

function parseCliArguments(argv: readonly string[]): QuoteBridgeCliCommandV1 {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    if (argv.length > 1) {
      throw new Error("--help cannot be combined with other options");
    }
    return {
      help: true,
      inputPath: null,
      operatorInput: null,
      format: "pretty",
    };
  }

  if (argv.length % 2 !== 0) {
    throw new Error(`missing value for ${argv[argv.length - 1] ?? "option"}`);
  }

  const allowed = new Set([
    "--triage-json",
    "--issuer-name",
    "--operator-cost-basis-cents",
    "--requested-at-ms",
    "--format",
  ]);
  const values = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];

    if (flag === undefined || !allowed.has(flag)) {
      throw new Error(`unknown option: ${flag ?? ""}`);
    }
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`missing value for ${flag}`);
    }
    if (values.has(flag)) {
      throw new Error(`duplicate option: ${flag}`);
    }

    values.set(flag, value);
  }

  const requireValue = (flag: string): string => {
    const value = values.get(flag);
    if (value === undefined) {
      throw new Error(`missing required option: ${flag}`);
    }
    return value;
  };

  return {
    help: false,
    inputPath: requireValue("--triage-json"),
    operatorInput: {
      issuer_name: requireValue("--issuer-name"),
      operator_cost_basis_cents: parseUnsignedInteger(
        "--operator-cost-basis-cents",
        requireValue("--operator-cost-basis-cents"),
      ),
      requested_at_ms: parseUnsignedInteger(
        "--requested-at-ms",
        requireValue("--requested-at-ms"),
      ),
    },
    format: parseFormat(values.get("--format")),
  };
}

function serialize(value: unknown, format: OutputFormat): string {
  return format === "pretty"
    ? JSON.stringify(value, null, 2)
    : JSON.stringify(value);
}

export function runPaidDatanetPublicPilotQuoteBridgeCliV1(
  argv: readonly string[],
  io: PaidDatanetPublicPilotQuoteBridgeCliIoV1 = defaultIo(),
): number {
  try {
    const command = parseCliArguments(argv);

    if (command.help) {
      io.stdout(HELP_TEXT);
      return 0;
    }

    if (command.inputPath === null || command.operatorInput === null) {
      throw new Error("quote bridge input is unavailable");
    }

    const stat = io.statFile(command.inputPath);
    if (!stat.isFile) {
      throw new Error(`input is not a regular file: ${command.inputPath}`);
    }
    if (!Number.isSafeInteger(stat.size) || stat.size < 1) {
      throw new Error(
        `input file is empty or has an invalid size: ${command.inputPath}`,
      );
    }
    if (stat.size > MAX_INPUT_BYTES) {
      throw new Error(
        `input file exceeds ${MAX_INPUT_BYTES} bytes: ${command.inputPath}`,
      );
    }

    const text = io.readTextFile(command.inputPath);
    const raw = JSON.parse(text) as unknown;
    const packet = bridgePaidDatanetPublicPilotQuoteV1(
      raw,
      text,
      command.operatorInput,
    );

    io.stdout(serialize(packet, command.format));
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(
      `${PAID_DATANET_PUBLIC_PILOT_QUOTE_BRIDGE_CLI_V1_MARKER}: ${message}`,
    );
    return 1;
  }
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  return typeof entry === "string" && import.meta.url === pathToFileURL(entry).href;
}

if (isMainModule()) {
  process.exitCode = runPaidDatanetPublicPilotQuoteBridgeCliV1(
    process.argv.slice(2),
  );
}
