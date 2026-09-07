#!/usr/bin/env node

import assert from "node:assert/strict";
import { createServer } from "node:http";
import { performance } from "node:perf_hooks";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  analyzeDiscoveryBodyV1,
  fetchDiscoveryJsonV1,
} from "../tools/wc-public-opportunity-discovery-v1.mjs";

const MARKER = "VOID_WC_PUBLIC_OPPORTUNITY_DISCOVERY_BUDGET_V1_PROOF_GREEN";
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const TOOL = resolve(ROOT, "tools/wc-public-opportunity-discovery-v1.mjs");
const WORKFLOW = resolve(ROOT, ".github/workflows/wc-public-opportunity-discovery-budget-v1.yml");
const WELL_KNOWN = "/.well-known/void-public-node.json";
const CANONICAL_GATEWAY = "/__void/public-earn-gateway-v1/status.json";
const CANONICAL_PILOT = "/wc/public-earning-pilot-v1/status";
const CLAIM_ROUTE = "/wc/public-earning-pilot-v1/claim-ticket";
const MAX_CANDIDATE_PATHS = 24;
const RESPONSE_LIMIT = 64 * 1024;
const DEFAULT_CANDIDATE_COUNT = 9;

function runTool(base, timeoutMs, extraArgs = []) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [
      TOOL,
      "--base", base,
      "--timeout-ms", String(timeoutMs),
      "--require-available",
      ...extraArgs,
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
      claim_ticket: CLAIM_ROUTE,
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
      public_route: CLAIM_ROUTE,
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

// Complete candidate authority is established before primary availability.
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

// A bounded self-contained primary contract remains usable.
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

// Unrelated string scalars are not route authority. Even many safe-looking
// ambient strings cannot consume candidate slots or trigger probes.
{
  const ambient = Array.from(
    { length: MAX_CANDIDATE_PATHS + 12 },
    (_, index) => `/public/earn/status-ambient-${index}`,
  );
  const requests = [];
  const { server, base } = await listen((request, response) => {
    requests.push(request.url);
    if (request.url === WELL_KNOWN) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        marker: "VOID_PUBLIC_NODE_DISCOVERY_AMBIENT_FIXTURE_V1",
        metadata: {
          descriptions: ambient,
          note: "/public/earn/status-ambient-note",
        },
      }));
      return;
    }
    if (request.url === CANONICAL_GATEWAY) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(availableGateway()));
      return;
    }
    if (ambient.includes(request.url)) {
      response.writeHead(500, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "ambient_string_must_not_be_probed" }));
      return;
    }
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "not_found" }));
  });

  try {
    const result = await runTool(base, 1000);
    assert.equal(result.code, 0, result.stderr || result.stdout);
    const body = JSON.parse(result.stdout);
    assert.equal(body.opportunity_state, "available");
    assert.deepEqual(requests, [WELL_KNOWN, CANONICAL_GATEWAY]);
    assert.ok(!requests.some((path) => ambient.includes(path)));
  } finally {
    await closeServer(server);
  }
}

// Canonical fallback receives a bounded opportunity before an advertised hint
// can consume the total deadline.
{
  const slowAdvertised = "/public/earn/status-advertised-stall";
  const requests = [];
  const { server, base } = await listen((request, response) => {
    requests.push(request.url);
    if (request.url === WELL_KNOWN) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        marker: "VOID_PUBLIC_NODE_DISCOVERY_PRIORITY_FIXTURE_V1",
        candidate_paths: [slowAdvertised],
      }));
      return;
    }
    if (request.url === CANONICAL_GATEWAY) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(availableGateway()));
      return;
    }
    if (request.url === slowAdvertised) {
      setTimeout(() => {
        if (response.destroyed || response.writableEnded) return;
        response.writeHead(404, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "late" }));
      }, 2000);
      return;
    }
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "not_found" }));
  });

  const started = performance.now();
  try {
    const result = await runTool(base, 500);
    const elapsedMs = performance.now() - started;
    assert.equal(result.code, 0, result.stderr || result.stdout);
    assert.equal(JSON.parse(result.stdout).opportunity_state, "available");
    assert.deepEqual(requests, [WELL_KNOWN, CANONICAL_GATEWAY]);
    assert.ok(elapsedMs < 400, `canonical fallback starved: ${elapsedMs.toFixed(1)}ms`);
  } finally {
    await closeServer(server);
  }
}

// A and B from different response generations cannot splice one AVAILABLE
// capability. A supplies gateway authority; B supplies pilot/claim availability
// but intentionally omits the gateway facts it would need to be self-contained.
{
  const requests = [];
  const { server, base } = await listen((request, response) => {
    requests.push(request.url);
    if (request.url === WELL_KNOWN) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ marker: "VOID_PUBLIC_NODE_DISCOVERY_SPLICE_FIXTURE_V1" }));
      return;
    }
    if (request.url === CANONICAL_GATEWAY) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        marker: "VOID_PUBLIC_EARN_GATEWAY_V1",
        routes: { claim_ticket: CLAIM_ROUTE },
        methods: { claim_ticket: ["POST"] },
        safety: { claim_executor_key_possession_required: true },
      }));
      return;
    }
    if (request.url === CANONICAL_PILOT) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
        gateway_marker: "VOID_PUBLIC_EARN_GATEWAY_V1",
        coordinator_enabled: true,
        executor_enabled: false,
        fixed_award_wc: 3,
        public_claim: {
          marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
          enabled: true,
          available: true,
          public_route: CLAIM_ROUTE,
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
          claim_server_selected_work: true,
          participant_selected_award: false,
          submission_response_canonical_accounting: true,
        },
      }));
      return;
    }
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "not_found" }));
  });

  try {
    const result = await runTool(base, 1000);
    assert.equal(result.code, 2, result.stderr || result.stdout);
    const body = JSON.parse(result.stdout);
    assert.notEqual(body.opportunity_state, "available");
    assert.ok(requests.includes(CANONICAL_GATEWAY));
    assert.ok(requests.includes(CANONICAL_PILOT));
  } finally {
    await closeServer(server);
  }
}

// One logical timeout covers the well-known request and all candidate attempts.
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
    assert.equal(body.reason, "discovery_deadline_exceeded");
    assert.equal(body.logical_timeout_ms, 300);
    assert.equal(body.maximum_candidate_paths, MAX_CANDIDATE_PATHS);
    assert.ok(
      body.attempts.some((attempt) => attempt.error === "discovery_deadline_exceeded"),
      JSON.stringify(body.attempts),
    );
    assert.ok(elapsedMs < 450, `logical deadline exceeded: ${elapsedMs.toFixed(1)}ms`);
    assert.equal(requests[0], WELL_KNOWN);
    assert.ok(requests.includes(slowPaths[0]));
    assert.ok(
      requests.length <= 1 + DEFAULT_CANDIDATE_COUNT + slowPaths.length,
      JSON.stringify(requests),
    );
  } finally {
    await closeServer(server);
  }
}

// A deadline-triggered body rejection receives no fresh teardown wait.
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

// Response rejection is not deadline expiry.
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

// Parsed JSON structure has one bounded, deadline-aware admission pass.
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
      candidate_paths: ["/public/earn/status-never-probe"],
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

// The same production analysis function owns post-body processing through its
// participant-visible terminal. A deterministic monotonic clock crosses the
// deadline during bounded JSON admission/analysis and must fail closed.
{
  let ticks = 0;
  const crossingClock = () => {
    ticks += 1;
    return ticks <= 8 ? 100 : 250;
  };
  assert.throws(
    () => analyzeDiscoveryBodyV1(
      availableGateway(),
      WELL_KNOWN,
      "http://127.0.0.1",
      3,
      [{ path: WELL_KNOWN, status: 200, ok: true, body: availableGateway() }],
      200,
      { allowTestClockOverride: true, nowFn: crossingClock },
    ),
    /discovery_deadline_exceeded/u,
  );

  const inBudget = analyzeDiscoveryBodyV1(
    availableGateway(),
    WELL_KNOWN,
    "http://127.0.0.1",
    3,
    [{ path: WELL_KNOWN, status: 200, ok: true, body: availableGateway() }],
    200,
    { allowTestClockOverride: true, nowFn: () => 100 },
  );
  assert.equal(inBudget?.opportunity_state, "available");
}

// This focused caller self-enforces the topology it relies on rather than
// relying only on a manually correct workflow file.
{
  const workflow = readFileSync(WORKFLOW, "utf8");
  assert.match(workflow, /fetch-depth:\s*1/u);
  assert.doesNotMatch(workflow, /fetch-depth:\s*0/u);
  assert.match(workflow, /persist-credentials:\s*false/u);
  assert.match(workflow, /matrix:\s*[\s\S]*node:\s*\["22",\s*"24",\s*"26"\]/u);
  assert.match(workflow, /node-version:\s*\$\{\{\s*matrix\.node\s*\}\}/u);
  for (const token of [
    "CI_DIFF_EVENT_NAME",
    "CI_DIFF_PR_BASE_SHA",
    "CI_DIFF_CURRENT_SHA",
    "CI_DIFF_CHECKOUT_SHA",
    "CI_DIFF_BASE_REMOTE",
    "CI_DIFF_HEAD_REMOTE",
    "scripts/ci_diff_hygiene_v1.sh",
    "scripts/prove_ci_diff_hygiene_v1.mjs",
    "tools/wc-public-opportunity-discovery-v1.mjs",
    "tools/wc-public-response-teardown-v1.mjs",
    "scripts/prove_wc_public_opportunity_discovery_v1.mjs",
    "scripts/prove_wc_public_opportunity_discovery_budget_v1.mjs",
  ]) {
    assert.ok(workflow.includes(token), `workflow missing ${token}`);
  }
  assert.match(workflow, /node scripts\/prove_ci_diff_hygiene_v1\.mjs/u);
  assert.match(workflow, /bash scripts\/ci_diff_hygiene_v1\.sh/u);
}

console.log(MARKER);
console.log(`maximum_candidate_paths=${MAX_CANDIDATE_PATHS}`);
console.log("shared_logical_deadline=true");
console.log("early_available_cap_bypass_closed=true");
console.log("deadline_teardown_does_not_extend_budget=true");
console.log("primary_rejection_truth_preserved=true");
console.log("structure_budget_bounded=true");
console.log("ambient_strings_not_candidate_authority=true");
console.log("cross_response_splice_rejected=true");
console.log("canonical_fallback_not_starved=true");
console.log("post_body_analysis_deadline_owned=true");
console.log("focused_workflow_self_enforced=true");
console.log("mutation=false");
console.log("wc_award=false");
