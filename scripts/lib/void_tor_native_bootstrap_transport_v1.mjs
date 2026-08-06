#!/usr/bin/env node
import crypto from "node:crypto";
import net from "node:net";

const COMPILED_MAX_RESPONSE_BYTES = 128 * 1024 * 1024;
const MAX_HEADER_BYTES = 64 * 1024;

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
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("canonical JSON rejects non-finite numbers");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const object = plainObject(value, "canonical JSON value");
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(",")}}`;
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
  try { url = new URL(String(raw)); }
  catch { throw new Error("onion endpoint base is invalid"); }
  if (url.protocol !== "http:") throw new Error("onion endpoint must use http over Tor");
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("onion endpoint must not contain credentials, query, or fragment");
  }
  if (url.port && url.port !== "80") throw new Error("onion endpoint must use virtual port 80");
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
  for (const [index, raw] of rawEndpoints.entries()) {
    const endpoint = exactKeys(raw, TOR_NATIVE_ENDPOINT_KEYS, `onion endpoint ${index + 1}`);
    if (endpoint.enabled !== true) continue;
    if (endpoint.transport !== "tor_v3_http") throw new Error("enabled onion transport must be tor_v3_http");
    if (endpoint.temporary !== false) throw new Error("enabled onion endpoint must declare temporary=false");
    if (!Number.isSafeInteger(endpoint.priority) || endpoint.priority < 0 || endpoint.priority > 65535) {
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
  return Object.freeze(endpoints.sort((a, b) => a.priority - b.priority || a.base.localeCompare(b.base)));
}

function readExact(socket, bytes, timeoutMs) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let buffer = Buffer.alloc(0);
    const timer = setTimeout(() => finish(new Error("SOCKS response timed out")), timeoutMs);
    function cleanup() {
      clearTimeout(timer);
      socket.off("data", onData);
      socket.off("error", finish);
      socket.off("close", onClose);
    }
    function finish(error, value) {
      if (settled) return;
      settled = true;
      cleanup();
      if (buffer.length > bytes) socket.unshift(buffer.subarray(bytes));
      if (error) reject(error);
      else resolve(value ?? buffer.subarray(0, bytes));
    }
    function onData(chunk) {
      buffer = Buffer.concat([buffer, chunk]);
      if (buffer.length >= bytes) finish(null, buffer.subarray(0, bytes));
    }
    function onClose() { finish(new Error("SOCKS connection closed early")); }
    socket.on("data", onData);
    socket.on("error", finish);
    socket.on("close", onClose);
  });
}

async function socks5Connect({ socksHost, socksPort, hostname, port, timeoutMs }) {
  if (!["127.0.0.1", "::1"].includes(socksHost)) throw new Error("Tor SOCKS endpoint must be numeric loopback");
  if (!Number.isInteger(socksPort) || socksPort < 1024 || socksPort > 65535) throw new Error("Tor SOCKS port is invalid");
  const hostBytes = Buffer.from(normalizeOnionV3Hostname(hostname), "ascii");
  const socket = net.createConnection({ host: socksHost, port: socksPort });
  socket.setNoDelay(true);
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Tor SOCKS connection timed out")), timeoutMs);
      socket.once("connect", () => { clearTimeout(timer); resolve(); });
      socket.once("error", (error) => { clearTimeout(timer); reject(error); });
    });
    socket.write(Buffer.from([0x05, 0x01, 0x00]));
    const greeting = await readExact(socket, 2, timeoutMs);
    if (greeting[0] !== 0x05 || greeting[1] !== 0x00) throw new Error("Tor SOCKS proxy rejected no-auth mode");
    const request = Buffer.alloc(7 + hostBytes.length);
    request.set([0x05, 0x01, 0x00, 0x03, hostBytes.length], 0);
    hostBytes.copy(request, 5);
    request.writeUInt16BE(port, 5 + hostBytes.length);
    socket.write(request);
    const prefix = await readExact(socket, 4, timeoutMs);
    if (prefix[0] !== 0x05 || prefix[1] !== 0x00) throw new Error(`Tor SOCKS connect failed with code ${prefix[1]}`);
    const atyp = prefix[3];
    let remainder;
    if (atyp === 0x01) remainder = 6;
    else if (atyp === 0x04) remainder = 18;
    else if (atyp === 0x03) {
      const length = await readExact(socket, 1, timeoutMs);
      remainder = length[0] + 2;
    } else throw new Error("Tor SOCKS proxy returned an invalid address type");
    await readExact(socket, remainder, timeoutMs);
    return socket;
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
    const index = line.indexOf(":");
    if (index <= 0) throw new Error("onion HTTP header is malformed");
    const name = line.slice(0, index).trim().toLowerCase();
    const value = line.slice(index + 1).trim();
    if (!/^[a-z0-9-]+$/.test(name)) throw new Error("onion HTTP header name is invalid");
    if (headers.has(name)) throw new Error(`onion HTTP response repeats ${name}`);
    headers.set(name, value);
  }
  return { status: Number(statusMatch[1]), headers };
}

function parseJson(bytes, label) {
  try { return JSON.parse(bytes.toString("utf8")); }
  catch (error) { throw new Error(`${label} JSON is invalid: ${error.message}`); }
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
    if (ready.ready !== true || Number(ready.gap) !== 0 || Number(ready.txroot_live) !== 1) {
      throw new Error("onion readiness response is not exact-green");
    }
    positiveInteger(ready.head, "onion readiness head");
    return;
  }
  if (parsedRoute.pathname === "/blocks/latest/number2.json") {
    positiveInteger(plainObject(value, "onion latest-head response").number, "onion latest-head number");
    return;
  }
  if (parsedRoute.pathname === "/head") {
    const head = plainObject(value, "onion head response");
    positiveInteger(head.head ?? head.number, "onion head");
    return;
  }
  if (parsedRoute.pathname === "/__void/demo/summary.json") {
    const summary = plainObject(value, "onion summary response");
    positiveInteger(plainObject(summary.chain, "onion summary chain").head, "onion summary head");
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
    if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 0 || to < from) {
      throw new Error("onion range request bounds are invalid");
    }
    const blocks = Array.isArray(value)
      ? value
      : Array.isArray(value?.blocks)
        ? value.blocks
        : null;
    if (!blocks) throw new Error("onion block-range response must contain a blocks array");
    const expectedLength = to - from + 1;
    if (blocks.length !== expectedLength) {
      throw new Error(`onion block-range response length ${blocks.length} does not match ${expectedLength}`);
    }
    for (let index = 0; index < blocks.length; index += 1) {
      const actual = blockNumber(blocks[index]);
      const expected = from + index;
      if (actual !== expected) {
        throw new Error(`onion block-range response is not contiguous at index ${index}: expected ${expected}, got ${String(actual)}`);
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
  const parsedRoute = new URL(String(route || ""), endpoint.base);
  if (parsedRoute.origin !== endpoint.base) throw new Error("onion route escaped its peer origin");
  if (parsedRoute.hash || parsedRoute.username || parsedRoute.password || parsedRoute.pathname.length > 2048) {
    throw new Error("onion request route is invalid");
  }
  const requestTarget = `${parsedRoute.pathname}${parsedRoute.search}`;
  const boundedTimeout = boundedInteger(timeoutMs, 15_000, 1_000, 60_000);
  const boundedBytes = boundedInteger(maxBytes, 64 * 1024 * 1024, 64 * 1024, COMPILED_MAX_RESPONSE_BYTES);
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
    const timer = setTimeout(() => finish(new Error("onion HTTP response timed out")), boundedTimeout);
    function finish(error, value) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      if (error) reject(error);
      else resolve(value);
    }
    socket.on("data", (chunk) => {
      bytes = Buffer.concat([bytes, chunk]);
      const separator = bytes.indexOf("\r\n\r\n");
      if (separator < 0 && bytes.length > MAX_HEADER_BYTES) {
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
        const separator = bytes.indexOf("\r\n\r\n");
        if (separator < 0) throw new Error("onion HTTP response lacks headers");
        const headerText = bytes.subarray(0, separator).toString("latin1");
        const body = bytes.subarray(separator + 4);
        const { status, headers } = parseHeaders(headerText);
        if (status >= 300 && status < 400) throw new Error(`onion HTTP response redirected with status ${status}`);
        if (status !== 200) throw new Error(`onion HTTP status is not 200: ${status}`);
        if (headers.has("transfer-encoding")) throw new Error("onion HTTP transfer-encoding is unsupported");
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
        if (advertised !== null && (!Number.isSafeInteger(advertised) || advertised < 0)) {
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
        if (body.length > boundedBytes) throw new Error("onion HTTP body exceeded byte limit");
        if (advertised !== null && body.length !== advertised) {
          throw new Error(`onion HTTP body length ${body.length} does not match ${advertised}`);
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
