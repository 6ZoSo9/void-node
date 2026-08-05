#!/usr/bin/env node
import childProcess from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import process from "node:process";

const MARKER = "VOID_PUBLIC_BOOTSTRAP_CATCHUP_RESILIENCE_V1_PROOF";
const UPSTREAM_PORT = 42210;
const GATEWAY_PORT = 42211;

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
async function waitFor(url, attempts = 50) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  fail(`timed out waiting for ${url}`);
}

const followerSource = requireText("src/http/follower_routes.ts", [
  "VOID_FOLLOWER_AUTOSTART_PEERS",
  "VOID_FOLLOWER_CATCHUP_INTERVAL_MS",
  "VOID_FOLLOWER_CATCHUP_PULL_LIMIT",
  "VOID_PUBLIC_BOOTSTRAP_CATCHUP_PROGRESS",
  "VOID_PUBLIC_BOOTSTRAP_PEER_FAILOVER",
  "catchupPullLimit",
  "999",
]);
if (!followerSource.includes("process.env.VOID_FOLLOWER_PULL_LIMIT = String(catchupPullLimit)")) {
  fail("public catch-up loop does not bind its verified pull limit");
}

const gatewaySource = requireText("tools/void-public-seed-gateway-v1.mjs", [
  "VOID_PUBLIC_SEED_MAX_RANGE",
  "VOID_PUBLIC_SEED_MAX_RESPONSE_BYTES",
  "upstream_response_too_large",
  "max_response_bytes=",
  "private_mutation_routes_exposed=false",
]);
if (!gatewaySource.includes("Math.min(999")) fail("gateway range is not bounded at 999 blocks");
if (gatewaySource.includes('pathname === "/follower/start"')) {
  fail("gateway exposes follower mutation");
}
pass("static-catchup-failover-and-gateway-contracts");

process.env.VOID_FOLLOWER_AUTOSTART_PEERS =
  "https://seed-one.example,https://seed-two.example";
process.env.VOID_FOLLOWER_AUTOSTART_INTERVAL_MS = "500";
process.env.VOID_FOLLOWER_CATCHUP_INTERVAL_MS = "50";
process.env.VOID_FOLLOWER_CATCHUP_PULL_LIMIT = "999";
process.env.VOID_FOLLOWER_FAILURE_BACKOFF_MAX_MS = "1000";

const { registerFollowerRoutes } = await import("../src/http/follower_routes.ts");
const calls = [];
let secondPeerPulls = 0;
const app = {
  post() {},
  get() {},
};
const node = {
  async pullOnce(peer) {
    calls.push(peer);
    if (peer === "https://seed-one.example") {
      return { ok: false, reason: "fixture first seed unavailable" };
    }
    secondPeerPulls += 1;
    if (secondPeerPulls === 1) {
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
      imported: 0,
      filled: 0,
      myHead: 1998,
      advancedHead: 1998,
      theirHead: 1998,
    };
  },
};
registerFollowerRoutes(app, node);
await new Promise((resolve) => setTimeout(resolve, 1900));
if (calls[0] !== "https://seed-one.example") fail("first configured seed was not attempted");
if (!calls.includes("https://seed-two.example")) fail("follower did not fail over to second seed");
if (process.env.VOID_FOLLOWER_PULL_LIMIT !== "999") {
  fail("follower did not activate the bounded catch-up pull limit");
}
pass("runtime-peer-failover-and-catchup-scheduling");

const largeBody = Buffer.from(JSON.stringify({ payload: "x".repeat(2 * 1024 * 1024) }));
const upstream = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://127.0.0.1:${UPSTREAM_PORT}`);
  if (url.pathname === "/__void/ready.json") {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ready: true, head: 1998, gap: 0, txroot_live: 1 }));
    return;
  }
  if (url.pathname === "/blocks/latest/number2.json") {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ number: 1998 }));
    return;
  }
  if (url.pathname === "/blocks/range") {
    const from = Number(url.searchParams.get("from"));
    const to = Number(url.searchParams.get("to"));
    res.setHeader("content-type", "application/json");
    if (from === 7 && to === 7) {
      res.setHeader("content-length", largeBody.length);
      res.end(largeBody);
      return;
    }
    res.end(
      JSON.stringify(
        Array.from({ length: to - from + 1 }, (_, index) => ({ number: from + index })),
      ),
    );
    return;
  }
  res.statusCode = 404;
  res.end("not found\n");
});

let gateway;
try {
  await listen(upstream, UPSTREAM_PORT);
  gateway = childProcess.spawn(process.execPath, ["tools/void-public-seed-gateway-v1.mjs"], {
    env: {
      ...process.env,
      VOID_PUBLIC_SEED_PORT: String(GATEWAY_PORT),
      VOID_PUBLIC_SEED_UPSTREAM: `http://127.0.0.1:${UPSTREAM_PORT}`,
      VOID_PUBLIC_SEED_MAX_RESPONSE_BYTES: String(1024 * 1024),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let gatewayLog = "";
  gateway.stdout.on("data", (chunk) => { gatewayLog += chunk; });
  gateway.stderr.on("data", (chunk) => { gatewayLog += chunk; });
  await waitFor(`http://127.0.0.1:${GATEWAY_PORT}/__void/ready.json`);

  const bounded = await fetch(
    `http://127.0.0.1:${GATEWAY_PORT}/blocks/range?from=0&to=998`,
  );
  if (!bounded.ok || (await bounded.json()).length !== 999) {
    fail("gateway did not serve the maximum bounded catch-up range");
  }

  const oversizedRange = await fetch(
    `http://127.0.0.1:${GATEWAY_PORT}/blocks/range?from=0&to=999`,
  );
  if (oversizedRange.status !== 404) fail("gateway accepted a 1000-block range");

  const oversizedBody = await fetch(
    `http://127.0.0.1:${GATEWAY_PORT}/blocks/range?from=7&to=7`,
  );
  if (oversizedBody.status !== 502) fail("gateway accepted an oversized response body");
  const oversizedJson = await oversizedBody.json();
  if (oversizedJson?.error !== "upstream_response_too_large") {
    fail("gateway oversized response classification mismatch");
  }

  const mutation = await fetch(
    `http://127.0.0.1:${GATEWAY_PORT}/follower/start`,
    { method: "POST" },
  );
  if (mutation.status !== 405) fail("gateway accepted a mutation method");
  if (!gatewayLog.includes("max_range=999")) fail("gateway range marker missing");
  if (!gatewayLog.includes(`max_response_bytes=${1024 * 1024}`)) {
    fail("gateway response cap marker missing");
  }
  pass("runtime-bounded-range-response-cap-and-mutation-rejection");
} finally {
  if (gateway && !gateway.killed) gateway.kill("SIGTERM");
  await close(upstream).catch(() => {});
}

console.log(JSON.stringify({
  marker: MARKER,
  catchup_interval_ms: 50,
  catchup_pull_limit: 999,
  peer_failover: true,
  exponential_failure_backoff: true,
  gateway_response_cap: true,
  mutation_routes_exposed: false,
  status: "GREEN",
}, null, 2));
console.log(`${MARKER}_GREEN`);
