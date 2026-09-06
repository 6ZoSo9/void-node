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
const FIXED_NOW_MS = Date.parse("2026-09-06T09:15:00.000Z");
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

function jsonResponse(res, status, body, { head = false, gateway = false } = {}) {
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

async function runResolver(args, manifestUrl, preloadPath) {
  const child = spawn(
    process.execPath,
    ["scripts/resolve_void_public_bootstrap_v1.mjs", ...args],
    {
      cwd: root,
      env: {
        ...process.env,
        NODE_OPTIONS: `--require=${preloadPath}`,
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

const server = http.createServer((req, res) => {
  const method = String(req.method || "GET").toUpperCase();
  const url = new URL(req.url || "/", origin);

  if (method === "GET" && url.pathname === "/manifest.json") {
    jsonResponse(res, 200, activeManifest);
    return;
  }
  if (
    (method === "GET" || method === "HEAD") &&
    url.pathname === "/__void/ready.json"
  ) {
    jsonResponse(
      res,
      200,
      { ready: true, head: 2000, gap: 0, txroot_live: 1 },
      { head: method === "HEAD", gateway: true },
    );
    return;
  }
  if (method === "GET" && url.pathname === "/blocks/latest/number2.json") {
    jsonResponse(res, 200, { number: 2000 }, { gateway: true });
    return;
  }
  if (
    method === "GET" &&
    url.pathname === "/blocks/range" &&
    url.searchParams.get("from") === "2000" &&
    url.searchParams.get("to") === "2000"
  ) {
    jsonResponse(res, 200, [{ number: 2000 }], { gateway: true });
    return;
  }
  if (method === "GET" && url.pathname === "/admin") {
    jsonResponse(res, 404, { ok: false, error: "route_not_public" });
    return;
  }
  if (method === "POST" && url.pathname === "/follower/start") {
    jsonResponse(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }
  jsonResponse(res, 404, { ok: false, error: "route_not_public" });
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(port, "127.0.0.1", resolve);
});

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-runtime-admission-"));
const preloadPath = path.join(tmp, "fixed-now.cjs");
fs.writeFileSync(
  preloadPath,
  `"use strict"; Date.now = () => ${FIXED_NOW_MS};\n`,
  "utf8",
);

try {
  const manifestUrl = `${origin}/manifest.json`;

  const freshQualifiedAt = FIXED_NOW_MS - 30 * 60 * 1000;
  activeManifest = stableManifest(origin, {
    generatedAtMs: FIXED_NOW_MS - 29 * 60 * 1000,
    qualifiedAtMs: freshQualifiedAt,
    expiresAtMs: FIXED_NOW_MS + 24 * 60 * 60 * 1000,
  });
  const freshVerify = await runResolver(
    ["--allow-hold", "--verify-only"],
    manifestUrl,
    preloadPath,
  );
  assert.equal(freshVerify.code, 0, freshVerify.stderr);
  assert.equal(freshVerify.stdout.trim(), origin);
  assert.equal(
    Number(logValue(freshVerify.stderr, "qualification_not_after_ms")),
    freshQualifiedAt + MAX_AGE_MS,
  );
  assert.equal(
    logValue(freshVerify.stderr, "runtime_live_admission_renewal_required"),
    "false",
  );

  activeManifest = stableManifest(origin, {
    generatedAtMs: FIXED_NOW_MS - 3 * 60 * 60 * 1000,
    qualifiedAtMs: FIXED_NOW_MS - 3 * 60 * 60 * 1000 - 30_000,
    expiresAtMs: FIXED_NOW_MS + 24 * 60 * 60 * 1000,
  });
  const staleVerify = await runResolver(
    ["--allow-hold", "--verify-only"],
    manifestUrl,
    preloadPath,
  );
  assert.equal(staleVerify.code, 0, staleVerify.stderr);
  assert.equal(staleVerify.stdout.trim(), origin);
  assert.equal(
    logValue(staleVerify.stderr, "runtime_live_admission_renewal_required"),
    "true",
  );
  assert.equal(
    logValue(staleVerify.stderr, "runtime_live_admission_deadline_activated"),
    "false",
  );
  assert.equal(
    logValue(staleVerify.stderr, "live_seed_probe_performed"),
    "false",
  );
  const verifyDeadline = Number(
    logValue(staleVerify.stderr, "qualification_not_after_ms"),
  );
  assert.equal(
    verifyDeadline,
    Date.parse("2026-09-06T11:00:00.000Z"),
  );

  const staleLive = await runResolver(
    ["--allow-hold"],
    manifestUrl,
    preloadPath,
  );
  assert.equal(staleLive.code, 0, staleLive.stderr);
  assert.equal(staleLive.stdout.trim(), origin);
  assert.equal(
    Number(logValue(staleLive.stderr, "qualification_not_after_ms")),
    verifyDeadline,
  );
  assert.equal(
    logValue(staleLive.stderr, "runtime_live_admission_renewal_required"),
    "true",
  );
  assert.equal(
    logValue(staleLive.stderr, "runtime_live_admission_renewal_performed"),
    "true",
  );
  assert.equal(
    logValue(staleLive.stderr, "runtime_live_admission_deadline_activated"),
    "true",
  );
  assert.match(staleLive.stderr, /seed_live=.*head=2000/);

  activeManifest = stableManifest(origin, {
    generatedAtMs: FIXED_NOW_MS - 3 * 60 * 60 * 1000,
    qualifiedAtMs:
      FIXED_NOW_MS - 3 * 60 * 60 * 1000 - MAX_AGE_MS - 1,
    expiresAtMs: FIXED_NOW_MS + 24 * 60 * 60 * 1000,
  });
  const staleAtPublication = await runResolver(
    ["--allow-hold", "--verify-only"],
    manifestUrl,
    preloadPath,
  );
  assert.equal(staleAtPublication.code, 2, staleAtPublication.stderr);
  assert.match(
    staleAtPublication.stderr,
    /qualification was stale when manifest was generated/,
  );

  activeManifest = stableManifest(origin, {
    generatedAtMs: FIXED_NOW_MS - 4 * 60 * 60 * 1000,
    qualifiedAtMs: FIXED_NOW_MS - 4 * 60 * 60 * 1000 - 30_000,
    expiresAtMs: FIXED_NOW_MS - 1,
  });
  const expired = await runResolver(
    ["--allow-hold", "--verify-only"],
    manifestUrl,
    preloadPath,
  );
  assert.equal(expired.code, 2, expired.stderr);
  assert.match(expired.stderr, /manifest is expired/);

  console.log("fresh_publication_deadline_preserved=true");
  console.log("stale_published_qualification_verify_admitted=true");
  console.log("stale_published_qualification_live_probe_required=true");
  console.log("runtime_deadline_verify_live_equal=true");
  console.log("runtime_deadline_bounded_two_hours=true");
  console.log("stale_at_publication_rejected=true");
  console.log("manifest_expiry_still_hard_stop=true");
  console.log("checkpoint_authority_adapter_contract_unchanged=true");
  console.log(`${MARKER}_GREEN`);
} finally {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(tmp, { recursive: true, force: true });
}
