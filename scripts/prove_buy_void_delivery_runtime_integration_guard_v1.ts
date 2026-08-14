import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const wrapperPath = path.join(
  root,
  "src/economic/buy_void_runtime_integration_v1.ts",
);
const canonicalRuntimePath = path.join(
  root,
  "src/economic/buy_void_delivery_runtime_integration_v1.ts",
);
const plannerPath = path.join(
  root,
  "src/economic/buy_void_erc20_transaction_preparation_planner_v1.ts",
);
const canonicalAdapterPath = path.join(
  root,
  "src/economic/buy_void_delivery_sign_broadcast_adapter_v1.ts",
);
const nativeRuntimePath = path.join(
  root,
  "src/economic/buy_void_native_delivery_runtime_integration_v1.ts",
);
const nativeAdapterPath = path.join(
  root,
  "src/economic/buy_void_native_delivery_sign_broadcast_adapter_v1.ts",
);
const guardPath = path.join(
  root,
  "src/economic/buy_void_delivery_submission_guard_v1.ts",
);
const indexPath = path.join(root, "src/index.ts");

for (const file of [
  wrapperPath,
  canonicalRuntimePath,
  plannerPath,
  canonicalAdapterPath,
  nativeRuntimePath,
  nativeAdapterPath,
  guardPath,
  indexPath,
]) {
  assert.equal(fs.existsSync(file), true, `missing ${file}`);
}

const wrapper = fs.readFileSync(wrapperPath, "utf8");
const canonicalRuntime = fs.readFileSync(canonicalRuntimePath, "utf8");
const planner = fs.readFileSync(plannerPath, "utf8");
const canonicalAdapter = fs.readFileSync(canonicalAdapterPath, "utf8");
const nativeRuntime = fs.readFileSync(nativeRuntimePath, "utf8");
const nativeAdapter = fs.readFileSync(nativeAdapterPath, "utf8");
const guard = fs.readFileSync(guardPath, "utf8");
const index = fs.readFileSync(indexPath, "utf8");

assert.equal(
  (
    wrapper.match(
      /from "\.\/buy_void_delivery_runtime_integration_v1\.js";/g,
    ) || []
  ).length,
  0,
  "canonical parent must not import the held ERC-20 delivery runtime",
);
for (const forbiddenParentImport of [
  'import "./buy_void_native_delivery_runtime_integration_v1.js";',
  'import "./buy_void_native_delivery_receipt_runtime_v1.js";',
  'import "./buy_void_native_execution_runtime_v1.js";',
]) {
  assert.equal(
    wrapper.includes(forbiddenParentImport),
    false,
    `wrapper retains native parent mount: ${forbiddenParentImport}`,
  );
}
for (const forbiddenIndexImport of [
  "buy_void_delivery_runtime_integration_v1",
  "buy_void_native_delivery_runtime_integration_v1",
  "buy_void_delivery_sign_broadcast_adapter_v1",
  "buy_void_native_delivery_sign_broadcast_adapter_v1",
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
  "reserved_attempt_loaded_from_server_journal",
  "server_derived_transaction_plan: true",
  "caller_supplied_transaction_plan: false",
  "coherent_pending_planner_required: true",
  "read_only_planner_rpc_when_enabled: true",
  "direct_sign_broadcast_apply_allowed: false",
  "durable_prepared_transaction_composition_ready: false",
  '"plan_erc20_delivery"',
  '"VOID_BUY_VOID_NATIVE_CHAIN2050_RPC_URL"',
  "runBuyVoidErc20TransactionPreparationPlannerV1",
  '"caller_supplied_runtime_material_forbidden"',
  "raw_signed_transaction_output: false",
  "automatic_retry: false",
]) {
  assert.equal(
    canonicalRuntime.includes(marker),
    true,
    `canonical runtime missing ${marker}`,
  );
}

for (const retiredDirectRuntimeMarker of [
  "runBuyVoidDeliverySignBroadcastV1",
  "createBuyVoidDeliverySubmissionGuardV1",
  "__void_buy_void_delivery_runtime_dependencies_v1",
  'action: "sign_and_broadcast"',
]) {
  assert.equal(
    canonicalRuntime.includes(retiredDirectRuntimeMarker),
    false,
    `direct sign/broadcast runtime path retained: ${retiredDirectRuntimeMarker}`,
  );
}

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
    `coherent pending planner missing ${marker}`,
  );
}
const estimateStart = planner.indexOf(
  'const estimateResponse = await call("eth_estimateGas", [',
);
const estimateEnd = planner.indexOf("]);", estimateStart);
assert.ok(estimateStart >= 0 && estimateEnd > estimateStart);
assert.equal(
  planner.slice(estimateStart, estimateEnd + 3)
    .includes('"pending"'),
  true,
);

for (const marker of [
  "VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_ADAPTER_V1",
  '"buyVoidSignAndBroadcast"',
  "TRANSFER_INTERFACE",
  '"function transfer(address to, uint256 value) returns (bool)"',
  "VOID_BUY_VOID_ERC20_DELIVERY_UNIT_SCALE_V1",
  "ERC20_TOKEN_ATOM_MULTIPLIER_V1",
  "tokenAmountAtoms",
  "void_token_address",
  "to: tokenAddress",
  "value: 0n",
  "TRANSFER_INTERFACE.encodeFunctionData",
  "claim_submission_once(binding)",
  "release_submission_claim(",
  "sign_transaction(",
  "broadcast_signed_transaction(",
  'status: "not_broadcast"',
  'status: "broadcast_unknown"',
  'status: "broadcast_accepted"',
  "raw_signed_transaction_persisted: false",
  "raw_signed_transaction_returned: false",
  "automatic_retry_allowed: false",
]) {
  assert.equal(
    canonicalAdapter.includes(marker),
    true,
    `future durable ERC-20 adapter missing ${marker}`,
  );
}

for (const retainedMarker of [
  "VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_INTEGRATION_V1",
  "native_asset_only: true",
  "erc20_transfer: false",
  "token_contract_dependency: false",
]) {
  assert.equal(
    nativeRuntime.includes(retainedMarker),
    true,
    `native canary runtime source not retained: ${retainedMarker}`,
  );
}
for (const retainedMarker of [
  "VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_ADAPTER_V1",
  'asset_mode: "native_void"',
  "value: nativeValueWei",
  'data: "0x"',
]) {
  assert.equal(
    nativeAdapter.includes(retainedMarker),
    true,
    `native canary adapter source not retained: ${retainedMarker}`,
  );
}

for (const marker of [
  "VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_V1",
  "VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_ADAPTER_V1",
  "VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_ADAPTER_V1",
  "append_only_journal",
  "hash_chain",
  "exclusive_lock",
  "automatic_stale_lock_removal: false",
  "release_submission_claim",
]) {
  assert.equal(guard.includes(marker), true, `guard missing ${marker}`);
}

assert.equal(
  wrapper.includes('asset_mode: "void_token_erc20"'),
  true,
);
assert.equal(
  wrapper.includes("delivery_runtime_source_retained: true"),
  true,
);
assert.equal(
  wrapper.includes("delivery_runtime_parent_mounted: false"),
  true,
);
assert.equal(
  wrapper.includes("canonical_delivery_runtime_parent_mounted: false"),
  true,
);
assert.equal(
  wrapper.includes(
    "canonical_erc20_delivery_atomic_unit_conversion_ready: true",
  ),
  true,
);
assert.equal(
  wrapper.includes(
    "VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_INTEGRATION_V1",
  ),
  true,
);
assert.equal(
  wrapper.includes("canonical_erc20_delivery_execution_ready: false"),
  true,
);
assert.equal(
  wrapper.includes("canonical_erc20_delivery_execution_held: true"),
  true,
);
assert.equal(
  wrapper.includes("native_delivery_parent_mounted: false"),
  true,
);
assert.equal(
  wrapper.includes("presale_inventory_funding_ready: false"),
  true,
);

console.log(
  "VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_INTEGRATION_GUARD_V1_GREEN",
);
console.log("canonical_parent_delivery=void_token_erc20");
console.log("canonical_erc20_delivery_source_retained=1");
console.log("canonical_erc20_delivery_parent_mounted=0");
console.log("server_derived_transaction_plan=1");
console.log("caller_supplied_transaction_plan=0");
console.log("direct_sign_broadcast_apply_allowed=0");
console.log("durable_prepared_transaction_composition_ready=0");
console.log("erc20_atomic_unit_conversion_ready=1");
console.log("canonical_delivery_dependency_bootstrap_ready=1");
console.log("native_canary_source_retained=1");
console.log("native_canary_parent_mounted=0");
console.log("presale_inventory_funding_ready=0");
