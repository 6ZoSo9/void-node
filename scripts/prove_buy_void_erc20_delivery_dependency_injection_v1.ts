import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
} from "../src/economic/buy_void_erc20_production_credential_binding_evidence_v1.js";

const root = process.cwd();
const tmp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-erc20-dormant-dependency-injection-v1-"),
);
const runtimeRoot = path.join(tmp, "runtime");
const fakeCredentialDir = path.join(tmp, "credentials-not-read");
const injectorPath = path.join(
  root,
  "src/economic/buy_void_erc20_delivery_dependency_injection_v1.ts",
);
const deliveryPath = path.join(
  root,
  "src/economic/buy_void_delivery_runtime_integration_v1.ts",
);

const canonicalWallet = "0xc884f631c3881b8b672bfcbf019c856146cd7f73";
const mismatchedWallet =
  "0x3333333333333333333333333333333333333333";

const baseEnv: Record<string, string> = {
  DATA_DIR: tmp,
  CREDENTIALS_DIRECTORY: fakeCredentialDir,
  VOID_BUY_VOID_RUNTIME_DIR: runtimeRoot,
  VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED: "0",
  VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_ENABLED: "0",
  VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_INJECTION_ENABLED: "1",
  VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID:
    VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
  VOID_BUY_VOID_DELIVERY_CHAIN_ID: "2050",
  VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS:
    "0x470075b85352eb86f7d089fb9ba88945f12aad94",
  VOID_BUY_VOID_DELIVERY_WALLET_ADDRESS: canonicalWallet,
  VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS: "2000000",
  VOID_BUY_VOID_DELIVERY_MAX_GAS_LIMIT: "100000",
  VOID_BUY_VOID_DELIVERY_MAX_FEE_PER_GAS_WEI: "1200000009",
  VOID_BUY_VOID_DELIVERY_MAX_PRIORITY_FEE_PER_GAS_WEI: "100000000",
  VOID_BUY_VOID_ERC20_EXECUTION_RPC_URL: "http://127.0.0.1:8545/",
  VOID_BUY_VOID_DELIVERY_GAS_LIMIT_MULTIPLIER_BPS: "12000",
  VOID_BUY_VOID_DELIVERY_FEE_MULTIPLIER_BPS: "12000",
  VOID_BUY_VOID_DELIVERY_MIN_CONFIRMATIONS: "3",
  VOID_BUY_VOID_DELIVERY_RPC_TIMEOUT_MS: "5000",
  VOID_BUY_VOID_DELIVERY_RPC_MAX_RESPONSE_BYTES: "65536",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_CHAIN: "base",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_USDC_CONTRACT:
    "0x1111111111111111111111111111111111111111",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_RECEIVE_ADDRESS:
    "0x2222222222222222222222222222222222222222",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_CURRENT_BLOCK_NUMBER: "105",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_MIN_CONFIRMATIONS: "3",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_NUMERATOR: "2",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_DENOMINATOR: "1",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_INVENTORY_POLICY_VERSION: "presale-v1",
  VOID_BUY_VOID_INVENTORY_POOL_ID: "buy-void-presale-v1",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_POOL_CAPACITY_VOID_UNITS: "10000000",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_MAX_RESERVATION_VOID_UNITS: "2000000",
  VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS: canonicalWallet,
};

const controlledKeys = new Set(Object.keys(baseEnv));

function setCaseEnv(
  overrides: Record<string, string | undefined> = {},
): void {
  for (const key of controlledKeys) delete process.env[key];
  for (const [key, value] of Object.entries(baseEnv)) {
    process.env[key] = value;
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function clearGlobals(): void {
  delete (globalThis as any).__void_buy_void_delivery_runtime_dependencies_v1;
  delete (globalThis as any)
    .__void_buy_void_erc20_delivery_dependency_injection_status_v1;
  delete (globalThis as any).__void_buy_void_delivery_runtime_integration_v1;
}

async function injectionCase(
  name: string,
  overrides: Record<string, string | undefined>,
) {
  setCaseEnv(overrides);
  clearGlobals();
  const module = await import(
    pathToFileURL(injectorPath).href +
      `?case=${name}-${Date.now()}-${Math.random()}`
  );
  return {
    status: module.buyVoidErc20DeliveryDependencyInjectionStatusV1(),
    dependencies:
      (globalThis as any).__void_buy_void_delivery_runtime_dependencies_v1,
  };
}

for (const [name, overrides, expectedReason] of [
  [
    "delivery-enabled",
    { VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_ENABLED: "1" },
    "delivery_runtime_exact_disabled_value_required",
  ],
  [
    "delivery-unset",
    { VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_ENABLED: undefined },
    "delivery_runtime_exact_disabled_value_required",
  ],
  [
    "wallet-mismatch",
    { VOID_BUY_VOID_DELIVERY_WALLET_ADDRESS: mismatchedWallet },
    "credential_binding_wallet_mismatch",
  ],
  [
    "evidence-mismatch",
    { VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID: "0".repeat(64) },
    "credential_binding_evidence_id_mismatch",
  ],
] as const) {
  const result = await injectionCase(name, overrides);
  assert.equal(result.status.status, "held");
  assert.equal(result.status.injected, false);
  assert.equal(result.status.reason, expectedReason);
  assert.equal(result.dependencies, undefined);
  assert.equal(result.status.credential_read_performed, false);
  assert.equal(result.status.rpc_call_performed, false);
  assert.equal(result.status.signing_performed, false);
  assert.equal(result.status.transaction_broadcast_performed, false);
  assert.equal(result.status.money_movement_performed, false);
  assert.equal(result.status.submission_guard_write_performed, false);
}

const happy = await injectionCase("happy-disabled", {});
assert.equal(happy.status.status, "injected");
assert.equal(happy.status.injected, true);
assert.equal(
  happy.status.canonical_production_wallet_address,
  canonicalWallet,
);
assert.ok(happy.dependencies, "dependency global must be populated");
assert.equal(typeof happy.dependencies.signer?.get_address, "function");
assert.equal(typeof happy.dependencies.signer?.sign_transaction, "function");
assert.equal(
  typeof happy.dependencies.broadcaster?.broadcast_signed_transaction,
  "function",
);
assert.equal(happy.status.credential_read_performed, false);
assert.equal(happy.status.rpc_call_performed, false);
assert.equal(happy.status.signing_performed, false);
assert.equal(happy.status.transaction_broadcast_performed, false);
assert.equal(happy.status.money_movement_performed, false);
assert.equal(happy.status.submission_guard_write_performed, false);

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
delete (globalThis as any).__void_buy_void_delivery_runtime_integration_v1;
await import(
  pathToFileURL(deliveryPath).href +
    `?disabled-authority=${Date.now()}`
);
await new Promise((resolve) => setTimeout(resolve, 450));

const deliveryStatusHandler = routes.get(
  "GET /__void/operator/buy-void-delivery-runtime-v1/status",
);
assert.ok(deliveryStatusHandler);

let response: any = null;
const res: any = {
  setHeader() {},
  statusCode: 200,
  status(code: number) {
    this.statusCode = code;
    return this;
  },
  json(body: any) {
    response = { status: this.statusCode, body };
    return this;
  },
};
await Promise.resolve(
  deliveryStatusHandler(
    { socket: { remoteAddress: "127.0.0.1" } },
    res,
  ),
);

assert.equal(response.status, 200);
assert.equal(response.body.enabled, false);
assert.equal(response.body.policy_configured, true);
assert.equal(response.body.signer_configured, true);
assert.equal(response.body.broadcaster_configured, true);
assert.equal(response.body.effective_authority.rpc_call, false);
assert.equal(response.body.effective_authority.signing, false);
assert.equal(
  response.body.effective_authority.transaction_broadcast,
  false,
);
assert.equal(response.body.effective_authority.money_movement, false);

assert.equal(fs.existsSync(fakeCredentialDir), false);
assert.equal(fs.existsSync(runtimeRoot), false);

fs.rmSync(tmp, { recursive: true, force: true });

console.log(
  "VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_INJECTION_V1_PROOF_GREEN",
);
console.log("credential_binding_evidence_required=1");
console.log("credential_binding_wallet_match_required=1");
console.log("delivery_runtime_exact_disabled_value_required=1");
console.log("delivery_enabled_case_held=1");
console.log("delivery_unset_case_held=1");
console.log("wallet_mismatch_case_held=1");
console.log("evidence_mismatch_case_held=1");
console.log("dependencies_injected_when_delivery_disabled=1");
console.log("credential_read=0");
console.log("submission_guard_write=0");
console.log("rpc_call=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("money_movement=0");
