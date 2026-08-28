import http from "node:http";
import https from "node:https";
import net from "node:net";
import { performance } from "node:perf_hooks";
import {
  DEFAULT_MAX_RESPONSE_BYTES,
  isPublicIpAddress,
  normalizeHostname,
  resolvePublicDns,
} from "./void_public_seed_qualification_v1.mjs";

const COMPILED_MAX_RESPONSE_BYTES = 128 * 1024 * 1024;

const CHECKPOINT_DISCOVERY_ROUTE_V1 = "/__void/checkpoint/v1.json";
const CHECKPOINT_ID_RE_V1 = /^voidpbc1_[0-9a-f]{64}$/;
const CHECKPOINT_MANIFEST_PATH_RE_V1 =
  /^\/checkpoints\/v1\/(voidpbc1_[0-9a-f]{64})\/checkpoint\.json$/;
const CHECKPOINT_SEGMENT_PATH_RE_V1 =
  /^\/checkpoints\/v1\/(voidpbc1_[0-9a-f]{64})\/segments\/([0-9]{8})\/blocks\.bin$/;
const resolverFlightsByImpl = new WeakMap();

function normalizeConnectedAddress(address) {
  const value = String(address || "").split("%")[0].toLowerCase();
  if (value.startsWith("::ffff:") && net.isIP(value.slice(7)) === 4) {
    return value.slice(7);
  }
  return value;
}

function boundedInteger(raw, fallback, minimum, maximum) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
}

function terminalSeedResponse(message) {
  const error = new Error(message);
  error.terminalSeedResponse = true;
  return error;
}

function logicalDeadlineError(timeoutMs) {
  const error = new Error(`seed logical request deadline exceeded after ${timeoutMs} ms`);
  error.logicalSeedDeadline = true;
  return error;
}

function resolverFlightQuarantinedError(hostname) {
  const error = new Error(`seed DNS resolver flight is already owned for ${hostname}`);
  error.resolverFlightQuarantined = true;
  return error;
}

function remainingDeadlineMs(deadlineAtMs) {
  return Math.max(0, Math.ceil(deadlineAtMs - performance.now()));
}

function resolverFlight(hostname, { allowLoopbackFixture, resolvePublicDnsImpl }) {
  let flights = resolverFlightsByImpl.get(resolvePublicDnsImpl);
  if (!flights) {
    flights = new Map();
    resolverFlightsByImpl.set(resolvePublicDnsImpl, flights);
  }
  const key = `${allowLoopbackFixture ? "loopback" : "public"}:${hostname}`;
  const existing = flights.get(key);
  if (existing) return existing;

  const flight = {
    settled: false,
    value: null,
    error: null,
    waiter: null,
    quarantined: false,
  };
  flights.set(key, flight);

  Promise.resolve()
    .then(() => resolvePublicDnsImpl(hostname, { allowLoopbackFixture }))
    .then(
      (value) => {
        flight.settled = true;
        flight.value = value;
        const waiter = flight.waiter;
        flight.waiter = null;
        waiter?.resolve(value);
      },
      (error) => {
        flight.settled = true;
        flight.error = error instanceof Error ? error : new Error(String(error));
        const waiter = flight.waiter;
        flight.waiter = null;
        waiter?.reject(flight.error);
      },
    )
    .finally(() => {
      if (flights.get(key) === flight) flights.delete(key);
      if (flights.size === 0) resolverFlightsByImpl.delete(resolvePublicDnsImpl);
    });

  return flight;
}

function waitForResolverFlightWithinDeadline(flight, hostname, deadlineAtMs, timeoutMs) {
  if (flight.settled) {
    return flight.error ? Promise.reject(flight.error) : Promise.resolve(flight.value);
  }
  if (flight.quarantined || flight.waiter) {
    return Promise.reject(resolverFlightQuarantinedError(hostname));
  }

  return new Promise((resolve, reject) => {
    const remaining = remainingDeadlineMs(deadlineAtMs);
    if (remaining <= 0) {
      flight.quarantined = true;
      reject(logicalDeadlineError(timeoutMs));
      return;
    }

    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (flight.waiter === waiter) flight.waiter = null;
      callback(value);
    };
    const waiter = {
      resolve(value) {
        finish(resolve, value);
      },
      reject(error) {
        finish(reject, error);
      },
    };
    flight.waiter = waiter;
    const timer = setTimeout(() => {
      if (settled) return;
      flight.quarantined = true;
      finish(reject, logicalDeadlineError(timeoutMs));
    }, remaining);
  });
}

function plainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw terminalSeedResponse(`${label} must be an object`);
  }
  return value;
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function positiveInteger(value, label) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw terminalSeedResponse(`${label} must be a positive safe-integer JSON number`);
  }
  return value;
}

function nonnegativeInteger(value, label) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw terminalSeedResponse(`${label} must be a nonnegative safe-integer JSON number`);
  }
  return value;
}

function positiveIntegerAlternative(object, primaryKey, fallbackKey, label) {
  const primaryPresent = hasOwn(object, primaryKey);
  const fallbackPresent = hasOwn(object, fallbackKey);
  if (!primaryPresent && !fallbackPresent) {
    throw terminalSeedResponse(`${label} is missing`);
  }
  if (primaryPresent) {
    const primary = positiveInteger(object[primaryKey], `${label}.${primaryKey}`);
    if (fallbackPresent) {
      const fallback = positiveInteger(object[fallbackKey], `${label}.${fallbackKey}`);
      if (fallback !== primary) {
        throw terminalSeedResponse(`${label} primary/fallback values conflict`);
      }
    }
    return primary;
  }
  return positiveInteger(object[fallbackKey], `${label}.${fallbackKey}`);
}

function parseJson(bytes, label) {
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw terminalSeedResponse(`${label} is malformed JSON`);
  }
  return value;
}

function blockNumber(block) {
  if (!block || typeof block !== "object" || Array.isArray(block)) return null;
  const primaryPresent = hasOwn(block, "number");
  const header = block.header;
  const fallbackPresent =
    !!header && typeof header === "object" && !Array.isArray(header) && hasOwn(header, "number");

  if (!primaryPresent && !fallbackPresent) return null;
  try {
    if (primaryPresent) {
      const primary = nonnegativeInteger(block.number, "seed block number");
      if (fallbackPresent) {
        const fallback = nonnegativeInteger(header.number, "seed block header number");
        if (fallback !== primary) return null;
      }
      return primary;
    }
    return nonnegativeInteger(header.number, "seed block header number");
  } catch {
    return null;
  }
}

function exactResponseKeysV1(value, expected) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return (
    actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index])
  );
}

function validateCheckpointDiscoveryV1(value) {
  const root = plainObject(value, "checkpoint discovery response");
  if (!exactResponseKeysV1(root, [
    "schema",
    "network",
    "chain_id",
    "status",
    "checkpoint",
  ])) {
    throw terminalSeedResponse("checkpoint discovery key set mismatch");
  }
  if (
    root.schema !== "void_public_checkpoint_discovery_v1" ||
    root.network !== "VOID Network" ||
    root.chain_id !== 2050
  ) {
    throw terminalSeedResponse("checkpoint discovery domain mismatch");
  }

  if (root.status === "unavailable") {
    if (root.checkpoint !== null) {
      throw terminalSeedResponse("unavailable checkpoint discovery must carry null");
    }
    return;
  }
  if (root.status !== "available") {
    throw terminalSeedResponse("checkpoint discovery status is invalid");
  }

  const checkpoint = plainObject(root.checkpoint, "checkpoint discovery checkpoint");
  if (!exactResponseKeysV1(checkpoint, [
    "checkpoint_id",
    "manifest_sha256",
    "source_sha",
    "head",
    "block_count",
    "segment_count",
    "payload_bytes",
    "packet_base_path",
  ])) {
    throw terminalSeedResponse("checkpoint discovery checkpoint key set mismatch");
  }
  if (
    typeof checkpoint.checkpoint_id !== "string" ||
    !CHECKPOINT_ID_RE_V1.test(checkpoint.checkpoint_id) ||
    typeof checkpoint.manifest_sha256 !== "string" ||
    !/^[0-9a-f]{64}$/.test(checkpoint.manifest_sha256) ||
    typeof checkpoint.source_sha !== "string" ||
    !/^[0-9a-f]{40}$/.test(checkpoint.source_sha)
  ) {
    throw terminalSeedResponse("checkpoint discovery identity is malformed");
  }

  const head = nonnegativeInteger(checkpoint.head, "checkpoint discovery head");
  const blockCount = positiveInteger(
    checkpoint.block_count,
    "checkpoint discovery block count",
  );
  const segmentCount = positiveInteger(
    checkpoint.segment_count,
    "checkpoint discovery segment count",
  );
  positiveInteger(checkpoint.payload_bytes, "checkpoint discovery payload bytes");

  if (blockCount !== head + 1) {
    throw terminalSeedResponse("checkpoint discovery block count does not match head");
  }
  if (segmentCount !== Math.floor(head / 10_000) + 1) {
    throw terminalSeedResponse("checkpoint discovery segment count does not match head");
  }

  const expectedBase = `/checkpoints/v1/${checkpoint.checkpoint_id}`;
  if (checkpoint.packet_base_path !== expectedBase) {
    throw terminalSeedResponse("checkpoint discovery packet base path mismatch");
  }
}

function validateCheckpointManifestV1(route, value) {
  const match = CHECKPOINT_MANIFEST_PATH_RE_V1.exec(route.pathname);
  if (!match) {
    throw terminalSeedResponse("checkpoint manifest route is malformed");
  }
  const manifest = plainObject(value, "checkpoint manifest");
  if (
    manifest.schema !== "void_public_canonical_checkpoint_v1" ||
    manifest.network !== "VOID Network" ||
    manifest.chain_id !== 2050 ||
    manifest.format !== "blocks-bin-only-v1" ||
    manifest.checkpoint_id !== match[1] ||
    typeof manifest.source_sha !== "string" ||
    !/^[0-9a-f]{40}$/.test(manifest.source_sha) ||
    typeof manifest.head !== "number" ||
    !Number.isSafeInteger(manifest.head) ||
    manifest.head < 0 ||
    manifest.block_count !== manifest.head + 1 ||
    manifest.segment_span !== 10_000 ||
    !Array.isArray(manifest.segments) ||
    manifest.segments.length !== manifest.segment_count
  ) {
    throw terminalSeedResponse("checkpoint manifest contract mismatch");
  }
}

function validateSeedResponse(route, bytes) {
  const parsedRoute = new URL(route, "http://seed.invalid");

  if (CHECKPOINT_SEGMENT_PATH_RE_V1.test(parsedRoute.pathname)) {
    if (parsedRoute.search !== "" || bytes.length === 0) {
      throw terminalSeedResponse("checkpoint segment response is invalid");
    }
    return;
  }

  const value = parseJson(bytes, `seed ${parsedRoute.pathname} response`);

  if (parsedRoute.pathname === CHECKPOINT_DISCOVERY_ROUTE_V1) {
    validateCheckpointDiscoveryV1(value);
    return;
  }

  if (CHECKPOINT_MANIFEST_PATH_RE_V1.test(parsedRoute.pathname)) {
    validateCheckpointManifestV1(parsedRoute, value);
    return;
  }

  if (parsedRoute.pathname === "/__void/ready.json") {
    const ready = plainObject(value, "seed readiness response");
    if (ready.ready !== true || ready.gap !== 0 || ready.txroot_live !== 1) {
      throw terminalSeedResponse("seed readiness response is not exact-green");
    }
    positiveInteger(ready.head, "seed readiness head");
    return;
  }

  if (parsedRoute.pathname === "/blocks/latest/number2.json") {
    const head = plainObject(value, "seed latest-head response");
    positiveInteger(head.number, "seed latest-head number");
    return;
  }

  if (parsedRoute.pathname === "/head") {
    const head = plainObject(value, "seed head response");
    positiveIntegerAlternative(head, "head", "number", "seed head");
    return;
  }

  if (parsedRoute.pathname === "/__void/demo/summary.json") {
    const summary = plainObject(value, "seed summary response");
    const chain = plainObject(summary.chain, "seed summary chain");
    positiveInteger(chain.head, "seed summary head");
    return;
  }

  if (parsedRoute.pathname === "/api/health") {
    const health = plainObject(value, "seed health response");
    if (health.ok !== true) {
      throw terminalSeedResponse("seed health response is not ok");
    }
    if (health.head !== undefined) positiveInteger(health.head, "seed health head");
    return;
  }

  if (parsedRoute.pathname === "/blocks/range") {
    const from = Number(parsedRoute.searchParams.get("from"));
    const to = Number(parsedRoute.searchParams.get("to"));
    if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 0 || to < from) {
      throw terminalSeedResponse("seed range request bounds are invalid");
    }
    const blocks = Array.isArray(value)
      ? value
      : Array.isArray(value?.blocks)
        ? value.blocks
        : null;
    if (!blocks) {
      throw terminalSeedResponse("seed block-range response must contain a blocks array");
    }
    const expectedLength = to - from + 1;
    if (blocks.length !== expectedLength) {
      throw terminalSeedResponse(
        `seed block-range response length ${blocks.length} does not match ${expectedLength}`,
      );
    }
    for (let index = 0; index < blocks.length; index += 1) {
      const actual = blockNumber(blocks[index]);
      const expected = from + index;
      if (actual !== expected) {
        throw terminalSeedResponse(
          `seed block-range response is not contiguous at index ${index}: expected ${expected}, got ${String(actual)}`,
        );
      }
    }
    return;
  }

  throw terminalSeedResponse(`seed response route is unsupported: ${parsedRoute.pathname}`);
}

export function publicSeedTlsServernameV1(targetValue) {
  const target = targetValue instanceof URL ? targetValue : new URL(String(targetValue));
  if (target.protocol !== "https:") return null;
  const hostname = normalizeHostname(target.hostname);
  return net.isIP(hostname) ? null : hostname;
}

function checkpointSegmentRouteV1(pathname) {
  return CHECKPOINT_SEGMENT_PATH_RE_V1.test(pathname);
}

function seedAcceptHeaderV1(pathname) {
  return checkpointSegmentRouteV1(pathname)
    ? "application/octet-stream"
    : "application/json";
}

function seedContentTypeAcceptedV1(pathname, contentType) {
  if (checkpointSegmentRouteV1(pathname)) {
    return contentType.startsWith("application/octet-stream");
  }
  return contentType.startsWith("application/json");
}

function requestPinnedAddress(
  target,
  address,
  { method, timeoutMs, deadlineAtMs, maxBytes, allowLoopbackFixture },
) {
  const family = net.isIP(address);
  if (!family) throw new Error(`seed address is invalid: ${address}`);
  if (!allowLoopbackFixture && !isPublicIpAddress(address)) {
    throw new Error(`seed address is not public: ${address}`);
  }

  const transport = target.protocol === "https:" ? https : http;
  const tlsServername = publicSeedTlsServernameV1(target);
  return new Promise((resolve, reject) => {
    let settled = false;
    let responseRef = null;
    let wallTimer = null;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      if (wallTimer) clearTimeout(wallTimer);
      callback(value);
    };
    const fail = (error) => {
      finish(reject, error instanceof Error ? error : new Error(String(error)));
    };

    const remaining = remainingDeadlineMs(deadlineAtMs);
    if (remaining <= 0) {
      fail(logicalDeadlineError(timeoutMs));
      return;
    }

    const request = transport.request(
      target,
      {
        method,
        agent: false,
        family,
        autoSelectFamily: false,
        ...(tlsServername ? { servername: tlsServername } : {}),
        headers: {
          accept: seedAcceptHeaderV1(target.pathname),
          connection: "close",
          "user-agent": "void-node/public-seed-client-transport-v1",
        },
        lookup(_hostname, _options, callback) {
          callback(null, address, family);
        },
      },
      (response) => {
        responseRef = response;
        if (remainingDeadlineMs(deadlineAtMs) <= 0) {
          response.destroy();
          fail(logicalDeadlineError(timeoutMs));
          return;
        }
        const connected = normalizeConnectedAddress(response.socket?.remoteAddress);
        const expected = normalizeConnectedAddress(address);
        if (!connected || connected !== expected) {
          response.destroy();
          fail(
            new Error(
              `seed request connected to unexpected address ${connected || "unknown"}; expected ${expected}`,
            ),
          );
          return;
        }
        if (!allowLoopbackFixture && !isPublicIpAddress(connected)) {
          response.destroy();
          fail(new Error(`seed request connected to non-public address ${connected}`));
          return;
        }

        const status = Number(response.statusCode || 0);
        if (status >= 300 && status < 400) {
          response.destroy();
          fail(terminalSeedResponse(`seed request redirected with HTTP ${status}`));
          return;
        }
        if (status !== 200) {
          response.destroy();
          fail(terminalSeedResponse(`seed request returned HTTP ${status}`));
          return;
        }

        const gateway = String(response.headers["x-void-public-seed-gateway"] || "").trim();
        if (gateway !== "v1") {
          response.destroy();
          fail(terminalSeedResponse("seed response is missing x-void-public-seed-gateway: v1"));
          return;
        }
        const contentType = String(response.headers["content-type"] || "").toLowerCase();
        if (!seedContentTypeAcceptedV1(target.pathname, contentType)) {
          response.destroy();
          fail(terminalSeedResponse("seed response content-type is not accepted for route"));
          return;
        }

        const advertised = Number(response.headers["content-length"] || 0);
        if (Number.isFinite(advertised) && advertised > maxBytes) {
          response.destroy();
          fail(terminalSeedResponse("seed response advertised an oversized body"));
          return;
        }

        if (method === "HEAD") {
          response.resume();
          finish(resolve, {
            status,
            contentType,
            bytes: Buffer.alloc(0),
            remoteAddress: connected,
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
            fail(terminalSeedResponse("seed response exceeded the body limit"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("aborted", () => fail(new Error("seed response was aborted")));
        response.on("error", fail);
        response.on("end", () => {
          if (settled) return;
          const bytes = Buffer.concat(chunks, total);
          try {
            validateSeedResponse(`${target.pathname}${target.search}`, bytes);
          } catch (error) {
            fail(error);
            return;
          }
          finish(resolve, { status, contentType, bytes, remoteAddress: connected });
        });
      },
    );

    wallTimer = setTimeout(() => {
      if (settled) return;
      const error = logicalDeadlineError(timeoutMs);
      finish(reject, error);
      responseRef?.destroy(error);
      request.destroy(error);
    }, remaining);
    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`seed request inactivity timeout after ${timeoutMs} ms`));
    });
    request.on("error", fail);
    request.end();
  });
}

export async function requestPublicSeedRouteV1(
  peer,
  route,
  {
    method = "GET",
    timeoutMs = 15_000,
    maxBytes = DEFAULT_MAX_RESPONSE_BYTES,
    allowLoopbackFixture = false,
    logicalDeadlineAtMs = null,
    resolvePublicDnsImpl = resolvePublicDns,
  } = {},
) {
  const normalizedMethod = String(method).toUpperCase();
  if (!new Set(["GET", "HEAD"]).has(normalizedMethod)) {
    throw new Error("public seed client transport permits only GET and HEAD");
  }
  if (typeof resolvePublicDnsImpl !== "function") {
    throw new Error("public seed DNS resolver must be a function");
  }
  const boundedTimeout = boundedInteger(timeoutMs, 15_000, 1_000, 60_000);
  const boundedBytes = boundedInteger(
    maxBytes,
    DEFAULT_MAX_RESPONSE_BYTES,
    64 * 1024,
    COMPILED_MAX_RESPONSE_BYTES,
  );
  const target = new URL(route, `${peer.base}/`);
  if (target.origin !== peer.base) throw new Error("public seed route escaped its peer origin");

  const startedAtMs = performance.now();
  const localDeadlineAtMs = startedAtMs + boundedTimeout;
  const inheritedDeadlineAtMs =
    typeof logicalDeadlineAtMs === "number" && Number.isFinite(logicalDeadlineAtMs)
      ? logicalDeadlineAtMs
      : localDeadlineAtMs;
  const deadlineAtMs = Math.min(localDeadlineAtMs, inheritedDeadlineAtMs);
  if (remainingDeadlineMs(deadlineAtMs) <= 0) throw logicalDeadlineError(boundedTimeout);

  const flight = resolverFlight(peer.hostname, { allowLoopbackFixture, resolvePublicDnsImpl });
  const addresses = await waitForResolverFlightWithinDeadline(
    flight,
    peer.hostname,
    deadlineAtMs,
    boundedTimeout,
  );
  const failures = [];
  for (const address of addresses) {
    if (remainingDeadlineMs(deadlineAtMs) <= 0) throw logicalDeadlineError(boundedTimeout);
    try {
      return await requestPinnedAddress(target, address, {
        method: normalizedMethod,
        timeoutMs: boundedTimeout,
        deadlineAtMs,
        maxBytes: boundedBytes,
        allowLoopbackFixture,
      });
    } catch (error) {
      failures.push(`${address}: ${error?.message || String(error)}`);
      if (error?.terminalSeedResponse === true || error?.logicalSeedDeadline === true) throw error;
    }
  }
  throw new Error(`seed request failed on every pinned address: ${failures.join(" | ")}`);
}
