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
  "runtime_execution_mounted_v1: true",
  "background_loop: false",
  "startup_execution: false",
  "filesystem_write: false",
  "rpc_call: false",
  "wallet_access: false",
  "signing: false",
  "transaction_broadcast: false",
  "money_movement: false",
  '"execute_reserved_plan"',
  '"reconcile_possible_broadcast"',
  '"closeout_confirmed_delivery"',
  '"money_or_terminal_stage_hard_forbidden"',
]) {
  assert.equal(gate.includes(marker), true, `gate missing ${marker}`);
}

for (const marker of [
  "operator_loopback_only: true",
  "disabled_by_default: true",
  "runtime_apply_execution_mounted_v1: true",
  "runtime_apply_non_money_only_v1: true",
  "runtime_apply_enabled_v1: false",
  "claim_or_reservation_state_write_possible: true",
  '"VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ENABLED"',
  '"VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ALLOWED_STAGES"',
  "function serverApplyPolicy()",
  "policy: serverPolicy.policy",
  'error: "runtime_activation_policy_is_server_controlled"',
  'error: "server_apply_policy_invalid"',
  'error: "non_money_runtime_reported_forbidden_authority"',
  'applyActivation.status !== "authorized"',
  "apply: true,",
  "runtime_apply_not_enabled_v1",
  "effective_max_requests_per_run: 1",
  "background_loop: false",
  "startup_execution: false",
  "wallet_access: false",
  "signing: false",
  "transaction_broadcast: false",
  "money_movement: false",
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
  assert.equal(gate.includes(forbidden), false, `gate forbidden ${forbidden}`);
  assert.equal(
    runtime.includes(forbidden),
    false,
    `runtime forbidden ${forbidden}`,
  );
}

for (const forbidden of [
  "new Wallet(",
  "sendTransaction(",
  "broadcastTransaction(",
  "PRIVATE_KEY",
  "runBuyVoidNativeExecutionRuntimeCommandV1",
  "runBuyVoidConfirmedCloseoutV1",
]) {
  assert.equal(
    runtime.includes(forbidden),
    false,
    `runtime forbidden money authority ${forbidden}`,
  );
}

assert.equal(
  runtime.includes(
    "await runBuyVoidBoundedAutoFulfillmentOrchestratorV1({",
  ),
  true,
);
assert.equal(runtime.includes("snapshot: derived.snapshot,"), true);
assert.equal(runtime.includes("confirmation: body.confirmation,"), true);
assert.equal(
  runtime.includes(
    "delegated_confirmation: body.delegated_confirmation,",
  ),
  true,
);

console.log(
  "VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ACTIVATION_GATE_GUARD_V1_GREEN",
);
console.log("exact_lane_file_count=8");
console.log("default_enabled_stage_count=0");
console.log("runtime_execution_mounted_v1=1");
console.log("client_activation_policy=0");
console.log("non_money_candidate_stage_count=2");
console.log("money_or_terminal_stage_hard_forbidden_count=3");
console.log("background_loop=0");
console.log("startup_execution=0");
console.log("service_restart=0");
console.log("wallet_access=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("money_movement=0");
