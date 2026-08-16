#!/usr/bin/env node
import http from "node:http";
import { once } from "node:events";
import {
  probePublicSeedSample,
  requestBounded,
} from "./lib/void_public_seed_probe_v1.mjs";

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

const slowDripServer = http.createServer((request, response) => {
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

slowDripServer.listen(0, "127.0.0.1");
await once(slowDripServer, "listening");

const slowDripAddress = slowDripServer.address();
assert(slowDripAddress && typeof slowDripAddress === "object", "loopback proof server did not bind");
const endpoint = `http://127.0.0.1:${slowDripAddress.port}`;
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
  slowDripServer.closeAllConnections?.();
  await new Promise((resolve) => slowDripServer.close(resolve));
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

let firstAddressRequests = 0;
let secondAddressRequests = 0;
const firstAddressServer = http.createServer((_request, response) => {
  firstAddressRequests += 1;
  response.writeHead(200, {
    "content-type": "application/json",
    connection: "close",
  });
  response.write("{");
  const timer = setTimeout(() => response.destroy(), 400);
  response.once("close", () => clearTimeout(timer));
});
firstAddressServer.listen(0, "127.0.0.2");
await once(firstAddressServer, "listening");
const firstAddress = firstAddressServer.address();
assert(firstAddress && typeof firstAddress === "object", "first failover fixture did not bind");

const secondAddressServer = http.createServer((_request, response) => {
  secondAddressRequests += 1;
  response.writeHead(200, {
    "content-type": "application/json",
    connection: "close",
  });
  response.write("{");
});
secondAddressServer.listen(firstAddress.port, "127.0.0.1");
await once(secondAddressServer, "listening");

const logicalTimeoutMs = 600;
const failoverStartedAt = Date.now();
let failoverError = null;
try {
  await requestBounded(`http://seed-fixture.invalid:${firstAddress.port}/probe`, {
    timeoutMs: logicalTimeoutMs,
    maxBytes: 64 * 1024,
    pinnedAddresses: ["127.0.0.2", "127.0.0.1"],
    allowLoopbackFixture: true,
  });
} catch (error) {
  failoverError = error;
} finally {
  firstAddressServer.closeAllConnections?.();
  secondAddressServer.closeAllConnections?.();
  await Promise.all([
    new Promise((resolve) => firstAddressServer.close(resolve)),
    new Promise((resolve) => secondAddressServer.close(resolve)),
  ]);
}
const failoverElapsedMs = Date.now() - failoverStartedAt;

assert(failoverError instanceof Error, "multi-address fixture escaped the logical request deadline");
assert(firstAddressRequests === 1, `first address attempts=${firstAddressRequests}; expected 1`);
assert(secondAddressRequests === 1, `second address attempts=${secondAddressRequests}; expected 1`);
assert(
  failoverElapsedMs >= 350,
  `first address did not consume the intended budget: elapsed_ms=${failoverElapsedMs}`,
);
assert(
  failoverElapsedMs < 850,
  `pinned-address failover received a fresh timeout budget: elapsed_ms=${failoverElapsedMs}`,
);
assert(
  /timed out|aborted/i.test(failoverError.message),
  `unexpected multi-address terminal error: ${failoverError.message}`,
);

console.log(GREEN);
console.log(`timeout_ms=${timeoutMs}`);
console.log(`elapsed_ms=${elapsedMs}`);
console.log(`multi_address_timeout_ms=${logicalTimeoutMs}`);
console.log(`multi_address_elapsed_ms=${failoverElapsedMs}`);
console.log("slow_drip_activity_cannot_extend_total_deadline=true");
console.log("multi_address_failover_shares_one_logical_deadline=true");
console.log("socket_inactivity_timeout_retained=true");
console.log("loopback_fixture_only=true");
console.log("runtime_mutation=false");
console.log("wallet_or_signer_use=false");
console.log("work_credit_mutation=false");
console.log("transaction_or_funds_movement=false");
