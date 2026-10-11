#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const guardPath = path.join(
  repoRoot,
  "src/diag/patch_datanet_require_who_v1.cjs",
);
const source = fs.readFileSync(guardPath, "utf8");

function makeSandbox(app) {
  let scheduledCallback = null;
  let timeoutCalls = 0;
  const visibleFailures = [];
  const sandbox = {
    URL,
    __void_http_app: app,
    __voidSrcDiagPack3Visible(marker, error) {
      visibleFailures.push({ marker, message: String(error?.message || error) });
    },
    console: { error() {} },
    setTimeout(callback, delayMs) {
      assert.equal(delayMs, 250);
      timeoutCalls += 1;
      scheduledCallback = callback;
      return { unref() {} };
    },
  };
  vm.runInNewContext(source, sandbox, { filename: guardPath });
  return {
    sandbox,
    visibleFailures,
    scheduledCallback: () => scheduledCallback,
    timeoutCalls: () => timeoutCalls,
  };
}

let delayedUseCalls = 0;
let registeredMiddleware = null;
const delayed = makeSandbox(undefined);
assert.equal(delayed.timeoutCalls(), 1);
assert.equal(typeof delayed.scheduledCallback(), "function");
delayed.sandbox.__void_http_app = {
  use(middleware) {
    delayedUseCalls += 1;
    registeredMiddleware = middleware;
  },
};
assert.doesNotThrow(() => delayed.scheduledCallback()());
assert.equal(delayedUseCalls, 1);
assert.equal(
  delayed.sandbox.__void_http_app.__void_datanet_require_who_v1_mounted,
  true,
);
assert.equal(
  delayed.sandbox.__void_http_app.__void_datanet_require_who_v1_mount_state,
  "bound",
);
assert.equal(delayed.timeoutCalls(), 1);
assert.equal(delayed.visibleFailures.length, 0);

let statusCode = null;
let responseBody = null;
let nextCalls = 0;
registeredMiddleware(
  {
    method: "GET",
    path: "/datanet/v1/fetch/receipt-1",
    originalUrl: "/datanet/v1/fetch/receipt-1",
  },
  {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    },
  },
  () => {
    nextCalls += 1;
  },
);
assert.equal(statusCode, 400);
assert.equal(responseBody?.ok, false);
assert.equal(responseBody?.error, "missing_who");
assert.equal(nextCalls, 0);

registeredMiddleware(
  {
    method: "GET",
    path: "/datanet/v1/fetch/receipt-1",
    originalUrl: "/datanet/v1/fetch/receipt-1?who=agent-1",
  },
  {
    status() {
      throw new Error("allowed request must not set a status");
    },
    json() {
      throw new Error("allowed request must not send a body");
    },
  },
  () => {
    nextCalls += 1;
  },
);
assert.equal(nextCalls, 1);

let partialUseCalls = 0;
const retainedMiddleware = [];
const partialApp = {
  use(middleware) {
    partialUseCalls += 1;
    retainedMiddleware.push(middleware);
    throw new Error("synthetic_install_then_throw");
  },
};
const partial = makeSandbox(partialApp);
assert.equal(partialUseCalls, 1);
assert.equal(retainedMiddleware.length, 1);
assert.equal(partialApp.__void_datanet_require_who_v1_mounted, undefined);
assert.equal(
  partialApp.__void_datanet_require_who_v1_mount_state,
  "indeterminate",
);
assert.equal(partial.timeoutCalls(), 0);
assert.equal(partial.scheduledCallback(), null);
assert.equal(partial.visibleFailures.length, 1);
assert.equal(
  partial.visibleFailures[0].marker,
  "VOID_SRC_DIAG_DATANET_RECEIPT_PACK3_PATCH_DATANET_REQUIRE_WHO_V1_CJS_1_3_VISIBLE",
);
assert.equal(partial.visibleFailures[0].message, "synthetic_install_then_throw");

vm.runInNewContext(source, partial.sandbox, { filename: guardPath });
assert.equal(partialUseCalls, 1);
assert.equal(retainedMiddleware.length, 1);
assert.equal(partial.timeoutCalls(), 0);

console.log("void_datanet_require_who_registration_retry_v1=PASS");
console.log("missing_app_retry_preserved=true");
console.log("successful_registration_marked_bound=true");
console.log("successful_registration_idempotent=true");
console.log("install_then_throw_marked_indeterminate=true");
console.log("indeterminate_registration_retry_refused=true");
console.log("duplicate_middleware_prevented=true");
console.log("missing_who_guard_preserved=true");
console.log("runtime_or_network_action=false");
