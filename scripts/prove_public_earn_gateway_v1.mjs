#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const adapterFile = process.argv[2] || path.join(root, "ops/public/public-seed-adapter-v1.mjs");
const repositoryCliFile = path.join(root, "ops/mainnet0/wc-public-earning-participant-v1.sh");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "void-public-earn-gateway-v1-"));
let adapter;
let regularServer;
let earnServer;

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  if (!server) return Promise.resolve();
  return new Promise((resolve) => server.close(() => resolve()));
}

async function waitFor(url) {
  let lastError;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.status > 0) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw lastError || new Error("adapter did not start");
}

async function json(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { response, body, text };
}

async function main() {
  assert.equal(fs.existsSync(repositoryCliFile), true, "participant CLI missing");
  const repositoryCliText = fs.readFileSync(repositoryCliFile, "utf8");
  assert.match(repositoryCliText, /VOID_WC_PUBLIC_EARNING_PARTICIPANT_CLI_V1/);
  assert.equal(/http:\/\/100\./.test(repositoryCliText), false, "public CLI leaks a Tailnet IPv4 example");
  assert.equal(/100\.122\.245\.125/.test(repositoryCliText), false, "public CLI leaks the Precision Tailnet address");

  const regularRequests = [];
  regularServer = http.createServer((req, res) => {
    regularRequests.push({ method: req.method, url: req.url });
    if (req.url === "/__void/ready.json") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end('{"ready":true}\n');
      return;
    }
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("missing\n");
  });

  const earnRequests = [];
  earnServer = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      earnRequests.push({
        method: req.method,
        url: req.url,
        headers: req.headers,
        raw,
      });

      if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200, { "content-type": "application/json", "set-cookie": "secret=1" });
        res.end(JSON.stringify({ ok: true, nodeId: "9d89483769e469e0473b489dc50dba96", head: 1856587, private_path: "/secret" }));
        return;
      }

      if (req.method === "GET" && (req.url === "/wc/public-earning-pilot-v1/status" || req.url === "/wc/public-earning-pilot-v1/status?account=outside-user-1")) {
        res.writeHead(200, { "content-type": "application/json", "set-cookie": "secret=1" });
        res.end(
          JSON.stringify({
            ok: true,
            marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
            coordinator_enabled: true,
            executor_enabled: false,
            task_class: "datanet_fetch_verify",
            fixed_award_wc: 3,
            caps: { account_total: 1, account_limit: 1, global_active: 0, global_consumed: 2, private_file: "/secret" },
            secret: "must_not_escape",
            routes: { operator_issue: "/wc/public-earning-pilot-v1/operator/issue" },
            capability: {
              account_bound: true,
              executor_node_bound: true,
              outbound_only_supported: true,
              dataset_bound: true,
              input_hash_bound: true,
              expiring: true,
              single_use: true,
              token_stored_as_sha256_only: true,
              ed25519_executor_signature_required: true,
            },
          }),
        );
        return;
      }

      if (req.method === "GET" && req.url === "/wc/redeemable?account=outside-user-1") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            ok: true,
            account: "outside-user-1",
            earned: 3,
            debited: 0,
            redeemed: 0,
            redeemable: 3,
            ledger_file: "/private/path/ledger.jsonl",
          }),
        );
        return;
      }

      if (req.method === "POST" && req.url === "/wc/public-earning-pilot-v1/submit-result") {
        const authorization = String(req.headers.authorization || "");
        if (
          !/^Bearer wcep1\.[0-9a-f]{32}\.[A-Za-z0-9_-]{43}$/.test(
            authorization,
          )
        ) {
          res.writeHead(401, { "content-type": "application/json" });
          res.end(
            JSON.stringify({
              ok: false,
              error: "missing_or_invalid_capability",
            }),
          );
          return;
        }
        res.writeHead(200, {
          "content-type": "application/json",
          "set-cookie": "secret=1",
          location: "http://private.invalid/",
        });
        res.end(
          JSON.stringify({
            ok: true,
            marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
            ticket_id: "1".repeat(32),
            wc: { delta: 3 },
          }),
        );
        return;
      }

      res.writeHead(404, { "content-type": "application/json" });
      res.end('{"ok":false,"error":"not_found"}');
    });
  });

  const regularPort = await listen(regularServer);
  const earnPort = await listen(earnServer);
  const adapterPort = 30000 + Math.floor(Math.random() * 20000);
  const logFile = path.join(temp, "adapter.log");
  const log = fs.openSync(logFile, "w");

  adapter = spawn(process.execPath, [adapterFile], {
    env: {
      ...process.env,
      VOID_SEED_UPSTREAM: `http://127.0.0.1:${regularPort}`,
      VOID_EARN_COORDINATOR_UPSTREAM: `http://127.0.0.1:${earnPort}`,
      VOID_EARN_PARTICIPANT_CLI_FILE: repositoryCliFile,
      VOID_ADAPTER_HOST: "127.0.0.1",
      VOID_ADAPTER_PORT: String(adapterPort),
      VOID_EARN_GATEWAY_MAX_BODY_BYTES: String(64 * 1024),
      VOID_EARN_GATEWAY_MAX_RESPONSE_BYTES: String(256 * 1024),
      VOID_EARN_GATEWAY_RATE_LIMIT_PER_MINUTE: "20",
    },
    stdio: ["ignore", log, log],
  });

  const base = `http://127.0.0.1:${adapterPort}`;
  await waitFor(`${base}/__void/public-earn-gateway-v1/status.json`);

  const gateway = await json(`${base}/__void/public-earn-gateway-v1/status.json`);
  assert.equal(gateway.response.status, 200);
  assert.equal(gateway.body.marker, "VOID_PUBLIC_EARN_GATEWAY_V1");
  assert.equal(gateway.body.enabled, true);
  assert.equal(gateway.body.fixed_award_wc, 3);
  assert.equal(gateway.body.safety.public_ticket_issue, false);
  assert.equal(gateway.body.safety.buy_void_fulfillment, false);
  assert.equal(JSON.stringify(gateway.body).includes(String(earnPort)), false);

  const health = await json(`${base}/health`);
  assert.equal(health.response.status, 200);
  assert.equal(health.body.ok, true);
  assert.equal(health.body.nodeId, "9d89483769e469e0473b489dc50dba96");
  assert.equal(health.body.head, 1856587);
  assert.equal("private_path" in health.body, false);
  assert.equal(health.response.headers.has("set-cookie"), false);

  const status = await json(`${base}/wc/public-earning-pilot-v1/status?account=outside-user-1`);
  assert.equal(status.response.status, 200);
  assert.equal(status.body.marker, "VOID_WC_PUBLIC_EARNING_PILOT_V1");
  assert.equal(status.body.gateway_marker, "VOID_PUBLIC_EARN_GATEWAY_V1");
  assert.equal(status.body.coordinator_enabled, true);
  assert.equal(status.body.executor_enabled, false);
  assert.equal(status.body.fixed_award_wc, 3);
  assert.equal(status.body.caps.account_total, 1);
  assert.equal(status.body.caps.account_limit, 1);
  assert.equal("private_file" in status.body.caps, false);
  assert.equal(status.body.routes.submit_result, "/wc/public-earning-pilot-v1/submit-result");
  assert.equal("secret" in status.body, false);
  assert.equal(JSON.stringify(status.body).includes("operator/issue"), false);
  assert.equal(status.response.headers.has("set-cookie"), false);

  const statusHead = await fetch(`${base}/wc/public-earning-pilot-v1/status?account=outside-user-1`, { method: "HEAD" });
  assert.equal(statusHead.status, 200);
  assert.equal(await statusHead.text(), "");

  const balance = await json(`${base}/wc/redeemable?account=outside-user-1`);
  assert.equal(balance.response.status, 200);
  assert.deepEqual(
    {
      account: balance.body.account,
      earned: balance.body.earned,
      redeemable: balance.body.redeemable,
    },
    { account: "outside-user-1", earned: 3, redeemable: 3 },
  );
  assert.equal("ledger_file" in balance.body, false);
  assert.equal(balance.body.canonical_coordinator_accounting, true);

  const invalidBalanceCallsBefore = earnRequests.length;
  const invalidBalance = await json(`${base}/wc/redeemable?account=../../private`);
  assert.equal(invalidBalance.response.status, 400);
  assert.equal(invalidBalance.body.error, "invalid_account");
  assert.equal(earnRequests.length, invalidBalanceCallsBefore);

  const payload = {
    envelope: { ticket_id: "1".repeat(32) },
    proof_bundle: { result: "verified" },
  };
  const validCapability =
    `wcep1.${"1".repeat(32)}.${"A".repeat(43)}`;
  const validAuthorization = `Bearer ${validCapability}`;

  const missingCallsBefore = earnRequests.length;
  const missingAuthorization = await json(
    `${base}/wc/public-earning-pilot-v1/submit-result`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  assert.equal(missingAuthorization.response.status, 401);
  assert.equal(
    missingAuthorization.body.error,
    "earning_capability_authorization_required",
  );
  assert.equal(earnRequests.length, missingCallsBefore);

  for (const malformed of [
    "Basic abc",
    "Bearer must-not-forward",
    `Bearer wcep1.${"1".repeat(31)}.${"A".repeat(43)}`,
    `Bearer wcep1.${"1".repeat(32)}.${"A".repeat(42)}`,
    `${validAuthorization} trailing`,
  ]) {
    const callsBefore = earnRequests.length;
    const rejected = await json(
      `${base}/wc/public-earning-pilot-v1/submit-result`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: malformed,
        },
        body: JSON.stringify(payload),
      },
    );
    assert.equal(rejected.response.status, 401);
    assert.equal(
      rejected.body.error,
      "earning_capability_authorization_required",
    );
    assert.equal(earnRequests.length, callsBefore);
  }

  const mismatchCallsBefore = earnRequests.length;
  const mismatchedTicket = await json(
    `${base}/wc/public-earning-pilot-v1/submit-result`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: validAuthorization,
      },
      body: JSON.stringify({
        ...payload,
        envelope: { ...payload.envelope, ticket_id: "2".repeat(32) },
      }),
    },
  );
  assert.equal(mismatchedTicket.response.status, 401);
  assert.equal(
    mismatchedTicket.body.error,
    "earning_capability_ticket_mismatch",
  );
  assert.equal(earnRequests.length, mismatchCallsBefore);

  const submit = await json(
    `${base}/wc/public-earning-pilot-v1/submit-result`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: validAuthorization,
        cookie: "must-not-forward=1",
      },
      body: JSON.stringify(payload),
    },
  );
  assert.equal(submit.response.status, 200);
  assert.equal(submit.body.ok, true);
  assert.equal(submit.body.wc.delta, 3);
  assert.equal(submit.response.headers.has("set-cookie"), false);
  assert.equal(submit.response.headers.has("location"), false);
  assert.equal(
    JSON.stringify(submit.body).includes(validCapability),
    false,
  );

  const forwarded = earnRequests.at(-1);
  assert.equal(forwarded.method, "POST");
  assert.equal(
    forwarded.url,
    "/wc/public-earning-pilot-v1/submit-result",
  );
  assert.deepEqual(JSON.parse(forwarded.raw), payload);
  assert.equal(
    forwarded.headers.authorization,
    validAuthorization,
  );
  assert.equal(forwarded.headers.cookie, undefined);
  assert.equal(
    forwarded.headers["content-type"],
    "application/json",
  );

  const readCallsBefore = earnRequests.length;
  const authenticatedHealth = await json(`${base}/health`, {
    headers: { authorization: validAuthorization },
  });
  assert.equal(authenticatedHealth.response.status, 200);
  assert.equal(earnRequests.length, readCallsBefore + 1);
  const forwardedHealth = earnRequests.at(-1);
  assert.equal(forwardedHealth.method, "GET");
  assert.equal(forwardedHealth.url, "/health");
  assert.equal(forwardedHealth.headers.authorization, undefined);

  const wrongContentType = await json(
    `${base}/wc/public-earning-pilot-v1/submit-result`,
    {
      method: "POST",
      headers: {
        "content-type": "text/plain",
        authorization: validAuthorization,
      },
      body: "{}",
    },
  );
  assert.equal(wrongContentType.response.status, 415);

  const invalidJson = await json(
    `${base}/wc/public-earning-pilot-v1/submit-result`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: validAuthorization,
      },
      body: "{",
    },
  );
  assert.equal(invalidJson.response.status, 400);

  const oversized = await json(
    `${base}/wc/public-earning-pilot-v1/submit-result`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: validAuthorization,
      },
      body: JSON.stringify({ payload: "x".repeat(70 * 1024) }),
    },
  );
  assert.equal(oversized.response.status, 413);

  const publicIssueGet = await json(`${base}/wc/public-earning-pilot-v1/operator/issue`);
  assert.equal(publicIssueGet.response.status, 404);
  const publicIssuePost = await json(`${base}/wc/public-earning-pilot-v1/operator/issue`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  assert.equal(publicIssuePost.response.status, 405);

  const genericPost = await json(`${base}/participant`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  assert.equal(genericPost.response.status, 405);

  const cli = await fetch(`${base}/download/wc-public-earning-participant-v1.sh`);
  assert.equal(cli.status, 200);
  const cliText = await cli.text();
  assert.equal(cliText, repositoryCliText);
  assert.match(cliText, /VOID_WC_PUBLIC_EARNING_PARTICIPANT_CLI_V1/);
  assert.equal(/http:\/\/100\./.test(cliText), false);
  assert.match(cli.headers.get("content-disposition") || "", /attachment/);

  const adapterManifest = await json(`${base}/__void/adapter.json`);
  assert.equal(adapterManifest.response.status, 200);
  assert.equal(adapterManifest.body.private_rpc_public, false);
  assert.equal(adapterManifest.body.public_earn_gateway.enabled, true);
  const manifestText = JSON.stringify(adapterManifest.body);
  assert.equal(manifestText.includes(String(earnPort)), false);
  assert.equal(manifestText.includes("127.0.0.1"), false);

  const ready = await json(`${base}/__void/ready.json`);
  assert.equal(ready.response.status, 200);
  assert.equal(ready.body.ready, true);
  assert.equal(regularRequests.some((entry) => entry.url === "/__void/ready.json"), true);

  const rpc = await json(`${base}/rpc`);
  assert.equal(rpc.response.status, 404);
  assert.match(rpc.text, /not_public/);

  const submitGet = await json(`${base}/wc/public-earning-pilot-v1/submit-result`);
  assert.equal(submitGet.response.status, 404);

  console.log("VOID_PUBLIC_EARN_GATEWAY_V1_GREEN");
}

try {
  await main();
} finally {
  if (adapter && !adapter.killed) adapter.kill("SIGTERM");
  await close(regularServer);
  await close(earnServer);
  fs.rmSync(temp, { recursive: true, force: true });
}
