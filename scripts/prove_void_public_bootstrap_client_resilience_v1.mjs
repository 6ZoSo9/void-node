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
const LOCAL_HOLD_PATH = `/tmp/void-public-bootstrap-client-${process.pid}-hold.json`;
const LOCAL_TAMPERED_PATH = `/tmp/void-public-bootstrap-client-${process.pid}-tampered.json`;
const LOCAL_STABLE_PATH = `/tmp/void-public-bootstrap-client-${process.pid}-stable.json`;

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

async function assertRejects(fn, pattern, message) {
  try {
    await fn();
  } catch (error) {
    assert(pattern.test(String(error?.message || error)), `${message}: ${error?.message || error}`);
    return;
  }
  fail(message);
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

function removeFixture(path) {
  try {
    fs.unlinkSync(path);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.error("VOID_PUBLIC_BOOTSTRAP_CLIENT_FIXTURE_CLEANUP_FAILURE", {
        path,
        message: error?.message || String(error),
      });
    }
  }
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

function createFollowerAdversaryGateway(state) {
  return http.createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (state.mode === "redirect_all_302" || state.mode === "redirect_all_307") {
      state.redirect_source_requests += 1;
      res.statusCode = Number(state.mode.slice(-3));
      res.setHeader("location", state.redirect_location);
      res.end("redirected\n");
      return;
    }
    if (url.pathname === "/blocks/latest/number2.json") {
      state.head_requests += 1;
      if (state.mode === "streamed_oversize_head") {
        res.statusCode = 200;
        res.setHeader("content-type", "application/json");
        res.write(`{"padding":"${"x".repeat(70 * 1024)}`);
        res.end('"}\n');
        return;
      }
      sendJson(req, res, 200, { number: state.head ?? state.block.number });
      return;
    }
    if (url.pathname === "/head") {
      state.head_fallback_requests += 1;
      sendJson(req, res, 200, { head: state.head ?? state.block.number });
      return;
    }
    if (url.pathname === "/blocks/range") {
      state.range_requests += 1;
      if (state.mode === "declared_oversize_range") {
        res.statusCode = 200;
        res.setHeader("content-type", "application/json");
        res.setHeader("content-length", String(128 * 1024 * 1024 + 1));
        res.end("[]");
        return;
      }
      if (state.mode === "http_404" || state.mode === "http_500") {
        sendJson(req, res, Number(state.mode.slice(5)), [state.block]);
        return;
      }
      if (state.mode === "redirect_range_302" || state.mode === "redirect_range_307") {
        state.redirect_source_requests += 1;
        res.statusCode = Number(state.mode.slice(-3));
        res.setHeader("location", state.redirect_location);
        res.end("redirected\n");
        return;
      }
      sendJson(req, res, 200, state.range_blocks ?? [state.block]);
      return;
    }
    sendJson(req, res, 404, { ok: false, error: "route_not_public" });
  });
}

function createFollowerImportFixture(Node, receipts) {
  const blocks = new Map();
  const state = {
    head: -1,
    block_writes: 0,
    index_writes: 0,
    receipt_writes: 0,
    hook_calls: 0,
  };
  const node = Object.create(Node.prototype);
  node.store = {
    loadHeadNumber: () => state.head,
    loadBlock: (number) => blocks.get(number) || null,
    saveBlock: (block) => {
      state.block_writes += 1;
      blocks.set(Number(block.number), block);
      state.head = Math.max(state.head, Number(block.number));
    },
    persistHeadAtomic: (number) => {
      state.head = Math.max(state.head, Number(number));
    },
  };
  node.txIndex = {
    putMany: () => { state.index_writes += 1; },
  };
  node.receipts = receipts;
  return { node, state, blocks };
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
  "src/node_core.ts",
  "run-void-node.sh",
];
for (const file of laneFiles) {
  assert(fs.existsSync(file), `missing ${file}`);
}
const staticSource = laneFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
for (const marker of [
  "hold_no_stable_seed",
  "local_hold_no_stable_seed",
  "canonical_manifest_published=false",
  "--local-hold-file",
  "VOID_PUBLIC_BOOTSTRAP_REQUIRE",
  "VOID_PUBLIC_SEED_CLIENT_ADAPTER_V1",
  "VOID_PUBLIC_BOOTSTRAP_SUPERVISOR_V1",
  "VOID_PUBLIC_BOOTSTRAP_CATCHUP_PROGRESS",
  "VOID_PUBLIC_BOOTSTRAP_CLIENT_ADAPTER_ACTIVE",
  "VOID_FOLLOWER_PULL_TIMEOUT_MS",
  "AbortSignal.timeout",
  "throwIfFollowerPullAbortedV1",
  'redirect: "error"',
  "response.url",
  "dns_pinned",
  "redirects_followed: false",
]) {
  assert(staticSource.includes(marker), `missing static marker ${marker}`);
}
assert(
  staticSource.includes("grep -Fq 'manifest request returned HTTP 404'"),
  "launcher local hold fallback is not limited to explicit canonical 404",
);
assert(
  staticSource.includes('test "$manifest_override" = 0'),
  "launcher local hold fallback does not reject custom manifest URLs",
);
assert(
  staticSource.includes('test "${VOID_PUBLIC_BOOTSTRAP_REQUIRE:-0}" != 1'),
  "launcher local hold fallback does not preserve required-sync failure",
);
assert(
  !/(?<![.\w$])catch\s*(?:\([^)]*\))?\s*\{\s*\}/g.test(staticSource),
  "lane contains a raw empty catch",
);
pass("static client, launcher, and catch-up contracts");

const badGateway = createRedirectGateway();
const goodGateway = createGoodGateway();
const stalledGatewayState = { requests: 0, active: 0, maxActive: 0 };
const stalledGateway = http.createServer((req, res) => {
  stalledGatewayState.requests += 1;
  stalledGatewayState.active += 1;
  stalledGatewayState.maxActive = Math.max(
    stalledGatewayState.maxActive,
    stalledGatewayState.active,
  );
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    stalledGatewayState.active -= 1;
  };
  req.once("close", release);
  res.once("close", release);
});
const followerAdversaryState = {
  mode: "valid",
  block: { number: 0 },
  head: null,
  range_blocks: null,
  redirect_location: "",
  redirect_source_requests: 0,
  head_requests: 0,
  head_fallback_requests: 0,
  range_requests: 0,
};
const followerAdversaryGateway = createFollowerAdversaryGateway(followerAdversaryState);
const followerRedirectTargetState = { requests: 0 };
const followerRedirectTarget = http.createServer((req, res) => {
  followerRedirectTargetState.requests += 1;
  const url = new URL(req.url || "/", "http://127.0.0.1");
  if (url.pathname === "/blocks/range") sendJson(req, res, 200, [followerAdversaryState.block]);
  else sendJson(req, res, 200, { number: followerAdversaryState.head ?? followerAdversaryState.block.number });
});
const badPort = await listen(badGateway);
const goodPort = await listen(goodGateway);
const stalledPort = await listen(stalledGateway);
const followerAdversaryPort = await listen(followerAdversaryGateway);
const followerRedirectTargetPort = await listen(followerRedirectTarget);
const badBase = `http://${LOOPBACK}:${badPort}`;
const goodBase = `http://${LOOPBACK}:${goodPort}`;
const stalledBase = `http://${LOOPBACK}:${stalledPort}`;
const followerAdversaryBase = `http://${LOOPBACK}:${followerAdversaryPort}`;
const followerRedirectTargetBase = `http://${LOOPBACK}:${followerRedirectTargetPort}`;

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
  pass("content-addressed remote hold and stable manifest resolution");

  fs.writeFileSync(LOCAL_HOLD_PATH, `${JSON.stringify(hold)}\n`, { mode: 0o600 });
  const localTampered = structuredClone(hold);
  localTampered.notes = `${String(localTampered.notes || "")} tampered`;
  fs.writeFileSync(LOCAL_TAMPERED_PATH, `${JSON.stringify(localTampered)}\n`, { mode: 0o600 });
  fs.writeFileSync(LOCAL_STABLE_PATH, `${JSON.stringify(stable)}\n`, { mode: 0o600 });

  const localHoldResult = await runNode(
    [resolver, "--allow-hold", "--local-hold-file", LOCAL_HOLD_PATH],
    {},
  );
  assert(
    localHoldResult.code === 0 && localHoldResult.stdout.trim() === "",
    "verified local hold did not return a clean hold",
  );
  assert(
    localHoldResult.stderr.includes("manifest_source=local_hold_file"),
    "verified local hold source marker missing",
  );

  const localTamperedResult = await runNode(
    [resolver, "--allow-hold", "--local-hold-file", LOCAL_TAMPERED_PATH],
    {},
  );
  assert(localTamperedResult.code !== 0, "resolver accepted a tampered local hold");
  assert(
    localTamperedResult.stderr.includes("manifest ID does not match"),
    "local hold tamper rejection was unclear",
  );

  const localStableResult = await runNode(
    [resolver, "--allow-hold", "--local-hold-file", LOCAL_STABLE_PATH],
    fixtureEnv,
  );
  assert(localStableResult.code !== 0, "resolver accepted a local stable manifest fallback");
  assert(
    localStableResult.stderr.includes("local fallback accepts only hold_no_stable_seed"),
    "local stable fallback rejection was unclear",
  );
  pass("local fallback accepts only an untampered content-addressed hold");

  process.env.VOID_FOLLOWER_AUTOSTART_PEERS = `${stalledBase},${adapter.base}`;
  process.env.VOID_PUBLIC_BOOTSTRAP_CLIENT_ADAPTER_ACTIVE = "1";
  process.env.VOID_FOLLOWER_AUTOSTART_INTERVAL_MS = "500";
  process.env.VOID_FOLLOWER_CATCHUP_INTERVAL_MS = "50";
  process.env.VOID_FOLLOWER_CATCHUP_PULL_LIMIT = "999";
  process.env.VOID_FOLLOWER_FAILURE_BACKOFF_MAX_MS = "1000";
  process.env.VOID_FOLLOWER_PULL_TIMEOUT_MS = "100";

  const { Node } = await import("../src/node_core.ts");
  const {
    blockHash: followerBlockHash,
    computeRoots: computeFollowerBlockRoots,
  } = await import("../src/chain/block.ts");
  const { registerFollowerRoutes } = await import("../src/http/follower_routes.ts");
  const app = { post() {}, get() {} };
  const followerTx = { hash: "a".repeat(64), body: { proof: "bounded follower import" } };
  const followerRoots = computeFollowerBlockRoots([followerTx], []);
  const followerBlock0 = {
    number: 0,
    parentHash: "0".repeat(64),
    timestamp: Date.now(),
    txRoot: followerRoots.txRoot,
    blobRoot: followerRoots.blobRoot,
    txs: [followerTx],
    blobs: [],
    proposer: "fixture-proposer",
    sig: "b".repeat(128),
  };
  const followerBlock1 = {
    ...followerBlock0,
    number: 1,
    parentHash: followerBlockHash(followerBlock0),
    timestamp: followerBlock0.timestamp + 1,
  };

  const resetAdversary = (mode, block = followerBlock0, options = {}) => {
    followerAdversaryState.mode = mode;
    followerAdversaryState.block = block;
    followerAdversaryState.head = options.head ?? null;
    followerAdversaryState.range_blocks = options.rangeBlocks ?? null;
    followerAdversaryState.redirect_location = `${followerRedirectTargetBase}${options.redirectPath ?? "/blocks/latest/number2.json"}`;
    followerAdversaryState.redirect_source_requests = 0;
    followerRedirectTargetState.requests = 0;
    followerAdversaryState.head_requests = 0;
    followerAdversaryState.head_fallback_requests = 0;
    followerAdversaryState.range_requests = 0;
  };

  for (const mode of ["http_404", "http_500"]) {
    resetAdversary(mode);
    const fixture = createFollowerImportFixture(Node, {
      async appendMany() { fixture.state.receipt_writes += 1; },
    });
    await assertRejects(
      () => fixture.node.pullOnce(followerAdversaryBase),
      /VOID_FOLLOWER_PEER_HTTP_STATUS_V1/,
      `${mode} range did not fail terminally`,
    );
    assert(
      fixture.state.block_writes === 0 &&
        fixture.state.index_writes === 0 &&
        fixture.state.receipt_writes === 0,
      `${mode} range mutated follower state`,
    );
    assert(followerAdversaryState.range_requests === 1, `${mode} range was retried after terminal status`);
  }
  pass("non-success range bodies never enter follower validation or import");

  for (const mode of ["redirect_all_302", "redirect_all_307"]) {
    resetAdversary(mode);
    const fixture = createFollowerImportFixture(Node, {
      async appendMany() { fixture.state.receipt_writes += 1; },
    });
    const result = await fixture.node.pullOnce(followerAdversaryBase);
    assert(result.imported === 0, `${mode} imported redirected head data`);
    assert(
      fixture.state.block_writes === 0 &&
        fixture.state.index_writes === 0 &&
        fixture.state.receipt_writes === 0,
      `${mode} mutated follower state`,
    );
    assert(followerAdversaryState.redirect_source_requests <= 4, `${mode} failover was unbounded`);
    assert(followerRedirectTargetState.requests === 0, `${mode} reached the redirect target`);
  }

  resetAdversary("redirect_range_302", followerBlock0, {
    redirectPath: "/blocks/range?from=0&to=0",
  });
  const redirectedRangeFixture = createFollowerImportFixture(Node, {
    async appendMany() { redirectedRangeFixture.state.receipt_writes += 1; },
  });
  const redirectedRangeResult = await redirectedRangeFixture.node.pullOnce(followerAdversaryBase);
  assert(redirectedRangeResult.imported === 0, "redirected range imported peer data");
  assert(
    redirectedRangeFixture.state.block_writes === 0 &&
      redirectedRangeFixture.state.index_writes === 0 &&
      redirectedRangeFixture.state.receipt_writes === 0,
    "redirected range mutated follower state",
  );
  assert(followerAdversaryState.redirect_source_requests === 2, "redirected range retry was not bounded");
  assert(followerRedirectTargetState.requests === 0, "redirected range reached the second origin");
  pass("redirected head and range responses never cross peer provenance");

  resetAdversary("declared_oversize_range");
  const declaredOversizeFixture = createFollowerImportFixture(Node, {
    async appendMany() { declaredOversizeFixture.state.receipt_writes += 1; },
  });
  const declaredOversizeResult = await declaredOversizeFixture.node.pullOnce(followerAdversaryBase);
  assert(declaredOversizeResult.imported === 0, "declared oversized range imported a block");
  assert(
    declaredOversizeFixture.state.block_writes === 0 &&
      declaredOversizeFixture.state.index_writes === 0 &&
      declaredOversizeFixture.state.receipt_writes === 0,
    "declared oversized range mutated follower state",
  );
  pass("declared oversized range is rejected before JSON buffering");

  resetAdversary("streamed_oversize_head");
  const streamedOversizeFixture = createFollowerImportFixture(Node, {
    async appendMany(_records, opts = {}) {
      opts.signal?.throwIfAborted();
      streamedOversizeFixture.state.receipt_writes += 1;
    },
  });
  const streamedOversizeResult = await streamedOversizeFixture.node.pullOnce(followerAdversaryBase);
  assert(streamedOversizeResult.imported === 1, "bounded head fallback did not import valid range");
  assert(
    followerAdversaryState.head_requests === 1 &&
      followerAdversaryState.head_fallback_requests === 1,
    "streamed oversized head did not fall through exactly once",
  );
  assert(
    streamedOversizeFixture.state.block_writes === 1 &&
      streamedOversizeFixture.state.index_writes === 1 &&
      streamedOversizeFixture.state.receipt_writes === 1,
    "valid bounded range did not complete its import side effects",
  );
  pass("streamed oversized head is cancelled before bounded fallback and valid import");

  resetAdversary("valid");
  let stalledReceiptCalls = 0;
  const persistenceFixture = createFollowerImportFixture(Node, {
    appendMany(_records, opts = {}) {
      stalledReceiptCalls += 1;
      return new Promise((_resolve, reject) => {
        opts.signal?.addEventListener("abort", () => reject(opts.signal.reason), { once: true });
      });
    },
  });
  const persistenceStartedAt = Date.now();
  await assertRejects(
    () => persistenceFixture.node.pullOnce(followerAdversaryBase),
    /Timeout|abort/i,
    "stalled receipt persistence outlived the pull deadline",
  );
  assert(Date.now() - persistenceStartedAt < 1000, "stalled persistence did not settle promptly");
  const mutationsAtTimeout =
    persistenceFixture.state.block_writes +
    persistenceFixture.state.index_writes +
    persistenceFixture.state.receipt_writes;
  await new Promise((resolve) => setTimeout(resolve, 150));
  assert(
    persistenceFixture.state.block_writes +
      persistenceFixture.state.index_writes +
      persistenceFixture.state.receipt_writes === mutationsAtTimeout,
    "timed-out persistence produced a late mutation",
  );
  assert(stalledReceiptCalls === 1, "stalled persistence was retried or overlapped");

  resetAdversary("valid", followerBlock1);
  persistenceFixture.node.receipts = {
    async appendMany(_records, opts = {}) {
      opts.signal?.throwIfAborted();
      persistenceFixture.state.receipt_writes += 1;
    },
  };
  const postTimeoutProgress = await persistenceFixture.node.pullOnce(followerAdversaryBase);
  assert(
    postTimeoutProgress.imported === 1 && persistenceFixture.state.head === 1,
    "next peer attempt did not progress after terminal persistence timeout",
  );
  pass("pull deadline owns receipt persistence and releases the next import attempt");

  const emptyFollowerRoots = computeFollowerBlockRoots([], []);
  const followerPartialBlocks = [];
  let partialParent = followerBlock0;
  for (let number = 1; number <= 250; number += 1) {
    const block = {
      ...followerBlock0,
      number,
      parentHash: followerBlockHash(partialParent),
      timestamp: followerBlock0.timestamp + number,
      txRoot: emptyFollowerRoots.txRoot,
      blobRoot: emptyFollowerRoots.blobRoot,
      txs: [],
    };
    followerPartialBlocks.push(block);
    partialParent = block;
  }
  process.env.VOID_FOLLOWER_PULL_TIMEOUT_MS = "5000";
  process.env.VOID_FOLLOWER_PULL_LIMIT = "250";
  resetAdversary("valid", followerPartialBlocks[0], {
    head: 1000,
    rangeBlocks: followerPartialBlocks,
  });
  const partialFixture = createFollowerImportFixture(Node, { async appendMany() {} });
  partialFixture.blocks.set(0, followerBlock0);
  partialFixture.state.head = 0;
  const partialResult = await partialFixture.node.pullOnce(followerAdversaryBase);
  assert(partialResult.imported === 250, "complete bounded page did not import through requested end");
  assert(partialResult.advancedHead === 250, "complete bounded page did not advance to block 250");
  assert(partialResult.retried === false, "complete bounded page was falsely retried");
  assert(followerAdversaryState.range_requests === 1, "complete bounded page issued duplicate GETs");

  const followerBlock251 = {
    ...followerPartialBlocks[249],
    number: 251,
    parentHash: followerBlockHash(followerPartialBlocks[249]),
    timestamp: followerBlock0.timestamp + 251,
  };
  resetAdversary("valid", followerBlock251, {
    head: 251,
    rangeBlocks: [followerBlock251],
  });
  const continuedResult = await partialFixture.node.pullOnce(followerAdversaryBase);
  assert(
    continuedResult.imported === 1 && continuedResult.advancedHead === 251,
    "later pull did not continue from block 251",
  );
  assert(followerAdversaryState.range_requests === 1, "continued page issued duplicate GETs");
  process.env.VOID_FOLLOWER_PULL_TIMEOUT_MS = "100";
  pass("complete partial catch-up pages advance once and later pulls continue at the next block");

  const failoverNode = Object.create(Node.prototype);
  failoverNode.store = { loadHeadNumber: () => 2000 };
  const pullOnceV1 = Node.prototype.pullOnce;
  const failoverCalls = [];
  let failoverInFlight = 0;
  let failoverMaxInFlight = 0;
  failoverNode.pullOnce = async function (peer, hooks) {
    failoverCalls.push(peer);
    failoverInFlight += 1;
    failoverMaxInFlight = Math.max(failoverMaxInFlight, failoverInFlight);
    try {
      return await pullOnceV1.call(this, peer, hooks);
    } finally {
      failoverInFlight -= 1;
    }
  };

  registerFollowerRoutes(app, failoverNode);
  await new Promise((resolve) => setTimeout(resolve, 1650));
  assert(
    failoverCalls[0] === stalledBase && failoverCalls.includes(adapter.base),
    "timed-out bootstrap peer did not rotate to the next peer",
  );
  assert(
    failoverMaxInFlight === 1 && failoverInFlight === 0,
    "follower timeout detached or overlapped a pull",
  );
  assert(
    stalledGatewayState.requests === 1 &&
      stalledGatewayState.maxActive === 1 &&
      stalledGatewayState.active === 0,
    "stalled peer request was not cancelled and terminally released",
  );
  pass("bounded pull timeout cancels a stalled peer before failover");

  process.env.VOID_FOLLOWER_AUTOSTART_PEERS = adapter.base;
  const calls = [];
  const catchupNode = {
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
  registerFollowerRoutes(app, catchupNode);
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
  await close(stalledGateway);
  await close(followerAdversaryGateway);
  await close(followerRedirectTarget);
  removeFixture(LOCAL_HOLD_PATH);
  removeFixture(LOCAL_TAMPERED_PATH);
  removeFixture(LOCAL_STABLE_PATH);
}

console.log(`${MARKER}_GREEN`);
console.log("stable_seed_published=false");
console.log("public_manifest_status=hold_no_stable_seed");
console.log("canonical_manifest_published=false_until_parent_merge");
console.log("local_fallback_accepts_stable_seed=false");
console.log("tailnet_required=false");
console.log("direct_remote_fetch_from_node=false");
console.log("private_mutation_routes_exposed=false");
console.log("wallet_authority=false");
console.log("signer_authority=false");
console.log("validator_authority=false");
console.log("treasury_authority=false");
console.log("work_credit_authority=false");
console.log("money_movement_authority=false");
console.log("follower_redirect_provenance_bound=true");
console.log("complete_partial_page_single_get=true");
