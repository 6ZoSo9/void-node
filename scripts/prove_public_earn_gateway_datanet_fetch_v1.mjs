#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const DATASET_ID = "ds_public_gateway_fetch_v1";
const WHO = "outside-user-1";
const PAYLOAD = Buffer.from(
  "VOID_PUBLIC_EARN_GATEWAY_DATANET_FETCH_V1_FIXTURE\n",
  "utf8",
);
const PAYLOAD_B64 = PAYLOAD.toString("base64");
const MARKER = "VOID_PUBLIC_EARN_GATEWAY_DATANET_FETCH_V1";

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("listener_address_unavailable"));
        return;
      }
      resolve(address.port);
    });
  });
}

function close(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

function request(method, origin, route, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(route, origin);
    const rawBody =
      body === null ? null : Buffer.from(JSON.stringify(body), "utf8");
    const req = http.request(
      {
        method,
        hostname: url.hostname,
        port: url.port,
        path: `${url.pathname}${url.search}`,
        headers: {
          accept: "application/json",
          ...(rawBody
            ? {
                "content-type": "application/json",
                "content-length": String(rawBody.length),
              }
            : {}),
          ...headers,
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.on("end", () => {
          const raw = Buffer.concat(chunks);
          let json = null;
          try {
            json = raw.length ? JSON.parse(raw.toString("utf8")) : null;
          } catch {
            json = null;
          }
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            raw,
            json,
          });
        });
      },
    );
    req.once("error", reject);
    if (rawBody) req.write(rawBody);
    req.end();
  });
}

async function waitForGateway(origin) {
  const deadline = Date.now() + 12_000;
  let last = null;
  while (Date.now() < deadline) {
    try {
      last = await request(
        "GET",
        origin,
        "/__void/public-earn-gateway-v1/status.json",
      );
      if (last.status === 200) return;
    } catch (error) {
      last = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`gateway_not_ready:${String(last)}`);
}

const upstreamRequests = [];
const seedServer = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://fixture.invalid");
  upstreamRequests.push({
    method: req.method,
    pathname: url.pathname,
    search: url.search,
  });

  if (url.pathname === "/health") {
    const raw = Buffer.from(JSON.stringify({ ok: true }), "utf8");
    res.writeHead(200, {
      "content-type": "application/json",
      "content-length": String(raw.length),
    });
    res.end(raw);
    return;
  }

  const raw = Buffer.from(
    JSON.stringify({ ok: false, error: "not_found" }),
    "utf8",
  );
  res.writeHead(404, {
    "content-type": "application/json",
    "content-length": String(raw.length),
  });
  res.end(raw);
});

const earnRequests = [];
const earnPosts = [];
const earnServer = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://fixture.invalid");
  earnRequests.push({
    method: req.method,
    pathname: url.pathname,
    search: url.search,
  });

  if (
    (req.method === "GET" || req.method === "HEAD") &&
    url.pathname === `/datanet/v1/fetch/${DATASET_ID}`
  ) {
    const raw = Buffer.from(
      JSON.stringify({
        ok: true,
        id: DATASET_ID,
        dataset_id: DATASET_ID,
        who: url.searchParams.get("who"),
        plaintext_b64: PAYLOAD_B64,
      }),
      "utf8",
    );
    res.writeHead(200, {
      "content-type": "application/json",
      "content-length": String(raw.length),
    });
    if (req.method === "HEAD") return res.end();
    res.end(raw);
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    const raw = Buffer.from(JSON.stringify({ ok: true }), "utf8");
    res.writeHead(200, {
      "content-type": "application/json",
      "content-length": String(raw.length),
    });
    res.end(raw);
    return;
  }
  if (
    req.method === "GET" &&
    url.pathname === "/wc/public-earning-pilot-v1/status"
  ) {
    const raw = Buffer.from(
      JSON.stringify({
        ok: true,
        marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
        fixed_award_wc: 3,
        public_claim: {
          marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
          enabled: false,
          available: false,
          work_available: false,
          server_selected_work: true,
          proof_of_key_possession_required: true,
        },
      }),
      "utf8",
    );
    res.writeHead(200, {
      "content-type": "application/json",
      "content-length": String(raw.length),
    });
    res.end(raw);
    return;
  }
  if (req.method === "GET" && url.pathname === "/wc/redeemable") {
    const raw = Buffer.from(
      JSON.stringify({ ok: true, earned: 0, redeemable: 0 }),
      "utf8",
    );
    res.writeHead(200, {
      "content-type": "application/json",
      "content-length": String(raw.length),
    });
    res.end(raw);
    return;
  }
  if (
    req.method === "POST" &&
    [
      "/wc/public-earning-pilot-v1/claim-ticket",
      "/wc/public-earning-pilot-v1/submit-result",
    ].includes(url.pathname)
  ) {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => {
      earnPosts.push({
        pathname: url.pathname,
        authorization: Boolean(req.headers.authorization),
        body: Buffer.concat(chunks).toString("utf8"),
      });
      const raw = Buffer.from(
        JSON.stringify({ ok: true, fixture: true }),
        "utf8",
      );
      res.writeHead(200, {
        "content-type": "application/json",
        "content-length": String(raw.length),
      });
      res.end(raw);
    });
    return;
  }

  const raw = Buffer.from(
    JSON.stringify({ ok: false, error: "not_found" }),
    "utf8",
  );
  res.writeHead(404, {
    "content-type": "application/json",
    "content-length": String(raw.length),
  });
  res.end(raw);
});

let gateway = null;
const temporary = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-public-earn-gateway-datanet-fetch-v1-"),
);

try {
  const seedPort = await listen(seedServer);
  const earnPort = await listen(earnServer);

  const cli = path.join(temporary, "wc-public-earning-participant-v1.sh");
  fs.writeFileSync(cli, "#!/bin/sh\nexit 0\n", { mode: 0o700 });

  const gatewayPort = await new Promise((resolve, reject) => {
    const probe = http.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      if (!address || typeof address === "string") {
        reject(new Error("gateway_port_unavailable"));
        return;
      }
      const port = address.port;
      probe.close(() => resolve(port));
    });
  });

  const adapter = path.resolve(
    process.cwd(),
    "ops/public/public-seed-adapter-v1.mjs",
  );
  gateway = spawn(process.execPath, [adapter], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      VOID_SEED_UPSTREAM: `http://127.0.0.1:${seedPort}`,
      VOID_EARN_COORDINATOR_UPSTREAM: `http://127.0.0.1:${earnPort}`,
      VOID_ADAPTER_HOST: "127.0.0.1",
      VOID_ADAPTER_PORT: String(gatewayPort),
      VOID_EARN_PARTICIPANT_CLI_FILE: cli,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let gatewayStdout = "";
  let gatewayStderr = "";
  gateway.stdout.on("data", (chunk) => {
    gatewayStdout += chunk.toString("utf8");
  });
  gateway.stderr.on("data", (chunk) => {
    gatewayStderr += chunk.toString("utf8");
  });

  const origin = `http://127.0.0.1:${gatewayPort}`;
  await waitForGateway(origin);

  const status = await request(
    "GET",
    origin,
    "/wc/public-earning-pilot-v1/status",
  );
  assert.equal(status.status, 200);
  assert.equal(typeof status.json?.public_claim, "object");

  const validWithWho = await request(
    "GET",
    origin,
    `/datanet/v1/fetch/${DATASET_ID}?who=${WHO}`,
  );
  assert.equal(validWithWho.status, 200);
  assert.equal(validWithWho.json?.id, DATASET_ID);
  assert.equal(validWithWho.json?.plaintext_b64, PAYLOAD_B64);

  const validWithoutWho = await request(
    "GET",
    origin,
    `/datanet/v1/fetch/${DATASET_ID}`,
  );
  assert.equal(validWithoutWho.status, 200);
  assert.equal(validWithoutWho.json?.id, DATASET_ID);

  const validHead = await request(
    "HEAD",
    origin,
    `/datanet/v1/fetch/${DATASET_ID}?who=${WHO}`,
  );
  assert.equal(validHead.status, 200);
  assert.equal(validHead.raw.length, 0);

  const blockedCases = [
    `/datanet/v1/fetch/${DATASET_ID}?account=x`,
    `/datanet/v1/fetch/${DATASET_ID}?who=a&who=b`,
    `/datanet/v1/fetch/${DATASET_ID}?who=bad%20who`,
    "/datanet/v1/fetch/bad%20id",
    "/datanet/v1/fetch/bad%2Fid",
    `/datanet/v1/fetch/${"a".repeat(181)}`,
    "/datanet/v1/publish",
  ];
  for (const route of blockedCases) {
    const response = await request("GET", origin, route);
    assert.equal(
      response.status,
      404,
      `expected 404 for blocked route ${route}`,
    );
  }

  const blockedPost = await request(
    "POST",
    origin,
    `/datanet/v1/fetch/${DATASET_ID}`,
    { should_not_forward: true },
  );
  assert.equal(blockedPost.status, 405);

  // Claim and submit have their own authoritative full-contract regression
  // in scripts/prove_public_earn_gateway_v1.mjs. This focused proof sends no
  // POST to the earn coordinator; it covers only the new read-only DataNet
  // route plus preservation of the public_claim status object.
  const fetchRequests = earnRequests.filter((item) =>
    item.pathname.startsWith("/datanet/v1/fetch/"),
  );
  assert.equal(fetchRequests.length, 3);
  assert.deepEqual(
    fetchRequests.map((item) => item.method),
    ["GET", "GET", "HEAD"],
  );
  assert.equal(
    upstreamRequests.some((item) =>
      item.pathname.startsWith("/datanet/v1/fetch/"),
    ),
    false,
    "DataNet earning reads must not use VOID_SEED_UPSTREAM",
  );
  assert.equal(
    upstreamRequests.some((item) => item.pathname === "/datanet/v1/publish"),
    false,
  );
  assert.equal(
    earnRequests.some((item) => item.pathname === "/datanet/v1/publish"),
    false,
  );
  assert.equal(
    earnPosts.length,
    0,
    "focused DataNet proof must not POST to the earn coordinator",
  );

  console.log(
    JSON.stringify(
      {
        marker: MARKER,
        valid_fetch_cases: 3,
        blocked_fetch_cases: blockedCases.length + 1,
        valid_upstream_fetch_count: fetchRequests.length,
        datanet_read_upstream: "VOID_EARN_COORDINATOR_UPSTREAM",
        seed_upstream_datanet_fetch_count: upstreamRequests.filter((item) =>
          item.pathname.startsWith("/datanet/v1/fetch/"),
        ).length,
        earn_upstream_datanet_fetch_count: fetchRequests.length,
        public_claim_preserved: true,
        claim_submit_regression_delegated:
          "scripts/prove_public_earn_gateway_v1.mjs",
        focused_earn_post_count: earnPosts.length,
        focused_claim_performed: false,
        focused_submit_performed: false,
        datanet_publish_forwarded: false,
        live_http_post_performed: false,
        live_datanet_publication_performed: false,
        live_claim_performed: false,
        live_submit_performed: false,
        work_credit_ledger_written: false,
        service_restart_performed: false,
      },
      null,
      2,
    ),
  );
  console.log(
    "VOID_PUBLIC_EARN_GATEWAY_DATANET_FETCH_V1_PROOF_EXACT_GREEN",
  );
} catch (error) {
  console.error(error);
  if (gateway) {
    console.error({ gateway_pid: gateway.pid });
  }
  throw error;
} finally {
  if (gateway && gateway.exitCode === null) {
    gateway.kill("SIGTERM");
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (gateway.exitCode === null) gateway.kill("SIGKILL");
        resolve();
      }, 3_000);
      gateway.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
  await close(seedServer);
  await close(earnServer);
  fs.rmSync(temporary, { recursive: true, force: true });
}
