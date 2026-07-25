#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";

const repo = process.cwd();
const gatewayPath = path.join(
  repo,
  "ops/public/void-public-app-composition-gateway-v1.mjs",
);
const route = "/__void/operator-notifications/v1/candidate";
const token = "gateway-proof-token-" + "y".repeat(48);
const payload = {
  schema: "void_buy_void_candidate_operator_webhook_payload_v1",
  marker: "VOID_BUY_VOID_CANDIDATE_OPERATOR_WEBHOOK_PAYLOAD_V1",
  version: 1,
  candidate_stage: "observe_and_claim",
  notification_id_sha256: "1".repeat(64),
  request_id: "buyvoid_gateway_integration_v1",
  alert_fingerprint_sha256: "2".repeat(64),
  plan_fingerprint_sha256: "3".repeat(64),
  readiness_report_sha256: "4".repeat(64),
  required_orchestrator_confirmation: "orchestrator",
  required_delegated_confirmation: "delegated",
  required_stage_confirmation: "stage",
  required_canary_confirmation:
    "buyVoidArmExactObserveAndClaimCanary",
  operator_action:
    "review_exact_one_candidate_for_separate_arming_lane",
  source_notification_sha256: "5".repeat(64),
  created_at: "2026-07-25T00:00:00.000Z",
  authority: {
    operator_notification_delivery: true,
    external_network_request: true,
    operator_local_state_write: true,
    network_state_write: false,
    runtime_import_mounted: false,
    apply_requested: false,
    activation_performed: false,
    inventory_reservation: false,
    execution_attempt_reservation: false,
    wallet_access: false,
    signing: false,
    transaction_broadcast: false,
    rpc_mutation: false,
    money_movement: false,
    automatic_retry: false,
    background_loop: false,
    startup_execution: false,
  },
};
const body = Buffer.from(JSON.stringify(payload), "utf8");
const bodySha = crypto
  .createHash("sha256")
  .update(body)
  .digest("hex");

async function listen(server) {
  await new Promise((resolve) =>
    server.listen(0, "127.0.0.1", resolve),
  );
  return server.address().port;
}

const publicServer = http.createServer((req, res) => {
  res.writeHead(404, { "content-type": "application/json" });
  res.end('{"ok":false}\n');
});
const nodeServer = http.createServer((req, res) => {
  if (req.url === "/__void/ready.json") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end('{"ready":true}\n');
  }
  if (req.url === "/blocks/latest/number2.json") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end('{"number":1}\n');
  }
  if (req.url === "/p2p/peers") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end('{"connected":[]}\n');
  }
  if (req.url === "/version") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end('{"version":"0.1.0"}\n');
  }
  res.writeHead(404, { "content-type": "application/json" });
  res.end('{"ok":false}\n');
});

let receiverRequestCount = 0;
let receiverLast = null;
const receiverServer = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const received = Buffer.concat(chunks);
  receiverRequestCount += 1;
  receiverLast = {
    method: req.method,
    url: req.url,
    authorization: req.headers.authorization,
    payloadSha: req.headers["x-void-payload-sha256"],
    body: received,
  };
  res.writeHead(202, {
    "content-type": "application/json",
    location: "https://should-not-pass.example/",
    "set-cookie": "should-not-pass=1",
  });
  res.end(
    JSON.stringify({
      ok: true,
      marker: "VOID_OPERATOR_WEBHOOK_RECEIVER_V1",
      duplicate: false,
      activation_performed: false,
      money_movement: false,
    }) + "\n",
  );
});

const publicPort = await listen(publicServer);
const nodePort = await listen(nodeServer);
const receiverPort = await listen(receiverServer);

const probe = http.createServer();
const gatewayPort = await listen(probe);
await new Promise((resolve) => probe.close(resolve));


async function startGateway(extraEnv = {}) {
  const probeServer = http.createServer();
  const port = await listen(probeServer);
  await new Promise((resolve) => probeServer.close(resolve));

  const processChild = spawn(process.execPath, [gatewayPath], {
    cwd: repo,
    env: {
      ...process.env,
      VOID_COMPOSITION_HOST: "127.0.0.1",
      VOID_COMPOSITION_PORT: String(port),
      VOID_PUBLIC_GATEWAY_UPSTREAM:
        `http://127.0.0.1:${publicPort}`,
      VOID_NODE_UPSTREAM: `http://127.0.0.1:${nodePort}`,
      ...extraEnv,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let processStdout = "";
  let processStderr = "";
  processChild.stdout.on("data", (chunk) => {
    processStdout += chunk;
  });
  processChild.stderr.on("data", (chunk) => {
    processStderr += chunk;
  });

  const processBase = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(
        `${processBase}/__void/public-app/status.json`,
      );
      if (response.status === 200) {
        return {
          child: processChild,
          base: processBase,
          stdout: () => processStdout,
          stderr: () => processStderr,
        };
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  processChild.kill("SIGTERM");
  throw new Error(
    `gateway did not start\nstdout=${processStdout}\nstderr=${processStderr}`,
  );
}

const disabledGateway = await startGateway();
try {
  const disabledBody = Buffer.from(JSON.stringify(payload), "utf8");
  const disabledSha = crypto
    .createHash("sha256")
    .update(disabledBody)
    .digest("hex");
  const disabledResponse = await fetch(
    `${disabledGateway.base}${route}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-void-payload-sha256": disabledSha,
      },
      body: disabledBody,
      redirect: "manual",
    },
  );
  const disabledJson = await disabledResponse.json();
  assert.equal(disabledResponse.status, 503);
  assert.equal(
    disabledJson.error,
    "operator_webhook_receiver_unavailable",
  );
  assert.equal(receiverRequestCount, 0);
} finally {
  disabledGateway.child.kill("SIGTERM");
  await new Promise((resolve) => {
    disabledGateway.child.once("exit", resolve);
    setTimeout(resolve, 1000);
  });
}

const child = spawn(process.execPath, [gatewayPath], {
  cwd: repo,
  env: {
    ...process.env,
    VOID_COMPOSITION_HOST: "127.0.0.1",
    VOID_COMPOSITION_PORT: String(gatewayPort),
    VOID_PUBLIC_GATEWAY_UPSTREAM:
      `http://127.0.0.1:${publicPort}`,
    VOID_NODE_UPSTREAM: `http://127.0.0.1:${nodePort}`,
    VOID_OPERATOR_WEBHOOK_RECEIVER_UPSTREAM:
      `http://127.0.0.1:${receiverPort}`,
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let stdout = "";
let stderr = "";
child.stdout.on("data", (chunk) => {
  stdout += chunk;
});
child.stderr.on("data", (chunk) => {
  stderr += chunk;
});

const base = `http://127.0.0.1:${gatewayPort}`;
for (let attempt = 0; attempt < 100; attempt += 1) {
  try {
    const response = await fetch(
      `${base}/__void/public-app/status.json`,
    );
    if (response.status === 200) break;
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 25));
  if (attempt === 99) {
    throw new Error(
      `gateway did not start\nstdout=${stdout}\nstderr=${stderr}`,
    );
  }
}

async function request(pathname, options = {}) {
  const response = await fetch(`${base}${pathname}`, {
    redirect: "manual",
    ...options,
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { response, text, json };
}

try {
  {
    const { response, json } = await request(
      "/__void/public-app/status.json",
    );
    assert.equal(response.status, 200);
    assert.equal(
      json.operator_webhook_receiver_route_configured,
      true,
    );
    assert.equal(json.operator_webhook_receiver_path, route);
    assert.equal(json.money_movement, false);
  }

  {
    const { response } = await request(route);
    assert.equal(response.status, 405);
    assert.equal(response.headers.get("allow"), "POST");
  }

  {
    const { response, json } = await request(route, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-void-payload-sha256": bodySha,
      },
      body,
    });
    assert.equal(response.status, 401);
    assert.equal(json.error, "bearer_authorization_required");
    assert.equal(receiverRequestCount, 0);
  }

  {
    const { response, json } = await request(
      `${route}?x=1`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "x-void-payload-sha256": bodySha,
        },
        body,
      },
    );
    assert.equal(response.status, 400);
    assert.equal(json.error, "query_not_allowed");
    assert.equal(receiverRequestCount, 0);
  }

  {
    const { response } = await request(route, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "text/plain",
        "x-void-payload-sha256": bodySha,
      },
      body,
    });
    assert.equal(response.status, 415);
    assert.equal(receiverRequestCount, 0);
  }

  {
    const { response, json } = await request(route, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-void-payload-sha256": "0".repeat(64),
      },
      body,
    });
    assert.equal(response.status, 400);
    assert.equal(json.error, "payload_sha256_mismatch");
    assert.equal(receiverRequestCount, 0);
  }

  {
    const { response, json } = await request(route, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-void-payload-sha256": bodySha,
      },
      body,
    });
    assert.equal(response.status, 202);
    assert.equal(json.marker, "VOID_OPERATOR_WEBHOOK_RECEIVER_V1");
    assert.equal(
      response.headers.get(
        "x-void-operator-webhook-route",
      ),
      "v1",
    );
    assert.equal(response.headers.get("location"), null);
    assert.equal(response.headers.get("set-cookie"), null);
    assert.equal(receiverRequestCount, 1);
    assert.equal(receiverLast.method, "POST");
    assert.equal(receiverLast.url, route);
    assert.equal(
      receiverLast.authorization,
      `Bearer ${token}`,
    );
    assert.equal(receiverLast.payloadSha, bodySha);
    assert.equal(
      crypto
        .createHash("sha256")
        .update(receiverLast.body)
        .digest("hex"),
      bodySha,
    );
  }

  console.log(
    "VOID_OPERATOR_WEBHOOK_RECEIVER_GATEWAY_INTEGRATION_V1_GREEN",
  );
  console.log("exact_route=1");
  console.log("disabled_without_upstream=1");
  console.log("bearer_header_required=1");
  console.log("payload_sha256_binding=1");
  console.log("redirect_following=0");
  console.log("set_cookie_forwarding=0");
  console.log("location_forwarding=0");
  console.log("generic_mutation=0");
  console.log("money_movement=0");
} finally {
  child.kill("SIGTERM");
  await new Promise((resolve) => {
    child.once("exit", resolve);
    setTimeout(resolve, 1000);
  });
  await Promise.all(
    [publicServer, nodeServer, receiverServer].map(
      (server) =>
        new Promise((resolve) => server.close(resolve)),
    ),
  );
}
