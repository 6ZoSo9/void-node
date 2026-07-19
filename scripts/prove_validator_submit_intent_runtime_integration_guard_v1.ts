import assert from "node:assert/strict";
import fs from "node:fs";

const integration = fs.readFileSync(
  "src/validator/validator_submit_intent_runtime_integration_v1.ts",
  "utf8",
);
const index = fs.readFileSync("src/index.ts", "utf8");

const startMarker = "/* __void_mainnet0_validator_registration_submit_live_api_v1 */";
const endMarker = "/* __void_mainnet0_validator_registration_submit_stub_api_v1 */";
const start = index.indexOf(startMarker);
const end = index.indexOf(endMarker, start + startMarker.length);
assert.ok(start >= 0 && end > start, "live submit route window missing");
const live = index.slice(start, end);

assert.match(index, /validator_submit_intent_runtime_integration_v1\.js/);
assert.match(index, /VOID_VALIDATOR_SUBMIT_INTENT_RUNTIME_INTEGRATION_V1/);
assert.match(live, /VOID_VALIDATOR_SUBMIT_INTENT_DURABLE_JOURNAL/);
assert.match(live, /VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_PATH/);
assert.match(live, /new ValidatorSubmitIntentRuntimeIntegrationV1/);
assert.match(live, /\.reserve\(/);
assert.match(live, /\.releaseBeforeBroadcast\(/);
assert.match(live, /\.beginBroadcast\(/);
assert.match(live, /\.observeTransaction\(/);
assert.match(live, /\.observeReceipt\(/);
assert.match(live, /\.releaseFailedReceipt\(/);
assert.match(live, /\.commitSuccessfulReceipt\(/);
assert.doesNotMatch(live, /double-submit-guard["'`],\s*\{\s*mode:\s*["'`]reserve/);
assert.doesNotMatch(live, /automatic_rebroadcast_allowed\s*:\s*true/);
assert.doesNotMatch(live, /VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_PATH[^\n]*(?:\.runtime|process\.cwd|HOME)/);

const reserveAt = live.indexOf(".reserve(");
const preCountAt = live.indexOf('const beforeCandidate = cast(["call"');
const beginAt = live.indexOf(".beginBroadcast(");
const sendAt = live.indexOf('const tx = cast([\n        "send"');
const txObservedAt = live.indexOf(".observeTransaction(");
const receiptObservedAt = live.indexOf(".observeReceipt(");
const invariantAt = live.indexOf('error:"post_transaction_invariant_failed"');
const commitAt = live.indexOf(".commitSuccessfulReceipt(");
assert.ok(reserveAt >= 0 && reserveAt < preCountAt, "durable reserve must precede pre-count reads");
assert.ok(preCountAt < beginAt, "pre-count reads must precede broadcast start");
assert.ok(beginAt < sendAt, "broadcast_started must be durable before cast send");
assert.ok(sendAt < txObservedAt, "transaction observation must follow cast send");
assert.ok(txObservedAt < receiptObservedAt, "receipt observation must follow transaction observation");
assert.ok(receiptObservedAt < invariantAt, "receipt must be durable before post-transaction invariant response");
assert.ok(invariantAt < commitAt, "commit must follow post-transaction invariant gate");

assert.match(integration, /explicit_operator_path_required:\s*true/);
assert.match(integration, /runtime_route_mount:\s*false/);
assert.match(integration, /rpc_call:\s*false/);
assert.match(integration, /wallet_access:\s*false/);
assert.match(integration, /signer_access:\s*false/);
assert.match(integration, /transaction_signing:\s*false/);
assert.match(integration, /transaction_broadcast:\s*false/);
assert.match(integration, /automatic_rebroadcast:\s*false/);
assert.match(integration, /active_validator_set_mutation:\s*false/);
assert.doesNotMatch(integration, /spawnSync|execFile|fetch\(|private-key|readFileSync\([^)]*signer/i);

console.log("VOID_VALIDATOR_SUBMIT_INTENT_RUNTIME_INTEGRATION_GUARD_V1_GREEN");
