#!/usr/bin/env node
import crypto from "node:crypto";
import http from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = "VOID_AI_AGENT_PUBLIC_GATEWAY_V1";
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 4112;
const OPERATOR_WEBHOOK_INTEGRATION_MARKER =
  "VOID_OPERATOR_WEBHOOK_RECEIVER_AI_GATEWAY_SOURCE_INTEGRATION_V1";
const OPERATOR_WEBHOOK_RECEIVER_UPSTREAM = (
  process.env.VOID_OPERATOR_WEBHOOK_RECEIVER_UPSTREAM || ""
).replace(/\/+$/, "");
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
const AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM = (
  process.env.VOID_AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM || ""
).replace(/\/+$/, "");
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

if (
  !Number.isInteger(port) ||
  port < 0 ||
  port > 65535 ||
  (port === 0 && !proofMode)
) {
  fail(`invalid gateway port: ${rawPort}`);
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
      signal: AbortSignal.timeout(
        OPERATOR_WEBHOOK_RECEIVER_TIMEOUT_MS,
      ),
    },
  );

  const responseBody = Buffer.from(
    await upstreamResponse.arrayBuffer(),
  );

  if (
    responseBody.length >
    OPERATOR_WEBHOOK_RECEIVER_MAX_RESPONSE_BYTES
  ) {
    throw new Error("operator_webhook_receiver_response_too_large");
  }

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
        signal: AbortSignal.timeout(
          AGENT_PAID_WORK_SUBMISSION_TIMEOUT_MS,
        ),
      },
    );

    const responseBody = Buffer.from(
      await upstreamResponse.arrayBuffer(),
    );

    if (
      responseBody.length >
      AGENT_PAID_WORK_SUBMISSION_MAX_RESPONSE_BYTES
    ) {
      throw new Error(
        "agent_paid_work_submission_response_too_large",
      );
    }

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
