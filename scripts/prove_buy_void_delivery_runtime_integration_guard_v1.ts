import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const wrapperPath = path.join(
  root,
  "src/economic/buy_void_runtime_integration_v1.ts",
);
const legacyRuntimePath = path.join(
  root,
  "src/economic/buy_void_delivery_runtime_integration_v1.ts",
);
const runtimePath = path.join(
  root,
  "src/economic/buy_void_native_delivery_runtime_integration_v1.ts",
);
const guardPath = path.join(
  root,
  "src/economic/buy_void_delivery_submission_guard_v1.ts",
);
const legacyAdapterPath = path.join(
  root,
  "src/economic/buy_void_delivery_sign_broadcast_adapter_v1.ts",
);
const adapterPath = path.join(
  root,
  "src/economic/buy_void_native_delivery_sign_broadcast_adapter_v1.ts",
);
const adapterProofPath = path.join(
  root,
  "scripts/prove_buy_void_native_delivery_sign_broadcast_adapter_v1.ts",
);
const runtimeProofPath = path.join(
  root,
  "scripts/prove_buy_void_native_delivery_runtime_integration_v1.ts",
);
const indexPath = path.join(root, "src/index.ts");

for (const file of [
  wrapperPath,
  legacyRuntimePath,
  runtimePath,
  guardPath,
  legacyAdapterPath,
  adapterPath,
  adapterProofPath,
  runtimeProofPath,
  indexPath,
]) {
  assert.equal(fs.existsSync(file), true, `missing ${file}`);
}

const sha256 = (value: string): string =>
  crypto.createHash("sha256").update(value).digest("hex");

const wrapper = fs.readFileSync(wrapperPath, "utf8");
const legacyRuntime = fs.readFileSync(legacyRuntimePath, "utf8");
const runtime = fs.readFileSync(runtimePath, "utf8");
const guard = fs.readFileSync(guardPath, "utf8");
const legacyAdapter = fs.readFileSync(legacyAdapterPath, "utf8");
const adapter = fs.readFileSync(adapterPath, "utf8");
const adapterProof = fs.readFileSync(adapterProofPath, "utf8");
const runtimeProof = fs.readFileSync(runtimeProofPath, "utf8");
const index = fs.readFileSync(indexPath, "utf8");

assert.equal(
  sha256(legacyRuntime),
  "f01e1de0041834fac61e349b1632abe01b02321fd2014eaf03ecd59ce5e58663",
  "legacy ERC-20 runtime blob changed",
);
assert.equal(
  sha256(legacyAdapter),
  "684705d171ff0fafb977d303fd0a1c498ca848cd4022e981f9da43893d49ada1",
  "legacy ERC-20 adapter blob changed",
);

assert.equal(
  (
    wrapper.match(
      /import "\.\/buy_void_native_delivery_runtime_integration_v1\.js";/g,
    ) || []
  ).length,
  1,
  "wrapper must mount native delivery runtime exactly once",
);
assert.equal(
  wrapper.includes(
    'import "./buy_void_delivery_runtime_integration_v1.js";',
  ),
  false,
  "wrapper still mounts legacy ERC-20 delivery runtime",
);

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
  "VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_INTEGRATION_V1",
  "/__void/operator/buy-void-delivery-runtime-v1/status",
  "/__void/operator/buy-void-delivery-runtime-v1/command",
  "operator_loopback_only",
  "disabled_by_default",
  "server_controlled_root_dir",
  "server_controlled_policy",
  "prepared_attempt_loaded_from_server_journal",
  "native_asset_only: true",
  "erc20_transfer: false",
  "token_contract_dependency: false",
  "VOID_BUY_VOID_NATIVE_DELIVERY_ASSET_MODE",
  'values.asset_mode !== "native_void"',
  "VOID_BUY_VOID_NATIVE_DELIVERY_UNIT_SCALE_V1",
  "native_delivery_sign_broadcast_dependencies_not_configured",
  "raw_signed_transaction_returned: false",
  "automatic_retry_allowed: false",
]) {
  assert.equal(runtime.includes(marker), true, `runtime missing ${marker}`);
}

for (const forbidden of [
  "VOID_BUY_VOID_NATIVE_DELIVERY_TOKEN_ADDRESS",
  "void_token_address",
  "Interface(",
  "function transfer(address",
  "tokenAddress",
]) {
  assert.equal(
    runtime.includes(forbidden),
    false,
    `runtime retains ERC-20 delivery material: ${forbidden}`,
  );
}

for (const marker of [
  "VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_ADAPTER_V1",
  '"buyVoidNativeSignAndBroadcast"',
  "native_asset_only: true",
  "erc20_transfer: false",
  "token_contract_dependency: false",
  'asset_mode: "native_void"',
  "fulfillment_unit_decimals: 6",
  "native_unit_decimals: 18",
  'multiplier: "1000000000000"',
  "NATIVE_VALUE_MULTIPLIER_V1",
  "value: nativeValueWei",
  'data: "0x"',
  "parsedTo !== normalized.delivery_address",
  "parsed.value !== normalized.native_value_wei",
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
  assert.equal(adapter.includes(marker), true, `adapter missing ${marker}`);
}

for (const forbidden of [
  "Interface",
  "TRANSFER_INTERFACE",
  "void_token_address",
  "tokenAddress",
  "function transfer(address",
  "process.env",
  'from "node:fs"',
  'from "node:path"',
  "fetch(",
  "JsonRpcProvider",
  "new Wallet(",
  "sendTransaction(",
  "broadcastTransaction(",
  "writeFile",
  "appendFile",
  "app.post(",
  "app.get(",
]) {
  assert.equal(
    adapter.includes(forbidden),
    false,
    `native adapter direct authority or ERC-20 material present: ${forbidden}`,
  );
}

for (const marker of [
  "VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_V1",
  "VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_ADAPTER_V1",
  "VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_ADAPTER_V1",
  "adapter_marker",
  "append_only_journal",
  "hash_chain",
  "exclusive_lock",
  "automatic_stale_lock_removal: false",
  "release_submission_claim",
]) {
  assert.equal(guard.includes(marker), true, `guard missing ${marker}`);
}

for (const pattern of [
  /\bJsonRpcProvider\b/,
  /\bnew\s+Wallet\b/,
  /\bfetch\s*\(/,
  /\baxios\b/,
  /\bchild_process\b/,
  /\bsystemctl\b/,
  /\bsendTransaction\s*\(/,
  /\bbroadcastTransaction\s*\(/,
]) {
  assert.equal(pattern.test(runtime), false, String(pattern));
  assert.equal(pattern.test(guard), false, String(pattern));
}

assert.equal(
  runtime.includes(
    "__void_buy_void_native_delivery_runtime_dependencies_v1",
  ),
  true,
);
assert.equal(
  runtime.includes(
    'String(process.env[ENABLE_ENV] || "") === "1"',
  ),
  true,
);
assert.equal(
  runtime.includes(
    "VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_INTEGRATION_ENABLED",
  ),
  true,
);
assert.equal(runtime.includes("private_key_input: false"), true);
assert.equal(runtime.includes("rpc_url_input: false"), true);
assert.equal(
  runtime.includes("raw_signed_transaction_input: false"),
  true,
);

for (const proofMarker of [
  "VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_ADAPTER_V1_GREEN",
  "nativeValueWei",
  'asset_mode: "native_void"',
]) {
  assert.equal(
    adapterProof.includes(proofMarker),
    true,
    `native adapter proof missing ${proofMarker}`,
  );
}
for (const proofMarker of [
  "VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_INTEGRATION_V1_GREEN",
  "nativeValueWei",
  "VOID_BUY_VOID_NATIVE_DELIVERY_ASSET_MODE",
]) {
  assert.equal(
    runtimeProof.includes(proofMarker),
    true,
    `native runtime proof missing ${proofMarker}`,
  );
}

console.log(
  "VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_INTEGRATION_GUARD_V1_GREEN",
);
