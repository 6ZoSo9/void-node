import { createHash } from "node:crypto";

import {
  PAID_DATANET_ADMISSION_RECEIPT_V1_SCHEMA,
  PAID_DATANET_REQUEST_ADMISSION_V1_MARKER,
  verifyPaidDatanetAdmissionReceiptChainV1,
  type PaidDatanetAdmissionReceiptV1,
} from "./datanet_request_admission_v1.js";

import type {
  PaidDatanetServiceCodeV1,
} from "./datanet_service_catalog_v1.js";

export const PAID_DATANET_FULFILLMENT_RECEIPT_V1_MARKER =
  "VOID_PAID_DATANET_FULFILLMENT_RECEIPT_V1" as const;

export const PAID_DATANET_FULFILLMENT_RECEIPT_V1_SCHEMA =
  "void-paid-datanet-fulfillment-receipt-v1" as const;

const MAX_TIMESTAMP_MS = 8_000_000_000_000_000;
const MAX_EVIDENCE_ARTIFACTS = 256;
const MAX_EVIDENCE_BYTES = 1_000_000_000_000;
const SHA256_HEX = /^[0-9a-f]{64}$/;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const MEDIA_TYPE =
  /^[a-z0-9][a-z0-9.+-]{0,63}\/[a-z0-9][a-z0-9.+-]{0,63}$/;

export type PaidDatanetFulfillmentOutcomeV1 =
  | "COMPLETED"
  | "FAILED";

export type PaidDatanetFulfillmentOutcomeCodeV1 =
  | "DELIVERED_AS_QUOTED"
  | "SOURCE_UNAVAILABLE"
  | "INTEGRITY_MISMATCH"
  | "EXECUTION_ERROR"
  | "EVIDENCE_INCOMPLETE"
  | "CUSTOMER_CANCELLED_AFTER_ADMISSION";

export interface PaidDatanetFulfillmentEvidenceArtifactV1 {
  readonly evidence_ref: string;
  readonly evidence_sha256: string;
  readonly media_type: string;
  readonly byte_length: number;
}

export interface AppendPaidDatanetFulfillmentReceiptV1Input {
  readonly admission_receipts:
    readonly PaidDatanetAdmissionReceiptV1[];
  readonly admission_receipt_sha256: string;
  readonly fulfillment_operator_id: string;
  readonly execution_started_at_ms: number;
  readonly completed_at_ms: number;
  readonly outcome: PaidDatanetFulfillmentOutcomeV1;
  readonly outcome_code: PaidDatanetFulfillmentOutcomeCodeV1;
  readonly result_summary_sha256: string;
  readonly operator_attestation_sha256: string;
  readonly evidence_artifacts:
    readonly PaidDatanetFulfillmentEvidenceArtifactV1[];
}

export interface PaidDatanetFulfillmentReceiptV1 {
  readonly schema:
    typeof PAID_DATANET_FULFILLMENT_RECEIPT_V1_SCHEMA;
  readonly marker:
    typeof PAID_DATANET_FULFILLMENT_RECEIPT_V1_MARKER;
  readonly receipt_sha256: string;
  readonly sequence: number;
  readonly previous_receipt_sha256: string | null;
  readonly admission_receipt_sha256: string;
  readonly admission_request_id: string;
  readonly quote_id: string;
  readonly service_code: PaidDatanetServiceCodeV1;
  readonly requester_id: string;
  readonly admission_operator_id: string;
  readonly fulfillment_operator_id: string;
  readonly execution_started_at_ms: number;
  readonly completed_at_ms: number;
  readonly outcome: PaidDatanetFulfillmentOutcomeV1;
  readonly outcome_code: PaidDatanetFulfillmentOutcomeCodeV1;
  readonly result_summary_sha256: string;
  readonly operator_attestation_sha256: string;
  readonly evidence_count: number;
  readonly total_evidence_bytes: number;
  readonly evidence_artifacts:
    readonly PaidDatanetFulfillmentEvidenceArtifactV1[];
  readonly status:
    | "FULFILLED_DELIVERED"
    | "FULFILLMENT_FAILED";
  readonly controls: {
    readonly append_only_receipt: true;
    readonly operator_attributed: true;
    readonly evidence_bound: true;
    readonly payment_collection_enabled: false;
    readonly execution_performed_by_module: false;
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

function receiptBody(
  receipt: PaidDatanetFulfillmentReceiptV1,
): Omit<PaidDatanetFulfillmentReceiptV1, "receipt_sha256"> {
  const { receipt_sha256: _ignored, ...body } = receipt;
  return body;
}

function assertApprovedAdmissionReceipt(
  receipt: PaidDatanetAdmissionReceiptV1,
): void {
  if (receipt.schema !== PAID_DATANET_ADMISSION_RECEIPT_V1_SCHEMA) {
    throw new Error("admission receipt schema mismatch");
  }
  if (receipt.marker !== PAID_DATANET_REQUEST_ADMISSION_V1_MARKER) {
    throw new Error("admission receipt marker mismatch");
  }
  if (
    receipt.decision !== "APPROVE" ||
    receipt.reason_code !==
      "PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE" ||
    receipt.status !== "ADMITTED_AWAITING_SEPARATE_EXECUTION"
  ) {
    throw new Error("fulfillment requires an approved admission receipt");
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

function normalizeEvidence(
  values: readonly PaidDatanetFulfillmentEvidenceArtifactV1[],
): readonly PaidDatanetFulfillmentEvidenceArtifactV1[] {
  assertSafeInteger(
    "evidence artifact count",
    values.length,
    0,
    MAX_EVIDENCE_ARTIFACTS,
  );

  const normalized = values.map((value) => {
    assertIdentifier("evidence_ref", value.evidence_ref);
    assertSha256("evidence_sha256", value.evidence_sha256);
    if (
      typeof value.media_type !== "string" ||
      !MEDIA_TYPE.test(value.media_type)
    ) {
      throw new Error("media_type must be a bounded lowercase media type");
    }
    assertSafeInteger(
      "evidence byte_length",
      value.byte_length,
      0,
      MAX_EVIDENCE_BYTES,
    );

    return Object.freeze({ ...value });
  });

  normalized.sort((left, right) =>
    left.evidence_ref < right.evidence_ref
      ? -1
      : left.evidence_ref > right.evidence_ref
        ? 1
        : 0,
  );

  for (let index = 1; index < normalized.length; index += 1) {
    if (
      normalized[index - 1]?.evidence_ref ===
      normalized[index]?.evidence_ref
    ) {
      throw new Error("evidence_ref values must be unique");
    }
  }

  return Object.freeze(normalized);
}

function assertEvidenceShape(
  values: readonly PaidDatanetFulfillmentEvidenceArtifactV1[],
): void {
  assertSafeInteger(
    "evidence_count",
    values.length,
    0,
    MAX_EVIDENCE_ARTIFACTS,
  );

  let previousRef: string | null = null;
  for (const value of values) {
    assertIdentifier("receipt evidence_ref", value.evidence_ref);
    assertSha256("receipt evidence_sha256", value.evidence_sha256);
    if (!MEDIA_TYPE.test(value.media_type)) {
      throw new Error("receipt media_type mismatch");
    }
    assertSafeInteger(
      "receipt evidence byte_length",
      value.byte_length,
      0,
      MAX_EVIDENCE_BYTES,
    );
    if (
      previousRef !== null &&
      previousRef >= value.evidence_ref
    ) {
      throw new Error("receipt evidence must be strictly sorted");
    }
    previousRef = value.evidence_ref;
  }
}

function assertOutcomeSemantics(
  outcome: PaidDatanetFulfillmentOutcomeV1,
  outcomeCode: PaidDatanetFulfillmentOutcomeCodeV1,
  evidenceCount: number,
  status: PaidDatanetFulfillmentReceiptV1["status"],
): void {
  if (outcome !== "COMPLETED" && outcome !== "FAILED") {
    throw new Error("fulfillment outcome is invalid");
  }

  if (
    outcomeCode !== "DELIVERED_AS_QUOTED" &&
    outcomeCode !== "SOURCE_UNAVAILABLE" &&
    outcomeCode !== "INTEGRITY_MISMATCH" &&
    outcomeCode !== "EXECUTION_ERROR" &&
    outcomeCode !== "EVIDENCE_INCOMPLETE" &&
    outcomeCode !== "CUSTOMER_CANCELLED_AFTER_ADMISSION"
  ) {
    throw new Error("fulfillment outcome_code is invalid");
  }
  if (
    outcome === "COMPLETED" &&
    (
      outcomeCode !== "DELIVERED_AS_QUOTED" ||
      evidenceCount < 1 ||
      status !== "FULFILLED_DELIVERED"
    )
  ) {
    throw new Error("completed fulfillment semantics mismatch");
  }

  if (
    outcome === "FAILED" &&
    (
      outcomeCode === "DELIVERED_AS_QUOTED" ||
      status !== "FULFILLMENT_FAILED"
    )
  ) {
    throw new Error("failed fulfillment semantics mismatch");
  }
}

function assertReceiptShape(
  receipt: PaidDatanetFulfillmentReceiptV1,
): void {
  if (receipt.schema !== PAID_DATANET_FULFILLMENT_RECEIPT_V1_SCHEMA) {
    throw new Error("fulfillment receipt schema mismatch");
  }
  if (receipt.marker !== PAID_DATANET_FULFILLMENT_RECEIPT_V1_MARKER) {
    throw new Error("fulfillment receipt marker mismatch");
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
    "admission_receipt_sha256",
    receipt.admission_receipt_sha256,
  );
  assertSha256(
    "admission_request_id",
    receipt.admission_request_id,
  );
  assertSha256("quote_id", receipt.quote_id);
  assertIdentifier("service_code", receipt.service_code);
  assertIdentifier("requester_id", receipt.requester_id);
  assertIdentifier(
    "admission_operator_id",
    receipt.admission_operator_id,
  );
  assertIdentifier(
    "fulfillment_operator_id",
    receipt.fulfillment_operator_id,
  );
  assertSafeInteger(
    "execution_started_at_ms",
    receipt.execution_started_at_ms,
    0,
    MAX_TIMESTAMP_MS,
  );
  assertSafeInteger(
    "completed_at_ms",
    receipt.completed_at_ms,
    receipt.execution_started_at_ms,
    MAX_TIMESTAMP_MS,
  );
  assertSha256(
    "result_summary_sha256",
    receipt.result_summary_sha256,
  );
  assertSha256(
    "operator_attestation_sha256",
    receipt.operator_attestation_sha256,
  );

  assertEvidenceShape(receipt.evidence_artifacts);
  assertSafeInteger(
    "receipt evidence_count",
    receipt.evidence_count,
    0,
    MAX_EVIDENCE_ARTIFACTS,
  );
  if (receipt.evidence_count !== receipt.evidence_artifacts.length) {
    throw new Error("evidence_count mismatch");
  }

  const total = receipt.evidence_artifacts.reduce(
    (sum, value) => sum + value.byte_length,
    0,
  );
  assertSafeInteger(
    "total_evidence_bytes",
    receipt.total_evidence_bytes,
    0,
    MAX_EVIDENCE_BYTES * MAX_EVIDENCE_ARTIFACTS,
  );
  if (receipt.total_evidence_bytes !== total) {
    throw new Error("total_evidence_bytes mismatch");
  }

  assertOutcomeSemantics(
    receipt.outcome,
    receipt.outcome_code,
    receipt.evidence_count,
    receipt.status,
  );

  if (
    receipt.controls.append_only_receipt !== true ||
    receipt.controls.operator_attributed !== true ||
    receipt.controls.evidence_bound !== true ||
    receipt.controls.payment_collection_enabled !== false ||
    receipt.controls.execution_performed_by_module !== false ||
    receipt.controls.automatic_execution_enabled !== false ||
    receipt.controls.wc_mutation_enabled !== false ||
    receipt.controls.treasury_access_enabled !== false
  ) {
    throw new Error("fulfillment receipt controls mismatch");
  }
}

function admissionByHash(
  receipts: readonly PaidDatanetAdmissionReceiptV1[],
  receiptSha256: string,
): PaidDatanetAdmissionReceiptV1 | undefined {
  return receipts.find(
    (receipt) => receipt.receipt_sha256 === receiptSha256,
  );
}

export function verifyPaidDatanetFulfillmentReceiptChainV1(
  receipts: readonly PaidDatanetFulfillmentReceiptV1[],
): boolean {
  let previous: string | null = null;
  const fulfilledAdmissions = new Set<string>();

  try {
    for (let index = 0; index < receipts.length; index += 1) {
      const receipt = receipts[index];
      if (receipt.sequence !== index + 1) {
        return false;
      }
      if (receipt.previous_receipt_sha256 !== previous) {
        return false;
      }
      assertReceiptShape(receipt);
      if (fulfilledAdmissions.has(receipt.admission_request_id)) {
        return false;
      }
      if (
        sha256Hex(canonicalJson(receiptBody(receipt))) !==
        receipt.receipt_sha256
      ) {
        return false;
      }

      fulfilledAdmissions.add(receipt.admission_request_id);
      previous = receipt.receipt_sha256;
    }

    return true;
  } catch {
    return false;
  }
}

export function verifyPaidDatanetFulfillmentReceiptsAgainstAdmissionsV1(
  receipts: readonly PaidDatanetFulfillmentReceiptV1[],
  admissionReceipts: readonly PaidDatanetAdmissionReceiptV1[],
): boolean {
  if (!verifyPaidDatanetAdmissionReceiptChainV1(admissionReceipts)) {
    return false;
  }
  if (!verifyPaidDatanetFulfillmentReceiptChainV1(receipts)) {
    return false;
  }

  try {
    for (const receipt of receipts) {
      const admission = admissionByHash(
        admissionReceipts,
        receipt.admission_receipt_sha256,
      );
      if (!admission) {
        return false;
      }
      assertApprovedAdmissionReceipt(admission);
      if (
        receipt.admission_request_id !== admission.admission_request_id ||
        receipt.quote_id !== admission.quote_id ||
        receipt.service_code !== admission.service_code ||
        receipt.requester_id !== admission.requester_id ||
        receipt.admission_operator_id !== admission.operator_id ||
        receipt.execution_started_at_ms < admission.decided_at_ms
      ) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

export function appendPaidDatanetFulfillmentReceiptV1(
  existingReceipts: readonly PaidDatanetFulfillmentReceiptV1[],
  input: AppendPaidDatanetFulfillmentReceiptV1Input,
): readonly PaidDatanetFulfillmentReceiptV1[] {
  if (!verifyPaidDatanetAdmissionReceiptChainV1(input.admission_receipts)) {
    throw new Error("admission receipt chain is invalid");
  }
  if (
    !verifyPaidDatanetFulfillmentReceiptsAgainstAdmissionsV1(
      existingReceipts,
      input.admission_receipts,
    )
  ) {
    throw new Error("existing fulfillment receipt chain is invalid");
  }

  assertSha256(
    "input admission_receipt_sha256",
    input.admission_receipt_sha256,
  );
  const admission = admissionByHash(
    input.admission_receipts,
    input.admission_receipt_sha256,
  );
  if (!admission) {
    throw new Error("admission receipt was not found");
  }
  assertApprovedAdmissionReceipt(admission);

  if (
    existingReceipts.some(
      (receipt) =>
        receipt.admission_request_id === admission.admission_request_id,
    )
  ) {
    throw new Error("admission request already has a fulfillment receipt");
  }

  assertIdentifier(
    "fulfillment_operator_id",
    input.fulfillment_operator_id,
  );
  assertSafeInteger(
    "execution_started_at_ms",
    input.execution_started_at_ms,
    admission.decided_at_ms,
    MAX_TIMESTAMP_MS,
  );
  assertSafeInteger(
    "completed_at_ms",
    input.completed_at_ms,
    input.execution_started_at_ms,
    MAX_TIMESTAMP_MS,
  );
  assertSha256(
    "result_summary_sha256",
    input.result_summary_sha256,
  );
  assertSha256(
    "operator_attestation_sha256",
    input.operator_attestation_sha256,
  );

  const evidence = normalizeEvidence(input.evidence_artifacts);
  const status =
    input.outcome === "COMPLETED"
      ? "FULFILLED_DELIVERED"
      : "FULFILLMENT_FAILED";

  assertOutcomeSemantics(
    input.outcome,
    input.outcome_code,
    evidence.length,
    status,
  );

  const totalEvidenceBytes = evidence.reduce(
    (sum, value) => sum + value.byte_length,
    0,
  );

  const previousReceipt = existingReceipts.at(-1) ?? null;
  const body: Omit<
    PaidDatanetFulfillmentReceiptV1,
    "receipt_sha256"
  > = {
    schema: PAID_DATANET_FULFILLMENT_RECEIPT_V1_SCHEMA,
    marker: PAID_DATANET_FULFILLMENT_RECEIPT_V1_MARKER,
    sequence: existingReceipts.length + 1,
    previous_receipt_sha256:
      previousReceipt?.receipt_sha256 ?? null,
    admission_receipt_sha256: admission.receipt_sha256,
    admission_request_id: admission.admission_request_id,
    quote_id: admission.quote_id,
    service_code: admission.service_code,
    requester_id: admission.requester_id,
    admission_operator_id: admission.operator_id,
    fulfillment_operator_id: input.fulfillment_operator_id,
    execution_started_at_ms: input.execution_started_at_ms,
    completed_at_ms: input.completed_at_ms,
    outcome: input.outcome,
    outcome_code: input.outcome_code,
    result_summary_sha256: input.result_summary_sha256,
    operator_attestation_sha256:
      input.operator_attestation_sha256,
    evidence_count: evidence.length,
    total_evidence_bytes: totalEvidenceBytes,
    evidence_artifacts: evidence,
    status,
    controls: Object.freeze({
      append_only_receipt: true,
      operator_attributed: true,
      evidence_bound: true,
      payment_collection_enabled: false,
      execution_performed_by_module: false,
      automatic_execution_enabled: false,
      wc_mutation_enabled: false,
      treasury_access_enabled: false,
    }),
  };

  const receipt: PaidDatanetFulfillmentReceiptV1 = Object.freeze({
    ...body,
    receipt_sha256: sha256Hex(canonicalJson(body)),
  });

  return Object.freeze([...existingReceipts, receipt]);
}
