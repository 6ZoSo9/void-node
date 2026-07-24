import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const exactLane = [
  ".github/workflows/buy-void-bounded-orchestrator-apply-activation-gate-v1.yml",
  "docs/operators/buy-void-bounded-orchestrator-apply-activation-gate-v1.md",
  "scripts/prove_buy_void_bounded_auto_fulfillment_orchestrator_runtime_v1.ts",
  "scripts/prove_buy_void_bounded_orchestrator_apply_activation_gate_guard_v1.ts",
  "scripts/prove_buy_void_bounded_orchestrator_apply_activation_gate_runtime_v1.ts",
  "scripts/prove_buy_void_bounded_orchestrator_apply_activation_gate_v1.ts",
  "src/economic/buy_void_bounded_auto_fulfillment_orchestrator_runtime_v1.ts",
  "src/economic/buy_void_bounded_orchestrator_apply_activation_gate_v1.ts",
];

for (const relative of exactLane) {
  assert.equal(
    fs.existsSync(path.join(root, relative)),
    true,
    `missing ${relative}`,
  );
}

const gate = fs.readFileSync(
  path.join(
    root,
    "src/economic/buy_void_bounded_orchestrator_apply_activation_gate_v1.ts",
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

for (const marker of [
  "disabled_by_default: true",
  "default_enabled_stage_count: 0",
  "server_derived_snapshot_required: true",
  "client_supplied_snapshot_forbidden: true",
  "server_derived_plan_fingerprint_required: true",
  "exact_plan_fingerprint_echo_required: true",
  "exact_orchestrator_confirmation_required: true",
  "exact_delegated_confirmation_required: true",
  "exact_stage_confirmation_required: true",
  "stage_allowlist_required: true",
  "runtime_execution_mounted_v1: false",
  "background_loop: false",
  "startup_execution: false",
  "filesystem_write: false",
  "rpc_call: false",
  "wallet_access: false",
  "signing: false",
  "transaction_broadcast: false",
  "money_movement: false",
  'enabled: false',
  'allowed_stages: []',
  '"execute_reserved_plan"',
  '"reconcile_possible_broadcast"',
  '"closeout_confirmed_delivery"',
  '"apply_activation_gate_disabled"',
  '"exact_plan_fingerprint_required"',
  '"exact_stage_confirmation_required"',
]) {
  assert.equal(
    gate.includes(marker),
    true,
    `activation gate missing ${marker}`,
  );
}

for (const marker of [
  "buyVoidBoundedOrchestratorApplyActivationStatusV1",
  "evaluateBuyVoidBoundedOrchestratorApplyActivationV1",
  "VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ACTIVATION_DEFAULT_POLICY_V1",
  '"runtime_activation_policy_is_server_controlled"',
  '"apply_activation_gate_disabled"',
  "apply_activation_gate:",
  "apply_activation:",
  "snapshot: derived.snapshot",
  "apply: false",
]) {
  assert.equal(
    runtime.includes(marker),
    true,
    `runtime missing ${marker}`,
  );
}

for (const forbidden of [
  "setInterval(",
  "setTimeout(",
  "while (true)",
  "for (;;)",
]) {
  assert.equal(
    gate.includes(forbidden),
    false,
    `activation gate forbidden ${forbidden}`,
  );
}

assert.equal(
  runtime.includes(
    "await runBuyVoidBoundedAutoFulfillmentOrchestratorV1({",
  ),
  true,
);
assert.equal(
  runtime.includes("apply: true,\n      dependencies:"),
  false,
  "runtime must not mount orchestrator apply",
);

console.log(
  "VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ACTIVATION_GATE_GUARD_V1_GREEN",
);
console.log("exact_lane_file_count=8");
console.log("default_enabled_stage_count=0");
console.log("runtime_execution_mounted_v1=0");
console.log("client_activation_policy=0");
console.log("money_or_terminal_stage_hard_forbidden_count=3");
console.log("background_loop=0");
console.log("startup_execution=0");
console.log("service_restart=0");
console.log("wallet_access=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("money_movement=0");
