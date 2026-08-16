#!/usr/bin/env node
import http from "node:http";
import { once } from "node:events";
import { probePublicSeedSample } from "./lib/void_public_seed_probe_v1.mjs";

const MARKER = "VOID_PUBLIC_SEED_TOTAL_REQUEST_DEADLINE_V1";
const GREEN = `${MARKER}_GREEN`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function jsonResponse(response, status, body, { gateway = false } = {}) {
  const encoded = Buffer.from(JSON.stringify(body));
  response.writeHead(status, {
    "content-type": "application/json",
    "content-length": String(encoded.length),
    ...(gateway ? { "x-void-public-seed-gateway": "v1" } : {}),
  });
  response.end(encoded);
}

const readinessBody = JSON.stringify({
  ready: true,
  head: 10,
  gap: 0,
  txroot_live: 1,
});

const server = http.createServer((request, response) => {
  const url = new URL(request.url || "/", "http://127.0.0.1");

  if (request.method === "HEAD" && url.pathname === "/__void/ready.json") {
    response.writeHead(200, {
      "content-type": "application/json",
      "x-void-public-seed-gateway": "v1",
    });
    response.end();
    return;
  }

  if (request.method === "GET" && url.pathname === "/__void/ready.json") {
    response.writeHead(200, {
      "content-type": "application/json",
      "x-void-public-seed-gateway": "v1",
      connection: "close",
    });
    let offset = 0;
    const interval = setInterval(() => {
      if (response.destroyed) {
        clearInterval(interval);
        return;
      }
      if (offset >= readinessBody.length) {
        clearInterval(interval);
        response.end();
        return;
      }
      response.write(readinessBody[offset]);
      offset += 1;
    }, 25);
    response.once("close", () => clearInterval(interval));
    return;
  }

  if (request.method === "GET" && url.pathname === "/blocks/latest/number2.json") {
    jsonResponse(response, 200, { number: 10 }, { gateway: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/blocks/range") {
    jsonResponse(response, 200, { blocks: [{ number: 10 }] }, { gateway: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/admin") {
    jsonResponse(response, 404, { error: "route_not_public" });
    return;
  }

  if (request.method === "POST" && url.pathname === "/follower/start") {
    jsonResponse(response, 405, { error: "method_not_allowed" });
    return;
  }

  jsonResponse(response, 404, { error: "not_found" });
});

server.listen(0, "127.0.0.1");
await once(server, "listening");

const address = server.address();
assert(address && typeof address === "object", "loopback proof server did not bind");
const endpoint = `http://127.0.0.1:${address.port}`;
const timeoutMs = 120;
const startedAt = Date.now();
let observedError = null;

try {
  await probePublicSeedSample(endpoint, {
    allowLoopbackFixture: true,
    timeoutMs,
    maxBytes: 64 * 1024,
  });
} catch (error) {
  observedError = error;
} finally {
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
}

const elapsedMs = Date.now() - startedAt;
assert(observedError instanceof Error, "slow-drip response escaped the total request deadline");
assert(
  elapsedMs < 700,
  `slow-drip response outlived the total request deadline: elapsed_ms=${elapsedMs}`,
);
assert(
  /timed out|aborted/i.test(observedError.message),
  `unexpected slow-drip terminal error: ${observedError.message}`,
);

console.log(GREEN);
console.log(`timeout_ms=${timeoutMs}`);
console.log(`elapsed_ms=${elapsedMs}`);
console.log("slow_drip_activity_cannot_extend_total_deadline=true");
console.log("loopback_fixture_only=true");
console.log("runtime_mutation=false");
console.log("wallet_or_signer_use=false");
console.log("work_credit_mutation=false");
console.log("transaction_or_funds_movement=false");
