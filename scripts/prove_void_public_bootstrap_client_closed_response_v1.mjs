#!/usr/bin/env node
import childProcess from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import {
  BOOTSTRAP_SCHEMA,
  CHAIN_ID,
  NETWORK,
  objectWithId,
} from "./lib/void_public_seed_qualification_v1.mjs";
import { createPublicSeedClientAdapterV1 } from "../tools/void-public-seed-client-adapter-v1.mjs";

const MARKER = "VOID_PUBLIC_BOOTSTRAP_CLIENT_CLOSED_RESPONSE_V1";
const LOOPBACK = "127.0.0.1";
const TEMP = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-public-bootstrap-client-closed-response-"),
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function listen(server) {
  server.listen(0, LOOPBACK);
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address !== "object") {
    throw new Error("server address unavailable");
  }
  return Number(address.port);
}

async function close(server) {
  if (!server?.listening) return;
  server.close();
  await once(server, "close");
}

function writeGatewayHeaders(res, bytes) {
  res.statusCode = 200;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("content-length", String(bytes.length));
  res.setHeader("x-void-public-seed-gateway", "v1");
}

function sendJson(req, res, value, status = 200) {
  const bytes = Buffer.from(`${JSON.stringify(value)}\n`);
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("content-length", String(bytes.length));
  res.setHeader("x-void-public-seed-gateway", "v1");
  if (String(req.method || "GET").toUpperCase() === "HEAD") res.end();
  else res.end(bytes);
}

function goodGateway() {
  return http.createServer((req, res) => {
    const method = String(req.method || "GET").toUpperCase();
    const url = new URL(req.url || "/", "http://fixture.invalid");
    if (!["GET", "HEAD"].includes(method)) {
      sendJson(req, res, { ok: false, error: "method_not_allowed" }, 405);
      return;
    }
    if (url.pathname === "/admin") {
      sendJson(req, res, { ok: false, error: "route_not_public" }, 404);
      return;
    }
    if (url.pathname === "/__void/ready.json") {
      sendJson(req, res, { ready: true, head: 2000, gap: 0, txroot_live: 1 });
      return;
    }
    if (url.pathname === "/blocks/latest/number2.json") {
      sendJson(req, res, { number: 2000 });
      return;
    }
    if (url.pathname === "/head") {
      sendJson(req, res, { head: 2000 });
      return;
    }
    if (url.pathname === "/__void/demo/summary.json") {
      sendJson(req, res, { chain: { head: 2000 } });
      return;
    }
    if (url.pathname === "/api/health") {
      sendJson(req, res, { ok: true, head: 2000 });
      return;
    }
    if (url.pathname === "/blocks/range") {
      const from = Number(url.searchParams.get("from"));
      const to = Number(url.searchParams.get("to"));
      sendJson(req, res, {
        blocks: Array.from({ length: to - from + 1 }, (_, index) => ({
          number: from + index,
        })),
      });
      return;
    }
    sendJson(req, res, { ok: false, error: "route_not_public" }, 404);
  });
}

function malformedGateway() {
  return http.createServer((_req, res) => {
    const bytes = Buffer.from("{not-json\n");
    writeGatewayHeaders(res, bytes);
    res.end(bytes);
  });
}

function wrongShapeGateway() {
  return http.createServer((req, res) => {
    const url = new URL(req.url || "/", "http://fixture.invalid");
    if (url.pathname === "/blocks/range") {
      sendJson(req, res, { blocks: [{ number: 9 }, { number: 11 }] });
      return;
    }
    sendJson(req, res, { ready: "yes", head: 2000, gap: 0, txroot_live: 1 });
  });
}

async function invokeAdapter(peers, route) {
  const adapter = await createPublicSeedClientAdapterV1({
    peers,
    host: LOOPBACK,
    port: 0,
    timeoutMs: 3000,
    maxBytes: 1024 * 1024,
    allowLoopbackFixture: true,
  });
  try {
    const response = await fetch(`${adapter.base}${route}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const status = await (
      await fetch(`${adapter.base}/__void/public-seed-client-v1.json`)
    ).json();
    return { response, bytes, status };
  } finally {
    await close(adapter.server);
  }
}

function runResolver(args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = childProcess.spawn(
      process.execPath,
      ["scripts/resolve_void_public_bootstrap_v1.mjs", ...args],
      {
        env: { ...process.env, ...env },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
    child.once("error", reject);
    child.once("close", (status, signal) => {
      resolve({ status, signal, stdout, stderr });
    });
  });
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

let malformed;
let wrong;
let good;
let manifestServer;
try {
  malformed = malformedGateway();
  wrong = wrongShapeGateway();
  good = goodGateway();
  const malformedPort = await listen(malformed);
  const wrongPort = await listen(wrong);
  const goodPort = await listen(good);
  const malformedBase = `http://${LOOPBACK}:${malformedPort}`;
  const wrongBase = `http://${LOOPBACK}:${wrongPort}`;
  const goodBase = `http://${LOOPBACK}:${goodPort}`;

  const malformedFailover = await invokeAdapter(
    `${malformedBase},${goodBase}`,
    "/__void/ready.json",
  );
  assert(malformedFailover.response.status === 200, "malformed seed blocked failover");
  assert(
    JSON.parse(malformedFailover.bytes.toString("utf8")).ready === true,
    "malformed seed response escaped validation",
  );
  assert(malformedFailover.status.failover_count === 1, "malformed seed failover not recorded");

  const wrongFailover = await invokeAdapter(
    `${wrongBase},${goodBase}`,
    "/__void/ready.json",
  );
  assert(wrongFailover.response.status === 200, "wrong-shape seed blocked failover");
  assert(wrongFailover.status.failover_count === 1, "wrong-shape failover not recorded");

  const rangeFailover = await invokeAdapter(
    `${wrongBase},${goodBase}`,
    "/blocks/range?from=10&to=11",
  );
  assert(rangeFailover.response.status === 200, "noncontiguous range blocked failover");
  const range = JSON.parse(rangeFailover.bytes.toString("utf8"));
  assert(
    range.blocks.map((block) => block.number).join(",") === "10,11",
    "noncontiguous range escaped validation",
  );
  assert(rangeFailover.status.failover_count === 1, "range failover not recorded");

  const malformedOnly = await invokeAdapter(
    malformedBase,
    "/blocks/range?from=10&to=11",
  );
  assert(malformedOnly.response.status === 502, "malformed-only adapter did not hold");
  assert(malformedOnly.status.range_cache_hits === 0, "malformed response entered range cache");

  const committedHold = JSON.parse(
    fs.readFileSync("public/bootstrap/v1.json", "utf8"),
  );

  const unknownTopLevel = structuredClone(committedHold);
  unknownTopLevel.rpc_authority = true;
  delete unknownTopLevel.manifest_id;
  const resealedTopLevel = objectWithId(
    "voidpbm1_",
    unknownTopLevel,
    "manifest_id",
  );
  const topLevelPath = path.join(TEMP, "unknown-top-level.json");
  fs.writeFileSync(topLevelPath, `${JSON.stringify(resealedTopLevel)}\n`, {
    mode: 0o600,
  });
  const topLevelDecision = await runResolver([
    "--allow-hold",
    "--local-hold-file",
    topLevelPath,
  ]);
  assert(topLevelDecision.status !== 0, "resealed unknown top-level field was accepted");
  assert(
    topLevelDecision.stderr.includes("bootstrap manifest keys mismatch"),
    "unknown top-level rejection was unclear",
  );

  const unknownAuthority = structuredClone(committedHold);
  unknownAuthority.authority.rpc_authority = true;
  delete unknownAuthority.manifest_id;
  const resealedAuthority = objectWithId(
    "voidpbm1_",
    unknownAuthority,
    "manifest_id",
  );
  const authorityPath = path.join(TEMP, "unknown-authority.json");
  fs.writeFileSync(authorityPath, `${JSON.stringify(resealedAuthority)}\n`, {
    mode: 0o600,
  });
  const authorityDecision = await runResolver([
    "--allow-hold",
    "--local-hold-file",
    authorityPath,
  ]);
  assert(authorityDecision.status !== 0, "resealed unknown authority field was accepted");
  assert(
    authorityDecision.stderr.includes("manifest authority keys mismatch"),
    "unknown authority rejection was unclear",
  );

  const nowMs = Date.now();
  const stableBody = {
    schema: BOOTSTRAP_SCHEMA,
    network: NETWORK,
    chain_id: CHAIN_ID,
    status: "stable_https_seed",
    generated_at: new Date(nowMs).toISOString(),
    expires_at: new Date(nowMs + 2 * 60 * 60 * 1000).toISOString(),
    sync_endpoints: [
      {
        transport: "https",
        base: goodBase,
        priority: 10,
        enabled: true,
        temporary: false,
        qualification_id: `voidpsq1_${"a".repeat(64)}`,
        qualified_at: new Date(nowMs - 60_000).toISOString(),
        qualified_head: 2000,
        rpc_authority: true,
      },
    ],
    onion_endpoints: [],
    private_tailnet_endpoints_published: false,
    authority: authorityFalse(),
    notes: "closed endpoint fixture",
  };
  const resealedEndpoint = objectWithId(
    "voidpbm1_",
    stableBody,
    "manifest_id",
  );
  manifestServer = http.createServer((_req, res) => {
    const bytes = Buffer.from(`${JSON.stringify(resealedEndpoint)}\n`);
    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.setHeader("content-length", String(bytes.length));
    res.end(bytes);
  });
  const manifestPort = await listen(manifestServer);
  const endpointDecision = await runResolver([], {
    VOID_PUBLIC_BOOTSTRAP_ALLOW_LOOPBACK_FIXTURE: "1",
    VOID_PUBLIC_BOOTSTRAP_TIMEOUT_MS: "3000",
    VOID_PUBLIC_BOOTSTRAP_MANIFEST_URL:
      `http://${LOOPBACK}:${manifestPort}/manifest.json`,
  });
  assert(endpointDecision.status !== 0, "resealed unknown endpoint field was accepted");
  assert(
    endpointDecision.stderr.includes("manifest endpoint 1 keys mismatch"),
    "unknown endpoint rejection was unclear",
  );
} finally {
  await Promise.allSettled([
    close(manifestServer),
    close(good),
    close(wrong),
    close(malformed),
  ]);
  fs.rmSync(TEMP, { recursive: true, force: true });
}

console.log(`${MARKER}_PROOF_GREEN`);
console.log("malformed_http_200_failover=true");
console.log("wrong_shape_http_200_failover=true");
console.log("noncontiguous_range_failover=true");
console.log("unvalidated_range_cached=false");
console.log("resealed_unknown_top_level_rejected=true");
console.log("resealed_unknown_authority_rejected=true");
console.log("resealed_unknown_endpoint_rejected=true");
console.log("wallet_signing_validator_wc_money_authority=0");
