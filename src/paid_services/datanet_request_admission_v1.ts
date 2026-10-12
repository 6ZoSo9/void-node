import { createHash } from "node:crypto";

import {
  PAID_DATANET_QUOTE_V1_SCHEMA,
  PAID_DATANET_SERVICE_CATALOG_V1_MARKER,
  USD_CENTS,
  type PaidDatanetQuoteV1,
  type PaidDatanetServiceCodeV1,
} from "./datanet_service_catalog_v1.js";

export const PAID_DATANET_REQUEST_ADMISSION_V1_MARKER =
  "VOID_PAID_DATANET_REQUEST_ADMISSION_V1" as const;

export const PAID_DATANET_ADMISSION_REQUEST_V1_SCHEMA =
  "void-paid-datanet-admission-request-v1" as const;

export const PAID_DATANET_ADMISSION_RECEIPT_V1_SCHEMA =
  "void-paid-datanet-admission-receipt-v1" as const;

const MAX_TIMESTAMP_MS = 8_000_000_000_000_000;
const MAX_MONEY_CENTS = 100_000_000_000;
const SHA256_HEX = /^[0-9a-f]{64}$/;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;

export type PaidDatanetPaymentVerificationStatusV1 = "VERIFIED";
export type PaidDatanetAdmissionDecisionV1 = "APPROVE" | "REJECT";
export type PaidDatanetAdmissionReasonCodeV1 =
  | "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE"
  | "CAPACITY_UNAVAILABLE"
  | "PAYMENT_EVIDENCE_REJECTED"
  | "POLICY_REJECTED"
  | "REQUESTER_CANCELLED";

export interface PaidDatanetCustomerAcceptanceV1 {
  readonly requester_id: string;
  readonly accepted_quote_id: string;
  readonly accepted_total_cents: number;
  readonly accepted_currency: typeof USD_CENTS;
  readonly accepted_at_ms: number;
}

export interface PaidDatanetOpaquePaymentEvidenceV1 {
  readonly evidence_ref: string;
  readonly evidence_sha256: string;
  readonly verifier_id: string;
  readonly verification_status: PaidDatanetPaymentVerificationStatusV1;
  readonly amount_cents: number;
  readonly currency: typeof USD_CENTS;
  readonly observed_at_ms: number;
}

export interface CreatePaidDatanetAdmissionRequestV1Input {
  readonly quote: PaidDatanetQuoteV1;
  readonly customer_acceptance: PaidDatanetCustomerAcceptanceV1;
  readonly payment_evidence: PaidDatanetOpaquePaymentEvidenceV1;
  readonly submitted_at_ms: number;
}

export interface PaidDatanetAdmissionRequestV1 {
  readonly schema: typeof PAID_DATANET_ADMISSION_REQUEST_V1_SCHEMA;
  readonly marker: typeof PAID_DATANET_REQUEST_ADMISSION_V1_MARKER;
  readonly admission_request_id: string;
  readonly status: "PENDING_OPERATOR_DECISION";
  readonly quote: {
    readonly quote_id: string;
    readonly service_code: PaidDatanetServiceCodeV1;
    readonly requester_id: string;
    readonly quoted_total_cents: number;
    readonly currency: typeof USD_CENTS;
    readonly expires_at_ms: number;
  };
  readonly customer_acceptance: PaidDatanetCustomerAcceptanceV1;
  readonly payment_evidence: PaidDatanetOpaquePaymentEvidenceV1;
  readonly submitted_at_ms: number;
  readonly controls: {
    readonly operator_decision_required: true;
    readonly automatic_admission_enabled: false;
    readonly payment_collection_enabled: false;
    readonly automatic_execution_enabled: false;
    readonly wc_mutation_enabled: false;
    readonly treasury_access_enabled: false;
  };
}

export interface PaidDatanetAdmissionDecisionInputV1 {
  readonly admission_request: PaidDatanetAdmissionRequestV1;
  readonly operator_id: string;
  readonly decision: PaidDatanetAdmissionDecisionV1;
  readonly reason_code: PaidDatanetAdmissionReasonCodeV1;
  readonly decided_at_ms: number;
}

export interface PaidDatanetAdmissionReceiptV1 {
  readonly schema: typeof PAID_DATANET_ADMISSION_RECEIPT_V1_SCHEMA;
  readonly marker: typeof PAID_DATANET_REQUEST_ADMISSION_V1_MARKER;
  readonly receipt_sha256: string;
  readonly sequence: number;
  readonly previous_receipt_sha256: string | null;
  readonly admission_request_id: string;
  readonly quote_id: string;
  readonly service_code: PaidDatanetServiceCodeV1;
  readonly requester_id: string;
  readonly operator_id: string;
  readonly decision: PaidDatanetAdmissionDecisionV1;
  readonly reason_code: PaidDatanetAdmissionReasonCodeV1;
  readonly decided_at_ms: number;
  readonly status:
    | "ADMITTED_AWAITING_SEPARATE_EXECUTION"
    | "REJECTED";
  readonly controls: {
    readonly append_only_receipt: true;
    readonly payment_collection_enabled: false;
    readonly execution_authorized: false;
    readonly automatic_execution_enabled: false;
    readonly wc_mutation_enabled: false;
    readonly treasury_access_enabled: false;
  };
}

function assertIdentifier(name: string, value: string): void {
  if (typeof value !== "string" || !IDENTIFIER.test(value)) {
    throw new Error(`${name} must be a bounded identifier`);
  }
}

function assertSha256(name: string, value: string): void {
  if (typeof value !== "string" || !SHA256_HEX.test(value)) {
    throw new Error(`${name} must be lowercase SHA-256 hex`);
  }
}

function assertSafeInteger(
  name: string,
  value: number,
  minimum: number,
  maximum: number,
): void {
  if (
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new Error(
      `${name} must be a safe integer in [${minimum}, ${maximum}]`,
    );
  }
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
      throw new Error("canonical JSON rejects non-finite numbers");
    }
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalJson(record[key])}`,
      )
      .join(",")}}`;
  }

  throw new Error(`canonical JSON rejects ${typeof value}`);
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function assertQuoteForAdmission(
  quote: PaidDatanetQuoteV1,
): void {
  if (quote.schema !== PAID_DATANET_QUOTE_V1_SCHEMA) {
    throw new Error("quote schema mismatch");
  }
  if (quote.marker !== PAID_DATANET_SERVICE_CATALOG_V1_MARKER) {
    throw new Error("quote marker mismatch");
  }
  if (quote.quote_only !== true) {
    throw new Error("quote must remain quote-only");
  }
  assertSha256("quote_id", quote.quote_id);
  assertIdentifier("quote request_id", quote.request.request_id);
  assertIdentifier("quote requester_id", quote.request.requester_id);
  assertSafeInteger(
    "quote requested_at_ms",
    quote.requested_at_ms,
    0,
    MAX_TIMESTAMP_MS,
  );
  assertSafeInteger(
    "quote expires_at_ms",
    quote.expires_at_ms,
    quote.requested_at_ms,
    MAX_TIMESTAMP_MS,
  );
  assertSafeInteger(
    "quote quoted_total_cents",
    quote.pricing.quoted_total_cents,
    0,
    MAX_MONEY_CENTS,
  );
  if (quote.currency !== USD_CENTS) {
    throw new Error("quote currency mismatch");
  }
  if (
    quote.controls.operator_approval_required !== true ||
    quote.controls.customer_payment_required_before_work !== true ||
    quote.controls.automatic_execution_enabled !== false ||
    quote.controls.automatic_payment_collection_enabled !== false ||
    quote.controls.treasury_access_enabled !== false
  ) {
    throw new Error("quote controls are not admission-compatible");
  }
}


function assertAdmissionRequestShape(
  request: PaidDatanetAdmissionRequestV1,
): void {
  if (request.schema !== PAID_DATANET_ADMISSION_REQUEST_V1_SCHEMA) {
    throw new Error("admission request schema mismatch");
  }
  if (request.marker !== PAID_DATANET_REQUEST_ADMISSION_V1_MARKER) {
    throw new Error("admission request marker mismatch");
  }
  if (request.status !== "PENDING_OPERATOR_DECISION") {
    throw new Error("admission request status mismatch");
  }

  assertSha256("admission_request_id", request.admission_request_id);
  assertSha256("admission quote_id", request.quote.quote_id);
  assertIdentifier("admission service_code", request.quote.service_code);
  assertIdentifier("admission requester_id", request.quote.requester_id);
  assertSafeInteger(
    "admission quoted_total_cents",
    request.quote.quoted_total_cents,
    0,
    MAX_MONEY_CENTS,
  );
  assertSafeInteger(
    "admission expires_at_ms",
    request.quote.expires_at_ms,
    0,
    MAX_TIMESTAMP_MS,
  );
  if (request.quote.currency !== USD_CENTS) {
    throw new Error("admission quote currency mismatch");
  }

  assertIdentifier(
    "admission acceptance requester_id",
    request.customer_acceptance.requester_id,
  );
  assertSha256(
    "admission accepted_quote_id",
    request.customer_acceptance.accepted_quote_id,
  );
  assertSafeInteger(
    "admission accepted_total_cents",
    request.customer_acceptance.accepted_total_cents,
    0,
    MAX_MONEY_CENTS,
  );
  assertSafeInteger(
    "admission accepted_at_ms",
    request.customer_acceptance.accepted_at_ms,
    0,
    request.quote.expires_at_ms,
  );
  if (request.customer_acceptance.accepted_currency !== USD_CENTS) {
    throw new Error("admission accepted currency mismatch");
  }

  assertIdentifier(
    "admission payment evidence_ref",
    request.payment_evidence.evidence_ref,
  );
  assertSha256(
    "admission payment evidence_sha256",
    request.payment_evidence.evidence_sha256,
  );
  assertIdentifier(
    "admission payment verifier_id",
    request.payment_evidence.verifier_id,
  );
  assertSafeInteger(
    "admission payment amount_cents",
    request.payment_evidence.amount_cents,
    0,
    MAX_MONEY_CENTS,
  );
  assertSafeInteger(
    "admission payment observed_at_ms",
    request.payment_evidence.observed_at_ms,
    request.customer_acceptance.accepted_at_ms,
    request.quote.expires_at_ms,
  );
  if (request.payment_evidence.verification_status !== "VERIFIED") {
    throw new Error("admission payment verification status mismatch");
  }
  if (request.payment_evidence.currency !== USD_CENTS) {
    throw new Error("admission payment currency mismatch");
  }

  assertSafeInteger(
    "admission submitted_at_ms",
    request.submitted_at_ms,
    request.payment_evidence.observed_at_ms,
    request.quote.expires_at_ms,
  );

  if (
    request.customer_acceptance.requester_id !==
    request.quote.requester_id
  ) {
    throw new Error("admission requester binding mismatch");
  }
  if (
    request.customer_acceptance.accepted_quote_id !==
    request.quote.quote_id
  ) {
    throw new Error("admission quote binding mismatch");
  }
  if (
    request.customer_acceptance.accepted_total_cents !==
      request.quote.quoted_total_cents ||
    request.payment_evidence.amount_cents !==
      request.quote.quoted_total_cents
  ) {
    throw new Error("admission amount binding mismatch");
  }
  if (
    request.controls.operator_decision_required !== true ||
    request.controls.automatic_admission_enabled !== false ||
    request.controls.payment_collection_enabled !== false ||
    request.controls.automatic_execution_enabled !== false ||
    request.controls.wc_mutation_enabled !== false ||
    request.controls.treasury_access_enabled !== false
  ) {
    throw new Error("admission request controls mismatch");
  }
}

function assertAdmissionReceiptShape(
  receipt: PaidDatanetAdmissionReceiptV1,
): void {
  if (receipt.schema !== PAID_DATANET_ADMISSION_RECEIPT_V1_SCHEMA) {
    throw new Error("admission receipt schema mismatch");
  }
  if (receipt.marker !== PAID_DATANET_REQUEST_ADMISSION_V1_MARKER) {
    throw new Error("admission receipt marker mismatch");
  }
  assertSha256("receipt_sha256", receipt.receipt_sha256);
  assertSafeInteger(
    "receipt sequence",
    receipt.sequence,
    1,
    Number.MAX_SAFE_INTEGER,
  );
  if (receipt.previous_receipt_sha256 !== null) {
    assertSha256(
      "previous_receipt_sha256",
      receipt.previous_receipt_sha256,
    );
  }
  assertSha256(
    "receipt admission_request_id",
    receipt.admission_request_id,
  );
  assertSha256("receipt quote_id", receipt.quote_id);
  assertIdentifier("receipt service_code", receipt.service_code);
  assertIdentifier("receipt requester_id", receipt.requester_id);
  assertIdentifier("receipt operator_id", receipt.operator_id);
  assertSafeInteger(
    "receipt decided_at_ms",
    receipt.decided_at_ms,
    0,
    MAX_TIMESTAMP_MS,
  );

  if (
    receipt.decision === "APPROVE" &&
    (receipt.reason_code !==
      "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE" ||
      receipt.status !== "ADMITTED_AWAITING_SEPARATE_EXECUTION")
  ) {
    throw new Error("approved receipt semantics mismatch");
  }
  if (
    receipt.decision === "REJECT" &&
    (receipt.reason_code ===
      "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE" ||
      receipt.status !== "REJECTED")
  ) {
    throw new Error("rejected receipt semantics mismatch");
  }
  if (
    receipt.controls.append_only_receipt !== true ||
    receipt.controls.payment_collection_enabled !== false ||
    receipt.controls.execution_authorized !== false ||
    receipt.controls.automatic_execution_enabled !== false ||
    receipt.controls.wc_mutation_enabled !== false ||
    receipt.controls.treasury_access_enabled !== false
  ) {
    throw new Error("admission receipt controls mismatch");
  }
}

function requestBody(
  request: PaidDatanetAdmissionRequestV1,
): Omit<PaidDatanetAdmissionRequestV1, "admission_request_id"> {
  const { admission_request_id: _ignored, ...body } = request;
  return body;
}

function receiptBody(
  receipt: PaidDatanetAdmissionReceiptV1,
): Omit<PaidDatanetAdmissionReceiptV1, "receipt_sha256"> {
  const { receipt_sha256: _ignored, ...body } = receipt;
  return body;
}

export function verifyPaidDatanetAdmissionRequestV1(
  request: PaidDatanetAdmissionRequestV1,
): boolean {
  try {
    assertAdmissionRequestShape(request);
    return (
      sha256Hex(canonicalJson(requestBody(request))) ===
      request.admission_request_id
    );
  } catch {
    return false;
  }
}

export function createPaidDatanetAdmissionRequestV1(
  input: CreatePaidDatanetAdmissionRequestV1Input,
): PaidDatanetAdmissionRequestV1 {
  assertQuoteForAdmission(input.quote);

  const acceptance = input.customer_acceptance;
  const payment = input.payment_evidence;

  assertIdentifier("acceptance requester_id", acceptance.requester_id);
  assertSha256("accepted_quote_id", acceptance.accepted_quote_id);
  assertSafeInteger(
    "accepted_total_cents",
    acceptance.accepted_total_cents,
    0,
    MAX_MONEY_CENTS,
  );
  assertSafeInteger(
    "accepted_at_ms",
    acceptance.accepted_at_ms,
    input.quote.requested_at_ms,
    input.quote.expires_at_ms,
  );

  if (acceptance.requester_id !== input.quote.request.requester_id) {
    throw new Error("acceptance requester does not match quote");
  }
  if (acceptance.accepted_quote_id !== input.quote.quote_id) {
    throw new Error("acceptance quote ID does not match quote");
  }
  if (
    acceptance.accepted_total_cents !==
    input.quote.pricing.quoted_total_cents
  ) {
    throw new Error("accepted total does not match quote");
  }
  if (acceptance.accepted_currency !== input.quote.currency) {
    throw new Error("accepted currency does not match quote");
  }

  assertIdentifier("payment evidence_ref", payment.evidence_ref);
  assertSha256("payment evidence_sha256", payment.evidence_sha256);
  assertIdentifier("payment verifier_id", payment.verifier_id);
  assertSafeInteger(
    "payment amount_cents",
    payment.amount_cents,
    0,
    MAX_MONEY_CENTS,
  );
  assertSafeInteger(
    "payment observed_at_ms",
    payment.observed_at_ms,
    acceptance.accepted_at_ms,
    input.quote.expires_at_ms,
  );

  if (payment.verification_status !== "VERIFIED") {
    throw new Error("payment evidence must be VERIFIED");
  }
  if (payment.amount_cents !== input.quote.pricing.quoted_total_cents) {
    throw new Error("payment amount does not match quote");
  }
  if (payment.currency !== input.quote.currency) {
    throw new Error("payment currency does not match quote");
  }

  assertSafeInteger(
    "submitted_at_ms",
    input.submitted_at_ms,
    payment.observed_at_ms,
    input.quote.expires_at_ms,
  );

  const body: Omit<
    PaidDatanetAdmissionRequestV1,
    "admission_request_id"
  > = {
    schema: PAID_DATANET_ADMISSION_REQUEST_V1_SCHEMA,
    marker: PAID_DATANET_REQUEST_ADMISSION_V1_MARKER,
    status: "PENDING_OPERATOR_DECISION",
    quote: Object.freeze({
      quote_id: input.quote.quote_id,
      service_code: input.quote.service_code,
      requester_id: input.quote.request.requester_id,
      quoted_total_cents: input.quote.pricing.quoted_total_cents,
      currency: input.quote.currency,
      expires_at_ms: input.quote.expires_at_ms,
    }),
    customer_acceptance: Object.freeze({ ...acceptance }),
    payment_evidence: Object.freeze({ ...payment }),
    submitted_at_ms: input.submitted_at_ms,
    controls: Object.freeze({
      operator_decision_required: true,
      automatic_admission_enabled: false,
      payment_collection_enabled: false,
      automatic_execution_enabled: false,
      wc_mutation_enabled: false,
      treasury_access_enabled: false,
    }),
  };

  return Object.freeze({
    ...body,
    admission_request_id: sha256Hex(canonicalJson(body)),
  });
}

export function verifyPaidDatanetAdmissionReceiptChainV1(
  receipts: readonly PaidDatanetAdmissionReceiptV1[],
): boolean {
  let previous: string | null = null;
  const decidedRequests = new Set<string>();

  try {
    for (let index = 0; index < receipts.length; index += 1) {
      const receipt = receipts[index];
      if (receipt.sequence !== index + 1) {
        return false;
      }
      if (receipt.previous_receipt_sha256 !== previous) {
        return false;
      }
      assertAdmissionReceiptShape(receipt);
      if (decidedRequests.has(receipt.admission_request_id)) {
        return false;
      }
      if (
        sha256Hex(canonicalJson(receiptBody(receipt))) !==
        receipt.receipt_sha256
      ) {
        return false;
      }
      decidedRequests.add(receipt.admission_request_id);
      previous = receipt.receipt_sha256;
    }
    return true;
  } catch {
    return false;
  }
}

export function appendPaidDatanetAdmissionDecisionV1(
  existingReceipts: readonly PaidDatanetAdmissionReceiptV1[],
  input: PaidDatanetAdmissionDecisionInputV1,
): readonly PaidDatanetAdmissionReceiptV1[] {
  if (!verifyPaidDatanetAdmissionReceiptChainV1(existingReceipts)) {
    throw new Error("existing admission receipt chain is invalid");
  }
  if (!verifyPaidDatanetAdmissionRequestV1(input.admission_request)) {
    throw new Error("admission request integrity check failed");
  }
  if (
    existingReceipts.some(
      (receipt) =>
        receipt.admission_request_id ===
        input.admission_request.admission_request_id,
    )
  ) {
    throw new Error("admission request already has a decision receipt");
  }

  assertIdentifier("operator_id", input.operator_id);
  assertSafeInteger(
    "decided_at_ms",
    input.decided_at_ms,
    input.admission_request.submitted_at_ms,
    MAX_TIMESTAMP_MS,
  );

  if (
    input.decision === "APPROVE" &&
    input.reason_code !==
      "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE"
  ) {
    throw new Error("APPROVE requires the approval reason code");
  }
  if (
    input.decision === "REJECT" &&
    input.reason_code ===
      "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE"
  ) {
    throw new Error("REJECT requires a rejection reason code");
  }

  const previousReceipt = existingReceipts.at(-1) ?? null;
  const body: Omit<
    PaidDatanetAdmissionReceiptV1,
    "receipt_sha256"
  > = {
    schema: PAID_DATANET_ADMISSION_RECEIPT_V1_SCHEMA,
    marker: PAID_DATANET_REQUEST_ADMISSION_V1_MARKER,
    sequence: existingReceipts.length + 1,
    previous_receipt_sha256:
      previousReceipt?.receipt_sha256 ?? null,
    admission_request_id:
      input.admission_request.admission_request_id,
    quote_id: input.admission_request.quote.quote_id,
    service_code: input.admission_request.quote.service_code,
    requester_id: input.admission_request.quote.requester_id,
    operator_id: input.operator_id,
    decision: input.decision,
    reason_code: input.reason_code,
    decided_at_ms: input.decided_at_ms,
    status:
      input.decision === "APPROVE"
        ? "ADMITTED_AWAITING_SEPARATE_EXECUTION"
        : "REJECTED",
    controls: Object.freeze({
      append_only_receipt: true,
      payment_collection_enabled: false,
      execution_authorized: false,
      automatic_execution_enabled: false,
      wc_mutation_enabled: false,
      treasury_access_enabled: false,
    }),
  };

  const receipt: PaidDatanetAdmissionReceiptV1 = Object.freeze({
    ...body,
    receipt_sha256: sha256Hex(canonicalJson(body)),
  });

  return Object.freeze([...existingReceipts, receipt]);
}
