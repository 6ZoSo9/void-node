#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bridgePath = path.join(repoRoot, "src/diag/ready_bridge_v3.cjs");
const source = fs.readFileSync(bridgePath, "utf8");

function evaluate(initialApp) {
  let intervalCallback = null;
  let clearCalls = 0;
  const timer = { unref() {} };
  const sandbox = {
    __void_http_app: initialApp,
    clearInterval(value) {
      assert.equal(value, timer);
      clearCalls += 1;
    },
    console: { error() {} },
    setInterval(callback, delayMs) {
      assert.equal(delayMs, 200);
      intervalCallback = callback;
      return timer;
    },
  };
  vm.runInNewContext(source, sandbox, { filename: bridgePath });
  assert.equal(typeof intervalCallback, "function");
  return {
    sandbox,
    intervalCallback: () => intervalCallback(),
    clearCalls: () => clearCalls,
  };
}

let partialUseCalls = 0;
let partialMiddleware = null;
const partial = evaluate({
  use(middleware) {
    partialUseCalls += 1;
    partialMiddleware = middleware;
    throw new Error("synthetic_install_then_throw");
  },
});

assert.doesNotThrow(() => partial.intervalCallback());
assert.equal(partialUseCalls, 1);
assert.equal(partial.clearCalls(), 1);
assert.equal(typeof partialMiddleware, "function");
assert.equal(partial.sandbox.__void_ready_bridge_v3_mounted, undefined);
assert.equal(
  partial.sandbox.__void_ready_bridge_v3_mount_state,
  "indeterminate",
);

assert.doesNotThrow(() => partial.intervalCallback());
assert.equal(partialUseCalls, 1, "indeterminate retry duplicated middleware");

let successUseCalls = 0;
let registeredMiddleware = null;
const success = evaluate(undefined);
assert.doesNotThrow(() => success.intervalCallback());
assert.equal(successUseCalls, 0);
assert.equal(success.clearCalls(), 0);

success.sandbox.__void_http_app = {
  use(middleware) {
    successUseCalls += 1;
    registeredMiddleware = middleware;
  },
};
assert.doesNotThrow(() => success.intervalCallback());
assert.equal(successUseCalls, 1);
assert.equal(success.clearCalls(), 1);
assert.equal(success.sandbox.__void_ready_bridge_v3_mounted, true);
assert.equal(success.sandbox.__void_ready_bridge_v3_mount_state, "mounted");
assert.equal(typeof registeredMiddleware, "function");

assert.doesNotThrow(() => success.intervalCallback());
assert.equal(successUseCalls, 1, "completed retry duplicated middleware");

console.log("void_ready_bridge_registration_retry_v1=PASS");
console.log("missing_app_retry_preserved=true");
console.log("install_then_throw_state=indeterminate");
console.log("indeterminate_retry_refused=true");
console.log("successful_registration_marked_mounted=true");
console.log("completed_retry_idempotent=true");
console.log("runtime_or_network_action=false");
