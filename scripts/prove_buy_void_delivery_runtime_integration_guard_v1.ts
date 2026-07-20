import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const existingRuntimePath = path.join(
  root,
  "src/economic/buy_void_runtime_integration_v1.ts",
);
const runtimePath = path.join(
  root,
  "src/economic/buy_void_delivery_runtime_integration_v1.ts",
);
const guardPath = path.join(
  root,
  "src/economic/buy_void_delivery_submission_guard_v1.ts",
);
const adapterPath = path.join(
  root,
  "src/economic/buy_void_delivery_sign_broadcast_adapter_v1.ts",
);
const indexPath = path.join(root, "src/index.ts");

for (const file of [
  existingRuntimePath,
  runtimePath,
  guardPath,
  adapterPath,
  indexPath,
]) {
  assert.equal(fs.existsSync(file), true, `missing ${file}`);
}

const existingRuntime = fs.readFileSync(
  existingRuntimePath,
  "utf8",
);
const runtime = fs.readFileSync(runtimePath, "utf8");
const guard = fs.readFileSync(guardPath, "utf8");
const adapter = fs.readFileSync(adapterPath, "utf8");
const index = fs.readFileSync(indexPath, "utf8");

assert.equal(
  (
    existingRuntime.match(
      /import "\.\/buy_void_delivery_runtime_integration_v1\.js";/g,
    ) || []
  ).length,
  1,
);
assert.equal(
  index.includes(
    "buy_void_delivery_runtime_integration_v1",
  ),
  false,
);
assert.equal(
  index.includes(
    "buy_void_delivery_sign_broadcast_adapter_v1",
  ),
  false,
);

for (const marker of [
  "VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1",
  "/__void/operator/buy-void-delivery-runtime-v1/status",
  "/__void/operator/buy-void-delivery-runtime-v1/command",
  "operator_loopback_only",
  "disabled_by_default",
  "server_controlled_root_dir",
  "server_controlled_policy",
  "prepared_attempt_loaded_from_server_journal",
  "delivery_sign_broadcast_dependencies_not_configured",
  "raw_signed_transaction_returned: false",
  "automatic_retry_allowed: false",
]) {
  assert.equal(runtime.includes(marker), true, marker);
}

for (const marker of [
  "VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_V1",
  "append_only_journal",
  "hash_chain",
  "exclusive_lock",
  "automatic_stale_lock_removal: false",
  "submission_guard_lock_exists",
  "release_submission_claim",
]) {
  assert.equal(guard.includes(marker), true, marker);
}

assert.equal(
  runtime.includes(
    "readBuyVoidExecutionAttemptV1",
  ),
  true,
);
assert.equal(
  runtime.includes(
    "createBuyVoidDeliverySubmissionGuardV1",
  ),
  true,
);
assert.equal(
  runtime.includes(
    "__void_buy_void_delivery_runtime_dependencies_v1",
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
    "VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_ENABLED",
  ),
  true,
);

const forbiddenInputKeysMatch = runtime.match(
  /const FORBIDDEN_INPUT_KEYS = new Set\(\[\s*([\s\S]*?)\s*\]\);/,
);
assert.notEqual(
  forbiddenInputKeysMatch,
  null,
  "FORBIDDEN_INPUT_KEYS set must remain present",
);

const forbiddenInputKeysBody =
  forbiddenInputKeysMatch?.[1] || "";
const forbiddenInputKeys = Array.from(
  forbiddenInputKeysBody.matchAll(/^\s*"([^"]+)",\s*$/gm),
  (match) => match[1],
);
assert.equal(
  forbiddenInputKeys.includes("mnemonic"),
  true,
  "mnemonic must remain an explicitly forbidden request key",
);
assert.equal(
  forbiddenInputKeys.filter((key) => key === "mnemonic").length,
  1,
  "mnemonic must occur exactly once in FORBIDDEN_INPUT_KEYS",
);
assert.equal(
  runtime.includes("  mnemonic_input: false,"),
  true,
  "runtime capability declaration must deny mnemonic input",
);
assert.equal(
  runtime.includes("  mnemonic_input: true,"),
  false,
  "runtime capability declaration must never enable mnemonic input",
);
assert.equal(
  (runtime.match(/\bmnemonic\b/gi) || []).length,
  1,
  "standalone mnemonic may appear only in FORBIDDEN_INPUT_KEYS",
);

const forbiddenRuntimePatterns = [
  /\bJsonRpcProvider\b/,
  /\bnew\s+Wallet\b/,
  /\bWallet\.fromPhrase\b/,
  /\bfetch\s*\(/,
  /\baxios\b/,
  /\bchild_process\b/,
  /\bsystemctl\b/,
  /\bprivate[_-]?key[_-]?path\b/i,
  /\braw_signed_transaction\s*:/,
  /\bsendTransaction\s*\(/,
  /\bbroadcastTransaction\s*\(/,
];
for (const pattern of forbiddenRuntimePatterns) {
  assert.equal(pattern.test(runtime), false, String(pattern));
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
  assert.equal(pattern.test(guard), false, String(pattern));
}

assert.equal(
  runtime.includes(
    "broadcast_signed_transaction",
  ),
  true,
);
assert.equal(
  runtime.includes("sign_transaction"),
  true,
);
assert.equal(
  runtime.includes("private_key_input: false"),
  true,
);
assert.equal(
  runtime.includes("rpc_url_input: false"),
  true,
);
assert.equal(
  runtime.includes("raw_signed_transaction_input: false"),
  true,
);

assert.equal(
  adapter.includes("runtime_route_mount: false"),
  true,
);
assert.equal(
  adapter.includes("environment_secret_read: false"),
  true,
);

console.log(
  "VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_GUARD_V1_GREEN",
);
