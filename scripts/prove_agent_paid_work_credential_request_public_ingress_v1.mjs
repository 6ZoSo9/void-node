#!/usr/bin/env node
// VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_INGRESS_V1
import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { once } from "node:events";
import { spawn } from "node:child_process";

const ROOT = process.cwd();
const GATEWAY = path.join(ROOT, "ops/void-ai-agent-public-gateway-v1.mjs");
const DROPIN = path.join(
  ROOT,
  "examples/systemd/void-ai-agent-public-gateway-v1.service.d/71-agent-paid-work-credential-request-gateway-v1.conf",
);
const ROUTE = "/__void/agents/paid-work/credential-requests/v1";
const source = fs.readFileSync(GATEWAY, "utf8");
const dropin = fs.readFileSync(DROPIN, "utf8");

for (const token of [
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_INGRESS_V1",
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_UPSTREAM",
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_MAX_BODY_BYTES",
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_TIMEOUT_MS",
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_MAX_RESPONSE_BYTES",
  "proxyAgentPaidWorkCredentialRequest",
  "agent_paid_work_credential_request_gateway_unavailable",
  "agent_paid_work_credential_request_gateway_upstream_failed",
  "X-Void-Agent-Paid-Work-Credential-Request-Route",
  "credential_issuance_authority: false",
  "credential_registry_mutation_authority: false",
]) {
  assert.ok(source.includes(token), `missing gateway binding: ${token}`);
}
assert.equal(
  (source.match(/\/__void\/agents\/paid-work\/credential-requests\/v1/g) || []).length,
  1,
  "gateway must contain exactly one literal credential-request route",
);
assert.equal(
  source.includes("/__void/agents/paid-work/credential-requests/v1/status"),
  false,
  "public gateway must not proxy the credential-request status route",
);
assert.match(
  dropin,
  /VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_UPSTREAM=http:\/\/127\.0\.0\.1:4113/u,
);
assert.match(dropin, /Example only/u);

const sha256 = (body) =>
  crypto.createHash("sha256").update(body).digest("hex");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return address.port;
}

function startGateway(extraEnv = {}) {
  const logs = [];
  const child = spawn(process.execPath, [GATEWAY], {
    cwd: ROOT,
    env: {
      ...process.env,
      VOID_AI_AGENT_PUBLIC_GATEWAY_PROOF_MODE: "1",
      VOID_AI_AGENT_PUBLIC_GATEWAY_PORT: "0",
      VOID_OPERATOR_WEBHOOK_RECEIVER_UPSTREAM: "",
      VOID_AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM: "",
      VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_UPSTREAM: "",
      VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_MAX_BODY_BYTES: "1024",
      VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_MAX_RESPONSE_BYTES: "4096",
      VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_TIMEOUT_MS: "3000",
      ...extraEnv,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => logs.push(chunk.toString("utf8")));
  child.stderr.on("data", (chunk) => logs.push(chunk.toString("utf8")));
  return { child, logs };
}

async function gatewayReady(runtime) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (runtime.child.exitCode !== null) {
      throw new Error("gateway exited before ready: " + runtime.logs.join(""));
    }
    const lines = runtime.logs.join("").split(/\r?\n/u).filter(Boolean);
    for (const line of lines) {
      try {
        const value = JSON.parse(line);
        if (value?.marker === "VOID_AI_AGENT_PUBLIC_GATEWAY_V1" && value?.ready === true) {
          return value;
        }
      } catch (_error) { void _error; }
    }
    await sleep(40);
  }
  throw new Error("gateway readiness timeout: " + runtime.logs.join(""));
}

async function stopGateway(runtime) {
  if (runtime.child.exitCode !== null) return;
  const exit = once(runtime.child, "exit");
  runtime.child.kill("SIGTERM");
  await exit;
}

const upstreamCalls = [];
const upstream = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const body = Buffer.concat(chunks);
  upstreamCalls.push({
    method: req.method,
    url: req.url,
    body,
    headers: req.headers,
  });

  const payload = Buffer.from(JSON.stringify({
    marker: "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_RESPONSE_V1",
    version: 1,
    ok: true,
    duplicate: false,
    receipt: { request_id: "voidapwcrq1_" + "a".repeat(64) },
    credential_created: false,
    credential_registry_mutated: false,
    receiver_restart: false,
    credential_issuance_authorized: false,
  }) + "\n");

  res.writeHead(202, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(payload.length),
    "cache-control": "no-store",
  });
  res.end(payload);
});
const upstreamPort = await listen(upstream);

const runtime = startGateway({
  VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_UPSTREAM:
    `http://127.0.0.1:${upstreamPort}`,
});
const ready = await gatewayReady(runtime);
assert.equal(ready.bounded_paid_work_credential_request_proxy_authority, true);
assert.equal(ready.paid_work_credential_request_route.path, ROUTE);
assert.deepEqual(ready.paid_work_credential_request_route.methods, ["POST"]);
assert.equal(ready.paid_work_credential_request_route.configured, true);
assert.equal(ready.paid_work_credential_request_route.accepted_for_review_only, true);
assert.equal(ready.paid_work_credential_request_route.credential_issuance_authority, false);
assert.equal(ready.paid_work_credential_request_route.credential_registry_mutation_authority, false);
assert.equal(ready.paid_work_credential_request_route.wc_award_authority, false);
assert.equal(ready.paid_work_credential_request_route.funds_movement, false);

const base = `http://127.0.0.1:${ready.port}`;
const validBody = Buffer.from(JSON.stringify({
  marker: "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_V1",
  version: 1,
  request_id: "voidapwcrq1_" + "b".repeat(64),
  requested_scope: "agent_paid_work_submit",
}) + "\n");
const validHash = sha256(validBody);

const validResponse = await fetch(base + ROUTE, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-void-payload-sha256": validHash,
  },
  body: validBody,
  redirect: "manual",
});
assert.equal(validResponse.status, 202);
assert.equal(
  validResponse.headers.get("x-void-agent-paid-work-credential-request-route"),
  "v1",
);
const validJson = await validResponse.json();
assert.equal(validJson.credential_created, false);
assert.equal(validJson.credential_issuance_authorized, false);
assert.equal(upstreamCalls.length, 1);
assert.equal(upstreamCalls[0].method, "POST");
assert.equal(upstreamCalls[0].url, ROUTE);
assert.equal(upstreamCalls[0].body.equals(validBody), true);
assert.equal(upstreamCalls[0].headers["x-void-payload-sha256"], validHash);
assert.equal(upstreamCalls[0].headers.authorization, undefined);
assert.equal(upstreamCalls[0].headers["content-type"], "application/json");

const methodResponse = await fetch(base + ROUTE, { method: "GET" });
assert.equal(methodResponse.status, 405);
assert.equal(methodResponse.headers.get("allow"), "POST");
assert.equal(upstreamCalls.length, 1);

const queryResponse = await fetch(base + ROUTE + "?x=1", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-void-payload-sha256": validHash,
  },
  body: validBody,
});
assert.equal(queryResponse.status, 400);
assert.equal((await queryResponse.json()).error, "query_not_allowed");
assert.equal(upstreamCalls.length, 1);

const noHashResponse = await fetch(base + ROUTE, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: validBody,
});
assert.equal(noHashResponse.status, 400);
assert.equal((await noHashResponse.json()).error, "payload_sha256_required");
assert.equal(upstreamCalls.length, 1);

const invalidBody = Buffer.from("{not-json}");
const invalidResponse = await fetch(base + ROUTE, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-void-payload-sha256": sha256(invalidBody),
  },
  body: invalidBody,
});
assert.equal(invalidResponse.status, 400);
assert.equal((await invalidResponse.json()).error, "invalid_json");
assert.equal(upstreamCalls.length, 1);

const largeBody = Buffer.from(JSON.stringify({ value: "x".repeat(1100) }));
const largeResponse = await fetch(base + ROUTE, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-void-payload-sha256": sha256(largeBody),
  },
  body: largeBody,
});
assert.equal(largeResponse.status, 413);
assert.equal((await largeResponse.json()).error, "request_body_too_large");
assert.equal(upstreamCalls.length, 1);

const siblingResponse = await fetch(base + ROUTE + "/status");
assert.equal(siblingResponse.status, 404);
assert.equal(upstreamCalls.length, 1);

await stopGateway(runtime);

const heldRuntime = startGateway();
const heldReady = await gatewayReady(heldRuntime);
assert.equal(heldReady.bounded_paid_work_credential_request_proxy_authority, false);
assert.equal(heldReady.paid_work_credential_request_route.configured, false);
const heldResponse = await fetch(
  `http://127.0.0.1:${heldReady.port}${ROUTE}`,
  {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-void-payload-sha256": validHash,
    },
    body: validBody,
  },
);
assert.equal(heldResponse.status, 503);
assert.equal(
  (await heldResponse.json()).error,
  "agent_paid_work_credential_request_gateway_unavailable",
);
await stopGateway(heldRuntime);

await new Promise((resolve, reject) => {
  upstream.close((error) => error ? reject(error) : resolve());
});

console.log("VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_INGRESS_V1_GREEN");
console.log("exact_public_post_route=true");
console.log("generic_proxy=false");
console.log("loopback_upstream_only=true");
console.log("payload_sha256_required=true");
console.log("query_parameters_allowed=false");
console.log("credential_issuance_authority=false");
console.log("default_activation=false");
