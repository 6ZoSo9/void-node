#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = resolve(ROOT, "tools/wc-public-opportunity-directory-v1.mjs");
const fixtureDir = mkdtempSync(join(tmpdir(), "void-wc-directory-types-"));
const fixtureTool = join(fixtureDir, "fixture-discovery.mjs");

function run(args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [TOOL, ...args], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const guard = setTimeout(() => {
      child.kill("SIGKILL");
      rejectRun(new Error(`directory proof process exceeded 8000ms: ${args.join(" ")}`));
    }, 8000);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", (error) => {
      clearTimeout(guard);
      rejectRun(error);
    });
    child.once("close", (code) => {
      clearTimeout(guard);
      resolveRun({ code, stdout, stderr });
    });
  });
}

writeFileSync(fixtureTool, `#!/usr/bin/env node
import { parseArgs } from "node:util";
const { values } = parseArgs({ options: { base: { type: "string" }, "timeout-ms": { type: "string" }, "expected-award-wc": { type: "string" } }, strict: true });
const host = new URL(values.base).hostname;
if (host === "hang.example") {
  setInterval(() => {}, 1000);
} else if (host === "stdout-flood.example") {
  process.stdout.write("x".repeat(300 * 1024));
  setInterval(() => {}, 1000);
} else if (host === "stderr-flood.example") {
  process.stderr.write("e".repeat(96 * 1024));
  setInterval(() => {}, 1000);
} else {
  const award = host === "string.example" ? "3" : host === "boolean.example" ? true : host === "null.example" ? null : 3;
  const body = {
    marker: "VOID_WC_PUBLIC_OPPORTUNITY_DISCOVERY_V1",
    status: "green",
    opportunity_state: "available",
    reason: "bounded_public_earning_opportunity_available",
    source_path: "/wc/public-earning-pilot-v1/status",
    gateway: { marker: "VOID_PUBLIC_EARN_GATEWAY_V1", exact_identity: true },
    pilot: { marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1", coordinator_enabled: true, executor_enabled: false, fixed_award_wc: award, fixed_award_matches: true },
    public_claim: {
      marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
      configured: true,
      enabled: true,
      available: true,
      method: "POST",
      path: "/wc/public-earning-pilot-v1/claim-ticket",
      proof_of_executor_key_possession_required: true,
      signed_claim_timestamp_required: true,
      claim_nonce_replay_protection: true
    },
    safety: {
      read_only: true,
      http_methods_used: ["GET"],
      public_routes_award_wc: false,
      public_award_boundary_confirmed: true,
      public_award_boundary_safe: true,
      claim_executor_key_possession_required: true,
      public_claim_authentication_replay_confirmed: true,
      mutation_attempted: false,
      ticket_issuance_attempted: false,
      receipt_submission_attempted: false,
      wc_award_attempted: false,
      wallet_access_attempted: false,
      settlement_attempted: false
    }
  };
  if (host === "executor-true.example") body.pilot.executor_enabled = true;
  if (host === "executor-missing.example") delete body.pilot.executor_enabled;
  if (host === "gateway-marker.example") body.gateway.marker = "VOID_PUBLIC_EARN_GATEWAY_V1_ALT";
  if (host === "gateway-identity.example") body.gateway.exact_identity = false;
  if (host === "claim-marker.example") body.public_claim.marker = "VOID_WC_PUBLIC_TICKET_CLAIM_V1_ALT";
  if (host === "claim-method.example") body.public_claim.method = "GET";
  if (host === "claim-route.example") body.public_claim.path = "/wc/public-earning-pilot-v1/claim-ticket-alt";
  if (host === "available-missing.example") delete body.public_claim.available;
  if (host === "available-null.example") body.public_claim.available = null;
  if (host === "available-string.example") body.public_claim.available = "true";
  if (host === "available-false.example") body.public_claim.available = false;
  if (host === "gateway-key.example") body.safety.claim_executor_key_possession_required = false;
  if (host === "claim-key.example") body.public_claim.proof_of_executor_key_possession_required = false;
  if (host === "claim-timestamp.example") body.public_claim.signed_claim_timestamp_required = false;
  if (host === "claim-nonce.example") body.public_claim.claim_nonce_replay_protection = false;
  if (host === "claim-auth-summary.example") body.safety.public_claim_authentication_replay_confirmed = false;
  process.stdout.write(JSON.stringify(body));
}
`, { mode: 0o755 });

try {
  const good = await run(["--base", "https://number.example", "--discovery-tool", fixtureTool, "--require-available"]);
  assert.equal(good.code, 0, good.stderr || good.stdout);
  const goodBody = JSON.parse(good.stdout);
  assert.equal(goodBody.directory_state, "available");
  assert.equal(goodBody.results[0].trusted, true);
  assert.equal(goodBody.results[0].gateway.exact_identity, true);
  assert.equal(goodBody.results[0].pilot.executor_enabled, false);
  assert.equal(goodBody.results[0].pilot.fixed_award_wc, 3);
  assert.equal(goodBody.results[0].pilot.fixed_award_matches, true);
  assert.equal(goodBody.results[0].public_claim.marker, "VOID_WC_PUBLIC_TICKET_CLAIM_V1");
  assert.equal(goodBody.results[0].public_claim.enabled, true);
  assert.equal(goodBody.results[0].public_claim.available, true);
  assert.equal(goodBody.results[0].public_claim.method, "POST");
  assert.equal(goodBody.results[0].public_claim.path, "/wc/public-earning-pilot-v1/claim-ticket");
  assert.equal(goodBody.results[0].safety.public_claim_authentication_replay_confirmed, true);

  for (const host of ["string.example", "boolean.example", "null.example"]) {
    const result = await run(["--base", `https://${host}`, "--discovery-tool", fixtureTool, "--require-available"]);
    assert.equal(result.code, 2, `${host}: ${result.stderr || result.stdout}`);
    const body = JSON.parse(result.stdout);
    assert.equal(body.directory_state, "unavailable", host);
    assert.equal(body.summary.invalid_result, 1, host);
    assert.equal(body.results[0].trusted, false, host);
    assert.equal(body.results[0].pilot.fixed_award_wc, null, host);
    assert.equal(body.results[0].pilot.fixed_award_matches, false, host);
    assert.equal(body.results[0].reason, "available_result_contract_failed", host);
  }

  for (const host of [
    "executor-true.example",
    "executor-missing.example",
    "gateway-marker.example",
    "gateway-identity.example",
    "claim-marker.example",
    "claim-method.example",
    "claim-route.example",
    "available-missing.example",
    "available-null.example",
    "available-string.example",
    "available-false.example",
    "gateway-key.example",
    "claim-key.example",
    "claim-timestamp.example",
    "claim-nonce.example",
    "claim-auth-summary.example",
  ]) {
    const result = await run(["--base", `https://${host}`, "--discovery-tool", fixtureTool, "--require-available"]);
    assert.equal(result.code, 2, `${host}: ${result.stderr || result.stdout}`);
    const body = JSON.parse(result.stdout);
    assert.equal(body.directory_state, "unavailable", host);
    assert.equal(body.summary.invalid_result, 1, host);
    assert.equal(body.results[0].trusted, false, host);
    assert.equal(body.results[0].reason, "available_result_contract_failed", host);
    assert.equal(body.safety.mutation_attempted, false, host);
    assert.equal(body.safety.ticket_issuance_attempted, false, host);
    assert.equal(body.safety.wc_award_attempted, false, host);
  }

  const mixedStarted = Date.now();
  const mixed = await run([
    "--base", "https://hang.example",
    "--base", "https://number.example",
    "--discovery-tool", fixtureTool,
    "--timeout-ms", "250",
    "--concurrency", "2",
    "--require-available",
  ]);
  const mixedElapsed = Date.now() - mixedStarted;
  assert.equal(mixed.code, 0, mixed.stderr || mixed.stdout);
  assert.ok(mixedElapsed < 6000, `hung child exceeded bounded parent lifetime: ${mixedElapsed}ms`);
  const mixedBody = JSON.parse(mixed.stdout);
  assert.equal(mixedBody.directory_state, "available");
  assert.equal(mixedBody.summary.available, 1);
  assert.equal(mixedBody.summary.invalid_result, 1);
  const hung = mixedBody.results.find((entry) => entry.base === "https://hang.example");
  assert.equal(hung?.trusted, false);
  assert.equal(hung?.reason, "child_timeout");

  for (const [host, reason] of [
    ["stdout-flood.example", "child_stdout_oversize"],
    ["stderr-flood.example", "child_stderr_oversize"],
  ]) {
    const started = Date.now();
    const result = await run([
      "--base", `https://${host}`,
      "--discovery-tool", fixtureTool,
      "--timeout-ms", "250",
      "--require-available",
    ]);
    const elapsed = Date.now() - started;
    assert.equal(result.code, 2, `${host}: ${result.stderr || result.stdout}`);
    assert.ok(elapsed < 3000, `${host} overflow teardown exceeded bound: ${elapsed}ms`);
    const body = JSON.parse(result.stdout);
    assert.equal(body.directory_state, "unavailable", host);
    assert.equal(body.summary.invalid_result, 1, host);
    assert.equal(body.results[0].trusted, false, host);
    assert.equal(body.results[0].reason, reason, host);
  }
} finally {
  rmSync(fixtureDir, { recursive: true, force: true });
}

console.log("VOID_WC_PUBLIC_OPPORTUNITY_DIRECTORY_EVIDENCE_TYPES_V1_PROOF_GREEN");
