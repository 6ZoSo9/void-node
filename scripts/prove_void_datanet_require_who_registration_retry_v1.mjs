#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const guardPath = path.join(repoRoot, "src/diag/patch_datanet_require_who_v1.cjs");
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

function makeResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

const missingWhoRequest = {
  method: "GET",
  path: "/datanet/v1/fetch/receipt-1",
  originalUrl: "/datanet/v1/fetch/receipt-1",
};
const allowedWhoRequest = {
  method: "GET",
  path: "/datanet/v1/fetch/receipt-1",
  originalUrl: "/datanet/v1/fetch/receipt-1?who=agent-1",
};

let delayedUseCalls = 0;
let delayedHandleCalls = 0;
let registeredMiddleware = null;
const delayed = makeSandbox(undefined);
assert.equal(delayed.timeoutCalls(), 1);
assert.equal(typeof delayed.scheduledCallback(), "function");
const delayedApp = {
  _router: { stack: [] },
  handle() {
    delayedHandleCalls += 1;
  },
  use(middleware) {
    delayedUseCalls += 1;
    registeredMiddleware = middleware;
    this._router.stack.push({ handle: middleware });
  },
};
delayed.sandbox.__void_http_app = delayedApp;
assert.doesNotThrow(() => delayed.scheduledCallback()());
assert.equal(delayedUseCalls, 1);
assert.equal(delayedApp.__void_datanet_require_who_v1_mounted, true);
assert.equal(delayedApp.__void_datanet_require_who_v1_mount_state, "bound");
assert.equal(delayed.timeoutCalls(), 1);
assert.equal(delayed.visibleFailures.length, 0);
delayedApp.handle({ method: "GET", url: "/health" }, makeResponse(), () => {});
assert.equal(delayedHandleCalls, 1);

let statusCode = null;
let responseBody = null;
let nextCalls = 0;
registeredMiddleware(
  missingWhoRequest,
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
  allowedWhoRequest,
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

let beforeRetainUseCalls = 0;
let beforeRetainHandleCalls = 0;
const beforeRetainApp = {
  _router: { stack: [] },
  handle() {
    beforeRetainHandleCalls += 1;
  },
  use(middleware) {
    beforeRetainUseCalls += 1;
    if (beforeRetainUseCalls === 1) throw new Error("synthetic_throw_before_retain");
    this._router.stack.push({ handle: middleware });
  },
};
const beforeRetain = makeSandbox(beforeRetainApp);
assert.equal(beforeRetainUseCalls, 1);
assert.equal(beforeRetainApp._router.stack.length, 0);
assert.equal(beforeRetainApp.__void_datanet_require_who_v1_mount_state, "idle");
assert.equal(beforeRetain.timeoutCalls(), 1);
assert.equal(beforeRetain.visibleFailures.length, 1);
const beforeRetryHold = makeResponse();
beforeRetainApp.handle(missingWhoRequest, beforeRetryHold, () => {});
assert.equal(beforeRetryHold.statusCode, 503);
assert.equal(beforeRetryHold.body?.error, "datanet_who_guard_registration_indeterminate");
assert.equal(beforeRetainHandleCalls, 0);
beforeRetainApp.handle({ method: "GET", url: "/health" }, makeResponse(), () => {});
assert.equal(beforeRetainHandleCalls, 1);
assert.doesNotThrow(() => beforeRetain.scheduledCallback()());
assert.equal(beforeRetainUseCalls, 2);
assert.equal(beforeRetainApp._router.stack.length, 1);
assert.equal(beforeRetainApp.__void_datanet_require_who_v1_mount_state, "bound");
assert.equal(beforeRetainApp.__void_datanet_require_who_v1_mounted, true);
assert.equal(beforeRetain.timeoutCalls(), 1);
assert.doesNotThrow(() => beforeRetain.scheduledCallback()());
assert.equal(beforeRetainUseCalls, 2);
assert.equal(beforeRetainApp._router.stack.length, 1);

let retainedUseCalls = 0;
const retainedApp = {
  _router: { stack: [] },
  handle() {},
  use(middleware) {
    retainedUseCalls += 1;
    this._router.stack.push({ handle: middleware });
    throw new Error("synthetic_retain_then_throw");
  },
};
const retained = makeSandbox(retainedApp);
assert.equal(retainedUseCalls, 1);
assert.equal(retainedApp._router.stack.length, 1);
assert.equal(retainedApp.__void_datanet_require_who_v1_mount_state, "bound");
assert.equal(retainedApp.__void_datanet_require_who_v1_mounted, true);
assert.equal(retained.timeoutCalls(), 0);
assert.equal(retained.visibleFailures.length, 1);
vm.runInNewContext(source, retained.sandbox, { filename: guardPath });
assert.equal(retainedUseCalls, 1);
assert.equal(retainedApp._router.stack.length, 1);

let unknownUseCalls = 0;
let unknownHandleCalls = 0;
const unknownApp = {
  handle() {
    unknownHandleCalls += 1;
  },
  use() {
    unknownUseCalls += 1;
    throw new Error("synthetic_unknown_registration_outcome");
  },
};
const unknown = makeSandbox(unknownApp);
assert.equal(unknownUseCalls, 1);
assert.equal(unknownApp.__void_datanet_require_who_v1_mount_state, "indeterminate");
assert.equal(unknownApp.__void_datanet_require_who_v1_mounted, undefined);
assert.equal(unknown.timeoutCalls(), 0);
assert.equal(unknown.visibleFailures.length, 1);
const unknownHold = makeResponse();
unknownApp.handle(missingWhoRequest, unknownHold, () => {});
assert.equal(unknownHold.statusCode, 503);
assert.equal(unknownHold.body?.error, "datanet_who_guard_registration_indeterminate");
assert.equal(unknownHandleCalls, 0);
unknownApp.handle({ method: "GET", url: "/health" }, makeResponse(), () => {});
assert.equal(unknownHandleCalls, 1);
vm.runInNewContext(source, unknown.sandbox, { filename: guardPath });
assert.equal(unknownUseCalls, 1);
assert.equal(unknown.timeoutCalls(), 0);

console.log("void_datanet_require_who_registration_retry_v1=PASS");
console.log("missing_app_retry_preserved=true");
console.log("throw_before_retain_retry_preserved=true");
console.log("retry_window_fail_closed=true");
console.log("retain_then_throw_detected=true");
console.log("duplicate_middleware_prevented=true");
console.log("unknown_registration_outcome_fail_closed=true");
console.log("successful_registration_idempotent=true");
console.log("missing_who_guard_preserved=true");
console.log("runtime_or_network_action=false");
