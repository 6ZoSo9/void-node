#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const adapterFile = path.join(root, "ops/public/public-seed-adapter-v1.mjs");
const discoveryFile = path.join(root, "tools/wc-public-opportunity-discovery-v1.mjs");
const STATUS_PATH = "/wc/public-earning-pilot-v1/status";
const PILOT_MARKER = "VOID_WC_PUBLIC_EARNING_PILOT_V1";

function listen(server, host = "127.0.0.1", port = 0) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve(server.address()));
  });
}

function closeServer(server) {
  if (!server?.listening) return Promise.resolve();
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function reservePort() {
  const server = createServer((_request, response) => response.end());
  const address = await listen(server);
  assert.ok(address && typeof address === "object");
  const port = address.port;
  await closeServer(server);
  return port;
}

async function waitFor(url, childLog) {
  let lastError = null;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(url, { redirect: "error" });
      if (response.status > 0) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(
    `adapter did not become ready: ${lastError?.message || "unknown"}\n${childLog()}`,
  );
}

function runNode(file, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file, ...args], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}

async function readJson(url) {
  const response = await fetch(url, { redirect: "error" });
  const text = await response.text();
  return { response, body: JSON.parse(text) };
}

let fixedAwardWc = 3;
const earnRequests = [];
const regularServer = createServer((_request, response) => {
  response.writeHead(404, { "content-type": "application/json" });
  response.end('{"ok":false,"error":"not_found"}\n');
});
const earnServer = createServer((request, response) => {
  earnRequests.push({ method: request.method, url: request.url });
  if (request.method === "GET" && request.url === STATUS_PATH) {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({
      ok: true,
      marker: PILOT_MARKER,
      coordinator_enabled: true,
      executor_enabled: false,
      task_class: "datanet_fetch_verify",
      fixed_award_wc: fixedAwardWc,
      public_claim: {
        marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
        enabled: true,
        available: true,
        public_route: "/wc/public-earning-pilot-v1/claim-ticket",
        task_class: "datanet_fetch_verify",
        fixed_award_wc: fixedAwardWc,
        transport_mode: "outbound_bundle",
        server_selected_work: true,
      },
    }));
    return;
  }
  response.writeHead(404, { "content-type": "application/json" });
  response.end('{"ok":false,"error":"not_found"}\n');
});

let adapter = null;
let adapterStdout = "";
let adapterStderr = "";

try {
  const regularAddress = await listen(regularServer);
  const earnAddress = await listen(earnServer);
  assert.ok(regularAddress && typeof regularAddress === "object");
  assert.ok(earnAddress && typeof earnAddress === "object");
  const adapterPort = await reservePort();

  adapter = spawn(process.execPath, [adapterFile], {
    cwd: root,
    env: {
      ...process.env,
      VOID_SEED_UPSTREAM: `http://127.0.0.1:${regularAddress.port}`,
      VOID_EARN_COORDINATOR_UPSTREAM: `http://127.0.0.1:${earnAddress.port}`,
      VOID_ADAPTER_HOST: "127.0.0.1",
      VOID_ADAPTER_PORT: String(adapterPort),
      VOID_EARN_GATEWAY_TIMEOUT_MS: "2000",
      VOID_EARN_GATEWAY_MAX_RESPONSE_BYTES: String(64 * 1024),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  adapter.stdout.setEncoding("utf8");
  adapter.stderr.setEncoding("utf8");
  adapter.stdout.on("data", (chunk) => { adapterStdout += chunk; });
  adapter.stderr.on("data", (chunk) => { adapterStderr += chunk; });

  const base = `http://127.0.0.1:${adapterPort}`;
  await waitFor(`${base}/__void/public-earn-gateway-v1/status.json`, () => `${adapterStdout}\n${adapterStderr}`);

  for (const [label, rawAward, expectedAward, expectedMatch] of [
    ["number", 3, 3, true],
    ["string", "3", null, false],
    ["boolean", true, null, false],
    ["null", null, null, false],
  ]) {
    fixedAwardWc = rawAward;

    const sanitized = await readJson(`${base}${STATUS_PATH}`);
    assert.equal(sanitized.response.status, 200, label);
    assert.equal(sanitized.body.marker, PILOT_MARKER, label);
    assert.equal(sanitized.body.fixed_award_wc, expectedAward, label);
    assert.equal(sanitized.body.public_claim.fixed_award_wc, expectedAward, label);

    const discovery = await runNode(discoveryFile, [
      "--base", base,
      "--path", STATUS_PATH,
      "--expected-award-wc", "3",
    ]);
    assert.equal(discovery.code, 0, `${label}: ${discovery.stderr || discovery.stdout}`);
    const result = JSON.parse(discovery.stdout);
    assert.equal(result.source_path, STATUS_PATH, label);
    assert.equal(result.pilot.fixed_award_wc, expectedAward, label);
    assert.equal(result.pilot.fixed_award_matches, expectedMatch, label);
    if (!expectedMatch) {
      assert.match(result.reason, /fixed_award_mismatch_or_missing/u, label);
    }
    assert.equal(result.safety.read_only, true, label);
    assert.deepEqual(result.safety.http_methods_used, ["GET"], label);
    assert.equal(result.safety.mutation_attempted, false, label);
    assert.equal(result.safety.ticket_issuance_attempted, false, label);
    assert.equal(result.safety.wc_award_attempted, false, label);
    assert.equal(result.safety.wallet_access_attempted, false, label);
    assert.equal(result.safety.settlement_attempted, false, label);
  }

  assert.ok(earnRequests.length >= 8);
  assert.equal(earnRequests.every((request) => request.method === "GET"), true);
  assert.equal(earnRequests.every((request) => request.url === STATUS_PATH), true);

  process.stdout.write("WC_PUBLIC_OPPORTUNITY_ADAPTER_COMPOSITION_GREEN\n");
} finally {
  if (adapter && adapter.exitCode === null && adapter.signalCode === null) {
    adapter.kill("SIGTERM");
    await new Promise((resolve) => adapter.once("close", resolve));
  }
  await closeServer(earnServer);
  await closeServer(regularServer);
}
