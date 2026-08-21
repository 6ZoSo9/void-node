#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const adapterFile = path.join(root, "ops/public/public-seed-adapter-v1.mjs");
const STATUS_PATH = "/wc/public-earning-pilot-v1/status";
const MAX_BYTES = 64 * 1024;
const TIMEOUT_MS = 1000;

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

async function fetchWithin(url, maximumMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), maximumMs);
  const started = Date.now();
  try {
    const response = await fetch(url, {
      redirect: "error",
      signal: controller.signal,
    });
    const text = await response.text();
    return { status: response.status, text, elapsed_ms: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

let mode = "normal";
const heldResponses = new Set();
const upstream = createServer((request, response) => {
  if (request.method !== "GET" || request.url !== STATUS_PATH) {
    response.writeHead(404, { "content-type": "application/json" });
    response.end('{"ok":false,"error":"not_found"}\n');
    return;
  }

  if (mode === "declared_oversize") {
    heldResponses.add(response);
    response.once("close", () => heldResponses.delete(response));
    response.writeHead(200, {
      "content-type": "application/json",
      "content-length": String(MAX_BYTES + 1),
    });
    response.write('{"ok":');
    return;
  }

  if (mode === "streamed_oversize") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end("x".repeat(MAX_BYTES + 1));
    return;
  }

  if (mode === "body_stall") {
    heldResponses.add(response);
    response.once("close", () => heldResponses.delete(response));
    response.writeHead(200, { "content-type": "application/json" });
    response.write('{"ok":');
    return;
  }

  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify({
    ok: true,
    marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
    coordinator_enabled: true,
    executor_enabled: false,
    task_class: "datanet_fetch_verify",
    fixed_award_wc: 3,
  }));
});

let adapter = null;
let adapterStdout = "";
let adapterStderr = "";

try {
  const upstreamAddress = await listen(upstream);
  assert.ok(upstreamAddress && typeof upstreamAddress === "object");
  const adapterPort = await reservePort();

  adapter = spawn(process.execPath, [adapterFile], {
    cwd: root,
    env: {
      ...process.env,
      VOID_EARN_COORDINATOR_UPSTREAM: `http://127.0.0.1:${upstreamAddress.port}`,
      VOID_ADAPTER_HOST: "127.0.0.1",
      VOID_ADAPTER_PORT: String(adapterPort),
      VOID_EARN_GATEWAY_TIMEOUT_MS: String(TIMEOUT_MS),
      VOID_EARN_GATEWAY_MAX_RESPONSE_BYTES: String(MAX_BYTES),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  adapter.stdout.setEncoding("utf8");
  adapter.stderr.setEncoding("utf8");
  adapter.stdout.on("data", (chunk) => { adapterStdout += chunk; });
  adapter.stderr.on("data", (chunk) => { adapterStderr += chunk; });

  const base = `http://127.0.0.1:${adapterPort}`;
  await waitFor(
    `${base}/__void/public-earn-gateway-v1/status.json`,
    () => `${adapterStdout}\n${adapterStderr}`,
  );

  mode = "normal";
  const normal = await fetchWithin(`${base}${STATUS_PATH}`);
  assert.equal(normal.status, 200, normal.text);
  assert.equal(JSON.parse(normal.text).fixed_award_wc, 3);

  mode = "declared_oversize";
  const declared = await fetchWithin(`${base}${STATUS_PATH}`);
  assert.equal(declared.status, 502, declared.text);
  assert.equal(declared.text, "adapter_upstream_error\n");
  assert.ok(
    declared.elapsed_ms < TIMEOUT_MS,
    `declared oversize should reject before the body deadline: ${declared.elapsed_ms}ms`,
  );

  mode = "streamed_oversize";
  const streamed = await fetchWithin(`${base}${STATUS_PATH}`);
  assert.equal(streamed.status, 502, streamed.text);
  assert.equal(streamed.text, "adapter_upstream_error\n");
  assert.ok(
    streamed.elapsed_ms < TIMEOUT_MS,
    `streamed oversize should reject without waiting for the deadline: ${streamed.elapsed_ms}ms`,
  );

  mode = "body_stall";
  const stalled = await fetchWithin(`${base}${STATUS_PATH}`);
  assert.equal(stalled.status, 502, stalled.text);
  assert.equal(stalled.text, "adapter_upstream_error\n");
  assert.ok(
    stalled.elapsed_ms >= Math.floor(TIMEOUT_MS * 0.7),
    `stalled body should remain owned until the configured deadline: ${stalled.elapsed_ms}ms`,
  );
  assert.ok(
    stalled.elapsed_ms < TIMEOUT_MS + 2000,
    `stalled body should terminate near the configured total deadline: ${stalled.elapsed_ms}ms`,
  );

  process.stdout.write("WC_PUBLIC_OPPORTUNITY_ADAPTER_RESPONSE_CONTRACT_GREEN\n");
} finally {
  for (const response of heldResponses) {
    response.destroy();
  }
  if (adapter && adapter.exitCode === null && adapter.signalCode === null) {
    adapter.kill("SIGTERM");
    await new Promise((resolve) => adapter.once("close", resolve));
  }
  await closeServer(upstream);
}
