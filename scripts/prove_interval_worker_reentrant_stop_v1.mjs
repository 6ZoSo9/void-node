#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tsSource = fs.readFileSync(
  path.join(ROOT, "src/util/interval_worker.ts"), "utf8",
);
const jsSource = fs.readFileSync(
  path.join(ROOT, "src/util/interval_worker.js"), "utf8",
);

for (const [name, source] of [["ts", tsSource], ["js", jsSource]]) {
  const install = source.indexOf("this.t = setInterval");
  const immediate = source.indexOf(name === "ts" ? "void tick();" : "void tick();");
  assert.ok(install >= 0, name + " source must install the interval");
  assert.ok(immediate >= 0, name + " source must retain the immediate tick");
  assert.ok(
    install < immediate,
    name + " source must install the interval before the immediate tick",
  );
}

const require = createRequire(import.meta.url);
const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-interval-worker-reentrant-stop-"),
);
const executable = path.join(temp, "interval_worker.cjs");
fs.writeFileSync(executable, jsSource, { encoding: "utf8", mode: 0o600 });
const { IntervalWorker } = require(executable);

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

fs.rmSync(temp, { recursive: true, force: true });

console.log("VOID_INTERVAL_WORKER_REENTRANT_STOP_V1_GREEN");
console.log("ts_and_js_install_before_immediate_tick=true");
console.log("checked_in_js_executed_as_commonjs=true");
console.log("start_idempotent=true");
console.log("stop_idempotent=true");
console.log("immediate_callback_stop=true");
console.log("orphan_interval_after_reentrant_stop=false");
