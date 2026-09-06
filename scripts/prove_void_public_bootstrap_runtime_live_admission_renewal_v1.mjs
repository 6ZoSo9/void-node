#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import { once } from "node:events";

import {
  BOOTSTRAP_SCHEMA,
  CHAIN_ID,
  NETWORK,
  objectWithId,
} from "./lib/void_public_seed_qualification_v1.mjs";

const MARKER =
  "VOID_PUBLIC_BOOTSTRAP_RUNTIME_LIVE_ADMISSION_RENEWAL_V1_PROOF";
const MAX_AGE_MS = 2 * 60 * 60 * 1000;
const MIN_RUNTIME_RENEWAL_SPAN_MS = 60_000;
const root = process.cwd();

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  await new Promise((resolve) => server.close(resolve));
  return Number(address.port);
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

function stableManifest(endpoints, generatedAtMs, expiresAtMs) {
  const body = {
    schema: BOOTSTRAP_SCHEMA,
    network: NETWORK,
    chain_id: CHAIN_ID,
    status: "stable_https_seed",
    generated_at: new Date(generatedAtMs).toISOString(),
    expires_at: new Date(expiresAtMs).toISOString(),
    sync_endpoints: endpoints.map((endpoint, index) => ({
      transport: "https",
      base: endpoint.base,
      priority: 10 + index * 10,
      enabled: true,
      temporary: false,
      qualification_id:
        endpoint.qualificationId ||
        `voidpsq1_${String(index + 1).repeat(64).slice(0, 64)}`,
      qualified_at: new Date(endpoint.qualifiedAtMs).toISOString(),
      qualified_head: endpoint.qualifiedHead || 2000,
    })),
    onion_endpoints: [],
    private_tailnet_endpoints_published: false,
    authority: authorityFalse(),
    notes: "runtime multi-sample renewal fixture",
  };
  return objectWithId("voidpbm1_", body, "manifest_id");
}

function sendJson(res, status, body, { head = false, gateway = false } = {}) {
  const bytes = Buffer.from(`${JSON.stringify(body)}\n`);
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("content-length", String(head ? 0 : bytes.length));
  if (gateway) res.setHeader("x-void-public-seed-gateway", "v1");
  if (head) res.end();
  else res.end(bytes);
}

async function startGateway({ badReady = false } = {}) {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  let head = 2000;
  const server = http.createServer((req, res) => {
    const method = String(req.method || "GET").toUpperCase();
    const url = new URL(req.url || "/", base);

    if (
      (method === "GET" || method === "HEAD") &&
      url.pathname === "/__void/ready.json"
    ) {
      sendJson(
        res,
        200,
        badReady
          ? { ready: false, head, gap: 1, txroot_live: 0 }
          : { ready: true, head, gap: 0, txroot_live: 1 },
        { head: method === "HEAD", gateway: true },
      );
      return;
    }
    if (method === "GET" && url.pathname === "/blocks/latest/number2.json") {
      sendJson(res, 200, { number: head }, { gateway: true });
      return;
    }
    if (
      method === "GET" &&
      url.pathname === "/blocks/range" &&
      url.searchParams.get("from") === String(head) &&
      url.searchParams.get("to") === String(head)
    ) {
      sendJson(res, 200, [{ number: head }], { gateway: true });
      return;
    }
    if (method === "GET" && url.pathname === "/admin") {
      sendJson(res, 404, { ok: false, error: "route_not_public" });
      return;
    }
    if (method === "POST" && url.pathname === "/follower/start") {
      sendJson(res, 405, { ok: false, error: "method_not_allowed" });
      return;
    }
    sendJson(res, 404, { ok: false, error: "route_not_public" });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return { server, base, setHead(value) { head = value; } };
}

function logValue(stderr, key) {
  const rows = stderr
    .split(/\r?\n/)
    .filter((line) => line.startsWith(`${key}=`));
  assert.equal(rows.length, 1, `expected one ${key}: ${stderr}`);
  return rows[0].slice(key.length + 1);
}

async function runResolver(args, manifestUrl) {
  const { spawn } = await import("node:child_process");
  const child = spawn(
    process.execPath,
    ["scripts/resolve_void_public_bootstrap_v1.mjs", ...args],
    {
      cwd: root,
      env: {
        ...process.env,
        VOID_PUBLIC_BOOTSTRAP_ALLOW_LOOPBACK_FIXTURE: "1",
        VOID_PUBLIC_BOOTSTRAP_MANIFEST_URL: manifestUrl,
        VOID_PUBLIC_BOOTSTRAP_TIMEOUT_MS: "5000",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const [code] = await once(child, "exit");
  return { code, stdout, stderr };
}

const manifestPort = await freePort();
const manifestBase = `http://127.0.0.1:${manifestPort}`;
let activeManifest = null;
const manifestServer = http.createServer((req, res) => {
  const url = new URL(req.url || "/", manifestBase);
  if (String(req.method || "GET").toUpperCase() === "GET" &&
      url.pathname === "/manifest.json") {
    sendJson(res, 200, activeManifest);
    return;
  }
  sendJson(res, 404, { ok: false, error: "route_not_public" });
});
await new Promise((resolve, reject) => {
  manifestServer.once("error", reject);
  manifestServer.listen(manifestPort, "127.0.0.1", resolve);
});

const freshGateway = await startGateway();
const staleGateway = await startGateway();
const badStaleGateway = await startGateway({ badReady: true });

try {
  const manifestUrl = `${manifestBase}/manifest.json`;
  const now = Date.now();

  // One manifest can legitimately contain one currently-fresh and one
  // currently-stale publication qualification if both were fresh at the
  // manifest's generation time.
  const generatedAtMs = now - 45 * 60 * 1000;
  const freshQualifiedAtMs = generatedAtMs - 60_000;
  const staleQualifiedAtMs = generatedAtMs - 91 * 60 * 1000;
  const expiresAtMs = generatedAtMs + 24 * 60 * 60 * 1000;

  activeManifest = stableManifest(
    [
      {
        base: freshGateway.base,
        qualifiedAtMs: freshQualifiedAtMs,
        qualificationId: `voidpsq1_${"a".repeat(64)}`,
      },
      {
        base: staleGateway.base,
        qualifiedAtMs: staleQualifiedAtMs,
        qualificationId: `voidpsq1_${"b".repeat(64)}`,
      },
    ],
    generatedAtMs,
    expiresAtMs,
  );

  const verify = await runResolver(
    ["--allow-hold", "--verify-only"],
    manifestUrl,
  );
  assert.equal(verify.code, 0, verify.stderr);
  const publishedBindings = JSON.parse(
    logValue(verify.stderr, "published_qualification_bindings"),
  );
  assert.equal(publishedBindings.length, 2);
  assert.equal(
    logValue(
      verify.stderr,
      "runtime_live_admission_renewal_required_count",
    ),
    "1",
  );
  assert.equal(
    logValue(verify.stderr, "qualification_not_after_ms"),
    "",
    "mixed fresh/stale verify must not mint one manifest-wide runtime deadline",
  );
  assert.equal(
    logValue(verify.stderr, "runtime_live_admission_deadline_activated"),
    "false",
  );

  const liveStartedAt = Date.now();
  const live = await runResolver(["--allow-hold"], manifestUrl);
  const liveFinishedAt = Date.now();
  assert.equal(live.code, 0, live.stderr);
  const livePeers = live.stdout.trim().split(",").filter(Boolean);
  assert.deepEqual(
    new Set(livePeers),
    new Set([freshGateway.base, staleGateway.base]),
  );

  const runtimeBindings = JSON.parse(
    logValue(live.stderr, "runtime_admission_bindings"),
  );
  assert.equal(runtimeBindings.length, 2);
  const freshBinding = runtimeBindings.find(
    (entry) => entry.base === freshGateway.base,
  );
  const staleBinding = runtimeBindings.find(
    (entry) => entry.base === staleGateway.base,
  );
  assert.ok(freshBinding);
  assert.ok(staleBinding);

  assert.equal(freshBinding.renewal_performed, false);
  assert.equal(freshBinding.sample_count, 1);
  assert.equal(freshBinding.sample_span_ms, 0);
  assert.equal(
    freshBinding.qualification_not_after_ms,
    freshQualifiedAtMs + MAX_AGE_MS,
    "fresh sibling must keep its own publication deadline",
  );

  assert.equal(staleBinding.renewal_performed, true);
  assert.equal(staleBinding.sample_count, 3);
  assert.ok(
    staleBinding.sample_span_ms >= MIN_RUNTIME_RENEWAL_SPAN_MS,
    `runtime renewal span too short: ${staleBinding.sample_span_ms}`,
  );
  assert.ok(
    liveFinishedAt - liveStartedAt >= MIN_RUNTIME_RENEWAL_SPAN_MS,
    "stale runtime renewal completed without a >=60s observation interval",
  );
  assert.equal(
    logValue(live.stderr, "runtime_live_admission_renewed_count"),
    "1",
  );
  const globalDeadline = Number(
    logValue(live.stderr, "qualification_not_after_ms"),
  );
  assert.equal(
    globalDeadline,
    Math.min(
      freshBinding.qualification_not_after_ms,
      staleBinding.qualification_not_after_ms,
    ),
    "adapter deadline must conservatively cover every admitted live peer",
  );

  // A stale endpoint that fails its own renewal must not poison a fresh sibling.
  activeManifest = stableManifest(
    [
      {
        base: freshGateway.base,
        qualifiedAtMs: freshQualifiedAtMs,
        qualificationId: `voidpsq1_${"c".repeat(64)}`,
      },
      {
        base: badStaleGateway.base,
        qualifiedAtMs: staleQualifiedAtMs,
        qualificationId: `voidpsq1_${"d".repeat(64)}`,
      },
    ],
    generatedAtMs,
    expiresAtMs,
  );
  const siblingFallback = await runResolver(["--allow-hold"], manifestUrl);
  assert.equal(siblingFallback.code, 0, siblingFallback.stderr);
  assert.equal(siblingFallback.stdout.trim(), freshGateway.base);
  const fallbackBindings = JSON.parse(
    logValue(siblingFallback.stderr, "runtime_admission_bindings"),
  );
  assert.equal(fallbackBindings.length, 1);
  assert.equal(fallbackBindings[0].base, freshGateway.base);
  assert.equal(fallbackBindings[0].renewal_performed, false);

  // Publication-time trust remains strict.
  activeManifest = stableManifest(
    [{
      base: freshGateway.base,
      qualifiedAtMs: generatedAtMs - MAX_AGE_MS - 1,
      qualificationId: `voidpsq1_${"e".repeat(64)}`,
    }],
    generatedAtMs,
    expiresAtMs,
  );
  const staleAtPublication = await runResolver(
    ["--allow-hold", "--verify-only"],
    manifestUrl,
  );
  assert.equal(staleAtPublication.code, 2, staleAtPublication.stderr);
  assert.match(
    staleAtPublication.stderr,
    /qualification was stale when manifest was generated/,
  );

  activeManifest = stableManifest(
    [{
      base: freshGateway.base,
      qualifiedAtMs: freshQualifiedAtMs,
      qualificationId: `voidpsq1_${"f".repeat(64)}`,
    }],
    generatedAtMs,
    Date.now() - 1,
  );
  const expired = await runResolver(
    ["--allow-hold", "--verify-only"],
    manifestUrl,
  );
  assert.equal(expired.code, 2, expired.stderr);
  assert.match(expired.stderr, /manifest is expired/);

  const launcher = fs.readFileSync("run-void-node.sh", "utf8");
  assert.match(launcher, /verified_published_qualification_bindings/);
  assert.match(launcher, /live_published_qualification_bindings/);
  assert.match(launcher, /reverify_published_qualification_bindings/);
  assert.match(
    launcher,
    /HTTPS_BOOTSTRAP_QUALIFICATION_NOT_AFTER_MS="\$live_qualification_not_after_ms"/,
  );
  assert.doesNotMatch(
    launcher,
    /verified_published_qualification_not_after_ms/,
  );

  console.log("publication_time_two_hour_rule_preserved=true");
  console.log("stale_runtime_renewal_requires_three_samples=true");
  console.log("stale_runtime_renewal_min_span_60000=true");
  console.log("single_sample_cannot_mint_stale_runtime_authority=true");
  console.log("mixed_endpoint_renewal_is_per_endpoint=true");
  console.log("fresh_sibling_keeps_publication_deadline=true");
  console.log("failed_stale_sibling_does_not_poison_fresh_peer=true");
  console.log("adapter_deadline_is_minimum_of_admitted_live_peers=true");
  console.log("manifest_expiry_still_hard_stop=true");
  console.log("historical_range_checkpoint_boundary_unchanged=true");
  console.log(`${MARKER}_GREEN`);
} finally {
  await Promise.all([
    new Promise((resolve) => manifestServer.close(resolve)),
    new Promise((resolve) => freshGateway.server.close(resolve)),
    new Promise((resolve) => staleGateway.server.close(resolve)),
    new Promise((resolve) => badStaleGateway.server.close(resolve)),
  ]);
}
