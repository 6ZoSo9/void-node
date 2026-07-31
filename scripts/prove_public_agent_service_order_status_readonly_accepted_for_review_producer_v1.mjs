#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  INPUT_MARKER,
  MARKER,
  SOURCE_MARKER,
  SUBMISSION_ADMISSION_MARKER,
  SUBMISSION_RECEIPT_MARKER,
  SUBMISSION_REQUEST_MARKER,
  VERSION,
  WORK_ORDER_MARKER,
  canonical,
  evaluateAcceptedForReviewProducerV1,
  materializeAcceptedForReviewSourceV1,
} from "../tools/void-public-agent-service-order-status-readonly-accepted-for-review-producer-v1.mjs";
import {
  materializeOrderStatus,
} from "../tools/void-public-agent-service-order-status-readonly-v1.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");
const examplePath = path.join(
  repoRoot,
  "examples",
  "public-agent-service-order-status-readonly-accepted-for-review-producer-v1.example.json",
);
const schemaPath = path.join(
  repoRoot,
  "schemas",
  "public-agent-service-order-status-readonly-accepted-for-review-producer-v1.schema.json",
);
const toolPath = path.join(
  repoRoot,
  "tools",
  "void-public-agent-service-order-status-readonly-accepted-for-review-producer-v1.mjs",
);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function expectFailure(label, input, pattern) {
  assert.throws(
    () => evaluateAcceptedForReviewProducerV1(input),
    pattern,
    label,
  );
}

const example = JSON.parse(await readFile(examplePath, "utf8"));
const schema = JSON.parse(await readFile(schemaPath, "utf8"));
const toolSource = await readFile(toolPath, "utf8");

assert.equal(example.marker, INPUT_MARKER);
assert.equal(example.version, VERSION);
assert.equal(
  example.submission_request.marker,
  SUBMISSION_REQUEST_MARKER,
);
assert.equal(example.work_order.marker, WORK_ORDER_MARKER);
assert.equal(
  example.submission_receipt.marker,
  SUBMISSION_RECEIPT_MARKER,
);
assert.equal(
  example.submission_receipt.admission.marker,
  SUBMISSION_ADMISSION_MARKER,
);

const result = evaluateAcceptedForReviewProducerV1(example);
const repeated = evaluateAcceptedForReviewProducerV1(clone(example));
assert.equal(canonical(result), canonical(repeated));
assert.equal(result.marker, MARKER);
assert.equal(result.version, VERSION);
assert.match(result.producer_binding_id, /^voidaosafrp1_[0-9a-f]{64}$/);

const source = materializeAcceptedForReviewSourceV1(example);
assert.equal(canonical(result.source), canonical(source));
assert.equal(source.marker, SOURCE_MARKER);
assert.equal(source.version, 1);
assert.equal(
  source.observed_at_utc,
  example.submission_receipt.received_at_utc,
);
assert.equal(
  source.submission_id,
  example.submission_request.submission_id,
);
assert.equal(source.work_order_id, example.work_order.work_order_id);
assert.deepEqual(source.lifecycle, {
  submission_status: "accepted_for_review",
  quote_status: "none",
  acceptance_status: "none",
  payment_status: "none",
  execution_status: "none",
  completion_status: "none",
});
assert.deepEqual(source.evidence, {
  submission_receipt_id: example.submission_receipt.receipt_id,
  quote_handoff_id: null,
  quote_id: null,
  provider_response_id: null,
  acceptance_id: null,
  payment_authorization_id: null,
  payment_receipt_id: null,
  execution_authorization_id: null,
  dispatch_id: null,
  completion_receipt_id: null,
});

const status = materializeOrderStatus(source);
assert.equal(status.phase, "accepted_for_review");
assert.equal(status.next_action, "await_provider_quote_handoff");
assert.equal(status.terminal, false);
assert.equal(status.successful, false);
assert.equal(status.evidence_count, 1);

for (const value of Object.values(result.authority)) {
  assert.equal(value, false);
}

assert.equal(
  schema["x-void-contract"].marker_const,
  MARKER,
);
assert.equal(schema["x-void-contract"].version_const, VERSION);
assert.equal(
  schema["x-void-contract"].source_marker_const,
  SOURCE_MARKER,
);
assert.equal(
  schema["x-void-contract"].phase_const,
  "accepted_for_review",
);
assert.equal(
  schema["x-void-contract"].next_action_const,
  "await_provider_quote_handoff",
);
assert.equal(
  schema["x-void-contract"].source_file_write_authority,
  false,
);
assert.equal(
  schema["x-void-contract"].configuration_authority,
  false,
);
assert.equal(
  schema["x-void-contract"].activation_authority,
  false,
);

{
  const input = clone(example);
  input.marker = "WRONG";
  expectFailure("wrong input marker", input, /input_identity_mismatch/);
}
{
  const input = clone(example);
  input.extra = true;
  expectFailure("unknown input field", input, /unknown_or_missing_fields/);
}
{
  const input = clone(example);
  input.submission_request.marker = "WRONG";
  expectFailure(
    "wrong request marker",
    input,
    /submission_request_identity_mismatch/,
  );
}
{
  const input = clone(example);
  input.work_order.marker = "WRONG";
  expectFailure(
    "wrong work-order marker",
    input,
    /work_order_identity_mismatch/,
  );
}
{
  const input = clone(example);
  input.submission_receipt.marker = "WRONG";
  expectFailure(
    "wrong receipt marker",
    input,
    /submission_receipt_identity_mismatch/,
  );
}
{
  const input = clone(example);
  input.submission_request.work_order.nonce = "changed";
  expectFailure(
    "nested work-order mismatch",
    input,
    /nested_work_order_mismatch/,
  );
}
{
  const input = clone(example);
  input.submission_receipt.submission_id = "different";
  expectFailure("submission mismatch", input, /submission_id_mismatch/);
}
{
  const input = clone(example);
  input.submission_receipt.work_order_id =
    `voidawo1_${"1".repeat(64)}`;
  expectFailure(
    "receipt work-order mismatch",
    input,
    /receipt_work_order_id_mismatch/,
  );
}
{
  const input = clone(example);
  input.submission_receipt.admission.work_order_id =
    `voidawo1_${"2".repeat(64)}`;
  expectFailure(
    "admission work-order mismatch",
    input,
    /admission_work_order_id_mismatch/,
  );
}
{
  const input = clone(example);
  input.submission_receipt.admission.decision = "rejected";
  expectFailure(
    "rejected admission",
    input,
    /admission_not_accepted_for_review/,
  );
}
{
  const input = clone(example);
  input.submission_receipt.authorization_verified = false;
  expectFailure(
    "unverified authorization",
    input,
    /authorization_not_verified/,
  );
}
{
  const input = clone(example);
  input.submission_receipt.duplicate = true;
  expectFailure(
    "duplicate receipt",
    input,
    /duplicate_receipt_refused/,
  );
}
{
  const input = clone(example);
  input.submission_receipt.authority.provider_selected = true;
  expectFailure(
    "receipt authority",
    input,
    /authority_must_be_false/,
  );
}
{
  const input = clone(example);
  input.submission_receipt.admission.authority.quote_created = true;
  expectFailure(
    "admission authority",
    input,
    /authority_must_be_false/,
  );
}
{
  const input = clone(example);
  input.submission_request.submission_id = "../unsafe";
  input.submission_receipt.submission_id = "../unsafe";
  expectFailure("unsafe submission ID", input, /invalid_identifier/);
}
{
  const input = clone(example);
  input.submission_receipt.receipt_id = "not-a-receipt";
  expectFailure("invalid receipt ID", input, /invalid_identifier/);
}
{
  const input = clone(example);
  input.submission_receipt.admission.evaluated_at_utc =
    "2026-07-25T21:00:00Z";
  expectFailure(
    "admission before creation",
    input,
    /admission_outside_work_order_window/,
  );
}
{
  const input = clone(example);
  input.submission_receipt.received_at_utc =
    "2026-07-27T00:00:00Z";
  expectFailure(
    "receipt after expiry",
    input,
    /receipt_outside_work_order_window/,
  );
}

for (const forbidden of [
  "writeFile",
  "writeFileSync",
  "rename",
  "renameSync",
  "mkdir",
  "mkdirSync",
  "chmod",
  "chmodSync",
  "systemctl",
  "child_process",
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_HTTP_INTEGRATION_V1_ENABLED",
]) {
  assert.equal(
    toolSource.includes(forbidden),
    false,
    `pure producer tool contains forbidden capability: ${forbidden}`,
  );
}

const temp = await mkdtemp(
  path.join(os.tmpdir(), "void-order-status-afr-producer-v1-"),
);
try {
  const inputPath = path.join(temp, "input.json");
  await writeFile(
    inputPath,
    `${JSON.stringify(example, null, 2)}\n`,
    { mode: 0o600 },
  );
  const cli = spawnSync(
    process.execPath,
    [toolPath, "evaluate", "--input", inputPath],
    { cwd: repoRoot, encoding: "utf8" },
  );
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(
    canonical(JSON.parse(cli.stdout)),
    canonical(result),
  );
} finally {
  await rm(temp, { recursive: true, force: true });
}

console.log(`producer_binding_id=${result.producer_binding_id}`);
console.log(`phase=${status.phase}`);
console.log(`next_action=${status.next_action}`);
console.log("source_file_write_authority=false");
console.log("configuration_authority=false");
console.log("service_restart_authority=false");
console.log("activation_authority=false");
console.log(
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_ACCEPTED_FOR_REVIEW_PRODUCER_V1_PROOF_GREEN=true",
);
