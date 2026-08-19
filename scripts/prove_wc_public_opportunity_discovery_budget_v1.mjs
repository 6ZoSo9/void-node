#!/usr/bin/env node

import assert from "node:assert/strict";
import { createServer } from "node:http";
import { performance } from "node:perf_hooks";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = "VOID_WC_PUBLIC_OPPORTUNITY_DISCOVERY_BUDGET_V1_PROOF_GREEN";
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const TOOL = resolve(ROOT, "tools/wc-public-opportunity-discovery-v1.mjs");
const WELL_KNOWN = "/.well-known/void-public-node.json";
const MAX_CANDIDATE_PATHS = 24;

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
      response.end(JSON.stringify({
        marker: "VOID_PUBLIC_NODE_DISCOVERY_BUDGET_FIXTURE_V1",
        candidate_paths: advertised,
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
    assert.equal(body.reason, "candidate path limit exceeded");
    assert.equal(body.maximum_candidate_paths, MAX_CANDIDATE_PATHS);
    assert.ok(body.candidate_count > MAX_CANDIDATE_PATHS);
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

console.log(MARKER);
console.log(`maximum_candidate_paths=${MAX_CANDIDATE_PATHS}`);
console.log("shared_logical_deadline=true");
console.log("mutation=false");
console.log("wc_award=false");