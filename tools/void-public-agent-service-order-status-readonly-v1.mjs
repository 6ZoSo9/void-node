#!/usr/bin/env node
import { createHash } from "node:crypto";
import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export const SOURCE_MARKER = "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_SOURCE_V1";
export const STATUS_MARKER = "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_V1";

const SOURCE_KEYS = [
  "evidence", "lifecycle", "marker", "observed_at_utc", "submission_id",
  "version", "work_order_id",
];
const LIFECYCLE_KEYS = [
  "acceptance_status", "completion_status", "execution_status",
  "payment_status", "quote_status", "submission_status",
];
const EVIDENCE_KEYS = [
  "acceptance_id", "completion_receipt_id", "dispatch_id",
  "execution_authorization_id", "payment_authorization_id",
  "payment_receipt_id", "provider_response_id", "quote_handoff_id",
  "quote_id", "submission_receipt_id",
];
const IDENTIFIER = /^[A-Za-z0-9._:-]{1,256}$/;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

const ENUMS = {
  submission_status: new Set(["accepted_for_review", "rejected"]),
  quote_status: new Set([
    "none", "ready_for_provider_quote", "provider_authentication_required",
    "quote_available", "rejected",
  ]),
  acceptance_status: new Set(["none", "accepted", "rejected"]),
  payment_status: new Set(["none", "authorized", "confirmed", "rejected"]),
  execution_status: new Set(["none", "authorized", "dispatched", "rejected"]),
  completion_status: new Set(["none", "completed", "failed"]),
};

export const EXAMPLE_SOURCE_V1 = Object.freeze({
  marker: SOURCE_MARKER,
  version: 1,
  observed_at_utc: "2030-01-01T00:00:04Z",
  submission_id: "voidawsr1_example_order_status_0001",
  work_order_id: "voidawo1_example_order_status_0001",
  lifecycle: {
    submission_status: "accepted_for_review",
    quote_status: "provider_authentication_required",
    acceptance_status: "none",
    payment_status: "none",
    execution_status: "none",
    completion_status: "none",
  },
  evidence: {
    submission_receipt_id: "voidawsi1_example_order_status_0001",
    quote_handoff_id: "voidawqh1_example_order_status_0001",
    quote_id: "voidawq1_example_order_status_0001",
    provider_response_id: "voidawqr1_example_order_status_0001",
    acceptance_id: null,
    payment_authorization_id: null,
    payment_receipt_id: null,
    execution_authorization_id: null,
    dispatch_id: null,
    completion_receipt_id: null,
  },
});

function fail(message) {
  throw new Error(message);
}

function record(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  return value;
}

function exactKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    fail(`${label} keys mismatch`);
  }
}

function identifier(value, label, nullable = false) {
  if (nullable && value === null) return null;
  if (typeof value !== "string" || !IDENTIFIER.test(value)) {
    fail(`${label} must be a safe identifier`);
  }
  return value;
}

export function canonical(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("non-finite canonical number");
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
  fail(`unsupported canonical type: ${typeof value}`);
}

export function sha256Canonical(value) {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

function requireRef(evidence, key, required) {
  const value = evidence[key];
  if (required && value === null) fail(`${key} is required by lifecycle state`);
  if (!required && value !== null) fail(`${key} must be null before its lifecycle state`);
}

export function validateSource(input) {
  const source = record(input, "source");
  exactKeys(source, SOURCE_KEYS, "source");
  if (source.marker !== SOURCE_MARKER) fail("source marker mismatch");
  if (source.version !== 1) fail("source version mismatch");
  if (typeof source.observed_at_utc !== "string" || !UTC.test(source.observed_at_utc) || Number.isNaN(Date.parse(source.observed_at_utc))) {
    fail("observed_at_utc must be an exact UTC timestamp");
  }
  identifier(source.submission_id, "submission_id");
  identifier(source.work_order_id, "work_order_id");

  const lifecycle = record(source.lifecycle, "lifecycle");
  exactKeys(lifecycle, LIFECYCLE_KEYS, "lifecycle");
  for (const key of LIFECYCLE_KEYS) {
    if (!ENUMS[key].has(lifecycle[key])) fail(`${key} is invalid`);
  }

  const evidence = record(source.evidence, "evidence");
  exactKeys(evidence, EVIDENCE_KEYS, "evidence");
  identifier(evidence.submission_receipt_id, "submission_receipt_id");
  for (const key of EVIDENCE_KEYS.filter((item) => item !== "submission_receipt_id")) {
    identifier(evidence[key], key, true);
  }

  const accepted = lifecycle.submission_status === "accepted_for_review";
  const quoteActive = lifecycle.quote_status !== "none";
  const quoteResponse = ["provider_authentication_required", "quote_available", "rejected"].includes(lifecycle.quote_status);
  const acceptanceActive = lifecycle.acceptance_status !== "none";
  const paymentActive = lifecycle.payment_status !== "none";
  const paymentConfirmed = lifecycle.payment_status === "confirmed";
  const executionActive = lifecycle.execution_status !== "none";
  const dispatched = lifecycle.execution_status === "dispatched";
  const completionActive = lifecycle.completion_status !== "none";

  if (!accepted) {
    if (quoteActive || acceptanceActive || paymentActive || executionActive || completionActive) {
      fail("rejected submission cannot have later lifecycle state");
    }
  }
  if (quoteActive && !accepted) fail("quote state requires accepted submission");
  if (acceptanceActive && lifecycle.quote_status !== "quote_available") {
    fail("acceptance state requires quote_available");
  }
  if (paymentActive && lifecycle.acceptance_status !== "accepted") {
    fail("payment state requires requester acceptance");
  }
  if (executionActive && lifecycle.payment_status !== "confirmed") {
    fail("execution state requires confirmed payment");
  }
  if (completionActive && lifecycle.execution_status !== "dispatched") {
    fail("completion state requires dispatch");
  }

  if (lifecycle.quote_status === "rejected" && (acceptanceActive || paymentActive || executionActive || completionActive)) {
    fail("rejected quote must be terminal");
  }
  if (lifecycle.acceptance_status === "rejected" && (paymentActive || executionActive || completionActive)) {
    fail("rejected acceptance must be terminal");
  }
  if (lifecycle.payment_status === "rejected" && (executionActive || completionActive)) {
    fail("rejected payment must be terminal");
  }
  if (lifecycle.execution_status === "rejected" && completionActive) {
    fail("rejected execution must be terminal");
  }

  requireRef(evidence, "quote_handoff_id", quoteActive);
  requireRef(evidence, "quote_id", quoteResponse);
  requireRef(evidence, "provider_response_id", quoteResponse);
  requireRef(evidence, "acceptance_id", acceptanceActive);
  requireRef(evidence, "payment_authorization_id", paymentActive);
  requireRef(evidence, "payment_receipt_id", paymentConfirmed);
  requireRef(evidence, "execution_authorization_id", executionActive);
  requireRef(evidence, "dispatch_id", dispatched);
  requireRef(evidence, "completion_receipt_id", completionActive);

  return JSON.parse(JSON.stringify(source));
}

export function derivePhase(lifecycle) {
  if (lifecycle.submission_status === "rejected") return "rejected";
  if (lifecycle.quote_status === "rejected") return "rejected";
  if (lifecycle.acceptance_status === "rejected") return "rejected";
  if (lifecycle.payment_status === "rejected") return "rejected";
  if (lifecycle.execution_status === "rejected") return "rejected";
  if (lifecycle.completion_status === "failed") return "failed";
  if (lifecycle.completion_status === "completed") return "completed";
  if (lifecycle.execution_status === "dispatched") return "dispatched";
  if (lifecycle.execution_status === "authorized") return "execution_authorized";
  if (lifecycle.payment_status === "confirmed") return "payment_confirmed";
  if (lifecycle.payment_status === "authorized") return "payment_authorized";
  if (lifecycle.acceptance_status === "accepted") return "requester_accepted";
  if (lifecycle.quote_status === "quote_available") return "quote_available";
  if (lifecycle.quote_status === "provider_authentication_required") return "provider_authentication_required";
  if (lifecycle.quote_status === "ready_for_provider_quote") return "ready_for_provider_quote";
  return "accepted_for_review";
}

const NEXT_ACTION = {
  accepted_for_review: "await_provider_quote_handoff",
  ready_for_provider_quote: "capture_provider_selection_and_authenticated_quote",
  provider_authentication_required: "capture_real_provider_selection_and_authentication_prerequisite",
  quote_available: "await_requester_quote_acceptance",
  requester_accepted: "await_payment_authorization",
  payment_authorized: "await_payment_confirmation",
  payment_confirmed: "await_work_execution_authorization",
  execution_authorized: "await_work_dispatch",
  dispatched: "await_completion_receipt",
  completed: "none",
  rejected: "none",
  failed: "none",
};

export function materializeOrderStatus(input) {
  const source = validateSource(input);
  const phase = derivePhase(source.lifecycle);
  const sourceSha256 = sha256Canonical(source);
  const evidenceCount = Object.values(source.evidence).filter((value) => value !== null).length;
  const basis = {
    marker: STATUS_MARKER,
    version: 1,
    observed_at_utc: source.observed_at_utc,
    submission_id: source.submission_id,
    work_order_id: source.work_order_id,
    phase,
    lifecycle: source.lifecycle,
    evidence: source.evidence,
    source_sha256: sourceSha256,
  };
  return {
    marker: STATUS_MARKER,
    version: 1,
    status_id: `voidaos1_${sha256Canonical(basis)}`,
    observed_at_utc: source.observed_at_utc,
    submission_id: source.submission_id,
    work_order_id: source.work_order_id,
    phase,
    terminal: ["completed", "rejected", "failed"].includes(phase),
    successful: phase === "completed",
    next_action: NEXT_ACTION[phase],
    lifecycle: source.lifecycle,
    evidence: source.evidence,
    evidence_count: evidenceCount,
    source_sha256: sourceSha256,
    authority: {
      authenticated_submission_post: false,
      provider_selection: false,
      provider_authentication: false,
      quote_publication: false,
      quote_acceptance: false,
      payment_authorization: false,
      payment_execution: false,
      work_execution_authorization: false,
      work_dispatch: false,
      work_credit_write: false,
      runtime_mutation: false,
    },
  };
}

function atomicWrite(path, value) {
  const output = resolve(path);
  mkdirSync(dirname(output), { recursive: true, mode: 0o700 });
  const temporary = `${output}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  chmodSync(temporary, 0o600);
  renameSync(temporary, output);
  return output;
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(resolve(path), "utf8"));
  } catch (error) {
    fail(`${label} could not be read: ${error.message}`);
  }
}

function usage() {
  console.log([
    "VOID public-agent order status readonly V1",
    "",
    "  materialize <source.json> <status.json>",
    "  verify <source.json> <status.json>",
    "  example <status.json>",
  ].join("\n"));
}

function main(argv) {
  const [command, first, second] = argv;
  if (!command || command === "--help") {
    usage();
    return;
  }
  if (command === "materialize") {
    if (!first || !second) fail("materialize requires source and output paths");
    const status = materializeOrderStatus(readJson(first, "source"));
    const output = atomicWrite(second, status);
    console.log(`phase=${status.phase}`);
    console.log(`status_id=${status.status_id}`);
    console.log(`output=${output}`);
    console.log("mutation_performed=false");
    console.log("VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_V1_COMPLETE=true");
    return;
  }
  if (command === "verify") {
    if (!first || !second) fail("verify requires source and status paths");
    const expected = materializeOrderStatus(readJson(first, "source"));
    const actual = readJson(second, "status");
    if (canonical(expected) !== canonical(actual)) fail("status verification mismatch");
    console.log(`phase=${expected.phase}`);
    console.log("status_verified_exact=true");
    console.log("mutation_performed=false");
    console.log("VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_V1_COMPLETE=true");
    return;
  }
  if (command === "example") {
    if (!first || second) fail("example requires exactly one output path");
    const status = materializeOrderStatus(EXAMPLE_SOURCE_V1);
    const output = atomicWrite(first, status);
    console.log(`phase=${status.phase}`);
    console.log(`output=${output}`);
    console.log("mutation_performed=false");
    console.log("VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_V1_COMPLETE=true");
    return;
  }
  fail(`unknown command: ${command}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(`HOLD: ${error.message}`);
    process.exitCode = 1;
  }
}
