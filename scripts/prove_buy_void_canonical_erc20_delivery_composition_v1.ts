import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const routes = new Map<string, Function>();
const app: any = {
  get(route: string, ...handlers: Function[]) {
    routes.set(`GET ${route}`, handlers[handlers.length - 1]);
  },
  post(route: string, ...handlers: Function[]) {
    routes.set(`POST ${route}`, handlers[handlers.length - 1]);
  },
};
(globalThis as any).__void_http_app = app;

const tmp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-canonical-erc20-composition-v1-"),
);
process.env.DATA_DIR = tmp;

for (const key of [
  "VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED",
  "VOID_BUY_VOID_RUNTIME_DIR",
  "VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_ENABLED",
  "VOID_BUY_VOID_DELIVERY_CHAIN_ID",
  "VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS",
  "VOID_BUY_VOID_DELIVERY_WALLET_ADDRESS",
  "VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS",
  "VOID_BUY_VOID_DELIVERY_MAX_GAS_LIMIT",
  "VOID_BUY_VOID_DELIVERY_MAX_FEE_PER_GAS_WEI",
  "VOID_BUY_VOID_DELIVERY_MAX_PRIORITY_FEE_PER_GAS_WEI",
  "VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_INTEGRATION_ENABLED",
  "VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_ENABLED",
  "VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_ENABLED",
  "VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ENABLED",
  "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ENABLED",
  "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PREPARATION_ENABLED",
  "VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ENABLED",
]) {
  delete process.env[key];
}

function responseHarness() {
  let sentValue: { status: number; body: any } | null = null;
  const res: any = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    setHeader() {},
    json(body: any) {
      sentValue = { status: this.statusCode, body };
      return this;
    },
  };
  return { res, read: () => sentValue };
}

async function call(method: "GET" | "POST", route: string, req: any) {
  const handler = routes.get(`${method} ${route}`);
  assert.ok(handler, `missing handler ${method} ${route}`);
  const harness = responseHarness();
  await Promise.resolve(handler(req, harness.res));
  const sent = harness.read();
  assert.ok(sent, `handler ${method} ${route} did not respond`);
  return sent;
}

const thisFile = fileURLToPath(import.meta.url);
const moduleFile = thisFile.endsWith(".ts")
  ? path.join(
      process.cwd(),
      "src",
      "economic",
      "buy_void_runtime_integration_v1.ts",
    )
  : path.join(
      path.dirname(thisFile),
      "..",
      "src",
      "economic",
      "buy_void_runtime_integration_v1.js",
    );

await import(
  pathToFileURL(moduleFile).href +
    `?canonical-erc20-composition-proof=${Date.now()}`
);
await new Promise((resolve) => setTimeout(resolve, 450));

const parentStatusRoute = "/__void/operator/buy-void-runtime-v1/status";
const parentCommandRoute = "/__void/operator/buy-void-runtime-v1/command";
const deliveryStatusRoute =
  "/__void/operator/buy-void-delivery-runtime-v1/status";

assert.equal(routes.has(`GET ${parentStatusRoute}`), true);
assert.equal(routes.has(`POST ${parentCommandRoute}`), true);
assert.equal(routes.has(`GET ${deliveryStatusRoute}`), false);
assert.equal(
  routes.has(
    "GET /__void/operator/buy-void-native-delivery-receipt-v1/status",
  ),
  false,
);
assert.equal(
  routes.has("GET /__void/operator/buy-void-native-execution-v1/status"),
  false,
);

const parentStatus = await call("GET", parentStatusRoute, {
  socket: { remoteAddress: "127.0.0.1" },
});
assert.equal(parentStatus.status, 200);
assert.equal(parentStatus.body.enabled, false);
assert.equal(
  parentStatus.body.canonical_delivery.asset_mode,
  "void_token_erc20",
);
assert.equal(
  parentStatus.body.canonical_delivery.native_delivery_parent_mounted,
  false,
);
assert.equal(
  parentStatus.body.canonical_delivery.native_receipt_parent_mounted,
  false,
);
assert.equal(
  parentStatus.body.canonical_delivery.native_execution_parent_mounted,
  false,
);
assert.equal(
  parentStatus.body.canonical_delivery
    .bounded_auto_fulfillment_orchestrator_parent_mounted,
  false,
);
assert.equal(
  parentStatus.body.canonical_delivery.crash_consistent_saga_parent_mounted,
  false,
);
assert.equal(
  parentStatus.body.canonical_delivery
    .native_transaction_preparation_parent_mounted,
  false,
);
assert.equal(
  parentStatus.body.canonical_delivery
    .opaque_prepared_transaction_execution_parent_mounted,
  false,
);
assert.equal(
  parentStatus.body.canonical_delivery
    .erc20_transaction_preparation_bridge_ready,
  true,
);
assert.equal(
  parentStatus.body.canonical_delivery
    .erc20_transaction_preparation_execution_state_ready,
  true,
);
assert.equal(
  parentStatus.body.canonical_delivery
    .erc20_receipt_reconciliation_bridge_ready,
  true,
);
assert.equal(
  parentStatus.body.canonical_delivery.presale_inventory_funding_ready,
  false,
);
assert.deepEqual(
  parentStatus.body.canonical_delivery.funding_blockers,
  [
    "canonical_delivery_runtime_activation_not_ready",
  ],
);
assert.equal(
  Object.prototype.hasOwnProperty.call(
    parentStatus.body,
    "crash_consistent_saga_runtime",
  ),
  false,
);

assert.equal(
  parentStatus.body.canonical_delivery.delivery_runtime_source_retained,
  true,
);
assert.equal(
  parentStatus.body.canonical_delivery.delivery_runtime_parent_mounted,
  false,
);
assert.equal(
  parentStatus.body.canonical_delivery
    .erc20_fulfillment_unit_to_token_atom_scale_ready,
  true,
);
assert.equal(
  parentStatus.body.canonical_delivery
    .canonical_delivery_dependency_bootstrap_ready,
  true,
);
assert.equal(
  parentStatus.body.canonical_delivery
    .dependency_bootstrap_integration_gate.marker,
  "VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_INTEGRATION_GATE_V1",
);
assert.equal(
  parentStatus.body.canonical_delivery
    .dependency_bootstrap_integration_gate.status,
  "source_ready",
);
assert.equal(
  parentStatus.body.canonical_delivery
    .dependency_bootstrap_integration_gate
    .erc20_transaction_preparation_execution_state_ready,
  true,
);
assert.equal(
  parentStatus.body.canonical_delivery
    .dependency_bootstrap_integration_gate.next_funding_blocker,
  "canonical_delivery_runtime_activation_not_ready",
);
assert.equal(
  parentStatus.body.canonical_delivery
    .dependency_bootstrap_integration_gate.authority.credential_read,
  false,
);
assert.equal(
  parentStatus.body.canonical_delivery.canonical_delivery_execution_ready,
  false,
);
assert.equal(
  parentStatus.body.canonical_delivery.canonical_delivery_execution_held,
  true,
);
assert.equal(
  parentStatus.body.canonical_delivery.runtime_status.mounted,
  false,
);
assert.equal(
  parentStatus.body.canonical_delivery.runtime_status.status,
  "held",
);
assert.equal(
  parentStatus.body.canonical_delivery.runtime_status.reason,
  "canonical_erc20_execution_not_ready",
);
assert.equal(
  parentStatus.body.canonical_delivery.runtime_status.signer_configured,
  false,
);
assert.equal(
  parentStatus.body.canonical_delivery.runtime_status.broadcaster_configured,
  false,
);
assert.equal(
  parentStatus.body.canonical_delivery.runtime_status
    .effective_authority.transaction_broadcast,
  false,
);

const removedParentActions = [
  "run_bounded_auto_fulfillment_orchestrator",
  "run_crash_consistent_saga_stage",
  "run_saga_execute_prepared_transaction",
];
for (const removed of removedParentActions) {
  assert.equal(parentStatus.body.supported_actions.includes(removed), false);
}

process.env.VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED = "1";
for (const removed of removedParentActions) {
  const response = await call("POST", parentCommandRoute, {
    socket: { remoteAddress: "127.0.0.1" },
    body: { action: removed },
  });
  assert.equal(response.status, 400);
  assert.equal(response.body.error, "invalid_pipeline_action");
}

assert.equal(fs.existsSync(path.join(tmp, "buy_void_v1")), false);
fs.rmSync(tmp, { recursive: true, force: true });

console.log(
  "VOID_BUY_VOID_CANONICAL_ERC20_DELIVERY_COMPOSITION_V1_PROOF_GREEN",
);
console.log("canonical_delivery_asset=void_token_erc20");
console.log("native_parent_routes=0");
console.log("canonical_erc20_delivery_parent_mount=0");
console.log("erc20_atomic_unit_conversion_ready=1");
console.log("erc20_transaction_preparation_bridge_ready=1");
console.log("erc20_transaction_preparation_execution_state_ready=1");
console.log("canonical_delivery_dependency_bootstrap_ready=1");
console.log("crash_saga_parent_mount=0");
console.log("native_transaction_preparation_parent_mount=0");
console.log("presale_inventory_funding_ready=0");
