#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const repo = process.cwd();
const gateway = path.join(repo, "ops/public/void-public-app-composition-gateway-v1.mjs");
const routes = [
  ["/.well-known/void-agent-discovery.json", "public/.well-known/void-agent-discovery.json", "VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1"],
  ["/.well-known/void-agent-discovery.schema.json", "public/.well-known/void-agent-discovery.schema.json", null],
  ["/.well-known/void-network-authenticity.json", "public/.well-known/void-network-authenticity.json", "VOID_OFFICIAL_NETWORK_AUTHENTICITY_WELL_KNOWN_V1"],
  ["/.well-known/void-network-authenticity.schema.json", "public/.well-known/void-network-authenticity.schema.json", null],
  ["/.well-known/void-public-node.json", "public/.well-known/void-public-node.json", "VOID_PUBLIC_NODE_AGENT_DISCOVERY_V1"],
  ["/.well-known/void-public-node.schema.json", "public/.well-known/void-public-node.schema.json", null],
];
const routeBytes = new Map(routes.map(([route, file]) => [route, fs.readFileSync(path.join(repo, file))]));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
assert.equal(sha256(routeBytes.get(routes[2][0])), "597c451a349728c4713e1ac2ce9ca5478a80378bfc12cf0ca1ce4138e82ea692");
assert.equal(sha256(routeBytes.get(routes[3][0])), "1b53b69e18dde568ebc482b06be41caaa4beecede0df8c0795e7cfd58ffde869");

const send = (req, res, status, headers, body) => {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  res.writeHead(status, { "content-length": String(bytes.length), ...headers });
  if (req.method === "HEAD") return res.end();
  res.end(bytes);
};
const listen = async (server) => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server.address().port;
};

let missingRoute = null;
let nodeHits = 0;
let publicWellKnownHits = 0;

const nodeServer = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://node.local");
  if (!["GET", "HEAD"].includes(req.method || "")) {
    return send(req, res, 405, { "content-type": "application/json", allow: "GET, HEAD" }, "{}\n");
  }
  if (routeBytes.has(url.pathname)) {
    nodeHits += 1;
    if (url.pathname === missingRoute) {
      return send(req, res, 404, { "content-type": "application/json; charset=utf-8" }, '{"ok":false,"error":"missing_public_artifact"}\n');
    }
    return send(req, res, 200, {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      "x-upstream-source": "node",
    }, routeBytes.get(url.pathname));
  }
  return send(req, res, 404, { "content-type": "application/json" }, "{}\n");
});

const publicServer = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://public.local");
  if (url.pathname.startsWith("/.well-known/")) {
    publicWellKnownHits += 1;
    return send(req, res, 598, { "content-type": "application/json" }, "{}\n");
  }
  if (url.pathname === "/public-node") {
    return send(req, res, 200, { "content-type": "text/html; charset=utf-8" }, "public fallback");
  }
  return send(req, res, 404, { "content-type": "application/json" }, "{}\n");
});

let child;
try {
  const nodePort = await listen(nodeServer);
  const publicPort = await listen(publicServer);
  const probe = http.createServer();
  const gatewayPort = await listen(probe);
  await new Promise((resolve) => probe.close(resolve));

  child = spawn(process.execPath, [gateway], {
    cwd: repo,
    env: {
      ...process.env,
      VOID_COMPOSITION_HOST: "127.0.0.1",
      VOID_COMPOSITION_PORT: String(gatewayPort),
      VOID_PUBLIC_GATEWAY_UPSTREAM: `http://127.0.0.1:${publicPort}`,
      VOID_NODE_UPSTREAM: `http://127.0.0.1:${nodePort}`,
      VOID_PUBLIC_EXPECTED_PEERS: "2",
      VOID_TXROOT_QUARANTINED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const base = `http://127.0.0.1:${gatewayPort}`;
  let started = false;
  let lastStartupError = "";

  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(
        base + "/__void/public-app/status.json",
      );
      if (response.status === 200) {
        started = true;
        break;
      }
      lastStartupError = `unexpected status ${response.status}`;
    } catch (error) {
      lastStartupError = String(error?.message || error);
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  if (!started) {
    throw new Error(
      `gateway start failed: ${lastStartupError || "no response"}`,
    );
  }

  for (const [route, , marker] of routes) {
    const get = await fetch(base + route, { redirect: "manual" });
    const body = Buffer.from(await get.arrayBuffer());
    assert.equal(get.status, 200, route + " GET");
    assert.equal(get.headers.get("location"), null);
    assert.match(get.headers.get("content-type") || "", /^application\/json/i);
    assert.equal(get.headers.get("cache-control"), "no-store");
    assert.equal(get.headers.get("x-upstream-source"), "node");
    assert.deepEqual(body, routeBytes.get(route));
    if (marker) assert.equal(JSON.parse(body.toString("utf8")).marker, marker);

    const head = await fetch(base + route, { method: "HEAD", redirect: "manual" });
    assert.equal(head.status, 200, route + " HEAD");
    assert.equal((await head.arrayBuffer()).byteLength, 0);

    const query = await fetch(base + route + "?x=1", { redirect: "manual" });
    assert.equal(query.status, 400);
    assert.equal((await query.json()).error, "well_known_query_not_allowed");

    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const response = await fetch(base + route, { method, redirect: "manual" });
      assert.equal(response.status, 405, route + " " + method);
      assert.equal(response.headers.get("allow"), "GET, HEAD");
    }
  }

  const authenticity = JSON.parse(routeBytes.get(routes[2][0]).toString("utf8"));
  assert.equal(authenticity.safety.private_key_present, false);
  for (const field of [
    "mutation_authority_granted", "runtime_authority_granted",
    "service_enablement_granted", "wallet_authority_granted",
    "validator_authority_granted", "work_credit_authority_granted",
    "buy_void_authority_granted", "economic_authority_granted",
    "third_party_network_control_granted",
  ]) assert.equal(authenticity.authority[field], false, field);

  missingRoute = routes[2][0];
  const missing = await fetch(base + missingRoute);
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error, "missing_public_artifact");
  missingRoute = null;

  assert.equal((await fetch(base + "/public-node")).status, 200);
  assert.equal(publicWellKnownHits, 0);
  assert.ok(nodeHits >= 8);

  const source = fs.readFileSync(gateway, "utf8");
  assert.equal((source.match(/const PUBLIC_NODE_WELL_KNOWN_PATHS = new Set\(/g) || []).length, 1);
  assert.equal((source.match(/if \(PUBLIC_NODE_WELL_KNOWN_PATHS\.has\(pathname\)\)/g) || []).length, 1);

  console.log("route_allowlist_count=6");
  console.log("node_upstream_only=true");
  console.log("public_upstream_well_known_requests=0");
  console.log("get_head_only=true");
  console.log("query_rejected=400");
  console.log("mutation_methods=405");
  console.log("upstream_404_preserved=true");
  console.log("redirects_followed=false");
  console.log("sealed_bytes_exact=true");
  console.log("private_key_present=false");
  console.log("runtime_authority=false");
  console.log("economic_authority=false");
  console.log("third_party_network_control=false");
  console.log("VOID_OFFICIAL_NETWORK_AUTHENTICITY_COMPOSITION_GATEWAY_V1_PROOF_GREEN");
} finally {
  if (child && child.exitCode === null) {
    const exited = once(child, "exit");
    child.kill("SIGTERM");
    await exited;
  }
  await Promise.all([
    new Promise((resolve) => nodeServer.close(resolve)),
    new Promise((resolve) => publicServer.close(resolve)),
  ]);
}
