import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Wallet } from "ethers";
import { pathToFileURL } from "node:url";

const routes = new Map<string, Function>();
const app: any = {
  get(route: string, handler: Function) {
    routes.set(`GET ${route}`, handler);
  },
  post(route: string, ...handlers: Function[]) {
    routes.set(`POST ${route}`, handlers.at(-1)!);
  },
};
(globalThis as any).__void_http_app = app;

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-delivery-runtime-pr1288-"),
);
process.env.VOID_BUY_VOID_RUNTIME_DIR = root;

const wallet = Wallet.createRandom().address.toLowerCase();
const token = Wallet.createRandom().address.toLowerCase();
const receive = Wallet.createRandom().address.toLowerCase();
const usdc = Wallet.createRandom().address.toLowerCase();

const validEnv: Record<string, string> = {
  VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_ENABLED: "1",
  VOID_BUY_VOID_DELIVERY_CHAIN_ID: "2050",
  VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS: token,
  VOID_BUY_VOID_DELIVERY_WALLET_ADDRESS: wallet,
  VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS: "1000000000",
  VOID_BUY_VOID_DELIVERY_MAX_GAS_LIMIT: "100000",
  VOID_BUY_VOID_DELIVERY_MAX_FEE_PER_GAS_WEI: "3000000000",
  VOID_BUY_VOID_DELIVERY_MAX_PRIORITY_FEE_PER_GAS_WEI:
    "1000000000",
  VOID_BUY_VOID_ERC20_EXECUTION_RPC_URL:
    "http://127.0.0.1:8545/",
  VOID_BUY_VOID_DELIVERY_GAS_LIMIT_MULTIPLIER_BPS: "12000",
  VOID_BUY_VOID_DELIVERY_FEE_MULTIPLIER_BPS: "20000",
  VOID_BUY_VOID_DELIVERY_MIN_CONFIRMATIONS: "3",
  VOID_BUY_VOID_DELIVERY_RPC_TIMEOUT_MS: "5000",
  VOID_BUY_VOID_DELIVERY_RPC_MAX_RESPONSE_BYTES: "65536",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_CHAIN: "base",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_USDC_CONTRACT:
    usdc,
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_RECEIVE_ADDRESS:
    receive,
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_CURRENT_BLOCK_NUMBER:
    "105",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_MIN_CONFIRMATIONS:
    "3",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_NUMERATOR:
    "2",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_DENOMINATOR:
    "1",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_INVENTORY_POLICY_VERSION:
    "presale-v1",
  VOID_BUY_VOID_INVENTORY_POOL_ID: "buy-void-presale-v1",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_POOL_CAPACITY_VOID_UNITS:
    "1000000000",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_MAX_RESERVATION_VOID_UNITS:
    "1000000000",
  VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS: wallet,
};

function setEnv(overrides: Record<string, string> = {}): void {
  for (const [key, value] of Object.entries({
    ...validEnv,
    ...overrides,
  })) {
    process.env[key] = value;
  }
}

function responseHarness() {
  let sent: { status: number; body: any } | null = null;
  const res: any = {
    headersSent: false,
    setHeader() {},
    status(code: number) {
      return {
        json(body: any) {
          sent = { status: code, body };
          res.headersSent = true;
          return body;
        },
      };
    },
    json(body: any) {
      sent = { status: 200, body };
      res.headersSent = true;
      return body;
    },
  };
  return {
    res,
    value: () => {
      if (!sent) throw new Error("response_missing");
      return sent;
    },
  };
}

async function call(
  method: "GET" | "POST",
  route: string,
  req: any,
) {
  const handler = routes.get(`${method} ${route}`);
  assert.ok(handler, `route missing ${method} ${route}`);
  const harness = responseHarness();
  await handler(req, harness.res);
  return harness.value();
}

const moduleFile = path.join(
  process.cwd(),
  "src/economic/buy_void_delivery_runtime_integration_v1.ts",
);
await import(
  pathToFileURL(moduleFile).href +
    `?pr1288-runtime-proof=${Date.now()}`
);
await new Promise((resolve) => setTimeout(resolve, 400));

const statusRoute =
  "/__void/operator/buy-void-delivery-runtime-v1/status";
const commandRoute =
  "/__void/operator/buy-void-delivery-runtime-v1/command";

setEnv();
const validStatus = await call("GET", statusRoute, {
  socket: { remoteAddress: "127.0.0.1" },
});
assert.equal(validStatus.status, 200);
assert.equal(validStatus.body.enabled, true);
assert.equal(validStatus.body.policy_configured, true);
assert.equal(
  validStatus.body.canonical_planner_policy_validator_reused,
  true,
);
assert.equal(validStatus.body.effective_authority.rpc_call, true);
assert.equal(validStatus.body.effective_authority.signing, false);
assert.equal(
  validStatus.body.effective_authority.transaction_broadcast,
  false,
);
assert.equal(validStatus.body.effective_authority.money_movement, false);

for (const [override, reason] of [
  [
    {
      VOID_BUY_VOID_ERC20_EXECUTION_RPC_URL:
        "https://127.0.0.1:8545/",
    },
    "rpc_url_must_be_loopback_http",
  ],
  [
    {
      VOID_BUY_VOID_DELIVERY_MIN_CONFIRMATIONS: "1001",
    },
    "receipt_min_confirmations_invalid",
  ],
  [
    {
      VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS:
        "1000000000000000000000",
    },
    "max_amount_exceeds_saga_fulfillment_unit_cap",
  ],
] as const) {
  setEnv(override);
  const status = await call("GET", statusRoute, {
    socket: { remoteAddress: "127.0.0.1" },
  });
  assert.equal(status.status, 200);
  assert.equal(status.body.policy_configured, false);
  assert.match(
    String(status.body.policy_validation_reason || ""),
    new RegExp(reason),
  );
  assert.equal(status.body.effective_authority.rpc_call, false);
  assert.equal(status.body.effective_authority.signing, false);
  assert.equal(
    status.body.effective_authority.transaction_broadcast,
    false,
  );
  assert.equal(status.body.effective_authority.money_movement, false);
}

setEnv();
for (const [key, value] of [
  ["plan", { nonce: 99 }],
  ["transaction_plan", { nonce: 99 }],
  ["nonce", 99],
  ["gas_limit", "21000"],
  ["max_fee_per_gas_wei", "1"],
  ["max_priority_fee_per_gas_wei", "1"],
  ["rpc_url", "http://attacker.invalid"],
  ["policy", {}],
  ["submission_idempotency_key", "a".repeat(64)],
] as const) {
  const rejected = await call("POST", commandRoute, {
    socket: { remoteAddress: "127.0.0.1" },
    body: {
      action: "sign_and_broadcast",
      attempt_id: "1".repeat(64),
      [key]: value,
    },
  });
  assert.equal(rejected.status, 400);
  assert.equal(
    rejected.body.error,
    "caller_supplied_runtime_material_forbidden",
  );
  assert.equal(rejected.body.forbidden_key, key);
  assert.equal(rejected.body.signing_performed, false);
  assert.equal(
    rejected.body.transaction_broadcast_performed,
    false,
  );
  assert.equal(rejected.body.money_movement_performed, false);
}

const noConfirmation = await call("POST", commandRoute, {
  socket: { remoteAddress: "127.0.0.1" },
  body: {
    action: "sign_and_broadcast",
    attempt_id: "1".repeat(64),
    apply: true,
  },
});
assert.equal(noConfirmation.status, 428);
assert.equal(
  noConfirmation.body.error,
  "explicit_confirmation_required",
);

const missingAttempt = await call("POST", commandRoute, {
  socket: { remoteAddress: "127.0.0.1" },
  body: {
    action: "sign_and_broadcast",
    attempt_id: "1".repeat(64),
    apply: false,
  },
});
assert.equal(missingAttempt.status, 404);
assert.equal(missingAttempt.body.ok, false);

assert.equal(routes.has(`GET ${commandRoute}`), false);
delete (globalThis as any).__void_http_app;
delete (globalThis as any)
  .__void_buy_void_delivery_runtime_dependencies_v1;
fs.rmSync(root, { recursive: true, force: true });

console.log(
  "VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1_GREEN",
);
console.log("server_derived_transaction_plan=1");
console.log("caller_supplied_transaction_plan=0");
console.log("canonical_planner_policy_validator_reused=1");
console.log("invalid_policy_rpc_authority=0");
console.log("max_amount_unit_domain=fulfillment_units_6_decimal");
console.log("direct_caller_execution_material=0");
console.log("canonical_parent_mount=0");
console.log("production_wallet_use=0");
console.log("live_transaction_broadcast=0");
console.log("live_money_movement=0");
