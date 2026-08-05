#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import process from "node:process";

const MARKER = "VOID_NODE_HOSTED_PAID_WORK_ORIGIN_BRIDGE_V1";
const ROUTE = "/__void/agents/paid-work/submissions/v1";
const repo = process.cwd();
const gatewayPath = path.join(
  repo,
  "ops/public/void-public-app-composition-gateway-v1.mjs",
);

async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server.address().port;
}

function json(res, status, value, headers = {}) {
  const body = Buffer.from(JSON.stringify(value) + "\n");
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(body.length),
    ...headers,
  });
  res.end(body);
}

const nodeServer = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://node.local");
  if (url.pathname === "/.well-known/void-agent-discovery.json") {
    return json(res, 200, {
      marker: "VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1",
      version: 1,
      paid_work_submission_path: ROUTE,
    });
  }
  if (url.pathname === "/__void/ready.json") {
    return json(res, 200, {
      ready: true,
      head: 1,
      gap: 0,
      txroot_live: 1,
      reasons: [],
    });
  }
  if (url.pathname === "/blocks/latest/number2.json") {
    return json(res, 200, { number: 1 });
  }
  if (url.pathname === "/p2p/peers") {
    return json(res, 200, { connected: [{}, {}] });
  }
  if (url.pathname === "/version") {
    return json(res, 200, {
      version: "proof",
      protocol_version: 1,
      channel: "proof",
      git_commit: "proof",
    });
  }
  return json(res, 404, { ok: false });
});

const publicServer = http.createServer((_req, res) => {
  return json(res, 404, { ok: false });
});

let upstreamRequests = 0;
let upstreamPosts = 0;
let observedPost = null;

const agentServer = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://agent.local");
  if (url.pathname !== ROUTE || url.search) {
    return json(res, 404, { ok: false });
  }

  upstreamRequests += 1;

  if (req.method === "GET" || req.method === "HEAD") {
    res.writeHead(405, {
      allow: "POST",
      "content-length": "0",
    });
    return res.end();
  }

  if (req.method !== "POST") {
    res.writeHead(405, {
      allow: "POST",
      "content-length": "0",
    });
    return res.end();
  }

  upstreamPosts += 1;
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const body = Buffer.concat(chunks);
  observedPost = {
    authorization: req.headers.authorization,
    contentType: req.headers["content-type"],
    payloadSha256: req.headers["x-void-payload-sha256"],
    body,
  };

  return json(
    res,
    202,
    {
      ok: true,
      status: "accepted_for_review",
      authorization_verified: true,
    },
    {
      "x-void-agent-paid-work-submission-route": "v1",
      "set-cookie": "must-not-cross=1",
      location: "https://example.invalid/redirect-must-not-cross",
    },
  );
});

let child;
try {
  const nodePort = await listen(nodeServer);
  const publicPort = await listen(publicServer);
  const agentPort = await listen(agentServer);

  const reservation = http.createServer();
  const compositionPort = await listen(reservation);
  await new Promise((resolve) => reservation.close(resolve));

  child = spawn(process.execPath, [gatewayPath], {
    cwd: repo,
    env: {
      ...process.env,
      VOID_COMPOSITION_HOST: "127.0.0.1",
      VOID_COMPOSITION_PORT: String(compositionPort),
      VOID_PUBLIC_GATEWAY_UPSTREAM:
        `http://127.0.0.1:${publicPort}`,
      VOID_NODE_UPSTREAM: `http://127.0.0.1:${nodePort}`,
      VOID_AI_AGENT_GATEWAY_UPSTREAM:
        `http://127.0.0.1:${agentPort}`,
      VOID_PUBLIC_EXPECTED_PEERS: "2",
      VOID_TXROOT_QUARANTINED: "0",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => (stdout += chunk));
  child.stderr.on("data", (chunk) => (stderr += chunk));

  const base = `http://127.0.0.1:${compositionPort}`;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(
        `${base}/__void/public-app/status.json`,
      );
      if (response.status === 200) break;
    } catch {
      // bounded startup polling
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
    if (attempt === 119) {
      throw new Error(
        `composition gateway did not start\nstdout=${stdout}\nstderr=${stderr}`,
      );
    }
  }

  const request = async (pathname, options = {}) => {
    const response = await fetch(`${base}${pathname}`, {
      redirect: "manual",
      ...options,
    });
    const body = await response.text();
    return { response, body };
  };

  {
    const { response, body } = await request(
      "/__void/public-app/status.json",
    );
    assert.equal(response.status, 200);
    const value = JSON.parse(body);
    assert.equal(value.agent_paid_work_edge_marker, MARKER);
    assert.equal(value.agent_paid_work_edge_configured, true);
    assert.equal(value.agent_paid_work_submission_path, ROUTE);
  }

  {
    const { response, body } = await request(
      "/.well-known/void-agent-discovery.json",
    );
    assert.equal(response.status, 200);
    assert.equal(
      JSON.parse(body).marker,
      "VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1",
    );
  }

  {
    const before = upstreamRequests;
    const { response, body } = await request(ROUTE);
    assert.equal(response.status, 405);
    assert.equal(response.headers.get("allow"), "POST");
    assert.equal(
      response.headers.get(
        "x-void-agent-paid-work-submission-route",
      ),
      "v1",
    );
    assert.equal(
      response.headers.get(
        "x-void-node-hosted-paid-work-origin-bridge",
      ),
      "v1",
    );
    assert.equal(body, "");
    assert.equal(upstreamRequests, before + 1);
  }

  {
    const before = upstreamRequests;
    const { response } = await request(`${ROUTE}?not=allowed`);
    assert.equal(response.status, 400);
    assert.equal(upstreamRequests, before);
  }

  {
    const before = upstreamRequests;
    const { response } = await request(ROUTE, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: "{}",
    });
    assert.equal(response.status, 401);
    assert.equal(upstreamRequests, before);
  }

  {
    const before = upstreamRequests;
    const { response } = await request(ROUTE, {
      method: "POST",
      headers: {
        authorization: "Bearer proof-token-1234567890",
        "content-type": "text/plain",
        "x-void-payload-sha256": "0".repeat(64),
      },
      body: "{}",
    });
    assert.equal(response.status, 415);
    assert.equal(upstreamRequests, before);
  }

  const payload = Buffer.from(
    JSON.stringify({
      marker: "VOID_AGENT_PAID_WORK_SUBMISSION_REQUEST_V1",
      version: 1,
      submission_id: "proof-submission-v1",
      work_order: {
        marker: "VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1",
        version: 1,
      },
    }),
  );
  const payloadSha = crypto
    .createHash("sha256")
    .update(payload)
    .digest("hex");
  const proofAuthorization =
    "Bearer proof-token-1234567890";

  {
    const { response, body } = await request(ROUTE, {
      method: "POST",
      headers: {
        authorization: proofAuthorization,
        "content-type": "application/json",
        "x-void-payload-sha256": payloadSha,
      },
      body: payload,
    });
    assert.equal(response.status, 202);
    assert.equal(
      response.headers.get(
        "x-void-agent-paid-work-submission-route",
      ),
      "v1",
    );
    assert.equal(response.headers.get("set-cookie"), null);
    assert.equal(response.headers.get("location"), null);
    assert.equal(
      JSON.parse(body).status,
      "accepted_for_review",
    );
    assert.equal(upstreamPosts, 1);
    assert.ok(observedPost);
    assert.equal(observedPost.authorization, proofAuthorization);
    assert.equal(observedPost.contentType, "application/json");
    assert.equal(observedPost.payloadSha256, payloadSha);
    assert.equal(Buffer.compare(observedPost.body, payload), 0);
  }

  for (const pathname of [
    "/__void/agents",
    "/__void/agents/",
    `${ROUTE}/not-exact`,
    "/__void/agents/other",
  ]) {
    const before = upstreamRequests;
    const { response, body } = await request(pathname);
    assert.equal(response.status, 404, pathname);
    assert.equal(body.trim(), "not_public", pathname);
    assert.equal(upstreamRequests, before, pathname);
  }

  {
    const before = upstreamRequests;
    const { response, body } = await request(
      "/__void/agents/other",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: "{}",
      },
    );
    assert.equal(response.status, 404);
    assert.equal(body.trim(), "not_public");
    assert.equal(upstreamRequests, before);
  }

  {
    const { response } = await request("/unrelated", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: "{}",
    });
    assert.equal(response.status, 405);
  }

  assert.equal(upstreamPosts, 1);
  process.stdout.write(
    "VOID_NODE_HOSTED_PAID_WORK_ORIGIN_BRIDGE_V1_PROOF_GREEN\n",
  );
} finally {
  if (child && child.exitCode === null) {
    child.kill("SIGTERM");
    await Promise.race([
      once(child, "exit"),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
    if (child.exitCode === null) child.kill("SIGKILL");
  }
  await Promise.all(
    [nodeServer, publicServer, agentServer].map(
      (server) =>
        new Promise((resolve) => server.close(resolve)),
    ),
  );
}
