#!/usr/bin/env node
import crypto from "node:crypto";
import net from "node:net";
import { validateV3OnionHostname } from "../../tools/lib/void-tor-onion-descriptor-v1.mjs";

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
  try {
    return validateV3OnionHostname(hostname);
  } catch (error) {
    throw new Error(`onion hostname must be one checksum-valid Tor v3 address: ${error.message}`);
  }
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
  return Object.freeze({ base: `http://${hostname}`, hostname, port: 80 });
}

export function validateTorNativeEndpoints(rawEndpoints, nowMs = Date.now()) {
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
      socket.pause();
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
    socket.resume();
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

export async function requestOnionJson({ base, path = "/__void/ready.json", socksHost = "127.0.0.1", socksPort = 9050, timeoutMs = 15_000, maxBytes = 1024 * 1024 }) {
  const endpoint = normalizeOnionBase(base);
  if (!path.startsWith("/") || path.includes("?") || path.includes("#") || path.length > 2048) {
    throw new Error("onion request path is invalid");
  }
  const socket = await socks5Connect({ socksHost, socksPort, hostname: endpoint.hostname, port: endpoint.port, timeoutMs });
  return await new Promise((resolve, reject) => {
    let settled = false;
    let bytes = Buffer.alloc(0);
    const timer = setTimeout(() => finish(new Error("onion HTTP response timed out")), timeoutMs);
    function finish(error, value) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      if (error) reject(error); else resolve(value);
    }
    socket.on("data", (chunk) => {
      bytes = Buffer.concat([bytes, chunk]);
      if (bytes.length > maxBytes) finish(new Error("onion HTTP response exceeded byte limit"));
    });
    socket.on("error", finish);
    socket.on("end", () => {
      const separator = bytes.indexOf("\r\n\r\n");
      if (separator < 0) return finish(new Error("onion HTTP response lacks headers"));
      const headerText = bytes.subarray(0, separator).toString("latin1");
      const body = bytes.subarray(separator + 4);
      const lines = headerText.split("\r\n");
      if (!/^HTTP\/1\.[01] 200 /.test(lines[0])) return finish(new Error(`onion HTTP status is not 200: ${lines[0]}`));
      const headers = new Map(lines.slice(1).map((line) => {
        const index = line.indexOf(":");
        return [line.slice(0, index).trim().toLowerCase(), line.slice(index + 1).trim()];
      }));
      if (!/^application\/(?:[a-z0-9.+-]*\+)?json(?:\s*;|$)/i.test(headers.get("content-type") || "")) {
        return finish(new Error("onion HTTP response is not JSON"));
      }
      if ((headers.get("x-void-public-seed-gateway") || "") !== "v1") return finish(new Error("onion gateway identity header is missing"));
      try { return finish(null, JSON.parse(body.toString("utf8"))); }
      catch (error) { return finish(new Error(`onion JSON is invalid: ${error.message}`)); }
    });
    socket.resume();
    socket.write([`GET ${path} HTTP/1.1`, `Host: ${endpoint.hostname}`, "Accept: application/json", "Connection: close", "User-Agent: void-node/tor-native-bootstrap-v1", "", ""].join("\r\n"));
  });
}
