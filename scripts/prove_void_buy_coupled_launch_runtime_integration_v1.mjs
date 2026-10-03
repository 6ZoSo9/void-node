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
assert.ok(Buffer.byteLength(index, "utf8") <= 3851076, "src/index.ts size ceiling");
const canonical = value => JSON.stringify(value, (_key, item) =>
  item && typeof item === "object" && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]]))
    : item,
);
const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const gitBlobSha1 = bytes => crypto.createHash("sha1")
  .update(Buffer.from(`blob ${bytes.length}\0`, "utf8"))
  .update(bytes)
  .digest("hex");

assert.ok(index.includes("VOID_BUY_COUPLED_LAUNCH_RUNTIME_BINDING_V1"));
assert.ok(index.includes('../src/economic/buy_void_coupled_launch_gate_v1.mjs'));
assert.ok(index.includes(VOID_BUY_COUPLED_LAUNCH_ID_V1));
assert.ok(index.includes("m.readBuyLaunchGateV1().ready===true"));
const gateSource = read("src/economic/buy_void_coupled_launch_gate_v1.mjs");
assert.ok(gateSource.includes("VOID_BUY_COUPLED_LIVE_ACTIVATION_GENERATION"));
assert.ok(gateSource.includes("LIVE_ACTIVATION_MAX_LEASE_MS"));
assert.ok(gateSource.includes("expires_at_ms"));
assert.ok(gateSource.includes("readBuyLaunchLiveActivationV1"));
assert.ok(gateSource.includes("verifyTypedData"));
assert.ok(gateSource.includes("VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1"));
assert.ok(gateSource.includes("verifyBuyLaunchLiveActivationSovereignSignatureV1"));
assert.equal(
  index.split('=== "1"&&__voidBuyLaunchReadyV1()').length - 1,
  2,
);
assert.ok(!index.includes(
  'const requests_enabled = String(process.env.VOID_BUY_REQUESTS_ENABLED || "0") === "1";',
));
assert.ok(!index.includes(
  'const requestsEnabled = String(process.env.VOID_BUY_REQUESTS_ENABLED || "0") === "1";',
));

for (const required of [
  "COPY --from=build /app/src/economic/buy_void_coupled_launch_gate_v1.mjs ./src/economic/",
  "/app/tools/void-wc-void-coupled-launch-readiness-v1.mjs",
  "/app/tools/void-wc-void-production-readiness-v1.mjs",
  "/app/tools/void-wc-void-market-vault-compiled-identity-acceptance-v1.mjs",
  "/app/tools/void-wc-void-market-vault-compiler-identity-v1.mjs",
  "/app/tools/void-wc-void-opening-settlement-adapter-review-v1.mjs",
  "/app/tools/void-coupled-economic-successor-gate-v1.mjs",
  "/app/tools/void-economic-evm-successor-migration-v1.mjs",
  "/app/tools/void-wc-void-coupled-opening-v1.mjs",
  "/app/tools/void-shared-market-post-discovery-state-v2.mjs",
  "/app/tools/void-wc-void-opening-nonproduction-exclusion-v1.mjs",
  "/app/tools/void-wc-void-opening-participant-provenance-eligibility-v1.mjs",
  "/app/tools/void-wc-void-opening-concentration-sybil-policy-contract-v1.mjs",
  "/app/tools/void-wc-void-opening-minimum-real-wc-depth-policy-contract-v1.mjs",
  "/app/tools/void-wc-void-reverse-settlement-v1.mjs",
  "/app/tools/void-wc-void-public-quote-disclosure-v1.mjs",
  "/app/tools/void-economic-intent-ttl-caps-policy-v1.mjs",
  "/app/tools/void-economic-system-sponsored-anti-grief-policy-contract-v1.mjs",
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
console.log("live_activation_generation_bound=true");
console.log("live_activation_lease_expiry_bound=true");
console.log("sovereign_launch_lease_cosignature_bound=true");
console.log("docker_runtime_gate_dependencies_bound=true");
console.log("canonical_coupled_readiness_dependency_closure_bound=true");
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
  assert.equal(manifest.inputs.find(entry => entry.path === "Dockerfile")?.bytes, dockerInput.bytes);
  assert.equal(manifest.inputs.find(entry => entry.path === "Dockerfile")?.sha256, dockerInput.sha256);
  assert.equal(manifest.inputs.find(entry => entry.path === "Dockerfile")?.git_blob_sha1, dockerInput.git_blob_sha1);
  assert.equal(manifest.enforcement_artifact_set_sha256, nextSetSha256);
  console.log(`attestation_docker_bytes=${dockerInput.bytes}`);
  console.log(`attestation_docker_sha256=${dockerInput.sha256}`);
  console.log(`attestation_docker_git_blob_sha1=${dockerInput.git_blob_sha1}`);
  console.log(`attestation_next_set_sha256=${nextSetSha256}`);
}
console.log("funds_movement=false");
console.log("runtime_activation_performed=false");
