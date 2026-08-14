import fs from "node:fs";
import path from "node:path";

const fail = (message: string): never => {
  throw new Error(`VOID_BUY_VOID_RUNTIME_INTEGRATION_GUARD_V1_FAIL: ${message}`);
};
const need = (condition: unknown, message: string): void => {
  if (!condition) fail(message);
};

const root = process.cwd();
const indexText = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const moduleText = fs.readFileSync(
  path.join(root, "src", "economic", "buy_void_runtime_integration_v1.ts"),
  "utf8",
);
const deliveryRuntimeText = fs.readFileSync(
  path.join(root, "src", "economic", "buy_void_delivery_runtime_integration_v1.ts"),
  "utf8",
);
const transactionPreparationPlannerText = fs.readFileSync(
  path.join(
    root,
    "src",
    "economic",
    "buy_void_erc20_transaction_preparation_planner_v1.ts",
  ),
  "utf8",
);
const dependencyBootstrapGateText = fs.readFileSync(
  path.join(
    root,
    "src",
    "economic",
    "buy_void_erc20_delivery_dependency_bootstrap_integration_gate_v1.ts",
  ),
  "utf8",
);
const workflowText = fs.readFileSync(
  path.join(root, ".github", "workflows", "buy-void-runtime-integration-v1.yml"),
  "utf8",
);

need(
  indexText.includes(
    'import "./economic/buy_void_runtime_integration_v1.js"; // VOID_BUY_VOID_RUNTIME_INTEGRATION_V1',
  ),
  "missing index side-effect import",
);
need(
  indexText.split("VOID_BUY_VOID_RUNTIME_INTEGRATION_V1").length - 1 === 1,
  "runtime integration import must appear exactly once",
);

for (const marker of [
  "VOID_BUY_VOID_RUNTIME_INTEGRATION_V1",
  "VOID_BUY_VOID_STANDALONE_NATIVE_SAGA_REFERENCE_V1",
  'command_symbol: "handleBuyVoidCrashConsistentSagaRuntimeCommandV1"',
  'status_symbol: "buyVoidCrashConsistentSagaRuntimeStatusV1"',
  'legacy_status_key: "crash_consistent_saga_runtime"',
  "source_retained: true",
  "parent_mounted: false",
  "VOID_BUY_VOID_CANONICAL_DELIVERY_COMPOSITION_V1",
  'status: "/__void/operator/buy-void-runtime-v1/status"',
  'command: "/__void/operator/buy-void-runtime-v1/command"',
  'const ENABLE_ENV = "VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED"',
  'const ROOT_ENV = "VOID_BUY_VOID_RUNTIME_DIR"',
  "operator_loopback_only: true",
  "disabled_by_default: true",
  "server_controlled_root_dir: true",
  "dry_by_default: true",
  "exact_per_action_confirmation_required: true",
  "public_route: false",
  "background_loop: false",
  "rpc_call: false",
  'asset_mode: "void_token_erc20"',
  "canonical_delivery_asset_void_token_erc20: true",
  "canonical_delivery_runtime_parent_mounted: true",
  "delivery_runtime_source_retained: true",
  "delivery_runtime_parent_mounted: true",
  "VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_INTEGRATION_GATE_V1",
  "VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_INTEGRATION_V1",
  "canonical_erc20_delivery_dependency_bootstrap_ready:",
  "erc20_transaction_preparation_execution_state_ready:",
  "canonical_erc20_transaction_preparation_execution_state_ready:",
  "canonical_erc20_delivery_atomic_unit_conversion_ready: true",
  "canonical_erc20_delivery_execution_ready: false",
  "canonical_erc20_delivery_execution_held: true",
  "native_value_delivery_parent_mounted: false",
  "native_receipt_parent_mounted: false",
  "native_execution_parent_mounted: false",
  "bounded_auto_fulfillment_orchestrator_parent_mounted: false",
  "crash_consistent_saga_parent_mounted: false",
  "native_transaction_preparation_parent_mounted: false",
  "opaque_prepared_transaction_execution_parent_mounted: false",
  "erc20_transaction_preparation_bridge_ready: true",
  "erc20_receipt_reconciliation_bridge_ready: true",
  "presale_inventory_funding_ready: false",
  'remote === "127.0.0.1"',
  'remote === "::1"',
  'remote === "::ffff:127.0.0.1"',
  'error: "root_dir_is_server_controlled"',
  'const MAX_INPUT_NESTING_DEPTH = 12',
  'const INPUT_NESTING_DEPTH_SENTINEL = "__input_nesting_depth_exceeded__"',
  "return INPUT_NESTING_DEPTH_SENTINEL",
  '"input_nesting_depth_exceeded"',
  '"forbidden_execution_material"',
  "runBuyVoidPipelineCommandV1(command)",
  "setTimeout(mount, 250).unref?.()",
]) {
  need(moduleText.includes(marker), `missing runtime marker: ${marker}`);
}

for (const marker of [
  "erc20_transaction_preparation_execution_state_ready: true",
  '"canonical_delivery_runtime_activation_not_ready"',
  "next_funding_blocker:",
]) {
  need(
    dependencyBootstrapGateText.includes(marker),
    `missing planner execution-state HOLD marker: ${marker}`,
  );
}
need(
  transactionPreparationPlannerText.includes(
    'execution_state_tag: "pending"',
  ),
  "planner execution-state contract must remain pending",
);
need(
  !transactionPreparationPlannerText.includes(
    '[policy.fulfillment_wallet_address, "latest"]',
  ),
  "planner must not regress to latest-state balance preflight",
);

need(
  !moduleText.includes(
    '"erc20_transaction_preparation_bridge_not_mounted"',
  ),
  "resolved ERC-20 transaction-preparation blocker remains in funding blockers",
);
need(
  !moduleText.includes(
    '"erc20_fulfillment_unit_to_token_atom_scale_not_ready"',
  ),
  "resolved ERC-20 unit-scale blocker remains in funding blockers",
);
need(
  !moduleText.includes(
    '"erc20_delivery_receipt_reconciliation_bridge_not_mounted"',
  ),
  "resolved ERC-20 receipt-reconciliation blocker remains in funding blockers",
);
need(
  (moduleText.match(
    /from "\.\/buy_void_delivery_runtime_integration_v1\.js";/g,
  ) || []).length === 1,
  "canonical ERC-20 delivery runtime must be parent-imported exactly once",
);
need(
  moduleText.includes("buyVoidDeliveryRuntimeStatusV1()"),
  "parent must project the real disabled delivery-runtime status",
);
for (const forbiddenParentImport of [
  'import "./buy_void_native_delivery_runtime_integration_v1.js";',
  'import "./buy_void_native_delivery_receipt_runtime_v1.js";',
  'import "./buy_void_native_execution_runtime_v1.js";',
  'from "./buy_void_bounded_auto_fulfillment_orchestrator_runtime_v1.js"',
  'from "./buy_void_crash_consistent_saga_runtime_v1.js"',
  'from "./buy_void_saga_execute_prepared_transaction_runtime_v1.js"',
]) {
  need(
    !moduleText.includes(forbiddenParentImport),
    `forbidden canonical parent import retained: ${forbiddenParentImport}`,
  );
}

need(
  !/\bVOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1\b\s*,?\s*$/mu.test(
    moduleText,
  ),
  "crash-saga action identifier is imported or mounted outside standalone metadata",
);
need(
  !/crash_consistent_saga_runtime\s*:\s*buyVoidCrashConsistentSagaRuntimeStatusV1\s*\(/u.test(
    moduleText,
  ),
  "crash-saga status remains parent-mounted",
);
need(
  !/handleBuyVoidCrashConsistentSagaRuntimeCommandV1\s*\(\s*req\s*,\s*res/u.test(
    moduleText,
  ),
  "crash-saga command remains parent-dispatched",
);

for (const preparationMarker of [
  "VOID_BUY_VOID_ERC20_TRANSACTION_PREPARATION_PLANNER_V1",
  "VOID_BUY_VOID_ERC20_TRANSACTION_PREPARATION_PLANNER_AUTHORITY_V1",
  'canonical_chain_id: "2050"',
  'canonical_asset: "void_token_erc20"',
  'transaction_value_wei: "0"',
  "gas_only_native_balance_accounting: true",
  "pending_nonce_required: true",
  "loopback_http_only: true",
  "wallet_access: false",
  "signing: false",
  "transaction_broadcast: false",
  "runtime_route_mount: false",
  "money_movement: false",
  "erc20_transaction_preparation_rpc_total_deadline_exceeded",
]) {
  need(
    transactionPreparationPlannerText.includes(preparationMarker),
    `ERC-20 transaction preparation planner missing ${preparationMarker}`,
  );
}

need(
  !moduleText.includes(
    'from "./buy_void_erc20_transaction_preparation_planner_v1.js"',
  ) &&
    !moduleText.includes(
      'import "./buy_void_erc20_transaction_preparation_planner_v1.js";',
    ),
  "ERC-20 transaction preparation planner is parent-imported before dependency bootstrap",
);

for (const deliveryMarker of [
  "VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1",
  "VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_V1",
  "runBuyVoidErc20ExecutionCompositionV1",
  '"sign_and_broadcast"',
  "server_derived_transaction_plan: true",
  "caller_supplied_transaction_plan: false",
  "canonical_planner_policy_validation_required: true",
  "durable_nonce_reservation_required: true",
  "signed_hash_custody_required: true",
  "saga_write_ahead_broadcast_intent_required: true",
  "canonical_record_confirmed_required: true",
  "existing_terminal_closeout_reused: true",
]) {
  need(
    deliveryRuntimeText.includes(deliveryMarker),
    `canonical delivery runtime missing ${deliveryMarker}`,
  );
}
for (const forbiddenDeliveryRuntimeMarker of [
  "runBuyVoidDeliverySignBroadcastV1",
  "createBuyVoidDeliverySubmissionGuardV1",
  "const plan = (body as any).plan",
  "submission_idempotency_key: (body as any)",
]) {
  need(
    !deliveryRuntimeText.includes(forbiddenDeliveryRuntimeMarker),
    `canonical delivery runtime retains direct sign/broadcast path: ${forbiddenDeliveryRuntimeMarker}`,
  );
}

need(
  /app\.post\(\s*VOID_BUY_VOID_RUNTIME_INTEGRATION_ROUTES_V1\.command\s*,/u.test(
    moduleText,
  ),
  "command route is not POST",
);
need(
  !/app\.get\(\s*VOID_BUY_VOID_RUNTIME_INTEGRATION_ROUTES_V1\.command\s*,/u.test(
    moduleText,
  ),
  "command mutation is exposed over GET",
);
need(!moduleText.includes('"/buy-void'), "runtime module mounts a public Buy VOID route");
need(!moduleText.includes("req?.headers?.host"), "runtime trusts Host for loopback authorization");
need(!moduleText.includes("fetch("), "runtime performs RPC or external fetch");
need(!moduleText.includes("sendTransaction("), "runtime sends a transaction");
need(!moduleText.includes("broadcastTransaction("), "runtime broadcasts a transaction");
need(!moduleText.includes("new Wallet("), "runtime constructs a wallet");
need(!moduleText.includes("PRIVATE_KEY"), "runtime references private-key configuration");
need(!moduleText.includes("raw_signed_transaction:"), "runtime exposes raw signed transaction input");

for (const proof of [
  "scripts/prove_buy_void_runtime_integration_v1.ts",
  "scripts/prove_buy_void_runtime_integration_guard_v1.ts",
  "scripts/prove_buy_void_canonical_erc20_delivery_composition_v1.ts",
]) {
  need(workflowText.includes("scripts/prove_buy_void_*.ts") || workflowText.includes(proof),
    `workflow missing Buy VOID proof stack for ${proof}`);
}
need(workflowText.includes("npm ci --ignore-scripts"), "workflow lacks locked install");
need(workflowText.includes("npm run build"), "workflow lacks production build");
need(workflowText.includes("--moduleResolution NodeNext"), "workflow lacks focused TypeScript gate");

console.log("VOID_BUY_VOID_RUNTIME_INTEGRATION_GUARD_V1_GREEN");
console.log("canonical_delivery_asset=void_token_erc20");
console.log("canonical_erc20_delivery_parent_mount=1");
console.log("erc20_atomic_unit_conversion_ready=1");
console.log("erc20_transaction_preparation_bridge_ready=1");
console.log("erc20_transaction_preparation_execution_state_ready=1");
console.log("canonical_delivery_dependency_bootstrap_ready=1");
console.log("server_derived_transaction_plan=1");
console.log("caller_supplied_transaction_plan=0");
console.log("server_derived_durable_execution_composition_ready=1");
console.log("caller_supplied_transaction_plan=0");
console.log("native_parent_mounts=0");
console.log("bounded_orchestrator_parent_mount=0");
console.log("standalone_crash_saga_source_retained=1");
console.log("crash_saga_parent_mount=0");
console.log("native_transaction_preparation_parent_mount=0");
console.log("opaque_prepared_transaction_execution_parent_mount=0");
console.log("presale_inventory_funding_ready=0");
