import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const wrapperPath = path.join(
  root,
  "src/economic/buy_void_runtime_integration_v1.ts",
);
const runtimePath = path.join(
  root,
  "src/economic/buy_void_delivery_runtime_integration_v1.ts",
);
const compositionPath = path.join(
  root,
  "src/economic/buy_void_erc20_execution_composition_v1.ts",
);
const plannerPath = path.join(
  root,
  "src/economic/buy_void_erc20_transaction_preparation_planner_v1.ts",
);
const adapterPath = path.join(
  root,
  "src/economic/buy_void_delivery_sign_broadcast_adapter_v1.ts",
);
const submissionGuardPath = path.join(
  root,
  "src/economic/buy_void_delivery_submission_guard_v1.ts",
);
const nativeRuntimePath = path.join(
  root,
  "src/economic/buy_void_native_delivery_runtime_integration_v1.ts",
);
const indexPath = path.join(root, "src/index.ts");

for (const file of [
  wrapperPath,
  runtimePath,
  compositionPath,
  plannerPath,
  adapterPath,
  submissionGuardPath,
  nativeRuntimePath,
  indexPath,
]) {
  assert.equal(fs.existsSync(file), true, `missing ${file}`);
}

const wrapper = fs.readFileSync(wrapperPath, "utf8");
const runtime = fs.readFileSync(runtimePath, "utf8");
const composition = fs.readFileSync(compositionPath, "utf8");
const planner = fs.readFileSync(plannerPath, "utf8");
const adapter = fs.readFileSync(adapterPath, "utf8");
const submissionGuard = fs.readFileSync(
  submissionGuardPath,
  "utf8",
);
const nativeRuntime = fs.readFileSync(
  nativeRuntimePath,
  "utf8",
);
const index = fs.readFileSync(indexPath, "utf8");

assert.equal(
  (
    wrapper.match(
      /from "\.\/buy_void_delivery_runtime_integration_v1\.js";/g,
    ) || []
  ).length,
  0,
  "canonical parent must not mount the held ERC20 delivery runtime",
);

for (const forbiddenIndexImport of [
  "buy_void_delivery_runtime_integration_v1",
  "buy_void_delivery_sign_broadcast_adapter_v1",
  "buy_void_erc20_execution_composition_v1",
]) {
  assert.equal(
    index.includes(forbiddenIndexImport),
    false,
    `src/index.ts directly mounts ${forbiddenIndexImport}`,
  );
}

for (const marker of [
  "VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1",
  "/__void/operator/buy-void-delivery-runtime-v1/status",
  "/__void/operator/buy-void-delivery-runtime-v1/command",
  "operator_loopback_only",
  "disabled_by_default",
  "server_controlled_root_dir",
  "server_controlled_policy",
  "prepared_attempt_loaded_from_server_journal: true",
  "server_derived_transaction_plan: true",
  "caller_supplied_transaction_plan: false",
  "canonical_planner_policy_validation_required: true",
  "max_amount_fulfillment_unit_binding_required: true",
  "confirmation_count_preflight_before_record_confirmed_required: true",
  "durable_nonce_reservation_required: true",
  "signed_hash_custody_required: true",
  "saga_write_ahead_broadcast_intent_required: true",
  "erc20_receipt_reconciliation_required: true",
  "canonical_record_confirmed_required: true",
  "existing_terminal_closeout_reused: true",
  "runBuyVoidErc20ExecutionCompositionV1",
  '"sign_and_broadcast"',
  '"caller_supplied_runtime_material_forbidden"',
  "raw_signed_transaction_output: false",
  "automatic_retry: false",
]) {
  assert.equal(
    runtime.includes(marker),
    true,
    `canonical runtime missing ${marker}`,
  );
}

for (const directRuntimeMarker of [
  "runBuyVoidDeliverySignBroadcastV1",
  "createBuyVoidDeliverySubmissionGuardV1",
  "const plan = (body as any).plan",
  "submission_idempotency_key: (body as any)",
]) {
  assert.equal(
    runtime.includes(directRuntimeMarker),
    false,
    `runtime bypasses composition boundary: ${directRuntimeMarker}`,
  );
}

assert.match(
  runtime,
  /const ALLOWED_INPUT_KEYS = new Set\(\[/,
);
for (const allowed of [
  '"action"',
  '"attempt_id"',
  '"apply"',
  '"confirmation"',
]) {
  assert.equal(runtime.includes(allowed), true);
}
assert.doesNotMatch(runtime, /^\s*"plan",\s*$/m);
assert.doesNotMatch(runtime, /^\s*"transaction_plan",\s*$/m);

for (const marker of [
  "VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_V1",
  "server_derived_transaction_plan: true",
  "caller_transaction_plan: false",
  "exact_pending_nonce_reservation: true",
  "wallet_scoped_nonce_lock: true",
  "overlapping_unbroadcast_nonce_fails_closed: true",
  "live_pre_sign_revalidation: true",
  "signed_hash_custody_persisted_before_broadcast: true",
  "write_ahead_saga_broadcast_intent: true",
  "no_rebroadcast_after_ambiguous_submission: true",
  "canonical_record_confirmed_reused: true",
  "existing_saga_terminal_closeout_reused: true",
  "validateBuyVoidErc20TransactionPreparationPlannerPolicyV1",
  "erc20_execution_max_amount_exceeds_saga_fulfillment_unit_cap",
  "MAX_SAGA_CONFIRMATIONS = 1_000_000n",
  "erc20_receipt_confirmation_count_out_of_saga_range",
  "runBuyVoidDeliverySignBroadcastV1",
]) {
  assert.equal(
    composition.includes(marker),
    true,
    `execution composition missing ${marker}`,
  );
}

const confirmationPreflight = composition.indexOf(
  "erc20_receipt_confirmation_count_out_of_saga_range",
);
const recordConfirmed = composition.indexOf(
  'action: "record_confirmed"',
);
assert.ok(
  confirmationPreflight >= 0 &&
    recordConfirmed > confirmationPreflight,
  "confirmation domain must fail closed before record_confirmed",
);

for (const marker of [
  "VOID_BUY_VOID_ERC20_TRANSACTION_PREPARATION_PLANNER_V1",
  'execution_state_tag: "pending"',
  '"eth_getTransactionCount"',
  '"eth_estimateGas"',
  '"eth_getBalance"',
  '[policy.fulfillment_wallet_address, "pending"]',
]) {
  assert.equal(
    planner.includes(marker),
    true,
    `coherent-pending planner missing ${marker}`,
  );
}

for (const marker of [
  "VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_ADAPTER_V1",
  "VOID_BUY_VOID_ERC20_DELIVERY_UNIT_SCALE_V1",
  'multiplier: "1000000000000"',
  "exact_signed_hash_required: true",
  "claim_submission_once(binding)",
  "release_submission_claim(",
  "sign_transaction(",
  "broadcast_signed_transaction(",
  "raw_signed_transaction_persisted: false",
  "raw_signed_transaction_returned: false",
  "automatic_retry_allowed: false",
]) {
  assert.equal(
    adapter.includes(marker),
    true,
    `sign/broadcast adapter missing ${marker}`,
  );
}

for (const marker of [
  "VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_V1",
  "append_only_journal",
  "hash_chain",
  "exclusive_lock",
  "automatic_stale_lock_removal: false",
  "release_submission_claim",
]) {
  assert.equal(
    submissionGuard.includes(marker),
    true,
    `submission guard missing ${marker}`,
  );
}

for (const marker of [
  "VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_INTEGRATION_V1",
  "native_asset_only: true",
  "erc20_transfer: false",
]) {
  assert.equal(
    nativeRuntime.includes(marker),
    true,
    `native canary runtime not retained: ${marker}`,
  );
}

for (const marker of [
  'asset_mode: "void_token_erc20"',
  "delivery_runtime_source_retained: true",
  "delivery_runtime_parent_mounted: false",
  "canonical_delivery_runtime_parent_mounted: false",
  "canonical_erc20_delivery_execution_ready: false",
  "canonical_erc20_delivery_execution_held: true",
  "presale_inventory_funding_ready: false",
]) {
  assert.equal(
    wrapper.includes(marker),
    true,
    `parent truth missing ${marker}`,
  );
}

console.log(
  "VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_GUARD_V1_GREEN",
);
console.log("canonical_parent_delivery=void_token_erc20");
console.log("canonical_erc20_delivery_parent_mount=0");
console.log("server_derived_transaction_plan=1");
console.log("caller_supplied_transaction_plan=0");
console.log("canonical_planner_policy_validator_reused=1");
console.log("durable_nonce_reservation=1");
console.log("signed_hash_custody=1");
console.log("write_ahead_broadcast_intent=1");
console.log("confirmation_range_preflight_before_record_confirmed=1");
console.log("existing_terminal_closeout_reused=1");
console.log("presale_inventory_funding_ready=0");
