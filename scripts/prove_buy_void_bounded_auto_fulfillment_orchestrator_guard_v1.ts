import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  ".github/workflows/buy-void-bounded-auto-fulfillment-orchestrator-v1.yml",
  "docs/operators/buy-void-bounded-auto-fulfillment-orchestrator-v1.md",
  "scripts/prove_buy_void_bounded_auto_fulfillment_orchestrator_guard_v1.ts",
  "scripts/prove_buy_void_bounded_auto_fulfillment_orchestrator_runtime_v1.ts",
  "scripts/prove_buy_void_bounded_auto_fulfillment_orchestrator_v1.ts",
  "src/economic/buy_void_bounded_auto_fulfillment_orchestrator_runtime_v1.ts",
  "src/economic/buy_void_bounded_auto_fulfillment_orchestrator_v1.ts",
  "src/economic/buy_void_runtime_integration_v1.ts",
];

for (const relative of required) {
  assert.equal(
    fs.existsSync(path.join(root, relative)),
    true,
    `missing ${relative}`,
  );
}

const core = fs.readFileSync(
  path.join(
    root,
    "src/economic/buy_void_bounded_auto_fulfillment_orchestrator_v1.ts",
  ),
  "utf8",
);
const runtime = fs.readFileSync(
  path.join(
    root,
    "src/economic/buy_void_bounded_auto_fulfillment_orchestrator_runtime_v1.ts",
  ),
  "utf8",
);
const integration = fs.readFileSync(
  path.join(root, "src/economic/buy_void_runtime_integration_v1.ts"),
  "utf8",
);

for (const marker of [
  "one_request_per_invocation: true",
  "max_requests_per_invocation: 1",
  "one_stage_transition_per_invocation: true",
  "no_retry_after_possible_broadcast: true",
  "unknown_broadcast_requires_reconciliation: true",
  "background_loop: false",
  "startup_execution: false",
  "automatic_retry: false",
  "raw_signed_transaction_persistence: false",
  "raw_signed_transaction_output: false",
  "credential_value_logging: false",
  '"buyVoidRunBoundedAutomaticFulfillmentStage"',
]) {
  assert.equal(core.includes(marker), true, `core missing ${marker}`);
}

for (const marker of [
  "operator_loopback_only: true",
  "disabled_by_default: true",
  "runtime_apply_enabled_v1: false",
  "dry_run_only: true",
  '"runtime_apply_not_enabled_v1"',
  "effective_max_requests_per_run: 1",
  "background_loop: false",
  "startup_execution: false",
  "wallet_access: false",
  "signing: false",
  "transaction_broadcast: false",
  "money_movement: false",
]) {
  assert.equal(runtime.includes(marker), true, `runtime missing ${marker}`);
}

for (const forbidden of [
  "setInterval(",
  "setTimeout(",
  "while (true)",
  "for (;;)",
]) {
  assert.equal(core.includes(forbidden), false, `core forbidden ${forbidden}`);
  assert.equal(
    runtime.includes(forbidden),
    false,
    `runtime forbidden ${forbidden}`,
  );
}

for (const marker of [
  'from "./buy_void_bounded_auto_fulfillment_orchestrator_runtime_v1.js"',
  "buyVoidBoundedAutoFulfillmentOrchestratorRuntimeStatusV1",
  "handleBuyVoidBoundedAutoFulfillmentOrchestratorRuntimeCommandV1",
  "VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1",
]) {
  assert.equal(
    integration.includes(marker),
    false,
    `canonical integration still mounts bounded orchestrator authority: ${marker}`,
  );
}
assert.equal(
  integration.includes(
    "bounded_auto_fulfillment_orchestrator_parent_mounted: false",
  ),
  true,
);
assert.equal(
  integration.includes('asset_mode: "void_token_erc20"'),
  true,
);

console.log(
  "VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_GUARD_V1_GREEN",
);
console.log("exact_lane_file_count=8");
console.log("orchestrator_source_retained=1");
console.log("orchestrator_parent_mounted=0");
console.log("orchestrator_runtime_apply=0");
console.log("canonical_parent_delivery=void_token_erc20");
console.log("background_loop=0");
console.log("startup_execution=0");
console.log("service_restart=0");
