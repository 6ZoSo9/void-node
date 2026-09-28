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

let scheduledCallback = null;
let timeoutCalls = 0;
let useCalls = 0;
let registeredMiddleware = null;
const visibleFailures = [];

const app = {
  use(middleware) {
    useCalls += 1;
    if (useCalls === 1) throw new Error("synthetic_registration_failure");
    registeredMiddleware = middleware;
  },
};

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

assert.equal(sandbox.__void_datanet_require_who_v1, true);
assert.equal(useCalls, 1);
assert.equal(app.__void_datanet_require_who_v1_mounted, undefined);
assert.equal(registeredMiddleware, null);
assert.equal(timeoutCalls, 1);
assert.equal(typeof scheduledCallback, "function");
assert.equal(visibleFailures.length, 1);
assert.equal(
  visibleFailures[0].marker,
  "VOID_SRC_DIAG_DATANET_RECEIPT_PACK3_PATCH_DATANET_REQUIRE_WHO_V1_CJS_1_3_VISIBLE",
);
assert.equal(visibleFailures[0].message, "synthetic_registration_failure");

assert.doesNotThrow(() => scheduledCallback());
assert.equal(useCalls, 2);
assert.equal(app.__void_datanet_require_who_v1_mounted, true);
assert.equal(typeof registeredMiddleware, "function");
assert.equal(timeoutCalls, 1);

assert.doesNotThrow(() => scheduledCallback());
assert.equal(useCalls, 2);
assert.equal(timeoutCalls, 1);

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

console.log("void_datanet_require_who_registration_retry_v1=PASS");
console.log("failed_registration_marked_mounted=false");
console.log("failed_registration_retry_observed=true");
console.log("successful_registration_marked_mounted=true");
console.log("successful_registration_idempotent=true");
console.log("missing_who_guard_preserved=true");
console.log("runtime_or_network_action=false");
