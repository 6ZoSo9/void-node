#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { IntervalWorker } = require("../src/util/interval_worker.js");

const ordinary = new IntervalWorker(() => {}, 60_000);
assert.equal(ordinary.start(), true, "first start must install the interval");
assert.equal(ordinary.start(), false, "second start must remain idempotent");
assert.equal(ordinary.isRunning(), true, "installed interval must be observable");
assert.equal(ordinary.stop(), true, "first stop must clear the interval");
assert.equal(ordinary.stop(), false, "second stop must remain idempotent");

let callbackRuns = 0;
let callbackStopResult = null;
let reentrant;
reentrant = new IntervalWorker(() => {
  callbackRuns += 1;
  callbackStopResult = reentrant.stop();
}, 60_000);

assert.equal(reentrant.start(), true, "start must enter the immediate callback once");
assert.equal(callbackRuns, 1, "immediate callback must run exactly once");
assert.equal(
  callbackStopResult,
  true,
  "an immediate callback must be able to stop its already-installed interval",
);
assert.equal(
  reentrant.isRunning(),
  false,
  "reentrant stop must not leave a repeating interval behind",
);
assert.equal(reentrant.stop(), false, "stopped worker must remain stopped");

console.log("VOID_INTERVAL_WORKER_REENTRANT_STOP_V1_GREEN");
console.log("start_idempotent=true");
console.log("stop_idempotent=true");
console.log("immediate_callback_stop=true");
console.log("orphan_interval_after_reentrant_stop=false");
