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
  path.join(os.tmpdir(), "void-erc20-dependency-integration-gate-v1-"),
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

const root = process.cwd();
const parentPath = path.join(
  root,
  "src/economic/buy_void_runtime_integration_v1.ts",
);
const gatePath = path.join(
  root,
  "src/economic/buy_void_erc20_delivery_dependency_bootstrap_integration_gate_v1.ts",
);
const bootstrapPath = path.join(
  root,
  "src/economic/buy_void_erc20_delivery_dependency_bootstrap_v1.ts",
);
const broadcasterPath = path.join(
  root,
  "src/economic/buy_void_erc20_chain2050_broadcaster_v1.ts",
);
const transportPath = path.join(
  root,
  "src/economic/buy_void_erc20_chain2050_total_deadline_transport_v1.ts",
);
const plannerPath = path.join(
  root,
  "src/economic/buy_void_erc20_transaction_preparation_planner_v1.ts",
);

for (const file of [
  parentPath,
  gatePath,
  bootstrapPath,
  broadcasterPath,
  transportPath,
  plannerPath,
]) {
  assert.equal(fs.existsSync(file), true, `missing ${file}`);
}

const parentSource = fs.readFileSync(parentPath, "utf8");
const gateSource = fs.readFileSync(gatePath, "utf8");
const bootstrapSource = fs.readFileSync(bootstrapPath, "utf8");
const broadcasterSource = fs.readFileSync(broadcasterPath, "utf8");
const transportSource = fs.readFileSync(transportPath, "utf8");
const plannerSource = fs.readFileSync(plannerPath, "utf8");

assert.match(
  parentSource,
  /buy_void_erc20_delivery_dependency_bootstrap_integration_gate_v1\.js/,
);
assert.doesNotMatch(
  parentSource,
  /from "\.\/buy_void_erc20_delivery_dependency_bootstrap_v1\.js"/,
);
assert.doesNotMatch(gateSource, /^\s*import\s/m);

for (const marker of [
  "VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_INTEGRATION_GATE_V1",
  'status: "source_ready"',
  "canonical_delivery_dependency_bootstrap_ready: true",
  "erc20_transaction_preparation_execution_state_ready: true",
  "canonical_delivery_runtime_parent_mounted: true",
  "canonical_delivery_execution_ready: false",
  "canonical_delivery_execution_held: true",
  "production_credential_binding_ready: false",
  "service_activation_ready: false",
  "presale_inventory_funding_ready: false",
  '"canonical_delivery_runtime_activation_not_ready"',
  "credential_read: false",
  "rpc_call: false",
  "signing: false",
  "transaction_broadcast: false",
  "money_movement: false",
]) {
  assert.equal(gateSource.includes(marker), true, `gate missing ${marker}`);
}

assert.equal(
  bootstrapSource.includes(
    "VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_V1",
  ),
  true,
);
assert.equal(
  broadcasterSource.includes("VOID_BUY_VOID_ERC20_CHAIN2050_BROADCASTER_V1"),
  true,
);
assert.equal(
  transportSource.includes(
    "VOID_BUY_VOID_ERC20_CHAIN2050_TOTAL_DEADLINE_TRANSPORT_V1",
  ),
  true,
);

// Merged #1282 closes the planner execution-state gate. Keep this
// integration proof bound to the coherent pending-state source contract.
assert.equal(
  plannerSource.includes('execution_state_tag: "pending"'),
  true,
);
assert.equal(
  plannerSource.includes(
    '[policy.fulfillment_wallet_address, "latest"]',
  ),
  false,
);
const estimateStart = plannerSource.indexOf(
  'const estimateResponse = await call("eth_estimateGas", [',
);
const estimateEnd = plannerSource.indexOf("]);", estimateStart);
assert.ok(estimateStart >= 0 && estimateEnd > estimateStart);
const estimateCallSource = plannerSource.slice(
  estimateStart,
  estimateEnd + 3,
);
assert.equal(estimateCallSource.includes('"pending"'), true);

const thisFile = fileURLToPath(import.meta.url);
const runtimeModule = thisFile.endsWith(".ts")
  ? parentPath
  : path.join(
      path.dirname(thisFile),
      "..",
      "src/economic/buy_void_runtime_integration_v1.js",
    );

await import(
  pathToFileURL(runtimeModule).href +
    `?erc20-dependency-integration-gate=${Date.now()}`
);
await new Promise((resolve) => setTimeout(resolve, 450));

const parentStatusRoute = "/__void/operator/buy-void-runtime-v1/status";
const deliveryStatusRoute =
  "/__void/operator/buy-void-delivery-runtime-v1/status";
const deliveryCommandRoute =
  "/__void/operator/buy-void-delivery-runtime-v1/command";

assert.equal(routes.has(`GET ${parentStatusRoute}`), true);
assert.equal(routes.has(`GET ${deliveryStatusRoute}`), true);
assert.equal(routes.has(`POST ${deliveryCommandRoute}`), true);

const status = await call("GET", parentStatusRoute, {
  socket: { remoteAddress: "127.0.0.1" },
});
assert.equal(status.status, 200);
const canonical = status.body.canonical_delivery;

assert.equal(canonical.asset_mode, "void_token_erc20");
assert.equal(canonical.canonical_delivery_dependency_bootstrap_ready, true);
assert.equal(
  canonical.erc20_transaction_preparation_execution_state_ready,
  true,
);
assert.equal(
  canonical.dependency_bootstrap_integration_gate.marker,
  "VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_INTEGRATION_GATE_V1",
);
assert.equal(
  canonical.dependency_bootstrap_integration_gate.status,
  "source_ready",
);
assert.equal(
  canonical.dependency_bootstrap_integration_gate
    .erc20_transaction_preparation_execution_state_ready,
  true,
);
assert.equal(
  canonical.dependency_bootstrap_integration_gate.next_funding_blocker,
  "canonical_delivery_runtime_activation_not_ready",
);
assert.equal(
  canonical.dependency_bootstrap_integration_gate.authority.credential_read,
  false,
);
assert.equal(canonical.delivery_runtime_parent_mounted, true);
assert.equal(canonical.canonical_delivery_execution_ready, false);
assert.equal(canonical.canonical_delivery_execution_held, true);
assert.equal(canonical.presale_inventory_funding_ready, false);
assert.deepEqual(canonical.funding_blockers, [
  "canonical_delivery_runtime_activation_not_ready",
]);
assert.equal(canonical.runtime_status.mounted, true);
assert.equal(canonical.runtime_status.enabled, false);
assert.equal(canonical.runtime_status.policy_configured, false);
assert.equal(canonical.runtime_status.signer_configured, false);
assert.equal(canonical.runtime_status.broadcaster_configured, false);
assert.equal(
  canonical.runtime_status.effective_authority.transaction_broadcast,
  false,
);
assert.equal(
  canonical.runtime_status.effective_authority.money_movement,
  false,
);
assert.equal(
  (globalThis as any).__void_buy_void_delivery_runtime_dependencies_v1,
  undefined,
);
assert.equal(fs.existsSync(path.join(tmp, "buy_void_v1")), false);

fs.rmSync(tmp, { recursive: true, force: true });

console.log(
  "VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_INTEGRATION_GATE_V1_PROOF_GREEN",
);
console.log("canonical_delivery_dependency_bootstrap_ready=1");
console.log("erc20_transaction_preparation_execution_state_ready=1");
console.log("canonical_delivery_runtime_parent_mounted=1");
console.log("canonical_delivery_execution_ready=0");
console.log("production_credential_read=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("presale_inventory_funding_ready=0");
console.log("money_movement=0");
