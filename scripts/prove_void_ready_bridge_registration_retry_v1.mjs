#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bridgePath = path.join(repoRoot, "src/diag/ready_bridge_v3.cjs");
const source = fs.readFileSync(bridgePath, "utf8");

let intervalCallback = null;
let useCalls = 0;
let clearCalls = 0;
let registeredMiddleware = null;
const timer = { unref() {} };

const sandbox = {
  __void_http_app: {
    use(middleware) {
      useCalls += 1;
      if (useCalls === 1) throw new Error("synthetic_registration_failure");
      registeredMiddleware = middleware;
    },
  },
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
assert.equal(sandbox.__void_ready_bridge_v3_mounted, undefined);

assert.doesNotThrow(() => intervalCallback());
assert.equal(useCalls, 1);
assert.equal(clearCalls, 0);
assert.equal(sandbox.__void_ready_bridge_v3_mounted, undefined);
assert.equal(registeredMiddleware, null);

assert.doesNotThrow(() => intervalCallback());
assert.equal(useCalls, 2);
assert.equal(clearCalls, 1);
assert.equal(sandbox.__void_ready_bridge_v3_mounted, true);
assert.equal(typeof registeredMiddleware, "function");

console.log("void_ready_bridge_registration_retry_v1=PASS");
console.log("failed_registration_marked_mounted=false");
console.log("failed_registration_retry_observed=true");
console.log("successful_registration_marked_mounted=true");
console.log("runtime_or_network_action=false");
