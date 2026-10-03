#!/usr/bin/env node
import crypto from "node:crypto";
import http from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_AUTH_HEADER_V1,
  verifyAgentPaidWorkCredentialRequestPublicAuthV1,
} from "../tools/void-agent-paid-work-credential-request-public-auth-v1.mjs";

const MARKER = "VOID_AI_AGENT_PUBLIC_GATEWAY_V1";
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 4112;
const UPSTREAM_REJECTION_TEARDOWN_TIMEOUT_MS = 300;
const OPERATOR_WEBHOOK_INTEGRATION_MARKER =
  "VOID_OPERATOR_WEBHOOK_RECEIVER_AI_GATEWAY_SOURCE_INTEGRATION_V1";
const OPERATOR_WEBHOOK_RECEIVER_UPSTREAM_RAW = String(
  process.env.VOID_OPERATOR_WEBHOOK_RECEIVER_UPSTREAM || "",
).trim();
const OPERATOR_WEBHOOK_RECEIVER_PATH =
  "/__void/operator-notifications/v1/candidate";
const OPERATOR_WEBHOOK_RECEIVER_MAX_BODY_BYTES = Math.max(
  1024,
  Number(
    process.env.VOID_OPERATOR_WEBHOOK_RECEIVER_MAX_BODY_BYTES ||
      String(64 * 1024),
  ),
);
const OPERATOR_WEBHOOK_RECEIVER_TIMEOUT_MS = Math.max(
  1000,
  Number(
    process.env.VOID_OPERATOR_WEBHOOK_RECEIVER_TIMEOUT_MS || "15000",
  ),
);
const OPERATOR_WEBHOOK_RECEIVER_MAX_RESPONSE_BYTES = Math.max(
  1024,
  Number(
    process.env.VOID_OPERATOR_WEBHOOK_RECEIVER_MAX_RESPONSE_BYTES ||
      String(4 * 1024 * 1024),
  ),
);

const AGENT_PAID_WORK_SUBMISSION_INTEGRATION_MARKER =
  "VOID_AGENT_PAID_WORK_SUBMISSION_INTAKE_GATEWAY_SOURCE_V1";
const AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM_RAW = String(
  process.env.VOID_AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM || "",
).trim();
const AGENT_PAID_WORK_SUBMISSION_RECEIVER_PATH =
  "/__void/agents/paid-work/submissions/v1";
const AGENT_PAID_WORK_SUBMISSION_MAX_BODY_BYTES = Math.max(
  1024,
  Number(
    process.env.VOID_AGENT_PAID_WORK_SUBMISSION_MAX_BODY_BYTES ||
      String(64 * 1024),
  ),
);
const AGENT_PAID_WORK_SUBMISSION_TIMEOUT_MS = Math.max(
  1000,
  Number(
    process.env.VOID_AGENT_PAID_WORK_SUBMISSION_TIMEOUT_MS || "15000",
  ),
);
const AGENT_PAID_WORK_SUBMISSION_MAX_RESPONSE_BYTES = Math.max(
  1024,
  Number(
    process.env.VOID_AGENT_PAID_WORK_SUBMISSION_MAX_RESPONSE_BYTES ||
      String(4 * 1024 * 1024),
  ),
);

const AGENT_PAID_WORK_CREDENTIAL_REQUEST_INTEGRATION_MARKER =
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_INGRESS_V1";
const AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_UPSTREAM_RAW = String(
  process.env.VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_UPSTREAM || "",
).trim();
const AGENT_PAID_WORK_CREDENTIAL_REQUEST_PATH =
  "/__void/agents/paid-work/credential-requests/v1";
const AGENT_PAID_WORK_CREDENTIAL_REQUEST_MAX_BODY_BYTES = Math.max(
  1024,
  Number(
    process.env.VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_MAX_BODY_BYTES ||
      String(64 * 1024),
  ),
);
const AGENT_PAID_WORK_CREDENTIAL_REQUEST_TIMEOUT_MS = Math.max(
  1000,
  Number(
    process.env.VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_TIMEOUT_MS || "15000",
  ),
);
const AGENT_PAID_WORK_CREDENTIAL_REQUEST_MAX_RESPONSE_BYTES = Math.max(
  1024,
  Number(
    process.env.VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_MAX_RESPONSE_BYTES ||
      String(4 * 1024 * 1024),
  ),
);
const AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_MAX_REQUESTS_PER_MINUTE_RAW =
  String(
    process.env
      .VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_MAX_REQUESTS_PER_MINUTE ||
      "",
  ).trim();
const AGENT_PAID_WORK_CREDENTIAL_REQUEST_UPSTREAM_GLOBAL_LIMIT_PER_MINUTE_RAW =
  String(
    process.env
      .VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_UPSTREAM_GLOBAL_LIMIT_PER_MINUTE ||
      "",
  ).trim();
const AGENT_PAID_WORK_CREDENTIAL_REQUEST_MAX_TRACKED_APPLICANTS = 4096;
const AGENT_PAID_WORK_CREDENTIAL_REQUEST_MAX_TRACKED_NONCES = 8192;

const here = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(
  process.env.VOID_REPO_ROOT || path.join(here, ".."),
);

const routeFiles = new Map([
  [
    "/public-node/agents/discovery-v1.json",
    "public/public-node/agents/discovery-v1.json",
  ],
  [
    "/public-node/agents/discovery-v1.schema.json",
    "public/public-node/agents/discovery-v1.schema.json",
  ],
  [
    "/public-node/agents/paid-work-v1.json",
    "public/public-node/agents/paid-work-v1.json",
  ],
  [
    "/public-node/agents/paid-work-v1.schema.json",
    "public/public-node/agents/paid-work-v1.schema.json",
  ],
  [
    "/.well-known/void-agent-discovery.json",
    "public/.well-known/void-agent-discovery.json",
  ],
  [
    "/.well-known/void-agent-discovery.schema.json",
    "public/.well-known/void-agent-discovery.schema.json",
  ],
  [
    "/public-node/agents/capabilities-v1.json",
    "public/public-node/agents/capabilities-v1.json",
  ],
  [
    "/public-node/agents/capabilities-v1.schema.json",
    "public/public-node/agents/capabilities-v1.schema.json",
  ],
  [
    "/.well-known/void-agent-capabilities.json",
    "public/.well-known/void-agent-capabilities.json",
  ],
  [
    "/.well-known/void-agent-capabilities.schema.json",
    "public/.well-known/void-agent-capabilities.schema.json",
  ],
  [
    "/public-node/agents/authentication-v1.json",
    "public/public-node/agents/authentication-v1.json",
  ],
  [
    "/public-node/agents/authentication-v1.schema.json",
    "public/public-node/agents/authentication-v1.schema.json",
  ],
  [
    "/.well-known/void-agent-authentication.json",
    "public/.well-known/void-agent-authentication.json",
  ],
  [
    "/.well-known/void-agent-authentication.schema.json",
    "public/.well-known/void-agent-authentication.schema.json",
  ],
]);

function fail(message) {
  process.stderr.write(`HOLD: ${message}\n`);
  process.exit(78);
}

function parseOptionalBoundedInteger(raw, name, minimum, maximum) {
  if (raw === "") return 0;
  if (!/^(?:0|[1-9][0-9]*)$/.test(raw)) {
    fail(`invalid ${name}`);
  }
  const value = Number(raw);
  if (
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    fail(`invalid ${name}`);
  }
  return value;
}

function parseReviewedLoopbackUpstream(raw, name) {
  if (!raw) return "";

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    fail(`invalid ${name}`);
  }

  const parsedPort = Number(parsed.port);
  if (
    parsed.protocol !== "http:" ||
    parsed.hostname !== "127.0.0.1" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== "" ||
    !Number.isSafeInteger(parsedPort) ||
    parsedPort < 1 ||
    parsedPort > 65535 ||
    raw !== `http://127.0.0.1:${parsedPort}`
  ) {
    fail(`invalid ${name}`);
  }

  return raw;
}

const OPERATOR_WEBHOOK_RECEIVER_UPSTREAM =
  parseReviewedLoopbackUpstream(
    OPERATOR_WEBHOOK_RECEIVER_UPSTREAM_RAW,
    "VOID_OPERATOR_WEBHOOK_RECEIVER_UPSTREAM",
  );
const AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM =
  parseReviewedLoopbackUpstream(
    AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM_RAW,
    "VOID_AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM",
  );
const AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_UPSTREAM =
  parseReviewedLoopbackUpstream(
    AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_UPSTREAM_RAW,
    "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_UPSTREAM",
  );
const AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_MAX_REQUESTS_PER_MINUTE =
  parseOptionalBoundedInteger(
    AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_MAX_REQUESTS_PER_MINUTE_RAW,
    "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_MAX_REQUESTS_PER_MINUTE",
    1,
    60,
  );
const AGENT_PAID_WORK_CREDENTIAL_REQUEST_UPSTREAM_GLOBAL_LIMIT_PER_MINUTE =
  parseOptionalBoundedInteger(
    AGENT_PAID_WORK_CREDENTIAL_REQUEST_UPSTREAM_GLOBAL_LIMIT_PER_MINUTE_RAW,
    "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_UPSTREAM_GLOBAL_LIMIT_PER_MINUTE",
    2,
    120,
  );
if (
  AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_MAX_REQUESTS_PER_MINUTE > 0 &&
  AGENT_PAID_WORK_CREDENTIAL_REQUEST_UPSTREAM_GLOBAL_LIMIT_PER_MINUTE > 0 &&
  2 * AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_MAX_REQUESTS_PER_MINUTE >
    AGENT_PAID_WORK_CREDENTIAL_REQUEST_UPSTREAM_GLOBAL_LIMIT_PER_MINUTE
) {
  fail(
    "credential request public applicant rate must reserve capacity for a second applicant",
  );
}
const AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_EDGE_CONFIGURED =
  Boolean(AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_UPSTREAM) &&
  AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_MAX_REQUESTS_PER_MINUTE > 0 &&
  AGENT_PAID_WORK_CREDENTIAL_REQUEST_UPSTREAM_GLOBAL_LIMIT_PER_MINUTE > 0 &&
  2 * AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_MAX_REQUESTS_PER_MINUTE <=
    AGENT_PAID_WORK_CREDENTIAL_REQUEST_UPSTREAM_GLOBAL_LIMIT_PER_MINUTE;

const host =
  process.env.VOID_AI_AGENT_PUBLIC_GATEWAY_HOST || DEFAULT_HOST;

if (host !== DEFAULT_HOST) {
  fail(`gateway host must remain ${DEFAULT_HOST}`);
}

const rawPort =
  process.env.VOID_AI_AGENT_PUBLIC_GATEWAY_PORT ||
  String(DEFAULT_PORT);
const port = Number.parseInt(rawPort, 10);
const proofMode =
  process.env.VOID_AI_AGENT_PUBLIC_GATEWAY_PROOF_MODE === "1";
const proofCancellationSettlementMode = proofMode
  ? String(
      process.env
        .VOID_AI_AGENT_PUBLIC_GATEWAY_PROOF_CANCEL_SETTLEMENT_MODE ||
        "",
    )
  : "";

if (
  !Number.isInteger(port) ||
  port < 0 ||
  port > 65535 ||
  (port === 0 && !proofMode)
) {
  fail(`invalid gateway port: ${rawPort}`);
}

if (
  !["", "never", "reject"].includes(
    proofCancellationSettlementMode,
  )
) {
  fail("invalid gateway proof cancellation settlement mode");
}

for (const [name, value] of [
  [
    "VOID_OPERATOR_WEBHOOK_RECEIVER_MAX_BODY_BYTES",
    OPERATOR_WEBHOOK_RECEIVER_MAX_BODY_BYTES,
  ],
  [
    "VOID_OPERATOR_WEBHOOK_RECEIVER_TIMEOUT_MS",
    OPERATOR_WEBHOOK_RECEIVER_TIMEOUT_MS,
  ],
  [
    "VOID_OPERATOR_WEBHOOK_RECEIVER_MAX_RESPONSE_BYTES",
    OPERATOR_WEBHOOK_RECEIVER_MAX_RESPONSE_BYTES,
  ],
]) {
  if (!Number.isFinite(value) || value < 1) {
    fail(`invalid ${name}`);
  }
}

for (const [name, value] of [
  [
    "VOID_AGENT_PAID_WORK_SUBMISSION_MAX_BODY_BYTES",
    AGENT_PAID_WORK_SUBMISSION_MAX_BODY_BYTES,
  ],
  [
    "VOID_AGENT_PAID_WORK_SUBMISSION_TIMEOUT_MS",
    AGENT_PAID_WORK_SUBMISSION_TIMEOUT_MS,
  ],
  [
    "VOID_AGENT_PAID_WORK_SUBMISSION_MAX_RESPONSE_BYTES",
    AGENT_PAID_WORK_SUBMISSION_MAX_RESPONSE_BYTES,
  ],
]) {
  if (!Number.isFinite(value) || value < 1) {
    fail(`invalid ${name}`);
  }
}

for (const [name, value] of [
  [
    "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_MAX_BODY_BYTES",
    AGENT_PAID_WORK_CREDENTIAL_REQUEST_MAX_BODY_BYTES,
  ],
  [
    "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_TIMEOUT_MS",
    AGENT_PAID_WORK_CREDENTIAL_REQUEST_TIMEOUT_MS,
  ],
  [
    "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_MAX_RESPONSE_BYTES",
    AGENT_PAID_WORK_CREDENTIAL_REQUEST_MAX_RESPONSE_BYTES,
  ],
]) {
  if (!Number.isFinite(value) || value < 1) {
    fail(`invalid ${name}`);
  }
}

const payloads = new Map();

for (const [route, relativePath] of routeFiles.entries()) {
  const absolutePath = path.join(repositoryRoot, relativePath);
  let bytes;

  try {
    bytes = readFileSync(absolutePath);
    JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    fail(
      `cannot load valid JSON for ${route} from ${absolutePath}: ` +
        String(error),
    );
  }

  payloads.set(route, bytes);
}

function commonHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  };
}

function emptyResponse(response, statusCode, extraHeaders = {}) {
  response.writeHead(statusCode, {
    ...commonHeaders(),
    "Content-Length": "0",
    ...extraHeaders,
  });
  response.end();
}

function bodyResponse(
  response,
  statusCode,
  body,
  extraHeaders = {},
  method = "GET",
) {
  const bytes = Buffer.isBuffer(body)
    ? body
    : Buffer.from(String(body ?? ""));

  response.writeHead(statusCode, {
    ...commonHeaders(),
    "Content-Length": String(bytes.length),
    ...extraHeaders,
  });

  if (method === "HEAD") {
    response.end();
    return;
  }

  response.end(bytes);
}

function jsonResponse(
  response,
  statusCode,
  value,
  extraHeaders = {},
  method = "GET",
) {
  bodyResponse(
    response,
    statusCode,
    Buffer.from(JSON.stringify(value) + "\n"),
    {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
    method,
  );
}

function readBoundedRequestBody(request, maximum) {
  return new Promise((resolve, reject) => {
    const declared = Number(request.headers["content-length"] || 0);

    if (Number.isFinite(declared) && declared > maximum) {
      request.resume();
      reject(new Error("request_body_too_large"));
      return;
    }

    const chunks = [];
    let total = 0;
    let tooLarge = false;

    request.on("data", (chunk) => {
      total += chunk.length;

      if (total > maximum) {
        tooLarge = true;
        chunks.length = 0;
        return;
      }

      if (!tooLarge) {
        chunks.push(chunk);
      }
    });

    request.on("end", () => {
      if (tooLarge) {
        reject(new Error("request_body_too_large"));
        return;
      }

      resolve(Buffer.concat(chunks));
    });

    request.on("error", reject);
  });
}

function logBestEffortCancellationError(label, error) {
  process.stderr.write(
    `${MARKER} ${label}_response_cancel_error=${String(error)}\n`,
  );
}

function createOwnedUpstreamAbortContext(timeoutMs) {
  const controller = new AbortController();
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  return {
    controller,
    signal: AbortSignal.any([controller.signal, timeoutSignal]),
  };
}

function proofAdjustedCancellation(cancellation, label) {
  if (!proofCancellationSettlementMode) return cancellation;

  void Promise.resolve(cancellation).catch((error) => {
    logBestEffortCancellationError(label, error);
  });

  if (proofCancellationSettlementMode === "never") {
    return new Promise(() => {});
  }

  return Promise.reject(
    new Error(`${label}_proof_cancel_rejected`),
  );
}

async function settleCancellationBounded(cancellation, label) {
  if (!cancellation || typeof cancellation.then !== "function") {
    return;
  }

  let timeout;
  let timedOut = false;
  try {
    await Promise.race([
      Promise.resolve(
        proofAdjustedCancellation(cancellation, label),
      ).catch((error) => {
        logBestEffortCancellationError(label, error);
      }),
      new Promise((resolve) => {
        timeout = setTimeout(() => {
          timedOut = true;
          resolve();
        }, UPSTREAM_REJECTION_TEARDOWN_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }

  if (timedOut) {
    process.stderr.write(
      `${MARKER} ${label}_response_cancel_timeout=1\n`,
    );
  }
}

async function rejectUpstreamResponseBounded({
  controller,
  body,
  reader,
  label,
}) {
  if (!controller.signal.aborted) {
    controller.abort(
      new Error(`${label}_response_rejected`),
    );
  }

  try {
    const cancellation = reader?.cancel
      ? reader.cancel()
      : body?.cancel
        ? body.cancel()
        : null;
    await settleCancellationBounded(cancellation, label);
  } catch (error) {
    logBestEffortCancellationError(label, error);
  }
}

function parseDeclaredResponseLength(upstreamResponse, label) {
  const raw = upstreamResponse.headers.get("content-length");
  if (raw === null) return null;

  if (!/^(0|[1-9][0-9]*)$/.test(raw)) {
    throw new Error(`${label}_response_invalid_content_length`);
  }

  const declared = Number(raw);
  if (!Number.isSafeInteger(declared) || declared < 0) {
    throw new Error(`${label}_response_invalid_content_length`);
  }

  return declared;
}

async function readBoundedUpstreamResponseBody(
  upstreamResponse,
  maximum,
  label,
  controller,
) {
  let declared;
  try {
    declared = parseDeclaredResponseLength(
      upstreamResponse,
      label,
    );
  } catch (error) {
    await rejectUpstreamResponseBounded({
      controller,
      body: upstreamResponse.body,
      reader: null,
      label,
    });
    throw error;
  }

  if (declared !== null && declared > maximum) {
    const primary = new Error(`${label}_response_too_large`);
    await rejectUpstreamResponseBounded({
      controller,
      body: upstreamResponse.body,
      reader: null,
      label,
    });
    throw primary;
  }

  const body = upstreamResponse.body;
  if (!body) {
    if (declared === null || declared === 0) {
      return Buffer.alloc(0);
    }
    throw new Error(`${label}_response_body_unavailable`);
  }

  if (typeof body.getReader !== "function") {
    const primary = new Error(`${label}_response_body_unavailable`);
    await rejectUpstreamResponseBounded({
      controller,
      body,
      reader: null,
      label,
    });
    throw primary;
  }

  const reader = body.getReader();
  const chunks = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = Buffer.from(value);
      total += chunk.length;

      if (total > maximum) {
        chunks.length = 0;
        throw new Error(`${label}_response_too_large`);
      }

      chunks.push(chunk);
    }
  } catch (error) {
    chunks.length = 0;
    await rejectUpstreamResponseBounded({
      controller,
      body,
      reader,
      label,
    });
    throw error;
  }

  return Buffer.concat(chunks, total);
}

function copyOperatorResponseHeaders(upstreamResponse) {
  const headers = {};

  for (const [key, value] of upstreamResponse.headers.entries()) {
    const lower = key.toLowerCase();

    if (
      [
        "connection",
        "content-length",
        "keep-alive",
        "location",
        "proxy-authenticate",
        "proxy-authorization",
        "set-cookie",
        "te",
        "trailer",
        "transfer-encoding",
        "upgrade",
      ].includes(lower)
    ) {
      continue;
    }

    headers[key] = value;
  }

  headers["Cache-Control"] = "no-store";
  headers["X-Void-Operator-Webhook-Route"] = "v1";
  return headers;
}

async function proxyOperatorWebhookReceiver(request, response, url) {
  if (!OPERATOR_WEBHOOK_RECEIVER_UPSTREAM) {
    jsonResponse(response, 503, {
      ok: false,
      error: "operator_webhook_receiver_unavailable",
    });
    return;
  }

  if (
    url.pathname !== OPERATOR_WEBHOOK_RECEIVER_PATH ||
    url.search ||
    url.hash
  ) {
    jsonResponse(response, 400, {
      ok: false,
      error: "query_not_allowed",
    });
    return;
  }

  const contentType = String(
    request.headers["content-type"] || "",
  ).toLowerCase();

  if (!contentType.startsWith("application/json")) {
    jsonResponse(response, 415, {
      ok: false,
      error: "application_json_required",
    });
    return;
  }

  const authorization = String(
    request.headers.authorization || "",
  ).trim();

  if (!/^Bearer [^\s]{16,8192}$/.test(authorization)) {
    jsonResponse(response, 401, {
      ok: false,
      error: "bearer_authorization_required",
    });
    return;
  }

  let body;

  try {
    body = await readBoundedRequestBody(
      request,
      OPERATOR_WEBHOOK_RECEIVER_MAX_BODY_BYTES,
    );
  } catch (error) {
    if (
      String(error?.message || "") ===
      "request_body_too_large"
    ) {
      jsonResponse(response, 413, {
        ok: false,
        error: "request_body_too_large",
      });
      return;
    }

    throw error;
  }

  const bodySha = crypto
    .createHash("sha256")
    .update(body)
    .digest("hex");
  const declaredSha = String(
    request.headers["x-void-payload-sha256"] || "",
  ).toLowerCase();

  if (!/^[0-9a-f]{64}$/.test(declaredSha)) {
    jsonResponse(response, 400, {
      ok: false,
      error: "payload_sha256_required",
    });
    return;
  }

  if (declaredSha !== bodySha) {
    jsonResponse(response, 400, {
      ok: false,
      error: "payload_sha256_mismatch",
    });
    return;
  }

  try {
    JSON.parse(body.toString("utf8"));
  } catch {
    jsonResponse(response, 400, {
      ok: false,
      error: "invalid_json",
    });
    return;
  }

  const upstreamAbort = createOwnedUpstreamAbortContext(
    OPERATOR_WEBHOOK_RECEIVER_TIMEOUT_MS,
  );
  const upstreamResponse = await fetch(
    `${OPERATOR_WEBHOOK_RECEIVER_UPSTREAM}${OPERATOR_WEBHOOK_RECEIVER_PATH}`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization,
        "content-type": "application/json",
        "content-length": String(body.length),
        "user-agent": "void-ai-agent-public-gateway-v1",
        "x-void-payload-sha256": bodySha,
      },
      body,
      redirect: "manual",
      signal: upstreamAbort.signal,
    },
  );

  const responseBody = await readBoundedUpstreamResponseBody(
    upstreamResponse,
    OPERATOR_WEBHOOK_RECEIVER_MAX_RESPONSE_BYTES,
    "operator_webhook_receiver",
    upstreamAbort.controller,
  );

  bodyResponse(
    response,
    upstreamResponse.status,
    responseBody,
    copyOperatorResponseHeaders(upstreamResponse),
    "POST",
  );
}

function copyPaidWorkSubmissionResponseHeaders(
  upstreamResponse,
) {
  const headers = {};

  for (const [key, value] of upstreamResponse.headers.entries()) {
    const lower = key.toLowerCase();

    if (
      [
        "connection",
        "content-length",
        "keep-alive",
        "location",
        "proxy-authenticate",
        "proxy-authorization",
        "set-cookie",
        "te",
        "trailer",
        "transfer-encoding",
        "upgrade",
      ].includes(lower)
    ) {
      continue;
    }

    headers[key] = value;
  }

  headers["Cache-Control"] = "no-store";
  headers["X-Void-Agent-Paid-Work-Submission-Route"] = "v1";
  return headers;
}

async function proxyAgentPaidWorkSubmission(
  request,
  response,
  url,
) {
  if (!AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM) {
    jsonResponse(response, 503, {
      ok: false,
      error: "agent_paid_work_submission_receiver_unavailable",
    });
    return;
  }

  if (
    url.pathname !== AGENT_PAID_WORK_SUBMISSION_RECEIVER_PATH ||
    url.search ||
    url.hash
  ) {
    jsonResponse(response, 400, {
      ok: false,
      error: "query_not_allowed",
    });
    return;
  }

  const contentType = String(
    request.headers["content-type"] || "",
  ).toLowerCase();

  if (!contentType.startsWith("application/json")) {
    jsonResponse(response, 415, {
      ok: false,
      error: "application_json_required",
    });
    return;
  }

  const authorization = String(
    request.headers.authorization || "",
  ).trim();

  if (!/^Bearer [^\s]{16,8192}$/.test(authorization)) {
    jsonResponse(response, 401, {
      ok: false,
      error: "bearer_authorization_required",
    });
    return;
  }

  let body;

  try {
    body = await readBoundedRequestBody(
      request,
      AGENT_PAID_WORK_SUBMISSION_MAX_BODY_BYTES,
    );
  } catch (error) {
    if (
      String(error?.message || "") ===
      "request_body_too_large"
    ) {
      jsonResponse(response, 413, {
        ok: false,
        error: "request_body_too_large",
      });
      return;
    }

    throw error;
  }

  const bodySha = crypto
    .createHash("sha256")
    .update(body)
    .digest("hex");
  const declaredSha = String(
    request.headers["x-void-payload-sha256"] || "",
  ).toLowerCase();

  if (!/^[0-9a-f]{64}$/.test(declaredSha)) {
    jsonResponse(response, 400, {
      ok: false,
      error: "payload_sha256_required",
    });
    return;
  }

  if (declaredSha !== bodySha) {
    jsonResponse(response, 400, {
      ok: false,
      error: "payload_sha256_mismatch",
    });
    return;
  }

  try {
    JSON.parse(body.toString("utf8"));
  } catch {
    jsonResponse(response, 400, {
      ok: false,
      error: "invalid_json",
    });
    return;
  }

  try {
    const upstreamAbort = createOwnedUpstreamAbortContext(
      AGENT_PAID_WORK_SUBMISSION_TIMEOUT_MS,
    );
    const upstreamResponse = await fetch(
      `${AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM}${AGENT_PAID_WORK_SUBMISSION_RECEIVER_PATH}`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization,
          "content-type": "application/json",
          "content-length": String(body.length),
          "user-agent": "void-ai-agent-public-gateway-v1",
          "x-void-payload-sha256": bodySha,
        },
        body,
        redirect: "manual",
        signal: upstreamAbort.signal,
      },
    );

    const responseBody = await readBoundedUpstreamResponseBody(
      upstreamResponse,
      AGENT_PAID_WORK_SUBMISSION_MAX_RESPONSE_BYTES,
      "agent_paid_work_submission",
      upstreamAbort.controller,
    );

    bodyResponse(
      response,
      upstreamResponse.status,
      responseBody,
      copyPaidWorkSubmissionResponseHeaders(upstreamResponse),
      "POST",
    );
  } catch (error) {
    process.stderr.write(
      `${MARKER} paid_work_submission_upstream_error=${String(error)}\n`,
    );
    jsonResponse(response, 502, {
      ok: false,
      error: "agent_paid_work_submission_receiver_upstream_failed",
    });
  }
}


const paidWorkCredentialApplicantRateWindows = new Map();
const paidWorkCredentialApplicantNonceReplay = new Map();

function prunePaidWorkCredentialApplicantState(nowMs) {
  for (const [key, expiresAtMs] of paidWorkCredentialApplicantNonceReplay) {
    if (expiresAtMs < nowMs) {
      paidWorkCredentialApplicantNonceReplay.delete(key);
    }
  }

  const minimumMs = nowMs - 60_000;
  for (const [applicantId, values] of paidWorkCredentialApplicantRateWindows) {
    const active = values.filter((timestamp) => timestamp > minimumMs);
    if (active.length === 0) {
      paidWorkCredentialApplicantRateWindows.delete(applicantId);
    } else if (active.length !== values.length) {
      paidWorkCredentialApplicantRateWindows.set(applicantId, active);
    }
  }
}

function admitPaidWorkCredentialApplicant(auth, nowMs) {
  prunePaidWorkCredentialApplicantState(nowMs);

  if (paidWorkCredentialApplicantNonceReplay.has(auth.nonce_key)) {
    return Object.freeze({
      ok: false,
      status: 409,
      error: "applicant_auth_replay",
    });
  }
  if (
    paidWorkCredentialApplicantNonceReplay.size >=
    AGENT_PAID_WORK_CREDENTIAL_REQUEST_MAX_TRACKED_NONCES
  ) {
    return Object.freeze({
      ok: false,
      status: 503,
      error: "applicant_auth_replay_capacity",
    });
  }

  paidWorkCredentialApplicantNonceReplay.set(
    auth.nonce_key,
    auth.expires_at_ms,
  );

  const minimumMs = nowMs - 60_000;
  const active = (
    paidWorkCredentialApplicantRateWindows.get(auth.applicant_id) || []
  ).filter((timestamp) => timestamp > minimumMs);

  if (
    active.length >=
    AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_MAX_REQUESTS_PER_MINUTE
  ) {
    paidWorkCredentialApplicantRateWindows.set(auth.applicant_id, active);
    return Object.freeze({
      ok: false,
      status: 429,
      error: "applicant_rate_limit_exceeded",
    });
  }

  if (
    !paidWorkCredentialApplicantRateWindows.has(auth.applicant_id) &&
    paidWorkCredentialApplicantRateWindows.size >=
      AGENT_PAID_WORK_CREDENTIAL_REQUEST_MAX_TRACKED_APPLICANTS
  ) {
    return Object.freeze({
      ok: false,
      status: 503,
      error: "applicant_rate_limit_capacity",
    });
  }

  active.push(nowMs);
  paidWorkCredentialApplicantRateWindows.set(auth.applicant_id, active);
  return Object.freeze({ ok: true });
}

function copyPaidWorkCredentialRequestResponseHeaders(
  upstreamResponse,
) {
  const headers = {};

  for (const [key, value] of upstreamResponse.headers.entries()) {
    const lower = key.toLowerCase();

    if (
      [
        "connection",
        "content-length",
        "keep-alive",
        "location",
        "proxy-authenticate",
        "proxy-authorization",
        "set-cookie",
        "te",
        "trailer",
        "transfer-encoding",
        "upgrade",
      ].includes(lower)
    ) {
      continue;
    }

    headers[key] = value;
  }

  headers["Cache-Control"] = "no-store";
  headers["X-Void-Agent-Paid-Work-Credential-Request-Route"] = "v1";
  return headers;
}

async function proxyAgentPaidWorkCredentialRequest(
  request,
  response,
  url,
) {
  if (!AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_EDGE_CONFIGURED) {
    jsonResponse(response, 503, {
      ok: false,
      error: "agent_paid_work_credential_request_gateway_unavailable",
    });
    return;
  }

  if (
    url.pathname !== AGENT_PAID_WORK_CREDENTIAL_REQUEST_PATH ||
    url.search ||
    url.hash
  ) {
    jsonResponse(response, 400, {
      ok: false,
      error: "query_not_allowed",
    });
    return;
  }

  const contentType = String(
    request.headers["content-type"] || "",
  )
    .split(";", 1)[0]
    .trim()
    .toLowerCase();

  if (contentType !== "application/json") {
    jsonResponse(response, 415, {
      ok: false,
      error: "application_json_required",
    });
    return;
  }

  let body;

  try {
    body = await readBoundedRequestBody(
      request,
      AGENT_PAID_WORK_CREDENTIAL_REQUEST_MAX_BODY_BYTES,
    );
  } catch (error) {
    if (
      String(error?.message || "") ===
      "request_body_too_large"
    ) {
      jsonResponse(response, 413, {
        ok: false,
        error: "request_body_too_large",
      });
      return;
    }

    throw error;
  }

  const bodySha = crypto
    .createHash("sha256")
    .update(body)
    .digest("hex");
  const declaredSha = String(
    request.headers["x-void-payload-sha256"] || "",
  ).toLowerCase();

  if (!/^[0-9a-f]{64}$/.test(declaredSha)) {
    jsonResponse(response, 400, {
      ok: false,
      error: "payload_sha256_required",
    });
    return;
  }

  if (declaredSha !== bodySha) {
    jsonResponse(response, 400, {
      ok: false,
      error: "payload_sha256_mismatch",
    });
    return;
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(body.toString("utf8"));
  } catch {
    jsonResponse(response, 400, {
      ok: false,
      error: "invalid_json",
    });
    return;
  }

  const requestId =
    parsedBody &&
    typeof parsedBody === "object" &&
    !Array.isArray(parsedBody)
      ? String(parsedBody.request_id || "")
      : "";
  const encodedApplicantAuth = String(
    request.headers[
      VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_AUTH_HEADER_V1
    ] || "",
  ).trim();
  const nowMs = Date.now();
  let applicantAuth;

  try {
    applicantAuth =
      verifyAgentPaidWorkCredentialRequestPublicAuthV1({
        encoded_header: encodedApplicantAuth,
        method: "POST",
        path: AGENT_PAID_WORK_CREDENTIAL_REQUEST_PATH,
        body_sha256: bodySha,
        request_id: requestId,
        now_ms: nowMs,
      });
  } catch {
    jsonResponse(response, 401, {
      ok: false,
      error: "applicant_auth_invalid",
    });
    return;
  }

  const applicantAdmission =
    admitPaidWorkCredentialApplicant(
      applicantAuth,
      nowMs,
    );
  if (!applicantAdmission.ok) {
    jsonResponse(
      response,
      applicantAdmission.status,
      {
        ok: false,
        error: applicantAdmission.error,
      },
      applicantAdmission.status === 429
        ? { "Retry-After": "60" }
        : {},
    );
    return;
  }

  try {
    const upstreamAbort = createOwnedUpstreamAbortContext(
      AGENT_PAID_WORK_CREDENTIAL_REQUEST_TIMEOUT_MS,
    );
    const upstreamResponse = await fetch(
      `${AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_UPSTREAM}${AGENT_PAID_WORK_CREDENTIAL_REQUEST_PATH}`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "content-length": String(body.length),
          "user-agent": "void-ai-agent-public-gateway-v1",
          "x-void-payload-sha256": bodySha,
        },
        body,
        redirect: "manual",
        signal: upstreamAbort.signal,
      },
    );

    const responseBody = await readBoundedUpstreamResponseBody(
      upstreamResponse,
      AGENT_PAID_WORK_CREDENTIAL_REQUEST_MAX_RESPONSE_BYTES,
      "agent_paid_work_credential_request",
      upstreamAbort.controller,
    );

    bodyResponse(
      response,
      upstreamResponse.status,
      responseBody,
      copyPaidWorkCredentialRequestResponseHeaders(upstreamResponse),
      "POST",
    );
  } catch (error) {
    process.stderr.write(
      `${MARKER} paid_work_credential_request_upstream_error=${String(error)}\n`,
    );
    jsonResponse(response, 502, {
      ok: false,
      error: "agent_paid_work_credential_request_gateway_upstream_failed",
    });
  }
}

async function handleRequest(request, response) {
  const method = String(request.method || "").toUpperCase();

  let parsed;

  try {
    parsed = new URL(
      request.url || "/",
      "http://127.0.0.1",
    );
  } catch {
    emptyResponse(response, 400);
    return;
  }

  if (
    parsed.pathname ===
    AGENT_PAID_WORK_CREDENTIAL_REQUEST_PATH
  ) {
    if (method === "POST") {
      await proxyAgentPaidWorkCredentialRequest(
        request,
        response,
        parsed,
      );
      return;
    }

    emptyResponse(response, 405, { Allow: "POST" });
    return;
  }

  if (
    parsed.pathname ===
    AGENT_PAID_WORK_SUBMISSION_RECEIVER_PATH
  ) {
    if (method === "POST") {
      await proxyAgentPaidWorkSubmission(
        request,
        response,
        parsed,
      );
      return;
    }

    emptyResponse(response, 405, { Allow: "POST" });
    return;
  }

  if (parsed.pathname === OPERATOR_WEBHOOK_RECEIVER_PATH) {
    if (method === "POST") {
      await proxyOperatorWebhookReceiver(
        request,
        response,
        parsed,
      );
      return;
    }

    emptyResponse(response, 405, { Allow: "POST" });
    return;
  }

  if (method !== "GET" && method !== "HEAD") {
    emptyResponse(response, 405, { Allow: "GET, HEAD" });
    return;
  }

  if (parsed.search || parsed.hash) {
    emptyResponse(response, 404);
    return;
  }

  const bytes = payloads.get(parsed.pathname);

  if (!bytes) {
    emptyResponse(response, 404);
    return;
  }

  bodyResponse(
    response,
    200,
    bytes,
    { "Content-Type": "application/json; charset=utf-8" },
    method,
  );
}

const server = http.createServer((request, response) => {
  void handleRequest(request, response).catch((error) => {
    process.stderr.write(
      `${MARKER} request_error=${String(error)}\n`,
    );

    if (!response.headersSent) {
      jsonResponse(response, 502, {
        ok: false,
        error: "operator_webhook_receiver_upstream_failed",
      });
      return;
    }

    response.destroy();
  });
});

server.requestTimeout = 5_000;
server.headersTimeout = 5_000;
server.keepAliveTimeout = 5_000;
server.maxRequestsPerSocket = 100;

server.on("clientError", (_error, socket) => {
  if (socket.writable) {
    socket.end(
      "HTTP/1.1 400 Bad Request\r\n" +
        "Connection: close\r\n" +
        "Content-Length: 0\r\n\r\n",
    );
  }
});

function shutdown(signal) {
  server.close((error) => {
    if (error) {
      process.stderr.write(
        `${MARKER} shutdown_error=${String(error)}\n`,
      );
      process.exit(1);
    }

    process.stdout.write(
      `${MARKER} stopped signal=${signal}\n`,
    );
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 5_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

server.listen({ host, port, exclusive: true }, () => {
  const address = server.address();

  if (!address || typeof address === "string") {
    fail("unexpected gateway listen address");
  }

  process.stdout.write(
    JSON.stringify({
      marker: MARKER,
      ready: true,
      host: address.address,
      port: address.port,
      repository_root: repositoryRoot,
      allowed_methods: ["GET", "HEAD"],
      allowed_routes: [...routeFiles.keys()],
      mutation_authority: false,
      proxy_authority: false,
      bounded_paid_work_credential_request_proxy_authority:
        AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_EDGE_CONFIGURED,
      paid_work_credential_request_integration_marker:
        AGENT_PAID_WORK_CREDENTIAL_REQUEST_INTEGRATION_MARKER,
      paid_work_credential_request_route: {
        path: AGENT_PAID_WORK_CREDENTIAL_REQUEST_PATH,
        methods: ["POST"],
        configured:
          AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_EDGE_CONFIGURED,
        accepted_for_review_only: true,
        applicant_auth_required: true,
        applicant_identity_scheme: "void-agent:ed25519",
        applicant_auth_header:
          VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_AUTH_HEADER_V1,
        applicant_max_requests_per_minute:
          AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_MAX_REQUESTS_PER_MINUTE ||
          null,
        upstream_global_limit_per_minute:
          AGENT_PAID_WORK_CREDENTIAL_REQUEST_UPSTREAM_GLOBAL_LIMIT_PER_MINUTE ||
          null,
        two_applicant_capacity_reserved:
          AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_EDGE_CONFIGURED,
        nonce_replay_protection: true,
        forwarded_ip_headers_trusted: false,
        credential_request_record_write:
          AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_EDGE_CONFIGURED,
        credential_issuance_authority: false,
        credential_registry_mutation_authority: false,
        wc_award_authority: false,
        wc_ledger_write_authority: false,
        wallet_access: false,
        signing: false,
        transaction_broadcast: false,
        funds_movement: false,
      },
      bounded_paid_work_submission_proxy_authority:
        Boolean(
          AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM,
        ),
      paid_work_submission_integration_marker:
        AGENT_PAID_WORK_SUBMISSION_INTEGRATION_MARKER,
      paid_work_submission_route: {
        path: AGENT_PAID_WORK_SUBMISSION_RECEIVER_PATH,
        methods: ["POST"],
        configured: Boolean(
          AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM,
        ),
        accepted_for_review_only: true,
        provider_selection: false,
        quote_creation: false,
        payment_authority: false,
        work_execution_authority: false,
        work_dispatch: false,
        wc_award_authority: false,
        wc_ledger_write_authority: false,
        wallet_access: false,
        signing: false,
        transaction_broadcast: false,
        buy_void_fulfillment: false,
      },
      bounded_operator_notification_proxy_authority:
        Boolean(OPERATOR_WEBHOOK_RECEIVER_UPSTREAM),
      operator_notification_integration_marker:
        OPERATOR_WEBHOOK_INTEGRATION_MARKER,
      operator_notification_route: {
        path: OPERATOR_WEBHOOK_RECEIVER_PATH,
        methods: ["POST"],
        configured: Boolean(
          OPERATOR_WEBHOOK_RECEIVER_UPSTREAM,
        ),
        generic_mutation: false,
        wallet_access: false,
        signing: false,
        transaction_broadcast: false,
        rpc_mutation: false,
        money_movement: false,
      },
    }) + "\n",
  );
});
