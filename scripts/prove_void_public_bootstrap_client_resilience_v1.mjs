#!/usr/bin/env node
import childProcess from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
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
    const holdRejectedResponse = (status, headers = {}, end = false) => {
      state.rejected_streams_started += 1;
      state.active_rejected_streams += 1;
      state.max_active_rejected_streams = Math.max(
        state.max_active_rejected_streams,
        state.active_rejected_streams,
      );
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        state.active_rejected_streams -= 1;
        state.rejected_streams_closed += 1;
      };
      req.once("close", release);
      res.once("close", release);
      res.statusCode = status;
      for (const [name, value] of Object.entries(headers)) {
        res.setHeader(name, value);
      }
      res.write("x");
      if (end) res.end();
    };
    if (state.mode === "redirect_all_302" || state.mode === "redirect_all_307") {
      state.redirect_source_requests += 1;
      res.statusCode = Number(state.mode.slice(-3));
      res.setHeader("location", state.redirect_location);
      res.end("redirected\n");
      return;
    }
    if (url.pathname === "/blocks/latest/number2.json") {
      state.head_requests += 1;
      if (state.mode === "non_success_head_streams") {
        holdRejectedResponse(503);
        return;
      }
      if (state.mode === "declared_invalid_head_length") {
        holdRejectedResponse(200, {
          "content-type": "application/json",
          "content-length": "01",
        }, true);
        return;
      }
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
      if (state.mode === "non_success_head_streams") {
        holdRejectedResponse(503);
        return;
      }
      sendJson(req, res, 200, { head: state.head ?? state.block.number });
      return;
    }
    if (
      state.mode === "non_success_head_streams" &&
      ["/__void/demo/summary.json", "/api/health"].includes(url.pathname)
    ) {
      holdRejectedResponse(503);
      return;
    }
    if (url.pathname === "/blocks/range") {
      state.range_requests += 1;
      if (state.mode === "declared_oversize_range") {
        holdRejectedResponse(200, {
          "content-type": "application/json",
          "content-length": String(128 * 1024 * 1024 + 1),
        });
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
  "src/chain/receipts.ts",
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
  "VOID_FOLLOWER_PERSISTENCE_GENERATION_ACTIVE_V1",
  "followerPullPersistenceGenerationV1",
  "VOID_FOLLOWER_PROJECTION_RECOVERY_V1",
  "ensureFollowerBlockProjectionsV1",
  "MAX_RECEIPT_HISTORY_SCAN_BYTES_V1",
  "scanReceiptHistoryV1",
  "getMany",
  "cancelFollowerResponseBodyV1",
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
  rejected_streams_started: 0,
  rejected_streams_closed: 0,
  active_rejected_streams: 0,
  max_active_rejected_streams: 0,
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
    followerAdversaryState.rejected_streams_started = 0;
    followerAdversaryState.rejected_streams_closed = 0;
    followerAdversaryState.active_rejected_streams = 0;
    followerAdversaryState.max_active_rejected_streams = 0;
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
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert(declaredOversizeResult.imported === 0, "declared oversized range imported a block");
  assert(
    declaredOversizeFixture.state.block_writes === 0 &&
      declaredOversizeFixture.state.index_writes === 0 &&
      declaredOversizeFixture.state.receipt_writes === 0,
    "declared oversized range mutated follower state",
  );
  assert(
    followerAdversaryState.rejected_streams_started === 2 &&
      followerAdversaryState.rejected_streams_closed === 2 &&
      followerAdversaryState.active_rejected_streams === 0,
    `declared oversized range body survived bounded retry: ${JSON.stringify({
      started: followerAdversaryState.rejected_streams_started,
      closed: followerAdversaryState.rejected_streams_closed,
      active: followerAdversaryState.active_rejected_streams,
      maxActive: followerAdversaryState.max_active_rejected_streams,
    })}`,
  );
  pass("declared oversized range is released before bounded retry");

  resetAdversary("non_success_head_streams");
  const rejectedHeadFixture = createFollowerImportFixture(Node, {
    async appendMany() {
      rejectedHeadFixture.state.receipt_writes += 1;
    },
  });
  const rejectedHeadResult = await rejectedHeadFixture.node.pullOnce(
    followerAdversaryBase,
  );
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert(
    rejectedHeadResult.imported === 0 &&
      rejectedHeadResult.reason === "peer head unavailable",
    "non-success head bodies entered follower admission",
  );
  assert(
    followerAdversaryState.rejected_streams_started === 4 &&
      followerAdversaryState.rejected_streams_closed === 4 &&
      followerAdversaryState.active_rejected_streams === 0,
    "non-success head body survived fallback or return",
  );
  assert(
    rejectedHeadFixture.state.block_writes === 0 &&
      rejectedHeadFixture.state.index_writes === 0 &&
      rejectedHeadFixture.state.receipt_writes === 0,
    "non-success head bodies mutated follower state",
  );
  pass("non-success head bodies are released without leaking across fallback");

  resetAdversary("declared_invalid_head_length");
  process.env.VOID_FOLLOWER_PULL_TIMEOUT_MS = "1000";
  const invalidLengthFixture = createFollowerImportFixture(Node, {
    async appendMany(_records, opts = {}) {
      opts.signal?.throwIfAborted();
      invalidLengthFixture.state.receipt_writes += 1;
    },
  });
  const invalidLengthResult = await invalidLengthFixture.node.pullOnce(
    followerAdversaryBase,
  );
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert(
    invalidLengthResult.imported === 1,
    "malformed declared length prevented bounded head fallback",
  );
  assert(
    followerAdversaryState.rejected_streams_started === 1 &&
      followerAdversaryState.rejected_streams_closed === 1 &&
      followerAdversaryState.active_rejected_streams === 0,
    "malformed declared-length body was not terminally released",
  );
  assert(
    invalidLengthFixture.state.block_writes === 1 &&
      invalidLengthFixture.state.index_writes === 1 &&
      invalidLengthFixture.state.receipt_writes === 1,
    "malformed declared length crossed or suppressed the valid fallback import",
  );
  pass("malformed declared length releases its body before bounded fallback");
  process.env.VOID_FOLLOWER_PULL_TIMEOUT_MS = "100";

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

  const followerHeadByteLimit = 64 * 1024;
  const runSyntheticHeadChunks = async ({
    chunks,
    copiedChunk = null,
    cancelSettles = true,
  }) => {
    const originalFetch = globalThis.fetch;
    const originalBufferFrom = Buffer.from;
    let readerCancels = 0;
    let offendingCopies = 0;
    let servedSyntheticHead = false;
    Buffer.from = function (...args) {
      if (copiedChunk && args[0] === copiedChunk) offendingCopies += 1;
      return originalBufferFrom.apply(Buffer, args);
    };
    globalThis.fetch = async (input, init) => {
      const requested = String(input);
      if (!servedSyntheticHead && new URL(requested).pathname === "/blocks/latest/number2.json") {
        servedSyntheticHead = true;
        let index = 0;
        const reader = {
          async read() {
            if (index >= chunks.length) return { done: true, value: undefined };
            return { done: false, value: chunks[index++] };
          },
          async cancel() {
            readerCancels += 1;
            if (!cancelSettles) return await new Promise(() => {});
          },
        };
        return {
          body: {
            getReader: () => reader,
            async cancel() {
              readerCancels += 1;
              if (!cancelSettles) return await new Promise(() => {});
            },
          },
          headers: new Headers(),
          ok: true,
          redirected: false,
          status: 200,
          url: requested,
        };
      }
      return await originalFetch(input, init);
    };
    try {
      const fixture = createFollowerImportFixture(Node, {
        async appendMany(_records, opts = {}) {
          opts.signal?.throwIfAborted();
          fixture.state.receipt_writes += 1;
        },
      });
      return {
        result: await fixture.node.pullOnce(followerAdversaryBase),
        fixture,
        readerCancels,
        offendingCopies,
      };
    } finally {
      globalThis.fetch = originalFetch;
      Buffer.from = originalBufferFrom;
    }
  };

  resetAdversary("valid");
  const firstOversizedChunk = new Uint8Array(followerHeadByteLimit + 1);
  const firstOversized = await runSyntheticHeadChunks({
    chunks: [firstOversizedChunk],
    copiedChunk: firstOversizedChunk,
  });
  assert(firstOversized.result.imported === 1, "first-chunk overrun prevented bounded fallback");
  assert(firstOversized.readerCancels === 1, "first-chunk overrun did not cancel its reader");
  assert(firstOversized.offendingCopies === 0, "first oversized chunk was copied before rejection");

  resetAdversary("valid");
  const acceptedPrefix = new Uint8Array(17);
  const remainingOversizedChunk = new Uint8Array(followerHeadByteLimit - acceptedPrefix.byteLength + 1);
  const remainingOversized = await runSyntheticHeadChunks({
    chunks: [acceptedPrefix, remainingOversizedChunk],
    copiedChunk: remainingOversizedChunk,
  });
  assert(remainingOversized.result.imported === 1, "remaining-budget overrun prevented bounded fallback");
  assert(remainingOversized.readerCancels === 1, "remaining-budget overrun did not cancel its reader");
  assert(remainingOversized.offendingCopies === 0, "remaining-budget overrun was copied before rejection");

  resetAdversary("valid");
  const nonSettlingReaderStartedAt = Date.now();
  const nonSettlingReaderCancel = await runSyntheticHeadChunks({
    chunks: [firstOversizedChunk],
    copiedChunk: firstOversizedChunk,
    cancelSettles: false,
  });
  assert(
    nonSettlingReaderCancel.result.imported === 1 &&
      Date.now() - nonSettlingReaderStartedAt < 500,
    "non-settling reader cancellation escaped the bounded pull cleanup lifetime",
  );
  assert(
    nonSettlingReaderCancel.readerCancels === 1 &&
      nonSettlingReaderCancel.offendingCopies === 0,
    "non-settling reader cancellation weakened the pre-copy byte ceiling",
  );

  resetAdversary("valid");
  const exactHeadPrefix = '{"number":0,"padding":"';
  const exactHeadSuffix = '"}';
  const exactHeadBytes = new TextEncoder().encode(
    `${exactHeadPrefix}${"x".repeat(
      followerHeadByteLimit - Buffer.byteLength(exactHeadPrefix) - Buffer.byteLength(exactHeadSuffix),
    )}${exactHeadSuffix}`,
  );
  assert(exactHeadBytes.byteLength === followerHeadByteLimit, "exact-bound fixture is not exact");
  const exactBound = await runSyntheticHeadChunks({ chunks: [exactHeadBytes] });
  assert(exactBound.result.imported === 1, "exactly bounded head was rejected");
  assert(exactBound.readerCancels === 0, "exactly bounded head was cancelled");
  pass("follower chunks are rejected before over-cap copies while the exact byte ceiling remains valid");

  const runNonSettlingBodyCancel = async ({ pathname, status, headers }) => {
    const originalFetch = globalThis.fetch;
    let served = false;
    let cancelCalls = 0;
    globalThis.fetch = async (input, init) => {
      const requested = String(input);
      if (!served && new URL(requested).pathname === pathname) {
        served = true;
        return {
          body: {
            async cancel() {
              cancelCalls += 1;
              return await new Promise(() => {});
            },
          },
          headers: new Headers(headers),
          ok: status >= 200 && status < 300,
          redirected: false,
          status,
          url: requested,
        };
      }
      return await originalFetch(input, init);
    };
    return {
      cancelCalls: () => cancelCalls,
      restore() { globalThis.fetch = originalFetch; },
    };
  };

  resetAdversary("valid");
  const declaredCancel = await runNonSettlingBodyCancel({
    pathname: "/blocks/latest/number2.json",
    status: 200,
    headers: { "content-length": String(followerHeadByteLimit + 1) },
  });
  try {
    const fixture = createFollowerImportFixture(Node, {
      async appendMany(_records, opts = {}) {
        opts.signal?.throwIfAborted();
        fixture.state.receipt_writes += 1;
      },
    });
    const startedAt = Date.now();
    const result = await fixture.node.pullOnce(followerAdversaryBase);
    assert(
      result.imported === 1 && Date.now() - startedAt < 500,
      "declared oversize with non-settling cancellation blocked bounded fallback",
    );
    assert(declaredCancel.cancelCalls() === 1, "declared oversize body was not cancelled once");
  } finally {
    declaredCancel.restore();
  }

  resetAdversary("valid");
  const rejectedRangeCancel = await runNonSettlingBodyCancel({
    pathname: "/blocks/range",
    status: 503,
    headers: {},
  });
  try {
    const fixture = createFollowerImportFixture(Node, {
      async appendMany() { fixture.state.receipt_writes += 1; },
    });
    const startedAt = Date.now();
    await assertRejects(
      () => fixture.node.pullOnce(followerAdversaryBase),
      /VOID_FOLLOWER_PEER_HTTP_STATUS_V1/,
      "non-success range with non-settling cancellation was not terminal",
    );
    assert(
      Date.now() - startedAt < 500 &&
        rejectedRangeCancel.cancelCalls() === 1 &&
        fixture.state.block_writes === 0 &&
        fixture.state.index_writes === 0 &&
        fixture.state.receipt_writes === 0,
      "non-success range cancellation escaped its lifetime or mutated follower state",
    );
  } finally {
    rejectedRangeCancel.restore();
  }
  pass("non-settling response cancellation remains inside the follower cleanup lifetime");

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

  resetAdversary("valid");
  let neverSettlingReceiptCalls = 0;
  const neverSettlingPersistenceFixture = createFollowerImportFixture(Node, {
    appendMany() {
      neverSettlingReceiptCalls += 1;
      return new Promise(() => {});
    },
  });
  await assertRejects(
    () => neverSettlingPersistenceFixture.node.pullOnce(followerAdversaryBase),
    /Timeout|abort/i,
    "never-settling receipt persistence outlived the caller deadline",
  );
  const neverSettlingRequests =
    followerAdversaryState.head_requests +
    followerAdversaryState.head_fallback_requests +
    followerAdversaryState.range_requests;
  const neverSettlingMutations =
    neverSettlingPersistenceFixture.state.block_writes +
    neverSettlingPersistenceFixture.state.index_writes +
    neverSettlingPersistenceFixture.state.receipt_writes;
  await assertRejects(
    () => neverSettlingPersistenceFixture.node.pullOnce(followerAdversaryBase),
    /VOID_FOLLOWER_PERSISTENCE_GENERATION_ACTIVE_V1/,
    "next pull was admitted while a never-settling persistence generation remained mutation-capable",
  );
  assert(
    followerAdversaryState.head_requests +
      followerAdversaryState.head_fallback_requests +
      followerAdversaryState.range_requests === neverSettlingRequests,
    "quarantined persistence generation allowed another peer request",
  );
  assert(
    neverSettlingPersistenceFixture.state.block_writes +
      neverSettlingPersistenceFixture.state.index_writes +
      neverSettlingPersistenceFixture.state.receipt_writes === neverSettlingMutations,
    "quarantined persistence generation allowed another import mutation",
  );
  assert(neverSettlingReceiptCalls === 1, "never-settling persistence was overlapped");
  pass("never-settling persistence generation quarantines all subsequent pulls");

  resetAdversary("valid");
  let lateSettlingReceiptCalls = 0;
  let lateSettlingReceiptMutations = 0;
  const lateSettlingPersistenceFixture = createFollowerImportFixture(Node, {
    appendMany(_records, opts = {}) {
      lateSettlingReceiptCalls += 1;
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (opts.signal?.aborted) {
            reject(opts.signal.reason);
            return;
          }
          lateSettlingReceiptMutations += 1;
          resolve();
        }, 200);
      });
    },
  });
  await assertRejects(
    () => lateSettlingPersistenceFixture.node.pullOnce(followerAdversaryBase),
    /Timeout|abort/i,
    "late-settling receipt persistence outlived the caller deadline",
  );
  const lateSettlingRequests =
    followerAdversaryState.head_requests +
    followerAdversaryState.head_fallback_requests +
    followerAdversaryState.range_requests;
  await assertRejects(
    () => lateSettlingPersistenceFixture.node.pullOnce(followerAdversaryBase),
    /VOID_FOLLOWER_PERSISTENCE_GENERATION_ACTIVE_V1/,
    "next pull was admitted before late persistence became abort-terminal",
  );
  assert(
    followerAdversaryState.head_requests +
      followerAdversaryState.head_fallback_requests +
      followerAdversaryState.range_requests === lateSettlingRequests,
    "late persistence generation overlapped another peer request",
  );
  await new Promise((resolve) => setTimeout(resolve, 250));
  assert(lateSettlingReceiptCalls === 1, "late persistence generation was overlapped");
  assert(lateSettlingReceiptMutations === 0, "late persistence mutated after caller timeout");

  resetAdversary("valid");
  lateSettlingPersistenceFixture.node.receipts = {
    async appendMany(_records, opts = {}) {
      opts.signal?.throwIfAborted();
      lateSettlingPersistenceFixture.state.receipt_writes += 1;
    },
  };
  process.env.VOID_FOLLOWER_PULL_TIMEOUT_MS = "1000";
  const postSettlementProgress = await lateSettlingPersistenceFixture.node.pullOnce(
    followerAdversaryBase,
  );
  assert(
    postSettlementProgress.ok === true && lateSettlingPersistenceFixture.state.head === 0,
    "next pull did not progress after late persistence settled abort-terminally",
  );
  process.env.VOID_FOLLOWER_PULL_TIMEOUT_MS = "100";
  pass("late persistence settles abort-terminally before releasing the next pull");

  const receiptModule = await import("../dist/chain/receipts.js");
  const withReceiptDirectorySyncSwap = async (directory, operation) => {
    const originalOpen = fs.promises.open;
    const parked = `${directory}.admitted-generation`;
    let substituted = false;
    let syncedAdmitted = false;
    let directorySyncs = 0;
    fs.promises.open = async (...args) => {
      const handle = await originalOpen(...args);
      if (String(args[0]) !== directory) return handle;
      const admitted = await handle.stat({ bigint: true });
      const originalSync = handle.sync.bind(handle);
      handle.sync = async () => {
        directorySyncs += 1;
        if (substituted) return await originalSync();
        substituted = true;
        fs.renameSync(directory, parked);
        fs.mkdirSync(directory, { recursive: true });
        try {
          await originalSync();
          syncedAdmitted = true;
        } finally {
          fs.rmSync(directory, { recursive: true, force: true });
          fs.renameSync(parked, directory);
        }
        const restored = fs.lstatSync(directory, { bigint: true });
        assert(
          restored.dev === admitted.dev && restored.ino === admitted.ino,
          "receipt directory substitution did not restore the admitted generation",
        );
      };
      return handle;
    };
    try {
      const result = await operation();
      return { result, substituted, syncedAdmitted, directorySyncs };
    } finally {
      fs.promises.open = originalOpen;
      fs.rmSync(parked, { recursive: true, force: true });
    }
  };
  const receiptFaultRoot = fs.mkdtempSync(path.join(os.tmpdir(), "void-follower-receipts-v1-"));
  try {
    const receipt = {
      h: followerBlock0.txs[0].hash.toLowerCase(),
      n: followerBlock0.number,
      o: 0,
      ts: followerBlock0.timestamp,
    };
    for (const faultAtV1 of [
      "before_first_byte",
      "after_strict_prefix",
      "after_full_bytes",
      "before_directory_sync",
      "after_publish",
    ]) {
      const caseDir = path.join(receiptFaultRoot, faultAtV1);
      const firstStore = new receiptModule.ReceiptsStore(caseDir, { shardSpan: 10_000 });
      await assertRejects(
        () => firstStore.appendMany([receipt], { faultAtV1 }),
        /VOID_RECEIPT_APPEND_FAULT_/,
        `${faultAtV1} did not stop the injected receipt publication`,
      );
      const recoveredStore = new receiptModule.ReceiptsStore(caseDir, { shardSpan: 10_000 });
      if (faultAtV1 === "before_directory_sync") {
        const recovery = await withReceiptDirectorySyncSwap(
          caseDir,
          async () => {
          const recoveredHits = await recoveredStore.getMany([receipt.h]);
          assert(
            recoveredHits.get(receipt.h)?.found === true,
            "post-rename recovery did not classify the visible receipt",
          );
          },
        );
        assert(recovery.substituted, "recovery parent substitution did not execute");
        assert(recovery.syncedAdmitted, "recovery fsynced a substituted parent generation");
        assert(
          recovery.directorySyncs === 1,
          "cold receipt recovery returned before re-syncing its admitted directory generation",
        );
      }
      await recoveredStore.appendMany([receipt]);
      await recoveredStore.appendMany([receipt]);
      const shardFiles = fs.readdirSync(caseDir).filter((file) => /^receipts-\d{8}\.jsonl$/.test(file));
      const durableLines = shardFiles.flatMap((file) =>
        fs.readFileSync(path.join(caseDir, file), "utf8").split("\n").filter(Boolean),
      );
      assert(durableLines.length === 1, `${faultAtV1} recovery duplicated the logical receipt`);
      assert(JSON.parse(durableLines[0]).h === receipt.h, `${faultAtV1} recovery hid the receipt`);
      assert(recoveredStore.get(receipt.h).found === true, `${faultAtV1} recovery missed durable truth`);
    }

    const appendAuthorityDir = path.join(receiptFaultRoot, "append-directory-authority");
    const appendAuthorityStore = new receiptModule.ReceiptsStore(
      appendAuthorityDir,
      { shardSpan: 10_000 },
    );
    const appendAuthority = await withReceiptDirectorySyncSwap(
      appendAuthorityDir,
      () => appendAuthorityStore.appendMany([receipt]),
    );
    assert(appendAuthority.substituted, "append parent substitution did not execute");
    assert(appendAuthority.syncedAdmitted, "append fsynced a substituted parent generation");
    const appendAuthorityRestart = new receiptModule.ReceiptsStore(
      appendAuthorityDir,
      { shardSpan: 10_000 },
    );
    const appendAuthorityHits = await appendAuthorityRestart.getMany([receipt.h]);
    assert(
      appendAuthorityHits.get(receipt.h)?.found === true,
      "directory-generation-bound append was not durable after restart",
    );
  } finally {
    fs.rmSync(receiptFaultRoot, { recursive: true, force: true });
  }
  pass("receipt publication and recovery fsync the exact admitted directory generation");

  const receiptLockAuthorityRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-follower-receipt-lock-authority-v1-"),
  );
  try {
    const currentDir = path.join(receiptLockAuthorityRoot, "current");
    const detachedDir = path.join(receiptLockAuthorityRoot, "detached");
    const swappedStore = new receiptModule.ReceiptsStore(currentDir, {
      shardSpan: 10_000,
    });
    let swapped = false;
    await assertRejects(
      () => swappedStore.appendMany([{
        h: "c".repeat(64),
        n: 3,
        o: 0,
        ts: followerBlock0.timestamp,
      }], {
        testHooksV1: {
          afterLockClaimPublished: () => {
            fs.renameSync(currentDir, detachedDir);
            fs.mkdirSync(currentDir, { mode: 0o700 });
            swapped = true;
          },
        },
      }),
      /receipt directory authority generation changed/,
      "directory replacement after claim publication escaped exact lock authority",
    );
    assert(swapped, "receipt lock directory generation swap did not execute");
    assert(
      fs.readdirSync(currentDir).filter((name) => /^receipts-\d{8}\.jsonl$/.test(name)).length === 0,
      "detached lock owner mutated the substituted receipt directory",
    );

    const pidReuseDir = path.join(receiptLockAuthorityRoot, "pid-reuse");
    fs.mkdirSync(pidReuseDir, { mode: 0o700 });
    const pidReuseStat = fs.statSync(pidReuseDir, { bigint: true });
    const pidReuseToken = "d".repeat(32);
    fs.writeFileSync(
      path.join(pidReuseDir, `.receipts-append-claim-${pidReuseToken}.json`),
      `${JSON.stringify({
        marker: "VOID_RECEIPT_APPEND_LOCK_CLAIM_V1",
        version: 1,
        pid: process.pid,
        process_instance: "linux:00000000-0000-0000-0000-000000000000:1",
        token: pidReuseToken,
        directory_dev: String(pidReuseStat.dev),
        directory_ino: String(pidReuseStat.ino),
      })}\n`,
      { flag: "wx", mode: 0o600 },
    );
    const pidReuseReceipt = {
      h: "e".repeat(64),
      n: 4,
      o: 0,
      ts: followerBlock0.timestamp,
    };
    const pidReuseStore = new receiptModule.ReceiptsStore(pidReuseDir, {
      shardSpan: 10_000,
    });
    await pidReuseStore.appendMany([pidReuseReceipt]);
    const pidReuseRestart = new receiptModule.ReceiptsStore(pidReuseDir, {
      shardSpan: 10_000,
    });
    assert(
      (await pidReuseRestart.getMany([pidReuseReceipt.h])).get(pidReuseReceipt.h)?.found === true,
      "same numeric PID with a different process instance wedged recovery",
    );

    const replacementDir = path.join(receiptLockAuthorityRoot, "cleanup-replacement");
    fs.mkdirSync(replacementDir, { mode: 0o700 });
    const replacementStat = fs.statSync(replacementDir, { bigint: true });
    const replacementToken = "4".repeat(32);
    const replacementClaimPath = path.join(
      replacementDir,
      `.receipts-append-claim-${replacementToken}.json`,
    );
    const bootId = fs.readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim();
    const processStat = fs.readFileSync(`/proc/${process.pid}/stat`, "utf8");
    const processFields = processStat.slice(processStat.lastIndexOf(")") + 1).trim().split(/\s+/);
    const liveProcessInstance = `linux:${bootId}:${processFields[19]}`;
    fs.writeFileSync(
      replacementClaimPath,
      `${JSON.stringify({
        marker: "VOID_RECEIPT_APPEND_LOCK_CLAIM_V1",
        version: 1,
        pid: process.pid,
        process_instance: "linux:00000000-0000-0000-0000-000000000000:1",
        token: replacementToken,
        directory_dev: String(replacementStat.dev),
        directory_ino: String(replacementStat.ino),
      })}\n`,
      { flag: "wx", mode: 0o600 },
    );
    const liveReplacement = Buffer.from(`${JSON.stringify({
      marker: "VOID_RECEIPT_APPEND_LOCK_CLAIM_V1",
      version: 1,
      pid: process.pid,
      process_instance: liveProcessInstance,
      token: replacementToken,
      directory_dev: String(replacementStat.dev),
      directory_ino: String(replacementStat.ino),
    })}\n`);
    let cleanupSwapped = false;
    const replacementStore = new receiptModule.ReceiptsStore(replacementDir, {
      shardSpan: 10_000,
    });
    let replacementAppendSettled = false;
    const replacementAppend = replacementStore.appendMany([{
        h: "5".repeat(64),
        n: 9,
        o: 0,
        ts: followerBlock0.timestamp,
      }], {
        testHooksV1: {
          beforeObservedLockCleanup: (claimPath) => {
            if (cleanupSwapped) return;
            fs.renameSync(claimPath, `${claimPath}.stale-generation`);
            fs.writeFileSync(claimPath, liveReplacement, { flag: "wx", mode: 0o600 });
            cleanupSwapped = true;
          },
        },
      }).finally(() => { replacementAppendSettled = true; });
    const cleanupSwapDeadline = Date.now() + 10_000;
    while (!cleanupSwapped && Date.now() < cleanupSwapDeadline) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert(cleanupSwapped, "claim cleanup replacement adversary did not execute");
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert(
      replacementAppendSettled === false,
      "foreign live replacement claim lost append authority",
    );
    assert(
      fs.readFileSync(replacementClaimPath).equals(liveReplacement),
      "generation-safe cleanup deleted or changed the foreign live replacement claim",
    );
    fs.unlinkSync(replacementClaimPath);
    await replacementAppend;
  } finally {
    fs.rmSync(receiptLockAuthorityRoot, { recursive: true, force: true });
  }
  pass("receipt append claims bind exact directory and process generations");

  const receiptConcurrencyRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-follower-receipt-concurrency-v1-"),
  );
  try {
    const readyPath = path.join(receiptConcurrencyRoot, "writer-a.ready");
    const releasePath = path.join(receiptConcurrencyRoot, "writer-a.release");
    const moduleUrl = new URL("../dist/chain/receipts.js", import.meta.url).href;
    const writerSource = `
      import fs from "node:fs";
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const { ReceiptsStore } = await import(process.env.VOID_RECEIPT_MODULE_URL);
      const store = new ReceiptsStore(process.env.VOID_RECEIPT_DIR, { shardSpan: 10_000 });
      const hooks = {
        ...(process.env.VOID_RECEIPT_READY_PATH ? { afterSnapshot: async () => {
          fs.writeFileSync(process.env.VOID_RECEIPT_READY_PATH, "ready\\n", { flag: "wx" });
          while (!fs.existsSync(process.env.VOID_RECEIPT_RELEASE_PATH)) await sleep(5);
        } } : {}),
        ...(process.env.VOID_RECEIPT_FAIL_RELEASE_CLEANUP === "1" ? {
          beforeLockClaimCleanup: () => {
            throw new Error("injected receipt lock release cleanup failure");
          },
        } : {}),
      };
      await store.appendMany([JSON.parse(process.env.VOID_RECEIPT_RECORD)], {
        testHooksV1: hooks,
      });
      console.log("writer_done=true");
    `;
    const spawnReceiptWriter = (receipt, hold = false, failReleaseCleanup = false) => {
      const child = childProcess.spawn(
        process.execPath,
        ["--input-type=module", "-e", writerSource],
        {
          env: {
            ...process.env,
            VOID_RECEIPT_MODULE_URL: moduleUrl,
            VOID_RECEIPT_DIR: receiptConcurrencyRoot,
            VOID_RECEIPT_RECORD: JSON.stringify(receipt),
            ...(hold ? {
              VOID_RECEIPT_READY_PATH: readyPath,
              VOID_RECEIPT_RELEASE_PATH: releasePath,
            } : {}),
            ...(failReleaseCleanup ? {
              VOID_RECEIPT_FAIL_RELEASE_CLEANUP: "1",
            } : {}),
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk) => { stdout += chunk; });
      child.stderr.on("data", (chunk) => { stderr += chunk; });
      return {
        child,
        settled: once(child, "exit").then(([code, signal]) => ({
          code,
          signal,
          stdout,
          stderr,
        })),
      };
    };
    const receiptA = {
      h: "a".repeat(64),
      n: 1,
      o: 0,
      ts: followerBlock0.timestamp,
    };
    const receiptB = {
      h: "b".repeat(64),
      n: 2,
      o: 0,
      ts: followerBlock0.timestamp,
    };
    const writerA = spawnReceiptWriter(receiptA, true);
    const readyDeadline = Date.now() + 10_000;
    while (!fs.existsSync(readyPath) && Date.now() < readyDeadline) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert(fs.existsSync(readyPath), "writer A did not reach its admitted snapshot barrier");
    const writerB = spawnReceiptWriter(receiptB);
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert(
      writerB.child.exitCode === null,
      "writer B escaped the cross-process append authority while writer A held it",
    );
    assert(
      fs.readdirSync(receiptConcurrencyRoot).filter((file) =>
        /^receipts-\d{8}\.jsonl$/.test(file)
      ).length === 0,
      "a receipt was published before the admitted writer barrier released",
    );
    fs.writeFileSync(releasePath, "release\n", { flag: "wx" });
    const [resultA, resultB] = await Promise.all([
      writerA.settled,
      writerB.settled,
    ]);
    for (const [name, result] of [["A", resultA], ["B", resultB]]) {
      assert(
        result.code === 0 && result.signal === null && /writer_done=true/.test(result.stdout),
        `writer ${name} failed: ${result.stderr || result.stdout}`,
      );
    }
    const restartedStore = new receiptModule.ReceiptsStore(
      receiptConcurrencyRoot,
      { shardSpan: 10_000 },
    );
    const concurrentHits = await restartedStore.getMany([
      receiptA.h,
      receiptB.h,
    ]);
    assert(
      concurrentHits.get(receiptA.h)?.found === true &&
        concurrentHits.get(receiptB.h)?.found === true,
      "cross-process replacement silently lost one successful receipt",
    );

    const ownerDeathDir = path.join(receiptConcurrencyRoot, "owner-death");
    const ownerDeathReady = path.join(receiptConcurrencyRoot, "owner-death.ready");
    const ownerDeathRelease = path.join(receiptConcurrencyRoot, "owner-death.release");
    const spawnOwnerDeathWriter = (receipt) => {
      const child = childProcess.spawn(
        process.execPath,
        ["--input-type=module", "-e", writerSource],
        {
          env: {
            ...process.env,
            VOID_RECEIPT_MODULE_URL: moduleUrl,
            VOID_RECEIPT_DIR: ownerDeathDir,
            VOID_RECEIPT_RECORD: JSON.stringify(receipt),
            VOID_RECEIPT_READY_PATH: ownerDeathReady,
            VOID_RECEIPT_RELEASE_PATH: ownerDeathRelease,
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      return { child, settled: once(child, "exit") };
    };
    const deadOwnerReceipt = {
      h: "f".repeat(64),
      n: 5,
      o: 0,
      ts: followerBlock0.timestamp,
    };
    const recoveredOwnerReceipt = {
      h: "1".repeat(64),
      n: 6,
      o: 0,
      ts: followerBlock0.timestamp,
    };
    const deadOwner = spawnOwnerDeathWriter(deadOwnerReceipt);
    const ownerDeathDeadline = Date.now() + 10_000;
    while (!fs.existsSync(ownerDeathReady) && Date.now() < ownerDeathDeadline) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert(fs.existsSync(ownerDeathReady), "dead-owner fixture did not publish its claim");
    deadOwner.child.kill("SIGKILL");
    await deadOwner.settled;
    const ownerRecoveryStore = new receiptModule.ReceiptsStore(ownerDeathDir, {
      shardSpan: 10_000,
    });
    await ownerRecoveryStore.appendMany([recoveredOwnerReceipt]);
    assert(
      (await ownerRecoveryStore.getMany([recoveredOwnerReceipt.h])).get(recoveredOwnerReceipt.h)?.found === true,
      "dead exact process-instance claim permanently wedged receipt append",
    );

    const claimPublicationDir = path.join(
      receiptConcurrencyRoot,
      "claim-publication-failure",
    );
    const claimPublicationA = {
      h: "7".repeat(64),
      n: 12,
      o: 0,
      ts: followerBlock0.timestamp,
    };
    const claimPublicationB = {
      h: "8".repeat(64),
      n: 13,
      o: 0,
      ts: followerBlock0.timestamp,
    };
    const claimPublicationStore = new receiptModule.ReceiptsStore(
      claimPublicationDir,
      { shardSpan: 10_000 },
    );
    let injectedClaimPublicationFailures = 0;
    await assertRejects(
      () => claimPublicationStore.appendMany([claimPublicationA], {
        testHooksV1: {
          afterLockClaimLinkedBeforeSync() {
            injectedClaimPublicationFailures += 1;
            throw new Error("injected receipt lock claim publication failure");
          },
        },
      }),
      /injected receipt lock claim publication failure/,
      "post-link claim publication failure was not surfaced",
    );
    assert(
      injectedClaimPublicationFailures === 1 &&
        fs.readdirSync(claimPublicationDir).filter((file) =>
          /^\.receipts-append-claim-[0-9a-f]{32}\.json$/.test(file)
        ).length === 1 &&
        !fs.readdirSync(claimPublicationDir).some((file) =>
          /^receipts-\d{8}\.jsonl$/.test(file)
      ),
      "post-link claim publication fixture did not retain only its exact abandoned claim",
    );
    const abandonedClaimName = fs.readdirSync(claimPublicationDir).find((file) =>
      /^\.receipts-append-claim-[0-9a-f]{32}\.json$/.test(file)
    );
    assert(abandonedClaimName, "post-link claim publication fixture lost its claim name");
    const abandonedClaimPath = path.join(claimPublicationDir, abandonedClaimName);
    const abandonedClaimBytes = fs.readFileSync(abandonedClaimPath);
    const displacedClaimPath = `${abandonedClaimPath}.displaced-generation`;
    let claimCleanupSwapped = false;
    const claimCleanupAbort = new AbortController();
    const claimCleanupTimer = setTimeout(() => {
      claimCleanupAbort.abort(new Error("stop after foreign claim replacement"));
    }, 250);
    try {
      await assertRejects(
        () => claimPublicationStore.appendMany([claimPublicationA], {
          signal: claimCleanupAbort.signal,
          testHooksV1: {
            beforeObservedLockCleanup(claimPath) {
              if (claimCleanupSwapped) return;
              fs.renameSync(claimPath, displacedClaimPath);
              fs.writeFileSync(claimPath, abandonedClaimBytes, {
                flag: "wx",
                mode: 0o600,
              });
              claimCleanupSwapped = true;
            },
          },
        }),
        /stop after foreign claim replacement/,
        "foreign claim replacement did not keep retry outside append authority",
      );
    } finally {
      clearTimeout(claimCleanupTimer);
    }
    assert(
      claimCleanupSwapped &&
        fs.readFileSync(abandonedClaimPath).equals(abandonedClaimBytes),
      "generation-safe abandoned-claim cleanup deleted or changed a foreign replacement",
    );
    fs.unlinkSync(abandonedClaimPath);
    fs.renameSync(displacedClaimPath, abandonedClaimPath);
    const claimPublicationContender = childProcess.spawn(
      process.execPath,
      ["--input-type=module", "-e", writerSource],
      {
        env: {
          ...process.env,
          VOID_RECEIPT_MODULE_URL: moduleUrl,
          VOID_RECEIPT_DIR: claimPublicationDir,
          VOID_RECEIPT_RECORD: JSON.stringify(claimPublicationB),
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let claimPublicationStdout = "";
    let claimPublicationStderr = "";
    claimPublicationContender.stdout.on("data", (chunk) => {
      claimPublicationStdout += chunk;
    });
    claimPublicationContender.stderr.on("data", (chunk) => {
      claimPublicationStderr += chunk;
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert(
      claimPublicationContender.exitCode === null,
      "foreign contender crossed an unconfirmed live-owner claim",
    );
    const claimPublicationRetryStartedAt = Date.now();
    const claimPublicationContenderSettled = once(
      claimPublicationContender,
      "exit",
    );
    await claimPublicationStore.appendMany([claimPublicationA]);
    const [claimPublicationCode, claimPublicationSignal] =
      await claimPublicationContenderSettled;
    assert(
      claimPublicationCode === 0 &&
        claimPublicationSignal === null &&
        /writer_done=true/.test(claimPublicationStdout),
      `claim-publication recovery contender failed: ${claimPublicationStderr || claimPublicationStdout}`,
    );
    assert(
      Date.now() - claimPublicationRetryStartedAt < 5_000,
      "same-process claim-publication retry waited for owner exit or stale timeout",
    );
    const claimPublicationHits = await claimPublicationStore.getMany([
      claimPublicationA.h,
      claimPublicationB.h,
    ]);
    assert(
      [claimPublicationA, claimPublicationB].every((receipt) =>
        claimPublicationHits.get(receipt.h)?.found === true
      ),
      "claim-publication recovery lost a serialized successor receipt",
    );
    assert(
      !fs.readdirSync(claimPublicationDir).some((file) =>
        /^\.receipts-append-(?:claim|release)-[0-9a-f]{32}\.json$/.test(file)
      ),
      "claim-publication recovery left an exact claim or witness behind",
    );

    const releaseFailureDir = path.join(receiptConcurrencyRoot, "release-failure");
    const releaseFailureA = {
      h: "2".repeat(64),
      n: 7,
      o: 0,
      ts: followerBlock0.timestamp,
    };
    const releaseFailureB = {
      h: "3".repeat(64),
      n: 8,
      o: 0,
      ts: followerBlock0.timestamp,
    };
    const releaseWriter = childProcess.spawn(
      process.execPath,
      ["--input-type=module", "-e", writerSource],
      {
        env: {
          ...process.env,
          VOID_RECEIPT_MODULE_URL: moduleUrl,
          VOID_RECEIPT_DIR: releaseFailureDir,
          VOID_RECEIPT_RECORD: JSON.stringify(releaseFailureA),
          VOID_RECEIPT_FAIL_RELEASE_CLEANUP: "1",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let releaseStdout = "";
    let releaseStderr = "";
    releaseWriter.stdout.on("data", (chunk) => { releaseStdout += chunk; });
    releaseWriter.stderr.on("data", (chunk) => { releaseStderr += chunk; });
    const [releaseCode, releaseSignal] = await once(releaseWriter, "exit");
    assert(
      releaseCode === 0 && releaseSignal === null && /writer_done=true/.test(releaseStdout),
      `release-failure writer failed: ${releaseStderr || releaseStdout}`,
    );
    const releaseRecoveryStore = new receiptModule.ReceiptsStore(releaseFailureDir, {
      shardSpan: 10_000,
    });
    await releaseRecoveryStore.appendMany([releaseFailureB]);
    const releaseHits = await releaseRecoveryStore.getMany([
      releaseFailureA.h,
      releaseFailureB.h,
    ]);
    assert(
      releaseHits.get(releaseFailureA.h)?.found === true &&
        releaseHits.get(releaseFailureB.h)?.found === true,
      "durable logical release witness lost or wedged a receipt",
    );

    const releasePublicationDir = path.join(
      receiptConcurrencyRoot,
      "release-publication-failure",
    );
    const releasePublicationA = {
      h: "4".repeat(64),
      n: 9,
      o: 0,
      ts: followerBlock0.timestamp,
    };
    const releasePublicationB = {
      h: "5".repeat(64),
      n: 10,
      o: 0,
      ts: followerBlock0.timestamp,
    };
    const releasePublicationC = {
      h: "6".repeat(64),
      n: 11,
      o: 0,
      ts: followerBlock0.timestamp,
    };
    const releasePublicationStore = new receiptModule.ReceiptsStore(
      releasePublicationDir,
      { shardSpan: 10_000 },
    );
    let injectedReleasePublicationFailures = 0;
    await releasePublicationStore.appendMany([releasePublicationA], {
      testHooksV1: {
        beforeLockReleasePublication() {
          injectedReleasePublicationFailures += 1;
          throw new Error("injected receipt lock release publication failure");
        },
      },
    });
    assert(
      injectedReleasePublicationFailures === 1 &&
        fs.readdirSync(releasePublicationDir).some((file) =>
          /^\.receipts-append-claim-[0-9a-f]{32}\.json$/.test(file)
        ) &&
        !fs.readdirSync(releasePublicationDir).some((file) =>
          /^\.receipts-append-release-[0-9a-f]{32}\.json$/.test(file)
        ),
      "release-publication fixture did not retain only its exact claim",
    );
    const blockedContender = childProcess.spawn(
      process.execPath,
      ["--input-type=module", "-e", writerSource],
      {
        env: {
          ...process.env,
          VOID_RECEIPT_MODULE_URL: moduleUrl,
          VOID_RECEIPT_DIR: releasePublicationDir,
          VOID_RECEIPT_RECORD: JSON.stringify(releasePublicationC),
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let blockedStdout = "";
    let blockedStderr = "";
    blockedContender.stdout.on("data", (chunk) => { blockedStdout += chunk; });
    blockedContender.stderr.on("data", (chunk) => { blockedStderr += chunk; });
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert(
      blockedContender.exitCode === null,
      "foreign contender crossed a claim without exact durable release evidence",
    );
    blockedContender.kill("SIGTERM");
    const [blockedCode, blockedSignal] = await once(blockedContender, "exit");
    assert(
      blockedCode === null && blockedSignal === "SIGTERM",
      `pre-release contender did not remain cleanly terminable: ${blockedStderr || blockedStdout}`,
    );
    const retryStartedAt = Date.now();
    await releasePublicationStore.appendMany([releasePublicationB]);
    const recoveredContender = childProcess.spawn(
      process.execPath,
      ["--input-type=module", "-e", writerSource],
      {
        env: {
          ...process.env,
          VOID_RECEIPT_MODULE_URL: moduleUrl,
          VOID_RECEIPT_DIR: releasePublicationDir,
          VOID_RECEIPT_RECORD: JSON.stringify(releasePublicationC),
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let recoveredStdout = "";
    let recoveredStderr = "";
    recoveredContender.stdout.on("data", (chunk) => { recoveredStdout += chunk; });
    recoveredContender.stderr.on("data", (chunk) => { recoveredStderr += chunk; });
    const [recoveredCode, recoveredSignal] = await once(recoveredContender, "exit");
    assert(
      recoveredCode === 0 &&
        recoveredSignal === null &&
        /writer_done=true/.test(recoveredStdout),
      `release-publication recovery contender failed: ${recoveredStderr || recoveredStdout}`,
    );
    assert(
      Date.now() - retryStartedAt < 5_000,
      "same-process release retry waited for the stale-live timeout",
    );
    const releasePublicationHits = await releasePublicationStore.getMany([
      releasePublicationA.h,
      releasePublicationB.h,
      releasePublicationC.h,
    ]);
    assert(
      [releasePublicationA, releasePublicationB, releasePublicationC].every((receipt) =>
        releasePublicationHits.get(receipt.h)?.found === true
      ),
      "release-publication recovery lost or duplicated an admitted receipt",
    );
    assert(
      !fs.readdirSync(releasePublicationDir).some((file) =>
        /^\.receipts-append-(?:claim|release)-[0-9a-f]{32}\.json$/.test(file)
      ),
      "release-publication recovery left an exact claim or witness behind",
    );
  } finally {
    fs.rmSync(receiptConcurrencyRoot, { recursive: true, force: true });
  }
  pass("cross-process receipt authority survives owner death and claim/release publication or cleanup failure");

  const receiptHistoryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-follower-receipt-history-v1-"),
  );
  try {
    const historyDir = path.join(receiptHistoryRoot, "history");
    fs.mkdirSync(historyDir, { recursive: true });
    for (let index = 0; index < 1_500; index += 1) {
      const historicalReceipt = {
        h: index.toString(16).padStart(64, "0"),
        n: index,
        o: 0,
        ts: followerBlock0.timestamp,
      };
      fs.writeFileSync(
        path.join(
          historyDir,
          `receipts-${String(index * 10_000).padStart(8, "0")}.jsonl`,
        ),
        `${JSON.stringify(historicalReceipt)}\n`,
      );
    }

    const secondFollowerTx = {
      hash: "c".repeat(64),
      body: { proof: "bounded follower receipt history" },
    };
    const historyRoots = computeFollowerBlockRoots(
      [followerTx, secondFollowerTx],
      [],
    );
    const historyBlock = {
      ...followerBlock0,
      txRoot: historyRoots.txRoot,
      txs: [followerTx, secondFollowerTx],
    };
    const historyStore = new receiptModule.ReceiptsStore(historyDir, {
      shardSpan: 10_000,
    });
    const historyFixture = createFollowerImportFixture(Node, historyStore);
    historyFixture.blocks.set(historyBlock.number, historyBlock);
    historyFixture.state.head = historyBlock.number;
    historyFixture.node.txIndex = {
      shardForBlock: () => ({ path: "fixture-index" }),
      lookupInShard: (_file, hash) => ({
        found: true,
        n: historyBlock.number,
        o: hash === followerTx.hash ? 0 : 1,
      }),
      putMany() {
        historyFixture.state.index_writes += 1;
      },
    };
    resetAdversary("valid", historyBlock, { head: historyBlock.number });
    process.env.VOID_FOLLOWER_PULL_TIMEOUT_MS = "100";
    const historyFilesBefore = fs.readdirSync(historyDir).sort();
    await assertRejects(
      () => historyFixture.node.pullOnce(followerAdversaryBase),
      /Timeout|abort/i,
      "cold receipt history scan escaped the follower pull deadline",
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert(
      JSON.stringify(fs.readdirSync(historyDir).sort()) ===
        JSON.stringify(historyFilesBefore),
      "timed-out receipt history scan published late state",
    );
    assert(
      historyFixture.state.block_writes === 0 &&
        historyFixture.state.index_writes === 0,
      "timed-out receipt history scan crossed a projection mutation boundary",
    );

    const boundedDir = path.join(receiptHistoryRoot, "bounded");
    fs.mkdirSync(boundedDir, { recursive: true });
    const oversizedPath = path.join(boundedDir, "receipts-00000000.jsonl");
    fs.writeFileSync(oversizedPath, "");
    fs.truncateSync(oversizedPath, 16 * 1024 * 1024 + 1);
    const oversizedStore = new receiptModule.ReceiptsStore(boundedDir);
    await assertRejects(
      () => oversizedStore.getMany([followerTx.hash]),
      /not a bounded regular file/,
      "oversized receipt shard was retained or parsed",
    );
    fs.writeFileSync(oversizedPath, "{malformed}\n");
    await assertRejects(
      () => oversizedStore.getMany([followerTx.hash]),
      /malformed JSONL/,
      "malformed receipt history did not fail closed",
    );

    const contaminationDir = path.join(receiptHistoryRoot, "contamination");
    fs.mkdirSync(contaminationDir, { recursive: true });
    const contaminationOlder = path.join(
      contaminationDir,
      "receipts-00000000.jsonl",
    );
    const contaminationNewer = path.join(
      contaminationDir,
      "receipts-00010000.jsonl",
    );
    fs.writeFileSync(contaminationOlder, "{malformed}\n");
    fs.writeFileSync(
      contaminationNewer,
      `${JSON.stringify({
        h: followerTx.hash,
        n: followerBlock0.number,
        o: 0,
        ts: followerBlock0.timestamp,
      })}\n`,
    );
    const contaminationStore = new receiptModule.ReceiptsStore(
      contaminationDir,
    );
    await assertRejects(
      () => contaminationStore.getMany([followerTx.hash]),
      /malformed JSONL/,
      "later receipt hit bypassed older shard corruption",
    );
    fs.writeFileSync(
      contaminationOlder,
      `${JSON.stringify({
        h: "e".repeat(64),
        n: followerBlock0.number,
        o: 0,
        ts: followerBlock0.timestamp,
      })}\n`,
    );
    fs.writeFileSync(
      contaminationNewer,
      `${JSON.stringify({
        h: "f".repeat(64),
        n: followerBlock0.number,
        o: 0,
        ts: followerBlock0.timestamp,
      })}\n`,
    );
    const postFailureHits = await contaminationStore.getMany([
      followerTx.hash,
    ]);
    assert(
      postFailureHits.get(followerTx.hash)?.found === false,
      "failed receipt scan contaminated the durable-hit cache",
    );

    const assertWrongTypedReceiptFailsClosed = async (
      name,
      durableRows,
      expectedReceipt,
    ) => {
      const wrongTypedDir = path.join(receiptHistoryRoot, name);
      fs.mkdirSync(wrongTypedDir, { recursive: true });
      const wrongTypedShard = path.join(
        wrongTypedDir,
        "receipts-00000000.jsonl",
      );
      const originalBytes = `${durableRows.map((row) => JSON.stringify(row)).join("\n")}\n`;
      fs.writeFileSync(wrongTypedShard, originalBytes);
      const store = new receiptModule.ReceiptsStore(wrongTypedDir, {
        shardSpan: 10_000,
      });
      await assertRejects(
        () => store.getMany([expectedReceipt.h]),
        /invalid receipt/,
        `${name} entered durable membership truth`,
      );
      await assertRejects(
        () => store.appendMany([expectedReceipt]),
        /invalid receipt/,
        `${name} allowed replacement publication`,
      );
      assert(
        fs.readFileSync(wrongTypedShard, "utf8") === originalBytes,
        `${name} mutated malformed durable identity history`,
      );
      assert(
        fs.readdirSync(wrongTypedDir).length === 1,
        `${name} published a second canonical receipt generation`,
      );
    };
    const exactTypedReceipt = {
      h: "9".repeat(64),
      n: followerBlock0.number,
      o: 0,
      ts: followerBlock0.timestamp,
    };
    await assertWrongTypedReceiptFailsClosed(
      "array-hash-only",
      [{ ...exactTypedReceipt, h: [exactTypedReceipt.h] }],
      exactTypedReceipt,
    );
    await assertWrongTypedReceiptFailsClosed(
      "array-hash-then-canonical",
      [
        { ...exactTypedReceipt, h: [exactTypedReceipt.h] },
        exactTypedReceipt,
      ],
      exactTypedReceipt,
    );
    await assertWrongTypedReceiptFailsClosed(
      "array-hash-conflict",
      [{
        ...exactTypedReceipt,
        h: [exactTypedReceipt.h],
        n: exactTypedReceipt.n + 1,
        o: 1,
      }],
      exactTypedReceipt,
    );
    pass("receipt history rejects coercible durable JSON identities");

    const recoveryDir = path.join(receiptHistoryRoot, "recovery");
    const recoveryStore = new receiptModule.ReceiptsStore(recoveryDir, {
      shardSpan: 10_000,
    });
    historyFixture.node.receipts = recoveryStore;
    process.env.VOID_FOLLOWER_PULL_TIMEOUT_MS = "1000";
    const recoveredHistoryResult = await historyFixture.node.pullOnce(
      followerAdversaryBase,
    );
    assert(
      recoveredHistoryResult.ok === true &&
        recoveredHistoryResult.reason === "no new blocks",
      "bounded receipt recovery did not release the next pull",
    );
    const recoveredHits = await recoveryStore.getMany(
      historyBlock.txs.map((tx) => tx.hash),
    );
    assert(
      historyBlock.txs.every((tx) => recoveredHits.get(tx.hash)?.found === true),
      "bounded receipt recovery omitted a canonical projection",
    );
    const recoveryShard = fs.readdirSync(recoveryDir).find((file) =>
      /^receipts-\d{8}\.jsonl$/.test(file)
    );
    assert(
      recoveryShard,
      "receipt publication omitted its authoritative shard",
    );

    const recoveryShardPath = path.join(recoveryDir, recoveryShard);
    const replacementPath = `${recoveryShardPath}.replacement`;
    const originalOpen = fs.promises.open;
    let replacedDuringRead = false;
    fs.promises.open = async (...args) => {
      const handle = await originalOpen(...args);
      if (path.basename(String(args[0])) !== recoveryShard) return handle;
      const originalRead = handle.read.bind(handle);
      handle.read = async (...readArgs) => {
        const result = await originalRead(...readArgs);
        if (!replacedDuringRead && result.bytesRead > 0) {
          replacedDuringRead = true;
          fs.writeFileSync(
            replacementPath,
            `${JSON.stringify({
              h: "d".repeat(64),
              n: historyBlock.number,
              o: 0,
              ts: historyBlock.timestamp,
            })}\n`,
          );
          fs.renameSync(replacementPath, recoveryShardPath);
        }
        return result;
      };
      return handle;
    };
    try {
      const racedGenerationStore = new receiptModule.ReceiptsStore(recoveryDir);
      await assertRejects(
        () => racedGenerationStore.getMany([historyBlock.txs[0].hash]),
        /generation changed during read/,
        "path replacement escaped exact receipt generation binding",
      );
      assert(replacedDuringRead, "receipt generation race fixture did not execute");
    } finally {
      fs.promises.open = originalOpen;
      fs.rmSync(replacementPath, { force: true });
    }

    const growthDir = path.join(receiptHistoryRoot, "growth");
    fs.mkdirSync(growthDir, { recursive: true });
    const growthShardPath = path.join(
      growthDir,
      "receipts-00000000.jsonl",
    );
    fs.writeFileSync(
      growthShardPath,
      `${JSON.stringify({
        h: historyBlock.txs[0].hash,
        n: historyBlock.number,
        o: 0,
        ts: historyBlock.timestamp,
      })}\n`,
    );
    let grewDuringRead = false;
    let retainedGrowthBytes = 0;
    fs.promises.open = async (...args) => {
      const handle = await originalOpen(...args);
      if (path.basename(String(args[0])) !== path.basename(growthShardPath)) {
        return handle;
      }
      const originalRead = handle.read.bind(handle);
      handle.read = async (...readArgs) => {
        const result = await originalRead(...readArgs);
        retainedGrowthBytes += result.bytesRead;
        if (!grewDuringRead && result.bytesRead > 0) {
          grewDuringRead = true;
          fs.truncateSync(growthShardPath, 16 * 1024 * 1024 + 4_096);
        }
        return result;
      };
      return handle;
    };
    try {
      const grownGenerationStore = new receiptModule.ReceiptsStore(growthDir);
      await assertRejects(
        () => grownGenerationStore.getMany([historyBlock.txs[0].hash]),
        /not a bounded regular file/,
        "same-inode receipt growth escaped the descriptor read ceiling",
      );
      assert(grewDuringRead, "same-inode receipt growth fixture did not execute");
      assert(
        retainedGrowthBytes <= 16 * 1024 * 1024 + 1,
        `same-inode growth retained beyond cap-plus-one: ${retainedGrowthBytes}`,
      );
    } finally {
      fs.promises.open = originalOpen;
    }
  } finally {
    fs.rmSync(receiptHistoryRoot, { recursive: true, force: true });
    process.env.VOID_FOLLOWER_PULL_TIMEOUT_MS = "100";
  }
  pass("receipt history scan is bounded, deadline-owned, and retry-safe");

  resetAdversary("valid");
  const postCommitAbort = new AbortController();
  let abortAfterCanonicalCommit = true;
  const recoveredReceiptRecords = new Map();
  const postCommitFixture = createFollowerImportFixture(Node, {
    get(hash) {
      return recoveredReceiptRecords.get(hash) ?? { found: false };
    },
    async appendMany(records, opts = {}) {
      opts.signal?.throwIfAborted();
      for (const record of records) recoveredReceiptRecords.set(record.h, { ...record, found: true });
      postCommitFixture.state.receipt_writes += 1;
    },
  });
  const recoveredIndexRecords = new Map();
  postCommitFixture.node.txIndex = {
    shardForBlock: () => ({ path: "fixture-index" }),
    lookupInShard: (_file, hash) => recoveredIndexRecords.get(hash) ?? { found: false },
    putMany(refs) {
      for (const ref of refs) recoveredIndexRecords.set(ref.h, { ...ref, found: true });
      postCommitFixture.state.index_writes += 1;
    },
  };
  const ordinarySaveBlock = postCommitFixture.node.store.saveBlock;
  postCommitFixture.node.store.saveBlock = (block) => {
    ordinarySaveBlock(block);
    if (abortAfterCanonicalCommit) {
      abortAfterCanonicalCommit = false;
      postCommitAbort.abort(new Error("VOID_TEST_ABORT_AFTER_CANONICAL_COMMIT_V1"));
    }
  };
  await assertRejects(
    () => postCommitFixture.node.pullOnce(followerAdversaryBase, { signal: postCommitAbort.signal }),
    /VOID_TEST_ABORT_AFTER_CANONICAL_COMMIT_V1/,
    "post-commit abort did not return the injected terminal",
  );
  assert(postCommitFixture.state.head === 0, "post-commit abort did not preserve canonical head truth");
  assert(
    postCommitFixture.state.index_writes === 1 && postCommitFixture.state.receipt_writes === 0,
    "post-commit abort did not stop at the expected recoverable projection boundary",
  );

  resetAdversary("valid");
  const recoveredResult = await postCommitFixture.node.pullOnce(followerAdversaryBase);
  assert(recoveredResult.ok === true && recoveredResult.reason === "no new blocks", "retry did not recover at equal peer head");
  assert(
    postCommitFixture.state.index_writes === 1 && postCommitFixture.state.receipt_writes === 1,
    "retry duplicated the index or failed to complete the missing receipt projection",
  );
  assert(postCommitFixture.state.block_writes === 1, "retry duplicated the canonical block commit");
  pass("canonical block truth deterministically redoes missing follower projections");

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
  failoverNode.store = {
    loadHeadNumber: () => 2000,
    loadBlock: () => null,
  };
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
console.log("follower_persistence_generation_quarantined=true");
console.log("follower_receipt_append_abort_terminal=true");
console.log("follower_receipt_publication_atomic=true");
console.log("follower_post_commit_projection_recovery=true");
console.log("follower_receipt_history_deadline_owned=true");
console.log("follower_receipt_descriptor_generation_bound=true");
console.log("follower_receipt_directory_generation_bound=true");
console.log("follower_receipt_exact_json_types=true");
console.log("follower_receipt_cross_process_atomic=true");
console.log("follower_receipt_lock_directory_generation_bound=true");
console.log("follower_receipt_lock_process_instance_bound=true");
console.log("follower_receipt_lock_claim_publication_recoverable=true");
console.log("follower_receipt_lock_release_recoverable=true");
console.log("follower_receipt_lock_cleanup_generation_bound=true");
console.log("follower_rejected_response_body_released=true");
