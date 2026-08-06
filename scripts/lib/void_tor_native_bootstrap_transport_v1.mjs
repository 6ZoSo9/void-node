#!/usr/bin/env node
import crypto from "node:crypto";
import net from "node:net";

const COMPILED_MAX_RANGE = 999;
const COMPILED_MAX_RESPONSE_BYTES = 128 * 1024 * 1024;
const MAX_HEADER_BYTES = 64 * 1024;
const FIXED_PUBLIC_ROUTES = new Set([
  "/__void/ready.json",
  "/blocks/latest/number2.json",
  "/head",
  "/__void/demo/summary.json",
  "/api/health",
]);

export const TOR_NATIVE_ENDPOINT_KEYS = Object.freeze([
  "transport",
  "base",
  "priority",
  "enabled",
  "temporary",
  "qualification_id",
  "qualified_at",
  "qualified_head",
]);

function plainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

function exactKeys(value, expected, label) {
  const object = plainObject(value, label);
  const actual = Object.keys(object).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label} keys mismatch`);
  }
  return object;
}

function boundedInteger(raw, fallback, minimum, maximum) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
}

export function canonicalJson(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("canonical JSON rejects non-finite numbers");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const object = plainObject(value, "canonical JSON value");
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
    .join(",")}}`;
}

export function contentId(prefix, value, idKey) {
  const body = structuredClone(value);
  delete body[idKey];
  return `${prefix}${crypto.createHash("sha256").update(canonicalJson(body)).digest("hex")}`;
}

export function normalizeOnionV3Hostname(raw) {
  const hostname = String(raw || "").trim().toLowerCase().replace(/\.$/, "");
  if (!/^[a-z2-7]{56}\.onion$/.test(hostname)) {
    throw new Error("onion hostname must be one canonical Tor v3 address");
  }
  return hostname;
}

export function normalizeOnionBase(raw) {
  let url;
  try {
    url = new URL(String(raw));
  } catch (error) {
    void error;
    throw new Error("onion endpoint base is invalid");
  }
  if (url.protocol !== "http:") throw new Error("onion endpoint must use http over Tor");
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("onion endpoint must not contain credentials, query, or fragment");
  }
  if (url.port && url.port !== "80") {
    throw new Error("onion endpoint must use virtual port 80");
  }
  if (url.pathname !== "/") throw new Error("onion endpoint base must not contain a path");
  const hostname = normalizeOnionV3Hostname(url.hostname);
  return Object.freeze({
    transport: "tor_v3_http",
    base: `http://${hostname}`,
    hostname,
    port: 80,
  });
}

export function validateTorNativeEndpoints(
  rawEndpoints,
  nowMs = Date.now(),
  maxQualificationAgeMs = 2 * 60 * 60 * 1000,
) {
  if (!Array.isArray(rawEndpoints)) throw new Error("onion_endpoints must be an array");
  if (rawEndpoints.length < 1 || rawEndpoints.length > 8) {
    throw new Error("Tor-native bootstrap requires one through eight onion endpoints");
  }

  const seen = new Set();
  const endpoints = [];
  for (const [index, rawEndpoint] of rawEndpoints.entries()) {
    const endpoint = exactKeys(
      rawEndpoint,
      TOR_NATIVE_ENDPOINT_KEYS,
      `onion endpoint ${index + 1}`,
    );
    if (endpoint.enabled !== true) continue;
    if (endpoint.transport !== "tor_v3_http") {
      throw new Error("enabled onion transport must be tor_v3_http");
    }
    if (endpoint.temporary !== false) {
      throw new Error("enabled onion endpoint must declare temporary=false");
    }
    if (
      !Number.isSafeInteger(endpoint.priority) ||
      endpoint.priority < 0 ||
      endpoint.priority > 65535
    ) {
      throw new Error("onion endpoint priority is invalid");
    }
    if (!/^voidpsq1_[0-9a-f]{64}$/.test(String(endpoint.qualification_id || ""))) {
      throw new Error("onion endpoint qualification ID is malformed");
    }
    const qualifiedAt = Date.parse(String(endpoint.qualified_at || ""));
    if (!Number.isFinite(qualifiedAt) || qualifiedAt > nowMs + 5 * 60 * 1000) {
      throw new Error("onion endpoint qualification time is invalid");
    }
    if (nowMs - qualifiedAt > maxQualificationAgeMs) {
      throw new Error("onion endpoint qualification is stale");
    }
    if (!Number.isSafeInteger(endpoint.qualified_head) || endpoint.qualified_head <= 0) {
      throw new Error("onion endpoint qualified head must be positive");
    }

    const normalized = normalizeOnionBase(endpoint.base);
    if (seen.has(normalized.base)) throw new Error("duplicate onion endpoint");
    seen.add(normalized.base);
    endpoints.push(Object.freeze({ ...endpoint, ...normalized }));
  }

  if (endpoints.length === 0) throw new Error("no enabled Tor-native endpoint remains");
  return Object.freeze(
    endpoints.sort((left, right) =>
      left.priority - right.priority || left.base.localeCompare(right.base),
    ),
  );
}

function normalizePublicRoute(rawRoute, endpointBase) {
  const raw = String(rawRoute || "");
  if (!raw.startsWith("/") || raw.length > 2048) {
    throw new Error("onion public route is invalid");
  }

  let route;
  try {
    route = new URL(raw, endpointBase);
  } catch (error) {
    void error;
    throw new Error("onion public route is invalid");
  }
  if (
    route.origin !== endpointBase ||
    route.username ||
    route.password ||
    route.hash
  ) {
    throw new Error("onion public route escaped its peer origin");
  }

  if (FIXED_PUBLIC_ROUTES.has(route.pathname)) {
    if (route.search !== "") {
      throw new Error("fixed onion public route does not accept query parameters");
    }
    return route.pathname;
  }

  if (route.pathname !== "/blocks/range") {
    throw new Error("onion route is not public");
  }
  const keys = [...route.searchParams.keys()];
  if (
    keys.length !== 2 ||
    !keys.includes("from") ||
    !keys.includes("to") ||
    route.searchParams.getAll("from").length !== 1 ||
    route.searchParams.getAll("to").length !== 1
  ) {
    throw new Error("onion block range query is invalid");
  }
  const fromRaw = route.searchParams.get("from");
  const toRaw = route.searchParams.get("to");
  if (!/^\d+$/.test(String(fromRaw)) || !/^\d+$/.test(String(toRaw))) {
    throw new Error("onion block range bounds must be decimal integers");
  }
  const from = Number(fromRaw);
  const to = Number(toRaw);
  if (
    !Number.isSafeInteger(from) ||
    !Number.isSafeInteger(to) ||
    from < 0 ||
    to < from
  ) {
    throw new Error("onion block range bounds are invalid");
  }
  if (to - from + 1 > COMPILED_MAX_RANGE) {
    throw new Error(`onion block range exceeds ${COMPILED_MAX_RANGE}`);
  }
  return `/blocks/range?from=${from}&to=${to}`;
}

function createBufferedSocketReader(socket) {
  let buffer = Buffer.alloc(0);
  let terminalError = null;
  let pending = null;

  function consume(bytes) {
    const value = buffer.subarray(0, bytes);
    buffer = buffer.subarray(bytes);
    return value;
  }

  function settlePending() {
    if (!pending || buffer.length < pending.bytes) return;
    const current = pending;
    pending = null;
    clearTimeout(current.timer);
    current.resolve(consume(current.bytes));
  }

  function fail(error) {
    if (!terminalError) {
      terminalError = error instanceof Error ? error : new Error(String(error));
    }
    if (!pending) return;
    const current = pending;
    pending = null;
    clearTimeout(current.timer);
    current.reject(terminalError);
  }

  function onData(chunk) {
    buffer = buffer.length === 0
      ? Buffer.from(chunk)
      : Buffer.concat([buffer, chunk], buffer.length + chunk.length);
    settlePending();
  }

  function onError(error) {
    fail(error);
  }

  function onEnd() {
    fail(new Error("SOCKS connection ended early"));
  }

  function onClose() {
    fail(new Error("SOCKS connection closed early"));
  }

  socket.on("data", onData);
  socket.on("error", onError);
  socket.on("end", onEnd);
  socket.on("close", onClose);

  function readExact(bytes, timeoutMs) {
    if (!Number.isInteger(bytes) || bytes < 1) {
      return Promise.reject(new Error("SOCKS read size is invalid"));
    }
    if (buffer.length >= bytes) return Promise.resolve(consume(bytes));
    if (terminalError) return Promise.reject(terminalError);
    if (pending) return Promise.reject(new Error("concurrent SOCKS reads are not allowed"));

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (!pending) return;
        pending = null;
        reject(new Error("SOCKS response timed out"));
      }, timeoutMs);
      pending = { bytes, resolve, reject, timer };
      settlePending();
    });
  }

  function detach() {
    if (pending) throw new Error("cannot detach a pending SOCKS reader");
    socket.off("data", onData);
    socket.off("error", onError);
    socket.off("end", onEnd);
    socket.off("close", onClose);
    if (buffer.length !== 0) {
      throw new Error("SOCKS proxy returned unexpected surplus handshake bytes");
    }
    if (terminalError) throw terminalError;
  }

  return Object.freeze({ readExact, detach });
}

async function connectSocket(socket, timeoutMs) {
  await new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(
      () => finish(new Error("Tor SOCKS connection timed out")),
      timeoutMs,
    );

    function cleanup() {
      clearTimeout(timer);
      socket.off("connect", onConnect);
      socket.off("error", onError);
    }

    function finish(error) {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve();
    }

    function onConnect() {
      finish();
    }

    function onError(error) {
      finish(error);
    }

    socket.once("connect", onConnect);
    socket.once("error", onError);
  });
}

async function socks5Connect({ socksHost, socksPort, hostname, port, timeoutMs }) {
  if (!["127.0.0.1", "::1"].includes(socksHost)) {
    throw new Error("Tor SOCKS endpoint must be numeric loopback");
  }
  if (!Number.isInteger(socksPort) || socksPort < 1024 || socksPort > 65535) {
    throw new Error("Tor SOCKS port is invalid");
  }

  const hostBytes = Buffer.from(normalizeOnionV3Hostname(hostname), "ascii");
  const socket = net.createConnection({ host: socksHost, port: socksPort });
  socket.setNoDelay(true);

  try {
    await connectSocket(socket, timeoutMs);
    const reader = createBufferedSocketReader(socket);
    try {
      socket.write(Buffer.from([0x05, 0x01, 0x00]));
      const greeting = await reader.readExact(2, timeoutMs);
      if (greeting[0] !== 0x05 || greeting[1] !== 0x00) {
        throw new Error("Tor SOCKS proxy rejected no-auth mode");
      }

      const request = Buffer.alloc(7 + hostBytes.length);
      request.set([0x05, 0x01, 0x00, 0x03, hostBytes.length], 0);
      hostBytes.copy(request, 5);
      request.writeUInt16BE(port, 5 + hostBytes.length);
      socket.write(request);

      const prefix = await reader.readExact(4, timeoutMs);
      if (prefix[0] !== 0x05 || prefix[1] !== 0x00) {
        throw new Error(`Tor SOCKS connect failed with code ${prefix[1]}`);
      }
      const addressType = prefix[3];
      if (addressType === 0x01) {
        await reader.readExact(6, timeoutMs);
      } else if (addressType === 0x04) {
        await reader.readExact(18, timeoutMs);
      } else if (addressType === 0x03) {
        const length = await reader.readExact(1, timeoutMs);
        await reader.readExact(length[0] + 2, timeoutMs);
      } else {
        throw new Error("Tor SOCKS proxy returned an invalid address type");
      }

      reader.detach();
      return socket;
    } catch (error) {
      socket.destroy();
      throw error;
    }
  } catch (error) {
    socket.destroy();
    throw error;
  }
}

function parseHeaders(headerText) {
  const lines = headerText.split("\r\n");
  const statusMatch = /^HTTP\/1\.[01] ([0-9]{3})(?: |$)/.exec(lines.shift() || "");
  if (!statusMatch) throw new Error("onion HTTP status line is invalid");

  const headers = new Map();
  for (const line of lines) {
    const separator = line.indexOf(":");
    if (separator <= 0) throw new Error("onion HTTP header is malformed");
    const name = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (!/^[a-z0-9-]+$/.test(name)) {
      throw new Error("onion HTTP header name is invalid");
    }
    if (headers.has(name)) throw new Error(`onion HTTP response repeats ${name}`);
    headers.set(name, value);
  }
  return { status: Number(statusMatch[1]), headers };
}

function parseJson(bytes, label) {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new Error(`${label} JSON is invalid: ${error.message}`);
  }
}

function positiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return number;
}

function blockNumber(block) {
  if (!block || typeof block !== "object" || Array.isArray(block)) return null;
  const candidate = block.number ?? block.header?.number;
  const number = Number(candidate);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function validateOnionSeedResponse(route, bytes) {
  const parsedRoute = new URL(route, "http://onion.invalid");
  const value = parseJson(bytes, `onion ${parsedRoute.pathname} response`);

  if (parsedRoute.pathname === "/__void/ready.json") {
    const ready = plainObject(value, "onion readiness response");
    if (
      ready.ready !== true ||
      Number(ready.gap) !== 0 ||
      Number(ready.txroot_live) !== 1
    ) {
      throw new Error("onion readiness response is not exact-green");
    }
    positiveInteger(ready.head, "onion readiness head");
    return;
  }

  if (parsedRoute.pathname === "/blocks/latest/number2.json") {
    positiveInteger(
      plainObject(value, "onion latest-head response").number,
      "onion latest-head number",
    );
    return;
  }

  if (parsedRoute.pathname === "/head") {
    const head = plainObject(value, "onion head response");
    positiveInteger(head.head ?? head.number, "onion head");
    return;
  }

  if (parsedRoute.pathname === "/__void/demo/summary.json") {
    const summary = plainObject(value, "onion summary response");
    positiveInteger(
      plainObject(summary.chain, "onion summary chain").head,
      "onion summary head",
    );
    return;
  }

  if (parsedRoute.pathname === "/api/health") {
    const health = plainObject(value, "onion health response");
    if (health.ok !== true) throw new Error("onion health response is not ok");
    if (health.head !== undefined) positiveInteger(health.head, "onion health head");
    return;
  }

  if (parsedRoute.pathname === "/blocks/range") {
    const from = Number(parsedRoute.searchParams.get("from"));
    const to = Number(parsedRoute.searchParams.get("to"));
    const blocks = Array.isArray(value)
      ? value
      : Array.isArray(value?.blocks)
        ? value.blocks
        : null;
    if (!blocks) {
      throw new Error("onion block-range response must contain a blocks array");
    }
    const expectedLength = to - from + 1;
    if (blocks.length !== expectedLength) {
      throw new Error(
        `onion block-range response length ${blocks.length} does not match ${expectedLength}`,
      );
    }
    for (let index = 0; index < blocks.length; index += 1) {
      const actual = blockNumber(blocks[index]);
      const expected = from + index;
      if (actual !== expected) {
        throw new Error(
          `onion block-range response is not contiguous at index ${index}: expected ${expected}, got ${String(actual)}`,
        );
      }
    }
    return;
  }

  throw new Error(`onion response route is unsupported: ${parsedRoute.pathname}`);
}

export async function requestOnionRouteV1(
  peer,
  route,
  {
    method = "GET",
    socksHost = "127.0.0.1",
    socksPort = 9050,
    timeoutMs = 15_000,
    maxBytes = 64 * 1024 * 1024,
  } = {},
) {
  const endpoint = normalizeOnionBase(peer?.base || peer);
  const normalizedMethod = String(method).toUpperCase();
  if (!new Set(["GET", "HEAD"]).has(normalizedMethod)) {
    throw new Error("Tor-native seed transport permits only GET and HEAD");
  }

  const requestTarget = normalizePublicRoute(route, endpoint.base);
  const boundedTimeout = boundedInteger(timeoutMs, 15_000, 1_000, 60_000);
  const boundedBytes = boundedInteger(
    maxBytes,
    64 * 1024 * 1024,
    64 * 1024,
    COMPILED_MAX_RESPONSE_BYTES,
  );

  const socket = await socks5Connect({
    socksHost,
    socksPort,
    hostname: endpoint.hostname,
    port: endpoint.port,
    timeoutMs: boundedTimeout,
  });

  return await new Promise((resolve, reject) => {
    let settled = false;
    let bytes = Buffer.alloc(0);
    const timer = setTimeout(
      () => finish(new Error("onion HTTP response timed out")),
      boundedTimeout,
    );

    function finish(error, value) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      if (error) reject(error);
      else resolve(value);
    }

    socket.on("data", (chunk) => {
      if (settled) return;
      bytes = Buffer.concat([bytes, chunk], bytes.length + chunk.length);
      const headerEnd = bytes.indexOf("\r\n\r\n");
      if (headerEnd < 0 && bytes.length > MAX_HEADER_BYTES) {
        finish(new Error("onion HTTP headers exceeded byte limit"));
        return;
      }
      if (headerEnd > MAX_HEADER_BYTES) {
        finish(new Error("onion HTTP headers exceeded byte limit"));
        return;
      }
      if (bytes.length > boundedBytes + MAX_HEADER_BYTES) {
        finish(new Error("onion HTTP response exceeded byte limit"));
      }
    });
    socket.on("error", finish);
    socket.on("end", () => {
      try {
        const headerEnd = bytes.indexOf("\r\n\r\n");
        if (headerEnd < 0) throw new Error("onion HTTP response lacks headers");
        const headerText = bytes.subarray(0, headerEnd).toString("latin1");
        const body = bytes.subarray(headerEnd + 4);
        const { status, headers } = parseHeaders(headerText);

        if (status >= 300 && status < 400) {
          throw new Error(`onion HTTP response redirected with status ${status}`);
        }
        if (status !== 200) throw new Error(`onion HTTP status is not 200: ${status}`);
        if (headers.has("transfer-encoding")) {
          throw new Error("onion HTTP transfer-encoding is unsupported");
        }

        const contentType = headers.get("content-type") || "";
        if (!/^application\/(?:[a-z0-9.+-]*\+)?json(?:\s*;|$)/i.test(contentType)) {
          throw new Error("onion HTTP response is not JSON");
        }
        if ((headers.get("x-void-public-seed-gateway") || "") !== "v1") {
          throw new Error("onion gateway identity header is missing");
        }

        const advertised = headers.has("content-length")
          ? Number(headers.get("content-length"))
          : null;
        if (
          advertised !== null &&
          (!Number.isSafeInteger(advertised) || advertised < 0)
        ) {
          throw new Error("onion HTTP content-length is invalid");
        }
        if (advertised !== null && advertised > boundedBytes) {
          throw new Error("onion HTTP response advertised an oversized body");
        }

        if (normalizedMethod === "HEAD") {
          return finish(null, {
            status,
            contentType,
            bytes: Buffer.alloc(0),
            remoteAddress: `tor://${endpoint.hostname}`,
          });
        }

        if (body.length > boundedBytes) {
          throw new Error("onion HTTP body exceeded byte limit");
        }
        if (advertised !== null && body.length !== advertised) {
          throw new Error(
            `onion HTTP body length ${body.length} does not match ${advertised}`,
          );
        }
        validateOnionSeedResponse(requestTarget, body);
        return finish(null, {
          status,
          contentType,
          bytes: body,
          remoteAddress: `tor://${endpoint.hostname}`,
        });
      } catch (error) {
        return finish(error);
      }
    });

    socket.write([
      `${normalizedMethod} ${requestTarget} HTTP/1.1`,
      `Host: ${endpoint.hostname}`,
      "Accept: application/json",
      "Connection: close",
      "User-Agent: void-node/tor-native-bootstrap-v1",
      "",
      "",
    ].join("\r\n"));
  });
}

export async function requestOnionJson({
  base,
  path = "/__void/ready.json",
  socksHost = "127.0.0.1",
  socksPort = 9050,
  timeoutMs = 15_000,
  maxBytes = 1024 * 1024,
}) {
  if (!path.startsWith("/") || path.includes("?") || path.includes("#") || path.length > 2048) {
    throw new Error("onion request path is invalid");
  }
  const remote = await requestOnionRouteV1(base, path, {
    method: "GET",
    socksHost,
    socksPort,
    timeoutMs,
    maxBytes,
  });
  return parseJson(remote.bytes, "onion");
}
