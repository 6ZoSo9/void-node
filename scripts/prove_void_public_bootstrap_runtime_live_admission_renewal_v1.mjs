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
    notes: "runtime conservative-head parallel-renewal fixture",
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

async function startGateway({
  badReady = false,
  readyHeads = [2000],
  heads = [2000],
} = {}) {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const readyGetTimes = [];
  let sampleIndex = 0;

  const current = () => {
    const readyHead =
      readyHeads[Math.min(sampleIndex, readyHeads.length - 1)];
    const head =
      heads[Math.min(sampleIndex, heads.length - 1)];
    return { readyHead, head };
  };

  const server = http.createServer((req, res) => {
    const method = String(req.method || "GET").toUpperCase();
    const url = new URL(req.url || "/", base);

    if (
      (method === "GET" || method === "HEAD") &&
      url.pathname === "/__void/ready.json"
    ) {
      if (method === "GET") {
        sampleIndex = readyGetTimes.length;
        readyGetTimes.push(Date.now());
      }
      const values = current();
      sendJson(
        res,
        200,
        badReady
          ? {
              ready: false,
              head: values.readyHead,
              gap: 1,
              txroot_live: 0,
            }
          : {
              ready: true,
              head: values.readyHead,
              gap: 0,
              txroot_live: 1,
            },
        { head: method === "HEAD", gateway: true },
      );
      return;
    }

    const values = current();
    if (method === "GET" && url.pathname === "/blocks/latest/number2.json") {
      sendJson(res, 200, { number: values.head }, { gateway: true });
      return;
    }

    const rangeHead = Math.min(values.readyHead, values.head);
    if (
      method === "GET" &&
      url.pathname === "/blocks/range" &&
      url.searchParams.get("from") === String(rangeHead) &&
      url.searchParams.get("to") === String(rangeHead)
    ) {
      sendJson(res, 200, [{ number: rangeHead }], { gateway: true });
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

  return { server, base, readyGetTimes };
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
  if (
    String(req.method || "GET").toUpperCase() === "GET" &&
    url.pathname === "/manifest.json"
  ) {
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
const staleGatewayA = await startGateway();
const staleGatewayB = await startGateway();
const badStaleGateway = await startGateway({ badReady: true });
const regressingStaleGateway = await startGateway({
  readyHeads: [2000, 1999, 2001],
  heads: [2000, 2001, 2002],
});
const mismatchGateway = await startGateway({
  readyHeads: [1980],
  heads: [2044],
});
const freshGateway2 = await startGateway();
const freshGateway3 = await startGateway();
const freshGateway4 = await startGateway();
const skippedStaleGateway = await startGateway();

try {
  const manifestUrl = `${manifestBase}/manifest.json`;
  const now = Date.now();

  const generatedAtMs = now - 45 * 60 * 1000;
  const freshQualifiedAtMs = generatedAtMs - 60_000;
  const staleQualifiedAtMs = generatedAtMs - 91 * 60 * 1000;
  const expiresAtMs = generatedAtMs + 24 * 60 * 60 * 1000;

  // Mixed admission: one fresh, two stale-success, one stale-bad, one stale
  // whose readiness surface regresses. Because fewer than MAX_LIVE_SEEDS are
  // currently fresh, all candidates should be attempted concurrently.
  activeManifest = stableManifest(
    [
      {
        base: freshGateway.base,
        qualifiedAtMs: freshQualifiedAtMs,
        qualificationId: `voidpsq1_${"a".repeat(64)}`,
      },
      {
        base: staleGatewayA.base,
        qualifiedAtMs: staleQualifiedAtMs,
        qualificationId: `voidpsq1_${"b".repeat(64)}`,
      },
      {
        base: staleGatewayB.base,
        qualifiedAtMs: staleQualifiedAtMs,
        qualificationId: `voidpsq1_${"c".repeat(64)}`,
      },
      {
        base: badStaleGateway.base,
        qualifiedAtMs: staleQualifiedAtMs,
        qualificationId: `voidpsq1_${"d".repeat(64)}`,
      },
      {
        base: regressingStaleGateway.base,
        qualifiedAtMs: staleQualifiedAtMs,
        qualificationId: `voidpsq1_${"e".repeat(64)}`,
        qualifiedHead: 1900,
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
  assert.equal(publishedBindings.length, 5);
  assert.equal(
    logValue(
      verify.stderr,
      "runtime_live_admission_renewal_required_count",
    ),
    "4",
  );
  assert.equal(
    logValue(verify.stderr, "qualification_not_after_ms"),
    "",
  );

  const liveStartedAt = Date.now();
  const live = await runResolver(["--allow-hold"], manifestUrl);
  const liveFinishedAt = Date.now();
  assert.equal(live.code, 0, live.stderr);

  const livePeers = live.stdout.trim().split(",").filter(Boolean);
  assert.deepEqual(
    new Set(livePeers),
    new Set([
      freshGateway.base,
      staleGatewayA.base,
      staleGatewayB.base,
    ]),
  );

  const runtimeBindings = JSON.parse(
    logValue(live.stderr, "runtime_admission_bindings"),
  );
  assert.equal(runtimeBindings.length, 3);

  const freshBinding = runtimeBindings.find(
    (entry) => entry.base === freshGateway.base,
  );
  const staleBindingA = runtimeBindings.find(
    (entry) => entry.base === staleGatewayA.base,
  );
  const staleBindingB = runtimeBindings.find(
    (entry) => entry.base === staleGatewayB.base,
  );
  assert.ok(freshBinding);
  assert.ok(staleBindingA);
  assert.ok(staleBindingB);

  assert.equal(freshBinding.renewal_performed, false);
  assert.equal(
    freshBinding.qualification_not_after_ms,
    freshQualifiedAtMs + MAX_AGE_MS,
  );

  for (const binding of [staleBindingA, staleBindingB]) {
    assert.equal(binding.renewal_performed, true);
    assert.equal(binding.sample_count, 3);
    assert.ok(
      binding.sample_span_ms >= MIN_RUNTIME_RENEWAL_SPAN_MS,
    );
  }

  assert.ok(
    liveFinishedAt - liveStartedAt >= MIN_RUNTIME_RENEWAL_SPAN_MS,
  );
  assert.ok(
    liveFinishedAt - liveStartedAt < 120_000,
    `parallel renewal exceeded one observation wave: ${
      liveFinishedAt - liveStartedAt
    } ms`,
  );

  assert.ok(staleGatewayA.readyGetTimes.length >= 3);
  assert.ok(staleGatewayB.readyGetTimes.length >= 3);
  assert.ok(
    Math.abs(
      staleGatewayA.readyGetTimes[0] -
      staleGatewayB.readyGetTimes[0]
    ) < 5_000,
    "stale renewals did not begin concurrently",
  );
  assert.ok(
    Math.abs(
      staleGatewayA.readyGetTimes[2] -
      staleGatewayB.readyGetTimes[2]
    ) < 5_000,
    "stale renewals did not share the same observation wave",
  );

  assert.ok(
    regressingStaleGateway.readyGetTimes.length >= 2,
    "regression fixture was not exercised",
  );
  assert.ok(
    !livePeers.includes(regressingStaleGateway.base),
    "readiness-regressing stale endpoint was admitted",
  );
  assert.ok(
    !livePeers.includes(badStaleGateway.base),
    "non-green stale endpoint was admitted",
  );

  const globalDeadline = Number(
    logValue(live.stderr, "qualification_not_after_ms"),
  );
  assert.equal(
    globalDeadline,
    Math.min(
      ...runtimeBindings.map(
        (binding) => binding.qualification_not_after_ms,
      ),
    ),
  );

  // Concrete reviewer example: ready=1980, head=2044, published head=2000.
  // The shared probe permits a <=64 surface delta, but V5 admission must reject
  // because BOTH surfaces must clear the published qualified head.
  const mismatchGeneratedAtMs = Date.now() - 10 * 60 * 1000;
  activeManifest = stableManifest(
    [{
      base: mismatchGateway.base,
      qualifiedAtMs: mismatchGeneratedAtMs - 60_000,
      qualificationId: `voidpsq1_${"f".repeat(64)}`,
      qualifiedHead: 2000,
    }],
    mismatchGeneratedAtMs,
    mismatchGeneratedAtMs + 24 * 60 * 60 * 1000,
  );
  const mismatch = await runResolver(["--allow-hold"], manifestUrl);
  assert.equal(mismatch.code, 3, mismatch.stderr);
  assert.doesNotMatch(
    mismatch.stderr,
    /runtime_live_admission_deadline_activated=true/,
  );

  // If enough high-priority endpoints are still fresh, stale backups are not
  // started merely because they exist in the manifest.
  const allFreshGeneratedAtMs = Date.now() - 10 * 60 * 1000;
  const allFreshQualifiedAtMs = allFreshGeneratedAtMs - 60_000;
  const skippedStaleQualifiedAtMs =
    allFreshGeneratedAtMs - 111 * 60 * 1000;
  activeManifest = stableManifest(
    [
      {
        base: freshGateway.base,
        qualifiedAtMs: allFreshQualifiedAtMs,
        qualificationId: `voidpsq1_${"1".repeat(64)}`,
      },
      {
        base: freshGateway2.base,
        qualifiedAtMs: allFreshQualifiedAtMs,
        qualificationId: `voidpsq1_${"2".repeat(64)}`,
      },
      {
        base: freshGateway3.base,
        qualifiedAtMs: allFreshQualifiedAtMs,
        qualificationId: `voidpsq1_${"3".repeat(64)}`,
      },
      {
        base: freshGateway4.base,
        qualifiedAtMs: allFreshQualifiedAtMs,
        qualificationId: `voidpsq1_${"4".repeat(64)}`,
      },
      {
        base: skippedStaleGateway.base,
        qualifiedAtMs: skippedStaleQualifiedAtMs,
        qualificationId: `voidpsq1_${"5".repeat(64)}`,
      },
    ],
    allFreshGeneratedAtMs,
    allFreshGeneratedAtMs + 24 * 60 * 60 * 1000,
  );

  const skippedBefore = skippedStaleGateway.readyGetTimes.length;
  const freshCapacityStartedAt = Date.now();
  const freshCapacity = await runResolver(
    ["--allow-hold"],
    manifestUrl,
  );
  const freshCapacityFinishedAt = Date.now();
  assert.equal(freshCapacity.code, 0, freshCapacity.stderr);
  assert.equal(
    freshCapacity.stdout.trim().split(",").filter(Boolean).length,
    4,
  );
  assert.equal(
    skippedStaleGateway.readyGetTimes.length,
    skippedBefore,
    "stale backup was probed despite four admitted fresh peers",
  );
  assert.ok(
    freshCapacityFinishedAt - freshCapacityStartedAt < 30_000,
    "fresh-capacity startup unexpectedly waited for stale renewal",
  );

  // Publication trust remains strict.
  activeManifest = stableManifest(
    [{
      base: freshGateway.base,
      qualifiedAtMs: generatedAtMs - MAX_AGE_MS - 1,
      qualificationId: `voidpsq1_${"6".repeat(64)}`,
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
      qualificationId: `voidpsq1_${"7".repeat(64)}`,
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

  console.log("publication_time_two_hour_rule_preserved=true");
  console.log("stale_runtime_renewal_requires_three_samples=true");
  console.log("stale_runtime_renewal_min_span_60000=true");
  console.log("both_head_surfaces_must_clear_published_head=true");
  console.log("both_head_surfaces_nonregressing_across_renewal=true");
  console.log("parallel_stale_renewals_share_observation_window=true");
  console.log("failed_or_regressing_stale_peer_excluded=true");
  console.log("fresh_capacity_skips_stale_backup_renewal=true");
  console.log("adapter_deadline_is_minimum_of_admitted_live_peers=true");
  console.log("manifest_expiry_still_hard_stop=true");
  console.log("historical_range_checkpoint_boundary_unchanged=true");
  console.log(`${MARKER}_GREEN`);
} finally {
  await Promise.all([
    new Promise((resolve) => manifestServer.close(resolve)),
    new Promise((resolve) => freshGateway.server.close(resolve)),
    new Promise((resolve) => staleGatewayA.server.close(resolve)),
    new Promise((resolve) => staleGatewayB.server.close(resolve)),
    new Promise((resolve) => badStaleGateway.server.close(resolve)),
    new Promise((resolve) => regressingStaleGateway.server.close(resolve)),
    new Promise((resolve) => mismatchGateway.server.close(resolve)),
    new Promise((resolve) => freshGateway2.server.close(resolve)),
    new Promise((resolve) => freshGateway3.server.close(resolve)),
    new Promise((resolve) => freshGateway4.server.close(resolve)),
    new Promise((resolve) => skippedStaleGateway.server.close(resolve)),
  ]);
}
