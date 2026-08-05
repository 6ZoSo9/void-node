#!/usr/bin/env node
import childProcess from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import process from "node:process";

const MARKER = "VOID_PUBLIC_BOOTSTRAP_AUTODISCOVERY_V1_PROOF";
const UPSTREAM_PORT = 42110;
const GATEWAY_PORT = 42111;
const MANIFEST_PORT = 42112;

function fail(message) {
  console.error(`[FAIL] ${message}`);
  process.exitCode = 1;
  throw new Error(message);
}
function pass(message) {
  console.log(`[PASS] ${message}`);
}
function read(path) {
  if (!fs.existsSync(path)) fail(`missing ${path}`);
  return fs.readFileSync(path, "utf8");
}
function requireText(path, needles) {
  const text = read(path);
  for (const needle of needles) {
    if (!text.includes(needle)) fail(`${path} missing ${JSON.stringify(needle)}`);
  }
  pass(`markers-${path}`);
  return text;
}
function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
}
function close(server) {
  return new Promise((resolve) => server.close(resolve));
}
function runChild(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = childProcess.spawn(command, args, {
      ...options,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (status, signal) => resolve({ status, signal, stdout, stderr }));
  });
}
async function waitFor(url, attempts = 50) {
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  fail(`timed out waiting for ${url}`);
}

const launcher = requireText("run-void-node.sh", [
  "resolve_void_public_bootstrap_v1.mjs",
  "VOID_PUBLIC_BOOTSTRAP_DISABLE",
  "VOID_FOLLOWER_AUTOSTART_PEER",
  "tailnet_required=false",
  "no exact-green public VOID seed is available",
]);
if (/100\.\d+\.\d+\.\d+/.test(launcher)) fail("launcher embeds a private Tailnet address");

const resolver = requireText("scripts/resolve_void_public_bootstrap_v1.mjs", [
  "void_public_bootstrap_v1",
  "raw.githubusercontent.com/6ZoSo9/void-node/main/public/bootstrap/v1.json",
  "sync endpoint must use HTTPS",
  "manifest does not preserve the private-tailnet boundary",
  "seed readiness is not exact-green",
]);
if (!resolver.includes("a === 100 && b >= 64 && b <= 127")) {
  fail("resolver does not reject CGNAT/Tailnet IPv4 literals");
}

requireText("src/http/follower_routes.ts", [
  "VOID_FOLLOWER_AUTOSTART_PEER",
  "VOID_PUBLIC_BOOTSTRAP_AUTOSTART_ACTIVE",
  "node.startFollower",
]);

const gatewaySource = requireText("tools/void-public-seed-gateway-v1.mjs", [
  "VOID_PUBLIC_SEED_GATEWAY_V1",
  'pathname === "/blocks/range"',
  'pathname === "/blocks/latest/number2.json"',
  "method_not_allowed",
  "route_not_public",
  "private_mutation_routes_exposed=false",
]);
if (gatewaySource.includes('pathname === "/follower/start"')) {
  fail("gateway exposes follower mutation");
}

const quickTunnel = requireText("ops/public/run_void_public_seed_quick_tunnel_v1.sh", [
  'CLOUDFLARED_VERSION="2026.7.3"',
  'CLOUDFLARED_SHA256="9d71c677db00134c1bd4144b7783486b654ad281b1ea62b4972098d19f770f17"',
  "trycloudflare.com",
  "private_rpc_exposed=false",
  "tailnet_required_for_clients=false",
]);
if (/\bsudo\b/.test(quickTunnel)) fail("quick-tunnel helper requires sudo");

const committedManifest = JSON.parse(read("public/bootstrap/v1.json"));
if (committedManifest.schema !== "void_public_bootstrap_v1") fail("manifest schema mismatch");
if (committedManifest.chain_id !== 2050) fail("manifest chain mismatch");
if (committedManifest.private_tailnet_endpoints_published !== false) {
  fail("manifest private-tailnet boundary is not false");
}
if (!Array.isArray(committedManifest.sync_endpoints)) fail("manifest endpoints missing");
pass("static-contracts");

const upstream = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://127.0.0.1:${UPSTREAM_PORT}`);
  if (url.pathname === "/__void/ready.json") {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ready: true, head: 42, lastmile_seen: 42, gap: 0, txroot_live: 1, reasons: [] }));
    return;
  }
  if (url.pathname === "/blocks/latest/number2.json") {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ number: 42 }));
    return;
  }
  if (url.pathname === "/blocks/range") {
    const from = Number(url.searchParams.get("from"));
    const to = Number(url.searchParams.get("to"));
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(Array.from({ length: to - from + 1 }, (_, index) => ({ number: from + index }))));
    return;
  }
  res.statusCode = 404;
  res.end("not found\n");
});

const manifestServer = http.createServer((req, res) => {
  const privateFixture = String(req.url || "").startsWith("/private");
  const base = privateFixture
    ? "https://100.122.245.125:4111"
    : `http://127.0.0.1:${GATEWAY_PORT}`;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({
    schema: "void_public_bootstrap_v1",
    network: "VOID Network",
    chain_id: 2050,
    status: "fixture",
    generated_at: "2026-08-05T00:00:00Z",
    expires_at: null,
    sync_endpoints: [{ transport: "https", base, priority: 1, enabled: true }],
    onion_endpoints: [],
    private_tailnet_endpoints_published: false,
  }));
});

let gateway;
try {
  await listen(upstream, UPSTREAM_PORT);
  await listen(manifestServer, MANIFEST_PORT);

  gateway = childProcess.spawn(process.execPath, ["tools/void-public-seed-gateway-v1.mjs"], {
    env: {
      ...process.env,
      VOID_PUBLIC_SEED_PORT: String(GATEWAY_PORT),
      VOID_PUBLIC_SEED_UPSTREAM: `http://127.0.0.1:${UPSTREAM_PORT}`,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let gatewayLog = "";
  gateway.stdout.on("data", (chunk) => { gatewayLog += chunk; });
  gateway.stderr.on("data", (chunk) => { gatewayLog += chunk; });
  await waitFor(`http://127.0.0.1:${GATEWAY_PORT}/__void/ready.json`);

  const range = await fetch(`http://127.0.0.1:${GATEWAY_PORT}/blocks/range?from=40&to=42`);
  if (!range.ok || (await range.json()).length !== 3) fail("gateway range proxy failed");
  const forbidden = await fetch(`http://127.0.0.1:${GATEWAY_PORT}/admin`);
  if (forbidden.status !== 404) fail("gateway did not reject an unsafe route");
  const mutation = await fetch(`http://127.0.0.1:${GATEWAY_PORT}/follower/start`, { method: "POST" });
  if (mutation.status !== 405) fail("gateway did not reject mutation method");
  const oversized = await fetch(`http://127.0.0.1:${GATEWAY_PORT}/blocks/range?from=0&to=999`);
  if (oversized.status !== 404) fail("gateway accepted an oversized range");
  pass("read-only-gateway-runtime");

  const resolved = await runChild(
    process.execPath,
    ["scripts/resolve_void_public_bootstrap_v1.mjs"],
    {
      env: {
        ...process.env,
        VOID_PUBLIC_BOOTSTRAP_MANIFEST_URL: `http://127.0.0.1:${MANIFEST_PORT}/manifest`,
        VOID_PUBLIC_BOOTSTRAP_ALLOW_LOOPBACK_FIXTURE: "1",
      },
    },
  );
  if (resolved.status !== 0) {
    process.stderr.write(resolved.stdout || "");
    process.stderr.write(resolved.stderr || "");
    fail("resolver did not accept exact-green loopback fixture");
  }
  if (resolved.stdout.trim() !== `http://127.0.0.1:${GATEWAY_PORT}`) {
    fail("resolver selected an unexpected fixture base");
  }
  pass("resolver-green-runtime");

  const rejected = await runChild(
    process.execPath,
    ["scripts/resolve_void_public_bootstrap_v1.mjs"],
    {
      env: {
        ...process.env,
        VOID_PUBLIC_BOOTSTRAP_MANIFEST_URL: `http://127.0.0.1:${MANIFEST_PORT}/private`,
        VOID_PUBLIC_BOOTSTRAP_ALLOW_LOOPBACK_FIXTURE: "1",
      },
    },
  );
  if (rejected.status === 0 || !String(rejected.stderr).includes("private or unsupported literal host")) {
    process.stderr.write(rejected.stdout || "");
    process.stderr.write(rejected.stderr || "");
    fail("resolver did not reject private Tailnet seed fixture");
  }
  pass("resolver-private-tailnet-rejection");

  if (!gatewayLog.includes("VOID_PUBLIC_SEED_GATEWAY_V1_READY")) {
    fail("gateway readiness marker missing");
  }
} finally {
  if (gateway && !gateway.killed) gateway.kill("SIGTERM");
  await close(manifestServer).catch(() => {});
  await close(upstream).catch(() => {});
}

console.log(JSON.stringify({
  marker: MARKER,
  public_https_primary: true,
  github_manifest: true,
  cloudflare_quick_tunnel_operator_path: true,
  tor_onion_secondary: true,
  private_tailnet_seed_rejected: true,
  mutation_routes_exposed: false,
  synchronous_fixture_deadlock_removed: true,
  status: "GREEN",
}, null, 2));
console.log(`${MARKER}_GREEN`);
