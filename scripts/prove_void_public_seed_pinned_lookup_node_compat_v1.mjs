#!/usr/bin/env node
import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import process from "node:process";
import { qualifyPublicSeed } from "./lib/void_public_seed_qualification_v1.mjs";

const MARKER = "VOID_PUBLIC_SEED_PINNED_LOOKUP_NODE_COMPAT_V1_GREEN";
const HEAD = 2050;

function sendJson(req, res, status, body) {
  const bytes = Buffer.from(`${JSON.stringify(body)}\n`);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": bytes.length,
    "x-void-public-seed-gateway": "v1",
  });
  if (req.method === "HEAD") res.end();
  else res.end(bytes);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  if (url.pathname === "/__void/ready.json" && ["GET", "HEAD"].includes(req.method || "")) {
    sendJson(req, res, 200, { ready: true, head: HEAD, gap: 0, txroot_live: 1 });
    return;
  }
  if (url.pathname === "/blocks/latest/number2.json" && req.method === "GET") {
    sendJson(req, res, 200, { number: HEAD });
    return;
  }
  if (url.pathname === "/blocks/range" && req.method === "GET") {
    const from = Number(url.searchParams.get("from"));
    const to = Number(url.searchParams.get("to"));
    sendJson(req, res, 200, { blocks: [{ number: from }, { number: to }] });
    return;
  }
  if (url.pathname === "/admin" && req.method === "GET") {
    sendJson(req, res, 404, { ok: false, error: "route_not_public" });
    return;
  }
  if (url.pathname === "/follower/start" && req.method === "POST") {
    sendJson(req, res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }
  sendJson(req, res, 404, { ok: false, error: "route_not_public" });
});

server.listen(0, "127.0.0.1");
await once(server, "listening");
const address = server.address();
const port = typeof address === "object" && address ? address.port : 0;
assert.ok(port > 0);

try {
  const receipt = await qualifyPublicSeed(`http://localhost:${port}`, {
    sampleCount: 1,
    intervalMs: 0,
    allowLoopbackFixture: true,
    timeoutMs: 3000,
    maxBytes: 1024 * 1024,
  });
  assert.equal(receipt.sample_count, 1);
  assert.equal(receipt.samples[0].head, HEAD);
  assert.deepEqual(receipt.samples[0].dns_addresses, ["127.0.0.1"]);
  assert.deepEqual(receipt.samples[0].connected_addresses, ["127.0.0.1"]);
  assert.equal(receipt.samples[0].gateway_header, "v1");
} finally {
  await new Promise((resolve) => server.close(resolve));
}

console.log(MARKER);
console.log(`node_version=${process.versions.node}`);
console.log("hostname_lookup_exercised=true");
console.log("pinned_connected_address=true");
