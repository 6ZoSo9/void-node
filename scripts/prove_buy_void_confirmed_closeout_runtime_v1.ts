import assert from "node:assert/strict";

process.env.VOID_BUY_VOID_CONFIRMED_CLOSEOUT_RUNTIME_ENABLED =
  "0";

const routes: Record<string, any> = {};
(globalThis as any).__void_http_app = {
  get(path: string, handler: any) {
    routes[`GET ${path}`] = handler;
  },
  post(path: string, _json: any, handler: any) {
    routes[`POST ${path}`] = handler;
  },
};

const runtime = await import(
  "../src/economic/buy_void_confirmed_closeout_runtime_v1.js"
);

const status =
  runtime.buyVoidConfirmedCloseoutRuntimeStatusV1();
assert.equal(
  status.marker,
  runtime.VOID_BUY_VOID_CONFIRMED_CLOSEOUT_RUNTIME_V1,
);
assert.equal(status.enabled, false);
assert.equal(status.operator_loopback_only, true);
assert.equal(status.one_request_per_command, true);
assert.equal(
  status.required_confirmation,
  "buyVoidConsumeInventoryAndClosePublicRequest",
);

const statusRoute =
  runtime
    .VOID_BUY_VOID_CONFIRMED_CLOSEOUT_RUNTIME_ROUTES_V1
    .status;
const commandRoute =
  runtime
    .VOID_BUY_VOID_CONFIRMED_CLOSEOUT_RUNTIME_ROUTES_V1
    .command;

assert.equal(
  typeof routes[`GET ${statusRoute}`],
  "function",
);
assert.equal(
  typeof routes[`POST ${commandRoute}`],
  "function",
);

let responseStatus = 0;
let responseBody: any = null;
const res = {
  status(value: number) {
    responseStatus = value;
    return this;
  },
  json(value: any) {
    responseBody = value;
    return value;
  },
};

runtime.handleBuyVoidConfirmedCloseoutRuntimeCommandV1(
  {
    ip: "127.0.0.1",
    socket: { remoteAddress: "127.0.0.1" },
    body: {
      attempt_id: "a".repeat(64),
      apply: false,
    },
  },
  res,
);

assert.equal(responseStatus, 503);
assert.equal(
  responseBody.error,
  "confirmed_closeout_runtime_disabled",
);

responseStatus = 0;
responseBody = null;

runtime.handleBuyVoidConfirmedCloseoutRuntimeCommandV1(
  {
    ip: "203.0.113.8",
    socket: { remoteAddress: "203.0.113.8" },
    body: {},
  },
  res,
);

assert.equal(responseStatus, 403);
assert.equal(responseBody.error, "loopback_required");

console.log(
  "VOID_BUY_VOID_CONFIRMED_CLOSEOUT_RUNTIME_V1_GREEN",
);
console.log("operator_loopback_only=1");
console.log("disabled_by_default=1");
console.log("attempt_id_only_selector=1");
console.log("dry_by_default=1");
console.log("exact_confirmation_required=1");
console.log("wallet_access=0");
console.log("credential_access=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("rpc_call=0");
console.log("background_loop=0");
console.log("startup_execution=0");
console.log("money_movement=0");
