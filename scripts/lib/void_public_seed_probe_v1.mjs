import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import {
  DEFAULT_MAX_RESPONSE_BYTES,
  DEFAULT_MIN_SAMPLES,
  assertPlainObject,
  assertSafeInteger,
  isPublicIpAddress,
  normalizePublicSeedBase,
  parseJsonBytes,
  resolvePublicDns,
  sortedUnion,
} from "./void_public_seed_common_v1.mjs";
import { createQualificationReceipt } from "./void_public_seed_receipt_v1.mjs";

function headerView(rawHeaders) {
  return Object.freeze({
    get(name) {
      const value = rawHeaders[String(name).toLowerCase()];
      if (Array.isArray(value)) return value.join(", ");
      return value === undefined ? null : String(value);
    },
  });
}

function normalizeConnectedAddress(address) {
  const value = String(address || "").split("%")[0].toLowerCase();
  if (value.startsWith("::ffff:") && net.isIP(value.slice(7)) === 4) return value.slice(7);
  return value;
}

function requestOneBounded(
  url,
  {
    method = "GET",
    body,
    timeoutMs = 10_000,
    maxBytes = DEFAULT_MAX_RESPONSE_BYTES,
    address,
    allowLoopbackFixture = false,
  } = {},
) {
  const target = new URL(url);
  const family = net.isIP(address);
  if (!family) throw new Error(`request address is invalid: ${address}`);
  if (!allowLoopbackFixture && !isPublicIpAddress(address)) {
    throw new Error(`request address is not public: ${address}`);
  }

  const requestBody = body === undefined ? null : Buffer.from(String(body));
  const headers = {
    accept: "application/json",
    connection: "close",
    "user-agent": "void-node/public-seed-qualification-v1",
  };
  if (requestBody) {
    headers["content-type"] = "application/json";
    headers["content-length"] = String(requestBody.length);
  }

  const transport = target.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    let settled = false;
    let totalDeadline = null;
    const clearTotalDeadline = () => {
      if (totalDeadline !== null) {
        clearTimeout(totalDeadline);
        totalDeadline = null;
      }
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      clearTotalDeadline();
      reject(error instanceof Error ? error : new Error(String(error)));
    };
    const succeed = (value) => {
      if (settled) return;
      settled = true;
      clearTotalDeadline();
      resolve(value);
    };

    const request = transport.request(
      target,
      {
        method,
        headers,
        agent: false,
        lookup(_hostname, options, callback) {
          if (options?.all === true) {
            callback(null, [{ address, family }]);
            return;
          }
          callback(null, address, family);
        },
      },
      (response) => {
        const connectedAddress = normalizeConnectedAddress(response.socket?.remoteAddress);
        const expectedAddress = normalizeConnectedAddress(address);
        if (!connectedAddress || connectedAddress !== expectedAddress) {
          response.destroy();
          fail(
            new Error(
              `${method} ${url} connected to unexpected address ${connectedAddress || "unknown"}; expected ${expectedAddress}`,
            ),
          );
          return;
        }
        if (!allowLoopbackFixture && !isPublicIpAddress(connectedAddress)) {
          response.destroy();
          fail(new Error(`${method} ${url} connected to non-public address ${connectedAddress}`));
          return;
        }

        const status = Number(response.statusCode || 0);
        if (status >= 300 && status < 400) {
          response.destroy();
          fail(new Error(`${method} ${url} redirected with HTTP ${status}`));
          return;
        }

        const headersView = headerView(response.headers);
        const advertised = Number(headersView.get("content-length") || 0);
        if (Number.isFinite(advertised) && advertised > maxBytes) {
          response.destroy();
          fail(new Error(`${method} ${url} advertised an oversized response`));
          return;
        }

        if (method === "HEAD") {
          response.resume();
          succeed({
            status,
            headers: headersView,
            bytes: Buffer.alloc(0),
            json: null,
            remote_address: connectedAddress,
          });
          return;
        }

        const chunks = [];
        let total = 0;
        response.on("data", (chunk) => {
          if (settled) return;
          total += chunk.length;
          if (total > maxBytes) {
            response.destroy();
            fail(new Error(`${method} ${url} exceeded the response limit`));
            return;
          }
          chunks.push(chunk);
        });
        response.on("aborted", () => fail(new Error(`${method} ${url} response was aborted`)));
        response.on("error", fail);
        response.on("end", () => {
          if (settled) return;
          const bytes = Buffer.concat(chunks, total);
          succeed({
            status,
            headers: headersView,
            bytes,
            json: bytes.length ? parseJsonBytes(bytes, `${method} ${url}`) : null,
            remote_address: connectedAddress,
          });
        });
      },
    );

    totalDeadline = setTimeout(() => {
      request.destroy(new Error(`${method} ${url} timed out after ${timeoutMs} ms`));
    }, timeoutMs);
    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`${method} ${url} timed out after ${timeoutMs} ms`));
    });
    request.on("error", fail);
    if (requestBody) request.write(requestBody);
    request.end();
  });
}

export async function requestBounded(
  url,
  {
    method = "GET",
    body,
    timeoutMs = 10_000,
    maxBytes = DEFAULT_MAX_RESPONSE_BYTES,
    pinnedAddresses,
    allowLoopbackFixture = false,
  } = {},
) {
  if (!Array.isArray(pinnedAddresses) || pinnedAddresses.length === 0) {
    throw new Error(`no pinned addresses available for ${url}`);
  }

  const logicalDeadlineAt = performance.now() + timeoutMs;
  const errors = [];
  for (const address of pinnedAddresses) {
    const remainingMs = logicalDeadlineAt - performance.now();
    if (remainingMs < 1) break;
    const attemptTimeoutMs = Math.max(1, Math.floor(remainingMs));
    try {
      return await requestOneBounded(url, {
        method,
        body,
        timeoutMs: attemptTimeoutMs,
        maxBytes,
        address,
        allowLoopbackFixture,
      });
    } catch (error) {
      errors.push(`${address}: ${error?.message || String(error)}`);
    }
  }

  if (performance.now() >= logicalDeadlineAt) {
    const detail = errors.length ? `: ${errors.join(" | ")}` : "";
    throw new Error(`${method} ${url} timed out after ${timeoutMs} ms across pinned addresses${detail}`);
  }
  throw new Error(`${method} ${url} failed on every pinned address: ${errors.join(" | ")}`);
}

function requireStatus(result, expected, label) {
  if (result.status !== expected) {
    throw new Error(`${label} returned HTTP ${result.status}; expected ${expected}`);
  }
}

function requireJsonContentType(result, label) {
  const value = String(result.headers.get("content-type") || "").toLowerCase();
  if (!value.startsWith("application/json")) {
    throw new Error(`${label} did not return application/json`);
  }
}

function requireGatewayHeader(result, label) {
  const value = String(result.headers.get("x-void-public-seed-gateway") || "").trim();
  if (value !== "v1") throw new Error(`${label} is missing x-void-public-seed-gateway: v1`);
  return value;
}

function containsBlockNumber(value, expected, depth = 0) {
  if (depth > 8 || value === null || value === undefined) return false;
  if (typeof value === "number") return value === expected;
  if (Array.isArray(value)) return value.some((entry) => containsBlockNumber(entry, expected, depth + 1));
  if (typeof value === "object") {
    if (Object.hasOwn(value, "number") && value.number === expected) return true;
    return Object.values(value).some((entry) => containsBlockNumber(entry, expected, depth + 1));
  }
  return false;
}

export async function probePublicSeedSample(
  rawBase,
  {
    lookup = dns.promises.lookup,
    allowLoopbackFixture = false,
    timeoutMs = 10_000,
    maxBytes = DEFAULT_MAX_RESPONSE_BYTES,
    now = () => Date.now(),
  } = {},
) {
  const normalized = normalizePublicSeedBase(rawBase, { allowLoopbackFixture });
  const dnsBefore = await resolvePublicDns(normalized.hostname, { lookup, allowLoopbackFixture });
  const requestOptions = {
    timeoutMs,
    maxBytes,
    pinnedAddresses: dnsBefore,
    allowLoopbackFixture,
  };
  const startedAt = now();

  const ready = await requestBounded(
    `${normalized.base}/__void/ready.json`,
    requestOptions,
  );
  requireStatus(ready, 200, "seed readiness");
  requireJsonContentType(ready, "seed readiness");
  const gatewayHeader = requireGatewayHeader(ready, "seed readiness");
  assertPlainObject(ready.json, "seed readiness body");
  const readyHead = assertSafeInteger(ready.json.head, "seed readiness head", { min: 1 });
  if (ready.json.ready !== true || ready.json.gap !== 0 || ready.json.txroot_live !== 1) {
    throw new Error("seed readiness is not exact-green");
  }

  const head = await requestBounded(
    `${normalized.base}/blocks/latest/number2.json`,
    requestOptions,
  );
  requireStatus(head, 200, "seed head");
  requireJsonContentType(head, "seed head");
  requireGatewayHeader(head, "seed head");
  assertPlainObject(head.json, "seed head body");
  const headNumber = assertSafeInteger(head.json.number, "seed head number", { min: 1 });
  if (Math.abs(headNumber - readyHead) > 64) {
    throw new Error("readiness and head endpoints disagree by more than 64 blocks");
  }

  const rangeHead = Math.min(readyHead, headNumber);
  const range = await requestBounded(
    `${normalized.base}/blocks/range?from=${rangeHead}&to=${rangeHead}`,
    requestOptions,
  );
  requireStatus(range, 200, "seed block range");
  requireJsonContentType(range, "seed block range");
  requireGatewayHeader(range, "seed block range");
  if (!containsBlockNumber(range.json, rangeHead)) {
    throw new Error("seed block range does not contain the requested head block");
  }

  const boundaryOptions = {
    ...requestOptions,
    maxBytes: 64 * 1024,
  };
  const admin = await requestBounded(`${normalized.base}/admin`, boundaryOptions);
  requireStatus(admin, 404, "private-route rejection");
  requireJsonContentType(admin, "private-route rejection");
  if (admin.json?.error !== "route_not_public") {
    throw new Error("private-route rejection body is not route_not_public");
  }

  const mutation = await requestBounded(`${normalized.base}/follower/start`, {
    ...boundaryOptions,
    method: "POST",
    body: "{}",
  });
  requireStatus(mutation, 405, "mutation-method rejection");
  requireJsonContentType(mutation, "mutation-method rejection");
  if (mutation.json?.error !== "method_not_allowed") {
    throw new Error("mutation-method rejection body is not method_not_allowed");
  }

  const headOnly = await requestBounded(`${normalized.base}/__void/ready.json`, {
    ...boundaryOptions,
    method: "HEAD",
  });
  requireStatus(headOnly, 200, "seed readiness HEAD");
  requireGatewayHeader(headOnly, "seed readiness HEAD");

  const dnsAfter = await resolvePublicDns(normalized.hostname, { lookup, allowLoopbackFixture });
  const resolvedAddresses = sortedUnion(dnsBefore, dnsAfter);
  const finishedAt = now();

  return Object.freeze({
    observed_at: new Date(finishedAt).toISOString(),
    duration_ms: Math.max(0, finishedAt - startedAt),
    ready: true,
    gap: 0,
    txroot_live: 1,
    ready_head: readyHead,
    head: headNumber,
    range_head: rangeHead,
    gateway_header: gatewayHeader,
    private_route_status: admin.status,
    private_route_error: admin.json.error,
    mutation_status: mutation.status,
    mutation_error: mutation.json.error,
    address_source: normalized.address_source,
    dns_addresses:
      normalized.address_source === "dns" ||
      normalized.address_source === "loopback_fixture"
        ? resolvedAddresses
        : [],
    endpoint_addresses:
      normalized.address_source === "ip_literal" ? resolvedAddresses : [],
    connected_addresses: sortedUnion(
      [ready.remote_address, head.remote_address, range.remote_address],
      [admin.remote_address, mutation.remote_address, headOnly.remote_address],
    ),
  });
}

export async function qualifyPublicSeed(
  endpoint,
  {
    sampleCount = DEFAULT_MIN_SAMPLES,
    intervalMs = 30_000,
    onSample,
    ...probeOptions
  } = {},
) {
  const count = assertSafeInteger(sampleCount, "sample count", { min: 1, max: 20 });
  const interval = assertSafeInteger(intervalMs, "sample interval", { min: 0, max: 3_600_000 });
  const samples = [];
  for (let index = 0; index < count; index += 1) {
    const sample = await probePublicSeedSample(endpoint, probeOptions);
    samples.push(sample);
    if (onSample) await onSample(sample, index + 1, count);
    if (index + 1 < count && interval > 0) {
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }
  return createQualificationReceipt({ endpoint, samples });
}
