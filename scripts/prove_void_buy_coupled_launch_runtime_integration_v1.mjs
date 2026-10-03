#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  VOID_BUY_COUPLED_LAUNCH_ID_V1,
  readBuyLaunchGateV1,
} from "../src/economic/buy_void_coupled_launch_gate_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relative => fs.readFileSync(path.join(ROOT, relative), "utf8");
const index = read("src/index.ts");
const docker = read("Dockerfile");

assert.ok(index.includes("VOID_BUY_COUPLED_LAUNCH_RUNTIME_BINDING_V1"));
assert.ok(index.includes("../src/economic/buy_void_coupled_launch_gate_v1.mjs"));
assert.ok(index.includes("canonical_coupled_launch_runtime_gate_unavailable"));
assert.ok(index.includes(
  'const requests_activation_requested = String(process.env.VOID_BUY_REQUESTS_ENABLED || "0") === "1";',
));
assert.ok(index.includes(
  "const requests_enabled = requests_activation_requested && coupled_launch_gate.ready === true;",
));
assert.ok(index.includes(
  "const requestsEnabled = requestsActivationRequested && coupledLaunchGate.ready === true;",
));
assert.ok(index.includes('"buy_void_coupled_launch_gate_hold"'));
assert.ok(index.includes("coupled_launch_gate_ready:coupled_launch_gate.ready===true"));
assert.ok(index.includes("coupled_launch_gate_ready: coupledLaunchGate.ready === true"));

for (const required of [
  "COPY --from=build /app/src/economic/buy_void_coupled_launch_gate_v1.mjs ./src/economic/",
  "COPY --from=build /app/tools/void-economic-evm-successor-migration-v1.mjs ./tools/",
  "/app/ops/mainnet0/wc-void-production-candidate-v1.json",
  "/app/ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json",
  "/app/ops/mainnet0/economic-evm-successor-migration-candidate-v1.json",
]) {
  assert.ok(docker.includes(required), required);
}

const current = readBuyLaunchGateV1();
assert.equal(current.id, VOID_BUY_COUPLED_LAUNCH_ID_V1);
assert.equal(current.ready, false);
assert.match(
  String(current.reason || ""),
  /^canonical_coupled_launch_source_(?:not_ready|unavailable)$/,
);

console.log("VOID_BUY_COUPLED_LAUNCH_RUNTIME_INTEGRATION_V1_GREEN");
console.log("request_flag_alone_can_open_intake=false");
console.log("current_canonical_gate_ready=false");
console.log("docker_runtime_gate_dependencies_bound=true");
console.log("funds_movement=false");
console.log("runtime_activation_performed=false");
