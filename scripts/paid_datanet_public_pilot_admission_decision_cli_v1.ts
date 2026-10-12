#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  PAYMENT_CONFIRMATION_SCHEMA_V1,
  PAYMENT_CONFIRMATION_TOKEN_V1,
  PAYMENT_CONFIRMED_DISPOSITION_V1,
  VOID_PAID_DATANET_PUBLIC_PILOT_PAYMENT_CONFIRMATION_CLI_V1,
} from "./paid_datanet_public_pilot_payment_confirmation_cli_v1.js";
import {
  canonicalJsonV1,
  containsSecretShapedValueV1,
  sha256JsonV1,
  type JsonObject,
  type JsonValue,
} from "./paid_datanet_public_pilot_quote_approval_cli_v1.js";
import {
  PAID_DATANET_ADMISSION_RECEIPT_V1_SCHEMA,
  PAID_DATANET_ADMISSION_REQUEST_V1_SCHEMA,
  PAID_DATANET_REQUEST_ADMISSION_V1_MARKER,
  appendPaidDatanetAdmissionDecisionV1,
  createPaidDatanetAdmissionRequestV1,
  verifyPaidDatanetAdmissionReceiptChainV1,
  verifyPaidDatanetAdmissionRequestV1,
  type PaidDatanetAdmissionDecisionV1,
  type PaidDatanetAdmissionReasonCodeV1,
  type PaidDatanetAdmissionReceiptV1,
  type PaidDatanetAdmissionRequestV1,
  type PaidDatanetCustomerAcceptanceV1,
  type PaidDatanetOpaquePaymentEvidenceV1,
} from "../src/paid_services/datanet_request_admission_v1.js";
import {
  USD_CENTS,
  type PaidDatanetQuoteV1,
} from "../src/paid_services/datanet_service_catalog_v1.js";

export const VOID_PAID_DATANET_PUBLIC_PILOT_ADMISSION_DECISION_CLI_V1 =
  "VOID_PAID_DATANET_PUBLIC_PILOT_ADMISSION_DECISION_CLI_V1";

export const ADMISSION_DECISION_SCHEMA_V1 =
  "void-paid-datanet-public-pilot-admission-decision-v1";

export const ADMISSION_DECISION_TOKEN_V1 =
  "decidePaidDataNetPublicPilotAdmissionV1";

export const ADMISSION_DECISION_RECEIPT_DISPOSITION_V1 =
  "ADMISSION_DECISION_RECEIPT";

export const ADMISSION_DECISION_HOLD_DISPOSITION_V1 =
  "HOLD_FOR_ADMISSION_REVIEW";

const CONFIRMED_PAYMENT_PACKET_SCHEMA_V1 =
  "void-paid-datanet-public-pilot-confirmed-payment-packet-v1";

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u;
const SHA256_HEX = /^[a-f0-9]{64}$/u;
const MAX_TIMESTAMP_MS = 8_000_000_000_000_000;

const REJECTION_REASON_CODES = new Set<PaidDatanetAdmissionReasonCodeV1>([
  "CAPACITY_UNAVAILABLE",
  "PAYMENT_EVIDENCE_REJECTED",
  "POLICY_REJECTED",
  "REQUESTER_CANCELLED",
]);

export interface AdmissionDecisionInputV1 {
  payment_confirmation_packet: JsonObject;
  existing_receipts: JsonValue;
  operator_id: string;
  decision: string;
  reason_code: string;
  decided_at: string;
  confirmation: string;
}

export interface AdmissionDecisionHoldV1 extends JsonObject {
  schema: typeof ADMISSION_DECISION_SCHEMA_V1;
  marker: typeof VOID_PAID_DATANET_PUBLIC_PILOT_ADMISSION_DECISION_CLI_V1;
  disposition: typeof ADMISSION_DECISION_HOLD_DISPOSITION_V1;
  payment_confirmation_packet_sha256: string;
  existing_receipt_chain_sha256: string;
  errors: string[];
  actual_payment_confirmation_contract_required: true;
  canonical_admission_request_required: true;
  existing_receipt_chain_verification_required: true;
  append_only_admission_receipt_required: true;
  duplicate_decision_rejected: true;
  explicit_operator_confirmation_required: true;
  admission_decision_receipt_enabled: false;
  automatic_admission_enabled: false;
  admission_authorized: false;
  execution_authorized: false;
  automatic_execution_enabled: false;
  payment_collection_enabled: false;
  payment_movement_enabled: false;
  github_api_access_enabled: false;
  network_access_enabled: false;
  filesystem_write_enabled: false;
  wc_mutation_enabled: false;
  treasury_access_enabled: false;
}

export interface AdmissionDecisionReadyV1 extends JsonObject {
  schema: typeof ADMISSION_DECISION_SCHEMA_V1;
  marker: typeof VOID_PAID_DATANET_PUBLIC_PILOT_ADMISSION_DECISION_CLI_V1;
  admission_decision_id: string;
  disposition: typeof ADMISSION_DECISION_RECEIPT_DISPOSITION_V1;
  payment_confirmation_packet_sha256: string;
  payment_confirmation_id: string;
  approval_id: string;
  bridge_id: string;
  triage_id: string;
  quote_packet_sha256: string;
  quote_id: string;
  service_code: string;
  requester_id: string;
  quoted_total_cents: number;
  currency: typeof USD_CENTS;
  admission_request_id: string;
  admission_request: JsonObject;
  existing_receipt_chain_sha256: string;
  prior_receipt_count: number;
  operator_id: string;
  decision: PaidDatanetAdmissionDecisionV1;
  reason_code: PaidDatanetAdmissionReasonCodeV1;
  decided_at: string;
  decided_at_ms: number;
  admission_receipt: JsonObject;
  admission_receipt_chain: JsonValue[];
  receipt_sha256: string;
  receipt_sequence: number;
  previous_receipt_sha256: string | null;
  status: "ADMITTED_AWAITING_SEPARATE_EXECUTION" | "REJECTED";
  actual_payment_confirmation_contract_consumed: true;
  payment_confirmation_integrity_verified: true;
  canonical_admission_request_created: true;
  canonical_admission_request_verified: true;
  existing_receipt_chain_verified: true;
  append_only_admission_receipt: true;
  duplicate_decision_rejected: true;
  explicit_operator_confirmation_required: true;
  operator_admission_decision_recorded: true;
  automatic_admission_enabled: false;
  admission_authorized: boolean;
  execution_authorized: false;
  automatic_execution_enabled: false;
  payment_collection_enabled: false;
  payment_movement_enabled: false;
  github_api_access_enabled: false;
  network_access_enabled: false;
  filesystem_write_enabled: false;
  wc_mutation_enabled: false;
  treasury_access_enabled: false;
}

export type AdmissionDecisionResultV1 =
  | AdmissionDecisionHoldV1
  | AdmissionDecisionReadyV1;

export interface CliRunResultV1 {
  exit_code: number;
  stdout: string;
}

interface VerifiedPaymentConfirmationV1 {
  packet: JsonObject;
  payment_confirmation_id: string;
  approval_id: string;
  bridge_id: string;
  triage_id: string;
  quote_packet_sha256: string;
  quote_id: string;
  service_code: string;
  requester_id: string;
  quoted_total_cents: number;
  currency: typeof USD_CENTS;
  admission_request: PaidDatanetAdmissionRequestV1;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && SHA256_HEX.test(value);
}

function isIdentifier(value: unknown): value is string {
  return typeof value === "string" && IDENTIFIER.test(value);
}

function isSafeIntegerInRange(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= minimum &&
    value <= maximum
  );
}

function canonicalIsoTimestamp(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const parsed = new Date(value);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString() !== value
  ) {
    return undefined;
  }

  return value;
}

function pickObject(
  object: JsonObject,
  key: string,
): JsonObject | undefined {
  const value = object[key];
  return isJsonObject(value) ? value : undefined;
}

function pickString(
  object: JsonObject,
  key: string,
): string | undefined {
  const value = object[key];
  return typeof value === "string" ? value : undefined;
}

function pickBoolean(
  object: JsonObject,
  key: string,
): boolean | undefined {
  const value = object[key];
  return typeof value === "boolean" ? value : undefined;
}

function makeHold(
  paymentConfirmationPacketSha256: string,
  existingReceiptChainSha256: string,
  errors: string[],
): AdmissionDecisionHoldV1 {
  return {
    schema: ADMISSION_DECISION_SCHEMA_V1,
    marker: VOID_PAID_DATANET_PUBLIC_PILOT_ADMISSION_DECISION_CLI_V1,
    disposition: ADMISSION_DECISION_HOLD_DISPOSITION_V1,
    payment_confirmation_packet_sha256: paymentConfirmationPacketSha256,
    existing_receipt_chain_sha256: existingReceiptChainSha256,
    errors: [...new Set(errors)].sort((left, right) =>
      left.localeCompare(right),
    ),
    actual_payment_confirmation_contract_required: true,
    canonical_admission_request_required: true,
    existing_receipt_chain_verification_required: true,
    append_only_admission_receipt_required: true,
    duplicate_decision_rejected: true,
    explicit_operator_confirmation_required: true,
    admission_decision_receipt_enabled: false,
    automatic_admission_enabled: false,
    admission_authorized: false,
    execution_authorized: false,
    automatic_execution_enabled: false,
    payment_collection_enabled: false,
    payment_movement_enabled: false,
    github_api_access_enabled: false,
    network_access_enabled: false,
    filesystem_write_enabled: false,
    wc_mutation_enabled: false,
    treasury_access_enabled: false,
  };
}

function asAdmissionReceipts(
  value: JsonValue,
  errors: string[],
): readonly PaidDatanetAdmissionReceiptV1[] | undefined {
  if (!Array.isArray(value)) {
    errors.push("existing_receipts must be a JSON array");
    return undefined;
  }

  if (value.some((entry) => !isJsonObject(entry))) {
    errors.push("existing_receipts entries must be JSON objects");
    return undefined;
  }

  const receipts =
    value as unknown as readonly PaidDatanetAdmissionReceiptV1[];

  if (!verifyPaidDatanetAdmissionReceiptChainV1(receipts)) {
    errors.push("existing admission receipt chain is invalid");
    return undefined;
  }

  return receipts;
}

function verifyPaymentConfirmationPacket(
  packet: JsonObject,
  errors: string[],
): VerifiedPaymentConfirmationV1 | undefined {
  if (packet.schema !== PAYMENT_CONFIRMATION_SCHEMA_V1) {
    errors.push("payment confirmation schema mismatch");
  }
  if (
    packet.marker !==
    VOID_PAID_DATANET_PUBLIC_PILOT_PAYMENT_CONFIRMATION_CLI_V1
  ) {
    errors.push("payment confirmation marker mismatch");
  }
  if (packet.disposition !== PAYMENT_CONFIRMED_DISPOSITION_V1) {
    errors.push("payment confirmation disposition mismatch");
  }

  const paymentConfirmationId = pickString(
    packet,
    "payment_confirmation_id",
  );
  const approvalId = pickString(packet, "approval_id");
  const bridgeId = pickString(packet, "bridge_id");
  const triageId = pickString(packet, "triage_id");
  const quotePacketSha256 = pickString(packet, "quote_packet_sha256");
  const quoteId = pickString(packet, "quote_id");
  const serviceCode = pickString(packet, "service_code");
  const requesterId = pickString(packet, "requester_id");
  const approvalPacketSha256 = pickString(
    packet,
    "approval_packet_sha256",
  );
  const paymentEvidencePacketSha256 = pickString(
    packet,
    "payment_evidence_packet_sha256",
  );
  const confirmerDisplayName = pickString(
    packet,
    "confirmer_display_name",
  );
  const confirmedAt = canonicalIsoTimestamp(packet.confirmed_at);
  const quotedTotalCents = packet.quoted_total_cents;
  const currency = packet.currency;

  for (const [name, value] of [
    ["payment_confirmation_id", paymentConfirmationId],
    ["approval_id", approvalId],
    ["bridge_id", bridgeId],
    ["triage_id", triageId],
    ["quote_packet_sha256", quotePacketSha256],
    ["quote_id", quoteId],
    ["approval_packet_sha256", approvalPacketSha256],
    ["payment_evidence_packet_sha256", paymentEvidencePacketSha256],
  ] as const) {
    if (!isSha256(value)) {
      errors.push(`${name} must be lowercase SHA-256 hex`);
    }
  }

  if (!isIdentifier(serviceCode)) {
    errors.push("service_code must be a bounded identifier");
  }
  if (!isIdentifier(requesterId)) {
    errors.push("requester_id must be a bounded identifier");
  }
  if (
    typeof confirmerDisplayName !== "string" ||
    confirmerDisplayName.trim().length < 2 ||
    confirmerDisplayName.trim().length > 120
  ) {
    errors.push("confirmer_display_name is missing or invalid");
  }
  if (confirmedAt === undefined) {
    errors.push("confirmed_at must be canonical ISO-8601 UTC");
  }
  if (
    !isSafeIntegerInRange(
      quotedTotalCents,
      0,
      100_000_000_000,
    )
  ) {
    errors.push("quoted_total_cents is missing or invalid");
  }
  if (currency !== USD_CENTS) {
    errors.push("payment confirmation currency mismatch");
  }

  const admissionInput = pickObject(
    packet,
    "admission_request_input",
  );
  const confirmedPaymentPacket = pickObject(
    packet,
    "confirmed_payment_packet",
  );

  if (admissionInput === undefined) {
    errors.push("admission_request_input is missing or invalid");
  }
  if (confirmedPaymentPacket === undefined) {
    errors.push("confirmed_payment_packet is missing or invalid");
  }

  if (
    paymentConfirmationId === undefined ||
    approvalId === undefined ||
    bridgeId === undefined ||
    triageId === undefined ||
    quotePacketSha256 === undefined ||
    quoteId === undefined ||
    serviceCode === undefined ||
    requesterId === undefined ||
    approvalPacketSha256 === undefined ||
    paymentEvidencePacketSha256 === undefined ||
    confirmerDisplayName === undefined ||
    confirmedAt === undefined ||
    !isSafeIntegerInRange(
      quotedTotalCents,
      0,
      100_000_000_000,
    ) ||
    currency !== USD_CENTS ||
    admissionInput === undefined ||
    confirmedPaymentPacket === undefined
  ) {
    return undefined;
  }

  const quote = pickObject(admissionInput, "quote");
  const customerAcceptance = pickObject(
    admissionInput,
    "customer_acceptance",
  );
  const paymentEvidence = pickObject(
    admissionInput,
    "payment_evidence",
  );
  const submittedAtMs = admissionInput.submitted_at_ms;

  if (quote === undefined) {
    errors.push("admission_request_input.quote is missing or invalid");
  }
  if (customerAcceptance === undefined) {
    errors.push(
      "admission_request_input.customer_acceptance is missing or invalid",
    );
  }
  if (paymentEvidence === undefined) {
    errors.push(
      "admission_request_input.payment_evidence is missing or invalid",
    );
  }
  if (
    !isSafeIntegerInRange(
      submittedAtMs,
      0,
      MAX_TIMESTAMP_MS,
    )
  ) {
    errors.push(
      "admission_request_input.submitted_at_ms is missing or invalid",
    );
  }

  if (
    quote === undefined ||
    customerAcceptance === undefined ||
    paymentEvidence === undefined ||
    !isSafeIntegerInRange(
      submittedAtMs,
      0,
      MAX_TIMESTAMP_MS,
    )
  ) {
    return undefined;
  }

  let admissionRequest: PaidDatanetAdmissionRequestV1;

  try {
    admissionRequest = createPaidDatanetAdmissionRequestV1({
      quote: quote as unknown as PaidDatanetQuoteV1,
      customer_acceptance:
        customerAcceptance as unknown as PaidDatanetCustomerAcceptanceV1,
      payment_evidence:
        paymentEvidence as unknown as PaidDatanetOpaquePaymentEvidenceV1,
      submitted_at_ms: submittedAtMs,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`canonical admission request creation failed: ${message}`);
    return undefined;
  }

  if (!verifyPaidDatanetAdmissionRequestV1(admissionRequest)) {
    errors.push("canonical admission request integrity check failed");
  }

  const expectedPaymentConfirmationId = sha256JsonV1({
    schema: PAYMENT_CONFIRMATION_SCHEMA_V1,
    approval_packet_sha256: approvalPacketSha256,
    approval_id: approvalId,
    quote_packet_sha256: quotePacketSha256,
    quote_id: quoteId,
    payment_evidence_packet_sha256: paymentEvidencePacketSha256,
    customer_acceptance: customerAcceptance,
    payment_evidence: paymentEvidence,
    confirmer_display_name: confirmerDisplayName,
    confirmed_at: confirmedAt,
    confirmation: PAYMENT_CONFIRMATION_TOKEN_V1,
  });

  if (expectedPaymentConfirmationId !== paymentConfirmationId) {
    errors.push("payment_confirmation_id integrity check failed");
  }

  const confirmedAtMs = new Date(confirmedAt).getTime();
  if (submittedAtMs !== confirmedAtMs) {
    errors.push(
      "admission_request_input.submitted_at_ms does not match confirmed_at",
    );
  }

  const requiredTrue = [
    "confirmation_token_verified",
    "payment_verified",
    "exact_amount_and_currency_verified",
    "approval_source_chain_verified",
    "quote_packet_verified",
    "admission_request_compatible",
    "operator_admission_decision_required",
  ] as const;

  for (const field of requiredTrue) {
    if (pickBoolean(packet, field) !== true) {
      errors.push(`payment confirmation ${field} must be true`);
    }
  }

  const requiredFalse = [
    "payment_collection_enabled",
    "payment_movement_enabled",
    "wallet_access_enabled",
    "private_key_input_allowed",
    "admission_authorized",
    "execution_authorized",
    "automatic_execution_enabled",
    "github_api_access_enabled",
    "network_access_enabled",
    "filesystem_write_enabled",
    "wc_mutation_enabled",
    "treasury_access_enabled",
  ] as const;

  for (const field of requiredFalse) {
    if (pickBoolean(packet, field) !== false) {
      errors.push(`payment confirmation ${field} must be false`);
    }
  }

  if (
    admissionRequest.quote.quote_id !== quoteId ||
    admissionRequest.quote.service_code !== serviceCode ||
    admissionRequest.quote.requester_id !== requesterId ||
    admissionRequest.quote.quoted_total_cents !== quotedTotalCents ||
    admissionRequest.quote.currency !== currency
  ) {
    errors.push("payment confirmation admission-request binding mismatch");
  }

  const confirmedRequired = {
    schema: CONFIRMED_PAYMENT_PACKET_SCHEMA_V1,
    payment_status: "PAYMENT_CONFIRMED_AWAITING_OPERATOR_ADMISSION",
    approval_id: approvalId,
    bridge_id: bridgeId,
    triage_id: triageId,
    quote_packet_sha256: quotePacketSha256,
    quote_id: quoteId,
    service_code: serviceCode,
    requester_id: requesterId,
    quoted_total_cents: quotedTotalCents,
    currency,
    payment_verified: true,
    admission_request_compatible: true,
    operator_admission_decision_required: true,
    admission_authorized: false,
    execution_authorized: false,
    payment_collection_enabled: false,
    payment_movement_enabled: false,
    wallet_access_enabled: false,
    private_key_input_allowed: false,
  } satisfies Record<string, JsonValue>;

  for (const [field, expected] of Object.entries(confirmedRequired)) {
    if (
      canonicalJsonV1(confirmedPaymentPacket[field]) !==
      canonicalJsonV1(expected)
    ) {
      errors.push(`confirmed_payment_packet ${field} mismatch`);
    }
  }

  const nestedAdmissionInput = pickObject(
    confirmedPaymentPacket,
    "admission_request_input",
  );

  if (
    nestedAdmissionInput === undefined ||
    canonicalJsonV1(nestedAdmissionInput) !== canonicalJsonV1(admissionInput)
  ) {
    errors.push("confirmed payment packet admission input mismatch");
  }

  return {
    packet,
    payment_confirmation_id: paymentConfirmationId,
    approval_id: approvalId,
    bridge_id: bridgeId,
    triage_id: triageId,
    quote_packet_sha256: quotePacketSha256,
    quote_id: quoteId,
    service_code: serviceCode,
    requester_id: requesterId,
    quoted_total_cents: quotedTotalCents,
    currency,
    admission_request: admissionRequest,
  };
}

function normalizeDecision(
  value: string,
  errors: string[],
): PaidDatanetAdmissionDecisionV1 | undefined {
  if (value === "APPROVE" || value === "REJECT") {
    return value;
  }

  errors.push("decision must equal APPROVE or REJECT");
  return undefined;
}

function normalizeReasonCode(
  value: string,
  decision: PaidDatanetAdmissionDecisionV1 | undefined,
  errors: string[],
): PaidDatanetAdmissionReasonCodeV1 | undefined {
  if (decision === "APPROVE") {
    if (value !== "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE") {
      errors.push(
        "APPROVE requires PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE",
      );
      return undefined;
    }
    return value;
  }

  if (decision === "REJECT") {
    if (
      !REJECTION_REASON_CODES.has(
        value as PaidDatanetAdmissionReasonCodeV1,
      )
    ) {
      errors.push("REJECT requires a canonical rejection reason");
      return undefined;
    }
    return value as PaidDatanetAdmissionReasonCodeV1;
  }

  return undefined;
}

export function decidePublicPilotAdmissionV1(
  input: AdmissionDecisionInputV1,
): AdmissionDecisionResultV1 {
  const paymentPacket = input.payment_confirmation_packet;
  const existingReceiptsValue = input.existing_receipts;
  const paymentPacketSha256 = sha256JsonV1(paymentPacket);
  const existingReceiptChainSha256 = sha256JsonV1(existingReceiptsValue);
  const errors: string[] = [];

  if (containsSecretShapedValueV1(paymentPacket)) {
    errors.push(
      "payment confirmation packet contains a secret-shaped value",
    );
  }
  if (containsSecretShapedValueV1(existingReceiptsValue)) {
    errors.push("existing receipt chain contains a secret-shaped value");
  }

  const payment = verifyPaymentConfirmationPacket(
    paymentPacket,
    errors,
  );
  const existingReceipts = asAdmissionReceipts(
    existingReceiptsValue,
    errors,
  );

  const operatorId = input.operator_id;
  if (!isIdentifier(operatorId)) {
    errors.push("operator_id must be a bounded identifier");
  }

  const decision = normalizeDecision(input.decision, errors);
  const reasonCode = normalizeReasonCode(
    input.reason_code,
    decision,
    errors,
  );

  const decidedAt = canonicalIsoTimestamp(input.decided_at);
  if (decidedAt === undefined) {
    errors.push("decided_at must be canonical ISO-8601 UTC");
  }
  const decidedAtMs =
    decidedAt === undefined ? undefined : new Date(decidedAt).getTime();

  if (
    decidedAtMs !== undefined &&
    payment !== undefined &&
    decidedAtMs < payment.admission_request.submitted_at_ms
  ) {
    errors.push("decided_at must not precede admission submission");
  }

  if (input.confirmation !== ADMISSION_DECISION_TOKEN_V1) {
    errors.push(`confirmation must equal ${ADMISSION_DECISION_TOKEN_V1}`);
  }

  if (
    errors.length > 0 ||
    payment === undefined ||
    existingReceipts === undefined ||
    !isIdentifier(operatorId) ||
    decision === undefined ||
    reasonCode === undefined ||
    decidedAt === undefined ||
    decidedAtMs === undefined
  ) {
    return makeHold(
      paymentPacketSha256,
      existingReceiptChainSha256,
      errors,
    );
  }

  let appended: readonly PaidDatanetAdmissionReceiptV1[];

  try {
    appended = appendPaidDatanetAdmissionDecisionV1(
      existingReceipts,
      {
        admission_request: payment.admission_request,
        operator_id: operatorId,
        decision,
        reason_code: reasonCode,
        decided_at_ms: decidedAtMs,
      },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return makeHold(
      paymentPacketSha256,
      existingReceiptChainSha256,
      [`admission decision rejected: ${message}`],
    );
  }

  if (!verifyPaidDatanetAdmissionReceiptChainV1(appended)) {
    return makeHold(
      paymentPacketSha256,
      existingReceiptChainSha256,
      ["appended admission receipt chain failed integrity verification"],
    );
  }

  const receipt = appended.at(-1);

  if (receipt === undefined) {
    return makeHold(
      paymentPacketSha256,
      existingReceiptChainSha256,
      ["admission receipt was not appended"],
    );
  }

  const receiptJson = JSON.parse(
    JSON.stringify(receipt),
  ) as JsonObject;
  const requestJson = JSON.parse(
    JSON.stringify(payment.admission_request),
  ) as JsonObject;
  const chainJson = JSON.parse(
    JSON.stringify(appended),
  ) as JsonValue[];

  const admissionDecisionId = sha256JsonV1({
    schema: ADMISSION_DECISION_SCHEMA_V1,
    payment_confirmation_packet_sha256: paymentPacketSha256,
    payment_confirmation_id: payment.payment_confirmation_id,
    admission_request_id:
      payment.admission_request.admission_request_id,
    receipt_sha256: receipt.receipt_sha256,
    operator_id: operatorId,
    decision,
    reason_code: reasonCode,
    decided_at: decidedAt,
    confirmation: ADMISSION_DECISION_TOKEN_V1,
  });

  return {
    schema: ADMISSION_DECISION_SCHEMA_V1,
    marker: VOID_PAID_DATANET_PUBLIC_PILOT_ADMISSION_DECISION_CLI_V1,
    admission_decision_id: admissionDecisionId,
    disposition: ADMISSION_DECISION_RECEIPT_DISPOSITION_V1,
    payment_confirmation_packet_sha256: paymentPacketSha256,
    payment_confirmation_id: payment.payment_confirmation_id,
    approval_id: payment.approval_id,
    bridge_id: payment.bridge_id,
    triage_id: payment.triage_id,
    quote_packet_sha256: payment.quote_packet_sha256,
    quote_id: payment.quote_id,
    service_code: payment.service_code,
    requester_id: payment.requester_id,
    quoted_total_cents: payment.quoted_total_cents,
    currency: payment.currency,
    admission_request_id:
      payment.admission_request.admission_request_id,
    admission_request: requestJson,
    existing_receipt_chain_sha256: existingReceiptChainSha256,
    prior_receipt_count: existingReceipts.length,
    operator_id: operatorId,
    decision,
    reason_code: reasonCode,
    decided_at: decidedAt,
    decided_at_ms: decidedAtMs,
    admission_receipt: receiptJson,
    admission_receipt_chain: chainJson,
    receipt_sha256: receipt.receipt_sha256,
    receipt_sequence: receipt.sequence,
    previous_receipt_sha256: receipt.previous_receipt_sha256,
    status: receipt.status,
    actual_payment_confirmation_contract_consumed: true,
    payment_confirmation_integrity_verified: true,
    canonical_admission_request_created: true,
    canonical_admission_request_verified: true,
    existing_receipt_chain_verified: true,
    append_only_admission_receipt: true,
    duplicate_decision_rejected: true,
    explicit_operator_confirmation_required: true,
    operator_admission_decision_recorded: true,
    automatic_admission_enabled: false,
    admission_authorized: receipt.decision === "APPROVE",
    execution_authorized: false,
    automatic_execution_enabled: false,
    payment_collection_enabled: false,
    payment_movement_enabled: false,
    github_api_access_enabled: false,
    network_access_enabled: false,
    filesystem_write_enabled: false,
    wc_mutation_enabled: false,
    treasury_access_enabled: false,
  };
}

interface ParsedCliArgumentsV1 {
  paymentConfirmationPath: string;
  receiptsPath: string;
  operatorId: string;
  decision: string;
  reasonCode: string;
  decidedAt: string;
  confirmation: string;
}

function parseCliArgumentsV1(args: readonly string[]): ParsedCliArgumentsV1 {
  const values = new Map<string, string>();

  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];

    if (key === undefined || value === undefined || !key.startsWith("--")) {
      throw new Error(
        "usage: --payment-confirmation <path> --receipts <path> --operator <id> --decision <APPROVE|REJECT> --reason <code> --decided-at <ISO> --confirm <token>",
      );
    }

    if (values.has(key)) {
      throw new Error(`duplicate argument: ${key}`);
    }

    values.set(key, value);
  }

  const paymentConfirmationPath = values.get("--payment-confirmation");
  const receiptsPath = values.get("--receipts");
  const operatorId = values.get("--operator");
  const decision = values.get("--decision");
  const reasonCode = values.get("--reason");
  const decidedAt = values.get("--decided-at");
  const confirmation = values.get("--confirm");

  if (
    paymentConfirmationPath === undefined ||
    receiptsPath === undefined ||
    operatorId === undefined ||
    decision === undefined ||
    reasonCode === undefined ||
    decidedAt === undefined ||
    confirmation === undefined ||
    values.size !== 7
  ) {
    throw new Error(
      "usage: --payment-confirmation <path> --receipts <path> --operator <id> --decision <APPROVE|REJECT> --reason <code> --decided-at <ISO> --confirm <token>",
    );
  }

  return {
    paymentConfirmationPath,
    receiptsPath,
    operatorId,
    decision,
    reasonCode,
    decidedAt,
    confirmation,
  };
}

export function runAdmissionDecisionCliV1(
  args: readonly string[],
  readText: (path: string) => string,
): CliRunResultV1 {
  try {
    const parsed = parseCliArgumentsV1(args);
    const paymentDecoded: unknown = JSON.parse(
      readText(parsed.paymentConfirmationPath),
    );
    const receiptsDecoded: unknown = JSON.parse(
      readText(parsed.receiptsPath),
    );

    if (!isJsonObject(paymentDecoded)) {
      throw new Error("payment confirmation JSON must be an object");
    }

    const result = decidePublicPilotAdmissionV1({
      payment_confirmation_packet: paymentDecoded,
      existing_receipts: receiptsDecoded as JsonValue,
      operator_id: parsed.operatorId,
      decision: parsed.decision,
      reason_code: parsed.reasonCode,
      decided_at: parsed.decidedAt,
      confirmation: parsed.confirmation,
    });

    return {
      exit_code:
        result.disposition ===
        ADMISSION_DECISION_RECEIPT_DISPOSITION_V1
          ? 0
          : 2,
      stdout: `${JSON.stringify(result, null, 2)}\n`,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const failure: AdmissionDecisionHoldV1 = makeHold(
      sha256JsonV1({}),
      sha256JsonV1([]),
      [message],
    );

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
  const result = runAdmissionDecisionCliV1(
    process.argv.slice(2),
    (path) => readFileSync(path, "utf8"),
  );

  process.stdout.write(result.stdout);
  process.exitCode = result.exit_code;
}
