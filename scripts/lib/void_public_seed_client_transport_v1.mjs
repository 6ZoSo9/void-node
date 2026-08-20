import http from "node:http";
import https from "node:https";
import net from "node:net";
import {
  DEFAULT_MAX_RESPONSE_BYTES,
  isPublicIpAddress,
  normalizeHostname,
  resolvePublicDns,
} from "./void_public_seed_qualification_v1.mjs";

const COMPILED_MAX_RESPONSE_BYTES = 128 * 1024 * 1024;

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

function plainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw terminalSeedResponse(`${label} must be an object`);
  }
  return value;
}

function positiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw terminalSeedResponse(`${label} must be a positive integer`);
  }
  return number;
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
  const candidate = block.number ?? block.header?.number;
  const number = Number(candidate);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function validateSeedResponse(route, bytes) {
  const parsedRoute = new URL(route, "http://seed.invalid");
  const value = parseJson(bytes, `seed ${parsedRoute.pathname} response`);

  if (parsedRoute.pathname === "/__void/ready.json") {
    const ready = plainObject(value, "seed readiness response");
    if (
      ready.ready !== true ||
      Number(ready.gap) !== 0 ||
      Number(ready.txroot_live) !== 1
    ) {
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
    positiveInteger(head.head ?? head.number, "seed head");
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

function requestPinnedAddress(
  target,
  address,
  { method, timeoutMs, maxBytes, allowLoopbackFixture },
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
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error instanceof Error ? error : new Error(String(error)));
    };

    const request = transport.request(
      target,
      {
        method,
        agent: false,
        family,
        autoSelectFamily: false,
        ...(tlsServername ? { servername: tlsServername } : {}),
        headers: {
          accept: "application/json",
          connection: "close",
          "user-agent": "void-node/public-seed-client-transport-v1",
        },
        lookup(_hostname, _options, callback) {
          callback(null, address, family);
        },
      },
      (response) => {
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
        if (!contentType.startsWith("application/json")) {
          response.destroy();
          fail(terminalSeedResponse("seed response is not application/json"));
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
          settled = true;
          resolve({
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
          settled = true;
          resolve({ status, contentType, bytes, remoteAddress: connected });
        });
      },
    );

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`seed request timed out after ${timeoutMs} ms`));
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
  } = {},
) {
  const normalizedMethod = String(method).toUpperCase();
  if (!new Set(["GET", "HEAD"]).has(normalizedMethod)) {
    throw new Error("public seed client transport permits only GET and HEAD");
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

  const addresses = await resolvePublicDns(peer.hostname, { allowLoopbackFixture });
  const failures = [];
  for (const address of addresses) {
    try {
      return await requestPinnedAddress(target, address, {
        method: normalizedMethod,
        timeoutMs: boundedTimeout,
        maxBytes: boundedBytes,
        allowLoopbackFixture,
      });
    } catch (error) {
      failures.push(`${address}: ${error?.message || String(error)}`);
      if (error?.terminalSeedResponse === true) throw error;
    }
  }
  throw new Error(`seed request failed on every pinned address: ${failures.join(" | ")}`);
}
