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
delete (globalThis as any).__void_buy_void_delivery_runtime_dependencies_v1;

const tmp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-canonical-erc20-execution-hold-v1-"),
);
process.env.DATA_DIR = tmp;
delete process.env.VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED;
delete process.env.VOID_BUY_VOID_RUNTIME_DIR;

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
    `?canonical-erc20-execution-hold-proof=${Date.now()}`
);
await new Promise((resolve) => setTimeout(resolve, 450));

const parentStatusRoute = "/__void/operator/buy-void-runtime-v1/status";
const deliveryStatusRoute =
  "/__void/operator/buy-void-delivery-runtime-v1/status";
const deliveryCommandRoute =
  "/__void/operator/buy-void-delivery-runtime-v1/command";

assert.equal(routes.has(`GET ${parentStatusRoute}`), true);
assert.equal(routes.has(`GET ${deliveryStatusRoute}`), false);
assert.equal(routes.has(`POST ${deliveryCommandRoute}`), false);

const parentStatus = await call("GET", parentStatusRoute, {
  socket: { remoteAddress: "127.0.0.1" },
});
assert.equal(parentStatus.status, 200);
assert.equal(parentStatus.body.canonical_delivery.asset_mode, "void_token_erc20");
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
    .erc20_transaction_preparation_execution_state_ready,
  true,
);
assert.deepEqual(
  parentStatus.body.canonical_delivery.funding_blockers,
  [
    "canonical_delivery_runtime_activation_not_ready",
  ],
);
assert.equal(
  parentStatus.body.canonical_delivery
    .dependency_bootstrap_integration_gate.status,
  "source_ready",
);
assert.equal(
  parentStatus.body.canonical_delivery
    .dependency_bootstrap_integration_gate.authority.signing,
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
  parentStatus.body.canonical_delivery.runtime_status.reason,
  "canonical_erc20_execution_not_ready",
);
assert.equal(
  parentStatus.body.canonical_delivery.runtime_status
    .effective_authority.signing,
  false,
);
assert.equal(
  parentStatus.body.canonical_delivery.runtime_status
    .effective_authority.transaction_broadcast,
  false,
);
assert.equal(
  parentStatus.body.canonical_delivery.runtime_status
    .effective_authority.money_movement,
  false,
);
assert.equal(
  (globalThis as any).__void_buy_void_delivery_runtime_dependencies_v1,
  undefined,
);
assert.equal(fs.existsSync(path.join(tmp, "buy_void_v1")), false);

fs.rmSync(tmp, { recursive: true, force: true });

console.log(
  "VOID_BUY_VOID_CANONICAL_ERC20_EXECUTION_HOLD_V1_PROOF_GREEN",
);
console.log("canonical_erc20_delivery_parent_mount=0");
console.log("dependency_bootstrap_ready=1");
console.log("erc20_transaction_preparation_execution_state_ready=1");
console.log("erc20_atomic_unit_conversion_ready=1");
console.log("canonical_delivery_execution_ready=0");
console.log("transaction_broadcast_reachable_from_parent=0");
console.log("money_movement_reachable_from_parent=0");
