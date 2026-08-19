#!/usr/bin/env node
import http from "node:http";
import { once } from "node:events";
import { requestPublicSeedRouteV1 } from "./lib/void_public_seed_client_transport_v1.mjs";

const LOOPBACK = "127.0.0.1";
const MARKER = "VOID_PUBLIC_SEED_NUMERIC_EVIDENCE_V1_PROOF_GREEN";

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

async function listen(server) {
  server.listen(0, LOOPBACK);
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address === "object", "fixture server address unavailable");
  return address.port;
}

async function close(server) {
  if (!server.listening) return;
  server.close();
  await once(server, "close");
}

let responseBody = { ready: true, head: 2000, gap: 0, txroot_live: 1 };
const server = http.createServer((_req, res) => {
  const bytes = Buffer.from(`${JSON.stringify(responseBody)}\n`);
  res.statusCode = 200;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("content-length", String(bytes.length));
  res.setHeader("x-void-public-seed-gateway", "v1");
  res.end(bytes);
});

const port = await listen(server);
const peer = {
  base: `http://${LOOPBACK}:${port}`,
  hostname: LOOPBACK,
};
const options = {
  timeoutMs: 1_000,
  maxBytes: 64 * 1024,
  allowLoopbackFixture: true,
};

async function request(route, body) {
  responseBody = body;
  return requestPublicSeedRouteV1(peer, route, options);
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
  assert(rejected, `${label}: wrong-typed remote numeric evidence was accepted`);
  assert(
    rejected.terminalSeedResponse === true,
    `${label}: rejection was not terminal origin evidence: ${rejected.message}`,
  );
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
  await accept("/__void/demo/summary.json", { chain: { head: 2000 } }, "canonical summary head");
  await accept("/api/health", { ok: true, head: 2000 }, "canonical health head");
  await accept("/api/health", { ok: true }, "optional health head omitted");
  await accept(
    "/blocks/range?from=0&to=1",
    { blocks: [{ number: 0 }, { header: { number: 1 } }] },
    "canonical block numbers including zero",
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

  await reject(
    "/blocks/latest/number2.json",
    { number: [2000] },
    "latest-head array",
  );
  await reject(
    "/blocks/latest/number2.json",
    { number: Number.MAX_SAFE_INTEGER + 1 },
    "latest-head unsafe number",
  );
  await reject("/head", { head: true }, "head boolean");
  await reject("/head", { number: "2000" }, "head fallback string");
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
    "/blocks/range?from=0&to=1",
    { blocks: [{ number: 0 }, { header: { number: "1" } }] },
    "range header number string",
  );

  console.log(MARKER);
} finally {
  await close(server);
}
