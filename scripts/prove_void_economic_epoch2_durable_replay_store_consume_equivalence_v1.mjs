#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const MARKER = "VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_CONSUME_EQUIVALENCE_V1";
const SOURCE_PATH = "tools/void-economic-epoch2-durable-replay-store-v1.mjs";
const GATEWAY_PATH = "tools/void-economic-epoch2-public-submission-gateway-v1.mjs";
const BRIDGE_PATH = "ops/mainnet0/economic-epoch2-durable-replay-store-consume-equivalence-v1.json";
const EVIDENCE_PATH = "ops/mainnet0/economic-epoch2-production-gateway-replay-binding-runtime-evidence-v1.json";
const IMPORT_PATH = "ops/mainnet0/economic-epoch2-production-gateway-replay-binding-runtime-evidence-import-v1.json";
const PREDECESSOR_COMMIT = "24806b94cbaf3ea19d206ce542f4804cce5112db";
const PREDECESSOR_BLOB = "2e4481fbf45200121356f39c278eac5b05a33596";
const SUCCESSOR_BLOB = "2b267e11d087bec0e0a56825dce9f998d5bc3ad5";
const EVIDENCE_SHA256 = "9dcf63514e6bdb2daf2a099ef3676b04ed2cffc71699932190f590864f4e5d99";
const EVIDENCE_ID = "voide2gre1_0b6e8edc4220370e3e811f075063a6a7636fefb713f1be27e17aef319ae6719a";
const IMPORT_EVALUATED_AT = "2026-09-29T17:32:16Z";

function gitBlobSha1(bytes) {
  const header = Buffer.from("blob " + bytes.length + "\0", "utf8");
  return crypto.createHash("sha1").update(header).update(bytes).digest("hex");
}
function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function historicalBytes(commit, file) {
  return execFileSync("git", ["show", commit + ":" + file], { maxBuffer: 8 * 1024 * 1024 });
}
function extractBlock(source, needle) {
  const start = source.indexOf(needle);
  assert.notEqual(start, -1, "missing source block: " + needle);
  const open = source.indexOf("{", start);
  assert.notEqual(open, -1, "missing opening brace: " + needle);
  let depth = 0;
  let mode = "code";
  let quote = "";
  let escaped = false;
  for (let i = open; i < source.length; i += 1) {
    const c = source[i];
    const n = source[i + 1] || "";
    if (mode === "line") { if (c === "\n") mode = "code"; continue; }
    if (mode === "block") { if (c === "*" && n === "/") { mode = "code"; i += 1; } continue; }
    if (mode === "string") {
      if (escaped) { escaped = false; continue; }
      if (c === "\\") { escaped = true; continue; }
      if (c === quote) { mode = "code"; quote = ""; }
      continue;
    }
    if (mode === "template") {
      if (escaped) { escaped = false; continue; }
      if (c === "\\") { escaped = true; continue; }
      if (c === "`") mode = "code";
      continue;
    }
    if (c === "/" && n === "/") { mode = "line"; i += 1; continue; }
    if (c === "/" && n === "*") { mode = "block"; i += 1; continue; }
    if (c === "\"" || c === "'") { mode = "string"; quote = c; continue; }
    if (c === "`") { mode = "template"; continue; }
    if (c === "{") depth += 1;
    if (c === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error("unterminated source block: " + needle);
}

const predecessorBytes = historicalBytes(PREDECESSOR_COMMIT, SOURCE_PATH);
const successorBytes = fs.readFileSync(SOURCE_PATH);
assert.equal(gitBlobSha1(predecessorBytes), PREDECESSOR_BLOB);
assert.equal(gitBlobSha1(successorBytes), SUCCESSOR_BLOB);

const predecessorSource = predecessorBytes.toString("utf8");
const successorSource = successorBytes.toString("utf8");
const predecessorConsume = extractBlock(predecessorSource, "async consumeIfFresh");
const successorConsume = extractBlock(successorSource, "async consumeIfFresh");
assert.equal(successorConsume, predecessorConsume, "consumeIfFresh source drift");

const predecessorValidate = extractBlock(predecessorSource, "function validateExistingReceipt");
const successorInspect = extractBlock(successorSource, "function inspectExistingReceipt");
const successorValidate = extractBlock(successorSource, "function validateExistingReceipt");
assert.equal(
  successorValidate,
  "function validateExistingReceipt(receiptPath, digest, metadata) {\n  inspectExistingReceipt(receiptPath, digest, metadata);\n}",
);
const normalizedInspect = successorInspect
  .replace("function inspectExistingReceipt", "function validateExistingReceipt")
  .replace(
    /if \(error\?\.code === "ENOENT"\) \{\n\s+return Object\.freeze\(\{ present: false \}\);\n\s+\}/u,
    'if (error?.code === "ENOENT") return;',
  )
  .replace(/\n  return Object\.freeze\(\{ present: true \}\);\n\}/u, "\n}");
assert.equal(normalizedInspect, predecessorValidate, "receipt validation semantics drift");

const gatewaySource = fs.readFileSync(GATEWAY_PATH, "utf8");
assert.match(gatewaySource, /store\.consumeIfFresh\(/u);
assert.doesNotMatch(gatewaySource, /inspectConsumed\(/u);

const evidenceBytes = fs.readFileSync(EVIDENCE_PATH);
const evidence = JSON.parse(evidenceBytes);
const importReceipt = JSON.parse(fs.readFileSync(IMPORT_PATH, "utf8"));
assert.equal(sha256(evidenceBytes), EVIDENCE_SHA256);
assert.equal(evidence.evidence_id, EVIDENCE_ID);
assert.equal(importReceipt.evidence_id, EVIDENCE_ID);
assert.equal(importReceipt.evidence_file_sha256, EVIDENCE_SHA256);
assert.equal(importReceipt.import_evaluated_at_utc, IMPORT_EVALUATED_AT);

const derived = {
  schema: "void_economic_epoch2_durable_replay_store_consume_equivalence_v1",
  marker: MARKER,
  version: 1,
  repository: "6ZoSo9/void-node",
  source_path: SOURCE_PATH,
  predecessor: { source_commit_sha: PREDECESSOR_COMMIT, git_blob_sha1: PREDECESSOR_BLOB },
  successor: { git_blob_sha1: SUCCESSOR_BLOB, added_api: "inspectConsumed" },
  gateway: { source_path: GATEWAY_PATH, runtime_replay_api: "consumeIfFresh", inspect_consumed_called: false },
  equivalence: {
    consume_if_fresh_exact_source_match: true,
    receipt_validation_semantics_equivalent: true,
    validate_existing_receipt_delegate_only: true,
    atomic_consume_path_changed: false,
    runtime_evidence_carry_forward_scope: "atomic_consume_path_only",
  },
  historical_runtime_evidence: {
    evidence_file: EVIDENCE_PATH,
    evidence_file_sha256: EVIDENCE_SHA256,
    evidence_id: EVIDENCE_ID,
    import_evaluated_at_utc: IMPORT_EVALUATED_AT,
  },
  authority: {
    source_equivalence_only: true,
    runtime_canary_reexecuted: false,
    negative_inspection_authority: false,
    atomic_consume_authority_changed: false,
    runtime_route_active: false,
    public_submission_open: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    migration_authorized: false,
    public_activation_authorized: false,
    funds_movement: false,
  },
};
const committed = JSON.parse(fs.readFileSync(BRIDGE_PATH, "utf8"));
assert.deepEqual(committed, derived);

console.log(MARKER + "_GREEN");
console.log("predecessor_git_blob_sha1=" + PREDECESSOR_BLOB);
console.log("successor_git_blob_sha1=" + SUCCESSOR_BLOB);
console.log("consume_if_fresh_exact_source_match=true");
console.log("receipt_validation_semantics_equivalent=true");
console.log("gateway_inspect_consumed_called=false");
console.log("runtime_canary_reexecuted=false");
console.log("runtime_evidence_carry_forward_scope=atomic_consume_path_only");
console.log("runtime_route_active=false");
console.log("public_submission_open=false");
console.log("authoritative_chain2050_write=false");
console.log("funds_movement=false");
