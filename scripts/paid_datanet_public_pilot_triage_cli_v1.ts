import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { pathToFileURL } from "node:url";

import {
  getPaidDatanetServiceV1,
  type PaidDatanetServiceCodeV1,
} from "../src/paid_services/datanet_service_catalog_v1.js";

export const PAID_DATANET_PUBLIC_PILOT_TRIAGE_CLI_V1_MARKER =
  "VOID_PAID_DATANET_PUBLIC_PILOT_TRIAGE_CLI_V1" as const;

export const PAID_DATANET_PUBLIC_PILOT_TRIAGE_V1_SCHEMA =
  "void-paid-datanet-public-pilot-triage-v1" as const;

const MAX_INPUT_BYTES = 2 * 1024 * 1024;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const PILOT_TITLE_PREFIX = "[Paid DataNet Pilot]:";

const REQUIRED_SECTION_LABELS = Object.freeze({
  service_code: "Paid DataNet service",
  public_project_name: "Public project or organization name",
  requester_reference: "Public requester reference",
  object_count: "Estimated object count",
  total_bytes: "Estimated total bytes",
  public_object_references: "Public object references",
  desired_outcome: "Desired outcome",
  desired_completion_window: "Desired completion window",
  quote_readiness: "Quote readiness",
  additional_public_context: "Additional public context",
  acknowledgements: "Required acknowledgements",
});

const REQUIRED_ACKNOWLEDGEMENT_FRAGMENTS = Object.freeze([
  "this issue and everything I post in it may be publicly visible",
  "I confirm I have not included passwords",
  "I have the right to submit every referenced object",
  "submission does not create a contract, collect payment",
  "an operator must review the request, issue the deterministic quote",
]);

const ACCEPTED_QUOTE_READINESS = Object.freeze([
  "Ready to receive a deterministic quote",
  "Exploring pricing before deciding",
]);

const SECRET_PATTERNS: readonly RegExp[] = Object.freeze([
  /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/i,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bghp_[A-Za-z0-9]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\bsk-[A-Za-z0-9]{20,}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/,
  /\b(?:password|passwd|seed phrase|mnemonic|private key|api key|secret key)\s*[:=]\s*\S+/i,
]);

type OutputFormat = "compact" | "pretty";

export type PaidDatanetPublicPilotTriageDispositionV1 =
  | "READY_FOR_QUOTE"
  | "HOLD_FOR_CLARIFICATION";

export interface PaidDatanetPublicPilotIssueExportV1 {
  readonly number: number;
  readonly title: string;
  readonly body: string;
  readonly url: string;
  readonly author?: {
    readonly login?: string;
  } | null;
  readonly createdAt?: string;
  readonly labels?: readonly {
    readonly name?: string;
  }[];
}

export interface PaidDatanetPublicPilotTriagePacketV1 {
  readonly schema: typeof PAID_DATANET_PUBLIC_PILOT_TRIAGE_V1_SCHEMA;
  readonly marker: typeof PAID_DATANET_PUBLIC_PILOT_TRIAGE_CLI_V1_MARKER;
  readonly triage_id: string;
  readonly disposition: PaidDatanetPublicPilotTriageDispositionV1;
  readonly source: {
    readonly issue_export_sha256: string;
    readonly issue_body_sha256: string;
    readonly issue_number: number | null;
    readonly issue_url: string;
    readonly issue_title: string;
    readonly author_login: string | null;
    readonly created_at: string | null;
  };
  readonly request: {
    readonly service_code: PaidDatanetServiceCodeV1 | null;
    readonly service_name: string | null;
    readonly public_project_name: string;
    readonly requester_reference: string;
    readonly object_count: number | null;
    readonly total_bytes: number | null;
    readonly public_object_references: readonly string[];
    readonly desired_outcome: string;
    readonly desired_completion_window: string;
    readonly quote_readiness: string;
    readonly additional_public_context: string;
  };
  readonly service_bounds: {
    readonly max_object_count: number | null;
    readonly max_total_bytes: number | null;
    readonly within_object_count_limit: boolean;
    readonly within_total_bytes_limit: boolean;
  };
  readonly quote_request_seed: {
    readonly request_id: string | null;
    readonly requester_id: string | null;
    readonly service_code: PaidDatanetServiceCodeV1 | null;
    readonly object_count: number | null;
    readonly total_bytes: number | null;
    readonly operator_cost_basis_cents_required: true;
    readonly requested_at_ms_required: true;
  };
  readonly checks: {
    readonly title_prefix_valid: boolean;
    readonly issue_number_valid: boolean;
    readonly issue_url_valid: boolean;
    readonly issue_author_present: boolean;
    readonly issue_created_at_valid: boolean;
    readonly required_sections_unique: boolean;
    readonly service_recognized: boolean;
    readonly requester_reference_valid: boolean;
    readonly object_count_valid: boolean;
    readonly total_bytes_valid: boolean;
    readonly public_references_valid: boolean;
    readonly quote_readiness_recognized: boolean;
    readonly all_acknowledgements_checked: boolean;
    readonly potential_secret_detected: boolean;
  };
  readonly missing_fields: readonly string[];
  readonly hold_reasons: readonly string[];
  readonly controls: {
    readonly deterministic_triage_packet: true;
    readonly local_issue_export_input_only: true;
    readonly stdout_output_only: true;
    readonly github_api_access_enabled: false;
    readonly network_access_enabled: false;
    readonly filesystem_write_enabled: false;
    readonly operator_review_required: true;
    readonly quote_issued_by_cli: false;
    readonly automatic_quote_approval_enabled: false;
    readonly payment_collection_enabled: false;
    readonly execution_enabled: false;
    readonly wc_mutation_enabled: false;
    readonly treasury_access_enabled: false;
  };
}

export interface PaidDatanetPublicPilotTriageCliIoV1 {
  readonly readTextFile: (path: string) => string;
  readonly statFile: (path: string) => {
    readonly isFile: boolean;
    readonly size: number;
  };
  readonly stdout: (value: string) => void;
  readonly stderr: (value: string) => void;
}

interface ParsedSectionsV1 {
  readonly values: ReadonlyMap<string, string>;
  readonly duplicates: readonly string[];
}

const HELP_TEXT = `\
${PAID_DATANET_PUBLIC_PILOT_TRIAGE_CLI_V1_MARKER}

Convert one locally exported VOID Paid DataNet pilot issue into a deterministic
operator-reviewable triage packet.

Usage:
  npx --no-install tsx scripts/paid_datanet_public_pilot_triage_cli_v1.ts \\
    --input-json ISSUE_EXPORT.json [--format pretty|compact]

Create the local export separately:
  gh issue view ISSUE_NUMBER --repo 6ZoSo9/void-node \\
    --json number,title,body,url,author,createdAt,labels > ISSUE_EXPORT.json

The triage CLI itself performs no GitHub API or network access. It reads one
local JSON file and writes one JSON packet to stdout. It does not write files,
issue a quote, approve work, collect payment, execute work, mutate Work Credits,
or access wallets or treasury.
`;

function defaultIo(): PaidDatanetPublicPilotTriageCliIoV1 {
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
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalJson(record[key])}`,
      )
      .join(",")}}`;
  }

  throw new Error(`canonical JSON does not support ${typeof value}`);
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.replace(/\r\n?/g, "\n").trim();
  if (normalized === "_No response_" || normalized === "No response") {
    return "";
  }
  return normalized;
}

function parseSections(body: string): ParsedSectionsV1 {
  const values = new Map<string, string>();
  const duplicates: string[] = [];
  const lines = body.replace(/\r\n?/g, "\n").split("\n");
  let currentLabel: string | null = null;
  let currentLines: string[] = [];

  const flush = (): void => {
    if (currentLabel === null) {
      return;
    }

    const value = normalizeText(currentLines.join("\n"));
    if (values.has(currentLabel)) {
      duplicates.push(currentLabel);
    } else {
      values.set(currentLabel, value);
    }
  };

  for (const line of lines) {
    const heading = /^###\s+(.+?)\s*$/.exec(line);
    if (heading) {
      flush();
      currentLabel = heading[1]?.trim() ?? null;
      currentLines = [];
      continue;
    }

    if (currentLabel !== null) {
      currentLines.push(line);
    }
  }

  flush();

  return {
    values,
    duplicates: Object.freeze([...duplicates]),
  };
}

function section(
  parsed: ParsedSectionsV1,
  label: string,
): string {
  return normalizeText(parsed.values.get(label));
}

function parseStrictPositiveInteger(value: string): number | null {
  if (!/^[1-9][0-9]*$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function extractServiceCode(
  value: string,
): PaidDatanetServiceCodeV1 | null {
  const match = /\b(datanet\.(?:object-integrity-check|public-retrieval-evidence|dataset-replication-audit)\.v1)\b/.exec(
    value,
  );

  return (match?.[1] as PaidDatanetServiceCodeV1 | undefined) ?? null;
}

function parsePublicReferences(value: string): readonly string[] {
  const references = value
    .split("\n")
    .map((line) =>
      line
        .trim()
        .replace(/^[-*+]\s+/, "")
        .replace(/^\d+[.)]\s+/, ""),
    )
    .filter((line) => line.length > 0);

  return Object.freeze(references);
}

function isPrivateHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (
    normalized === "localhost" ||
    normalized === "::1" ||
    normalized === "0.0.0.0" ||
    normalized.endsWith(".local") ||
    /^127\./.test(normalized) ||
    /^10\./.test(normalized) ||
    /^192\.168\./.test(normalized)
  ) {
    return true;
  }

  const private172 = /^172\.(\d{1,3})\./.exec(normalized);
  if (private172) {
    const second = Number(private172[1]);
    if (second >= 16 && second <= 31) {
      return true;
    }
  }

  return false;
}

function publicReferenceIsValid(value: string): boolean {
  if (value.length < 4 || value.length > 2048 || /\s/.test(value)) {
    return false;
  }

  if (/^sha256:[0-9a-f]{64}$/i.test(value)) {
    return true;
  }

  if (/^(?:cid|ipfs|ar):(?:\/\/)?[A-Za-z0-9._~:/?#@!$&'()*+,;=%-]{3,}$/i.test(value)) {
    return true;
  }

  if (!/^https?:\/\//i.test(value)) {
    return false;
  }

  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      url.username === "" &&
      url.password === "" &&
      !isPrivateHostname(url.hostname)
    );
  } catch {
    return false;
  }
}

function checkedAcknowledgements(value: string): readonly string[] {
  return Object.freeze(
    value
      .split("\n")
      .map((line) => /^-\s*\[[xX]\]\s*(.+?)\s*$/.exec(line)?.[1] ?? "")
      .filter((line) => line.length > 0),
  );
}

function allAcknowledgementsChecked(value: string): boolean {
  const checked = checkedAcknowledgements(value);
  return REQUIRED_ACKNOWLEDGEMENT_FRAGMENTS.every((fragment) =>
    checked.some((label) => label.includes(fragment)),
  );
}

function potentialSecretDetected(body: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(body));
}

function isValidIssueCreatedAt(value: string | undefined): boolean {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }
  const parsed = Date.parse(value);
  return (
    Number.isFinite(parsed) &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)
  );
}

function isValidIssueUrl(value: string, issueNumber: number): boolean {
  if (!Number.isSafeInteger(issueNumber) || issueNumber < 1) {
    return false;
  }

  return value === `https://github.com/6ZoSo9/void-node/issues/${issueNumber}`;
}

function issueExportFromUnknown(
  value: unknown,
): PaidDatanetPublicPilotIssueExportV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("issue export must be one JSON object");
  }

  return value as PaidDatanetPublicPilotIssueExportV1;
}

function frozenStrings(values: readonly string[]): readonly string[] {
  return Object.freeze([...values]);
}

export function triagePaidDatanetPublicPilotIssueV1(
  rawIssue: unknown,
  sourceJsonText: string,
): PaidDatanetPublicPilotTriagePacketV1 {
  const issue = issueExportFromUnknown(rawIssue);
  const number = Number.isSafeInteger(issue.number) ? issue.number : 0;
  const title = normalizeText(issue.title);
  const body = normalizeText(issue.body);
  const url = normalizeText(issue.url);
  const authorLogin = normalizeText(issue.author?.login) || null;
  const createdAt = normalizeText(issue.createdAt) || null;
  const parsed = parseSections(body);

  const serviceText = section(parsed, REQUIRED_SECTION_LABELS.service_code);
  const publicProjectName = section(
    parsed,
    REQUIRED_SECTION_LABELS.public_project_name,
  );
  const requesterReference = section(
    parsed,
    REQUIRED_SECTION_LABELS.requester_reference,
  );
  const objectCountText = section(
    parsed,
    REQUIRED_SECTION_LABELS.object_count,
  );
  const totalBytesText = section(
    parsed,
    REQUIRED_SECTION_LABELS.total_bytes,
  );
  const publicReferencesText = section(
    parsed,
    REQUIRED_SECTION_LABELS.public_object_references,
  );
  const desiredOutcome = section(
    parsed,
    REQUIRED_SECTION_LABELS.desired_outcome,
  );
  const desiredCompletionWindow = section(
    parsed,
    REQUIRED_SECTION_LABELS.desired_completion_window,
  );
  const quoteReadiness = section(
    parsed,
    REQUIRED_SECTION_LABELS.quote_readiness,
  );
  const additionalPublicContext = section(
    parsed,
    REQUIRED_SECTION_LABELS.additional_public_context,
  );
  const acknowledgementText = section(
    parsed,
    REQUIRED_SECTION_LABELS.acknowledgements,
  );

  const serviceCode = extractServiceCode(serviceText);
  const objectCount = parseStrictPositiveInteger(objectCountText);
  const totalBytes = parseStrictPositiveInteger(totalBytesText);
  const publicReferences = parsePublicReferences(publicReferencesText);

  let serviceName: string | null = null;
  let maxObjectCount: number | null = null;
  let maxTotalBytes: number | null = null;

  if (serviceCode !== null) {
    const service = getPaidDatanetServiceV1(serviceCode);
    serviceName = service.public_name;
    maxObjectCount = service.max_object_count;
    maxTotalBytes = service.max_total_bytes;
  }

  const requiredLabels: readonly string[] = Object.values(
    REQUIRED_SECTION_LABELS,
  );
  const missingFields = requiredLabels.filter(
    (label) =>
      label !== REQUIRED_SECTION_LABELS.additional_public_context &&
      section(parsed, label).length === 0,
  );

  const issueNumberValid = Number.isSafeInteger(number) && number >= 1;
  const titlePrefixValid = title.startsWith(PILOT_TITLE_PREFIX);
  const issueUrlValid = isValidIssueUrl(url, number);
  const issueAuthorPresent = authorLogin !== null;
  const issueCreatedAtValid = isValidIssueCreatedAt(
    createdAt ?? undefined,
  );
  const requiredSectionsUnique = parsed.duplicates.every(
    (label) => !requiredLabels.includes(label),
  );
  const serviceRecognized = serviceCode !== null;
  const requesterReferenceValid = IDENTIFIER_PATTERN.test(
    requesterReference,
  );
  const objectCountValid = objectCount !== null;
  const totalBytesValid = totalBytes !== null;
  const publicReferencesValid =
    publicReferences.length > 0 &&
    publicReferences.every((reference) =>
      publicReferenceIsValid(reference),
    );
  const quoteReadinessRecognized = ACCEPTED_QUOTE_READINESS.includes(
    quoteReadiness,
  );
  const acknowledgementsChecked = allAcknowledgementsChecked(
    acknowledgementText,
  );
  const secretDetected = potentialSecretDetected(body);
  const withinObjectCountLimit =
    objectCount !== null &&
    maxObjectCount !== null &&
    objectCount <= maxObjectCount;
  const withinTotalBytesLimit =
    totalBytes !== null &&
    maxTotalBytes !== null &&
    totalBytes <= maxTotalBytes;

  const holdReasons: string[] = [];

  if (missingFields.length > 0) {
    holdReasons.push("MISSING_REQUIRED_FIELDS");
  }
  if (!titlePrefixValid) {
    holdReasons.push("INVALID_PILOT_ISSUE_TITLE");
  }
  if (!issueNumberValid || !issueUrlValid) {
    holdReasons.push("INVALID_OR_UNBOUND_ISSUE_IDENTITY");
  }
  if (!issueAuthorPresent || !issueCreatedAtValid) {
    holdReasons.push("INCOMPLETE_ISSUE_EXPORT_METADATA");
  }
  if (!requiredSectionsUnique) {
    holdReasons.push("AMBIGUOUS_DUPLICATE_FORM_SECTIONS");
  }
  if (!serviceRecognized) {
    holdReasons.push("UNKNOWN_SERVICE_CODE");
  }
  if (!requesterReferenceValid) {
    holdReasons.push("INVALID_REQUESTER_REFERENCE");
  }
  if (!objectCountValid || !totalBytesValid) {
    holdReasons.push("INVALID_DECLARED_SCOPE_NUMBERS");
  }
  if (
    serviceRecognized &&
    objectCountValid &&
    !withinObjectCountLimit
  ) {
    holdReasons.push("OBJECT_COUNT_EXCEEDS_SERVICE_LIMIT");
  }
  if (
    serviceRecognized &&
    totalBytesValid &&
    !withinTotalBytesLimit
  ) {
    holdReasons.push("TOTAL_BYTES_EXCEEDS_SERVICE_LIMIT");
  }
  if (!publicReferencesValid) {
    holdReasons.push("PUBLIC_OBJECT_REFERENCES_INVALID_OR_PRIVATE");
  }
  if (!quoteReadinessRecognized) {
    holdReasons.push("QUOTE_READINESS_UNRECOGNIZED");
  }
  if (!acknowledgementsChecked) {
    holdReasons.push("REQUIRED_ACKNOWLEDGEMENTS_INCOMPLETE");
  }
  if (secretDetected) {
    holdReasons.push("POTENTIAL_SECRET_OR_CREDENTIAL_DETECTED");
  }
  if (publicProjectName.length < 3 || publicProjectName.length > 120) {
    holdReasons.push("PUBLIC_PROJECT_NAME_OUT_OF_BOUNDS");
  }
  if (desiredOutcome.length < 10 || desiredOutcome.length > 4000) {
    holdReasons.push("DESIRED_OUTCOME_OUT_OF_BOUNDS");
  }
  if (
    desiredCompletionWindow.length < 2 ||
    desiredCompletionWindow.length > 160
  ) {
    holdReasons.push("COMPLETION_WINDOW_OUT_OF_BOUNDS");
  }
  if (additionalPublicContext.length > 4000) {
    holdReasons.push("ADDITIONAL_PUBLIC_CONTEXT_TOO_LONG");
  }

  const issueExportSha256 = sha256Hex(sourceJsonText);
  const issueBodySha256 = sha256Hex(body);
  const requestId =
    issueNumberValid && SHA256_PATTERN.test(issueBodySha256)
      ? `pilot-${number}-${issueBodySha256.slice(0, 16)}`
      : null;

  const disposition: PaidDatanetPublicPilotTriageDispositionV1 =
    holdReasons.length === 0
      ? "READY_FOR_QUOTE"
      : "HOLD_FOR_CLARIFICATION";

  const bodyWithoutId: Omit<
    PaidDatanetPublicPilotTriagePacketV1,
    "triage_id"
  > = {
    schema: PAID_DATANET_PUBLIC_PILOT_TRIAGE_V1_SCHEMA,
    marker: PAID_DATANET_PUBLIC_PILOT_TRIAGE_CLI_V1_MARKER,
    disposition,
    source: Object.freeze({
      issue_export_sha256: issueExportSha256,
      issue_body_sha256: issueBodySha256,
      issue_number: issueNumberValid ? number : null,
      issue_url: url,
      issue_title: title,
      author_login: authorLogin,
      created_at: createdAt,
    }),
    request: Object.freeze({
      service_code: serviceCode,
      service_name: serviceName,
      public_project_name: publicProjectName,
      requester_reference: requesterReference,
      object_count: objectCount,
      total_bytes: totalBytes,
      public_object_references: publicReferences,
      desired_outcome: desiredOutcome,
      desired_completion_window: desiredCompletionWindow,
      quote_readiness: quoteReadiness,
      additional_public_context: additionalPublicContext,
    }),
    service_bounds: Object.freeze({
      max_object_count: maxObjectCount,
      max_total_bytes: maxTotalBytes,
      within_object_count_limit: withinObjectCountLimit,
      within_total_bytes_limit: withinTotalBytesLimit,
    }),
    quote_request_seed: Object.freeze({
      request_id: requestId,
      requester_id: requesterReferenceValid
        ? requesterReference
        : null,
      service_code: serviceCode,
      object_count: objectCount,
      total_bytes: totalBytes,
      operator_cost_basis_cents_required: true,
      requested_at_ms_required: true,
    }),
    checks: Object.freeze({
      title_prefix_valid: titlePrefixValid,
      issue_number_valid: issueNumberValid,
      issue_url_valid: issueUrlValid,
      issue_author_present: issueAuthorPresent,
      issue_created_at_valid: issueCreatedAtValid,
      required_sections_unique: requiredSectionsUnique,
      service_recognized: serviceRecognized,
      requester_reference_valid: requesterReferenceValid,
      object_count_valid: objectCountValid,
      total_bytes_valid: totalBytesValid,
      public_references_valid: publicReferencesValid,
      quote_readiness_recognized: quoteReadinessRecognized,
      all_acknowledgements_checked: acknowledgementsChecked,
      potential_secret_detected: secretDetected,
    }),
    missing_fields: frozenStrings(missingFields),
    hold_reasons: frozenStrings(holdReasons),
    controls: Object.freeze({
      deterministic_triage_packet: true,
      local_issue_export_input_only: true,
      stdout_output_only: true,
      github_api_access_enabled: false,
      network_access_enabled: false,
      filesystem_write_enabled: false,
      operator_review_required: true,
      quote_issued_by_cli: false,
      automatic_quote_approval_enabled: false,
      payment_collection_enabled: false,
      execution_enabled: false,
      wc_mutation_enabled: false,
      treasury_access_enabled: false,
    }),
  };

  return Object.freeze({
    ...bodyWithoutId,
    triage_id: sha256Hex(canonicalJson(bodyWithoutId)),
  });
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

function serialize(value: unknown, format: OutputFormat): string {
  return format === "pretty"
    ? JSON.stringify(value, null, 2)
    : JSON.stringify(value);
}

function parseCliArguments(argv: readonly string[]): {
  readonly help: boolean;
  readonly inputPath: string | null;
  readonly format: OutputFormat;
} {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    return {
      help: true,
      inputPath: null,
      format: "pretty",
    };
  }

  const values = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];

    if (flag !== "--input-json" && flag !== "--format") {
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

  const inputPath = values.get("--input-json");
  if (inputPath === undefined) {
    throw new Error("missing required option: --input-json");
  }

  return {
    help: false,
    inputPath,
    format: parseFormat(values.get("--format")),
  };
}

export function runPaidDatanetPublicPilotTriageCliV1(
  argv: readonly string[],
  io: PaidDatanetPublicPilotTriageCliIoV1 = defaultIo(),
): number {
  try {
    const command = parseCliArguments(argv);

    if (command.help) {
      io.stdout(HELP_TEXT);
      return 0;
    }

    const inputPath = command.inputPath;
    if (inputPath === null) {
      throw new Error("input path is unavailable");
    }

    const stat = io.statFile(inputPath);
    if (!stat.isFile) {
      throw new Error(`input is not a regular file: ${inputPath}`);
    }
    if (!Number.isSafeInteger(stat.size) || stat.size < 1) {
      throw new Error(`input file is empty or has an invalid size: ${inputPath}`);
    }
    if (stat.size > MAX_INPUT_BYTES) {
      throw new Error(`input file exceeds ${MAX_INPUT_BYTES} bytes: ${inputPath}`);
    }

    const text = io.readTextFile(inputPath);
    const raw = JSON.parse(text) as unknown;
    const packet = triagePaidDatanetPublicPilotIssueV1(raw, text);
    io.stdout(serialize(packet, command.format));
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(`${PAID_DATANET_PUBLIC_PILOT_TRIAGE_CLI_V1_MARKER}: ${message}`);
    return 1;
  }
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  return typeof entry === "string" && import.meta.url === pathToFileURL(entry).href;
}

if (isMainModule()) {
  process.exitCode = runPaidDatanetPublicPilotTriageCliV1(
    process.argv.slice(2),
  );
}
