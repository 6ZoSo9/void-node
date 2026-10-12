#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import process from "node:process";

const repo = process.cwd();
const gatewayPath = path.join(
  repo,
  "ops/public/void-public-app-composition-gateway-v1.mjs",
);
const source = await readFile(
  gatewayPath,
  "utf8",
);

assert.match(
  source,
  /VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1/,
);
assert.match(
  source,
  /pathname\s*===\s*["']\/__void\/buy-void\/request["']/,
);
assert.match(
  source,
  /toUpperCase\(\)\s*===\s*["']POST["']/,
);
assert.match(
  source,
  /VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1_MAX_BODY_BYTES\s*=\s*65536/,
);
assert.match(
  source,
  /x-void-public-buy-void-post-proxy/,
);

async function freePort() {
  const server = net.createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.equal(
    typeof address,
    "object",
  );
  const port = address.port;
  await new Promise(
    (resolve, reject) => {
      server.close(
        (error) => {
          if (error) reject(error);
          else resolve();
        },
      );
    },
  );
  return port;
}

const upstreamPort = await freePort();
const gatewayPort = await freePort();

const upstreamCalls = [];

const upstream = http.createServer(
  async (req, res) => {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(
        Buffer.from(chunk),
      );
    }

    const body = Buffer.concat(
      chunks,
    ).toString("utf8");

    upstreamCalls.push({
      method: req.method,
      url: req.url,
      body,
      contentType:
        req.headers["content-type"] || "",
    });

    if (
      req.method === "GET"
      && req.url
        === "/__void/buy-void/config.json"
    ) {
      const payload = JSON.stringify({
        ok: true,
        marker:
          "VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1",
        automatic_fulfillment: false,
      });
      res.writeHead(
        200,
        {
          "content-type":
            "application/json; charset=utf-8",
          "content-length":
            Buffer.byteLength(payload),
        },
      );
      res.end(payload);
      return;
    }

    if (
      req.method === "POST"
      && req.url
        === "/__void/buy-void/request"
    ) {
      const payload = JSON.stringify({
        ok: false,
        marker:
          "VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1_PROOF",
        error:
          "isolated_upstream_validation_response",
      });
      res.writeHead(
        400,
        {
          "content-type":
            "application/json; charset=utf-8",
          "cache-control":
            "no-store",
          "x-content-type-options":
            "nosniff",
          "content-length":
            Buffer.byteLength(payload),
        },
      );
      res.end(payload);
      return;
    }

    const payload = JSON.stringify({
      ok: false,
      error: "not_found",
    });
    res.writeHead(
      404,
      {
        "content-type":
          "application/json; charset=utf-8",
        "content-length":
          Buffer.byteLength(payload),
      },
    );
    res.end(payload);
  },
);

upstream.listen(
  upstreamPort,
  "127.0.0.1",
);
await once(
  upstream,
  "listening",
);

const gatewayLogs = [];

const child = spawn(
  process.execPath,
  [gatewayPath],
  {
    cwd: repo,
    env: {
      ...process.env,
      VOID_COMPOSITION_PORT:
        String(gatewayPort),
      VOID_NODE_UPSTREAM:
        `http://127.0.0.1:${upstreamPort}`,
    },
    stdio: [
      "ignore",
      "pipe",
      "pipe",
    ],
  },
);

child.stdout.on(
  "data",
  (chunk) => {
    gatewayLogs.push(
      chunk.toString("utf8"),
    );
  },
);
child.stderr.on(
  "data",
  (chunk) => {
    gatewayLogs.push(
      chunk.toString("utf8"),
    );
  },
);

async function waitForListenerReady() {
  let lastError = null;

  for (
    let attempt = 0;
    attempt < 80;
    attempt += 1
  ) {
    if (child.exitCode !== null) {
      throw new Error(
        "composition gateway exited before proof: "
        + gatewayLogs.join(""),
      );
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:${gatewayPort}/__void/buy-void/config.json`,
        {
          redirect: "manual",
        },
      );

      // Any HTTP response proves the temporary gateway listener is ready.
      // The fake upstream intentionally does not model the gateway's full
      // GET-composition dependency graph; the proof below is scoped to the
      // exact allowlisted POST route.
      await response.arrayBuffer();
      return response.status;
    } catch (error) {
      lastError = error;
    }

    await new Promise(
      (resolve) => setTimeout(
        resolve,
        100,
      ),
    );
  }

  throw lastError
    || new Error(
      "composition gateway listener did not become ready",
    );
}

try {
  const listenerReadinessStatus =
    await waitForListenerReady();

  assert.ok(
    Number.isInteger(listenerReadinessStatus),
  );
  assert.ok(
    listenerReadinessStatus >= 100
      && listenerReadinessStatus <= 599,
  );

  upstreamCalls.length = 0;

  const requestBody = JSON.stringify({
    requested_amount_usdc: "1",
    void_destination_address:
      "0xfa5637378b986bd368eb5c73a4c0be3b6c934e2d",
    source_chain: "base",
    ack_self_custody: true,
    ack_base_native_usdc: true,
    ack_request_before_payment: true,
    ack_sender_equals_void_destination: true,
    ack_no_automatic_fulfillment: true,
  });

  const postResponse = await fetch(
    `http://127.0.0.1:${gatewayPort}/__void/buy-void/request`,
    {
      method: "POST",
      headers: {
        "content-type":
          "application/json",
      },
      body: requestBody,
      redirect: "manual",
    },
  );

  assert.equal(
    postResponse.status,
    400,
  );
  assert.equal(
    postResponse.headers.get(
      "x-void-public-buy-void-post-proxy",
    ),
    "v1",
  );

  const postBody =
    await postResponse.json();
  assert.equal(
    postBody.marker,
    "VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1_PROOF",
  );
  assert.equal(
    upstreamCalls.length,
    1,
  );
  assert.deepEqual(
    upstreamCalls[0],
    {
      method: "POST",
      url:
        "/__void/buy-void/request",
      body: requestBody,
      contentType:
        "application/json",
    },
  );

  const unrelatedPost =
    await fetch(
      `http://127.0.0.1:${gatewayPort}/__void/buy-void/config.json`,
      {
        method: "POST",
        headers: {
          "content-type":
            "application/json",
        },
        body: "{}",
        redirect: "manual",
      },
    );

  assert.equal(
    unrelatedPost.status,
    405,
  );
  assert.equal(
    upstreamCalls.length,
    1,
  );

  const legacyGet =
    await fetch(
      `http://127.0.0.1:${gatewayPort}/__void/buy-void/request.json`,
      {
        redirect: "manual",
      },
    );

  // The isolated proof intentionally does not model the deployed public
  // seed-adapter composition dependency used by legacy GET routes. The
  // invariant for this lane is narrower: legacy GET must never be claimed
  // by the new exact POST proxy.
  assert.equal(
    legacyGet.headers.get(
      "x-void-public-buy-void-post-proxy",
    ),
    null,
  );

  const upstreamCallsAfterLegacyGet =
    upstreamCalls.length;

  const optionsResponse =
    await fetch(
      `http://127.0.0.1:${gatewayPort}/__void/buy-void/request`,
      {
        method: "OPTIONS",
        redirect: "manual",
      },
    );

  assert.equal(
    optionsResponse.status,
    405,
  );
  assert.equal(
    optionsResponse.headers.get(
      "x-void-public-buy-void-post-proxy",
    ),
    null,
  );
  assert.equal(
    upstreamCalls.length,
    upstreamCallsAfterLegacyGet,
  );

  console.log(
    "VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1_PROOF_BEGIN",
  );
  console.log(
    "listener_readiness_http_response=true",
  );
  console.log(
    "proof_scope_exact_post_route_only=true",
  );
  console.log(
    "exact_post_route_forwarded=true",
  );
  console.log(
    "post_method_preserved=true",
  );
  console.log(
    "post_body_preserved=true",
  );
  console.log(
    "upstream_status_preserved=true",
  );
  console.log(
    "proxy_response_marker_green=true",
  );
  console.log(
    "unrelated_post_still_blocked=true",
  );
  console.log(
    "legacy_get_not_claimed_by_post_proxy=true",
  );
  console.log(
    "options_not_claimed_by_post_proxy=true",
  );
  console.log(
    "options_still_blocked=true",
  );
  console.log(
    "automatic_fulfillment=false",
  );
  console.log(
    "request_created=false",
  );
  console.log(
    "payment_sent=false",
  );
  console.log(
    "transaction_broadcast=false",
  );
  console.log(
    "VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1_PROOF_GREEN",
  );
} finally {
  child.kill("SIGTERM");

  await Promise.race([
    once(
      child,
      "exit",
    ),
    new Promise(
      (resolve) => setTimeout(
        resolve,
        3000,
      ),
    ),
  ]);

  if (child.exitCode === null) {
    child.kill("SIGKILL");
  }

  await new Promise(
    (resolve, reject) => {
      upstream.close(
        (error) => {
          if (error) reject(error);
          else resolve();
        },
      );
    },
  );
}
