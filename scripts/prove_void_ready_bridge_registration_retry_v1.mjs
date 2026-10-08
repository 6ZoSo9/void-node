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

function invokeRetainedMiddleware(middleware, url, channel, value) {
  let nextCalls = 0;
  let forwarded;
  const res = {
    json(body) { forwarded = body; return "json_sent"; },
    send(body) { forwarded = body; return "send_sent"; },
  };
  const originalJson = res.json;
  const originalSend = res.send;
  middleware({ originalUrl: url }, res, () => { nextCalls += 1; });
  assert.equal(nextCalls, 1, "retained handler must advance once");
  const result = channel === "json" ? res.json(value) : res.send(value);
  assert.equal(result, channel + "_sent");
  return {
    forwarded,
    wrappedJson: res.json !== originalJson,
    wrappedSend: res.send !== originalSend,
  };
}

const pessimisticJson = () => ({
  head: 41,
  ready: false,
  gap: 9,
  txroot_live: 0,
  lastmile_seen: 0,
  reasons: ["not_ready"],
});
const pessimisticProm = [
  "void_ready_head 41",
  "void_ready 0",
  "void_ready_lastmile_seen 0",
  "void_ready_gap 9",
  "void_txroot_live 0",
  "",
].join("\n");

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

// Express adapters may retain middleware even if app.use throws.
// A partial registration must not advertise healthy readiness.
const partialJsonBody = pessimisticJson();
const partialJsonBefore = JSON.stringify(partialJsonBody);
const partialJsonResponse = invokeRetainedMiddleware(
  partialMiddleware,
  "/__void/ready.json",
  "json",
  partialJsonBody,
);
assert.equal(JSON.stringify(partialJsonResponse.forwarded), partialJsonBefore);
assert.equal(partialJsonResponse.wrappedJson, false);
assert.equal(partialJsonResponse.wrappedSend, false);

const partialPromResponse = invokeRetainedMiddleware(
  partialMiddleware,
  "/__void/ready.details.prom",
  "send",
  pessimisticProm,
);
assert.equal(partialPromResponse.forwarded, pessimisticProm);
assert.equal(partialPromResponse.wrappedJson, false);
assert.equal(partialPromResponse.wrappedSend, false);

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

// A completed mount must retain the original positive-head bridge behavior.
const mountedJsonResponse = invokeRetainedMiddleware(
  registeredMiddleware,
  "/__void/ready.json",
  "json",
  pessimisticJson(),
);
assert.equal(mountedJsonResponse.wrappedJson, true);
assert.equal(mountedJsonResponse.wrappedSend, true);
assert.equal(mountedJsonResponse.forwarded.head, 41);
assert.equal(mountedJsonResponse.forwarded.ready, true);
assert.equal(mountedJsonResponse.forwarded.gap, 0);
assert.equal(mountedJsonResponse.forwarded.txroot_live, 1);
assert.equal(mountedJsonResponse.forwarded.lastmile_seen, 41);
assert.deepEqual(Array.from(mountedJsonResponse.forwarded.reasons), []);

const mountedPromResponse = invokeRetainedMiddleware(
  registeredMiddleware,
  "/__void/ready.details.prom",
  "send",
  pessimisticProm,
);
assert.equal(mountedPromResponse.wrappedSend, true);
assert.match(mountedPromResponse.forwarded, /^void_ready_head 41$/m);
assert.match(mountedPromResponse.forwarded, /^void_ready 1$/m);
assert.match(mountedPromResponse.forwarded, /^void_ready_lastmile_seen 41$/m);
assert.match(mountedPromResponse.forwarded, /^void_ready_gap 0$/m);
assert.match(mountedPromResponse.forwarded, /^void_txroot_live 1$/m);
assert.doesNotMatch(mountedPromResponse.forwarded, /^void_ready 0$/m);

const unrelated = invokeRetainedMiddleware(
  registeredMiddleware,
  "/__void/other-status.json",
  "json",
  pessimisticJson(),
);
assert.equal(unrelated.wrappedJson, false);
assert.equal(unrelated.wrappedSend, false);
assert.equal(unrelated.forwarded.ready, false);

assert.doesNotThrow(() => success.intervalCallback());
assert.equal(successUseCalls, 1, "completed retry duplicated middleware");

console.log("void_ready_bridge_registration_retry_v1=PASS");
console.log("missing_app_retry_preserved=true");
console.log("install_then_throw_state=indeterminate");
console.log("indeterminate_retry_refused=true");
console.log("partial_registration_json_passthrough=true");
console.log("partial_registration_prom_passthrough=true");
console.log("mounted_json_and_prom_bridge_proven=true");
console.log("unrelated_route_unmodified=true");
console.log("successful_registration_marked_mounted=true");
console.log("completed_retry_idempotent=true");
console.log("runtime_or_network_action=false");
