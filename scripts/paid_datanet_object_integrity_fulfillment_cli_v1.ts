#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  appendPaidDatanetFulfillmentReceiptV1,
  verifyPaidDatanetFulfillmentReceiptsAgainstAdmissionsV1,
  type PaidDatanetFulfillmentEvidenceArtifactV1,
  type PaidDatanetFulfillmentReceiptV1,
} from "../src/paid_services/datanet_fulfillment_receipt_v1.js";
import {
  verifyPaidDatanetAdmissionReceiptChainV1,
  verifyPaidDatanetAdmissionRequestV1,
  type PaidDatanetAdmissionReceiptV1,
  type PaidDatanetAdmissionRequestV1,
} from "../src/paid_services/datanet_request_admission_v1.js";
import {
  getPaidDatanetServiceV1,
} from "../src/paid_services/datanet_service_catalog_v1.js";
import {
  verifyPaidDatanetQuotePacketV1,
  type PaidDatanetQuotePacketV1,
} from "./paid_datanet_quote_packet_v1.js";
import type {
  FulfillPaidDatanetOperatorWorkflowV1Input,
} from "./paid_datanet_operator_workflow_cli_v1.js";

export const VOID_PAID_DATANET_OBJECT_INTEGRITY_FULFILLMENT_CLI_V1 =
  "VOID_PAID_DATANET_OBJECT_INTEGRITY_FULFILLMENT_CLI_V1";
export const OBJECT_INTEGRITY_FULFILLMENT_SCHEMA_V1 =
  "void-paid-datanet-object-integrity-fulfillment-v1";
export const OBJECT_INTEGRITY_MANIFEST_SCHEMA_V1 =
  "void-paid-datanet-object-integrity-manifest-v1";
export const OBJECT_INTEGRITY_FULFILLMENT_TOKEN_V1 =
  "executePaidDataNetObjectIntegrityV1";
export const OBJECT_INTEGRITY_FULFILLMENT_DISPOSITION_V1 =
  "OBJECT_INTEGRITY_FULFILLMENT_RECEIPT";
export const OBJECT_INTEGRITY_FULFILLMENT_HOLD_DISPOSITION_V1 =
  "HOLD_FOR_OBJECT_INTEGRITY_FULFILLMENT_REVIEW";

const ADMISSION_DECISION_SCHEMA_V1 =
  "void-paid-datanet-public-pilot-admission-decision-v1";
const ADMISSION_DECISION_MARKER_V1 =
  "VOID_PAID_DATANET_PUBLIC_PILOT_ADMISSION_DECISION_CLI_V1";
const ADMISSION_DECISION_DISPOSITION_V1 =
  "ADMISSION_DECISION_RECEIPT";
const ADMISSION_DECISION_TOKEN_V1 =
  "decidePaidDataNetPublicPilotAdmissionV1";
const APPROVAL_SCHEMA_V1 =
  "void-paid-datanet-public-pilot-quote-approval-v1";
const APPROVAL_MARKER_V1 =
  "VOID_PAID_DATANET_PUBLIC_PILOT_QUOTE_APPROVAL_CLI_V1";
const APPROVED_DISPOSITION_V1 = "APPROVED_QUOTE_PACKET";
const APPROVED_CUSTOMER_QUOTE_SCHEMA_V1 =
  "void-paid-datanet-public-pilot-approved-customer-quote-v1";
const APPROVAL_CONFIRMATION_TOKEN_V1 =
  "approvePaidDataNetPublicPilotQuoteV1";
const SERVICE_CODE_V1 = "datanet.object-integrity-check.v1";

const SHA256_HEX = /^[a-f0-9]{64}$/u;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,95}$/u;
const MAX_INPUT_JSON_BYTES = 16 * 1024 * 1024;
const MAX_PATH_BYTES = 4096;
const MAX_TIMESTAMP_MS = 8_000_000_000_000_000;
const SECRET_PATTERNS = Object.freeze([
  /xox[baprs]-[A-Za-z0-9-]+/u,
  /AKIA[0-9A-Z]{16}/u,
  /ghp_[A-Za-z0-9_]+/u,
  /github_pat_[A-Za-z0-9_]+/u,
  /sk-[A-Za-z0-9]{20,}/u,
  new RegExp(["-----BEGIN", "PRIVATE KEY-----"].join(" "), "u"),
]);

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;
export interface JsonObject {
  [key: string]: JsonValue;
}

export interface ObjectIntegrityManifestEntryV1 extends JsonObject {
  object_ref: string;
  local_path: string;
  expected_sha256: string;
  expected_byte_length: number;
}

export interface ObjectIntegrityManifestV1 extends JsonObject {
  schema: typeof OBJECT_INTEGRITY_MANIFEST_SCHEMA_V1;
  admission_request_id: string;
  requester_id: string;
  service_code: typeof SERVICE_CODE_V1;
  objects: ObjectIntegrityManifestEntryV1[];
}

export interface ObjectIntegrityFulfillmentInputV1 {
  admission_decision_packet: JsonObject;
  approval_packet: JsonObject;
  existing_fulfillment_receipts: JsonValue;
  object_manifest: JsonObject;
  fulfillment_operator_id: string;
  execution_started_at: string;
  completed_at: string;
  operator_attestation_sha256: string;
  confirmation: string;
}

export interface ObjectIntegrityObjectResultV1 extends JsonObject {
  object_ref: string;
  path_sha256: string;
  expected_sha256: string;
  observed_sha256: string | null;
  expected_byte_length: number;
  observed_byte_length: number | null;
  digest_match: boolean;
  byte_length_match: boolean;
  verdict: "MATCH" | "MISMATCH" | "SOURCE_UNAVAILABLE";
}

export interface ObjectIntegrityFulfillmentHoldV1 extends JsonObject {
  schema: typeof OBJECT_INTEGRITY_FULFILLMENT_SCHEMA_V1;
  marker: typeof VOID_PAID_DATANET_OBJECT_INTEGRITY_FULFILLMENT_CLI_V1;
  disposition: typeof OBJECT_INTEGRITY_FULFILLMENT_HOLD_DISPOSITION_V1;
  admission_decision_packet_sha256: string;
  approval_packet_sha256: string;
  fulfillment_receipt_chain_sha256: string;
  object_manifest_sha256: string;
  errors: string[];
  exact_service_required: true;
  admitted_receipt_required: true;
  approved_quote_packet_required: true;
  quoted_scope_binding_required: true;
  explicit_operator_confirmation_required: true;
  local_regular_file_reads_enabled: false;
  symlink_input_rejected: true;
  admission_authorized: false;
  execution_authorized: false;
  execution_performed_by_cli: false;
  automatic_execution_enabled: false;
  network_access_enabled: false;
  filesystem_write_enabled: false;
  payment_collection_enabled: false;
  payment_movement_enabled: false;
  wc_mutation_enabled: false;
  treasury_access_enabled: false;
}

export interface ObjectIntegrityFulfillmentReadyV1 extends JsonObject {
  schema: typeof OBJECT_INTEGRITY_FULFILLMENT_SCHEMA_V1;
  marker: typeof VOID_PAID_DATANET_OBJECT_INTEGRITY_FULFILLMENT_CLI_V1;
  fulfillment_id: string;
  disposition: typeof OBJECT_INTEGRITY_FULFILLMENT_DISPOSITION_V1;
  admission_decision_packet_sha256: string;
  admission_decision_id: string;
  approval_packet_sha256: string;
  approval_id: string;
  quote_packet_sha256: string;
  quote_id: string;
  admission_request_id: string;
  admission_receipt_sha256: string;
  requester_id: string;
  service_code: typeof SERVICE_CODE_V1;
  quoted_object_count: number;
  quoted_total_bytes: number;
  object_manifest_sha256: string;
  fulfillment_operator_id: string;
  execution_started_at: string;
  execution_started_at_ms: number;
  completed_at: string;
  completed_at_ms: number;
  object_count: number;
  total_observed_bytes: number;
  match_count: number;
  mismatch_count: number;
  source_unavailable_count: number;
  outcome: "COMPLETED" | "FAILED";
  outcome_code:
    | "DELIVERED_AS_QUOTED"
    | "INTEGRITY_MISMATCH"
    | "SOURCE_UNAVAILABLE";
  result_summary: JsonObject;
  result_summary_sha256: string;
  operator_attestation_sha256: string;
  evidence_artifacts: JsonValue[];
  fulfillment_receipt: JsonObject;
  fulfillment_receipt_chain: JsonValue[];
  receipt_sha256: string;
  receipt_sequence: number;
  previous_receipt_sha256: string | null;
  status: "FULFILLED_DELIVERED" | "FULFILLMENT_FAILED";
  operator_workflow_fulfillment_input: JsonObject;
  actual_admission_decision_contract_consumed: true;
  approved_quote_packet_verified: true;
  admission_and_quote_binding_verified: true;
  quoted_scope_verified: true;
  local_regular_files_read: true;
  symlink_input_rejected: true;
  object_integrity_evidence_created: true;
  fulfillment_receipt_appended: true;
  fulfillment_receipt_chain_verified: true;
  operator_workflow_fulfillment_input_compatible: true;
  explicit_operator_confirmation_required: true;
  operator_triggered_execution: true;
  admission_authorized: true;
  execution_authorized: true;
  execution_performed_by_cli: true;
  automatic_execution_enabled: false;
  network_access_enabled: false;
  filesystem_write_enabled: false;
  payment_collection_enabled: false;
  payment_movement_enabled: false;
  wc_mutation_enabled: false;
  treasury_access_enabled: false;
}

export type ObjectIntegrityFulfillmentResultV1 =
  | ObjectIntegrityFulfillmentHoldV1
  | ObjectIntegrityFulfillmentReadyV1;

export interface CliRunResultV1 {
  exit_code: number;
  stdout: string;
}

interface VerifiedAdmissionDecisionV1 {
  packet: JsonObject;
  admission_decision_id: string;
  admission_request_id: string;
  quote_id: string;
  service_code: typeof SERVICE_CODE_V1;
  requester_id: string;
  decided_at_ms: number;
  admission_request: PaidDatanetAdmissionRequestV1;
  admission_receipt: PaidDatanetAdmissionReceiptV1;
  admission_receipts: readonly PaidDatanetAdmissionReceiptV1[];
}

interface VerifiedApprovalV1 {
  packet: JsonObject;
  approval_id: string;
  quote_packet_sha256: string;
  quote_packet: PaidDatanetQuotePacketV1;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalJsonV1(value: JsonValue): string {
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
    return `[${value.map((entry) => canonicalJsonV1(entry)).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${canonicalJsonV1(value[key] as JsonValue)}`,
    )
    .join(",")}}`;
}

function sha256TextV1(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function sha256JsonV1(value: JsonValue): string {
  return sha256TextV1(canonicalJsonV1(value));
}

function containsSecretShapedValueV1(value: JsonValue): boolean {
  if (typeof value === "string") {
    return SECRET_PATTERNS.some((pattern) => pattern.test(value));
  }
  if (Array.isArray(value)) {
    return value.some((entry) => containsSecretShapedValueV1(entry));
  }
  if (isJsonObject(value)) {
    return Object.entries(value).some(
      ([key, entry]) =>
        SECRET_PATTERNS.some((pattern) => pattern.test(key)) ||
        containsSecretShapedValueV1(entry),
    );
  }
  return false;
}

function pickString(object: JsonObject, key: string): string | undefined {
  const value = object[key];
  return typeof value === "string" ? value : undefined;
}

function pickInteger(object: JsonObject, key: string): number | undefined {
  const value = object[key];
  return typeof value === "number" && Number.isSafeInteger(value)
    ? value
    : undefined;
}

function pickBoolean(object: JsonObject, key: string): boolean | undefined {
  const value = object[key];
  return typeof value === "boolean" ? value : undefined;
}

function pickObject(object: JsonObject, key: string): JsonObject | undefined {
  const value = object[key];
  return isJsonObject(value) ? value : undefined;
}

function canonicalIsoTimestamp(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value
    ? value
    : undefined;
}

function asAdmissionRequest(value: JsonValue): PaidDatanetAdmissionRequestV1 | undefined {
  if (!isJsonObject(value)) {
    return undefined;
  }
  return value as unknown as PaidDatanetAdmissionRequestV1;
}

function asAdmissionReceipts(value: JsonValue): readonly PaidDatanetAdmissionReceiptV1[] | undefined {
  if (!Array.isArray(value) || !value.every((entry) => isJsonObject(entry))) {
    return undefined;
  }
  return value as unknown as readonly PaidDatanetAdmissionReceiptV1[];
}

function asFulfillmentReceipts(value: JsonValue): readonly PaidDatanetFulfillmentReceiptV1[] | undefined {
  if (!Array.isArray(value) || !value.every((entry) => isJsonObject(entry))) {
    return undefined;
  }
  return value as unknown as readonly PaidDatanetFulfillmentReceiptV1[];
}

function makeHold(
  admissionSha: string,
  approvalSha: string,
  receiptChainSha: string,
  manifestSha: string,
  errors: readonly string[],
): ObjectIntegrityFulfillmentHoldV1 {
  return {
    schema: OBJECT_INTEGRITY_FULFILLMENT_SCHEMA_V1,
    marker: VOID_PAID_DATANET_OBJECT_INTEGRITY_FULFILLMENT_CLI_V1,
    disposition: OBJECT_INTEGRITY_FULFILLMENT_HOLD_DISPOSITION_V1,
    admission_decision_packet_sha256: admissionSha,
    approval_packet_sha256: approvalSha,
    fulfillment_receipt_chain_sha256: receiptChainSha,
    object_manifest_sha256: manifestSha,
    errors: [...errors],
    exact_service_required: true,
    admitted_receipt_required: true,
    approved_quote_packet_required: true,
    quoted_scope_binding_required: true,
    explicit_operator_confirmation_required: true,
    local_regular_file_reads_enabled: false,
    symlink_input_rejected: true,
    admission_authorized: false,
    execution_authorized: false,
    execution_performed_by_cli: false,
    automatic_execution_enabled: false,
    network_access_enabled: false,
    filesystem_write_enabled: false,
    payment_collection_enabled: false,
    payment_movement_enabled: false,
    wc_mutation_enabled: false,
    treasury_access_enabled: false,
  };
}

function verifyAdmissionDecisionPacket(
  packet: JsonObject,
  errors: string[],
): VerifiedAdmissionDecisionV1 | undefined {
  if (containsSecretShapedValueV1(packet)) {
    errors.push("admission decision packet contains a secret-shaped value");
  }
  if (pickString(packet, "schema") !== ADMISSION_DECISION_SCHEMA_V1) {
    errors.push("admission decision schema mismatch");
  }
  if (pickString(packet, "marker") !== ADMISSION_DECISION_MARKER_V1) {
    errors.push("admission decision marker mismatch");
  }
  if (pickString(packet, "disposition") !== ADMISSION_DECISION_DISPOSITION_V1) {
    errors.push("admission decision disposition mismatch");
  }

  const admissionDecisionId = pickString(packet, "admission_decision_id");
  const paymentConfirmationPacketSha256 = pickString(
    packet,
    "payment_confirmation_packet_sha256",
  );
  const paymentConfirmationId = pickString(packet, "payment_confirmation_id");
  const admissionRequestId = pickString(packet, "admission_request_id");
  const receiptSha256 = pickString(packet, "receipt_sha256");
  const operatorId = pickString(packet, "operator_id");
  const decision = pickString(packet, "decision");
  const reasonCode = pickString(packet, "reason_code");
  const decidedAt = canonicalIsoTimestamp(packet["decided_at"]);
  const decidedAtMs = pickInteger(packet, "decided_at_ms");
  const quoteId = pickString(packet, "quote_id");
  const serviceCode = pickString(packet, "service_code");
  const requesterId = pickString(packet, "requester_id");

  for (const [name, value] of [
    ["admission_decision_id", admissionDecisionId],
    ["payment_confirmation_packet_sha256", paymentConfirmationPacketSha256],
    ["payment_confirmation_id", paymentConfirmationId],
    ["admission_request_id", admissionRequestId],
    ["receipt_sha256", receiptSha256],
    ["quote_id", quoteId],
  ] as const) {
    if (value === undefined || !SHA256_HEX.test(value)) {
      errors.push(`${name} must be lowercase SHA-256 hex`);
    }
  }
  if (operatorId === undefined || !IDENTIFIER.test(operatorId)) {
    errors.push("admission operator_id is invalid");
  }
  if (serviceCode !== SERVICE_CODE_V1) {
    errors.push(`admission service_code must equal ${SERVICE_CODE_V1}`);
  }
  if (requesterId === undefined || !IDENTIFIER.test(requesterId)) {
    errors.push("admission requester_id is invalid");
  }
  if (decision !== "APPROVE") {
    errors.push("fulfillment requires an APPROVE admission decision");
  }
  if (reasonCode !== "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE") {
    errors.push("admission reason_code is not fulfillment-eligible");
  }
  if (pickString(packet, "status") !== "ADMITTED_AWAITING_SEPARATE_EXECUTION") {
    errors.push("admission status is not awaiting separate execution");
  }
  if (
    decidedAt === undefined ||
    decidedAtMs === undefined ||
    decidedAtMs < 0 ||
    decidedAtMs > MAX_TIMESTAMP_MS ||
    new Date(decidedAt).getTime() !== decidedAtMs
  ) {
    errors.push("admission decided_at binding is invalid");
  }

  const requiredTrue = [
    "actual_payment_confirmation_contract_consumed",
    "payment_confirmation_integrity_verified",
    "canonical_admission_request_created",
    "canonical_admission_request_verified",
    "existing_receipt_chain_verified",
    "append_only_admission_receipt",
    "duplicate_decision_rejected",
    "explicit_operator_confirmation_required",
    "operator_admission_decision_recorded",
    "admission_authorized",
  ] as const;
  for (const field of requiredTrue) {
    if (pickBoolean(packet, field) !== true) {
      errors.push(`admission decision ${field} must be true`);
    }
  }
  const requiredFalse = [
    "automatic_admission_enabled",
    "execution_authorized",
    "automatic_execution_enabled",
    "payment_collection_enabled",
    "payment_movement_enabled",
    "github_api_access_enabled",
    "network_access_enabled",
    "filesystem_write_enabled",
    "wc_mutation_enabled",
    "treasury_access_enabled",
  ] as const;
  for (const field of requiredFalse) {
    if (pickBoolean(packet, field) !== false) {
      errors.push(`admission decision ${field} must be false`);
    }
  }

  const admissionRequestObject = pickObject(packet, "admission_request");
  const admissionReceiptObject = pickObject(packet, "admission_receipt");
  const admissionReceipts = asAdmissionReceipts(
    packet["admission_receipt_chain"] as JsonValue,
  );
  const admissionRequest =
    admissionRequestObject === undefined
      ? undefined
      : asAdmissionRequest(admissionRequestObject);

  if (admissionRequest === undefined || !verifyPaidDatanetAdmissionRequestV1(admissionRequest)) {
    errors.push("canonical admission request verification failed");
  }
  if (
    admissionReceipts === undefined ||
    !verifyPaidDatanetAdmissionReceiptChainV1(admissionReceipts)
  ) {
    errors.push("admission receipt chain verification failed");
  }

  const admissionReceipt = admissionReceipts?.at(-1);
  if (
    admissionReceipt === undefined ||
    admissionReceiptObject === undefined ||
    canonicalJsonV1(admissionReceiptObject) !==
      canonicalJsonV1(admissionReceipt as unknown as JsonObject)
  ) {
    errors.push("admission receipt packet binding failed");
  }

  if (
    admissionRequest !== undefined &&
    admissionReceipt !== undefined &&
    (
      admissionRequest.admission_request_id !== admissionRequestId ||
      admissionRequest.quote.quote_id !== quoteId ||
      admissionRequest.quote.service_code !== SERVICE_CODE_V1 ||
      admissionRequest.quote.requester_id !== requesterId ||
      admissionReceipt.admission_request_id !== admissionRequestId ||
      admissionReceipt.quote_id !== quoteId ||
      admissionReceipt.service_code !== SERVICE_CODE_V1 ||
      admissionReceipt.requester_id !== requesterId ||
      admissionReceipt.receipt_sha256 !== receiptSha256 ||
      admissionReceipt.decision !== "APPROVE" ||
      admissionReceipt.status !== "ADMITTED_AWAITING_SEPARATE_EXECUTION"
    )
  ) {
    errors.push("admission request and receipt source binding failed");
  }

  if (
    admissionDecisionId !== undefined &&
    paymentConfirmationPacketSha256 !== undefined &&
    paymentConfirmationId !== undefined &&
    admissionRequestId !== undefined &&
    receiptSha256 !== undefined &&
    operatorId !== undefined &&
    decidedAt !== undefined &&
    decision === "APPROVE" &&
    reasonCode === "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE"
  ) {
    const expectedId = sha256JsonV1({
      schema: ADMISSION_DECISION_SCHEMA_V1,
      payment_confirmation_packet_sha256: paymentConfirmationPacketSha256,
      payment_confirmation_id: paymentConfirmationId,
      admission_request_id: admissionRequestId,
      receipt_sha256: receiptSha256,
      operator_id: operatorId,
      decision,
      reason_code: reasonCode,
      decided_at: decidedAt,
      confirmation: ADMISSION_DECISION_TOKEN_V1,
    });
    if (expectedId !== admissionDecisionId) {
      errors.push("admission_decision_id integrity check failed");
    }
  }

  if (
    errors.length > 0 ||
    admissionDecisionId === undefined ||
    admissionRequestId === undefined ||
    quoteId === undefined ||
    serviceCode !== SERVICE_CODE_V1 ||
    requesterId === undefined ||
    decidedAtMs === undefined ||
    admissionRequest === undefined ||
    admissionReceipt === undefined ||
    admissionReceipts === undefined
  ) {
    return undefined;
  }

  return {
    packet,
    admission_decision_id: admissionDecisionId,
    admission_request_id: admissionRequestId,
    quote_id: quoteId,
    service_code: SERVICE_CODE_V1,
    requester_id: requesterId,
    decided_at_ms: decidedAtMs,
    admission_request: admissionRequest,
    admission_receipt: admissionReceipt,
    admission_receipts: admissionReceipts,
  };
}

function verifyApprovalPacket(
  packet: JsonObject,
  admission: VerifiedAdmissionDecisionV1 | undefined,
  errors: string[],
): VerifiedApprovalV1 | undefined {
  if (containsSecretShapedValueV1(packet)) {
    errors.push("approval packet contains a secret-shaped value");
  }
  if (pickString(packet, "schema") !== APPROVAL_SCHEMA_V1) {
    errors.push("approval schema mismatch");
  }
  if (pickString(packet, "marker") !== APPROVAL_MARKER_V1) {
    errors.push("approval marker mismatch");
  }
  if (pickString(packet, "disposition") !== APPROVED_DISPOSITION_V1) {
    errors.push("approval disposition mismatch");
  }

  const approvalId = pickString(packet, "approval_id");
  const bridgePacketSha256 = pickString(packet, "bridge_packet_sha256");
  const bridgeId = pickString(packet, "bridge_id");
  const triagePacketSha256 = pickString(packet, "triage_packet_sha256");
  const triageId = pickString(packet, "triage_id");
  const draftQuoteInputSha256 = pickString(packet, "draft_quote_input_sha256");
  const quotePacketSha256 = pickString(packet, "quote_packet_sha256");
  const approverDisplayName = pickString(packet, "approver_display_name");
  const approvedAt = canonicalIsoTimestamp(packet["approved_at"]);

  for (const [name, value] of [
    ["approval_id", approvalId],
    ["bridge_packet_sha256", bridgePacketSha256],
    ["bridge_id", bridgeId],
    ["triage_packet_sha256", triagePacketSha256],
    ["triage_id", triageId],
    ["draft_quote_input_sha256", draftQuoteInputSha256],
    ["quote_packet_sha256", quotePacketSha256],
  ] as const) {
    if (value === undefined || !SHA256_HEX.test(value)) {
      errors.push(`${name} must be lowercase SHA-256 hex`);
    }
  }
  if (approverDisplayName === undefined || approverDisplayName.length < 2) {
    errors.push("approval approver_display_name is invalid");
  }
  if (approvedAt === undefined) {
    errors.push("approval approved_at is invalid");
  }
  if (
    pickBoolean(packet, "confirmation_token_verified") !== true ||
    pickBoolean(packet, "quote_packet_verified") !== true ||
    pickBoolean(packet, "customer_payment_required") !== true
  ) {
    errors.push("approval required controls are not true");
  }
  for (const field of [
    "admission_authorized",
    "execution_authorized",
    "automatic_execution_enabled",
    "payment_collection_enabled",
    "github_api_access_enabled",
    "network_access_enabled",
    "filesystem_write_enabled",
    "wc_mutation_enabled",
    "treasury_access_enabled",
  ] as const) {
    if (pickBoolean(packet, field) !== false) {
      errors.push(`approval ${field} must be false`);
    }
  }

  const wrapper = pickObject(packet, "approved_quote_packet");
  const quotePacketObject = wrapper === undefined
    ? undefined
    : pickObject(wrapper, "quote_packet");
  const quotePacket = quotePacketObject as unknown as PaidDatanetQuotePacketV1 | undefined;

  if (wrapper === undefined) {
    errors.push("approved_quote_packet is missing");
  } else {
    if (pickString(wrapper, "schema") !== APPROVED_CUSTOMER_QUOTE_SCHEMA_V1) {
      errors.push("approved_quote_packet schema mismatch");
    }
    if (pickString(wrapper, "quote_status") !== "APPROVED_AWAITING_CUSTOMER_PAYMENT") {
      errors.push("approved_quote_packet status mismatch");
    }
  }

  if (quotePacket === undefined || !verifyPaidDatanetQuotePacketV1(quotePacket)) {
    errors.push("canonical approved quote packet verification failed");
  } else if (quotePacket.packet_sha256 !== quotePacketSha256) {
    errors.push("approved quote packet SHA binding failed");
  }

  if (
    wrapper !== undefined &&
    (
      pickString(wrapper, "bridge_packet_sha256") !== bridgePacketSha256 ||
      pickString(wrapper, "bridge_id") !== bridgeId ||
      pickString(wrapper, "triage_packet_sha256") !== triagePacketSha256 ||
      pickString(wrapper, "triage_id") !== triageId ||
      pickString(wrapper, "draft_quote_input_sha256") !== draftQuoteInputSha256 ||
      pickString(wrapper, "quote_packet_sha256") !== quotePacketSha256 ||
      pickString(wrapper, "approver_display_name") !== approverDisplayName ||
      pickString(wrapper, "approved_at") !== approvedAt ||
      pickBoolean(wrapper, "confirmation_token_verified") !== true ||
      pickBoolean(wrapper, "quote_packet_verified") !== true
    )
  ) {
    errors.push("approved_quote_packet outer binding failed");
  }

  if (
    approvalId !== undefined &&
    bridgePacketSha256 !== undefined &&
    bridgeId !== undefined &&
    triagePacketSha256 !== undefined &&
    triageId !== undefined &&
    draftQuoteInputSha256 !== undefined &&
    quotePacketSha256 !== undefined &&
    approverDisplayName !== undefined &&
    approvedAt !== undefined
  ) {
    const expectedApprovalId = sha256JsonV1({
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
    if (expectedApprovalId !== approvalId) {
      errors.push("approval_id integrity check failed");
    }
  }

  if (
    quotePacket !== undefined &&
    admission !== undefined &&
    (
      quotePacket.quote.quote_id !== admission.quote_id ||
      quotePacket.quote.service_code !== SERVICE_CODE_V1 ||
      quotePacket.quote.request.requester_id !== admission.requester_id ||
      admission.admission_request.quote.quote_id !== quotePacket.quote.quote_id ||
      admission.admission_request.quote.service_code !== quotePacket.quote.service_code ||
      admission.admission_request.quote.requester_id !== quotePacket.quote.request.requester_id
    )
  ) {
    errors.push("approval quote and admission decision binding failed");
  }

  if (
    errors.length > 0 ||
    approvalId === undefined ||
    quotePacketSha256 === undefined ||
    quotePacket === undefined
  ) {
    return undefined;
  }

  return {
    packet,
    approval_id: approvalId,
    quote_packet_sha256: quotePacketSha256,
    quote_packet: quotePacket,
  };
}

function normalizeManifest(
  value: JsonObject,
  admission: VerifiedAdmissionDecisionV1 | undefined,
  approval: VerifiedApprovalV1 | undefined,
  errors: string[],
): ObjectIntegrityManifestV1 | undefined {
  if (containsSecretShapedValueV1(value)) {
    errors.push("object manifest contains a secret-shaped value");
  }
  if (pickString(value, "schema") !== OBJECT_INTEGRITY_MANIFEST_SCHEMA_V1) {
    errors.push("object manifest schema mismatch");
  }
  if (pickString(value, "service_code") !== SERVICE_CODE_V1) {
    errors.push(`object manifest service_code must equal ${SERVICE_CODE_V1}`);
  }
  const admissionRequestId = pickString(value, "admission_request_id");
  const requesterId = pickString(value, "requester_id");
  if (admissionRequestId === undefined || !SHA256_HEX.test(admissionRequestId)) {
    errors.push("object manifest admission_request_id is invalid");
  }
  if (requesterId === undefined || !IDENTIFIER.test(requesterId)) {
    errors.push("object manifest requester_id is invalid");
  }
  if (
    admission !== undefined &&
    (admissionRequestId !== admission.admission_request_id || requesterId !== admission.requester_id)
  ) {
    errors.push("object manifest admission binding failed");
  }

  const objectsValue = value["objects"];
  if (!Array.isArray(objectsValue)) {
    errors.push("object manifest objects must be an array");
    return undefined;
  }

  const service = getPaidDatanetServiceV1(SERVICE_CODE_V1);
  const quote = approval?.quote_packet.quote;
  if (objectsValue.length < 1 || objectsValue.length > service.max_object_count) {
    errors.push("object manifest object count exceeds catalog bounds");
  }
  if (quote !== undefined && objectsValue.length !== quote.request.object_count) {
    errors.push("object manifest object count does not match approved quote");
  }

  const normalized: ObjectIntegrityManifestEntryV1[] = [];
  const refs = new Set<string>();
  let totalExpectedBytes = 0;

  for (const entryValue of objectsValue) {
    if (!isJsonObject(entryValue)) {
      errors.push("object manifest entry must be an object");
      continue;
    }
    const objectRef = pickString(entryValue, "object_ref");
    const localPath = pickString(entryValue, "local_path");
    const expectedSha = pickString(entryValue, "expected_sha256");
    const expectedBytes = pickInteger(entryValue, "expected_byte_length");

    if (objectRef === undefined || !IDENTIFIER.test(objectRef)) {
      errors.push("object_ref must be a bounded identifier");
      continue;
    }
    if (refs.has(objectRef)) {
      errors.push("object_ref values must be unique");
      continue;
    }
    refs.add(objectRef);
    if (
      localPath === undefined ||
      localPath.length < 1 ||
      Buffer.byteLength(localPath, "utf8") > MAX_PATH_BYTES ||
      localPath.includes("\0")
    ) {
      errors.push(`local_path is invalid for ${objectRef}`);
      continue;
    }
    if (expectedSha === undefined || !SHA256_HEX.test(expectedSha)) {
      errors.push(`expected_sha256 is invalid for ${objectRef}`);
      continue;
    }
    if (
      expectedBytes === undefined ||
      expectedBytes < 0 ||
      expectedBytes > service.max_total_bytes
    ) {
      errors.push(`expected_byte_length is invalid for ${objectRef}`);
      continue;
    }

    try {
      const stat = lstatSync(localPath);
      if (stat.isSymbolicLink()) {
        errors.push(`symlink input is rejected for ${objectRef}`);
      } else if (!stat.isFile()) {
        errors.push(`non-regular input is rejected for ${objectRef}`);
      }
    } catch {
      errors.push(`source path is unavailable for ${objectRef}`);
    }

    totalExpectedBytes += expectedBytes;
    normalized.push({
      object_ref: objectRef,
      local_path: localPath,
      expected_sha256: expectedSha,
      expected_byte_length: expectedBytes,
    });
  }

  normalized.sort((left, right) =>
    left.object_ref < right.object_ref ? -1 : left.object_ref > right.object_ref ? 1 : 0,
  );

  if (totalExpectedBytes > service.max_total_bytes) {
    errors.push("object manifest total bytes exceed catalog bounds");
  }
  if (quote !== undefined && totalExpectedBytes !== quote.request.total_bytes) {
    errors.push("object manifest total bytes do not match approved quote");
  }

  if (
    errors.length > 0 ||
    admissionRequestId === undefined ||
    requesterId === undefined
  ) {
    return undefined;
  }

  return {
    schema: OBJECT_INTEGRITY_MANIFEST_SCHEMA_V1,
    admission_request_id: admissionRequestId,
    requester_id: requesterId,
    service_code: SERVICE_CODE_V1,
    objects: normalized,
  };
}

function readRegularFileBounded(
  entry: ObjectIntegrityManifestEntryV1,
  maxBytes: number,
): { bytes: Buffer; observedBytes: number } {
  const before = lstatSync(entry.local_path);
  if (before.isSymbolicLink()) {
    throw new Error("symlink input rejected");
  }
  if (!before.isFile()) {
    throw new Error("non-regular input rejected");
  }
  const noFollow = typeof fsConstants.O_NOFOLLOW === "number"
    ? fsConstants.O_NOFOLLOW
    : 0;
  const descriptor = openSync(
    entry.local_path,
    fsConstants.O_RDONLY | noFollow,
  );
  try {
    const opened = fstatSync(descriptor);
    if (!opened.isFile()) {
      throw new Error("opened source is not a regular file");
    }
    if (opened.dev !== before.dev || opened.ino !== before.ino) {
      throw new Error("source identity changed before read");
    }
    if (opened.size < 0 || opened.size > maxBytes) {
      throw new Error("source size exceeds service bound");
    }
    const bytes = readFileSync(descriptor);
    const after = fstatSync(descriptor);
    if (
      after.dev !== opened.dev ||
      after.ino !== opened.ino ||
      after.size !== opened.size ||
      after.mtimeMs !== opened.mtimeMs ||
      after.ctimeMs !== opened.ctimeMs
    ) {
      throw new Error("source changed during read");
    }
    return { bytes, observedBytes: opened.size };
  } finally {
    closeSync(descriptor);
  }
}

export function fulfillPaidDatanetObjectIntegrityV1(
  input: ObjectIntegrityFulfillmentInputV1,
): ObjectIntegrityFulfillmentResultV1 {
  const admissionPacketSha = sha256JsonV1(input.admission_decision_packet);
  const approvalPacketSha = sha256JsonV1(input.approval_packet);
  const receiptChainSha = sha256JsonV1(input.existing_fulfillment_receipts);
  const manifestSha = sha256JsonV1(input.object_manifest);
  const errors: string[] = [];

  const admission = verifyAdmissionDecisionPacket(
    input.admission_decision_packet,
    errors,
  );
  const approval = verifyApprovalPacket(
    input.approval_packet,
    admission,
    errors,
  );
  const existingReceipts = asFulfillmentReceipts(
    input.existing_fulfillment_receipts,
  );
  if (
    existingReceipts === undefined ||
    admission === undefined ||
    !verifyPaidDatanetFulfillmentReceiptsAgainstAdmissionsV1(
      existingReceipts,
      admission.admission_receipts,
    )
  ) {
    errors.push("existing fulfillment receipt chain verification failed");
  }

  const manifest = normalizeManifest(
    input.object_manifest,
    admission,
    approval,
    errors,
  );
  const operatorId = input.fulfillment_operator_id;
  if (!IDENTIFIER.test(operatorId)) {
    errors.push("fulfillment_operator_id must be a bounded identifier");
  }
  const startedAt = canonicalIsoTimestamp(input.execution_started_at);
  const completedAt = canonicalIsoTimestamp(input.completed_at);
  const startedAtMs = startedAt === undefined ? undefined : new Date(startedAt).getTime();
  const completedAtMs = completedAt === undefined ? undefined : new Date(completedAt).getTime();
  if (startedAtMs === undefined || startedAtMs < 0 || startedAtMs > MAX_TIMESTAMP_MS) {
    errors.push("execution_started_at must be canonical ISO-8601 UTC");
  }
  if (completedAtMs === undefined || completedAtMs < 0 || completedAtMs > MAX_TIMESTAMP_MS) {
    errors.push("completed_at must be canonical ISO-8601 UTC");
  }
  if (
    startedAtMs !== undefined &&
    admission !== undefined &&
    startedAtMs < admission.decided_at_ms
  ) {
    errors.push("execution_started_at precedes admission decision");
  }
  if (
    startedAtMs !== undefined &&
    completedAtMs !== undefined &&
    completedAtMs < startedAtMs
  ) {
    errors.push("completed_at precedes execution_started_at");
  }
  if (!SHA256_HEX.test(input.operator_attestation_sha256)) {
    errors.push("operator_attestation_sha256 must be lowercase SHA-256 hex");
  }
  if (input.confirmation !== OBJECT_INTEGRITY_FULFILLMENT_TOKEN_V1) {
    errors.push(`confirmation must equal ${OBJECT_INTEGRITY_FULFILLMENT_TOKEN_V1}`);
  }

  if (
    errors.length > 0 ||
    admission === undefined ||
    approval === undefined ||
    existingReceipts === undefined ||
    manifest === undefined ||
    startedAt === undefined ||
    completedAt === undefined ||
    startedAtMs === undefined ||
    completedAtMs === undefined
  ) {
    return makeHold(
      admissionPacketSha,
      approvalPacketSha,
      receiptChainSha,
      manifestSha,
      errors,
    );
  }

  const service = getPaidDatanetServiceV1(SERVICE_CODE_V1);
  const results: ObjectIntegrityObjectResultV1[] = [];
  const artifacts: PaidDatanetFulfillmentEvidenceArtifactV1[] = [];
  let cumulativeObservedBytes = 0;

  for (const entry of manifest.objects) {
    let result: ObjectIntegrityObjectResultV1;
    try {
      const read = readRegularFileBounded(entry, service.max_total_bytes);
      cumulativeObservedBytes += read.observedBytes;
      if (cumulativeObservedBytes > service.max_total_bytes) {
        throw new Error("observed bytes exceed service bound");
      }
      const observedSha = sha256TextV1(read.bytes);
      const digestMatch = observedSha === entry.expected_sha256;
      const byteMatch = read.observedBytes === entry.expected_byte_length;
      result = {
        object_ref: entry.object_ref,
        path_sha256: sha256TextV1(entry.local_path),
        expected_sha256: entry.expected_sha256,
        observed_sha256: observedSha,
        expected_byte_length: entry.expected_byte_length,
        observed_byte_length: read.observedBytes,
        digest_match: digestMatch,
        byte_length_match: byteMatch,
        verdict: digestMatch && byteMatch ? "MATCH" : "MISMATCH",
      };
    } catch {
      result = {
        object_ref: entry.object_ref,
        path_sha256: sha256TextV1(entry.local_path),
        expected_sha256: entry.expected_sha256,
        observed_sha256: null,
        expected_byte_length: entry.expected_byte_length,
        observed_byte_length: null,
        digest_match: false,
        byte_length_match: false,
        verdict: "SOURCE_UNAVAILABLE",
      };
    }

    const evidenceJson = canonicalJsonV1(result);
    artifacts.push({
      evidence_ref: `oi:${sha256TextV1(entry.object_ref).slice(0, 32)}`,
      evidence_sha256: sha256TextV1(evidenceJson),
      media_type: "application/json",
      byte_length: Buffer.byteLength(evidenceJson, "utf8"),
    });
    results.push(result);
  }

  const matchCount = results.filter((value) => value.verdict === "MATCH").length;
  const mismatchCount = results.filter((value) => value.verdict === "MISMATCH").length;
  const sourceUnavailableCount = results.filter(
    (value) => value.verdict === "SOURCE_UNAVAILABLE",
  ).length;
  const outcome = matchCount === results.length ? "COMPLETED" : "FAILED";
  const outcomeCode =
    outcome === "COMPLETED"
      ? "DELIVERED_AS_QUOTED"
      : sourceUnavailableCount > 0
        ? "SOURCE_UNAVAILABLE"
        : "INTEGRITY_MISMATCH";

  const resultSummary: JsonObject = {
    schema: "void-paid-datanet-object-integrity-result-summary-v1",
    admission_request_id: admission.admission_request_id,
    quote_id: admission.quote_id,
    service_code: SERVICE_CODE_V1,
    requester_id: admission.requester_id,
    object_manifest_sha256: manifestSha,
    object_count: results.length,
    total_observed_bytes: cumulativeObservedBytes,
    match_count: matchCount,
    mismatch_count: mismatchCount,
    source_unavailable_count: sourceUnavailableCount,
    outcome,
    outcome_code: outcomeCode,
    results,
  };
  const resultSummarySha = sha256JsonV1(resultSummary);

  const appended = appendPaidDatanetFulfillmentReceiptV1(
    existingReceipts,
    {
      admission_receipts: admission.admission_receipts,
      admission_receipt_sha256: admission.admission_receipt.receipt_sha256,
      fulfillment_operator_id: operatorId,
      execution_started_at_ms: startedAtMs,
      completed_at_ms: completedAtMs,
      outcome,
      outcome_code: outcomeCode,
      result_summary_sha256: resultSummarySha,
      operator_attestation_sha256: input.operator_attestation_sha256,
      evidence_artifacts: artifacts,
    },
  );

  if (
    !verifyPaidDatanetFulfillmentReceiptsAgainstAdmissionsV1(
      appended,
      admission.admission_receipts,
    )
  ) {
    return makeHold(
      admissionPacketSha,
      approvalPacketSha,
      receiptChainSha,
      manifestSha,
      ["appended fulfillment receipt chain failed verification"],
    );
  }

  const receipt = appended.at(-1);
  if (receipt === undefined) {
    return makeHold(
      admissionPacketSha,
      approvalPacketSha,
      receiptChainSha,
      manifestSha,
      ["fulfillment receipt was not appended"],
    );
  }

  const operatorWorkflowInput: Omit<
    FulfillPaidDatanetOperatorWorkflowV1Input,
    "workflow"
  > = {
    fulfillment_operator_id: operatorId,
    execution_started_at_ms: startedAtMs,
    completed_at_ms: completedAtMs,
    outcome,
    outcome_code: outcomeCode,
    result_summary_sha256: resultSummarySha,
    operator_attestation_sha256: input.operator_attestation_sha256,
    evidence_artifacts: artifacts,
  };
  const operatorWorkflowInputJson = JSON.parse(
    JSON.stringify(operatorWorkflowInput),
  ) as JsonObject;
  const receiptJson = JSON.parse(JSON.stringify(receipt)) as JsonObject;
  const chainJson = JSON.parse(JSON.stringify(appended)) as JsonValue[];
  const artifactsJson = JSON.parse(JSON.stringify(artifacts)) as JsonValue[];
  const fulfillmentId = sha256JsonV1({
    schema: OBJECT_INTEGRITY_FULFILLMENT_SCHEMA_V1,
    admission_decision_packet_sha256: admissionPacketSha,
    admission_decision_id: admission.admission_decision_id,
    approval_packet_sha256: approvalPacketSha,
    approval_id: approval.approval_id,
    object_manifest_sha256: manifestSha,
    result_summary_sha256: resultSummarySha,
    receipt_sha256: receipt.receipt_sha256,
    fulfillment_operator_id: operatorId,
    execution_started_at: startedAt,
    completed_at: completedAt,
    confirmation: OBJECT_INTEGRITY_FULFILLMENT_TOKEN_V1,
  });

  return {
    schema: OBJECT_INTEGRITY_FULFILLMENT_SCHEMA_V1,
    marker: VOID_PAID_DATANET_OBJECT_INTEGRITY_FULFILLMENT_CLI_V1,
    fulfillment_id: fulfillmentId,
    disposition: OBJECT_INTEGRITY_FULFILLMENT_DISPOSITION_V1,
    admission_decision_packet_sha256: admissionPacketSha,
    admission_decision_id: admission.admission_decision_id,
    approval_packet_sha256: approvalPacketSha,
    approval_id: approval.approval_id,
    quote_packet_sha256: approval.quote_packet_sha256,
    quote_id: admission.quote_id,
    admission_request_id: admission.admission_request_id,
    admission_receipt_sha256: admission.admission_receipt.receipt_sha256,
    requester_id: admission.requester_id,
    service_code: SERVICE_CODE_V1,
    quoted_object_count: approval.quote_packet.quote.request.object_count,
    quoted_total_bytes: approval.quote_packet.quote.request.total_bytes,
    object_manifest_sha256: manifestSha,
    fulfillment_operator_id: operatorId,
    execution_started_at: startedAt,
    execution_started_at_ms: startedAtMs,
    completed_at: completedAt,
    completed_at_ms: completedAtMs,
    object_count: results.length,
    total_observed_bytes: cumulativeObservedBytes,
    match_count: matchCount,
    mismatch_count: mismatchCount,
    source_unavailable_count: sourceUnavailableCount,
    outcome,
    outcome_code: outcomeCode,
    result_summary: resultSummary,
    result_summary_sha256: resultSummarySha,
    operator_attestation_sha256: input.operator_attestation_sha256,
    evidence_artifacts: artifactsJson,
    fulfillment_receipt: receiptJson,
    fulfillment_receipt_chain: chainJson,
    receipt_sha256: receipt.receipt_sha256,
    receipt_sequence: receipt.sequence,
    previous_receipt_sha256: receipt.previous_receipt_sha256,
    status: receipt.status,
    operator_workflow_fulfillment_input: operatorWorkflowInputJson,
    actual_admission_decision_contract_consumed: true,
    approved_quote_packet_verified: true,
    admission_and_quote_binding_verified: true,
    quoted_scope_verified: true,
    local_regular_files_read: true,
    symlink_input_rejected: true,
    object_integrity_evidence_created: true,
    fulfillment_receipt_appended: true,
    fulfillment_receipt_chain_verified: true,
    operator_workflow_fulfillment_input_compatible: true,
    explicit_operator_confirmation_required: true,
    operator_triggered_execution: true,
    admission_authorized: true,
    execution_authorized: true,
    execution_performed_by_cli: true,
    automatic_execution_enabled: false,
    network_access_enabled: false,
    filesystem_write_enabled: false,
    payment_collection_enabled: false,
    payment_movement_enabled: false,
    wc_mutation_enabled: false,
    treasury_access_enabled: false,
  };
}

interface ParsedCliArgumentsV1 {
  admissionDecisionPath: string;
  approvalPath: string;
  fulfillmentReceiptsPath: string;
  manifestPath: string;
  operatorId: string;
  startedAt: string;
  completedAt: string;
  attestationSha256: string;
  confirmation: string;
}

function parseCliArgumentsV1(args: readonly string[]): ParsedCliArgumentsV1 {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (key === undefined || value === undefined || !key.startsWith("--")) {
      throw new Error("invalid CLI arguments");
    }
    if (values.has(key)) {
      throw new Error(`duplicate argument: ${key}`);
    }
    values.set(key, value);
  }
  const result = {
    admissionDecisionPath: values.get("--admission-decision"),
    approvalPath: values.get("--approval"),
    fulfillmentReceiptsPath: values.get("--fulfillment-receipts"),
    manifestPath: values.get("--manifest"),
    operatorId: values.get("--operator"),
    startedAt: values.get("--started-at"),
    completedAt: values.get("--completed-at"),
    attestationSha256: values.get("--attestation-sha256"),
    confirmation: values.get("--confirm"),
  };
  if (Object.values(result).some((value) => value === undefined) || values.size !== 9) {
    throw new Error(
      "usage: --admission-decision <path> --approval <path> --fulfillment-receipts <path> --manifest <path> --operator <id> --started-at <ISO> --completed-at <ISO> --attestation-sha256 <sha256> --confirm <token>",
    );
  }
  return result as ParsedCliArgumentsV1;
}

function readJsonFileV1(path: string): JsonValue {
  const absolute = resolve(path);
  const stat = lstatSync(absolute);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error("input JSON path must be a regular non-symlink file");
  }
  if (stat.size < 1 || stat.size > MAX_INPUT_JSON_BYTES) {
    throw new Error("input JSON file size is outside the allowed bound");
  }
  return JSON.parse(readFileSync(absolute, "utf8")) as JsonValue;
}

export function runObjectIntegrityFulfillmentCliV1(
  args: readonly string[],
  readJson: (path: string) => JsonValue = readJsonFileV1,
): CliRunResultV1 {
  try {
    const parsed = parseCliArgumentsV1(args);
    const admission = readJson(parsed.admissionDecisionPath);
    const approval = readJson(parsed.approvalPath);
    const receipts = readJson(parsed.fulfillmentReceiptsPath);
    const manifest = readJson(parsed.manifestPath);
    if (!isJsonObject(admission) || !isJsonObject(approval) || !isJsonObject(manifest)) {
      throw new Error("admission, approval, and manifest inputs must be JSON objects");
    }
    const result = fulfillPaidDatanetObjectIntegrityV1({
      admission_decision_packet: admission,
      approval_packet: approval,
      existing_fulfillment_receipts: receipts,
      object_manifest: manifest,
      fulfillment_operator_id: parsed.operatorId,
      execution_started_at: parsed.startedAt,
      completed_at: parsed.completedAt,
      operator_attestation_sha256: parsed.attestationSha256,
      confirmation: parsed.confirmation,
    });
    return {
      exit_code:
        result.disposition === OBJECT_INTEGRITY_FULFILLMENT_DISPOSITION_V1
          ? 0
          : 2,
      stdout: `${JSON.stringify(result, null, 2)}\n`,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      exit_code: 2,
      stdout: `${JSON.stringify(
        makeHold("0".repeat(64), "0".repeat(64), "0".repeat(64), "0".repeat(64), [message]),
        null,
        2,
      )}\n`,
    };
  }
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  return Boolean(entry) && import.meta.url === pathToFileURL(entry).href;
}

if (isMainModule()) {
  const result = runObjectIntegrityFulfillmentCliV1(process.argv.slice(2));
  process.stdout.write(result.stdout);
  process.exitCode = result.exit_code;
}
