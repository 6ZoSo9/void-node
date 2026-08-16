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

const ROUTE_INDEX_REQUIRED = [
  "/public-node",
  "/public-node/route-index.json",
  "/public-node/share-pack.json",
  "/public-node/tester-checklist.json",
  "/public-node/client-work-pack.json",
  "/public-node/ai-readiness.json",
  "/public-node/fresh-proof-seed.json",
  "/public-node/requester-work-policy.json",
  "/public-node/data-quality.json",
  "/public-node/link-health.json",
  "/public-node/intelligence.json",
  "/proofs",
];

const CANONICAL_ROUTES = [
  "/.well-known/void-public-node.json",
  "/public-node/external-tester-copy-pack.json",
  "/public-node/tester-result-intake.json",
  "/public-node/standalone-outside-tester-smoke.sh",
  "/public-node/tester-share",
  "/public-node/tester-lane-summary.json",
  "/public-node/first-tester-request-copy-pack.json",
  "/public-node/local-data-drop/manifest.json",
  "/public-node/local-data-drop.json",
  "/public-node/local-data-drop/proof/:sha256.json",
  "/public-node/local-data-drop/by-sha256/:sha256",
  "/public-node/local-data-drop/:objectId",
  "/public-node",
  "/public-node/self-check-snapshot.json",
  "/public-node/route-manifest.json",
  "/public-node/share-link.json",
  "/public-node/tester-bundle.json",
  "/public-node/outside-tester-smoke.json",
  "/public-node/tester-loop-status.json",
  "/public-node/tester-result-receipt.json",
  "/public-node/quickstart.json",
  "/public-node/tester-handoff.json",
  "/public-node/public-exposure-smoke-pack.json",
  "/public-node/route-index.json",
  "/proofs",
];

const MANIFEST_MARKERS = new Map([
  ["/.well-known/void-public-node.json", "VOID_PUBLIC_NODE_AGENT_DISCOVERY_V1"],
  ["/public-node", "VOID_PUBLIC_NODE_PROFILE_ROUTE_V1"],
  ["/public-node/route-manifest.json", "VOID_PUBLIC_NODE_ROUTE_MANIFEST_V1"],
  ["/public-node/self-check-snapshot.json", "VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_V1"],
  ["/public-node/share-link.json", "VOID_PUBLIC_NODE_SHARE_LINK_V1"],
  ["/public-node/tester-bundle.json", "VOID_PUBLIC_NODE_TESTER_BUNDLE_V1"],
  ["/public-node/outside-tester-smoke.json", "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_SURFACE_V1"],
  ["/public-node/tester-loop-status.json", "VOID_PUBLIC_NODE_TESTER_LOOP_STATUS_V1"],
  ["/public-node/tester-result-receipt.json", "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1"],
  ["/public-node/quickstart.json", "VOID_PUBLIC_NODE_QUICKSTART_V1"],
  ["/public-node/tester-handoff.json", "VOID_PUBLIC_NODE_TESTER_HANDOFF_V1"],
  ["/public-node/public-exposure-smoke-pack.json", "VOID_PUBLIC_NODE_PUBLIC_EXPOSURE_SMOKE_PACK_V1"],
  ["/public-node/route-index.json", "VOID_PUBLIC_NODE_ROUTE_INDEX_V1"],
  ["/proofs", "VOID_PUBLIC_PROOFS_INDEX_V1"],
]);

let mode = "green";
let baseOrigin = "";

function smallJson(res, status, value) {
  const body = Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(body.length),
  });
  res.end(body);
}

function fullPolicy() {
  return {
    public_routes_only: true,
    private_api: false,
    mutation: false,
    read_only: true,
    money_movement: false,
    wallet_send: false,
    wc_to_void_swap: false,
    buy_void_fulfillment: false,
    validator_mutation: false,
  };
}

function canonicalConnected(id) {
  return { id, addr: `127.0.0.1:${id === "peer-a" ? 4701 : 4702}`, listens: [], outbound: true };
}

function routeIndexRows() {
  const routes = [...new Set([...ROUTE_INDEX_REQUIRED, ...CANONICAL_ROUTES])];
  return routes.map((route, index) => ({
    path: route,
    marker: MANIFEST_MARKERS.get(route) || `VOID_PUBLIC_NODE_FIXTURE_ROUTE_${index + 1}_V1`,
    purpose: `fixture route ${route}`,
  }));
}

function routeManifestRows() {
  return CANONICAL_ROUTES.map((route, index) => ({
    path: route,
    marker: MANIFEST_MARKERS.get(route) || `VOID_PUBLIC_NODE_FIXTURE_ROUTE_${index + 1}_V1`,
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
    purpose: "well_known_public_node_agent_discovery",
    protocol: "void-public-node-discovery-v1",
    status: "public_node_agent_discovery_ready",
    effective_base_url: baseOrigin,
    links: {
      public_node: `${baseOrigin}/public-node`,
      route_manifest: `${baseOrigin}/public-node/route-manifest.json`,
      self_check_snapshot: `${baseOrigin}/public-node/self-check-snapshot.json`,
      outside_tester_smoke: `${baseOrigin}/public-node/outside-tester-smoke.json`,
      tester_bundle: `${baseOrigin}/public-node/tester-bundle.json`,
      result_receipt: `${baseOrigin}/public-node/tester-result-receipt.json`,
      proofs: `${baseOrigin}/proofs`,
    },
    policy: fullPolicy(),
  };
  if (mode === "well_known_wrong_purpose") return { ...canonical, purpose: "wrong_discovery" };
  if (mode === "well_known_wrong_protocol") return { ...canonical, protocol: "void-public-node-discovery-v0" };
  if (mode === "well_known_wrong_status") return { ...canonical, status: "stale" };
  if (mode === "well_known_wrong_base") return { ...canonical, effective_base_url: "https://foreign.example" };
  if (mode === "well_known_foreign_link_origin") {
    return {
      ...canonical,
      links: {
        ...canonical.links,
        route_manifest: "https://foreign.example/public-node/route-manifest.json",
      },
    };
  }
  if (mode === "well_known_extra_sensitive_link") {
    return {
      ...canonical,
      links: {
        ...canonical.links,
        operator_diagnostics: `${baseOrigin}/__void/operator/diagnostics`,
      },
    };
  }
  if (mode === "well_known_extra_foreign_link") {
    return {
      ...canonical,
      links: {
        ...canonical.links,
        foreign_public_node: "https://foreign.example/public-node",
      },
    };
  }
  const policyContradictions = {
    well_known_public_routes_disabled: ["public_routes_only", false],
    well_known_private_api_enabled: ["private_api", true],
    well_known_mutation_enabled: ["mutation", true],
    well_known_read_only_disabled: ["read_only", false],
    well_known_money_movement_enabled: ["money_movement", true],
    well_known_wallet_send_enabled: ["wallet_send", true],
    well_known_wc_swap_enabled: ["wc_to_void_swap", true],
    well_known_buy_fulfillment_enabled: ["buy_void_fulfillment", true],
    well_known_validator_mutation_enabled: ["validator_mutation", true],
  };
  if (policyContradictions[mode]) {
    const [field, value] = policyContradictions[mode];
    return { ...canonical, policy: { ...canonical.policy, [field]: value } };
  }
  if (mode !== "well_known_nested_splice") return canonical;
  return { marker: "WRONG_MARKER", links: {}, policy: canonical.policy, metadata: canonical };
}

function routeIndexFixture() {
  const canonical = {
    marker: "VOID_PUBLIC_NODE_ROUTE_INDEX_V1",
    purpose: "public_node_route_index",
    routes: routeIndexRows(),
    policy: fullPolicy(),
  };
  if (mode === "route_index_primitive_row") return { ...canonical, routes: [...ROUTE_INDEX_REQUIRED] };
  if (mode === "route_index_bad_path") {
    return { ...canonical, routes: [{ ...canonical.routes[0], path: null }, ...canonical.routes.slice(1)] };
  }
  if (mode === "route_index_foreign_path") {
    return { ...canonical, routes: canonical.routes.map((row) => row.path === "/public-node" ? { ...row, path: "https://evil.example/public-node" } : row) };
  }
  if (mode === "route_index_query_alias") {
    return { ...canonical, routes: canonical.routes.map((row) => row.path === "/public-node" ? { ...row, path: "/public-node?alias=1" } : row) };
  }
  if (mode === "route_index_normalization_alias") {
    return { ...canonical, routes: canonical.routes.map((row) => row.path === "/public-node" ? { ...row, path: "/x/../public-node" } : row) };
  }
  if (mode === "route_index_wrong_purpose") return { ...canonical, purpose: "not_the_route_index" };
  if (mode === "route_index_bad_policy") return { ...canonical, policy: { ...canonical.policy, money_movement: true } };
  if (mode !== "route_index_nested_splice") return canonical;
  return { marker: "WRONG_MARKER", purpose: canonical.purpose, routes: [], policy: canonical.policy, metadata: canonical };
}

function routeManifestFixture() {
  const routes = routeManifestRows();
  const canonical = {
    marker: "VOID_PUBLIC_NODE_ROUTE_MANIFEST_V1",
    purpose: "canonical_public_node_route_manifest",
    status: "public_node_route_manifest_ready",
    effective_base_url: baseOrigin,
    route_count: routes.length,
    routes,
    policy: fullPolicy(),
  };
  if (mode === "route_manifest_missing_metadata") {
    const malformed = { ...routes[0] };
    delete malformed.safety_class;
    return { ...canonical, routes: [malformed, ...routes.slice(1)] };
  }
  if (mode === "route_manifest_count_mismatch") return { ...canonical, route_count: routes.length + 1 };
  if (mode === "route_manifest_wrong_purpose") return { ...canonical, purpose: "wrong_manifest" };
  if (mode === "route_manifest_wrong_status") return { ...canonical, status: "stale" };
  if (mode === "route_manifest_wrong_base") return { ...canonical, effective_base_url: "https://foreign.example" };
  if (mode === "route_manifest_wrong_marker") {
    return {
      ...canonical,
      routes: canonical.routes.map((row) => row.path === "/public-node" ? { ...row, marker: "WRONG_MARKER" } : row),
    };
  }
  if (mode === "route_manifest_bad_safety") {
    return {
      ...canonical,
      routes: canonical.routes.map((row) => row.path === "/public-node" ? { ...row, safety_class: "mutable" } : row),
    };
  }
  if (mode === "route_manifest_bad_policy") return { ...canonical, policy: { ...canonical.policy, wallet_send: true } };
  if (mode !== "route_manifest_nested_splice") return canonical;
  return { marker: "WRONG_MARKER", route_count: 0, routes: [], metadata: canonical };
}

function snapshotFixture() {
  const canonical = {
    marker: "VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_V1",
    purpose: "public_node_self_check_snapshot",
    status: "public_node_externally_testable_read_only_surface_ready",
    effective_base_url: baseOrigin,
    expected_routes: [...CANONICAL_ROUTES],
    expected_route_count: CANONICAL_ROUTES.length,
    links: {
      agent_discovery: `${baseOrigin}/.well-known/void-public-node.json`,
      public_node: `${baseOrigin}/public-node`,
      route_index: `${baseOrigin}/public-node/route-index.json`,
      route_manifest: `${baseOrigin}/public-node/route-manifest.json`,
      smoke_surface: `${baseOrigin}/public-node/outside-tester-smoke.json`,
      proofs: `${baseOrigin}/proofs`,
    },
    checks: {
      self_check_snapshot: true,
      agent_discovery_present: true,
      route_index_present: true,
      route_manifest_present: true,
      outside_tester_smoke_surface_present: true,
      externally_testable: true,
    },
    policy: { ...fullPolicy(), public_post_endpoint: false },
  };
  if (mode === "snapshot_legacy_routes") {
    const { expected_routes, expected_route_count, ...rest } = canonical;
    return { ...rest, routes: expected_routes, route_count: expected_route_count };
  }
  if (mode === "snapshot_count_string") return { ...canonical, expected_route_count: String(canonical.expected_route_count) };
  if (mode === "snapshot_count_mismatch") return { ...canonical, expected_route_count: canonical.expected_route_count + 1 };
  if (mode === "snapshot_wrong_type_route") {
    return { ...canonical, expected_routes: [{ path: CANONICAL_ROUTES[0] }, ...CANONICAL_ROUTES.slice(1)] };
  }
  if (mode === "snapshot_foreign_route") {
    return { ...canonical, expected_routes: canonical.expected_routes.map((route) => route === "/public-node" ? "https://evil.example/public-node" : route) };
  }
  if (mode === "snapshot_wrong_purpose") return { ...canonical, purpose: "wrong_snapshot" };
  if (mode === "snapshot_wrong_status") return { ...canonical, status: "stale" };
  if (mode === "snapshot_wrong_base") return { ...canonical, effective_base_url: "https://foreign.example" };
  if (mode === "snapshot_bad_check") return { ...canonical, checks: { ...canonical.checks, route_manifest_present: false } };
  if (mode === "snapshot_bad_link") return { ...canonical, links: { ...canonical.links, proofs: "https://foreign.example/proofs" } };
  if (mode === "snapshot_bad_policy") return { ...canonical, policy: { ...canonical.policy, validator_mutation: true } };
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
  if (pathname === "/__void/ready.json") return smallJson(res, 200, readinessFixture());
  if (pathname === "/blocks/latest/number2.json") return smallJson(res, 200, headFixture());
  if (pathname === "/p2p/peers") return smallJson(res, 200, peersFixture());
  if (pathname === "/.well-known/void-public-node.json") return smallJson(res, 200, wellKnownFixture());
  if (pathname === "/public-node/route-index.json") return smallJson(res, 200, routeIndexFixture());
  if (pathname === "/public-node/route-manifest.json") return smallJson(res, 200, routeManifestFixture());
  if (pathname === "/public-node/self-check-snapshot.json") return smallJson(res, 200, snapshotFixture());
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

async function spawnTool(args, extraEnv = {}) {
  return await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [TOOL, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...extraEnv },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.once("error", reject);
    child.once("close", (status) => resolve({ status, stdout, stderr }));
  });
}

function toolArgs(port) {
  return [
    "--base",
    `http://127.0.0.1:${port}`,
    "--timeout-ms",
    String(TIMEOUT_MS),
    "--expected-peer-count",
    "2",
    "--observed-at",
    "2026-08-15T16:00:00Z",
  ];
}

async function runTool(port, expectedPeerCount) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), `void-public-self-check-${mode}-`));
  const output = path.join(temp, "receipt.json");
  const started = Date.now();
  try {
    const args = toolArgs(port);
    args[5] = String(expectedPeerCount);
    const result = await spawnTool([...args, "--output", output]);
    assert(fs.existsSync(output), `${mode} receipt missing: ${result.stderr || result.stdout}`);
    assert.equal(fs.statSync(output).mode & 0o777, 0o600, `${mode} receipt mode must be 0600`);
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

async function expectBaseAdmission(base, expectedStatus, message) {
  mode = "green";
  const result = await spawnTool([
    "--base",
    base,
    "--timeout-ms",
    "250",
    "--expected-peer-count",
    "0",
    "--observed-at",
    "2026-08-15T16:00:00Z",
  ]);
  assert.equal(result.status, expectedStatus, `${message}: ${result.stderr || result.stdout}`);
  return result;
}

async function proveOutputPublicationSafety(port) {
  mode = "green";
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "void-public-self-check-output-safety-"));
  try {
    const args = toolArgs(port);

    const existing = path.join(temp, "existing.json");
    fs.writeFileSync(existing, "existing-sentinel\n", { mode: 0o640 });
    fs.chmodSync(existing, 0o640);
    let result = await spawnTool([...args, "--output", existing]);
    assert.equal(result.status, 1, `existing output must fail closed: ${result.stderr || result.stdout}`);
    assert.equal(fs.readFileSync(existing, "utf8"), "existing-sentinel\n");
    assert.equal(fs.statSync(existing).mode & 0o777, 0o640);

    const target = path.join(temp, "symlink-target.txt");
    const symlinkOutput = path.join(temp, "receipt-symlink.json");
    fs.writeFileSync(target, "target-sentinel\n", { mode: 0o640 });
    fs.chmodSync(target, 0o640);
    fs.symlinkSync(target, symlinkOutput);
    result = await spawnTool([...args, "--output", symlinkOutput]);
    assert.equal(result.status, 1, `symlink output must fail closed: ${result.stderr || result.stdout}`);
    assert.equal(fs.readFileSync(target, "utf8"), "target-sentinel\n");
    assert.equal(fs.statSync(target).mode & 0o777, 0o640);
    assert(fs.lstatSync(symlinkOutput).isSymbolicLink());

    const realParent = path.join(temp, "real-parent");
    const nestedRealParent = path.join(realParent, "nested");
    const aliasParent = path.join(temp, "alias-parent");
    fs.mkdirSync(nestedRealParent, { recursive: true, mode: 0o700 });
    fs.symlinkSync(realParent, aliasParent, "dir");
    const redirectedOutput = path.join(aliasParent, "nested", "receipt.json");
    result = await spawnTool([...args, "--output", redirectedOutput]);
    assert.equal(result.status, 1, `symlinked parent path must fail closed: ${result.stderr || result.stdout}`);
    assert.equal(fs.existsSync(path.join(nestedRealParent, "receipt.json")), false);

    const missingParentOutput = path.join(temp, "missing-parent", "receipt.json");
    result = await spawnTool([...args, "--output", missingParentOutput]);
    assert.equal(result.status, 1, `missing output parent must fail closed: ${result.stderr || result.stdout}`);
    assert.equal(fs.existsSync(path.dirname(missingParentOutput)), false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function writeFetchFixturePreload(temp) {
  const preload = path.join(temp, "fetch-fixture.mjs");
  fs.writeFileSync(
    preload,
    `const originalFetch = globalThis.fetch;\n` +
      `const fixtureMode = process.env.VOID_SELF_CHECK_FETCH_FIXTURE || "";\n` +
      `const maxBytes = Number(process.env.VOID_SELF_CHECK_MAX_RESPONSE_BYTES || "0");\n` +
      `let injected = false;\n` +
      `let firstSignal = null;\n` +
      `globalThis.fetch = async (input, init = {}) => {\n` +
      `  const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;\n` +
      `  const url = new URL(raw);\n` +
      `  if (!injected && url.pathname === "/health") {\n` +
      `    injected = true;\n` +
      `    firstSignal = init.signal;\n` +
      `    if (fixtureMode === "cancel-never") {\n` +
      `      const body = new ReadableStream({\n` +
      `        start(controller) { controller.enqueue(new Uint8Array([123])); },\n` +
      `        cancel() { return new Promise(() => {}); },\n` +
      `      });\n` +
      `      return new Response(body, { status: 200, headers: { "content-type": "application/json", "content-length": String(maxBytes + 1) } });\n` +
      `    }\n` +
      `    if (fixtureMode === "read-failure") {\n` +
      `      const body = new ReadableStream({ pull(controller) { controller.error(new Error("fixture_read_failure")); } });\n` +
      `      return new Response(body, { status: 200, headers: { "content-type": "application/json" } });\n` +
      `    }\n` +
      `    if (fixtureMode === "body-unavailable") {\n` +
      `      return { status: 200, headers: new Headers({ "content-type": "application/json" }), body: {} };\n` +
      `    }\n` +
      `  }\n` +
      `  if (injected && url.pathname !== "/health" && firstSignal?.aborted !== true) {\n` +
      `    throw new Error("prior_request_not_aborted");\n` +
      `  }\n` +
      `  return originalFetch(input, init);\n` +
      `};\n`,
    { mode: 0o600 },
  );
  return preload;
}

async function proveRejectedResponseOwnership(port, fixtureMode, expectedReason) {
  mode = "green";
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), `void-public-self-check-teardown-${fixtureMode}-`));
  const started = Date.now();
  try {
    const preload = writeFetchFixturePreload(temp);
    const nodeOptions = [process.env.NODE_OPTIONS, `--import=${preload}`].filter(Boolean).join(" ");
    const result = await spawnTool(toolArgs(port), {
      NODE_OPTIONS: nodeOptions,
      VOID_SELF_CHECK_FETCH_FIXTURE: fixtureMode,
      VOID_SELF_CHECK_MAX_RESPONSE_BYTES: String(MAX_RESPONSE_BYTES),
    });
    assert.equal(result.status, 2, `${fixtureMode} must produce bounded HOLD: ${result.stderr || result.stdout}`);
    const receipt = JSON.parse(result.stdout);
    assert.deepEqual(receipt.summary.failed_check_ids, ["health"]);
    assert.equal(checkById(receipt, "health").reason, expectedReason);
    assert.equal(checkById(receipt, "readiness").ok, true, `${fixtureMode} next request must see prior request aborted`);
    assert(Date.now() - started < MAX_SETTLE_MS, `${fixtureMode} teardown exceeded ${MAX_SETTLE_MS}ms`);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

const port = await listen();
baseOrigin = `http://127.0.0.1:${port}`;
try {
  await expectGreen(port);
  await expectGreen(port, "peer_empty", 0);
  await expectGreen(port, "peer_legacy", 2);

  for (const selectedMode of ["declared", "streamed"]) {
    const result = await expectHold(port, selectedMode, "health", 0);
    assert(result.elapsed < MAX_SETTLE_MS, `${selectedMode} oversize HOLD took ${result.elapsed}ms`);
    assert.equal(checkById(result.receipt, "health").reason, "response_too_large");
  }

  await proveRejectedResponseOwnership(port, "cancel-never", "response_too_large");
  await proveRejectedResponseOwnership(port, "read-failure", "response_body_read_failed");
  await proveRejectedResponseOwnership(port, "body-unavailable", "response_body_unavailable");

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
    ["well_known_wrong_purpose", "well_known_discovery"],
    ["well_known_wrong_protocol", "well_known_discovery"],
    ["well_known_wrong_status", "well_known_discovery"],
    ["well_known_wrong_base", "well_known_discovery"],
    ["well_known_foreign_link_origin", "well_known_discovery"],
    ["well_known_extra_sensitive_link", "well_known_discovery"],
    ["well_known_extra_foreign_link", "well_known_discovery"],
    ["well_known_public_routes_disabled", "well_known_discovery"],
    ["well_known_private_api_enabled", "well_known_discovery"],
    ["well_known_mutation_enabled", "well_known_discovery"],
    ["well_known_read_only_disabled", "well_known_discovery"],
    ["well_known_money_movement_enabled", "well_known_discovery"],
    ["well_known_wallet_send_enabled", "well_known_discovery"],
    ["well_known_wc_swap_enabled", "well_known_discovery"],
    ["well_known_buy_fulfillment_enabled", "well_known_discovery"],
    ["well_known_validator_mutation_enabled", "well_known_discovery"],
    ["route_index_nested_splice", "route_index"],
    ["route_index_primitive_row", "route_index"],
    ["route_index_bad_path", "route_index"],
    ["route_index_foreign_path", "route_index"],
    ["route_index_query_alias", "route_index"],
    ["route_index_normalization_alias", "route_index"],
    ["route_index_wrong_purpose", "route_index"],
    ["route_index_bad_policy", "route_index"],
    ["route_manifest_nested_splice", "route_manifest"],
    ["route_manifest_missing_metadata", "route_manifest"],
    ["route_manifest_count_mismatch", "route_manifest"],
    ["route_manifest_wrong_purpose", "route_manifest"],
    ["route_manifest_wrong_status", "route_manifest"],
    ["route_manifest_wrong_base", "route_manifest"],
    ["route_manifest_wrong_marker", "route_manifest"],
    ["route_manifest_bad_safety", "route_manifest"],
    ["route_manifest_bad_policy", "route_manifest"],
    ["snapshot_nested_splice", "self_check_snapshot"],
    ["snapshot_legacy_routes", "self_check_snapshot"],
    ["snapshot_count_string", "self_check_snapshot"],
    ["snapshot_count_mismatch", "self_check_snapshot"],
    ["snapshot_wrong_type_route", "self_check_snapshot"],
    ["snapshot_foreign_route", "self_check_snapshot"],
    ["snapshot_wrong_purpose", "self_check_snapshot"],
    ["snapshot_wrong_status", "self_check_snapshot"],
    ["snapshot_wrong_base", "self_check_snapshot"],
    ["snapshot_bad_check", "self_check_snapshot"],
    ["snapshot_bad_link", "self_check_snapshot"],
    ["snapshot_bad_policy", "self_check_snapshot"],
  ]) {
    await expectHold(port, selectedMode, checkId);
  }

  await proveOutputPublicationSafety(port);

  const publicHttp = await expectBaseAdmission("http://example.invalid", 1, "public HTTP must fail pre-fetch");
  assert.match(publicHttp.stderr, /public base URL must use https/);
  await expectBaseAdmission("https://example.invalid", 2, "public HTTPS must pass admission and fail only evidence checks");
  await expectBaseAdmission("http://127.0.0.1:1", 2, "private/loopback HTTP must pass admission");
  await expectBaseAdmission("http://[::1]:1", 2, "bracketed IPv6 loopback HTTP must pass admission");

  console.log(MARKER);
} finally {
  for (const socket of sockets) socket.destroy();
  await new Promise((resolve) => server.close(resolve));
}
