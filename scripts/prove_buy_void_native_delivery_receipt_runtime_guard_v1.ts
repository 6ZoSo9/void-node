import assert from "node:assert/strict";
import fs from "node:fs";

const runtimePath =
  "src/economic/buy_void_native_delivery_receipt_runtime_v1.ts";
const integrationPath =
  "src/economic/buy_void_runtime_integration_v1.ts";
const proofPath =
  "scripts/prove_buy_void_native_delivery_receipt_runtime_v1.ts";
const guardPath =
  "scripts/prove_buy_void_native_delivery_receipt_runtime_guard_v1.ts";
const workflowPath =
  ".github/workflows/buy-void-native-delivery-receipt-runtime-v1.yml";
const docsPath =
  "docs/operators/buy-void-native-delivery-receipt-runtime-v1.md";

for (const file of [
  runtimePath,
  integrationPath,
  proofPath,
  guardPath,
  workflowPath,
  docsPath,
]) {
  assert.equal(fs.existsSync(file), true, `missing ${file}`);
}

const runtime = fs.readFileSync(runtimePath, "utf8");
const integration = fs.readFileSync(integrationPath, "utf8");
const workflow = fs.readFileSync(workflowPath, "utf8");
const docs = fs.readFileSync(docsPath, "utf8");

const importNeedle =
  'import "./buy_void_native_delivery_receipt_runtime_v1.js";';
assert.equal(
  integration.split(importNeedle).length - 1,
  0,
  "native receipt runtime must not be canonical-parent mounted",
);
assert.match(
  integration,
  /native_receipt_parent_mounted: false/,
);

for (const marker of [
  "VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_V1",
  "/__void/operator/buy-void-native-delivery-receipt-v1/status",
  "/__void/operator/buy-void-native-delivery-receipt-v1/command",
  "VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_ENABLED",
  "VOID_BUY_VOID_NATIVE_CHAIN2050_RPC_URL",
  "VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS",
  "VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_MIN_CONFIRMATIONS",
  "VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_CONFIRMATION_V1",
  "dry_run_allowed_while_disabled: true",
  "apply_allowed_while_disabled: false",
  "exact_confirmation_required_before_apply_io: true",
  "one_attempt_per_command: true",
  "attempt_id_only_selector: true",
  "server_controlled_rpc_url: true",
  "background_loop: false",
  "automatic_retry: false",
  "money_movement: false",
]) {
  assert.equal(runtime.includes(marker), true, `runtime marker missing: ${marker}`);
}

for (const forbiddenImport of [
  "buy_void_native_fulfillment_wallet_credential_signer_v1",
  "buy_void_native_delivery_sign_broadcast_adapter_v1",
  "buy_void_native_chain2050_broadcaster_v1",
  "native_value_transfer_block_executor_v1",
]) {
  assert.equal(
    runtime.includes(forbiddenImport),
    false,
    `forbidden authority import: ${forbiddenImport}`,
  );
}

assert.match(
  runtime,
  /if \(apply && input\.runtime_policy\.enabled !== true\)[\s\S]*?native_delivery_receipt_runtime_disabled/u,
);
assert.match(
  runtime,
  /explicit_confirmation_required[\s\S]*?reconstructIntent\(/u,
);
assert.match(
  runtime,
  /listBuyVoidFulfillmentJournalClaimsV1\(rootDir\)/u,
);
assert.match(
  runtime,
  /runBuyVoidNativeDeliveryReceiptReconcilerV1\(/u,
);
assert.match(
  runtime,
  /const allowed = new Set\(\["attempt_id", "apply", "confirmation"\]\)/u,
);

for (const file of [
  runtimePath,
  integrationPath,
  proofPath,
  guardPath,
  docsPath,
]) {
  assert.equal(workflow.includes(file), true, `workflow path missing: ${file}`);
}
for (const command of [
  "prove_buy_void_native_delivery_receipt_runtime_v1.ts",
  "prove_buy_void_native_delivery_receipt_runtime_guard_v1.ts",
  "prove_buy_void_native_delivery_receipt_reconciler_v1.ts",
  "check_void_ci_cost_boundary_v1.py",
  "check_index_size.sh",
  "npm run build",
]) {
  assert.equal(workflow.includes(command), true, `workflow command missing: ${command}`);
}

for (const statement of [
  "loopback-only",
  "disabled by default",
  "dry-run",
  "buyVoidReconcileNativeDeliveryReceipt",
  "No wallet",
  "no deployment",
  "no service restart",
  "no money movement",
]) {
  assert.equal(docs.includes(statement), true, `docs boundary missing: ${statement}`);
}

console.log("marker=VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_GUARD_V1");
console.log("runtime_source_retained=1");
console.log("runtime_parent_mount_count=0");
console.log("operator_loopback_only=1");
console.log("dry_run_while_disabled=1");
console.log("apply_confirmation_before_io=1");
console.log("server_controlled_journal_reconstruction=1");
console.log("wallet_dependency_import=0");
console.log("sign_broadcast_dependency_import=0");
console.log("background_loop=0");
console.log("money_movement=0");
console.log("VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_GUARD_V1_GREEN");
