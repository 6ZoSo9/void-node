#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  APPROVAL_CONFIRMATION_TOKEN_V1,
  APPROVAL_SCHEMA_V1,
  APPROVED_DISPOSITION_V1,
  VOID_PAID_DATANET_PUBLIC_PILOT_QUOTE_APPROVAL_CLI_V1,
  canonicalJsonV1,
  containsSecretShapedValueV1,
  sha256JsonV1,
  type JsonObject,
  type JsonValue,
} from "./paid_datanet_public_pilot_quote_approval_cli_v1.js";
import {
  PAID_DATANET_QUOTE_PACKET_V1_MARKER,
  PAID_DATANET_QUOTE_PACKET_V1_SCHEMA,
  verifyPaidDatanetQuotePacketV1,
  type PaidDatanetQuotePacketV1,
} from "./paid_datanet_quote_packet_v1.js";
import {
  createPaidDatanetAdmissionRequestV1,
  verifyPaidDatanetAdmissionRequestV1,
  type PaidDatanetCustomerAcceptanceV1,
  type PaidDatanetOpaquePaymentEvidenceV1,
} from "../src/paid_services/datanet_request_admission_v1.js";
import { USD_CENTS } from "../src/paid_services/datanet_service_catalog_v1.js";

export const VOID_PAID_DATANET_PUBLIC_PILOT_PAYMENT_CONFIRMATION_CLI_V1 =
  "VOID_PAID_DATANET_PUBLIC_PILOT_PAYMENT_CONFIRMATION_CLI_V1";

export const PAYMENT_CONFIRMATION_SCHEMA_V1 =
  "void-paid-datanet-public-pilot-payment-confirmation-v1";

export const PAYMENT_EVIDENCE_SCHEMA_V1 =
  "void-paid-datanet-public-pilot-payment-evidence-v1";

export const PAYMENT_CONFIRMATION_TOKEN_V1 =
  "confirmPaidDataNetPublicPilotPaymentV1";

export const PAYMENT_CONFIRMED_DISPOSITION_V1 =
  "PAYMENT_CONFIRMED_PACKET";

export const PAYMENT_HOLD_DISPOSITION_V1 =
  "HOLD_FOR_PAYMENT_REVIEW";

const CONFIRMED_PAYMENT_PACKET_SCHEMA_V1 =
  "void-paid-datanet-public-pilot-confirmed-payment-packet-v1";

const APPROVED_CUSTOMER_QUOTE_SCHEMA_V1 =
  "void-paid-datanet-public-pilot-approved-customer-quote-v1";

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u;
const SHA256_HEX = /^[a-f0-9]{64}$/u;
const MAX_TIMESTAMP_MS = 8_000_000_000_000_000;
const MAX_MONEY_CENTS = 100_000_000_000;

export interface PaymentEvidenceInputV1 extends JsonObject {
  schema: typeof PAYMENT_EVIDENCE_SCHEMA_V1;
  settlement_rail: string;
  settlement_reference: string;
  settlement_evidence_sha256: string;
  verifier_id: string;
  verification_status: "VERIFIED";
  amount_cents: number;
  currency: typeof USD_CENTS;
  observed_at_ms: number;
}

export interface PaymentConfirmationInputV1 {
  approval_packet: JsonObject;
  payment_evidence: JsonObject;
  customer_accepted_at_ms: number;
  confirmer_display_name: string;
  confirmed_at: string;
  confirmation: string;
}

export interface PaymentConfirmationHoldV1 extends JsonObject {
  schema: typeof PAYMENT_CONFIRMATION_SCHEMA_V1;
  marker: typeof VOID_PAID_DATANET_PUBLIC_PILOT_PAYMENT_CONFIRMATION_CLI_V1;
  disposition: typeof PAYMENT_HOLD_DISPOSITION_V1;
  approval_packet_sha256: string;
  payment_evidence_packet_sha256: string;
  errors: string[];
  approved_quote_packet_required: true;
  non_secret_payment_evidence_required: true;
  exact_amount_and_currency_required: true;
  explicit_operator_confirmation_required: true;
  payment_confirmation_packet_enabled: false;
  admission_request_compatible: false;
  payment_collection_enabled: false;
  payment_movement_enabled: false;
  wallet_access_enabled: false;
  private_key_input_allowed: false;
  admission_authorized: false;
  execution_authorized: false;
  automatic_execution_enabled: false;
  github_api_access_enabled: false;
  network_access_enabled: false;
  filesystem_write_enabled: false;
  wc_mutation_enabled: false;
  treasury_access_enabled: false;
}

export interface PaymentConfirmationReadyV1 extends JsonObject {
  schema: typeof PAYMENT_CONFIRMATION_SCHEMA_V1;
  marker: typeof VOID_PAID_DATANET_PUBLIC_PILOT_PAYMENT_CONFIRMATION_CLI_V1;
  payment_confirmation_id: string;
  disposition: typeof PAYMENT_CONFIRMED_DISPOSITION_V1;
  approval_packet_sha256: string;
  approval_id: string;
  bridge_packet_sha256: string;
  bridge_id: string;
  triage_packet_sha256: string;
  triage_id: string;
  draft_quote_input_sha256: string;
  quote_packet_sha256: string;
  quote_id: string;
  service_code: string;
  requester_id: string;
  customer_reference: string;
  quoted_total_cents: number;
  currency: typeof USD_CENTS;
  payment_evidence_packet_sha256: string;
  settlement_rail: string;
  settlement_reference: string;
  settlement_evidence_sha256: string;
  verifier_id: string;
  observed_at_ms: number;
  customer_accepted_at_ms: number;
  confirmer_display_name: string;
  confirmed_at: string;
  confirmation_token_verified: true;
  payment_verified: true;
  exact_amount_and_currency_verified: true;
  approval_source_chain_verified: true;
  quote_packet_verified: true;
  admission_request_compatible: true;
  admission_request_input: JsonObject;
  confirmed_payment_packet: JsonObject;
  operator_admission_decision_required: true;
  payment_collection_enabled: false;
  payment_movement_enabled: false;
  wallet_access_enabled: false;
  private_key_input_allowed: false;
  admission_authorized: false;
  execution_authorized: false;
  automatic_execution_enabled: false;
  github_api_access_enabled: false;
  network_access_enabled: false;
  filesystem_write_enabled: false;
  wc_mutation_enabled: false;
  treasury_access_enabled: false;
}

export type PaymentConfirmationResultV1 =
  | PaymentConfirmationHoldV1
  | PaymentConfirmationReadyV1;

export interface CliRunResultV1 {
  exit_code: number;
  stdout: string;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/gu, " ");
}

function validateDisplayName(value: string): string | undefined {
  const normalized = normalizeWhitespace(value);

  if (normalized.length < 3 || normalized.length > 120) {
    return undefined;
  }

  if (/[@<>\u0000-\u001f\u007f]/u.test(normalized)) {
    return undefined;
  }

  return normalized;
}

function canonicalIsoTimestamp(value: string): string | undefined {
  const trimmed = value.trim();
  const parsed = new Date(trimmed);

  if (!Number.isFinite(parsed.getTime())) {
    return undefined;
  }

  const normalized = parsed.toISOString();
  return normalized === trimmed ? normalized : undefined;
}

function isSafeIntegerInRange(
  value: number | undefined,
  minimum: number,
  maximum: number,
): value is number {
  return (
    value !== undefined &&
    Number.isSafeInteger(value) &&
    value >= minimum &&
    value <= maximum
  );
}

function approvalBodyForId(
  approval: JsonObject,
): JsonObject | undefined {
  const bridgePacketSha256 = pickString(approval, ["bridge_packet_sha256"]);
  const bridgeId = pickString(approval, ["bridge_id"]);
  const triagePacketSha256 = pickString(approval, ["triage_packet_sha256"]);
  const triageId = pickString(approval, ["triage_id"]);
  const draftQuoteInputSha256 = pickString(approval, [
    "draft_quote_input_sha256",
  ]);
  const quotePacketSha256 = pickString(approval, ["quote_packet_sha256"]);
  const approverDisplayName = pickString(approval, ["approver_display_name"]);
  const approvedAt = pickString(approval, ["approved_at"]);

  if (
    bridgePacketSha256 === undefined ||
    bridgeId === undefined ||
    triagePacketSha256 === undefined ||
    triageId === undefined ||
    draftQuoteInputSha256 === undefined ||
    quotePacketSha256 === undefined ||
    approverDisplayName === undefined ||
    approvedAt === undefined
  ) {
    return undefined;
  }

  return {
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
  };
}

interface VerifiedApprovalV1 {
  approval_id: string;
  bridge_packet_sha256: string;
  bridge_id: string;
  triage_packet_sha256: string;
  triage_id: string;
  draft_quote_input_sha256: string;
  quote_packet_sha256: string;
  approved_at: string;
  approved_at_ms: number;
  quote_packet: PaidDatanetQuotePacketV1;
}

function verifyApprovalPacket(
  approval: JsonObject,
  errors: string[],
): VerifiedApprovalV1 | undefined {
  if (approval.schema !== APPROVAL_SCHEMA_V1) {
    errors.push(`approval packet schema must be ${APPROVAL_SCHEMA_V1}`);
  }
  if (
    approval.marker !==
    VOID_PAID_DATANET_PUBLIC_PILOT_QUOTE_APPROVAL_CLI_V1
  ) {
    errors.push(
      `approval packet marker must be ${VOID_PAID_DATANET_PUBLIC_PILOT_QUOTE_APPROVAL_CLI_V1}`,
    );
  }
  if (approval.disposition !== APPROVED_DISPOSITION_V1) {
    errors.push(`approval packet disposition must be ${APPROVED_DISPOSITION_V1}`);
  }

  const approvalId = pickString(approval, ["approval_id"]);
  const bridgePacketSha256 = pickString(approval, ["bridge_packet_sha256"]);
  const bridgeId = pickString(approval, ["bridge_id"]);
  const triagePacketSha256 = pickString(approval, ["triage_packet_sha256"]);
  const triageId = pickString(approval, ["triage_id"]);
  const draftQuoteInputSha256 = pickString(approval, [
    "draft_quote_input_sha256",
  ]);
  const quotePacketSha256 = pickString(approval, ["quote_packet_sha256"]);
  const approvedAt = pickString(approval, ["approved_at"]);

  for (const [label, value] of [
    ["approval_id", approvalId],
    ["bridge_packet_sha256", bridgePacketSha256],
    ["bridge_id", bridgeId],
    ["triage_packet_sha256", triagePacketSha256],
    ["triage_id", triageId],
    ["draft_quote_input_sha256", draftQuoteInputSha256],
    ["quote_packet_sha256", quotePacketSha256],
  ] as const) {
    if (value === undefined || !SHA256_HEX.test(value)) {
      errors.push(`approval packet ${label} must be lowercase SHA-256 hex`);
    }
  }

  const approvedAtCanonical =
    approvedAt === undefined ? undefined : canonicalIsoTimestamp(approvedAt);
  if (approvedAtCanonical === undefined) {
    errors.push("approval packet approved_at must be canonical ISO-8601 UTC");
  }

  const approvalBody = approvalBodyForId(approval);
  if (
    approvalId !== undefined &&
    approvalBody !== undefined &&
    sha256JsonV1(approvalBody) !== approvalId
  ) {
    errors.push("approval packet approval_id does not match packet content");
  }

  if (pickBoolean(approval, ["confirmation_token_verified"]) !== true) {
    errors.push("approval packet confirmation_token_verified must be true");
  }
  if (pickBoolean(approval, ["quote_packet_verified"]) !== true) {
    errors.push("approval packet quote_packet_verified must be true");
  }
  if (pickBoolean(approval, ["customer_payment_required"]) !== true) {
    errors.push("approval packet customer_payment_required must be true");
  }

  for (const field of [
    "payment_collection_enabled",
    "admission_authorized",
    "execution_authorized",
    "automatic_execution_enabled",
    "github_api_access_enabled",
    "network_access_enabled",
    "filesystem_write_enabled",
    "wc_mutation_enabled",
    "treasury_access_enabled",
  ]) {
    if (pickBoolean(approval, [field]) !== false) {
      errors.push(`approval packet ${field} must be false`);
    }
  }

  const wrapper = pickObject(approval, ["approved_quote_packet"]);
  if (wrapper === undefined) {
    errors.push("approval packet approved_quote_packet is missing");
    return undefined;
  }

  if (wrapper.schema !== APPROVED_CUSTOMER_QUOTE_SCHEMA_V1) {
    errors.push(
      `approved_quote_packet schema must be ${APPROVED_CUSTOMER_QUOTE_SCHEMA_V1}`,
    );
  }
  if (wrapper.quote_status !== "APPROVED_AWAITING_CUSTOMER_PAYMENT") {
    errors.push(
      "approved_quote_packet quote_status must be APPROVED_AWAITING_CUSTOMER_PAYMENT",
    );
  }

  for (const [field, expected] of [
    ["bridge_packet_sha256", bridgePacketSha256],
    ["bridge_id", bridgeId],
    ["triage_packet_sha256", triagePacketSha256],
    ["triage_id", triageId],
    ["draft_quote_input_sha256", draftQuoteInputSha256],
    ["quote_packet_sha256", quotePacketSha256],
    ["approved_at", approvedAt],
  ] as const) {
    if (pickString(wrapper, [field]) !== expected) {
      errors.push(`approved_quote_packet ${field} must match approval packet`);
    }
  }

  if (
    pickString(wrapper, ["approver_display_name"]) !==
    pickString(approval, ["approver_display_name"])
  ) {
    errors.push(
      "approved_quote_packet approver_display_name must match approval packet",
    );
  }

  for (const field of [
    "confirmation_token_verified",
    "quote_packet_verified",
    "customer_payment_required",
  ]) {
    if (pickBoolean(wrapper, [field]) !== true) {
      errors.push(`approved_quote_packet ${field} must be true`);
    }
  }

  for (const field of [
    "payment_collection_enabled",
    "admission_authorized",
    "execution_authorized",
    "automatic_execution_enabled",
    "wc_mutation_enabled",
    "treasury_access_enabled",
  ]) {
    if (pickBoolean(wrapper, [field]) !== false) {
      errors.push(`approved_quote_packet ${field} must be false`);
    }
  }

  const quotePacketObject = pickObject(wrapper, ["quote_packet"]);
  if (quotePacketObject === undefined) {
    errors.push("approved_quote_packet quote_packet is missing");
    return undefined;
  }

  const quotePacket = quotePacketObject as unknown as PaidDatanetQuotePacketV1;
  if (!verifyPaidDatanetQuotePacketV1(quotePacket)) {
    errors.push("approved quote packet canonical verification failed");
  }
  if (quotePacket.schema !== PAID_DATANET_QUOTE_PACKET_V1_SCHEMA) {
    errors.push("approved quote packet schema mismatch");
  }
  if (quotePacket.marker !== PAID_DATANET_QUOTE_PACKET_V1_MARKER) {
    errors.push("approved quote packet marker mismatch");
  }
  if (quotePacket.packet_sha256 !== quotePacketSha256) {
    errors.push("approved quote packet SHA does not match approval packet");
  }
  if (sha256JsonV1(quotePacketObject) === quotePacketSha256) {
    // The packet SHA intentionally covers the unsigned packet body, not the
    // complete wrapper including packet_sha256. This guard prevents callers
    // from treating the outer JSON hash as the canonical quote packet hash.
    errors.push("approved quote packet outer JSON hash is unexpectedly canonical");
  }

  const approvedAtMs =
    approvedAtCanonical === undefined
      ? undefined
      : new Date(approvedAtCanonical).getTime();

  if (
    approvalId === undefined ||
    bridgePacketSha256 === undefined ||
    bridgeId === undefined ||
    triagePacketSha256 === undefined ||
    triageId === undefined ||
    draftQuoteInputSha256 === undefined ||
    quotePacketSha256 === undefined ||
    approvedAtCanonical === undefined ||
    approvedAtMs === undefined ||
    !verifyPaidDatanetQuotePacketV1(quotePacket)
  ) {
    return undefined;
  }

  return {
    approval_id: approvalId,
    bridge_packet_sha256: bridgePacketSha256,
    bridge_id: bridgeId,
    triage_packet_sha256: triagePacketSha256,
    triage_id: triageId,
    draft_quote_input_sha256: draftQuoteInputSha256,
    quote_packet_sha256: quotePacketSha256,
    approved_at: approvedAtCanonical,
    approved_at_ms: approvedAtMs,
    quote_packet: quotePacket,
  };
}

interface VerifiedPaymentEvidenceV1 {
  settlement_rail: string;
  settlement_reference: string;
  settlement_evidence_sha256: string;
  verifier_id: string;
  amount_cents: number;
  currency: typeof USD_CENTS;
  observed_at_ms: number;
}

function verifyPaymentEvidence(
  evidence: JsonObject,
  expectedAmountCents: number | undefined,
  quoteRequestedAtMs: number | undefined,
  quoteExpiresAtMs: number | undefined,
  errors: string[],
): VerifiedPaymentEvidenceV1 | undefined {
  if (evidence.schema !== PAYMENT_EVIDENCE_SCHEMA_V1) {
    errors.push(`payment evidence schema must be ${PAYMENT_EVIDENCE_SCHEMA_V1}`);
  }

  const settlementRail = pickString(evidence, ["settlement_rail"]);
  const settlementReference = pickString(evidence, ["settlement_reference"]);
  const settlementEvidenceSha256 = pickString(evidence, [
    "settlement_evidence_sha256",
  ]);
  const verifierId = pickString(evidence, ["verifier_id"]);
  const verificationStatus = pickString(evidence, ["verification_status"]);
  const amountCents = pickInteger(evidence, ["amount_cents"]);
  const currency = pickString(evidence, ["currency"]);
  const observedAtMs = pickInteger(evidence, ["observed_at_ms"]);

  if (settlementRail === undefined || !IDENTIFIER.test(settlementRail)) {
    errors.push("payment evidence settlement_rail must be a bounded identifier");
  }
  if (
    settlementReference === undefined ||
    !IDENTIFIER.test(settlementReference)
  ) {
    errors.push(
      "payment evidence settlement_reference must be a bounded identifier",
    );
  }
  if (
    settlementEvidenceSha256 === undefined ||
    !SHA256_HEX.test(settlementEvidenceSha256)
  ) {
    errors.push(
      "payment evidence settlement_evidence_sha256 must be lowercase SHA-256 hex",
    );
  }
  if (verifierId === undefined || !IDENTIFIER.test(verifierId)) {
    errors.push("payment evidence verifier_id must be a bounded identifier");
  }
  if (verificationStatus !== "VERIFIED") {
    errors.push("payment evidence verification_status must be VERIFIED");
  }
  if (
    !isSafeIntegerInRange(amountCents, 0, MAX_MONEY_CENTS)
  ) {
    errors.push("payment evidence amount_cents is missing or invalid");
  }
  if (currency !== USD_CENTS) {
    errors.push(`payment evidence currency must be ${USD_CENTS}`);
  }
  if (
    !isSafeIntegerInRange(observedAtMs, 0, MAX_TIMESTAMP_MS)
  ) {
    errors.push("payment evidence observed_at_ms is missing or invalid");
  }

  if (
    amountCents !== undefined &&
    expectedAmountCents !== undefined &&
    amountCents !== expectedAmountCents
  ) {
    errors.push("payment evidence amount_cents must equal quoted total");
  }
  if (
    observedAtMs !== undefined &&
    quoteRequestedAtMs !== undefined &&
    observedAtMs < quoteRequestedAtMs
  ) {
    errors.push("payment evidence observed_at_ms precedes quote creation");
  }
  if (
    observedAtMs !== undefined &&
    quoteExpiresAtMs !== undefined &&
    observedAtMs > quoteExpiresAtMs
  ) {
    errors.push("payment evidence observed_at_ms exceeds quote expiry");
  }

  if (
    settlementRail === undefined ||
    settlementReference === undefined ||
    settlementEvidenceSha256 === undefined ||
    verifierId === undefined ||
    amountCents === undefined ||
    currency !== USD_CENTS ||
    observedAtMs === undefined ||
    verificationStatus !== "VERIFIED" ||
    !IDENTIFIER.test(settlementRail) ||
    !IDENTIFIER.test(settlementReference) ||
    !SHA256_HEX.test(settlementEvidenceSha256) ||
    !IDENTIFIER.test(verifierId)
  ) {
    return undefined;
  }

  return {
    settlement_rail: settlementRail,
    settlement_reference: settlementReference,
    settlement_evidence_sha256: settlementEvidenceSha256,
    verifier_id: verifierId,
    amount_cents: amountCents,
    currency: USD_CENTS,
    observed_at_ms: observedAtMs,
  };
}

function makeHold(
  approvalPacketSha256: string,
  paymentEvidencePacketSha256: string,
  errors: string[],
): PaymentConfirmationHoldV1 {
  return {
    schema: PAYMENT_CONFIRMATION_SCHEMA_V1,
    marker: VOID_PAID_DATANET_PUBLIC_PILOT_PAYMENT_CONFIRMATION_CLI_V1,
    disposition: PAYMENT_HOLD_DISPOSITION_V1,
    approval_packet_sha256: approvalPacketSha256,
    payment_evidence_packet_sha256: paymentEvidencePacketSha256,
    errors: [...new Set(errors)].sort((left, right) => left.localeCompare(right)),
    approved_quote_packet_required: true,
    non_secret_payment_evidence_required: true,
    exact_amount_and_currency_required: true,
    explicit_operator_confirmation_required: true,
    payment_confirmation_packet_enabled: false,
    admission_request_compatible: false,
    payment_collection_enabled: false,
    payment_movement_enabled: false,
    wallet_access_enabled: false,
    private_key_input_allowed: false,
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

export function confirmPublicPilotPaymentV1(
  input: PaymentConfirmationInputV1,
): PaymentConfirmationResultV1 {
  const approvalPacket = input.approval_packet;
  const paymentEvidencePacket = input.payment_evidence;
  const approvalPacketSha256 = sha256JsonV1(approvalPacket);
  const paymentEvidencePacketSha256 = sha256JsonV1(paymentEvidencePacket);
  const errors: string[] = [];

  if (containsSecretShapedValueV1(approvalPacket)) {
    errors.push("approval packet contains a secret-shaped value");
  }
  if (containsSecretShapedValueV1(paymentEvidencePacket)) {
    errors.push("payment evidence contains a secret-shaped value");
  }

  const approval = verifyApprovalPacket(approvalPacket, errors);
  const quotePacket = approval?.quote_packet;
  const quote = quotePacket?.quote;
  const quotedTotalCents = quote?.pricing.quoted_total_cents;
  const paymentEvidence = verifyPaymentEvidence(
    paymentEvidencePacket,
    quotedTotalCents,
    quote?.requested_at_ms,
    quote?.expires_at_ms,
    errors,
  );

  const customerAcceptedAtMs = input.customer_accepted_at_ms;
  if (
    !isSafeIntegerInRange(
      customerAcceptedAtMs,
      0,
      MAX_TIMESTAMP_MS,
    )
  ) {
    errors.push("customer_accepted_at_ms is missing or invalid");
  } else {
    if (
      approval !== undefined &&
      customerAcceptedAtMs < approval.approved_at_ms
    ) {
      errors.push("customer_accepted_at_ms must not precede quote approval");
    }
    if (
      paymentEvidence !== undefined &&
      customerAcceptedAtMs > paymentEvidence.observed_at_ms
    ) {
      errors.push("customer_accepted_at_ms must not exceed payment observation");
    }
    if (
      quote !== undefined &&
      customerAcceptedAtMs > quote.expires_at_ms
    ) {
      errors.push("customer_accepted_at_ms exceeds quote expiry");
    }
  }

  const confirmerDisplayName = validateDisplayName(
    input.confirmer_display_name,
  );
  if (confirmerDisplayName === undefined) {
    errors.push("confirmer_display_name is missing or invalid");
  }

  const confirmedAt = canonicalIsoTimestamp(input.confirmed_at);
  if (confirmedAt === undefined) {
    errors.push("confirmed_at must be canonical ISO-8601 UTC");
  }
  const confirmedAtMs =
    confirmedAt === undefined ? undefined : new Date(confirmedAt).getTime();

  if (
    confirmedAtMs !== undefined &&
    paymentEvidence !== undefined &&
    confirmedAtMs < paymentEvidence.observed_at_ms
  ) {
    errors.push("confirmed_at must not precede payment observation");
  }
  if (
    confirmedAtMs !== undefined &&
    quote !== undefined &&
    confirmedAtMs > quote.expires_at_ms
  ) {
    errors.push("confirmed_at exceeds quote expiry");
  }

  if (input.confirmation !== PAYMENT_CONFIRMATION_TOKEN_V1) {
    errors.push(`confirmation must equal ${PAYMENT_CONFIRMATION_TOKEN_V1}`);
  }

  if (
    errors.length > 0 ||
    approval === undefined ||
    quotePacket === undefined ||
    quote === undefined ||
    paymentEvidence === undefined ||
    confirmerDisplayName === undefined ||
    confirmedAt === undefined ||
    confirmedAtMs === undefined
  ) {
    return makeHold(
      approvalPacketSha256,
      paymentEvidencePacketSha256,
      errors,
    );
  }

  const customerAcceptance: PaidDatanetCustomerAcceptanceV1 = {
    requester_id: quote.request.requester_id,
    accepted_quote_id: quote.quote_id,
    accepted_total_cents: quote.pricing.quoted_total_cents,
    accepted_currency: USD_CENTS,
    accepted_at_ms: customerAcceptedAtMs,
  };

  const opaquePaymentEvidence: PaidDatanetOpaquePaymentEvidenceV1 = {
    evidence_ref: paymentEvidence.settlement_reference,
    evidence_sha256: paymentEvidence.settlement_evidence_sha256,
    verifier_id: paymentEvidence.verifier_id,
    verification_status: "VERIFIED",
    amount_cents: paymentEvidence.amount_cents,
    currency: USD_CENTS,
    observed_at_ms: paymentEvidence.observed_at_ms,
  };

  const admissionRequestInput: JsonObject = {
    quote: quote as unknown as JsonObject,
    customer_acceptance: customerAcceptance as unknown as JsonObject,
    payment_evidence: opaquePaymentEvidence as unknown as JsonObject,
    submitted_at_ms: confirmedAtMs,
  };

  try {
    const preview = createPaidDatanetAdmissionRequestV1({
      quote,
      customer_acceptance: customerAcceptance,
      payment_evidence: opaquePaymentEvidence,
      submitted_at_ms: confirmedAtMs,
    });

    if (!verifyPaidDatanetAdmissionRequestV1(preview)) {
      errors.push("payment confirmation is not admission-request compatible");
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`payment confirmation is not admission-request compatible: ${message}`);
  }

  if (errors.length > 0) {
    return makeHold(
      approvalPacketSha256,
      paymentEvidencePacketSha256,
      errors,
    );
  }

  const confirmedPaymentPacket: JsonObject = {
    schema: CONFIRMED_PAYMENT_PACKET_SCHEMA_V1,
    payment_status: "PAYMENT_CONFIRMED_AWAITING_OPERATOR_ADMISSION",
    approval_packet_sha256: approvalPacketSha256,
    approval_id: approval.approval_id,
    bridge_packet_sha256: approval.bridge_packet_sha256,
    bridge_id: approval.bridge_id,
    triage_packet_sha256: approval.triage_packet_sha256,
    triage_id: approval.triage_id,
    draft_quote_input_sha256: approval.draft_quote_input_sha256,
    quote_packet_sha256: approval.quote_packet_sha256,
    quote_id: quote.quote_id,
    service_code: quote.service_code,
    requester_id: quote.request.requester_id,
    customer_reference: quotePacket.customer.customer_reference,
    quoted_total_cents: quote.pricing.quoted_total_cents,
    currency: USD_CENTS,
    payment_evidence_packet_sha256: paymentEvidencePacketSha256,
    settlement_rail: paymentEvidence.settlement_rail,
    settlement_reference: paymentEvidence.settlement_reference,
    settlement_evidence_sha256: paymentEvidence.settlement_evidence_sha256,
    verifier_id: paymentEvidence.verifier_id,
    observed_at_ms: paymentEvidence.observed_at_ms,
    customer_accepted_at_ms: customerAcceptedAtMs,
    confirmer_display_name: confirmerDisplayName,
    confirmed_at: confirmedAt,
    confirmation_token_verified: true,
    payment_verified: true,
    exact_amount_and_currency_verified: true,
    approval_source_chain_verified: true,
    quote_packet_verified: true,
    admission_request_compatible: true,
    admission_request_input: admissionRequestInput,
    operator_admission_decision_required: true,
    payment_collection_enabled: false,
    payment_movement_enabled: false,
    wallet_access_enabled: false,
    private_key_input_allowed: false,
    admission_authorized: false,
    execution_authorized: false,
    automatic_execution_enabled: false,
    wc_mutation_enabled: false,
    treasury_access_enabled: false,
  };

  const paymentConfirmationId = sha256JsonV1({
    schema: PAYMENT_CONFIRMATION_SCHEMA_V1,
    approval_packet_sha256: approvalPacketSha256,
    approval_id: approval.approval_id,
    quote_packet_sha256: approval.quote_packet_sha256,
    quote_id: quote.quote_id,
    payment_evidence_packet_sha256: paymentEvidencePacketSha256,
    customer_acceptance: customerAcceptance as unknown as JsonObject,
    payment_evidence: opaquePaymentEvidence as unknown as JsonObject,
    confirmer_display_name: confirmerDisplayName,
    confirmed_at: confirmedAt,
    confirmation: PAYMENT_CONFIRMATION_TOKEN_V1,
  });

  return {
    schema: PAYMENT_CONFIRMATION_SCHEMA_V1,
    marker: VOID_PAID_DATANET_PUBLIC_PILOT_PAYMENT_CONFIRMATION_CLI_V1,
    payment_confirmation_id: paymentConfirmationId,
    disposition: PAYMENT_CONFIRMED_DISPOSITION_V1,
    approval_packet_sha256: approvalPacketSha256,
    approval_id: approval.approval_id,
    bridge_packet_sha256: approval.bridge_packet_sha256,
    bridge_id: approval.bridge_id,
    triage_packet_sha256: approval.triage_packet_sha256,
    triage_id: approval.triage_id,
    draft_quote_input_sha256: approval.draft_quote_input_sha256,
    quote_packet_sha256: approval.quote_packet_sha256,
    quote_id: quote.quote_id,
    service_code: quote.service_code,
    requester_id: quote.request.requester_id,
    customer_reference: quotePacket.customer.customer_reference,
    quoted_total_cents: quote.pricing.quoted_total_cents,
    currency: USD_CENTS,
    payment_evidence_packet_sha256: paymentEvidencePacketSha256,
    settlement_rail: paymentEvidence.settlement_rail,
    settlement_reference: paymentEvidence.settlement_reference,
    settlement_evidence_sha256: paymentEvidence.settlement_evidence_sha256,
    verifier_id: paymentEvidence.verifier_id,
    observed_at_ms: paymentEvidence.observed_at_ms,
    customer_accepted_at_ms: customerAcceptedAtMs,
    confirmer_display_name: confirmerDisplayName,
    confirmed_at: confirmedAt,
    confirmation_token_verified: true,
    payment_verified: true,
    exact_amount_and_currency_verified: true,
    approval_source_chain_verified: true,
    quote_packet_verified: true,
    admission_request_compatible: true,
    admission_request_input: admissionRequestInput,
    confirmed_payment_packet: confirmedPaymentPacket,
    operator_admission_decision_required: true,
    payment_collection_enabled: false,
    payment_movement_enabled: false,
    wallet_access_enabled: false,
    private_key_input_allowed: false,
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

interface ParsedCliArgumentsV1 {
  approvalPath: string;
  paymentEvidencePath: string;
  customerAcceptedAtMs: number;
  confirmerDisplayName: string;
  confirmedAt: string;
  confirmation: string;
}

function parseUnsignedInteger(name: string, value: string): number {
  if (!/^(0|[1-9][0-9]*)$/u.test(value)) {
    throw new Error(`${name} must be an unsigned base-10 integer`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${name} must be a JavaScript safe integer`);
  }

  return parsed;
}

function parseCliArgumentsV1(args: readonly string[]): ParsedCliArgumentsV1 {
  const values = new Map<string, string>();

  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];

    if (key === undefined || value === undefined || !key.startsWith("--")) {
      throw new Error(
        "usage: --approval <path> --payment-evidence <path> --customer-accepted-at-ms <integer> --confirmer <display-name> --confirmed-at <ISO> --confirm <token>",
      );
    }

    if (values.has(key)) {
      throw new Error(`duplicate argument: ${key}`);
    }

    values.set(key, value);
  }

  const approvalPath = values.get("--approval");
  const paymentEvidencePath = values.get("--payment-evidence");
  const customerAcceptedAt = values.get("--customer-accepted-at-ms");
  const confirmerDisplayName = values.get("--confirmer");
  const confirmedAt = values.get("--confirmed-at");
  const confirmation = values.get("--confirm");

  if (
    approvalPath === undefined ||
    paymentEvidencePath === undefined ||
    customerAcceptedAt === undefined ||
    confirmerDisplayName === undefined ||
    confirmedAt === undefined ||
    confirmation === undefined ||
    values.size !== 6
  ) {
    throw new Error(
      "usage: --approval <path> --payment-evidence <path> --customer-accepted-at-ms <integer> --confirmer <display-name> --confirmed-at <ISO> --confirm <token>",
    );
  }

  return {
    approvalPath,
    paymentEvidencePath,
    customerAcceptedAtMs: parseUnsignedInteger(
      "--customer-accepted-at-ms",
      customerAcceptedAt,
    ),
    confirmerDisplayName,
    confirmedAt,
    confirmation,
  };
}

export function runPaymentConfirmationCliV1(
  args: readonly string[],
  readText: (path: string) => string,
): CliRunResultV1 {
  try {
    const parsed = parseCliArgumentsV1(args);
    const approvalDecoded: unknown = JSON.parse(
      readText(parsed.approvalPath),
    );
    const paymentDecoded: unknown = JSON.parse(
      readText(parsed.paymentEvidencePath),
    );

    if (!isJsonObject(approvalDecoded)) {
      throw new Error("approval packet JSON must be an object");
    }
    if (!isJsonObject(paymentDecoded)) {
      throw new Error("payment evidence JSON must be an object");
    }

    const result = confirmPublicPilotPaymentV1({
      approval_packet: approvalDecoded,
      payment_evidence: paymentDecoded,
      customer_accepted_at_ms: parsed.customerAcceptedAtMs,
      confirmer_display_name: parsed.confirmerDisplayName,
      confirmed_at: parsed.confirmedAt,
      confirmation: parsed.confirmation,
    });

    return {
      exit_code:
        result.disposition === PAYMENT_CONFIRMED_DISPOSITION_V1 ? 0 : 2,
      stdout: `${JSON.stringify(result, null, 2)}\n`,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const failure: JsonObject = {
      schema: PAYMENT_CONFIRMATION_SCHEMA_V1,
      marker: VOID_PAID_DATANET_PUBLIC_PILOT_PAYMENT_CONFIRMATION_CLI_V1,
      disposition: PAYMENT_HOLD_DISPOSITION_V1,
      errors: [message],
      approved_quote_packet_required: true,
      non_secret_payment_evidence_required: true,
      exact_amount_and_currency_required: true,
      payment_confirmation_packet_enabled: false,
      payment_collection_enabled: false,
      payment_movement_enabled: false,
      wallet_access_enabled: false,
      private_key_input_allowed: false,
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
  const result = runPaymentConfirmationCliV1(
    process.argv.slice(2),
    (path) => readFileSync(path, "utf8"),
  );
  process.stdout.write(result.stdout);
  process.exitCode = result.exit_code;
}
