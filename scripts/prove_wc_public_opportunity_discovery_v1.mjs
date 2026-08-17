#!/usr/bin/env node

import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const MARKER = "VOID_WC_PUBLIC_OPPORTUNITY_DISCOVERY_V1_PROOF_GREEN";
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const TOOL = resolve(ROOT, "tools/wc-public-opportunity-discovery-v1.mjs");
const CLAIM_ROUTE = "/wc/public-earning-pilot-v1/claim-ticket";

function run(args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [TOOL, ...args], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", rejectRun);
    child.on("close", (code) => {
      resolveRun({ code, stdout, stderr });
    });
  });
}

function claimSafety() {
  return {
    public_ticket_issue: true,
    public_signed_ticket_claim: true,
    claim_server_selected_work: true,
    participant_selected_award: false,
    submission_response_canonical_accounting: true,
  };
}

async function fixture(mode, fixedAwardWc = 3, options = {}) {
  const requests = [];
  const {
    responseStatus = 200,
    omitAward = false,
    omitCoordinator = false,
    omitBoundary = false,
    injectMetadata = false,
  } = options;

  const server = createServer((request, response) => {
    requests.push({
      method: request.method,
      url: request.url,
    });

    if (request.url === "/.well-known/void-public-node.json") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        marker: "VOID_PUBLIC_NODE_DISCOVERY_FIXTURE_V1",
      }));
      return;
    }

    if (request.url === "/__void/public-earn-gateway-v1/status.json") {
      const safety = claimSafety();
      if (mode === "unknown" || omitBoundary) {
        delete safety.submission_response_canonical_accounting;
      }
      response.writeHead(responseStatus, { "content-type": "application/json" });
      response.end(JSON.stringify({
        marker: "VOID_PUBLIC_EARN_GATEWAY_V1",
        pilot_status: {
          marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
          coordinator_enabled: omitCoordinator ? undefined : mode !== "hold",
          executor_enabled: false,
          fixed_award_wc: omitAward ? undefined : fixedAwardWc,
        },
        public_claim: {
          enabled: mode !== "hold",
          method: "POST",
          public_route: CLAIM_ROUTE,
          fixed_award_wc: omitAward ? undefined : fixedAwardWc,
          server_selected_work: true,
          participant_selected_award: false,
        },
        safety,
        ...(injectMetadata
          ? {
              metadata: {
                coordinator_enabled: true,
                fixed_award_wc: 3,
                submission_response_canonical_accounting: true,
                participant_selected_award: false,
              },
            }
          : {}),
      }));
      return;
    }

    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "not_found" }));
  });

  await new Promise((resolveListen) => {
    server.listen(0, "127.0.0.1", resolveListen);
  });

  const address = server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;

  return {
    base,
    requests,
    close: () => new Promise((resolveClose, rejectClose) => {
      server.close((error) => {
        if (error) rejectClose(error);
        else resolveClose();
      });
    }),
  };
}

const available = await fixture("available");
try {
  const result = await run([
    "--base", available.base,
    "--require-available",
  ]);

  assert.equal(result.code, 0, result.stderr || result.stdout);
  const body = JSON.parse(result.stdout);
  assert.equal(body.marker, "VOID_WC_PUBLIC_OPPORTUNITY_DISCOVERY_V1");
  assert.equal(body.status, "green");
  assert.equal(body.opportunity_state, "available");
  assert.equal(body.participant.node_required, false);
  assert.equal(body.pilot.marker, "VOID_WC_PUBLIC_EARNING_PILOT_V1");
  assert.equal(body.pilot.coordinator_enabled, true);
  assert.equal(body.pilot.fixed_award_wc, 3);
  assert.equal(body.pilot.fixed_award_matches, true);
  assert.equal(body.public_claim.configured, true);
  assert.equal(body.public_claim.enabled, true);
  assert.equal(body.public_claim.method, "POST");
  assert.equal(body.public_claim.path, CLAIM_ROUTE);
  assert.equal(body.safety.read_only, true);
  assert.deepEqual(body.safety.http_methods_used, ["GET"]);
  assert.equal(body.safety.public_claim_route_no_direct_award, true);
  assert.equal(body.safety.public_award_boundary_confirmed, true);
  assert.equal(body.safety.public_award_boundary_safe, true);
  assert.equal(body.safety.mutation_attempted, false);
  assert.equal(body.safety.ticket_issuance_attempted, false);
  assert.equal(body.safety.wc_award_attempted, false);

  assert.ok(available.requests.length >= 2);
  assert.ok(available.requests.every((entry) => entry.method === "GET"));
  assert.ok(available.requests.some(
    (entry) => entry.url === "/__void/public-earn-gateway-v1/status.json",
  ));
  assert.ok(!available.requests.some((entry) => entry.url === CLAIM_ROUTE));
  assert.ok(!available.requests.some((entry) => entry.url === "/private/wc/award"));
} finally {
  await available.close();
}

for (const [label, wrongTypeAward] of [
  ["string", "3"],
  ["boolean", true],
  ["null", null],
]) {
  const wrongType = await fixture("available", wrongTypeAward);
  try {
    const result = await run([
      "--base", wrongType.base,
      "--require-available",
      "--expected-award-wc", "3",
    ]);

    assert.equal(result.code, 2, `${label}: ${result.stderr || result.stdout}`);
    const body = JSON.parse(result.stdout);
    assert.equal(body.opportunity_state, "hold", label);
    assert.equal(body.pilot.fixed_award_wc, null, label);
    assert.equal(body.pilot.fixed_award_matches, false, label);
    assert.match(body.reason, /fixed_award_mismatch_or_missing/u, label);
    assert.equal(body.safety.mutation_attempted, false, label);
    assert.equal(body.safety.ticket_issuance_attempted, false, label);
    assert.equal(body.safety.wc_award_attempted, false, label);
  } finally {
    await wrongType.close();
  }
}

for (const [label, options] of [
  ["award_splice", { omitAward: true, injectMetadata: true }],
  ["coordinator_splice", { omitCoordinator: true, injectMetadata: true }],
  ["award_boundary_splice", { omitBoundary: true, injectMetadata: true }],
]) {
  const spliced = await fixture("available", 3, options);
  try {
    const result = await run([
      "--base", spliced.base,
      "--require-available",
    ]);
    assert.equal(result.code, 2, `${label}: ${result.stderr || result.stdout}`);
    const body = JSON.parse(result.stdout);
    assert.equal(body.opportunity_state, "hold", label);
    assert.equal(body.safety.mutation_attempted, false, label);
    assert.equal(body.safety.ticket_issuance_attempted, false, label);
    assert.equal(body.safety.wc_award_attempted, false, label);
    if (label === "award_splice") {
      assert.equal(body.pilot.fixed_award_wc, null, label);
      assert.equal(body.pilot.fixed_award_matches, false, label);
    }
    if (label === "coordinator_splice") {
      assert.equal(body.pilot.coordinator_enabled, null, label);
    }
    if (label === "award_boundary_splice") {
      assert.equal(body.safety.public_claim_route_no_direct_award, false, label);
      assert.equal(body.safety.public_award_boundary_confirmed, false, label);
    }
  } finally {
    await spliced.close();
  }
}

for (const status of [404, 500]) {
  const nonSuccess = await fixture("available", 3, { responseStatus: status });
  try {
    const result = await run([
      "--base", nonSuccess.base,
      "--require-available",
    ]);
    assert.equal(result.code, 2, `${status}: ${result.stderr || result.stdout}`);
    const body = JSON.parse(result.stdout);
    assert.equal(body.opportunity_state, "unavailable", String(status));
    assert.match(body.reason, /compatible public earning gateway not discovered/u);
    assert.equal(body.safety.mutation_attempted, false);
    assert.equal(body.safety.ticket_issuance_attempted, false);
    assert.equal(body.safety.wc_award_attempted, false);
    assert.ok(body.attempts.some(
      (entry) => entry.path === "/__void/public-earn-gateway-v1/status.json" && entry.http_status === status,
    ));
  } finally {
    await nonSuccess.close();
  }
}

const hold = await fixture("hold");
try {
  const normal = await run(["--base", hold.base]);
  assert.equal(normal.code, 0, normal.stderr || normal.stdout);
  const normalBody = JSON.parse(normal.stdout);
  assert.equal(normalBody.opportunity_state, "hold");
  assert.equal(normalBody.pilot.coordinator_enabled, false);
  assert.equal(normalBody.public_claim.enabled, false);
  assert.equal(normalBody.safety.mutation_attempted, false);

  const required = await run([
    "--base", hold.base,
    "--require-available",
  ]);
  assert.equal(required.code, 2);
  const requiredBody = JSON.parse(required.stdout);
  assert.equal(requiredBody.opportunity_state, "hold");

  assert.ok(hold.requests.every((entry) => entry.method === "GET"));
  assert.ok(!hold.requests.some((entry) => entry.url === CLAIM_ROUTE));
} finally {
  await hold.close();
}

const unknown = await fixture("unknown");
try {
  const normal = await run(["--base", unknown.base]);
  assert.equal(normal.code, 0, normal.stderr || normal.stdout);
  const normalBody = JSON.parse(normal.stdout);
  assert.equal(normalBody.opportunity_state, "hold");
  assert.match(normalBody.reason, /public_claim_award_boundary_unconfirmed/u);
  assert.equal(normalBody.pilot.coordinator_enabled, true);
  assert.equal(normalBody.public_claim.enabled, true);
  assert.equal(normalBody.safety.public_claim_route_no_direct_award, false);
  assert.equal(normalBody.safety.public_award_boundary_confirmed, false);
  assert.equal(normalBody.safety.public_award_boundary_safe, false);
  assert.equal(normalBody.safety.mutation_attempted, false);

  const required = await run([
    "--base", unknown.base,
    "--require-available",
  ]);
  assert.equal(required.code, 2);
  const requiredBody = JSON.parse(required.stdout);
  assert.equal(requiredBody.opportunity_state, "hold");

  assert.ok(unknown.requests.every((entry) => entry.method === "GET"));
  assert.ok(!unknown.requests.some(
    (entry) => entry.url === CLAIM_ROUTE,
  ));
} finally {
  await unknown.close();
}

const invalid = await run([
  "--base", "ftp://example.invalid",
]);
assert.equal(invalid.code, 2);
const invalidBody = JSON.parse(invalid.stdout);
assert.equal(invalidBody.opportunity_state, "unavailable");
assert.equal(invalidBody.safety.mutation_attempted, false);

console.log(MARKER);
