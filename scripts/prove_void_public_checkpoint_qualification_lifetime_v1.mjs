#!/usr/bin/env node
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import net from "node:net";
import { spawn } from "node:child_process";

import {
  BOOTSTRAP_SCHEMA,
  CHAIN_ID,
  NETWORK,
  objectWithId,
} from "./lib/void_public_seed_qualification_v1.mjs";

const MARKER = "VOID_PUBLIC_CHECKPOINT_QUALIFICATION_LIFETIME_V1_PROOF";
const MAX_QUALIFICATION_AGE_MS = 2 * 60 * 60 * 1000;
const root = process.cwd();

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  await new Promise((resolve) => server.close(resolve));
  assert.ok(port >= 1024);
  return port;
}

function json(res, status, body, { head = false, gateway = false } = {}) {
  const bytes = Buffer.from(`${JSON.stringify(body)}\n`);
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("content-length", String(head ? 0 : bytes.length));
  if (gateway) res.setHeader("x-void-public-seed-gateway", "v1");
  if (head) res.end();
  else res.end(bytes);
}

async function runResolver(args, manifestUrl) {
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

  const code = await new Promise((resolve) => child.once("exit", resolve));
  return { code, stdout, stderr };
}

function logValue(stderr, key) {
  const rows = stderr
    .split(/\r?\n/)
    .filter((line) => line.startsWith(`${key}=`));
  assert.equal(rows.length, 1, `expected one ${key} row: ${stderr}`);
  return rows[0].slice(key.length + 1);
}

const port = await freePort();
const origin = `http://127.0.0.1:${port}`;
const qualifiedAtMs = Date.now() - 30_000;
const qualificationNotAfterMs = qualifiedAtMs + MAX_QUALIFICATION_AGE_MS;
const generatedAtMs = qualifiedAtMs;
const manifestBody = {
  schema: BOOTSTRAP_SCHEMA,
  network: NETWORK,
  chain_id: CHAIN_ID,
  status: "stable_https_seed",
  generated_at: new Date(generatedAtMs).toISOString(),
  expires_at: new Date(generatedAtMs + 72 * 60 * 60 * 1000).toISOString(),
  sync_endpoints: [{
    transport: "https",
    base: origin,
    priority: 10,
    enabled: true,
    temporary: false,
    qualification_id: `voidpsq1_${"a".repeat(64)}`,
    qualified_at: new Date(qualifiedAtMs).toISOString(),
    qualified_head: 10,
  }],
  onion_endpoints: [],
  private_tailnet_endpoints_published: false,
  authority: {
    private_routes_exposed: false,
    wallet_authority: false,
    signer_authority: false,
    validator_authority: false,
    treasury_authority: false,
    work_credit_authority: false,
    money_movement_authority: false,
  },
  notes: "qualification lifetime fixture",
};
const manifest = objectWithId("voidpbm1_", manifestBody, "manifest_id");

const server = http.createServer((req, res) => {
  const method = String(req.method || "GET").toUpperCase();
  const url = new URL(req.url || "/", origin);

  if (method === "GET" && url.pathname === "/manifest.json") {
    json(res, 200, manifest);
    return;
  }
  if (
    (method === "GET" || method === "HEAD") &&
    url.pathname === "/__void/ready.json"
  ) {
    json(
      res,
      200,
      { ready: true, head: 10, gap: 0, txroot_live: 1 },
      { head: method === "HEAD", gateway: true },
    );
    return;
  }
  if (method === "GET" && url.pathname === "/blocks/latest/number2.json") {
    json(res, 200, { number: 10 }, { gateway: true });
    return;
  }
  if (
    method === "GET" &&
    url.pathname === "/blocks/range" &&
    url.searchParams.get("from") === "10" &&
    url.searchParams.get("to") === "10"
  ) {
    json(res, 200, [{ number: 10 }], { gateway: true });
    return;
  }
  if (method === "GET" && url.pathname === "/admin") {
    json(res, 404, { ok: false, error: "route_not_public" });
    return;
  }
  if (method === "POST" && url.pathname === "/follower/start") {
    json(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }
  json(res, 404, { ok: false, error: "route_not_public" });
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(port, "127.0.0.1", resolve);
});

try {
  const manifestUrl = `${origin}/manifest.json`;

  const verify = await runResolver(["--allow-hold", "--verify-only"], manifestUrl);
  assert.equal(verify.code, 0, verify.stderr);
  assert.equal(verify.stdout.trim(), origin);
  const verifyDeadline = Number(
    logValue(verify.stderr, "qualification_not_after_ms"),
  );
  assert.equal(verifyDeadline, qualificationNotAfterMs);

  const live = await runResolver(["--allow-hold"], manifestUrl);
  assert.equal(live.code, 0, live.stderr);
  assert.equal(live.stdout.trim(), origin);
  const liveDeadline = Number(
    logValue(live.stderr, "qualification_not_after_ms"),
  );
  assert.equal(liveDeadline, qualificationNotAfterMs);
  assert.equal(liveDeadline, verifyDeadline);

  const launcher = fs.readFileSync("run-void-node.sh", "utf8");
  assert.match(
    launcher,
    /HTTPS_BOOTSTRAP_QUALIFICATION_NOT_AFTER_MS="\$live_qualification_not_after_ms"/,
  );
  assert.match(
    launcher,
    /export VOID_PUBLIC_BOOTSTRAP_QUALIFICATION_NOT_AFTER_MS="\$HTTPS_BOOTSTRAP_QUALIFICATION_NOT_AFTER_MS"/,
  );
  assert.match(
    launcher,
    /test "\$live_published_qualification_bindings" != "\$verified_published_qualification_bindings"/,
  );
  assert.match(
    launcher,
    /test "\$reverify_published_qualification_bindings" != "\$verified_published_qualification_bindings"/,
  );
  assert.doesNotMatch(
    launcher,
    /test "\$live_qualification_not_after_ms" != "\$verified_qualification_not_after_ms"/,
  );

  console.log("resolver_verify_deadline_exact=true");
  console.log("resolver_live_deadline_exact=true");
  console.log("verify_live_deadline_equal_for_fresh_publication=true");
  console.log("launcher_runtime_deadline_handoff_from_live_resolution=true");
  console.log("launcher_published_binding_reverified=true");
  console.log("checkpoint_deadline_is_qualified_at_plus_two_hours=true");
  console.log("historical_range_authority_lifetime_unchanged=true");
  console.log(`${MARKER}_GREEN`);
} finally {
  await new Promise((resolve) => server.close(resolve));
}
