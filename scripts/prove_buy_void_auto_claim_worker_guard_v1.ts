import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const observerPath = path.join(
  root,
  "src/economic/buy_void_payment_rpc_observer_v1.ts",
);
const workerPath = path.join(
  root,
  "src/economic/buy_void_auto_claim_worker_v1.ts",
);
const workflowPath = path.join(
  root,
  ".github/workflows/buy-void-auto-claim-worker-v1.yml",
);
const documentationPath = path.join(
  root,
  "docs/operators/buy-void-auto-claim-worker-v1.md",
);

for (const file of [
  observerPath,
  workerPath,
  workflowPath,
  documentationPath,
]) {
  assert.equal(fs.existsSync(file), true, `missing ${file}`);
}

const observer = fs.readFileSync(observerPath, "utf8");
const worker = fs.readFileSync(workerPath, "utf8");
const workflow = fs.readFileSync(workflowPath, "utf8");
const documentation = fs.readFileSync(documentationPath, "utf8");
const source = `${observer}\n${worker}`;

for (const required of [
  '"VOID_BUY_VOID_PAYMENT_RPC_OBSERVER_V1"',
  '"eth_chainId"',
  '"eth_getTransactionReceipt"',
  '"eth_blockNumber"',
  "rpc_write: false",
  "wallet_access: false",
  "signing: false",
  "transaction_broadcast: false",
  "filesystem_write: false",
  "runtime_route_mount: false",
  "background_loop: false",
  "money_movement: false",
  '"VOID_BUY_VOID_AUTO_CLAIM_WORKER_V1"',
  '"buyVoidAutoClaimPayment"',
  "one_request_per_run: true",
  "disabled_by_policy_default: true",
  "dry_by_default: true",
  "exact_confirmation_required: true",
  "request_journal_write: false",
  "inventory_decrement: false",
  '"payment_submitted_pending_manual_review"',
  "observeBuyVoidPaymentV1",
  "buildBuyVoidVerifiedPaymentEventV2",
  "decideBuyVoidAutoFulfillmentV1",
  "listBuyVoidFulfillmentJournalClaimsV1",
  "claimBuyVoidFulfillmentJournalV1",
  'status: "payment_verified_fulfillment_claimed"',
  "automatic_delivery_started: false",
  "signing_performed: false",
  "transaction_broadcast: false",
]) {
  assert.equal(source.includes(required), true, `missing source wall: ${required}`);
}

for (const forbidden of [
  /private[_ -]?key/i,
  /mnemonic/i,
  /seed[_ -]?phrase/i,
  /eth_sendRawTransaction/i,
  /eth_sendTransaction/i,
  /signTransaction/i,
  /sendRawTransaction/i,
  /setInterval\s*\(/,
  /setTimeout\s*\(/,
  /app\.(?:post|put|patch|delete)\s*\(/,
  /router\.(?:post|put|patch|delete)\s*\(/,
  /process\.env/,
  /child_process/,
  /execSync\s*\(/,
  /spawn\s*\(/,
]) {
  assert.equal(forbidden.test(source), false, `forbidden source pattern: ${forbidden}`);
}

assert.equal(observer.includes('from "node:fs"'), false);
assert.equal(worker.includes('from "node:fs"'), false);
assert.equal(worker.includes('from "node:http"'), false);
assert.equal(worker.includes('from "node:https"'), false);
assert.equal(source.includes("src/index.ts"), false);

for (const required of [
  "src/economic/buy_void_payment_rpc_observer_v1.ts",
  "src/economic/buy_void_auto_claim_worker_v1.ts",
  "scripts/prove_buy_void_auto_claim_worker_v1.ts",
  "scripts/prove_buy_void_auto_claim_worker_guard_v1.ts",
  "npx tsc",
  "npx tsx scripts/prove_buy_void_auto_claim_worker_v1.ts",
  "npx tsx scripts/prove_buy_void_auto_claim_worker_guard_v1.ts",
  "npm run build",
  "git diff --check",
]) {
  assert.equal(workflow.includes(required), true, `missing workflow wall: ${required}`);
}

for (const required of [
  "disabled by default",
  "one request per invocation",
  "does not reserve aggregate inventory",
  "does not sign or broadcast",
  "does not deliver VOID",
  "buyVoidAutoClaimPayment",
  "payment_submitted_pending_manual_review",
]) {
  assert.equal(
    documentation.toLowerCase().includes(required.toLowerCase()),
    true,
    `missing documentation wall: ${required}`,
  );
}

console.log("VOID_BUY_VOID_AUTO_CLAIM_WORKER_GUARD_V1_GREEN");
console.log("source_file_count=2");
console.log("proof_file_count=2");
console.log("runtime_integration_modified=0");
console.log("src_index_modified=0");
console.log("startup_execution=0");
console.log("wallet_access=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("inventory_decrement=0");
console.log("request_journal_write=0");
console.log("verdict=BUY_VOID_AUTO_CLAIM_WORKER_GUARD_EXACT_GREEN");
