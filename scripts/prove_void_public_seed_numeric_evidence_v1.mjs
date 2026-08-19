#!/usr/bin/env node
import http from "node:http";
import { once } from "node:events";
import { performance } from "node:perf_hooks";
import { requestPublicSeedRouteV1 } from "./lib/void_public_seed_client_transport_v1.mjs";
import { createPublicSeedClientAdapterV1 } from "../tools/void-public-seed-client-adapter-v1.mjs";

const LOOPBACK = "127.0.0.1";
const LOOPBACK_ALT = "127.0.0.2";
const MARKER = "VOID_PUBLIC_SEED_NUMERIC_EVIDENCE_V1_PROOF_GREEN";
const DEADLINE_MS = 1_000;
const DEADLINE_MARGIN_MS = 450;

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function listen(server, host = LOOPBACK, port = 0) {
  server.listen(port, host);
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address === "object", "fixture server address unavailable");
  return address.port;
}

async function forceClose(server) {
  if (!server?.listening) return;
  const closed = once(server, "close");
  server.close();
  server.closeAllConnections?.();
  await closed;
}

function sendJson(res, status, body) {
  const bytes = Buffer.from(`${JSON.stringify(body)}\n`);
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("content-length", String(bytes.length));
  res.setHeader("x-void-public-seed-gateway", "v1");
  res.end(bytes);
}

function createDelayedSocketFailureServer(delayMs) {
  return http.createServer((req) => {
    setTimeout(() => req.socket.destroy(), delayMs);
  });
}

function createSlowDripServer() {
  return http.createServer((_req, res) => {
    res.statusCode = 200;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.setHeader("x-void-public-seed-gateway", "v1");
    res.write('{"ready":true');
    const interval = setInterval(() => {
      if (!res.destroyed) res.write(" ");
    }, 50);
    res.on("close", () => clearInterval(interval));
  });
}

let responseBody = { ready: true, head: 2000, gap: 0, txroot_live: 1 };
const server = http.createServer((_req, res) => {
  sendJson(res, 200, responseBody);
});

const port = await listen(server);
const peer = {
  base: `http://${LOOPBACK}:${port}`,
  hostname: LOOPBACK,
};
const options = {
  timeoutMs: DEADLINE_MS,
  maxBytes: 64 * 1024,
  allowLoopbackFixture: true,
};

async function request(route, body, extraOptions = {}) {
  responseBody = body;
  return requestPublicSeedRouteV1(peer, route, { ...options, ...extraOptions });
}

async function accept(route, body, label) {
  const response = await request(route, body);
  assert(response.status === 200, `${label}: expected HTTP 200`);
}

async function reject(route, body, label) {
  let rejected = null;
  try {
    await request(route, body);
  } catch (error) {
    rejected = error;
  }
  assert(rejected, `${label}: invalid remote numeric evidence was accepted`);
  assert(
    rejected.terminalSeedResponse === true,
    `${label}: rejection was not terminal origin evidence: ${rejected.message}`,
  );
}

async function rejectAdapterControls(overrides, label) {
  let adapter = null;
  let rejected = null;
  try {
    adapter = await createPublicSeedClientAdapterV1({
      peers: `http://${LOOPBACK}:${port}`,
      host: LOOPBACK,
      port: 0,
      timeoutMs: DEADLINE_MS,
      maxBytes: 64 * 1024,
      allowLoopbackFixture: true,
      ...overrides,
    });
  } catch (error) {
    rejected = error;
  } finally {
    if (adapter) await forceClose(adapter.server);
  }
  assert(rejected, `${label}: invalid adapter numeric control was accepted`);
}

try {
  await accept(
    "/__void/ready.json",
    { ready: true, head: 2000, gap: 0, txroot_live: 1 },
    "canonical readiness numbers",
  );
  await accept(
    "/blocks/latest/number2.json",
    { number: Number.MAX_SAFE_INTEGER },
    "maximum safe latest-head number",
  );
  await accept("/head", { head: 2000 }, "canonical head number");
  await accept("/head", { number: 2000 }, "canonical head fallback number");
  await accept("/head", { head: 2000, number: 2000 }, "matching head dual evidence");
  await accept("/__void/demo/summary.json", { chain: { head: 2000 } }, "canonical summary head");
  await accept("/api/health", { ok: true, head: 2000 }, "canonical health head");
  await accept("/api/health", { ok: true }, "optional health head omitted");
  await accept(
    "/blocks/range?from=0&to=2",
    {
      blocks: [
        { number: 0 },
        { header: { number: 1 } },
        { number: 2, header: { number: 2 } },
      ],
    },
    "canonical block numbers including exact fallback and matching dual evidence",
  );

  for (const [label, body] of [
    ["readiness gap string", { ready: true, head: 2000, gap: "0", txroot_live: 1 }],
    ["readiness gap boolean", { ready: true, head: 2000, gap: false, txroot_live: 1 }],
    ["readiness gap array", { ready: true, head: 2000, gap: [0], txroot_live: 1 }],
    ["readiness txroot string", { ready: true, head: 2000, gap: 0, txroot_live: "1" }],
    ["readiness txroot boolean", { ready: true, head: 2000, gap: 0, txroot_live: true }],
    ["readiness txroot array", { ready: true, head: 2000, gap: 0, txroot_live: [1] }],
    ["readiness head string", { ready: true, head: "2000", gap: 0, txroot_live: 1 }],
    ["readiness head boolean", { ready: true, head: true, gap: 0, txroot_live: 1 }],
    ["readiness head array", { ready: true, head: [2000], gap: 0, txroot_live: 1 }],
    ["readiness head unsafe", { ready: true, head: Number.MAX_SAFE_INTEGER + 1, gap: 0, txroot_live: 1 }],
  ]) {
    await reject("/__void/ready.json", body, label);
  }

  await reject("/blocks/latest/number2.json", { number: [2000] }, "latest-head array");
  await reject(
    "/blocks/latest/number2.json",
    { number: Number.MAX_SAFE_INTEGER + 1 },
    "latest-head unsafe number",
  );
  await reject("/head", { head: true }, "head boolean");
  await reject("/head", { number: "2000" }, "head fallback string");
  await reject("/head", { head: null, number: 2000 }, "head null primary with valid fallback");
  await reject("/head", { head: "2000", number: 2000 }, "head wrong-type primary with valid fallback");
  await reject("/head", { head: 2000, number: 2001 }, "head conflicting dual evidence");
  await reject(
    "/__void/demo/summary.json",
    { chain: { head: "2000" } },
    "summary head string",
  );
  await reject("/api/health", { ok: true, head: [2000] }, "health head array");

  await reject(
    "/blocks/range?from=0&to=0",
    { blocks: [{ number: "0" }] },
    "range block string",
  );
  await reject(
    "/blocks/range?from=0&to=0",
    { blocks: [{ number: false }] },
    "range block boolean",
  );
  await reject(
    "/blocks/range?from=0&to=0",
    { blocks: [{ number: [0] }] },
    "range block array",
  );
  await reject(
    "/blocks/range?from=0&to=0",
    { blocks: [{ number: null, header: { number: 0 } }] },
    "range null primary with valid fallback",
  );
  await reject(
    "/blocks/range?from=0&to=0",
    { blocks: [{ number: "0", header: { number: 0 } }] },
    "range wrong-type primary with valid fallback",
  );
  await reject(
    "/blocks/range?from=0&to=0",
    { blocks: [{ number: 0, header: { number: 1 } }] },
    "range conflicting dual evidence",
  );
  await reject(
    "/blocks/range?from=0&to=1",
    { blocks: [{ number: 0 }, { header: { number: "1" } }] },
    "range header number string",
  );

  for (const [label, overrides] of [
    ["adapter port trailing junk", { port: "4191junk" }],
    ["adapter port numeric string", { port: "4191" }],
    ["adapter port boolean", { port: true }],
    ["adapter port array", { port: [4191] }],
    ["adapter port object", { port: { value: 4191 } }],
    ["adapter port fraction", { port: 4191.5 }],
    ["adapter port negative", { port: -1 }],
    ["adapter port overflow", { port: 65536 }],
    ["adapter port NaN", { port: Number.NaN }],
    ["adapter port infinity", { port: Number.POSITIVE_INFINITY }],
    ["adapter timeout string", { timeoutMs: "1000" }],
    ["adapter timeout fraction", { timeoutMs: 1000.5 }],
    ["adapter timeout boolean", { timeoutMs: true }],
    ["adapter timeout below minimum", { timeoutMs: 999 }],
    ["adapter timeout above maximum", { timeoutMs: 60001 }],
    ["adapter timeout NaN", { timeoutMs: Number.NaN }],
    ["adapter maxBytes string", { maxBytes: String(64 * 1024) }],
    ["adapter maxBytes fraction", { maxBytes: 64 * 1024 + 0.5 }],
    ["adapter maxBytes boolean", { maxBytes: false }],
    ["adapter maxBytes below minimum", { maxBytes: 64 * 1024 - 1 }],
    ["adapter maxBytes above maximum", { maxBytes: 128 * 1024 * 1024 + 1 }],
    ["adapter maxBytes infinity", { maxBytes: Number.POSITIVE_INFINITY }],
  ]) {
    await rejectAdapterControls(overrides, label);
  }

  const normalPortFixture = http.createServer();
  const normalAdapterPort = await listen(normalPortFixture);
  await forceClose(normalPortFixture);
  let normalPortAdapter = null;
  try {
    normalPortAdapter = await createPublicSeedClientAdapterV1({
      peers: `http://${LOOPBACK}:${port}`,
      host: LOOPBACK,
      port: normalAdapterPort,
      timeoutMs: DEADLINE_MS,
      maxBytes: 64 * 1024,
      allowLoopbackFixture: true,
    });
    assert(
      normalPortAdapter.port === normalAdapterPort,
      `canonical numeric TCP port drifted: ${String(normalPortAdapter.port)}`,
    );
  } finally {
    if (normalPortAdapter) await forceClose(normalPortAdapter.server);
  }

  let resolverCalls = 0;
  let rejectStalledResolver = null;
  let resolverMode = "stall";
  const stalledResolver = new Promise((_resolve, rejectPromise) => {
    rejectStalledResolver = rejectPromise;
  });
  const resolver = async () => {
    resolverCalls += 1;
    if (resolverMode === "stall") return stalledResolver;
    return [LOOPBACK];
  };
  const dnsPeer = { base: `http://seed.test:${port}`, hostname: "seed.test" };
  const dnsStartedAt = performance.now();
  const dnsRequestOne = requestPublicSeedRouteV1(dnsPeer, "/__void/ready.json", {
    ...options,
    resolvePublicDnsImpl: resolver,
  });
  await delay(20);
  const dnsRequestTwo = requestPublicSeedRouteV1(dnsPeer, "/__void/ready.json", {
    ...options,
    resolvePublicDnsImpl: resolver,
  });
  const dnsResults = await Promise.allSettled([dnsRequestOne, dnsRequestTwo]);
  const dnsElapsedMs = performance.now() - dnsStartedAt;
  assert(
    dnsResults[0].status === "rejected" && dnsResults[0].reason?.logicalSeedDeadline === true,
    `stalled DNS owner did not terminate at its logical deadline: ${dnsResults[0].status === "rejected" ? dnsResults[0].reason?.message : "fulfilled"}`,
  );
  assert(
    dnsResults[1].status === "rejected" &&
      dnsResults[1].reason?.resolverFlightQuarantined === true,
    `concurrent stalled DNS retry was not quarantined: ${dnsResults[1].status === "rejected" ? dnsResults[1].reason?.message : "fulfilled"}`,
  );
  assert(resolverCalls === 1, `stalled DNS retries spawned ${resolverCalls} resolver generations`);
  assert(
    dnsElapsedMs < DEADLINE_MS + DEADLINE_MARGIN_MS,
    `stalled DNS generation escaped logical deadline: ${dnsElapsedMs.toFixed(1)} ms`,
  );

  const quarantineStartedAt = performance.now();
  for (let attempt = 0; attempt < 64; attempt += 1) {
    let retryError = null;
    try {
      await requestPublicSeedRouteV1(dnsPeer, "/__void/ready.json", {
        ...options,
        resolvePublicDnsImpl: resolver,
      });
    } catch (error) {
      retryError = error;
    }
    assert(
      retryError?.resolverFlightQuarantined === true,
      `stalled DNS retry ${attempt + 1} attached a new waiter instead of quarantining`,
    );
  }
  const quarantineElapsedMs = performance.now() - quarantineStartedAt;
  assert(
    resolverCalls === 1,
    `quarantined stalled DNS retries spawned ${resolverCalls} resolver generations`,
  );
  assert(
    quarantineElapsedMs < DEADLINE_MS,
    `quarantined stalled DNS retries waited on the unresolved generation: ${quarantineElapsedMs.toFixed(1)} ms`,
  );

  resolverMode = "healthy";
  rejectStalledResolver(new Error("late fixture DNS rejection"));
  await delay(20);
  responseBody = { ready: true, head: 2000, gap: 0, txroot_live: 1 };
  const dnsRecovery = await requestPublicSeedRouteV1(dnsPeer, "/__void/ready.json", {
    ...options,
    resolvePublicDnsImpl: resolver,
  });
  assert(dnsRecovery.status === 200, "transport did not recover after late DNS settlement");
  assert(resolverCalls === 2, `DNS flight was not released after settlement: ${resolverCalls}`);

  const multiAddressSlow = createSlowDripServer();
  const multiAddressPort = await listen(multiAddressSlow, LOOPBACK);
  const multiAddressDelay = createDelayedSocketFailureServer(700);
  await listen(multiAddressDelay, LOOPBACK_ALT, multiAddressPort);
  try {
    const multiAddressPeer = {
      base: `http://seed-multi.test:${multiAddressPort}`,
      hostname: "seed-multi.test",
    };
    const multiAddressStartedAt = performance.now();
    let multiAddressError = null;
    try {
      await requestPublicSeedRouteV1(multiAddressPeer, "/__void/ready.json", {
        ...options,
        resolvePublicDnsImpl: async () => [LOOPBACK_ALT, LOOPBACK],
      });
    } catch (error) {
      multiAddressError = error;
    }
    const multiAddressElapsedMs = performance.now() - multiAddressStartedAt;
    assert(
      multiAddressError?.logicalSeedDeadline === true,
      `multi-address request did not terminate as logical deadline: ${multiAddressError?.message}`,
    );
    assert(
      multiAddressElapsedMs < DEADLINE_MS + DEADLINE_MARGIN_MS,
      `multi-address attempts refreshed the timeout: ${multiAddressElapsedMs.toFixed(1)} ms`,
    );
  } finally {
    await forceClose(multiAddressDelay);
    await forceClose(multiAddressSlow);
  }

  const firstPeerServer = createDelayedSocketFailureServer(700);
  const secondPeerServer = createSlowDripServer();
  const firstPeerPort = await listen(firstPeerServer);
  const secondPeerPort = await listen(secondPeerServer);
  let adapter = null;
  try {
    adapter = await createPublicSeedClientAdapterV1({
      peers: `http://${LOOPBACK}:${firstPeerPort},http://${LOOPBACK}:${secondPeerPort}`,
      host: LOOPBACK,
      port: 0,
      timeoutMs: DEADLINE_MS,
      maxBytes: 64 * 1024,
      allowLoopbackFixture: true,
    });
    const adapterStartedAt = performance.now();
    const adapterResponse = await fetch(`${adapter.base}/__void/ready.json`);
    const adapterElapsedMs = performance.now() - adapterStartedAt;
    assert(adapterResponse.status === 502, `adapter deadline fixture returned ${adapterResponse.status}`);
    const adapterBody = await adapterResponse.json();
    assert(adapterBody.error === "all_public_seed_peers_failed", "adapter deadline failure shape drifted");
    assert(
      adapterElapsedMs < DEADLINE_MS + DEADLINE_MARGIN_MS,
      `adapter peer failover refreshed the logical timeout: ${adapterElapsedMs.toFixed(1)} ms`,
    );
  } finally {
    if (adapter) await forceClose(adapter.server);
    await forceClose(firstPeerServer);
    await forceClose(secondPeerServer);
  }

  console.log(MARKER);
} finally {
  await forceClose(server);
}
