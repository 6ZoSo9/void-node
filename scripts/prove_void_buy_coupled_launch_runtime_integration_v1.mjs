#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
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
const canonical = value => JSON.stringify(value, (_key, item) =>
  item && typeof item === "object" && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]]))
    : item,
);
const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const gitBlobSha1 = bytes => crypto.createHash("sha1")
  .update(Buffer.from(`blob ${bytes.length}\\0`, "utf8"))
  .update(bytes)
  .digest("hex");

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
{
  const manifest = JSON.parse(read(
    "docs/architecture/buy-void-enforcement-artifact-attestation-v1.json",
  ));
  const dockerBytes = fs.readFileSync(path.join(ROOT, "Dockerfile"));
  const next = structuredClone(manifest);
  const dockerInput = next.inputs.find(entry => entry.path === "Dockerfile");
  assert.ok(dockerInput);
  dockerInput.bytes = dockerBytes.length;
  dockerInput.sha256 = sha256(dockerBytes);
  dockerInput.git_blob_sha1 = gitBlobSha1(dockerBytes);
  const body = structuredClone(next);
  delete body.enforcement_artifact_set_sha256;
  const nextSetSha256 = sha256(Buffer.from(canonical(body), "utf8"));
  console.log(`attestation_docker_bytes=${dockerInput.bytes}`);
  console.log(`attestation_docker_sha256=${dockerInput.sha256}`);
  console.log(`attestation_docker_git_blob_sha1=${dockerInput.git_blob_sha1}`);
  console.log(`attestation_next_set_sha256=${nextSetSha256}`);
}
console.log("funds_movement=false");
console.log("runtime_activation_performed=false");
