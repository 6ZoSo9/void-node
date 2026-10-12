#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  EXAMPLE_SOURCE_V1,
  STATUS_MARKER,
  canonical,
  derivePhase,
  materializeOrderStatus,
  validateSource,
} from "../tools/void-public-agent-service-order-status-readonly-v1.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const EXAMPLE = join(ROOT, "examples/public-agent-service-order-status-readonly-v1.example.json");
const SCHEMA = join(ROOT, "schemas/public-agent-service-order-status-readonly-v1.schema.json");
const DOC = join(ROOT, "docs/public-agent/public-agent-service-order-status-readonly-v1.md");
const WORKFLOW = join(ROOT, ".github/workflows/public-agent-service-order-status-readonly-v1.yml");
const TOOL = join(ROOT, "tools/void-public-agent-service-order-status-readonly-v1.mjs");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function run(args, options = {}) {
  const result = spawnSync("node", [TOOL, ...args], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  if (options.status !== undefined) {
    assert.equal(result.status, options.status, result.stderr || result.stdout);
  } else {
    assert.equal(result.status, 0, result.stderr || result.stdout);
  }
  return result;
}

const example = JSON.parse(readFileSync(EXAMPLE, "utf8"));
const expected = materializeOrderStatus(EXAMPLE_SOURCE_V1);
assert.equal(canonical(example), canonical(expected));
assert.equal(example.marker, STATUS_MARKER);
assert.equal(example.phase, "provider_authentication_required");
assert.equal(example.next_action, "capture_real_provider_selection_and_authentication_prerequisite");
assert.equal(example.terminal, false);
assert.equal(example.successful, false);
assert.equal(example.evidence_count, 4);
assert.match(example.status_id, /^voidaos1_[0-9a-f]{64}$/);
assert.match(example.source_sha256, /^[0-9a-f]{64}$/);
assert.ok(Object.values(example.authority).every((value) => value === false));
assert.equal(canonical(materializeOrderStatus(EXAMPLE_SOURCE_V1)), canonical(materializeOrderStatus(EXAMPLE_SOURCE_V1)));

const phases = [];
function phase(source) {
  const result = materializeOrderStatus(source);
  phases.push(result.phase);
  return result;
}

const accepted = clone(EXAMPLE_SOURCE_V1);
accepted.lifecycle.quote_status = "none";
accepted.evidence.quote_handoff_id = null;
accepted.evidence.quote_id = null;
accepted.evidence.provider_response_id = null;
phase(accepted);

const ready = clone(accepted);
ready.lifecycle.quote_status = "ready_for_provider_quote";
ready.evidence.quote_handoff_id = "voidawqh1_progression";
phase(ready);

phase(EXAMPLE_SOURCE_V1);

const available = clone(EXAMPLE_SOURCE_V1);
available.lifecycle.quote_status = "quote_available";
phase(available);

const requesterAccepted = clone(available);
requesterAccepted.lifecycle.acceptance_status = "accepted";
requesterAccepted.evidence.acceptance_id = "voidawa1_progression";
phase(requesterAccepted);

const paymentAuthorized = clone(requesterAccepted);
paymentAuthorized.lifecycle.payment_status = "authorized";
paymentAuthorized.evidence.payment_authorization_id = "voidawpa1_progression";
phase(paymentAuthorized);

const paymentConfirmed = clone(paymentAuthorized);
paymentConfirmed.lifecycle.payment_status = "confirmed";
paymentConfirmed.evidence.payment_receipt_id = "voidawpr1_progression";
phase(paymentConfirmed);

const executionAuthorized = clone(paymentConfirmed);
executionAuthorized.lifecycle.execution_status = "authorized";
executionAuthorized.evidence.execution_authorization_id = "voidawea1_progression";
phase(executionAuthorized);

const dispatched = clone(executionAuthorized);
dispatched.lifecycle.execution_status = "dispatched";
dispatched.evidence.dispatch_id = "voidawd1_progression";
phase(dispatched);

const completed = clone(dispatched);
completed.lifecycle.completion_status = "completed";
completed.evidence.completion_receipt_id = "voidawcr1_progression";
const completedStatus = phase(completed);
assert.equal(completedStatus.terminal, true);
assert.equal(completedStatus.successful, true);
assert.equal(completedStatus.next_action, "none");

assert.deepEqual(phases, [
  "accepted_for_review", "ready_for_provider_quote",
  "provider_authentication_required", "quote_available",
  "requester_accepted", "payment_authorized", "payment_confirmed",
  "execution_authorized", "dispatched", "completed",
]);

const rejected = clone(available);
rejected.lifecycle.acceptance_status = "rejected";
rejected.evidence.acceptance_id = "voidawa1_rejected";
const rejectedStatus = materializeOrderStatus(rejected);
assert.equal(rejectedStatus.phase, "rejected");
assert.equal(rejectedStatus.terminal, true);
assert.equal(rejectedStatus.successful, false);
assert.equal(rejectedStatus.next_action, "none");

const invalidPayment = clone(available);
invalidPayment.lifecycle.payment_status = "confirmed";
invalidPayment.evidence.payment_authorization_id = "voidawpa1_invalid";
invalidPayment.evidence.payment_receipt_id = "voidawpr1_invalid";
assert.throws(() => validateSource(invalidPayment), /requires requester acceptance/);

const invalidCompletion = clone(paymentConfirmed);
invalidCompletion.lifecycle.completion_status = "completed";
invalidCompletion.evidence.completion_receipt_id = "voidawcr1_invalid";
assert.throws(() => validateSource(invalidCompletion), /requires dispatch/);

const leakedEvidence = clone(accepted);
leakedEvidence.evidence.payment_receipt_id = "voidawpr1_too_early";
assert.throws(() => validateSource(leakedEvidence), /must be null before/);

const unknownKey = clone(EXAMPLE_SOURCE_V1);
unknownKey.secret = "forbidden";
assert.throws(() => validateSource(unknownKey), /keys mismatch/);

const changed = clone(EXAMPLE_SOURCE_V1);
changed.observed_at_utc = "2030-01-01T00:00:05Z";
const changedStatus = materializeOrderStatus(changed);
assert.notEqual(changedStatus.source_sha256, example.source_sha256);
assert.notEqual(changedStatus.status_id, example.status_id);

const schema = JSON.parse(readFileSync(SCHEMA, "utf8"));
assert.equal(schema.properties.marker.const, STATUS_MARKER);
assert.equal(schema.properties.version.const, 1);
assert.deepEqual(schema.properties.phase.enum, [
  "accepted_for_review", "ready_for_provider_quote",
  "provider_authentication_required", "quote_available",
  "requester_accepted", "payment_authorized", "payment_confirmed",
  "execution_authorized", "dispatched", "completed", "rejected", "failed",
]);
assert.ok(Object.values(schema.properties.authority.properties).every((value) => value.const === false));

for (const path of [DOC, WORKFLOW]) {
  const text = readFileSync(path, "utf8");
  assert.ok(text.includes(STATUS_MARKER) || text.includes("public-agent-service-order-status-readonly-v1"));
}

const temporary = mkdtempSync(join(tmpdir(), "void-order-status-proof-"));
try {
  const sourcePath = join(temporary, "source.json");
  const statusPath = join(temporary, "status.json");
  writeFileSync(sourcePath, `${JSON.stringify(EXAMPLE_SOURCE_V1, null, 2)}\n`);
  const materialize = run(["materialize", sourcePath, statusPath]);
  assert.ok(materialize.stdout.includes("VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_V1_COMPLETE=true"));
  const verify = run(["verify", sourcePath, statusPath]);
  assert.ok(verify.stdout.includes("status_verified_exact=true"));
  assert.equal(canonical(JSON.parse(readFileSync(statusPath, "utf8"))), canonical(example));
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

console.log("example_exact_green=true");
console.log("deterministic_materialization_green=true");
console.log("lifecycle_progression_green=true");
console.log("terminal_rejection_and_completion_green=true");
console.log("illegal_transition_refusal_green=true");
console.log("early_evidence_refusal_green=true");
console.log("unknown_field_refusal_green=true");
console.log("provenance_binding_green=true");
console.log("schema_contract_green=true");
console.log("cli_materialize_verify_green=true");
console.log("all_authority_false_green=true");
console.log("VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_V1_PROOF_GREEN=true");
