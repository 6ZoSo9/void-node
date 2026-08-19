#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const adapterFile = path.join(root, "ops/public/public-seed-adapter-v1.mjs");
const STATUS_PATH = "/wc/public-earning-pilot-v1/status";

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

function baseStatus() {
  return {
    ok: true,
    marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
    coordinator_enabled: true,
    executor_enabled: false,
    task_class: "datanet_fetch_verify",
    fixed_award_wc: 3,
    caps: {
      account_total: 0,
      account_limit: 1,
      global: 10,
      global_active: 0,
      global_consumed: 2,
    },
    public_claim: {
      marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
      enabled: true,
      available: true,
      task_class: "datanet_fetch_verify",
      fixed_award_wc: 3,
      transport_mode: "outbound_bundle",
      server_selected_work: true,
      ticket_ttl_ms: 900_000,
      cooldown_ms: 900_000,
      max_claims_per_account_24h: 24,
      max_claims_per_executor_24h: 24,
      global_active_cap: 10,
      global_claims_per_24h: 500,
      work_available: true,
    },
  };
}

let statusBody = baseStatus();
const upstream = createServer((request, response) => {
  if (request.method === "GET" && request.url === STATUS_PATH) {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(statusBody));
    return;
  }
  response.writeHead(404, { "content-type": "application/json" });
  response.end('{"ok":false,"error":"not_found"}\n');
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
  await waitFor(
    `${base}/__void/public-earn-gateway-v1/status.json`,
    () => `${adapterStdout}\n${adapterStderr}`,
  );

  async function sanitized() {
    const response = await fetch(`${base}${STATUS_PATH}`, { redirect: "error" });
    assert.equal(response.status, 200);
    return JSON.parse(await response.text());
  }

  statusBody = baseStatus();
  const valid = await sanitized();
  assert.deepEqual(valid.caps, {
    account_total: 0,
    account_limit: 1,
    global_limit: 10,
    global_active: 0,
    global_consumed: 2,
  });
  assert.equal(valid.public_claim.ticket_ttl_ms, 900_000);
  assert.equal(valid.public_claim.cooldown_ms, 900_000);
  assert.equal(valid.public_claim.max_claims_per_account_24h, 24);
  assert.equal(valid.public_claim.max_claims_per_executor_24h, 24);
  assert.equal(valid.public_claim.global_active_cap, 10);
  assert.equal(valid.public_claim.global_claims_per_24h, 500);

  const cases = [
    ["caps.account_total string", (body) => { body.caps.account_total = "0"; }, ["caps", "account_total"]],
    ["caps.account_limit string", (body) => { body.caps.account_limit = "1"; }, ["caps", "account_limit"]],
    ["caps.global boolean", (body) => { body.caps.global = true; }, ["caps", "global_limit"]],
    ["caps.global_active null", (body) => { body.caps.global_active = null; }, ["caps", "global_active"]],
    ["caps.global_consumed fractional", (body) => { body.caps.global_consumed = 1.5; }, ["caps", "global_consumed"]],
    ["ticket ttl string", (body) => { body.public_claim.ticket_ttl_ms = "900000"; }, ["public_claim", "ticket_ttl_ms"]],
    ["cooldown boolean", (body) => { body.public_claim.cooldown_ms = true; }, ["public_claim", "cooldown_ms"]],
    ["account claims null", (body) => { body.public_claim.max_claims_per_account_24h = null; }, ["public_claim", "max_claims_per_account_24h"]],
    ["executor claims string", (body) => { body.public_claim.max_claims_per_executor_24h = "24"; }, ["public_claim", "max_claims_per_executor_24h"]],
    ["global active zero", (body) => { body.public_claim.global_active_cap = 0; }, ["public_claim", "global_active_cap"]],
    ["global claims unsafe", (body) => { body.public_claim.global_claims_per_24h = Number.MAX_SAFE_INTEGER + 1; }, ["public_claim", "global_claims_per_24h"]],
  ];

  for (const [label, mutate, pathParts] of cases) {
    statusBody = baseStatus();
    mutate(statusBody);
    const body = await sanitized();
    let value = body;
    for (const part of pathParts) value = value?.[part];
    assert.equal(value, null, label);
  }

  process.stdout.write("WC_PUBLIC_OPPORTUNITY_ADAPTER_POLICY_EVIDENCE_TYPES_GREEN\n");
} finally {
  if (adapter && adapter.exitCode === null && adapter.signalCode === null) {
    adapter.kill("SIGTERM");
    await new Promise((resolve) => adapter.once("close", resolve));
  }
  await closeServer(upstream);
}
