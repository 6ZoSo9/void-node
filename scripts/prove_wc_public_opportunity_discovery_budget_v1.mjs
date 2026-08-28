#!/usr/bin/env node

import assert from "node:assert/strict";
import { createServer } from "node:http";
import { performance } from "node:perf_hooks";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { fetchDiscoveryJsonV1 } from "../tools/wc-public-opportunity-discovery-v1.mjs";

const MARKER = "VOID_WC_PUBLIC_OPPORTUNITY_DISCOVERY_BUDGET_V1_PROOF_GREEN";
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const TOOL = resolve(ROOT, "tools/wc-public-opportunity-discovery-v1.mjs");
const WELL_KNOWN = "/.well-known/void-public-node.json";
const MAX_CANDIDATE_PATHS = 24;
const RESPONSE_LIMIT = 64 * 1024;

function runTool(base, timeoutMs) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [
      TOOL,
      "--base", base,
      "--timeout-ms", String(timeoutMs),
      "--require-available",
    ], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", rejectRun);
    child.on("close", (code) => resolveRun({ code, stdout, stderr }));
  });
}

async function listen(handler) {
  const server = createServer(handler);
  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return {
    server,
    base: `http://127.0.0.1:${address.port}`,
  };
}

async function closeServer(server) {
  server.closeAllConnections?.();
  await new Promise((resolveClose, rejectClose) => {
    server.close((error) => error ? rejectClose(error) : resolveClose());
  });
}

function availableGateway(candidatePaths = []) {
  return {
    marker: "VOID_PUBLIC_EARN_GATEWAY_V1",
    routes: {
      claim_ticket: "/wc/public-earning-pilot-v1/claim-ticket",
    },
    methods: {
      claim_ticket: ["POST"],
    },
    pilot_status: {
      marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
      coordinator_enabled: true,
      executor_enabled: false,
      fixed_award_wc: 3,
    },
    public_claim: {
      marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
      enabled: true,
      available: true,
      method: "POST",
      public_route: "/wc/public-earning-pilot-v1/claim-ticket",
      fixed_award_wc: 3,
      server_selected_work: true,
      proof_of_executor_key_possession_required: true,
      signed_claim_timestamp_required: true,
      claim_nonce_replay_protection: true,
      participant_selected_award: false,
    },
    safety: {
      public_ticket_issue: true,
      public_signed_ticket_claim: true,
      claim_executor_key_possession_required: true,
      claim_server_selected_work: true,
      participant_selected_award: false,
      submission_response_canonical_accounting: true,
    },
    candidate_paths: candidatePaths,
  };
}

// An untrusted bounded well-known document must not amplify one invocation into
// an unbounded number of same-origin candidate probes.
{
  const requests = [];
  const advertised = Array.from(
    { length: MAX_CANDIDATE_PATHS + 8 },
    (_, index) => `/public/earn/status-budget-${index}`,
  );
  const { server, base } = await listen((request, response) => {
    requests.push(request.url);
    if (request.url === WELL_KNOWN) {
      response.writeHead(200, { "content-type": "application/json" });
      // The primary document is itself a complete AVAILABLE contract. The
      // candidate ceiling must still win before that success can be emitted.
      response.end(JSON.stringify(availableGateway(advertised)));
      return;
    }
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "not_found" }));
  });

  try {
    const result = await runTool(base, 1000);
    assert.equal(result.code, 2, result.stderr || result.stdout);
    const body = JSON.parse(result.stdout);
    assert.equal(body.reason, "candidate path limit exceeded");
    assert.equal(body.opportunity_state, "unavailable");
    assert.equal(body.maximum_candidate_paths, MAX_CANDIDATE_PATHS);
    assert.ok(body.candidate_count > MAX_CANDIDATE_PATHS);
    assert.deepEqual(requests, [WELL_KNOWN]);
  } finally {
    await closeServer(server);
  }
}

// A bounded primary document may still become AVAILABLE after the complete
// configured/advertised/fallback candidate set has passed the ceiling.
{
  const requests = [];
  const { server, base } = await listen((request, response) => {
    requests.push(request.url);
    if (request.url === WELL_KNOWN) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(availableGateway([
        "/public/earn/status-bounded-unused",
      ])));
      return;
    }
    response.writeHead(500, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "primary_available_must_return" }));
  });

  try {
    const result = await runTool(base, 1000);
    assert.equal(result.code, 0, result.stderr || result.stdout);
    const body = JSON.parse(result.stdout);
    assert.equal(body.opportunity_state, "available");
    assert.deepEqual(requests, [WELL_KNOWN]);
  } finally {
    await closeServer(server);
  }
}

// One logical timeout must cover the well-known request and every candidate
// attempt. A second slow candidate receives only the remaining budget rather
// than a fresh full timeout.
{
  const requests = [];
  const slowPaths = [
    "/public/earn/status-slow-a",
    "/public/earn/status-slow-b",
  ];
  const { server, base } = await listen((request, response) => {
    requests.push(request.url);
    if (request.url === WELL_KNOWN) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        marker: "VOID_PUBLIC_NODE_DISCOVERY_DEADLINE_FIXTURE_V1",
        candidate_paths: slowPaths,
      }));
      return;
    }
    if (slowPaths.includes(request.url)) {
      setTimeout(() => {
        if (response.destroyed || response.writableEnded) return;
        response.writeHead(404, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "slow_not_found" }));
      }, 250);
      return;
    }
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "not_found" }));
  });

  const started = performance.now();
  try {
    const result = await runTool(base, 300);
    const elapsedMs = performance.now() - started;
    assert.equal(result.code, 2, result.stderr || result.stdout);
    const body = JSON.parse(result.stdout);
    assert.equal(body.logical_timeout_ms, 300);
    assert.equal(body.maximum_candidate_paths, MAX_CANDIDATE_PATHS);
    assert.ok(
      body.attempts.some((attempt) => attempt.error === "discovery_deadline_exceeded"),
      JSON.stringify(body.attempts),
    );
    assert.ok(elapsedMs < 450, `logical deadline exceeded: ${elapsedMs.toFixed(1)}ms`);
    assert.equal(requests[0], WELL_KNOWN);
    assert.ok(requests.includes(slowPaths[0]));
    assert.ok(requests.length <= 3, JSON.stringify(requests));
  } finally {
    await closeServer(server);
  }
}

// A deadline-triggered body rejection must not receive a fresh 250 ms caller
// wait for cancellation. The cancellation is initiated and its late settlement
// is consumed, but the one monotonic discovery budget remains the visible bound.
{
  const timeoutMs = 100;
  let readCalls = 0;
  let cancelCalls = 0;
  let abortObserved = false;
  const neverSettlingCancellation = new Promise(() => {});
  const fetchImpl = async (_url, options) => ({
    status: 200,
    ok: true,
    headers: {
      get(name) {
        if (String(name).toLowerCase() === "content-type") return "application/json";
        return null;
      },
    },
    body: {
      getReader() {
        return {
          read() {
            readCalls += 1;
            return new Promise((resolveRead, rejectRead) => {
              if (options.signal.aborted) {
                abortObserved = true;
                rejectRead(new Error("deadline_abort"));
                return;
              }
              options.signal.addEventListener("abort", () => {
                abortObserved = true;
                rejectRead(new Error("deadline_abort"));
              }, { once: true });
            });
          },
          cancel() {
            cancelCalls += 1;
            return neverSettlingCancellation;
          },
          releaseLock() {},
        };
      },
    },
  });

  const started = performance.now();
  const result = await fetchDiscoveryJsonV1(
    "http://127.0.0.1",
    WELL_KNOWN,
    performance.now() + timeoutMs,
    { allowTestFetchOverride: true, fetchImpl },
  );
  const elapsedMs = performance.now() - started;

  assert.equal(result.error, "discovery_deadline_exceeded");
  assert.equal(readCalls, 1);
  assert.equal(cancelCalls, 1);
  assert.equal(abortObserved, true);
  assert.ok(
    elapsedMs < timeoutMs + 160,
    `rejection teardown extended logical deadline: ${elapsedMs.toFixed(1)}ms`,
  );
}

// Response rejection is not deadline expiry. Rejection teardown may abort the
// owned controller, but the participant-visible error must remain the primary
// bounded-response reason while the logical deadline is still open.
for (const mode of ["declared", "streamed"]) {
  const requests = [];
  const { server, base } = await listen((request, response) => {
    requests.push(request.url);
    if (request.url === WELL_KNOWN) {
      response.writeHead(200, {
        "content-type": "application/json",
        ...(mode === "declared" ? { "content-length": String(RESPONSE_LIMIT + 1) } : {}),
      });
      response.end(Buffer.alloc(RESPONSE_LIMIT + 1, 0x20));
      return;
    }
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "not_found" }));
  });

  try {
    const result = await runTool(base, 1500);
    assert.equal(result.code, 2, `${mode}: ${result.stderr || result.stdout}`);
    const body = JSON.parse(result.stdout);
    assert.equal(body.attempts[0].path, WELL_KNOWN, mode);
    assert.equal(body.attempts[0].error, "response_body_too_large", mode);
    assert.notEqual(body.attempts[0].error, "discovery_deadline_exceeded", mode);
    assert.ok(requests.every((path) => typeof path === "string"), mode);
  } finally {
    await closeServer(server);
  }
}

// Parsed JSON structure has its own work authority independent of byte size.
// Over-budget structure must HOLD before any candidate advertised inside it can
// cause another request.
for (const fixture of [
  {
    name: "deep",
    body: (() => {
      let value = "/public/earn/status-never-probe";
      for (let depth = 0; depth < 96; depth += 1) value = [value];
      return { marker: "VOID_PUBLIC_NODE_DISCOVERY_STRUCTURE_FIXTURE_V1", nested: value };
    })(),
  },
  {
    name: "wide",
    body: {
      marker: "VOID_PUBLIC_NODE_DISCOVERY_STRUCTURE_FIXTURE_V1",
      nodes: Array.from({ length: 5000 }, () => null),
      candidate_path: "/public/earn/status-never-probe",
    },
  },
]) {
  const requests = [];
  const encoded = JSON.stringify(fixture.body);
  assert.ok(Buffer.byteLength(encoded) < RESPONSE_LIMIT, fixture.name);
  const { server, base } = await listen((request, response) => {
    requests.push(request.url);
    if (request.url === WELL_KNOWN) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(encoded);
      return;
    }
    response.writeHead(500, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "candidate_probe_must_not_run" }));
  });

  try {
    const result = await runTool(base, 1000);
    assert.equal(result.code, 2, `${fixture.name}: ${result.stderr || result.stdout}`);
    const body = JSON.parse(result.stdout);
    assert.equal(body.reason, "discovery_structure_budget_exceeded", fixture.name);
    assert.deepEqual(requests, [WELL_KNOWN], fixture.name);
  } finally {
    await closeServer(server);
  }
}

console.log(MARKER);
console.log(`maximum_candidate_paths=${MAX_CANDIDATE_PATHS}`);
console.log("shared_logical_deadline=true");
console.log("early_available_cap_bypass_closed=true");
console.log("deadline_teardown_does_not_extend_budget=true");
console.log("primary_rejection_truth_preserved=true");
console.log("structure_budget_bounded=true");
console.log("mutation=false");
console.log("wc_award=false");
