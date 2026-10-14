#!/usr/bin/env node
import http from "node:http";
import net from "node:net";
import process from "node:process";

import {
  VOID_PUBLIC_EARN_CLAIM_PATH_V1,
  VOID_PUBLIC_EARN_SUBMIT_PATH_V1,
  classifyVoidPublicEarnProxyV2EdgeContractV1,
} from "../tools/void-public-earn-proxy-v2-edge-contract-v1.mjs";
import {
  parseVoidAgentCredentialRequestProxyV2SourceV1,
} from "../tools/void-agent-paid-work-credential-request-proxy-v2-source-v1.mjs";
import {
  createVoidPublicEarnProxyV2RateStateV1,
} from "../tools/void-public-earn-proxy-v2-rate-state-v1.mjs";

const MARKER = "VOID_PUBLIC_EARN_PROXY_V2_EDGE_RUNTIME_V1";
const HOST = "127.0.0.1";
const MAX_PROXY_HEADER_BYTES = 512;
const MAX_HTTP_HEADER_BYTES = 32 * 1024;
const HTTP_HEADER_TERMINATOR_BYTES = 4;
const CLAIM_MAX_BODY_BYTES = 64 * 1024;
const SUBMIT_MAX_BODY_BYTES = 512 * 1024;
const MAX_BODY_BYTES = SUBMIT_MAX_BODY_BYTES;
const MAX_RESPONSE_BYTES = 1024 * 1024;
const REQUEST_TIMEOUT_MS = 30_000;
const HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/u;
const proofMode =
  process.env.VOID_PUBLIC_EARN_PROXY_V2_EDGE_PROOF_MODE === "1";

function fail(code) {
  throw new Error(code);
}

function integer(
  raw,
  min,
  max,
  code,
  { allowZero = false } = {},
) {
  const text = String(raw ?? "").trim();
  if (!/^(0|[1-9][0-9]*)$/u.test(text)) fail(code);
  const value = Number(text);
  if (
    !Number.isSafeInteger(value) ||
    value > max ||
    (value === 0 ? !allowZero : value < min)
  ) {
    fail(code);
  }
  return value;
}

function parsePort(name, { allowProofZero = false } = {}) {
  return integer(
    process.env[name],
    1024,
    65535,
    "public_earn_edge_config_port_invalid:" + name,
    { allowZero: allowProofZero && proofMode },
  );
}

function parseUpstream() {
  const raw = String(
    process.env.VOID_PUBLIC_EARN_PROXY_V2_ADAPTER_UPSTREAM || "",
  ).trim();
  let url;
  try {
    url = new URL(raw);
  } catch {
    fail("public_earn_edge_adapter_upstream_invalid");
  }
  if (
    url.protocol !== "http:" ||
    url.hostname !== "127.0.0.1" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    !url.port
  ) {
    fail("public_earn_edge_adapter_upstream_invalid");
  }
  return Object.freeze({
    url,
    port: integer(
      url.port,
      1024,
      65535,
      "public_earn_edge_adapter_upstream_invalid",
    ),
  });
}

function requiredAbsoluteStateFile() {
  const value = String(
    process.env.VOID_PUBLIC_EARN_PROXY_V2_RATE_STATE_FILE || "",
  ).trim();
  if (!value.startsWith("/") || value.includes("\0")) {
    fail("public_earn_edge_rate_state_file_invalid");
  }
  return value;
}

const listenPort = parsePort(
  "VOID_PUBLIC_EARN_PROXY_V2_EDGE_PORT",
  { allowProofZero: true },
);
const adapter = parseUpstream();
if (listenPort !== 0 && listenPort === adapter.port) {
  fail("public_earn_edge_listener_upstream_port_collision");
}
const stateFile = requiredAbsoluteStateFile();
const rateState = createVoidPublicEarnProxyV2RateStateV1({
  state_file: stateFile,
});

function jsonBytes(value) {
  return Buffer.from(JSON.stringify(value) + "\n", "utf8");
}

function statusText(status) {
  return (
    new Map([
      [200, "OK"],
      [202, "Accepted"],
      [400, "Bad Request"],
      [401, "Unauthorized"],
      [404, "Not Found"],
      [405, "Method Not Allowed"],
      [408, "Request Timeout"],
      [411, "Length Required"],
      [413, "Payload Too Large"],
      [415, "Unsupported Media Type"],
      [429, "Too Many Requests"],
      [500, "Internal Server Error"],
      [502, "Bad Gateway"],
      [503, "Service Unavailable"],
    ]).get(status) || "Response"
  );
}

function send(socket, status, body, extraHeaders = {}) {
  if (socket.destroyed) return;
  const bytes = Buffer.isBuffer(body) ? body : jsonBytes(body);
  const lines = [
    `HTTP/1.1 ${status} ${statusText(status)}`,
    "Connection: close",
    "Cache-Control: no-store",
    "Content-Type: application/json; charset=utf-8",
    `Content-Length: ${bytes.length}`,
  ];
  for (const [name, value] of Object.entries(extraHeaders)) {
    if (/[\r\n]/u.test(String(value))) continue;
    lines.push(name + ": " + String(value));
  }
  socket.end(
    Buffer.concat([
      Buffer.from(lines.join("\r\n") + "\r\n\r\n", "ascii"),
      bytes,
    ]),
  );
}

function parseHeaders(bytes) {
  const text = bytes.toString("latin1");
  const lines = text.split("\r\n");
  const requestLine = lines.shift();
  if (!requestLine) {
    fail("public_earn_edge_http_request_line_missing");
  }
  const headers = Object.create(null);
  for (const line of lines) {
    if (!line) continue;
    if (/^[ \t]/u.test(line)) {
      fail("public_earn_edge_http_obs_fold_forbidden");
    }
    const colon = line.indexOf(":");
    if (colon < 1) {
      fail("public_earn_edge_http_header_invalid");
    }
    const rawName = line.slice(0, colon);
    if (!HEADER_NAME.test(rawName)) {
      fail("public_earn_edge_http_header_name_invalid");
    }
    const name = rawName.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(headers, name)) {
      fail("public_earn_edge_http_duplicate_header");
    }
    const value = line.slice(colon + 1).trim();
    if (/[\u0000-\u0008\u000a-\u001f\u007f]/u.test(value)) {
      fail("public_earn_edge_http_header_value_invalid");
    }
    headers[name] = value;
  }
  return Object.freeze({
    requestLine,
    headers: Object.freeze({ ...headers }),
  });
}

function tryDecodeHeaders(buffer) {
  if (
    buffer.length >
    MAX_PROXY_HEADER_BYTES +
      MAX_HTTP_HEADER_BYTES +
      HTTP_HEADER_TERMINATOR_BYTES +
      MAX_BODY_BYTES
  ) {
    fail("public_earn_edge_connection_bytes_exceeded");
  }
  if (buffer.length < 16) return null;

  const parsedSource =
    parseVoidAgentCredentialRequestProxyV2SourceV1(buffer);
  if (parsedSource.ok !== true) {
    const reason = String(parsedSource.reason || "proxy_invalid");
    if (reason === "proxy_v2_header_truncated") return null;
    fail("public_earn_edge_" + reason);
  }
  const proxyBytes = parsedSource.consumed_bytes;
  if (
    !Number.isSafeInteger(proxyBytes) ||
    proxyBytes < 16 ||
    proxyBytes > MAX_PROXY_HEADER_BYTES
  ) {
    fail("public_earn_edge_proxy_header_size_invalid");
  }

  const headerEnd = buffer.indexOf(
    "\r\n\r\n",
    proxyBytes,
    "ascii",
  );
  if (headerEnd < 0) {
    const incompleteHeaderBytes = buffer.length - proxyBytes;
    if (
      incompleteHeaderBytes >
      MAX_HTTP_HEADER_BYTES + HTTP_HEADER_TERMINATOR_BYTES - 1
    ) {
      fail("public_earn_edge_http_headers_too_large");
    }
    return null;
  }

  const headerBytes = buffer.subarray(proxyBytes, headerEnd);
  if (headerBytes.length > MAX_HTTP_HEADER_BYTES) {
    fail("public_earn_edge_http_headers_too_large");
  }
  const decoded = parseHeaders(headerBytes);
  if (decoded.headers["transfer-encoding"] !== undefined) {
    fail("public_earn_edge_transfer_encoding_forbidden");
  }
  if (
    decoded.headers.expect !== undefined ||
    decoded.headers.upgrade !== undefined
  ) {
    fail("public_earn_edge_http_upgrade_forbidden");
  }

  const rawLength = decoded.headers["content-length"];
  if (rawLength === undefined) {
    fail("public_earn_edge_content_length_required");
  }
  const contentLength = integer(
    rawLength,
    0,
    MAX_BODY_BYTES,
    "public_earn_edge_content_length_invalid",
    { allowZero: true },
  );

  const requestLineEnd = buffer.indexOf(
    "\r\n",
    proxyBytes,
    "ascii",
  );
  if (requestLineEnd < 0 || requestLineEnd > headerEnd) {
    fail("public_earn_edge_http_request_line_invalid");
  }

  const bodyStart = headerEnd + HTTP_HEADER_TERMINATOR_BYTES;
  const initialBody = Buffer.from(buffer.subarray(bodyStart));
  if (initialBody.length > contentLength) {
    fail("public_earn_edge_http_trailing_bytes_forbidden");
  }

  return Object.freeze({
    connectionPrefix: Buffer.from(
      buffer.subarray(0, requestLineEnd + 2),
    ),
    headers: decoded.headers,
    contentLength,
    initialBody,
  });
}

function readHeaders(socket) {
  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    let settled = false;

    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("end", onEnd);
      socket.off("timeout", onTimeout);
    };
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn(value);
    };
    const onError = (error) => finish(reject, error);
    const onEnd = () =>
      finish(
        reject,
        new Error("public_earn_edge_client_ended_before_headers"),
      );
    const onTimeout = () =>
      finish(
        reject,
        new Error("public_earn_edge_client_request_timeout"),
      );
    const onData = (chunk) => {
      if (settled) return;
      try {
        buffer = Buffer.concat([buffer, Buffer.from(chunk)]);
        const decoded = tryDecodeHeaders(buffer);
        if (decoded) finish(resolve, decoded);
      } catch (error) {
        finish(reject, error);
      }
    };

    socket.on("data", onData);
    socket.once("error", onError);
    socket.once("end", onEnd);
    socket.once("timeout", onTimeout);
    socket.setTimeout(REQUEST_TIMEOUT_MS);
  });
}

function readBody(socket, initialBody, contentLength) {
  if (initialBody.length === contentLength) {
    return Promise.resolve(Buffer.from(initialBody));
  }
  return new Promise((resolve, reject) => {
    const chunks = [Buffer.from(initialBody)];
    let total = initialBody.length;
    let settled = false;

    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("end", onEnd);
      socket.off("timeout", onTimeout);
    };
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn(value);
    };
    const onError = (error) => finish(reject, error);
    const onEnd = () =>
      finish(
        reject,
        new Error("public_earn_edge_client_ended_before_body"),
      );
    const onTimeout = () =>
      finish(
        reject,
        new Error("public_earn_edge_client_request_timeout"),
      );
    const onData = (chunk) => {
      if (settled) return;
      const bytes = Buffer.from(chunk);
      total += bytes.length;
      if (total > contentLength) {
        finish(
          reject,
          new Error("public_earn_edge_http_trailing_bytes_forbidden"),
        );
        return;
      }
      chunks.push(bytes);
      if (total === contentLength) {
        finish(resolve, Buffer.concat(chunks, total));
      }
    };

    socket.on("data", onData);
    socket.once("error", onError);
    socket.once("end", onEnd);
    socket.once("timeout", onTimeout);
    socket.setTimeout(REQUEST_TIMEOUT_MS);
  });
}

function routeMaximum(route) {
  if (route === "claim") return CLAIM_MAX_BODY_BYTES;
  if (route === "submit") return SUBMIT_MAX_BODY_BYTES;
  fail("public_earn_edge_route_invalid");
}

function forwardHeaders(sanitized, bodyLength) {
  const headers = {
    accept: "application/json",
    "content-length": String(bodyLength),
    "user-agent": "void-public-earn-proxy-v2-edge-v1",
    connection: "close",
  };
  if (typeof sanitized["content-type"] === "string") {
    headers["content-type"] = sanitized["content-type"];
  }
  if (typeof sanitized.authorization === "string") {
    headers.authorization = sanitized.authorization;
  }
  return headers;
}

function forwardToAdapter(admitted, body) {
  return new Promise((resolve, reject) => {
    const upstream = http.request(
      {
        protocol: "http:",
        hostname: "127.0.0.1",
        port: adapter.port,
        method: "POST",
        path: admitted.forward_target,
        headers: forwardHeaders(
          admitted.sanitized_headers,
          body.length,
        ),
        timeout: REQUEST_TIMEOUT_MS,
      },
      (response) => {
        const chunks = [];
        let total = 0;
        let done = false;
        const rejectOnce = (error) => {
          if (done) return;
          done = true;
          response.destroy();
          reject(error);
        };
        response.on("data", (chunk) => {
          if (done) return;
          total += chunk.length;
          if (total > MAX_RESPONSE_BYTES) {
            rejectOnce(
              new Error("public_earn_edge_adapter_response_too_large"),
            );
            return;
          }
          chunks.push(Buffer.from(chunk));
        });
        response.once("error", rejectOnce);
        response.once("end", () => {
          if (done) return;
          done = true;
          const status = Number(response.statusCode);
          if (
            !Number.isSafeInteger(status) ||
            status < 100 ||
            status > 599
          ) {
            reject(
              new Error("public_earn_edge_adapter_status_invalid"),
            );
            return;
          }
          resolve(
            Object.freeze({
              status,
              body: Buffer.concat(chunks),
              retryAfter:
                typeof response.headers["retry-after"] === "string"
                  ? response.headers["retry-after"]
                  : null,
            }),
          );
        });
      },
    );
    upstream.once("timeout", () =>
      upstream.destroy(
        new Error("public_earn_edge_adapter_timeout"),
      ),
    );
    upstream.once("error", reject);
    upstream.end(body);
  });
}

function classifyClientError(error) {
  const code = String(error?.message || error || "public_earn_edge_error");
  if (code.includes("timeout")) {
    return [408, "request_timeout"];
  }
  if (
    code.includes("too_large") ||
    code.includes("bytes_exceeded") ||
    code.includes("content_length_invalid")
  ) {
    return [413, "request_too_large"];
  }
  if (code.includes("content_length_required")) {
    return [411, "content_length_required"];
  }
  return [400, code.slice(0, 160)];
}

const server = net.createServer((socket) => {
  void (async () => {
    let header;
    try {
      header = await readHeaders(socket);
    } catch (error) {
      const [status, code] = classifyClientError(error);
      send(socket, status, { ok: false, error: code });
      return;
    }

    let admitted;
    try {
      admitted = await rateState.admit({
        connection_prefix: header.connectionPrefix,
        headers: header.headers,
        now_ms: Date.now(),
      });
    } catch (error) {
      const code = String(error?.message || error || "");
      if (
        code.includes("public_earn_rate_state_planner_hold:")
      ) {
        send(socket, 400, {
          ok: false,
          error: code.slice(0, 160),
        });
        return;
      }
      process.stderr.write(
        MARKER + " rate_state_error=" + String(error) + "\n",
      );
      send(socket, 503, {
        ok: false,
        error: "public_earn_source_rate_state_unavailable",
      });
      return;
    }

    if (admitted.ok !== true) {
      if (admitted.status === "RATE_LIMITED") {
        send(
          socket,
          429,
          {
            ok: false,
            error: admitted.reason,
            retry_after_ms: admitted.window_ms,
          },
          {
            "Retry-After": String(
              Math.ceil(admitted.window_ms / 1000),
            ),
          },
        );
        return;
      }
      send(socket, 503, {
        ok: false,
        error: "public_earn_source_rate_state_hold",
      });
      return;
    }

    if (header.contentLength > routeMaximum(admitted.route)) {
      send(socket, 413, {
        ok: false,
        error: "request_body_too_large",
      });
      return;
    }

    let body;
    try {
      body = await readBody(
        socket,
        header.initialBody,
        header.contentLength,
      );
    } catch (error) {
      const [status, code] = classifyClientError(error);
      send(socket, status, { ok: false, error: code });
      return;
    }

    try {
      const response = await forwardToAdapter(admitted, body);
      const extraHeaders = {};
      if (response.retryAfter !== null) {
        extraHeaders["Retry-After"] = response.retryAfter;
      }
      send(socket, response.status, response.body, extraHeaders);
    } catch (error) {
      process.stderr.write(
        MARKER + " adapter_error=" + String(error) + "\n",
      );
      send(socket, 502, {
        ok: false,
        error: "public_earn_adapter_failed",
      });
    }
  })();
});

server.maxConnections = 128;
server.on("error", (error) => {
  process.stderr.write(
    MARKER + " server_error=" + String(error) + "\n",
  );
  process.exitCode = 1;
});

function shutdown(signal) {
  server.close((error) => {
    if (error) {
      process.stderr.write(
        MARKER + " shutdown_error=" + String(error) + "\n",
      );
      process.exit(1);
    }
    process.stdout.write(
      MARKER + " stopped signal=" + signal + "\n",
    );
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

server.listen(
  {
    host: HOST,
    port: listenPort,
    exclusive: true,
  },
  () => {
    const address = server.address();
    if (!address || typeof address === "string") {
      fail("public_earn_edge_listener_address_invalid");
    }
    process.stdout.write(
      JSON.stringify({
        marker: MARKER,
        ready: true,
        host: address.address,
        port: address.port,
        adapter_host: "127.0.0.1",
        adapter_port: adapter.port,
        state_file: stateFile,
        exact_claim_submit_post_only: true,
        proxy_v2_required: true,
        public_tls_destination_port_required: 443,
        claim_max_body_bytes: CLAIM_MAX_BODY_BYTES,
        submit_max_body_bytes: SUBMIT_MAX_BODY_BYTES,
        max_response_bytes: MAX_RESPONSE_BYTES,
        request_timeout_ms: REQUEST_TIMEOUT_MS,
        http_parser_stream_binding_proven: true,
        durable_rate_state_source_proven: true,
        admitted_event_persisted_before_forward: true,
        source_identity_forwarded_downstream: false,
        route_body_capability_checks_modified: false,
        existing_inner_adapter_limiter_modified: false,
        inner_adapter_limiter_remains_secondary: true,
        connector_process_identity_proven: false,
        installed_listener_ownership_proven: false,
        live_state_custody_proven: false,
        local_transport_trust_proven: false,
        tailscale_funnel_configuration_verified: false,
        runtime_integration: false,
        work_credit_write: false,
        public_presale_activation: false,
        funds_movement: false,
        nat_independent_participant_isolation_proven: false,
      }) + "\n",
    );
  },
);
