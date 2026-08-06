#!/usr/bin/env node
import childProcess from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import process from "node:process";
import { once } from "node:events";
import {
  CHAIN_ID,
  NETWORK,
  BOOTSTRAP_SCHEMA,
  objectWithId,
} from "./lib/void_public_seed_qualification_v1.mjs";
import { createPublicSeedClientAdapterV1 } from "../tools/void-public-seed-client-adapter-v1.mjs";

const MARKER = "VOID_PUBLIC_BOOTSTRAP_CLIENT_RESILIENCE_V1_PROOF";
const LOOPBACK = "127.0.0.1";

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function pass(message) {
  console.log(`[PASS] ${message}`);
}

async function listen(server) {
  server.listen(0, LOOPBACK);
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address === "object", "server address unavailable");
  return Number(address.port);
}

async function close(server) {
  if (!server.listening) return;
  server.close();
  await once(server, "close");
}

function sendJson(req, res, status, body) {
  const bytes = Buffer.from(`${JSON.stringify(body)}\n`);
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("content-length", String(bytes.length));
  res.setHeader("x-void-public-seed-gateway", "v1");
  if (String(req.method || "GET").toUpperCase() === "HEAD") res.end();
  else res.end(bytes);
}

function createGoodGateway() {
  return http.createServer((req, res) => {
    const method = String(req.method || "GET").toUpperCase();
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (!["GET", "HEAD"].includes(method)) {
      sendJson(req, res, 405, { ok: false, error: "method_not_allowed" });
      return;
    }
    if (url.pathname === "/admin") {
      sendJson(req, res, 404, { ok: false, error: "route_not_public" });
      return;
    }
    if (url.pathname === "/__void/ready.json") {
      sendJson(req, res, 200, { ready: true, head: 2000, gap: 0, txroot_live: 1 });
      return;
    }
    if (url.pathname === "/blocks/latest/number2.json") {
      sendJson(req, res, 200, { number: 2000 });
      return;
    }
    if (url.pathname === "/head") {
      sendJson(req, res, 200, { head: 2000 });
      return;
    }
    if (url.pathname === "/__void/demo/summary.json") {
      sendJson(req, res, 200, { chain: { head: 2000 } });
      return;
    }
    if (url.pathname === "/api/health") {
      sendJson(req, res, 200, { ok: true, head: 2000 });
      return;
    }
    if (url.pathname === "/blocks/range") {
      const from = Number(url.searchParams.get("from"));
      const to = Number(url.searchParams.get("to"));
      const blocks = Array.from({ length: to - from + 1 }, (_, index) => ({
        number: from + index,
      }));
      sendJson(req, res, 200, { blocks });
      return;
    }
    sendJson(req, res, 404, { ok: false, error: "route_not_public" });
  });
}

function createRedirectGateway() {
  return http.createServer((_req, res) => {
    res.statusCode = 302;
    res.setHeader("location", "http://127.0.0.1/private");
    res.end("redirected\n");
  });
}

async function runNode(args, env) {
  const child = childProcess.spawn(process.execPath, args, {
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const [code, signal] = await once(child, "exit");
  return { code, signal, stdout, stderr };
}

function authorityFalse() {
  return {
    private_routes_exposed: false,
    wallet_authority: false,
    signer_authority: false,
    validator_authority: false,
    treasury_authority: false,
    work_credit_authority: false,
    money_movement_authority: false,
  };
}

function stableManifest(endpoint, nowMs) {
  const body = {
    schema: BOOTSTRAP_SCHEMA,
    network: NETWORK,
    chain_id: CHAIN_ID,
    status: "stable_https_seed",
    generated_at: new Date(nowMs).toISOString(),
    expires_at: new Date(nowMs + 2 * 60 * 60 * 1000).toISOString(),
    sync_endpoints: [
      {
        transport: "https",
        base: endpoint,
        priority: 10,
        enabled: true,
        temporary: false,
        qualification_id: `voidpsq1_${"a".repeat(64)}`,
        qualified_at: new Date(nowMs - 60_000).toISOString(),
        qualified_head: 2000,
      },
    ],
    onion_endpoints: [],
    private_tailnet_endpoints_published: false,
    authority: authorityFalse(),
    notes: "loopback-only test fixture",
  };
  return objectWithId("voidpbm1_", body, "manifest_id");
}

const laneFiles = [
  "public/bootstrap/v1.json",
  "scripts/resolve_void_public_bootstrap_v1.mjs",
  "scripts/lib/void_public_seed_client_transport_v1.mjs",
  "tools/void-public-seed-client-adapter-v1.mjs",
  "scripts/run_void_public_bootstrap_supervisor_v1.mjs",
  "src/http/follower_routes.ts",
  "run-void-node.sh",
];
for (const file of laneFiles) {
  assert(fs.existsSync(file), `missing ${file}`);
}
const staticSource = laneFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
for (const marker of [
  "hold_no_stable_seed",
  "VOID_PUBLIC_BOOTSTRAP_REQUIRE",
  "VOID_PUBLIC_SEED_CLIENT_ADAPTER_V1",
  "VOID_PUBLIC_BOOTSTRAP_SUPERVISOR_V1",
  "VOID_PUBLIC_BOOTSTRAP_CATCHUP_PROGRESS",
  "VOID_PUBLIC_BOOTSTRAP_CLIENT_ADAPTER_ACTIVE",
  "dns_pinned",
  "redirects_followed: false",
]) {
  assert(staticSource.includes(marker), `missing static marker ${marker}`);
}
assert(
  !/(?<![.\w$])catch\s*(?:\([^)]*\))?\s*\{\s*\}/g.test(staticSource),
  "lane contains a raw empty catch",
);
pass("static client, launcher, and catch-up contracts");

const badGateway = createRedirectGateway();
const goodGateway = createGoodGateway();
const badPort = await listen(badGateway);
const goodPort = await listen(goodGateway);
const badBase = `http://${LOOPBACK}:${badPort}`;
const goodBase = `http://${LOOPBACK}:${goodPort}`;

let adapter;
let manifestServer;
try {
  adapter = await createPublicSeedClientAdapterV1({
    peers: `${badBase},${goodBase}`,
    host: LOOPBACK,
    port: 0,
    timeoutMs: 3000,
    maxBytes: 1024 * 1024,
    allowLoopbackFixture: true,
  });

  const readyResponse = await fetch(`${adapter.base}/__void/ready.json`);
  const ready = await readyResponse.json();
  assert(readyResponse.status === 200, "adapter readiness failed");
  assert(ready.ready === true && ready.head === 2000, "adapter readiness body mismatch");
  assert(
    readyResponse.headers.get("x-void-public-seed-client") === "v1",
    "adapter identity header missing",
  );

  const status = await (await fetch(`${adapter.base}/__void/public-seed-client-v1.json`)).json();
  assert(status.loopback_only === true, "adapter is not loopback-only");
  assert(status.dns_pinned === true, "adapter is not DNS-pinned");
  assert(status.redirects_followed === false, "adapter follows redirects");
  assert(status.failover_count === 1, "adapter did not record first-peer failover");

  const range999 = await fetch(`${adapter.base}/blocks/range?from=1&to=999`);
  assert(range999.status === 200, "adapter rejected a 999-block range");
  await range999.arrayBuffer();
  const range999Retry = await fetch(`${adapter.base}/blocks/range?from=1&to=999`);
  assert(range999Retry.status === 200, "adapter rejected an immediate range retry");
  await range999Retry.arrayBuffer();
  const statusAfterRange = await (
    await fetch(`${adapter.base}/__void/public-seed-client-v1.json`)
  ).json();
  assert(statusAfterRange.range_cache_hits === 1, "adapter did not absorb the duplicate range retry");
  const range1000 = await fetch(`${adapter.base}/blocks/range?from=1&to=1000`);
  assert(range1000.status === 400, "adapter accepted a 1000-block range");
  const mutation = await fetch(`${adapter.base}/follower/start`, { method: "POST" });
  assert(mutation.status === 405, "adapter accepted a mutation method");
  const privateRoute = await fetch(`${adapter.base}/admin`);
  assert(privateRoute.status === 404, "adapter exposed a private route");
  const polluted = await fetch(`${adapter.base}/__void/ready.json?peer=x`);
  assert(polluted.status === 400, "adapter accepted query pollution");
  pass("loopback adapter failover and route boundary");

  const hold = JSON.parse(fs.readFileSync("public/bootstrap/v1.json", "utf8"));
  const nowMs = Date.now();
  const stable = stableManifest(goodBase, nowMs);
  const tampered = structuredClone(stable);
  tampered.sync_endpoints[0].qualified_head = 1999;
  const expiredBody = {
    ...stable,
    generated_at: new Date(nowMs - 3 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(nowMs - 60 * 60 * 1000).toISOString(),
  };
  delete expiredBody.manifest_id;
  const expired = objectWithId("voidpbm1_", expiredBody, "manifest_id");

  manifestServer = http.createServer((req, res) => {
    const path = new URL(req.url || "/", "http://127.0.0.1").pathname;
    const body =
      path === "/hold.json" ? hold :
      path === "/stable.json" ? stable :
      path === "/tampered.json" ? tampered :
      path === "/expired.json" ? expired : null;
    if (!body) {
      res.statusCode = 404;
      res.end("not found\n");
      return;
    }
    const bytes = Buffer.from(`${JSON.stringify(body)}\n`);
    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.setHeader("content-length", String(bytes.length));
    res.end(bytes);
  });
  const manifestPort = await listen(manifestServer);
  const resolver = "scripts/resolve_void_public_bootstrap_v1.mjs";
  const fixtureEnv = {
    VOID_PUBLIC_BOOTSTRAP_ALLOW_LOOPBACK_FIXTURE: "1",
    VOID_PUBLIC_BOOTSTRAP_TIMEOUT_MS: "3000",
  };

  const holdResult = await runNode([resolver, "--allow-hold"], {
    ...fixtureEnv,
    VOID_PUBLIC_BOOTSTRAP_MANIFEST_URL: `http://${LOOPBACK}:${manifestPort}/hold.json`,
  });
  assert(holdResult.code === 0 && holdResult.stdout.trim() === "", "hold manifest did not hold cleanly");
  assert(holdResult.stderr.includes("VOID_PUBLIC_BOOTSTRAP_RESOLVER_V1_HOLD"), "hold marker missing");

  const stableResult = await runNode([resolver], {
    ...fixtureEnv,
    VOID_PUBLIC_BOOTSTRAP_MANIFEST_URL: `http://${LOOPBACK}:${manifestPort}/stable.json`,
  });
  assert(stableResult.code === 0, `stable resolver failed: ${stableResult.stderr}`);
  assert(stableResult.stdout.trim() === goodBase, "stable resolver returned the wrong seed");
  assert(stableResult.stderr.includes("VOID_PUBLIC_BOOTSTRAP_RESOLVER_V1_GREEN"), "green marker missing");

  const tamperedResult = await runNode([resolver], {
    ...fixtureEnv,
    VOID_PUBLIC_BOOTSTRAP_MANIFEST_URL: `http://${LOOPBACK}:${manifestPort}/tampered.json`,
  });
  assert(tamperedResult.code !== 0, "resolver accepted a tampered manifest");
  assert(tamperedResult.stderr.includes("manifest ID does not match"), "tamper rejection was unclear");

  const expiredResult = await runNode([resolver], {
    ...fixtureEnv,
    VOID_PUBLIC_BOOTSTRAP_MANIFEST_URL: `http://${LOOPBACK}:${manifestPort}/expired.json`,
  });
  assert(expiredResult.code !== 0, "resolver accepted an expired manifest");
  assert(expiredResult.stderr.includes("manifest is expired"), "expiry rejection was unclear");
  pass("content-addressed hold and stable manifest resolution");

  process.env.VOID_FOLLOWER_AUTOSTART_PEERS = adapter.base;
  process.env.VOID_PUBLIC_BOOTSTRAP_CLIENT_ADAPTER_ACTIVE = "1";
  process.env.VOID_FOLLOWER_AUTOSTART_INTERVAL_MS = "500";
  process.env.VOID_FOLLOWER_CATCHUP_INTERVAL_MS = "50";
  process.env.VOID_FOLLOWER_CATCHUP_PULL_LIMIT = "999";
  process.env.VOID_FOLLOWER_FAILURE_BACKOFF_MAX_MS = "1000";

  const { registerFollowerRoutes } = await import("../src/http/follower_routes.ts");
  const calls = [];
  const app = { post() {}, get() {} };
  const node = {
    async pullOnce(peer) {
      calls.push(peer);
      if (calls.length === 1) {
        return {
          ok: true,
          imported: 999,
          filled: 0,
          myHead: 0,
          advancedHead: 999,
          theirHead: 1998,
        };
      }
      return {
        ok: true,
        imported: 999,
        filled: 0,
        myHead: 999,
        advancedHead: 1998,
        theirHead: 1998,
      };
    },
  };
  registerFollowerRoutes(app, node);
  await new Promise((resolve) => setTimeout(resolve, 1300));
  assert(calls.length >= 2, "catch-up loop did not schedule a rapid second pull");
  assert(calls.every((peer) => peer === adapter.base), "node followed a non-loopback peer");
  assert(process.env.VOID_FOLLOWER_PULL_LIMIT === "999", "catch-up pull limit was not activated");
  pass("bounded catch-up through loopback adapter");
} finally {
  if (adapter) await close(adapter.server);
  if (manifestServer) await close(manifestServer);
  await close(badGateway);
  await close(goodGateway);
}

console.log(`${MARKER}_GREEN`);
console.log("stable_seed_published=false");
console.log("public_manifest_status=hold_no_stable_seed");
console.log("tailnet_required=false");
console.log("direct_remote_fetch_from_node=false");
console.log("private_mutation_routes_exposed=false");
console.log("wallet_authority=false");
console.log("signer_authority=false");
console.log("validator_authority=false");
console.log("treasury_authority=false");
console.log("work_credit_authority=false");
console.log("money_movement_authority=false");
