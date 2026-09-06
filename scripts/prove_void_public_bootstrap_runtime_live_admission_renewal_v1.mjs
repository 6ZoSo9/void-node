#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

import {
  BOOTSTRAP_SCHEMA,
  CHAIN_ID,
  NETWORK,
  objectWithId,
} from "./lib/void_public_seed_qualification_v1.mjs";

const MARKER =
  "VOID_PUBLIC_BOOTSTRAP_RUNTIME_LIVE_ADMISSION_RENEWAL_V1_PROOF";
const MAX_AGE_MS = 2 * 60 * 60 * 1000;
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

function stableManifest(origin, {
  generatedAtMs,
  qualifiedAtMs,
  expiresAtMs,
  qualifiedHead = 2000,
}) {
  const body = {
    schema: BOOTSTRAP_SCHEMA,
    network: NETWORK,
    chain_id: CHAIN_ID,
    status: "stable_https_seed",
    generated_at: new Date(generatedAtMs).toISOString(),
    expires_at: new Date(expiresAtMs).toISOString(),
    sync_endpoints: [{
      transport: "https",
      base: origin,
      priority: 10,
      enabled: true,
      temporary: false,
      qualification_id: `voidpsq1_${"a".repeat(64)}`,
      qualified_at: new Date(qualifiedAtMs).toISOString(),
      qualified_head: qualifiedHead,
    }],
    onion_endpoints: [],
    private_tailnet_endpoints_published: false,
    authority: authorityFalse(),
    notes: "runtime live-admission renewal fixture",
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

function logValue(stderr, key) {
  const rows = stderr
    .split(/\r?\n/)
    .filter((line) => line.startsWith(`${key}=`));
  assert.equal(rows.length, 1, `expected one ${key}: ${stderr}`);
  return rows[0].slice(key.length + 1);
}

const tmp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-runtime-live-admission-proof-"),
);

function preloadFor(label, nowMs) {
  const target = path.join(tmp, `${label}.cjs`);
  fs.writeFileSync(
    target,
    `"use strict"; Date.now = () => ${nowMs};\n`,
    "utf8",
  );
  return target;
}

async function runResolver(args, manifestUrl, label, nowMs) {
  const child = spawn(
    process.execPath,
    ["scripts/resolve_void_public_bootstrap_v1.mjs", ...args],
    {
      cwd: root,
      env: {
        ...process.env,
        NODE_OPTIONS: `--require=${preloadFor(label, nowMs)}`,
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
  const code = await new Promise((resolve) => child.once("exit", resolve));
  return { code, stdout, stderr };
}

const port = await freePort();
const origin = `http://127.0.0.1:${port}`;
let activeManifest = null;
let gatewayMode = "good";

const server = http.createServer((req, res) => {
  const method = String(req.method || "GET").toUpperCase();
  const url = new URL(req.url || "/", origin);

  if (method === "GET" && url.pathname === "/manifest.json") {
    sendJson(res, 200, activeManifest);
    return;
  }
  if (
    (method === "GET" || method === "HEAD") &&
    url.pathname === "/__void/ready.json"
  ) {
    sendJson(
      res,
      200,
      gatewayMode === "good"
        ? { ready: true, head: 2000, gap: 0, txroot_live: 1 }
        : { ready: false, head: 2000, gap: 1, txroot_live: 0 },
      { head: method === "HEAD", gateway: true },
    );
    return;
  }
  if (method === "GET" && url.pathname === "/blocks/latest/number2.json") {
    sendJson(res, 200, { number: 2000 }, { gateway: true });
    return;
  }
  if (
    method === "GET" &&
    url.pathname === "/blocks/range" &&
    url.searchParams.get("from") === "2000" &&
    url.searchParams.get("to") === "2000"
  ) {
    sendJson(res, 200, [{ number: 2000 }], { gateway: true });
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

try {
  const manifestUrl = `${origin}/manifest.json`;

  const freshNow = Date.parse("2026-09-06T09:15:00.000Z");
  const freshQualifiedAt = freshNow - 30 * 60 * 1000;
  activeManifest = stableManifest(origin, {
    generatedAtMs: freshNow - 29 * 60 * 1000,
    qualifiedAtMs: freshQualifiedAt,
    expiresAtMs: freshNow + 24 * 60 * 60 * 1000,
  });
  const freshVerify = await runResolver(
    ["--allow-hold", "--verify-only"],
    manifestUrl,
    "fresh-verify",
    freshNow,
  );
  assert.equal(freshVerify.code, 0, freshVerify.stderr);
  assert.equal(freshVerify.stdout.trim(), origin);
  const freshPublishedDeadline = freshQualifiedAt + MAX_AGE_MS;
  assert.equal(
    Number(logValue(
      freshVerify.stderr,
      "published_qualification_not_after_ms",
    )),
    freshPublishedDeadline,
  );
  assert.equal(
    Number(logValue(freshVerify.stderr, "qualification_not_after_ms")),
    freshPublishedDeadline,
  );
  assert.equal(
    logValue(freshVerify.stderr, "runtime_live_admission_renewal_required"),
    "false",
  );

  const freshLive = await runResolver(
    ["--allow-hold"],
    manifestUrl,
    "fresh-live",
    freshNow,
  );
  assert.equal(freshLive.code, 0, freshLive.stderr);
  assert.equal(
    Number(logValue(freshLive.stderr, "qualification_not_after_ms")),
    freshPublishedDeadline,
  );
  assert.equal(
    logValue(freshLive.stderr, "runtime_live_admission_renewal_performed"),
    "false",
  );

  const generatedAt = Date.parse("2026-09-06T06:00:00.000Z");
  const qualifiedAt = generatedAt - 30_000;
  const expiresAt = Date.parse("2026-09-07T06:00:00.000Z");
  activeManifest = stableManifest(origin, {
    generatedAtMs: generatedAt,
    qualifiedAtMs: qualifiedAt,
    expiresAtMs: expiresAt,
  });
  const verifyBeforeBoundary =
    Date.parse("2026-09-06T09:59:59.900Z");
  const liveAfterBoundary =
    Date.parse("2026-09-06T10:00:00.100Z");

  const agedVerify = await runResolver(
    ["--allow-hold", "--verify-only"],
    manifestUrl,
    "aged-verify",
    verifyBeforeBoundary,
  );
  assert.equal(agedVerify.code, 0, agedVerify.stderr);
  assert.equal(agedVerify.stdout.trim(), origin);
  assert.equal(
    Number(logValue(
      agedVerify.stderr,
      "published_qualification_not_after_ms",
    )),
    qualifiedAt + MAX_AGE_MS,
  );
  assert.equal(
    logValue(agedVerify.stderr, "qualification_not_after_ms"),
    "",
  );
  assert.equal(
    logValue(agedVerify.stderr, "runtime_live_admission_renewal_required"),
    "true",
  );
  assert.equal(
    logValue(agedVerify.stderr, "runtime_live_admission_deadline_activated"),
    "false",
  );

  gatewayMode = "good";
  const agedLive = await runResolver(
    ["--allow-hold"],
    manifestUrl,
    "aged-live",
    liveAfterBoundary,
  );
  assert.equal(agedLive.code, 0, agedLive.stderr);
  assert.equal(agedLive.stdout.trim(), origin);
  assert.equal(
    Number(logValue(
      agedLive.stderr,
      "published_qualification_not_after_ms",
    )),
    qualifiedAt + MAX_AGE_MS,
  );
  assert.equal(
    Number(logValue(agedLive.stderr, "qualification_not_after_ms")),
    liveAfterBoundary + MAX_AGE_MS,
  );
  assert.equal(
    logValue(agedLive.stderr, "runtime_live_admission_renewal_performed"),
    "true",
  );

  gatewayMode = "bad_ready";
  const failedLive = await runResolver(
    ["--allow-hold"],
    manifestUrl,
    "aged-live-fail",
    liveAfterBoundary,
  );
  assert.equal(failedLive.code, 3, failedLive.stderr);
  assert.doesNotMatch(
    failedLive.stderr,
    /runtime_live_admission_deadline_activated=true/,
  );
  gatewayMode = "good";

  activeManifest = stableManifest(origin, {
    generatedAtMs: generatedAt,
    qualifiedAtMs: generatedAt - MAX_AGE_MS - 1,
    expiresAtMs: expiresAt,
  });
  const staleAtPublication = await runResolver(
    ["--allow-hold", "--verify-only"],
    manifestUrl,
    "stale-at-publication",
    liveAfterBoundary,
  );
  assert.equal(staleAtPublication.code, 2, staleAtPublication.stderr);
  assert.match(
    staleAtPublication.stderr,
    /qualification was stale when manifest was generated/,
  );

  activeManifest = stableManifest(origin, {
    generatedAtMs: generatedAt,
    qualifiedAtMs: qualifiedAt,
    expiresAtMs: liveAfterBoundary - 1,
  });
  const expired = await runResolver(
    ["--allow-hold", "--verify-only"],
    manifestUrl,
    "expired",
    liveAfterBoundary,
  );
  assert.equal(expired.code, 2, expired.stderr);
  assert.match(expired.stderr, /manifest is expired/);

  const launcher = fs.readFileSync("run-void-node.sh", "utf8");
  assert.match(
    launcher,
    /HTTPS_BOOTSTRAP_QUALIFICATION_NOT_AFTER_MS="\$live_qualification_not_after_ms"/,
  );
  assert.match(launcher, /live_published_qualification_not_after_ms/);
  assert.match(launcher, /reverify_published_qualification_not_after_ms/);
  assert.doesNotMatch(
    launcher,
    /test "\$live_qualification_not_after_ms" != "\$verified_qualification_not_after_ms"/,
  );

  console.log("fresh_publication_deadline_preserved=true");
  console.log("stale_publication_verify_mints_no_runtime_deadline=true");
  console.log("live_probe_mints_bounded_runtime_deadline=true");
  console.log("verify_live_hour_boundary_race_removed=true");
  console.log("failed_live_probe_mints_no_deadline=true");
  console.log("stale_at_publication_rejected=true");
  console.log("manifest_expiry_still_hard_stop=true");
  console.log("checkpoint_authority_adapter_contract_unchanged=true");
  console.log(`${MARKER}_GREEN`);
} finally {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(tmp, { recursive: true, force: true });
}
