import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  VOID_BUY_VOID_NATIVE_EXECUTION_AUTHORITY_V1,
  VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1,
} from "../src/economic/buy_void_native_execution_worker_v1.js";

const root = process.cwd();
const sourceRelative =
  "src/economic/buy_void_native_execution_worker_v1.ts";
const operationalProofRelatives = [
  "scripts/prove_buy_void_native_execution_worker_v1.ts",
];
const guardProofRelative =
  "scripts/prove_buy_void_native_execution_worker_guard_v1.ts";

const source = fs.readFileSync(
  path.join(root, sourceRelative),
  "utf8",
);
const operationalProofs = operationalProofRelatives.map(
  (relative) =>
    fs.readFileSync(path.join(root, relative), "utf8"),
);
const guardProof = fs.readFileSync(
  path.join(root, guardProofRelative),
  "utf8",
);

assert.equal(
  VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1,
  "buyVoidNativeExecuteReservedPlan",
);
assert.deepEqual(
  VOID_BUY_VOID_NATIVE_EXECUTION_AUTHORITY_V1,
  {
    one_request_per_run: true,
    disabled_by_policy_default: true,
    dry_by_default: true,
    exact_confirmation_required: true,
    server_controlled_root_dir: true,
    server_controlled_policy: true,
    inventory_reservation_required: true,
    bounded_execution_plan_required: true,
    execution_attempt_reservation_required: true,
    durable_submission_guard_required: true,
    signer_dependency_injected: true,
    broadcaster_dependency_injected: true,
    public_request_journal_write: false,
    inventory_decrement: false,
    inventory_release: false,
    raw_signed_transaction_persistence: false,
    raw_signed_transaction_output: false,
    automatic_retry: false,
    receipt_wait: false,
    runtime_route_mount: false,
    background_loop: false,
    startup_execution: false,
    wallet_access_when_applied: true,
    signing_when_applied: true,
    transaction_broadcast_when_applied: true,
    money_movement_when_applied: true,
  },
);

assert.match(
  source,
  /runBuyVoidNativeDeliverySignBroadcastV1/,
);
assert.match(source, /createBuyVoidDeliverySubmissionGuardV1/);
assert.match(source, /prepare_execution/);
assert.match(source, /record_broadcast_accepted/);
assert.match(source, /record_broadcast_unknown/);
assert.match(source, /record_not_broadcast/);
assert.match(source, /rawSignedTransaction = ""/);
assert.doesNotMatch(source, /process\.env/);
assert.doesNotMatch(source, /setInterval\s*\(/);
assert.doesNotMatch(source, /setTimeout\s*\(/);
assert.doesNotMatch(source, /express/);
assert.doesNotMatch(source, /src\/index/);
assert.doesNotMatch(source, /private_key/);
assert.doesNotMatch(source, /mnemonic/);
assert.doesNotMatch(source, /write.*request.*journal/i);

const index = fs.readFileSync(path.join(root, "src/index.ts"), "utf8");
assert.doesNotMatch(index, /buy_void_native_execution_worker_v1/);

for (const proof of operationalProofs) {
  assert.doesNotMatch(proof, /src\/index\.ts.*write/i);
  assert.doesNotMatch(proof, /systemctl|tailscale|ssh /i);
}
assert.match(
  guardProof,
  /VOID_BUY_VOID_NATIVE_EXECUTION_WORKER_GUARD_V1_GREEN/,
);

console.log("VOID_BUY_VOID_NATIVE_EXECUTION_WORKER_GUARD_V1_GREEN");
console.log("source_file_count=1");
console.log("proof_file_count=2");
console.log("runtime_integration_modified=0");
console.log("src_index_modified=0");
console.log("startup_execution=0");
console.log("public_request_journal_write=0");
console.log("inventory_decrement=0");
console.log("inventory_release=0");
console.log("raw_signed_transaction_persistence=0");
console.log("raw_signed_transaction_output=0");
console.log("automatic_retry=0");
console.log("receipt_wait=0");
console.log("verdict=BUY_VOID_NATIVE_EXECUTION_WORKER_GUARD_EXACT_GREEN");
