#!/usr/bin/env node
import net from "node:net";
import process from "node:process";

import {
  VOID_CLOUDFLARE_ORIGIN_CREDENTIAL_PATH_V1,
  VOID_CLOUDFLARE_ORIGIN_EARN_CLAIM_PATH_V1,
  VOID_CLOUDFLARE_ORIGIN_EARN_SUBMIT_PATH_V1,
  VOID_CLOUDFLARE_ORIGIN_HOST_V1,
  deriveVoidCloudflareOriginProxyV2SourceV1,
} from "../../tools/void-cloudflare-origin-proxy-v2-source-v1.mjs";
import {
  VOID_AGENT_CREDENTIAL_REQUEST_MAX_BODY_BYTES_V1,
  VOID_AGENT_CREDENTIAL_REQUEST_MAX_RESPONSE_BYTES_V1,
  VOID_AGENT_CREDENTIAL_REQUEST_TIMEOUT_MS_V1,
} from "../../tools/void-agent-paid-work-credential-request-proxy-v2-edge-composition-v1.mjs";

const MARKER = "VOID_CLOUDFLARE_ORIGIN_PROXY_V2_RUNTIME_V1";
const HOST = "127.0.0.1";
const MAX_HTTP_HEADER_BYTES = 32 * 1024;
const MAX_RAW_HEADER_ENTRIES = 128;
const MAX_HEADER_NAME_BYTES = 128;
const MAX_HEADER_VALUE_BYTES = 8 * 1024;
const MAX_EARN_BODY_BYTES = 512 * 1024;
const EARN_CLAIM_MAX_BODY_BYTES = 64 * 1024;
const EARN_SUBMIT_MAX_BODY_BYTES = 512 * 1024;
const EARN_MAX_RESPONSE_BYTES = 1024 * 1024;
const EARN_TIMEOUT_MS = 30_000;
const CLIENT_REQUEST_TIMEOUT_MS = 30_000;
const MAX_CONNECTION_BYTES =
  MAX_HTTP_HEADER_BYTES + 4 + MAX_EARN_BODY_BYTES;
const HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/u;
const HTTP_METHOD = /^[A-Z]{3,16}$/u;
const proofMode =
  process.env.VOID_CLOUDFLARE_ORIGIN_PROXY_V2_RUNTIME_PROOF_MODE === "1";

function fail(code) {
  throw new Error(code);
}

function integer(raw, min, max, code, { allowZero = false } = {}) {
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
    "cloudflare_runtime_port_invalid:" + name,
    { allowZero: allowProofZero && proofMode },
  );
}

const listenPort = parsePort(
  "VOID_CLOUDFLARE_ORIGIN_PROXY_V2_ADAPTER_PORT",
  { allowProofZero: true },
);
const dispatcherPort = parsePort(
  "VOID_CLOUDFLARE_ORIGIN_PROXY_V2_DISPATCHER_PORT",
);
if (listenPort !== 0 && listenPort === dispatcherPort) {
  fail("cloudflare_runtime_listener_dispatcher_port_collision");
}

function routeProfile(target) {
  if (target === VOID_CLOUDFLARE_ORIGIN_CREDENTIAL_PATH_V1) {
    return Object.freeze({
      route: "credential",
      maxBodyBytes: VOID_AGENT_CREDENTIAL_REQUEST_MAX_BODY_BYTES_V1,
      maxResponseBytes: VOID_AGENT_CREDENTIAL_REQUEST_MAX_RESPONSE_BYTES_V1,
      timeoutMs: VOID_AGENT_CREDENTIAL_REQUEST_TIMEOUT_MS_V1,
    });
  }
  if (target === VOID_CLOUDFLARE_ORIGIN_EARN_CLAIM_PATH_V1) {
    return Object.freeze({
      route: "earn_claim",
      maxBodyBytes: EARN_CLAIM_MAX_BODY_BYTES,
      maxResponseBytes: EARN_MAX_RESPONSE_BYTES,
      timeoutMs: EARN_TIMEOUT_MS,
    });
  }
  if (target === VOID_CLOUDFLARE_ORIGIN_EARN_SUBMIT_PATH_V1) {
    return Object.freeze({
      route: "earn_submit",
      maxBodyBytes: EARN_SUBMIT_MAX_BODY_BYTES,
      maxResponseBytes: EARN_MAX_RESPONSE_BYTES,
      timeoutMs: EARN_TIMEOUT_MS,
    });
  }
  fail("cloudflare_runtime_route_invalid");
}

function statusText(status) {
  return (
    new Map([
      [400, "Bad Request"],
      [408, "Request Timeout"],
      [411, "Length Required"],
      [413, "Payload Too Large"],
      [415, "Unsupported Media Type"],
      [502, "Bad Gateway"],
      [503, "Service Unavailable"],
    ]).get(status) || "Response"
  );
}

function sendLocalError(socket, status, code) {
  if (socket.destroyed) return;
  const body = Buffer.from(
    JSON.stringify({
      ok: false,
      error: String(code || "cloudflare_origin_runtime_hold").slice(0, 160),
    }) + "\n",
    "utf8",
  );
  const head = Buffer.from(
    [
      "HTTP/1.1 " + String(status) + " " + statusText(status),
      "Connection: close",
      "Cache-Control: no-store",
      "Content-Type: application/json; charset=utf-8",
      "Content-Length: " + String(body.length),
      "",
      "",
    ].join("\r\n"),
    "ascii",
  );
  socket.end(Buffer.concat([head, body]), () => {
    if (!socket.destroyed) socket.destroy();
  });
}

function parseRequestLine(line) {
  if (
    typeof line !== "string" ||
    line.length < 1 ||
    line.length > 8 * 1024 ||
    [...line].some((char) => {
      const code = char.charCodeAt(0);
      return code < 0x20 || code > 0x7e;
    })
  ) {
    fail("cloudflare_runtime_request_line_invalid");
  }
  const parts = line.split(" ");
  if (parts.length !== 3) fail("cloudflare_runtime_request_line_invalid");
  const [method, target, version] = parts;
  if (!HTTP_METHOD.test(method)) fail("cloudflare_runtime_method_invalid");
  if (
    !target.startsWith("/") ||
    target.startsWith("//") ||
    target.includes("#") ||
    target.length > 4096
  ) {
    fail("cloudflare_runtime_target_invalid");
  }
  if (version !== "HTTP/1.1" && version !== "HTTP/1.0") {
    fail("cloudflare_runtime_http_version_invalid");
  }
  return Object.freeze({ method, target, version });
}

function parseRequestHeaders(headerBytes) {
  const text = headerBytes.toString("latin1");
  const lines = text.split("\r\n");
  const requestLine = lines.shift();
  if (!requestLine) fail("cloudflare_runtime_request_line_missing");

  const rawHeaders = [];
  const values = new Map();
  for (const line of lines) {
    if (!line) continue;
    if (/^[ \t]/u.test(line)) fail("cloudflare_runtime_obs_fold_forbidden");
    const colon = line.indexOf(":");
    if (colon < 1) fail("cloudflare_runtime_header_invalid");
    const rawName = line.slice(0, colon);
    const rawValue = line.slice(colon + 1);
    if (
      rawName !== rawName.trim() ||
      !HEADER_NAME.test(rawName) ||
      Buffer.byteLength(rawName, "utf8") > MAX_HEADER_NAME_BYTES
    ) {
      fail("cloudflare_runtime_header_name_invalid");
    }
    if (
      Buffer.byteLength(rawValue, "latin1") > MAX_HEADER_VALUE_BYTES ||
      /[\u0000-\u0008\u000a-\u001f\u007f]/u.test(rawValue)
    ) {
      fail("cloudflare_runtime_header_value_invalid");
    }
    const value = rawValue.replace(/^[ \t]+|[ \t]+$/gu, "");
    rawHeaders.push(rawName, value);
    if (rawHeaders.length > MAX_RAW_HEADER_ENTRIES) {
      fail("cloudflare_runtime_raw_headers_exceeded");
    }
    const name = rawName.toLowerCase();
    const prior = values.get(name) || [];
    prior.push(value);
    values.set(name, prior);
  }

  return Object.freeze({
    requestLine: parseRequestLine(requestLine),
    rawHeaders: Object.freeze(rawHeaders),
    values,
  });
}

function exactHeader(values, name, code) {
  const rows = values.get(name);
  if (!rows || rows.length !== 1) fail(code);
  return rows[0];
}

function optionalSingleHeader(values, name, code) {
  const rows = values.get(name);
  if (!rows) return null;
  if (rows.length !== 1) fail(code);
  return rows[0];
}

function canonicalContentLength(values) {
  const raw = exactHeader(
    values,
    "content-length",
    "cloudflare_runtime_content_length_required",
  );
  if (!/^(0|[1-9][0-9]*)$/u.test(raw)) {
    fail("cloudflare_runtime_content_length_invalid");
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) {
    fail("cloudflare_runtime_content_length_invalid");
  }
  return value;
}

function asciiForwardValue(value, code) {
  if (
    typeof value !== "string" ||
    value.length > MAX_HEADER_VALUE_BYTES ||
    [...value].some((char) => {
      const byte = char.charCodeAt(0);
      return byte < 0x20 || byte > 0x7e;
    })
  ) {
    fail(code);
  }
  return value;
}

function buildForwardRequest(decoded, body) {
  const translation = decoded.translation;
  const profile = decoded.profile;
  const contentType = asciiForwardValue(
    exactHeader(
      decoded.values,
      "content-type",
      "cloudflare_runtime_content_type_required",
    ),
    "cloudflare_runtime_content_type_invalid",
  );
  if (contentType.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    fail("cloudflare_runtime_application_json_required");
  }

  const authorization = optionalSingleHeader(
    decoded.values,
    "authorization",
    "cloudflare_runtime_authorization_duplicated",
  );
  const payloadSha = optionalSingleHeader(
    decoded.values,
    "x-void-payload-sha256",
    "cloudflare_runtime_payload_sha256_duplicated",
  );

  if (profile.route === "credential" && authorization !== null) {
    fail("cloudflare_runtime_credential_authorization_forbidden");
  }
  if (
    profile.route === "credential" &&
    (payloadSha === null || !/^[0-9a-fA-F]{64}$/u.test(payloadSha))
  ) {
    fail("cloudflare_runtime_credential_payload_sha256_required");
  }

  const lines = [
    "POST " + translation.sensitive_route + " " + decoded.requestLine.version,
    "Host: " + VOID_CLOUDFLARE_ORIGIN_HOST_V1,
    "Accept: application/json",
    "Content-Type: " + contentType,
    "Content-Length: " + String(body.length),
    "Connection: close",
  ];

  if (profile.route === "credential") {
    lines.push("X-Void-Payload-Sha256: " + payloadSha.toLowerCase());
  }
  if (profile.route !== "credential" && authorization !== null) {
    lines.push(
      "Authorization: " +
        asciiForwardValue(
          authorization,
          "cloudflare_runtime_authorization_invalid",
        ),
    );
  }

  return Buffer.concat([
    Buffer.from(translation.proxy_v2_preface),
    Buffer.from(lines.join("\r\n") + "\r\n\r\n", "latin1"),
    body,
  ]);
}

function tryDecodeRequest(buffer) {
  if (!Buffer.isBuffer(buffer)) fail("cloudflare_runtime_buffer_invalid");
  if (buffer.length > MAX_CONNECTION_BYTES) {
    fail("cloudflare_runtime_connection_bytes_exceeded");
  }
  const headerEnd = buffer.indexOf("\r\n\r\n", 0, "ascii");
  if (headerEnd < 0) {
    if (buffer.length > MAX_HTTP_HEADER_BYTES + 3) {
      fail("cloudflare_runtime_headers_too_large");
    }
    return null;
  }
  const headerBytes = buffer.subarray(0, headerEnd);
  if (headerBytes.length > MAX_HTTP_HEADER_BYTES) {
    fail("cloudflare_runtime_headers_too_large");
  }

  const decoded = parseRequestHeaders(headerBytes);
  for (const forbidden of [
    "transfer-encoding",
    "expect",
    "upgrade",
    "proxy-connection",
  ]) {
    if (decoded.values.has(forbidden)) {
      fail("cloudflare_runtime_forbidden_header:" + forbidden);
    }
  }

  const translation = deriveVoidCloudflareOriginProxyV2SourceV1({
    method: decoded.requestLine.method,
    target: decoded.requestLine.target,
    raw_headers: decoded.rawHeaders,
  });
  if (translation.ok !== true) {
    fail(
      "cloudflare_runtime_source_hold:" +
        String(translation.reason || translation.status),
    );
  }

  const profile = routeProfile(translation.sensitive_route);
  const contentLength = canonicalContentLength(decoded.values);
  if (contentLength > profile.maxBodyBytes) {
    fail("cloudflare_runtime_content_length_too_large");
  }

  const bodyStart = headerEnd + 4;
  const expected = bodyStart + contentLength;
  if (buffer.length < expected) return null;
  if (buffer.length > expected) {
    fail("cloudflare_runtime_trailing_bytes_forbidden");
  }
  const body = Buffer.from(buffer.subarray(bodyStart, expected));
  const downstreamBytes = buildForwardRequest(
    Object.freeze({
      ...decoded,
      translation,
      profile,
    }),
    body,
  );

  return Object.freeze({
    route: profile.route,
    profile,
    translation,
    body,
    downstreamBytes,
  });
}

function readOneRequest(socket) {
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
      socket.setTimeout(0);
      fn(value);
    };
    const onError = (error) => finish(reject, error);
    const onEnd = () =>
      finish(
        reject,
        new Error("cloudflare_runtime_client_ended_before_request"),
      );
    const onTimeout = () =>
      finish(
        reject,
        new Error("cloudflare_runtime_client_request_timeout"),
      );
    const onData = (chunk) => {
      if (settled) return;
      try {
        buffer = Buffer.concat([buffer, Buffer.from(chunk)]);
        const decoded = tryDecodeRequest(buffer);
        if (decoded) {
          socket.pause();
          finish(resolve, decoded);
        }
      } catch (error) {
        finish(reject, error);
      }
    };

    socket.on("data", onData);
    socket.once("error", onError);
    socket.once("end", onEnd);
    socket.once("timeout", onTimeout);
    socket.setTimeout(CLIENT_REQUEST_TIMEOUT_MS);
    socket.resume();
  });
}

function parseDispatcherResponse(bytes, maxBodyBytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 1) {
    fail("cloudflare_runtime_dispatcher_response_empty");
  }
  const headerEnd = bytes.indexOf("\r\n\r\n", 0, "ascii");
  if (headerEnd < 0 || headerEnd > MAX_HTTP_HEADER_BYTES) {
    fail("cloudflare_runtime_dispatcher_response_headers_invalid");
  }
  const lines = bytes.subarray(0, headerEnd).toString("latin1").split("\r\n");
  const statusLine = lines.shift();
  if (
    !statusLine ||
    !/^HTTP\/1\.[01] [1-5][0-9]{2}(?: [\x20-\x7e]*)?$/u.test(statusLine)
  ) {
    fail("cloudflare_runtime_dispatcher_response_status_invalid");
  }
  const values = new Map();
  for (const line of lines) {
    if (!line || /^[ \t]/u.test(line)) {
      fail("cloudflare_runtime_dispatcher_response_header_invalid");
    }
    const colon = line.indexOf(":");
    if (colon < 1) fail("cloudflare_runtime_dispatcher_response_header_invalid");
    const name = line.slice(0, colon).toLowerCase();
    const value = line.slice(colon + 1).trim();
    const prior = values.get(name) || [];
    prior.push(value);
    values.set(name, prior);
  }
  if (values.has("transfer-encoding")) {
    fail("cloudflare_runtime_dispatcher_response_transfer_encoding_forbidden");
  }
  const rawLength = exactHeader(
    values,
    "content-length",
    "cloudflare_runtime_dispatcher_response_content_length_required",
  );
  if (!/^(0|[1-9][0-9]*)$/u.test(rawLength)) {
    fail("cloudflare_runtime_dispatcher_response_content_length_invalid");
  }
  const bodyLength = Number(rawLength);
  if (
    !Number.isSafeInteger(bodyLength) ||
    bodyLength > maxBodyBytes
  ) {
    fail("cloudflare_runtime_dispatcher_response_too_large");
  }
  if (bytes.length !== headerEnd + 4 + bodyLength) {
    fail("cloudflare_runtime_dispatcher_response_length_mismatch");
  }
  return bytes;
}

function forwardToDispatcher(request, clientSocket) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let total = 0;
    const chunks = [];
    const maxWireBytes =
      MAX_HTTP_HEADER_BYTES + 4 + request.profile.maxResponseBytes;
    const upstream = net.createConnection({
      host: HOST,
      port: dispatcherPort,
    });

    const cleanup = () => {
      clientSocket.off("close", onClientClose);
    };
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn(value);
    };
    const onClientClose = () => {
      if (!upstream.destroyed) {
        upstream.destroy(new Error("cloudflare_runtime_client_disconnected"));
      }
    };

    clientSocket.once("close", onClientClose);
    if (clientSocket.destroyed) {
      onClientClose();
    }

    upstream.setTimeout(request.profile.timeoutMs);
    upstream.once("timeout", () => {
      upstream.destroy(
        new Error("cloudflare_runtime_dispatcher_timeout"),
      );
    });
    upstream.once("error", (error) => finish(reject, error));
    upstream.once("connect", () => {
      upstream.setNoDelay(true);
      upstream.end(request.downstreamBytes);
    });
    upstream.on("data", (chunk) => {
      if (settled) return;
      total += chunk.length;
      if (total > maxWireBytes) {
        upstream.destroy(
          new Error("cloudflare_runtime_dispatcher_response_too_large"),
        );
        return;
      }
      chunks.push(Buffer.from(chunk));
    });
    upstream.once("end", () => {
      if (settled) return;
      try {
        finish(
          resolve,
          parseDispatcherResponse(
            Buffer.concat(chunks, total),
            request.profile.maxResponseBytes,
          ),
        );
      } catch (error) {
        finish(reject, error);
      }
    });
    upstream.once("close", () => {
      if (!settled) {
        finish(
          reject,
          new Error("cloudflare_runtime_dispatcher_closed_early"),
        );
      }
    });
  });
}

function classifyClientError(error) {
  const code = String(
    error?.message || error || "cloudflare_origin_runtime_hold",
  );
  if (code.includes("timeout")) return [408, "request_timeout"];
  if (
    code.includes("too_large") ||
    code.includes("bytes_exceeded") ||
    code.includes("headers_too_large")
  ) {
    return [413, "request_too_large"];
  }
  if (code.includes("content_length_required")) {
    return [411, "content_length_required"];
  }
  if (
    code.includes("application_json") ||
    code.includes("content_type")
  ) {
    return [415, "application_json_required"];
  }
  return [400, code.slice(0, 160)];
}

const server = net.createServer({ allowHalfOpen: true }, (socket) => {
  socket.setNoDelay(true);
  let clientError = null;
  const onClientError = (error) => {
    clientError = error;
  };
  socket.on("error", onClientError);
  socket.once("close", () => socket.off("error", onClientError));

  void (async () => {
    let request;
    try {
      request = await readOneRequest(socket);
    } catch (error) {
      const [status, code] = classifyClientError(error);
      sendLocalError(socket, status, code);
      return;
    }
    if (clientError !== null || socket.destroyed) return;

    try {
      const response = await forwardToDispatcher(request, socket);
      if (clientError !== null || socket.destroyed) return;
      socket.end(response, () => {
        if (!socket.destroyed) socket.destroy();
      });
    } catch (error) {
      if (clientError !== null || socket.destroyed) return;
      process.stderr.write(
        MARKER + " dispatcher_error=" + String(error) + "\n",
      );
      sendLocalError(socket, 502, "dispatcher_unavailable");
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
      fail("cloudflare_runtime_listener_address_invalid");
    }
    process.stdout.write(
      JSON.stringify({
        marker: MARKER,
        ready: true,
        listen_host: address.address,
        listen_port: address.port,
        dispatcher_host: HOST,
        dispatcher_port: dispatcherPort,
        signed_public_origin_preserved: true,
        exact_sensitive_routes_only: true,
        source_identity_forwarded_as_http_header: false,
        cloudflare_header_transport_trusted: false,
        cloudflared_uid_isolation_proven: false,
        cloudflare_worker_route_absence_proven: false,
        pseudo_ipv4_overwrite_disabled_proven: false,
        tunnel_path_ownership_verified: false,
        dispatcher_exclusive_reachability_proven: false,
        production_service_installed: false,
        runtime_integration: false,
        work_credit_write: false,
        credential_issuance: false,
        public_presale_activation: false,
        funds_movement: false,
      }) + "\n",
    );
  },
);
