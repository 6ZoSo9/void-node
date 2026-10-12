#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  PAID_DATANET_PUBLIC_PILOT_QUOTE_BRIDGE_CLI_V1_MARKER,
  PAID_DATANET_PUBLIC_PILOT_QUOTE_BRIDGE_V1_SCHEMA,
} from "./paid_datanet_public_pilot_quote_bridge_cli_v1.js";
import {
  PAID_DATANET_QUOTE_PACKET_V1_MARKER,
  PAID_DATANET_QUOTE_PACKET_V1_SCHEMA,
  createPaidDatanetQuotePacketV1,
  verifyPaidDatanetQuotePacketV1,
  type PaidDatanetQuotePacketRequestV1,
  type PaidDatanetQuotePacketV1,
} from "./paid_datanet_quote_packet_v1.js";
import { USD_CENTS } from "../src/paid_services/datanet_service_catalog_v1.js";

export const VOID_PAID_DATANET_PUBLIC_PILOT_QUOTE_APPROVAL_CLI_V1 =
  "VOID_PAID_DATANET_PUBLIC_PILOT_QUOTE_APPROVAL_CLI_V1";

export const APPROVAL_SCHEMA_V1 =
  "void-paid-datanet-public-pilot-quote-approval-v1";

export const BRIDGE_SCHEMA_V1 =
  PAID_DATANET_PUBLIC_PILOT_QUOTE_BRIDGE_V1_SCHEMA;

export const APPROVAL_CONFIRMATION_TOKEN_V1 =
  "approvePaidDataNetPublicPilotQuoteV1";

export const APPROVED_DISPOSITION_V1 = "APPROVED_QUOTE_PACKET";
export const HOLD_DISPOSITION_V1 = "HOLD_FOR_OPERATOR_APPROVAL";

const APPROVED_CUSTOMER_QUOTE_SCHEMA_V1 =
  "void-paid-datanet-public-pilot-approved-customer-quote-v1";

const REQUIRED_BRIDGE_CHECKS = Object.freeze([
  "triage_schema_valid",
  "triage_marker_valid",
  "triage_disposition_ready",
  "triage_id_valid",
  "triage_source_binding_valid",
  "triage_request_complete",
  "triage_quote_seed_complete",
  "triage_controls_valid",
  "triage_has_no_hold_reasons",
  "service_recognized",
  "service_scope_within_catalog_bounds",
  "operator_issuer_valid",
  "operator_cost_basis_valid",
  "requested_at_ms_valid",
] as const);

const REQUIRED_TRUE_BRIDGE_CONTROLS = Object.freeze([
  "deterministic_quote_bridge",
  "triage_packet_input_only",
  "stdout_output_only",
  "triage_binding_required",
  "operator_pricing_input_required",
  "operator_review_required",
  "canonical_draft_quote_input_enabled",
] as const);

const REQUIRED_FALSE_BRIDGE_CONTROLS = Object.freeze([
  "quote_issued_by_cli",
  "quote_approved_by_cli",
  "github_api_access_enabled",
  "network_access_enabled",
  "filesystem_write_enabled",
  "payment_collection_enabled",
  "execution_enabled",
  "wc_mutation_enabled",
  "treasury_access_enabled",
] as const);

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;
export interface JsonObject {
  [key: string]: JsonValue;
}

export interface QuoteApprovalInputV1 {
  bridge_packet: JsonObject;
  approver_display_name: string;
  approved_at: string;
  confirmation: string;
}

export interface QuoteApprovalHoldV1 extends JsonObject {
  schema: typeof APPROVAL_SCHEMA_V1;
  marker: typeof VOID_PAID_DATANET_PUBLIC_PILOT_QUOTE_APPROVAL_CLI_V1;
  disposition: typeof HOLD_DISPOSITION_V1;
  bridge_packet_sha256: string;
  errors: string[];
  draft_quote_input_required: true;
  canonical_quote_packet_required: true;
  bridge_source_binding_required: true;
  explicit_operator_confirmation_required: true;
  approver_identity_required: true;
  approval_timestamp_required: true;
  approved_customer_quote_packet_enabled: false;
  quote_packet_verified: false;
  payment_collection_enabled: false;
  admission_authorized: false;
  execution_authorized: false;
  automatic_execution_enabled: false;
  github_api_access_enabled: false;
  network_access_enabled: false;
  filesystem_write_enabled: false;
  wc_mutation_enabled: false;
  treasury_access_enabled: false;
}

export interface QuoteApprovalReadyV1 extends JsonObject {
  schema: typeof APPROVAL_SCHEMA_V1;
  marker: typeof VOID_PAID_DATANET_PUBLIC_PILOT_QUOTE_APPROVAL_CLI_V1;
  approval_id: string;
  disposition: typeof APPROVED_DISPOSITION_V1;
  bridge_packet_sha256: string;
  bridge_id: string;
  triage_packet_sha256: string;
  triage_id: string;
  draft_quote_input_sha256: string;
  quote_packet_sha256: string;
  approver_display_name: string;
  approved_at: string;
  confirmation_token_verified: true;
  quote_packet_verified: true;
  approved_quote_packet: JsonObject;
  customer_payment_required: true;
  admission_authorized: false;
  execution_authorized: false;
  automatic_execution_enabled: false;
  payment_collection_enabled: false;
  github_api_access_enabled: false;
  network_access_enabled: false;
  filesystem_write_enabled: false;
  wc_mutation_enabled: false;
  treasury_access_enabled: false;
}

export type QuoteApprovalResultV1 =
  | QuoteApprovalHoldV1
  | QuoteApprovalReadyV1;

export interface CliRunResultV1 {
  exit_code: number;
  stdout: string;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/gu, " ");
}

function canonicalizeValue(value: JsonValue): string {
  if (value === null) {
    return "null";
  }

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("non-finite JSON number");
    }
    return JSON.stringify(value);
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalizeValue(entry)).join(",")}]`;
  }

  const keys = Object.keys(value).sort((left, right) =>
    left.localeCompare(right, "en"),
  );
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${canonicalizeValue(value[key]!)}`)
    .join(",")}}`;
}

export function canonicalJsonV1(value: JsonValue): string {
  return canonicalizeValue(value);
}

export function sha256TextV1(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function sha256JsonV1(value: JsonValue): string {
  return sha256TextV1(canonicalJsonV1(value));
}

function pickString(
  object: JsonObject,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const value = object[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }
  return undefined;
}

function pickInteger(
  object: JsonObject,
  keys: readonly string[],
): number | undefined {
  for (const key of keys) {
    const value = object[key];
    if (typeof value === "number" && Number.isSafeInteger(value)) {
      return value;
    }
  }
  return undefined;
}

function pickBoolean(
  object: JsonObject,
  keys: readonly string[],
): boolean | undefined {
  for (const key of keys) {
    const value = object[key];
    if (typeof value === "boolean") {
      return value;
    }
  }
  return undefined;
}

function pickObject(
  object: JsonObject,
  keys: readonly string[],
): JsonObject | undefined {
  for (const key of keys) {
    const value = object[key];
    if (isJsonObject(value)) {
      return value;
    }
  }
  return undefined;
}

function pickStringArray(
  object: JsonObject,
  keys: readonly string[],
): string[] | undefined {
  for (const key of keys) {
    const value = object[key];
    if (
      Array.isArray(value) &&
      value.every((entry) => typeof entry === "string")
    ) {
      return value as string[];
    }
  }
  return undefined;
}

function isSha256(value: string): boolean {
  return /^[a-f0-9]{64}$/u.test(value);
}

function canonicalIsoTimestamp(value: string): string | undefined {
  const trimmed = value.trim();
  const parsed = new Date(trimmed);

  if (!Number.isFinite(parsed.getTime())) {
    return undefined;
  }

  const normalized = parsed.toISOString();
  return trimmed === normalized ? normalized : undefined;
}

function secretPatternSources(): string[] {
  return [
    ["xo", "x[baprs]-[A-Za-z0-9-]{10,}"].join(""),
    ["AK", "IA[0-9A-Z]{16}"].join(""),
    ["gh", "p_[A-Za-z0-9_]{20,}"].join(""),
    ["github_", "pat_[A-Za-z0-9_]{20,}"].join(""),
    ["s", "k-[A-Za-z0-9]{20,}"].join(""),
    ["-----BEGIN ", "PRIVATE KEY-----"].join(""),
    ["seed phrase", "\\s*[:=]"].join(""),
    ["private key", "\\s*[:=]"].join(""),
  ];
}

export function containsSecretShapedValueV1(value: JsonValue): boolean {
  const serialized = canonicalJsonV1(value);
  return secretPatternSources().some((source) =>
    new RegExp(source, "iu").test(serialized),
  );
}

function validateApproverDisplayName(value: string): string | undefined {
  const normalized = normalizeWhitespace(value);

  if (normalized.length < 3 || normalized.length > 120) {
    return undefined;
  }

  if (/[@<>\u0000-\u001f\u007f]/u.test(normalized)) {
    return undefined;
  }

  return normalized;
}

function bridgeBodyWithoutId(bridgePacket: JsonObject): JsonObject {
  const body: JsonObject = { ...bridgePacket };
  delete body.bridge_id;
  return body;
}

function expectedQuotePacketCliArgv(
  request: PaidDatanetQuotePacketRequestV1,
): string[] {
  return [
    "--issuer-name",
    request.issuer_name,
    "--customer-name",
    request.customer_name,
    "--customer-reference",
    request.customer_reference,
    "--request-id",
    request.quote_request.request_id,
    "--requester-id",
    request.quote_request.requester_id,
    "--service-code",
    request.quote_request.service_code,
    "--object-count",
    String(request.quote_request.object_count),
    "--total-bytes",
    String(request.quote_request.total_bytes),
    "--operator-cost-basis-cents",
    String(request.quote_request.operator_cost_basis_cents),
    "--requested-at-ms",
    String(request.quote_request.requested_at_ms),
    "--format",
    "json",
  ];
}

function validateBridgeChecks(
  checks: JsonObject | undefined,
  errors: string[],
): void {
  if (checks === undefined) {
    errors.push("bridge packet checks object is missing");
    return;
  }

  for (const key of REQUIRED_BRIDGE_CHECKS) {
    if (pickBoolean(checks, [key]) !== true) {
      errors.push(`bridge packet checks.${key} must be true`);
    }
  }
}

function validateBridgeControls(
  controls: JsonObject | undefined,
  errors: string[],
): void {
  if (controls === undefined) {
    errors.push("bridge packet controls object is missing");
    return;
  }

  for (const key of REQUIRED_TRUE_BRIDGE_CONTROLS) {
    if (pickBoolean(controls, [key]) !== true) {
      errors.push(`bridge packet controls.${key} must be true`);
    }
  }

  for (const key of REQUIRED_FALSE_BRIDGE_CONTROLS) {
    if (pickBoolean(controls, [key]) !== false) {
      errors.push(`bridge packet controls.${key} must be false`);
    }
  }
}

function createVerifiedQuotePacket(
  draftQuoteInput: JsonObject,
  errors: string[],
): PaidDatanetQuotePacketV1 | undefined {
  try {
    const packet = createPaidDatanetQuotePacketV1(
      draftQuoteInput as unknown as PaidDatanetQuotePacketRequestV1,
    );

    if (!verifyPaidDatanetQuotePacketV1(packet)) {
      errors.push("canonical quote packet verification failed");
      return undefined;
    }

    return packet;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`draft_quote_input cannot create canonical quote packet: ${message}`);
    return undefined;
  }
}

function validateApprovalWindow(
  quotePacket: PaidDatanetQuotePacketV1,
  approvedAt: string,
  errors: string[],
): void {
  const approvedAtMs = new Date(approvedAt).getTime();

  if (approvedAtMs < quotePacket.packet_created_at_ms) {
    errors.push("approved_at must not precede quote packet creation");
  }

  if (approvedAtMs > quotePacket.quote.expires_at_ms) {
    errors.push("approved_at must not exceed quote packet expiry");
  }
}

function makeHold(
  bridgePacketSha256: string,
  errors: string[],
): QuoteApprovalHoldV1 {
  return {
    schema: APPROVAL_SCHEMA_V1,
    marker: VOID_PAID_DATANET_PUBLIC_PILOT_QUOTE_APPROVAL_CLI_V1,
    disposition: HOLD_DISPOSITION_V1,
    bridge_packet_sha256: bridgePacketSha256,
    errors: [...new Set(errors)].sort((left, right) => left.localeCompare(right)),
    draft_quote_input_required: true,
    canonical_quote_packet_required: true,
    bridge_source_binding_required: true,
    explicit_operator_confirmation_required: true,
    approver_identity_required: true,
    approval_timestamp_required: true,
    approved_customer_quote_packet_enabled: false,
    quote_packet_verified: false,
    payment_collection_enabled: false,
    admission_authorized: false,
    execution_authorized: false,
    automatic_execution_enabled: false,
    github_api_access_enabled: false,
    network_access_enabled: false,
    filesystem_write_enabled: false,
    wc_mutation_enabled: false,
    treasury_access_enabled: false,
  };
}

export function approvePublicPilotQuoteV1(
  input: QuoteApprovalInputV1,
): QuoteApprovalResultV1 {
  const bridgePacket = input.bridge_packet;
  const bridgePacketSha256 = sha256JsonV1(bridgePacket);
  const errors: string[] = [];

  if (bridgePacket.schema !== PAID_DATANET_PUBLIC_PILOT_QUOTE_BRIDGE_V1_SCHEMA) {
    errors.push(
      `bridge packet schema must be ${PAID_DATANET_PUBLIC_PILOT_QUOTE_BRIDGE_V1_SCHEMA}`,
    );
  }

  if (
    bridgePacket.marker !==
    PAID_DATANET_PUBLIC_PILOT_QUOTE_BRIDGE_CLI_V1_MARKER
  ) {
    errors.push(
      `bridge packet marker must be ${PAID_DATANET_PUBLIC_PILOT_QUOTE_BRIDGE_CLI_V1_MARKER}`,
    );
  }

  const bridgeDisposition = pickString(bridgePacket, ["disposition"]);
  if (bridgeDisposition !== "DRAFT_QUOTE_INPUT") {
    errors.push("bridge packet disposition must be DRAFT_QUOTE_INPUT");
  }

  const bridgeId = pickString(bridgePacket, ["bridge_id"]);
  if (bridgeId === undefined || !isSha256(bridgeId)) {
    errors.push("bridge packet bridge_id must be a SHA-256 value");
  } else if (sha256JsonV1(bridgeBodyWithoutId(bridgePacket)) !== bridgeId) {
    errors.push("bridge packet bridge_id does not match packet content");
  }

  const source = pickObject(bridgePacket, ["source"]);
  const triagePacketSha256 =
    source === undefined
      ? undefined
      : pickString(source, ["triage_packet_sha256"]);
  const triageId =
    source === undefined
      ? undefined
      : pickString(source, ["triage_id"]);
  const issueExportSha256 =
    source === undefined
      ? undefined
      : pickString(source, ["issue_export_sha256"]);
  const issueBodySha256 =
    source === undefined
      ? undefined
      : pickString(source, ["issue_body_sha256"]);
  const issueNumber =
    source === undefined
      ? undefined
      : pickInteger(source, ["issue_number"]);
  const issueUrl =
    source === undefined
      ? undefined
      : pickString(source, ["issue_url"]);

  if (source === undefined) {
    errors.push("bridge packet source object is missing");
  }
  if (triagePacketSha256 === undefined || !isSha256(triagePacketSha256)) {
    errors.push("bridge packet source.triage_packet_sha256 must be a SHA-256 value");
  }
  if (triageId === undefined || !isSha256(triageId)) {
    errors.push("bridge packet source.triage_id must be a SHA-256 value");
  }
  if (issueExportSha256 === undefined || !isSha256(issueExportSha256)) {
    errors.push("bridge packet source.issue_export_sha256 must be a SHA-256 value");
  }
  if (issueBodySha256 === undefined || !isSha256(issueBodySha256)) {
    errors.push("bridge packet source.issue_body_sha256 must be a SHA-256 value");
  }
  if (issueNumber === undefined || issueNumber < 1) {
    errors.push("bridge packet source.issue_number must be a positive integer");
  }
  if (
    issueUrl === undefined ||
    !/^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/[1-9][0-9]*$/u.test(
      issueUrl,
    )
  ) {
    errors.push("bridge packet source.issue_url must be a canonical GitHub issue URL");
  }

  const target = pickObject(bridgePacket, ["target"]);
  if (target === undefined) {
    errors.push("bridge packet target object is missing");
  } else {
    if (
      pickString(target, ["quote_packet_schema"]) !==
      PAID_DATANET_QUOTE_PACKET_V1_SCHEMA
    ) {
      errors.push(
        `bridge packet target.quote_packet_schema must be ${PAID_DATANET_QUOTE_PACKET_V1_SCHEMA}`,
      );
    }
    if (
      pickString(target, ["quote_packet_marker"]) !==
      PAID_DATANET_QUOTE_PACKET_V1_MARKER
    ) {
      errors.push(
        `bridge packet target.quote_packet_marker must be ${PAID_DATANET_QUOTE_PACKET_V1_MARKER}`,
      );
    }
  }

  const draftQuoteInput = pickObject(bridgePacket, ["draft_quote_input"]);
  if (draftQuoteInput === undefined) {
    errors.push("bridge packet must contain draft_quote_input");
  }

  const operatorInput = pickObject(bridgePacket, ["operator_input"]);
  if (operatorInput === undefined) {
    errors.push("bridge packet operator_input object is missing");
  }

  validateBridgeChecks(pickObject(bridgePacket, ["checks"]), errors);
  validateBridgeControls(pickObject(bridgePacket, ["controls"]), errors);

  const holdReasons = pickStringArray(bridgePacket, ["hold_reasons"]);
  if (holdReasons === undefined) {
    errors.push("bridge packet hold_reasons must be a string array");
  } else if (holdReasons.length !== 0) {
    errors.push("bridge packet hold_reasons must be empty");
  }

  const quotePacketCliArgv = pickStringArray(
    bridgePacket,
    ["quote_packet_cli_argv"],
  );
  if (quotePacketCliArgv === undefined) {
    errors.push("bridge packet quote_packet_cli_argv must be a string array");
  }

  const approvedAt = canonicalIsoTimestamp(input.approved_at);
  if (approvedAt === undefined) {
    errors.push("approved_at must be canonical ISO-8601 UTC");
  }

  const approverDisplayName = validateApproverDisplayName(
    input.approver_display_name,
  );
  if (approverDisplayName === undefined) {
    errors.push("approver_display_name is missing or invalid");
  }

  if (input.confirmation !== APPROVAL_CONFIRMATION_TOKEN_V1) {
    errors.push(`confirmation must equal ${APPROVAL_CONFIRMATION_TOKEN_V1}`);
  }

  if (containsSecretShapedValueV1(bridgePacket)) {
    errors.push("bridge packet contains a secret-shaped value");
  }

  let quotePacket: PaidDatanetQuotePacketV1 | undefined;

  if (draftQuoteInput !== undefined) {
    quotePacket = createVerifiedQuotePacket(draftQuoteInput, errors);

    if (quotePacket !== undefined && approvedAt !== undefined) {
      validateApprovalWindow(quotePacket, approvedAt, errors);
    }

    const typedDraft =
      draftQuoteInput as unknown as PaidDatanetQuotePacketRequestV1;
    const quoteRequest = pickObject(draftQuoteInput, ["quote_request"]);

    if (operatorInput !== undefined && quoteRequest !== undefined) {
      if (
        pickString(operatorInput, ["issuer_name"]) !==
        pickString(draftQuoteInput, ["issuer_name"])
      ) {
        errors.push("bridge packet operator_input.issuer_name must match draft_quote_input");
      }
      if (pickString(operatorInput, ["currency"]) !== USD_CENTS) {
        errors.push(`bridge packet operator_input.currency must be ${USD_CENTS}`);
      }
      if (
        pickInteger(operatorInput, ["operator_cost_basis_cents"]) !==
        pickInteger(quoteRequest, ["operator_cost_basis_cents"])
      ) {
        errors.push(
          "bridge packet operator_input.operator_cost_basis_cents must match draft_quote_input",
        );
      }
      if (
        pickInteger(operatorInput, ["requested_at_ms"]) !==
        pickInteger(quoteRequest, ["requested_at_ms"])
      ) {
        errors.push(
          "bridge packet operator_input.requested_at_ms must match draft_quote_input",
        );
      }
    }

    if (
      quotePacket !== undefined &&
      quotePacketCliArgv !== undefined &&
      canonicalJsonV1(quotePacketCliArgv) !==
        canonicalJsonV1(expectedQuotePacketCliArgv(typedDraft))
    ) {
      errors.push(
        "bridge packet quote_packet_cli_argv does not match draft_quote_input",
      );
    }
  }

  if (
    errors.length > 0 ||
    bridgeId === undefined ||
    triagePacketSha256 === undefined ||
    triageId === undefined ||
    draftQuoteInput === undefined ||
    quotePacket === undefined ||
    approvedAt === undefined ||
    approverDisplayName === undefined
  ) {
    return makeHold(bridgePacketSha256, errors);
  }

  const draftQuoteInputSha256 = sha256JsonV1(draftQuoteInput);
  const quotePacketSha256 = quotePacket.packet_sha256;
  const quotePacketJson = quotePacket as unknown as JsonObject;

  const approvedQuotePacket: JsonObject = {
    schema: APPROVED_CUSTOMER_QUOTE_SCHEMA_V1,
    quote_status: "APPROVED_AWAITING_CUSTOMER_PAYMENT",
    bridge_packet_sha256: bridgePacketSha256,
    bridge_id: bridgeId,
    triage_packet_sha256: triagePacketSha256,
    triage_id: triageId,
    draft_quote_input_sha256: draftQuoteInputSha256,
    draft_quote_input: draftQuoteInput,
    quote_packet_sha256: quotePacketSha256,
    quote_packet: quotePacketJson,
    approver_display_name: approverDisplayName,
    approved_at: approvedAt,
    confirmation_token_verified: true,
    quote_packet_verified: true,
    customer_payment_required: true,
    payment_collection_enabled: false,
    admission_authorized: false,
    execution_authorized: false,
    automatic_execution_enabled: false,
    wc_mutation_enabled: false,
    treasury_access_enabled: false,
  };

  const approvalId = sha256JsonV1({
    schema: APPROVAL_SCHEMA_V1,
    bridge_packet_sha256: bridgePacketSha256,
    bridge_id: bridgeId,
    triage_packet_sha256: triagePacketSha256,
    triage_id: triageId,
    draft_quote_input_sha256: draftQuoteInputSha256,
    quote_packet_sha256: quotePacketSha256,
    approver_display_name: approverDisplayName,
    approved_at: approvedAt,
    confirmation: APPROVAL_CONFIRMATION_TOKEN_V1,
  });

  return {
    schema: APPROVAL_SCHEMA_V1,
    marker: VOID_PAID_DATANET_PUBLIC_PILOT_QUOTE_APPROVAL_CLI_V1,
    approval_id: approvalId,
    disposition: APPROVED_DISPOSITION_V1,
    bridge_packet_sha256: bridgePacketSha256,
    bridge_id: bridgeId,
    triage_packet_sha256: triagePacketSha256,
    triage_id: triageId,
    draft_quote_input_sha256: draftQuoteInputSha256,
    quote_packet_sha256: quotePacketSha256,
    approver_display_name: approverDisplayName,
    approved_at: approvedAt,
    confirmation_token_verified: true,
    quote_packet_verified: true,
    approved_quote_packet: approvedQuotePacket,
    customer_payment_required: true,
    admission_authorized: false,
    execution_authorized: false,
    automatic_execution_enabled: false,
    payment_collection_enabled: false,
    github_api_access_enabled: false,
    network_access_enabled: false,
    filesystem_write_enabled: false,
    wc_mutation_enabled: false,
    treasury_access_enabled: false,
  };
}

interface ParsedCliArgumentsV1 {
  bridgePath: string;
  approverDisplayName: string;
  approvedAt: string;
  confirmation: string;
}

function parseCliArgumentsV1(args: readonly string[]): ParsedCliArgumentsV1 {
  const values = new Map<string, string>();

  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];

    if (key === undefined || value === undefined || !key.startsWith("--")) {
      throw new Error(
        "usage: --bridge <path> --approver <display-name> --approved-at <ISO> --confirm <token>",
      );
    }

    if (values.has(key)) {
      throw new Error(`duplicate argument: ${key}`);
    }

    values.set(key, value);
  }

  const bridgePath = values.get("--bridge");
  const approverDisplayName = values.get("--approver");
  const approvedAt = values.get("--approved-at");
  const confirmation = values.get("--confirm");

  if (
    bridgePath === undefined ||
    approverDisplayName === undefined ||
    approvedAt === undefined ||
    confirmation === undefined ||
    values.size !== 4
  ) {
    throw new Error(
      "usage: --bridge <path> --approver <display-name> --approved-at <ISO> --confirm <token>",
    );
  }

  return {
    bridgePath,
    approverDisplayName,
    approvedAt,
    confirmation,
  };
}

export function runQuoteApprovalCliV1(
  args: readonly string[],
  readText: (path: string) => string,
): CliRunResultV1 {
  try {
    const parsed = parseCliArgumentsV1(args);
    const rawBridge = readText(parsed.bridgePath);
    const decoded: unknown = JSON.parse(rawBridge);

    if (!isJsonObject(decoded)) {
      throw new Error("bridge packet JSON must be an object");
    }

    const result = approvePublicPilotQuoteV1({
      bridge_packet: decoded,
      approver_display_name: parsed.approverDisplayName,
      approved_at: parsed.approvedAt,
      confirmation: parsed.confirmation,
    });

    return {
      exit_code: result.disposition === APPROVED_DISPOSITION_V1 ? 0 : 2,
      stdout: `${JSON.stringify(result, null, 2)}\n`,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const failure: JsonObject = {
      schema: APPROVAL_SCHEMA_V1,
      marker: VOID_PAID_DATANET_PUBLIC_PILOT_QUOTE_APPROVAL_CLI_V1,
      disposition: HOLD_DISPOSITION_V1,
      errors: [message],
      draft_quote_input_required: true,
      canonical_quote_packet_required: true,
      bridge_source_binding_required: true,
      payment_collection_enabled: false,
      admission_authorized: false,
      execution_authorized: false,
      network_access_enabled: false,
      filesystem_write_enabled: false,
      wc_mutation_enabled: false,
      treasury_access_enabled: false,
    };

    return {
      exit_code: 2,
      stdout: `${JSON.stringify(failure, null, 2)}\n`,
    };
  }
}

function isDirectExecution(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) {
    return false;
  }

  return fileURLToPath(import.meta.url) === resolve(entry);
}

if (isDirectExecution()) {
  const run = runQuoteApprovalCliV1(process.argv.slice(2), (path) =>
    readFileSync(path, "utf8"),
  );
  process.stdout.write(run.stdout);
  process.exitCode = run.exit_code;
}
