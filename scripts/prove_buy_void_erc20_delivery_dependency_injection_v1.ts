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
delete (globalThis as any).__void_buy_void_erc20_delivery_dependency_injection_status_v1;

process.env.DATA_DIR = tmp;
process.env.CREDENTIALS_DIRECTORY = fakeCredentialDir;
process.env.VOID_BUY_VOID_RUNTIME_DIR = runtimeRoot;
process.env.VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED = "0";
process.env.VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_ENABLED = "0";
process.env.VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_INJECTION_ENABLED = "1";
process.env.VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID =
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1;
process.env.VOID_BUY_VOID_DELIVERY_CHAIN_ID = "2050";
process.env.VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS = "0x470075b85352eb86f7d089fb9ba88945f12aad94";
process.env.VOID_BUY_VOID_DELIVERY_WALLET_ADDRESS = "0xc884f631c3881b8b672bfcbf019c856146cd7f73";
process.env.VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS = "2000000";
process.env.VOID_BUY_VOID_DELIVERY_MAX_GAS_LIMIT = "100000";
process.env.VOID_BUY_VOID_DELIVERY_MAX_FEE_PER_GAS_WEI = "1200000009";
process.env.VOID_BUY_VOID_DELIVERY_MAX_PRIORITY_FEE_PER_GAS_WEI = "100000000";
process.env.VOID_BUY_VOID_ERC20_EXECUTION_RPC_URL = "http://127.0.0.1:8545/";
process.env.VOID_BUY_VOID_DELIVERY_GAS_LIMIT_MULTIPLIER_BPS = "12000";
process.env.VOID_BUY_VOID_DELIVERY_FEE_MULTIPLIER_BPS = "12000";
process.env.VOID_BUY_VOID_DELIVERY_MIN_CONFIRMATIONS = "3";
process.env.VOID_BUY_VOID_DELIVERY_RPC_TIMEOUT_MS = "5000";
process.env.VOID_BUY_VOID_DELIVERY_RPC_MAX_RESPONSE_BYTES = "65536";

// The canonical ERC20 execution policy is intentionally coupled to the
// crash-consistent saga server policy. This synthetic dependency-injection
// proof therefore supplies a complete bounded saga policy instead of
// weakening the runtime's policy_configured requirement.
process.env.VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_CHAIN = "base";
process.env.VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_USDC_CONTRACT =
  "0x1111111111111111111111111111111111111111";
process.env.VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_RECEIVE_ADDRESS =
  "0x2222222222222222222222222222222222222222";
process.env.VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_CURRENT_BLOCK_NUMBER =
  "105";
process.env.VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_MIN_CONFIRMATIONS =
  "3";
process.env.VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_NUMERATOR =
  "2";
process.env.VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_DENOMINATOR =
  "1";
process.env.VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_INVENTORY_POLICY_VERSION =
  "presale-v1";
process.env.VOID_BUY_VOID_INVENTORY_POOL_ID = "buy-void-presale-v1";
process.env.VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_POOL_CAPACITY_VOID_UNITS =
  "10000000";
process.env.VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_MAX_RESERVATION_VOID_UNITS =
  "2000000";
process.env.VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS =
  "0xc884f631c3881b8b672bfcbf019c856146cd7f73";

const parent = path.join(
  root,
  "src/economic/buy_void_runtime_integration_v1.ts",
);
await import(pathToFileURL(parent).href + `?dormant-injection=${Date.now()}`);
await new Promise((resolve) => setTimeout(resolve, 450));

const dependencies =
  (globalThis as any).__void_buy_void_delivery_runtime_dependencies_v1;
assert.ok(dependencies, "dependency global must be populated");
assert.equal(typeof dependencies.signer?.get_address, "function");
assert.equal(typeof dependencies.signer?.sign_transaction, "function");
assert.equal(
  typeof dependencies.broadcaster?.broadcast_signed_transaction,
  "function",
);

const injection =
  (globalThis as any).__void_buy_void_erc20_delivery_dependency_injection_status_v1;
assert.equal(injection.status, "injected");
assert.equal(injection.injected, true);
assert.equal(injection.credential_read_performed, false);
assert.equal(injection.rpc_call_performed, false);
assert.equal(injection.signing_performed, false);
assert.equal(injection.transaction_broadcast_performed, false);
assert.equal(injection.money_movement_performed, false);
assert.equal(injection.submission_guard_write_performed, false);

const deliveryStatusHandler = routes.get(
  "GET /__void/operator/buy-void-delivery-runtime-v1/status",
);
assert.ok(deliveryStatusHandler);
let response: any = null;
const res: any = {
  setHeader() {},
  statusCode: 200,
  status(code: number) { this.statusCode = code; return this; },
  json(body: any) { response = { status: this.statusCode, body }; return this; },
};
await Promise.resolve(
  deliveryStatusHandler({ socket: { remoteAddress: "127.0.0.1" } }, res),
);
assert.equal(response.status, 200);
assert.equal(response.body.enabled, false);
assert.equal(response.body.policy_configured, true);
assert.equal(response.body.signer_configured, true);
assert.equal(response.body.broadcaster_configured, true);
assert.equal(response.body.effective_authority.rpc_call, false);
assert.equal(response.body.effective_authority.signing, false);
assert.equal(response.body.effective_authority.transaction_broadcast, false);
assert.equal(response.body.effective_authority.money_movement, false);

assert.equal(fs.existsSync(fakeCredentialDir), false);
assert.equal(fs.existsSync(runtimeRoot), false);

fs.rmSync(tmp, { recursive: true, force: true });

console.log("VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_INJECTION_V1_PROOF_GREEN");
console.log("credential_binding_evidence_required=1");
console.log("dependency_injection_enabled=1");
console.log("dependencies_injected=1");
console.log("delivery_runtime_enabled=0");
console.log("credential_read=0");
console.log("submission_guard_write=0");
console.log("rpc_call=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("money_movement=0");
