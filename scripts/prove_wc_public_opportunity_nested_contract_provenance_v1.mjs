#!/usr/bin/env node

import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const PILOT_MARKER = "VOID_WC_PUBLIC_EARNING_PILOT_V1";
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const discoveryTool = path.join(repoRoot, "tools", "wc-public-opportunity-discovery-v1.mjs");
const testPath = "/public/earn/status-v1";

function safety() {
  return {
    public_ticket_issue: true,
    public_signed_ticket_claim: true,
    claim_server_selected_work: true,
    participant_selected_award: false,
    submission_response_canonical_accounting: true,
  };
}

function publicClaim() {
  return {
    enabled: true,
    method: "POST",
    path: "/public/earn/claim-v1",
    fixed_award_wc: 3,
    server_selected_work: true,
    participant_selected_award: false,
  };
}

function pilot() {
  return {
    marker: PILOT_MARKER,
    coordinator_enabled: true,
    coordinator_ready: true,
    executor_enabled: false,
    fixed_award_wc: 3,
  };
}

function gateway() {
  return {
    marker: "VOID_PUBLIC_EARN_GATEWAY_V1",
    pilot_status: pilot(),
    public_claim: publicClaim(),
    safety: safety(),
  };
}

function topLevelPilot() {
  return {
    ...pilot(),
    public_claim: publicClaim(),
    safety: safety(),
  };
}

function runDiscovery(origin) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      discoveryTool,
      "--base",
      origin,
      "--path",
      testPath,
      "--require-available",
    ], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (signal) return reject(new Error(`discovery terminated by ${signal}: ${stderr}`));
      let result;
      try { result = JSON.parse(stdout); }
      catch (error) { return reject(new Error(`discovery emitted invalid JSON: ${stdout}\n${stderr}\n${error}`)); }
      resolve({ code, result, stderr });
    });
  });
}

let payload = null;
let observedMethods = [];
const server = http.createServer((request, response) => {
  observedMethods.push(request.method ?? null);
  response.setHeader("content-type", "application/json; charset=utf-8");
  if (request.url === testPath) {
    response.statusCode = 200;
    response.end(JSON.stringify(payload));
    return;
  }
  response.statusCode = 404;
  response.end(JSON.stringify({ marker: "VOID_TEST_NOT_FOUND_V1" }));
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});

try {
  const address = server.address();
  assert(address && typeof address === "object");
  const origin = `http://127.0.0.1:${address.port}`;

  async function runCase(nextPayload) {
    payload = nextPayload;
    observedMethods = [];
    const outcome = await runDiscovery(origin);
    assert.deepEqual(new Set(observedMethods), new Set(["GET"]));
    assert.equal(outcome.result.safety?.mutation_attempted, false);
    return outcome;
  }

  let outcome = await runCase(gateway());
  assert.equal(outcome.code, 0);
  assert.equal(outcome.result.opportunity_state, "available");

  outcome = await runCase(topLevelPilot());
  assert.equal(outcome.code, 0);
  assert.equal(outcome.result.opportunity_state, "available");

  outcome = await runCase({
    marker: "VOID_UNRELATED_ENVELOPE_V1",
    metadata: { published: gateway() },
  });
  assert.equal(outcome.code, 2);
  assert.notEqual(outcome.result.opportunity_state, "available");

  outcome = await runCase({
    marker: "VOID_UNRELATED_ENVELOPE_V1",
    metadata: { published: topLevelPilot() },
  });
  assert.equal(outcome.code, 2);
  assert.notEqual(outcome.result.opportunity_state, "available");

  outcome = await runCase({
    marker: "VOID_UNRELATED_ENVELOPE_V1",
    pilot_status: pilot(),
    public_claim: publicClaim(),
    safety: safety(),
  });
  assert.equal(outcome.code, 2);
  assert.notEqual(outcome.result.opportunity_state, "available");

  process.stdout.write("wc-public-opportunity nested contract provenance proof passed\n");
} finally {
  await new Promise((resolve) => server.close(resolve));
}
