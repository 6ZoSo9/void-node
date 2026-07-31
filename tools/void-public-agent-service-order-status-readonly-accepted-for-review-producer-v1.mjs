#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_ACCEPTED_FOR_REVIEW_PRODUCER_V1";
export const VERSION = 1;
export const INPUT_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_ACCEPTED_FOR_REVIEW_PRODUCER_INPUT_V1";
export const SOURCE_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_SOURCE_V1";
export const SUBMISSION_REQUEST_MARKER =
  "VOID_AGENT_PAID_WORK_SUBMISSION_REQUEST_V1";
export const WORK_ORDER_MARKER =
  "VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1";
export const SUBMISSION_RECEIPT_MARKER =
  "VOID_AGENT_PAID_WORK_SUBMISSION_INTAKE_RECEIPT_V1";
export const SUBMISSION_ADMISSION_MARKER =
  "VOID_AGENT_PAID_WORK_SUBMISSION_ADMISSION_V1";

const INPUT_KEYS = [
  "marker",
  "submission_receipt",
  "submission_request",
  "version",
  "work_order",
];
const SOURCE_KEYS = [
  "evidence",
  "lifecycle",
  "marker",
  "observed_at_utc",
  "submission_id",
  "version",
  "work_order_id",
];
const AUTHORITY_KEYS = [
  "buy_void_fulfillment_authority_granted",
  "mutation_authority_granted",
  "payment_authorized",
  "provider_selected",
  "quote_created",
  "wallet_or_signer_access_granted",
  "wc_award_authorized",
  "wc_ledger_write_authorized",
  "work_dispatched",
  "work_execution_authorized",
];
const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
const WORK_ORDER_ID = /^voidawo1_[0-9a-f]{64}$/;
const RECEIPT_ID = /^voidawsi1_[0-9a-f]{64}$/;
const UTC =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

function fail(code, detail = "") {
  const suffix = detail ? `: ${detail}` : "";
  throw new Error(`${code}${suffix}`);
}

function record(value, label) {
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
  ) {
    fail("invalid_object", label);
  }
  return value;
}

function exactKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    fail("unknown_or_missing_fields", label);
  }
}

function requireKeys(value, expected, label) {
  for (const key of expected) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      fail("missing_field", `${label}.${key}`);
    }
  }
}

function safeIdentifier(value, label) {
  if (
    typeof value !== "string"
    || !SAFE_IDENTIFIER.test(value)
  ) {
    fail("invalid_identifier", label);
  }
  return value;
}

function exactPattern(value, pattern, label) {
  if (typeof value !== "string" || !pattern.test(value)) {
    fail("invalid_identifier", label);
  }
  return value;
}

function utc(value, label) {
  if (
    typeof value !== "string"
    || !UTC.test(value)
    || Number.isNaN(Date.parse(value))
  ) {
    fail("invalid_utc_timestamp", label);
  }
  return value;
}

export function canonical(value) {
  if (
    value === null
    || typeof value === "boolean"
    || typeof value === "string"
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      fail("non_finite_number");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonical(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(
      (key) => `${JSON.stringify(key)}:${canonical(value[key])}`,
    ).join(",")}}`;
  }
  fail("unsupported_canonical_type", typeof value);
}

export function sha256Canonical(value) {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

function allFalseAuthority(value, label) {
  const authority = record(value, label);
  requireKeys(authority, AUTHORITY_KEYS, label);
  for (const [key, item] of Object.entries(authority)) {
    if (item !== false) {
      fail("authority_must_be_false", `${label}.${key}`);
    }
  }
  return authority;
}

function validateInput(input) {
  const value = record(input, "producer input");
  exactKeys(value, INPUT_KEYS, "producer input");

  if (value.marker !== INPUT_MARKER || value.version !== VERSION) {
    fail("input_identity_mismatch");
  }

  const request = record(
    value.submission_request,
    "submission request",
  );
  requireKeys(
    request,
    ["marker", "version", "submission_id", "work_order"],
    "submission request",
  );
  if (
    request.marker !== SUBMISSION_REQUEST_MARKER
    || request.version !== 1
  ) {
    fail("submission_request_identity_mismatch");
  }

  const workOrder = record(value.work_order, "work order");
  requireKeys(
    workOrder,
    [
      "marker",
      "version",
      "created_at_utc",
      "expires_at_utc",
      "work_order_id",
    ],
    "work order",
  );
  if (
    workOrder.marker !== WORK_ORDER_MARKER
    || workOrder.version !== 1
  ) {
    fail("work_order_identity_mismatch");
  }

  const nestedWorkOrder = record(
    request.work_order,
    "submission request work order",
  );
  if (canonical(nestedWorkOrder) !== canonical(workOrder)) {
    fail("nested_work_order_mismatch");
  }

  const receipt = record(
    value.submission_receipt,
    "submission receipt",
  );
  requireKeys(
    receipt,
    [
      "marker",
      "version",
      "submission_id",
      "work_order_id",
      "admission",
      "received_at_utc",
      "authorization_verified",
      "duplicate",
      "authority",
      "receipt_id",
    ],
    "submission receipt",
  );
  if (
    receipt.marker !== SUBMISSION_RECEIPT_MARKER
    || receipt.version !== 1
  ) {
    fail("submission_receipt_identity_mismatch");
  }

  const admission = record(receipt.admission, "admission");
  requireKeys(
    admission,
    [
      "marker",
      "version",
      "work_order_id",
      "evaluated_at_utc",
      "decision",
      "authority",
      "admission_id",
    ],
    "admission",
  );
  if (
    admission.marker !== SUBMISSION_ADMISSION_MARKER
    || admission.version !== 1
  ) {
    fail("submission_admission_identity_mismatch");
  }

  const submissionId = safeIdentifier(
    request.submission_id,
    "submission_id",
  );
  const workOrderId = exactPattern(
    workOrder.work_order_id,
    WORK_ORDER_ID,
    "work_order_id",
  );
  const receiptId = exactPattern(
    receipt.receipt_id,
    RECEIPT_ID,
    "receipt_id",
  );

  if (receipt.submission_id !== submissionId) {
    fail("submission_id_mismatch");
  }
  if (receipt.work_order_id !== workOrderId) {
    fail("receipt_work_order_id_mismatch");
  }
  if (admission.work_order_id !== workOrderId) {
    fail("admission_work_order_id_mismatch");
  }
  if (admission.decision !== "accepted_for_review") {
    fail("admission_not_accepted_for_review");
  }
  if (receipt.authorization_verified !== true) {
    fail("authorization_not_verified");
  }
  if (receipt.duplicate !== false) {
    fail("duplicate_receipt_refused");
  }

  allFalseAuthority(receipt.authority, "receipt authority");
  allFalseAuthority(admission.authority, "admission authority");

  const createdAtUtc = utc(
    workOrder.created_at_utc,
    "work_order.created_at_utc",
  );
  const expiresAtUtc = utc(
    workOrder.expires_at_utc,
    "work_order.expires_at_utc",
  );
  const evaluatedAtUtc = utc(
    admission.evaluated_at_utc,
    "admission.evaluated_at_utc",
  );
  const receivedAtUtc = utc(
    receipt.received_at_utc,
    "receipt.received_at_utc",
  );

  const created = Date.parse(createdAtUtc);
  const expires = Date.parse(expiresAtUtc);
  const evaluated = Date.parse(evaluatedAtUtc);
  const received = Date.parse(receivedAtUtc);

  if (!(created < expires)) {
    fail("invalid_work_order_window");
  }
  if (evaluated < created || evaluated > expires) {
    fail("admission_outside_work_order_window");
  }
  if (received < evaluated || received > expires) {
    fail("receipt_outside_work_order_window");
  }

  return {
    request,
    workOrder,
    receipt,
    submissionId,
    workOrderId,
    receiptId,
    observedAtUtc: receivedAtUtc,
  };
}

export function materializeAcceptedForReviewSourceV1(input) {
  const validated = validateInput(input);

  const source = {
    marker: SOURCE_MARKER,
    version: 1,
    observed_at_utc: validated.observedAtUtc,
    submission_id: validated.submissionId,
    work_order_id: validated.workOrderId,
    lifecycle: {
      submission_status: "accepted_for_review",
      quote_status: "none",
      acceptance_status: "none",
      payment_status: "none",
      execution_status: "none",
      completion_status: "none",
    },
    evidence: {
      submission_receipt_id: validated.receiptId,
      quote_handoff_id: null,
      quote_id: null,
      provider_response_id: null,
      acceptance_id: null,
      payment_authorization_id: null,
      payment_receipt_id: null,
      execution_authorization_id: null,
      dispatch_id: null,
      completion_receipt_id: null,
    },
  };

  exactKeys(source, SOURCE_KEYS, "source");
  return source;
}

export function evaluateAcceptedForReviewProducerV1(input) {
  const validated = validateInput(input);
  const source = materializeAcceptedForReviewSourceV1(input);

  const provenance = {
    submission_request_sha256: sha256Canonical(validated.request),
    work_order_sha256: sha256Canonical(validated.workOrder),
    submission_receipt_sha256: sha256Canonical(validated.receipt),
  };
  const basis = {
    marker: MARKER,
    version: VERSION,
    source,
    provenance,
  };

  return {
    marker: MARKER,
    version: VERSION,
    producer_binding_id:
      `voidaosafrp1_${sha256Canonical(basis)}`,
    source,
    provenance,
    authority: {
      source_file_write: false,
      source_root_configuration: false,
      live_http_route_registration: false,
      server_mount: false,
      network_listener: false,
      authenticated_submission_post: false,
      provider_selection: false,
      provider_authentication: false,
      quote_acceptance: false,
      payment_execution: false,
      work_dispatch: false,
      work_credit_write: false,
      runtime_mutation: false,
      service_restart: false,
      deployment: false,
      activation: false,
    },
  };
}

function canonicalJson(value) {
  return `${JSON.stringify(
    JSON.parse(canonical(value)),
    null,
    2,
  )}\n`;
}

function parseCli(argv) {
  if (
    argv.length !== 3
    || argv[0] !== "evaluate"
    || argv[1] !== "--input"
  ) {
    fail("usage", "evaluate --input <producer-input.json>");
  }
  return path.resolve(argv[2]);
}

async function main() {
  const inputPath = parseCli(process.argv.slice(2));
  const input = JSON.parse(await readFile(inputPath, "utf8"));
  process.stdout.write(
    canonicalJson(evaluateAcceptedForReviewProducerV1(input)),
  );
}

const invokedPath = process.argv[1]
  ? path.resolve(process.argv[1])
  : "";
const modulePath = fileURLToPath(import.meta.url);

if (invokedPath === modulePath) {
  main().catch((error) => {
    process.stderr.write(`HOLD: ${error.message}\n`);
    process.exitCode = 1;
  });
}
