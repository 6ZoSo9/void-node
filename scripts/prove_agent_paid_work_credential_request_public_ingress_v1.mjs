#!/usr/bin/env node
// VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_INGRESS_V1
import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { once } from "node:events";
import { spawn } from "node:child_process";

import {
  VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_AUTH_HEADER_V1,
  VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_AUTH_V1,
  canonicalVoidJsonV1,
  deriveVoidEd25519AgentIdV1,
} from "../tools/void-agent-paid-work-credential-request-public-auth-v1.mjs";

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
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_MAX_REQUESTS_PER_MINUTE",
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_UPSTREAM_GLOBAL_LIMIT_PER_MINUTE",
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_MAX_BODY_BYTES",
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_TIMEOUT_MS",
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_MAX_RESPONSE_BYTES",
  "proxyAgentPaidWorkCredentialRequest",
  "applicant_auth_invalid",
  "applicant_auth_replay",
  "applicant_rate_limit_exceeded",
  "credential_request_preauth_rate_limit_exceeded",
  "upstream_status_verified",
  "two_applicant_capacity_reserved",
  "forwarded_ip_headers_trusted: false",
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
assert.match(
  dropin,
  /VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_MAX_REQUESTS_PER_MINUTE=4/u,
);
assert.match(
  dropin,
  /VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_UPSTREAM_GLOBAL_LIMIT_PER_MINUTE=12/u,
);
assert.match(dropin, /Example only/u);
assert.doesNotMatch(
  dropin,
  /\\nEnvironment=/u,
  "systemd drop-in must contain real newlines, not escaped text",
);

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
      VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_MAX_REQUESTS_PER_MINUTE: "",
      VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_UPSTREAM_GLOBAL_LIMIT_PER_MINUTE: "",
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

function identity() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const raw = publicKey.export({ format: "jwk" });
  const publicJwk = Object.freeze({
    crv: raw.crv,
    kty: raw.kty,
    x: raw.x,
  });
  return Object.freeze({
    privateKey,
    publicJwk,
    agentId: deriveVoidEd25519AgentIdV1(publicJwk),
  });
}

function requestBody(label, agentId) {
  return Buffer.from(JSON.stringify({
    marker: "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_V1",
    version: 1,
    request_id: "voidapwcrq1_" + sha256(Buffer.from(label, "utf8")),
    agent_id: agentId,
    requested_scope: "agent_paid_work_submit",
  }) + "\n");
}

function nonce(label) {
  return crypto
    .createHash("sha256")
    .update("nonce:" + label)
    .digest()
    .subarray(0, 16)
    .toString("base64url");
}

function authHeader({
  identityValue,
  body,
  nonceLabel,
  issuedAtMs = Date.now() - 1000,
  expiresAtMs = Date.now() + 30_000,
  signingKey = identityValue.privateKey,
  requestIdOverride = null,
}) {
  const parsed = JSON.parse(body.toString("utf8"));
  const unsigned = {
    agent_id: identityValue.agentId,
    body_sha256: sha256(body),
    expires_at: new Date(expiresAtMs).toISOString(),
    issued_at: new Date(issuedAtMs).toISOString(),
    marker: VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_AUTH_V1,
    method: "POST",
    network_chain_id: 2050,
    nonce: nonce(nonceLabel),
    path: ROUTE,
    public_key_jwk: identityValue.publicJwk,
    purpose: "agent_paid_work_credential_request",
    request_id: requestIdOverride || parsed.request_id,
    version: 1,
  };
  const signature = crypto
    .sign(
      null,
      Buffer.from(canonicalVoidJsonV1(unsigned), "utf8"),
      signingKey,
    )
    .toString("base64url");
  return Buffer.from(
    JSON.stringify({ ...unsigned, signature }),
    "utf8",
  ).toString("base64url");
}

async function postCredential(base, body, auth, extraHeaders = {}) {
  return fetch(base + ROUTE, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-void-payload-sha256": sha256(body),
      ...(auth
        ? { [VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_AUTH_HEADER_V1]: auth }
        : {}),
      ...extraHeaders,
    },
    body,
    redirect: "manual",
  });
}

const upstreamCalls = [];
let upstreamStatusCalls = 0;
const UPSTREAM_LIMIT = 8;
const upstream = http.createServer(async (req, res) => {
  if (
    req.method === "GET" &&
    req.url === ROUTE + "/status"
  ) {
    upstreamStatusCalls += 1;
    const payload = Buffer.from(JSON.stringify({
      marker: "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_STATUS_V1",
      version: 1,
      ready: true,
      request_count: upstreamCalls.length,
      receipt_count: upstreamCalls.length,
      state_consistent: true,
      request_path: ROUTE,
      max_body_bytes: 65536,
      max_requests_per_minute: UPSTREAM_LIMIT,
      raw_request_content_exposed: false,
      callback_uri_exposed: false,
      credential_issuance_authorized: false,
      credential_registry_mutation_authorized: false,
      receiver_restart_authorized: false,
    }) + "\n");
    res.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "content-length": String(payload.length),
      "cache-control": "no-store",
    });
    res.end(payload);
    return;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const body = Buffer.concat(chunks);

  if (upstreamCalls.length >= UPSTREAM_LIMIT) {
    const rejected = Buffer.from(JSON.stringify({
      ok: false,
      error: "rate_limit_exceeded",
    }) + "\n");
    res.writeHead(429, {
      "content-type": "application/json; charset=utf-8",
      "content-length": String(rejected.length),
      "cache-control": "no-store",
    });
    res.end(rejected);
    return;
  }

  upstreamCalls.push({
    method: req.method,
    url: req.url,
    body,
    headers: req.headers,
  });

  const parsed = JSON.parse(body.toString("utf8"));
  const payload = Buffer.from(JSON.stringify({
    marker: "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_RESPONSE_V1",
    version: 1,
    ok: true,
    duplicate: false,
    receipt: { request_id: parsed.request_id },
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
  VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_MAX_REQUESTS_PER_MINUTE: "2",
  VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_UPSTREAM_GLOBAL_LIMIT_PER_MINUTE:
    String(UPSTREAM_LIMIT),
});
const ready = await gatewayReady(runtime);
assert.equal(ready.bounded_paid_work_credential_request_proxy_authority, true);
assert.equal(ready.paid_work_credential_request_route.path, ROUTE);
assert.deepEqual(ready.paid_work_credential_request_route.methods, ["POST"]);
assert.equal(ready.paid_work_credential_request_route.configured, true);
assert.equal(ready.paid_work_credential_request_route.accepted_for_review_only, true);
assert.equal(ready.paid_work_credential_request_route.applicant_auth_required, true);
assert.equal(
  ready.paid_work_credential_request_route.applicant_identity_scheme,
  "void-agent:ed25519",
);
assert.equal(
  ready.paid_work_credential_request_route.applicant_auth_header,
  VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_AUTH_HEADER_V1,
);
assert.equal(
  ready.paid_work_credential_request_route.applicant_max_requests_per_minute,
  2,
);
assert.equal(
  ready.paid_work_credential_request_route.upstream_global_limit_per_minute,
  UPSTREAM_LIMIT,
);
assert.equal(
  ready.paid_work_credential_request_route.upstream_status_verified,
  true,
);
assert.equal(
  ready.paid_work_credential_request_route.upstream_status_hold_reason,
  null,
);
assert.equal(
  ready.paid_work_credential_request_route
    .upstream_observed_max_requests_per_minute,
  UPSTREAM_LIMIT,
);
assert.ok(
  ready.paid_work_credential_request_route
    .preauth_max_requests_per_minute >= 60,
);
assert.equal(
  ready.paid_work_credential_request_route.preauth_global_rate_wall,
  true,
);
assert.equal(
  ready.paid_work_credential_request_route.two_applicant_capacity_reserved,
  true,
);
assert.equal(upstreamStatusCalls, 1);
assert.equal(ready.paid_work_credential_request_route.nonce_replay_protection, true);
assert.equal(ready.paid_work_credential_request_route.edge_global_rate_wall, true);
assert.equal(ready.paid_work_credential_request_route.forwarded_ip_headers_trusted, false);
assert.equal(ready.paid_work_credential_request_route.credential_issuance_authority, false);
assert.equal(ready.paid_work_credential_request_route.credential_registry_mutation_authority, false);
assert.equal(ready.paid_work_credential_request_route.wc_award_authority, false);
assert.equal(ready.paid_work_credential_request_route.funds_movement, false);

const base = `http://127.0.0.1:${ready.port}`;
const basicIdentity = identity();
const basicBody = requestBody("basic", basicIdentity.agentId);
const basicAuth = authHeader({
  identityValue: basicIdentity,
  body: basicBody,
  nonceLabel: "basic",
});
const validResponse = await postCredential(base, basicBody, basicAuth);
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
assert.equal(upstreamCalls[0].body.equals(basicBody), true);
assert.equal(
  upstreamCalls[0].headers[
    VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_AUTH_HEADER_V1
  ],
  undefined,
);
assert.equal(upstreamCalls[0].headers["x-forwarded-for"], undefined);

const methodResponse = await fetch(base + ROUTE, { method: "GET" });
assert.equal(methodResponse.status, 405);
assert.equal(methodResponse.headers.get("allow"), "POST");
assert.equal(upstreamCalls.length, 1);

const queryResponse = await fetch(base + ROUTE + "?x=1", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-void-payload-sha256": sha256(basicBody),
  },
  body: basicBody,
});
assert.equal(queryResponse.status, 400);
assert.equal((await queryResponse.json()).error, "query_not_allowed");
assert.equal(upstreamCalls.length, 1);

const noHashResponse = await fetch(base + ROUTE, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    [VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_AUTH_HEADER_V1]: basicAuth,
  },
  body: basicBody,
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

const unsignedBody = requestBody("unsigned", basicIdentity.agentId);
const unsignedResponse = await postCredential(base, unsignedBody, "");
assert.equal(unsignedResponse.status, 401);
assert.equal((await unsignedResponse.json()).error, "applicant_auth_invalid");
assert.equal(upstreamCalls.length, 1);

const wrongSignerIdentity = identity();
const wrongSignerBody = requestBody("wrong-signer", wrongSignerIdentity.agentId);
const wrongSignerResponse = await postCredential(
  base,
  wrongSignerBody,
  authHeader({
    identityValue: wrongSignerIdentity,
    body: wrongSignerBody,
    nonceLabel: "wrong-signer",
    signingKey: basicIdentity.privateKey,
  }),
);
assert.equal(wrongSignerResponse.status, 401);
assert.equal((await wrongSignerResponse.json()).error, "applicant_auth_invalid");
assert.equal(upstreamCalls.length, 1);

const rotatingIdentity = identity();
const rotatedBody = requestBody("rotated-key", basicIdentity.agentId);
const rotatedResponse = await postCredential(
  base,
  rotatedBody,
  authHeader({
    identityValue: rotatingIdentity,
    body: rotatedBody,
    nonceLabel: "rotated-key",
  }),
);
assert.equal(rotatedResponse.status, 401);
assert.equal((await rotatedResponse.json()).error, "applicant_auth_invalid");
assert.equal(
  upstreamCalls.length,
  1,
  "throwaway signing keys must not replace the inner applicant identity",
);

const expiredIdentity = identity();
const expiredBody = requestBody("expired", expiredIdentity.agentId);
const expiredResponse = await postCredential(
  base,
  expiredBody,
  authHeader({
    identityValue: expiredIdentity,
    body: expiredBody,
    nonceLabel: "expired",
    issuedAtMs: Date.now() - 60_000,
    expiresAtMs: Date.now() - 1000,
  }),
);
assert.equal(expiredResponse.status, 401);
assert.equal((await expiredResponse.json()).error, "applicant_auth_invalid");
assert.equal(upstreamCalls.length, 1);

const mismatchIdentity = identity();
const mismatchBody = requestBody("mismatch", mismatchIdentity.agentId);
const mismatchResponse = await postCredential(
  base,
  mismatchBody,
  authHeader({
    identityValue: mismatchIdentity,
    body: mismatchBody,
    nonceLabel: "mismatch",
    requestIdOverride: "voidapwcrq1_" + "f".repeat(64),
  }),
);
assert.equal(mismatchResponse.status, 401);
assert.equal((await mismatchResponse.json()).error, "applicant_auth_invalid");
assert.equal(upstreamCalls.length, 1);

const replayIdentity = identity();
const replayBody = requestBody("replay", replayIdentity.agentId);
const replayAuth = authHeader({
  identityValue: replayIdentity,
  body: replayBody,
  nonceLabel: "replay",
});
const replayFirst = await postCredential(base, replayBody, replayAuth);
assert.equal(replayFirst.status, 202);
assert.equal(upstreamCalls.length, 2);
const replaySecond = await postCredential(base, replayBody, replayAuth);
assert.equal(replaySecond.status, 409);
assert.equal((await replaySecond.json()).error, "applicant_auth_replay");
assert.equal(upstreamCalls.length, 2);

const applicantA = identity();
for (let index = 0; index < 2; index += 1) {
  const body = requestBody("applicant-a-" + index, applicantA.agentId);
  const response = await postCredential(
    base,
    body,
    authHeader({
      identityValue: applicantA,
      body,
      nonceLabel: "applicant-a-" + index,
    }),
    {
      "x-forwarded-for": `203.0.113.${10 + index}`,
      forwarded: `for=203.0.113.${20 + index}`,
    },
  );
  assert.equal(response.status, 202);
}
assert.equal(upstreamCalls.length, 4);

const applicantAThirdBody = requestBody("applicant-a-third", applicantA.agentId);
const applicantAThird = await postCredential(
  base,
  applicantAThirdBody,
  authHeader({
    identityValue: applicantA,
    body: applicantAThirdBody,
    nonceLabel: "applicant-a-third",
  }),
  {
    "x-forwarded-for": "198.51.100.200",
    forwarded: "for=198.51.100.201",
  },
);
assert.equal(applicantAThird.status, 429);
assert.equal(
  (await applicantAThird.json()).error,
  "applicant_rate_limit_exceeded",
);
assert.equal(upstreamCalls.length, 4);

const applicantB = identity();
for (let index = 0; index < 2; index += 1) {
  const body = requestBody("applicant-b-" + index, applicantB.agentId);
  const response = await postCredential(
    base,
    body,
    authHeader({
      identityValue: applicantB,
      body,
      nonceLabel: "applicant-b-" + index,
    }),
  );
  assert.equal(response.status, 202);
}
assert.equal(
  upstreamCalls.length,
  6,
  "applicant B must retain its allowance after applicant A is exhausted",
);
assert.ok(upstreamCalls.length < UPSTREAM_LIMIT);

const applicantC = identity();
for (let index = 0; index < 2; index += 1) {
  const body = requestBody("applicant-c-" + index, applicantC.agentId);
  const response = await postCredential(
    base,
    body,
    authHeader({
      identityValue: applicantC,
      body,
      nonceLabel: "applicant-c-" + index,
    }),
  );
  assert.equal(response.status, 202);
}
assert.equal(upstreamCalls.length, UPSTREAM_LIMIT);

const applicantD = identity();
const applicantDBody = requestBody("applicant-d-global-hold", applicantD.agentId);
const applicantDResponse = await postCredential(
  base,
  applicantDBody,
  authHeader({
    identityValue: applicantD,
    body: applicantDBody,
    nonceLabel: "applicant-d-global-hold",
  }),
);
assert.equal(applicantDResponse.status, 429);
assert.equal(
  (await applicantDResponse.json()).error,
  "public_credential_request_global_rate_limit_exceeded",
);
assert.equal(
  upstreamCalls.length,
  UPSTREAM_LIMIT,
  "edge global wall must stop before another upstream request",
);

for (const call of upstreamCalls) {
  assert.equal(
    call.headers[VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_AUTH_HEADER_V1],
    undefined,
  );
  assert.equal(call.headers["x-forwarded-for"], undefined);
  assert.equal(call.headers.forwarded, undefined);
}

await stopGateway(runtime);

const mismatchRuntime = startGateway({
  VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_UPSTREAM:
    `http://127.0.0.1:${upstreamPort}`,
  VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_MAX_REQUESTS_PER_MINUTE: "2",
  VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_UPSTREAM_GLOBAL_LIMIT_PER_MINUTE:
    "12",
});
const mismatchReady = await gatewayReady(mismatchRuntime);
assert.equal(
  mismatchReady.bounded_paid_work_credential_request_proxy_authority,
  false,
);
assert.equal(
  mismatchReady.paid_work_credential_request_route.configured,
  false,
);
assert.equal(
  mismatchReady.paid_work_credential_request_route.upstream_status_verified,
  false,
);
assert.equal(
  mismatchReady.paid_work_credential_request_route.upstream_status_hold_reason,
  "upstream_status_not_verified",
);
const mismatchIdentity = identity();
const mismatchLimitBody = requestBody(
  "mismatched-upstream-limit",
  mismatchIdentity.agentId,
);
const mismatchLimitResponse = await postCredential(
  `http://127.0.0.1:${mismatchReady.port}`,
  mismatchLimitBody,
  authHeader({
    identityValue: mismatchIdentity,
    body: mismatchLimitBody,
    nonceLabel: "mismatched-upstream-limit",
  }),
);
assert.equal(mismatchLimitResponse.status, 503);
assert.equal(
  (await mismatchLimitResponse.json()).error,
  "agent_paid_work_credential_request_gateway_unavailable",
);
await stopGateway(mismatchRuntime);

const preauthRuntime = startGateway({
  VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_UPSTREAM:
    `http://127.0.0.1:${upstreamPort}`,
  VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_MAX_REQUESTS_PER_MINUTE: "2",
  VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_UPSTREAM_GLOBAL_LIMIT_PER_MINUTE:
    String(UPSTREAM_LIMIT),
});
const preauthReady = await gatewayReady(preauthRuntime);
assert.equal(preauthReady.paid_work_credential_request_route.configured, true);
const preauthBase = `http://127.0.0.1:${preauthReady.port}`;
const preauthMax =
  preauthReady.paid_work_credential_request_route
    .preauth_max_requests_per_minute;
assert.ok(Number.isSafeInteger(preauthMax) && preauthMax >= 60);
const upstreamBeforePreauthFlood = upstreamCalls.length;
for (let index = 0; index < preauthMax; index += 1) {
  const floodIdentity = identity();
  const floodBody = requestBody(
    "preauth-invalid-" + index,
    floodIdentity.agentId,
  );
  const response = await postCredential(
    preauthBase,
    floodBody,
    "not-a-valid-auth-envelope",
  );
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error, "applicant_auth_invalid");
}
const blockedIdentity = identity();
const blockedBody = requestBody(
  "preauth-blocked",
  blockedIdentity.agentId,
);
const blockedResponse = await postCredential(
  preauthBase,
  blockedBody,
  "not-a-valid-auth-envelope",
);
assert.equal(blockedResponse.status, 429);
assert.equal(
  (await blockedResponse.json()).error,
  "credential_request_preauth_rate_limit_exceeded",
);
assert.equal(
  upstreamCalls.length,
  upstreamBeforePreauthFlood,
  "invalid-auth flood must never reach the loopback gateway",
);
await stopGateway(preauthRuntime);

const incompleteRuntime = startGateway({
  VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_UPSTREAM:
    `http://127.0.0.1:${upstreamPort}`,
});
const incompleteReady = await gatewayReady(incompleteRuntime);
assert.equal(
  incompleteReady.bounded_paid_work_credential_request_proxy_authority,
  false,
);
assert.equal(incompleteReady.paid_work_credential_request_route.configured, false);
const incompleteIdentity = identity();
const incompleteBody = requestBody(
  "incomplete-config",
  incompleteIdentity.agentId,
);
const incompleteResponse = await postCredential(
  `http://127.0.0.1:${incompleteReady.port}`,
  incompleteBody,
  authHeader({
    identityValue: incompleteIdentity,
    body: incompleteBody,
    nonceLabel: "incomplete-config",
  }),
);
assert.equal(incompleteResponse.status, 503);
assert.equal(
  (await incompleteResponse.json()).error,
  "agent_paid_work_credential_request_gateway_unavailable",
);
await stopGateway(incompleteRuntime);

const heldRuntime = startGateway();
const heldReady = await gatewayReady(heldRuntime);
assert.equal(heldReady.bounded_paid_work_credential_request_proxy_authority, false);
assert.equal(heldReady.paid_work_credential_request_route.configured, false);
const heldIdentity = identity();
const heldBody = requestBody("held", heldIdentity.agentId);
const heldResponse = await postCredential(
  `http://127.0.0.1:${heldReady.port}`,
  heldBody,
  authHeader({
    identityValue: heldIdentity,
    body: heldBody,
    nonceLabel: "held",
  }),
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
console.log("inner_request_bytes_preserved=true");
console.log("payload_sha256_required=true");
console.log("query_parameters_allowed=false");
console.log("applicant_identity=void-agent:ed25519");
console.log("applicant_signature_required=true");
console.log("inner_agent_id_must_equal_signing_identity=true");
console.log("throwaway_key_rate_identity_rotation_blocked=true");
console.log("auth_ttl_max_seconds=60");
console.log("nonce_replay_rejected_before_upstream=true");
console.log("forwarded_ip_headers_trusted=false");
console.log("single_applicant_cannot_exhaust_upstream_bucket=true");
console.log("second_applicant_isolated_after_first_exhaustion=true");
console.log("upstream_status_limit_equality_required=true");
console.log("mismatched_upstream_limit_holds_route_closed=true");
console.log("preauth_global_rate_wall_before_signature_verification=true");
console.log("invalid_auth_flood_bounded_before_upstream=true");
console.log("edge_global_rate_wall_mirrors_verified_upstream_cap=true");
console.log("upstream_global_rate_wall_preserved=true");
console.log("rejected_rate_limited_nonces_do_not_fill_replay_cache=true");
console.log("credential_issuance_authority=false");
console.log("default_activation=false");
