import http from "node:http";
import https from "node:https";
import net from "node:net";
import {
  DEFAULT_MAX_RESPONSE_BYTES,
  isPublicIpAddress,
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

function requestPinnedAddress(
  target,
  address,
  {
    method,
    timeoutMs,
    maxBytes,
    allowLoopbackFixture,
  },
) {
  const family = net.isIP(address);
  if (!family) throw new Error(`seed address is invalid: ${address}`);
  if (!allowLoopbackFixture && !isPublicIpAddress(address)) {
    throw new Error(`seed address is not public: ${address}`);
  }

  const transport = target.protocol === "https:" ? https : http;
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
          fail(new Error(`seed request redirected with HTTP ${status}`));
          return;
        }
        if (status !== 200) {
          response.destroy();
          fail(new Error(`seed request returned HTTP ${status}`));
          return;
        }

        const gateway = String(response.headers["x-void-public-seed-gateway"] || "").trim();
        if (gateway !== "v1") {
          response.destroy();
          fail(new Error("seed response is missing x-void-public-seed-gateway: v1"));
          return;
        }
        const contentType = String(response.headers["content-type"] || "").toLowerCase();
        if (!contentType.startsWith("application/json")) {
          response.destroy();
          fail(new Error("seed response is not application/json"));
          return;
        }

        const advertised = Number(response.headers["content-length"] || 0);
        if (Number.isFinite(advertised) && advertised > maxBytes) {
          response.destroy();
          fail(new Error("seed response advertised an oversized body"));
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
            fail(new Error("seed response exceeded the body limit"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("aborted", () => fail(new Error("seed response was aborted")));
        response.on("error", fail);
        response.on("end", () => {
          if (settled) return;
          settled = true;
          resolve({
            status,
            contentType,
            bytes: Buffer.concat(chunks, total),
            remoteAddress: connected,
          });
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
    }
  }
  throw new Error(`seed request failed on every pinned address: ${failures.join(" | ")}`);
}
