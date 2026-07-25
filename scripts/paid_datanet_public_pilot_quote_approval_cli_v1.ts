#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export const VOID_PAID_DATANET_PUBLIC_PILOT_QUOTE_APPROVAL_CLI_V1 =
  "VOID_PAID_DATANET_PUBLIC_PILOT_QUOTE_APPROVAL_CLI_V1";

export const APPROVAL_SCHEMA_V1 =
  "void-paid-datanet-public-pilot-quote-approval-v1";

export const BRIDGE_SCHEMA_V1 =
  "void-paid-datanet-public-pilot-quote-bridge-v1";

export const APPROVAL_CONFIRMATION_TOKEN_V1 =
  "approvePaidDataNetPublicPilotQuoteV1";

export const APPROVED_DISPOSITION_V1 = "APPROVED_QUOTE_PACKET";
export const HOLD_DISPOSITION_V1 = "HOLD_FOR_OPERATOR_APPROVAL";

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
  explicit_operator_confirmation_required: true;
  approver_identity_required: true;
  approval_timestamp_required: true;
  approved_customer_quote_packet_enabled: false;
  payment_collection_enabled: false;
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
  approver_display_name: string;
  approved_at: string;
  confirmation_token_verified: true;
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

function isSha256(value: string): boolean {
  return /^[a-f0-9]{64}$/u.test(value);
}

function isSafeIdentifier(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._:/-]{2,191}$/u.test(value);
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

function validateDraftQuoteInput(
  value: JsonObject,
  approvedAt: string,
  errors: string[],
): void {
  const serviceId = pickString(value, ["service_id", "serviceId"]);
  const customerId = pickString(value, ["customer_id", "customerId"]);
  const requestId = pickString(value, ["request_id", "requestId"]);
  const currency = pickString(value, ["currency"]);
  const quoteExpiresAt = pickString(value, [
    "quote_expires_at",
    "quoteExpiresAt",
    "expires_at",
  ]);

  if (serviceId === undefined || !isSafeIdentifier(serviceId)) {
    errors.push("draft_quote_input.service_id is missing or invalid");
  }

  if (customerId === undefined || !isSafeIdentifier(customerId)) {
    errors.push("draft_quote_input.customer_id is missing or invalid");
  }

  if (requestId === undefined || !isSafeIdentifier(requestId)) {
    errors.push("draft_quote_input.request_id is missing or invalid");
  }

  if (currency === undefined || !/^[A-Z]{3}$/u.test(currency)) {
    errors.push("draft_quote_input.currency must be a three-letter uppercase code");
  }

  const amountCandidate =
    value.total_amount ?? value.totalAmount ?? value.price_amount ?? value.amount;

  if (
    typeof amountCandidate !== "number" ||
    !Number.isFinite(amountCandidate) ||
    amountCandidate <= 0 ||
    amountCandidate > 1_000_000_000
  ) {
    errors.push("draft_quote_input total amount must be a finite positive number");
  }

  if (quoteExpiresAt !== undefined) {
    const normalizedExpiry = canonicalIsoTimestamp(quoteExpiresAt);
    if (normalizedExpiry === undefined) {
      errors.push("draft_quote_input quote expiry must be canonical ISO-8601 UTC");
    } else {
      const approvedTime = new Date(approvedAt).getTime();
      const expiryTime = new Date(normalizedExpiry).getTime();
      if (expiryTime <= approvedTime) {
        errors.push("draft_quote_input quote expiry must be after approval time");
      }
      if (expiryTime - approvedTime > 90 * 24 * 60 * 60 * 1000) {
        errors.push("draft_quote_input quote expiry exceeds the 90-day maximum");
      }
    }
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
    explicit_operator_confirmation_required: true,
    approver_identity_required: true,
    approval_timestamp_required: true,
    approved_customer_quote_packet_enabled: false,
    payment_collection_enabled: false,
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

  if (bridgePacket.schema !== BRIDGE_SCHEMA_V1) {
    errors.push(`bridge packet schema must be ${BRIDGE_SCHEMA_V1}`);
  }

  const bridgeDisposition = pickString(bridgePacket, [
    "disposition",
    "ready_disposition",
  ]);
  if (bridgeDisposition !== "DRAFT_QUOTE_INPUT") {
    errors.push("bridge packet disposition must be DRAFT_QUOTE_INPUT");
  }

  const bridgeId = pickString(bridgePacket, ["bridge_id", "ready_bridge_id"]);
  if (bridgeId === undefined || !isSha256(bridgeId)) {
    errors.push("bridge packet bridge_id must be a SHA-256 value");
  }

  const triagePacketSha256 = pickString(bridgePacket, [
    "triage_packet_sha256",
    "ready_triage_packet_sha256",
  ]);
  if (triagePacketSha256 === undefined || !isSha256(triagePacketSha256)) {
    errors.push("bridge packet triage_packet_sha256 must be a SHA-256 value");
  }

  const triageId = pickString(bridgePacket, ["triage_id", "ready_triage_id"]);
  if (triageId === undefined || !isSha256(triageId)) {
    errors.push("bridge packet triage_id must be a SHA-256 value");
  }

  const draftQuoteInput = pickObject(bridgePacket, [
    "draft_quote_input",
    "quote_packet_input",
    "quote_request",
  ]);

  if (draftQuoteInput === undefined) {
    errors.push("bridge packet must contain draft_quote_input");
  }

  const declaredDraftSha256 = pickString(bridgePacket, [
    "draft_quote_input_sha256",
    "quote_packet_input_sha256",
    "quote_request_sha256",
  ]);

  if (draftQuoteInput !== undefined && declaredDraftSha256 !== undefined) {
    if (!isSha256(declaredDraftSha256)) {
      errors.push("declared draft quote input hash must be a SHA-256 value");
    } else if (sha256JsonV1(draftQuoteInput) !== declaredDraftSha256) {
      errors.push("declared draft quote input hash does not match its content");
    }
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

  if (draftQuoteInput !== undefined && approvedAt !== undefined) {
    validateDraftQuoteInput(draftQuoteInput, approvedAt, errors);
  }

  if (
    errors.length > 0 ||
    bridgeId === undefined ||
    triagePacketSha256 === undefined ||
    triageId === undefined ||
    draftQuoteInput === undefined ||
    approvedAt === undefined ||
    approverDisplayName === undefined
  ) {
    return makeHold(bridgePacketSha256, errors);
  }

  const draftQuoteInputSha256 = sha256JsonV1(draftQuoteInput);

  const approvedQuotePacket: JsonObject = {
    schema: "void-paid-datanet-public-pilot-approved-customer-quote-v1",
    quote_status: "APPROVED_AWAITING_CUSTOMER_PAYMENT",
    bridge_packet_sha256: bridgePacketSha256,
    bridge_id: bridgeId,
    triage_packet_sha256: triagePacketSha256,
    triage_id: triageId,
    draft_quote_input_sha256: draftQuoteInputSha256,
    draft_quote_input: draftQuoteInput,
    approver_display_name: approverDisplayName,
    approved_at: approvedAt,
    customer_payment_required: true,
    admission_authorized: false,
    execution_authorized: false,
  };

  const approvalId = sha256JsonV1({
    schema: APPROVAL_SCHEMA_V1,
    bridge_packet_sha256: bridgePacketSha256,
    bridge_id: bridgeId,
    triage_packet_sha256: triagePacketSha256,
    triage_id: triageId,
    draft_quote_input_sha256: draftQuoteInputSha256,
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
    approver_display_name: approverDisplayName,
    approved_at: approvedAt,
    confirmation_token_verified: true,
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
      payment_collection_enabled: false,
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
