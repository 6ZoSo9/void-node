import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  VOID_BUY_VOID_NATIVE_EXECUTION_NONCE_FEE_PLANNER_AUTHORITY_V1,
} from "../src/economic/buy_void_native_execution_nonce_fee_planner_v1.js";
import {
  VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_AUTHORITY_V1,
  VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_ROUTES_V1,
} from "../src/economic/buy_void_native_execution_runtime_v1.js";

const root = process.cwd();
const plannerRelative =
  "src/economic/buy_void_native_execution_nonce_fee_planner_v1.ts";
const runtimeRelative =
  "src/economic/buy_void_native_execution_runtime_v1.ts";
const runtimeIntegrationRelative =
  "src/economic/buy_void_runtime_integration_v1.ts";
const plannerProofRelative =
  "scripts/prove_buy_void_native_execution_nonce_fee_planner_v1.ts";
const runtimeProofRelative =
  "scripts/prove_buy_void_native_execution_runtime_v1.ts";
const guardProofRelative =
  "scripts/prove_buy_void_native_execution_runtime_guard_v1.ts";
const systemdRelative =
  "ops/systemd/void-node-live.service.d/81-buy-void-native-execution-runtime-v1.conf.example";
const workflowRelative =
  ".github/workflows/buy-void-native-execution-runtime-v1.yml";
const docsRelative =
  "docs/operators/buy-void-native-execution-runtime-v1.md";

for (const relative of [
  plannerRelative,
  runtimeRelative,
  runtimeIntegrationRelative,
  plannerProofRelative,
  runtimeProofRelative,
  guardProofRelative,
  systemdRelative,
  workflowRelative,
  docsRelative,
]) {
  assert.equal(
    fs.existsSync(path.join(root, relative)),
    true,
    `missing ${relative}`,
  );
}

const planner = fs.readFileSync(
  path.join(root, plannerRelative),
  "utf8",
);
const runtime = fs.readFileSync(
  path.join(root, runtimeRelative),
  "utf8",
);
const runtimeIntegration = fs.readFileSync(
  path.join(root, runtimeIntegrationRelative),
  "utf8",
);
const plannerProof = fs.readFileSync(
  path.join(root, plannerProofRelative),
  "utf8",
);
const runtimeProof = fs.readFileSync(
  path.join(root, runtimeProofRelative),
  "utf8",
);
const guardProof = fs.readFileSync(
  path.join(root, guardProofRelative),
  "utf8",
);
const systemd = fs.readFileSync(
  path.join(root, systemdRelative),
  "utf8",
);
const workflow = fs.readFileSync(
  path.join(root, workflowRelative),
  "utf8",
);
const docs = fs.readFileSync(
  path.join(root, docsRelative),
  "utf8",
);
const index = fs.readFileSync(
  path.join(root, "src/index.ts"),
  "utf8",
);

assert.deepEqual(
  VOID_BUY_VOID_NATIVE_EXECUTION_NONCE_FEE_PLANNER_AUTHORITY_V1
    .read_only_rpc_methods,
  [
    "eth_chainId",
    "eth_getTransactionCount",
    "eth_gasPrice",
    "eth_getBalance",
  ],
);
assert.equal(
  VOID_BUY_VOID_NATIVE_EXECUTION_NONCE_FEE_PLANNER_AUTHORITY_V1
    .loopback_http_only,
  true,
);
assert.equal(
  VOID_BUY_VOID_NATIVE_EXECUTION_NONCE_FEE_PLANNER_AUTHORITY_V1
    .transaction_broadcast,
  false,
);
assert.equal(
  VOID_BUY_VOID_NATIVE_EXECUTION_NONCE_FEE_PLANNER_AUTHORITY_V1
    .money_movement,
  false,
);

assert.deepEqual(
  VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_ROUTES_V1,
  {
    status: "/__void/operator/buy-void-native-execution-v1/status",
    command: "/__void/operator/buy-void-native-execution-v1/command",
  },
);
assert.equal(
  VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_AUTHORITY_V1
    .operator_loopback_only,
  true,
);
assert.equal(
  VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_AUTHORITY_V1
    .disabled_by_default,
  true,
);
assert.equal(
  VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_AUTHORITY_V1
    .dry_run_allowed_while_disabled,
  true,
);
assert.equal(
  VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_AUTHORITY_V1
    .apply_allowed_while_disabled,
  false,
);
assert.match(
  runtime,
  /!enabled\(\) && req\?\.body\?\.apply === true/,
);
assert.equal(
  VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_AUTHORITY_V1
    .exact_confirmation_required_before_apply_io,
  true,
);
assert.equal(
  VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_AUTHORITY_V1
    .injected_dependencies_required_before_apply_io,
  true,
);
assert.equal(
  VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_AUTHORITY_V1
    .public_request_journal_write,
  false,
);
assert.equal(
  VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_AUTHORITY_V1
    .inventory_decrement,
  false,
);
assert.equal(
  VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_AUTHORITY_V1
    .inventory_release,
  false,
);
assert.equal(
  VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_AUTHORITY_V1
    .startup_execution,
  false,
);
assert.equal(
  VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_AUTHORITY_V1
    .automatic_retry,
  false,
);
assert.equal(
  VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_AUTHORITY_V1
    .receipt_wait,
  false,
);

assert.equal(
  (
    runtimeIntegration.match(
      /import "\.\/buy_void_native_execution_runtime_v1\.js";/g,
    ) || []
  ).length,
  1,
);
assert.doesNotMatch(
  index,
  /buy_void_native_execution_runtime_v1/,
);

assert.match(
  runtime,
  /buy_void_native_delivery_runtime_dependencies_v1\.js/,
);
assert.match(
  runtime,
  /__void_buy_void_native_delivery_runtime_dependencies_v1/,
);
assert.match(
  runtime,
  /VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_ENABLED/,
);
assert.match(
  runtime,
  /VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1/,
);
assert.match(
  runtime,
  /listBuyVoidFulfillmentJournalClaimsV1/,
);
assert.match(
  runtime,
  /listBuyVoidInventoryReservationsV1/,
);
assert.match(
  runtime,
  /readBuyVoidExecutionAttemptV1/,
);
assert.match(
  runtime,
  /planBuyVoidNativeExecutionNonceFeeV1/,
);
assert.match(
  runtime,
  /runBuyVoidNativeExecutionWorkerV1/,
);

assert.match(planner, /eth_getTransactionCount/);
assert.match(planner, /"pending"/);
assert.match(planner, /eth_gasPrice/);
assert.match(planner, /eth_getBalance/);
assert.match(planner, /"latest"/);
assert.doesNotMatch(planner, /eth_sendRawTransaction/);
assert.doesNotMatch(runtime, /eth_sendRawTransaction/);
assert.doesNotMatch(planner, /https:/);
assert.doesNotMatch(planner, /followRedirect/);
assert.doesNotMatch(planner, /process\.env/);
assert.doesNotMatch(planner, /setInterval\s*\(/);
assert.doesNotMatch(runtime, /setInterval\s*\(/);
assert.doesNotMatch(runtime, /write.*request.*journal/i);
assert.doesNotMatch(runtime, /inventory.*decrement.*\(/i);
assert.doesNotMatch(runtime, /inventory.*release.*\(/i);
assert.doesNotMatch(runtime, /NODE_PRIVKEY_PATH/);
assert.doesNotMatch(planner, /NODE_PRIVKEY_PATH/);
assert.doesNotMatch(runtime, /PRIVATE_KEY=/);
assert.doesNotMatch(planner, /PRIVATE_KEY=/);

for (const operationalProof of [
  plannerProof,
  runtimeProof,
]) {
  assert.doesNotMatch(
    operationalProof,
    /src\/index\.ts.*write/i,
  );
  assert.doesNotMatch(
    operationalProof,
    /systemctl|tailscale|ssh /i,
  );
}
assert.match(
  guardProof,
  /VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_GUARD_V1_GREEN/,
);

assert.match(
  systemd,
  /LoadCredential=buy-void-native-fulfillment-wallet-v1:/,
);
assert.match(
  systemd,
  /VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_INJECTOR_ENABLED=0/,
);
assert.match(
  systemd,
  /VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_ENABLED=0/,
);
assert.match(
  systemd,
  /VOID_BUY_VOID_NATIVE_CHAIN2050_RPC_URL=http:\/\/127\.0\.0\.1:8545\//,
);
assert.match(
  systemd,
  /VOID_BUY_VOID_NATIVE_EXECUTION_FEE_MULTIPLIER_BPS=12000/,
);
assert.doesNotMatch(systemd, /Environment=.*PRIVATE_KEY/);
assert.doesNotMatch(systemd, /Environment=.*MNEMONIC/);

for (const required of [
  "prove_buy_void_native_execution_nonce_fee_planner_v1.ts",
  "prove_buy_void_native_execution_runtime_v1.ts",
  "prove_buy_void_native_execution_runtime_guard_v1.ts",
  "prove_buy_void_native_execution_worker_v1.ts",
  "prove_buy_void_native_fulfillment_wallet_credential_signer_v1.ts",
  "prove_buy_void_native_delivery_runtime_dependencies_v1.ts",
  "prove_buy_void_native_chain2050_broadcaster_v1.ts",
  "prove_buy_void_pipeline_coordinator_v1.ts",
]) {
  assert.match(workflow, new RegExp(required.replace(/\./g, "\\.")));
}
assert.match(workflow, /name: native-execution-runtime/);
assert.match(docs, /Remaining work before a live customer path/);
assert.match(docs, /disabled-by-default/);
assert.match(docs, /dry-run while execution remains disabled/);
assert.match(docs, /one separately confirmed live canary/);

console.log(
  "VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_GUARD_V1_GREEN",
);
console.log("new_source_file_count=2");
console.log("modified_source_file_count=1");
console.log("proof_file_count=3");
console.log("systemd_example_file_count=1");
console.log("runtime_import_mounted=1");
console.log("runtime_disabled_by_default=1");
console.log("disabled_dry_run_allowed=1");
console.log("disabled_apply_allowed=0");
console.log("dependency_injector_disabled_by_default=1");
console.log("loopback_operator_only=1");
console.log("read_only_rpc_method_count=4");
console.log("startup_execution=0");
console.log("automatic_retry=0");
console.log("receipt_wait=0");
console.log("inventory_decrement=0");
console.log("inventory_release=0");
console.log("public_request_journal_write=0");
console.log(
  "verdict=BUY_VOID_NATIVE_EXECUTION_RUNTIME_GUARD_EXACT_GREEN",
);
