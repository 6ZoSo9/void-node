#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const TOOL = process.env.VOID_SELF_CHECK_TOOL || path.resolve("tools/public-node-operator-self-check-v1.mjs");
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 5_000;
const MAX_SETTLE_MS = 3_500;
const MARKER = "VOID_PUBLIC_NODE_OPERATOR_SELF_CHECK_RESPONSE_BOUND_V1_GREEN";
const REQUIRED_ROUTES = [
  "/public-node",
  "/public-node/route-index.json",
  "/public-node/route-manifest.json",
  "/public-node/self-check-snapshot.json",
  "/public-node/share-link.json",
  "/public-node/tester-bundle.json",
  "/public-node/outside-tester-smoke.json",
  "/proofs",
];

let mode = "green";

function smallJson(res, status, value) {
  const body = Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(body.length),
  });
  res.end(body);
}

function canonicalConnected(id) {
  return { id, addr: `127.0.0.1:${id === "peer-a" ? 4701 : 4702}`, listens: [], outbound: true };
}

function routeIndexRows() {
  return REQUIRED_ROUTES.map((route, index) => ({
    path: route,
    marker: `VOID_PUBLIC_NODE_FIXTURE_ROUTE_${index + 1}_V1`,
    purpose: `fixture route ${route}`,
  }));
}

function routeManifestRows() {
  return REQUIRED_ROUTES.map((route, index) => ({
    path: route,
    marker: `VOID_PUBLIC_NODE_FIXTURE_ROUTE_${index + 1}_V1`,
    safety_class: "public_read_only",
    purpose: `fixture route ${route}`,
  }));
}

function readinessFixture() {
  const value = {
    ready: true,
    head: 1856587,
    lastmile_seen: 1856587,
    gap: 0,
    txroot_live: 1,
    reasons: [],
  };
  if (mode === "gap_string") value.gap = "0";
  if (mode === "txroot_boolean") value.txroot_live = true;
  return value;
}

function headFixture() {
  if (mode === "head_string") return { number: "1856587" };
  if (mode === "head_fractional") return { number: 1856587.5 };
  if (mode === "head_unsafe") return { number: Number.MAX_SAFE_INTEGER + 1 };
  return { number: 1856587 };
}

function peersFixture() {
  if (mode === "peer_junk_array") return { ok: true, connected: [null, false] };
  if (mode === "peer_scalar_string") return { ok: true, peer_count: "2" };
  if (mode === "peer_ok_false") {
    return { ok: false, connected: [canonicalConnected("peer-a"), canonicalConnected("peer-b")] };
  }
  if (mode === "peer_connected_wrong_type_with_scalar") {
    return { ok: true, connected: "two", peer_count: 2 };
  }
  if (mode === "peer_empty") return { ok: true, connected: [] };
  if (mode === "peer_legacy") return { peers: [{ id: "a" }, { id: "b" }] };
  return { ok: true, connected: [canonicalConnected("peer-a"), canonicalConnected("peer-b")] };
}

function wellKnownFixture() {
  const canonical = {
    marker: "VOID_PUBLIC_NODE_AGENT_DISCOVERY_V1",
    links: {
      public_node: "/public-node",
      route_manifest: "/public-node/route-manifest.json",
      self_check_snapshot: "/public-node/self-check-snapshot.json",
      proofs: "/proofs",
    },
    policy: { public_routes_only: true, read_only: true, mutation: false },
  };
  if (mode !== "well_known_nested_splice") return canonical;
  return {
    marker: "WRONG_MARKER",
    links: {},
    policy: canonical.policy,
    metadata: canonical,
  };
}

function routeIndexFixture() {
  const canonical = { marker: "VOID_PUBLIC_NODE_ROUTE_INDEX_V1", routes: routeIndexRows() };
  if (mode === "route_index_primitive_row") {
    return { ...canonical, routes: [...REQUIRED_ROUTES] };
  }
  if (mode === "route_index_bad_path") {
    return { ...canonical, routes: [{ ...canonical.routes[0], path: null }, ...canonical.routes.slice(1)] };
  }
  if (mode !== "route_index_nested_splice") return canonical;
  return { marker: "WRONG_MARKER", routes: [], metadata: canonical };
}

function routeManifestFixture() {
  const routes = routeManifestRows();
  const canonical = {
    marker: "VOID_PUBLIC_NODE_ROUTE_MANIFEST_V1",
    route_count: routes.length,
    routes,
  };
  if (mode === "route_manifest_missing_metadata") {
    const malformed = { ...routes[0] };
    delete malformed.safety_class;
    return { ...canonical, routes: [malformed, ...routes.slice(1)] };
  }
  if (mode === "route_manifest_count_mismatch") {
    return { ...canonical, route_count: routes.length + 1 };
  }
  if (mode !== "route_manifest_nested_splice") return canonical;
  return { marker: "WRONG_MARKER", route_count: 0, routes: [], metadata: canonical };
}

function snapshotFixture() {
  const canonical = {
    marker: "VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_V1",
    expected_routes: [...REQUIRED_ROUTES],
    expected_route_count: REQUIRED_ROUTES.length,
    policy: { public_post_endpoint: false },
  };
  if (mode === "snapshot_legacy_routes") {
    const { expected_routes, expected_route_count, ...rest } = canonical;
    return { ...rest, routes: expected_routes, route_count: expected_route_count };
  }
  if (mode === "snapshot_count_string") {
    return { ...canonical, expected_route_count: String(canonical.expected_route_count) };
  }
  if (mode === "snapshot_count_mismatch") {
    return { ...canonical, expected_route_count: canonical.expected_route_count + 1 };
  }
  if (mode === "snapshot_wrong_type_route") {
    return { ...canonical, expected_routes: [{ path: REQUIRED_ROUTES[0] }, ...REQUIRED_ROUTES.slice(1)] };
  }
  if (mode !== "snapshot_nested_splice") return canonical;
  return {
    marker: "WRONG_MARKER",
    expected_routes: [],
    expected_route_count: 0,
    policy: { public_post_endpoint: true },
    metadata: canonical,
  };
}

const sockets = new Set();
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url || "/", "http://127.0.0.1").pathname;
  if (req.method !== "GET") {
    smallJson(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }

  if (pathname === "/health") {
    if (mode === "declared") {
      res.writeHead(200, {
        "content-type": "application/json; charset=utf-8",
        "content-length": String(MAX_RESPONSE_BYTES + 1),
      });
      res.flushHeaders();
      return;
    }
    if (mode === "streamed") {
      res.writeHead(200, {
        "content-type": "application/json; charset=utf-8",
        "transfer-encoding": "chunked",
      });
      res.write(Buffer.alloc(MAX_RESPONSE_BYTES + 1, 0x20));
      return;
    }
    smallJson(res, 200, {
      ok: true,
      proto: 1,
      nodeId: "fixture-node-operator-self-check-v1",
      http: 4100,
      p2p: 4700,
      peers: ["fixture-peer-a", "fixture-peer-b"],
      listen: ["127.0.0.1:4700"],
    });
    return;
  }
  if (pathname === "/__void/ready.json") {
    smallJson(res, 200, readinessFixture());
    return;
  }
  if (pathname === "/blocks/latest/number2.json") {
    smallJson(res, 200, headFixture());
    return;
  }
  if (pathname === "/p2p/peers") {
    smallJson(res, 200, peersFixture());
    return;
  }
  if (pathname === "/.well-known/void-public-node.json") {
    smallJson(res, 200, wellKnownFixture());
    return;
  }
  if (pathname === "/public-node/route-index.json") {
    smallJson(res, 200, routeIndexFixture());
    return;
  }
  if (pathname === "/public-node/route-manifest.json") {
    smallJson(res, 200, routeManifestFixture());
    return;
  }
  if (pathname === "/public-node/self-check-snapshot.json") {
    smallJson(res, 200, snapshotFixture());
    return;
  }
  smallJson(res, 404, { ok: false, error: "fixture_not_found", pathname });
});
server.on("connection", (socket) => {
  sockets.add(socket);
  socket.on("close", () => sockets.delete(socket));
});

async function listen() {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert(address && typeof address === "object");
  return address.port;
}

async function runTool(port, expectedPeerCount) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), `void-public-self-check-${mode}-`));
  const output = path.join(temp, "receipt.json");
  const started = Date.now();
  try {
    const result = await new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          TOOL,
          "--base",
          `http://127.0.0.1:${port}`,
          "--timeout-ms",
          String(TIMEOUT_MS),
          "--expected-peer-count",
          String(expectedPeerCount),
          "--observed-at",
          "2026-08-15T16:00:00Z",
          "--output",
          output,
        ],
        { stdio: ["ignore", "pipe", "pipe"] },
      );
      let stdout = "";
      let stderr = "";
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => (stdout += chunk));
      child.stderr.on("data", (chunk) => (stderr += chunk));
      child.once("error", reject);
      child.once("close", (status) => resolve({ status, stdout, stderr }));
    });
    assert(fs.existsSync(output), `${mode} receipt missing: ${result.stderr || result.stdout}`);
    return {
      ...result,
      elapsed: Date.now() - started,
      receipt: JSON.parse(fs.readFileSync(output, "utf8")),
    };
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function checkById(receipt, id) {
  const found = receipt.checks.find((entry) => entry.id === id);
  assert(found, `${mode} missing ${id}`);
  return found;
}

async function expectGreen(port, selectedMode = "green", expectedPeerCount = 2) {
  mode = selectedMode;
  const result = await runTool(port, expectedPeerCount);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.receipt.summary.status, "green");
  assert.equal(result.receipt.safety.mutation_attempted, false);
  assert.deepEqual(result.receipt.safety.methods_used, ["GET"]);
  return result;
}

async function expectHold(port, selectedMode, checkId, expectedPeerCount = 2) {
  mode = selectedMode;
  const result = await runTool(port, expectedPeerCount);
  assert.equal(result.status, 2, result.stderr || result.stdout);
  assert.equal(result.receipt.summary.status, "hold");
  assert.equal(checkById(result.receipt, checkId).ok, false);
  assert.equal(result.receipt.safety.mutation_attempted, false);
  assert.deepEqual(result.receipt.safety.methods_used, ["GET"]);
  return result;
}

const port = await listen();
try {
  await expectGreen(port);
  await expectGreen(port, "peer_empty", 0);
  await expectGreen(port, "peer_legacy", 2);

  for (const selectedMode of ["declared", "streamed"]) {
    const result = await expectHold(port, selectedMode, "health", 0);
    assert(result.elapsed < MAX_SETTLE_MS, `${selectedMode} oversize HOLD took ${result.elapsed}ms`);
    assert.equal(checkById(result.receipt, "health").reason, "response_too_large");
  }

  for (const selectedMode of ["gap_string", "txroot_boolean"]) {
    const result = await expectHold(port, selectedMode, "readiness");
    const readiness = checkById(result.receipt, "readiness");
    if (selectedMode === "gap_string") assert.equal(readiness.observed.gap, null);
    if (selectedMode === "txroot_boolean") assert.equal(readiness.observed.txroot_live, null);
  }

  for (const selectedMode of ["head_string", "head_fractional", "head_unsafe"]) {
    const result = await expectHold(port, selectedMode, "chain_head");
    assert.equal(checkById(result.receipt, "chain_head").observed.number, null);
  }

  for (const selectedMode of [
    "peer_junk_array",
    "peer_scalar_string",
    "peer_ok_false",
    "peer_connected_wrong_type_with_scalar",
  ]) {
    const result = await expectHold(port, selectedMode, "peer_visibility");
    assert.equal(checkById(result.receipt, "peer_visibility").observed.peer_count, null);
  }

  for (const [selectedMode, checkId] of [
    ["well_known_nested_splice", "well_known_discovery"],
    ["route_index_nested_splice", "route_index"],
    ["route_index_primitive_row", "route_index"],
    ["route_index_bad_path", "route_index"],
    ["route_manifest_nested_splice", "route_manifest"],
    ["route_manifest_missing_metadata", "route_manifest"],
    ["route_manifest_count_mismatch", "route_manifest"],
    ["snapshot_nested_splice", "self_check_snapshot"],
    ["snapshot_legacy_routes", "self_check_snapshot"],
    ["snapshot_count_string", "self_check_snapshot"],
    ["snapshot_count_mismatch", "self_check_snapshot"],
    ["snapshot_wrong_type_route", "self_check_snapshot"],
  ]) {
    await expectHold(port, selectedMode, checkId);
  }

  console.log(MARKER);
} finally {
  for (const socket of sockets) socket.destroy();
  await new Promise((resolve) => server.close(resolve));
}
