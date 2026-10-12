#!/usr/bin/env node

import http from "node:http";
import {
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { extname, join, resolve, sep } from "node:path";
import {
  VOID_TOR_DESCRIPTOR_PATHS,
  VOID_TOR_ONION_TRANSPORT_MARKER,
  buildVoidTorDescriptorV1,
} from "./lib/void-tor-onion-descriptor-v1.mjs";
import {
  VOID_NODE_ONION_BINDING_MARKER,
  VOID_NODE_ONION_BINDING_PATHS,
  readAndVerifyVoidNodeOnionBindingV1,
} from "./lib/void-node-onion-binding-v1.mjs";
import {
  handleOrderStatusReadonlyRequest,
} from "./void-public-agent-service-order-status-readonly-request-handler-v1.mjs";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1"]);
const MAX_URL_LENGTH = 2048;
const VOID_TOR_AGENT_MCP_READONLY_MARKER = "VOID_TOR_AGENT_MCP_READONLY_V1";
const VOID_TOR_STATIC_TRANSPORT_COMPATIBILITY_MARKER = "VOID_TOR_STATIC_TRANSPORT_COMPATIBILITY_V1";
const VOID_TOR_AGENT_MCP_DESCRIPTOR_PATHS = Object.freeze([
  "/.well-known/void-agent-mcp-onion-v1.json",
  "/public-node/agents/mcp-tor-v1.json",
]);
const MCP_PUBLIC_PATH = "/mcp";
const MCP_UPSTREAM_HOST = "127.0.0.1";
const MCP_UPSTREAM_PATH = "/mcp";
const MCP_ALLOWED_METHODS = new Set(["GET", "POST", "DELETE"]);
const MCP_CREDENTIAL_HEADERS = Object.freeze([
  "authorization",
  "proxy-authorization",
  "cookie",
]);
const MCP_REQUEST_HEADER_ALLOWLIST = Object.freeze([
  "accept",
  "content-type",
  "mcp-session-id",
  "last-event-id",
  "mcp-protocol-version",
]);
const MCP_RESPONSE_HEADER_ALLOWLIST = Object.freeze([
  "allow",
  "cache-control",
  "content-type",
  "mcp-session-id",
  "retry-after",
]);
const VOID_TOR_ORDER_STATUS_READONLY_MARKER =
  "VOID_TOR_ORDER_STATUS_READONLY_V1";
const VOID_TOR_ORDER_STATUS_DESCRIPTOR_PATHS = Object.freeze([
  "/.well-known/void-order-status-onion-v1.json",
  "/public-node/agents/order-status-tor-v1.json",
]);
const ORDER_STATUS_PATH_TEMPLATE =
  "/public-agent/services/v1/orders/:submission_id/status.json";
const ORDER_STATUS_ROUTE_PATTERN =
  /^\/public-agent\/services\/v1\/orders\/[A-Za-z0-9][A-Za-z0-9._-]{0,127}\/status\.json$/;
const ORDER_STATUS_ALLOWED_METHODS = new Set(["GET"]);

function fail(message) {
  console.error("VOID_TOR_ONION_PUBLIC_NODE_V1_FAIL");
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const options = {
    host: process.env.VOID_TOR_PUBLIC_NODE_BIND || "127.0.0.1",
    port: Number(process.env.VOID_TOR_PUBLIC_NODE_PORT || "18088"),
    hostnameFile: process.env.VOID_TOR_HOSTNAME_FILE || "",
    virtualPort: Number(process.env.VOID_TOR_VIRTUAL_PORT || "80"),
    bindingFile: process.env.VOID_NODE_ONION_BINDING_FILE || "",
    mcpUpstreamPort: Number(process.env.VOID_TOR_MCP_UPSTREAM_PORT || "4114"),
    mcpTimeoutMs: Number(process.env.VOID_TOR_MCP_TIMEOUT_MS || "30000"),
    mcpMaxRequestBytes: Number(process.env.VOID_TOR_MCP_MAX_REQUEST_BYTES || "65536"),
    mcpMaxResponseBytes: Number(process.env.VOID_TOR_MCP_MAX_RESPONSE_BYTES || "4194304"),
    mcpMaxConcurrentRequests: Number(
      process.env.VOID_TOR_MCP_MAX_CONCURRENT_REQUESTS || "8",
    ),
    orderStatusRoot: process.env.VOID_TOR_ORDER_STATUS_ROOT || "",
    orderStatusMaxBytes: Number(
      process.env.VOID_TOR_ORDER_STATUS_MAX_BYTES || "1048576",
    ),
    orderStatusMaxConcurrentRequests: Number(
      process.env.VOID_TOR_ORDER_STATUS_MAX_CONCURRENT_REQUESTS || "8",
    ),
    checkOnly: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`missing value for ${argument}`);
      return argv[index];
    };
    if (argument === "--host" || argument === "--bind") options.host = next();
    else if (argument === "--port") options.port = Number(next());
    else if (argument === "--hostname-file") options.hostnameFile = next();
    else if (argument === "--virtual-port") options.virtualPort = Number(next());
    else if (argument === "--binding-file") options.bindingFile = next();
    else if (argument === "--mcp-upstream-port") options.mcpUpstreamPort = Number(next());
    else if (argument === "--mcp-timeout-ms") options.mcpTimeoutMs = Number(next());
    else if (argument === "--mcp-max-request-bytes") options.mcpMaxRequestBytes = Number(next());
    else if (argument === "--mcp-max-response-bytes") options.mcpMaxResponseBytes = Number(next());
    else if (argument === "--mcp-max-concurrent-requests") {
      options.mcpMaxConcurrentRequests = Number(next());
    }
    else if (argument === "--order-status-root") options.orderStatusRoot = next();
    else if (argument === "--order-status-max-bytes") {
      options.orderStatusMaxBytes = Number(next());
    }
    else if (argument === "--order-status-max-concurrent-requests") {
      options.orderStatusMaxConcurrentRequests = Number(next());
    }
    else if (argument === "--check") options.checkOnly = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else throw new Error(`unknown argument: ${argument}`);
  }
  return options;
}

function usage() {
  console.log(`Usage:
  node tools/void-tor-onion-public-node-v1.mjs \\
    [--host 127.0.0.1] [--port 18088] \\
    [--hostname-file PATH] [--virtual-port 80] \
    [--binding-file PATH] \
    [--mcp-upstream-port 4114] [--mcp-timeout-ms 30000] \
    [--mcp-max-request-bytes 65536] \
    [--mcp-max-response-bytes 4194304] \
    [--mcp-max-concurrent-requests 8] \
    [--order-status-root PATH] [--order-status-max-bytes 1048576] \
    [--order-status-max-concurrent-requests 8] [--check]

This server is loopback-only. Static and discovery surfaces remain GET/HEAD-only.
The exact /mcp path may bridge GET/POST/DELETE to the fixed read-only MCP
upstream at 127.0.0.1.`);
}

function assertPort(value, label, allowZero = false) {
  if (!Number.isInteger(value) || value < (allowZero ? 0 : 1) || value > 65535) {
    throw new Error(`${label} must be ${allowZero ? "zero or " : ""}an integer from 1 through 65535`);
  }
}

function assertBoundedInteger(value, label, minimum, maximum) {
  if (
    !Number.isInteger(value)
    || value < minimum
    || value > maximum
  ) {
    throw new Error(`${label} must be an integer from ${minimum} through ${maximum}`);
  }
}

function contentType(path) {
  const extension = extname(path).toLowerCase();
  if (extension === ".html") return "text/html; charset=utf-8";
  if (extension === ".json") return "application/json; charset=utf-8";
  if (extension === ".txt") return "text/plain; charset=utf-8";
  if (extension === ".md") return "text/markdown; charset=utf-8";
  if (extension === ".css") return "text/css; charset=utf-8";
  if (extension === ".js" || extension === ".mjs") return "text/javascript; charset=utf-8";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".svg") return "image/svg+xml";
  if (extension === ".ico") return "image/x-icon";
  return "application/octet-stream";
}

function standardHeaders(extra = {}) {
  return {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "x-frame-options": "DENY",
    ...extra,
  };
}

function send(res, status, bodyValue, method, type = "text/plain; charset=utf-8") {
  const body = Buffer.isBuffer(bodyValue) ? bodyValue : Buffer.from(String(bodyValue), "utf8");
  res.sendDate = false;
  res.writeHead(
    status,
    standardHeaders({
      "content-type": type,
      "content-length": String(body.length),
    }),
  );
  if (method === "HEAD") res.end();
  else res.end(body);
}

function singleHeader(value) {
  return Array.isArray(value) ? value[0] : value;
}

function strictRequestPath(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || "/"), "http://localhost");
  } catch {
    return { error: 400 };
  }
  if (parsed.search || parsed.hash) return { error: 404 };
  return { path: parsed.pathname };
}

function jsonRpcFailure(message) {
  return {
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message,
    },
    id: null,
  };
}

function sendMcpFailure(res, status, message, method, extraHeaders = {}) {
  const body = `${JSON.stringify(jsonRpcFailure(message))}\n`;
  res.sendDate = false;
  res.writeHead(
    status,
    standardHeaders({
      "content-type": "application/json; charset=utf-8",
      "content-length": String(Buffer.byteLength(body)),
      ...extraHeaders,
    }),
  );
  if (method === "HEAD") res.end();
  else res.end(body);
}

function onionAuthority(hostname, virtualPort) {
  return virtualPort === 80 ? hostname : `${hostname}:${virtualPort}`;
}

function allowedOnionHost(request, options, hostname, listeningPort) {
  const actual = String(singleHeader(request.headers.host) || "").trim().toLowerCase();
  const onion = onionAuthority(hostname, options.virtualPort).toLowerCase();
  const onionWithDefaultPort = options.virtualPort === 80
    ? `${hostname}:80`.toLowerCase()
    : onion;
  const local = `${options.host === "::1" ? "[::1]" : options.host}:${listeningPort}`.toLowerCase();
  const localhost = `localhost:${listeningPort}`;
  return new Set([onion, onionWithDefaultPort, local, localhost]).has(actual);
}

function assertAnonymousOnionRequest(request) {
  for (const name of MCP_CREDENTIAL_HEADERS) {
    if (request.headers[name] !== undefined) {
      throw Object.assign(new Error("Credential headers are forbidden on the read-only onion agent surface"), {
        status: 400,
      });
    }
  }
  if (request.headers.origin !== undefined) {
    throw Object.assign(new Error("Origin-bearing browser requests are forbidden on the onion agent surface"), {
      status: 403,
    });
  }
}

function requireMcpJsonContentType(request) {
  const raw = singleHeader(request.headers["content-type"]);
  if (raw === undefined) {
    throw Object.assign(new Error("Content-Type must be application/json"), {
      status: 415,
    });
  }
  const mediaType = raw.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") {
    throw Object.assign(new Error("Content-Type must be application/json"), {
      status: 415,
    });
  }
  const encoding = singleHeader(request.headers["content-encoding"]);
  if (
    encoding !== undefined
    && encoding.trim().toLowerCase() !== "identity"
  ) {
    throw Object.assign(new Error("Content-Encoding is not supported"), {
      status: 415,
    });
  }
}

async function readMcpBody(request, maximumBytes) {
  requireMcpJsonContentType(request);
  const contentLength = singleHeader(request.headers["content-length"]);
  if (contentLength !== undefined) {
    if (!/^\d+$/.test(contentLength)) {
      throw Object.assign(new Error("Content-Length is invalid"), {
        status: 400,
      });
    }
    const length = Number(contentLength);
    if (!Number.isSafeInteger(length)) {
      throw Object.assign(new Error("Content-Length is invalid"), {
        status: 400,
      });
    }
    if (length > maximumBytes) {
      request.resume();
      throw Object.assign(new Error("MCP request body is too large"), {
        status: 413,
      });
    }
  }

  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk);
    total += buffer.byteLength;
    if (total > maximumBytes) {
      request.resume();
      throw Object.assign(new Error("MCP request body is too large"), {
        status: 413,
      });
    }
    chunks.push(buffer);
  }
  if (total === 0) {
    throw Object.assign(new Error("MCP request body is required"), {
      status: 400,
    });
  }

  const body = Buffer.concat(chunks, total);
  try {
    JSON.parse(body.toString("utf8"));
  } catch {
    throw Object.assign(new Error("MCP request body must be valid JSON"), {
      status: 400,
    });
  }
  return body;
}

function assertNoMcpBody(request) {
  const contentLength = singleHeader(request.headers["content-length"]);
  if (
    (contentLength !== undefined && contentLength !== "0")
    || request.headers["transfer-encoding"] !== undefined
  ) {
    request.resume();
    throw Object.assign(new Error("Request body is not allowed for this MCP method"), {
      status: 400,
    });
  }
}

function mcpRequestHeaders(request, body, options) {
  const headers = {
    host: `${MCP_UPSTREAM_HOST}:${options.mcpUpstreamPort}`,
    connection: "close",
    "user-agent": "void-tor-mcp-onion-bridge-v1",
  };
  for (const name of MCP_REQUEST_HEADER_ALLOWLIST) {
    const value = singleHeader(request.headers[name]);
    if (value !== undefined) headers[name] = value;
  }
  if (body !== null) {
    headers["content-length"] = String(body.byteLength);
  } else {
    delete headers["content-type"];
  }
  return headers;
}

function mcpResponseHeaders(upstreamHeaders) {
  const headers = standardHeaders();
  for (const name of MCP_RESPONSE_HEADER_ALLOWLIST) {
    const value = singleHeader(upstreamHeaders[name]);
    if (value !== undefined) headers[name] = value;
  }
  return headers;
}

function orderStatusRootState(options) {
  if (!options.orderStatusRoot) {
    return { state: "absent", root: "", reason: "order-status-root-not-configured" };
  }
  try {
    const lexical = resolve(options.orderStatusRoot);
    if (!existsSync(lexical)) {
      return { state: "invalid", root: "", reason: "order-status-root-missing" };
    }
    const stat = lstatSync(lexical);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      return {
        state: "invalid",
        root: "",
        reason: "order-status-root-must-be-real-directory",
      };
    }
    return { state: "valid", root: realpathSync(lexical), reason: null };
  } catch {
    return { state: "invalid", root: "", reason: "order-status-root-invalid" };
  }
}

function mcpDescriptorResponse(options, listeningPort) {
  const transport = descriptorResponse(options, listeningPort);
  if (transport.status !== 200) return transport;
  if (
    transport.value.identity?.signed_void_node_binding !== true
    || transport.value.identity?.canonical_void_node_identity !== true
  ) {
    return {
      status: 503,
      value: {
        marker: VOID_TOR_AGENT_MCP_READONLY_MARKER,
        version: 1,
        status: "unavailable",
        reason: "signed-node-binding-required",
      },
    };
  }

  const authority = onionAuthority(
    transport.value.transport.onion_hostname,
    options.virtualPort,
  );
  return {
    status: 200,
    value: {
      marker: VOID_TOR_AGENT_MCP_READONLY_MARKER,
      version: 1,
      status: "active",
      generated_at: transport.value.generated_at,
      transport: {
        protocol: "mcp-streamable-http-over-tor-v3",
        uri: `http://${authority}${MCP_PUBLIC_PATH}`,
        onion_hostname: transport.value.transport.onion_hostname,
        virtual_port: options.virtualPort,
        path: MCP_PUBLIC_PATH,
        descriptor_paths: [...VOID_TOR_AGENT_MCP_DESCRIPTOR_PATHS],
      },
      protocol: {
        name: "mcp-streamable-http",
        supported_versions: ["2025-11-25", "2026-07-28"],
        methods: [...MCP_ALLOWED_METHODS],
        anonymous: true,
      },
      identity: structuredClone(transport.value.identity),
      authority: {
        read_only: true,
        paid_work_submission: false,
        buy_void_fulfillment: false,
        work_credit_write: false,
        datanet_write: false,
        wallet_or_signer_access: false,
        node_runtime_mutation: false,
        operator_control: false,
      },
      security: {
        exact_path_allowlist: true,
        fixed_loopback_upstream: true,
        generic_proxy: false,
        credential_headers_accepted: false,
        browser_origin_requests_accepted: false,
        bounded_request_bytes: options.mcpMaxRequestBytes,
        bounded_response_bytes: options.mcpMaxResponseBytes,
        maximum_concurrent_requests: options.mcpMaxConcurrentRequests,
        upstream_timeout_ms: options.mcpTimeoutMs,
      },
      discovery: {
        tor_transport_descriptor_paths: [...VOID_TOR_DESCRIPTOR_PATHS],
        signed_node_binding_paths: [...VOID_NODE_ONION_BINDING_PATHS],
      },
    },
  };
}

function orderStatusDescriptorResponse(options, listeningPort) {
  const transport = descriptorResponse(options, listeningPort);
  if (transport.status !== 200) return transport;
  if (
    transport.value.identity?.signed_void_node_binding !== true
    || transport.value.identity?.canonical_void_node_identity !== true
  ) {
    return {
      status: 503,
      value: {
        marker: VOID_TOR_ORDER_STATUS_READONLY_MARKER,
        version: 1,
        status: "unavailable",
        reason: "signed-node-binding-required",
      },
    };
  }
  const rootState = orderStatusRootState(options);
  if (rootState.state !== "valid") {
    return {
      status: 503,
      value: {
        marker: VOID_TOR_ORDER_STATUS_READONLY_MARKER,
        version: 1,
        status: "unavailable",
        reason: rootState.reason,
      },
    };
  }
  const authority = onionAuthority(
    transport.value.transport.onion_hostname,
    options.virtualPort,
  );
  return {
    status: 200,
    value: {
      marker: VOID_TOR_ORDER_STATUS_READONLY_MARKER,
      version: 1,
      status: "active",
      generated_at: transport.value.generated_at,
      transport: {
        protocol: "void-order-status-readonly-over-tor-v3",
        uri_template: `http://${authority}${ORDER_STATUS_PATH_TEMPLATE}`,
        onion_hostname: transport.value.transport.onion_hostname,
        virtual_port: options.virtualPort,
        path_template: ORDER_STATUS_PATH_TEMPLATE,
        descriptor_paths: [...VOID_TOR_ORDER_STATUS_DESCRIPTOR_PATHS],
      },
      protocol: {
        name: "void-public-agent-order-status-readonly-v1",
        methods: [...ORDER_STATUS_ALLOWED_METHODS],
        anonymous: true,
      },
      identity: structuredClone(transport.value.identity),
      authority: {
        read_only: true,
        authenticated_submission_post: false,
        payment_authorization: false,
        payment_execution: false,
        quote_acceptance: false,
        work_dispatch: false,
        work_credit_write: false,
        wallet_or_signer_access: false,
        node_runtime_mutation: false,
        operator_control: false,
      },
      security: {
        exact_path_template: true,
        local_bounded_handler: true,
        generic_proxy: false,
        caller_selected_upstream: false,
        credential_headers_accepted: false,
        browser_origin_requests_accepted: false,
        bounded_source_bytes: options.orderStatusMaxBytes,
        maximum_concurrent_requests: options.orderStatusMaxConcurrentRequests,
      },
      discovery: {
        tor_transport_descriptor_paths: [...VOID_TOR_DESCRIPTOR_PATHS],
        signed_node_binding_paths: [...VOID_NODE_ONION_BINDING_PATHS],
      },
    },
  };
}

function attachAgentSurfacesToTorDescriptor(result, options, listeningPort) {
  if (result.status !== 200) return result;
  const authority = onionAuthority(
    result.value.transport.onion_hostname,
    options.virtualPort,
  );
  return {
    ...result,
    value: {
      ...result.value,
      agent_surfaces: {
        mcp_readonly_v1: {
          marker: VOID_TOR_AGENT_MCP_READONLY_MARKER,
          status: result.value.identity?.signed_void_node_binding === true
            ? "active"
            : "unavailable",
          uri: `http://${authority}${MCP_PUBLIC_PATH}`,
          descriptor_paths: [...VOID_TOR_AGENT_MCP_DESCRIPTOR_PATHS],
          methods: [...MCP_ALLOWED_METHODS],
          application_authority: "read_only",
        },
        order_status_readonly_v1: (() => {
          const descriptor = orderStatusDescriptorResponse(options, listeningPort);
          return {
            marker: VOID_TOR_ORDER_STATUS_READONLY_MARKER,
            status: descriptor.status === 200 ? "active" : "unavailable",
            reason: descriptor.status === 200
              ? null
              : descriptor.value?.reason || "unavailable",
            uri_template: `http://${authority}${ORDER_STATUS_PATH_TEMPLATE}`,
            descriptor_paths: [...VOID_TOR_ORDER_STATUS_DESCRIPTOR_PATHS],
            methods: [...ORDER_STATUS_ALLOWED_METHODS],
            application_authority: "read_only",
          };
        })(),
      },
    },
  };
}

function sendOrderStatusFailure(response, status, reason, method) {
  send(
    response,
    status,
    `${JSON.stringify({
      marker: VOID_TOR_ORDER_STATUS_READONLY_MARKER,
      version: 1,
      status: "unavailable",
      reason,
    }, null, 2)}\n`,
    method,
    "application/json; charset=utf-8",
  );
}

async function serveOrderStatusRequest(
  request,
  response,
  options,
  hostname,
  listeningPort,
  rawPath,
) {
  const method = String(request.method || "").toUpperCase();
  if (!ORDER_STATUS_ALLOWED_METHODS.has(method)) {
    request.resume();
    sendOrderStatusFailure(response, 405, "method-not-allowed", method);
    return;
  }
  if (!allowedOnionHost(request, options, hostname, listeningPort)) {
    request.resume();
    sendOrderStatusFailure(response, 403, "host-header-not-allowed", method);
    return;
  }
  try {
    assertAnonymousOnionRequest(request);
    assertNoMcpBody(request);
  } catch (error) {
    sendOrderStatusFailure(
      response,
      Number(error?.status || 400),
      "request-refused",
      method,
    );
    return;
  }
  const binding = bindingResponse(options, hostname);
  if (binding.state !== "valid") {
    request.resume();
    sendOrderStatusFailure(response, 503, "signed-node-binding-required", method);
    return;
  }
  const rootState = orderStatusRootState(options);
  if (rootState.state !== "valid") {
    request.resume();
    sendOrderStatusFailure(response, 503, rootState.reason, method);
    return;
  }
  try {
    const handled = await handleOrderStatusReadonlyRequest({
      root: rootState.root,
      method: "GET",
      requestPath: rawPath,
      handledAtUtc: new Date().toISOString(),
      maxBytes: options.orderStatusMaxBytes,
    });
    const routeResponse = handled?.response;
    const status = Number(routeResponse?.http?.status_code || 500);
    if (
      !Number.isInteger(status)
      || status < 100
      || status > 599
      || !routeResponse
      || typeof routeResponse !== "object"
    ) {
      throw new Error("order-status handler response is invalid");
    }
    send(
      response,
      status,
      `${JSON.stringify(routeResponse, null, 2)}\n`,
      method,
      "application/json; charset=utf-8",
    );
  } catch {
    sendOrderStatusFailure(response, 503, "order-status-handler-failed", method);
  }
}

async function proxyMcpRequest(
  request,
  response,
  options,
  hostname,
  listeningPort,
) {
  const method = String(request.method || "").toUpperCase();
  if (!MCP_ALLOWED_METHODS.has(method)) {
    request.resume();
    sendMcpFailure(
      response,
      405,
      "Method not allowed",
      method,
      { allow: [...MCP_ALLOWED_METHODS].join(", ") },
    );
    return;
  }
  if (!allowedOnionHost(request, options, hostname, listeningPort)) {
    request.resume();
    sendMcpFailure(response, 403, "Host header is not allowed", method);
    return;
  }

  try {
    assertAnonymousOnionRequest(request);
  } catch (error) {
    request.resume();
    sendMcpFailure(
      response,
      Number(error?.status || 400),
      error instanceof Error ? error.message : String(error),
      method,
    );
    return;
  }

  const binding = bindingResponse(options, hostname);
  if (binding.state !== "valid") {
    request.resume();
    sendMcpFailure(
      response,
      503,
      "Signed node-to-onion binding is unavailable",
      method,
    );
    return;
  }

  let body = null;
  try {
    if (method === "POST") {
      body = await readMcpBody(
        request,
        options.mcpMaxRequestBytes,
      );
    } else {
      assertNoMcpBody(request);
    }
  } catch (error) {
    sendMcpFailure(
      response,
      Number(error?.status || 400),
      error instanceof Error ? error.message : String(error),
      method,
    );
    return;
  }

  await new Promise((resolveProxy) => {
    let completed = false;
    let timedOut = false;
    const finish = () => {
      if (completed) return;
      completed = true;
      resolveProxy();
    };

    const upstreamRequest = http.request(
      {
        hostname: MCP_UPSTREAM_HOST,
        port: options.mcpUpstreamPort,
        path: MCP_UPSTREAM_PATH,
        method,
        headers: mcpRequestHeaders(request, body, options),
      },
      (upstreamResponse) => {
        const status = upstreamResponse.statusCode || 502;
        const headers = mcpResponseHeaders(upstreamResponse.headers);
        const mediaType = String(
          singleHeader(upstreamResponse.headers["content-type"]) || "",
        ).split(";", 1)[0].trim().toLowerCase();
        const eventStream = mediaType === "text/event-stream";

        if (eventStream) {
          response.sendDate = false;
          response.writeHead(status, headers);
          let total = 0;
          upstreamResponse.on("data", (chunk) => {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            total += buffer.byteLength;
            if (total > options.mcpMaxResponseBytes) {
              upstreamResponse.destroy();
              response.destroy();
              finish();
              return;
            }
            if (!response.destroyed) response.write(buffer);
          });
          upstreamResponse.once("end", () => {
            if (!response.destroyed) response.end();
            finish();
          });
          upstreamResponse.once("error", () => {
            if (!response.destroyed) response.destroy();
            finish();
          });
          response.once("close", () => {
            upstreamResponse.destroy();
            finish();
          });
          return;
        }

        const chunks = [];
        let total = 0;
        let oversized = false;
        upstreamResponse.on("data", (chunk) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          total += buffer.byteLength;
          if (total > options.mcpMaxResponseBytes) {
            oversized = true;
            upstreamResponse.destroy();
            return;
          }
          chunks.push(buffer);
        });
        upstreamResponse.once("end", () => {
          if (oversized) {
            sendMcpFailure(
              response,
              502,
              "MCP upstream response is too large",
              method,
            );
            finish();
            return;
          }
          const responseBody = Buffer.concat(chunks, total);
          response.sendDate = false;
          response.writeHead(
            status,
            {
              ...headers,
              "content-length": String(responseBody.byteLength),
            },
          );
          response.end(responseBody);
          finish();
        });
        upstreamResponse.once("error", () => {
          if (!response.headersSent) {
            sendMcpFailure(
              response,
              oversized ? 502 : 502,
              oversized
                ? "MCP upstream response is too large"
                : "MCP upstream response failed",
              method,
            );
          } else if (!response.destroyed) {
            response.destroy();
          }
          finish();
        });
      },
    );

    upstreamRequest.setTimeout(options.mcpTimeoutMs, () => {
      timedOut = true;
      upstreamRequest.destroy(
        new Error("MCP upstream timeout"),
      );
    });
    upstreamRequest.once("error", () => {
      if (!response.headersSent) {
        sendMcpFailure(
          response,
          timedOut ? 504 : 502,
          timedOut
            ? "MCP upstream timed out"
            : "MCP upstream is unavailable",
          method,
        );
      } else if (!response.destroyed) {
        response.destroy();
      }
      finish();
    });
    request.once("aborted", () => {
      upstreamRequest.destroy();
      finish();
    });

    if (body !== null) upstreamRequest.write(body);
    upstreamRequest.end();
  });
}

function safeResolveStatic(root, realRoot, rawUrl) {
  const rawPath = String(rawUrl || "/").split("?", 1)[0] || "/";
  if (rawPath.length > MAX_URL_LENGTH) return { error: 414 };

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    return { error: 400 };
  }

  if (decodedPath.includes("\0") || decodedPath.includes("\\")) return { error: 403 };
  const segments = decodedPath.split("/");
  if (segments.some((segment) => segment === "." || segment === "..")) {
    return { error: 403 };
  }

  const candidate = resolve(root, `.${decodedPath.startsWith("/") ? decodedPath : `/${decodedPath}`}`);
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) return { error: 403 };

  let file = candidate;
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file) || !statSync(file).isFile()) return { error: 404 };

  const realFile = realpathSync(file);
  if (realFile !== realRoot && !realFile.startsWith(`${realRoot}${sep}`)) return { error: 403 };
  return { file: realFile };
}

function handleSynchronousPublicRequest({
  request,
  response,
  options,
  listeningPort,
  root,
  realRoot,
}) {
  const method = String(request.method || "").toUpperCase();
  const parsedPath = strictRequestPath(request.url || "/");
  if (parsedPath.error) {
    request.resume();
    send(
      response,
      parsedPath.error,
      parsedPath.error === 400 ? "bad request\n" : "not found\n",
      method,
    );
    return true;
  }
  const rawPath = parsedPath.path;

  if (
    rawPath === MCP_PUBLIC_PATH
    || VOID_TOR_ORDER_STATUS_DESCRIPTOR_PATHS.includes(rawPath)
    || ORDER_STATUS_ROUTE_PATTERN.test(rawPath)
  ) {
    return false;
  }

  if (!new Set(["GET", "HEAD"]).has(method)) {
    request.resume();
    send(response, 405, "method not allowed\n", method);
    return true;
  }

  if (VOID_TOR_AGENT_MCP_DESCRIPTOR_PATHS.includes(rawPath)) {
    const result = mcpDescriptorResponse(options, listeningPort);
    send(
      response,
      result.status,
      `${JSON.stringify(result.value, null, 2)}\n`,
      method,
      "application/json; charset=utf-8",
    );
    return true;
  }

  if (VOID_TOR_DESCRIPTOR_PATHS.includes(rawPath)) {
    const result = attachAgentSurfacesToTorDescriptor(
      descriptorResponse(options, listeningPort),
      options,
      listeningPort,
    );
    send(
      response,
      result.status,
      `${JSON.stringify(result.value, null, 2)}\n`,
      method,
      "application/json; charset=utf-8",
    );
    return true;
  }

  if (VOID_NODE_ONION_BINDING_PATHS.includes(rawPath)) {
    let result;
    try {
      const hostname = options.hostnameFile && existsSync(options.hostnameFile)
        ? readFileSync(options.hostnameFile, "utf8").trim()
        : "";
      result = bindingResponse(options, hostname);
    } catch {
      result = {
        state: "invalid",
        status: 503,
        value: {
          marker: VOID_NODE_ONION_BINDING_MARKER,
          version: 1,
          status: "unavailable",
          reason: "signed-node-binding-invalid",
        },
      };
    }
    if (result.state === "absent") {
      send(response, 404, "not found\n", method);
    } else {
      send(
        response,
        result.status,
        `${JSON.stringify(result.value, null, 2)}\n`,
        method,
        "application/json; charset=utf-8",
      );
    }
    return true;
  }

  const resolved = safeResolveStatic(root, realRoot, request.url || "/");
  if (resolved.error) {
    const messages = {
      400: "bad request\n",
      403: "forbidden\n",
      404: "not found\n",
      414: "uri too long\n",
    };
    send(response, resolved.error, messages[resolved.error], method);
    return true;
  }

  const body = readFileSync(resolved.file);
  send(response, 200, body, method, contentType(resolved.file));
  return true;
}

function bindingResponse(options, hostname) {
  if (!options.bindingFile || !existsSync(options.bindingFile)) {
    return { state: "absent", status: 404, value: null, summary: null };
  }
  try {
    const verified = readAndVerifyVoidNodeOnionBindingV1(options.bindingFile, {
      expectedOnionHostname: hostname,
      expectedVirtualPort: options.virtualPort,
    });
    return { state: "valid", status: 200, value: verified.binding, summary: verified.summary };
  } catch {
    return {
      state: "invalid",
      status: 503,
      summary: null,
      value: {
        marker: VOID_NODE_ONION_BINDING_MARKER,
        version: 1,
        status: "unavailable",
        reason: "signed-node-binding-invalid",
      },
    };
  }
}

function descriptorResponse(options, listeningPort) {
  if (!options.hostnameFile || !existsSync(options.hostnameFile)) {
    return {
      status: 503,
      value: {
        marker: VOID_TOR_ONION_TRANSPORT_MARKER,
        version: 1,
        status: "unavailable",
        reason: "onion-hostname-not-ready",
      },
    };
  }

  try {
    const hostname = readFileSync(options.hostnameFile, "utf8").trim();
    const generatedAt = statSync(options.hostnameFile).mtime.toISOString();
    const binding = bindingResponse(options, hostname);
    if (binding.state === "invalid") {
      return {
        status: 503,
        value: {
          marker: VOID_TOR_ONION_TRANSPORT_MARKER,
          version: 1,
          status: "unavailable",
          reason: "signed-node-binding-invalid",
        },
      };
    }
    return {
      status: 200,
      value: buildVoidTorDescriptorV1({
        onionHostname: hostname,
        localPort: listeningPort,
        virtualPort: options.virtualPort,
        generatedAt,
        status: "active",
        nodeBinding: binding.summary,
      }),
    };
  } catch {
    return {
      status: 503,
      value: {
        marker: VOID_TOR_ONION_TRANSPORT_MARKER,
        version: 1,
        status: "unavailable",
        reason: "onion-hostname-invalid",
      },
    };
  }
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    process.exit(0);
  }
  if (!LOOPBACK_HOSTS.has(options.host)) {
    throw new Error("bind host must be exactly 127.0.0.1 or ::1");
  }
  assertPort(options.port, "port", true);
  assertPort(options.virtualPort, "virtual_port");
  assertPort(options.mcpUpstreamPort, "mcp_upstream_port");
  assertBoundedInteger(options.mcpTimeoutMs, "mcp_timeout_ms", 100, 60_000);
  assertBoundedInteger(
    options.mcpMaxRequestBytes,
    "mcp_max_request_bytes",
    1,
    1_048_576,
  );
  assertBoundedInteger(
    options.mcpMaxResponseBytes,
    "mcp_max_response_bytes",
    1,
    16_777_216,
  );
  assertBoundedInteger(
    options.mcpMaxConcurrentRequests,
    "mcp_max_concurrent_requests",
    1,
    64,
  );
  assertBoundedInteger(
    options.orderStatusMaxBytes,
    "order_status_max_bytes",
    1,
    1_048_576,
  );
  assertBoundedInteger(
    options.orderStatusMaxConcurrentRequests,
    "order_status_max_concurrent_requests",
    1,
    64,
  );
  const configuredOrderStatusRoot = orderStatusRootState(options);
  if (configuredOrderStatusRoot.state === "invalid") {
    throw new Error(configuredOrderStatusRoot.reason);
  }
  if (configuredOrderStatusRoot.state === "valid") {
    options.orderStatusRoot = configuredOrderStatusRoot.root;
  }
  if (options.port !== 0 && options.port === options.mcpUpstreamPort) {
    throw new Error("public port and MCP upstream port must differ");
  }

  const root = resolve(process.cwd(), "public");
  const publicNodeIndex = resolve(root, "public-node", "index.json");
  if (!existsSync(root)) throw new Error(`public root missing: ${root}`);
  if (!existsSync(publicNodeIndex)) {
    throw new Error(`public-node index missing: ${publicNodeIndex}`);
  }
  JSON.parse(readFileSync(publicNodeIndex, "utf8"));
  const realRoot = realpathSync(root);

  if (options.checkOnly) {
    console.log("VOID_TOR_ONION_PUBLIC_NODE_V1_CHECK_GREEN");
    console.log(`root=${root}`);
    console.log(`bind=${options.host}`);
    console.log("read_only=true");
    console.log(`mcp_path=${MCP_PUBLIC_PATH}`);
    console.log(`mcp_upstream=${MCP_UPSTREAM_HOST}:${options.mcpUpstreamPort}${MCP_UPSTREAM_PATH}`);
    console.log("mcp_application_authority=read_only");
    console.log("mcp_paid_work_submission=false");
    console.log(`static_transport_compatibility=${VOID_TOR_STATIC_TRANSPORT_COMPATIBILITY_MARKER}`);
    console.log(`order_status_path_template=${ORDER_STATUS_PATH_TEMPLATE}`);
    console.log(
      `order_status_root_configured=${orderStatusRootState(options).state === "valid"}`,
    );
    console.log("order_status_application_authority=read_only");
    console.log("order_status_authenticated_submission=false");
    console.log("dangerous_paths_touched=false");
    process.exit(0);
  }

  let listeningPort = options.port;
  let activeMcpRequests = 0;
  let activeOrderStatusRequests = 0;
  const server = http.createServer({ maxHeaderSize: 16 * 1024 }, (req, res) => {
    try {
      const handled = handleSynchronousPublicRequest({
        request: req,
        response: res,
        options,
        listeningPort,
        root,
        realRoot,
      });
      if (handled) return;
    } catch {
      req.resume();
      sendMcpFailure(
        res,
        500,
        "Internal onion gateway error",
        String(req.method || "GET").toUpperCase(),
      );
      return;
    }

    void (async () => {
      const method = String(req.method || "").toUpperCase();
      const parsedPath = strictRequestPath(req.url || "/");
      if (parsedPath.error) {
        req.resume();
        send(res, parsedPath.error, parsedPath.error === 400 ? "bad request\n" : "not found\n", method);
        return;
      }
      const rawPath = parsedPath.path;
      if (VOID_TOR_ORDER_STATUS_DESCRIPTOR_PATHS.includes(rawPath)) {
        if (!new Set(["GET", "HEAD"]).has(method)) {
          req.resume();
          send(res, 405, "method not allowed\n", method);
          return;
        }
        const result = orderStatusDescriptorResponse(options, listeningPort);
        send(
          res,
          result.status,
          `${JSON.stringify(result.value, null, 2)}\n`,
          method,
          "application/json; charset=utf-8",
        );
        return;
      }
      if (VOID_TOR_AGENT_MCP_DESCRIPTOR_PATHS.includes(rawPath)) {
        if (!new Set(["GET", "HEAD"]).has(method)) {
          req.resume();
          send(res, 405, "method not allowed\n", method);
          return;
        }
        const result = mcpDescriptorResponse(options, listeningPort);
        send(
          res,
          result.status,
          `${JSON.stringify(result.value, null, 2)}\n`,
          method,
          "application/json; charset=utf-8",
        );
        return;
      }

      if (rawPath === MCP_PUBLIC_PATH) {
        if (activeMcpRequests >= options.mcpMaxConcurrentRequests) {
          req.resume();
          sendMcpFailure(
            res,
            503,
            "MCP onion bridge concurrency limit reached",
            method,
            { "retry-after": "1" },
          );
          return;
        }

        let hostname = "";
        try {
          hostname = options.hostnameFile && existsSync(options.hostnameFile)
            ? readFileSync(options.hostnameFile, "utf8").trim()
            : "";
        } catch {
          hostname = "";
        }
        if (!hostname) {
          req.resume();
          sendMcpFailure(
            res,
            503,
            "Onion hostname is unavailable",
            method,
          );
          return;
        }

        activeMcpRequests += 1;
        try {
          await proxyMcpRequest(
            req,
            res,
            options,
            hostname,
            listeningPort,
          );
        } finally {
          activeMcpRequests -= 1;
        }
        return;
      }
      if (ORDER_STATUS_ROUTE_PATTERN.test(rawPath)) {
        if (activeOrderStatusRequests >= options.orderStatusMaxConcurrentRequests) {
          req.resume();
          sendOrderStatusFailure(
            res,
            503,
            "order-status-concurrency-limit-reached",
            method,
          );
          return;
        }
        let hostname = "";
        try {
          hostname = options.hostnameFile && existsSync(options.hostnameFile)
            ? readFileSync(options.hostnameFile, "utf8").trim()
            : "";
        } catch {
          hostname = "";
        }
        if (!hostname) {
          req.resume();
          sendOrderStatusFailure(res, 503, "onion-hostname-unavailable", method);
          return;
        }
        activeOrderStatusRequests += 1;
        try {
          await serveOrderStatusRequest(
            req,
            res,
            options,
            hostname,
            listeningPort,
            rawPath,
          );
        } finally {
          activeOrderStatusRequests -= 1;
        }
        return;
      }

      if (!new Set(["GET", "HEAD"]).has(method)) {
        req.resume();
        send(res, 405, "method not allowed\n", method);
        return;
      }

      if (VOID_TOR_DESCRIPTOR_PATHS.includes(rawPath)) {
        const result = attachAgentSurfacesToTorDescriptor(
          descriptorResponse(options, listeningPort),
          options,
          listeningPort,
        );
        send(
          res,
          result.status,
          `${JSON.stringify(result.value, null, 2)}\n`,
          method,
          "application/json; charset=utf-8",
        );
        return;
      }

      if (VOID_NODE_ONION_BINDING_PATHS.includes(rawPath)) {
        let result;
        try {
          const hostname = options.hostnameFile && existsSync(options.hostnameFile)
            ? readFileSync(options.hostnameFile, "utf8").trim()
            : "";
          result = bindingResponse(options, hostname);
        } catch {
          result = { state: "invalid", status: 503, value: { marker: VOID_NODE_ONION_BINDING_MARKER, version: 1, status: "unavailable", reason: "signed-node-binding-invalid" } };
        }
        if (result.state === "absent") {
          send(res, 404, "not found\n", method);
        } else {
          send(res, result.status, `${JSON.stringify(result.value, null, 2)}\n`, method, "application/json; charset=utf-8");
        }
        return;
      }

      const resolved = safeResolveStatic(root, realRoot, req.url || "/");
      if (resolved.error) {
        const messages = {
          400: "bad request\n",
          403: "forbidden\n",
          404: "not found\n",
          414: "uri too long\n",
        };
        send(res, resolved.error, messages[resolved.error], method);
        return;
      }

      const body = readFileSync(resolved.file);
      send(res, 200, body, method, contentType(resolved.file));
    })().catch(() => {
      req.resume();
      sendMcpFailure(
        res,
        500,
        "Internal onion gateway error",
        String(req.method || "GET").toUpperCase(),
      );
    });
  });

  server.maxConnections = 64;
  server.requestTimeout = Math.max(10_000, options.mcpTimeoutMs + 5_000);
  server.headersTimeout = 5_000;
  server.keepAliveTimeout = 2_000;
  server.maxRequestsPerSocket = 100;

  const stop = (signal) => {
    console.log(`signal=${signal}`);
    server.close((error) => process.exit(error ? 1 : 0));
    setTimeout(() => process.exit(1), 5_000).unref();
  };
  process.once("SIGTERM", () => stop("SIGTERM"));
  process.once("SIGINT", () => stop("SIGINT"));

  server.listen(options.port, options.host, () => {
    const address = server.address();
    if (!address || typeof address === "string") fail("unexpected listener address");
    listeningPort = address.port;
    console.log("VOID_TOR_ONION_PUBLIC_NODE_V1_READY");
    console.log(`bind=${options.host}`);
    console.log(`port=${listeningPort}`);
    console.log(`root=${root}`);
    console.log("read_only=true");
    console.log(`mcp_path=${MCP_PUBLIC_PATH}`);
    console.log(`mcp_upstream=${MCP_UPSTREAM_HOST}:${options.mcpUpstreamPort}${MCP_UPSTREAM_PATH}`);
    console.log("mcp_application_authority=read_only");
    console.log("mcp_paid_work_submission=false");
    console.log(`static_transport_compatibility=${VOID_TOR_STATIC_TRANSPORT_COMPATIBILITY_MARKER}`);
    console.log(`order_status_path_template=${ORDER_STATUS_PATH_TEMPLATE}`);
    console.log(
      `order_status_root_configured=${orderStatusRootState(options).state === "valid"}`,
    );
    console.log("order_status_application_authority=read_only");
    console.log("order_status_authenticated_submission=false");
    console.log("dangerous_paths_touched=false");
  });
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
